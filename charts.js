'use strict';
/* ============ 圖表（SVG） ============ */
function niceScale(max, n) {
  if (!(max > 0)) return { top: 1000, step: 250 };
  const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= raw);
  return { top: step * Math.ceil(max / step), step };
}
function axisFmt(v, top) {
  if (top >= 10000) { const w = v / 10000; return v === 0 ? '0' : (Math.round(w * 100) / 100) + '萬'; }
  return num(v, 0);
}
function barPath(x, y, w, h) {
  if (h <= 0.5) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`;
}
/**
 * 直條圖
 * o = { labels:[], series:[{cls, values:[]}], sel:index|-1, mute:true（只凸顯選取的那根）,
 *       tick:(i)=>bool 是否顯示 x 標籤, avg:數值, action:'點擊動作', keys:[] }
 */
const CHARTS = {};
let chartSeq = 0;
function chartSlot(o) { const id = 'c' + (++chartSeq); CHARTS[id] = o; return `<div class="chart-wrap" data-chart="${id}"></div>`; }
function drawCharts(root) {
  root.querySelectorAll('[data-chart]').forEach(w => {
    const o = CHARTS[w.dataset.chart]; if (!o) return;
    const cs = getComputedStyle(w);
    const W = w.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    w.innerHTML = colChart(o, Math.max(240, Math.floor(W)));
  });
  for (const k in CHARTS) if (!root.querySelector(`[data-chart="${k}"]`)) delete CHARTS[k];
}
function colChart(o, W) {
  const fs = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  const H = Math.round(150 + fs * 3);
  const n = o.labels.length;
  let max = 0;
  for (const s of o.series) for (const v of s.values) if (v > max) max = v;
  if (o.avg && o.avg > max) max = o.avg;
  const sc = niceScale(max, 4);
  const tickFs = Math.round(fs * 0.75);
  const tw = str => [...str].reduce((w, ch) => w + (/[\u2E80-\uFFFF]/.test(ch) ? 1 : 0.62), 0) * tickFs;
  let yLabW = 0;
  for (let v = 0; v <= sc.top + 1e-9; v += sc.step) yLabW = Math.max(yLabW, tw(axisFmt(v, sc.top)));
  yLabW += 10;
  const L = Math.round(yLabW), R = 6, T = Math.round(fs * 1.4), B = Math.round(fs * 1.6);
  const pw = W - L - R, ph = H - T - B;
  const band = pw / n;
  const ns = o.series.length;
  const gap = 2;
  const bw = Math.max(2, Math.min(24, (band - gap * (ns + 1)) / ns));
  const groupW = bw * ns + gap * (ns - 1);
  const y = v => T + ph - (v / sc.top) * ph;
  let g = '';
  // 格線與 y 軸標籤
  for (let v = 0; v <= sc.top + 1e-9; v += sc.step) {
    const yy = Math.round(y(v)) + 0.5;
    g += `<line class="${v === 0 ? 'c-base' : 'c-grid'}" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/>`;
    g += `<text class="c-tick" x="${L - 6}" y="${yy + tickFs * 0.35}" text-anchor="end" style="font-size:${tickFs}px">${axisFmt(v, sc.top)}</text>`;
  }
  // 長條
  let maxI = -1, maxV = 0;
  o.series[0].values.forEach((v, i) => { if (v > maxV) { maxV = v; maxI = i; } });
  for (let i = 0; i < n; i++) {
    const x0 = L + band * i + (band - groupW) / 2;
    o.series.forEach((s, si) => {
      const v = s.values[i] || 0;
      const cls = o.mute ? (i === o.sel ? s.cls : 'c-mute') : (o.sel >= 0 && i !== o.sel ? s.cls + ' dim' : s.cls);
      g += `<path class="${cls}" d="${barPath(x0 + si * (bw + gap), y(v), bw, T + ph - y(v))}"/>`;
    });
    if (!o.tick || o.tick(i)) g += `<text class="c-xl" x="${L + band * i + band / 2}" y="${H - B + tickFs + 6}" text-anchor="middle" style="font-size:${tickFs}px">${esc(o.labels[i])}</text>`;
  }
  // 平均線（實線細線）
  if (o.avg > 0) {
    const yy = Math.round(y(o.avg)) + 0.5;
    g += `<line class="c-avg" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/>`;
    g += `<text class="c-avgt" x="${W - R}" y="${yy - 4}" text-anchor="end" style="font-size:${tickFs}px">${esc(o.avgLabel || '平均')} ${num(o.avg, 0)}</text>`;
  }
  // 選擇性標籤：選取的那根，否則最高的那根（多組長條時不標，改由下方資訊列顯示）
  const li = ns > 1 ? -1 : (o.sel >= 0 ? o.sel : maxI);
  if (li >= 0 && o.series[0].values[li] > 0) {
    const v = o.series[0].values[li];
    const cx = L + band * li + (band - groupW) / 2 + bw / 2;
    const tx = clamp(cx, L + tickFs * 1.8, W - R - tickFs * 1.8);
    g += `<text class="c-val" x="${tx}" y="${y(v) - 6}" text-anchor="middle" style="font-size:${tickFs + 1}px">${num(v, 0)}</text>`;
  }
  // 點擊區（比長條大）
  if (o.action) for (let i = 0; i < n; i++) {
    g += `<rect class="c-hit" x="${L + band * i}" y="${T - 8}" width="${band}" height="${ph + B + 8}" data-a="${o.action}" data-i="${i}" ${o.keys ? `data-k="${o.keys[i]}"` : ''}/>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria || '直條圖')}">${g}</svg>`;
}

/* 排行（橫條） */
function rankList(rows, total, action, extra) {
  if (!rows.length) return `<p class="empty-s">這段期間沒有資料</p>`;
  const max = rows[0].sum || 1;
  return `<div class="rank">${rows.map(r => `
    <button class="rank-row" data-a="${action}" data-k="${esc(r.key)}" ${extra || ''}>
      <span class="ic">${esc(r.icon)}</span>
      <span class="rk-mid">
        <span class="rk-top"><span class="rk-name">${esc(r.name)}</span><span class="rk-amt">${num(r.sum, 0)}</span></span>
        <span class="rk-bar"><i style="width:${Math.max(1.5, r.sum / max * 100).toFixed(1)}%"></i></span>
        <span class="rk-sub"><span>${r.count} 筆</span><span>${total ? (r.sum / total * 100).toFixed(1) : 0}%</span></span>
      </span>
    </button>`).join('')}</div>`;
}

/* 預算量表 */
function meter(spent, budget) {
  const st = budgetState(spent, budget);
  const p = budget ? clamp(spent / budget * 100, 0, 100) : 0;
  return `<div class="meter m-${st ? st.k : 'ok'}"><i style="width:${p.toFixed(1)}%"></i></div>`;
}
