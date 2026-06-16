const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { resolveEmpresaId, rucSoloDigitos } = require('../utils/resolveEmpresaId');
const {
  helpers: { emitirNotificacion },
} = require('../controllers/notificacionesController');

/** Evita 403 por desajuste string/number/BigInt entre JWT/BD y el id de la URL. */
function sameUsuarioId(reqUserId, targetUserId) {
  return Number(reqUserId) === Number(targetUserId);
}

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
    if (!sameUsuarioId(req.user.id, userId) && req.user.rol !== 'manager') {
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
    if (!sameUsuarioId(req.user.id, userId) && req.user.rol !== 'manager') {
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
    if (!sameUsuarioId(req.user.id, userId) && req.user.rol !== 'manager') {
      return res.status(403).json({ error: 'No puedes modificar la empresa de otro usuario' });
    }
    if (req.user.rol === 'cliente' && sameUsuarioId(req.user.id, userId)) {
      return res.status(403).json({
        error:
          'No puedes cambiar tu empresa directamente. Solicita representar otra empresa y un vendedor la aprobará.',
      });
    }

    const [users] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { empresa_id, razon_social, ruc, direccion, contacto } = req.body || {};
    let empresaIdToSet = null;

    const rucSoloDigitos = (v) => String(v ?? '').replace(/\D/g, '');
    const rucValidoLongitud = (v) => {
      const d = rucSoloDigitos(v);
      return d.length >= 9 && d.length <= 11;
    };

    if (empresa_id != null && Number.isInteger(Number(empresa_id))) {
      // Asignar empresa existente
      const [emp] = await pool.execute('SELECT id FROM empresas WHERE id = ?', [Number(empresa_id)]);
      if (emp.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }
      empresaIdToSet = emp[0].id;
    } else if (razon_social && typeof razon_social === 'string' && razon_social.trim()) {
      const razon = razon_social.trim();
      if (ruc && String(ruc).trim().length !== 0 && !rucValidoLongitud(ruc)) {
        return res.status(400).json({ error: 'El RUC debe tener entre 9 y 11 dígitos' });
      }
      const rucVal = ruc && String(ruc).trim() ? rucSoloDigitos(ruc) : null;
      // Buscar existente (misma lógica que “Modificar empresa”, sin duplicar filas)
      if (rucVal) {
        const [byRuc] = await pool.execute('SELECT id FROM empresas WHERE ruc = ?', [rucVal]);
        if (byRuc.length > 0) {
          empresaIdToSet = byRuc[0].id;
        }
      }
      if (empresaIdToSet == null) {
        const [byNombre] = await pool.execute(
          'SELECT id FROM empresas WHERE LOWER(TRIM(razon_social)) = LOWER(?)',
          [razon]
        );
        if (byNombre.length > 0) {
          empresaIdToSet = byNombre[0].id;
        }
      }
      if (empresaIdToSet == null) {
        const [result] = await pool.execute(
          `INSERT INTO empresas (razon_social, ruc, direccion, contacto) VALUES (?, ?, ?, ?)`,
          [razon, rucVal, (direccion && String(direccion).trim()) || null, (contacto && String(contacto).trim()) || null]
        );
        empresaIdToSet = result.insertId;
      }
    } else if (ruc && rucValidoLongitud(ruc)) {
      // Solo RUC (p. ej. import): asignar empresa existente
      const rucVal = rucSoloDigitos(ruc);
      const [byRuc] = await pool.execute('SELECT id FROM empresas WHERE ruc = ?', [rucVal]);
      if (byRuc.length === 0) {
        return res.status(404).json({ error: 'No hay empresa registrada con ese RUC' });
      }
      empresaIdToSet = byRuc[0].id;
    } else {
      return res.status(400).json({
        error:
          'Indica empresa_id, razon_social (crear o enlazar por nombre/RUC), o RUC de 9 a 11 dígitos (empresa existente)',
      });
    }

    await pool.execute('UPDATE usuarios SET empresa_id = ? WHERE id = ?', [empresaIdToSet, userId]);
    const [empresas] = await pool.execute('SELECT * FROM empresas WHERE id = ?', [empresaIdToSet]);
    res.status(200).json({ message: 'Empresa asignada', empresa: empresas[0] });
  } catch (error) {
    console.error('Error al asignar empresa al usuario:', error);
    res.status(500).json({ error: 'Error al asignar empresa al usuario' });
  }
};

/**
 * Actualiza datos de la empresa ya vinculada al usuario (contacto, dirección, email).
 * Solo el propio usuario o un manager; el cliente solo puede editar SU empresa asignada.
 */
const patchEmpresaByUsuarioId = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'ID de usuario no válido' });
    }
    if (!sameUsuarioId(req.user.id, userId) && req.user.rol !== 'manager') {
      return res.status(403).json({ error: 'No puedes modificar la empresa de otro usuario' });
    }

    const [users] = await pool.execute('SELECT empresa_id FROM usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const empresaId = users[0].empresa_id;
    if (empresaId == null) {
      return res.status(404).json({ error: 'No tienes una empresa vinculada' });
    }

    const body = req.body || {};
    const allowed = ['direccion', 'contacto', 'email', 'ruc'];
    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const raw = body[key];
        if (key === 'ruc') {
          const digits = String(raw ?? '').replace(/\D/g, '');
          if (digits && (digits.length < 9 || digits.length > 11)) {
            return res.status(400).json({ error: 'El RUC debe tener entre 9 y 11 dígitos' });
          }
          if (digits) {
            const [dup] = await pool.execute('SELECT id FROM empresas WHERE ruc = ? AND id != ?', [
              digits,
              empresaId,
            ]);
            if (dup.length > 0) {
              return res.status(400).json({ error: 'El RUC ya está registrado en otra empresa' });
            }
          }
          sets.push('ruc = ?');
          params.push(digits || null);
        } else {
          const val = raw == null ? null : String(raw).trim() || null;
          sets.push(`${key} = ?`);
          params.push(val);
        }
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Indica al menos un campo: direccion, contacto, email o ruc' });
    }

    params.push(empresaId);
    await pool.execute(`UPDATE empresas SET ${sets.join(', ')} WHERE id = ?`, params);

    const [empresas] = await pool.execute('SELECT * FROM empresas WHERE id = ?', [empresaId]);
    res.json({ message: 'Datos de empresa actualizados', empresa: empresas[0] });
  } catch (error) {
    console.error('Error al actualizar datos de empresa del usuario:', error);
    res.status(500).json({ error: 'Error al actualizar datos de la empresa' });
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

    const [users] = await pool.execute('SELECT id, rol, nombre_completo, email FROM usuarios WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const target = users[0];

    if (req.user.rol === 'vendedor' && target.rol !== 'cliente') {
      return res.status(403).json({ error: 'Solo puedes aprobar cuentas de clientes' });
    }

    await pool.execute('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, id]);

    if (activo && target.rol === 'cliente') {
      try {
        const conn = await pool.getConnection();
        try {
          await emitirNotificacion(conn, {
            tipo: 'MENSAJE',
            titulo: 'Cuenta aprobada',
            mensaje: 'Tu cuenta fue aprobada. Ya puedes iniciar sesión en TuSalud.',
            contextoJson: { evento: 'CLIENTE_CUENTA_APROBADA' },
            remitenteUsuarioId: req.user?.id ?? null,
            destinatarioUsuarioId: target.id,
          });
        } finally {
          conn.release();
        }
      } catch (notifErr) {
        console.warn('[TuSalud] notificación aprobación cliente (no bloquea):', notifErr?.message || notifErr);
      }
    }

    const [updatedUser] = await pool.execute(
      'SELECT id, nombre_usuario, email, nombre_completo, telefono, ruc, tipo_ruc, rol, activo, empresa_id, created_at FROM usuarios WHERE id = ?',
      [id]
    );

    res.json({ message: 'Estado del usuario actualizado exitosamente', usuario: updatedUser[0] });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado del usuario' });
  }
};

/** Clientes con cuenta pendiente + solicitudes de cambio de empresa. */
const listarSolicitudesPendientes = async (req, res) => {
  try {
    const [cuentas] = await pool.execute(
      `SELECT u.id, u.nombre_usuario, u.email, u.nombre_completo, u.telefono,
              u.ruc, u.tipo_ruc, u.rol, u.activo, u.empresa_id, u.created_at,
              e.razon_social AS empresa_razon_social
         FROM usuarios u
         LEFT JOIN empresas e ON e.id = u.empresa_id
        WHERE u.rol = 'cliente' AND u.activo = 0
        ORDER BY u.created_at DESC`
    );

    let empresas = [];
    try {
      const [rows] = await pool.execute(
        `SELECT s.id, s.usuario_id, s.empresa_id_actual, s.empresa_id_destino,
                s.razon_social_propuesta, s.ruc_propuesto, s.created_at,
                u.nombre_completo, u.email, u.telefono,
                ea.razon_social AS empresa_actual_nombre,
                ed.razon_social AS empresa_destino_nombre
           FROM solicitudes_cambio_empresa s
           INNER JOIN usuarios u ON u.id = s.usuario_id
           LEFT JOIN empresas ea ON ea.id = s.empresa_id_actual
           LEFT JOIN empresas ed ON ed.id = s.empresa_id_destino
          WHERE s.estado = 'PENDIENTE'
          ORDER BY s.created_at DESC`
      );
      empresas = rows;
    } catch (tblErr) {
      if (tblErr?.code !== 'ER_NO_SUCH_TABLE') throw tblErr;
    }

    const solicitudes = [
      ...cuentas.map((u) => ({
        tipo: 'cuenta',
        id: u.id,
        nombre_completo: u.nombre_completo,
        email: u.email,
        telefono: u.telefono,
        ruc: u.ruc,
        empresa_id: u.empresa_id,
        empresa_razon_social: u.empresa_razon_social,
        created_at: u.created_at,
      })),
      ...empresas.map((s) => ({
        tipo: 'empresa',
        id: s.id,
        usuario_id: s.usuario_id,
        nombre_completo: s.nombre_completo,
        email: s.email,
        telefono: s.telefono,
        empresa_actual_nombre: s.empresa_actual_nombre,
        empresa_destino_nombre:
          s.empresa_destino_nombre || s.razon_social_propuesta,
        ruc_propuesto: s.ruc_propuesto,
        created_at: s.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ solicitudes });
  } catch (error) {
    console.error('Error al listar solicitudes pendientes:', error);
    res.status(500).json({ error: 'Error al listar solicitudes pendientes' });
  }
};

/** Clientes con cuenta pendiente de aprobación (activo = 0). */
const listarClientesPendientes = async (req, res) => {
  try {
    const [usuarios] = await pool.execute(
      `SELECT u.id, u.nombre_usuario, u.email, u.nombre_completo, u.telefono,
              u.ruc, u.tipo_ruc, u.rol, u.activo, u.empresa_id, u.created_at,
              e.razon_social AS empresa_razon_social
         FROM usuarios u
         LEFT JOIN empresas e ON e.id = u.empresa_id
        WHERE u.rol = 'cliente' AND u.activo = 0
        ORDER BY u.created_at DESC`
    );
    res.json({ usuarios });
  } catch (error) {
    console.error('Error al listar clientes pendientes:', error);
    res.status(500).json({ error: 'Error al listar clientes pendientes' });
  }
};

/** Elimina un usuario (solo manager). No permite borrar la propia cuenta ni el último manager activo. */
const eliminarUsuario = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de usuario no válido' });
    }
    if (sameUsuarioId(req.user.id, id)) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta desde aquí' });
    }

    const [users] = await pool.execute('SELECT id, rol, activo FROM usuarios WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const target = users[0];

    if (target.rol === 'manager' && target.activo) {
      const [rows] = await pool.execute(
        "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'manager' AND activo = 1"
      );
      if (Number(rows[0]?.total || 0) <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el último manager activo' });
      }
    }

    await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error: 'No se puede eliminar este usuario porque tiene registros vinculados en el sistema',
      });
    }
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

/** Rechaza (elimina) una solicitud de registro de cliente aún no aprobada. */
const rechazarSolicitudCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await pool.execute('SELECT id, rol, activo FROM usuarios WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const target = users[0];
    if (target.rol !== 'cliente' || target.activo) {
      return res.status(400).json({ error: 'Solo se pueden rechazar cuentas de cliente pendientes de aprobación' });
    }
    await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ message: 'Solicitud de cuenta rechazada' });
  } catch (error) {
    console.error('Error al rechazar solicitud de cliente:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud de cliente' });
  }
};

const crearSolicitudCambioEmpresa = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (req.user.rol !== 'cliente') {
      return res.status(403).json({ error: 'Solo los clientes pueden solicitar cambio de empresa' });
    }
    const userId = Number(req.user.id);
    const { empresa_id, razon_social, ruc, direccion, contacto } = req.body || {};

    const [pend] = await connection.execute(
      "SELECT id FROM solicitudes_cambio_empresa WHERE usuario_id = ? AND estado = 'PENDIENTE' LIMIT 1",
      [userId]
    );
    if (pend.length > 0) {
      return res.status(400).json({ error: 'Ya tienes una solicitud de cambio de empresa pendiente' });
    }

    const [userRows] = await connection.execute(
      'SELECT id, empresa_id, ruc FROM usuarios WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const empresaIdActual = userRows[0].empresa_id;

    let empresaIdDestino = null;
    let razonPropuesta = null;
    let rucPropuesto = null;
    let direccionPropuesta = null;
    let contactoPropuesto = null;

    if (empresa_id != null && Number.isInteger(Number(empresa_id))) {
      const [emp] = await connection.execute('SELECT id, razon_social, ruc FROM empresas WHERE id = ?', [
        Number(empresa_id),
      ]);
      if (emp.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }
      if (empresaIdActual != null && Number(emp[0].id) === Number(empresaIdActual)) {
        return res.status(400).json({ error: 'Ya representas a esa empresa' });
      }
      empresaIdDestino = emp[0].id;
      razonPropuesta = emp[0].razon_social;
      rucPropuesto = emp[0].ruc;
    } else {
      const razon = razon_social ? String(razon_social).trim() : '';
      const rucVal = ruc ? rucSoloDigitos(ruc) : null;
      if (!razon) {
        return res.status(400).json({ error: 'Indica la razón social de la empresa' });
      }
      await connection.beginTransaction();
      empresaIdDestino = await resolveEmpresaId(connection, {
        razon_social: razon,
        ruc: rucVal,
        direccion,
        contacto,
      });
      razonPropuesta = razon;
      rucPropuesto = rucVal;
      direccionPropuesta = direccion && String(direccion).trim() ? String(direccion).trim() : null;
      contactoPropuesto = contacto && String(contacto).trim() ? String(contacto).trim() : null;
      if (empresaIdActual != null && Number(empresaIdDestino) === Number(empresaIdActual)) {
        await connection.rollback();
        return res.status(400).json({ error: 'Ya representas a esa empresa' });
      }
      await connection.commit();
    }

    const [result] = await connection.execute(
      `INSERT INTO solicitudes_cambio_empresa
        (usuario_id, empresa_id_actual, empresa_id_destino, razon_social_propuesta,
         ruc_propuesto, direccion_propuesta, contacto_propuesto, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
      [
        userId,
        empresaIdActual,
        empresaIdDestino,
        razonPropuesta,
        rucPropuesto,
        direccionPropuesta,
        contactoPropuesto,
      ]
    );

    try {
      const [staff] = await connection.execute(
        "SELECT id FROM usuarios WHERE rol IN ('manager', 'vendedor') AND activo = 1"
      );
      for (const s of staff) {
        await emitirNotificacion(connection, {
          tipo: 'MENSAJE',
          titulo: 'Solicitud de cambio de empresa',
          mensaje: `${req.user.nombre_completo || 'Un cliente'} solicita representar a ${razonPropuesta || 'otra empresa'}.`,
          contextoJson: {
            evento: 'CLIENTE_CAMBIO_EMPRESA_PENDIENTE',
            solicitud_id: result.insertId,
            usuario_id: userId,
          },
          remitenteUsuarioId: userId,
          destinatarioUsuarioId: s.id,
        });
      }
    } catch (notifErr) {
      console.warn('[TuSalud] notificación cambio empresa (no bloquea):', notifErr?.message || notifErr);
    }

    res.status(201).json({
      message: 'Solicitud enviada. Un vendedor la revisará pronto.',
      solicitud_id: result.insertId,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      /* ignore */
    }
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        error: 'La función de solicitud de cambio de empresa aún no está disponible en el servidor',
      });
    }
    console.error('Error al crear solicitud cambio empresa:', error);
    res.status(error?.status || 500).json({ error: error?.message || 'Error al crear solicitud' });
  } finally {
    connection.release();
  }
};

const getMiSolicitudCambioEmpresa = async (req, res) => {
  try {
    if (req.user.rol !== 'cliente') {
      return res.status(403).json({ error: 'Solo aplica a clientes' });
    }
    const [rows] = await pool.execute(
      `SELECT s.*, ed.razon_social AS empresa_destino_nombre
         FROM solicitudes_cambio_empresa s
         LEFT JOIN empresas ed ON ed.id = s.empresa_id_destino
        WHERE s.usuario_id = ? AND s.estado = 'PENDIENTE'
        ORDER BY s.created_at DESC
        LIMIT 1`,
      [req.user.id]
    );
    res.json({ solicitud: rows[0] ?? null });
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ solicitud: null });
    }
    console.error('Error al obtener solicitud cambio empresa:', error);
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
};

const aprobarSolicitudCambioEmpresa = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const solicitudId = Number(req.params.id);
    const [rows] = await connection.execute(
      "SELECT * FROM solicitudes_cambio_empresa WHERE id = ? AND estado = 'PENDIENTE'",
      [solicitudId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya revisada' });
    }
    const sol = rows[0];
    let empresaDestinoId = sol.empresa_id_destino;
    if (!empresaDestinoId) {
      empresaDestinoId = await resolveEmpresaId(connection, {
        razon_social: sol.razon_social_propuesta,
        ruc: sol.ruc_propuesto,
        direccion: sol.direccion_propuesta,
        contacto: sol.contacto_propuesto,
      });
    }

    await connection.beginTransaction();
    await connection.execute('UPDATE usuarios SET empresa_id = ?, ruc = COALESCE(?, ruc) WHERE id = ?', [
      empresaDestinoId,
      sol.ruc_propuesto,
      sol.usuario_id,
    ]);
    await connection.execute(
      `UPDATE solicitudes_cambio_empresa
          SET estado = 'APROBADA', empresa_id_destino = ?, revisado_por_usuario_id = ?, updated_at = NOW()
        WHERE id = ?`,
      [empresaDestinoId, req.user?.id ?? null, solicitudId]
    );
    await connection.commit();

    try {
      await emitirNotificacion(connection, {
        tipo: 'MENSAJE',
        titulo: 'Cambio de empresa aprobado',
        mensaje: 'Tu solicitud para representar otra empresa fue aprobada.',
        contextoJson: { evento: 'CLIENTE_CAMBIO_EMPRESA_APROBADO', empresa_id: empresaDestinoId },
        remitenteUsuarioId: req.user?.id ?? null,
        destinatarioUsuarioId: sol.usuario_id,
      });
    } catch (notifErr) {
      console.warn('[TuSalud] notificación aprobación cambio empresa:', notifErr?.message || notifErr);
    }

    res.json({ message: 'Solicitud de cambio de empresa aprobada' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al aprobar cambio empresa:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  } finally {
    connection.release();
  }
};

const rechazarSolicitudCambioEmpresa = async (req, res) => {
  try {
    const solicitudId = Number(req.params.id);
    const [rows] = await pool.execute(
      "SELECT id, usuario_id FROM solicitudes_cambio_empresa WHERE id = ? AND estado = 'PENDIENTE'",
      [solicitudId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya revisada' });
    }
    await pool.execute(
      `UPDATE solicitudes_cambio_empresa
          SET estado = 'RECHAZADA', revisado_por_usuario_id = ?, mensaje_rechazo = ?, updated_at = NOW()
        WHERE id = ?`,
      [req.user?.id ?? null, req.body?.mensaje_rechazo ?? null, solicitudId]
    );
    res.json({ message: 'Solicitud de cambio de empresa rechazada' });
  } catch (error) {
    console.error('Error al rechazar cambio empresa:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
};

router.get('/', authenticateToken, requireRole('manager'), getAllUsuarios);
router.get(
  '/solicitudes-pendientes',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  listarSolicitudesPendientes
);
router.get(
  '/pendientes-aprobacion',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  listarClientesPendientes
);

// Empresa del usuario autenticado (evita desajuste entre token y id guardado en el cliente)
const empresaMe = (handler) => (req, res, next) => {
  req.params = { ...req.params, id: String(Number(req.user.id)) };
  return handler(req, res, next);
};
router.get('/me/empresa', authenticateToken, empresaMe(getEmpresaByUsuarioId));
router.delete('/me/empresa', authenticateToken, empresaMe(deleteEmpresaByUsuarioId));
router.post('/me/empresa', authenticateToken, empresaMe(setEmpresaByUsuarioId));
router.patch('/me/empresa', authenticateToken, empresaMe(patchEmpresaByUsuarioId));
router.get('/me/solicitud-cambio-empresa', authenticateToken, getMiSolicitudCambioEmpresa);
router.post('/me/solicitud-cambio-empresa', authenticateToken, crearSolicitudCambioEmpresa);
router.put(
  '/solicitudes-cambio-empresa/:id/aprobar',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  aprobarSolicitudCambioEmpresa
);
router.delete(
  '/solicitudes-cambio-empresa/:id',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  rechazarSolicitudCambioEmpresa
);

router.get('/:id/empresa', authenticateToken, getEmpresaByUsuarioId);
router.delete('/:id/empresa', authenticateToken, deleteEmpresaByUsuarioId);
router.post('/:id/empresa', authenticateToken, setEmpresaByUsuarioId);
router.put('/:id/rol', authenticateToken, requireRole('manager'), [
  body('rol').isIn(['manager', 'vendedor', 'cliente']).withMessage('Rol inválido')
], updateUsuarioRol);
router.put('/:id/activo', authenticateToken, requireRole('manager', 'vendedor'), toggleUsuarioActivo);
router.delete(
  '/:id/solicitud',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  rechazarSolicitudCliente
);
router.delete('/:id', authenticateToken, requireRole('manager'), eliminarUsuario);

module.exports = router;
