const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

const ROW_Y_TOL = 4;
const INLINE_MERGE_GAP = 2;
const LEFT_COLS = 3;
const RIGHT_CENTER_CLUSTER_GAP = 15;
const MIN_RIGHT_CLUSTER_HITS = 3;
const EDGE_CLUSTER_GAP = 1.5;
const EDGE_MIN_HITS_X = 10;
const EDGE_MIN_HITS_Y = 3;

function normalizeCell(s) {
  return String(s || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
}

function foldForCompare(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function isExamenesGeneralesLabel(text) {
  const f = foldForCompare(text);
  return f === 'EXAMENES GENERALES' || f.startsWith('EXAMENES GENERALES ');
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function trimTrailingEmptyRows(matrix) {
  const out = matrix.slice();
  while (out.length && out[out.length - 1].every((c) => !normalizeCell(c))) out.pop();
  return out;
}

function removeCompletelyEmptyRows(matrix) {
  return matrix.filter((row) => row.some((c) => normalizeCell(c)));
}

function cluster1D(values, gap) {
  const s = [...values].sort((a, b) => a - b);
  const groups = [];
  for (const v of s) {
    const g = groups[groups.length - 1];
    if (!g || v - g[g.length - 1] > gap) groups.push([v]);
    else g.push(v);
  }
  return groups.map((g) => ({ center: g.reduce((a, b) => a + b, 0) / g.length, size: g.length }));
}

function nearestCenter(x, centers) {
  let idx = 0;
  let dist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < centers.length; i++) {
    const d = Math.abs(x - centers[i]);
    if (d < dist) {
      dist = d;
      idx = i;
    }
  }
  return { idx, dist };
}

function parseItems(textContent) {
  return (textContent.items || [])
    .filter((it) => it.str && String(it.str).trim() !== '')
    .map((it) => {
      const m = it.transform || [];
      const x = m[4] || 0;
      const y = m[5] || 0;
      const w = typeof it.width === 'number' ? it.width : Math.abs(m[0] || 0) * String(it.str).length * 0.5 || 5;
      const h = typeof it.height === 'number' && it.height > 0 ? it.height : Math.max(5, Math.abs(m[3] || 0));
      const str = String(it.str);
      return { str, x, y, w, h, x2: x + w, xmid: x + w / 2 };
    });
}

function bucketRows(items) {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > ROW_Y_TOL) return b.y - a.y;
    return a.x - b.x;
  });
  const buckets = [];
  for (const it of sorted) {
    let placed = false;
    for (const row of buckets) {
      if (Math.abs(it.y - row.y) <= ROW_Y_TOL) {
        row.items.push(it);
        row.sumY += it.y;
        row.count += 1;
        row.y = row.sumY / row.count;
        placed = true;
        break;
      }
    }
    if (!placed) buckets.push({ y: it.y, sumY: it.y, count: 1, items: [it] });
  }
  for (const r of buckets) r.items.sort((a, b) => a.x - b.x);
  buckets.sort((a, b) => b.y - a.y);
  return buckets;
}

function inferRightCenters(items) {
  const candidates = [];
  for (const it of items) {
    const t = normalizeCell(it.str);
    if (!t) continue;
    const isMark = /^[xX]$/.test(t);
    const isMoney = /^S\/\s*\d/i.test(t);
    const shortNoSpace = t.length <= 18 && !/\s/.test(t) && it.w <= 45;
    if (isMark || isMoney || shortNoSpace) candidates.push(it.xmid);
  }
  if (!candidates.length) return null;
  const clusters = cluster1D(candidates, RIGHT_CENTER_CLUSTER_GAP)
    .filter((c) => c.size >= MIN_RIGHT_CLUSTER_HITS)
    .sort((a, b) => a.center - b.center);
  if (!clusters.length) return null;
  return clusters.map((c) => c.center);
}

function mergeLeftSegmentsToN(items, n = LEFT_COLS) {
  if (!items.length) return Array.from({ length: n }, () => '');
  const merged = [];
  let cur = { ...items[0] };
  for (let i = 1; i < items.length; i++) {
    const nx = items[i];
    if (nx.x - cur.x2 <= INLINE_MERGE_GAP) {
      cur.str += String(nx.str).startsWith(' ') ? nx.str : ` ${nx.str}`;
      cur.x2 = Math.max(cur.x2, nx.x2);
    } else {
      merged.push(cur);
      cur = { ...nx };
    }
  }
  merged.push(cur);
  const parts = merged.map((m) => normalizeCell(m.str));
  if (parts.length <= n) {
    while (parts.length < n) parts.push('');
    return parts;
  }
  return [...parts.slice(0, n - 1), parts.slice(n - 1).join(' ')];
}

function gridifyRows(rowBuckets, rightCenters) {
  if (!rightCenters || !rightCenters.length) {
    return rowBuckets.map((r) => ({ y: r.y, cells: [normalizeCell(r.items.map((it) => it.str).join(' '))] }));
  }
  const sortedCenters = [...rightCenters].sort((a, b) => a - b);
  const gaps = sortedCenters.slice(1).map((c, i) => c - sortedCenters[i]);
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 48;
  const rightAssignDist = Math.max(16, avgGap * 0.48);
  const leftBoundary = sortedCenters[0] - Math.max(20, avgGap * 0.45);

  return rowBuckets.map((row) => {
    const right = Array.from({ length: sortedCenters.length }, () => '');
    const leftItems = [];
    for (const it of row.items) {
      const t = normalizeCell(it.str);
      if (!t) continue;
      const isMark = /^[xX]$/.test(t);
      const isMoney = /^S\/\s*\d/i.test(t);
      const shortValue = t.length <= 20 && it.w <= 60;
      if (isMark || isMoney || shortValue) {
        const { idx, dist } = nearestCenter(it.xmid, sortedCenters);
        if (dist <= rightAssignDist) {
          right[idx] = right[idx] ? `${right[idx]} ${t}` : t;
          continue;
        }
      }
      if (it.xmid < leftBoundary) leftItems.push(it);
      else leftItems.push(it);
    }
    const left = mergeLeftSegmentsToN(leftItems.sort((a, b) => a.x - b.x), LEFT_COLS);
    return { y: row.y, cells: [...left, ...right] };
  });
}

function splitRowBlocksByVerticalGaps(rows) {
  if (!rows.length) return [];
  const ys = rows.map((r) => r.y);
  const gaps = [];
  for (let i = 0; i < ys.length - 1; i++) gaps.push(ys[i] - ys[i + 1]);
  const baseline = median(gaps.filter((g) => g > 0 && g <= 15)) || median(gaps.filter((g) => g > 0)) || 8;
  const splitGap = Math.max(20, baseline * 2.8);
  const starts = [0];
  for (let i = 0; i < gaps.length; i++) if (gaps[i] > splitGap) starts.push(i + 1);
  const blocks = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : rows.length;
    blocks.push(rows.slice(from, to));
  }
  return blocks.filter((b) => b.length > 0);
}

function maxColsOf(matrix) {
  return matrix.reduce((n, r) => Math.max(n, r.length), 0);
}

function tableNameFromBlock(block, fallback) {
  if (!block.length) return fallback;
  const first = block[0].cells.slice(0, LEFT_COLS).map(normalizeCell).join(' ').trim();
  if (!first) return fallback;
  return first.length > 48 ? fallback : first.replace(/\s+/g, ' ');
}

/**
 * Construye jerarquía izquierda (árbol) por continuidad vertical:
 * si una celda en col i queda vacía, hereda el nodo activo superior de col i
 * (rowspan implícito). Útil para categorías/subcategorías en tablas con celdas fusionadas.
 */
function buildLeftHierarchy(tableCells, leftCols = LEFT_COLS) {
  const nodes = [];
  const activeByCol = Array.from({ length: leftCols }, () => null);

  for (let r = 0; r < tableCells.length; r++) {
    const row = tableCells[r];
    for (let c = 0; c < leftCols; c++) {
      const val = normalizeCell(row[c]);
      if (!val) {
        const active = activeByCol[c];
        if (active) active.endRow = r;
        continue;
      }

      const prevActive = activeByCol[c];
      if (prevActive && prevActive.label === val) {
        prevActive.endRow = r;
      } else {
        // cerrar nodos más profundos cuando aparece un nuevo nodo en este nivel
        for (let k = c; k < leftCols; k++) {
          activeByCol[k] = null;
        }
        const parent = c > 0 ? activeByCol[c - 1] : null;
        const node = {
          id: nodes.length + 1,
          level: c,
          column: c,
          label: val,
          startRow: r,
          endRow: r,
          parentId: parent ? parent.id : null,
        };
        nodes.push(node);
        activeByCol[c] = node;
      }
    }
  }

  return nodes;
}

function rightMarksVector(row, leftCols = LEFT_COLS) {
  return row.slice(leftCols).map((v) => normalizeCell(v));
}

function hasAnyRightMark(row, leftCols = LEFT_COLS) {
  return rightMarksVector(row, leftCols).some((v) => v.length > 0);
}

function rowHasSelectionData(row, leftCols = LEFT_COLS) {
  const right = row.slice(leftCols).map((v) => normalizeCell(v));
  return right.some((v) => /^x$/i.test(v) || /^s\/\s*\d/i.test(v));
}

function mergeMarksVectors(vectors) {
  if (!vectors.length) return [];
  const cols = vectors[0].length;
  const out = Array.from({ length: cols }, () => '');
  for (const vec of vectors) {
    for (let i = 0; i < cols; i++) {
      const v = normalizeCell(vec[i]);
      if (!v) continue;
      if (!out[i]) out[i] = v;
      else if (!out[i].includes(v)) out[i] = `${out[i]} ${v}`;
    }
  }
  return out;
}

/**
 * Ajustes genéricos para subfilas en celdas fusionadas:
 * - si en un bloque de subítems numerados una fila tiene X y otras no, reparte las X a todas.
 * - si una fila trae "Subcategoria 3) ..." separa y propaga "Subcategoria" al resto de subítems.
 */
function normalizeMergedSubrows(tableCells, leftCols = LEFT_COLS) {
  const out = tableCells.map((r) => r.slice());
  if (!out.length) return out;
  const subgroupCol = Math.max(0, leftCols - 2);

  const isNumbered = (s) => /^\d\)\s/.test(normalizeCell(s));
  const splitPrefixNumbered = (s) => {
    const text = normalizeCell(s);
    const m = text.match(/^(.*?)(\d\)\s.*)$/);
    if (!m) return { prefix: '', numbered: text };
    const prefix = normalizeCell(m[1]);
    const numbered = normalizeCell(m[2]);
    return { prefix, numbered };
  };

  let i = 0;
  while (i < out.length) {
    const baseKey = normalizeCell(out[i][1]);
    let j = i;
    while (j + 1 < out.length && normalizeCell(out[j + 1][1]) === baseKey) j++;

    // bloque [i..j] con misma categoría principal
    const numberedRows = [];
    for (let r = i; r <= j; r++) {
      if (isNumbered(out[r][2])) numberedRows.push(r);
      else {
        const { prefix, numbered } = splitPrefixNumbered(out[r][2]);
        if (numbered && isNumbered(numbered)) {
          out[r][2] = numbered;
          if (prefix) {
            const cur = normalizeCell(out[r][subgroupCol]);
            if (!cur) out[r][subgroupCol] = prefix;
            else if (!cur.includes(prefix)) out[r][subgroupCol] = `${cur} ${prefix}`;
          }
          numberedRows.push(r);
        }
      }
    }

    if (numberedRows.length >= 2) {
      // 1) Propagar subcategoría (prefijo) entre subítems numerados
      let subgroup = '';
      for (const r of numberedRows) {
        const leftVal = normalizeCell(out[r][subgroupCol]);
        if (leftVal) {
          subgroup = leftVal;
          break;
        }
      }
      if (subgroup) {
        for (const r of numberedRows) {
          if (!normalizeCell(out[r][subgroupCol])) out[r][subgroupCol] = subgroup;
        }
      }

      // 2) Repartir marcas X/valores de celdas fusionadas a todas las subfilas numeradas
      const vecs = numberedRows
        .map((r) => rightMarksVector(out[r], leftCols))
        .filter((v) => v.some((x) => normalizeCell(x)));
      if (vecs.length) {
        const union = mergeMarksVectors(vecs);
        for (const r of numberedRows) {
          const has = hasAnyRightMark(out[r], leftCols);
          if (!has) {
            for (let c = 0; c < union.length; c++) {
              out[r][leftCols + c] = union[c];
            }
          }
        }
      }
    }

    i = j + 1;
  }

  return out;
}

function collapseStandaloneLargeRows(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const groupCol = Math.max(0, leftCols - 2);
  const detailCol = Math.max(0, leftCols - 1);
  const toDelete = new Set();

  for (let r = 0; r < out.length - 2; r++) {
    const row = out[r];
    const group = normalizeCell(row[groupCol]);
    const detail = normalizeCell(row[detailCol]);
    if (!group || detail) continue;
    if (!hasAnyRightMark(row, leftCols)) continue;

    const children = [];
    for (let k = r + 1; k < out.length; k++) {
      const rk = out[k];
      const gk = normalizeCell(rk[groupCol]);
      const dk = normalizeCell(rk[detailCol]);
      if (!dk) break;
      if (gk && gk !== group) break;
      children.push(k);
      if (children.length >= 8) break;
    }

    if (children.length < 2) continue;

    // Reparte solo la etiqueta de bloque; las marcas se respetan por fila hija
    // para no sobre-expandir X fuera del borde real de cada celda.
    for (const k of children) {
      const ck = out[k];
      if (!normalizeCell(ck[groupCol])) ck[groupCol] = group;
    }
    toDelete.add(r);
  }

  return out.filter((_, idx) => !toDelete.has(idx));
}

function propagateSectionHeaders(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const sectionCol = Math.max(0, leftCols - 2);
  const itemCol = Math.max(0, leftCols - 1);
  let activeSection = '';
  const isSectionLabel = (text) => {
    const t = normalizeCell(text);
    if (!t || t.length < 6) return false;
    const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
    if (!letters) return false;
    const upper = letters.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length;
    return upper / letters.length >= 0.6;
  };

  for (let r = 0; r < out.length; r++) {
    const row = out[r];
    const sec = normalizeCell(row[sectionCol]);
    const item = normalizeCell(row[itemCol]);
    const hasRight = hasAnyRightMark(row, leftCols);

    if (sec && item && hasRight && isSectionLabel(sec)) {
      if (isExamenesGeneralesLabel(sec)) {
        activeSection = '';
        row[sectionCol] = '';
        continue;
      }
      activeSection = sec;
      continue;
    }

    if (!activeSection) continue;
    if (!hasRight) {
      activeSection = '';
      continue;
    }

    if (sec && !item) {
      row[itemCol] = sec;
      if (!isExamenesGeneralesLabel(activeSection)) row[sectionCol] = activeSection;
      else row[sectionCol] = '';
      continue;
    }

    if (!sec && item) {
      if (isExamenesGeneralesLabel(activeSection)) row[sectionCol] = '';
      else row[sectionCol] = activeSection;
    }

    if (item && /^precio\s+sin\s+igv$/i.test(item)) {
      if (!isExamenesGeneralesLabel(activeSection)) row[sectionCol] = activeSection;
    }
  }

  return out;
}

function alignLeftColumnsByStructure(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const sectionCol = Math.max(0, leftCols - 2);
  const detailCol = Math.max(0, leftCols - 1);

  // Detectar columna estructural de detalle por filas con patrón de datos.
  const score = Array.from({ length: leftCols }, () => 0);
  for (const row of out) {
    if (!hasAnyRightMark(row, leftCols)) continue;
    for (let c = 0; c < leftCols; c++) {
      if (normalizeCell(row[c])) score[c] += 1;
    }
  }
  let structuralDetail = detailCol;
  for (let c = 0; c < leftCols; c++) {
    if (score[c] > score[structuralDetail]) structuralDetail = c;
  }

  for (let r = 1; r < out.length - 1; r++) {
    const row = out[r];
    if (!hasAnyRightMark(row, leftCols)) continue;
    const sec = normalizeCell(row[sectionCol]);
    const det = normalizeCell(row[structuralDetail]);

    // Caso típico: el examen cayó una columna a la izquierda (ej. "Anexo 16 A").
    if (sec && !det && sectionCol !== structuralDetail) {
      const prevDet = normalizeCell(out[r - 1][structuralDetail]);
      const nextDet = normalizeCell(out[r + 1][structuralDetail]);
      if (prevDet || nextDet) {
        row[structuralDetail] = sec;
        row[sectionCol] = '';
      }
    }
  }
  return out;
}

/**
 * La agrupación por filas debe salir de las celdas delimitadas por bordes, no de texto fijo.
 * forwardFillLeftColumns ya cubre rowspan vertical cuando la celda viene vacía en el PDF.
 */
function fillGroupByVerticalContinuity(tableCells, leftCols = LEFT_COLS) {
  return tableCells.map((r) => r.slice());
}

/**
 * Etiqueta lateral "EXÁMENES GENERALES": quitar de todas las celdas (incl. restos del PDF).
 */
function stripExamenesGeneralesDecoration(tableCells) {
  const re = /EX[ÁA]MENES\s+GENERALES/gi;
  return tableCells.map((row) =>
    row.map((cell) => {
      let s = normalizeCell(cell);
      if (!s) return '';
      for (let i = 0; i < 6; i++) {
        const f = foldForCompare(s);
        if (f === 'EXAMENES GENERALES') return '';
        if (!f.includes('EXAMENES GENERALES')) return s;
        const next = normalizeCell(s.replace(re, ' ').replace(/\s+/g, ' ').trim());
        if (next === s) return s;
        s = next;
      }
      return normalizeCell(s);
    })
  );
}

/**
 * Rebalancea filas que quedaron corridas 1 columna a la derecha en el bloque izquierdo
 * (caso típico tras limpiar etiquetas laterales de celdas fusionadas).
 * Regla: usar columna dominante de filas de datos + continuidad vertical vecina.
 */
function rebalanceSingleLeftCellToDominantColumn(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const freq = Array.from({ length: leftCols }, () => 0);
  const leftNonEmptyIdx = (row) => {
    const idx = [];
    for (let c = 0; c < leftCols; c++) if (normalizeCell(row[c])) idx.push(c);
    return idx;
  };

  for (const row of out) {
    if (!hasAnyRightMark(row, leftCols)) continue;
    const idx = leftNonEmptyIdx(row);
    if (idx.length === 1) freq[idx[0]] += 1;
  }

  let dominant = 0;
  for (let c = 1; c < freq.length; c++) {
    if (freq[c] > freq[dominant]) dominant = c;
  }

  for (let r = 1; r < out.length - 1; r++) {
    const row = out[r];
    if (!hasAnyRightMark(row, leftCols)) continue;
    const idx = leftNonEmptyIdx(row);
    if (idx.length !== 1) continue;
    const src = idx[0];
    if (src === dominant) continue;
    if (Math.abs(src - dominant) !== 1) continue;
    if (normalizeCell(row[dominant])) continue;

    const prev = out[r - 1];
    const next = out[r + 1];
    const prevHasDom = normalizeCell(prev[dominant]) && hasAnyRightMark(prev, leftCols);
    const nextHasDom = normalizeCell(next[dominant]) && hasAnyRightMark(next, leftCols);
    if (!prevHasDom && !nextHasDom) continue;

    row[dominant] = row[src];
    row[src] = '';
  }

  return out;
}

/**
 * Fila de precios: en el PDF la etiqueta va en una celda; texto sobrante a la izquierda
 * de "PRECIO" (misma fila) no aporta y suele ser arrastre de la fila anterior.
 */
function clearLeftCellsBeforePrecioInRow(tableCells) {
  const cellHasPrecio = (cell) => /\bprecio\b/i.test(normalizeCell(String(cell || '')));
  return tableCells.map((row) => {
    const colIdx = row.findIndex((cell) => cellHasPrecio(cell));
    if (colIdx <= 0) return row.slice();
    const out = row.slice();
    for (let c = 0; c < colIdx; c++) out[c] = '';
    return out;
  });
}

function countNonEmpty(arr) {
  return arr.reduce((n, c) => n + (normalizeCell(c) ? 1 : 0), 0);
}

/**
 * Corrige drift horizontal en el bloque izquierdo (cols 0..LEFT_COLS-1):
 * algunas filas llegan una columna más a la izquierda por ruido de bbox.
 * Usa (a) columna dominante y (b) celda de arriba como guía.
 */
function stabilizeLeftColumns(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const leftIndex = (row) => {
    const idx = [];
    for (let i = 0; i < leftCols; i++) if (normalizeCell(row[i])) idx.push(i);
    return idx;
  };

  // Columna descriptiva dominante en filas de datos (con marcas a la derecha).
  const freq = Array.from({ length: leftCols }, () => 0);
  for (const row of out) {
    if (!hasAnyRightMark(row, leftCols)) continue;
    const idx = leftIndex(row);
    if (idx.length === 1) freq[idx[0]] += 1;
  }
  let dominant = 0;
  for (let i = 1; i < freq.length; i++) {
    if (freq[i] > freq[dominant]) dominant = i;
  }

  // Corrección conservadora: mover solo +/-1 columna y con evidencia vertical.
  for (let r = 1; r < out.length - 1; r++) {
    const row = out[r];
    if (!hasAnyRightMark(row, leftCols)) continue;
    const idx = leftIndex(row);
    if (idx.length !== 1) continue;
    const src = idx[0];
    if (src === dominant) continue;
    if (Math.abs(src - dominant) !== 1) continue;
    if (normalizeCell(row[dominant])) continue;

    const prev = out[r - 1];
    const next = out[r + 1];
    const prevDom = normalizeCell(prev[dominant]) && hasAnyRightMark(prev, leftCols);
    const nextDom = normalizeCell(next[dominant]) && hasAnyRightMark(next, leftCols);
    const prevSrc = normalizeCell(prev[src]) && hasAnyRightMark(prev, leftCols);
    const nextSrc = normalizeCell(next[src]) && hasAnyRightMark(next, leftCols);

    // Solo ajustar cuando los vecinos de arriba/abajo respaldan la columna dominante.
    if ((prevDom || nextDom) && !prevSrc && !nextSrc) {
      row[dominant] = row[src];
      row[src] = '';
    }
  }
  return out;
}

/**
 * Expande celdas fusionadas verticales (rowspan implícito) en columnas izquierdas:
 * si una celda izquierda viene vacía pero la fila tiene subcategoría/datos, se rellena
 * con el último valor visto en esa misma columna.
 */
function forwardFillLeftColumns(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const carry = Array.from({ length: leftCols }, () => '');

  for (let r = 0; r < out.length; r++) {
    const row = out[r];
    for (let c = 0; c < leftCols; c++) {
      const cur = normalizeCell(row[c]);
      if (cur) {
        carry[c] = cur;
        // Cuando aparece un valor en un nivel, los niveles más profundos se reinician.
        for (let k = c + 1; k < leftCols; k++) carry[k] = '';
        continue;
      }

      const hasMeaningfulContext = row
        .slice(c + 1)
        .some((v) => normalizeCell(v).length > 0);

      if (hasMeaningfulContext && carry[c]) {
        row[c] = carry[c];
      }
    }
  }
  return out;
}

function expandMergedHeadersAndSpans(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const colCount = Math.max(...tableCells.map((r) => r.length));
  const out = tableCells.map((r) => {
    const row = r.slice();
    while (row.length < colCount) row.push('');
    return row;
  });

  const firstDataRow = out.findIndex((row) => rowHasSelectionData(row, leftCols));
  const headerEnd = firstDataRow > 0 ? firstDataRow : 0;
  if (headerEnd <= 0) return out;

  // 1) Rowspan en cabeceras: solo en bloque descriptivo izquierdo para no contaminar columnas de grupos.
  const rowspanCols = Math.min(colCount, Math.max(3, leftCols));
  for (let c = 0; c < rowspanCols; c++) {
    let carry = '';
    for (let r = 0; r < headerEnd; r++) {
      const cur = normalizeCell(out[r][c]);
      if (cur) {
        carry = cur;
        continue;
      }
      if (carry) out[r][c] = carry;
    }
  }

  // 2) Colspan en cabeceras: repetir a la derecha hasta próximo valor explícito.
  for (let r = 0; r < headerEnd; r++) {
    let c = 0;
    while (c < colCount) {
      const val = normalizeCell(out[r][c]);
      if (!val) {
        c += 1;
        continue;
      }
      let next = c + 1;
      while (next < colCount && !normalizeCell(out[r][next])) next += 1;
      for (let k = c + 1; k < next; k++) out[r][k] = val;
      c = next;
    }
  }

  // 3) Si una cabecera tiene un solo bloque grande, expandir al rango estructural
  // detectado por la fila más completa (normalmente GRUPO OCUPACIONAL).
  const densestRow = out.reduce(
    (best, row, idx) => {
      const score = countNonEmpty(row);
      return score > best.score ? { idx, score } : best;
    },
    { idx: 0, score: -1 }
  ).idx;
  const structureCols = [];
  for (let c = 0; c < colCount; c++) {
    if (normalizeCell(out[densestRow][c])) structureCols.push(c);
  }
  if (structureCols.length >= 2) {
    const from = structureCols[0];
    const to = structureCols[structureCols.length - 1];
    for (let r = 0; r < headerEnd; r++) {
      const filled = [];
      for (let c = 0; c < colCount; c++) if (normalizeCell(out[r][c])) filled.push(c);
      if (filled.length !== 1) continue;
      const only = filled[0];
      const val = normalizeCell(out[r][only]);
      if (!val) continue;
      if (only < from || only > to) continue;
      for (let c = from; c <= to; c++) {
        if (!normalizeCell(out[r][c])) out[r][c] = val;
      }
    }
  }

  return out;
}

function clusterEdges(values, gap = EDGE_CLUSTER_GAP) {
  if (!values.length) return [];
  const s = [...values].sort((a, b) => a - b);
  const groups = [];
  for (const v of s) {
    const g = groups[groups.length - 1];
    if (!g || v - g[g.length - 1] > gap) groups.push([v]);
    else g.push(v);
  }
  return groups.map((g) => ({
    value: g.reduce((a, b) => a + b, 0) / g.length,
    hits: g.length,
  }));
}

/**
 * Borde inferior “útil” del texto acumulado (evita usar una línea de pie muy baja como ancla).
 * Usa la fila agrupada más baja en Y con varios fragmentos de texto.
 */
function approximateContentBottomY(items) {
  if (!items.length) return 0;
  const rows = bucketRows(items);
  if (!rows.length) return Math.min(...items.map((i) => i.y));
  const asc = [...rows].sort((a, b) => a.y - b.y);
  for (const row of asc) {
    const n = row.items.filter((it) => normalizeCell(it.str).length >= 2).length;
    if (n >= 2) return row.y;
  }
  return asc[0].y;
}

/** Borde superior útil de la página siguiente (cabecera / primera banda con texto). */
function approximateContentTopY(items) {
  if (!items.length) return 0;
  const rows = bucketRows(items);
  if (!rows.length) return Math.max(...items.map((i) => i.y));
  return Math.max(...rows.map((r) => r.y));
}

function computeInterPageStackGap(items) {
  const rows = bucketRows(items);
  if (rows.length < 2) return 10;
  const ys = rows.map((r) => r.y).sort((a, b) => b - a);
  const gaps = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const g = ys[i] - ys[i + 1];
    if (g > 0 && g < 48) gaps.push(g);
  }
  const m = median(gaps);
  return m > 0 && m < 48 ? Math.min(16, Math.max(6, m * 0.85)) : 10;
}

function computeStackDeltaY(mergedItems, nextPageItems, gap) {
  if (!mergedItems.length || !nextPageItems.length) return 0;
  const bottomPrev = approximateContentBottomY(mergedItems);
  const topNext = approximateContentTopY(nextPageItems);
  return bottomPrev - topNext - gap;
}

async function extractRectanglesFromPage(page) {
  const OPS = pdfjsLib.OPS;
  const operatorList = await page.getOperatorList();
  const rects = [];
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    if (operatorList.fnArray[i] !== OPS.constructPath) continue;
    const args = operatorList.argsArray[i] || [];
    const ops = args[0];
    const coords = args[1];
    if (!ops || ops.length !== 1 || ops[0] !== OPS.rectangle || !coords || coords.length !== 4) continue;
    const [x, y, w, h] = coords;
    const x1 = Math.min(x, x + w);
    const x2 = Math.max(x, x + w);
    const y1 = Math.min(y, y + h);
    const y2 = Math.max(y, y + h);
    rects.push({ x1, x2, y1, y2, w: Math.abs(w), h: Math.abs(h) });
  }
  return rects;
}

function tryBuildGridFromRectangles(rects) {
  if (!rects.length) return null;
  const xEdges = [];
  const yEdges = [];
  for (const r of rects) {
    // ignorar rectángulos minúsculos
    if (r.w < 8 && r.h < 8) continue;
    xEdges.push(r.x1, r.x2);
    yEdges.push(r.y1, r.y2);
  }
  // Bordes dibujados como rectángulos muy delgados (líneas horizontales/verticales)
  for (const r of rects) {
    if (r.w < 4 && r.h < 4) continue;
    const horiz = r.w >= 18 && r.h <= 7;
    const vert = r.h >= 18 && r.w <= 7;
    if (horiz || vert) {
      xEdges.push(r.x1, r.x2);
      yEdges.push(r.y1, r.y2);
    }
  }
  const xClusters = clusterEdges(xEdges).filter((c) => c.hits >= EDGE_MIN_HITS_X).sort((a, b) => a.value - b.value);
  const yClusters = clusterEdges(yEdges).filter((c) => c.hits >= EDGE_MIN_HITS_Y).sort((a, b) => b.value - a.value);
  if (xClusters.length < 4) return null;
  return {
    xLines: xClusters.map((c) => c.value),
    yLines: yClusters.map((c) => c.value),
  };
}


function assignRowBucketsToXGrid(rowBuckets, xLines) {
  const sortedX = [...xLines].sort((a, b) => a - b);
  return rowBuckets.map((row) => {
    const cells = Array.from({ length: Math.max(1, sortedX.length - 1) }, () => []);
    for (const it of row.items) {
      const t = normalizeCell(it.str);
      if (!t) continue;
      let c = -1;
      for (let i = 0; i < sortedX.length - 1; i++) {
        if (it.xmid >= sortedX[i] && it.xmid < sortedX[i + 1]) {
          c = i;
          break;
        }
      }
      if (c < 0) continue;
      cells[c].push(it);
    }
    const mergedCells = cells.map((cellItems) => {
      if (!cellItems.length) return '';
      const sorted = [...cellItems].sort((a, b) => a.x - b.x);
      const merged = [];
      let cur = { ...sorted[0] };
      for (let i = 1; i < sorted.length; i++) {
        const nx = sorted[i];
        if (nx.x - cur.x2 <= INLINE_MERGE_GAP) {
          cur.str += String(nx.str).startsWith(' ') ? nx.str : ` ${nx.str}`;
          cur.x2 = Math.max(cur.x2, nx.x2);
        } else {
          merged.push(cur);
          cur = { ...nx };
        }
      }
      merged.push(cur);
      return normalizeCell(merged.map((m) => m.str).join(' '));
    });
    return { y: row.y, cells: mergedCells };
  });
}

/**
 * Fila = banda horizontal delimitada por yLines (bordes); columna = máximo solape en X con esa banda.
 * Si el baseline no cae en ninguna banda, se usa la fila con mayor solape vertical token–celda.
 */
function assignItemsToGridCells(items, xLines, yLines) {
  const sortedX = [...xLines].sort((a, b) => a - b);
  const sortedY = [...yLines].sort((a, b) => b - a);
  const nr = sortedY.length - 1;
  const rows = Array.from({ length: nr }, () => Array.from({ length: sortedX.length - 1 }, () => []));

  const rowByVerticalOverlap = (it) => {
    const tokenYTop = it.y;
    const tokenYBottom = it.y - Math.max(3, it.h || 0);
    let bestR = -1;
    let bestH = 0;
    for (let j = 0; j < nr; j++) {
      const yTop = sortedY[j];
      const yBottom = sortedY[j + 1];
      const interH = Math.max(0, Math.min(tokenYTop, yTop) - Math.max(tokenYBottom, yBottom));
      if (interH > bestH) {
        bestH = interH;
        bestR = j;
      }
    }
    return bestR;
  };

  for (const it of items) {
    const t = normalizeCell(it.str);
    if (!t) continue;

    let r = -1;
    for (let j = 0; j < sortedY.length - 1; j++) {
      if (it.y <= sortedY[j] && it.y > sortedY[j + 1]) {
        r = j;
        break;
      }
    }
    if (r < 0) r = rowByVerticalOverlap(it);
    if (r < 0) continue;

    let c = -1;
    let bestW = 0;
    for (let i = 0; i < sortedX.length - 1; i++) {
      const x1 = sortedX[i];
      const x2 = sortedX[i + 1];
      const interW = Math.max(0, Math.min(it.x2, x2) - Math.max(it.x, x1));
      if (interW > bestW) {
        bestW = interW;
        c = i;
      }
    }
    if (c < 0 || bestW <= 0) {
      for (let i = 0; i < sortedX.length - 1; i++) {
        if (it.xmid >= sortedX[i] && it.xmid < sortedX[i + 1]) {
          c = i;
          break;
        }
      }
    }
    if (c < 0) continue;
    rows[r][c].push(it);
  }

  return rows.map((row) =>
    row.map((cellItems) => {
      if (!cellItems.length) return '';
      const sorted = [...cellItems].sort((a, b) => a.x - b.x);
      const merged = [];
      let cur = { ...sorted[0] };
      for (let i = 1; i < sorted.length; i++) {
        const nx = sorted[i];
        if (nx.x - cur.x2 <= INLINE_MERGE_GAP) {
          cur.str += String(nx.str).startsWith(' ') ? nx.str : ` ${nx.str}`;
          cur.x2 = Math.max(cur.x2, nx.x2);
        } else {
          merged.push(cur);
          cur = { ...nx };
        }
      }
      merged.push(cur);
      return normalizeCell(merged.map((m) => m.str).join(' '));
    })
  );
}

function splitGridRowsByYGaps(matrix, yLines) {
  const gaps = [];
  for (let i = 0; i < yLines.length - 2; i++) {
    // gap between row i and i+1 baselines
    const g1 = yLines[i] - yLines[i + 1];
    const g2 = yLines[i + 1] - yLines[i + 2];
    gaps.push(Math.abs(g1 - g2));
  }
  const rowHeights = [];
  for (let i = 0; i < yLines.length - 1; i++) rowHeights.push(yLines[i] - yLines[i + 1]);
  const baseline = median(rowHeights.filter((h) => h > 0 && h <= 20)) || median(rowHeights.filter((h) => h > 0)) || 8;
  const splitGap = Math.max(22, baseline * 2.6);

  const starts = [0];
  for (let i = 0; i < rowHeights.length - 1; i++) {
    if (rowHeights[i + 1] > splitGap) starts.push(i + 1);
  }

  const blocks = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : matrix.length;
    const chunk = trimTrailingEmptyRows(matrix.slice(from, to));
    if (chunk.length) blocks.push(chunk);
  }
  return blocks;
}

function groupBorderRowsByTextBlocks(matrixByBorders, yLines, textBlocks) {
  const rowMids = [];
  for (let i = 0; i < yLines.length - 1 && i < matrixByBorders.length; i++) {
    rowMids.push({ yMid: (yLines[i] + yLines[i + 1]) / 2, cells: matrixByBorders[i] });
  }

  const ranges = textBlocks.map((b) => {
    const ys = b.map((r) => r.y);
    const top = Math.max(...ys);
    const bottom = Math.min(...ys);
    return { top, bottom };
  });

  const MARGIN_Y = 10;
  return ranges.map((rg) => {
    const rows = rowMids
      .filter((r) => r.yMid <= rg.top + MARGIN_Y && r.yMid >= rg.bottom - MARGIN_Y)
      .map((r) => r.cells);
    return trimTrailingEmptyRows(rows);
  });
}

async function extractPerfilPdfTablesFromBuffer(buffer, options = {}) {
  const debug = !!options.debug;
  const data = Buffer.isBuffer(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  const task = pdfjsLib.getDocument({ data, useSystemFonts: true, disableFontFace: true, isEvalSupported: false });
  const pdf = await task.promise;
  try {
    const numpages = pdf.numPages || 0;
    if (numpages < 1) return { ok: true, numpages: 0, tables: [] };

    /** Todas las páginas: texto + rectángulos en un solo eje Y para tablas cortadas entre páginas. */
    const perPage = [];
    for (let pi = 1; pi <= numpages; pi++) {
      const page = await pdf.getPage(pi);
      const textContent = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
      const pageItems = parseItems(textContent);
      const pageRects = await extractRectanglesFromPage(page);
      perPage.push({ items: pageItems, rects: pageRects });
    }

    const mergedItems = [];
    const mergedRects = [];
    const stackGap =
      perPage[0] && perPage[0].items.length ? computeInterPageStackGap(perPage[0].items) : 10;

    for (let i = 0; i < perPage.length; i++) {
      const { items: rawItems, rects: rawRects } = perPage[i];
      if (!rawItems.length) continue;
      if (!mergedItems.length) {
        for (const it of rawItems) mergedItems.push({ ...it });
        for (const r of rawRects) mergedRects.push({ ...r });
        continue;
      }
      const deltaY = computeStackDeltaY(mergedItems, rawItems, stackGap);
      for (const it of rawItems) mergedItems.push({ ...it, y: it.y + deltaY });
      for (const r of rawRects) mergedRects.push({ ...r, y1: r.y1 + deltaY, y2: r.y2 + deltaY });
    }

    if (!mergedItems.length) return { ok: true, numpages, tables: [] };
    const items = mergedItems;
    const rects = mergedRects;
    let tables = [];
    let debugInfo = null;

    const grid = tryBuildGridFromRectangles(rects);
    if (grid) {
      const rowBuckets = bucketRows(items);
      // Importante: separar celdas SOLO con bordes reales, sin cortes sintéticos por texto.
      const yLinesFromBorders = [...grid.yLines].sort((a, b) => b - a);
      const matrixByBorders = assignItemsToGridCells(items, grid.xLines, yLinesFromBorders);
      const textRows = bucketRows(items);
      const textBlocks = splitRowBlocksByVerticalGaps(textRows);
      const blocks = groupBorderRowsByTextBlocks(matrixByBorders, yLinesFromBorders, textBlocks);
      tables = blocks.map((celdas, i) => {
        const cleanedBase = stabilizeLeftColumns(removeCompletelyEmptyRows(trimTrailingEmptyRows(celdas)));
        const cleanedFilled = forwardFillLeftColumns(cleanedBase, LEFT_COLS);
        const cleanedMergedHeaders = expandMergedHeadersAndSpans(cleanedFilled, LEFT_COLS);
        const normalizedSubrows = normalizeMergedSubrows(cleanedMergedHeaders, LEFT_COLS);
        const collapsed = collapseStandaloneLargeRows(normalizedSubrows, LEFT_COLS);
        const sectioned = propagateSectionHeaders(collapsed, LEFT_COLS);
        const aligned = alignLeftColumnsByStructure(sectioned, LEFT_COLS);
        const stripped = stripExamenesGeneralesDecoration(
          fillGroupByVerticalContinuity(aligned, LEFT_COLS)
        );
        const cleaned = clearLeftCellsBeforePrecioInRow(
          rebalanceSingleLeftCellToDominantColumn(stripped, LEFT_COLS)
        );
        const hierarchy = buildLeftHierarchy(cleaned, LEFT_COLS);
        return {
          id: i + 1,
          nombre: tableNameFromBlock(cleaned.map((cells) => ({ cells })), `Tabla ${i + 1}`),
          filas: cleaned.length,
          columnas: maxColsOf(cleaned),
          celdas: cleaned,
          leftHierarchy: hierarchy,
        };
      });
      if (debug) {
        debugInfo = {
          method: 'borders+x-columns',
          xLines: grid.xLines,
          yLinesSample: yLinesFromBorders.slice(0, 120),
          blockSizes: blocks.map((b) => b.length),
          textBlockSizes: textBlocks.map((b) => b.length),
          rectCount: rects.length,
          itemCount: items.length,
        };
      }
    }

    if (!tables.length) {
      // Fallback: solo geometría de texto si no se pudo armar grilla por bordes.
      const rows = bucketRows(items);
      const rightCenters = inferRightCenters(items);
      const gridRows = gridifyRows(rows, rightCenters);
      const blocks = splitRowBlocksByVerticalGaps(gridRows);
      tables = blocks.map((b, i) => {
        const base = stabilizeLeftColumns(removeCompletelyEmptyRows(trimTrailingEmptyRows(b.map((r) => r.cells))));
        const filled = forwardFillLeftColumns(base, LEFT_COLS);
        const mergedHeaders = expandMergedHeadersAndSpans(filled, LEFT_COLS);
        const normalizedSubrows = normalizeMergedSubrows(mergedHeaders, LEFT_COLS);
        const collapsed = collapseStandaloneLargeRows(normalizedSubrows, LEFT_COLS);
        const sectioned = propagateSectionHeaders(collapsed, LEFT_COLS);
        const aligned = alignLeftColumnsByStructure(sectioned, LEFT_COLS);
        const stripped = stripExamenesGeneralesDecoration(fillGroupByVerticalContinuity(aligned, LEFT_COLS));
        const celdas = clearLeftCellsBeforePrecioInRow(
          rebalanceSingleLeftCellToDominantColumn(stripped, LEFT_COLS)
        );
        const hierarchy = buildLeftHierarchy(celdas, LEFT_COLS);
        return {
          id: i + 1,
          nombre: tableNameFromBlock(b, `Tabla ${i + 1}`),
          filas: celdas.length,
          columnas: maxColsOf(celdas),
          celdas,
          leftHierarchy: hierarchy,
        };
      });
      if (debug) {
        debugInfo = {
          method: 'text-geometry-fallback',
          rightCenters: rightCenters || [],
          rowYs: rows.map((r) => Number(r.y.toFixed(2))),
          blockSizes: blocks.map((b) => b.length),
          rectCount: rects.length,
          itemCount: items.length,
        };
      }
    }

    tables = tables.filter((t) => Array.isArray(t.celdas) && t.celdas.length > 0);

    if (debug) {
      return { ok: true, numpages, tables, debug: debugInfo };
    }
    return { ok: true, numpages, tables };
  } finally {
    try {
      await pdf.cleanup(false);
    } catch (_) {}
    try {
      await pdf.destroy();
    } catch (_) {}
  }
}

module.exports = { extractPerfilPdfTablesFromBuffer };

