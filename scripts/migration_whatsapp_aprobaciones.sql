-- =============================================================================
-- TuSalud — Aprobación/rechazo de cotizaciones por WhatsApp
-- =============================================================================
-- Cuando el CLIENTE sube un pedido con cotización, el sistema envía el detalle
-- (Excel adjunto) al WhatsApp del vendedor asignado (o al manager configurado
-- como fallback). El vendedor responde con una palabra clave (APROBAR / RECHAZAR
-- y opcionalmente un motivo) y el bot actualiza el estado de la cotización en
-- la base de datos.
--
-- Esta tabla:
--   1. Mapea cada cotización con el teléfono al que se envió la solicitud,
--      para que cuando llegue un mensaje al webhook podamos identificar
--      qué cotización está respondiendo.
--   2. Implementa una máquina de estados conversacional pequeña (PENDIENTE,
--      ESPERANDO_MOTIVO_RECHAZO, APROBADA, RECHAZADA, CANCELADA).
--   3. Sirve de auditoría: cuándo se envió, cuándo y qué respondió, motivo.
--
-- La fila se inserta cuando disparamos el envío del WhatsApp y se actualiza
-- al recibir respuestas en /api/whatsapp/webhook.
-- =============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `whatsapp_aprobaciones` (
  `id` int NOT NULL AUTO_INCREMENT,

  -- Cotización que se está aprobando/rechazando.
  `cotizacion_id` int NOT NULL,

  -- Teléfono destinatario en formato E.164 (+51…) o como lo guarde el SDK.
  -- Permite identificar la cotización pendiente cuando llega una respuesta.
  `destinatario_telefono` varchar(30) NOT NULL,

  -- Usuario destinatario (vendedor o manager). NULL si solo se conoce el teléfono
  -- (ej. fallback manager configurado por env, sin row en `usuarios`).
  `destinatario_usuario_id` int DEFAULT NULL,
  `destinatario_rol` varchar(30) DEFAULT NULL COMMENT 'vendedor | manager',

  -- Snapshot mínimo para auditoría (la cotización puede mutar después).
  `numero_cotizacion` varchar(50) DEFAULT NULL,

  -- Máquina de estados conversacional:
  --   PENDIENTE                  → enviada, esperando palabra clave.
  --   ESPERANDO_MOTIVO_RECHAZO   → vendedor escribió RECHAZAR; aguarda motivo.
  --   APROBADA / RECHAZADA       → terminal.
  --   CANCELADA                  → se invalidó (p.ej. cotización editada
  --                                 después, otro canal aprobó, etc.).
  `estado` enum(
    'PENDIENTE',
    'ESPERANDO_MOTIVO_RECHAZO',
    'APROBADA',
    'RECHAZADA',
    'CANCELADA'
  ) NOT NULL DEFAULT 'PENDIENTE',

  -- Motivo libre cuando el vendedor rechaza (segundo mensaje tras RECHAZAR).
  `motivo_rechazo` text DEFAULT NULL,

  -- SID/ID del proveedor (Twilio, Meta, …) para correlación con sus logs.
  `mensaje_enviado_sid` varchar(120) DEFAULT NULL,

  -- Token aleatorio para servir el XLSX por URL pública (Twilio lo descarga).
  -- 32 bytes hex = 64 chars; lo dejamos a 80 para holgura.
  `token_archivo` varchar(80) DEFAULT NULL,
  `token_archivo_expira_en` timestamp NULL DEFAULT NULL,

  `enviado_at` timestamp NULL DEFAULT NULL,
  `respondido_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  -- Lookup principal del webhook: "¿este número tiene una conversación abierta?".
  -- Filtraremos por (destinatario_telefono, estado IN PENDIENTE/ESPERANDO_…),
  -- tomando la más reciente. El índice cubre ambos.
  KEY `idx_wa_tel_estado` (`destinatario_telefono`, `estado`, `created_at`),

  -- Búsquedas por cotización (p.ej. cancelar pendientes al editar una cot).
  KEY `idx_wa_cotizacion` (`cotizacion_id`),

  -- Lookup directo del XLSX por token público.
  UNIQUE KEY `uq_wa_token_archivo` (`token_archivo`),

  CONSTRAINT `fk_wa_cotizacion`
    FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`)
    ON DELETE CASCADE,

  CONSTRAINT `fk_wa_usuario`
    FOREIGN KEY (`destinatario_usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Aprobaciones de cotizaciones vía WhatsApp (Twilio / Meta).';
