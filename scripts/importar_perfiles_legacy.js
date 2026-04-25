#!/usr/bin/env node
/**
 * TuSalud — Importador de perfiles legacy (cotizacion.csv)
 * -----------------------------------------------------------------------------
 * Lee el CSV exportado del sistema antiguo y puebla el schema nuevo:
 *   - empresas       (por RUC; crea si no existe)
 *   - sedes          (una por cada clugar distinto si aún no existe)
 *   - emo_categorias (por idCola del JSON)
 *   - examenes       (por codigo del JSON, como `identificador`)
 *   - emo_perfiles   (tipo PERFIL o ADICIONAL según la columna `tipo`)
 *   - emo_perfil_asignacion  (perfil ↔ empresa ↔ sede legacy)
 *   - emo_perfil_examenes    (incluye reglas de sexo, edad, condicional)
 *   - emo_perfil_precio      (solo cuando el precio legacy > 0)
 *
 * Prerrequisitos:
 *   - Ejecutar primero scripts/rediseno_schema_v2.sql (deja el catálogo EMO
 *     en estado limpio).
 *   - Variables DB_* configuradas en .env (mismo archivo que usa el backend).
 *
 * Uso:
 *   node scripts/importar_perfiles_legacy.js \
 *        --csv "C:\\Users\\LENOVO\\Downloads\\cotizacion.csv" \
 *        [--dry-run]
 *
 * Por defecto busca el CSV en el Downloads del usuario actual.
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

// -----------------------------------------------------------------------------
// Args
// -----------------------------------------------------------------------------
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      argMap[key] = next;
      i++;
    } else {
      argMap[key] = true;
    }
  }
}

const CSV_PATH = argMap.csv
  || path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Downloads', 'cotizacion.csv');
const DRY_RUN = argMap['dry-run'] === true || argMap['dry-run'] === 'true';

// -----------------------------------------------------------------------------
// CSV parser (; separator, " quotes, "" escape)
// -----------------------------------------------------------------------------
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i += 2; }
      else if (c === '"') { inQuotes = false; i++; }
      else { cur += c; i++; }
    } else {
      if (c === '"') { inQuotes = true; i++; }
      else if (c === ';') { out.push(cur); cur = ''; i++; }
      else { cur += c; i++; }
    }
  }
  out.push(cur);
  return out;
}

// -----------------------------------------------------------------------------
// Mapping helpers
// -----------------------------------------------------------------------------
// Los flags del JSON legacy (`ingreso`/`anual`/`retiro`) aceptan "0","1","2",...
// Cualquier valor > 0 significa "aplica este examen para ese tipo_emo".
function flagApplies(v) {
  if (v == null) return false;
  const n = Number(v);
  if (Number.isNaN(n)) return false;
  return n > 0;
}

function mapSexoLegacy(v) {
  if (!v) return 'AMBOS';
  const s = String(v).trim().toUpperCase();
  if (s === 'F' || s === 'MUJER' || s === 'FEMENINO') return 'MUJER';
  if (s === 'M' || s === 'HOMBRE' || s === 'MASCULINO') return 'HOMBRE';
  return 'AMBOS';
}

function parseEdad(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function parseCondicional(v) {
  if (v == null) return 0;
  if (v === 'null' || v === '') return 0;
  const n = Number(v);
  return n > 0 ? 1 : 0;
}

function normalizePrice(v) {
  if (v == null) return 0;
  const s = String(v).trim();
  if (s === '' || s === 'NULL') return 0;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

function normalizeTipo(v) {
  const s = String(v || '').trim().toUpperCase();
  return s === 'ADICIONAL' ? 'ADICIONAL' : 'PERFIL';
}

// Reglas por tipo_emo extraídas del ítem JSON.
// Devuelve un objeto { PREOC: rule|null, ANUAL: rule|null, RETIRO: rule|null }
// donde rule = { sexo_aplicable, edad_minima, edad_maxima, es_condicional } o null si no aplica.
function extractReglas(ex) {
  const result = { PREOC: null, ANUAL: null, RETIRO: null };

  if (flagApplies(ex.ingreso)) {
    result.PREOC = {
      sexo_aplicable: mapSexoLegacy(ex.SexoIngreso),
      edad_minima: parseEdad(ex.edadIngreso),
      edad_maxima: null,
      es_condicional: parseCondicional(ex.CondicionalIngreso),
    };
  }
  if (flagApplies(ex.anual)) {
    result.ANUAL = {
      sexo_aplicable: mapSexoLegacy(ex.SexoAnual),
      edad_minima: parseEdad(ex.edadAnual),
      edad_maxima: null,
      es_condicional: parseCondicional(ex.CondicionalAnual),
    };
  }
  if (flagApplies(ex.retiro)) {
    result.RETIRO = {
      sexo_aplicable: mapSexoLegacy(ex.SexoRetiro),
      edad_minima: parseEdad(ex.edadRetiro),
      edad_maxima: null,
      es_condicional: parseCondicional(ex.CondicionalRetiro),
    };
  }
  return result;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(70));
  console.log('TuSalud — Importador de perfiles legacy');
  console.log('='.repeat(70));
  console.log('CSV:', CSV_PATH);
  console.log('Modo:', DRY_RUN ? 'DRY-RUN (no escribe en DB)' : 'REAL (escribe en DB)');
  console.log();

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`✗ No se encontró el archivo: ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'latin1');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    console.error('✗ CSV vacío o sin filas de datos');
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);

  console.log(`Header: ${header.join(' | ')}`);
  console.log(`Filas de datos: ${rows.length}`);
  console.log();

  const idx = {
    id: header.indexOf('id'),
    nombre: header.indexOf('nombre'),
    ruc: header.indexOf('ruc'),
    tipo: header.indexOf('tipo'),
    perfil: header.indexOf('perfil'),
    precio_pre: header.indexOf('precio_pre'),
    precio_anual: header.indexOf('precio_anual'),
    precio_retiro: header.indexOf('precio_retiro'),
    clugar: header.indexOf('clugar'),
    tfecha: header.indexOf('tfecha'),
  };

  // Sanity check
  for (const [k, v] of Object.entries(idx)) {
    if (v < 0) {
      console.error(`✗ Columna no encontrada en CSV: ${k}`);
      process.exit(1);
    }
  }

  const conn = await pool.getConnection();

  try {
    if (!DRY_RUN) {
      await conn.beginTransaction();
    }

    // Caches (key → db id) para evitar duplicados durante la importación.
    const empresaCache = new Map();   // ruc → empresa_id
    const sedeCache = new Map();      // clugar_legacy → sede_id
    const categoriaCache = new Map(); // idCola → categoria_id
    const examenCache = new Map();    // codigo legacy → examen_id

    const stats = {
      rows: rows.length,
      skipped: 0,
      empresas_creadas: 0,
      empresas_existentes: 0,
      sedes_creadas: 0,
      categorias_creadas: 0,
      examenes_creados: 0,
      perfiles_creados: 0,
      asignaciones_creadas: 0,
      perfil_examenes_insertados: 0,
      precios_insertados: 0,
      nombres_ambiguos: [],
      duplicados: 0,
    };

    // Seed de empresas existentes (para matching por RUC)
    const [existingEmpresas] = await conn.query('SELECT id, ruc FROM empresas WHERE ruc IS NOT NULL');
    for (const e of existingEmpresas) empresaCache.set(e.ruc, e.id);

    // Seed de sedes existentes por codigo_legacy
    const [existingSedes] = await conn.query('SELECT id, codigo_legacy FROM sedes WHERE codigo_legacy IS NOT NULL');
    for (const s of existingSedes) sedeCache.set(String(s.codigo_legacy), s.id);

    // ---------------------------------------------------------------------
    // Deduplicar filas (nombre, ruc) quedándonos con la más reciente (tfecha mayor).
    // ---------------------------------------------------------------------
    const perfilesPorClave = new Map();
    for (const r of rows) {
      const nombre = (r[idx.nombre] || '').trim();
      const ruc = (r[idx.ruc] || '').trim();
      if (!nombre || !ruc) {
        stats.skipped++;
        continue;
      }
      const tipo = normalizeTipo(r[idx.tipo]);
      const key = `${tipo}||${nombre}||${ruc}`;
      const prev = perfilesPorClave.get(key);
      if (!prev) {
        perfilesPorClave.set(key, r);
      } else {
        stats.duplicados++;
        const prevFecha = prev[idx.tfecha] || '';
        const curFecha = r[idx.tfecha] || '';
        if (curFecha > prevFecha) perfilesPorClave.set(key, r);
      }
    }
    const rowsDedup = [...perfilesPorClave.values()];

    // ---------------------------------------------------------------------
    // Loop principal
    // ---------------------------------------------------------------------
    for (const r of rowsDedup) {
      const nombrePerfil = (r[idx.nombre] || '').trim();
      const rucRaw = (r[idx.ruc] || '').trim();
      const tipoPerfil = normalizeTipo(r[idx.tipo]);
      const clugar = (r[idx.clugar] || '').trim();
      const perfilJson = r[idx.perfil] || '';

      let parsed;
      try {
        parsed = JSON.parse(perfilJson);
      } catch (e) {
        console.warn(`⚠ Saltando fila con JSON inválido (nombre=${nombrePerfil}, ruc=${rucRaw})`);
        stats.skipped++;
        continue;
      }
      if (!Array.isArray(parsed)) {
        console.warn(`⚠ Saltando fila con perfil no-array (nombre=${nombrePerfil})`);
        stats.skipped++;
        continue;
      }

      // -------- Empresa --------
      let empresaId = empresaCache.get(rucRaw);
      if (!empresaId) {
        if (DRY_RUN) {
          empresaId = -Math.abs(rucRaw.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
        } else {
          const [res] = await conn.query(
            'INSERT INTO empresas (ruc, razon_social, estado) VALUES (?, ?, "ACTIVO")',
            [rucRaw, `Empresa ${rucRaw}`]
          );
          empresaId = res.insertId;
        }
        empresaCache.set(rucRaw, empresaId);
        stats.empresas_creadas++;
      } else {
        stats.empresas_existentes++;
      }

      // -------- Sede (opcional, por clugar legacy) --------
      let sedeId = null;
      if (clugar) {
        sedeId = sedeCache.get(clugar) || null;
        if (!sedeId) {
          if (DRY_RUN) {
            sedeId = -1000 - parseInt(clugar, 10);
          } else {
            const [res] = await conn.query(
              'INSERT INTO sedes (nombre, codigo_legacy, activa) VALUES (?, ?, 1)',
              [`Sede legacy ${clugar}`, parseInt(clugar, 10)]
            );
            sedeId = res.insertId;
          }
          sedeCache.set(clugar, sedeId);
          stats.sedes_creadas++;
        }
      }

      // -------- Categorías + exámenes --------
      const perfilExamenesBuffer = [];
      for (const cat of parsed) {
        const catNombre = (cat.id || '').trim();
        const idCola = (cat.idCola || '').trim();
        if (!catNombre || !idCola) continue;

        let categoriaId = categoriaCache.get(idCola);
        if (!categoriaId) {
          if (DRY_RUN) {
            categoriaId = -2000 - idCola.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
          } else {
            const [res] = await conn.query(
              'INSERT INTO emo_categorias (nombre, id_cola) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
              [catNombre, idCola]
            );
            categoriaId = res.insertId;
          }
          categoriaCache.set(idCola, categoriaId);
          stats.categorias_creadas++;
        }

        if (!Array.isArray(cat.datos)) continue;
        for (const d of cat.datos) {
          if (!Array.isArray(d.id)) continue;
          for (const ex of d.id) {
            const codigo = ex.codigo;
            if (codigo == null) continue;
            const nombreEx = (ex.nombre || '').trim();
            if (!nombreEx) continue;

            let examenId = examenCache.get(codigo);
            if (!examenId) {
              if (DRY_RUN) {
                examenId = -3000 - Number(codigo);
              } else {
                // Usamos identificador UNIQUE → ON DUPLICATE KEY UPDATE no crea duplicado.
                const [res] = await conn.query(
                  `INSERT INTO examenes (identificador, nombre, categoria_id, activo)
                   VALUES (?, ?, ?, 1)
                   ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
                  [codigo, nombreEx, categoriaId]
                );
                examenId = res.insertId;
              }
              examenCache.set(codigo, examenId);
              stats.examenes_creados++;
            }

            const reglas = extractReglas(ex);
            for (const [tipoEmo, regla] of Object.entries(reglas)) {
              if (!regla) continue;
              perfilExamenesBuffer.push({
                tipo_emo: tipoEmo,
                examen_id: examenId,
                ...regla,
              });
            }
          }
        }
      }

      // -------- Perfil + asignación --------
      let perfilId;
      if (DRY_RUN) {
        perfilId = -4000 - stats.perfiles_creados;
      } else {
        const [res] = await conn.query(
          'INSERT INTO emo_perfiles (nombre, tipo) VALUES (?, ?)',
          [nombrePerfil, tipoPerfil]
        );
        perfilId = res.insertId;
      }
      stats.perfiles_creados++;

      if (!DRY_RUN) {
        await conn.query(
          `INSERT INTO emo_perfil_asignacion (perfil_id, empresa_id, sede_id, clugar_legacy)
           VALUES (?, ?, ?, ?)`,
          [perfilId, empresaId, sedeId, clugar ? parseInt(clugar, 10) : null]
        );
      }
      stats.asignaciones_creadas++;

      // -------- emo_perfil_examenes --------
      if (!DRY_RUN && perfilExamenesBuffer.length > 0) {
        const values = perfilExamenesBuffer.map((x) => [
          perfilId, x.tipo_emo, x.examen_id,
          x.sexo_aplicable, x.edad_minima, x.edad_maxima, x.es_condicional,
        ]);
        await conn.query(
          `INSERT IGNORE INTO emo_perfil_examenes
             (perfil_id, tipo_emo, examen_id, sexo_aplicable, edad_minima, edad_maxima, es_condicional)
           VALUES ?`,
          [values]
        );
      }
      stats.perfil_examenes_insertados += perfilExamenesBuffer.length;

      // -------- Precios (sólo los > 0) --------
      const precioMap = {
        PREOC: normalizePrice(r[idx.precio_pre]),
        ANUAL: normalizePrice(r[idx.precio_anual]),
        RETIRO: normalizePrice(r[idx.precio_retiro]),
      };
      for (const [tipoEmo, precio] of Object.entries(precioMap)) {
        if (precio > 0) {
          if (!DRY_RUN) {
            await conn.query(
              `INSERT INTO emo_perfil_precio (perfil_id, empresa_id, sede_id, tipo_emo, precio)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE precio = VALUES(precio)`,
              [perfilId, empresaId, sedeId, tipoEmo, precio]
            );
          }
          stats.precios_insertados++;
        }
      }
    }

    if (!DRY_RUN) await conn.commit();

    console.log();
    console.log('='.repeat(70));
    console.log('Resumen');
    console.log('='.repeat(70));
    console.log(`Filas CSV leídas:              ${stats.rows}`);
    console.log(`Filas saltadas:                ${stats.skipped}`);
    console.log(`Filas duplicadas (dedup):      ${stats.duplicados}`);
    console.log(`Empresas creadas nuevas:       ${stats.empresas_creadas}`);
    console.log(`Empresas ya existentes:        ${stats.empresas_existentes}`);
    console.log(`Sedes creadas (legacy):        ${stats.sedes_creadas}`);
    console.log(`Categorías creadas:            ${stats.categorias_creadas}`);
    console.log(`Exámenes creados:              ${stats.examenes_creados}`);
    console.log(`Perfiles creados:              ${stats.perfiles_creados}`);
    console.log(`Asignaciones creadas:          ${stats.asignaciones_creadas}`);
    console.log(`Perfil-exámenes insertados:    ${stats.perfil_examenes_insertados}`);
    console.log(`Precios insertados (>0):       ${stats.precios_insertados}`);
    console.log();
    if (DRY_RUN) {
      console.log('DRY-RUN completo. No se escribió nada en la DB.');
    } else {
      console.log('✓ Import completo. Transacción commiteada.');
    }
  } catch (err) {
    if (!DRY_RUN) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
    }
    console.error('✗ Error durante import:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
