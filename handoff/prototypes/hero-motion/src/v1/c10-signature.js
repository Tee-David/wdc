/* 10 SIGNATURE: brand identity as construction. A monogram is drawn from geometry, gains weight and depth, and signs off. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU } = U;
  let glyphs = [];
  const GW = 3.3;
  function arc(cx, cy, r, a0, a1, n) { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
  function lineP(a, b, n) { const o = []; for (let i = 0; i <= n; i++) o.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); return o; }
  function build() {
    // y up, cap height 1, baseline 0
    const W = [[0, 1], [.22, 0], [.5, .62], [.78, 0], [1, 1]];
    const w = []; for (let i = 0; i < W.length - 1; i++) w.push(...lineP(W[i], W[i + 1], 16).slice(i ? 1 : 0));
    const d = [...lineP([1.3, 0], [1.3, 1], 16), ...lineP([1.3, 1], [1.62, 1], 6).slice(1), ...arc(1.62, .5, .5, Math.PI / 2, -Math.PI / 2, 40).slice(1), ...lineP([1.62, 0], [1.3, 0], 6).slice(1)];
    const c = arc(2.8, .5, .5, Math.PI * .25, Math.PI * 1.75, 60);
    glyphs = [w, d, c].map(pts => pts.map(([x, y]) => [x - GW / 2, y - .5]));
    glyphs.forEach(g => { let L = 0; g.len = [0]; for (let i = 1; i < g.length; i++) { L += Math.hypot(g[i][0] - g[i - 1][0], g[i][1] - g[i - 1][1]); g.len.push(L); } g.L = L; });
  }
  function partial(g, k) { // points up to fraction k of its length
    const target = g.L * k, out = [g[0]];
    for (let i = 1; i < g.length; i++) { if (g.len[i] <= target) out.push(g[i]); else { const f = (target - g.len[i - 1]) / (g.len[i] - g.len[i - 1]); out.push([lerp(g[i - 1][0], g[i][0], f), lerp(g[i - 1][1], g[i][1], f)]); break; } }
    return out;
  }

  return {
    name: 'Signature', service: 'Brand identity and naming',
    pitch: 'A single orange point draws the construction of a monogram, circles, guides and angles, and a pen traces WDC through it, swells to weight, then pulls out into a deep extruded echo as the camera swings round. It settles and signs off with the wordmark and what "dig" really means.',
    tech: 'Canvas 2D vector drawing: glyphs are sampled polylines traced by arc length, construction lines draw with dash progress, and the extrusion is fourteen projected copies coloured from white through orange into navy. Type is live Space Grotesk and Outfit, revealed through masks.',
    ground: 'Dark in both page themes; a navy drafting board.',
    duration: 10, stillT: 10.4, kind: '2d',
    beats: [['0.0 s', 'One orange point pulses, then fires the baseline and cap line across.'], ['0.6 s', 'Construction: bounds, circles, angles, measurements.'], ['2.4 s', 'A pen of light traces W, D and C through the geometry.'], ['3.6 s', 'The strokes swell to weight; the construction recedes.'], ['4.6 s', 'The camera swings; the monogram pulls into a deep echo, white to orange to navy.'], ['7.4 s', 'The echo collapses into the face with a snap.'], ['8.2 s', 'The wordmark rises in, then its definition: dig, to love.'], ['10.0 s', 'Idle: the pointer tilts the mark (the echo opens with the tilt) and moves a measuring crosshair.']],
    init() { build(); },
    reset() {},
    frame(t, dt, env) {
      const { ctx, W, H, ptr, portrait } = env;
      const g = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .5, Math.max(W, H) * .8);
      g.addColorStop(0, '#0b0b4c'); g.addColorStop(.6, '#030328'); g.addColorStop(1, '#010110');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const idle = ss(9.6, 11, t);
      const settle = E.inOutQuint(seg(t, 7.6, 9.0));
      const S0 = portrait ? W * .78 / GW : Math.min(W * .5 / GW, H * .36);
      const S = S0 * lerp(1, .62, settle);
      const cx = W / 2, cy = lerp(H * .5, H * (portrait ? .36 : .38), settle);
      // fine dot grid
      const gridA = ss(.3, 1.4, t) * .5;
      if (gridA > 0) { ctx.fillStyle = `rgba(160,170,255,${.22 * gridA})`; const st = Math.max(18, S * .125); for (let y = (cy % st); y < H; y += st) for (let x = (cx % st); x < W; x += st) ctx.fillRect(x - .6, y - .6, 1.2, 1.2); }

      // camera for the depth move
      const swing = seg(t, 4.6, 7.6);
      let yaw = Math.sin(E.inOutCubic(swing) * Math.PI) * .95 - E.inOutCubic(seg(t, 5.8, 7.4)) * .35 * (1 - settle) + ptr.x * .45 * idle;
      let pitch = Math.sin(E.inOutCubic(swing) * Math.PI) * -.25 + ptr.y * -.3 * idle;
      const depth = ss(4.6, 5.8, t) * (1 - E.outBack(seg(t, 7.4, 8.1), 2.2)) + clamp(Math.hypot(ptr.x, ptr.y) * .45) * idle;
      const proj = U.camera({ yaw, pitch, dist: 6, scale: S, cx, cy });
      const P = (x, y, z) => proj(x, y, z, {});
      const u = S / 1; // px per unit (front plane)
      const conA = ss(.5, 1, t) * lerp(1, .28, ss(3.6, 4.6, t)) * (1 - ss(4.6, 5.4, t) * .7) * (1 - settle * .6);

      // construction lines
      ctx.lineWidth = 1;
      const X = x => cx + x * u, Y = y => cy - y * u;
      const L0 = E.outExpo(seg(t, .45, 1.3));
      if (conA > 0 && t < 7.8 || idle > 0) {
        const a = t < 7.8 ? conA : .25 * idle;
        ctx.strokeStyle = `rgba(255,120,40,${.8 * a})`;
        ctx.beginPath();
        for (const yy of [0, 1, .5]) { const hw = W * .5 * L0; ctx.moveTo(cx - hw, Y(yy - .5)); ctx.lineTo(cx + hw, Y(yy - .5)); }
        ctx.stroke();
        ctx.setLineDash([3, 4]); ctx.strokeStyle = `rgba(190,200,255,${.55 * a})`; ctx.beginPath();
        const bounds = [0, 1, 1.3, 2.12, 2.3, 3.3];
        bounds.forEach((bx, i) => { const k = E.outCubic(seg(t, .7 + i * .08, 1.3 + i * .08)); if (k <= 0) return; const x = X(bx - GW / 2); ctx.moveTo(x, Y(.5) - u * .3); ctx.lineTo(x, Y(.5) - u * .3 + (u * 1.6) * k); });
        ctx.stroke(); ctx.setLineDash([]);
        // circles
        const circ = [[1.62, .5, .5, 1.1], [2.8, .5, .5, 1.25], [2.8, .5, .25, 1.45], [.5, .62, .12, 1.6]];
        ctx.strokeStyle = `rgba(255,140,70,${.7 * a})`;
        for (const [x, y, r, t0] of circ) { const k = E.inOutCubic(seg(t, t0, t0 + .9)); if (k <= 0) continue; ctx.beginPath(); ctx.arc(X(x - GW / 2), Y(y - .5), r * u, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); }
        // W diagonals extended
        const kd = E.inOutCubic(seg(t, 1.4, 2.2));
        if (kd > 0) { ctx.strokeStyle = `rgba(190,200,255,${.4 * a})`; ctx.beginPath(); for (const [p0, p1] of [[[0, 1], [.22, 0]], [[.22, 0], [.5, .62]], [[.5, .62], [.78, 0]], [[.78, 0], [1, 1]]]) { const dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const a0 = [p0[0] - dx * .4, p0[1] - dy * .4], a1 = [p0[0] + dx * (1.4 * kd), p0[1] + dy * (1.4 * kd)]; ctx.moveTo(X(a0[0] - GW / 2), Y(a0[1] - .5)); ctx.lineTo(X(a1[0] - GW / 2), Y(a1[1] - .5)); } ctx.stroke(); }
        // labels
        const la = ss(1.8, 2.3, t) * a;
        if (la > 0) { ctx.font = `500 ${Math.max(10, Math.min(12, u * .07))}px "Space Grotesk", sans-serif`; ctx.fillStyle = `rgba(255,150,90,${la})`; ctx.fillText('cap 1.00', X(-GW / 2) - 2, Y(.5) - 8); ctx.fillText('r .50', X(2.8 - GW / 2) + u * .52, Y(0) - 4); ctx.fillText('68.6°', X(.22 - GW / 2) + 6, Y(-.5) - 8); ctx.fillText('base 0', X(-GW / 2) - 2, Y(-.5) + 16); }
      }
      // origin point
      if (t < 1.6) { const k = Math.sin(Math.PI * seg(t, 0, .5)) * (t < .5 ? 1 : 0) + ss(.4, .5, t) * (1 - ss(1.1, 1.6, t)); ctx.fillStyle = '#ff6500'; ctx.beginPath(); ctx.arc(cx, cy, 3 + 5 * Math.sin(Math.PI * seg(t, 0, .45)), 0, TAU); ctx.globalAlpha = clamp(k + .2); ctx.fill(); ctx.globalAlpha = 1; }

      // the monogram
      const trace = seg(t, 2.4, 3.7);
      const weight = lerp(u * .022, u * .15, E.inOutCubic(seg(t, 3.6, 4.6)));
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const N = 14;
      const drawGlyphs = (z, col, lw, k) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        glyphs.forEach((gph, gi) => { const kk = clamp(k * 1.25 - gi * .12); if (kk <= 0) return; const pts = kk >= 1 ? gph : partial(gph, kk); ctx.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1], z); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke(); });
      };
      if (depth > .002) {
        for (let i = N; i >= 1; i--) {
          const f = i / N; const z = f * depth * 1.1;
          const c = f < .45 ? U.mixc([255, 255, 255], [255, 101, 0], f / .45) : U.mixc([255, 101, 0], [20, 20, 110], (f - .45) / .55);
          drawGlyphs(z, U.rgba(c, clamp(1 - f * .6)), weight * (1 - f * .15), 1);
        }
      }
      if (trace > 0) {
        drawGlyphs(0, '#ffffff', weight, E.inOutSine(trace));
        // pen head
        if (trace < 1) { const k = E.inOutSine(trace); for (let gi = 0; gi < 3; gi++) { const kk = clamp(k * 1.25 - gi * .12); if (kk <= 0 || kk >= 1) continue; const pts = partial(glyphs[gi], kk), p = pts[pts.length - 1], q = P(p[0], p[1], 0); ctx.globalCompositeOperation = 'lighter'; const rg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 22); rg.addColorStop(0, 'rgba(255,220,190,.95)'); rg.addColorStop(.3, 'rgba(255,110,20,.5)'); rg.addColorStop(1, 'rgba(255,90,0,0)'); ctx.fillStyle = rg; ctx.fillRect(q.x - 22, q.y - 22, 44, 44); ctx.globalCompositeOperation = 'source-over'; } }
      }
      // wordmark and definition
      if (t > 8.1) {
        const fs = portrait ? Math.min(W * .1, 44) : Math.min(W * .045, H * .09, 64);
        const y0 = cy + S * .5 + fs * 1.5;
        ctx.font = `600 ${fs}px "Space Grotesk", sans-serif`; ctx.textBaseline = 'alphabetic';
        const words = ['We', 'Dig', 'Creativity'];
        const sp = fs * .26; const widths = words.map(w => ctx.measureText(w).width); const tot = widths.reduce((a, b) => a + b, 0) + sp * 2 + fs * .2;
        let x = cx - tot / 2;
        words.forEach((wd, i) => {
          const k = E.outQuint(seg(t, 8.2 + i * .13, 9.0 + i * .13));
          ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y0 - fs * 1.05, widths[i] + 8 + (i === 2 ? fs * .3 : 0), fs * 1.35); ctx.clip();
          ctx.fillStyle = '#ffffff'; ctx.fillText(wd, x, y0 + (1 - k) * fs * 1.2);
          if (i === 2) { ctx.fillStyle = '#ff6500'; ctx.fillRect(x + widths[i] + fs * .06, y0 - fs * .16 + (1 - k) * fs * 1.2, fs * .16, fs * .16); }
          ctx.restore(); x += widths[i] + sp;
        });
        const dk = E.outCubic(seg(t, 9.1, 9.9));
        if (dk > 0) {
          const ds = Math.max(12, fs * .3);
          ctx.globalAlpha = dk;
          ctx.strokeStyle = 'rgba(255,120,40,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - tot / 2, y0 + fs * .45); ctx.lineTo(cx - tot / 2 + tot * dk, y0 + fs * .45); ctx.stroke();
          ctx.font = `italic 400 ${ds}px Outfit, sans-serif`; ctx.fillStyle = 'rgba(225,228,255,.85)'; ctx.textAlign = 'center';
          ctx.fillText('dig (v.), informal: to love, to be really into.', cx, y0 + fs * .45 + ds * 1.9);
          ctx.textAlign = 'left'; ctx.globalAlpha = 1;
        }
      }
      // measuring crosshair in idle
      if (idle > 0 && ptr.inside && ptr.spx > -1e3) {
        const x = ptr.spx, y = ptr.spy;
        ctx.strokeStyle = `rgba(255,120,40,${.45 * idle})`; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = '500 11px "Space Grotesk", sans-serif'; ctx.fillStyle = `rgba(255,160,110,${.9 * idle})`;
        const tx = ((x - cx) / u).toFixed(2), ty = ((cy - y) / u).toFixed(2);
        ctx.fillText(`x ${tx}  y ${ty}`, Math.min(x + 8, W - 110), Math.max(y - 8, 14));
      }
    }
  };
})());
