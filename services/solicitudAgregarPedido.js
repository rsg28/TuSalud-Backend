const { fetchPrecioExamen } = require('../utils/examenPrecio');
const { crearCotizacionComplementariaConConnection } = require('../controllers/cotizacionesController');
const { persistirSnapshotPaciente } = require('../utils/perfilSnapshot');

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
    'SELECT id, sede_id, total_empleados, cotizacion_principal_id FROM pedidos WHERE id = ?',
    [pedido_id]
  );
  const sede_id = pedidoRow[0].sede_id;

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

  const [examenesRows] = await connection.execute(
    'SELECT id, solicitud_agregar_paciente_id, examen_id, cantidad FROM solicitud_agregar_examenes WHERE solicitud_id = ?',
    [solicitudId]
  );
  const [pacientesPedido] = await connection.execute(
    'SELECT id FROM pedido_pacientes WHERE pedido_id = ?',
    [pedido_id]
  );
  const todosPacienteIds = pacientesPedido.map((p) => p.id);
  const numPacientes = Number(pedidoRow[0].total_empleados) || todosPacienteIds.length || 0;
  const itemsComplementaria = new Map();

  for (const row of examenesRows) {
    const examen_id = row.examen_id;
    const cantidad = Math.max(1, row.cantidad || 1);
    const precio_base = await fetchPrecioExamen(connection, examen_id, sede_id, numPacientes);

    const multiplicador =
      row.solicitud_agregar_paciente_id == null ? todosPacienteIds.length || 1 : 1;
    const cantidadTotal = cantidad * multiplicador;

    if (!itemsComplementaria.has(examen_id)) {
      itemsComplementaria.set(examen_id, { cantidad: 0, precio_base });
    }
    itemsComplementaria.get(examen_id).cantidad += cantidadTotal;

    await connection.execute(
      `INSERT INTO pedido_items
         (pedido_id, tipo_item, perfil_id, tipo_emo, examen_id, cantidad, precio_base)
       VALUES (?, 'EXAMEN', NULL, NULL, ?, ?, ?)
       ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad), precio_base = VALUES(precio_base)`,
      [pedido_id, examen_id, cantidadTotal, precio_base]
    );

    let targetPacienteIds = [];
    if (row.solicitud_agregar_paciente_id == null) {
      targetPacienteIds = todosPacienteIds;
    } else {
      const pid = mapSapIdToPacienteId[row.solicitud_agregar_paciente_id];
      if (pid) targetPacienteIds = [pid];
    }
    for (const pacienteId of targetPacienteIds) {
      await connection.execute(
        'INSERT IGNORE INTO paciente_examen_asignado (paciente_id, examen_id) VALUES (?, ?)',
        [pacienteId, examen_id]
      );
    }
  }

  const pacientesAfectados = new Set();
  for (const row of examenesRows) {
    if (row.solicitud_agregar_paciente_id == null) {
      for (const pid of todosPacienteIds) pacientesAfectados.add(pid);
    } else {
      const pid = mapSapIdToPacienteId[row.solicitud_agregar_paciente_id];
      if (pid) pacientesAfectados.add(pid);
    }
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
    const cotizacionPrincipalId = pedidoRow[0]?.cotizacion_principal_id;
    if (cotizacionPrincipalId != null && itemsComplementaria.size > 0) {
      const examenIds = Array.from(itemsComplementaria.keys());
      const placeholders = examenIds.map(() => '?').join(',');
      const [nombresRows] = await connection.execute(
        `SELECT id, nombre FROM examenes WHERE id IN (${placeholders})`,
        examenIds
      );
      const nombresMap = new Map(nombresRows.map((r) => [r.id, r.nombre || 'Examen']));
      const items = Array.from(itemsComplementaria.entries()).map(
        ([examen_id, { cantidad, precio_base }]) => ({
          examen_id,
          nombre: nombresMap.get(examen_id) || 'Examen',
          cantidad,
          precio_final: precio_base,
        })
      );
      await crearCotizacionComplementariaConConnection(connection, {
        pedido_id,
        cotizacion_base_id: cotizacionPrincipalId,
        items,
        creador_id: usuarioId,
        creador_tipo: 'VENDEDOR',
      });
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
 * Construye líneas EXAMEN para cotización complementaria a partir de los exámenes de la solicitud.
 */
async function buildItemsComplementariaDesdeSolicitud(connection, solicitudId, pedido_id) {
  const [pedidoRow] = await connection.execute(
    'SELECT sede_id, total_empleados FROM pedidos WHERE id = ?',
    [pedido_id]
  );
  const sede_id = pedidoRow[0]?.sede_id;
  const numPacientes = Number(pedidoRow[0]?.total_empleados) || 0;

  const [examenesRows] = await connection.execute(
    'SELECT solicitud_agregar_paciente_id, examen_id, cantidad FROM solicitud_agregar_examenes WHERE solicitud_id = ?',
    [solicitudId]
  );
  const [pacientesPedido] = await connection.execute(
    'SELECT id FROM pedido_pacientes WHERE pedido_id = ?',
    [pedido_id]
  );
  const todosPacienteIds = pacientesPedido.map((p) => p.id);
  const itemsMap = new Map();

  for (const row of examenesRows) {
    const examen_id = row.examen_id;
    const cantidad = Math.max(1, row.cantidad || 1);
    const precio_base = await fetchPrecioExamen(
      connection,
      examen_id,
      sede_id,
      numPacientes || todosPacienteIds.length || 1
    );
    const multiplicador =
      row.solicitud_agregar_paciente_id == null ? todosPacienteIds.length || 1 : 1;
    const cantidadTotal = cantidad * multiplicador;
    if (!itemsMap.has(examen_id)) {
      itemsMap.set(examen_id, { cantidad: 0, precio_base });
    }
    const cur = itemsMap.get(examen_id);
    cur.cantidad += cantidadTotal;
  }

  if (itemsMap.size === 0) return [];

  const examenIds = Array.from(itemsMap.keys());
  const placeholders = examenIds.map(() => '?').join(',');
  const [nombresRows] = await connection.execute(
    `SELECT id, nombre FROM examenes WHERE id IN (${placeholders})`,
    examenIds
  );
  const nombresMap = new Map(nombresRows.map((r) => [r.id, r.nombre || 'Examen']));

  return Array.from(itemsMap.entries()).map(([examen_id, { cantidad, precio_base }]) => ({
    examen_id,
    nombre: nombresMap.get(examen_id) || 'Examen',
    cantidad,
    precio_final: precio_base,
  }));
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

module.exports = {
  aplicarSolicitudAgregarAlPedido,
  buildItemsComplementariaDesdeSolicitud,
  marcarSolicitudPorComplementaria,
  vincularComplementariaASolicitud,
};
