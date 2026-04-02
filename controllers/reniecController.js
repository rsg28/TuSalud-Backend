const https = require('https');

const RENIEC_BASE_URL =
  'https://atheneasoftadepia.com/ajax/admision/java.complet.data.php?javadata=';

function parseReniecResponseText(text) {
  const t = String(text || '').trim();
  if (!t) return null;

  // Si devolviera JSON (no parece en el ejemplo), intentamos parsear primero.
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      return parsed;
    } catch {
      // continúa con fallback var_dump
    }
  }

  // Fallback: var_dump / array(8) { ... }
  // Toleramos escapes tipo: \["id"\]=> string(8) "72880344" (como a veces se ve en la UI)
  // y también el formato sin escapes: ["id"]=> string(8) "72880344".
  const pairs = {};
  const pairRe =
    /\\?\["([^"]+)"\\?\]\s*=>\s*string\(\d+\)\s*"([^"]*)"/g;
  let m = null;
  // eslint-disable-next-line no-cond-assign
  while ((m = pairRe.exec(t)) !== null) {
    const key = m[1];
    const val = m[2];
    pairs[key] = val;
  }

  const id = pairs.id ?? null;
  const nombres = pairs.nombres ?? null;
  const apellido_paterno = pairs.apellido_paterno ?? null;
  const apellido_materno = pairs.apellido_materno ?? null;
  const codigo_verificacion = pairs.codigo_verificacion ?? null;
  const nombre_completo = pairs.nombre_completo ?? null;

  if (!nombres && !apellido_paterno && !apellido_materno && !nombre_completo) return null;

  return { id, nombres, apellido_paterno, apellido_materno, codigo_verificacion, nombre_completo };
}

function httpsGetText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (TuSalud)',
          Accept: 'text/html,*/*',
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Timeout consultando RENIEC'));
    });
  });
}

async function validarDni(req, res) {
  try {
    const dni = String(req.query.dni || '').trim();
    if (!dni) {
      return res.status(400).json({ ok: false, error: 'dni requerido' });
    }

    // Limpieza básica para evitar caracteres raros.
    const dniSoloDigitos = dni.replace(/[^\d]/g, '');
    if (dniSoloDigitos.length !== 8) {
      return res.status(200).json({
        ok: false,
        error: 'DNI inválido: debe tener 8 dígitos',
        reniec: null,
      });
    }
    const url = `${RENIEC_BASE_URL}${encodeURIComponent(dniSoloDigitos)}`;

    const { status, data } = await httpsGetText(url);
    if (status && status >= 400) {
      return res.status(502).json({
        ok: false,
        error: `RENIEC respondió HTTP ${status}`,
        reniec: null,
      });
    }

    const parsed = parseReniecResponseText(data);
    if (!parsed) {
      return res.status(200).json({ ok: false, error: 'Respuesta RENIEC no legible', reniec: null });
    }

    // Si ya es un JSON compatible, normalizamos.
    const reniec =
      parsed && typeof parsed === 'object'
        ? {
            id: parsed.id ?? parsed.ID ?? null,
            nombres: parsed.nombres ?? null,
            apellido_paterno: parsed.apellido_paterno ?? null,
            apellido_materno: parsed.apellido_materno ?? null,
            codigo_verificacion: parsed.codigo_verificacion ?? null,
          }
        : null;

    const ok =
      Boolean(reniec?.nombres) && Boolean(reniec?.apellido_paterno) && Boolean(reniec?.apellido_materno);

    return res.status(200).json({ ok, reniec });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ ok: false, error: msg, reniec: null });
  }
}

module.exports = {
  validarDni,
};

