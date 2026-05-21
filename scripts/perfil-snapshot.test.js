/**
 * Tests unitarios para utils/perfilSnapshot.js — el módulo que congela la
 * "foto" de un perfil EMO y de un paciente. Se usan mocks del conector mysql2
 * (`query` / `execute`) para no depender de una BD real.
 *
 * Cubre los 4 escenarios críticos:
 *   1. buildPerfilSnapshot: agrupa por categoría, preserva orden y datos.
 *   2. buildPerfilSnapshot: perfil sin exámenes → snapshot vacío explícito.
 *   3. buildPacienteExamenesSnapshot: lista plana de exámenes del paciente.
 *   4. mergeNombresClienteEnPerfilSnapshot: añade el texto del protocolo del
 *      cliente sin perder los nombres canónicos.
 *
 * Ejecutar: node --test scripts/perfil-snapshot.test.js
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPerfilSnapshot,
  buildPacienteExamenesSnapshot,
  mergeNombresClienteEnPerfilSnapshot,
  enrichPerfilSnapshotWithPrecios,
} = require('../utils/perfilSnapshot');

/** Stub minimalista de mysql2.Pool con una cola de respuestas por consulta. */
function makeStubDb(programa) {
  const cola = [...programa];
  return {
    async query() {
      if (cola.length === 0) {
        throw new Error('Stub DB sin respuestas programadas (revisar test)');
      }
      const respuesta = cola.shift();
      return [respuesta];
    },
    pendientes: () => cola.length,
  };
}

test('buildPerfilSnapshot: arma snapshot con categorías + exámenes ordenados', async () => {
  // 1ª query: SELECT FROM emo_perfiles
  // 2ª query: SELECT FROM emo_perfil_examenes JOIN examenes JOIN emo_categorias
  const db = makeStubDb([
    [{ id: 42, nombre: 'OPERARIO MINA', tipo: 'PERFIL' }],
    [
      {
        examen_id: 1, tipo_emo: 'PREOC',
        sexo_aplicable: 'AMBOS', edad_minima: null, edad_maxima: null, es_condicional: 0,
        codigo_legacy: 'EX-001', examen_nombre: 'HEMOGRAMA COMPLETO',
        categoria_id: 10, categoria_nombre: 'LABORATORIO', categoria_id_cola: 'LAB',
      },
      {
        examen_id: 2, tipo_emo: 'PREOC',
        sexo_aplicable: 'AMBOS', edad_minima: null, edad_maxima: null, es_condicional: 0,
        codigo_legacy: 'EX-002', examen_nombre: 'TRIAJE BASICO',
        categoria_id: 11, categoria_nombre: 'TRIAJE', categoria_id_cola: 'T1',
      },
      {
        examen_id: 3, tipo_emo: 'PREOC',
        sexo_aplicable: 'AMBOS', edad_minima: null, edad_maxima: null, es_condicional: 0,
        codigo_legacy: 'EX-003', examen_nombre: 'GLUCOSA EN AYUNAS',
        categoria_id: 10, categoria_nombre: 'LABORATORIO', categoria_id_cola: 'LAB',
      },
    ],
  ]);

  const snap = await buildPerfilSnapshot(db, 42, 'PREOC');
  assert.ok(snap, 'snapshot no debería ser null');
  assert.equal(snap.perfil_id, 42);
  assert.equal(snap.perfil_nombre, 'OPERARIO MINA');
  assert.equal(snap.tipo_emo, 'PREOC');
  assert.equal(snap.total_examenes, 3);
  assert.equal(snap.categorias.length, 2, 'dos categorías agrupadas');

  const cats = Object.fromEntries(snap.categorias.map((c) => [c.id_cola, c]));
  assert.equal(cats.LAB.examenes.length, 2);
  assert.equal(cats.T1.examenes.length, 1);
  assert.equal(cats.LAB.examenes[0].codigo_legacy, 'EX-001');
  assert.equal(cats.T1.examenes[0].nombre, 'TRIAJE BASICO');
});

test('buildPerfilSnapshot: perfil sin exámenes para ese tipo_emo → snapshot vacío explícito', async () => {
  const db = makeStubDb([
    [{ id: 99, nombre: 'PERFIL HUERFANO', tipo: 'PERFIL' }],
    [], // sin exámenes
  ]);

  const snap = await buildPerfilSnapshot(db, 99, 'RETIRO');
  assert.ok(snap);
  assert.equal(snap.perfil_id, 99);
  assert.equal(snap.tipo_emo, 'RETIRO');
  assert.equal(snap.total_examenes, 0);
  assert.deepEqual(snap.categorias, []);
});

test('buildPerfilSnapshot: perfil inexistente → null', async () => {
  const db = makeStubDb([[]]);
  const snap = await buildPerfilSnapshot(db, 12345, 'PREOC');
  assert.equal(snap, null);
});

test('buildPerfilSnapshot: tipo_emo inválido → null sin tocar la BD', async () => {
  const db = makeStubDb([]);
  const snap = await buildPerfilSnapshot(db, 1, 'INVALIDO');
  assert.equal(snap, null);
  assert.equal(db.pendientes(), 0);
});

test('buildPacienteExamenesSnapshot: arma lista plana de exámenes asignados', async () => {
  // 1ª query: SELECT FROM paciente_examen_asignado JOIN examenes JOIN emo_categorias
  // 2ª query: SELECT FROM emo_perfiles WHERE id = ?
  const db = makeStubDb([
    [
      {
        examen_id: 1, codigo_legacy: 'EX-001', examen_nombre: 'HEMOGRAMA COMPLETO',
        categoria_id: 10, categoria_nombre: 'LABORATORIO', categoria_id_cola: 'LAB',
      },
      {
        examen_id: 2, codigo_legacy: 'EX-002', examen_nombre: 'TRIAJE BASICO',
        categoria_id: 11, categoria_nombre: 'TRIAJE', categoria_id_cola: 'T1',
      },
    ],
    [{ nombre: 'OPERARIO MINA', tipo: 'PERFIL' }],
  ]);

  const snap = await buildPacienteExamenesSnapshot(db, 7, { perfilId: 42, tipoEmo: 'PREOC' });
  assert.ok(snap);
  assert.equal(snap.perfil_id, 42);
  assert.equal(snap.perfil_nombre, 'OPERARIO MINA');
  assert.equal(snap.tipo_emo, 'PREOC');
  assert.equal(snap.total_examenes, 2);
  assert.equal(snap.examenes[0].codigo_legacy, 'EX-001');
  assert.equal(snap.examenes[1].categoria_nombre, 'TRIAJE');
});

test('buildPacienteExamenesSnapshot: sin perfil opcional → solo lista de exámenes', async () => {
  const db = makeStubDb([
    [
      {
        examen_id: 5, codigo_legacy: 'EX-005', examen_nombre: 'AUDIOMETRIA',
        categoria_id: 12, categoria_nombre: 'OCUPACIONAL', categoria_id_cola: 'OCU',
      },
    ],
  ]);
  const snap = await buildPacienteExamenesSnapshot(db, 10);
  assert.ok(snap);
  assert.equal(snap.perfil_id, null);
  assert.equal(snap.perfil_nombre, null);
  assert.equal(snap.total_examenes, 1);
});

test('mergeNombresClienteEnPerfilSnapshot: añade nombre_cliente a los exámenes correctos', () => {
  const snap = {
    perfil_id: 1,
    perfil_nombre: 'X',
    categorias: [
      {
        id: 'LAB',
        examenes: [
          { examen_id: 1, nombre: 'HEMOGRAMA' },
          { examen_id: 2, nombre: 'GLUCOSA' },
        ],
      },
    ],
  };

  mergeNombresClienteEnPerfilSnapshot(snap, [
    { examen_id: 1, nombre_cliente: 'Hemograma 6 series' },
    { examen_id: 2, nombre_cliente: 'Glucosa basal' },
    { examen_id: 999, nombre_cliente: 'NO DEBE APARECER' },
  ]);

  assert.equal(snap.categorias[0].examenes[0].nombre_cliente, 'Hemograma 6 series');
  assert.equal(snap.categorias[0].examenes[1].nombre_cliente, 'Glucosa basal');
  // Examen 999 no estaba en el snapshot → no aparece como nuevo nodo.
  assert.equal(snap.categorias[0].examenes.length, 2);
});

test('enrichPerfilSnapshotWithPrecios: rellena precio por examen sin perder existentes', () => {
  const snap = {
    categorias: [
      {
        id: 'LAB',
        examenes: [
          { examen_id: 1, nombre: 'A' },
          { examen_id: 2, nombre: 'B', precio: 25.5 }, // ya tiene precio guardado
          { examen_id: 3, nombre: 'C' },
        ],
      },
    ],
  };
  const preciosMap = new Map([
    [1, 10],
    [2, 999], // no debe sobrescribir
    [3, 0],
  ]);
  enrichPerfilSnapshotWithPrecios(snap, preciosMap);
  assert.equal(snap.categorias[0].examenes[0].precio, 10);
  assert.equal(snap.categorias[0].examenes[1].precio, 25.5, 'no sobrescribe precio existente');
  assert.equal(snap.categorias[0].examenes[2].precio, 0);
});

test('escenario combinado: simulamos el cambio de perfil en 2015 vs 2016', async () => {
  // 1. Snapshot del perfil "OPERARIO" en 2015 (3 exámenes).
  const db2015 = makeStubDb([
    [{ id: 1, nombre: 'OPERARIO', tipo: 'PERFIL' }],
    [
      { examen_id: 1, tipo_emo: 'PREOC', sexo_aplicable: 'AMBOS', edad_minima: null, edad_maxima: null, es_condicional: 0,
        codigo_legacy: 'EX-001', examen_nombre: 'A', categoria_id: 10, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
      { examen_id: 2, tipo_emo: 'PREOC', sexo_aplicable: 'AMBOS', edad_minima: null, edad_maxima: null, es_condicional: 0,
        codigo_legacy: 'EX-002', examen_nombre: 'B', categoria_id: 10, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
      { examen_id: 3, tipo_emo: 'PREOC', sexo_aplicable: 'AMBOS', edad_minima: null, edad_maxima: null, es_condicional: 0,
        codigo_legacy: 'EX-003', examen_nombre: 'C', categoria_id: 10, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
    ],
  ]);
  const snap2015 = await buildPerfilSnapshot(db2015, 1, 'PREOC');
  assert.equal(snap2015.total_examenes, 3);

  // 2. En 2016 el catálogo cambia: el perfil ahora tiene 3, 4, 5. El snapshot
  //    de 2015 NO cambia (es inmutable). Si releemos el perfil hoy:
  const db2016 = makeStubDb([
    [{ id: 1, nombre: 'OPERARIO', tipo: 'PERFIL' }],
    [
      { examen_id: 3, tipo_emo: 'PREOC', sexo_aplicable: 'AMBOS', edad_minima: null, edad_maxima: null, es_condicional: 0,
        codigo_legacy: 'EX-003', examen_nombre: 'C', categoria_id: 10, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
      { examen_id: 4, tipo_emo: 'PREOC', sexo_aplicable: 'AMBOS', edad_minima: null, edad_maxima: null, es_condicional: 0,
        codigo_legacy: 'EX-004', examen_nombre: 'D', categoria_id: 10, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
      { examen_id: 5, tipo_emo: 'PREOC', sexo_aplicable: 'AMBOS', edad_minima: null, edad_maxima: null, es_condicional: 0,
        codigo_legacy: 'EX-005', examen_nombre: 'E', categoria_id: 10, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
    ],
  ]);
  const snap2016 = await buildPerfilSnapshot(db2016, 1, 'PREOC');
  assert.equal(snap2016.total_examenes, 3);

  // 3. snap2015 debe seguir reportando los exámenes A, B, C; snap2016 → C, D, E.
  const ids2015 = snap2015.categorias[0].examenes.map((e) => e.examen_id).sort();
  const ids2016 = snap2016.categorias[0].examenes.map((e) => e.examen_id).sort();
  assert.deepEqual(ids2015, [1, 2, 3]);
  assert.deepEqual(ids2016, [3, 4, 5]);

  // Diferencia (auditoría): ABC ≠ CDE → la captura de 2015 prueba que el
  // paciente NO tomó los exámenes D y E.
  const set2015 = new Set(ids2015);
  const dropped = ids2016.filter((id) => !set2015.has(id));
  assert.deepEqual(dropped, [4, 5]);
});
