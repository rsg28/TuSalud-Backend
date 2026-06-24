-- Snapshot wizard v2 (pacientes → perfiles → exámenes + adicionales) para cotizaciones complementarias.
ALTER TABLE `cotizaciones`
  ADD COLUMN `wizard_snapshot_json` json DEFAULT NULL
  COMMENT 'Snapshot wizard v2 de la cotización complementaria (solo ítems nuevos solicitados).'
  AFTER `notas_manager`;
