import type { TemplateModule } from "../shell";

/**
 * 06, ZERO GRAVITY. The homepage, which lets go of itself. Every piece is a
 * rigid body in Matter.js (rotation, friction, restitution and stacking are
 * the engine's, not approximations), and gravity is tied to the maintenance
 * clock: nothing weighs anything at the start, gravity returns between 45%
 * and 90% so the pieces fall and pile up, and from 90% every piece is drawn
 * back to its exact place in the layout and set down. Grab anything and
 * throw it.
 */
const t06: TemplateModule = {
  vendor: ["/maintenance/matter-0.20.0.min.js"],
  css: String.raw`
.stage{background:radial-gradient(90% 70% at 65% 30%,#0b0b80 0%,var(--navy) 60%,#000048 100%)}
.home{position:absolute;display:grid;gap:clamp(12px,2vh,18px);align-content:start}
.b{transition:none!important;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;will-change:transform}
.b.held{cursor:grabbing;z-index:20}
.free .b{position:absolute;margin:0}
.b.landed{animation:land .38s cubic-bezier(.3,1.6,.5,1)}
@keyframes land{0%{scale:1}40%{scale:1.04}100%{scale:1}}
.nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:8px;background:#fff;color:var(--navy);border-radius:999px;padding:6px 14px 6px 6px;font:700 .95rem/1 var(--display)}
.logo i{width:26px;height:26px;border-radius:50%;background:var(--navy);display:grid;place-items:center}
.logo img{width:16px;height:17px;display:block}
.link{font:600 .9rem/1 var(--body);color:#fff;padding:10px 13px;border-radius:999px;background:var(--navy-lift)}
.eyebrow-b{justify-self:start;font:700 .72rem/1 var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--orange);padding:4px 0}
.h1{display:flex;flex-wrap:wrap;gap:.08em .26em;margin:0;font:700 var(--h1,4rem)/.98 var(--display);letter-spacing:-.035em}
.h1 .b{display:inline-block}
.h1 .o{color:var(--orange)}
.lede{justify-self:start;max-width:34rem;color:var(--mist);font:500 1.02rem/1.45 var(--body);margin:0}
.ctas{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:4px}
.card{background:#fff;color:#000;border-radius:16px;padding:16px;display:grid;gap:8px;align-content:start}
.card i{width:36px;height:36px;border-radius:10px;background:var(--navy);display:grid;place-items:center}
.card i::after{content:"";width:13px;height:13px;border-radius:4px;background:var(--orange)}
.card b{font:700 1.02rem/1.1 var(--display)}
.card span{font:500 .84rem/1.3 var(--body);color:#3a3a5a}
.sticker{background:var(--orange);color:#000;font:700 .98rem/1 var(--display);padding:12px 16px;border-radius:999px}
.home.compact .cards{grid-template-columns:repeat(2,minmax(0,1fr))}
.home.compact .cards .card:nth-child(3){display:none}
.home.tiny .cards{display:none}
.meter{position:absolute;display:flex;align-items:center;gap:.7rem;background:#000;border-radius:999px;padding:.5rem .85rem;font:600 .8rem/1 var(--body);color:var(--mist)}
.meter .bar{width:96px;height:6px;border-radius:3px;background:#2a2a2a;overflow:hidden}
.meter .bar i{display:block;height:100%;background:var(--orange);transform-origin:left;transform:scaleX(var(--g,0))}
.meter b{color:#fff;font-variant-numeric:tabular-nums;min-width:2.6em;text-align:right}
.hint{position:absolute;margin:0;font:500 .85rem/1.3 var(--body);color:var(--mist);transition:opacity .6s}
.hint.gone{opacity:0}
`,
  body: () => `<main class="stage" id="stage" aria-label="The homepage, floating in zero gravity">
  <div class="home" id="home" aria-hidden="true">
    <div class="nav">
      <span class="b logo"><i><img src="/brand/icon-white-accent.svg" alt=""></i>WDC</span>
      <span class="b link">Work</span><span class="b link">Services</span><span class="b link">Blog</span><span class="b link">Contact</span>
    </div>
    <span class="b eyebrow-b">Brilliant simplicity of thought</span>
    <p class="h1"><span class="b">Brands</span><span class="b">that get</span><span class="b o">noticed,</span><span class="b">get found,</span><span class="b">and get</span><span class="b o">results.</span></p>
    <p class="b lede">Branding, web development, SEO, mobile apps, AI software and digital marketing.</p>
    <div class="ctas"><span class="b btn btn-primary">Start a project</span><span class="b btn btn-secondary">See our work</span><span class="b sticker">Back shortly</span></div>
    <div class="cards">
      <div class="b card"><i></i><b>Branding</b><span>Identities people remember.</span></div>
      <div class="b card"><i></i><b>Web development</b><span>Fast sites that sell.</span></div>
      <div class="b card"><i></i><b>SEO</b><span>Found by the right people.</span></div>
    </div>
  </div>
  <p class="hint" id="hint">Grab anything and throw it. Gravity comes back as the work finishes.</p>
  <div class="meter" id="meter"><span>Gravity</span><span class="bar"><i id="gbar"></i></span><b id="gval">0%</b></div>
  <p class="sr" id="sr" aria-live="polite"></p>
</main>`,
  script: String.raw`
(function(){
  var M = window.Matter, home = document.getElementById('home'), hint = document.getElementById('hint'), meter = document.getElementById('meter');
  var els = [].slice.call(home.querySelectorAll('.b')), bodies = [], walls = [], A = null;
  var engine = M ? M.Engine.create({positionIterations:8, velocityIterations:6}) : null;
  if (engine) engine.gravity.y = 0;
  function smooth(a, b, x){ x = Math.max(0, Math.min(1, (x - a)/(b - a))); return x*x*(3 - 2*x); }
  function wrap(a){ return Math.atan2(Math.sin(a), Math.cos(a)); }

  /* Lay the page out as a page, read where everything sits, then free it. */
  function measureHome(){
    home.classList.remove('free');
    els.forEach(function(e){ e.style.transform = ''; e.style.left = e.style.top = e.style.width = e.style.display = ''; });
    home.style.left = (A.l + 8) + 'px'; home.style.top = (A.t + 40) + 'px'; home.style.width = Math.max(260, A.w - 16) + 'px';
    home.style.setProperty('--h1', Math.max(28, Math.min(A.w*.085, A.h*.1, 74)) + 'px');
    home.classList.toggle('compact', A.w < 640); home.classList.toggle('tiny', A.h < 420);
    var hb = home.getBoundingClientRect();
    var rects = els.map(function(e){
      var r = e.getBoundingClientRect(), hidden = !r.width;
      return {x:r.left - hb.left, y:r.top - hb.top, w:r.width, h:r.height, hidden:hidden};
    });
    home.classList.add('free');
    return {hb:hb, rects:rects};
  }
  function build(){
    var old = bodies.slice(), m = measureHome();
    if (engine){ M.Composite.clear(engine.world, false); }
    bodies = [];
    els.forEach(function(e, i){
      var r = m.rects[i];
      if (r.hidden){ e.style.display = 'none'; return; }
      e.style.left = r.x + 'px'; e.style.top = r.y + 'px'; e.style.width = r.w + 'px';
      var hx = m.hb.left + r.x + r.w/2, hy = m.hb.top + r.y + r.h/2;
      var prev = old.find(function(o){ return o.el === e; });
      var o = {el:e, hx:hx, hy:hy, w:r.w, h:r.h, body:null, home:!prev || prev.home, x:prev ? prev.body.position.x : hx, y:prev ? prev.body.position.y : hy, a:prev ? prev.body.angle : 0};
      if (engine){
        var radius = Math.min(parseFloat(getComputedStyle(e).borderTopLeftRadius) || 4, r.h/2 - .5, r.w/2 - .5);
        o.body = M.Bodies.rectangle(Math.max(A.l + r.w/2, Math.min(A.W - r.w/2, o.x)), Math.max(r.h/2, Math.min(floorY() - r.h/2, o.y)), r.w, r.h,
          {chamfer:{radius:Math.max(0, radius)}, friction:.35, frictionStatic:.6, restitution:.6, frictionAir:.004, density:.0015, slop:.02});
        M.Body.setAngle(o.body, o.a);
        if (prev){ M.Body.setVelocity(o.body, prev.body.velocity); M.Body.setAngularVelocity(o.body, prev.body.angularVelocity); }
        M.Composite.add(engine.world, o.body);
      }
      bodies.push(o);
    });
    if (engine){
      var T = 400, W = A.W, left = A.side ? A.l - 12 : 0, f = floorY();
      walls = [
        M.Bodies.rectangle(W/2, -T/2, W*3, T, {isStatic:true}),
        M.Bodies.rectangle(W/2, f + T/2, W*3, T, {isStatic:true, friction:.8}),
        M.Bodies.rectangle(left - T/2, A.H/2, T, A.H*3, {isStatic:true}),
        M.Bodies.rectangle(W + T/2, A.H/2, T, A.H*3, {isStatic:true})
      ];
      M.Composite.add(engine.world, walls);
    }
    meter.style.right = (A.W - A.r) + 'px'; meter.style.top = (A.t - 8) + 'px';
    hint.style.left = A.l + 'px'; hint.style.top = (A.t - 4) + 'px'; hint.style.maxWidth = Math.max(0, A.w - 230) + 'px';
    hint.hidden = A.w < 520;
    paint();
  }
  /* the floor is the top of the lockup on phones, the foot of the screen beside it */
  function floorY(){ return A.side ? A.H - 4 : A.b - 2; }

  function paint(){
    bodies.forEach(function(o){
      var x = o.body ? o.body.position.x : o.x, y = o.body ? o.body.position.y : o.y, a = o.body ? o.body.angle : o.a;
      o.el.style.transform = 'translate(' + (x - o.hx).toFixed(2) + 'px,' + (y - o.hy).toFixed(2) + 'px) rotate(' + a.toFixed(4) + 'rad)';
    });
  }

  var released = false, state = 'float', lastSay = '';
  var gbar = document.getElementById('gbar'), gval = document.getElementById('gval');
  function phase(){ var p = WDC.progress(); return {p:p, g:smooth(.45, .9, p), pull:p >= .9}; }
  function tune(s){
    /* zero-g pieces bounce off each other like balloons; with weight they settle and stack */
    var rest = .7 - .5*s.g, air = .004 + .02*s.g;
    bodies.forEach(function(o){ if (o.body){ o.body.restitution = rest; o.body.frictionAir = air; } });
  }
  function say(t){ if (t !== lastSay){ lastSay = t; document.getElementById('sr').textContent = t; } }

  function setPull(on){
    bodies.forEach(function(o){
      if (!o.body) return;
      if (on){ o.body.isSensor = true; o.home = false; }
      else { if (o.body.isStatic) M.Body.setStatic(o.body, false); o.body.isSensor = false; o.home = false; }
    });
  }
  function step(dt){
    var s = phase();
    gbar.style.setProperty('--g', s.g); gval.textContent = Math.round(s.g*100) + '%';
    if (!engine) return;
    var want = s.pull ? 'pull' : 'float';
    if (want !== state){ state = want; setPull(want === 'pull'); if (want === 'float') kick(); }
    say(state === 'pull' ? 'The page has settled back into place.' : s.g > .5 ? 'Gravity is coming back.' : 'Everything on the page is floating.');
    if (!released) return;
    tune(s);
    engine.gravity.y = state === 'pull' ? 0 : s.g;
    acc += Math.min(dt, .05);
    while (acc >= STEP){
      if (state === 'pull') bodies.forEach(function(o){
        if (!o.body || o.body.isStatic || o === held) return;
        var b = o.body, dx = o.hx - b.position.x, dy = o.hy - b.position.y, da = wrap(0 - b.angle);
        /* a critically damped pull home, then set down */
        M.Body.setVelocity(b, {x:b.velocity.x*.8 + dx*.06, y:b.velocity.y*.8 + dy*.06});
        M.Body.setAngularVelocity(b, b.angularVelocity*.8 + da*.06);
        if (Math.abs(dx) + Math.abs(dy) < .6 && Math.abs(da) < .004 && Math.hypot(b.velocity.x, b.velocity.y) < .6){
          M.Body.setPosition(b, {x:o.hx, y:o.hy}); M.Body.setAngle(b, 0); M.Body.setStatic(b, true);
          if (!o.home){ o.home = true; o.el.classList.remove('landed'); void o.el.offsetWidth; o.el.classList.add('landed'); }
        }
      });
      else if (s.g < .05) bodies.forEach(function(o){
        /* in zero-g, a piece that has drifted to a stop gets the faintest nudge */
        if (!o.body || o === held) return;
        var v = o.body.velocity; if (Math.abs(v.x) + Math.abs(v.y) < .08) M.Body.applyForce(o.body, o.body.position, {x:(Math.random() - .5)*o.body.mass*.00012, y:(Math.random() - .5)*o.body.mass*.00012});
      });
      M.Engine.update(engine, STEP*1000);
      acc -= STEP;
    }
    paint();
  }
  var STEP = 1/60, acc = 0;
  function kick(){
    bodies.forEach(function(o){ if (!o.body) return; var a = Math.random()*6.283, sp = .6 + Math.random()*1.4;
      M.Body.setVelocity(o.body, {x:Math.cos(a)*sp, y:Math.sin(a)*sp}); M.Body.setAngularVelocity(o.body, (Math.random() - .5)*.03); });
  }

  WDC.onResize(function(a){ A = a; build(); });
  A = WDC.area(); build();

  if (WDC.reduced || !engine){
    /* a still frame: floating pieces, or the page set back when the work is done */
    var p = phase();
    gbar.style.setProperty('--g', p.g); gval.textContent = Math.round(p.g*100) + '%';
    if (!p.pull) bodies.forEach(function(o, i){
      o.x = o.hx + Math.sin(i*2.1)*A.w*.08; o.y = o.hy + Math.cos(i*1.7)*A.h*.06; o.a = Math.sin(i*3.3)*.35;
      if (o.body){ M.Body.setPosition(o.body, {x:o.x, y:o.y}); M.Body.setAngle(o.body, o.a); }
    });
    paint(); return;
  }
  setTimeout(function(){ hint.classList.add('gone'); }, 9000);
  setTimeout(function(){ released = true; if (!phase().pull){ state = 'float'; kick(); } else { state = ''; } }, 900);
  WDC.loop(function(dt){ if (dt) step(dt); });

  /* grab and throw: a soft spring from the finger to the point that was grabbed */
  var held = null, spring = null;
  home.addEventListener('pointerdown', function(e){
    var el = e.target.closest('.b'); if (!el || state === 'pull' || !released) return;
    held = bodies.find(function(o){ return o.el === el; }); if (!held || !held.body) return;
    el.setPointerCapture(e.pointerId); el.classList.add('held'); hint.classList.add('gone');
    var b = held.body, local = M.Vector.rotate(M.Vector.sub({x:e.clientX, y:e.clientY}, b.position), -b.angle);
    spring = M.Constraint.create({pointA:{x:e.clientX, y:e.clientY}, bodyB:b, pointB:local, stiffness:.12, damping:.08, length:0});
    M.Composite.add(engine.world, spring); e.preventDefault();
  });
  home.addEventListener('pointermove', function(e){ if (spring){ spring.pointA = {x:e.clientX, y:e.clientY}; } });
  function drop(){
    if (!held) return; held.el.classList.remove('held');
    if (spring) M.Composite.remove(engine.world, spring);
    var v = held.body.velocity, sp = Math.hypot(v.x, v.y), max = 40;
    if (sp > max) M.Body.setVelocity(held.body, {x:v.x/sp*max, y:v.y/sp*max});
    held = null; spring = null;
  }
  home.addEventListener('pointerup', drop); home.addEventListener('pointercancel', drop);
  home.addEventListener('dragstart', function(e){ e.preventDefault(); });
})();
`,
};

export default t06;
