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
  const [items] = await pool.execute(
    `SELECT ci.tipo_item, ci.examen_id, ci.perfil_id, ci.tipo_emo,
            ci.precio_final, ci.examenes_snapshot_json,
            CASE c.estado
              WHEN 'APROBADA'              THEN 1
              WHEN 'APROBADA_POR_MANAGER'  THEN 2
              WHEN 'ENVIADA_AL_CLIENTE'    THEN 3
              WHEN 'ENVIADA_AL_MANAGER'    THEN 4
              WHEN 'ENVIADA'               THEN 5
              ELSE 99
            END AS prioridad_estado
       FROM cotizacion_items ci
       JOIN cotizaciones c ON c.id = ci.cotizacion_id
      WHERE c.pedido_id = ?
        AND c.estado IN (
          'APROBADA','APROBADA_POR_MANAGER','ENVIADA_AL_CLIENTE',
          'ENVIADA_AL_MANAGER','ENVIADA'
        )
      ORDER BY prioridad_estado ASC, c.id DESC, ci.id ASC`,
    [pid]
  );

  // Indexamos: precio por examen suelto y precio por examen dentro de perfil.
  const precioExamen = new Map(); // examen_id → precio_unitario
  for (const it of items) {
    if (it.tipo_item === 'EXAMEN' && it.examen_id != null) {
      precioExamen.set(Number(it.examen_id), Number(it.precio_final));
    } else if (it.tipo_item === 'PERFIL' && it.examenes_snapshot_json) {
      let snapshot;
      try { snapshot = JSON.parse(it.examenes_snapshot_json); }
      catch { snapshot = null; }
      const lista = Array.isArray(snapshot?.examenes) ? snapshot.examenes
                  : Array.isArray(snapshot) ? snapshot : [];
      if (lista.length === 0) continue;
      const sumPrecios = lista.reduce((s, ex) => s + (Number(ex.precio) || 0), 0);
      if (sumPrecios > 0) {
        for (const ex of lista) {
          const exId = Number(ex.examen_id || ex.id);
          const px = Number(ex.precio) || 0;
          if (exId && px > 0 && !precioExamen.has(exId)) {
            precioExamen.set(exId, px);
          }
        }
      } else {
        // Sin precios desglosados: prorrateo uniforme del precio del perfil.
        const proratado = Number(it.precio_final) / lista.length;
        for (const ex of lista) {
          const exId = Number(ex.examen_id || ex.id);
          if (exId && !precioExamen.has(exId)) {
            precioExamen.set(exId, proratado);
          }
        }
      }
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
    tiene_ajustes: true,
    total_examenes_no_realizados: noRealizados.length,
    monto_sugerido: Math.round(montoTotal * 100) / 100,
    items: itemsAjuste,
  };
}

module.exports = {
  ESTADOS_VALIDOS: Array.from(ESTADOS_VALIDOS),
  FUENTES_VALIDAS: Array.from(FUENTES_VALIDAS),
  ESTADOS_NO_REALIZADOS: Array.from(ESTADOS_NO_REALIZADOS),
  actualizarEstadoExamen,
  actualizarEstadoMasivoPaciente,
  calcularAjustesSugeridos,
};
