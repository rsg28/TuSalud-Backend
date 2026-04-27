-- Base existente: añade JSON de perfiles EMO aplicados por paciente (import / nuevo pedido).
-- Ejecutar una vez si la tabla ya fue creada sin esta columna.
ALTER TABLE `pedido_pacientes`
  ADD COLUMN `perfiles_aplicados_json` json DEFAULT NULL
  COMMENT 'Perfiles catálogo aplicados por paciente [{emo_perfil_id, perfil_nombre, emo_tipo}]'
  AFTER `emo_perfil_id`;
