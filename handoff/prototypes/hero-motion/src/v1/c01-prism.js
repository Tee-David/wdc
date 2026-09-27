/* 01 PRISM: brand identity. One white beam, one glass prism, a palette. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, hex, rgba, mixc, TAU, rng } = U;
  const PAL = ['#FF6500', '#FFB27E', '#FFFFFF', '#A3A3FF', '#4B4BFF'];
  const PALc = PAL.map(hex);
  const NK = 42;             // wavelengths traced
  const DEG = Math.PI / 180;
  let motes = [], glowW, glowO;

  function spectral(k) { // k: 0 red .. 1 violet, returned as rgb
    const h = lerp(4, 262, k) / 360, s = 1, l = .56;
    const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function tri(cx, cy, R, th) { const p = []; for (let i = 0; i < 3; i++) { const a = th - Math.PI / 2 + i * TAU / 3; p.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } return p; }
  function hit(ox, oy, dx, dy, a, b) {
    const ex = b[0] - a[0], ey = b[1] - a[1], den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) return -1;
    const wx = a[0] - ox, wy = a[1] - oy, t = (wx * ey - wy * ex) / den, s = (wx * dy - wy * dx) / den;
    return (t > 1e-5 && s >= 0 && s <= 1) ? t : -1;
  }
  function onorm(a, b, c) { let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny); nx /= l; ny /= l; const mx = (a[0] + b[0]) / 2 - c[0], my = (a[1] + b[1]) / 2 - c[1]; if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; } return [nx, ny]; }
  function refract(dx, dy, nx, ny, eta) { const ci = -(nx * dx + ny * dy), k = 1 - eta * eta * (1 - ci * ci); if (k < 0) return null; const f = eta * ci - Math.sqrt(k); return [eta * dx + f * nx, eta * dy + f * ny]; }
  function trace(P, C, ox, oy, dx, dy, n) {
    let bt = 1e9, bi = -1;
    for (let i = 0; i < 3; i++) { const t = hit(ox, oy, dx, dy, P[i], P[(i + 1) % 3]); if (t > 0 && t < bt) { bt = t; bi = i; } }
    if (bi < 0) return null;
    const p1 = [ox + dx * bt, oy + dy * bt]; let N = onorm(P[bi], P[(bi + 1) % 3], C);
    let d = refract(dx, dy, N[0], N[1], 1 / n); if (!d) return null;
    let from = p1, edge = bi, inner = [p1];
    for (let bounce = 0; bounce < 2; bounce++) {
      let t2 = 1e9, e2 = -1;
      for (let i = 0; i < 3; i++) { if (i === edge) continue; const t = hit(from[0], from[1], d[0], d[1], P[i], P[(i + 1) % 3]); if (t > 0 && t < t2) { t2 = t; e2 = i; } }
      if (e2 < 0) return null;
      const p2 = [from[0] + d[0] * t2, from[1] + d[1] * t2]; inner.push(p2);
      const N2 = onorm(P[e2], P[(e2 + 1) % 3], C);
      const out = refract(d[0], d[1], -N2[0], -N2[1], n);
      if (out) return { p1, p2, d: out, inner, reflect: [dx - 2 * (dx * N[0] + dy * N[1]) * N[0], dy - 2 * (dx * N[0] + dy * N[1]) * N[1]] };
      const dd = d[0] * N2[0] + d[1] * N2[1]; d = [d[0] - 2 * dd * N2[0], d[1] - 2 * dd * N2[1]]; from = p2; edge = e2;
    }
    return null;
  }

  function turnAt(t) { // cumulative prism rotation (radians)
    let th = 120 * DEG * E.inOutQuint(seg(t, 6.3, 8.7));
    if (t > 20) { const k = Math.floor((t - 20) / 13); const local = t - 20 - k * 13; th += 120 * DEG * (k + E.inOutQuint(seg(local, 0, 2.6))); }
    return th;
  }
  function chipsAt(t) {
    if (t < 8.4) return 0;
    if (t < 20) return 1;
    const local = (t - 20) % 13; return 1 - ss(-0.4, 0, local - 0) * (1 - ss(2.2, 3.0, local));
  }

  return {
    name: 'Prism', service: 'Brand identity',
    pitch: 'One beam of white light meets a glass prism and comes out the other side as a palette: a continuous spectrum that quantises, band by band, into five brand colours. Identity as the moment raw light becomes a system you can specify.',
    tech: 'Canvas 2D with real Snell refraction traced per wavelength through a rotating triangle, additive light, volumetric dust that only glows inside the beams, chromatic fringing on the white beam. The 120-degree turn is the climax because an equilateral prism lands back where it started.',
    ground: 'Dark in both page themes: it is a hero band and light needs darkness to read.',
    duration: 10.5, stillT: 11.2, kind: '2d',
    beats: [['0.0 s', 'Dust hangs in the dark; a point of light flickers at the edge of frame.'], ['0.75 s', 'It fires: a hairline beam crosses the dark.'], ['1.2 s', 'The beam finds the prism and the glass is drawn by its own glint.'], ['2.3 s', 'The light fans into a full spectrum.'], ['4.4 s', 'The spectrum snaps into five brand bands.'], ['6.3 s', 'The prism turns 120 degrees; the bands sweep, split and return.'], ['8.6 s', 'Swatches land along the beams with their hex values.'], ['10.5 s', 'Idle: the pointer turns the glass and tilts the beam.']],
    init() {
      const r = rng(7); motes = [];
      for (let i = 0; i < 260; i++) motes.push({ x: r() * 4 - 2, y: r() * 2.4 - 1.2, z: r(), s: r() * 1 + .3, ph: r() * TAU, sp: .02 + r() * .05 });
      glowW = U.glowSprite(64, [255, 255, 255], 2.4); glowO = U.glowSprite(64, [255, 140, 60], 2);
    },
    reset() {},
    frame(t, dt, env) {
      const { ctx, W, H, dpr, ptr, portrait } = env;
      const S = portrait ? Math.min(H / 3.3, W / 1.75) : Math.min(W / 3.5, H / 1.85);
      const cx = W * (portrait ? .5 : .5), cy = H * (portrait ? .47 : .5);
      const map = portrait ? [0, S, -S, 0, cx + S * .05, cy] : [S, 0, 0, S, cx, cy];
      const toS = (u, v) => [map[0] * u + map[2] * v + map[4], map[1] * u + map[3] * v + map[5]];
      const px = S;

      // ground
      ctx.globalCompositeOperation = 'source-over';
      const [gx, gy] = toS(-.2, -.05);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * .8);
      g.addColorStop(0, '#0c0c4e'); g.addColorStop(.45, '#040430'); g.addColorStop(1, '#01010f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      const idle = ss(9.5, 11.5, t);
      const C = portrait ? [-.35, -.04] : [-.42, -.02];
      const R = .36;
      const th = turnAt(t) + (ptr.x * 7 * DEG) * idle + Math.sin(t * .31) * 1.2 * DEG * idle;
      const P = tri(C[0], C[1], R, th);
      const tilt = (-18.6 + ptr.y * -3.5 * idle + Math.sin(t * .23) * .6 * idle) * DEG;
      const dx = Math.cos(tilt), dy = Math.sin(tilt);
      const P0 = tri(C[0], C[1], R, 0), M = [(P0[2][0] + P0[0][0]) / 2, (P0[2][1] + P0[0][1]) / 2];
      const Sx = M[0] - dx * 4, Sy = M[1] - dy * 4;
      const nx = -dy, ny = dx; // beam width axis
      const bw = .028;

      const spread = lerp(.02, 1, E.outExpo(seg(t, 2.25, 4.4)));
      const q = E.inOutCubic(seg(t, 4.4, 6.1));
      const reach = E.outCubic(seg(t, 2.05, 3.6)) * 4.2;
      const sEdge = Math.max(0, ((-(portrait ? cy : cx) / S) - Sx) / dx + .06);
      const headT = E.inOutCubic(seg(t, .75, 1.95));
      const inLen = headT > 0 ? lerp(sEdge, 4, headT) : 0;
      const prismIn = seg(t, 1.55, 2.5);
      const turning = t > 6.3 && t < 8.7 ? Math.sin(Math.PI * seg(t, 6.3, 8.7)) : 0;

      ctx.setTransform(dpr * map[0], dpr * map[1], dpr * map[2], dpr * map[3], dpr * map[4], dpr * map[5]);

      // trace
      const rays = [];
      if (t > 1.9) {
        for (let i = 0; i < NK; i++) {
          const k = (i + .5) / NK, band = Math.min(4, Math.floor(k * 5)), kc = (band + .5) / 5;
          const ke = lerp(k, kc, q);
          const n = 1.5 + (ke - .5) * .27 * spread;
          const a = trace(P, C, Sx - nx * bw, Sy - ny * bw, dx, dy, n);
          const b = trace(P, C, Sx + nx * bw, Sy + ny * bw, dx, dy, n);
          const col = mixc(spectral(k), PALc[band], q);
          rays.push({ k, band, a, b, col, n });
        }
      }

      // volumetric dust: brightness from proximity to beams
      const bandRays = [];
      for (let bnd = 0; bnd < 5; bnd++) { const r = rays[Math.floor((bnd + .5) / 5 * NK)]; if (r && r.a) bandRays.push(r); }
      ctx.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        const mx = m.x + Math.sin(t * m.sp * 6 + m.ph) * .03 + t * m.sp * .15 % 4, my = m.y + Math.cos(t * m.sp * 5 + m.ph) * .03;
        const wx = ((mx + 2) % 4 + 4) % 4 - 2;
        let lit = 0, col = [255, 255, 255];
        // incoming beam
        const rx = wx - Sx, ry = my - Sy, along = rx * dx + ry * dy, perp = Math.abs(rx * nx + ry * ny);
        if (along > 0 && along < inLen) lit = Math.max(lit, Math.exp(-perp * perp / (.0025)) * (rays.length ? (along < 4 ? 1 : 0) : 1));
        for (const r of bandRays) {
          const o = r.a.p2, d = r.a.d, ex = wx - o[0], ey = my - o[1], al = ex * d[0] + ey * d[1];
          if (al > 0 && al < reach) { const pp = Math.abs(ex * -d[1] + ey * d[0]); const l = Math.exp(-pp * pp / .004) * .9; if (l > lit) { lit = l; col = r.col; } }
        }
        const base = .09 * ss(0, 1.4, t);
        const a = base + lit * .9;
        if (a < .02) continue;
        const s = (m.s * (.6 + m.z)) * .8 / px * (lit > .2 ? 1.3 : 1);
        ctx.fillStyle = rgba(col, a * (.35 + m.z * .65));
        ctx.beginPath(); ctx.arc(wx, my, s, 0, TAU); ctx.fill();
      }

      // prism body
      if (prismIn > 0) {
        ctx.globalCompositeOperation = 'source-over';
        const gp = ctx.createLinearGradient(P[0][0], P[0][1], (P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2);
        gp.addColorStop(0, `rgba(200,208,255,${.16 * prismIn})`); gp.addColorStop(.55, `rgba(110,110,230,${.07 * prismIn})`); gp.addColorStop(1, `rgba(255,255,255,${.14 * prismIn})`);
        // back face and side edges give the glass a body, not a logo outline
        const ox = .085, oy = -.07, B = P.map(p => [C[0] + (p[0] - C[0]) * .94 + ox, C[1] + (p[1] - C[1]) * .94 + oy]);
        ctx.fillStyle = `rgba(150,160,255,${.05 * prismIn})`;
        for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.lineTo(B[j][0], B[j][1]); ctx.lineTo(B[i][0], B[i][1]); ctx.closePath(); ctx.fill(); }
        ctx.lineWidth = 1 / px; ctx.strokeStyle = `rgba(200,210,255,${.16 * prismIn})`;
        ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(B[i][0], B[i][1]); } ctx.moveTo(B[0][0], B[0][1]); ctx.lineTo(B[1][0], B[1][1]); ctx.lineTo(B[2][0], B[2][1]); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = gp; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.lineTo(P[2][0], P[2][1]); ctx.closePath(); ctx.fill();
        // a soft specular sheen across the face
        const sh = ctx.createLinearGradient(P[2][0], P[2][1], P[1][0], P[0][1]);
        const sp = (Math.sin(t * .4) * .5 + .5) * .5 + .25;
        sh.addColorStop(Math.max(0, sp - .12), 'rgba(255,255,255,0)'); sh.addColorStop(sp, `rgba(255,255,255,${.1 * prismIn})`); sh.addColorStop(Math.min(1, sp + .12), 'rgba(255,255,255,0)');
        ctx.fillStyle = sh; ctx.fill();
        // edges draw on from the entry point
        const per = [P[2], P[0], P[1], P[2]]; const Lp = R * Math.sqrt(3) * 3;
        const drawn = E.inOutCubic(seg(t, 1.55, 2.6));
        ctx.lineWidth = 1.2 / px; ctx.lineJoin = 'round';
        ctx.setLineDash([Lp * drawn, Lp]); ctx.lineDashOffset = -Lp * .5 * (1 - drawn);
        ctx.strokeStyle = `rgba(230,235,255,${.55 * prismIn})`;
        ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.lineTo(P[2][0], P[2][1]); ctx.closePath(); ctx.stroke();
        ctx.setLineDash([]);
        // inner bevel
        const Pi = tri(C[0], C[1], R * .9, th);
        ctx.strokeStyle = `rgba(255,255,255,${.07 * prismIn})`; ctx.beginPath(); ctx.moveTo(Pi[0][0], Pi[0][1]); ctx.lineTo(Pi[1][0], Pi[1][1]); ctx.lineTo(Pi[2][0], Pi[2][1]); ctx.closePath(); ctx.stroke();
        // apex glints
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) { const s = (.05 + .02 * Math.sin(t * 1.3 + i * 2)) * prismIn; ctx.globalAlpha = .45 * prismIn; ctx.drawImage(glowW, P[i][0] - s, P[i][1] - s, s * 2, s * 2); }
        ctx.globalAlpha = 1;
      }

      ctx.globalCompositeOperation = 'lighter';
      // incoming beam
      {
        const L = rays.length && rays[0].a ? Math.hypot(rays[NK >> 1].a.p1[0] - Sx, rays[NK >> 1].a.p1[1] - Sy) : 4;
        const len = Math.min(inLen, L + .002);
        const ex = Sx + dx * len, ey = Sy + dy * len;
        const layers = [[.09, .05], [.028, .18], [.009, .55], [.0028, 1]];
        for (const [w, a] of layers) { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(Sx, Sy); ctx.lineTo(ex, ey); ctx.stroke(); }
        // chromatic fringe
        ctx.lineWidth = .004; const off = .006;
        ctx.strokeStyle = 'rgba(255,40,40,.35)'; ctx.beginPath(); ctx.moveTo(Sx - nx * off, Sy - ny * off); ctx.lineTo(ex - nx * off, ey - ny * off); ctx.stroke();
        ctx.strokeStyle = 'rgba(40,80,255,.45)'; ctx.beginPath(); ctx.moveTo(Sx + nx * off, Sy + ny * off); ctx.lineTo(ex + nx * off, ey + ny * off); ctx.stroke();
        if (headT < 1) { const s = .09; ctx.drawImage(glowW, ex - s, ey - s, s * 2, s * 2); }
        // flash at the entry
        const f = Math.exp(-Math.pow((t - 1.98) / .18, 2)) * 1.4 + (rays.length ? .35 : 0) + turning * .5;
        if (t > 1.7) { const s = .1 + .12 * f; ctx.globalAlpha = Math.min(1, f); ctx.drawImage(glowW, ex - s, ey - s, s * 2, s * 2); ctx.globalAlpha = 1; }
      }

      // anticipation: a pin of light at the frame edge before the beam leaves it
      if (t < 1.3) { const k = ss(.1, .5, t) * (1 - ss(.9, 1.3, t)) * (.85 + .15 * Math.sin(t * 18)); const [ax, ay] = [Sx + dx * sEdge, Sy + dy * sEdge]; const s = .06 + .07 * k; ctx.globalAlpha = k; ctx.drawImage(glowW, ax - s, ay - s, s * 2, s * 2); ctx.globalAlpha = 1; }
      // fans
      if (rays.length) {
        const alphaK = lerp(.16, .075, q);
        for (const r of rays) {
          if (!r.a || !r.b) continue;
          // inside the glass
          ctx.fillStyle = rgba(r.col, .05);
          ctx.beginPath(); ctx.moveTo(r.a.p1[0], r.a.p1[1]); ctx.lineTo(r.a.p2[0], r.a.p2[1]); ctx.lineTo(r.b.p2[0], r.b.p2[1]); ctx.lineTo(r.b.p1[0], r.b.p1[1]); ctx.fill();
          const a0 = r.a.p2, b0 = r.b.p2, L = reach;
          const a1 = [a0[0] + r.a.d[0] * L, a0[1] + r.a.d[1] * L], b1 = [b0[0] + r.b.d[0] * L * 1.04, b0[1] + r.b.d[1] * L * 1.04];
          const gr = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
          gr.addColorStop(0, rgba(r.col, alphaK * 1.6)); gr.addColorStop(.35, rgba(r.col, alphaK)); gr.addColorStop(1, rgba(r.col, alphaK * .25));
          ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b0[0], b0[1]); ctx.closePath(); ctx.fill();
        }
        // a faint reflection off the first face (Fresnel)
        const mid = rays[NK >> 1]; if (mid && mid.a) { const p = mid.a.p1, d = mid.a.reflect; const gr = ctx.createLinearGradient(p[0], p[1], p[0] + d[0] * .7, p[1] + d[1] * .7); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = gr; ctx.lineWidth = .006; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + d[0] * .7, p[1] + d[1] * .7); ctx.stroke(); }
        // climax bloom
        if (turning > 0) { const s = .6 + turning * .5; ctx.globalAlpha = turning * .35; ctx.drawImage(glowO, C[0] - s, C[1] - s, s * 2, s * 2); ctx.globalAlpha = 1; }
      }
      ctx.globalCompositeOperation = 'source-over';

      // swatches along the bands
      const chips = chipsAt(t);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (chips > 0 && rays.length) {
        const D = portrait ? 1.05 : 1.15;
        const fs = Math.max(11, Math.min(14, S * .036));
        ctx.font = `500 ${fs}px "Space Grotesk", sans-serif`; ctx.textBaseline = 'middle';
        for (let bnd = 0; bnd < 5; bnd++) {
          const r = rays[Math.floor((bnd + .5) / 5 * NK)]; if (!r || !r.a || !r.b) continue;
          const o = [(r.a.p2[0] + r.b.p2[0]) / 2, (r.a.p2[1] + r.b.p2[1]) / 2], d = r.a.d;
          const dd = D + bnd * (portrait ? .17 : .075); const [sx, sy] = toS(o[0] + d[0] * dd, o[1] + d[1] * dd);
          const tt = t < 20 ? seg(t, 8.6 + bnd * .14, 9.4 + bnd * .14) : chips;
          const e = t < 20 ? E.outBack(tt, 2.2) : E.outCubic(chips);
          if (e <= 0) continue;
          const sz = Math.max(18, S * .075) * e;
          ctx.fillStyle = PAL[bnd];
          ctx.save(); ctx.translate(sx, sy); ctx.rotate((1 - e) * .5);
          ctx.shadowColor = rgba(PALc[bnd], .55); ctx.shadowBlur = 24 * e;
          ctx.beginPath(); U.roundRect(ctx, -sz / 2, -sz / 2, sz, sz, sz * .18); ctx.fill(); ctx.restore();
          const la = ss(.4, 1, tt);
          if (la > 0) {
            ctx.fillStyle = `rgba(240,240,255,${la * .92})`; ctx.shadowColor = 'rgba(0,0,30,.9)'; ctx.shadowBlur = 8;
            const label = '#' + PAL[bnd].slice(1, 1 + Math.round(6 * la));
            ctx.fillText(label, sx + sz / 2 + 10, sy); ctx.shadowBlur = 0;
          }
        }
      }
    }
  };
})());
