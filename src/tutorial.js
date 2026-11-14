/* ================================================================
   使用教學影片：側欄「使用教學」頁、首頁第一次使用提示
   影片與章節由 rehab-lite-tutorial/render.py 產生（assets/video/）
   ================================================================ */
const TUTORIAL = {
  src:'assets/video/tutorial.mp4', poster:'assets/video/poster.jpg', vtt:'assets/video/tutorial.vtt',
  chapters:/*CHAPTERS*/[],
};
const tutSeen = () => { try { return !!localStorage.getItem('rehabl:tutSeen'); } catch(e){ return true; } };
const tutMark = () => { try { localStorage.setItem('rehabl:tutSeen', '1'); } catch(e){} };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function pageTutorial(){
  setTitle('使用教學', '約 ' + Math.round((TUTORIAL.chapters.at(-1)?.end || 180) / 60) + ' 分鐘，操作前建議先看一遍');
  tutMark();
  return `<div class="tut">
    <section class="card tut-player"><video id="tutv" controls preload="metadata" playsinline poster="${TUTORIAL.poster}" ontimeupdate="tutSync(this.currentTime)">
      <source src="${TUTORIAL.src}" type="video/mp4"><track kind="captions" src="${TUTORIAL.vtt}" srclang="zh-Hant" label="中文字幕">
      您的瀏覽器無法播放影片。</video>
      <p class="hint">畫面上已有字幕，不開聲音也能看。點「章節」可以直接跳到想看的段落。</p></section>
    <aside class="card tut-ch"><h2>章節</h2><ol>${TUTORIAL.chapters.map((c, i) => `<li><button type="button" id="tch-${i}" onclick="tutGo(${c.t})"><span class="t">${mmss(c.t)}</span><span>${esc(c.title)}</span></button></li>`).join('')}</ol>
      <div class="tut-next"><b>看完之後</b>${Store.all('clients').length ? `<a class="btn primary" href="#/">${icon('home', 16)}回到首頁</a>` : `${btn('載入 3 個模擬個案試試看', 'loadDemo()', { k:'primary', i:'users' })}<a class="btn" href="#/clients">直接新增${term()}</a>`}</div></aside>
  </div>`;
}
function tutGo(t){ const v = $('#tutv'); if (!v) return; v.currentTime = t + 0.05; v.play().catch(() => {}); }
function tutSync(t){
  let k = 0; TUTORIAL.chapters.forEach((c, i) => { if (t >= c.t) k = i; });
  document.querySelectorAll('.tut-ch button').forEach((b, i) => b.classList.toggle('on', i === k));
}
/* 首頁：還沒看過教學時的提示卡（可關閉） */
function tutorialCardHTML(){
  if (tutSeen()) return '';
  return `<section class="card tut-cta"><a class="tut-thumb" href="#/tutorial" aria-label="觀看使用教學"><img src="${TUTORIAL.poster}" alt=""><span class="play">${icon('play', 30)}</span></a>
    <div><h2>第一次使用？先看使用教學</h2><p>約 ${Math.round((TUTORIAL.chapters.at(-1)?.end || 180) / 60)} 分鐘，從評估、開立計畫、每日勾選，到再評估與列印表單，一次看懂。</p>
    <div class="btn-row"><a class="btn primary" href="#/tutorial">${icon('play', 16)}觀看使用教學</a><button type="button" class="btn ghost" onclick="tutMark();route()">已經會用，不再顯示</button></div></div></section>`;
}
