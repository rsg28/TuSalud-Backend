'use strict';

/**
 * Integraciones con sistemas externos (laboratorios, ERPs, etc.).
 *
 * Hoy implementa un único endpoint público:
 *   POST /api/integraciones/examen-evento
 *
 * Diseñado para que el sistema del jefe (cuando lo tengamos) pueda
 * empujarnos eventos de "examen tomado" / "paciente ausente" sin que
 * tengamos que tocar el código. La autenticación es por API key estática
 * (Authorization: Bearer <token>) cuyo SHA-256 vive en
 * `integraciones_api_keys`. Los eventos repetidos (mismo
 * `referencia_externa`) se ignoran automáticamente — el llamador puede
 * reintentar sin preocuparse de duplicar nada.
 *
 * Convenciones del payload (idea simple a propósito; cuando lleguen las
 * specs del jefe se adapta):
 *
 * {
 *   "referencia_externa": "evt-1234",          // requerido
 *   "evento": "EXAMEN_TOMADO",                  // requerido
 *   "paciente": { "dni": "12345678" },          // o "id": 42
 *   "examen": { "codigo": "AUD-01" },           // o "id": 78
 *   "estado": "COMPLETADO",                     // opcional, según `evento`
 *   "motivo": "Paciente faltó por enfermedad",  // opcional
 *   "fecha": "2026-05-25T13:45:00Z"             // opcional, hoy solo lo loggeamos
 * }
 *
 * Mapeo evento → estado (si el llamador no manda `estado` explícito):
 *   EXAMEN_TOMADO       → COMPLETADO
 *   PACIENTE_AUSENTE    → AUSENTE
 *   EXAMEN_NO_REALIZADO → NO_REALIZADO
 *   EXAMEN_POSPUESTO    → POSPUESTO
 *   EXAMEN_PENDIENTE    → PENDIENTE
 */

const crypto = require('node:crypto');
const pool = require('../config/database');
const seguimientoSvc = require('../services/seguimientoExamenes');

const EVENTO_A_ESTADO = {
  EXAMEN_TOMADO: 'COMPLETADO',
  EXAMEN_COMPLETADO: 'COMPLETADO',
  PACIENTE_AUSENTE: 'AUSENTE',
  EXAMEN_NO_REALIZADO: 'NO_REALIZADO',
  EXAMEN_POSPUESTO: 'POSPUESTO',
  EXAMEN_PENDIENTE: 'PENDIENTE',
};

function extraerToken(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  const x = req.headers['x-api-key'];
  return x ? String(x).trim() : '';
}

async function verificarApiKey(token) {
  if (!token) return null;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const [filas] = await pool.execute(
    `SELECT id, nombre, scope, activa
       FROM integraciones_api_keys
      WHERE token_hash = ?
      LIMIT 1`,
    [hash]
  );
  if (filas.length === 0) return null;
  const k = filas[0];
  if (!k.activa) return null;
  pool
    .execute(`UPDATE integraciones_api_keys SET ultima_vez_usada = NOW() WHERE id = ?`, [k.id])
    .catch(() => {});
  return k;
}

async function resolverPacienteId(paciente) {
  if (!paciente || typeof paciente !== 'object') return null;
  if (paciente.id) {
    const id = Number(paciente.id);
    if (Number.isInteger(id) && id > 0) return id;
  }
  if (paciente.dni) {
    const [filas] = await pool.execute(
      `SELECT id FROM pedido_pacientes WHERE dni = ? ORDER BY id DESC LIMIT 1`,
      [String(paciente.dni).trim()]
    );
    if (filas.length > 0) return filas[0].id;
  }
  return null;
}

async function resolverExamenId(examen) {
  if (!examen || typeof examen !== 'object') return null;
  if (examen.id) {
    const id = Number(examen.id);
    if (Number.isInteger(id) && id > 0) return id;
  }
  if (examen.codigo) {
    const [filas] = await pool.execute(
      `SELECT id FROM examenes WHERE codigo = ? LIMIT 1`,
      [String(examen.codigo).trim()]
    );
    if (filas.length > 0) return filas[0].id;
  }
  if (examen.nombre) {
    const [filas] = await pool.execute(
      `SELECT id FROM examenes WHERE nombre = ? LIMIT 1`,
      [String(examen.nombre).trim()]
    );
    if (filas.length > 0) return filas[0].id;
  }
  return null;
}

/**
 * POST /api/integraciones/examen-evento
 */
const recibirEventoExamen = async (req, res) => {
  try {
    const token = extraerToken(req);
    const apiKey = await verificarApiKey(token);
    if (!apiKey) return res.status(401).json({ error: 'API key inválida o inactiva' });

    if (!String(apiKey.scope || '').split(',').map((s) => s.trim()).includes('examen-evento')) {
      return res.status(403).json({ error: 'API key sin scope examen-evento' });
    }

    const payload = req.body || {};
    const referencia = payload.referencia_externa
      ? String(payload.referencia_externa).slice(0, 255)
      : null;
    if (!referencia) return res.status(400).json({ error: 'referencia_externa es requerido' });

    const evento = String(payload.evento || '').toUpperCase().trim();
    let estado = payload.estado ? String(payload.estado).toUpperCase().trim() : null;
    if (!estado && evento && EVENTO_A_ESTADO[evento]) estado = EVENTO_A_ESTADO[evento];
    if (!estado) {
      return res
        .status(400)
        .json({ error: 'estado o evento conocido es requerido', eventos_validos: Object.keys(EVENTO_A_ESTADO) });
    }

    const pacienteId = await resolverPacienteId(payload.paciente);
    if (!pacienteId) {
      return res
        .status(404)
        .json({ error: 'Paciente no encontrado (envía paciente.id o paciente.dni)' });
    }
    const examenId = await resolverExamenId(payload.examen);
    if (!examenId) {
      return res
        .status(404)
        .json({ error: 'Examen no encontrado (envía examen.id, examen.codigo o examen.nombre)' });
    }

    const resultado = await seguimientoSvc.actualizarEstadoExamen({
      pacienteId,
      examenId,
      estado,
      motivo: payload.motivo || null,
      usuarioId: null,
      fuente: 'API_EXTERNA',
      referenciaExterna: referencia,
    });

    return res.json({
      ok: true,
      api_key: apiKey.nombre,
      paciente_id: pacienteId,
      examen_id: examenId,
      ...resultado,
    });
  } catch (err) {
    if (err.code === 'ESTADO_INVALIDO' || err.code === 'PARAM_INVALIDO') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[integraciones] examen-evento falló:', err);
    return res.status(500).json({ error: 'Error procesando el evento' });
  }
};

module.exports = {
  recibirEventoExamen,
  // Exportado para tests:
  _internals: { verificarApiKey, extraerToken, EVENTO_A_ESTADO },
};
