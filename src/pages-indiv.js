/* ================================================================
   個案：評估 → 介入計畫（個別＋團體＋輔具）→ 執行紀錄 → 列印輸出
   ================================================================ */
const Logic = {
  assessmentsOf: cid => Store.all('assessments').filter(a => a.clientId === cid).sort(byDate('date')),
  lastAssessment(cid){ return this.assessmentsOf(cid).at(-1) || null; },
  plansOf: cid => Store.all('plans').filter(p => p.clientId === cid).sort((a, b) => (a.version || 0) - (b.version || 0)),
};
const activePlan = cid => Logic.plansOf(cid).filter(p => p.status === '執行中').at(-1) || null;
const allItems = () => [...LIBRARY, ...Store.all('library')];
const findItem = id => allItems().find(e => e.id === id);
const defaultDays = () => isRes() ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
const thumb = (src, cls = '') => src ? `<img class="thumb ${cls}" src="${esc(src)}" alt="" loading="lazy">` : `<span class="thumb ${cls} noimg">${icon('heart', 18)}</span>`;
const scheduled = (pl, it, d) => d >= pl.startDate && d <= pl.endDate && (it.days || []).includes(weekday(d));

function planStats(pl, from, to){
  let exp = 0, ok = 0, part = 0, skip = 0;
  const recs = new Map(Store.all('checks').filter(x => x.clientId === pl.clientId).map(x => [x.itemId + '|' + x.date, x]));
  const end = [to, pl.endDate, todayISO()].sort()[0];
  for (let d = from > pl.startDate ? from : pl.startDate; d <= end; d = addDays(d, 1)) for (const it of pl.items || []) if ((it.days || []).includes(weekday(d))) { exp++; const r = recs.get(it.id + '|' + d); if (r?.status === 'ok') ok++; else if (r?.status === 'part') part++; else if (r?.status === 'skip') skip++; }
  return { exp, ok, part, skip, rate:exp ? Math.round((ok + part * 0.5) / exp * 100) : null };
}
function setCheck(planId, itemId, d, status){
  const p = Store.get('plans', planId), r = Store.all('checks').find(x => x.clientId === p.clientId && x.itemId === itemId && x.date === d);
  if (!status) { if (r) Store.remove('checks', r.id); }
  else Store.upsert('checks', { ...(r || { clientId:p.clientId, planId, itemId, date:d }), status, by:App.currentUserId() });
}
const NEXT = { '':'ok', ok:'part', part:'skip', skip:'' };
function curStatus(planId, itemId, d){ const cid = Store.get('plans', planId)?.clientId; return Store.all('checks').find(x => x.clientId === cid && x.itemId === itemId && x.date === d)?.status || ''; }

/* ---------------- 今日快速勾選 ---------------- */
let todayQ = '';
function pageToday(){
  const d = S.day || todayISO();
  setTitle('今日勾選', rocDate(d) + '（星期' + WEEKDAYS[weekday(d)] + '）');
  const list = Store.all('clients').filter(c => c.status !== '結案' && (!todayQ || c.name.includes(todayQ) || (c.bed || '').includes(todayQ)))
    .map(c => ({ c, p:activePlan(c.id) })).filter(x => x.p && x.p.items.some(it => scheduled(x.p, it, d)))
    .sort((a, b) => (a.c.bed || a.c.name).localeCompare(b.c.bed || b.c.name));
  let tot = 0, done = 0;
  const cards = list.map(({ c, p }) => {
    const its = p.items.filter(it => scheduled(p, it, d)); const st = its.map(it => curStatus(p.id, it.id, d));
    tot += its.length; done += st.filter(Boolean).length;
    return `<article class="tcard" id="tc-${c.id}"><header><div class="av">${esc(c.name.slice(0, 1))}</div><div class="tn"><b>${esc(c.name)}</b><small>${esc([isRes() ? c.bed : '', c.caution].filter(Boolean).join('・'))}</small></div>
      ${st.every(Boolean) ? '<span class="card-done">✓ 今日全部已記錄</span>' : `<span class="card-prog">已記錄 <b>${st.filter(Boolean).length}</b>／${its.length}</span>${btn('其餘全部完成', `allDone('${p.id}','${d}')`, { k:'sm' })}`}</header>
      <div class="tiles">${its.map((it, i) => { const s = st[i], r = s ? checkRec(p.id, it.id, d) : null; return `<button class="tile ${s ? 's-' + s : ''}" onclick="tapTile('${p.id}','${it.id}','${d}')" aria-label="${esc(it.name)}：${s ? ST_LABEL[s] : '尚未記錄'}">${thumb(it.img)}<span class="t-txt"><b>${esc(it.name)}</b><small>${esc(it.dose || '')}${it.times > 1 ? `｜每日 ${it.times} 次` : ''}</small><span class="t-rec">${s ? `<b>${SYM[s]} ${ST_LABEL[s]}</b> · ${esc(hhmm(r?.updatedAt))}${r?.by ? ' ' + esc(r.by) : ''}` : '尚未記錄'}</span></span><span class="t-st">${s ? SYM[s] : ''}</span></button>`; }).join('')}</div></article>`;
  }).join('');
  return `<div class="toolbar"><button class="btn" onclick="S.day=addDays('${d}',-1);route()">${icon('back', 16)}前一天</button><input type="date" class="inp" value="${d}" onchange="S.day=this.value;route()" aria-label="日期"><button class="btn" onclick="S.day=addDays('${d}',1);route()">後一天</button>${d !== todayISO() ? btn('回到今天', 'S.day=null;route()') : ''}
    <span class="sp"></span><input class="inp" placeholder="搜尋姓名${isRes() ? '／床號' : ''}" value="${esc(todayQ)}" onchange="todayQ=this.value;route()" aria-label="搜尋"></div>
  <div class="notice today-sum"><div><b class="big">${done}／${tot}</b> 項已記錄${tot && done === tot ? '　<span class="card-done">✓ 今天全部記錄完成</span>' : ''}</div>
    <div class="ts-meta">${Store.lastSaved ? `💾 已儲存於這台電腦 ${hhmm(Store.lastSaved.toISOString())}` : '💾 每次點選都會立即儲存'}${Folder.supported ? (Folder.ready ? '　📁 資料夾自動備份中' : Folder.connected ? '　<span class="warn-t">⚠ 資料夾自動備份未啟用，請按左下角「重新連接資料夾」</span>' : '') : ''}　記錄者：<b>${esc(App.currentUserId() || '（請於右上角填寫）')}</b></div>
    <div class="ts-meta">點一下＝<b class="c-ok">✓ 完成</b>，再點＝<b class="c-part">△ 部分</b>，再點＝<b class="c-skip">✕ 未執行</b>，再點＝取消；點錯可按下方訊息的「復原」。</div></div>
  <div class="tgrid">${cards || empty(`今天沒有排定的個別介入項目。請先為${term()}開立介入計畫。`, `<a class="btn primary" href="#/clients">前往${term()}名單</a>`)}</div>`;
}
const ST_LABEL = { ok:'完成', part:'部分完成', skip:'未執行' };
const hhmm = iso => { if (!iso) return ''; const t = new Date(iso); return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); };
const checkRec = (planId, itemId, d) => { const cid = Store.get('plans', planId)?.clientId; return Store.all('checks').find(x => x.clientId === cid && x.itemId === itemId && x.date === d); };
async function tapTile(planId, itemId, d){
  const p = Store.get('plans', planId), it = p.items.find(x => x.id === itemId), c = Store.get('clients', p.clientId);
  const prev = curStatus(planId, itemId, d), next = NEXT[prev];
  setCheck(planId, itemId, d, next); refreshCard(p.clientId);
  const ok = await Store.flush(); refreshCard(p.clientId);
  if (!ok) return;
  toast(`已儲存：${c.name}・${it.name} → ${next ? SYM[next] + ' ' + ST_LABEL[next] : '已取消記錄'}`, 'ok', { label:'復原', fn:async () => { setCheck(planId, itemId, d, prev); await Store.flush(); refreshCard(p.clientId); toast(`已復原：${it.name} → ${prev ? ST_LABEL[prev] : '尚未記錄'}`, 'ok'); } });
}
async function allDone(planId, d){
  const p = Store.get('plans', planId), c = Store.get('clients', p.clientId);
  const todo = p.items.filter(it => scheduled(p, it, d) && !curStatus(p.id, it.id, d));
  todo.forEach(it => setCheck(p.id, it.id, d, 'ok')); refreshCard(p.clientId);
  if (await Store.flush()) { refreshCard(p.clientId); toast(`已儲存：${c.name} 其餘 ${todo.length} 項標記為 ✓ 完成`, 'ok', { label:'復原', fn:async () => { todo.forEach(it => setCheck(p.id, it.id, d, '')); await Store.flush(); refreshCard(p.clientId); toast('已復原', 'ok'); } }); }
}
function refreshCard(cid){ const t = document.createElement('div'); t.innerHTML = pageToday(); const n = t.querySelector('#tc-' + cid), o = document.getElementById('tc-' + cid); if (n && o) o.replaceWith(n); const nn = t.querySelector('.notice'), on = document.querySelector('#main .notice'); if (nn && on) on.replaceWith(nn); }

/* ---------------- 個案名冊 ---------------- */
let cFilter = { q:'', status:'服務中' };
function pageClients(){
  setTitle(`${term()}名冊`);
  const today = todayISO(), ws = weekStart(today);
  const list = Store.all('clients').filter(c => (!cFilter.status || (c.status || '服務中') === cFilter.status) && (!cFilter.q || c.name.includes(cFilter.q) || (c.bed || '').includes(cFilter.q))).sort((a, b) => (a.bed || a.name).localeCompare(b.bed || b.name));
  return `<div class="toolbar"><input class="inp" placeholder="搜尋姓名${isRes() ? '／床號' : ''}" value="${esc(cFilter.q)}" oninput="cFilter.q=this.value;rerenderList()" aria-label="搜尋">
    <select class="inp" onchange="cFilter.status=this.value;rerenderList()" aria-label="狀態">${['服務中', '結案', ''].map(s => `<option value="${s}" ${cFilter.status === s ? 'selected' : ''}>${s || '全部'}</option>`).join('')}</select>
    <span class="sp"></span>${Store.all('clients').some(c => c.demo) ? btn('清除模擬個案', 'clearDemoClients()', { k:'danger ghost', i:'trash' }) : ''}${btn('新增' + term(), 'editClient()', { k:'primary', i:'plus' })}</div>
  <section class="card flush"><div class="tbl-wrap"><table class="tbl" id="ctable"><thead><tr><th>姓名</th>${isRes() ? '<th>房號／床號</th>' : ''}<th>最近評估</th><th>巴氏</th><th>介入計畫</th><th>團體</th><th>本週執行</th><th></th></tr></thead><tbody>
  ${list.map(c => { const a = Logic.lastAssessment(c.id), p = activePlan(c.id), st = p ? planStats(p, ws, today) : null; return `<tr class="click" onclick="App.go('#/client/${c.id}')"><td><b>${esc(c.name)}</b></td>${isRes() ? `<td>${esc(c.bed || '')}</td>` : ''}<td>${a ? rocDate(a.date) + ' ' + badge(a.type) : badge('未評估', 'amber')}</td><td>${scoreBarthel(a)?.total ?? '—'}</td><td>${p ? `個別 ${(p.items || []).length} 項，至 ${rocDate(p.endDate)}` : badge('未開立', 'amber')}</td><td><small>${esc((p?.groups || []).map(g => g.type.replace('團體', '')).join('、'))}</small></td><td>${st?.exp ? `<div class="mini-bar"><i style="width:${st.rate}%"></i></div>${st.ok + st.part}/${st.exp}` : '—'}</td><td class="nowrap"><button type="button" class="btn sm danger ghost" onclick="event.stopPropagation();deleteClient('${c.id}')" title="刪除${esc(c.name)}">${icon('trash', 14)}刪除</button></td></tr>`; }).join('') || `<tr><td colspan="8">${empty(`尚無${term()}資料`)}</td></tr>`}
  </tbody></table></div></section>`;
}
function rerenderList(){ const t = document.createElement('div'); t.innerHTML = pageClients(); $('#ctable').replaceWith(t.querySelector('#ctable')); }
function editClient(id){
  S.edit = id ? clone(Store.get('clients', id)) : { status:'服務中', gender:'女' };
  openModal(id ? `編輯${term()}資料` : `新增${term()}`, `<p class="hint">建議只填必要資料；姓名可使用代號或「王○蘭」格式。</p><div class="form-grid">
    ${F.field('姓名／代號', F.input('name'), { req:true })}${F.field('性別', F.radios('gender', ['女', '男']))}
    ${F.field('出生日期', F.date('birth'), { hint:'用於年齡與體能常模' })}${isRes() ? F.field('房號／床號', F.input('bed', { ph:'例：201-1' })) : '<div></div>'}
    ${F.field('主要診斷', F.input('diagnosis', { ph:'例：腦中風右側偏癱' }), { cls:'span2' })}
    ${F.field('使用輔具', F.input('aids', { ph:'例：四腳拐、輪椅' }))}${F.field('個別注意事項', F.input('caution', { ph:'例：姿勢性低血壓' }))}
    ${F.field('服務狀態', F.select('status', ['服務中', '結案'], { blank:false }))}</div>`,
    { wide:true, extra:id ? btn('刪除此' + term(), `closeModal(true);deleteClient('${id}')`, { k:'danger ghost', i:'trash' }) : '',
      onSave:() => { if (!S.edit.name?.trim()) { toast('請填寫姓名', 'err'); return false; } const s = Store.upsert('clients', S.edit); S.dirty = false; toast('已儲存'); if (!id) App.go('#/client/' + s.id); else route(); }, restore:() => { S.dirty = false; } });
}

/* ---------------- 個案頁 ---------------- */
const CTABS = [['assess', '評估'], ['plan', '介入計畫'], ['check', '執行紀錄'], ['export', '列印輸出']];
function pageClient(id, tab){
  const c = Store.get('clients', id); if (!c) { App.go('#/clients'); return ''; }
  setTitle(c.name, [isRes() ? c.bed : '', c.gender, ageAt(c.birth) != null ? ageAt(c.birth) + '歲' : '', c.diagnosis].filter(Boolean).join('・'));
  const body = { assess:cAssess, plan:cPlan, check:cCheck, export:cExport }[tab] || cAssess;
  return `<div class="toolbar"><a class="btn" href="#/clients">${icon('back', 16)}名冊</a><span class="sp"></span>${btn('刪除此' + term(), `deleteClient('${c.id}')`, { k:'danger ghost', i:'trash' })}${btn('編輯基本資料', `editClient('${c.id}')`, { i:'edit' })}</div>
  <div class="tabs">${CTABS.map(([k, l], i) => `<a href="#/client/${c.id}/${k}" class="${tab === k ? 'on' : ''}"><span class="tn-n">${i + 1}</span>${l}</a>`).join('')}</div>${body(c)}`;
}
function cAssess(c){
  const as = Logic.assessmentsOf(c.id).reverse();
  return `<section class="card"><h2>評估紀錄 <span class="sp"></span><a class="btn primary sm" href="#/assess/new/${c.id}">${icon('plus', 14)}${as.length ? '再評估' : '進行評估'}</a></h2>
    ${as.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>日期</th><th>類別</th><th>評估者</th><th>巴氏</th><th>TUG</th><th>30秒坐站</th><th>握力</th><th>需復能問題</th><th>輸出</th></tr></thead><tbody>${as.map(a => `<tr><td><a href="#/assess/${a.id}">${rocDate(a.date)}</a></td><td>${badge(a.type)}</td><td>${esc(a.assessor || '')}</td><td>${scoreBarthel(a)?.total ?? '—'}</td><td>${a.phy?.tug || '—'}</td><td>${a.phy?.cs30 ?? '—'}</td><td>${a.phy?.grip || '—'}</td><td><small>${esc((a.problems || []).map(p => p.text).join('、').slice(0, 60))}</small></td><td class="nowrap">${exportBar('as_' + a.id, () => assessDoc(Store.get('assessments', a.id), c), ['pdf', 'word'])}</td></tr>`).join('')}</tbody></table></div>` : empty('尚無評估紀錄')}</section>
  ${copmCompare(c)}
  ${as.length > 1 ? `<section class="card"><h2>巴氏量表變化</h2>${lineChart(Logic.assessmentsOf(c.id).map(a => ({ x:a.date, y:scoreBarthel(a)?.partial ? null : scoreBarthel(a)?.total })), { min:0, max:100 })}</section>` : ''}`;
}
function copmCompare(c){
  const as = Logic.assessmentsOf(c.id).filter(a => copmRows(a).length); if (!as.length) return '';
  const cur = as.at(-1), pre = as.length > 1 ? as.at(-2) : null;
  const d = (n, o) => n !== '' && n != null && o !== '' && o != null ? (+n - +o >= 2 ? badge('+' + (+n - +o) + ' 有意義進步', 'green') : badge((+n - +o >= 0 ? '+' : '') + (+n - +o), +n < +o ? 'amber' : '')) : '';
  return `<section class="card"><h2>最想做到的事 <small>${pre ? `${rocDate(pre.date)} → ${rocDate(cur.date)}` : rocDate(cur.date)}｜自評 1–10</small></h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>想做到的事</th><th>重要性</th><th>表現</th><th>滿意度</th>${pre ? '<th>表現變化</th><th>滿意度變化</th>' : ''}</tr></thead><tbody>
  ${copmRows(cur).map(x => { const o = pre && copmRows(pre).find(y => y.activity === x.activity); return `<tr><td><b>${esc(x.activity)}</b> <small class="muted">${esc(x.area || '')}</small></td><td>${x.imp ?? ''}</td><td>${o ? `${o.perf ?? '—'} → ` : ''}<b>${x.perf ?? '—'}</b></td><td>${o ? `${o.sat ?? '—'} → ` : ''}<b>${x.sat ?? '—'}</b></td>${pre ? `<td>${o ? d(x.perf, o.perf) : badge('新增')}</td><td>${o ? d(x.sat, o.sat) : ''}</td>` : ''}</tr>`; }).join('')}
  </tbody></table></div>${(cur.goalReview || []).length ? `<h3>前次計畫目標達成（GAS）</h3><ul class="list">${cur.goalReview.map(g => `<li>${esc(g.text)}：${badge((GAS.find(x => x[0] === +g.gas) || ['', '未評'])[1], +g.gas >= 0 && g.gas !== '' ? 'green' : 'amber')} ${esc(g.note || '')}</li>`).join('')}</ul>` : ''}</section>`;
}
function planView(p){
  return `${(p.goals || []).length ? `<p><b>目標：</b>${p.goals.map((g, i) => `${i + 1}. ${esc(g.text)}`).join('　')}</p>` : ''}
    <h3>個別介入</h3><div class="mini-items">${(p.items || []).map(it => `<div class="mini-item">${thumb(it.img)}<div><b>${esc(it.name)}</b> ${badge(it.type || '')}<small>${esc(it.dose || '')}｜${esc(freqText(it))}｜${esc(it.executor || '')}</small></div></div>`).join('') || '<p class="muted">—</p>'}</div>
    ${(p.groups || []).length ? `<h3>團體介入</h3><p>${p.groups.map(g => badge(g.type + (g.freq ? '・' + g.freq : ''), 'green')).join(' ')}</p>` : ''}
    ${(p.devices || []).length ? `<h3>建議評估輔具</h3><p>${p.devices.map(d => badge(d)).join(' ')} <a href="${DEVICE_DB_URL}" target="_blank" rel="noopener">查長照輔具資料庫 ↗</a></p>` : ''}`;
}
function cPlan(c){
  const ps = Logic.plansOf(c.id).reverse(), act = activePlan(c.id), last = Logic.lastAssessment(c.id);
  return `<div class="toolbar">${last ? `<a class="btn primary" href="#/plan/new/${c.id}?from=${last.id}${act ? '&copy=' + act.id : ''}">${icon('rx', 16)}${act ? '依最新評估修正計畫' : '依評估開立介入計畫'}</a>` : `<a class="btn primary" href="#/assess/new/${c.id}">先進行評估</a>`}
    ${act ? `<a class="btn" href="#/plan/new/${c.id}?copy=${act.id}">複製為新版本</a>` : ''}</div>
  ${ps.length ? ps.map(p => `<section class="card ${p.status === '執行中' ? 'hl' : 'dim'}"><h2>v${p.version} ${badge(p.status, p.status === '執行中' ? 'green' : '')}<small>${rocDate(p.startDate)}～${rocDate(p.endDate)}｜${esc(p.author || '')}</small><span class="sp"></span>
    <a class="btn sm" href="#/plan/${p.id}">${p.status === '執行中' ? '編輯' : '檢視'}</a>${exportBar('pl_' + p.id, () => planDoc(Store.get('plans', p.id)))}</h2>${planView(p)}</section>`).join('') : `<section class="card">${empty('尚未開立介入計畫')}</section>`}`;
}
function cCheck(c){
  const p = activePlan(c.id);
  if (!p) return `<section class="card">${empty('沒有執行中的介入計畫', `<a class="btn primary" href="#/client/${c.id}/plan">前往開立計畫</a>`)}</section>`;
  const ws = S.week || weekStart(todayISO()), dates = Array.from({ length:7 }, (_, i) => addDays(ws, i));
  const recs = new Map(Store.all('checks').filter(x => x.clientId === p.clientId).map(x => [x.itemId + '|' + x.date, x]));
  const st = planStats(p, ws, addDays(ws, 6)), all = planStats(p, p.startDate, p.endDate);
  const note = Store.all('weekNotes').find(x => x.planId === p.id && x.week === ws);
  return `<div class="toolbar"><button class="btn" onclick="S.week=addDays('${ws}',-7);route()">${icon('back', 16)}上週</button><b>${rocDate(dates[0])} ～ ${rocDate(dates[6])}</b><button class="btn" onclick="S.week=addDays('${ws}',7);route()">下週</button>${ws !== weekStart(todayISO()) ? btn('回到本週', `S.week=null;route()`) : ''}
    <span class="sp"></span><span class="muted">本週 ${st.ok + st.part}/${st.exp}｜累計執行率 ${all.rate ?? '—'}%</span></div>
  <section class="card flush"><div class="tbl-wrap"><table class="ck"><thead><tr><th class="ck-n">項目</th>${dates.map(d => `<th class="${d === todayISO() ? 'today' : ''}">${d.slice(5).replace('-', '/')}<br><small>週${WEEKDAYS[weekday(d)]}</small></th>`).join('')}</tr></thead><tbody>
  ${(p.items || []).map(it => `<tr><th class="ck-n"><div class="ck-it">${thumb(it.img, 'sm')}<div><b>${esc(it.name)}</b><small>${esc(it.dose || '')}｜${esc(it.executor || '')}</small></div></div></th>${dates.map(d => { if (!scheduled(p, it, d)) return '<td class="off">—</td>'; const r = recs.get(it.id + '|' + d); return `<td><button class="ckb ${r ? 's-' + r.status : ''}" onclick="setCheck('${p.id}','${it.id}','${d}',NEXT['${r?.status || ''}']);route()" title="${r ? esc(r.by || '') : '尚未記錄'}" aria-label="${esc(it.name)} ${d}">${r ? SYM[r.status] : ''}</button></td>`; }).join('')}</tr>`).join('')}
  </tbody></table></div></section>
  <section class="card"><h2>本週備註</h2><textarea class="inp" rows="3" placeholder="未執行原因、反應、進步或異常狀況…" onchange="saveWeekNote('${p.id}','${c.id}','${ws}',this.value)">${esc(note?.note || '')}</textarea>
    <div class="exp-row"><span>印出本週檢核表</span>${exportBar('wk_' + p.id, () => indivCheckDoc(activePlan(c.id), { mode:'week', week:ws, filled:true }), ['pdf', 'word'])}</div></section>`;
}
function saveWeekNote(planId, cid, week, note){ const r = Store.all('weekNotes').find(x => x.planId === planId && x.week === week) || { planId, clientId:cid, week }; r.note = note; r.by = App.currentUserId(); Store.upsert('weekNotes', r); toast('已儲存備註'); }

let expOpt = { mode:'week', filled:false };
function cExport(c){
  const p = activePlan(c.id), a = Logic.lastAssessment(c.id), ws = expOpt.week || weekStart(todayISO()), mo = expOpt.month || todayISO().slice(0, 7);
  return `<section class="card"><h2>個別執行檢核表 <small>印出後由照服員、治療師或${term()}本人勾選</small></h2>
    ${p ? `<div class="form-grid g3">
      <div class="field"><label class="lbl">版本</label><div class="pills">${[['week', '週表'], ['month', '月表'], ['big', `${term()}自我檢核（大字＋圖）`]].map(([v, l]) => `<label class="pill"><input type="radio" name="em" ${expOpt.mode === v ? 'checked' : ''} onchange="expOpt.mode='${v}';route()"><span>${l}</span></label>`).join('')}</div></div>
      <div class="field"><label class="lbl">${expOpt.mode === 'month' ? '月份' : '週（任選一天）'}</label>${expOpt.mode === 'month' ? `<input type="month" class="inp" value="${mo}" onchange="expOpt.month=this.value">` : `<input type="date" class="inp" value="${ws}" onchange="expOpt.week=weekStart(this.value);route()">`}</div>
      <div class="field"><label class="lbl">內容</label><div class="pills">${[[false, '空白（手寫勾選）'], [true, '帶入已記錄']].map(([v, l]) => `<label class="pill"><input type="radio" name="ef" ${expOpt.filled === v ? 'checked' : ''} onchange="expOpt.filled=${v}"><span>${l}</span></label>`).join('')}</div></div></div>
      <div class="exp-row"><span>產生檢核表</span>${exportBar('ck_' + c.id, () => indivCheckDoc(activePlan(c.id), { mode:expOpt.mode === 'month' ? 'month' : 'week', big:expOpt.mode === 'big', week:expOpt.week || weekStart(todayISO()), month:expOpt.month || todayISO().slice(0, 7), filled:expOpt.filled }), ['pdf', 'word'])}</div>` : empty('需先開立介入計畫')}
  </section>
  <section class="card"><h2>其他文件</h2>
    ${p ? `<div class="exp-row"><span>復能介入計畫書（含項目圖片，PPT 為一項一頁的衛教投影片）</span>${exportBar('pl_' + p.id, () => planDoc(Store.get('plans', p.id)))}</div>` : ''}
    ${a ? `<div class="exp-row"><span>最近一次評估表（${rocDate(a.date)}）</span>${exportBar('as_' + a.id, () => assessDoc(Store.get('assessments', a.id), c), ['pdf', 'word'])}</div>` : ''}
    <div class="exp-row"><span>空白評估表（已帶入姓名）</span>${exportBar('ba_' + c.id, () => assessDoc(null, c), ['pdf', 'word'])}</div></section>`;
}

/* ---------------- 評估 ---------------- */
function pageAssessEdit(id, cid){
  let a, carried = null;
  if (id) a = clone(Store.get('assessments', id) || {});
  else {
    const prev = Logic.lastAssessment(cid);
    a = { clientId:cid, date:todayISO(), type:prev ? '再評' : '初評', assessor:App.currentUserId(), role:prev?.role || '', adl:{}, iadl:{}, spmsq:{ items:Array(10).fill(''), edu:'' }, phy:{}, pain:{}, physio:'', strength:'', expect:'', problemSel:{}, customProblems:'', summary:'' };
    if (prev) {
      // 再評：帶入上一次評估（初評或前次再評）內容，只改有變化的部分；體能測試與自評分數需重新施測
      Object.assign(a, { adl:clone(prev.adl || {}), iadl:clone(prev.iadl || {}), spmsq:clone(prev.spmsq || { items:Array(10).fill(''), edu:'' }), pain:clone(prev.pain || {}), physio:prev.physio || '', strength:prev.strength || '', expect:prev.expect || '', phy:{ note:prev.phy?.note || '' } });
      carried = prev;
    }
    a.copm = prev && copmRows(prev).length ? copmRows(prev).map(x => ({ activity:x.activity, area:x.area || '', imp:x.imp ?? '', perf:'', sat:'' })) : [{}, {}, {}];
    const pl = activePlan(cid); if (pl && prev) a.goalReview = (pl.goals || []).filter(g => g.text).map(g => ({ goalId:g.id, planId:pl.id, activity:g.activity || '', text:g.text, measure:g.measure || '', baseline:g.baseline || '', target:g.target || '', current:'', gas:'', note:'' }));
  }
  if (!a.copm) a.copm = [{}, {}, {}];
  const c = Store.get('clients', a.clientId); if (!c) { App.go('#/clients'); return ''; }
  S.edit = a;
  const prev = Logic.assessmentsOf(c.id).filter(x => x.id !== a.id && x.date <= a.date).at(-1);
  S._ac = { c, prev, id, carried };
  setTitle((id ? '' : '新增') + (a.type || '') + '評估', c.name);
  S.onEdit = p => { liveSum(c); if (/^copm/.test(p)) copmAvgUpdate(); if (/^(adl|iadl|phy|spmsq|pain|copm)/.test(p)) { clearTimeout(S._t); S._t = setTimeout(() => { const el = $('#sugg'); if (el) el.innerHTML = suggHTML(c); }, 250); } };
  return pageAssessBody();
}
function pageAssessBody(){ setTimeout(() => liveSum(S._ac.c), 0); return assessForm(); }
function carryPhy(){ const pr = S._ac.prev; if (!pr) return; S.edit.phy = { ...clone(pr.phy || {}), note:(S.edit.phy?.note || pr.phy?.note || '') }; S.dirty = true; rerender(pageAssessBody); toast('已帶入前次體能數值，請記得在說明註明「未重測」'); }
function assessForm(){
  const a = S.edit, { c, prev, id, carried } = S._ac;
  const pv = (v, cur) => prev ? `<span class="prev ${cur !== undefined && String(cur ?? '') !== String(v ?? '') ? 'chg' : ''}">前次：${v ?? '—'}</span>` : '';
  const sec = (t, body, o = '') => `<section class="card"><h2>${t}${o ? ` <small>${o}</small>` : ''}</h2>${body}</section>`;
  const opt = (t, body, o, open) => `<details class="card opt" ${open ? 'open' : ''}><summary><h2>${t} <small>${o}</small></h2></summary>${body}</details>`;
  const hasPain = a.pain?.nrs !== '' && a.pain?.nrs != null || !!(a.pain?.site || a.physio || a.strength || a.expect);
  const hasIadl = Object.values(a.iadl || {}).some(v => v !== '' && v != null), hasSp = (a.spmsq?.items || []).some(Boolean);
  const ph = (k, l, u, h) => F.field(`${l}（${u}）`, F.num('phy.' + k, { min:0 }) + pv(prev?.phy?.[k]), { hint:h });
  return `<div class="toolbar sticky-bar"><a class="btn" href="#/client/${c.id}">${icon('back', 16)}${esc(c.name)}</a><span class="sp"></span>
    ${id ? btn('刪除', `if(askConfirm('確定刪除此評估？')){Store.remove('assessments','${id}');S.dirty=false;App.go('#/client/${c.id}')}`, { k:'danger ghost', i:'trash' }) : ''}${btn('儲存', 'saveAssess(false)')}${btn('儲存並開立介入計畫', 'saveAssess(true)', { k:'primary', i:'rx' })}</div>
  <div class="edit-layout"><div class="edit-main">
    ${carried ? `<div class="notice carry">已帶入 <b>${rocDate(carried.date)} ${esc(carried.type)}</b> 的內容：最想做到的事、巴氏量表、IADL、認知、疼痛與現況。<b>請只修改有變化的項目。</b>體能測試與自評分數需重新施測，前次數值顯示在旁（橘色＝本次已修改）。</div>` : ''}
    ${sec('基本', `<div class="form-grid g3">${F.field('評估日期', F.date('date'), { req:true })}${F.field('類別', F.select('type', ['初評', '再評', '不定期'], { blank:false }))}${F.field('評估者', F.input('assessor'), { req:true })}${F.field('職類', F.select('role', PRO_ROLES))}</div>`)}
    ${sec('① 最想做到的事 <small>以長輩為中心（參考 COPM）</small>', copmHTML(prev))}
    ${(a.goalReview || []).length ? sec('② 前次計畫目標達成（GAS）', gasHTML(), '再評估時評定，作為修正計畫依據') : ''}
    ${sec('日常生活功能｜巴氏量表', BARTHEL.map(it => `<div class="q"><div class="qh"><b>${it.n}</b>${pv(prev?.adl?.[it.k], a.adl?.[it.k])}</div>${F.radios('adl.' + it.k, it.opts.map(([s, d]) => [s, `${s} 分｜${d}`]), { t:'num', cls:'vert' })}</div>`).join(''))}
    ${sec('體能與跌倒風險', `<div class="form-grid g3">${ph('tug', 'TUG 起身行走', '秒', '≥13.5 秒跌倒高風險')}${ph('cs30', '30秒坐站', '次', c.birth ? `同齡平均下限 ${cs30Cut(ageAt(c.birth, a.date), c.gender)} 次` : '填出生日期可比對常模')}${ph('grip', '握力', '公斤', '男<28、女<18')}${ph('oneLeg', '單腳站立', '秒', '<5 秒跌倒風險')}${ph('tandem', '前後腳站立', '秒', '腳跟貼腳尖站，測到 10 秒即停；<10 秒平衡不佳（SPPB）')}${ph('gait4', '4公尺步行', '秒', '自動換算步速')}${F.field('使用輔具／無法施測說明', F.input('phy.note'))}</div>${prev && Object.keys(prev.phy || {}).some(k => k !== 'note' && prev.phy[k] !== '' && prev.phy[k] != null) ? `<p class="hint">本次無法重測時：${btn('帶入前次體能數值', 'carryPhy()', { k:'sm' })}</p>` : ''}`)}
    ${opt('工具性日常生活 IADL', IADL.map(it => `<div class="q"><div class="qh"><b>${it.n}</b>${prev?.iadl?.[it.k] != null && prev.iadl[it.k] !== '' ? pv(it.opts[prev.iadl[it.k]]?.[0], it.opts[a.iadl?.[it.k]]?.[0]) : ''}</div>${F.radios('iadl.' + it.k, it.opts.map(([d, s], i) => [i, `${d}（${s}）`]), { t:'num', cls:'vert' })}</div>`).join(''), '選填，日照較常使用', hasIadl)}
    ${opt('認知 SPMSQ', `${F.field('教育程度', F.radios('spmsq.edu', EDU_OPTS))}<table class="tbl qa"><tbody>${SPMSQ.map((q, i) => `<tr><td>${i + 1}. ${q}</td><td>${F.radios('spmsq.items.' + i, [['c', '正確'], ['x', '錯誤']])}</td></tr>`).join('')}</tbody></table>`, '選填', hasSp)}
    ${opt('疼痛與現況', `<div class="form-grid">${F.field(`疼痛 0–10　<a href="javascript:void(0)" onclick="S.edit.pain.nrs='';document.querySelectorAll('input[name=\\'pain.nrs\\']').forEach(r=>r.checked=false);S.dirty=true;liveSum(Store.get('clients',S.edit.clientId))">清除</a>`, F.radios('pain.nrs', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => [n, String(n)]), { t:'num' }), { cls:'span2' })}${F.field('疼痛部位', F.input('pain.site'))}<div></div>
      ${F.field('身體與生活現況', F.text('physio', { rows:2 }), { cls:'span2' })}${F.field('優勢與興趣', F.text('strength', { rows:2, ph:'例：喜歡唱歌、以前是農夫（可作為團體安排參考）' }))}${F.field(`${term()}／家屬期待`, F.text('expect', { rows:2, ph:'例：想自己走去廁所' }))}</div>`, '選填', hasPain)}
    ${sec('評估結果：需復能的問題', `<p class="hint">依評估結果自動建議；勾選的問題會帶入介入計畫，並附上建議的個別項目、團體與輔具。</p><div id="sugg">${suggHTML(c)}</div>${F.field('其他問題（每行一項）', F.text('customProblems', { rows:2 }))}${F.field('評估摘要', F.text('summary', { rows:2 }))}`)}
  </div><aside class="edit-side"><div class="card sticky" id="live"></div></aside></div>`;
}
function copmHTML(prev){
  const a = S.edit, pr = act => prev ? copmRows(prev).find(x => x.activity === act) : null;
  return `<div class="notice">先問長輩：「現在有哪些日常的事，是您<b>想要自己做、需要做或別人期待您做</b>，但<b>做不到或做得不滿意</b>的？」再請長輩挑出<b>最重要的 1–5 件</b>。</div>
  <details class="more"><summary>訪談提示：三大領域與常見例子（點例子可直接加入）</summary>${COPM_AREAS.map(([ar, d, ex]) => `<div class="copm-area"><b>${ar}</b><small>${d}</small><div class="pills">${ex.map(e => `<button type="button" class="chip" onclick="copmAdd('${e}','${ar}')">${icon('plus', 12)}${e}</button>`).join('')}</div></div>`).join('')}</details>
  <div class="tbl-wrap"><table class="tbl copm"><thead><tr><th>#</th><th>想做到的事（用長輩自己的話）</th><th>領域</th><th>重要性<br><small>1–10</small></th><th>目前表現<br><small>1–10</small></th><th>滿意度<br><small>1–10</small></th><th></th></tr></thead><tbody>
  ${a.copm.map((x, i) => { const q = pr(x.activity); return `<tr><td>${i + 1}</td><td>${F.input(`copm.${i}.activity`, { ph:i ? '' : '例：自己走去市場買菜' })}</td><td>${F.select(`copm.${i}.area`, COPM_AREAS.map(r => r[0]))}</td><td>${F.num(`copm.${i}.imp`, { min:1, max:10, cls:'w5' })}</td><td>${F.num(`copm.${i}.perf`, { min:1, max:10, cls:'w5' })}${q && q.perf !== '' && q.perf != null ? `<span class="prev">前次 ${q.perf}</span>` : ''}</td><td>${F.num(`copm.${i}.sat`, { min:1, max:10, cls:'w5' })}${q && q.sat !== '' && q.sat != null ? `<span class="prev">前次 ${q.sat}</span>` : ''}</td><td>${btn('✕', `S.edit.copm.splice(${i},1);rerender(()=>pageAssessBody())`, { k:'sm ghost' })}</td></tr>`; }).join('')}
  </tbody></table></div>${a.copm.length < 5 ? btn('新增一列', 'S.edit.copm.push({});rerender(()=>pageAssessBody())', { k:'sm', i:'plus' }) : ''}
  <p class="hint" id="copm-avg">${copmAvgText(prev)}</p>
  <p class="hint">分數由長輩自評（1＝完全做不到／非常不滿意，10＝做得很好／非常滿意）。中重度失智無法自評者可只填「想做到的事」。再評估時表現或滿意度進步 ≥2 分即具臨床意義。</p>`;
}
function copmAvgText(prev){ const p = copmAvg(S.edit, 'perf'), s = copmAvg(S.edit, 'sat'), pp = prev ? copmAvg(prev, 'perf') : null, ps = prev ? copmAvg(prev, 'sat') : null;
  const d = (n, o) => n != null && o != null ? `（前次 ${o}，${n - o >= 0 ? '+' : ''}${Math.round((n - o) * 10) / 10}${n - o >= 2 ? '，具臨床意義進步' : ''}）` : '';
  return `平均表現 <b>${p ?? '—'}</b>${d(p, pp)}　平均滿意度 <b>${s ?? '—'}</b>${d(s, ps)}`; }
function copmAvgUpdate(){ const el = $('#copm-avg'); if (el) el.innerHTML = copmAvgText(Logic.assessmentsOf(S.edit.clientId).filter(x => x.id !== S.edit.id && x.date <= S.edit.date).at(-1)); }
function copmAdd(act, area){ const rows = S.edit.copm, empty = rows.find(x => !x.activity); if (empty) Object.assign(empty, { activity:act, area }); else if (rows.length < 5) rows.push({ activity:act, area }); else return toast('最多 5 件，請先刪除一列', 'err'); S.dirty = true; rerender(() => pageAssessBody()); }
function gasHTML(){
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>計畫目標</th><th>目前 → 目標值</th><th>本次現況</th><th>GAS 達成度</th><th>說明</th></tr></thead><tbody>${S.edit.goalReview.map((g, i) => `<tr><td>${esc(g.text)}<br><small class="muted">${esc(g.measure)}</small></td><td>${esc(g.baseline)} → ${esc(g.target)}</td><td>${F.input(`goalReview.${i}.current`, { cls:'w6' })}</td><td>${F.select(`goalReview.${i}.gas`, GAS, { t:'num' })}</td><td>${F.input(`goalReview.${i}.note`)}</td></tr>`).join('')}</tbody></table></div>
  <p class="hint">GAS（目標達成量表）：0 分＝剛好達成目標；負分＝未達成；正分＝超越目標。</p>`;
}
function suggHTML(c){
  const sg = suggestFromAssessment(S.edit, c);
  if (!sg.length) return '<p class="muted">（填寫量表後顯示）</p>';
  S.edit.problemSel ||= {}; sg.forEach(s => { if (!(s.code in S.edit.problemSel)) S.edit.problemSel[s.code] = true; });
  return `<ul class="sugg">${sg.map(s => `<li>${F.check('problemSel.' + s.code, `<b>${esc(s.text)}</b>${s.ex.length ? `<small>個別：${s.ex.map(e => esc(findItem(e)?.name || e)).join('、')}</small>` : ''}${s.grp.length ? `<small>團體：${esc(s.grp.join('、'))}</small>` : ''}${s.dev.length ? `<small>輔具：${esc(s.dev.join('、'))}</small>` : ''}${s.referral ? `<small class="ref">建議轉介：${esc(s.referral)}</small>` : ''}`)}</li>`).join('')}</ul>`;
}
function liveSum(c){
  const a = S.edit, el = $('#live'); if (!el || !a) return;
  const b = scoreBarthel(a), i = scoreIADL(a), s = scoreSPMSQ(a), p = a.phy || {}, ag = ageAt(c.birth, a.date), gs = gaitSpeed(a);
  const r = (k, v, f) => `<div class="ls ${f ? 'flag' : ''}"><span>${k}</span><b>${v}</b></div>`;
  el.innerHTML = `<h3>即時計分</h3>${r('巴氏', b ? `${b.total} <small>${b.level}</small>` : '—', b && !b.partial && b.total < 91)}${r('TUG', p.tug ? p.tug + ' 秒' : '—', +p.tug >= PHY_CUT.tug)}${r('30秒坐站', p.cs30 !== '' && p.cs30 != null ? p.cs30 + ' 次' : '—', ag && p.cs30 !== '' && p.cs30 != null && +p.cs30 < cs30Cut(ag, c.gender))}${r('握力', p.grip ? p.grip + ' kg' : '—', p.grip && +p.grip < (c.gender === '男' ? PHY_CUT.gripM : PHY_CUT.gripF))}${r('單腳站', p.oneLeg ? p.oneLeg + ' 秒' : '—', p.oneLeg !== '' && p.oneLeg != null && +p.oneLeg < PHY_CUT.oneLeg)}${r('前後腳站', p.tandem !== '' && p.tandem != null ? p.tandem + ' 秒' : '—', p.tandem !== '' && p.tandem != null && +p.tandem < PHY_CUT.tandem)}${r('步速', gs != null ? gs + ' m/s' : '—', gs != null && gs < PHY_CUT.gait)}${r('IADL', i ? i.total + '/8' : '—')}${r('SPMSQ', s ? (s.partial ? '未完成' : `錯 ${s.errors}`) : '—', s && s.adj >= 3)}<p class="hint">紅字＝需注意，最終判斷由專業人員決定。</p>`;
}
function saveAssess(toPlan){
  const a = S.edit, c = Store.get('clients', a.clientId);
  if (!a.date || !a.assessor?.trim()) return toast('請填寫評估日期與評估者', 'err');
  if ((!scoreBarthel(a) || scoreBarthel(a).partial) && !askConfirm('巴氏量表尚未填完，仍要儲存？')) return;
  const sg = suggestFromAssessment(a, c);
  a.problems = [...sg.filter(s => a.problemSel?.[s.code] !== false), ...(a.customProblems || '').split('\n').map(t => t.trim()).filter(Boolean).map(t => ({ code:'custom', text:t, ex:[], dev:[], grp:[], referral:'' }))];
  const s = Store.upsert('assessments', a); S.dirty = false; toast('評估已儲存');
  const act = activePlan(a.clientId);
  App.go(toPlan ? `#/plan/new/${a.clientId}?from=${s.id}${act ? '&copy=' + act.id : ''}` : `#/client/${a.clientId}`);
}

/* ---------------- 介入計畫 ---------------- */
function mkItem(exId){ const e = exId ? findItem(exId) : null; return { id:Store.newId(), exId:exId || '', name:e?.name || '', cat:e?.cat || '其他', type:e?.type || '運動', dose:e?.dose || '', how:e?.how || '', steps:e?.steps || '', caution:e?.caution || '', img:e?.img || '', days:defaultDays(), times:1, executor:'照顧服務員' }; }
function pagePlanEdit(id, cid, params){
  let p;
  if (id) p = clone(Store.get('plans', id) || {});
  else {
    const from = params.get('from') ? Store.get('assessments', params.get('from')) : null, base = params.get('copy') ? Store.get('plans', params.get('copy')) : null;
    const done = achievedGoals(cid, from);
    const cp = from ? copmRows(from).slice().sort((x, y) => (+y.imp || 0) - (+x.imp || 0)) : [];
    const perfTxt = x => x.perf !== '' && x.perf != null ? `自評表現 ${x.perf}/10` : '';
    // 目標：已達成（再評 GAS ≥ 0）的不自動帶入；新的「最想做到的事」（未達成過）才加成新目標
    let goals = clone(base?.goals || []).filter(g => !done.ids.has(g.id) && !done.acts.has(g.activity || ''));
    const carried = clone(base?.goals || []).filter(g => !goals.includes(g) && (done.ids.has(g.id) || done.acts.has(g.activity || '')));
    cp.forEach(x => { const g = goals.find(g => (g.activity || g.text) === x.activity); if (g && perfTxt(x)) g.baseline = perfTxt(x); });
    cp.filter(x => !done.acts.has(x.activity) && !goals.some(g => (g.activity || g.text) === x.activity)).forEach(x => { if (goals.length < 3) goals.push(newGoal({ activity:x.activity, baseline:perfTxt(x) })); });
    // 問題：量表發現的功能問題全部帶入；「最想做到」只帶入有對應目標的
    const probs = planProblemsFor(from, goals);
    p = { clientId:cid, assessmentId:from?.id || base?.assessmentId || '', version:Math.max(0, ...Logic.plansOf(cid).map(x => x.version || 0)) + 1, copyOf:base?.id || '', status:'草稿',
      startDate:todayISO(), endDate:addDays(todayISO(), 83), author:App.currentUserId(), role:from?.role || base?.role || '',
      problems:from ? probs.map(x => x.text) : [...(base?.problems || [])], goals, items:clone(base?.items || []),
      groups:clone(base?.groups || []), devices:[...new Set([...(base?.devices || []), ...probs.flatMap(x => x.dev || [])])], note:base?.note || '' };
    p._done = carried;
    if (!base) [...new Set(probs.flatMap(x => x.grp || []))].forEach(t => p.groups.push({ type:t, freq:'', note:'' }));
    if (!p.goals.length) p.goals.push(newGoal());
    p._sug = [...new Set(probs.flatMap(x => x.ex || []))];
  }
  const c = Store.get('clients', p.clientId); if (!c) { App.go('#/clients'); return ''; }
  if (id && p.status !== '執行中') { setTitle('介入計畫 v' + p.version, c.name); return `<div class="toolbar"><a class="btn" href="#/client/${c.id}/plan">${icon('back', 16)}${esc(c.name)}</a><span class="sp"></span>${exportBar('pv_' + p.id, () => planDoc(Store.get('plans', p.id)))}</div><div class="notice">此版本已結束，僅供檢視與輸出。</div><section class="card">${planView(p)}</section>`; }
  p.goals.forEach(g => { if (g.activity == null && g.text) g.activity = g.text; });
  S.edit = p; setTitle((id ? '編輯' : '開立') + '復能介入計畫 v' + p.version, c.name);
  S.onEdit = path => { const m = path.match(/^goals\.(\d+)\./); if (m) { const g = S.edit.goals[+m[1]]; g.text = composeGoal(g); const el = $('#gp-' + m[1]); if (el) el.textContent = g.text || '（填寫上方欄位後自動組成目標）'; } };
  return planHTML();
}
function planHTML(){
  const p = S.edit, c = Store.get('clients', p.clientId), sug = (p._sug || []).filter(e => !p.items.some(it => it.exId === e));
  const types = [...GROUP_TYPES, ...p.groups.map(g => g.type).filter(t => !GROUP_TYPES.includes(t))];
  const sugDev = [...new Set([...(Logic.lastAssessment(c.id)?.problems || []).flatMap(x => x.dev || []), ...p.devices])];
  return `<div class="toolbar sticky-bar"><a class="btn" href="#/client/${c.id}/plan">${icon('back', 16)}${esc(c.name)}</a><span class="sp"></span>
    ${p.id ? btn('刪除此版本', 'deletePlan()', { k:'danger ghost', i:'trash' }) + btn('結束此計畫', 'endPlan()', { k:'ghost' }) : ''}${btn(p.id ? '儲存' : '儲存並開始執行', 'savePlan()', { k:'primary', i:'check' })}</div>
  <section class="card"><h2>計畫資訊</h2><div class="form-grid g3">${F.field('開始日期', F.date('startDate'), { req:true })}${F.field('結束日期', F.date('endDate'), { req:true, hint:'建議 8–12 週後再評估' })}${F.field('擬定者', F.input('author'), { req:true })}${F.field('職類', F.select('role', PRO_ROLES))}</div></section>
  <section class="card"><h2>需復能的問題與目標</h2>${p.problems.map((x, i) => `<div class="row-edit">${F.input('problems.' + i)}${btn('✕', `S.edit.problems.splice(${i},1);rerender(planHTML)`, { k:'sm ghost' })}</div>`).join('')}${btn('新增問題', `S.edit.problems.push('');rerender(planHTML)`, { k:'sm', i:'plus' })}
    <h3>復能目標 <small class="muted">以長輩「最想做到的事」為核心，寫成生活中有意義的一件事：多久內＋用什麼方式／輔具＋協助程度＋在什麼情境做到什麼＋怎麼算達成</small></h3>
    ${(p._done || []).length ? `<div class="notice done-goals"><b>已達成的目標（未帶入新計畫，維持即可）：</b>${p._done.map((g, i) => `<div class="row-edit"><span>✓ ${esc(g.text)}</span><button type="button" class="chip" onclick="S.edit.goals.push(S.edit._done.splice(${i},1)[0]);S.dirty=true;rerender(planHTML)">重新加入</button></div>`).join('')}</div>` : ''}
    ${p.goals.map((g, i) => goalCard(g, i)).join('')}
    ${btn('新增目標', `S.edit.goals.push(newGoal());rerender(planHTML)`, { k:'sm', i:'plus' })}</section>
  <section class="card"><h2>個別介入 <small>運動、日常生活訓練｜會出現在今日勾選與檢核表</small><span class="sp"></span>${btn('從項目庫挑選', 'openPicker()', { k:'primary sm', i:'plus' })}</h2>
    ${sug.length ? `<div class="notice">評估建議：${sug.map(e => `<button type="button" class="chip hl" onclick="addItem('${e}')">${icon('plus', 14)}${esc(findItem(e)?.name || e)}</button>`).join('')} <button type="button" class="chip" onclick="(S.edit._sug||[]).forEach(e=>S.edit.items.some(it=>it.exId===e)||S.edit.items.push(mkItem(e)));S.dirty=true;rerender(planHTML)">全部加入</button></div>` : ''}
    <div class="items-edit">${p.items.map((it, i) => `<div class="item-card"><div class="ic-h">${thumb(it.img)}<b>${i + 1}.</b>${F.input(`items.${i}.name`, { cls:'grow' })}${F.select(`items.${i}.type`, ['運動', '日常生活訓練', '其他'], { blank:false })}${btn('✕', `S.edit.items.splice(${i},1);rerender(planHTML)`, { k:'sm ghost', title:'移除' })}</div>
      <div class="form-grid g3">${F.field('劑量', F.input(`items.${i}.dose`))}${F.field('執行者', F.select(`items.${i}.executor`, EXECUTORS, { blank:false }))}${F.field('每日次數', F.select(`items.${i}.times`, [1, 2, 3].map(n => [n, n + ' 次']), { t:'num', blank:false }))}
      ${F.field('執行日', `<div class="pills">${[1, 2, 3, 4, 5, 6, 7].map(w => F.checkArr(`items.${i}.days`, w, WEEKDAYS[w], true)).join('')}</div>`, { cls:'span3' })}</div>
      <details class="more"><summary>執行方式與注意事項</summary><div class="form-grid">${F.field('說明', F.text(`items.${i}.how`, { rows:2 }))}${F.field('步驟', F.text(`items.${i}.steps`, { rows:2 }))}${F.field('注意事項', F.text(`items.${i}.caution`, { rows:2 }), { cls:'span2' })}</div></details></div>`).join('') || '<p class="muted">按「從項目庫挑選」加入運動或日常生活訓練。</p>'}</div>
    ${btn('新增自訂項目', 'addItem()', { k:'sm', i:'plus' })}</section>
  <section class="card"><h2>團體介入 <small>勾選要參加的團體即可，不需填活動紀錄</small></h2>
    <div class="pills">${types.map(t => { const on = p.groups.some(g => g.type === t); return `<label class="pill"><input type="checkbox" ${on ? 'checked' : ''} onchange="toggleGroup('${esc(t)}',this.checked)"><span>${esc(t)}</span></label>`; }).join('')}
      <input class="inp sm" placeholder="其他團體，按 Enter" onkeydown="if(event.key==='Enter'&&this.value.trim()){toggleGroup(this.value.trim(),true)}"></div>
    ${p.groups.length ? `<div class="grp-rows">${p.groups.map((g, i) => `<div class="row-edit"><b class="w8">${esc(g.type)}</b>${F.input(`groups.${i}.freq`, { ph:'頻率，例：每週2次' })}${F.input(`groups.${i}.note`, { ph:'備註（選填）' })}</div>`).join('')}</div>` : ''}</section>
  <section class="card"><h2>建議評估輔具 <small>資料來自長照輔具資料庫</small><span class="sp"></span><a class="btn sm" href="${DEVICE_DB_URL}" target="_blank" rel="noopener">開啟長照輔具資料庫 ↗</a></h2>
    <div class="pills">${[...new Set([...sugDev, ...(S.allDev ? Object.keys(DEVICES) : [])])].map(d => `<label class="pill" title="${esc(DEVICES[d]?.s || '')}"><input type="checkbox" ${p.devices.includes(d) ? 'checked' : ''} onchange="toggleDev('${esc(d)}',this.checked)"><span>${sugDev.includes(d) ? '★ ' : ''}${esc(d)}</span></label>`).join('')}</div>
    <p class="hint">★＝依本次評估建議。滑鼠停在項目上可看說明。 <a href="javascript:void(0)" onclick="S.allDev=!S.allDev;rerender(planHTML)">${S.allDev ? '只顯示建議項目' : `顯示全部 ${Object.keys(DEVICES).length} 項常用輔具`}</a></p></section>
  <section class="card"><h2>備註</h2>${F.text('note', { rows:2, ph:'例：居家延續建議、轉介、特別注意' })}</section>`;
}
/* ---------- 復能目標（五要素：時限、方式／輔具、協助程度、活動情境、可測量） ---------- */
const GOAL_WHEN = ['4 週內', '8 週內', '12 週內', '3 個月內', '6 個月內'];
const GOAL_ASSIST = ['可獨立', '在旁人監督下（不需碰觸）', '在口頭提示下', '在少量協助下', '在中度協助下'];
/* 目標範例：依活動類型給「生活情境＋意義」與對應的可測量方式（復能精神：在真實生活中、為了想做的事） */
const GOAL_TYPES = [
  { k:'移動', re:/走|移動|散步|客廳|房間|看電視/, hint:'從哪裡到哪裡、去做什麼', scenes:['從臥室走到客廳，和家人一起看電視', '從房間走到餐廳，和大家一起吃午餐', '從床邊走到窗邊，看看外面的天氣'], measures:['中途不休息', '每天 2 次', '不需他人扶持'] },
  { k:'移位', re:/移位|輪椅|床上|起床|坐起|沙發/, hint:'從哪裡移到哪裡、為了做什麼', scenes:['從輪椅移到沙發上，陪孫子看卡通', '早上自己從床上坐起移到輪椅，準備參加早操', '從輪椅移到餐桌椅子上，和家人一起吃飯'], measures:['每天 2 次', '3 次中有 2 次成功', '不需他人抬起'] },
  { k:'如廁', re:/廁|尿|便/, hint:'在什麼情境下自己完成、對長輩的意義', scenes:['白天自己去廁所，不再需要包尿布', '出門參加活動時，能自己使用外面的廁所', '夜間自己下床使用床邊便盆椅，不必叫醒家人'], measures:['每天 3 次中有 2 次成功', '連續 1 週都做到', '白天不再尿濕褲子'] },
  { k:'洗澡', re:/洗澡|沐浴|洗頭/, hint:'自己完成哪一部分、保有什麼', scenes:['坐在洗澡椅上自己洗身體前面與手臂，保有洗澡的隱私', '自己洗頭，週末上教會前把自己打理乾淨'], measures:['每次洗澡都做到', '10 分鐘內完成'] },
  { k:'進食', re:/吃|飯|進食|喝|餐/, hint:'和誰、在什麼場合吃什麼', scenes:['和家人同桌，自己吃完一餐', '自己用湯匙吃完最愛的鹹粥', '在中心午餐時和朋友一起用餐，自己吃完'], measures:['不需他人餵食', '30 分鐘內吃完', '每天午晚餐都做到'] },
  { k:'穿衣', re:/穿|衣|鞋|襪|打扮/, hint:'為了什麼場合自己穿好', scenes:['每天早上自己穿好衣服，準備來日照', '自己穿上外套與鞋子，出門去散步', '過年時自己換上新衣服拍全家福'], measures:['15 分鐘內完成', '不需他人協助扣釦子'] },
  { k:'外出', re:/外出|出門|市場|公園|廟|教會|買|搭車|拜拜/, hint:'去哪裡、做什麼', scenes:['從家門口走到巷口市場，買一小袋菜回家', '走到附近的廟裡拜拜', '搭公車去女兒家吃晚飯'], measures:['中途休息不超過 1 次', '每週 2 次', '自己找到回家的路'] },
  { k:'家務', re:/煮|料理|洗衣|晾|掃|摺|家務|整理|拿手菜/, hint:'幫家人做什麼', scenes:['幫家人煮一道拿手的蕃茄炒蛋', '摺好全家人的衣服放回衣櫃', '早上自己掃客廳的地'], measures:['每週 1 次', '30 分鐘內完成'] },
  { k:'興趣創作', re:/畫|書法|寫|手工|編織|木工|園藝|種|唱|音樂|樂器/, hint:'做出什麼作品、送給誰或在哪裡展示', scenes:['畫一張生日賀卡送給孫女', '完成一幅書法作品參加中心作品展', '過年前寫春聯送給鄰居', '種一盆香草放在中心窗台照顧'], measures:['完成 1 件作品', '每週參與 2 次', '連續 20 分鐘不需休息'] },
  { k:'社交', re:/朋友|聊天|麻將|象棋|下棋|聚會|教會|里民/, hint:'和誰、在哪裡、做什麼', scenes:['到公園和老朋友下一盤象棋', '參加社區關懷據點的活動和朋友聊天', '和牌友打一圈麻將'], measures:['每週 2 次', '全程參與不需提早離開'] },
  { k:'照顧家人', re:/孫|照顧|寵物|狗|貓|家人/, hint:'為家人做什麼', scenes:['幫孫子準備放學點心', '每天餵家裡的狗並帶牠到門口', '陪孫子寫功課 30 分鐘'], measures:['每週 3 次', '不需他人提醒'] },
];
const goalTypesFor = act => { const hit = GOAL_TYPES.filter(t => t.re.test(act || '')); return hit.length ? hit : null; };

function newGoal(o = {}){ const g = { id:Store.newId(), activity:'', when:'12 週內', how:'', assist:'在旁人監督下（不需碰觸）', scene:'', measure:'', baseline:'', ...o }; g.text = composeGoal(g); return g; }
function composeGoal(g){
  const act = (g.scene || g.activity || '').trim();
  const parts = [g.when, (g.how || '').trim(), act ? (g.assist || '') + (/^在/.test(act) && g.assist ? '，' : '') + act : '', (g.measure || '').trim()].filter(Boolean);
  g.target = (g.measure || '').trim();
  return act ? parts.join('，') + '。' : '';
}
function goalCard(g, i){
  const types = goalTypesFor(g.activity);
  const scenes = types ? types.flatMap(t => t.scenes) : GOAL_TYPES.map(t => t.scenes[0]).slice(0, 8);
  const measures = [...new Set((types || GOAL_TYPES.slice(0, 3)).flatMap(t => t.measures))].slice(0, 6);
  const hint = types ? types.map(t => t.hint).join('；') : '在什麼情境、和誰、為了什麼（移動類寫從哪裡到哪裡）';
  const chip = (e, field, append) => `<button type="button" class="chip" onclick="const g=S.edit.goals[${i}];g.${field}=${append ? `g.${field}?g.${field}+'、'+this.dataset.v:this.dataset.v` : 'this.dataset.v'};g.text=composeGoal(g);S.dirty=true;rerender(planHTML)" data-v="${esc(e)}">${esc(e)}</button>`;
  return `<div class="item-card goal-card"><div class="ic-h"><b>目標 ${i + 1}</b><span class="lbl">想做到的事</span>${F.input(`goals.${i}.activity`, { cls:'grow', ph:'例：自己走到客廳看電視' })}${types ? `<span class="badge green">${esc(types.map(t => t.k).join('・'))}</span>` : ''}${btn('✕', `S.edit.goals.splice(${i},1);rerender(planHTML)`, { k:'sm ghost', title:'移除' })}</div>
    <div class="form-grid g3">${F.field('① 時限', F.select(`goals.${i}.when`, GOAL_WHEN, { blank:false }))}${F.field('② 方式／輔具', F.input(`goals.${i}.how`, { ph:'例：使用助行器、加粗握柄的畫筆' }))}${F.field('③ 協助程度', F.select(`goals.${i}.assist`, GOAL_ASSIST, { blank:false }))}
      ${F.field('④ 在生活中要做到什麼（情境與意義）', F.input(`goals.${i}.scene`, { ph:'例：' + scenes[0] }) + `<div class="pills sm">${scenes.map(e => chip(e, 'scene')).join('')}</div>`, { cls:'span2', hint:'寫成長輩生活中有意義的一件事：' + hint })}
      ${F.field('⑤ 怎麼算達成（可測量）', F.input(`goals.${i}.measure`, { ph:'例：' + measures[0] }) + `<div class="pills sm">${measures.map(e => chip(e, 'measure', true)).join('')}</div>`)}
      ${F.field('目前狀況', F.input(`goals.${i}.baseline`, { ph:'例：需家人扶著，走到一半要休息' }), { cls:'span2' })}</div>
    <div class="goal-preview"><span class="lbl">目標句</span><span id="gp-${i}">${esc(g.text || '（填寫上方欄位後自動組成目標）')}</span></div></div>`;
}
function toggleGroup(t, on){ const g = S.edit.groups; if (on && !g.some(x => x.type === t)) g.push({ type:t, freq:'', note:'' }); if (!on) S.edit.groups = g.filter(x => x.type !== t); S.dirty = true; rerender(planHTML); }
function toggleDev(d, on){ S.edit.devices = on ? [...new Set([...S.edit.devices, d])] : S.edit.devices.filter(x => x !== d); S.dirty = true; }
function addItem(exId){ S.edit.items.push(mkItem(exId)); S.dirty = true; if (!$('#picker')) rerender(planHTML); toast('已加入：' + (findItem(exId)?.name || '自訂項目')); }

/* 項目庫挑選視窗（圖卡） */
let pick = { q:'', type:'', cat:'', post:null };
const POSTURES = [['', '全部姿勢'], ['坐姿', '坐姿／輪椅可做'], ['臥姿', '床上（臥姿）'], ['站姿', '需站立']];
const postOk = (e, post) => !post || (e.tags || []).includes(post);
const wcBadge = e => (e.tags || []).includes('坐姿') ? '<span class="pc-wc">輪椅可做</span>' : '';
function openPicker(){ if (pick.post === null) pick.post = isRes() ? '坐姿' : ''; openModal('從項目庫挑選', `<div id="picker">${pickerBody()}</div>`, { wide:true, saveLabel:'完成', onSave:() => { rerender(planHTML); }, restore:() => rerender(planHTML) }); }
function pickerBody(){
  const sug = new Set(S.edit?._sug || []), inPlan = new Set((S.edit?.items || []).map(i => i.exId));
  const list = allItems().filter(e => (!pick.type || e.type === pick.type) && (!pick.cat || e.cat === pick.cat) && postOk(e, pick.post) && (!pick.q || (e.name + e.how + (e.tags || []).join('')).includes(pick.q))).sort((a, b) => (sug.has(b.id) - sug.has(a.id)));
  return `<div class="toolbar"><input class="inp" placeholder="搜尋，例：坐站、如廁、手" value="${esc(pick.q)}" oninput="pick.q=this.value;refreshPicker()" aria-label="搜尋">
    <div class="pills">${['', '運動', '日常生活訓練', '其他'].map(t => `<label class="pill"><input type="radio" name="pt" ${pick.type === t ? 'checked' : ''} onchange="pick.type='${t}';pick.cat='';refreshPicker()"><span>${t || '全部'}</span></label>`).join('')}</div></div>
    <div class="pills cats">${POSTURES.map(([v, l]) => `<label class="pill sm post"><input type="radio" name="pp" ${pick.post === v ? 'checked' : ''} onchange="pick.post='${v}';refreshPicker()"><span>${l}</span></label>`).join('')}</div>
    <div class="pills cats">${['', ...ITEM_CATS].filter(c => !c || allItems().some(e => e.cat === c && (!pick.type || e.type === pick.type))).map(c => `<label class="pill sm"><input type="radio" name="pc" ${pick.cat === c ? 'checked' : ''} onchange="pick.cat='${c}';refreshPicker()"><span>${c || '全部分類'}</span></label>`).join('')}</div>
    ${isRes() ? '<p class="hint">住宿機構預設只顯示「坐姿／輪椅可做」的項目，可切換「全部姿勢」或「床上」。</p>' : ''}
    <div class="pgrid">${list.map(e => `<button type="button" class="pcard ${inPlan.has(e.id) ? 'on' : ''} ${sug.has(e.id) ? 'sug' : ''}" onclick="${inPlan.has(e.id) ? '' : `addItem('${e.id}');refreshPicker()`}" title="${esc(e.how)}">${e.img ? `<img src="${esc(e.img)}" alt="" loading="lazy">` : `<span class="noimg-l">${icon('heart', 28)}<small>圖片準備中</small></span>`}${wcBadge(e)}<b>${esc(e.name)}</b><small>${esc(e.dose)}</small>${inPlan.has(e.id) ? '<span class="pc-on">✓ 已加入</span>' : sug.has(e.id) ? '<span class="pc-sug">評估建議</span>' : ''}</button>`).join('') || empty('找不到符合的項目')}</div>`;
}
function refreshPicker(){ const el = $('#picker'); if (!el) return; const q = document.activeElement?.getAttribute('aria-label') === '搜尋'; el.innerHTML = pickerBody(); if (q) { const i = el.querySelector('input[aria-label="搜尋"]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
function savePlan(){
  const p = S.edit, err = [];
  if (!p.author?.trim()) err.push('請填寫擬定者'); if (!p.startDate || !p.endDate || p.endDate <= p.startDate) err.push('請確認計畫期間');
  p.goals.forEach(g => { if (g.when != null) g.text = composeGoal(g); }); p.goals = p.goals.filter(g => g.text?.trim()); p.problems = p.problems.filter(x => x?.trim());
  if (!p.items.length && !p.groups.length) err.push('請至少加入一個個別項目或團體');
  p.items.forEach((it, i) => { if (!it.name?.trim()) err.push(`第${i + 1}項未填名稱`); if (!(it.days || []).length) err.push(`「${it.name || i + 1}」未勾選執行日`); });
  if (err.length) { if (!p.goals.length) p.goals.push(newGoal()); rerender(planHTML); return toast(err.join('；'), 'err'); }
  const isNew = !p.id; delete p._sug; delete p._done;
  if (isNew) { Logic.plansOf(p.clientId).filter(x => x.status === '執行中').forEach(x => { x.status = '已結束'; if (x.endDate >= p.startDate) x.endDate = addDays(p.startDate, -1); Store.upsert('plans', x); }); p.status = '執行中'; }
  Store.upsert('plans', p); S.dirty = false; toast(isNew ? `計畫 v${p.version} 開始執行` : '已儲存'); App.go('#/client/' + p.clientId + '/plan');
}
function endPlan(){ if (!askConfirm('確定結束此計畫？')) return; const p = Store.get('plans', S.edit.id); p.status = '已結束'; if (p.endDate > todayISO()) p.endDate = todayISO(); Store.upsert('plans', p); S.dirty = false; App.go('#/client/' + p.clientId + '/plan'); }

/* ---------------- 刪除 ---------------- */
function clientRecords(cid){ return { assessments:Store.all('assessments').filter(x => x.clientId === cid), plans:Store.all('plans').filter(x => x.clientId === cid), checks:Store.all('checks').filter(x => x.clientId === cid), weekNotes:Store.all('weekNotes').filter(x => x.clientId === cid) }; }
async function deleteClient(cid){
  const c = Store.get('clients', cid); if (!c) return;
  const r = clientRecords(cid);
  if (!askConfirm(`確定刪除「${c.name}」？\n\n會一併刪除：評估 ${r.assessments.length} 筆、計畫 ${r.plans.length} 版、勾選紀錄 ${r.checks.length} 筆。\n${Folder.ready ? '刪除前會先在資料夾留一份備份，可從「設定與備份」還原。' : '刪除後無法復原，建議先匯出備份。'}`)) return;
  await Folder.snapshot('刪除前');
  Object.entries(r).forEach(([col, list]) => list.forEach(x => Store.remove(col, x.id)));
  Store.remove('clients', cid); S.dirty = false; toast(`已刪除「${c.name}」`);
  if ((location.hash || '').includes(cid)) App.go('#/clients'); else route();
}
async function clearDemoClients(){
  if (!askConfirm('確定清除 3 個模擬個案及其評估、計畫與勾選紀錄？（您自己新增的資料不受影響）')) return;
  await Folder.snapshot('刪除前');
  let n = 0; for (const col of COLLECTIONS) for (const r of Store.DB[col]) if (r.demo && !r.deleted) { Store.remove(col, r.id); n++; }
  toast('已清除模擬個案'); App.go('#/clients'); route();
}
async function deletePlan(){
  const p = Store.get('plans', S.edit.id); if (!p) return;
  if (!askConfirm(`確定刪除計畫 v${p.version}？（已勾選的紀錄會保留在該${term()}名下）`)) return;
  await Folder.snapshot('刪除前'); Store.remove('plans', p.id);
  const prev = Logic.plansOf(p.clientId).filter(x => x.status === '已結束').at(-1);
  if (prev && !activePlan(p.clientId) && askConfirm(`要把上一版 v${prev.version} 恢復為「執行中」嗎？`)) { prev.status = '執行中'; if (prev.endDate < todayISO()) prev.endDate = addDays(todayISO(), 28); Store.upsert('plans', prev); }
  S.dirty = false; toast('已刪除計畫'); App.go('#/client/' + p.clientId + '/plan');
}

/* 已達成的目標：任一次再評的 GAS ≥ 0（含本次評估） */
function achievedGoals(cid, cur){
  const ids = new Set(), acts = new Set();
  const plans = Logic.plansOf(cid);
  for (const a of [...Logic.assessmentsOf(cid), ...(cur ? [cur] : [])]) for (const r of (a.goalReview || [])) {
    if (r.gas === '' || r.gas == null || +r.gas < 0) continue;
    ids.add(r.goalId);
    const g = plans.find(p => p.id === r.planId)?.goals?.find(x => x.id === r.goalId);
    const act = r.activity || g?.activity || ''; if (act) acts.add(act);
  }
  return { ids, acts };
}
/* 計畫的問題清單：功能問題全部保留；「最想做到」只保留有對應目標者 */
function planProblemsFor(a, goals){
  return (a?.problems || []).filter(pr => !/^copm/.test(pr.code || '') || goals.some(g => g.activity && pr.text.includes(g.activity)));
}
