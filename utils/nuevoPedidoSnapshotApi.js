/**
 * Expande el snapshot del wizard «nuevo pedido» (pacientes → perfiles + adicionales)
 * al payload interno de POST /api/pedidos (empleados + ítems agregados).
 *
 * Regla de precios:
 *   - `precio` en el snapshot del wizard = precio superficial propuesto por el cliente.
 *   - `pedido_items.precio_base` = precio de catálogo (no se pisa con el del cliente).
 *   - `examenes_snapshot_json.precio_cliente` = precio superficial del cliente.
 *   - `examenes_snapshot_json.precio_catalogo` = precio de catálogo congelado.
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

function claveItemPedido(examenId, perfilOrigenId, perfilOrigenTipoEmo) {
  return `${examenId}|${perfilOrigenId ?? 0}|${perfilOrigenTipoEmo ?? ''}`;
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
  const emo_tipo = String(raw.emo_tipo ?? '').toUpperCase();
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

function parseSnapObj(raw) {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? { ...raw } : {};
}

/** Arma snapshot JSON de ítem EXAMEN con precio superficial del cliente y catálogo separados. */
function buildSnapItemPedido({
  origen,
  examenId,
  nombre,
  precioCliente,
  precioCatalogo,
  perfilId,
  perfilNombre,
  tipoEmo,
}) {
  const snap = {
    origen,
    snapshot_at: new Date().toISOString(),
    examen_id: examenId,
    nombre_catalogo: nombre,
    precio_catalogo: precioSnapshot(precioCatalogo),
  };
  const pc = precioSnapshot(precioCliente);
  if (pc > 0 || origen === 'pedido_examen' || origen === 'examen_de_perfil') {
    snap.precio_cliente = pc;
  }
  if (origen === 'examen_de_perfil') {
    snap.perfil_id = perfilId;
    snap.perfil_nombre = perfilNombre;
    snap.tipo_emo = tipoEmo;
  }
  return snap;
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
          precioCliente: combinarPrecioAgregado(prev?.precioCliente, ex.precio),
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
        precioCliente: combinarPrecioAgregado(prev?.precioCliente, ex.precio),
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
      const { cantidad, meta, nombre, precioCliente } = bucket.get(exId);
      const snap = buildSnapItemPedido({
        origen: 'examen_de_perfil',
        examenId: exId,
        nombre,
        precioCliente,
        precioCatalogo: 0,
        perfilId: meta.perfilId,
        perfilNombre: meta.perfilNombre,
        tipoEmo: meta.tipoEmo,
      });
      items.push({
        tipo_item: 'EXAMEN',
        examen_id: exId,
        nombre,
        cantidad,
        precio_base: 0,
        precio_cliente: precioCliente,
        perfil_origen_id: meta.perfilId,
        perfil_origen_nombre: meta.perfilNombre,
        perfil_origen_tipo_emo: meta.tipoEmo,
        examenes_snapshot_json: snap,
      });
    }
  }

  for (const exId of [...extraBucket.keys()].sort((a, b) => a - b)) {
    const { cantidad, nombre, precioCliente } = extraBucket.get(exId);
    const snap = buildSnapItemPedido({
      origen: 'pedido_examen',
      examenId: exId,
      nombre,
      precioCliente,
      precioCatalogo: 0,
    });
    items.push({
      tipo_item: 'EXAMEN',
      examen_id: exId,
      nombre,
      cantidad,
      precio_base: 0,
      precio_cliente: precioCliente,
      examenes_snapshot_json: snap,
    });
  }

  return { empleados, items, pacientes };
}

/**
 * Persiste snapshot wizard en pacientes e ítems del pedido.
 * @param {object} [opts]
 * @param {(examenId: number) => Promise<number>} [opts.fetchCatalogPrice]
 */
async function sincronizarPedidoWizardSnapshot(dbConn, pedidoId, pacientesRaw, opts = {}) {
  const { fetchCatalogPrice } = opts;
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

  const [existingRows] = await dbConn.execute(
    `SELECT id, examen_id, cantidad, precio_base,
            perfil_origen_id, perfil_origen_tipo_emo, perfil_origen_nombre,
            examenes_snapshot_json, nombre
     FROM pedido_items
     WHERE pedido_id = ? AND tipo_item = 'EXAMEN'`,
    [pedidoId]
  );

  const existingByKey = new Map();
  for (const row of existingRows) {
    existingByKey.set(
      claveItemPedido(row.examen_id, row.perfil_origen_id, row.perfil_origen_tipo_emo),
      row
    );
  }

  let itemsActualizados = 0;

  for (const item of expanded.items) {
    const precioCliente = precioSnapshot(item.precio_cliente ?? item.precio_final ?? 0);
    const key = claveItemPedido(
      item.examen_id,
      item.perfil_origen_id ?? null,
      item.perfil_origen_tipo_emo ?? null
    );
    let match = existingByKey.get(key);
    if (!match && item.perfil_origen_id == null) {
      match = existingRows.find((r) => Number(r.examen_id) === Number(item.examen_id)) ?? null;
    }

    let precioCatalogo = match ? Number(match.precio_base) || 0 : 0;
    if (!precioCatalogo && typeof fetchCatalogPrice === 'function') {
      precioCatalogo = precioSnapshot(await fetchCatalogPrice(item.examen_id));
    }

    const snapObj = buildSnapItemPedido({
      origen: item.perfil_origen_id ? 'examen_de_perfil' : 'pedido_examen',
      examenId: item.examen_id,
      nombre: item.nombre,
      precioCliente,
      precioCatalogo,
      perfilId: item.perfil_origen_id ?? undefined,
      perfilNombre: item.perfil_origen_nombre ?? undefined,
      tipoEmo: item.perfil_origen_tipo_emo ?? undefined,
    });
    const snapJson = JSON.stringify(snapObj);

    if (match) {
      await dbConn.execute(
        'UPDATE pedido_items SET cantidad = ?, examenes_snapshot_json = ? WHERE id = ?',
        [item.cantidad, snapJson, match.id]
      );
      itemsActualizados += 1;
      continue;
    }

    if (typeof fetchCatalogPrice !== 'function') continue;

    if (!precioCatalogo) {
      precioCatalogo = precioSnapshot(await fetchCatalogPrice(item.examen_id));
    }

    await dbConn.execute(
      `INSERT INTO pedido_items (
         pedido_id, tipo_item, perfil_id, tipo_emo, examen_id, nombre, cantidad, precio_base,
         perfil_origen_id, perfil_origen_tipo_emo, perfil_origen_nombre, examenes_snapshot_json
       ) VALUES (?, 'EXAMEN', NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pedidoId,
        item.examen_id,
        item.nombre,
        item.cantidad,
        precioCatalogo,
        item.perfil_origen_id ?? null,
        item.perfil_origen_tipo_emo ?? null,
        item.perfil_origen_nombre ?? null,
        snapJson,
      ]
    );
    itemsActualizados += 1;
  }

  if (expanded.empleados.length > 0) {
    await dbConn.execute('UPDATE pedidos SET total_empleados = ? WHERE id = ?', [
      expanded.empleados.length,
      pedidoId,
    ]);
  }

  return {
    ok: true,
    empleados: expanded.empleados.length,
    items: expanded.items.length,
    items_actualizados: itemsActualizados,
  };
}

/** Precio superficial propuesto por el cliente en un ítem expandido del wizard. */
function precioClienteDesdeItemRaw(raw) {
  const directo = precioSnapshot(raw.precio_cliente ?? raw.precio_final ?? raw.precio);
  if (directo > 0) return directo;
  const snap = parseSnapObj(raw.examenes_snapshot_json);
  return precioSnapshot(snap.precio_cliente);
}

module.exports = {
  TIPOS_EMO_VALIDOS,
  precioSnapshot,
  parsePacienteSnapshot,
  expandirSnapshotPacientesAPedido,
  buildWizardPacienteSnapshotJson,
  sincronizarPedidoWizardSnapshot,
  precioClienteDesdeItemRaw,
  buildSnapItemPedido,
};
