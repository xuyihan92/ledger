'use strict';
/* ============ 提示訊息 ============ */
let toastTimer = null;
function toast(msg, kind, ms) {
  const el = document.getElementById('toast');
  el.className = 'toast show ' + (kind || '');
  el.innerHTML = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, ms || 2200);
}

/* ============ 圖層（全螢幕頁面與對話框） ============ */
const layers = [];   // {el, kind:'screen'|'modal', onClose, render}
function layerRoot() { return document.getElementById('layers'); }

function pushScreen(opt) {
  // opt: {title, body:()=>html, right:()=>html, mount:(el)=>{}, onClose, cls}
  const el = document.createElement('section');
  el.className = 'screen ' + (opt.cls || '');
  const L = { el, kind: 'screen', opt };
  L.render = () => {
    // 每次重畫都換一個新的內層容器，舊的事件監聽會跟著消失，不會重複綁定
    const old = el.querySelector('.scr-body');
    const st = old ? old.scrollTop : 0;
    const inner = document.createElement('div');
    inner.className = 'scr-inner';
    inner.innerHTML = `<header class="scr-head">
        <button class="icon-btn" data-a="close-layer" aria-label="返回">${ICON.back}</button>
        <h2>${esc(typeof opt.title === 'function' ? opt.title() : opt.title)}</h2>
        <span class="grow"></span>${opt.right ? opt.right() : ''}</header>
      <div class="scr-body">${opt.body()}</div>`;
    el.replaceChildren(inner);
    inner.querySelector('.scr-body').scrollTop = st;
    if (opt.mount) opt.mount(inner, L);
  };
  layers.push(L);
  layerRoot().appendChild(el);
  L.render();
  requestAnimationFrame(() => el.classList.add('in'));
  return L;
}
function topLayer() { return layers[layers.length - 1]; }
function closeLayer(L, result) {
  L = L || topLayer(); if (!L) return;
  const i = layers.indexOf(L); if (i < 0) return;
  layers.splice(i, 1);
  L.el.classList.remove('in');
  L.el.classList.add('out');
  setTimeout(() => L.el.remove(), 220);
  if (L.opt && L.opt.onClose) L.opt.onClose(result);
  if (L.resolve) L.resolve(result);
}
function refreshLayers() { for (const L of layers) if (L.kind === 'screen' && !L.opt.static) L.render(); }

/* 對話框：回傳 Promise */
function modal(opt) {
  // opt: {title, html, buttons:[{label, value, cls}], mount:(el,L)=>{}, dismiss:true}
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'modal-wrap';
    const btns = (opt.buttons || [{ label: '確定', value: true, cls: 'primary' }])
      .map((b, i) => `<button class="btn ${b.cls || ''}" data-mb="${i}">${esc(b.label)}</button>`).join('');
    el.innerHTML = `<div class="modal-bg" data-a="modal-bg"></div>
      <div class="modal" role="dialog">
        ${opt.title ? `<h3>${esc(opt.title)}</h3>` : ''}
        <div class="modal-body">${opt.html || ''}</div>
        ${btns ? `<div class="modal-btns">${btns}</div>` : ''}
      </div>`;
    const L = { el, kind: 'modal', opt, resolve };
    layers.push(L);
    layerRoot().appendChild(el);
    el.querySelectorAll('[data-mb]').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      const bd = opt.buttons[+b.dataset.mb];
      let v = bd.value;
      if (typeof v === 'function') { v = v(el); if (v === undefined) return; }   // 回傳 undefined 表示不關閉
      closeLayer(L, v);
    }));
    if (opt.mount) opt.mount(el, L);
    requestAnimationFrame(() => el.classList.add('in'));
  });
}
function confirmBox(msg, okLabel, danger, title) {
  return modal({
    title: title || '', html: `<p>${msg}</p>`,
    buttons: [{ label: '取消', value: false }, { label: okLabel || '確定', value: true, cls: danger ? 'danger' : 'primary' }]
  });
}
function alertBox(msg, title) { return modal({ title: title || '', html: `<p>${msg}</p>`, buttons: [{ label: '知道了', value: true, cls: 'primary' }] }); }

/* 選單（從底部滑出） */
function pickSheet(title, items, selected) {
  // items: [{value, label, icon, sub}]
  const html = `<div class="pick-list">${items.map((it, i) => `
      <button class="pick-item ${it.value === selected ? 'on' : ''}" data-pi="${i}">
        ${it.icon ? `<span class="pi-ic">${it.icon}</span>` : ''}
        <span class="pi-t">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>
        ${it.value === selected ? `<span class="pi-check">${ICON.check}</span>` : ''}
      </button>`).join('')}</div>`;
  return new Promise(resolve => {
    modal({
      title, html, buttons: [{ label: '取消', value: null }],
      mount: (el, L) => {
        el.querySelector('.modal').classList.add('sheet'); el.classList.add('sheet-wrap');
        el.querySelectorAll('[data-pi]').forEach(b => b.addEventListener('click', () => closeLayer(L, items[+b.dataset.pi].value)));
      }
    }).then(resolve);
  });
}

/* ============ 圖示（SVG） ============ */
const ICON = {
  back: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back1: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M10 7l-6 5 6 5M4 12h11a5 5 0 010 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  del: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 6h11v12H9l-6-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9.5l5 5M17 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  navList: '<svg viewBox="0 0 24 24" width="24" height="24"><rect x="4.5" y="3.5" width="15" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8.5h8M8 12h8M8 15.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  navStat: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M5 20V12M10 20V6M15 20v-9M20 20V9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  navBudget: '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/></svg>',
  navSet: '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M17 3l3 3-3 3M4 11V9a3 3 0 013-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 01-3 3H4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cal: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};

/* ============ 密碼輸入盤 ============ */
function pinPadHTML(title, sub) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
  return `<div class="pin">
    <div class="pin-title">${esc(title)}</div>
    <div class="pin-sub">${sub || ''}</div>
    <div class="pin-dots"></div>
    <div class="pin-keys">${keys.map(k => k === 'del' ? `<button class="pk fn" data-pk="del" aria-label="刪除">${ICON.del}</button>`
    : k === 'ok' ? `<button class="pk fn ok" data-pk="ok">確定</button>` : `<button class="pk" data-pk="${k}">${k}</button>`).join('')}</div>
  </div>`;
}
// 綁定密碼盤；cfg: {len: 固定長度(自動送出) 或 0, min:4, max:6, onDone(pin)}
function bindPinPad(root, cfg) {
  let v = '';
  const dots = root.querySelector('.pin-dots');
  const draw = () => {
    const n = cfg.len || Math.max(cfg.min || 4, v.length);
    let h = '';
    for (let i = 0; i < n; i++) h += `<i class="${i < v.length ? 'on' : ''}"></i>`;
    dots.innerHTML = h;
    const ok = root.querySelector('[data-pk=ok]');
    if (ok) ok.style.visibility = cfg.len ? 'hidden' : 'visible';
  };
  root.querySelectorAll('[data-pk]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.pk;
    if (k === 'del') v = v.slice(0, -1);
    else if (k === 'ok') {
      if (v.length < (cfg.min || 4)) { shake(dots); return; }
      cfg.onDone(v); return;
    } else if (v.length < (cfg.len || cfg.max || 6)) v += k;
    draw();
    if (cfg.len && v.length === cfg.len) setTimeout(() => cfg.onDone(v), 120);
  }));
  draw();
  return { reset: () => { v = ''; draw(); }, shake: () => shake(dots) };
}
function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

/* 分段切換按鈕 */
function seg(action, items, cur, cls) {
  return `<div class="seg ${cls || ''}">${items.map(it => `<button class="${it[0] === cur ? 'on' : ''}" data-a="${action}" data-v="${it[0]}">${esc(it[1])}</button>`).join('')}</div>`;
}
