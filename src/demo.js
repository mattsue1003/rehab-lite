/* ================================================================
   示範資料：三個模擬個案，分別停在流程的不同階段（虛構、去識別化；demo:true，可一鍵清除）
   1. 王○蘭：走完一輪（初評 → 計畫 v1 執行 12 週 → 再評 → 修正計畫 v2）
   2. 陳○水：計畫執行中（輕度失智，最想做到的事只填活動、團體為主）
   3. 張○雄：剛完成初評並開立計畫（巴金森、移位與輔具）
   ================================================================ */
const DEMO_GUIDE = [
  { id:'dl_c1', stage:'走完一輪復能', text:'初評 → 12 週介入與勾選 → 再評（最想做到的事進步、GAS 目標評值）→ 修正計畫 v2', tabs:[['assess', '看評估與進步'], ['plan', '看計畫修正'], ['check', '看執行紀錄']] },
  { id:'dl_c2', stage:'計畫執行中', text:'輕度失智：最想做到的事只寫活動不打分數；以認知、懷舊、運動團體搭配個別步行訓練', tabs:[['assess', '看評估'], ['plan', '看計畫'], ['check', '看執行紀錄']] },
  { id:'dl_c3', stage:'剛開立計畫', text:'巴金森、移位需中度協助：依評估建議的項目、團體與輔具開立計畫', tabs:[['assess', '看評估'], ['plan', '看計畫']] },
];
function loadDemo(){
  for (const c of COLLECTIONS) for (const r of Store.DB[c]) if (r.demo && !r.deleted) Store.remove(c, r.id); // 先清掉舊版示範資料
  if (!Store.DB.meta.orgType) Store.setMeta('orgType', '日間照顧');
  if (!Store.DB.meta.orgName) Store.setMeta('orgName', '示範機構（資料皆為虛構）');
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const T = todayISO(), ago = n => addDays(T, -n), put = (c, o) => Store.upsert(c, { ...o, demo:true });
  const keys = BARTHEL.map(x => x.k);
  const C = [
    { id:'dl_c1', name:'王○蘭', gender:'女', birth:'1942-03-15', bed:'201-1', diagnosis:'腦中風（右側偏癱）、高血壓', aids:'四腳拐', caution:'右肩疼痛，勿拉扯右手', status:'服務中' },
    { id:'dl_c2', name:'陳○水', gender:'男', birth:'1938-08-02', bed:'201-2', diagnosis:'輕度失智症、高血壓', aids:'助行器', caution:'午後易焦躁，需提示方向', status:'服務中' },
    { id:'dl_c3', name:'張○雄', gender:'男', birth:'1950-11-20', bed:'203-1', diagnosis:'巴金森氏症、姿勢性低血壓', aids:'輪椅（短距離助行器）', caution:'起身前先坐 30 秒', status:'服務中' },
  ];
  C.forEach(c => put('clients', c));
  const mkA = (c, o) => {
    const a = { clientId:c.id, assessor:'林○君', role:'物理治療師', iadl:{}, spmsq:{ items:Array(10).fill(''), edu:'' }, pain:{}, physio:'', strength:'', expect:'', summary:'', ...o, adl:Object.fromEntries(keys.map((k, i) => [k, o.adl[i]])) };
    const sg = suggestFromAssessment(a, c); a.problemSel = Object.fromEntries(sg.map(s => [s.code, true])); a.problems = sg; a.customProblems = '';
    return put('assessments', a);
  };
  const it = (id, ex, o = {}) => ({ ...mkItem(ex), id, ...o });
  // 依週數讓完成率逐漸提高（前期較多「部分」，後期多「完成」）；今天留空讓使用者試點
  const fill = (p, from, to) => {
    const span = Math.max(1, diffDays(from, to));
    for (let d = from; d <= to && d < T; d = addDays(d, 1)) for (const x of p.items) {
      if (!scheduled(p, x, d) || rnd() < 0.05) continue;
      const prog = diffDays(from, d) / span, r = rnd();
      put('checks', { clientId:p.clientId, planId:p.id, itemId:x.id, date:d, status:r < 0.55 + prog * 0.3 ? 'ok' : r < 0.9 ? 'part' : 'skip', by:rnd() > 0.5 ? '黃○英' : '吳○明' });
    }
  };

  /* ---------- 1. 王○蘭：走完一輪 ---------- */
  const a1 = mkA(C[0], { date:ago(88), type:'初評', adl:[10, 10, 5, 5, 0, 10, 5, 5, 10, 10],
    phy:{ tug:20.5, cs30:6, grip:13, oneLeg:2, tandem:4, gait4:7.5, note:'使用四腳拐' }, pain:{ nrs:3, site:'右肩' },
    physio:'右側偏癱，右手精細動作差；血壓穩定。', strength:'喜歡唱老歌、畫畫，個性積極。', expect:'女兒希望媽媽能自己上廁所，不要包尿布。',
    copm:[{ activity:'自己上廁所', area:'自我照顧', imp:10, perf:3, sat:2 }, { activity:'自己走去市場買菜', area:'自我照顧', imp:8, perf:2, sat:2 }, { activity:'畫畫', area:'休閒', imp:6, perf:5, sat:4 }],
    summary:'移位與如廁需少量協助，下肢肌力與平衡不足，跌倒風險高；動機強，以如廁自立與社區步行為目標。' });
  const p1 = put('plans', { id:'dl_p1', clientId:C[0].id, assessmentId:a1.id, version:1, status:'已結束', startDate:ago(86), endDate:ago(3), author:'林○君', role:'物理治療師', problems:[],
    goals:[newGoal({ id:'g1', activity:'自己上廁所', when:'12 週內', how:'扶著廁所扶手', assist:'在旁人監督下（不需碰觸）', scene:'白天自己去廁所，不再需要包尿布', measure:'每天 3 次中有 2 次成功', baseline:'需照服員扶持並協助拉褲子（自評表現 3/10）' }),
      newGoal({ id:'g2', activity:'自己走去市場買菜', when:'12 週內', how:'使用四腳拐', assist:'在旁人監督下（不需碰觸）', scene:'從家門口走到巷口市場（約 200 公尺）挑選晚餐要煮的菜', measure:'中途休息不超過 1 次', baseline:'只能在室內走 20 公尺（自評表現 2/10）' })],
    items:[it('i1', 'sit-to-stand', { dose:'8 下 × 2 組' }), it('i2', 'single-leg-stance-supported'), it('i3', 'toilet-transfer', { times:2 }), it('i4', 'button-board', { days:[1, 3, 5] }), it('i5', 'forward-walking-line', { executor:'治療師', days:[2, 4], dose:'20 公尺 × 2 趟' })],
    groups:[{ type:'運動團體', freq:'每週 3 次', note:'' }, { type:'藝術團體', freq:'每週 1 次', note:'喜歡畫畫' }], devices:['馬桶扶手架', '防滑措施'], note:'女兒可於居家每天晚飯後陪同坐站 10 下。' });
  fill(p1, p1.startDate, p1.endDate);
  [[70, '前兩週右肩痛，扶桌單腳站常只做一半。'], [42, '如廁時已能自己拉褲子，只需在旁看著。'], [14, '走廊步行可達 60 公尺，中途休息 1 次。']].forEach(([d, n]) => put('weekNotes', { planId:p1.id, clientId:C[0].id, week:weekStart(ago(d)), note:n, by:'黃○英' }));
  const a2 = mkA(C[0], { date:ago(2), type:'再評', adl:[10, 10, 5, 10, 0, 10, 5, 10, 10, 10],
    phy:{ tug:16.2, cs30:9, grip:14, oneLeg:4, tandem:9, gait4:6.0, note:'使用四腳拐' }, pain:{ nrs:2, site:'右肩' },
    physio:'右側偏癱，右手精細動作進步；血壓穩定。', strength:'喜歡唱老歌、畫畫，個性積極。', expect:'女兒希望媽媽能自己上廁所，不要包尿布。',
    copm:[{ activity:'自己上廁所', area:'自我照顧', imp:10, perf:7, sat:8 }, { activity:'自己走去市場買菜', area:'自我照顧', imp:8, perf:4, sat:4 }, { activity:'畫畫', area:'休閒', imp:6, perf:6, sat:6 }],
    goalReview:[{ goalId:'g1', planId:p1.id, activity:'自己上廁所', text:p1.goals[0].text, measure:'', baseline:p1.goals[0].baseline, target:p1.goals[0].target, current:'監督下可自行完成如廁，每天 3 次都成功', gas:1, note:'已達成，略優於目標' },
      { goalId:'g2', planId:p1.id, activity:'自己走去市場買菜', text:p1.goals[1].text, measure:'', baseline:p1.goals[1].baseline, target:p1.goals[1].target, current:'可走到巷口但需休息 2 次', gas:-1, note:'有進步，尚未達成' }],
    summary:'如廁已能在監督下自行完成（目標達成）；坐站、TUG、前後腳站立進步，社區步行仍需加強。修正計畫：如廁改為維持，加強步行耐力與持物步行，為上市場做準備。' });
  const p2 = put('plans', { id:'dl_p1b', clientId:C[0].id, assessmentId:a2.id, version:2, copyOf:p1.id, status:'執行中', startDate:ago(1), endDate:addDays(ago(1), 83), author:'林○君', role:'物理治療師', problems:[],
    goals:[newGoal({ id:'g2', activity:'自己走去市場買菜', when:'12 週內', how:'使用四腳拐', assist:'可獨立', scene:'從家門口走到巷口市場，買一小袋菜回家煮給女兒吃', measure:'中途休息不超過 1 次', baseline:'可走到巷口但需休息 2 次（自評表現 4/10）' }),
      newGoal({ id:'g3', activity:'畫畫', when:'8 週內', how:'使用加粗握柄的畫筆', assist:'可獨立', scene:'用右手畫一張生日賀卡送給孫女', measure:'完成 1 件作品', baseline:'右手握筆 5 分鐘就累，作品要別人幫忙完成（自評表現 6/10）' })],
    items:[it('i1', 'sit-to-stand', { dose:'10 下 × 3 組' }), it('i6', 'tandem-stance'), it('i7', 'carry-light-object-walk', { days:[1, 3, 5] }), it('i8', 'walking-program', { executor:'治療師', days:[2, 4], dose:'10 分鐘' }), it('i9', 'grip-towel', { days:[1, 3, 5] })],
    groups:[{ type:'運動團體', freq:'每週 3 次', note:'' }, { type:'藝術團體', freq:'每週 1 次', note:'練習右手塗色' }], devices:['防滑措施'], note:'如廁目標已達成，改為維持（照服員持續在旁監督）；新增持物步行為上市場做準備。' });
  fill(p2, p2.startDate, T);

  /* ---------- 2. 陳○水：計畫執行中（輕度失智） ---------- */
  const a3 = mkA(C[1], { date:ago(40), type:'初評', adl:[10, 15, 5, 10, 0, 10, 5, 10, 10, 5],
    phy:{ tug:15.2, cs30:9, grip:24, oneLeg:4, tandem:8, gait4:5.8 }, spmsq:{ items:['c', 'c', 'x', 'c', 'x', 'c', 'x', 'x', 'c', 'x'], edu:'low' },
    physio:'夜尿 2–3 次，聽力稍差。', strength:'喜歡下象棋、聊以前務農的事。', expect:'兒子希望爸爸維持走路能力、不要走失。',
    copm:[{ activity:'和朋友下象棋', area:'休閒', imp:9, perf:'', sat:'' }, { activity:'自己去公園散步', area:'休閒', imp:'', perf:'', sat:'' }],
    summary:'下肢肌力尚可，平衡與定向感需維持；無法穩定自評分數，最想做到的事只記錄活動。' });
  const p3 = put('plans', { id:'dl_p2', clientId:C[1].id, assessmentId:a3.id, version:1, status:'執行中', startDate:ago(38), endDate:addDays(ago(38), 83), author:'陳○宏', role:'職能治療師', problems:[],
    goals:[newGoal({ id:'g4', activity:'自己去公園散步', when:'12 週內', how:'使用助行器', assist:'在旁人監督下（不需碰觸）', scene:'從中心門口走到隔壁公園，和老朋友打招呼再走回來', measure:'每週 3 次、自己找到回來的路', baseline:'需陪同並提示方向' }),
      newGoal({ id:'g5', activity:'和朋友下象棋', when:'8 週內', how:'', assist:'在口頭提示下', scene:'在中心和老朋友下完一盤象棋', measure:'每週 2 次、全程參與', baseline:'下到一半會忘記輪到誰' })],
    items:[it('i10', 'sit-to-stand', { dose:'10 下 × 2 組' }), it('i11', 'standing-weight-shift'), it('i12', 'cloth-folding', { days:[1, 3, 5] }), it('i13', 'walking-program', { days:[1, 3, 5], dose:'到公園來回約 15 分鐘' })],
    groups:[{ type:'認知團體', freq:'每週 2 次', note:'' }, { type:'懷舊團體', freq:'每週 1 次', note:'喜歡聊務農' }, { type:'運動團體', freq:'每週 3 次', note:'' }], devices:['防走失定位裝置'] });
  fill(p3, p3.startDate, T);
  put('weekNotes', { planId:p3.id, clientId:C[1].id, week:weekStart(ago(7)), note:'週三下午焦躁，散步改到上午後配合度變好。', by:'吳○明' });

  /* ---------- 3. 張○雄：剛完成初評並開立計畫 ---------- */
  const a4 = mkA(C[2], { date:ago(6), type:'初評', adl:[5, 5, 0, 5, 0, 5, 0, 5, 10, 10],
    phy:{ tug:28, cs30:4, grip:20, oneLeg:0, tandem:0, note:'無法單腳站與前後腳站' }, pain:{ nrs:2, site:'下背' },
    physio:'步態小碎步、起步困難；起身易頭暈；吞嚥偶嗆咳。', strength:'以前是木工，手很巧。', expect:'太太希望他能自己移位，減輕照顧負擔。',
    copm:[{ activity:'自己從輪椅移到椅子', area:'自我照顧', imp:9, perf:3, sat:2 }, { activity:'做木工小物', area:'休閒', imp:6, perf:2, sat:3 }],
    summary:'移位與行走需中度協助，跌倒風險極高；以安全移位為優先，搭配手工藝團體維持手部功能與成就感。' });
  const p4 = put('plans', { id:'dl_p3', clientId:C[2].id, assessmentId:a4.id, version:1, status:'執行中', startDate:ago(4), endDate:addDays(ago(4), 83), author:'林○君', role:'物理治療師', problems:[],
    goals:[newGoal({ id:'g6', activity:'自己從輪椅移到椅子', when:'12 週內', how:'先坐 30 秒再起身，扶著椅子扶手', assist:'在少量協助下', scene:'從輪椅移到餐桌椅子上，和太太一起吃晚飯', measure:'每天午餐、晚餐各 1 次', baseline:'需中度協助（自評表現 3/10）' })],
    items:[it('i14', 'sit-pivot-transfer', { times:2 }), it('i15', 'sit-to-stand', { dose:'5 下 × 2 組', caution:'起身前先坐 30 秒，頭暈即停' }), it('i16', 'metronome-stepping'), it('i17', 'oral_exercise')],
    groups:[{ type:'手工藝團體', freq:'每週 2 次', note:'木工、手作' }, { type:'社交團體', freq:'每週 1 次', note:'' }], devices:['移位腰帶與人力移位吊帶', '移位滑板'] });
  fill(p4, p4.startDate, T);

  for (const pl of Store.all('plans').filter(x => x.demo)) { pl.problems = planProblemsFor(Store.get('assessments', pl.assessmentId), pl.goals).map(x => x.text); Store.upsert('plans', pl); }
  Store.flush(); renderShell(); toast('已載入 3 個模擬個案'); App.go('#/'); route();
}
function demoGuideHTML(){
  if (!Store.all('clients').some(c => c.demo)) return '';
  return `<section class="card guide"><h2>示範導覽 <small>三個模擬個案停在流程的不同階段，點按鈕直接看該步驟</small></h2>
    <div class="guide-grid">${DEMO_GUIDE.map((g, i) => { const c = Store.get('clients', g.id); if (!c) return ''; return `<div class="guide-c"><div class="gc-top"><span class="sn">${i + 1}</span><b>${esc(c.name)}</b>${badge(g.stage, 'green')}</div><small>${esc(c.diagnosis)}</small><p>${esc(g.text)}</p><div class="btn-row">${g.tabs.map(([t, l]) => `<a class="btn sm" href="#/client/${c.id}/${t}">${l}</a>`).join('')}</div></div>`; }).join('')}</div>
    <p class="hint">也可以到「今日勾選」試著點選今天的項目。看完到「個案名冊」按「清除模擬個案」即可開始正式使用。</p></section>`;
}
