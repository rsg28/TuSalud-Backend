const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validationResult } = require('express-validator');

// Registro de usuario
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre_usuario, email, password, nombre_completo, telefono, ruc, tipo_ruc } = req.body;

    // Verificar si el usuario o email ya existen
    const [existingUsers] = await pool.execute(
      'SELECT id FROM usuarios WHERE nombre_usuario = ? OR email = ?',
      [nombre_usuario, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario o email ya está en uso' });
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insertar nuevo usuario
    const [result] = await pool.execute(
      `INSERT INTO usuarios (nombre_usuario, email, password_hash, nombre_completo, telefono, ruc, tipo_ruc, rol, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'cliente', TRUE)`,
      [nombre_usuario, email, password_hash, nombre_completo, telefono || null, ruc || null, tipo_ruc || 'NINGUNO']
    );

    // Generar token JWT
    const token = jwt.sign(
      { userId: result.insertId, email, rol: 'cliente' },
      process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: result.insertId,
        nombre_usuario,
        email,
        nombre_completo,
        telefono: telefono || null,
        ruc: ruc || null,
        tipo_ruc: tipo_ruc || 'NINGUNO',
        rol: 'cliente'
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario por email
    const [users] = await pool.execute(
      'SELECT id, nombre_usuario, email, password_hash, nombre_completo, telefono, ruc, tipo_ruc, rol, activo FROM usuarios WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        email: user.email,
        nombre_completo: user.nombre_completo,
        telefono: user.telefono,
        ruc: user.ruc,
        tipo_ruc: user.tipo_ruc,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// Obtener información del usuario actual
const getCurrentUser = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, nombre_usuario, email, nombre_completo, telefono, ruc, tipo_ruc, rol, activo, created_at FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];
    delete user.password_hash;

    res.json({ user });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser
};
