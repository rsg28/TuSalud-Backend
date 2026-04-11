const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const { createWorker } = require('tesseract.js');

async function preprocessForOcr(buffer) {
  const j = await Jimp.read(buffer);
  j.greyscale().contrast(0.15);
  if (j.bitmap.width < 1800) j.scale(2);
  return j.getBufferAsync(Jimp.MIME_PNG);
}

async function main() {
  const imgPath = process.argv[2];
  if (!imgPath) {
    console.error('Uso: node scripts/ocrPreprocess.js <imagen.png> [out.txt]');
    process.exit(1);
  }
  const raw = fs.readFileSync(path.resolve(imgPath));
  const proc = await preprocessForOcr(raw);
  const worker = await createWorker('spa+eng');
  let text;
  try {
    const r = await worker.recognize(proc, { tessedit_pageseg_mode: 6 });
    text = String(r.data.text || '');
  } finally {
    await worker.terminate();
  }
  const out = process.argv[3];
  if (out) fs.writeFileSync(out, text, 'utf8');
  else process.stdout.write(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
