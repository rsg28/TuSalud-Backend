const express = require('express');
const router = express.Router();
const controller = require('../controllers/solicitudesVerPreciosDetalleController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/solicitudes-ver-precios-detalle?pedido_id=&estado=
router.get('/', authenticateToken, controller.listar);

// POST /api/solicitudes-ver-precios-detalle — cliente crea la solicitud
router.post('/', authenticateToken, requireRole('cliente'), controller.crear);

// PATCH /api/solicitudes-ver-precios-detalle/:id — vendedor/manager aprueba o rechaza
router.patch('/:id', authenticateToken, requireRole('vendedor', 'manager'), controller.actualizarEstado);

module.exports = router;
