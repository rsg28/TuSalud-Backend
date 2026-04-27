#!/usr/bin/env node
/**
 * Solo Node + mysql2: genera un .tsv (o .txt) con datos reales de RDS.
 * No requiere plantilla .xlsx ni exceljs. La app importa el mismo TSV/CSV.
 *
 * Usa .env de TuSalud-Backend: DB_HOST debe ser el **endpoint de RDS** (p. ej. …rds.amazonaws.com),
 * no la IP pública de EC2 (44.… es solo la API HTTP).
 *
 *   node scripts/generarTsvImportDesdeRds.js
 *   node scripts/generarTsvImportDesdeRds.js /ruta/salida.tsv
 *
 * O: IMPORT_TSV_SALIDA=./datos_import_prueba.txt
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const {
  PACIENTES_BASE,
  cargarCatalogoDesdeRds,
  pickPerfil,
  pickExamen,
} = require('./importDatosPruebaCatalogo');

const HEADER = [
  'N°',
  'Puesto de trabajo',
  'Perfil',
  'DNI',
  'Nombres Completos',
  'PREOC',
  'ANUAL',
  'RETIRO',
  'VISITA',
  'Evaluaciones adicionales / condicionales',
].join('\t');

function escaparCelda(s) {
  const t = String(s ?? '');
  if (/[\t\r\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function filaTsv(p, nFila, cat) {
  const perfil = pickPerfil(cat, p.perfil_key || 'exacto');
  const preoc = p.emo_preoc ? 'x' : '';
  const anual = p.emo_anual ? 'x' : '';
  const retiro = p.emo_retiro ? 'x' : '';
  const visita = p.emo_visita ? 'x' : '';
  const ads = Array.isArray(p.adicionales)
    ? p.adicionales.map((k) => pickExamen(cat, k)).filter(Boolean)
    : [];
  return [
    escaparCelda(String(nFila)),
    escaparCelda(p.puesto),
    escaparCelda(perfil),
    escaparCelda(String(p.dni)),
    escaparCelda(p.nombre),
    escaparCelda(preoc),
    escaparCelda(anual),
    escaparCelda(retiro),
    escaparCelda(visita),
    escaparCelda(ads.length ? ads.join(', ') : ''),
  ].join('\t');
}

async function main() {
  const salida =
    process.argv[2] ||
    process.env.IMPORT_TSV_SALIDA ||
    path.join(process.cwd(), 'datos_import_prueba.tsv');

  const pwd = String(process.env.DB_PASSWORD || '').replace(/^'+|'+$/g, '');
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: pwd,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    connectTimeout: 20000,
  });

  let outMeta;
  try {
    outMeta = await cargarCatalogoDesdeRds(pool);
  } finally {
    await pool.end();
  }

  const { cat, perfilNombre, examenNombre } = outMeta;
  const filas = PACIENTES_BASE.map((p, i) => filaTsv(p, i + 1, cat));
  const utf8 = `\uFEFF${HEADER}\n${filas.join('\n')}\n`;
  fs.writeFileSync(salida, utf8, { encoding: 'utf8' });

  console.log('OK', path.resolve(salida));
  console.log('RDS', process.env.DB_HOST, 'base:', process.env.DB_NAME);
  console.log('Perfil (1.º id PERFIL):', perfilNombre);
  console.log('Examen (1.º activo):', examenNombre);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
