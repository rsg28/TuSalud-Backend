-- ----------------------------------------------------------------------------
-- Migración: solicitudes de creación de perfiles EMO por parte de clientes
-- ----------------------------------------------------------------------------
-- Un cliente pide al vendedor la creación de un nuevo perfil EMO (privado a su
-- empresa). El cliente solo indica el nombre propuesto y notas de lo que
-- espera; el vendedor decidirá qué exámenes incluir. Cuando la solicitud se
-- aprueba, se crea el perfil PRIVADO asignado a la empresa y `perfil_creado_id`
-- se enlaza al `emo_perfiles.id` resultante.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solicitudes_perfil_emo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `empresa_id` INT NOT NULL,
  `usuario_id` INT NOT NULL COMMENT 'Cliente que originó la solicitud',
  `nombre_propuesto` VARCHAR(255) NOT NULL,
  `notas` TEXT NULL,
  `estado` ENUM('PENDIENTE','APROBADA','RECHAZADA','CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  `perfil_creado_id` INT NULL COMMENT 'FK al perfil resultante cuando se aprueba',
  `motivo_rechazo` TEXT NULL,
  `resuelto_por_usuario_id` INT NULL COMMENT 'Vendedor/manager que aprobó o rechazó',
  `resuelta_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_spe_empresa_estado` (`empresa_id`, `estado`),
  KEY `idx_spe_estado_created` (`estado`, `created_at`),
  KEY `idx_spe_usuario` (`usuario_id`),
  KEY `idx_spe_perfil_creado` (`perfil_creado_id`),
  CONSTRAINT `fk_spe_empresa`
    FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spe_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spe_perfil_creado`
    FOREIGN KEY (`perfil_creado_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_spe_resuelto_por`
    FOREIGN KEY (`resuelto_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
