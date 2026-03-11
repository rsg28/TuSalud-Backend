-- Tabla para códigos OTP de restablecimiento de contraseña (email)
-- Ejecutar una sola vez en la BD de producción:
-- mysql -h <host> -u <user> -p <db> < alter_password_reset_codes.sql

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prc_user_id (user_id),
  INDEX idx_prc_expires_at (expires_at),
  CONSTRAINT fk_prc_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

