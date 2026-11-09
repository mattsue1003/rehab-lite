/* ================================================================
   評鑑用報告：初評與復能計畫表、再評估與成效報告、復能結案報告
   （皆可輸出 PDF／Word／PPT）
   ================================================================ */
const CLOSE_REASONS = ['目標達成', '功能穩定，轉為維持', '轉介其他服務', '住院或身體狀況改變', '搬遷或停止服務', '死亡', '其他'];
const METRICS = [
  ['巴氏量表（分）', a => { const b = scoreBarthel(a); return b && !b.partial ? b.total : null; }, 'up'],
  ['IADL（/8）', a => scoreIADL(a)?.total ?? null, 'up'],
  ['起身行走 TUG（秒）', a => num(a.phy?.tug), 'down'],
  ['30 秒坐站（次）', a => num(a.phy?.cs30), 'up'],
  ['握力（公斤）', a => num(a.phy?.grip), 'up'],
  ['單腳站立（秒）', a => num(a.phy?.oneLeg), 'up'],
  ['前後腳站立（秒）', a => num(a.phy?.tandem), 'up'],
  ['步行速度（公尺/秒）', a => gaitSpeed(a), 'up'],
  ['SPMSQ 錯題數', a => { const s = scoreSPMSQ(a); return s && !s.partial ? s.errors : null; }, 'down'],
  ['疼痛（0–10）', a => num(a.pain?.nrs), 'down'],
];
function num(v){ return v === '' || v == null || isNaN(+v) ? null : +v; }
function changeText(a, b, dir){
  if (a == null || b == null) return '';
  const d = Math.round((b - a) * 100) / 100; if (!d) return '持平';
  const good = dir === 'up' ? d > 0 : d < 0;
  return `${d > 0 ? '+' : ''}${d}　${good ? '進步' : '退步'}`;
}
function metricTable(prev, cur, l1, l2){
  const rows = METRICS.map(([n, f, dir]) => [n, f(prev), f(cur), dir]).filter(r => r[1] != null || r[2] != null).map(([n, x, y, dir]) => [n, x ?? '—', y ?? '—', changeText(x, y, dir)]);
  return { t:'table', head:['項目', l1, l2, '變化'], widths:[3, 1.5, 1.5, 2], center:[1, 2, 3], rows:rows.length ? rows : [['（無資料）', '', '', '']] };
}
function copmTable(prev, cur, l1, l2){
  const rows = copmRows(cur).map(x => { const o = prev && copmRows(prev).find(y => y.activity === x.activity); const d = o && num(o.perf) != null && num(x.perf) != null ? +x.perf - +o.perf : null;
    return [x.activity, o ? (o.perf ?? '—') : '—', x.perf ?? '—', o ? (o.sat ?? '—') : '—', x.sat ?? '—', d == null ? (o ? '' : '新增') : `${d > 0 ? '+' : ''}${d}${d >= 2 ? '　有意義進步' : ''}`]; });
  return rows.length ? { t:'table', head:['最想做到的事', `${l1}表現`, `${l2}表現`, `${l1}滿意`, `${l2}滿意`, '表現變化'], widths:[3.4, 1, 1, 1, 1, 1.8], center:[1, 2, 3, 4], rows } : { t:'p', text:'（未填寫）' };
}
function gasLabel(v){ return v === '' || v == null ? '未評' : (GAS.find(x => x[0] === +v) || ['', ''])[1]; }
function itemStats(pl, from, to){
  const recs = new Map(Store.all('checks').filter(x => x.clientId === pl.clientId).map(x => [x.itemId + '|' + x.date, x]));
  const s = from > pl.startDate ? from : pl.startDate, e = [to, pl.endDate, todayISO()].sort()[0];
  return (pl.items || []).map(it => { let exp = 0, ok = 0, part = 0, skip = 0;
    for (let d = s; d <= e; d = addDays(d, 1)) if ((it.days || []).includes(weekday(d))) { exp++; const r = recs.get(it.id + '|' + d)?.status; if (r === 'ok') ok++; else if (r === 'part') part++; else if (r === 'skip') skip++; }
    return { name:it.name, exp, ok, part, skip, rate:exp ? Math.round((ok + part * 0.5) / exp * 100) : null }; });
}
function execBlocks(plans, from, to){
  const out = []; let E = 0, O = 0, P = 0, K = 0;
  for (const pl of plans) {
    const st = itemStats(pl, from, to).filter(x => x.exp); if (!st.length) continue;
    st.forEach(x => { E += x.exp; O += x.ok; P += x.part; K += x.skip; });
    out.push({ t:'table', head:[`計畫 v${pl.version} 項目`, '應執行', '完成', '部分', '未執行', '執行率'], widths:[3.4, 1, 1, 1, 1, 1.2], center:[1, 2, 3, 4, 5], rows:st.map(x => [x.name, x.exp, x.ok, x.part, x.skip, x.rate == null ? '—' : x.rate + '%']) });
  }
  out.unshift({ t:'p', text:E ? `期間應執行 ${E} 次：完成 ${O}、部分 ${P}、未執行 ${K}、未記錄 ${E - O - P - K}；整體執行率 ${Math.round((O + P * 0.5) / E * 100)}%。` : '期間沒有個別介入的執行紀錄。' });
  return out;
}
function planOf(a){ return Logic.plansOf(a.clientId).find(p => p.assessmentId === a.id) || null; }
function planBodyBlocks(pl, compact){
  const blocks = [{ t:'kv', rows:[['計畫期間', `${rocDate(pl.startDate)} ～ ${rocDate(pl.endDate)}`], ['擬定者', `${pl.author || ''}${pl.role ? '（' + pl.role + '）' : ''}`]] }];
  if ((pl.goals || []).length) blocks.push({ t:'table', head:['#', '復能目標（時限＋方式＋協助程度＋生活情境與意義＋可測量）', '目前狀況'], widths:[0.4, 6.4, 2.6], center:[0], rows:pl.goals.map((g, i) => [i + 1, g.text, g.baseline || '']) });
  if ((pl.items || []).length) blocks.push(compact ? { t:'table', head:['個別介入項目', '類型', '劑量', '頻率', '執行者'], widths:[2.6, 1.3, 1.8, 2, 1.3], rows:pl.items.map(it => [it.name, it.type || '', it.dose || '', freqText(it), it.executor || '']) } : { t:'items', items:planItems(pl) });
  if ((pl.groups || []).length) blocks.push({ t:'table', head:['團體介入', '頻率', '備註'], widths:[2, 2, 5], rows:pl.groups.map(g => [g.type, g.freq || '', g.note || '']) });
  if ((pl.devices || []).length) blocks.push({ t:'p', text:'建議評估輔具：' + pl.devices.join('、') });
  return blocks;
}

/* ---------- ① 初評與復能計畫表 ---------- */
function initialDoc(a){
  const c = Store.get('clients', a.clientId), doc = assessDoc(a, c), pl = planOf(a);
  doc.blocks = doc.blocks.filter(b => b.t !== 'sign');
  doc.blocks.push({ t:'h', text:'復能計畫（依本次評估擬定）' }, ...(pl ? planBodyBlocks(pl, false) : [{ t:'p', text:'（尚未依本次評估開立計畫）' }]));
  doc.blocks.push({ t:'sign', items:['評估者', '計畫擬定者', `${term()}／家屬`, '督導'] });
  return { ...doc, title:'初評與復能計畫表', sub:`${c.name}｜評估 ${rocDate(a.date)}` };
}

/* ---------- ② 再評估與成效報告 ---------- */
function reassessDoc(a){
  const c = Store.get('clients', a.clientId), as = Logic.assessmentsOf(c.id);
  const prev = as.filter(x => x.id !== a.id && x.date <= a.date).at(-1);
  const plans = Logic.plansOf(c.id).filter(p => prev ? p.startDate <= a.date && p.endDate >= prev.date : p.startDate <= a.date);
  const newPl = planOf(a);
  const blocks = [clientKV(c, [['再評日期', rocDate(a.date)], ['前次評估', prev ? `${rocDate(prev.date)} ${prev.type}` : '—'], ['評估者', `${a.assessor || ''}${a.role ? '（' + a.role + '）' : ''}`]]),
    { t:'h', text:'一、功能變化' }, metricTable(prev, a, '前次', '本次'),
    { t:'h', text:'二、最想做到的事（長輩自評 1–10）' }, copmTable(prev, a, '前次', '本次'),
    { t:'h', text:'三、前次計畫目標達成（GAS）' },
    (a.goalReview || []).length ? { t:'table', head:['計畫目標', '目前狀況（前次）', '本次現況', 'GAS', '說明'], widths:[3.6, 1.8, 1.8, 1.6, 1.8], rows:a.goalReview.map(g => [g.text, g.baseline || '', g.current || '', gasLabel(g.gas), g.note || '']) } : { t:'p', text:'（本次未評定）' },
    { t:'h', text:'四、介入執行情形' }, ...execBlocks(plans, prev ? prev.date : (plans[0]?.startDate || a.date), a.date),
    { t:'h', text:'五、評估摘要' }, { t:'p', text:a.summary || '（未填寫）' },
    { t:'h', text:'六、修正後計畫' }, ...(newPl ? planBodyBlocks(newPl, true) : [{ t:'p', text:'（尚未依本次評估修正計畫）' }]),
    { t:'sign', items:['評估者', '督導', `${term()}／家屬`] }];
  return { title:'再評估與成效報告', sub:`${c.name}｜${prev ? rocDate(prev.date) + ' → ' : ''}${rocDate(a.date)}`, blocks };
}

/* ---------- ③ 復能結案報告 ---------- */
function closingDoc(a){
  const c = Store.get('clients', a.clientId), as = Logic.assessmentsOf(c.id), first = as[0], plans = Logic.plansOf(c.id);
  const goalRows = [];
  for (const pl of plans) for (const g of pl.goals || []) {
    const rv = as.flatMap(x => (x.goalReview || []).map(r => ({ ...r, date:x.date }))).filter(r => r.goalId === g.id && r.planId === pl.id).at(-1);
    goalRows.push([`v${pl.version}`, g.text, rv ? gasLabel(rv.gas) : '未評', rv?.note || '']);
  }
  const groups = [...new Set(plans.flatMap(p => (p.groups || []).map(g => g.type)))];
  const blocks = [clientKV(c, [['服務期間', `${first ? rocDate(first.date) : '—'} ～ ${rocDate(a.date)}`], ['結案日期', rocDate(a.date)], ['結案原因', a.closeReason || ''], ['計畫版本', plans.length + ' 版']]),
    { t:'h', text:'一、初評與結案功能比較' }, metricTable(first, a, '初評', '結案'),
    { t:'h', text:'二、最想做到的事（初評 → 結案）' }, copmTable(first, a, '初評', '結案'),
    { t:'h', text:'三、歷次計畫目標與達成（GAS）' }, goalRows.length ? { t:'table', head:['版本', '目標', '達成度', '說明'], widths:[0.8, 5.6, 1.8, 2], center:[0], rows:goalRows } : { t:'p', text:'（無）' },
    { t:'h', text:'四、整體介入執行情形' }, ...execBlocks(plans, first ? first.date : a.date, a.date),
    ...(groups.length ? [{ t:'p', text:'參與團體：' + groups.join('、') }] : []),
    { t:'h', text:'五、結案摘要' }, { t:'p', text:a.summary || '（未填寫）' },
    { t:'h', text:'六、後續建議（居家延續、轉介、維持方式）' }, { t:'p', text:a.followUp || '（未填寫）' },
    { t:'sign', items:['評估者', '督導', `${term()}／家屬`] }];
  return { title:'復能結案報告', sub:`${c.name}｜${first ? rocDate(first.date) : ''} ～ ${rocDate(a.date)}`, blocks };
}

/* 依評估類別自動選擇報告 */
function docForAssessment(a){
  if (a.type === '結案評估') return closingDoc(a);
  if (a.type === '初評') return initialDoc(a);
  return Logic.assessmentsOf(a.clientId).some(x => x.id !== a.id && x.date <= a.date) ? reassessDoc(a) : initialDoc(a);
}
const docNameFor = a => a.type === '結案評估' ? '復能結案報告' : a.type === '初評' ? '初評與復能計畫表' : '再評估與成效報告';
