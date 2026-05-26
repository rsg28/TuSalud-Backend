const express = require('express');
const emoController = require('../controllers/emoPerfilesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// CRUD Perfiles (manager o vendedor)
router.post('/', authenticateToken, requireRole('manager', 'vendedor'), emoController.crearPerfil);
// Listado de perfiles (visible para cualquier usuario autenticado)
// query opcional: include_examenes=1 para incluir mapeos por tipo EMO
router.get('/', authenticateToken, emoController.listarPerfiles);

// Rutas literales antes de /:perfilId para evitar colisiones en Express.
router.get('/resolve', authenticateToken, emoController.resolve);
router.get('/visibles-para-empresa/:empresaId', authenticateToken, emoController.listarVisiblesParaEmpresa);

// Guardar set de exámenes por tipo EMO (manager o vendedor)
router.post('/:perfilId/examenes', authenticateToken, requireRole('manager', 'vendedor'), emoController.guardarExamenesPorTipo);
// Lectura: cualquier usuario autenticado (cliente al importar / armar pedido).
router.get('/:perfilId/examenes', authenticateToken, emoController.obtenerExamenesPorTipo);

// Actualizar / eliminar perfil (manager o vendedor)
router.patch('/:perfilId', authenticateToken, requireRole('manager', 'vendedor'), emoController.actualizarPerfil);
router.delete('/:perfilId', authenticateToken, requireRole('manager', 'vendedor'), emoController.eliminarPerfil);

// Precio resuelto para (perfilId + tipo_emo + opcional empresa_id + sede_id).
router.get('/:perfilId/precio', authenticateToken, emoController.precio);

// Visibilidad y asignaciones del perfil (a empresas y/o grupos).
router.put('/:perfilId/visibilidad', authenticateToken, requireRole('manager', 'vendedor'), emoController.actualizarVisibilidad);

module.exports = router;

