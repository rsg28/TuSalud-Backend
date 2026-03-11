const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const crypto = require('crypto');
const pool = require('../config/database');
const { validationResult } = require('express-validator');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tu-salud.vercel.app';

const PASSWORD_RESET_CODE_TTL_MINUTES = 10;

function generarCodigoReset() {
  // 6 dígitos
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
}

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
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'TuSalud <onboarding@resend.dev>';

    // Código OTP (10 min). Se guarda hasheado en DB (tabla password_reset_codes).
    const codigo = generarCodigoReset();
    const codigoHash = await bcrypt.hash(codigo, 10);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000);
    try {
      await pool.execute('DELETE FROM password_reset_codes WHERE user_id = ?', [user.id]);
      await pool.execute(
        'INSERT INTO password_reset_codes (user_id, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)',
        [user.id, codigoHash, expiresAt]
      );
    } catch (dbErr) {
      console.error('[forgotPassword] No se pudo guardar OTP en DB:', dbErr);
      // No revelamos detalles, pero el flujo por enlace todavía puede funcionar
    }

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: emailNorm,
      subject: 'Restablecer contraseña - TuSalud',
      html: `
        <p>Hola ${(user.nombre_completo || 'Usuario').replace(/</g, '&lt;')},</p>
        <p>Has solicitado restablecer tu contraseña en TuSalud.</p>
        <p><strong>Tu código de verificación es:</strong></p>
        <p style="font-size:24px;letter-spacing:4px;font-weight:700;margin:8px 0;">${codigo}</p>
        <p>Este código expira en ${PASSWORD_RESET_CODE_TTL_MINUTES} minutos.</p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
        <p>— TuSalud</p>
      `,
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return res.status(500).json({ error: 'No se pudo enviar el correo. Intenta más tarde.' });
    }
    if (sendData?.id) {
      console.log('[forgotPassword] Resend enviado. id:', sendData.id, 'to:', emailNorm);
    } else {
      console.log('[forgotPassword] Resend enviado (sin id). to:', emailNorm);
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
    const { token, email, codigo, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Nueva contraseña (mín. 6 caracteres) es requerida' });
    }

    let userId = null;
    if (token && typeof token === 'string' && token.trim()) {
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return res.status(400).json({ error: 'Enlace inválido o expirado. Solicita uno nuevo.' });
      }
      if (decoded.purpose !== 'password_reset' || !decoded.userId) {
        return res.status(400).json({ error: 'Enlace inválido' });
      }
      userId = decoded.userId;
    } else {
      const emailNorm = (email || '').trim().toLowerCase();
      const codigoStr = String(codigo || '').trim();
      if (!emailNorm || !codigoStr) {
        return res.status(400).json({ error: 'Email y código son requeridos' });
      }
      const [users] = await pool.execute('SELECT id FROM usuarios WHERE email = ? AND activo = 1', [emailNorm]);
      if (users.length === 0) {
        return res.status(400).json({ error: 'Código inválido o expirado. Solicita uno nuevo.' });
      }
      userId = users[0].id;

      const [rows] = await pool.execute(
        'SELECT id, code_hash, expires_at, attempts FROM password_reset_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [userId]
      );
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Código inválido o expirado. Solicita uno nuevo.' });
      }
      const row = rows[0];
      const exp = new Date(row.expires_at);
      if (Number.isNaN(exp.getTime()) || exp.getTime() < Date.now()) {
        return res.status(400).json({ error: 'Código expirado. Solicita uno nuevo.' });
      }
      if ((row.attempts || 0) >= 5) {
        return res.status(400).json({ error: 'Demasiados intentos. Solicita un nuevo código.' });
      }
      const ok = await bcrypt.compare(codigoStr, row.code_hash);
      if (!ok) {
        await pool.execute('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = ?', [row.id]);
        return res.status(400).json({ error: 'Código inválido. Revisa tu correo e inténtalo de nuevo.' });
      }
      // Consumir el código
      await pool.execute('DELETE FROM password_reset_codes WHERE user_id = ?', [userId]);
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    await pool.execute('UPDATE usuarios SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
      password_hash,
      userId,
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
