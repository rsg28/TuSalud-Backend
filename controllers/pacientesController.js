const pool = require('../config/database');
const { validationResult } = require('express-validator');

// En el nuevo esquema los "pacientes" son pedido_pacientes (empleados por pedido).

// Listar pacientes: por pedido_id (obligatorio) o todos si no se filtra
const getAllPacientes = async (req, res) => {
  try {
    const { pedido_id, search } = req.query;
    let query = `
      SELECT pp.*, p.numero_pedido
      FROM pedido_pacientes pp
      JOIN pedidos p ON pp.pedido_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (pedido_id) {
      query += ' AND pp.pedido_id = ?';
      params.push(pedido_id);
    }

    if (search) {
      query += ' AND (pp.nombre_completo LIKE ? OR pp.dni LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    query += ' ORDER BY pp.pedido_id DESC, pp.nombre_completo';

    const [pacientes] = await pool.execute(query, params);

    // Opcional: cargar exámenes asignados y completados por paciente
    for (const pa of pacientes) {
      const [asignados] = await pool.execute(
        'SELECT examen_id FROM paciente_examen_asignado WHERE paciente_id = ?',
        [pa.id]
      );
      const [completados] = await pool.execute(
        'SELECT examen_id FROM paciente_examen_completado WHERE paciente_id = ?',
        [pa.id]
      );
      pa.examenes_asignados = asignados.map(a => a.examen_id);
      pa.examenes_completados = completados.map(c => c.examen_id);
    }

    res.json({ pacientes });
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
};

// Obtener un paciente por ID (pedido_pacientes.id)
const getPacienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT pp.*, p.numero_pedido, p.empresa_id
       FROM pedido_pacientes pp
       JOIN pedidos p ON pp.pedido_id = p.id
       WHERE pp.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const [asignados] = await pool.execute(
      'SELECT examen_id FROM paciente_examen_asignado WHERE paciente_id = ?',
      [id]
    );
    const [completados] = await pool.execute(
      'SELECT examen_id, fecha_completado FROM paciente_examen_completado WHERE paciente_id = ?',
      [id]
    );

    res.json({
      paciente: {
        ...rows[0],
        examenes_asignados: asignados.map(a => a.examen_id),
        examenes_completados: completados
      }
    });
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
};

// Crear paciente (en un pedido)
const createPaciente = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pedido_id, dni, nombre_completo, cargo, area, examenes } = req.body;

    if (!pedido_id || !dni || !nombre_completo) {
      return res.status(400).json({ error: 'pedido_id, dni y nombre_completo son requeridos' });
    }

    const [result] = await pool.execute(
      `INSERT INTO pedido_pacientes (pedido_id, dni, nombre_completo, cargo, area)
       VALUES (?, ?, ?, ?, ?)`,
      [pedido_id, dni, nombre_completo || null, cargo || null, area || null]
    );

    const pacienteId = result.insertId;

    if (examenes && Array.isArray(examenes) && examenes.length > 0) {
      for (const examen_id of examenes) {
        await pool.execute(
          'INSERT IGNORE INTO paciente_examen_asignado (paciente_id, examen_id) VALUES (?, ?)',
          [pacienteId, examen_id]
        );
      }
    }

    const [newPaciente] = await pool.execute(
      'SELECT * FROM pedido_pacientes WHERE id = ?',
      [pacienteId]
    );
    res.status(201).json({ message: 'Paciente creado exitosamente', paciente: newPaciente[0] });
  } catch (error) {
    console.error('Error al crear paciente:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya existe un paciente con ese DNI en este pedido' });
    }
    res.status(500).json({ error: 'Error al crear paciente' });
  }
};

// Actualizar paciente
const updatePaciente = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { dni, nombre_completo, cargo, area, examenes } = req.body;

    const [existing] = await pool.execute('SELECT id FROM pedido_pacientes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    await pool.execute(
      `UPDATE pedido_pacientes SET
        dni = COALESCE(?, dni),
        nombre_completo = COALESCE(?, nombre_completo),
        cargo = ?, area = ?
      WHERE id = ?`,
      [dni || null, nombre_completo || null, cargo || null, area || null, id]
    );

    if (examenes && Array.isArray(examenes)) {
      await pool.execute('DELETE FROM paciente_examen_asignado WHERE paciente_id = ?', [id]);
      for (const examen_id of examenes) {
        await pool.execute(
          'INSERT IGNORE INTO paciente_examen_asignado (paciente_id, examen_id) VALUES (?, ?)',
          [id, examen_id]
        );
      }
    }

    const [updated] = await pool.execute('SELECT * FROM pedido_pacientes WHERE id = ?', [id]);
    res.json({ message: 'Paciente actualizado exitosamente', paciente: updated[0] });
  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    res.status(500).json({ error: 'Error al actualizar paciente' });
  }
};

// Marcar examen completado
const marcarExamenCompletado = async (req, res) => {
  try {
    const { id } = req.params;
    const { examen_id, completado } = req.body;

    if (!examen_id) {
      return res.status(400).json({ error: 'examen_id es requerido' });
    }

    const [pac] = await pool.execute('SELECT id FROM pedido_pacientes WHERE id = ?', [id]);
    if (pac.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    if (completado !== false) {
      await pool.execute(
        `INSERT IGNORE INTO paciente_examen_completado (paciente_id, examen_id) VALUES (?, ?)`,
        [id, examen_id]
      );
    } else {
      await pool.execute(
        'DELETE FROM paciente_examen_completado WHERE paciente_id = ? AND examen_id = ?',
        [id, examen_id]
      );
    }

    res.json({ message: completado !== false ? 'Examen marcado como completado' : 'Examen desmarcado' });
  } catch (error) {
    console.error('Error al marcar examen:', error);
    res.status(500).json({ error: 'Error al actualizar estado del examen' });
  }
};

// Eliminar paciente
const deletePaciente = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT id FROM pedido_pacientes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    await pool.execute('DELETE FROM pedido_pacientes WHERE id = ?', [id]);
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
  deletePaciente,
  marcarExamenCompletado
};
