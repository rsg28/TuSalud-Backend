/**
 * Heurísticas tipo NLP sobre texto crudo (OCR o PDF) para cotizaciones / fichas / carnets.
 * No sustituye revisión humana; prioriza candidatos plausibles para importación.
 */

/**
 * @typedef {Object} CamposInferidos
 * @property {string|null} dni
 * @property {string|null} nombre_completo
 * @property {string|null} fecha_nacimiento
 * @property {number[]} montos_cotizacion Montos detectados (p. ej. S/ 120.50)
 * @property {string|null} texto_cotizacion_fragmento Líneas que parecen totales / montos
 */

/**
 * @param {string} text
 * @returns {CamposInferidos}
 */
function inferCamposDesdeTexto(text) {
  const raw = (text || '').replace(/\r/g, '\n');
  const t = raw;

  /** @type {CamposInferidos} */
  const result = {
    dni: null,
    nombre_completo: null,
    fecha_nacimiento: null,
    montos_cotizacion: [],
    texto_cotizacion_fragmento: null,
  };

  // --- DNI Perú (8 dígitos) o documento 7-9 dígitos ---
  const dniCandidates = t.match(/\b(\d{7,9})\b/g);
  if (dniCandidates && dniCandidates.length > 0) {
    const eight = dniCandidates.find((x) => x.length === 8);
    result.dni = eight || dniCandidates[0];
  }

  // --- Fecha nacimiento / documento ---
  const fechaPatterns = [
    /\b(\d{1,2}[/.-]\d{1,2}[/.-](?:19|20)\d{2})\b/,
    /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2})\b/,
  ];
  for (const re of fechaPatterns) {
    const m = t.match(re);
    if (m) {
      result.fecha_nacimiento = m[1];
      break;
    }
  }

  // --- Nombre: etiquetas típicas en carnets / fichas ---
  const nombrePatterns = [
    /(?:APELLIDOS?\s+Y\s+NOMBRES|APELLIDOS?\s+NOMBRES)\s*[:\s.-]*\s*([^\n]+)/i,
    /(?:NOMBRE(?:S)?\s+COMPLETO|NOMBRES?)\s*[:\s.-]*\s*([^\n]+)/i,
    /(?:PACIENTE|EMPLEADO|TRABAJADOR)\s*[:\s.-]*\s*([^\n]+)/i,
  ];
  for (const re of nombrePatterns) {
    const m = t.match(re);
    if (m && m[1]) {
      const line = m[1].trim().replace(/\s+/g, ' ');
      if (line.length >= 4 && line.length < 120 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(line)) {
        result.nombre_completo = line;
        break;
      }
    }
  }

  if (!result.nombre_completo) {
    const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
    const nameLine = lines.find((l) => {
      if (l.length < 6 || l.length > 80) return false;
      const words = l.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 6) return false;
      return words.every((w) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/u.test(w) || /^[A-ZÁÉÍÓÚÑ]{2,}$/u.test(w));
    });
    if (nameLine) result.nombre_completo = nameLine;
  }

  // --- Cotización: S/ PEN, soles, Total ---
  const montos = new Set();
  const reSol = /(?:S\/?\s*\.?\s*|SOLES?\s*|PEN\s*)[\s:]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+[.,]\d{2})/gi;
  let mm;
  while ((mm = reSol.exec(t)) !== null) {
    const n = parseMonto(mm[1]);
    if (n != null && n > 0 && n < 1e9) montos.add(Math.round(n * 100) / 100);
  }
  const reTotal = /(?:TOTAL|SUB\s*TOTAL|IMPORTE|MONTO)\s*[:\s]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+[.,]\d{2})/gi;
  while ((mm = reTotal.exec(t)) !== null) {
    const n = parseMonto(mm[1]);
    if (n != null && n > 0 && n < 1e9) montos.add(Math.round(n * 100) / 100);
  }
  result.montos_cotizacion = [...montos].sort((a, b) => b - a).slice(0, 15);

  const cotLines = t
    .split('\n')
    .filter((l) => /\b(TOTAL|S\/|SOLES|PEN|COTIZ|MONTO|IMPORTE)\b/i.test(l))
    .slice(0, 8);
  if (cotLines.length > 0) {
    result.texto_cotizacion_fragmento = cotLines.join('\n').slice(0, 800);
  }

  return result;
}

/**
 * @param {string} s
 * @returns {number|null}
 */
function parseMonto(s) {
  if (!s) return null;
  let x = String(s).trim();
  if (x.includes(',') && x.includes('.')) {
    if (x.lastIndexOf(',') > x.lastIndexOf('.')) x = x.replace(/\./g, '').replace(',', '.');
    else x = x.replace(/,/g, '');
  } else if (x.includes(',')) {
    const parts = x.split(',');
    if (parts.length === 2 && parts[1].length <= 2) x = parts[0].replace(/\./g, '') + '.' + parts[1];
    else x = x.replace(/,/g, '');
  } else {
    x = x.replace(/\./g, (m, i, str) => {
      const rest = str.slice(i + 1);
      return rest.length === 3 && /^\d{3}$/.test(rest) ? '' : m;
    });
  }
  const n = parseFloat(x.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Tabla mínima para parseEmpleadosFile (encabezados reconocibles + una fila).
 * @param {CamposInferidos} campos
 * @returns {string|null}
 */
function buildTextoTablaDesdeCampos(campos) {
  if (!campos) return null;
  const nombre = (campos.nombre_completo || '').trim();
  const dni = (campos.dni || '').trim();
  const fn = (campos.fecha_nacimiento || '').trim();

  const hasPersona = (dni && nombre) || (nombre && fn) || (dni && fn);
  if (!hasPersona) return null;

  const header = ['DNI', 'Nombre completo', 'Cargo', 'Área'].join('\t');
  const cargoFn = fn ? `Nac. ${fn}` : '';
  const row = [dni, nombre, cargoFn, ''].join('\t');
  return `${header}\n${row}`;
}

function contarLineasConDni8(text) {
  const lines = (text || '').split(/\n/).map((l) => l.trim()).filter(Boolean);
  return lines.filter((l) => /\b\d{8}\b/.test(l)).length;
}

function pareceTablaMultiplesFilas(text) {
  const lines = (text || '')
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 4) return false;
  let tabs = 0;
  let comas = 0;
  for (const l of lines) {
    if (l.includes('\t')) tabs++;
    if (l.split(',').length >= 4) comas++;
  }
  if (tabs >= 2 || comas >= 2) return true;

  // PDF (pdf-parse): columnas a menudo separadas por un solo espacio → pocas tabulaciones.
  const lineasDni = lines.filter((l) => /\b\d{8}\b/.test(l));
  if (lineasDni.length >= 3) return true;

  const blob = (text || '').toLowerCase();
  const tieneEncabezadosPlantillaEmo =
    /(dni|documento|n°)/.test(blob) &&
    /(nombre|apellidos|nombres completos)/.test(blob) &&
    (/(puesto|cargo|perfil)/.test(blob) || /preoc|anual|retiro|visita/.test(blob));
  if (tieneEncabezadosPlantillaEmo && lines.length >= 5) return true;

  return false;
}

/**
 * Si hay montos de cotización y una fila persona, añade columnas Precio / Examen genéricos para el parser.
 * No sustituye tablas con varias filas por una fila sintética.
 * @param {CamposInferidos} campos
 * @param {string} fallbackText
 * @returns {string}
 */
function elegirTextoParaImportacion(campos, fallbackText) {
  const fb = (fallbackText || '').trim();
  if (pareceTablaMultiplesFilas(fb)) {
    return fb;
  }

  // No sustituir una tabla real (p. ej. PDF idéntico al Excel) por una fila sintética de OCR.
  if (fb.length >= 200 && contarLineasConDni8(fb) >= 2) {
    return fb;
  }

  const tabla = buildTextoTablaDesdeCampos(campos);
  if (tabla) {
    if (campos.montos_cotizacion && campos.montos_cotizacion.length > 0) {
      const p = campos.montos_cotizacion[0];
      const extra = ['Examen', 'Precio'].join('\t');
      const row2 = ['Servicios cotizados (OCR)', String(p)].join('\t');
      return `${tabla}\n${extra}\n${row2}`;
    }
    return tabla;
  }
  return fb;
}

module.exports = {
  inferCamposDesdeTexto,
  buildTextoTablaDesdeCampos,
  elegirTextoParaImportacion,
};
