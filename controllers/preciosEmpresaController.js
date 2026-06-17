const pool = require('../config/database');
const {
  sqlPrecioExamenExpr,
  sqlPrecioHasta15Expr,
  sqlPrecioDesde16Expr,
  parseNumPacientesQuery,
} = require('../utils/examenPrecio');

// =====================================================
// PRECIOS - Nuevo esquema: examenes + examen_precio (por sede)
// No existe tabla precios_empresa; precios son por examen y sede.
// La categoría legible vive en `emo_categorias` (examenes.categoria_id).
// =====================================================

const SQL_CATEGORIA_EXAMEN = `COALESCE(NULLIF(TRIM(ec.nombre), ''), 'Otros')`;

// Obtener matriz de artículos (exámenes con precios por sede)
exports.obtenerMatrizArticulos = async (req, res) => {
  try {
    const { empresa_id, sede_id, num_pacientes } = req.query;

    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }
    const numPacientes = parseNumPacientesQuery(num_pacientes);
    const precioExpr = sqlPrecioExamenExpr('ep', 'ep_general', String(numPacientes));

    // Precios: examen_precio con sede_id = X o sede_id IS NULL (precio general)
    const [articulos] = await pool.query(
      `SELECT 
        e.id AS examen_id,
        e.nombre AS nombre_examen,
        ${SQL_CATEGORIA_EXAMEN} AS examen_principal,
        e.codigo,
        ${precioExpr} AS precio_aplicable,
        ${sqlPrecioHasta15Expr('ep', 'ep_general')} AS precio_hasta_15,
        ${sqlPrecioDesde16Expr('ep', 'ep_general')} AS precio_desde_16,
        ${precioExpr} AS precio_lista
      FROM examenes e
      LEFT JOIN emo_categorias ec ON ec.id = e.categoria_id
      LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
      LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
      WHERE e.activo = 1
        AND (ep.id IS NOT NULL OR ep_general.id IS NOT NULL)
      ORDER BY ${SQL_CATEGORIA_EXAMEN}, e.nombre`,
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
//
// Estrategia de búsqueda (ordenada por preferencia, primer modo que devuelva
// resultados gana):
//   1. AND de tokens significativos contra `nombre` normalizado (minúsculas y
//      sin tildes en SQL) — los tokens llegan sin acento desde Node para no
//      perder filas tipo "tórax"/"torax".
//   2. Subcadena igualmente acento-insensible contra `nombre` o `codigo`.
const STOPWORDS_BUSQUEDA = new Set([
  'de','del','la','el','los','las','en','y','o','con','sin','para','por','que',
  'un','una','al','solo','tipo','rm','mas','solo','mas','etc','vs','via',
]);
function tokensBusquedaExamen(term) {
  return String(term || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS_BUSQUEDA.has(t));
}

/** LOWER(...) en SQL + quitar tildes en vocales: los tokens ya vienen ASCII desde Node. */
function sqlNombreComparableSinTilde(alias = 'e.nombre') {
  const lo = `LOWER(${alias})`;
  return `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${lo},
      'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u'),
      'à','a'),'è','e'),'ì','i'),'ò','o'),'ù','u'),
      'â','a'),'ê','e'),'î','i'),'ô','o'),'û','u')`;
}

exports.buscarExamenes = async (req, res) => {
  try {
    const { sede_id, q, num_pacientes } = req.query;
    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }
    const term = (q || '').trim();
    if (!term || term.length < 2) {
      return res.json({ examenes: [] });
    }
    const numPacientes = parseNumPacientesQuery(num_pacientes);
    const precioExpr = sqlPrecioExamenExpr('ep', 'ep_general', String(numPacientes));

    const termComparable = term
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const sedeIdInt = parseInt(sede_id, 10);
    if (!Number.isFinite(sedeIdInt) || sedeIdInt <= 0) {
      return res.status(400).json({ error: 'sede_id inválido' });
    }

    const baseSelect = `SELECT 
        e.id AS examen_id,
        e.nombre AS nombre_examen,
        ${SQL_CATEGORIA_EXAMEN} AS examen_principal,
        ${precioExpr} AS precio,
        ${sqlPrecioHasta15Expr('ep', 'ep_general')} AS precio_hasta_15,
        ${sqlPrecioDesde16Expr('ep', 'ep_general')} AS precio_desde_16
      FROM examenes e
      LEFT JOIN emo_categorias ec ON ec.id = e.categoria_id
      LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ? AND (ep.vigente_hasta IS NULL OR ep.vigente_hasta >= CURDATE())
      LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL AND (ep_general.vigente_hasta IS NULL OR ep_general.vigente_hasta >= CURDATE())
      WHERE e.activo = 1`;

    let examenes = [];

    // Modo 1: AND de tokens contra `nombre` (cuando hay >=2 tokens útiles).
    const tokens = tokensBusquedaExamen(term);
    if (tokens.length >= 2) {
      const col = sqlNombreComparableSinTilde('e.nombre');
      const tokenWhere = tokens.map(() => `INSTR(${col}, ?) > 0`).join(' AND ');
      const params = [sedeIdInt, ...tokens];
      const [rows] = await pool.query(
        `${baseSelect}
          AND (${tokenWhere})
        ORDER BY CHAR_LENGTH(e.nombre), e.nombre
        LIMIT 50`,
        params
      );
      examenes = rows;
    }

    // Modo 2: subcadena directa contra `nombre` o `codigo` (fallback original).
    if (examenes.length === 0) {
      const nomCol = sqlNombreComparableSinTilde('e.nombre');
      const codCol = sqlNombreComparableSinTilde("IFNULL(e.codigo, '')");
      const [rows] = await pool.query(
        `${baseSelect}
          AND (
            INSTR(${nomCol}, ?) > 0
            OR INSTR(${codCol}, ?) > 0
          )
        ORDER BY CHAR_LENGTH(e.nombre), e.nombre
        LIMIT 50`,
        [sedeIdInt, termComparable, termComparable]
      );
      examenes = rows;
    }

    res.json({ examenes });
  } catch (error) {
    console.error('Error al buscar exámenes:', error);
    const raw =
      error && error.sqlMessage
        ? String(error.sqlMessage)
        : error && error.message
          ? String(error.message)
          : '';
    const detail = raw ? raw.slice(0, 280) : '';
    res.status(500).json({
      error: 'Error al buscar exámenes',
      ...(detail ? { detail } : {}),
    });
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
         ${SQL_CATEGORIA_EXAMEN} AS nombre,
         COUNT(*) AS cantidad,
         SUM(CASE WHEN COALESCE(
                  ${sqlPrecioDesde16Expr('ep', 'ep_general')},
                  ${sqlPrecioHasta15Expr('ep', 'ep_general')}
                ) IS NULL
                  OR COALESCE(
                  ${sqlPrecioDesde16Expr('ep', 'ep_general')},
                  ${sqlPrecioHasta15Expr('ep', 'ep_general')},
                  0
                ) = 0
                  THEN 1 ELSE 0 END) AS sin_precio
       FROM examenes e
       LEFT JOIN emo_categorias ec ON ec.id = e.categoria_id
       LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
       LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
       WHERE e.activo = 1
       GROUP BY ${SQL_CATEGORIA_EXAMEN}
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
    const { sede_id, num_pacientes } = req.query;
    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }
    const numPacientes = parseNumPacientesQuery(num_pacientes);
    const precioExpr = sqlPrecioExamenExpr('ep', 'ep_general', String(numPacientes));
    const categoriaDecoded = decodeURIComponent(categoria || '');
    const [examenes] = await pool.query(
      `SELECT
        e.id AS examen_id,
        e.nombre AS nombre_examen,
        ${SQL_CATEGORIA_EXAMEN} AS examen_principal,
        e.codigo,
        ${precioExpr} AS precio,
        ${sqlPrecioHasta15Expr('ep', 'ep_general')} AS precio_hasta_15,
        ${sqlPrecioDesde16Expr('ep', 'ep_general')} AS precio_desde_16,
        ep.id AS precio_sede_id,
        ep_general.id AS precio_general_id
       FROM examenes e
       LEFT JOIN emo_categorias ec ON ec.id = e.categoria_id
       LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
       LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
       WHERE e.activo = 1
         AND (${SQL_CATEGORIA_EXAMEN} = ?)
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
         p.created_at,
         (SELECT COUNT(DISTINCT examen_id) FROM emo_perfil_examenes WHERE perfil_id = p.id) AS total_examenes
       FROM emo_perfiles p
       ORDER BY p.visibilidad DESC, p.nombre`
    );
    if (perfiles.length === 0) {
      return res.json({ perfiles: [] });
    }
    const ids = perfiles.map((p) => p.perfil_id);
    const placeholders = ids.map(() => '?').join(',');

    // Precios (sede explícita gana sobre global)
    const [precios] = await pool.query(
      `SELECT pp.perfil_id, pp.tipo_emo, pp.sede_id, pp.precio
       FROM emo_perfil_precio pp
       WHERE pp.empresa_id IS NULL
         AND (pp.sede_id = ? OR pp.sede_id IS NULL)
         AND pp.perfil_id IN (${placeholders})`,
      [sede_id, ...ids]
    );

    // Empresas asignadas directamente (emo_perfil_asignacion)
    const [empresasAsig] = await pool.query(
      `SELECT pa.perfil_id, e.id AS empresa_id, e.razon_social AS nombre
       FROM emo_perfil_asignacion pa
       JOIN empresas e ON e.id = pa.empresa_id
       WHERE pa.perfil_id IN (${placeholders})
       ORDER BY e.razon_social`,
      [...ids]
    );

    // Grupos asignados (emo_perfil_grupo_asignacion)
    const [gruposAsig] = await pool.query(
      `SELECT pga.perfil_id, g.id AS grupo_id, g.nombre
       FROM emo_perfil_grupo_asignacion pga
       JOIN grupos_empresariales g ON g.id = pga.grupo_id
       WHERE pga.perfil_id IN (${placeholders})
       ORDER BY g.nombre`,
      [...ids]
    );

    const TIPOS = ['PREOC', 'ANUAL', 'RETIRO', 'VISITA'];
    const indexPerfil = new Map();
    for (const p of perfiles) {
      const tipos = TIPOS.map((t) => ({ tipo_emo: t, precio: null, origen: null }));
      indexPerfil.set(p.perfil_id, { perfil: p, tipos, empresas: [], grupos: [] });
    }
    for (const row of precios) {
      const entry = indexPerfil.get(row.perfil_id);
      if (!entry) continue;
      const slot = entry.tipos.find((t) => t.tipo_emo === row.tipo_emo);
      if (!slot) continue;
      const esSede = row.sede_id != null;
      if (slot.origen === 'SEDE' && !esSede) continue;
      slot.precio = row.precio != null ? Number(row.precio) : null;
      slot.origen = esSede ? 'SEDE' : 'GLOBAL';
    }
    for (const row of empresasAsig) {
      const entry = indexPerfil.get(row.perfil_id);
      if (entry) entry.empresas.push({ empresa_id: row.empresa_id, nombre: row.nombre });
    }
    for (const row of gruposAsig) {
      const entry = indexPerfil.get(row.perfil_id);
      if (entry) entry.grupos.push({ grupo_id: row.grupo_id, nombre: row.nombre });
    }

    const h15Expr = sqlPrecioHasta15Expr('ep', 'ep_general');
    const d16Expr = sqlPrecioDesde16Expr('ep', 'ep_general');
    const [examRows] = await pool.query(
      `SELECT mpe.perfil_id, mpe.examen_id,
              ${h15Expr} AS precio_hasta_15,
              ${d16Expr} AS precio_desde_16
       FROM emo_perfil_examenes mpe
       JOIN examenes e ON e.id = mpe.examen_id AND e.activo = 1
       LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
       LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
       WHERE mpe.perfil_id IN (${placeholders})`,
      [sede_id, ...ids]
    );

    const sumasPorPerfil = new Map();
    const examenTienePrecio = (h15, d16) => {
      const a = Number(h15);
      const b = Number(d16);
      return (Number.isFinite(a) && a > 0) || (Number.isFinite(b) && b > 0);
    };
    for (const row of examRows) {
      const pid = row.perfil_id;
      if (!sumasPorPerfil.has(pid)) {
        sumasPorPerfil.set(pid, { sumH15: 0, sumD16: 0, sinPrecio: 0, total: 0 });
      }
      const acc = sumasPorPerfil.get(pid);
      acc.total += 1;
      const h15 = Number(row.precio_hasta_15);
      const d16 = Number(row.precio_desde_16);
      if (!examenTienePrecio(h15, d16)) {
        acc.sinPrecio += 1;
        continue;
      }
      acc.sumH15 += Number.isFinite(h15) && h15 > 0 ? h15 : Number.isFinite(d16) && d16 > 0 ? d16 : 0;
      acc.sumD16 += Number.isFinite(d16) && d16 > 0 ? d16 : Number.isFinite(h15) && h15 > 0 ? h15 : 0;
    }

    const out = perfiles.map((p) => {
      const entry = indexPerfil.get(p.perfil_id);
      const sumas = sumasPorPerfil.get(p.perfil_id);
      const totalExamenes = Number(p.total_examenes ?? 0);
      const completo =
        totalExamenes > 0 && sumas && sumas.total === totalExamenes && sumas.sinPrecio === 0;
      return {
        perfil_id: p.perfil_id,
        nombre: p.nombre,
        tipo: p.tipo,
        descripcion: p.descripcion,
        visibilidad: p.visibilidad ?? 'GLOBAL',
        created_at: p.created_at ?? null,
        total_examenes: totalExamenes,
        precios: entry?.tipos ?? [],
        empresas: entry?.empresas ?? [],
        grupos: entry?.grupos ?? [],
        precio_perfil_completo: completo,
        precio_suma_hasta_15: completo ? Math.round(sumas.sumH15 * 100) / 100 : null,
        precio_suma_desde_16: completo ? Math.round(sumas.sumD16 * 100) / 100 : null,
        examenes_sin_precio: sumas?.sinPrecio ?? 0,
      };
    });
    res.json({ perfiles: out });
  } catch (error) {
    console.error('Error al listar perfiles con precio:', error);
    res.status(500).json({ error: 'Error al listar perfiles con precio' });
  }
};

/**
 * Exámenes del perfil agrupados por tipo EMO (para expandir en catálogo de precios).
 */
exports.obtenerExamenesPerfil = async (req, res) => {
  try {
    const { sede_id } = req.query;
    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }
    const perfilId = parseInt(String(req.params?.perfilId ?? ''), 10);
    if (!Number.isInteger(perfilId) || perfilId <= 0) {
      return res.status(400).json({ error: 'perfilId inválido' });
    }
    const [exists] = await pool.execute('SELECT id FROM emo_perfiles WHERE id = ? LIMIT 1', [perfilId]);
    if (!exists.length) return res.status(404).json({ error: 'Perfil no encontrado' });

    const h15Expr = sqlPrecioHasta15Expr('ep', 'ep_general');
    const d16Expr = sqlPrecioDesde16Expr('ep', 'ep_general');
    const [rows] = await pool.query(
      `SELECT mpe.tipo_emo, e.id AS examen_id, e.nombre AS nombre_examen,
              ${h15Expr} AS precio_hasta_15,
              ${d16Expr} AS precio_desde_16
       FROM emo_perfil_examenes mpe
       JOIN examenes e ON e.id = mpe.examen_id AND e.activo = 1
       LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
       LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
       WHERE mpe.perfil_id = ?
       ORDER BY mpe.tipo_emo ASC, e.nombre ASC`,
      [sede_id, perfilId]
    );
    const TIPOS = ['PREOC', 'ANUAL', 'RETIRO', 'VISITA'];
    const examenes_por_tipo = Object.fromEntries(TIPOS.map((t) => [t, []]));
    for (const row of rows) {
      const tipo = String(row.tipo_emo || '').toUpperCase();
      if (!examenes_por_tipo[tipo]) examenes_por_tipo[tipo] = [];
      examenes_por_tipo[tipo].push({
        examen_id: row.examen_id,
        nombre_examen: row.nombre_examen,
        precio_hasta_15: row.precio_hasta_15 != null ? Number(row.precio_hasta_15) : null,
        precio_desde_16: row.precio_desde_16 != null ? Number(row.precio_desde_16) : null,
      });
    }
    res.json({ perfil_id: perfilId, examenes_por_tipo });
  } catch (error) {
    console.error('Error al obtener exámenes del perfil:', error);
    res.status(500).json({ error: 'Error al obtener exámenes del perfil' });
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
    let { sede_id, precio, precio_hasta_15, precio_desde_16 } = req.body || {};
    if (precio == null || isNaN(Number(precio)) || Number(precio) < 0) {
      return res.status(400).json({ error: 'precio inválido' });
    }
    const precioNum = Number(precio);
    const hasta15Num =
      precio_hasta_15 != null && !isNaN(Number(precio_hasta_15))
        ? Number(precio_hasta_15)
        : precioNum;
    const desde16Num =
      precio_desde_16 != null && !isNaN(Number(precio_desde_16))
        ? Number(precio_desde_16)
        : precioNum;
    const sedeIdNum = sede_id == null || sede_id === '' ? null : parseInt(String(sede_id), 10);
    if (sedeIdNum != null && (!Number.isInteger(sedeIdNum) || sedeIdNum <= 0)) {
      return res.status(400).json({ error: 'sede_id inválido' });
    }

    // Verificar examen existente
    const [exRows] = await pool.execute('SELECT id FROM examenes WHERE id = ?', [examenId]);
    if (exRows.length === 0) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    // Upsert atómico. La migración `migration_concurrencia_fixes.sql` añade un
    // UNIQUE sobre (examen_id, sede_key) — donde sede_key = COALESCE(sede_id, 0)
    // — para que `ON DUPLICATE KEY UPDATE` funcione tanto con sede explícita
    // como con precio general (sede_id IS NULL). Esto evita la condición de
    // carrera SELECT + INSERT/UPDATE que duplicaba filas cuando dos managers
    // editaban el mismo precio a la vez.
    await pool.execute(
      `INSERT INTO examen_precio
         (examen_id, sede_id, precio, precio_hasta_15, precio_desde_16, vigente_desde)
       VALUES (?, ?, ?, ?, ?, CURDATE())
       ON DUPLICATE KEY UPDATE
         precio          = VALUES(precio),
         precio_hasta_15 = VALUES(precio_hasta_15),
         precio_desde_16 = VALUES(precio_desde_16),
         vigente_desde   = COALESCE(vigente_desde, CURDATE())`,
      [examenId, sedeIdNum, desde16Num, hasta15Num, desde16Num]
    );
    res.json({
      message: 'Precio actualizado',
      examen_id: examenId,
      sede_id: sedeIdNum,
      precio: desde16Num,
      precio_hasta_15: hasta15Num,
      precio_desde_16: desde16Num,
    });
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

    // Upsert atómico apoyado en el UNIQUE de migration_concurrencia_fixes.sql
    // (perfil_id, empresa_key, sede_key, tipo_emo) con coalesce de NULLs a 0.
    await pool.execute(
      `INSERT INTO emo_perfil_precio (perfil_id, empresa_id, sede_id, tipo_emo, precio)
       VALUES (?, NULL, ?, ?, ?)
       ON DUPLICATE KEY UPDATE precio = VALUES(precio)`,
      [perfilId, sedeIdNum, tipo_emo, precioNum]
    );
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

/** Resuelve `categoria_id` a partir del nombre mostrado en la UI (incluye «Otros»). */
async function resolverCategoriaIdPorNombre(nombreCategoria) {
  const nom = String(nombreCategoria || '').trim();
  if (!nom || nom.toLowerCase() === 'otros') return null;
  const [rows] = await pool.execute(
    `SELECT ec.id FROM emo_categorias ec
     WHERE COALESCE(NULLIF(TRIM(ec.nombre), ''), 'Otros') = ?
     LIMIT 1`,
    [nom]
  );
  return rows.length ? rows[0].id : null;
}

/**
 * Actualiza nombre (y opcionalmente código) de un examen del catálogo.
 * Body: { nombre: string, codigo?: string | null }
 */
exports.actualizarExamenCatalogo = async (req, res) => {
  try {
    const examenId = parseInt(String(req.params.examen_id), 10);
    if (!Number.isInteger(examenId) || examenId <= 0) {
      return res.status(400).json({ error: 'examen_id inválido' });
    }
    const { nombre, codigo } = req.body || {};
    const nombreTrim = String(nombre ?? '').trim();
    if (!nombreTrim) {
      return res.status(400).json({ error: 'nombre es requerido' });
    }
    if (nombreTrim.length > 255) {
      return res.status(400).json({ error: 'nombre demasiado largo (máx. 255)' });
    }

    const [exRows] = await pool.execute(
      'SELECT id FROM examenes WHERE id = ? AND activo = 1',
      [examenId]
    );
    if (exRows.length === 0) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    const codigoVal =
      codigo === undefined
        ? undefined
        : codigo == null || String(codigo).trim() === ''
          ? null
          : String(codigo).trim().slice(0, 50);

    if (codigoVal === undefined) {
      await pool.execute('UPDATE examenes SET nombre = ? WHERE id = ?', [
        nombreTrim,
        examenId,
      ]);
    } else {
      await pool.execute('UPDATE examenes SET nombre = ?, codigo = ? WHERE id = ?', [
        nombreTrim,
        codigoVal,
        examenId,
      ]);
    }

    res.json({
      message: 'Examen actualizado',
      examen_id: examenId,
      nombre: nombreTrim,
      ...(codigoVal !== undefined ? { codigo: codigoVal } : {}),
    });
  } catch (error) {
    console.error('Error al actualizar examen del catálogo:', error);
    res.status(500).json({ error: 'Error al actualizar el examen' });
  }
};

/**
 * Crea un examen en una categoría del catálogo (manager / vendedor).
 * Body: {
 *   nombre: string,
 *   categoria: string,
 *   codigo?: string,
 *   sede_id?: number,
 *   precio_hasta_15?: number,
 *   precio_desde_16?: number
 * }
 */
exports.crearExamenCatalogo = async (req, res) => {
  try {
    const {
      nombre,
      categoria,
      codigo,
      sede_id,
      precio_hasta_15,
      precio_desde_16,
    } = req.body || {};
    const nombreTrim = String(nombre ?? '').trim();
    if (!nombreTrim) {
      return res.status(400).json({ error: 'nombre es requerido' });
    }
    if (nombreTrim.length > 255) {
      return res.status(400).json({ error: 'nombre demasiado largo (máx. 255)' });
    }
    const categoriaNom = String(categoria ?? '').trim();
    if (!categoriaNom) {
      return res.status(400).json({ error: 'categoria es requerida' });
    }

    const categoriaId = await resolverCategoriaIdPorNombre(categoriaNom);
    if (categoriaId == null && categoriaNom.toLowerCase() !== 'otros') {
      return res.status(400).json({ error: 'Categoría no encontrada' });
    }

    const codigoVal =
      codigo == null || String(codigo).trim() === '' ? null : String(codigo).trim().slice(0, 50);

    const [ins] = await pool.execute(
      'INSERT INTO examenes (nombre, categoria_id, codigo, activo) VALUES (?, ?, ?, 1)',
      [nombreTrim, categoriaId, codigoVal]
    );
    const examenId = ins.insertId;

    const sedeIdNum =
      sede_id == null || sede_id === '' ? null : parseInt(String(sede_id), 10);
    if (sedeIdNum != null && (!Number.isInteger(sedeIdNum) || sedeIdNum <= 0)) {
      return res.status(400).json({ error: 'sede_id inválido' });
    }

    const tienePrecio =
      (precio_hasta_15 != null && !isNaN(Number(precio_hasta_15))) ||
      (precio_desde_16 != null && !isNaN(Number(precio_desde_16)));

    if (tienePrecio && sedeIdNum != null) {
      const hasta15Num =
        precio_hasta_15 != null && !isNaN(Number(precio_hasta_15))
          ? Number(precio_hasta_15)
          : Number(precio_desde_16) || 0;
      const desde16Num =
        precio_desde_16 != null && !isNaN(Number(precio_desde_16))
          ? Number(precio_desde_16)
          : hasta15Num;
      await pool.execute(
        `INSERT INTO examen_precio
           (examen_id, sede_id, precio, precio_hasta_15, precio_desde_16, vigente_desde)
         VALUES (?, ?, ?, ?, ?, CURDATE())
         ON DUPLICATE KEY UPDATE
           precio          = VALUES(precio),
           precio_hasta_15 = VALUES(precio_hasta_15),
           precio_desde_16 = VALUES(precio_desde_16)`,
        [examenId, sedeIdNum, desde16Num, hasta15Num, desde16Num]
      );
    }

    res.status(201).json({
      message: 'Examen creado',
      examen_id: examenId,
      nombre: nombreTrim,
      categoria: categoriaNom,
      codigo: codigoVal,
    });
  } catch (error) {
    console.error('Error al crear examen del catálogo:', error);
    res.status(500).json({ error: 'Error al crear el examen' });
  }
};

// Listar precios por sede (examen_precio)
exports.listarPreciosSede = async (req, res) => {
  try {
    const { sede_id } = req.params;

    const [precios] = await pool.query(
      `SELECT ep.*, e.nombre AS nombre_examen, ${SQL_CATEGORIA_EXAMEN} AS categoria
       FROM examen_precio ep
       JOIN examenes e ON ep.examen_id = e.id
       LEFT JOIN emo_categorias ec ON ec.id = e.categoria_id
       WHERE (ep.sede_id = ? OR ep.sede_id IS NULL) AND e.activo = 1
       ORDER BY ${SQL_CATEGORIA_EXAMEN}, e.nombre`,
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
