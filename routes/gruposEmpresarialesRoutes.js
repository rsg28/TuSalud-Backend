const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  listarGrupos,
  obtenerGrupo,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  setEmpresasDeGrupo,
  setGruposDeEmpresa,
} = require('../controllers/gruposEmpresarialesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const grupoValidation = [
  body('nombre').notEmpty().withMessage('El nombre del grupo es requerido'),
];

router.get('/', authenticateToken, listarGrupos);
router.get('/:id', authenticateToken, obtenerGrupo);
router.post('/', authenticateToken, requireRole('manager', 'vendedor'), grupoValidation, crearGrupo);
router.put('/:id', authenticateToken, requireRole('manager', 'vendedor'), grupoValidation, actualizarGrupo);
router.delete('/:id', authenticateToken, requireRole('manager'), eliminarGrupo);

// Empresas dentro de un grupo
router.put('/:id/empresas', authenticateToken, requireRole('manager', 'vendedor'), setEmpresasDeGrupo);

// Grupos de una empresa (espejo, conveniente desde el form de la empresa)
router.put('/empresas/:empresaId/grupos', authenticateToken, requireRole('manager', 'vendedor'), setGruposDeEmpresa);

module.exports = router;
