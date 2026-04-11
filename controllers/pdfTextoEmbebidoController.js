const pdfParse = require('pdf-parse');

/** @returns {number} entero >= min, NaN → fallback */
function envInt(name, fallback, min = 0) {
  const v = parseInt(process.env[name] || '', 10);
  if (Number.isNaN(v)) return fallback;
  return Math.max(min, v);
}

/** Solo una petición OCR a la vez por defecto (evita saturar CPU en instancias pequeñas). */
const OCR_MAX_CONCURRENT = Math.max(1, envInt('OCR_MAX_CONCURRENT', 1, 1));
/** Tiempo máximo por trabajo OCR (reconocimiento + preprocesado). */
const OCR_TIMEOUT_MS = Math.max(15000, envInt('OCR_TIMEOUT_MS', 120000, 15000));
/** Tamaño máximo del buffer de imagen enviado a OCR (aparte del límite multer). */
const OCR_IMAGE_MAX_BYTES = Math.max(
  512 * 1024,
  envInt('OCR_IMAGE_MAX_BYTES', 12 * 1024 * 1024, 512 * 1024)
);
/** Ancho máximo tras preprocesar (menos píxeles = menos CPU). */
const OCR_PREPROCESS_MAX_WIDTH = Math.max(800, envInt('OCR_PREPROCESS_MAX_WIDTH', 1800, 800));
/** Factor máximo de escala Jimp (antes 3). */
const OCR_PREPROCESS_MAX_SCALE = Math.max(1, Math.min(3, envInt('OCR_PREPROCESS_MAX_SCALE', 2, 1)));
/**
 * Peticiones en cola esperando slot (además de las OCR_MAX_CONCURRENT activas).
 * 0 = si está ocupado, 503 de inmediato (recomendado en instancias chicas).
 */
const OCR_MAX_QUEUE = Math.max(0, envInt('OCR_MAX_QUEUE', 0, 0));

let ocrActiveJobs = 0;
const ocrWaitingGrants = [];

function acquireOcrSlot() {
  return new Promise((resolve, reject) => {
    const grant = () => {
      ocrActiveJobs += 1;
      resolve(() => {
        ocrActiveJobs -= 1;
        const next = ocrWaitingGrants.shift();
        if (next) next();
      });
    };
    if (ocrActiveJobs < OCR_MAX_CONCURRENT) {
      grant();
    } else if (ocrWaitingGrants.length < OCR_MAX_QUEUE) {
      ocrWaitingGrants.push(grant);
    } else {
      reject(
        Object.assign(
          new Error(
            'El servidor está ocupado procesando otra imagen (OCR). Intente de nuevo en unos segundos o reduzca la resolución.'
          ),
          { code: 'OCR_BUSY', statusCode: 503 }
        )
      );
    }
  });
}

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withOcrConcurrencyLimit(fn) {
  /** @type {() => void} */
  let release = () => {};
  try {
    release = await acquireOcrSlot();
    return await fn();
  } finally {
    release();
  }
}

function isPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-';
}

/**
 * @param {Buffer} buf
 * @returns {'jpeg'|'png'|'webp'|'gif'|null}
 */
function sniffRasterImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.length >= 12 &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  const g = buf.slice(0, 6).toString('ascii');
  if (g === 'GIF87a' || g === 'GIF89a') return 'gif';
  return null;
}

let tesseractJs = null;
/** @type {Error|null} */
let tesseractLoadError = null;

/**
 * Carga tesseract.js una vez. Si falta en el servidor (npm install no ejecutado), error explícito.
 */
function getTesseractJs() {
  if (tesseractLoadError) throw tesseractLoadError;
  if (tesseractJs) return tesseractJs;
  try {
    tesseractJs = require('tesseract.js');
    return tesseractJs;
  } catch (e) {
    const msg = String(e?.message || e);
    const missing =
      e?.code === 'MODULE_NOT_FOUND' && (msg.includes('tesseract.js') || msg.includes("Cannot find module 'tesseract"));
    if (missing) {
      tesseractLoadError = Object.assign(
        new Error(
          'En el servidor falta el paquete tesseract.js. En la carpeta del backend (p. ej. TuSalud-Backend): git pull, luego npm ci o npm install, y reinicie Node. El PDF con texto embebido sigue funcionando sin esto.'
        ),
        { code: 'OCR_NOT_INSTALLED', statusCode: 503 }
      );
    } else {
      tesseractLoadError = e;
    }
    throw tesseractLoadError;
  }
}

/** @type {typeof import('jimp') | null | undefined} undefined = aún no probado; null = no instalado */
let jimpConstructorCache = undefined;

/**
 * jimp es dependencia en package.json; si falta en node_modules (deploy sin npm ci), se omite preprocesado.
 * Un solo aviso por proceso para no llenar PM2.
 */
function getJimpConstructor() {
  if (jimpConstructorCache !== undefined) {
    return jimpConstructorCache;
  }
  try {
    jimpConstructorCache = require('jimp');
    return jimpConstructorCache;
  } catch (e) {
    const msg = String(e?.message || e);
    const missing =
      e?.code === 'MODULE_NOT_FOUND' && (/['"]jimp['"]/i.test(msg) || msg.includes("Cannot find module 'jimp"));
    if (missing) {
      console.warn(
        '[ocr] Falta el paquete npm "jimp" (OCR sigue sin preprocesar imagen). En el servidor: cd TuSalud-Backend && git pull && npm ci && pm2 restart TuSalud-Backend'
      );
      jimpConstructorCache = null;
      return null;
    }
    throw e;
  }
}

/**
 * Escala de grises + contraste + ampliación para tablas escaneadas (mejora Tesseract en formularios).
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
async function preprocessImagenParaOcr(buffer) {
  const Jimp = getJimpConstructor();
  if (!Jimp) {
    return buffer;
  }
  try {
    const image = await Jimp.read(buffer);
    const target = OCR_PREPROCESS_MAX_WIDTH;
    let w = image.bitmap.width;
    if (w > target) {
      image.resize(target, Jimp.AUTO);
      w = image.bitmap.width;
    }
    image.greyscale().contrast(0.2);
    if (w > 0 && w < target) {
      const factor = Math.min(OCR_PREPROCESS_MAX_SCALE, Math.ceil(target / w));
      if (factor > 1) image.scale(factor);
    }
    return image.getBufferAsync(Jimp.MIME_PNG);
  } catch (e) {
    console.warn('[ocr] preprocesado jimp omitido:', e?.message || e);
    return buffer;
  }
}

/**
 * OCR para JPG/PNG/WebP/GIF. Idiomas spa+eng.
 * PSM 4 = columna única / texto variable (tablas en imagen tras preprocesado).
 * Incluye tope de tiempo y terminate del worker si se vence (reduce CPU colgada).
 * @param {Buffer} buffer
 */
async function extraerTextoOcrImagen(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > OCR_IMAGE_MAX_BYTES) {
    const mb = Math.round(OCR_IMAGE_MAX_BYTES / (1024 * 1024));
    throw Object.assign(
      new Error(`Imagen demasiado grande para OCR (máximo ${mb} MB). Reduzca resolución o comprima el archivo.`),
      { code: 'OCR_IMAGE_TOO_LARGE', statusCode: 400 }
    );
  }

  /** @type {import('tesseract.js').Worker | null} */
  let worker = null;
  const pipeline = (async () => {
    const proc = await preprocessImagenParaOcr(buffer);
    const { createWorker } = getTesseractJs();
    worker = await createWorker('spa+eng');
    const {
      data: { text },
    } = await worker.recognize(proc, {
      tessedit_pageseg_mode: 4,
    });
    return String(text || '').trim();
  })();

  pipeline.catch(() => {});

  let timeoutId;
  try {
    return await Promise.race([
      pipeline,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          if (worker) {
            worker.terminate().catch(() => {});
          }
          reject(
            Object.assign(
              new Error(
                `OCR: tiempo máximo (${Math.round(OCR_TIMEOUT_MS / 1000)} s) superado. Suba una imagen más pequeña o con menos megapíxeles.`
              ),
              { code: 'OCR_TIMEOUT', statusCode: 504 }
            )
          );
        }, OCR_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {
        /* ignore */
      }
    }
  }
}

/**
 * POST multipart campo "file" **o** JSON `{ file_base64 }`.
 * PDF: solo texto embebido (sin OCR). Imagen (JPEG, PNG, WebP, GIF): OCR.
 */
async function extraerPdfTextoEmbebido(req, res) {
  try {
    let buffer = null;

    if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
    } else if (req.body && typeof req.body.file_base64 === 'string') {
      const raw = String(req.body.file_base64).replace(/\s/g, '');
      if (!raw) {
        return res.status(400).json({ error: 'file_base64 está vacío.' });
      }
      buffer = Buffer.from(raw, 'base64');
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        error:
          'Adjunte un archivo: multipart con campo "file", o JSON con "file_base64" (base64 del archivo).',
      });
    }

    if (isPdfBuffer(buffer)) {
      const data = await pdfParse(buffer);
      const text = String(data.text || '').trim();
      return res.json({
        text,
        numpages: data.numpages || 0,
        mode: 'pdf-text',
      });
    }

    if (sniffRasterImage(buffer)) {
      const text = await withOcrConcurrencyLimit(() => extraerTextoOcrImagen(buffer));
      return res.json({
        text,
        numpages: 1,
        mode: 'image-ocr',
      });
    }

    return res.status(400).json({
      error:
        'Formato no soportado. Use PDF con texto, o imagen JPEG, PNG, WebP o GIF (se aplicará OCR).',
    });
  } catch (err) {
    console.error('[import documento texto]', err);
    if (err && (err.code === 'OCR_NOT_INSTALLED' || err.code === 'OCR_BUSY' || err.statusCode === 503)) {
      return res.status(503).json({ error: err.message || 'OCR no disponible en el servidor.' });
    }
    if (err && err.code === 'OCR_TIMEOUT' && err.statusCode === 504) {
      return res.status(504).json({
        error: err.message || 'OCR tardó demasiado. Use una imagen más pequeña o con menos detalle.',
      });
    }
    if (err && (err.code === 'OCR_IMAGE_TOO_LARGE' || err.statusCode === 400) && err.message?.includes('OCR')) {
      return res.status(400).json({ error: err.message });
    }
    const message = err.message || 'Error al leer el archivo';
    return res.status(500).json({ error: message });
  }
}

module.exports = { extraerPdfTextoEmbebido };
