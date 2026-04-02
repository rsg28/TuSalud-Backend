const express = require('express');
const reniecController = require('../controllers/reniecController');

const router = express.Router();

// Valida el DNI contra RENIEC (proxy del endpoint externo).
// No requiere auth: se usa internamente en la importación del archivo.
router.get('/validate', reniecController.validarDni);

module.exports = router;

