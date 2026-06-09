-- Vincula solicitudes de agregar exámenes con su cotización complementaria del cliente.
ALTER TABLE `solicitudes_agregar`
  ADD COLUMN `cotizacion_complementaria_id` int DEFAULT NULL AFTER `mensaje_rechazo`,
  ADD KEY `idx_solicitudes_cotizacion_complementaria` (`cotizacion_complementaria_id`),
  ADD CONSTRAINT `solicitudes_agregar_ibfk_cot_comp`
    FOREIGN KEY (`cotizacion_complementaria_id`) REFERENCES `cotizaciones` (`id`) ON DELETE SET NULL;
