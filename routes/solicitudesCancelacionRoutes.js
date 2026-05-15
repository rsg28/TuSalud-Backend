const express = require('express');
const router = express.Router();
const controller = require('../controllers/solicitudesCancelacionController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/solicitudes-cancelacion?pedido_id=&estado=
router.get('/', authenticateToken, controller.listar);

// POST /api/solicitudes-cancelacion — cliente crea la solicitud
router.post('/', authenticateToken, requireRole('cliente'), controller.crear);

// PATCH /api/solicitudes-cancelacion/:id — vendedor/manager aprueba o rechaza
router.patch('/:id', authenticateToken, requireRole('vendedor', 'manager'), controller.actualizarEstado);

module.exports = router;
