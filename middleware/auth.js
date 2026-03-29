const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Desactivar JWT temporalmente (solo desarrollo / depuración).
 * En .env: DISABLE_JWT_AUTH=true
 *
 * Con JWT apagado, la sesión se resuelve así (en orden):
 * 1) Cabecera `X-TuSalud-Acting-User-Id` (número) → carga ese usuario activo en `usuarios`.
 *    El front debe enviarla con el id del usuario guardado tras login (mismo flujo que con JWT).
 * 2) Si no hay cabecera o el id no existe: AUTH_BYPASS_USER_ID en .env (opcional).
 * 3) Si no: primer manager activo.
 * 4) Si no: stub mínimo.
 *
 * Con JWT encendido, la cabecera se ignora (solo cuenta el token).
 * AUTH_BYPASS_FORCE_ROLE — opcional, fuerza rol.
 * ⚠️ JWT deshabilitado en internet = cualquiera puede mandar cualquier X-TuSalud-Acting-User-Id.
 */
const isJwtDisabled = () =>
  String(process.env.DISABLE_JWT_AUTH || '').toLowerCase() === 'true' ||
  process.env.DISABLE_JWT_AUTH === '1';

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

// Middleware para verificar el token JWT
const authenticateToken = async (req, res, next) => {
  try {
    // --- Modo sin JWT (temporal): no exige Authorization ---
    if (isJwtDisabled()) {
      const fallbackRol = (process.env.AUTH_BYPASS_ROL || 'manager').toLowerCase();
      const forceBypassRole = String(process.env.AUTH_BYPASS_FORCE_ROLE || '')
        .trim()
        .toLowerCase();
      const rolForzado = forceBypassRole ? normalizarRol(forceBypassRole) : null;

      const headerRaw = req.headers['x-tusalud-acting-user-id'];
      const headerId =
        headerRaw != null && String(headerRaw).trim() !== ''
          ? parseInt(String(headerRaw).trim(), 10)
          : NaN;

      const bypassUserIdRaw = String(process.env.AUTH_BYPASS_USER_ID || '').trim();
      const bypassId = bypassUserIdRaw ? parseInt(bypassUserIdRaw, 10) : null;

      const loadUsuarioPorId = async (id) => {
        if (!Number.isInteger(id) || id <= 0) return [];
        const [rows] = await pool.execute(
          'SELECT id, nombre_usuario, email, nombre_completo, rol, activo FROM usuarios WHERE id = ? AND activo = TRUE',
          [id]
        );
        return rows;
      };

      try {
        let users = [];

        if (Number.isInteger(headerId) && headerId > 0) {
          users = await loadUsuarioPorId(headerId);
        }
        if (users.length === 0 && Number.isInteger(bypassId) && bypassId > 0) {
          users = await loadUsuarioPorId(bypassId);
        }
        if (users.length === 0) {
          const [firstManager] = await pool.execute(
            "SELECT id, nombre_usuario, email, nombre_completo, rol, activo FROM usuarios WHERE activo = TRUE AND LOWER(TRIM(rol)) IN ('manager','admin','administrador','superadmin') ORDER BY id ASC LIMIT 1"
          );
          users = firstManager;
        }

        if (users.length > 0) {
          const u = users[0];
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
    // --- Fin modo sin JWT ---

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
    
    // Verificar que el usuario existe y está activo
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

// Middleware para verificar roles específicos
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
  // Aliases para compatibilidad
  verificarToken: authenticateToken,
  verificarRol: (roles) => requireRole(...roles)
};
