const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllFacturas,
  getFacturaById,
  createFactura,
  updateFactura,
  deleteFactura
} = require('../controllers/facturasController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const createFacturaValidation = [
  body('pedido_id').isInt().withMessage('pedido_id es requerido')
];

router.get('/', authenticateToken, getAllFacturas);
router.get('/:id', authenticateToken, getFacturaById);
router.post('/', authenticateToken, requireRole('manager', 'vendedor'), createFacturaValidation, createFactura);
router.put('/:id', authenticateToken, requireRole('manager', 'vendedor'), updateFactura);
router.delete('/:id', authenticateToken, requireRole('manager', 'vendedor'), deleteFactura);

module.exports = router;
