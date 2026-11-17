'use strict';
/* ============ 基礎工具 ============ */
const BR = window.Android || null;           // Android 端橋接（iPhone／網頁版沒有）
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const WD = ['日', '一', '二', '三', '四', '五', '六'];

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function ymd(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }      // m: 0-11
function dstr(dt) { return ymd(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
function pd(s) { return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
function today() { return dstr(new Date()); }
function addDays(s, n) { const d = pd(s); d.setDate(d.getDate() + n); return dstr(d); }
function dim(y, m) { return new Date(y, m + 1, 0).getDate(); }
function daysBetween(a, b) { return Math.round((pd(b) - pd(a)) / 86400000); }
function monthKey(s) { return s.slice(0, 7); }
function curMonth() { return today().slice(0, 7); }
function shiftMonth(mk, n) { let y = +mk.slice(0, 4), m = +mk.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + pad2(m + 1); }
function monthLabel(mk) { return mk.slice(0, 4) + '年' + (+mk.slice(5, 7)) + '月'; }
function dayLabel(s, withYear) {
  const d = pd(s);
  return (withYear ? d.getFullYear() + '年' : '') + (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '）';
}
function shortDay(s) { return (+s.slice(5, 7)) + '/' + (+s.slice(8, 10)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function r2(n) { return Math.round(n * 100) / 100; }
function num(n, maxFrac) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('zh-TW', { maximumFractionDigits: maxFrac == null ? 2 : maxFrac });
}
function money(n) { return 'NT$ ' + num(n, 0); }
function moneyExact(n) { return 'NT$ ' + num(n, 2); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ============ SHA-256（密碼雜湊用） ============ */
function sha256(ascii) {
  function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
  const mp = Math.pow, maxWord = mp(2, 32);
  let result = '', words = [], i, j;
  ascii = unescape(encodeURIComponent(ascii));
  const asciiBitLength = ascii.length * 8;
  const hash = [], k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mp(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mp(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength);
  let h = hash.slice(0, 8);
  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16), oldHash = h;
    h = h.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = h[0], e = h[4];
      const temp1 = h[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & h[5]) ^ ((~e) & h[6])) + k[i] +
        (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
      h = [(temp1 + temp2) | 0].concat(h);
      h[4] = (h[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) h[i] = (h[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { const b = (h[i] >> (j * 8)) & 255; result += ((b < 16) ? '0' : '') + b.toString(16); }
  return result;
}
function hashPin(salt, pin) { return sha256(salt + ':' + pin); }

/* ============ 預設資料 ============ */
const DEF_OUT = [
  ['food', '餐飲', '🍱'], ['allow', '給兒女/父母零用錢', '🧧'], ['tax', '稅', '🏛️'], ['helper', '外傭', '🧹'],
  ['commute', '通勤', '🚇'], ['shop', '購物', '🛍️'], ['nhi', '健保', '🏥'], ['net', 'Wi-Fi 和網卡費', '📶'],
  ['util', '水電', '💡'], ['travel', '旅遊', '✈️'], ['snack', '零食', '🍪'], ['grocery', '食材', '🥬'], ['other', '其他', '📦']
];
const DEF_IN = [['salary', '薪資', '💼'], ['bonus', '獎金', '🎁'], ['invest', '投資理財', '📈'], ['rent', '租金收入', '🏠'], ['otherin', '其他收入', '💰']];
const DEF_PAY = [['cash', '現金', '💵'], ['credit', '信用卡', '💳'], ['bank', '轉帳／金融卡', '🏦'], ['ecard', '悠遊卡／一卡通', '🎫'], ['mobile', '行動支付', '📱']];
const DEF_CUR = [
  ['USD', '美元', '$'], ['JPY', '日圓', '¥'], ['EUR', '歐元', '€'], ['CNY', '人民幣', '¥'], ['HKD', '港幣', 'HK$'],
  ['KRW', '韓元', '₩'], ['THB', '泰銖', '฿'], ['SGD', '新加坡幣', 'S$'], ['GBP', '英鎊', '£'], ['AUD', '澳幣', 'A$'],
  ['MYR', '馬幣', 'RM'], ['VND', '越南盾', '₫'], ['PHP', '菲律賓披索', '₱'], ['IDR', '印尼盾', 'Rp']
];
const EMOJIS = ('🍱🍜🍔☕🧋🍰🍪🥬🍎🥩🛒🛍️👕👟💄🎁🧧👨‍👩‍👧👶👵🐶🏥💊🦷🏛️🧾📄🧹🏠🔧🛋️💡💧🔥📶📱💻📺🎮🎬📚✏️🎓🚇🚌🚕🚗⛽🅿️🛵🚲✈️🏨🧳🎢⛰️🏖️💇💈🏋️⚽🎤🎵🎨🙏💼💰📈🏦💵💳🎫🪙💹🧑‍💼📦❤️⭐').match(/(\p{Extended_Pictographic}(️)?(‍\p{Extended_Pictographic}(️)?)*)/gu);

function defaults() {
  return {
    v: 1,
    tx: [],
    cats: DEF_OUT.map(c => ({ id: c[0], name: c[1], icon: c[2], type: 'out', hide: false }))
      .concat(DEF_IN.map(c => ({ id: c[0], name: c[1], icon: c[2], type: 'in', hide: false }))),
    pays: DEF_PAY.map(p => ({ id: p[0], name: p[1], icon: p[2], hide: false })),
    curs: DEF_CUR.map(c => ({ code: c[0], name: c[1], sym: c[2], rate: null })),
    recs: [],
    budget: { total: 0, cats: {}, alert: 80 },
    set: { font: 1, theme: 'auto', lock: false, pinHash: '', pinSalt: '', pinLen: 4, pinHint: '', lastCur: 'TWD', lastCurTs: 0, lastCat: {}, lastPay: 'cash' }
  };
}

/* ============ 資料存取 ============ */
let D = null;
function loadRaw() {
  try { return BR ? BR.loadData() : (localStorage.getItem('ledger') || ''); } catch (e) { return ''; }
}
function normalize(d) {
  const def = defaults();
  if (!d || typeof d !== 'object' || Array.isArray(d)) return def;
  for (const k of Object.keys(def)) if (d[k] == null) d[k] = def[k];
  if (typeof d.set !== 'object' || Array.isArray(d.set)) d.set = def.set;
  if (typeof d.budget !== 'object' || Array.isArray(d.budget)) d.budget = def.budget;
  for (const k of Object.keys(def.set)) if (d.set[k] == null) d.set[k] = def.set[k];
  for (const k of Object.keys(def.budget)) if (d.budget[k] == null) d.budget[k] = def.budget[k];
  return sanitizeData(d, def);
}

/* ============ 資料安全檢查：讀取或還原備份時，把不合格式的內容清掉 ============ */
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function cleanText(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max || 200); }
function cleanIcon(v, fallback) {
  const s = String(v == null ? '' : v).replace(/[<>"'&`=\\/\s]/g, '').slice(0, 16);
  return s || fallback;
}
function cleanNum(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function sanitizeData(d, def) {
  const remap = {};   // 不安全的 id → 新 id
  const fixId = (id, used) => {
    let v = String(id == null ? '' : id);
    if (!SAFE_ID.test(v) || used.has(v)) { const n = uid(); remap[v] = n; v = n; }
    used.add(v); return v;
  };
  const ref = v => { const s = String(v == null ? '' : v); return remap[s] || (SAFE_ID.test(s) ? s : ''); };
  // 分類
  let used = new Set();
  d.cats = (Array.isArray(d.cats) ? d.cats : def.cats).filter(c => c && typeof c === 'object').map(c => ({
    id: fixId(c.id, used), name: cleanText(c.name, 30) || '未命名', icon: cleanIcon(c.icon, '📦'),
    type: c.type === 'in' ? 'in' : 'out', hide: !!c.hide
  }));
  if (!d.cats.some(c => c.type === 'out')) d.cats = d.cats.concat(def.cats.filter(c => c.type === 'out'));
  if (!d.cats.some(c => c.type === 'in')) d.cats = d.cats.concat(def.cats.filter(c => c.type === 'in'));
  // 付款方式
  used = new Set();
  d.pays = (Array.isArray(d.pays) ? d.pays : def.pays).filter(p => p && typeof p === 'object').map(p => ({
    id: fixId(p.id, used), name: cleanText(p.name, 30) || '未命名', icon: cleanIcon(p.icon, '💳'), hide: !!p.hide
  }));
  // 幣別
  const codes = new Set();
  d.curs = (Array.isArray(d.curs) ? d.curs : def.curs).filter(c => c && /^[A-Z]{2,5}$/.test(String(c.code)) && c.code !== 'TWD' && !codes.has(c.code) && codes.add(c.code))
    .map(c => ({ code: c.code, name: cleanText(c.name, 20) || c.code, sym: cleanIcon(c.sym, c.code).slice(0, 4), rate: cleanNum(c.rate) > 0 ? cleanNum(c.rate) : null, custom: !!c.custom }));
  const curOk = c => c === 'TWD' || codes.has(c) ? c : 'TWD';
  // 固定收支
  used = new Set();
  d.recs = (Array.isArray(d.recs) ? d.recs : []).filter(r => r && typeof r === 'object' && DATE_RE.test(r.start)).map(r => {
    const unit = r.unit === 'week' ? 'week' : 'month';
    const every = unit === 'week' ? ([1, 2].includes(+r.every) ? +r.every : 1) : ([1, 2, 3, 6, 12].includes(+r.every) ? +r.every : 1);
    const day = unit === 'week' ? clamp(Math.floor(cleanNum(r.day)), 0, 6) : clamp(Math.floor(cleanNum(r.day)) || 1, 1, 31);
    return {
      id: fixId(r.id, used), type: r.type === 'in' ? 'in' : 'out', name: cleanText(r.name, 30), amt: Math.max(0, cleanNum(r.amt)),
      cur: curOk(r.cur), cat: ref(r.cat), pay: ref(r.pay), unit, every, day, start: r.start, end: DATE_RE.test(r.end) ? r.end : '',
      confirm: !!r.confirm, on: r.on !== false, last: DATE_RE.test(r.last) ? r.last : ''
    };
  });
  // 記帳紀錄
  used = new Set();
  d.tx = (Array.isArray(d.tx) ? d.tx : []).filter(t => t && typeof t === 'object' && DATE_RE.test(t.date)).map(t => ({
    id: fixId(t.id, used), type: t.type === 'in' ? 'in' : 'out', date: t.date, amt: r2(Math.abs(cleanNum(t.amt))),
    cat: ref(t.cat), pay: ref(t.pay), note: cleanText(t.note, 80), cur: curOk(t.cur), orig: Math.abs(cleanNum(t.orig != null ? t.orig : t.amt)),
    rate: cleanNum(t.rate) || 1, rec: t.rec ? (ref(t.rec) || 'x') : null, pending: !!t.pending, ts: cleanNum(t.ts)
  }));
  // 預算
  const bc = {};
  if (d.budget.cats && typeof d.budget.cats === 'object') for (const k of Object.keys(d.budget.cats)) { const n = cleanNum(d.budget.cats[k]); const kk = ref(k); if (kk && n > 0) bc[kk] = n; }
  d.budget = { total: Math.max(0, cleanNum(d.budget.total)), cats: bc, alert: [70, 80, 90].includes(+d.budget.alert) ? +d.budget.alert : 80 };
  // 設定
  const s = d.set;
  s.font = [0.9, 1, 1.15, 1.3, 1.5].includes(+s.font) ? +s.font : 1;
  s.theme = ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : 'auto';
  s.lock = !!s.lock && /^[0-9a-f]{64}$/.test(String(s.pinHash));
  s.pinLen = clamp(Math.floor(cleanNum(s.pinLen)) || 4, 4, 6);
  s.pinHint = cleanText(s.pinHint, 40);
  s.pinSalt = cleanText(s.pinSalt, 40);
  s.lastCur = curOk(s.lastCur);
  s.lastPay = ref(s.lastPay);
  const lc = {}; if (s.lastCat && typeof s.lastCat === 'object') for (const k of ['in', 'out']) { const v = ref(s.lastCat[k]); if (v) lc[k] = v; }
  s.lastCat = lc;
  return d;
}
function loadData() {
  const raw = loadRaw();
  if (!raw) { D = defaults(); return; }
  try { D = normalize(JSON.parse(raw)); } catch (e) { D = defaults(); }
}
function save() {
  const s = JSON.stringify(D);
  try {
    if (BR) { if (!BR.saveData(s)) toast('儲存失敗，請確認手機儲存空間', 'crit'); }
    else {
      const prev = localStorage.getItem('ledger');
      localStorage.setItem('ledger', s);
      if (prev) webSnapshot(prev);
    }
  } catch (e) { toast('儲存失敗：' + e.message, 'crit'); }
}

/* ============ 網頁版：每天自動保留一份舊資料（IndexedDB，最多 14 份） ============ */
let idbP = null;
function idb() {
  if (!idbP) idbP = new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('no indexedDB')); return; }
    const r = indexedDB.open('ledger', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('snaps');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return idbP;
}
function idbReq(mode, fn) {
  return idb().then(db => new Promise((res, rej) => {
    const t = db.transaction('snaps', mode), q = fn(t.objectStore('snaps'));
    t.oncomplete = () => res(q ? q.result : undefined);
    t.onerror = () => rej(t.error);
  }));
}
let snapDay = '';
async function webSnapshot(prev) {
  const key = 'auto-' + today();
  if (snapDay === key) return;
  try {
    const keys = await idbReq('readonly', st => st.getAllKeys());
    if (!keys.includes(key)) await idbReq('readwrite', st => st.put(prev, key));
    snapDay = key;
    const all = keys.concat(keys.includes(key) ? [] : [key]).sort();
    for (let i = 0; i < all.length - 14; i++) await idbReq('readwrite', st => st.delete(all[i]));
  } catch (e) { /* 沒有 IndexedDB 時略過 */ }
}
async function listSnapshots() {
  if (BR) { try { return JSON.parse(BR.listBackups() || '[]'); } catch (e) { return []; } }
  try {
    const keys = (await idbReq('readonly', st => st.getAllKeys())).sort().reverse();
    const out = [];
    for (const k of keys) {
      const v = await idbReq('readonly', st => st.get(k));
      let count = null; try { count = JSON.parse(v).tx.length; } catch (e) { }
      out.push({ name: k, label: k.slice(5).replace(/-/g, '/') + ' 開始記帳前的資料', count });
    }
    return out;
  } catch (e) { return []; }
}
async function readSnapshot(name) {
  if (BR) return BR.readBackup(name);
  try { return await idbReq('readonly', st => st.get(name)); } catch (e) { return ''; }
}

/* ============ 查詢 ============ */
function catOf(id) { return D.cats.find(c => c.id === id) || { id, name: '（已刪除分類）', icon: '❔', type: 'out' }; }
function payOf(id) { return D.pays.find(p => p.id === id) || null; }
function curOf(code) { return D.curs.find(c => c.code === code) || null; }
function catsOfType(t, withHidden) { return D.cats.filter(c => c.type === t && (withHidden || !c.hide)); }
function txRange(from, to, type) {      // 含頭含尾，排除待確認
  return D.tx.filter(t => !t.pending && t.date >= from && t.date <= to && (!type || t.type === type));
}
function monthRange(mk) { const y = +mk.slice(0, 4), m = +mk.slice(5, 7) - 1; return [ymd(y, m, 1), ymd(y, m, dim(y, m))]; }
function sum(list) { let s = 0; for (const t of list) s += t.amt; return r2(s); }
function sumBy(list, key) {
  const m = {};
  for (const t of list) { const k = t[key] || '_none'; m[k] = (m[k] || 0) + t.amt; }
  return m;
}
function sortTx(list) { return list.slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0)); }

/* ============ 匯率 ============ */
function curLabel(code) { if (code === 'TWD') return '新台幣'; const c = curOf(code); return c ? c.name : code; }
function curSym(code) { if (code === 'TWD') return 'NT$'; const c = curOf(code); return c ? c.sym : code; }

/* ============ 固定收支（自動記帳） ============ */
const FREQS = [
  { k: 'w1', unit: 'week', every: 1, name: '每週' },
  { k: 'w2', unit: 'week', every: 2, name: '每兩週' },
  { k: 'm1', unit: 'month', every: 1, name: '每月' },
  { k: 'm2', unit: 'month', every: 2, name: '每兩個月' },
  { k: 'm3', unit: 'month', every: 3, name: '每三個月（每季）' },
  { k: 'm6', unit: 'month', every: 6, name: '每半年' },
  { k: 'm12', unit: 'month', every: 12, name: '每年' }
];
function freqOf(r) { return FREQS.find(f => f.unit === r.unit && f.every === r.every) || FREQS[2]; }
function nextOcc(r, after) {
  const start = r.start;
  const base = (!after || after < start) ? addDays(start, -1) : after;
  if (r.unit === 'week') {
    const f = pd(start);
    while (f.getDay() !== r.day) f.setDate(f.getDate() + 1);
    const first = dstr(f);
    if (first > base) return first;
    const step = 7 * r.every;
    const k = Math.floor(daysBetween(first, base) / step) + 1;
    return addDays(first, k * step);
  }
  const sy = +start.slice(0, 4), sm = +start.slice(5, 7) - 1;
  const by = +base.slice(0, 4), bm = +base.slice(5, 7) - 1;
  const idx = (by - sy) * 12 + (bm - sm);
  let k = Math.max(0, Math.floor(idx / r.every) * r.every);
  for (let i = 0; i < 4; i++) {
    const t = sm + k, y = sy + Math.floor(t / 12), m = ((t % 12) + 12) % 12;
    const s = ymd(y, m, Math.min(r.day, dim(y, m)));
    if (s > base && s >= start) return s;
    k += r.every;
  }
  return null;
}
function recDesc(r) {
  const f = freqOf(r);
  if (r.unit === 'week') return f.name + '（週' + WD[r.day] + '）';
  if (r.every === 12) return '每年 ' + (+r.start.slice(5, 7)) + ' 月 ' + (r.day >= 31 ? '月底' : r.day + ' 日');
  return f.name + ' ' + (r.day >= 31 ? '月底' : r.day + ' 日');
}
function recToTx(r, date) {
  let rate = 1, amt = r.amt, pending = !!r.confirm;
  if (r.cur !== 'TWD') {
    const c = curOf(r.cur);
    rate = c && c.rate ? c.rate : 0;
    if (!rate) pending = true;
    amt = Math.round(r.amt * rate);
  }
  return { id: uid(), type: r.type, date, amt, cat: r.cat, pay: r.pay, note: r.name || '', cur: r.cur, orig: r.amt, rate, rec: r.id, pending, ts: Date.now() };
}
function countBackfill(r) {      // 預覽：今天以前會補記幾筆
  let n = 0, last = r.last || '', t = today();
  for (let g = 0; g < 500; g++) {
    const nx = nextOcc(r, last);
    if (!nx || nx > t || (r.end && nx > r.end)) break;
    n++; last = nx;
  }
  return n;
}
function runRecurring() {
  const t = today(); let n = 0;
  for (const r of D.recs) {
    if (!r.on) continue;
    for (let g = 0; g < 500; g++) {
      const nx = nextOcc(r, r.last || '');
      if (!nx || nx > t || (r.end && nx > r.end)) break;
      D.tx.push(recToTx(r, nx)); r.last = nx; n++;
    }
  }
  if (n) save();
  return n;
}
function pendingList() { return sortTx(D.tx.filter(t => t.pending)).reverse(); }

/* ============ 預算 ============ */
function budgetState(spent, budget) {
  if (!budget) return null;
  const p = spent / budget * 100;
  const alert = D.budget.alert || 80;
  if (p > 100) return { p, k: 'crit', icon: '⛔', label: '已超支' };
  if (p >= alert) return { p, k: 'warn', icon: '⚠️', label: '接近預算' };
  return { p, k: 'ok', icon: '✅', label: '正常' };
}
function monthSpent(mk, cat) {
  const [a, b] = monthRange(mk);
  return sum(txRange(a, b, 'out').filter(t => !cat || t.cat === cat));
}

/* ============ 算式（記帳鍵盤） ============ */
function evalExpr(s) {
  if (!s) return 0;
  const toks = s.match(/(\d+\.?\d*|\.\d+|[+−×÷])/g);
  if (!toks) return 0;
  while (toks.length && /[+−×÷]/.test(toks[toks.length - 1])) toks.pop();
  // 先乘除後加減
  const st = [parseFloat(toks[0]) || 0];
  const ops = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i], v = parseFloat(toks[i + 1]) || 0;
    if (op === '×') st[st.length - 1] *= v;
    else if (op === '÷') st[st.length - 1] = v === 0 ? NaN : st[st.length - 1] / v;
    else { ops.push(op); st.push(v); }
  }
  let r = st[0];
  for (let i = 0; i < ops.length; i++) r = ops[i] === '+' ? r + st[i + 1] : r - st[i + 1];
  return r;
}

/* ============ CSV ============ */
function csvCell(v) {
  const isNum = typeof v === 'number';
  v = String(v == null ? '' : v);
  if (!isNum && /^[=+\-@\t\r]/.test(v)) v = "'" + v;      // 防止 Excel 把備註當成公式執行
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function buildCSV(list) {
  const rows = [['日期', '類型', '分類', '金額（新台幣）', '幣別', '原幣金額', '匯率', '付款方式', '備註', '來源']];
  for (const t of sortTx(list).reverse()) {
    const p = payOf(t.pay);
    rows.push([t.date, t.type === 'out' ? '支出' : '收入', catOf(t.cat).name, t.amt, t.cur || 'TWD',
      t.cur && t.cur !== 'TWD' ? t.orig : t.amt, t.cur && t.cur !== 'TWD' ? t.rate : 1, p ? p.name : '', t.note || '', t.rec ? '固定收支' : '手動']);
  }
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}
