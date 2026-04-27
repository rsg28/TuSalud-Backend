#!/usr/bin/env node
/**
 * Lista emo_perfiles y examenes activos para rellenar catalog_for_test_import.json
 * del generador de Excel de prueba.
 *
 * Uso: node scripts/export-catalog-json.js > catalog_snapshot.json
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pwd = String(process.env.DB_PASSWORD || '').replace(/^'+|'+$/g, '');
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: pwd,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    connectTimeout: 15000,
  });
  try {
    const [pf] = await pool.execute(
      'SELECT id, nombre, tipo FROM emo_perfiles ORDER BY nombre ASC LIMIT 80'
    );
    const [ex] = await pool.execute(
      'SELECT id, nombre FROM examenes WHERE activo = 1 ORDER BY nombre ASC LIMIT 120'
    );
    process.stdout.write(
      JSON.stringify(
        {
          exportado_en: new Date().toISOString(),
          perfiles: pf,
          examenes: ex,
        },
        null,
        2
      ) + '\n'
    );
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
