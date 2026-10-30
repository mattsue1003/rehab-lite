/* ================================================================
   資料層：IndexedDB（失敗時退回 localStorage），所有資料只存在本機
   每筆紀錄含 id / updatedAt / updatedBy，刪除採軟刪除，方便多台裝置合併
   ================================================================ */
const COLLECTIONS = ['clients','assessments','plans','checks','weekNotes','groups','sessions','library'];

const Store = (() => {
  const DB = { meta:{} };
  let idb = null, timer = null;
  const dirty = new Set();

  function openIDB(){
    return new Promise(res => {
      try {
        const r = indexedDB.open('rehab-lite', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch(e){ res(null); }
    });
  }
  function idbGet(k){ return new Promise(res => { try { const q = idb.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); } catch(e){ res(undefined); } }); }

  async function load(){
    idb = await openIDB();
    for (const c of ['meta', ...COLLECTIONS]) {
      let v;
      if (idb) v = await idbGet(c);
      else { try { v = JSON.parse(localStorage.getItem('rehabl:'+c)); } catch(e){} }
      DB[c] = v ?? (c === 'meta' ? {} : []);
    }
    try { navigator.storage?.persist?.(); } catch(e){}
  }

  function touch(c){ dirty.add(c); clearTimeout(timer); timer = setTimeout(flush, 120); }
  function flush(){
    const cols = [...dirty]; dirty.clear();
    if (idb) {
      try {
        const tx = idb.transaction('kv','readwrite'), st = tx.objectStore('kv');
        cols.forEach(c => st.put(DB[c], c));
        tx.onerror = () => App.toast('資料儲存失敗，請立即匯出備份', 'err');
      } catch(e){ App.toast('資料儲存失敗：'+e.message, 'err'); }
    } else {
      try { cols.forEach(c => localStorage.setItem('rehabl:'+c, JSON.stringify(DB[c]))); }
      catch(e){ App.toast('瀏覽器儲存空間不足，請匯出備份', 'err'); }
    }
  }
  window.addEventListener('beforeunload', () => { if (dirty.size) flush(); });

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const all = c => DB[c].filter(r => !r.deleted);
  const get = (c, id) => DB[c].find(r => r.id === id && !r.deleted);
  function upsert(c, obj){
    const now = new Date().toISOString();
    obj.updatedAt = now; obj.updatedBy = App.currentUserId();
    if (!obj.id) { obj.id = newId(); obj.createdAt = now; DB[c].push(obj); }
    else { const i = DB[c].findIndex(r => r.id === obj.id); if (i >= 0) DB[c][i] = obj; else DB[c].push(obj); }
    touch(c); return obj;
  }
  function remove(c, id){ const r = DB[c].find(x => x.id === id); if (r) { r.deleted = true; r.updatedAt = new Date().toISOString(); touch(c); } }
  function setMeta(k, v){ DB.meta[k] = v; touch('meta'); }

  function exportAll(){ return { app:'rehab-lite', schema:1, exportedAt:new Date().toISOString(), meta:DB.meta, ...Object.fromEntries(COLLECTIONS.map(c => [c, DB[c]])) }; }
  // 合併匯入：同 id 取 updatedAt 較新者
  function mergeImport(data, replace){
    if (!data || data.app !== 'rehab-lite') throw new Error('檔案格式不符（不是本系統的備份檔）');
    let added = 0, updated = 0;
    for (const c of COLLECTIONS) {
      const inc = Array.isArray(data[c]) ? data[c] : [];
      if (replace) { DB[c] = inc; added += inc.length; touch(c); continue; }
      for (const r of inc) {
        const i = DB[c].findIndex(x => x.id === r.id);
        if (i < 0) { DB[c].push(r); added++; }
        else if ((r.updatedAt||'') > (DB[c][i].updatedAt||'')) { DB[c][i] = r; updated++; }
      }
      touch(c);
    }
    if (replace || !DB.meta.center) { DB.meta = { ...DB.meta, ...(data.meta||{}) }; touch('meta'); }
    return { added, updated };
  }
  function clearAll(){ COLLECTIONS.forEach(c => { DB[c] = []; touch(c); }); DB.meta = {}; touch('meta'); }

  return { DB, load, all, get, upsert, remove, setMeta, exportAll, mergeImport, clearAll, newId, flush };
})();
