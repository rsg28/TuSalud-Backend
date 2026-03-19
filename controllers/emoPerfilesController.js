const pool = require('../config/database');

const EMO_TIPOS_VALIDOS = ['PREOC', 'ANUAL', 'RETIRO', 'VISITA'];

const NORMALIZE_MAP = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n',
  Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ñ: 'n',
};

function normalizarNombrePerfil(s) {
  let t = String(s || '').trim();
  // colapsar espacios (tolerar "  Perfil   A ")
  t = t.replace(/\s+/g, ' ');
  // quitar tildes básicas
  Object.entries(NORMALIZE_MAP).forEach(([k, v]) => {
    t = t.split(k).join(v);
  });
  return t.toLowerCase();
}

exports.crearPerfil = async (req, res) => {
  try {
    const nombre = String(req.body?.nombre ?? '').trim();
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

    const [exists] = await pool.execute('SELECT id FROM emo_perfiles WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [nombre]);
    if (exists.length > 0) {
      return res.status(409).json({ error: 'Ya existe un perfil con ese nombre' });
    }

    const [result] = await pool.execute('INSERT INTO emo_perfiles (nombre) VALUES (?)', [nombre]);
    const [rows] = await pool.execute('SELECT id, nombre FROM emo_perfiles WHERE id = ?', [result.insertId]);
    return res.status(201).json({ perfil: rows[0] });
  } catch (error) {
    console.error('Error al crear perfil EMO:', error);
    res.status(500).json({ error: 'Error al crear perfil EMO', details: error.message });
  }
};

exports.listarPerfiles = async (req, res) => {
  try {
    const includeExamenes = String(req.query?.include_examenes ?? '').trim() === '1';
    const [rows] = await pool.execute('SELECT id, nombre FROM emo_perfiles ORDER BY nombre ASC');

    if (!includeExamenes) {
      return res.json({ perfiles: rows });
    }

    const [mapeos] = await pool.execute(
      `SELECT mpe.perfil_id, mpe.tipo_emo, e.id AS examen_id, e.nombre AS nombre_examen
       FROM emo_perfil_examenes mpe
       JOIN examenes e ON e.id = mpe.examen_id
       ORDER BY mpe.perfil_id ASC, mpe.tipo_emo ASC, e.nombre ASC`
    );

    const perfilesMap = new Map();
    rows.forEach((p) => {
      perfilesMap.set(p.id, { id: p.id, nombre: p.nombre, examenes_por_tipo: { PREOC: [], ANUAL: [], RETIRO: [], VISITA: [] } });
    });
    mapeos.forEach((m) => {
      const perfil = perfilesMap.get(m.perfil_id);
      if (!perfil) return;
      const tipo = String(m.tipo_emo || '').toUpperCase();
      if (!perfil.examenes_por_tipo[tipo]) perfil.examenes_por_tipo[tipo] = [];
      perfil.examenes_por_tipo[tipo].push({ examen_id: m.examen_id, nombre_examen: m.nombre_examen });
    });

    return res.json({ perfiles: Array.from(perfilesMap.values()) });
  } catch (error) {
    console.error('Error al listar perfiles EMO:', error);
    res.status(500).json({ error: 'Error al listar perfiles EMO', details: error.message });
  }
};

exports.guardarExamenesPorTipo = async (req, res) => {
  try {
    const perfilId = parseInt(String(req.params?.perfilId ?? ''), 10);
    const tipoEmoRaw = String(req.body?.tipo_emo ?? '').trim().toUpperCase();
    const examenes = Array.isArray(req.body?.examenes) ? req.body.examenes : [];

    if (!Number.isInteger(perfilId) || perfilId <= 0) return res.status(400).json({ error: 'perfilId inválido' });
    if (!EMO_TIPOS_VALIDOS.includes(tipoEmoRaw)) return res.status(400).json({ error: 'tipo_emo inválido' });
    if (!Array.isArray(examenes) || examenes.length === 0) return res.status(400).json({ error: 'Debe enviar examenes' });

    const examenesIds = examenes.map((x) => parseInt(String(x), 10)).filter((n) => Number.isInteger(n) && n > 0);
    if (examenesIds.length === 0) return res.status(400).json({ error: 'examenes inválidos' });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [perfilRows] = await connection.execute('SELECT id FROM emo_perfiles WHERE id = ?', [perfilId]);
      if (perfilRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Perfil no encontrado' });
      }

      await connection.execute('DELETE FROM emo_perfil_examenes WHERE perfil_id = ? AND tipo_emo = ?', [perfilId, tipoEmoRaw]);

      const values = Array.from(new Set(examenesIds)).map((examen_id) => [perfilId, tipoEmoRaw, examen_id]);
      // INSERT en lote
      await connection.query('INSERT INTO emo_perfil_examenes (perfil_id, tipo_emo, examen_id) VALUES ?', [values]);

      await connection.commit();
      return res.json({ message: 'Mapeo EMO guardado', perfil_id: perfilId, tipo_emo: tipoEmoRaw, total: values.length });
    } catch (err) {
      await connection.rollback();
      console.error('Error guardando mapeo EMO:', err);
      return res.status(500).json({ error: 'Error al guardar mapeo EMO', details: err.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error guardarExamenesPorTipo:', error);
    res.status(500).json({ error: 'Error al guardar exámenes por tipo EMO', details: error.message });
  }
};

exports.obtenerExamenesPorTipo = async (req, res) => {
  try {
    const perfilId = parseInt(String(req.params?.perfilId ?? ''), 10);
    const tipoEmoRaw = req.query?.tipo_emo ? String(req.query.tipo_emo).trim().toUpperCase() : null;
    if (!Number.isInteger(perfilId) || perfilId <= 0) return res.status(400).json({ error: 'perfilId inválido' });
    if (!tipoEmoRaw || !EMO_TIPOS_VALIDOS.includes(tipoEmoRaw)) return res.status(400).json({ error: 'tipo_emo inválido' });

    const [rows] = await pool.execute(
      `SELECT e.id AS examen_id, e.nombre AS nombre_examen
       FROM emo_perfil_examenes mpe
       JOIN examenes e ON e.id = mpe.examen_id
       WHERE mpe.perfil_id = ? AND mpe.tipo_emo = ?
       ORDER BY e.nombre ASC`,
      [perfilId, tipoEmoRaw]
    );

    res.json({ perfil_id: perfilId, tipo_emo: tipoEmoRaw, examenes: rows });
  } catch (error) {
    console.error('Error obtenerExamenesPorTipo:', error);
    res.status(500).json({ error: 'Error al obtener mapeo EMO', details: error.message });
  }
};

exports.actualizarPerfil = async (req, res) => {
  try {
    const perfilId = parseInt(String(req.params?.perfilId ?? ''), 10);
    const nombre = String(req.body?.nombre ?? '').trim();
    if (!Number.isInteger(perfilId) || perfilId <= 0) return res.status(400).json({ error: 'perfilId inválido' });
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

    const [perfilRows] = await pool.execute('SELECT id FROM emo_perfiles WHERE id = ?', [perfilId]);
    if (perfilRows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

    const [dup] = await pool.execute(
      'SELECT id FROM emo_perfiles WHERE LOWER(nombre) = LOWER(?) AND id <> ? LIMIT 1',
      [nombre, perfilId]
    );
    if (dup.length > 0) return res.status(409).json({ error: 'Ya existe otro perfil con ese nombre' });

    await pool.execute('UPDATE emo_perfiles SET nombre = ? WHERE id = ?', [nombre, perfilId]);
    const [rows] = await pool.execute('SELECT id, nombre FROM emo_perfiles WHERE id = ?', [perfilId]);
    res.json({ perfil: rows[0] });
  } catch (error) {
    console.error('Error al actualizar perfil EMO:', error);
    res.status(500).json({ error: 'Error al actualizar perfil EMO', details: error.message });
  }
};

exports.eliminarPerfil = async (req, res) => {
  try {
    const perfilId = parseInt(String(req.params?.perfilId ?? ''), 10);
    if (!Number.isInteger(perfilId) || perfilId <= 0) return res.status(400).json({ error: 'perfilId inválido' });

    const [result] = await pool.execute('DELETE FROM emo_perfiles WHERE id = ?', [perfilId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

    res.json({ message: 'Perfil EMO eliminado' });
  } catch (error) {
    console.error('Error al eliminar perfil EMO:', error);
    res.status(500).json({ error: 'Error al eliminar perfil EMO', details: error.message });
  }
};

// Resolve: retorna el set de exámenes base por (perfilNombre + emoTipo)
exports.resolve = async (req, res) => {
  try {
    const perfilNombreRaw = String(req.query?.perfilNombre ?? '').trim();
    const emoTipoRaw = String(req.query?.emoTipo ?? '').trim().toUpperCase();
    const sede_id = req.query?.sede_id ? parseInt(String(req.query.sede_id), 10) : null;

    if (!perfilNombreRaw) return res.status(400).json({ error: 'perfilNombre es requerido' });
    if (!emoTipoRaw || !EMO_TIPOS_VALIDOS.includes(emoTipoRaw)) return res.status(400).json({ error: 'emoTipo inválido' });
    if (!Number.isInteger(sede_id) || sede_id <= 0) return res.status(400).json({ error: 'sede_id es requerido' });

    // Match tolerante a mayúsculas/minúsculas y espacios raros (y tildes básicas)
    const perfilNombreNorm = normalizarNombrePerfil(perfilNombreRaw);
    const [perfiles] = await pool.execute('SELECT id, nombre FROM emo_perfiles');
    const match = perfiles.find((p) => normalizarNombrePerfil(p.nombre) === perfilNombreNorm);
    if (!match) return res.status(404).json({ error: 'Perfil EMO no encontrado' });
    const perfil_id = match.id;

    const [rows] = await pool.execute(
      `SELECT 
          e.id AS examen_id,
          e.nombre AS nombre_examen,
          e.categoria AS examen_principal,
          COALESCE(MIN(ep.precio), MIN(ep_general.precio)) AS precio
       FROM emo_perfil_examenes mpe
       JOIN examenes e ON e.id = mpe.examen_id
       LEFT JOIN examen_precio ep 
         ON ep.examen_id = mpe.examen_id 
        AND ep.sede_id = ?
        AND (ep.vigente_hasta IS NULL OR ep.vigente_hasta >= CURDATE())
       LEFT JOIN examen_precio ep_general 
         ON ep_general.examen_id = mpe.examen_id
        AND ep_general.sede_id IS NULL
        AND (ep_general.vigente_hasta IS NULL OR ep_general.vigente_hasta >= CURDATE())
       WHERE mpe.perfil_id = ?
         AND mpe.tipo_emo = ?
         AND e.activo = 1
         AND (ep.id IS NOT NULL OR ep_general.id IS NOT NULL)
       GROUP BY e.id, e.nombre, e.categoria
       ORDER BY e.nombre ASC`,
      [sede_id, perfil_id, emoTipoRaw]
    );

    res.json({
      perfil_id,
      tipo_emo: emoTipoRaw,
      examenes: rows.map((r) => ({
        examen_id: r.examen_id,
        nombre_examen: r.nombre_examen,
        precio: r.precio != null ? Number(r.precio) : 0,
      })),
    });
  } catch (error) {
    console.error('Error en /api/emo-perfiles/resolve:', error);
    res.status(500).json({ error: 'Error al resolver perfil EMO', details: error.message });
  }
};

