import type { TemplateModule } from "../shell";

/**
 * 07, THE TINY CREW. A small crew in hard hats carries the letters of BACK
 * SHORTLY from a crate, up a ladder and onto the scaffold, one at a time.
 * One of them drops the K on the first trip and has to go back for it. Pick
 * any of them up: they object, kick, and when let go they fall (and land on
 * a platform if there is one under them), then get back to work. On a phone
 * the sign goes up in two rows, BACK above SHORTLY, so the letters stay big.
 */
const t07: TemplateModule = {
  css: String.raw`
.stage{background:linear-gradient(180deg,var(--navy) 0%,#00007a 100%)}
.ground{position:absolute;left:0;right:0;bottom:0;background:#00003f;border-top:3px solid var(--orange)}
#scaf{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.crate{position:absolute;height:54px;background:#7a3a00;border:3px solid var(--orange);border-radius:6px;display:grid;place-items:center;font:700 .6rem/1 var(--body);letter-spacing:.14em;color:#fff;text-transform:uppercase;z-index:3}
.crate::before{content:"";position:absolute;left:8px;right:8px;top:50%;height:2px;background:rgba(255,255,255,.2)}
.lt{position:absolute;left:0;top:0;display:grid;place-items:center;font:700 var(--fs)/1 var(--display);letter-spacing:-.02em;color:#fff;will-change:transform;pointer-events:none;z-index:2;transform-origin:50% 100%}
.lt.o{color:var(--orange)}
.lt.crated{z-index:1}
.ghost{position:absolute;left:0;top:0;display:grid;place-items:center;font:700 var(--fs)/1 var(--display);letter-spacing:-.02em;color:transparent;-webkit-text-stroke:1.5px rgba(199,201,236,.28);pointer-events:none;z-index:1}
.wk{position:absolute;left:0;top:0;width:34px;height:52px;margin-left:-17px;touch-action:none;cursor:grab;z-index:4;will-change:transform}
.wk:active{cursor:grabbing}
.fig{position:absolute;inset:0}
.fig i{position:absolute;display:block}
.hat{left:6px;top:0;width:22px;height:11px;border-radius:11px 11px 2px 2px;background:var(--orange)}
.hat::after{content:"";position:absolute;left:-4px;right:-4px;bottom:-2px;height:3px;border-radius:2px;background:var(--orange)}
.head{left:8px;top:9px;width:18px;height:16px;border-radius:50%;background:#fff}
.head::before,.head::after{content:"";position:absolute;top:6px;width:3px;height:3px;border-radius:50%;background:#000}
.head::before{left:5px}.head::after{right:5px}
.bod{left:6px;top:25px;width:22px;height:17px;border-radius:7px;background:#000;border:2px solid #fff}
.bod::after{content:"";position:absolute;left:4px;right:4px;top:5px;height:2px;background:#fff;border-radius:1px}
.leg{top:40px;width:4px;height:12px;border-radius:2px;background:#fff;transform-origin:top center}
.leg.l{left:11px}.leg.r{left:19px}
.arm{top:14px;width:4px;height:14px;border-radius:2px;background:#fff;opacity:0}
.arm.a1{left:3px;transform:rotate(-15deg)}.arm.a2{left:27px;transform:rotate(15deg)}
.wk.carry .arm{opacity:1}
.wk.walk .leg.l{animation:step .36s ease-in-out infinite alternate}
.wk.walk .leg.r{animation:step .36s ease-in-out infinite alternate-reverse}
.wk.held .leg.l,.wk.fall .leg.l{animation:kick .16s ease-in-out infinite alternate}
.wk.held .leg.r,.wk.fall .leg.r{animation:kick .16s ease-in-out infinite alternate-reverse}
.wk.climb .leg.l{animation:climb .3s infinite alternate}.wk.climb .leg.r{animation:climb .3s infinite alternate-reverse}
@keyframes step{from{transform:rotate(28deg)}to{transform:rotate(-28deg)}}
@keyframes kick{from{transform:rotate(55deg)}to{transform:rotate(-55deg)}}
@keyframes climb{from{transform:translateY(-4px)}to{transform:translateY(1px)}}
.wk.left .fig{transform:scaleX(-1)}
.bub{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%) scale(.6);opacity:0;background:#fff;color:#000;font:700 .72rem/1 var(--body);padding:.35rem .55rem;border-radius:999px;white-space:nowrap;transition:opacity .2s,transform .2s;pointer-events:none}
.bub.on{opacity:1;transform:translateX(-50%) scale(1)}
.hint{position:absolute;margin:0;font:500 .88rem/1.35 var(--body);color:var(--mist);max-width:19rem}
`,
  body: () => `<main class="stage" aria-label="A small crew putting up a sign that reads Back shortly">
  <div class="ground" id="ground" aria-hidden="true"></div>
  <svg id="scaf" aria-hidden="true"></svg>
  <div class="crate" id="crate" aria-hidden="true">Letters</div>
  <div id="world" aria-hidden="true"></div>
  <p class="hint" id="hint">The crew is putting the sign back up. Pick one up. Drop the one with the K near the gap.</p>
  <p class="sr" id="sr" aria-live="polite"></p>
</main>`,
  script: String.raw`
(function(){
  var world = document.getElementById('world'), scaf = document.getElementById('scaf'), crate = document.getElementById('crate');
  var groundEl = document.getElementById('ground'), hint = document.getElementById('hint'), sr = document.getElementById('sr');
  var G = {}, letters = [], workers = [], rows = [], kDropped = false, done = false, doneAt = 0;
  var WALK = 95, CLIMB = 80, GRAV = 1700;

  function lvY(lv){ return lv === 'g' ? G.ground : G.plats[+lv.slice(1)]; }
  function slotX(l){ return G.sx0 + 8 + l.pos*G.slot + G.slot/2; }
  function crateSpot(l){ l.x = G.pile - G.crateW/2 + 18 + (l.i%4)*((G.crateW - 36)/3); l.y = G.ground - 28 - Math.floor(l.i/4)*5; l.rot = (l.i*37)%20 - 10; l.level = 'g'; }

  /* The sign's letters, in rows: one row on a wide screen, BACK over SHORTLY on a narrow one. */
  function makeRows(two){
    var wanted = two ? ['BACK', 'SHORTLY'] : ['BACK SHORTLY'];
    if (rows.join('|') === wanted.join('|')) return false;
    rows = wanted;
    letters.forEach(function(l){ l.el.remove(); l.gh.remove(); });
    letters = [];
    rows.forEach(function(text, r){
      var pos = 0;
      text.split('').forEach(function(ch, k){
        if (ch === ' '){ pos++; return; }
        var el = document.createElement('span'); el.className = 'lt' + ((r === 0 && k < 4) ? ' o' : ''); el.textContent = ch; world.appendChild(el);
        var gh = document.createElement('span'); gh.className = 'ghost'; gh.textContent = ch; world.insertBefore(gh, world.firstChild);
        letters.push({i:letters.length, ch:ch, row:r, pos:pos++, el:el, gh:gh, state:'crate', x:0, y:0, vx:0, vy:0, rot:0, by:null});
      });
    });
    kDropped = false; done = false;
    workers.forEach(function(w){ w.carry = null; w.target = null; if (w.task !== 'held') w.task = 'fetch'; });
    return true;
  }

  function layout(A){
    var two = A.w < 640;
    var fresh = makeRows(two);
    var cols = Math.max.apply(null, rows.map(function(r){ return r.length; }));
    var crateW = two ? 72 : 96;
    var ground = Math.round(A.b - 6);
    var sx1 = A.r - 8;
    var slot = Math.max(20, Math.min(64, (sx1 - (A.l + crateW + 44) - 16)/cols));
    var sx0 = sx1 - slot*cols - 16;
    var span = ground - A.t - 70;
    var gap = rows.length === 1 ? Math.max(150, Math.min(span*.55, slot*4.2)) : Math.max(140, Math.min(span/2.4, slot*4.5));
    var plats = rows.map(function(_, i){ return Math.round(ground - (rows.length - i)*gap); });
    G = {ground:ground, plats:plats, slot:slot, sx0:sx0, sx1:sx1, ladder:sx0 - 14, crateW:crateW, pile:Math.max(A.l + crateW/2, sx0 - 32 - crateW/2), W:A.W, A:A};
    groundEl.style.top = ground + 'px';
    crate.style.width = crateW + 'px'; crate.style.left = (G.pile - crateW/2) + 'px'; crate.style.top = (ground - 54) + 'px';
    var s = '', top = plats[0];
    plats.forEach(function(py){ s += '<rect x="' + sx0 + '" y="' + py + '" width="' + (sx1 - sx0) + '" height="8" rx="2" fill="#c7c9ec"/>'; });
    for (var x = sx0 + 6; x <= sx1; x += slot*2) s += '<line x1="' + x + '" y1="' + (top + 8) + '" x2="' + x + '" y2="' + ground + '" stroke="#3a3ab6" stroke-width="4"/>';
    plats.forEach(function(py, i){
      var below = i + 1 < plats.length ? plats[i + 1] : ground;
      for (var x2 = sx0 + 6; x2 + slot*2 <= sx1; x2 += slot*2)
        s += '<line x1="' + x2 + '" y1="' + (py + 8) + '" x2="' + (x2 + slot*2) + '" y2="' + below + '" stroke="#2a2aa0" stroke-width="2"/><line x1="' + (x2 + slot*2) + '" y1="' + (py + 8) + '" x2="' + x2 + '" y2="' + below + '" stroke="#2a2aa0" stroke-width="2"/>';
    });
    var lx = G.ladder;
    s += '<line x1="' + (lx - 9) + '" y1="' + (top - 30) + '" x2="' + (lx - 9) + '" y2="' + ground + '" stroke="#fff" stroke-width="3"/><line x1="' + (lx + 9) + '" y1="' + (top - 30) + '" x2="' + (lx + 9) + '" y2="' + ground + '" stroke="#fff" stroke-width="3"/>';
    for (var y = ground - 16; y > top - 30; y -= 18) s += '<line x1="' + (lx - 9) + '" y1="' + y + '" x2="' + (lx + 9) + '" y2="' + y + '" stroke="#fff" stroke-width="3"/>';
    scaf.innerHTML = s;
    letters.forEach(function(l){
      [l.el, l.gh].forEach(function(e){ e.style.setProperty('--fs', (slot*1.05) + 'px'); e.style.width = slot + 'px'; e.style.height = (slot*1.15) + 'px'; });
      l.gh.style.transform = 'translate(' + (slotX(l) - slot/2) + 'px,' + (lvY('p' + l.row) - slot*1.15) + 'px)';
      if (l.state === 'placed'){ l.x = slotX(l); l.y = lvY('p' + l.row); }
      else if (l.state === 'crate' || fresh) { l.state = 'crate'; crateSpot(l); }
      else if (l.state === 'ground'){ l.y = G.ground; }
    });
    workers.forEach(function(w){
      if (w.level !== 'air' && w.level !== 'g' && !G.plats[+w.level.slice(1)]) w.level = 'g';
      if (w.level !== 'air') w.y = lvY(w.level);
      w.x = Math.max(A.l + 12, Math.min(A.r - 12, w.x));
    });
    hint.style.left = A.l + 'px'; hint.style.top = A.t + 'px';
    hint.hidden = plats[0] - (two ? 60 : 70) < A.t + 50;
    if (WDC.reduced) stillFrame();
  }

  var n = 5;
  for (var k = 0; k < n; k++){
    var el = document.createElement('div'); el.className = 'wk';
    el.innerHTML = '<div class="fig"><i class="hat"></i><i class="arm a1"></i><i class="arm a2"></i><i class="head"></i><i class="bod"></i><i class="leg l"></i><i class="leg r"></i></div><span class="bub"></span>';
    world.appendChild(el);
    workers.push({el:el, x:0, y:0, vx:0, vy:0, level:'g', task:'fetch', carry:null, dir:1, wait:k*.9, bubT:0, id:k, hop:0});
  }
  WDC.onResize(layout); layout(WDC.area());
  workers.forEach(function(w, i){ w.x = G.pile + G.crateW/2 + 30 + i*30; w.y = G.ground; w.el.style.display = (G.A.w < 420 && i === 4) ? 'none' : ''; if (w.el.style.display) w.task = 'off'; });

  function say(w, t, s){ var b = w.el.querySelector('.bub'); b.textContent = t; b.classList.add('on'); w.bubT = s || 1.4; }
  function stepX(w, x, dt){ var d = x - w.x, s = WALK*dt; w.dir = d < 0 ? -1 : 1; w.x += Math.abs(d) <= s ? d : Math.sign(d)*s; }
  /* walk to x on a level, by way of the ladder. true on arrival. */
  function go(w, x, level, dt){
    if (w.level !== level || w.y !== lvY(w.level)){
      if (Math.abs(w.x - G.ladder) > 2){ w.mode = 'walk'; stepX(w, G.ladder, dt); return false; }
      w.x = G.ladder; w.mode = 'climb';
      var ty = lvY(level), d = ty - w.y, s = CLIMB*dt;
      if (Math.abs(d) <= s){ w.y = ty; w.level = level; } else w.y += Math.sign(d)*s;
      return false;
    }
    if (Math.abs(w.x - x) <= 2){ w.x = x; w.mode = 'stand'; return true; }
    w.mode = 'walk'; stepX(w, x, dt); return false;
  }
  function nextLetter(){ return letters.find(function(l){ return l.state === 'crate' && !l.by; }); }

  function update(dt, now){
    workers.forEach(function(w){
      if (w.task === 'off') return;
      if (w.bubT > 0){ w.bubT -= dt; if (w.bubT <= 0) w.el.querySelector('.bub').classList.remove('on'); }
      if (w.wait > 0){ w.wait -= dt; w.mode = 'stand'; return; }
      if (w.task === 'held') return;
      if (w.task === 'fall'){
        w.vy += GRAV*dt; w.x += w.vx*dt; w.vx *= 1 - .6*dt;
        var lo = G.A.side ? G.A.l + 12 : 12, hi = G.A.r - 12;
        if (w.x < lo){ w.x = lo; w.vx = Math.abs(w.vx)*.4; } if (w.x > hi){ w.x = hi; w.vx = -Math.abs(w.vx)*.4; }
        var ny = w.y + w.vy*dt, landed = null;
        if (w.vy > 0 && w.x > G.sx0 && w.x < G.sx1) G.plats.forEach(function(py, i){ if (!landed && w.y <= py && ny >= py) landed = 'p' + i; });
        if (!landed && ny >= G.ground) landed = 'g';
        if (landed){
          w.level = landed; w.y = lvY(landed);
          if (w.vy > 700 && !w.bounced){ w.vy = -w.vy*.25; w.bounced = true; w.level = 'air'; return; }
          w.vy = 0; w.vx = 0; w.bounced = false;
          w.task = w.carry ? 'deliver' : (w.after || 'fetch');
          var near = w.carry && w.carry.ch === 'K' && landed === 'p' + w.carry.row && Math.abs(w.x - slotX(w.carry)) < G.slot*3;
          say(w, near ? 'Oh. There.' : ['Hmph.', 'Rude.', 'Fine.', 'I was busy.'][w.id%4]);
        } else w.y = ny;
        w.mode = 'fall'; return;
      }
      if (w.task === 'party'){ w.mode = 'stand'; w.hop = Math.abs(Math.sin(now/180 + w.id))*14; return; }
      w.hop = 0;
      if (w.task === 'fetch'){
        var l = w.target && w.target.state === 'crate' && w.target.by === w ? w.target : (w.target = nextLetter());
        if (!l){ w.task = 'idle'; return; }
        l.by = w;
        if (go(w, G.pile + G.crateW/2 - 6, 'g', dt)){ l.state = 'carried'; w.carry = l; w.target = null; w.task = 'deliver'; w.wait = .35; }
      } else if (w.task === 'deliver'){
        var c = w.carry;
        if (!c){ w.task = 'fetch'; return; }
        if (c.ch === 'K' && !kDropped && w.level === 'p' + c.row && w.x > G.ladder + G.slot*1.2){
          kDropped = true; c.state = 'falling'; c.vx = 60*w.dir; c.vy = -120; w.carry = null; w.task = 'retrieve'; w.target = c;
          say(w, 'Oops.');
          var other = workers.find(function(o){ return o !== w && o.task !== 'held' && o.task !== 'off'; });
          if (other) setTimeout(function(){ say(other, '*sigh*'); }, 700);
          return;
        }
        if (go(w, slotX(c), 'p' + c.row, dt)){
          c.state = 'placed'; c.x = slotX(c); c.y = lvY('p' + c.row); c.rot = 0; c.by = null; w.carry = null; w.task = 'fetch'; w.wait = .3;
          if (c.ch === 'K') say(w, kDropped ? 'Got it this time.' : 'K.');
        }
      } else if (w.task === 'retrieve'){
        var t = w.target;
        if (!t || t.state === 'placed' || t.state === 'crate'){ w.task = 'fetch'; return; }
        if (t.state === 'falling'){ w.mode = 'stand'; return; }
        if (t.state === 'carried'){ w.task = 'fetch'; return; }
        if (go(w, t.x, 'g', dt)){ t.state = 'carried'; t.by = w; w.carry = t; w.task = 'deliver'; w.wait = .4; say(w, 'Again.'); }
      } else if (w.task === 'idle'){
        if (!done) go(w, G.pile + G.crateW/2 + 40 + w.id*26, 'g', dt);
      }
    });
    letters.forEach(function(l){
      if (l.state === 'carried'){
        var w = workers.find(function(o){ return o.carry === l; });
        if (w){ l.x = w.x; l.y = w.y - 50 - w.hop; l.rot = 0; } else { l.state = 'falling'; l.vx = 0; l.vy = 0; }
      }
      if (l.state === 'falling'){
        l.vy += GRAV*dt; l.x += l.vx*dt; l.y += l.vy*dt; l.rot += 280*dt*(l.vx < 0 ? -1 : 1);
        if (l.y >= G.ground){ l.y = G.ground; l.state = 'ground'; l.rot = 90*(l.vx < 0 ? -1 : 1); l.by = null; }
      }
    });
    if (!done && letters.every(function(l){ return l.state === 'placed'; })){
      done = true; doneAt = now; sr.textContent = 'The crew has put the sign back up: Back shortly.';
      workers.forEach(function(w){ if (w.task !== 'held' && w.task !== 'off') w.task = 'party'; });
      say(workers[0], 'Done!', 3);
    }
    if (done && now - doneAt > 7000){
      done = false; kDropped = false;
      letters.forEach(function(l){ l.state = 'crate'; l.by = null; crateSpot(l); });
      workers.forEach(function(w){ if (w.task !== 'held' && w.task !== 'off'){ w.task = 'fetch'; w.carry = null; w.target = null; } });
    }
    /* anybody else waiting for the dropped letter picks it up if its owner is being held */
    letters.forEach(function(l){ if (l.state === 'ground' && !l.by && !workers.some(function(o){ return o.task === 'retrieve' && o.target === l; })){ var f = workers.find(function(o){ return o.task === 'idle' || o.task === 'fetch' && !nextLetter(); }); if (f){ f.task = 'retrieve'; f.target = l; } } });
  }
  function paint(){
    workers.forEach(function(w){
      w.el.style.transform = 'translate(' + w.x + 'px,' + (w.y - 52 - (w.hop || 0)) + 'px)';
      w.el.classList.toggle('walk', w.mode === 'walk'); w.el.classList.toggle('climb', w.mode === 'climb'); w.el.classList.toggle('fall', w.mode === 'fall');
      w.el.classList.toggle('left', w.dir < 0); w.el.classList.toggle('carry', !!w.carry);
    });
    letters.forEach(function(l){
      var s = l.state === 'crate' ? .55 : l.state === 'carried' ? .75 : 1, h = G.slot*1.15;
      l.el.classList.toggle('crated', l.state === 'crate');
      l.el.style.transform = 'translate(' + (l.x - G.slot/2) + 'px,' + (l.y - h) + 'px) rotate(' + l.rot + 'deg) scale(' + s + ')';
    });
  }
  function stillFrame(){
    letters.forEach(function(l){ l.state = 'placed'; l.x = slotX(l); l.y = lvY('p' + l.row); l.rot = 0; });
    workers.forEach(function(w, i){ w.x = G.pile + G.crateW/2 + 30 + i*32; w.y = G.ground; w.level = 'g'; w.mode = 'stand'; });
    paint();
  }
  if (WDC.reduced){ stillFrame(); return; }
  WDC.loop(function(dt, now){ if (dt) update(dt, now); paint(); });

  /* pick them up */
  var held = null, off = null, last = null, moved = 0, start = null;
  world.addEventListener('pointerdown', function(e){
    var el = e.target.closest('.wk'); if (!el) return;
    held = workers.find(function(w){ return w.el === el; }); if (!held || held.task === 'off') { held = null; return; }
    el.setPointerCapture(e.pointerId);
    held.after = held.task === 'retrieve' ? 'retrieve' : held.task === 'deliver' ? 'deliver' : 'fetch';
    held.task = 'held'; el.classList.add('held'); held.mode = 'held'; held.level = 'air';
    off = {x:e.clientX - held.x, y:e.clientY - held.y}; start = {x:e.clientX, y:e.clientY}; moved = 0;
    last = {x:e.clientX, y:e.clientY, t:performance.now()}; held.vx = held.vy = 0;
    say(held, ['Hey!', 'Put me down.', 'Whoa.', 'I have a job.'][Math.floor(Math.random()*4)]);
    hint.style.opacity = 0; e.preventDefault();
  });
  world.addEventListener('pointermove', function(e){
    if (!held) return;
    var A = G.A;
    held.x = Math.max(A.side ? A.l + 12 : 12, Math.min(A.r - 12, e.clientX - off.x));
    held.y = Math.max(A.t + 52, Math.min(G.ground, e.clientY - off.y));
    var now = performance.now(), dt = Math.max(.008, (now - last.t)/1000);
    held.vx = held.vx*.4 + (e.clientX - last.x)/dt*.6; held.vy = held.vy*.4 + (e.clientY - last.y)/dt*.6;
    last = {x:e.clientX, y:e.clientY, t:now};
    moved = Math.max(moved, Math.hypot(e.clientX - start.x, e.clientY - start.y));
  });
  function drop(){
    if (!held) return; held.el.classList.remove('held');
    held.task = 'fall'; held.level = 'air'; held.bounced = false;
    held.vx = Math.max(-900, Math.min(900, held.vx || 0)); held.vy = Math.max(-700, Math.min(1100, held.vy || 0));
    if (moved < 6){ held.vy = -380; held.vx = 0; }
    held = null;
  }
  world.addEventListener('pointerup', drop); world.addEventListener('pointercancel', drop);
})();
`,
};

export default t07;
