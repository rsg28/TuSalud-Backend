const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllPacientes,
  getPacienteById,
  createPaciente,
  updatePaciente,
  deletePaciente,
  marcarExamenCompletado
} = require('../controllers/pacientesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const pacienteValidation = [
  body('pedido_id').optional().isInt().withMessage('pedido_id debe ser número'),
  body('dni').optional().isLength({ min: 8, max: 8 }).withMessage('El DNI debe tener 8 dígitos'),
  body('nombre_completo').optional().notEmpty().withMessage('El nombre completo es requerido para crear')
];

router.get('/', authenticateToken, getAllPacientes);
router.get('/:id', authenticateToken, getPacienteById);
router.post('/', authenticateToken, requireRole('manager', 'vendedor', 'cliente'), pacienteValidation, createPaciente);
router.put('/:id', authenticateToken, requireRole('manager', 'vendedor', 'cliente'), updatePaciente);
router.put('/:id/examen', authenticateToken, requireRole('manager', 'vendedor', 'cliente'), [
  body('examen_id').isInt(),
  body('completado').optional().isBoolean()
], marcarExamenCompletado);
router.delete('/:id', authenticateToken, requireRole('manager', 'vendedor'), deletePaciente);

module.exports = router;
