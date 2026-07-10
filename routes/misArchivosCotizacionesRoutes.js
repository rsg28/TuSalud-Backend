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

/**
 * Subida por chunks para redes con Fortinet u otros firewalls que cortan
 * POSTs grandes. El cliente:
 *   1) POST /upload/init      → { upload_id }
 *   2) POST /upload/chunk × N → sube el archivo en lotes ~200 KB
 *   3) POST /upload/complete  → { ok, nombre, tamano, key }
 * El servidor ensambla en memoria y sube a S3 solo al `complete`.
 */
router.post(
  '/upload/init',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.iniciarSubidaPorChunks
);
router.post(
  '/upload/chunk',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.recibirChunk
);
router.post(
  '/upload/complete',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.completarSubidaPorChunks
);

module.exports = router;
