/**
 * Mapeo heurístico: examen legacy (cotizacion.xlsx / JSON antiguo) → examen del tarifario nuevo.
 */

function stripAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Normaliza para comparación fuzzy. */
function normName(s) {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokens significativos (>=3 chars) para overlap. */
function tokens(s) {
  return normName(s)
    .split(' ')
    .filter((t) => t.length >= 3);
}

/**
 * Overrides por código legacy o fragmento del nombre normalizado.
 * Valor = substring que debe aparecer en el nombre normalizado del tarifario.
 */
const OVERRIDES_BY_CODIGO = {
  417: 'fiche medico',
  419: 'fiche medico',
  420: 'fiche medico',
  421: 'fiche medico',
  422: 'musculo esqueletica',
  424: 'grupo sanguineo',
  425: 'hemograma completo',
  426: 'glucosa',
  429: 'orina completa',
  431: 'agudeza visual',
  432: 'refraccion',
  433: 'fondo de ojo',
  435: 'ev psicologica',
  436: 'test de personalidad',
  437: 'istas',
  440: 'audiometria',
  446: 'radiografia de torax',
  448: 'electrocardiograma',
  449: 'psa',
  496: 'fiche medico',
};

const OVERRIDES_BY_NORM = {
  triaje: 'fiche medico',
  'examen clinico': 'fiche medico',
  'antecedentes personales': 'fiche medico',
  'historia ocupacional': 'fiche medico',
  'hemograma completo': 'hemograma completo',
  glucosa: 'glucosa',
  'examen completo de orina': 'orina completa',
  'examen de orina': 'orina completa',
  'audiometria aerea': 'audiometria',
  audiometria: 'audiometria',
  espirometria: 'espirometria',
  'rayos x torax': 'radiografia de torax',
  'electrocardiograma en reposo': 'electrocardiograma',
  electrocardiograma: 'electrocardiograma',
  'examen oftalmologico': 'agudeza visual',
  colesterol: 'colesterol',
  psa: 'psa',
};

/**
 * @param {Array<{ id: number, nombre: string }>} examenesTarifario
 */
function buildTarifarioIndex(examenesTarifario) {
  return examenesTarifario.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    norm: normName(e.nombre),
    tokens: tokens(e.nombre),
  }));
}

function scorePair(legacyNorm, legacyTokens, tarif) {
  if (!legacyNorm || !tarif.norm) return 0;
  if (legacyNorm === tarif.norm) return 1;

  let score = 0;
  if (tarif.norm.includes(legacyNorm) || legacyNorm.includes(tarif.norm)) {
    score = Math.max(score, 0.92);
  }

  const legacySet = new Set(legacyTokens);
  const shared = tarif.tokens.filter((t) => legacySet.has(t));
  if (shared.length > 0) {
    const ratio = shared.length / Math.max(legacyTokens.length, tarif.tokens.length, 1);
    score = Math.max(score, 0.55 + ratio * 0.35);
  }

  return score;
}

/**
 * @param {{ codigo?: number|null, nombre: string }} legacy
 * @param {ReturnType<typeof buildTarifarioIndex>} tarifIndex
 * @returns {{ examen_id: number, tarifario_nombre: string, estrategia: string, score: number } | null}
 */
function mapLegacyExamenToTarifario(legacy, tarifIndex) {
  const legacyNombre = String(legacy.nombre || '').trim();
  if (!legacyNombre) return null;

  const legacyNorm = normName(legacyNombre);
  const legacyTokens = tokens(legacyNombre);
  const codigo = legacy.codigo != null ? Number(legacy.codigo) : null;

  let needle = null;
  if (codigo != null && OVERRIDES_BY_CODIGO[codigo]) {
    needle = OVERRIDES_BY_CODIGO[codigo];
  } else if (OVERRIDES_BY_NORM[legacyNorm]) {
    needle = OVERRIDES_BY_NORM[legacyNorm];
  } else {
    for (const [k, v] of Object.entries(OVERRIDES_BY_NORM)) {
      if (legacyNorm.includes(k) || k.includes(legacyNorm)) {
        needle = v;
        break;
      }
    }
  }

  if (needle) {
    const hit = tarifIndex.find((t) => t.norm.includes(needle) || needle.includes(t.norm));
    if (hit) {
      return {
        examen_id: hit.id,
        tarifario_nombre: hit.nombre,
        estrategia: 'override',
        score: 0.99,
      };
    }
  }

  let best = null;
  let bestScore = 0;
  for (const t of tarifIndex) {
    const s = scorePair(legacyNorm, legacyTokens, t);
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }

  if (best && bestScore >= 0.72) {
    return {
      examen_id: best.id,
      tarifario_nombre: best.nombre,
      estrategia: 'fuzzy',
      score: bestScore,
    };
  }

  return null;
}

function walkLegacyExamenesFromPerfilJson(parsed, out) {
  if (!parsed) return;
  if (Array.isArray(parsed)) {
    parsed.forEach((x) => walkLegacyExamenesFromPerfilJson(x, out));
    return;
  }
  if (typeof parsed !== 'object') return;

  if (parsed.codigo != null && parsed.nombre != null) {
    out.push({
      codigo: Number(parsed.codigo),
      nombre: String(parsed.nombre).trim(),
      reglas: parsed,
    });
  }
  for (const k of Object.keys(parsed)) walkLegacyExamenesFromPerfilJson(parsed[k], out);
}

module.exports = {
  stripAccents,
  normName,
  tokens,
  buildTarifarioIndex,
  mapLegacyExamenToTarifario,
  walkLegacyExamenesFromPerfilJson,
  OVERRIDES_BY_CODIGO,
};
