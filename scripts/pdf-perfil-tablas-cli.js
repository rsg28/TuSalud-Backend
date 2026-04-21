/**
 * Extrae tablas de un PDF (misma lógica que /api/import/pdf-perfil-tablas).
 * Uso: node scripts/pdf-perfil-tablas-cli.js <ruta.pdf> [--debug]
 * No incluye rutas de clientes en el repo; la ruta va siempre por argumento.
 */
const fs = require('fs');
const path = require('path');
const { extractPerfilPdfTablesFromBuffer } = require('../utils/extractPerfilPdfTablesV2');

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--debug');
  const debug = process.argv.includes('--debug');
  const pdfPath = args[0];
  if (!pdfPath) {
    console.error('Uso: node scripts/pdf-perfil-tablas-cli.js <archivo.pdf> [--debug]');
    process.exit(1);
  }
  const abs = path.isAbsolute(pdfPath) ? pdfPath : path.resolve(process.cwd(), pdfPath);
  if (!fs.existsSync(abs)) {
    console.error('No existe el archivo:', abs);
    process.exit(1);
  }
  const buf = fs.readFileSync(abs);
  const r = await extractPerfilPdfTablesFromBuffer(buf, { debug });
  const summary = {
    archivo: abs,
    numpages: r.numpages,
    tablas: r.tables.length,
    detalle: r.tables.map((t) => ({ id: t.id, nombre: t.nombre, filas: t.filas, columnas: t.columnas })),
  };
  if (debug && r.debug) summary.debug = r.debug;
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
