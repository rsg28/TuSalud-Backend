-- =============================================================================
-- TuSalud — Snapshot histórico de exámenes en cotizaciones y pacientes
-- =============================================================================
-- Problema: con el tiempo cambian los exámenes de un perfil. Si Raúl tomó el
-- "Perfil X" hace 5 años cuando incluía A, B, C y hoy ese mismo perfil incluye
-- A, B, C, D, E, F, los registros antiguos terminan asumiendo que Raúl se
-- tomó D, E, F (que no existían cuando le tocó). Esto distorsiona auditorías,
-- reportes, facturación retroactiva y reclamos.
--
-- Solución (siguiendo el patrón del sistema legacy del compañero): cada vez
-- que un perfil queda comprometido en una cotización o asignado a un paciente,
-- congelamos un JSON con la definición exacta del perfil en ese momento
-- (categorías, exámenes, nombre, código legacy, reglas, etc.).
--
-- Dos snapshots:
--   1. cotizacion_items.examenes_snapshot_json: la definición del perfil tal
--      como existía cuando se creó la cotización (sirve también para
--      facturación). Estructura idéntica a la del JSON `perfil` legacy:
--      [{id, id_parent, idCola, datos: [{id: [{codigo, nombre, ingreso, anual, retiro, ...}]}]}]
--
--   2. pedido_pacientes.examenes_snapshot_json: la lista exacta de exámenes
--      que quedó asignada a ese paciente en concreto, con id, código legacy
--      y nombre. Equivalente a paciente_examen_asignado pero inmutable y
--      sin depender de FKs (sobrevive aunque se borre el examen del catálogo).
--
-- Ambas columnas son JSON nullable: las cotizaciones / pacientes existentes
-- siguen funcionando sin snapshot, y el snapshot se rellena en nuevas
-- escrituras.
--
-- Idempotente: usa IF NOT EXISTS donde sea posible.
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1) Snapshot a nivel de cotizacion_items (líneas de cotización tipo PERFIL)
-- -----------------------------------------------------------------------------
-- Sólo se llena cuando tipo_item = 'PERFIL'. Para 'EXAMEN' queda NULL.
-- Estructura sugerida (objeto, no array, para distinguirlo de un perfil-list):
-- {
--   "perfil_id": 123,
--   "perfil_nombre": "OPERARIOS DE PRODUCCIÓN",
--   "perfil_tipo": "PERFIL",                     -- PERFIL | ADICIONAL
--   "tipo_emo": "PREOC",                          -- PREOC | ANUAL | RETIRO | VISITA
--   "snapshot_at": "2026-05-07T15:23:00Z",
--   "categorias": [
--     {
--       "id": "TRIAJE",
--       "id_cola": "T1",
--       "examenes": [
--         { "examen_id": 42, "codigo_legacy": 417, "nombre": "TRIAJE...",
--           "sexo_aplicable": "AMBOS", "edad_minima": null, "edad_maxima": null,
--           "es_condicional": 0 }
--       ]
--     }
--   ]
-- }

ALTER TABLE `cotizacion_items`
  ADD COLUMN `examenes_snapshot_json` json DEFAULT NULL
  COMMENT 'Snapshot inmutable del perfil al momento de la cotización (sólo para tipo_item=PERFIL). Preserva los exámenes exactos aunque luego cambie la definición del perfil.'
  AFTER `subtotal`;

-- -----------------------------------------------------------------------------
-- 2) Snapshot a nivel de pedido_pacientes
-- -----------------------------------------------------------------------------
-- Lista plana de los exámenes efectivamente tomados/asignados a ese paciente
-- (post-filtros de sexo, edad, condicional). Estructura:
-- {
--   "snapshot_at": "2026-05-07T15:23:00Z",
--   "perfil_id": 123,
--   "perfil_nombre": "OPERARIOS",
--   "tipo_emo": "PREOC",
--   "examenes": [
--     { "examen_id": 42, "codigo_legacy": 417, "nombre": "TRIAJE...",
--       "categoria_nombre": "TRIAJE", "categoria_id_cola": "T1",
--       "origen": "perfil"  -- perfil | manual
--     }
--   ]
-- }
--
-- Nota: paciente_examen_asignado se mantiene tal cual (relacional + actual).
-- El snapshot es la versión congelada para histórico/auditoría.

ALTER TABLE `pedido_pacientes`
  ADD COLUMN `examenes_snapshot_json` json DEFAULT NULL
  COMMENT 'Snapshot inmutable de los exámenes que quedaron asignados al paciente cuando se le aplicó el perfil/EMO. Sobrevive cambios de catálogo.'
  AFTER `perfiles_aplicados_json`;

-- -----------------------------------------------------------------------------
-- 3) Verificación post-migración
-- -----------------------------------------------------------------------------
SELECT
  'cotizacion_items.examenes_snapshot_json'   AS columna,
  COUNT(*)                                     AS filas_existentes,
  SUM(examenes_snapshot_json IS NOT NULL)      AS con_snapshot
  FROM cotizacion_items
UNION ALL
SELECT
  'pedido_pacientes.examenes_snapshot_json',
  COUNT(*),
  SUM(examenes_snapshot_json IS NOT NULL)
  FROM pedido_pacientes;
