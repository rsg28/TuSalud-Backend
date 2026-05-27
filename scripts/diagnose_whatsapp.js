'use strict';

/**
 * Diagnóstico rápido del flujo WhatsApp.
 *
 * Uso:
 *   cd ~/app/TuSalud-Backend
 *   node scripts/diagnose_whatsapp.js
 *
 * Lee credenciales desde .env (mismo formato que el backend) y consulta MySQL
 * para identificar por qué un envío no se disparó.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const SEP = '────────────────────────────────────────────────────────────';

function fmt(v) {
  if (v == null) return '—';
  if (v instanceof Date) return v.toISOString().replace('T', ' ').slice(0, 19);
  return String(v);
}

function mask(s) {
  if (!s) return '(no seteado)';
  const str = String(s);
  if (str.length <= 6) return '*'.repeat(str.length);
  return str.slice(0, 3) + '...' + str.slice(-3);
}

async function main() {
  console.log(SEP);
  console.log('  DIAGNÓSTICO WhatsApp — TuSalud');
  console.log(SEP);

  console.log('\n[1] Variables de entorno relevantes:');
  console.log(`    WHATSAPP_PROVIDER             = ${process.env.WHATSAPP_PROVIDER || '(vacío)'}`);
  console.log(`    WHATSAPP_PUBLIC_BASE_URL      = ${process.env.WHATSAPP_PUBLIC_BASE_URL || '(vacío)'}`);
  console.log(`    WHATSAPP_MANAGER_FALLBACK_PHONE = ${process.env.WHATSAPP_MANAGER_FALLBACK_PHONE || '(vacío)'}`);
  console.log(`    TWILIO_ACCOUNT_SID            = ${mask(process.env.TWILIO_ACCOUNT_SID)}`);
  console.log(`    TWILIO_AUTH_TOKEN             = ${mask(process.env.TWILIO_AUTH_TOKEN)}`);
  console.log(`    TWILIO_WHATSAPP_FROM          = ${process.env.TWILIO_WHATSAPP_FROM || '(vacío)'}`);
  console.log(`    TWILIO_SMS_FROM               = ${process.env.TWILIO_SMS_FROM || '(vacío)'}`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log(`\n[2] Conectado a ${process.env.DB_HOST} (${process.env.DB_NAME})`);

  // Últimos 5 pedidos
  console.log('\n[3] Últimos 5 pedidos:');
  const [pedidos] = await conn.execute(`
    SELECT id, numero_pedido, estado, vendedor_id, cliente_usuario_id,
           created_at
      FROM pedidos
     ORDER BY id DESC
     LIMIT 5
  `);
  if (pedidos.length === 0) {
    console.log('    (sin pedidos)');
  } else {
    for (const p of pedidos) {
      console.log(
        `    #${p.id} ${p.numero_pedido} estado=${p.estado} vendedor_id=${fmt(p.vendedor_id)} ` +
        `cliente_id=${fmt(p.cliente_usuario_id)} ${fmt(p.created_at)}`
      );
    }
  }

  // Últimas 5 cotizaciones
  console.log('\n[4] Últimas 5 cotizaciones:');
  const [cots] = await conn.execute(`
    SELECT id, numero_cotizacion, pedido_id, estado, creador_tipo, creador_id,
           total, created_at, fecha_envio
      FROM cotizaciones
     ORDER BY id DESC
     LIMIT 5
  `);
  if (cots.length === 0) {
    console.log('    (sin cotizaciones)');
  } else {
    for (const c of cots) {
      const trigger = c.estado === 'ENVIADA' && c.creador_tipo === 'CLIENTE' ? ' ← DEBERÍA disparar WhatsApp' : '';
      console.log(
        `    #${c.id} ${c.numero_cotizacion} pedido=${c.pedido_id} estado=${c.estado} ` +
        `creador=${c.creador_tipo}/${fmt(c.creador_id)} total=S/${fmt(c.total)} ` +
        `creada=${fmt(c.created_at)} enviada=${fmt(c.fecha_envio)}${trigger}`
      );
    }
  }

  // Últimas 5 filas de whatsapp_aprobaciones
  console.log('\n[5] Últimas 5 filas de whatsapp_aprobaciones:');
  let waRows = [];
  try {
    const [rows] = await conn.execute(`
      SELECT id, cotizacion_id, destinatario_telefono, destinatario_rol, estado,
             canal_envio, estado_entrega_whatsapp, mensaje_enviado_sid,
             enviado_at, respondido_at
        FROM whatsapp_aprobaciones
       ORDER BY id DESC
       LIMIT 5
    `);
    waRows = rows;
  } catch (e) {
    console.log(`    ERROR consultando tabla: ${e.message}`);
  }
  if (waRows.length === 0) {
    console.log('    (sin filas — significa que NUNCA se llamó a enviarCotizacionAprobacion)');
  } else {
    for (const w of waRows) {
      console.log(
        `    #${w.id} cot=${w.cotizacion_id} tel=${w.destinatario_telefono} (${w.destinatario_rol}) ` +
        `estado=${w.estado} canal=${w.canal_envio} entrega=${fmt(w.estado_entrega_whatsapp)} ` +
        `sid=${fmt(w.mensaje_enviado_sid)} enviado=${fmt(w.enviado_at)}`
      );
    }
  }

  // Usuarios manager/vendedor activos con teléfono
  console.log('\n[6] Manager/vendedor activos con teléfono:');
  const [usuarios] = await conn.execute(`
    SELECT id, nombre_completo, rol, telefono, activo
      FROM usuarios
     WHERE rol IN ('manager','vendedor') AND activo = 1
     ORDER BY (rol='manager') DESC, id ASC
  `);
  if (usuarios.length === 0) {
    console.log('    ⚠ NINGÚN manager/vendedor activo en BD.');
  } else {
    let conTel = 0;
    for (const u of usuarios) {
      const tel = u.telefono && String(u.telefono).trim();
      if (tel) conTel++;
      console.log(`    #${u.id} ${u.rol} ${u.nombre_completo} tel=${tel || '(sin teléfono)'}`);
    }
    if (conTel === 0) {
      console.log('    ⚠ NINGUNO tiene teléfono. WhatsApp se omitirá salvo que WHATSAPP_MANAGER_FALLBACK_PHONE esté seteado.');
    }
  }

  // Cotización más reciente: detalle del intento
  if (cots.length > 0) {
    const ultima = cots[0];
    console.log(`\n[7] Análisis de la cotización más reciente (#${ultima.id}):`);
    const reasons = [];
    if (ultima.estado !== 'ENVIADA') reasons.push(`estado=${ultima.estado} (debe ser ENVIADA)`);
    if (ultima.creador_tipo !== 'CLIENTE') reasons.push(`creador_tipo=${ultima.creador_tipo} (debe ser CLIENTE)`);
    if (reasons.length === 0) {
      console.log('    ✓ Cumple condiciones para disparar WhatsApp.');
      // Hay fila en whatsapp_aprobaciones?
      const [filas] = await conn.execute(
        'SELECT id, estado, canal_envio FROM whatsapp_aprobaciones WHERE cotizacion_id = ? ORDER BY id DESC',
        [ultima.id]
      );
      if (filas.length === 0) {
        console.log('    ⚠ NO hay fila en whatsapp_aprobaciones para esta cotización.');
        console.log('      Posibles causas:');
        console.log('        - Backend desactualizado (no se reinició con --update-env).');
        console.log('        - El PATCH de estado falló (revisar logs PM2).');
        console.log('        - resolverDestinatario no encontró teléfono ni fallback.');
      } else {
        console.log(`    ✓ ${filas.length} fila(s) en whatsapp_aprobaciones: ${filas.map((f) => `#${f.id}/${f.estado}/${f.canal_envio}`).join(', ')}`);
      }
    } else {
      console.log('    ✗ NO cumple condiciones:');
      for (const r of reasons) console.log(`      - ${r}`);
    }
  }

  await conn.end();
  console.log('\n' + SEP);
  console.log('  Listo.');
  console.log(SEP + '\n');
}

main().catch((err) => {
  console.error('\nError:', err.message);
  console.error(err.stack);
  process.exit(1);
});
