import type { TemplateModule } from "../shell";

/**
 * 04, THE STUDIO SIGN. A shop sign hanging on a string. It is a real
 * pendulum: the period comes from its length at 300 px to the metre, so a
 * longer string on a taller screen swings slower, as it would. It also turns
 * on the string, and the twist rests face out or face back, never edge on.
 * Drag it and let go, flick it sideways to spin it, or tap it to flip it to
 * the split-flap countdown on the back.
 */
const t04: TemplateModule = {
  css: String.raw`
.stage{background:radial-gradient(110% 80% at 60% 18%,#0e0e84 0%,var(--navy) 55%,#00004c 100%)}
.hang,.shade{position:absolute;top:0;left:var(--px);width:0;height:0;transform:rotate(var(--th,0rad));will-change:transform}
.shade{transform:translate(22px,30px) rotate(var(--th,0rad));opacity:.6}
.shade i{position:absolute;left:calc(var(--sw)/-2);top:var(--L);width:var(--sw);height:var(--sh);border-radius:18px;background:#00001c;filter:blur(20px);transform:scaleX(var(--cosph,1))}
.string{position:absolute;left:-1px;top:0;width:2px;height:calc(var(--L) - var(--tri));background:#c7c9ec}
/* Above the sign, so each rope is seen running down to its eyelet instead of vanishing behind the card's edge. */
.tri{position:absolute;left:calc(var(--sw)/-2);top:calc(var(--L) - var(--tri));overflow:visible;z-index:2;pointer-events:none}
.hook{position:absolute;left:-7px;top:calc(var(--L) - var(--tri) - 7px);width:14px;height:14px;border-radius:50%;border:3px solid #c7c9ec;background:var(--navy)}
.wrap{position:absolute;left:calc(var(--sw)/-2);top:var(--L);width:var(--sw);height:var(--sh);perspective:1400px}
.card{position:absolute;inset:0;border:0;padding:0;margin:0;background:none;cursor:grab;transform-style:preserve-3d;transform:rotateY(var(--ph,0deg));touch-action:none;border-radius:18px;color:inherit}
.card:active{cursor:grabbing}
.card:focus-visible{outline:none}
.card:focus-visible .face{outline:3px solid var(--orange);outline-offset:4px}
.face{position:absolute;inset:0;border-radius:18px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:grid;align-content:center;justify-items:center;text-align:center;gap:calc(var(--sw)*.02);padding:calc(var(--sw)*.05);overflow:hidden}
/* The eyelets the two ropes are threaded through: where each rope ends, so
   the sign hangs FROM them rather than beside them. */
.eye{position:absolute;top:5px;width:14px;height:14px;margin-left:-7px;border-radius:50%;border:3px solid #c7c9ec;background:#00003a;box-shadow:inset 0 1px 2px rgba(0,0,0,.5)}
.eye.l{left:calc(50% - var(--sw)*.28)}.eye.r{left:calc(50% + var(--sw)*.28)}
.front{background:#fff;color:var(--navy)}
.front .ey{font:700 calc(var(--sw)*.028)/1 var(--body);letter-spacing:.2em;text-transform:uppercase;color:var(--orange-ink)}
.front .big{font:700 calc(var(--sw)*.15)/.9 var(--display);letter-spacing:-.04em}
.front .rule{width:calc(var(--sw)*.13);height:5px;background:var(--orange);border-radius:3px}
.front .sub{font:600 calc(var(--sw)*.036)/1.3 var(--body);color:#2b2b6e}
.back{background:#0b0b0b;color:#fff;transform:rotateY(180deg)}
.back .ey{font:700 calc(var(--sw)*.03)/1 var(--body);letter-spacing:.2em;text-transform:uppercase;color:var(--orange)}
.back .sub{font:500 calc(var(--sw)*.034)/1.3 var(--body);color:#c9c9c9}
.flaps{display:flex;align-items:center;gap:calc(var(--sw)*.012)}
.flaps .colon{font:700 calc(var(--sw)*.07)/1 var(--display);color:#555}
.fl{position:relative;width:calc(var(--sw)*.105);height:calc(var(--sw)*.15);font:700 calc(var(--sw)*.11)/1 var(--display);color:var(--orange);perspective:300px}
.fl>span{position:absolute;left:0;right:0;height:50%;overflow:hidden;background:#1c1c1c;display:block}
.fl>span b{position:absolute;left:0;right:0;height:200%;display:grid;place-items:center;font-variant-numeric:tabular-nums}
.fl .t,.fl .ft{top:0;border-radius:6px 6px 0 0}.fl .t b,.fl .ft b{top:0}
.fl .bt,.fl .fb{bottom:0;border-radius:0 0 6px 6px}.fl .bt b,.fl .fb b{bottom:0}
.fl .ft{transform-origin:50% 100%;z-index:2}
.fl .fb{transform-origin:50% 0;z-index:2;transform:rotateX(90deg)}
.fl::after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;background:#0b0b0b;z-index:3}
.fl.go .ft{animation:ft .26s ease-in forwards}
.fl.go .fb{animation:fb .26s .24s ease-out forwards}
@keyframes ft{to{transform:rotateX(-90deg)}}
@keyframes fb{from{transform:rotateX(90deg)}to{transform:rotateX(0)}}
.hint{position:absolute;left:var(--px);transform:translateX(-50%);margin:0;font:500 .9rem/1 var(--body);color:var(--mist);display:flex;gap:.5rem;align-items:center;transition:opacity .5s;white-space:nowrap}
.hint kbd{font:700 .72rem/1 var(--body);background:#fff;color:#000;border-radius:6px;padding:.3rem .45rem}
.hint.gone{opacity:0}
`,
  body: () => `<main class="stage" id="stage" aria-label="A hanging studio sign">
  <div class="shade" id="shade" aria-hidden="true"><i></i></div>
  <div class="hang" id="hang">
    <div class="string" aria-hidden="true"></div>
    <svg class="tri" id="tri" aria-hidden="true"></svg>
    <div class="hook" aria-hidden="true"></div>
    <div class="wrap">
      <button class="card" id="card" type="button" aria-label="The studio sign reads: back shortly. Press to flip it to the countdown.">
        <span class="face front" aria-hidden="true">
          <span class="eye l"></span><span class="eye r"></span>
          <span class="ey">We Dig Creativity · Studio</span>
          <span class="big">Back<br>shortly</span>
          <span class="rule"></span>
          <span class="sub">Out for a rethink. Flick me.</span>
        </span>
        <span class="face back" aria-hidden="true">
          <span class="eye l"></span><span class="eye r"></span>
          <span class="ey" id="backey">Back in</span>
          <span class="flaps" id="flaps"></span>
          <span class="sub" id="backsub"></span>
        </span>
      </button>
    </div>
  </div>
  <p class="hint" id="hint">Drag it, flick it, or tap to flip <kbd>Enter</kbd></p>
  <p class="sr" id="sr" aria-live="polite"></p>
</main>`,
  script: String.raw`
(function(){
  var stage = document.getElementById('stage'), hang = document.getElementById('hang'), shade = document.getElementById('shade');
  var card = document.getElementById('card'), hint = document.getElementById('hint');
  var PX_PER_M = 300, GRAV = 9.81*PX_PER_M, G = {};
  function layout(A){
    var px = A.cx, tri = 64;
    var sw = Math.min(420, A.w*.82), sh = sw*.62;
    /* the sign, and the hint below it, sit a little above the middle of the scene */
    var room = A.h - 120;
    if (sh > room){ sh = Math.max(110, room); sw = sh/.62; }
    var L = A.t + Math.max(60, (A.h - sh - 70)*.42);
    G = {px:px, sw:sw, sh:sh, L:L, lc:L + sh/2};
    var s = stage.style;
    s.setProperty('--px', px + 'px'); s.setProperty('--sw', sw + 'px'); s.setProperty('--sh', sh + 'px');
    s.setProperty('--L', L + 'px'); s.setProperty('--tri', tri + 'px');
    var t = document.getElementById('tri'); t.setAttribute('width', sw); t.setAttribute('height', tri + 12);
    t.innerHTML = '<path id="ropes" stroke="#c7c9ec" stroke-width="2" stroke-linecap="round" fill="none"/>';
    G.tri = tri; lastPh = null; ropes(0);
    hint.style.top = Math.min(A.b - 20, L + sh + 34) + 'px';
  }
  /* THE ROPES FOLLOW THE EYELETS. As the sign turns on its string the eyelets
     swing in towards the middle by cos(twist), so the rope ends are drawn
     there every frame; drawn at full width they came away from a sign seen
     half edge-on. The string's hook is the fixed apex of both. */
  var lastPh = null, PERSP = 1400;
  function ropes(phDeg){
    if (lastPh !== null && Math.abs(phDeg - lastPh) < .15) return; lastPh = phDeg;
    var r = document.getElementById('ropes'); if (!r || !G.sw) return;
    /* Each eyelet is a point on the card, 28% of the width either side of the
       middle and 12px below its top edge. The card turns about its vertical
       axis inside a 1400px perspective centred on it, so the eyelet lands at
       x·cos, pulled in or pushed out by P / (P − z) where z = −x·sin: the same
       projection the browser draws the card with, so rope and eyelet meet. */
    var f = phDeg*Math.PI/180, cx = G.sw/2, cy = G.tri + G.sh/2, y0 = 12 - G.sh/2;
    function end(x0){ var z = -x0*Math.sin(f), k = PERSP/(PERSP - z); return [cx + x0*Math.cos(f)*k, cy + y0*k]; }
    var a = end(-G.sw*.28), b = end(G.sw*.28);
    r.setAttribute('d', 'M' + cx + ' 0 L' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' M' + cx + ' 0 L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1));
  }
  WDC.onResize(function(A){ lastPh = null; layout(A); }); layout(WDC.area());

  /* ---- split-flap countdown ---- */
  var flaps = document.getElementById('flaps'), cells = [];
  for (var i = 0; i < 6; i++){
    if (i === 2 || i === 4){ var c = document.createElement('span'); c.className = 'colon'; c.textContent = ':'; flaps.appendChild(c); }
    var f = document.createElement('span'); f.className = 'fl';
    f.innerHTML = '<span class="t"><b>0</b></span><span class="bt"><b>0</b></span><span class="ft"><b>0</b></span><span class="fb"><b>0</b></span>';
    flaps.appendChild(f); cells.push({el:f, v:'0'});
  }
  function setCell(c, v){
    if (c.v === v) return;
    var q = function(s){ return c.el.querySelector(s + ' b'); };
    q('.ft').textContent = c.v; q('.bt').textContent = c.v; q('.t').textContent = v; q('.fb').textContent = v;
    if (!WDC.reduced){ c.el.classList.remove('go'); void c.el.offsetWidth; c.el.classList.add('go'); }
    clearTimeout(c.tm); c.tm = setTimeout(function(){ q('.bt').textContent = v; }, WDC.reduced ? 0 : 520);
    c.v = v;
  }
  var backsub = document.getElementById('backsub');
  if (WDC.backBy) backsub.textContent = new Date(WDC.backBy).toLocaleString('en-GB', {weekday:'long', hour:'2-digit', minute:'2-digit', timeZone:'Africa/Lagos'}) + ' · Lagos time';
  else { document.getElementById('backey').textContent = 'Away for'; backsub.textContent = 'Back as soon as it is ready'; }
  function tick(){
    var ms = WDC.backBy ? WDC.remaining() : Date.now() - WDC.since;
    var s = Math.max(0, Math.round(ms/1000));
    var str = String(Math.min(99, Math.floor(s/3600))).padStart(2,'0') + String(Math.floor(s%3600/60)).padStart(2,'0') + String(s%60).padStart(2,'0');
    for (var i = 0; i < 6; i++) setCell(cells[i], str[i]);
  }
  tick(); setInterval(function(){ if (!document.hidden) tick(); }, 1000);

  /* ---- physics ----
     th: the swing, a pendulum about the top of the string, w^2 = g / length.
     ph: the twist, in degrees, with a torque that rests it at 0 or 180. */
  var th = WDC.reduced ? 0 : .2, thv = 0, ph = 0, phv = 0, drag = null, t0 = 0;
  var DAMP = .22, TW = 14, TDAMP = 1.3;
  function render(){
    hang.style.setProperty('--th', th + 'rad'); shade.style.setProperty('--th', th + 'rad');
    card.style.setProperty('--ph', ph + 'deg');
    ropes(ph);
    shade.style.setProperty('--cosph', Math.max(.05, Math.abs(Math.cos(ph*Math.PI/180))));
  }
  function facing(){ return Math.abs(Math.round(ph/180))%2 ? 'back' : 'front'; }
  var lastFace = 'front';
  function announce(){
    var f = facing(); if (f === lastFace || Math.abs(phv) > 30) return; lastFace = f;
    card.setAttribute('aria-label', f === 'back' ? 'The studio sign shows the countdown. Press to flip it back.' : 'The studio sign reads: back shortly. Press to flip it to the countdown.');
    document.getElementById('sr').textContent = f === 'back' ? (WDC.backBy ? 'Back in ' + WDC.fmtLeft(WDC.remaining()) + '.' : 'Back as soon as it is ready.') : 'Back shortly.';
  }
  function gone(){ hint.classList.add('gone'); }
  function flip(dir){ gone(); if (WDC.reduced){ ph = (Math.round(ph/180) + 1)*180; render(); announce(); } else phv += (dir || 1)*540; }

  if (!WDC.reduced) WDC.loop(function(dt, now){
    if (!dt) return;
    /* small steps keep the integration stable at any frame rate */
    var steps = Math.ceil(dt/.008), h = dt/steps, w2 = GRAV/Math.max(200, G.lc);
    for (var k = 0; k < steps; k++){
      if (!drag){ thv += (-w2*Math.sin(th) - DAMP*thv + Math.sin(now/1900)*.02)*h; th += thv*h; }
      var r = ph*Math.PI/180;
      phv += (-TW*Math.sin(2*r)*57.3 - TDAMP*phv)*h; ph += phv*h;
    }
    render(); announce();
  });
  render();

  card.addEventListener('pointerdown', function(e){
    card.setPointerCapture(e.pointerId);
    drag = {x:e.clientX, y:e.clientY, lx:e.clientX, lt:performance.now(), moved:0, vx:0, off:th + Math.atan2(e.clientX - G.px, e.clientY)};
    t0 = performance.now(); thv = 0; gone();
  });
  card.addEventListener('pointermove', function(e){
    if (!drag) return;
    var now = performance.now(), a = Math.max(-1.25, Math.min(1.25, -Math.atan2(e.clientX - G.px, e.clientY) + drag.off));
    var dt = Math.max(8, now - drag.lt)/1000;
    if (!WDC.reduced){ thv = thv*.5 + ((a - th)/dt)*.5; th = a; }
    drag.vx = drag.vx*.4 + ((e.clientX - drag.lx)/dt)*.6; drag.lx = e.clientX; drag.lt = now;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
  });
  function up(){
    if (!drag) return;
    var tap = performance.now() - t0 < 350 && drag.moved < 8;
    if (tap) flip(1);
    else if (Math.abs(drag.vx) > 900 && !WDC.reduced) phv += (drag.vx > 0 ? 1 : -1)*Math.min(1400, Math.abs(drag.vx)*.5);
    thv = Math.max(-5, Math.min(5, thv));
    drag = null;
  }
  card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
  card.addEventListener('keydown', function(e){
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ e.preventDefault(); gone(); if (!WDC.reduced) thv += e.key === 'ArrowLeft' ? -1.2 : 1.2; }
  });
  /* Enter and Space arrive as a click with no pointer behind it */
  card.addEventListener('click', function(e){ if (e.detail === 0) flip(1); });
})();
`,
};

export default t04;
