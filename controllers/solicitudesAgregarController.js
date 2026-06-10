const pool = require('../config/database');
const { crearCotizacionComplementariaConConnection } = require('./cotizacionesController');
const {
  helpers: { emitirNotificacionAVendedorDePedido },
} = require('./notificacionesController');
const {
  aplicarSolicitudAgregarAlPedido,
  buildItemsComplementariaDesdeSolicitud,
  vincularComplementariaASolicitud,
} = require('../services/solicitudAgregarPedido');

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

    let solicitudes;
    try {
      [solicitudes] = await pool.execute(
        `SELECT sa.id, sa.pedido_id, sa.cliente_usuario_id, sa.estado, sa.mensaje_cliente, sa.mensaje_rechazo,
                sa.cotizacion_complementaria_id,
                sa.fecha_solicitud, sa.fecha_revision, sa.revisado_por_usuario_id,
                u.nombre_completo AS cliente_nombre
         FROM solicitudes_agregar sa
         LEFT JOIN usuarios u ON u.id = sa.cliente_usuario_id
         WHERE sa.pedido_id = ?
         ORDER BY sa.fecha_solicitud DESC`,
        [pedido_id]
      );
    } catch (colErr) {
      if (colErr?.code !== 'ER_BAD_FIELD_ERROR') throw colErr;
      [solicitudes] = await pool.execute(
        `SELECT sa.id, sa.pedido_id, sa.cliente_usuario_id, sa.estado, sa.mensaje_cliente, sa.mensaje_rechazo,
                sa.fecha_solicitud, sa.fecha_revision, sa.revisado_por_usuario_id,
                u.nombre_completo AS cliente_nombre
         FROM solicitudes_agregar sa
         LEFT JOIN usuarios u ON u.id = sa.cliente_usuario_id
         WHERE sa.pedido_id = ?
         ORDER BY sa.fecha_solicitud DESC`,
        [pedido_id]
      );
    }
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
    let examenes;
    try {
      [examenes] = await pool.execute(
        `SELECT sae.id, sae.solicitud_id, sae.solicitud_agregar_paciente_id, sae.examen_id, sae.cantidad,
                sae.perfil_origen_id, sae.perfil_origen_nombre, sae.perfil_origen_tipo_emo,
                e.nombre AS examen_nombre
         FROM solicitud_agregar_examenes sae
         LEFT JOIN examenes e ON e.id = sae.examen_id
         WHERE sae.solicitud_id = ?
         ORDER BY sae.solicitud_agregar_paciente_id IS NULL DESC, sae.id`,
        [id]
      );
    } catch (colErr) {
      if (colErr?.code !== 'ER_BAD_FIELD_ERROR') throw colErr;
      [examenes] = await pool.execute(
        `SELECT sae.id, sae.solicitud_id, sae.solicitud_agregar_paciente_id, sae.examen_id, sae.cantidad,
                e.nombre AS examen_nombre
         FROM solicitud_agregar_examenes sae
         LEFT JOIN examenes e ON e.id = sae.examen_id
         WHERE sae.solicitud_id = ?
         ORDER BY sae.solicitud_agregar_paciente_id IS NULL DESC, sae.id`,
        [id]
      );
    }
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
      const perfil_origen_id =
        e.perfil_origen_id != null ? parseInt(e.perfil_origen_id, 10) : null;
      const perfil_origen_nombre =
        e.perfil_origen_nombre != null ? String(e.perfil_origen_nombre).trim() : null;
      const perfil_origen_tipo_emo =
        e.perfil_origen_tipo_emo != null
          ? String(e.perfil_origen_tipo_emo).trim().toUpperCase()
          : null;
      try {
        await connection.execute(
          `INSERT INTO solicitud_agregar_examenes (
             solicitud_id, solicitud_agregar_paciente_id, examen_id, cantidad,
             perfil_origen_id, perfil_origen_nombre, perfil_origen_tipo_emo
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            solicitud_id,
            solicitud_agregar_paciente_id,
            examen_id,
            cantidad,
            perfil_origen_id,
            perfil_origen_nombre || null,
            perfil_origen_tipo_emo || null,
          ]
        );
      } catch (insErr) {
        if (insErr?.code !== 'ER_BAD_FIELD_ERROR') throw insErr;
        await connection.execute(
          `INSERT INTO solicitud_agregar_examenes (solicitud_id, solicitud_agregar_paciente_id, examen_id, cantidad)
           VALUES (?, ?, ?, ?)`,
          [solicitud_id, solicitud_agregar_paciente_id, examen_id, cantidad]
        );
      }
    }
    const [pedidoCot] = await connection.execute(
      'SELECT cotizacion_principal_id FROM pedidos WHERE id = ?',
      [pedido_id]
    );
    const cotizacionPrincipalId = pedidoCot[0]?.cotizacion_principal_id ?? null;
    let cotizacionComplementariaId = null;

    if (cotizacionPrincipalId != null) {
      const itemsComp = await buildItemsComplementariaDesdeSolicitud(
        connection,
        solicitud_id,
        pedido_id
      );
      if (itemsComp.length > 0) {
        const { cotizacionId, numero_cotizacion } = await crearCotizacionComplementariaConConnection(
          connection,
          {
            pedido_id,
            cotizacion_base_id: cotizacionPrincipalId,
            items: itemsComp,
            creador_id: req.user.id,
            creador_tipo: 'CLIENTE',
          }
        );
        cotizacionComplementariaId = cotizacionId;
        await connection.execute(
          `UPDATE cotizaciones
           SET estado = 'ENVIADA', fecha_envio = NOW(),
               notas_manager = COALESCE(?, notas_manager)
           WHERE id = ?`,
          [mensaje_cliente || null, cotizacionId]
        );
        await vincularComplementariaASolicitud(connection, solicitud_id, cotizacionId);

        try {
          await emitirNotificacionAVendedorDePedido(connection, {
            pedidoId: pedido_id,
            tipo: 'MENSAJE',
            titulo: 'Solicitud de cotización complementaria recibida',
            mensaje: mensaje_cliente
              ? `El cliente solicitó agregar exámenes con cotización complementaria ${numero_cotizacion}. Mensaje: ${String(mensaje_cliente).slice(0, 120)}`
              : `El cliente solicitó agregar exámenes. Revisa la cotización complementaria ${numero_cotizacion}.`,
            contextoJson: {
              evento: 'SOLICITUD_COTIZACION_COMPLEMENTARIA',
              solicitud_id,
              cotizacion_id: cotizacionId,
              pedido_id,
              numero_cotizacion,
            },
            remitenteUsuarioId: req.user.id,
          });
        } catch (notifErr) {
          console.warn('[solicitudes] notificación al vendedor falló:', notifErr?.message || notifErr);
        }
      }
    }

    await connection.commit();
    connection.release();

    const [newSol] = await pool.execute('SELECT * FROM solicitudes_agregar WHERE id = ?', [solicitud_id]);
    res.status(201).json({
      solicitud: sanitizeForJson(newSol[0]),
      cotizacion_complementaria_id: cotizacionComplementariaId,
    });
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

    let solRow;
    try {
      const [sols] = await connection.execute(
        'SELECT id, pedido_id, estado, cotizacion_complementaria_id FROM solicitudes_agregar WHERE id = ?',
        [id]
      );
      solRow = sols[0];
    } catch (colErr) {
      if (colErr?.code !== 'ER_BAD_FIELD_ERROR') throw colErr;
      const [sols] = await connection.execute(
        'SELECT id, pedido_id, estado FROM solicitudes_agregar WHERE id = ?',
        [id]
      );
      solRow = sols[0] ? { ...sols[0], cotizacion_complementaria_id: null } : null;
    }
    if (!solRow) {
      connection.release();
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const access = await puedeAccederPedido(req, solRow.pedido_id);
    if (!access.ok) {
      connection.release();
      return res.status(access.status).json({ error: access.error });
    }
    if (solRow.estado !== 'PENDIENTE') {
      connection.release();
      return res.status(400).json({ error: 'La solicitud ya fue procesada' });
    }
    // No se puede aprobar una solicitud sobre un pedido cerrado.
    if (estadoUpper === 'APROBADA') {
      const [pedidoEstado] = await connection.execute(
        'SELECT estado FROM pedidos WHERE id = ?',
        [solRow.pedido_id]
      );
      const estPed = pedidoEstado[0]?.estado;
      if (estPed && ['COMPLETADO', 'CANCELADO'].includes(estPed)) {
        connection.release();
        return res.status(400).json({
          error: `El pedido ya está en estado ${estPed}; no se pueden añadir exámenes.`,
        });
      }
    }

    const cotizacionComplementariaId = solRow.cotizacion_complementaria_id ?? null;

    if (estadoUpper === 'APROBADA' && cotizacionComplementariaId) {
      connection.release();
      return res.status(400).json({
        error:
          'Esta solicitud tiene una cotización complementaria pendiente. Use «Revisar» para aprobarla desde la cotización.',
        cotizacion_complementaria_id: cotizacionComplementariaId,
      });
    }

    await connection.beginTransaction();

    if (estadoUpper === 'APROBADA') {
      await aplicarSolicitudAgregarAlPedido(connection, {
        solicitudId: id,
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre_completo || null,
        crearComplementariaBorrador: true,
      });
    }

    if (estadoUpper === 'RECHAZADA' && cotizacionComplementariaId) {
      await connection.execute(
        `UPDATE cotizaciones SET estado = 'RECHAZADA', mensaje_rechazo = ? WHERE id = ? AND estado IN ('ENVIADA', 'ENVIADA_AL_CLIENTE', 'BORRADOR')`,
        [mensaje_rechazo || null, cotizacionComplementariaId]
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
