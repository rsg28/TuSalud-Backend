const pool = require('../config/database');
const { validationResult } = require('express-validator');

// Estados válidos de cotización. El manager solo aprueba (APROBADA_POR_MANAGER), no rechaza.
const ESTADOS_COTIZACION = ['BORRADOR', 'ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER', 'APROBADA_POR_MANAGER', 'APROBADA', 'RECHAZADA'];

// Nuevo esquema: cotizaciones por pedido_id, cotizacion_items (nombre, cantidad, precio_base, precio_final, variacion_pct)

const generarNumeroCotizacion = async () => {
  const [rows] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM cotizaciones');
  const year = new Date().getFullYear();
  return `COT-${year}-${String(rows[0].nextId).padStart(6, '0')}`;
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
        p.cliente_usuario_id = ? OR p.empresa_id IN (SELECT empresa_id FROM usuario_empresa WHERE usuario_id = ?)
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
    const [cotizaciones] = await pool.execute(
      `SELECT c.*, p.numero_pedido, p.empresa_id, e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc,
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

    const [items] = await pool.execute(
      `SELECT ci.*, ex.nombre AS examen_nombre
       FROM cotizacion_items ci
       LEFT JOIN examenes ex ON ci.examen_id = ex.id
       WHERE ci.cotizacion_id = ?`,
      [id]
    );

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
    const [existe] = await pool.execute('SELECT id FROM cotizaciones WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    const [items] = await pool.execute(
      `SELECT ci.id, ci.cotizacion_id, ci.examen_id, ci.nombre, ci.cantidad, ci.precio_base, ci.precio_final, ci.variacion_pct, ci.subtotal,
        ex.nombre AS examen_nombre
       FROM cotizacion_items ci
       LEFT JOIN examenes ex ON ci.examen_id = ex.id
       WHERE ci.cotizacion_id = ?
       ORDER BY ci.id`,
      [id]
    );
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
      let total = 0;
      for (const it of items) {
        total += (it.precio_final || 0) * (it.cantidad || 0);
      }

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

      for (const it of items) {
        const precio_base = it.precio_base ?? it.precio_final ?? 0;
        const precio_final = it.precio_final ?? precio_base;
        const variacion_pct = precio_base !== 0
          ? ((precio_final - precio_base) / precio_base) * 100
          : 0;
        const subtotal = precio_final * (it.cantidad || 0);

        await connection.execute(
          `INSERT INTO cotizacion_items (
            cotizacion_id, examen_id, nombre, cantidad, precio_base, precio_final, variacion_pct, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cotizacionId,
            it.examen_id,
            it.nombre || 'Examen',
            it.cantidad || 1,
            precio_base,
            precio_final,
            variacion_pct,
            subtotal
          ]
        );
      }

      await connection.commit();

      const [newCot] = await pool.execute(
        'SELECT * FROM cotizaciones WHERE id = ?',
        [cotizacionId]
      );
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

const updateCotizacion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { estado, solicitud_manager_pendiente, mensaje_rechazo, items } = req.body;

    const [existing] = await pool.execute('SELECT id, estado, pedido_id, es_complementaria FROM cotizaciones WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      if (estado !== undefined) {
        if (!ESTADOS_COTIZACION.includes(estado)) {
          throw new Error(`estado debe ser uno de: ${ESTADOS_COTIZACION.join(', ')}`);
        }
        const esEnviada = ['ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER'].includes(estado);
        const esAprobada = estado === 'APROBADA';
        await connection.execute(
          'UPDATE cotizaciones SET estado = ?, fecha_envio = IF(?, NOW(), fecha_envio), fecha_aprobacion = IF(?, NOW(), fecha_aprobacion), solicitud_manager_pendiente = COALESCE(?, solicitud_manager_pendiente), mensaje_rechazo = COALESCE(?, mensaje_rechazo) WHERE id = ?',
          [
            estado,
            esEnviada,
            esAprobada,
            solicitud_manager_pendiente !== undefined ? (solicitud_manager_pendiente ? 1 : 0) : null,
            mensaje_rechazo !== undefined ? mensaje_rechazo : null,
            id
          ]
        );
        const pedido_id = existing[0].pedido_id;
        const es_complementaria = existing[0].es_complementaria;
        const estadosEnviada = ['ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER'];
        if (estadosEnviada.includes(estado)) {
          await connection.execute(
            "UPDATE pedidos SET estado = 'FALTA_APROBAR_COTIZACION' WHERE id = ?",
            [pedido_id]
          );
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

      if (items && Array.isArray(items) && existing[0].estado === 'BORRADOR') {
        await connection.execute('DELETE FROM cotizacion_items WHERE cotizacion_id = ?', [id]);
        let total = 0;
        for (const it of items) {
          const precio_base = it.precio_base ?? it.precio_final ?? 0;
          const precio_final = it.precio_final ?? precio_base;
          const variacion_pct = precio_base !== 0 ? ((precio_final - precio_base) / precio_base) * 100 : 0;
          const subtotal = precio_final * (it.cantidad || 0);
          total += subtotal;
          await connection.execute(
            `INSERT INTO cotizacion_items (cotizacion_id, examen_id, nombre, cantidad, precio_base, precio_final, variacion_pct, subtotal)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, it.examen_id, it.nombre || 'Examen', it.cantidad || 1, precio_base, precio_final, variacion_pct, subtotal]
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

/** PATCH /api/cotizaciones/:id/estado — Actualiza solo el estado (y opcionalmente mensaje_rechazo). */
const updateEstadoCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, mensaje_rechazo } = req.body;
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
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      await connection.execute(
        'UPDATE cotizaciones SET estado = ?, mensaje_rechazo = COALESCE(?, mensaje_rechazo) WHERE id = ?',
        [estado, mensaje_rechazo !== undefined ? mensaje_rechazo : null, id]
      );
      const pedido_id = existing[0].pedido_id;
      const es_complementaria = existing[0].es_complementaria;
      const estadosEnviada = ['ENVIADA', 'ENVIADA_AL_CLIENTE', 'ENVIADA_AL_MANAGER'];
      if (estadosEnviada.includes(estado)) {
        await connection.execute(
          "UPDATE pedidos SET estado = 'FALTA_APROBAR_COTIZACION' WHERE id = ?",
          [pedido_id]
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
      } else if (estado === 'APROBADA' && !es_complementaria) {
        await connection.execute(
          "UPDATE pedidos SET estado = 'COTIZACION_APROBADA', cotizacion_principal_id = ? WHERE id = ?",
          [id, pedido_id]
        );
      } else if (estado === 'RECHAZADA' && !es_complementaria) {
        await connection.execute(
          "UPDATE pedidos SET estado = 'COTIZACION_RECHAZADA' WHERE id = ?",
          [pedido_id]
        );
      }
      await connection.commit();
      const [updated] = await pool.execute('SELECT * FROM cotizaciones WHERE id = ?', [id]);
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
    const [existing] = await connection.execute('SELECT id, estado FROM cotizaciones WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    await connection.beginTransaction();

    // Quitar referencias: pedidos.cotizacion_principal_id se pone NULL al borrar (ON DELETE SET NULL)
    // Cotizaciones complementarias que usan esta como base
    await connection.execute('UPDATE cotizaciones SET cotizacion_base_id = NULL WHERE cotizacion_base_id = ?', [id]);
    // Enlaces factura-cotización (FK RESTRICT)
    await connection.execute('DELETE FROM factura_cotizacion WHERE cotizacion_id = ?', [id]);
    // Referencia del pedido a esta cotización como principal
    await connection.execute('UPDATE pedidos SET cotizacion_principal_id = NULL WHERE cotizacion_principal_id = ?', [id]);

    // Borrar ítems y luego la cotización (cotizacion_items tiene ON DELETE CASCADE)
    await connection.execute('DELETE FROM cotizaciones WHERE id = ?', [id]);

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
  updateCotizacion,
  updateEstadoCotizacion,
  deleteCotizacion
};
