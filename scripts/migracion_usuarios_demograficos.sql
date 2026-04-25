-- =============================================================================
-- TuSalud — Migración: agregar datos demográficos a `usuarios`
-- =============================================================================
-- Agrega columnas para que los usuarios (paciente/cliente) puedan registrar
-- datos demográficos durante la creación de cuenta:
--   - fecha_nacimiento DATE
--   - sexo ENUM('HOMBRE','MUJER')
--   - direccion VARCHAR(500)
--
-- Idempotente: revisa information_schema antes de cada ALTER.
-- Aplicar con:  mysql ... < scripts/migracion_usuarios_demograficos.sql
-- =============================================================================

SET @db := DATABASE();

-- fecha_nacimiento
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'fecha_nacimiento'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `fecha_nacimiento` DATE DEFAULT NULL AFTER `tipo_ruc`',
  'SELECT "fecha_nacimiento ya existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sexo
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'sexo'
);
SET @sql := IF(
  @col_exists = 0,
  "ALTER TABLE `usuarios` ADD COLUMN `sexo` ENUM('HOMBRE','MUJER') DEFAULT NULL AFTER `fecha_nacimiento`",
  'SELECT "sexo ya existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- direccion
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'direccion'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `direccion` VARCHAR(500) DEFAULT NULL AFTER `sexo`',
  'SELECT "direccion ya existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migración usuarios demográficos completada.' AS resultado;
