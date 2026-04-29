const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { extractPerfilPdfTablesFromBuffer } = require('../utils/extractPerfilPdfTablesV2');

const pdfPath = (process.env.PDF_PERFIL_TABLES_PATH || '').trim();
const hasPdf = pdfPath.length > 0 && fs.existsSync(path.resolve(pdfPath));

test('extractPerfilPdfTablesFromBuffer: detecta tablas en PDF de protocolo', { skip: !hasPdf }, async () => {
  const absolutePath = path.resolve(pdfPath);
  const buffer = fs.readFileSync(absolutePath);
  const result = await extractPerfilPdfTablesFromBuffer(buffer);

  assert.equal(result.ok, true);
  assert.ok(result.numpages >= 1);
  assert.ok(Array.isArray(result.tables));
  assert.ok(result.tables.length >= 1);

  const hasRows = result.tables.some((t) => (t.filas || 0) >= 2);
  const hasCols = result.tables.some((t) => (t.columnas || 0) >= 3);
  assert.equal(hasRows, true);
  assert.equal(hasCols, true);
});
