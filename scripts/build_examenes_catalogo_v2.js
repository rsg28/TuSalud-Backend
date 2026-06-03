/* eslint-disable no-console */
/**
 * build_examenes_catalogo_v2.js
 * -----------------------------------------------------------------------------
 * Genera el SQL de datos para la migración del catálogo de exámenes v2.
 *
 * Entradas:
 *   - examen (1).csv                → catálogo legacy completo (~1500 exámenes)
 *   - Tarifario Base SO TU SALUD SAC.xlsx → 177 exámenes con dos precios
 *
 * Salida:
 *   - migration_examenes_catalogo_v2_data.sql (idempotente, ejecutable en MySQL)
 *
 * Decisiones:
 *   - "Reset suave": todos los `examenes.activo` actuales se ponen en 0; el
 *     script vuelve a activar los exámenes que estén en el CSV o en el Excel.
 *     No se borra nada → cotizaciones/facturas históricas siguen vivas.
 *   - Identificador legacy del CSV (416, 419, ...) es la clave de upsert.
 *     Los exámenes del Excel sin match en el CSV se insertan con
 *     identificador NULL.
 *   - Categorías: unión consolidada (CSV ∪ Excel) — equivalentes obvias se
 *     unifican mediante un mapa de alias; lo único de cada archivo se preserva.
 *   - Precios: si el examen está en el Excel, usa los dos tramos; si solo está
 *     en el CSV, el precio del CSV se replica en ambos tramos. `precio` (col
 *     legacy) = precio_desde_16.
 * -----------------------------------------------------------------------------
 * Uso:
 *   node TuSalud-Backend/scripts/build_examenes_catalogo_v2.js \
 *     --csv "C:/Users/rgome/Downloads/examen (1).csv" \
 *     --xlsx "C:/Users/rgome/Downloads/Tarifario Base  S.O. TU SALUD SAC (2).xlsx" \
 *     --out TuSalud-Backend/scripts/migration_examenes_catalogo_v2_data.sql
 */

const fs = require('fs');
const path = require('path');

// `exceljs` está como dependencia del backend.
const ExcelJS = require('exceljs');

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

const args = parseArgs(process.argv);
const CSV_PATH = args.csv;
const XLSX_PATH = args.xlsx;
const OUT_PATH =
  args.out || path.join(__dirname, 'migration_examenes_catalogo_v2_data.sql');

if (!CSV_PATH || !XLSX_PATH) {
  console.error('Uso: node build_examenes_catalogo_v2.js --csv <ruta> --xlsx <ruta> [--out <ruta>]');
  process.exit(1);
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function norm(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function escSql(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (typeof value === 'number') return String(value);
  // MySQL: doblar comillas simples y escapar backslash básico.
  return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

function escSqlDecimal(value) {
  if (value === null || value === undefined || value === '' || value === 'NULL') return 'NULL';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'NULL';
  return n.toFixed(2);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const parseLine = (line) => {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
        continue;
      }
      if (c === ';' && !inQ) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += c;
    }
    out.push(cur);
    return out;
  };
  const head = parseLine(lines[0]);
  const idx = (name) => head.indexOf(name);
  const cols = {
    id: idx('id'),
    nombre: idx('nombre_examen'),
    tipo: idx('tipo_examen'),
    estado: idx('estado'),
    rango: idx('rango'),
    parent: idx('cod_parent'),
    cod_admin_cola: idx('cod_admin_cola'),
    precio_general: idx('precio_general'),
  };
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const r = parseLine(lines[i]);
    if (r.length < head.length) continue;
    const v = (k) => (r[cols[k]] === 'NULL' ? null : r[cols[k]]);
    rows.push({
      id: v('id'),
      nombre: v('nombre'),
      tipo: v('tipo'),
      estado: v('estado'),
      rango: v('rango'),
      parent: v('parent'),
      cod_admin_cola: v('cod_admin_cola'),
      precio_general: v('precio_general'),
    });
  }
  return rows;
}

async function readExcel(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  const out = [];
  ws.eachRow({ includeEmpty: false }, (row, idx) => {
    // Encabezado en fila 3; datos desde fila 4.
    if (idx < 4) return;
    const tipoCell = row.getCell(1).value;
    const examenCell = row.getCell(2).value;
    const p1Cell = row.getCell(3).value;
    const p2Cell = row.getCell(4).value;
    const unwrap = (v) => {
      if (v && typeof v === 'object') {
        if (v.richText) return v.richText.map((r) => r.text).join('');
        if (v.text != null) return v.text;
        if (v.result != null) return v.result;
      }
      return v;
    };
    const tipo = unwrap(tipoCell);
    const examen = unwrap(examenCell);
    const p1 = unwrap(p1Cell);
    const p2 = unwrap(p2Cell);
    if (!tipo || !examen) return;
    out.push({
      tipo: String(tipo).trim(),
      nombre: String(examen).trim(),
      precio_hasta_15: typeof p1 === 'number' ? p1 : Number(p1),
      precio_desde_16: typeof p2 === 'number' ? p2 : Number(p2),
    });
  });
  return out;
}

// ----------------------------------------------------------------------------
// Mapa de alias entre nombres de categoría del CSV y del Excel.
// Clave = nombre normalizado. Valor = nombre "canónico" (mostrado en BD).
// ----------------------------------------------------------------------------
const CATEGORIA_CANONICAS = [
  {
    nombre: 'EVALUACIÓN MÉDICA OCUPACIONAL',
    id_cola_fallback: 'EVMEDOCU9',
    alias: [
      'evaluacion medica ocupacional',
      'examen clinico ocupacional',
      'examen clinico ocupacionales',
    ],
  },
  {
    nombre: 'TRIAJE',
    id_cola_fallback: 'T1',
    alias: ['triaje'],
  },
  {
    nombre: 'LABORATORIO',
    id_cola_fallback: 'EVLAB4',
    alias: ['laboratorio', 'examenes de laboratorio', 'examen de laboratorio'],
  },
  {
    nombre: 'OFTALMOLOGÍA',
    id_cola_fallback: 'EVOFT7',
    alias: ['oftalmologia', 'evaluacion oftalmologica'],
  },
  {
    nombre: 'EVALUACIÓN PSICOLÓGICA',
    id_cola_fallback: 'EVPSICOCU12',
    alias: ['evaluacion psicologica'],
  },
  {
    nombre: 'EVALUACIÓN AUDIOMÉTRICA',
    id_cola_fallback: 'EVAUDIO8',
    alias: ['evaluacion audiometrica', 'audiometria'],
  },
  {
    nombre: 'ESPIROMETRIA',
    id_cola_fallback: 'EVESPIOCU10',
    alias: ['espirometria'],
  },
  {
    nombre: 'RAYOS X',
    id_cola_fallback: 'EVRX5',
    alias: ['rayos x', 'rayosx'],
  },
  {
    nombre: 'EVALUACIÓN ODONTOLÓGICA',
    id_cola_fallback: 'EVODO2',
    alias: ['evaluacion odontologica'],
  },
  {
    nombre: 'EVALUACIÓN CARDIOVASCULAR',
    id_cola_fallback: 'EVELE3',
    alias: ['evaluacion cardiovascular', 'examenes cardiologicos', 'cardiologico'],
  },
  // Categorías únicas del CSV (sólo CSV) — usan el cod_admin_cola del padre.
  {
    nombre: 'EXAMEN PSICOSENSOMETRICO',
    id_cola_fallback: 'PSICOSENS',
    alias: ['examen psicosensometrico'],
  },
  {
    nombre: 'PRUEBA DE EMBARAZO',
    id_cola_fallback: 'EMBARAZO',
    alias: ['prueba de embarazo'],
  },
  {
    nombre: 'EXAMENES TU SALUD',
    id_cola_fallback: 'TUSALUD',
    alias: ['examenes tu salud'],
  },
  {
    nombre: 'VISIOMETRO',
    id_cola_fallback: 'VISIOMETRO',
    alias: ['visiometro'],
  },
  // Categorías únicas del Excel (sólo Excel).
  {
    nombre: 'EXÁMENES COMPLEMENTARIOS',
    id_cola_fallback: 'EXCOMP',
    alias: ['examenes complementarios'],
  },
  {
    nombre: 'VACUNAS',
    id_cola_fallback: 'VACUNAS',
    alias: ['vacunas'],
  },
];

function buildCategoriaResolver() {
  /** alias_norm → canonical_name */
  const aliasMap = new Map();
  /** canonical_name → meta { nombre, id_cola_fallback } */
  const canonicaMap = new Map();
  for (const c of CATEGORIA_CANONICAS) {
    canonicaMap.set(c.nombre, { nombre: c.nombre, id_cola_fallback: c.id_cola_fallback });
    for (const a of c.alias) aliasMap.set(norm(a), c.nombre);
  }
  return {
    resolve(nameFromFile) {
      const k = norm(nameFromFile);
      const canonical = aliasMap.get(k);
      if (canonical) return canonical;
      // No match conocido → crear categoría con su propio nombre (mayúsculas) y id_cola sintético.
      const synthetic = String(nameFromFile || '').trim().toUpperCase();
      if (!canonicaMap.has(synthetic)) {
        // Generar id_cola desde el nombre (primeros chars alfanuméricos en upper).
        const idCola = norm(nameFromFile).replace(/\s+/g, '').slice(0, 20).toUpperCase() || 'OTROS';
        canonicaMap.set(synthetic, { nombre: synthetic, id_cola_fallback: idCola });
      }
      return synthetic;
    },
    list() {
      return Array.from(canonicaMap.values());
    },
  };
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
(async () => {
  console.log('Leyendo CSV:', CSV_PATH);
  // El CSV viene en latin1/Windows-1252 (los acentos son bytes únicos como 0xCD).
  // Si lo leyésemos como utf8 los acentos se romperían y duplicaríamos categorías.
  const csvText = fs.readFileSync(CSV_PATH, 'latin1');
  const csvRows = parseCsv(csvText);

  console.log('Leyendo Excel:', XLSX_PATH);
  const xlRows = await readExcel(XLSX_PATH);

  // Índices del CSV.
  const csvPadres = new Map(); // id (string) → { nombre, cod_admin_cola }
  const csvExamenes = []; // hojas (rango=2)
  for (const r of csvRows) {
    if (r.rango === '1') {
      csvPadres.set(r.id, { nombre: r.nombre, cod_admin_cola: r.cod_admin_cola || null });
    } else if (r.rango === '2') {
      csvExamenes.push(r);
    }
  }

  const categoriaResolver = buildCategoriaResolver();
  // Asegurar que todas las categorías del CSV y Excel queden registradas en la lista canónica.
  for (const p of csvPadres.values()) {
    const canonical = categoriaResolver.resolve(p.nombre);
    // Si la categoría canónica no tiene id_cola_fallback definido y el padre sí, úsalo.
    const meta = categoriaResolver
      .list()
      .find((c) => c.nombre === canonical);
    if (meta && (!meta.id_cola_fallback || meta.id_cola_fallback === '') && p.cod_admin_cola) {
      meta.id_cola_fallback = p.cod_admin_cola;
    }
    // Si el alias del CSV no estaba registrado, agregarlo para que futuros lookups funcionen.
  }
  for (const x of xlRows) {
    categoriaResolver.resolve(x.tipo);
  }

  const categorias = categoriaResolver.list();

  // Match Excel ↔ CSV por nombre normalizado.
  const csvByNorm = new Map();
  for (const r of csvExamenes) {
    const k = norm(r.nombre);
    if (!csvByNorm.has(k)) csvByNorm.set(k, []);
    csvByNorm.get(k).push(r);
  }

  // Construir la lista final de exámenes con su categoría canónica y precios.
  /** @type {Array<{ identificador: number|null, nombre: string, categoria_canonica: string, codigo: string|null, activo: 0|1, precio_hasta_15: number|null, precio_desde_16: number|null, source: string }>} */
  const finales = [];

  // 1) Todos los del CSV (preservan identificador legacy).
  for (const r of csvExamenes) {
    const parentInfo = csvPadres.get(r.parent) || null;
    const categoriaCanonica = categoriaResolver.resolve(
      parentInfo ? parentInfo.nombre : 'OTROS',
    );
    const precio = Number(r.precio_general);
    const tienePrecioCsv = Number.isFinite(precio) && precio > 0;
    finales.push({
      identificador: Number(r.id),
      nombre: r.nombre,
      categoria_canonica: categoriaCanonica,
      codigo: null,
      activo: r.estado === '1' ? 1 : 0,
      precio_hasta_15: tienePrecioCsv ? precio : null,
      precio_desde_16: tienePrecioCsv ? precio : null,
      source: 'csv',
    });
  }

  // 2) Los del Excel: si hay match (norm) con uno del CSV, sobreescriben sus precios; si no, se insertan como nuevos.
  let matchedFromExcel = 0;
  let nuevosDesdeExcel = 0;
  const finalesByIdent = new Map(
    finales.filter((f) => f.identificador != null).map((f) => [f.identificador, f]),
  );
  const finalesByNorm = new Map();
  for (const f of finales) {
    const k = norm(f.nombre);
    if (!finalesByNorm.has(k)) finalesByNorm.set(k, []);
    finalesByNorm.get(k).push(f);
  }

  for (const x of xlRows) {
    const k = norm(x.nombre);
    const cand = finalesByNorm.get(k);
    const p1 = Number.isFinite(x.precio_hasta_15) ? x.precio_hasta_15 : null;
    const p2 = Number.isFinite(x.precio_desde_16) ? x.precio_desde_16 : null;
    const categoriaCanonica = categoriaResolver.resolve(x.tipo);
    if (cand && cand.length === 1) {
      // 1 a 1: aplicar precios y forzar activo=1 + recategorizar.
      const target = cand[0];
      target.precio_hasta_15 = p1;
      target.precio_desde_16 = p2;
      target.activo = 1;
      target.categoria_canonica = categoriaCanonica;
      target.source = 'csv+excel';
      matchedFromExcel++;
    } else {
      // 0 o >1 candidatos → insertar como examen nuevo con identificador NULL.
      finales.push({
        identificador: null,
        nombre: x.nombre,
        categoria_canonica: categoriaCanonica,
        codigo: null,
        activo: 1,
        precio_hasta_15: p1,
        precio_desde_16: p2,
        source: 'excel',
      });
      nuevosDesdeExcel++;
    }
  }

  // ---- Generación del SQL ---------------------------------------------------
  const out = [];
  out.push(
    '-- =============================================================================',
    '-- Catálogo de exámenes v2 — datos (generado por build_examenes_catalogo_v2.js)',
    '-- =============================================================================',
    `-- Fuente CSV : ${path.basename(CSV_PATH)}`,
    `-- Fuente XLSX: ${path.basename(XLSX_PATH)}`,
    `-- Fecha gen. : ${new Date().toISOString()}`,
    `-- Exámenes del CSV   : ${csvExamenes.length}`,
    `-- Exámenes del Excel : ${xlRows.length}  (match 1:1 con CSV: ${matchedFromExcel}; nuevos: ${nuevosDesdeExcel})`,
    `-- Categorías canónicas: ${categorias.length}`,
    '--',
    '-- IMPORTANTE: corre primero migration_examenes_catalogo_v2_schema.sql.',
    '-- Este script es idempotente; aplica reset suave + upsert.',
    '-- =============================================================================',
    '',
    'START TRANSACTION;',
    'SET @vigente := CURDATE();',
    '',
    '-- --- 1) Reset suave: marcamos todos los exámenes actuales como inactivos.',
    '--     Las cotizaciones/facturas históricas siguen vivas (no se borra nada).',
    'UPDATE `examenes` SET `activo` = 0;',
    '',
    '-- --- 2) Categorías (upsert por id_cola).',
  );
  for (const c of categorias) {
    out.push(
      `INSERT INTO \`emo_categorias\` (\`nombre\`, \`id_cola\`) VALUES (${escSql(c.nombre)}, ${escSql(c.id_cola_fallback)})`,
      '  ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);',
    );
  }

  out.push(
    '',
    '-- --- 3) Exámenes con identificador legacy (CSV): upsert por `identificador`.',
  );
  for (const f of finales.filter((x) => x.identificador != null)) {
    const catId = `(SELECT id FROM emo_categorias WHERE nombre = ${escSql(f.categoria_canonica)} LIMIT 1)`;
    out.push(
      `INSERT INTO \`examenes\` (\`identificador\`, \`nombre\`, \`categoria_id\`, \`activo\`)`,
      `VALUES (${f.identificador}, ${escSql(f.nombre)}, ${catId}, ${f.activo})`,
      '  ON DUPLICATE KEY UPDATE',
      `    \`nombre\`        = VALUES(\`nombre\`),`,
      `    \`categoria_id\`  = VALUES(\`categoria_id\`),`,
      `    \`activo\`        = VALUES(\`activo\`);`,
    );
  }

  out.push(
    '',
    '-- --- 4) Exámenes nuevos del Excel sin identificador legacy.',
    '--     Para evitar duplicados al re-correr, primero verificamos por (nombre, categoria).',
  );
  for (const f of finales.filter((x) => x.identificador == null)) {
    const catId = `(SELECT id FROM emo_categorias WHERE nombre = ${escSql(f.categoria_canonica)} LIMIT 1)`;
    out.push(
      `INSERT INTO \`examenes\` (\`identificador\`, \`nombre\`, \`categoria_id\`, \`activo\`)`,
      `SELECT NULL, ${escSql(f.nombre)}, ${catId}, ${f.activo}`,
      '  FROM dual',
      `  WHERE NOT EXISTS (SELECT 1 FROM \`examenes\` WHERE \`nombre\` = ${escSql(f.nombre)} AND \`identificador\` IS NULL);`,
      `UPDATE \`examenes\` SET \`activo\` = ${f.activo}, \`categoria_id\` = ${catId}`,
      `  WHERE \`nombre\` = ${escSql(f.nombre)} AND \`identificador\` IS NULL;`,
    );
  }

  out.push(
    '',
    '-- --- 5) Precios base globales (sede_id NULL): upsert por (examen_id, sede_id).',
    '--     `precio` (col legacy) = `precio_desde_16`; si no hay precio_desde_16, usa precio_hasta_15.',
  );
  const conPrecio = finales.filter((f) => f.precio_hasta_15 != null || f.precio_desde_16 != null);
  for (const f of conPrecio) {
    const p1 = escSqlDecimal(f.precio_hasta_15 != null ? f.precio_hasta_15 : f.precio_desde_16);
    const p2 = escSqlDecimal(f.precio_desde_16 != null ? f.precio_desde_16 : f.precio_hasta_15);
    const base = p2 !== 'NULL' ? p2 : p1; // valor para `precio` legacy
    let selectId;
    if (f.identificador != null) {
      selectId = `(SELECT id FROM examenes WHERE identificador = ${f.identificador} LIMIT 1)`;
    } else {
      selectId = `(SELECT id FROM examenes WHERE nombre = ${escSql(f.nombre)} AND identificador IS NULL LIMIT 1)`;
    }
    out.push(
      `INSERT INTO \`examen_precio\` (\`examen_id\`, \`sede_id\`, \`precio\`, \`precio_hasta_15\`, \`precio_desde_16\`, \`vigente_desde\`)`,
      `SELECT id, NULL, ${base}, ${p1}, ${p2}, @vigente FROM examenes WHERE id = ${selectId} LIMIT 1`,
      '  ON DUPLICATE KEY UPDATE',
      `    \`precio\`           = VALUES(\`precio\`),`,
      `    \`precio_hasta_15\`  = VALUES(\`precio_hasta_15\`),`,
      `    \`precio_desde_16\`  = VALUES(\`precio_desde_16\`),`,
      `    \`vigente_desde\`    = VALUES(\`vigente_desde\`);`,
    );
  }

  out.push(
    '',
    'COMMIT;',
    '',
    '-- Verificación rápida (no rompe la transacción):',
    '-- SELECT (SELECT COUNT(*) FROM examenes WHERE activo=1) AS activos,',
    '--        (SELECT COUNT(*) FROM examenes) AS totales,',
    '--        (SELECT COUNT(*) FROM examen_precio WHERE sede_id IS NULL) AS precios_base,',
    '--        (SELECT COUNT(*) FROM emo_categorias) AS categorias;',
    '',
  );

  fs.writeFileSync(OUT_PATH, out.join('\n'), 'utf8');

  // Resumen.
  console.log('');
  console.log('=== Resumen ===');
  console.log('Categorías finales :', categorias.length);
  for (const c of categorias) console.log('   •', c.nombre, ' [' + c.id_cola_fallback + ']');
  console.log('Exámenes totales   :', finales.length);
  console.log('  desde CSV         :', csvExamenes.length);
  console.log('  desde Excel match :', matchedFromExcel);
  console.log('  desde Excel nuevos:', nuevosDesdeExcel);
  console.log('Con precio          :', conPrecio.length);
  console.log('SQL escrito en       :', OUT_PATH);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
