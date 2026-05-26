'use strict';

/**
 * Prueba end-to-end del módulo de seguimiento clínico contra la base de datos
 * REAL configurada en `.env`.
 *
 * Cómo correrlo:
 *   node scripts/test_seguimiento_e2e.js
 *
 * Lo que hace:
 *   1. Setup: crea una empresa, un manager, un pedido, un cliente, 4 exámenes,
 *      3 pacientes con 3 exámenes cada uno, y una cotización APROBADA con
 *      precios reales para que `ajustes-sugeridos` tenga material.
 *   2. Recorre todas las transiciones de estado posibles.
 *   3. Prueba el marcado masivo (paciente ausente).
 *   4. Prueba idempotencia del webhook externo (referencia_externa repetida).
 *   5. Verifica el cálculo de `calcularAjustesSugeridos`.
 *   6. Verifica que `paciente_examen_historial` registró cada cambio.
 *   7. Verifica que `paciente_examen_completado` (mirror legacy) está sincronizado.
 *   8. Cleanup: borra todos los datos creados al final (incluso si hubo error).
 *
 * El script es **idempotente**: puede correrse muchas veces, identifica sus
 * registros por un prefijo único de timestamp y los borra al terminar.
 */

require('dotenv').config();
const crypto = require('node:crypto');
const pool = require('../config/database');
const seguimiento = require('../services/seguimientoExamenes');

const STAMP = `E2E-${Date.now()}`;
const log = (msg) => console.log(`  ${msg}`);
const ok = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);
const section = (title) => console.log(`\n━━━ ${title} ━━━`);

let pasados = 0;
let fallidos = 0;
function expect(cond, msg) {
  if (cond) { pasados += 1; ok(msg); }
  else { fallidos += 1; fail(msg); }
}

async function selectOne(sql, params) {
  const [rows] = await pool.execute(sql, params || []);
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Setup / cleanup
// ---------------------------------------------------------------------------

const created = {
  empresaId: null,
  sedeId: null,
  managerId: null,
  pedidoId: null,
  cotizacionId: null,
  pacienteIds: [],
  examenIds: [],
  apiKeyId: null,
};

async function setup() {
  section('SETUP — creando datos de prueba');

  // 1. Empresa
  let row = await selectOne(`SELECT id FROM empresas WHERE estado='ACTIVO' LIMIT 1`);
  if (row) {
    created.empresaId = row.id;
    log(`Empresa reutilizada id=${created.empresaId}`);
  } else {
    const [ins] = await pool.execute(
      `INSERT INTO empresas (razon_social, ruc, estado) VALUES (?, ?, 'ACTIVO')`,
      [`${STAMP} Empresa`, `${Date.now()}`.slice(-11).padStart(11, '9')]
    );
    created.empresaId = ins.insertId;
    log(`Empresa creada id=${created.empresaId}`);
  }

  // 2. Sede
  row = await selectOne(`SELECT id FROM sedes LIMIT 1`);
  if (!row) throw new Error('No hay sedes en la BD. Crea al menos una sede antes de correr este test.');
  created.sedeId = row.id;
  log(`Sede id=${created.sedeId}`);

  // 3. Manager
  row = await selectOne(`SELECT id FROM usuarios WHERE rol='manager' AND activo=1 LIMIT 1`);
  if (!row) throw new Error('No hay usuarios con rol=manager en la BD.');
  created.managerId = row.id;
  log(`Manager id=${created.managerId}`);

  // 4. Exámenes — tomamos 3 con precio base (la lógica de ajustes lo necesita)
  const [exRows] = await pool.execute(
    `SELECT e.id, e.nombre, COALESCE(ep.precio, 50.00) AS precio
       FROM examenes e
       LEFT JOIN examen_precio ep ON ep.examen_id = e.id AND ep.sede_id IS NULL
      WHERE e.activo = 1
      ORDER BY e.id ASC
      LIMIT 3`
  );
  if (exRows.length < 3) throw new Error('Se necesitan al menos 3 exámenes activos en la BD.');
  created.examenIds = exRows.map((r) => r.id);
  const examenesPorId = new Map(exRows.map((r) => [r.id, r]));
  log(`Exámenes seleccionados: [${created.examenIds.join(', ')}]`);

  // 5. Pedido
  const numeroPedido = `${STAMP}-PED`;
  const [insPed] = await pool.execute(
    `INSERT INTO pedidos (numero_pedido, empresa_id, sede_id, vendedor_id, estado, total_empleados)
     VALUES (?, ?, ?, ?, 'COTIZACION_APROBADA', 3)`,
    [numeroPedido, created.empresaId, created.sedeId, created.managerId]
  );
  created.pedidoId = insPed.insertId;
  log(`Pedido creado id=${created.pedidoId} (${numeroPedido})`);

  // 6. Pacientes (3) + sus exámenes asignados (3 c/u)
  const pacientesData = [
    { dni: '70000001', nombre: `${STAMP} Paciente A` },
    { dni: '70000002', nombre: `${STAMP} Paciente B` },
    { dni: '70000003', nombre: `${STAMP} Paciente C` },
  ];
  for (const p of pacientesData) {
    const [insP] = await pool.execute(
      `INSERT INTO pedido_pacientes (pedido_id, dni, nombre_completo, sexo, emo_tipo)
       VALUES (?, ?, ?, 'HOMBRE', 'PREOC')`,
      [created.pedidoId, p.dni, p.nombre]
    );
    created.pacienteIds.push(insP.insertId);
    for (const exId of created.examenIds) {
      await pool.execute(
        `INSERT INTO paciente_examen_asignado (paciente_id, examen_id, estado)
         VALUES (?, ?, 'PENDIENTE')`,
        [insP.insertId, exId]
      );
    }
  }
  log(`Pacientes creados: ${created.pacienteIds.join(', ')} (3 exámenes c/u)`);

  // 7. Cotización APROBADA con los 3 exámenes (precio_final = 50, cantidad = 3 pacientes)
  const numeroCot = `${STAMP}-COT`;
  const [insCot] = await pool.execute(
    `INSERT INTO cotizaciones (numero_cotizacion, pedido_id, estado, creador_tipo, creador_id, total)
     VALUES (?, ?, 'APROBADA', 'VENDEDOR', ?, ?)`,
    [numeroCot, created.pedidoId, created.managerId, 450]
  );
  created.cotizacionId = insCot.insertId;
  for (const exId of created.examenIds) {
    const ex = examenesPorId.get(exId);
    const precio = Number(ex.precio) || 50;
    await pool.execute(
      `INSERT INTO cotizacion_items
         (cotizacion_id, tipo_item, examen_id, nombre, cantidad, precio_base, precio_final, subtotal)
       VALUES (?, 'EXAMEN', ?, ?, 3, ?, ?, ?)`,
      [created.cotizacionId, exId, ex.nombre, precio, precio, precio * 3]
    );
  }
  log(`Cotización id=${created.cotizacionId} APROBADA con 3 ítems`);

  // 8. API key para el webhook externo
  const tokenPlano = `tk-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');
  const [insKey] = await pool.execute(
    `INSERT INTO integraciones_api_keys (nombre, token_hash, scope, activa)
     VALUES (?, ?, 'examen-evento', 1)`,
    [`${STAMP} api key`, tokenHash]
  );
  created.apiKeyId = insKey.insertId;
  created.apiKeyToken = tokenPlano;
  log(`API key creada id=${created.apiKeyId}`);
}

async function cleanup() {
  section('CLEANUP — borrando datos de prueba');
  try {
    // CASCADE borra pacientes/items/asignados/historial cuando cae el pedido
    if (created.pedidoId) {
      await pool.execute('DELETE FROM pedidos WHERE id = ?', [created.pedidoId]);
      log(`Pedido ${created.pedidoId} eliminado (cascade limpió pacientes, cotización, historial)`);
    }
    if (created.apiKeyId) {
      await pool.execute('DELETE FROM integraciones_api_keys WHERE id = ?', [created.apiKeyId]);
      log(`API key ${created.apiKeyId} eliminada`);
    }
    // Si creamos la empresa expresamente para el test, no la borramos: alguien
    // pudo agregar otros pedidos a esa empresa. La empresa queda.
  } catch (err) {
    fail(`cleanup falló: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers de aserción
// ---------------------------------------------------------------------------

async function estadoDe(pacienteId, examenId) {
  const r = await selectOne(
    `SELECT estado, motivo, fuente_actualizacion, referencia_externa
       FROM paciente_examen_asignado
      WHERE paciente_id = ? AND examen_id = ?`,
    [pacienteId, examenId]
  );
  return r;
}

async function contarHistorial(pacienteId, examenId) {
  const r = await selectOne(
    `SELECT COUNT(*) AS n FROM paciente_examen_historial
      WHERE paciente_id = ? AND examen_id = ?`,
    [pacienteId, examenId]
  );
  return Number(r.n);
}

async function existeEnCompletado(pacienteId, examenId) {
  const r = await selectOne(
    `SELECT 1 AS x FROM paciente_examen_completado
      WHERE paciente_id = ? AND examen_id = ?`,
    [pacienteId, examenId]
  );
  return !!r;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testTransiciones() {
  section('TEST 1 — transiciones de estado (paciente A)');
  const pid = created.pacienteIds[0];
  const eid = created.examenIds[0];

  // 1a. PENDIENTE → COMPLETADO
  let r = await seguimiento.actualizarEstadoExamen({
    pacienteId: pid, examenId: eid, estado: 'COMPLETADO',
    motivo: 'Tomado en sede norte', usuarioId: created.managerId,
  });
  expect(r.estadoAnterior === 'PENDIENTE' && r.estadoNuevo === 'COMPLETADO', 'PENDIENTE → COMPLETADO');
  expect(await existeEnCompletado(pid, eid), 'Mirror paciente_examen_completado contiene la fila');

  // 1b. COMPLETADO → AUSENTE (corrección de error operativo)
  r = await seguimiento.actualizarEstadoExamen({
    pacienteId: pid, examenId: eid, estado: 'AUSENTE',
    motivo: 'En realidad faltó', usuarioId: created.managerId,
  });
  expect(r.estadoNuevo === 'AUSENTE', 'COMPLETADO → AUSENTE');
  expect(!(await existeEnCompletado(pid, eid)), 'Mirror se borró al pasar a AUSENTE');

  // 1c. AUSENTE → NO_REALIZADO
  r = await seguimiento.actualizarEstadoExamen({
    pacienteId: pid, examenId: eid, estado: 'NO_REALIZADO',
    motivo: 'Equipo dañado', usuarioId: created.managerId,
  });
  expect(r.estadoNuevo === 'NO_REALIZADO', 'AUSENTE → NO_REALIZADO');

  // 1d. NO_REALIZADO → POSPUESTO
  r = await seguimiento.actualizarEstadoExamen({
    pacienteId: pid, examenId: eid, estado: 'POSPUESTO',
    motivo: 'Reprogramado próxima semana', usuarioId: created.managerId,
  });
  expect(r.estadoNuevo === 'POSPUESTO', 'NO_REALIZADO → POSPUESTO');

  // 1e. POSPUESTO → COMPLETADO (paciente regresó)
  r = await seguimiento.actualizarEstadoExamen({
    pacienteId: pid, examenId: eid, estado: 'COMPLETADO',
    motivo: 'Tomado tras reprogramación', usuarioId: created.managerId,
  });
  expect(r.estadoNuevo === 'COMPLETADO', 'POSPUESTO → COMPLETADO');
  expect(await existeEnCompletado(pid, eid), 'Mirror reaparece al volver a COMPLETADO');

  // 1f. COMPLETADO → PENDIENTE (revertir, "se marcó por error")
  r = await seguimiento.actualizarEstadoExamen({
    pacienteId: pid, examenId: eid, estado: 'PENDIENTE',
    motivo: null, usuarioId: created.managerId,
  });
  expect(r.estadoNuevo === 'PENDIENTE', 'COMPLETADO → PENDIENTE (revertir)');
  expect(!(await existeEnCompletado(pid, eid)), 'Mirror eliminado al revertir');

  // 1g. Historial: deben haber 6 entradas
  const nHist = await contarHistorial(pid, eid);
  expect(nHist === 6, `Historial registró las 6 transiciones (n=${nHist})`);
}

async function testEstadoInvalido() {
  section('TEST 2 — validaciones');
  const pid = created.pacienteIds[0];
  const eid = created.examenIds[1];

  try {
    await seguimiento.actualizarEstadoExamen({
      pacienteId: pid, examenId: eid, estado: 'PIRATA',
    });
    fail('Aceptó estado inválido (no debería)');
    fallidos += 1;
  } catch (err) {
    expect(err.code === 'ESTADO_INVALIDO', `Rechaza estado inválido: ${err.message}`);
  }

  try {
    await seguimiento.actualizarEstadoExamen({
      pacienteId: 0, examenId: eid, estado: 'COMPLETADO',
    });
    fail('Aceptó pacienteId=0');
    fallidos += 1;
  } catch (err) {
    expect(err.code === 'PARAM_INVALIDO', `Rechaza pacienteId inválido: ${err.message}`);
  }
}

async function testMarcadoMasivo() {
  section('TEST 3 — marcado masivo (paciente B no se presentó)');
  const pid = created.pacienteIds[1];

  const r = await seguimiento.actualizarEstadoMasivoPaciente({
    pacienteId: pid, estado: 'AUSENTE',
    motivo: 'Paciente no se presentó', usuarioId: created.managerId,
  });
  expect(r.ok && r.afectados === 3, `Masivo marcó los 3 exámenes (afectados=${r.afectados})`);

  // Todos en AUSENTE
  for (const exId of created.examenIds) {
    const st = await estadoDe(pid, exId);
    expect(st.estado === 'AUSENTE', `Paciente B exa ${exId} = AUSENTE`);
  }

  // Re-correrlo NO debería tocar nada (no quedan PENDIENTES)
  const r2 = await seguimiento.actualizarEstadoMasivoPaciente({
    pacienteId: pid, estado: 'AUSENTE', motivo: 'duplicado', usuarioId: created.managerId,
  });
  expect(r2.afectados === 0, `Segunda corrida masiva no afecta (soloPendientes=true). afectados=${r2.afectados}`);
}

async function testIdempotenciaWebhook() {
  section('TEST 4 — idempotencia del webhook externo');
  const pid = created.pacienteIds[2];
  const eid = created.examenIds[0];
  const ref = `evt-${Date.now()}`;

  const r1 = await seguimiento.actualizarEstadoExamen({
    pacienteId: pid, examenId: eid, estado: 'COMPLETADO',
    fuente: 'API_EXTERNA', referenciaExterna: ref,
  });
  expect(r1.estadoNuevo === 'COMPLETADO' && !r1.idempotent, 'Primera llamada aplica el cambio');

  const r2 = await seguimiento.actualizarEstadoExamen({
    pacienteId: pid, examenId: eid, estado: 'COMPLETADO',
    fuente: 'API_EXTERNA', referenciaExterna: ref,
  });
  expect(r2.idempotent === true && r2.cambioReal === false, 'Segunda llamada es idempotente');

  const st = await estadoDe(pid, eid);
  expect(st.fuente_actualizacion === 'API_EXTERNA', `fuente_actualizacion = API_EXTERNA`);
  expect(st.referencia_externa === ref, `referencia_externa persistida = ${st.referencia_externa}`);

  const nHist = await contarHistorial(pid, eid);
  expect(nHist === 1, `Historial solo tiene 1 fila pese a 2 llamadas (n=${nHist})`);
}

async function testAjustesSugeridos() {
  section('TEST 5 — cálculo de ajustes sugeridos');

  // Estado actual del pedido:
  //   Paciente A exa[0]=PENDIENTE, exa[1]=PENDIENTE, exa[2]=PENDIENTE
  //   Paciente B exa[0]=AUSENTE, exa[1]=AUSENTE, exa[2]=AUSENTE  ← 3 ausentes
  //   Paciente C exa[0]=COMPLETADO, exa[1]=PENDIENTE, exa[2]=PENDIENTE
  //
  // Ahora marcamos uno del paciente A como NO_REALIZADO para mezclar estados.
  await seguimiento.actualizarEstadoExamen({
    pacienteId: created.pacienteIds[0], examenId: created.examenIds[1],
    estado: 'NO_REALIZADO', motivo: 'Equipo dañado', usuarioId: created.managerId,
  });

  const ajustes = await seguimiento.calcularAjustesSugeridos(created.pedidoId);
  expect(ajustes.tiene_ajustes === true, 'tiene_ajustes = true');
  expect(ajustes.total_examenes_no_realizados === 4, `4 exámenes no realizados (3 ausentes B + 1 no_realizado A); obtenido: ${ajustes.total_examenes_no_realizados}`);
  expect(ajustes.monto_sugerido > 0, `monto_sugerido > 0 (S/ ${ajustes.monto_sugerido})`);
  expect(Array.isArray(ajustes.items) && ajustes.items.length === 4, `4 ítems detallados`);

  // Verificar que el monto es la suma de los precios unitarios
  const sumaPrecios = ajustes.items.reduce((s, it) => s + (it.precio_unitario || 0), 0);
  expect(
    Math.abs(sumaPrecios - ajustes.monto_sugerido) < 0.01,
    `monto_sugerido = suma de precios unitarios (S/ ${sumaPrecios.toFixed(2)} vs S/ ${ajustes.monto_sugerido.toFixed(2)})`
  );

  // Cada ítem debe tener paciente y examen consistentes
  for (const it of ajustes.items) {
    if (!created.pacienteIds.includes(it.paciente_id)) {
      fail(`Paciente fuera del pedido en ajuste: ${it.paciente_id}`);
      fallidos += 1;
    }
  }
  ok('Todos los ítems pertenecen a pacientes del pedido');
}

async function testSinAjustes() {
  section('TEST 6 — pedido sin ausentes devuelve tiene_ajustes=false');
  // Revertimos los AUSENTES de paciente B → COMPLETADO
  for (const exId of created.examenIds) {
    await seguimiento.actualizarEstadoExamen({
      pacienteId: created.pacienteIds[1], examenId: exId,
      estado: 'COMPLETADO', usuarioId: created.managerId,
    });
  }
  // Y el NO_REALIZADO de paciente A → COMPLETADO
  await seguimiento.actualizarEstadoExamen({
    pacienteId: created.pacienteIds[0], examenId: created.examenIds[1],
    estado: 'COMPLETADO', usuarioId: created.managerId,
  });

  const ajustes = await seguimiento.calcularAjustesSugeridos(created.pedidoId);
  expect(ajustes.tiene_ajustes === false, 'tiene_ajustes = false');
  expect(ajustes.monto_sugerido === 0, 'monto_sugerido = 0');
  expect(ajustes.items.length === 0, 'lista de items vacía');
}

async function testEstadosValidos() {
  section('TEST 7 — los 5 estados están definidos');
  for (const e of ['PENDIENTE', 'COMPLETADO', 'AUSENTE', 'NO_REALIZADO', 'POSPUESTO']) {
    expect(seguimiento.ESTADOS_VALIDOS.includes(e), `Estado ${e} disponible`);
  }
}

async function testColumnasMigracion() {
  section('TEST 8 — la migración aplicó todas las columnas');
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente_examen_asignado'`
  );
  const set = new Set(cols.map((c) => c.COLUMN_NAME));
  for (const c of ['estado', 'motivo', 'fecha_estado', 'actualizado_por_usuario_id', 'fuente_actualizacion', 'referencia_externa']) {
    expect(set.has(c), `Columna ${c} existe`);
  }

  const [tables] = await pool.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('paciente_examen_historial', 'integraciones_api_keys')`
  );
  const tset = new Set(tables.map((t) => t.TABLE_NAME));
  expect(tset.has('paciente_examen_historial'), 'Tabla paciente_examen_historial existe');
  expect(tset.has('integraciones_api_keys'), 'Tabla integraciones_api_keys existe');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🧪 Test E2E seguimiento de exámenes — stamp ${STAMP}\n`);
  try {
    await testColumnasMigracion();
    await setup();
    await testEstadosValidos();
    await testTransiciones();
    await testEstadoInvalido();
    await testMarcadoMasivo();
    await testIdempotenciaWebhook();
    await testAjustesSugeridos();
    await testSinAjustes();
  } catch (err) {
    console.error('\n💥 Error fatal en el runner:', err);
    fallidos += 1;
  } finally {
    await cleanup();
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total: ${pasados + fallidos}  |  Pasaron: ${pasados}  |  Fallaron: ${fallidos}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await pool.end();
  process.exit(fallidos > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('💥 Error no manejado:', err);
  try { await cleanup(); } catch {}
  await pool.end().catch(() => {});
  process.exit(1);
});
