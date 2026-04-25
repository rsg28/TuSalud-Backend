-- =============================================================================
-- TuSalud — Reset de datos transaccionales
-- =============================================================================
-- Limpia TODAS las operaciones en curso (pedidos, cotizaciones, facturas,
-- pacientes, solicitudes, historial) sin tocar el catálogo EMO ni las empresas.
--
-- DESTRUCTIVO. Úsalo para resetear el entorno de pruebas sin perder el catálogo
-- de perfiles/exámenes ya importado.
--
-- CONSERVA:
--   - usuarios, password_reset_codes
--   - empresas, sedes
--   - emo_categorias, examenes, examen_precio
--   - emo_perfiles, emo_perfil_asignacion, emo_perfil_examenes, emo_perfil_precio
--   - emo_tipos_evaluacion
--
-- BORRA:
--   - pedidos, cotizaciones, facturas, pacientes y todas sus tablas dependientes
--
-- Uso:
--   mysql -u <user> -p <database> < scripts/reset_datos.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `historial_pedido`;

TRUNCATE TABLE `solicitud_agregar_examenes`;
TRUNCATE TABLE `solicitud_agregar_paciente`;
TRUNCATE TABLE `solicitudes_agregar`;

TRUNCATE TABLE `paciente_examen_completado`;
TRUNCATE TABLE `paciente_examen_asignado`;
TRUNCATE TABLE `pedido_pacientes`;
TRUNCATE TABLE `pedido_items`;

TRUNCATE TABLE `factura_detalle`;
TRUNCATE TABLE `factura_cotizacion`;
TRUNCATE TABLE `facturas`;
TRUNCATE TABLE `cotizacion_items`;
TRUNCATE TABLE `cotizaciones`;

TRUNCATE TABLE `pedidos`;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'pedidos'                     AS tabla, COUNT(*) AS filas FROM `pedidos`
UNION ALL SELECT 'cotizaciones',                COUNT(*) FROM `cotizaciones`
UNION ALL SELECT 'cotizacion_items',            COUNT(*) FROM `cotizacion_items`
UNION ALL SELECT 'pedido_items',                COUNT(*) FROM `pedido_items`
UNION ALL SELECT 'pedido_pacientes',            COUNT(*) FROM `pedido_pacientes`
UNION ALL SELECT 'paciente_examen_asignado',    COUNT(*) FROM `paciente_examen_asignado`
UNION ALL SELECT 'paciente_examen_completado',  COUNT(*) FROM `paciente_examen_completado`
UNION ALL SELECT 'facturas',                    COUNT(*) FROM `facturas`
UNION ALL SELECT 'factura_cotizacion',          COUNT(*) FROM `factura_cotizacion`
UNION ALL SELECT 'factura_detalle',             COUNT(*) FROM `factura_detalle`
UNION ALL SELECT 'solicitudes_agregar',         COUNT(*) FROM `solicitudes_agregar`
UNION ALL SELECT 'solicitud_agregar_paciente',  COUNT(*) FROM `solicitud_agregar_paciente`
UNION ALL SELECT 'solicitud_agregar_examenes',  COUNT(*) FROM `solicitud_agregar_examenes`
UNION ALL SELECT 'historial_pedido',            COUNT(*) FROM `historial_pedido`;
