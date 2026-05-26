-- =============================================================================
-- Seguimiento clínico de exámenes por paciente
-- =============================================================================
--
-- Antes de esta migración, el seguimiento era binario:
--   - paciente_examen_asignado: existe la fila → debe tomarse
--   - paciente_examen_completado: existe la fila → ya se tomó
--
-- Faltaba todo el espacio de estados intermedios (paciente faltó, el examen
-- no se pudo realizar, se pospuso) y faltaba auditoría de quién/cuándo/por
-- qué se cambió cada estado.
--
-- Esta migración:
--   1. Extiende `paciente_examen_asignado` con un estado completo + metadata
--      de origen del cambio (manual vs API externa).
--   2. Crea `paciente_examen_historial` para auditar cada cambio.
--   3. Crea `integraciones_api_keys` con un esquema mínimo que el endpoint
--      público `/api/integraciones/examen-evento` consultará para autenticar
--      a sistemas externos (p. ej. el sistema del jefe cuando esté listo).
--
-- Backward-compat: `paciente_examen_completado` se mantiene como mirror. El
-- código nuevo escribe AMBAS tablas cuando `estado = 'COMPLETADO'`, así los
-- queries antiguos siguen funcionando intactos.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 1) paciente_examen_asignado: nueva columna `estado` + metadata
-- ---------------------------------------------------------------------------

ALTER TABLE `paciente_examen_asignado`
  ADD COLUMN `estado` ENUM('PENDIENTE','COMPLETADO','AUSENTE','NO_REALIZADO','POSPUESTO')
      NOT NULL DEFAULT 'PENDIENTE' AFTER `examen_id`,
  ADD COLUMN `motivo` VARCHAR(500) DEFAULT NULL AFTER `estado`,
  ADD COLUMN `fecha_estado` TIMESTAMP NULL DEFAULT NULL AFTER `motivo`,
  ADD COLUMN `actualizado_por_usuario_id` INT NULL DEFAULT NULL AFTER `fecha_estado`,
  ADD COLUMN `fuente_actualizacion` ENUM('MANUAL','API_EXTERNA','SISTEMA')
      NOT NULL DEFAULT 'MANUAL' AFTER `actualizado_por_usuario_id`,
  ADD COLUMN `referencia_externa` VARCHAR(255) DEFAULT NULL
      COMMENT 'Id del evento en el sistema externo. Si se repite el mismo valor, el endpoint lo ignora (idempotencia).'
      AFTER `fuente_actualizacion`,
  ADD KEY `idx_pea_estado` (`estado`),
  ADD UNIQUE KEY `uq_pea_referencia_externa` (`referencia_externa`),
  ADD CONSTRAINT `fk_pea_actualizado_por`
      FOREIGN KEY (`actualizado_por_usuario_id`) REFERENCES `usuarios` (`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: las filas que ya tienen completado quedan como COMPLETADO con la
-- fecha real del registro existente. El resto se queda en PENDIENTE.
UPDATE `paciente_examen_asignado` pea
JOIN `paciente_examen_completado` pec
  ON pec.paciente_id = pea.paciente_id AND pec.examen_id = pea.examen_id
SET pea.estado = 'COMPLETADO',
    pea.fecha_estado = pec.fecha_completado,
    pea.fuente_actualizacion = 'SISTEMA';

-- ---------------------------------------------------------------------------
-- 2) paciente_examen_historial: auditoría de cambios
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `paciente_examen_historial` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `paciente_id` INT NOT NULL,
  `examen_id` INT NOT NULL,
  `estado_anterior` ENUM('PENDIENTE','COMPLETADO','AUSENTE','NO_REALIZADO','POSPUESTO') DEFAULT NULL,
  `estado_nuevo` ENUM('PENDIENTE','COMPLETADO','AUSENTE','NO_REALIZADO','POSPUESTO') NOT NULL,
  `motivo` VARCHAR(500) DEFAULT NULL,
  `usuario_id` INT DEFAULT NULL COMMENT 'Quién realizó el cambio (NULL si vino de la API externa).',
  `fuente` ENUM('MANUAL','API_EXTERNA','SISTEMA') NOT NULL DEFAULT 'MANUAL',
  `referencia_externa` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_peh_paciente` (`paciente_id`),
  KEY `idx_peh_paciente_examen` (`paciente_id`, `examen_id`),
  KEY `idx_peh_created` (`created_at`),
  CONSTRAINT `fk_peh_paciente`
      FOREIGN KEY (`paciente_id`) REFERENCES `pedido_pacientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_peh_examen`
      FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_peh_usuario`
      FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3) integraciones_api_keys: autenticación de sistemas externos
-- ---------------------------------------------------------------------------
--
-- Diseñada minimal a propósito: una sola tabla con tokens hasheados, scope
-- libre y campo `activa` para revocar. Cuando lleguen las credenciales del
-- jefe, se inserta una fila con su token hasheado en SHA-256 y listo.

CREATE TABLE IF NOT EXISTS `integraciones_api_keys` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Etiqueta humana, p. ej. "Sistema laboratorio jefe"',
  `token_hash` CHAR(64) NOT NULL COMMENT 'SHA-256 hex del token; el token plano NO se guarda.',
  `scope` VARCHAR(200) NOT NULL DEFAULT 'examen-evento'
      COMMENT 'Lista de scopes separados por coma. Por defecto solo el webhook de toma de exámenes.',
  `activa` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_por_usuario_id` INT DEFAULT NULL,
  `ultima_vez_usada` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_int_token_hash` (`token_hash`),
  CONSTRAINT `fk_int_creado_por`
      FOREIGN KEY (`creado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
