#!/usr/bin/env node
/**
 * Genera TuSalud-Frontend/scripts/fixtures/catalogo-demo.json a partir del
 * tarifario y (opcional) cotizacion.xlsx para alimentar los generadores de fixtures.
 *
 * Uso:
 *   node scripts/exportarCatalogoParaFixtures.js
 *   node scripts/exportarCatalogoParaFixtures.js --cotizacion ~/Downloads/cotizacion.xlsx
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const {
  buildTarifarioIndex,
  mapLegacyExamenToTarifario,
  walkLegacyExamenesFromPerfilJson,
} = require('../lib/mapearExamenLegacyTarifario');

function cellText(cell) {
  if (!cell) return '';
  const src = cell.isMerged ? cell.master : cell;
  let v = src.value;
  if (v == null) return '';
  if (typeof v === 'object' && v.richText) v = v.richText.map((t) => t.text).join('');
  if (typeof v === 'object' && 'result' in v) v = v.result;
  return String(v).replace(/\s+/g, ' ').trim();
}

async function leerTarifario(tarifPath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fs.readFileSync(tarifPath));
  const ws = wb.worksheets[0];
  const examenes = [];
  const categorias = new Set();
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const tipo = cellText(row.getCell(1));
    const nombre = cellText(row.getCell(2));
    const p15 = cellText(row.getCell(3));
    const p16 = cellText(row.getCell(4));
    if (!nombre) continue;
    categorias.add(tipo);
    examenes.push({
      categoria: tipo,
      nombre,
      precio_hasta_15: p15,
      precio_desde_16: p16,
    });
  }
  return { examenes, categorias: [...categorias] };
}

async function leerPerfilesDemo(cotizacionPath, tarifExamenes) {
  const tarifIndex = buildTarifarioIndex(tarifExamenes.map((e, i) => ({ id: i + 1, nombre: e.nombre })));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fs.readFileSync(cotizacionPath));
  const ws = wb.getWorksheet('cotizacion') || wb.worksheets[0];
  const header = [];
  for (let c = 1; c <= ws.columnCount; c++) header.push(cellText(ws.getRow(1).getCell(c)));
  const idx = { nombre: header.indexOf('nombre'), tipo: header.indexOf('tipo'), perfil: header.indexOf('perfil') };

  /** Coincidencia exacta del nombre legacy (evita «ADMINISTRATIVO» ⊂ «ADMINISTRATIVOS CONSERJE…»). */
  const nombresExactos = [
    'ADMINISTRATIVO',
    'CONDUCTOR',
    'OPERATIVO',
    'MANIPULADOR DE ALIMENTOS',
    'PERFIL ADMINISTRATIVO',
    'PERFIL CONDUCTOR',
    '6.- LIMPIEZA',
    'PERFIL BASICO',
  ];

  const perfiles = [];
  const vistos = new Set();

  for (const deseado of nombresExactos) {
    if (vistos.has(deseado)) continue;
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const nombre = cellText(row.getCell(idx.nombre + 1));
      const tipo = cellText(row.getCell(idx.tipo + 1));
      if (tipo !== 'PERFIL') continue;
      if (nombre.toUpperCase() !== deseado) continue;

      const pj = cellText(row.getCell(idx.perfil + 1));
      let parsed;
      try {
        parsed = JSON.parse(pj);
      } catch {
        continue;
      }
      const legacy = [];
      walkLegacyExamenesFromPerfilJson(parsed, legacy);
      const examenesMapeados = [];
      for (const lex of legacy) {
        const m = mapLegacyExamenToTarifario(lex, tarifIndex);
        if (m) examenesMapeados.push(m.tarifario_nombre);
      }
      const unicos = [...new Set(examenesMapeados)];
      if (unicos.length === 0) continue;
      vistos.add(deseado);
      perfiles.push({
        nombre: deseado,
        tipos_emo: ['PREOC', 'ANUAL', 'RETIRO'],
        examenes_tarifario_muestra: unicos.slice(0, 12),
      });
      break;
    }
  }

  return perfiles;
}

async function main() {
  const tarifPath = path.join(__dirname, '..', 'docs', 'Tarifario Base  S.O. TU SALUD SAC (3).xlsx');
  const cotPath =
    process.argv.includes('--cotizacion')
      ? process.argv[process.argv.indexOf('--cotizacion') + 1]
      : fs.existsSync(path.join(__dirname, '..', 'docs', 'cotizacion.xlsx'))
        ? path.join(__dirname, '..', 'docs', 'cotizacion.xlsx')
        : path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Downloads', 'cotizacion.xlsx');

  const { examenes, categorias } = await leerTarifario(tarifPath);

  const examenesAdicionalesDemo = [
    'Hemograma completo (incluye Hb y Ho)',
    'Audiometría + Otoscopía',
    'Electrocardiograma',
    'Espirometría + cuestionario',
    'Radiografía de tórax PA',
    'Glucosa (basal o postprandial)',
    'Colesterol',
  ].filter((n) => examenes.some((e) => e.nombre === n));

  let perfilesDemo = [];
  if (fs.existsSync(cotPath)) {
    perfilesDemo = await leerPerfilesDemo(cotPath, examenes);
  }

  if (perfilesDemo.length === 0) {
    perfilesDemo = [
      { nombre: 'ADMINISTRATIVO', tipos_emo: ['PREOC', 'ANUAL', 'RETIRO'], examenes_tarifario_muestra: examenesAdicionalesDemo },
      { nombre: 'CONDUCTOR', tipos_emo: ['PREOC', 'ANUAL', 'RETIRO'], examenes_tarifario_muestra: examenesAdicionalesDemo },
      { nombre: 'OPERATIVO', tipos_emo: ['PREOC', 'ANUAL', 'RETIRO'], examenes_tarifario_muestra: examenesAdicionalesDemo },
    ];
  }

  const perfilesGlobales = perfilesDemo
    .filter((p) => !p.nombre.toUpperCase().includes('BASICO') || p.nombre.toUpperCase().includes('6.-'))
    .map((p) => p.nombre)
    .slice(0, 7);

  const perfilesEmpresa = perfilesDemo
    .filter((p) => p.nombre.toUpperCase().includes('BASICO') || p.nombre.toUpperCase().includes('GES'))
    .map((p) => p.nombre);

  if (perfilesEmpresa.length === 0) {
    perfilesEmpresa.push('PERFIL BASICO');
  }

  const out = {
    generado: new Date().toISOString(),
    empresa_demo: {
      razon_social: 'EMPRESA TRANSPORTES',
      ruc: '20123456789',
    },
    categorias_tarifario: categorias,
    total_examenes_tarifario: examenes.length,
    examenes_adicionales_demo: examenesAdicionalesDemo,
    perfiles_globales_demo: perfilesGlobales.length
      ? perfilesGlobales
      : ['ADMINISTRATIVO', 'OPERATIVO', 'CONDUCTOR', 'MANIPULADOR DE ALIMENTOS'],
    perfiles_empresa_demo: perfilesEmpresa,
    perfiles_detalle: perfilesDemo,
    tipos_emo: ['PREOC', 'ANUAL', 'RETIRO', 'VISITA'],
  };

  const outPath = path.join(
    __dirname,
    '..',
    '..',
    'TuSalud-Frontend',
    'scripts',
    'fixtures',
    'catalogo-demo.json'
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('OK', outPath);
  console.log('  examenes tarifario:', examenes.length);
  console.log('  perfiles demo:', out.perfiles_globales_demo.length);
  console.log('  adicionales demo:', examenesAdicionalesDemo.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
