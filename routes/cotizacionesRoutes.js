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

const cotizacionValidation = [
  body('pedido_id').isInt().withMessage('pedido_id es requerido'),
  body('items').isArray({ min: 1 }).withMessage('items debe ser un array con al menos un elemento')
];

router.get('/', authenticateToken, getAllCotizaciones);
router.get('/:id', authenticateToken, getCotizacionById);
router.post('/', authenticateToken, requireRole('manager', 'vendedor', 'cliente'), cotizacionValidation, createCotizacion);
router.put('/:id', authenticateToken, requireRole('manager', 'vendedor', 'cliente'), updateCotizacion);
router.delete('/:id', authenticateToken, requireRole('manager', 'vendedor'), deleteCotizacion);

module.exports = router;
