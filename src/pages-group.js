/* ================================================================
   團體復能：團體計畫、每次執行檢核、輸出；以及復能項目庫
   ================================================================ */
const GROUP_TYPES = ['肌力訓練', '平衡防跌', '有氧耐力', '認知促進', '口腔吞嚥', '手功能', '生活功能', '綜合'];
const STAGES = ['暖身', '主活動', '緩和'];
const lastSessionDate = g => { for (let i = 0; i < 14; i++) { const d = addDays(todayISO(), -i); if ((g.days || []).includes(weekday(d))) return d; } return todayISO(); };
const nextSessionDate = g => { for (let i = 0; i < 14; i++) { const d = addDays(todayISO(), i); if ((g.days || []).includes(weekday(d))) return d; } return todayISO(); };

function pageGroups(){
  setTitle('團體復能');
  const gs = Store.all('groups').sort(byDate('startDate')).reverse();
  return `<div class="toolbar"><span class="muted">一個團體＝固定成員＋固定時間＋活動流程，每次上課勾選出席與參與。</span><span class="sp"></span><a class="btn primary" href="#/group/new">${icon('plus', 16)}建立團體</a></div>
  <div class="gcards">${gs.map(g => { const ss = Store.all('sessions').filter(s => s.groupId === g.id); const mem = (g.members || []).length; const att = ss.reduce((a, s) => a + (g.members || []).filter(id => s.att?.[id]?.present).length, 0); return `<a class="card gcard" href="#/group/${g.id}"><div class="gc-h"><b>${esc(g.name)}</b>${badge(g.status || '進行中', g.status === '結束' ? '' : 'green')}</div><small>${esc(g.type || '')}｜${esc(daysText(g.days))} ${esc(g.time || '')}｜帶領：${esc(g.leader || '')}</small><div class="gc-n"><span><b>${mem}</b> 位成員</span><span><b>${ss.length}</b> 次紀錄</span><span>出席率 <b>${ss.length && mem ? Math.round(att / (ss.length * mem) * 100) : '—'}</b>%</span></div></a>`; }).join('') || empty('尚未建立團體')}</div>`;
}

const GTABS = [['plan', '團體計畫'], ['check', '執行檢核'], ['export', '列印輸出']];
function pageGroup(id, tab){
  if (id === 'new') { const t = todayISO(); S.edit = { name:'', type:'肌力訓練', goal:'', criteria:'', leader:App.currentUserId(), helpers:'', days:isRes() ? [2, 4] : [1, 3, 5], time:'10:00', duration:40, place:'', startDate:t, endDate:addDays(t, 83), members:[], memberNotes:{}, flow:[], precautions:'', status:'進行中' };
    ['warm_joint', 'str_sitstand', 'cool_stretch'].forEach(e => S.edit.flow.push(mkFlow(e))); setTitle('建立團體'); return groupPlanHTML(); }
  const g = Store.get('groups', id); if (!g) { App.go('#/groups'); return ''; }
  setTitle(g.name, `${daysText(g.days)} ${g.time || ''}｜${(g.members || []).length} 人`);
  if (tab === 'plan') S.edit = clone(g);
  const body = tab === 'check' ? groupCheckHTML(g) : tab === 'export' ? groupExportHTML(g) : groupPlanHTML();
  return body;
}
function gTabs(id, tab){ return id ? `<div class="tabs">${GTABS.map(([k, l], i) => `<a href="#/group/${id}/${k}" class="${tab === k ? 'on' : ''}"><span class="tn-n">${i + 1}</span>${l}</a>`).join('')}</div>` : ''; }
function mkFlow(exId){ const e = exId ? findEx(exId) : null; return { id:Store.newId(), exId:exId || '', stage:e?.cat === '暖身/緩和' ? (/緩和|伸展/.test(e.name) ? '緩和' : '暖身') : '主活動', name:e?.name || '', minutes:e?.cat === '暖身/緩和' ? 5 : 10, dose:e?.dose || '', how:e?.how || '', caution:e?.caution || '' }; }

function groupPlanHTML(){
  const g = S.edit, cs = Store.all('clients').filter(c => c.status !== '結案' || (g.members || []).includes(c.id)).sort((a, b) => (a.bed || a.name).localeCompare(b.bed || b.name));
  const total = (g.flow || []).reduce((s, f) => s + (+f.minutes || 0), 0);
  return `<div class="toolbar sticky-bar"><a class="btn" href="#/groups">${icon('back', 16)}團體列表</a><span class="sp"></span>
    ${g.id ? btn('刪除團體', `if(askConfirm('確定刪除此團體？')){Store.remove('groups','${g.id}');S.dirty=false;App.go('#/groups')}`, { k:'danger ghost', i:'trash' }) : ''}${btn(g.id ? '儲存' : '建立團體', 'saveGroup()', { k:'primary', i:'check' })}</div>
  ${gTabs(g.id, 'plan')}
  <section class="card"><h2>團體資訊</h2><div class="form-grid g3">
    ${F.field('團體名稱', F.input('name', { ph:'例：下肢肌力防跌班' }), { req:true })}${F.field('類型', F.select('type', GROUP_TYPES, { blank:false }))}${F.field('狀態', F.select('status', ['進行中', '結束'], { blank:false }))}
    ${F.field('帶領者', F.input('leader'), { req:true })}${F.field('協助人員', F.input('helpers', { ph:'例：照服員 2 名' }))}${F.field('地點', F.input('place', { ph:'例：二樓活動室' }))}
    ${F.field('上課日', `<div class="pills">${[1, 2, 3, 4, 5, 6, 7].map(w => F.checkArr('days', w, '週' + WEEKDAYS[w], true)).join('')}</div>`, { cls:'span2' })}${F.field('時間', F.input('time', { type:'time' }))}
    ${F.field('開始日期', F.date('startDate'))}${F.field('結束日期', F.date('endDate'))}${F.field('每次時間（分鐘）', F.num('duration', { min:10 }), { hint:`流程合計 ${total} 分鐘` })}
    ${F.field('團體目標', F.text('goal', { rows:2, ph:'例：12週後成員30秒坐站平均增加2次' }), { cls:'span3' })}${F.field('選擇成員條件', F.text('criteria', { rows:2, ph:'例：可坐姿維持30分鐘、巴氏≥40、可聽從口令' }), { cls:'span3' })}</div></section>
  <section class="card"><h2>成員 <small>已選 ${(g.members || []).length} 位</small></h2>
    ${cs.length ? `<div class="pills">${cs.map(c => F.checkArr('members', c.id, c.name + (isRes() && c.bed ? `（${c.bed}）` : ''))).join('')}</div>` : empty(`請先到「個別復能」新增${term()}`)}
    ${(g.members || []).length ? `<h3>個別注意事項</h3>${g.members.map(id => { const c = Store.get('clients', id); return c ? `<div class="row-edit"><span class="w8">${esc(c.name)}</span>${F.input('memberNotes.' + id, { ph:c.caution || '例：坐姿進行、勿負重' })}</div>` : ''; }).join('')}` : ''}
    <p class="hint">勾選或取消成員後，按「儲存」才會更新注意事項欄。</p></section>
  <section class="card"><h2>活動流程 <small>合計 ${total} 分鐘</small></h2>
    <div class="items-edit">${(g.flow || []).map((f, i) => `<div class="item-card"><div class="ic-h"><b>${i + 1}.</b>${F.select(`flow.${i}.stage`, STAGES, { blank:false })}${F.input(`flow.${i}.name`, { cls:'grow' })}
      ${btn('↑', `moveFlow(${i},-1)`, { k:'sm ghost', title:'上移' })}${btn('↓', `moveFlow(${i},1)`, { k:'sm ghost', title:'下移' })}${btn('✕', `S.edit.flow.splice(${i},1);rerender(groupPlanHTML)`, { k:'sm ghost', title:'移除' })}</div>
      <div class="form-grid g3">${F.field('時間（分鐘）', F.num(`flow.${i}.minutes`, { min:1 }))}${F.field('劑量', F.input(`flow.${i}.dose`), { cls:'span2' })}${F.field('帶領要點', F.text(`flow.${i}.how`, { rows:2 }), { cls:'span2' })}${F.field('注意事項', F.text(`flow.${i}.caution`, { rows:2 }))}</div></div>`).join('')}</div>
    <h3>從項目庫加入</h3>${libPicker('addFlow')}${btn('新增自訂活動', 'addFlow()', { k:'sm', i:'plus' })}</section>
  <section class="card"><h2>安全注意事項</h2>${F.text('precautions', { rows:2, ph:'例：活動前量血壓；出現胸悶、頭暈立即停止；每 15 分鐘提醒喝水' })}</section>`;
}
function addFlow(exId){ S.edit.flow.push(mkFlow(exId)); S.dirty = true; rerender(groupPlanHTML); }
function moveFlow(i, d){ const f = S.edit.flow, j = i + d; if (j < 0 || j >= f.length) return; [f[i], f[j]] = [f[j], f[i]]; S.dirty = true; rerender(groupPlanHTML); }
function saveGroup(){
  const g = S.edit;
  if (!g.name?.trim()) return toast('請填寫團體名稱', 'err'); if (!g.leader?.trim()) return toast('請填寫帶領者', 'err');
  if (!(g.days || []).length) return toast('請勾選上課日', 'err'); if (!(g.flow || []).length) return toast('請加入活動流程', 'err');
  const isNew = !g.id, s = Store.upsert('groups', g); S.dirty = false; toast(isNew ? '團體已建立' : '已儲存');
  if (isNew) App.go('#/group/' + s.id + '/plan'); else route();
}

/* 每次執行檢核 */
function groupCheckHTML(g){
  const d = S.sessDate && S.sessDate.g === g.id ? S.sessDate.d : lastSessionDate(g);
  const s = Store.all('sessions').find(x => x.groupId === g.id && x.date === d);
  const mem = (g.members || []).map(id => Store.get('clients', id)).filter(Boolean);
  const past = Store.all('sessions').filter(x => x.groupId === g.id).sort(byDate('date')).reverse();
  const scheduled = (g.days || []).includes(weekday(d));
  const seg = (cid, k, opts, cur) => `<div class="segs">${opts.map(o => `<button class="seg ${cur === o ? 'on' : ''}" onclick="setAtt('${g.id}','${d}','${cid}','${k}','${o}')">${o}</button>`).join('')}</div>`;
  return `<div class="toolbar"><a class="btn" href="#/groups">${icon('back', 16)}團體列表</a><span class="sp"></span></div>${gTabs(g.id, 'check')}
  <div class="toolbar"><label class="lbl">上課日期</label><input type="date" class="inp" value="${d}" onchange="S.sessDate={g:'${g.id}',d:this.value};route()">
    ${!scheduled ? badge('非排定上課日', 'amber') : ''}<span class="sp"></span>
    ${s ? `<span class="muted">出席 ${mem.filter(c => s.att?.[c.id]?.present).length}/${mem.length}</span>` : ''}${btn('全部出席', `allPresent('${g.id}','${d}')`, { k:'sm' })}</div>
  <section class="card flush"><div class="tbl-wrap"><table class="tbl gck"><thead><tr><th>成員</th><th>出席</th><th>參與程度</th><th>耐受度</th><th>備註</th></tr></thead><tbody>
  ${mem.map(c => { const r = s?.att?.[c.id] || {}; const off = r.present === false; return `<tr class="${off ? 'absent' : ''}"><td><b>${esc(c.name)}</b>${(g.memberNotes || {})[c.id] ? `<br><small class="warn-t">${esc(g.memberNotes[c.id])}</small>` : ''}</td>
    <td><div class="segs"><button class="seg ${r.present === true ? 'on' : ''}" onclick="setAtt('${g.id}','${d}','${c.id}','present',true)">出席</button><button class="seg ${off ? 'on warn' : ''}" onclick="setAtt('${g.id}','${d}','${c.id}','present',false)">缺席</button></div></td>
    <td>${off ? '' : seg(c.id, 'level', ['主動', '需提示', '需協助', '拒絕'], r.level)}</td><td>${off ? '' : seg(c.id, 'tol', ['良好', '疲累', '不適'], r.tol)}</td>
    <td><input class="inp" value="${esc(r.note || '')}" placeholder="${off ? '缺席原因' : '表現、進步'}" onchange="setAtt('${g.id}','${d}','${c.id}','note',this.value)"></td></tr>`; }).join('') || `<tr><td colspan="5">${empty('尚未加入成員')}</td></tr>`}
  </tbody></table></div></section>
  <div class="grid2"><section class="card"><h2>活動流程完成</h2>${(g.flow || []).map(f => `<label class="chk"><input type="checkbox" ${s?.done?.[f.id] ? 'checked' : ''} onchange="setDone('${g.id}','${d}','${f.id}',this.checked)"><span>${esc(f.stage)}｜${esc(f.name)} <small>${esc(f.dose || '')}</small></span></label>`).join('<br>')}</section>
    <section class="card"><h2>本次紀錄</h2><div class="field"><label class="lbl">帶領者</label><input class="inp" value="${esc(s?.leader || g.leader || '')}" onchange="setSess('${g.id}','${d}','leader',this.value)"></div>
    <textarea class="inp" rows="3" placeholder="整體觀察、調整建議" onchange="setSess('${g.id}','${d}','note',this.value)">${esc(s?.note || '')}</textarea>
    <div class="exp-row"><span>印出本次檢核表</span>${exportBar('gs_' + g.id, () => groupCheckDoc(Store.get('groups', g.id), { mode:'session', date:d, filled:true }), ['pdf', 'word'])}</div></section></div>
  <section class="card"><h2>歷次紀錄</h2>${past.length ? `<table class="tbl"><thead><tr><th>日期</th><th>出席</th><th>主動參與</th><th>帶領者</th><th>紀錄</th></tr></thead><tbody>${past.map(x => `<tr class="click" onclick="S.sessDate={g:'${g.id}',d:'${x.date}'};route()"><td>${rocDate(x.date)}</td><td>${mem.filter(c => x.att?.[c.id]?.present).length}/${mem.length}</td><td>${mem.filter(c => x.att?.[c.id]?.level === '主動').length}</td><td>${esc(x.leader || '')}</td><td><small>${esc((x.note || '').slice(0, 40))}</small></td></tr>`).join('')}</tbody></table>` : empty('尚無紀錄')}</section>`;
}
function sess(gid, d){ return Store.all('sessions').find(x => x.groupId === gid && x.date === d) || { groupId:gid, date:d, att:{}, done:{}, leader:Store.get('groups', gid)?.leader || '' }; }
function setAtt(gid, d, cid, k, v){ const s = sess(gid, d); s.att ||= {}; const r = s.att[cid] ||= {}; r[k] = (r[k] === v && k !== 'note') ? undefined : v; if (k === 'present' && r.present === false) { delete r.level; delete r.tol; } if ((k === 'level' || k === 'tol') && r.present == null) r.present = true; s.by = App.currentUserId(); Store.upsert('sessions', s); if (k !== 'note') rerender(() => pageGroup(gid, 'check')); }
function setDone(gid, d, fid, v){ const s = sess(gid, d); s.done ||= {}; s.done[fid] = v; Store.upsert('sessions', s); }
function setSess(gid, d, k, v){ const s = sess(gid, d); s[k] = v; Store.upsert('sessions', s); toast('已儲存'); }
function allPresent(gid, d){ const s = sess(gid, d), g = Store.get('groups', gid); s.att ||= {}; (g.members || []).forEach(id => { s.att[id] = { ...(s.att[id] || {}), present:true }; }); Store.upsert('sessions', s); rerender(() => pageGroup(gid, 'check')); }

let gExp = { filled:false };
function groupExportHTML(g){
  const d = gExp.date || nextSessionDate(g), mo = gExp.month || todayISO().slice(0, 7);
  return `<div class="toolbar"><a class="btn" href="#/groups">${icon('back', 16)}團體列表</a></div>${gTabs(g.id, 'export')}
  <section class="card"><h2>團體計畫與帶領</h2>
    <div class="exp-row"><span>團體復能計畫書</span>${exportBar('gp_' + g.id, () => groupDoc(Store.get('groups', g.id)))}</div>
    <div class="exp-row"><span>團體帶領簡報（大字，投影給長輩看）</span>${btn('PPT', `downloadGroupSlides(Store.get('groups','${g.id}')).catch(e=>toast(e.message,'err'))`, { k:'sm', i:'download' })}</div></section>
  <section class="card"><h2>執行檢核表 <small>印出後由帶領者勾選</small></h2>
    <div class="field"><label class="lbl">內容</label><div class="pills">${[[false, '空白（手寫勾選）'], [true, '帶入已記錄']].map(([v, l]) => `<label class="pill"><input type="radio" name="gf" ${gExp.filled === v ? 'checked' : ''} onchange="gExp.filled=${v}"><span>${l}</span></label>`).join('')}</div></div>
    <div class="exp-row"><span>單次檢核表（出席、參與程度、耐受度、流程完成）　日期 <input type="date" class="inp sm" value="${d}" onchange="gExp.date=this.value"></span>${exportBar('gx1_' + g.id, () => groupCheckDoc(Store.get('groups', g.id), { mode:'session', date:gExp.filled ? (gExp.date || nextSessionDate(g)) : '', filled:gExp.filled }), ['pdf', 'word'])}</div>
    <div class="exp-row"><span>月出席與參與表　月份 <input type="month" class="inp sm" value="${mo}" onchange="gExp.month=this.value"></span>${exportBar('gx2_' + g.id, () => groupCheckDoc(Store.get('groups', g.id), { mode:'month', month:gExp.month || todayISO().slice(0, 7), filled:gExp.filled }), ['pdf', 'word'])}</div></section>`;
}

/* ---------------- 復能項目庫 ---------------- */
function pageLibrary(){
  setTitle('復能項目庫', `內建 ${EXERCISES.length} 項＋自訂 ${Store.all('library').length} 項`);
  return `<div class="toolbar"><span class="muted">開立個別計畫與團體流程時，從這裡選用。可新增機構自己的項目。</span><span class="sp"></span>${btn('新增自訂項目', 'editLib()', { k:'primary', i:'plus' })}</div>
  ${EX_CATS.map(cat => { const list = allExercises().filter(e => e.cat === cat); return `<section class="card"><h2>${cat} <small>${list.length} 項</small></h2><table class="tbl sm"><thead><tr><th style="width:22%">項目</th><th style="width:14%">預設劑量</th><th>執行方式</th><th style="width:22%">注意事項</th></tr></thead><tbody>${list.map(e => `<tr${e.id.startsWith('lib_') ? ` class="click" onclick="editLib('${e.id}')"` : ''}><td><b>${esc(e.name)}</b>${e.id.startsWith('lib_') ? ' ' + badge('自訂', 'green') : ''}</td><td>${esc(e.dose)}</td><td>${esc(e.how)}</td><td>${esc(e.caution)}</td></tr>`).join('')}</tbody></table></section>`; }).join('')}`;
}
function editLib(id){
  S.edit = id ? clone(Store.get('library', id)) : { id:'', cat:'肌力', name:'', dose:'', how:'', caution:'', selfcare:false };
  openModal(id ? '編輯自訂項目' : '新增自訂項目', `<div class="form-grid">${F.field('名稱', F.input('name'), { req:true })}${F.field('類別', F.select('cat', EX_CATS, { blank:false }))}${F.field('預設劑量', F.input('dose'))}<div></div>${F.field('執行方式', F.text('how'), { cls:'span2' })}${F.field('注意事項', F.text('caution', { rows:2 }), { cls:'span2' })}</div>`,
    { wide:true, extra:id ? btn('刪除', `Store.remove('library','${id}');closeModal(true);route()`, { k:'danger ghost' }) : '', onSave:() => { if (!S.edit.name?.trim()) { toast('請填寫名稱', 'err'); return false; } if (!S.edit.id) S.edit.id = 'lib_' + Store.newId(); Store.upsert('library', S.edit); S.dirty = false; route(); }, restore:() => { S.dirty = false; } });
}
