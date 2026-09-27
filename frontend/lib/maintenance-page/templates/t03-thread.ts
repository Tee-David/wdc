import type { TemplateModule } from "../shell";

/**
 * 03, THE ORANGE THREAD. One line, the orange rule from the brand, sketches
 * what the studio is doing: thinking, tinkering, fine tuning, an idea,
 * sketching, coffee. It ends on a clock whose hands show the back-by time in
 * Lagos, then lets go and starts again. The line leans toward a cursor or
 * finger. Every shape is resampled to the same number of points, so any two
 * can be blended; nothing is hand-tweened.
 */
const t03: TemplateModule = {
  css: String.raw`
.stage{background:radial-gradient(70% 60% at 60% 42%,#0b0b80 0%,var(--navy) 60%,#00004d 100%)}
canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
.word{position:absolute;left:0;width:0;margin:0;text-align:center;font:700 clamp(1.3rem,3.2vw,2.4rem)/1 var(--display);letter-spacing:-.02em;color:#fff;transition:opacity .35s;white-space:nowrap;display:flex;flex-direction:column;align-items:center}
.word small{display:block;margin-top:.65rem;font:600 .78rem/1.3 var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--mist)}
`,
  body: () => `<main class="stage" aria-label="An orange line sketching ideas">
  <canvas id="c" aria-hidden="true"></canvas>
  <p class="word" id="word" aria-hidden="true"><span id="w1">Thinking</span><small id="w2">One line, many ideas</small></p>
</main>`,
  script: String.raw`
(function(){
  var cv = document.getElementById('c'), ctx = cv.getContext('2d'), word = document.getElementById('word');
  var w1 = document.getElementById('w1'), w2 = document.getElementById('w2');
  var N = 520, dpr = Math.min(2, devicePixelRatio || 1), W, H, cx, cy, R;

  function arc(x, y, r, a0, a1, n){ var p = []; for (var i = 0; i <= n; i++){ var a = a0 + (a1 - a0)*i/n; p.push([x + Math.cos(a)*r, y + Math.sin(a)*r]); } return p; }
  function fn(f, n){ var p = []; for (var i = 0; i <= n; i++) p.push(f(i/n)); return p; }
  var shapes = [
    {w:'Thinking', s:'One line, many ideas', p:fn(function(t){ return [-.55 + 1.1*t, 0]; }, 40)},
    {w:'Tinkering', s:'Trying things out', p:fn(function(t){ return [-1 + 2*t, Math.sin(t*Math.PI*6)*.22*Math.sin(t*Math.PI)]; }, 200)},
    {w:'Fine tuning', s:'Every part in its place', p:fn(function(t){ var a = t*Math.PI*2 - Math.PI/2, r = .62 + .12*Math.tanh(5*Math.sin(a*10)); return [Math.cos(a)*r, Math.sin(a)*r]; }, 400)},
    {w:'An idea', s:'The good kind', p:[].concat([[-.2,.78],[-.2,.5]], arc(0, -.05, .5, Math.PI*.64, Math.PI*2.36, 90), [[.2,.5],[.2,.78],[-.2,.78],[-.14,.9],[.14,.9]])},
    {w:'Sketching', s:'Drawing it out first', p:[[-.85,-.14],[.5,-.14],[.85,0],[.5,.14],[-.85,.14],[-.85,-.14],[-.62,-.14],[-.62,.14],[-.62,-.14],[.5,-.14],[.5,.14]]},
    {w:'Coffee', s:'Obviously', p:[].concat(fn(function(t){ return [-.3 + Math.sin(t*Math.PI*3)*.06, -.95 + t*.55]; }, 40), [[-.5,-.35],[-.44,.5]], arc(0, .5, .44, Math.PI, 0, 30).map(function(q){ return [q[0], .5 + (q[1] - .5)*.35]; }), [[.44,.5],[.5,-.35]], arc(.62, .02, .2, -Math.PI*.55, Math.PI*.55, 30), [[.5,-.35],[-.5,-.35]])}
  ];
  if (WDC.backBy){
    var lagos = new Date(new Date(WDC.backBy).toLocaleString('en-US', {timeZone:'Africa/Lagos'}));
    var hh = lagos.getHours()%12 + lagos.getMinutes()/60, mm = lagos.getMinutes();
    var ha = hh/12*Math.PI*2 - Math.PI/2, ma = mm/60*Math.PI*2 - Math.PI/2;
    shapes.push({w:'Back by ' + String(lagos.getHours()).padStart(2,'0') + ':' + String(mm).padStart(2,'0'), s:'West Africa Time, on the clock',
      p:[].concat(arc(0, 0, .66, -Math.PI/2, Math.PI*1.5, 160), [[0,-.66],[0,0],[Math.cos(ha)*.34, Math.sin(ha)*.34],[0,0],[Math.cos(ma)*.52, Math.sin(ma)*.52]])});
  } else {
    shapes.push({w:'Back soon', s:'We will not be long', p:arc(0, 0, .6, -Math.PI/2, Math.PI*1.5, 160)});
  }
  function resample(pts){
    var L = [0]; for (var i = 1; i < pts.length; i++) L.push(L[i-1] + Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]));
    var total = L[L.length-1] || 1, out = [], j = 1;
    for (var k = 0; k < N; k++){
      var d = total*k/(N-1);
      while (j < L.length - 1 && L[j] < d) j++;
      var seg = (L[j] - L[j-1]) || 1, t = (d - L[j-1])/seg;
      out.push([pts[j-1][0] + (pts[j][0] - pts[j-1][0])*t, pts[j-1][1] + (pts[j][1] - pts[j-1][1])*t]);
    }
    return out;
  }
  shapes.forEach(function(s){ s.r = resample(s.p); });

  function layout(A){
    W = A.W; H = A.H; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    var wordH = 80;
    R = Math.max(50, Math.min(A.w*.34, (A.h - wordH)*.36, 260));
    cx = A.cx; cy = A.t + (A.h - wordH)*.48;
    word.style.left = cx + 'px'; word.style.top = Math.min(A.b - wordH + 10, cy + R*1.05 + 30) + 'px';
    if (!running) draw(shapes[shapes.length-1].r, 0);
  }
  var running = !WDC.reduced;
  var ptr = {x:-1e4, y:-1e4};
  addEventListener('pointermove', function(e){ ptr.x = e.clientX; ptr.y = e.clientY; }, {passive:true});
  addEventListener('pointerup', function(e){ if (e.pointerType !== 'mouse'){ ptr.x = ptr.y = -1e4; } });
  document.addEventListener('pointerleave', function(){ ptr.x = ptr.y = -1e4; });

  function draw(pts, now){
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ff6500'; ctx.lineWidth = Math.max(3.5, R/50);
    ctx.shadowColor = 'rgba(255,101,0,.55)'; ctx.shadowBlur = 18;
    ctx.beginPath();
    var reach = Math.max(120, R*.8);
    for (var i = 0; i < N; i++){
      var x = cx + pts[i][0]*R, y = cy + pts[i][1]*R;
      var dx = ptr.x - x, dy = ptr.y - y, d = Math.hypot(dx, dy);
      if (d < reach && d > 0){ var f = 1 - d/reach; f = f*f*R*.12; x += dx/d*f; y += dy/d*f; }
      if (now) y += Math.sin(now/700 + i*.035)*1.3;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    var e = pts[N-1]; ctx.shadowBlur = 22; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx + e[0]*R, cy + e[1]*R, Math.max(4, R/45), 0, Math.PI*2); ctx.fill();
  }
  var shown = -1;
  function setWord(i){
    if (i === shown) return; shown = i;
    word.style.opacity = 0;
    setTimeout(function(){ w1.textContent = shapes[i].w; w2.textContent = shapes[i].s; word.style.opacity = 1; }, 220);
  }
  WDC.onResize(layout); layout(WDC.area());
  if (!running){ setWord(shapes.length - 1); draw(shapes[shapes.length-1].r, 0); return; }

  var idx = 0, t = 0, HOLD = 2.2, MORPH = 1.5;
  function ease(x){ return x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3)/2; }
  WDC.loop(function(dt, now){
    t += dt;
    var from = shapes[idx].r, next = (idx + 1) % shapes.length, to = shapes[next].r, cur = from;
    /* the clock holds longer: it is the one worth reading */
    var hold = idx === shapes.length - 1 ? HOLD*2 : HOLD;
    if (t < hold) setWord(idx);
    else {
      var k = ease(Math.min(1, (t - hold)/MORPH));
      cur = from.map(function(p, i){ return [p[0] + (to[i][0] - p[0])*k, p[1] + (to[i][1] - p[1])*k]; });
      if (k > .5) setWord(next);
      if (t >= hold + MORPH){ t = 0; idx = next; }
    }
    draw(cur, now);
  });
})();
`,
};

export default t03;
