-- =============================================================================
-- Actualiza el ENUM de estado en cotizaciones:
-- - Quitar RECIBIDA_POR_CLIENTE (no se usa).
-- - Añadir APROBADA_POR_MANAGER (manager aprobó; vendedor puede enviar al cliente).
-- El manager solo aprueba, no rechaza.
-- =============================================================================

-- Migrar filas que tengan RECIBIDA_POR_CLIENTE a ENVIADA_AL_CLIENTE antes de cambiar el ENUM
UPDATE cotizaciones SET estado = 'ENVIADA_AL_CLIENTE' WHERE estado = 'RECIBIDA_POR_CLIENTE';

ALTER TABLE cotizaciones
  MODIFY COLUMN estado ENUM(
    'BORRADOR',
    'ENVIADA',
    'ENVIADA_AL_CLIENTE',
    'ENVIADA_AL_MANAGER',
    'APROBADA_POR_MANAGER',
    'APROBADA',
    'RECHAZADA'
  ) NOT NULL DEFAULT 'BORRADOR';
