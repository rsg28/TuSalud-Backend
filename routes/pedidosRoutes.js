const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');

// GET /api/pedidos — Lista todos los pedidos (filtros por query: empresa_id, estado, vendedor_id, user_id, etc.). Solo vendedor y manager.
router.get('/', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.listarPedidos);

// GET /api/pedidos/mios — Lista los pedidos del usuario autenticado (cliente_usuario_id = yo). Para que el cliente vea solo los suyos.
router.get('/mios', authenticateToken, pedidosController.listarMisPedidos);

// GET /api/pedidos/pendientes-aprobacion — Artículos/cotizaciones pendientes de aprobación por manager
router.get('/pendientes-aprobacion', authenticateToken, requireRole('manager'), pedidosController.obtenerArticulosPendientes);

// GET /api/pedidos/con-cotizacion-aprobada — Pedidos con al menos una cotización aprobada por el cliente (para facturación)
router.get('/con-cotizacion-aprobada', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.listarPedidosConCotizacionAprobada);

// GET /api/pedidos/:pedido_id/pacientes-examenes — Lista pacientes del pedido y exámenes asignados/completados
router.get('/:pedido_id/pacientes-examenes', authenticateToken, pedidosController.obtenerPacientesExamenes);

// GET /api/pedidos/:pedido_id/cotizaciones — Lista todas las cotizaciones del pedido
router.get('/:pedido_id/cotizaciones', authenticateToken, pedidosController.obtenerCotizacionesDelPedido);

// GET /api/pedidos/:pedido_id/facturas — Lista todas las facturas del pedido
router.get('/:pedido_id/facturas', authenticateToken, pedidosController.obtenerFacturasDelPedido);

// GET /api/pedidos/:pedido_id/pacientes-completados — Pacientes del pedido que completaron todos sus exámenes
router.get('/:pedido_id/pacientes-completados', authenticateToken, pedidosController.obtenerPacientesCompletados);

/**
 * GET /api/pedidos/:pedido_id/ajustes-sugeridos
 * Lista los exámenes AUSENTE / NO_REALIZADO del pedido con el monto sugerido
 * para una cotización complementaria negativa. Solo manager (es quien decide).
 */
router.get(
  '/:pedido_id/ajustes-sugeridos',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  pedidosController.obtenerAjustesSugeridos
);

/**
 * POST /api/pedidos/:pedido_id/aplicar-ajustes-directos
 *
 * Aplica los ajustes (AUSENTE/NO_REALIZADO) directamente sobre la cotización
 * principal del pedido (reduce cantidades / elimina líneas). Solo es válido
 * cuando la principal NO está aprobada todavía (de lo contrario se debe usar
 * cotización complementaria negativa).
 */
router.post(
  '/:pedido_id/aplicar-ajustes-directos',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  pedidosController.aplicarAjustesDirectos
);

/**
 * GET /api/pedidos/:pedido_id/cobertura-cotizacion
 * Verifica si la cotización principal cubre exactamente los exámenes que
 * los pacientes del pedido tienen asignados (detecta cantidades de más o
 * de menos). Solo vendedor y manager.
 */
router.get(
  '/:pedido_id/cobertura-cotizacion',
  authenticateToken,
  requireRole('vendedor', 'manager'),
  pedidosController.obtenerCoberturaCotizacion
);

// GET /api/pedidos/:pedido_id/estado — Solo el estado del pedido
router.get('/:pedido_id/estado', authenticateToken, pedidosController.obtenerEstadoPedido);

// GET /api/pedidos/:pedido_id — Obtiene el detalle de un pedido
router.get('/:pedido_id', authenticateToken, pedidosController.obtenerPedido);

// GET /api/pedidos/:pedido_id/historial — Obtiene el historial de eventos del pedido
router.get('/:pedido_id/historial', authenticateToken, pedidosController.obtenerHistorial);

// PATCH /api/pedidos/:pedido_id/estado — Actualiza el estado del pedido
router.patch('/:pedido_id/estado', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.actualizarEstadoPedido);

// POST /api/pedidos/:pedido_id/completar — Marca el pedido como COMPLETADO (manager o vendedor)
router.post('/:pedido_id/completar', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.marcarCompletado);

// POST /api/pedidos — Crea un nuevo pedido (vendedor, manager o cliente)
router.post(
  '/',
  authenticateToken,
  requireRole('vendedor', 'manager', 'cliente'),
  idempotency('POST:/api/pedidos'),
  pedidosController.crearPedido
);

// POST /api/pedidos/:pedido_id/asignar-examen-pacientes — Asigna examen suelto a paciente(s) del pedido
router.post(
  '/:pedido_id/asignar-examen-pacientes',
  authenticateToken,
  requireRole('vendedor', 'manager'),
  pedidosController.asignarExamenAPacientes
);

// POST /api/pedidos/:pedido_id/asignar-perfil-pacientes — Asigna perfil EMO a paciente(s) del pedido
router.post(
  '/:pedido_id/asignar-perfil-pacientes',
  authenticateToken,
  requireRole('vendedor', 'manager'),
  pedidosController.asignarPerfilAPacientes
);

// POST /api/pedidos/:pedido_id/examenes — Agrega un examen al pedido (vendedor o manager)
router.post(
  '/:pedido_id/examenes',
  authenticateToken,
  requireRole('vendedor', 'manager'),
  idempotency('POST:/api/pedidos/items'),
  pedidosController.agregarExamen
);

// POST /api/pedidos/:pedido_id/cancelar — Cancela el pedido (solo vendedor o manager).
// Los clientes NO pueden cancelar directamente: deben crear una solicitud de
// cancelación en /api/solicitudes-cancelacion que el vendedor/manager aprueba.
router.post('/:pedido_id/cancelar', authenticateToken, requireRole('vendedor', 'manager'), pedidosController.cancelarPedido);

// DELETE /api/pedidos/:pedido_id — Borrado permanente (solo manager, solo CANCELADO).
router.delete('/:pedido_id', authenticateToken, requireRole('manager'), pedidosController.eliminarPedido);

module.exports = router;
