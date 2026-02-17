const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Obtener todos los usuarios (con filtros)
const getAllUsuarios = async (req, res) => {
  try {
    const { search, rol, activo, fecha_creacion } = req.query;
    let query = 'SELECT id, nombre_usuario, email, nombre_completo, telefono, ruc, tipo_ruc, rol, activo, created_at FROM usuarios WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (nombre_usuario LIKE ? OR email LIKE ? OR nombre_completo LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (rol) {
      query += ' AND rol = ?';
      params.push(rol);
    }

    if (activo !== undefined) {
      query += ' AND activo = ?';
      params.push(activo === 'true');
    }

    if (fecha_creacion === 'today') {
      query += ' AND DATE(created_at) = CURDATE()';
    } else if (fecha_creacion === 'recent') {
      query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    query += ' ORDER BY created_at DESC';

    const [usuarios] = await pool.execute(query, params);
    res.json({ usuarios });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Actualizar rol de usuario
const updateUsuarioRol = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rol } = req.body;

    const validRoles = ['manager', 'vendedor', 'cliente'];
    if (!validRoles.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Verificar que el usuario existe
    const [users] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await pool.execute('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id]);

    const [updatedUser] = await pool.execute(
      'SELECT id, nombre_usuario, email, nombre_completo, telefono, ruc, tipo_ruc, rol, activo FROM usuarios WHERE id = ?',
      [id]
    );

    res.json({ message: 'Rol actualizado exitosamente', usuario: updatedUser[0] });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
};

// Activar/desactivar usuario
const toggleUsuarioActivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'El campo activo debe ser un booleano' });
    }

    // Verificar que el usuario existe
    const [users] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await pool.execute('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, id]);

    const [updatedUser] = await pool.execute(
      'SELECT id, nombre_usuario, email, nombre_completo, telefono, ruc, tipo_ruc, rol, activo FROM usuarios WHERE id = ?',
      [id]
    );

    res.json({ message: 'Estado del usuario actualizado exitosamente', usuario: updatedUser[0] });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado del usuario' });
  }
};

router.get('/', authenticateToken, requireRole('manager'), getAllUsuarios);
router.put('/:id/rol', authenticateToken, requireRole('manager'), [
  body('rol').isIn(['manager', 'vendedor', 'cliente']).withMessage('Rol inválido')
], updateUsuarioRol);
router.put('/:id/activo', authenticateToken, requireRole('manager'), toggleUsuarioActivo);

module.exports = router;
