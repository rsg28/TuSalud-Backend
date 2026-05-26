const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllPacientes,
  getPacienteById,
  createPaciente,
  updatePaciente,
  deletePaciente,
  marcarExamenCompletado,
  actualizarEstadoMasivoPaciente,
  obtenerHistorialExamenesPaciente,
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

/**
 * Tracking clínico de exámenes (solo manager/vendedor).
 *
 * - `PUT /:id/examen`: actualiza el estado de un examen del paciente.
 *   Acepta tanto el modelo nuevo (`estado`) como el legacy (`completado`).
 * - `POST /:id/estado-masivo`: aplica un mismo estado (típicamente AUSENTE)
 *   a todos los exámenes pendientes del paciente.
 * - `GET /:id/historial-examenes`: timeline auditado de transiciones.
 */
router.put(
  '/:id/examen',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  [
    body('examen_id').isInt(),
    body('estado').optional().isString(),
    body('motivo').optional().isString(),
    body('completado').optional().isBoolean(),
  ],
  marcarExamenCompletado
);
router.post(
  '/:id/estado-masivo',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  [
    body('estado').isString(),
    body('motivo').optional().isString(),
    body('sobrescribir_completados').optional().isBoolean(),
  ],
  actualizarEstadoMasivoPaciente
);
router.get(
  '/:id/historial-examenes',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  obtenerHistorialExamenesPaciente
);

router.delete('/:id', authenticateToken, requireRole('manager', 'vendedor'), deletePaciente);

module.exports = router;
