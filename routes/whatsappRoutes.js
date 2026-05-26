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
  obtenerEstadoAprobacion,
} = require('../controllers/whatsappController');
const { getProvider } = require('../services/whatsapp');

/**
 * GET /api/whatsapp/webhook
 * Handshake de verificación que Meta envía UNA VEZ al guardar la URL del
 * webhook en Business Manager. Twilio no usa GET aquí. Si el proveedor
 * activo expone `handleVerification`, lo llamamos; en otro caso 404.
 */
router.get('/webhook', (req, res) => {
  const provider = getProvider();
  if (typeof provider.handleVerification === 'function') {
    return provider.handleVerification(req, res);
  }
  return res.status(404).send('Not found');
});

router.post('/webhook', webhookEntrante);
router.post('/status-callback', statusCallbackEntrante);
router.get('/archivo/:token', descargarArchivoPorToken);

router.post(
  '/reenviar/:cotizacionId',
  authenticateToken,
  requireRole('manager', 'vendedor'),
  reenviarSolicitud
);

/**
 * GET /api/whatsapp/aprobaciones/cotizacion/:cotizacionId
 * Devuelve el estado del envío WhatsApp/SMS asociado a una cotización
 * (canal, último status del provider, fechas, motivo de rechazo).
 * Lo consume el frontend para pintar la tarjeta de estado.
 */
router.get(
  '/aprobaciones/cotizacion/:cotizacionId',
  authenticateToken,
  obtenerEstadoAprobacion
);

module.exports = router;
