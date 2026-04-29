const fs = require('fs');
const { extractPerfilPdfTablesFromBuffer } = require('../utils/extractPerfilPdfTablesV2');

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/dump-pdf-tables.js <ruta.pdf>');
    process.exit(1);
  }
  const buf = fs.readFileSync(file);
  const r = await extractPerfilPdfTablesFromBuffer(buf);
  console.log(`numpages=${r.numpages} tables=${r.tables.length}`);
  for (const t of r.tables) {
    console.log('---');
    console.log(`Tabla ${t.id} | ${t.nombre} | ${t.filas}x${t.columnas}`);
    for (const row of t.celdas) {
      console.log(JSON.stringify(row));
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
