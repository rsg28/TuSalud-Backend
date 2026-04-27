/**
 * Comprueba en la base (RDS/local) los perfiles y exámenes que suelen aparecer
 * al importar `datos_import_prueba.xlsx` (diagnósticos de “Perfil no en catálogo”,
 * “Perfil sin exámenes”, “Exámenes adicionales no encontrados”).
 *
 * Uso (desde TuSalud-Backend, con .env con credenciales):
 *   node scripts/verificarValoresImportDiagnostico.js
 *   node scripts/verificarValoresImportDiagnostico.js --perfiles "A,B" --examenes "E1,E2"
 *
 * Variables de entorno opcionales (lista separada por |):
 *   TUSALUD_VERIF_PERFILES   ZZZ_...|ADMINISTRATIVOS CONSERJE INVENTARIADORES
 *   TUSALUD_VERIF_EXAMENES   triaje|XXX_...
 */

require('dotenv').config();
const path = require('path');
const mysql = require('mysql2/promise');

const DEFAULT_PERFILES = [
  'ZZZ_PERFIL_TOTALMENTE_INEXISTENTE_EN_BD',
  'ADMINISTRATIVOS CONSERJE INVENTARIADORES',
];

const DEFAULT_EXAMENES = [
  'TRIAJE (PESO, TALLA, IMC, PULSO, PPAA)',
  'XXX_ESTUDIO_FICTICIO_PARA_PRUEBA_NEGATIVA',
  'triaje (peso, talla, imc, pulso, ppaa)',
];

function parseListArg(s) {
  if (!s) return null;
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * `[]` es truthy en JS: no usar `arr || default` o un env vacío vacía el listado y pisa DEFAULT_*.
 */
function terminosElegidos(cli, envList, fallbacks) {
  if (cli && cli.length > 0) return cli;
  if (envList && envList.length > 0) return envList;
  return fallbacks;
}

function parseArgs(argv) {
  const out = { perfiles: null, examenes: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--perfiles' && argv[i + 1]) {
      out.perfiles = parseListArg(argv[++i]);
    } else if (argv[i] === '--examenes' && argv[i + 1]) {
      out.examenes = parseListArg(argv[++i]);
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      out.help = true;
    }
  }
  return out;
}

async function findPerfiles(conn, terms) {
  const rows = [];
  for (const t of terms) {
    if (t.length < 2) {
      rows.push({ busqueda: t, filas: [] });
      continue;
    }
    const [r] = await conn.query(
      `SELECT id, nombre, tipo
       FROM emo_perfiles
       WHERE INSTR(LOWER(nombre), LOWER(?)) > 0
       ORDER BY id
       LIMIT 20`,
      [t]
    );
    rows.push({ busqueda: t, filas: r });
  }
  return rows;
}

async function mapeoPorTipoEmo(conn, perfilIds) {
  if (!perfilIds.length) return [];
  const ph = perfilIds.map(() => '?').join(',');
  const [r] = await conn.query(
    `SELECT
       m.perfil_id,
       p.nombre AS perfil_nombre,
       m.tipo_emo,
       COUNT(*) AS num_examenes
     FROM emo_perfil_examenes m
     JOIN emo_perfiles p ON p.id = m.perfil_id
     WHERE m.perfil_id IN (${ph})
     GROUP BY m.perfil_id, p.nombre, m.tipo_emo
     ORDER BY m.perfil_id, m.tipo_emo`,
    perfilIds
  );
  return r;
}

async function listarExamenesDePerfil(conn, perfilId) {
  const [r] = await conn.query(
    `SELECT m.tipo_emo, e.id AS examen_id, e.nombre AS examen_nombre, e.activo
     FROM emo_perfil_examenes m
     JOIN examenes e ON e.id = m.examen_id
     WHERE m.perfil_id = ?
     ORDER BY m.tipo_emo, e.nombre`,
    [perfilId]
  );
  return r;
}

async function findExamenes(conn, terms) {
  const rows = [];
  for (const t of terms) {
    if (t.length < 2) {
      rows.push({ busqueda: t, filas: [] });
      continue;
    }
    const [r] = await conn.query(
      `SELECT e.id, e.nombre, e.codigo, e.activo
       FROM examenes e
       WHERE e.activo = 1
         AND (INSTR(LOWER(e.nombre), LOWER(?)) > 0
           OR INSTR(LOWER(IFNULL(e.codigo, '')), LOWER(?)) > 0)
       ORDER BY e.nombre
       LIMIT 40`,
      [t, t]
    );
    rows.push({ busqueda: t, filas: r });
  }
  return rows;
}

function extraerSubcadenasParaExamenes(termino) {
  const t = (termino || '').trim();
  if (t.length < 2) return [t].filter((x) => x.length >= 2);
  const out = [t];
  const antes = t.split('(')[0].trim();
  if (antes && antes !== t && antes.length >= 2) out.push(antes);
  const toks = antes.split(/\s+/).filter((x) => x.length >= 2);
  if (toks[0] && toks[0] !== t && toks[0] !== antes) out.push(toks[0]);
  return [...new Set(out)];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Uso: node ${path.basename(__filename)} [--perfiles a,b] [--examenes e1,e2]`);
    console.log('Por defecto usa términos de la plantilla de prueba de importación.');
    process.exit(0);
  }

  const envP = (process.env.TUSALUD_VERIF_PERFILES || '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
  const envE = (process.env.TUSALUD_VERIF_EXAMENES || '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
  const perfiles = terminosElegidos(
    args.perfiles && args.perfiles.length > 0 ? args.perfiles : null,
    envP,
    DEFAULT_PERFILES
  );
  const examenes = terminosElegidos(
    args.examenes && args.examenes.length > 0 ? args.examenes : null,
    envE,
    DEFAULT_EXAMENES
  );

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tusalud',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  };

  console.log(`Conectando a ${config.database}@${config.host}:${config.port} (usuario: ${config.user})…\n`);
  console.log(`Buscando ${perfiles.length} perfil(es) y ${examenes.length} término(s) de examen.\n`);

  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (e) {
    console.error('No se pudo conectar:', e.message);
    process.exit(1);
  }

  try {
    console.log('==== PERFILES (emo_perfiles) — búsqueda por subcadena (mismo criterio general que resolución) ====\n');
    for (const t of perfiles) {
      const r = (await findPerfiles(conn, [t]))[0] ?? { busqueda: t, filas: [] };
      if (!r.filas.length) {
        console.log(`  [${t}]  → 0 filas (no existe o no coincide con INSTR/LOWER)\n`);
      } else {
        console.log(`  [${t}]  → ${r.filas.length} fila(s):`);
        r.filas.forEach((f) => console.log(`     id=${f.id}  tipo=${f.tipo}  «${f.nombre}»`));
        console.log('');
      }
    }

    const idsRelevantes = new Set();
    for (const t of perfiles) {
      const r = (await findPerfiles(conn, [t]))[0] ?? { filas: [] };
      (r.filas || []).forEach((f) => idsRelevantes.add(f.id));
    }
    if (idsRelevantes.size) {
      const ids = [...idsRelevantes];
      console.log('==== MAPEO emo_perfil_examenes por tipo_emo (PREOC / ANUAL / RETIRO / VISITA) ====\n');
      const m = await mapeoPorTipoEmo(conn, ids);
      if (m.length === 0) {
        console.log('  (Ninguno de los perfiles encontrados tiene filas en emo_perfil_examenes.)\n');
      } else {
        m.forEach((row) =>
          console.log(
            `  perfil_id=${row.perfil_id} «${row.perfil_nombre}»  ${row.tipo_emo}  exámenes: ${row.num_examenes}`
          )
        );
        console.log('');
        for (const id of ids) {
          const det = await listarExamenesDePerfil(conn, id);
          if (!det.length) {
            const [n] = await conn.query('SELECT nombre FROM emo_perfiles WHERE id = ?', [id]);
            console.log(`  [perfil_id=${id}] ${n[0]?.nombre || ''}  → 0 exámenes mapeados\n`);
            continue;
          }
          const [n] = await conn.query('SELECT nombre FROM emo_perfiles WHERE id = ?', [id]);
          console.log(`  [perfil_id=${id}] ${n[0]?.nombre} — listado:\n`);
          const porTipo = {};
          det.forEach((d) => {
            if (!porTipo[d.tipo_emo]) porTipo[d.tipo_emo] = [];
            porTipo[d.tipo_emo].push(d.examen_nombre);
          });
          Object.keys(porTipo)
            .sort()
            .forEach((k) => {
              console.log(`     ${k}: ${porTipo[k].slice(0, 8).join(', ')}${porTipo[k].length > 8 ? '…' : ''}`);
            });
          console.log('');
        }
      }
    }

    console.log('==== EXÁMENES (catálogo activo) — subcadena (como búsqueda al importar) ====\n');
    for (const t of examenes) {
      const sub = extraerSubcadenasParaExamenes(t);
      const seen = new Set();
      console.log(`  Texto archivo: «${t}»`);
      if (sub.length > 1) {
        console.log(`  Subcadenas probadas: ${sub.map((x) => `«${x}»`).join(', ')}`);
      }
      for (const s of sub) {
        const r = (await findExamenes(conn, [s]))[0]?.filas || [];
        for (const f of r) {
          if (seen.has(f.id)) continue;
          seen.add(f.id);
          console.log(`     id=${f.id}  activo=${f.activo}  «${f.nombre}»  codigo=${f.codigo != null ? f.codigo : '—'}`);
        }
      }
      if (seen.size === 0) {
        console.log('  → 0 exámenes activos cuyo nombre/código contenga el término (INSTR, como en /api/precios/buscar).');
      }
      console.log('');
    }
  } finally {
    await conn.end();
  }

  console.log('Listo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
