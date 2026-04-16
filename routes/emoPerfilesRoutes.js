const express = require('express');
const emoController = require('../controllers/emoPerfilesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// CRUD Perfiles (manager o vendedor)
router.post('/', authenticateToken, requireRole('manager', 'vendedor'), emoController.crearPerfil);
// Listado de perfiles (visible para cualquier usuario autenticado)
// query opcional: include_examenes=1 para incluir mapeos por tipo EMO
router.get('/', authenticateToken, emoController.listarPerfiles);

// Guardar set de exámenes por tipo EMO (manager o vendedor)
router.post('/:perfilId/examenes', authenticateToken, requireRole('manager', 'vendedor'), emoController.guardarExamenesPorTipo);
router.get('/:perfilId/examenes', authenticateToken, requireRole('manager', 'vendedor'), emoController.obtenerExamenesPorTipo);

// Actualizar / eliminar perfil (manager o vendedor)
router.patch('/:perfilId', authenticateToken, requireRole('manager', 'vendedor'), emoController.actualizarPerfil);
router.delete('/:perfilId', authenticateToken, requireRole('manager', 'vendedor'), emoController.eliminarPerfil);

// Resolve set base por (perfilNombre + emoTipo) para una sede (cualquier rol autenticado)
router.get('/resolve', authenticateToken, emoController.resolve);

module.exports = router;

