const fs = require('fs');
const ExcelJS = require('exceljs');

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/dump-xlsx-sheets.js <archivo.xlsx> [maxRows=30] [maxCols=20]');
    process.exit(1);
  }
  const maxRows = Number(process.argv[3] || 30);
  const maxCols = Number(process.argv[4] || 20);
  const skipEmpty = process.argv.includes('--skip-empty');
  const buf = fs.readFileSync(file);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  console.log(`Workbook: ${file}`);
  console.log(`Hojas: ${wb.worksheets.map((w) => w.name).join(', ')}`);
  for (const ws of wb.worksheets) {
    console.log(`\n--- HOJA: "${ws.name}" (filas ${ws.rowCount}, cols ${ws.columnCount}) ---`);
    const rows = Math.min(ws.rowCount, maxRows);
    for (let r = 1; r <= rows; r++) {
      const row = ws.getRow(r);
      const values = [];
      for (let c = 1; c <= Math.min(ws.columnCount, maxCols); c++) {
        const cell = row.getCell(c);
        const src = cell.isMerged ? cell.master : cell;
        let v = src.value;
        if (v && typeof v === 'object' && 'richText' in v) v = v.richText.map((t) => t.text).join('');
        if (v && typeof v === 'object' && 'result' in v) v = v.result;
        values.push(String(v ?? '').replace(/\s+/g, ' ').trim());
      }
      if (skipEmpty && values.every((v) => v === '')) continue;
      console.log(`R${r}: ${JSON.stringify(values)}`);
    }
    if (ws.rowCount > maxRows) console.log(`  ... ${ws.rowCount - maxRows} filas más`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
