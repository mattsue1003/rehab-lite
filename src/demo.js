/* ================================================================
   示範資料：三個模擬個案，評估次數不同（虛構、去識別化；demo:true，可一鍵清除）
   1. 王○蘭：初評 → 再評 → 再評（3 次評估、計畫 v1 → v2 → v3），看三個時間點的進步
   2. 陳○水：初評 → 再評（2 次評估、計畫 v1 → v2），輕度失智，團體為主
   3. 張○雄：剛完成初評並開立計畫（1 次評估）
   每個計畫期間都有每日勾選紀錄（含團體），今天只記錄一部分，方便示範「今日勾選」
   ================================================================ */
const DEMO_GUIDE = [
  { id:'dl_c1', stage:'評估 3 次', text:'初評 → 再評 → 再評：三個時間點的功能與「最想做到的事」逐步進步，每次再評以 GAS 評定目標並修正計畫（v1 → v2 → v3）。', tabs:[['assess', '看三次評估趨勢'], ['check', '看每週執行率'], ['export', '看再評報告']] },
  { id:'dl_c2', stage:'評估 2 次', text:'輕度失智：最想做到的事只寫活動不打分數；再評一次後修正計畫，以認知、懷舊、運動團體搭配步行練習。', tabs:[['assess', '看評估'], ['check', '看執行與團體'], ['plan', '看計畫修正']] },
  { id:'dl_c3', stage:'剛開立計畫', text:'巴金森、坐輪椅、移位需中度協助：依評估建議的坐姿項目、團體與輔具開立計畫，剛開始累積紀錄。', tabs:[['assess', '看評估'], ['plan', '看計畫']] },
];
function loadDemo(){
  for (const c of COLLECTIONS) for (const r of Store.DB[c]) if (r.demo && !r.deleted) Store.remove(c, r.id); // 先清掉舊版示範資料
  if (!Store.DB.meta.orgType) Store.setMeta('orgType', '日間照顧');
  if (!Store.DB.meta.orgName) Store.setMeta('orgName', '示範機構（資料皆為虛構）');
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const T = todayISO(), ago = n => addDays(T, -n), put = (c, o) => Store.upsert(c, { ...o, demo:true });
  const keys = BARTHEL.map(x => x.k), staff = ['黃○英', '吳○明'];
  const C = [
    { id:'dl_c1', name:'王○蘭', gender:'女', birth:'1942-03-15', bed:'201-1', diagnosis:'腦中風（右側偏癱）、高血壓', aids:'四腳拐', caution:'右肩疼痛，勿拉扯右手', status:'服務中', consentDate:ago(170) },
    { id:'dl_c2', name:'陳○水', gender:'男', birth:'1938-08-02', bed:'201-2', diagnosis:'輕度失智症、高血壓', aids:'助行器', caution:'午後易焦躁，需提示方向', status:'服務中', consentDate:ago(100) },
    { id:'dl_c3', name:'張○雄', gender:'男', birth:'1950-11-20', bed:'203-1', diagnosis:'巴金森氏症、姿勢性低血壓', aids:'輪椅（短距離助行器）', caution:'起身前先坐 30 秒', status:'服務中' },
  ];
  C.forEach(c => put('clients', c));
  const mkA = (c, o) => {
    const a = { clientId:c.id, assessor:'林○君', role:'物理治療師', iadl:{}, spmsq:{ items:Array(10).fill(''), edu:'' }, pain:{}, physio:'', strength:'', expect:'', summary:'', ...o, adl:Object.fromEntries(keys.map((k, i) => [k, o.adl[i]])) };
    const sg = suggestFromAssessment(a, c); a.problemSel = Object.fromEntries(sg.map(s => [s.code, true])); a.problems = sg; a.customProblems = '';
    return put('assessments', a);
  };
  const it = (id, ex, o = {}) => ({ ...mkItem(ex), id, ...o });
  const grp = (type, freq, days, note = '') => ({ type, freq, note, days });
  const review = (pl, gid, gas, current, note) => { const g = pl.goals.find(x => x.id === gid); return { goalId:gid, planId:pl.id, activity:g.activity, text:g.text, measure:'', baseline:g.baseline, target:g.target, current, gas, note }; };
  // 「最近一個服務日」：今天有排定就是今天；日照遇到週末則是上週五
  let DD = T; while (!defaultDays().includes(weekday(DD))) DD = addDays(DD, -1);
  // 紀錄時間：個別項目在上午、團體在下午（依項目順序錯開）
  const ck = (p, x, d, i, status) => { const r = put('checks', { clientId:p.clientId, planId:p.id, itemId:x.id, date:d, status, by:staff[(i + d.charCodeAt(9)) % 2] }); const m = x.group ? 840 + i * 5 : 570 + i * 17; r.updatedAt = new Date(`${d}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`).toISOString(); };
  // 每日勾選：完成率隨時間提高（base→top）；個別項目與團體都記錄；最近一個服務日另外處理
  const fill = (p, from, to, base, top) => {
    const span = Math.max(1, diffDays(from, to));
    for (let d = from; d <= to && d < DD; d = addDays(d, 1)) checkables(p).forEach((x, i) => {
      if (!scheduled(p, x, d) || rnd() < 0.04) return;
      const okP = Math.min(0.95, base + (top - base) * diffDays(from, d) / span + (x.group ? 0.15 : 0)), r = rnd(); // 團體出席率通常較高
      ck(p, x, d, i, r < okP ? 'ok' : r < okP + (1 - okP) * 0.65 ? 'part' : 'skip');
    });
  };
  // 最近一個服務日只記錄約一半的項目（含團體），其餘留給使用者試點
  const fillToday = p => { const its = checkables(p).filter(x => scheduled(p, x, DD)); its.forEach((x, i) => { if (i % 2 === 0) ck(p, x, DD, i, i === 2 ? 'part' : 'ok'); }); };
  const notes = (p, list) => list.forEach(([d, n]) => put('weekNotes', { planId:p.id, clientId:p.clientId, week:weekStart(ago(d)), note:n, by:staff[d % 2] }));

  /* ---------- 1. 王○蘭：初評 → 再評 → 再評 ---------- */
  const W = C[0], wTxt = { physio:'右側偏癱，右手精細動作差；血壓穩定。', strength:'喜歡唱老歌、畫畫，個性積極。', expect:'女兒希望媽媽能自己上廁所，不要包尿布。', pain:{ nrs:3, site:'右肩' } };
  const w1 = mkA(W, { ...wTxt, date:ago(170), type:'初評', adl:[10, 10, 5, 0, 0, 10, 5, 5, 10, 10],
    phy:{ tug:24, cs30:5, grip:12, oneLeg:1, tandem:2, gait4:8.5, note:'使用四腳拐' },
    copm:[{ activity:'自己上廁所', area:'自我照顧', imp:10, perf:2, sat:2 }, { activity:'自己走去市場買菜', area:'自我照顧', imp:8, perf:1, sat:1 }, { activity:'畫畫', area:'休閒', imp:6, perf:4, sat:3 }],
    summary:'如廁需他人協助、下肢肌力與平衡不足、跌倒風險高；動機強，先以如廁自立為首要目標。' });
  const wp1 = put('plans', { id:'dl_p1', clientId:W.id, assessmentId:w1.id, version:1, status:'已結束', startDate:ago(168), endDate:ago(87), author:'林○君', role:'物理治療師', problems:[],
    goals:[newGoal({ id:'g1', activity:'自己上廁所', when:'12 週內', how:'扶著廁所扶手', assist:'在旁人監督下（不需碰觸）', scene:'白天自己去廁所，不再需要包尿布', measure:'每天 3 次中有 2 次成功', baseline:'需照服員扶持並協助拉褲子（自評表現 2/10）' }),
      newGoal({ id:'g2', activity:'自己走去市場買菜', when:'12 週內', how:'使用四腳拐', assist:'在旁人監督下（不需碰觸）', scene:'從房間走到餐廳，和大家一起吃午餐', measure:'中途不休息', baseline:'室內走 10 公尺就要休息（自評表現 1/10）' })],
    items:[it('i1', 'sit-to-stand', { dose:'5 下 × 2 組' }), it('i2', 'single-leg-stance-supported'), it('i3', 'toilet-transfer', { times:2 }), it('i4', 'button-board', { days:[1, 3, 5] }), it('i5', 'forward-walking-line', { executor:'治療師', days:[2, 4], dose:'10 公尺 × 2 趟' })],
    groups:[grp('運動團體', '每週 3 次', [1, 3, 5]), grp('藝術團體', '每週 1 次', [2], '喜歡畫畫')], devices:['馬桶扶手架', '防滑措施'], note:'女兒可於居家每天晚飯後陪同坐站 5 下。' });
  fill(wp1, wp1.startDate, wp1.endDate, 0.45, 0.7);
  notes(wp1, [[160, '右肩痛，扶桌單腳站常只做一半；如廁仍需協助拉褲子。'], [130, '坐站可做滿 5 下，偶爾頭暈休息。'], [100, '可扶扶手自己坐上馬桶，拉褲子仍需幫忙。']]);
  const w2 = mkA(W, { ...wTxt, date:ago(86), type:'再評', adl:[10, 10, 5, 5, 0, 10, 5, 10, 10, 10],
    phy:{ tug:19.5, cs30:7, grip:13, oneLeg:3, tandem:5, gait4:7.0, note:'使用四腳拐' },
    copm:[{ activity:'自己上廁所', area:'自我照顧', imp:10, perf:5, sat:5 }, { activity:'自己走去市場買菜', area:'自我照顧', imp:8, perf:2, sat:2 }, { activity:'畫畫', area:'休閒', imp:6, perf:5, sat:4 }],
    goalReview:[review(wp1, 'g1', -1, '監督下可坐上馬桶，拉褲子仍需少量協助', '有進步，尚未達成'), review(wp1, 'g2', 0, '可從房間走到餐廳，中途不休息', '達成')],
    summary:'坐站、TUG、平衡皆進步；室內步行目標達成。如廁仍需少量協助，延續並加強；步行目標往社區延伸。' });
  const wp2 = put('plans', { id:'dl_p1b', clientId:W.id, assessmentId:w2.id, version:2, copyOf:wp1.id, status:'已結束', startDate:ago(85), endDate:ago(3), author:'林○君', role:'物理治療師', problems:[],
    goals:[newGoal({ id:'g1', activity:'自己上廁所', when:'12 週內', how:'扶著廁所扶手', assist:'在旁人監督下（不需碰觸）', scene:'白天自己去廁所，不再需要包尿布', measure:'每天 3 次中有 2 次成功', baseline:'拉褲子仍需少量協助（自評表現 5/10）' }),
      newGoal({ id:'g2b', activity:'自己走去市場買菜', when:'12 週內', how:'使用四腳拐', assist:'在旁人監督下（不需碰觸）', scene:'從家門口走到巷口便利商店（約 100 公尺）買早餐', measure:'中途休息不超過 1 次', baseline:'可在室內走 30 公尺（自評表現 2/10）' })],
    items:[it('i1', 'sit-to-stand', { dose:'8 下 × 2 組' }), it('i2', 'single-leg-stance-supported'), it('i3', 'toilet-transfer', { times:2 }), it('i10', 'adl_dress', { days:[1, 3, 5] }), it('i5', 'forward-walking-line', { executor:'治療師', days:[2, 4], dose:'30 公尺 × 2 趟' })],
    groups:[grp('運動團體', '每週 3 次', [1, 3, 5]), grp('藝術團體', '每週 1 次', [2], '喜歡畫畫')], devices:['馬桶扶手架', '防滑措施'], note:'女兒陪同在家練習穿脫褲子。' });
  fill(wp2, wp2.startDate, wp2.endDate, 0.6, 0.85);
  notes(wp2, [[70, '如廁時已能自己拉褲子，只需在旁看著。'], [42, '走廊步行可達 60 公尺，中途休息 1 次。'], [14, '本週全部項目都完成，長輩說想試著去便利商店。']]);
  const w3 = mkA(W, { ...wTxt, pain:{ nrs:2, site:'右肩' }, date:ago(2), type:'再評', adl:[10, 10, 5, 10, 0, 15, 5, 10, 10, 10],
    phy:{ tug:15.8, cs30:9, grip:14, oneLeg:5, tandem:10, gait4:5.8, note:'使用四腳拐' }, physio:'右側偏癱，右手精細動作進步；血壓穩定。',
    copm:[{ activity:'自己上廁所', area:'自我照顧', imp:10, perf:7, sat:8 }, { activity:'自己走去市場買菜', area:'自我照顧', imp:8, perf:5, sat:5 }, { activity:'畫畫', area:'休閒', imp:6, perf:6, sat:6 }],
    goalReview:[review(wp2, 'g1', 1, '監督下可自行完成如廁，每天 3 次都成功', '已達成，略優於目標'), review(wp2, 'g2b', 0, '可走到巷口便利商店，中途休息 1 次', '達成')],
    summary:'如廁目標達成，改為維持；三次評估巴氏 65 → 75 → 85、TUG 24 → 19.5 → 15.8 秒，步行能力持續進步。目標延伸到市場買菜，並加入畫畫的生活目標。' });
  const wp3 = put('plans', { id:'dl_p1c', clientId:W.id, assessmentId:w3.id, version:3, copyOf:wp2.id, status:'執行中', startDate:ago(1), endDate:addDays(ago(1), 83), author:'林○君', role:'物理治療師', problems:[],
    goals:[newGoal({ id:'g2c', activity:'自己走去市場買菜', when:'12 週內', how:'使用四腳拐', assist:'可獨立', scene:'從家門口走到巷口市場，買一小袋菜回家煮給女兒吃', measure:'中途休息不超過 1 次', baseline:'可走到便利商店，中途休息 1 次（自評表現 5/10）' }),
      newGoal({ id:'g3', activity:'畫畫', when:'8 週內', how:'使用加粗握柄的畫筆', assist:'可獨立', scene:'用右手畫一張生日賀卡送給孫女', measure:'完成 1 件作品', baseline:'右手握筆 5 分鐘就累，作品要別人幫忙完成（自評表現 6/10）' })],
    items:[it('i1', 'sit-to-stand', { dose:'10 下 × 3 組' }), it('i6', 'tandem-stance'), it('i7', 'carry-light-object-walk', { days:[1, 3, 5] }), it('i8', 'walking-program', { executor:'治療師', days:[2, 4], dose:'10 分鐘' }), it('i9', 'grip-towel', { days:[1, 3, 5] })],
    groups:[grp('運動團體', '每週 3 次', [1, 3, 5]), grp('藝術團體', '每週 1 次', [2], '練習右手塗色')], devices:['防滑措施'], note:'如廁目標已達成，改為維持（照服員持續在旁監督）；新增持物步行為上市場做準備。' });
  fill(wp3, wp3.startDate, T, 0.75, 0.8); fillToday(wp3);

  /* ---------- 2. 陳○水：初評 → 再評 ---------- */
  const K = C[1], kTxt = { physio:'夜尿 2–3 次，聽力稍差。', strength:'喜歡下象棋、聊以前務農的事。', expect:'兒子希望爸爸維持走路能力、不要走失。', spmsq:{ items:['c', 'c', 'x', 'c', 'x', 'c', 'x', 'x', 'c', 'x'], edu:'low' } };
  const k1 = mkA(K, { ...kTxt, assessor:'陳○宏', role:'職能治療師', date:ago(100), type:'初評', adl:[10, 15, 5, 10, 0, 10, 5, 10, 10, 5],
    phy:{ tug:15.2, cs30:9, grip:24, oneLeg:4, tandem:8, gait4:5.8 },
    copm:[{ activity:'和朋友下象棋', area:'休閒', imp:9, perf:'', sat:'' }, { activity:'自己去公園散步', area:'休閒', imp:'', perf:'', sat:'' }],
    summary:'下肢肌力尚可，平衡與定向感需維持；無法穩定自評分數，最想做到的事只記錄活動。' });
  const kp1 = put('plans', { id:'dl_p2', clientId:K.id, assessmentId:k1.id, version:1, status:'已結束', startDate:ago(98), endDate:ago(15), author:'陳○宏', role:'職能治療師', problems:[],
    goals:[newGoal({ id:'g4', activity:'自己去公園散步', when:'12 週內', how:'使用助行器', assist:'在旁人監督下（不需碰觸）', scene:'從中心門口走到隔壁公園，和老朋友打招呼再走回來', measure:'每週 3 次、自己找到回來的路', baseline:'需陪同並提示方向' }),
      newGoal({ id:'g5', activity:'和朋友下象棋', when:'8 週內', how:'', assist:'在口頭提示下', scene:'在中心和老朋友下完一盤象棋', measure:'每週 2 次、全程參與', baseline:'下到一半會忘記輪到誰' })],
    items:[it('i20', 'sit-to-stand', { dose:'10 下 × 2 組' }), it('i21', 'standing-weight-shift'), it('i22', 'cloth-folding', { days:[1, 3, 5] }), it('i23', 'walking-program', { days:[1, 3, 5], dose:'到公園來回約 15 分鐘' })],
    groups:[grp('認知團體', '每週 2 次', [2, 4]), grp('懷舊團體', '每週 1 次', [3], '喜歡聊務農'), grp('運動團體', '每週 3 次', [1, 3, 5])], devices:['防走失定位裝置'] });
  fill(kp1, kp1.startDate, kp1.endDate, 0.5, 0.75);
  notes(kp1, [[80, '週三下午焦躁，散步改到上午後配合度變好。'], [45, '象棋可以下完一盤，需提醒輪到誰。'], [20, '散步回程在路口會猶豫，需要提示方向。']]);
  const k2 = mkA(K, { ...kTxt, assessor:'陳○宏', role:'職能治療師', date:ago(14), type:'再評', adl:[10, 15, 5, 10, 0, 10, 5, 10, 10, 5],
    phy:{ tug:13.8, cs30:10, grip:25, oneLeg:5, tandem:10, gait4:5.2 },
    copm:[{ activity:'和朋友下象棋', area:'休閒', imp:9, perf:'', sat:'' }, { activity:'自己去公園散步', area:'休閒', imp:'', perf:'', sat:'' }, { activity:'在中心當小幫手摺毛巾', area:'生產活動', imp:'', perf:'', sat:'' }],
    goalReview:[review(kp1, 'g4', -1, '可走到公園，回程路口需提示方向', '有進步，尚未達成'), review(kp1, 'g5', 0, '每週下 2 盤，全程參與', '達成')],
    summary:'體能維持並略進步（TUG 15.2 → 13.8 秒）；象棋目標達成改為維持，散步延續並增加路口辨識練習，新增擔任小幫手的生活角色。' });
  const kp2 = put('plans', { id:'dl_p2b', clientId:K.id, assessmentId:k2.id, version:2, copyOf:kp1.id, status:'執行中', startDate:ago(13), endDate:addDays(ago(13), 83), author:'陳○宏', role:'職能治療師', problems:[],
    goals:[newGoal({ id:'g4', activity:'自己去公園散步', when:'12 週內', how:'使用助行器，路口貼上記號', assist:'在旁人監督下（不需碰觸）', scene:'從中心門口走到隔壁公園，和老朋友打招呼再走回來', measure:'每週 3 次、自己找到回來的路', baseline:'回程路口需提示方向' }),
      newGoal({ id:'g7', activity:'在中心當小幫手摺毛巾', when:'8 週內', how:'', assist:'在口頭提示下', scene:'午餐後幫中心摺好大家的毛巾', measure:'每週 3 次、摺完 10 條', baseline:'摺 3 條就分心' })],
    items:[it('i20', 'sit-to-stand', { dose:'10 下 × 2 組' }), it('i21', 'standing-weight-shift'), it('i22', 'cloth-folding', { days:[1, 3, 5] }), it('i23', 'walking-program', { days:[1, 3, 5], dose:'到公園來回約 15 分鐘' })],
    groups:[grp('認知團體', '每週 2 次', [2, 4]), grp('懷舊團體', '每週 1 次', [3], '喜歡聊務農'), grp('運動團體', '每週 3 次', [1, 3, 5])], devices:['防走失定位裝置'] });
  fill(kp2, kp2.startDate, T, 0.7, 0.8); fillToday(kp2);
  notes(kp2, [[7, '摺毛巾可摺 6 條，會主動問還有沒有。']]);

  /* ---------- 3. 張○雄：剛完成初評並開立計畫 ---------- */
  const Z = C[2];
  const z1 = mkA(Z, { date:ago(6), type:'初評', adl:[5, 5, 0, 5, 0, 5, 0, 5, 10, 10],
    phy:{ tug:28, cs30:4, grip:20, oneLeg:0, tandem:0, note:'無法單腳站與前後腳站' }, pain:{ nrs:2, site:'下背' },
    physio:'步態小碎步、起步困難；起身易頭暈；吞嚥偶嗆咳。', strength:'以前是木工，手很巧。', expect:'太太希望他能自己移位，減輕照顧負擔。',
    copm:[{ activity:'自己從輪椅移到椅子', area:'自我照顧', imp:9, perf:3, sat:2 }, { activity:'做木工小物', area:'休閒', imp:6, perf:2, sat:3 }],
    summary:'移位與行走需中度協助，跌倒風險極高；以安全移位為優先，搭配手工藝團體維持手部功能與成就感。' });
  const zp = put('plans', { id:'dl_p3', clientId:Z.id, assessmentId:z1.id, version:1, status:'執行中', startDate:ago(4), endDate:addDays(ago(4), 83), author:'林○君', role:'物理治療師', problems:[],
    goals:[newGoal({ id:'g6', activity:'自己從輪椅移到椅子', when:'12 週內', how:'先坐 30 秒再起身，扶著椅子扶手', assist:'在少量協助下', scene:'從輪椅移到餐桌椅子上，和太太一起吃晚飯', measure:'每天午餐、晚餐各 1 次', baseline:'需中度協助（自評表現 3/10）' })],
    items:[it('i14', 'sit-pivot-transfer', { times:2 }), it('i15', 'sit-to-stand', { dose:'5 下 × 2 組', caution:'起身前先坐 30 秒，頭暈即停' }), it('i16', 'wc_brake'), it('i17', 'oral_exercise')],
    groups:[grp('手工藝團體', '每週 2 次', [2, 4], '木工、手作'), grp('社交團體', '每週 1 次', [5])], devices:['移位腰帶與人力移位吊帶', '移位滑板'] });
  fill(zp, zp.startDate, T, 0.4, 0.5); fillToday(zp);

  for (const pl of Store.all('plans').filter(x => x.demo)) { pl.problems = planProblemsFor(Store.get('assessments', pl.assessmentId), pl.goals).map(x => x.text); Store.upsert('plans', pl); }
  Store.flush(); renderShell(); toast('已載入 3 個模擬個案'); App.go('#/'); route();
}
function demoGuideHTML(){
  if (!Store.all('clients').some(c => c.demo)) return '';
  return `<section class="card guide"><h2>示範導覽 <small>三個模擬個案停在流程的不同階段，點按鈕直接看該步驟</small></h2>
    <div class="guide-grid">${DEMO_GUIDE.map((g, i) => { const c = Store.get('clients', g.id); if (!c) return ''; return `<div class="guide-c"><div class="gc-top"><span class="sn">${i + 1}</span><b>${esc(c.name)}</b>${badge(g.stage, 'green')}</div><small>${esc(c.diagnosis)}</small><p>${esc(g.text)}</p><div class="btn-row">${g.tabs.map(([t, l]) => `<a class="btn sm" href="#/client/${c.id}/${t}">${l}</a>`).join('')}</div></div>`; }).join('')}</div>
    <p class="hint">到「今日勾選」可看到最近一個服務日上午已記錄一部分、其餘待勾選的情形（週末會出現「看上一個排定日」按鈕），可以試著點點看。看完到「個案名冊」按「清除模擬個案」即可開始正式使用。</p></section>`;
}
