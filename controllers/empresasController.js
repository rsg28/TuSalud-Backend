const pool = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todas las empresas
const getAllEmpresas = async (req, res) => {
  try {
    const { search, estado, tipo_persona } = req.query;
    let query = 'SELECT * FROM empresas WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (razon_social LIKE ? OR ruc LIKE ? OR contacto LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    if (tipo_persona) {
      query += ' AND tipo_persona = ?';
      params.push(tipo_persona);
    }

    query += ' ORDER BY created_at DESC';

    const [empresas] = await pool.execute(query, params);
    res.json({ empresas });
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
};

// Empresas asociadas al usuario actual (usuario_empresa)
const getMisEmpresas = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    const [empresas] = await pool.execute(
      `SELECT e.* FROM empresas e
       INNER JOIN usuario_empresa ue ON ue.empresa_id = e.id
       WHERE ue.usuario_id = ?
       ORDER BY ue.es_principal DESC, e.razon_social ASC`,
      [req.user.id]
    );
    res.json({ empresas });
  } catch (error) {
    console.error('Error al obtener mis empresas:', error);
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
};

// Obtener una empresa por ID
const getEmpresaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [empresas] = await pool.execute('SELECT * FROM empresas WHERE id = ?', [id]);

    if (empresas.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ empresa: empresas[0] });
  } catch (error) {
    console.error('Error al obtener empresa:', error);
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
};

// Crear una nueva empresa
const createEmpresa = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      codigo, ruc, razon_social, tipo_persona, tipo_documento, dni,
      ap_paterno, ap_materno, nombres_completos, direccion, celular,
      contacto, email, actividad_empresa, ubigeo, ciudad, condicion, departamento, estado,
      nombre_responsable_pagos, telefono_responsable_pagos, correo_responsable_pagos,
      direccion_oficina_pagos, fecha_presentacion_facturas
    } = req.body;

    // Verificar si ya existe una empresa con la misma razón social (sin distinguir mayúsculas)
    const razonNorm = (razon_social || '').trim();
    if (razonNorm) {
      const [existingNombre] = await pool.execute(
        'SELECT id FROM empresas WHERE LOWER(TRIM(razon_social)) = LOWER(?)',
        [razonNorm]
      );
      if (existingNombre.length > 0) {
        return res.status(400).json({ error: 'Ya existe una empresa con esa razón social' });
      }
    }

    // Verificar si el RUC ya existe
    if (ruc) {
      const [existing] = await pool.execute('SELECT id FROM empresas WHERE ruc = ?', [ruc]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'El RUC ya está registrado' });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO empresas (
        codigo, ruc, razon_social, tipo_persona, tipo_documento, dni,
        ap_paterno, ap_materno, nombres_completos, direccion, celular,
        contacto, email, actividad_empresa, ubigeo, ciudad, condicion, departamento, estado,
        nombre_responsable_pagos, telefono_responsable_pagos, correo_responsable_pagos,
        direccion_oficina_pagos, fecha_presentacion_facturas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo || null, ruc || null, razon_social, tipo_persona || null, tipo_documento || null, dni || null,
        ap_paterno || null, ap_materno || null, nombres_completos || null, direccion || null, celular || null,
        contacto || null, email || null, actividad_empresa || null, ubigeo || null, ciudad || null,
        condicion || null, departamento || null, estado || null, nombre_responsable_pagos || null, telefono_responsable_pagos || null,
        correo_responsable_pagos || null, direccion_oficina_pagos || null, fecha_presentacion_facturas || null
      ]
    );

    const empresaId = result.insertId;
    // Si quien crea es un cliente, asociar la empresa al usuario (uno puede tener varias)
    if (req.user && req.user.rol === 'cliente') {
      await pool.execute(
        'INSERT INTO usuario_empresa (usuario_id, empresa_id, es_principal) VALUES (?, ?, 1)',
        [req.user.id, empresaId]
      );
    }
    const [newEmpresa] = await pool.execute('SELECT * FROM empresas WHERE id = ?', [empresaId]);
    res.status(201).json({ message: 'Empresa creada exitosamente', empresa: newEmpresa[0] });
  } catch (error) {
    console.error('Error al crear empresa:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El RUC ya está registrado' });
    }
    res.status(500).json({ error: 'Error al crear empresa' });
  }
};

// Actualizar una empresa
const updateEmpresa = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      codigo, ruc, razon_social, tipo_persona, tipo_documento, dni,
      ap_paterno, ap_materno, nombres_completos, direccion, celular,
      contacto, email, actividad_empresa, ubigeo, ciudad, condicion, departamento, estado,
      nombre_responsable_pagos, telefono_responsable_pagos, correo_responsable_pagos,
      direccion_oficina_pagos, fecha_presentacion_facturas
    } = req.body;

    // Verificar si la empresa existe
    const [existing] = await pool.execute('SELECT id FROM empresas WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Verificar si el RUC ya existe en otra empresa
    if (ruc) {
      const [duplicate] = await pool.execute('SELECT id FROM empresas WHERE ruc = ? AND id != ?', [ruc, id]);
      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'El RUC ya está registrado en otra empresa' });
      }
    }

    await pool.execute(
      `UPDATE empresas SET
        codigo = ?, ruc = ?, razon_social = ?, tipo_persona = ?, tipo_documento = ?, dni = ?,
        ap_paterno = ?, ap_materno = ?, nombres_completos = ?, direccion = ?, celular = ?,
        contacto = ?, email = ?, actividad_empresa = ?, ubigeo = ?, ciudad = ?, condicion = ?, departamento = ?, estado = ?,
        nombre_responsable_pagos = ?, telefono_responsable_pagos = ?, correo_responsable_pagos = ?,
        direccion_oficina_pagos = ?, fecha_presentacion_facturas = ?
      WHERE id = ?`,
      [
        codigo || null, ruc || null, razon_social, tipo_persona || null, tipo_documento || null, dni || null,
        ap_paterno || null, ap_materno || null, nombres_completos || null, direccion || null, celular || null,
        contacto || null, email || null, actividad_empresa || null, ubigeo || null, ciudad || null,
        condicion || null, departamento || null, estado || null, nombre_responsable_pagos || null, telefono_responsable_pagos || null,
        correo_responsable_pagos || null, direccion_oficina_pagos || null, fecha_presentacion_facturas || null,
        id
      ]
    );

    const [updatedEmpresa] = await pool.execute('SELECT * FROM empresas WHERE id = ?', [id]);
    res.json({ message: 'Empresa actualizada exitosamente', empresa: updatedEmpresa[0] });
  } catch (error) {
    console.error('Error al actualizar empresa:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El RUC ya está registrado' });
    }
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
};

// Eliminar una empresa
const deleteEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la empresa existe
    const [existing] = await pool.execute('SELECT id FROM empresas WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Verificar si hay pedidos asociados
    const [pedidos] = await pool.execute('SELECT id FROM pedidos WHERE empresa_id = ? LIMIT 1', [id]);
    if (pedidos.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la empresa porque tiene pedidos asociados' 
      });
    }

    await pool.execute('DELETE FROM empresas WHERE id = ?', [id]);
    res.json({ message: 'Empresa eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
};

module.exports = {
  getAllEmpresas,
  getMisEmpresas,
  getEmpresaById,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa
};
