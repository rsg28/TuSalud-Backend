const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllFacturas,
  getFacturaById,
  createFactura,
  updateFactura,
  reportarPagoPorCliente,
  enviarFacturaAlCliente,
  deleteFactura
} = require('../controllers/facturasController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');

const createFacturaValidation = [
  body('pedido_id').isInt().withMessage('pedido_id es requerido')
];

router.get('/', authenticateToken, getAllFacturas);
router.get('/:id', authenticateToken, getFacturaById);
router.post(
  '/',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  idempotency('POST:/api/facturas'),
  createFacturaValidation,
  createFactura
);
router.put('/:id', authenticateToken, requireRole('manager', 'vendedor'), updateFactura);
router.post('/:id/reportar-pago-cliente', authenticateToken, requireRole('cliente'), reportarPagoPorCliente);
router.post('/:id/enviar-cliente', authenticateToken, requireRole('manager', 'vendedor'), enviarFacturaAlCliente);
router.delete('/:id', authenticateToken, requireRole('vendedor'), deleteFactura);

module.exports = router;
