-- =============================================================================
-- Rollback: centro de costos en pedidos
-- =============================================================================
-- Ejecutar si se aplicó migration_pedido_centro_costo.sql y se quiere volver
-- al esquema sin esta columna (alineado con backend/frontend actual).
--
-- Si la columna no existe, MySQL responderá error; en ese caso no hace falta
-- ejecutar nada.
-- =============================================================================

ALTER TABLE `pedidos`
  DROP COLUMN `centro_costo`;
