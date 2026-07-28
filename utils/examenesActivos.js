/**
 * Validación de exámenes activos del catálogo.
 * Tras un soft-delete (`examenes.activo = 0`) el ID sigue existiendo (FK),
 * pero no debe usarse en cotizaciones/perfiles/pedidos nuevos.
 */

function uniqPositiveIds(ids) {
  return [
    ...new Set(
      (ids || [])
        .map((x) => parseInt(String(x), 10))
        .filter((n) => Number.isInteger(n) && n > 0)
    ),
  ];
}

/**
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} db
 * @param {Array<number|string>} examenIds
 * @param {{ allowIds?: Array<number|string> }} [opts] — IDs ya presentes en un documento histórico (permitidos al reeditar)
 * @throws {Error & { code: 'EXAMENES_INACTIVOS', inactivos: object[], faltantes: number[] }}
 */
async function assertExamenesActivos(db, examenIds, opts = {}) {
  const allow = new Set(uniqPositiveIds(opts.allowIds || []));
  const ids = uniqPositiveIds(examenIds).filter((id) => !allow.has(id));
  if (ids.length === 0) return { ok: true, inactivos: [], faltantes: [] };

  const ph = ids.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT id, nombre, activo FROM examenes WHERE id IN (${ph})`,
    ids
  );
  const byId = new Map(rows.map((r) => [Number(r.id), r]));
  const faltantes = [];
  const inactivos = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) faltantes.push(id);
    else if (!Number(row.activo)) {
      inactivos.push({ id, nombre: row.nombre || `Examen #${id}` });
    }
  }

  if (faltantes.length || inactivos.length) {
    const parts = [];
    if (inactivos.length) {
      parts.push(
        `Exámenes retirados del catálogo: ${inactivos.map((x) => x.nombre).join(', ')}. Quítalos o reemplázalos antes de guardar.`
      );
    }
    if (faltantes.length) {
      parts.push(`Exámenes inexistentes: ${faltantes.map((id) => `#${id}`).join(', ')}`);
    }
    const err = new Error(parts.join(' '));
    err.code = 'EXAMENES_INACTIVOS';
    err.inactivos = inactivos;
    err.faltantes = faltantes;
    throw err;
  }

  return { ok: true, inactivos: [], faltantes: [] };
}

/**
 * Recolecta examen_id de ítems normalizados de cotización (EXAMEN + detalle snapshot).
 * @param {object[]} itemsNorm
 */
function collectExamenIdsFromCotizacionItems(itemsNorm) {
  const ids = [];
  for (const it of itemsNorm || []) {
    if (it.tipo_item === 'EXAMEN' && it.examen_id) ids.push(it.examen_id);
    if (Array.isArray(it.examenes_nombre_cliente)) {
      for (const row of it.examenes_nombre_cliente) {
        if (row?.examen_id) ids.push(row.examen_id);
      }
    }
    if (it.examenes_snapshot_json) {
      try {
        const snap =
          typeof it.examenes_snapshot_json === 'string'
            ? JSON.parse(it.examenes_snapshot_json)
            : it.examenes_snapshot_json;
        if (snap?.examen_id) ids.push(snap.examen_id);
        for (const cat of snap?.categorias || []) {
          for (const ex of cat.examenes || []) {
            if (ex?.examen_id) ids.push(ex.examen_id);
          }
        }
        for (const ex of snap?.examenes || []) {
          if (ex?.examen_id) ids.push(ex.examen_id);
        }
      } catch {
        /* snapshot malformado: lo ignoramos aquí; insertará o fallará después */
      }
    }
  }
  return uniqPositiveIds(ids);
}

module.exports = {
  assertExamenesActivos,
  collectExamenIdsFromCotizacionItems,
  uniqPositiveIds,
};
