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

module.exports = {
  buildPerfilSnapshot,
  buildPacienteExamenesSnapshot,
};
