const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = () => process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = () => process.env.JWT_EXPIRES_IN || '30d';

const isJwtDisabled = () =>
  String(process.env.DISABLE_JWT_AUTH || '').toLowerCase() === 'true' ||
  process.env.DISABLE_JWT_AUTH === '1';

/** Sesión única activa salvo DISABLE_SINGLE_SESSION=1 o JWT deshabilitado. */
function isSingleSessionEnabled() {
  if (isJwtDisabled()) return false;
  const raw = process.env.DISABLE_SINGLE_SESSION;
  return !(String(raw || '').toLowerCase() === 'true' || raw === '1');
}

async function readSessionVersion(userId) {
  try {
    const [rows] = await pool.execute(
      'SELECT auth_token_version FROM usuarios WHERE id = ? LIMIT 1',
      [userId]
    );
    if (!rows.length) return null;
    return Number(rows[0].auth_token_version ?? 1);
  } catch (err) {
    if (err && err.code === 'ER_BAD_FIELD_ERROR') return 1;
    throw err;
  }
}

/** Incrementa versión de sesión y devuelve la nueva (invalida tokens previos). */
async function rotateUserSession(userId) {
  if (!isSingleSessionEnabled()) {
    return (await readSessionVersion(userId)) ?? 1;
  }
  try {
    await pool.execute(
      'UPDATE usuarios SET auth_token_version = COALESCE(auth_token_version, 0) + 1 WHERE id = ?',
      [userId]
    );
  } catch (err) {
    if (err && err.code === 'ER_BAD_FIELD_ERROR') return 1;
    throw err;
  }
  return (await readSessionVersion(userId)) ?? 1;
}

function signUserToken({ userId, email, rol, sessionVersion }) {
  const payload = { userId, email, rol };
  if (isSingleSessionEnabled() && sessionVersion != null) {
    payload.sv = Number(sessionVersion);
  }
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: JWT_EXPIRES_IN() });
}

/** Emite JWT tras login/registro: rota sesión si aplica. */
async function issueUserToken(user) {
  const sessionVersion = await rotateUserSession(user.id);
  const token = signUserToken({
    userId: user.id,
    email: user.email,
    rol: user.rol,
    sessionVersion,
  });
  return { token, sessionVersion };
}

/**
 * Verifica que el JWT siga siendo la sesión activa del usuario.
 * Tokens legacy sin `sv`: válidos solo mientras auth_token_version === 1.
 */
async function verifyUserSession(decoded) {
  if (!isSingleSessionEnabled()) {
    return { ok: true };
  }
  const userId = decoded?.userId;
  if (!userId) {
    return { ok: false, reason: 'SESSION_REPLACED' };
  }
  const dbVersion = await readSessionVersion(userId);
  if (dbVersion == null) {
    return { ok: false, reason: 'invalid_user' };
  }
  const tokenVersion = decoded.sv != null ? Number(decoded.sv) : null;
  if (tokenVersion == null) {
    if (dbVersion > 1) {
      return { ok: false, reason: 'SESSION_REPLACED' };
    }
    return { ok: true };
  }
  if (tokenVersion !== dbVersion) {
    return { ok: false, reason: 'SESSION_REPLACED' };
  }
  return { ok: true };
}

const SESSION_REPLACED_MESSAGE =
  'Tu sesión se cerró porque la cuenta inició sesión en otro dispositivo o navegador.';

module.exports = {
  isSingleSessionEnabled,
  rotateUserSession,
  signUserToken,
  issueUserToken,
  verifyUserSession,
  SESSION_REPLACED_MESSAGE,
};
