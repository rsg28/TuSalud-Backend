/**
 * Numeración atómica de pedidos / cotizaciones / facturas.
 *
 * Reemplaza el patrón `SELECT MAX(id) + 1 FROM <tabla>` (sin lock) que era
 * propenso a colisiones con dos vendedores creando documentos a la vez.
 *
 * Usa la técnica clásica de MySQL:
 *   INSERT INTO serie_numeracion (tipo, anio, valor)
 *   VALUES (?, ?, 1)
 *   ON DUPLICATE KEY UPDATE valor = LAST_INSERT_ID(valor + 1);
 *
 * `LAST_INSERT_ID(expr)` guarda la nueva expresión en la sesión y la devuelve
 * con `SELECT LAST_INSERT_ID()`. Es atómico dentro de una sola query y
 * compatible con la transacción del caller si se pasa `connection`.
 *
 * Requisitos:
 *   - Migración `scripts/migration_concurrencia_fixes.sql` aplicada.
 *   - El caller pasa la `connection` activa de la transacción (recomendado)
 *     o, en su defecto, usa el pool global (`require('../config/database')`).
 */

const pool = require('../config/database');

/**
 * Devuelve el siguiente valor de la serie `(tipo, anio)`, incrementando el
 * contador en BD de forma atómica. Si la fila no existe, la crea con valor 1.
 *
 * @param {object} executor Conexión transaccional (preferido) o pool.
 * @param {string} tipo     'PEDIDO' | 'COTIZACION' | 'COTIZACION_COMP' | 'FACTURA'
 * @param {number} [anio]   Año del contador. Por defecto, el año actual.
 * @returns {Promise<number>}
 */
async function nextSerie(executor, tipo, anio) {
  if (!tipo || typeof tipo !== 'string') {
    throw new Error('nextSerie: tipo requerido');
  }
  const year = Number.isFinite(anio) ? anio : new Date().getFullYear();
  const runner = executor && typeof executor.execute === 'function' ? executor : pool;

  await runner.execute(
    `INSERT INTO serie_numeracion (tipo, anio, valor)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE valor = LAST_INSERT_ID(valor + 1)`,
    [tipo, year]
  );
  const [rows] = await runner.execute('SELECT LAST_INSERT_ID() AS v');
  const v = Number(rows?.[0]?.v);
  if (!Number.isFinite(v) || v <= 0) {
    throw new Error(`nextSerie: valor inválido recibido (${rows?.[0]?.v})`);
  }
  return v;
}

/**
 * Helpers de formato. Mantenemos el formato `XXX-YYYY-NNNNNN` que la app ya usa.
 */
function fmtNumero(prefijo, anio, valor) {
  return `${prefijo}-${anio}-${String(valor).padStart(6, '0')}`;
}

async function siguienteNumeroPedido(connection) {
  const anio = new Date().getFullYear();
  const v = await nextSerie(connection, 'PEDIDO', anio);
  return fmtNumero('PED', anio, v);
}

async function siguienteNumeroCotizacion(connection) {
  const anio = new Date().getFullYear();
  const v = await nextSerie(connection, 'COTIZACION', anio);
  return fmtNumero('COT', anio, v);
}

async function siguienteNumeroCotizacionComplementaria(connection) {
  const anio = new Date().getFullYear();
  const v = await nextSerie(connection, 'COTIZACION_COMP', anio);
  return fmtNumero('COT-COMP', anio, v);
}

async function siguienteNumeroFactura(connection) {
  const anio = new Date().getFullYear();
  const v = await nextSerie(connection, 'FACTURA', anio);
  return fmtNumero('FAC', anio, v);
}

module.exports = {
  nextSerie,
  siguienteNumeroPedido,
  siguienteNumeroCotizacion,
  siguienteNumeroCotizacionComplementaria,
  siguienteNumeroFactura,
};
