#!/usr/bin/env node
/**
 * EC2 / mismo host que RDS: lee dotenv + MySQL y genera un .xlsx de importación Hochschild.
 * Depende solo del backend (mysql2, exceljs, dotenv).
 *
 * Requiere una plantilla Excel (copiar una vez datos_correctos_3.xlsx al servidor).
 *
 * Uso (en el servidor, con .env y una plantilla Hochschild, p. ej. datos_correctos_3.xlsx):
 *   node scripts/generarExcelImportPrueba.js ~/plantilla.xlsx ./datos_import_prueba.xlsx
 *
 * Variables: IMPORT_EXCEL_PLANTILLA, IMPORT_EXCEL_SALIDA
 * La hoja rellenada solo usa nombres reales de la BD; no incluye perfiles ni exámenes inexistentes.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const ExcelJS = require('exceljs');

/**
 * Nombres de empleado solo para trazabilidad. Perfil y exámenes se rellenan con la 1.ª
 * fila real de `emo_perfiles` + `examenes` (mismo criterio que al generar al vuelo).
 * Tipos EMO: solo PREOC/ANUAL si en tu BD el perfil no tiene RETIRO/VISITA mapeados
 * (evita avisos "perfil sin exámenes" por datos incompletos).
 * Para pruebas negativas (perfil o examen inexistente) use otra hoja o edite a mano.
 */
const PACIENTES_BASE = [
  {
    puesto: 'Soldador',
    nombre: 'Prueba Alfa, Exacto Catalogo',
    dni: '40001001',
    emo_preoc: true,
    perfil_key: 'exacto',
    adicionales: ['exacto'],
  },
  {
    puesto: 'Almacén',
    nombre: 'Prueba Beta, Perfil Espacios',
    dni: '40001002',
    emo_preoc: true,
    perfil_key: 'espacios',
  },
  {
    puesto: 'Electricista',
    nombre: 'Prueba Gamma, Compacto',
    dni: '40001003',
    emo_anual: true,
    perfil_key: 'compacto',
  },
  {
    puesto: 'Seguridad',
    nombre: 'Prueba Delta, Mismo Perfil',
    dni: '40001004',
    emo_preoc: true,
    perfil_key: 'exacto',
  },
  {
    puesto: 'Supervisor',
    nombre: 'Prueba Echo, Adicionales',
    dni: '40001005',
    emo_preoc: true,
    perfil_key: 'exacto',
    adicionales: ['exacto', 'variante'],
  },
  {
    puesto: 'Administración',
    nombre: 'Prueba Foxtrot Preoc',
    dni: '40001006',
    emo_preoc: true,
    perfil_key: 'exacto',
    adicionales: ['variante'],
  },
  {
    puesto: 'Campo',
    nombre: 'Prueba Golf Anual',
    dni: '40001007',
    emo_anual: true,
    perfil_key: 'espacios',
  },
];

const PERFIL_INEXISTENTE = 'ZZZ_PERFIL_TOTALMENTE_INEXISTENTE_EN_BD';
const EXAMEN_INEXISTENTE = 'XXX_ESTUDIO_FICTICIO_PARA_PRUEBA_NEGATIVA';

function variantEspacios(n) {
  const t = String(n || '').trim();
  return t ? `  ${t.replace(/\s+/g, '   ')}  ` : t;
}
function variantCompacto(n) {
  return String(n || '').replace(/\s/g, '');
}
function variantExamen(n) {
  return `  ${String(n || '').trim().toLowerCase()}  `;
}

function pickPerfil(cat, key) {
  switch (key) {
    case 'exacto':
      return cat.perfil_exacto;
    case 'espacios':
      return cat.perfil_variante_espacios;
    case 'compacto':
      return cat.perfil_compacto_sin_espacios;
    case 'inexistente':
      return cat.perfil_inexistente;
    default:
      return cat.perfil_exacto;
  }
}

function pickExamen(cat, key) {
  switch (key) {
    case 'exacto':
      return cat.examen_exacto;
    case 'variante':
      return cat.examen_variante;
    case 'inexistente':
      return cat.examen_inexistente;
    default:
      return '';
  }
}

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
    console.error('Copie datos_correctos_3.xlsx al servidor y pase la ruta como 1er argumento.');
    process.exit(1);
  }

  const pwd = String(process.env.DB_PASSWORD || '').replace(/^'+|'+$/g, '');
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: pwd,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    connectTimeout: 20000,
  });

  let perfilNombre;
  let examenNombre;
  try {
    const [perfiles] = await pool.execute(
      "SELECT nombre FROM emo_perfiles WHERE tipo = 'PERFIL' ORDER BY id ASC LIMIT 1"
    );
    const [examenes] = await pool.execute(
      'SELECT nombre FROM examenes WHERE activo = 1 ORDER BY id ASC LIMIT 1'
    );
    if (!perfiles?.length) throw new Error('Sin emo_perfiles tipo PERFIL');
    if (!examenes?.length) throw new Error('Sin examenes activos');
    perfilNombre = String(perfiles[0].nombre).trim();
    examenNombre = String(examenes[0].nombre).trim();
  } finally {
    await pool.end();
  }

  const cat = {
    perfil_exacto: perfilNombre,
    perfil_variante_espacios: variantEspacios(perfilNombre),
    perfil_compacto_sin_espacios: variantCompacto(perfilNombre),
    perfil_inexistente: PERFIL_INEXISTENTE,
    examen_exacto: examenNombre,
    examen_variante: variantExamen(examenNombre),
    examen_inexistente: EXAMEN_INEXISTENTE,
  };

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

    const ads = Array.isArray(p.adicionales)
      ? p.adicionales.map((k) => pickExamen(cat, k)).filter(Boolean)
      : [];
    row.getCell(13).value = ads.length ? ads.join(', ') : '';
  }

  await wb.xlsx.writeFile(salida);
  console.log('OK', salida);
  console.log('Perfil BD:', perfilNombre);
  console.log('Examen BD:', examenNombre);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
