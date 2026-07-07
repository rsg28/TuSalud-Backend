/**
 * TuSalud — Rutas para "Mis archivos de cotizaciones".
 *
 * Todas requieren usuario autenticado. Cada usuario opera exclusivamente
 * sobre su carpeta `${rol}/${email}/cotizaciones/` en S3 (el controlador
 * construye la key a partir de `req.user`, no de parámetros del cliente).
 */

const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/misArchivosCotizacionesController');

const router = express.Router();

const soloRolesConCarpeta = requireRole('manager', 'vendedor', 'cliente');

router.get('/', authenticateToken, soloRolesConCarpeta, ctrl.listarMisArchivos);
router.post('/', authenticateToken, soloRolesConCarpeta, ctrl.subirMiArchivo);
router.post('/descargar', authenticateToken, soloRolesConCarpeta, ctrl.generarUrlDescarga);
router.delete('/', authenticateToken, soloRolesConCarpeta, ctrl.eliminarMiArchivo);

module.exports = router;
