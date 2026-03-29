const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Sesión en TuSalud (resumen):
 *
 * 1) DISABLE_JWT_AUTH=true → no se exige Bearer. Orden: cabecera X-TuSalud-Acting-User-Id →
 *    AUTH_BYPASS_USER_ID → primer manager → stub.
 *
 * 2) JWT activo + preproducción (NODE_ENV !== 'production', o TRUST_ACTING_USER_HEADER=1):
 *    si la cabecera apunta a un usuario activo en `usuarios`, esa fila es req.user y se ignora el JWT.
 *    Así el front puede alinear siempre el id guardado con la API sin depender de un token viejo.
 *
 * 3) JWT activo + NODE_ENV=production (y sin TRUST_ACTING_USER_HEADER): solo cuenta el Bearer;
 *    la cabecera se ignora (evita suplantación).
 *
 * AUTH_BYPASS_FORCE_ROLE — solo aplica en modo DISABLE_JWT_AUTH.
 */
const isJwtDisabled = () =>
  String(process.env.DISABLE_JWT_AUTH || '').toLowerCase() === 'true' ||
  process.env.DISABLE_JWT_AUTH === '1';

/** En preproducción, la cabecera puede sustituir al JWT si resuelve a un usuario válido. */
const preferActingHeaderOverJwt = () =>
  String(process.env.TRUST_ACTING_USER_HEADER || '').toLowerCase() === 'true' ||
  process.env.TRUST_ACTING_USER_HEADER === '1' ||
  String(process.env.NODE_ENV || '').toLowerCase() !== 'production';

function normalizarRol(rol) {
  const r = String(rol || '')
    .trim()
    .toLowerCase();
  if (r === 'manager' || r === 'vendedor' || r === 'cliente') return r;
  if (r === 'admin' || r === 'administrador' || r === 'administrador_general' || r === 'superadmin') return 'manager';
  if (r === 'seller' || r === 'sales' || r === 'ventas') return 'vendedor';
  if (r === 'client' || r === 'customer') return 'cliente';
  return r;
}

function parseActingUserId(req) {
  const headerRaw = req.headers['x-tusalud-acting-user-id'];
  if (headerRaw == null || String(headerRaw).trim() === '') return NaN;
  return parseInt(String(headerRaw).trim(), 10);
}

async function fetchUsuarioActivoPorId(id) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const [rows] = await pool.execute(
    'SELECT id, nombre_usuario, email, nombre_completo, rol, activo FROM usuarios WHERE id = ? AND activo = TRUE',
    [id]
  );
  return rows[0] || null;
}

const authenticateToken = async (req, res, next) => {
  try {
    const headerId = parseActingUserId(req);
    let headerUser = null;
    if (Number.isInteger(headerId) && headerId > 0) {
      headerUser = await fetchUsuarioActivoPorId(headerId);
    }

    // --- Modo sin JWT ---
    if (isJwtDisabled()) {
      const fallbackRol = (process.env.AUTH_BYPASS_ROL || 'manager').toLowerCase();
      const forceBypassRole = String(process.env.AUTH_BYPASS_FORCE_ROLE || '')
        .trim()
        .toLowerCase();
      const rolForzado = forceBypassRole ? normalizarRol(forceBypassRole) : null;

      const bypassUserIdRaw = String(process.env.AUTH_BYPASS_USER_ID || '').trim();
      const bypassId = bypassUserIdRaw ? parseInt(bypassUserIdRaw, 10) : null;

      try {
        let u = headerUser;
        if (!u && Number.isInteger(bypassId) && bypassId > 0) {
          u = await fetchUsuarioActivoPorId(bypassId);
        }
        if (!u) {
          const [firstManager] = await pool.execute(
            "SELECT id, nombre_usuario, email, nombre_completo, rol, activo FROM usuarios WHERE activo = TRUE AND LOWER(TRIM(rol)) IN ('manager','admin','administrador','superadmin') ORDER BY id ASC LIMIT 1"
          );
          u = firstManager[0] || null;
        }

        if (u) {
          req.user = {
            ...u,
            rol: rolForzado || normalizarRol(u.rol),
          };
        } else {
          const stubId =
            Number.isInteger(headerId) && headerId > 0
              ? headerId
              : Number.isInteger(bypassId) && bypassId > 0
                ? bypassId
                : 1;
          req.user = {
            id: stubId,
            nombre_usuario: 'dev_bypass',
            email: 'dev@local',
            nombre_completo: 'Dev (sin JWT)',
            rol: rolForzado || normalizarRol(fallbackRol),
            activo: true,
          };
        }
      } catch {
        req.user = {
          id: 1,
          nombre_usuario: 'dev_bypass',
          email: 'dev@local',
          nombre_completo: 'Dev (sin JWT)',
          rol: rolForzado || normalizarRol(fallbackRol),
          activo: true,
        };
      }
      return next();
    }

    // --- JWT encendido: en preproducción, cabecera válida gana al token ---
    if (headerUser && preferActingHeaderOverJwt()) {
      req.user = { ...headerUser, rol: normalizarRol(headerUser.rol) };
      return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');

    const [users] = await pool.execute(
      'SELECT id, nombre_usuario, email, nombre_completo, rol, activo FROM usuarios WHERE id = ? AND activo = TRUE',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    req.user = { ...users[0], rol: normalizarRol(users[0].rol) };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expirado' });
    }
    return res.status(500).json({ error: 'Error en la autenticación' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const rolUsuario = normalizarRol(req.user.rol);
    const rolesPermitidos = roles.map((r) => normalizarRol(r));

    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  normalizarRol,
  isJwtDisabled,
  preferActingHeaderOverJwt,
  verificarToken: authenticateToken,
  verificarRol: (roles) => requireRole(...roles),
};
