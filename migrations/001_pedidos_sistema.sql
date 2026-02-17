-- =====================================================
-- MIGRACIÓN: Sistema de Pedidos Unificado
-- Fecha: 2026-02-01
-- Descripción: Crea el flujo unificado de pedidos con:
--   - Cotización → Aprobación precios → Carga empleados → Cierre → Factura
--   - Precios personalizados por empresa con aprobación de manager
--   - Trazabilidad completa (historial tipo árbol)
--   - Carga masiva de empleados
-- =====================================================

USE tusaludDB;

-- =====================================================
-- 1. TABLA DE PEDIDOS (Entidad Central)
-- Un pedido es el ciclo completo desde cotización hasta facturación
-- =====================================================
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_pedido VARCHAR(50) UNIQUE NOT NULL, -- Mismo número para cotización y factura
    
    -- Cliente
    empresa_id INT NOT NULL, -- Los pedidos siempre son de empresas
    
    -- Sede y responsables
    sede_id INT NOT NULL,
    vendedor_id INT NOT NULL, -- Usuario vendedor que creó el pedido
    
    -- Estados del flujo
    -- BORRADOR: Vendedor está armando el pedido
    -- PENDIENTE_APROBACION: Esperando que manager apruebe precios
    -- APROBADO: Manager aprobó, listo para carga de empleados
    -- EN_PROCESO: Empresa está cargando empleados / exámenes en curso
    -- CERRADO: Todos los empleados atendidos, listo para facturar
    -- FACTURADO: Factura emitida
    -- CANCELADO: Pedido cancelado
    estado ENUM(
        'BORRADOR',
        'PENDIENTE_APROBACION',
        'APROBADO',
        'EN_PROCESO',
        'CERRADO',
        'FACTURADO',
        'CANCELADO'
    ) DEFAULT 'BORRADOR',
    
    -- Fechas importantes
    fecha_creacion DATE NOT NULL,
    fecha_aprobacion DATE NULL,
    fecha_cierre DATE NULL,
    fecha_facturacion DATE NULL,
    fecha_vencimiento DATE NULL, -- Validez de la cotización
    
    -- Totales (se calculan de pedido_articulos)
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    descuento_total DECIMAL(12, 2) DEFAULT 0.00,
    total_cotizado DECIMAL(12, 2) DEFAULT 0.00, -- Total de la cotización
    
    -- Métricas de atención
    total_empleados_esperados INT DEFAULT 0, -- Cuántos empleados se cargaron
    total_empleados_atendidos INT DEFAULT 0, -- Cuántos ya fueron atendidos
    total_empleados_no_atendidos INT DEFAULT 0, -- Cuántos no asistieron
    
    -- Total facturado (puede diferir del cotizado según atendidos)
    total_facturado DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Referencias
    cotizacion_id INT NULL, -- Referencia a cotización legacy (migración)
    factura_id INT NULL, -- Referencia a factura cuando se genera
    
    -- Observaciones
    observaciones TEXT,
    condiciones_pago TEXT,
    motivo_cancelacion TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE SET NULL,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE SET NULL
);

-- =====================================================
-- 2. ARTÍCULOS/EXÁMENES DEL PEDIDO
-- Lista de exámenes con precios (matriz de artículos)
-- =====================================================
CREATE TABLE IF NOT EXISTS pedido_articulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    examen_id INT NOT NULL,
    
    -- Descripción personalizada
    descripcion VARCHAR(255),
    
    -- Precios
    precio_lista DECIMAL(10, 2) NOT NULL, -- Precio base de la sede
    
    -- Ajuste de precio (puede ser aumento o descuento)
    tipo_ajuste ENUM('NINGUNO', 'PORCENTAJE_AUMENTO', 'PORCENTAJE_DESCUENTO', 'MONTO_FIJO') DEFAULT 'NINGUNO',
    valor_ajuste DECIMAL(10, 2) DEFAULT 0.00, -- Porcentaje o monto según tipo
    ajuste_aplicado DECIMAL(10, 2) DEFAULT 0.00, -- Monto calculado del ajuste
    
    precio_final DECIMAL(10, 2) NOT NULL, -- Precio después del ajuste
    
    -- Estado de aprobación del precio
    precio_aprobado BOOLEAN DEFAULT FALSE,
    aprobado_por_id INT NULL, -- Manager que aprobó
    fecha_aprobacion DATETIME NULL,
    
    -- Cantidad esperada de este examen
    cantidad_esperada INT DEFAULT 0,
    cantidad_realizada INT DEFAULT 0,
    
    -- Subtotal
    subtotal DECIMAL(12, 2) DEFAULT 0.00, -- precio_final * cantidad_esperada
    
    observaciones TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE RESTRICT,
    FOREIGN KEY (aprobado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_pedido_examen (pedido_id, examen_id)
);

-- =====================================================
-- 3. PRECIOS PERSONALIZADOS POR EMPRESA
-- Cada empresa puede tener precios distintos (negociados)
-- =====================================================
CREATE TABLE IF NOT EXISTS precios_empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    examen_id INT NOT NULL,
    sede_id INT NOT NULL,
    
    -- Tipo de ajuste sobre el precio base
    tipo_ajuste ENUM('PORCENTAJE_AUMENTO', 'PORCENTAJE_DESCUENTO', 'PRECIO_FIJO') NOT NULL,
    valor_ajuste DECIMAL(10, 2) NOT NULL, -- Porcentaje o precio fijo según tipo
    precio_final DECIMAL(10, 2) NOT NULL, -- Precio calculado
    
    -- Aprobación
    estado ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') DEFAULT 'PENDIENTE',
    solicitado_por_id INT NOT NULL, -- Vendedor que solicitó
    aprobado_por_id INT NULL, -- Manager que aprobó
    fecha_solicitud DATETIME NOT NULL,
    fecha_respuesta DATETIME NULL,
    
    -- Vigencia
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL, -- NULL = indefinido
    activo BOOLEAN DEFAULT TRUE,
    
    observaciones TEXT,
    motivo_rechazo TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE,
    FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE CASCADE,
    FOREIGN KEY (solicitado_por_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (aprobado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_precio_empresa (empresa_id, examen_id, sede_id, fecha_inicio)
);

-- =====================================================
-- 4. EMPLEADOS DEL PEDIDO (Carga Masiva)
-- Lista de empleados que serán atendidos en el pedido
-- =====================================================
CREATE TABLE IF NOT EXISTS pedido_empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    
    -- Datos del empleado (pueden ser de pacientes existentes o nuevos)
    paciente_id INT NULL, -- Si ya existe en la BD
    
    -- Datos básicos (para carga masiva sin crear paciente)
    dni VARCHAR(20) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    cargo VARCHAR(100) NULL,
    area VARCHAR(100) NULL,
    
    -- Estado de atención
    estado ENUM('PENDIENTE', 'PROGRAMADO', 'ATENDIDO', 'NO_ASISTIO', 'CANCELADO') DEFAULT 'PENDIENTE',
    
    -- Cita asociada (cuando se programa)
    cita_id INT NULL,
    fecha_programada DATE NULL,
    hora_programada TIME NULL,
    
    -- Fechas de seguimiento
    fecha_atencion DATE NULL,
    
    observaciones TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE SET NULL,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_pedido_dni (pedido_id, dni)
);

-- =====================================================
-- 5. EXÁMENES POR EMPLEADO DEL PEDIDO
-- Qué exámenes corresponden a cada empleado
-- =====================================================
CREATE TABLE IF NOT EXISTS pedido_empleado_examenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_empleado_id INT NOT NULL,
    pedido_articulo_id INT NOT NULL, -- Referencia al artículo del pedido
    examen_id INT NOT NULL,
    
    -- Estado del examen para este empleado
    estado ENUM('PENDIENTE', 'COMPLETADO', 'CANCELADO') DEFAULT 'PENDIENTE',
    
    -- Resultado (cuando se complete)
    resultado TEXT NULL,
    fecha_realizacion DATETIME NULL,
    realizado_por_id INT NULL, -- Médico/técnico que realizó
    
    observaciones TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pedido_empleado_id) REFERENCES pedido_empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (pedido_articulo_id) REFERENCES pedido_articulos(id) ON DELETE CASCADE,
    FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE RESTRICT,
    FOREIGN KEY (realizado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_empleado_examen (pedido_empleado_id, examen_id)
);

-- =====================================================
-- 6. HISTORIAL/TRAZABILIDAD DEL PEDIDO (Árbol de eventos)
-- Registro de todo lo que pasa con el pedido
-- =====================================================
CREATE TABLE IF NOT EXISTS pedido_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    
    -- Tipo de evento
    tipo_evento ENUM(
        'CREACION',
        'MODIFICACION_ARTICULOS',
        'AJUSTE_PRECIO',
        'SOLICITUD_APROBACION',
        'APROBACION_PRECIO',
        'RECHAZO_PRECIO',
        'APROBACION_PEDIDO',
        'CARGA_EMPLEADOS',
        'PROGRAMACION_CITA',
        'ATENCION_EMPLEADO',
        'NO_ASISTENCIA',
        'CIERRE_PEDIDO',
        'GENERACION_FACTURA',
        'CANCELACION',
        'COMENTARIO',
        'OTRO'
    ) NOT NULL,
    
    -- Descripción legible del evento
    descripcion TEXT NOT NULL,
    
    -- Datos adicionales en JSON (para detalles específicos)
    datos_adicionales JSON NULL,
    
    -- Quién realizó la acción
    usuario_id INT NOT NULL,
    
    -- Referencia a entidad afectada (opcional)
    entidad_tipo VARCHAR(50) NULL, -- 'articulo', 'empleado', 'precio', etc.
    entidad_id INT NULL,
    
    -- Estado anterior y nuevo (para cambios de estado)
    estado_anterior VARCHAR(50) NULL,
    estado_nuevo VARCHAR(50) NULL,
    
    -- Valores de cambio (para ajustes de precio)
    valor_anterior DECIMAL(12, 2) NULL,
    valor_nuevo DECIMAL(12, 2) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- =====================================================
-- 7. MODIFICAR FACTURAS PARA ENLAZAR CON PEDIDOS
-- =====================================================
ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS pedido_id INT NULL AFTER cotizacion_id,
ADD CONSTRAINT fk_factura_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE RESTRICT;

-- =====================================================
-- 8. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX idx_pedidos_empresa ON pedidos(empresa_id);
CREATE INDEX idx_pedidos_vendedor ON pedidos(vendedor_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_creacion);
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);

CREATE INDEX idx_pedido_articulos_pedido ON pedido_articulos(pedido_id);
CREATE INDEX idx_pedido_articulos_examen ON pedido_articulos(examen_id);
CREATE INDEX idx_pedido_articulos_aprobado ON pedido_articulos(precio_aprobado);

CREATE INDEX idx_precios_empresa_empresa ON precios_empresa(empresa_id);
CREATE INDEX idx_precios_empresa_examen ON precios_empresa(examen_id);
CREATE INDEX idx_precios_empresa_estado ON precios_empresa(estado);
CREATE INDEX idx_precios_empresa_activo ON precios_empresa(activo);

CREATE INDEX idx_pedido_empleados_pedido ON pedido_empleados(pedido_id);
CREATE INDEX idx_pedido_empleados_dni ON pedido_empleados(dni);
CREATE INDEX idx_pedido_empleados_estado ON pedido_empleados(estado);
CREATE INDEX idx_pedido_empleados_paciente ON pedido_empleados(paciente_id);

CREATE INDEX idx_pedido_empleado_examenes_empleado ON pedido_empleado_examenes(pedido_empleado_id);
CREATE INDEX idx_pedido_empleado_examenes_estado ON pedido_empleado_examenes(estado);

CREATE INDEX idx_pedido_historial_pedido ON pedido_historial(pedido_id);
CREATE INDEX idx_pedido_historial_tipo ON pedido_historial(tipo_evento);
CREATE INDEX idx_pedido_historial_fecha ON pedido_historial(created_at);
CREATE INDEX idx_pedido_historial_usuario ON pedido_historial(usuario_id);

-- =====================================================
-- 9. VISTAS ÚTILES
-- =====================================================

-- Vista de resumen de pedidos
CREATE OR REPLACE VIEW v_pedidos_resumen AS
SELECT 
    p.id,
    p.numero_pedido,
    p.estado,
    e.razon_social AS empresa,
    e.ruc AS empresa_ruc,
    s.nombre AS sede,
    u.nombre_completo AS vendedor,
    p.fecha_creacion,
    p.fecha_aprobacion,
    p.total_cotizado,
    p.total_empleados_esperados,
    p.total_empleados_atendidos,
    p.total_empleados_no_atendidos,
    ROUND((p.total_empleados_atendidos / NULLIF(p.total_empleados_esperados, 0)) * 100, 2) AS porcentaje_atencion,
    p.total_facturado,
    p.created_at,
    p.updated_at
FROM pedidos p
JOIN empresas e ON p.empresa_id = e.id
JOIN sedes s ON p.sede_id = s.id
JOIN usuarios u ON p.vendedor_id = u.id;

-- Vista de artículos pendientes de aprobación
CREATE OR REPLACE VIEW v_articulos_pendientes_aprobacion AS
SELECT 
    pa.id AS articulo_id,
    p.numero_pedido,
    e.razon_social AS empresa,
    ex.nombre_examen,
    pa.precio_lista,
    pa.tipo_ajuste,
    pa.valor_ajuste,
    pa.precio_final,
    u.nombre_completo AS vendedor,
    p.created_at AS fecha_solicitud
FROM pedido_articulos pa
JOIN pedidos p ON pa.pedido_id = p.id
JOIN empresas e ON p.empresa_id = e.id
JOIN examenes ex ON pa.examen_id = ex.id
JOIN usuarios u ON p.vendedor_id = u.id
WHERE pa.precio_aprobado = FALSE
AND pa.tipo_ajuste != 'NINGUNO'
AND p.estado IN ('BORRADOR', 'PENDIENTE_APROBACION');

-- Vista de empleados por pedido con estado
CREATE OR REPLACE VIEW v_pedido_empleados_estado AS
SELECT 
    pe.id,
    p.numero_pedido,
    e.razon_social AS empresa,
    pe.dni,
    pe.nombre_completo,
    pe.cargo,
    pe.area,
    pe.estado,
    pe.fecha_programada,
    pe.hora_programada,
    pe.fecha_atencion,
    COUNT(DISTINCT pee.id) AS total_examenes,
    SUM(CASE WHEN pee.estado = 'COMPLETADO' THEN 1 ELSE 0 END) AS examenes_completados
FROM pedido_empleados pe
JOIN pedidos p ON pe.pedido_id = p.id
JOIN empresas e ON p.empresa_id = e.id
LEFT JOIN pedido_empleado_examenes pee ON pe.id = pee.pedido_empleado_id
GROUP BY pe.id, p.numero_pedido, e.razon_social, pe.dni, pe.nombre_completo, 
         pe.cargo, pe.area, pe.estado, pe.fecha_programada, pe.hora_programada, pe.fecha_atencion;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
