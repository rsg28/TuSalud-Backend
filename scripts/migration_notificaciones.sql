-- =============================================================================
-- Notificaciones cliente ↔ vendedor
-- =============================================================================
-- Mensajes/avisos entre vendedor (o manager) y los clientes de una empresa.
--
-- Reglas:
--   - `destinatario_usuario_id`  → notificación dirigida a un usuario concreto.
--   - `destinatario_empresa_id`  → notificación dirigida a TODOS los clientes
--                                  con `usuarios.empresa_id = X`.
--   - Al menos uno de los dos debe estar presente.
--   - `thread_id` agrupa una conversación: la primera notificación tiene
--     thread_id = id (auto-asignado por trigger), las respuestas heredan el
--     thread_id de la notificación a la que responden.
--   - `tipo` clasifica el origen:
--        COTIZACION_CREADA  – vendedor envió cotización a la empresa
--        PERFIL_ASIGNADO    – manager/vendedor asignó perfil(es) a la empresa
--        MENSAJE            – mensaje libre
--        RESPUESTA          – respuesta del cliente al vendedor
-- =============================================================================

CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thread_id` int DEFAULT NULL COMMENT 'Agrupa una conversación; en la 1ra notif se setea = id',
  `tipo` ENUM('COTIZACION_CREADA','PERFIL_ASIGNADO','MENSAJE','RESPUESTA') NOT NULL DEFAULT 'MENSAJE',
  `titulo` varchar(255) NOT NULL,
  `mensaje` text,
  `contexto_json` JSON DEFAULT NULL COMMENT 'IDs y metadata (cotizacion_id, perfil_id, etc.)',
  `remitente_usuario_id` int DEFAULT NULL,
  `destinatario_usuario_id` int DEFAULT NULL,
  `destinatario_empresa_id` int DEFAULT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_destinatario_user` (`destinatario_usuario_id`,`leida`),
  KEY `idx_notif_destinatario_emp`  (`destinatario_empresa_id`,`leida`),
  KEY `idx_notif_remitente`         (`remitente_usuario_id`),
  KEY `idx_notif_thread`            (`thread_id`),
  CONSTRAINT `fk_notif_remitente`
    FOREIGN KEY (`remitente_usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notif_dest_user`
    FOREIGN KEY (`destinatario_usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notif_dest_emp`
    FOREIGN KEY (`destinatario_empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_notif_dest`
    CHECK (`destinatario_usuario_id` IS NOT NULL OR `destinatario_empresa_id` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
