const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/pedidos — Lista todos los pedidos (filtros por query: empresa_id, estado, vendedor_id, user_id, etc.). Solo vendedor y manager.
router.get('/', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.listarPedidos);

// GET /api/pedidos/mios — Lista los pedidos del usuario autenticado (cliente_usuario_id = yo). Para que el cliente vea solo los suyos.
router.get('/mios', authenticateToken, pedidosController.listarMisPedidos);

// GET /api/pedidos/pendientes-aprobacion — Artículos/cotizaciones pendientes de aprobación por manager
router.get('/pendientes-aprobacion', authenticateToken, requireRole('manager'), pedidosController.obtenerArticulosPendientes);

// GET /api/pedidos/:pedido_id/pacientes-examenes — Lista pacientes del pedido y exámenes asignados/completados
router.get('/:pedido_id/pacientes-examenes', authenticateToken, pedidosController.obtenerPacientesExamenes);

// GET /api/pedidos/:pedido_id/cotizaciones — Lista todas las cotizaciones del pedido
router.get('/:pedido_id/cotizaciones', authenticateToken, pedidosController.obtenerCotizacionesDelPedido);

// GET /api/pedidos/:pedido_id/facturas — Lista todas las facturas del pedido
router.get('/:pedido_id/facturas', authenticateToken, pedidosController.obtenerFacturasDelPedido);

// GET /api/pedidos/:pedido_id/pacientes-completados — Pacientes del pedido que completaron todos sus exámenes
router.get('/:pedido_id/pacientes-completados', authenticateToken, pedidosController.obtenerPacientesCompletados);

// GET /api/pedidos/:pedido_id/estado — Solo el estado del pedido
router.get('/:pedido_id/estado', authenticateToken, pedidosController.obtenerEstadoPedido);

// GET /api/pedidos/:pedido_id — Obtiene el detalle de un pedido
router.get('/:pedido_id', authenticateToken, pedidosController.obtenerPedido);

// GET /api/pedidos/:pedido_id/historial — Obtiene el historial de eventos del pedido
router.get('/:pedido_id/historial', authenticateToken, pedidosController.obtenerHistorial);

// PATCH /api/pedidos/:pedido_id/estado — Actualiza el estado del pedido
router.patch('/:pedido_id/estado', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.actualizarEstadoPedido);

// POST /api/pedidos — Crea un nuevo pedido (vendedor, manager o cliente)
router.post('/', authenticateToken, requireRole('vendedor', 'manager', 'cliente'), pedidosController.crearPedido);

// POST /api/pedidos/:pedido_id/examenes — Agrega un examen al pedido (vendedor o manager)
router.post('/:pedido_id/examenes', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.agregarExamen);

// POST /api/pedidos/:pedido_id/cancelar — Cancela el pedido (vendedor, manager o cliente)
router.post('/:pedido_id/cancelar', authenticateToken, requireRole('vendedor', 'manager', 'cliente'), pedidosController.cancelarPedido);

module.exports = router;
