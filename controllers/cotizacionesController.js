const pool = require('../config/database');
const { validationResult } = require('express-validator');
const {
  helpers: {
    emitirNotificacionAClientesDeEmpresa,
    emitirNotificacionAVendedorDePedido,
  },
} = require('./notificacionesController');

// Estados válidos de cotización. El manager solo aprueba (APROBADA_POR_MANAGER), no rechaza.
const ESTADOS_COTIZACION = ['BORRADOR', 'ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER', 'APROBADA_POR_MANAGER', 'APROBADA', 'RECHAZADA'];

// Items HÍBRIDOS:
//   tipo_item = 'EXAMEN' → fila con examen_id (perfil_id/tipo_emo NULL).
//   tipo_item = 'PERFIL' → fila con perfil_id + tipo_emo (examen_id NULL),
//                          cantidad = nº de pacientes que recibirán ese perfil.
// Detecta el tipo automáticamente según qué campo viene en el body para
// mantener BC con clientes que sólo mandan examen_id.
const TIPOS_EMO_VALIDOS = new Set(['PREOC', 'ANUAL', 'RETIRO', 'VISITA']);
function normalizeItem(it) {
  const explicito = typeof it.tipo_item === 'string' ? it.tipo_item.toUpperCase() : null;
  const tipo_item = explicito || (it.perfil_id ? 'PERFIL' : 'EXAMEN');
  const cantidad = Math.max(1, Number(it.cantidad) || 1);
  const precio_base = Number(it.precio_base ?? it.precio_final ?? 0) || 0;
  const precio_final = Number(it.precio_final ?? precio_base) || 0;
  const variacion_pct = precio_base !== 0 ? ((precio_final - precio_base) / precio_base) * 100 : 0;
  const subtotal = precio_final * cantidad;

  if (tipo_item === 'PERFIL') {
    if (!it.perfil_id) throw new Error('Item PERFIL requiere perfil_id');
    const tipo_emo = it.tipo_emo ? String(it.tipo_emo).toUpperCase() : null;
    if (!tipo_emo || !TIPOS_EMO_VALIDOS.has(tipo_emo)) {
      throw new Error('Item PERFIL requiere tipo_emo (PREOC|ANUAL|RETIRO|VISITA)');
    }
    return {
      tipo_item: 'PERFIL',
      perfil_id: Number(it.perfil_id),
      tipo_emo,
      examen_id: null,
      nombre: it.nombre || 'Perfil',
      cantidad, precio_base, precio_final, variacion_pct, subtotal,
    };
  }

  if (!it.examen_id) throw new Error('Item EXAMEN requiere examen_id');
  return {
    tipo_item: 'EXAMEN',
    perfil_id: null,
    tipo_emo: null,
    examen_id: Number(it.examen_id),
    nombre: it.nombre || 'Examen',
    cantidad, precio_base, precio_final, variacion_pct, subtotal,
  };
}

// SELECT estándar de cotizacion_items (resuelve nombre desde catálogo si falta).
const SELECT_ITEMS_SQL = `
  SELECT ci.id, ci.cotizacion_id, ci.tipo_item, ci.perfil_id, ci.tipo_emo, ci.examen_id,
         ci.nombre, ci.cantidad, ci.precio_base, ci.precio_final, ci.variacion_pct, ci.subtotal,
         ex.nombre AS examen_nombre,
         pf.nombre AS perfil_nombre
  FROM cotizacion_items ci
  LEFT JOIN examenes ex   ON ci.examen_id = ex.id
  LEFT JOIN emo_perfiles pf ON ci.perfil_id = pf.id
  WHERE ci.cotizacion_id = ?
  ORDER BY ci.id
`;

const generarNumeroCotizacion = async () => {
  const [rows] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM cotizaciones');
  const year = new Date().getFullYear();
  return `COT-${year}-${String(rows[0].nextId).padStart(6, '0')}`;
};

const generarNumeroCotizacionComplementaria = async () => {
  const [rows] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM cotizaciones');
  const year = new Date().getFullYear();
  return `COT-COMP-${year}-${String(rows[0].nextId).padStart(6, '0')}`;
};

/** Crea una cotización complementaria usando la conexión dada (sin commit). Usado por solicitudes aprobadas o por POST /complementarias. */
const crearCotizacionComplementariaConConnection = async (connection, opts) => {
  const { pedido_id, cotizacion_base_id, items, creador_id, creador_tipo } = opts;
  if (!pedido_id || !cotizacion_base_id || !items || !Array.isArray(items) || items.length === 0) {
    throw new Error('pedido_id, cotizacion_base_id e items (array no vacío) son requeridos');
  }
  const tipo = (creador_tipo === 'CLIENTE' ? 'CLIENTE' : 'VENDEDOR');
  const numero_cotizacion = await generarNumeroCotizacionComplementaria();
  const itemsNorm = items.map(normalizeItem);
  const total = itemsNorm.reduce((acc, it) => acc + it.subtotal, 0);
  const [result] = await connection.execute(
    `INSERT INTO cotizaciones (
      numero_cotizacion, pedido_id, cotizacion_base_id, es_complementaria,
      estado, creador_tipo, creador_id, total
    ) VALUES (?, ?, ?, 1, 'BORRADOR', ?, ?, ?)`,
    [numero_cotizacion, pedido_id, cotizacion_base_id, tipo, creador_id ?? null, total]
  );
  const cotizacionId = result.insertId;
  for (const it of itemsNorm) {
    await connection.execute(
      `INSERT INTO cotizacion_items (
        cotizacion_id, tipo_item, perfil_id, tipo_emo, examen_id,
        nombre, cantidad, precio_base, precio_final, variacion_pct, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cotizacionId,
        it.tipo_item, it.perfil_id, it.tipo_emo, it.examen_id,
        it.nombre, it.cantidad, it.precio_base, it.precio_final, it.variacion_pct, it.subtotal,
      ]
    );
  }
  return { cotizacionId, numero_cotizacion };
};

const getAllCotizaciones = async (req, res) => {
  try {
    const { pedido_id, user_id, estado, empresa_id } = req.query;
    const rol = req.user?.rol;
    const userId = req.user?.id;

    let query = `
      SELECT c.*,
        p.numero_pedido, p.empresa_id,
        e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc
      FROM cotizaciones c
      JOIN pedidos p ON c.pedido_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      WHERE 1=1
    `;
    const params = [];

    // Filtro por rol: vendedor, manager o cliente solo ven lo que les corresponde
    if (rol === 'vendedor') {
      query += " AND NOT (c.creador_tipo = 'CLIENTE' AND c.estado = 'BORRADOR')";
    } else if (rol === 'manager') {
      query += " AND c.estado = 'ENVIADA_AL_MANAGER'";
    } else if (rol === 'cliente' && userId) {
      query += ` AND (
        p.cliente_usuario_id = ? OR p.empresa_id = (SELECT empresa_id FROM usuarios WHERE id = ?)
      ) AND (
        (c.creador_tipo = 'CLIENTE' AND c.creador_id = ?) OR (c.creador_tipo = 'VENDEDOR' AND c.estado != 'BORRADOR')
      )`;
      params.push(userId, userId, userId);
    } else {
      query += ' AND 1=0';
    }

    if (pedido_id) {
      query += ' AND c.pedido_id = ?';
      params.push(pedido_id);
    }
    if (user_id) {
      query += ' AND c.creador_id = ?';
      params.push(user_id);
    }
    if (estado) {
      query += ' AND c.estado = ?';
      params.push(estado);
    }
    if (empresa_id) {
      query += ' AND p.empresa_id = ?';
      params.push(empresa_id);
    }

    query += ' ORDER BY c.fecha DESC, c.created_at DESC';
    const [cotizaciones] = await pool.execute(query, params);
    res.json({ cotizaciones });
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
};

/** GET /api/cotizaciones/enviadas-al-manager — Solo manager. Lista cotizaciones ENVIADA_AL_MANAGER y APROBADA_POR_MANAGER. */
const getCotizacionesEnviadasAlManager = async (req, res) => {
  try {
    const [cotizaciones] = await pool.execute(
      `SELECT c.*,
        p.numero_pedido, p.empresa_id,
        e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc
       FROM cotizaciones c
       JOIN pedidos p ON c.pedido_id = p.id
       JOIN empresas e ON p.empresa_id = e.id
       WHERE c.estado IN ('ENVIADA_AL_MANAGER', 'APROBADA_POR_MANAGER')
       ORDER BY c.fecha DESC, c.created_at DESC`,
      []
    );
    res.json({ cotizaciones });
  } catch (error) {
    console.error('Error al obtener cotizaciones enviadas al manager:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
};

const getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const rol = req.user?.rol;

    const [cotizaciones] = await pool.execute(
      `SELECT c.*, p.numero_pedido, p.empresa_id, p.cliente_usuario_id,
        e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc,
        u.nombre_completo AS creador_nombre
       FROM cotizaciones c
       JOIN pedidos p ON c.pedido_id = p.id
       JOIN empresas e ON p.empresa_id = e.id
       LEFT JOIN usuarios u ON c.creador_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (cotizaciones.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Cliente solo puede ver cotizaciones de pedidos que le pertenecen
    if (rol === 'cliente' && userId) {
      const cot = cotizaciones[0];
      const [autorizado] = await pool.execute(
        `SELECT 1 FROM pedidos p
         WHERE p.id = ? AND (
           p.cliente_usuario_id = ? OR
           p.empresa_id = (SELECT empresa_id FROM usuarios WHERE id = ?)
         )`,
        [cot.pedido_id, userId, userId]
      );
      if (autorizado.length === 0) {
        return res.status(403).json({ error: 'No tiene permiso para ver esta cotización' });
      }
    }

    const [items] = await pool.execute(SELECT_ITEMS_SQL, [id]);

    res.json({
      cotizacion: cotizaciones[0],
      items
    });
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};

/** GET /api/cotizaciones/:id/items — Devuelve solo los ítems de una cotización. */
const getCotizacionItems = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const rol = req.user?.rol;

    const [existe] = await pool.execute(
      'SELECT id, pedido_id FROM cotizaciones WHERE id = ?',
      [id]
    );
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Cliente solo puede ver ítems de cotizaciones de sus pedidos
    if (rol === 'cliente' && userId) {
      const [autorizado] = await pool.execute(
        `SELECT 1 FROM pedidos p
         WHERE p.id = ? AND (
           p.cliente_usuario_id = ? OR
           p.empresa_id = (SELECT empresa_id FROM usuarios WHERE id = ?)
         )`,
        [existe[0].pedido_id, userId, userId]
      );
      if (autorizado.length === 0) {
        return res.status(403).json({ error: 'No tiene permiso para ver esta cotización' });
      }
    }

    const [items] = await pool.execute(SELECT_ITEMS_SQL, [id]);
    res.json({ items });
  } catch (error) {
    console.error('Error al obtener ítems de cotización:', error);
    res.status(500).json({ error: 'Error al obtener ítems' });
  }
};

const createCotizacion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      pedido_id,
      cotizacion_base_id,
      es_complementaria,
      creador_tipo,
      items
    } = req.body;

    if (!pedido_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'pedido_id e items (array) son requeridos' });
    }

    const [pedido] = await pool.execute(
      'SELECT id, empresa_id FROM pedidos WHERE id = ?',
      [pedido_id]
    );
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const numero_cotizacion = await generarNumeroCotizacion();
      const itemsNorm = items.map(normalizeItem);
      const total = itemsNorm.reduce((acc, it) => acc + it.subtotal, 0);

      const [result] = await connection.execute(
        `INSERT INTO cotizaciones (
          numero_cotizacion, pedido_id, cotizacion_base_id, es_complementaria,
          estado, creador_tipo, creador_id, total
        ) VALUES (?, ?, ?, ?, 'BORRADOR', ?, ?, ?)`,
        [
          numero_cotizacion,
          pedido_id,
          cotizacion_base_id || null,
          es_complementaria ? 1 : 0,
          creador_tipo || 'VENDEDOR',
          req.user ? req.user.id : null,
          total
        ]
      );

      const cotizacionId = result.insertId;

      for (const it of itemsNorm) {
        await connection.execute(
          `INSERT INTO cotizacion_items (
            cotizacion_id, tipo_item, perfil_id, tipo_emo, examen_id,
            nombre, cantidad, precio_base, precio_final, variacion_pct, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cotizacionId,
            it.tipo_item, it.perfil_id, it.tipo_emo, it.examen_id,
            it.nombre, it.cantidad, it.precio_base, it.precio_final, it.variacion_pct, it.subtotal,
          ]
        );
      }

      await connection.commit();

      const [newCot] = await pool.execute(
        'SELECT * FROM cotizaciones WHERE id = ?',
        [cotizacionId]
      );

      // Notificar a los clientes de la empresa del pedido (best-effort, no rompe la respuesta).
      try {
        const empresaIdPedido = pedido[0].empresa_id;
        const conn2 = await pool.getConnection();
        try {
          await emitirNotificacionAClientesDeEmpresa(conn2, {
            empresaId: empresaIdPedido,
            tipo: 'COTIZACION_CREADA',
            titulo: `Nueva cotización ${numero_cotizacion}`,
            mensaje:
              `Se creó la cotización ${numero_cotizacion} para tu empresa con ` +
              `${itemsNorm.length} ítem(s) por un total de S/ ${Number(total).toFixed(2)}.`,
            contextoJson: {
              cotizacion_id: cotizacionId,
              numero_cotizacion,
              pedido_id,
              total: Number(total),
              n_items: itemsNorm.length,
            },
            remitenteUsuarioId: req.user ? req.user.id : null,
          });
        } finally {
          conn2.release();
        }
      } catch (notifErr) {
        console.warn('No se pudo emitir notificación de cotización creada:', notifErr?.message);
      }

      res.status(201).json({
        message: 'Cotización creada exitosamente',
        cotizacion: newCot[0]
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear cotización:', error);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
};

/** POST /api/cotizaciones/complementarias — Crea una cotización complementaria (vendedor/manager). Body: { pedido_id, cotizacion_base_id?, items }. */
const createCotizacionComplementaria = async (req, res) => {
  try {
    const { pedido_id, cotizacion_base_id, items } = req.body;
    if (!pedido_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'pedido_id e items (array no vacío) son requeridos' });
    }
    const [pedidoRows] = await pool.execute(
      'SELECT id, cotizacion_principal_id, empresa_id, cliente_usuario_id, vendedor_id FROM pedidos WHERE id = ?',
      [pedido_id]
    );
    if (pedidoRows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const pedido = pedidoRows[0];
    const baseId = cotizacion_base_id != null ? Number(cotizacion_base_id) : (pedido.cotizacion_principal_id != null ? Number(pedido.cotizacion_principal_id) : null);
    if (baseId == null) {
      return res.status(400).json({ error: 'El pedido no tiene cotización principal. Indique cotizacion_base_id o use un pedido con cotización aprobada.' });
    }
    const [baseCot] = await pool.execute('SELECT id, pedido_id FROM cotizaciones WHERE id = ? AND pedido_id = ?', [baseId, pedido_id]);
    if (baseCot.length === 0) {
      return res.status(400).json({ error: 'Cotización base no encontrada o no pertenece al pedido' });
    }
    const rol = req.user?.rol;
    const userId = req.user?.id;
    if (rol !== 'vendedor' && rol !== 'manager' && rol !== 'cliente') {
      return res.status(403).json({ error: 'Solo vendedor, manager o cliente pueden crear cotizaciones complementarias' });
    }
    if (rol === 'cliente' && Number(pedido.cliente_usuario_id) !== Number(userId)) {
      return res.status(403).json({ error: 'Solo puede crear cotizaciones complementarias para sus propios pedidos' });
    }
    const creadorTipo = rol === 'cliente' ? 'CLIENTE' : 'VENDEDOR';
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const { cotizacionId, numero_cotizacion } = await crearCotizacionComplementariaConConnection(connection, {
        pedido_id,
        cotizacion_base_id: baseId,
        items,
        creador_id: userId,
        creador_tipo: creadorTipo,
      });
      await connection.commit();
      const [newCot] = await pool.execute('SELECT * FROM cotizaciones WHERE id = ?', [cotizacionId]);
      res.status(201).json({
        message: 'Cotización complementaria creada',
        cotizacion: newCot[0],
        numero_cotizacion,
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear cotización complementaria:', error);
    res.status(500).json({ error: error.message || 'Error al crear cotización complementaria' });
  }
};

const updateCotizacion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { estado, solicitud_manager_pendiente, mensaje_rechazo, notas_manager, items } = req.body;

    const [existing] = await pool.execute(
      'SELECT id, estado, pedido_id, es_complementaria, creador_tipo FROM cotizaciones WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    if (existing[0].estado === 'APROBADA') {
      return res.status(403).json({ error: 'No se pueden modificar cotizaciones ya aprobadas.' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      if (estado !== undefined) {
        if (!ESTADOS_COTIZACION.includes(estado)) {
          throw new Error(`estado debe ser uno de: ${ESTADOS_COTIZACION.join(', ')}`);
        }
        const esEnviada = ['ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER'].includes(estado);
        const esAprobada = estado === 'APROBADA' || estado === 'APROBADA_POR_MANAGER';
        if (notas_manager !== undefined && (estado === 'APROBADA_POR_MANAGER' || estado === 'APROBADA')) {
          await connection.execute(
            'UPDATE cotizaciones SET estado = ?, fecha_envio = IF(?, NOW(), fecha_envio), fecha_aprobacion = IF(?, NOW(), fecha_aprobacion), solicitud_manager_pendiente = COALESCE(?, solicitud_manager_pendiente), mensaje_rechazo = COALESCE(?, mensaje_rechazo), notas_manager = COALESCE(?, notas_manager) WHERE id = ?',
            [
              estado,
              esEnviada,
              esAprobada,
              solicitud_manager_pendiente !== undefined ? (solicitud_manager_pendiente ? 1 : 0) : null,
              mensaje_rechazo !== undefined ? mensaje_rechazo : null,
              typeof notas_manager === 'string' ? notas_manager : null,
              id
            ]
          );
        } else {
          const incluirNotasManager = estado === 'ENVIADA_AL_MANAGER' && notas_manager !== undefined;
          const sql = incluirNotasManager
            ? 'UPDATE cotizaciones SET estado = ?, fecha_envio = IF(?, NOW(), fecha_envio), fecha_aprobacion = IF(?, NOW(), fecha_aprobacion), solicitud_manager_pendiente = COALESCE(?, solicitud_manager_pendiente), mensaje_rechazo = COALESCE(?, mensaje_rechazo), notas_manager = COALESCE(?, notas_manager) WHERE id = ?'
            : 'UPDATE cotizaciones SET estado = ?, fecha_envio = IF(?, NOW(), fecha_envio), fecha_aprobacion = IF(?, NOW(), fecha_aprobacion), solicitud_manager_pendiente = COALESCE(?, solicitud_manager_pendiente), mensaje_rechazo = COALESCE(?, mensaje_rechazo) WHERE id = ?';
          const args = [
            estado,
            esEnviada,
            esAprobada,
            solicitud_manager_pendiente !== undefined ? (solicitud_manager_pendiente ? 1 : 0) : null,
            mensaje_rechazo !== undefined ? mensaje_rechazo : null,
            ...(incluirNotasManager ? [typeof notas_manager === 'string' ? notas_manager : null] : []),
            id
          ];
          await connection.execute(sql, args);
        }
        const pedido_id = existing[0].pedido_id;
        const es_complementaria = existing[0].es_complementaria;
        const estadosEnviada = ['ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER'];
        if (estadosEnviada.includes(estado)) {
          await connection.execute(
            "UPDATE pedidos SET estado = 'FALTA_APROBAR_COTIZACION' WHERE id = ?",
            [pedido_id]
          );
          if (estado === 'ENVIADA_AL_MANAGER') {
            await connection.execute(
              `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
               VALUES (?, ?, 'COTIZACION_ENVIADA', 'Cotización enviada al manager para revisión.', ?, ?, NULL, NULL, NULL, NULL)`,
              [pedido_id, id, req.user?.id || null, req.user?.nombre_completo || null]
            );
          } else if (estado === 'ENVIADA_AL_CLIENTE') {
            await connection.execute(
              `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
               VALUES (?, ?, 'COTIZACION_ENVIADA', 'Cotización enviada al cliente para aprobación.', ?, ?, NULL, NULL, NULL, NULL)`,
              [pedido_id, id, req.user?.id || null, req.user?.nombre_completo || null]
            );
          }
        } else if (estado === 'APROBADA' && !es_complementaria) {
          await connection.execute(
            "UPDATE pedidos SET estado = 'COTIZACION_APROBADA', cotizacion_principal_id = ? WHERE id = ?",
            [id, pedido_id]
          );
        } else if (estado === 'APROBADA_POR_MANAGER') {
          await connection.execute(
            "UPDATE pedidos SET estado = 'FALTA_APROBAR_COTIZACION' WHERE id = ?",
            [pedido_id]
          );
          await connection.execute(
            `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
             VALUES (?, ?, 'COTIZACION_APROBADA', 'El manager aprobó la cotización. Lista para enviar al cliente.', ?, ?, NULL, NULL, NULL, NULL)`,
            [pedido_id, id, req.user?.id || null, req.user?.nombre_completo || null]
          );
        } else if (estado === 'RECHAZADA' && !es_complementaria) {
          await connection.execute(
            "UPDATE pedidos SET estado = 'COTIZACION_RECHAZADA' WHERE id = ?",
            [pedido_id]
          );
        }
      } else if (solicitud_manager_pendiente !== undefined || mensaje_rechazo !== undefined) {
        await connection.execute(
          'UPDATE cotizaciones SET solicitud_manager_pendiente = COALESCE(?, solicitud_manager_pendiente), mensaje_rechazo = COALESCE(?, mensaje_rechazo) WHERE id = ?',
          [
            solicitud_manager_pendiente !== undefined ? (solicitud_manager_pendiente ? 1 : 0) : null,
            mensaje_rechazo !== undefined ? mensaje_rechazo : null,
            id
          ]
        );
      }

      // Guardar notas del manager cuando se envían sin cambiar estado (ej. "Guardar cambios")
      if (notas_manager !== undefined && estado === undefined) {
        await connection.execute(
          'UPDATE cotizaciones SET notas_manager = ? WHERE id = ?',
          [typeof notas_manager === 'string' ? notas_manager : null, id]
        );
      }

      // Actualizar ítems en BORRADOR, ENVIADA (vendedor revisando) o ENVIADA_AL_MANAGER (manager edita y aprueba)
      const puedeActualizarItems = ['BORRADOR', 'ENVIADA', 'ENVIADA_AL_MANAGER'].includes(existing[0].estado);
      if (items && Array.isArray(items) && puedeActualizarItems) {
        await connection.execute('DELETE FROM cotizacion_items WHERE cotizacion_id = ?', [id]);
        const itemsNorm = items.map(normalizeItem);
        const total = itemsNorm.reduce((acc, it) => acc + it.subtotal, 0);
        for (const it of itemsNorm) {
          await connection.execute(
            `INSERT INTO cotizacion_items (
              cotizacion_id, tipo_item, perfil_id, tipo_emo, examen_id,
              nombre, cantidad, precio_base, precio_final, variacion_pct, subtotal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              it.tipo_item, it.perfil_id, it.tipo_emo, it.examen_id,
              it.nombre, it.cantidad, it.precio_base, it.precio_final, it.variacion_pct, it.subtotal,
            ]
          );
        }
        await connection.execute('UPDATE cotizaciones SET total = ? WHERE id = ?', [total, id]);
      }

      await connection.commit();

      const [updated] = await pool.execute('SELECT * FROM cotizaciones WHERE id = ?', [id]);
      res.json({ message: 'Cotización actualizada', cotizacion: updated[0] });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
};

/** PATCH /api/cotizaciones/:id/estado — Actualiza solo el estado (y opcionalmente mensaje_rechazo, notas_manager). */
const updateEstadoCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, mensaje_rechazo, notas_manager } = req.body;
    if (!estado || typeof estado !== 'string') {
      return res.status(400).json({ error: 'estado es requerido' });
    }
    if (!ESTADOS_COTIZACION.includes(estado)) {
      return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS_COTIZACION.join(', ')}` });
    }
    const [existing] = await pool.execute('SELECT id, estado, pedido_id, es_complementaria FROM cotizaciones WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    if (existing[0].estado === 'APROBADA') {
      return res.status(403).json({ error: 'No se pueden modificar cotizaciones ya aprobadas.' });
    }
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const esAprobada = estado === 'APROBADA' || estado === 'APROBADA_POR_MANAGER';
      const incluirNotasManager = notas_manager !== undefined && (estado === 'APROBADA_POR_MANAGER' || estado === 'APROBADA' || estado === 'ENVIADA_AL_MANAGER');
      if (incluirNotasManager) {
        await connection.execute(
          'UPDATE cotizaciones SET estado = ?, mensaje_rechazo = COALESCE(?, mensaje_rechazo), notas_manager = COALESCE(?, notas_manager), fecha_envio = IF(?, NOW(), fecha_envio), fecha_aprobacion = IF(?, NOW(), fecha_aprobacion) WHERE id = ?',
          [estado, mensaje_rechazo !== undefined ? mensaje_rechazo : null, typeof notas_manager === 'string' ? notas_manager : null, estado === 'ENVIADA_AL_MANAGER', esAprobada, id]
        );
      } else {
        await connection.execute(
          'UPDATE cotizaciones SET estado = ?, mensaje_rechazo = COALESCE(?, mensaje_rechazo), fecha_envio = IF(?, NOW(), fecha_envio), fecha_aprobacion = IF(?, NOW(), fecha_aprobacion) WHERE id = ?',
          [estado, mensaje_rechazo !== undefined ? mensaje_rechazo : null, estado === 'ENVIADA_AL_MANAGER' || estado === 'ENVIADA_AL_CLIENTE', esAprobada, id]
        );
      }
      const pedido_id = existing[0].pedido_id;
      const es_complementaria = existing[0].es_complementaria;
      const estadosEnviada = ['ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER'];
      if (estadosEnviada.includes(estado)) {
        await connection.execute(
          "UPDATE pedidos SET estado = 'FALTA_APROBAR_COTIZACION' WHERE id = ?",
          [pedido_id]
        );
        if (estado === 'ENVIADA') {
          const esDelCliente = existing[0].creador_tipo === 'CLIENTE';
          const descripcion = esDelCliente
            ? 'El cliente añadió su cotización para revisión del vendedor.'
            : 'Cotización enviada para revisión.';
          await connection.execute(
            `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
             VALUES (?, ?, 'COTIZACION_ENVIADA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
            [pedido_id, id, descripcion, req.user?.id || null, req.user?.nombre_completo || null]
          );
        } else if (estado === 'ENVIADA_AL_MANAGER') {
          await connection.execute(
            `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
             VALUES (?, ?, 'COTIZACION_ENVIADA', 'Cotización enviada al manager para revisión.', ?, ?, NULL, NULL, NULL, NULL)`,
            [pedido_id, id, req.user?.id || null, req.user?.nombre_completo || null]
          );
        } else if (estado === 'ENVIADA_AL_CLIENTE') {
          await connection.execute(
            `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
             VALUES (?, ?, 'COTIZACION_ENVIADA', 'Cotización enviada al cliente para aprobación.', ?, ?, NULL, NULL, NULL, NULL)`,
            [pedido_id, id, req.user?.id || null, req.user?.nombre_completo || null]
          );
        }
      } else if (estado === 'APROBADA_POR_MANAGER') {
        await connection.execute(
          "UPDATE pedidos SET estado = 'FALTA_APROBAR_COTIZACION' WHERE id = ?",
          [pedido_id]
        );
        await connection.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, ?, 'COTIZACION_APROBADA', 'El manager aprobó la cotización. Lista para enviar al cliente.', ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, id, req.user?.id || null, req.user?.nombre_completo || null]
        );
      } else if (estado === 'APROBADA' && !es_complementaria) {
        await connection.execute(
          "UPDATE pedidos SET estado = 'COTIZACION_APROBADA', cotizacion_principal_id = ? WHERE id = ?",
          [id, pedido_id]
        );
        await connection.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, ?, 'COTIZACION_APROBADA', 'El cliente aprobó la cotización.', ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, id, req.user?.id || null, req.user?.nombre_completo || null]
        );
      } else if (estado === 'RECHAZADA' && !es_complementaria) {
        await connection.execute(
          "UPDATE pedidos SET estado = 'COTIZACION_RECHAZADA' WHERE id = ?",
          [pedido_id]
        );
        const descRechazo = mensaje_rechazo && String(mensaje_rechazo).trim()
          ? `El cliente rechazó la cotización. Motivo: ${String(mensaje_rechazo).trim()}`
          : 'El cliente rechazó la cotización.';
        await connection.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, ?, 'COTIZACION_RECHAZADA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, id, descRechazo, req.user?.id || null, req.user?.nombre_completo || null]
        );
      }
      await connection.commit();
      const [updated] = await pool.execute('SELECT * FROM cotizaciones WHERE id = ?', [id]);

      // Emitir notificaciones según el estado nuevo. Best-effort: cualquier
      // error aquí solo se loggea, no rompe la respuesta al usuario.
      try {
        const cot = updated[0] ?? null;
        if (cot && cot.pedido_id) {
          const pedidoId = cot.pedido_id;
          const numeroCotizacion = cot.numero_cotizacion || `#${cot.id}`;
          const conn2 = await pool.getConnection();
          try {
            const [pedRows] = await conn2.execute(
              'SELECT empresa_id FROM pedidos WHERE id = ?',
              [pedidoId]
            );
            const empresaIdPedido = pedRows[0]?.empresa_id ?? null;

            if (estado === 'ENVIADA_AL_CLIENTE' && empresaIdPedido) {
              await emitirNotificacionAClientesDeEmpresa(conn2, {
                empresaId: empresaIdPedido,
                tipo: 'COTIZACION_CREADA',
                titulo: `Cotización ${numeroCotizacion} lista para tu revisión`,
                mensaje: 'El vendedor te envió una cotización para que la apruebes o rechaces.',
                contextoJson: {
                  evento: 'COTIZACION_ENVIADA_AL_CLIENTE',
                  cotizacion_id: cot.id,
                  pedido_id: pedidoId,
                  numero_cotizacion: numeroCotizacion,
                },
                remitenteUsuarioId: req.user ? req.user.id : null,
              });
            } else if (estado === 'APROBADA') {
              await emitirNotificacionAVendedorDePedido(conn2, {
                pedidoId,
                tipo: 'MENSAJE',
                titulo: `Cotización ${numeroCotizacion} aprobada por el cliente`,
                mensaje: 'El cliente aprobó la cotización. Puedes continuar con el pedido.',
                contextoJson: {
                  evento: 'COTIZACION_APROBADA',
                  cotizacion_id: cot.id,
                  pedido_id: pedidoId,
                  numero_cotizacion: numeroCotizacion,
                },
                remitenteUsuarioId: req.user ? req.user.id : null,
              });
            } else if (estado === 'RECHAZADA') {
              const motivo = mensaje_rechazo && String(mensaje_rechazo).trim()
                ? `Motivo: ${String(mensaje_rechazo).trim()}`
                : 'No se indicó motivo.';
              await emitirNotificacionAVendedorDePedido(conn2, {
                pedidoId,
                tipo: 'MENSAJE',
                titulo: `Cotización ${numeroCotizacion} rechazada por el cliente`,
                mensaje: motivo,
                contextoJson: {
                  evento: 'COTIZACION_RECHAZADA',
                  cotizacion_id: cot.id,
                  pedido_id: pedidoId,
                  numero_cotizacion: numeroCotizacion,
                  mensaje_rechazo: mensaje_rechazo || null,
                },
                remitenteUsuarioId: req.user ? req.user.id : null,
              });
            } else if (estado === 'APROBADA_POR_MANAGER') {
              await emitirNotificacionAVendedorDePedido(conn2, {
                pedidoId,
                tipo: 'MENSAJE',
                titulo: `Cotización ${numeroCotizacion} aprobada por el manager`,
                mensaje: 'El manager aprobó la cotización. Puedes enviarla al cliente.',
                contextoJson: {
                  evento: 'COTIZACION_APROBADA_POR_MANAGER',
                  cotizacion_id: cot.id,
                  pedido_id: pedidoId,
                  numero_cotizacion: numeroCotizacion,
                },
                remitenteUsuarioId: req.user ? req.user.id : null,
              });
            }
          } finally {
            conn2.release();
          }
        }
      } catch (notifErr) {
        console.warn('No se pudo emitir notificación de cambio de estado:', notifErr?.message);
      }

      res.json({ message: 'Estado actualizado', cotizacion: updated[0] });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
};

const deleteCotizacion = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const idNum = parseInt(id, 10);
    const [existing] = await connection.execute(
      'SELECT id, pedido_id, es_complementaria, numero_cotizacion FROM cotizaciones WHERE id = ?',
      [idNum]
    );
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const pedido_id = existing[0].pedido_id;
    const es_complementaria = existing[0].es_complementaria;
    const numero_cotizacion = existing[0].numero_cotizacion || `#${idNum}`;
    const usuario_id = req.user?.id ?? null;
    const usuario_nombre = req.user?.nombre_completo ?? null;

    await connection.beginTransaction();

    // Si es cotización principal (no complementaria), borrar primero todas las subsidiarias
    if (!es_complementaria) {
      const [subsidiarias] = await connection.execute(
        'SELECT id, numero_cotizacion FROM cotizaciones WHERE cotizacion_base_id = ?',
        [idNum]
      );
      for (const sub of subsidiarias) {
        await connection.execute('DELETE FROM factura_cotizacion WHERE cotizacion_id = ?', [sub.id]);
        await connection.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, ?, 'COTIZACION_ELIMINADA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, sub.id, `Cotización complementaria ${sub.numero_cotizacion || sub.id} eliminada.`, usuario_id, usuario_nombre]
        );
        await connection.execute('DELETE FROM cotizacion_items WHERE cotizacion_id = ?', [sub.id]);
        await connection.execute('DELETE FROM cotizaciones WHERE id = ?', [sub.id]);
      }
    }

    // Desvincular y borrar la cotización actual
    await connection.execute('DELETE FROM factura_cotizacion WHERE cotizacion_id = ?', [idNum]);
    await connection.execute('UPDATE pedidos SET cotizacion_principal_id = NULL WHERE cotizacion_principal_id = ?', [idNum]);
    await connection.execute(
      `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
       VALUES (?, ?, 'COTIZACION_ELIMINADA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
      [pedido_id, idNum, `Cotización ${numero_cotizacion} eliminada.`, usuario_id, usuario_nombre]
    );
    await connection.execute('DELETE FROM cotizacion_items WHERE cotizacion_id = ?', [idNum]);
    await connection.execute('DELETE FROM cotizaciones WHERE id = ?', [idNum]);

    // Si no queda ninguna cotización en el pedido, estado pasa a "A la espera de cotización"
    const [restantes] = await connection.execute('SELECT COUNT(*) AS total FROM cotizaciones WHERE pedido_id = ?', [pedido_id]);
    if (restantes[0].total === 0) {
      await connection.execute("UPDATE pedidos SET estado = 'ESPERA_COTIZACION' WHERE id = ?", [pedido_id]);
    }

    await connection.commit();
    res.json({ message: 'Cotización eliminada exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar cotización:', error);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllCotizaciones,
  getCotizacionesEnviadasAlManager,
  getCotizacionById,
  getCotizacionItems,
  createCotizacion,
  createCotizacionComplementaria,
  crearCotizacionComplementariaConConnection,
  updateCotizacion,
  updateEstadoCotizacion,
  deleteCotizacion
};
