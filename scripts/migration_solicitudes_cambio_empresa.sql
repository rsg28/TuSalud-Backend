-- Solicitudes de cambio de empresa (cliente pide representar otra empresa; vendedor aprueba).

CREATE TABLE IF NOT EXISTS `solicitudes_cambio_empresa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `empresa_id_actual` int DEFAULT NULL,
  `empresa_id_destino` int DEFAULT NULL,
  `razon_social_propuesta` varchar(255) DEFAULT NULL,
  `ruc_propuesto` varchar(20) DEFAULT NULL,
  `direccion_propuesta` varchar(255) DEFAULT NULL,
  `contacto_propuesto` varchar(255) DEFAULT NULL,
  `estado` enum('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  `mensaje_rechazo` text,
  `revisado_por_usuario_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sce_usuario` (`usuario_id`),
  KEY `idx_sce_estado` (`estado`),
  KEY `empresa_id_destino` (`empresa_id_destino`),
  KEY `revisado_por_usuario_id` (`revisado_por_usuario_id`),
  CONSTRAINT `sce_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sce_ibfk_2` FOREIGN KEY (`empresa_id_actual`) REFERENCES `empresas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sce_ibfk_3` FOREIGN KEY (`empresa_id_destino`) REFERENCES `empresas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sce_ibfk_4` FOREIGN KEY (`revisado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
