-- ============================================================================
-- migration_auth_single_session.sql
-- Una sesión activa por usuario: al iniciar sesión se incrementa auth_token_version
-- y los JWT anteriores dejan de ser válidos.
-- Idempotente.
-- ============================================================================

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'auth_token_version'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `usuarios`
     ADD COLUMN `auth_token_version` BIGINT UNSIGNED NOT NULL DEFAULT 1
     COMMENT ''Incrementa en cada login; invalida JWT previos''
     AFTER `activo`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'auth_token_version' AS columna,
       COUNT(*) AS usuarios_con_version
FROM `usuarios`;
