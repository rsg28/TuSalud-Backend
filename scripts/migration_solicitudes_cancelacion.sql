-- =============================================================================
-- Solicitudes de cancelación de pedido
-- =============================================================================
-- Permite que un CLIENTE solicite la cancelación de un pedido. El vendedor o
-- manager revisa la solicitud y la APRUEBA (lo que ejecuta la cancelación del
-- pedido = borrado en cascada) o la RECHAZA (con mensaje opcional explicando
-- el motivo).
--
-- Reglas:
--   - `cliente_usuario_id` es quien creó la solicitud (siempre rol CLIENTE).
--   - `estado` arranca en PENDIENTE.
--   - La regla "una sola solicitud PENDIENTE por pedido" se enforza en la
--     capa de aplicación (SELECT … WHERE estado='PENDIENTE' antes del INSERT).
--   - Al APROBAR: se ejecuta la cancelación del pedido. Como el FK pedido_id
--     es ON DELETE CASCADE, la propia solicitud se elimina junto con el pedido.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `solicitudes_cancelacion` (
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
  KEY `cliente_usuario_id` (`cliente_usuario_id`),
  KEY `revisado_por_usuario_id` (`revisado_por_usuario_id`),
  KEY `idx_solicitudes_cancel_pedido` (`pedido_id`),
  KEY `idx_solicitudes_cancel_estado` (`estado`),
  CONSTRAINT `solicitudes_cancel_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_cancel_ibfk_2` FOREIGN KEY (`cliente_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_cancel_ibfk_3` FOREIGN KEY (`revisado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
