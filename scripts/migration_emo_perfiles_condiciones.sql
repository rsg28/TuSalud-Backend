-- Agrega condicionales al catálogo de perfiles EMO.
--
-- `condiciones_json` es OPCIONAL (`NULL` = perfil sin condicional, aplica a todos).
-- Estructura esperada: { "codigos": [ "MUJER" | "HOMBRE" | "EDAD_GE_45" | ... ], "nota": string | null }.
-- Se guardan como *atributos del perfil* del catálogo (no se re-infieren del nombre).
-- Al aplicar un perfil a un paciente, las condicionales se COPIAN desde este JSON al
-- snapshot del pedido/cotización (que ya tiene su propia columna `condiciones_firma`).
ALTER TABLE `emo_perfiles`
  ADD COLUMN `condiciones_json` json DEFAULT NULL
  COMMENT 'Condicionales del perfil del catálogo (sexo/edad/clínico + nota).'
  AFTER `tipo`;
