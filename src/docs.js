/* ================================================================
   文件內容：評估表、個別計畫書、個別檢核表、團體計畫書、團體檢核表、團體帶領簡報
   ================================================================ */
const isRes = () => Store.DB.meta.orgType === '住宿機構';
const term = () => isRes() ? '住民' : '個案';
const SYM = { ok:'✓', part:'△', skip:'✕' };
const SYM_LABEL = '✓ 完成　△ 部分完成　✕ 未執行（請於備註寫原因）';
const daysText = ds => (ds || []).length === 7 ? '每天' : '週' + (ds || []).map(w => WEEKDAYS[w]).join('、');
const freqText = it => daysText(it.days) + (it.times > 1 ? `，每日 ${it.times} 次` : '');
const weekStart = iso => addDays(iso, 1 - weekday(iso));
const monthDays = ym => { const out = []; for (let d = ym + '-01'; d.startsWith(ym); d = addDays(d, 1)) out.push(d); return out; };
const blankLines = n => Array.from({ length:n }, () => '＿'.repeat(46)).join('\n');

function clientKV(c, extra = []){
  return { t:'kv', rows:[['姓名', c.name], ['性別／年齡', `${c.gender || ''} ${ageAt(c.birth) ?? ''}${ageAt(c.birth) != null ? '歲' : ''}`], ...(isRes() ? [['房號／床號', c.bed || '']] : []), ['診斷', c.diagnosis || ''], ['輔具', c.aids || ''], ...extra] };
}

/* ---------- 評估表（a 為 null → 空白評估表） ---------- */
function assessDoc(a, c){
  const f = !!a, sel = (cur, v) => f && cur !== '' && cur != null && String(cur) === String(v) ? '☑' : BOX;
  const b = f ? scoreBarthel(a) : null, i = f ? scoreIADL(a) : null, s = f ? scoreSPMSQ(a) : null, p = a?.phy || {};
  const ag = c ? ageAt(c.birth, a?.date) : null;
  const blocks = [c ? clientKV(c, [['評估日期', f ? rocDate(a.date) : ''], ['評估類別', f ? a.type : '☐初評　☐再評'], ['評估者', f ? `${a.assessor || ''}${a.role ? '（' + a.role + '）' : ''}` : '']]) : { t:'kv', rows:[['姓名', ''], ['性別／年齡', ''], ...(isRes() ? [['房號／床號', '']] : []), ['評估日期', ''], ['評估類別', '☐初評　☐再評'], ['評估者', '']] }];
  blocks.push({ t:'h', text:'一、日常生活功能（巴氏量表）' + (b ? `　總分 ${b.total} 分（${b.level}）` : '　總分＿＿＿分') });
  blocks.push({ t:'table', head:['項目', '評分（請勾選）', '得分'], widths:[1.4, 7, 0.9], center:[2], fs:9, rows:BARTHEL.map(it => [it.n, it.opts.map(([v, d]) => `${sel(a?.adl?.[it.k], v)} ${v}分　${d}`).join('\n'), f ? (a.adl?.[it.k] ?? '') : '']) });
  blocks.push({ t:'h', text:'二、體能與跌倒風險' });
  blocks.push({ t:'table', head:['項目', '結果', '參考（需注意）'], widths:[2.2, 2, 3.6], center:[1], rowH:f ? 0 : 9, rows:[
    ['起身行走 TUG', f && p.tug ? p.tug + ' 秒' : '＿＿＿ 秒', '≥ 13.5 秒：跌倒高風險'],
    ['30 秒坐站', f && p.cs30 !== '' && p.cs30 != null ? p.cs30 + ' 次' : '＿＿＿ 次', ag ? `低於 ${cs30Cut(ag, c.gender)} 次：低於同齡平均` : '依年齡性別常模'],
    ['握力（慣用手）', f && p.grip ? p.grip + ' 公斤' : '＿＿＿ 公斤', '男 < 28、女 < 18 公斤（AWGS）'],
    ['單腳站立', f && p.oneLeg ? p.oneLeg + ' 秒' : '＿＿＿ 秒', '< 5 秒：跌倒風險'],
    ['4 公尺步行', f && p.gait4 ? `${p.gait4} 秒（${gaitSpeed(a)} 公尺/秒）` : '＿＿＿ 秒', '步速 < 1.0 公尺/秒'],
    ['使用輔具／無法施測說明', f ? (p.tugAid || p.note || '') : '', ''],
  ] });
  if (!f || i) {
    blocks.push({ t:'h', text:'三、工具性日常生活（IADL）' + (i ? `　${i.total}/8 分` : '　＿＿/8 分') });
    blocks.push({ t:'table', head:['項目', '能力（請勾選）'], widths:[1.4, 8.3], fs:9, rows:IADL.map(it => [it.n, it.opts.map(([d], ix) => `${sel(a?.iadl?.[it.k], ix)} ${d}`).join('\n')]) });
  }
  if (!f || s) {
    blocks.push({ t:'h', text:'四、認知（簡易心智狀態問卷 SPMSQ）' + (s && !s.partial ? `　錯 ${s.errors} 題（${spmsqLevel(s.adj)}）` : '　錯＿＿題') });
    blocks.push({ t:'table', head:['題目', '正確', '錯誤'], widths:[7, 1, 1], center:[1, 2], fs:9, rows:SPMSQ.map((q, ix) => [`${ix + 1}. ${q}`, sel(a?.spmsq?.items?.[ix], 'c'), sel(a?.spmsq?.items?.[ix], 'x')]) });
  }
  blocks.push({ t:'h', text:'五、疼痛與現況' });
  blocks.push({ t:'kv', cols:1, rows:[['疼痛（0–10）', f ? `${a.pain?.nrs ?? ''}　${a.pain?.site || ''}` : '0　1　2　3　4　5　6　7　8　9　10　部位：'], ['身體與生活現況', f ? (a.physio || '') : '\n\n'], ['優勢與興趣', f ? (a.strength || '') : '\n'], [`${term()}／家屬期待`, f ? (a.expect || '') : '\n']] });
  blocks.push({ t:'h', text:'六、評估結果：需復能的問題' });
  blocks.push(f && (a.problems || []).length ? { t:'p', text:a.problems.map((x, ix) => `${ix + 1}. ${x.text}${x.referral ? `（建議轉介：${x.referral}）` : ''}`).join('\n') } : { t:'p', text:blankLines(4) });
  if (f && a.summary) blocks.push({ t:'p', text:'摘要：' + a.summary });
  blocks.push({ t:'sign', items:['評估者', '督導'] });
  return { title:(f ? '' : '空白') + '復能評估表', sub:c ? `${c.name}${f ? '｜' + rocDate(a.date) : ''}` : '', blocks };
}

/* ---------- 個別復能計畫書 ---------- */
function planDoc(pl){
  const c = Store.get('clients', pl.clientId), a = pl.assessmentId ? Store.get('assessments', pl.assessmentId) : null;
  const blocks = [clientKV(c, [['計畫期間', `${rocDate(pl.startDate)} ～ ${rocDate(pl.endDate)}`], ['擬定者', `${pl.author || ''}${pl.role ? '（' + pl.role + '）' : ''}`], ['版本', 'v' + (pl.version || 1)]])];
  if (a) blocks.push({ t:'h', text:'評估依據' }, { t:'p', text:`${rocDate(a.date)} ${a.type}：巴氏 ${scoreBarthel(a)?.total ?? '—'} 分、TUG ${a.phy?.tug || '—'} 秒、30秒坐站 ${a.phy?.cs30 ?? '—'} 次、握力 ${a.phy?.grip || '—'} 公斤` });
  if ((pl.problems || []).filter(Boolean).length) blocks.push({ t:'h', text:'需復能的問題' }, { t:'p', text:pl.problems.filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join('\n') });
  blocks.push({ t:'h', text:'復能目標' }, { t:'table', head:['#', '目標（具體、可量測）', '評量方式', '目前', '目標值'], widths:[0.4, 5, 1.8, 1.2, 1.2], center:[0, 3, 4], rows:(pl.goals || []).map((g, i) => [i + 1, g.text, g.measure || '', g.baseline || '', g.target || '']) });
  blocks.push({ t:'h', text:'復能項目' }, { t:'table', head:['#', '項目', '執行方式', '劑量', '頻率', '執行者', '注意事項'], widths:[0.4, 1.6, 4, 1.3, 1.3, 1.1, 2.2], center:[0], fs:9, rows:(pl.items || []).map((it, i) => [i + 1, it.name, it.how || '', it.dose || '', freqText(it), it.executor || '', it.caution || '']) });
  if (pl.note) blocks.push({ t:'h', text:'備註' }, { t:'p', text:pl.note });
  blocks.push({ t:'sign', items:['擬定者', `${term()}／家屬`, '執行人員'] });
  return { title:'個別復能計畫書', sub:`${c.name}｜${rocDate(pl.startDate)}～${rocDate(pl.endDate)}`, blocks };
}

/* ---------- 個別執行檢核表 ---------- */
function indivCheckDoc(pl, o){
  const c = Store.get('clients', pl.clientId), items = pl.items || [];
  const dates = o.mode === 'month' ? monthDays(o.month) : Array.from({ length:7 }, (_, i) => addDays(o.week, i));
  const inPlan = d => d >= pl.startDate && d <= pl.endDate;
  const rec = (it, d) => o.filled ? Store.all('checks').find(x => x.planId === pl.id && x.itemId === it.id && x.date === d) : null;
  const cellFor = (it, d) => { if (!inPlan(d) || !(it.days || []).includes(weekday(d))) return '—'; const r = rec(it, d); if (r) return SYM[r.status] || ''; return (BOX + ' ').repeat(it.times || 1).trim(); };
  const range = o.mode === 'month' ? `${+o.month.slice(0, 4) - 1911}年${+o.month.slice(5)}月` : `${rocDate(dates[0])}～${rocDate(dates[6])}`;
  if (o.big) {
    return { title:'我的復能運動檢核表', sub:`${c.name}｜${range}`, big:true, landscape:true, blocks:[
      { t:'p', text:'做完請在格子打 ✓，沒做完打 △，沒有做打 ✕' },
      { t:'table', head:['我的運動', '怎麼做', ...dates.map(d => `${d.slice(5).replace('-', '/')}\n週${WEEKDAYS[weekday(d)]}`)], widths:[2.2, 3.6, ...dates.map(() => 1)], center:dates.map((_, i) => i + 2), rowH:18, fs:14, rows:items.map(it => [`${it.name}\n${it.dose || ''}`, it.how || '', ...dates.map(d => cellFor(it, d))]) },
      { t:'p', text:'今天的感覺／想跟治療師說的話：\n' + blankLines(3) }] };
  }
  const head = o.mode === 'month' ? ['項目／劑量', ...dates.map(d => String(+d.slice(8)))] : ['項目', '劑量', '執行者', ...dates.map(d => `${d.slice(5).replace('-', '/')}\n週${WEEKDAYS[weekday(d)]}`)];
  const rows = items.map(it => o.mode === 'month' ? [`${it.name}\n${it.dose || ''}`, ...dates.map(d => cellFor(it, d))] : [it.name, `${it.dose || ''}\n${freqText(it)}`, it.executor || '', ...dates.map(d => cellFor(it, d))]);
  rows.push(o.mode === 'month' ? ['執行者簽名', ...dates.map(() => '')] : ['執行者簽名', '', '', ...dates.map(() => '')]);
  const note = o.filled && o.mode === 'week' ? Store.all('weekNotes').find(x => x.planId === pl.id && x.week === o.week)?.note : '';
  return { title:'個別復能執行檢核表', sub:`${c.name}${isRes() && c.bed ? '（' + c.bed + '）' : ''}｜${range}｜計畫 v${pl.version || 1}`, landscape:true, blocks:[
    { t:'p', text:`${SYM_LABEL}　　「—」為非執行日`, small:true },
    { t:'table', head, rows, widths:o.mode === 'month' ? [3, ...dates.map(() => 0.55)] : [2.4, 2, 1.2, ...dates.map(() => 1.1)], center:o.mode === 'month' ? dates.map((_, i) => i + 1) : dates.map((_, i) => i + 3), rowH:o.mode === 'month' ? 9 : 13, fs:o.mode === 'month' ? 8 : 10 },
    { t:'p', text:'執行說明：' + items.map((it, i) => `${i + 1}. ${it.name}：${it.how || ''}${it.caution ? `（注意：${it.caution}）` : ''}`).join('　'), small:true },
    { t:'p', text:'備註（未執行原因、個案反應、異常狀況）：\n' + (note || blankLines(o.mode === 'month' ? 2 : 3)) }] };
}

/* ---------- 團體復能計畫書 ---------- */
function groupDoc(g){
  const mem = (g.members || []).map(id => Store.get('clients', id)).filter(Boolean);
  const total = (g.flow || []).reduce((s, f) => s + (+f.minutes || 0), 0);
  return { title:'團體復能計畫書', sub:`${g.name}｜${rocDate(g.startDate)}～${rocDate(g.endDate)}`, blocks:[
    { t:'kv', rows:[['團體名稱', g.name], ['類型', g.type || ''], ['帶領者', g.leader || ''], ['協助人員', g.helpers || ''], ['時間', `${daysText(g.days)} ${g.time || ''}，每次約 ${g.duration || total} 分鐘`], ['期間', `${rocDate(g.startDate)} ～ ${rocDate(g.endDate)}`], ['地點', g.place || ''], ['成員人數', mem.length + ' 人']] },
    { t:'h', text:'團體目標' }, { t:'p', text:g.goal || '' },
    { t:'h', text:'選擇成員條件' }, { t:'p', text:g.criteria || '' },
    { t:'h', text:'活動流程' }, { t:'table', head:['階段', '活動', '時間(分)', '劑量', '帶領要點', '注意事項'], widths:[1, 1.8, 0.8, 1.4, 4, 2.2], center:[0, 2], fs:9, rows:(g.flow || []).map(f => [f.stage, f.name, f.minutes || '', f.dose || '', f.how || '', f.caution || '']) },
    { t:'h', text:'成員名單' }, { t:'table', head:['#', '姓名', ...(isRes() ? ['房號／床號'] : []), '個別注意事項'], widths:[0.4, 1.6, ...(isRes() ? [1.2] : []), 6], center:[0], rows:mem.map((c, i) => [i + 1, c.name, ...(isRes() ? [c.bed || ''] : []), (g.memberNotes || {})[c.id] || c.caution || '']) },
    ...(g.precautions ? [{ t:'h', text:'安全注意事項' }, { t:'p', text:g.precautions }] : []),
    { t:'sign', items:['擬定者', '督導'] }] };
}

/* ---------- 團體執行檢核表 ---------- */
function groupCheckDoc(g, o){
  const mem = (g.members || []).map(id => Store.get('clients', id)).filter(Boolean);
  if (o.mode === 'month') {
    const dates = monthDays(o.month).filter(d => (g.days || []).includes(weekday(d)) && d >= g.startDate && d <= g.endDate);
    const ses = d => o.filled ? Store.all('sessions').find(x => x.groupId === g.id && x.date === d) : null;
    const cell = (c, d) => { const s = ses(d); if (!s) return BOX; const r = s.att?.[c.id]; if (!r) return ''; return r.present ? '✓' + ({ 主動:'主', 需提示:'提', 需協助:'協', 拒絕:'拒' }[r.level] || '') : '✕'; };
    return { title:'團體復能出席與參與檢核表（月）', sub:`${g.name}｜${+o.month.slice(0, 4) - 1911}年${+o.month.slice(5)}月｜帶領：${g.leader || ''}`, landscape:true, blocks:[
      { t:'p', text:'出席打 ✓、缺席打 ✕；參與程度可加註：主＝主動參與　提＝需口頭提示　協＝需肢體協助　拒＝拒絕', small:true },
      { t:'table', head:['姓名', ...dates.map(d => `${d.slice(5).replace('-', '/')}\n週${WEEKDAYS[weekday(d)]}`)], widths:[1.6, ...dates.map(() => 1)], center:dates.map((_, i) => i + 1), rowH:11, rows:[...mem.map(c => [c.name + (isRes() && c.bed ? `\n${c.bed}` : ''), ...dates.map(d => cell(c, d))]), ['帶領者簽名', ...dates.map(() => '')]] },
      { t:'p', text:'備註：\n' + blankLines(2) }] };
  }
  const s = o.filled ? Store.all('sessions').find(x => x.groupId === g.id && x.date === o.date) : null;
  const pick = (opts, v) => opts.map(x => `${v === x ? '☑' : BOX}${x}`).join(' ');
  return { title:'團體復能執行檢核表', sub:`${g.name}｜${o.date ? rocDate(o.date) : '　　年　　月　　日'}`, landscape:true, blocks:[
    { t:'kv', cols:3, rows:[['團體', g.name], ['日期', o.date ? rocDate(o.date) : ''], ['帶領者', s?.leader || g.leader || ''], ['時間', g.time || ''], ['地點', g.place || ''], ['出席', s ? `${mem.filter(c => s.att?.[c.id]?.present).length}／${mem.length} 人` : `＿＿／${mem.length} 人`]] },
    { t:'h', text:'成員參與紀錄' },
    { t:'table', head:['姓名', '出席', '參與程度', '耐受度', '備註'], widths:[1.5, 1.6, 3, 2.4, 3], rowH:10, rows:mem.map(c => { const r = s?.att?.[c.id]; return [c.name + (isRes() && c.bed ? `（${c.bed}）` : ''), s ? (r?.present ? '☑出席 ☐缺席' : r ? '☐出席 ☑缺席' : '☐出席 ☐缺席') : '☐出席 ☐缺席', pick(['主動', '需提示', '需協助', '拒絕'], r?.level), pick(['良好', '疲累', '不適'], r?.tol), r?.note || '']; }) },
    { t:'h', text:'活動流程檢核' },
    { t:'table', head:['階段', '活動', '劑量／時間', '完成'], widths:[1, 3, 2.4, 1], center:[3], rows:(g.flow || []).map(f => [f.stage, f.name, `${f.dose || ''}${f.minutes ? `（${f.minutes}分）` : ''}`, s ? (s.done?.[f.id] ? '☑' : BOX) : BOX]) },
    { t:'p', text:'本次觀察與調整建議：\n' + (s?.note || blankLines(3)) },
    { t:'sign', items:['帶領者', '協助者'] }] };
}

/* ---------- 團體帶領簡報（給長輩看的大字投影片） ---------- */
async function downloadGroupSlides(g){
  const p = pptBase(g.name);
  pptTitle(p, g.name, g.goal || '一起動一動，越動越健康');
  const s0 = p.addSlide({ masterName:'M' });
  s0.addText('今天的活動', { x:0.6, y:0.35, w:12, h:0.9, fontSize:36, bold:true, color:PC.text, fontFace:FONT });
  s0.addText((g.flow || []).map((f, i) => ({ text:`${i + 1}. ${f.name}${f.minutes ? `（${f.minutes} 分鐘）` : ''}`, options:{ breakLine:true } })), { x:0.9, y:1.4, w:11.5, h:5.4, fontSize:28, color:PC.text, fontFace:FONT, valign:'top', paraSpaceAfter:10 });
  for (const f of g.flow || []) {
    const s = p.addSlide({ masterName:'M' });
    s.addText(f.stage || '', { x:0.6, y:0.35, w:1.8, h:0.55, fontSize:18, bold:true, color:'FFFFFF', fill:{ color:PC.pri }, align:'center', fontFace:FONT, rectRadius:0.1 });
    s.addText(f.name, { x:0.6, y:1.0, w:12.1, h:1.1, fontSize:46, bold:true, color:PC.text, fontFace:FONT });
    s.addText([f.dose, f.minutes && String(f.dose || '').replace(/\s/g, '') !== f.minutes + '分鐘' ? f.minutes + ' 分鐘' : ''].filter(Boolean).join('　｜　'), { x:0.6, y:2.1, w:12.1, h:0.7, fontSize:26, color:PC.pri, bold:true, fontFace:FONT });
    const steps = String(f.how || '').split(/[；。;]/).map(x => x.trim()).filter(Boolean).slice(0, 5);
    s.addText(steps.map((t, i) => ({ text:`${i + 1}. ${t}`, options:{ breakLine:true } })), { x:0.8, y:3.0, w:11.8, h:3.0, fontSize:24, color:PC.text, fontFace:FONT, valign:'top', paraSpaceAfter:8 });
    if (f.caution) s.addText('⚠ ' + f.caution, { x:0.6, y:6.15, w:12.1, h:0.7, fontSize:20, color:'B4533F', fontFace:FONT, fill:{ color:'F6E1DA' } });
  }
  const se = p.addSlide({ masterName:'M' });
  se.addText('辛苦了！', { x:0.8, y:2.4, w:11.7, h:1.4, fontSize:60, bold:true, color:PC.pri, fontFace:FONT, align:'center' });
  se.addText('記得喝水、休息一下，我們下次見', { x:0.8, y:3.9, w:11.7, h:0.8, fontSize:28, color:PC.text, fontFace:FONT, align:'center' });
  await p.writeFile({ fileName:fileSafe(g.name + '_帶領簡報') + '.pptx', compression:true }); toast('已下載團體帶領簡報');
}
