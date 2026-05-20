-- Añade trazabilidad de cada línea de factura a su cotización origen.
-- Permite agrupar items por cotización (principal o complementaria) en la vista de factura.
-- Las facturas existentes quedarán con NULL (no rompe nada; el frontend lo trata como "sin agrupar").

ALTER TABLE factura_detalle
  ADD COLUMN cotizacion_id INT NULL AFTER factura_id,
  ADD KEY idx_factura_detalle_cotizacion (cotizacion_id),
  ADD CONSTRAINT factura_detalle_ibfk_4
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones (id) ON DELETE SET NULL;
