SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE cotizaciones ADD COLUMN notas_manager TEXT NULL;

DROP TABLE IF EXISTS solicitud_agregar_examenes;
DROP TABLE IF EXISTS solicitud_agregar_paciente;
DROP TABLE IF EXISTS solicitudes_agregar;

CREATE TABLE solicitudes_agregar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  cliente_usuario_id INT NOT NULL,
  estado ENUM('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  mensaje_cliente TEXT NULL,
  mensaje_rechazo TEXT NULL,
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_revision TIMESTAMP NULL,
  revisado_por_usuario_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (revisado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE solicitud_agregar_paciente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id INT NOT NULL,
  pedido_paciente_id INT NULL,
  dni VARCHAR(20) NULL,
  nombre_completo VARCHAR(200) NULL,
  cargo VARCHAR(150) NULL,
  area VARCHAR(150) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes_agregar(id) ON DELETE CASCADE,
  FOREIGN KEY (pedido_paciente_id) REFERENCES pedido_pacientes(id) ON DELETE CASCADE
);

CREATE TABLE solicitud_agregar_examenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id INT NOT NULL,
  solicitud_agregar_paciente_id INT NULL,
  examen_id INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes_agregar(id) ON DELETE CASCADE,
  FOREIGN KEY (solicitud_agregar_paciente_id) REFERENCES solicitud_agregar_paciente(id) ON DELETE CASCADE,
  FOREIGN KEY (examen_id) REFERENCES examenes(id) ON DELETE RESTRICT
);

CREATE INDEX idx_solicitudes_agregar_pedido ON solicitudes_agregar(pedido_id);
CREATE INDEX idx_solicitudes_agregar_estado ON solicitudes_agregar(estado);
CREATE INDEX idx_solicitud_agregar_paciente_solicitud ON solicitud_agregar_paciente(solicitud_id);
CREATE INDEX idx_solicitud_agregar_examenes_solicitud ON solicitud_agregar_examenes(solicitud_id);

SET FOREIGN_KEY_CHECKS = 1;
