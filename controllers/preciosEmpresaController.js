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

// Buscar exámenes por texto (nombre o código) con precio para la sede
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
    const like = `%${term}%`;
    const [examenes] = await pool.query(
      `SELECT 
        e.id AS examen_id,
        e.nombre AS nombre_examen,
        e.categoria AS examen_principal,
        COALESCE(ep.precio, ep_general.precio) AS precio
      FROM examenes e
      LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
      LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
      WHERE e.activo = 1
        AND (e.nombre LIKE ? OR e.codigo LIKE ?)
        AND (ep.id IS NOT NULL OR ep_general.id IS NOT NULL)
      ORDER BY e.nombre
      LIMIT 30`,
      [sede_id, like, like]
    );
    res.json({ examenes });
  } catch (error) {
    console.error('Error al buscar exámenes:', error);
    res.status(500).json({ error: 'Error al buscar exámenes' });
  }
};

// Listar categorías que tienen exámenes con precio en la sede (para mostrar como cards)
exports.listarCategorias = async (req, res) => {
  try {
    const { sede_id } = req.query;
    if (!sede_id) {
      return res.status(400).json({ error: 'sede_id es requerido' });
    }
    const [rows] = await pool.query(
      `SELECT COALESCE(e.categoria, 'Otros') AS nombre, COUNT(*) AS cantidad
       FROM examenes e
       LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
       LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
       WHERE e.activo = 1
         AND (ep.id IS NOT NULL OR ep_general.id IS NOT NULL)
       GROUP BY COALESCE(e.categoria, 'Otros')
       ORDER BY nombre`,
      [sede_id]
    );
    res.json({ categorias: rows });
  } catch (error) {
    console.error('Error al listar categorías:', error);
    res.status(500).json({ error: 'Error al listar categorías' });
  }
};

// Listar exámenes de una categoría con precio para la sede
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
        COALESCE(ep.precio, ep_general.precio) AS precio
       FROM examenes e
       LEFT JOIN examen_precio ep ON e.id = ep.examen_id AND ep.sede_id = ?
       LEFT JOIN examen_precio ep_general ON e.id = ep_general.examen_id AND ep_general.sede_id IS NULL
       WHERE e.activo = 1
         AND (COALESCE(e.categoria, 'Otros') = ?)
         AND (ep.id IS NOT NULL OR ep_general.id IS NOT NULL)
       ORDER BY e.nombre`,
      [sede_id, categoriaDecoded]
    );
    res.json({ examenes });
  } catch (error) {
    console.error('Error al listar exámenes por categoría:', error);
    res.status(500).json({ error: 'Error al listar exámenes por categoría' });
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
