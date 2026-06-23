'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  expandirSnapshotPacientesAPedido,
  parsePacienteSnapshot,
  sincronizarPedidoWizardSnapshot,
} = require('../utils/nuevoPedidoSnapshotApi');

test('expandirSnapshotPacientesAPedido agrupa perfiles, adicionales y precios', () => {
  const out = expandirSnapshotPacientesAPedido([
    {
      dni: '10000000',
      nombre_completo: 'Ana',
      perfiles: [
        {
          perfil_id: 452,
          perfil_nombre: 'Administrativo',
          emo_tipo: 'PREOC',
          examenes: [
            { examen_id: 1, nombre: 'Triaje', precio: 8 },
            { examen_id: 8, nombre: 'Glucosa', precio: 10 },
          ],
        },
      ],
      adicionales: [{ examen_id: 20, nombre: 'Hemograma', precio: 25 }],
    },
    {
      dni: '10000001',
      nombre_completo: 'Luis',
      perfiles: [
        {
          perfil_id: 452,
          perfil_nombre: 'Administrativo',
          emo_tipo: 'PREOC',
          examenes: [{ examen_id: 1, nombre: 'Triaje', precio: 8 }],
        },
      ],
      adicionales: [],
    },
  ]);

  assert.ok(out);
  assert.equal(out.empleados.length, 2);
  assert.equal(out.empleados[0].examenes.length, 3);
  assert.ok(out.empleados[0].wizard_snapshot_json);

  const triaje = out.items.find((i) => i.examen_id === 1);
  assert.equal(triaje?.cantidad, 2);
  assert.equal(triaje?.precio_base, 8);
  assert.equal(triaje?.perfil_origen_id, 452);

  const hemograma = out.items.find((i) => i.examen_id === 20);
  assert.equal(hemograma?.cantidad, 1);
  assert.equal(hemograma?.precio_final, 25);
  assert.equal(hemograma?.perfil_origen_id, undefined);
});

test('sincronizarPedidoWizardSnapshot actualiza precio_base sin columna precio_final', async () => {
  const executed = [];
  const mockConn = {
    async execute(sql, params) {
      executed.push({ sql: String(sql), params });
      if (/SELECT id FROM pedido_pacientes/i.test(sql)) {
        return [[{ id: 10 }]];
      }
      if (/SELECT id FROM pedido_items/i.test(sql)) {
        return [[{ id: 99 }]];
      }
      return [{ affectedRows: 1 }];
    },
  };

  const pacientes = [
    {
      dni: '10000000',
      nombre_completo: 'Ana',
      perfiles: [
        {
          perfil_id: 452,
          perfil_nombre: 'Administrativo',
          emo_tipo: 'PREOC',
          examenes: [{ examen_id: 1, nombre: 'Triaje', precio: 12 }],
        },
      ],
      adicionales: [],
    },
  ];

  const result = await sincronizarPedidoWizardSnapshot(mockConn, 52, pacientes);
  assert.equal(result.ok, true);

  const updateItem = executed.find((e) => /UPDATE pedido_items/i.test(e.sql));
  assert.ok(updateItem);
  assert.ok(!/precio_final/i.test(updateItem.sql));
  assert.equal(updateItem.params[1], 12);
});

test('parsePacienteSnapshot rechaza filas sin dni o sin examenes', () => {
  assert.equal(parsePacienteSnapshot({ dni: '', nombre_completo: 'X', perfiles: [] }), null);
  assert.equal(
    parsePacienteSnapshot({
      dni: '1',
      nombre_completo: 'Y',
      perfiles: [],
      adicionales: [{ examen_id: 5, nombre: 'A', precio: 0 }],
    })?.adicionales.length,
    1
  );
});
