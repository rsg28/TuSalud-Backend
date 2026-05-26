'use strict';

/**
 * Tests del service `seguimientoExamenes`.
 *
 * Como el service depende fuertemente de MySQL, usamos un mock muy simple de
 * "exec" (con la misma forma que `pool.execute`) para verificar que las
 * sentencias correctas se emiten en cada transición. NO probamos contra una
 * base de datos real para que el test sea rápido y reproducible offline.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const svc = require('../services/seguimientoExamenes');

/**
 * Construye un "exec" falso: graba todos los queries y permite preconfigurar
 * resultados por orden de invocación.
 */
function crearExecMock(resultados = []) {
  const queries = [];
  let i = 0;
  const exec = {
    async execute(sql, params) {
      queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      const r = resultados[i] != null ? resultados[i] : [[], {}];
      i += 1;
      return r;
    },
  };
  return { exec, queries };
}

test('seguimientoExamenes: ESTADOS_VALIDOS contiene los 5 estados', () => {
  for (const e of ['PENDIENTE', 'COMPLETADO', 'AUSENTE', 'NO_REALIZADO', 'POSPUESTO']) {
    assert.ok(svc.ESTADOS_VALIDOS.includes(e), `falta estado ${e}`);
  }
});

test('seguimientoExamenes: ESTADOS_NO_REALIZADOS = AUSENTE + NO_REALIZADO', () => {
  assert.deepEqual([...svc.ESTADOS_NO_REALIZADOS].sort(), ['AUSENTE', 'NO_REALIZADO']);
});

test('seguimientoExamenes: lanza error con estado inválido', async () => {
  const { exec } = crearExecMock();
  await assert.rejects(
    svc.actualizarEstadoExamen(
      { pacienteId: 1, examenId: 1, estado: 'OTRO_ESTADO' },
      exec
    ),
    /Estado inválido/i
  );
});

test('seguimientoExamenes: lanza error con paciente o examen inválidos', async () => {
  const { exec } = crearExecMock();
  await assert.rejects(
    svc.actualizarEstadoExamen({ pacienteId: 0, examenId: 1, estado: 'COMPLETADO' }, exec),
    /pacienteId inválido/i
  );
  await assert.rejects(
    svc.actualizarEstadoExamen({ pacienteId: 1, examenId: -1, estado: 'COMPLETADO' }, exec),
    /examenId inválido/i
  );
});

test('seguimientoExamenes: idempotencia por referencia_externa', async () => {
  // Simulamos: 1ª query (SELECT por ref) devuelve fila preexistente.
  const { exec, queries } = crearExecMock([
    [[{ id: 99, estado: 'COMPLETADO' }], {}],
  ]);
  const out = await svc.actualizarEstadoExamen(
    {
      pacienteId: 7,
      examenId: 42,
      estado: 'COMPLETADO',
      referenciaExterna: 'evt-1234',
      fuente: 'API_EXTERNA',
    },
    exec
  );
  assert.equal(out.idempotent, true);
  assert.equal(out.cambioReal, false);
  // Solo se hizo la query de búsqueda; ningún UPDATE/INSERT/historial.
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /SELECT id, estado FROM paciente_examen_asignado/);
});

test('seguimientoExamenes: COMPLETADO inserta también en paciente_examen_completado y registra historial', async () => {
  // No hay refExt, así que la 1ª query es el SELECT del estado actual.
  const { exec, queries } = crearExecMock([
    [[{ id: 10, estado: 'PENDIENTE' }], {}], // estado actual
    [[], {}], // UPDATE pea
    [[], {}], // INSERT en pec
    [[], {}], // INSERT historial
  ]);

  const out = await svc.actualizarEstadoExamen(
    {
      pacienteId: 5,
      examenId: 20,
      estado: 'COMPLETADO',
      motivo: 'OK',
      usuarioId: 33,
      fuente: 'MANUAL',
    },
    exec
  );

  assert.equal(out.estadoAnterior, 'PENDIENTE');
  assert.equal(out.estadoNuevo, 'COMPLETADO');
  assert.equal(out.cambioReal, true);
  assert.equal(queries.length, 4);
  assert.match(queries[1].sql, /UPDATE paciente_examen_asignado/);
  assert.match(queries[2].sql, /INSERT INTO paciente_examen_completado/);
  assert.match(queries[3].sql, /INSERT INTO paciente_examen_historial/);
});

test('seguimientoExamenes: transición COMPLETADO → AUSENTE borra de paciente_examen_completado', async () => {
  const { exec, queries } = crearExecMock([
    [[{ id: 10, estado: 'COMPLETADO' }], {}],
    [[], {}], // UPDATE pea
    [[], {}], // DELETE pec
    [[], {}], // INSERT historial
  ]);

  await svc.actualizarEstadoExamen(
    { pacienteId: 5, examenId: 20, estado: 'AUSENTE', motivo: 'No vino' },
    exec
  );

  assert.match(queries[1].sql, /UPDATE paciente_examen_asignado/);
  assert.match(queries[2].sql, /DELETE FROM paciente_examen_completado/);
  assert.match(queries[3].sql, /INSERT INTO paciente_examen_historial/);
});

test('seguimientoExamenes: examen no asignado se crea automáticamente', async () => {
  const { exec, queries } = crearExecMock([
    [[], {}], // SELECT estado actual → vacío
    [[], {}], // INSERT pea
    [[], {}], // INSERT/UPDATE pec (COMPLETADO)
    [[], {}], // INSERT historial
  ]);
  const out = await svc.actualizarEstadoExamen(
    { pacienteId: 1, examenId: 99, estado: 'COMPLETADO' },
    exec
  );
  assert.equal(out.estadoAnterior, null);
  assert.equal(out.estadoNuevo, 'COMPLETADO');
  assert.match(queries[1].sql, /INSERT INTO paciente_examen_asignado/);
});

test('integraciones: EVENTO_A_ESTADO mapea cada evento conocido', () => {
  const { _internals } = require('../controllers/integracionesController');
  assert.equal(_internals.EVENTO_A_ESTADO.EXAMEN_TOMADO, 'COMPLETADO');
  assert.equal(_internals.EVENTO_A_ESTADO.PACIENTE_AUSENTE, 'AUSENTE');
  assert.equal(_internals.EVENTO_A_ESTADO.EXAMEN_NO_REALIZADO, 'NO_REALIZADO');
  assert.equal(_internals.EVENTO_A_ESTADO.EXAMEN_POSPUESTO, 'POSPUESTO');
  assert.equal(_internals.EVENTO_A_ESTADO.EXAMEN_PENDIENTE, 'PENDIENTE');
});

test('integraciones: extraerToken acepta Bearer y X-API-Key', () => {
  const { _internals } = require('../controllers/integracionesController');
  assert.equal(_internals.extraerToken({ headers: { authorization: 'Bearer abc123' } }), 'abc123');
  assert.equal(_internals.extraerToken({ headers: { Authorization: 'bearer XYZ' } }), 'XYZ');
  assert.equal(_internals.extraerToken({ headers: { 'x-api-key': '   key-1  ' } }), 'key-1');
  assert.equal(_internals.extraerToken({ headers: {} }), '');
});
