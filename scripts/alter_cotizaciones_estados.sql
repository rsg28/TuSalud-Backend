-- =============================================================================
-- Extiende el ENUM de estado en cotizaciones para soportar:
-- Recibida (por cliente / aprobada o rechazada por manager), Borrador, Enviada (al cliente / al manager)
-- =============================================================================

-- Añadir nuevos valores al ENUM manteniendo los existentes para compatibilidad.
-- Valores actuales: BORRADOR, ENVIADA, APROBADA, RECHAZADA
-- Nuevos: ENVIADA_AL_CLIENTE, ENVIADA_AL_MANAGER, RECIBIDA_POR_CLIENTE
-- (ENVIADA se mantiene; los nuevos permiten distinguir destino/envío)

ALTER TABLE cotizaciones
  MODIFY COLUMN estado ENUM(
    'BORRADOR',
    'ENVIADA',
    'ENVIADA_AL_CLIENTE',
    'ENVIADA_AL_MANAGER',
    'RECIBIDA_POR_CLIENTE',
    'APROBADA',
    'RECHAZADA'
  ) NOT NULL DEFAULT 'BORRADOR';

-- Opcional: migrar filas existentes ENVIADA a ENVIADA_AL_CLIENTE si se desea mayor claridad
-- UPDATE cotizaciones SET estado = 'ENVIADA_AL_CLIENTE' WHERE estado = 'ENVIADA';
