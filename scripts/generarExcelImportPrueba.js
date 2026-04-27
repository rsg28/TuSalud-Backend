#!/usr/bin/env node
/**
 * EC2: lee RDS (vía .env) + plantilla Excel y escribe un .xlsx.
 * Perfil y examen base: el 1.º `emo_perfiles` (tipo PERFIL) y el 1.º `examenes` activo
 * (igual que generarTsvImportDesdeRds.js, definido en importDatosPruebaCatalogo.js).
 *
 * Sin plantilla, use: node scripts/generarTsvImportDesdeRds.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const ExcelJS = require('exceljs');
const {
  PACIENTES_BASE,
  cargarCatalogoDesdeRds,
  pickPerfil,
  pickExamen,
} = require('./importDatosPruebaCatalogo');

function marcarEmo(row, flags) {
  row.getCell(9).value = flags.visita ? 'x' : '';
  row.getCell(10).value = flags.retiro ? 'x' : '';
  row.getCell(11).value = flags.preoc ? 'x' : '';
  row.getCell(12).value = flags.anual ? 'x' : '';
}

function borrarFilasDatos(ws, desde, hasta) {
  for (let r = desde; r <= hasta; r++) {
    const row = ws.getRow(r);
    for (let c = 2; c <= 14; c++) {
      row.getCell(c).value = null;
    }
  }
}

async function main() {
  const plantilla =
    process.argv[2] ||
    process.env.IMPORT_EXCEL_PLANTILLA ||
    path.join(__dirname, 'fixtures', 'plantilla_import_empleados.xlsx');
  const salida =
    process.argv[3] ||
    process.env.IMPORT_EXCEL_SALIDA ||
    path.join(process.cwd(), 'datos_import_prueba.xlsx');

  if (!fs.existsSync(plantilla)) {
    console.error('Falta plantilla Excel:', plantilla);
    console.error('O genere sin plantilla: node scripts/generarTsvImportDesdeRds.js');
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
  });

  let cat;
  let perfilNombre;
  let examenNombre;
  try {
    const loaded = await cargarCatalogoDesdeRds(pool);
    cat = loaded.cat;
    perfilNombre = loaded.perfilNombre;
    examenNombre = loaded.examenNombre;
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

  const primeraFilaDatos = 13;
  borrarFilasDatos(ws, primeraFilaDatos, ws.rowCount);

  let n = 1;
  for (let i = 0; i < PACIENTES_BASE.length; i++) {
    const p = PACIENTES_BASE[i];
    const rowNum = primeraFilaDatos + i;
    const row = ws.getRow(rowNum);
    row.getCell(2).value = String(n++);
    row.getCell(3).value = p.puesto;
    row.getCell(4).value = p.puesto;
    row.getCell(5).value = p.puesto;
    row.getCell(6).value = p.nombre;
    row.getCell(7).value = String(p.dni);
    row.getCell(8).value = pickPerfil(cat, p.perfil_key || 'exacto');

    marcarEmo(row, {
      visita: !!p.emo_visita,
      retiro: !!p.emo_retiro,
      preoc: !!p.emo_preoc,
      anual: !!p.emo_anual,
    });

    const ads = Array.isArray(p.adicionales) ? p.adicionales.map((k) => pickExamen(cat, k)).filter(Boolean) : [];
    row.getCell(13).value = ads.length ? ads.join(', ') : '';
  }

  await wb.xlsx.writeFile(salida);
  console.log('OK', path.resolve(salida));
  console.log('Perfil BD:', perfilNombre);
  console.log('Examen BD:', examenNombre);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
