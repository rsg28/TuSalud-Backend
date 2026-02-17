const pool = require('../config/database');
const { validationResult } = require('express-validator');

// Nuevo esquema: facturas (pedido_id), factura_cotizacion (vincula cotizaciones), factura_detalle (líneas)

const getAllFacturas = async (req, res) => {
  try {
    const { pedido_id, estado, empresa_id } = req.query;
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
      `SELECT f.*, p.numero_pedido, p.empresa_id, e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc
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
      `SELECT fc.*, c.numero_cotizacion FROM factura_cotizacion fc
       JOIN cotizaciones c ON fc.cotizacion_id = c.id
       WHERE fc.factura_id = ?`,
      [id]
    );

    const [detalles] = await pool.execute(
      `SELECT fd.*, e.nombre AS examen_nombre FROM factura_detalle fd
       LEFT JOIN examenes e ON fd.examen_id = e.id
       WHERE fd.factura_id = ?`,
      [id]
    );

    res.json({
      factura: facturas[0],
      cotizaciones,
      detalles
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

    const [pedido] = await pool.execute(
      'SELECT id, empresa_id, cotizacion_principal_id FROM pedidos WHERE id = ?',
      [pedido_id]
    );
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const principalId = pedido[0].cotizacion_principal_id;
    if (!principalId) {
      return res.status(400).json({ error: 'El pedido no tiene cotización principal aprobada' });
    }

    // Cotizaciones aprobadas del pedido que aún no están en ninguna factura
    const [cotizacionesParaFacturar] = await pool.execute(
      `SELECT c.id, c.total, c.es_complementaria
       FROM cotizaciones c
       WHERE c.pedido_id = ? AND c.estado = 'APROBADA'
         AND (c.id = ? OR c.cotizacion_base_id = ?)
         AND NOT EXISTS (SELECT 1 FROM factura_cotizacion fc WHERE fc.cotizacion_id = c.id)`,
      [pedido_id, principalId, principalId]
    );

    if (cotizacionesParaFacturar.length === 0) {
      return res.status(400).json({ error: 'No hay cotizaciones aprobadas pendientes de facturar para este pedido' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const subtotal = cotizacionesParaFacturar.reduce((s, c) => s + Number(c.total), 0);
      const igv = subtotal * 0.18;
      const total = subtotal + igv;

      const [seq] = await connection.execute('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM facturas');
      const numero_factura = `FAC-${new Date().getFullYear()}-${String(seq[0].n).padStart(6, '0')}`;

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

      // Rellenar factura_detalle desde cotizacion_items de las cotizaciones incluidas
      const [items] = await connection.execute(
        `SELECT ci.examen_id, ci.nombre AS descripcion, ci.cantidad, ci.precio_final AS precio_unitario,
                (ci.cantidad * ci.precio_final) AS subtotal
         FROM cotizacion_items ci
         WHERE ci.cotizacion_id IN (${cotizacionesParaFacturar.map(c => '?').join(',')})`,
        cotizacionesParaFacturar.map(c => c.id)
      );
      for (const it of items) {
        await connection.execute(
          'INSERT INTO factura_detalle (factura_id, examen_id, descripcion, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
          [factura_id, it.examen_id, it.descripcion, it.cantidad, it.precio_unitario, it.subtotal]
        );
      }

      await connection.execute(
        "UPDATE pedidos SET factura_id = ?, estado = 'FACTURADO' WHERE id = ?",
        [factura_id, pedido_id]
      );

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

const updateFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha_pago } = req.body;

    const [existing] = await pool.execute('SELECT id, estado FROM facturas WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (estado !== undefined) {
      await pool.execute(
        'UPDATE facturas SET estado = ?, fecha_pago = COALESCE(?, fecha_pago) WHERE id = ?',
        [estado, fecha_pago || null, id]
      );
    }

    const [updated] = await pool.execute('SELECT * FROM facturas WHERE id = ?', [id]);
    res.json({ message: 'Factura actualizada', factura: updated[0] });
  } catch (error) {
    console.error('Error al actualizar factura:', error);
    res.status(500).json({ error: 'Error al actualizar factura' });
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

    await pool.execute('UPDATE pedidos SET factura_id = NULL WHERE factura_id = ?', [id]);
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
  updateFactura,
  deleteFactura
};
