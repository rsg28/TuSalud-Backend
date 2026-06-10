require('dotenv').config();
const pool = require('../config/database');

async function main() {
  const [rows] = await pool.query(
    `SELECT id, nombre, activo, codigo
     FROM examenes
     WHERE LOWER(nombre) LIKE '%oftalmolog%'
     ORDER BY CHAR_LENGTH(nombre), nombre
     LIMIT 40`
  );
  console.log(`Exámenes con "oftalmolog" en nombre: ${rows.length}`);
  for (const r of rows) {
    console.log(`  ${r.id} | ${r.activo ? 'activo' : 'INACTIVO'} | ${r.nombre}`);
  }

  const [exact] = await pool.query(
    `SELECT id, nombre, activo FROM examenes WHERE UPPER(TRIM(nombre)) = 'EXAMEN OFTALMOLOGICO'`
  );
  console.log('\nExacto "EXAMEN OFTALMOLOGICO":', exact[0] ?? 'NO ENCONTRADO');

  const tokens = ['examen', 'oftalmologico'];
  const col = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(e.nombre),'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u')`;
  const w = tokens.map(() => `INSTR(${col}, ?) > 0`).join(' AND ');
  const [andRows] = await pool.query(
    `SELECT e.id, e.nombre
     FROM examenes e
     WHERE e.activo = 1 AND (${w})
     ORDER BY CHAR_LENGTH(e.nombre), e.nombre
     LIMIT 50`,
    tokens
  );
  console.log(`\nBúsqueda API (AND examen+oftalmologico, activos, LIMIT 50): ${andRows.length}`);
  for (const r of andRows.slice(0, 20)) {
    console.log(`  ${r.id} | ${r.nombre}`);
  }
  console.log('¿Incluye id 654 (EXAMEN OFTALMOLOGICO)?', andRows.some((r) => r.id === 654));

  const [audi] = await pool.query(
    `SELECT id, nombre, activo FROM examenes WHERE UPPER(TRIM(nombre)) LIKE '%AUDIOMETR%' AND activo = 1 LIMIT 10`
  );
  console.log('\nAudiometría en catálogo:', audi.length ? audi.map((r) => `${r.id}: ${r.nombre}`).join(' | ') : 'ninguno');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
