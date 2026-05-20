-- Añade el tipo de evento PEDIDO_COMPLETADO (POST /api/pedidos/:id/completar).
-- Ejecutar en RDS/MySQL antes de usar "marcar pedido completado" si la tabla aún no lo incluye.
-- Nota: en MySQL hay que repetir todos los valores del ENUM al modificar la columna.

ALTER TABLE historial_pedido
  MODIFY COLUMN tipo_evento ENUM(
    'CREACION',
    'COTIZACION_ENVIADA',
    'COTIZACION_APROBADA',
    'COTIZACION_RECHAZADA',
    'SOLICITUD_MANAGER',
    'PRECIO_APROBADO',
    'FACTURA_EMITIDA',
    'FACTURA_ANULADA',
    'FACTURA_ENVIADA_CLIENTE',
    'PAGO_RECIBIDO',
    'COTIZACION_ELIMINADA',
    'PEDIDO_COMPLETADO'
  ) NOT NULL;
