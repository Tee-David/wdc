import type { TemplateModule } from "../shell";

/**
 * 10, DIG IT UP. The page is buried under navy soil. The cursor or a finger
 * is a brush, and every stroke sweeps soil away; the crumbs fall and pile up
 * at the bottom. Underneath: the message carved in stone, the back-by time
 * on a clay tablet, a fossil of the mark, a button from 2009, the first
 * sketch, and a note the studio writes in Settings. "Dig it all up" clears
 * the lot for anybody in a hurry or on a keyboard, and everything buried is
 * real text a screen reader reaches without digging.
 */
const t10: TemplateModule = {
  css: String.raw`
.stage{background:#06063a}
.site{position:absolute;inset:0}
.find{position:absolute;left:0;top:0;display:grid;gap:.4rem;justify-items:center;text-align:center;color:#e9e4d8;transform:translate(-50%,-50%);max-width:var(--mw,22rem)}
.find .lab{font:700 .66rem/1 var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--orange)}
.stone{background:#8d8a9e;color:#1b1a2e;border-radius:28px 28px 10px 10px;padding:1.2rem 1.5rem 1rem;box-shadow:inset 0 -8px 0 rgba(0,0,0,.18),inset 0 3px 0 rgba(255,255,255,.25)}
.stone .lab{color:#3d1800}
.stone b{display:block;font:700 clamp(1.6rem,3.4vw,2.6rem)/1 var(--display);letter-spacing:-.03em;color:#1b1a2e;text-shadow:0 1px 0 rgba(255,255,255,.35),0 -1px 0 rgba(0,0,0,.35)}
.stone span.m{font:500 .9rem/1.4 var(--body);color:#23223a;overflow-wrap:anywhere}
.clay{background:#a4521a;color:#fff;border-radius:12px;padding:.85rem 1.05rem;rotate:-3deg;box-shadow:inset 0 -6px 0 rgba(0,0,0,.2)}
.clay .lab{color:#fff}
.clay b{display:block;font:700 1.15rem/1.15 var(--display)}
.clay span.m{font:500 .8rem/1.3 var(--body)}
.bone img{width:clamp(70px,9vw,110px);height:auto;filter:sepia(1) saturate(.4) brightness(.95);opacity:.9;display:block}
.oldbtn{padding:.55rem 1.3rem;border-radius:6px;border:1px solid #6e6e6e;background:linear-gradient(#fdfdfd,#cfcfcf);color:#222;font:700 .9rem/1 Tahoma,Verdana,sans-serif;box-shadow:inset 0 1px 0 #fff}
.paper{background:#f3eedf;color:#2a2a2a;padding:.85rem 1rem;border-radius:4px;rotate:4deg;font:500 .85rem/1.4 var(--body);text-align:left;box-shadow:0 2px 0 rgba(0,0,0,.2);overflow-wrap:anywhere}
.paper .lab{color:#8a3600}
canvas{position:absolute;inset:0;width:100%;height:100%}
#soil{touch-action:none;cursor:none}
#fx{pointer-events:none}
.brush{position:absolute;left:0;top:0;width:var(--bd,72px);height:var(--bd,72px);margin:calc(var(--bd,72px)/-2) 0 0 calc(var(--bd,72px)/-2);border:2px dashed rgba(255,255,255,.7);border-radius:50%;pointer-events:none;opacity:0;transition:opacity .2s}
.over{position:absolute;left:0;top:0;transform:translate(-50%,-50%);text-align:center;pointer-events:none;transition:opacity .6s;width:max-content;max-width:90vw}
.over b{display:block;font:700 clamp(2.4rem,7vw,5.6rem)/.9 var(--display);letter-spacing:-.045em}
.over b span{color:var(--orange)}
.over small{display:block;margin-top:.9rem;font:500 1rem/1.3 var(--body);color:var(--mist)}
.over.gone{opacity:0}
.tally{position:absolute;display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:.5rem}
.tally .pill{background:#000;border-radius:999px;padding:.5rem .85rem;font:600 .82rem/1 var(--body);font-variant-numeric:tabular-nums}
.tally .pill b{color:var(--orange)}
`,
  body: ({ esc, option }) => `<main class="stage" id="stage" aria-label="The page, buried. Brush the soil away to find what is underneath.">
  <div class="site" id="site">
    <div class="find stone" data-name="the carved stone" data-at="stone"><span class="lab">Carved stone</span><b>Back shortly</b><span class="m" id="stone-msg"></span></div>
    <div class="find clay" data-name="the clay tablet" data-at="clay"><span class="lab">Clay tablet</span><b id="clay-when"></b><span class="m" id="clay-sub"></span></div>
    <div class="find bone" data-name="a fossil of the mark" data-at="bone"><img alt="The WDC mark, fossilised" src="/brand/icon-white-accent.svg"><span class="lab">Fossil · the mark</span></div>
    <div class="find" data-name="a button from 2009" data-at="old"><span class="oldbtn" aria-hidden="true">Submit »</span><span class="lab">A button from 2009</span></div>
    <div class="find" data-name="the first sketch" data-at="sketch"><svg width="110" height="100" viewBox="0 0 120 110" role="img" aria-label="A pencil sketch of the letter C"><path d="M92 26C80 10 50 6 32 22 12 40 14 74 36 90 56 104 84 98 96 82" fill="none" stroke="#f3eedf" stroke-width="3" stroke-linecap="round"/><path d="M90 30C78 16 52 12 36 26M94 80C82 94 58 98 40 86" fill="none" stroke="#f3eedf" stroke-width="1.5" opacity=".6"/><circle cx="62" cy="56" r="6" fill="#ff6500"/></svg><span class="lab">The first sketch</span></div>
    <div class="find paper" data-name="a note from the studio" data-at="note"><span class="lab">From the studio</span>${esc(option("note"))}</div>
  </div>
  <canvas id="soil" aria-hidden="true"></canvas>
  <canvas id="fx" aria-hidden="true"></canvas>
  <div class="brush" id="brush" aria-hidden="true"></div>
  <div class="over" id="over" aria-hidden="true"><b>We dig<span>.</span><br>So do you.</b><small>Brush the soil away. Something is buried here.</small></div>
  <div class="tally" id="tally"><span class="pill" id="found">Found <b>0</b> of 6</span><span class="pill" id="pct"><b>0%</b> dug</span><button class="btn btn-secondary" id="all" type="button">Dig it all up</button></div>
  <p class="sr" id="sr" aria-live="polite"></p>
</main>`,
  script: String.raw`
(function(){
  var soil = document.getElementById('soil'), fx = document.getElementById('fx'), sctx = soil.getContext('2d'), fctx = fx.getContext('2d');
  var brush = document.getElementById('brush'), over = document.getElementById('over'), sr = document.getElementById('sr'), tally = document.getElementById('tally');
  var finds = [].slice.call(document.querySelectorAll('.find')), dpr = Math.min(2, devicePixelRatio || 1);
  document.getElementById('stone-msg').textContent = document.querySelector('.wdc-lede').textContent;
  document.getElementById('clay-when').textContent = WDC.backBy ? 'Back by ' + new Date(WDC.backBy).toLocaleString('en-GB', {weekday:'short', hour:'2-digit', minute:'2-digit', timeZone:'Africa/Lagos'}) : 'Back soon';
  document.getElementById('clay-sub').textContent = WDC.backBy ? 'Lagos time' : 'As soon as it is ready';
  /* where each find is buried, as fractions of the scene: a wide dig and a tall one */
  var WIDE = {bone:[.12,.18], sketch:[.86,.2], stone:[.46,.44], old:[.14,.8], clay:[.8,.76], note:[.48,.84]};
  var TALL = {bone:[.24,.1], sketch:[.76,.12], stone:[.5,.37], old:[.26,.63], clay:[.74,.62], note:[.5,.86]};
  var W, H, A, R, CELL = 16, cells, cols, rows, total, cleared = 0, pile, crumbs = [], foundN = 0, box;

  function paintSoil(){
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(0, 0, W, H);
    var bands = ['#12127a', '#0e0e6c', '#0a0a5e', '#070750', '#050542'], bh = (box.y1 - box.y0)/bands.length;
    bands.forEach(function(c, i){ sctx.fillStyle = c; sctx.fillRect(box.x0, box.y0 + i*bh, box.x1 - box.x0, bh + 1); });
    var seed = 3; function rnd(){ seed = (seed*16807)%2147483647; return seed/2147483647; }
    var n = (box.x1 - box.x0)*(box.y1 - box.y0)/240;
    for (var i = 0; i < n; i++){
      sctx.fillStyle = rnd() > .82 ? '#2a2aa0' : rnd() > .5 ? '#03033a' : '#1a1a8c';
      sctx.beginPath(); sctx.arc(box.x0 + rnd()*(box.x1 - box.x0), box.y0 + rnd()*(box.y1 - box.y0), rnd()*2.6 + .4, 0, 6.283); sctx.fill();
    }
    for (i = 0; i < 30; i++){ sctx.fillStyle = '#23239a'; sctx.beginPath(); sctx.ellipse(box.x0 + rnd()*(box.x1 - box.x0), box.y0 + rnd()*(box.y1 - box.y0), 6 + rnd()*12, 4 + rnd()*7, rnd()*3, 0, 6.283); sctx.fill(); }
  }
  var inited = false;
  function layout(a){
    /* a phone's toolbar sliding in or out is not a reason to bury everything again */
    var small = inited && a.W === W && Math.abs(a.H - H) < 140;
    A = a;
    if (small){ place(); return; }
    W = A.W; H = A.H; inited = true;
    [soil, fx].forEach(function(c){ c.width = Math.round(W*dpr); c.height = Math.round(H*dpr); });
    box = {x0:A.side ? A.l - 12 : 0, y0:0, x1:W, y1:A.side ? H : A.b + 8};
    R = Math.max(26, Math.min(40, A.w/16)); brush.style.setProperty('--bd', (R*2) + 'px');
    place();
    cols = Math.ceil((box.x1 - box.x0)/CELL); rows = Math.ceil((box.y1 - box.y0)/CELL);
    cells = new Uint8Array(cols*rows); total = cols*rows; cleared = 0; foundN = 0;
    pile = new Float32Array(Math.ceil(W/4) + 1);
    finds.forEach(function(f){ f.found = false; });
    paintSoil(); report();
  }
  function place(){
    var spots = A.h > A.w*1.05 ? TALL : WIDE, top = A.t + 44;
    finds.forEach(function(f){
      var s = spots[f.getAttribute('data-at')];
      f.style.setProperty('--mw', Math.min(352, A.w*.72) + 'px');
      var x = A.l + s[0]*A.w, y = top + s[1]*(A.b - top);
      f.style.left = x + 'px'; f.style.top = y + 'px';
      /* then nudged back inside the scene if it hangs over an edge */
      var r = f.getBoundingClientRect();
      x += Math.max(0, A.l - r.left) - Math.max(0, r.right - A.r);
      y += Math.max(0, top - r.top) - Math.max(0, r.bottom - A.b);
      f.style.left = x + 'px'; f.style.top = y + 'px';
    });
    over.style.left = A.cx + 'px'; over.style.top = (A.t + A.h*.42) + 'px';
    tally.style.right = (W - A.r) + 'px'; tally.style.top = A.t + 'px'; tally.style.maxWidth = A.w + 'px';
    finds.forEach(function(f){ var r = f.getBoundingClientRect(); f.box = [r.left, r.top, r.right, r.bottom]; });
  }
  WDC.onResize(layout); layout(WDC.area());

  function dig(x, y, r){
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.globalCompositeOperation = 'destination-out';
    var g = sctx.createRadialGradient(x, y, r*.35, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = g; sctx.beginPath(); sctx.arc(x, y, r, 0, 6.283); sctx.fill();
    var c0 = Math.max(0, Math.floor((x - box.x0 - r*.7)/CELL)), c1 = Math.min(cols - 1, Math.floor((x - box.x0 + r*.7)/CELL));
    var r0 = Math.max(0, Math.floor((y - box.y0 - r*.7)/CELL)), r1 = Math.min(rows - 1, Math.floor((y - box.y0 + r*.7)/CELL));
    for (var cy = r0; cy <= r1; cy++) for (var cx = c0; cx <= c1; cx++){
      var k = cy*cols + cx; if (cells[k]) continue;
      if (Math.hypot(box.x0 + cx*CELL + CELL/2 - x, box.y0 + cy*CELL + CELL/2 - y) < r*.7){ cells[k] = 1; cleared++; }
    }
    if (!WDC.reduced && crumbs.length < 600) for (var i = 0; i < 3; i++)
      crumbs.push({x:x + (Math.random() - .5)*r, y:y + (Math.random() - .5)*r*.6, vx:(Math.random() - .5)*160, vy:-Math.random()*140, s:1.5 + Math.random()*3, c:Math.random() > .5 ? '#12127a' : '#1a1a8c'});
  }
  function uncovered(f){
    var b = f.box, n = 0, on = 0;
    for (var y = b[1]; y < b[3]; y += CELL) for (var x = b[0]; x < b[2]; x += CELL){
      var cx = Math.floor((x - box.x0)/CELL), cy = Math.floor((y - box.y0)/CELL);
      if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
      n++; if (cells[cy*cols + cx]) on++;
    }
    return n ? on/n : 1;
  }
  var lastPct = -1;
  function report(){
    finds.forEach(function(f){
      if (!f.found && uncovered(f) > .5){
        f.found = true; foundN++; sr.textContent = 'You found ' + f.getAttribute('data-name') + '.';
        if (!WDC.reduced) f.animate([{filter:'brightness(1.8) drop-shadow(0 0 16px #ff6500)'},{filter:'none'}], {duration:900});
      }
    });
    document.getElementById('found').innerHTML = 'Found <b>' + foundN + '</b> of ' + finds.length;
    var pct = Math.round(cleared/total*100);
    if (pct !== lastPct){ lastPct = pct; document.getElementById('pct').innerHTML = '<b>' + pct + '%</b> dug'; }
    over.classList.toggle('gone', cleared > 30);
  }

  var down = false, last = null, rt = 0;
  soil.addEventListener('pointerdown', function(e){ down = true; soil.setPointerCapture(e.pointerId); last = {x:e.clientX, y:e.clientY}; dig(e.clientX, e.clientY, R); });
  soil.addEventListener('pointermove', function(e){
    if (e.pointerType === 'mouse'){ brush.style.opacity = 1; brush.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }
    if (!down) return;
    var d = Math.hypot(e.clientX - last.x, e.clientY - last.y), n = Math.ceil(d/10);
    for (var i = 1; i <= n; i++) dig(last.x + (e.clientX - last.x)*i/n, last.y + (e.clientY - last.y)*i/n, R);
    last = {x:e.clientX, y:e.clientY};
    var now = performance.now(); if (now - rt > 150){ rt = now; report(); }
  });
  function up(){ down = false; report(); }
  soil.addEventListener('pointerup', up); soil.addEventListener('pointercancel', up);
  soil.addEventListener('pointerleave', function(){ brush.style.opacity = 0; });

  /* the keyboard's way, and the hurried one: sweep the whole field */
  document.getElementById('all').addEventListener('click', function(){
    var y = box.y0;
    function sweep(){
      for (var x = box.x0; x < box.x1 + 40; x += 44) dig(x + Math.sin(y/30)*14, y, 60);
      y += 34; report();
      if (y < box.y1 + 60) (WDC.reduced ? sweep() : requestAnimationFrame(sweep));
      else { sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, soil.width, soil.height); cells.fill(1); cleared = total; report(); }
    }
    sweep();
  });

  /* crumbs fall and pile up along the bottom */
  if (!WDC.reduced) WDC.loop(function(dt){
    if (!dt) return;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H);
    var floor = box.y1;
    for (var i = crumbs.length - 1; i >= 0; i--){
      var c = crumbs[i]; c.vy += 1500*dt; c.x += c.vx*dt; c.y += c.vy*dt;
      var col = Math.max(0, Math.min(pile.length - 1, Math.floor(c.x/4)));
      if (c.y >= floor - pile[col]){
        if (pile[col] < 60) for (var k = -2; k <= 2; k++){ var j = col + k; if (j >= 0 && j < pile.length) pile[j] += c.s*(k ? .25 : .6); }
        crumbs.splice(i, 1); continue;
      }
      fctx.fillStyle = c.c; fctx.fillRect(c.x, c.y, c.s, c.s);
    }
    fctx.fillStyle = '#12127a'; fctx.beginPath(); fctx.moveTo(box.x0, floor);
    for (var p = Math.floor(box.x0/4); p < pile.length; p++) fctx.lineTo(p*4, floor - pile[p]);
    fctx.lineTo(W, floor); fctx.fill();
  });
})();
`,
};

export default t10;
