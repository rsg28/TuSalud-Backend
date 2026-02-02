const pool = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todas las facturas
const getAllFacturas = async (req, res) => {
  try {
    const { search, estado, empresa_id, paciente_id, fecha_desde, fecha_hasta } = req.query;
    let query = `
      SELECT f.*, 
        e.razon_social as empresa_nombre, e.ruc as empresa_ruc,
        p.nombre as paciente_nombre, p.apellido_paterno, p.apellido_materno, p.dni as paciente_dni,
        c.numero_cotizacion
      FROM facturas f
      LEFT JOIN empresas e ON f.empresa_id = e.id
      LEFT JOIN pacientes p ON f.paciente_id = p.id
      LEFT JOIN cotizaciones c ON f.cotizacion_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (f.numero_factura LIKE ? OR e.razon_social LIKE ? OR p.nombre LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (estado) {
      query += ' AND f.estado = ?';
      params.push(estado);
    }

    if (empresa_id) {
      query += ' AND f.empresa_id = ?';
      params.push(empresa_id);
    }

    if (paciente_id) {
      query += ' AND f.paciente_id = ?';
      params.push(paciente_id);
    }

    if (fecha_desde) {
      query += ' AND f.fecha_emision >= ?';
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ' AND f.fecha_emision <= ?';
      params.push(fecha_hasta);
    }

    query += ' ORDER BY f.fecha_emision DESC, f.created_at DESC';

    const [facturas] = await pool.execute(query, params);
    res.json({ facturas });
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
};

// Obtener una factura por ID con detalles
const getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [facturas] = await pool.execute(
      `SELECT f.*, 
        e.razon_social as empresa_nombre, e.ruc as empresa_ruc, e.contacto as empresa_contacto,
        p.nombre as paciente_nombre, p.apellido_paterno, p.apellido_materno, p.dni as paciente_dni,
        s.nombre as sede_nombre,
        u.nombre_completo as usuario_creador_nombre,
        c.numero_cotizacion
      FROM facturas f
      LEFT JOIN empresas e ON f.empresa_id = e.id
      LEFT JOIN pacientes p ON f.paciente_id = p.id
      LEFT JOIN sedes s ON f.sede_id = s.id
      LEFT JOIN usuarios u ON f.usuario_creador_id = u.id
      LEFT JOIN cotizaciones c ON f.cotizacion_id = c.id
      WHERE f.id = ?`,
      [id]
    );

    if (facturas.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const [detalles] = await pool.execute(
      `SELECT fd.*, e.nombre_examen, e.examen_principal, e.tipo_examen
      FROM factura_detalle fd
      JOIN examenes e ON fd.examen_id = e.id
      WHERE fd.factura_id = ?`,
      [id]
    );

    res.json({
      factura: facturas[0],
      detalles
    });
  } catch (error) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ error: 'Error al obtener factura' });
  }
};

// Crear una nueva factura
const createFactura = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      numero_factura, cotizacion_id, empresa_id, paciente_id, sede_id,
      fecha_emision, fecha_vencimiento, estado, tipo_comprobante,
      subtotal, descuento_total, igv, total, forma_pago, observaciones, detalles
    } = req.body;

    if (!empresa_id && !paciente_id) {
      return res.status(400).json({ error: 'Debe especificar una empresa o un paciente' });
    }

    const calculatedIGV = igv !== undefined ? igv : (subtotal || 0) * 0.18;
    const calculatedTotal = total !== undefined ? total : (subtotal || 0) + calculatedIGV - (descuento_total || 0);

    if (numero_factura) {
      const [existing] = await pool.execute(
        'SELECT id FROM facturas WHERE numero_factura = ?',
        [numero_factura]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'El número de factura ya existe' });
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.execute(
        `INSERT INTO facturas (
          numero_factura, cotizacion_id, empresa_id, paciente_id, sede_id, usuario_creador_id,
          fecha_emision, fecha_vencimiento, estado, tipo_comprobante,
          subtotal, descuento_total, igv, total, forma_pago, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numero_factura || null, cotizacion_id || null, empresa_id || null, paciente_id || null,
          sede_id, req.user.id, fecha_emision, fecha_vencimiento || null,
          estado || 'BORRADOR', tipo_comprobante || 'FACTURA',
          subtotal || 0, descuento_total || 0, calculatedIGV, calculatedTotal,
          forma_pago || null, observaciones || null
        ]
      );

      const facturaId = result.insertId;

      if (detalles && Array.isArray(detalles) && detalles.length > 0) {
        for (const detalle of detalles) {
          await connection.execute(
            `INSERT INTO factura_detalle (
              factura_id, examen_id, descripcion, cantidad, precio_unitario,
              descuento_aplicado, subtotal, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              facturaId, detalle.examen_id, detalle.descripcion || null,
              detalle.cantidad || 1, detalle.precio_unitario,
              detalle.descuento_aplicado || 0, detalle.subtotal,
              detalle.observaciones || null
            ]
          );
        }
      }

      await connection.commit();

      const [newFactura] = await pool.execute(
        `SELECT f.*, 
          e.razon_social as empresa_nombre,
          p.nombre as paciente_nombre, p.apellido_paterno, p.apellido_materno
        FROM facturas f
        LEFT JOIN empresas e ON f.empresa_id = e.id
        LEFT JOIN pacientes p ON f.paciente_id = p.id
        WHERE f.id = ?`,
        [facturaId]
      );

      res.status(201).json({
        message: 'Factura creada exitosamente',
        factura: newFactura[0]
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear factura:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El número de factura ya existe' });
    }
    res.status(500).json({ error: 'Error al crear factura' });
  }
};

// Actualizar una factura
const updateFactura = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      numero_factura, cotizacion_id, empresa_id, paciente_id, sede_id,
      fecha_emision, fecha_vencimiento, estado, tipo_comprobante,
      subtotal, descuento_total, igv, total, forma_pago, observaciones, detalles
    } = req.body;

    const [existing] = await pool.execute('SELECT id, estado FROM facturas WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (existing[0].estado !== 'BORRADOR') {
      return res.status(400).json({ 
        error: 'Solo se pueden editar facturas en estado BORRADOR' 
      });
    }

    const calculatedIGV = igv !== undefined ? igv : (subtotal || 0) * 0.18;
    const calculatedTotal = total !== undefined ? total : (subtotal || 0) + calculatedIGV - (descuento_total || 0);

    if (numero_factura) {
      const [duplicate] = await pool.execute(
        'SELECT id FROM facturas WHERE numero_factura = ? AND id != ?',
        [numero_factura, id]
      );
      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'El número de factura ya existe' });
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        `UPDATE facturas SET
          numero_factura = ?, cotizacion_id = ?, empresa_id = ?, paciente_id = ?, sede_id = ?,
          fecha_emision = ?, fecha_vencimiento = ?, estado = ?, tipo_comprobante = ?,
          subtotal = ?, descuento_total = ?, igv = ?, total = ?,
          forma_pago = ?, observaciones = ?
        WHERE id = ?`,
        [
          numero_factura || null, cotizacion_id || null, empresa_id || null, paciente_id || null, sede_id,
          fecha_emision, fecha_vencimiento || null, estado, tipo_comprobante || 'FACTURA',
          subtotal || 0, descuento_total || 0, calculatedIGV, calculatedTotal,
          forma_pago || null, observaciones || null, id
        ]
      );

      if (detalles && Array.isArray(detalles)) {
        await connection.execute('DELETE FROM factura_detalle WHERE factura_id = ?', [id]);

        for (const detalle of detalles) {
          await connection.execute(
            `INSERT INTO factura_detalle (
              factura_id, examen_id, descripcion, cantidad, precio_unitario,
              descuento_aplicado, subtotal, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id, detalle.examen_id, detalle.descripcion || null,
              detalle.cantidad || 1, detalle.precio_unitario,
              detalle.descuento_aplicado || 0, detalle.subtotal,
              detalle.observaciones || null
            ]
          );
        }
      }

      await connection.commit();

      const [updatedFactura] = await pool.execute(
        `SELECT f.*, 
          e.razon_social as empresa_nombre,
          p.nombre as paciente_nombre, p.apellido_paterno, p.apellido_materno
        FROM facturas f
        LEFT JOIN empresas e ON f.empresa_id = e.id
        LEFT JOIN pacientes p ON f.paciente_id = p.id
        WHERE f.id = ?`,
        [id]
      );

      res.json({
        message: 'Factura actualizada exitosamente',
        factura: updatedFactura[0]
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar factura:', error);
    res.status(500).json({ error: 'Error al actualizar factura' });
  }
};

// Eliminar una factura
const deleteFactura = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT id, estado FROM facturas WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (existing[0].estado !== 'BORRADOR') {
      return res.status(400).json({ 
        error: 'Solo se pueden eliminar facturas en estado BORRADOR' 
      });
    }

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
