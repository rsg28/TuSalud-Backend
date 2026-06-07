/**
 * Controller de presencia colaborativa (soft-lock).
 *
 * Endpoints:
 *   POST   /api/presencia/heartbeat       → marca al usuario como activo en un recurso.
 *   DELETE /api/presencia/:tipo/:id       → libera el lock (al cerrar la pantalla).
 *   GET    /api/presencia/:tipo/:id       → lista quiénes están activos en el recurso.
 *
 * El lock NO bloquea operaciones: solo sirve para que el frontend muestre
 * "Pedro está editando esto". La integridad sigue garantizada por TX/CAS.
 */

const presencia = require('../utils/presencia');

async function heartbeat(req, res) {
  try {
    const { recurso_tipo, recurso_id, accion } = req.body || {};
    await presencia.heartbeat(req.user, { recurso_tipo, recurso_id, accion });
    res.json({ ok: true });
  } catch (err) {
    if (/recurso_tipo|recurso_id|usuario/i.test(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error en presencia/heartbeat:', err);
    res.status(500).json({ error: 'Error registrando presencia' });
  }
}

async function listar(req, res) {
  try {
    const { tipo, id } = req.params;
    const activos = await presencia.listarActivos(tipo, id);
    // Filtramos al usuario actual: no tiene sentido decirle "estás editando esto".
    const otros = req.user?.id
      ? activos.filter((a) => Number(a.usuario_id) !== Number(req.user.id))
      : activos;
    res.json({
      recurso_tipo: tipo,
      recurso_id: id,
      activos: otros,
      total_otros: otros.length,
    });
  } catch (err) {
    console.error('Error listando presencia:', err);
    res.status(500).json({ error: 'Error listando presencia' });
  }
}

async function liberar(req, res) {
  try {
    const { tipo, id } = req.params;
    await presencia.liberar(req.user, { recurso_tipo: tipo, recurso_id: id });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error liberando presencia:', err);
    res.status(500).json({ error: 'Error liberando presencia' });
  }
}

module.exports = { heartbeat, listar, liberar };
