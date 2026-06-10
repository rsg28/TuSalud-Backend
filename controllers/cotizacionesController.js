const pool = require('../config/database');
const { validationResult } = require('express-validator');
const {
  helpers: {
    emitirNotificacionAClientesDeEmpresa,
    emitirNotificacionAVendedorDePedido,
  },
} = require('./notificacionesController');
const {
  buildPerfilSnapshot,
  mergeNombresClienteEnPerfilSnapshot,
  enrichCotizacionItemsSnapshots,
} = require('../utils/perfilSnapshot');
const {
  aplicarSolicitudAgregarAlPedido,
  marcarSolicitudPorComplementaria,
} = require('../services/solicitudAgregarPedido');

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

  /** Snapshot JSON enviado por el cliente (p. ej. import protocolo); tiene prioridad si viene completo. */
  let examenes_snapshot_json = null;
  if (it.examenes_snapshot_json != null && it.examenes_snapshot_json !== '') {
    examenes_snapshot_json =
      typeof it.examenes_snapshot_json === 'string'
        ? it.examenes_snapshot_json
        : JSON.stringify(it.examenes_snapshot_json);
  }

  /** Texto exacto del protocolo por examen (para fusionar en snapshot de PERFIL). */
  let examenes_nombre_cliente = null;
  if (Array.isArray(it.examenes_nombre_cliente) && it.examenes_nombre_cliente.length > 0) {
    examenes_nombre_cliente = it.examenes_nombre_cliente.map((row) => ({
      examen_id: Number(row.examen_id),
      nombre_cliente:
        row.nombre_cliente != null ? String(row.nombre_cliente).trim() : '',
    })).filter((row) => Number.isFinite(row.examen_id) && row.examen_id > 0 && row.nombre_cliente);
    if (examenes_nombre_cliente.length === 0) examenes_nombre_cliente = null;
  }

  const nombre_cliente_protocolo =
    typeof it.nombre_cliente_protocolo === 'string' ? it.nombre_cliente_protocolo.trim() : '';

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
      examenes_snapshot_json,
      examenes_nombre_cliente,
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
    examenes_snapshot_json,
    nombre_cliente_protocolo,
  };
}

// SELECT estándar de cotizacion_items (resuelve nombre desde catálogo si falta).
const SELECT_ITEMS_SQL = `
  SELECT ci.id, ci.cotizacion_id, ci.tipo_item, ci.perfil_id, ci.tipo_emo, ci.examen_id,
         ci.nombre, ci.cantidad, ci.precio_base, ci.precio_final, ci.variacion_pct, ci.subtotal,
         ci.examenes_snapshot_json,
         ex.nombre AS examen_nombre,
         pf.nombre AS perfil_nombre
  FROM cotizacion_items ci
  LEFT JOIN examenes ex   ON ci.examen_id = ex.id
  LEFT JOIN emo_perfiles pf ON ci.perfil_id = pf.id
  WHERE ci.cotizacion_id = ?
  ORDER BY ci.id
`;

function snapshotExamenSueltoProtocolo(it) {
  const nc = it.nombre_cliente_protocolo;
  if (!nc) return null;
  return JSON.stringify({
    snapshot_at: new Date().toISOString(),
    origen: 'protocolo_import',
    tipo: 'EXAMEN',
    examen_id: it.examen_id,
    nombre_catalogo: it.nombre || null,
    nombre_cliente: nc,
  });
}

/**
 * Inserta una fila en cotizacion_items y congela snapshot cuando aplica:
 * - PERFIL: snapshot desde BD + opcional fusión de nombres del protocolo (cliente).
 * - EXAMEN: si viene nombre_cliente_protocolo o examenes_snapshot_json explícito.
 */
async function insertarCotizacionItem(connection, cotizacionId, it) {
  let snapshotJson = null;

  if (it.examenes_snapshot_json) {
    snapshotJson =
      typeof it.examenes_snapshot_json === 'string'
        ? it.examenes_snapshot_json
        : JSON.stringify(it.examenes_snapshot_json);
  } else if (it.tipo_item === 'PERFIL' && it.perfil_id && it.tipo_emo) {
    try {
      let snap = await buildPerfilSnapshot(connection, it.perfil_id, it.tipo_emo);
      if (snap && it.examenes_nombre_cliente && it.examenes_nombre_cliente.length) {
        snap = mergeNombresClienteEnPerfilSnapshot(snap, it.examenes_nombre_cliente);
      }
      if (snap) snapshotJson = JSON.stringify(snap);
    } catch (e) {
      console.warn('[cotizaciones] snapshot perfil falló:', e?.message || e);
    }
  } else if (it.tipo_item === 'EXAMEN') {
    const snapStr = snapshotExamenSueltoProtocolo(it);
    if (snapStr) snapshotJson = snapStr;
  }

  await connection.execute(
    `INSERT INTO cotizacion_items (
      cotizacion_id, tipo_item, perfil_id, tipo_emo, examen_id,
      nombre, cantidad, precio_base, precio_final, variacion_pct, subtotal,
      examenes_snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cotizacionId,
      it.tipo_item, it.perfil_id, it.tipo_emo, it.examen_id,
      it.nombre, it.cantidad, it.precio_base, it.precio_final, it.variacion_pct, it.subtotal,
      snapshotJson,
    ]
  );
}

const {
  siguienteNumeroCotizacion,
  siguienteNumeroCotizacionComplementaria,
} = require('../utils/numeracion');

/**
 * Numeración atómica vía tabla `serie_numeracion`. Si se invoca dentro de una
 * transacción debe pasarse la `connection`; si no, cae al pool global.
 */
const generarNumeroCotizacion = async (connection) => siguienteNumeroCotizacion(connection);
const generarNumeroCotizacionComplementaria = async (connection) =>
  siguienteNumeroCotizacionComplementaria(connection);

const {
  assertCotizacionBaseAprobada,
  obtenerCotizacionPrincipalAprobadaId,
  MSG_SIN_PRINCIPAL_APROBADA,
} = require('../utils/cotizacionPrincipal');

/** Crea una cotización complementaria usando la conexión dada (sin commit). Usado por solicitudes aprobadas o por POST /complementarias. */
const crearCotizacionComplementariaConConnection = async (connection, opts) => {
  const { pedido_id, cotizacion_base_id, items, creador_id, creador_tipo } = opts;
  if (!pedido_id || !cotizacion_base_id || !items || !Array.isArray(items) || items.length === 0) {
    throw new Error('pedido_id, cotizacion_base_id e items (array no vacío) son requeridos');
  }
  await assertCotizacionBaseAprobada(connection, pedido_id, cotizacion_base_id);
  const tipo = (creador_tipo === 'CLIENTE' ? 'CLIENTE' : 'VENDEDOR');
  const numero_cotizacion = await generarNumeroCotizacionComplementaria(connection);
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
    await insertarCotizacionItem(connection, cotizacionId, it);
  }

  const porAusencia = total < 0;
  const descHistorial = porAusencia
    ? `Cotización complementaria ${numero_cotizacion} generada por exámenes de paciente(s) ausente(s) o no realizados (monto sugerido S/ ${Math.abs(total).toFixed(2)}).`
    : `Cotización complementaria ${numero_cotizacion} creada (${itemsNorm.length} línea${itemsNorm.length === 1 ? '' : 's'}).`;
  try {
    await connection.execute(
      `INSERT INTO historial_pedido (
         pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre
       ) VALUES (?, ?, 'COTIZACION_COMPLEMENTARIA', ?, ?, NULL)`,
      [pedido_id, cotizacionId, descHistorial, creador_id ?? null]
    );
  } catch (histErr) {
    // Si la BD aún no tiene el enum ampliado, no bloqueamos la creación de la cotización.
    console.warn('[cotizaciones] historial complementaria omitido:', histErr?.message || histErr);
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

    let [items] = await pool.execute(SELECT_ITEMS_SQL, [id]);
    const [pedRow] = await pool.execute('SELECT sede_id FROM pedidos WHERE id = ?', [cotizaciones[0].pedido_id]);
    items = await enrichCotizacionItemsSnapshots(pool, items, pedRow[0]?.sede_id ?? null);

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

    let [items] = await pool.execute(SELECT_ITEMS_SQL, [id]);
    const [pedRow] = await pool.execute('SELECT sede_id FROM pedidos WHERE id = ?', [existe[0].pedido_id]);
    items = await enrichCotizacionItemsSnapshots(pool, items, pedRow[0]?.sede_id ?? null);
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
      const numero_cotizacion = await generarNumeroCotizacion(connection);
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
        await insertarCotizacionItem(connection, cotizacionId, it);
      }

      try {
        const { registrarAuditoria } = require('../utils/audit');
        await registrarAuditoria(
          req,
          {
            accion: 'CREAR_COTIZACION',
            recurso_tipo: 'COTIZACION',
            recurso_id: cotizacionId,
            descripcion: `Creó cotización ${numero_cotizacion} para pedido ${pedido_id} (S/ ${Number(total).toFixed(2)}).`,
            detalle: {
              numero_cotizacion,
              pedido_id,
              total: Number(total),
              n_items: itemsNorm.length,
              creador_tipo: creadorTipo,
            },
          },
          connection
        );
      } catch (_) { /* best-effort */ }

      await connection.commit();

      const [newCot] = await pool.execute(
        'SELECT * FROM cotizaciones WHERE id = ?',
        [cotizacionId]
      );

      // La notificación al cliente se emite al pasar a ENVIADA_AL_CLIENTE (evita duplicar avisos).

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
    const connectionCheck = await pool.getConnection();
    let baseId;
    try {
      if (cotizacion_base_id != null) {
        baseId = await assertCotizacionBaseAprobada(
          connectionCheck,
          pedido_id,
          Number(cotizacion_base_id)
        );
      } else {
        baseId = await obtenerCotizacionPrincipalAprobadaId(connectionCheck, pedido_id);
        if (!baseId) {
          connectionCheck.release();
          return res.status(409).json({ error: MSG_SIN_PRINCIPAL_APROBADA });
        }
      }
    } catch (err) {
      connectionCheck.release();
      if (err?.code === 'NO_PRINCIPAL_APROBADA') {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
    connectionCheck.release();
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
      try {
        const { registrarAuditoria } = require('../utils/audit');
        await registrarAuditoria(
          req,
          {
            accion: 'CREAR_COTIZACION_COMPLEMENTARIA',
            recurso_tipo: 'COTIZACION',
            recurso_id: cotizacionId,
            descripcion: `Creó cotización complementaria ${numero_cotizacion} para pedido ${pedido_id}.`,
            detalle: {
              numero_cotizacion,
              pedido_id,
              cotizacion_base_id: baseId,
              creador_tipo: creadorTipo,
              n_items: items.length,
            },
          },
          connection
        );
      } catch (_) { /* best-effort */ }
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

/**
 * Estados de cotización en los que YA NO se permite editar ítems ni cambiar
 * libremente el estado (la cotización quedó "cerrada"). Cualquier intento de
 * PUT con `items` o cambio de estado fuera del flujo natural se bloquea con 403.
 */
const ESTADOS_COTIZACION_BLOQUEADOS = new Set([
  'APROBADA',
  'APROBADA_POR_MANAGER', // ya pasó por manager: si vendedor edita los ítems, cambiarían los precios aprobados
  'RECHAZADA',
  'CANCELADA',
]);

const updateCotizacion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      estado,
      solicitud_manager_pendiente,
      mensaje_rechazo,
      notas_manager,
      items,
      expected_updated_at, // versionado optimista opcional (ISO/datetime)
    } = req.body;

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    let existing;

    try {
      // Lock pesimista sobre la cotización para que la verificación de estado
      // y `updated_at` sea atómica con el resto de la transacción.
      const [rows] = await connection.execute(
        `SELECT id, estado, pedido_id, es_complementaria, creador_tipo, updated_at
           FROM cotizaciones WHERE id = ? FOR UPDATE`,
        [id]
      );
      if (rows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }
      existing = rows;

      if (ESTADOS_COTIZACION_BLOQUEADOS.has(existing[0].estado)) {
        // Permitimos cambios "menores" (mensaje_rechazo, notas_manager) solo
        // si NO se intentan modificar ítems ni reabrir el estado.
        const intentaModificarEstado = estado !== undefined && estado !== existing[0].estado;
        const intentaModificarItems = Array.isArray(items);
        if (intentaModificarEstado || intentaModificarItems) {
          await connection.rollback();
          connection.release();
          return res.status(403).json({
            error: `No se puede modificar una cotización en estado ${existing[0].estado}.`,
            estado_actual: existing[0].estado,
          });
        }
      }

      // Versionado optimista: si el cliente envió `expected_updated_at` y no
      // coincide con el actual, alguien más editó la cotización entre
      // tanto. Rechazamos para que el usuario refresque.
      if (expected_updated_at) {
        const actual = existing[0].updated_at instanceof Date
          ? existing[0].updated_at.toISOString()
          : String(existing[0].updated_at);
        const esperado = new Date(expected_updated_at);
        if (!Number.isNaN(esperado.getTime())) {
          const esperadoIso = esperado.toISOString();
          // Comparación tolerante (la BD trunca a segundos en TIMESTAMP).
          const actualSec = new Date(actual).getTime();
          const esperadoSec = esperado.getTime();
          if (Math.abs(actualSec - esperadoSec) > 1500) {
            await connection.rollback();
            connection.release();
            return res.status(409).json({
              error:
                'La cotización fue modificada por otra persona mientras la editabas. Refresca para ver los cambios.',
              codigo: 'COTIZACION_DESACTUALIZADA',
              updated_at_actual: actual,
              updated_at_esperado: esperadoIso,
            });
          }
        }
      }

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
          const incluirNotasManager =
            (estado === 'ENVIADA_AL_MANAGER' || estado === 'ENVIADA_AL_CLIENTE') &&
            notas_manager !== undefined;
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
          await insertarCotizacionItem(connection, id, it);
        }
        await connection.execute('UPDATE cotizaciones SET total = ? WHERE id = ?', [total, id]);
      }

      // Auditoría dentro de la transacción: si algo falla, no queda rastro inconsistente.
      try {
        const { registrarAuditoria } = require('../utils/audit');
        await registrarAuditoria(
          req,
          {
            accion: estado ? `COTIZACION_${String(estado).toUpperCase()}` : 'COTIZACION_EDITADA',
            recurso_tipo: 'COTIZACION',
            recurso_id: id,
            descripcion: estado
              ? `Cotización ${id} cambiada a estado ${estado}.`
              : `Cotización ${id} editada (ítems o notas).`,
            detalle: {
              estado_anterior: existing[0].estado,
              estado_nuevo: estado ?? null,
              cambio_items: Array.isArray(items),
              cantidad_items: Array.isArray(items) ? items.length : null,
              mensaje_rechazo: mensaje_rechazo ?? null,
            },
          },
          connection
        );
      } catch (_) { /* best-effort */ }

      await connection.commit();

      const [updated] = await pool.execute('SELECT * FROM cotizaciones WHERE id = ?', [id]);

      // Notificación por WhatsApp (best-effort, no bloquea respuesta):
      //   - cotización del CLIENTE en ENVIADA → al vendedor
      //   - cotización en ENVIADA_AL_MANAGER  → al manager (variación de precio)
      // La función decide internamente si dispara.
      try {
        const { dispararEnvioSiCorresponde } = require('./whatsappController');
        dispararEnvioSiCorresponde(Number(id)).catch((e) =>
          console.warn('[whatsapp] envío async falló:', e?.message || e)
        );
      } catch (e) {
        console.warn('[whatsapp] no se pudo cargar el controller:', e?.message || e);
      }

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

/**
 * Estados de PEDIDO que ya están terminados o cerrados. Si un pedido está en
 * uno de estos, no debemos retroceder su estado al cambiar el estado de una
 * cotización (típicamente complementaria) — la cotización puede continuar su
 * propio ciclo pero el pedido se queda quieto.
 */
const ESTADOS_PEDIDO_CERRADOS = new Set([
  'FALTA_PAGO_FACTURA',
  'FACTURADO',
  'COMPLETADO',
  'CANCELADO',
]);

/**
 * Decide si la transición solicitada está permitida según rol del usuario y
 * el creador_tipo de la cotización. Devuelve { ok: true } o { ok: false, error }.
 */
function autorizarTransicionCotizacion({ rol, estadoActual, estadoNuevo, creadorTipo, esCreador }) {
  if (rol === 'manager') return { ok: true };

  // Cliente
  if (rol === 'cliente') {
    // El cliente puede:
    //  1) Enviar SU cotización en BORRADOR al vendedor.
    //  2) Aprobar/rechazar cualquier cotización que esté en `ENVIADA_AL_CLIENTE`
    //     (sin importar creador_tipo): es el vendedor quien marca ese estado
    //     explícitamente para pedir la aprobación del cliente, incluso si la
    //     cotización original fue creada por el cliente y el vendedor la
    //     devolvió con cambios.
    if (estadoNuevo === 'APROBADA' || estadoNuevo === 'RECHAZADA') {
      if (estadoActual !== 'ENVIADA_AL_CLIENTE') {
        return { ok: false, error: 'La cotización no está pendiente de tu aprobación.' };
      }
      return { ok: true };
    }
    if (estadoNuevo === 'ENVIADA') {
      // Cliente envía su cot al vendedor: sólo si es suya y está en BORRADOR.
      if (creadorTipo !== 'CLIENTE' || !esCreador) {
        return { ok: false, error: 'Solo el creador puede enviar la cotización.' };
      }
      if (estadoActual !== 'BORRADOR') {
        return { ok: false, error: 'Solo puedes enviar cotizaciones en borrador.' };
      }
      return { ok: true };
    }
    return { ok: false, error: 'Acción no permitida para tu rol.' };
  }

  // Vendedor
  if (rol === 'vendedor') {
    if (estadoNuevo === 'APROBADA' || estadoNuevo === 'RECHAZADA') {
      // El vendedor solo aprueba/rechaza cotizaciones del CLIENTE.
      if (creadorTipo !== 'CLIENTE') {
        return { ok: false, error: 'El vendedor no aprueba/rechaza sus propias cotizaciones (eso lo hace el cliente).' };
      }
      if (estadoActual !== 'ENVIADA') {
        return { ok: false, error: 'La cotización del cliente no está pendiente de tu respuesta.' };
      }
      return { ok: true };
    }
    // Vendedor puede manejar el resto del flujo: enviar al manager, al cliente, etc.
    return { ok: true };
  }

  return { ok: false, error: 'Rol no autorizado.' };
}

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
    const [existing] = await pool.execute(
      'SELECT id, estado, pedido_id, es_complementaria, creador_tipo, creador_id, numero_cotizacion FROM cotizaciones WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    if (existing[0].estado === 'APROBADA') {
      return res.status(403).json({ error: 'No se pueden modificar cotizaciones ya aprobadas.' });
    }

    // Validar permiso para la transición.
    const rol = (req.user?.rol || '').toLowerCase();
    const creadorTipo = existing[0].creador_tipo || 'VENDEDOR';
    const esCreador = req.user?.id != null && Number(existing[0].creador_id) === Number(req.user.id);
    const auth = autorizarTransicionCotizacion({
      rol,
      estadoActual: existing[0].estado,
      estadoNuevo: estado,
      creadorTipo,
      esCreador,
    });
    if (!auth.ok) {
      return res.status(403).json({ error: auth.error });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // Compare-and-swap: re-bloquea la fila y comprueba que el estado actual
      // siga siendo el que vimos al validar la transición. Si en paralelo otro
      // actor (HTTP del vendedor + WhatsApp, dos managers, etc.) ya cambió el
      // estado, abortamos con 409 y dejamos que el cliente reintente con datos
      // frescos. Evita doble-aprobación, aprobación-tras-rechazo, etc.
      const estadoEsperado = existing[0].estado;
      const [lockRows] = await connection.execute(
        'SELECT estado FROM cotizaciones WHERE id = ? FOR UPDATE',
        [id]
      );
      if (lockRows.length === 0 || lockRows[0].estado !== estadoEsperado) {
        await connection.rollback();
        connection.release();
        return res.status(409).json({
          error: 'La cotización cambió de estado mientras se procesaba la solicitud. Vuelve a cargarla e inténtalo de nuevo.',
          estado_actual: lockRows[0]?.estado ?? null,
          estado_esperado: estadoEsperado,
        });
      }

      const esAprobada = estado === 'APROBADA' || estado === 'APROBADA_POR_MANAGER';
      const incluirNotasManager =
        notas_manager !== undefined &&
        (estado === 'APROBADA_POR_MANAGER' ||
          estado === 'APROBADA' ||
          estado === 'ENVIADA_AL_MANAGER' ||
          estado === 'ENVIADA_AL_CLIENTE');
      if (incluirNotasManager) {
        await connection.execute(
          'UPDATE cotizaciones SET estado = ?, mensaje_rechazo = COALESCE(?, mensaje_rechazo), notas_manager = COALESCE(?, notas_manager), fecha_envio = IF(?, NOW(), fecha_envio), fecha_aprobacion = IF(?, NOW(), fecha_aprobacion) WHERE id = ? AND estado = ?',
          [estado, mensaje_rechazo !== undefined ? mensaje_rechazo : null, typeof notas_manager === 'string' ? notas_manager : null, estado === 'ENVIADA_AL_MANAGER', esAprobada, id, estadoEsperado]
        );
      } else {
        await connection.execute(
          'UPDATE cotizaciones SET estado = ?, mensaje_rechazo = COALESCE(?, mensaje_rechazo), fecha_envio = IF(?, NOW(), fecha_envio), fecha_aprobacion = IF(?, NOW(), fecha_aprobacion) WHERE id = ? AND estado = ?',
          [estado, mensaje_rechazo !== undefined ? mensaje_rechazo : null, estado === 'ENVIADA_AL_MANAGER' || estado === 'ENVIADA_AL_CLIENTE', esAprobada, id, estadoEsperado]
        );
      }
      const pedido_id = existing[0].pedido_id;
      const es_complementaria = !!existing[0].es_complementaria;
      const cotEsDelCliente = creadorTipo === 'CLIENTE';

      // Obtener el estado actual del pedido para no retroceder.
      const [pedidoEstadoRows] = await connection.execute(
        'SELECT estado FROM pedidos WHERE id = ?',
        [pedido_id]
      );
      const estadoPedidoActual = pedidoEstadoRows[0]?.estado ?? null;
      const pedidoCerrado = estadoPedidoActual ? ESTADOS_PEDIDO_CERRADOS.has(estadoPedidoActual) : false;

      const estadosEnviada = ['ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER'];
      if (estadosEnviada.includes(estado)) {
        // El cambio "complementaria pasa por ENVIADA_*" no debe revertir el
        // estado de un pedido ya facturado/completado/cancelado.
        if (!es_complementaria && !pedidoCerrado) {
          await connection.execute(
            "UPDATE pedidos SET estado = 'FALTA_APROBAR_COTIZACION' WHERE id = ?",
            [pedido_id]
          );
        }
        if (estado === 'ENVIADA') {
          const descripcion = cotEsDelCliente
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
        if (!es_complementaria && !pedidoCerrado) {
          await connection.execute(
            "UPDATE pedidos SET estado = 'FALTA_APROBAR_COTIZACION' WHERE id = ?",
            [pedido_id]
          );
        }
        await connection.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, ?, 'COTIZACION_APROBADA', 'El manager aprobó la cotización. Lista para enviar al cliente.', ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, id, req.user?.id || null, req.user?.nombre_completo || null]
        );
      } else if (estado === 'APROBADA' && !es_complementaria) {
        if (!pedidoCerrado) {
          // Solo aceptamos sobreescribir `cotizacion_principal_id` si el pedido
          // sigue abierto y no tiene ya otra cotización principal aprobada — así
          // si dos vendedores aprueban cotizaciones distintas casi a la vez, la
          // segunda no pisa la primera (regla "first approval wins").
          await connection.execute(
            `UPDATE pedidos
             SET estado = 'COTIZACION_APROBADA',
                 cotizacion_principal_id = COALESCE(cotizacion_principal_id, ?)
             WHERE id = ? AND estado NOT IN ('FACTURADO', 'FALTA_PAGO_FACTURA', 'COMPLETADO', 'CANCELADO')`,
            [id, pedido_id]
          );
        }
        // El historial depende del ROL del usuario que ejecuta la acción, no
        // del creador. Una cotización originada por el cliente puede ser
        // aprobada por el vendedor (tal cual) o devuelta y aprobada después
        // por el propio cliente.
        const aprobadaPorVendedor = rol === 'vendedor';
        const descAprob = aprobadaPorVendedor
          ? `El vendedor${req.user?.nombre_completo ? ` (${req.user.nombre_completo})` : ''} aprobó la cotización del cliente.`
          : 'El cliente aprobó la cotización.';
        await connection.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, ?, 'COTIZACION_APROBADA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, id, descAprob, req.user?.id || null, req.user?.nombre_completo || null]
        );
      } else if (estado === 'APROBADA' && es_complementaria) {
        const aprobadaPorVendedor = rol === 'vendedor' || rol === 'manager';
        const descCompAprob = aprobadaPorVendedor
          ? `Cotización complementaria aprobada por el vendedor${req.user?.nombre_completo ? ` (${req.user.nombre_completo})` : ''}.`
          : 'El cliente aprobó la cotización complementaria.';
        await connection.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, ?, 'COTIZACION_APROBADA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, id, descCompAprob, req.user?.id || null, req.user?.nombre_completo || null]
        );
        const solicitudId = await marcarSolicitudPorComplementaria(connection, id, {
          estado: 'APROBADA',
          revisadoPorUsuarioId: req.user?.id || null,
        });
        if (solicitudId) {
          await aplicarSolicitudAgregarAlPedido(connection, {
            solicitudId,
            usuarioId: req.user?.id || null,
            usuarioNombre: req.user?.nombre_completo || null,
            crearComplementariaBorrador: false,
          });
        }
      } else if (estado === 'RECHAZADA' && !es_complementaria) {
        if (!pedidoCerrado) {
          // No retroceder a RECHAZADA si otra cotización del mismo pedido ya
          // fue aprobada en paralelo (estado COTIZACION_APROBADA) o si el
          // pedido ya pasó a estados posteriores.
          await connection.execute(
            `UPDATE pedidos
                SET estado = 'COTIZACION_RECHAZADA'
              WHERE id = ?
                AND estado NOT IN ('FACTURADO', 'FALTA_PAGO_FACTURA', 'COMPLETADO', 'CANCELADO', 'COTIZACION_APROBADA')`,
            [pedido_id]
          );
        }
        const motivo = mensaje_rechazo && String(mensaje_rechazo).trim()
          ? ` Motivo: ${String(mensaje_rechazo).trim()}`
          : '';
        const descRechazo = cotEsDelCliente
          ? `El vendedor rechazó la cotización del cliente.${motivo}`
          : `El cliente rechazó la cotización.${motivo}`;
        await connection.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, ?, 'COTIZACION_RECHAZADA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, id, descRechazo, req.user?.id || null, req.user?.nombre_completo || null]
        );
      } else if (estado === 'RECHAZADA' && es_complementaria) {
        const motivo = mensaje_rechazo && String(mensaje_rechazo).trim()
          ? ` Motivo: ${String(mensaje_rechazo).trim()}`
          : '';
        const descRechazoComp = cotEsDelCliente
          ? `El vendedor rechazó la cotización complementaria del cliente.${motivo}`
          : `El cliente rechazó la cotización complementaria.${motivo}`;
        await connection.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, ?, 'COTIZACION_RECHAZADA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, id, descRechazoComp, req.user?.id || null, req.user?.nombre_completo || null]
        );
        await marcarSolicitudPorComplementaria(connection, id, {
          estado: 'RECHAZADA',
          mensajeRechazo: mensaje_rechazo || null,
          revisadoPorUsuarioId: req.user?.id || null,
        });
      }
      try {
        const { registrarAuditoria } = require('../utils/audit');
        await registrarAuditoria(
          req,
          {
            accion: `COTIZACION_${String(estado).toUpperCase()}`,
            recurso_tipo: 'COTIZACION',
            recurso_id: id,
            descripcion: `Cotización ${id} → ${estado}.`,
            detalle: {
              estado_anterior: existing[0].estado,
              estado_nuevo: estado,
              mensaje_rechazo: mensaje_rechazo || null,
              notas_manager: notas_manager || null,
              numero_cotizacion: existing[0].numero_cotizacion || null,
            },
          },
          connection
        );
      } catch (_) { /* best-effort */ }
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

            // Para los avisos al cliente cuando el vendedor responde a SU
            // cotización, mandamos la notif al usuario creador específico, no
            // a todos los clientes de la empresa.
            const cotEsDelCliente = cot.creador_tipo === 'CLIENTE';
            const clienteCreadorId = cot.creador_id;

            if (estado === 'ENVIADA' && cotEsDelCliente && empresaIdPedido) {
              // Cliente envió su cotización al vendedor → notificar al vendedor del pedido.
              await emitirNotificacionAVendedorDePedido(conn2, {
                pedidoId,
                tipo: 'MENSAJE',
                titulo: `Cotización ${numeroCotizacion} recibida del cliente`,
                mensaje: 'El cliente envió su propia cotización. Revísala y apruébala o recházala.',
                contextoJson: {
                  evento: 'COTIZACION_RECIBIDA_DEL_CLIENTE',
                  cotizacion_id: cot.id,
                  pedido_id: pedidoId,
                  numero_cotizacion: numeroCotizacion,
                },
                remitenteUsuarioId: req.user ? req.user.id : null,
              });
            } else if (estado === 'ENVIADA_AL_CLIENTE' && empresaIdPedido) {
              await emitirNotificacionAClientesDeEmpresa(conn2, {
                empresaId: empresaIdPedido,
                tipo: 'COTIZACION_CREADA',
                titulo: `Cotización ${numeroCotizacion} lista para tu aprobación`,
                mensaje: 'El vendedor te envió una cotización para tu revisión y aprobación.',
                contextoJson: {
                  evento: 'COTIZACION_ENVIADA_AL_CLIENTE',
                  cotizacion_id: cot.id,
                  pedido_id: pedidoId,
                  numero_cotizacion: numeroCotizacion,
                },
                remitenteUsuarioId: req.user ? req.user.id : null,
              });
            } else if (estado === 'APROBADA') {
              // El destinatario depende de QUIÉN aprueba, no del creador de la cot.
              const aprobadaPorVendedor = rol === 'vendedor';
              if (aprobadaPorVendedor && cotEsDelCliente && clienteCreadorId) {
                // Vendedor aprobó la cotización del cliente → notificar al cliente creador.
                await conn2.execute(
                  `INSERT INTO notificaciones (tipo, titulo, mensaje, contexto_json, remitente_usuario_id, destinatario_usuario_id, destinatario_empresa_id, leida)
                   VALUES ('MENSAJE', ?, ?, ?, ?, ?, ?, 0)`,
                  [
                    `Tu cotización ${numeroCotizacion} fue aprobada`,
                    'El vendedor aceptó la cotización que enviaste. El pedido continúa el flujo normal.',
                    JSON.stringify({
                      evento: 'COTIZACION_CLIENTE_APROBADA_POR_VENDEDOR',
                      cotizacion_id: cot.id,
                      pedido_id: pedidoId,
                      numero_cotizacion: numeroCotizacion,
                    }),
                    req.user ? req.user.id : null,
                    clienteCreadorId,
                    empresaIdPedido,
                  ]
                );
              } else {
                // Cliente aprobó (su propia cot devuelta por vendedor, o cot del vendedor) → notificar al vendedor.
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
              }
            } else if (estado === 'RECHAZADA') {
              const motivo = mensaje_rechazo && String(mensaje_rechazo).trim()
                ? `Motivo: ${String(mensaje_rechazo).trim()}`
                : 'No se indicó motivo.';
              const rechazadaPorVendedor = rol === 'vendedor';
              if (rechazadaPorVendedor && cotEsDelCliente && clienteCreadorId) {
                // Vendedor rechazó la cotización del cliente → avisar al cliente creador.
                await conn2.execute(
                  `INSERT INTO notificaciones (tipo, titulo, mensaje, contexto_json, remitente_usuario_id, destinatario_usuario_id, destinatario_empresa_id, leida)
                   VALUES ('MENSAJE', ?, ?, ?, ?, ?, ?, 0)`,
                  [
                    `Tu cotización ${numeroCotizacion} fue rechazada`,
                    motivo,
                    JSON.stringify({
                      evento: 'COTIZACION_CLIENTE_RECHAZADA_POR_VENDEDOR',
                      cotizacion_id: cot.id,
                      pedido_id: pedidoId,
                      numero_cotizacion: numeroCotizacion,
                      mensaje_rechazo: mensaje_rechazo || null,
                    }),
                    req.user ? req.user.id : null,
                    clienteCreadorId,
                    empresaIdPedido,
                  ]
                );
              } else {
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
              }
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

      // Notificación por WhatsApp (best-effort, no bloquea respuesta):
      //   - cotización del CLIENTE en ENVIADA → al vendedor
      //   - cotización en ENVIADA_AL_MANAGER  → al manager (variación de precio)
      try {
        const { dispararEnvioSiCorresponde } = require('./whatsappController');
        dispararEnvioSiCorresponde(Number(id)).catch((e) =>
          console.warn('[whatsapp] envío async falló:', e?.message || e)
        );
      } catch (e) {
        console.warn('[whatsapp] no se pudo cargar el controller:', e?.message || e);
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

    // Normalizar estado del pedido después del borrado.
    // - Si el pedido ya está FACTURADO/COMPLETADO/CANCELADO no tocamos su estado.
    // - Si no quedan cotizaciones → ESPERA_COTIZACION.
    // - Si quedan cotizaciones pero ninguna APROBADA → ajustar según lo más
    //   reciente: si hay alguna ENVIADA/ENVIADA_AL_CLIENTE/ENVIADA_AL_MANAGER/
    //   APROBADA_POR_MANAGER → FALTA_APROBAR_COTIZACION; si todas son
    //   BORRADOR/RECHAZADA → ESPERA_COTIZACION.
    const [pedidoActualRows] = await connection.execute(
      'SELECT estado FROM pedidos WHERE id = ?',
      [pedido_id]
    );
    const estadoPedidoActual = pedidoActualRows[0]?.estado ?? null;
    const cerrado = estadoPedidoActual && ['FALTA_PAGO_FACTURA', 'FACTURADO', 'COMPLETADO', 'CANCELADO'].includes(estadoPedidoActual);
    if (!cerrado) {
      const [restantes] = await connection.execute(
        'SELECT estado FROM cotizaciones WHERE pedido_id = ?',
        [pedido_id]
      );
      if (restantes.length === 0) {
        await connection.execute("UPDATE pedidos SET estado = 'ESPERA_COTIZACION' WHERE id = ?", [pedido_id]);
      } else {
        const hayAprobada = restantes.some((r) => r.estado === 'APROBADA');
        const hayEnProceso = restantes.some((r) =>
          ['ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER', 'APROBADA_POR_MANAGER'].includes(r.estado)
        );
        if (hayAprobada) {
          // Si la cot principal aprobada sigue existiendo, mantener el estado.
          // (cotizacion_principal_id se preservó porque era de otra cot.)
        } else if (hayEnProceso) {
          await connection.execute("UPDATE pedidos SET estado = 'FALTA_APROBAR_COTIZACION' WHERE id = ?", [pedido_id]);
        } else {
          // Solo quedan BORRADOR/RECHAZADA → tratar como sin cotización viva.
          await connection.execute("UPDATE pedidos SET estado = 'ESPERA_COTIZACION' WHERE id = ?", [pedido_id]);
        }
      }
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
