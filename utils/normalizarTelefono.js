'use strict';

/**
 * Normaliza teléfonos a E.164 para Twilio / BD.
 *
 * Reglas:
 *   - Si ya viene con "+", se conserva el prefijo internacional (solo dígitos).
 *   - Perú (por defecto): 9 dígitos empezando en 9 → +51…
 *   - Perú con código país: 51 + 9 dígitos → +51…
 *   - Canadá (BC): 10 dígitos empezando en 778 → +1…
 *   - Otros 10 dígitos NANP (área 2–9) → +1…
 */

function soloDigitos(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function normalizarTelefono(raw) {
  const s = String(raw || '').replace(/^whatsapp:/i, '').trim();
  if (!s) return '';

  if (s.startsWith('+')) {
    const d = soloDigitos(s);
    return d ? `+${d}` : '';
  }

  const d = soloDigitos(s);
  if (!d) return '';

  // Perú: móvil 9XXXXXXXX
  if (/^9\d{8}$/.test(d)) return `+51${d}`;
  if (/^51\d{9}$/.test(d)) return `+${d}`;

  // Canadá / NANP: 778… (BC) u otras áreas de 10 dígitos
  if (/^778\d{7}$/.test(d)) return `+1${d}`;
  if (d.length === 10 && /^[2-9]\d{9}$/.test(d)) return `+1${d}`;
  if (/^1\d{10}$/.test(d)) return `+${d}`;

  // Fallback: asumir Perú si son 9 dígitos
  if (d.length === 9) return `+51${d}`;

  return `+${d}`;
}

module.exports = { normalizarTelefono, soloDigitos };
