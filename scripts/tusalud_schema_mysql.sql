-- =============================================================================
-- TuSalud — Esquema MySQL 8+ (solo DDL, sin datos)
-- Alineado con la base en producción (RDS). Recrear desde cero: mysql < tusalud_schema_mysql.sql
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
DROP TABLE IF EXISTS pedido_examenes;
DROP TABLE IF EXISTS cotizacion_items;
DROP TABLE IF EXISTS factura_detalle;
DROP TABLE IF EXISTS factura_cotizacion;
DROP TABLE IF EXISTS facturas;
DROP TABLE IF EXISTS cotizaciones;
DROP TABLE IF EXISTS password_reset_codes;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS emo_perfil_examenes;
DROP TABLE IF EXISTS emo_tipos_evaluacion;
DROP TABLE IF EXISTS emo_perfiles;
DROP TABLE IF EXISTS examen_precio;
DROP TABLE IF EXISTS examenes;
DROP TABLE IF EXISTS usuario_empresa;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS empresas;
DROP TABLE IF EXISTS sedes;

-- -----------------------------------------------------------------------------
-- Empresas y sedes
-- -----------------------------------------------------------------------------
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `sedes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `activa` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Usuarios
-- -----------------------------------------------------------------------------
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre_completo` varchar(200) NOT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `ruc` varchar(20) DEFAULT NULL,
  `tipo_ruc` varchar(20) DEFAULT NULL,
  `rol` enum('vendedor','cliente','manager') NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `empresa_id` int DEFAULT NULL COMMENT 'Empresa del cliente (1:1). Solo para rol cliente; vendedor/manager = NULL.',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_usuario` (`nombre_usuario`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_usuarios_empresa` (`empresa_id`),
  CONSTRAINT `fk_usuarios_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usuarios_chk_1` CHECK ((`tipo_ruc` in (_utf8mb4'NINGUNO',_utf8mb4'RUC10',_utf8mb4'RUC20')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `usuario_empresa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `empresa_id` int NOT NULL,
  `es_principal` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_id` (`usuario_id`,`empresa_id`),
  KEY `empresa_id` (`empresa_id`),
  CONSTRAINT `usuario_empresa_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `usuario_empresa_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE
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
-- Catálogo de exámenes y precios por sede
-- -----------------------------------------------------------------------------
CREATE TABLE `examenes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `identificador` int DEFAULT NULL COMMENT 'ID de negocio; puede repetirse entre exámenes distintos',
  `nombre` varchar(255) NOT NULL,
  `categoria` varchar(150) DEFAULT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `examen_precio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `examen_id` int NOT NULL,
  `sede_id` int DEFAULT NULL,
  `precio` decimal(12,2) NOT NULL,
  `vigente_desde` date DEFAULT (curdate()),
  `vigente_hasta` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `examen_id` (`examen_id`,`sede_id`),
  KEY `sede_id` (`sede_id`),
  CONSTRAINT `examen_precio_ibfk_1` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `examen_precio_ibfk_2` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- EMO (perfiles y mapeo a exámenes)
-- -----------------------------------------------------------------------------
CREATE TABLE `emo_perfiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `emo_tipos_evaluacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` enum('PREOC','ANUAL','RETIRO','VISITA') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `emo_tipos_evaluacion` (`nombre`) VALUES ('PREOC'), ('ANUAL'), ('RETIRO'), ('VISITA');

CREATE TABLE `emo_perfil_examenes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `perfil_id` int NOT NULL,
  `tipo_emo` enum('PREOC','ANUAL','RETIRO','VISITA') NOT NULL,
  `examen_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `perfil_id` (`perfil_id`,`tipo_emo`,`examen_id`),
  KEY `examen_id` (`examen_id`),
  CONSTRAINT `emo_perfil_examenes_ibfk_1` FOREIGN KEY (`perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `emo_perfil_examenes_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- Pedidos (sin FK circulares a cotizaciones/facturas hasta crear esas tablas)
-- -----------------------------------------------------------------------------
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
  `examen_id` int NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `cantidad` int NOT NULL,
  `precio_base` decimal(12,2) NOT NULL,
  `precio_final` decimal(12,2) NOT NULL,
  `variacion_pct` decimal(8,2) DEFAULT '0.00',
  `subtotal` decimal(14,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cotizacion_id` (`cotizacion_id`),
  KEY `examen_id` (`examen_id`),
  CONSTRAINT `cotizacion_items_ibfk_1` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cotizacion_items_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `cotizacion_items_chk_1` CHECK ((`cantidad` > 0))
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
  `examen_id` int NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `factura_id` (`factura_id`),
  KEY `examen_id` (`examen_id`),
  CONSTRAINT `factura_detalle_ibfk_1` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `factura_detalle_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `pedidos`
  ADD CONSTRAINT `pedidos_ibfk_5` FOREIGN KEY (`cotizacion_principal_id`) REFERENCES `cotizaciones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `pedidos_ibfk_6` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE SET NULL;

CREATE TABLE `pedido_examenes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `examen_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_base` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pedido_id` (`pedido_id`,`examen_id`),
  KEY `examen_id` (`examen_id`),
  CONSTRAINT `pedido_examenes_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pedido_examenes_ibfk_2` FOREIGN KEY (`examen_id`) REFERENCES `examenes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `pedido_examenes_chk_1` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `pedido_pacientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `dni` varchar(20) NOT NULL,
  `nombre_completo` varchar(200) NOT NULL,
  `cargo` varchar(150) DEFAULT NULL,
  `area` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `emo_tipo` enum('PREOC','ANUAL','RETIRO','VISITA') DEFAULT NULL,
  `emo_perfil_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pedido_id` (`pedido_id`,`dni`),
  KEY `fk_pedido_pacientes_emo_perfil_id` (`emo_perfil_id`),
  CONSTRAINT `fk_pedido_pacientes_emo_perfil_id` FOREIGN KEY (`emo_perfil_id`) REFERENCES `emo_perfiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pedido_pacientes_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
