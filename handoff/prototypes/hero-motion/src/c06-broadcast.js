/* 06 BROADCAST: advertising. Light streams across a field of monoliths and assembles into a billboard. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU, rng } = U;
  let content, cctx, dots = [], slabs = [], grid = { c: 0, r: 0 }, lastPortrait = null;

  function build(portrait) {
    const c = portrait ? 58 : 90, r = portrait ? 64 : 38;
    grid = { c, r, w: portrait ? 2.1 : 3.9, h: portrait ? 2.73 : 1.65 };
    content = document.createElement('canvas'); content.width = c; content.height = r; cctx = content.getContext('2d', { willReadFrequently: true });
    const rr = rng(21); dots = [];
    for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) {
      const a = rr() * TAU, far = 8 + rr() * 10;
      dots.push({ x, y, sx: Math.cos(a) * far * .9, sy: -1 + rr() * 6, sz: 6 + rr() * 14, t0: 1.25 + (x / c) * .9 + rr() * .9, dur: 1.3 + rr() * .5, sw: (rr() - .5) * 4, ph: rr() });
    }
    const rs = rng(5); slabs = [];
    const n = portrait ? 11 : 17;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1; const k = Math.floor(i / 2);
      const x = side * (portrait ? .5 + k * .42 : .9 + k * .62) + (rs() - .5) * .3, z = -1.2 + rs() * 3.8;
      let h = .5 + rs() * (portrait ? 2.6 : 2.4) * (1 - k * .06); if (z < 0 && Math.abs(x) < grid.w / 2 + .4) h = Math.min(h, .75);
      slabs.push({ x, z, w: .28 + rs() * .45, d: .28 + rs() * .5, h, t0: .1 + rs() * .9 });
    }
    slabs.push({ x: 0, z: 2.6, w: 2.2, d: .5, h: .35, t0: .2 });
  }

  function spotAt(t) {
    if (t < 5.2) return { id: -1, k: 0 };
    const seq = [[5.2, 7.4, 0], [7.4, 9.2, 1], [9.2, 12.6, 2]];
    for (const [a, b, id] of seq) if (t < b) return { id, k: (t - a) / (b - a), a, b };
    const cyc = [3.2, 3.0, 4.2], tot = 10.4; let lt = (t - 12.6) % tot, s = 12.6 + Math.floor((t - 12.6) / tot) * tot;
    for (let id = 0; id < 3; id++) { if (lt < cyc[id]) return { id, k: lt / cyc[id], a: s, b: s + cyc[id] }; lt -= cyc[id]; s += cyc[id]; }
    return { id: 2, k: 1 };
  }
  function paint(t, portrait) {
    const g = cctx, W = grid.c, H = grid.r;
    const sp = spotAt(t);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (sp.id === -1) { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); return sp; }
    if (sp.id === 0) { // eclipse: an orange field, a dark disc crosses it and leaves a ring of light
      const k = sp.k; g.fillStyle = '#ff6500'; g.fillRect(0, 0, W, H);
      const R = Math.min(W, H) * .36, cx = W / 2, cy = H / 2;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, R * (1 + .08 * Math.sin(k * 20)), 0, TAU); g.fill();
      const mx = lerp(-R * 1.5, W + R * 1.5, E.inOutCubic(k));
      g.fillStyle = '#05051f'; g.beginPath(); g.arc(lerp(mx, cx, ss(.35, .6, k) * (1 - ss(.8, 1, k))), cy, R * .96, 0, TAU); g.fill();
    } else if (sp.id === 1) { // attention: a wave of bars
      g.fillStyle = '#000065'; g.fillRect(0, 0, W, H);
      const n = portrait ? 8 : 18, bw = W / n;
      for (let i = 0; i < n; i++) { const h = H * (.25 + .7 * Math.abs(Math.sin(t * 3 + i * .45))) * ss(0, .2, sp.k); g.fillStyle = i % 5 === 2 ? '#ff6500' : '#fff'; g.fillRect(i * bw + bw * .18, H - h, bw * .64, h); }
    } else { // the wordmark
      g.fillStyle = '#000065'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
      if (!portrait) {
        g.font = '700 15px "Space Grotesk", sans-serif';
        const rev = ss(0, .25, sp.k);
        g.save(); g.beginPath(); g.rect(0, 0, W * rev * 1.05, H); g.clip();
        g.fillText('We Dig', 6, 16); g.fillText('Creativity', 6, 32);
        g.fillStyle = '#ff6500'; g.fillRect(6 + g.measureText('Creativity').width + 1.5, 28, 4, 4);
        g.restore();
      } else {
        // a justified poster stack: every line fills the width and is stretched to the same height, like condensed LED signage
        const lines = ['WE', 'DIG', 'CREATIVITY'], m = 2, avail = W - m * 2 - 1, gap = 3;
        const lh = (H - 4 - m - gap * 3) / 3;
        let y = m;
        lines.forEach((ln, i) => {
          g.font = '700 20px "Space Grotesk", sans-serif';
          const wid = g.measureText(ln).width * (i === 2 ? 1.08 : 1), fs = 20 * avail / wid, sy = lh / (fs * .72);
          const k = ss(.04 + i * .1, .16 + i * .1, sp.k);
          g.save(); g.beginPath(); g.rect(0, y - 1, W * k, lh + 2); g.clip();
          g.setTransform(1, 0, 0, sy, m, y + lh); g.font = `700 ${fs}px "Space Grotesk", sans-serif`; g.fillText(ln, 0, 0);
          g.restore();
          if (i === 2 && k > .9) { g.fillStyle = '#ff6500'; g.fillRect(W - m - 3, y + lh - 3, 3, 3); g.fillStyle = '#fff'; }
          y += lh + gap;
        });
        g.fillStyle = '#ff6500'; g.fillRect(m, H - 3, (W - m * 2) * ss(.3, .45, sp.k), 2);
      }
    }
    return sp;
  }

  return {
    name: 'Broadcast', service: 'Advertising', short: 'Advertising', cue: 4.2, focus: [.5, .4],
    fix: 'The phone version no longer scrolls a ticker. Its third spot is a justified poster stack, WE / DIG / CREATIVITY., each line set to fill the width of a taller billboard and revealed line by line, with an orange rule underneath. A daylight version for the light ground: pale stone monoliths that still pick up the billboard colour, ink-coloured streams of light, and a heavier frame so the screen reads as an object on paper. Shared ground for clean hand-offs.',
    pitch: 'Across a quiet field of monoliths, thousands of points of light stream in from the dark and lock into a single floating billboard that lights the whole landscape. It plays short spots, an eclipse, a wave, the wordmark, and every change repaints the monoliths in its colour.',
    tech: 'Canvas 2D with a perspective camera. Every LED is a particle with its own bezier flight and arrival time; once locked, it samples a tiny offscreen canvas where the spots are painted. The glow is that canvas stretched and blended, the spill on the monoliths is its average colour, and the wet floor is its reflection.',
    duration: 10, stillT: 10.6, kind: '2d',
    beats: [['0.0 s', 'Monoliths rise out of the haze, staggered.'], ['1.25 s', 'Streams of light arrive from beyond the field, left to right.'], ['4.8 s', 'They lock into a grid: a white flash, then the billboard is live.'], ['5.2 s', 'Spot one: an eclipse crosses an orange field.'], ['7.4 s', 'Spot two: a wave of bars; the monoliths turn navy.'], ['9.2 s', 'Spot three: We Dig Creativity.'], ['10.0 s', 'Idle: the spots loop; the pointer shifts the camera and scatters the LEDs it touches.']],
    init() {},
    reset(env) { if (lastPortrait !== env.portrait) { build(env.portrait); lastPortrait = env.portrait; } },
    resize(env) { if (lastPortrait !== env.portrait) { build(env.portrait); lastPortrait = env.portrait; } },
    frame(t, dt, env) {
      const { ctx, W, H, dpr, ptr, portrait } = env;
      if (lastPortrait !== portrait) { build(portrait); lastPortrait = portrait; }
      const idle = ss(9, 11, t);
      const sp = paint(t, portrait);
      const img = cctx.getImageData(0, 0, grid.c, grid.r).data;
      // average colour of the screen, for light spill
      let ar = 0, ag = 0, ab = 0; for (let i = 0; i < img.length; i += 4 * 7) { ar += img[i]; ag += img[i + 1]; ab += img[i + 2]; } const nS = img.length / (4 * 7); ar /= nS; ag /= nS; ab /= nS;
      const lock = ss(4.75, 5.0, t), flash = Math.exp(-Math.pow((t - 5.02) / .12, 2));
      const on = lock;
      const spill = [ar, ag, ab];

      // sky and haze: the shared ground, lit toward the horizon
      const dk = env.dark;
      U.ground(ctx, env, .5, .55);
      const SL = dk ? { base: [10, 10, 40], side: [20, 20, 70], top: [30, 30, 90], foot: 'rgb(4,4,20)', foot2: 'rgb(6,6,26)', rim: [120, 120, 255], mix: 1 }
        : { base: [200, 200, 222], side: [178, 178, 206], top: [230, 230, 242], foot: 'rgb(146,146,182)', foot2: 'rgb(136,136,176)', rim: [0, 0, 101], mix: .45 };

      const yaw = lerp(.28, 0, E.inOutCubic(seg(t, 0, 7))) + ptr.x * .2 * idle + Math.sin(t * .15) * .03 * idle;
      const pitch = lerp(-.02, .1, E.inOutCubic(seg(t, 0, 6))) + ptr.y * .06 * idle;
      const dist = lerp(10.5, 8, E.inOutCubic(seg(t, 0, 8)));
      const scale = portrait ? Math.min(W * .28, H * .19) : Math.min(W * .125, H * .23);
      const proj0 = U.camera({ yaw, pitch, dist, scale, cx: W / 2, cy: H * (portrait ? .52 : .56) });
      const TY = 1.3;
      const proj = (x, y, z) => proj0(x, y - TY, z, {});
      const bbY = portrait ? 2.1 : 1.85, bbZ = 0;

      // horizon glow tinted by the billboard
      const hz = proj(0, 0, 8);
      const hg = ctx.createRadialGradient(W / 2, hz.y, 0, W / 2, hz.y, W * .7);
      hg.addColorStop(0, dk ? U.rgba(U.mixc([40, 40, 140], spill, .5 * on), .35 + .25 * on) : U.rgba(U.mixc([255, 255, 255], spill, .35 * on), .5)); hg.addColorStop(1, dk ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);

      // billboard corners
      const bw = grid.w, bh = grid.h;
      const c00 = proj(-bw / 2, bbY + bh / 2, bbZ), c10 = proj(bw / 2, bbY + bh / 2, bbZ), c01 = proj(-bw / 2, bbY - bh / 2, bbZ);
      // floor reflection of the billboard
      if (on > 0) {
        const f00 = proj(-bw / 2, -(bbY + bh / 2) * .9, bbZ), f10 = proj(bw / 2, -(bbY + bh / 2) * .9, bbZ), f01 = proj(-bw / 2, -(bbY - bh / 2) * .9, bbZ);
        ctx.save(); ctx.globalAlpha = (dk ? .22 : .12) * on; ctx.filter = 'blur(6px)'; ctx.imageSmoothingEnabled = true;
        U.mapImage(ctx, content, f00, f10, f01, dpr); ctx.restore(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const gc = U.hex(U.P(env).g1); const fg = ctx.createLinearGradient(0, f01.y, 0, Math.max(f01.y + 1, f00.y)); fg.addColorStop(0, U.rgba(gc, .25)); fg.addColorStop(1, U.rgba(gc, 1)); ctx.fillStyle = fg; ctx.fillRect(0, f01.y, W, H - f01.y);
      }

      // monoliths, far to near
      const sl = slabs.map(s => ({ s, d: proj(s.x, 0, s.z).z })).sort((a, b) => b.d - a.d);
      const drawSlabs = (front) => { for (const { s } of sl) {
        if ((s.z < 0) !== front) continue;
        const hh = s.h * E.outExpo(seg(t, s.t0, s.t0 + 1.4));
        if (hh < .01) continue;
        const x0 = s.x - s.w / 2, x1 = s.x + s.w / 2, z0 = s.z - s.d / 2, z1 = s.z + s.d / 2;
        const V = (x, y, z) => proj(x, y, z);
        const face = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); };
        const lit = U.mixc(SL.base, spill, (.35 * on + .25 * flash) * SL.mix);
        // front face (facing camera, z0) with a vertical light falloff
        const f = [V(x0, hh, z0), V(x1, hh, z0), V(x1, 0, z0), V(x0, 0, z0)];
        const lg = ctx.createLinearGradient(0, f[0].y, 0, f[3].y); lg.addColorStop(0, U.rgba(lit, 1)); lg.addColorStop(1, SL.foot);
        face(f, lg);
        // side face toward the centre catches the billboard
        const sideX = s.x > 0 ? x0 : x1;
        const sd = [V(sideX, hh, z0), V(sideX, hh, z1), V(sideX, 0, z1), V(sideX, 0, z0)];
        const sg = ctx.createLinearGradient(0, sd[0].y, 0, sd[3].y); sg.addColorStop(0, U.rgba(U.mixc(SL.side, spill, (.7 * on + .3 * flash) * SL.mix), 1)); sg.addColorStop(1, SL.foot2);
        face(sd, sg);
        face([V(x0, hh, z0), V(x1, hh, z0), V(x1, hh, z1), V(x0, hh, z1)], U.rgba(U.mixc(SL.top, spill, (.8 * on + .3 * flash) * SL.mix), 1));
        // rim light on the top edge
        ctx.strokeStyle = U.rgba(U.mixc(SL.rim, spill, on * SL.mix), dk ? .5 : .35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(f[0].x, f[0].y); ctx.lineTo(f[1].x, f[1].y); ctx.stroke();
      } };
      drawSlabs(false);

      // an opaque back panel so monoliths behind the screen stay behind it
      if (on > 0) { const c11 = proj(bw / 2, bbY - bh / 2, bbZ); ctx.fillStyle = `rgba(4,4,22,${on})`; ctx.beginPath(); ctx.moveTo(c00.x, c00.y); ctx.lineTo(c10.x, c10.y); ctx.lineTo(c11.x, c11.y); ctx.lineTo(c01.x, c01.y); ctx.closePath(); ctx.fill(); }
      // glow behind the LEDs
      if (on > 0) {
        ctx.save(); ctx.globalCompositeOperation = dk ? 'lighter' : 'source-over'; ctx.globalAlpha = (dk ? .55 : .3) * on; ctx.filter = 'blur(18px)';
        U.mapImage(ctx, content, c00, c10, c01, dpr); ctx.restore(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // LEDs: particles in flight, then pixels (additive on navy; solid ink on paper, where light would vanish)
      ctx.globalCompositeOperation = dk ? 'lighter' : 'source-over';
      const cols = grid.c, rows = grid.r;
      const ux = { x: (c10.x - c00.x) / cols, y: (c10.y - c00.y) / cols }, uy = { x: (c01.x - c00.x) / rows, y: (c01.y - c00.y) / rows };
      const cell = Math.hypot(ux.x, ux.y);
      const ds = Math.max(1, cell * .62);
      // transition wave between spots: a diagonal band that flips the LEDs
      const trans = sp.a !== undefined ? Math.min(t - sp.a, (sp.b || 1e9) - t) : 9;
      const waveK = sp.a !== undefined ? seg(t, sp.a, sp.a + .45) : 1;
      const px = ptr.spx, py = ptr.spy;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const tx = d.x - cols / 2 + .5, ty = d.y - rows / 2 + .5;
        let X = c00.x + ux.x * (d.x + .5) + uy.x * (d.y + .5), Y = c00.y + ux.y * (d.x + .5) + uy.y * (d.y + .5);
        const k = seg(t, d.t0, d.t0 + d.dur);
        if (k < 1) {
          if (k <= 0) continue;
          const e = E.inOutCubic(k);
          const wx = tx / cols * bw, wy = bbY - ty / rows * bh;
          const mx = lerp(d.sx, wx, .5) + d.sw, my = Math.max(wy, d.sy) + 1.5, mz = lerp(d.sz, bbZ, .5) + 2;
          const q = (e2) => { const a = (1 - e2) * (1 - e2), b = 2 * (1 - e2) * e2, c = e2 * e2; return proj(a * d.sx + b * mx + c * wx, a * d.sy + b * my + c * wy, a * d.sz + b * mz + c * bbZ); };
          const p = q(e), p2 = q(Math.max(0, e - .05));
          ctx.strokeStyle = d.ph > .7 ? (dk ? `rgba(255,120,40,${.15 + .5 * e})` : `rgba(255,101,0,${.25 + .6 * e})`) : (dk ? `rgba(200,210,255,${.12 + .5 * e})` : `rgba(0,0,101,${.18 + .5 * e})`);
          ctx.lineWidth = Math.max(.5, ds * .45 * p.k); ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          continue;
        }
        const j = (d.y * cols + d.x) * 4;
        let r = img[j], gg = img[j + 1], b = img[j + 2];
        if (flash > .01) { r = lerp(r, 255, flash); gg = lerp(gg, 255, flash); b = lerp(b, 255, flash); }
        let size = ds;
        // flip wave on spot change
        if (waveK < 1) { const front = (d.x / cols + d.y / rows * .4) / 1.4; const w = Math.exp(-Math.pow((front - waveK) * 9, 2)); size *= 1 - .85 * w; r = lerp(r, 255, w * .6); gg = lerp(gg, 255, w * .6); b = lerp(b, 255, w * .6); }
        // pointer scatter
        if (idle > 0 && px > -1e3) { const dx = X - px, dy = Y - py, dd = Math.hypot(dx, dy), R = 90; if (dd < R) { const f = (1 - dd / R); X += dx / (dd + 1) * f * 26 * idle; Y += dy / (dd + 1) * f * 26 * idle; size *= 1 - .5 * f; } }
        if (sp.id === 2) { const l = r + gg + b; if (l < 330) { r = 0; gg = 0; b = 101; } else if (r > 200 && gg < 160) { r = 255; gg = 101; b = 0; } else { r = gg = b = 255; } } // the wordmark is crisp: each LED on or off
        if (r + gg + b < 30) { r = 16; gg = 16; b = 50; }
        if (!dk && X > -1e3) { /* on paper the panel behind is dark, so solid pixels read the same */ }
        ctx.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
        ctx.fillRect(X - size / 2, Y - size / 2, size, size);
      }
      ctx.globalCompositeOperation = 'source-over';
      // thin frame
      if (on > 0) { ctx.strokeStyle = dk ? `rgba(200,210,255,${.25 * on})` : `rgba(0,0,60,${.5 * on})`; ctx.lineWidth = dk ? 1 : 2; const c11 = proj(bw / 2, bbY - bh / 2, bbZ); ctx.beginPath(); ctx.moveTo(c00.x, c00.y); ctx.lineTo(c10.x, c10.y); ctx.lineTo(c11.x, c11.y); ctx.lineTo(c01.x, c01.y); ctx.closePath(); ctx.stroke(); }
      drawSlabs(true);
      // low haze over the field
      const hzY = proj(0, 0, 0).y;
      const hc = dk ? [20, 20, 90] : [255, 255, 255]; const mg = ctx.createLinearGradient(0, hzY - H * .12, 0, hzY + H * .1); mg.addColorStop(0, U.rgba(hc, 0)); mg.addColorStop(.6, U.rgba(hc, dk ? .28 : .45)); mg.addColorStop(1, U.rgba(hc, 0));
      ctx.fillStyle = mg; ctx.fillRect(0, hzY - H * .12, W, H * .22);
    }
  };
})());
