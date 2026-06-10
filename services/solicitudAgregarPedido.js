const { fetchPrecioExamen } = require('../utils/examenPrecio');
const { crearCotizacionComplementariaConConnection } = require('../controllers/cotizacionesController');
const { persistirSnapshotPaciente } = require('../utils/perfilSnapshot');
const {
  obtenerCotizacionPrincipalAprobadaId,
  MSG_SIN_PRINCIPAL_APROBADA,
} = require('../utils/cotizacionPrincipal');

const TIPOS_EMO_VALIDOS = new Set(['PREOC', 'ANUAL', 'RETIRO', 'VISITA']);

function buildExamenDePerfilSnapshotJson(opts) {
  const { perfil_id, perfil_nombre, tipo_emo, examen_id, nombre } = opts;
  return JSON.stringify({
    origen: 'examen_de_perfil',
    snapshot_at: new Date().toISOString(),
    perfil_id: Number(perfil_id),
    perfil_nombre: perfil_nombre ?? null,
    tipo_emo: tipo_emo ?? null,
    examen_id: examen_id != null ? Number(examen_id) : null,
    nombre_catalogo: nombre ?? null,
  });
}

function parsePerfilesAplicadosJson(raw) {
  if (Array.isArray(raw)) return [...raw];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return [...parsed];
    } catch (_) {
      /* ignore */
    }
  }
  return [];
}

function pacienteYaTienePerfil(pac, perfilId, tipoEmo) {
  const tipo = String(tipoEmo || '').toUpperCase();
  const clave = `${Number(perfilId)}:${tipo}`;
  const list = parsePerfilesAplicadosJson(pac?.perfiles_aplicados_json);
  if (
    list.some(
      (x) =>
        `${Number(x.emo_perfil_id)}:${String(x.emo_tipo || '').toUpperCase()}` === clave
    )
  ) {
    return true;
  }
  return (
    Number(pac?.emo_perfil_id) === Number(perfilId) &&
    String(pac?.emo_tipo || '').toUpperCase() === tipo
  );
}

function mergePerfilAplicadoJson(actual, entrada) {
  const list = parsePerfilesAplicadosJson(actual);
  const k = `${entrada.emo_perfil_id}:${entrada.emo_tipo}`;
  if (!list.some((x) => `${x.emo_perfil_id}:${x.emo_tipo}` === k)) {
    list.push(entrada);
  }
  return list;
}

async function loadExamenesSolicitudRows(connection, solicitudId) {
  try {
    const [rows] = await connection.execute(
      `SELECT solicitud_agregar_paciente_id, examen_id, cantidad,
              perfil_origen_id, perfil_origen_nombre, perfil_origen_tipo_emo
       FROM solicitud_agregar_examenes WHERE solicitud_id = ?`,
      [solicitudId]
    );
    return rows;
  } catch (colErr) {
    if (colErr?.code !== 'ER_BAD_FIELD_ERROR') throw colErr;
    const [rows] = await connection.execute(
      'SELECT solicitud_agregar_paciente_id, examen_id, cantidad FROM solicitud_agregar_examenes WHERE solicitud_id = ?',
      [solicitudId]
    );
    return rows.map((r) => ({
      ...r,
      perfil_origen_id: null,
      perfil_origen_nombre: null,
      perfil_origen_tipo_emo: null,
    }));
  }
}

async function fetchPrecioPerfil(connection, perfilId, tipoEmo, empresaId, sedeId, numPacientes) {
  const tipo = String(tipoEmo || '').toUpperCase();
  if (!TIPOS_EMO_VALIDOS.has(tipo)) return 0;
  const [precioRows] = await connection.execute(
    `SELECT precio FROM emo_perfil_precio
     WHERE perfil_id = ? AND tipo_emo = ?
       AND (empresa_id = ? OR empresa_id IS NULL)
       AND (sede_id = ? OR sede_id IS NULL)
     ORDER BY (empresa_id IS NOT NULL) DESC, (sede_id IS NOT NULL) DESC
     LIMIT 1`,
    [perfilId, tipo, empresaId ?? null, sedeId ?? null]
  );
  if (precioRows.length > 0) {
    const p = Number(precioRows[0].precio);
    if (Number.isFinite(p) && p > 0) return p;
  }
  const [examIdsRows] = await connection.execute(
    'SELECT examen_id FROM emo_perfil_examenes WHERE perfil_id = ? AND tipo_emo = ?',
    [perfilId, tipo]
  );
  let sum = 0;
  for (const r of examIdsRows) {
    sum += await fetchPrecioExamen(connection, r.examen_id, sedeId, numPacientes);
  }
  return sum;
}

/**
 * Agrega exámenes de una solicitud al pedido (paciente_examen_asignado, pedido_items).
 * Opcionalmente crea cotización complementaria BORRADOR (flujo legacy sin cotización del cliente).
 */
async function aplicarSolicitudAgregarAlPedido(connection, opts) {
  const {
    solicitudId,
    usuarioId = null,
    usuarioNombre = null,
    crearComplementariaBorrador = false,
  } = opts;

  const [sols] = await connection.execute(
    'SELECT id, pedido_id, estado FROM solicitudes_agregar WHERE id = ?',
    [solicitudId]
  );
  if (sols.length === 0) {
    throw Object.assign(new Error('Solicitud no encontrada'), { code: 'NOT_FOUND' });
  }
  const pedido_id = sols[0].pedido_id;

  const [pedidoRow] = await connection.execute(
    'SELECT id, sede_id, empresa_id, total_empleados, cotizacion_principal_id FROM pedidos WHERE id = ?',
    [pedido_id]
  );
  const sede_id = pedidoRow[0].sede_id;
  const empresa_id = pedidoRow[0].empresa_id ?? null;

  const [pacientesRows] = await connection.execute(
    'SELECT id, pedido_paciente_id, dni, nombre_completo, cargo, area FROM solicitud_agregar_paciente WHERE solicitud_id = ? ORDER BY id',
    [solicitudId]
  );
  const mapSapIdToPacienteId = {};
  for (const sap of pacientesRows) {
    if (sap.pedido_paciente_id != null) {
      mapSapIdToPacienteId[sap.id] = sap.pedido_paciente_id;
    } else if (sap.dni) {
      const [insP] = await connection.execute(
        `INSERT INTO pedido_pacientes (pedido_id, dni, nombre_completo, cargo, area) VALUES (?, ?, ?, ?, ?)`,
        [pedido_id, sap.dni, sap.nombre_completo || 'Sin nombre', sap.cargo, sap.area]
      );
      mapSapIdToPacienteId[sap.id] = insP.insertId;
    }
  }

  const examenesRows = await loadExamenesSolicitudRows(connection, solicitudId);
  const [pacientesPedido] = await connection.execute(
    'SELECT id FROM pedido_pacientes WHERE pedido_id = ?',
    [pedido_id]
  );
  const todosPacienteIds = pacientesPedido.map((p) => p.id);
  const numPacientes = Number(pedidoRow[0].total_empleados) || todosPacienteIds.length || 0;

  /** @type {Map<string, { perfilId: number, tipoEmo: string, nombre: string, pacienteIds: Set<number> }>} */
  const perfilesAplicadosPedido = new Map();
  /** @type {Map<number, { cantidad: number, precio_base: number }>} */
  const sueltosPedidoItems = new Map();
  const pacientesAfectados = new Set();

  const targetPacientesDeFila = (row) => {
    if (row.solicitud_agregar_paciente_id == null) return todosPacienteIds;
    const pid = mapSapIdToPacienteId[row.solicitud_agregar_paciente_id];
    return pid ? [pid] : [];
  };

  const registrarPerfilNuevoEnPaciente = async (
    pacienteId,
    perfilId,
    tipoEmo,
    nombrePerfil
  ) => {
    const [pacRows] = await connection.execute(
      'SELECT emo_perfil_id, emo_tipo, perfiles_aplicados_json FROM pedido_pacientes WHERE id = ?',
      [pacienteId]
    );
    const pac = pacRows[0] || {};
    if (pacienteYaTienePerfil(pac, perfilId, tipoEmo)) return false;

    const entradaPerfil = {
      emo_perfil_id: perfilId,
      perfil_nombre: nombrePerfil,
      emo_tipo: tipoEmo,
    };
    const perfilesMerged = mergePerfilAplicadoJson(pac.perfiles_aplicados_json, entradaPerfil);
    await connection.execute(
      `UPDATE pedido_pacientes SET
         emo_perfil_id = COALESCE(emo_perfil_id, ?),
         emo_tipo = COALESCE(emo_tipo, ?),
         perfiles_aplicados_json = ?
       WHERE id = ?`,
      [perfilId, tipoEmo, JSON.stringify(perfilesMerged), pacienteId]
    );

    const gKey = `${perfilId}|${tipoEmo}`;
    if (!perfilesAplicadosPedido.has(gKey)) {
      perfilesAplicadosPedido.set(gKey, {
        perfilId,
        tipoEmo,
        nombre: nombrePerfil,
        pacienteIds: new Set(),
      });
    }
    perfilesAplicadosPedido.get(gKey).pacienteIds.add(pacienteId);
    return true;
  };

  for (const row of examenesRows) {
    const examen_id = Number(row.examen_id);
    const cantidad = Math.max(1, Number(row.cantidad) || 1);
    const targetPacienteIds = targetPacientesDeFila(row);
    for (const pid of targetPacienteIds) pacientesAfectados.add(pid);

    const perfilId =
      row.perfil_origen_id != null ? Number(row.perfil_origen_id) : null;
    const tipoEmo = row.perfil_origen_tipo_emo
      ? String(row.perfil_origen_tipo_emo).toUpperCase()
      : null;
    const nombrePerfil =
      (row.perfil_origen_nombre && String(row.perfil_origen_nombre).trim()) ||
      (perfilId ? `Perfil ${perfilId}` : null);
    const esDePerfil =
      perfilId != null &&
      Number.isFinite(perfilId) &&
      perfilId > 0 &&
      tipoEmo &&
      TIPOS_EMO_VALIDOS.has(tipoEmo);

    if (esDePerfil) {
      for (const pacienteId of targetPacienteIds) {
        await registrarPerfilNuevoEnPaciente(
          pacienteId,
          perfilId,
          tipoEmo,
          nombrePerfil
        );
        await connection.execute(
          'INSERT IGNORE INTO paciente_examen_asignado (paciente_id, examen_id) VALUES (?, ?)',
          [pacienteId, examen_id]
        );
      }
      continue;
    }

    const precio_base = await fetchPrecioExamen(connection, examen_id, sede_id, numPacientes);
    const multiplicador =
      row.solicitud_agregar_paciente_id == null ? todosPacienteIds.length || 1 : 1;
    const cantidadTotal = cantidad * multiplicador;

    if (!sueltosPedidoItems.has(examen_id)) {
      sueltosPedidoItems.set(examen_id, { cantidad: 0, precio_base });
    }
    sueltosPedidoItems.get(examen_id).cantidad += cantidadTotal;

    for (const pacienteId of targetPacienteIds) {
      await connection.execute(
        'INSERT IGNORE INTO paciente_examen_asignado (paciente_id, examen_id) VALUES (?, ?)',
        [pacienteId, examen_id]
      );
    }
  }

  for (const grupo of perfilesAplicadosPedido.values()) {
    const precioPerfil = await fetchPrecioPerfil(
      connection,
      grupo.perfilId,
      grupo.tipoEmo,
      empresa_id,
      sede_id,
      numPacientes
    );
    const cantidadPerfil = grupo.pacienteIds.size;
    if (cantidadPerfil <= 0) continue;
    await connection.execute(
      `INSERT INTO pedido_items
         (pedido_id, tipo_item, perfil_id, tipo_emo, examen_id, nombre, cantidad, precio_base)
       VALUES (?, 'PERFIL', ?, ?, NULL, ?, ?, ?)
       ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad), precio_base = VALUES(precio_base)`,
      [
        pedido_id,
        grupo.perfilId,
        grupo.tipoEmo,
        grupo.nombre,
        cantidadPerfil,
        precioPerfil,
      ]
    );
  }

  for (const [examen_id, { cantidad, precio_base }] of sueltosPedidoItems.entries()) {
    await connection.execute(
      `INSERT INTO pedido_items
         (pedido_id, tipo_item, perfil_id, tipo_emo, examen_id, cantidad, precio_base)
       VALUES (?, 'EXAMEN', NULL, NULL, ?, ?, ?)
       ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad), precio_base = VALUES(precio_base)`,
      [pedido_id, examen_id, cantidad, precio_base]
    );
  }

  for (const pid of pacientesAfectados) {
    await persistirSnapshotPaciente(connection, pid, { tag: 'solicitudes-agregar' });
  }

  const [count] = await connection.execute(
    'SELECT COUNT(*) AS c FROM pedido_pacientes WHERE pedido_id = ?',
    [pedido_id]
  );
  await connection.execute('UPDATE pedidos SET total_empleados = ? WHERE id = ?', [
    count[0].c,
    pedido_id,
  ]);

  if (crearComplementariaBorrador) {
    const cotizacionPrincipalId = await obtenerCotizacionPrincipalAprobadaId(connection, pedido_id);
    if (cotizacionPrincipalId != null) {
      const items = await buildItemsComplementariaDesdeSolicitud(
        connection,
        solicitudId,
        pedido_id
      );
      if (items.length > 0) {
        await crearCotizacionComplementariaConConnection(connection, {
          pedido_id,
          cotizacion_base_id: cotizacionPrincipalId,
          items,
          creador_id: usuarioId,
          creador_tipo: 'VENDEDOR',
        });
      }
    }
  }

  await connection.execute(
    `INSERT INTO historial_pedido (pedido_id, tipo_evento, descripcion, usuario_id, usuario_nombre)
     VALUES (?, 'CREACION', ?, ?, ?)`,
    [
      pedido_id,
      'Solicitud de agregar exámenes aprobada y aplicada al pedido',
      usuarioId,
      usuarioNombre,
    ]
  );

  return { pedido_id };
}

/**
 * Construye líneas PERFIL + EXAMEN (con snapshot de perfil) para cotización complementaria.
 */
async function buildItemsComplementariaDesdeSolicitud(connection, solicitudId, pedido_id) {
  const [pedidoRow] = await connection.execute(
    'SELECT sede_id, total_empleados, empresa_id FROM pedidos WHERE id = ?',
    [pedido_id]
  );
  const sede_id = pedidoRow[0]?.sede_id;
  const empresa_id = pedidoRow[0]?.empresa_id ?? null;
  const numPacientes = Number(pedidoRow[0]?.total_empleados) || 0;

  let examenesRows;
  try {
    [examenesRows] = await connection.execute(
      `SELECT solicitud_agregar_paciente_id, examen_id, cantidad,
              perfil_origen_id, perfil_origen_nombre, perfil_origen_tipo_emo
       FROM solicitud_agregar_examenes WHERE solicitud_id = ?`,
      [solicitudId]
    );
  } catch (colErr) {
    if (colErr?.code !== 'ER_BAD_FIELD_ERROR') throw colErr;
    [examenesRows] = await connection.execute(
      'SELECT solicitud_agregar_paciente_id, examen_id, cantidad FROM solicitud_agregar_examenes WHERE solicitud_id = ?',
      [solicitudId]
    );
  }
  const [pacientesPedido] = await connection.execute(
    'SELECT id FROM pedido_pacientes WHERE pedido_id = ?',
    [pedido_id]
  );
  const todosPacienteIds = pacientesPedido.map((p) => p.id);
  const numP = numPacientes || todosPacienteIds.length || 1;

  /** @type {Map<string, { perfil_id: number, tipo_emo: string, nombre: string, scope: string, examRows: Array<{ examen_id: number, cantidad: number }> }>} */
  const gruposPerfil = new Map();
  /** @type {Map<number, { cantidad: number, precio_base: number }>} */
  const sueltosMap = new Map();

  for (const row of examenesRows) {
    const examen_id = Number(row.examen_id);
    const cantidad = Math.max(1, Number(row.cantidad) || 1);
    const multiplicador = row.solicitud_agregar_paciente_id == null ? numP : 1;
    const cantidadTotal = cantidad * multiplicador;
    const perfilId = row.perfil_origen_id != null ? Number(row.perfil_origen_id) : null;
    const tipoEmo = row.perfil_origen_tipo_emo
      ? String(row.perfil_origen_tipo_emo).toUpperCase()
      : null;

    if (perfilId && tipoEmo && TIPOS_EMO_VALIDOS.has(tipoEmo)) {
      const scope =
        row.solicitud_agregar_paciente_id == null
          ? 'ALL'
          : `P${row.solicitud_agregar_paciente_id}`;
      const gKey = `${perfilId}|${tipoEmo}|${scope}`;
      if (!gruposPerfil.has(gKey)) {
        gruposPerfil.set(gKey, {
          perfil_id: perfilId,
          tipo_emo: tipoEmo,
          nombre: row.perfil_origen_nombre || `Perfil ${perfilId}`,
          scope,
          examRows: [],
        });
      }
      gruposPerfil.get(gKey).examRows.push({ examen_id, cantidad: cantidadTotal });
    } else {
      const precio_base = await fetchPrecioExamen(connection, examen_id, sede_id, numP);
      if (!sueltosMap.has(examen_id)) {
        sueltosMap.set(examen_id, { cantidad: 0, precio_base });
      }
      const cur = sueltosMap.get(examen_id);
      cur.cantidad += cantidadTotal;
    }
  }

  const items = [];
  const examenIds = new Set([
    ...sueltosMap.keys(),
    ...Array.from(gruposPerfil.values()).flatMap((g) => g.examRows.map((r) => r.examen_id)),
  ]);
  if (examenIds.size === 0) return [];

  const placeholders = Array.from(examenIds)
    .map(() => '?')
    .join(',');
  const [nombresRows] = await connection.execute(
    `SELECT id, nombre FROM examenes WHERE id IN (${placeholders})`,
    Array.from(examenIds)
  );
  const nombresMap = new Map(nombresRows.map((r) => [r.id, r.nombre || 'Examen']));

  for (const grupo of gruposPerfil.values()) {
    const perfilCantidad = grupo.scope === 'ALL' ? numP : 1;
    const precioPerfil = await fetchPrecioPerfil(
      connection,
      grupo.perfil_id,
      grupo.tipo_emo,
      empresa_id,
      sede_id,
      numP
    );
    items.push({
      tipo_item: 'PERFIL',
      perfil_id: grupo.perfil_id,
      tipo_emo: grupo.tipo_emo,
      nombre: grupo.nombre,
      cantidad: perfilCantidad,
      precio_base: precioPerfil,
      precio_final: precioPerfil,
    });

    const examAgg = new Map();
    for (const er of grupo.examRows) {
      examAgg.set(er.examen_id, (examAgg.get(er.examen_id) ?? 0) + er.cantidad);
    }
    for (const [examen_id, cantidad] of examAgg.entries()) {
      const precio_base = await fetchPrecioExamen(connection, examen_id, sede_id, numP);
      const nombre = nombresMap.get(examen_id) || 'Examen';
      items.push({
        tipo_item: 'EXAMEN',
        examen_id,
        nombre,
        cantidad,
        precio_base,
        precio_final: precio_base,
        examenes_snapshot_json: buildExamenDePerfilSnapshotJson({
          perfil_id: grupo.perfil_id,
          perfil_nombre: grupo.nombre,
          tipo_emo: grupo.tipo_emo,
          examen_id,
          nombre,
        }),
      });
    }
  }

  for (const [examen_id, { cantidad, precio_base }] of sueltosMap.entries()) {
    items.push({
      tipo_item: 'EXAMEN',
      examen_id,
      nombre: nombresMap.get(examen_id) || 'Examen',
      cantidad,
      precio_base,
      precio_final: precio_base,
    });
  }

  return items;
}

async function marcarSolicitudPorComplementaria(connection, cotizacionId, opts) {
  const { estado, mensajeRechazo = null, revisadoPorUsuarioId = null } = opts;
  try {
    const [rows] = await connection.execute(
      `SELECT id, estado FROM solicitudes_agregar
       WHERE cotizacion_complementaria_id = ? AND estado = 'PENDIENTE' LIMIT 1`,
      [cotizacionId]
    );
    if (rows.length === 0) return null;
    const solicitudId = rows[0].id;
    await connection.execute(
      `UPDATE solicitudes_agregar
       SET estado = ?, mensaje_rechazo = ?, fecha_revision = NOW(),
           revisado_por_usuario_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        estado,
        estado === 'RECHAZADA' ? mensajeRechazo : null,
        revisadoPorUsuarioId,
        solicitudId,
      ]
    );
    return solicitudId;
  } catch (err) {
    if (err?.code === 'ER_BAD_FIELD_ERROR') return null;
    throw err;
  }
}

async function vincularComplementariaASolicitud(connection, solicitudId, cotizacionId) {
  try {
    await connection.execute(
      'UPDATE solicitudes_agregar SET cotizacion_complementaria_id = ? WHERE id = ?',
      [cotizacionId, solicitudId]
    );
  } catch (err) {
    if (err?.code === 'ER_BAD_FIELD_ERROR') {
      console.warn(
        '[solicitudes] columna cotizacion_complementaria_id ausente; ejecute migration_solicitud_cotizacion_complementaria.sql'
      );
      return false;
    }
    throw err;
  }
  return true;
}

/** @deprecated Use obtenerCotizacionPrincipalAprobadaId — solo cotización principal APROBADA. */
async function resolverCotizacionBaseId(connection, pedido_id) {
  return obtenerCotizacionPrincipalAprobadaId(connection, pedido_id);
}

const ESTADOS_COMP_ABIERTOS = new Set(['ENVIADA', 'BORRADOR', 'ENVIADA_AL_CLIENTE']);

async function complementariaEstaLibre(connection, cotizacionId) {
  try {
    const [linked] = await connection.execute(
      `SELECT id FROM solicitudes_agregar
       WHERE cotizacion_complementaria_id = ? LIMIT 1`,
      [cotizacionId]
    );
    return linked.length === 0;
  } catch (err) {
    if (err?.code === 'ER_BAD_FIELD_ERROR') return true;
    throw err;
  }
}

async function complementariaVinculadaASolicitud(connection, cotizacionId, solicitudId) {
  try {
    const [rows] = await connection.execute(
      `SELECT id FROM solicitudes_agregar
       WHERE cotizacion_complementaria_id = ? AND id = ? LIMIT 1`,
      [cotizacionId, solicitudId]
    );
    return rows.length > 0;
  } catch (err) {
    if (err?.code === 'ER_BAD_FIELD_ERROR') return false;
    throw err;
  }
}

async function buscarComplementariaHeuristica(connection, pedido_id, fechaSolicitud, solicitudId) {
  const [comps] = await connection.execute(
    `SELECT id, estado, creador_tipo, fecha, created_at
     FROM cotizaciones
     WHERE pedido_id = ? AND es_complementaria = 1
     ORDER BY id DESC`,
    [pedido_id]
  );
  if (comps.length === 0) return null;

  const abiertas = comps.filter((c) =>
    ESTADOS_COMP_ABIERTOS.has(String(c.estado ?? '').toUpperCase())
  );
  let pool = abiertas.length > 0 ? abiertas : comps;

  const libres = [];
  for (const c of pool) {
    const vinculadaAMi = await complementariaVinculadaASolicitud(connection, c.id, solicitudId);
    const libre = await complementariaEstaLibre(connection, c.id);
    if (vinculadaAMi || libre) {
      libres.push(c);
    }
  }
  if (libres.length > 0) pool = libres;

  if (pool.length === 1) return Number(pool[0].id);

  const solMs = new Date(fechaSolicitud).getTime();
  if (!Number.isFinite(solMs)) return Number(pool[0].id);

  let mejor = pool[0];
  let mejorDiff = Number.POSITIVE_INFINITY;
  for (const c of pool) {
    const cMs = new Date(c.fecha || c.created_at || '').getTime();
    const diff = Number.isFinite(cMs) ? Math.abs(cMs - solMs) : Number.POSITIVE_INFINITY;
    if (diff < mejorDiff) {
      mejorDiff = diff;
      mejor = c;
    }
  }
  return Number(mejor.id);
}

/**
 * Devuelve (y opcionalmente crea/vincula) la cotización complementaria de una solicitud.
 */
async function resolverOCrearComplementariaParaSolicitud(connection, solicitudId, opts = {}) {
  const { crearSiFalta = true, creador_id = null } = opts;

  let solRow;
  try {
    const [rows] = await connection.execute(
      `SELECT id, pedido_id, estado, mensaje_cliente, fecha_solicitud, cotizacion_complementaria_id
       FROM solicitudes_agregar WHERE id = ?`,
      [solicitudId]
    );
    solRow = rows[0];
  } catch (colErr) {
    if (colErr?.code !== 'ER_BAD_FIELD_ERROR') throw colErr;
    const [rows] = await connection.execute(
      `SELECT id, pedido_id, estado, mensaje_cliente, fecha_solicitud
       FROM solicitudes_agregar WHERE id = ?`,
      [solicitudId]
    );
    solRow = rows[0] ? { ...rows[0], cotizacion_complementaria_id: null } : null;
  }

  if (!solRow) {
    throw Object.assign(new Error('Solicitud no encontrada'), { code: 'NOT_FOUND' });
  }

  const pedido_id = solRow.pedido_id;
  let creado = false;
  let vinculado = false;

  if (solRow.cotizacion_complementaria_id != null) {
    const cid = Number(solRow.cotizacion_complementaria_id);
    const [exists] = await connection.execute('SELECT id FROM cotizaciones WHERE id = ?', [cid]);
    if (exists.length > 0) {
      return { cotizacionId: cid, creado: false, vinculado: false };
    }
  }

  const heuristicaId = await buscarComplementariaHeuristica(
    connection,
    pedido_id,
    solRow.fecha_solicitud,
    solicitudId
  );
  if (heuristicaId) {
    vinculado = await vincularComplementariaASolicitud(connection, solicitudId, heuristicaId);
    return { cotizacionId: heuristicaId, creado: false, vinculado };
  }

  if (!crearSiFalta || String(solRow.estado).toUpperCase() !== 'PENDIENTE') {
    return { cotizacionId: null, creado: false, vinculado: false };
  }

  const cotizacionBaseId = await obtenerCotizacionPrincipalAprobadaId(connection, pedido_id);
  if (!cotizacionBaseId) {
    throw Object.assign(new Error(MSG_SIN_PRINCIPAL_APROBADA), { code: 'NO_PRINCIPAL_APROBADA' });
  }

  const itemsComp = await buildItemsComplementariaDesdeSolicitud(connection, solicitudId, pedido_id);
  if (itemsComp.length === 0) {
    throw Object.assign(
      new Error('La solicitud no tiene ítems para armar la cotización complementaria.'),
      { code: 'NO_ITEMS' }
    );
  }

  const { cotizacionId, numero_cotizacion } = await crearCotizacionComplementariaConConnection(
    connection,
    {
      pedido_id,
      cotizacion_base_id: cotizacionBaseId,
      items: itemsComp,
      creador_id,
      creador_tipo: 'CLIENTE',
    }
  );
  creado = true;

  await connection.execute(
    `UPDATE cotizaciones
     SET estado = 'ENVIADA', fecha_envio = NOW(),
         notas_manager = COALESCE(?, notas_manager)
     WHERE id = ?`,
    [solRow.mensaje_cliente || null, cotizacionId]
  );

  vinculado = await vincularComplementariaASolicitud(connection, solicitudId, cotizacionId);

  try {
    await connection.execute(
      `INSERT INTO historial_pedido (
         pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre
       ) VALUES (?, ?, 'COTIZACION_COMPLEMENTARIA', ?, ?, NULL)`,
      [
        pedido_id,
        cotizacionId,
        `Cotización complementaria ${numero_cotizacion} generada desde solicitud del cliente #${solicitudId}.`,
        creador_id,
      ]
    );
  } catch (histErr) {
    console.warn('[solicitudes] historial complementaria omitido:', histErr?.message || histErr);
  }

  return { cotizacionId, creado, vinculado };
}

module.exports = {
  aplicarSolicitudAgregarAlPedido,
  buildItemsComplementariaDesdeSolicitud,
  marcarSolicitudPorComplementaria,
  vincularComplementariaASolicitud,
  resolverCotizacionBaseId,
  obtenerCotizacionPrincipalAprobadaId,
  resolverOCrearComplementariaParaSolicitud,
};
