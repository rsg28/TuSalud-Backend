-- =============================================================================
-- TuSalud - Esquema de base de datos (MySQL 8+)
-- Versión adaptada de tusalud_schema.sql para MySQL
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS historial_pedido;
DROP TABLE IF EXISTS paciente_examen_completado;
DROP TABLE IF EXISTS paciente_examen_asignado;
DROP TABLE IF EXISTS pedido_pacientes;
DROP TABLE IF EXISTS factura_cotizacion;
DROP TABLE IF EXISTS factura_detalle;
DROP TABLE IF EXISTS facturas;
DROP TABLE IF EXISTS cotizacion_items;
DROP TABLE IF EXISTS cotizaciones;
DROP TABLE IF EXISTS pedido_examenes;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS examen_precio;
DROP TABLE IF EXISTS examenes;
DROP TABLE IF EXISTS sedes;
DROP TABLE IF EXISTS usuario_empresa;
DROP TABLE IF EXISTS empresas;
DROP TABLE IF EXISTS usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. USUARIOS (Login / Auth)
-- =============================================================================
CREATE TABLE usuarios (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  nombre_usuario    VARCHAR(100) NOT NULL UNIQUE,
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  nombre_completo   VARCHAR(200) NOT NULL,
  telefono          VARCHAR(30),
  ruc               VARCHAR(20),
  tipo_ruc          VARCHAR(20) CHECK (tipo_ruc IN ('NINGUNO', 'RUC10', 'RUC20')),
  rol               ENUM('vendedor', 'cliente', 'manager') NOT NULL,
  activo            TINYINT(1) DEFAULT 1,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================================================
-- 2. EMPRESAS (El cliente es la empresa misma - datos del formulario Crear Empresa)
-- =============================================================================
CREATE TABLE empresas (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  -- DATOS BASICOS
  codigo                    VARCHAR(50),
  ruc                       VARCHAR(20),
  razon_social              VARCHAR(255) NOT NULL,
  tipo_persona              VARCHAR(50),                    -- Persona Natural | Persona Jurídica | No Domiciliado
  tipo_documento            VARCHAR(20),                    -- DNI | PASAPORTE (cuando tipo_persona = Persona Natural)
  dni                       VARCHAR(20),
  ap_paterno                VARCHAR(100),
  ap_materno                VARCHAR(100),
  nombres_completos         VARCHAR(255),
  direccion                 VARCHAR(500),
  celular                   VARCHAR(30),
  contacto                  VARCHAR(200),
  email                     VARCHAR(255),
  actividad_empresa         VARCHAR(200),
  ubigeo                    VARCHAR(10),                    -- Código UBIGEO
  ciudad                    VARCHAR(100),
  condicion                 VARCHAR(50),
  departamento              VARCHAR(100),                   -- Estado/región (ej. Arequipa)
  estado                    VARCHAR(30) DEFAULT 'ACTIVO',   -- ACTIVO | INACTIVO
  -- INFORMACION DE COBRANZAS
  nombre_responsable_pagos  VARCHAR(200),
  telefono_responsable_pagos VARCHAR(30),
  correo_responsable_pagos  VARCHAR(255),
  direccion_oficina_pagos   VARCHAR(500),
  fecha_presentacion_facturas VARCHAR(100),
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE usuario_empresa (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  empresa_id  INT NOT NULL,
  es_principal TINYINT(1) DEFAULT 0,
  UNIQUE(usuario_id, empresa_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- =============================================================================
-- 3. SEDES
-- =============================================================================
CREATE TABLE sedes (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(150) NOT NULL,
  activa  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. EXAMENES
-- =============================================================================
CREATE TABLE examenes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  identificador INT NULL COMMENT 'ID de negocio; puede repetirse entre exámenes distintos',
  nombre        VARCHAR(255) NOT NULL,
  categoria     VARCHAR(150),
  codigo        VARCHAR(50),
  activo        TINYINT(1) DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE examen_precio (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  examen_id   INT NOT NULL,
  sede_id     INT NULL,
  precio      DECIMAL(12,2) NOT NULL,
  vigente_desde DATE DEFAULT (CURRENT_DATE),
  vigente_hasta DATE NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(examen_id, sede_id),
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE,
  FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE SET NULL
);

-- =============================================================================
-- 5. PEDIDOS
-- =============================================================================
CREATE TABLE pedidos (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  numero_pedido         VARCHAR(50) NOT NULL UNIQUE,
  empresa_id            INT NOT NULL,
  sede_id               INT NOT NULL,
  vendedor_id           INT NULL,
  cliente_usuario_id    INT NULL,
  estado                ENUM('PENDIENTE','ESPERA_COTIZACION','LISTO_PARA_COTIZACION','FALTA_APROBAR_COTIZACION',
                             'COTIZACION_APROBADA','FALTA_PAGO_FACTURA','COTIZACION_RECHAZADA',
                             'FACTURADO','COMPLETADO','CANCELADO') NOT NULL DEFAULT 'ESPERA_COTIZACION',
  total_empleados       INT NOT NULL DEFAULT 0,
  fecha_creacion        DATE NOT NULL DEFAULT (CURRENT_DATE),
  fecha_vencimiento     DATE NULL,
  observaciones         TEXT,
  condiciones_pago      VARCHAR(255),
  cotizacion_principal_id INT NULL,
  factura_id            INT NULL,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT,
  FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE RESTRICT,
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (cliente_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =============================================================================
-- 6. PEDIDO_EXAMENES
-- =============================================================================
CREATE TABLE pedido_examenes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id    INT NOT NULL,
  examen_id    INT NOT NULL,
  cantidad     INT NOT NULL CHECK (cantidad > 0),
  precio_base  DECIMAL(12,2) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pedido_id, examen_id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE RESTRICT
);

-- =============================================================================
-- 7. COTIZACIONES
-- =============================================================================
CREATE TABLE cotizaciones (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  numero_cotizacion        VARCHAR(50) NOT NULL UNIQUE,
  pedido_id                INT NOT NULL,
  cotizacion_base_id       INT NULL,
  es_complementaria        TINYINT(1) NOT NULL DEFAULT 0,
  estado                   ENUM('BORRADOR','ENVIADA','ENVIADA_AL_CLIENTE','ENVIADA_AL_MANAGER','RECIBIDA_POR_CLIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'BORRADOR',
  creador_tipo             ENUM('VENDEDOR','CLIENTE') NOT NULL DEFAULT 'VENDEDOR',
  creador_id               INT NULL,
  total                    DECIMAL(14,2) NOT NULL DEFAULT 0,
  solicitud_manager_pendiente TINYINT(1) DEFAULT 0,
  mensaje_rechazo          TEXT,
  fecha                    DATE NOT NULL DEFAULT (CURRENT_DATE),
  fecha_envio              TIMESTAMP NULL,
  fecha_aprobacion         TIMESTAMP NULL,
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (es_complementaria = 0 OR cotizacion_base_id IS NOT NULL),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (cotizacion_base_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (creador_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =============================================================================
-- 8. COTIZACION_ITEMS
-- =============================================================================
CREATE TABLE cotizacion_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id INT NOT NULL,
  examen_id     INT NOT NULL,
  nombre        VARCHAR(255) NOT NULL,
  cantidad      INT NOT NULL CHECK (cantidad > 0),
  precio_base   DECIMAL(12,2) NOT NULL,
  precio_final  DECIMAL(12,2) NOT NULL,
  variacion_pct DECIMAL(8,2) DEFAULT 0,
  subtotal      DECIMAL(14,2) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE RESTRICT
);

-- =============================================================================
-- 9. FACTURAS
-- =============================================================================
CREATE TABLE facturas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  numero_factura  VARCHAR(50) NOT NULL UNIQUE,
  pedido_id       INT NOT NULL,
  subtotal        DECIMAL(14,2) NOT NULL,
  igv             DECIMAL(14,2) DEFAULT 0,
  total           DECIMAL(14,2) NOT NULL,
  estado          ENUM('PENDIENTE','PAGADA') NOT NULL DEFAULT 'PENDIENTE',
  fecha_emision   DATE NOT NULL DEFAULT (CURRENT_DATE),
  fecha_pago      DATE NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE RESTRICT
);

CREATE TABLE factura_cotizacion (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  factura_id    INT NOT NULL,
  cotizacion_id INT NOT NULL,
  monto         DECIMAL(14,2) NOT NULL,
  es_principal  TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE(factura_id, cotizacion_id),
  FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE RESTRICT
);

CREATE TABLE factura_detalle (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  factura_id     INT NOT NULL,
  examen_id      INT NOT NULL,
  descripcion    VARCHAR(255) NOT NULL,
  cantidad       INT NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal       DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE RESTRICT
);

-- FK en pedidos (referencias circulares)
ALTER TABLE pedidos ADD FOREIGN KEY (cotizacion_principal_id) REFERENCES cotizaciones(id) ON DELETE SET NULL;
ALTER TABLE pedidos ADD FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE SET NULL;

-- =============================================================================
-- 10. PEDIDO_PACIENTES
-- =============================================================================
CREATE TABLE pedido_pacientes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id        INT NOT NULL,
  dni              VARCHAR(20) NOT NULL,
  nombre_completo  VARCHAR(200) NOT NULL,
  cargo            VARCHAR(150),
  area             VARCHAR(150),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pedido_id, dni),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

CREATE TABLE paciente_examen_asignado (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  examen_id   INT NOT NULL,
  UNIQUE(paciente_id, examen_id),
  FOREIGN KEY (paciente_id) REFERENCES pedido_pacientes(id) ON DELETE CASCADE,
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE
);

CREATE TABLE paciente_examen_completado (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id   INT NOT NULL,
  examen_id     INT NOT NULL,
  fecha_completado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(paciente_id, examen_id),
  FOREIGN KEY (paciente_id) REFERENCES pedido_pacientes(id) ON DELETE CASCADE,
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE
);

-- =============================================================================
-- 11. HISTORIAL
-- =============================================================================
CREATE TABLE historial_pedido (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id        INT NOT NULL,
  cotizacion_id    INT NULL,
  tipo_evento      ENUM('CREACION','COTIZACION_ENVIADA','COTIZACION_APROBADA','COTIZACION_RECHAZADA',
                        'SOLICITUD_MANAGER','PRECIO_APROBADO','FACTURA_EMITIDA','PAGO_RECIBIDO') NOT NULL,
  descripcion      TEXT NOT NULL,
  usuario_id       INT NULL,
  usuario_nombre   VARCHAR(200),
  valor_anterior   DECIMAL(14,2),
  valor_nuevo      DECIMAL(14,2),
  atendidos        INT,
  no_atendidos     INT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_historial_pedido ON historial_pedido(pedido_id);
CREATE INDEX idx_historial_cotizacion ON historial_pedido(cotizacion_id);
CREATE INDEX idx_historial_fecha ON historial_pedido(created_at);
CREATE INDEX idx_pedidos_empresa ON pedidos(empresa_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_cotizaciones_pedido ON cotizaciones(pedido_id);
