const pool = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todas las cotizaciones
const getAllCotizaciones = async (req, res) => {
  try {
    const { search, estado, empresa_id, paciente_id, fecha_desde, fecha_hasta } = req.query;
    let query = `
      SELECT c.*, 
        e.razon_social as empresa_nombre, e.ruc as empresa_ruc,
        p.nombre as paciente_nombre, p.apellido_paterno, p.apellido_materno, p.dni as paciente_dni
      FROM cotizaciones c
      LEFT JOIN empresas e ON c.empresa_id = e.id
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (c.numero_cotizacion LIKE ? OR e.razon_social LIKE ? OR p.nombre LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (estado) {
      query += ' AND c.estado = ?';
      params.push(estado);
    }

    if (empresa_id) {
      query += ' AND c.empresa_id = ?';
      params.push(empresa_id);
    }

    if (paciente_id) {
      query += ' AND c.paciente_id = ?';
      params.push(paciente_id);
    }

    if (fecha_desde) {
      query += ' AND c.fecha_cotizacion >= ?';
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ' AND c.fecha_cotizacion <= ?';
      params.push(fecha_hasta);
    }

    query += ' ORDER BY c.fecha_cotizacion DESC, c.created_at DESC';

    const [cotizaciones] = await pool.execute(query, params);
    res.json({ cotizaciones });
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
};

// Obtener una cotización por ID con detalles
const getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [cotizaciones] = await pool.execute(
      `SELECT c.*, 
        e.razon_social as empresa_nombre, e.ruc as empresa_ruc, e.contacto as empresa_contacto,
        p.nombre as paciente_nombre, p.apellido_paterno, p.apellido_materno, p.dni as paciente_dni,
        s.nombre as sede_nombre,
        u.nombre_completo as usuario_creador_nombre
      FROM cotizaciones c
      LEFT JOIN empresas e ON c.empresa_id = e.id
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN sedes s ON c.sede_id = s.id
      LEFT JOIN usuarios u ON c.usuario_creador_id = u.id
      WHERE c.id = ?`,
      [id]
    );

    if (cotizaciones.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const [detalles] = await pool.execute(
      `SELECT cd.*, e.nombre_examen, e.examen_principal, e.tipo_examen
      FROM cotizacion_detalle cd
      JOIN examenes e ON cd.examen_id = e.id
      WHERE cd.cotizacion_id = ?`,
      [id]
    );

    res.json({
      cotizacion: cotizaciones[0],
      detalles
    });
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};

// Crear una nueva cotización
const createCotizacion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      numero_cotizacion, empresa_id, paciente_id, sede_id, fecha_cotizacion,
      fecha_vencimiento, estado, subtotal, descuento_total, total,
      observaciones, condiciones_pago, validez_dias, detalles
    } = req.body;

    if (!empresa_id && !paciente_id) {
      return res.status(400).json({ error: 'Debe especificar una empresa o un paciente' });
    }

    if (numero_cotizacion) {
      const [existing] = await pool.execute(
        'SELECT id FROM cotizaciones WHERE numero_cotizacion = ?',
        [numero_cotizacion]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'El número de cotización ya existe' });
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.execute(
        `INSERT INTO cotizaciones (
          numero_cotizacion, empresa_id, paciente_id, sede_id, usuario_creador_id,
          fecha_cotizacion, fecha_vencimiento, estado, subtotal, descuento_total,
          total, observaciones, condiciones_pago, validez_dias
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numero_cotizacion || null, empresa_id || null, paciente_id || null, sede_id,
          req.user.id, fecha_cotizacion, fecha_vencimiento || null,
          estado || 'BORRADOR', subtotal || 0, descuento_total || 0, total || 0,
          observaciones || null, condiciones_pago || null, validez_dias || 30
        ]
      );

      const cotizacionId = result.insertId;

      if (detalles && Array.isArray(detalles) && detalles.length > 0) {
        for (const detalle of detalles) {
          await connection.execute(
            `INSERT INTO cotizacion_detalle (
              cotizacion_id, examen_id, descripcion, cantidad, precio_lista,
              tipo_descuento, valor_descuento, descuento_aplicado, precio_final, subtotal, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cotizacionId, detalle.examen_id, detalle.descripcion || null,
              detalle.cantidad || 1, detalle.precio_lista, detalle.tipo_descuento || 'NINGUNO',
              detalle.valor_descuento || 0, detalle.descuento_aplicado || 0,
              detalle.precio_final, detalle.subtotal, detalle.observaciones || null
            ]
          );
        }
      }

      await connection.commit();

      const [newCotizacion] = await pool.execute(
        `SELECT c.*, 
          e.razon_social as empresa_nombre,
          p.nombre as paciente_nombre, p.apellido_paterno, p.apellido_materno
        FROM cotizaciones c
        LEFT JOIN empresas e ON c.empresa_id = e.id
        LEFT JOIN pacientes p ON c.paciente_id = p.id
        WHERE c.id = ?`,
        [cotizacionId]
      );

      res.status(201).json({
        message: 'Cotización creada exitosamente',
        cotizacion: newCotizacion[0]
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear cotización:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El número de cotización ya existe' });
    }
    res.status(500).json({ error: 'Error al crear cotización' });
  }
};

// Actualizar una cotización
const updateCotizacion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      numero_cotizacion, empresa_id, paciente_id, sede_id, fecha_cotizacion,
      fecha_vencimiento, estado, subtotal, descuento_total, total,
      observaciones, condiciones_pago, validez_dias, detalles
    } = req.body;

    const [existing] = await pool.execute('SELECT id FROM cotizaciones WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    if (numero_cotizacion) {
      const [duplicate] = await pool.execute(
        'SELECT id FROM cotizaciones WHERE numero_cotizacion = ? AND id != ?',
        [numero_cotizacion, id]
      );
      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'El número de cotización ya existe' });
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        `UPDATE cotizaciones SET
          numero_cotizacion = ?, empresa_id = ?, paciente_id = ?, sede_id = ?,
          fecha_cotizacion = ?, fecha_vencimiento = ?, estado = ?,
          subtotal = ?, descuento_total = ?, total = ?,
          observaciones = ?, condiciones_pago = ?, validez_dias = ?
        WHERE id = ?`,
        [
          numero_cotizacion || null, empresa_id || null, paciente_id || null, sede_id,
          fecha_cotizacion, fecha_vencimiento || null, estado,
          subtotal || 0, descuento_total || 0, total || 0,
          observaciones || null, condiciones_pago || null, validez_dias || 30,
          id
        ]
      );

      if (detalles && Array.isArray(detalles)) {
        await connection.execute('DELETE FROM cotizacion_detalle WHERE cotizacion_id = ?', [id]);

        for (const detalle of detalles) {
          await connection.execute(
            `INSERT INTO cotizacion_detalle (
              cotizacion_id, examen_id, descripcion, cantidad, precio_lista,
              tipo_descuento, valor_descuento, descuento_aplicado, precio_final, subtotal, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id, detalle.examen_id, detalle.descripcion || null,
              detalle.cantidad || 1, detalle.precio_lista, detalle.tipo_descuento || 'NINGUNO',
              detalle.valor_descuento || 0, detalle.descuento_aplicado || 0,
              detalle.precio_final, detalle.subtotal, detalle.observaciones || null
            ]
          );
        }
      }

      await connection.commit();

      const [updatedCotizacion] = await pool.execute(
        `SELECT c.*, 
          e.razon_social as empresa_nombre,
          p.nombre as paciente_nombre, p.apellido_paterno, p.apellido_materno
        FROM cotizaciones c
        LEFT JOIN empresas e ON c.empresa_id = e.id
        LEFT JOIN pacientes p ON c.paciente_id = p.id
        WHERE c.id = ?`,
        [id]
      );

      res.json({
        message: 'Cotización actualizada exitosamente',
        cotizacion: updatedCotizacion[0]
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
};

// Eliminar una cotización
const deleteCotizacion = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT id, estado FROM cotizaciones WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    if (existing[0].estado !== 'BORRADOR') {
      return res.status(400).json({ 
        error: 'Solo se pueden eliminar cotizaciones en estado BORRADOR' 
      });
    }

    await pool.execute('DELETE FROM cotizaciones WHERE id = ?', [id]);
    res.json({ message: 'Cotización eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
};

module.exports = {
  getAllCotizaciones,
  getCotizacionById,
  createCotizacion,
  updateCotizacion,
  deleteCotizacion
};
