/* ================================================================
   文件內容：評估表、復能介入計畫書、個別執行檢核表
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
  const NUM = ['一', '二', '三', '四', '五', '六', '七']; let sn = 0; const H = text => ({ t:'h', text:`${NUM[sn++]}、${text}` });
  const blocks = [c ? clientKV(c, [['評估日期', f ? rocDate(a.date) : ''], ['評估類別', f ? a.type : '☐初評　☐再評'], ['評估者', f ? `${a.assessor || ''}${a.role ? '（' + a.role + '）' : ''}` : '']]) : { t:'kv', rows:[['姓名', ''], ['性別／年齡', ''], ...(isRes() ? [['房號／床號', '']] : []), ['評估日期', ''], ['評估類別', '☐初評　☐再評'], ['評估者', '']] }];
  const cr = f ? copmRows(a) : [];
  blocks.push(H('最想做到的事（參考 COPM，長輩自評 1–10）'));
  if (!f) blocks.push({ t:'p', small:true, text:'請問長輩：「現在有哪些日常的事，是您想要自己做、需要做或別人期待您做，但做不到或做得不滿意的？」請挑出最重要的 1–5 件。（自我照顧／生產活動／休閒）' });
  blocks.push({ t:'table', head:['#', '想做到的事（長輩自己的話）', '領域', '重要性', '表現', '滿意度'], widths:[0.4, 5, 1.4, 1, 1, 1], center:[0, 3, 4, 5], rowH:f ? 0 : 10, rows:f ? (cr.length ? cr.map((x, ix) => [ix + 1, x.activity, x.area || '', x.imp ?? '', x.perf ?? '', x.sat ?? '']) : [['', '（未填）', '', '', '', '']]) : [1, 2, 3, 4, 5].map(n => [n, '', '', '', '', '']) });
  if (f && cr.length) blocks.push({ t:'p', small:true, text:`平均表現 ${copmAvg(a, 'perf') ?? '—'}　平均滿意度 ${copmAvg(a, 'sat') ?? '—'}（再評估時進步 ≥2 分具臨床意義）` });
  if (f && (a.goalReview || []).length) blocks.push(H('前次計畫目標達成（GAS）'), { t:'table', head:['計畫目標', '目前→目標值', '本次現況', 'GAS', '說明'], widths:[3.5, 1.6, 1.4, 2, 2.5], rows:a.goalReview.map(g => [g.text, `${g.baseline || ''}→${g.target || ''}`, g.current || '', (GAS.find(x => x[0] === +g.gas) || ['', ''])[1], g.note || '']) });
  blocks.push(H('日常生活功能（巴氏量表）' + (b ? `　總分 ${b.total} 分（${b.level}）` : '　總分＿＿＿分')));
  blocks.push({ t:'table', head:['項目', '評分（請勾選）', '得分'], widths:[1.4, 7, 0.9], center:[2], fs:9, rows:BARTHEL.map(it => [it.n, it.opts.map(([v, d]) => `${sel(a?.adl?.[it.k], v)} ${v}分　${d}`).join('\n'), f ? (a.adl?.[it.k] ?? '') : '']) });
  blocks.push(H('體能與跌倒風險'));
  blocks.push({ t:'table', head:['項目', '結果', '參考（需注意）'], widths:[2.2, 2, 3.6], center:[1], rowH:f ? 0 : 9, rows:[
    ['起身行走 TUG', f && p.tug ? p.tug + ' 秒' : '＿＿＿ 秒', '≥ 13.5 秒：跌倒高風險'],
    ['30 秒坐站', f && p.cs30 !== '' && p.cs30 != null ? p.cs30 + ' 次' : '＿＿＿ 次', ag ? `低於 ${cs30Cut(ag, c.gender)} 次：低於同齡平均` : '依年齡性別常模'],
    ['握力（慣用手）', f && p.grip ? p.grip + ' 公斤' : '＿＿＿ 公斤', '男 < 28、女 < 18 公斤（AWGS）'],
    ['單腳站立', f && p.oneLeg ? p.oneLeg + ' 秒' : '＿＿＿ 秒', '< 5 秒：跌倒風險'],
    ['前後腳站立', f && p.tandem !== '' && p.tandem != null ? p.tandem + ' 秒' : '＿＿＿ 秒', '< 10 秒：平衡不佳（測到 10 秒即停）'],
    ['4 公尺步行', f && p.gait4 ? `${p.gait4} 秒（${gaitSpeed(a)} 公尺/秒）` : '＿＿＿ 秒', '步速 < 1.0 公尺/秒'],
    ['使用輔具／無法施測說明', f ? (p.note || '') : '', ''],
  ] });
  if (!f || i) {
    blocks.push(H('工具性日常生活（IADL）' + (i ? `　${i.total}/8 分` : '　＿＿/8 分')));
    blocks.push({ t:'table', head:['項目', '能力（請勾選）'], widths:[1.4, 8.3], fs:9, rows:IADL.map(it => [it.n, it.opts.map(([d], ix) => `${sel(a?.iadl?.[it.k], ix)} ${d}`).join('\n')]) });
  }
  if (!f || s) {
    blocks.push(H('認知（簡易心智狀態問卷 SPMSQ）' + (s && !s.partial ? `　錯 ${s.errors} 題（${spmsqLevel(s.adj)}）` : '　錯＿＿題')));
    blocks.push({ t:'table', head:['題目', '正確', '錯誤'], widths:[7, 1, 1], center:[1, 2], fs:9, rows:SPMSQ.map((q, ix) => [`${ix + 1}. ${q}`, sel(a?.spmsq?.items?.[ix], 'c'), sel(a?.spmsq?.items?.[ix], 'x')]) });
  }
  const hasPain = f && ((a.pain?.nrs !== '' && a.pain?.nrs != null) || a.pain?.site || a.physio || a.strength || a.expect);
  if (!f || hasPain) blocks.push(H('疼痛與現況（選填）'), { t:'kv', cols:1, rows:[['疼痛（0–10）', f ? `${a.pain?.nrs ?? ''}　${a.pain?.site || ''}` : '0　1　2　3　4　5　6　7　8　9　10　部位：'], ['身體與生活現況', f ? (a.physio || '') : '\n\n'], ['優勢與興趣', f ? (a.strength || '') : '\n'], [`${term()}／家屬期待`, f ? (a.expect || '') : '\n']] });
  blocks.push(H('評估結果'));
  if (f && (a.problems || []).length) {
    blocks.push({ t:'p', text:'需復能的問題：\n' + a.problems.map((x, ix) => `${ix + 1}. ${x.text}${x.referral ? `（建議轉介：${x.referral}）` : ''}`).join('\n') });
    const dev = [...new Set(a.problems.flatMap(x => x.dev || []))], grp = [...new Set(a.problems.flatMap(x => x.grp || []))];
    if (dev.length) blocks.push({ t:'p', text:'建議評估輔具：' + dev.join('、') });
    if (grp.length) blocks.push({ t:'p', text:'建議參加團體：' + grp.join('、') });
  } else blocks.push({ t:'p', text:'需復能的問題：\n' + blankLines(4) });
  if (f && a.summary) blocks.push({ t:'p', text:'摘要：' + a.summary });
  blocks.push({ t:'sign', items:['評估者', '督導'] });
  return { title:(f ? '' : '空白') + '復能評估表', sub:c ? `${c.name}${f ? '｜' + rocDate(a.date) : ''}` : '', blocks };
}

/* ---------- 復能介入計畫書（個別＋團體＋輔具） ---------- */
function planItems(pl){ return (pl.items || []).map(it => ({ img:it.img, name:it.name, type:it.type, dose:it.dose, freq:freqText(it), executor:it.executor, how:it.how, steps:it.steps, caution:it.caution })); }
function planDoc(pl){
  const c = Store.get('clients', pl.clientId), a = pl.assessmentId ? Store.get('assessments', pl.assessmentId) : null;
  const blocks = [clientKV(c, [['計畫期間', `${rocDate(pl.startDate)} ～ ${rocDate(pl.endDate)}`], ['擬定者', `${pl.author || ''}${pl.role ? '（' + pl.role + '）' : ''}`]])];
  if (a) blocks.push({ t:'p', text:`評估依據：${rocDate(a.date)} ${a.type}　巴氏 ${scoreBarthel(a)?.total ?? '—'} 分、TUG ${a.phy?.tug || '—'} 秒、30秒坐站 ${a.phy?.cs30 ?? '—'} 次、握力 ${a.phy?.grip || '—'} 公斤` });
  if (a && copmRows(a).length) blocks.push({ t:'h', text:'長輩最想做到的事' }, { t:'table', head:['想做到的事', '重要性', '目前表現', '滿意度'], widths:[5, 1, 1, 1], center:[1, 2, 3], rows:copmRows(a).map(x => [x.activity, x.imp ?? '', x.perf ?? '', x.sat ?? '']) });
  if ((pl.problems || []).filter(Boolean).length) blocks.push({ t:'h', text:'需復能的問題' }, { t:'p', text:pl.problems.filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join('\n') });
  if ((pl.goals || []).length) blocks.push({ t:'h', text:'復能目標' }, { t:'table', head:['#', '復能目標（時限＋方式＋協助程度＋生活情境與意義＋可測量）', '目前狀況'], widths:[0.4, 6.4, 2.6], center:[0], rows:pl.goals.map((g, i) => [i + 1, g.text, g.baseline || '']) });
  const items = planItems(pl);
  if (items.length) blocks.push({ t:'h', text:`個別介入（${items.length} 項）` }, { t:'items', items });
  if ((pl.groups || []).length) blocks.push({ t:'h', text:'團體介入' }, { t:'table', head:['團體', '頻率', '備註'], widths:[2, 2, 5], rows:pl.groups.map(g => [g.type, g.freq || '', g.note || '']) });
  if ((pl.devices || []).length) blocks.push({ t:'h', text:'建議評估輔具' }, { t:'p', text:pl.devices.map(d => `・${d}${DEVICES[d] ? '：' + DEVICES[d].s : ''}`).join('\n') }, { t:'p', small:true, text:'輔具操作方式與補助資訊可查「長照輔具資料庫」：' + DEVICE_DB_URL });
  if (pl.note) blocks.push({ t:'h', text:'備註' }, { t:'p', text:pl.note });
  blocks.push({ t:'sign', items:['擬定者', `${term()}／家屬`, '執行人員'] });
  return { title:'復能介入計畫書', sub:`${c.name}｜${rocDate(pl.startDate)}～${rocDate(pl.endDate)}｜v${pl.version || 1}`, blocks };
}

/* ---------- 個別執行檢核表 ---------- */
function indivCheckDoc(pl, o){
  const c = Store.get('clients', pl.clientId), items = pl.items || [];
  const dates = o.mode === 'month' ? monthDays(o.month) : Array.from({ length:7 }, (_, i) => addDays(o.week, i));
  const inPlan = d => d >= pl.startDate && d <= pl.endDate;
  const recs = o.filled ? new Map(Store.all('checks').filter(x => x.clientId === pl.clientId).map(x => [x.itemId + '|' + x.date, x])) : new Map();
  const cellFor = (it, d) => { if (!inPlan(d) || !(it.days || []).includes(weekday(d))) return '—'; const r = recs.get(it.id + '|' + d); if (r) return SYM[r.status] || ''; return (BOX + ' ').repeat(it.times || 1).trim(); };
  const range = o.mode === 'month' ? `${+o.month.slice(0, 4) - 1911}年${+o.month.slice(5)}月` : `${rocDate(dates[0])}～${rocDate(dates[6])}`;
  const dh = d => `${d.slice(5).replace('-', '/')}\n週${WEEKDAYS[weekday(d)]}`;
  const groups = (pl.groups || []).length ? `團體介入：${pl.groups.map(g => g.type + (g.freq ? `（${g.freq}）` : '')).join('、')}` : '';
  if (o.big) {
    return { title:'我的復能檢核表', sub:`${c.name}｜${range}`, big:true, landscape:true, blocks:[
      { t:'p', text:'做完請在格子打 ✓，沒做完打 △，沒有做打 ✕' },
      { t:'table', head:['圖示', '我的練習', ...dates.map(dh)], widths:[2.2, 2.6, ...dates.map(() => 1)], center:dates.map((_, i) => i + 2), fs:13, rows:items.map(it => [{ img:it.img }, `${it.name}\n${it.dose || ''}`, ...dates.map(d => cellFor(it, d))]) },
      { t:'p', text:'今天的感覺／想跟治療師說的話：\n' + blankLines(2) }] };
  }
  const head = o.mode === 'month' ? ['項目／劑量', ...dates.map(d => String(+d.slice(8)))] : ['項目', '劑量／頻率', '執行者', ...dates.map(dh)];
  const rows = items.map(it => o.mode === 'month' ? [`${it.name}\n${it.dose || ''}`, ...dates.map(d => cellFor(it, d))] : [`${it.name}\n（${it.type || ''}）`, `${it.dose || ''}\n${freqText(it)}`, it.executor || '', ...dates.map(d => cellFor(it, d))]);
  rows.push(o.mode === 'month' ? ['執行者簽名', ...dates.map(() => '')] : ['執行者簽名', '', '', ...dates.map(() => '')]);
  const note = o.filled && o.mode === 'week' ? Store.all('weekNotes').find(x => x.planId === pl.id && x.week === o.week)?.note : '';
  return { title:'個別復能執行檢核表', sub:`${c.name}${isRes() && c.bed ? '（' + c.bed + '）' : ''}｜${range}｜計畫 v${pl.version || 1}`, landscape:true, blocks:[
    { t:'p', text:`${SYM_LABEL}　　「—」為非執行日${groups ? '　　' + groups : ''}`, small:true },
    { t:'table', head, rows, widths:o.mode === 'month' ? [3, ...dates.map(() => 0.55)] : [2.4, 2, 1.2, ...dates.map(() => 1.1)], center:o.mode === 'month' ? dates.map((_, i) => i + 1) : dates.map((_, i) => i + 3), rowH:o.mode === 'month' ? 9 : 13, fs:o.mode === 'month' ? 8 : 10 },
    { t:'p', text:'執行說明：' + items.map((it, i) => `${i + 1}. ${it.name}：${it.how || ''}${it.caution ? `（注意：${it.caution}）` : ''}`).join('　'), small:true },
    { t:'p', text:'備註（未執行原因、反應、異常狀況）：\n' + (note || blankLines(o.mode === 'month' ? 2 : 3)) }] };
}
