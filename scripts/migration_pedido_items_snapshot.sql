-- Snapshot en pedido_items: congela cada examen con su perfil EMO de origen al crear el pedido.
-- Reemplaza líneas PERFIL (resumen) por líneas EXAMEN detalladas para que el vendedor
-- lea exactamente lo configurado por el cliente, sin re-expandir el catálogo.
--
-- Ejecutar una vez en la BD de TuSalud:
--   mysql -u ... -p tusalud < scripts/migration_pedido_items_snapshot.sql

ALTER TABLE `pedido_items`
  ADD COLUMN `perfil_origen_id` int DEFAULT NULL AFTER `precio_base`,
  ADD COLUMN `perfil_origen_tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') DEFAULT NULL AFTER `perfil_origen_id`,
  ADD COLUMN `perfil_origen_nombre` varchar(255) DEFAULT NULL AFTER `perfil_origen_tipo_emo`,
  ADD COLUMN `examenes_snapshot_json` json DEFAULT NULL COMMENT 'Snapshot examen+perfil origen (tipo_item=EXAMEN).' AFTER `perfil_origen_nombre`;

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
