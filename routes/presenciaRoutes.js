const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/presenciaController');

router.post('/heartbeat', authenticateToken, ctrl.heartbeat);
router.get('/:tipo/:id', authenticateToken, ctrl.listar);
router.delete('/:tipo/:id', authenticateToken, ctrl.liberar);

module.exports = router;
