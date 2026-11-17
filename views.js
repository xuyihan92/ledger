'use strict';
/* ============ 畫面狀態 ============ */
const S = {
  tab: 'list', month: curMonth(),
  smode: 'month', sday: today(), smonth: curMonth(), syear: +today().slice(0, 4), stype: 'out', sgroup: 'cat', ssel: '',
  bmonth: curMonth(), sfixed: true, pendAll: false
};

function navHTML() {
  const t = [['list', '明細', ICON.navList], ['stats', '統計', ICON.navStat], ['budget', '預算', ICON.navBudget], ['settings', '設定', ICON.navSet]];
  return t.map(x => `<button class="${S.tab === x[0] ? 'on' : ''}" data-a="tab" data-v="${x[0]}">${x[2]}<span>${x[1]}</span></button>`).join('');
}
function renderMain() {
  const m = document.getElementById('main');
  const keep = S._lastTab === S.tab ? window.scrollY : 0;
  m.innerHTML = S.tab === 'list' ? viewList() : S.tab === 'stats' ? viewStats() : S.tab === 'budget' ? viewBudget() : viewSettings();
  drawCharts(m);
  document.getElementById('nav').innerHTML = navHTML();
  document.getElementById('fab').style.display = (S.tab === 'list' || S.tab === 'stats') ? '' : 'none';
  if (S._lastTab !== S.tab) window.scrollTo(0, 0); else window.scrollTo(0, keep);
  S._lastTab = S.tab;
}
function renderAll() { renderMain(); refreshLayers(); }

/* ============ 共用片段 ============ */
function rowHTML(t, showDate) {
  const c = catOf(t.cat), p = payOf(t.pay);
  const fx = t.cur && t.cur !== 'TWD';
  return `<button class="row" data-a="edit" data-id="${t.id}">
    <span class="ic">${esc(c.icon)}</span>
    <span class="row-mid">
      <span class="row-t">${esc(c.name)}${t.rec ? `<span class="rec-i" aria-label="固定收支">${ICON.repeat}</span>` : ''}</span>
      <span class="row-s">${showDate ? `<span class="rd">${shortDay(t.date)}</span>` : ''}${t.note ? `<span class="note">${esc(t.note)}</span>` : ''}${p ? `<span class="tag">${esc(p.name)}</span>` : ''}</span>
    </span>
    <span class="row-r">
      <span class="amt ${t.type === 'in' ? 'inc' : ''}">${t.type === 'in' ? '+' : ''}${num(t.amt, 2)}</span>
      ${fx ? `<span class="fx">${esc(curSym(t.cur))} ${num(t.orig, 2)}</span>` : ''}
      ${t.pending ? `<span class="tag warn">待確認</span>` : ''}
    </span>
  </button>`;
}
function dayGroups(list) {
  const by = {};
  for (const t of sortTx(list)) (by[t.date] = by[t.date] || []).push(t);
  return Object.keys(by).sort().reverse().map(d => {
    const o = sum(by[d].filter(t => t.type === 'out')), i = sum(by[d].filter(t => t.type === 'in'));
    return `<div class="day">
      <div class="day-h"><span>${dayLabel(d)}${d === today() ? '<em>今天</em>' : ''}</span>
        <span>${o ? '支出 ' + num(o, 0) : ''}${o && i ? '　' : ''}${i ? '收入 ' + num(i, 0) : ''}</span></div>
      ${by[d].map(t => rowHTML(t)).join('')}
    </div>`;
  }).join('');
}
function periodNav(label, action, picker) {
  return `<div class="pnav">
    <button class="icon-btn" data-a="${action}" data-v="-1" aria-label="上一期">${ICON.left}</button>
    ${picker}
    <button class="icon-btn" data-a="${action}" data-v="1" aria-label="下一期">${ICON.right}</button>
  </div>`;
}
function tile(label, value, sub, cls) {
  const subs = (Array.isArray(sub) ? sub : [sub]).filter(Boolean);
  return `<div class="tile ${cls || ''}"><div class="tl">${label}</div><div class="tv">${value}</div>${subs.map(x => `<div class="ts">${x}</div>`).join('')}</div>`;
}
function fixedChip() { return seg('s-fixed', [['1', '全部'], ['0', '扣除固定收支']], S.sfixed ? '1' : '0', 'seg-sm'); }
function delta(cur, prev, label) {   // 支出增加是壞事
  if (!prev) return `<span class="muted">${label}無資料</span>`;
  const p = (cur - prev) / prev * 100;
  if (Math.abs(p) < 0.05) return `<span class="muted">與${label}持平</span>`;
  return p > 0 ? `<span class="d-up">▲ 比${label}多 ${p.toFixed(1)}%</span>` : `<span class="d-down">▼ 比${label}少 ${Math.abs(p).toFixed(1)}%</span>`;
}

/* ============ 明細 ============ */
function viewList() {
  const mk = S.month, [a, b] = monthRange(mk);
  const all = txRange(a, b);
  const out = sum(all.filter(t => t.type === 'out')), inc = sum(all.filter(t => t.type === 'in'));
  const bt = D.budget.total, st = budgetState(out, bt);
  const isCur = mk === curMonth();
  let h = `<div class="band">
    <div class="band-nav">
      <button class="icon-btn" data-a="m-shift" data-v="-1" aria-label="上個月">${ICON.left}</button>
      <button class="band-month" data-a="m-pick">${monthLabel(mk)}</button>
      <button class="icon-btn" data-a="m-shift" data-v="1" aria-label="下個月">${ICON.right}</button>
      <span class="grow"></span>
      ${!isCur ? `<button class="chip-btn" data-a="m-now">回本月</button>` : ''}
      <button class="icon-btn" data-a="search" aria-label="搜尋">${ICON.search}</button>
    </div>
    <div class="band-label">${isCur ? '本月支出' : monthLabel(mk).slice(5) + '支出'}</div>
    <div class="band-hero">${money(out)}</div>
    <div class="band-row"><span>收入 <b>${num(inc, 0)}</b></span><span>結餘 <b>${inc - out < 0 ? '−' : ''}${num(Math.abs(inc - out), 0)}</b></span></div>
    ${bt ? `<button class="band-budget" data-a="tab" data-v="budget">${meter(out, bt)}
        <span class="bb-t"><span>${st.icon} 預算已用 ${Math.round(st.p)}%</span><span>${out <= bt ? '還剩 ' + num(bt - out, 0) : '超支 ' + num(out - bt, 0)}</span></span></button>` : ''}
  </div>`;
  if (!BR && IS_IOS && !IS_STANDALONE && !S.hideInstall) {
    h += `<div class="install"><div class="ins-t">📲 先把「記帳」加到主畫面</div>
      <ol><li>按 Safari 下方（或上方）的「分享」按鈕 <span class="share-ic">⬆︎</span></li><li>往下滑，選「加入主畫面」，再按「加入」</li><li>之後都從主畫面的「記帳」圖示開啟</li></ol>
      <p class="muted small">在 Safari 分頁記的帳和主畫面的 App 是分開的兩份資料。</p>
      <button class="link-btn" data-a="hide-install">先在 Safari 試用</button></div>`;
  }
  const pend = pendingList();
  if (pend.length) {
    const shown = S.pendAll ? pend : pend.slice(0, 3);
    h += `<div class="pend"><div class="pend-h">🔔 待確認的固定收支（${pend.length} 筆）<small>點一下確認金額</small></div>${shown.map(t => rowHTML(t, true)).join('')}
      ${pend.length > 3 ? `<button class="pend-more" data-a="pend-all">${S.pendAll ? '收合' : '顯示全部 ' + pend.length + ' 筆'}</button>` : ''}</div>`;
  }
  if (!all.length) {
    h += `<div class="empty"><div class="empty-ic">📒</div><p>${monthLabel(mk)}還沒有記帳。</p><p class="muted">按右下角的 ＋ 記下第一筆。</p></div>`;
  } else h += dayGroups(all);
  return h;
}

function monthPicker(mk, title) {
  let y = +mk.slice(0, 4);
  const draw = el => {
    el.querySelector('.mp-y').textContent = y + ' 年';
    el.querySelector('.mp-grid').innerHTML = Array.from({ length: 12 }, (_, i) => {
      const k = y + '-' + pad2(i + 1);
      return `<button class="${k === mk ? 'on' : ''} ${k === curMonth() ? 'now' : ''}" data-mk="${k}">${i + 1} 月</button>`;
    }).join('');
  };
  return modal({
    title: title || '選擇月份',
    html: `<div class="mp"><div class="mp-head"><button class="icon-btn" data-y="-1">${ICON.left}</button><b class="mp-y"></b><button class="icon-btn" data-y="1">${ICON.right}</button></div><div class="mp-grid"></div></div>`,
    buttons: [{ label: '取消', value: null }],
    mount: (el, L) => {
      draw(el);
      el.querySelectorAll('[data-y]').forEach(b => b.addEventListener('click', () => { y += +b.dataset.y; draw(el); }));
      el.querySelector('.mp-grid').addEventListener('click', e => { const b = e.target.closest('[data-mk]'); if (b) closeLayer(L, b.dataset.mk); });
    }
  });
}
function yearPicker(yr) {
  const ys = new Set([+today().slice(0, 4)]);
  D.tx.forEach(t => ys.add(+t.date.slice(0, 4)));
  const list = [...ys].sort((a, b) => b - a);
  return pickSheet('選擇年份', list.map(v => ({ value: v, label: v + ' 年' })), yr);
}

/* 搜尋 */
function openSearch() {
  let q = '', type = '';
  const results = () => {
    const k = q.trim().toLowerCase();
    if (!k && !type) return `<p class="empty-s">輸入備註、分類、付款方式或金額</p>`;
    const list = D.tx.filter(t => {
      if (t.pending) return false;
      if (type && t.type !== type) return false;
      if (!k) return true;
      const c = catOf(t.cat), p = payOf(t.pay);
      return (t.note || '').toLowerCase().includes(k) || c.name.toLowerCase().includes(k) || (p && p.name.toLowerCase().includes(k)) ||
        String(t.amt) === k || String(t.orig) === k;
    });
    if (!list.length) return `<p class="empty-s">找不到符合「${esc(q)}」的紀錄</p>`;
    const o = sum(list.filter(t => t.type === 'out')), i = sum(list.filter(t => t.type === 'in'));
    const sorted = sortTx(list).slice(0, 300);
    return `<div class="sr-sum">共 ${list.length} 筆${o ? '，支出 ' + money(o) : ''}${i ? '，收入 ' + money(i) : ''}${list.length > 300 ? '（顯示最近 300 筆）' : ''}</div>
      <div class="card-list">${sorted.map(t => rowHTML(t, true)).join('')}</div>`;
  };
  pushScreen({
    title: '搜尋', static: false,
    body: () => `<div class="search-box"><input type="search" id="sq" placeholder="例如：午餐、全聯、1200" value="${esc(q)}" autocomplete="off"></div>
      <div class="search-f">${seg('sf-type', [['', '全部'], ['out', '支出'], ['in', '收入']], type)}</div>
      <div id="sres">${results()}</div>`,
    mount: (el) => {
      const inp = el.querySelector('#sq');
      inp.addEventListener('input', () => { q = inp.value; el.querySelector('#sres').innerHTML = results(); });
      el.querySelectorAll('[data-a=sf-type]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation(); type = b.dataset.v;
        el.querySelectorAll('[data-a=sf-type]').forEach(x => x.classList.toggle('on', x.dataset.v === type));
        el.querySelector('#sres').innerHTML = results();
      }));
      if (!q) setTimeout(() => inp.focus(), 250);
    }
  });
}

/* ============ 統計 ============ */
function viewStats() {
  let h = `<div class="page-head"><h1>統計</h1>${seg('s-mode', [['day', '日'], ['month', '月'], ['year', '年']], S.smode, 'seg-sm')}</div>`;
  h += S.smode === 'day' ? statDay() : S.smode === 'year' ? statYear() : statMonth();
  return h;
}
function groupRows(list) {
  const by = {};
  for (const t of list) {
    const k = S.sgroup === 'pay' ? (t.pay || '_none') : t.cat;
    (by[k] = by[k] || { key: k, sum: 0, count: 0 });
    by[k].sum += t.amt; by[k].count++;
  }
  return Object.values(by).map(r => {
    if (S.sgroup === 'pay') { const p = payOf(r.key); r.name = p ? p.name : '未指定'; r.icon = p ? p.icon : '❔'; }
    else { const c = catOf(r.key); r.name = c.name; r.icon = c.icon; }
    r.sum = r2(r.sum); return r;
  }).sort((a, b) => b.sum - a.sum);
}
function rankSection(list, periodText) {
  const l = list.filter(t => t.type === S.stype);
  const tot = sum(l);
  return `<section class="card">
    <div class="card-h"><h3>${S.stype === 'out' ? '支出' : '收入'}${S.sgroup === 'pay' ? '付款方式' : '分類'}排行</h3><span class="muted">${periodText}</span></div>
    <div class="card-tools">${seg('s-type', [['out', '支出'], ['in', '收入']], S.stype, 'seg-sm')}${seg('s-group', [['cat', '分類'], ['pay', '付款方式']], S.sgroup, 'seg-sm')}</div>
    ${tot ? `<div class="rank-total">合計 ${money(tot)}</div>` : ''}
    ${rankList(groupRows(l), tot, 's-rank')}
  </section>`;
}
function dateInputPicker(value, label, ch) {
  return `<label class="pick-date"><span>${label}</span><input type="date" value="${value}" data-ch="${ch}"></label>`;
}

function statMonth() {
  const mk = S.smonth, [a, b] = monthRange(mk);
  const list = txRange(a, b);
  const outL = list.filter(t => t.type === 'out');
  const out = sum(outL), inc = sum(list.filter(t => t.type === 'in'));
  const y = +mk.slice(0, 4), m = +mk.slice(5, 7) - 1, n = dim(y, m);
  const daily = Array(n).fill(0);
  outL.filter(t => S.sfixed || !t.rec).forEach(t => daily[+t.date.slice(8) - 1] += t.amt);
  const outShown = r2(daily.reduce((a, v) => a + v, 0));
  const isCur = mk === curMonth();
  const elapsed = isCur ? +today().slice(8) : (mk < curMonth() ? n : 0);
  const avg = elapsed ? out / elapsed : 0;
  const avgShown = elapsed ? outShown / elapsed : 0;
  const pm = shiftMonth(mk, -1), prevOut = monthSpent(pm);
  const keys = daily.map((_, i) => ymd(y, m, i + 1));
  const sel = keys.indexOf(S.ssel);
  let h = periodNav(monthLabel(mk), 's-shift', `<button class="pn-label" data-a="s-pickmonth">${monthLabel(mk)}</button>`);
  h += `<div class="tiles">
    ${tile('支出', money(out), [delta(out, prevOut, '上月'), elapsed ? `日均 ${money(avg)}${isCur ? `（已過 ${elapsed} 天）` : ''}` : ''], 'hero')}
    ${tile('收入', money(inc))}
    ${tile('結餘', (inc - out < 0 ? '−' : '') + money(Math.abs(inc - out)))}
  </div>`;
  h += `<section class="card">
    <div class="card-h"><h3>每日支出</h3>${fixedChip()}</div>
    ${chartSlot({ labels: daily.map((_, i) => String(i + 1)), series: [{ cls: 'c-s1', values: daily }], sel, tick: i => i === 0 || (i + 1) % 5 === 0, avg: avgShown, avgLabel: '日均', action: 's-bar', keys, aria: '每日支出直條圖' })}
    <div class="info-strip">${sel >= 0 ? `<span>${dayLabel(keys[sel])}　支出 <b>${money(daily[sel])}</b></span><button class="link-btn" data-a="s-goday" data-k="${keys[sel]}">看這天明細</button>`
      : `<span class="muted">點一下長條，看當天花了多少</span>`}</div>
  </section>`;
  h += rankSection(list, monthLabel(mk));
  return h;
}

function statYear() {
  const yr = S.syear;
  const outs = Array(12).fill(0), ins = Array(12).fill(0);
  txRange(yr + '-01-01', yr + '-12-31').forEach(t => { const i = +t.date.slice(5, 7) - 1; if (t.type === 'out') outs[i] += t.amt; else ins[i] += t.amt; });
  const out = r2(outs.reduce((s, v) => s + v, 0)), inc = r2(ins.reduce((s, v) => s + v, 0));
  const cy = +today().slice(0, 4);
  const months = yr === cy ? +today().slice(5, 7) : (yr < cy ? 12 : 0);
  const prevOut = sum(txRange((yr - 1) + '-01-01', (yr - 1) + '-12-31', 'out'));
  const keys = outs.map((_, i) => yr + '-' + pad2(i + 1));
  const sel = keys.indexOf(S.ssel);
  let h = periodNav(yr + ' 年', 's-shift', `<button class="pn-label" data-a="s-pickyear">${yr} 年</button>`);
  h += `<div class="tiles">
    ${tile('年度支出', money(out), [delta(out, prevOut, '去年'), months ? `月均 ${money(out / months)}${yr === cy ? `（以 ${months} 個月計）` : ''}` : ''], 'hero')}
    ${tile('年度收入', money(inc))}
    ${tile('年度結餘', (inc - out < 0 ? '−' : '') + money(Math.abs(inc - out)))}
  </div>`;
  h += `<section class="card">
    <div class="card-h"><h3>每月收支</h3><span class="legend"><i class="lg-s1"></i>支出<i class="lg-s3"></i>收入</span></div>
    ${chartSlot({ labels: outs.map((_, i) => String(i + 1)), series: [{ cls: 'c-s1', values: outs }, { cls: 'c-s3', values: ins }], sel, action: 's-bar', keys, aria: '每月支出與收入直條圖' })}
    <div class="info-strip">${sel >= 0 ? `<span>${yr}年${sel + 1}月　支出 <b>${num(outs[sel], 0)}</b>　收入 <b>${num(ins[sel], 0)}</b></span><button class="link-btn" data-a="s-gomonth" data-k="${keys[sel]}">看這個月</button>`
      : `<span class="muted">點一下月份，看當月收支</span>`}</div>
  </section>`;
  h += rankSection(txRange(yr + '-01-01', yr + '-12-31'), yr + ' 年');
  h += `<section class="card"><div class="card-h"><h3>每月明細表</h3></div>
    <table class="tbl"><thead><tr><th>月份</th><th>支出</th><th>收入</th><th>結餘</th></tr></thead><tbody>
    ${outs.map((o, i) => `<tr data-a="s-gomonth" data-k="${keys[i]}"><td>${i + 1} 月</td><td>${num(o, 0)}</td><td>${num(ins[i], 0)}</td><td class="${ins[i] - o < 0 ? 'neg' : ''}">${ins[i] - o < 0 ? '−' : ''}${num(Math.abs(ins[i] - o), 0)}</td></tr>`).join('')}
    <tr class="tot"><td>合計</td><td>${num(out, 0)}</td><td>${num(inc, 0)}</td><td class="${inc - out < 0 ? 'neg' : ''}">${inc - out < 0 ? '−' : ''}${num(Math.abs(inc - out), 0)}</td></tr>
    </tbody></table></section>`;
  return h;
}

function statDay() {
  const d = S.sday;
  const list = txRange(d, d);
  const out = sum(list.filter(t => t.type === 'out')), inc = sum(list.filter(t => t.type === 'in'));
  const keys = [], vals = [];
  for (let i = 6; i >= 0; i--) { const k = addDays(d, -i); keys.push(k); vals.push(sum(txRange(k, k, 'out').filter(t => S.sfixed || !t.rec))); }
  const wk = sum(txRange(keys[0], d, 'out'));
  let h = periodNav(dayLabel(d), 's-shift', dateInputPicker(d, dayLabel(d) + (d === today() ? ' 今天' : ''), 's-daypick'));
  const prevDay = sum(txRange(keys[5], keys[5], 'out'));
  h += `<div class="tiles">
    ${tile('當天支出', money(out), [delta(out, prevDay, '前一天'), `共 ${list.length} 筆`], 'hero')}
    ${tile('當天收入', money(inc))}
    ${tile('近 7 天支出', money(wk), '每天平均 ' + num(wk / 7, 0))}
  </div>`;
  h += `<section class="card">
    <div class="card-h"><h3>近 7 天支出</h3>${fixedChip()}</div>
    ${chartSlot({ labels: keys.map(k => WD[pd(k).getDay()]), series: [{ cls: 'c-s1', values: vals }], sel: 6, mute: true, action: 's-day7', keys, aria: '近七天支出直條圖' })}
    <div class="info-strip"><span class="muted">${shortDay(keys[0])}～${shortDay(d)}，點其他天的長條可切換日期</span></div>
  </section>`;
  h += rankSection(list, dayLabel(d));
  h += `<section class="card"><div class="card-h"><h3>當天明細</h3></div>
    ${list.length ? `<div class="card-list">${sortTx(list).map(t => rowHTML(t)).join('')}</div>` : `<p class="empty-s">這天沒有記帳</p>`}</section>`;
  return h;
}
function statPeriod() {
  if (S.smode === 'day') return [S.sday, S.sday, dayLabel(S.sday)];
  if (S.smode === 'year') return [S.syear + '-01-01', S.syear + '-12-31', S.syear + ' 年'];
  const [a, b] = monthRange(S.smonth); return [a, b, monthLabel(S.smonth)];
}
function openRankDetail(key) {
  const [a, b, label] = statPeriod();
  const title = (S.sgroup === 'pay' ? (payOf(key) ? payOf(key).name : '未指定') : catOf(key).name) + '｜' + label;
  pushScreen({
    title,
    body: () => {
      const list = txRange(a, b, S.stype).filter(t => S.sgroup === 'pay' ? (t.pay || '_none') === key : t.cat === key);
      return `<div class="sr-sum">共 ${list.length} 筆，合計 ${money(sum(list))}</div>
        <div class="card-list">${sortTx(list).map(t => rowHTML(t, true)).join('') || '<p class="empty-s">沒有資料</p>'}</div>`;
    }
  });
}

/* ============ 預算 ============ */
function viewBudget() {
  const mk = S.bmonth, out = monthSpent(mk), bt = D.budget.total;
  const catB = D.budget.cats || {};
  const hasCat = Object.keys(catB).some(k => catB[k] > 0);
  let h = `<div class="page-head"><h1>預算</h1><button class="chip-btn" data-a="b-edit">編輯預算</button></div>`;
  h += periodNav(monthLabel(mk), 'b-shift', `<button class="pn-label" data-a="b-pick">${monthLabel(mk)}</button>`);
  if (!bt && !hasCat) {
    return h + `<div class="empty"><div class="empty-ic">🎯</div><p>還沒有設定預算。</p><p class="muted">設定每月總預算或分類預算後，花費接近或超過時會提醒你。</p>
      <button class="btn primary" data-a="b-edit">設定預算</button></div>`;
  }
  if (bt) {
    const st = budgetState(out, bt);
    const isCur = mk === curMonth();
    const [, end] = monthRange(mk);
    const left = isCur ? daysBetween(today(), end) + 1 : 0;
    h += `<section class="card budget-main">
      <div class="card-h"><h3>每月總預算</h3><span class="st st-${st.k}">${st.icon} ${st.label}</span></div>
      <div class="bm-num"><span class="bm-big">${money(out)}</span><span class="muted">／ ${num(bt, 0)}</span></div>
      ${meter(out, bt)}
      <div class="bm-row"><span>已用 ${st.p.toFixed(0)}%</span><span>${out <= bt ? '還剩 ' + money(bt - out) : '超支 ' + money(out - bt)}</span></div>
      ${isCur && out < bt ? `<p class="bm-tip">本月還有 ${left} 天，平均每天可花 <b>${money((bt - out) / left)}</b></p>` : ''}
    </section>`;
  }
  const [a, b] = monthRange(mk);
  const spentBy = sumBy(txRange(a, b, 'out'), 'cat');
  const withB = catsOfType('out', true).filter(c => catB[c.id] > 0);
  const noB = catsOfType('out', true).filter(c => !(catB[c.id] > 0) && spentBy[c.id]);
  if (withB.length) {
    h += `<section class="card"><div class="card-h"><h3>分類預算</h3></div>
      ${withB.map(c => {
      const sp = r2(spentBy[c.id] || 0), bb = catB[c.id], st = budgetState(sp, bb);
      return `<div class="brow"><span class="ic">${esc(c.icon)}</span><span class="br-mid">
          <span class="br-top"><span class="br-name">${esc(c.name)}</span><span class="st st-${st.k}">${st.icon} ${st.label}</span></span>
          ${meter(sp, bb)}
          <span class="br-sub"><span>${num(sp, 0)} ／ ${num(bb, 0)}</span><span>${sp <= bb ? '剩 ' + num(bb - sp, 0) : '超支 ' + num(sp - bb, 0)}</span></span>
        </span></div>`;
    }).join('')}</section>`;
  }
  if (noB.length) {
    h += `<section class="card"><div class="card-h"><h3>未設定預算的分類</h3></div>
      ${noB.sort((x, y) => spentBy[y.id] - spentBy[x.id]).map(c => `<div class="brow simple"><span class="ic">${esc(c.icon)}</span><span class="br-name">${esc(c.name)}</span><span class="grow"></span><span class="br-amt">${num(spentBy[c.id], 0)}</span></div>`).join('')}
    </section>`;
  }
  return h;
}

function openBudgetEditor() {
  const draft = { total: D.budget.total || '', alert: D.budget.alert || 80, cats: Object.assign({}, D.budget.cats) };
  pushScreen({
    title: '編輯預算', static: true,
    body: () => `<div class="form">
      <label class="fl">每月總預算（新台幣）<input class="inp" inputmode="decimal" id="b-total" value="${draft.total || ''}" placeholder="不設定就留白"></label>
      <label class="fl">提醒門檻<select class="inp" id="b-alert">${[70, 80, 90].map(v => `<option value="${v}" ${draft.alert === v ? 'selected' : ''}>用到 ${v}% 時提醒</option>`).join('')}</select></label>
      <h4 class="fsub">分類預算（每月）</h4>
      <p class="muted small">只要替需要控管的分類填金額；留白代表不設定。</p>
      ${catsOfType('out', true).map(c => `<label class="fl-row"><span class="ic">${esc(c.icon)}</span><span class="fr-name">${esc(c.name)}</span>
         <input class="inp sm" inputmode="decimal" data-bc="${c.id}" value="${draft.cats[c.id] || ''}" placeholder="—"></label>`).join('')}
      <div class="form-btns"><button class="btn primary big" data-a="b-save">儲存預算</button></div>
    </div>`
  });
}
function saveBudgetEditor(el) {
  const v = s => { const n = parseFloat(String(s).replace(/,/g, '')); return n > 0 ? r2(n) : 0; };
  D.budget.total = v(el.querySelector('#b-total').value);
  D.budget.alert = +el.querySelector('#b-alert').value;
  const cats = {};
  el.querySelectorAll('[data-bc]').forEach(i => { const n = v(i.value); if (n) cats[i.dataset.bc] = n; });
  D.budget.cats = cats;
  save(); closeLayer(); renderAll(); toast('已儲存預算');
}
