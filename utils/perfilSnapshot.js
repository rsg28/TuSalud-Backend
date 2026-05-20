/**
 * TuSalud — Helper de snapshot histórico de perfiles/exámenes.
 *
 * Problema que resuelve: cuando una cotización compromete un perfil, o cuando
 * se asigna un perfil a un paciente, queremos congelar la lista exacta de
 * exámenes en ese momento para que cambios futuros del catálogo no falsifiquen
 * los registros históricos. Ver migration_snapshot_examenes_historico.sql.
 *
 * El JSON resultante respeta una estructura cercana a la del sistema legacy
 * (cotizacion.csv → columna `perfil`) para facilitar diff/auditoría:
 *   {
 *     perfil_id, perfil_nombre, perfil_tipo, tipo_emo,
 *     snapshot_at,
 *     categorias: [
 *       { id, id_cola,
 *         examenes: [
 *           { examen_id, codigo_legacy, nombre,
 *             sexo_aplicable, edad_minima, edad_maxima, es_condicional }
 *         ] }
 *     ]
 *   }
 */

const TIPOS_EMO_VALIDOS = new Set(['PREOC', 'ANUAL', 'RETIRO', 'VISITA']);

function nowIso() {
  return new Date().toISOString();
}

function safeUpper(s) {
  return s == null ? null : String(s).toUpperCase();
}

/**
 * Construye el snapshot completo del perfil (perfil + categorías + exámenes)
 * para un (perfil_id, tipo_emo) dado.
 *
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} dbConn
 *   Pool o connection (para poder usar dentro de una transacción).
 * @param {number} perfilId
 * @param {string} tipoEmo  PREOC | ANUAL | RETIRO | VISITA
 * @returns {Promise<object|null>} JSON listo para guardar; null si el perfil
 *          no existe o no tiene exámenes para ese tipo_emo.
 */
async function buildPerfilSnapshot(dbConn, perfilId, tipoEmo) {
  if (!perfilId || !TIPOS_EMO_VALIDOS.has(safeUpper(tipoEmo))) return null;

  const [perfilRows] = await dbConn.query(
    'SELECT id, nombre, tipo FROM emo_perfiles WHERE id = ?',
    [perfilId]
  );
  if (!perfilRows || perfilRows.length === 0) return null;
  const perfil = perfilRows[0];

  // Trae todos los exámenes del perfil para ese tipo_emo, junto con su
  // categoría y código legacy. Las reglas (sexo/edad/condicional) se preservan
  // tal cual existían al momento del snapshot.
  const [filas] = await dbConn.query(
    `SELECT
        pe.examen_id,
        pe.tipo_emo,
        pe.sexo_aplicable,
        pe.edad_minima,
        pe.edad_maxima,
        pe.es_condicional,
        e.identificador  AS codigo_legacy,
        e.nombre         AS examen_nombre,
        c.id             AS categoria_id,
        c.nombre         AS categoria_nombre,
        c.id_cola        AS categoria_id_cola
       FROM emo_perfil_examenes pe
       JOIN examenes e         ON e.id = pe.examen_id
       LEFT JOIN emo_categorias c ON c.id = e.categoria_id
      WHERE pe.perfil_id = ? AND pe.tipo_emo = ?
      ORDER BY c.nombre, e.nombre`,
    [perfilId, safeUpper(tipoEmo)]
  );

  if (!filas.length) {
    // Perfil existe pero no tiene exámenes para ese tipo_emo. Devolvemos un
    // snapshot vacío explícito (no `null`) para que el llamador pueda dejar
    // constancia de que se intentó aplicar el perfil sin resultado.
    return {
      perfil_id: perfil.id,
      perfil_nombre: perfil.nombre,
      perfil_tipo: perfil.tipo,
      tipo_emo: safeUpper(tipoEmo),
      snapshot_at: nowIso(),
      categorias: [],
      total_examenes: 0,
    };
  }

  // Agrupar por categoría preservando orden de aparición.
  const categoriasOrdenadas = [];
  const categoriasIdx = new Map(); // id_cola → bucket
  for (const f of filas) {
    const key = f.categoria_id_cola || `__sin_cola__${f.categoria_id ?? 'null'}`;
    let bucket = categoriasIdx.get(key);
    if (!bucket) {
      bucket = {
        id: f.categoria_nombre || null,
        id_cola: f.categoria_id_cola || null,
        examenes: [],
      };
      categoriasIdx.set(key, bucket);
      categoriasOrdenadas.push(bucket);
    }
    bucket.examenes.push({
      examen_id: f.examen_id,
      codigo_legacy: f.codigo_legacy ?? null,
      nombre: f.examen_nombre,
      sexo_aplicable: f.sexo_aplicable || 'AMBOS',
      edad_minima: f.edad_minima ?? null,
      edad_maxima: f.edad_maxima ?? null,
      es_condicional: f.es_condicional ? 1 : 0,
    });
  }

  return {
    perfil_id: perfil.id,
    perfil_nombre: perfil.nombre,
    perfil_tipo: perfil.tipo,
    tipo_emo: safeUpper(tipoEmo),
    snapshot_at: nowIso(),
    categorias: categoriasOrdenadas,
    total_examenes: filas.length,
  };
}

/**
 * Construye el snapshot a nivel de paciente: la lista plana de los exámenes
 * que efectivamente quedaron asignados a ese paciente. Ya filtrados por las
 * reglas que aplican (sexo/edad/condicional) o por edición manual.
 *
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} dbConn
 * @param {number} pacienteId  pedido_pacientes.id
 * @param {object} [opts]
 * @param {number} [opts.perfilId]   Si se conoce el perfil que se aplicó al
 *   paciente. Sirve para enriquecer el snapshot con el nombre/tipo del perfil.
 * @param {string} [opts.tipoEmo]
 * @returns {Promise<object|null>}
 */
async function buildPacienteExamenesSnapshot(dbConn, pacienteId, opts = {}) {
  if (!pacienteId) return null;

  const [filas] = await dbConn.query(
    `SELECT
        pea.examen_id,
        e.identificador AS codigo_legacy,
        e.nombre        AS examen_nombre,
        c.id            AS categoria_id,
        c.nombre        AS categoria_nombre,
        c.id_cola       AS categoria_id_cola
       FROM paciente_examen_asignado pea
       JOIN examenes e ON e.id = pea.examen_id
       LEFT JOIN emo_categorias c ON c.id = e.categoria_id
      WHERE pea.paciente_id = ?
      ORDER BY c.nombre, e.nombre`,
    [pacienteId]
  );

  let perfilNombre = null;
  let perfilTipo = null;
  if (opts.perfilId) {
    const [pr] = await dbConn.query(
      'SELECT nombre, tipo FROM emo_perfiles WHERE id = ?',
      [opts.perfilId]
    );
    if (pr.length) {
      perfilNombre = pr[0].nombre;
      perfilTipo = pr[0].tipo;
    }
  }

  return {
    snapshot_at: nowIso(),
    perfil_id: opts.perfilId ?? null,
    perfil_nombre: perfilNombre,
    perfil_tipo: perfilTipo,
    tipo_emo: opts.tipoEmo ? safeUpper(opts.tipoEmo) : null,
    examenes: filas.map((f) => ({
      examen_id: f.examen_id,
      codigo_legacy: f.codigo_legacy ?? null,
      nombre: f.examen_nombre,
      categoria_nombre: f.categoria_nombre || null,
      categoria_id_cola: f.categoria_id_cola || null,
    })),
    total_examenes: filas.length,
  };
}

/**
 * Enriquece un snapshot de perfil ya construido con el texto exacto que traía
 * el protocolo del cliente por examen_id (evita confusiones audit/factura).
 *
 * @param {object} snap — resultado de buildPerfilSnapshot
 * @param {Array<{ examen_id: number, nombre_cliente: string }>} pairs
 */
function mergeNombresClienteEnPerfilSnapshot(snap, pairs) {
  if (!snap || !Array.isArray(pairs) || pairs.length === 0) return snap;
  const map = new Map();
  for (const p of pairs) {
    const id = Number(p.examen_id);
    const t = (p.nombre_cliente != null ? String(p.nombre_cliente) : '').trim();
    if (!Number.isFinite(id) || id <= 0 || !t) continue;
    if (!map.has(id)) map.set(id, t);
  }
  if (map.size === 0) return snap;
  const categorias = snap.categorias;
  if (!Array.isArray(categorias)) return snap;
  for (const cat of categorias) {
    const examenes = cat.examenes;
    if (!Array.isArray(examenes)) continue;
    for (const ex of examenes) {
      const nc = map.get(Number(ex.examen_id));
      if (nc) ex.nombre_cliente = nc;
    }
  }
  return snap;
}

/**
 * Mapa examen_id → precio vigente (sede específica o tarifa general; 0 si no hay fila).
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} dbConn
 * @param {number[]} examenIds
 * @param {number|null|undefined} sedeId
 */
async function getPreciosMapPorExamenIds(dbConn, examenIds, sedeId) {
  const map = new Map();
  const ids = [...new Set(
    (examenIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
  )];
  if (!ids.length) return map;

  const placeholders = ids.map(() => '?').join(',');
  const sede = sedeId != null && Number.isFinite(Number(sedeId)) ? Number(sedeId) : null;

  let rows;
  if (sede != null) {
    [rows] = await dbConn.query(
      `SELECT e.id AS examen_id,
              COALESCE(ep_sede.precio, ep_gen.precio, 0) AS precio
         FROM examenes e
         LEFT JOIN examen_precio ep_sede
           ON ep_sede.examen_id = e.id
          AND ep_sede.sede_id = ?
          AND (ep_sede.vigente_hasta IS NULL OR ep_sede.vigente_hasta >= CURDATE())
         LEFT JOIN examen_precio ep_gen
           ON ep_gen.examen_id = e.id
          AND ep_gen.sede_id IS NULL
          AND (ep_gen.vigente_hasta IS NULL OR ep_gen.vigente_hasta >= CURDATE())
        WHERE e.id IN (${placeholders})`,
      [sede, ...ids]
    );
  } else {
    [rows] = await dbConn.query(
      `SELECT e.id AS examen_id,
              COALESCE(ep_gen.precio, 0) AS precio
         FROM examenes e
         LEFT JOIN examen_precio ep_gen
           ON ep_gen.examen_id = e.id
          AND ep_gen.sede_id IS NULL
          AND (ep_gen.vigente_hasta IS NULL OR ep_gen.vigente_hasta >= CURDATE())
        WHERE e.id IN (${placeholders})`,
      ids
    );
  }

  for (const r of rows || []) {
    map.set(Number(r.examen_id), Number(r.precio) || 0);
  }
  for (const id of ids) {
    if (!map.has(id)) map.set(id, 0);
  }
  return map;
}

function parseSnapshotJson(raw) {
  if (raw == null || raw === '') return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/**
 * Añade `precio` a cada examen del snapshot (catálogo vigente al leer la cotización).
 * Si ya trae precio guardado, no lo sobrescribe.
 */
function enrichPerfilSnapshotWithPrecios(snap, preciosMap) {
  if (!snap || !Array.isArray(snap.categorias)) return snap;
  for (const cat of snap.categorias) {
    const examenes = cat.examenes;
    if (!Array.isArray(examenes)) continue;
    for (const ex of examenes) {
      const eid = Number(ex.examen_id);
      if (ex.precio != null && ex.precio !== '' && !Number.isNaN(Number(ex.precio))) {
        ex.precio = Number(ex.precio) || 0;
        continue;
      }
      ex.precio = preciosMap.get(eid) ?? 0;
    }
  }
  return snap;
}

/**
 * Enriquece examenes_snapshot_json de ítems PERFIL con precio por examen.
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} dbConn
 * @param {Array<object>} items — filas de cotizacion_items
 * @param {number|null} sedeId — sede del pedido (tarifa)
 */
async function enrichCotizacionItemsSnapshots(dbConn, items, sedeId) {
  if (!Array.isArray(items) || items.length === 0) return items;

  const examenIds = [];
  for (const it of items) {
    if (String(it.tipo_item || '').toUpperCase() !== 'PERFIL') continue;
    const snap = parseSnapshotJson(it.examenes_snapshot_json);
    if (!snap?.categorias) continue;
    for (const cat of snap.categorias) {
      for (const ex of cat.examenes || []) {
        if (ex.examen_id != null) examenIds.push(Number(ex.examen_id));
      }
    }
  }

  const preciosMap = await getPreciosMapPorExamenIds(dbConn, examenIds, sedeId);

  return items.map((it) => {
    if (String(it.tipo_item || '').toUpperCase() !== 'PERFIL' || !it.examenes_snapshot_json) {
      return it;
    }
    const snap = parseSnapshotJson(it.examenes_snapshot_json);
    if (!snap) return it;
    enrichPerfilSnapshotWithPrecios(snap, preciosMap);
    return { ...it, examenes_snapshot_json: snap };
  });
}

module.exports = {
  buildPerfilSnapshot,
  buildPacienteExamenesSnapshot,
  mergeNombresClienteEnPerfilSnapshot,
  getPreciosMapPorExamenIds,
  enrichPerfilSnapshotWithPrecios,
  enrichCotizacionItemsSnapshots,
};
