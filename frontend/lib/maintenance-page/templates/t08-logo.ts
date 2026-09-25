import type { TemplateModule } from "../shell";

/**
 * 08, REBUILD THE LOGO. The WDC mark, cut into pieces that drift around its
 * outline. Drag each one home and it snaps in; put the last one in and the
 * mark lights up, then scatters for the next visitor. "Place a piece for me"
 * does the same from the keyboard. The pieces are cut from the real mark at
 * load, so a new mark in /brand is a new puzzle with no other change.
 */
const t08: TemplateModule = {
  css: String.raw`
.stage{background:radial-gradient(70% 60% at 62% 45%,#0e0e86 0%,var(--navy) 60%,#00004a 100%)}
.target{position:absolute;pointer-events:none}
.target img{width:100%;height:100%;opacity:.1;display:block}
.target::after{content:"";position:absolute;inset:-16px;border:1.5px dashed #3a3ab6;border-radius:24px}
.pc{position:absolute;left:0;top:0;background-repeat:no-repeat;cursor:grab;touch-action:none;will-change:transform;filter:drop-shadow(0 8px 10px rgba(0,0,30,.45))}
.pc:hover{filter:drop-shadow(0 8px 10px rgba(0,0,30,.45)) drop-shadow(0 0 6px rgba(255,101,0,.9))}
.pc.held{cursor:grabbing;z-index:10;filter:drop-shadow(0 16px 18px rgba(0,0,30,.55)) drop-shadow(0 0 8px rgba(255,101,0,.8))}
.pc.set{cursor:default;filter:none}
.pc.snap{animation:snap .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes snap{0%{filter:brightness(2.2) drop-shadow(0 0 14px #ff6500)}100%{filter:none}}
.spark{position:absolute;left:0;top:0;width:7px;height:7px;border-radius:50%;background:var(--orange);pointer-events:none}
.hud{position:absolute;display:grid;justify-items:end;gap:.4rem;text-align:right}
.count{font:700 clamp(1.3rem,2.8vw,1.9rem)/1 var(--display);font-variant-numeric:tabular-nums}
.count span{color:var(--orange)}
.hud small{font:500 .84rem/1.35 var(--body);color:var(--mist);max-width:16rem}
.helper{position:absolute}
.win{position:absolute;text-align:center;pointer-events:none;opacity:0;transition:opacity .5s;transform:translate(-50%,-50%)}
.win.on{opacity:1}
.win b{display:block;font:700 clamp(2.2rem,5.5vw,4.6rem)/.95 var(--display);letter-spacing:-.04em;text-shadow:0 6px 30px rgba(0,0,40,.85);white-space:nowrap}
.win span{display:block;margin-top:.6rem;font:500 1rem/1.3 var(--body);color:var(--mist)}
`,
  body: () => `<main class="stage" aria-label="The WDC mark in pieces, to put back together">
  <div class="target" id="target"><img alt="" src="/brand/icon-white-accent.svg"></div>
  <div id="pieces" aria-hidden="true"></div>
  <div class="hud" id="hud"><span class="count" id="count"><span>0</span> of 0</span><small>Drag the pieces into the outline.</small></div>
  <button class="btn btn-secondary helper" type="button" id="helper">Place a piece for me</button>
  <div class="win" id="win" aria-hidden="true"><b>You did that.</b><span>It scatters again in a moment.</span></div>
  <p class="sr" id="sr" aria-live="polite"></p>
</main>`,
  script: String.raw`
(function(){
  var target = document.getElementById('target'), piecesEl = document.getElementById('pieces'), countEl = document.getElementById('count');
  var sr = document.getElementById('sr'), win = document.getElementById('win'), hud = document.getElementById('hud'), helper = document.getElementById('helper');
  var COLS = 5, ROWS = 5, AR = 944/904, pieces = [], T = {}, A = null, held = null, off = null, won = false;
  var img = new Image();
  img.onload = function(){
    var c = document.createElement('canvas'), R = 600; c.width = R; c.height = Math.round(R*AR);
    var x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    var url;
    try { url = c.toDataURL(); } catch (_) { url = img.src; }
    for (var r = 0; r < ROWS; r++) for (var q = 0; q < COLS; q++){
      var w = c.width/COLS, h = c.height/ROWS, on = 0, all = 0;
      try { var d = x.getImageData(q*w, r*h, w, h).data; for (var i = 3; i < d.length; i += 16){ all++; if (d[i] > 40) on++; } } catch (_) { on = all = 1; }
      if (on/all < .06) continue;
      var el = document.createElement('div'); el.className = 'pc'; el.style.backgroundImage = 'url(' + url + ')';
      piecesEl.appendChild(el);
      pieces.push({el:el, q:q, r:r, id:pieces.length, x:0, y:0, rot:0, set:false, ph:Math.random()*6.28});
    }
    WDC.onResize(layout); layout(WDC.area()); scatter(); tally();
    if (!WDC.reduced) WDC.loop(float);
  };
  img.src = target.querySelector('img').src;

  function layout(a){
    A = a;
    var S = Math.max(150, Math.min(A.w*.5, A.h*.52, 380)), Hh = S*AR;
    T = {x:A.cx - S/2, y:A.t + (A.h - Hh)/2 + (A.side ? 0 : 10), w:S, h:Hh};
    target.style.cssText = 'left:' + T.x + 'px;top:' + T.y + 'px;width:' + S + 'px;height:' + Hh + 'px';
    var pw = S/COLS, ph = Hh/ROWS;
    pieces.forEach(function(p){
      p.el.style.width = (pw + .8) + 'px'; p.el.style.height = (ph + .8) + 'px';
      p.el.style.backgroundSize = S + 'px ' + Hh + 'px'; p.el.style.backgroundPosition = (-p.q*pw) + 'px ' + (-p.r*ph) + 'px';
      var ox = p.hx, oy = p.hy;
      p.hx = T.x + p.q*pw; p.hy = T.y + p.r*ph; p.pw = pw; p.ph = ph;
      if (p.set){ p.x = p.hx; p.y = p.hy; }
      else if (ox !== undefined){ p.x += p.hx - ox; p.y += p.hy - oy; clampIn(p); }
    });
    hud.style.right = (A.W - A.r) + 'px'; hud.style.top = A.t + 'px';
    helper.style.right = (A.W - A.r) + 'px'; helper.style.top = (A.b - 44) + 'px';
    win.style.left = A.cx + 'px'; win.style.top = A.cy + 'px';
    paint();
  }
  function clampIn(p){ p.x = Math.max(A.l, Math.min(A.r - p.pw, p.x)); p.y = Math.max(A.t + 40, Math.min(A.b - 56 - p.ph, p.y)); }
  /* around the outline, never on it */
  function scatter(){
    pieces.forEach(function(p){
      p.set = false; p.el.classList.remove('set');
      for (var tries = 0; tries < 30; tries++){
        var a = Math.random()*6.283, d = .62 + Math.random()*.5;
        p.x = T.x + T.w/2 + Math.cos(a)*T.w*d*1.2 - p.pw/2;
        p.y = T.y + T.h/2 + Math.sin(a)*T.h*d - p.ph/2;
        clampIn(p);
        var inside = p.x + p.pw > T.x - 8 && p.x < T.x + T.w + 8 && p.y + p.ph > T.y - 8 && p.y < T.y + T.h + 8;
        if (!inside) break;
      }
      p.rot = (Math.random() - .5)*70;
    });
    paint();
  }
  function paint(){ pieces.forEach(function(p){ p.el.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px) rotate(' + (p.set ? 0 : p.rot) + 'deg)' + (p === held ? ' scale(1.08)' : ''); }); }
  function float(dt, now){
    pieces.forEach(function(p){
      if (p.set || p === held) return;
      p.x += Math.sin(now/1300 + p.ph)*.12; p.y += Math.cos(now/1500 + p.ph)*.12; p.rot += Math.sin(now/2000 + p.ph)*.03;
    });
    paint();
  }
  function tally(){
    var n = pieces.filter(function(p){ return p.set; }).length;
    countEl.innerHTML = '<span>' + n + '</span> of ' + pieces.length;
    if (n && n % 5 === 0) sr.textContent = n + ' of ' + pieces.length + ' pieces are in place.';
    if (n === pieces.length && pieces.length && !won){
      won = true; win.classList.add('on'); sr.textContent = 'The mark is complete. You did that.';
      burst();
      setTimeout(function(){ won = false; win.classList.remove('on'); scatter(); tally(); }, 6000);
    }
  }
  function burst(){
    if (WDC.reduced) return;
    for (var i = 0; i < 36; i++){
      var s = document.createElement('i'); s.className = 'spark'; piecesEl.appendChild(s);
      var a = i/36*6.283, d = T.w*(.55 + Math.random()*.4), x0 = T.x + T.w/2, y0 = T.y + T.h/2;
      s.animate([{transform:'translate(' + x0 + 'px,' + y0 + 'px) scale(1)', opacity:1},
        {transform:'translate(' + (x0 + Math.cos(a)*d) + 'px,' + (y0 + Math.sin(a)*d) + 'px) scale(.2)', opacity:0}],
        {duration:900 + Math.random()*400, easing:'cubic-bezier(.1,.7,.3,1)'}).onfinish = function(){ this.effect.target.remove(); };
    }
  }
  function setPiece(p){
    if (p.set) return; p.set = true; p.x = p.hx; p.y = p.hy; p.rot = 0;
    p.el.classList.add('set', 'snap'); setTimeout(function(){ p.el.classList.remove('snap'); }, 500);
    paint(); tally();
  }
  piecesEl.addEventListener('pointerdown', function(e){
    var el = e.target.closest('.pc'); if (!el) return;
    var p = pieces.find(function(q){ return q.el === el; }); if (!p || p.set) return;
    held = p; el.setPointerCapture(e.pointerId); el.classList.add('held'); p.rot = 0;
    off = {x:e.clientX - p.x, y:e.clientY - p.y}; paint(); e.preventDefault();
  });
  piecesEl.addEventListener('pointermove', function(e){
    if (!held) return;
    held.x = Math.max(0, Math.min(A.W - held.pw, e.clientX - off.x)); held.y = Math.max(0, Math.min(A.H - held.ph, e.clientY - off.y));
    /* close to home, it is drawn in */
    var d = Math.hypot(held.x - held.hx, held.y - held.hy);
    if (d < held.pw*.9){ var k = (1 - d/(held.pw*.9))*.35; held.x += (held.hx - held.x)*k; held.y += (held.hy - held.y)*k; }
    paint();
  });
  function drop(){
    if (!held) return; var p = held; held = null; p.el.classList.remove('held');
    if (Math.hypot(p.x - p.hx, p.y - p.hy) < Math.max(22, p.pw*.45)) setPiece(p);
    else { p.rot = (Math.random() - .5)*20; clampIn(p); paint(); }
  }
  piecesEl.addEventListener('pointerup', drop); piecesEl.addEventListener('pointercancel', drop);
  helper.addEventListener('click', function(){ var p = pieces.find(function(q){ return !q.set; }); if (p) setPiece(p); });
})();
`,
};

export default t08;
