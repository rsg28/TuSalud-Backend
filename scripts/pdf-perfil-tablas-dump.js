/**
 * Vuelca las celdas de cada tabla (sin truncar) para depurar ordenamiento de cabeceras.
 * Uso: node scripts/pdf-perfil-tablas-dump.js <ruta.pdf> [--tabla N]
 */
const fs = require('fs');
const path = require('path');
const { extractPerfilPdfTablesFromBuffer } = require('../utils/extractPerfilPdfTablesV2');

async function main() {
  const rawArgs = process.argv.slice(2);
  const tablaFlagIdx = rawArgs.indexOf('--tabla');
  const onlyIdx = tablaFlagIdx >= 0 ? Number(rawArgs[tablaFlagIdx + 1]) : null;
  const args = rawArgs.filter((a, i) => a !== '--tabla' && rawArgs[i - 1] !== '--tabla');
  const pdfPath = args[0];
  if (!pdfPath) {
    console.error('Uso: node scripts/pdf-perfil-tablas-dump.js <archivo.pdf> [--tabla N]');
    process.exit(1);
  }
  const abs = path.isAbsolute(pdfPath) ? pdfPath : path.resolve(process.cwd(), pdfPath);
  const buf = fs.readFileSync(abs);
  const r = await extractPerfilPdfTablesFromBuffer(buf);
  const tables = Array.isArray(r.tables) ? r.tables : [];
  for (const t of tables) {
    if (onlyIdx && t.id !== onlyIdx) continue;
    console.log(`\n=== Tabla ${t.id} (${t.filas}x${t.columnas}) — ${t.nombre} ===`);
    t.celdas.forEach((row, i) => {
      const cells = row.map((c) => (c ? String(c) : '')).map((c) => c.replace(/\s+/g, ' ').slice(0, 38));
      console.log(String(i).padStart(3, ' '), '|', cells.join(' | '));
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
