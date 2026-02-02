const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllCotizaciones,
  getCotizacionById,
  createCotizacion,
  updateCotizacion,
  deleteCotizacion
} = require('../controllers/cotizacionesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validaciones para crear/actualizar cotización
const cotizacionValidation = [
  body('fecha_cotizacion').notEmpty().withMessage('La fecha de cotización es requerida'),
  body('sede_id').notEmpty().withMessage('La sede es requerida'),
  body('empresa_id').custom((value, { req }) => {
    if (!value && !req.body.paciente_id) {
      throw new Error('Debe especificar una empresa o un paciente');
    }
    return true;
  })
];

router.get('/', authenticateToken, requireRole('manager', 'vendedor'), getAllCotizaciones);
router.get('/:id', authenticateToken, requireRole('manager', 'vendedor'), getCotizacionById);
router.post('/', authenticateToken, requireRole('manager', 'vendedor'), cotizacionValidation, createCotizacion);
router.put('/:id', authenticateToken, requireRole('manager', 'vendedor'), cotizacionValidation, updateCotizacion);
router.delete('/:id', authenticateToken, requireRole('manager', 'vendedor'), deleteCotizacion);

module.exports = router;
