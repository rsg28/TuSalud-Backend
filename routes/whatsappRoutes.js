'use strict';

/**
 * Rutas de la integración WhatsApp.
 *
 * - POST /api/whatsapp/webhook            ←  llamada pública desde el proveedor
 *                                            (Twilio, Meta, …). Sin JWT; la
 *                                            verificación de origen la hace el
 *                                            controller (HMAC del proveedor).
 *
 * - GET  /api/whatsapp/archivo/:token     ←  pública. La protege el token
 *                                            aleatorio firmado por el backend.
 *                                            Sirve el XLSX para que el proveedor
 *                                            lo adjunte al mensaje saliente.
 *
 * - POST /api/whatsapp/reenviar/:cotId    ←  manager/vendedor. Reenvía al
 *                                            destinatario; útil si la primera
 *                                            entrega no llegó o se canceló.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  webhookEntrante,
  statusCallbackEntrante,
  descargarArchivoPorToken,
  reenviarSolicitud,
} = require('../controllers/whatsappController');

router.post('/webhook', webhookEntrante);
router.post('/status-callback', statusCallbackEntrante);
router.get('/archivo/:token', descargarArchivoPorToken);

router.post(
  '/reenviar/:cotizacionId',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  reenviarSolicitud
);

module.exports = router;
