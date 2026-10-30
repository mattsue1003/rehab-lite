/* ================================================================
   App：外框、路由、首頁、設定
   ================================================================ */
const APP_TITLE = '復能計畫與執行檢核';
const NAV = [['#/', 'home', '首頁'], ['#/clients', 'users', '個別復能'], ['#/groups', 'star', '團體復能'], ['#/library', 'clip', '復能項目庫'], ['#/settings', 'gear', '設定與備份']];
const App = {
  currentUserId(){ try { return localStorage.getItem('rehabl:who') || ''; } catch(e){ return ''; } },
  setWho(v){ try { localStorage.setItem('rehabl:who', v.trim()); } catch(e){} toast('記錄者：' + (v.trim() || '（未填）')); },
  go(h){ location.hash = h; },
  toast,
};
function renderShell(){
  $('#side').innerHTML = `
    <div class="brand"><div class="logo">${icon('heart', 22)}</div><div><div class="b1">${APP_TITLE}</div><div class="b2">${esc(Store.DB.meta.orgName || '')}${Store.DB.meta.orgType ? '｜' + esc(Store.DB.meta.orgType) : ''}</div></div></div>
    <nav>${NAV.map(([h, i, l]) => `<a href="${h}">${icon(i)}<span>${l}</span></a>`).join('')}</nav>
    <div class="side-foot">資料只存在這台電腦的瀏覽器<br>請定期到「設定與備份」匯出</div>`;
  $('#top').innerHTML = `<button class="icon-btn only-m" onclick="document.body.classList.toggle('nav-open')" aria-label="選單">${icon('menu')}</button>
    <div class="top-title" id="top-title"></div><span class="sp"></span>
    <label class="who">記錄者<input class="inp sm" style="width:140px" value="${esc(App.currentUserId())}" placeholder="輸入姓名" onchange="App.setWho(this.value)"></label>`;
}
function setTitle(t, sub = ''){ $('#top-title').innerHTML = `<b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`; document.title = t + '｜' + APP_TITLE; }
function navActive(){
  let cur = location.hash || '#/'; try { cur = decodeURIComponent(cur); } catch(e){}
  if (/^#\/(client|assess|plan)\b/.test(cur)) cur = '#/clients'; if (/^#\/group\b/.test(cur)) cur = '#/groups';
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
  [/^#\/groups$/, () => pageGroups()],
  [/^#\/group\/([^/?]+)(?:\/(\w+))?$/, m => pageGroup(m[1], m[2] || 'plan')],
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
    <p>系統會依類型調整用語（${'個案／住民'}）、預設執行日（日照週一至五、住宿每天）與表單欄位（住宿加上房號床號）。</p>
    <div class="field"><label class="lbl">機構名稱（會印在表單抬頭，可之後修改）</label><input class="inp" id="orgName" placeholder="例：○○日間照顧中心"></div>
    <div class="choice">${['日間照顧', '住宿機構'].map(t => `<button class="choice-b" onclick="setupOrg('${t}')"><b>${t}</b><small>${t === '日間照顧' ? '日照、小規機、家托' : '長照機構、護理之家、養護/安養機構'}</small></button>`).join('')}</div>
    <p class="hint">想先看看操作方式？選完類型後可到「設定與備份」載入示範資料。</p></section>`;
  const cs = Store.all('clients').filter(c => c.status !== '結案'), act = cs.filter(c => activePlan(c.id));
  const today = todayISO(), gs = Store.all('groups').filter(g => g.status !== '結束');
  const todayGs = gs.filter(g => (g.days || []).includes(weekday(today)) && g.startDate <= today && g.endDate >= today);
  const step = (n, t, d, h) => `<a class="step-c" href="${h}"><span class="sn">${n}</span><b>${t}</b><small>${d}</small></a>`;
  return `<div class="steps4">
    ${step(1, '評估', '巴氏、體能、IADL、認知；系統建議需復能的問題', '#/clients')}
    ${step(2, '開立計畫', '個別復能計畫／團體復能計畫', '#/clients')}
    ${step(3, '執行檢核', '照服員或治療師勾選 ✓ △ ✕', '#/clients')}
    ${step(4, '輸出列印', 'Word、PPT、PDF，印出紙本勾選', '#/clients')}</div>
  <div class="grid2">
    <section class="card"><h2>個別復能 <small>${cs.length} 位${term()}，${act.length} 位計畫執行中</small></h2>
      ${cs.length ? `<ul class="todo">${cs.slice(0, 8).map(c => { const p = activePlan(c.id); return `<li><span class="tt"><a href="#/client/${c.id}"><b>${esc(c.name)}</b></a> ${isRes() && c.bed ? `<small class="muted">${esc(c.bed)}</small>` : ''}</span>${p ? badge('計畫至 ' + rocDate(p.endDate), p.endDate < today ? 'red' : 'green') : badge(Logic.lastAssessment(c.id) ? '待開計畫' : '待評估', 'amber')}<a class="btn sm" href="#/client/${c.id}/check">檢核</a></li>`; }).join('')}</ul>` : empty(`尚未建立${term()}`, `<a class="btn primary" href="#/clients">新增${term()}</a>`)}
    </section>
    <section class="card"><h2>團體復能 <small>今天有 ${todayGs.length} 個團體</small></h2>
      ${gs.length ? `<ul class="todo">${gs.map(g => `<li><span class="tt"><a href="#/group/${g.id}"><b>${esc(g.name)}</b></a> <small class="muted">${esc(daysText(g.days))} ${esc(g.time || '')}｜${(g.members || []).length} 人</small></span>${todayGs.includes(g) ? badge('今天', 'green') : ''}<a class="btn sm" href="#/group/${g.id}/check">檢核</a></li>`).join('')}</ul>` : empty('尚未建立團體', `<a class="btn primary" href="#/groups">建立團體</a>`)}
    </section>
  </div>
  <section class="card"><h2>空白表單 <small>直接印出，手寫勾選</small></h2>
    <div class="exp-row"><span>空白復能評估表</span>${exportBar('blankAssess', () => assessDoc(null, null), ['pdf', 'word'])}</div>
  </section>`;
}
function setupOrg(t){ Store.setMeta('orgType', t); const n = $('#orgName')?.value.trim(); if (n) Store.setMeta('orgName', n); renderShell(); route(); toast('已設定為' + t); }

/* ---------------- 設定 ---------------- */
function pageSettings(){
  setTitle('設定與備份');
  const m = Store.DB.meta;
  return `<div class="grid2">
  <section class="card"><h2>機構資料</h2>
    <div class="field"><label class="lbl">機構名稱（印在表單抬頭）</label><input class="inp" value="${esc(m.orgName || '')}" onchange="Store.setMeta('orgName',this.value.trim());renderShell();toast('已更新')"></div>
    <div class="field"><label class="lbl">機構類型</label><div class="pills">${['日間照顧', '住宿機構'].map(t => `<label class="pill"><input type="radio" name="ot" ${m.orgType === t ? 'checked' : ''} onchange="Store.setMeta('orgType','${t}');renderShell();toast('已改為${t}')"><span>${t}</span></label>`).join('')}</div></div>
  </section>
  <section class="card"><h2>資料備份與還原</h2>
    <p>資料只存在<b>這台電腦的這個瀏覽器</b>。請定期匯出備份到隨身碟或機構雲端。${m.lastBackup ? `<br>上次備份：${rocDate(m.lastBackup)}` : '<br>' + badge('尚未備份', 'red')}</p>
    <div class="btn-row">${btn('匯出備份', 'backup(false)', { k:'primary', i:'download' })}${btn('匯出加密備份', 'backup(true)', { i:'download' })}</div>
    <div class="btn-row">${btn('匯入／合併', `$('#imp').click()`, { i:'upload' })}<input type="file" id="imp" accept=".json" hidden onchange="importFile(this.files[0],false);this.value=''">${btn('以備份檔完全取代', `$('#imp2').click()`, { k:'danger ghost' })}<input type="file" id="imp2" accept=".json" hidden onchange="importFile(this.files[0],true);this.value=''"></div>
  </section></div>
  <section class="card"><h2>示範與重設</h2><p class="hint">示範資料皆為虛構、已去識別化。</p><div class="btn-row">${btn('載入示範資料', 'loadDemo()')}${btn('清除示範資料', 'clearDemo()')}${btn('清除全部資料', 'wipeAll()', { k:'danger' })}</div></section>`;
}
async function backup(enc){
  const data = Store.exportAll(); let out = JSON.stringify(data), name = `復能檢核備份_${todayISO()}.json`;
  if (enc) { const pw = prompt('請設定備份密碼（至少6碼，遺失無法復原）：'); if (!pw) return; if (pw.length < 6) return toast('密碼至少6碼', 'err'); if (prompt('請再輸入一次密碼：') !== pw) return toast('兩次密碼不一致', 'err'); out = await encryptJSON(data, pw); name = name.replace('.json', '_加密.json'); }
  download(name, out, 'application/json'); Store.setMeta('lastBackup', new Date().toISOString()); toast('備份已下載'); route();
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
function wipeAll(){ if (!askConfirm('將刪除本機所有資料，無法復原。建議先匯出備份。確定？')) return; if (prompt('請輸入「確認刪除」：') !== '確認刪除') return; Store.clearAll(); Store.flush(); toast('已清除'); renderShell(); App.go('#/'); route(); }
function clearDemo(){ let n = 0; for (const c of COLLECTIONS) for (const r of Store.DB[c]) if (r.demo && !r.deleted) { Store.remove(c, r.id); n++; } toast(`已清除 ${n} 筆示範資料`); route(); }

async function init(){ await Store.load(); renderShell(); route(); }
document.addEventListener('DOMContentLoaded', init);
