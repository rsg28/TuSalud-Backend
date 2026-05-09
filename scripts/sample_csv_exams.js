// Script para ver qué nombres de exámenes hay en el CSV
const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../cotizacion.csv');
const text = fs.readFileSync(csvPath, 'utf8');
const lines = text.split('\n').filter(l => l.trim());

const seen = new Set();
let found = 0;

for (let i = 1; i < lines.length && found < 5; i++) {
  const line = lines[i];
  const idx = line.indexOf('"{"categorias"');
  if (idx < 0) continue;

  let jsonStr = line.substring(idx);
  // remove outer quotes if wrapped
  if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
    jsonStr = jsonStr.slice(1, -1).replace(/""/g, '"');
  }

  try {
    const perfil = JSON.parse(jsonStr);
    const cats = perfil.categorias || [];
    console.log('--- Perfil row ' + i + ' ---');
    for (const cat of cats.slice(0, 3)) {
      console.log('  Categoria: ' + cat.nombre);
      const exams = cat.examenes || [];
      for (const ex of exams.slice(0, 5)) {
        const name = ex.nombre || ex.identificador || ex.codigo || '(sin nombre)';
        if (!seen.has(name)) {
          seen.add(name);
          console.log('    Examen: ' + name + ' | codigo: ' + (ex.codigo || ex.identificador || '-'));
        }
      }
    }
    found++;
  } catch (e) {
    // skip parse errors
  }
}

// Also show all unique exam names
console.log('\n=== TODOS LOS NOMBRES ÚNICOS DE EXÁMENES (primeros 100) ===');
const allNames = new Set();
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const m = line.matchAll(/"nombre":"([^"]+)"/g);
  for (const match of m) {
    allNames.add(match[1]);
  }
}
const sorted = [...allNames].sort();
sorted.slice(0, 100).forEach(n => console.log('  ' + n));
console.log('Total unique nombres:', allNames.size);
