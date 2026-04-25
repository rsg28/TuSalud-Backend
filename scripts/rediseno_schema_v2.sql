-- =============================================================================
-- TuSalud — Migración al schema v2 (Fase 1)
-- =============================================================================
-- Aplica el rediseño del modelo de perfiles/exámenes/pacientes sobre una base de
-- datos existente. Asume que los datos transaccionales (pedidos, cotizaciones,
-- facturas, pacientes) ya están vacíos o son descartables. Los datos de empresas,
-- usuarios y sedes SE PRESERVAN.
--
-- Cambios:
--   1. Drop tabla `usuario_empresa` (redundante con `usuarios.empresa_id`).
--   2. `usuarios`: agregar rol 'paciente' al ENUM, agregar columna `dni`.
--   3. `sedes`: agregar `codigo_legacy` (para guardar clugar del legacy).
--   4. `empresas`: agregar UNIQUE en `ruc` (previa limpieza de duplicados).
--   5. Reset completo del catálogo EMO (examenes, categorías, perfiles, precios,
--      asignaciones) para repoblar desde el CSV legacy sin residuos.
--   6. Recrear `emo_perfiles`, `examenes`, `emo_categorias`, `emo_perfil_precio`,
--      `emo_perfil_examenes` con la estructura nueva.
--   7. Crear tabla nueva `emo_perfil_asignacion`.
--   8. Agregar columnas de ficha clínica a `pedido_pacientes` y a
--      `solicitud_agregar_paciente`.
--
-- Uso:
--   mysql -u USER -p DB < rediseno_schema_v2.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- PASO 1 — Drop de tabla obsoleta
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuario_empresa`;

-- -----------------------------------------------------------------------------
-- PASO 2 — usuarios: agregar rol 'paciente' y columna dni
-- -----------------------------------------------------------------------------
ALTER TABLE `usuarios`
  MODIFY COLUMN `rol` enum('vendedor','cliente','manager','paciente') NOT NULL;

-- Idempotente: sólo agrega `dni` si no existe.
SET @has_dni := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'dni'
);
SET @sql := IF(@has_dni = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `dni` varchar(20) DEFAULT NULL AFTER `telefono`, ADD KEY `idx_usuarios_dni` (`dni`)',
  'SELECT "usuarios.dni ya existe, skip" AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- PASO 3 — sedes: agregar codigo_legacy
-- -----------------------------------------------------------------------------
SET @has_codlegacy := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sedes' AND COLUMN_NAME = 'codigo_legacy'
);
SET @sql := IF(@has_codlegacy = 0,
  'ALTER TABLE `sedes` ADD COLUMN `codigo_legacy` int DEFAULT NULL COMMENT ''Valor clugar legacy'' AFTER `nombre`, ADD UNIQUE KEY `uq_sedes_codigo_legacy` (`codigo_legacy`)',
  'SELECT "sedes.codigo_legacy ya existe, skip" AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- PASO 4 — empresas: UNIQUE en ruc (limpiando duplicados vacíos primero)
-- -----------------------------------------------------------------------------
-- Si hay RUCs vacíos duplicados, los dejamos como NULL (MySQL permite NULL
-- múltiples en UNIQUE).
UPDATE `empresas` SET `ruc` = NULL WHERE `ruc` = '' OR `ruc` IS NULL;

SET @has_uq_ruc := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empresas' AND INDEX_NAME = 'uq_empresas_ruc'
);
SET @sql := IF(@has_uq_ruc = 0,
  'ALTER TABLE `empresas` ADD UNIQUE KEY `uq_empresas_ruc` (`ruc`)',
  'SELECT "empresas.uq_empresas_ruc ya existe, skip" AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- PASO 5 — Reset y reconstrucción del catálogo EMO
-- Se descartan TODOS los datos de: emo_perfil_precio, emo_perfil_examenes,
-- emo_perfiles, examenes, examen_precio, emo_categorias, emo_perfil_asignacion.
-- También se limpian refs en pedido_pacientes.emo_perfil_id para evitar FK rotas.
-- -----------------------------------------------------------------------------
UPDATE `pedido_pacientes` SET `emo_perfil_id` = NULL WHERE `emo_perfil_id` IS NOT NULL;

DROP TABLE IF EXISTS `emo_perfil_asignacion`;
DROP TABLE IF EXISTS `emo_perfil_precio`;
DROP TABLE IF EXISTS `emo_perfil_examenes`;
DROP TABLE IF EXISTS `emo_perfiles`;
DROP TABLE IF EXISTS `examen_precio`;
DROP TABLE IF EXISTS `examenes`;
DROP TABLE IF EXISTS `emo_categorias`;

CREATE TABLE `emo_categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `id_cola` varchar(50) NOT NULL COMMENT 'Código corto legacy: T1, EVLAB4, EVRX5, ...',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emo_categorias_id_cola` (`id_cola`),
  KEY `idx_emo_categorias_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `examenes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `identificador` int DEFAULT NULL COMMENT 'codigo legacy del JSON (417, 419, ...)',
  `nombre` varchar(255) NOT NULL,
  `categoria_id` int DEFAULT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_examenes_identificador` (`identificador`),
  KEY `idx_examenes_categoria_id` (`categoria_id`),
  CONSTRAINT `fk_examenes_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `emo_categorias` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `examen_precio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `examen_id` int NOT NULL,
  `sede_id` int DEFAULT NULL COMMENT 'NULL = precio base global',
  `precio` decimal(12,2) NOT NULL,
  `vigente_desde` date DEFAULT (curdate()),
  `vigente_hasta` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_examen_precio` (`examen_id`,`sede_id`),
  KEY `sede_id` (`sede_id`),
  CONSTRAINT `examen_precio_ibfk_1` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `examen_precio_ibfk_2` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `emo_perfiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text,
  `tipo` enum('PERFIL','ADICIONAL') NOT NULL DEFAULT 'PERFIL',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_emo_perfiles_nombre` (`nombre`),
  KEY `idx_emo_perfiles_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `emo_perfil_asignacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `perfil_id` int NOT NULL,
  `empresa_id` int NOT NULL,
  `sede_id` int DEFAULT NULL COMMENT 'NULL = aplica a cualquier sede',
  `clugar_legacy` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emo_perfil_asignacion` (`perfil_id`,`empresa_id`,`sede_id`),
  KEY `idx_emo_perfil_asig_empresa` (`empresa_id`),
  KEY `idx_emo_perfil_asig_sede` (`sede_id`),
  CONSTRAINT `fk_emo_asig_perfil`  FOREIGN KEY (`perfil_id`)  REFERENCES `emo_perfiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_emo_asig_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`)     ON DELETE CASCADE,
  CONSTRAINT `fk_emo_asig_sede`    FOREIGN KEY (`sede_id`)    REFERENCES `sedes` (`id`)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `emo_perfil_examenes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `perfil_id` int NOT NULL,
  `tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') NOT NULL,
  `examen_id` int NOT NULL,
  `sexo_aplicable` enum('AMBOS','HOMBRE','MUJER') NOT NULL DEFAULT 'AMBOS',
  `edad_minima` int DEFAULT NULL,
  `edad_maxima` int DEFAULT NULL,
  `es_condicional` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emo_perfil_examenes` (`perfil_id`,`tipo_emo`,`examen_id`),
  KEY `examen_id` (`examen_id`),
  CONSTRAINT `emo_perfil_examenes_ibfk_1` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `emo_perfil_examenes_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `emo_perfil_precio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `perfil_id` int NOT NULL,
  `empresa_id` int DEFAULT NULL,
  `sede_id` int DEFAULT NULL,
  `tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') NOT NULL,
  `precio` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emo_perfil_precio` (`perfil_id`,`empresa_id`,`sede_id`,`tipo_emo`),
  KEY `idx_emo_perfil_precio_empresa` (`empresa_id`),
  KEY `idx_emo_perfil_precio_sede` (`sede_id`),
  CONSTRAINT `fk_emo_perfil_precio_perfil`  FOREIGN KEY (`perfil_id`)  REFERENCES `emo_perfiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_emo_perfil_precio_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`)     ON DELETE CASCADE,
  CONSTRAINT `fk_emo_perfil_precio_sede`    FOREIGN KEY (`sede_id`)    REFERENCES `sedes` (`id`)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- PASO 6 — pedido_pacientes: agregar campos de ficha clínica (idempotente)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `tmp_add_paciente_col`;
DELIMITER $$
CREATE PROCEDURE `tmp_add_paciente_col`(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl VARCHAR(512))
BEGIN
  DECLARE exists_col INT;
  SELECT COUNT(*) INTO exists_col FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col;
  IF exists_col = 0 THEN
    SET @s := CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL tmp_add_paciente_col('pedido_pacientes', 'fecha_nacimiento',             '`fecha_nacimiento` date DEFAULT NULL AFTER `nombre_completo`');
CALL tmp_add_paciente_col('pedido_pacientes', 'sexo',                         '`sexo` enum(''HOMBRE'',''MUJER'') DEFAULT NULL AFTER `fecha_nacimiento`');
CALL tmp_add_paciente_col('pedido_pacientes', 'email',                        '`email` varchar(255) DEFAULT NULL AFTER `sexo`');
CALL tmp_add_paciente_col('pedido_pacientes', 'telefono',                     '`telefono` varchar(30) DEFAULT NULL AFTER `email`');
CALL tmp_add_paciente_col('pedido_pacientes', 'direccion',                    '`direccion` varchar(500) DEFAULT NULL AFTER `telefono`');
CALL tmp_add_paciente_col('pedido_pacientes', 'estado_civil',                 '`estado_civil` varchar(30) DEFAULT NULL AFTER `direccion`');
CALL tmp_add_paciente_col('pedido_pacientes', 'contacto_emergencia_nombre',   '`contacto_emergencia_nombre` varchar(200) DEFAULT NULL AFTER `estado_civil`');
CALL tmp_add_paciente_col('pedido_pacientes', 'contacto_emergencia_telefono', '`contacto_emergencia_telefono` varchar(30) DEFAULT NULL AFTER `contacto_emergencia_nombre`');

-- Índice auxiliar para buscar pacientes por DNI (útil para el rol paciente futuro)
SET @has_dni_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pedido_pacientes' AND INDEX_NAME = 'idx_pedido_pacientes_dni'
);
SET @sql := IF(@has_dni_idx = 0,
  'ALTER TABLE `pedido_pacientes` ADD KEY `idx_pedido_pacientes_dni` (`dni`)',
  'SELECT "pedido_pacientes.idx_pedido_pacientes_dni ya existe, skip" AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CALL tmp_add_paciente_col('solicitud_agregar_paciente', 'fecha_nacimiento',             '`fecha_nacimiento` date DEFAULT NULL AFTER `nombre_completo`');
CALL tmp_add_paciente_col('solicitud_agregar_paciente', 'sexo',                         '`sexo` enum(''HOMBRE'',''MUJER'') DEFAULT NULL AFTER `fecha_nacimiento`');
CALL tmp_add_paciente_col('solicitud_agregar_paciente', 'email',                        '`email` varchar(255) DEFAULT NULL AFTER `sexo`');
CALL tmp_add_paciente_col('solicitud_agregar_paciente', 'telefono',                     '`telefono` varchar(30) DEFAULT NULL AFTER `email`');
CALL tmp_add_paciente_col('solicitud_agregar_paciente', 'direccion',                    '`direccion` varchar(500) DEFAULT NULL AFTER `telefono`');
CALL tmp_add_paciente_col('solicitud_agregar_paciente', 'estado_civil',                 '`estado_civil` varchar(30) DEFAULT NULL AFTER `direccion`');
CALL tmp_add_paciente_col('solicitud_agregar_paciente', 'contacto_emergencia_nombre',   '`contacto_emergencia_nombre` varchar(200) DEFAULT NULL AFTER `estado_civil`');
CALL tmp_add_paciente_col('solicitud_agregar_paciente', 'contacto_emergencia_telefono', '`contacto_emergencia_telefono` varchar(30) DEFAULT NULL AFTER `contacto_emergencia_nombre`');

DROP PROCEDURE IF EXISTS `tmp_add_paciente_col`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- Verificación final
-- -----------------------------------------------------------------------------
SELECT 'Migración v2 aplicada. Estado de tablas clave:' AS info;
SELECT TABLE_NAME, TABLE_ROWS
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN (
      'emo_categorias','examenes','emo_perfiles','emo_perfil_asignacion',
      'emo_perfil_examenes','emo_perfil_precio','pedido_pacientes',
      'solicitud_agregar_paciente','usuarios'
    )
  ORDER BY TABLE_NAME;
