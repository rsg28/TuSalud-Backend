const pool = require('../config/database');

// =====================================================
// PRECIOS - Nuevo esquema: examenes + examen_precio (por sede)
// No existe tabla precios_empresa; precios son por examen y sede.
// =====================================================

// Obtener matriz de artículos (exámenes con precios por sede)
exports.obtenerMatrizArticulos = async (req, res) => {
  try {
    const { empresa_id, sede_id } = req.query;

    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }

    // Precios: examen_precio con sede_id = X o sede_id IS NULL (precio general)
    const [articulos] = await pool.query(
      `SELECT 
        e.id AS examen_id,
        e.nombre AS nombre_examen,
        e.categoria AS examen_principal,
        e.codigo,
        COALESCE(ep.precio, ep_general.precio) AS precio_lista,
        COALESCE(ep.precio, ep_general.precio) AS precio_aplicable
      FROM examenes e
      LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
      LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
      WHERE e.activo = 1
        AND (ep.id IS NOT NULL OR ep_general.id IS NOT NULL)
      ORDER BY e.categoria, e.nombre`,
      [sede_id]
    );

    const matriz = {};
    articulos.forEach(art => {
      const categoria = art.examen_principal || 'OTROS';
      if (!matriz[categoria]) matriz[categoria] = [];
      matriz[categoria].push({
        ...art,
        sede_id: parseInt(sede_id, 10),
        precio_empresa: art.precio_aplicable
      });
    });

    res.json({
      matriz,
      total_articulos: articulos.length,
      sede_id: parseInt(sede_id, 10),
      empresa_id: empresa_id ? parseInt(empresa_id, 10) : null
    });
  } catch (error) {
    console.error('Error al obtener matriz:', error);
    res.status(500).json({ error: 'Error al obtener matriz de artículos' });
  }
};

// Buscar exámenes por texto (nombre o código) en el catálogo activo.
// Nota: para validación de importación se debe comprobar existencia en BD,
// no solo exámenes con tarifa vigente.
exports.buscarExamenes = async (req, res) => {
  try {
    const { sede_id, q } = req.query;
    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }
    const term = (q || '').trim();
    if (!term || term.length < 2) {
      return res.json({ examenes: [] });
    }
    // INSTR(s, sub) evita que `_` y `%` en el término se interpreten como comodines de SQL LIKE.
    const [examenes] = await pool.query(
      `SELECT 
        e.id AS examen_id,
        e.nombre AS nombre_examen,
        e.categoria AS examen_principal,
        COALESCE(MIN(ep.precio), MIN(ep_general.precio), 0) AS precio
      FROM examenes e
      LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ? AND (ep.vigente_hasta IS NULL OR ep.vigente_hasta >= CURDATE())
      LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL AND (ep_general.vigente_hasta IS NULL OR ep_general.vigente_hasta >= CURDATE())
      WHERE e.activo = 1
        AND (
          INSTR(LOWER(e.nombre), LOWER(?)) > 0
          OR INSTR(LOWER(IFNULL(e.codigo, '')), LOWER(?)) > 0
        )
      GROUP BY e.id, e.nombre, e.categoria
      ORDER BY e.nombre
      LIMIT 30`,
      [sede_id, term, term]
    );
    res.json({ examenes });
  } catch (error) {
    console.error('Error al buscar exámenes:', error);
    res.status(500).json({ error: 'Error al buscar exámenes' });
  }
};

// Listar todas las categorías de exámenes activos en la sede (incluso si
// no tienen precio asignado todavía). Devuelve además cuántos están sin asignar
// para que el manager pueda priorizar la carga del catálogo.
exports.listarCategorias = async (req, res) => {
  try {
    const { sede_id } = req.query;
    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }
    const [rows] = await pool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(e.categoria), ''), 'Otros') AS nombre,
         COUNT(*) AS cantidad,
         SUM(CASE WHEN COALESCE(ep.precio, ep_general.precio) IS NULL OR COALESCE(ep.precio, ep_general.precio) = 0
                  THEN 1 ELSE 0 END) AS sin_precio
       FROM examenes e
       LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
       LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
       WHERE e.activo = 1
       GROUP BY COALESCE(NULLIF(TRIM(e.categoria), ''), 'Otros')
       ORDER BY nombre`,
      [sede_id]
    );
    res.json({ categorias: rows });
  } catch (error) {
    console.error('Error al listar categorías:', error);
    res.status(500).json({ error: 'Error al listar categorías' });
  }
};

// Listar exámenes de una categoría (todos los activos, con o sin precio)
exports.listarExamenesPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;
    const { sede_id } = req.query;
    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }
    const categoriaDecoded = decodeURIComponent(categoria || '');
    const [examenes] = await pool.query(
      `SELECT
        e.id AS examen_id,
        e.nombre AS nombre_examen,
        e.categoria AS examen_principal,
        e.codigo,
        COALESCE(ep.precio, ep_general.precio) AS precio,
        ep.id AS precio_sede_id,
        ep_general.id AS precio_general_id
       FROM examenes e
       LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
       LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
       WHERE e.activo = 1
         AND (COALESCE(NULLIF(TRIM(e.categoria), ''), 'Otros') = ?)
       ORDER BY e.nombre`,
      [sede_id, categoriaDecoded]
    );
    res.json({ examenes });
  } catch (error) {
    console.error('Error al listar exámenes por categoría:', error);
    res.status(500).json({ error: 'Error al listar exámenes por categoría' });
  }
};

/**
 * Lista todos los perfiles EMO con su precio para la sede dada. Devuelve un
 * array agrupado por perfil con un sub-array de tipos EMO y sus precios.
 *
 * Selecciona el precio en este orden de prioridad:
 *   1. (perfil, sede, NULL empresa)         → precio negociado de la sede
 *   2. (perfil, NULL sede, NULL empresa)    → precio base global (catálogo)
 *
 * Si un perfil no tiene fila en `emo_perfil_precio` para un tipo_emo dado,
 * `precio` viene NULL → la UI lo muestra como "Sin asignar".
 */
exports.listarPerfilesConPrecio = async (req, res) => {
  try {
    const { sede_id } = req.query;
    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }
    const [perfiles] = await pool.query(
      `SELECT
         p.id AS perfil_id,
         p.nombre,
         p.tipo,
         p.descripcion,
         p.visibilidad,
         (SELECT COUNT(DISTINCT examen_id) FROM emo_perfil_examenes WHERE perfil_id = p.id) AS total_examenes
       FROM emo_perfiles p
       ORDER BY p.nombre`
    );
    if (perfiles.length === 0) {
      return res.json({ perfiles: [] });
    }
    const ids = perfiles.map((p) => p.perfil_id);
    // Trae todos los precios relevantes (sede o global) para los perfiles
    // listados, en una sola query para evitar N+1.
    const placeholders = ids.map(() => '?').join(',');
    const [precios] = await pool.query(
      `SELECT
         pp.perfil_id,
         pp.tipo_emo,
         pp.sede_id,
         pp.precio
       FROM emo_perfil_precio pp
       WHERE pp.empresa_id IS NULL
         AND (pp.sede_id = ? OR pp.sede_id IS NULL)
         AND pp.perfil_id IN (${placeholders})`,
      [sede_id, ...ids]
    );
    const TIPOS = ['PREOC', 'ANUAL', 'RETIRO', 'VISITA'];
    const indexPerfil = new Map();
    for (const p of perfiles) {
      const tipos = TIPOS.map((t) => ({ tipo_emo: t, precio: null, origen: null }));
      indexPerfil.set(p.perfil_id, { perfil: p, tipos });
    }
    for (const row of precios) {
      const entry = indexPerfil.get(row.perfil_id);
      if (!entry) continue;
      const slot = entry.tipos.find((t) => t.tipo_emo === row.tipo_emo);
      if (!slot) continue;
      // sede explícita gana sobre global
      const esSede = row.sede_id != null;
      const yaSede = slot.origen === 'SEDE';
      if (yaSede && !esSede) continue;
      slot.precio = row.precio != null ? Number(row.precio) : null;
      slot.origen = esSede ? 'SEDE' : 'GLOBAL';
    }
    const out = perfiles.map((p) => {
      const entry = indexPerfil.get(p.perfil_id);
      return {
        perfil_id: p.perfil_id,
        nombre: p.nombre,
        tipo: p.tipo,
        descripcion: p.descripcion,
        visibilidad: p.visibilidad,
        total_examenes: Number(p.total_examenes ?? 0),
        precios: entry?.tipos ?? [],
      };
    });
    res.json({ perfiles: out });
  } catch (error) {
    console.error('Error al listar perfiles con precio:', error);
    res.status(500).json({ error: 'Error al listar perfiles con precio' });
  }
};

/**
 * Set/upsert del precio base de un examen para una sede (manager).
 * Body: { sede_id?: number, precio: number }
 *   - sede_id null/omitido → precio base global (sede_id IS NULL).
 *   - precio = 0           → marca el examen como "sin asignar".
 */
exports.setPrecioExamen = async (req, res) => {
  try {
    const examenId = parseInt(String(req.params.examen_id), 10);
    if (!Number.isInteger(examenId) || examenId <= 0) {
      return res.status(400).json({ error: 'examen_id inválido' });
    }
    let { sede_id, precio } = req.body || {};
    if (precio == null || isNaN(Number(precio)) || Number(precio) < 0) {
      return res.status(400).json({ error: 'precio inválido' });
    }
    const precioNum = Number(precio);
    const sedeIdNum = sede_id == null || sede_id === '' ? null : parseInt(String(sede_id), 10);
    if (sedeIdNum != null && (!Number.isInteger(sedeIdNum) || sedeIdNum <= 0)) {
      return res.status(400).json({ error: 'sede_id inválido' });
    }

    // Verificar examen existente
    const [exRows] = await pool.execute('SELECT id FROM examenes WHERE id = ?', [examenId]);
    if (exRows.length === 0) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    // Buscar fila existente para (examen, sede) — sede_id = NULL se busca con IS NULL.
    let existRows;
    if (sedeIdNum == null) {
      [existRows] = await pool.execute(
        'SELECT id FROM examen_precio WHERE examen_id = ? AND sede_id IS NULL LIMIT 1',
        [examenId]
      );
    } else {
      [existRows] = await pool.execute(
        'SELECT id FROM examen_precio WHERE examen_id = ? AND sede_id = ? LIMIT 1',
        [examenId, sedeIdNum]
      );
    }
    if (existRows.length > 0) {
      await pool.execute(
        'UPDATE examen_precio SET precio = ?, vigente_desde = COALESCE(vigente_desde, CURDATE()) WHERE id = ?',
        [precioNum, existRows[0].id]
      );
    } else {
      await pool.execute(
        'INSERT INTO examen_precio (examen_id, sede_id, precio, vigente_desde) VALUES (?, ?, ?, CURDATE())',
        [examenId, sedeIdNum, precioNum]
      );
    }
    res.json({ message: 'Precio actualizado', examen_id: examenId, sede_id: sedeIdNum, precio: precioNum });
  } catch (error) {
    console.error('Error al actualizar precio de examen:', error);
    res.status(500).json({ error: 'Error al actualizar precio del examen' });
  }
};

/**
 * Set/upsert del precio de un perfil EMO por tipo (manager).
 * Body: { sede_id?: number, tipo_emo: 'PREOC'|'ANUAL'|'RETIRO'|'VISITA', precio: number }
 *   - sede_id null/omitido → precio global (catálogo).
 *   - precio = 0           → la UI lo mostrará como "Sin asignar".
 */
exports.setPrecioPerfil = async (req, res) => {
  try {
    const perfilId = parseInt(String(req.params.perfil_id), 10);
    if (!Number.isInteger(perfilId) || perfilId <= 0) {
      return res.status(400).json({ error: 'perfil_id inválido' });
    }
    let { sede_id, tipo_emo, precio } = req.body || {};
    const TIPOS_VALIDOS = new Set(['PREOC', 'ANUAL', 'RETIRO', 'VISITA']);
    if (!TIPOS_VALIDOS.has(String(tipo_emo))) {
      return res.status(400).json({ error: 'tipo_emo inválido' });
    }
    if (precio == null || isNaN(Number(precio)) || Number(precio) < 0) {
      return res.status(400).json({ error: 'precio inválido' });
    }
    const precioNum = Number(precio);
    const sedeIdNum = sede_id == null || sede_id === '' ? null : parseInt(String(sede_id), 10);
    if (sedeIdNum != null && (!Number.isInteger(sedeIdNum) || sedeIdNum <= 0)) {
      return res.status(400).json({ error: 'sede_id inválido' });
    }

    const [perfilRows] = await pool.execute('SELECT id FROM emo_perfiles WHERE id = ?', [perfilId]);
    if (perfilRows.length === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    // Para uniqueness, MySQL trata múltiples NULLs como distintos. Buscamos
    // la fila explícita (perfil, NULL empresa, sede or NULL, tipo_emo).
    let existRows;
    if (sedeIdNum == null) {
      [existRows] = await pool.execute(
        'SELECT id FROM emo_perfil_precio WHERE perfil_id = ? AND empresa_id IS NULL AND sede_id IS NULL AND tipo_emo = ? LIMIT 1',
        [perfilId, tipo_emo]
      );
    } else {
      [existRows] = await pool.execute(
        'SELECT id FROM emo_perfil_precio WHERE perfil_id = ? AND empresa_id IS NULL AND sede_id = ? AND tipo_emo = ? LIMIT 1',
        [perfilId, sedeIdNum, tipo_emo]
      );
    }
    if (existRows.length > 0) {
      await pool.execute('UPDATE emo_perfil_precio SET precio = ? WHERE id = ?', [precioNum, existRows[0].id]);
    } else {
      await pool.execute(
        'INSERT INTO emo_perfil_precio (perfil_id, empresa_id, sede_id, tipo_emo, precio) VALUES (?, NULL, ?, ?, ?)',
        [perfilId, sedeIdNum, tipo_emo, precioNum]
      );
    }
    res.json({
      message: 'Precio de perfil actualizado',
      perfil_id: perfilId,
      sede_id: sedeIdNum,
      tipo_emo,
      precio: precioNum,
    });
  } catch (error) {
    console.error('Error al actualizar precio de perfil:', error);
    res.status(500).json({ error: 'Error al actualizar precio del perfil' });
  }
};

// Listar precios por sede (examen_precio)
exports.listarPreciosSede = async (req, res) => {
  try {
    const { sede_id } = req.params;

    const [precios] = await pool.query(
      `SELECT ep.*, e.nombre AS nombre_examen, e.categoria
       FROM examen_precio ep
       JOIN examenes e ON ep.examen_id = e.id
       WHERE (ep.sede_id = ? OR ep.sede_id IS NULL) AND e.activo = 1
       ORDER BY e.categoria, e.nombre`,
      [sede_id]
    );

    res.json({ precios });
  } catch (error) {
    console.error('Error al listar precios:', error);
    res.status(500).json({ error: 'Error al listar precios' });
  }
};

// Stubs para rutas que ya no aplican (no hay precios_empresa)
exports.listarPendientes = async (req, res) => {
  res.json({ solicitudes: [] });
};

exports.listarPreciosEmpresa = async (req, res) => {
  res.json({ precios: [] });
};

exports.solicitarPrecio = async (req, res) => {
  res.status(501).json({ error: 'Precios personalizados por empresa no implementados en este esquema' });
};

exports.aprobarPrecio = async (req, res) => {
  res.status(501).json({ error: 'Precios personalizados por empresa no implementados en este esquema' });
};
