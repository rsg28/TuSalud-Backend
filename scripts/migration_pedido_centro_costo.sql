-- =============================================================================
-- Migración: centro de costos en pedidos (PENDIENTE — no aplicar en producción)
-- =============================================================================
-- El feature está desactivado en backend/frontend. Para activarlo más adelante:
--   1. Ejecutar este script
--   2. Volver a habilitar centro_costo en pedidosController y en el wizard
--
-- Para deshacer si ya se aplicó:
--   scripts/migration_pedido_centro_costo_rollback.sql
-- =============================================================================

ALTER TABLE `pedidos`
  ADD COLUMN `centro_costo` varchar(100) DEFAULT NULL
  COMMENT 'Centro de costos asignado al pedido (lista predefinida u otro valor custom).'
  AFTER `condiciones_pago`;
