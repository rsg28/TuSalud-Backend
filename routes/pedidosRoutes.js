const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, pedidosController.listarPedidos);
router.get('/pendientes-aprobacion', authenticateToken, requireRole('manager'), pedidosController.obtenerArticulosPendientes);
router.post('/', authenticateToken, requireRole('vendedor', 'manager', 'cliente'), pedidosController.crearPedido);

router.get('/:pedido_id', authenticateToken, pedidosController.obtenerPedido);
router.get('/:pedido_id/historial', authenticateToken, pedidosController.obtenerHistorial);

router.post('/:pedido_id/examenes', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.agregarExamen);
router.post('/:pedido_id/listo-cotizacion', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.marcarListoParaCotizacion);
router.post('/:pedido_id/empleados', authenticateToken, requireRole('vendedor', 'manager', 'cliente'), pedidosController.cargarEmpleados);
router.post('/:pedido_id/completado', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.marcarCompletado);

module.exports = router;
