-- Centro de costos del pedido (texto libre, opcional).
ALTER TABLE `pedidos`
  ADD COLUMN `centro_costo` varchar(100) DEFAULT NULL
  COMMENT 'Centro de costos asignado al pedido (lista predefinida u otro valor custom).'
  AFTER `condiciones_pago`;
