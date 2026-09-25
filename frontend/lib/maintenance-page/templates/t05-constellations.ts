import type { TemplateModule } from "../shell";

/**
 * 05, CONSTELLATIONS. The night sky over the studio, with its six services
 * drawn as star patterns that trace themselves in. Each one is a button:
 * hover, focus or tap it for a line about what is coming back. Shooting stars
 * carry the motto across, a word at a time. The sky is seeded, so it is the
 * same sky on every visit, and it shifts with the cursor on a mouse only.
 */
const t05: TemplateModule = {
  css: String.raw`
.stage{background:linear-gradient(180deg,#00002b 0%,#00004f 60%,var(--navy) 100%)}
canvas{position:absolute;inset:0;width:100%;height:100%}
.star-btn{position:absolute;transform:translate(-50%,-50%);width:var(--d);height:var(--d);border-radius:50%;border:0;background:transparent;cursor:pointer;padding:0;color:inherit}
.star-btn .lbl{position:absolute;left:50%;top:100%;transform:translate(-50%,4px);white-space:nowrap;display:grid;justify-items:center;gap:.25rem;pointer-events:none}
.star-btn .n{font:700 .72rem/1 var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--mist);transition:color .2s}
.star-btn .t{font:600 .8rem/1.2 var(--body);color:#000;background:#fff;padding:.35rem .6rem;border-radius:999px;opacity:0;transform:translateY(-4px);transition:opacity .2s,transform .2s}
.star-btn:hover .n,.star-btn:focus-visible .n,.star-btn.on .n{color:var(--orange)}
.star-btn:hover .t,.star-btn:focus-visible .t,.star-btn.on .t{opacity:1;transform:none}
.star-btn:focus-visible{outline-offset:6px}
.horizon{position:absolute;left:0;right:0;bottom:0;background:#00003a;border-top:2px solid var(--orange)}
.horizon::before{content:"";position:absolute;left:0;right:0;top:-44px;height:44px;background:linear-gradient(0deg,rgba(255,101,0,.2),transparent)}
.word{position:absolute;left:0;top:0;font:700 clamp(1.3rem,2.8vw,2.1rem)/1 var(--display);letter-spacing:-.02em;color:#fff;pointer-events:none;opacity:0;white-space:nowrap}
`,
  body: () => `<main class="stage" aria-label="The studio's services as constellations">
  <canvas id="c" aria-hidden="true"></canvas>
  <div class="horizon" id="horizon" aria-hidden="true"></div>
  <div id="btns"></div>
  <span class="word" id="word" aria-hidden="true"></span>
</main>`,
  script: String.raw`
(function(){
  var cv = document.getElementById('c'), ctx = cv.getContext('2d'), btns = document.getElementById('btns'), word = document.getElementById('word');
  var horizon = document.getElementById('horizon');
  var dpr = Math.min(2, devicePixelRatio || 1), W, H, A;
  function circle(cx, cy, r, n, a0){ var p = []; for (var i = 0; i < n; i++){ var a = (a0 || 0) + i/n*Math.PI*2; p.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r]); } return p; }
  function ring(start, n){ var e = []; for (var i = 0; i < n; i++) e.push([start + i, start + (i + 1)%n]); return e; }
  var cons = [
    {n:'Branding', t:'Coming back sharper', p:[[0,1],[-.5,-.1],[-.35,-.85],[.35,-.85],[.5,-.1],[0,-.15]], e:[[0,1],[1,2],[2,3],[3,4],[4,0],[0,5]]},
    {n:'Web', t:'Faster pages on every phone', p:[[-1,-.7],[1,-.7],[1,.7],[-1,.7],[-1,-.3],[1,-.3],[-.8,-.5]], e:[[0,1],[1,2],[2,3],[3,0],[4,5]]},
    {n:'SEO', t:'Easier to find', p:circle(-.2,-.2,.55,7,.3).concat([[.25,.25],[.85,.85]]), e:ring(0,7).concat([[7,8]])},
    {n:'Mobile apps', t:'Built for the thumb', p:[[-.5,-1],[.5,-1],[.5,1],[-.5,1],[0,.78],[-.15,-.82],[.15,-.82]], e:[[0,1],[1,2],[2,3],[3,0],[5,6]]},
    {n:'AI software', t:'Tools that do the dull parts', p:[[0,-.85],[-.8,-.1],[.8,-.1],[-.45,.8],[.45,.8],[0,0]], e:[[0,5],[1,5],[2,5],[3,5],[4,5],[0,1],[0,2],[1,3],[2,4],[3,4]]},
    {n:'Marketing', t:'Louder, to the right people', p:[[-.9,-.25],[-.35,-.25],[.75,-.85],[.75,.85],[-.35,.25],[-.9,.25],[-.6,.25],[-.45,.85]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[6,7]]}
  ];
  /* Positions, as fractions of the scene: a loose sky on wide screens, two columns on tall ones. */
  var WIDE = [[.1,.14],[.5,.06],[.9,.22],[.24,.62],[.62,.5],[.9,.7]];
  var TALL = [[.25,.1],[.75,.2],[.25,.42],[.75,.52],[.27,.76],[.73,.88]];
  var seed = 7; function rnd(){ seed = (seed*16807)%2147483647; return seed/2147483647; }
  var stars = []; for (var i = 0; i < 280; i++) stars.push({x:rnd(), y:rnd(), r:rnd()*1.3 + .3, z:rnd()*.9 + .1, ph:rnd()*6.28});

  cons.forEach(function(c){
    var b = c.btn = document.createElement('button'); b.className = 'star-btn'; b.type = 'button';
    b.innerHTML = '<span class="lbl"><span class="n"></span><span class="t"></span></span>';
    b.querySelector('.n').textContent = c.n; b.querySelector('.t').textContent = c.t;
    b.setAttribute('aria-label', c.n + ': ' + c.t);
    b.addEventListener('click', function(){ var on = !b.classList.contains('on'); cons.forEach(function(o){ o.btn.classList.toggle('on', o === c && on); }); c.flare = 1; });
    b.addEventListener('pointerenter', function(){ c.hot = 1; }); b.addEventListener('pointerleave', function(){ c.hot = 0; });
    b.addEventListener('focus', function(){ c.hot = 1; }); b.addEventListener('blur', function(){ c.hot = 0; });
    btns.appendChild(b);
  });
  function layout(a){
    A = a; W = A.W; H = A.H; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    var tall = A.h > A.w*1.1, spots = tall ? TALL : WIDE;
    var S = Math.max(26, Math.min(58, A.w/(tall ? 7 : 14), A.h/(tall ? 12 : 8)));
    var padX = S*1.6, padT = S*1.1, padB = S*2.2;
    cons.forEach(function(c, i){
      c.x = A.l + padX + spots[i][0]*(A.w - padX*2);
      c.y = A.t + padT + spots[i][1]*(A.h - padT - padB);
      c.S = S;
      c.btn.style.left = c.x + 'px'; c.btn.style.top = c.y + 'px'; c.btn.style.setProperty('--d', (S*2.3) + 'px');
    });
    horizon.style.top = Math.round(A.side ? H*.86 : A.b + 8) + 'px';
    if (WDC.reduced) frame(1e9, 0);
  }
  WDC.onResize(layout); layout(WDC.area());

  var mx = 0, my = 0, tx = 0, ty = 0;
  if (!WDC.coarse) addEventListener('pointermove', function(e){ tx = e.clientX/W - .5; ty = e.clientY/H - .5; }, {passive:true});
  var t0 = performance.now(), shoot = null, nextShoot = 1.5, words = ['Brilliant', 'simplicity', 'of thought.'], wi = 0;

  function frame(now, dt){
    var T = (now - t0)/1000;
    mx += (tx - mx)*.05; my += (ty - my)*.05;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    stars.forEach(function(s){
      ctx.globalAlpha = (WDC.reduced ? .7 : .45 + .55*Math.abs(Math.sin(T*.8 + s.ph)))*s.z;
      ctx.beginPath(); ctx.arc(s.x*W - mx*40*s.z, s.y*H*.9 - my*30*s.z, s.r, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
    cons.forEach(function(c, ci){
      var ox = -mx*18, oy = -my*14;
      var drawn = WDC.reduced ? 1 : Math.min(1, Math.max(0, (T - ci*.6)/1.8));
      c.flare = (c.flare || 0)*.96;
      var hot = c.hot || c.btn.classList.contains('on') ? 1 : 0;
      c.glow = (c.glow || 0) + (hot - (c.glow || 0))*.12;
      ctx.lineWidth = 1.2 + c.glow*1.2;
      ctx.strokeStyle = 'rgba(255,' + Math.round(255 - 154*c.glow) + ',' + Math.round(255 - 255*c.glow) + ',' + (.35 + .5*c.glow + c.flare*.4) + ')';
      var total = c.e.length*drawn;
      c.e.forEach(function(e, i){
        var k = Math.max(0, Math.min(1, total - i)); if (!k) return;
        var a = c.p[e[0]], b = c.p[e[1]];
        var ax = c.x + ox + a[0]*c.S, ay = c.y + oy + a[1]*c.S, bx = c.x + ox + b[0]*c.S, by = c.y + oy + b[1]*c.S;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (bx - ax)*k, ay + (by - ay)*k); ctx.stroke();
      });
      c.p.forEach(function(p, i){
        var tw = WDC.reduced ? 1 : .75 + .25*Math.sin(T*2 + i + ci);
        ctx.fillStyle = c.glow > .5 ? '#ff6500' : '#fff';
        ctx.shadowColor = c.glow > .5 ? '#ff6500' : '#9fa6ff'; ctx.shadowBlur = 10 + c.flare*30;
        ctx.beginPath(); ctx.arc(c.x + ox + p[0]*c.S, c.y + oy + p[1]*c.S, (2 + c.glow*1.2)*tw*drawn, 0, 6.283); ctx.fill();
      });
      ctx.shadowBlur = 0;
    });
    if (WDC.reduced) return;
    nextShoot -= dt;
    if (!shoot && nextShoot <= 0){
      var sx = A.l + A.w*(.4 + Math.random()*.55), sy = A.t + Math.random()*A.h*.25;
      var sc = Math.max(.6, Math.min(1, A.w/700));
      shoot = {x:sx, y:sy, vx:-(520 + Math.random()*200)*sc, vy:(260 + Math.random()*120)*sc, life:0};
      word.textContent = words[wi++ % words.length];
      var wx = Math.max(A.l, sx - 220*sc), wy = sy + 60*sc;
      word.animate([{opacity:0, transform:'translate(' + wx + 'px,' + wy + 'px)'},
        {opacity:1, offset:.3, transform:'translate(' + (wx - 24*sc) + 'px,' + (wy + 12*sc) + 'px)'},
        {opacity:0, transform:'translate(' + (wx - 70*sc) + 'px,' + (wy + 34*sc) + 'px)'}], {duration:2400, easing:'ease-out'});
    }
    if (shoot){
      shoot.life += dt; shoot.x += shoot.vx*dt; shoot.y += shoot.vy*dt;
      var tlx = shoot.x - shoot.vx*.28, tly = shoot.y - shoot.vy*.28;
      var g = ctx.createLinearGradient(shoot.x, shoot.y, tlx, tly);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,101,0,.8)'); g.addColorStop(1, 'rgba(255,101,0,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(tlx, tly); ctx.stroke();
      if (shoot.life > 1.4){ shoot = null; nextShoot = 3.5 + Math.random()*2.5; }
    }
  }
  if (WDC.reduced) frame(1e9, 0);
  else WDC.loop(function(dt, now){ frame(now, dt); });
})();
`,
};

export default t05;
