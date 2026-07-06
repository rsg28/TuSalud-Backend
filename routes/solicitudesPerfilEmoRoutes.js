const express = require('express');
const router = express.Router();
const controller = require('../controllers/solicitudesPerfilEmoController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Cliente: crea una solicitud
router.post('/', authenticateToken, requireRole('cliente'), controller.crear);
// Cliente: lista sus solicitudes (todas)
router.get('/mias', authenticateToken, requireRole('cliente'), controller.listarMias);
// Cliente: lista los perfiles privados ya asignados a su empresa
router.get(
  '/mi-empresa/perfiles-privados',
  authenticateToken,
  requireRole('cliente'),
  controller.listarPerfilesPrivadosMiEmpresa
);
// Cliente: cancela una solicitud pendiente propia
router.delete('/:id', authenticateToken, requireRole('cliente'), controller.cancelar);

// Vendedor / manager: lista solicitudes (query estado=PENDIENTE|APROBADA|RECHAZADA|ALL)
router.get(
  '/',
  authenticateToken,
  requireRole('vendedor', 'manager'),
  controller.listarParaStaff
);
// Vendedor / manager: aprueba (crea el perfil PRIVADO)
router.post(
  '/:id/aprobar',
  authenticateToken,
  requireRole('vendedor', 'manager'),
  controller.aprobar
);
// Vendedor / manager: rechaza con motivo
router.post(
  '/:id/rechazar',
  authenticateToken,
  requireRole('vendedor', 'manager'),
  controller.rechazar
);

module.exports = router;
