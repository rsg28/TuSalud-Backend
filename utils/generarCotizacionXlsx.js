'use strict';

/**
 * Genera un XLSX con el detalle de una cotización para enviarlo por WhatsApp.
 *
 * Devuelve { buffer, filename } listos para servir como descarga pública o
 * adjuntar a un mensaje de WhatsApp (Twilio lo descarga vía URL).
 *
 * El layout es deliberadamente simple porque el vendedor lo abre en el celular:
 *   Encabezado:
 *     - Cotización Nº COT-XXXX
 *     - Empresa, Pedido, Fecha
 *     - Total final
 *   Tabla:
 *     - # | Tipo | Nombre | Tipo EMO | Cantidad | Precio base | Variación % | P. unitario | Importe línea
 *   «Importe línea» = cantidad × precio unitario (no es duplicado del unitario si cantidad > 1).
 *
 * No depende de Express ni de la request: recibe `pool` y `cotizacionId` y
 * devuelve un buffer. Eso lo vuelve trivialmente testeable.
 */

const ExcelJS = require('exceljs');
const pool = require('../config/database');

function fmtMoneda(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return v.toFixed(2);
}

function fmtFecha(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * @param {number} cotizacionId
 * @returns {Promise<{buffer: Buffer, filename: string, resumen: {numero: string, empresa: string, total: number, nItems: number, pedidoNumero: string}}>}
 */
async function generarXlsxCotizacion(cotizacionId) {
  const [cotRows] = await pool.execute(
    `SELECT c.id, c.numero_cotizacion, c.pedido_id, c.total, c.fecha_envio, c.created_at,
            c.estado, c.creador_tipo,
            p.numero_pedido, p.empresa_id,
            e.razon_social AS empresa_nombre
       FROM cotizaciones c
       INNER JOIN pedidos p ON p.id = c.pedido_id
       LEFT JOIN empresas e ON e.id = p.empresa_id
      WHERE c.id = ?`,
    [cotizacionId]
  );
  if (cotRows.length === 0) {
    throw new Error(`Cotización ${cotizacionId} no encontrada`);
  }
  const cot = cotRows[0];

  const [items] = await pool.execute(
    `SELECT ci.id, ci.tipo_item, ci.tipo_emo, ci.nombre, ci.cantidad,
            ci.precio_base, ci.precio_final, ci.variacion_pct, ci.subtotal,
            ex.nombre AS examen_nombre, pf.nombre AS perfil_nombre
       FROM cotizacion_items ci
       LEFT JOIN examenes ex ON ex.id = ci.examen_id
       LEFT JOIN emo_perfiles pf ON pf.id = ci.perfil_id
      WHERE ci.cotizacion_id = ?
      ORDER BY ci.id`,
    [cotizacionId]
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TuSalud';
  workbook.created = new Date();
  const ws = workbook.addWorksheet('Cotización', {
    views: [{ state: 'frozen', ySplit: 7 }],
  });

  ws.columns = [
    { key: 'idx', width: 5 },
    { key: 'tipo', width: 10 },
    { key: 'nombre', width: 48 },
    { key: 'tipo_emo', width: 10 },
    { key: 'cantidad', width: 10 },
    { key: 'precio_base', width: 14 },
    { key: 'variacion', width: 12 },
    { key: 'precio_final', width: 14 },
    { key: 'subtotal', width: 14 },
  ];

  ws.mergeCells('A1:I1');
  ws.getCell('A1').value = `Cotización ${cot.numero_cotizacion || `#${cot.id}`}`;
  ws.getCell('A1').font = { size: 16, bold: true };
  ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };

  const empresaNombre = cot.empresa_nombre || '';
  ws.getCell('A2').value = 'Empresa:';
  ws.getCell('B2').value = empresaNombre;
  ws.getCell('A2').font = { bold: true };

  ws.getCell('A3').value = 'Pedido:';
  ws.getCell('B3').value = cot.numero_pedido || `PED-${cot.pedido_id}`;
  ws.getCell('A3').font = { bold: true };

  ws.getCell('A4').value = 'Fecha:';
  ws.getCell('B4').value = fmtFecha(cot.fecha_envio || cot.created_at);
  ws.getCell('A4').font = { bold: true };

  ws.getCell('A5').value = 'Total:';
  ws.getCell('B5').value = `S/ ${fmtMoneda(cot.total)}`;
  ws.getCell('A5').font = { bold: true };
  ws.getCell('B5').font = { bold: true, color: { argb: 'FF1B5E20' } };

  ws.getRow(7).values = [
    '#', 'Tipo', 'Nombre', 'Tipo EMO', 'Cantidad',
    'Precio base', 'Variación %', 'P. unitario', 'Importe línea',
  ];
  ws.getRow(7).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(7).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(7).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D32' },
    };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF1B5E20' } } };
  });

  items.forEach((it, i) => {
    const nombre =
      it.tipo_item === 'PERFIL'
        ? it.perfil_nombre || it.nombre || `Perfil #${it.id}`
        : it.examen_nombre || it.nombre || `Examen #${it.id}`;
    const row = ws.addRow({
      idx: i + 1,
      tipo: it.tipo_item || 'EXAMEN',
      nombre,
      tipo_emo: it.tipo_emo || '',
      cantidad: Number(it.cantidad) || 0,
      precio_base: Number(it.precio_base) || 0,
      variacion: it.variacion_pct == null ? '' : Number(it.variacion_pct),
      precio_final: Number(it.precio_final) || 0,
      subtotal: Number(it.subtotal) || 0,
    });
    row.getCell('precio_base').numFmt = '#,##0.00';
    row.getCell('precio_final').numFmt = '#,##0.00';
    row.getCell('subtotal').numFmt = '#,##0.00';
    row.getCell('variacion').numFmt = '0.00"%"';
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F8E9' },
        };
      });
    }
  });

  // Fila total al final.
  const totalRowIdx = ws.rowCount + 2;
  ws.mergeCells(`A${totalRowIdx}:H${totalRowIdx}`);
  ws.getCell(`A${totalRowIdx}`).value = 'TOTAL';
  ws.getCell(`A${totalRowIdx}`).alignment = { horizontal: 'right' };
  ws.getCell(`A${totalRowIdx}`).font = { bold: true, size: 12 };
  ws.getCell(`I${totalRowIdx}`).value = Number(cot.total) || 0;
  ws.getCell(`I${totalRowIdx}`).numFmt = '#,##0.00';
  ws.getCell(`I${totalRowIdx}`).font = { bold: true, size: 12 };

  const buffer = await workbook.xlsx.writeBuffer();
  const safeNumero = String(cot.numero_cotizacion || `COT-${cot.id}`).replace(/[^A-Za-z0-9_\-]/g, '_');
  const filename = `${safeNumero}.xlsx`;

  return {
    buffer: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer),
    filename,
    resumen: {
      numero: cot.numero_cotizacion || `COT-${cot.id}`,
      empresa: empresaNombre,
      pedidoNumero: cot.numero_pedido || `PED-${cot.pedido_id}`,
      total: Number(cot.total) || 0,
      nItems: items.length,
    },
  };
}

module.exports = { generarXlsxCotizacion };
