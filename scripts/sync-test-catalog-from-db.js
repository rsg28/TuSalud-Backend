#!/usr/bin/env node
/**
 * Rellena TuSalud-Frontend/scripts/catalog_for_test_import.json con nombres reales
 * de emo_perfiles (tipo PERFIL) y examenes (activo).
 *
 * Uso:
 *   cd TuSalud-Backend && node scripts/sync-test-catalog-from-db.js
 *
 * Regenerar Excel (opcional, pasar rutas absolutas a tu plantilla y salida):
 *   node scripts/sync-test-catalog-from-db.js /ruta/datos_correctos_3.xlsx /ruta/salida.xlsx
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');

const FRONTEND_CATALOG =
  process.env.TUSALUD_CATALOG_JSON ||
  path.join(__dirname, '..', '..', 'TuSalud-Frontend', 'scripts', 'catalog_for_test_import.json');

function variantEspacios(nombre) {
  const t = String(nombre || '').trim();
  if (!t) return t;
  return `  ${t.replace(/\s+/g, '   ')}  `;
}

function variantCompacto(nombre) {
  return String(nombre || '').replace(/\s/g, '');
}

function variantExamen(nombre) {
  return `  ${String(nombre || '').trim().toLowerCase()}  `;
}

async function main() {
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
    if (!perfiles?.length) throw new Error('No hay filas en emo_perfiles con tipo PERFIL');
    if (!examenes?.length) throw new Error('No hay examenes activos');
    perfilNombre = String(perfiles[0].nombre).trim();
    examenNombre = String(examenes[0].nombre).trim();
  } finally {
    await pool.end();
  }

  const raw = fs.readFileSync(FRONTEND_CATALOG, 'utf8');
  const cat = JSON.parse(raw);
  cat.perfil_exacto = perfilNombre;
  cat.perfil_variante_espacios = variantEspacios(perfilNombre);
  cat.perfil_compacto_sin_espacios = variantCompacto(perfilNombre);
  cat.examen_exacto = examenNombre;
  cat.examen_variante_espacios_y_minusculas = variantExamen(examenNombre);
  cat._rellenado_desde_bd_en = new Date().toISOString();

  fs.writeFileSync(FRONTEND_CATALOG, JSON.stringify(cat, null, 2) + '\n', 'utf8');
  console.log('Catálogo actualizado:', FRONTEND_CATALOG);
  console.log('Perfil:', perfilNombre);
  console.log('Examen:', examenNombre);

  const tpl = process.argv[2];
  const out = process.argv[3];
  if (tpl && out) {
    const frontendRoot =
      process.env.TUSALUD_FRONTEND_ROOT || path.join(__dirname, '..', '..', 'TuSalud-Frontend');
    const cmd = `node scripts/generate-test-import-xlsx.js ${JSON.stringify(tpl)} ${JSON.stringify(
      path.join(frontendRoot, 'scripts', 'catalog_for_test_import.json')
    )} ${JSON.stringify(out)}`;
    execSync(cmd, { cwd: frontendRoot, stdio: 'inherit', shell: true });
    console.log('Excel:', out);
  } else {
    console.log('Solo JSON. Para generar .xlsx:');
    console.log(
      '  node scripts/sync-test-catalog-from-db.js /ruta/plantilla.xlsx /ruta/datos_prueba_catalogo_bd.xlsx'
    );
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
