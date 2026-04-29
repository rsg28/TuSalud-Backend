const express = require('express');
const router = express.Router();
const preciosController = require('../controllers/preciosEmpresaController');
const { verificarToken, verificarRol } = require('../middleware/auth');

// =====================================================
// RUTAS DE PRECIOS POR EMPRESA
// =====================================================

// Obtener matriz de artículos (exámenes con precios por sede)
router.get('/matriz', verificarToken, preciosController.obtenerMatrizArticulos);

// Listar categorías con exámenes con precio en la sede (query: sede_id)
router.get('/categorias/:categoria/examenes', verificarToken, preciosController.listarExamenesPorCategoria);
router.get('/categorias', verificarToken, preciosController.listarCategorias);

// Listar perfiles EMO con sus precios para una sede (query: sede_id)
router.get('/perfiles', verificarToken, preciosController.listarPerfilesConPrecio);

// Buscar exámenes por texto (query: q, sede_id)
router.get('/buscar', verificarToken, preciosController.buscarExamenes);

// Listar precios por sede
router.get('/sede/:sede_id', verificarToken, preciosController.listarPreciosSede);

// Actualizar precios (solo manager)
router.put(
  '/examen/:examen_id',
  verificarToken,
  verificarRol(['manager']),
  preciosController.setPrecioExamen
);
router.put(
  '/perfil/:perfil_id',
  verificarToken,
  verificarRol(['manager']),
  preciosController.setPrecioPerfil
);

// Aprobar/rechazar precio (manager)
router.post('/:solicitud_id/aprobar', verificarToken, verificarRol(['manager']), preciosController.aprobarPrecio);

module.exports = router;
