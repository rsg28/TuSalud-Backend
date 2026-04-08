const OCR_PY_SERVICE_URL = String(process.env.OCR_PY_SERVICE_URL || '').trim();
const OCR_PY_API_KEY = String(process.env.OCR_PY_API_KEY || '').trim();
const OCR_PY_TIMEOUT_MS = parseInt(process.env.OCR_PY_TIMEOUT_MS || '180000', 10);

function pythonOcrEnabled() {
  return Boolean(OCR_PY_SERVICE_URL);
}

function getJson(url, payload, timeoutMs = OCR_PY_TIMEOUT_MS) {
  if (typeof fetch !== 'function') {
    throw new Error('fetch no está disponible en este runtime de Node.js.');
  }
  const headers = { 'Content-Type': 'application/json' };
  if (OCR_PY_API_KEY) headers['x-api-key'] = OCR_PY_API_KEY;

  return Promise.race([
    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }).then(async (res) => {
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || `HTTP ${res.status}` };
      }
      if (!res.ok) {
        throw new Error(data?.error || `OCR Python respondió HTTP ${res.status}`);
      }
      return data;
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout al invocar OCR Python')), timeoutMs);
    }),
  ]);
}

async function extractPdfTextWithPython(buffer, opts = {}) {
  if (!pythonOcrEnabled()) return null;
  const payload = {
    file_base64: buffer.toString('base64'),
    max_pages: opts.maxPages,
    filename: opts.originalname || 'upload.pdf',
  };
  const url = `${OCR_PY_SERVICE_URL.replace(/\/$/, '')}/ocr/pdf`;
  return getJson(url, payload);
}

async function extractImageTextWithPython(buffer, opts = {}) {
  if (!pythonOcrEnabled()) return null;
  const payload = {
    file_base64: buffer.toString('base64'),
    mime_type: opts.mimeType || 'image/png',
    filename: opts.originalname || 'upload.png',
  };
  const url = `${OCR_PY_SERVICE_URL.replace(/\/$/, '')}/ocr/image`;
  return getJson(url, payload);
}

module.exports = {
  pythonOcrEnabled,
  extractPdfTextWithPython,
  extractImageTextWithPython,
};
