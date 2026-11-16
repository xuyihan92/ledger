'use strict';
/* ============ 設定 ============ */
const FONT_OPTS = [[0.9, '小'], [1, '標準'], [1.15, '大'], [1.3, '特大'], [1.5, '超大']];
const THEME_OPTS = [['auto', '跟隨手機設定'], ['light', '淺色'], ['dark', '深色']];

function srow(action, icon, label, value, cls) {
  return `<button class="srow ${cls || ''}" data-a="${action}"><span class="s-ic">${icon}</span><span class="s-l">${label}</span><span class="s-v">${value || ''}</span><span class="s-ch">${ICON.right}</span></button>`;
}
function viewSettings() {
  const fontName = (FONT_OPTS.find(f => f[0] === D.set.font) || [0, '標準'])[1];
  const themeName = (THEME_OPTS.find(t => t[0] === D.set.theme) || [0, '跟隨手機設定'])[1];
  const nRec = D.recs.filter(r => r.on).length;
  const nCur = D.curs.filter(c => c.rate > 0).length;
  return `<div class="page-head"><h1>設定</h1></div>
  <section class="sgroup"><h4>外觀</h4>
    ${srow('set-font', '🔠', '字體大小', fontName)}
    ${srow('set-theme', '🌗', '深色模式', themeName)}
  </section>
  <section class="sgroup"><h4>記帳</h4>
    ${srow('set-rec', '🔁', '固定收支（自動記帳）', nRec ? nRec + ' 項' : '尚未設定')}
    ${srow('set-cats', '🗂️', '支出／收入分類', catsOfType('out').length + catsOfType('in').length + ' 個')}
    ${srow('set-pays', '💳', '付款方式', D.pays.filter(p => !p.hide).length + ' 種')}
    ${srow('set-cur', '💱', '外幣匯率', nCur ? '已設定 ' + nCur + ' 種' : '尚未設定')}
    ${srow('b-edit', '🎯', '預算', D.budget.total ? '每月 ' + num(D.budget.total, 0) : '尚未設定')}
  </section>
  <section class="sgroup"><h4>安全</h4>
    ${srow('set-lock', '🔒', '開啟 App 要輸入密碼', D.set.lock ? '已開啟' : '關閉')}
    ${D.set.lock ? srow('set-pin', '🔑', '變更密碼', '') : ''}
  </section>
  <section class="sgroup"><h4>資料</h4>
    ${srow('set-csv', '📊', '匯出 Excel 檔（CSV）', '')}
    ${srow('set-backup', '💾', '備份資料（存成檔案）', '')}
    ${srow('set-restore', '📂', '從備份檔還原', '')}
    ${srow('set-auto', '🕘', '自動備份紀錄', '每天 1 份')}
    ${srow('set-clear', '🗑️', '清除所有記帳紀錄', '', 'danger-row')}
  </section>
  <section class="sgroup"><h4>關於</h4>
    <div class="about"><b>記帳</b> 1.0.1<br>資料只存在這支手機裡，不會上傳到網路。換手機前，請先用「備份資料」存一份檔案（可存到${BR ? ' Google 雲端硬碟' : '「檔案」App 或 iCloud 雲碟'}），到新手機再「從備份檔還原」。${!BR && IS_IOS ? '<br><br>iPhone 提醒：請固定從主畫面的「記帳」圖示開啟。用 Safari 分頁開的是另一份資料。' : ''}</div>
  </section>`;
}

function applyFont() { document.documentElement.style.fontSize = (16 * (D.set.font || 1)) + 'px'; }
function sysDark() {
  try { if (BR && BR.isDarkMode) return !!BR.isDarkMode(); } catch (e) { }
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme() {
  const dark = D.set.theme === 'dark' || (D.set.theme === 'auto' && sysDark());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--page').trim() || (dark ? '#0e131c' : '#eef0f3');
  try { if (BR && BR.setBars) BR.setBars(bg, !dark); } catch (e) { }
  document.querySelectorAll('meta[name=theme-color]').forEach(m => m.setAttribute('content', bg));
}

/* ----- 分類／付款方式管理 ----- */
function openCatManager(type, onChange) {
  let t = type || 'out';
  pushScreen({
    title: '分類管理',
    onClose: () => { if (onChange) onChange(); renderMain(); },
    body: () => {
      const list = D.cats.filter(c => c.type === t);
      return `<div class="pad">${seg('cm-type', [['out', '支出分類'], ['in', '收入分類']], t)}</div>
        <p class="muted small pad-x">點一下可修改名稱、圖示或隱藏；用箭頭調整順序。</p>
        <div class="mlist">${list.map((c, i) => mrowHTML(c, i, list.length)).join('')}</div>
        <div class="pad"><button class="btn primary big" data-m="add">＋ 新增${t === 'out' ? '支出' : '收入'}分類</button></div>`;
    },
    mount: (el, L) => {
      el.querySelectorAll('[data-a=cm-type]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); t = b.dataset.v; L.render(); }));
      bindManager(el, L, () => D.cats.filter(c => c.type === t), list => {
        const others = D.cats.filter(c => c.type !== t); D.cats = t === 'out' ? list.concat(others) : others.concat(list);
      }, { kind: 'cat', type: () => t });
    }
  });
}
function openPayManager() {
  pushScreen({
    title: '付款方式',
    onClose: () => renderMain(),
    body: () => `<p class="muted small pad-x">點一下可修改名稱、圖示或隱藏；用箭頭調整順序。</p>
      <div class="mlist">${D.pays.map((p, i) => mrowHTML(p, i, D.pays.length)).join('')}</div>
      <div class="pad"><button class="btn primary big" data-m="add">＋ 新增付款方式</button></div>`,
    mount: (el, L) => bindManager(el, L, () => D.pays, list => { D.pays = list; }, { kind: 'pay' })
  });
}
function mrowHTML(it, i, n) {
  return `<div class="mrow ${it.hide ? 'hidden' : ''}">
    <button class="mr-main" data-m="edit" data-id="${it.id}"><span class="ic">${it.icon}</span><span class="mr-name">${esc(it.name)}${it.hide ? '<small>已隱藏</small>' : ''}</span></button>
    <button class="icon-btn" data-m="up" data-id="${it.id}" ${i === 0 ? 'disabled' : ''} aria-label="上移">${ICON.up}</button>
    <button class="icon-btn" data-m="down" data-id="${it.id}" ${i === n - 1 ? 'disabled' : ''} aria-label="下移">${ICON.down}</button>
  </div>`;
}
function bindManager(el, L, getList, setList, o) {
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const list = getList().slice();
    const id = b.dataset.id, i = list.findIndex(x => x.id === id);
    if (b.dataset.m === 'up' && i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; setList(list); save(); L.render(); }
    else if (b.dataset.m === 'down' && i >= 0 && i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; setList(list); save(); L.render(); }
    else if (b.dataset.m === 'edit' || b.dataset.m === 'add') {
      const it = b.dataset.m === 'edit' ? list[i] : null;
      const res = await itemEditor(it, o.kind);
      if (!res) return;
      if (res === 'delete') {
        const used = D.tx.filter(t => o.kind === 'cat' ? t.cat === it.id : t.pay === it.id).length + D.recs.filter(r => o.kind === 'cat' ? r.cat === it.id : r.pay === it.id).length;
        if (used) { await alertBox(`已有 ${used} 筆紀錄或固定收支使用「${esc(it.name)}」，不能刪除。<br>可以改成「隱藏」，記帳時就不會出現。`); return; }
        if (!(await confirmBox(`確定刪除「${esc(it.name)}」？`, '刪除', true))) return;
        setList(list.filter(x => x.id !== it.id));
      } else if (it) { it.name = res.name; it.icon = res.icon; it.hide = res.hide; setList(list); }
      else {
        const n = { id: uid(), name: res.name, icon: res.icon, hide: res.hide };
        if (o.kind === 'cat') n.type = o.type();
        list.push(n); setList(list);
      }
      save(); L.render();
    }
  });
}
function itemEditor(it, kind) {
  let icon = it ? it.icon : (kind === 'cat' ? '📦' : '💵');
  const what = kind === 'cat' ? '分類' : '付款方式';
  return modal({
    title: it ? '修改' + what : '新增' + what,
    html: `<label class="fl">名稱<input class="inp" id="it-name" maxlength="16" value="${it ? esc(it.name) : ''}" placeholder="例如：${kind === 'cat' ? '寵物、醫療' : 'LINE Pay'}"></label>
      <div class="fl">圖示</div><div class="emoji-grid">${EMOJIS.map(e => `<button class="${e === icon ? 'on' : ''}" data-emo="${e}">${e}</button>`).join('')}</div>
      <label class="switch-row"><span>隱藏（記帳時不顯示）</span><input type="checkbox" id="it-hide" ${it && it.hide ? 'checked' : ''}></label>`,
    buttons: (it ? [{ label: '刪除', value: 'delete', cls: 'danger-t' }] : []).concat([{ label: '取消', value: null }, {
      label: '儲存', cls: 'primary', value: el => {
        const name = el.querySelector('#it-name').value.trim();
        if (!name) { toast('請輸入名稱', 'warn'); return undefined; }
        return { name, icon, hide: el.querySelector('#it-hide').checked };
      }
    }]),
    mount: el => {
      el.querySelector('.emoji-grid').addEventListener('click', e => {
        const b = e.target.closest('[data-emo]'); if (!b) return;
        icon = b.dataset.emo;
        el.querySelectorAll('[data-emo]').forEach(x => x.classList.toggle('on', x === b));
      });
    }
  });
}

/* ----- 外幣匯率 ----- */
function openCurrencies() {
  pushScreen({
    title: '外幣匯率',
    onClose: () => renderMain(),
    body: () => `<p class="muted small pad-x">請自行輸入匯率：1 單位外幣可換多少新台幣。記帳時也可以臨時修改，App 會記住最後一次用的匯率。</p>
      <div class="mlist">${D.curs.map(c => `<div class="cur-row">
        <span class="sym">${esc(c.sym)}</span><span class="cr-name">${esc(c.name)}<small>${esc(c.code)}</small></span>
        <span class="cr-eq">1 =</span><input class="inp xs" inputmode="decimal" data-rate="${esc(c.code)}" value="${c.rate || ''}" placeholder="未設定"><span class="cr-eq">台幣</span>
        ${c.custom ? `<button class="icon-btn" data-cdel="${esc(c.code)}" aria-label="刪除">${ICON.trash}</button>` : ''}
      </div>`).join('')}</div>
      <div class="pad"><button class="btn big" data-cadd="1">＋ 新增其他幣別</button></div>`,
    mount: (el, L) => {
      el.querySelectorAll('[data-rate]').forEach(i => i.addEventListener('change', () => {
        const c = curOf(i.dataset.rate), v = parseFloat(i.value);
        c.rate = v > 0 ? v : null; i.value = c.rate || ''; save(); toast(c.rate ? `已設定 1 ${c.name} = ${c.rate} 台幣` : `已清除${c.name}匯率`);
      }));
      el.addEventListener('click', async e => {
        const del = e.target.closest('[data-cdel]');
        if (del) {
          const code = del.dataset.cdel;
          if (D.tx.some(t => t.cur === code) || D.recs.some(r => r.cur === code)) { alertBox('已有紀錄使用這個幣別，不能刪除。'); return; }
          D.curs = D.curs.filter(c => c.code !== code); save(); L.render(); return;
        }
        if (e.target.closest('[data-cadd]')) {
          const r = await modal({
            title: '新增幣別',
            html: `<label class="fl">中文名稱<input class="inp" id="c-name" placeholder="例如：瑞士法郎" maxlength="10"></label>
              <label class="fl">代碼<input class="inp" id="c-code" placeholder="例如：CHF" maxlength="5"></label>
              <label class="fl">符號<input class="inp" id="c-sym" placeholder="例如：Fr" maxlength="4"></label>
              <label class="fl">匯率（1 單位 = ? 台幣）<input class="inp" id="c-rate" inputmode="decimal"></label>`,
            buttons: [{ label: '取消', value: null }, {
              label: '新增', cls: 'primary', value: m => {
                const name = m.querySelector('#c-name').value.trim(), code = m.querySelector('#c-code').value.trim().toUpperCase();
                if (!name || !code) { toast('請填名稱和代碼', 'warn'); return undefined; }
                if (code === 'TWD' || curOf(code)) { toast('這個幣別已經有了', 'warn'); return undefined; }
                const rate = parseFloat(m.querySelector('#c-rate').value);
                return { code, name, sym: m.querySelector('#c-sym').value.trim() || code, rate: rate > 0 ? rate : null, custom: true };
              }
            }]
          });
          if (r) { D.curs.push(r); save(); L.render(); }
        }
      });
    }
  });
}

/* ----- 固定收支 ----- */
const REC_TPL = [
  { name: '外傭薪資', cat: 'helper', type: 'out', every: 1, confirm: false },
  { name: '健保費', cat: 'nhi', type: 'out', every: 1, confirm: false },
  { name: 'Wi-Fi 網路費', cat: 'net', type: 'out', every: 1, confirm: false },
  { name: '手機網卡費', cat: 'net', type: 'out', every: 1, confirm: false },
  { name: '電費', cat: 'util', type: 'out', every: 2, confirm: true },
  { name: '水費', cat: 'util', type: 'out', every: 2, confirm: true },
  { name: '給父母零用錢', cat: 'allow', type: 'out', every: 1, confirm: false },
  { name: '薪資', cat: 'salary', type: 'in', every: 1, confirm: false }
];
function openRecurringList() {
  pushScreen({
    title: '固定收支（自動記帳）',
    onClose: () => renderMain(),
    body: () => {
      const t = today();
      const rows = D.recs.map(r => {
        const c = catOf(r.cat), nx = r.on ? nextOcc(r, r.last || '') : null;
        const ended = r.end && nx && nx > r.end;
        return `<button class="row" data-r="${r.id}">
          <span class="ic">${c.icon}</span>
          <span class="row-mid"><span class="row-t">${esc(r.name || c.name)}${r.confirm ? '<span class="tag">待確認</span>' : ''}</span>
            <span class="row-s"><span>${recDesc(r)}</span><span>${!r.on ? '已暫停' : ended || !nx ? '已結束' : '下次 ' + (nx === t ? '今天' : shortDay(nx) + (nx.slice(0, 4) !== t.slice(0, 4) ? '（' + nx.slice(0, 4) + '）' : ''))}</span></span></span>
          <span class="row-r"><span class="amt ${r.type === 'in' ? 'inc' : ''}">${r.cur !== 'TWD' ? esc(curSym(r.cur)) + ' ' : ''}${num(r.amt, 2)}</span></span>
        </button>`;
      }).join('');
      return `<p class="muted small pad-x">到期日會自動記一筆。像水電這種每次金額不同的，可以勾選「到期時先讓我確認金額」，到期時會列在明細最上方等你確認。</p>
        ${rows ? `<div class="card-list">${rows}</div>` : ''}
        <h4 class="fsub pad-x">快速新增</h4>
        <div class="tpl">${REC_TPL.map((t, i) => `<button class="chip" data-tpl="${i}">${catOf(t.cat).icon} ${esc(t.name)}</button>`).join('')}</div>
        <div class="pad"><button class="btn primary big" data-tpl="-1">＋ 自訂固定收支</button></div>`;
    },
    mount: (el, L) => {
      el.addEventListener('click', e => {
        const r = e.target.closest('[data-r]');
        if (r) { openRecurringEditor(D.recs.find(x => x.id === r.dataset.r), null, L); return; }
        const tp = e.target.closest('[data-tpl]');
        if (tp) openRecurringEditor(null, +tp.dataset.tpl >= 0 ? REC_TPL[+tp.dataset.tpl] : null, L);
      });
    }
  });
}
function openRecurringEditor(r, tpl, listLayer) {
  const isNew = !r;
  const t0 = today();
  const f = r ? Object.assign({}, r) : {
    id: uid(), type: (tpl && tpl.type) || 'out', name: tpl ? tpl.name : '', amt: '', cur: 'TWD', cat: tpl ? tpl.cat : '', pay: D.set.lastPay || 'cash',
    unit: 'month', every: tpl ? tpl.every : 1, day: +t0.slice(8), start: t0, end: '', confirm: tpl ? tpl.confirm : false, on: true, last: ''
  };
  if (!f.cat || catOf(f.cat).type !== f.type || !D.cats.some(c => c.id === f.cat)) f.cat = firstCat(f.type);
  const L = pushScreen({
    title: isNew ? '新增固定收支' : '修改固定收支', static: true,
    body: () => {
      const fk = freqOf(f).k;
      const dayOpts = f.unit === 'week' ? WD.map((w, i) => `<option value="${i}" ${f.day === i ? 'selected' : ''}>週${w}</option>`).join('')
        : Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${f.day === i + 1 ? 'selected' : ''}>${i === 30 ? '31 日（遇小月就在月底）' : (i + 1) + ' 日'}</option>`).join('');
      return `<div class="form">
        ${seg('rf-type', [['out', '支出'], ['in', '收入']], f.type)}
        <label class="fl">名稱<input class="inp" id="rf-name" value="${esc(f.name)}" placeholder="例如：外傭薪資" maxlength="30"></label>
        <div class="fl-2">
          <label class="fl">金額<input class="inp" id="rf-amt" inputmode="decimal" value="${f.amt === '' ? '' : f.amt}" placeholder="${f.confirm ? '大約金額' : '0'}"></label>
          <label class="fl">幣別<select class="inp" id="rf-cur"><option value="TWD">新台幣</option>${D.curs.map(c => `<option value="${esc(c.code)}" ${f.cur === c.code ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        </div>
        <label class="fl">分類<select class="inp" id="rf-cat">${catsOfType(f.type, true).map(c => `<option value="${c.id}" ${f.cat === c.id ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</select></label>
        <label class="fl">付款方式<select class="inp" id="rf-pay"><option value="">（不指定）</option>${D.pays.map(p => `<option value="${p.id}" ${f.pay === p.id ? 'selected' : ''}>${p.icon} ${esc(p.name)}</option>`).join('')}</select></label>
        <div class="fl-2">
          <label class="fl">多久一次<select class="inp" id="rf-freq">${FREQS.map(x => `<option value="${x.k}" ${x.k === fk ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
          <label class="fl">${f.unit === 'week' ? '星期幾' : '每次在幾號'}<select class="inp" id="rf-day">${dayOpts}</select></label>
        </div>
        <label class="fl">開始日期<input class="inp" type="date" id="rf-start" value="${f.start}"></label>
        ${f.unit === 'month' && f.every > 1 ? `<p class="muted small">從開始日期那個月起算，${freqOf(f).name}記一次。</p>` : ''}
        <label class="fl">結束日期（可不填）<input class="inp" type="date" id="rf-end" value="${f.end || ''}"></label>
        <label class="switch-row"><span>到期時先讓我確認金額<small>適合水電、信用卡等每次金額不同的</small></span><input type="checkbox" id="rf-confirm" ${f.confirm ? 'checked' : ''}></label>
        ${!isNew ? `<label class="switch-row"><span>啟用<small>關閉後就暫停自動記帳</small></span><input type="checkbox" id="rf-on" ${f.on ? 'checked' : ''}></label>` : ''}
        <div class="form-btns">
          <button class="btn primary big" data-rf="save">儲存</button>
          ${!isNew ? `<button class="btn ghost danger-t" data-rf="del">刪除這個固定收支</button>` : ''}
        </div>
        ${!isNew ? `<p class="muted small">修改只影響之後自動記的帳；已經記下的紀錄不會改變。</p>` : ''}
      </div>`;
    },
    mount: (el, L2) => {
      const q = s => el.querySelector(s);
      const read = () => {
        f.name = q('#rf-name').value.trim();
        f.amt = q('#rf-amt').value.trim();
        f.cur = q('#rf-cur').value; f.cat = q('#rf-cat').value; f.pay = q('#rf-pay').value;
        f.day = +q('#rf-day').value; f.start = q('#rf-start').value || t0; f.end = q('#rf-end').value || '';
        f.confirm = q('#rf-confirm').checked; if (q('#rf-on')) f.on = q('#rf-on').checked;
      };
      q('#rf-freq').addEventListener('change', e => {
        read();
        const fr = FREQS.find(x => x.k === e.target.value);
        const wasWeek = f.unit === 'week';
        f.unit = fr.unit; f.every = fr.every;
        if (f.unit === 'week' && !wasWeek) f.day = pd(f.start).getDay();
        if (f.unit === 'month' && wasWeek) f.day = +f.start.slice(8);
        L2.render();
      });
      el.querySelectorAll('[data-a=rf-type]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation(); read(); f.type = b.dataset.v; f.cat = firstCat(f.type); L2.render();
      }));
      el.addEventListener('click', async e => {
        const b = e.target.closest('[data-rf]'); if (!b) return;
        read();
        if (b.dataset.rf === 'del') {
          if (await confirmBox(`刪除「${esc(f.name || catOf(f.cat).name)}」？之後不會再自動記帳，已經記下的紀錄會保留。`, '刪除', true)) {
            D.recs = D.recs.filter(x => x.id !== f.id);
            D.tx.forEach(t => { if (t.rec === f.id && t.pending) t._drop = true; });
            D.tx = D.tx.filter(t => !t._drop);
            save(); closeLayer(L2); if (listLayer) listLayer.render(); renderMain(); toast('已刪除');
          }
          return;
        }
        const amt = parseFloat(String(f.amt).replace(/,/g, ''));
        if (!(amt > 0) && !f.confirm) { toast('請輸入金額', 'warn'); q('#rf-amt').focus(); return; }
        if (f.end && f.end < f.start) { toast('結束日期不能早於開始日期', 'warn'); return; }
        const rec = Object.assign({}, f, { amt: amt > 0 ? r2(amt) : 0 });
        if (isNew) {
          const n = countBackfill(rec);
          if (n > 1 && !(await confirmBox(`開始日期在今天以前，儲存後會補記 ${n} 筆過去的紀錄。要繼續嗎？`, '繼續'))) return;
          D.recs.push(rec);
        } else D.recs[D.recs.findIndex(x => x.id === rec.id)] = rec;
        const made = runRecurring();
        save(); closeLayer(L2); if (listLayer) listLayer.render(); renderMain();
        toast(made ? `已儲存，並自動記下 ${made} 筆` : '已儲存，下次 ' + (nextOcc(rec, rec.last || '') || '—'));
      });
    }
  });
  return L;
}

/* ----- 密碼鎖 ----- */
function askPin(title, sub, len) {
  return modal({
    html: pinPadHTML(title, sub), buttons: [{ label: '取消', value: null }],
    mount: (el, L) => { el.querySelector('.modal').classList.add('pin-modal'); bindPinPad(el, { len, min: 4, max: 6, onDone: p => closeLayer(L, p) }); }
  });
}
async function verifyPin() {
  for (let i = 0; i < 5; i++) {
    const p = await askPin(i ? '密碼錯誤，請再試一次' : '請輸入目前的密碼', '', D.set.pinLen);
    if (p == null) return false;
    if (hashPin(D.set.pinSalt, p) === D.set.pinHash) return true;
  }
  return false;
}
async function setupPin() {
  const p1 = await askPin('設定新密碼', '請輸入 4～6 位數字，再按「確定」');
  if (!p1) return false;
  const p2 = await askPin('再輸入一次', '確認新密碼', p1.length);
  if (!p2) return false;
  if (p1 !== p2) { await alertBox('兩次輸入的密碼不一樣，請重新設定。'); return false; }
  const hint = await modal({
    title: '密碼提示（可不填）',
    html: `<p class="muted small">忘記密碼時會顯示這段提示。請不要直接寫出密碼。</p><input class="inp" id="hint" maxlength="40" placeholder="例如：老家的門牌號碼" value="${esc(D.set.pinHint || '')}">`,
    buttons: [{ label: '完成', cls: 'primary', value: el => el.querySelector('#hint').value.trim() }]
  });
  D.set.pinSalt = uid(); D.set.pinHash = hashPin(D.set.pinSalt, p1); D.set.pinLen = p1.length; D.set.pinHint = hint || ''; D.set.lock = true;
  save(); return true;
}
async function toggleLock() {
  if (!D.set.lock) {
    if (await setupPin()) { renderMain(); toast('已開啟密碼鎖，離開 App 超過 30 秒後回來要輸入密碼', '', 3500); }
  } else {
    const r = await pickSheet('密碼鎖', [{ value: 'off', label: '關閉密碼鎖' }, { value: 'hint', label: '修改密碼提示', sub: D.set.pinHint || '目前沒有提示' }], null);
    if (r === 'off' && await verifyPin()) { D.set.lock = false; D.set.pinHash = ''; save(); renderMain(); toast('已關閉密碼鎖'); }
    if (r === 'hint' && await verifyPin()) {
      const h = await modal({ title: '密碼提示', html: `<input class="inp" id="hint" maxlength="40" value="${esc(D.set.pinHint || '')}">`, buttons: [{ label: '取消', value: null }, { label: '儲存', cls: 'primary', value: el => el.querySelector('#hint').value.trim() }] });
      if (h != null) { D.set.pinHint = h; save(); toast('已更新提示'); }
    }
  }
}
async function changePin() { if (await verifyPin() && await setupPin()) toast('已變更密碼'); }

let lockFails = 0, lockUntil = 0;
function isLocked() { return document.getElementById('lock').classList.contains('on'); }
function showLock() {
  if (!D.set.lock || isLocked()) return;
  const el = document.getElementById('lock');
  el.className = 'lock on';
  el.innerHTML = `<div class="lock-in"><div class="lock-logo">📒</div>${pinPadHTML('請輸入密碼', '記帳')}
    <button class="link-btn" id="lk-forgot">忘記密碼？</button><div class="lock-msg" id="lk-msg"></div></div>`;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const sub = el.querySelector('.pin-sub');
  const pp = bindPinPad(el, {
    len: D.set.pinLen || 4, onDone: pin => {
      if (Date.now() < lockUntil) { pp.reset(); return; }
      if (hashPin(D.set.pinSalt, pin) === D.set.pinHash) { lockFails = 0; el.className = 'lock'; el.innerHTML = ''; return; }
      lockFails++; pp.shake(); pp.reset();
      if (lockFails >= 5) {
        lockUntil = Date.now() + 30000; lockFails = 0;
        sub.textContent = '錯誤太多次，請 30 秒後再試';
        setTimeout(() => { if (sub.isConnected) sub.textContent = '請再試一次'; }, 30000);
      } else sub.textContent = `密碼錯誤（還可以試 ${5 - lockFails} 次）`;
    }
  });
  el.querySelector('#lk-forgot').addEventListener('click', () => {
    el.querySelector('#lk-msg').innerHTML = (D.set.pinHint ? `密碼提示：<b>${esc(D.set.pinHint)}</b><br><br>` : '沒有設定密碼提示。<br><br>') +
      (BR ? '如果真的想不起來，只能到手機的「設定 → 應用程式 → 記帳 → 儲存空間 → 清除資料」重新開始，但帳本資料也會一起清除（之後可用備份檔還原）。'
        : '如果真的想不起來，只能長按主畫面的「記帳」圖示刪除，再用 Safari 重新加入主畫面，但帳本資料也會一起清除（之後可用備份檔還原）。');
  });
}

/* ----- 匯出／備份／還原 ----- */
let picking = false;      // 正在選檔／分享時，回來不要上鎖
function downloadFile(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  toast('已下載 ' + esc(file.name));
}
function shareFile(file) {
  picking = true;
  return navigator.share({ files: [file], title: file.name })
    .then(() => toast('已分享／儲存檔案'))
    .catch(e => { if (e && e.name === 'AbortError') toast('沒有儲存', 'warn'); else throw e; })
    .finally(() => setTimeout(() => { picking = false; }, 1500));
}
async function saveFileOut(name, mime, content) {
  if (BR && BR.saveFile) { BR.saveFile(name, mime, content); return; }
  // iPhone：用「分享」面板，可選「儲存到檔案」、iCloud、LINE、Email
  let file = null;
  if (navigator.share && navigator.canShare) {
    for (const m of [mime, 'text/plain']) {
      const f = new File([content], name, { type: m });
      try { if (navigator.canShare({ files: [f] })) { file = f; break; } } catch (e) { }
    }
  }
  if (!file) { downloadFile(new File([content], name, { type: mime })); return; }
  try { await shareFile(file); }
  catch (e) {
    // 有些情況需要再按一次按鈕才能打開分享面板
    modal({
      title: '檔案準備好了', html: `<p><b>${esc(name)}</b></p><p class="muted small">按「儲存檔案」後選「儲存到檔案」，就能存到 iPhone 或 iCloud 雲碟，也可以傳到 LINE 或 Email。</p>`,
      buttons: [{ label: '取消', value: null }, { label: '儲存檔案', cls: 'primary', value: () => { shareFile(file).catch(() => downloadFile(file)); return true; } }]
    });
  }
}
window.onFileSaved = (ok, msg) => { toast(ok ? '已儲存檔案' + (msg ? '：' + esc(msg) : '') : '沒有儲存' + (msg ? '（' + esc(msg) + '）' : ''), ok ? '' : 'warn', 3000); };
async function exportCSV() {
  const y = today().slice(0, 4);
  const v = await pickSheet('匯出哪段期間？', [
    { value: 'm', label: '本月（' + monthLabel(curMonth()) + '）' }, { value: 'pm', label: '選擇某個月份' },
    { value: 'y', label: '今年（' + y + ' 年）' }, { value: 'py', label: '去年（' + (y - 1) + ' 年）' }, { value: 'all', label: '全部紀錄' }], null);
  if (!v) return;
  let a = '0000-00-00', b = '9999-12-31', label = '全部';
  if (v === 'm') { [a, b] = monthRange(curMonth()); label = monthLabel(curMonth()); }
  if (v === 'pm') { const mk = await monthPicker(curMonth()); if (!mk) return;[a, b] = monthRange(mk); label = monthLabel(mk); }
  if (v === 'y') { a = y + '-01-01'; b = y + '-12-31'; label = y + '年'; }
  if (v === 'py') { a = (y - 1) + '-01-01'; b = (y - 1) + '-12-31'; label = (y - 1) + '年'; }
  const list = txRange(a, b);
  if (!list.length) { toast('這段期間沒有紀錄', 'warn'); return; }
  saveFileOut('記帳_' + label + '.csv', 'text/csv', buildCSV(list));
}
function backupData() {
  const payload = JSON.stringify({ app: 'family-ledger', v: 1, exportedAt: new Date().toISOString(), data: D }, null, 1);
  saveFileOut('記帳備份_' + today() + '.json', 'application/json', payload);
}
function restoreData() {
  if (BR && BR.openFile) { BR.openFile(); return; }
  const inp = document.createElement('input'); inp.type = 'file';
  inp.style.display = 'none'; document.body.appendChild(inp);
  picking = true;
  inp.onchange = () => {
    const f = inp.files[0]; inp.remove(); setTimeout(() => { picking = false; }, 1500);
    if (!f) return;
    const r = new FileReader(); r.onload = () => window.onFileOpened(String(r.result).replace(/^\uFEFF/, '')); r.readAsText(f);
  };
  inp.click();
}
window.onFileOpened = async (text, srcLabel) => {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { alertBox('這個檔案不是「記帳」App 的備份檔（無法讀取）。'); return; }
  const data = obj && obj.data ? obj.data : obj;
  if (!data || !Array.isArray(data.tx) || !Array.isArray(data.cats)) { alertBox('這個檔案不是「記帳」App 的備份檔。'); return; }
  const n = data.tx.length;
  const dates = data.tx.map(t => t.date).sort();
  const when = obj.exportedAt ? new Date(obj.exportedAt).toLocaleString('zh-TW', { hour12: false }) : (srcLabel || '');
  const ok = await confirmBox(`備份檔有 <b>${n}</b> 筆紀錄${n ? `（${dates[0]}～${dates[n - 1]}）` : ''}${when ? `，建立於 ${esc(when)}` : ''}。<br><br>還原後會<b>取代</b>手機上目前的所有資料，確定要還原嗎？`, '還原', true, '從備份還原');
  if (!ok) return;
  const keepLock = { lock: D.set.lock, pinHash: D.set.pinHash, pinSalt: D.set.pinSalt, pinLen: D.set.pinLen, pinHint: D.set.pinHint };
  D = normalize(data);
  Object.assign(D.set, keepLock);     // 密碼沿用這支手機目前的設定
  runRecurring(); save(); applyFont(); applyTheme();
  while (layers.length) closeLayer(layers[layers.length - 1]);
  S.tab = 'list'; S.month = curMonth(); renderMain();
  toast('已還原 ' + n + ' 筆紀錄');
};
async function openAutoBackups() {
  const list = await listSnapshots();
  if (!list.length) { alertBox('目前還沒有自動備份。App 每天第一次儲存資料時，會自動保留前一天的資料（最多 14 份）。'); return; }
  const v = await pickSheet('選擇要還原的自動備份', list.map(b => ({ value: b.name, label: b.label, sub: b.count != null ? b.count + ' 筆紀錄' : '' })), null);
  if (!v) return;
  const txt = await readSnapshot(v);
  if (!txt) { alertBox('讀取備份失敗。'); return; }
  window.onFileOpened(txt, list.find(b => b.name === v).label);
}
async function clearAll() {
  if (!(await confirmBox('這會刪除所有記帳紀錄和固定收支（分類、預算和設定會保留）。<br>建議先「備份資料」。', '繼續', true, '清除所有記帳紀錄'))) return;
  if (!(await confirmBox('真的要清除嗎？這個動作無法復原。', '全部清除', true))) return;
  D.tx = []; D.recs = []; save(); renderMain(); toast('已清除');
}

/* ----- 歡迎 ----- */
function welcome() {
  modal({
    title: '歡迎使用「記帳」',
    html: `<ul class="wl">
      <li><b>＋</b> 右下角按鈕可以記一筆支出或收入，金額鍵盤可直接算加減乘除。</li>
      <li><b>🔁</b> 外傭薪資、健保、網路費、水電等，可到「設定 → 固定收支」設定，到期會自動記帳。</li>
      <li><b>🎯</b> 在「預算」設定每月預算，快超過時會提醒你。</li>
      <li><b>💾</b> 資料只存在這支手機，記得偶爾到「設定 → 備份資料」存一份。</li></ul>`,
    buttons: [{ label: '開始記帳', value: true, cls: 'primary' }]
  });
}
