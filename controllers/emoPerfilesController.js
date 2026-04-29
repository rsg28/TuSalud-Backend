const pool = require('../config/database');
const {
  helpers: { emitirNotificacionAClientesDeEmpresa },
} = require('./notificacionesController');

const EMO_TIPOS_VALIDOS = ['PREOC', 'ANUAL', 'RETIRO', 'VISITA'];

/**
 * Notifica a los clientes de cada empresa afectada (directa o vía grupo) que
 * tienen un nuevo perfil disponible. Los precios se asignan después en el
 * flujo de cotización; este aviso es solo "tienes acceso a un perfil nuevo".
 */
async function notificarAsignacionPerfilAClientes(perfilId, perfilNombre, empresaIds, grupoIds, remitenteUsuarioId) {
  if ((!empresaIds || empresaIds.length === 0) && (!grupoIds || grupoIds.length === 0)) return;
  const empresasFinales = new Set();
  (empresaIds || []).forEach((id) => empresasFinales.add(id));
  if (grupoIds && grupoIds.length > 0) {
    const placeholders = grupoIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT empresa_id FROM empresa_grupo WHERE grupo_id IN (${placeholders})`,
      grupoIds
    );
    rows.forEach((r) => empresasFinales.add(r.empresa_id));
  }
  if (empresasFinales.size === 0) return;

  const conn = await pool.getConnection();
  try {
    for (const empresaId of empresasFinales) {
      await emitirNotificacionAClientesDeEmpresa(conn, {
        empresaId,
        tipo: 'PERFIL_ASIGNADO',
        titulo: `Nuevo perfil disponible: ${perfilNombre}`,
        mensaje: `Se asignó el perfil "${perfilNombre}" a tu empresa. Ya puedes seleccionarlo al armar pedidos.`,
        contextoJson: {
          perfil_id: perfilId,
          perfil_nombre: perfilNombre,
          empresa_id: empresaId,
        },
        remitenteUsuarioId: remitenteUsuarioId || null,
      });
    }
  } finally {
    conn.release();
  }
}

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

/**
 * Normaliza los IDs numéricos enviados desde el body (acepta arrays con strings)
 * y elimina duplicados / valores no positivos.
 */
function normalizarIdsArray(arr) {
  return [
    ...new Set(
      (Array.isArray(arr) ? arr : [])
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
    ),
  ];
}

const VISIBILIDADES_VALIDAS = ['GLOBAL', 'PRIVADO'];

exports.crearPerfil = async (req, res) => {
  try {
    const nombre = String(req.body?.nombre ?? '').trim();
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

    const visibilidadRaw = String(req.body?.visibilidad ?? 'GLOBAL').trim().toUpperCase();
    const visibilidad = VISIBILIDADES_VALIDAS.includes(visibilidadRaw) ? visibilidadRaw : 'GLOBAL';
    const empresaIds = normalizarIdsArray(req.body?.empresa_ids);
    const grupoIds = normalizarIdsArray(req.body?.grupo_ids);

    // Coherencia: si se piden asignaciones (empresas o grupos) el perfil debe ser PRIVADO.
    const visibilidadFinal =
      empresaIds.length > 0 || grupoIds.length > 0 ? 'PRIVADO' : visibilidad;

    const [exists] = await pool.execute(
      'SELECT id FROM emo_perfiles WHERE LOWER(nombre) = LOWER(?) LIMIT 1',
      [nombre]
    );
    if (exists.length > 0) {
      return res.status(409).json({ error: 'Ya existe un perfil con ese nombre' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        'INSERT INTO emo_perfiles (nombre, visibilidad) VALUES (?, ?)',
        [nombre, visibilidadFinal]
      );
      const perfilId = result.insertId;

      if (empresaIds.length > 0) {
        const values = empresaIds.map((empresaId) => [perfilId, empresaId]);
        await conn.query(
          'INSERT IGNORE INTO emo_perfil_asignacion (perfil_id, empresa_id) VALUES ?',
          [values]
        );
      }
      if (grupoIds.length > 0) {
        const values = grupoIds.map((grupoId) => [perfilId, grupoId]);
        await conn.query(
          'INSERT IGNORE INTO emo_perfil_grupo_asignacion (perfil_id, grupo_id) VALUES ?',
          [values]
        );
      }
      await conn.commit();

      const [rows] = await pool.execute(
        'SELECT id, nombre, visibilidad FROM emo_perfiles WHERE id = ?',
        [perfilId]
      );

      // Notificar a clientes (best-effort).
      if (visibilidadFinal === 'PRIVADO') {
        try {
          await notificarAsignacionPerfilAClientes(
            perfilId,
            nombre,
            empresaIds,
            grupoIds,
            req.user ? req.user.id : null
          );
        } catch (notifErr) {
          console.warn('No se pudo emitir notificación de perfil asignado:', notifErr?.message);
        }
      }

      return res.status(201).json({ perfil: rows[0] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error al crear perfil EMO:', error);
    res.status(500).json({ error: 'Error al crear perfil EMO', details: error.message });
  }
};

/**
 * Sincroniza la visibilidad y asignaciones (empresas y grupos) de un perfil.
 * PUT /api/emo-perfiles/:perfilId/visibilidad
 * Body: { visibilidad: 'GLOBAL'|'PRIVADO', empresa_ids?: number[], grupo_ids?: number[] }
 *
 * Si se envían `empresa_ids` o `grupo_ids` con valores → fuerza visibilidad PRIVADO
 * (independiente de lo enviado) para mantener invariante "PRIVADO ⇔ tiene asignaciones".
 */
exports.actualizarVisibilidad = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const perfilId = parseInt(String(req.params?.perfilId ?? ''), 10);
    if (!Number.isInteger(perfilId) || perfilId <= 0) {
      conn.release();
      return res.status(400).json({ error: 'perfilId inválido' });
    }
    const visibilidadRaw = String(req.body?.visibilidad ?? '').trim().toUpperCase();
    if (!VISIBILIDADES_VALIDAS.includes(visibilidadRaw)) {
      conn.release();
      return res.status(400).json({ error: 'visibilidad inválida (GLOBAL|PRIVADO)' });
    }
    const empresaIds = normalizarIdsArray(req.body?.empresa_ids);
    const grupoIds = normalizarIdsArray(req.body?.grupo_ids);
    const visibilidadFinal =
      visibilidadRaw === 'GLOBAL' && empresaIds.length === 0 && grupoIds.length === 0
        ? 'GLOBAL'
        : 'PRIVADO';

    await conn.beginTransaction();
    const [perfil] = await conn.execute('SELECT id FROM emo_perfiles WHERE id = ?', [perfilId]);
    if (perfil.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    await conn.execute('UPDATE emo_perfiles SET visibilidad = ? WHERE id = ?', [visibilidadFinal, perfilId]);
    await conn.execute('DELETE FROM emo_perfil_asignacion WHERE perfil_id = ?', [perfilId]);
    await conn.execute('DELETE FROM emo_perfil_grupo_asignacion WHERE perfil_id = ?', [perfilId]);

    if (visibilidadFinal === 'PRIVADO') {
      if (empresaIds.length > 0) {
        const values = empresaIds.map((empresaId) => [perfilId, empresaId]);
        await conn.query(
          'INSERT IGNORE INTO emo_perfil_asignacion (perfil_id, empresa_id) VALUES ?',
          [values]
        );
      }
      if (grupoIds.length > 0) {
        const values = grupoIds.map((grupoId) => [perfilId, grupoId]);
        await conn.query(
          'INSERT IGNORE INTO emo_perfil_grupo_asignacion (perfil_id, grupo_id) VALUES ?',
          [values]
        );
      }
    }

    await conn.commit();

    // Notificar a clientes (best-effort).
    if (visibilidadFinal === 'PRIVADO') {
      try {
        const [pn] = await pool.execute('SELECT nombre FROM emo_perfiles WHERE id = ?', [perfilId]);
        const nombrePerfil = pn[0]?.nombre || `Perfil #${perfilId}`;
        await notificarAsignacionPerfilAClientes(
          perfilId,
          nombrePerfil,
          empresaIds,
          grupoIds,
          req.user ? req.user.id : null
        );
      } catch (notifErr) {
        console.warn('No se pudo emitir notificación de visibilidad actualizada:', notifErr?.message);
      }
    }

    res.json({
      message: 'Visibilidad actualizada',
      perfil_id: perfilId,
      visibilidad: visibilidadFinal,
      empresa_ids: empresaIds,
      grupo_ids: grupoIds,
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error al actualizar visibilidad de perfil EMO:', error);
    res.status(500).json({ error: 'Error al actualizar visibilidad', details: error.message });
  } finally {
    conn.release();
  }
};

/**
 * Lista los perfiles visibles para una empresa, según las reglas:
 *   - GLOBAL              → todos
 *   - PRIVADO + asignación directa empresa  → incluido
 *   - PRIVADO + asignación a grupo del que la empresa es miembro → incluido
 *
 * Cada perfil se devuelve UNA sola vez aunque coincida por más de una vía;
 * `origenes` indica todas las razones por las que es visible
 * ('GLOBAL', 'EMPRESA', 'GRUPO:<nombre>').
 *
 * GET /api/emo-perfiles/visibles-para-empresa/:empresaId
 */
exports.listarVisiblesParaEmpresa = async (req, res) => {
  try {
    const empresaId = parseInt(String(req.params?.empresaId ?? ''), 10);
    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      return res.status(400).json({ error: 'empresaId inválido' });
    }

    const [emp] = await pool.execute('SELECT id FROM empresas WHERE id = ?', [empresaId]);
    if (emp.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });

    const qRaw = req.query?.q ?? req.query?.buscar ?? '';
    const q = String(qRaw).trim();
    const tipoEmoRaw = req.query?.tipo_emo ? String(req.query.tipo_emo).trim().toUpperCase() : null;
    const filtrarPorTipo = tipoEmoRaw && EMO_TIPOS_VALIDOS.includes(tipoEmoRaw);

    const filtros = [];
    const params = [empresaId, empresaId];
    if (q) {
      filtros.push('LOWER(p.nombre) LIKE LOWER(?)');
      params.push(`%${q}%`);
    }
    if (filtrarPorTipo) {
      filtros.push(
        `EXISTS (SELECT 1 FROM emo_perfil_examenes mpe
                  WHERE mpe.perfil_id = p.id AND mpe.tipo_emo = ?)`
      );
      params.push(tipoEmoRaw);
    }
    const whereExtra = filtros.length > 0 ? ` AND (${filtros.join(' AND ')})` : '';

    // Trae perfiles + indicadores de origen para esa empresa.
    const [rows] = await pool.execute(
      `SELECT p.id, p.nombre, p.visibilidad,
              CASE WHEN p.visibilidad = 'GLOBAL' THEN 1 ELSE 0 END AS es_global,
              CASE WHEN epa.empresa_id IS NOT NULL THEN 1 ELSE 0 END AS asignado_empresa,
              GROUP_CONCAT(DISTINCT g.nombre ORDER BY g.nombre SEPARATOR '|') AS grupos_nombres
         FROM emo_perfiles p
    LEFT JOIN emo_perfil_asignacion epa
           ON epa.perfil_id = p.id AND epa.empresa_id = ?
    LEFT JOIN emo_perfil_grupo_asignacion epga
           ON epga.perfil_id = p.id
    LEFT JOIN empresa_grupo eg
           ON eg.grupo_id = epga.grupo_id AND eg.empresa_id = ?
    LEFT JOIN grupos_empresariales g
           ON g.id = epga.grupo_id AND eg.empresa_id IS NOT NULL
        WHERE (p.visibilidad = 'GLOBAL'
           OR epa.empresa_id IS NOT NULL
           OR eg.empresa_id IS NOT NULL)
           ${whereExtra}
     GROUP BY p.id, p.nombre, p.visibilidad
     ORDER BY p.nombre ASC`,
      params
    );

    const perfiles = rows.map((r) => {
      const origenes = [];
      if (r.es_global) origenes.push('GLOBAL');
      if (r.asignado_empresa) origenes.push('EMPRESA');
      if (r.grupos_nombres) {
        String(r.grupos_nombres)
          .split('|')
          .filter(Boolean)
          .forEach((g) => origenes.push(`GRUPO:${g}`));
      }
      return {
        id: r.id,
        nombre: r.nombre,
        visibilidad: r.visibilidad,
        origenes,
      };
    });

    res.json({ empresa_id: empresaId, perfiles });
  } catch (error) {
    console.error('Error al listar perfiles visibles para empresa:', error);
    res.status(500).json({ error: 'Error al listar perfiles para empresa', details: error.message });
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
    let sql = 'SELECT id, nombre, visibilidad FROM emo_perfiles';
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
      perfilesMap.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        visibilidad: p.visibilidad,
        examenes_por_tipo: { PREOC: [], ANUAL: [], RETIRO: [], VISITA: [] },
      });
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
    // Importación: validar contra perfil real en BD.
    // Se permite exacto normalizado y coincidencia compacta (sin espacios),
    // pero no coincidencia parcial por contención para evitar falsos positivos.
    const coincidenciaParcial = false;
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
          ec.nombre AS examen_principal,
          COALESCE(MIN(ep.precio), MIN(ep_general.precio), 0) AS precio
       FROM emo_perfil_examenes mpe
       JOIN examenes e ON e.id = mpe.examen_id
       LEFT JOIN emo_categorias ec ON ec.id = e.categoria_id
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
       GROUP BY e.id, e.nombre, ec.nombre
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

