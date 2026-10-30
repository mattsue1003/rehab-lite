/* ================================================================
   示範資料（虛構、去識別化；標記 demo:true，可一鍵清除）
   ================================================================ */
function loadDemo(){
  if (!Store.DB.meta.orgType) Store.setMeta('orgType', '日間照顧');
  if (!Store.DB.meta.orgName) Store.setMeta('orgName', '示範機構（資料皆為虛構）');
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const T = todayISO(), ago = n => addDays(T, -n), put = (c, o) => Store.upsert(c, { ...o, demo:true });
  const C = [
    { id:'dl_c1', name:'王○蘭', gender:'女', birth:'1942-03-15', bed:'201-1', diagnosis:'腦中風（右側偏癱）、高血壓', aids:'四腳拐', caution:'右肩疼痛，勿拉扯右手', status:'服務中' },
    { id:'dl_c2', name:'陳○水', gender:'男', birth:'1938-08-02', bed:'201-2', diagnosis:'輕度失智症、高血壓', aids:'助行器', caution:'午後易焦躁', status:'服務中' },
    { id:'dl_c3', name:'張○雄', gender:'男', birth:'1950-11-20', bed:'203-1', diagnosis:'巴金森氏症、姿勢性低血壓', aids:'輪椅', caution:'起身前先坐 30 秒', status:'服務中' },
    { id:'dl_c4', name:'林○玉', gender:'女', birth:'1945-05-09', bed:'205-2', diagnosis:'雙膝退化性關節炎、糖尿病', aids:'', caution:'膝痛時減量', status:'服務中' },
  ];
  C.forEach(c => put('clients', c));
  const keys = BARTHEL.map(x => x.k);
  const mkA = (c, d, adl, phy, txt, extra = {}) => { const a = { clientId:c.id, date:ago(d), type:'初評', assessor:'林○君', role:'物理治療師', adl:Object.fromEntries(keys.map((k, i) => [k, adl[i]])), iadl:{}, spmsq:{ items:Array(10).fill(''), edu:'' }, phy, pain:{ nrs:txt.pain || 0, site:txt.site || '' }, physio:txt.physio, strength:txt.strength, expect:txt.expect, summary:txt.summary, ...extra }; const sg = suggestFromAssessment(a, c); a.problemSel = Object.fromEntries(sg.map(s => [s.code, true])); a.problems = sg; a.customProblems = ''; return put('assessments', a); };
  const it = (id, ex, o = {}) => ({ ...mkItem(ex), id, ...o });

  const a1 = mkA(C[0], 30, [10, 10, 5, 5, 0, 10, 5, 5, 10, 10], { tug:20.5, cs30:6, grip:13, oneLeg:2, tandem:4, gait4:7.5, note:'使用四腳拐' }, { physio:'右側偏癱，右手精細動作差；血壓穩定。', strength:'喜歡唱老歌、畫畫，個性積極。', expect:'女兒希望媽媽能自己上廁所。', summary:'移位與如廁需少量協助，下肢肌力與平衡不足，跌倒風險高。', pain:3, site:'右肩' }, { copm:[{ activity:'自己上廁所', area:'自我照顧', imp:10, perf:3, sat:2 }, { activity:'自己走去市場買菜', area:'自我照顧', imp:8, perf:2, sat:2 }, { activity:'畫畫', area:'休閒', imp:6, perf:5, sat:4 }] });
  put('plans', { id:'dl_p1', clientId:C[0].id, assessmentId:a1.id, version:1, status:'執行中', startDate:ago(28), endDate:addDays(ago(28), 83), author:'林○君', role:'物理治療師', problems:a1.problems.map(p => p.text),
    goals:[newGoal({ id:'g1', activity:'自己上廁所', when:'12 週內', how:'扶著廁所扶手', assist:'在旁人監督下（不需碰觸）', scene:'自己走進廁所、穿脫褲子並完成如廁', measure:'每天 3 次中有 2 次成功', baseline:'需照服員扶持並協助拉褲子（自評表現 3/10）' }), newGoal({ id:'g2', activity:'自己走去市場買菜', when:'3 個月內', how:'使用四腳拐', assist:'在旁人監督下（不需碰觸）', scene:'從家門口走到巷口市場（約 200 公尺）', measure:'中途休息不超過 1 次', baseline:'只能在室內走 20 公尺（自評表現 2/10）' })],
    items:[it('i1', 'sit-to-stand', { dose:'8 下 × 2 組' }), it('i2', 'single-leg-stance-supported'), it('i3', 'toilet-transfer', { times:2 }), it('i4', 'button-board', { days:[1, 3, 5] }), it('i5', 'forward-walking-line', { executor:'治療師', days:[2, 4] })],
    groups:[{ type:'運動團體', freq:'每週 3 次', note:'' }, { type:'藝術團體', freq:'每週 1 次', note:'喜歡畫畫' }], devices:['馬桶扶手架', '扣鈕器與拉鍊環', '防滑措施'], note:'家屬可於居家每天晚飯後陪同坐站 10 下。' });

  const a2 = mkA(C[1], 25, [10, 15, 5, 10, 0, 10, 5, 10, 10, 5], { tug:15.2, cs30:9, grip:24, oneLeg:4, tandem:8, gait4:5.8 }, { physio:'夜尿 2–3 次，聽力稍差。', strength:'喜歡下象棋、聊以前務農的事。', expect:'家屬希望維持行走能力。', summary:'下肢肌力尚可，平衡與認知需維持。' }, { spmsq:{ items:['c', 'c', 'x', 'c', 'x', 'c', 'x', 'x', 'c', 'x'], edu:'low' }, copm:[{ activity:'和朋友下象棋', area:'休閒', imp:9, perf:5, sat:4 }, { activity:'自己去公園散步', area:'休閒', imp:7, perf:6, sat:5 }] });
  put('plans', { id:'dl_p2', clientId:C[1].id, assessmentId:a2.id, version:1, status:'執行中', startDate:ago(23), endDate:addDays(ago(23), 83), author:'陳○宏', role:'職能治療師', problems:a2.problems.map(p => p.text),
    goals:[newGoal({ id:'g3', activity:'自己去公園散步', when:'12 週內', how:'使用助行器', assist:'在旁人監督下（不需碰觸）', scene:'從中心門口走到隔壁公園繞一圈', measure:'每週 3 次、全程不迷路', baseline:'需陪同並提示方向（自評表現 6/10）' })],
    items:[it('i6', 'sit-to-stand', { dose:'10 下 × 2 組' }), it('i7', 'standing-weight-shift'), it('i8', 'cloth-folding', { days:[1, 3, 5] })],
    groups:[{ type:'認知團體', freq:'每週 2 次', note:'' }, { type:'懷舊團體', freq:'每週 1 次', note:'' }, { type:'運動團體', freq:'每週 3 次', note:'' }], devices:['防走失定位裝置'] });

  const a3 = mkA(C[2], 20, [5, 5, 0, 5, 0, 5, 0, 5, 10, 10], { tug:28, cs30:4, grip:20, oneLeg:0, tandem:0, note:'無法單腳站' }, { physio:'步態小碎步，起身易頭暈；吞嚥偶嗆咳。', strength:'以前是木工，手很巧。', expect:'太太希望他能自己移位。', summary:'移位與行走需中度協助，跌倒風險極高。' }, { copm:[{ activity:'自己從輪椅移到椅子', area:'自我照顧', imp:9, perf:3, sat:2 }, { activity:'做木工小物', area:'休閒', imp:6, perf:2, sat:3 }] });
  put('plans', { id:'dl_p3', clientId:C[2].id, assessmentId:a3.id, version:1, status:'執行中', startDate:ago(18), endDate:addDays(ago(18), 83), author:'林○君', role:'物理治療師', problems:a3.problems.map(p => p.text),
    goals:[newGoal({ id:'g4', activity:'自己從輪椅移到椅子', when:'12 週內', how:'先坐 30 秒再起身，扶著椅子扶手', assist:'在少量協助下', scene:'從輪椅移到餐桌椅子上吃飯', measure:'每天午餐、晚餐各 1 次', baseline:'需中度協助（自評表現 3/10）' })],
    items:[it('i9', 'sit-pivot-transfer', { times:2 }), it('i10', 'sit-to-stand', { dose:'5 下 × 2 組', caution:'起身前先坐 30 秒，頭暈即停' }), it('i11', 'metronome-stepping'), it('i12', 'oral_exercise')],
    groups:[{ type:'手工藝團體', freq:'每週 2 次', note:'木工、手作' }, { type:'社交團體', freq:'每週 1 次', note:'' }], devices:['移位腰帶與人力移位吊帶', '移位滑板'] });

  for (const pid of ['dl_p1', 'dl_p2', 'dl_p3']) {
    const p = Store.get('plans', pid);
    for (let d = p.startDate; d < T; d = addDays(d, 1)) for (const x of p.items) if (scheduled(p, x, d) && rnd() > 0.06) { const r = rnd(); put('checks', { clientId:p.clientId, planId:pid, itemId:x.id, date:d, status:r < 0.75 ? 'ok' : r < 0.9 ? 'part' : 'skip', by:rnd() > 0.5 ? '黃○英' : '吳○明' }); }
    put('weekNotes', { planId:pid, clientId:p.clientId, week:weekStart(ago(7)), note:'週三身體不適請假一天，其餘配合良好。', by:'黃○英' });
  }
  Store.flush(); renderShell(); toast('已載入示範資料'); App.go('#/'); route();
}
