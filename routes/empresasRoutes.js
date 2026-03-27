const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllEmpresas,
  getMisEmpresas,
  getEmpresaById,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  quitarEmpresaDeUsuario
} = require('../controllers/empresasController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validaciones para crear/actualizar empresa
const empresaValidation = [
  body('razon_social').notEmpty().withMessage('La razón social es requerida'),
  body('ruc').optional().isLength({ min: 11, max: 11 }).withMessage('El RUC debe tener 11 dígitos')
];

router.get('/', authenticateToken, getAllEmpresas);
router.get('/mias', authenticateToken, getMisEmpresas);
// Lista completa (alias explícito; debe ir antes de /:id para no capturar "todas" como id)
router.get('/todas', authenticateToken, getAllEmpresas);
// Quitar empresa de "mis empresas" del usuario (ruta explícita para evitar conflicto con /:id)
router.delete('/mias/:empresaId', authenticateToken, quitarEmpresaDeUsuario);
router.get('/:id', authenticateToken, getEmpresaById);
router.post('/', authenticateToken, requireRole('manager', 'vendedor', 'cliente'), empresaValidation, createEmpresa);
router.put('/:id', authenticateToken, requireRole('manager', 'vendedor'), empresaValidation, updateEmpresa);
router.delete('/:id', authenticateToken, requireRole('manager'), deleteEmpresa);

module.exports = router;
