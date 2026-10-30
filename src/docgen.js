/* ================================================================
   文件產生器：同一份內容模型 → 列印/PDF（HTML）、Word（.docx）、PowerPoint（.pptx）
   doc = { title, sub, landscape, big, blocks:[
     {t:'h', text}                     段落標題
     {t:'p', text, small}              文字
     {t:'kv', rows:[[k,v],...], cols}  基本資料表（cols=每列幾組，預設2）
     {t:'table', head, rows, widths, center:[欄], rowH, fs}  表格；儲存格可為字串
     {t:'sign', items:[...]}           簽名欄
     {t:'break'}                       換頁
   ]}
   ================================================================ */
const BOX = '☐';
const FONT = 'Microsoft JhengHei';
const orgName = () => Store.DB.meta.orgName || (Store.DB.meta.orgType || '機構');
const fileSafe = s => String(s).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60);

/* ---------- HTML（列印 / 另存 PDF） ---------- */
function docToHTML(doc){
  const cell = v => esc(v ?? '').replace(/\n/g, '<br>');
  const out = [`<div class="d-head"><div class="d-org">${esc(orgName())}</div><div class="d-title">${esc(doc.title)}</div>${doc.sub ? `<div class="d-sub">${esc(doc.sub)}</div>` : ''}</div>`];
  for (const b of doc.blocks) {
    if (b.t === 'h') out.push(`<h4>${esc(b.text)}</h4>`);
    else if (b.t === 'p') out.push(`<p class="${b.small ? 'd-small' : ''}">${cell(b.text)}</p>`);
    else if (b.t === 'kv') { const n = b.cols || 2, rows = []; for (let i = 0; i < b.rows.length; i += n) rows.push(b.rows.slice(i, i + n)); out.push(`<table class="d-t kv"><tbody>${rows.map(r => `<tr>${r.map(([k, v]) => `<th>${esc(k)}</th><td>${cell(v)}</td>`).join('')}${'<th></th><td></td>'.repeat(n - r.length)}</tr>`).join('')}</tbody></table>`); }
    else if (b.t === 'table') {
      const tot = (b.widths || b.head.map(() => 1)).reduce((s, x) => s + x, 0);
      out.push(`<table class="d-t" style="${b.fs ? `font-size:${b.fs}pt` : ''}"><colgroup>${(b.widths || b.head.map(() => 1)).map(w => `<col style="width:${(w / tot * 100).toFixed(2)}%">`).join('')}</colgroup><thead><tr>${b.head.map(h => `<th>${cell(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr style="${b.rowH ? `height:${b.rowH}mm` : ''}">${r.map((v, i) => `<td class="${(b.center || []).includes(i) ? 'c' : ''}">${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    }
    else if (b.t === 'sign') out.push(`<div class="d-sign">${b.items.map(x => `<div>${esc(x)}：<span></span></div>`).join('')}</div>`);
    else if (b.t === 'break') out.push(`<div class="d-break"></div>`);
  }
  return out.join('\n');
}
function printDoc(doc){
  $('#print').innerHTML = `<style>@page{size:A4 ${doc.landscape ? 'landscape' : 'portrait'};margin:12mm 11mm}</style><div class="${doc.big ? 'd-big' : ''}">${docToHTML(doc)}</div>`;
  const old = document.title; document.title = doc.title + '_' + todayISO();
  toast('列印視窗開啟後，「目的地」選「另存為 PDF」即可存成 PDF 檔');
  setTimeout(() => { window.print(); document.title = old; }, 300);
}

/* ---------- Word（.docx，以 JSZip 自行組 OOXML） ---------- */
const xe = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function wRun(text, o = {}){
  const rpr = `<w:rPr>${o.b ? '<w:b/>' : ''}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}</w:rPr>`;
  return String(text ?? '').split('\n').map((line, i) => `${i ? `<w:r>${rpr}<w:br/></w:r>` : ''}<w:r>${rpr}<w:t xml:space="preserve">${xe(line)}</w:t></w:r>`).join('');
}
function wPara(text, o = {}){ return `<w:p><w:pPr>${o.jc ? `<w:jc w:val="${o.jc}"/>` : ''}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 80}"/>${o.keep ? '<w:keepNext/>' : ''}${o.border ? '<w:pBdr><w:left w:val="single" w:sz="24" w:space="4" w:color="6B8F71"/></w:pBdr>' : ''}</w:pPr>${wRun(text, o)}</w:p>`; }
function wTable(head, rows, widthsRel, totalW, o = {}){
  const tot = widthsRel.reduce((s, x) => s + x, 0), ws = widthsRel.map(w => Math.floor(w / tot * totalW));
  const border = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="7A6F5D"/>`).join('');
  const sz = o.fs ? o.fs * 2 : 20;
  const tc = (v, i, isHead) => `<w:tc><w:tcPr><w:tcW w:w="${ws[i]}" w:type="dxa"/>${isHead ? '<w:shd w:val="clear" w:color="auto" w:fill="EDE5D3"/>' : ''}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${isHead || (o.center || []).includes(i) ? '<w:jc w:val="center"/>' : ''}</w:pPr>${wRun(v, { b:isHead, sz })}</w:p></w:tc>`;
  const tr = (r, isHead) => `<w:tr><w:trPr><w:cantSplit/>${isHead ? '<w:tblHeader/>' : ''}${!isHead && o.rowH ? `<w:trHeight w:val="${Math.round(o.rowH * 56.7)}" w:hRule="atLeast"/>` : ''}</w:trPr>${r.map((v, i) => tc(v, i, isHead)).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${totalW}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${border}</w:tblBorders><w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${head ? tr(head, true) : ''}${rows.map(r => tr(r, false)).join('')}</w:tbl>${wPara('', { after:60 })}`;
}
function docToDocxXML(doc){
  const W = doc.landscape ? 16838 : 11906, H = doc.landscape ? 11906 : 16838, M = 680, TW = W - M * 2;
  const big = doc.big ? 1.4 : 1;
  const body = [wPara(orgName(), { jc:'center', sz:22, after:0, color:'7A6F5D' }), wPara(doc.title, { jc:'center', b:true, sz:Math.round(34 * big), after:40 }), doc.sub ? wPara(doc.sub, { jc:'center', sz:20, color:'7A6F5D', after:160 }) : ''];
  for (const b of doc.blocks) {
    if (b.t === 'h') body.push(wPara(b.text, { b:true, sz:Math.round(26 * big), before:160, after:80, keep:true, border:true }));
    else if (b.t === 'p') body.push(wPara(b.text, { sz:Math.round((b.small ? 18 : 22) * big) }));
    else if (b.t === 'kv') { const n = b.cols || 2, rows = []; for (let i = 0; i < b.rows.length; i += n) { const r = b.rows.slice(i, i + n); while (r.length < n) r.push(['', '']); rows.push(r.flat()); } body.push(wTable(null, rows, Array.from({ length:n }, () => [1, 2.2]).flat(), TW, { fs:10 })); }
    else if (b.t === 'table') body.push(wTable(b.head, b.rows, b.widths || b.head.map(() => 1), TW, { center:b.center, rowH:b.rowH, fs:(b.fs || 10) * (doc.big ? 1.3 : 1) }));
    else if (b.t === 'sign') body.push(wPara(b.items.map(x => `${x}：＿＿＿＿＿＿＿＿`).join('　　'), { before:360, sz:22 }));
    else if (b.t === 'break') body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="${W}" w:h="${H}"${doc.landscape ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${M}" w:right="${M}" w:bottom="${M}" w:left="${M}" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
async function downloadDocx(doc){
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="${FONT}" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);
  zip.file('word/document.xml', docToDocxXML(doc));
  const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  download(fileSafe(doc.title) + '_' + todayISO() + '.docx', blob); toast('已下載 Word 檔');
}

/* ---------- PowerPoint（.pptx，PptxGenJS） ---------- */
const PC = { bg:'FBF7EF', text:'3B352B', muted:'7A6F5D', pri:'6B8F71', line:'D8CDB6', head:'EDE5D3' };
function pptBase(title){
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = title; p.company = orgName();
  p.defineSlideMaster({ title:'M', background:{ color:PC.bg }, objects:[{ rect:{ x:0, y:0, w:13.33, h:0.12, fill:{ color:PC.pri } } }, { text:{ text:orgName(), options:{ x:0.4, y:7.05, w:8, h:0.3, fontSize:10, color:PC.muted, fontFace:FONT } } }], slideNumber:{ x:12.4, y:7.05, fontSize:10, color:PC.muted } });
  return p;
}
function pptTitle(p, title, sub){
  const s = p.addSlide({ masterName:'M' });
  s.addText(title, { x:0.8, y:2.3, w:11.7, h:1.4, fontSize:40, bold:true, color:PC.text, fontFace:FONT, align:'center' });
  if (sub) s.addText(sub, { x:0.8, y:3.8, w:11.7, h:0.8, fontSize:20, color:PC.muted, fontFace:FONT, align:'center' });
  s.addShape(p.ShapeType.line, { x:5.2, y:3.75, w:2.9, h:0, line:{ color:PC.pri, width:2 } });
}
async function downloadPptx(doc){
  const p = pptBase(doc.title); pptTitle(p, doc.title, doc.sub);
  let s = null, y = 0;
  const newSlide = (title) => { s = p.addSlide({ masterName:'M' }); s.addText(title, { x:0.5, y:0.3, w:12.3, h:0.7, fontSize:26, bold:true, color:PC.text, fontFace:FONT }); y = 1.15; };
  let curH = doc.title;
  const tblOpts = (rowsN, fs) => ({ x:0.5, y, w:12.3, fontSize:fs, fontFace:FONT, color:PC.text, border:{ type:'solid', pt:0.75, color:PC.line }, valign:'middle', autoPage:true, autoPageRepeatHeader:true, autoPageHeaderRows:1, autoPageSlideStartY:1.15, newSlideStartY:1.15 });
  for (const b of doc.blocks) {
    if (b.t === 'h') { curH = b.text; newSlide(b.text); }
    else if (b.t === 'break' || b.t === 'sign') continue;
    else {
      if (!s) newSlide(curH);
      if (b.t === 'p') { const h = Math.min(5, 0.4 + String(b.text).length / 60 * 0.35); if (y + h > 6.9) newSlide(curH + '（續）'); s.addText(b.text, { x:0.5, y, w:12.3, h, fontSize:16, color:PC.text, fontFace:FONT, valign:'top' }); y += h + 0.1; }
      else if (b.t === 'kv') { const rows = []; for (let i = 0; i < b.rows.length; i += 2) { const r = b.rows.slice(i, i + 2); while (r.length < 2) r.push(['', '']); rows.push(r.flatMap(([k, v]) => [{ text:k, options:{ bold:true, fill:{ color:PC.head } } }, { text:String(v ?? '') }])); } if (y + rows.length * 0.4 > 6.9) newSlide(curH + '（續）'); s.addTable(rows, { ...tblOpts(rows.length, 13), colW:[1.8, 4.35, 1.8, 4.35] }); y += rows.length * 0.42 + 0.2; }
      else if (b.t === 'table') {
        const ws = b.widths || b.head.map(() => 1), tot = ws.reduce((a, x) => a + x, 0);
        const rows = [b.head.map(h => ({ text:String(h), options:{ bold:true, fill:{ color:PC.head }, align:'center' } })), ...b.rows.map(r => r.map((v, i) => ({ text:String(v ?? ''), options:{ align:(b.center || []).includes(i) ? 'center' : 'left' } })))];
        if (y > 5.5) newSlide(curH + '（續）');
        s.addTable(rows, { ...tblOpts(rows.length, b.head.length > 10 ? 9 : 12), colW:ws.map(w => w / tot * 12.3) });
        s = null; // 表格可能自動分頁，之後的內容另起一頁
      }
    }
  }
  await p.writeFile({ fileName:fileSafe(doc.title) + '_' + todayISO() + '.pptx', compression:true }); toast('已下載 PowerPoint 檔');
}

/* ---------- 輸出按鈕列 ---------- */
const DOCS = {}; // key → () => doc
function exportBar(key, fn, kinds = ['pdf', 'word', 'ppt']){
  DOCS[key] = fn;
  const L = { pdf:['列印／PDF', 'print'], word:['Word', 'download'], ppt:['PPT', 'download'] };
  return `<span class="exp">${kinds.map(k => btn(L[k][0], `runExport('${key}','${k}')`, { k:'sm', i:L[k][1] })).join('')}</span>`;
}
async function runExport(key, kind){
  try { const doc = DOCS[key](); if (!doc) return; if (kind === 'pdf') printDoc(doc); else if (kind === 'word') await downloadDocx(doc); else await downloadPptx(doc); }
  catch(e){ console.error(e); toast('產生檔案失敗：' + e.message, 'err'); }
}
