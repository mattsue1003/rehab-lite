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
const PHY_CUT = { tug:13.5, gripM:28, gripF:18, gait:1.0, oneLeg:5, cs5:12 }; // TUG≥13.5s 跌倒風險；AWGS 2019 肌少症切點

/* ---------- 復能處方庫 ---------- */
const EX_CATS = ['暖身/緩和','肌力','平衡','耐力','關節活動','ADL自立支援','IADL','認知','口腔吞嚥','心理社會'];
const EXERCISES = [
  {id:'warm_breath', cat:'暖身/緩和', name:'深呼吸與肩頸放鬆', dose:'5分鐘', how:'坐姿挺胸，鼻子吸氣4秒、嘴巴吐氣6秒；配合聳肩、轉肩、左右轉頭。', caution:'動作放慢，不憋氣。', selfcare:false},
  {id:'warm_joint', cat:'暖身/緩和', name:'坐姿關節暖身操', dose:'5分鐘', how:'由上而下依序活動：手指握放、手腕繞圈、手肘彎伸、肩膀繞圈、膝蓋伸直、腳踝上下。', caution:'關節疼痛處減小範圍。', selfcare:false},
  {id:'cool_stretch', cat:'暖身/緩和', name:'坐姿伸展緩和', dose:'5分鐘', how:'坐姿伸展大腿後側、小腿、手臂與背部，每個動作停10–15秒，配合慢呼吸。', caution:'伸展到微緊即可，不可彈震。', selfcare:false},
  {id:'grp_ball', cat:'肌力', name:'團體傳球／拍球', dose:'10分鐘', how:'圍圈坐，依口令傳球、拍球、舉球過頭，可加入數數或唱歌。', caution:'使用軟球；注意坐姿穩定。', selfcare:false},
  {id:'grp_band', cat:'肌力', name:'團體彈力帶運動', dose:'每動作10下 × 2組', how:'帶領者示範：推胸、划船、側拉、腿推；長輩依能力選擇彈力帶顏色。', caution:'彈力帶勿套在手腕上，避免彈傷。', selfcare:false},
  {id:'str_sitstand', cat:'肌力', name:'坐站訓練', dose:'10下 × 2組', how:'坐在有扶手的穩固椅子前1/2，雙腳與肩同寬、腳跟在膝蓋後方；身體前傾「鼻子超過腳尖」再站直，慢慢坐下。能力好者雙手交叉胸前。', caution:'站起時有頭暈、血壓偏高（收縮壓>180）暫停；椅子靠牆防滑。', selfcare:false},
  {id:'str_kneeext', cat:'肌力', name:'坐姿膝伸直抬腿', dose:'每側10下 × 2組', how:'坐姿背靠椅背，一腳膝蓋慢慢伸直，腳尖朝上停3秒再放下。可綁0.5–1公斤沙包增加阻力。', caution:'膝關節疼痛加劇時降低次數或不加沙包。', selfcare:false},
  {id:'str_heelraise', cat:'肌力', name:'扶椅墊腳尖', dose:'10下 × 2組', how:'雙手扶穩椅背，腳跟慢慢抬高停2秒再放下。', caution:'需有人在旁監督，防止後倒。', selfcare:false},
  {id:'str_hipabd', cat:'肌力', name:'扶椅側抬腿', dose:'每側10下 × 2組', how:'扶椅背站直，一腳向側邊抬起約20公分，身體不歪斜，慢慢放下。', caution:'髖關節置換術後依治療師指示角度。', selfcare:false},
  {id:'str_step', cat:'肌力', name:'踏階訓練', dose:'每側10下 × 2組', how:'在扶手旁使用10公分踏階，健側先上、患側先下（上樓好腳先，下樓壞腳先）。', caution:'需近身監督，必要時使用步態帶。', selfcare:false},
  {id:'str_band_row', cat:'肌力', name:'彈力帶划船（上肢）', dose:'10下 × 2組', how:'坐姿雙手握彈力帶，手肘往後拉、夾背停2秒，慢慢回原位。', caution:'肩痛時減小範圍。', selfcare:false},
  {id:'str_grip', cat:'肌力', name:'握力訓練（握力球/擰毛巾）', dose:'10下 × 2組', how:'用力握緊軟球5秒後放鬆；或雙手擰濕毛巾。', caution:'手部關節發炎期間暫停。', selfcare:false},
  {id:'bal_chair_oneleg', cat:'平衡', name:'扶椅單腳站', dose:'每側10秒 × 3次', how:'雙手扶椅背，一腳抬離地面維持平衡；進步後改單手扶、再改手指輕觸。', caution:'照服員站在個案側後方保護。', selfcare:false},
  {id:'bal_tandem', cat:'平衡', name:'前後腳站（半串聯站）', dose:'10秒 × 3次', how:'一腳腳跟靠在另一腳腳尖旁站立，雙手扶桌或椅背。', caution:'近身保護，旁邊不放雜物。', selfcare:false},
  {id:'bal_weightshift', cat:'平衡', name:'重心轉移', dose:'左右、前後各10次', how:'站姿扶椅，身體重心慢慢移到左腳再移到右腳；再前後移動。', caution:'有明顯晃動時改為坐姿重心轉移。', selfcare:false},
  {id:'bal_obstacle', cat:'平衡', name:'跨越障礙步行', dose:'來回 × 3趟', how:'於走廊放置2–3個低矮障礙物（如毛巾捲），練習抬腳跨越。', caution:'使用原有輔具，照服員陪走。', selfcare:false},
  {id:'end_march', cat:'耐力', name:'坐姿/扶椅原地踏步', dose:'3–5分鐘', how:'坐姿或扶椅原地踏步，配合音樂；自覺「有點喘、還能說話」為適當強度（RPE 11–13）。', caution:'心臟病個案監測心跳與血壓。', selfcare:false},
  {id:'end_walk', cat:'耐力', name:'走廊步行訓練', dose:'＿＿公尺 × 2趟', how:'使用原有輔具，在走廊來回步行；記錄距離與休息次數。', caution:'下肢無力者使用步態帶並近身保護。', selfcare:false},
  {id:'end_bike', cat:'耐力', name:'腳踏車/上下肢訓練器', dose:'10分鐘', how:'低阻力開始，速度穩定。', caution:'足部需固定好；中途不適即停止。', selfcare:false},
  {id:'rom_upper', cat:'關節活動', name:'上肢關節活動（爬牆/繞肩）', dose:'各10下', how:'手指沿牆面慢慢往上爬到最高點停3秒；肩膀前後繞圈。', caution:'偏癱側肩膀勿用力拉扯手臂。', selfcare:false},
  {id:'rom_neck', cat:'關節活動', name:'頸部與軀幹伸展操', dose:'各5下', how:'坐姿進行點頭、轉頭、側彎、軀幹旋轉，動作緩慢配合呼吸。', caution:'頸椎疾患避免過度後仰。', selfcare:false},
  {id:'adl_transfer', cat:'ADL自立支援', name:'移位練習（輪椅↔椅子/馬桶）', dose:'每次移位時執行', how:'以「最少必要協助」原則：先口頭提示煞車、移腳踏板、身體前傾，讓個案自己出力；照服員只在需要時給予協助。', caution:'未能負重者使用移位腰帶。', selfcare:true},
  {id:'adl_toilet', cat:'ADL自立支援', name:'如廁步驟練習', dose:'每次如廁時執行', how:'分解步驟：走進廁所→轉身→扶扶手→自己拉下褲子→坐下→清潔→穿回褲子。只協助個案做不到的那一步。', caution:'注意地面濕滑，個案隱私。', selfcare:true},
  {id:'adl_toiletschedule', cat:'ADL自立支援', name:'定時如廁/排泄訓練', dose:'每2小時提醒1次', how:'依排尿紀錄定時引導如廁，記錄是否成功、是否失禁。', caution:'記錄異常（血尿、灼熱）回報護理師。', selfcare:true},
  {id:'adl_feed', cat:'ADL自立支援', name:'自行進食訓練', dose:'每餐', how:'提供合適輔具（加粗湯匙、防滑墊、有邊碗），鼓勵自己吃完，必要時只協助最後幾口。', caution:'吞嚥困難者依飲食質地與姿勢建議（坐正、下巴微收）。', selfcare:true},
  {id:'adl_dress', cat:'ADL自立支援', name:'穿脫衣練習', dose:'每日1次（如換外套、午休前後）', how:'偏癱者「患側先穿、健側先脫」；給予口頭步驟提示，讓個案自己完成。', caution:'選擇寬鬆、前開衣物。', selfcare:true},
  {id:'adl_groom', cat:'ADL自立支援', name:'自行盥洗（洗手/刷牙/梳頭）', dose:'每日餐後', how:'將用品擺在個案伸手可及處，提示步驟，讓個案自行完成。', caution:'', selfcare:true},
  {id:'adl_walkmeal', cat:'ADL自立支援', name:'自行步行至用餐/活動區', dose:'每日移動時', how:'能步行者以步行取代輪椅推送，照服員陪走。', caution:'疲累時可中途休息。', selfcare:true},
  {id:'iadl_fold', cat:'IADL', name:'摺衣服/整理物品', dose:'15分鐘', how:'摺毛巾、衣物分類、整理桌面；可擔任中心小幫手。', caution:'', selfcare:true},
  {id:'iadl_cook', cat:'IADL', name:'備餐活動（洗菜、剝豆、切水果）', dose:'每週1–2次', how:'在團體備餐活動中負責個案能力所及的步驟。', caution:'使用刀具需監督。', selfcare:true},
  {id:'iadl_shop', cat:'IADL', name:'模擬購物/金錢計算', dose:'20分鐘', how:'使用模擬商品與錢幣練習挑選、計算與找零。', caution:'', selfcare:true},
  {id:'iadl_meds', cat:'IADL', name:'服藥管理練習（藥盒分裝）', dose:'每週1次', how:'在護理師指導下練習看藥袋、分裝一週藥盒、依時間服藥。', caution:'由護理師確認正確性。', selfcare:true},
  {id:'iadl_phone', cat:'IADL', name:'電話/手機使用練習', dose:'每週1–2次', how:'練習撥打家屬電話、使用視訊。', caution:'', selfcare:true},
  {id:'cog_ro', cat:'認知', name:'現實導向', dose:'每日上午', how:'說出今天日期、星期、天氣、節日；看月曆與白板。', caution:'不糾正責備，以提示引導。', selfcare:false},
  {id:'cog_game', cat:'認知', name:'益智活動（分類/配對/計算）', dose:'20分鐘', how:'依個案程度選擇撲克牌配對、物品分類、數字計算等。', caution:'難度以「努力一下可以完成」為原則。', selfcare:false},
  {id:'cog_reminisce', cat:'認知', name:'懷舊/回憶活動', dose:'每週1–2次', how:'以老照片、老歌、舊物引導分享過往經驗。', caution:'留意引發負面情緒的話題。', selfcare:false},
  {id:'oral_exercise', cat:'口腔吞嚥', name:'健口操（餐前）', dose:'每餐前5分鐘', how:'臉頰鼓氣、舌頭前伸左右、發「ㄆㄚ、ㄊㄚ、ㄎㄚ」音、唾液腺按摩。', caution:'', selfcare:false},
  {id:'oral_swallow', cat:'口腔吞嚥', name:'吞嚥訓練（依語言治療師指示）', dose:'依處方', how:'依語言治療師指定的姿勢、食物質地與吞嚥策略執行。', caution:'出現嗆咳、聲音濕潤立即停止並回報。', selfcare:false},
  {id:'psy_role', cat:'心理社會', name:'角色任務（擔任小幫手）', dose:'每日', how:'安排個案有意義的任務，如發點心、澆花、帶操，提升自我價值感。', caution:'', selfcare:true},
  {id:'psy_group', cat:'心理社會', name:'鼓勵參與團體活動', dose:'每日', how:'主動邀請參加團體課程，安排座位在熟識的長輩旁。', caution:'尊重個案意願，不勉強。', selfcare:false},
];

/* ---------- 評估結果 → 問題與建議處方 ---------- */
function suggestFromAssessment(a, client){
  const out=[]; if(!a) return out;
  const add=(code,text,ex,ref)=>{ if(!out.find(o=>o.code===code)) out.push({code,text,ex:ex||[],referral:ref||''}); };
  const b=a.adl||{}, has=k=>b[k]!==''&&b[k]!=null;
  if(has('transfer')&&+b.transfer<15) add('transfer','移位能力受限（巴氏移位 '+b.transfer+' 分）',['adl_transfer','str_sitstand']);
  if(has('mobility')&&+b.mobility<15) add('mobility','平地行走能力受限（巴氏走動 '+b.mobility+' 分）',['end_walk','bal_weightshift','adl_walkmeal']);
  if(has('stairs')&&+b.stairs<10) add('stairs','上下樓梯能力受限',['str_step','str_heelraise']);
  if(has('toilet')&&+b.toilet<10) add('toilet','如廁需協助',['adl_toilet']);
  if(has('dressing')&&+b.dressing<10) add('dressing','穿脫衣需協助',['adl_dress']);
  if(has('feeding')&&+b.feeding<10) add('feeding','進食需協助',['adl_feed','oral_exercise']);
  if(has('grooming')&&+b.grooming<5) add('grooming','個人衛生需協助',['adl_groom']);
  if((has('bladder')&&+b.bladder<10)||(has('bowel')&&+b.bowel<10)) add('contin','排泄控制問題',['adl_toiletschedule'],'護理師評估排泄問題');
  const p=a.phy||{}; const ag=client?ageAt(client.birth,a.date):null;
  if((p.tug!==''&&p.tug!=null&&+p.tug>=PHY_CUT.tug)||(p.oneLeg!==''&&p.oneLeg!=null&&+p.oneLeg<PHY_CUT.oneLeg)) add('fall','跌倒高風險（TUG/單腳站未達標）',['bal_chair_oneleg','bal_tandem','bal_weightshift','str_sitstand']);
  if((p.cs30!==''&&p.cs30!=null&&ag&&+p.cs30<cs30Cut(ag,client.gender))||(p.cs5!==''&&p.cs5!=null&&+p.cs5>=PHY_CUT.cs5)) add('legstr','下肢肌力不足（坐站測試低於同齡常模）',['str_sitstand','str_kneeext','str_heelraise','str_hipabd']);
  if(p.grip!==''&&p.grip!=null&&client&&+p.grip<(client.gender==='男'?PHY_CUT.gripM:PHY_CUT.gripF)) add('grip','握力不足（AWGS 肌少症切點以下）',['str_grip','str_band_row'],'營養師評估蛋白質攝取');
  if(p.gait4!==''&&p.gait4!=null&&+p.gait4>0&&4/(+p.gait4)<PHY_CUT.gait) add('gait','步行速度慢（<1.0 m/s）',['end_walk','end_march']);
  const i=a.iadl||{}, iz=k=>i[k]!==''&&i[k]!=null&&IADL.find(x=>x.k===k).opts[+i[k]]?.[1]===0;
  if(iz('meds')) add('meds','服藥管理需協助',['iadl_meds']);
  if(iz('shopping')||iz('finance')) add('shop','購物與金錢管理能力下降',['iadl_shop']);
  if(iz('cooking')) add('cook','備餐能力下降',['iadl_cook']);
  if(iz('housework')||iz('laundry')) add('house','家務能力下降',['iadl_fold']);
  if(iz('phone')) add('phone','電話使用困難',['iadl_phone']);
  const sp=scoreSPMSQ(a); if(sp&&sp.adj>=3) add('cog','認知功能退化（SPMSQ：'+spmsqLevel(sp.adj)+'）',['cog_ro','cog_game','cog_reminisce'], sp.adj>=5&&!client?.dementia?'建議轉介神經內科/精神科進行失智症診斷':'');
  const g=scoreGDS(a); if(g&&g.total>=5) add('mood','疑似憂鬱情緒（GDS-15＝'+g.total+'）',['psy_role','psy_group'],'社工關懷；必要時轉介身心科');
  const m=scoreMNA(a); if(m&&m.total<=11) add('nutri',mnaLevel(m.total)+'（MNA-SF＝'+m.total+'）',[],'轉介營養師評估');
  if(a.pain&&+a.pain.nrs>=4) add('pain','疼痛影響活動（NRS '+a.pain.nrs+'）',['rom_upper','rom_neck'],'醫師/物理治療師評估疼痛');
  (a.copm||[]).filter(c=>c.activity).forEach((c,ix)=>add('copm'+ix,'個案期待：'+c.activity,[]));
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
const GAS = [[-2,'-2 退步／遠低於預期'],[-1,'-1 未達預期（維持基準）'],[0,'0 達成預期目標'],[1,'+1 略優於預期'],[2,'+2 遠優於預期']];
