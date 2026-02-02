const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllPacientes,
  getPacienteById,
  createPaciente,
  updatePaciente,
  deletePaciente
} = require('../controllers/pacientesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validaciones para crear/actualizar paciente
const pacienteValidation = [
  body('dni').optional().isLength({ min: 8, max: 8 }).withMessage('El DNI debe tener 8 dígitos'),
  body('nombre').notEmpty().withMessage('El nombre es requerido')
];

router.get('/', authenticateToken, getAllPacientes);
router.get('/:id', authenticateToken, getPacienteById);
router.post('/', authenticateToken, requireRole('manager', 'vendedor', 'medico'), pacienteValidation, createPaciente);
router.put('/:id', authenticateToken, requireRole('manager', 'vendedor', 'medico'), pacienteValidation, updatePaciente);
router.delete('/:id', authenticateToken, requireRole('manager'), deletePaciente);

module.exports = router;
