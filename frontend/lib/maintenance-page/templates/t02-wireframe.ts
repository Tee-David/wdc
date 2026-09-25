import type { TemplateModule } from "../shell";

/**
 * 02, WIREFRAME REBUILD. A blueprint drafts the homepage in dashed outline,
 * measures it, fills it in, then tries the next idea: three layouts on wide
 * screens, three portrait ones on phones. Every box is one SVG rect moved by
 * transform, with a stroke that does not scale, so nothing is laid out again
 * while it moves.
 */
const t02: TemplateModule = {
  css: String.raw`
.stage{background-color:var(--navy);background-image:linear-gradient(rgba(120,125,255,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(120,125,255,.13) 1px,transparent 1px),linear-gradient(rgba(120,125,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(120,125,255,.06) 1px,transparent 1px);background-size:96px 96px,96px 96px,24px 24px,24px 24px}
.frame{position:absolute}
svg.wire{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.box{transform-box:view-box;transform-origin:0 0;transition:transform 1.1s cubic-bezier(.65,0,.2,1),fill .5s,opacity .5s,stroke .5s;fill:transparent;stroke:#fff;stroke-width:1.5;stroke-dasharray:6 5;opacity:0}
.drafting .box{opacity:1}
.filled .box{stroke-dasharray:none;stroke:transparent}
.filled .k-lede{fill:#c7c9ec}
.filled .k-img{fill:#ff6500}
.filled .k-btn1{fill:#fff}
.filled .k-btn2{fill:#000;stroke:#fff}
.filled .k-nav,.filled .k-card{fill:#12128a}
.filled .k-logo{fill:#ff6500}
.box.gone{opacity:0!important}
.lab{position:absolute;left:0;top:0;transform:translate(var(--x),var(--y));transition:transform 1.1s cubic-bezier(.65,0,.2,1),opacity .35s;font:700 .68rem/1 var(--body);letter-spacing:.04em;color:#000;background:var(--orange);padding:.3rem .45rem;border-radius:4px;white-space:nowrap;opacity:0;font-variant-numeric:tabular-nums;pointer-events:none}
.measuring .lab{opacity:1}
.narrow .lab.minor{display:none}
.htext{position:absolute;left:0;top:0;margin:0;display:flex;align-items:center;font:700 var(--fs,40px)/1 var(--display);letter-spacing:-.035em;color:#fff;opacity:0;transition:opacity .5s,transform 1.1s cubic-bezier(.65,0,.2,1);pointer-events:none;text-wrap:balance}
.htext em{font-style:normal;color:var(--orange)}
.filled .htext{opacity:1}
.cursor{position:absolute;left:0;top:0;z-index:5;transition:transform .7s cubic-bezier(.5,0,.2,1);pointer-events:none}
.cursor span{position:absolute;left:18px;top:18px;background:#fff;color:#000;font:700 .7rem/1 var(--body);padding:.3rem .5rem;border-radius:999px;white-space:nowrap}
.caption{position:absolute;display:flex;align-items:baseline;justify-content:space-between;gap:.5rem 1rem;flex-wrap:wrap}
.caption p{margin:0;font:700 clamp(1rem,2.2vw,1.5rem)/1.1 var(--display);letter-spacing:-.01em}
.caption p span{color:var(--orange)}
.caption small{font:500 .82rem/1 var(--body);color:var(--mist);font-variant-numeric:tabular-nums}
`,
  body: () => `<main class="stage" aria-label="A wireframe of the homepage being redrawn">
  <div class="frame" id="frame" aria-hidden="true">
    <svg class="wire" id="wire"></svg>
    <p class="htext" id="htext"><span>We are rebuilding<em>.</em></span></p>
  </div>
  <div class="cursor" id="cursor" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M2 2l7 18 2.6-7.4L19 10z" fill="#ff6500" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg><span>Designer</span></div>
  <div class="caption" id="caption"><p>Brilliant simplicity <span>of thought.</span></p><small id="status" aria-live="polite">Layout 1 of 3</small></div>
</main>`,
  script: String.raw`
(function(){
  var frame = document.getElementById('frame'), svg = document.getElementById('wire'), cursor = document.getElementById('cursor');
  var status = document.getElementById('status'), caption = document.getElementById('caption'), htext = document.getElementById('htext');
  var NS = 'http://www.w3.org/2000/svg';
  var keys = ['nav','logo','h1','lede','lede2','btn1','btn2','img','card1','card2','card3','card4'];
  var kind = {nav:'nav',logo:'logo',h1:'h1',lede:'lede',lede2:'lede',btn1:'btn1',btn2:'btn2',img:'img',card1:'card',card2:'card',card3:'card',card4:'card'};
  var names = {h1:'h1',img:'hero image',btn1:'primary',card1:'card'};
  /* x, y, w, h as percentages of the frame. A missing key is a box that layout does not use. */
  var WIDE = [
    {name:'Split hero', nav:[0,0,100,7], logo:[1.5,1.5,5,4], h1:[0,16,52,20], lede:[0,40,44,3], lede2:[0,45,34,3], btn1:[0,54,16,7], btn2:[18,54,16,7], img:[58,14,42,52], card1:[0,74,32,26], card2:[34,74,32,26], card3:[68,74,32,26]},
    {name:'Centred', nav:[0,0,100,7], logo:[47.5,1.5,5,4], h1:[18,14,64,16], lede:[26,33,48,3], lede2:[32,38,36,3], btn1:[33,45,16,7], btn2:[51,45,16,7], img:[0,57,100,20], card1:[0,81,23.5,19], card2:[25.5,81,23.5,19], card3:[51,81,23.5,19], card4:[76.5,81,23.5,19]},
    {name:'Editorial', nav:[0,0,100,7], logo:[1.5,1.5,5,4], img:[0,12,46,88], h1:[50,14,50,28], lede:[50,47,46,3], lede2:[50,52,38,3], btn1:[50,60,22,7], btn2:[74,60,22,7], card1:[50,74,24,26], card2:[76,74,24,26]}
  ];
  var TALL = [
    {name:'Stacked', nav:[0,0,100,6], logo:[3,1.3,9,3.4], h1:[0,11,100,17], lede:[0,31,88,2.4], lede2:[0,35,64,2.4], btn1:[0,41,47,6], btn2:[53,41,47,6], img:[0,52,100,24], card1:[0,80,48,20], card2:[52,80,48,20]},
    {name:'Image first', nav:[0,0,100,6], logo:[44,1.3,12,3.4], img:[0,10,100,30], h1:[0,44,100,17], lede:[0,64,90,2.4], lede2:[0,68,70,2.4], btn1:[0,75,100,6.5], btn2:[0,84,100,6.5]},
    {name:'Cards', nav:[0,0,100,6], logo:[3,1.3,9,3.4], h1:[0,10,100,15], lede:[0,28,80,2.4], btn1:[0,34,60,6], card1:[0,45,48,26], card2:[52,45,48,26], card3:[0,74,48,26], card4:[52,74,48,26]}
  ];
  var layouts = WIDE, els = {}, labs = {}, cur = 0, W = 0, H = 0;
  keys.forEach(function(k){
    var r = document.createElementNS(NS, 'rect');
    r.setAttribute('width', 1); r.setAttribute('height', 1); r.setAttribute('vector-effect', 'non-scaling-stroke');
    r.setAttribute('class', 'box k-' + kind[k]); svg.appendChild(r); els[k] = r;
    if (names[k]){ var l = document.createElement('span'); l.className = 'lab' + (k === 'h1' ? '' : ' minor'); frame.appendChild(l); labs[k] = l; }
  });
  function rectPx(k, L){ var v = layouts[L][k]; if (!v) return null; return [v[0]/100*W, v[1]/100*H, Math.max(1, v[2]/100*W), Math.max(1, v[3]/100*H)]; }
  function place(L){
    keys.forEach(function(k){
      var r = rectPx(k, L), el = els[k];
      el.classList.toggle('gone', !r);
      if (labs[k]) labs[k].style.visibility = r ? '' : 'hidden';
      if (!r) return;
      var rad = kind[k] === 'btn1' || kind[k] === 'btn2' ? Math.min(r[2], r[3])/2 : 6;
      el.style.transform = 'translate(' + r[0] + 'px,' + r[1] + 'px) scale(' + r[2] + ',' + r[3] + ')';
      el.setAttribute('rx', rad/r[2]); el.setAttribute('ry', rad/r[3]);
      if (labs[k]){ labs[k].style.setProperty('--x', r[0] + 'px'); labs[k].style.setProperty('--y', Math.max(-22, r[1] - 22) + 'px'); labs[k].textContent = names[k] + ' · ' + Math.round(r[2]) + ' × ' + Math.round(r[3]); }
    });
    var h = rectPx('h1', L);
    htext.style.transform = 'translate(' + h[0] + 'px,' + h[1] + 'px)'; htext.style.width = h[2] + 'px'; htext.style.height = h[3] + 'px';
    htext.style.setProperty('--fs', Math.max(18, Math.min(h[3]/2.2, h[2]/5.4)) + 'px');
    status.textContent = 'Layout ' + (L + 1) + ' of 3 · ' + layouts[L].name;
  }
  function layout(A){
    var capH = 44, pad = 8;
    var fx = A.l + pad, fy = A.t + pad, fw = A.w - pad*2, fh = A.h - pad*2 - capH;
    var tall = fh > fw*1.05;
    if ((tall ? TALL : WIDE) !== layouts){ layouts = tall ? TALL : WIDE; cur = 0; }
    frame.style.left = fx + 'px'; frame.style.top = fy + 'px'; frame.style.width = fw + 'px'; frame.style.height = fh + 'px';
    frame.classList.toggle('narrow', fw < 560);
    caption.style.left = fx + 'px'; caption.style.width = fw + 'px'; caption.style.top = (fy + fh + 16) + 'px';
    W = fw; H = fh; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    place(cur);
  }
  WDC.onResize(layout); layout(WDC.area());

  function pointAt(k){
    var r = rectPx(k, cur); if (!r) return;
    var b = frame.getBoundingClientRect();
    cursor.style.transform = 'translate(' + (b.left + r[0] + r[2]*.7) + 'px,' + (b.top + r[1] + r[3]*.6) + 'px)';
  }
  if (WDC.reduced){ frame.classList.add('drafting', 'filled'); cursor.hidden = true; return; }

  /* A pause that also waits out a hidden tab, so the loop never races ahead unseen. */
  function wait(ms){
    return new Promise(function(res){ setTimeout(res, ms); }).then(function(){
      if (!document.hidden) return;
      return new Promise(function(res){ document.addEventListener('visibilitychange', function f(){ if (!document.hidden){ document.removeEventListener('visibilitychange', f); res(); } }); });
    });
  }
  async function run(){
    frame.classList.add('drafting');
    for (;;){
      frame.classList.remove('filled');
      await wait(300);
      frame.classList.add('measuring');
      var marks = ['h1','img','btn1','card1'].filter(function(k){ return layouts[cur][k]; });
      for (var i = 0; i < marks.length; i++){ pointAt(marks[i]); await wait(650); }
      frame.classList.remove('measuring');
      frame.classList.add('filled'); pointAt('btn1');
      await wait(2800);
      frame.classList.remove('filled');
      await wait(500);
      cur = (cur + 1) % layouts.length; place(cur); pointAt('h1');
      await wait(1300);
    }
  }
  pointAt('h1'); run();
})();
`,
};

export default t02;
