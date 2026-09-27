/* 06 BROADCAST: advertising. Light streams across a field of monoliths and assembles into a billboard. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU, rng } = U;
  let content, cctx, dots = [], slabs = [], grid = { c: 0, r: 0 }, lastPortrait = null;

  function build(portrait) {
    const c = portrait ? 40 : 90, r = portrait ? 52 : 38;
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
        g.font = '700 21px "Space Grotesk", sans-serif';
        const txt = 'We Dig Creativity  ·  '; const tw = g.measureText(txt).width;
        const off = (t * 18) % tw;
        for (let k = -1; k < 3; k++) g.fillText(txt, k * tw - off, 21);
        g.fillStyle = '#ff6500'; g.fillRect(0, 27, W, 2);
        g.fillStyle = '#fff';
        for (let k = -1; k < 3; k++) g.fillText(txt, k * tw - ((t * 11 + tw / 2) % tw), 48);
      }
    }
    return sp;
  }

  return {
    name: 'Broadcast', service: 'Advertising',
    pitch: 'Across a quiet field of monoliths, thousands of points of light stream in from the dark and lock into a single floating billboard that lights the whole landscape. It plays short spots, an eclipse, a wave, the wordmark, and every change repaints the monoliths in its colour.',
    tech: 'Canvas 2D with a perspective camera. Every LED is a particle with its own bezier flight and arrival time; once locked, it samples a tiny offscreen canvas where the spots are painted. The glow is that canvas stretched and blended, the spill on the monoliths is its average colour, and the wet floor is its reflection.',
    ground: 'Dark in both page themes; it is night so the light can travel.',
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

      // sky and haze
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#01010c'); g.addColorStop(.55, '#05052e'); g.addColorStop(.72, '#0c0c52'); g.addColorStop(1, '#030318');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

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
      hg.addColorStop(0, U.rgba(U.mixc([40, 40, 140], spill, .5 * on), .35 + .25 * on)); hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);

      // billboard corners
      const bw = grid.w, bh = grid.h;
      const c00 = proj(-bw / 2, bbY + bh / 2, bbZ), c10 = proj(bw / 2, bbY + bh / 2, bbZ), c01 = proj(-bw / 2, bbY - bh / 2, bbZ);
      // floor reflection of the billboard
      if (on > 0) {
        const f00 = proj(-bw / 2, -(bbY + bh / 2) * .9, bbZ), f10 = proj(bw / 2, -(bbY + bh / 2) * .9, bbZ), f01 = proj(-bw / 2, -(bbY - bh / 2) * .9, bbZ);
        ctx.save(); ctx.globalAlpha = .22 * on; ctx.filter = 'blur(6px)'; ctx.imageSmoothingEnabled = true;
        U.mapImage(ctx, content, f00, f10, f01, dpr); ctx.restore(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const fg = ctx.createLinearGradient(0, f00.y, 0, H); fg.addColorStop(0, 'rgba(3,3,24,.2)'); fg.addColorStop(1, 'rgba(3,3,24,.9)'); ctx.fillStyle = fg; ctx.fillRect(0, f01.y, W, H - f01.y);
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
        const lit = U.mixc([10, 10, 40], spill, .35 * on + .25 * flash);
        // front face (facing camera, z0) with a vertical light falloff
        const f = [V(x0, hh, z0), V(x1, hh, z0), V(x1, 0, z0), V(x0, 0, z0)];
        const lg = ctx.createLinearGradient(0, f[0].y, 0, f[3].y); lg.addColorStop(0, U.rgba(lit, 1)); lg.addColorStop(1, 'rgb(4,4,20)');
        face(f, lg);
        // side face toward the centre catches the billboard
        const sideX = s.x > 0 ? x0 : x1;
        const sd = [V(sideX, hh, z0), V(sideX, hh, z1), V(sideX, 0, z1), V(sideX, 0, z0)];
        const sg = ctx.createLinearGradient(0, sd[0].y, 0, sd[3].y); sg.addColorStop(0, U.rgba(U.mixc([20, 20, 70], spill, .7 * on + .3 * flash), 1)); sg.addColorStop(1, 'rgb(6,6,26)');
        face(sd, sg);
        face([V(x0, hh, z0), V(x1, hh, z0), V(x1, hh, z1), V(x0, hh, z1)], U.rgba(U.mixc([30, 30, 90], spill, .8 * on + .3 * flash), 1));
        // rim light on the top edge
        ctx.strokeStyle = U.rgba(U.mixc([120, 120, 255], spill, on), .5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(f[0].x, f[0].y); ctx.lineTo(f[1].x, f[1].y); ctx.stroke();
      } };
      drawSlabs(false);

      // an opaque back panel so monoliths behind the screen stay behind it
      if (on > 0) { const c11 = proj(bw / 2, bbY - bh / 2, bbZ); ctx.fillStyle = `rgba(4,4,22,${on})`; ctx.beginPath(); ctx.moveTo(c00.x, c00.y); ctx.lineTo(c10.x, c10.y); ctx.lineTo(c11.x, c11.y); ctx.lineTo(c01.x, c01.y); ctx.closePath(); ctx.fill(); }
      // glow behind the LEDs
      if (on > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55 * on; ctx.filter = 'blur(18px)';
        U.mapImage(ctx, content, c00, c10, c01, dpr); ctx.restore(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // LEDs: particles in flight, then pixels
      ctx.globalCompositeOperation = 'lighter';
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
          ctx.strokeStyle = d.ph > .7 ? `rgba(255,120,40,${.15 + .5 * e})` : `rgba(200,210,255,${.12 + .5 * e})`;
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
        if (r + gg + b < 30) { r = 16; gg = 16; b = 50; }
        ctx.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
        ctx.fillRect(X - size / 2, Y - size / 2, size, size);
      }
      ctx.globalCompositeOperation = 'source-over';
      // thin frame
      if (on > 0) { ctx.strokeStyle = `rgba(200,210,255,${.25 * on})`; ctx.lineWidth = 1; const c11 = proj(bw / 2, bbY - bh / 2, bbZ); ctx.beginPath(); ctx.moveTo(c00.x, c00.y); ctx.lineTo(c10.x, c10.y); ctx.lineTo(c11.x, c11.y); ctx.lineTo(c01.x, c01.y); ctx.closePath(); ctx.stroke(); }
      drawSlabs(true);
      // low haze over the field
      const hzY = proj(0, 0, 0).y;
      const mg = ctx.createLinearGradient(0, hzY - H * .12, 0, hzY + H * .1); mg.addColorStop(0, 'rgba(20,20,90,0)'); mg.addColorStop(.6, `rgba(20,20,90,${.28})`); mg.addColorStop(1, 'rgba(5,5,30,0)');
      ctx.fillStyle = mg; ctx.fillRect(0, hzY - H * .12, W, H * .22);
    }
  };
})());
