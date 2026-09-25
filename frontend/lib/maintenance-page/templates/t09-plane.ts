import type { TemplateModule } from "../shell";

/**
 * 09, THE PAPER PLANE. The homepage, as a sheet of paper, folds itself in
 * half and into a plane, which then loops the sky on a figure of eight,
 * banking into its turns and leaving a faint trail. Catch it (click, tap, or
 * Enter) and it swoops in and opens into a note with the message and the
 * back-by time. When the maintenance clock reaches the end, the plane lands
 * and unfolds back into the page.
 */
const t09: TemplateModule = {
  css: String.raw`
.stage{background:radial-gradient(80% 70% at 62% 35%,#11118a 0%,var(--navy) 55%,#00004a 100%)}
.sky i{position:absolute;display:block;height:2px;border-radius:2px;background:#2a2aa0;animation:drift linear infinite}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-130vw)}}
.sheetwrap{position:absolute;left:0;top:0;perspective:1600px}
.sheet{position:relative;width:var(--sw);height:var(--sh);transform-style:preserve-3d;filter:drop-shadow(0 24px 30px rgba(0,0,30,.45))}
.half{position:absolute;top:0;width:50%;height:100%;overflow:hidden;background:#fff;color:var(--navy)}
.half.l{left:0;border-radius:12px 0 0 12px}
.half.r{left:50%;transform-origin:0 50%;transform-style:preserve-3d;overflow:visible;background:none}
.half.r .face{position:absolute;inset:0;overflow:hidden;background:#fff;border-radius:0 12px 12px 0;backface-visibility:hidden}
.half.r .backf{position:absolute;inset:0;background:#e3e4f6;border-radius:0 12px 12px 0;transform:rotateY(180deg);backface-visibility:hidden}
.mini{position:absolute;top:0;width:var(--sw);height:100%;padding:calc(var(--sw)*.055);display:grid;align-content:start;gap:calc(var(--sw)*.035)}
.half.r .mini{left:calc(var(--sw)/-2)}
.mini .nv{display:flex;gap:6px;align-items:center}.mini .nv b{width:calc(var(--sw)*.08);aspect-ratio:1;border-radius:50%;background:var(--navy)}.mini .nv i{height:7px;width:calc(var(--sw)*.1);border-radius:4px;background:#c7c9ec}
.mini h3{margin:calc(var(--sw)*.05) 0 0;font:700 calc(var(--sw)*.11)/.98 var(--display);letter-spacing:-.03em}
.mini h3 span{color:var(--orange-ink)}
.mini p{margin:0;font:500 calc(var(--sw)*.042)/1.4 var(--body);color:#3a3a6a}
.mini .bt{display:flex;gap:6px}.mini .bt i{height:calc(var(--sw)*.075);width:calc(var(--sw)*.26);border-radius:99px;background:#000}.mini .bt i+i{background:#fff;border:2px solid #000}
.mini .cd{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.mini .cd i{height:calc(var(--sw)*.2);border-radius:10px;background:#e7e8f7}
.crease{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#b9bbe6;opacity:0}
.plane{position:absolute;left:0;top:0;border:0;padding:0;background:none;cursor:pointer;will-change:transform;width:96px;height:64px;margin:-32px 0 0 -48px;color:inherit}
.plane svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 14px 10px rgba(0,0,30,.45))}
.plane:focus-visible{outline-offset:8px;border-radius:12px}
.trail{position:absolute;left:0;top:0;width:6px;height:6px;margin:-3px;border-radius:50%;background:#c7c9ec;pointer-events:none}
.note{position:absolute;z-index:35;width:min(26rem,calc(100vw - 32px));background:#fff;color:#000;border-radius:16px;padding:1.4rem 1.4rem 1.2rem;display:grid;gap:.7rem;box-shadow:0 30px 70px -20px rgba(0,0,30,.8);
  --btn-fill:#000;--btn-ink:#fff;background-image:repeating-linear-gradient(0deg,transparent 0 31px,#eceefa 31px 32px)}
.note .ey{font:700 .72rem/1 var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--orange-ink)}
.note h2{margin:0;font:700 2rem/1 var(--display);letter-spacing:-.03em;color:var(--navy)}
.note p{margin:0;color:#2b2b4b;font:500 1rem/1.5 var(--body);overflow-wrap:anywhere}
.note .wh{font:700 1.05rem/1.3 var(--display);color:#000}
.note .acts{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.3rem}
.hint{position:absolute;margin:0;font:500 .9rem/1.3 var(--body);color:var(--mist);transition:opacity .5s}
`,
  body: ({ esc }) => `<main class="stage" id="stage" aria-label="A paper plane circling the sky">
  <div class="sky" id="sky" aria-hidden="true"></div>
  <div class="sheetwrap" id="sw" aria-hidden="true">
    <div class="sheet" id="sheet">
      <div class="half l"><div class="mini"><div class="nv"><b></b><i></i><i></i><i></i></div><h3>Brands that get <span>noticed.</span></h3><p>Branding, web, SEO, apps, AI and marketing.</p><div class="bt"><i></i><i></i></div><div class="cd"><i></i><i></i></div></div></div>
      <div class="half r" id="rh"><div class="face"><div class="mini"><div class="nv"><b></b><i></i><i></i><i></i></div><h3>Brands that get <span>noticed.</span></h3><p>Branding, web, SEO, apps, AI and marketing.</p><div class="bt"><i></i><i></i></div><div class="cd"><i></i><i></i></div></div></div><div class="backf"></div></div>
      <i class="crease" id="crease"></i>
    </div>
  </div>
  <button class="plane" id="plane" type="button" aria-label="Catch the paper plane and read the note inside" hidden>
    <svg viewBox="0 0 96 64" aria-hidden="true"><path d="M2 30 L94 4 L34 40 Z" fill="#fff"/><path d="M34 40 L94 4 L44 60 Z" fill="#c7c9ec"/><path d="M34 40 L44 60 L38 42 Z" fill="#8f92c9"/><path d="M2 30 L34 40" stroke="#ff6500" stroke-width="2.5" stroke-linecap="round"/></svg>
  </button>
  <div id="trails" aria-hidden="true"></div>
  <div class="note" id="note" role="dialog" aria-labelledby="note-h" hidden tabindex="-1">
    <span class="ey">Written inside the plane</span>
    <h2 id="note-h">Back shortly</h2>
    <p id="note-msg">${esc("")}</p>
    <p class="wh" id="note-when"></p>
    <div class="acts"><button class="btn btn-primary" type="button" id="note-mail">Email me when you are back</button><button class="btn btn-secondary" type="button" id="note-close">Fold it back up</button></div>
  </div>
  <p class="hint" id="hint">Catch the plane to read what is written inside.</p>
  <p class="sr" id="sr" aria-live="polite"></p>
</main>`,
  script: String.raw`
(function(){
  var stage = document.getElementById('stage'), sw = document.getElementById('sw'), sheet = document.getElementById('sheet'), rh = document.getElementById('rh');
  var plane = document.getElementById('plane'), note = document.getElementById('note'), trails = document.getElementById('trails'), sr = document.getElementById('sr');
  var hint = document.getElementById('hint'), crease = document.getElementById('crease');
  document.getElementById('note-msg').textContent = document.querySelector('.wdc-lede').textContent;
  document.getElementById('note-when').textContent = WDC.backBy
    ? 'Back by ' + new Date(WDC.backBy).toLocaleString('en-GB', {weekday:'long', hour:'2-digit', minute:'2-digit', timeZone:'Africa/Lagos'}) + ', Lagos time'
    : 'Back as soon as it is ready';
  var C = {}, state = 'sheet', t = 0;
  var sky = document.getElementById('sky');
  for (var i = 0; i < 14; i++){ var c = document.createElement('i'); c.style.cssText = 'left:' + (Math.random()*110) + 'vw;top:' + (6 + Math.random()*80) + 'vh;width:' + (40 + Math.random()*120) + 'px;animation-duration:' + (18 + Math.random()*24) + 's;animation-delay:-' + (Math.random()*30) + 's'; sky.appendChild(c); }

  function layout(A){
    var swd = Math.max(160, Math.min(340, A.w*.62, (A.h - 40)/1.3));
    C = {cx:A.cx, cy:A.cy, ax:Math.max(60, A.w/2 - 70), by:Math.max(40, Math.min(A.h*.3, 240)), sw:swd, A:A};
    stage.style.setProperty('--sw', swd + 'px'); stage.style.setProperty('--sh', (swd*1.3) + 'px');
    sw.style.transform = 'translate(' + (C.cx - swd/2) + 'px,' + (C.cy - swd*.65) + 'px)';
    hint.style.left = A.l + 'px'; hint.style.top = A.t + 'px'; hint.style.maxWidth = A.w + 'px';
    if (!note.hidden) placeNote();
    if (state === 'still') stillPlane();
  }
  function placeNote(){
    var A = C.A;
    note.style.left = Math.max(16, Math.min(A.W - note.offsetWidth - 16, C.cx - note.offsetWidth/2)) + 'px';
    note.style.top = Math.max(A.t, Math.min(A.b - note.offsetHeight, C.cy - note.offsetHeight/2)) + 'px';
  }
  WDC.onResize(layout); layout(WDC.area());

  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function anim(el, frames, o){ return el.animate(frames, Object.assign({fill:'forwards', easing:'cubic-bezier(.6,0,.2,1)'}, o)).finished; }
  function pt(x, y, a, s, flip){ return 'translate(' + x + 'px,' + y + 'px) rotate(' + a + 'rad) scale(' + s + ',' + (s*(flip || 1)) + ')'; }

  /* the page folds itself into a plane */
  async function fold(){
    state = 'folding'; sw.hidden = false; plane.hidden = true;
    [sheet, rh, crease].forEach(function(e){ e.getAnimations().forEach(function(a){ a.cancel(); }); });
    await wait(900);
    crease.animate([{opacity:0},{opacity:1}], {duration:300, fill:'forwards'});
    await anim(rh, [{transform:'rotateY(0)'},{transform:'rotateY(-180deg)'}], {duration:900});
    await anim(sheet, [{transform:'translateX(0) rotate(0) scale(1)'},{transform:'translateX(25%) rotate(-90deg) scale(.5,.85)'}], {duration:650});
    await anim(sheet, [{transform:'translateX(25%) rotate(-90deg) scale(.5,.85)', opacity:1},{transform:'translateX(25%) rotate(-96deg) scale(.16,.32)', opacity:0}], {duration:320, easing:'ease-in'});
    sw.hidden = true; plane.hidden = false; state = 'fly'; t = -Math.PI/2;
    plane.animate([{opacity:0, transform:pt(C.cx, C.cy, 0, .4)},{opacity:1, transform:pt(C.cx, C.cy, 0, 1)}], {duration:320});
    sr.textContent = 'The page has folded itself into a paper plane.';
  }
  function pathAt(t){ return {x:C.cx + C.ax*Math.sin(t), y:C.cy + C.by*Math.sin(t)*Math.cos(t) + Math.sin(t*2.3)*12}; }
  var tr = 0, bank = 0, last = null;
  function fly(dt){
    t += dt*.5*Math.max(.7, Math.min(1.2, 420/C.ax));
    var p = pathAt(t), q = pathAt(t + .02);
    var a = Math.atan2(q.y - p.y, q.x - p.x), s = .82 + .22*Math.cos(t);
    /* bank into the turn: how fast the heading is changing */
    if (last !== null){ var turn = Math.atan2(Math.sin(a - last), Math.cos(a - last)); bank += (Math.max(-.5, Math.min(.5, turn*14)) - bank)*.1; }
    last = a;
    var flip = Math.cos(a) < 0 ? -1 : 1;
    plane.style.transform = pt(p.x, p.y, a, s, flip*(1 - Math.abs(bank)*.5));
    tr += dt;
    if (tr > .07){
      tr = 0; var d = document.createElement('i'); d.className = 'trail'; trails.appendChild(d);
      var tx = p.x - Math.cos(a)*40*s, ty = p.y - Math.sin(a)*40*s;
      d.animate([{transform:'translate(' + tx + 'px,' + ty + 'px) scale(1)', opacity:.7},{transform:'translate(' + tx + 'px,' + (ty + 10) + 'px) scale(.2)', opacity:0}], {duration:900}).onfinish = function(){ d.remove(); };
    }
  }
  async function open(){
    if (state !== 'fly' && state !== 'still') return;
    var from = state; state = 'swoop'; hint.style.opacity = 0;
    if (!WDC.reduced){
      await anim(plane, [{transform:plane.style.transform || pt(C.cx, C.cy, 0, 1)},{transform:pt(C.cx, C.cy, 0, 1.6)}], {duration:650, easing:'cubic-bezier(.3,0,.1,1)'});
      await anim(plane, [{opacity:1, transform:pt(C.cx, C.cy, 0, 1.6)},{opacity:0, transform:pt(C.cx, C.cy, 0, 2.6)}], {duration:220});
    }
    plane.hidden = true; note.hidden = false; placeNote();
    if (!WDC.reduced) await anim(note, [{transform:'scale(.3,.1) rotate(-8deg)', opacity:0},{transform:'scale(1.02) rotate(1deg)', opacity:1, offset:.8},{transform:'none', opacity:1}], {duration:520});
    state = 'open'; note.dataset.from = from; note.focus();
  }
  async function close(){
    if (state !== 'open') return;
    state = 'refold';
    if (!WDC.reduced) await anim(note, [{transform:'none', opacity:1},{transform:'scale(.2,.08) rotate(10deg)', opacity:0}], {duration:380});
    note.hidden = true; note.getAnimations().forEach(function(a){ a.cancel(); });
    plane.getAnimations().forEach(function(a){ a.cancel(); }); plane.hidden = false;
    state = note.dataset.from === 'still' ? 'still' : 'fly'; if (state === 'still') stillPlane();
    plane.focus();
  }
  plane.addEventListener('click', open);
  document.getElementById('note-close').addEventListener('click', close);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  document.getElementById('note-mail').addEventListener('click', function(){ close().then(function(){ document.getElementById('wdc-email').focus(); }); });

  /* the end of the clock: the plane comes in, lands and opens back into the page */
  var landed = false;
  WDC.onProgress(async function(p){
    if (p >= .995 && !landed && (state === 'fly' || state === 'open' || state === 'still')){
      landed = true; if (state === 'open') await close();
      state = 'landing';
      if (!WDC.reduced) await anim(plane, [{transform:plane.style.transform},{transform:pt(C.cx, C.cy, 0, .8)}], {duration:700});
      plane.hidden = true; sw.hidden = false; [sheet, rh, crease].forEach(function(e){ e.getAnimations().forEach(function(a){ a.cancel(); }); });
      if (!WDC.reduced) rh.animate([{transform:'rotateY(-180deg)'},{transform:'rotateY(0)'}], {duration:800, easing:'cubic-bezier(.6,0,.2,1)'});
      state = 'landed'; hint.style.opacity = 0; sr.textContent = 'The plane has landed and unfolded into the site.';
    } else if (p < .98 && landed && state === 'landed'){ landed = false; hint.style.opacity = 1; WDC.reduced ? still() : fold(); }
  });

  function stillPlane(){ plane.style.transform = pt(C.cx + C.ax*.5, C.cy - C.by*.4, -.2, 1); }
  function still(){ sw.hidden = true; plane.hidden = false; state = 'still'; stillPlane(); }
  /* opened after the clock has run out: the page is already down, flat */
  if (WDC.progress() >= .995){ landed = true; state = 'landed'; hint.style.opacity = 0; }
  if (!WDC.reduced) WDC.loop(function(dt){ if (state === 'fly' && dt) fly(dt); });
  if (state === 'sheet') WDC.reduced ? still() : fold();
})();
`,
};

export default t09;
