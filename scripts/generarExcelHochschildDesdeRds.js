#!/usr/bin/env node
/**
 * Rellena la plantilla Excel Hochschild (mismo formato que datos_correctos_1.xlsx) con
 * al menos N filas de datos tomados de RDS: perfiles, tipos EMO y (si hay) pacientes de
 * `pedido_pacientes` con DNI. El resto reutiliza pares (perfil, tipo_emo) reales de
 * `emo_perfil_examenes` y DNI de secuencia 401xxxxx. Columna de adicionales en blanco
 * (sin adicionales), como "datos_correctos_sin_adicionales".
 *
 * Requiere .env de TuSalud-Backend (DB_HOST = endpoint RDS).
 *
 *   node scripts/generarExcelHochschildDesdeRds.js
 *   node scripts/generarExcelHochschildDesdeRds.js [plantilla] [salida] [mín. filas]
 *
 * Salida por defecto: <raíz TuSalud-Backend>/datos_hochschild_rds_60.xlsx (no el cwd),
 * para poder ejecutar con ruta absoluta al script y dejar el archivo siempre en el repo.
 *
 * En EC2 (una línea, sin cd):
 *   node /home/ubuntu/app/TuSalud-Backend/scripts/generarExcelHochschildDesdeRds.js
 *
 * O:  bash scripts/hochschild-rds-excel.sh
 *
 * Env:
 *   IMPORT_EXCEL_PLANTILLA — plantilla (default: scripts/fixtures/plantilla_hochschild_datos_correctos_1.xlsx)
 *   IMPORT_EXCEL_SALIDA
 *   HOCHSCHILD_MIN_FILAS (default: 60)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const ExcelJS = require('exceljs');

const TIPOS_EMO = ['PREOC', 'ANUAL', 'RETIRO', 'VISITA'];
const PRIMERA_FILA_DATOS = 13;
const DNI_SINTETICO_INICIO = 40100001;

/**
 * Cols 9-12: PREOC, ANUAL, RETIRO, VISITA (plantilla datos_correctos_1).
 * @param {import('exceljs').Row} row
 * @param {string} tipo - PREOC | ANUAL | RETIRO | VISITA
 */
function marcarEmoHochschild(row, tipo) {
  const x = (t) => (String(t) === String(tipo) ? 'x' : '');
  row.getCell(9).value = x('PREOC');
  row.getCell(10).value = x('ANUAL');
  row.getCell(11).value = x('RETIRO');
  row.getCell(12).value = x('VISITA');
}

function borrarFilasDatos(ws, desde, hasta) {
  const end = Math.min(hasta, ws.rowCount);
  for (let r = desde; r <= end; r += 1) {
    const row = ws.getRow(r);
    for (let c = 2; c <= 14; c += 1) {
      row.getCell(c).value = null;
    }
  }
}

/**
 * @returns {Promise<{
 *   pares: { perfil_nombre: string, tipo_emo: string }[],
 *   resumen: { pacientesReales: number, sintetico: number }
 * }>}
 */
const SQL_PERFIL_TIPO = `SELECT DISTINCT p.nombre AS perfil_nombre, m.tipo_emo
   FROM emo_perfiles p
   INNER JOIN emo_perfil_examenes m ON m.perfil_id = p.id
   WHERE p.tipo = 'PERFIL'
   ORDER BY p.id, m.tipo_emo`;

const SQL_PACS = `SELECT
   pp.dni,
   pp.nombre_completo,
   NULLIF(TRIM(pp.cargo), '') AS cargo,
   ep.nombre AS perfil_nombre,
   pp.emo_tipo AS emo_tipo
  FROM pedido_pacientes pp
  INNER JOIN emo_perfiles ep ON ep.id = pp.emo_perfil_id AND ep.tipo = 'PERFIL'
  WHERE TRIM(pp.dni) <> ''
  ORDER BY pp.id DESC`;

async function recopilarPlan(pool, minFilas) {
  const [paresJoin, queryPacs] = await Promise.all([
    pool.query(SQL_PERFIL_TIPO).then((r) => r[0]),
    pool
      .query(SQL_PACS)
      .then((r) => r[0])
      .catch(() => []),
  ]);

  let pares = paresJoin.map((row) => ({
    perfil_nombre: String(row.perfil_nombre).trim(),
    tipo_emo: String(row.tipo_emo).trim().toUpperCase(),
  }));
  pares = pares.filter(
    (p) => p.perfil_nombre && TIPOS_EMO.includes(/** @type {string} */ (p.tipo_emo))
  );

  if (pares.length === 0) {
    const [perfiles] = await pool.query(
      "SELECT id, nombre FROM emo_perfiles WHERE tipo = 'PERFIL' ORDER BY id"
    );
    pares = perfiles.map((r) => ({
      perfil_nombre: String(r.nombre).trim(),
      tipo_emo: 'PREOC',
    }));
  }

  if (pares.length === 0) {
    throw new Error('No hay perfiles catálogo (emo_perfiles tipo PERFIL) en RDS.');
  }

  const tipoPorPerfil = new Map();
  for (const p of pares) {
    if (!tipoPorPerfil.has(p.perfil_nombre)) {
      tipoPorPerfil.set(p.perfil_nombre, p.tipo_emo);
    }
  }

  const dniVistos = new Set();
  const filas = /** @type {{ puesto: string, perfil: string, dni: string, nombre: string, tipo: string, fuente: string }[]} */ (
    []
  );

  for (const row of queryPacs) {
    const dni = String(row.dni ?? '')
      .trim()
      .replace(/\s/g, '');
    if (!/^\d{1,20}$/.test(dni) || dniVistos.has(dni)) continue;
    dniVistos.add(dni);
    const perfilNombre = String(row.perfil_nombre).trim();
    const nombre = String(row.nombre_completo ?? '').trim() || 'Sin nombre';
    const puesto = String(row.cargo ?? '').trim() || perfilNombre;
    let tipo = String(row.emo_tipo ?? '').trim().toUpperCase();
    if (!TIPOS_EMO.includes(/** @type {string} */ (tipo))) {
      const t = tipoPorPerfil.get(perfilNombre) ?? pares[0].tipo_emo;
      tipo = t;
    }
    if (!TIPOS_EMO.includes(/** @type {string} */ (tipo))) tipo = 'PREOC';
    filas.push({
      puesto,
      perfil: perfilNombre,
      dni,
      nombre,
      tipo,
      fuente: 'pedido_pacientes',
    });
  }

  let nextDni = DNI_SINTETICO_INICIO;
  for (let i = 0; filas.length < minFilas; i += 1) {
    const p = pares[i % pares.length];
    let dni;
    do {
      dni = String(nextDni);
      nextDni += 1;
    } while (dniVistos.has(dni));
    dniVistos.add(dni);
    const n = filas.length + 1;
    filas.push({
      puesto: p.perfil_nombre,
      perfil: p.perfil_nombre,
      dni,
      nombre: `Catálogo Import, Dato ${n}`,
      tipo: p.tipo_emo,
      fuente: 'emo_perfil_examenes',
    });
  }

  const reales = filas.filter((f) => f.fuente === 'pedido_pacientes').length;
  return {
    pares: filas,
    resumen: {
      pacientesReales: reales,
      sintetico: filas.length - reales,
    },
  };
}

async function main() {
  const backRoot = path.join(__dirname, '..');
  const defPlantilla = path.join(
    __dirname,
    'fixtures',
    'plantilla_hochschild_datos_correctos_1.xlsx'
  );
  const plantilla =
    process.argv[2] || process.env.IMPORT_EXCEL_PLANTILLA || defPlantilla;
  const salida =
    process.argv[3] ||
    process.env.IMPORT_EXCEL_SALIDA ||
    path.join(backRoot, 'datos_hochschild_rds_60.xlsx');
  const minArg = process.argv[4] ?? process.env.HOCHSCHILD_MIN_FILAS;
  const minFilas = Math.max(
    1,
    minArg !== undefined && minArg !== '' && !Number.isNaN(parseInt(String(minArg), 10))
      ? parseInt(String(minArg), 10)
      : 60
  );

  if (!fs.existsSync(plantilla)) {
    console.error('Falta plantilla Excel:', path.resolve(plantilla));
    process.exit(1);
  }

  const pwd = String(process.env.DB_PASSWORD || '').replace(/^'+|'+$/g, '');
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: pwd,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    connectTimeout: 20000,
    connectionLimit: 2,
  });

  let pares;
  let resumen;
  try {
    const out = await recopilarPlan(pool, minFilas);
    pares = out.pares;
    resumen = out.resumen;
  } finally {
    await pool.end();
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(plantilla);
  const ws = wb.worksheets[0];
  if (!ws) {
    console.error('La plantilla no tiene hojas.');
    process.exit(1);
  }

  const maxLimpiar = Math.min(
    ws.rowCount,
    PRIMERA_FILA_DATOS + Math.max(minFilas, pares.length) + 5
  );
  borrarFilasDatos(ws, PRIMERA_FILA_DATOS, maxLimpiar);

  for (let i = 0; i < pares.length; i += 1) {
    const p = pares[i];
    const rowNum = PRIMERA_FILA_DATOS + i;
    const row = ws.getRow(rowNum);
    row.getCell(2).value = String(i + 1);
    row.getCell(3).value = p.puesto;
    row.getCell(4).value = p.puesto;
    row.getCell(5).value = p.puesto;
    row.getCell(6).value = p.perfil;
    row.getCell(7).value = String(p.dni);
    row.getCell(8).value = p.nombre;
    marcarEmoHochschild(row, p.tipo);
    row.getCell(13).value = '';
  }

  await wb.xlsx.writeFile(salida);
  console.log('OK', path.resolve(salida));
  console.log('Filas:', pares.length, '— pacientes reales (pedido_pacientes):', resumen.pacientesReales, '— rellenadas desde catálogo:', resumen.sintetico);
  console.log('RDS', process.env.DB_HOST, 'base:', process.env.DB_NAME);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
