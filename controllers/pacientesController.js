const pool = require('../config/database');
const { validationResult } = require('express-validator');
const { persistirSnapshotPaciente: persistirSnapshotPacienteBase } = require('../utils/perfilSnapshot');

// En el nuevo esquema los "pacientes" son pedido_pacientes (empleados por pedido).

/**
 * Congela la "foto" inmutable de exámenes asignados al paciente. Delega en
 * `utils/perfilSnapshot.persistirSnapshotPaciente` — leerá `emo_perfil_id` y
 * `emo_tipo` desde la BD si no se pasan, y nunca lanza (solo logea).
 */
function persistirSnapshotPaciente(dbConn, pacienteId) {
  return persistirSnapshotPacienteBase(dbConn, pacienteId, { tag: 'pacientes' });
}

// Listar pacientes: por pedido_id (obligatorio) o todos si no se filtra
const getAllPacientes = async (req, res) => {
  try {
    const { pedido_id, search } = req.query;
    let query = `
      SELECT pp.*, p.numero_pedido
      FROM pedido_pacientes pp
      JOIN pedidos p ON pp.pedido_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (pedido_id) {
      query += ' AND pp.pedido_id = ?';
      params.push(pedido_id);
    }

    if (search) {
      query += ' AND (pp.nombre_completo LIKE ? OR pp.dni LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    query += ' ORDER BY pp.pedido_id DESC, pp.nombre_completo';

    const [pacientes] = await pool.execute(query, params);

    // Opcional: cargar exámenes asignados y completados por paciente
    for (const pa of pacientes) {
      const [asignados] = await pool.execute(
        'SELECT examen_id FROM paciente_examen_asignado WHERE paciente_id = ?',
        [pa.id]
      );
      const [completados] = await pool.execute(
        'SELECT examen_id FROM paciente_examen_completado WHERE paciente_id = ?',
        [pa.id]
      );
      pa.examenes_asignados = asignados.map(a => a.examen_id);
      pa.examenes_completados = completados.map(c => c.examen_id);
    }

    res.json({ pacientes });
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
};

// Obtener un paciente por ID (pedido_pacientes.id)
const getPacienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT pp.*, p.numero_pedido, p.empresa_id
       FROM pedido_pacientes pp
       JOIN pedidos p ON pp.pedido_id = p.id
       WHERE pp.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const [asignados] = await pool.execute(
      'SELECT examen_id FROM paciente_examen_asignado WHERE paciente_id = ?',
      [id]
    );
    const [completados] = await pool.execute(
      'SELECT examen_id, fecha_completado FROM paciente_examen_completado WHERE paciente_id = ?',
      [id]
    );

    /**
     * `examenes_snapshot_json` viene en `rows[0]` ya como columna JSON. mysql2
     * lo devuelve como string en algunas configuraciones, así que lo
     * normalizamos a objeto antes de mandarlo al frontend.
     */
    let snapshot = rows[0].examenes_snapshot_json ?? null;
    if (typeof snapshot === 'string' && snapshot.length > 0) {
      try { snapshot = JSON.parse(snapshot); } catch { /* deja string si está corrupto */ }
    }

    res.json({
      paciente: {
        ...rows[0],
        examenes_asignados: asignados.map(a => a.examen_id),
        examenes_completados: completados,
        examenes_snapshot: snapshot,
      }
    });
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
};

// Crear paciente (en un pedido)
const createPaciente = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pedido_id, dni, nombre_completo, cargo, area, examenes } = req.body;

    if (!pedido_id || !dni || !nombre_completo) {
      return res.status(400).json({ error: 'pedido_id, dni y nombre_completo son requeridos' });
    }

    const [result] = await pool.execute(
      `INSERT INTO pedido_pacientes (pedido_id, dni, nombre_completo, cargo, area)
       VALUES (?, ?, ?, ?, ?)`,
      [pedido_id, dni, nombre_completo || null, cargo || null, area || null]
    );

    const pacienteId = result.insertId;

    if (examenes && Array.isArray(examenes) && examenes.length > 0) {
      for (const examen_id of examenes) {
        await pool.execute(
          'INSERT IGNORE INTO paciente_examen_asignado (paciente_id, examen_id) VALUES (?, ?)',
          [pacienteId, examen_id]
        );
      }
    }

    /** Congelar el snapshot histórico recién creado. */
    await persistirSnapshotPaciente(pool, pacienteId);

    const [newPaciente] = await pool.execute(
      'SELECT * FROM pedido_pacientes WHERE id = ?',
      [pacienteId]
    );
    res.status(201).json({ message: 'Paciente creado exitosamente', paciente: newPaciente[0] });
  } catch (error) {
    console.error('Error al crear paciente:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya existe un paciente con ese DNI en este pedido' });
    }
    res.status(500).json({ error: 'Error al crear paciente' });
  }
};

// Actualizar paciente
const updatePaciente = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { dni, nombre_completo, cargo, area, examenes } = req.body;

    const [existing] = await pool.execute('SELECT id FROM pedido_pacientes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    await pool.execute(
      `UPDATE pedido_pacientes SET
        dni = COALESCE(?, dni),
        nombre_completo = COALESCE(?, nombre_completo),
        cargo = ?, area = ?
      WHERE id = ?`,
      [dni || null, nombre_completo || null, cargo || null, area || null, id]
    );

    if (examenes && Array.isArray(examenes)) {
      await pool.execute('DELETE FROM paciente_examen_asignado WHERE paciente_id = ?', [id]);
      for (const examen_id of examenes) {
        await pool.execute(
          'INSERT IGNORE INTO paciente_examen_asignado (paciente_id, examen_id) VALUES (?, ?)',
          [id, examen_id]
        );
      }
      /** Solo re-congelamos cuando cambió la lista de exámenes. */
      await persistirSnapshotPaciente(pool, id);
    }

    const [updated] = await pool.execute('SELECT * FROM pedido_pacientes WHERE id = ?', [id]);
    res.json({ message: 'Paciente actualizado exitosamente', paciente: updated[0] });
  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    res.status(500).json({ error: 'Error al actualizar paciente' });
  }
};

/**
 * PUT /api/pacientes/:id/examen
 *
 * Cambia el estado de un examen para un paciente. Soporta:
 *   - Modelo nuevo: body con `{ examen_id, estado, motivo? }` donde estado ∈
 *     PENDIENTE | COMPLETADO | AUSENTE | NO_REALIZADO | POSPUESTO
 *   - Modelo legacy (frontend antiguo): `{ examen_id, completado: boolean }`
 *     → se traduce a COMPLETADO o PENDIENTE.
 */
const seguimientoSvc = require('../services/seguimientoExamenes');

const marcarExamenCompletado = async (req, res) => {
  try {
    const { id } = req.params;
    const { examen_id, estado, motivo, completado } = req.body || {};

    if (!examen_id) {
      return res.status(400).json({ error: 'examen_id es requerido' });
    }

    let estadoFinal = estado;
    if (!estadoFinal) {
      estadoFinal = completado === false ? 'PENDIENTE' : 'COMPLETADO';
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [pac] = await connection.execute(
        'SELECT id FROM pedido_pacientes WHERE id = ? FOR UPDATE',
        [id]
      );
      if (pac.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      const resultado = await seguimientoSvc.actualizarEstadoExamen(
        {
          pacienteId: Number(id),
          examenId: Number(examen_id),
          estado: estadoFinal,
          motivo: motivo || null,
          usuarioId: req.user?.id || null,
          fuente: 'MANUAL',
        },
        connection
      );

      try {
        const { registrarAuditoria } = require('../utils/audit');
        await registrarAuditoria(
          req,
          {
            accion: 'EXAMEN_ESTADO_ACTUALIZADO',
            recurso_tipo: 'PACIENTE_EXAMEN',
            recurso_id: `${id}:${examen_id}`,
            descripcion: `Examen ${examen_id} del paciente ${id} → ${resultado.estadoNuevo}`,
            detalle: {
              estado_anterior: resultado.estadoAnterior,
              estado_nuevo: resultado.estadoNuevo,
              motivo: motivo || null,
            },
          },
          connection
        );
      } catch (_) { /* best-effort */ }

      await connection.commit();
      connection.release();

      return res.json({
        message: `Examen actualizado a ${resultado.estadoNuevo}`,
        ...resultado,
      });
    } catch (err) {
      try { await connection.rollback(); } catch (_) {}
      connection.release();
      throw err;
    }
  } catch (error) {
    if (error.code === 'ESTADO_INVALIDO' || error.code === 'PARAM_INVALIDO') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al marcar examen:', error);
    res.status(500).json({ error: 'Error al actualizar estado del examen' });
  }
};

/**
 * POST /api/pacientes/:id/estado-masivo
 *
 * Aplica un mismo estado (típicamente AUSENTE) a todos los exámenes
 * pendientes del paciente. Útil cuando el paciente no se presentó a la
 * clínica: un click cierra todos sus exámenes a la vez.
 */
const actualizarEstadoMasivoPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, motivo, sobrescribir_completados } = req.body || {};

    if (!estado) return res.status(400).json({ error: 'estado es requerido' });

    const [pac] = await pool.execute('SELECT id FROM pedido_pacientes WHERE id = ?', [id]);
    if (pac.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });

    const resultado = await seguimientoSvc.actualizarEstadoMasivoPaciente({
      pacienteId: Number(id),
      estado,
      motivo: motivo || null,
      usuarioId: req.user?.id || null,
      soloPendientes: sobrescribir_completados !== true,
    });

    return res.json(resultado);
  } catch (error) {
    if (error.code === 'ESTADO_INVALIDO' || error.code === 'PARAM_INVALIDO') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al actualizar masivo paciente:', error);
    res.status(500).json({ error: 'Error al actualizar exámenes del paciente' });
  }
};

/**
 * GET /api/pacientes/:id/historial-examenes
 *
 * Devuelve el historial completo de transiciones de estado de un paciente.
 * Útil para que el manager audite (cuándo se marcó como ausente, quién lo
 * marcó, qué motivo dejó).
 */
const obtenerHistorialExamenesPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const [filas] = await pool.execute(
      `SELECT peh.id, peh.examen_id, ex.nombre AS examen_nombre,
              peh.estado_anterior, peh.estado_nuevo, peh.motivo,
              peh.fuente, peh.referencia_externa, peh.created_at,
              peh.usuario_id, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido, u.rol AS usuario_rol
         FROM paciente_examen_historial peh
         LEFT JOIN examenes ex ON ex.id = peh.examen_id
         LEFT JOIN usuarios u ON u.id = peh.usuario_id
        WHERE peh.paciente_id = ?
        ORDER BY peh.created_at DESC
        LIMIT 500`,
      [id]
    );
    return res.json({ paciente_id: Number(id), eventos: filas });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// Eliminar paciente
const deletePaciente = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT id FROM pedido_pacientes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    await pool.execute('DELETE FROM pedido_pacientes WHERE id = ?', [id]);
    res.json({ message: 'Paciente eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    res.status(500).json({ error: 'Error al eliminar paciente' });
  }
};

module.exports = {
  getAllPacientes,
  getPacienteById,
  createPaciente,
  updatePaciente,
  deletePaciente,
  marcarExamenCompletado,
  actualizarEstadoMasivoPaciente,
  obtenerHistorialExamenesPaciente,
};
