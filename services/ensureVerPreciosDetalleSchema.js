/**
 * Asegura que exista la columna `pedidos.cliente_ve_precios_individuales` y la
 * tabla `solicitudes_ver_precios_detalle`. Idempotente — se puede llamar en
 * cada arranque del servidor.
 *
 * Sin esto, POST /api/solicitudes-ver-precios-detalle falla con
 * "Error al crear solicitud" si la migración SQL nunca se corrió en el RDS.
 */
async function ensureVerPreciosDetalleSchema(pool) {
  const conn = await pool.getConnection();
  try {
    const [cols] = await conn.query(
      `SELECT COUNT(*) AS n
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'pedidos'
         AND COLUMN_NAME = 'cliente_ve_precios_individuales'`
    );
    if (Number(cols[0]?.n || 0) === 0) {
      await conn.query(
        `ALTER TABLE pedidos
         ADD COLUMN cliente_ve_precios_individuales TINYINT(1) NOT NULL DEFAULT 0`
      );
      console.log('[schema] pedidos.cliente_ve_precios_individuales añadida');
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS solicitudes_ver_precios_detalle (
        id int NOT NULL AUTO_INCREMENT,
        pedido_id int NOT NULL,
        cliente_usuario_id int NOT NULL,
        estado enum('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
        mensaje_cliente text,
        mensaje_rechazo text,
        fecha_solicitud timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_revision timestamp NULL DEFAULT NULL,
        revisado_por_usuario_id int DEFAULT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY svpd_cliente_usuario_id (cliente_usuario_id),
        KEY svpd_revisado_por_usuario_id (revisado_por_usuario_id),
        KEY idx_svpd_pedido (pedido_id),
        KEY idx_svpd_estado (estado),
        CONSTRAINT svpd_ibfk_1 FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
        CONSTRAINT svpd_ibfk_2 FOREIGN KEY (cliente_usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
        CONSTRAINT svpd_ibfk_3 FOREIGN KEY (revisado_por_usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  } finally {
    conn.release();
  }
}

module.exports = { ensureVerPreciosDetalleSchema };
