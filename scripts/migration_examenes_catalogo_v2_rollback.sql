-- =============================================================================
-- Rollback de migración del catálogo de exámenes v2
-- =============================================================================
-- Atención: este rollback sólo revierte los CAMBIOS DE SCHEMA (las columnas
-- `precio_hasta_15` y `precio_desde_16`, y el índice nuevo). NO restaura los
-- valores anteriores de `activo`, `nombre`, `categoria_id` ni `precio`, porque
-- la migración hizo upserts in-place y sólo un backup previo permitiría
-- recuperarlos. Antes de correr la migración haz `mysqldump` de las tablas
-- examenes / examen_precio / emo_categorias.
-- =============================================================================

ALTER TABLE `examen_precio`
  DROP COLUMN `precio_desde_16`,
  DROP COLUMN `precio_hasta_15`;

DROP INDEX `idx_examenes_nombre_activo` ON `examenes`;
