-- =============================================================================
-- Solicitudes de ver detalle de precios (cliente ↔ vendedor)
-- =============================================================================
-- Regla de negocio nueva (por indicación de la doctora):
--   - Cuando el CLIENTE ve una cotización enviada por el vendedor (o una
--     factura), NO debe ver los precios individuales de los exámenes que
--     forman parte de un perfil ni de los exámenes adicionales sueltos.
--     Solo debe ver el precio agregado del perfil.
--   - Excepción: en el paso 3 del wizard «Nuevo pedido» (donde el cliente
--     arma su propia cotización), sí puede ver y editar precios individuales.
--   - Para desbloquear la vista detallada, el cliente envía una SOLICITUD y
--     el vendedor/manager la APRUEBA o RECHAZA.
--   - Al aprobar, se activa `pedidos.cliente_ve_precios_individuales = 1`,
--     lo que desbloquea las cotizaciones y la factura del mismo pedido.
--
-- Este script:
--   1) Añade la columna `cliente_ve_precios_individuales` a `pedidos`.
--   2) Crea la tabla `solicitudes_ver_precios_detalle` (espejo simplificado
--      de `solicitudes_cancelacion`).
--
-- Idempotente: usa IF NOT EXISTS y verifica columna antes de agregarla.
-- =============================================================================

-- 1) Columna en pedidos ---------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pedidos'
    AND COLUMN_NAME = 'cliente_ve_precios_individuales'
);
SET @stmt := IF(
  @col_exists = 0,
  'ALTER TABLE `pedidos` ADD COLUMN `cliente_ve_precios_individuales` TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE addcol FROM @stmt;
EXECUTE addcol;
DEALLOCATE PREPARE addcol;

-- 2) Tabla de solicitudes -------------------------------------------------
CREATE TABLE IF NOT EXISTS `solicitudes_ver_precios_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `cliente_usuario_id` int NOT NULL,
  `estado` enum('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  `mensaje_cliente` text,
  `mensaje_rechazo` text,
  `fecha_solicitud` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_revision` timestamp NULL DEFAULT NULL,
  `revisado_por_usuario_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `svpd_cliente_usuario_id` (`cliente_usuario_id`),
  KEY `svpd_revisado_por_usuario_id` (`revisado_por_usuario_id`),
  KEY `idx_svpd_pedido` (`pedido_id`),
  KEY `idx_svpd_estado` (`estado`),
  CONSTRAINT `svpd_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `svpd_ibfk_2` FOREIGN KEY (`cliente_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `svpd_ibfk_3` FOREIGN KEY (`revisado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
