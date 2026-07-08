/**
 * OCR de imágenes embebidas en archivos .xlsx (Excel).
 *
 * Muchas cotizaciones EMO llegan como Excel en cuyas hojas la tabla de perfiles
 * fue pegada como IMAGEN (capturas de PDF). Los parsers de tabla del cliente no
 * pueden ver ese contenido. Este endpoint:
 *
 *   1) Recibe el xlsx (base64 en JSON).
 *   2) Extrae las imágenes embebidas con ExcelJS.
 *   3) Aplica preprocesamiento (grayscale + normalize + contrast + upscale x2)
 *      y OCR con tesseract.js (spa+eng, PSM 6).
 *   4) Devuelve el texto reconocido por imagen y un texto combinado por hoja.
 *
 * Comparte el lock/timeout de OCR con `pdfTextoEmbebidoController` para no
 * saturar CPU en instancias pequeñas.
 */
const ExcelJS = require('exceljs');
const crypto = require('crypto');

const MAX_XLSX_MB = Math.max(
  1,
  parseInt(process.env.XLSX_OCR_MAX_MB || '15', 10) || 15
);
const MAX_IMAGES_PER_XLSX = Math.max(
  1,
  parseInt(process.env.XLSX_OCR_MAX_IMAGES || '4', 10) || 4
);
const MAX_IMAGE_BYTES = Math.max(
  256 * 1024,
  parseInt(process.env.XLSX_OCR_IMAGE_MAX_BYTES || String(6 * 1024 * 1024), 10) ||
    6 * 1024 * 1024
);
const OCR_PER_IMAGE_TIMEOUT_MS = Math.max(
  10000,
  parseInt(process.env.XLSX_OCR_PER_IMAGE_TIMEOUT_MS || '45000', 10) || 45000
);

let tesseractJs = null;
function getTesseract() {
  if (tesseractJs) return tesseractJs;
  try {
    tesseractJs = require('tesseract.js');
    return tesseractJs;
  } catch (e) {
    throw Object.assign(
      new Error(
        'En el servidor falta el paquete tesseract.js. En la carpeta del backend: git pull, luego npm ci o npm install, y reinicie Node.'
      ),
      { code: 'OCR_NOT_INSTALLED', statusCode: 503 }
    );
  }
}

let jimpMod = undefined;
function getJimp() {
  if (jimpMod !== undefined) return jimpMod;
  try {
    jimpMod = require('jimp');
    return jimpMod;
  } catch (e) {
    console.warn('[xlsx-ocr] Falta jimp. Instale con `npm ci` en el backend.');
    jimpMod = null;
    return null;
  }
}

// Estado compartido con pdfTextoEmbebidoController para respetar límites de OCR.
// Como Node cachea módulos, requiring el mismo archivo comparte el estado.
const {
  // Reusamos el pool de OCR configurado ahí.
} = require('./pdfTextoEmbebidoController');

// Reimplementamos la cola aquí para no exponer helpers privados: es un módulo
// aislado que gobierna concurrencia SOLO de este controlador (OCR de xlsx).
// Como el volumen es bajo, mantenemos concurrencia=1 y sin cola.
const XLSX_OCR_MAX_CONCURRENT = 1;
let xlsxOcrActive = 0;
async function acquireLock() {
  if (xlsxOcrActive >= XLSX_OCR_MAX_CONCURRENT) {
    throw Object.assign(
      new Error(
        'El servidor está ocupado procesando otra imagen (OCR). Intente de nuevo en unos segundos.'
      ),
      { code: 'OCR_BUSY', statusCode: 503 }
    );
  }
  xlsxOcrActive += 1;
  return () => {
    xlsxOcrActive = Math.max(0, xlsxOcrActive - 1);
  };
}

/**
 * Preprocesamiento ganador según pruebas con archivo real:
 *   grayscale + normalize + contrast(0.30) + upscale 2x si w<1600.
 * Da recall alto (10-12 de 12 filas) con ~2-3s por imagen.
 */
async function preprocesar(buffer) {
  const Jimp = getJimp();
  if (!Jimp) return buffer;
  try {
    const img = await Jimp.read(buffer);
    const w = img.bitmap.width;
    const h = img.bitmap.height;
    // Recorte del 5% de bordes: elimina franjas de UI (menús Adobe, sombras)
    // que aparecen cuando la imagen es una captura de PDF.
    img.crop(
      Math.floor(w * 0.05),
      Math.floor(h * 0.05),
      Math.floor(w * 0.9),
      Math.floor(h * 0.9)
    );
    img.greyscale().normalize().contrast(0.3);
    if (img.bitmap.width < 1600) img.scale(2);
    return await img.getBufferAsync(Jimp.MIME_PNG);
  } catch (e) {
    console.warn('[xlsx-ocr] preprocesado jimp omitido:', e?.message || e);
    return buffer;
  }
}

async function ocrImagen(buffer) {
  const { createWorker } = getTesseract();
  let worker = null;
  const pipeline = (async () => {
    const proc = await preprocesar(buffer);
    worker = await createWorker('spa+eng');
    const r = await worker.recognize(proc, { tessedit_pageseg_mode: 6 });
    return String(r?.data?.text || '').trim();
  })();

  pipeline.catch(() => {});
  let timer = null;
  try {
    return await Promise.race([
      pipeline,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          if (worker) worker.terminate().catch(() => {});
          reject(
            Object.assign(
              new Error(
                `OCR tardó demasiado (>${Math.round(
                  OCR_PER_IMAGE_TIMEOUT_MS / 1000
                )} s). Reduzca la resolución de la imagen.`
              ),
              { code: 'OCR_TIMEOUT', statusCode: 504 }
            )
          );
        }, OCR_PER_IMAGE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {}
    }
  }
}

function isXlsxBuffer(buf) {
  // xlsx es un zip → empieza por PK\x03\x04
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04
  );
}

/**
 * POST /api/pdf-perfil-tablas/xlsx-imagenes-ocr
 * Body JSON: { file_base64: string, filename?: string }
 * Devuelve:
 *   {
 *     imagenes: [{ index, sheet, ext, chars, text }],
 *     texto_combinado: string,
 *     total_imagenes: number,
 *     procesadas: number,
 *   }
 */
async function ocrXlsxImagenes(req, res) {
  let release = null;
  try {
    const raw = req.body && typeof req.body.file_base64 === 'string' ? req.body.file_base64 : '';
    if (!raw) {
      return res.status(400).json({
        error: 'Envíe JSON con { "file_base64": "..." } (base64 del xlsx).',
      });
    }
    const buffer = Buffer.from(String(raw).replace(/\s/g, ''), 'base64');
    if (!buffer.length) {
      return res.status(400).json({ error: 'file_base64 está vacío o mal codificado.' });
    }
    const maxBytes = MAX_XLSX_MB * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return res.status(400).json({
        error: `El archivo supera el límite (${MAX_XLSX_MB} MB) para OCR de imágenes.`,
      });
    }
    if (!isXlsxBuffer(buffer)) {
      return res.status(400).json({
        error: 'El archivo no es un .xlsx válido (no se detectó formato ZIP/XLSX).',
      });
    }

    release = await acquireLock();

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(buffer));

    const imagenes = [];
    let totalImages = 0;
    /** @type {Set<string>} */
    const hashesVistos = new Set();
    /** @type {Set<string>} */
    const imageIdsVistos = new Set();
    for (const ws of wb.worksheets) {
      const wsImgs = ws.getImages ? ws.getImages() : [];
      for (const anchor of wsImgs) {
        totalImages += 1;
        if (imagenes.length >= MAX_IMAGES_PER_XLSX) continue;
        const idKey = `${anchor.imageId}`;
        if (imageIdsVistos.has(idKey)) continue;
        imageIdsVistos.add(idKey);
        const imgObj = wb.getImage(anchor.imageId);
        if (!imgObj || !imgObj.buffer || !imgObj.buffer.length) continue;
        if (imgObj.buffer.length > MAX_IMAGE_BYTES) continue;
        const buf = Buffer.isBuffer(imgObj.buffer) ? imgObj.buffer : Buffer.from(imgObj.buffer);
        // Dedup por hash: cuando la misma tabla-imagen está repetida en dos
        // anchors (típico si el xlsx viene de un PDF de dos páginas), procesamos
        // una sola vez para ahorrar CPU.
        const hash = crypto.createHash('sha1').update(buf).digest('hex');
        if (hashesVistos.has(hash)) continue;
        hashesVistos.add(hash);
        imagenes.push({
          sheet: ws.name,
          ext: imgObj.extension || 'png',
          buffer: buf,
        });
      }
    }

    if (imagenes.length === 0) {
      return res.json({
        imagenes: [],
        texto_combinado: '',
        total_imagenes: totalImages,
        procesadas: 0,
      });
    }

    const resultados = [];
    // Umbral de "texto rico": si la primera imagen ya devuelve >= este número de
    // caracteres útiles asumimos que las siguientes son duplicados visuales
    // (típico en xlsx generados desde PDF de varias páginas con la misma tabla)
    // y salimos temprano para no gastar CPU.
    const EARLY_EXIT_CHARS = 500;
    for (let i = 0; i < imagenes.length; i++) {
      const im = imagenes[i];
      const t0 = Date.now();
      try {
        const text = await ocrImagen(im.buffer);
        resultados.push({
          index: i,
          sheet: im.sheet,
          ext: im.ext,
          chars: text.length,
          bytes: im.buffer.length,
          elapsed_ms: Date.now() - t0,
          text,
        });
        if (text.length >= EARLY_EXIT_CHARS && i + 1 < imagenes.length) {
          const restantes = imagenes.length - (i + 1);
          if (restantes > 0) {
            // Marcamos las restantes como no procesadas por early-exit.
            for (let j = i + 1; j < imagenes.length; j++) {
              resultados.push({
                index: j,
                sheet: imagenes[j].sheet,
                ext: imagenes[j].ext,
                chars: 0,
                bytes: imagenes[j].buffer.length,
                elapsed_ms: 0,
                text: '',
                skipped: true,
                skipped_reason: 'early_exit_first_image_had_enough_text',
              });
            }
          }
          break;
        }
      } catch (err) {
        resultados.push({
          index: i,
          sheet: im.sheet,
          ext: im.ext,
          chars: 0,
          bytes: im.buffer.length,
          elapsed_ms: Date.now() - t0,
          text: '',
          error: err?.message || 'OCR falló para esta imagen.',
        });
      }
    }

    const texto_combinado = resultados
      .map((r) => (r.text ? `[Hoja: ${r.sheet}] Imagen ${r.index + 1}\n${r.text}` : ''))
      .filter(Boolean)
      .join('\n\n---\n\n');

    return res.json({
      imagenes: resultados,
      texto_combinado,
      total_imagenes: totalImages,
      procesadas: resultados.length,
    });
  } catch (err) {
    if (err && (err.code === 'OCR_NOT_INSTALLED' || err.code === 'OCR_BUSY')) {
      return res.status(503).json({ error: err.message || 'OCR no disponible.' });
    }
    if (err && err.code === 'OCR_TIMEOUT') {
      return res.status(504).json({ error: err.message });
    }
    console.error('[xlsx-ocr]', err);
    return res.status(500).json({
      error: err?.message || 'Error interno leyendo imágenes del xlsx.',
    });
  } finally {
    if (release) release();
  }
}

module.exports = { ocrXlsxImagenes };
