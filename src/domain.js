/* ================================================================
   領域資料：評估量表、常模、復能處方庫、建議規則、評鑑指標
   ================================================================ */

const PRO_ROLES = ['物理治療師','職能治療師','護理師','語言治療師','營養師','社工','個案管理/督導','其他'];
const EXECUTORS = ['照顧服務員','治療師','護理人員','個案自行（家屬協助）'];
const WEEKDAYS = ['','一','二','三','四','五','六','日'];
const CMS_LEVELS = ['','第1級','第2級','第3級','第4級','第5級','第6級','第7級','第8級'];

const ASSIST_LEVELS = ['獨立完成','監督/口頭提示','少量協助(<25%)','中度協助(25–50%)','大量協助(>50%)','完全依賴'];
const TOLERANCE = ['良好','尚可','疲累','不適停止'];
const SKIP_REASONS = ['個案請假/未到','身體不適','個案拒絕','時間不足/活動衝突','人力不足','其他'];

/* ---------- 巴氏量表 Barthel Index（衛福部版描述） ---------- */
const BARTHEL = [
  {k:'feeding', n:'進食', opts:[[10,'自己在合理時間內（約10秒吃一口）可用筷子取食眼前食物；若需進食輔具，會自行穿脫'],[5,'需別人幫忙穿脫輔具或只會用湯匙進食'],[0,'無法自行取食或耗費時間過長']]},
  {k:'transfer', n:'移位（輪椅↔床）', opts:[[15,'可獨立完成，包括輪椅煞車及移開腳踏板'],[10,'需要稍微協助（如輕扶以保持平衡）或需口頭指導'],[5,'可自行從床上坐起，但移位時仍需別人幫忙'],[0,'需別人幫忙方可坐起或移位']]},
  {k:'grooming', n:'個人衛生', opts:[[5,'可獨立完成洗臉、洗手、刷牙及梳頭髮'],[0,'需要別人幫忙']]},
  {k:'toilet', n:'如廁', opts:[[10,'可自行進出廁所，不弄髒衣物並能穿好衣服；使用便盆者可自行清理'],[5,'需幫忙保持平衡、整理衣物或使用衛生紙；使用便盆者可自取放但須他人清理'],[0,'需他人幫忙']]},
  {k:'bathing', n:'洗澡', opts:[[5,'可獨立完成（盆浴或沐浴）'],[0,'需別人幫忙']]},
  {k:'mobility', n:'平地走動', opts:[[15,'使用或不使用輔具皆可獨立行走50公尺以上'],[10,'需稍微扶持或口頭指導方可行走50公尺以上'],[5,'無法行走，但可獨立操作輪椅（含轉彎、進門、接近桌子床沿）並推行50公尺以上'],[0,'需別人幫忙']]},
  {k:'stairs', n:'上下樓梯', opts:[[10,'可自行上下樓梯（可抓扶手、用拐杖）'],[5,'需要稍微幫忙或口頭指導'],[0,'無法上下樓梯']]},
  {k:'dressing', n:'穿脫衣褲鞋襪', opts:[[10,'可自行穿脫衣服、鞋子及輔具'],[5,'在別人幫忙下，可自行完成一半以上動作'],[0,'需別人幫忙']]},
  {k:'bowel', n:'大便控制', opts:[[10,'不會失禁，並可自行使用塞劑'],[5,'偶爾失禁（每週不超過一次）或使用塞劑時需人幫助'],[0,'需別人處理']]},
  {k:'bladder', n:'小便控制', opts:[[10,'日夜皆不會尿失禁，或可自行使用並清理尿套'],[5,'偶爾尿失禁（每週不超過一次）或尿急，或需別人幫忙處理尿套'],[0,'需別人處理']]},
];
function barthelLevel(t){ if(t==null) return ''; if(t===100) return '獨立'; if(t>=91) return '輕度依賴'; if(t>=61) return '中度依賴'; if(t>=21) return '重度依賴'; return '完全依賴'; }

/* ---------- 工具性日常生活 Lawton IADL（原版二分計分） ---------- */
const IADL = [
  {k:'phone', n:'使用電話', opts:[['獨立使用電話，含查電話簿、撥號',1],['僅可撥熟悉的電話號碼',1],['僅會接電話，不會撥電話',1],['完全不會使用電話',0]]},
  {k:'shopping', n:'上街購物', opts:[['獨立完成所有購物需求',1],['獨立購買日常生活用品',0],['每次上街購物都需要有人陪',0],['完全不會上街購物',0]]},
  {k:'cooking', n:'備餐', opts:[['能獨立計畫、烹煮和擺設一頓適當的飯菜',1],['如果準備好一切佐料，會做一頓適當的飯菜',0],['會將已做好的飯菜加熱',0],['需要別人把飯菜煮好、擺好',0]]},
  {k:'housework', n:'處理家務', opts:[['能做較繁重的家事或需偶爾協助（如搬動沙發）',1],['能做較簡單的家事，如洗碗、鋪床、疊被',1],['能做家事，但不能達到可被接受的整潔程度',1],['所有家事都需要別人協助',1],['完全不會做家事',0]]},
  {k:'laundry', n:'洗衣服', opts:[['自己清洗所有衣物',1],['只清洗小件衣物',1],['完全依賴他人',0]]},
  {k:'transport', n:'外出（交通）', opts:[['能自己開車、騎車或搭乘大眾運輸',1],['能自己搭乘計程車，但不會搭乘大眾運輸',1],['有人陪同可搭乘大眾運輸',1],['只能在有人陪同下搭乘計程車或汽車',0],['完全不能出門',0]]},
  {k:'meds', n:'服用藥物', opts:[['能自己負責在正確時間服用正確藥物',1],['需要提醒或協助，如事先準備好服用份量',0],['無法自己服用藥物',0]]},
  {k:'finance', n:'處理財務', opts:[['可以獨立處理財務',1],['可處理日常購買，但需要別人協助與銀行往來或大宗買賣',1],['不能處理錢財',0]]},
];

/* ---------- 簡易心智狀態問卷 SPMSQ ---------- */
const SPMSQ = ['今天是幾年幾月幾日？','今天是星期幾？','這是什麼地方？','您的電話號碼（或住址）是？','您幾歲了？','您的出生年月日？','現任總統是誰？','前任總統是誰？','您媽媽姓什麼？','從20減3，再一直減3下去'];
const EDU_OPTS = [['low','小學（含）以下／不識字（容許多錯1題）'],['mid','國中～高中'],['high','高中以上（容許少錯1題）']];
function spmsqLevel(adj){ if(adj==null) return ''; if(adj<=2) return '心智功能完好'; if(adj<=4) return '輕度心智功能障礙'; if(adj<=7) return '中度心智功能障礙'; return '重度心智功能障礙'; }

/* ---------- 老人憂鬱量表 GDS-15（[題目, 計分答案]） ---------- */
const GDS15 = [
  ['您對目前的生活滿意嗎？','n'],['您是否減少很多活動和嗜好？','y'],['您是否覺得生活空虛？','y'],['您是否常常感到無聊？','y'],
  ['您是否大部分時間精神都很好？','n'],['您是否害怕將有不幸的事情發生在您身上？','y'],['您是否大部分時間都感到快樂？','n'],
  ['您是否常感到無助？','y'],['您是否比較喜歡待在家裡，而不喜歡外出做新的事？','y'],['您是否覺得您比大多數人有較多記憶的問題？','y'],
  ['您是否覺得「現在還活著」是很好的事？','n'],['您是否覺得自己現在活得很沒有價值？','y'],['您是否覺得精力很充沛？','n'],
  ['您是否覺得自己的處境沒有希望？','y'],['您是否覺得大部分的人都比您幸福？','y'],
];

/* ---------- 迷你營養評估簡表 MNA-SF ---------- */
const MNASF = [
  {k:'A', n:'過去三個月食量是否因食慾不振、消化、咀嚼或吞嚥問題而減少？', opts:[[0,'食量嚴重減少'],[1,'食量中度減少'],[2,'食量沒有改變']]},
  {k:'B', n:'過去三個月體重下降情形', opts:[[0,'大於3公斤'],[1,'不知道'],[2,'1～3公斤'],[3,'體重沒有下降']]},
  {k:'C', n:'行動力', opts:[[0,'臥床或依賴輪椅'],[1,'可下床或離開輪椅，但不能外出'],[2,'可以外出']]},
  {k:'D', n:'過去三個月內有無受到心理創傷或急性疾病？', opts:[[0,'是'],[2,'否']]},
  {k:'E', n:'神經心理問題', opts:[[0,'嚴重失智或抑鬱'],[1,'輕度失智'],[2,'沒有精神心理問題']]},
];
function mnaLevel(t){ if(t==null) return ''; if(t>=12) return '營養狀況正常'; if(t>=8) return '有營養不良風險'; return '營養不良'; }

/* ---------- 體能常模 ---------- */
// 30秒坐站：低於此次數＝低於同齡平均（Rikli & Jones；CDC STEADI）
const CS30_NORM = { M:[[60,14],[65,12],[70,12],[75,11],[80,10],[85,8],[90,7]], F:[[60,12],[65,11],[70,10],[75,10],[80,9],[85,8],[90,4]] };
function cs30Cut(age, sex){ const t=CS30_NORM[sex==='男'?'M':'F']; let c=t[0][1]; for(const [a,v] of t){ if(age>=a) c=v; } return c; }
const PHY_CUT = { tandem:10, tug:13.5, gripM:28, gripF:18, gait:1.0, oneLeg:5, cs5:12 }; // TUG≥13.5s 跌倒風險；AWGS 2019 肌少症切點

/* ---------- 最想做到的事（參考 COPM：加拿大職能表現測量） ---------- */
const COPM_AREAS = [
  ['自我照顧', '個人照顧（穿衣、洗澡、進食、如廁）、功能性移動（移位、室內外走動）、社區生活（交通、購物、理財）', ['自己上廁所', '自己洗澡', '自己穿衣服', '自己吃飯', '自己從床上起來', '自己走到客廳／餐廳', '自己出門搭車', '自己去市場買菜']],
  ['生產活動', '家務（煮飯、打掃、洗衣）、工作／志工、照顧家人或寵物', ['煮一道拿手菜', '自己洗衣服、晾衣服', '掃地整理房間', '幫忙照顧孫子', '照顧寵物', '去當志工']],
  ['休閒', '靜態休閒（閱讀、手作、看電視）、動態休閒（散步、運動、旅遊）、社交（拜訪親友、宗教活動、聚會）', ['去公園散步', '去廟裡拜拜／上教會', '和朋友聊天、打麻將', '種花種菜', '唱歌', '寫書法、畫畫', '和家人出去旅遊']],
];
const COPM_KW = [
  [/廁|尿|便/, ['toilet-transfer', 'adl_toilet']], [/洗澡|沐浴|洗頭/, ['shower-step-entry']], [/穿|衣服|鞋|襪|鈕/, ['adl_dress', 'button-board']],
  [/吃|飯|進食|筷|湯匙/, ['adl_feed', 'spoon-scoop']], [/起床|翻身|坐起|床上/, ['bed-rolling', 'supine-to-sit']],
  [/走|散步|市場|出門|公園|逛|旅遊|搭車/, ['forward-walking-line', 'walking-program', 'sit-to-stand']], [/樓梯|上樓|爬/, ['step-up', 'stair-descent-practice']],
  [/煮|菜|廚|料理/, ['kitchen-task-sequence', 'counter-reaching-standing']], [/洗衣|晾|摺|掃|整理|家務/, ['cloth-folding', 'laundry-basket-lift']],
  [/拜拜|廟|教會|朋友|麻將|聚會|聊天/, [], ['社交團體']], [/唱歌|音樂/, [], ['音樂團體']], [/書法|畫|手工|編織/, ['peg-transfer', 'grip-towel'], ['藝術團體', '手工藝團體']], [/種|園藝|花/, ['grip-towel'], ['園藝團體']],
];
const copmRows = a => (a?.copm || []).filter(x => x.activity && String(x.activity).trim());
const copmAvg = (a, k) => { const v = copmRows(a).map(x => x[k]).filter(x => x !== '' && x != null).map(Number); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 10) / 10 : null; };

/* ---------- 評估結果 → 問題、建議介入、輔具、團體 ---------- */
const GROUP_TYPES = ['運動團體','認知團體','懷舊團體','社交團體','手工藝團體','藝術團體','音樂團體','園藝團體'];
function suggestFromAssessment(a, client){
  const out=[]; if(!a) return out;
  const add=(code,text,ex,dev,grp,ref)=>{ if(!out.find(o=>o.code===code)) out.push({code,text,ex:ex||[],dev:dev||[],grp:grp||[],referral:ref||''}); };
  copmRows(a).slice().sort((x,y)=>(+y.imp||0)-(+x.imp||0)).forEach((c,ix)=>{ const ex=[],grp=[]; COPM_KW.forEach(([re,e,g])=>{ if(re.test(c.activity)){ ex.push(...e); grp.push(...(g||[])); } });
    add('copm'+ix,'最想做到：'+c.activity+(c.perf!==''&&c.perf!=null?`（目前表現 ${c.perf}/10）`:''),[...new Set(ex)],[],[...new Set(grp)]); });
  const b=a.adl||{}, has=k=>b[k]!==''&&b[k]!=null;
  if(has('transfer')&&+b.transfer<15) add('transfer','移位能力受限（巴氏移位 '+b.transfer+' 分）',['sit-to-stand','sit-pivot-transfer'],['移位腰帶與人力移位吊帶','移位滑板','床邊扶手與起身拉繩']);
  if(has('mobility')&&+b.mobility<15) add('mobility','平地行走能力受限（巴氏走動 '+b.mobility+' 分）',['forward-walking-line','standing-weight-shift','adl_walkmeal'],+b.mobility<=5?['手動輪椅（一般型）','前輪助行器']:['四腳拐','前輪助行器','四輪助步車'],['運動團體']);
  if(has('stairs')&&+b.stairs<10) add('stairs','上下樓梯能力受限',['step-up','stair-descent-practice'],['固定式扶手']);
  if(has('toilet')&&+b.toilet<10) add('toilet','如廁需協助',['toilet-transfer','adl_toilet'],['馬桶增高器','馬桶扶手架']);
  if(has('bathing')&&+b.bathing<5) add('bath','洗澡需協助',['shower-step-entry'],['洗澡椅','長柄沐浴刷','防滑措施']);
  if(has('dressing')&&+b.dressing<10) add('dressing','穿脫衣需協助',['adl_dress','button-board','zipper-practice','sock-aid-practice'],['穿襪輔助器','長柄鞋拔','扣鈕器與拉鍊環','易穿脫衣物']);
  if(has('feeding')&&+b.feeding<10) add('feeding','進食需協助',['adl_feed','spoon-scoop','cup-to-mouth','oral_exercise'],['加粗握柄餐具','防滑餐墊','斜底碗與護緣盤','缺口杯']);
  if(has('grooming')&&+b.grooming<5) add('grooming','個人衛生需協助',['adl_groom','reaching-cup']);
  if((has('bladder')&&+b.bladder<10)||(has('bowel')&&+b.bowel<10)) add('contin','排泄控制問題',['adl_toiletschedule'],['便盆椅','床上便盆與尿壺'],[],'護理人員評估排泄問題');
  const p=a.phy||{}, ag=client?ageAt(client.birth,a.date):null, v=k=>p[k]!==''&&p[k]!=null;
  if((v('tug')&&+p.tug>=PHY_CUT.tug)||(v('oneLeg')&&+p.oneLeg<PHY_CUT.oneLeg)||(v('tandem')&&+p.tandem<PHY_CUT.tandem)) add('fall','跌倒高風險（TUG／單腳站／前後腳站未達標）',['single-leg-stance-supported','tandem-stance','standing-weight-shift','sit-to-stand'],['防滑措施','感應夜燈與大面板開關','髖部保護褲'],['運動團體']);
  if((v('cs30')&&ag&&+p.cs30<cs30Cut(ag,client.gender))||(v('cs5')&&+p.cs5>=PHY_CUT.cs5)) add('legstr','下肢肌力不足（坐站測試低於同齡常模）',['sit-to-stand','long-arc-quad','heel-raise','hip-abduction-standing'],[],['運動團體']);
  if(v('grip')&&client&&+p.grip<(client.gender==='男'?PHY_CUT.gripM:PHY_CUT.gripF)) add('grip','握力不足（AWGS 肌少症切點以下）',['grip-towel','pinch-clip','theraband-row'],[],['手工藝團體'],'營養評估（蛋白質攝取）');
  if(v('gait4')&&+p.gait4>0&&4/(+p.gait4)<PHY_CUT.gait) add('gait','步行速度慢（<1.0 m/s）',['walking-program','forward-walking-line']);
  const i=a.iadl||{}, iz=k=>i[k]!==''&&i[k]!=null&&IADL.find(x=>x.k===k).opts[+i[k]]?.[1]===0;
  if(iz('meds')) add('meds','服藥管理需協助',['iadl_meds']);
  if(iz('cooking')) add('cook','備餐能力下降',['kitchen-task-sequence','counter-reaching-standing']);
  if(iz('housework')||iz('laundry')) add('house','家務能力下降',['cloth-folding','laundry-basket-lift']);
  const sp=scoreSPMSQ(a); if(sp&&sp.adj>=3) add('cog','認知功能退化（SPMSQ：'+spmsqLevel(sp.adj)+'）',['cog_ro'],sp.adj>=5?['防走失定位裝置']:[],['認知團體','懷舊團體'], sp.adj>=5&&!client?.dementia?'建議就醫確認失智症診斷':'');
  if(a.pain&&+a.pain.nrs>=4) add('pain','疼痛影響活動（NRS '+a.pain.nrs+'）',['seated-posture-reset','upper-trap-stretch'],[],[],'醫師／物理治療師評估疼痛');
  return out;
}

/* ---------- 計分 ---------- */
function scoreBarthel(a){ const b=a?.adl; if(!b) return null; let t=0,n=0; for(const it of BARTHEL){ const v=b[it.k]; if(v===''||v==null) continue; t+=+v; n++; } return n===BARTHEL.length?{total:t,level:barthelLevel(t)}:(n?{total:t,partial:true,level:'未完成('+n+'/10)'}:null); }
function scoreIADL(a){ const b=a?.iadl; if(!b) return null; let t=0,n=0; for(const it of IADL){ const v=b[it.k]; if(v===''||v==null) continue; const o=it.opts[+v]; if(!o) continue; t+=o[1]; n++; } return n?{total:t,partial:n<IADL.length}:null; }
function scoreSPMSQ(a){ const s=a?.spmsq; if(!s||!s.items) return null; const ans=s.items.filter(x=>x==='c'||x==='x'); if(ans.length<SPMSQ.length) return ans.length?{errors:s.items.filter(x=>x==='x').length,partial:true,adj:null}:null; const e=s.items.filter(x=>x==='x').length; let adj=e; if(s.edu==='low') adj=Math.max(0,e-1); if(s.edu==='high') adj=e+1; return {errors:e,adj}; }
function scoreGDS(a){ const g=a?.gds; if(!g) return null; let t=0,n=0; GDS15.forEach((q,ix)=>{ const v=g[ix]; if(v!=='y'&&v!=='n') return; n++; if(v===q[1]) t++; }); return n===15?{total:t}:(n?{total:t,partial:true}:null); }
function scoreMNA(a){ const m=a?.mna; if(!m) return null; let t=0; for(const it of MNASF){ if(m[it.k]===''||m[it.k]==null) return null; t+=+m[it.k]; } let f=null; const bmi=calcBMI(a); if(bmi!=null) f=bmi<19?0:bmi<21?1:bmi<23?2:3; else if(m.calf!==''&&m.calf!=null) f=+m.calf<31?0:3; if(f==null) return null; return {total:t+f}; }
function calcBMI(a){ const p=a?.phy||{}; if(!+p.height||!+p.weight) return null; const h=+p.height/100; return Math.round(+p.weight/(h*h)*10)/10; }
function gaitSpeed(a){ const s=+a?.phy?.gait4; return s>0?Math.round(4/s*100)/100:null; }
function ageAt(birth, iso){ if(!birth) return null; const b=new Date(birth+'T00:00:00'), d=iso?new Date(iso+'T00:00:00'):new Date(); let y=d.getFullYear()-b.getFullYear(); if(d.getMonth()<b.getMonth()||(d.getMonth()===b.getMonth()&&d.getDate()<b.getDate())) y--; return y; }

/* 目標達成量表 GAS */
const GAS = [[-2,'-2 比原本退步'],[-1,'-1 有進步但未達目標'],[0,'0 達成預期目標'],[1,'+1 略優於目標'],[2,'+2 遠超過目標']];
