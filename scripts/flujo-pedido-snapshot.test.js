/**
 * Tests "de flujo" para verificar que los controladores que mutan exámenes
 * asignados a un paciente persisten correctamente el snapshot histórico.
 *
 * No se conecta a una BD real. Se intercepta el módulo `config/database`
 * (vía cache de require) por un stub que registra las consultas y devuelve
 * respuestas programadas. Así podemos probar la lógica del controlador
 * sin depender de la red.
 *
 * Cobertura:
 *   - pacientesController.updatePaciente — al reasignar exámenes, debe
 *     persistir snapshot en `pedido_pacientes.examenes_snapshot_json`.
 *   - pacientesController.createPaciente — al crear paciente con exámenes,
 *     debe persistir snapshot.
 *
 * Ejecutar: node --test scripts/flujo-pedido-snapshot.test.js
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

/** Capturadora de consultas + cola de respuestas programadas. */
function makeFakePool() {
  const calls = [];
  const responses = [];
  return {
    calls,
    /** Empuja la próxima respuesta para `execute` o `query`. */
    pushResponse(rows = [], meta = {}) {
      responses.push([rows, meta]);
    },
    async execute(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (responses.length === 0) {
        // Para queries de escritura sin response programada devolvemos affectedRows simulado.
        return [{ insertId: calls.length, affectedRows: 1 }, {}];
      }
      return responses.shift();
    },
    async query(sql, params = []) {
      return this.execute(sql, params);
    },
  };
}

/** Resetea `require` para inyectar un mock del módulo `config/database`. */
function loadControllerConPoolMock(controllerRelPath, fakePool) {
  // Limpiar cache previo del controlador y sus dependencias relevantes.
  const dbPath = require.resolve('../config/database');
  const ctrlPath = require.resolve(controllerRelPath);
  const utilsPath = require.resolve('../utils/perfilSnapshot');
  delete require.cache[ctrlPath];
  delete require.cache[utilsPath];
  // Inyectar el fakePool como exports del módulo database.
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakePool,
  };
  return require(controllerRelPath);
}

/** Stub mínimo de res de Express. */
function makeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

test('pacientesController.updatePaciente: persiste snapshot tras reasignar exámenes', async () => {
  const pool = makeFakePool();

  // Programar respuestas en el orden EXACTO que el controlador hace queries.
  // 1) SELECT id FROM pedido_pacientes WHERE id = ?  → existe
  pool.pushResponse([{ id: 7 }]);
  // 2) UPDATE pedido_pacientes SET dni..., cargo..., area...  → ok
  pool.pushResponse([], { affectedRows: 1 });
  // 3) DELETE FROM paciente_examen_asignado WHERE paciente_id = ?  → ok
  pool.pushResponse([], { affectedRows: 3 });
  // 4) INSERT examen 101
  pool.pushResponse([], { affectedRows: 1 });
  // 5) INSERT examen 202
  pool.pushResponse([], { affectedRows: 1 });
  // === persistirSnapshotPaciente ===
  // 6) SELECT emo_perfil_id, emo_tipo FROM pedido_pacientes WHERE id = ?
  pool.pushResponse([{ emo_perfil_id: 42, emo_tipo: 'PREOC' }]);
  // 7) (dentro de buildPacienteExamenesSnapshot) SELECT pea.examen_id, e.identificador...
  pool.pushResponse([
    { examen_id: 101, codigo_legacy: 'EX-101', examen_nombre: 'A',
      categoria_id: 1, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
    { examen_id: 202, codigo_legacy: 'EX-202', examen_nombre: 'B',
      categoria_id: 1, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
  ]);
  // 8) SELECT nombre, tipo FROM emo_perfiles WHERE id = ?
  pool.pushResponse([{ nombre: 'OPERARIO', tipo: 'PERFIL' }]);
  // 9) SELECT examen_id FROM emo_perfil_examenes WHERE perfil_id = ? AND tipo_emo = ?
  //    (set de exámenes del perfil → para marcar origen PERFIL vs ADICIONAL)
  pool.pushResponse([{ examen_id: 101 }, { examen_id: 202 }]);
  // 10) UPDATE pedido_pacientes SET examenes_snapshot_json = ?  ← LA CLAVE
  pool.pushResponse([], { affectedRows: 1 });
  // 11) SELECT * FROM pedido_pacientes WHERE id = ?
  pool.pushResponse([{
    id: 7, dni: '12345678', nombre_completo: 'JUAN',
    examenes_snapshot_json: '{"total_examenes":2}',
  }]);

  const ctrl = loadControllerConPoolMock('../controllers/pacientesController', pool);
  const req = {
    params: { id: '7' },
    body: { dni: '12345678', nombre_completo: 'JUAN', cargo: null, area: null,
            examenes: [101, 202] },
  };
  const res = makeRes();
  await ctrl.updatePaciente(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body?.paciente, 'devuelve paciente');

  // Verificar que en algún punto se invocó el UPDATE del snapshot.
  const snapshotUpdate = pool.calls.find(
    (c) => /UPDATE pedido_pacientes SET examenes_snapshot_json = \?/i.test(c.sql)
  );
  assert.ok(snapshotUpdate, 'debe haberse persistido el snapshot');

  const snapshotJsonString = snapshotUpdate.params[0];
  const parsed = JSON.parse(snapshotJsonString);
  assert.equal(parsed.perfil_id, 42, 'snapshot debe llevar perfil_id desde el paciente');
  assert.equal(parsed.tipo_emo, 'PREOC');
  assert.equal(parsed.total_examenes, 2);
  assert.deepEqual(
    parsed.examenes.map((e) => e.examen_id).sort(),
    [101, 202]
  );
  // Ambos exámenes pertenecen al perfil → origen PERFIL, 0 adicionales.
  assert.equal(parsed.total_perfil, 2);
  assert.equal(parsed.total_adicionales, 0);
  for (const e of parsed.examenes) {
    assert.equal(e.origen, 'PERFIL', `examen ${e.examen_id} debe ir como PERFIL`);
  }
});

test('updatePaciente: distingue examen del PERFIL vs ADICIONAL (columna "Evaluaciones adicionales / condicionales")', async () => {
  const pool = makeFakePool();

  // 1) SELECT id FROM pedido_pacientes WHERE id = ?  → existe
  pool.pushResponse([{ id: 7 }]);
  // 2) UPDATE pedido_pacientes ...
  pool.pushResponse([], { affectedRows: 1 });
  // 3) DELETE paciente_examen_asignado
  pool.pushResponse([], { affectedRows: 0 });
  // 4..6) INSERT (3 exámenes asignados al paciente: 101, 202 son del perfil, 999 es adicional)
  pool.pushResponse([], { affectedRows: 1 });
  pool.pushResponse([], { affectedRows: 1 });
  pool.pushResponse([], { affectedRows: 1 });
  // 7) SELECT emo_perfil_id, emo_tipo  → perfil 42 / PREOC
  pool.pushResponse([{ emo_perfil_id: 42, emo_tipo: 'PREOC' }]);
  // 8) SELECT pea.examen_id ...  (los 3 que el paciente realmente tiene asignados)
  pool.pushResponse([
    { examen_id: 101, codigo_legacy: 'EX-101', examen_nombre: 'A',
      categoria_id: 1, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
    { examen_id: 202, codigo_legacy: 'EX-202', examen_nombre: 'B',
      categoria_id: 1, categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
    { examen_id: 999, codigo_legacy: 'EX-999', examen_nombre: 'ESPIROMETRIA ADICIONAL',
      categoria_id: 2, categoria_nombre: 'OCUP', categoria_id_cola: 'OCU' },
  ]);
  // 9) SELECT FROM emo_perfiles
  pool.pushResponse([{ nombre: 'OPERARIO', tipo: 'PERFIL' }]);
  // 10) SELECT examen_id FROM emo_perfil_examenes (solo 101 y 202 pertenecen al perfil)
  pool.pushResponse([{ examen_id: 101 }, { examen_id: 202 }]);
  // 11) UPDATE pedido_pacientes SET examenes_snapshot_json
  pool.pushResponse([], { affectedRows: 1 });
  // 12) SELECT * FROM pedido_pacientes WHERE id = ?
  pool.pushResponse([{
    id: 7, dni: '12345678', nombre_completo: 'JUAN',
    examenes_snapshot_json: '{"total_examenes":3}',
  }]);

  const ctrl = loadControllerConPoolMock('../controllers/pacientesController', pool);
  const req = {
    params: { id: '7' },
    body: { dni: '12345678', nombre_completo: 'JUAN', cargo: null, area: null,
            examenes: [101, 202, 999] },
  };
  const res = makeRes();
  await ctrl.updatePaciente(req, res);

  assert.equal(res.statusCode, 200);

  const snapshotUpdate = pool.calls.find(
    (c) => /UPDATE pedido_pacientes SET examenes_snapshot_json = \?/i.test(c.sql)
  );
  assert.ok(snapshotUpdate);
  const parsed = JSON.parse(snapshotUpdate.params[0]);

  assert.equal(parsed.total_examenes, 3);
  assert.equal(parsed.total_perfil, 2, 'dos exámenes del perfil');
  assert.equal(parsed.total_adicionales, 1, 'un examen adicional fuera del perfil');

  const byId = Object.fromEntries(parsed.examenes.map((e) => [e.examen_id, e]));
  assert.equal(byId[101].origen, 'PERFIL');
  assert.equal(byId[202].origen, 'PERFIL');
  assert.equal(byId[999].origen, 'ADICIONAL', 'examen 999 no está en el perfil → ADICIONAL');
});

test('pacientesController.createPaciente: persiste snapshot después de insertar exámenes', async () => {
  const pool = makeFakePool();

  // 1) INSERT INTO pedido_pacientes  → insertId 7
  pool.pushResponse({ insertId: 7, affectedRows: 1 });
  // 2..3) INSERT IGNORE paciente_examen_asignado (×2)
  pool.pushResponse([], { affectedRows: 1 });
  pool.pushResponse([], { affectedRows: 1 });
  // === persistirSnapshotPaciente ===
  // 4) SELECT emo_perfil_id, emo_tipo  → paciente sin perfil EMO
  pool.pushResponse([{ emo_perfil_id: null, emo_tipo: null }]);
  // 5) SELECT pea.examen_id ...  → exámenes
  pool.pushResponse([
    { examen_id: 5, codigo_legacy: 'EX-005', examen_nombre: 'AUDIOMETRIA',
      categoria_id: 2, categoria_nombre: 'OCUPACIONAL', categoria_id_cola: 'OCU' },
  ]);
  // 6) UPDATE pedido_pacientes SET examenes_snapshot_json = ?
  pool.pushResponse([], { affectedRows: 1 });
  // 7) SELECT * FROM pedido_pacientes WHERE id = ?
  pool.pushResponse([{ id: 7, dni: '11111111', nombre_completo: 'TEST' }]);

  const ctrl = loadControllerConPoolMock('../controllers/pacientesController', pool);
  const req = {
    body: { pedido_id: 99, dni: '11111111', nombre_completo: 'TEST',
            examenes: [5, 999] },
  };
  const res = makeRes();
  await ctrl.createPaciente(req, res);

  assert.equal(res.statusCode, 201);

  const snapshotUpdate = pool.calls.find(
    (c) => /UPDATE pedido_pacientes SET examenes_snapshot_json = \?/i.test(c.sql)
  );
  assert.ok(snapshotUpdate, 'createPaciente debe persistir snapshot');
  const parsed = JSON.parse(snapshotUpdate.params[0]);
  assert.equal(parsed.total_examenes, 1, 'snapshot refleja los exámenes realmente asignados (no los pedidos)');
  assert.equal(parsed.perfil_id, null);
});

test('pacientesController.getPacienteById: devuelve snapshot ya parseado al frontend', async () => {
  const pool = makeFakePool();
  const snapshotPersistido = {
    snapshot_at: '2026-05-21T20:00:00Z',
    perfil_id: 42,
    perfil_nombre: 'OPERARIO',
    tipo_emo: 'PREOC',
    examenes: [
      { examen_id: 101, codigo_legacy: 'EX-101', nombre: 'A',
        categoria_nombre: 'LAB', categoria_id_cola: 'LAB' },
    ],
    total_examenes: 1,
  };
  // 1) SELECT pp.*, p.numero_pedido...
  pool.pushResponse([{
    id: 7, dni: '12345678', nombre_completo: 'JUAN',
    examenes_snapshot_json: JSON.stringify(snapshotPersistido),
    numero_pedido: 'PED-2026-000001', empresa_id: 1,
  }]);
  // 2) SELECT examen_id FROM paciente_examen_asignado
  pool.pushResponse([{ examen_id: 101 }]);
  // 3) SELECT examen_id, fecha_completado FROM paciente_examen_completado
  pool.pushResponse([]);

  const ctrl = loadControllerConPoolMock('../controllers/pacientesController', pool);
  const req = { params: { id: '7' } };
  const res = makeRes();
  await ctrl.getPacienteById(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body?.paciente);
  assert.equal(res.body.paciente.examenes_asignados.length, 1);
  // Snapshot debe venir como objeto (parseado), no string.
  assert.equal(typeof res.body.paciente.examenes_snapshot, 'object');
  assert.equal(res.body.paciente.examenes_snapshot.perfil_id, 42);
  assert.equal(res.body.paciente.examenes_snapshot.total_examenes, 1);
});
