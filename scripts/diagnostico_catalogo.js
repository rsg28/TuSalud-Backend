#!/usr/bin/env node
/**
 * TuSalud — Diagnóstico rápido del catálogo EMO.
 * Imprime conteos de las tablas de catálogo y muestra una muestra para
 * confirmar el estado antes/después de un import.
 *
 * Uso:
 *   node scripts/diagnostico_catalogo.js
 */

const pool = require('../config/database');

async function main() {
  const conn = await pool.getConnection();
  try {
    const tablas = [
      'empresas',
      'sedes',
      'emo_categorias',
      'examenes',
      'examen_precio',
      'emo_perfiles',
      'emo_perfil_asignacion',
      'emo_perfil_examenes',
      'emo_perfil_precio',
      'pedidos',
      'pedido_pacientes',
      'paciente_examen_asignado',
      'paciente_examen_completado',
      'cotizaciones',
      'cotizacion_items',
    ];

    console.log('='.repeat(70));
    console.log('TuSalud — Diagnóstico catálogo EMO');
    console.log('='.repeat(70));

    for (const t of tablas) {
      try {
        const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
        console.log(`  ${t.padEnd(32)} ${rows[0].c}`);
      } catch (err) {
        console.log(`  ${t.padEnd(32)} ERROR: ${err.message}`);
      }
    }

    console.log();
    console.log('Muestra: 5 exámenes más recientes');
    console.log('-'.repeat(70));
    const [exMuestra] = await conn.query(
      `SELECT id, identificador, nombre, categoria_id
         FROM examenes
         ORDER BY id DESC
         LIMIT 5`
    );
    if (!exMuestra.length) {
      console.log('  (no hay ningún examen)');
    } else {
      for (const e of exMuestra) {
        console.log(`  #${e.id}  legacy=${e.identificador}  cat=${e.categoria_id}  ${e.nombre}`);
      }
    }

    console.log();
    console.log('Muestra: 5 perfiles más recientes con conteo de exámenes');
    console.log('-'.repeat(70));
    const [perfMuestra] = await conn.query(
      `SELECT p.id, p.nombre, p.tipo,
              (SELECT COUNT(*) FROM emo_perfil_examenes pe WHERE pe.perfil_id = p.id) AS n_examenes
         FROM emo_perfiles p
         ORDER BY p.id DESC
         LIMIT 5`
    );
    if (!perfMuestra.length) {
      console.log('  (no hay ningún perfil)');
    } else {
      for (const p of perfMuestra) {
        console.log(`  #${p.id}  ${p.tipo.padEnd(9)} ${p.nombre.slice(0, 50).padEnd(52)} examenes=${p.n_examenes}`);
      }
    }

    console.log();
    console.log('Muestra: distribución por categoría');
    console.log('-'.repeat(70));
    const [catMuestra] = await conn.query(
      `SELECT c.id_cola, c.nombre,
              (SELECT COUNT(*) FROM examenes e WHERE e.categoria_id = c.id) AS n_examenes
         FROM emo_categorias c
         ORDER BY n_examenes DESC, c.nombre
         LIMIT 15`
    );
    if (!catMuestra.length) {
      console.log('  (no hay ninguna categoría)');
    } else {
      for (const c of catMuestra) {
        console.log(`  ${String(c.id_cola).padEnd(16)} ${c.nombre.slice(0, 40).padEnd(42)} examenes=${c.n_examenes}`);
      }
    }
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('✗ Error:', err.message);
  process.exitCode = 1;
});
