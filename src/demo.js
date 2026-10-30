/* ================================================================
   示範資料（虛構、去識別化；標記 demo:true，可一鍵清除）
   ================================================================ */
function loadDemo(){
  if (!Store.DB.meta.orgType) Store.setMeta('orgType', '日間照顧');
  if (!Store.DB.meta.orgName) Store.setMeta('orgName', '示範機構（資料皆為虛構）');
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const T = todayISO(), ago = n => addDays(T, -n), put = (c, o) => Store.upsert(c, { ...o, demo:true });
  const days = defaultDays();
  const C = [
    { id:'dl_c1', name:'王○蘭', gender:'女', birth:'1942-03-15', bed:'201-1', diagnosis:'腦中風（右側偏癱）、高血壓', aids:'四腳拐', caution:'右肩疼痛，勿拉扯右手', status:'服務中' },
    { id:'dl_c2', name:'陳○水', gender:'男', birth:'1938-08-02', bed:'201-2', diagnosis:'輕度失智症、高血壓', aids:'助行器', caution:'午後易焦躁', status:'服務中' },
    { id:'dl_c3', name:'張○雄', gender:'男', birth:'1950-11-20', bed:'203-1', diagnosis:'巴金森氏症、姿勢性低血壓', aids:'輪椅', caution:'起身前先坐 30 秒', status:'服務中' },
    { id:'dl_c4', name:'林○玉', gender:'女', birth:'1945-05-09', bed:'205-2', diagnosis:'雙膝退化性關節炎、糖尿病', aids:'', caution:'膝痛時減量', status:'服務中' },
  ];
  C.forEach(c => put('clients', c));
  const keys = BARTHEL.map(x => x.k);
  const mkA = (c, d, type, adl, phy, txt) => { const a = { clientId:c.id, date:ago(d), type, assessor:'林○君', role:'物理治療師', adl:Object.fromEntries(keys.map((k, i) => [k, adl[i]])), iadl:{}, spmsq:{ items:Array(10).fill(''), edu:'' }, phy, pain:{ nrs:txt.pain || 0, site:txt.site || '' }, physio:txt.physio, strength:txt.strength, expect:txt.expect, summary:txt.summary }; const sg = suggestFromAssessment(a, c); a.problemSel = Object.fromEntries(sg.map(s => [s.code, true])); a.problems = sg; a.customProblems = ''; return put('assessments', a); };
  const it = (id, ex, o) => ({ ...mkItem(ex), id, ...o });

  const a1 = mkA(C[0], 30, '初評', [10, 10, 5, 5, 0, 10, 5, 5, 10, 10], { tug:20.5, cs30:6, grip:13, oneLeg:2, gait4:7.5, note:'使用四腳拐' }, { physio:'右側偏癱，右手精細動作差；血壓穩定。', strength:'喜歡唱老歌，個性積極。', expect:'希望自己上廁所、穿褲子。', summary:'移位與如廁需少量協助，下肢肌力與平衡不足，跌倒風險高。', pain:3, site:'右肩' });
  put('plans', { id:'dl_p1', clientId:C[0].id, assessmentId:a1.id, version:1, status:'執行中', startDate:ago(28), endDate:addDays(ago(28), 83), author:'林○君', role:'物理治療師', problems:a1.problems.map(p => p.text),
    goals:[{ id:'g1', text:'12 週後 30 秒坐站由 6 次進步到 9 次', measure:'30秒坐站', baseline:'6 次', target:'9 次' }, { id:'g2', text:'在監督下自行完成如廁穿脫褲', measure:'巴氏如廁', baseline:'5 分', target:'10 分' }],
    items:[it('i1', 'str_sitstand', { dose:'8下 × 2組', executor:'照顧服務員' }), it('i2', 'bal_chair_oneleg', { dose:'每側5秒 × 3次', executor:'照顧服務員' }), it('i3', 'adl_toilet', { executor:'照顧服務員', times:2 }), it('i4', 'end_walk', { dose:'20公尺 × 2趟', executor:'治療師', days:[2, 4] })], note:'家屬可於居家每天晚飯後陪同坐站 10 下。' });

  const a2 = mkA(C[1], 25, '初評', [10, 15, 5, 10, 0, 10, 5, 10, 10, 5], { tug:15.2, cs30:9, grip:24, oneLeg:4, gait4:5.8 }, { physio:'夜尿 2–3 次，聽力稍差。', strength:'喜歡下象棋。', expect:'家屬希望維持行走能力。', summary:'下肢肌力尚可，平衡與認知需維持。' });
  put('plans', { id:'dl_p2', clientId:C[1].id, assessmentId:a2.id, version:1, status:'執行中', startDate:ago(23), endDate:addDays(ago(23), 83), author:'陳○宏', role:'職能治療師', problems:a2.problems.map(p => p.text),
    goals:[{ id:'g3', text:'維持 30 秒坐站 9 次以上', measure:'30秒坐站', baseline:'9 次', target:'≥9 次' }],
    items:[it('i5', 'str_sitstand', { dose:'10下 × 2組' }), it('i6', 'cog_ro', { executor:'照顧服務員' }), it('i7', 'cog_game', { dose:'象棋 20 分鐘', days:[1, 3, 5] })] });

  const a3 = mkA(C[2], 20, '初評', [5, 5, 0, 5, 0, 5, 0, 5, 10, 10], { tug:28, cs30:4, grip:20, oneLeg:0, note:'無法單腳站' }, { physio:'步態小碎步，起身易頭暈；吞嚥偶嗆咳。', strength:'以前是木工，手很巧。', expect:'太太希望他能自己移位。', summary:'移位與行走需中度協助，跌倒風險極高。' });
  put('plans', { id:'dl_p3', clientId:C[2].id, assessmentId:a3.id, version:1, status:'執行中', startDate:ago(18), endDate:addDays(ago(18), 83), author:'林○君', role:'物理治療師', problems:a3.problems.map(p => p.text),
    goals:[{ id:'g4', text:'輪椅↔椅子移位由中度協助進步到少量協助', measure:'移位協助程度', baseline:'中度協助', target:'少量協助' }],
    items:[it('i8', 'adl_transfer', { executor:'照顧服務員', times:2 }), it('i9', 'str_sitstand', { dose:'5下 × 2組', caution:'起身前先坐30秒，頭暈即停' }), it('i10', 'oral_exercise', { executor:'照顧服務員' })] });

  // 個別檢核紀錄
  for (const pid of ['dl_p1', 'dl_p2', 'dl_p3']) {
    const p = Store.get('plans', pid);
    for (let d = p.startDate; d < T; d = addDays(d, 1)) for (const x of p.items) if (x.days.includes(weekday(d)) && rnd() > 0.06) { const r = rnd(); put('checks', { clientId:p.clientId, planId:pid, itemId:x.id, date:d, status:r < 0.75 ? 'ok' : r < 0.9 ? 'part' : 'skip', by:rnd() > 0.5 ? '黃○英' : '吳○明' }); }
    put('weekNotes', { planId:pid, clientId:p.clientId, week:weekStart(ago(7)), note:'週三身體不適請假一天，其餘配合良好。', by:'黃○英' });
  }

  // 團體
  const g = put('groups', { id:'dl_g1', name:'下肢肌力防跌班', type:'肌力訓練', goal:'12 週後成員 30 秒坐站平均增加 2 次，減少跌倒。', criteria:'可坐姿維持 30 分鐘、能聽從口令、無急性疼痛。', leader:'林○君', helpers:'照服員 2 名', days:isRes() ? [2, 4] : [1, 3, 5], time:'10:00', duration:40, place:'一樓活動室', startDate:ago(21), endDate:addDays(ago(21), 83), status:'進行中',
    members:C.map(c => c.id), memberNotes:{ dl_c3:'坐姿進行，起身前先坐30秒', dl_c4:'膝痛時改坐姿踏步' },
    flow:[{ ...mkFlow('warm_joint'), id:'f1' }, { ...mkFlow('str_sitstand'), id:'f2', dose:'10下 × 2組' }, { ...mkFlow('grp_band'), id:'f3' }, { ...mkFlow('bal_weightshift'), id:'f4' }, { ...mkFlow('cool_stretch'), id:'f5' }],
    precautions:'活動前量血壓；出現胸悶、頭暈立即停止；每 15 分鐘提醒喝水。' });
  const lv = ['主動', '主動', '主動', '需提示', '需協助'];
  for (let d = g.startDate; d < T; d = addDays(d, 1)) if (g.days.includes(weekday(d))) {
    const att = {}; C.forEach(c => { att[c.id] = rnd() > 0.1 ? { present:true, level:c.id === 'dl_c3' ? '需協助' : lv[Math.floor(rnd() * lv.length)], tol:rnd() > 0.15 ? '良好' : '疲累' } : { present:false, note:'請假' }; });
    put('sessions', { groupId:g.id, date:d, att, done:{ f1:true, f2:true, f3:true, f4:rnd() > 0.2, f5:true }, leader:'林○君', note:rnd() > 0.5 ? '整體參與度佳，彈力帶可升級為紅色。' : '' });
  }
  Store.flush(); renderShell(); toast('已載入示範資料'); App.go('#/'); route();
}
