#!/usr/bin/env node
/**
 * TuSalud — Importador del Tarifario Base
 * -----------------------------------------------------------------------------
 * Carga el catálogo de exámenes y precios desde:
 *   `Tarifario Base  S.O. TU SALUD SAC (3).xlsx`
 *
 * Formato esperado del Excel (hoja "Precios"):
 *   Fila 1:  título ("TARIFARIO S.O. TU SALUD SAC")
 *   Fila 3:  cabecera → | Tipo | Examen | 01 a 15 pacientes mensual | 15 a más pacientes mensual |
 *   Fila 4+: datos    → | <categoría> | <nombre examen> | <precio 1-15> | <precio 16+> |
 *
 * Qué inserta:
 *   - emo_categorias  (una por cada Tipo distinto del Excel)
 *       id_cola generado automáticamente a partir del nombre (slug 45 chars).
 *   - examenes        (una fila por cada fila del Excel; identificador NULL,
 *                      activo=1, categoria_id ← categoría creada arriba)
 *   - examen_precio   (una fila por examen, sede_id=NULL = precio base global)
 *       precio_hasta_15 = columna C del Excel
 *       precio_desde_16 = columna D del Excel
 *       precio          = precio_desde_16 (espejo, según comentario del schema)
 *
 * Prerrequisitos:
 *   - Schema base aplicado (scripts/tusalud_schema_mysql.sql).
 *   - Catálogo previamente vaciado con `scripts/reset_catalogo_examenes.sql`
 *     (si hay filas previas, este script AÑADE, no reemplaza).
 *   - .env con DB_* configurado.
 *
 * Uso:
 *   node scripts/importarTarifarioBase.js \
 *        --xlsx "C:\\Users\\rgome\\Downloads\\Tarifario Base  S.O. TU SALUD SAC (3).xlsx"
 *
 * Por defecto corre en DRY-RUN (no escribe en la DB). Para persistir:
 *
 *   node scripts/importarTarifarioBase.js --xlsx "<ruta>" --apply
 *
 * Otras banderas:
 *   --sheet "Precios"      Nombre de la hoja (default: primera del workbook)
 *   --header-row N         Fila 1-based de la cabecera (default: autodetectar)
 *   --limit N              Solo procesa las primeras N filas de datos
 * -----------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// El pool se carga perezosamente: en dry-run no queremos ni siquiera intentar
// conectar a la DB (require('../config/database') dispara testConnection() al
// arrancar, y en máquinas sin acceso a RDS eso solo genera ruido).
let pool = null;
function getPool() {
  if (!pool) pool = require('../config/database');
  return pool;
}

// -----------------------------------------------------------------------------
// Args
// -----------------------------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

const argv = parseArgs(process.argv.slice(2));

const DEFAULT_XLSX = path.join(
  process.env.USERPROFILE || process.env.HOME || '.',
  'Downloads',
  'Tarifario Base  S.O. TU SALUD SAC (3).xlsx'
);
const XLSX_PATH = String(argv.xlsx || DEFAULT_XLSX);
const APPLY = argv.apply === true || argv.apply === 'true';
const DRY_RUN = !APPLY;
const SHEET_NAME = typeof argv.sheet === 'string' ? argv.sheet : null;
const HEADER_ROW_ARG = argv['header-row'] ? parseInt(String(argv['header-row']), 10) : null;
const LIMIT = argv.limit ? parseInt(String(argv.limit), 10) : null;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Genera un id_cola único y compacto a partir del nombre de la categoría.
 * Formato: `TAR_<SLUG>` truncado a 45 chars. Si hubiera colisiones (raro),
 * el llamador agrega sufijo numérico.
 */
function slugIdCola(nombre) {
  const base = stripAccents(nombre).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const trimmed = base.substring(0, 41); // deja 4 chars para sufijo si hace falta
  return `TAR_${trimmed || 'CAT'}`;
}

/**
 * Convierte una celda de ExcelJS a texto plano robusto:
 *   - null/undefined       → ""
 *   - richText             → concatenado
 *   - fórmulas (.result)   → resultado
 *   - números              → String(n)
 *   - normaliza espacios y trim
 */
function cellToText(cell) {
  if (!cell) return '';
  const src = cell.isMerged ? cell.master : cell;
  let v = src.value;
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in v && Array.isArray(v.richText)) {
    v = v.richText.map((t) => t.text).join('');
  }
  if (typeof v === 'object' && 'result' in v) v = v.result;
  if (v == null) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

/** Parseo de precio: acepta "5", "5.5", "5,50", "S/. 5.5", "", null. */
function parsePrecio(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = s.replace(/[^0-9,.\-]/g, '').replace(/,/g, '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n * 100) / 100); // 2 decimales, sin negativos
}

/** Detecta la fila de cabecera buscando "Tipo" y "Examen" en las primeras 10. */
function detectHeaderRow(ws) {
  const maxScan = Math.min(ws.rowCount, 10);
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    const cells = [];
    for (let c = 1; c <= Math.min(ws.columnCount, 12); c++) {
      cells.push(cellToText(row.getCell(c)).toLowerCase());
    }
    const hasTipo = cells.some((v) => v === 'tipo' || v.startsWith('tipo '));
    const hasExamen = cells.some((v) => v === 'examen' || v.startsWith('examen '));
    if (hasTipo && hasExamen) return r;
  }
  return null;
}

/**
 * A partir de la fila de cabecera, mapea columnas por nombre:
 *   - Tipo
 *   - Examen
 *   - 01 a 15 pacientes ... (col precio_hasta_15)
 *   - 15 a más pacientes ... (col precio_desde_16)
 *
 * Devuelve { colTipo, colExamen, colHasta15, colDesde16 } (1-based).
 */
function detectColumns(ws, headerRow) {
  const row = ws.getRow(headerRow);
  const map = { colTipo: null, colExamen: null, colHasta15: null, colDesde16: null };
  for (let c = 1; c <= ws.columnCount; c++) {
    const label = stripAccents(cellToText(row.getCell(c))).toLowerCase();
    if (!label) continue;
    if (map.colTipo == null && label === 'tipo') map.colTipo = c;
    else if (map.colExamen == null && label.startsWith('examen')) map.colExamen = c;
    else if (map.colHasta15 == null && /(1|01)\s*a\s*15\b/.test(label)) map.colHasta15 = c;
    else if (map.colDesde16 == null && /15\s*a\s*mas|16\+?|desde\s*16|\bmayoristas?\b/.test(label)) map.colDesde16 = c;
  }
  // Fallback posicional: si no detectamos "15 a más", usa la columna inmediatamente después de "1-15"
  if (map.colHasta15 && !map.colDesde16 && map.colHasta15 + 1 <= ws.columnCount) {
    map.colDesde16 = map.colHasta15 + 1;
  }
  return map;
}

/**
 * Lee el Excel y devuelve la lista de filas parseadas (ya validadas):
 *   [ { rowNum, categoria, examen, precio_hasta_15, precio_desde_16 } ]
 *
 * También devuelve warnings/errors con contexto (rowNum) para reporte.
 */
async function leerTarifario(xlsxPath) {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`No existe el archivo: ${xlsxPath}`);
  }
  const buf = fs.readFileSync(xlsxPath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const ws = SHEET_NAME
    ? wb.getWorksheet(SHEET_NAME)
    : wb.worksheets[0];
  if (!ws) {
    throw new Error(`Hoja no encontrada: ${SHEET_NAME || '(primera)'}`);
  }

  const headerRow = HEADER_ROW_ARG || detectHeaderRow(ws);
  if (!headerRow) {
    throw new Error('No se pudo detectar la fila de cabecera (busco "Tipo" + "Examen" en las primeras 10 filas).');
  }

  const cols = detectColumns(ws, headerRow);
  if (!cols.colTipo || !cols.colExamen || !cols.colHasta15 || !cols.colDesde16) {
    throw new Error(
      `No se pudieron mapear todas las columnas. Detectado: ${JSON.stringify(cols)}. ` +
        'Se esperan columnas "Tipo", "Examen", "01 a 15 pacientes mensual", "15 a más pacientes mensual".'
    );
  }

  const filas = [];
  const warnings = [];

  const dataStart = headerRow + 1;
  const dataEnd = ws.rowCount;

  for (let r = dataStart; r <= dataEnd; r++) {
    if (LIMIT && filas.length >= LIMIT) break;
    const row = ws.getRow(r);
    const categoria = cellToText(row.getCell(cols.colTipo));
    const examen = cellToText(row.getCell(cols.colExamen));
    const precioHasta15 = parsePrecio(cellToText(row.getCell(cols.colHasta15)));
    const precioDesde16 = parsePrecio(cellToText(row.getCell(cols.colDesde16)));

    // Salta filas vacías totalmente
    if (!categoria && !examen && precioHasta15 == null && precioDesde16 == null) continue;

    if (!categoria) {
      warnings.push({ rowNum: r, motivo: 'Sin categoría (columna Tipo vacía)', examen });
      continue;
    }
    if (!examen) {
      warnings.push({ rowNum: r, motivo: 'Sin nombre de examen', categoria });
      continue;
    }
    if (precioHasta15 == null && precioDesde16 == null) {
      warnings.push({ rowNum: r, motivo: 'Ambos precios están vacíos', categoria, examen });
      continue;
    }

    filas.push({
      rowNum: r,
      categoria,
      examen,
      precio_hasta_15: precioHasta15 == null ? 0 : precioHasta15,
      precio_desde_16: precioDesde16 == null ? (precioHasta15 || 0) : precioDesde16,
    });
  }

  return { sheet: ws.name, headerRow, cols, filas, warnings };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(70));
  console.log('TuSalud — Importador del Tarifario Base');
  console.log('='.repeat(70));
  console.log(`Archivo : ${XLSX_PATH}`);
  console.log(`Modo    : ${DRY_RUN ? 'DRY-RUN (no escribe en DB)' : 'APPLY (escribe en DB)'}`);
  if (SHEET_NAME) console.log(`Hoja    : ${SHEET_NAME}`);
  if (LIMIT) console.log(`Limit   : ${LIMIT} filas`);
  console.log();

  const { sheet, headerRow, cols, filas, warnings } = await leerTarifario(XLSX_PATH);

  console.log(`Hoja detectada         : "${sheet}"`);
  console.log(`Cabecera en fila       : ${headerRow}`);
  console.log(
    `Columnas               : Tipo=${cols.colTipo}, Examen=${cols.colExamen}, ` +
      `1-15=${cols.colHasta15}, 16+=${cols.colDesde16}`
  );
  console.log(`Filas de datos válidas : ${filas.length}`);
  console.log(`Filas descartadas      : ${warnings.length}`);
  console.log();

  if (warnings.length) {
    console.log('Advertencias (filas descartadas):');
    for (const w of warnings.slice(0, 20)) {
      console.log(
        `  · R${w.rowNum}: ${w.motivo}${w.categoria ? ` [categoría: ${w.categoria}]` : ''}${
          w.examen ? ` [examen: ${w.examen}]` : ''
        }`
      );
    }
    if (warnings.length > 20) console.log(`  ... y ${warnings.length - 20} más`);
    console.log();
  }

  // Agrupa filas por categoría (preservando el orden de aparición en el Excel)
  const categoriasOrdenadas = [];
  const categoriasIndex = new Map(); // nombreCategoria → índice en categoriasOrdenadas
  for (const f of filas) {
    if (!categoriasIndex.has(f.categoria)) {
      categoriasIndex.set(f.categoria, categoriasOrdenadas.length);
      categoriasOrdenadas.push({ nombre: f.categoria, examenes: [] });
    }
    categoriasOrdenadas[categoriasIndex.get(f.categoria)].examenes.push(f);
  }

  console.log(`Categorías detectadas  : ${categoriasOrdenadas.length}`);
  for (const c of categoriasOrdenadas) {
    console.log(`  · ${c.nombre.padEnd(35, ' ').slice(0, 35)} → ${c.examenes.length} exámenes`);
  }
  console.log();

  // -------------------------------------------------------------------------
  // DRY-RUN → solo imprime resumen y termina. NO toca la DB.
  // -------------------------------------------------------------------------
  if (DRY_RUN) {
    // Genera id_cola sólo con lo que hay en el Excel (sin consultar la BD),
    // para poder validar el parseo offline aunque MySQL no esté accesible.
    const usedIdCola = new Set();
    for (const c of categoriasOrdenadas) {
      let candidato = slugIdCola(c.nombre);
      let n = 2;
      while (usedIdCola.has(candidato)) {
        candidato = `${slugIdCola(c.nombre).substring(0, 43)}_${n}`;
        n++;
      }
      usedIdCola.add(candidato);
      c.idCola = candidato;
    }

    console.log('id_cola generados (categorías):');
    for (const c of categoriasOrdenadas) {
      console.log(`  · ${c.nombre.padEnd(35, ' ').slice(0, 35)} → ${c.idCola}`);
    }
    console.log();

    console.log('DRY-RUN: no se insertó nada en la base de datos.');
    console.log('Ejecuta el mismo comando con `--apply` para escribir.');
    console.log();
    console.log('Vista previa (primeras 8 filas):');
    for (const f of filas.slice(0, 8)) {
      console.log(
        `  R${f.rowNum}  [${f.categoria.slice(0, 25).padEnd(25)}]  ${f.examen.slice(0, 60).padEnd(60)}  1-15=${
          f.precio_hasta_15
        }  16+=${f.precio_desde_16}`
      );
    }
    return;
  }

  // -------------------------------------------------------------------------
  // APPLY: primero verifica que id_cola no colisione con existentes en BD
  // -------------------------------------------------------------------------
  const [existingCategorias] = await getPool().query('SELECT id_cola FROM emo_categorias');
  const usedIdCola = new Set(existingCategorias.map((r) => String(r.id_cola)));
  for (const c of categoriasOrdenadas) {
    let candidato = slugIdCola(c.nombre);
    let n = 2;
    while (usedIdCola.has(candidato)) {
      candidato = `${slugIdCola(c.nombre).substring(0, 43)}_${n}`;
      n++;
    }
    usedIdCola.add(candidato);
    c.idCola = candidato;
  }

  // -------------------------------------------------------------------------
  // APPLY → inserta en una transacción
  // -------------------------------------------------------------------------
  const conn = await getPool().getConnection();
  const stats = {
    categorias_insertadas: 0,
    examenes_insertados: 0,
    precios_insertados: 0,
  };
  try {
    await conn.beginTransaction();

    for (const cat of categoriasOrdenadas) {
      const [resCat] = await conn.execute(
        'INSERT INTO `emo_categorias` (`nombre`, `id_cola`) VALUES (?, ?)',
        [cat.nombre, cat.idCola]
      );
      cat.dbId = resCat.insertId;
      stats.categorias_insertadas++;

      for (const ex of cat.examenes) {
        const [resEx] = await conn.execute(
          `INSERT INTO \`examenes\` (\`identificador\`, \`nombre\`, \`categoria_id\`, \`codigo\`, \`activo\`)
           VALUES (NULL, ?, ?, NULL, 1)`,
          [ex.examen, cat.dbId]
        );
        ex.dbId = resEx.insertId;
        stats.examenes_insertados++;

        await conn.execute(
          `INSERT INTO \`examen_precio\`
             (\`examen_id\`, \`sede_id\`, \`precio\`, \`precio_hasta_15\`, \`precio_desde_16\`, \`vigente_desde\`)
           VALUES (?, NULL, ?, ?, ?, CURDATE())`,
          [ex.dbId, ex.precio_desde_16, ex.precio_hasta_15, ex.precio_desde_16]
        );
        stats.precios_insertados++;
      }
    }

    await conn.commit();
    console.log('OK. Cambios confirmados.');
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error('Error al hacer rollback:', rollbackErr.message);
    }
    throw err;
  } finally {
    conn.release();
  }

  console.log();
  console.log('Resumen de inserción:');
  console.log(`  Categorías nuevas   : ${stats.categorias_insertadas}`);
  console.log(`  Exámenes nuevos     : ${stats.examenes_insertados}`);
  console.log(`  Precios nuevos      : ${stats.precios_insertados}`);
}

main()
  .then(async () => {
    if (pool) await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n[ERROR]', err.message);
    if (err.stack) console.error(err.stack);
    try {
      if (pool) await pool.end();
    } catch (_) {
      // Ignoramos errores al cerrar el pool: ya estamos en el error path.
    }
    process.exit(1);
  });
