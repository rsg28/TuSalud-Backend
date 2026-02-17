const pool = require('../config/database');

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
    const { estado, empresa_id, vendedor_id, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

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
    }
    if (empresa_id) {
      query += ' AND p.empresa_id = ?';
      params.push(empresa_id);
    }
    if (vendedor_id) {
      query += ' AND p.vendedor_id = ?';
      params.push(vendedor_id);
    }

    if (req.user.rol === 'vendedor') {
      query += ' AND p.vendedor_id = ?';
      params.push(req.user.id);
    }
    if (req.user.rol === 'cliente') {
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

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [pedidos] = await pool.execute(query, params);
    res.json({ pedidos, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    res.status(500).json({
      error: 'Error al listar pedidos',
      message: error.message,
    });
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
      'SELECT id, numero_cotizacion, estado, es_complementaria, total, fecha FROM cotizaciones WHERE pedido_id = ? ORDER BY es_complementaria ASC, id ASC',
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

    res.json({
      ...pedido,
      examenes,
      cotizaciones,
      factura,
      pacientes,
      historial
    });
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
};

const crearPedido = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { empresa_id, sede_id, cliente_usuario_id, observaciones, condiciones_pago, fecha_vencimiento, examenes } = req.body;
    const vendedor_id = req.user ? req.user.id : null;

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

    const [result] = await connection.execute(
      `INSERT INTO pedidos (numero_pedido, empresa_id, sede_id, vendedor_id, cliente_usuario_id, estado, total_empleados, observaciones, condiciones_pago, fecha_vencimiento)
       VALUES (?, ?, ?, ?, ?, 'PENDIENTE', 0, ?, ?, ?)`,
      [numero_pedido, empresa_id, sede_id, vendedor_id, cliente_usuario_id || null, observaciones || null, condiciones_pago || null, fecha_vencimiento || null]
    );
    const pedido_id = result.insertId;

    let total_empleados = 0;
    if (examenes && Array.isArray(examenes) && examenes.length > 0) {
      for (const item of examenes) {
        const examen_id = item.examen_id;
        const cantidad = Math.max(1, parseInt(item.cantidad) || 1);

        const [precio] = await connection.execute(
          `SELECT precio FROM examen_precio WHERE examen_id = ? AND (sede_id = ? OR sede_id IS NULL) AND (vigente_hasta IS NULL OR vigente_hasta >= CURDATE()) ORDER BY sede_id IS NOT NULL DESC LIMIT 1`,
          [examen_id, sede_id]
        );
        const precio_base = precio.length > 0 ? Number(precio[0].precio) : 0;

        await connection.execute(
          'INSERT INTO pedido_examenes (pedido_id, examen_id, cantidad, precio_base) VALUES (?, ?, ?, ?)',
          [pedido_id, examen_id, cantidad, precio_base]
        );
        total_empleados += cantidad;
      }
      await connection.execute('UPDATE pedidos SET total_empleados = ? WHERE id = ?', [total_empleados, pedido_id]);
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
    if (pedido[0].estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Solo se pueden agregar exámenes a pedidos en estado PENDIENTE' });
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

    const [totales] = await pool.execute('SELECT COALESCE(SUM(cantidad), 0) AS t FROM pedido_examenes WHERE pedido_id = ?', [pedido_id]);
    await pool.execute('UPDATE pedidos SET total_empleados = ? WHERE id = ?', [totales[0].t, pedido_id]);

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
    if (pedido[0].estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Solo pedidos en PENDIENTE pueden marcarse listos para cotización' });
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

module.exports = {
  listarPedidos,
  obtenerPedido,
  crearPedido,
  agregarExamen,
  marcarListoParaCotizacion,
  obtenerHistorial,
  cargarEmpleados,
  marcarCompletado,
  obtenerArticulosPendientes
};
