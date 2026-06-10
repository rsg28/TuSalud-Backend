-- Metadata de perfil EMO en líneas de solicitud (para armar complementaria con agrupación).
ALTER TABLE `solicitud_agregar_examenes`
  ADD COLUMN `perfil_origen_id` int DEFAULT NULL AFTER `cantidad`,
  ADD COLUMN `perfil_origen_nombre` varchar(255) DEFAULT NULL AFTER `perfil_origen_id`,
  ADD COLUMN `perfil_origen_tipo_emo` varchar(20) DEFAULT NULL AFTER `perfil_origen_nombre`;
