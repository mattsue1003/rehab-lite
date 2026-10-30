/* ================================================================
   核心：工具函式、狀態、路由、表單綁定、對話框、列印、匯出
   ================================================================ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtISO = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
const todayISO = () => fmtISO(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return fmtISO(d); };
const addMonths = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + n); return fmtISO(d); };
const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
const weekday = iso => { const w = new Date(iso + 'T00:00:00').getDay(); return w === 0 ? 7 : w; };
const rocDate = iso => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-'); return `${+y - 1911}/${m}/${d}`; };
const pct = (a, b) => b ? Math.round(a / b * 100) : null;
const getPath = (o, p) => p.split('.').reduce((x, k) => x == null ? undefined : x[k], o);
function setPath(o, p, v){ const ks = p.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) { if (x[ks[i]] == null) x[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; x = x[ks[i]]; } x[ks.at(-1)] = v; }
const clone = o => JSON.parse(JSON.stringify(o));
const byDate = k => (a, b) => (a[k] || '').localeCompare(b[k] || '');

const S = { edit:null, dirty:false, onEdit:null, lastHash:'', week:null, sessDate:null };

/* ---------- 圖示 ---------- */
const ICON_PATHS = {
  home:'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  check:'M4 12l5 5L20 6',
  users:'M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 10a4 4 0 100-8 4 4 0 000 8M22 20v-2a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8',
  meet:'M3 5h18v11H8l-5 4z',
  alert:'M12 3l10 18H2zM12 10v5M12 18v.5',
  star:'M12 3l2.8 6 6.2.6-4.7 4.2 1.4 6.2L12 17l-5.7 3 1.4-6.2L3 9.6 9.2 9z',
  chart:'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear:'M12 15a3 3 0 100-6 3 3 0 000 6M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  plus:'M12 5v14M5 12h14', print:'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z',
  edit:'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', trash:'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  back:'M15 18l-6-6 6-6', menu:'M3 6h18M3 12h18M3 18h18', x:'M18 6L6 18M6 6l12 12',
  rx:'M5 3h7a4 4 0 010 8H5zM5 11v10M10 11l9 10M19 13l-6 8', clip:'M9 2h6v4H9zM5 4h4M15 4h4v18H5V4',
  download:'M12 3v12M7 10l5 5 5-5M4 21h16', upload:'M12 21V9M7 14l5-5 5 5M4 3h16', heart:'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z',
};
const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[n] || ''}"/></svg>`;

/* ---------- 表單元件（以 data-bind 綁定 S.edit） ---------- */
const bAttr = (p, t) => `data-bind="${p}"${t ? ` data-t="${t}"` : ''}`;
const V = p => getPath(S.edit, p);
const F = {
  input:(p, o = {}) => `<input class="inp ${o.cls||''}" ${bAttr(p, o.t)} type="${o.type||'text'}" value="${esc(V(p) ?? '')}" ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.step?`step="${o.step}"`:''} ${o.min!=null?`min="${o.min}"`:''} ${o.max!=null?`max="${o.max}"`:''} ${o.list?`list="${o.list}"`:''} ${o.attrs||''}>`,
  num:(p, o = {}) => F.input(p, { ...o, type:'number', t:'num', step:o.step||'any', cls:'inp-num ' + (o.cls||'') }),
  date:(p, o = {}) => F.input(p, { ...o, type:'date' }),
  text:(p, o = {}) => `<textarea class="inp" ${bAttr(p)} rows="${o.rows||3}" ${o.ph?`placeholder="${esc(o.ph)}"`:''}>${esc(V(p) ?? '')}</textarea>`,
  select:(p, opts, o = {}) => `<select class="inp" ${bAttr(p, o.t)}>${o.blank!==false?'<option value="">— 請選擇 —</option>':''}${opts.map(x => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${String(V(p) ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`,
  radios:(p, opts, o = {}) => `<div class="pills ${o.cls||''}">${opts.map(x => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<label class="pill"><input type="radio" name="${p}" value="${esc(v)}" ${bAttr(p, o.t)} ${String(V(p) ?? '') === String(v) ? 'checked' : ''}><span>${esc(l)}</span></label>`; }).join('')}</div>`,
  check:(p, label) => `<label class="chk"><input type="checkbox" ${bAttr(p)} ${V(p) ? 'checked' : ''}><span>${label}</span></label>`,
  checkArr:(p, val, label, num) => `<label class="chk"><input type="checkbox" ${bAttr(p)} data-arr="${esc(val)}" ${num?'data-num="1"':''} ${(V(p) || []).includes(val) ? 'checked' : ''}><span>${esc(label)}</span></label>`,
  field:(label, html, o = {}) => `<div class="field ${o.cls||''}"><label class="lbl">${label}${o.req?' <b class="req">*</b>':''}</label>${html}${o.hint?`<div class="hint">${o.hint}</div>`:''}</div>`,
};
function onBind(e){
  const el = e.target, p = el.dataset?.bind; if (!p || !S.edit) return;
  let v;
  if (el.type === 'checkbox') {
    if (el.dataset.arr != null) { const x = el.dataset.num ? +el.dataset.arr : el.dataset.arr; const arr = getPath(S.edit, p) || []; v = el.checked ? [...new Set([...arr, x])] : arr.filter(y => y !== x); if (el.dataset.num) v.sort((a, b) => a - b); }
    else v = el.checked;
  } else if (el.type === 'radio') { if (!el.checked) return; v = el.dataset.t === 'num' ? +el.value : el.value; }
  else { v = el.value; if (el.dataset.t === 'num') v = v === '' ? '' : +v; }
  setPath(S.edit, p, v); S.dirty = true; if (S.onEdit) S.onEdit(p, el);
}
document.addEventListener('input', onBind); document.addEventListener('change', onBind);

/* ---------- 共用 UI ---------- */
function clientName(id){ return Store.get('clients', id)?.name || '（已刪除）'; }
const clientOpts = (all) => Store.all('clients').filter(c => all || c.status !== '結案').sort(byDate('name')).map(c => [c.id, c.name]);
const badge = (t, k = '') => `<span class="badge ${k}">${esc(t)}</span>`;
const empty = (t, btn = '') => `<div class="empty"><p>${t}</p>${btn}</div>`;
function btn(label, onclick, o = {}){ return `<button type="button" class="btn ${o.k||''}" onclick="${esc(onclick)}" ${o.title?`title="${esc(o.title)}"`:''}>${o.i?icon(o.i, 16):''}<span>${label}</span></button>`; }

function toast(msg, kind = ''){ const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.classList.add('show'), 10); setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, kind === 'err' ? 6000 : 2600); }

/* 對話框：openModal(title, html, {onSave, saveLabel, wide}) */
let modalCfg = null;
function openModal(title, html, cfg = {}){
  modalCfg = cfg;
  $('#modal').innerHTML = `<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal ${cfg.wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-h"><h3>${esc(title)}</h3><button class="icon-btn" onclick="closeModal()" aria-label="關閉">${icon('x')}</button></div>
    <div class="modal-b" id="modal-body">${html}</div>
    <div class="modal-f">${cfg.extra||''}<span class="sp"></span>${btn('取消','closeModal()')}${cfg.onSave?btn(cfg.saveLabel||'儲存','modalSave()',{k:'primary'}):''}</div></div></div>`;
  setTimeout(() => $('#modal .modal-b input, #modal .modal-b select, #modal .modal-b textarea')?.focus(), 30);
}
function modalSave(){ if (modalCfg?.onSave && modalCfg.onSave() !== false) closeModal(true); }
function closeModal(saved){ $('#modal').innerHTML = ''; if (!saved && modalCfg?.restore) modalCfg.restore(); modalCfg = null; }
function askConfirm(msg){ return window.confirm(msg); }

/* ---------- 下載與 CSV ---------- */
async function download(name, data, type){ const b = data instanceof Blob ? data : new Blob([data], { type }); if (typeof Folder !== 'undefined' && await Folder.save(name, b)) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function exportCSV(name, headers, rows){
  const q = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const body = [headers, ...rows].map(r => r.map(q).join(',')).join('\r\n');
  download(name, '﻿' + body, 'text/csv;charset=utf-8');
}

/* ---------- 加密備份（AES-GCM + PBKDF2） ---------- */
async function deriveKey(pw, salt){ const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:200000, hash:'SHA-256' }, base, { name:'AES-GCM', length:256 }, false, ['encrypt', 'decrypt']); }
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function encryptJSON(obj, pw){
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pw, salt);
  const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  let bin = ''; const u = new Uint8Array(ct); for (let i = 0; i < u.length; i += 32768) bin += String.fromCharCode(...u.subarray(i, i + 32768));
  return JSON.stringify({ app:'rehab-lite', enc:'AES-GCM', salt:b64(salt), iv:b64(iv), data:btoa(bin) });
}
async function decryptJSON(wrap, pw){ const key = await deriveKey(pw, unb64(wrap.salt)); const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv:unb64(wrap.iv) }, key, unb64(wrap.data)); return JSON.parse(new TextDecoder().decode(pt)); }

/* ---------- 簡易折線圖（SVG） ---------- */
function lineChart(points, o = {}){
  const pts = points.filter(p => p.y !== null && p.y !== undefined && p.y !== '' && !isNaN(p.y));
  if (pts.length === 0) return `<div class="chart-empty">尚無資料</div>`;
  const W = 320, H = 150, L = 34, R = 22, T = 16, B = 26;
  const ys = pts.map(p => +p.y).concat(o.cut != null ? [o.cut] : []);
  let min = o.min ?? Math.min(...ys), max = o.max ?? Math.max(...ys); if (min === max) { min -= 1; max += 1; }
  const x = i => pts.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
  const y = v => T + (H - T - B) * (1 - (v - min) / (max - min));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(+p.y).toFixed(1)}`).join('');
  const grid = [min, (min + max) / 2, max].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="cg"/><text x="${L - 5}" y="${y(v) + 4}" class="ct" text-anchor="end">${Math.round(v * 10) / 10}</text>`).join('');
  const cut = o.cut != null ? `<line x1="${L}" x2="${W - R}" y1="${y(o.cut)}" y2="${y(o.cut)}" class="ccut"/><text x="${W - R}" y="${y(o.cut) - 4}" class="ct cut-t" text-anchor="end">${esc(o.cutLabel || '切點 ' + o.cut)}</text>` : '';
  const dots = pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(+p.y)}" r="4" class="cd"><title>${rocDate(p.x)}：${p.y}${o.unit || ''}</title></circle><text x="${x(i)}" y="${y(+p.y) - 8}" class="ct cv" text-anchor="middle">${p.y}</text><text x="${x(i)}" y="${H - 8}" class="ct" text-anchor="middle">${rocDate(p.x).slice(-5)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.title || '')}">${grid}${cut}<path d="${path}" class="cl"/>${dots}</svg>`;
}
