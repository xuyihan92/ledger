'use strict';
/* ============ 事件處理 ============ */
const ACT = {
  'tab': v => { S.tab = v; renderMain(); },
  'fab': () => openEntry(null, S.tab === 'stats' && S.smode === 'day' ? { date: S.sday } : null),
  'edit': (v, el) => { const t = D.tx.find(x => x.id === el.dataset.id); if (t) openEntry(t); },
  'm-shift': v => { S.month = shiftMonth(S.month, +v); renderMain(); },
  'm-now': () => { S.month = curMonth(); renderMain(); },
  'm-pick': async () => { const mk = await monthPicker(S.month); if (mk) { S.month = mk; renderMain(); } },
  'search': () => openSearch(),
  // 統計
  's-mode': v => { S.smode = v; S.ssel = ''; renderMain(); },
  's-shift': v => {
    v = +v;
    if (S.smode === 'day') S.sday = addDays(S.sday, v);
    else if (S.smode === 'year') S.syear += v;
    else S.smonth = shiftMonth(S.smonth, v);
    S.ssel = ''; renderMain();
  },
  's-pickmonth': async () => { const mk = await monthPicker(S.smonth); if (mk) { S.smonth = mk; S.ssel = ''; renderMain(); } },
  's-pickyear': async () => { const y = await yearPicker(S.syear); if (y) { S.syear = y; S.ssel = ''; renderMain(); } },
  's-bar': (v, el) => { const k = el.dataset.k; S.ssel = S.ssel === k ? '' : k; renderMain(); },
  's-day7': (v, el) => { S.sday = el.dataset.k; renderMain(); },
  's-goday': (v, el) => { S.smode = 'day'; S.sday = el.dataset.k; S.ssel = ''; renderMain(); },
  's-gomonth': (v, el) => { S.smode = 'month'; S.smonth = el.dataset.k; S.ssel = ''; renderMain(); },
  's-type': v => { S.stype = v; renderMain(); },
  's-fixed': v => { S.sfixed = v === '1'; renderMain(); },
  'pend-all': () => { S.pendAll = !S.pendAll; renderMain(); },
  'hide-install': () => { S.hideInstall = true; renderMain(); },
  's-group': v => { S.sgroup = v; renderMain(); },
  's-rank': (v, el) => openRankDetail(el.dataset.k),
  // 預算
  'b-shift': v => { S.bmonth = shiftMonth(S.bmonth, +v); renderMain(); },
  'b-pick': async () => { const mk = await monthPicker(S.bmonth); if (mk) { S.bmonth = mk; renderMain(); } },
  'b-edit': () => openBudgetEditor(),
  'b-save': (v, el) => saveBudgetEditor(el.closest('.screen')),
  // 設定
  'set-font': async () => {
    const v = await pickSheet('字體大小', FONT_OPTS.map(f => ({ value: f[0], label: f[1], sub: Math.round(f[0] * 100) + '%' })), D.set.font);
    if (v != null) { D.set.font = v; save(); applyFont(); renderAll(); }
  },
  'set-theme': async () => {
    const v = await pickSheet('深色模式', THEME_OPTS.map(t => ({ value: t[0], label: t[1] })), D.set.theme);
    if (v) { D.set.theme = v; save(); applyTheme(); renderAll(); }
  },
  'set-rec': () => openRecurringList(),
  'set-cats': () => openCatManager('out'),
  'set-pays': () => openPayManager(),
  'set-cur': () => openCurrencies(),
  'set-lock': () => toggleLock(),
  'set-pin': () => changePin(),
  'set-csv': () => exportCSV(),
  'set-backup': () => backupData(),
  'set-restore': () => restoreData(),
  'set-auto': () => openAutoBackups(),
  'set-clear': () => clearAll(),
  // 圖層
  'close-layer': () => closeLayer(),
  'modal-bg': () => { const L = topLayer(); if (L && L.kind === 'modal') closeLayer(L, null); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const f = ACT[el.dataset.a];
  if (f) { e.preventDefault(); f(el.dataset.v, el); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-ch]');
  if (!el) return;
  if (el.dataset.ch === 's-daypick' && el.value) { S.sday = el.value; renderMain(); }
});

/* ============ Android 返回鍵／回到前景 ============ */
window.handleBack = () => {
  if (isLocked()) return false;
  if (layers.length) { const L = topLayer(); closeLayer(L, L.kind === 'modal' ? null : undefined); return true; }
  if (S.tab !== 'list') { S.tab = 'list'; renderMain(); return true; }
  return false;
};
let lastDay = today();
window.onAppResume = secs => {
  if (D.set.lock && secs >= 30) showLock();
  applyTheme();
  const n = runRecurring();
  if (n || lastDay !== today()) {
    if (lastDay !== today()) { if (S.month === monthKey(lastDay)) S.month = curMonth(); lastDay = today(); }
    renderAll();
    if (n) toast(`已自動記下 ${n} 筆固定收支`);
  }
};
window.onSystemTheme = () => applyTheme();
if (!BR) {   // iPhone／網頁版：切到背景再回來時，比照 Android 處理上鎖與自動記帳
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (!hiddenAt) return;
    const secs = Math.round((Date.now() - hiddenAt) / 1000); hiddenAt = 0;
    if (picking) { const lk = D.set.lock; D.set.lock = false; window.onAppResume(secs); D.set.lock = lk; }
    else window.onAppResume(secs);
  });
  document.addEventListener('touchstart', () => { }, { passive: true });   // 讓 iPhone 的按下效果出現
}
window.addEventListener('resize', () => { if (S.tab === 'stats') renderMain(); });
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());

/* ============ 啟動 ============ */
(function init() {
  loadData();
  if (!D.set.welcomed) {   // 第一次開啟：字體大小跟手機設定接近
    try {
      const f = BR && BR.getFontScale ? +BR.getFontScale() : 1;
      D.set.font = FONT_OPTS.reduce((a, o) => Math.abs(o[0] - f) < Math.abs(a - f) ? o[0] : a, 1);
    } catch (e) { }
  }
  applyFont();
  applyTheme();
  if (D.set.lock) showLock();
  const n = runRecurring();
  renderMain();
  if (!BR) {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(() => { });
    }
  }
  if (!D.set.welcomed) { D.set.welcomed = true; save(); if (!D.set.lock) welcome(); }
  else if (n) toast(`已自動記下 ${n} 筆固定收支`);
})();
