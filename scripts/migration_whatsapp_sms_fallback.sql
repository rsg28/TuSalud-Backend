-- =============================================================================
-- TuSalud — Fallback a SMS cuando WhatsApp no se entrega
-- =============================================================================
-- Si el destinatario no tiene internet (o no tiene WhatsApp activo), Twilio
-- marca el mensaje como `undelivered` o `failed`. En ese momento disparamos
-- un SMS de respaldo con solo texto (no se adjunta archivo).
--
-- Columnas que agregamos a `whatsapp_aprobaciones`:
--   - canal_envio              : por dónde se entregó realmente la solicitud.
--   - estado_entrega_whatsapp  : último estado reportado por Twilio para el WA.
--   - sms_enviado_sid          : SID del mensaje SMS de respaldo (si aplicó).
--   - sms_enviado_at           : cuándo se disparó el SMS.
--   - status_callback_token    : token aleatorio que Twilio incluye en cada
--                                 status callback; nos permite encontrar la
--                                 fila correcta sin confiar en `MessageSid`.
--                                 (Twilio sí manda el SID, pero los SIDs son
--                                 a veces difíciles de correlacionar cuando
--                                 hay reintentos; el token simplifica.)
-- =============================================================================

SET NAMES utf8mb4;

ALTER TABLE `whatsapp_aprobaciones`
  ADD COLUMN `canal_envio` enum('WHATSAPP','SMS','WHATSAPP_THEN_SMS')
      NOT NULL DEFAULT 'WHATSAPP' AFTER `estado`,
  ADD COLUMN `estado_entrega_whatsapp` varchar(30) DEFAULT NULL
      COMMENT 'Último estado reportado por el proveedor: sent, delivered, undelivered, failed, read.'
      AFTER `mensaje_enviado_sid`,
  ADD COLUMN `sms_enviado_sid` varchar(120) DEFAULT NULL AFTER `estado_entrega_whatsapp`,
  ADD COLUMN `sms_enviado_at` timestamp NULL DEFAULT NULL AFTER `sms_enviado_sid`,
  ADD COLUMN `status_callback_token` varchar(80) DEFAULT NULL AFTER `token_archivo_expira_en`,
  ADD UNIQUE KEY `uq_wa_status_token` (`status_callback_token`);
