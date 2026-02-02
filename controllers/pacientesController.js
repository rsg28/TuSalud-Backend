const pool = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todos los pacientes
const getAllPacientes = async (req, res) => {
  try {
    const { search, empresa_id, estado } = req.query;
    let query = 'SELECT * FROM pacientes WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (nombre LIKE ? OR apellido_paterno LIKE ? OR apellido_materno LIKE ? OR dni LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (empresa_id) {
      query += ' AND empresa_id = ?';
      params.push(empresa_id);
    }

    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY created_at DESC';

    const [pacientes] = await pool.execute(query, params);
    res.json({ pacientes });
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
};

// Obtener un paciente por ID
const getPacienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const [pacientes] = await pool.execute('SELECT * FROM pacientes WHERE id = ?', [id]);

    if (pacientes.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json({ paciente: pacientes[0] });
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
};

// Crear un nuevo paciente
const createPaciente = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      tipo_documento, dni, apellido_paterno, apellido_materno, nombre, sexo,
      fecha_nacimiento, edad, estado_civil, seguro_vida, estudios_academicos,
      profesion, correo_electronico, celular, telefono_fijo, codigo_trabajador,
      empresa_id, centro_costo, departamento, provincia, distrito, nacionalidad,
      ubigeo, direccion
    } = req.body;

    // Verificar si el DNI ya existe
    if (dni) {
      const [existing] = await pool.execute('SELECT id FROM pacientes WHERE dni = ?', [dni]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'El DNI ya está registrado' });
      }
    }

    // Calcular edad si no se proporciona
    let calculatedAge = edad;
    if (!calculatedAge && fecha_nacimiento) {
      const birthDate = new Date(fecha_nacimiento);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO pacientes (
        tipo_documento, dni, apellido_paterno, apellido_materno, nombre, sexo,
        fecha_nacimiento, edad, estado_civil, seguro_vida, estudios_academicos,
        profesion, correo_electronico, celular, telefono_fijo, codigo_trabajador,
        empresa_id, centro_costo, departamento, provincia, distrito, nacionalidad,
        ubigeo, direccion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tipo_documento || null, dni || null, apellido_paterno || null, apellido_materno || null,
        nombre || null, sexo || null, fecha_nacimiento || null, calculatedAge || null,
        estado_civil || null, seguro_vida || null, estudios_academicos || null,
        profesion || null, correo_electronico || null, celular || null, telefono_fijo || null,
        codigo_trabajador || null, empresa_id || null, centro_costo || null,
        departamento || null, provincia || null, distrito || null, nacionalidad || null,
        ubigeo || null, direccion || null
      ]
    );

    const [newPaciente] = await pool.execute('SELECT * FROM pacientes WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Paciente creado exitosamente', paciente: newPaciente[0] });
  } catch (error) {
    console.error('Error al crear paciente:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El DNI ya está registrado' });
    }
    res.status(500).json({ error: 'Error al crear paciente' });
  }
};

// Actualizar un paciente
const updatePaciente = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      tipo_documento, dni, apellido_paterno, apellido_materno, nombre, sexo,
      fecha_nacimiento, edad, estado_civil, seguro_vida, estudios_academicos,
      profesion, correo_electronico, celular, telefono_fijo, codigo_trabajador,
      empresa_id, centro_costo, departamento, provincia, distrito, nacionalidad,
      ubigeo, direccion
    } = req.body;

    // Verificar si el paciente existe
    const [existing] = await pool.execute('SELECT id FROM pacientes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    // Verificar si el DNI ya existe en otro paciente
    if (dni) {
      const [duplicate] = await pool.execute('SELECT id FROM pacientes WHERE dni = ? AND id != ?', [dni, id]);
      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'El DNI ya está registrado en otro paciente' });
      }
    }

    // Calcular edad si cambió la fecha de nacimiento
    let calculatedAge = edad;
    if (!calculatedAge && fecha_nacimiento) {
      const birthDate = new Date(fecha_nacimiento);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }

    await pool.execute(
      `UPDATE pacientes SET
        tipo_documento = ?, dni = ?, apellido_paterno = ?, apellido_materno = ?, nombre = ?, sexo = ?,
        fecha_nacimiento = ?, edad = ?, estado_civil = ?, seguro_vida = ?, estudios_academicos = ?,
        profesion = ?, correo_electronico = ?, celular = ?, telefono_fijo = ?, codigo_trabajador = ?,
        empresa_id = ?, centro_costo = ?, departamento = ?, provincia = ?, distrito = ?, nacionalidad = ?,
        ubigeo = ?, direccion = ?
      WHERE id = ?`,
      [
        tipo_documento || null, dni || null, apellido_paterno || null, apellido_materno || null,
        nombre || null, sexo || null, fecha_nacimiento || null, calculatedAge || null,
        estado_civil || null, seguro_vida || null, estudios_academicos || null,
        profesion || null, correo_electronico || null, celular || null, telefono_fijo || null,
        codigo_trabajador || null, empresa_id || null, centro_costo || null,
        departamento || null, provincia || null, distrito || null, nacionalidad || null,
        ubigeo || null, direccion || null, id
      ]
    );

    const [updatedPaciente] = await pool.execute('SELECT * FROM pacientes WHERE id = ?', [id]);
    res.json({ message: 'Paciente actualizado exitosamente', paciente: updatedPaciente[0] });
  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El DNI ya está registrado' });
    }
    res.status(500).json({ error: 'Error al actualizar paciente' });
  }
};

// Eliminar un paciente
const deletePaciente = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el paciente existe
    const [existing] = await pool.execute('SELECT id FROM pacientes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    // Verificar si hay citas o evaluaciones asociadas
    const [citas] = await pool.execute('SELECT id FROM citas WHERE paciente_id = ? LIMIT 1', [id]);
    if (citas.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el paciente porque tiene citas o evaluaciones asociadas' 
      });
    }

    await pool.execute('DELETE FROM pacientes WHERE id = ?', [id]);
    res.json({ message: 'Paciente eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    res.status(500).json({ error: 'Error al eliminar paciente' });
  }
};

module.exports = {
  getAllPacientes,
  getPacienteById,
  createPaciente,
  updatePaciente,
  deletePaciente
};
