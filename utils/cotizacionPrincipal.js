const MSG_SIN_PRINCIPAL_APROBADA =
  'Solo se pueden crear cotizaciones complementarias cuando existe una cotización principal aprobada en el pedido.';

/**
 * Verifica que la cotización base sea principal y esté APROBADA.
 * @returns {number} id de la cotización base
 */
async function assertCotizacionBaseAprobada(connection, pedido_id, cotizacion_base_id) {
  const [rows] = await connection.execute(
    `SELECT id FROM cotizaciones
     WHERE id = ? AND pedido_id = ? AND es_complementaria = 0 AND estado = 'APROBADA'`,
    [cotizacion_base_id, pedido_id]
  );
  if (rows.length === 0) {
    throw Object.assign(new Error(MSG_SIN_PRINCIPAL_APROBADA), { code: 'NO_PRINCIPAL_APROBADA' });
  }
  return Number(rows[0].id);
}

/**
 * Id de la cotización principal APROBADA del pedido, o null si no hay ninguna.
 */
async function obtenerCotizacionPrincipalAprobadaId(connection, pedido_id) {
  const [pedidoRows] = await connection.execute(
    'SELECT cotizacion_principal_id FROM pedidos WHERE id = ?',
    [pedido_id]
  );
  const principalId = pedidoRows[0]?.cotizacion_principal_id;
  if (principalId != null) {
    try {
      return await assertCotizacionBaseAprobada(connection, pedido_id, principalId);
    } catch (err) {
      if (err?.code !== 'NO_PRINCIPAL_APROBADA') throw err;
    }
  }

  const [cots] = await connection.execute(
    `SELECT id FROM cotizaciones
     WHERE pedido_id = ? AND es_complementaria = 0 AND estado = 'APROBADA'
     ORDER BY id DESC
     LIMIT 1`,
    [pedido_id]
  );
  return cots[0]?.id != null ? Number(cots[0].id) : null;
}

module.exports = {
  MSG_SIN_PRINCIPAL_APROBADA,
  assertCotizacionBaseAprobada,
  obtenerCotizacionPrincipalAprobadaId,
};
