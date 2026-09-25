import type { TemplateModule } from "../shell";

/**
 * 01, WE ARE DIGGING. A cross-section of the ground under the site. A drill
 * bores down as the maintenance clock runs, lighting up the buried parts of
 * the site as it reaches them, and the spoil it brings up piles beside the
 * shaft. Each layer is a button: tap it for what is being done there (the
 * admin writes those, one per line).
 */
const t01: TemplateModule = {
  css: String.raw`
.sky{position:absolute;left:0;right:0;top:0;background:linear-gradient(180deg,#00004f 0%,var(--navy) 100%)}
.big{position:absolute;margin:0;font:700 var(--fs,120px)/.8 var(--display);letter-spacing:-.05em;color:var(--white);white-space:nowrap;pointer-events:none;will-change:transform}
.big span{color:var(--orange)}
.earth{position:absolute;left:0;right:0;bottom:0}
.layer{position:absolute;left:0;right:0;border:0;padding:0;margin:0;background:var(--c);cursor:pointer;text-align:left;color:inherit}
.layer::after{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.07) 1.2px,transparent 1.7px),radial-gradient(circle,rgba(0,0,0,.25) 1.5px,transparent 2px);background-size:23px 19px,31px 27px;background-position:0 0,11px 7px;pointer-events:none}
.layer:hover{filter:brightness(1.12)}
.layer:focus-visible{outline-offset:-4px}
.layer .nm{position:absolute;left:var(--lx,16px);top:10px;font:600 .68rem/1 var(--body);letter-spacing:.16em;text-transform:uppercase;color:#a7a9e6;pointer-events:none}
.deep{position:absolute;left:0;right:0;bottom:0;background:#00002a}
.surface{position:absolute;left:0;right:0;height:3px;background:var(--orange);box-shadow:0 0 18px rgba(255,101,0,.55)}
.mound{position:absolute;width:150px;height:46px;transform-origin:50% 100%;transform:scaleY(var(--p,0));pointer-events:none}
.shaft{position:absolute;width:46px;margin-left:-23px;pointer-events:none}
.bore{position:absolute;inset:0;background:#00001a;border-left:3px solid var(--orange);border-right:3px solid var(--orange);transform-origin:top;transform:scaleY(var(--p,0))}
.drill{position:absolute;left:50%;top:0;width:58px;height:92px;margin-left:-29px;transform:translateY(calc(var(--depth,0px) - 44px));transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.drill svg{display:block;overflow:visible}
.run .drill svg{animation:shake .08s linear infinite alternate}
.run .auger{animation:auger .35s linear infinite}
@keyframes shake{to{transform:translate(.8px,-.8px)}}
@keyframes auger{to{transform:translateY(-12px)}}
.spark{position:absolute;left:50%;top:0;width:5px;height:5px;border-radius:50%;background:var(--orange);pointer-events:none}
.clod{position:absolute;left:50%;top:0;width:6px;height:5px;border-radius:2px;background:#2a2aa0;pointer-events:none}
.fossil{position:absolute;pointer-events:none;transform-origin:0 50%}
.fossil svg{display:block;overflow:visible}
.fossil .dim{stroke:#3d3dbb;fill:none;stroke-width:2;transition:opacity .8s}
.fossil .lit{stroke:var(--orange);fill:none;stroke-width:2.5;opacity:0;transition:opacity .8s;filter:drop-shadow(0 0 6px rgba(255,101,0,.6))}
.fossil.on .lit{opacity:1}.fossil.on .dim{opacity:0}
.tick{position:absolute;top:50%;white-space:nowrap;font:700 .66rem/1 var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--black);background:var(--orange);border-radius:999px;padding:.35rem .55rem;opacity:0;transform:translateY(-50%) scale(.8);transition:opacity .5s .4s,transform .5s .4s}
.fossil.on .tick{opacity:1;transform:translateY(-50%) scale(1)}
.gauge{position:absolute;width:58px;border-left:1px solid #2a2aa0;background:#00003a;font:600 .68rem/1 var(--body);color:var(--mist);font-variant-numeric:tabular-nums}
.gauge span{position:absolute;right:10px;transform:translateY(-50%)}
.gauge span::before{content:"";position:absolute;right:calc(100% + 6px);top:50%;width:8px;height:1px;background:#3d3dbb}
.gauge .now{right:auto;left:-1px;background:var(--orange);color:var(--black);font-weight:700;padding:.35rem .45rem;border-radius:0 999px 999px 0;transform:translateY(calc(var(--depth,0px) - 50%));transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.gauge .now::before{display:none}
.note{position:absolute;z-index:40;width:max-content;max-width:min(17rem,calc(100vw - 32px));background:var(--white);color:var(--black);border-radius:14px;padding:.8rem .95rem;font:500 .9rem/1.4 var(--body);box-shadow:0 18px 40px -12px rgba(0,0,0,.6);animation:pop .22s cubic-bezier(.2,.9,.3,1.25)}
.note b{display:block;font:700 1.02rem/1.2 var(--display);margin-bottom:.2rem;color:var(--navy)}
@keyframes pop{from{transform:scale(.85);opacity:0}}
`,
  body: ({ esc, option }) => {
    const layers = option("layers").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 5)
      .map((l) => { const [t, ...rest] = l.split("|"); return { t: (t ?? "").trim(), n: rest.join("|").trim() }; })
      .filter((l) => l.t);
    const fills = ["#0c0c7a", "#09096d", "#060660", "#040451", "#020242"];
    const names = ["Topsoil", "Clay", "Gravel", "Rock", "Bedrock"];
    return `<main class="stage" id="stage" aria-label="A drill digging through the site's layers">
  <div class="sky" id="sky"></div>
  <p class="big" id="big" aria-hidden="true">We dig<span>.</span></p>
  <div class="earth" id="earth">
    ${layers.map((l, i) => `<button class="layer" type="button" style="--c:${fills[i]}" data-t="${esc(l.t)}" data-n="${esc(l.n)}" aria-label="${esc(names[i])}, ${esc(l.t)}: ${esc(l.n)}"><span class="nm">${esc(names[i])} · ${esc(l.t)}</span></button>`).join("")}
    <div class="deep" id="deep"></div>
  </div>
  <svg class="mound" id="mound" viewBox="0 0 150 46" aria-hidden="true"><path d="M0 46 C30 30 50 6 75 4 C100 6 120 30 150 46 Z" fill="#1b1b9e"/><path d="M22 40 C40 30 55 16 75 14" stroke="#2a2aa0" stroke-width="2" fill="none"/></svg>
  <div class="surface" id="surface" aria-hidden="true"></div>
  <div class="shaft" id="shaft" aria-hidden="true">
    <div class="bore"></div>
    <div class="drill"><svg width="58" height="92" viewBox="0 0 58 92">
      <defs><clipPath id="bit"><path d="M12 44h34L29 90z"/></clipPath></defs>
      <rect x="8" y="0" width="42" height="30" rx="9" fill="#fff"/>
      <rect x="14" y="8" width="30" height="7" rx="3.5" fill="#000065"/>
      <circle cx="40" cy="22" r="3" fill="#ff6500"/>
      <rect x="21" y="30" width="16" height="14" fill="#c7c9ec"/>
      <g clip-path="url(#bit)"><rect x="10" y="40" width="40" height="56" fill="#ff6500"/>
        <g class="auger" stroke="#000" stroke-width="3"><path d="M8 50l44-8M8 62l44-8M8 74l44-8M8 86l44-8M8 98l44-8"/></g></g>
    </svg></div>
  </div>
  <div id="fossils" aria-hidden="true"></div>
  <div class="gauge" id="gauge" aria-hidden="true"></div>
  <p class="sr" id="sr-depth" aria-live="polite"></p>
</main>`;
  },
  script: String.raw`
(function(){
  var stage = document.getElementById('stage'), earth = document.getElementById('earth'), shaft = document.getElementById('shaft');
  var sky = document.getElementById('sky'), big = document.getElementById('big'), surface = document.getElementById('surface');
  var mound = document.getElementById('mound'), deep = document.getElementById('deep');
  var fossilsEl = document.getElementById('fossils'), gauge = document.getElementById('gauge');
  var layers = [].slice.call(earth.querySelectorAll('.layer'));
  var DEPTH_M = 120;
  /* The buried parts of the site, one per layer, drawn in outline. */
  var SHAPES = [
    {label:'Menu refitted', w:120, h:30, svg:'<rect x="0" y="0" width="120" height="30" rx="8"/><path d="M14 15h18M44 15h18M74 15h18"/><circle cx="108" cy="15" r="6"/>'},
    {label:'Button refitted', w:112, h:38, svg:'<rect x="0" y="0" width="112" height="38" rx="19"/><path d="M22 19h54M84 13l8 6-8 6"/>'},
    {label:'Card refitted', w:84, h:98, svg:'<rect x="0" y="0" width="84" height="98" rx="10"/><rect x="9" y="9" width="66" height="40" rx="5"/><path d="M9 63h52M9 76h38"/>'},
    {label:'Headline refitted', w:70, h:56, svg:'<path d="M4 6v44M4 28h28M32 6v44M46 16l12-10v44M46 50h24"/>'},
    {label:'Server refitted', w:92, h:58, svg:'<rect x="0" y="0" width="92" height="26" rx="5"/><rect x="0" y="32" width="92" height="26" rx="5"/><circle cx="14" cy="13" r="4"/><circle cx="14" cy="45" r="4"/><path d="M30 13h46M30 45h46"/>'}
  ];
  var n = layers.length, fossils = [];
  for (var i = 0; i < n; i++){
    var s = SHAPES[i], d = document.createElement('div'); d.className = 'fossil';
    d.innerHTML = '<svg width="'+s.w+'" height="'+s.h+'" viewBox="0 0 '+s.w+' '+s.h+'"><g class="dim">'+s.svg+'</g><g class="lit">'+s.svg+'</g></svg><span class="tick">'+s.label+'</span>';
    fossilsEl.appendChild(d); fossils.push({el:d, s:s, y:0});
  }
  var ticks = [];
  for (var m = 0; m <= DEPTH_M; m += 20){ var t = document.createElement('span'); t.textContent = m + ' m'; gauge.appendChild(t); ticks.push([t, m/DEPTH_M]); }
  var now = document.createElement('span'); now.className = 'now'; gauge.appendChild(now);

  var G = {};
  function layout(A){
    var W = A.W, H = A.H;
    var surf = Math.round(A.t + Math.max(80, Math.min(A.h*.3, 220)));
    var bottom = A.b;                       /* the drill never goes under the lockup */
    var depth = Math.max(120, bottom - surf);
    var shaftX = Math.round(A.l + A.w*(A.w < 520 ? .7 : .62));
    var gaugeW = A.w < 520 ? 48 : 58;
    G = {surf:surf, depth:depth, shaftX:shaftX, W:W, H:H, A:A};
    sky.style.height = surf + 'px';
    surface.style.top = (surf - 1) + 'px';
    earth.style.top = surf + 'px';
    var band = depth/Math.max(1, n);
    layers.forEach(function(l, i){ l.style.top = (i*band) + 'px'; l.style.height = (band + 1) + 'px'; l.style.setProperty('--lx', (A.side ? A.l : 16) + 'px'); });
    deep.style.top = (n*band) + 'px';
    shaft.style.left = shaftX + 'px'; shaft.style.top = surf + 'px'; shaft.style.height = depth + 'px';
    mound.style.left = (shaftX + 30) + 'px'; mound.style.top = (surf - 44) + 'px';
    gauge.style.top = surf + 'px'; gauge.style.height = depth + 'px'; gauge.style.width = gaugeW + 'px'; gauge.style.left = (A.r - gaugeW) + 'px';
    ticks.forEach(function(p){ p[0].style.top = (p[1]*depth) + 'px'; p[0].hidden = depth < 200 && p[1]*DEPTH_M % 40 !== 0; });
    /* the headline stands on the surface, a third of it underground */
    var fs = Math.max(56, Math.min(A.w*.19, A.h*.34, 210));
    big.style.setProperty('--fs', fs + 'px');
    big.style.left = (A.l + 4) + 'px';
    big.style.top = (surf - fs*.6) + 'px';
    /* fossils sit either side of the shaft, one per layer, inside the scene */
    var room = A.r - gaugeW - 12;
    var scale = Math.max(.55, Math.min(1, A.w/640, band/120));
    fossils.forEach(function(f, i){
      var fw = f.s.w*scale, left = i % 2 ? shaftX + 40 : shaftX - 40 - fw;
      var tickRight = i % 2 === 1;
      if (left + fw > room - 110) { left = shaftX - 40 - fw; tickRight = false; }
      left = Math.max(A.side ? A.l : 12, left);
      f.y = (i + .55)/n;
      f.el.style.left = left + 'px'; f.el.style.top = (surf + f.y*depth - f.s.h*scale/2) + 'px';
      f.el.style.transform = 'scale(' + scale + ')';
      var tick = f.el.querySelector('.tick');
      tick.style.left = tickRight ? 'calc(100% + 10px)' : 'auto'; tick.style.right = tickRight ? 'auto' : 'calc(100% + 10px)';
      if (!tickRight && left - 120 < (A.side ? A.l : 8)) { tick.style.right = 'auto'; tick.style.left = '0'; tick.style.top = 'calc(100% + 14px)'; } else tick.style.top = '';
    });
    paint(WDC.progress());
  }
  var said = -1, P = 0;
  function paint(p){
    P = p;
    var d = p*G.depth;
    shaft.style.setProperty('--p', p); shaft.style.setProperty('--depth', d + 'px');
    gauge.style.setProperty('--depth', d + 'px'); mound.style.setProperty('--p', Math.min(1, p*1.1));
    now.textContent = Math.round(p*DEPTH_M) + ' m';
    fossils.forEach(function(f){ f.el.classList.toggle('on', p >= f.y - .03); });
    stage.classList.toggle('run', p < .999 && !WDC.reduced);
    var pct = Math.floor(p*10)*10;
    if (pct !== said){ said = pct; document.getElementById('sr-depth').textContent = p >= .999 ? 'The digging is done.' : 'About ' + pct + ' percent of the work is done.'; }
  }
  WDC.onResize(layout); layout(WDC.area()); WDC.onProgress(paint);

  /* sparks and clods off the drill tip, while it is running */
  if (!WDC.reduced) setInterval(function(){
    if (document.hidden || P >= .999) return;
    var y = P*G.depth + 44;
    for (var k = 0; k < 2; k++){
      var clod = Math.random() < .5, e = document.createElement('i'); e.className = clod ? 'clod' : 'spark';
      shaft.appendChild(e);
      var a = (Math.random() - .5)*2.4, v = 30 + Math.random()*60;
      e.animate([{transform:'translate(-50%,' + y + 'px)', opacity:1},
        {transform:'translate(calc(-50% + ' + (Math.sin(a)*v) + 'px),' + (y - Math.cos(a)*v*(clod ? .5 : .9) + (clod ? 18 : 0)) + 'px) scale(.4)', opacity:0}],
        {duration:500 + Math.random()*400, easing:'cubic-bezier(.1,.7,.3,1)'}).onfinish = function(){ this.effect.target.remove(); };
    }
  }, 90);

  /* a layer, tapped: what is being done down there */
  var open = null;
  function close(){ if (open){ open.remove(); open = null; } }
  earth.addEventListener('click', function(e){
    var b = e.target.closest('.layer'); if (!b) return;
    close();
    var n = document.createElement('div'); n.className = 'note'; n.setAttribute('role', 'status');
    var h = document.createElement('b'); h.textContent = b.getAttribute('data-t'); n.appendChild(h);
    n.appendChild(document.createTextNode(b.getAttribute('data-n')));
    stage.appendChild(n);
    var r = b.getBoundingClientRect(), A = WDC.area();
    var x = e.detail ? e.clientX : Math.max(A.l, 24), y = e.detail ? e.clientY + 12 : r.top + 16;
    n.style.left = Math.max(16, Math.min(x, A.W - n.offsetWidth - 16)) + 'px';
    n.style.top = Math.max(A.t, Math.min(y, A.b - n.offsetHeight)) + 'px';
    open = n;
  });
  document.addEventListener('pointerdown', function(e){ if (open && !e.target.closest('.layer,.note')) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  WDC.onResize(close);
})();
`,
};

export default t01;
