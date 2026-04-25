-- =============================================================================
-- TuSalud — Migración FASE 2 (modelo híbrido en items)
-- =============================================================================
-- Aplica los cambios de Fase 2 sobre una BD que ya tenga Fase 1 aplicada.
-- Es idempotente: se puede ejecutar varias veces sin romperse.
--
-- Cambios:
--   1) cotizacion_items  → híbrido (PERFIL | EXAMEN), examen_id nullable
--   2) factura_detalle   → híbrido
--   3) pedido_examenes   → renombrado a pedido_items + híbrido + columna VIRTUAL
--                          item_key para UNIQUE (pedido_id, item)
--   4) Limpia datos transaccionales viejos (cotizacion_items, factura_detalle,
--      pedido_examenes/pedido_items) para evitar conflictos con los nuevos
--      CHECK constraints. El catálogo EMO no se toca.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 0) Limpieza de datos transaccionales (los CHECK nuevos pueden chocar con
--    filas viejas que tengan examen_id sin tipo_item bien seteado).
--    No tocamos pedidos/cotizaciones/facturas/pacientes — sólo las líneas.
-- -----------------------------------------------------------------------------
DELETE FROM `cotizacion_items`;
DELETE FROM `factura_detalle`;
-- pedido_examenes puede no existir si esta migración ya corrió antes.
DROP TABLE IF EXISTS `pedido_items_tmp_old`;
SET @has_pe := (SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name = 'pedido_examenes');
SET @sql := IF(@has_pe = 1, 'DELETE FROM `pedido_examenes`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- -----------------------------------------------------------------------------
-- 1) cotizacion_items → híbrido
-- -----------------------------------------------------------------------------
-- Eliminar FK existente sobre examen_id (si existe) para poder hacerlo nullable.
SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'cotizacion_items'
              AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'cotizacion_items_ibfk_2');
SET @sql := IF(@fk IS NOT NULL, 'ALTER TABLE `cotizacion_items` DROP FOREIGN KEY `cotizacion_items_ibfk_2`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Eliminar el CHECK viejo de cantidad (lo recreamos con nombre nuevo).
SET @ck := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'cotizacion_items'
              AND constraint_type = 'CHECK' AND constraint_name = 'cotizacion_items_chk_1');
SET @sql := IF(@ck IS NOT NULL, 'ALTER TABLE `cotizacion_items` DROP CHECK `cotizacion_items_chk_1`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Hacer examen_id nullable (puede que ya lo sea si la migración corrió antes).
SET @nullable := (SELECT is_nullable FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = 'cotizacion_items'
                    AND column_name = 'examen_id');
SET @sql := IF(@nullable = 'NO', 'ALTER TABLE `cotizacion_items` MODIFY COLUMN `examen_id` int DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Agregar columnas nuevas si no existen.
DROP PROCEDURE IF EXISTS tmp_add_col;
DELIMITER $$
CREATE PROCEDURE tmp_add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = col
  ) THEN
    SET @s := CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END$$
DELIMITER ;

CALL tmp_add_col('cotizacion_items', 'tipo_item',
  "`tipo_item` enum('PERFIL','EXAMEN') NOT NULL DEFAULT 'EXAMEN' AFTER `cotizacion_id`");
CALL tmp_add_col('cotizacion_items', 'perfil_id',
  "`perfil_id` int DEFAULT NULL AFTER `tipo_item`");
CALL tmp_add_col('cotizacion_items', 'tipo_emo',
  "`tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') DEFAULT NULL AFTER `perfil_id`");

-- Recrear FKs y CHECKs idempotente.
SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'cotizacion_items'
              AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'cotizacion_items_ibfk_2');
SET @sql := IF(@fk IS NULL,
  'ALTER TABLE `cotizacion_items` ADD CONSTRAINT `cotizacion_items_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'cotizacion_items'
              AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'cotizacion_items_ibfk_3');
SET @sql := IF(@fk IS NULL,
  'ALTER TABLE `cotizacion_items` ADD CONSTRAINT `cotizacion_items_ibfk_3` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE RESTRICT',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @ck := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'cotizacion_items'
              AND constraint_type = 'CHECK' AND constraint_name = 'cotizacion_items_chk_cant');
SET @sql := IF(@ck IS NULL,
  'ALTER TABLE `cotizacion_items` ADD CONSTRAINT `cotizacion_items_chk_cant` CHECK (`cantidad` > 0)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @ck := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'cotizacion_items'
              AND constraint_type = 'CHECK' AND constraint_name = 'cotizacion_items_chk_tipo');
SET @sql := IF(@ck IS NULL,
  "ALTER TABLE `cotizacion_items` ADD CONSTRAINT `cotizacion_items_chk_tipo` CHECK (
    (`tipo_item` = 'EXAMEN' AND `examen_id` IS NOT NULL AND `perfil_id` IS NULL AND `tipo_emo` IS NULL)
    OR
    (`tipo_item` = 'PERFIL' AND `perfil_id` IS NOT NULL AND `tipo_emo` IS NOT NULL AND `examen_id` IS NULL)
  )",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Índices auxiliares.
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name = 'cotizacion_items'
               AND index_name = 'idx_cot_items_perfil');
SET @sql := IF(@idx = 0,
  'ALTER TABLE `cotizacion_items` ADD KEY `idx_cot_items_perfil` (`perfil_id`)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- -----------------------------------------------------------------------------
-- 2) factura_detalle → híbrido (mismo patrón)
-- -----------------------------------------------------------------------------
SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'factura_detalle'
              AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'factura_detalle_ibfk_2');
SET @sql := IF(@fk IS NOT NULL, 'ALTER TABLE `factura_detalle` DROP FOREIGN KEY `factura_detalle_ibfk_2`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @nullable := (SELECT is_nullable FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = 'factura_detalle'
                    AND column_name = 'examen_id');
SET @sql := IF(@nullable = 'NO', 'ALTER TABLE `factura_detalle` MODIFY COLUMN `examen_id` int DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

CALL tmp_add_col('factura_detalle', 'tipo_item',
  "`tipo_item` enum('PERFIL','EXAMEN') NOT NULL DEFAULT 'EXAMEN' AFTER `factura_id`");
CALL tmp_add_col('factura_detalle', 'perfil_id',
  "`perfil_id` int DEFAULT NULL AFTER `tipo_item`");
CALL tmp_add_col('factura_detalle', 'tipo_emo',
  "`tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') DEFAULT NULL AFTER `perfil_id`");

SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'factura_detalle'
              AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'factura_detalle_ibfk_2');
SET @sql := IF(@fk IS NULL,
  'ALTER TABLE `factura_detalle` ADD CONSTRAINT `factura_detalle_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'factura_detalle'
              AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'factura_detalle_ibfk_3');
SET @sql := IF(@fk IS NULL,
  'ALTER TABLE `factura_detalle` ADD CONSTRAINT `factura_detalle_ibfk_3` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE RESTRICT',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @ck := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'factura_detalle'
              AND constraint_type = 'CHECK' AND constraint_name = 'factura_detalle_chk_tipo');
SET @sql := IF(@ck IS NULL,
  "ALTER TABLE `factura_detalle` ADD CONSTRAINT `factura_detalle_chk_tipo` CHECK (
    (`tipo_item` = 'EXAMEN' AND `examen_id` IS NOT NULL AND `perfil_id` IS NULL AND `tipo_emo` IS NULL)
    OR
    (`tipo_item` = 'PERFIL' AND `perfil_id` IS NOT NULL AND `tipo_emo` IS NOT NULL AND `examen_id` IS NULL)
  )",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name = 'factura_detalle'
               AND index_name = 'idx_factura_detalle_perfil');
SET @sql := IF(@idx = 0,
  'ALTER TABLE `factura_detalle` ADD KEY `idx_factura_detalle_perfil` (`perfil_id`)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- -----------------------------------------------------------------------------
-- 3) pedido_examenes → renombrar a pedido_items + híbrido
-- -----------------------------------------------------------------------------
-- Si todavía existe pedido_examenes, lo renombramos. Si ya no existe (re-run),
-- asumimos que pedido_items ya está creado (pero igual aplicamos las columnas
-- por idempotencia).
SET @has_old := (SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = 'pedido_examenes');
SET @has_new := (SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = 'pedido_items');

-- Caso A: existe pedido_examenes y NO existe pedido_items → rename.
SET @sql := IF(@has_old = 1 AND @has_new = 0,
  'RENAME TABLE `pedido_examenes` TO `pedido_items`',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Caso B: por algún motivo existen ambas (raro). Borramos la vieja vacía.
SET @has_old := (SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = 'pedido_examenes');
SET @sql := IF(@has_old = 1, 'DROP TABLE `pedido_examenes`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Caso C: nada existe → creamos pedido_items vacío.
SET @has_new := (SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = 'pedido_items');
SET @sql := IF(@has_new = 0,
  'CREATE TABLE `pedido_items` (
     `id` int NOT NULL AUTO_INCREMENT,
     `pedido_id` int NOT NULL,
     `examen_id` int DEFAULT NULL,
     `cantidad` int NOT NULL,
     `precio_base` decimal(12,2) NOT NULL,
     `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (`id`),
     CONSTRAINT `pedido_items_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Renombrar las constraints heredadas (pedido_examenes_ibfk_1 → pedido_items_ibfk_1, etc.)
-- En MySQL no se renombran constraints fácilmente: las dropeamos y recreamos.
SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
              AND constraint_name = 'pedido_examenes_ibfk_1');
SET @sql := IF(@fk IS NOT NULL, 'ALTER TABLE `pedido_items` DROP FOREIGN KEY `pedido_examenes_ibfk_1`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
              AND constraint_name = 'pedido_examenes_ibfk_2');
SET @sql := IF(@fk IS NOT NULL, 'ALTER TABLE `pedido_items` DROP FOREIGN KEY `pedido_examenes_ibfk_2`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @ck := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
              AND constraint_name = 'pedido_examenes_chk_1');
SET @sql := IF(@ck IS NOT NULL, 'ALTER TABLE `pedido_items` DROP CHECK `pedido_examenes_chk_1`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Drop UNIQUE viejo (pedido_id, examen_id) si existe.
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
               AND index_name = 'pedido_id');
SET @sql := IF(@idx > 0, 'ALTER TABLE `pedido_items` DROP INDEX `pedido_id`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Hacer examen_id nullable.
SET @nullable := (SELECT is_nullable FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
                    AND column_name = 'examen_id');
SET @sql := IF(@nullable = 'NO', 'ALTER TABLE `pedido_items` MODIFY COLUMN `examen_id` int DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Agregar columnas nuevas.
CALL tmp_add_col('pedido_items', 'tipo_item',
  "`tipo_item` enum('PERFIL','EXAMEN') NOT NULL DEFAULT 'EXAMEN' AFTER `pedido_id`");
CALL tmp_add_col('pedido_items', 'perfil_id',
  "`perfil_id` int DEFAULT NULL AFTER `tipo_item`");
CALL tmp_add_col('pedido_items', 'tipo_emo',
  "`tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') DEFAULT NULL AFTER `perfil_id`");
CALL tmp_add_col('pedido_items', 'nombre',
  "`nombre` varchar(255) DEFAULT NULL AFTER `examen_id`");
CALL tmp_add_col('pedido_items', 'item_key',
  "`item_key` varchar(64) GENERATED ALWAYS AS (CONCAT(`tipo_item`, '|', IFNULL(`perfil_id`, 0), '|', IFNULL(`tipo_emo`, ''), '|', IFNULL(`examen_id`, 0))) VIRTUAL AFTER `precio_base`");

-- FKs y CHECKs.
SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
              AND constraint_name = 'pedido_items_ibfk_1');
SET @sql := IF(@fk IS NULL,
  'ALTER TABLE `pedido_items` ADD CONSTRAINT `pedido_items_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
              AND constraint_name = 'pedido_items_ibfk_2');
SET @sql := IF(@fk IS NULL,
  'ALTER TABLE `pedido_items` ADD CONSTRAINT `pedido_items_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
              AND constraint_name = 'pedido_items_ibfk_3');
SET @sql := IF(@fk IS NULL,
  'ALTER TABLE `pedido_items` ADD CONSTRAINT `pedido_items_ibfk_3` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE RESTRICT',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @ck := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
              AND constraint_name = 'pedido_items_chk_cant');
SET @sql := IF(@ck IS NULL,
  'ALTER TABLE `pedido_items` ADD CONSTRAINT `pedido_items_chk_cant` CHECK (`cantidad` > 0)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @ck := (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
              AND constraint_name = 'pedido_items_chk_tipo');
SET @sql := IF(@ck IS NULL,
  "ALTER TABLE `pedido_items` ADD CONSTRAINT `pedido_items_chk_tipo` CHECK (
    (`tipo_item` = 'EXAMEN' AND `examen_id` IS NOT NULL AND `perfil_id` IS NULL AND `tipo_emo` IS NULL)
    OR
    (`tipo_item` = 'PERFIL' AND `perfil_id` IS NOT NULL AND `tipo_emo` IS NOT NULL AND `examen_id` IS NULL)
  )",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- UNIQUE (pedido_id, item_key) — sustituye al UNIQUE(pedido_id, examen_id) viejo.
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
               AND index_name = 'uq_pedido_items');
SET @sql := IF(@idx = 0,
  'ALTER TABLE `pedido_items` ADD UNIQUE KEY `uq_pedido_items` (`pedido_id`,`item_key`)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Índices auxiliares.
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
               AND index_name = 'idx_pedido_items_perfil');
SET @sql := IF(@idx = 0,
  'ALTER TABLE `pedido_items` ADD KEY `idx_pedido_items_perfil` (`perfil_id`)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name = 'pedido_items'
               AND index_name = 'idx_pedido_items_examen');
SET @sql := IF(@idx = 0,
  'ALTER TABLE `pedido_items` ADD KEY `idx_pedido_items_examen` (`examen_id`)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

DROP PROCEDURE IF EXISTS tmp_add_col;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Listo. Verifica con:
--   SHOW CREATE TABLE cotizacion_items\G
--   SHOW CREATE TABLE pedido_items\G
--   SHOW CREATE TABLE factura_detalle\G
-- Y que ya NO exista pedido_examenes.
-- =============================================================================
