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

function clavePerfil(perfilId, emoTipo, condicionesFirma) {
  return `${perfilId}:${emoTipo}:${condicionesFirma || ''}`;
}

function claveItemPedido(examenId, perfilOrigenId, perfilOrigenTipoEmo, condicionesFirma) {
  return `${examenId}|${perfilOrigenId ?? 0}|${perfilOrigenTipoEmo ?? ''}|${condicionesFirma || ''}`;
}

function normalizarCondicionesSnap(raw) {
  if (!raw || typeof raw !== 'object') return { codigos: [], nota: null };
  const codigos = Array.isArray(raw.codigos)
    ? [
        ...new Set(
          raw.codigos
            .map((c) => String(c || '').trim().toUpperCase())
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b))
    : [];
  const notaRaw = raw.nota != null ? String(raw.nota).trim() : '';
  return { codigos, nota: notaRaw ? notaRaw.slice(0, 240) : null };
}

function firmaCondicionesSnap(codigos) {
  return Array.isArray(codigos)
    ? [
        ...new Set(
          codigos.map((c) => String(c || '').trim().toUpperCase()).filter(Boolean)
        ),
      ]
        .sort((a, b) => a.localeCompare(b))
        .join(',')
    : '';
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
  const condiciones = normalizarCondicionesSnap(raw.condiciones);
  return {
    perfil_id,
    perfil_nombre: String(raw.perfil_nombre ?? `Perfil ${perfil_id}`).trim(),
    emo_tipo,
    examenes,
    condiciones,
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
  condiciones,
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
    const cond = normalizarCondicionesSnap(condiciones);
    snap.condiciones = cond;
    snap.condiciones_firma = firmaCondicionesSnap(cond.codigos);
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
      condiciones: pr.condiciones || { codigos: [], nota: null },
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
      condiciones: pr.condiciones || { codigos: [], nota: null },
    }));
    const examenIds = new Set();

    for (const pr of pac.perfiles) {
      const firma = firmaCondicionesSnap(pr.condiciones?.codigos);
      const bucketKey = clavePerfil(pr.perfil_id, pr.emo_tipo, firma);
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
            condiciones: pr.condiciones || { codigos: [], nota: null },
            condicionesFirma: firma,
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
        condiciones: meta.condiciones,
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
        condiciones: meta.condiciones,
        condiciones_firma: meta.condicionesFirma || '',
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
            examenes_snapshot_json, nombre, condiciones_firma
     FROM pedido_items
     WHERE pedido_id = ? AND tipo_item = 'EXAMEN'`,
    [pedidoId]
  );

  const existingByKey = new Map();
  for (const row of existingRows) {
    existingByKey.set(
      claveItemPedido(
        row.examen_id,
        row.perfil_origen_id,
        row.perfil_origen_tipo_emo,
        row.condiciones_firma || ''
      ),
      row
    );
  }

  let itemsActualizados = 0;

  for (const item of expanded.items) {
    const precioCliente = precioSnapshot(item.precio_cliente ?? item.precio_final ?? 0);
    const key = claveItemPedido(
      item.examen_id,
      item.perfil_origen_id ?? null,
      item.perfil_origen_tipo_emo ?? null,
      item.condiciones_firma || ''
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
      condiciones: item.condiciones,
    });
    const snapJson = JSON.stringify(snapObj);

    if (match) {
      await dbConn.execute(
        'UPDATE pedido_items SET cantidad = ?, examenes_snapshot_json = ?, condiciones_firma = ? WHERE id = ?',
        [item.cantidad, snapJson, item.condiciones_firma || '', match.id]
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
         perfil_origen_id, perfil_origen_tipo_emo, perfil_origen_nombre, examenes_snapshot_json,
         condiciones_firma
       ) VALUES (?, 'EXAMEN', NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        item.condiciones_firma || '',
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

/**
 * Si el paciente tiene snapshot wizard (`origen: nuevo_pedido_wizard`), lo actualiza
 * en sitio al asignar un perfil. Devuelve true si se pudo conservar el wizard;
 * false si hay que caer al snapshot plano.
 */
function mergePerfilEnWizardPacienteSnapshotJson(rawJson, opts = {}) {
  let snap = null;
  try {
    snap = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch {
    return null;
  }
  if (!snap || typeof snap !== 'object' || snap.origen !== 'nuevo_pedido_wizard') {
    return null;
  }

  const perfilId = Number(opts.perfilId);
  const tipoEmo = String(opts.tipoEmo || '').toUpperCase();
  if (!Number.isFinite(perfilId) || perfilId <= 0 || !TIPOS_EMO_VALIDOS.has(tipoEmo)) {
    return null;
  }

  const examenesIn = Array.isArray(opts.examenes) ? opts.examenes : [];
  const examenesNorm = examenesIn
    .map((e) => {
      const examen_id = Number(e.examen_id ?? e.id);
      if (!Number.isFinite(examen_id) || examen_id <= 0) return null;
      return {
        examen_id,
        nombre: String(e.nombre || `Examen ${examen_id}`).trim(),
        precio: precioSnapshot(e.precio),
        origen: 'perfil',
      };
    })
    .filter(Boolean);

  const condiciones = normalizarCondicionesSnap(opts.condiciones);
  const firma = firmaCondicionesSnap(condiciones.codigos);
  const keyNueva = clavePerfil(perfilId, tipoEmo, firma);

  const perfiles = Array.isArray(snap.perfiles) ? [...snap.perfiles] : [];
  let adicionales = Array.isArray(snap.adicionales) ? [...snap.adicionales] : [];
  const idsPerfil = new Set(examenesNorm.map((e) => e.examen_id));
  adicionales = adicionales.filter((a) => !idsPerfil.has(Number(a.examen_id)));

  const idx = perfiles.findIndex((pr) => {
    const f = firmaCondicionesSnap(
      normalizarCondicionesSnap(pr.condiciones).codigos
    );
    return clavePerfil(pr.perfil_id, pr.emo_tipo, f) === keyNueva;
  });
  if (idx >= 0) {
    const prev = perfiles[idx];
    const prevEx = Array.isArray(prev.examenes) ? [...prev.examenes] : [];
    const idsYa = new Set(prevEx.map((e) => Number(e.examen_id)));
    for (const ex of examenesNorm) {
      if (idsYa.has(ex.examen_id)) continue;
      prevEx.push(ex);
      idsYa.add(ex.examen_id);
    }
    perfiles[idx] = {
      ...prev,
      perfil_nombre: opts.perfilNombre || prev.perfil_nombre,
      condiciones,
      examenes: prevEx,
    };
  } else {
    perfiles.push({
      perfil_id: perfilId,
      perfil_nombre: opts.perfilNombre || `Perfil ${perfilId}`,
      emo_tipo: tipoEmo,
      condiciones,
      examenes: examenesNorm,
    });
  }

  return JSON.stringify({
    ...snap,
    origen: 'nuevo_pedido_wizard',
    snapshot_at: new Date().toISOString(),
    perfiles,
    adicionales,
  });
}

/**
 * Tras asignar perfil: conserva wizard snapshot si existe; si no, snapshot plano.
 */
async function persistirSnapshotTrasAsignarPerfil(dbConn, pacienteId, opts = {}) {
  if (!pacienteId) return;
  const tag = opts.tag || 'asignar-perfil';
  try {
    const [rows] = await dbConn.execute(
      'SELECT examenes_snapshot_json FROM pedido_pacientes WHERE id = ?',
      [pacienteId]
    );
    const raw = rows[0]?.examenes_snapshot_json;
    const merged = mergePerfilEnWizardPacienteSnapshotJson(raw, {
      perfilId: opts.perfilId,
      tipoEmo: opts.tipoEmo,
      perfilNombre: opts.perfilNombre,
      examenes: opts.examenes,
    });
    if (merged) {
      await dbConn.execute(
        'UPDATE pedido_pacientes SET examenes_snapshot_json = ? WHERE id = ?',
        [merged, pacienteId]
      );
      return;
    }
  } catch (e) {
    console.warn(`[${tag}] merge wizard snapshot falló:`, e?.message || e);
  }
  const { persistirSnapshotPaciente } = require('./perfilSnapshot');
  await persistirSnapshotPaciente(dbConn, pacienteId, {
    perfilId: opts.perfilId,
    tipoEmo: opts.tipoEmo,
    tag,
  });
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
  mergePerfilEnWizardPacienteSnapshotJson,
  persistirSnapshotTrasAsignarPerfil,
};
