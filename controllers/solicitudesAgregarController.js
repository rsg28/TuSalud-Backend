const pool = require('../config/database');
const { crearCotizacionComplementariaConConnection } = require('./cotizacionesController');

function sanitizeForJson(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeForJson);
  if (typeof obj === 'object' && obj.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeForJson(v);
    return out;
  }
  return obj;
}

async function puedeAccederPedido(req, pedidoId) {
  const [rows] = await pool.execute(
    'SELECT id, cliente_usuario_id, vendedor_id, empresa_id FROM pedidos WHERE id = ?',
    [pedidoId]
  );
  if (rows.length === 0) return { ok: false, status: 404, error: 'Pedido no encontrado' };
  const pedido = rows[0];
  const rol = (req.user?.rol || '').toLowerCase();
  if (rol === 'cliente') {
    if (Number(pedido.cliente_usuario_id) !== Number(req.user.id)) {
      return { ok: false, status: 403, error: 'No puede acceder a este pedido' };
    }
  }
  return { ok: true, pedido };
}

const listarPorPedido = async (req, res) => {
  try {
    const pedido_id = req.query.pedido_id ? parseInt(req.query.pedido_id, 10) : null;
    if (!pedido_id) {
      return res.status(400).json({ error: 'pedido_id es requerido' });
    }
    const access = await puedeAccederPedido(req, pedido_id);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const [solicitudes] = await pool.execute(
      `SELECT sa.id, sa.pedido_id, sa.cliente_usuario_id, sa.estado, sa.mensaje_cliente, sa.mensaje_rechazo,
              sa.fecha_solicitud, sa.fecha_revision, sa.revisado_por_usuario_id,
              u.nombre_completo AS cliente_nombre
       FROM solicitudes_agregar sa
       LEFT JOIN usuarios u ON u.id = sa.cliente_usuario_id
       WHERE sa.pedido_id = ?
       ORDER BY sa.fecha_solicitud DESC`,
      [pedido_id]
    );
    res.json({ solicitudes: sanitizeForJson(solicitudes) });
  } catch (err) {
    console.error('Error listar solicitudes por pedido:', err);
    res.status(500).json({ error: 'Error al listar solicitudes' });
  }
};

const obtenerDetalle = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [sols] = await pool.execute(
      'SELECT id, pedido_id, cliente_usuario_id, estado, mensaje_cliente, mensaje_rechazo, fecha_solicitud, fecha_revision, revisado_por_usuario_id FROM solicitudes_agregar WHERE id = ?',
      [id]
    );
    if (sols.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const access = await puedeAccederPedido(req, sols[0].pedido_id);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const [pacientes] = await pool.execute(
      `SELECT sap.id, sap.solicitud_id, sap.pedido_paciente_id, sap.dni, sap.nombre_completo, sap.cargo, sap.area,
              pp.dni AS pedido_paciente_dni, pp.nombre_completo AS pedido_paciente_nombre
       FROM solicitud_agregar_paciente sap
       LEFT JOIN pedido_pacientes pp ON pp.id = sap.pedido_paciente_id
       WHERE sap.solicitud_id = ?
       ORDER BY sap.id`,
      [id]
    );
    const [examenes] = await pool.execute(
      `SELECT sae.id, sae.solicitud_id, sae.solicitud_agregar_paciente_id, sae.examen_id, sae.cantidad,
              e.nombre AS examen_nombre
       FROM solicitud_agregar_examenes sae
       LEFT JOIN examenes e ON e.id = sae.examen_id
       WHERE sae.solicitud_id = ?
       ORDER BY sae.solicitud_agregar_paciente_id IS NULL DESC, sae.id`,
      [id]
    );
    res.json(sanitizeForJson({
      solicitud: sols[0],
      pacientes: pacientes,
      examenes: examenes,
    }));
  } catch (err) {
    console.error('Error obtener detalle solicitud:', err);
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
};

const crear = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { pedido_id, mensaje_cliente, pacientes, examenes } = req.body;
    if (!pedido_id) {
      connection.release();
      return res.status(400).json({ error: 'pedido_id es requerido' });
    }
    const access = await puedeAccederPedido(req, pedido_id);
    if (!access.ok) {
      connection.release();
      return res.status(access.status).json({ error: access.error });
    }
    if (req.user.rol !== 'cliente') {
      connection.release();
      return res.status(403).json({ error: 'Solo el cliente puede crear solicitudes de agregar exámenes' });
    }
    if (Number(access.pedido.cliente_usuario_id) !== Number(req.user.id)) {
      connection.release();
      return res.status(403).json({ error: 'Solo puede crear solicitudes para sus propios pedidos' });
    }

    const pacientesList = Array.isArray(pacientes) ? pacientes : [];
    const examenesList = Array.isArray(examenes) ? examenes : [];
    if (examenesList.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Debe incluir al menos un examen' });
    }

    await connection.beginTransaction();
    const [ins] = await connection.execute(
      `INSERT INTO solicitudes_agregar (pedido_id, cliente_usuario_id, estado, mensaje_cliente)
       VALUES (?, ?, 'PENDIENTE', ?)`,
      [pedido_id, req.user.id, mensaje_cliente || null]
    );
    const solicitud_id = ins.insertId;

    const solicitudPacienteIdsByIndex = [];
    for (let i = 0; i < pacientesList.length; i++) {
      const p = pacientesList[i];
      const pedido_paciente_id = p.pedido_paciente_id != null ? parseInt(p.pedido_paciente_id, 10) : null;
      const dni = p.dni != null ? String(p.dni).trim() : null;
      const nombre_completo = p.nombre_completo != null ? String(p.nombre_completo).trim() : null;
      const [insP] = await connection.execute(
        `INSERT INTO solicitud_agregar_paciente (solicitud_id, pedido_paciente_id, dni, nombre_completo, cargo, area)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [solicitud_id, pedido_paciente_id, dni, nombre_completo || null, p.cargo || null, p.area || null]
      );
      solicitudPacienteIdsByIndex[i] = insP.insertId;
    }

    for (const e of examenesList) {
      let solicitud_agregar_paciente_id = null;
      if (e.solicitud_agregar_paciente_id != null) {
        solicitud_agregar_paciente_id = parseInt(e.solicitud_agregar_paciente_id, 10);
      } else if (e.paciente_index != null && solicitudPacienteIdsByIndex[e.paciente_index] != null) {
        solicitud_agregar_paciente_id = solicitudPacienteIdsByIndex[e.paciente_index];
      }
      const examen_id = parseInt(e.examen_id, 10);
      const cantidad = Math.max(1, parseInt(e.cantidad, 10) || 1);
      await connection.execute(
        `INSERT INTO solicitud_agregar_examenes (solicitud_id, solicitud_agregar_paciente_id, examen_id, cantidad)
         VALUES (?, ?, ?, ?)`,
        [solicitud_id, solicitud_agregar_paciente_id, examen_id, cantidad]
      );
    }
    await connection.commit();
    connection.release();

    const [newSol] = await pool.execute('SELECT * FROM solicitudes_agregar WHERE id = ?', [solicitud_id]);
    res.status(201).json({ solicitud: sanitizeForJson(newSol[0]) });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Error crear solicitud:', err);
    res.status(500).json({ error: 'Error al crear solicitud', details: err.message });
  }
};

const actualizarEstado = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id = parseInt(req.params.id, 10);
    const { estado, mensaje_rechazo } = req.body;
    const estadoUpper = estado ? String(estado).toUpperCase() : '';
    if (estadoUpper !== 'APROBADA' && estadoUpper !== 'RECHAZADA') {
      connection.release();
      return res.status(400).json({ error: 'estado debe ser APROBADA o RECHAZADA' });
    }
    if (req.user.rol !== 'vendedor' && req.user.rol !== 'manager') {
      connection.release();
      return res.status(403).json({ error: 'Solo vendedor o manager pueden aprobar o rechazar' });
    }
    if (estadoUpper === 'RECHAZADA' && (mensaje_rechazo == null || String(mensaje_rechazo).trim() === '')) {
      connection.release();
      return res.status(400).json({ error: 'mensaje_rechazo es requerido al rechazar' });
    }

    const [sols] = await connection.execute(
      'SELECT id, pedido_id, estado FROM solicitudes_agregar WHERE id = ?',
      [id]
    );
    if (sols.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const access = await puedeAccederPedido(req, sols[0].pedido_id);
    if (!access.ok) {
      connection.release();
      return res.status(access.status).json({ error: access.error });
    }
    if (sols[0].estado !== 'PENDIENTE') {
      connection.release();
      return res.status(400).json({ error: 'La solicitud ya fue procesada' });
    }

    await connection.beginTransaction();

    if (estadoUpper === 'APROBADA') {
      const pedido_id = sols[0].pedido_id;
      const [pedidoRow] = await connection.execute('SELECT id, sede_id FROM pedidos WHERE id = ?', [pedido_id]);
      const sede_id = pedidoRow[0].sede_id;

      const [pacientesRows] = await connection.execute(
        'SELECT id, pedido_paciente_id, dni, nombre_completo, cargo, area FROM solicitud_agregar_paciente WHERE solicitud_id = ? ORDER BY id',
        [id]
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
        [id]
      );
      const [pacientesPedido] = await connection.execute('SELECT id FROM pedido_pacientes WHERE pedido_id = ?', [pedido_id]);
      const todosPacienteIds = pacientesPedido.map((p) => p.id);
      const itemsComplementaria = new Map();

      for (const row of examenesRows) {
        const examen_id = row.examen_id;
        const cantidad = Math.max(1, row.cantidad || 1);
        const [precio] = await connection.execute(
          `SELECT precio FROM examen_precio WHERE examen_id = ? AND (sede_id = ? OR sede_id IS NULL) AND (vigente_hasta IS NULL OR vigente_hasta >= CURDATE()) ORDER BY sede_id IS NOT NULL DESC LIMIT 1`,
          [examen_id, sede_id]
        );
        const precio_base = precio.length > 0 ? Number(precio[0].precio) : 0;
        if (!itemsComplementaria.has(examen_id)) {
          itemsComplementaria.set(examen_id, { cantidad: 0, precio_base });
        }
        itemsComplementaria.get(examen_id).cantidad += cantidad;

        await connection.execute(
          'INSERT INTO pedido_examenes (pedido_id, examen_id, cantidad, precio_base) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE cantidad = cantidad + ?, precio_base = ?',
          [pedido_id, examen_id, cantidad, precio_base, cantidad, precio_base]
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

      const [count] = await connection.execute('SELECT COUNT(*) AS c FROM pedido_pacientes WHERE pedido_id = ?', [pedido_id]);
      await connection.execute('UPDATE pedidos SET total_empleados = ? WHERE id = ?', [count[0].c, pedido_id]);

      const [pedidoConCot] = await connection.execute('SELECT cotizacion_principal_id FROM pedidos WHERE id = ?', [pedido_id]);
      const cotizacionPrincipalId = pedidoConCot[0]?.cotizacion_principal_id;
      if (cotizacionPrincipalId != null && itemsComplementaria.size > 0) {
        const examenIds = Array.from(itemsComplementaria.keys());
        const placeholders = examenIds.map(() => '?').join(',');
        const [nombresRows] = await connection.execute(
          `SELECT id, nombre FROM examenes WHERE id IN (${placeholders})`,
          examenIds
        );
        const nombresMap = new Map(nombresRows.map((r) => [r.id, r.nombre || 'Examen']));
        const items = Array.from(itemsComplementaria.entries()).map(([examen_id, { cantidad, precio_base }]) => ({
          examen_id,
          nombre: nombresMap.get(examen_id) || 'Examen',
          cantidad,
          precio_final: precio_base,
        }));
        await crearCotizacionComplementariaConConnection(connection, {
          pedido_id,
          cotizacion_base_id: cotizacionPrincipalId,
          items,
          creador_id: req.user.id,
          creador_tipo: 'VENDEDOR',
        });
      }

      await connection.execute(
        `INSERT INTO historial_pedido (pedido_id, tipo_evento, descripcion, usuario_id, usuario_nombre)
         VALUES (?, 'CREACION', ?, ?, ?)`,
        [pedido_id, 'Solicitud de agregar exámenes aprobada y aplicada al pedido', req.user.id, req.user.nombre_completo || null]
      );
    }

    await connection.execute(
      `UPDATE solicitudes_agregar SET estado = ?, mensaje_rechazo = ?, fecha_revision = NOW(), revisado_por_usuario_id = ?, updated_at = NOW() WHERE id = ?`,
      [estadoUpper, estadoUpper === 'RECHAZADA' ? (mensaje_rechazo || null) : null, req.user.id, id]
    );
    await connection.commit();
    connection.release();

    const [updated] = await pool.execute('SELECT * FROM solicitudes_agregar WHERE id = ?', [id]);
    res.json({ solicitud: sanitizeForJson(updated[0]) });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Error actualizar estado solicitud:', err);
    res.status(500).json({ error: 'Error al actualizar solicitud', details: err.message });
  }
};

module.exports = {
  listarPorPedido,
  obtenerDetalle,
  crear,
  actualizarEstado,
};
