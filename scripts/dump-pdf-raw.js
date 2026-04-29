const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/dump-pdf-raw.js <ruta.pdf>');
    process.exit(1);
  }
  const pkgJson = require.resolve('pdfjs-dist/package.json');
  const root = path.dirname(pkgJson);
  const legacyPdf = path.join(root, 'legacy', 'build', 'pdf.mjs');
  const legacyWorker = path.join(root, 'legacy', 'build', 'pdf.worker.mjs');
  const pdfjsLib = await import(pathToFileURL(legacyPdf).href);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(legacyWorker).href;

  const data = new Uint8Array(fs.readFileSync(file));
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const text = await page.getTextContent({ normalizeWhitespace: false });
    const items = text.items
      .filter((it) => String(it.str).trim())
      .map((it) => ({
        str: it.str,
        x: Math.round((it.transform[4] || 0) * 100) / 100,
        y: Math.round((it.transform[5] || 0) * 100) / 100,
        w: Math.round((it.width || 0) * 100) / 100,
      }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    console.log(`# PAGE ${p} (${items.length} items)`);
    for (const it of items) {
      console.log(`y=${it.y}\tx=${it.x}\tw=${it.w}\t${JSON.stringify(it.str)}`);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
