-- =============================================================================
-- TuSalud — Esquema MySQL 8+ (solo DDL, sin datos)
-- Estado: Fase 1 + Fase 2 aplicadas.
--   Fase 1: perfiles multi-empresa, reglas condicionales, categorías legacy,
--           tipo PERFIL/ADICIONAL, datos demográficos del paciente.
--   Fase 2: cotizacion_items / pedido_items / factura_detalle HÍBRIDOS:
--           cada línea puede ser un PERFIL completo (con tipo_emo) o un
--           EXAMEN suelto. tipo_item discrimina; CHECK garantiza coherencia.
-- Recrear desde cero: mysql < tusalud_schema_mysql.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS historial_pedido;
DROP TABLE IF EXISTS solicitud_agregar_examenes;
DROP TABLE IF EXISTS solicitud_agregar_paciente;
DROP TABLE IF EXISTS solicitudes_agregar;
DROP TABLE IF EXISTS paciente_examen_completado;
DROP TABLE IF EXISTS paciente_examen_asignado;
DROP TABLE IF EXISTS pedido_pacientes;
DROP TABLE IF EXISTS pedido_items;
DROP TABLE IF EXISTS pedido_examenes;
DROP TABLE IF EXISTS cotizacion_items;
DROP TABLE IF EXISTS factura_detalle;
DROP TABLE IF EXISTS factura_cotizacion;
DROP TABLE IF EXISTS facturas;
DROP TABLE IF EXISTS cotizaciones;
DROP TABLE IF EXISTS password_reset_codes;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS emo_perfil_precio;
DROP TABLE IF EXISTS emo_perfil_examenes;
DROP TABLE IF EXISTS emo_perfil_asignacion;
DROP TABLE IF EXISTS emo_tipos_evaluacion;
DROP TABLE IF EXISTS emo_perfiles;
DROP TABLE IF EXISTS examen_precio;
DROP TABLE IF EXISTS examenes;
DROP TABLE IF EXISTS emo_categorias;
DROP TABLE IF EXISTS usuario_empresa;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS empresas;
DROP TABLE IF EXISTS sedes;

-- -----------------------------------------------------------------------------
-- Empresas y sedes
-- -----------------------------------------------------------------------------
-- Las empresas son clientes (los que contratan EMO).
CREATE TABLE `empresas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) DEFAULT NULL,
  `ruc` varchar(20) DEFAULT NULL,
  `razon_social` varchar(255) NOT NULL,
  `tipo_persona` varchar(50) DEFAULT NULL,
  `tipo_documento` varchar(20) DEFAULT NULL,
  `dni` varchar(20) DEFAULT NULL,
  `ap_paterno` varchar(100) DEFAULT NULL,
  `ap_materno` varchar(100) DEFAULT NULL,
  `nombres_completos` varchar(255) DEFAULT NULL,
  `direccion` varchar(500) DEFAULT NULL,
  `celular` varchar(30) DEFAULT NULL,
  `contacto` varchar(200) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `actividad_empresa` varchar(200) DEFAULT NULL,
  `ubigeo` varchar(10) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `condicion` varchar(50) DEFAULT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `estado` varchar(30) DEFAULT 'ACTIVO',
  `nombre_responsable_pagos` varchar(200) DEFAULT NULL,
  `telefono_responsable_pagos` varchar(30) DEFAULT NULL,
  `correo_responsable_pagos` varchar(255) DEFAULT NULL,
  `direccion_oficina_pagos` varchar(500) DEFAULT NULL,
  `fecha_presentacion_facturas` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_empresas_ruc` (`ruc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Sedes internas de TuSalud (clínicas donde se atiende). Globales, no por empresa.
-- `codigo_legacy` preserva el valor de `clugar` del sistema antiguo (ej. 1, 3)
-- para trazabilidad mientras decidimos el mapeo definitivo.
CREATE TABLE `sedes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `codigo_legacy` int DEFAULT NULL COMMENT 'Valor clugar del sistema legacy',
  `activa` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sedes_codigo_legacy` (`codigo_legacy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Usuarios
-- -----------------------------------------------------------------------------
-- Roles:
--   vendedor / manager → usuarios internos de TuSalud, NO pertenecen a empresa.
--   cliente  → representa a una única empresa (usuarios.empresa_id NOT NULL).
--              Varios clientes pueden apuntar a la misma empresa (N:1).
--   paciente → futuro. Se vincula por DNI a pedido_pacientes.
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre_completo` varchar(200) NOT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `dni` varchar(20) DEFAULT NULL COMMENT 'Para rol paciente: match con pedido_pacientes.dni',
  `ruc` varchar(20) DEFAULT NULL,
  `tipo_ruc` varchar(20) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('HOMBRE','MUJER') DEFAULT NULL,
  `direccion` varchar(500) DEFAULT NULL,
  `rol` enum('vendedor','cliente','manager','paciente') NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `empresa_id` int DEFAULT NULL COMMENT 'Empresa del cliente (N:1). Solo para rol cliente; vendedor/manager/paciente = NULL.',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_usuario` (`nombre_usuario`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_usuarios_empresa` (`empresa_id`),
  KEY `idx_usuarios_dni` (`dni`),
  CONSTRAINT `fk_usuarios_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usuarios_chk_1` CHECK ((`tipo_ruc` in (_utf8mb4'NINGUNO',_utf8mb4'RUC10',_utf8mb4'RUC20')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `password_reset_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_prc_user_id` (`user_id`),
  KEY `idx_prc_expires_at` (`expires_at`),
  CONSTRAINT `fk_prc_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Catálogo de exámenes y categorías
-- -----------------------------------------------------------------------------
-- Categorías legacy (TRIAJE, LABORATORIO, RAYOS X, ...) con su id_cola (T1, EVLAB4, ...).
CREATE TABLE `emo_categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `id_cola` varchar(50) NOT NULL COMMENT 'Código corto legacy: T1, EVLAB4, EVRX5, ...',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emo_categorias_id_cola` (`id_cola`),
  KEY `idx_emo_categorias_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Catálogo global de exámenes.
-- `identificador` = código de negocio del sistema legacy (ej. 417, 424, ...).
-- Es único (un código → un examen), pero se guarda como columna separada del `id`
-- interno porque el código legacy puede no ser contiguo o cambiar en el futuro.
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

-- Precio base por examen y sede de TuSalud. Referencia para items sueltos de cotización.
CREATE TABLE `examen_precio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `examen_id` int NOT NULL,
  `sede_id` int DEFAULT NULL COMMENT 'NULL = precio base global (cualquier sede)',
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

-- -----------------------------------------------------------------------------
-- EMO: perfiles, asignaciones, exámenes del perfil, precios, tipos de evaluación
-- -----------------------------------------------------------------------------
-- Catálogo de perfiles (puede ser plantilla global o específico de empresas).
-- `tipo = PERFIL` → grupo principal de exámenes para un puesto.
-- `tipo = ADICIONAL` → grupo complementario que se suma por regla (ej. mayores de 40).
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

-- Asignación de un perfil a (empresa, sede). Un perfil sin filas aquí es plantilla global.
-- `clugar_legacy` preserva el valor original del legacy sin interpretarlo todavía.
CREATE TABLE `emo_perfil_asignacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `perfil_id` int NOT NULL,
  `empresa_id` int NOT NULL,
  `sede_id` int DEFAULT NULL COMMENT 'NULL = aplica a cualquier sede',
  `clugar_legacy` int DEFAULT NULL COMMENT 'Valor clugar del legacy (1, 3, ...) antes de mapear',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emo_perfil_asignacion` (`perfil_id`,`empresa_id`,`sede_id`),
  KEY `idx_emo_perfil_asig_empresa` (`empresa_id`),
  KEY `idx_emo_perfil_asig_sede` (`sede_id`),
  CONSTRAINT `fk_emo_asig_perfil`  FOREIGN KEY (`perfil_id`)  REFERENCES `emo_perfiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_emo_asig_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`)     ON DELETE CASCADE,
  CONSTRAINT `fk_emo_asig_sede`    FOREIGN KEY (`sede_id`)    REFERENCES `sedes` (`id`)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `emo_tipos_evaluacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` enum('PREOC','ANUAL','RETIRO','VISITA') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `emo_tipos_evaluacion` (`nombre`) VALUES ('PREOC'), ('ANUAL'), ('RETIRO'), ('VISITA');

-- Exámenes incluidos en un perfil (por tipo de EMO) + reglas condicionales.
-- Una fila define: "para el perfil X, en el EMO de tipo Y, el examen Z aplica según
-- estas reglas de sexo/edad/condicional".
CREATE TABLE `emo_perfil_examenes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `perfil_id` int NOT NULL,
  `tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') NOT NULL,
  `examen_id` int NOT NULL,
  `sexo_aplicable` enum('AMBOS','HOMBRE','MUJER') NOT NULL DEFAULT 'AMBOS',
  `edad_minima` int DEFAULT NULL COMMENT 'Edad mínima inclusiva (>=); NULL = sin límite',
  `edad_maxima` int DEFAULT NULL COMMENT 'Edad máxima inclusiva (<=); NULL = sin límite',
  `es_condicional` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag legacy CondicionalIngreso/Anual/Retiro',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emo_perfil_examenes` (`perfil_id`,`tipo_emo`,`examen_id`),
  KEY `examen_id` (`examen_id`),
  CONSTRAINT `emo_perfil_examenes_ibfk_1` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `emo_perfil_examenes_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Precio de un perfil (por tipo_emo). Dimensiones jerárquicas:
--   empresa_id NULL + sede_id NULL → precio base global (catálogo)
--   empresa_id SET  + sede_id NULL → precio negociado con ese cliente
--   empresa_id SET  + sede_id SET  → precio negociado para ese cliente en esa sede
-- NOTA: MySQL permite NULL en columnas UNIQUE (cada NULL cuenta como distinto),
-- por eso la unicidad efectiva se refuerza desde la aplicación al insertar.
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
-- Pedidos, cotizaciones, facturas
-- -----------------------------------------------------------------------------
-- Items HÍBRIDOS: cada línea puede ser
--   tipo_item = 'EXAMEN' → un examen suelto (examen_id NOT NULL, perfil_id NULL)
--   tipo_item = 'PERFIL' → un perfil completo con tipo_emo (perfil_id NOT NULL,
--                          tipo_emo NOT NULL, examen_id NULL). cantidad = nº de
--                          pacientes que recibirán ese perfil.
-- El CHECK garantiza que la fila sea coherente con su tipo_item.
-- `item_key` es una columna generada (VIRTUAL) que normaliza la "identidad"
-- de la línea para usarla en UNIQUE keys (porque MySQL no respeta UNIQUE
-- cuando una columna del índice es NULL).
CREATE TABLE `pedidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero_pedido` varchar(50) NOT NULL,
  `empresa_id` int NOT NULL,
  `sede_id` int NOT NULL,
  `vendedor_id` int DEFAULT NULL,
  `cliente_usuario_id` int DEFAULT NULL,
  `estado` enum('PENDIENTE','ESPERA_COTIZACION','LISTO_PARA_COTIZACION','FALTA_APROBAR_COTIZACION','COTIZACION_APROBADA','FALTA_PAGO_FACTURA','COTIZACION_RECHAZADA','FACTURADO','COMPLETADO','CANCELADO') NOT NULL DEFAULT 'ESPERA_COTIZACION',
  `total_empleados` int NOT NULL DEFAULT '0',
  `fecha_creacion` date NOT NULL DEFAULT (curdate()),
  `fecha_vencimiento` date DEFAULT NULL,
  `observaciones` text,
  `condiciones_pago` varchar(255) DEFAULT NULL,
  `cotizacion_principal_id` int DEFAULT NULL,
  `factura_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_pedido` (`numero_pedido`),
  KEY `sede_id` (`sede_id`),
  KEY `vendedor_id` (`vendedor_id`),
  KEY `cliente_usuario_id` (`cliente_usuario_id`),
  KEY `cotizacion_principal_id` (`cotizacion_principal_id`),
  KEY `factura_id` (`factura_id`),
  KEY `idx_pedidos_empresa` (`empresa_id`),
  KEY `idx_pedidos_estado` (`estado`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `pedidos_ibfk_2` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `pedidos_ibfk_3` FOREIGN KEY (`vendedor_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pedidos_ibfk_4` FOREIGN KEY (`cliente_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cotizaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero_cotizacion` varchar(50) NOT NULL,
  `pedido_id` int NOT NULL,
  `cotizacion_base_id` int DEFAULT NULL,
  `es_complementaria` tinyint(1) NOT NULL DEFAULT '0',
  `estado` enum('BORRADOR','ENVIADA','ENVIADA_AL_CLIENTE','ENVIADA_AL_MANAGER','APROBADA_POR_MANAGER','APROBADA','RECHAZADA') NOT NULL DEFAULT 'BORRADOR',
  `creador_tipo` enum('VENDEDOR','CLIENTE') NOT NULL DEFAULT 'VENDEDOR',
  `creador_id` int DEFAULT NULL,
  `total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `solicitud_manager_pendiente` tinyint(1) DEFAULT '0',
  `mensaje_rechazo` text,
  `fecha` date NOT NULL DEFAULT (curdate()),
  `fecha_envio` timestamp NULL DEFAULT NULL,
  `fecha_aprobacion` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notas_manager` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_cotizacion` (`numero_cotizacion`),
  KEY `cotizacion_base_id` (`cotizacion_base_id`),
  KEY `creador_id` (`creador_id`),
  KEY `idx_cotizaciones_pedido` (`pedido_id`),
  CONSTRAINT `cotizaciones_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cotizaciones_ibfk_2` FOREIGN KEY (`cotizacion_base_id`) REFERENCES `cotizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cotizaciones_ibfk_3` FOREIGN KEY (`creador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cotizaciones_chk_1` CHECK (((`es_complementaria` = 0) or (`cotizacion_base_id` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cotizacion_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int NOT NULL,
  `tipo_item` enum('PERFIL','EXAMEN') NOT NULL DEFAULT 'EXAMEN',
  `perfil_id` int DEFAULT NULL,
  `tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') DEFAULT NULL,
  `examen_id` int DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `cantidad` int NOT NULL,
  `precio_base` decimal(12,2) NOT NULL,
  `precio_final` decimal(12,2) NOT NULL,
  `variacion_pct` decimal(8,2) DEFAULT '0.00',
  `subtotal` decimal(14,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cot_items_cotizacion` (`cotizacion_id`),
  KEY `idx_cot_items_perfil` (`perfil_id`),
  KEY `idx_cot_items_examen` (`examen_id`),
  CONSTRAINT `cotizacion_items_ibfk_1` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cotizacion_items_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `cotizacion_items_ibfk_3` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `cotizacion_items_chk_cant` CHECK ((`cantidad` > 0)),
  CONSTRAINT `cotizacion_items_chk_tipo` CHECK (
    (`tipo_item` = 'EXAMEN' AND `examen_id` IS NOT NULL AND `perfil_id` IS NULL AND `tipo_emo` IS NULL)
    OR
    (`tipo_item` = 'PERFIL' AND `perfil_id` IS NOT NULL AND `tipo_emo` IS NOT NULL AND `examen_id` IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `facturas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero_factura` varchar(50) NOT NULL,
  `pedido_id` int NOT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  `igv` decimal(14,2) DEFAULT '0.00',
  `total` decimal(14,2) NOT NULL,
  `estado` enum('PENDIENTE','PAGADA') NOT NULL DEFAULT 'PENDIENTE',
  `fecha_emision` date NOT NULL DEFAULT (curdate()),
  `fecha_pago` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_factura` (`numero_factura`),
  KEY `pedido_id` (`pedido_id`),
  CONSTRAINT `facturas_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `factura_cotizacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `factura_id` int NOT NULL,
  `cotizacion_id` int NOT NULL,
  `monto` decimal(14,2) NOT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `factura_id` (`factura_id`,`cotizacion_id`),
  KEY `cotizacion_id` (`cotizacion_id`),
  CONSTRAINT `factura_cotizacion_ibfk_1` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `factura_cotizacion_ibfk_2` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `factura_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `factura_id` int NOT NULL,
  `tipo_item` enum('PERFIL','EXAMEN') NOT NULL DEFAULT 'EXAMEN',
  `perfil_id` int DEFAULT NULL,
  `tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') DEFAULT NULL,
  `examen_id` int DEFAULT NULL,
  `descripcion` varchar(255) NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_factura_detalle_factura` (`factura_id`),
  KEY `idx_factura_detalle_perfil` (`perfil_id`),
  KEY `idx_factura_detalle_examen` (`examen_id`),
  CONSTRAINT `factura_detalle_ibfk_1` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `factura_detalle_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `factura_detalle_ibfk_3` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `factura_detalle_chk_tipo` CHECK (
    (`tipo_item` = 'EXAMEN' AND `examen_id` IS NOT NULL AND `perfil_id` IS NULL AND `tipo_emo` IS NULL)
    OR
    (`tipo_item` = 'PERFIL' AND `perfil_id` IS NOT NULL AND `tipo_emo` IS NOT NULL AND `examen_id` IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `pedidos`
  ADD CONSTRAINT `pedidos_ibfk_5` FOREIGN KEY (`cotizacion_principal_id`) REFERENCES `cotizaciones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `pedidos_ibfk_6` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE SET NULL;

-- pedido_items reemplaza al antiguo pedido_examenes con el modelo híbrido.
-- `item_key` es una columna VIRTUAL que sirve para enforcer UNIQUE
-- (pedido_id, item) — esto sustituye al UNIQUE(pedido_id, examen_id) anterior
-- y funciona también para items de tipo PERFIL.
CREATE TABLE `pedido_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `tipo_item` enum('PERFIL','EXAMEN') NOT NULL DEFAULT 'EXAMEN',
  `perfil_id` int DEFAULT NULL,
  `tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') DEFAULT NULL,
  `examen_id` int DEFAULT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `cantidad` int NOT NULL,
  `precio_base` decimal(12,2) NOT NULL,
  `item_key` varchar(64) GENERATED ALWAYS AS (
    CONCAT(`tipo_item`, '|', IFNULL(`perfil_id`, 0), '|', IFNULL(`tipo_emo`, ''), '|', IFNULL(`examen_id`, 0))
  ) VIRTUAL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pedido_items` (`pedido_id`,`item_key`),
  KEY `idx_pedido_items_perfil` (`perfil_id`),
  KEY `idx_pedido_items_examen` (`examen_id`),
  CONSTRAINT `pedido_items_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pedido_items_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `pedido_items_ibfk_3` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `pedido_items_chk_cant` CHECK ((`cantidad` > 0)),
  CONSTRAINT `pedido_items_chk_tipo` CHECK (
    (`tipo_item` = 'EXAMEN' AND `examen_id` IS NOT NULL AND `perfil_id` IS NULL AND `tipo_emo` IS NULL)
    OR
    (`tipo_item` = 'PERFIL' AND `perfil_id` IS NOT NULL AND `tipo_emo` IS NOT NULL AND `examen_id` IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Pacientes
-- -----------------------------------------------------------------------------
-- Paciente dentro de un pedido. Un mismo DNI puede aparecer en varios pedidos.
-- `emo_perfil_id` + `emo_tipo` determinan qué exámenes le tocan (filtrados por
-- sexo/edad/condicional según `emo_perfil_examenes`). La lista concreta se
-- materializa en `paciente_examen_asignado`.
CREATE TABLE `pedido_pacientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `dni` varchar(20) NOT NULL,
  `nombre_completo` varchar(200) NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('HOMBRE','MUJER') DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `direccion` varchar(500) DEFAULT NULL,
  `estado_civil` varchar(30) DEFAULT NULL,
  `contacto_emergencia_nombre` varchar(200) DEFAULT NULL,
  `contacto_emergencia_telefono` varchar(30) DEFAULT NULL,
  `cargo` varchar(150) DEFAULT NULL,
  `area` varchar(150) DEFAULT NULL,
  `emo_tipo` enum('PREOC','ANUAL','RETIRO','VISITA') DEFAULT NULL,
  `emo_perfil_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pedido_id` (`pedido_id`,`dni`),
  KEY `fk_pedido_pacientes_emo_perfil_id` (`emo_perfil_id`),
  KEY `idx_pedido_pacientes_dni` (`dni`),
  CONSTRAINT `fk_pedido_pacientes_emo_perfil_id` FOREIGN KEY (`emo_perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pedido_pacientes_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Lista materializada de exámenes asignados a un paciente. Se llena al asignar
-- perfil+tipo al paciente aplicando filtros (sexo/edad/condicional), y se puede
-- editar manualmente para agregar/quitar exámenes puntuales.
CREATE TABLE `paciente_examen_asignado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `examen_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `paciente_id` (`paciente_id`,`examen_id`),
  KEY `examen_id` (`examen_id`),
  CONSTRAINT `paciente_examen_asignado_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pedido_pacientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `paciente_examen_asignado_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `paciente_examen_completado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `examen_id` int NOT NULL,
  `fecha_completado` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `paciente_id` (`paciente_id`,`examen_id`),
  KEY `examen_id` (`examen_id`),
  CONSTRAINT `paciente_examen_completado_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pedido_pacientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `paciente_examen_completado_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Solicitudes del cliente para ampliar el pedido
-- -----------------------------------------------------------------------------
CREATE TABLE `solicitudes_agregar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `cliente_usuario_id` int NOT NULL,
  `estado` enum('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  `mensaje_cliente` text,
  `mensaje_rechazo` text,
  `fecha_solicitud` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_revision` timestamp NULL DEFAULT NULL,
  `revisado_por_usuario_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cliente_usuario_id` (`cliente_usuario_id`),
  KEY `revisado_por_usuario_id` (`revisado_por_usuario_id`),
  KEY `idx_solicitudes_agregar_pedido` (`pedido_id`),
  KEY `idx_solicitudes_agregar_estado` (`estado`),
  CONSTRAINT `solicitudes_agregar_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_agregar_ibfk_2` FOREIGN KEY (`cliente_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_agregar_ibfk_3` FOREIGN KEY (`revisado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `solicitud_agregar_paciente` (
  `id` int NOT NULL AUTO_INCREMENT,
  `solicitud_id` int NOT NULL,
  `pedido_paciente_id` int DEFAULT NULL,
  `dni` varchar(20) DEFAULT NULL,
  `nombre_completo` varchar(200) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('HOMBRE','MUJER') DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `direccion` varchar(500) DEFAULT NULL,
  `estado_civil` varchar(30) DEFAULT NULL,
  `contacto_emergencia_nombre` varchar(200) DEFAULT NULL,
  `contacto_emergencia_telefono` varchar(30) DEFAULT NULL,
  `cargo` varchar(150) DEFAULT NULL,
  `area` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pedido_paciente_id` (`pedido_paciente_id`),
  KEY `idx_solicitud_agregar_paciente_solicitud` (`solicitud_id`),
  CONSTRAINT `solicitud_agregar_paciente_ibfk_1` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes_agregar` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitud_agregar_paciente_ibfk_2` FOREIGN KEY (`pedido_paciente_id`) REFERENCES `pedido_pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `solicitud_agregar_examenes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `solicitud_id` int NOT NULL,
  `solicitud_agregar_paciente_id` int DEFAULT NULL,
  `examen_id` int NOT NULL,
  `cantidad` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `solicitud_agregar_paciente_id` (`solicitud_agregar_paciente_id`),
  KEY `examen_id` (`examen_id`),
  KEY `idx_solicitud_agregar_examenes_solicitud` (`solicitud_id`),
  CONSTRAINT `solicitud_agregar_examenes_ibfk_1` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes_agregar` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitud_agregar_examenes_ibfk_2` FOREIGN KEY (`solicitud_agregar_paciente_id`) REFERENCES `solicitud_agregar_paciente` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitud_agregar_examenes_ibfk_3` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `solicitud_agregar_examenes_chk_1` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Historial de pedidos (auditoría)
-- -----------------------------------------------------------------------------
CREATE TABLE `historial_pedido` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `cotizacion_id` int DEFAULT NULL,
  `tipo_evento` enum('CREACION','COTIZACION_ENVIADA','COTIZACION_APROBADA','COTIZACION_RECHAZADA','SOLICITUD_MANAGER','PRECIO_APROBADO','FACTURA_EMITIDA','FACTURA_ANULADA','FACTURA_ENVIADA_CLIENTE','PAGO_RECIBIDO','COTIZACION_ELIMINADA') NOT NULL,
  `descripcion` text NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `usuario_nombre` varchar(200) DEFAULT NULL,
  `valor_anterior` decimal(14,2) DEFAULT NULL,
  `valor_nuevo` decimal(14,2) DEFAULT NULL,
  `atendidos` int DEFAULT NULL,
  `no_atendidos` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_historial_pedido` (`pedido_id`),
  KEY `idx_historial_cotizacion` (`cotizacion_id`),
  KEY `idx_historial_fecha` (`created_at`),
  CONSTRAINT `historial_pedido_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `historial_pedido_ibfk_2` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `historial_pedido_ibfk_3` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
