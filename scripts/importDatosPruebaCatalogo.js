/**
 * Datos y helpers compartidos entre:
 *   generarTsvImportDesdeRds.js
 *   generarExcelImportPrueba.js
 */

const PERFIL_INEXISTENTE = 'ZZZ_PERFIL_TOTALMENTE_INEXISTENTE_EN_BD';
const EXAMEN_INEXISTENTE = 'XXX_ESTUDIO_FICTICIO_PARA_PRUEBA_NEGATIVA';

const PACIENTES_BASE = [
  { puesto: 'Soldador', nombre: 'Prueba Alfa, Exacto Catalogo', dni: '40001001', emo_preoc: true, perfil_key: 'exacto', adicionales: ['exacto'] },
  { puesto: 'Almacén', nombre: 'Prueba Beta, Perfil Espacios', dni: '40001002', emo_preoc: true, perfil_key: 'espacios' },
  { puesto: 'Electricista', nombre: 'Prueba Gamma, Compacto', dni: '40001003', emo_anual: true, perfil_key: 'compacto' },
  { puesto: 'Seguridad', nombre: 'Prueba Delta, Mismo Perfil', dni: '40001004', emo_preoc: true, perfil_key: 'exacto' },
  { puesto: 'Supervisor', nombre: 'Prueba Echo, Adicionales', dni: '40001005', emo_preoc: true, perfil_key: 'exacto', adicionales: ['exacto', 'variante'] },
  { puesto: 'Administración', nombre: 'Prueba Foxtrot Preoc', dni: '40001006', emo_preoc: true, perfil_key: 'exacto', adicionales: ['variante'] },
  { puesto: 'Campo', nombre: 'Prueba Golf Anual', dni: '40001007', emo_anual: true, perfil_key: 'espacios' },
];

function variantEspacios(n) {
  const t = String(n || '').trim();
  return t ? `  ${t.replace(/\s+/g, '   ')}  ` : t;
}
function variantCompacto(n) {
  return String(n || '').replace(/\s/g, '');
}
function variantExamen(n) {
  return `  ${String(n || '').trim().toLowerCase()}  `;
}

function buildCat(perfilNombre, examenNombre) {
  return {
    perfil_exacto: perfilNombre,
    perfil_variante_espacios: variantEspacios(perfilNombre),
    perfil_compacto_sin_espacios: variantCompacto(perfilNombre),
    perfil_inexistente: PERFIL_INEXISTENTE,
    examen_exacto: examenNombre,
    examen_variante: variantExamen(examenNombre),
    examen_inexistente: EXAMEN_INEXISTENTE,
  };
}

function pickPerfil(cat, key) {
  switch (key) {
    case 'exacto':
      return cat.perfil_exacto;
    case 'espacios':
      return cat.perfil_variante_espacios;
    case 'compacto':
      return cat.perfil_compacto_sin_espacios;
    case 'inexistente':
      return cat.perfil_inexistente;
    default:
      return cat.perfil_exacto;
  }
}

function pickExamen(cat, key) {
  switch (key) {
    case 'exacto':
      return cat.examen_exacto;
    case 'variante':
      return cat.examen_variante;
    case 'inexistente':
      return cat.examen_inexistente;
    default:
      return '';
  }
}

/**
 * Carga nombres reales de RDS. Usa el .env de TuSalud-Backend (DB_HOST = endpoint RDS, no la IP pública de EC2).
 */
async function cargarCatalogoDesdeRds(pool) {
  const [perfiles] = await pool.execute("SELECT nombre FROM emo_perfiles WHERE tipo = 'PERFIL' ORDER BY id ASC LIMIT 1");
  const [examenes] = await pool.execute('SELECT nombre FROM examenes WHERE activo = 1 ORDER BY id ASC LIMIT 1');
  if (!perfiles?.length) throw new Error('Sin emo_perfiles tipo PERFIL');
  if (!examenes?.length) throw new Error('Sin examenes activos');
  const perfilNombre = String(perfiles[0].nombre).trim();
  const examenNombre = String(examenes[0].nombre).trim();
  return { perfilNombre, examenNombre, cat: buildCat(perfilNombre, examenNombre) };
}

module.exports = {
  PACIENTES_BASE,
  PERFIL_INEXISTENTE,
  EXAMEN_INEXISTENTE,
  buildCat,
  pickPerfil,
  pickExamen,
  variantEspacios,
  variantCompacto,
  variantExamen,
  cargarCatalogoDesdeRds,
};
