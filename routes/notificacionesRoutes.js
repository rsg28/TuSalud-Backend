const express = require('express');
const router = express.Router();
const {
  listarMias,
  contadorNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  crear,
  responder,
} = require('../controllers/notificacionesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/mias', authenticateToken, listarMias);
router.get('/no-leidas', authenticateToken, contadorNoLeidas);
router.put('/leer-todas', authenticateToken, marcarTodasLeidas);
router.put('/:id/leida', authenticateToken, marcarLeida);
router.post('/', authenticateToken, requireRole('manager', 'vendedor'), crear);
router.post('/:id/responder', authenticateToken, responder);

module.exports = router;
