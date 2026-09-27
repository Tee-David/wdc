/* 02 BLUEPRINT: website design and development. Wireframe -> exploded DOM layers -> live page. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU } = U;
  const ORANGE = '#ff6500';
  let WIRE = 'rgba(175,190,255,';

  function layout(mobile) {
    const els = [];
    const add = (layer, x, y, w, h, r, fill, kind = 'box', extra = {}) => els.push(Object.assign({ layer, x, y, w, h, r, fill, kind }, extra));
    if (!mobile) {
      const pw = 1000, ph = 660;
      add(0, 0, 0, pw, ph, 18, '#f4f3ef', 'page');
      add(1, 30, 22, 940, 44, 12, '#ffffff');
      add(2, 50, 34, 64, 20, 5, '#000065', 'text');
      for (let i = 0; i < 4; i++) add(2, 560 + i * 72, 38, 52, 12, 6, '#2a2a40', 'text');
      add(2, 862, 31, 92, 26, 13, '#0a0a0a', 'btn');
      add(1, 30, 84, 940, 318, 22, '#000065', 'hero');
      add(2, 70, 124, 90, 12, 6, ORANGE, 'text');
      add(2, 70, 152, 400, 38, 8, '#ffffff', 'text');
      add(2, 70, 198, 330, 38, 8, '#ffffff', 'text');
      add(2, 70, 256, 360, 12, 6, '#8f8fd0', 'text');
      add(2, 70, 276, 300, 12, 6, '#8f8fd0', 'text');
      add(2, 70, 318, 136, 40, 20, '#ffffff', 'btn');
      add(2, 216, 318, 136, 40, 20, '#0a0a0a', 'btn', { stroke: '#ffffff' });
      add(2, 640, 118, 250, 250, 125, ORANGE, 'orb');
      for (let i = 0; i < 3; i++) {
        const x = 30 + i * 320;
        add(1, x, 422, 300, 214, 16, '#ffffff', 'card', { card: i });
        add(2, x + 14, 436, 272, 118, 10, ['#1d1d8c', '#ff6500', '#0a0a3a'][i], 'img');
        add(2, x + 14, 568, 200, 14, 7, '#14142a', 'text');
        add(2, x + 14, 594, 150, 10, 5, '#8a8aa2', 'text');
      }
      return { pw, ph, els };
    }
    const pw = 420, ph = 860;
    add(0, 0, 0, pw, ph, 30, '#f4f3ef', 'page');
    add(1, 18, 18, 384, 46, 14, '#ffffff');
    add(2, 36, 31, 60, 20, 5, '#000065', 'text');
    add(2, 346, 31, 40, 20, 10, '#0a0a0a', 'btn');
    add(1, 18, 80, 384, 440, 24, '#000065', 'hero');
    add(2, 44, 114, 84, 12, 6, ORANGE, 'text');
    add(2, 44, 140, 300, 34, 8, '#ffffff', 'text');
    add(2, 44, 182, 240, 34, 8, '#ffffff', 'text');
    add(2, 44, 234, 290, 11, 5, '#8f8fd0', 'text');
    add(2, 44, 252, 230, 11, 5, '#8f8fd0', 'text');
    add(2, 190, 280, 190, 190, 95, ORANGE, 'orb');
    add(2, 44, 440, 150, 40, 20, '#ffffff', 'btn');
    add(1, 18, 540, 384, 146, 18, '#ffffff', 'card', { card: 0 });
    add(2, 32, 554, 130, 118, 10, '#1d1d8c', 'img');
    add(2, 178, 572, 180, 14, 7, '#14142a', 'text');
    add(2, 178, 598, 120, 10, 5, '#8a8aa2', 'text');
    add(1, 18, 700, 384, 146, 18, '#ffffff', 'card', { card: 1 });
    add(2, 32, 714, 130, 118, 10, '#ff6500', 'img');
    add(2, 178, 732, 180, 14, 7, '#14142a', 'text');
    add(2, 178, 758, 120, 10, 5, '#8a8aa2', 'text');
    return { pw, ph, els };
  }

  // rounded rectangle sampled in page space, then projected
  function rrPoly(proj, L, x, y, w, h, r, z, x0, x1) {
    // optional horizontal clip [x0,x1] in page space (for the scan wipe)
    const pts = [];
    const cx = L.pw / 2, cy = L.ph / 2;
    r = Math.min(r, w / 2, h / 2);
    const push = (px, py) => pts.push(proj(px - cx, cy - py, z, {}));
    const corners = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
    const raw = [];
    const n = r > 40 ? 14 : 4;
    for (const [ax, ay, a0] of corners) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; raw.push([ax + Math.cos(a) * r, ay + Math.sin(a) * r]); }
    for (const [px, py] of raw) push(x0 === undefined ? px : clamp(px, x0, x1), py);
    return pts;
  }
  function pathOf(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath(); }
  function perim(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += Math.hypot(b.x - a.x, b.y - a.y); } return s; }

  let Ld, Lm;
  function scanAt(t, pw) { // returns page-space x of the live/wire boundary
    const a = -40, b = pw + 40;
    if (t < 4.1) return a;
    if (t < 10) return lerp(a, b, E.inOutCubic(seg(t, 4.1, 6.3)));
    const k = (t - 10) % 14;
    if (k < 8) return b;
    if (k < 9.6) return lerp(b, a, E.inOutCubic(seg(k, 8, 9.6)));
    if (k < 11.2) return a;
    return lerp(a, b, E.inOutCubic(seg(k, 11.2, 13.4)));
  }

  return {
    name: 'Blueprint', service: 'Website design and development', short: 'Websites', cue: 2.4, focus: [.5, .5],
    fix: 'Given a light ground as well as the navy one: on paper the wireframe is navy ink, measurements use the accessible orange (#c95000), the scan line is solid rather than additive light, and the finished page gets a hairline edge so it does not melt into the ground. Refitted for a near-square stage, and the ground now matches the other nine so hand-offs between pieces are seamless.',
    pitch: 'A page is drawn as a blueprint, pulled apart into its layers like a developer inspecting the DOM, then pressed back together as a live, lit interface. A scan line keeps crossing it, so wireframe and finished site are always one object seen from two sides.',
    tech: 'Canvas 2D with a hand-rolled perspective camera. Every rounded rectangle is sampled and projected per frame; the wireframe draws on with dash offsets, and the live half is revealed through a projected clip that follows the scan line. Phones get a phone layout, not a shrunken desktop one.',
    duration: 10, stillT: 17, kind: '2d',
    beats: [['0.0 s', 'A caret blinks in the dark; a 12-column grid fades up.'], ['0.7 s', 'Boxes draw on as a wireframe, with measurements.'], ['2.9 s', 'The camera swings and the page separates into three layers.'], ['4.1 s', 'An orange scan line renders the page live, left to right.'], ['6.0 s', 'The layers snap together with a little overshoot.'], ['7.4 s', 'The camera settles face-on; cards lift one by one.'], ['10.0 s', 'Idle: pointer tilts the page; the scan periodically turns it back to wireframe and rebuilds it.']],
    init() { Ld = layout(false); Lm = layout(true); },
    reset() {},
    frame(t, dt, env) {
      const { ctx, W, H, ptr, portrait } = env;
      const L = portrait ? Lm : Ld;
      const dark = env.dark;
      WIRE = dark ? 'rgba(175,190,255,' : 'rgba(0,0,101,';
      const MEAS = dark ? 'rgba(255,150,90,' : 'rgba(184,74,0,';
      U.ground(ctx, env);

      const idle = ss(8, 10, t);
      const swing = E.inOutCubic(seg(t, 2.6, 4.6)), front = E.inOutQuint(seg(t, 5.6, 8.2));
      let yaw = lerp(lerp(-.3, -.72, swing), -.16, front) + Math.sin(t * .2) * .03;
      let pitch = lerp(lerp(.78, .5, swing), .2, front);
      yaw += ptr.x * .32 * idle; pitch += ptr.y * .18 * idle;
      const roll = lerp(.1, 0, front);
      const fit = portrait ? Math.min(W * .74 / L.pw, H * .7 / L.ph) : Math.min(W * .72 / L.pw, H * .74 / L.ph);
      const zoom = lerp(lerp(.95, .78, swing), 1, front) * (1 + .03 * Math.sin(t * .25) * idle);
      const proj = U.camera({ yaw, pitch, roll, dist: 1700, scale: fit * zoom, cx: W / 2, cy: H * (portrait ? .5 : .52) });
      const gapIn = E.outCubic(seg(t, 2.9, 4.2)), gapOut = E.outBack(seg(t, 5.9, 6.9), 2.4);
      const gap = 130 * gapIn * (1 - gapOut) + (12 + 26 * ptr.act) * idle;
      const zOf = l => -l * gap;
      const sx = scanAt(t, L.pw);
      const cxp = L.pw / 2, cyp = L.ph / 2;

      // shadow under the page (soft ellipse projected)
      {
        const c = proj(0, 0, 60, {}); const s = fit * zoom * L.pw * .55;
        const sh = ctx.createRadialGradient(c.x, c.y + s * .15, 0, c.x, c.y + s * .15, s);
        sh.addColorStop(0, dark ? 'rgba(0,0,0,.45)' : 'rgba(20,20,70,.16)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
      }

      // caret anticipation
      if (t < 1.2) {
        const c = proj(-cxp + 60, cyp - 50, 0, {});
        const on = Math.floor(t * 3.2) % 2 === 0 ? 1 : .15;
        ctx.fillStyle = `rgba(255,101,0,${on * (1 - seg(t, .8, 1.2))})`; ctx.fillRect(c.x - 1, c.y - 12, 2.5, 24);
      }

      const lift = (el) => {
        if (el.card === undefined || t < 7.2) return 0;
        const cyc = t < 10 ? t - 7.4 : (t - 10) % 6;
        const k = cyc - el.card * .45; return 22 * Math.sin(Math.PI * clamp(k / 1.1)) * (k > 0 && k < 1.1 ? 1 : 0);
      };

      for (let layer = 0; layer < 3; layer++) {
        const z = zOf(layer);
        // column grid on the base layer (wire only, fades as live)
        if (layer === 0) {
          const gridA = ss(.3, 1.2, t) * .55;
          if (gridA > 0) {
            const cols = portrait ? 4 : 12, gw = portrait ? 18 : 30, gut = portrait ? 12 : 20, colW = (L.pw - gw * 2 - gut * (cols - 1)) / cols;
            for (let c = 0; c < cols; c++) {
              const x = gw + c * (colW + gut);
              if (x > sx) { const p = rrPoly(proj, L, x, 0, colW, L.ph, 0, z); pathOf(ctx, p); ctx.fillStyle = `rgba(255,101,0,${.06 * gridA})`; ctx.fill(); }
            }
          }
        }
        // wire pass
        L.els.forEach((el, i) => {
          if (el.layer !== layer) return;
          const k = E.inOutCubic(seg(t, .7 + i * .055, 1.7 + i * .055));
          if (k <= 0) return;
          const zz = z - lift(el);
          const p = rrPoly(proj, L, el.x, el.y, el.w, el.h, el.r, zz);
          if (el.x + el.w <= sx) return; // fully live
          const per = perim(p);
          ctx.save();
          if (el.x < sx) { const c = rrPoly(proj, L, sx, -40, L.pw + 80, L.ph + 80, 0, zz); pathOf(ctx, c.map(q => q)); ctx.clip(); }
          ctx.setLineDash([per * k, per]); ctx.lineWidth = el.kind === 'page' ? 1.3 : 1;
          ctx.strokeStyle = WIRE + (el.kind === 'text' ? .45 : .78) + ')';
          pathOf(ctx, p); ctx.stroke(); ctx.setLineDash([]);
          if ((el.kind === 'img' || el.kind === 'orb') && k > .6) {
            const a = rrPoly(proj, L, el.x, el.y, el.w, el.h, 0, zz).slice();
            const q = [a[0], a[5], a[10], a[15]]; // r=0 -> 5 samples per corner: tr, br, bl, tl
            ctx.strokeStyle = WIRE + (.3 * ss(.6, 1, k)) + ')'; ctx.beginPath(); ctx.moveTo(q[3].x, q[3].y); ctx.lineTo(q[1].x, q[1].y); ctx.moveTo(q[0].x, q[0].y); ctx.lineTo(q[2].x, q[2].y); ctx.stroke();
          }
          ctx.restore();
          // measurements
          if ((el.kind === 'hero' || el.kind === 'card' || el.kind === 'orb') && k > .9 && el.x + el.w > sx) {
            const a = ss(.9, 1, k) * (1 - ss(4.1, 4.6, t) * (el.x < sx + 200 ? 1 : 0));
            const m = proj(el.x + el.w / 2 - cxp, cyp - el.y + 12, zz, {});
            ctx.font = `500 ${portrait ? 10 : 11}px "Space Grotesk", sans-serif`; ctx.fillStyle = MEAS + (.95 * a) + ')'; ctx.textAlign = 'center';
            ctx.fillText(el.kind === 'orb' ? `r ${el.w / 2}` : `${el.w} × ${el.h}`, m.x, m.y);
            ctx.textAlign = 'left';
          }
        });
        // live pass, clipped to the left of the scan line
        if (sx > 0) {
          L.els.forEach(el => {
            if (el.layer !== layer || el.x >= sx) return;
            const zz = z - lift(el);
            ctx.save();
            const c = rrPoly(proj, L, -40, -40, sx + 40, L.ph + 80, 0, zz); pathOf(ctx, c); ctx.clip();
            const p = rrPoly(proj, L, el.x, el.y, el.w, el.h, el.r, zz);
            let fill = el.fill;
            if (el.kind === 'orb' || el.kind === 'img') {
              const a = p[Math.floor(p.length * .75)], b = p[Math.floor(p.length * .25)];
              const gr = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
              if (el.kind === 'orb') { const s = Math.sin(t * .6) * .15; gr.addColorStop(0, '#ffb07a'); gr.addColorStop(.45 + s, '#ff6500'); gr.addColorStop(1, '#8a2a00'); }
              else if (el.fill === '#ff6500') { gr.addColorStop(0, '#ffa066'); gr.addColorStop(1, '#c24400'); }
              else if (el.fill === '#1d1d8c') { gr.addColorStop(0, '#5050ff'); gr.addColorStop(1, '#000065'); }
              else { gr.addColorStop(0, '#2a2a6a'); gr.addColorStop(1, '#05051f'); }
              fill = gr;
            }
            if (el.kind === 'card' && lift(el) > 1) { ctx.shadowColor = 'rgba(0,0,40,.35)'; ctx.shadowBlur = lift(el) * 1.2; ctx.shadowOffsetY = lift(el) * .5; }
            ctx.fillStyle = fill; pathOf(ctx, p); ctx.fill();
            ctx.shadowColor = 'transparent';
            if (el.kind === 'page' && !dark) { ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,60,.14)'; ctx.stroke(); }
            if (el.stroke) { ctx.lineWidth = 1.2; ctx.strokeStyle = el.stroke; ctx.stroke(); }
            if (el.kind === 'hero') { // light falloff inside the hero band
              const a = p[Math.floor(p.length * .75)], b = p[Math.floor(p.length * .25)]; const gr = ctx.createLinearGradient(a.x, a.y, b.x, b.y); gr.addColorStop(0, 'rgba(60,60,200,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fill();
            }
            if (layer > 0 && gap > 20) { ctx.lineWidth = 1; ctx.strokeStyle = dark ? `rgba(255,255,255,${.25 * ss(20, 80, gap)})` : `rgba(0,0,101,${.22 * ss(20, 80, gap)})`; ctx.stroke(); }
            ctx.restore();
          });
        }
        // scan line on this layer
        if (sx > -30 && sx < L.pw + 30) {
          const a = proj(sx - cxp, cyp + 20, z, {}), b = proj(sx - cxp, cyp - L.ph - 20, z, {});
          if (dark) ctx.globalCompositeOperation = 'lighter';
          for (const [w, al] of dark ? [[10, .08], [3, .35], [1.2, 1]] : [[8, .1], [3, .3], [1.4, 1]]) { ctx.strokeStyle = `rgba(255,${w > 5 ? 90 : dark ? 130 : 101},${dark ? 30 : 0},${al})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      // layer connectors while exploded
      if (gap > 30) {
        const a = ss(30, 100, gap) * .5;
        ctx.strokeStyle = WIRE + (a * .5) + ')'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.beginPath();
        for (const [x, y] of [[0, 0], [L.pw, 0], [0, L.ph], [L.pw, L.ph]]) { const p0 = proj(x - cxp, cyp - y, 0, {}), p2 = proj(x - cxp, cyp - y, zOf(2), {}); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p2.x, p2.y); }
        ctx.stroke(); ctx.setLineDash([]);
        ctx.font = '500 11px "Space Grotesk", sans-serif'; ctx.fillStyle = dark ? `rgba(200,210,255,${a * 1.6})` : `rgba(0,0,101,${a * 1.6})`;
        ['body', 'section', 'content'].forEach((n, l) => { const p = proj(cxp + 10, cyp - L.ph, zOf(l), {}); ctx.textAlign = 'left'; ctx.fillText(`<${n}>`, p.x + 6, p.y); });
        ctx.textAlign = 'left';
      }
    }
  };
})());
