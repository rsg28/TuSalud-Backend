'use strict';

/**
 * Rutas para sistemas externos (laboratorios, ERPs, etc.).
 *
 * NO usan JWT: la autenticación es por API key estática gestionada en
 * `integraciones_api_keys`. Por eso este router se monta en `/api/integraciones`
 * y NO comparte middleware con el resto de la API.
 */

const express = require('express');
const router = express.Router();

const { recibirEventoExamen } = require('../controllers/integracionesController');

router.post('/examen-evento', recibirEventoExamen);

module.exports = router;
