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

// Validaciones para crear/actualizar factura
const facturaValidation = [
  body('fecha_emision').notEmpty().withMessage('La fecha de emisión es requerida'),
  body('sede_id').notEmpty().withMessage('La sede es requerida'),
  body('empresa_id').custom((value, { req }) => {
    if (!value && !req.body.paciente_id) {
      throw new Error('Debe especificar una empresa o un paciente');
    }
    return true;
  })
];

router.get('/', authenticateToken, requireRole('manager', 'vendedor'), getAllFacturas);
router.get('/:id', authenticateToken, requireRole('manager', 'vendedor'), getFacturaById);
router.post('/', authenticateToken, requireRole('manager', 'vendedor'), facturaValidation, createFactura);
router.put('/:id', authenticateToken, requireRole('manager', 'vendedor'), facturaValidation, updateFactura);
router.delete('/:id', authenticateToken, requireRole('manager', 'vendedor'), deleteFactura);

module.exports = router;
