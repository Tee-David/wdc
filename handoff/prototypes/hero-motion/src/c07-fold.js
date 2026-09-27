/* 07 FOLD: print and packaging. A die-line is drawn, printed, lifted and folded into a box. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU } = U;
  const w = 1.0, d = .72, h = 1.2, TUCK = .2, PX = 256;
  let faces = [], tex = {}, inside;
  let st = { taps: [] };

  function mk(wu, hu, draw) { const c = document.createElement('canvas'); c.width = Math.round(wu * PX); c.height = Math.round(hu * PX); const g = c.getContext('2d'); draw(g, c.width, c.height); return c; }
  function halftone(g, W, H, col, fromY, toY, max) {
    g.fillStyle = col; const step = 9;
    for (let y = 0; y < H; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < W; x += step) {
      const k = clamp((y - fromY) / (toY - fromY)); const r = max * k; if (r < .3) continue; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }
  function buildTex() {
    const S = '"Space Grotesk", sans-serif', O = 'Outfit, sans-serif';
    tex.base = mk(w, d, (g, W, H) => { g.fillStyle = '#000065'; g.fillRect(0, 0, W, H); g.strokeStyle = '#ff6500'; g.lineWidth = 10; g.beginPath(); g.arc(W / 2, H / 2, H * .3, 0, TAU); g.stroke(); g.fillStyle = '#ff6500'; g.beginPath(); g.arc(W / 2 + H * .3 * Math.cos(-.6), H / 2 + H * .3 * Math.sin(-.6), 11, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `500 11px ${O}`; g.fillText('WDC / 01', 12, H - 12); });
    tex.front = mk(w, h, (g, W, H) => { g.fillStyle = '#000065'; g.fillRect(0, 0, W, H); halftone(g, W, H, '#2d2dbb', H * .35, H, 4.6); g.fillStyle = '#ff6500'; g.beginPath(); g.arc(W * .72, H * .3, W * .16, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = `700 40px ${S}`; g.fillText('We Dig', 18, H * .62); g.fillText('Creativity', 18, H * .62 + 40); g.fillStyle = '#ff6500'; g.fillRect(18, H * .62 + 54, 60, 5); g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `400 11px ${O}`; g.fillText('Edition 01  ·  Studio goods', 18, H - 18); });
    tex.back = mk(w, h, (g, W, H) => { g.fillStyle = '#000065'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 9; i++) { g.fillRect(18, 30 + i * 18, [180, 200, 160, 190, 120, 200, 170, 90, 150][i], 6); } g.fillStyle = '#fff'; g.fillRect(18, H - 90, 110, 64); g.fillStyle = '#0a0a0a'; for (let i = 0; i < 28; i++) { const bw = (i * 7) % 3 + 1; g.fillRect(24 + i * 3.6, H - 84, bw, 44); } g.fillStyle = '#ff6500'; g.fillRect(W - 60, H - 60, 36, 36); });
    const side = (n) => (g, W, H) => { g.fillStyle = '#ff6500'; g.fillRect(0, 0, W, H); halftone(g, W, H, '#b84a00', 0, H * .9, 4.8); g.fillStyle = '#000065'; g.font = `700 92px ${S}`; g.fillText(n, 16, H - 26); g.fillStyle = '#fff'; g.fillRect(16, 22, 40, 5); };
    tex.right = mk(d, h, side('01')); tex.left = mk(d, h, side('02'));
    tex.lid = mk(w, d, (g, W, H) => { g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, W, H); g.fillStyle = '#000065'; g.font = `600 13px ${O}`; g.fillText('Designed and printed by WDC', 14, 26); for (let i = 0; i < 5; i++) { g.fillStyle = ['#000065', '#ff6500', '#ffb27e', '#0a0a0a', '#3b3bff'][i]; g.fillRect(14 + i * 26, H - 40, 22, 22); } });
    tex.tuck = mk(w, TUCK, (g, W, H) => { g.fillStyle = '#ff6500'; g.fillRect(0, 0, W, H); });
    inside = '#e8e3d8';
  }
  // folding progress 0 (flat) .. 1 (closed) -> individual hinge angles
  function angles(f) {
    const q = Math.PI / 2;
    return { lr: q * E.inOutCubic(seg(f, 0, .36)), fb: q * E.inOutCubic(seg(f, .24, .6)), lid: q * E.outBack(seg(f, .56, .86), 1.6), tuck: q * E.inOutCubic(seg(f, .78, 1)) };
  }
  function buildFaces() {
    const X = u => lerp(-w / 2, w / 2, u), Z = u => lerp(-d / 2, d / 2, u);
    const back = (A, u, v) => [X(u), -v * h * Math.sin(A.fb), -d / 2 - v * h * Math.cos(A.fb)];
    const lid = (A, u, v) => { const e = back(A, u, 1), th = A.fb + A.lid; return [e[0], e[1] - v * d * Math.sin(th), e[2] - v * d * Math.cos(th)]; };
    faces = [
      { id: 'base', F: (A, u, v) => [X(u), 0, Z(v)], hinges: [0, 1, 2, 3] },
      { id: 'front', F: (A, u, v) => [X(u), -v * h * Math.sin(A.fb), d / 2 + v * h * Math.cos(A.fb)], hinges: [0] },
      { id: 'back', F: back, hinges: [0, 2] },
      { id: 'right', F: (A, u, v) => [w / 2 + v * h * Math.cos(A.lr), -v * h * Math.sin(A.lr), Z(u)], hinges: [0] },
      { id: 'left', F: (A, u, v) => [-w / 2 - v * h * Math.cos(A.lr), -v * h * Math.sin(A.lr), Z(u)], hinges: [0] },
      { id: 'lid', F: lid, hinges: [0, 2] },
      { id: 'tuck', F: (A, u, v) => { const e = lid(A, u, 1), th = A.fb + A.lid + A.tuck; return [e[0], e[1] - v * TUCK * Math.sin(th), e[2] - v * TUCK * Math.cos(th)]; }, hinges: [0] },
    ];
    const A0 = angles(0);
    for (const f of faces) { const p = f.F(A0, 0, 0), a = f.F(A0, 1, 0), b = f.F(A0, 0, 1); const du = [a[0] - p[0], a[1] - p[1], a[2] - p[2]], dv = [b[0] - p[0], b[1] - p[1], b[2] - p[2]]; const cy = du[2] * dv[0] - du[0] * dv[2]; f.sgn = cy > 0 ? 1 : -1; f.flip = cy <= 0; }
  }
  function foldAt(t) {
    let f = seg(t, 5.0, 8.0);
    if (t < 10) return f;
    if (st.taps.length) { // user toggles
      let cur = 1; for (const T of st.taps) { const k = seg(t, T, T + 2.2); cur = cur > .5 ? 1 - k : k; if (t < T + 2.2) return cur; cur = Math.round(cur); } return cur;
    }
    const k = (t - 10) % 16; // automatic: hold, unfold, hold, refold
    if (k < 9) return 1; if (k < 11) return 1 - E.inOutCubic(seg(k, 9, 11)); if (k < 12.4) return 0; return E.inOutCubic(seg(k, 12.4, 15.6));
  }

  return {
    name: 'Fold', service: 'Print and packaging', short: 'Print and packaging', cue: 3.6, focus: [.5, .5],
    fix: 'A light version where the drafting table is paper: cuts in navy ink, folds dashed in the accessible orange, a solid print roller instead of additive light, and a real soft shadow under the lifted box. Framed for a near-square stage (the flat net and the closed box both fit with margin), and on the shared ground for hand-offs.',
    pitch: 'A die-line draws itself like a technical drawing, a roller of light prints it, and the sheet lifts off the table and folds, flap by flap, into a finished box that turns to show every side. Print as engineering you can hold.',
    tech: 'Canvas 2D with a hinge-chain model: every panel is a function of its parent fold angle, so the flaps stage and overshoot like real board. Artwork is generated (halftone, type, colour bars), mapped per face with correct handedness, and back-facing panels show plain board.',
    duration: 10.2, stillT: 10.4, kind: '2d',
    beats: [['0.0 s', 'Crop marks snap into the corners; a registration target spins in.'], ['0.8 s', 'The die-line draws: cuts in white, folds dashed in orange, with dimensions.'], ['2.6 s', 'A roller of light prints the artwork across the net.'], ['4.2 s', 'The camera tilts off top-down and the sheet lifts off the table.'], ['5.0 s', 'Sides fold, then front and back, then the lid with overshoot, then the tuck.'], ['8.0 s', 'The closed box turns a full revolution and settles.'], ['10.2 s', 'Idle: pointer turns the box; tap or click to unfold and refold it.']],
    init() { buildTex(); buildFaces(); },
    reset() { st = { taps: [] }; },
    onTap(x, y, env, t) { if (t > 10.2) st.taps.push(Math.max(t, st.taps.length ? st.taps[st.taps.length - 1] + 2.2 : t)); },
    frame(t, dt, env) {
      const { ctx, W, H, dpr, ptr, portrait } = env;
      const dk = env.dark;
      U.ground(ctx, env);
      const INK = dk ? 'rgba(230,232,255,' : 'rgba(0,0,101,', FOLD = dk ? 'rgba(255,120,40,' : 'rgba(184,74,0,';

      const idle = ss(9.8, 11, t);
      const f = foldAt(t), A = angles(f);
      const tilt = E.inOutCubic(seg(t, 4.2, 5.6));
      const spin = E.inOutQuart(seg(t, 7.9, 10.2)) * TAU;
      let pitch = lerp(-Math.PI / 2 + .001, -.5, tilt) - ptr.y * .25 * idle;
      let yaw = lerp(0, Math.PI - .6, tilt) + spin + ptr.x * .9 * idle + (t > 10.2 ? Math.sin((t - 10.2) * .3) * .15 : 0);
      const flatScale = portrait ? Math.min(W / 4.9, H / 5.7) : Math.min(W / 5.4, H / 5.5); // the net plus crop marks, targets and colour bar, with margin
      const boxScale = portrait ? Math.min(W / 2.4, H / 3.4) : Math.min(W / 3.4, H / 2.35);
      const scale = lerp(flatScale, boxScale, E.inOutCubic(seg(t, 4.4, 7.5)));
      // keep the object centred: flat net centre is offset along z
      const netZ = -(d + TUCK) / 2 + .02, lift = E.outCubic(seg(t, 4.2, 5.2)) * .25;
      const oz = lerp(netZ, 0, E.inOutCubic(seg(f, .2, .9))), oy = lerp(0, -h / 2, E.inOutCubic(seg(f, 0, .6))) + lift + Math.sin(t * 1.1) * .03 * idle;
      const proj0 = U.camera({ yaw, pitch, dist: 9, scale, cx: W / 2, cy: H * .5 });
      const pr = (p) => proj0(p[0], p[1] - oy, p[2] - oz, {});

      // sheet furniture: crop marks, registration, colour bar (only while flat)
      const flatA = 1 - ss(4.0, 5.0, t);
      const zMin = -d / 2 - h - d - TUCK, zMax = d / 2 + h, xMin = -w / 2 - h, xMax = w / 2 + h;
      if (flatA > 0) {
        const m = .22, L = .22;
        ctx.lineWidth = 1; ctx.strokeStyle = INK + (.8 * flatA) + ')';
        const snap = E.outBack(seg(t, .05, .6), 2);
        ctx.beginPath();
        for (const [cx0, cz0, sx, sz] of [[xMin, zMin, -1, -1], [xMax, zMin, 1, -1], [xMin, zMax, -1, 1], [xMax, zMax, 1, 1]]) {
          const ox2 = sx * (m + (1 - snap) * .8), oz2 = sz * (m + (1 - snap) * .8);
          let a = pr([cx0 + ox2, 0, cz0]), b = pr([cx0 + ox2 + sx * L, 0, cz0]); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          a = pr([cx0, 0, cz0 + oz2]); b = pr([cx0, 0, cz0 + oz2 + sz * L]); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
        // registration targets
        const rot = (1 - E.outCubic(seg(t, .2, 1.1))) * 3;
        for (const [rx, rz] of [[xMin - .3, (zMin + zMax) / 2], [xMax + .3, (zMin + zMax) / 2]]) {
          const c = pr([rx, 0, rz]), R = .09 * scale * E.outBack(seg(t, .2, .8));
          if (R <= 0) continue;
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(rot); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.moveTo(-R * 1.5, 0); ctx.lineTo(R * 1.5, 0); ctx.moveTo(0, -R * 1.5); ctx.lineTo(0, R * 1.5); ctx.stroke(); ctx.restore();
        }
        // colour bar
        const cb = ['#000065', '#ff6500', '#ffb27e', '#3b3bff', '#0a0a0a', '#f4f3ef'];
        cb.forEach((c, i) => { const k = E.outCubic(seg(t, .5 + i * .06, .9 + i * .06)); if (k <= 0) return; const a = pr([xMin + i * .16, 0, zMin - .25]), b = pr([xMin + i * .16 + .13, 0, zMin - .25]), c2 = pr([xMin + i * .16, 0, zMin - .38]); ctx.globalAlpha = k * flatA; ctx.fillStyle = c; ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, c2.y), Math.abs(b.x - a.x), Math.abs(c2.y - a.y) || 6); });
        ctx.globalAlpha = 1;
      }

      // soft shadow once lifted
      if (t > 4.2) {
        const c = pr([0, -h - .05 + oy * 0, 0]); const R = scale * 1.4;
        const sg = ctx.createRadialGradient(c.x, c.y + R * .2, 0, c.x, c.y + R * .2, R);
        sg.addColorStop(0, dk ? `rgba(0,0,12,${.55 * ss(4.2, 5.4, t)})` : `rgba(20,20,60,${.28 * ss(4.2, 5.4, t)})`); sg.addColorStop(1, dk ? 'rgba(0,0,12,0)' : 'rgba(20,20,60,0)');
        ctx.save(); ctx.translate(c.x, c.y + R * .2); ctx.scale(1, .3); ctx.translate(-c.x, -(c.y + R * .2)); ctx.fillStyle = sg; ctx.fillRect(c.x - R, c.y - R, R * 2, R * 2.4); ctx.restore();
      }

      // faces, far to near
      const printK = seg(t, 2.6, 4.2), sweepZ = lerp(zMax + .1, zMin - .1, E.inOutCubic(printK));
      const dieK = seg(t, .8, 2.6);
      const list = faces.map(fc => {
        const p00 = fc.F(A, 0, 0), p10 = fc.F(A, 1, 0), p01 = fc.F(A, 0, 1), p11 = fc.F(A, 1, 1);
        const du = [p10[0] - p00[0], p10[1] - p00[1], p10[2] - p00[2]], dv = [p01[0] - p00[0], p01[1] - p00[1], p01[2] - p00[2]];
        const n = [(du[1] * dv[2] - du[2] * dv[1]) * fc.sgn, (du[2] * dv[0] - du[0] * dv[2]) * fc.sgn, (du[0] * dv[1] - du[1] * dv[0]) * fc.sgn];
        const P = [pr(p00), pr(p10), pr(p11), pr(p01)];
        const cen = [(p00[0] + p11[0]) / 2, (p00[1] + p11[1]) / 2, (p00[2] + p11[2]) / 2];
        const c0 = pr(cen), c1 = pr([cen[0] + n[0] * .05, cen[1] + n[1] * .05, cen[2] + n[2] * .05]);
        return { fc, P, z: c0.z, out: c1.z < c0.z, n, cen };
      }).sort((a, b) => b.z - a.z);
      const L = [-.4, .8, -.45]; const ll = Math.hypot(...L);
      for (const it of list) {
        const { fc, P } = it;
        ctx.save(); ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
        // shading from a key light
        const nl = Math.hypot(...it.n) || 1; let lam = (it.n[0] * L[0] + it.n[1] * L[1] + it.n[2] * L[2]) / (nl * ll); if (!it.out) lam = -lam;
        const shade = .45 + .55 * clamp(lam * .5 + .5);
        if (!it.out) { ctx.fillStyle = inside; ctx.fill(); ctx.fillStyle = `rgba(20,20,60,${1 - shade})`; ctx.fill(); }
        else {
          // un-printed board, then the artwork where the roller has passed
          ctx.fillStyle = t < 2.6 ? (dk ? `rgba(20,20,80,${.35 * ss(.8, 2, t)})` : `rgba(0,0,101,${.05 * ss(.8, 2, t)})`) : '#e9e5dc'; ctx.fill();
          ctx.clip();
          if (printK > 0) {
            if (printK < 1) { const q0 = pr([-5, 0, sweepZ]), q1 = pr([5, 0, sweepZ]), q2 = pr([5, 0, zMax + 1]), q3 = pr([-5, 0, zMax + 1]); ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.lineTo(q3.x, q3.y); ctx.closePath(); ctx.clip(); }
            const img = tex[fc.id];
            const a = fc.flip ? [P[1], P[0], P[2]] : [P[0], P[1], P[3]];
            U.mapImage(ctx, img, a[0], a[1], a[2], dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = `rgba(0,0,30,${(1 - shade) * .9})`; ctx.fillRect(0, 0, W, H);
            // specular sweep while turning
            if (t > 4.5) { const sp = Math.pow(clamp(lam), 12) * .35; if (sp > .01) { ctx.fillStyle = `rgba(255,255,255,${sp})`; ctx.fillRect(0, 0, W, H); } }
          }
        }
        ctx.restore();
        // die-line strokes
        const lineA = ss(.8, 1.1, t) * (1 - ss(5.2, 6.2, t) * .85);
        if (lineA > 0.01) {
          const edges = [[P[0], P[1], 0], [P[1], P[2], 1], [P[3], P[2], 2], [P[0], P[3], 3]];
          const ord = { base: 0, front: 1, back: 2, right: 3, left: 4, lid: 5, tuck: 6 }[fc.id];
          const k = clamp(dieK * 1.6 - ord * .1);
          for (const [a, b, ei] of edges) {
            const hinge = fc.hinges.includes(ei);
            const x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k);
            ctx.strokeStyle = hinge ? FOLD + lineA + ')' : INK + (lineA * .95) + ')'; ctx.lineWidth = hinge ? 1.2 : 1.3;
            ctx.setLineDash(hinge ? [5, 4] : []); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x, y); ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      }
      // dimension labels on the flat net
      const dimA = ss(2.0, 2.5, t) * (1 - ss(3.8, 4.4, t));
      if (dimA > 0) {
        ctx.font = `500 ${portrait ? 10 : 12}px "Space Grotesk", sans-serif`; ctx.fillStyle = dk ? `rgba(255,150,90,${dimA})` : `rgba(184,74,0,${dimA})`; ctx.textAlign = 'center';
        const a = pr([0, 0, zMax + .16]); ctx.fillText(`${Math.round(w * 100)} mm`, a.x, a.y);
        const b = pr([xMax + .12, 0, d / 2 + h / 2]); ctx.textAlign = 'left'; ctx.fillText(`${Math.round(h * 100)}`, b.x, b.y);
        const c = pr([xMin - .12, 0, 0]); ctx.textAlign = 'right'; ctx.fillText(`${Math.round(d * 100)}`, c.x, c.y); ctx.textAlign = 'left';
      }
      // the print roller
      if (printK > 0 && printK < 1) {
        const a = pr([xMin - .4, 0, sweepZ]), b = pr([xMax + .4, 0, sweepZ]);
        if (dk) ctx.globalCompositeOperation = 'lighter';
        for (const [lw, al] of [[18, .07], [5, .3], [1.5, 1]]) { ctx.strokeStyle = dk ? `rgba(255,${lw > 10 ? 110 : 190},${lw > 10 ? 40 : 140},${al})` : `rgba(255,${lw > 10 ? 101 : 90},0,${al})`; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  };
})());
