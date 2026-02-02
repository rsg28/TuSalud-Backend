-- =====================================================
-- SCRIPT INICIAL DE LA BASE DE DATOS
-- =====================================================

-- INICIAR LA BASE DE DATOS
CREATE DATABASE IF NOT EXISTS tusaludDB;
USE tusaludDB;

-- =====================================================
-- CREACION DE LAS TABLAS DE IDENTIDAD
-- =====================================================
CREATE TABLE empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50),
    ruc VARCHAR(20) UNIQUE,
    razon_social VARCHAR(255),
    tipo_persona ENUM('Persona Natural', 'Juridica', 'No Domiciliado'),
    tipo_documento ENUM('DNI', 'PASAPORTE'),
    dni VARCHAR(20),
    ap_paterno VARCHAR(100),
    ap_materno VARCHAR(100),
    nombres_completos VARCHAR(255),
    direccion TEXT,
    celular VARCHAR(20),
    contacto VARCHAR(100),
    email VARCHAR(255),
    actividad_empresa VARCHAR(255),
    ubigeo VARCHAR(10),
    ciudad VARCHAR(100),
    condicion VARCHAR(100),
    estado VARCHAR(50),
    -- Información de cobranzas
    nombre_responsable_pagos VARCHAR(255),
    telefono_responsable_pagos VARCHAR(20),
    correo_responsable_pagos VARCHAR(255),
    direccion_oficina_pagos TEXT,
    fecha_presentacion_facturas DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_documento VARCHAR(50),
    dni VARCHAR(20) UNIQUE,
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100),
    nombre VARCHAR(100),
    sexo VARCHAR(20),
    fecha_nacimiento DATE,
    edad INT,
    estado_civil VARCHAR(50),
    seguro_vida VARCHAR(50),
    estudios_academicos VARCHAR(100),
    profesion VARCHAR(100),
    correo_electronico VARCHAR(255),
    celular VARCHAR(20),
    telefono_fijo VARCHAR(20),
    codigo_trabajador VARCHAR(50),
    empresa_id INT NULL, -- Empresa para la cual trabaja el paciente
    centro_costo VARCHAR(100),
    departamento VARCHAR(100),
    provincia VARCHAR(100),
    distrito VARCHAR(100),
    nacionalidad VARCHAR(100),
    ubigeo VARCHAR(10),
    direccion TEXT,
    imagen_huella VARCHAR(255),
    firma VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
);

-- =====================================================
-- CREACION DE LAS TABLAS DE EXAMENES
-- =====================================================

-- Tabla de sedes (normalizada)
CREATE TABLE sedes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de exámenes (catálogo único, sin sede ni precio)
CREATE TABLE examenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    examen_principal ENUM(
        'TRIAJE',
        'EVALUACION MEDICA OCUPACIONAL',
        'LABORATORIO',
        'OFTALMOLOGÍA',
        'EVALUACIÓN PSICOLÓGICA',
        'EVALUACIÓN AUDIOMÉTRICA',
        'ESPIROMETRIA',
        'RAYOS X',
        'EVALUACIÓN ODONTOLÓGICA',
        'EVALUACIÓN CARDIOVASCULAR',
        'EXAMEN PSICOSENSOMETRICO',
        'PRUEBA DE EMBARAZO',
        'EXAMENES TU SALUD'
    ),
    tipo_examen ENUM('Clinico', 'Laboratorio'),
    condicionales ENUM('Si', 'No'),
    nombre_examen VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de precios por examen y sede (relación muchos a muchos)
CREATE TABLE examenes_precios_sede (
    id INT AUTO_INCREMENT PRIMARY KEY,
    examen_id INT NOT NULL,
    sede_id INT NOT NULL,
    precio_base DECIMAL(10, 2) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE,
    FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_examen_sede (examen_id, sede_id)
);

-- =====================================================
-- TABLA: USUARIOS (MANEJO DE LOGIN Y REGISTRO DE USUARIOS)
-- =====================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    nombre_completo VARCHAR(255),
    telefono VARCHAR(20) NULL,
    -- RUC del usuario (opcional). En algunos casos el usuario puede ser una persona natural con negocio (RUC 10).
    ruc VARCHAR(11) NULL,
    tipo_ruc ENUM('NINGUNO', 'RUC10', 'RUC20') DEFAULT 'NINGUNO',
    rol ENUM('medico', 'manager', 'vendedor', 'cliente') DEFAULT 'cliente',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS PARA COTIZACIONES Y FACTURAS
-- =====================================================

CREATE TABLE cotizaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_cotizacion VARCHAR(50) UNIQUE,
    empresa_id INT NULL, -- En caso sea empresa
    paciente_id INT NULL, -- En caso sea una persona individual
    sede_id INT NOT NULL,
    usuario_creador_id INT, -- Usuario que creó la cotización
    fecha_cotizacion DATE NOT NULL,
    fecha_vencimiento DATE,
    estado ENUM('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA') DEFAULT 'BORRADOR',
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    descuento_total DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) DEFAULT 0.00,
    observaciones TEXT,
    condiciones_pago TEXT,
    validez_dias INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_cotizacion_empresa_o_paciente CHECK (empresa_id IS NOT NULL OR paciente_id IS NOT NULL)
);

CREATE TABLE cotizacion_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT NOT NULL,
    examen_id INT NOT NULL,
    descripcion VARCHAR(255), -- Descripción personalizada del examen en esta cotización
    cantidad INT DEFAULT 1,
    precio_lista DECIMAL(10, 2) NOT NULL, -- Precio estándar de examenes_precios_sede (solo referencia)
    tipo_descuento ENUM('MONTO', 'PORCENTAJE', 'NINGUNO') DEFAULT 'NINGUNO',
    valor_descuento DECIMAL(10, 2) DEFAULT 0.00, -- Monto o porcentaje según tipo_descuento
    descuento_aplicado DECIMAL(10, 2) DEFAULT 0.00, -- Monto calculado del descuento
    precio_final DECIMAL(10, 2) NOT NULL, -- precio_lista - descuento_aplicado 
    subtotal DECIMAL(10, 2) NOT NULL, -- precio_final * cantidad
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE
);

CREATE TABLE facturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_factura VARCHAR(50) UNIQUE,
    cotizacion_id INT NULL, -- NULL si la factura se creó sin cotización previa
    empresa_id INT NULL,
    paciente_id INT NULL,
    sede_id INT NOT NULL,
    usuario_creador_id INT,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE,
    estado ENUM('BORRADOR', 'EMITIDA', 'PAGADA', 'ANULADA', 'VENCIDA') DEFAULT 'BORRADOR',
    tipo_comprobante ENUM('FACTURA', 'BOLETA', 'RECIBO') DEFAULT 'FACTURA',
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    descuento_total DECIMAL(10, 2) DEFAULT 0.00,
    igv DECIMAL(10, 2) DEFAULT 0.00, -- 18% del subtotal
    total DECIMAL(10, 2) DEFAULT 0.00,
    forma_pago VARCHAR(100),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE SET NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_factura_empresa_o_paciente CHECK (empresa_id IS NOT NULL OR paciente_id IS NOT NULL)
);

CREATE TABLE factura_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    factura_id INT NOT NULL,
    examen_id INT NOT NULL,
    descripcion VARCHAR(255),
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(10, 2) NOT NULL, -- Precio final que se factura
    descuento_aplicado DECIMAL(10, 2) DEFAULT 0.00,
    subtotal DECIMAL(10, 2) NOT NULL, -- precio_unitario * cantidad
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLAS PARA CITAS Y RESERVAS
-- =====================================================

-- Tabla principal de citas
-- Una cita puede contener múltiples exámenes (ver cita_detalle)
CREATE TABLE citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    sede_id INT NOT NULL,
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    duracion_estimada INT DEFAULT 60, -- Minutos totales estimados para todos los exámenes
    estado ENUM('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO') DEFAULT 'PENDIENTE',
    usuario_asignado_id INT NULL, -- Médico/tecnólogo que realizará los exámenes
    factura_id INT NULL, -- Si ya pagó, relacionar con factura
    observaciones TEXT,
    motivo_cancelacion TEXT, -- Si se cancela, por qué
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (usuario_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE SET NULL
);

-- Detalle de exámenes en la cita
-- Permite que una cita tenga múltiples exámenes
CREATE TABLE cita_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cita_id INT NOT NULL,
    examen_id INT NOT NULL,
    estado ENUM('PENDIENTE', 'COMPLETADO', 'CANCELADO') DEFAULT 'PENDIENTE',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE,
    FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLAS PARA EL ALMACENAMIENTO DE EVALUACIONES
-- =====================================================
CREATE TABLE triaje (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    anos INT,
    peso DECIMAL(5, 2),
    talla DECIMAL(5, 2),
    imc DECIMAL(5, 2),
    temperatura DECIMAL(5, 2),
    frecuencia_respiratoria INT,
    saturacion_oxigeno INT,
    pulso INT,
    presion_sistolica INT,
    presion_diastolica INT,
    perimetro_cuello DECIMAL(5, 2),
    inspiracion_max DECIMAL(5, 2),
    espiracion_forzada DECIMAL(5, 2),
    cintura DECIMAL(5, 2),
    cadera DECIMAL(5, 2),
    observacion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE odontologia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    -- Odontograma: 32 dientes (numeración FDI)
    diente_18_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_17_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_16_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_15_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_14_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_13_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_12_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_11_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_21_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_22_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_23_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_24_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_25_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_26_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_27_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_28_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_48_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_47_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_46_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_45_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_44_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_43_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_42_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_41_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_31_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_32_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_33_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_34_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_35_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_36_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_37_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    diente_38_condicion ENUM('Ausen', 'PorEx', '°PzaOb', '°Corona', '°LCSup', 'OLCPro', 'PPontico', '°LCMod', '°LCSim', 'Blanco', 'DXRX'),
    -- Diagnóstico
    diagnostico VARCHAR(255),
    recomendaciones TEXT,
    diagnosticos_odontograma TEXT,
    diagnostico_otro VARCHAR(255),
    piezas_mal_estado VARCHAR(255),
    falta_piezas VARCHAR(255),
    piezas_obturadas VARCHAR(255),
    observacion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

CREATE TABLE electrocardiograma (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    ritmo VARCHAR(50),
    frecuencia VARCHAR(50),
    eje VARCHAR(50),
    onda_p VARCHAR(50),
    qrs VARCHAR(50),
    pr VARCHAR(50),
    qt VARCHAR(50),
    hallazgos TEXT,
    diagnostico ENUM('Normal', 'Anormal'),
    recomendaciones VARCHAR(255),
    otras_recomendaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

-- =====================================================
-- LABORATORIOS
-- =====================================================
CREATE TABLE laboratorio_sangre (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    -- HEMOGRAMA AUTOMATIZADO
    hemoglobina DECIMAL(5, 2),
    hematocrito DECIMAL(5, 2),
    hematies DECIMAL(5, 2),
    plaquetas INT,
    nro_leucocitos DECIMAL(5, 2),
    abastonado DECIMAL(5, 2),
    neutrofilos DECIMAL(5, 2),
    eosinofilos DECIMAL(5, 2),
    basofilos DECIMAL(5, 2),
    monocitos DECIMAL(5, 2),
    linfocitos DECIMAL(5, 2),
    hemograma_diagnostico VARCHAR(255),
    fecha_hemograma DATE,
    observacion_hemograma TEXT,
    -- GRUPO SANGUINEO Y FACTOR RH
    grupo_sanguineo VARCHAR(10),
    factor_rh VARCHAR(10),
    fecha_bioquimico DATE,
    glucosa DECIMAL(5, 2),
    t_protombina DECIMAL(5, 2),
    reticulositos DECIMAL(5, 2),
    juveniles DECIMAL(5, 2),
    vdrl_rpr VARCHAR(255),
    plomo DECIMAL(5, 2),
    anticuerpos VARCHAR(255),
    colinesteraza_plas DECIMAL(5, 2),
    observacion_bioquimico TEXT,
    -- PERFIL LIPIDICO
    colesterol DECIMAL(5, 2),
    hdl DECIMAL(5, 2),
    ldl DECIMAL(5, 2),
    vldl DECIMAL(5, 2),
    trigliceridos DECIMAL(5, 2),
    fecha_perfil_lipidico DATE,
    observacion_perfil_lipidico TEXT,
    -- OTRAS PRUEBAS
    creatinina DECIMAL(5, 2),
    tgo DECIMAL(5, 2),
    tgp DECIMAL(5, 2),
    ggtp DECIMAL(5, 2),
    velocidad_sedimentacion_globular INT,
    acido_urico DECIMAL(5, 2),
    hepatitis_a ENUM('Reactivo', 'No Reactivo'),
    hepatitis_b ENUM('Reactivo', 'No Reactivo'),
    hepatitis_c ENUM('Reactivo', 'No Reactivo'),
    hcg_sub_beta DECIMAL(5, 2),
    mercurio DECIMAL(5, 2),
    psa DECIMAL(5, 2),
    hiv ENUM('Reactivo', 'No Reactivo'),
    urea DECIMAL(5, 2),
    fecha_inmunologia DATE,
    observacion_inmunologia TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE laboratorio_orina (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    -- EXAMEN FISICO
    color VARCHAR(50),
    densidad DECIMAL(5, 3),
    aspecto VARCHAR(50),
    ph VARCHAR(50),
    reaccion VARCHAR(50),
    olor VARCHAR(50),
    -- EXAMEN BIOQUIMICO
    glucosa VARCHAR(50),
    proteinas VARCHAR(50),
    pigmento_biliares VARCHAR(50),
    urobilina VARCHAR(50),
    cuerpos_cetonicos VARCHAR(50),
    esterasa_leucocitaria VARCHAR(50),
    nitritos VARCHAR(50),
    sangre VARCHAR(50),
    acido_ascorbico VARCHAR(50),
    -- SEDIMENTO URINARIO
    celulas_epiteliales VARCHAR(50),
    leucocitos VARCHAR(50),
    piocitos VARCHAR(50),
    hematies VARCHAR(50),
    bacterias VARCHAR(50),
    cilindros VARCHAR(50),
    cristales VARCHAR(50),
    otros_sedimento VARCHAR(50),
    -- DIAGNOSTICO
    diagnostico_orina ENUM('Normal', 'Anormal'),
    fecha_examen_orina DATE,
    observacion_examen_orina TEXT,
    -- OTROS EXAMENES ESPECIALES
    cadmio_orina DECIMAL(5, 2),
    cromo_orina DECIMAL(5, 2),
    pregnosticon ENUM('Positivo', 'Negativo'),
    alcohol_saliva ENUM('Positivo', 'Negativo'),
    fecha_alcohol_saliva DATE,
    observacion_alcohol_saliva TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE laboratorio_toxicologico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    cocaina ENUM('Positivo', 'Negativo'),
    metanfetamina ENUM('Positivo', 'Negativo'),
    fenciclidina ENUM('Positivo', 'Negativo'),
    marihuana ENUM('Positivo', 'Negativo'),
    barbiturico ENUM('Positivo', 'Negativo'),
    metadona ENUM('Positivo', 'Negativo'),
    anfetamina ENUM('Positivo', 'Negativo'),
    morfina ENUM('Positivo', 'Negativo'),
    benzodiacepinas ENUM('Positivo', 'Negativo'),
    antidepresivos_triciclicos ENUM('Positivo', 'Negativo'),
    fecha_drogas DATE,
    observacion_drogas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE laboratorio_widal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    tifico_o VARCHAR(50),
    tifico_h VARCHAR(50),
    paratifico_a VARCHAR(50),
    paratifico_b VARCHAR(50),
    brucelosis VARCHAR(50),
    fecha_reaccion_widal DATE,
    diagnostico_reaccion_widal ENUM('Positivo', 'Negativo'),
    observacion_reaccion_widal TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE laboratorio_dengue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    dengue_ag_ns1 ENUM('Positivo', 'Negativo'),
    dengue_ab_igm ENUM('Positivo', 'Negativo'),
    dengue_ab_igg ENUM('Positivo', 'Negativo'),
    prueba_dengue ENUM('Positivo', 'Negativo'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE laboratorio_coprocultivo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    lleva_coprocultivo ENUM('Si', 'No'),
    -- ANTIBIOTICOS 
    ampicilina_sulbactan ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    ciprofloxacino_1 ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    sulfatrimetropin ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    gentamicina ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    amikacina ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    cefotaxima ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    tetraciclina ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    azitromicina ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    amoxicilina_ac_clavulanico ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    ceftazidime ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    fosfomicina ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    acido_naldixico ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    furoxona ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    ampicilina ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    ceftriaxone ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    levofloxacino ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    doxiciclina ENUM('SENSIBLES', 'RESISTENTES', 'INTERMEDIOS'),
    diagnostico_coprocultivo ENUM('NEGATIVO', 'POSITIVO'),
    -- OTROS CAMPOS
    germen_aislado VARCHAR(255),
    recuento_colonias VARCHAR(255),
    mecanismo_resistencia VARCHAR(255),
    diag_coprocultivo VARCHAR(255),
    fecha DATE,
    observacion_coprocultivo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: LABORATORIO - ESPECIALES
-- =====================================================
CREATE TABLE laboratorio_especiales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    
    proteinas DECIMAL(5, 2),
    pap VARCHAR(255),
    bacilo_koch VARCHAR(255),
    bk_esputo VARCHAR(255),
    diagnostico_bk_esputo ENUM('Positivo', 'Negativo'),
    bk_esputo_campana VARCHAR(255),
    fecha_bk_esputo DATE,
    obs_1_cultivo_nasofaringeo VARCHAR(255),
    obs_2_cultivo_nasofaringeo VARCHAR(255),
    diag_cultivo_nasofaringeo ENUM('Aplica', 'No Aplica'),
    raspado_unas ENUM('Negativo', 'Positivo'),
    -- HECES
    directo VARCHAR(255),
    pap_heces VARCHAR(255),
    parasitologico VARCHAR(255),
    pro_cultivo VARCHAR(255),
    observaciones_pap TEXT,
    widal_heces VARCHAR(255),
    ppd VARCHAR(255),
    ex_parasitorlogico VARCHAR(255),
    baciloscopia_tbc VARCHAR(255),
    coproparasitologico_seriado VARCHAR(255),
    campo_dropdown_sin_etiqueta VARCHAR(255),
    -- DIA 1
    dia1_leucocitos VARCHAR(50),
    dia1_mucus VARCHAR(50),
    dia1_piocitos VARCHAR(50),
    dia1_hematies VARCHAR(50),
    dia1_levaduras VARCHAR(50),
    dia1_parasitos VARCHAR(50),
    -- DIA 2
    dia2_leucocitos VARCHAR(50),
    dia2_mucus VARCHAR(50),
    dia2_piocitos VARCHAR(50),
    dia2_hematies VARCHAR(50),
    dia2_levaduras VARCHAR(50),
    dia2_parasitos VARCHAR(50),
    -- DIA 3
    dia3_leucocitos VARCHAR(50),
    dia3_mucus VARCHAR(50),
    dia3_piocitos VARCHAR(50),
    dia3_hematies VARCHAR(50),
    dia3_levaduras VARCHAR(50),
    dia3_parasitos VARCHAR(50),
    -- DIAGNOSTICO Y FECHA PARASITOLOGICO (compartidos para los 3 días)
    diag_parasitologico_simple VARCHAR(255),
    fecha_parasitologico DATE,
    -- OTROS
    otros_parasitologico_simple VARCHAR(255),
    observacion_parasitologico TEXT,
    etas_diagnostico VARCHAR(255),
    diagnostico VARCHAR(255),
    recomendaciones VARCHAR(255),
    observacion TEXT,
    anos VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE rayos_x (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    
    -- PARENQUIMATOSAS
    calidad_radiografica ENUM('Buena', 'Aceptable', 'Baja Calidad', 'Inaceptable'),
    comentario TEXT,
    causas VARCHAR(255),
    zona_afectada_derecha SET('Superior', 'Medio', 'Inferior'),
    zona_afectada_izquierda SET('Superior', 'Medio', 'Inferior'),
    profusion VARCHAR(50),
    forma_tamano_primario SET('P', 'Q', 'R', 'S', 'T', 'U'),
    forma_tamano_secundario SET('P', 'Q', 'R', 'S', 'T', 'U'),
    opacidades_grandes VARCHAR(255),
    
    -- Examen Auxiliar
    sin_neumoconiosis VARCHAR(10), -- Solo se marca "normal"
    imagen_radiografica_exposicion_polvo VARCHAR(10), -- Solo se marca "sospecha" o "no"
    examen_radiografico VARCHAR(255),
    vertices VARCHAR(255),
    hilios VARCHAR(255),
    mediastinos VARCHAR(255),
    campos_pulmonares VARCHAR(255),
    senos VARCHAR(255),
    silueta_cardiovascular VARCHAR(255),
    conclusion_radiografica TEXT,
    -- PLEURALES
    placas_pleurales ENUM("sí", "no"),
    pared_toracica_sitios ENUM("Ninguna", "Hemitorax Derecho", "Hemitorax Izquierdo"),
    pared_toracica_derecha_calcificacion ENUM("Ninguna", "Hemitorax Derecho", "Hemitorax Izquierdo"),
    de_frente_sitios ENUM("Ninguna", "Hemitorax Derecho", "Hemitorax Izquierdo"),
    de_frente_calcificacion ENUM("Ninguna", "Hemitorax Derecho", "Hemitorax Izquierdo"),
    diafragma_sitios ENUM("Ninguna", "Hemitorax Derecho", "Hemitorax Izquierdo"),
    diafragma_calcificacion ENUM("Ninguna", "Hemitorax Derecho", "Hemitorax Izquierdo"),
    otros_sitios_sitios ENUM("Ninguna", "Hemitorax Derecho", "Hemitorax Izquierdo"),
    otros_sitios_calcificacion ENUM("Ninguna", "Hemitorax Derecho", "Hemitorax Izquierdo"),
    obliteracion_angulo_costofrenico ENUM("Ninguna", "Hemitorax Derecho", "Hemitorax Izquierdo"),
   
    -- SIMBOLOS (cada símbolo como campo de texto)
    simbolos ENUM("Si", "No"),
    simbolo_aa ENUM("Si", "No"),
    simbolo_at ENUM("Si", "No"),
    simbolo_ax ENUM("Si", "No"),
    simbolo_bu ENUM("Si", "No"),
    simbolo_ca ENUM("Si", "No"),
    simbolo_cg ENUM("Si", "No"),
    simbolo_cn ENUM("Si", "No"),
    simbolo_co ENUM("Si", "No"),
    simbolo_cp ENUM("Si", "No"),
    simbolo_cv ENUM("Si", "No"),
    simbolo_di ENUM("Si", "No"),
    simbolo_ef ENUM("Si", "No"),
    simbolo_em ENUM("Si", "No"),
    simbolo_es ENUM("Si", "No"),
    simbolo_fr ENUM("Si", "No"),
    simbolo_hi ENUM("Si", "No"),
    simbolo_ho ENUM("Si", "No"),
    simbolo_id ENUM("Si", "No"),
    simbolo_ih ENUM("Si", "No"),
    simbolo_kl ENUM("Si", "No"),
    simbolo_me ENUM("Si", "No"),
    simbolo_pa ENUM("Si", "No"),
    simbolo_pb ENUM("Si", "No"),
    simbolo_pi ENUM("Si", "No"),
    simbolo_px ENUM("Si", "No"),
    simbolo_ra ENUM("Si", "No"),
    simbolo_rp ENUM("Si", "No"),
    simbolo_tb ENUM("Si", "No"),
    simbolo_od ENUM("Si", "No"),
    -- Conclusiones
    conclusion_betchel TEXT,
    diagnostico_ry ENUM('Normal', 'Anormal', 'Anormal-Paso', 'Sospechoso'),
    recomendaciones_finales TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE psicosensometrico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    -- EQUIPOS
    equipos_produccion_minera VARCHAR(255),
    equipos_livianos VARCHAR(255),
    equipos_emergencia VARCHAR(255),
    estado VARCHAR(255),
    conclusion VARCHAR(255),
    tipo_equipo_conductor VARCHAR(255),
    -- EVALUACIONES VISUALES/COGNITIVAS
    agudeza_visual_cerca_od VARCHAR(50),
    agudeza_visual_cerca_oi VARCHAR(50),
    agudeza_visual_lejos_od VARCHAR(50),
    agudeza_visual_lejos_oi VARCHAR(50),
    agudeza_visual_condicion VARCHAR(50),
    reconocimiento_señales_y_distancias VARCHAR(50),
    colores VARCHAR(50),
    colores_condicion VARCHAR(50),
    folia_lateral VARCHAR(50),
    folia_lateral_condicion VARCHAR(50),
    folia_vertical VARCHAR(50),
    folia_vertical_condicion VARCHAR(50),
    estereopsis VARCHAR(50),
    estereopsis_condicion VARCHAR(50),
    vision_nocturna VARCHAR(50),
    vision_nocturna_condicion VARCHAR(50),
    encandelamiento VARCHAR(50),
    encandelamiento_condicion VARCHAR(50),
    recuperacion_encandelamiento VARCHAR(50),
    recuperacion_encandelamiento_condicion VARCHAR(50),
    campo_visual VARCHAR(50),
    campo_visual_condicion VARCHAR(50),
    anticipacion VARCHAR(50),
    anticipacion_condicion VARCHAR(50),
    coordinacion_bimanual VARCHAR(50),
    coordinacion_bimanual_condicion VARCHAR(50),
    monotonia VARCHAR(50),
    monotonia_condicion VARCHAR(50),
    reacciones_multiples VARCHAR(50),
    reacciones_multiples_condicion VARCHAR(50),
    
    visiometria VARCHAR(255),
    palanca VARCHAR(255),
    tiempo DECIMAL(5, 2),
    error DECIMAL(5, 2),
    tiempo_espe DECIMAL(5, 2),
    punteado VARCHAR(255),
    aciertos DECIMAL(5, 2),
    permanencia DECIMAL(5, 2),
    cantidad_error DECIMAL(5, 2),
    reactimetro DECIMAL(5, 2),
    promedio DECIMAL(5, 2),
    -- CONCLUSIONES
    conclusiones TEXT,
    tipo_equipos_conduccion SET('Equipos de Produccion', 'Equipo liviano', 'Equipo de servicio', 'Conductor general', 'Conductor especial'),
    prueba_esfuerzo ENUM('Aprobado', 'Reprobado', 'No Corresponde'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE oftalmologia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    -- INFORME
    usa_lentes VARCHAR(10),
    picor_ojos VARCHAR(10),
    quemazon_ojos VARCHAR(10),
    sensacion_ver_peor VARCHAR(10),
    parpador_anexos VARCHAR(10),
    polo_anterior VARCHAR(10),
    motilidad_ocular_extrinsica VARCHAR(10),
    motilidad_ocular_intrinsica VARCHAR(10),
    campimetria_por_confrontacion VARCHAR(10),
    vision_borrosa VARCHAR(10),
    cefalea VARCHAR(10),
    deslumbramiento VARCHAR(10),
    punto_proximo_convergencia VARCHAR(10),
    vision_profundidad VARCHAR(10),
    reflejo_pupilar VARCHAR(10),
    vision_colores VARCHAR(10),
    otros VARCHAR(255),
    exposicion_computadoras VARCHAR(255),
    vision_binocular_sin_corrector VARCHAR(255),
    vision_binocular_con_corrector VARCHAR(255),
    -- AGUDEZA VISUAL
    sin_corrector_od_vision_lejos VARCHAR(50),
    sin_corrector_od_vision_cerca VARCHAR(50),
    sin_corrector_oi_vision_lejos VARCHAR(50),
    sin_corrector_oi_vision_cerca VARCHAR(50),
    con_agujero_estenopeico_od_vision_lejos VARCHAR(50),
    con_agujero_estenopeico_od_vision_cerca VARCHAR(50),
    con_agujero_estenopeico_oi_vision_lejos VARCHAR(50),
    con_agujero_estenopeico_oi_vision_cerca VARCHAR(50),
    con_corrector_od_vision_lejos VARCHAR(50),
    con_corrector_od_vision_cerca VARCHAR(50),
    con_corrector_oi_vision_lejos VARCHAR(50),
    con_corrector_oi_vision_cerca VARCHAR(50),
    tonometria_od VARCHAR(50),
    tonometria_oi VARCHAR(50),
    biomicroscopia VARCHAR(50),
    goniopscopia VARCHAR(50),
    fondo_ojo_od VARCHAR(50),
    fondo_ojo_oi VARCHAR(50),
    descripcion_agudeza TEXT,
    -- REFRACCION
    refraccion_objetiva_od VARCHAR(50),
    refraccion_objetiva_oi VARCHAR(50),
    refraccion_subjetiva_od_esferico VARCHAR(50),
    refraccion_subjetiva_od_cilindrico VARCHAR(50),
    refraccion_subjetiva_od_eje VARCHAR(50),
    refraccion_subjetiva_od_dip VARCHAR(50),
    refraccion_subjetiva_oi_esferico VARCHAR(50),
    refraccion_subjetiva_oi_cilindrico VARCHAR(50),
    refraccion_subjetiva_oi_eje VARCHAR(50),
    refraccion_subjetiva_oi_dip VARCHAR(50),
    lejos_od_esferico VARCHAR(50),
    lejos_od_cilindrico VARCHAR(50),
    lejos_od_eje VARCHAR(50),
    lejos_od_dip VARCHAR(50),
    lejos_oi_esferico VARCHAR(50),
    lejos_oi_cilindrico VARCHAR(50),
    lejos_oi_eje VARCHAR(50),
    lejos_oi_dip VARCHAR(50),
    cerca_od_esferico VARCHAR(50),
    cerca_od_cilindrico VARCHAR(50),
    cerca_od_eje VARCHAR(50),
    cerca_od_dip VARCHAR(50),
    cerca_oi_esferico VARCHAR(50),
    cerca_oi_cilindrico VARCHAR(50),
    cerca_oi_eje VARCHAR(50),
    cerca_oi_dip VARCHAR(50),
    presion_intraocular_od VARCHAR(50),
    presion_intraocular_oi VARCHAR(50),
    explicaciones TEXT,
    diagnostico_general VARCHAR(255),
    especificaciones_od VARCHAR(255),
    especificaciones_oi VARCHAR(255),
    recomendacion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE audiometria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    -- INFORME
    cumple_requisitos_audiometria VARCHAR(10),
    rinitis VARCHAR(10),
    sinusitis VARCHAR(10),
    acufenos VARCHAR(10),
    vertigo VARCHAR(10),
    parotiditis VARCHAR(10),
    sarampion VARCHAR(10),
    mareos VARCHAR(10),
    otalgia VARCHAR(10),
    consumo_tabaco VARCHAR(10),
    servicio_militar VARCHAR(10),
    hobbies_exposicion_ruido VARCHAR(10),
    exposicion_laboral_quimicos VARCHAR(10),
    exposicion_ruido VARCHAR(10),
    otitis_media_cronica VARCHAR(10),
    practica_tiro VARCHAR(10),
    secrecion_otica_anormal VARCHAR(10),
    sordera_ocupacional VARCHAR(10),
    infecciones_oidos VARCHAR(10),
    uso_ototoxicos VARCHAR(10),
    disminucion_audicion VARCHAR(10),
    dolor_oidos VARCHAR(10),
    meningitis VARCHAR(10),
    antecedente_timpanoplastia VARCHAR(10),
    zumbido_oidos VARCHAR(10),
    sordera VARCHAR(10),

    -- EVALUACION
    descripcion_fuentes_ruido TEXT,
    porcentaje_uso_epp_auditivo VARCHAR(50),
    tiempo_exposicion_dia_horas VARCHAR(50),
    uso_tapones VARCHAR(10),
    uso_orejeras VARCHAR(10),
    otoscopia_oido_derecho VARCHAR(50),
    otoscopia_oido_izquierdo VARCHAR(50),
    -- FRECUENCIA
    
    comentario_frecuencia TEXT,
    -- =FRECUENCIAS VIA AEREA - OIDO DERECHO
    frecuencia_125_via_aerea_od DECIMAL(5, 2),
    frecuencia_250_via_aerea_od DECIMAL(5, 2),
    frecuencia_500_via_aerea_od DECIMAL(5, 2),
    frecuencia_1000_via_aerea_od DECIMAL(5, 2),
    frecuencia_2000_via_aerea_od DECIMAL(5, 2),
    frecuencia_3000_via_aerea_od DECIMAL(5, 2),
    frecuencia_4000_via_aerea_od DECIMAL(5, 2),
    frecuencia_6000_via_aerea_od DECIMAL(5, 2),
    frecuencia_8000_via_aerea_od DECIMAL(5, 2),
    graficar_via_aerea_od VARCHAR(10),
    -- =FRECUENCIAS VIA AEREA - OIDO IZQUIERDO
    frecuencia_125_via_aerea_oi DECIMAL(5, 2),
    frecuencia_250_via_aerea_oi DECIMAL(5, 2),
    frecuencia_500_via_aerea_oi DECIMAL(5, 2),
    frecuencia_1000_via_aerea_oi DECIMAL(5, 2),
    frecuencia_2000_via_aerea_oi DECIMAL(5, 2),
    frecuencia_3000_via_aerea_oi DECIMAL(5, 2),
    frecuencia_4000_via_aerea_oi DECIMAL(5, 2),
    frecuencia_6000_via_aerea_oi DECIMAL(5, 2),
    frecuencia_8000_via_aerea_oi DECIMAL(5, 2),
    graficar_via_aerea_oi VARCHAR(10),
    -- FRECUENCIAS VIA OSEA - OIDO DERECHO
    frecuencia_125_via_osea_od DECIMAL(5, 2),
    frecuencia_250_via_osea_od DECIMAL(5, 2),
    frecuencia_500_via_osea_od DECIMAL(5, 2),
    frecuencia_1000_via_osea_od DECIMAL(5, 2),
    frecuencia_2000_via_osea_od DECIMAL(5, 2),
    frecuencia_3000_via_osea_od DECIMAL(5, 2),
    frecuencia_4000_via_osea_od DECIMAL(5, 2),
    frecuencia_6000_via_osea_od DECIMAL(5, 2),
    frecuencia_8000_via_osea_od DECIMAL(5, 2),
    graficar_via_osea_od VARCHAR(10),
    -- FRECUENCIAS VIA OSEA - OIDO IZQUIERDO
    frecuencia_125_via_osea_oi DECIMAL(5, 2),
    frecuencia_250_via_osea_oi DECIMAL(5, 2),
    frecuencia_500_via_osea_oi DECIMAL(5, 2),
    frecuencia_1000_via_osea_oi DECIMAL(5, 2),
    frecuencia_2000_via_osea_oi DECIMAL(5, 2),
    frecuencia_3000_via_osea_oi DECIMAL(5, 2),
    frecuencia_4000_via_osea_oi DECIMAL(5, 2),
    frecuencia_6000_via_osea_oi DECIMAL(5, 2),
    frecuencia_8000_via_osea_oi DECIMAL(5, 2),
    graficar_via_osea_oi VARCHAR(10),
    handicap_auditivo TEXT,
    -- TIMPANOS
    timpano_derecho_triangulo_luz VARCHAR(255),
    timpano_derecho_perforaciones VARCHAR(255),
    timpano_derecho_abombamientos VARCHAR(255),
    timpano_derecho_cerumen VARCHAR(255),
    timpano_derecho_audicion VARCHAR(10),
    timpano_izquierdo_triangulo_luz VARCHAR(255),
    timpano_izquierdo_perforaciones VARCHAR(255),
    timpano_izquierdo_abombamientos VARCHAR(255),
    timpano_izquierdo_cerumen VARCHAR(255),
    timpano_izquierdo_audicion VARCHAR(10),
    -- DIAGNOSTICO KLOCKHOFF
    diagnostico_od VARCHAR(255),
    diagnostico_oi VARCHAR(255),
    diagnostico_doctor VARCHAR(255),
    recomendaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE espirometria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    peso DECIMAL(5, 2),
    talla DECIMAL(5, 2),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    funcion_respiratoria VARCHAR(255),
    fvc VARCHAR(50),
    fev1_fvc VARCHAR(50),
    fef_25_75 VARCHAR(50),
    mmv VARCHAR(50),
    informe VARCHAR(255),
    interpretacion TEXT,
    diagnostico VARCHAR(255),
    recomendaciones TEXT,
    fumador VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

CREATE TABLE psicologia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    cita_id INT NULL, -- Relación con la cita donde se realizó este examen
    nombres_completos VARCHAR(255),
    dni VARCHAR(20),
    ruc VARCHAR(20),
    empresa VARCHAR(255),
    -- TRABAJOS DE RIESGO
    conduccion_operacion_equipos VARCHAR(10),
    trabajo_altura VARCHAR(10),
    bajo_agua VARCHAR(10),
    desnivel VARCHAR(10),
    otros_trabajos_riesgo VARCHAR(255),
    -- ANTECEDENTES
    enfermedades TEXT,
    tabaco ENUM("No","Poco", "Regular", "Excesivo"),
    alcohol ENUM("No","Poco", "Regular", "Excesivo"),
    drogas ENUM("No","Poco", "Regular", "Excesivo"),
    habitos TEXT,
    antecedentes_familiares TEXT,
    pasatiempos TEXT,
    otros_antecedentes TEXT,
    -- = OBSERVACION DE CONDUCTAS
    presentacion ENUM("Adecuado", "Inadecuado"),
    postura ENUM("Erguido", "Encorvado"),
    discurso_ritmo VARCHAR(255),
    discurso_tono VARCHAR(255),
    discurso_articulacion VARCHAR(255),
    orientacion_tiempo VARCHAR(255),
    orientacion_espacio VARCHAR(255),
    orientacion_persona VARCHAR(255),
    
    -- EXAMEN MENTAL 
    -- = PROCESOS COGNITIVOS
    lucidez_atencion VARCHAR(255),
    pensamiento VARCHAR(255),
    percepcion VARCHAR(255),
    -- = MEMORIA
    memoria_corto_plazo VARCHAR(255),
    memoria_mediano_plazo VARCHAR(255),
    memoria_largo_plazo VARCHAR(255),
    inteligencia VARCHAR(255),
    apetito VARCHAR(255),
    sueno VARCHAR(255),
    coordinacion_visomotora VARCHAR(255),
    atencion_concentracion VARCHAR(255),
    memoria VARCHAR(255),
    salud_mental VARCHAR(255),
    relaciones_interpersonales VARCHAR(255),
    pruebas_psicologicas VARCHAR(255),
    -- EXAMEN MENTAL - EVALUACION
    afectividad VARCHAR(50),
    ansiedad VARCHAR(50),
    acrofobia VARCHAR(50),
    claustrofobia VARCHAR(50),
    depresion VARCHAR(50),
    estres VARCHAR(50),
    fatiga VARCHAR(50),
    inteligencia_emocional VARCHAR(50),
    percepcion_del_riesgo VARCHAR(50),
    percepcion_viso_espacial VARCHAR(50),
    riesgos_psicosociales VARCHAR(50),
    somnolencia VARCHAR(50),
    liderazgo VARCHAR(50),
    asertividad VARCHAR(50),
    oit VARCHAR(50),
    yoshitake VARCHAR(50),
    epworth VARCHAR(50),
    goldberg VARCHAR(50),
    barrat VARCHAR(50),
    cohen VARCHAR(50),
    audit VARCHAR(50),
    bender VARCHAR(50),
    acrofobia_cohen VARCHAR(50),
    claustrofobia_cohen VARCHAR(50),
    wleis_afectividad VARCHAR(50),
    istas VARCHAR(50),
    toulouse VARCHAR(50),
    minimental VARCHAR(10),
    inv_personalidad_minimult VARCHAR(10),
    cuestionario_acrofobia_cohen VARCHAR(10),
    persona_bajo_lluvia VARCHAR(10),
    test_benton VARCHAR(10),
    observacion_conducta VARCHAR(10),
    escala_inteligencia_wpt VARCHAR(10),
    inventario_burnout_maslach VARCHAR(10),
    test_proyectivo VARCHAR(10),
    -- RESULTADOS
    anual VARCHAR(255),
    area_intelectual TEXT,
    area_personalidad TEXT,
    area_laboral TEXT,
    -- CONCLUSION
    conclusion ENUM('APTO', 'APTO CON RECOMENDACIONES', 'NO APTO'),
    recomendaciones TEXT,
    agorafobia VARCHAR(10),
    descripcion_agorafobia VARCHAR(255),
    descripcion_aptitud VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: EXPEDIENTES
-- =====================================================
-- Esta tabla es para añadir notas a los expedientes de los pacientes.
-- Sin embargo a la hora de recopilar los examenes y evaluaciones registradas, se tiene que hacer JOIN utilizando el paciente_id.
CREATE TABLE expedientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    numero_expediente VARCHAR(50) UNIQUE,
    fecha_apertura DATE,
    estado VARCHAR(50),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX idx_pacientes_dni ON pacientes(dni);
CREATE INDEX idx_pacientes_nombre ON pacientes(nombre, apellido_paterno, apellido_materno);
CREATE INDEX idx_empresas_ruc ON empresas(ruc);
CREATE INDEX idx_expedientes_paciente ON expedientes(paciente_id);
CREATE INDEX idx_expedientes_numero ON expedientes(numero_expediente);
CREATE INDEX idx_cotizaciones_empresa ON cotizaciones(empresa_id);
CREATE INDEX idx_cotizaciones_paciente ON cotizaciones(paciente_id);
CREATE INDEX idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX idx_cotizaciones_fecha ON cotizaciones(fecha_cotizacion);
CREATE INDEX idx_cotizacion_detalle_cotizacion ON cotizacion_detalle(cotizacion_id);
CREATE INDEX idx_facturas_empresa ON facturas(empresa_id);
CREATE INDEX idx_facturas_paciente ON facturas(paciente_id);
CREATE INDEX idx_facturas_estado ON facturas(estado);
CREATE INDEX idx_facturas_fecha ON facturas(fecha_emision);
CREATE INDEX idx_factura_detalle_factura ON factura_detalle(factura_id);
CREATE INDEX idx_examenes_precios_sede_examen ON examenes_precios_sede(examen_id);
CREATE INDEX idx_examenes_precios_sede_sede ON examenes_precios_sede(sede_id);
CREATE INDEX idx_citas_paciente ON citas(paciente_id);
CREATE INDEX idx_citas_sede ON citas(sede_id);
CREATE INDEX idx_citas_fecha_hora ON citas(fecha_cita, hora_cita);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_factura ON citas(factura_id);
CREATE INDEX idx_cita_detalle_cita ON cita_detalle(cita_id);
CREATE INDEX idx_cita_detalle_examen ON cita_detalle(examen_id);

-- =====================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- =====================================================
-- Índices en cita_id de todas las tablas de evaluaciones
CREATE INDEX idx_triaje_cita ON triaje(cita_id);
CREATE INDEX idx_odontologia_cita ON odontologia(cita_id);
CREATE INDEX idx_electrocardiograma_cita ON electrocardiograma(cita_id);
CREATE INDEX idx_laboratorio_sangre_cita ON laboratorio_sangre(cita_id);
CREATE INDEX idx_laboratorio_orina_cita ON laboratorio_orina(cita_id);
CREATE INDEX idx_laboratorio_toxicologico_cita ON laboratorio_toxicologico(cita_id);
CREATE INDEX idx_laboratorio_widal_cita ON laboratorio_widal(cita_id);
CREATE INDEX idx_laboratorio_dengue_cita ON laboratorio_dengue(cita_id);
CREATE INDEX idx_laboratorio_coprocultivo_cita ON laboratorio_coprocultivo(cita_id);
CREATE INDEX idx_laboratorio_especiales_cita ON laboratorio_especiales(cita_id);
CREATE INDEX idx_rayos_x_cita ON rayos_x(cita_id);
CREATE INDEX idx_psicosensometrico_cita ON psicosensometrico(cita_id);
CREATE INDEX idx_oftalmologia_cita ON oftalmologia(cita_id);
CREATE INDEX idx_audiometria_cita ON audiometria(cita_id);
CREATE INDEX idx_espirometria_cita ON espirometria(cita_id);
CREATE INDEX idx_psicologia_cita ON psicologia(cita_id);

-- Índices adicionales
CREATE INDEX idx_pacientes_empresa ON pacientes(empresa_id);
CREATE INDEX idx_examenes_nombre ON examenes(nombre_examen);
CREATE INDEX idx_examenes_activo ON examenes(activo);

-- =====================================================
-- FIN
-- =====================================================
