const pool = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * Listar todos los grupos. Incluye `empresas_count` para que el front pueda
 * mostrar de un vistazo cuántas empresas tiene cada grupo. Si `?with_empresas=1`
 * agrega también el array `empresas` con id+nombre de cada empresa miembro.
 */
const listarGrupos = async (req, res) => {
  try {
    const { search, with_empresas } = req.query;
    const wantEmpresas = String(with_empresas || '').trim() === '1';

    let where = '1=1';
    const params = [];
    if (search) {
      where += ' AND g.nombre LIKE ?';
      params.push(`%${search}%`);
    }

    const [grupos] = await pool.execute(
      `SELECT g.id, g.nombre, g.descripcion, g.created_at, g.updated_at,
              COALESCE(eg.cnt, 0) AS empresas_count
         FROM grupos_empresariales g
    LEFT JOIN (
                SELECT grupo_id, COUNT(*) AS cnt
                  FROM empresa_grupo
              GROUP BY grupo_id
              ) eg ON eg.grupo_id = g.id
        WHERE ${where}
     ORDER BY g.nombre ASC`,
      params
    );

    if (wantEmpresas && grupos.length > 0) {
      const ids = grupos.map((g) => g.id);
      const placeholders = ids.map(() => '?').join(',');
      const [rows] = await pool.execute(
        `SELECT eg.grupo_id, e.id, e.razon_social, e.ruc
           FROM empresa_grupo eg
           JOIN empresas e ON e.id = eg.empresa_id
          WHERE eg.grupo_id IN (${placeholders})
       ORDER BY e.razon_social ASC`,
        ids
      );
      const byGrupo = new Map();
      rows.forEach((r) => {
        const arr = byGrupo.get(r.grupo_id) || [];
        arr.push({ id: r.id, razon_social: r.razon_social, ruc: r.ruc });
        byGrupo.set(r.grupo_id, arr);
      });
      grupos.forEach((g) => {
        g.empresas = byGrupo.get(g.id) || [];
      });
    }

    res.json({ grupos });
  } catch (error) {
    console.error('Error al listar grupos empresariales:', error);
    res.status(500).json({ error: 'Error al listar grupos empresariales' });
  }
};

const obtenerGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      'SELECT id, nombre, descripcion, created_at, updated_at FROM grupos_empresariales WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    const grupo = rows[0];
    const [empresas] = await pool.execute(
      `SELECT e.id, e.razon_social, e.ruc
         FROM empresa_grupo eg
         JOIN empresas e ON e.id = eg.empresa_id
        WHERE eg.grupo_id = ?
     ORDER BY e.razon_social ASC`,
      [id]
    );
    grupo.empresas = empresas;
    res.json({ grupo });
  } catch (error) {
    console.error('Error al obtener grupo:', error);
    res.status(500).json({ error: 'Error al obtener grupo' });
  }
};

const crearGrupo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { nombre, descripcion, empresa_ids } = req.body;
    const nombreNorm = String(nombre || '').trim();
    if (!nombreNorm) {
      return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [exists] = await conn.execute(
        'SELECT id FROM grupos_empresariales WHERE LOWER(TRIM(nombre)) = LOWER(?)',
        [nombreNorm]
      );
      if (exists.length > 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Ya existe un grupo con ese nombre' });
      }
      const [result] = await conn.execute(
        'INSERT INTO grupos_empresariales (nombre, descripcion) VALUES (?, ?)',
        [nombreNorm, descripcion || null]
      );
      const grupoId = result.insertId;
      if (Array.isArray(empresa_ids) && empresa_ids.length > 0) {
        const values = empresa_ids
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0)
          .map((empresaId) => [empresaId, grupoId]);
        if (values.length > 0) {
          await conn.query(
            'INSERT IGNORE INTO empresa_grupo (empresa_id, grupo_id) VALUES ?',
            [values]
          );
        }
      }
      await conn.commit();
      const [created] = await pool.execute(
        'SELECT id, nombre, descripcion, created_at, updated_at FROM grupos_empresariales WHERE id = ?',
        [grupoId]
      );
      res.status(201).json({ message: 'Grupo creado', grupo: created[0] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error al crear grupo:', error);
    res.status(500).json({ error: 'Error al crear grupo' });
  }
};

const actualizarGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    const nombreNorm = String(nombre || '').trim();
    if (!nombreNorm) {
      return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
    }
    const [exists] = await pool.execute(
      'SELECT id FROM grupos_empresariales WHERE LOWER(TRIM(nombre)) = LOWER(?) AND id <> ?',
      [nombreNorm, id]
    );
    if (exists.length > 0) {
      return res.status(400).json({ error: 'Ya existe otro grupo con ese nombre' });
    }
    await pool.execute(
      'UPDATE grupos_empresariales SET nombre = ?, descripcion = ? WHERE id = ?',
      [nombreNorm, descripcion || null, id]
    );
    const [rows] = await pool.execute(
      'SELECT id, nombre, descripcion, created_at, updated_at FROM grupos_empresariales WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    res.json({ message: 'Grupo actualizado', grupo: rows[0] });
  } catch (error) {
    console.error('Error al actualizar grupo:', error);
    res.status(500).json({ error: 'Error al actualizar grupo' });
  }
};

const eliminarGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute('DELETE FROM grupos_empresariales WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    res.json({ message: 'Grupo eliminado' });
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
    res.status(500).json({ error: 'Error al eliminar grupo' });
  }
};

/**
 * Reemplaza la lista completa de empresas asociadas a un grupo.
 * Body: { empresa_ids: number[] }
 */
const setEmpresasDeGrupo = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const empresas = Array.isArray(req.body.empresa_ids) ? req.body.empresa_ids : [];
    const ids = [
      ...new Set(empresas.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
    ];

    await conn.beginTransaction();
    const [exists] = await conn.execute('SELECT id FROM grupos_empresariales WHERE id = ?', [id]);
    if (exists.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    await conn.execute('DELETE FROM empresa_grupo WHERE grupo_id = ?', [id]);
    if (ids.length > 0) {
      const values = ids.map((empresaId) => [empresaId, id]);
      await conn.query(
        'INSERT IGNORE INTO empresa_grupo (empresa_id, grupo_id) VALUES ?',
        [values]
      );
    }
    await conn.commit();
    res.json({ message: 'Empresas del grupo actualizadas', empresa_ids: ids });
  } catch (error) {
    await conn.rollback();
    console.error('Error al actualizar empresas del grupo:', error);
    res.status(500).json({ error: 'Error al actualizar empresas del grupo' });
  } finally {
    conn.release();
  }
};

/**
 * Reemplaza la lista de grupos a los que pertenece una empresa.
 * Body: { grupo_ids: number[] }
 */
const setGruposDeEmpresa = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { empresaId } = req.params;
    const grupos = Array.isArray(req.body.grupo_ids) ? req.body.grupo_ids : [];
    const ids = [
      ...new Set(grupos.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
    ];

    await conn.beginTransaction();
    const [exists] = await conn.execute('SELECT id FROM empresas WHERE id = ?', [empresaId]);
    if (exists.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    await conn.execute('DELETE FROM empresa_grupo WHERE empresa_id = ?', [empresaId]);
    if (ids.length > 0) {
      const values = ids.map((gid) => [empresaId, gid]);
      await conn.query(
        'INSERT IGNORE INTO empresa_grupo (empresa_id, grupo_id) VALUES ?',
        [values]
      );
    }
    await conn.commit();
    res.json({ message: 'Grupos de la empresa actualizados', grupo_ids: ids });
  } catch (error) {
    await conn.rollback();
    console.error('Error al actualizar grupos de la empresa:', error);
    res.status(500).json({ error: 'Error al actualizar grupos de la empresa' });
  } finally {
    conn.release();
  }
};

module.exports = {
  listarGrupos,
  obtenerGrupo,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  setEmpresasDeGrupo,
  setGruposDeEmpresa,
};
