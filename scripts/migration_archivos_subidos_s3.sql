-- =============================================================================
-- TuSalud — Auditoría de archivos subidos (S3 backup)
-- =============================================================================
-- Cada archivo que el cliente / vendedor / manager sube al sistema (PDFs de
-- protocolo, hojas Excel de empleados, imágenes para OCR, etc.) se respalda
-- automáticamente en un bucket S3 y se registra acá. El propósito es:
--   1. Auditoría: si el cliente alega que subió un archivo distinto al que
--      procesamos, podemos revisar el original byte-a-byte.
--   2. Reproceso: si la lógica de parseo cambia o falla, podemos rehacer la
--      lectura sobre el archivo original sin pedirle al cliente que lo
--      vuelva a subir.
--   3. Forense: SHA-256 + tamaño detectan colisiones, manipulación o duplicados.
--
-- La fila se inserta ANTES de procesar el archivo (best-effort: si S3 está
-- caído queda registro local con `s3_key=NULL` y `estado='ERROR_S3'`).
-- =============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `archivos_subidos` (
  `id` bigint NOT NULL AUTO_INCREMENT,

  -- Quién subió el archivo (puede ser NULL si la ruta no exige autenticación
  -- en algún momento; hoy todas requieren JWT/header de actuante).
  `usuario_id` int DEFAULT NULL,
  `usuario_nombre` varchar(200) DEFAULT NULL COMMENT 'Snapshot del nombre por si el usuario se borra/cambia',
  `usuario_rol` varchar(30) DEFAULT NULL,

  -- Origen funcional: dónde se gatilló el upload (POST a esta ruta).
  -- Ej: "import.pdf-perfil-tablas", "import.pdf-texto-embebido", etc.
  -- No es FK ni enum porque queremos poder agregar fuentes sin migrar.
  `fuente` varchar(80) NOT NULL,

  -- Contexto opcional: a qué entidad de negocio se asocia el archivo.
  -- Cualquier combinación de campos puede quedar NULL. Si más adelante el
  -- archivo se asocia a una cotización/pedido, se actualiza la fila.
  `pedido_id` int DEFAULT NULL,
  `cotizacion_id` int DEFAULT NULL,
  `empresa_id` int DEFAULT NULL,

  -- Metadata del archivo tal como llegó.
  `nombre_original` varchar(500) DEFAULT NULL,
  `mime_type` varchar(150) DEFAULT NULL,
  `tamano_bytes` bigint DEFAULT NULL,
  `sha256_hex` char(64) DEFAULT NULL COMMENT 'Hash del contenido para detectar duplicados/manipulación',

  -- Ubicación en S3.
  `s3_bucket` varchar(150) DEFAULT NULL,
  `s3_key` varchar(500) DEFAULT NULL,
  `s3_region` varchar(50) DEFAULT NULL,
  `s3_etag` varchar(100) DEFAULT NULL COMMENT 'ETag devuelto por S3 (puede coincidir con MD5 hex)',
  `s3_version_id` varchar(150) DEFAULT NULL COMMENT 'Si versionado en S3 está activo',

  -- Estado del respaldo.
  `estado` enum('SUBIDO','ERROR_S3','PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',
  `error_mensaje` varchar(500) DEFAULT NULL,

  -- Timestamps.
  `subido_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_archivos_subidos_usuario` (`usuario_id`),
  KEY `idx_archivos_subidos_fuente` (`fuente`),
  KEY `idx_archivos_subidos_sha` (`sha256_hex`),
  KEY `idx_archivos_subidos_pedido` (`pedido_id`),
  KEY `idx_archivos_subidos_cotizacion` (`cotizacion_id`),
  KEY `idx_archivos_subidos_empresa` (`empresa_id`),
  CONSTRAINT `fk_archivos_subidos_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_archivos_subidos_pedido`
    FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_archivos_subidos_cotizacion`
    FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_archivos_subidos_empresa`
    FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Verificación
SELECT 'archivos_subidos' AS tabla, COUNT(*) AS filas FROM `archivos_subidos`;
