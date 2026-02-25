const pool = require('../config/database');

// Asegura que ningún BigInt llegue a res.json() (mysql2 puede devolver BigInt y JSON.stringify falla)
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

// Nuevo esquema: pedidos, pedido_examenes, historial_pedido, pedido_pacientes, etc.

const generarNumeroPedido = async () => {
  const [rows] = await pool.execute('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM pedidos');
  const year = new Date().getFullYear();
  return `PED-${year}-${String(rows[0].n).padStart(6, '0')}`;
};

const registrarHistorial = async (connection, pedido_id, tipo_evento, descripcion, usuario_id, cotizacion_id = null, extra = {}) => {
  const usuario_nombre = extra.usuario_nombre || null;
  const valor_anterior = extra.valor_anterior ?? null;
  const valor_nuevo = extra.valor_nuevo ?? null;
  const atendidos = extra.atendidos ?? null;
  const no_atendidos = extra.no_atendidos ?? null;
  await connection.execute(
    `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos]
  );
};

const listarPedidos = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { estado, empresa_id, vendedor_id, user_id, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const rol = (req.user.rol || '').toLowerCase();
    if (user_id && rol === 'cliente' && parseInt(String(user_id), 10) !== req.user.id) {
      return res.status(403).json({ error: 'Solo puedes consultar tus propios pedidos' });
    }

    let query = `
      SELECT p.*,
        e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc,
        s.nombre AS sede_nombre,
        u.nombre_completo AS vendedor_nombre
      FROM pedidos p
      JOIN empresas e ON p.empresa_id = e.id
      JOIN sedes s ON p.sede_id = s.id
      LEFT JOIN usuarios u ON p.vendedor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
    } else {
      query += " AND p.estado != 'CANCELADO'";
    }
    if (empresa_id) {
      query += ' AND p.empresa_id = ?';
      params.push(empresa_id);
    }
    if (vendedor_id) {
      query += ' AND p.vendedor_id = ?';
      params.push(vendedor_id);
    }
    if (user_id) {
      query += ' AND p.cliente_usuario_id = ?';
      params.push(user_id);
    }

    if (rol === 'vendedor') {
      query += ' AND (p.vendedor_id = ? OR p.vendedor_id IS NULL)';
      params.push(req.user.id);
    }
    if (rol === 'cliente') {
      const [empresas] = await pool.execute(
        'SELECT empresa_id FROM usuario_empresa WHERE usuario_id = ?',
        [req.user.id]
      );
      const ids = empresas.map((e) => e.empresa_id);
      if (ids.length === 0) {
        return res.json({ pedidos: [], page: pageNum, limit: limitNum });
      }
      query += ` AND p.empresa_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids);
    }

    // LIMIT/OFFSET como valores enteros en la query (evita ER_WRONG_ARGUMENTS con prepared statements)
    const safeLimit = Math.max(1, Math.min(100, Number(limitNum) || 20));
    const safeOffset = Math.max(0, Number(offset) || 0);
    query += ` ORDER BY p.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [pedidos] = await pool.execute(query, params);
    // Incluir estados de cotizaciones por pedido para que el frontend muestre la etiqueta correcta (Enviada al cliente / Aprobada por manager / Enviada al manager)
    const pedidoIds = pedidos.map((p) => p.id);
    let cotizacionesPorPedido = {};
    if (pedidoIds.length > 0) {
      const placeholders = pedidoIds.map(() => '?').join(',');
      const [cots] = await pool.execute(
        `SELECT pedido_id, estado FROM cotizaciones WHERE pedido_id IN (${placeholders}) ORDER BY es_complementaria ASC, id ASC`,
        pedidoIds
      );
      for (const row of cots) {
        const pid = row.pedido_id;
        if (!cotizacionesPorPedido[pid]) cotizacionesPorPedido[pid] = [];
        cotizacionesPorPedido[pid].push({ estado: row.estado });
      }
    }
    const pedidosConCotizaciones = pedidos.map((p) => ({
      ...p,
      cotizaciones: cotizacionesPorPedido[p.id] || [],
    }));
    res.json({
      pedidos: sanitizeForJson(pedidosConCotizaciones),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    const message = error.message || 'Error desconocido';
    try {
      res.status(500).json({ error: 'Error al listar pedidos', message });
    } catch (e) {
      res.status(500).send(JSON.stringify({ error: 'Error al listar pedidos', message }));
    }
  }
};

/** Lista los pedidos del usuario autenticado (cliente_usuario_id = req.user.id). Para que el cliente vea solo los suyos. */
const listarMisPedidos = async (req, res) => {
  req.query.user_id = String(req.user.id);
  return listarPedidos(req, res);
};

/** GET /api/pedidos/con-cotizacion-aprobada — Lista pedidos que tienen al menos una cotización aprobada por el cliente (estado APROBADA). Útil para facturación. */
const listarPedidosConCotizacionAprobada = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { estado, empresa_id, vendedor_id, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const rol = (req.user.rol || '').toLowerCase();

    let query = `
      SELECT p.*,
        e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc,
        s.nombre AS sede_nombre,
        u.nombre_completo AS vendedor_nombre
      FROM pedidos p
      JOIN empresas e ON p.empresa_id = e.id
      JOIN sedes s ON p.sede_id = s.id
      LEFT JOIN usuarios u ON p.vendedor_id = u.id
      WHERE p.estado != 'CANCELADO'
        AND EXISTS (SELECT 1 FROM cotizaciones c WHERE c.pedido_id = p.id AND c.estado = 'APROBADA')
    `;
    const params = [];

    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
    }
    if (empresa_id) {
      query += ' AND p.empresa_id = ?';
      params.push(empresa_id);
    }
    if (vendedor_id) {
      query += ' AND p.vendedor_id = ?';
      params.push(vendedor_id);
    }

    if (rol === 'vendedor') {
      query += ' AND (p.vendedor_id = ? OR p.vendedor_id IS NULL)';
      params.push(req.user.id);
    }
    if (rol === 'cliente') {
      const [empresas] = await pool.execute(
        'SELECT empresa_id FROM usuario_empresa WHERE usuario_id = ?',
        [req.user.id]
      );
      const ids = empresas.map((e) => e.empresa_id);
      if (ids.length === 0) {
        return res.json({ pedidos: [], page: pageNum, limit: limitNum });
      }
      query += ` AND p.empresa_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids);
    }

    const safeLimit = Math.max(1, Math.min(100, Number(limitNum) || 20));
    const safeOffset = Math.max(0, Number(offset) || 0);
    query += ` ORDER BY p.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [pedidos] = await pool.execute(query, params);
    res.json({
      pedidos: sanitizeForJson(pedidos),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error al listar pedidos con cotización aprobada:', error);
    res.status(500).json({ error: 'Error al listar pedidos', message: error.message || 'Error desconocido' });
  }
};

const obtenerPedido = async (req, res) => {
  try {
    const { pedido_id } = req.params;

    const [pedidos] = await pool.execute(
      `SELECT p.*,
        e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc,
        s.nombre AS sede_nombre,
        u.nombre_completo AS vendedor_nombre
       FROM pedidos p
       JOIN empresas e ON p.empresa_id = e.id
       JOIN sedes s ON p.sede_id = s.id
       LEFT JOIN usuarios u ON p.vendedor_id = u.id
       WHERE p.id = ?`,
      [pedido_id]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedido = pedidos[0];

    const [examenes] = await pool.execute(
      `SELECT pe.*, ex.nombre AS examen_nombre
       FROM pedido_examenes pe
       LEFT JOIN examenes ex ON pe.examen_id = ex.id
       WHERE pe.pedido_id = ?`,
      [pedido_id]
    );

    const [cotizaciones] = await pool.execute(
      'SELECT id, numero_cotizacion, estado, es_complementaria, total, fecha, mensaje_rechazo FROM cotizaciones WHERE pedido_id = ? ORDER BY es_complementaria ASC, id ASC',
      [pedido_id]
    );

    let factura = null;
    if (pedido.factura_id) {
      const [fac] = await pool.execute('SELECT * FROM facturas WHERE id = ?', [pedido.factura_id]);
      if (fac.length > 0) factura = fac[0];
    }

    const [pacientes] = await pool.execute(
      `SELECT pp.*,
        (SELECT COUNT(*) FROM paciente_examen_asignado pea WHERE pea.paciente_id = pp.id) AS total_examenes,
        (SELECT COUNT(*) FROM paciente_examen_completado pec WHERE pec.paciente_id = pp.id) AS examenes_completados
       FROM pedido_pacientes pp
       WHERE pp.pedido_id = ?`,
      [pedido_id]
    );

    const [historial] = await pool.execute(
      `SELECT h.*, u.nombre_completo AS usuario_nombre
       FROM historial_pedido h
       LEFT JOIN usuarios u ON h.usuario_id = u.id
       WHERE h.pedido_id = ?
       ORDER BY h.created_at ASC`,
      [pedido_id]
    );

    const payload = sanitizeForJson({
      ...pedido,
      examenes,
      cotizaciones,
      factura,
      pacientes: Array.isArray(pacientes) ? pacientes.map((p) => sanitizeForJson({ ...p })) : [],
      historial
    });
    res.json(payload);
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
};

// GET /api/pedidos/:pedido_id/pacientes-examenes — lista pacientes del pedido y exámenes asignados/completados
const obtenerPacientesExamenes = async (req, res) => {
  try {
    const pedidoId = parseInt(String(req.params.pedido_id || ''), 10);
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      return res.status(400).json({ error: 'pedido_id inválido' });
    }

    const [pedidos] = await pool.execute(
      'SELECT id, numero_pedido FROM pedidos WHERE id = ?',
      [pedidoId]
    );
    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const numero_pedido = pedidos[0].numero_pedido;

    const [pacientes] = await pool.execute(
      `SELECT pp.id, pp.dni, pp.nombre_completo, pp.cargo, pp.area
       FROM pedido_pacientes pp
       WHERE pp.pedido_id = ?
       ORDER BY pp.nombre_completo`,
      [pedidoId]
    );

    let total_examenes_asignados = 0;
    let total_examenes_completados = 0;
    const resultado = [];

    for (const p of pacientes) {
      const [examenes] = await pool.execute(
        `SELECT pea.examen_id, ex.nombre,
                CASE WHEN pec.id IS NOT NULL THEN 1 ELSE 0 END AS completado,
                pec.fecha_completado
         FROM paciente_examen_asignado pea
         LEFT JOIN examenes ex ON ex.id = pea.examen_id
         LEFT JOIN paciente_examen_completado pec ON pec.paciente_id = pea.paciente_id AND pec.examen_id = pea.examen_id
         WHERE pea.paciente_id = ?
         ORDER BY ex.nombre`,
        [p.id]
      );
      const examenesList = examenes.map((e) => ({
        examen_id: e.examen_id,
        nombre: e.nombre || `Examen ${e.examen_id}`,
        completado: Boolean(e.completado),
        fecha_completado: e.fecha_completado ? (e.fecha_completado instanceof Date ? e.fecha_completado.toISOString() : String(e.fecha_completado)) : null
      }));
      const completadosPaciente = examenesList.filter((e) => e.completado).length;
      total_examenes_asignados += examenesList.length;
      total_examenes_completados += completadosPaciente;

      resultado.push(sanitizeForJson({
        id: p.id,
        dni: p.dni,
        nombre_completo: p.nombre_completo,
        cargo: p.cargo,
        area: p.area,
        examenes: examenesList,
        examenes_completados: completadosPaciente,
        examenes_total: examenesList.length
      }));
    }

    res.json({
      numero_pedido,
      pacientes: resultado,
      resumen: {
        total_pacientes: resultado.length,
        total_examenes_asignados,
        total_examenes_completados
      }
    });
  } catch (error) {
    console.error('Error al obtener pacientes y exámenes:', error);
    res.status(500).json({ error: 'Error al obtener pacientes y exámenes' });
  }
};

const crearPedido = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { empresa_id, sede_id, cliente_usuario_id, observaciones, condiciones_pago, fecha_vencimiento, examenes, empleados, total_empleados: totalEmpleadosBody, totalEmpleados: totalEmpleadosCamel } = req.body;
    const vendedor_id = (req.user && (req.user.rol === 'vendedor' || req.user.rol === 'manager')) ? req.user.id : null;
    const cliente_id = (req.user && req.user.rol === 'cliente') ? req.user.id : (cliente_usuario_id || null);

    if (!empresa_id || !sede_id) {
      return res.status(400).json({ error: 'empresa_id y sede_id son requeridos' });
    }

    const [empresa] = await connection.execute('SELECT id FROM empresas WHERE id = ?', [empresa_id]);
    if (empresa.length === 0) {
      return res.status(400).json({ error: 'Empresa no encontrada' });
    }
    const [sede] = await connection.execute('SELECT id FROM sedes WHERE id = ?', [sede_id]);
    if (sede.length === 0) {
      return res.status(400).json({ error: 'Sede no encontrada' });
    }

    const numero_pedido = await generarNumeroPedido();
    const empleadosList = Array.isArray(empleados) ? empleados : [];
    const rawTotal = totalEmpleadosBody ?? totalEmpleadosCamel;
    const totalEmpleadosInicial = empleadosList.length > 0
      ? empleadosList.length
      : ((rawTotal !== undefined && rawTotal !== null && Number(rawTotal) >= 0) ? Math.max(0, parseInt(rawTotal, 10)) : 0);

    const [result] = await connection.execute(
      `INSERT INTO pedidos (numero_pedido, empresa_id, sede_id, vendedor_id, cliente_usuario_id, estado, total_empleados, observaciones, condiciones_pago, fecha_vencimiento)
       VALUES (?, ?, ?, ?, ?, 'ESPERA_COTIZACION', ?, ?, ?, ?)`,
      [numero_pedido, empresa_id, sede_id, vendedor_id, cliente_id, totalEmpleadosInicial, observaciones || null, condiciones_pago || null, fecha_vencimiento || null]
    );
    const pedido_id = result.insertId;

    const pedidoExamenIds = new Set();
    if (examenes && Array.isArray(examenes) && examenes.length > 0) {
      for (const item of examenes) {
        const examen_id = item.examen_id;
        const cantidad = Math.max(1, parseInt(item.cantidad) || 1);
        pedidoExamenIds.add(examen_id);

        const [precio] = await connection.execute(
          `SELECT precio FROM examen_precio WHERE examen_id = ? AND (sede_id = ? OR sede_id IS NULL) AND (vigente_hasta IS NULL OR vigente_hasta >= CURDATE()) ORDER BY sede_id IS NOT NULL DESC LIMIT 1`,
          [examen_id, sede_id]
        );
        const precio_base = precio.length > 0 ? Number(precio[0].precio) : 0;

        await connection.execute(
          'INSERT INTO pedido_examenes (pedido_id, examen_id, cantidad, precio_base) VALUES (?, ?, ?, ?)',
          [pedido_id, examen_id, cantidad, precio_base]
        );
      }
    }

    for (const emp of empleadosList) {
      const dni = String(emp.dni ?? '').trim();
      const nombre_completo = String(emp.nombre_completo ?? 'Sin nombre').trim();
      if (!dni) continue;
      const [insPac] = await connection.execute(
        `INSERT INTO pedido_pacientes (pedido_id, dni, nombre_completo, cargo, area)
         VALUES (?, ?, ?, ?, ?)`,
        [pedido_id, dni, nombre_completo, emp.cargo ?? null, emp.area ?? null]
      );
      const paciente_id = insPac.insertId;
      const examenesEmp = Array.isArray(emp.examenes) ? emp.examenes : [];
      for (const examen_id of examenesEmp) {
        if (!pedidoExamenIds.has(examen_id)) continue;
        await connection.execute(
          'INSERT IGNORE INTO paciente_examen_asignado (paciente_id, examen_id) VALUES (?, ?)',
          [paciente_id, examen_id]
        );
      }
    }

    if (empleadosList.length > 0) {
      await connection.execute('UPDATE pedidos SET total_empleados = ? WHERE id = ?', [empleadosList.length, pedido_id]);
    }

    await registrarHistorial(connection, pedido_id, 'CREACION', `Pedido ${numero_pedido} creado`, vendedor_id, null, { usuario_nombre: req.user ? req.user.nombre_completo : null });
    await connection.commit();

    const [newPedido] = await pool.execute('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
    res.status(201).json({
      message: 'Pedido creado exitosamente',
      pedido: newPedido[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear pedido:', error);
    res.status(500).json({ error: 'Error al crear pedido', details: error.message });
  } finally {
    connection.release();
  }
};

const agregarExamen = async (req, res) => {
  try {
    const { pedido_id } = req.params;
    const { examen_id, cantidad } = req.body;

    const [pedido] = await pool.execute('SELECT id, estado, sede_id FROM pedidos WHERE id = ?', [pedido_id]);
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    if (pedido[0].estado !== 'PENDIENTE' && pedido[0].estado !== 'ESPERA_COTIZACION') {
      return res.status(400).json({ error: 'Solo se pueden agregar exámenes a pedidos en espera de cotización' });
    }

    const cant = Math.max(1, parseInt(cantidad) || 1);
    const [precio] = await pool.execute(
      `SELECT precio FROM examen_precio WHERE examen_id = ? AND (sede_id = ? OR sede_id IS NULL) AND (vigente_hasta IS NULL OR vigente_hasta >= CURDATE()) ORDER BY sede_id IS NOT NULL DESC LIMIT 1`,
      [examen_id, pedido[0].sede_id]
    );
    const precio_base = precio.length > 0 ? Number(precio[0].precio) : 0;

    await pool.execute(
      'INSERT INTO pedido_examenes (pedido_id, examen_id, cantidad, precio_base) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE cantidad = cantidad + ?, precio_base = ?',
      [pedido_id, examen_id, cant, precio_base, cant, precio_base]
    );

    res.json({ message: 'Examen agregado' });
  } catch (error) {
    console.error('Error al agregar examen:', error);
    res.status(500).json({ error: 'Error al agregar examen' });
  }
};

const marcarListoParaCotizacion = async (req, res) => {
  try {
    const { pedido_id } = req.params;

    const [pedido] = await pool.execute('SELECT id, estado FROM pedidos WHERE id = ?', [pedido_id]);
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    if (pedido[0].estado !== 'PENDIENTE' && pedido[0].estado !== 'ESPERA_COTIZACION') {
      return res.status(400).json({ error: 'Solo pedidos a la espera de cotización pueden marcarse listos' });
    }

    const [tieneExamenes] = await pool.execute('SELECT 1 FROM pedido_examenes WHERE pedido_id = ? LIMIT 1', [pedido_id]);
    if (tieneExamenes.length === 0) {
      return res.status(400).json({ error: 'El pedido debe tener al menos un examen' });
    }

    await pool.execute("UPDATE pedidos SET estado = 'LISTO_PARA_COTIZACION' WHERE id = ?", [pedido_id]);
    await pool.execute(
      `INSERT INTO historial_pedido (pedido_id, tipo_evento, descripcion, usuario_id) VALUES (?, 'CREACION', 'Marcado listo para cotización', ?)`,
      [pedido_id, req.user.id]
    );

    const [updated] = await pool.execute('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
    res.json({ message: 'Pedido listo para cotización', pedido: updated[0] });
  } catch (error) {
    console.error('Error al marcar listo para cotización:', error);
    res.status(500).json({ error: 'Error al marcar listo para cotización' });
  }
};

const obtenerHistorial = async (req, res) => {
  try {
    const { pedido_id } = req.params;

    const [historial] = await pool.execute(
      `SELECT h.*, u.nombre_completo AS usuario_nombre
       FROM historial_pedido h
       LEFT JOIN usuarios u ON h.usuario_id = u.id
       WHERE h.pedido_id = ?
       ORDER BY h.created_at ASC`,
      [pedido_id]
    );

    res.json({ historial });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

/** GET /api/pedidos/:pedido_id/estado — Devuelve solo el estado del pedido (tabla pedidos). */
const obtenerEstadoPedido = async (req, res) => {
  try {
    const { pedido_id } = req.params;
    const [rows] = await pool.execute(
      'SELECT estado FROM pedidos WHERE id = ?',
      [pedido_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json({ estado: rows[0].estado });
  } catch (error) {
    console.error('Error al obtener estado del pedido:', error);
    res.status(500).json({ error: 'Error al obtener estado' });
  }
};

const ESTADOS_PEDIDO = ['PENDIENTE', 'ESPERA_COTIZACION', 'LISTO_PARA_COTIZACION', 'FALTA_APROBAR_COTIZACION', 'COTIZACION_APROBADA', 'FALTA_PAGO_FACTURA', 'COTIZACION_RECHAZADA', 'FACTURADO', 'COMPLETADO', 'CANCELADO'];

/** PATCH /api/pedidos/:pedido_id/estado — Actualiza solo el estado del pedido. */
const actualizarEstadoPedido = async (req, res) => {
  try {
    const { pedido_id } = req.params;
    const { estado } = req.body;
    if (!estado || typeof estado !== 'string') {
      return res.status(400).json({ error: 'estado es requerido' });
    }
    const estadoUpper = estado.toUpperCase();
    if (!ESTADOS_PEDIDO.includes(estadoUpper)) {
      return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS_PEDIDO.join(', ')}` });
    }
    const [result] = await pool.execute(
      'UPDATE pedidos SET estado = ? WHERE id = ?',
      [estadoUpper, pedido_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const [rows] = await pool.execute('SELECT id, estado FROM pedidos WHERE id = ?', [pedido_id]);
    res.json({ message: 'Estado actualizado', pedido: rows[0] });
  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
};

/** Todas las cotizaciones del pedido (por pedido_id). */
const obtenerCotizacionesDelPedido = async (req, res) => {
  try {
    const { pedido_id } = req.params;
    const [pedido] = await pool.execute('SELECT id FROM pedidos WHERE id = ?', [pedido_id]);
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const [cotizaciones] = await pool.execute(
      `SELECT c.*, p.numero_pedido, e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc
       FROM cotizaciones c
       JOIN pedidos p ON c.pedido_id = p.id
       JOIN empresas e ON p.empresa_id = e.id
       WHERE c.pedido_id = ?
       ORDER BY c.es_complementaria ASC, c.fecha DESC, c.id ASC`,
      [pedido_id]
    );
    res.json({ cotizaciones: sanitizeForJson(cotizaciones) });
  } catch (error) {
    console.error('Error al obtener cotizaciones del pedido:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones del pedido' });
  }
};

/** Todas las facturas del pedido (por pedido_id). */
const obtenerFacturasDelPedido = async (req, res) => {
  try {
    const { pedido_id } = req.params;
    const [pedido] = await pool.execute('SELECT id FROM pedidos WHERE id = ?', [pedido_id]);
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const [facturas] = await pool.execute(
      `SELECT f.*, p.numero_pedido, e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc
       FROM facturas f
       JOIN pedidos p ON f.pedido_id = p.id
       JOIN empresas e ON p.empresa_id = e.id
       WHERE f.pedido_id = ?
       ORDER BY f.fecha_emision DESC`,
      [pedido_id]
    );
    res.json({ facturas: sanitizeForJson(facturas) });
  } catch (error) {
    console.error('Error al obtener facturas del pedido:', error);
    res.status(500).json({ error: 'Error al obtener facturas del pedido' });
  }
};

/** GET /api/pedidos/:pedido_id/pacientes-completados — Pacientes del pedido que ya completaron todos sus exámenes (paciente_examen_completado). */
const obtenerPacientesCompletados = async (req, res) => {
  try {
    const pedidoId = parseInt(String(req.params.pedido_id || ''), 10);
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      return res.status(400).json({ error: 'pedido_id inválido' });
    }
    const [pedido] = await pool.execute('SELECT id, numero_pedido FROM pedidos WHERE id = ?', [pedidoId]);
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const [pacientes] = await pool.execute(
      `SELECT pp.id, pp.dni, pp.nombre_completo, pp.cargo, pp.area,
        (SELECT COUNT(*) FROM paciente_examen_asignado pea WHERE pea.paciente_id = pp.id) AS total_asignados,
        (SELECT COUNT(*) FROM paciente_examen_completado pec WHERE pec.paciente_id = pp.id) AS total_completados
       FROM pedido_pacientes pp
       WHERE pp.pedido_id = ?`,
      [pedidoId]
    );

    const completados = pacientes.filter((p) => Number(p.total_asignados) > 0 && Number(p.total_asignados) === Number(p.total_completados));
    const resultado = completados.map((p) => ({
      id: p.id,
      dni: p.dni,
      nombre_completo: p.nombre_completo,
      cargo: p.cargo,
      area: p.area,
      examenes_asignados: Number(p.total_asignados),
      examenes_completados: Number(p.total_completados)
    }));

    res.json({
      numero_pedido: pedido[0].numero_pedido,
      pacientes_completados: sanitizeForJson(resultado),
      total: resultado.length
    });
  } catch (error) {
    console.error('Error al obtener pacientes completados:', error);
    res.status(500).json({ error: 'Error al obtener pacientes completados' });
  }
};

const cargarEmpleados = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { pedido_id } = req.params;
    const { empleados } = req.body;
    const usuario_id = req.user.id;

    const [pedido] = await connection.execute('SELECT id, estado FROM pedidos WHERE id = ?', [pedido_id]);
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    if (pedido[0].estado !== 'COTIZACION_APROBADA') {
      return res.status(400).json({ error: 'El pedido debe tener cotización aprobada para cargar empleados' });
    }

    const [examenesPedido] = await connection.execute('SELECT examen_id FROM pedido_examenes WHERE pedido_id = ?', [pedido_id]);
    const examenIds = new Set(examenesPedido.map(e => e.examen_id));

    let agregados = 0;
    for (const emp of empleados || []) {
      const { dni, nombre_completo, cargo, area, examenes } = emp;
      if (!dni || !nombre_completo) continue;

      await connection.execute(
        `INSERT INTO pedido_pacientes (pedido_id, dni, nombre_completo, cargo, area) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre_completo = VALUES(nombre_completo), cargo = VALUES(cargo), area = VALUES(area)`,
        [pedido_id, dni, nombre_completo, cargo || null, area || null]
      );

      const [ex] = await connection.execute('SELECT id FROM pedido_pacientes WHERE pedido_id = ? AND dni = ?', [pedido_id, dni]);
      const pacienteId = ex.length > 0 ? ex[0].id : null;
      if (!pacienteId) continue;

      const examenesToAssign = Array.isArray(examenes) && examenes.length > 0 ? examenes : [...examenIds];
      for (const examen_id of examenesToAssign) {
        if (!examenIds.has(examen_id)) continue;
        await connection.execute(
          'INSERT IGNORE INTO paciente_examen_asignado (paciente_id, examen_id) VALUES (?, ?)',
          [pacienteId, examen_id]
        );
      }
      agregados++;
    }

    const [count] = await connection.execute('SELECT COUNT(*) AS c FROM pedido_pacientes WHERE pedido_id = ?', [pedido_id]);
    await connection.execute('UPDATE pedidos SET total_empleados = ? WHERE id = ?', [count[0].c, pedido_id]);

    await registrarHistorial(connection, pedido_id, 'CREACION', `${agregados} empleado(s) cargados`, usuario_id, null, { atendidos: agregados });
    await connection.commit();

    res.json({ message: `${agregados} empleado(s) cargados`, empleados_agregados: agregados });
  } catch (error) {
    await connection.rollback();
    console.error('Error al cargar empleados:', error);
    res.status(500).json({ error: 'Error al cargar empleados', details: error.message });
  } finally {
    connection.release();
  }
};

const marcarCompletado = async (req, res) => {
  try {
    const { pedido_id } = req.params;
    const [pedido] = await pool.execute('SELECT id, estado FROM pedidos WHERE id = ?', [pedido_id]);
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    await pool.execute("UPDATE pedidos SET estado = 'COMPLETADO' WHERE id = ?", [pedido_id]);
    const [updated] = await pool.execute('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
    res.json({ message: 'Pedido marcado como completado', pedido: updated[0] });
  } catch (error) {
    console.error('Error al marcar completado:', error);
    res.status(500).json({ error: 'Error al marcar completado' });
  }
};

const obtenerArticulosPendientes = async (req, res) => {
  res.json({ articulos: [] });
};

const cancelarPedido = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { pedido_id } = req.params;
    const [pedido] = await connection.execute('SELECT id, estado, empresa_id FROM pedidos WHERE id = ?', [pedido_id]);
    if (pedido.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    if (req.user.rol === 'cliente') {
      const [empresas] = await connection.execute(
        'SELECT empresa_id FROM usuario_empresa WHERE usuario_id = ?',
        [req.user.id]
      );
      const ids = empresas.map((e) => e.empresa_id);
      if (!ids.includes(pedido[0].empresa_id)) {
        connection.release();
        return res.status(403).json({ error: 'No puede cancelar este pedido' });
      }
    }

    await connection.beginTransaction();

    // 1. Quitar referencias del pedido para poder borrar facturas y cotizaciones
    await connection.execute(
      'UPDATE pedidos SET cotizacion_principal_id = NULL, factura_id = NULL WHERE id = ?',
      [pedido_id]
    );

    // 2. Borrar todas las facturas del pedido (FK pedido_id es RESTRICT: hay que borrar antes que el pedido)
    const [facturas] = await connection.execute('SELECT id FROM facturas WHERE pedido_id = ?', [pedido_id]);
    const facturaIds = facturas.map((f) => f.id);
    if (facturaIds.length > 0) {
      const placeholders = facturaIds.map(() => '?').join(',');
      await connection.execute(`DELETE FROM factura_detalle WHERE factura_id IN (${placeholders})`, facturaIds);
      await connection.execute(`DELETE FROM factura_cotizacion WHERE factura_id IN (${placeholders})`, facturaIds);
      await connection.execute('DELETE FROM facturas WHERE pedido_id = ?', [pedido_id]);
    }

    // 3. Borrar historial del pedido
    await connection.execute('DELETE FROM historial_pedido WHERE pedido_id = ?', [pedido_id]);

    // 4. Borrar todas las cotizaciones del pedido (cotizacion_items se borran por CASCADE)
    await connection.execute('UPDATE cotizaciones SET cotizacion_base_id = NULL WHERE pedido_id = ?', [pedido_id]);
    await connection.execute('DELETE FROM cotizaciones WHERE pedido_id = ?', [pedido_id]);

    // 5. Borrar el pedido (CASCADE: pedido_examenes, pedido_pacientes, paciente_examen_*)
    await connection.execute('DELETE FROM pedidos WHERE id = ?', [pedido_id]);

    await connection.commit();
    res.json({ message: 'Pedido cancelado y eliminado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al cancelar pedido:', error);
    res.status(500).json({ error: 'Error al cancelar pedido' });
  } finally {
    connection.release();
  }
};

module.exports = {
  listarPedidos,
  listarMisPedidos,
  listarPedidosConCotizacionAprobada,
  obtenerPedido,
  obtenerPacientesExamenes,
  obtenerCotizacionesDelPedido,
  obtenerFacturasDelPedido,
  obtenerPacientesCompletados,
  crearPedido,
  agregarExamen,
  marcarListoParaCotizacion,
  obtenerHistorial,
  obtenerEstadoPedido,
  actualizarEstadoPedido,
  cargarEmpleados,
  marcarCompletado,
  cancelarPedido,
  obtenerArticulosPendientes
};
