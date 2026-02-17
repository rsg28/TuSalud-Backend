const pool = require('../config/database');

exports.listarSedes = async (req, res) => {
  try {
    const [sedes] = await pool.query(
      'SELECT id, nombre, activa FROM sedes WHERE activa = TRUE ORDER BY nombre'
    );
    res.json({ sedes });
  } catch (error) {
    console.error('Error al listar sedes:', error);
    res.status(500).json({ error: 'Error al listar sedes' });
  }
};
