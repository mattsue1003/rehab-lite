/* ================================================================
   連接資料夾（Chrome／Edge 電腦版）：Word／PPT 存到「文件」、備份存到「備份」，資料變動自動備份
   ================================================================ */
const Folder = (() => {
  const supported = 'showDirectoryPicker' in window;
  let handle = null, granted = false, timer = null;
  async function init(){
    if (!supported) return;
    try { handle = await Store.rawGet('dirHandle') || null; if (handle) granted = (await handle.queryPermission({ mode:'readwrite' })) === 'granted'; } catch(e){ handle = null; }
  }
  async function connect(){
    try {
      const h = await window.showDirectoryPicker({ id:'rehab-lite', mode:'readwrite' });
      handle = h; granted = true; await Store.rawSet('dirHandle', h); Store.setMeta('folderName', h.name);
      await autoBackup(); toast(`已連接資料夾「${h.name}」，並完成第一次備份`); renderShell(); route();
    } catch(e){ if (e.name !== 'AbortError') toast('無法連接資料夾：' + e.message, 'err'); }
  }
  // 重新開啟網頁後，瀏覽器需要使用者按一下才能再次授權
  async function ensure(){
    if (!handle) return false; if (granted) return true;
    try { granted = (await handle.requestPermission({ mode:'readwrite' })) === 'granted'; } catch(e){ granted = false; }
    if (granted) { renderShell(); scheduleBackup(0); }
    return granted;
  }
  async function disconnect(){ if (!askConfirm('中斷後，檔案會改為一般下載，也不再自動備份。確定？')) return; handle = null; granted = false; await Store.rawSet('dirHandle', null); Store.setMeta('folderName', ''); renderShell(); route(); }
  async function write(sub, name, data){
    const dir = sub ? await handle.getDirectoryHandle(sub, { create:true }) : handle;
    const w = await (await dir.getFileHandle(name, { create:true })).createWritable(); await w.write(data); await w.close();
  }
  async function save(name, blob){
    if (!handle || !granted) return false;
    const sub = /\.json$/i.test(name) ? '備份' : '文件';
    try { await write(sub, name, blob); toast(`已存到「${handle.name}／${sub}」：${name}`); return true; }
    catch(e){ granted = false; renderShell(); toast('寫入資料夾失敗，改為一般下載', 'err'); return false; }
  }
  function scheduleBackup(ms = 3000){ if (!handle || !granted) return; clearTimeout(timer); timer = setTimeout(autoBackup, ms); }
  async function autoBackup(){
    if (!handle || !granted) return;
    try { await write('備份', `復能檢核_自動備份_${todayISO()}.json`, new Blob([JSON.stringify(Store.exportAll())], { type:'application/json' })); Store.DB.meta.lastAutoBackup = new Date().toISOString(); }
    catch(e){ granted = false; renderShell(); }
  }
  async function listBackups(){
    if (!(await ensure())) return [];
    let dir; try { dir = await handle.getDirectoryHandle('備份'); } catch(e){ return []; }
    const out = []; for await (const [name, h] of dir.entries()) if (h.kind === 'file' && /\.json$/i.test(name)) out.push(await h.getFile());
    return out.sort((a, b) => b.lastModified - a.lastModified);
  }
  // 刪除前先留一份帶時間的備份，避免自動備份覆蓋後無法復原
  async function snapshot(label){
    if (!handle || !granted) return false;
    const t = new Date(), stamp = todayISO() + '_' + String(t.getHours()).padStart(2, '0') + String(t.getMinutes()).padStart(2, '0') + String(t.getSeconds()).padStart(2, '0');
    try { clearTimeout(timer); await write('備份', `復能檢核_${label}_${stamp}.json`, new Blob([JSON.stringify(Store.exportAll())], { type:'application/json' })); return true; } catch(e){ return false; }
  }
  return { supported, init, connect, ensure, disconnect, save, scheduleBackup, listBackups, snapshot,
    get name(){ return handle?.name || ''; }, get connected(){ return !!handle; }, get ready(){ return !!handle && granted; } };
})();
function onStoreFlush(){ Folder.scheduleBackup(); }
function folderStatusHTML(){
  if (!Folder.supported) return '資料只存在這台電腦的瀏覽器<br>請定期到「設定與備份」匯出';
  if (Folder.ready) return `<span class="fs ok">✓ 已連接資料夾「${esc(Folder.name)}」</span><br>資料變動會自動備份`;
  if (Folder.connected) return `<button class="btn sm primary" onclick="Folder.ensure().then(ok=>ok&&toast('已重新連接，自動備份啟用'))">重新連接資料夾「${esc(Folder.name)}」</button><br><small>重新開啟網頁後需按一下授權</small>`;
  return `<a class="btn sm" href="#/settings">建議連接資料夾</a><br><small>匯出檔與自動備份會直接存進去</small>`;
}
function folderCardHTML(compact){
  if (!Folder.supported) return compact ? '' : `<p class="hint">「連接資料夾」需使用電腦版 Chrome 或 Edge。目前瀏覽器請用下方「匯出備份」手動備份。</p>`;
  if (Folder.connected) return `<div class="folder-st"><b>📁 ${esc(Folder.name)}</b> ${Folder.ready ? badge('已連接・自動備份中', 'green') : badge('需重新授權', 'amber')}
    <p class="hint">Word／PPT 會存到「${esc(Folder.name)}／文件」，備份存到「${esc(Folder.name)}／備份」（每天一個自動備份檔）。PDF 由列印視窗另存，第一次請選同一個資料夾。</p>
    <div class="btn-row">${Folder.ready ? '' : btn('重新授權', 'Folder.ensure().then(()=>route())', { k:'primary sm' })}${btn('更換資料夾', 'Folder.connect()', { k:'sm' })}${btn('從資料夾還原…', 'restoreFromFolder()', { k:'sm', i:'upload' })}${btn('中斷連接', 'Folder.disconnect()', { k:'sm ghost' })}</div></div>`;
  return `<p>${compact ? '<b>建議先連接一個資料夾</b>：' : ''}選一個電腦上的資料夾（也可以是 Google 雲端硬碟、OneDrive 同步資料夾），之後 <b>Word／PPT 會直接存進去，資料也會自動備份</b>，換電腦時可從資料夾還原。</p>
    <div class="btn-row">${btn('連接資料夾', 'Folder.connect()', { k:'primary', i:'download' })}${compact ? btn('稍後再說', "try{localStorage.setItem('rehabl:folderLater','1')}catch(e){};route()", { k:'ghost' }) : ''}</div>`;
}
let BACKUP_FILES = [];
async function restoreFromFolder(){
  BACKUP_FILES = await Folder.listBackups(); if (!BACKUP_FILES.length) return toast('資料夾的「備份」裡找不到備份檔', 'err');
  openModal('從資料夾還原', `<p>選擇要還原的時間點。<b>還原會以該備份取代目前所有資料</b>（還原前會先自動備份目前狀態）。</p>
    <table class="tbl"><thead><tr><th>備份檔</th><th>時間</th><th></th></tr></thead><tbody>${BACKUP_FILES.map((f, i) => `<tr><td>${esc(f.name)}</td><td class="nowrap">${new Date(f.lastModified).toLocaleString()}</td><td>${btn('還原此份', `restorePick(${i})`, { k:'sm primary' })}</td></tr>`).join('')}</tbody></table>`, { wide:true });
}
async function restorePick(i){ const f = BACKUP_FILES[i]; if (!f) return; if (!askConfirm(`確定以「${f.name}」取代目前所有資料？`)) return; await Folder.snapshot('還原前'); closeModal(true); const data = JSON.parse(await f.text()); Store.mergeImport(data, true); Store.flush(); toast('已還原：' + f.name); renderShell(); route(); }
