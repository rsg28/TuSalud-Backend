/**
 * Resolución de precio de examen según tramo de volumen (tarifario TuSalud).
 * - 1–15 pacientes  → precio_hasta_15  (retail)
 * - 16+ pacientes   → precio_desde_16  (mayorista; también espejo de `precio` legacy)
 */

const UMBRAL_MAYORISTA = 16;

function toNumOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coalesceNum(...vals) {
  for (const v of vals) {
    const n = toNumOrNull(v);
    if (n != null) return n;
  }
  return null;
}

/**
 * @param {object} row — filas con columnas COALESCE(sede, general) ya resueltas, o aliases crudos.
 * @param {number} [numPacientes=0]
 */
function resolvePrecioExamen(row, numPacientes = 0) {
  const hasta15 = coalesceNum(
    row.precio_hasta_15,
    row.precio_hasta_15_sede,
    row.precio_hasta_15_general,
    row.hasta15_sede,
    row.hasta15_gen,
  );
  const desde16 = coalesceNum(
    row.precio_desde_16,
    row.precio_desde_16_sede,
    row.precio_desde_16_general,
    row.desde16_sede,
    row.desde16_gen,
  );
  const legacy = coalesceNum(row.precio, row.precio_legacy, row.precio_sede, row.precio_general, row.p_sede, row.p_gen);

  const n = Number(numPacientes) || 0;
  if (n >= UMBRAL_MAYORISTA && desde16 != null) return desde16;
  if (n > 0 && n < UMBRAL_MAYORISTA && hasta15 != null) return hasta15;
  if (desde16 != null) return desde16;
  if (hasta15 != null) return hasta15;
  return legacy ?? 0;
}

/** Expresión SQL: precio aplicable según número de pacientes (placeholder o columna). */
function sqlPrecioExamenExpr(epAlias, epGenAlias, numPacientesSql) {
  return `COALESCE(
    CASE WHEN ${numPacientesSql} >= ${UMBRAL_MAYORISTA}
      THEN COALESCE(${epAlias}.precio_desde_16, ${epGenAlias}.precio_desde_16) END,
    CASE WHEN ${numPacientesSql} > 0 AND ${numPacientesSql} < ${UMBRAL_MAYORISTA}
      THEN COALESCE(${epAlias}.precio_hasta_15, ${epGenAlias}.precio_hasta_15) END,
    COALESCE(${epAlias}.precio_desde_16, ${epGenAlias}.precio_desde_16,
             ${epAlias}.precio_hasta_15, ${epGenAlias}.precio_hasta_15,
             ${epAlias}.precio, ${epGenAlias}.precio)
  )`;
}

function sqlPrecioHasta15Expr(epAlias, epGenAlias) {
  return `COALESCE(${epAlias}.precio_hasta_15, ${epGenAlias}.precio_hasta_15)`;
}

function sqlPrecioDesde16Expr(epAlias, epGenAlias) {
  return `COALESCE(${epAlias}.precio_desde_16, ${epGenAlias}.precio_desde_16, ${epAlias}.precio, ${epGenAlias}.precio)`;
}

function parseNumPacientesQuery(val) {
  if (val == null || val === '') return 0;
  const n = parseInt(String(val), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Consulta tarifa vigente (sede gana sobre global) y aplica tramo por volumen. */
async function fetchPrecioExamen(db, examenId, sedeId, numPacientes = 0) {
  const [rows] = await db.execute(
    `SELECT
       COALESCE(ep.precio_hasta_15, ep_general.precio_hasta_15) AS precio_hasta_15,
       COALESCE(ep.precio_desde_16, ep_general.precio_desde_16) AS precio_desde_16,
       COALESCE(ep.precio, ep_general.precio) AS precio
     FROM examenes e
     LEFT JOIN examen_precio ep
       ON ep.examen_id = e.id
      AND ep.sede_id = ?
      AND (ep.vigente_hasta IS NULL OR ep.vigente_hasta >= CURDATE())
     LEFT JOIN examen_precio ep_general
       ON ep_general.examen_id = e.id
      AND ep_general.sede_id IS NULL
      AND (ep_general.vigente_hasta IS NULL OR ep_general.vigente_hasta >= CURDATE())
     WHERE e.id = ?
     LIMIT 1`,
    [sedeId, examenId]
  );
  if (!rows.length) return 0;
  return resolvePrecioExamen(rows[0], numPacientes);
}

module.exports = {
  UMBRAL_MAYORISTA,
  resolvePrecioExamen,
  sqlPrecioExamenExpr,
  sqlPrecioHasta15Expr,
  sqlPrecioDesde16Expr,
  parseNumPacientesQuery,
  fetchPrecioExamen,
};
