-- =============================================================================
-- Migración: EMO perfiles + metadata en pedido_pacientes
-- =============================================================================
-- Recomendación: ejecutar una vez en el entorno existente.

-- 1) Tablas EMO
CREATE TABLE IF NOT EXISTS emo_perfiles (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(255) NOT NULL UNIQUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emo_tipos_evaluacion (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  ENUM('PREOC','ANUAL','RETIRO','VISITA') NOT NULL UNIQUE
);

INSERT INTO emo_tipos_evaluacion (nombre)
VALUES ('PREOC'), ('ANUAL'), ('RETIRO'), ('VISITA')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

CREATE TABLE IF NOT EXISTS emo_perfil_examenes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  perfil_id  INT NOT NULL,
  tipo_emo   ENUM('PREOC','ANUAL','RETIRO','VISITA') NOT NULL,
  examen_id  INT NOT NULL,
  UNIQUE(perfil_id, tipo_emo, examen_id),
  FOREIGN KEY (perfil_id) REFERENCES emo_perfiles(id) ON DELETE CASCADE,
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE
);

-- 2) Columnas EMO en pedido_pacientes
ALTER TABLE pedido_pacientes
  ADD COLUMN emo_tipo ENUM('PREOC','ANUAL','RETIRO','VISITA') NULL,
  ADD COLUMN emo_perfil_id INT NULL;

-- 3) Foreign key para emo_perfil_id (si ya existía, esta línea puede fallar)
ALTER TABLE pedido_pacientes
  ADD CONSTRAINT fk_pedido_pacientes_emo_perfil_id
  FOREIGN KEY (emo_perfil_id) REFERENCES emo_perfiles(id) ON DELETE SET NULL;

