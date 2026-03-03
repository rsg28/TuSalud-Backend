const express = require('express');
const router = express.Router();
const controller = require('../controllers/solicitudesAgregarController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, controller.listarPorPedido);
router.get('/:id', authenticateToken, controller.obtenerDetalle);
router.post('/', authenticateToken, requireRole('cliente'), controller.crear);
router.patch('/:id', authenticateToken, requireRole('vendedor', 'manager'), controller.actualizarEstado);

module.exports = router;
