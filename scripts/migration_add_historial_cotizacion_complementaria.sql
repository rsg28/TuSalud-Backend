-- Registra en historial_pedido la creación de cotizaciones complementarias
-- (p. ej. por paciente ausente / exámenes no realizados).
ALTER TABLE historial_pedido
  MODIFY COLUMN `tipo_evento` enum(
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
    'PEDIDO_COMPLETADO',
    'WHATSAPP_COTIZACION_ENVIADA',
    'COTIZACION_COMPLEMENTARIA'
  ) NOT NULL;
