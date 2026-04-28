-- =============================================================================
-- Grupos empresariales y visibilidad de perfiles
-- =============================================================================
-- Objetivos:
--   1. Crear entidad `grupos_empresariales` (un grupo agrupa empresas para
--      DEFINIR a qué perfiles tienen acceso; NO se relaciona con pedidos).
--   2. Relación N:N entre empresa y grupo (`empresa_grupo`).
--   3. Migrar la columna textual `empresas.grupo_empresarial` (si existe) a la
--      nueva tabla y eliminarla.
--   4. Añadir `visibilidad` a `emo_perfiles` (GLOBAL vs PRIVADO).
--   5. Crear `emo_perfil_grupo_asignacion` (perfil ↔ grupo).
--      `emo_perfil_asignacion` (perfil ↔ empresa) ya existe.
--
-- Reglas finales:
--   - Perfil GLOBAL  → visible para cualquier empresa.
--   - Perfil PRIVADO → visible para una empresa si:
--                          (a) hay fila en emo_perfil_asignacion(perfil, empresa)
--                          o
--                          (b) la empresa pertenece a algún grupo G y existe
--                              fila en emo_perfil_grupo_asignacion(perfil, G).
-- =============================================================================

-- 1) Tabla de grupos empresariales --------------------------------------------
CREATE TABLE IF NOT EXISTS `grupos_empresariales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_grupos_empresariales_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2) Relación N:N empresa ↔ grupo --------------------------------------------
CREATE TABLE IF NOT EXISTS `empresa_grupo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `grupo_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_empresa_grupo` (`empresa_id`,`grupo_id`),
  KEY `idx_empresa_grupo_grupo` (`grupo_id`),
  CONSTRAINT `fk_empresa_grupo_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_empresa_grupo_grupo`   FOREIGN KEY (`grupo_id`)   REFERENCES `grupos_empresariales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3) Migrar valores existentes de la columna textual grupo_empresarial -------
--    Si la columna no existe en tu BD, los siguientes pasos no harán nada
--    útil pero tampoco fallarán (los SELECT contra information_schema garantizan
--    que solo se ejecutan cuando la columna existe).
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'empresas'
     AND COLUMN_NAME  = 'grupo_empresarial'
);

SET @stmt := IF(@col_exists > 0,
  'INSERT IGNORE INTO grupos_empresariales (nombre)
     SELECT DISTINCT TRIM(grupo_empresarial)
       FROM empresas
      WHERE grupo_empresarial IS NOT NULL AND TRIM(grupo_empresarial) <> ''''
  ',
  'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(@col_exists > 0,
  'INSERT IGNORE INTO empresa_grupo (empresa_id, grupo_id)
     SELECT e.id, g.id
       FROM empresas e
       JOIN grupos_empresariales g ON g.nombre = TRIM(e.grupo_empresarial)
      WHERE e.grupo_empresarial IS NOT NULL AND TRIM(e.grupo_empresarial) <> ''''
  ',
  'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(@col_exists > 0,
  'ALTER TABLE empresas DROP COLUMN grupo_empresarial',
  'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 4) Visibilidad en emo_perfiles ---------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'emo_perfiles'
     AND COLUMN_NAME  = 'visibilidad'
);
SET @stmt := IF(@col_exists = 0,
  "ALTER TABLE emo_perfiles
     ADD COLUMN visibilidad ENUM('GLOBAL','PRIVADO') NOT NULL DEFAULT 'GLOBAL'
       COMMENT 'GLOBAL = visible para cualquier empresa. PRIVADO = solo empresas/grupos asignados.'
     AFTER tipo",
  'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 5) Asignación de perfiles a grupos -----------------------------------------
CREATE TABLE IF NOT EXISTS `emo_perfil_grupo_asignacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `perfil_id` int NOT NULL,
  `grupo_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emo_perfil_grupo_asignacion` (`perfil_id`,`grupo_id`),
  KEY `idx_emo_perfil_grupo_asig_grupo` (`grupo_id`),
  CONSTRAINT `fk_emo_perfil_grupo_asig_perfil` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_emo_perfil_grupo_asig_grupo`  FOREIGN KEY (`grupo_id`)  REFERENCES `grupos_empresariales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
