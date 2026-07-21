-- Condicionales flexibles por examen dentro de un perfil EMO.
-- Idempotente.

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'emo_perfil_examenes'
    AND COLUMN_NAME = 'condiciones_json'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE emo_perfil_examenes ADD COLUMN condiciones_json JSON NULL COMMENT ''Lista de códigos: ["MUJER","EMBARAZO","EDAD_GE_45",...]''',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
