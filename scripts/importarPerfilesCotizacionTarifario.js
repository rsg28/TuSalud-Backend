#!/usr/bin/env node
/**
 * Importa perfiles desde cotizacion.xlsx mapeando cada examen legacy al catálogo
 * del tarifario ya cargado en `examenes` (sin crear exámenes legacy duplicados).
 *
 * Prerrequisitos:
 *   - Tarifario importado (`importarTarifarioBase.js --apply`)
 *   - cotizacion.xlsx (export legacy con columna `perfil` en JSON)
 *
 * Uso:
 *   node scripts/importarPerfilesCotizacionTarifario.js --dry-run
 *   node scripts/importarPerfilesCotizacionTarifario.js --apply
 *
 * Banderas:
 *   --xlsx <ruta>           Default: docs/cotizacion.xlsx o ~/Downloads/cotizacion.xlsx
 *   --modo plantillas       (default) Un perfil global por (nombre, tipo), sin asignación empresa
 *   --modo empresas         Importa asignaciones por RUC como el legacy
 *   --solo-nombres <csv>    Solo importa perfiles cuyo nombre contenga alguno de estos textos
 *   --reporte <ruta.json>   Guarda estadísticas y exámenes sin match
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const {
  buildTarifarioIndex,
  mapLegacyExamenToTarifario,
  walkLegacyExamenesFromPerfilJson,
} = require('../lib/mapearExamenLegacyTarifario');

let pool = null;
function getPool() {
  if (!pool) pool = require('../config/database');
  return pool;
}

function parseArgs(argv) {
  const out = { modo: 'plantillas', apply: false, dryRun: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (key === 'apply') {
      out.apply = true;
      out.dryRun = false;
    } else if (key === 'dry-run') {
      out.dryRun = true;
      out.apply = false;
    } else if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

const argv = parseArgs(process.argv.slice(2));
const DRY_RUN = !argv.apply;
const MODO = argv.modo === 'empresas' ? 'empresas' : 'plantillas';
const SOLO_NOMBRES = argv['solo-nombres']
  ? String(argv['solo-nombres'])
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  : null;

function resolveXlsxPath() {
  if (argv.xlsx) return path.resolve(argv.xlsx);
  const candidates = [
    path.join(__dirname, '..', 'docs', 'cotizacion.xlsx'),
    path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Downloads', 'cotizacion.xlsx'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function cellText(cell) {
  if (!cell) return '';
  const src = cell.isMerged ? cell.master : cell;
  let v = src.value;
  if (v == null) return '';
  if (typeof v === 'object' && v.richText) v = v.richText.map((t) => t.text).join('');
  if (typeof v === 'object' && 'result' in v) v = v.result;
  return String(v).replace(/\s+/g, ' ').trim();
}

function flagApplies(v) {
  if (v == null) return false;
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function mapSexoLegacy(v) {
  if (!v) return 'AMBOS';
  const s = String(v).trim().toUpperCase();
  if (s === 'F' || s === 'MUJER' || s === 'FEMENINO') return 'MUJER';
  if (s === 'M' || s === 'HOMBRE' || s === 'MASCULINO') return 'HOMBRE';
  return 'AMBOS';
}

function parseEdad(v) {
  if (v == null) return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function parseCondicional(v) {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? 1 : 0;
}

function extractReglas(ex) {
  const result = { PREOC: null, ANUAL: null, RETIRO: null, VISITA: null };
  if (flagApplies(ex.ingreso)) {
    result.PREOC = {
      sexo_aplicable: mapSexoLegacy(ex.SexoIngreso),
      edad_minima: parseEdad(ex.edadIngreso),
      edad_maxima: null,
      es_condicional: parseCondicional(ex.CondicionalIngreso),
    };
  }
  if (flagApplies(ex.anual)) {
    result.ANUAL = {
      sexo_aplicable: mapSexoLegacy(ex.SexoAnual),
      edad_minima: parseEdad(ex.edadAnual),
      edad_maxima: null,
      es_condicional: parseCondicional(ex.CondicionalAnual),
    };
  }
  if (flagApplies(ex.retiro)) {
    result.RETIRO = {
      sexo_aplicable: mapSexoLegacy(ex.SexoRetiro),
      edad_minima: parseEdad(ex.edadRetiro),
      edad_maxima: null,
      es_condicional: parseCondicional(ex.CondicionalRetiro),
    };
  }
  return result;
}

function normalizeTipo(v) {
  return String(v || '').trim().toUpperCase() === 'ADICIONAL' ? 'ADICIONAL' : 'PERFIL';
}

function normalizePrice(v) {
  if (v == null) return 0;
  const s = String(v).trim();
  if (!s || s === 'NULL') return 0;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

async function leerFilasCotizacion(xlsxPath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fs.readFileSync(xlsxPath));
  const ws = wb.getWorksheet('cotizacion') || wb.worksheets[0];
  const header = [];
  for (let c = 1; c <= ws.columnCount; c++) header.push(cellText(ws.getRow(1).getCell(c)));
  const idx = {
    id: header.indexOf('id'),
    nombre: header.indexOf('nombre'),
    ruc: header.indexOf('ruc'),
    tipo: header.indexOf('tipo'),
    perfil: header.indexOf('perfil'),
    precio_pre: header.indexOf('precio_pre'),
    precio_anual: header.indexOf('precio_anual'),
    precio_retiro: header.indexOf('precio_retiro'),
    clugar: header.indexOf('clugar'),
    tfecha: header.indexOf('tfecha'),
  };
  for (const [k, v] of Object.entries(idx)) {
    if (v < 0) throw new Error(`Columna faltante en cotizacion.xlsx: ${k}`);
  }

  const rows = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cells = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(cellText(row.getCell(c)));
    rows.push(cells);
  }
  return { rows, idx };
}

function perfilPasaFiltroNombre(nombre) {
  if (!SOLO_NOMBRES?.length) return true;
  const n = String(nombre || '').toLowerCase();
  return SOLO_NOMBRES.some((f) => n.includes(f));
}

async function main() {
  const xlsxPath = resolveXlsxPath();
  console.log('='.repeat(72));
  console.log('TuSalud — Importar perfiles cotizacion.xlsx → tarifario');
  console.log('='.repeat(72));
  console.log('Archivo:', xlsxPath);
  console.log('Modo:', DRY_RUN ? 'DRY-RUN' : 'APPLY');
  console.log('Estrategia:', MODO);
  if (SOLO_NOMBRES) console.log('Filtro nombres:', SOLO_NOMBRES.join(', '));
  console.log();

  if (!fs.existsSync(xlsxPath)) {
    console.error('No existe:', xlsxPath);
    process.exit(1);
  }

  const { rows, idx } = await leerFilasCotizacion(xlsxPath);

  const [examenesDb] = await getPool().query(
    'SELECT id, nombre FROM examenes WHERE activo = 1 ORDER BY id ASC'
  );
  if (!examenesDb.length) {
    console.error('No hay exámenes en BD. Ejecute primero importarTarifarioBase.js --apply');
    process.exit(1);
  }
  const tarifIndex = buildTarifarioIndex(examenesDb);

  const stats = {
    filas: rows.length,
    perfiles_procesados: 0,
    perfiles_omitidos_filtro: 0,
    perfiles_omitidos_json: 0,
    perfiles_creados: 0,
    perfiles_reusados: 0,
    examenes_mapeados: 0,
    examenes_sin_match: 0,
    perfil_examenes_insertados: 0,
    precios_insertados: 0,
    empresas_creadas: 0,
    asignaciones_creadas: 0,
  };

  const sinMatchUnicos = new Map();
  const mapeosLog = [];

  // Dedup: plantillas → (tipo||nombre); empresas → (tipo||nombre||ruc) más reciente tfecha
  const porClave = new Map();
  for (const r of rows) {
    const nombre = (r[idx.nombre] || '').trim();
    const ruc = (r[idx.ruc] || '').trim();
    const tipo = normalizeTipo(r[idx.tipo]);
    if (!nombre) continue;
    if (!perfilPasaFiltroNombre(nombre)) {
      stats.perfiles_omitidos_filtro++;
      continue;
    }
    const key = MODO === 'empresas' ? `${tipo}||${nombre}||${ruc}` : `${tipo}||${nombre}`;
    const prev = porClave.get(key);
    if (!prev || String(r[idx.tfecha] || '') > String(prev[idx.tfecha] || '')) {
      porClave.set(key, r);
    }
  }

  const conn = await getPool().getConnection();
  const perfilCache = new Map();
  const empresaCache = new Map();
  const sedeCache = new Map();

  try {
    if (!DRY_RUN) await conn.beginTransaction();

    const [existingEmpresas] = await conn.query('SELECT id, ruc FROM empresas WHERE ruc IS NOT NULL');
    for (const e of existingEmpresas) empresaCache.set(e.ruc, e.id);

    const [existingSedes] = await conn.query('SELECT id, codigo_legacy FROM sedes WHERE codigo_legacy IS NOT NULL');
    for (const s of existingSedes) sedeCache.set(String(s.codigo_legacy), s.id);

  if (MODO === 'plantillas') {
    const [existingPerfiles] = await conn.query('SELECT id, nombre, tipo FROM emo_perfiles');
    for (const p of existingPerfiles) {
      perfilCache.set(`${p.tipo}||${p.nombre.toUpperCase()}`, p.id);
    }
  } else {
    const [existingPerfilEmpresa] = await conn.query(
      `SELECT p.id AS perfil_id, p.nombre, p.tipo, a.empresa_id
         FROM emo_perfiles p
         JOIN emo_perfil_asignacion a ON a.perfil_id = p.id`
    );
    for (const r of existingPerfilEmpresa) {
      perfilCache.set(`${r.tipo}||${r.nombre.toUpperCase()}||${r.empresa_id}`, r.perfil_id);
    }
  }

    for (const r of porClave.values()) {
      const nombrePerfil = (r[idx.nombre] || '').trim();
      const rucRaw = (r[idx.ruc] || '').trim();
      const tipoPerfil = normalizeTipo(r[idx.tipo]);
      const clugar = (r[idx.clugar] || '').trim();
      const perfilJson = r[idx.perfil] || '';

      let parsed;
      try {
        parsed = JSON.parse(perfilJson);
      } catch {
        stats.perfiles_omitidos_json++;
        continue;
      }
      if (!Array.isArray(parsed)) {
        stats.perfiles_omitidos_json++;
        continue;
      }

      const legacyExamenes = [];
      walkLegacyExamenesFromPerfilJson(parsed, legacyExamenes);

      const perfilExamenesBuffer = [];
      const examenIdsVistos = new Set();

      for (const lex of legacyExamenes) {
        const mapped = mapLegacyExamenToTarifario(lex, tarifIndex);
        if (!mapped) {
          stats.examenes_sin_match++;
          const k = `${lex.codigo}|${lex.nombre}`;
          if (!sinMatchUnicos.has(k)) sinMatchUnicos.set(k, { codigo: lex.codigo, nombre: lex.nombre });
          continue;
        }
        stats.examenes_mapeados++;
        mapeosLog.push({
          perfil: nombrePerfil,
          legacy_codigo: lex.codigo,
          legacy_nombre: lex.nombre,
          tarifario: mapped.tarifario_nombre,
          estrategia: mapped.estrategia,
          score: mapped.score,
        });

        const reglas = extractReglas(lex.reglas || lex);
        for (const [tipoEmo, regla] of Object.entries(reglas)) {
          if (!regla) continue;
          const dedupeKey = `${tipoEmo}||${mapped.examen_id}`;
          if (examenIdsVistos.has(dedupeKey)) continue;
          examenIdsVistos.add(dedupeKey);
          perfilExamenesBuffer.push({
            tipo_emo: tipoEmo,
            examen_id: mapped.examen_id,
            ...regla,
          });
        }
      }

      if (perfilExamenesBuffer.length === 0) {
        continue;
      }

      stats.perfiles_procesados++;

      let empresaId = null;
      if (MODO === 'empresas') {
        if (!rucRaw) continue;
        empresaId = empresaCache.get(rucRaw);
        if (!empresaId) {
          if (DRY_RUN) {
            empresaId = -1;
          } else {
            const [res] = await conn.query(
              'INSERT INTO empresas (ruc, razon_social, estado) VALUES (?, ?, "ACTIVO")',
              [rucRaw, `Empresa ${rucRaw}`]
            );
            empresaId = res.insertId;
          }
          empresaCache.set(rucRaw, empresaId);
          stats.empresas_creadas++;
        }
      }

      const perfilCacheKey =
        MODO === 'empresas'
          ? `${tipoPerfil}||${nombrePerfil.toUpperCase()}||${empresaId}`
          : `${tipoPerfil}||${nombrePerfil.toUpperCase()}`;

      let perfilId = perfilCache.get(perfilCacheKey);
      if (!perfilId) {
        if (DRY_RUN) {
          perfilId = -(stats.perfiles_creados + 1);
        } else {
          const [res] = await conn.query('INSERT INTO emo_perfiles (nombre, tipo) VALUES (?, ?)', [
            nombrePerfil,
            tipoPerfil,
          ]);
          perfilId = res.insertId;
        }
        perfilCache.set(perfilCacheKey, perfilId);
        stats.perfiles_creados++;
      } else {
        stats.perfiles_reusados++;
      }

      if (MODO === 'empresas' && empresaId && !DRY_RUN) {
        let sedeId = null;
        if (clugar) {
          sedeId = sedeCache.get(clugar) || null;
          if (!sedeId) {
            const [resSede] = await conn.query(
              'INSERT INTO sedes (nombre, codigo_legacy, activa) VALUES (?, ?, 1)',
              [`Sede legacy ${clugar}`, parseInt(clugar, 10)]
            );
            sedeId = resSede.insertId;
            sedeCache.set(clugar, sedeId);
          }
        }
        const [resAsig] = await conn.query(
          `INSERT IGNORE INTO emo_perfil_asignacion (perfil_id, empresa_id, sede_id, clugar_legacy)
           VALUES (?, ?, ?, ?)`,
          [perfilId, empresaId, sedeId, clugar ? parseInt(clugar, 10) : null]
        );
        if (resAsig.affectedRows > 0) stats.asignaciones_creadas++;
      }

      if (!DRY_RUN && perfilExamenesBuffer.length > 0) {
        const values = perfilExamenesBuffer.map((x) => [
          perfilId,
          x.tipo_emo,
          x.examen_id,
          x.sexo_aplicable,
          x.edad_minima,
          x.edad_maxima,
          x.es_condicional,
        ]);
        const [resPe] = await conn.query(
          `INSERT IGNORE INTO emo_perfil_examenes
             (perfil_id, tipo_emo, examen_id, sexo_aplicable, edad_minima, edad_maxima, es_condicional)
           VALUES ?`,
          [values]
        );
        stats.perfil_examenes_insertados += resPe.affectedRows;
      } else {
        stats.perfil_examenes_insertados += perfilExamenesBuffer.length;
      }

      const precios = [
        { tipo: 'PREOC', val: normalizePrice(r[idx.precio_pre]) },
        { tipo: 'ANUAL', val: normalizePrice(r[idx.precio_anual]) },
        { tipo: 'RETIRO', val: normalizePrice(r[idx.precio_retiro]) },
      ].filter((p) => p.val > 0);

      for (const p of precios) {
        if (DRY_RUN) {
          stats.precios_insertados++;
          continue;
        }
        await conn.query(
          `INSERT INTO emo_perfil_precio (perfil_id, empresa_id, sede_id, tipo_emo, precio)
           VALUES (?, NULL, NULL, ?, ?)
           ON DUPLICATE KEY UPDATE precio = VALUES(precio), updated_at = CURRENT_TIMESTAMP`,
          [perfilId, p.tipo, p.val]
        );
        stats.precios_insertados++;
      }
    }

    if (!DRY_RUN) await conn.commit();
  } catch (err) {
    if (!DRY_RUN) await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  console.log('Resumen:');
  for (const [k, v] of Object.entries(stats)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log();
  console.log(`Exámenes legacy sin match únicos: ${sinMatchUnicos.size}`);
  [...sinMatchUnicos.values()].slice(0, 15).forEach((x) => {
    console.log(`  [${x.codigo}] ${x.nombre}`);
  });
  if (sinMatchUnicos.size > 15) console.log(`  ... y ${sinMatchUnicos.size - 15} más`);

  if (argv.reporte) {
    const reporte = {
      generado: new Date().toISOString(),
      xlsx: xlsxPath,
      modo: MODO,
      stats,
      sin_match: [...sinMatchUnicos.values()],
      mapeos_muestra: mapeosLog.slice(0, 200),
    };
    fs.writeFileSync(path.resolve(argv.reporte), JSON.stringify(reporte, null, 2), 'utf8');
    console.log('\nReporte guardado:', argv.reporte);
  }

  if (DRY_RUN) {
    console.log('\nDRY-RUN: no se escribió en la BD. Use --apply para importar.');
  }
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
    } catch (_) {}
    process.exit(1);
  });
