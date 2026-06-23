/**
 * Expande el snapshot del wizard «nuevo pedido» (pacientes → perfiles + adicionales)
 * al payload interno de POST /api/pedidos (empleados + ítems agregados).
 */

'use strict';

const TIPOS_EMO_VALIDOS = new Set(['PREOC', 'ANUAL', 'RETIRO', 'VISITA']);

function precioSnapshot(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function clavePerfil(perfilId, emoTipo) {
  return `${perfilId}:${emoTipo}`;
}

function parseExamenSnapshotRef(raw) {
  if (raw == null || typeof raw !== 'object') return null;
  const examen_id = Number(raw.examen_id ?? raw.id);
  if (!Number.isFinite(examen_id) || examen_id <= 0) return null;
  const nombre = raw.nombre != null ? String(raw.nombre).trim() : '';
  return {
    examen_id,
    nombre: nombre || `Examen ${examen_id}`,
    precio: precioSnapshot(raw.precio),
  };
}

function parsePerfilSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const perfil_id = Number(raw.perfil_id);
  const emo_tipo = raw.emo_tipo ? String(raw.emo_tipo).toUpperCase() : '';
  if (!Number.isFinite(perfil_id) || perfil_id <= 0) return null;
  if (!TIPOS_EMO_VALIDOS.has(emo_tipo)) return null;
  const examenes = (Array.isArray(raw.examenes) ? raw.examenes : [])
    .map(parseExamenSnapshotRef)
    .filter(Boolean);
  return {
    perfil_id,
    perfil_nombre: String(raw.perfil_nombre ?? `Perfil ${perfil_id}`).trim(),
    emo_tipo,
    examenes,
  };
}

function parsePacienteSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const dni = String(raw.dni ?? '').trim();
  const nombre_completo = String(raw.nombre_completo ?? '').trim();
  if (!dni || !nombre_completo) return null;
  const perfiles = (Array.isArray(raw.perfiles) ? raw.perfiles : [])
    .map(parsePerfilSnapshot)
    .filter(Boolean);
  const adicionales = (Array.isArray(raw.adicionales) ? raw.adicionales : [])
    .map(parseExamenSnapshotRef)
    .filter(Boolean);
  if (!perfiles.length && !adicionales.length) return null;
  return {
    dni,
    nombre_completo,
    cargo: raw.cargo != null ? String(raw.cargo).trim() || null : null,
    area: raw.area != null ? String(raw.area).trim() || null : null,
    perfiles,
    adicionales,
  };
}

function combinarPrecioAgregado(prev, next) {
  const n = precioSnapshot(next);
  const p = precioSnapshot(prev);
  return n > 0 ? n : p;
}

/** JSON persistido en pedido_pacientes.examenes_snapshot_json */
function buildWizardPacienteSnapshotJson(pac) {
  return JSON.stringify({
    origen: 'nuevo_pedido_wizard',
    snapshot_at: new Date().toISOString(),
    perfiles: pac.perfiles.map((pr) => ({
      perfil_id: pr.perfil_id,
      perfil_nombre: pr.perfil_nombre,
      emo_tipo: pr.emo_tipo,
      examenes: pr.examenes.map((ex) => ({
        examen_id: ex.examen_id,
        nombre: ex.nombre,
        precio: ex.precio,
        origen: 'perfil',
      })),
    })),
    adicionales: pac.adicionales.map((ex) => ({
      examen_id: ex.examen_id,
      nombre: ex.nombre,
      precio: ex.precio,
      origen: 'adicional',
    })),
  });
}

/**
 * @param {Array<object>} pacientesRaw
 * @returns {{ empleados: object[], items: object[], pacientes: object[] } | null}
 */
function expandirSnapshotPacientesAPedido(pacientesRaw) {
  if (!Array.isArray(pacientesRaw) || pacientesRaw.length === 0) return null;

  const pacientes = pacientesRaw.map(parsePacienteSnapshot).filter(Boolean);
  if (!pacientes.length) return null;

  const perfilBuckets = new Map();
  const extraBucket = new Map();
  const empleados = [];

  for (const pac of pacientes) {
    const perfilesAplicados = pac.perfiles.map((pr) => ({
      emo_perfil_id: pr.perfil_id,
      perfil_nombre: pr.perfil_nombre,
      emo_tipo: pr.emo_tipo,
    }));
    const examenIds = new Set();

    for (const pr of pac.perfiles) {
      const bucketKey = clavePerfil(pr.perfil_id, pr.emo_tipo);
      let bucket = perfilBuckets.get(bucketKey);
      if (!bucket) {
        bucket = new Map();
        perfilBuckets.set(bucketKey, bucket);
      }
      for (const ex of pr.examenes) {
        examenIds.add(ex.examen_id);
        const prev = bucket.get(ex.examen_id);
        bucket.set(ex.examen_id, {
          cantidad: (prev?.cantidad ?? 0) + 1,
          nombre: ex.nombre,
          precio: combinarPrecioAgregado(prev?.precio, ex.precio),
          meta: {
            perfilId: pr.perfil_id,
            perfilNombre: pr.perfil_nombre,
            tipoEmo: pr.emo_tipo,
          },
        });
      }
    }

    for (const ex of pac.adicionales) {
      examenIds.add(ex.examen_id);
      const prev = extraBucket.get(ex.examen_id);
      extraBucket.set(ex.examen_id, {
        cantidad: (prev?.cantidad ?? 0) + 1,
        nombre: ex.nombre,
        precio: combinarPrecioAgregado(prev?.precio, ex.precio),
      });
    }

    empleados.push({
      dni: pac.dni,
      nombre_completo: pac.nombre_completo,
      cargo: pac.cargo,
      area: pac.area,
      examenes: [...examenIds],
      emo_tipo: pac.perfiles[0]?.emo_tipo ?? null,
      emo_perfil_id: pac.perfiles[0]?.perfil_id ?? null,
      perfiles_aplicados: perfilesAplicados,
      wizard_snapshot_json: buildWizardPacienteSnapshotJson(pac),
    });
  }

  const items = [];

  const perfilKeysOrdenados = [...perfilBuckets.keys()].sort((a, b) => {
    const na = perfilBuckets.get(a)?.values().next().value?.meta?.perfilNombre ?? a;
    const nb = perfilBuckets.get(b)?.values().next().value?.meta?.perfilNombre ?? b;
    return String(na).localeCompare(String(nb), 'es');
  });

  for (const bucketKey of perfilKeysOrdenados) {
    const bucket = perfilBuckets.get(bucketKey);
    if (!bucket) continue;
    for (const exId of [...bucket.keys()].sort((a, b) => a - b)) {
      const { cantidad, meta, nombre, precio } = bucket.get(exId);
      const snap = {
        origen: 'examen_de_perfil',
        snapshot_at: new Date().toISOString(),
        perfil_id: meta.perfilId,
        perfil_nombre: meta.perfilNombre,
        tipo_emo: meta.tipoEmo,
        examen_id: exId,
        nombre_catalogo: nombre,
        precio_cliente: precio,
        precio_catalogo: precio,
      };
      items.push({
        tipo_item: 'EXAMEN',
        examen_id: exId,
        nombre,
        cantidad,
        precio_base: precio,
        precio_final: precio,
        perfil_origen_id: meta.perfilId,
        perfil_origen_nombre: meta.perfilNombre,
        perfil_origen_tipo_emo: meta.tipoEmo,
        examenes_snapshot_json: snap,
      });
    }
  }

  for (const exId of [...extraBucket.keys()].sort((a, b) => a - b)) {
    const { cantidad, nombre, precio } = extraBucket.get(exId);
    const snap = {
      origen: 'pedido_examen',
      snapshot_at: new Date().toISOString(),
      examen_id: exId,
      nombre_catalogo: nombre,
      precio_cliente: precio,
      precio_catalogo: precio,
    };
    items.push({
      tipo_item: 'EXAMEN',
      examen_id: exId,
      nombre,
      cantidad,
      precio_base: precio,
      precio_final: precio,
      examenes_snapshot_json: snap,
    });
  }

  return { empleados, items, pacientes };
}

/**
 * Persiste el snapshot wizard (con precios) en pedido_pacientes y actualiza ítems EXAMEN del pedido.
 * @returns {{ ok: true, empleados: number, items: number } | { ok: false, error: string }}
 */
async function sincronizarPedidoWizardSnapshot(dbConn, pedidoId, pacientesRaw) {
  const expanded = expandirSnapshotPacientesAPedido(pacientesRaw);
  if (!expanded) return { ok: false, error: 'pacientes inválidos' };

  for (const emp of expanded.empleados) {
    const [rows] = await dbConn.execute(
      'SELECT id FROM pedido_pacientes WHERE pedido_id = ? AND dni = ?',
      [pedidoId, emp.dni]
    );
    if (!rows.length) continue;
    await dbConn.execute(
      'UPDATE pedido_pacientes SET examenes_snapshot_json = ? WHERE id = ?',
      [emp.wizard_snapshot_json, rows[0].id]
    );
  }

  for (const item of expanded.items) {
    const snapJson =
      item.examenes_snapshot_json != null
        ? typeof item.examenes_snapshot_json === 'string'
          ? item.examenes_snapshot_json
          : JSON.stringify(item.examenes_snapshot_json)
        : null;
    const [existing] = await dbConn.execute(
      `SELECT id FROM pedido_items WHERE pedido_id = ? AND tipo_item = 'EXAMEN' AND examen_id = ? LIMIT 1`,
      [pedidoId, item.examen_id]
    );
    if (!existing.length) continue;
    const precioBase = Number(item.precio_final ?? item.precio_base ?? 0) || 0;
    await dbConn.execute(
      `UPDATE pedido_items SET
         cantidad = ?,
         precio_base = ?,
         perfil_origen_id = ?,
         perfil_origen_tipo_emo = ?,
         perfil_origen_nombre = ?,
         examenes_snapshot_json = COALESCE(?, examenes_snapshot_json)
       WHERE id = ?`,
      [
        item.cantidad,
        precioBase,
        item.perfil_origen_id ?? null,
        item.perfil_origen_tipo_emo ?? null,
        item.perfil_origen_nombre ?? null,
        snapJson,
        existing[0].id,
      ]
    );
  }

  if (expanded.empleados.length > 0) {
    await dbConn.execute('UPDATE pedidos SET total_empleados = ? WHERE id = ?', [
      expanded.empleados.length,
      pedidoId,
    ]);
  }

  return { ok: true, empleados: expanded.empleados.length, items: expanded.items.length };
}

module.exports = {
  TIPOS_EMO_VALIDOS,
  precioSnapshot,
  parsePacienteSnapshot,
  expandirSnapshotPacientesAPedido,
  buildWizardPacienteSnapshotJson,
  sincronizarPedidoWizardSnapshot,
};
