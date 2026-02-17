const express = require('express');
const router = express.Router();
const sedesController = require('../controllers/sedesController');
const { verificarToken } = require('../middleware/auth');

router.get('/', verificarToken, sedesController.listarSedes);

module.exports = router;
