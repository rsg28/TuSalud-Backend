/**
 * Uso: node scripts/ocrOnce.js <ruta.png>
 * Escribe el texto OCR en stdout (UTF-8).
 */
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

const imgPath = process.argv[2];
if (!imgPath || !fs.existsSync(imgPath)) {
  console.error('Uso: node scripts/ocrOnce.js <imagen>');
  process.exit(1);
}

(async () => {
  const buf = fs.readFileSync(path.resolve(imgPath));
  const worker = await createWorker('spa+eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(buf, {
      tessedit_pageseg_mode: 6,
    });
    process.stdout.write(String(text || ''));
  } finally {
    await worker.terminate();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
