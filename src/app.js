/* ================================================================
   App：外框、路由、首頁、設定
   ================================================================ */
const APP_TITLE = '復能計畫與執行檢核';
/* 標誌：拄著拐杖向前走的長輩＋向上箭頭（找回能力、往前一步） */
const LOGO_SVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9.5" cy="4.2" r="2.1"/><path d="M9.2 7.4L8.3 13"/><path d="M8.3 13l-1.7 4-1.2 4"/><path d="M8.3 13l2.4 3.4.5 4.6"/><path d="M9 8.9l3.2 2.6"/><path d="M12.2 11.2l.9 9.8"/><path d="M15.5 17.5l5-7"/><path d="M17.6 10.3h2.9v2.9"/></svg>`;
const NAV = [['#/', 'home', '首頁'], ['#/today', 'check', '今日勾選'], ['#/clients', 'users', '個案名冊'], ['#/library', 'clip', '復能項目庫'], ['#/settings', 'gear', '設定與備份']];
const App = {
  currentUserId(){ try { return localStorage.getItem('rehabl:who') || ''; } catch(e){ return ''; } },
  setWho(v){ try { localStorage.setItem('rehabl:who', v.trim()); } catch(e){} toast('記錄者：' + (v.trim() || '（未填）')); },
  go(h){ location.hash = h; },
  toast,
};
function renderShell(){
  $('#side').innerHTML = `
    <div class="brand"><div class="logo">${LOGO_SVG}</div><div class="b-txt"><div class="b1">${APP_TITLE}</div><div class="b2">${esc([Store.DB.meta.orgName, Store.DB.meta.orgType].filter(Boolean).join('｜'))}${Store.DB.meta.orgType ? ' <a href="#/settings" class="b2-link">更換</a>' : ''}</div></div></div>
    <nav>${NAV.map(([h, i, l]) => `<a href="${h}">${icon(i)}<span>${l}</span></a>`).join('')}</nav>
    <div class="side-foot">${folderStatusHTML()}</div>`;
  $('#top').innerHTML = `<button class="icon-btn only-m" onclick="document.body.classList.toggle('nav-open')" aria-label="選單">${icon('menu')}</button>
    <div class="top-title" id="top-title"></div><span class="sp"></span>
    <label class="who">記錄者<input class="inp sm" style="width:140px" value="${esc(App.currentUserId())}" placeholder="輸入姓名" onchange="App.setWho(this.value)"></label>`;
}
function setTitle(t, sub = ''){ $('#top-title').innerHTML = `<b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`; document.title = t + '｜' + APP_TITLE; }
function navActive(){
  let cur = location.hash || '#/'; try { cur = decodeURIComponent(cur); } catch(e){}
  if (/^#\/(client|assess|plan)\b/.test(cur)) cur = '#/clients';
  document.querySelectorAll('#side nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === cur));
  document.body.classList.remove('nav-open');
}
const ROUTES = [
  [/^#?\/?$/, () => pageHome()],
  [/^#\/clients$/, () => pageClients()],
  [/^#\/client\/([^/?]+)(?:\/(\w+))?$/, m => pageClient(m[1], m[2] || 'assess')],
  [/^#\/assess\/new\/([^/?]+)$/, m => pageAssessEdit(null, m[1])],
  [/^#\/assess\/([^/?]+)$/, m => pageAssessEdit(m[1])],
  [/^#\/plan\/new\/([^/?]+)(?:\?(.*))?$/, m => pagePlanEdit(null, m[1], new URLSearchParams(m[2] || ''))],
  [/^#\/plan\/([^/?]+)$/, m => pagePlanEdit(m[1])],
  [/^#\/today$/, () => pageToday()],
  [/^#\/library$/, () => pageLibrary()],
  [/^#\/settings$/, () => pageSettings()],
];
let ignoreHash = false;
function route(){
  let h = location.hash || '#/'; try { h = decodeURIComponent(h); } catch(e){}
  for (const [re, fn] of ROUTES) { const m = h.match(re); if (m) { S.edit = null; S.onEdit = null; S.dirty = false; const html = fn(m); if (html != null) $('#main').innerHTML = html; window.scrollTo(0, 0); S.lastHash = h; navActive(); return; } }
  location.hash = '#/';
}
window.addEventListener('hashchange', () => {
  if (ignoreHash) { ignoreHash = false; return; }
  if (S.dirty && !askConfirm('目前編輯的內容尚未儲存，確定要離開嗎？')) { ignoreHash = true; location.hash = S.lastHash; return; }
  route();
});
window.addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
function rerender(fn){ const y = window.scrollY; $('#main').innerHTML = fn(); window.scrollTo(0, y); }

/* ---------------- 首頁 ---------------- */
function pageHome(){
  setTitle(APP_TITLE, rocDate(todayISO()) + '（星期' + WEEKDAYS[weekday(todayISO())] + '）');
  const m = Store.DB.meta;
  if (!m.orgType) return `<section class="card setup"><h2>開始使用：請先選擇機構類型</h2>
    <p>系統會依類型調整用語（個案／住民）、預設執行日（日照週一至五、住宿每天）與表單欄位（住宿加上房號床號）。<b>選錯了也沒關係，之後可在左上角「更換」或「設定與備份」改回來，資料都會保留。</b></p>
    <div class="field"><label class="lbl">機構名稱（會印在表單抬頭，可之後修改）</label><input class="inp" id="orgName" placeholder="例：○○日間照顧中心"></div>
    <div class="choice">${['日間照顧', '住宿機構'].map(t => `<button class="choice-b" onclick="setupOrg('${t}')"><b>${t}</b><small>${t === '日間照顧' ? '日照、小規機、家托' : '長照機構、護理之家、養護/安養機構'}</small></button>`).join('')}</div>
    <p class="hint">想先看看操作方式？選完類型後，首頁可一鍵載入 3 個模擬個案。</p></section>`;
  const today = todayISO(), cs = Store.all('clients').filter(c => c.status !== '結案');
  let tot = 0, done = 0; const noAssess = [], noPlan = [], ending = [];
  for (const c of cs) {
    const p = activePlan(c.id);
    if (!Logic.lastAssessment(c.id)) noAssess.push(c); else if (!p) noPlan.push(c);
    if (p) { if (p.endDate <= addDays(today, 14)) ending.push({ c, p }); p.items.filter(it => scheduled(p, it, today)).forEach(it => { tot++; if (curStatus(p.id, it.id, today)) done++; }); }
  }
  const grpCount = {}; cs.forEach(c => (activePlan(c.id)?.groups || []).forEach(g => grpCount[g.type] = (grpCount[g.type] || 0) + 1));
  const step = (n, t, d, h) => `<a class="step-c" href="${h}"><span class="sn">${n}</span><b>${t}</b><small>${d}</small></a>`;
  const li = (c, t, h, k) => `<li><span class="tt"><a href="#/client/${c.id}"><b>${esc(c.name)}</b></a> ${isRes() && c.bed ? `<small class="muted">${esc(c.bed)}</small>` : ''} <small class="muted">${t}</small></span><a class="btn sm ${k || ''}" href="${h}">前往</a></li>`;
  return `<div class="steps4">
    ${step(1, '評估', '巴氏、體能；系統建議問題、項目、團體與輔具', '#/clients')}
    ${step(2, '介入計畫', '個別（運動／日常生活訓練）＋ 團體', '#/clients')}
    ${step(3, '今日勾選', '照服員或治療師一鍵勾選 ✓ △ ✕', '#/today')}
    ${step(4, '輸出列印', 'Word、PPT、PDF，紙本勾選', '#/clients')}</div>
  ${Folder.supported && !Folder.connected && !(() => { try { return localStorage.getItem('rehabl:folderLater'); } catch(e){ return ''; } })() ? `<section class="card guide"><h2>📁 連接資料夾</h2>${folderCardHTML(true)}</section>` : ''}
  ${demoGuideHTML()}
  ${cs.length ? '' : `<section class="card guide"><h2>還沒有${term()}資料</h2><p>可以先載入 <b>3 個模擬個案</b>，看看從評估、開立計畫、每日勾選到再評估修正的完整流程；看完可一鍵清除。</p><div class="btn-row">${btn('載入 3 個模擬個案', 'loadDemo()', { k:'primary', i:'users' })}<a class="btn" href="#/clients">直接新增${term()}</a></div></section>`}
  <div class="grid2">
    <section class="card"><h2>今日個別介入 <small>${rocDate(today)}</small></h2>
      <div class="big-prog"><b>${done}</b>／${tot} 項已記錄</div><div class="bar"><i style="width:${tot ? Math.round(done / tot * 100) : 0}%"></i></div>
      <p><a class="btn primary" href="#/today">${icon('check', 16)}開始勾選</a></p></section>
    <section class="card"><h2>待處理</h2>
      ${noAssess.length + noPlan.length + ending.length ? `<ul class="todo">${noAssess.map(c => li(c, '尚未評估', `#/assess/new/${c.id}`, 'primary')).join('')}${noPlan.map(c => li(c, '已評估，尚未開立介入計畫', `#/client/${c.id}/plan`, 'primary')).join('')}${ending.map(({ c, p }) => li(c, `計畫將於 ${rocDate(p.endDate)} 結束，請再評估`, `#/assess/new/${c.id}`)).join('')}</ul>` : empty('目前沒有待處理事項')}
    </section></div>
  <div class="grid2">
    <section class="card"><h2>團體參與人數</h2>${Object.keys(grpCount).length ? `<div class="kpis sm">${Object.entries(grpCount).map(([t, n]) => `<div class="kpi"><div class="k-n">${n}</div><div class="k-l">${esc(t)}</div></div>`).join('')}</div>` : empty('尚無團體介入')}</section>
    <section class="card"><h2>空白表單 <small>直接印出，手寫勾選</small></h2><div class="exp-row"><span>空白復能評估表</span>${exportBar('blankAssess', () => assessDoc(null, null), ['pdf', 'word'])}</div></section></div>`;
}
function setOrgType(t){
  const from = Store.DB.meta.orgType; if (from === t) return;
  Store.setMeta('orgType', t);
  const days = t === '住宿機構' ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
  const act = Store.all('plans').filter(p => p.status === '執行中');
  if (act.length && askConfirm(`已改為「${t}」。\n\n要把 ${act.length} 份執行中計畫的個別項目執行日，一併改為「${t === '住宿機構' ? '每天' : '週一至週五'}」嗎？\n（按「取消」則保留原本的執行日）`)) {
    act.forEach(p => { (p.items || []).forEach(it => { it.days = [...days]; }); Store.upsert('plans', p); });
  }
  renderShell(); route(); toast(`已改為${t}（用語：${t === '住宿機構' ? '住民' : '個案'}）`);
}
function setupOrg(t){ Store.setMeta('orgType', t); const n = $('#orgName')?.value.trim(); if (n) Store.setMeta('orgName', n); renderShell(); route(); toast('已設定為' + t); }

/* ---------------- 設定 ---------------- */
function pageSettings(){
  setTitle('設定與備份');
  const m = Store.DB.meta;
  return `<div class="grid2">
  <section class="card"><h2>機構資料</h2>
    <div class="field"><label class="lbl">機構名稱（印在表單抬頭）</label><input class="inp" value="${esc(m.orgName || '')}" onchange="Store.setMeta('orgName',this.value.trim());renderShell();toast('已更新')"></div>
    <div class="field"><label class="lbl">機構類型</label><div class="pills">${['日間照顧', '住宿機構'].map(t => `<label class="pill"><input type="radio" name="ot" ${m.orgType === t ? 'checked' : ''} onchange="setOrgType('${t}')"><span>${t}</span></label>`).join('')}</div></div>
  </section>
  <section class="card"><h2>📁 儲存資料夾</h2>${folderCardHTML(false)}</section>
  <section class="card"><h2>資料備份與還原</h2>
    <p>資料只存在<b>這台電腦的這個瀏覽器</b>。請定期匯出備份到隨身碟或機構雲端。${m.lastBackup ? `<br>上次備份：${rocDate(m.lastBackup)}` : '<br>' + badge('尚未備份', 'red')}</p>
    <div class="btn-row">${btn('匯出備份', 'backup(false)', { k:'primary', i:'download' })}${btn('匯出加密備份', 'backup(true)', { i:'download' })}</div>
    <div class="btn-row">${btn('匯入／合併', `$('#imp').click()`, { i:'upload' })}<input type="file" id="imp" accept=".json" hidden onchange="importFile(this.files[0],false);this.value=''">${btn('以備份檔完全取代', `$('#imp2').click()`, { k:'danger ghost' })}<input type="file" id="imp2" accept=".json" hidden onchange="importFile(this.files[0],true);this.value=''"></div>
  </section></div>
  <section class="card"><h2>示範與重設</h2><p class="hint">示範資料皆為虛構、已去識別化。</p><div class="btn-row">${btn('載入 3 個模擬個案', 'loadDemo()')}${btn('清除模擬個案', 'clearDemoClients()')}${btn('清除全部資料', 'wipeAll()', { k:'danger' })}</div></section>`;
}
async function backup(enc){
  await Folder.ensure();
  const data = Store.exportAll(); let out = JSON.stringify(data), name = `復能檢核備份_${todayISO()}.json`;
  if (enc) { const pw = prompt('請設定備份密碼（至少6碼，遺失無法復原）：'); if (!pw) return; if (pw.length < 6) return toast('密碼至少6碼', 'err'); if (prompt('請再輸入一次密碼：') !== pw) return toast('兩次密碼不一致', 'err'); out = await encryptJSON(data, pw); name = name.replace('.json', '_加密.json'); }
  await download(name, out, 'application/json'); Store.setMeta('lastBackup', new Date().toISOString()); route();
}
async function importFile(file, replace){
  if (!file) return;
  try {
    let data = JSON.parse(await file.text());
    if (data.enc) { const pw = prompt('此為加密備份，請輸入密碼：'); if (!pw) return; try { data = await decryptJSON(data, pw); } catch(e){ return toast('密碼錯誤或檔案損壞', 'err'); } }
    if (replace && !askConfirm('將以備份檔完全取代目前所有資料，無法復原。確定？')) return;
    const r = Store.mergeImport(data, replace); Store.flush(); toast(replace ? `已還原 ${r.added} 筆` : `合併完成：新增 ${r.added}、更新 ${r.updated} 筆`); renderShell(); route();
  } catch(e){ toast('匯入失敗：' + e.message, 'err'); }
}
async function wipeAll(){ if (!askConfirm('將刪除本機所有資料，無法復原。建議先匯出備份。確定？')) return; if (prompt('請輸入「確認刪除」：') !== '確認刪除') return; await Folder.snapshot('刪除前'); Store.clearAll(); Store.flush(); toast('已清除'); renderShell(); App.go('#/'); route(); }
function clearDemo(){ let n = 0; for (const c of COLLECTIONS) for (const r of Store.DB[c]) if (r.demo && !r.deleted) { Store.remove(c, r.id); n++; } toast(`已清除 ${n} 筆示範資料`); route(); }

async function init(){ await Store.load(); await Folder.init(); renderShell(); route(); }
document.addEventListener('DOMContentLoaded', init);
