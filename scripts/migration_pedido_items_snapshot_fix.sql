-- Continuación si migration_pedido_items_snapshot.sql falló en DROP INDEX
-- (las 4 columnas snapshot ya existen, falta actualizar item_key).
--
--   mysql -h ... -u admin -p tusalud < scripts/migration_pedido_items_snapshot_fix.sql

ALTER TABLE `pedido_items`
  ADD INDEX `idx_pedido_items_pedido_id` (`pedido_id`);

ALTER TABLE `pedido_items` DROP INDEX `uq_pedido_items`;

ALTER TABLE `pedido_items`
  MODIFY COLUMN `item_key` varchar(128) GENERATED ALWAYS AS (
    CONCAT(
      `tipo_item`, '|',
      IFNULL(`perfil_id`, 0), '|',
      IFNULL(`tipo_emo`, ''), '|',
      IFNULL(`examen_id`, 0), '|',
      IFNULL(`perfil_origen_id`, 0), '|',
      IFNULL(`perfil_origen_tipo_emo`, '')
    )
  ) VIRTUAL;

ALTER TABLE `pedido_items` ADD UNIQUE KEY `uq_pedido_items` (`pedido_id`, `item_key`);
