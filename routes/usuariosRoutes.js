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

// Obtener la empresa de un usuario (usuarios.empresa_id). Solo cliente tiene empresa.
const getEmpresaByUsuarioId = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'ID de usuario no válido' });
    }

    // Solo el propio usuario o un manager puede ver la empresa del usuario
    if (req.user.id !== userId && req.user.rol !== 'manager') {
      return res.status(403).json({ error: 'No puedes consultar la empresa de otro usuario' });
    }

    const [users] = await pool.execute(
      'SELECT id, empresa_id FROM usuarios WHERE id = ?',
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const empresaId = users[0].empresa_id;
    if (empresaId == null) {
      return res.json({ empresa: null });
    }

    const [empresas] = await pool.execute('SELECT * FROM empresas WHERE id = ?', [empresaId]);
    if (empresas.length === 0) {
      return res.json({ empresa: null });
    }

    res.json({ empresa: empresas[0] });
  } catch (error) {
    console.error('Error al obtener empresa del usuario:', error);
    res.status(500).json({ error: 'Error al obtener empresa del usuario' });
  }
};

// Quitar la empresa asignada al usuario (usuarios.empresa_id = NULL).
const deleteEmpresaByUsuarioId = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'ID de usuario no válido' });
    }
    if (req.user.id !== userId && req.user.rol !== 'manager') {
      return res.status(403).json({ error: 'No puedes modificar la empresa de otro usuario' });
    }

    const [users] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await pool.execute('UPDATE usuarios SET empresa_id = NULL WHERE id = ?', [userId]);
    res.json({ message: 'Empresa quitada del usuario', empresa: null });
  } catch (error) {
    console.error('Error al quitar empresa del usuario:', error);
    res.status(500).json({ error: 'Error al quitar empresa del usuario' });
  }
};

// Asignar o crear y asignar empresa al usuario.
// Body: { empresa_id: number } para asignar existente, o { razon_social, ruc?, direccion?, contacto? } para crear nueva y asignar.
const setEmpresaByUsuarioId = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'ID de usuario no válido' });
    }
    if (req.user.id !== userId && req.user.rol !== 'manager') {
      return res.status(403).json({ error: 'No puedes modificar la empresa de otro usuario' });
    }

    const [users] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { empresa_id, razon_social, ruc, direccion, contacto } = req.body || {};
    let empresaIdToSet = null;

    if (empresa_id != null && Number.isInteger(Number(empresa_id))) {
      // Asignar empresa existente
      const [emp] = await pool.execute('SELECT id FROM empresas WHERE id = ?', [Number(empresa_id)]);
      if (emp.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }
      empresaIdToSet = emp[0].id;
    } else if (razon_social && typeof razon_social === 'string' && razon_social.trim()) {
      // Crear nueva empresa y asignar
      const razon = razon_social.trim();
      if (ruc && String(ruc).trim().length !== 0 && String(ruc).trim().length !== 11) {
        return res.status(400).json({ error: 'El RUC debe tener 11 dígitos' });
      }
      const [existingNombre] = await pool.execute(
        'SELECT id FROM empresas WHERE LOWER(TRIM(razon_social)) = LOWER(?)',
        [razon]
      );
      if (existingNombre.length > 0) {
        return res.status(400).json({ error: 'Ya existe una empresa con esa razón social' });
      }
      const rucVal = ruc && String(ruc).trim() ? String(ruc).trim() : null;
      if (rucVal) {
        const [existingRuc] = await pool.execute('SELECT id FROM empresas WHERE ruc = ?', [rucVal]);
        if (existingRuc.length > 0) {
          return res.status(400).json({ error: 'El RUC ya está registrado' });
        }
      }
      const [result] = await pool.execute(
        `INSERT INTO empresas (razon_social, ruc, direccion, contacto) VALUES (?, ?, ?, ?)`,
        [razon, rucVal, (direccion && String(direccion).trim()) || null, (contacto && String(contacto).trim()) || null]
      );
      empresaIdToSet = result.insertId;
    } else {
      return res.status(400).json({ error: 'Indica empresa_id (para asignar existente) o razon_social (para crear nueva)' });
    }

    await pool.execute('UPDATE usuarios SET empresa_id = ? WHERE id = ?', [empresaIdToSet, userId]);
    const [empresas] = await pool.execute('SELECT * FROM empresas WHERE id = ?', [empresaIdToSet]);
    res.status(200).json({ message: 'Empresa asignada', empresa: empresas[0] });
  } catch (error) {
    console.error('Error al asignar empresa al usuario:', error);
    res.status(500).json({ error: 'Error al asignar empresa al usuario' });
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
router.get('/:id/empresa', authenticateToken, getEmpresaByUsuarioId);
router.delete('/:id/empresa', authenticateToken, deleteEmpresaByUsuarioId);
router.post('/:id/empresa', authenticateToken, setEmpresaByUsuarioId);
router.put('/:id/rol', authenticateToken, requireRole('manager'), [
  body('rol').isIn(['manager', 'vendedor', 'cliente']).withMessage('Rol inválido')
], updateUsuarioRol);
router.put('/:id/activo', authenticateToken, requireRole('manager'), toggleUsuarioActivo);

module.exports = router;
