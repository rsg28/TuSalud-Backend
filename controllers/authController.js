const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const pool = require('../config/database');
const { validationResult } = require('express-validator');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tu-salud.vercel.app';

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

    // Generar token JWT (sin expiración)
    const token = jwt.sign(
      { userId: result.insertId, email, rol: 'cliente' },
      process.env.JWT_SECRET
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

    // Generar token JWT (sin expiración)
    const token = jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET
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

// Solicitar restablecimiento de contraseña (envía correo con enlace vía Resend)
const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm) {
      return res.status(400).json({ error: 'El correo es requerido' });
    }

    const [users] = await pool.execute(
      'SELECT id, nombre_completo FROM usuarios WHERE email = ? AND activo = 1',
      [emailNorm]
    );

    // Siempre responder 200 para no revelar si el email existe (seguridad)
    const message = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.';

    if (users.length === 0) {
      return res.json({ message });
    }

    if (!resend) {
      console.error('RESEND_API_KEY no configurado');
      return res.status(503).json({ error: 'Servicio de correo no disponible. Contacta al administrador.' });
    }

    const user = users[0];
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const resetLink = `${FRONTEND_URL}/resetear-contrasena?token=${encodeURIComponent(resetToken)}`;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'TuSalud <onboarding@resend.dev>';

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: emailNorm,
      subject: 'Restablecer contraseña - TuSalud',
      html: `
        <p>Hola ${(user.nombre_completo || 'Usuario').replace(/</g, '&lt;')},</p>
        <p>Has solicitado restablecer tu contraseña en TuSalud.</p>
        <p><a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Restablecer contraseña</a></p>
        <p>Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.</p>
        <p>— TuSalud</p>
      `,
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return res.status(500).json({ error: 'No se pudo enviar el correo. Intenta más tarde.' });
    }

    res.json({ message });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

// Restablecer contraseña con el token recibido por correo
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Token y nueva contraseña (mín. 6 caracteres) son requeridos' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Enlace inválido o expirado. Solicita uno nuevo.' });
    }
    if (decoded.purpose !== 'password_reset' || !decoded.userId) {
      return res.status(400).json({ error: 'Enlace inválido' });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    await pool.execute('UPDATE usuarios SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
      password_hash,
      decoded.userId,
    ]);

    res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
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
  getCurrentUser,
  forgotPassword,
  resetPassword,
};
