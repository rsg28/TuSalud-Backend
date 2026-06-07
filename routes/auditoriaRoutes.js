/**
 * Rutas de auditoría centralizada.
 *
 * Solo manager puede ver auditoría completa y resúmenes (información sensible
 * sobre actividad de otros usuarios). Cualquier rol autenticado puede ver SU
 * propia actividad vía /mio.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/auditoriaController');

router.get('/mio', authenticateToken, ctrl.actividadPropia);
router.get('/resumen', authenticateToken, requireRole('manager'), ctrl.resumen);
router.get('/', authenticateToken, requireRole('manager'), ctrl.listar);

module.exports = router;
