// Lista todos los nombres únicos de exámenes en el CSV
const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../cotizacion.csv');
const text = fs.readFileSync(csvPath, 'utf8');
const lines = text.split('\n');

const allNames = new Set();
for (const line of lines) {
  // Match all "nombre":"<value>" patterns  
  let pos = 0;
  while (true) {
    const idx = line.indexOf('""nombre"":""', pos);
    if (idx < 0) break;
    const start = idx + 13;
    const end = line.indexOf('""', start);
    if (end < 0) break;
    const name = line.substring(start, end);
    if (name && name.length > 1 && !name.match(/^\d+$/)) {
      allNames.add(name.replace(/\\u[0-9a-fA-F]{4}/g, '?'));
    }
    pos = end + 2;
  }
}

const sorted = [...allNames].sort();
console.log('Total nombres únicos:', sorted.length);
console.log('\n=== NOMBRES DE EXÁMENES EN CSV/DB ===');
sorted.forEach(n => console.log(n));
