const express = require('express');
const router = express.Router();
const preciosController = require('../controllers/preciosEmpresaController');
const { verificarToken, verificarRol } = require('../middleware/auth');

// =====================================================
// RUTAS DE PRECIOS POR EMPRESA
// =====================================================

// Obtener matriz de artículos (exámenes con precios por sede)
router.get('/matriz', verificarToken, preciosController.obtenerMatrizArticulos);

// Listar precios por sede
router.get('/sede/:sede_id', verificarToken, preciosController.listarPreciosSede);

// Listar solicitudes pendientes (stub: vacío en nuevo esquema)
router.get('/pendientes', verificarToken, verificarRol(['manager']), preciosController.listarPendientes);

// Listar precios de una empresa (stub: vacío en nuevo esquema)
router.get('/empresa/:empresa_id', verificarToken, preciosController.listarPreciosEmpresa);

// Solicitar precio personalizado (vendedor)
router.post('/solicitar', verificarToken, verificarRol(['vendedor', 'manager']), preciosController.solicitarPrecio);

// Aprobar/rechazar precio (manager)
router.post('/:solicitud_id/aprobar', verificarToken, verificarRol(['manager']), preciosController.aprobarPrecio);

module.exports = router;
