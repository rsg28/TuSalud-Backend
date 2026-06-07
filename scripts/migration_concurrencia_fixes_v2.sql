-- ============================================================================
-- migration_concurrencia_fixes_v2.sql
-- ----------------------------------------------------------------------------
-- Segunda tanda de fixes de concurrencia y trazabilidad multi-usuario:
--
--   1. idempotency_keys
--      Tabla append-only que cachea respuestas de POST con header
--      `Idempotency-Key`. Si un mismo cliente reintenta (doble clic, retry
--      de red, retry de proveedor), devolvemos la misma respuesta sin
--      duplicar pedidos / cotizaciones / facturas.
--
--   2. audit_log
--      Registro append-only de TODA acción significativa: creaciones,
--      cambios de estado, aprobaciones, ediciones, accesos a recursos
--      sensibles. Sirve para reportar "quién hizo qué" filtrando por rol,
--      usuario, recurso y fecha.
--
--   3. editor_actividad (soft-lock de presencia)
--      Tabla efímera que registra quién está editando un recurso ahora.
--      El frontend manda heartbeats cada ~30 s; la API muestra "Pedro está
--      editando este pedido desde hace 2 min" para evitar choques entre
--      vendedores sin bloquear hard la edición.
--
--   4. whatsapp_aprobaciones: UNIQUE parcial sobre estados abiertos.
--      Imposibilita tener dos conversaciones abiertas (PENDIENTE /
--      ESPERANDO_MOTIVO_RECHAZO) para la misma cotización. Las terminales
--      (APROBADA / RECHAZADA / CANCELADA) no chocan: usa una columna
--      generada que vale NULL en estados terminales (MySQL deja NULLs
--      múltiples).
--
-- Idempotente. Asume que `migration_concurrencia_fixes.sql` ya está aplicado.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- 1. Idempotency cache
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `idempotency_keys` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `clave` VARCHAR(120) NOT NULL COMMENT 'Idempotency-Key enviado por el cliente',
  `scope` VARCHAR(80) NOT NULL COMMENT 'Endpoint + método (ej. POST:/api/pedidos)',
  `usuario_id` INT DEFAULT NULL,
  `request_hash` VARCHAR(64) DEFAULT NULL COMMENT 'sha256 del body para detectar reuso indebido',
  `response_status` SMALLINT DEFAULT NULL,
  `response_body_json` MEDIUMTEXT DEFAULT NULL,
  `recurso_tipo` VARCHAR(40) DEFAULT NULL COMMENT 'PEDIDO / COTIZACION / FACTURA',
  `recurso_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'NULL → request en curso',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_idempotency_clave_scope_usuario` (`clave`, `scope`, `usuario_id`),
  KEY `idx_idempotency_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- 2. Audit log centralizado
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ts` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id` INT DEFAULT NULL,
  `usuario_nombre` VARCHAR(150) DEFAULT NULL COMMENT 'Snapshot del nombre al momento de la acción',
  `usuario_rol` VARCHAR(30) DEFAULT NULL COMMENT 'manager | vendedor | cliente | sistema',
  `accion` VARCHAR(80) NOT NULL COMMENT 'CREAR_PEDIDO, APROBAR_COTIZACION, EMITIR_FACTURA, EDITAR_PRECIO, ...',
  `recurso_tipo` VARCHAR(40) NOT NULL COMMENT 'PEDIDO | COTIZACION | FACTURA | PRECIO_EXAMEN | PERFIL_EMO | USUARIO ...',
  `recurso_id` VARCHAR(80) DEFAULT NULL COMMENT 'id numérico o compuesto (ej. examen:42:sede:3)',
  `descripcion` TEXT DEFAULT NULL COMMENT 'Texto humano para mostrar directamente en la UI',
  `detalle_json` JSON DEFAULT NULL COMMENT 'Snapshot opcional del antes/después o payload relevante',
  `ip` VARCHAR(64) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `request_id` VARCHAR(80) DEFAULT NULL COMMENT 'Correlación con Idempotency-Key o trace id',
  PRIMARY KEY (`id`),
  KEY `idx_audit_ts` (`ts`),
  KEY `idx_audit_usuario_ts` (`usuario_id`, `ts`),
  KEY `idx_audit_rol_ts` (`usuario_rol`, `ts`),
  KEY `idx_audit_recurso` (`recurso_tipo`, `recurso_id`, `ts`),
  KEY `idx_audit_accion_ts` (`accion`, `ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- 3. Soft-lock de presencia (quién está editando qué AHORA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `editor_actividad` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `recurso_tipo` VARCHAR(40) NOT NULL COMMENT 'PEDIDO | COTIZACION | FACTURA | ...',
  `recurso_id` VARCHAR(80) NOT NULL,
  `usuario_id` INT NOT NULL,
  `usuario_nombre` VARCHAR(150) DEFAULT NULL,
  `usuario_rol` VARCHAR(30) DEFAULT NULL,
  `accion` VARCHAR(40) NOT NULL DEFAULT 'EDITAR' COMMENT 'EDITAR | REVISAR | APROBAR | VER',
  `heartbeat_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_editor_actividad` (`recurso_tipo`, `recurso_id`, `usuario_id`, `accion`),
  KEY `idx_editor_recurso` (`recurso_tipo`, `recurso_id`, `heartbeat_at`),
  KEY `idx_editor_usuario` (`usuario_id`, `heartbeat_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- 4. WhatsApp: solo una conversación abierta por cotización
-- ----------------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'whatsapp_aprobaciones'
    AND COLUMN_NAME = 'estado_abierto_lock'
);
SET @sql := IF(@col_exists = 0,
  "ALTER TABLE `whatsapp_aprobaciones`
   ADD COLUMN `estado_abierto_lock` TINYINT
     AS (CASE WHEN estado IN ('PENDIENTE','ESPERANDO_MOTIVO_RECHAZO') THEN 1 ELSE NULL END) STORED",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Limpieza previa: cerramos como CANCELADA las filas viejas duplicadas que ya
-- no deberían estar abiertas (deja la fila más reciente abierta por cotización).
UPDATE `whatsapp_aprobaciones` a
JOIN (
  SELECT cotizacion_id, MAX(id) AS keep_id
  FROM `whatsapp_aprobaciones`
  WHERE estado IN ('PENDIENTE','ESPERANDO_MOTIVO_RECHAZO')
  GROUP BY cotizacion_id
  HAVING COUNT(*) > 1
) keep ON keep.cotizacion_id = a.cotizacion_id
SET a.estado = 'CANCELADA', a.updated_at = NOW()
WHERE a.estado IN ('PENDIENTE','ESPERANDO_MOTIVO_RECHAZO')
  AND a.id <> keep.keep_id;

SET @uq_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'whatsapp_aprobaciones'
    AND INDEX_NAME = 'uq_wa_cotizacion_abierta'
);
SET @sql := IF(@uq_exists = 0,
  'ALTER TABLE `whatsapp_aprobaciones`
   ADD UNIQUE KEY `uq_wa_cotizacion_abierta` (`cotizacion_id`, `estado_abierto_lock`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 5. Limpieza programable
-- ----------------------------------------------------------------------------
-- Para mantener `idempotency_keys` y `editor_actividad` bajo control, ejecutar
-- periódicamente (por ahora manual; cuando haya cron / event scheduler,
-- moverlo a un job):
--
--   DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL 7 DAY;
--   DELETE FROM editor_actividad WHERE heartbeat_at < NOW() - INTERVAL 6 HOUR;
-- ----------------------------------------------------------------------------

SELECT 'idempotency_keys' AS objeto, COUNT(*) AS filas FROM `idempotency_keys`
UNION ALL SELECT 'audit_log', COUNT(*) FROM `audit_log`
UNION ALL SELECT 'editor_actividad', COUNT(*) FROM `editor_actividad`
UNION ALL SELECT 'uq_wa_cotizacion_abierta', NULL;
