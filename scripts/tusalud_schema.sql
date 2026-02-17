-- =============================================================================
-- TuSalud - Esquema de base de datos
-- Cubre: Login, Registro de pedidos, Cotizaciones (vendedor/manager/cliente),
--        Facturación (incluyendo cotizaciones complementarias)
--
-- Compatible con: PostgreSQL 12+
-- Para MySQL: ver tusalud_schema_mysql.sql (SERIAL->AUTO_INCREMENT, ENUM->VARCHAR,
--             GENERATED->columna normal, EXECUTE PROCEDURE no aplica)
-- =============================================================================

-- Eliminar tablas existentes (en orden por dependencias FK)
DROP TABLE IF EXISTS historial_pedido CASCADE;
DROP TABLE IF EXISTS paciente_examen_completado CASCADE;
DROP TABLE IF EXISTS paciente_examen_asignado CASCADE;
DROP TABLE IF EXISTS pedido_pacientes CASCADE;
DROP TABLE IF EXISTS factura_cotizacion CASCADE;
DROP TABLE IF EXISTS factura_detalle CASCADE;
DROP TABLE IF EXISTS facturas CASCADE;
DROP TABLE IF EXISTS cotizacion_items CASCADE;
DROP TABLE IF EXISTS cotizaciones CASCADE;
DROP TABLE IF EXISTS pedido_examenes CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS examen_precio CASCADE;
DROP TABLE IF EXISTS examenes CASCADE;
DROP TABLE IF EXISTS sedes CASCADE;
DROP TABLE IF EXISTS usuario_empresa CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Tipos ENUM (PostgreSQL)
-- Para MySQL: usar VARCHAR con CHECK o tabla lookup
DROP TYPE IF EXISTS rol_usuario CASCADE;
CREATE TYPE rol_usuario AS ENUM ('vendedor', 'cliente', 'manager');

DO $$ BEGIN
  CREATE TYPE estado_pedido AS ENUM (
    'PENDIENTE',
    'LISTO_PARA_COTIZACION',
    'FALTA_APROBAR_COTIZACION',
    'COTIZACION_APROBADA',
    'FALTA_PAGO_FACTURA',
    'COTIZACION_RECHAZADA',
    'FACTURADO',
    'COMPLETADO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_cotizacion AS ENUM ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE creador_cotizacion AS ENUM ('VENDEDOR', 'CLIENTE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_factura AS ENUM ('PENDIENTE', 'PAGADA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tipo_evento_historial AS ENUM (
    'CREACION',
    'COTIZACION_ENVIADA',
    'COTIZACION_APROBADA',
    'COTIZACION_RECHAZADA',
    'SOLICITUD_MANAGER',
    'PRECIO_APROBADO',
    'FACTURA_EMITIDA',
    'PAGO_RECIBIDO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 1. USUARIOS (Login / Auth)
-- =============================================================================
CREATE TABLE usuarios (
  id                SERIAL PRIMARY KEY,
  nombre_usuario    VARCHAR(100) NOT NULL UNIQUE,
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  nombre_completo   VARCHAR(200) NOT NULL,
  telefono          VARCHAR(30),
  ruc               VARCHAR(20),
  tipo_ruc          VARCHAR(20) CHECK (tipo_ruc IN ('NINGUNO', 'RUC10', 'RUC20')),
  rol               rol_usuario NOT NULL,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- =============================================================================
-- 2. EMPRESAS (El cliente es la empresa misma - datos del formulario Crear Empresa)
-- =============================================================================
CREATE TABLE empresas (
  id                        SERIAL PRIMARY KEY,
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
  ubigeo                    VARCHAR(10),                    -- Código UBIGEO (geográfico)
  ciudad                    VARCHAR(100),
  condicion                 VARCHAR(50),
  departamento              VARCHAR(100),                   -- Estado/región (ej. Arequipa)
  estado                    VARCHAR(30) DEFAULT 'ACTIVO',   -- ACTIVO | INACTIVO
  -- INFORMACION DE COBRANZAS
  nombre_responsable_pagos  VARCHAR(200),
  telefono_responsable_pagos VARCHAR(30),
  correo_responsable_pagos  VARCHAR(255),
  direccion_oficina_pagos   VARCHAR(500),
  fecha_presentacion_facturas VARCHAR(100),                  -- Fecha de presentación de facturas
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_empresas_ruc ON empresas(ruc);

-- Usuario-cliente vinculado a empresa(s). Un cliente puede gestionar una o más empresas
CREATE TABLE usuario_empresa (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id  INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  es_principal BOOLEAN DEFAULT FALSE,
  UNIQUE(usuario_id, empresa_id)
);

-- =============================================================================
-- 3. SEDES (Centros de atención)
-- =============================================================================
CREATE TABLE sedes (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(150) NOT NULL,
  activa  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. EXAMENES (Catálogo de exámenes médicos)
-- =============================================================================
CREATE TABLE examenes (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(255) NOT NULL,
  categoria   VARCHAR(150),
  codigo      VARCHAR(50),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Precio base por examen (puede extenderse con precio por sede/empresa)
CREATE TABLE examen_precio (
  id          SERIAL PRIMARY KEY,
  examen_id   INTEGER NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  sede_id     INTEGER REFERENCES sedes(id) ON DELETE SET NULL,
  precio      DECIMAL(12,2) NOT NULL,
  vigente_desde DATE DEFAULT CURRENT_DATE,
  vigente_hasta DATE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(examen_id, sede_id)
);

-- =============================================================================
-- 5. PEDIDOS
-- =============================================================================
CREATE TABLE pedidos (
  id                    SERIAL PRIMARY KEY,
  numero_pedido         VARCHAR(50) NOT NULL UNIQUE,
  empresa_id            INTEGER NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sede_id               INTEGER NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,
  vendedor_id           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Usuario cliente que creó el pedido (si aplica)
  cliente_usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  estado                estado_pedido NOT NULL DEFAULT 'PENDIENTE',
  total_empleados       INTEGER NOT NULL DEFAULT 0,
  fecha_creacion        DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento     DATE,
  observaciones         TEXT,
  condiciones_pago      VARCHAR(255),
  -- Referencia a la cotización principal aprobada (cuando aplica)
  cotizacion_principal_id INTEGER,
  -- Referencia a la factura emitida (cuando aplica)
  factura_id            INTEGER,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FK circular: cotizacion_principal_id y factura_id se añaden después de crear esas tablas
CREATE INDEX idx_pedidos_empresa ON pedidos(empresa_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_creacion);
CREATE INDEX idx_pedidos_vendedor ON pedidos(vendedor_id);

-- =============================================================================
-- 6. PEDIDO_EXAMENES (Exámenes solicitados en el pedido - snapshot inicial)
-- =============================================================================
CREATE TABLE pedido_examenes (
  id           SERIAL PRIMARY KEY,
  pedido_id    INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  examen_id    INTEGER NOT NULL REFERENCES examenes(id) ON DELETE RESTRICT,
  cantidad     INTEGER NOT NULL CHECK (cantidad > 0),
  precio_base  DECIMAL(12,2) NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pedido_id, examen_id)
);

-- =============================================================================
-- 7. COTIZACIONES (Principal y complementarias)
-- La cotización principal cubre los exámenes iniciales del pedido.
-- Las complementarias añaden exámenes extra (cliente, médico o vendedor).
-- =============================================================================
CREATE TABLE cotizaciones (
  id                       SERIAL PRIMARY KEY,
  numero_cotizacion        VARCHAR(50) NOT NULL UNIQUE,
  pedido_id                INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  -- Cotización base: NULL = principal, NOT NULL = complementaria
  cotizacion_base_id       INTEGER REFERENCES cotizaciones(id) ON DELETE CASCADE,
  es_complementaria        BOOLEAN NOT NULL DEFAULT FALSE,
  estado                   estado_cotizacion NOT NULL DEFAULT 'BORRADOR',
  creador_tipo             creador_cotizacion NOT NULL DEFAULT 'VENDEDOR',
  creador_id               INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  total                    DECIMAL(14,2) NOT NULL DEFAULT 0,
  solicitud_manager_pendiente BOOLEAN DEFAULT FALSE,
  mensaje_rechazo          TEXT,
  fecha                    DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_envio              TIMESTAMP WITH TIME ZONE,
  fecha_aprobacion         TIMESTAMP WITH TIME ZONE,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (es_complementaria = FALSE OR cotizacion_base_id IS NOT NULL)
);

-- Índice para buscar cotizaciones de un pedido y sus complementarias
CREATE INDEX idx_cotizaciones_pedido ON cotizaciones(pedido_id);
CREATE INDEX idx_cotizaciones_base ON cotizaciones(cotizacion_base_id);
CREATE INDEX idx_cotizaciones_estado ON cotizaciones(estado);

-- =============================================================================
-- 8. COTIZACION_ITEMS (Detalle de cada cotización)
-- =============================================================================
CREATE TABLE cotizacion_items (
  id            SERIAL PRIMARY KEY,
  cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  examen_id     INTEGER NOT NULL REFERENCES examenes(id) ON DELETE RESTRICT,
  nombre        VARCHAR(255) NOT NULL,
  cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
  precio_base   DECIMAL(12,2) NOT NULL,
  precio_final  DECIMAL(12,2) NOT NULL,
  variacion_pct DECIMAL(8,2) DEFAULT 0,
  subtotal      DECIMAL(14,2) GENERATED ALWAYS AS (cantidad * precio_final) STORED,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Para MySQL (no soporta GENERATED): usar subtotal como columna normal y calcular en app/trigger
-- ALTER TABLE cotizacion_items ADD subtotal DECIMAL(14,2);

CREATE INDEX idx_cotizacion_items_cotizacion ON cotizacion_items(cotizacion_id);

-- =============================================================================
-- 9. FACTURAS
-- Una factura puede incluir la cotización principal + todas las complementarias aprobadas.
-- factura_cotizacion vincula qué cotizaciones forman parte de la factura.
-- =============================================================================
CREATE TABLE facturas (
  id              SERIAL PRIMARY KEY,
  numero_factura  VARCHAR(50) NOT NULL UNIQUE,
  pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  -- Total facturado (suma de cotizaciones incluidas)
  subtotal        DECIMAL(14,2) NOT NULL,
  igv             DECIMAL(14,2) DEFAULT 0,
  total           DECIMAL(14,2) NOT NULL,
  estado          estado_factura NOT NULL DEFAULT 'PENDIENTE',
  fecha_emision   DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_pago      DATE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vincula factura con las cotizaciones que la componen (principal + complementarias aprobadas)
CREATE TABLE factura_cotizacion (
  id            SERIAL PRIMARY KEY,
  factura_id    INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE RESTRICT,
  monto         DECIMAL(14,2) NOT NULL,
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(factura_id, cotizacion_id)
);

-- Detalle de línea para la factura (opcional, para reportes)
CREATE TABLE factura_detalle (
  id             SERIAL PRIMARY KEY,
  factura_id     INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  examen_id      INTEGER NOT NULL REFERENCES examenes(id) ON DELETE RESTRICT,
  descripcion    VARCHAR(255) NOT NULL,
  cantidad       INTEGER NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal       DECIMAL(14,2) NOT NULL
);

-- Añadir FK en pedidos
ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_cotizacion_principal
  FOREIGN KEY (cotizacion_principal_id) REFERENCES cotizaciones(id) ON DELETE SET NULL;
ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_factura
  FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE SET NULL;

-- =============================================================================
-- 10. PEDIDO_PACIENTES (Empleados/trabajadores del pedido)
-- =============================================================================
CREATE TABLE pedido_pacientes (
  id               SERIAL PRIMARY KEY,
  pedido_id        INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  dni              VARCHAR(20) NOT NULL,
  nombre_completo  VARCHAR(200) NOT NULL,
  cargo            VARCHAR(150),
  area             VARCHAR(150),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pedido_id, dni)
);

CREATE INDEX idx_pedido_pacientes_pedido ON pedido_pacientes(pedido_id);

-- Exámenes asignados a cada paciente
CREATE TABLE paciente_examen_asignado (
  id          SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pedido_pacientes(id) ON DELETE CASCADE,
  examen_id   INTEGER NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  UNIQUE(paciente_id, examen_id)
);

-- Exámenes completados por cada paciente
CREATE TABLE paciente_examen_completado (
  id            SERIAL PRIMARY KEY,
  paciente_id   INTEGER NOT NULL REFERENCES pedido_pacientes(id) ON DELETE CASCADE,
  examen_id     INTEGER NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  fecha_completado TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(paciente_id, examen_id)
);

-- =============================================================================
-- 11. HISTORIAL (Auditoría de eventos del pedido)
-- =============================================================================
CREATE TABLE historial_pedido (
  id               SERIAL PRIMARY KEY,
  pedido_id        INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  cotizacion_id    INTEGER REFERENCES cotizaciones(id) ON DELETE SET NULL,
  tipo_evento      tipo_evento_historial NOT NULL,
  descripcion      TEXT NOT NULL,
  usuario_id       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre   VARCHAR(200),
  valor_anterior   DECIMAL(14,2),
  valor_nuevo      DECIMAL(14,2),
  atendidos        INTEGER,
  no_atendidos     INTEGER,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historial_pedido ON historial_pedido(pedido_id);
CREATE INDEX idx_historial_cotizacion ON historial_pedido(cotizacion_id);
CREATE INDEX idx_historial_fecha ON historial_pedido(created_at);

-- =============================================================================
-- SECUENCIADORES para números de pedido, cotización, factura
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS seq_numero_pedido START 1;
CREATE SEQUENCE IF NOT EXISTS seq_numero_cotizacion START 1;
CREATE SEQUENCE IF NOT EXISTS seq_numero_factura START 1;

-- =============================================================================
-- VISTAS ÚTILES
-- =============================================================================

-- Total facturable de un pedido = suma de cotización principal aprobada + complementarias aprobadas
CREATE OR REPLACE VIEW v_pedido_total_facturable AS
SELECT
  p.id AS pedido_id,
  p.numero_pedido,
  p.cotizacion_principal_id,
  COALESCE(
    (SELECT SUM(c.total)
     FROM cotizaciones c
     WHERE c.pedido_id = p.id
       AND c.estado = 'APROBADA'
       AND (c.id = p.cotizacion_principal_id OR c.cotizacion_base_id = p.cotizacion_principal_id)),
    0
  ) AS total_facturable
FROM pedidos p
WHERE p.cotizacion_principal_id IS NOT NULL;

-- Cotizaciones aprobadas de un pedido (para facturar)
CREATE OR REPLACE VIEW v_cotizaciones_para_facturar AS
SELECT
  c.id,
  c.numero_cotizacion,
  c.pedido_id,
  c.es_complementaria,
  c.cotizacion_base_id,
  c.total,
  c.estado
FROM cotizaciones c
WHERE c.estado = 'APROBADA'
  AND NOT EXISTS (
    SELECT 1 FROM factura_cotizacion fc WHERE fc.cotizacion_id = c.id
  );

-- =============================================================================
-- TRIGGERS (opcionales)
-- =============================================================================

-- Actualizar updated_at
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE PROCEDURE trigger_updated_at();
CREATE TRIGGER tr_empresas_updated_at BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE PROCEDURE trigger_updated_at();
CREATE TRIGGER tr_pedidos_updated_at BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE PROCEDURE trigger_updated_at();
CREATE TRIGGER tr_cotizaciones_updated_at BEFORE UPDATE ON cotizaciones
  FOR EACH ROW EXECUTE PROCEDURE trigger_updated_at();
CREATE TRIGGER tr_facturas_updated_at BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE PROCEDURE trigger_updated_at();
