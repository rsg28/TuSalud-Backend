/**
 * Total de cotización: siempre derivado de cotizacion_items (no usar cotizaciones.total en lecturas).
 */

function calcularTotalDesdeItems(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, it) => {
    const sub = it.subtotal != null && Number.isFinite(Number(it.subtotal))
      ? Number(it.subtotal)
      : (Number(it.precio_final) || 0) * (Number(it.cantidad) || 1);
    return acc + sub;
  }, 0);
}

async function obtenerTotalCotizacion(connection, cotizacionId) {
  const [rows] = await connection.execute(
    'SELECT COALESCE(SUM(subtotal), 0) AS total FROM cotizacion_items WHERE cotizacion_id = ?',
    [cotizacionId]
  );
  return Number(rows[0]?.total ?? 0);
}

async function obtenerTotalesPorCotizacionIds(connection, ids) {
  const uniq = [...new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (uniq.length === 0) return new Map();
  const ph = uniq.map(() => '?').join(',');
  const [rows] = await connection.execute(
    `SELECT cotizacion_id, COALESCE(SUM(subtotal), 0) AS total
     FROM cotizacion_items WHERE cotizacion_id IN (${ph}) GROUP BY cotizacion_id`,
    uniq
  );
  return new Map(rows.map((r) => [Number(r.cotizacion_id), Number(r.total)]));
}

function aplicarTotalCalculado(cotizacion, total) {
  if (!cotizacion || typeof cotizacion !== 'object') return cotizacion;
  return { ...cotizacion, total: Number(total) || 0 };
}

async function aplicarTotalesCalculados(connection, cotizaciones) {
  if (!Array.isArray(cotizaciones) || cotizaciones.length === 0) return cotizaciones;
  const map = await obtenerTotalesPorCotizacionIds(
    connection,
    cotizaciones.map((c) => c.id)
  );
  return cotizaciones.map((c) => aplicarTotalCalculado(c, map.get(Number(c.id)) ?? 0));
}

async function cotizacionConTotalCalculado(connection, cotizacion) {
  if (!cotizacion) return cotizacion;
  const total = await obtenerTotalCotizacion(connection, cotizacion.id);
  return aplicarTotalCalculado(cotizacion, total);
}

module.exports = {
  calcularTotalDesdeItems,
  obtenerTotalCotizacion,
  obtenerTotalesPorCotizacionIds,
  aplicarTotalCalculado,
  aplicarTotalesCalculados,
  cotizacionConTotalCalculado,
};
