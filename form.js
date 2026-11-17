'use strict';
/* ============ 記一筆／編輯 ============ */
function fmtExpr(s) {
  return s.replace(/\d+(\.\d*)?/g, m => {
    const [i, d] = m.split('.');
    return Number(i).toLocaleString('en-US') + (d !== undefined ? '.' + d : '');
  });
}
function defaultCur() {
  // 最近 12 小時內用過外幣（例如出國旅遊中），就沿用
  const s = D.set;
  if (s.lastCur && s.lastCur !== 'TWD' && Date.now() - (s.lastCurTs || 0) < 12 * 3600 * 1000) return s.lastCur;
  return 'TWD';
}
function firstCat(type) { const l = catsOfType(type); return l.length ? l[0].id : (catsOfType(type, true)[0] || {}).id; }

function openEntry(tx, preset) {
  const isNew = !tx;
  const f = tx ? Object.assign({}, tx, { expr: String(tx.cur && tx.cur !== 'TWD' ? tx.orig : tx.amt) }) : {
    id: null, type: (preset && preset.type) || 'out', expr: '', cur: defaultCur(), rate: null, cat: null,
    pay: D.set.lastPay || 'cash', date: (preset && preset.date) || today(), note: ''
  };
  if (tx && tx.pending && tx.cur !== 'TWD' && !tx.rate) f.rate = (curOf(tx.cur) || {}).rate || null;
  if (!f.cur) f.cur = 'TWD';
  if (!f.cat || (catOf(f.cat).type !== f.type)) f.cat = (D.set.lastCat || {})[f.type] && catsOfType(f.type).some(c => c.id === D.set.lastCat[f.type]) ? D.set.lastCat[f.type] : firstCat(f.type);
  if (f.cur !== 'TWD' && !f.rate) { const c = curOf(f.cur); f.rate = c && c.rate ? c.rate : null; }
  if (!payOf(f.pay) && f.pay) f.pay = '';

  const title = tx && tx.pending ? '確認固定收支' : isNew ? '記一筆' : '編輯紀錄';
  const L = pushScreen({
    title, static: true, cls: 'entry-screen',
    right: () => seg('e-type', [['out', '支出'], ['in', '收入']], f.type, 'seg-sm en-seg') + (isNew ? '' : `<button class="icon-btn" data-e="delete" aria-label="刪除">${ICON.trash}</button>`),
    body: () => `<div class="entry">
      ${tx && tx.pending ? `<div class="pend-note">這筆是「固定收支」自動產生的，確認金額後按「確認入帳」。</div>` : ''}
      <div class="en-amt">
        <button class="cur-chip" data-e="cur"></button>
        <div class="amt-disp" data-e="amt-focus"><div class="amt-expr"></div><div class="amt-val"></div></div>
      </div>
      <div class="en-fx"></div>
      <div class="en-scroll">
        <div class="en-meta"></div>
        <div class="note-row"><input class="inp" id="e-note" placeholder="備註（例如：午餐、全聯、給媽媽）" maxlength="80" autocomplete="off"></div>
        <div class="note-sugg"></div>
        <div class="cat-grid"></div>
        ${tx && tx.pending ? `<button class="btn ghost danger-t" data-e="skip">略過這次（不記帳）</button>` : ''}
      </div>
      <div class="keypad">
        ${['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '.', '0', 'del', '+'].map(k =>
      `<button class="kk ${/[÷×−+]/.test(k) ? 'op' : ''}" data-k="${k}">${k === 'del' ? ICON.del : k}</button>`).join('')}
        <button class="kk fn" data-k="C">清除</button>
        <button class="kk save" data-k="save">${tx && tx.pending ? '確認入帳' : '儲存'}</button>
      </div>
    </div>`,
    mount: (el) => {
      const q = s => el.querySelector(s);
      const drawAmt = () => {
        const hasOp = /[+−×÷]/.test(f.expr);
        const v = evalExpr(f.expr);
        q('.amt-expr').textContent = hasOp ? fmtExpr(f.expr) : '';
        const shown = hasOp ? '= ' + (isNaN(v) ? '—' : num(r2(v), 2)) : (f.expr ? fmtExpr(f.expr) : '0');
        const av = q('.amt-val');
        av.textContent = shown;
        av.classList.toggle('zero', !f.expr);
        av.classList.toggle('long', shown.length > 11);
        q('.cur-chip').innerHTML = `<b>${esc(curSym(f.cur))}</b><small>${esc(curLabel(f.cur))} ▾</small>`;
        const fx = q('.en-fx');
        if (f.cur === 'TWD') { fx.innerHTML = ''; fx.style.display = 'none'; }
        else {
          fx.style.display = '';
          const rate = parseFloat(f.rate);
          if (!fx.querySelector('input')) {
            fx.innerHTML = `<span>1 ${esc(curLabel(f.cur))} =</span><input class="inp xs" id="e-rate" inputmode="decimal" placeholder="匯率"><span>台幣</span><span class="fx-r"></span>`;
            const ri = fx.querySelector('input');
            ri.value = f.rate || '';
            ri.addEventListener('input', () => { f.rate = ri.value; drawAmt(); });
            ri.addEventListener('focus', () => el.classList.add('typing'));
            ri.addEventListener('blur', () => setTimeout(() => el.classList.remove('typing'), 80));
          }
          fx.querySelector('.fx-r').innerHTML = rate > 0 ? '≈ ' + money(Math.round(v * rate)) : '<span class="warn-t">請先輸入匯率</span>';
        }
      };
      const drawCats = () => {
        q('.cat-grid').innerHTML = catsOfType(f.type).map(c => `<button class="cat ${c.id === f.cat ? 'on' : ''}" data-e="cat" data-id="${c.id}"><span class="ic">${esc(c.icon)}</span><span class="cn">${esc(c.name)}</span></button>`).join('')
          + `<button class="cat more" data-e="cat-edit"><span class="ic">✏️</span><span class="cn">編輯分類</span></button>`;
        drawSugg();
      };
      const drawMeta = () => {
        const p = payOf(f.pay);
        q('.en-meta').innerHTML = `<button class="icon-btn sm" data-e="d" data-v="-1" aria-label="前一天">${ICON.left}</button>
          <label class="meta-pill date-pill"><span>${ICON.cal}${f.date.slice(0, 4) !== today().slice(0, 4) ? f.date.slice(0, 4) + '/' : ''}${shortDay(f.date)}（${WD[pd(f.date).getDay()]}）${f.date === today() ? '<em>今天</em>' : f.date === addDays(today(), -1) ? '<em>昨天</em>' : ''}</span><input type="date" id="e-date" value="${f.date}" aria-label="日期"></label>
          <button class="icon-btn sm" data-e="d" data-v="1" aria-label="後一天">${ICON.right}</button>
          <button class="meta-pill pay-pill" data-e="pay-pick">${p ? esc(p.icon) + ' ' + esc(p.name) : '💳 付款方式'} ▾</button>`;
        q('#e-date').addEventListener('change', e => { if (e.target.value) { f.date = e.target.value; drawMeta(); } });
      };
      const drawSugg = () => {
        const cnt = {};
        for (const t of D.tx) if (t.cat === f.cat && t.note) cnt[t.note] = (cnt[t.note] || 0) + 1;
        const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 6);
        const ns = q('.note-sugg');
        ns.innerHTML = top.map(n => `<button class="chip sm" data-e="sugg">${esc(n)}</button>`).join('');
        ns.style.display = top.length ? '' : 'none';
      };
      const note = q('#e-note');
      note.value = f.note || '';
      note.addEventListener('input', () => { f.note = note.value; });
      note.addEventListener('focus', () => el.classList.add('typing'));
      note.addEventListener('blur', () => setTimeout(() => el.classList.remove('typing'), 80));

      const keyIn = k => {
        let s = f.expr;
        const lastNum = (s.match(/(\d+\.?\d*|\.\d*)$/) || [''])[0];
        if (k === 'C') s = '';
        else if (k === 'del') s = s.slice(0, -1);
        else if (/[+−×÷]/.test(k)) { if (!s) return; s = /[+−×÷]$/.test(s) ? s.slice(0, -1) + k : (s.endsWith('.') ? s.slice(0, -1) : s) + k; }
        else if (k === '.') { if (lastNum.includes('.')) return; s += lastNum ? '.' : '0.'; }
        else { // 數字
          if (lastNum.replace('.', '').length >= 10) return;
          if (lastNum.includes('.') && lastNum.split('.')[1].length >= 2) return;
          if (lastNum === '0') s = s.slice(0, -1);
          s += k;
        }
        f.expr = s; drawAmt();
      };
      el.querySelector('.keypad').addEventListener('click', e => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        if (b.dataset.k === 'save') saveEntry(f, isNew, tx, el); else keyIn(b.dataset.k);
      });
      el.addEventListener('click', async e => {
        const b = e.target.closest('[data-e],[data-a="e-type"]'); if (!b) return;
        if (b.dataset.a === 'e-type') {
          e.stopPropagation();
          if (f.type === b.dataset.v) return;
          f.type = b.dataset.v;
          el.querySelectorAll('[data-a=e-type]').forEach(x => x.classList.toggle('on', x.dataset.v === f.type));
          const lc = (D.set.lastCat || {})[f.type];
          f.cat = lc && catsOfType(f.type).some(c => c.id === lc) ? lc : firstCat(f.type);
          drawCats(); return;
        }
        const a = b.dataset.e;
        if (a === 'cat') { f.cat = b.dataset.id; el.querySelectorAll('.cat').forEach(x => x.classList.toggle('on', x.dataset.id === f.cat)); drawSugg(); }
        else if (a === 'cat-edit') { openCatManager(f.type, () => drawCats()); }
        else if (a === 'pay-pick') {
          const v = await pickSheet('付款方式', D.pays.filter(p => !p.hide || p.id === f.pay).map(p => ({ value: p.id, label: p.name, icon: p.icon })).concat([{ value: '_none', label: '不指定', icon: '—' }]), f.pay || '_none');
          if (v) { f.pay = v === '_none' ? '' : v; drawMeta(); }
        }
        else if (a === 'sugg') { f.note = b.textContent; note.value = f.note; }
        else if (a === 'd') { f.date = addDays(f.date, +b.dataset.v); drawMeta(); }
        else if (a === 'cur') {
          const items = [{ value: 'TWD', label: '新台幣 NT$', icon: '🇹🇼' }].concat(D.curs.map(c => ({ value: c.code, label: c.name + ' ' + c.code, icon: c.sym, sub: c.rate ? `1 ${c.name} = ${c.rate} 台幣` : '尚未設定匯率' })));
          const v = await pickSheet('選擇幣別', items, f.cur);
          if (v) {
            f.cur = v;
            const c = curOf(v); f.rate = c && c.rate ? c.rate : null;
            q('.en-fx').innerHTML = '';
            drawAmt();
            if (v !== 'TWD' && !f.rate) setTimeout(() => { const ri = q('#e-rate'); if (ri) ri.focus(); }, 80);
          }
        }
        else if (a === 'delete') {
          if (await confirmBox('確定要刪除這筆紀錄嗎？', '刪除', true)) {
            D.tx = D.tx.filter(t => t.id !== tx.id); save(); closeLayer(L); renderAll(); toast('已刪除');
          }
        }
        else if (a === 'skip') {
          if (await confirmBox('略過這次的固定收支？這筆不會記入帳本。', '略過', true)) {
            D.tx = D.tx.filter(t => t.id !== tx.id); save(); closeLayer(L); renderAll(); toast('已略過');
          }
        }
      });
      drawAmt(); drawCats(); drawMeta();
    }
  });
}

function saveEntry(f, isNew, old, el) {
  const v = r2(evalExpr(f.expr));
  if (isNaN(v)) { toast('算式有誤（不能除以 0）', 'warn'); return; }
  if (!(v > 0)) { toast('請先輸入金額', 'warn'); shake(el.querySelector('.amt-disp')); return; }
  if (!f.cat) { toast('請選擇分類', 'warn'); return; }
  let amt = v, rate = 1;
  if (f.cur !== 'TWD') {
    rate = parseFloat(f.rate);
    if (!(rate > 0)) { toast('請輸入匯率', 'warn'); const ri = el.querySelector('#e-rate'); if (ri) ri.focus(); return; }
    amt = Math.round(v * rate);     // 換算成台幣取整數
    const c = curOf(f.cur); if (c) c.rate = rate;    // 記住這次的匯率
  }
  const mk = monthKey(f.date);
  const bCat = monthSpent(mk, f.cat), bTot = monthSpent(mk);
  const rec = {
    id: f.id || uid(), type: f.type, date: f.date, amt, cat: f.cat, pay: f.pay || '', note: (f.note || '').trim(),
    cur: f.cur, orig: v, rate, rec: f.rec || null, pending: false, ts: f.ts || Date.now()
  };
  const i = D.tx.findIndex(t => t.id === rec.id);
  if (i >= 0) D.tx[i] = rec; else D.tx.push(rec);
  D.set.lastCat = D.set.lastCat || {}; D.set.lastCat[f.type] = f.cat;
  if (f.pay) D.set.lastPay = f.pay;
  if (isNew) { D.set.lastCur = f.cur; D.set.lastCurTs = Date.now(); }
  save();
  closeLayer();
  if (isNew && S.tab === 'list' && mk !== S.month) S.month = mk;
  renderAll();
  // 預算提醒
  if (f.type === 'out' && mk === curMonth()) {     // 只提醒本月
    const aCat = monthSpent(mk, f.cat), aTot = monthSpent(mk);
    const msgs = [];
    const chk = (name, before, after, budget) => {
      if (!budget) return;
      const al = D.budget.alert || 80, pb = before / budget * 100, pa = after / budget * 100;
      if (pa > 100 && pb <= 100) msgs.push({ big: true, k: 'crit', t: `⛔ ${name}已超支 ${money(after - budget)}（預算 ${money(budget)}）` });
      else if (pa > 100) msgs.push({ k: 'crit', t: `⛔ ${name}已超支 ${money(after - budget)}` });
      else if (pa >= al && pb < al) msgs.push({ big: true, k: 'warn', t: `⚠️ ${name}已用 ${Math.floor(pa)}% 預算，還剩 ${money(budget - after)}` });
    };
    const ml = monthLabel(mk).slice(5);
    chk(`${ml}「${catOf(f.cat).name}」`, bCat, aCat, (D.budget.cats || {})[f.cat]);
    chk(`${ml}總預算`, bTot, aTot, D.budget.total);
    if (msgs.some(m => m.big)) { alertBox(msgs.map(m => esc(m.t)).join('<br>'), '預算提醒'); return; }
    if (msgs.length) { toast((old ? '已更新' : '已儲存') + '<br>' + msgs.map(m => esc(m.t)).join('<br>'), msgs[0].k, 3800); return; }
  }
  toast(old && old.pending ? '已確認入帳' : old ? '已更新' : '已儲存');
}
