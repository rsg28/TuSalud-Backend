-- =============================================================================
-- TuSalud — Reset TOTAL del catálogo de exámenes + data transaccional
-- =============================================================================
-- "Borrón y cuenta nueva" para poder recargar el catálogo desde
-- `Tarifario Base  S.O. TU SALUD SAC (3).xlsx` (ver scripts/importarTarifarioBase.js).
--
-- PORQUÉ borra TAMBIÉN la data transaccional (pedidos/cotizaciones/facturas):
--   Las tablas `pedido_items`, `cotizacion_items`, `factura_detalle` y
--   `solicitud_agregar_examenes` tienen FK `ON DELETE RESTRICT` a `examenes`
--   y `emo_perfiles`. Si no se vacían primero, cualquier DELETE/TRUNCATE
--   del catálogo falla con "Cannot delete or update a parent row".
--
-- DESTRUCTIVO. Sólo úsalo en entornos donde estés seguro de que quieres
-- borrar TODO (catálogo + operaciones). No hay UNDO.
--
-- BORRA:
--   * Catálogo:
--     - emo_categorias
--     - examenes, examen_precio
--     - emo_perfiles, emo_perfil_asignacion, emo_perfil_examenes,
--       emo_perfil_precio, emo_perfil_grupo_asignacion (si existe)
--   * Data transaccional (dependencias RESTRICT/CASCADE):
--     - pedidos, pedido_items, pedido_pacientes,
--       paciente_examen_asignado, paciente_examen_completado,
--       paciente_examen_historial (si existe)
--     - cotizaciones, cotizacion_items
--     - facturas, factura_detalle, factura_cotizacion
--     - solicitudes_agregar, solicitud_agregar_paciente,
--       solicitud_agregar_examenes
--     - solicitudes_ver_precios_detalle (si existe)
--     - historial_pedido
--
-- CONSERVA:
--   - usuarios, password_reset_codes
--   - empresas, sedes, grupos_empresariales, empresa_grupo
--   - emo_tipos_evaluacion (lookup con valores fijos)
--   - notificaciones y demás tablas no relacionadas al catálogo
--
-- Uso:
--   mysql -u <user> -p <database> < scripts/reset_catalogo_examenes.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1) Data transaccional que apunta a examenes/emo_perfiles con RESTRICT
-- ---------------------------------------------------------------------------

-- Historial y solicitudes primero (dependen de pedidos)
TRUNCATE TABLE `historial_pedido`;

-- solicitudes_ver_precios_detalle (migration_solicitudes_ver_precios_detalle.sql)
-- Puede no existir en entornos que aún no aplicaron la migración.
SET @has_svpd := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_ver_precios_detalle'
);
SET @stmt := IF(@has_svpd = 1,
                'TRUNCATE TABLE `solicitudes_ver_precios_detalle`',
                'SELECT 1');
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

TRUNCATE TABLE `solicitud_agregar_examenes`;
TRUNCATE TABLE `solicitud_agregar_paciente`;
TRUNCATE TABLE `solicitudes_agregar`;

-- Historial de exámenes por paciente (migration_seguimiento_examenes.sql).
-- Puede no existir en algunos entornos.
SET @has_peh := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente_examen_historial'
);
SET @stmt := IF(@has_peh = 1,
                'TRUNCATE TABLE `paciente_examen_historial`',
                'SELECT 1');
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

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

-- ---------------------------------------------------------------------------
-- 2) Catálogo EMO (perfiles + asignaciones + precios de perfil)
-- ---------------------------------------------------------------------------

-- Asignación perfil ↔ grupo empresarial (migration_grupos_y_visibilidad_perfiles.sql).
-- Puede no existir en entornos anteriores a esa migración.
SET @has_pga := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'emo_perfil_grupo_asignacion'
);
SET @stmt := IF(@has_pga = 1,
                'TRUNCATE TABLE `emo_perfil_grupo_asignacion`',
                'SELECT 1');
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

TRUNCATE TABLE `emo_perfil_precio`;
TRUNCATE TABLE `emo_perfil_examenes`;
TRUNCATE TABLE `emo_perfil_asignacion`;
TRUNCATE TABLE `emo_perfiles`;

-- ---------------------------------------------------------------------------
-- 3) Catálogo de exámenes (y precios base) + categorías
-- ---------------------------------------------------------------------------
TRUNCATE TABLE `examen_precio`;
TRUNCATE TABLE `examenes`;
TRUNCATE TABLE `emo_categorias`;

-- ---------------------------------------------------------------------------
-- NO se toca `emo_tipos_evaluacion` (lookup con valores fijos PREOC/ANUAL/RETIRO/VISITA).
-- ---------------------------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Verificación: todo lo que se borró debe quedar en 0
-- ---------------------------------------------------------------------------
SELECT 'emo_categorias'               AS tabla, COUNT(*) AS filas FROM `emo_categorias`
UNION ALL SELECT 'examenes',                        COUNT(*) FROM `examenes`
UNION ALL SELECT 'examen_precio',                   COUNT(*) FROM `examen_precio`
UNION ALL SELECT 'emo_perfiles',                    COUNT(*) FROM `emo_perfiles`
UNION ALL SELECT 'emo_perfil_asignacion',           COUNT(*) FROM `emo_perfil_asignacion`
UNION ALL SELECT 'emo_perfil_examenes',             COUNT(*) FROM `emo_perfil_examenes`
UNION ALL SELECT 'emo_perfil_precio',               COUNT(*) FROM `emo_perfil_precio`
UNION ALL SELECT 'pedidos',                         COUNT(*) FROM `pedidos`
UNION ALL SELECT 'pedido_items',                    COUNT(*) FROM `pedido_items`
UNION ALL SELECT 'pedido_pacientes',                COUNT(*) FROM `pedido_pacientes`
UNION ALL SELECT 'paciente_examen_asignado',        COUNT(*) FROM `paciente_examen_asignado`
UNION ALL SELECT 'paciente_examen_completado',      COUNT(*) FROM `paciente_examen_completado`
UNION ALL SELECT 'cotizaciones',                    COUNT(*) FROM `cotizaciones`
UNION ALL SELECT 'cotizacion_items',                COUNT(*) FROM `cotizacion_items`
UNION ALL SELECT 'facturas',                        COUNT(*) FROM `facturas`
UNION ALL SELECT 'factura_detalle',                 COUNT(*) FROM `factura_detalle`
UNION ALL SELECT 'factura_cotizacion',              COUNT(*) FROM `factura_cotizacion`
UNION ALL SELECT 'solicitudes_agregar',             COUNT(*) FROM `solicitudes_agregar`
UNION ALL SELECT 'solicitud_agregar_paciente',      COUNT(*) FROM `solicitud_agregar_paciente`
UNION ALL SELECT 'solicitud_agregar_examenes',      COUNT(*) FROM `solicitud_agregar_examenes`
UNION ALL SELECT 'historial_pedido',                COUNT(*) FROM `historial_pedido`;
