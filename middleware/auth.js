const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Desactivar JWT temporalmente (solo desarrollo / depuración).
 * En .env: DISABLE_JWT_AUTH=true
 * Opcional: AUTH_BYPASS_USER_ID=1  (usuario real en BD para req.user)
 * Si no existe el usuario: AUTH_BYPASS_ROL=manager (rol del stub mínimo)
 * ⚠️ NUNCA habilitar en producción expuesta a internet.
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
      const bypassUserIdRaw = String(process.env.AUTH_BYPASS_USER_ID || '').trim();
      const bypassId = bypassUserIdRaw ? parseInt(bypassUserIdRaw, 10) : null;
      const fallbackRol = (process.env.AUTH_BYPASS_ROL || 'manager').toLowerCase();
      const forceBypassRole = String(process.env.AUTH_BYPASS_FORCE_ROLE || '')
        .trim()
        .toLowerCase();
      const rolForzado = forceBypassRole ? normalizarRol(forceBypassRole) : null;

      try {
        // Si AUTH_BYPASS_USER_ID está definido, se usa ese usuario.
        // Si no está definido, elegimos automáticamente un manager activo.
        let users = [];
        if (Number.isInteger(bypassId) && bypassId > 0) {
          const [byId] = await pool.execute(
            'SELECT id, nombre_usuario, email, nombre_completo, rol, activo FROM usuarios WHERE id = ? AND activo = TRUE',
            [bypassId]
          );
          users = byId;
        } else {
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
          req.user = {
            id: Number.isInteger(bypassId) && bypassId > 0 ? bypassId : 1,
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
