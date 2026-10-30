/* ================================================================
   復能項目庫（圖卡瀏覽、自訂項目）
   ================================================================ */
let libF = { q:'', type:'', cat:'' };
function pageLibrary(){
  setTitle('復能項目庫', `${LIBRARY.length} 項內建＋${Store.all('library').length} 項自訂`);
  const list = allItems().filter(e => (!libF.type || e.type === libF.type) && (!libF.cat || e.cat === libF.cat) && (!libF.q || (e.name + e.how + (e.tags || []).join('')).includes(libF.q)));
  return `<div class="toolbar"><input class="inp" placeholder="搜尋項目" value="${esc(libF.q)}" onchange="libF.q=this.value;route()" aria-label="搜尋">
    <div class="pills">${['', '運動', '日常生活訓練', '其他'].map(t => `<label class="pill"><input type="radio" name="lt" ${libF.type === t ? 'checked' : ''} onchange="libF.type='${t}';libF.cat='';route()"><span>${t || '全部'}</span></label>`).join('')}</div>
    <span class="sp"></span>${btn('新增自訂項目', 'editLib()', { k:'primary', i:'plus' })}</div>
  <div class="pills cats">${['', ...ITEM_CATS].filter(c => !c || allItems().some(e => e.cat === c && (!libF.type || e.type === libF.type))).map(c => `<label class="pill sm"><input type="radio" name="lc" ${libF.cat === c ? 'checked' : ''} onchange="libF.cat='${c}';route()"><span>${c || '全部分類'}</span></label>`).join('')}</div>
  <p class="hint">圖片與內容取自「<a href="https://mattsue1003.github.io/reablepre/" target="_blank" rel="noopener">復健復能處方箋開立系統</a>」。點圖卡看詳細說明。</p>
  <div class="pgrid lib">${list.map(e => `<button type="button" class="pcard" onclick="showItem('${e.id}')">${e.img ? `<img src="${esc(e.img)}" alt="" loading="lazy">` : `<span class="noimg-l">${esc(e.cat)}</span>`}<b>${esc(e.name)}</b><small>${esc(e.type)}・${esc(e.cat)}</small></button>`).join('') || empty('找不到符合的項目')}</div>`;
}
function showItem(id){
  const e = findItem(id); if (!e) return;
  openModal(e.name, `${e.img ? `<img class="big-img" src="${esc(e.img)}" alt="">` : ''}<p>${badge(e.type, 'green')} ${badge(e.cat)} ${(e.tags || []).map(t => badge(t)).join(' ')}</p>
    <dl class="info one"><div><dt>建議劑量</dt><dd>${esc(e.dose)}</dd></div><div><dt>說明</dt><dd>${esc(e.how)}</dd></div>${e.steps ? `<div><dt>步驟</dt><dd>${esc(e.steps)}</dd></div>` : ''}${e.caution ? `<div><dt>注意事項</dt><dd class="warn-t">${esc(e.caution)}</dd></div>` : ''}</dl>`,
    { wide:true, extra:id.startsWith('lib_') ? btn('編輯', `closeModal(true);editLib('${id}')`, { k:'sm' }) : '' });
}
function editLib(id){
  S.edit = id ? clone(Store.get('library', id)) : { id:'', cat:'肌力訓練', type:'運動', name:'', dose:'', how:'', steps:'', caution:'', img:'', tags:[] };
  openModal(id ? '編輯自訂項目' : '新增自訂項目', `<div class="form-grid">${F.field('名稱', F.input('name'), { req:true })}${F.field('介入類型', F.select('type', ['運動', '日常生活訓練', '其他'], { blank:false }))}${F.field('分類', F.select('cat', ITEM_CATS, { blank:false }))}${F.field('建議劑量', F.input('dose'))}${F.field('說明', F.text('how'), { cls:'span2' })}${F.field('步驟', F.text('steps', { rows:2 }), { cls:'span2' })}${F.field('注意事項', F.text('caution', { rows:2 }), { cls:'span2' })}</div>`,
    { wide:true, extra:id ? btn('刪除', `Store.remove('library','${id}');closeModal(true);route()`, { k:'danger ghost' }) : '', onSave:() => { if (!S.edit.name?.trim()) { toast('請填寫名稱', 'err'); return false; } if (!S.edit.id) S.edit.id = 'lib_' + Store.newId(); Store.upsert('library', S.edit); S.dirty = false; route(); }, restore:() => { S.dirty = false; } });
}
