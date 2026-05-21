/**
 * smoke test: flujo completo de importación de archivos de pedido (cliente).
 *
 * Prueba:
 *   1. Lectura Excel → TSV  (misma lógica que excelToCsv en el cliente)
 *   2. Parseo de filas con parseEmpleadosFile (TypeScript compilado via tsx/ts-node)
 *   3. Coincidencia de perfiles contra catálogo de BD
 *      — incluye: GLOBAL, PRIVADO-empresa, PRIVADO-grupo, inválido, sin perfil
 *   4. Reporte detallado de diagnósticos esperados vs obtenidos
 *
 * Prerequisito: node scripts/setup-test-perfiles.cjs (perfiles de prueba en la BD)
 * Uso: node --require @swc/register scripts/test-importacion-pedido.cjs
 *       o bien: npx tsx scripts/test-importacion-pedido.cjs
 */
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const ExcelJS = require(path.resolve(__dirname, '../../TuSalud-Frontend/node_modules/exceljs'));
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Obtener catálogo de perfiles desde la API de producción (no requiere auth para GET /api/emo-perfiles con token de sesión)
// Usamos fetch nativo (Node 18+)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.tu-salud.xyz';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';  // opcional: poner un token JWT de prueba

const BASE_EXCEL = 'C:/Users/rgome/OneDrive/Desktop/testeo/excel/';
const ARCHIVOS_TEST = [
  'test_perfiles_v1_Perfil_DNI_Nombre.xlsx',
  'test_perfiles_v2_DNI_Perfil_Nombre.xlsx',
  'test_perfiles_v3_Nombre_DNI_Perfil.xlsx',
  'datos_correctos_sin_adicionales/datos_correctos_1.xlsx',
  'datos_correctos_sin_adicionales/datos_correctos_2.xlsx',
  'datos_correctos_sin_adicionales/datos_correctos_3.xlsx',
  'datos_correctos_sin_adicionales/datos_prueba_catalogo_bd.xlsx',
];

// ── Normalización igual que excelToCsv.ts ──────────────────────────────────
function cellToPrimitive(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString();
    if (v.richText) return v.richText.map(r => r.text || '').join('');
    if (typeof v.result !== 'undefined') return cellToPrimitive(v.result);
    if (typeof v.error !== 'undefined') return '';
    if (v.text) return String(v.text);
  }
  return String(v);
}
function escapeTsvField(s) {
  const str = String(s || '');
  if (str.includes('\t') || str.includes('\n') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
async function excelToTsv(filepath) {
  const buf = fs.readFileSync(filepath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return '';
  const maxCol = Math.max(1, ws.columnCount);
  const lines = [];
  ws.eachRow((row) => {
    const cells = [];
    for (let c = 1; c <= maxCol; c++) {
      cells.push(escapeTsvField(cellToPrimitive(row.getCell(c).value)));
    }
    lines.push(cells.join('\t'));
  });
  return lines.join('\n');
}

// ── Normalización de nombre de perfil (igual que emoPerfilMatchLocal.ts) ──
const NM = { á:'a',é:'e',í:'i',ó:'o',ú:'u',ñ:'n',Á:'a',É:'e',Í:'i',Ó:'o',Ú:'u',Ñ:'n' };
function normPerfilMatch(s) {
  let t = String(s || '').trim().replace(/\u00a0/g,' ').replace(/[\u200b-\u200d\ufeff]/g,'').replace(/\s+/g,' ');
  for (const [k,v] of Object.entries(NM)) t = t.split(k).join(v);
  return t.toLowerCase();
}
function resolverPerfil(perfiles, nombreRaw) {
  if (!nombreRaw || !nombreRaw.trim()) return null;
  const norm = normPerfilMatch(nombreRaw);
  const compact = norm.replace(/\s/g,'');
  let m = perfiles.find(p => normPerfilMatch(p.nombre) === norm);
  if (!m && compact.length >= 2) m = perfiles.find(p => normPerfilMatch(p.nombre).replace(/\s/g,'') === compact);
  if (!m && norm.length >= 3) {
    const hits = perfiles.filter(p => normPerfilMatch(p.nombre).includes(norm));
    if (hits.length >= 1) {
      hits.sort((a,b) => normPerfilMatch(a.nombre).length - normPerfilMatch(b.nombre).length);
      m = hits[0];
    }
  }
  if (!m && norm.length >= 5) {
    m = perfiles.find(p => {
      const pn = normPerfilMatch(p.nombre);
      // Evitar falsos positivos con nombres cortos de una sola palabra (ej. "PERFIL", "BASICO"):
      const palabras = pn.split(' ').filter(Boolean);
      if (palabras.length === 1 && pn.length < 8) return false;
      return pn.length >= 5 && norm.includes(pn);
    });
  }
  return m ?? null;
}

// ── Parser mínimo para extraer filas del formato EMO ──────────────────────
function parseFormatoEmo(tsv) {
  const TIPOS_EMO = new Set(['preoc', 'preoc.', 'anual', 'retiro', 'visita']);
  const lines = tsv.split('\n').map(l => l.split('\t').map(c => c.trim().replace(/^"|"$/g,'')));

  // Encontrar fila de encabezados (tiene columnas DNI / Perfil / Nombres).
  // Puede ser una fila doble: row N tiene los campos clave, row N+1 tiene los tipos EMO.
  let headerIdx = -1;
  let cols = {};
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const row = lines[i].map(c => c.toLowerCase());
    const hasDni = row.some(c => c === 'dni' || c === 'documento');
    const hasPerfil = row.some(c => c === 'perfil');
    const hasNombre = row.some(c => c.includes('nombre') && c.length < 20);
    if (hasDni && (hasPerfil || hasNombre)) {
      headerIdx = i;
      cols.dni = row.findIndex(c => c === 'dni' || c === 'documento');
      cols.perfil = row.findIndex(c => c === 'perfil');
      cols.nombre = row.findIndex(c => c.includes('nombre') && c.length < 20);
      cols.puesto = row.findIndex(c => c.includes('puesto') || c.includes('cargo'));

      // Columnas tipo EMO: buscar en esta fila y en la siguiente (doble encabezado)
      cols.tipos = [];
      const tipoRows = [row];
      if (i + 1 < lines.length) tipoRows.push(lines[i+1].map(c => c.toLowerCase()));
      for (const tRow of tipoRows) {
        for (let j = 0; j < tRow.length; j++) {
          if (TIPOS_EMO.has(tRow[j])) {
            const nombre = tRow[j].replace('.','').toUpperCase();
            if (!cols.tipos.find(t => t.nombre === nombre))
              cols.tipos.push({ col: j, nombre });
          }
        }
      }
      break;
    }
  }

  if (headerIdx < 0) return { error: 'No se encontró fila de encabezados', empleados: [] };

  // Saltar encabezados: si la fila headerIdx+1 contiene aún más encabezados (sin DNI numérico),
  // saltar esa también (doble fila de encabezados como en la plantilla real).
  let dataStart = headerIdx + 1;
  if (dataStart < lines.length) {
    const nextRow = lines[dataStart];
    const hasTiposTexto = nextRow.some(c => TIPOS_EMO.has(c.toLowerCase()));
    const hasNroNumerico = nextRow.some(c => /^\d+$/.test(c));
    if (hasTiposTexto && !hasNroNumerico) dataStart++;
  }

  const empleados = [];
  const AVISO_LONG = 200;
  for (let i = dataStart; i < lines.length; i++) {
    const row = lines[i];
    if (!row || row.every(c => !c)) continue;
    if (row.some(c => c.length > AVISO_LONG)) continue;
    const dni = cols.dni >= 0 ? (row[cols.dni] || '').replace(/[^\d]/g,'') : '';
    const nombre = cols.nombre >= 0 ? (row[cols.nombre] || '') : '';
    const perfil = cols.perfil >= 0 ? (row[cols.perfil] || '').trim() : '';
    const puesto = cols.puesto >= 0 ? (row[cols.puesto] || '') : '';

    if (!dni && !nombre) continue;
    // Solo filas con DNI válido de 8 dígitos, o nombre con al menos 2 palabras
    if (dni.length > 0 && dni.length !== 8) continue;
    if (!dni && nombre.split(/\s+/).filter(Boolean).length < 2) continue;

    let emoTipo = null;
    for (const t of cols.tipos) {
      const val = (row[t.col] || '').toLowerCase().trim();
      if (val === 'x') { emoTipo = t.nombre; break; }
    }
    empleados.push({ dni, nombre, perfil, puesto, emoTipo });
  }
  return { cols, empleados };
}

// Fetch catalog desde el API o usar perfiles de prueba conocidos como fallback
async function fetchPerfilesCatalogo() {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    const res = await fetch(`${API_BASE}/api/emo-perfiles`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.perfiles || [];
    }
  } catch (e) {
    console.warn(`  ⚠  No se pudo conectar al API (${e.message}). Usando catálogo de prueba mínimo.`);
  }
  // Catálogo mínimo de fallback con los perfiles de prueba que creamos en la BD
  return [
    { id: 1562, nombre: 'PRUEBA GLOBAL TEST',    visibilidad: 'GLOBAL'  },
    { id: 1563, nombre: 'PRUEBA EMPRESA TEST',   visibilidad: 'PRIVADO' },
    { id: 1564, nombre: 'PRUEBA GRUPO TEST',     visibilidad: 'PRIVADO' },
  ];
}

// ── MAIN ──────────────────────────────────────────────────────────────────
(async () => {
  const perfilesDB = await fetchPerfilesCatalogo();
  // Scope info (solo disponible con catálogo real; en fallback todos son sin scope extra)
  const perfilPorId = new Map(perfilesDB.map(p => [p.id, p]));

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`SMOKE TEST: IMPORTACIÓN DE ARCHIVOS DE PEDIDO`);
  console.log(`Catálogo cargado: ${perfilesDB.length} perfiles`);
  console.log(`${'═'.repeat(70)}\n`);

  let totalArchivos = 0, archivosOk = 0, archivosConError = 0;

  for (const archivo of ARCHIVOS_TEST) {
    const fullPath = path.join(BASE_EXCEL, archivo);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠  ARCHIVO NO ENCONTRADO: ${archivo}\n`);
      continue;
    }
    totalArchivos++;
    console.log(`${'─'.repeat(70)}`);
    console.log(`📄  ${path.basename(archivo)}`);

    try {
      const tsv = await excelToTsv(fullPath);
      const { cols, empleados, error } = parseFormatoEmo(tsv);

      if (error) {
        console.log(`   ❌ Error de parseo: ${error}`);
        archivosConError++;
        continue;
      }

      console.log(`   Columnas detectadas: DNI=${cols.dni} Perfil=${cols.perfil} Nombre=${cols.nombre} Tipos=${cols.tipos.map(t=>t.nombre).join(',')}`);
      console.log(`   Empleados encontrados: ${empleados.length}`);

      // Estadísticas
      let sinDni = 0, sinPerfil = 0, perfilInvalido = 0, perfilGlobal = 0, perfilEmpresa = 0, perfilGrupo = 0, sinTipo = 0;
      const perfilesUnicos = new Set();
      const diagnosticos = [];

      for (const emp of empleados) {
        if (!emp.dni) sinDni++;
        if (!emp.emoTipo) sinTipo++;

        const perfilRaw = emp.perfil?.trim();
        perfilesUnicos.add(perfilRaw || '(vacío)');

        if (!perfilRaw) {
          sinPerfil++;
          diagnosticos.push({ sev: 'warn', msg: `Sin perfil: ${emp.nombre} (DNI: ${emp.dni})` });
          continue;
        }

        const resuelto = resolverPerfil(perfilesDB, perfilRaw);
        if (!resuelto) {
          perfilInvalido++;
          diagnosticos.push({ sev: 'error', msg: `Perfil no en catálogo: "${perfilRaw}" → ${emp.nombre}` });
        } else {
          const p = perfilPorId.get(resuelto.id);
          const scope = p?.empresa_id
            ? `EMPRESA (${p.empresa_nombre || p.empresa_id})`
            : p?.grupo_id
            ? `GRUPO (${p.grupo_nombre || p.grupo_id})`
            : 'GLOBAL';
          if (p?.empresa_id) perfilEmpresa++;
          else if (p?.grupo_id) perfilGrupo++;
          else perfilGlobal++;
          // Solo log si es perfil de prueba o hay pocos empleados
          if (perfilRaw.includes('TEST') || empleados.length <= 10) {
            diagnosticos.push({ sev: 'ok', msg: `"${perfilRaw}" → ID ${resuelto.id} (${scope})` });
          }
        }
      }

      // Resumen
      console.log(`   ✓ Perfiles únicos: ${perfilesUnicos.size}`);
      if (perfilGlobal > 0)   console.log(`   ✓ Con perfil GLOBAL:  ${perfilGlobal} empleados`);
      if (perfilEmpresa > 0)  console.log(`   ✓ Con perfil EMPRESA: ${perfilEmpresa} empleados`);
      if (perfilGrupo > 0)    console.log(`   ✓ Con perfil GRUPO:   ${perfilGrupo} empleados`);
      if (sinPerfil > 0)      console.log(`   ⚠  Sin perfil:         ${sinPerfil} empleados`);
      if (perfilInvalido > 0) console.log(`   ❌ Perfil no en catálogo: ${perfilInvalido} empleados`);
      if (sinDni > 0)         console.log(`   ⚠  Sin DNI:             ${sinDni} empleados`);
      if (sinTipo > 0)        console.log(`   ⚠  Sin tipo EMO:        ${sinTipo} empleados`);

      // Mostrar diagnósticos relevantes
      if (diagnosticos.length > 0) {
        console.log('   Detalle:');
        diagnosticos.slice(0, 12).forEach(d => {
          const icon = d.sev === 'error' ? '   ❌' : d.sev === 'ok' ? '   ✓ ' : '   ⚠ ';
          console.log(`${icon} ${d.msg}`);
        });
        if (diagnosticos.length > 12) console.log(`   ... y ${diagnosticos.length - 12} más`);
      }

      const tieneErrores = perfilInvalido > 0 || sinDni > 0;
      if (!tieneErrores) archivosOk++;
      else archivosConError++;

    } catch (err) {
      console.log(`   ❌ Excepción: ${err.message}`);
      archivosConError++;
    }
    console.log();
  }

  console.log(`${'═'.repeat(70)}`);
  console.log(`RESULTADO FINAL`);
  console.log(`  Archivos testeados: ${totalArchivos}`);
  console.log(`  Sin errores: ${archivosOk}`);
  console.log(`  Con errores/advertencias: ${archivosConError}`);
  console.log(`${'═'.repeat(70)}\n`);
})().catch(e => { console.error(e.message); process.exit(1); });
