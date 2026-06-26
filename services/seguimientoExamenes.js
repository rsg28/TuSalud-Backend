'use strict';

/**
 * Seguimiento clínico de exámenes por paciente.
 *
 * Esta capa centraliza TODA la lógica de cambio de estado para que las tres
 * rutas que pueden modificarlo (UI manual, batch por paciente, webhook
 * externo) escriban exactamente lo mismo en BD y dejen siempre auditoría.
 *
 * Tabla canónica: `paciente_examen_asignado` (estado + motivo + metadata).
 * Mirror legacy:   `paciente_examen_completado` (mantenida para no romper
 *                  los queries antiguos del frontend y los reportes).
 * Auditoría:       `paciente_examen_historial` (una fila por transición).
 *
 * Reglas de transición (intencionalmente flexibles porque el operador
 * humano puede equivocarse y necesitar corregir):
 *
 *    PENDIENTE → cualquiera
 *    cualquier estado → PENDIENTE  (revertir un error)
 *    COMPLETADO → AUSENTE/NO_REALIZADO/POSPUESTO  (corrección)
 *    AUSENTE/NO_REALIZADO/POSPUESTO → COMPLETADO  (el paciente regresó)
 *
 * Idempotencia: si el llamador pasa `referenciaExterna` y ya existe esa
 * referencia en la BD, no se hace nada (devuelve `{ ok: true, idempotent: true }`).
 */

const pool = require('../config/database');
const { flattenExamenesDesdeSnapshot, getPreciosMapPorExamenIds } = require('../utils/perfilSnapshot');
const { fetchPrecioExamen } = require('../utils/examenPrecio');

const ESTADOS_VALIDOS = new Set([
  'PENDIENTE',
  'COMPLETADO',
  'AUSENTE',
  'NO_REALIZADO',
  'POSPUESTO',
]);

const FUENTES_VALIDAS = new Set(['MANUAL', 'API_EXTERNA', 'SISTEMA']);

/**
 * Estados que cuentan como "el examen NO se hizo y probablemente justifica
 * un ajuste comercial". Los usa `calcularAjustesSugeridos`.
 */
const ESTADOS_NO_REALIZADOS = new Set(['AUSENTE', 'NO_REALIZADO']);

const ESTADOS_COTIZACION_REFERENCIA = [
  'APROBADA',
  'APROBADA_POR_MANAGER',
  'ENVIADA_AL_CLIENTE',
  'ENVIADA_AL_MANAGER',
  'ENVIADA',
  'BORRADOR',
];

/**
 * Indexa precio unitario por examen_id desde líneas de cotización.
 * @param {Array<object>} filasItems
 * @param {Map<number, number>} precioExamen
 */
function indexarPreciosDesdeItemsCotizacion(filasItems, precioExamen) {
  for (const it of filasItems) {
    if (it.tipo_item === 'EXAMEN' && it.examen_id != null) {
      const exId = Number(it.examen_id);
      const px = Number(it.precio_final);
      if (exId && Number.isFinite(px) && px > 0 && !precioExamen.has(exId)) {
        precioExamen.set(exId, px);
      }
    } else if (it.tipo_item === 'PERFIL' && it.examenes_snapshot_json) {
      let snapshot;
      try {
        snapshot = JSON.parse(it.examenes_snapshot_json);
      } catch {
        snapshot = null;
      }
      const lista = flattenExamenesDesdeSnapshot(snapshot);
      if (lista.length === 0) continue;
      const sumPrecios = lista.reduce((s, ex) => s + (Number(ex.precio) || 0), 0);
      if (sumPrecios > 0) {
        for (const ex of lista) {
          const exId = Number(ex.examen_id);
          const px = Number(ex.precio) || 0;
          if (exId && px > 0 && !precioExamen.has(exId)) {
            precioExamen.set(exId, px);
          }
        }
      } else {
        const proratado = Number(it.precio_final) / lista.length;
        for (const ex of lista) {
          const exId = Number(ex.examen_id);
          if (exId && !precioExamen.has(exId)) {
            precioExamen.set(exId, proratado);
          }
        }
      }
    }
  }
}

function validarEstado(estado) {
  const v = String(estado || '').toUpperCase().trim();
  if (!ESTADOS_VALIDOS.has(v)) {
    const err = new Error(
      `Estado inválido "${estado}". Permitidos: ${[...ESTADOS_VALIDOS].join(', ')}`
    );
    err.code = 'ESTADO_INVALIDO';
    throw err;
  }
  return v;
}

function validarFuente(fuente) {
  const v = String(fuente || 'MANUAL').toUpperCase().trim();
  if (!FUENTES_VALIDAS.has(v)) return 'MANUAL';
  return v;
}

/**
 * Cambia el estado de un examen para un paciente. Idempotente por
 * `referenciaExterna` (si se pasa).
 *
 * @param {object} params
 * @param {number} params.pacienteId  Id de `pedido_pacientes`
 * @param {number} params.examenId    Id de `examenes`
 * @param {string} params.estado      Uno de ESTADOS_VALIDOS
 * @param {string|null} params.motivo Texto libre (opcional, hasta 500 chars)
 * @param {number|null} params.usuarioId Quién hizo el cambio (NULL si vino de API externa)
 * @param {'MANUAL'|'API_EXTERNA'|'SISTEMA'} params.fuente
 * @param {string|null} params.referenciaExterna Para idempotencia
 * @param {import('mysql2').Pool|import('mysql2').PoolConnection} [exec] Pool o connection (para transacciones)
 *
 * @returns {Promise<{ok:true, idempotent?:boolean, estadoAnterior?:string, estadoNuevo:string, cambioReal:boolean}>}
 */
async function actualizarEstadoExamen(
  {
    pacienteId,
    examenId,
    estado,
    motivo = null,
    usuarioId = null,
    fuente = 'MANUAL',
    referenciaExterna = null,
  },
  exec = pool
) {
  const pid = Number(pacienteId);
  const eid = Number(examenId);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw Object.assign(new Error('pacienteId inválido'), { code: 'PARAM_INVALIDO' });
  }
  if (!Number.isInteger(eid) || eid <= 0) {
    throw Object.assign(new Error('examenId inválido'), { code: 'PARAM_INVALIDO' });
  }
  const estadoNuevo = validarEstado(estado);
  const fuenteN = validarFuente(fuente);
  const motivoN = motivo == null ? null : String(motivo).slice(0, 500);
  const refExt = referenciaExterna == null ? null : String(referenciaExterna).slice(0, 255);

  // Idempotencia: si llega la misma referencia externa, devolvemos OK sin tocar nada.
  if (refExt) {
    const [yaExiste] = await exec.execute(
      `SELECT id, estado FROM paciente_examen_asignado
        WHERE paciente_id = ? AND examen_id = ? AND referencia_externa = ?
        LIMIT 1`,
      [pid, eid, refExt]
    );
    if (yaExiste.length > 0) {
      return {
        ok: true,
        idempotent: true,
        estadoAnterior: yaExiste[0].estado,
        estadoNuevo: yaExiste[0].estado,
        cambioReal: false,
      };
    }
  }

  // Trae el estado actual. Si el examen NO está asignado al paciente, lo
  // asignamos sobre la marcha (caso del webhook externo: el lab puede
  // reportar un examen que el operador olvidó asignar).
  const [filas] = await exec.execute(
    `SELECT id, estado FROM paciente_examen_asignado
      WHERE paciente_id = ? AND examen_id = ?
      LIMIT 1`,
    [pid, eid]
  );

  const estadoAnterior = filas.length > 0 ? filas[0].estado : null;

  if (filas.length === 0) {
    await exec.execute(
      `INSERT INTO paciente_examen_asignado
         (paciente_id, examen_id, estado, motivo, fecha_estado,
          actualizado_por_usuario_id, fuente_actualizacion, referencia_externa)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [pid, eid, estadoNuevo, motivoN, usuarioId, fuenteN, refExt]
    );
  } else {
    await exec.execute(
      `UPDATE paciente_examen_asignado
          SET estado = ?, motivo = ?, fecha_estado = NOW(),
              actualizado_por_usuario_id = ?, fuente_actualizacion = ?,
              referencia_externa = COALESCE(?, referencia_externa)
        WHERE paciente_id = ? AND examen_id = ?`,
      [estadoNuevo, motivoN, usuarioId, fuenteN, refExt, pid, eid]
    );
  }

  // Mirror legacy: paciente_examen_completado.
  if (estadoNuevo === 'COMPLETADO') {
    await exec.execute(
      `INSERT INTO paciente_examen_completado (paciente_id, examen_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE fecha_completado = CURRENT_TIMESTAMP`,
      [pid, eid]
    );
  } else if (estadoAnterior === 'COMPLETADO') {
    await exec.execute(
      `DELETE FROM paciente_examen_completado
        WHERE paciente_id = ? AND examen_id = ?`,
      [pid, eid]
    );
  }

  // Auditoría: siempre dejamos rastro, incluso si no hubo cambio real.
  await exec.execute(
    `INSERT INTO paciente_examen_historial
       (paciente_id, examen_id, estado_anterior, estado_nuevo,
        motivo, usuario_id, fuente, referencia_externa)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [pid, eid, estadoAnterior, estadoNuevo, motivoN, usuarioId, fuenteN, refExt]
  );

  return {
    ok: true,
    estadoAnterior,
    estadoNuevo,
    cambioReal: estadoAnterior !== estadoNuevo,
  };
}

/**
 * Aplica `actualizarEstadoExamen` a TODOS los exámenes pendientes de un
 * paciente. Útil para "marcar paciente ausente" con un solo click.
 *
 * @param {object} params
 * @param {number} params.pacienteId
 * @param {string} params.estado    Estado a aplicar (típico: 'AUSENTE')
 * @param {string|null} [params.motivo]
 * @param {number|null} params.usuarioId
 * @param {boolean} [params.soloPendientes=true] Si false, sobrescribe estado de TODOS los exámenes asignados, incluso COMPLETADO.
 */
async function actualizarEstadoMasivoPaciente({
  pacienteId,
  estado,
  motivo = null,
  usuarioId = null,
  soloPendientes = true,
}) {
  validarEstado(estado);
  const filtroEstado = soloPendientes ? `AND estado = 'PENDIENTE'` : '';
  const [examenes] = await pool.execute(
    `SELECT examen_id FROM paciente_examen_asignado
      WHERE paciente_id = ? ${filtroEstado}`,
    [pacienteId]
  );

  const resultados = [];
  for (const row of examenes) {
    const r = await actualizarEstadoExamen({
      pacienteId,
      examenId: row.examen_id,
      estado,
      motivo,
      usuarioId,
      fuente: 'MANUAL',
    });
    resultados.push({ examen_id: row.examen_id, ...r });
  }
  return {
    ok: true,
    afectados: resultados.length,
    detalle: resultados,
  };
}

/**
 * Calcula sugerencias de ajuste de cotización para un pedido cuando hay
 * exámenes en estado AUSENTE o NO_REALIZADO. NO modifica nada: solo devuelve
 * la info para que la UI del manager decida si genera una cotización
 * complementaria negativa o deja todo como está.
 *
 * Estrategia: por cada examen no realizado tomamos su precio en
 * `cotizacion_items.precio_final` del pedido. Si el ítem fue un PERFIL,
 * descomponemos por examen usando `examenes_snapshot_json` cuando tiene un
 * desglose con `precio` por examen; si no hay desglose, prorrateamos el
 * precio del perfil entre todos los exámenes del snapshot (mejor que nada).
 *
 * Cobertura honesta: si no encontramos precio (porque el examen se tomó
 * fuera de la cotización), devolvemos `precio_unitario: null` y la UI
 * decide si lo ignora o pide al manager poner un precio manual.
 */
async function calcularAjustesSugeridos(pedidoId) {
  const pid = Number(pedidoId);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw Object.assign(new Error('pedidoId inválido'), { code: 'PARAM_INVALIDO' });
  }

  const [pedidoMeta] = await pool.execute(
    'SELECT sede_id, total_empleados, factura_id FROM pedidos WHERE id = ? LIMIT 1',
    [pid]
  );
  const sedeId = pedidoMeta[0]?.sede_id ?? null;
  const numPacientes = Number(pedidoMeta[0]?.total_empleados) || 0;
  const facturaId = pedidoMeta[0]?.factura_id ?? null;

  // 1) Exámenes no realizados del pedido.
  const [noRealizados] = await pool.execute(
    `SELECT pea.paciente_id, pea.examen_id, pea.estado, pea.motivo,
            pea.fecha_estado, pea.actualizado_por_usuario_id,
            pp.nombre_completo, pp.dni, ex.nombre AS examen_nombre
       FROM paciente_examen_asignado pea
       JOIN pedido_pacientes pp ON pp.id = pea.paciente_id
       LEFT JOIN examenes ex ON ex.id = pea.examen_id
      WHERE pp.pedido_id = ?
        AND pea.estado IN ('AUSENTE','NO_REALIZADO')`,
    [pid]
  );

  if (noRealizados.length === 0) {
    return {
      pedido_id: pid,
      factura_id: facturaId,
      bloqueado_por_factura: facturaId != null,
      tiene_ajustes: false,
      total_examenes_no_realizados: 0,
      monto_sugerido: 0,
      items: [],
    };
  }

  // 2) Precios desde cotización(es) del pedido.
  // Preferimos APROBADA / APROBADA_POR_MANAGER (precios firmes); si no hay,
  // caemos a estados intermedios (ENVIADA_AL_CLIENTE → manager ya aprobó;
  // ENVIADA_AL_MANAGER y ENVIADA → propuestas que sirven como referencia para
  // testear o estimar el ajuste antes de la aprobación final).
  const estadosPlaceholders = ESTADOS_COTIZACION_REFERENCIA.map(() => '?').join(',');
  const [items] = await pool.execute(
    `SELECT ci.tipo_item, ci.examen_id, ci.perfil_id, ci.tipo_emo,
            ci.precio_final, ci.examenes_snapshot_json,
            c.id AS cotizacion_id, c.estado AS cotizacion_estado,
            c.es_complementaria,
            CASE c.estado
              WHEN 'APROBADA'              THEN 1
              WHEN 'APROBADA_POR_MANAGER'  THEN 2
              WHEN 'ENVIADA_AL_CLIENTE'    THEN 3
              WHEN 'ENVIADA_AL_MANAGER'    THEN 4
              WHEN 'ENVIADA'               THEN 5
              WHEN 'BORRADOR'              THEN 6
              ELSE 99
            END AS prioridad_estado
       FROM cotizacion_items ci
       JOIN cotizaciones c ON c.id = ci.cotizacion_id
      WHERE c.pedido_id = ?
        AND c.es_complementaria = 0
        AND c.estado IN (${estadosPlaceholders})
      ORDER BY prioridad_estado ASC, c.id DESC, ci.id ASC`,
    [pid, ...ESTADOS_COTIZACION_REFERENCIA]
  );

  // Detectamos la cotización principal activa (si no hay aprobada, la de mayor
  // prioridad entre ENVIADA*/BORRADOR). Se usa para decidir si el ajuste se
  // aplica directamente sobre la principal (cuando no está aprobada) o si hay
  // que crear una cotización complementaria negativa.
  let cotizacionPrincipal = null;
  if (items.length > 0) {
    const top = items[0];
    cotizacionPrincipal = {
      id: Number(top.cotizacion_id),
      estado: top.cotizacion_estado,
      puede_editar: !['APROBADA', 'APROBADA_POR_MANAGER'].includes(top.cotizacion_estado),
    };
  }

  // Indexamos: precio por examen suelto y precio por examen dentro de perfil (principal).
  const precioExamen = new Map();
  indexarPreciosDesdeItemsCotizacion(items, precioExamen);

  // Complementarias aprobadas (p. ej. ADA agregado solo en complementaria positiva).
  const [itemsComp] = await pool.execute(
    `SELECT ci.tipo_item, ci.examen_id, ci.perfil_id, ci.tipo_emo,
            ci.precio_final, ci.examenes_snapshot_json
       FROM cotizacion_items ci
       JOIN cotizaciones c ON c.id = ci.cotizacion_id
      WHERE c.pedido_id = ?
        AND c.es_complementaria = 1
        AND c.estado IN ('APROBADA', 'APROBADA_POR_MANAGER')
      ORDER BY c.id DESC, ci.id ASC`,
    [pid]
  );
  indexarPreciosDesdeItemsCotizacion(itemsComp, precioExamen);

  // Fallback: tarifario vigente en BD para exámenes aún sin referencia.
  const examenesSinPrecio = [
    ...new Set(
      noRealizados
        .map((r) => Number(r.examen_id))
        .filter((id) => Number.isFinite(id) && id > 0 && !precioExamen.has(id))
    ),
  ];
  if (examenesSinPrecio.length > 0) {
    const preciosBd = await getPreciosMapPorExamenIds(pool, examenesSinPrecio, sedeId, numPacientes);
    for (const exId of examenesSinPrecio) {
      const px = Number(preciosBd.get(exId)) || 0;
      if (px > 0) precioExamen.set(exId, px);
    }
    for (const exId of examenesSinPrecio) {
      if (precioExamen.has(exId)) continue;
      const px = await fetchPrecioExamen(pool, exId, sedeId, numPacientes);
      if (px > 0) precioExamen.set(exId, px);
    }
  }

  // 3) Componemos las líneas sugeridas.
  let montoTotal = 0;
  const itemsAjuste = noRealizados.map((r) => {
    const px = precioExamen.has(Number(r.examen_id))
      ? Number(precioExamen.get(Number(r.examen_id)))
      : null;
    const monto = px == null ? 0 : px;
    montoTotal += monto;
    return {
      paciente_id: r.paciente_id,
      paciente_nombre: r.nombre_completo,
      paciente_dni: r.dni,
      examen_id: r.examen_id,
      examen_nombre: r.examen_nombre,
      estado: r.estado,
      motivo: r.motivo,
      fecha_estado: r.fecha_estado,
      precio_unitario: px,
      monto_sugerido: monto,
    };
  });

  return {
    pedido_id: pid,
    factura_id: facturaId,
    bloqueado_por_factura: facturaId != null,
    tiene_ajustes: true,
    total_examenes_no_realizados: noRealizados.length,
    monto_sugerido: Math.round(montoTotal * 100) / 100,
    cotizacion_principal: cotizacionPrincipal,
    items: itemsAjuste,
  };
}

/**
 * Aplica los ajustes (exámenes AUSENTE/NO_REALIZADO) directamente sobre la
 * cotización principal del pedido. Solo se permite cuando la principal NO
 * está aprobada (estados APROBADA/APROBADA_POR_MANAGER).
 *
 * Estrategia:
 *   - Por cada par (paciente, examen) no realizado, busca un cotizacion_item
 *     tipo EXAMEN con el mismo examen_id en la principal y decrementa cantidad.
 *     Si la cantidad cae a 0, elimina la fila.
 *   - Para PERFIL items se reporta "en perfil" sin tocarlos (modificar un
 *     perfil afectaría a todos los pacientes con ese perfil).
 *   - Actualiza el total de la cotización.
 *   - Inserta una entrada en historial_pedido describiendo lo ocurrido.
 *
 * Devuelve { cotizacion_id, modificados, eliminados, en_perfil, sin_match }.
 */
async function aplicarAjustesDirectos(pedidoId, opts = {}) {
  const pid = Number(pedidoId);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw Object.assign(new Error('pedidoId inválido'), { code: 'PARAM_INVALIDO' });
  }
  const usuario = opts.usuario || null;

  // Sacamos primero los ajustes y la principal candidata.
  const ajustes = await calcularAjustesSugeridos(pid);
  if (!ajustes.tiene_ajustes || !ajustes.cotizacion_principal) {
    return {
      cotizacion_id: null,
      modificados: 0,
      eliminados: 0,
      en_perfil: 0,
      sin_match: 0,
      mensaje: 'No hay exámenes no realizados o cotización principal para modificar.',
    };
  }
  const principal = ajustes.cotizacion_principal;
  if (!principal.puede_editar) {
    const err = new Error(
      'La cotización principal ya fue aprobada. Use cotización complementaria.'
    );
    err.code = 'COTIZACION_APROBADA';
    throw err;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    // Cargamos items actuales de la principal.
    const [itemsCot] = await connection.execute(
      `SELECT id, tipo_item, examen_id, perfil_id, cantidad, precio_final
         FROM cotizacion_items
        WHERE cotizacion_id = ?`,
      [principal.id]
    );

    // Resumen de qué examen × cuántas veces aparece en los ajustes.
    const conteoPorExamen = new Map(); // examen_id → veces
    for (const it of ajustes.items) {
      const ex = Number(it.examen_id);
      if (!Number.isFinite(ex) || ex <= 0) continue;
      conteoPorExamen.set(ex, (conteoPorExamen.get(ex) || 0) + 1);
    }

    let modificados = 0;
    let eliminados = 0;
    let enPerfil = 0;
    let sinMatch = 0;

    for (const [examenId, veces] of conteoPorExamen.entries()) {
      const filaExamen = itemsCot.find(
        (i) => i.tipo_item === 'EXAMEN' && Number(i.examen_id) === examenId
      );
      if (filaExamen) {
        const nuevaCantidad = Math.max(0, Number(filaExamen.cantidad) - veces);
        if (nuevaCantidad <= 0) {
          await connection.execute('DELETE FROM cotizacion_items WHERE id = ?', [filaExamen.id]);
          eliminados += 1;
        } else {
          const nuevoSubtotal = nuevaCantidad * Number(filaExamen.precio_final || 0);
          await connection.execute(
            'UPDATE cotizacion_items SET cantidad = ?, subtotal = ? WHERE id = ?',
            [nuevaCantidad, nuevoSubtotal, filaExamen.id]
          );
          modificados += 1;
        }
        continue;
      }
      // No hay fila EXAMEN: ¿existe como parte de un PERFIL?
      const dentroDePerfil = itemsCot.some((i) => i.tipo_item === 'PERFIL');
      if (dentroDePerfil) {
        enPerfil += 1;
      } else {
        sinMatch += 1;
      }
    }

    // Recalculamos el total de la cotización con los items restantes (solo para historial).
    const [totRows] = await connection.execute(
      `SELECT COALESCE(SUM(cantidad * precio_final), 0) AS total
         FROM cotizacion_items WHERE cotizacion_id = ?`,
      [principal.id]
    );
    const nuevoTotal = Number(totRows[0]?.total ?? 0);

    // Historial.
    const descripcionPartes = [];
    if (modificados > 0) descripcionPartes.push(`${modificados} ítem(s) con cantidad reducida`);
    if (eliminados > 0) descripcionPartes.push(`${eliminados} ítem(s) eliminado(s)`);
    if (enPerfil > 0) descripcionPartes.push(`${enPerfil} examen(es) dentro de perfil sin tocar`);
    if (sinMatch > 0) descripcionPartes.push(`${sinMatch} sin coincidencia`);
    const descripcion = descripcionPartes.length > 0
      ? `Ajustes aplicados a cotización principal: ${descripcionPartes.join(', ')}.`
      : 'Ajustes aplicados a cotización principal (sin cambios efectivos).';
    // Usamos COTIZACION_COMPLEMENTARIA porque semánticamente representa el
    // mismo flujo (ajuste por exámenes no realizados), pero aplicado en
    // caliente sobre la principal en vez de crear una complementaria. Si la
    // BD soporta un tipo_evento más específico se ignora el fallo.
    try {
      await connection.execute(
        `INSERT INTO historial_pedido (
           pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre
         ) VALUES (?, ?, 'COTIZACION_COMPLEMENTARIA', ?, ?, ?)`,
        [
          pid,
          principal.id,
          descripcion,
          usuario?.id ?? null,
          usuario?.nombre ?? null,
        ]
      );
    } catch (histErr) {
      console.warn('[seguimiento] historial ajuste directo omitido:', histErr?.message || histErr);
    }

    await connection.commit();
    return {
      cotizacion_id: principal.id,
      cotizacion_estado: principal.estado,
      modificados,
      eliminados,
      en_perfil: enPerfil,
      sin_match: sinMatch,
      nuevo_total: Math.round(nuevoTotal * 100) / 100,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Calcula la cobertura entre las cantidades que el pedido necesita (a partir
 * de pacientes × exámenes asignados) y las cantidades efectivamente cotizadas
 * en la cotización principal del pedido (no se cuentan complementarias).
 *
 * Sirve para detectar errores honestos (alguien bajó la cantidad de un examen
 * por accidente) o cargas excesivas (más cantidad de la que realmente hay
 * pacientes para ese examen).
 *
 * Devuelve, por cada examen del pedido:
 *   { examen_id, examen_nombre, necesarios, cotizados, diferencia, severidad }
 *
 * - necesarios: cantidad de (paciente × examen) asignados al pedido (no incluye
 *   estados AUSENTE / NO_REALIZADO / POSPUESTO).
 * - cotizados: cantidad sumada en cotización principal, incluyendo exámenes
 *   sueltos y los exámenes dentro de PERFILES (cada perfil aporta cantidad×1
 *   por examen del snapshot).
 * - severidad: 'OK' | 'FALTANTE' | 'EXCESO'.
 *
 * Si no hay cotización principal devuelve `tiene_cotizacion: false`.
 */
async function calcularCoberturaCotizacion(pedidoId) {
  const pid = Number(pedidoId);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw Object.assign(new Error('pedidoId inválido'), { code: 'PARAM_INVALIDO' });
  }

  // 1) Cotización principal del pedido.
  const [pedidoRows] = await pool.execute(
    `SELECT cotizacion_principal_id FROM pedidos WHERE id = ? LIMIT 1`,
    [pid]
  );
  const cotizacionPrincipalId = pedidoRows[0]?.cotizacion_principal_id || null;
  if (!cotizacionPrincipalId) {
    return {
      pedido_id: pid,
      tiene_cotizacion: false,
      items: [],
      resumen: { ok: 0, faltantes: 0, excesos: 0 },
    };
  }

  // 2) Cantidades NECESARIAS por examen (según pacientes activos del pedido).
  // Solo cuentan los exámenes que aún se esperan realizar; los AUSENTE /
  // NO_REALIZADO se gestionan vía calcularAjustesSugeridos.
  const [necesariosRows] = await pool.execute(
    `SELECT pea.examen_id, COUNT(*) AS necesarios,
            COALESCE(ex.nombre, '(examen)') AS examen_nombre
       FROM paciente_examen_asignado pea
       JOIN pedido_pacientes pp ON pp.id = pea.paciente_id
       LEFT JOIN examenes ex ON ex.id = pea.examen_id
      WHERE pp.pedido_id = ?
        AND pea.estado IN ('PENDIENTE', 'COMPLETADO', 'POSPUESTO')
      GROUP BY pea.examen_id, ex.nombre`,
    [pid]
  );

  // 3) Cantidades COTIZADAS por examen (de la cotización principal).
  const [itemsRows] = await pool.execute(
    `SELECT tipo_item, examen_id, perfil_id, cantidad, examenes_snapshot_json
       FROM cotizacion_items
      WHERE cotizacion_id = ?`,
    [cotizacionPrincipalId]
  );

  const cotizadosPorExamen = new Map();
  const cotizadosPorPerfil = new Map();
  for (const it of itemsRows) {
    const cantidad = Number(it.cantidad) || 0;
    if (cantidad <= 0) continue;
    if (it.tipo_item === 'EXAMEN' && it.examen_id) {
      const id = Number(it.examen_id);
      cotizadosPorExamen.set(id, (cotizadosPorExamen.get(id) || 0) + cantidad);
    } else if (it.tipo_item === 'PERFIL' && it.perfil_id && it.tipo_emo) {
      const k = `${Number(it.perfil_id)}|${String(it.tipo_emo).toUpperCase()}`;
      cotizadosPorPerfil.set(k, (cotizadosPorPerfil.get(k) || 0) + cantidad);
    } else if (it.tipo_item === 'PERFIL' && it.examenes_snapshot_json) {
      let snapshot;
      try {
        snapshot = JSON.parse(it.examenes_snapshot_json);
      } catch {
        snapshot = null;
      }
      for (const ex of flattenExamenesDesdeSnapshot(snapshot)) {
        const exId = Number(ex.examen_id);
        if (!exId) continue;
        cotizadosPorExamen.set(exId, (cotizadosPorExamen.get(exId) || 0) + cantidad);
      }
    }
  }

  // 4) Combinar: unión de exámenes necesarios + cotizados.
  const examenesIds = new Set();
  const nombrePorExamen = new Map();
  for (const r of necesariosRows) {
    examenesIds.add(Number(r.examen_id));
    nombrePorExamen.set(Number(r.examen_id), r.examen_nombre);
  }
  for (const id of cotizadosPorExamen.keys()) examenesIds.add(id);

  // Para exámenes solo cotizados (no asignados a paciente alguno) buscamos nombre.
  const sinNombre = Array.from(examenesIds).filter((id) => !nombrePorExamen.has(id));
  if (sinNombre.length > 0) {
    const placeholders = sinNombre.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT id, nombre FROM examenes WHERE id IN (${placeholders})`,
      sinNombre
    );
    for (const r of rows) nombrePorExamen.set(Number(r.id), r.nombre);
  }

  const necesariosPorExamen = new Map(
    necesariosRows.map((r) => [Number(r.examen_id), Number(r.necesarios) || 0])
  );

  // Perfiles necesarios según pacientes del pedido (perfiles_aplicados_json + legacy emo_perfil_id).
  const [pacPerfilRows] = await pool.execute(
    `SELECT perfiles_aplicados_json, emo_perfil_id, emo_tipo
       FROM pedido_pacientes
      WHERE pedido_id = ?`,
    [pid]
  );
  const necesariosPorPerfil = new Map();
  for (const row of pacPerfilRows) {
    let entries = [];
    try {
      const parsed = row.perfiles_aplicados_json
        ? JSON.parse(row.perfiles_aplicados_json)
        : [];
      entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      entries = [];
    }
    if (entries.length > 0) {
      for (const e of entries) {
        const perfilId = Number(e.emo_perfil_id ?? e.perfil_id);
        const tipoEmo = String(e.tipo_emo ?? e.emo_tipo ?? row.emo_tipo ?? '').toUpperCase();
        if (!perfilId || !tipoEmo) continue;
        const k = `${perfilId}|${tipoEmo}`;
        necesariosPorPerfil.set(k, (necesariosPorPerfil.get(k) || 0) + 1);
      }
    } else if (row.emo_perfil_id && row.emo_tipo) {
      const k = `${Number(row.emo_perfil_id)}|${String(row.emo_tipo).toUpperCase()}`;
      necesariosPorPerfil.set(k, (necesariosPorPerfil.get(k) || 0) + 1);
    }
  }

  const items = [];
  let okCount = 0;
  let faltantes = 0;
  let excesos = 0;
  const idsOrdenados = Array.from(examenesIds).sort((a, b) => a - b);
  for (const examenId of idsOrdenados) {
    const necesarios = necesariosPorExamen.get(examenId) || 0;
    const cotizados = cotizadosPorExamen.get(examenId) || 0;
    const diferencia = cotizados - necesarios;
    let severidad = 'OK';
    if (diferencia < 0) {
      severidad = 'FALTANTE';
      faltantes += 1;
    } else if (diferencia > 0) {
      severidad = 'EXCESO';
      excesos += 1;
    } else {
      okCount += 1;
    }
    items.push({
      tipo: 'EXAMEN',
      examen_id: examenId,
      examen_nombre: nombrePorExamen.get(examenId) || '(examen)',
      necesarios,
      cotizados,
      diferencia,
      severidad,
    });
  }

  const perfilKeys = new Set([...necesariosPorPerfil.keys(), ...cotizadosPorPerfil.keys()]);
  const perfilIds = Array.from(
    new Set(Array.from(perfilKeys).map((k) => Number(String(k).split('|')[0])))
  ).filter((id) => id > 0);
  const nombrePorPerfil = new Map();
  if (perfilIds.length > 0) {
    const ph = perfilIds.map(() => '?').join(',');
    const [perfilNombreRows] = await pool.execute(
      `SELECT id, nombre FROM emo_perfiles WHERE id IN (${ph})`,
      perfilIds
    );
    for (const r of perfilNombreRows) {
      nombrePorPerfil.set(Number(r.id), r.nombre || 'Perfil');
    }
  }
  const perfilKeysOrdenados = Array.from(perfilKeys).sort();
  for (const key of perfilKeysOrdenados) {
    const [perfilIdStr, tipoEmo] = String(key).split('|');
    const perfilId = Number(perfilIdStr);
    const necesarios = necesariosPorPerfil.get(key) || 0;
    const cotizados = cotizadosPorPerfil.get(key) || 0;
    const diferencia = cotizados - necesarios;
    let severidad = 'OK';
    if (diferencia < 0) {
      severidad = 'FALTANTE';
      faltantes += 1;
    } else if (diferencia > 0) {
      severidad = 'EXCESO';
      excesos += 1;
    } else if (necesarios > 0 || cotizados > 0) {
      okCount += 1;
    }
    const nombreBase = nombrePorPerfil.get(perfilId) || 'Perfil';
    items.push({
      tipo: 'PERFIL',
      perfil_id: perfilId,
      tipo_emo: tipoEmo,
      examen_nombre: `${nombreBase} (${tipoEmo})`,
      necesarios,
      cotizados,
      diferencia,
      severidad,
    });
  }

  return {
    pedido_id: pid,
    cotizacion_principal_id: Number(cotizacionPrincipalId),
    tiene_cotizacion: true,
    items,
    resumen: { ok: okCount, faltantes, excesos },
  };
}

module.exports = {
  ESTADOS_VALIDOS: Array.from(ESTADOS_VALIDOS),
  FUENTES_VALIDAS: Array.from(FUENTES_VALIDAS),
  ESTADOS_NO_REALIZADOS: Array.from(ESTADOS_NO_REALIZADOS),
  actualizarEstadoExamen,
  actualizarEstadoMasivoPaciente,
  calcularAjustesSugeridos,
  aplicarAjustesDirectos,
  calcularCoberturaCotizacion,
};
