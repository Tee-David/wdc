import type { TemplateModule } from "../shell";

/**
 * 11, EVENT HORIZON. The site's words spiral into a black hole with an
 * orange accretion disk, stretching and reddening as they fall in; a cursor
 * or finger pulls them back out. The countdown is a chip with its own clock,
 * which obeys gravitational time dilation: its proper time runs at
 * sqrt(1 - rs/r), so dragged to the edge it slows and freezes, and pulled
 * away it races to catch up with everybody else's. Left alone it drifts in.
 * The real time is always in the lockup beside it.
 */
const t11: TemplateModule = {
  css: String.raw`
.stage{background:#00002a}
canvas{position:absolute;inset:0;width:100%;height:100%}
.chip{position:absolute;left:0;top:0;z-index:5;display:grid;gap:.3rem;justify-items:start;background:#fff;color:#000;border:0;border-radius:16px;padding:.7rem .9rem;cursor:grab;touch-action:none;text-align:left;box-shadow:0 18px 40px -12px rgba(0,0,0,.7);will-change:transform}
.chip:active{cursor:grabbing}
.chip .l{font:700 .64rem/1 var(--body);letter-spacing:.16em;text-transform:uppercase;color:#6b2a00}
.chip .t{font:700 1.8rem/1 var(--display);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.chip .r{font:600 .76rem/1 var(--body);color:#3a3a5a;font-variant-numeric:tabular-nums}
.chip .r b{display:inline-block;min-width:3.4em;color:#000}
.chip.frozen .t{color:var(--orange-ink)}
.hint{position:absolute;margin:0;font:500 .88rem/1.35 var(--body);color:var(--mist);max-width:19rem;transition:opacity .5s}
`,
  body: () => `<main class="stage" aria-label="The site's words falling into a black hole">
  <canvas id="c" aria-hidden="true"></canvas>
  <button class="chip" id="chip" type="button" aria-describedby="chip-help">
    <span class="l">The countdown's own clock</span>
    <span class="t" id="ct">00:00:00</span>
    <span class="r">Ticking at <b id="rate">×1.00</b> <span id="rnote">normal time</span></span>
  </button>
  <p class="sr" id="chip-help">Drag the countdown, or move it with the arrow keys. Near the black hole its clock slows down.</p>
  <p class="hint" id="hint">Hold words back with your cursor. Drag the countdown to the edge and watch its clock slow down.</p>
  <p class="sr" id="sr" aria-live="polite"></p>
</main>`,
  script: String.raw`
(function(){
  var cv = document.getElementById('c'), ctx = cv.getContext('2d'), chip = document.getElementById('chip'), hint = document.getElementById('hint');
  var dpr = Math.min(2, devicePixelRatio || 1), W, H, cx, cy, Rh, A;
  var WORDS = ['Brands','that get','noticed,','get found,','results.','Branding','Web','SEO','Mobile apps','AI software','Marketing','Start a project','See our work','Contact','Blog','Work','Services','Brilliant','simplicity','of thought'];
  var words = [], disk = [], stars = [], chipPos = null, held = false;
  function layout(a){
    A = a; W = A.W; H = A.H; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    cx = A.cx; cy = A.t + A.h*.5; Rh = Math.max(40, Math.min(110, A.w*.1, A.h*.13));
    stars = []; for (var i = 0; i < 240; i++) stars.push([Math.random()*W, Math.random()*H, Math.random()*1.2 + .2]);
    if (!chipPos) chipPos = {x:cx + Math.min(A.w*.3, Rh*3.2), y:cy + Math.min(A.h*.3, Rh*2.4)};
    clampChip();
    hint.style.left = A.l + 'px'; hint.style.top = A.t + 'px';
    hint.hidden = A.h < 360;
    if (WDC.reduced) frame(0, 0);
  }
  function clampChip(){
    var w = chip.offsetWidth/2 + 6, h = chip.offsetHeight/2 + 6;
    chipPos.x = Math.max(A.l + w, Math.min(A.r - w, chipPos.x)); chipPos.y = Math.max(A.t + h, Math.min(A.b - h, chipPos.y));
    chip.style.transform = 'translate(' + (chipPos.x - chip.offsetWidth/2) + 'px,' + (chipPos.y - chip.offsetHeight/2) + 'px)';
  }
  function spawn(w, near){ w.r = near ? Rh*(2.2 + Math.random()*3.8) : Math.max(W, H)*.55 + Math.random()*120; w.a = Math.random()*6.283; w.ox = 0; w.oy = 0; }
  for (var i = 0; i < 1100; i++) disk.push({k:1.35 + Math.pow(Math.random(), 1.6)*2.1, a:Math.random()*6.283, s:Math.random()*2 + .8});

  var ptr = {x:-1e4, y:-1e4};
  addEventListener('pointermove', function(e){ ptr.x = e.clientX; ptr.y = e.clientY; }, {passive:true});
  addEventListener('pointerup', function(e){ if (e.pointerType !== 'mouse') ptr.x = ptr.y = -1e4; });
  document.addEventListener('pointerleave', function(){ ptr.x = ptr.y = -1e4; });

  /* the chip's own clock */
  var proper = 0, t0 = Date.now(), start = WDC.backBy ? WDC.backBy - t0 : null;
  function rateAt(x, y){ var r = Math.hypot(x - cx, y - cy), rs = Rh*1.15; return r <= rs*1.04 ? 0 : Math.sqrt(1 - rs/r); }
  function fmt(ms){ ms = Math.max(0, ms); var s = Math.floor(ms/1000); return String(Math.floor(s/3600)).padStart(2,'0') + ':' + String(Math.floor(s%3600/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }
  var lastRate = '', said = '';
  A = WDC.area(); Rh = Math.max(40, Math.min(110, A.w*.1, A.h*.13));
  WORDS.forEach(function(t, i){ var w = {t:t, size:13 + Math.random()*15}; spawn(w, true); w.r = Rh*(1.8 + i*.35); words.push(w); });
  function tickChip(dt){
    var real = Date.now() - t0, k = rateAt(chipPos.x, chipPos.y), lag = real - proper;
    var rate = k > .93 && lag > 50 ? 1 + Math.min(40, lag/400) : k;
    proper += dt*1000*rate; if (proper > real && k > .93) proper = real;
    /* with no back-by time it counts the time away instead */
    document.getElementById('ct').textContent = start !== null ? fmt(start - proper) : fmt(t0 - WDC.since + proper);
    var rs = rate.toFixed(2);
    if (rs !== lastRate){
      lastRate = rs; document.getElementById('rate').textContent = '×' + rs;
      document.getElementById('rnote').textContent = rate === 0 ? 'frozen at the edge' : rate > 1.01 ? 'catching up' : rate < .9 ? 'slowed by gravity' : 'normal time';
    }
    chip.classList.toggle('frozen', rate === 0);
    var s = rate === 0 ? 'The countdown has frozen at the edge of the black hole.' : rate > 1.01 ? 'The countdown is catching up.' : '';
    if (s && s !== said){ said = s; document.getElementById('sr').textContent = s; } else if (!s) said = '';
    if (!held && !WDC.reduced){
      var dx = cx - chipPos.x, dy = cy - chipPos.y, d = Math.hypot(dx, dy);
      if (d > Rh*1.3){ var v = 5 + 700/d; chipPos.x += dx/d*v*dt; chipPos.y += dy/d*v*dt; }
    }
    clampChip();
  }

  function frame(dt, now){
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    stars.forEach(function(s){
      /* lensing: stars near the hole are pushed outward */
      var dx = s[0] - cx, dy = s[1] - cy, d = Math.hypot(dx, dy) || 1, push = Rh*Rh*1.4/d;
      ctx.globalAlpha = Math.min(1, d/(Rh*2))*.8; ctx.fillRect(s[0] + dx/d*push, s[1] + dy/d*push, s[2], s[2]);
    });
    ctx.globalAlpha = 1;
    var T = now/1000;
    function diskPass(back){
      disk.forEach(function(p){
        var pr = p.k*Rh, a = p.a + (WDC.reduced ? 0 : T*Math.pow(1.4/p.k, 1.5)*1.6), sy = Math.sin(a);
        if (back ? sy > 0 : sy <= 0) return;
        var dop = .55 + .45*Math.cos(a);
        ctx.fillStyle = 'rgba(255,' + Math.round(80 + 120*dop) + ',' + Math.round(20*dop) + ',' + (.35 + .6*dop) + ')';
        ctx.fillRect(cx + Math.cos(a)*pr, cy + sy*pr*.26, p.s*1.6, p.s);
      });
    }
    diskPass(true);
    ctx.save(); ctx.strokeStyle = 'rgba(255,120,20,.55)'; ctx.lineWidth = Rh*.22; ctx.shadowColor = '#ff6500'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.ellipse(cx, cy, Rh*1.55, Rh*1.25, 0, Math.PI*1.04, Math.PI*1.96); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.shadowColor = '#ff6500'; ctx.shadowBlur = 30; ctx.strokeStyle = '#ffb27a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, Rh*1.08, 0, 6.283); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, Rh, 0, 6.283); ctx.fill();
    diskPass(false);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var reach = Math.max(140, Math.min(200, A.w*.3));
    words.forEach(function(w){
      if (!WDC.reduced && dt){
        w.a += dt*Math.pow(Rh*2/w.r, 1.5)*.9;
        w.r -= dt*(10 + 2600/w.r)*(Rh/90);
        var x = cx + Math.cos(w.a)*w.r + w.ox, y = cy + Math.sin(w.a)*w.r*.62 + w.oy;
        var dx = ptr.x - x, dy = ptr.y - y, d = Math.hypot(dx, dy);
        if (d < reach && d > 0){ var f = (1 - d/reach)*260; w.ox += dx/d*f*dt; w.oy += dy/d*f*dt; w.r += dt*(10 + 2600/w.r)*(1 - d/reach)*1.4; }
        w.ox *= 1 - 1.2*dt; w.oy *= 1 - 1.2*dt;
        if (w.r < Rh*.95) spawn(w, false);
      }
      var x2 = cx + Math.cos(w.a)*w.r + w.ox, y2 = cy + Math.sin(w.a)*w.r*.62 + w.oy;
      var near = Math.max(0, Math.min(1, (Rh*3.2 - w.r)/(Rh*2.2)));
      var g = Math.round(255 - near*200), b = Math.round(255 - Math.min(1, near*1.6)*255);
      var ang = Math.atan2(y2 - cy, x2 - cx) + Math.PI/2; if (Math.cos(ang) < 0) ang += Math.PI;
      ctx.save(); ctx.translate(x2, y2); ctx.rotate(ang); ctx.scale(1 - near*.65, 1 + near*near*3.2);
      ctx.globalAlpha = Math.max(0, Math.min(1, (w.r - Rh*.95)/(Rh*.6)));
      ctx.fillStyle = 'rgb(255,' + g + ',' + b + ')';
      ctx.font = '700 ' + (w.size*Math.max(.75, Math.min(1, A.w/700))) + 'px "WDC Grotesk", "Space Grotesk", system-ui, sans-serif';
      ctx.fillText(w.t, 0, 0); ctx.restore();
    });
    tickChip(dt);
  }
  WDC.onResize(layout); layout(WDC.area());
  setTimeout(function(){ hint.style.opacity = 0; }, 10000);
  if (WDC.reduced){ frame(0, 0); setInterval(function(){ if (!document.hidden) tickChip(1); }, 1000); }
  else WDC.loop(function(dt, now){ frame(dt, now); });

  var off = null;
  chip.addEventListener('pointerdown', function(e){ held = true; chip.setPointerCapture(e.pointerId); off = {x:e.clientX - chipPos.x, y:e.clientY - chipPos.y}; hint.style.opacity = 0; });
  chip.addEventListener('pointermove', function(e){ if (!held) return; chipPos.x = e.clientX - off.x; chipPos.y = e.clientY - off.y; clampChip(); });
  function up(){ held = false; }
  chip.addEventListener('pointerup', up); chip.addEventListener('pointercancel', up);
  chip.addEventListener('keydown', function(e){
    var m = {ArrowLeft:[-24,0], ArrowRight:[24,0], ArrowUp:[0,-24], ArrowDown:[0,24]}[e.key]; if (!m) return;
    e.preventDefault(); chipPos.x += m[0]; chipPos.y += m[1]; clampChip(); if (WDC.reduced) tickChip(0);
  });
})();
`,
};

export default t11;
