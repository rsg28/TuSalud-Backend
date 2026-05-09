// Script temporal para diagnosticar por qué no se reconocen exámenes
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  // 1. Estado activo/inactivo
  const [[row]] = await conn.query(
    'SELECT COUNT(*) total, SUM(activo=1) activos, SUM(activo=0) inactivos FROM examenes'
  );
  console.log('=== Estado de exámenes ===');
  console.log('Total:', row.total, '| Activos:', row.activos, '| Inactivos:', row.inactivos);

  // 2. Muestra de nombres
  const [samples] = await conn.query(
    'SELECT id, nombre, codigo, activo FROM examenes ORDER BY id LIMIT 40'
  );
  console.log('\n=== Primeros 40 exámenes ===');
  samples.forEach(r =>
    console.log(`  [${r.activo ? 'ON' : 'OFF'}] id=${r.id} "${r.nombre}" cod=${r.codigo || '-'}`)
  );

  // 3. Búsqueda de términos comunes del Excel
  const terminos = [
    'Hemograma', 'Glucosa', 'EKG', 'electrocardiograma',
    'Audiometria', 'Espirometria', 'triaje', 'Laboratorio',
    'Radiografia', 'Rx', 'Grupo sanguineo', 'Colesterol',
    'Trigliceridos', 'orina'
  ];
  console.log('\n=== Búsqueda de términos del Excel (activos) ===');
  for (const t of terminos) {
    const [[{ n }]] = await conn.query(
      'SELECT COUNT(*) n FROM examenes WHERE INSTR(LOWER(nombre), LOWER(?)) > 0 AND activo=1', [t]
    );
    const [matches] = await conn.query(
      'SELECT nombre FROM examenes WHERE INSTR(LOWER(nombre), LOWER(?)) > 0 AND activo=1 LIMIT 3', [t]
    );
    const names = matches.map(r => r.nombre).join(', ');
    console.log(`  "${t}" -> ${n} encontrado(s)${names ? ': ' + names : ''}`);
  }

  // 4. Check examen_precio table
  const [[epRow]] = await conn.query('SELECT COUNT(*) n FROM examen_precio');
  console.log('\n=== Precios registrados ===');
  console.log('examen_precio rows:', epRow.n);

  await conn.end();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
