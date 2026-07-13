/**
 * scripts/probarBorradorCotizacion.js
 *
 * Prueba de humo para el flujo de BORRADORES DE COTIZACIÓN.
 *
 * Recibe uno o más archivos xlsx (o .docx / .pdf) y simula lo que hará el
 * pipeline en producción:
 *   1) Lee la hoja principal (o todas las hojas) con exceljs.
 *   2) Extrae candidatos a "nombres de perfil" y a "nombres de examen".
 *      La heurística es intencionalmente conservadora: no reemplaza al
 *      extractor real del frontend (`extraerPerfilesProtocoloCotizacion`),
 *      solo aproxima para dar una idea del matching.
 *   3) Se conecta a la BD real (usando .env) y aplica el MISMO matching
 *      normalizado que hace el endpoint `POST /api/borradores-cotizacion/
 *      resolver-nombres`.
 *   4) Reporta cobertura por archivo (perfiles/exámenes matched vs no).
 *
 * Uso:
 *   node scripts/probarBorradorCotizacion.js <archivo1> [<archivo2> ...]
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
require('dotenv').config();

const mysql = require('mysql2/promise');

/* -------------------------------------------------------------------------- */
/* Normalización (idéntica a la del backend `borradoresCotizacionController`) */
/* -------------------------------------------------------------------------- */

const MAP_TILDES = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n',
  Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ñ: 'n',
};

function normalizar(s) {
  let t = String(s || '').trim();
  t = t.replace(/\u00a0/g, ' ').replace(/[\u200b-\u200d\ufeff]/g, '');
  t = t.replace(/[áéíóúñÁÉÍÓÚÑ]/g, (c) => MAP_TILDES[c] || c);
  return t.toLowerCase().replace(/\s+/g, ' ');
}

function normalizarCompacto(s) {
  return normalizar(s).replace(/\s+/g, '');
}

/* -------------------------------------------------------------------------- */
/* Lectura de xlsx                                                            */
/* -------------------------------------------------------------------------- */

async function leerXlsx(rutaArchivo) {
  const buf = fs.readFileSync(rutaArchivo);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const hojas = [];
  for (const ws of wb.worksheets) {
    const filas = [];
    const maxRows = Math.min(ws.rowCount, 250);
    const maxCols = Math.min(ws.columnCount, 40);
    for (let r = 1; r <= maxRows; r++) {
      const row = ws.getRow(r);
      const values = [];
      for (let c = 1; c <= maxCols; c++) {
        const cell = row.getCell(c);
        const src = cell.isMerged ? cell.master : cell;
        let v = src.value;
        if (v && typeof v === 'object' && 'richText' in v) {
          v = v.richText.map((t) => t.text).join('');
        }
        if (v && typeof v === 'object' && 'result' in v) v = v.result;
        values.push(String(v ?? '').replace(/\s+/g, ' ').trim());
      }
      filas.push(values);
    }
    hojas.push({ name: ws.name, filas });
  }
  return hojas;
}

/* -------------------------------------------------------------------------- */
/* Heurística: candidatos a nombres de PERFIL                                 */
/* -------------------------------------------------------------------------- */

const RE_PERFIL = /(perfil|b[aá]sico|administrativ|operativ|conductor|manipulador|visita|equipo|altura|caliente|espacios? confinad|brigada|liviano|pesado|hudbay)/i;
const RE_EMO = /(preocupacional|pre-?ocupacional|ingreso|per[ií]?[oó]?dic|anual|retiro|visita|control|empo|emoa|emor)/i;

function extraerPerfilesCandidatos(hojas) {
  const set = new Set();
  const perfiles = [];
  const anadir = (nombre, tipo, hoja) => {
    const key = `${normalizarCompacto(nombre)}||${tipo}`;
    if (set.has(key)) return;
    set.add(key);
    perfiles.push({ nombre, tipo_emo: tipo, hoja });
  };

  for (const hoja of hojas) {
    // Recolectar celdas de header candidatos (primeras ~15 filas)
    for (let r = 0; r < Math.min(hoja.filas.length, 15); r++) {
      const row = hoja.filas[r];
      for (let c = 0; c < row.length; c++) {
        const v = row[c];
        if (!v || v.length < 4 || v.length > 120) continue;
        if (!RE_PERFIL.test(v)) continue;
        // Buscar en la fila siguiente/misma un indicador de tipo EMO
        const rowBelow = hoja.filas[r + 1] || [];
        const rowBelow2 = hoja.filas[r + 2] || [];
        const combined = `${v} ${rowBelow[c] || ''} ${rowBelow2[c] || ''}`;
        let tipo = null;
        if (/pre[ -]?ocupacional|ingreso|empo\b/i.test(combined)) tipo = 'PREOC';
        else if (/per[ií]?[oó]?dic|anual|emoa\b/i.test(combined)) tipo = 'ANUAL';
        else if (/retiro|emor\b/i.test(combined)) tipo = 'RETIRO';
        else if (/visita/i.test(combined)) tipo = 'VISITA';
        else tipo = null;
        anadir(v, tipo, hoja.name);
      }
    }
    // También la primera columna (ej. Bear Creek: filas = perfiles)
    for (let r = 0; r < hoja.filas.length; r++) {
      const v = (hoja.filas[r][0] || '').trim();
      if (!v || v.length < 4 || v.length > 120) continue;
      if (!RE_PERFIL.test(v)) continue;
      // Tipo EMO: buscar en filas superiores (encabezado de sección)
      let tipo = null;
      for (let k = r - 1; k >= Math.max(0, r - 10); k--) {
        const enc = hoja.filas[k].join(' ');
        if (/pre[ -]?ocupacional|ingreso/i.test(enc)) { tipo = 'PREOC'; break; }
        if (/per[ií]?[oó]?dic|anual/i.test(enc)) { tipo = 'ANUAL'; break; }
        if (/retiro/i.test(enc)) { tipo = 'RETIRO'; break; }
      }
      anadir(v, tipo, hoja.name);
    }
  }
  return perfiles;
}

/* -------------------------------------------------------------------------- */
/* Heurística: candidatos a nombres de EXAMEN                                 */
/* -------------------------------------------------------------------------- */

const RE_EXAMEN_STOP = /^(evaluaci[oó]n|examen m[eé]dico|laboratorio|oftalmolo|psicolo|precio|precio ?unitario|descripci[oó]n|tipo|perfil|anexo)$/i;

function extraerExamenesCandidatos(hojas) {
  const set = new Set();
  const examenes = [];
  for (const hoja of hojas) {
    for (let r = 0; r < hoja.filas.length; r++) {
      const row = hoja.filas[r];
      if (!row.length) continue;
      // Detectar la columna con más texto largo (probable "descripción de examen")
      for (let c = 0; c < Math.min(row.length, 4); c++) {
        const v = row[c] || '';
        if (v.length < 4 || v.length > 200) continue;
        if (RE_EXAMEN_STOP.test(v.trim())) continue;
        // Marca de examen: no puede ser puramente numérico
        if (/^[\d.\s()a-z%/-]{0,15}$/i.test(v)) continue;
        // Descartar frases obvias de header/titulo
        if (/^propuesta|^protocolo|^cotizac|^precio|^s\/\.|^sres|^empresa/i.test(v)) continue;
        if (/^\d+(\.\d+)?$/.test(v)) continue;
        // Debe parecer una etiqueta técnica: >=1 palabra "significativa"
        const words = v.split(/\s+/).filter((w) => w.length >= 3);
        if (words.length === 0) continue;
        const key = normalizarCompacto(v);
        if (set.has(key)) continue;
        set.add(key);
        examenes.push({ nombre: v, hoja: hoja.name, fila: r + 1, columna: c + 1 });
      }
    }
  }
  return examenes;
}

/* -------------------------------------------------------------------------- */
/* Matching contra BD                                                         */
/* -------------------------------------------------------------------------- */

async function matchearContraBd(pool, perfilesCandidatos, examenesCandidatos) {
  const [perfilesBd] = await pool.execute('SELECT id, nombre FROM emo_perfiles');
  const [examenesBd] = await pool.execute('SELECT id, nombre FROM examenes WHERE activo = 1');

  const perfilesResults = perfilesCandidatos.map((p) => {
    const norm = normalizar(p.nombre);
    const compact = normalizarCompacto(p.nombre);
    let match = perfilesBd.find((row) => normalizar(row.nombre) === norm);
    let laxa = false;
    if (!match && compact.length >= 2) {
      match = perfilesBd.find((row) => normalizarCompacto(row.nombre) === compact);
      if (match) laxa = true;
    }
    return {
      ...p,
      matched: !!match,
      perfil_id: match ? match.id : null,
      nombre_bd: match ? match.nombre : null,
      coincidencia_laxa: laxa,
    };
  });

  const examenesResults = examenesCandidatos.map((e) => {
    const norm = normalizar(e.nombre);
    const compact = normalizarCompacto(e.nombre);
    let match = examenesBd.find((row) => normalizar(row.nombre) === norm);
    let laxa = false;
    if (!match && compact.length >= 3) {
      match = examenesBd.find((row) => normalizarCompacto(row.nombre) === compact);
      if (match) laxa = true;
    }
    return {
      ...e,
      matched: !!match,
      examen_id: match ? match.id : null,
      nombre_bd: match ? match.nombre : null,
      coincidencia_laxa: laxa,
    };
  });

  return {
    perfiles: perfilesResults,
    examenes: examenesResults,
    totalesBd: { perfiles: perfilesBd.length, examenes: examenesBd.length },
  };
}

/* -------------------------------------------------------------------------- */
/* Reporte                                                                    */
/* -------------------------------------------------------------------------- */

function reportar(archivo, hojas, matches) {
  const base = path.basename(archivo);
  console.log('\n' + '='.repeat(90));
  console.log(`ARCHIVO: ${base}`);
  console.log('='.repeat(90));
  console.log(`Hojas: ${hojas.map((h) => h.name).join(', ')}`);

  const { perfiles, examenes, totalesBd } = matches;
  const pOk = perfiles.filter((x) => x.matched);
  const pFail = perfiles.filter((x) => !x.matched);
  const eOk = examenes.filter((x) => x.matched);
  const eFail = examenes.filter((x) => !x.matched);

  console.log(`\nPerfiles candidatos detectados: ${perfiles.length}`);
  console.log(`  → matched en BD: ${pOk.length}`);
  console.log(`  → sin match:     ${pFail.length}`);
  if (pOk.length > 0) {
    console.log('\n  ✓ Perfiles que SÍ están en BD:');
    for (const p of pOk.slice(0, 20)) {
      const tipo = p.tipo_emo || '?';
      const bd = p.nombre_bd !== p.nombre ? ` (BD: "${p.nombre_bd}")` : '';
      const laxa = p.coincidencia_laxa ? ' [laxa]' : '';
      console.log(`     · [${tipo}] ${p.nombre}${bd}${laxa}`);
    }
    if (pOk.length > 20) console.log(`     ... y ${pOk.length - 20} más`);
  }
  if (pFail.length > 0) {
    console.log('\n  ✗ Perfiles que NO están en BD:');
    for (const p of pFail.slice(0, 20)) {
      const tipo = p.tipo_emo || '?';
      console.log(`     · [${tipo}] ${p.nombre}`);
    }
    if (pFail.length > 20) console.log(`     ... y ${pFail.length - 20} más`);
  }

  console.log(`\nExámenes candidatos detectados: ${examenes.length}`);
  console.log(`  → matched en BD: ${eOk.length}`);
  console.log(`  → sin match:     ${eFail.length}`);
  if (eOk.length > 0) {
    console.log('\n  ✓ Exámenes que SÍ están en BD (primeros 20):');
    for (const e of eOk.slice(0, 20)) {
      const bd = e.nombre_bd !== e.nombre ? ` (BD: "${e.nombre_bd}")` : '';
      console.log(`     · ${e.nombre}${bd}`);
    }
    if (eOk.length > 20) console.log(`     ... y ${eOk.length - 20} más`);
  }
  if (eFail.length > 0) {
    console.log('\n  ✗ Exámenes que NO están en BD (primeros 30):');
    for (const e of eFail.slice(0, 30)) {
      console.log(`     · ${e.nombre}`);
    }
    if (eFail.length > 30) console.log(`     ... y ${eFail.length - 30} más`);
  }

  const totalItems = perfiles.length + examenes.length;
  const totalMatched = pOk.length + eOk.length;
  const cobertura = totalItems > 0 ? Math.round((totalMatched / totalItems) * 100) : 0;
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log(`  RESUMEN: ${totalMatched}/${totalItems} matched (${cobertura}%)`);
  console.log(`  puede_adjuntar: ${pFail.length === 0 && eFail.length === 0 && totalItems > 0 ? 'SÍ' : 'NO'}`);
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  (BD contiene ${totalesBd.perfiles} perfiles y ${totalesBd.examenes} exámenes activos)`);
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

function reportarSinBd(archivo, hojas, perfilesCand, examenesCand) {
  const base = path.basename(archivo);
  console.log('\n' + '='.repeat(90));
  console.log(`ARCHIVO: ${base}`);
  console.log('='.repeat(90));
  console.log(`Hojas: ${hojas.map((h) => h.name).join(', ')}`);
  console.log(`\n(SIN acceso a BD: solo muestro los candidatos DETECTADOS, sin match real)`);

  console.log(`\nPerfiles candidatos detectados: ${perfilesCand.length}`);
  for (const p of perfilesCand.slice(0, 30)) {
    console.log(`   · [${p.tipo_emo || '?'}] ${p.nombre}   (hoja: ${p.hoja})`);
  }
  if (perfilesCand.length > 30) console.log(`   ... y ${perfilesCand.length - 30} más`);

  console.log(`\nExámenes candidatos detectados: ${examenesCand.length}`);
  for (const e of examenesCand.slice(0, 40)) {
    console.log(`   · ${e.nombre}   (${e.hoja}, R${e.fila}C${e.columna})`);
  }
  if (examenesCand.length > 40) console.log(`   ... y ${examenesCand.length - 40} más`);
}

async function main() {
  const rutas = process.argv.slice(2);
  if (rutas.length === 0) {
    console.error('Uso: node scripts/probarBorradorCotizacion.js <archivo1> [<archivo2> ...]');
    process.exit(1);
  }

  // Intentar conectar a BD. Si falla, corremos en modo "solo candidatos".
  let pool = null;
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT || 3306),
      waitForConnections: true,
      connectionLimit: 3,
      connectTimeout: 4000,
    });
    await pool.execute('SELECT 1');
    console.log('✓ Conectado a la base de datos.');
  } catch (e) {
    console.warn(`⚠ No pude conectar a la BD (${e.code || e.message}).`);
    console.warn('  Corriendo en modo SIN matching (solo detección de candidatos).');
    if (pool) { try { await pool.end(); } catch (_) {} }
    pool = null;
  }

  try {
    for (const ruta of rutas) {
      const ext = path.extname(ruta).toLowerCase();
      const base = path.basename(ruta);
      if (ext === '.docx' || ext === '.doc') {
        console.log('\n' + '='.repeat(90));
        console.log(`ARCHIVO: ${base}`);
        console.log('='.repeat(90));
        console.log(`FORMATO NO SOPORTADO por el pipeline actual (.${ext.slice(1)}).`);
        console.log('El vendedor podrá subir el archivo (se guarda como respaldo),');
        console.log('pero NO se detectarán perfiles ni exámenes, así que el borrador');
        console.log('quedará marcado como "sin ítems detectados" y no se podrá');
        console.log('adjuntar a un pedido. Deberá exportarse como Excel para poder');
        console.log('vincularlo automáticamente.');
        continue;
      }
      if (ext !== '.xlsx' && ext !== '.xls') {
        console.log(`(saltando ${base}: extensión no soportada por el script)`);
        continue;
      }
      const hojas = await leerXlsx(ruta);
      const perfilesCand = extraerPerfilesCandidatos(hojas);
      const examenesCand = extraerExamenesCandidatos(hojas);
      if (pool) {
        const matches = await matchearContraBd(pool, perfilesCand, examenesCand);
        reportar(ruta, hojas, matches);
      } else {
        reportarSinBd(ruta, hojas, perfilesCand, examenesCand);
      }
    }
  } finally {
    if (pool) await pool.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e && e.stack ? e.stack : e);
  process.exit(1);
});
