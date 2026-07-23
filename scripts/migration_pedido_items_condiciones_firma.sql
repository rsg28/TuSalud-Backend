-- Condicionales por variante de perfil en pedido_items.
-- Permite coexistir Perfil A y Perfil A+EDAD_GE_45 en el mismo pedido.
--
--   mysql -h ... -u admin -p tusalud < scripts/migration_pedido_items_condiciones_firma.sql

ALTER TABLE `pedido_items`
  ADD COLUMN `condiciones_firma` varchar(120) NOT NULL DEFAULT ''
    COMMENT 'Firma ordenada de códigos de condicional (vacío = sin condicional)'
    AFTER `examenes_snapshot_json`;

ALTER TABLE `pedido_items` DROP INDEX `uq_pedido_items`;

ALTER TABLE `pedido_items`
  MODIFY COLUMN `item_key` varchar(160) GENERATED ALWAYS AS (
    CONCAT(
      `tipo_item`, '|',
      IFNULL(`perfil_id`, 0), '|',
      IFNULL(`tipo_emo`, ''), '|',
      IFNULL(`examen_id`, 0), '|',
      IFNULL(`perfil_origen_id`, 0), '|',
      IFNULL(`perfil_origen_tipo_emo`, ''), '|',
      IFNULL(`condiciones_firma`, '')
    )
  ) VIRTUAL;

ALTER TABLE `pedido_items` ADD UNIQUE KEY `uq_pedido_items` (`pedido_id`, `item_key`);
