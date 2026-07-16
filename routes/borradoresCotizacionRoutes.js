/**
 * TuSalud — Rutas para BORRADORES DE COTIZACIÓN.
 *
 * Un borrador es un archivo (PDF/Excel) que un vendedor sube con la intención
 * de convertirlo en cotización de un pedido más adelante. Se guarda en S3
 * bajo la carpeta personal del usuario en `borradores-cotizacion/`.
 *
 * Solo `manager` y `vendedor` pueden crear/adjuntar. Los `cliente` no tienen
 * acceso a este flujo.
 *
 * Flujo:
 *   POST /upload/init         → { upload_id }
 *   POST /upload/chunk × N    → sube el archivo original en lotes
 *   POST /upload/complete     → { brd_id, ... } (opcionalmente incluye parseo)
 *   PATCH /:brd_id/parseo     → sobreescribir el JSON de parseo (re-resolver)
 *   GET   /                   → listar todos los borradores del usuario
 *   GET   /:brd_id            → detalle del parseo
 *   POST  /:brd_id/descargar  → URL firmada del archivo original
 *   DELETE /:brd_id           → borra original + parseo
 *   POST  /:brd_id/adjuntar   → crea la cotización real en el pedido indicado
 */

const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/borradoresCotizacionController');

const router = express.Router();

const soloRolesConCarpeta = requireRole('manager', 'vendedor');

router.post(
  '/resolver-nombres',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.resolverNombres
);

router.get(
  '/buscar-examenes',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.buscarExamenesCatalogo
);
router.get(
  '/buscar-perfiles',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.buscarPerfilesCatalogo
);

router.post('/upload/init', authenticateToken, soloRolesConCarpeta, ctrl.iniciarSubida);
router.post('/upload/chunk', authenticateToken, soloRolesConCarpeta, ctrl.recibirChunk);
router.post('/upload/complete', authenticateToken, soloRolesConCarpeta, ctrl.completarSubida);
/** Plantilla armada a mano (sin archivo): misma carpeta de propuestas. */
router.post('/manual', authenticateToken, soloRolesConCarpeta, ctrl.crearBorradorManual);

router.get('/', authenticateToken, soloRolesConCarpeta, ctrl.listarBorradores);
router.get('/:brd_id', authenticateToken, soloRolesConCarpeta, ctrl.obtenerBorrador);
router.patch(
  '/:brd_id/parseo',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.actualizarParseo
);
router.patch(
  '/:brd_id/empresa',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.actualizarEmpresa
);
router.post(
  '/:brd_id/descargar',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.generarUrlDescarga
);
router.delete('/:brd_id', authenticateToken, soloRolesConCarpeta, ctrl.eliminarBorrador);
router.post(
  '/:brd_id/adjuntar',
  authenticateToken,
  soloRolesConCarpeta,
  ctrl.adjuntarAPedido
);

module.exports = router;
