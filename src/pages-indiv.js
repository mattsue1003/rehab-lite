/* ================================================================
   個別復能：個案、評估、個別計畫、執行檢核、輸出
   ================================================================ */
const Logic = {
  assessmentsOf: cid => Store.all('assessments').filter(a => a.clientId === cid).sort(byDate('date')),
  lastAssessment(cid){ return this.assessmentsOf(cid).at(-1) || null; },
  plansOf: cid => Store.all('plans').filter(p => p.clientId === cid).sort((a, b) => (a.version || 0) - (b.version || 0)),
};
const activePlan = cid => Logic.plansOf(cid).filter(p => p.status === '執行中').at(-1) || null;
const allExercises = () => [...EXERCISES, ...Store.all('library')];
const findEx = id => allExercises().find(e => e.id === id);
const defaultDays = () => isRes() ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];

/* 某計畫某段期間的檢核統計 */
function planStats(pl, from, to){
  let exp = 0, ok = 0, part = 0, skip = 0;
  const recs = new Map(Store.all('checks').filter(x => x.planId === pl.id).map(x => [x.itemId + '|' + x.date, x]));
  const end = [to, pl.endDate, todayISO()].sort()[0];
  for (let d = from > pl.startDate ? from : pl.startDate; d <= end; d = addDays(d, 1)) for (const it of pl.items || []) if ((it.days || []).includes(weekday(d))) { exp++; const r = recs.get(it.id + '|' + d); if (r?.status === 'ok') ok++; else if (r?.status === 'part') part++; else if (r?.status === 'skip') skip++; }
  return { exp, ok, part, skip, none:exp - ok - part - skip, rate:exp ? Math.round((ok + part * 0.5) / exp * 100) : null };
}

/* ---------------- 個案列表 ---------------- */
let cFilter = { q:'', status:'服務中' };
function pageClients(){
  setTitle('個別復能', `${term()}名單`);
  const today = todayISO(), ws = weekStart(today);
  const list = Store.all('clients').filter(c => (!cFilter.status || (c.status || '服務中') === cFilter.status) && (!cFilter.q || c.name.includes(cFilter.q) || (c.bed || '').includes(cFilter.q))).sort((a, b) => (a.bed || a.name).localeCompare(b.bed || b.name));
  return `<div class="toolbar"><input class="inp" placeholder="搜尋姓名${isRes() ? '／床號' : ''}" value="${esc(cFilter.q)}" oninput="cFilter.q=this.value;rerenderList()" aria-label="搜尋">
    <select class="inp" onchange="cFilter.status=this.value;rerenderList()" aria-label="狀態">${['服務中', '結案', ''].map(s => `<option value="${s}" ${cFilter.status === s ? 'selected' : ''}>${s || '全部'}</option>`).join('')}</select>
    <span class="sp"></span>${btn('新增' + term(), 'editClient()', { k:'primary', i:'plus' })}</div>
  <section class="card flush"><div class="tbl-wrap"><table class="tbl" id="ctable"><thead><tr><th>姓名</th>${isRes() ? '<th>房號／床號</th>' : ''}<th>性別／年齡</th><th>最近評估</th><th>巴氏</th><th>個別計畫</th><th>本週檢核</th></tr></thead><tbody>
  ${list.map(c => { const a = Logic.lastAssessment(c.id), p = activePlan(c.id), st = p ? planStats(p, ws, today) : null; return `<tr class="click" onclick="App.go('#/client/${c.id}')"><td><b>${esc(c.name)}</b></td>${isRes() ? `<td>${esc(c.bed || '')}</td>` : ''}<td>${esc(c.gender || '')} ${ageAt(c.birth) ?? ''}</td><td>${a ? rocDate(a.date) + ' ' + badge(a.type) : badge('未評估', 'amber')}</td><td>${scoreBarthel(a)?.total ?? '—'}</td><td>${p ? `v${p.version}　${(p.items || []).length} 項，至 ${rocDate(p.endDate)}` : badge('未開立', 'amber')}</td><td>${st?.exp ? `<div class="mini-bar"><i style="width:${st.rate}%"></i></div>${st.ok + st.part}/${st.exp}` : '—'}</td></tr>`; }).join('') || `<tr><td colspan="7">${empty(`尚無${term()}資料`)}</td></tr>`}
  </tbody></table></div></section>`;
}
function rerenderList(){ const t = document.createElement('div'); t.innerHTML = pageClients(); $('#ctable').replaceWith(t.querySelector('#ctable')); }

function editClient(id){
  S.edit = id ? clone(Store.get('clients', id)) : { status:'服務中', gender:'女' };
  openModal(id ? `編輯${term()}資料` : `新增${term()}`, `<p class="hint">建議只填必要資料；姓名可使用代號或「王○蘭」格式。</p><div class="form-grid">
    ${F.field('姓名／代號', F.input('name'), { req:true })}${F.field('性別', F.radios('gender', ['女', '男']))}
    ${F.field('出生日期', F.date('birth'), { hint:'用於年齡與體能常模' })}${isRes() ? F.field('房號／床號', F.input('bed', { ph:'例：201-1' })) : F.field('服務狀態', F.select('status', ['服務中', '結案'], { blank:false }))}
    ${F.field('主要診斷', F.input('diagnosis', { ph:'例：腦中風右側偏癱' }), { cls:'span2' })}
    ${F.field('使用輔具', F.input('aids', { ph:'例：四腳拐、輪椅' }))}${F.field('個別注意事項', F.input('caution', { ph:'例：姿勢性低血壓' }))}
    ${isRes() ? F.field('服務狀態', F.select('status', ['服務中', '結案'], { blank:false })) : ''}</div>`,
    { wide:true, extra:id ? btn('刪除', `if(askConfirm('確定刪除？相關評估與計畫仍保留於備份中。')){Store.remove('clients','${id}');closeModal(true);App.go('#/clients')}`, { k:'danger ghost' }) : '',
      onSave:() => { if (!S.edit.name?.trim()) { toast('請填寫姓名', 'err'); return false; } const s = Store.upsert('clients', S.edit); S.dirty = false; toast('已儲存'); if (!id) App.go('#/client/' + s.id); else route(); }, restore:() => { S.dirty = false; } });
}

/* ---------------- 個案頁 ---------------- */
const CTABS = [['assess', '基本資料與評估'], ['plan', '個別計畫'], ['check', '執行檢核'], ['export', '列印輸出']];
function pageClient(id, tab){
  const c = Store.get('clients', id); if (!c) { App.go('#/clients'); return ''; }
  setTitle(c.name, [isRes() ? c.bed : '', c.gender, ageAt(c.birth) != null ? ageAt(c.birth) + '歲' : ''].filter(Boolean).join('・'));
  const body = { assess:cAssess, plan:cPlan, check:cCheck, export:cExport }[tab] || cAssess;
  return `<div class="toolbar"><a class="btn" href="#/clients">${icon('back', 16)}名單</a><span class="sp"></span>${btn('編輯基本資料', `editClient('${c.id}')`, { i:'edit' })}</div>
  <div class="tabs">${CTABS.map(([k, l], i) => `<a href="#/client/${c.id}/${k}" class="${tab === k ? 'on' : ''}"><span class="tn-n">${i + 1}</span>${l}</a>`).join('')}</div>${body(c)}`;
}
function cAssess(c){
  const as = Logic.assessmentsOf(c.id).reverse();
  return `<div class="grid2"><section class="card"><h2>基本資料</h2><dl class="info">
    ${[['診斷', c.diagnosis], ['輔具', c.aids], ['個別注意事項', c.caution], ['狀態', c.status || '服務中']].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v || '—')}</dd></div>`).join('')}</dl></section>
    <section class="card"><h2>巴氏量表變化</h2>${lineChart(Logic.assessmentsOf(c.id).map(a => ({ x:a.date, y:scoreBarthel(a)?.partial ? null : scoreBarthel(a)?.total })), { min:0, max:100 })}</section></div>
  <section class="card"><h2>評估紀錄 <span class="sp"></span><a class="btn primary sm" href="#/assess/new/${c.id}">${icon('plus', 14)}${as.length ? '再評估' : '進行評估'}</a></h2>
    ${as.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>日期</th><th>類別</th><th>評估者</th><th>巴氏</th><th>TUG</th><th>30秒坐站</th><th>握力</th><th>需復能問題</th><th>輸出</th></tr></thead><tbody>${as.map(a => `<tr><td><a href="#/assess/${a.id}">${rocDate(a.date)}</a></td><td>${badge(a.type)}</td><td>${esc(a.assessor || '')}</td><td>${scoreBarthel(a)?.total ?? '—'}</td><td>${a.phy?.tug || '—'}</td><td>${a.phy?.cs30 ?? '—'}</td><td>${a.phy?.grip || '—'}</td><td><small>${esc((a.problems || []).map(p => p.text).join('、').slice(0, 60))}</small></td><td class="nowrap">${exportBar('as_' + a.id, () => assessDoc(Store.get('assessments', a.id), c), ['pdf', 'word'])}</td></tr>`).join('')}</tbody></table></div>` : empty('尚無評估紀錄')}
  </section>`;
}
function cPlan(c){
  const ps = Logic.plansOf(c.id).reverse(), act = activePlan(c.id), last = Logic.lastAssessment(c.id);
  return `<div class="toolbar">${last ? `<a class="btn primary" href="#/plan/new/${c.id}?from=${last.id}${act ? '&copy=' + act.id : ''}">${icon('rx', 16)}${act ? '依最新評估修正計畫' : '依評估開立個別計畫'}</a>` : `<a class="btn primary" href="#/assess/new/${c.id}">先進行評估</a>`}
    ${act ? `<a class="btn" href="#/plan/new/${c.id}?copy=${act.id}">複製為新版本</a>` : ''}</div>
  ${ps.length ? ps.map(p => `<section class="card ${p.status === '執行中' ? 'hl' : 'dim'}"><h2>v${p.version} ${badge(p.status, p.status === '執行中' ? 'green' : '')}<small>${rocDate(p.startDate)}～${rocDate(p.endDate)}｜${esc(p.author || '')}</small><span class="sp"></span>
    <a class="btn sm" href="#/plan/${p.id}">${p.status === '執行中' ? '編輯' : '檢視'}</a>${exportBar('pl_' + p.id, () => planDoc(Store.get('plans', p.id)))}</h2>
    ${(p.goals || []).length ? `<p><b>目標：</b>${(p.goals || []).map((g, i) => `${i + 1}. ${esc(g.text)}`).join('　')}</p>` : ''}
    <table class="tbl sm"><thead><tr><th>項目</th><th>劑量</th><th>頻率</th><th>執行者</th></tr></thead><tbody>${(p.items || []).map(it => `<tr><td>${esc(it.name)}</td><td>${esc(it.dose || '')}</td><td>${esc(freqText(it))}</td><td>${esc(it.executor || '')}</td></tr>`).join('')}</tbody></table></section>`).join('') : `<section class="card">${empty('尚未開立個別計畫')}</section>`}`;
}

/* 執行檢核（電腦/平板上直接點選） */
function cCheck(c){
  const p = activePlan(c.id);
  if (!p) return `<section class="card">${empty('沒有執行中的個別計畫', `<a class="btn primary" href="#/client/${c.id}/plan">前往開立計畫</a>`)}</section>`;
  const ws = S.week || weekStart(todayISO()), dates = Array.from({ length:7 }, (_, i) => addDays(ws, i));
  const recs = new Map(Store.all('checks').filter(x => x.planId === p.id).map(x => [x.itemId + '|' + x.date, x]));
  const st = planStats(p, ws, addDays(ws, 6)), all = planStats(p, p.startDate, p.endDate);
  const note = Store.all('weekNotes').find(x => x.planId === p.id && x.week === ws);
  return `<div class="toolbar"><button class="btn" onclick="S.week=addDays('${ws}',-7);route()">${icon('back', 16)}上週</button><b>${rocDate(dates[0])} ～ ${rocDate(dates[6])}</b><button class="btn" onclick="S.week=addDays('${ws}',7);route()">下週</button>${ws !== weekStart(todayISO()) ? btn('回到本週', `S.week=null;route()`) : ''}
    <span class="sp"></span><span class="muted">本週 ${st.ok + st.part}/${st.exp}｜計畫累計執行率 ${all.rate ?? '—'}%</span></div>
  <div class="notice">點格子切換：空白 → <b class="c-ok">✓ 完成</b> → <b class="c-part">△ 部分</b> → <b class="c-skip">✕ 未執行</b> → 空白。記錄者：<b>${esc(App.currentUserId() || '（請於右上角填寫）')}</b></div>
  <section class="card flush"><div class="tbl-wrap"><table class="ck"><thead><tr><th class="ck-n">項目</th>${dates.map(d => `<th class="${d === todayISO() ? 'today' : ''}">${d.slice(5).replace('-', '/')}<br><small>週${WEEKDAYS[weekday(d)]}</small></th>`).join('')}</tr></thead><tbody>
  ${(p.items || []).map(it => `<tr><th class="ck-n"><b>${esc(it.name)}</b><small>${esc(it.dose || '')}｜${esc(it.executor || '')}</small></th>${dates.map(d => { const sch = (it.days || []).includes(weekday(d)) && d >= p.startDate && d <= p.endDate; if (!sch) return '<td class="off">—</td>'; const r = recs.get(it.id + '|' + d); return `<td><button class="ckb ${r ? 's-' + r.status : ''}" onclick="cycleCheck('${p.id}','${it.id}','${d}')" title="${r ? esc((r.by || '') + ' ' + (r.updatedAt || '').slice(0, 16).replace('T', ' ')) : '尚未記錄'}" aria-label="${esc(it.name)} ${d}">${r ? SYM[r.status] : ''}</button></td>`; }).join('')}</tr>`).join('')}
  </tbody></table></div></section>
  <section class="card"><h2>本週備註</h2><textarea class="inp" rows="3" placeholder="未執行原因、${term()}反應、進步或異常狀況…" onchange="saveWeekNote('${p.id}','${c.id}','${ws}',this.value)">${esc(note?.note || '')}</textarea>
    <div class="exp-row"><span>印出本週檢核表</span>${exportBar('wk_' + p.id, () => indivCheckDoc(activePlan(c.id), { mode:'week', week:ws, filled:true }), ['pdf', 'word'])}</div></section>`;
}
function cycleCheck(planId, itemId, d){
  const order = ['', 'ok', 'part', 'skip'], p = Store.get('plans', planId);
  const r = Store.all('checks').find(x => x.planId === planId && x.itemId === itemId && x.date === d);
  const next = order[(order.indexOf(r?.status || '') + 1) % order.length];
  if (!next) Store.remove('checks', r.id); else Store.upsert('checks', { ...(r || { clientId:p.clientId, planId, itemId, date:d }), status:next, by:App.currentUserId() });
  rerender(() => pageClient(p.clientId, 'check'));
}
function saveWeekNote(planId, cid, week, note){ const r = Store.all('weekNotes').find(x => x.planId === planId && x.week === week) || { planId, clientId:cid, week }; r.note = note; r.by = App.currentUserId(); Store.upsert('weekNotes', r); toast('已儲存備註'); }

/* 列印輸出 */
let expOpt = { mode:'week', filled:false };
function cExport(c){
  const p = activePlan(c.id), a = Logic.lastAssessment(c.id);
  const ws = expOpt.week || weekStart(todayISO()), mo = expOpt.month || todayISO().slice(0, 7);
  return `<section class="card"><h2>執行檢核表 <small>印出後由照服員、治療師或${term()}本人勾選</small></h2>
    ${p ? `<div class="form-grid g3">
      <div class="field"><label class="lbl">版本</label><div class="pills">${[['week', '週檢核表'], ['month', '月檢核表'], ['big', `${term()}自我檢核（大字）`]].map(([v, l]) => `<label class="pill"><input type="radio" name="em" ${expOpt.mode === v ? 'checked' : ''} onchange="expOpt.mode='${v}';route()"><span>${l}</span></label>`).join('')}</div></div>
      <div class="field"><label class="lbl">${expOpt.mode === 'month' ? '月份' : '週（任選一天）'}</label>${expOpt.mode === 'month' ? `<input type="month" class="inp" value="${mo}" onchange="expOpt.month=this.value">` : `<input type="date" class="inp" value="${ws}" onchange="expOpt.week=weekStart(this.value);route()">`}</div>
      <div class="field"><label class="lbl">內容</label><div class="pills">${[[false, '空白（手寫勾選）'], [true, '帶入已記錄']].map(([v, l]) => `<label class="pill"><input type="radio" name="ef" ${expOpt.filled === v ? 'checked' : ''} onchange="expOpt.filled=${v}"><span>${l}</span></label>`).join('')}</div></div></div>
      <div class="exp-row"><span>產生檢核表</span>${exportBar('ck_' + c.id, () => { const pl = activePlan(c.id), o = { mode:expOpt.mode === 'month' ? 'month' : 'week', big:expOpt.mode === 'big', week:expOpt.week || weekStart(todayISO()), month:expOpt.month || todayISO().slice(0, 7), filled:expOpt.filled }; return indivCheckDoc(pl, o); }, ['pdf', 'word'])}</div>` : empty('需先開立個別計畫')}
  </section>
  <section class="card"><h2>其他文件</h2>
    ${p ? `<div class="exp-row"><span>個別復能計畫書（v${p.version}）</span>${exportBar('pl_' + p.id, () => planDoc(Store.get('plans', p.id)))}</div>` : ''}
    ${a ? `<div class="exp-row"><span>最近一次評估表（${rocDate(a.date)}）</span>${exportBar('as_' + a.id, () => assessDoc(Store.get('assessments', a.id), c), ['pdf', 'word'])}</div>` : ''}
    <div class="exp-row"><span>空白評估表（已帶入姓名）</span>${exportBar('ba_' + c.id, () => assessDoc(null, c), ['pdf', 'word'])}</div>
  </section>`;
}

/* ---------------- 評估 ---------------- */
function pageAssessEdit(id, cid){
  let a;
  if (id) a = clone(Store.get('assessments', id) || {});
  else { const prev = Logic.lastAssessment(cid); a = { clientId:cid, date:todayISO(), type:prev ? '再評' : '初評', assessor:App.currentUserId(), role:prev?.role || '', adl:{}, iadl:{}, spmsq:{ items:Array(10).fill(''), edu:prev?.spmsq?.edu || '' }, phy:{}, pain:{}, physio:prev?.physio || '', strength:prev?.strength || '', expect:prev?.expect || '', problemSel:{}, customProblems:'', summary:'' }; }
  const c = Store.get('clients', a.clientId); if (!c) { App.go('#/clients'); return ''; }
  S.edit = a;
  const prev = Logic.assessmentsOf(c.id).filter(x => x.id !== a.id && x.date <= a.date).at(-1);
  const pv = v => prev ? `<span class="prev">前次：${v ?? '—'}</span>` : '';
  setTitle((id ? '' : '新增') + '評估', c.name);
  S.onEdit = p => { liveSum(c); if (/^(adl|iadl|phy|spmsq|pain)/.test(p)) { clearTimeout(S._t); S._t = setTimeout(() => { const el = $('#sugg'); if (el) el.innerHTML = suggHTML(c); }, 250); } };
  setTimeout(() => liveSum(c), 0);
  const sec = (t, body, o = '') => `<section class="card"><h2>${t}${o ? ` <small>${o}</small>` : ''}</h2>${body}</section>`;
  const opt = (t, body, o) => `<details class="card opt"><summary><h2>${t} <small>${o}</small></h2></summary>${body}</details>`;
  const ph = (k, l, u, h) => F.field(`${l}（${u}）`, F.num('phy.' + k, { min:0 }) + pv(prev?.phy?.[k]), { hint:h });
  return `<div class="toolbar sticky-bar"><a class="btn" href="#/client/${c.id}">${icon('back', 16)}${esc(c.name)}</a><span class="sp"></span>
    ${id ? btn('刪除', `if(askConfirm('確定刪除此評估？')){Store.remove('assessments','${id}');S.dirty=false;App.go('#/client/${c.id}')}`, { k:'danger ghost', i:'trash' }) : ''}${btn('儲存', 'saveAssess(false)')}${btn('儲存並開立計畫', 'saveAssess(true)', { k:'primary', i:'rx' })}</div>
  <div class="edit-layout"><div class="edit-main">
    ${sec('基本', `<div class="form-grid g3">${F.field('評估日期', F.date('date'), { req:true })}${F.field('類別', F.select('type', ['初評', '再評', '不定期'], { blank:false }))}${F.field('評估者', F.input('assessor'), { req:true })}${F.field('職類', F.select('role', PRO_ROLES))}</div>`)}
    ${sec('日常生活功能｜巴氏量表', BARTHEL.map(it => `<div class="q"><div class="qh"><b>${it.n}</b>${pv(prev?.adl?.[it.k])}</div>${F.radios('adl.' + it.k, it.opts.map(([s, d]) => [s, `${s} 分｜${d}`]), { t:'num', cls:'vert' })}</div>`).join(''))}
    ${sec('體能與跌倒風險', `<div class="form-grid g3">${ph('tug', 'TUG 起身行走', '秒', '≥13.5 秒跌倒高風險')}${ph('cs30', '30秒坐站', '次', c.birth ? `同齡平均下限 ${cs30Cut(ageAt(c.birth, a.date), c.gender)} 次` : '填出生日期可比對常模')}${ph('grip', '握力', '公斤', '男<28、女<18')}${ph('oneLeg', '單腳站立', '秒', '<5 秒跌倒風險')}${ph('gait4', '4公尺步行', '秒', '自動換算步速')}${F.field('使用輔具／無法施測說明', F.input('phy.note'))}</div>`)}
    ${opt('工具性日常生活 IADL', IADL.map(it => `<div class="q"><div class="qh"><b>${it.n}</b></div>${F.radios('iadl.' + it.k, it.opts.map(([d, s], i) => [i, `${d}（${s}）`]), { t:'num', cls:'vert' })}</div>`).join(''), '選填，日照較常使用')}
    ${opt('認知 SPMSQ', `${F.field('教育程度', F.radios('spmsq.edu', EDU_OPTS))}<table class="tbl qa"><tbody>${SPMSQ.map((q, i) => `<tr><td>${i + 1}. ${q}</td><td>${F.radios('spmsq.items.' + i, [['c', '正確'], ['x', '錯誤']])}</td></tr>`).join('')}</tbody></table>`, '選填')}
    ${sec('疼痛與現況', `<div class="form-grid">${F.field('疼痛 0–10', F.radios('pain.nrs', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => [n, String(n)]), { t:'num' }), { cls:'span2' })}${F.field('疼痛部位', F.input('pain.site'))}<div></div>
      ${F.field('身體與生活現況', F.text('physio', { rows:2 }), { cls:'span2' })}${F.field('優勢與興趣', F.text('strength', { rows:2, ph:'例：喜歡唱歌、以前是農夫' }))}${F.field(`${term()}／家屬期待`, F.text('expect', { rows:2, ph:'例：想自己走去廁所' }))}</div>`)}
    ${sec('需復能的問題', `<p class="hint">依評估結果自動建議，勾選的問題與建議項目會帶入個別計畫。</p><div id="sugg">${suggHTML(c)}</div>${F.field('其他問題（每行一項）', F.text('customProblems', { rows:2 }))}${F.field('評估摘要', F.text('summary', { rows:2 }))}`)}
  </div><aside class="edit-side"><div class="card sticky" id="live"></div></aside></div>`;
}
function suggHTML(c){
  const sg = suggestFromAssessment(S.edit, c);
  if (!sg.length) return '<p class="muted">（填寫量表後顯示）</p>';
  S.edit.problemSel ||= {}; sg.forEach(s => { if (!(s.code in S.edit.problemSel)) S.edit.problemSel[s.code] = true; });
  return `<ul class="sugg">${sg.map(s => `<li>${F.check('problemSel.' + s.code, `<b>${esc(s.text)}</b>${s.ex.length ? `<small>建議項目：${s.ex.map(e => esc(findEx(e)?.name || e)).join('、')}</small>` : ''}${s.referral ? `<small class="ref">建議轉介：${esc(s.referral)}</small>` : ''}`)}</li>`).join('')}</ul>`;
}
function liveSum(c){
  const a = S.edit, el = $('#live'); if (!el || !a) return;
  const b = scoreBarthel(a), i = scoreIADL(a), s = scoreSPMSQ(a), p = a.phy || {}, ag = ageAt(c.birth, a.date), gs = gaitSpeed(a);
  const r = (k, v, f) => `<div class="ls ${f ? 'flag' : ''}"><span>${k}</span><b>${v}</b></div>`;
  el.innerHTML = `<h3>即時計分</h3>${r('巴氏', b ? `${b.total} <small>${b.level}</small>` : '—', b && !b.partial && b.total < 91)}${r('TUG', p.tug ? p.tug + ' 秒' : '—', +p.tug >= PHY_CUT.tug)}${r('30秒坐站', p.cs30 !== '' && p.cs30 != null ? p.cs30 + ' 次' : '—', ag && p.cs30 !== '' && p.cs30 != null && +p.cs30 < cs30Cut(ag, c.gender))}${r('握力', p.grip ? p.grip + ' kg' : '—', p.grip && +p.grip < (c.gender === '男' ? PHY_CUT.gripM : PHY_CUT.gripF))}${r('單腳站', p.oneLeg ? p.oneLeg + ' 秒' : '—', p.oneLeg !== '' && p.oneLeg != null && +p.oneLeg < PHY_CUT.oneLeg)}${r('步速', gs != null ? gs + ' m/s' : '—', gs != null && gs < PHY_CUT.gait)}${r('IADL', i ? i.total + '/8' : '—')}${r('SPMSQ', s ? (s.partial ? '未完成' : `錯 ${s.errors}`) : '—', s && s.adj >= 3)}<p class="hint">紅字＝需注意，最終判斷由專業人員決定。</p>`;
}
function saveAssess(toPlan){
  const a = S.edit, c = Store.get('clients', a.clientId);
  if (!a.date || !a.assessor?.trim()) return toast('請填寫評估日期與評估者', 'err');
  if ((!scoreBarthel(a) || scoreBarthel(a).partial) && !askConfirm('巴氏量表尚未填完，仍要儲存？')) return;
  const sg = suggestFromAssessment(a, c);
  a.problems = [...sg.filter(s => a.problemSel?.[s.code]), ...(a.customProblems || '').split('\n').map(t => t.trim()).filter(Boolean).map(t => ({ code:'custom', text:t, ex:[], referral:'' }))];
  const s = Store.upsert('assessments', a); S.dirty = false; toast('評估已儲存');
  const act = activePlan(a.clientId);
  App.go(toPlan ? `#/plan/new/${a.clientId}?from=${s.id}${act ? '&copy=' + act.id : ''}` : `#/client/${a.clientId}`);
}

/* ---------------- 個別計畫 ---------------- */
function mkItem(exId, extra = {}){ const e = exId ? findEx(exId) : null; return { id:Store.newId(), exId:exId || '', name:e?.name || '', cat:e?.cat || '肌力', dose:e?.dose || '', how:e?.how || '', caution:e?.caution || '', days:defaultDays(), times:1, executor:'照顧服務員', ...extra }; }
function pagePlanEdit(id, cid, params){
  let p;
  if (id) p = clone(Store.get('plans', id) || {});
  else {
    const from = params.get('from') ? Store.get('assessments', params.get('from')) : null, base = params.get('copy') ? Store.get('plans', params.get('copy')) : null;
    p = { clientId:cid, assessmentId:from?.id || base?.assessmentId || '', version:Math.max(0, ...Logic.plansOf(cid).map(x => x.version || 0)) + 1, copyOf:base?.id || '', status:'草稿',
      startDate:todayISO(), endDate:addDays(todayISO(), 83), author:App.currentUserId(), role:from?.role || base?.role || '',
      problems:from ? (from.problems || []).map(x => x.text) : [...(base?.problems || [])], goals:clone(base?.goals || []), items:clone(base?.items || []), note:base?.note || '' };
    if (!p.goals.length) p.goals.push({ id:Store.newId() });
    p._sug = from ? [...new Set((from.problems || []).flatMap(x => x.ex || []))] : [];
  }
  const c = Store.get('clients', p.clientId); if (!c) { App.go('#/clients'); return ''; }
  if (id && p.status !== '執行中') { setTitle('個別計畫 v' + p.version, c.name); return `<div class="toolbar"><a class="btn" href="#/client/${c.id}/plan">${icon('back', 16)}${esc(c.name)}</a><span class="sp"></span>${exportBar('pv_' + p.id, () => planDoc(Store.get('plans', p.id)))}</div><div class="notice">此版本已結束，僅供檢視與輸出。</div>${docToHTMLCard(planDoc(p))}`; }
  S.edit = p; setTitle((id ? '編輯' : '開立') + '個別復能計畫 v' + p.version, c.name);
  return planHTML();
}
function docToHTMLCard(doc){ return `<section class="card doc-preview">${docToHTML(doc)}</section>`; }
function planHTML(){
  const p = S.edit, c = Store.get('clients', p.clientId), sug = (p._sug || []).filter(e => !p.items.some(it => it.exId === e));
  return `<div class="toolbar sticky-bar"><a class="btn" href="#/client/${c.id}/plan">${icon('back', 16)}${esc(c.name)}</a><span class="sp"></span>
    ${p.id ? btn('結束此計畫', 'endPlan()', { k:'danger ghost' }) : ''}${btn(p.id ? '儲存' : '儲存並開始執行', 'savePlan()', { k:'primary', i:'check' })}</div>
  <section class="card"><h2>計畫資訊</h2><div class="form-grid g3">${F.field('開始日期', F.date('startDate'), { req:true })}${F.field('結束日期', F.date('endDate'), { req:true, hint:'建議 8–12 週後再評估' })}${F.field('擬定者', F.input('author'), { req:true })}${F.field('職類', F.select('role', PRO_ROLES))}</div></section>
  <section class="card"><h2>需復能的問題</h2>${p.problems.map((x, i) => `<div class="row-edit">${F.input('problems.' + i)}${btn('✕', `S.edit.problems.splice(${i},1);rerender(planHTML)`, { k:'sm ghost' })}</div>`).join('')}${btn('新增問題', `S.edit.problems.push('');rerender(planHTML)`, { k:'sm', i:'plus' })}</section>
  <section class="card"><h2>目標</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>目標（具體、可量測）</th><th>評量方式</th><th>目前</th><th>目標值</th><th></th></tr></thead><tbody>
    ${p.goals.map((g, i) => `<tr><td>${i + 1}</td><td>${F.input(`goals.${i}.text`, { ph:'例：12週內可在監督下自行由輪椅移位到椅子' })}</td><td>${F.input(`goals.${i}.measure`, { ph:'例：30秒坐站' })}</td><td>${F.input(`goals.${i}.baseline`, { cls:'w6' })}</td><td>${F.input(`goals.${i}.target`, { cls:'w6' })}</td><td>${btn('✕', `S.edit.goals.splice(${i},1);rerender(planHTML)`, { k:'sm ghost' })}</td></tr>`).join('')}
    </tbody></table></div>${btn('新增目標', `S.edit.goals.push({id:Store.newId()});rerender(planHTML)`, { k:'sm', i:'plus' })}</section>
  <section class="card"><h2>復能項目 <small>會出現在執行檢核表上</small></h2>
    ${sug.length ? `<div class="notice">評估建議：${sug.map(e => `<button type="button" class="chip hl" onclick="addItem('${e}')">${icon('plus', 14)}${esc(findEx(e)?.name || e)}</button>`).join('')}</div>` : ''}
    <div class="items-edit">${p.items.map((it, i) => itemCard('items', it, i, 'planHTML')).join('') || '<p class="muted">從下方項目庫加入，或新增自訂項目。</p>'}</div>
    <h3>項目庫</h3>${libPicker('addItem')}${btn('新增自訂項目', 'addItem()', { k:'sm', i:'plus' })}</section>
  <section class="card"><h2>備註</h2>${F.text('note', { rows:2, ph:'例：居家延續建議、轉介、特別注意' })}</section>`;
}
function itemCard(path, it, i, re){
  return `<div class="item-card"><div class="ic-h"><b>${i + 1}.</b>${F.input(`${path}.${i}.name`, { cls:'grow' })}${btn('✕', `S.edit.${path}.splice(${i},1);rerender(${re})`, { k:'sm ghost', title:'移除' })}</div>
    <div class="form-grid g3">${F.field('劑量', F.input(`${path}.${i}.dose`))}${F.field('執行者', F.select(`${path}.${i}.executor`, EXECUTORS, { blank:false }))}${F.field('每日次數', F.select(`${path}.${i}.times`, [1, 2, 3].map(n => [n, n + ' 次']), { t:'num', blank:false }))}
    ${F.field('執行日', `<div class="pills">${[1, 2, 3, 4, 5, 6, 7].map(w => F.checkArr(`${path}.${i}.days`, w, WEEKDAYS[w], true)).join('')}</div>`, { cls:'span3' })}
    ${F.field('執行方式', F.text(`${path}.${i}.how`, { rows:2 }), { cls:'span2' })}${F.field('注意事項', F.text(`${path}.${i}.caution`, { rows:2 }))}</div></div>`;
}
function libPicker(fn){ return `<div class="libs">${EX_CATS.map(cat => `<details><summary>${cat}</summary><div class="lib">${allExercises().filter(e => e.cat === cat).map(e => `<button type="button" class="chip" onclick="${fn}('${e.id}')" title="${esc(e.how)}">${icon('plus', 14)}${esc(e.name)}</button>`).join('')}</div></details>`).join('')}</div>`; }
function addItem(exId){ S.edit.items.push(mkItem(exId)); S.dirty = true; rerender(planHTML); toast('已加入：' + (findEx(exId)?.name || '自訂項目')); }
function savePlan(){
  const p = S.edit, err = [];
  if (!p.author?.trim()) err.push('請填寫擬定者'); if (!p.startDate || !p.endDate || p.endDate <= p.startDate) err.push('請確認計畫期間');
  p.goals = p.goals.filter(g => g.text?.trim()); p.problems = p.problems.filter(x => x?.trim());
  if (!p.items.length) err.push('至少需要一個復能項目');
  p.items.forEach((it, i) => { if (!it.name?.trim()) err.push(`第${i + 1}項未填名稱`); if (!(it.days || []).length) err.push(`「${it.name || i + 1}」未勾選執行日`); });
  if (err.length) { if (!p.goals.length) p.goals.push({ id:Store.newId() }); rerender(planHTML); return toast(err.join('；'), 'err'); }
  const isNew = !p.id; delete p._sug;
  if (isNew) { Logic.plansOf(p.clientId).filter(x => x.status === '執行中').forEach(x => { x.status = '已結束'; if (x.endDate >= p.startDate) x.endDate = addDays(p.startDate, -1); Store.upsert('plans', x); }); p.status = '執行中'; }
  Store.upsert('plans', p); S.dirty = false; toast(isNew ? `計畫 v${p.version} 開始執行` : '已儲存'); App.go('#/client/' + p.clientId + '/plan');
}
function endPlan(){ if (!askConfirm('確定結束此計畫？')) return; const p = Store.get('plans', S.edit.id); p.status = '已結束'; if (p.endDate > todayISO()) p.endDate = todayISO(); Store.upsert('plans', p); S.dirty = false; App.go('#/client/' + p.clientId + '/plan'); }
