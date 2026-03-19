const express = require('express');
const emoController = require('../controllers/emoPerfilesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// CRUD Perfiles (solo manager)
router.post('/', authenticateToken, requireRole('manager'), emoController.crearPerfil);
// Listado de perfiles (visible para cualquier usuario autenticado)
// query opcional: include_examenes=1 para incluir mapeos por tipo EMO
router.get('/', authenticateToken, emoController.listarPerfiles);

// Guardar set de exámenes por tipo EMO (solo manager)
router.post('/:perfilId/examenes', authenticateToken, requireRole('manager'), emoController.guardarExamenesPorTipo);
router.get('/:perfilId/examenes', authenticateToken, requireRole('manager'), emoController.obtenerExamenesPorTipo);

// Actualizar / eliminar perfil (solo manager)
router.patch('/:perfilId', authenticateToken, requireRole('manager'), emoController.actualizarPerfil);
router.delete('/:perfilId', authenticateToken, requireRole('manager'), emoController.eliminarPerfil);

// Resolve set base por (perfilNombre + emoTipo) para una sede (cualquier rol autenticado)
router.get('/resolve', authenticateToken, emoController.resolve);

module.exports = router;

