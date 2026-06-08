-- ============================================================================
-- migration_concurrencia_fixes_v1_resume.sql
-- ----------------------------------------------------------------------------
-- Continúa migration_concurrencia_fixes.sql si falló en la sección 3
-- (ERROR 1215 al añadir sede_key en examen_precio).
--
-- En lugar de columnas generadas STORED (que en algunos RDS fallan al
-- reconstruir tablas con FKs), usa índices UNIQUE funcionales de MySQL 8:
--   (examen_id, (COALESCE(sede_id, 0)))
--
-- Idempotente. Seguro correr aunque v1 haya aplicado parcialmente.
-- ============================================================================

SET NAMES utf8mb4;

-- --- Diagnóstico (solo lectura; imprime conteos) ---------------------------
SELECT 'orphan_examen_precio_sede' AS check_name, COUNT(*) AS n
  FROM examen_precio ep
  LEFT JOIN sedes s ON s.id = ep.sede_id
 WHERE ep.sede_id IS NOT NULL AND s.id IS NULL;

SELECT 'orphan_examen_precio_examen' AS check_name, COUNT(*) AS n
  FROM examen_precio ep
  LEFT JOIN examenes e ON e.id = ep.examen_id
 WHERE e.id IS NULL;

SELECT 'orphan_emo_perfil_precio_sede' AS check_name, COUNT(*) AS n
  FROM emo_perfil_precio pp
  LEFT JOIN sedes s ON s.id = pp.sede_id
 WHERE pp.sede_id IS NOT NULL AND s.id IS NULL;

SELECT 'orphan_emo_perfil_precio_empresa' AS check_name, COUNT(*) AS n
  FROM emo_perfil_precio pp
  LEFT JOIN empresas e ON e.id = pp.empresa_id
 WHERE pp.empresa_id IS NOT NULL AND e.id IS NULL;

SELECT 'orphan_emo_perfil_precio_perfil' AS check_name, COUNT(*) AS n
  FROM emo_perfil_precio pp
  LEFT JOIN emo_perfiles p ON p.id = pp.perfil_id
 WHERE p.id IS NULL;

-- --- Limpieza de huérfanos (imprescindible si el ALTER anterior falló) ------
DELETE ep FROM examen_precio ep
  LEFT JOIN examenes e ON e.id = ep.examen_id
 WHERE e.id IS NULL;

DELETE ep FROM examen_precio ep
  LEFT JOIN sedes s ON s.id = ep.sede_id
 WHERE ep.sede_id IS NOT NULL AND s.id IS NULL;

DELETE pp FROM emo_perfil_precio pp
  LEFT JOIN emo_perfiles p ON p.id = pp.perfil_id
 WHERE p.id IS NULL;

DELETE pp FROM emo_perfil_precio pp
  LEFT JOIN empresas e ON e.id = pp.empresa_id
 WHERE pp.empresa_id IS NOT NULL AND e.id IS NULL;

DELETE pp FROM emo_perfil_precio pp
  LEFT JOIN sedes s ON s.id = pp.sede_id
 WHERE pp.sede_id IS NOT NULL AND s.id IS NULL;

-- --- examen_precio: deduplicar + UNIQUE funcional --------------------------
DELETE ep FROM examen_precio ep
JOIN (
  SELECT examen_id, COALESCE(sede_id, 0) AS sk, MAX(id) AS keep_id
  FROM examen_precio
  GROUP BY examen_id, COALESCE(sede_id, 0)
) keep
  ON keep.examen_id = ep.examen_id
 AND COALESCE(ep.sede_id, 0) = keep.sk
WHERE ep.id <> keep.keep_id;

-- Quitar índice viejo que permite múltiples NULL en sede_id
SET @old_uq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'examen_precio'
    AND INDEX_NAME = 'uq_examen_precio'
);
SET @sql := IF(@old_uq > 0,
  'ALTER TABLE `examen_precio` DROP INDEX `uq_examen_precio`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Quitar sede_key generada si v1 la creó a medias (poco probable)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'examen_precio'
    AND COLUMN_NAME = 'sede_key'
);
SET @sql := IF(@col_exists > 0,
  'ALTER TABLE `examen_precio` DROP COLUMN `sede_key`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @new_uq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'examen_precio'
    AND INDEX_NAME = 'uq_examen_precio_sede_key'
);
SET @sql := IF(@new_uq = 0,
  'ALTER TABLE `examen_precio`
   ADD UNIQUE KEY `uq_examen_precio_sede_key` (`examen_id`, (COALESCE(`sede_id`, 0)))',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- --- emo_perfil_precio: deduplicar + UNIQUE funcional --------------------
DELETE pp FROM emo_perfil_precio pp
JOIN (
  SELECT perfil_id, COALESCE(empresa_id, 0) AS ek, COALESCE(sede_id, 0) AS sk, tipo_emo,
         MAX(id) AS keep_id
  FROM emo_perfil_precio
  GROUP BY perfil_id, COALESCE(empresa_id, 0), COALESCE(sede_id, 0), tipo_emo
) keep
  ON keep.perfil_id = pp.perfil_id
 AND COALESCE(pp.empresa_id, 0) = keep.ek
 AND COALESCE(pp.sede_id, 0) = keep.sk
 AND pp.tipo_emo = keep.tipo_emo
WHERE pp.id <> keep.keep_id;

SET @old_uq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'emo_perfil_precio'
    AND INDEX_NAME = 'uq_emo_perfil_precio'
);
SET @sql := IF(@old_uq > 0,
  'ALTER TABLE `emo_perfil_precio` DROP INDEX `uq_emo_perfil_precio`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_emp := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'emo_perfil_precio'
    AND COLUMN_NAME = 'empresa_key'
);
SET @sql := IF(@col_emp > 0,
  'ALTER TABLE `emo_perfil_precio` DROP COLUMN `empresa_key`, DROP COLUMN `sede_key`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @new_uq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'emo_perfil_precio'
    AND INDEX_NAME = 'uq_emo_perfil_precio_keys'
);
SET @sql := IF(@new_uq = 0,
  'ALTER TABLE `emo_perfil_precio`
   ADD UNIQUE KEY `uq_emo_perfil_precio_keys` (
     `perfil_id`,
     (COALESCE(`empresa_id`, 0)),
     (COALESCE(`sede_id`, 0)),
     `tipo_emo`
   )',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- --- Verificación final ----------------------------------------------------
SELECT 'serie_numeracion' AS objeto,
       (SELECT COUNT(*) FROM serie_numeracion) AS filas
UNION ALL
SELECT 'uq_factura_cotizacion_cotizacion',
       (SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'factura_cotizacion'
           AND INDEX_NAME = 'uq_factura_cotizacion_cotizacion')
UNION ALL
SELECT 'uq_examen_precio_sede_key',
       (SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'examen_precio'
           AND INDEX_NAME = 'uq_examen_precio_sede_key')
UNION ALL
SELECT 'uq_emo_perfil_precio_keys',
       (SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'emo_perfil_precio'
           AND INDEX_NAME = 'uq_emo_perfil_precio_keys');
