/* ================================================================
   文件產生器：同一份內容模型 → 列印/PDF（HTML）、Word（.docx）、PowerPoint（.pptx）
   doc = { title, sub, landscape, big, blocks:[
     {t:'h', text}                     段落標題
     {t:'p', text, small}              文字
     {t:'kv', rows:[[k,v],...], cols}  基本資料表
     {t:'table', head, rows, widths, center:[欄], rowH, fs}  表格；儲存格可為字串或 {img:網址}
     {t:'items', items:[{img,name,type,dose,freq,executor,how,steps,caution}]}  介入項目卡（含圖片）
     {t:'sign', items:[...]}           簽名欄
   ]}
   ================================================================ */
const BOX = '☐';
const FONT = 'Microsoft JhengHei';
const orgName = () => Store.DB.meta.orgName || (Store.DB.meta.orgType || '機構');
const fileSafe = s => String(s).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60);
const isImg = v => v && typeof v === 'object' && 'img' in v;

/* ---------- 圖片預載（Word／PPT 需要內嵌圖檔） ---------- */
const IMG = new Map(); // url → {b64, bytes, ratio}
function docImages(doc){
  const set = new Set();
  for (const b of doc.blocks) {
    if (b.t === 'items') b.items.forEach(x => x.img && set.add(x.img));
    if (b.t === 'table') b.rows.forEach(r => r.forEach(v => isImg(v) && v.img && set.add(v.img)));
  }
  return [...set];
}
async function loadImages(urls){
  await Promise.all(urls.filter(u => !IMG.has(u)).map(async u => {
    try {
      const r = await fetch(u); if (!r.ok) throw 0;
      const blob = await r.blob(), bytes = new Uint8Array(await blob.arrayBuffer());
      let ratio = 506 / 900; try { const bm = await createImageBitmap(blob); ratio = bm.height / bm.width; } catch(e){}
      let bin = ''; for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
      IMG.set(u, { b64:btoa(bin), bytes, ratio });
    } catch(e){ IMG.set(u, null); }
  }));
}

/* ---------- HTML（列印 / 另存 PDF） ---------- */
function docToHTML(doc){
  const cell = v => isImg(v) ? (v.img ? `<img class="d-cimg" src="${esc(v.img)}" alt="">` : '') : esc(v ?? '').replace(/\n/g, '<br>');
  const out = [`<div class="d-head"><div class="d-org">${esc(orgName())}</div><div class="d-title">${esc(doc.title)}</div>${doc.sub ? `<div class="d-sub">${esc(doc.sub)}</div>` : ''}</div>`];
  for (const b of doc.blocks) {
    if (b.t === 'h') out.push(`<h4>${esc(b.text)}</h4>`);
    else if (b.t === 'p') out.push(`<p class="${b.small ? 'd-small' : ''}">${cell(b.text)}</p>`);
    else if (b.t === 'kv') { const n = b.cols || 2, rows = []; for (let i = 0; i < b.rows.length; i += n) rows.push(b.rows.slice(i, i + n)); out.push(`<table class="d-t kv"><tbody>${rows.map(r => `<tr>${r.map(([k, v]) => `<th>${esc(k)}</th><td>${cell(v)}</td>`).join('')}${'<th></th><td></td>'.repeat(n - r.length)}</tr>`).join('')}</tbody></table>`); }
    else if (b.t === 'table') {
      const ws = b.widths || b.head.map(() => 1), tot = ws.reduce((s, x) => s + x, 0);
      out.push(`<table class="d-t" style="${b.fs ? `font-size:${b.fs}pt` : ''}"><colgroup>${ws.map(w => `<col style="width:${(w / tot * 100).toFixed(2)}%">`).join('')}</colgroup><thead><tr>${b.head.map(h => `<th>${cell(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr style="${b.rowH ? `height:${b.rowH}mm` : ''}">${r.map((v, i) => `<td class="${(b.center || []).includes(i) ? 'c' : ''}">${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    }
    else if (b.t === 'items') out.push(`<div class="d-items">${b.items.map((x, i) => `<div class="d-item">${x.img ? `<img src="${esc(x.img)}" alt="">` : ''}<div class="d-it"><b>${i + 1}. ${esc(x.name)}</b> <span class="d-tag">${esc(x.type || '')}</span>
      <div class="d-meta">劑量：${esc(x.dose || '')}｜${esc(x.freq || '')}｜${esc(x.executor || '')}</div>${x.how ? `<div>${esc(x.how)}</div>` : ''}${x.steps ? `<div><b>步驟：</b>${esc(x.steps)}</div>` : ''}${x.caution ? `<div class="d-warn">注意：${esc(x.caution)}</div>` : ''}</div></div>`).join('')}</div>`);
    else if (b.t === 'sign') out.push(`<div class="d-sign">${b.items.map(x => `<div>${esc(x)}：<span></span></div>`).join('')}</div>`);
  }
  return out.join('\n');
}
async function printDoc(doc){
  $('#print').innerHTML = `<style>@page{size:A4 ${doc.landscape ? 'landscape' : 'portrait'};margin:12mm 11mm}</style><div class="${doc.big ? 'd-big' : ''}">${docToHTML(doc)}</div>`;
  await Promise.all([...document.querySelectorAll('#print img')].map(im => im.decode().catch(() => {})));
  const old = document.title; document.title = doc.title + '_' + todayISO();
  toast('列印視窗開啟後，「目的地」選「另存為 PDF」即可存成 PDF 檔');
  setTimeout(() => { window.print(); document.title = old; }, 200);
}

/* ---------- Word（.docx，以 JSZip 自行組 OOXML） ---------- */
const xe = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function wRun(text, o = {}){
  const rpr = `<w:rPr>${o.b ? '<w:b/>' : ''}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}</w:rPr>`;
  return String(text ?? '').split('\n').map((line, i) => `${i ? `<w:r>${rpr}<w:br/></w:r>` : ''}<w:r>${rpr}<w:t xml:space="preserve">${xe(line)}</w:t></w:r>`).join('');
}
function wPara(text, o = {}){ return `<w:p><w:pPr>${o.jc ? `<w:jc w:val="${o.jc}"/>` : ''}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 80}"/>${o.keep ? '<w:keepNext/>' : ''}${o.border ? '<w:pBdr><w:left w:val="single" w:sz="24" w:space="4" w:color="6B8F71"/></w:pBdr>' : ''}</w:pPr>${o.raw || wRun(text, o)}</w:p>`; }
function wImage(ctx, url, widthIn){
  const im = IMG.get(url); if (!im) return '';
  let rid = ctx.rids.get(url);
  if (!rid) { rid = 'rIdImg' + (ctx.rids.size + 1); ctx.rids.set(url, rid); ctx.media.push({ rid, name:`img${ctx.rids.size}.jpeg`, bytes:im.bytes }); }
  const id = ++ctx.pic, cx = Math.round(widthIn * 914400), cy = Math.round(widthIn * im.ratio * 914400);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="圖${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="img${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}
function wTable(ctx, head, rows, widthsRel, totalW, o = {}){
  const tot = widthsRel.reduce((s, x) => s + x, 0), ws = widthsRel.map(w => Math.floor(w / tot * totalW));
  const border = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="7A6F5D"/>`).join('');
  const sz = o.fs ? Math.round(o.fs * 2) : 20;
  const content = (v, i, isHead) => isImg(v) ? (v.img ? wImage(ctx, v.img, ws[i] / 1440 - 0.15) : '') : wRun(v, { b:isHead, sz });
  const tc = (v, i, isHead) => `<w:tc><w:tcPr><w:tcW w:w="${ws[i]}" w:type="dxa"/>${isHead ? '<w:shd w:val="clear" w:color="auto" w:fill="EDE5D3"/>' : ''}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${isHead || (o.center || []).includes(i) || isImg(v) ? '<w:jc w:val="center"/>' : ''}</w:pPr>${content(v, i, isHead)}</w:p></w:tc>`;
  const tr = (r, isHead) => `<w:tr><w:trPr><w:cantSplit/>${isHead ? '<w:tblHeader/>' : ''}${!isHead && o.rowH ? `<w:trHeight w:val="${Math.round(o.rowH * 56.7)}" w:hRule="atLeast"/>` : ''}</w:trPr>${r.map((v, i) => tc(v, i, isHead)).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${totalW}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${border}</w:tblBorders><w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${head ? tr(head, true) : ''}${rows.map(r => tr(r, false)).join('')}</w:tbl>${wPara('', { after:60 })}`;
}
function wItems(ctx, items, totalW, big){
  const iw = Math.round(totalW * 0.34), tw = totalW - iw, sz = big ? 26 : 20;
  const border = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="D8CDB6"/>`).join('');
  const rows = items.map((x, i) => {
    const txt = [wPara('', { raw:wRun(`${i + 1}. ${x.name}`, { b:true, sz:sz + 4 }) + wRun(`　${x.type || ''}`, { sz:sz - 2, color:'6B8F71' }), after:40 }),
      wPara(`劑量：${x.dose || ''}｜${x.freq || ''}｜${x.executor || ''}`, { sz, color:'4F7356', after:40 }),
      x.how ? wPara(x.how, { sz, after:40 }) : '', x.steps ? wPara('步驟：' + x.steps, { sz, after:40 }) : '', x.caution ? wPara('注意：' + x.caution, { sz, color:'B4533F', after:0 }) : ''].join('');
    const img = x.img ? wImage(ctx, x.img, iw / 1440 - 0.15) : '';
    return `<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${iw}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="40"/></w:pPr>${img}</w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="${tw}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${txt}</w:tc></w:tr>`;
  }).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${totalW}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${border}</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${iw}"/><w:gridCol w:w="${tw}"/></w:tblGrid>${rows}</w:tbl>${wPara('', { after:60 })}`;
}
function docToDocxXML(doc, ctx){
  const W = doc.landscape ? 16838 : 11906, H = doc.landscape ? 11906 : 16838, M = 680, TW = W - M * 2, big = doc.big ? 1.4 : 1;
  const body = [wPara(orgName(), { jc:'center', sz:22, after:0, color:'7A6F5D' }), wPara(doc.title, { jc:'center', b:true, sz:Math.round(34 * big), after:40 }), doc.sub ? wPara(doc.sub, { jc:'center', sz:20, color:'7A6F5D', after:160 }) : ''];
  for (const b of doc.blocks) {
    if (b.t === 'h') body.push(wPara(b.text, { b:true, sz:Math.round(26 * big), before:160, after:80, keep:true, border:true }));
    else if (b.t === 'p') body.push(wPara(b.text, { sz:Math.round((b.small ? 18 : 22) * big) }));
    else if (b.t === 'kv') { const n = b.cols || 2, rows = []; for (let i = 0; i < b.rows.length; i += n) { const r = b.rows.slice(i, i + n); while (r.length < n) r.push(['', '']); rows.push(r.flat()); } body.push(wTable(ctx, null, rows, Array.from({ length:n }, () => [1, 2.2]).flat(), TW, { fs:10 })); }
    else if (b.t === 'table') body.push(wTable(ctx, b.head, b.rows, b.widths || b.head.map(() => 1), TW, { center:b.center, rowH:b.rowH, fs:(b.fs || 10) * (doc.big ? 1.3 : 1) }));
    else if (b.t === 'items') body.push(wItems(ctx, b.items, TW, doc.big));
    else if (b.t === 'sign') body.push(wPara(b.items.map(x => `${x}：＿＿＿＿＿＿＿＿`).join('　　'), { before:360, sz:22 }));
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="${W}" w:h="${H}"${doc.landscape ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${M}" w:right="${M}" w:bottom="${M}" w:left="${M}" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
async function downloadDocx(doc){
  await loadImages(docImages(doc));
  const ctx = { rids:new Map(), media:[], pic:0 }, xml = docToDocxXML(doc, ctx);
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${ctx.media.map(m => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}</Relationships>`);
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="${FONT}" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);
  ctx.media.forEach(m => zip.file('word/media/' + m.name, m.bytes));
  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  await download(fileSafe(doc.title) + '_' + todayISO() + '.docx', blob); toast('已產生 Word 檔');
}

/* ---------- PowerPoint（.pptx）：A4 版面的表單，不是簡報 ----------
   每張投影片就是一頁 A4（直式或橫式），內容與 Word／PDF 相同，依高度自動換頁 */
const PC = { text:'3B352B', muted:'7A6F5D', pri:'6B8F71', line:'7A6F5D', head:'EDE5D3', warn:'B4533F' };
const PX = 72;  // 1 英吋 = 72 pt
function textLines(text, wIn, fs){
  const per = Math.max(1, (wIn * PX) / fs - 0.6);
  return String(text ?? '').split('\n').reduce((n, line) => { let u = 0; for (const ch of line) u += /[\x00-\xff]/.test(ch) ? 0.55 : 1; return n + Math.max(1, Math.ceil(u / per)); }, 0);
}
async function downloadPptx(doc){
  await loadImages(docImages(doc));
  const P = doc.landscape ? { w:11.69, h:8.27 } : { w:8.27, h:11.69 }, M = 0.45, CW = P.w - M * 2, BOT = P.h - 0.5, k = doc.big ? 1.3 : 1;
  const pp = new PptxGenJS(); pp.defineLayout({ name:'A4', width:P.w, height:P.h }); pp.layout = 'A4'; pp.title = doc.title; pp.company = orgName();
  let s, y, page = 0;
  const T = (txt, o) => s.addText(String(txt ?? ''), { fontFace:FONT, color:PC.text, margin:0, valign:'top', fit:'none', ...o });
  const newPage = () => {
    s = pp.addSlide(); page++; s.background = { color:'FFFFFF' };
    if (page === 1) {
      T(orgName(), { x:M, y:M, w:CW, h:0.25, fontSize:10, color:PC.muted, align:'center' });
      T(doc.title, { x:M, y:M + 0.25, w:CW, h:0.42, fontSize:Math.round(18 * k), bold:true, align:'center' });
      let yy = M + 0.7; if (doc.sub) { T(doc.sub, { x:M, y:yy, w:CW, h:0.25, fontSize:9.5, color:PC.muted, align:'center' }); yy += 0.28; }
      s.addShape(pp.ShapeType.line, { x:M, y:yy + 0.04, w:CW, h:0, line:{ color:PC.text, width:1.2 } }); y = yy + 0.16;
    } else { T(`${doc.title}（續）`, { x:M, y:M - 0.15, w:CW, h:0.22, fontSize:8.5, color:PC.muted }); y = M + 0.15; }
    T(String(page), { x:P.w - M - 0.5, y:P.h - 0.35, w:0.5, h:0.2, fontSize:8, color:PC.muted, align:'right' });
  };
  const need = h => { if (y + h > BOT) newPage(); };
  // 表格：自行繪製每一格，跨頁時重複表頭
  const drawTable = (head, rows, rel, o = {}) => {
    const tot = rel.reduce((a, x) => a + x, 0), ws = rel.map(w => w / tot * CW), fs = (o.fs || 10) * k, lh = fs * 1.36 / PX, pad = 0.05;
    const cellH = (v, i) => isImg(v) ? (IMG.get(v.img) ? (ws[i] - 0.1) * IMG.get(v.img).ratio + 0.08 : 0.3) : textLines(v, ws[i] - pad * 2, fs) * lh + 0.16;
    const rowH = r => Math.max(o.rowH ? o.rowH / 25.4 : 0, ...r.map(cellH), lh + 0.1);
    const drawRow = (r, isHead) => {
      const h = rowH(r); let x = M;
      r.forEach((v, i) => {
        const opt = { x, y, w:ws[i], h, fontSize:fs, bold:isHead || (o.kv && i % 2 === 0), align:isHead || (o.center || []).includes(i) || isImg(v) ? 'center' : 'left', valign:'middle', margin:[pad * PX, pad * PX, pad * PX, pad * PX], line:{ color:PC.line, width:0.5 }, fill:{ color:isHead || (o.kv && i % 2 === 0) ? PC.head : 'FFFFFF' } };
        if (isImg(v)) { s.addText('', opt); const im = IMG.get(v.img); if (im) { const iw = ws[i] - 0.1, ih = iw * im.ratio; s.addImage({ data:'image/jpeg;base64,' + im.b64, x:x + 0.05, y:y + (h - ih) / 2, w:iw, h:ih }); } }
        else T(v, opt);
        x += ws[i];
      });
      y += h;
    };
    if (head) { need(rowH(head) + rowH(rows[0] || head)); drawRow(head, true); }
    for (const r of rows) { if (y + rowH(r) > BOT) { newPage(); if (head) drawRow(head, true); } drawRow(r, false); }
    y += 0.12;
  };
  newPage();
  for (const b of doc.blocks) {
    if (b.t === 'h') { need(0.75); s.addShape(pp.ShapeType.rect, { x:M, y:y + 0.04, w:0.05, h:0.24, fill:{ color:PC.pri }, line:{ color:PC.pri, width:0 } }); T(b.text, { x:M + 0.12, y, w:CW - 0.12, h:0.32, fontSize:Math.round(13 * k), bold:true, valign:'middle' }); y += 0.4; }
    else if (b.t === 'p') { const fs = (b.small ? 9 : 10.5) * k, lh = fs * 1.3 / PX; let lines = String(b.text).split('\n');
      while (lines.length) { const room = Math.max(1, Math.floor((BOT - y) / lh)); let take = [], used = 0;
        while (lines.length && used + textLines(lines[0], CW, fs) <= room) { used += textLines(lines[0], CW, fs); take.push(lines.shift()); }
        if (!take.length) { if (y > M + 1) { newPage(); continue; } take.push(lines.shift()); used = textLines(take[0], CW, fs); }
        T(take.join('\n'), { x:M, y, w:CW, h:used * lh + 0.05, fontSize:fs, lineSpacingMultiple:1.05 }); y += used * lh + 0.1; if (lines.length) newPage(); } }
    else if (b.t === 'kv') { const n = b.cols || 2, rows = []; for (let i = 0; i < b.rows.length; i += n) { const r = b.rows.slice(i, i + n); while (r.length < n) r.push(['', '']); rows.push(r.flat()); } drawTable(null, rows, Array.from({ length:n }, () => [1, 2.2]).flat(), { kv:true, fs:9.5 }); }
    else if (b.t === 'table') drawTable(b.head, b.rows, b.widths || b.head.map(() => 1), { center:b.center, rowH:b.rowH, fs:b.fs || 10 });
    else if (b.t === 'items') for (const [i, x] of b.items.entries()) {
      const im = x.img && IMG.get(x.img), iw = doc.landscape ? 2.6 : 2.2, ih = im ? iw * im.ratio : 0, tw = CW - (im ? iw + 0.15 : 0), fs = 9.5 * k, lh = fs * 1.3 / PX;
      const body = [x.how, x.steps ? '步驟：' + x.steps : ''].filter(Boolean).join('\n');
      const th = 0.3 + 0.25 + textLines(body, tw, fs) * lh + (x.caution ? textLines('注意：' + x.caution, tw, fs) * lh + 0.05 : 0);
      const h = Math.max(ih, th) + 0.16; need(h);
      s.addShape(pp.ShapeType.rect, { x:M, y, w:CW, h, fill:{ color:'FFFFFF' }, line:{ color:'D8CDB6', width:0.75 } });
      if (im) s.addImage({ data:'image/jpeg;base64,' + im.b64, x:M + 0.08, y:y + 0.08, w:iw, h:ih });
      const tx = M + (im ? iw + 0.2 : 0.1); let ty = y + 0.08;
      s.addText([{ text:`${i + 1}. ${x.name}`, options:{ bold:true, fontSize:12 * k } }, { text:`　${x.type || ''}`, options:{ fontSize:9 * k, color:PC.pri } }], { x:tx, y:ty, w:tw - 0.1, h:0.3, fontFace:FONT, color:PC.text, margin:0, valign:'top' }); ty += 0.3;
      T(`劑量：${x.dose || ''}｜${x.freq || ''}｜${x.executor || ''}`, { x:tx, y:ty, w:tw - 0.1, h:0.25, fontSize:fs, color:'4F7356' }); ty += 0.25;
      if (body) { const bh = textLines(body, tw, fs) * lh; T(body, { x:tx, y:ty, w:tw - 0.1, h:bh, fontSize:fs }); ty += bh; }
      if (x.caution) T('注意：' + x.caution, { x:tx, y:ty + 0.03, w:tw - 0.1, h:textLines('注意：' + x.caution, tw, fs) * lh, fontSize:fs, color:PC.warn });
      y += h + 0.08;
    }
    else if (b.t === 'sign') { need(0.7); y += 0.3; T(b.items.map(x => `${x}：＿＿＿＿＿＿＿＿`).join('　　'), { x:M, y, w:CW, h:0.3, fontSize:11 }); y += 0.4; }
  }
  const blob = await pp.write({ outputType:'blob', compression:true });
  await download(fileSafe(doc.title) + '_' + todayISO() + '.pptx', blob); toast('已產生 PowerPoint 檔（A4 版面）');
}

/* ---------- 輸出按鈕列 ---------- */
const DOCS = {};
function exportBar(key, fn, kinds = ['pdf', 'word', 'ppt']){
  DOCS[key] = fn;
  const L = { pdf:['列印／PDF', 'print'], word:['Word', 'download'], ppt:['PPT', 'download'] };
  return `<span class="exp">${kinds.map(k => btn(L[k][0], `runExport('${key}','${k}')`, { k:'sm', i:L[k][1] })).join('')}</span>`;
}
/* 簽名欄選項：專業人員／個案家屬簽名可分別開關（同意書固定保留） */
const isClientSign = x => /家屬|個案|住民|本人|代理人/.test(x);
function applySignPrefs(doc){
  if (doc.keepSign) return doc;
  const pro = Store.DB.meta.signPro !== false, cli = Store.DB.meta.signClient !== false;
  return { ...doc, blocks:doc.blocks.map(b => b.t !== 'sign' ? b : { ...b, items:b.items.filter(x => isClientSign(x) ? cli : pro) }).filter(b => b.t !== 'sign' || b.items.length) };
}
function signPrefHTML(){
  const m = Store.DB.meta;
  return `<span class="sign-pref">表單簽名欄：${F_toggle('signPro', '專業人員', m.signPro !== false)}${F_toggle('signClient', term() + '／家屬', m.signClient !== false)}</span>`;
}
const F_toggle = (k, label, on) => `<label class="chk"><input type="checkbox" ${on ? 'checked' : ''} onchange="Store.setMeta('${k}',this.checked);toast('簽名欄設定已更新')"><span>${label}</span></label>`;
async function runExport(key, kind){
  try { if (kind !== 'pdf') await Folder.ensure(); let doc = DOCS[key](); if (!doc) return; doc = applySignPrefs(doc); toast('檔案產生中…'); if (kind === 'pdf') await printDoc(doc); else if (kind === 'word') await downloadDocx(doc); else await downloadPptx(doc); }
  catch(e){ console.error(e); toast('產生檔案失敗：' + e.message, 'err'); }
}
