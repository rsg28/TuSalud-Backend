const pool = require('../config/database');
const {
  aplicarTotalesCalculados,
} = require('../utils/cotizacionTotal');
const { validationResult } = require('express-validator');
const { siguienteNumeroFactura } = require('../utils/numeracion');
const {
  helpers: { emitirNotificacionAVendedorDePedido },
} = require('./notificacionesController');

// Nuevo esquema: facturas (pedido_id), factura_cotizacion (vincula cotizaciones), factura_detalle (líneas)

const getAllFacturas = async (req, res) => {
  try {
    const { pedido_id, user_id, estado, empresa_id } = req.query;
    let query = `
      SELECT f.*, p.numero_pedido, p.empresa_id, e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc
      FROM facturas f
      JOIN pedidos p ON f.pedido_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (pedido_id) {
      query += ' AND f.pedido_id = ?';
      params.push(pedido_id);
    }
    if (user_id) {
      query += ' AND p.cliente_usuario_id = ?';
      params.push(user_id);
    }
    if (estado) {
      query += ' AND f.estado = ?';
      params.push(estado);
    }
    if (empresa_id) {
      query += ' AND p.empresa_id = ?';
      params.push(empresa_id);
    }

    query += ' ORDER BY f.fecha_emision DESC';
    const [facturas] = await pool.execute(query, params);
    res.json({ facturas });
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
};

const getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [facturas] = await pool.execute(
      `SELECT f.*, p.numero_pedido, p.empresa_id,
              p.cliente_ve_precios_individuales,
              e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc
       FROM facturas f
       JOIN pedidos p ON f.pedido_id = p.id
       JOIN empresas e ON p.empresa_id = e.id
       WHERE f.id = ?`,
      [id]
    );

    if (facturas.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const [cotizaciones] = await pool.execute(
      `SELECT fc.*, c.numero_cotizacion, c.es_complementaria,
              (SELECT COALESCE(SUM(ci.subtotal), 0) FROM cotizacion_items ci WHERE ci.cotizacion_id = c.id) AS cotizacion_total
       FROM factura_cotizacion fc
       JOIN cotizaciones c ON fc.cotizacion_id = c.id
       WHERE fc.factura_id = ?
       ORDER BY fc.es_principal DESC, c.es_complementaria ASC, c.id ASC`,
      [id]
    );

    /**
     * `examenes_snapshot_json` no se copia en `factura_detalle`; se recupera
     * desde `cotizacion_items` con un JOIN por (cotizacion_id + tipo_item +
     * perfil_id + tipo_emo + examen_id) para que el frontend pueda reconstruir
     * grupos por perfil EMO en la vista de la factura.
     *
     * IMPORTANTE: El JOIN tiene que incluir `tipo_emo` y limitarse a un único
     * cotizacion_item por línea (subconsulta `MIN(id)`), para no multiplicar las
     * filas de la factura cuando una cotización tiene varios PERFIL con el mismo
     * `perfil_id` pero distinto `tipo_emo`, o ítems históricos duplicados con
     * idéntica clave (cotizacion_id, tipo_item, perfil_id, tipo_emo, examen_id).
     */
    const [detalles] = await pool.execute(
      `SELECT fd.*,
              e.nombre AS examen_nombre,
              pf.nombre AS perfil_nombre,
              c.numero_cotizacion AS cotizacion_numero,
              c.es_complementaria AS cotizacion_es_complementaria,
              ci.examenes_snapshot_json
       FROM factura_detalle fd
       LEFT JOIN examenes e   ON fd.examen_id = e.id
       LEFT JOIN emo_perfiles pf ON fd.perfil_id = pf.id
       LEFT JOIN cotizaciones c ON fd.cotizacion_id = c.id
       LEFT JOIN cotizacion_items ci
              ON ci.id = (
                SELECT MIN(ci2.id)
                FROM cotizacion_items ci2
                WHERE ci2.cotizacion_id = fd.cotizacion_id
                  AND ci2.tipo_item = fd.tipo_item
                  AND (ci2.perfil_id <=> fd.perfil_id)
                  AND (ci2.tipo_emo <=> fd.tipo_emo)
                  AND (ci2.examen_id <=> fd.examen_id)
              )
       WHERE fd.factura_id = ?
       ORDER BY c.es_complementaria ASC, c.id ASC, fd.id`,
      [id]
    );

    const pedidoId = facturas[0].pedido_id;
    const [histReporte] = await pool.execute(
      `SELECT 1 FROM historial_pedido
       WHERE pedido_id = ? AND tipo_evento = 'PAGO_CLIENTE_REPORTADO'
       LIMIT 1`,
      [pedidoId]
    );

    const facturaRow = facturas[0];
    let detallesOut = detalles;

    /**
     * Cliente sin permiso: no devolver precio unitario por examen ni precios
     * dentro del snapshot del perfil. Sí se mantienen precios de líneas PERFIL
     * (paquete) y los totales de la factura.
     */
    const rol = String(req.user?.rol || '').toLowerCase();
    const esCliente = rol === 'cliente';
    const veDesglose = Number(facturaRow.cliente_ve_precios_individuales) === 1;
    if (esCliente && !veDesglose) {
      detallesOut = detalles.map((d) => {
        const tipo = String(d.tipo_item || '').toUpperCase();
        let snap = d.examenes_snapshot_json;
        if (snap) {
          try {
            const parsed = typeof snap === 'string' ? JSON.parse(snap) : snap;
            if (parsed?.categorias && Array.isArray(parsed.categorias)) {
              const redacted = {
                ...parsed,
                categorias: parsed.categorias.map((cat) => ({
                  ...cat,
                  examenes: (cat.examenes || []).map((ex) => ({
                    ...ex,
                    precio: null,
                  })),
                })),
              };
              snap = typeof d.examenes_snapshot_json === 'string'
                ? JSON.stringify(redacted)
                : redacted;
            }
          } catch {
            /* dejar snapshot original si no parsea */
          }
        }
        if (tipo === 'EXAMEN') {
          return {
            ...d,
            precio_unitario: null,
            examenes_snapshot_json: snap,
          };
        }
        return { ...d, examenes_snapshot_json: snap };
      });
    }

    res.json({
      factura: facturaRow,
      cotizaciones,
      detalles: detallesOut,
      cliente_reporto_pago: histReporte.length > 0,
    });
  } catch (error) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ error: 'Error al obtener factura' });
  }
};

// Crear factura para un pedido (incluye cotización principal + complementarias aprobadas no facturadas)
const createFactura = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pedido_id } = req.body;
    if (!pedido_id) {
      return res.status(400).json({ error: 'pedido_id es requerido' });
    }

    // Concurrencia: dos managers podrían pulsar "Emitir factura" del mismo pedido
    // a la vez. Sin lock, ambos ven las mismas cotizaciones como "pendientes" y
    // crean dos facturas. Tomamos un lock pesimista sobre la fila del pedido al
    // inicio de la transacción para serializar la emisión por pedido. Además, la
    // UNIQUE en `factura_cotizacion(cotizacion_id)` (migration_concurrencia_fixes.sql)
    // bloquea el peor caso si dos peticiones logran pasar el lock.
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    let pedido;
    let principalId;
    let cotizacionesParaFacturar;
    try {
      const [pedidoRows] = await connection.execute(
        'SELECT id, empresa_id, cotizacion_principal_id FROM pedidos WHERE id = ? FOR UPDATE',
        [pedido_id]
      );
      if (pedidoRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }
      pedido = pedidoRows;
      principalId = pedido[0].cotizacion_principal_id;
      if (!principalId) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'El pedido no tiene cotización principal aprobada' });
      }

      // Releemos las cotizaciones DENTRO de la TX y bloqueamos sus filas para que
      // no se aprueben/desaprueben durante la facturación.
      const [filas] = await connection.execute(
        `SELECT c.id, c.es_complementaria, c.numero_cotizacion,
                (SELECT COALESCE(SUM(ci.subtotal), 0) FROM cotizacion_items ci WHERE ci.cotizacion_id = c.id) AS total
         FROM cotizaciones c
         WHERE c.pedido_id = ?
           AND c.estado = 'APROBADA'
           AND NOT EXISTS (SELECT 1 FROM factura_cotizacion fc WHERE fc.cotizacion_id = c.id)
           AND (c.id = ? OR c.es_complementaria = 1)
         FOR UPDATE`,
        [pedido_id, principalId]
      );
      cotizacionesParaFacturar = await aplicarTotalesCalculados(connection, filas);

      if (cotizacionesParaFacturar.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'No hay cotizaciones aprobadas pendientes de facturar para este pedido' });
      }

      const incluyePrincipal = cotizacionesParaFacturar.some((c) => Number(c.id) === Number(principalId));
      if (!incluyePrincipal) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          error: 'La cotización principal aprobada del pedido debe estar pendiente de facturar antes de emitir la factura',
        });
      }
    } catch (lockErr) {
      try { await connection.rollback(); } catch (_) {}
      connection.release();
      throw lockErr;
    }

    try {
      const subtotal = cotizacionesParaFacturar.reduce((s, c) => s + Number(c.total || 0), 0);
      const igv = Math.round(subtotal * 0.18 * 100) / 100;
      const total = Math.round((subtotal + igv) * 100) / 100;

      const numero_factura = await siguienteNumeroFactura(connection);

      const [result] = await connection.execute(
        `INSERT INTO facturas (numero_factura, pedido_id, subtotal, igv, total, estado, fecha_emision)
         VALUES (?, ?, ?, ?, ?, 'PENDIENTE', CURDATE())`,
        [numero_factura, pedido_id, subtotal, igv, total]
      );
      const factura_id = result.insertId;

      for (const c of cotizacionesParaFacturar) {
        await connection.execute(
          'INSERT INTO factura_cotizacion (factura_id, cotizacion_id, monto, es_principal) VALUES (?, ?, ?, ?)',
          [factura_id, c.id, c.total, c.id === principalId ? 1 : 0]
        );
      }

      // Rellenar factura_detalle desde cotizacion_items (preservando tipo_item / perfil / examen
      // y conservando cotizacion_id origen para poder agrupar en la vista de la factura).
      const [items] = await connection.execute(
        `SELECT ci.cotizacion_id,
                ci.tipo_item, ci.perfil_id, ci.tipo_emo, ci.examen_id,
                ci.nombre AS descripcion, ci.cantidad,
                ci.precio_final AS precio_unitario,
                (ci.cantidad * ci.precio_final) AS subtotal
         FROM cotizacion_items ci
         WHERE ci.cotizacion_id IN (${cotizacionesParaFacturar.map(c => '?').join(',')})`,
        cotizacionesParaFacturar.map(c => c.id)
      );
      for (const it of items) {
        await connection.execute(
          `INSERT INTO factura_detalle
             (factura_id, cotizacion_id, tipo_item, perfil_id, tipo_emo, examen_id,
              descripcion, cantidad, precio_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [factura_id, it.cotizacion_id, it.tipo_item, it.perfil_id, it.tipo_emo, it.examen_id,
           it.descripcion, it.cantidad, it.precio_unitario, it.subtotal]
        );
      }

      /**
       * Una factura recién creada está en estado PENDIENTE (de pago). El pedido
       * pasa a `FALTA_PAGO_FACTURA` para reflejar que ya hay factura emitida
       * pero aún no cobrada. Cuando la factura se marca como PAGADA el pedido
       * avanza a `FACTURADO` (ver updateFactura más abajo).
       */
      await connection.execute(
        "UPDATE pedidos SET factura_id = ?, estado = 'FALTA_PAGO_FACTURA' WHERE id = ?",
        [factura_id, pedido_id]
      );

      // Registrar evento en el historial del pedido
      await connection.execute(
        `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
         VALUES (?, NULL, 'FACTURA_EMITIDA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
        [
          pedido_id,
          `Factura ${numero_factura} emitida (S/ ${Number(total).toFixed(2)}). En espera de pago.`,
          req.user?.id || null,
          req.user?.nombre_completo || null,
        ]
      );

      try {
        const { registrarAuditoria } = require('../utils/audit');
        await registrarAuditoria(
          req,
          {
            accion: 'EMITIR_FACTURA',
            recurso_tipo: 'FACTURA',
            recurso_id: factura_id,
            descripcion: `Emitió factura ${numero_factura} por S/ ${Number(total).toFixed(2)} (pedido ${pedido_id}).`,
            detalle: {
              numero_factura,
              pedido_id,
              total: Number(total),
              cotizaciones_facturadas: cotizacionesParaFacturar.map((c) => c.id),
            },
          },
          connection
        );
      } catch (_) { /* best-effort */ }

      await connection.commit();

      const [newFactura] = await pool.execute('SELECT * FROM facturas WHERE id = ?', [factura_id]);
      res.status(201).json({
        message: 'Factura creada exitosamente',
        factura: newFactura[0]
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear factura:', error);
    res.status(500).json({ error: 'Error al crear factura' });
  }
};

/**
 * POST /api/facturas/:id/sincronizar-cotizaciones
 * Incorpora cotizaciones complementarias APROBADAS que aún no están en la factura
 * (p. ej. aprobadas después de emitir la factura principal) y recalcula totales.
 */
const sincronizarCotizacionesFactura = async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const { id } = req.params;
    const [facturas] = await connection.execute(
      'SELECT id, pedido_id, estado, numero_factura FROM facturas WHERE id = ? FOR UPDATE',
      [id]
    );
    if (facturas.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    const factura = facturas[0];
    if (factura.estado === 'PAGADA') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        error: 'No se pueden agregar cotizaciones a una factura ya pagada',
      });
    }

    const pedido_id = factura.pedido_id;
    const [pendientesRaw] = await connection.execute(
      `SELECT c.id, c.es_complementaria, c.numero_cotizacion,
              (SELECT COALESCE(SUM(ci.subtotal), 0) FROM cotizacion_items ci WHERE ci.cotizacion_id = c.id) AS total
       FROM cotizaciones c
       WHERE c.pedido_id = ?
         AND c.estado = 'APROBADA'
         AND c.es_complementaria = 1
         AND NOT EXISTS (
           SELECT 1 FROM factura_cotizacion fc WHERE fc.cotizacion_id = c.id
         )
       ORDER BY c.id ASC`,
      [pedido_id]
    );
    const pendientes = await aplicarTotalesCalculados(connection, pendientesRaw);

    if (pendientes.length === 0) {
      await connection.commit();
      connection.release();
      const [actual] = await pool.execute('SELECT * FROM facturas WHERE id = ?', [id]);
      return res.json({
        message: 'La factura ya incluye todas las cotizaciones complementarias aprobadas',
        agregadas: 0,
        factura: actual[0],
      });
    }

    for (const c of pendientes) {
      await connection.execute(
        'INSERT INTO factura_cotizacion (factura_id, cotizacion_id, monto, es_principal) VALUES (?, ?, ?, 0)',
        [id, c.id, c.total]
      );
    }

    const cotIds = pendientes.map((c) => c.id);
    const [items] = await connection.execute(
      `SELECT ci.cotizacion_id,
              ci.tipo_item, ci.perfil_id, ci.tipo_emo, ci.examen_id,
              ci.nombre AS descripcion, ci.cantidad,
              ci.precio_final AS precio_unitario,
              (ci.cantidad * ci.precio_final) AS subtotal
       FROM cotizacion_items ci
       WHERE ci.cotizacion_id IN (${cotIds.map(() => '?').join(',')})`,
      cotIds
    );
    for (const it of items) {
      await connection.execute(
        `INSERT INTO factura_detalle
           (factura_id, cotizacion_id, tipo_item, perfil_id, tipo_emo, examen_id,
            descripcion, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          it.cotizacion_id,
          it.tipo_item,
          it.perfil_id,
          it.tipo_emo,
          it.examen_id,
          it.descripcion,
          it.cantidad,
          it.precio_unitario,
          it.subtotal,
        ]
      );
    }

    const [sumRows] = await connection.execute(
      'SELECT COALESCE(SUM(monto), 0) AS subtotal FROM factura_cotizacion WHERE factura_id = ?',
      [id]
    );
    const subtotal = Number(sumRows[0]?.subtotal ?? 0);
    const igv = Math.round(subtotal * 0.18 * 100) / 100;
    const total = Math.round((subtotal + igv) * 100) / 100;
    await connection.execute(
      'UPDATE facturas SET subtotal = ?, igv = ?, total = ? WHERE id = ?',
      [subtotal, igv, total, id]
    );

    const nums = pendientes.map((c) => c.numero_cotizacion || c.id).join(', ');
    await connection.execute(
      `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
       VALUES (?, NULL, 'FACTURA_EMITIDA', ?, ?, ?, NULL, NULL, NULL, NULL)`,
      [
        pedido_id,
        `Factura ${factura.numero_factura}: se incorporaron cotización(es) complementaria(s) ${nums} (S/ ${subtotal.toFixed(2)} subtotal actualizado).`,
        req.user?.id || null,
        req.user?.nombre_completo || null,
      ]
    );

    await connection.commit();
    connection.release();

    const [updated] = await pool.execute('SELECT * FROM facturas WHERE id = ?', [id]);
    res.json({
      message: `Se agregaron ${pendientes.length} cotización(es) complementaria(s) a la factura`,
      agregadas: pendientes.length,
      cotizacion_ids: pendientes.map((c) => c.id),
      factura: updated[0],
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {
      /* ignore */
    }
    connection.release();
    console.error('Error al sincronizar cotizaciones en factura:', error);
    res.status(500).json({ error: 'Error al sincronizar cotizaciones en la factura' });
  }
};

const updateFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha_pago } = req.body;

    const [existing] = await pool.execute('SELECT id, estado, pedido_id FROM facturas WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (estado !== undefined) {
      const rol = req.user?.rol;

      if (estado === 'PAGADA') {
        if (!['vendedor', 'manager'].includes(rol)) {
          return res.status(403).json({
            error: 'Solo el vendedor o manager puede marcar la factura como pagada',
          });
        }
      }

      await pool.execute(
        'UPDATE facturas SET estado = ?, fecha_pago = COALESCE(?, fecha_pago) WHERE id = ?',
        [estado, fecha_pago || null, id]
      );
      if (estado === 'PAGADA') {
        const pedido_id = existing[0].pedido_id;
        /**
         * Al cobrarse la factura, el pedido pasa de `FALTA_PAGO_FACTURA` a
         * `FACTURADO`. El estado final `COMPLETADO` se asigna desde el manager
         * (endpoint /api/pedidos/:id/completar) una vez que se entregan los
         * exámenes / resultados al cliente.
         */
        await pool.execute(
          "UPDATE pedidos SET estado = 'FACTURADO' WHERE id = ? AND estado IN ('FALTA_PAGO_FACTURA', 'COTIZACION_APROBADA')",
          [pedido_id]
        );
        await pool.execute(
          `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
           VALUES (?, NULL, 'PAGO_RECIBIDO', 'Factura marcada como pagada.', ?, ?, NULL, NULL, NULL, NULL)`,
          [pedido_id, req.user?.id || null, req.user?.nombre_completo || null]
        );
      } else if (estado === 'PENDIENTE') {
        /**
         * Reversa: si por alguna razón se vuelve a marcar PENDIENTE, asegurar
         * que el pedido refleje FALTA_PAGO_FACTURA (no FACTURADO).
         */
        const pedido_id = existing[0].pedido_id;
        await pool.execute(
          "UPDATE pedidos SET estado = 'FALTA_PAGO_FACTURA' WHERE id = ? AND estado = 'FACTURADO'",
          [pedido_id]
        );
      }
    }

    const [updated] = await pool.execute('SELECT * FROM facturas WHERE id = ?', [id]);
    res.json({ message: 'Factura actualizada', factura: updated[0] });
  } catch (error) {
    console.error('Error al actualizar factura:', error);
    res.status(500).json({ error: 'Error al actualizar factura' });
  }
};

/**
 * POST /api/facturas/:id/reportar-pago-cliente
 * El cliente avisa que pagó; no cambia el estado de la factura ni del pedido.
 */
const reportarPagoPorCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_pago, comentario } = req.body || {};
    const userId = req.user?.id;
    if (!userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const [rows] = await pool.execute(
      `SELECT f.id, f.numero_factura, f.estado, f.pedido_id, p.numero_pedido
       FROM facturas f
       JOIN pedidos p ON f.pedido_id = p.id
       WHERE f.id = ? AND (
         p.cliente_usuario_id = ? OR
         p.empresa_id = (SELECT empresa_id FROM usuarios WHERE id = ?)
       )`,
      [id, userId, userId]
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: 'No tiene permiso para esta factura' });
    }

    const factura = rows[0];
    if (factura.estado === 'PAGADA') {
      return res.status(400).json({ error: 'La factura ya está pagada' });
    }

    const [yaReportado] = await pool.execute(
      `SELECT 1 FROM historial_pedido
       WHERE pedido_id = ? AND tipo_evento = 'PAGO_CLIENTE_REPORTADO'
       LIMIT 1`,
      [factura.pedido_id]
    );
    if (yaReportado.length > 0) {
      return res.status(400).json({
        error: 'Ya notificaste el pago. Tu vendedor lo revisará y confirmará cuando corresponda.',
      });
    }

    const fechaTxt =
      fecha_pago && String(fecha_pago).trim()
        ? ` el ${String(fecha_pago).trim()}`
        : '';
    const comentarioTxt =
      comentario && String(comentario).trim()
        ? ` Comentario: ${String(comentario).trim()}`
        : '';
    const descripcion = `El cliente indicó que realizó el pago${fechaTxt}.${comentarioTxt}`;

    await pool.execute(
      `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
       VALUES (?, NULL, 'PAGO_CLIENTE_REPORTADO', ?, ?, ?, NULL, NULL, NULL, NULL)`,
      [factura.pedido_id, descripcion, userId, req.user?.nombre_completo || null]
    );

    try {
      const conn = await pool.getConnection();
      try {
        await emitirNotificacionAVendedorDePedido(conn, {
          pedidoId: factura.pedido_id,
          tipo: 'MENSAJE',
          titulo: `Pago reportado — factura ${factura.numero_factura}`,
          mensaje: `El cliente avisó que pagó${fechaTxt}. Revisa el comprobante y marca la factura como pagada cuando lo confirmes.`,
          contextoJson: {
            evento: 'PAGO_CLIENTE_REPORTADO',
            pedido_id: factura.pedido_id,
            factura_id: factura.id,
            numero_factura: factura.numero_factura,
            numero_pedido: factura.numero_pedido,
            fecha_pago: fecha_pago || null,
          },
          remitenteUsuarioId: userId,
        });
      } finally {
        conn.release();
      }
    } catch (notifErr) {
      console.warn('No se pudo notificar al vendedor sobre pago reportado:', notifErr?.message);
    }

    const [updated] = await pool.execute('SELECT * FROM facturas WHERE id = ?', [id]);
    res.json({
      message: 'Aviso enviado. Tu vendedor revisará el pago y confirmará la factura.',
      factura: updated[0],
      cliente_reporto_pago: true,
    });
  } catch (error) {
    console.error('Error al reportar pago del cliente:', error);
    res.status(500).json({ error: 'Error al notificar el pago' });
  }
};

/** POST /api/facturas/:id/enviar-cliente — Registra en historial que la factura fue enviada al cliente. */
const enviarFacturaAlCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT id, pedido_id FROM facturas WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    const pedido_id = existing[0].pedido_id;

    await pool.execute(
      `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
       VALUES (?, NULL, 'FACTURA_ENVIADA_CLIENTE', 'Factura enviada al cliente.', ?, ?, NULL, NULL, NULL, NULL)`,
      [pedido_id, req.user?.id || null, req.user?.nombre_completo || null]
    );

    const [updated] = await pool.execute('SELECT * FROM facturas WHERE id = ?', [id]);
    res.json({ message: 'Factura enviada al cliente', factura: updated[0] });
  } catch (error) {
    console.error('Error al enviar factura al cliente:', error);
    res.status(500).json({ error: 'Error al enviar factura al cliente' });
  }
};

const deleteFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT id, estado, pedido_id FROM facturas WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    if (existing[0].estado === 'PAGADA') {
      return res.status(400).json({ error: 'No se puede eliminar una factura ya pagada' });
    }

    const pedido_id = existing[0].pedido_id;

    /**
     * Al anular la factura, el pedido vuelve a `COTIZACION_APROBADA` (la
     * cotización aprobada sigue vigente; solo se rehace la factura).
     */
    await pool.execute(
      "UPDATE pedidos SET factura_id = NULL, estado = 'COTIZACION_APROBADA' WHERE factura_id = ?",
      [id]
    );
    await pool.execute(
      `INSERT INTO historial_pedido (pedido_id, cotizacion_id, tipo_evento, descripcion, usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos)
       VALUES (?, NULL, 'FACTURA_ANULADA', 'Factura anulada.', ?, ?, NULL, NULL, NULL, NULL)`,
      [pedido_id, req.user?.id || null, req.user?.nombre_completo || null]
    );
    await pool.execute('DELETE FROM factura_cotizacion WHERE factura_id = ?', [id]);
    await pool.execute('DELETE FROM factura_detalle WHERE factura_id = ?', [id]);
    await pool.execute('DELETE FROM facturas WHERE id = ?', [id]);

    res.json({ message: 'Factura eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar factura:', error);
    res.status(500).json({ error: 'Error al eliminar factura' });
  }
};

module.exports = {
  getAllFacturas,
  getFacturaById,
  createFactura,
  sincronizarCotizacionesFactura,
  updateFactura,
  reportarPagoPorCliente,
  enviarFacturaAlCliente,
  deleteFactura
};
