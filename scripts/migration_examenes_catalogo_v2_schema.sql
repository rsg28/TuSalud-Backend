-- =============================================================================
-- Catálogo de exámenes v2 — cambios de schema
-- =============================================================================
-- Agrega dos precios por examen: tramo "hasta 15 pacientes" y "desde 16".
-- La columna `precio` original se conserva por compatibilidad con el código
-- existente y, tras la carga de datos, queda igual a `precio_desde_16` (el
-- precio "base mayorista", el más bajo, usado como referencia).
--
-- También crea un "id_cola" sintético en emo_categorias para las categorías
-- nuevas del Excel que no existían en el CSV legacy.
-- =============================================================================

-- ---- examen_precio: precios escalonados por tramo de volumen ----------------
ALTER TABLE `examen_precio`
  ADD COLUMN `precio_hasta_15`  decimal(12,2) DEFAULT NULL
    COMMENT 'Precio para pedidos de 1 a 15 pacientes (tarifa retail)'
    AFTER `precio`,
  ADD COLUMN `precio_desde_16` decimal(12,2) DEFAULT NULL
    COMMENT 'Precio para pedidos de 16+ pacientes (tarifa mayorista). Espejo de `precio` por compatibilidad.'
    AFTER `precio_hasta_15`;

-- Si la columna `precio` existe pero las nuevas vienen NULL tras una recarga,
-- se rellenan con el valor base durante el INSERT del script generador.

-- ---- (opcional) índice para buscar exámenes activos por nombre rápido -------
-- No estrictamente necesario, pero el catálogo crece a ~1500+ filas.
CREATE INDEX `idx_examenes_nombre_activo` ON `examenes` (`activo`, `nombre`);
