const pool = require('../config/database');

const EMO_TIPOS_VALIDOS = ['PREOC', 'ANUAL', 'RETIRO', 'VISITA'];

const NORMALIZE_MAP = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n',
  Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ñ: 'n',
};

function normalizarNombrePerfil(s) {
  let t = String(s || '').trim();
  t = t.replace(/\u00a0/g, ' ').replace(/[\u200b-\u200d\ufeff]/g, '');
  // colapsar espacios (tolerar "  Perfil   A ")
  t = t.replace(/\s+/g, ' ');
  // quitar tildes básicas
  Object.entries(NORMALIZE_MAP).forEach(([k, v]) => {
    t = t.split(k).join(v);
  });
  return t.toLowerCase();
}

function normalizarNombrePerfilCompacto(s) {
  return normalizarNombrePerfil(s).replace(/\s/g, '');
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

    const qRaw = req.query?.q ?? req.query?.buscar ?? '';
    const q = String(qRaw).trim();

    const tipoEmoRaw = req.query?.tipo_emo ? String(req.query.tipo_emo).trim().toUpperCase() : null;
    const filtrarPorTipo = tipoEmoRaw && EMO_TIPOS_VALIDOS.includes(tipoEmoRaw) ? true : false;

    // Base de perfiles: si hay búsqueda y/o filtro por tipo, se reduce en BD.
    let sql = 'SELECT id, nombre FROM emo_perfiles';
    const params = [];
    const wheres = [];
    if (q) {
      wheres.push('LOWER(nombre) LIKE LOWER(?)');
      params.push(`%${q}%`);
    }
    if (filtrarPorTipo) {
      wheres.push(`EXISTS (
        SELECT 1 FROM emo_perfil_examenes mpe
        WHERE mpe.perfil_id = emo_perfiles.id AND mpe.tipo_emo = ?
      )`);
      params.push(tipoEmoRaw);
    }
    if (wheres.length > 0) sql += ` WHERE ${wheres.join(' AND ')}`;
    sql += ' ORDER BY nombre ASC';

    const [rows] = await pool.execute(sql, params);

    if (!includeExamenes) {
      return res.json({ perfiles: rows });
    }

    // Incluye exámenes por tipo para que UI pueda mostrar/usar sin resolver uno a uno.
    let mapSql = `SELECT mpe.perfil_id, mpe.tipo_emo, e.id AS examen_id, e.nombre AS nombre_examen
                  FROM emo_perfil_examenes mpe
                  JOIN examenes e ON e.id = mpe.examen_id`;
    const mapParams = [];
    if (filtrarPorTipo) {
      mapSql += ' WHERE mpe.tipo_emo = ?';
      mapParams.push(tipoEmoRaw);
    }
    mapSql += ' ORDER BY mpe.perfil_id ASC, mpe.tipo_emo ASC, e.nombre ASC';

    const [mapeos] = await pool.execute(mapSql, mapParams);

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

    const examenesIds = (Array.isArray(examenes) ? examenes : [])
      .map((x) => parseInt(String(x), 10))
      .filter((n) => Number.isInteger(n) && n > 0);

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
      // INSERT en lote (solo si hay datos)
      if (values.length > 0) {
        await connection.query('INSERT INTO emo_perfil_examenes (perfil_id, tipo_emo, examen_id) VALUES ?', [values]);
      }

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

// Resolver precio para (perfil_id, tipo_emo, [empresa_id], [sede_id]).
// Prioridad: (empresa, sede) > (empresa, NULL) > (NULL, sede) > (NULL, NULL).
// Si no hay precio configurado, devuelve la suma de precios base de los exámenes del perfil.
exports.precio = async (req, res) => {
  try {
    const perfilId = parseInt(String(req.params?.perfilId ?? ''), 10);
    const tipoEmoRaw = String(req.query?.tipo_emo ?? '').trim().toUpperCase();
    const empresaId = req.query?.empresa_id ? parseInt(String(req.query.empresa_id), 10) : null;
    const sedeId = req.query?.sede_id ? parseInt(String(req.query.sede_id), 10) : null;

    if (!Number.isInteger(perfilId) || perfilId <= 0) return res.status(400).json({ error: 'perfilId inválido' });
    if (!EMO_TIPOS_VALIDOS.includes(tipoEmoRaw)) return res.status(400).json({ error: 'tipo_emo inválido' });

    const [perfilRows] = await pool.execute('SELECT id, nombre FROM emo_perfiles WHERE id = ?', [perfilId]);
    if (perfilRows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

    // Buscamos el precio más específico disponible.
    const candidatos = [];
    if (empresaId && sedeId) candidatos.push({ empresa_id: empresaId, sede_id: sedeId, prioridad: 1 });
    if (empresaId) candidatos.push({ empresa_id: empresaId, sede_id: null, prioridad: 2 });
    if (sedeId) candidatos.push({ empresa_id: null, sede_id: sedeId, prioridad: 3 });
    candidatos.push({ empresa_id: null, sede_id: null, prioridad: 4 });

    let precio = null;
    let origen = null;
    for (const c of candidatos) {
      const [rows] = await pool.execute(
        `SELECT precio FROM emo_perfil_precio
         WHERE perfil_id = ? AND tipo_emo = ?
           AND ((? IS NULL AND empresa_id IS NULL) OR empresa_id = ?)
           AND ((? IS NULL AND sede_id IS NULL) OR sede_id = ?)
         LIMIT 1`,
        [perfilId, tipoEmoRaw, c.empresa_id, c.empresa_id, c.sede_id, c.sede_id]
      );
      if (rows.length > 0 && rows[0].precio != null) {
        precio = Number(rows[0].precio);
        origen = c.empresa_id && c.sede_id
          ? 'empresa_sede'
          : c.empresa_id
            ? 'empresa'
            : c.sede_id
              ? 'sede'
              : 'global';
        break;
      }
    }

    // Fallback: suma de precios base de los exámenes del perfil para esa sede (o global).
    let precio_sugerido = null;
    if (precio == null) {
      const [sumRows] = await pool.execute(
        `SELECT COALESCE(SUM(COALESCE(ep.precio, ep_general.precio, 0)), 0) AS suma
         FROM emo_perfil_examenes mpe
         LEFT JOIN examen_precio ep
           ON ep.examen_id = mpe.examen_id
          AND ep.sede_id = ?
          AND (ep.vigente_hasta IS NULL OR ep.vigente_hasta >= CURDATE())
         LEFT JOIN examen_precio ep_general
           ON ep_general.examen_id = mpe.examen_id
          AND ep_general.sede_id IS NULL
          AND (ep_general.vigente_hasta IS NULL OR ep_general.vigente_hasta >= CURDATE())
         WHERE mpe.perfil_id = ? AND mpe.tipo_emo = ?`,
        [sedeId, perfilId, tipoEmoRaw]
      );
      precio_sugerido = Number(sumRows[0]?.suma ?? 0);
    }

    return res.json({
      perfil_id: perfilId,
      tipo_emo: tipoEmoRaw,
      empresa_id: empresaId,
      sede_id: sedeId,
      precio,
      origen,
      precio_sugerido,
    });
  } catch (error) {
    console.error('Error al resolver precio del perfil:', error);
    res.status(500).json({ error: 'Error al resolver precio del perfil', details: error.message });
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

    // Match tolerante a mayúsculas/minúsculas, espacios raros, NBSP y segunda pasada sin espacios.
    const perfilNombreNorm = normalizarNombrePerfil(perfilNombreRaw);
    const perfilNombreCompact = normalizarNombrePerfilCompacto(perfilNombreRaw);
    const [perfiles] = await pool.execute('SELECT id, nombre FROM emo_perfiles');
    let match = perfiles.find((p) => normalizarNombrePerfil(p.nombre) === perfilNombreNorm);
    let coincidenciaLaxa = false;
    if (!match && perfilNombreCompact.length >= 2) {
      match = perfiles.find((p) => normalizarNombrePerfilCompacto(p.nombre) === perfilNombreCompact);
      if (match) coincidenciaLaxa = true;
    }
    /** Si aún no hay match: subcadena (archivo contenido en nombre BD o al revés, con longitud mínima). */
    let coincidenciaParcial = false;
    if (!match && perfilNombreNorm.length >= 3) {
      const porContieneArchivo = perfiles.filter((p) =>
        normalizarNombrePerfil(p.nombre).includes(perfilNombreNorm)
      );
      if (porContieneArchivo.length === 1) {
        match = porContieneArchivo[0];
        coincidenciaParcial = true;
      } else if (porContieneArchivo.length > 1) {
        porContieneArchivo.sort(
          (a, b) => normalizarNombrePerfil(a.nombre).length - normalizarNombrePerfil(b.nombre).length
        );
        match = porContieneArchivo[0];
        coincidenciaParcial = true;
      }
    }
    if (!match && perfilNombreNorm.length >= 5) {
      match = perfiles.find((p) => {
        const pn = normalizarNombrePerfil(p.nombre);
        return pn.length >= 5 && perfilNombreNorm.includes(pn);
      });
      if (match) coincidenciaParcial = true;
    }
    if (!match) return res.status(404).json({ error: 'Perfil EMO no encontrado' });
    const perfil_id = match.id;
    const nombrePerfilBd = String(match.nombre || '').trim();
    /** Texto del archivo distinto al nombre en BD (misma resolución lógica). */
    const textoDistintoDeBd =
      perfilNombreRaw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() !==
      nombrePerfilBd.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

    // Incluir exámenes del perfil aunque aún no tengan fila en examen_precio (precio 0 hasta que exista tarifa).
    const [rows] = await pool.execute(
      `SELECT 
          e.id AS examen_id,
          e.nombre AS nombre_examen,
          e.categoria AS examen_principal,
          COALESCE(MIN(ep.precio), MIN(ep_general.precio), 0) AS precio
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
       GROUP BY e.id, e.nombre, e.categoria
       ORDER BY e.nombre ASC`,
      [sede_id, perfil_id, emoTipoRaw]
    );

    res.json({
      perfil_id,
      tipo_emo: emoTipoRaw,
      nombre_perfil_bd: nombrePerfilBd,
      /** true si solo coincidió la forma compacta (sin espacios), no el nombre normalizado completo. */
      coincidencia_laxa: coincidenciaLaxa,
      /** true si coincidió por contención de texto (nombre parcial). */
      coincidencia_parcial: coincidenciaParcial,
      /** true si el texto enviado no es idéntico al nombre del perfil en base de datos (espacios ya unificados). */
      texto_distinto_de_bd: textoDistintoDeBd,
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

