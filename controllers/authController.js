const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const crypto = require('crypto');
const pool = require('../config/database');
const { validationResult } = require('express-validator');
const { resolveEmpresaId, rucSoloDigitos } = require('../utils/resolveEmpresaId');
const { issueUserToken, rotateUserSession } = require('../utils/authSession');
const {
  helpers: { emitirNotificacion },
} = require('./notificacionesController');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tu-salud.vercel.app';

const PASSWORD_RESET_CODE_TTL_MINUTES = 10;

function generarCodigoReset() {
  // 6 dígitos
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
}

/**
 * Registro de usuario público.
 *
 * Roles permitidos: 'cliente' (default) | 'paciente'.
 * Roles internos (vendedor/manager) se crean por administración, no aquí.
 *
 * Datos demográficos opcionales: dni, fecha_nacimiento, sexo, direccion.
 * Para rol = 'paciente', dni es obligatorio (link con pedido_pacientes).
 *
 * Si rol = 'cliente', debe indicar razón social y RUC de la empresa que representará.
 * Se enlaza o crea la empresa automáticamente al registrarse.
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nombre_usuario,
      email,
      password,
      nombre_completo,
      telefono,
      dni,
      ruc,
      tipo_ruc,
      razon_social,
      empresa_direccion,
      empresa_contacto,
      fecha_nacimiento,
      sexo,
      direccion,
    } = req.body;
    const rolSolicitado = req.body.rol === 'paciente' ? 'paciente' : 'cliente';

    // Verificar si el usuario o email ya existen
    const [existingUsers] = await pool.execute(
      'SELECT id FROM usuarios WHERE nombre_usuario = ? OR email = ?',
      [nombre_usuario, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario o email ya está en uso' });
    }

    // Si se envió DNI, evitar duplicados (un usuario por DNI).
    const dniNorm = dni ? String(dni).trim() : null;
    if (dniNorm) {
      const [byDni] = await pool.execute(
        'SELECT id FROM usuarios WHERE dni = ? LIMIT 1',
        [dniNorm]
      );
      if (byDni.length > 0) {
        return res.status(400).json({ error: 'Ya existe un usuario registrado con ese DNI' });
      }
    }

    // Cliente: enlazar o crear la empresa que representará.
    let empresaId = null;
    const rucNorm = ruc ? rucSoloDigitos(ruc) : null;
    if (rolSolicitado === 'cliente') {
      const razonNorm = razon_social ? String(razon_social).trim() : '';
      if (!razonNorm) {
        return res.status(400).json({ error: 'La razón social de la empresa es obligatoria para clientes' });
      }
      if (!rucNorm) {
        return res.status(400).json({ error: 'El RUC de la empresa es obligatorio para clientes' });
      }
      try {
        empresaId = await resolveEmpresaId(pool, {
          razon_social: razonNorm,
          ruc: rucNorm,
          direccion: empresa_direccion,
          contacto: empresa_contacto || nombre_completo || telefono,
        });
      } catch (empErr) {
        return res.status(empErr.status || 400).json({ error: empErr.message || 'Datos de empresa inválidos' });
      }
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Normalizar campos demográficos (cadena vacía -> NULL)
    const fechaNacNorm = fecha_nacimiento && String(fecha_nacimiento).trim() ? String(fecha_nacimiento).trim() : null;
    const sexoNorm = sexo && ['HOMBRE', 'MUJER'].includes(String(sexo).toUpperCase()) ? String(sexo).toUpperCase() : null;
    const direccionNorm = direccion && String(direccion).trim() ? String(direccion).trim() : null;
    const tipoRucNorm = (rolSolicitado === 'cliente' && rucNorm)
      ? (tipo_ruc && ['NINGUNO', 'RUC10', 'RUC20'].includes(String(tipo_ruc)) ? String(tipo_ruc) : 'NINGUNO')
      : 'NINGUNO';

    const cuentaActiva = rolSolicitado !== 'cliente';

    // Insertar nuevo usuario
    const [result] = await pool.execute(
      `INSERT INTO usuarios
         (nombre_usuario, email, password_hash, nombre_completo, telefono,
          dni, ruc, tipo_ruc, fecha_nacimiento, sexo, direccion,
          rol, activo, empresa_id)
       VALUES (?, ?, ?, ?, ?,  ?, ?, ?, ?, ?, ?,  ?, ?, ?)`,
      [
        nombre_usuario,
        email,
        password_hash,
        nombre_completo,
        telefono || null,
        dniNorm,
        rolSolicitado === 'cliente' ? rucNorm : null,
        tipoRucNorm,
        fechaNacNorm,
        sexoNorm,
        direccionNorm,
        rolSolicitado,
        cuentaActiva,
        rolSolicitado === 'cliente' ? empresaId : null,
      ]
    );

    const userPayload = {
      id: result.insertId,
      nombre_usuario,
      email,
      nombre_completo,
      telefono: telefono || null,
      dni: dniNorm,
      ruc: rolSolicitado === 'cliente' ? rucNorm : null,
      tipo_ruc: tipoRucNorm,
      fecha_nacimiento: fechaNacNorm,
      sexo: sexoNorm,
      direccion: direccionNorm,
      rol: rolSolicitado,
      empresa_id: rolSolicitado === 'cliente' ? empresaId : null,
      activo: cuentaActiva,
    };

    if (rolSolicitado === 'cliente') {
      try {
        const conn = await pool.getConnection();
        try {
          const [staff] = await conn.execute(
            "SELECT id FROM usuarios WHERE rol IN ('manager', 'vendedor') AND activo = 1"
          );
          const empresaTxt = rucNorm ? ` · ${razon_social?.trim() || 'Empresa'} (RUC ${rucNorm})` : '';
          for (const s of staff) {
            await emitirNotificacion(conn, {
              tipo: 'MENSAJE',
              titulo: 'Nueva cuenta de cliente pendiente',
              mensaje: `${nombre_completo}${empresaTxt} solicitó crear una cuenta. Revísala y aprueba o rechaza.`,
              contextoJson: {
                evento: 'CLIENTE_PENDIENTE_APROBACION',
                usuario_id: result.insertId,
                ruc: rucNorm,
                empresa_id: empresaId,
              },
              remitenteUsuarioId: result.insertId,
              destinatarioUsuarioId: s.id,
              destinatarioEmpresaId: empresaId,
            });
          }
        } finally {
          conn.release();
        }
      } catch (notifErr) {
        console.warn('[TuSalud] notificación registro cliente (no bloquea):', notifErr?.message || notifErr);
      }

      return res.status(201).json({
        message:
          'Tu solicitud fue registrada. Un vendedor debe aprobar tu cuenta antes de que puedas iniciar sesión.',
        pending_approval: true,
        user: userPayload,
      });
    }

    const { token } = await issueUserToken({
      id: result.insertId,
      email,
      rol: rolSolicitado,
    });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: userPayload,
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
      `SELECT id, nombre_usuario, email, password_hash, nombre_completo, telefono,
              dni, ruc, tipo_ruc, fecha_nacimiento, sexo, direccion,
              rol, activo, empresa_id
         FROM usuarios WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar si el usuario está activo
    if (!user.activo) {
      if (user.rol === 'cliente') {
        return res.status(401).json({
          error: 'Tu cuenta está pendiente de aprobación por un vendedor. Te avisaremos cuando puedas ingresar.',
          pending_approval: true,
        });
      }
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { token } = await issueUserToken({
      id: user.id,
      email: user.email,
      rol: user.rol,
    });

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        email: user.email,
        nombre_completo: user.nombre_completo,
        telefono: user.telefono,
        dni: user.dni,
        ruc: user.ruc,
        tipo_ruc: user.tipo_ruc,
        fecha_nacimiento: user.fecha_nacimiento,
        sexo: user.sexo,
        direccion: user.direccion,
        rol: user.rol,
        empresa_id: user.empresa_id,
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
    await rotateUserSession(userId);

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
      `SELECT id, nombre_usuario, email, nombre_completo, telefono,
              dni, ruc, tipo_ruc, fecha_nacimiento, sexo, direccion,
              rol, activo, empresa_id, created_at
         FROM usuarios WHERE id = ?`,
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

const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      await rotateUserSession(req.user.id);
    }
    res.json({ message: 'Sesión cerrada' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
};
