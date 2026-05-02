const fs = require('fs');
const { extractPerfilPdfTablesFromBuffer } = require('../utils/extractPerfilPdfTablesV2');

(async () => {
  const file = process.argv[2];
  const out = process.argv[3];
  if (!file || !out) {
    console.error('Uso: node scripts/dump-pdf-tables-json.js <input.pdf> <output.json>');
    process.exit(1);
  }
  const buf = fs.readFileSync(file);
  const r = await extractPerfilPdfTablesFromBuffer(buf);
  fs.writeFileSync(out, JSON.stringify({ numpages: r.numpages, tables: r.tables }, null, 2));
  console.log(`Escrito ${out} (numpages=${r.numpages}, tables=${r.tables.length})`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
