-- ============================================================================
-- migration_concurrencia_fixes.sql
-- ----------------------------------------------------------------------------
-- Fixes de concurrencia / multi-vendedor descubiertos en auditoría:
--   1. Tabla `serie_numeracion` para asignación atómica de N° de pedido,
--      cotización y factura. Elimina la carrera `SELECT MAX(id)+1`.
--   2. UNIQUE en `factura_cotizacion(cotizacion_id)` para impedir que una
--      cotización aprobada acabe en dos facturas distintas.
--   3. Índices UNIQUE funcionales en `examen_precio` y `emo_perfil_precio`
--      con COALESCE(.., 0) para que MySQL trate los NULLs como un valor único
--      (evita duplicar precios "generales" con sede_id IS NULL).
--
-- Idempotente: se puede correr más de una vez. Antes de añadir el UNIQUE en
-- `factura_cotizacion`, deduplica las filas existentes (deja la de menor id
-- por cotización) para no fallar el ALTER.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de series para numeración atómica
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `serie_numeracion` (
  `tipo` VARCHAR(32) NOT NULL,
  `anio` SMALLINT NOT NULL,
  `valor` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipo`, `anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Sembrar con el MAX(id) actual para que la serie comience justo donde está
-- el legacy (evita reusar números viejos si alguien borró filas).
INSERT INTO `serie_numeracion` (`tipo`, `anio`, `valor`)
SELECT 'PEDIDO', YEAR(CURDATE()), COALESCE(MAX(id), 0) FROM `pedidos`
ON DUPLICATE KEY UPDATE `valor` = GREATEST(`valor`, VALUES(`valor`));

INSERT INTO `serie_numeracion` (`tipo`, `anio`, `valor`)
SELECT 'COTIZACION', YEAR(CURDATE()), COALESCE(MAX(id), 0) FROM `cotizaciones`
ON DUPLICATE KEY UPDATE `valor` = GREATEST(`valor`, VALUES(`valor`));

INSERT INTO `serie_numeracion` (`tipo`, `anio`, `valor`)
SELECT 'COTIZACION_COMP', YEAR(CURDATE()), COALESCE(MAX(id), 0) FROM `cotizaciones`
ON DUPLICATE KEY UPDATE `valor` = GREATEST(`valor`, VALUES(`valor`));

INSERT INTO `serie_numeracion` (`tipo`, `anio`, `valor`)
SELECT 'FACTURA', YEAR(CURDATE()), COALESCE(MAX(id), 0) FROM `facturas`
ON DUPLICATE KEY UPDATE `valor` = GREATEST(`valor`, VALUES(`valor`));

-- ----------------------------------------------------------------------------
-- 2. UNIQUE en factura_cotizacion(cotizacion_id)
--    Una cotización aprobada solo puede aparecer en una factura.
-- ----------------------------------------------------------------------------

-- Antes del ALTER: si hay duplicados (factura A y B contienen misma cotización
-- por una carrera previa), conservamos la fila de menor id y eliminamos el
-- resto. Imprimimos cuántas se borran para auditoría posterior.
SELECT 'duplicados_factura_cotizacion' AS info,
       COUNT(*) AS borradas
FROM `factura_cotizacion` fc
WHERE fc.id > (
  SELECT MIN(fc2.id) FROM (SELECT id, cotizacion_id FROM `factura_cotizacion`) fc2
   WHERE fc2.cotizacion_id = fc.cotizacion_id
);

DELETE fc FROM `factura_cotizacion` fc
JOIN (
  SELECT cotizacion_id, MIN(id) AS keep_id
  FROM `factura_cotizacion`
  GROUP BY cotizacion_id
) keep ON keep.cotizacion_id = fc.cotizacion_id
WHERE fc.id > keep.keep_id;

-- Crear UNIQUE solo si todavía no existe
SET @uq_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'factura_cotizacion'
    AND INDEX_NAME = 'uq_factura_cotizacion_cotizacion'
);
SET @sql := IF(@uq_exists = 0,
  'ALTER TABLE `factura_cotizacion` ADD UNIQUE KEY `uq_factura_cotizacion_cotizacion` (`cotizacion_id`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 3. examen_precio: cerrar el agujero del UNIQUE con NULL
--    MySQL trata múltiples NULLs como distintos en UNIQUE → permite duplicar
--    `precio general` (sede_id IS NULL). Usamos índice UNIQUE funcional
--    (examen_id, COALESCE(sede_id, 0)) en lugar de columna generada STORED,
--    que en algunos RDS falla con ERROR 1215 al reconstruir tablas con FKs.
-- ----------------------------------------------------------------------------

-- Antes del UNIQUE: deduplicar manteniendo la fila de mayor id (la más
-- reciente). Evita que el ALTER falle si hay duplicados previos por carrera.
DELETE ep FROM `examen_precio` ep
JOIN (
  SELECT examen_id, COALESCE(sede_id, 0) AS sk, MAX(id) AS keep_id
  FROM `examen_precio`
  GROUP BY examen_id, COALESCE(sede_id, 0)
) keep
  ON keep.examen_id = ep.examen_id
 AND COALESCE(ep.sede_id, 0) = keep.sk
WHERE ep.id <> keep.keep_id;

-- Limpiar huérfanos que bloquean ALTER con FKs activas
DELETE ep FROM `examen_precio` ep
  LEFT JOIN `examenes` e ON e.id = ep.examen_id
 WHERE e.id IS NULL;

DELETE ep FROM `examen_precio` ep
  LEFT JOIN `sedes` s ON s.id = ep.sede_id
 WHERE ep.sede_id IS NOT NULL AND s.id IS NULL;

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

SET @uq_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'examen_precio'
    AND INDEX_NAME = 'uq_examen_precio_sede_key'
);
SET @sql := IF(@uq_exists = 0,
  'ALTER TABLE `examen_precio`
   ADD UNIQUE KEY `uq_examen_precio_sede_key` (`examen_id`, (COALESCE(`sede_id`, 0)))',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 4. emo_perfil_precio: mismo truco para (perfil, empresa, sede, tipo_emo)
-- ----------------------------------------------------------------------------
DELETE pp FROM `emo_perfil_precio` pp
JOIN (
  SELECT perfil_id, COALESCE(empresa_id, 0) AS ek, COALESCE(sede_id, 0) AS sk, tipo_emo,
         MAX(id) AS keep_id
  FROM `emo_perfil_precio`
  GROUP BY perfil_id, COALESCE(empresa_id, 0), COALESCE(sede_id, 0), tipo_emo
) keep
  ON keep.perfil_id = pp.perfil_id
 AND COALESCE(pp.empresa_id, 0) = keep.ek
 AND COALESCE(pp.sede_id, 0) = keep.sk
 AND pp.tipo_emo = keep.tipo_emo
WHERE pp.id <> keep.keep_id;

DELETE pp FROM `emo_perfil_precio` pp
  LEFT JOIN `emo_perfiles` p ON p.id = pp.perfil_id
 WHERE p.id IS NULL;

DELETE pp FROM `emo_perfil_precio` pp
  LEFT JOIN `empresas` e ON e.id = pp.empresa_id
 WHERE pp.empresa_id IS NOT NULL AND e.id IS NULL;

DELETE pp FROM `emo_perfil_precio` pp
  LEFT JOIN `sedes` s ON s.id = pp.sede_id
 WHERE pp.sede_id IS NOT NULL AND s.id IS NULL;

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

SET @uq_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'emo_perfil_precio'
    AND INDEX_NAME = 'uq_emo_perfil_precio_keys'
);
SET @sql := IF(@uq_exists = 0,
  'ALTER TABLE `emo_perfil_precio`
   ADD UNIQUE KEY `uq_emo_perfil_precio_keys` (
     `perfil_id`,
     (COALESCE(`empresa_id`, 0)),
     (COALESCE(`sede_id`, 0)),
     `tipo_emo`
   )',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- Fin: lista de constraints añadidos
-- ----------------------------------------------------------------------------
SELECT 'serie_numeracion'              AS objeto, COUNT(*) AS filas FROM `serie_numeracion`
UNION ALL SELECT 'uq_factura_cotizacion_cotizacion', NULL
UNION ALL SELECT 'uq_examen_precio_sede_key',       NULL
UNION ALL SELECT 'uq_emo_perfil_precio_keys',       NULL;
