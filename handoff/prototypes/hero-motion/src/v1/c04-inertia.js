/* 04 INERTIA: app development. Gestures as physics, on a glass slab seen from moving angles. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU } = U;
  let bg, bctx, dev, scr, sctx, sheen, geo = {};
  let st;
  const COLS = ['#ff6500', '#1b1b8f', '#f4f3ef', '#2d2dbb', '#0d0d45', '#ffb27e', '#000065', '#ffffff', '#3a3ae0', '#ff6500', '#f4f3ef', '#15156a', '#ffb27e', '#1b1b8f'];
  const HS = [1.25, .8, .9, 1.3, .75, 1.1, 1.2, .8, 1, 1.25, .85, 1.05, .95, 1.2];
  const EXPAND = 0; // the orange tile

  function script(t) { // scripted finger in screen-normalised coords
    // press/release pulse at the very start (no screen yet), then drag, tap, dismiss
    if (t >= 3.1 && t < 3.75) { const k = E.inOutCubic(seg(t, 3.15, 3.7)); return { x: .56, y: lerp(.78, .3, k), down: t < 3.7, vis: 1 }; }
    if (t >= 3.75 && t < 4.1) return { x: .56, y: .3, down: false, vis: 1 - seg(t, 3.75, 4.1) };
    if (t >= 4.6 && t < 5.5) { // move to the orange tile and tap
      const tile = st.tiles[EXPAND]; const r = tileRect(tile, 0);
      const tx = (r.x + r.w / 2) / geo.sw, ty = (r.y + r.h / 2) / geo.sh;
      const k = E.inOutCubic(seg(t, 4.6, 5.1));
      return { x: lerp(.7, tx, k), y: lerp(.6, ty, k), down: t > 5.12 && t < 5.3, vis: ss(4.6, 4.8, t) * (1 - seg(t, 5.35, 5.5)) };
    }
    if (t >= 6.9 && t < 7.95) { const k = E.inOutCubic(seg(t, 7.05, 7.7)); return { x: .5, y: lerp(.3, .72, k), down: t > 7.0 && t < 7.72, vis: ss(6.9, 7.0, t) * (1 - seg(t, 7.75, 7.95)) }; }
    return null;
  }
  function tileRect(tile, extraY) {
    return { x: tile.x, y: tile.y - st.s + tile.dy + (extraY || 0), w: tile.w, h: tile.h };
  }
  function layout() {
    const { sw, sh } = geo; const pad = sw * .045, gap = sw * .035, cw = (sw - pad * 2 - gap) / 2;
    const top = sh * .13; const colY = [top, top];
    st.tiles = COLS.map((c, i) => {
      const col = colY[0] <= colY[1] ? 0 : 1; const h = cw * HS[i];
      const t = { x: pad + col * (cw + gap), y: colY[col], w: cw, h, col: c, dy: 0, vdy: 0, press: 1, vp: 0, ox: 0, oy: 0, vox: 0, voy: 0, drop: 2.15 + i * .055 + col * .03 };
      colY[col] += h + gap; return t;
    });
    st.maxS = Math.max(0, Math.max(colY[0], colY[1]) - sh * .86);
  }
  function hitTile(x, y) { for (let i = 0; i < st.tiles.length; i++) { const r = tileRect(st.tiles[i]); if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return i; } return -1; }

  function reset() {
    st = { s: 0, v: 0, drag: false, f: { x: .5, y: .5, down: false, vis: 0 }, pf: { down: false }, fy0: 0, s0: 0, ft: 0, fvx: 0, fvy: 0, p: 0, pv: 0, target: 0, idx: EXPAND, ddrag: 0, ripples: [], lastAuto: 0, manual: false };
    if (geo.sw) layout();
  }
  function press(f, t) {
    st.fy0 = f.y; st.fx0 = f.x; st.s0 = st.s; st.ft = t; st.drag = true; st.ddrag = 0;
    st.ripples.push({ x: f.x, y: f.y, t, press: true });
  }
  function release(f, t) {
    st.drag = false;
    const moved = Math.hypot((f.x - st.fx0) * geo.sw, (f.y - st.fy0) * geo.sh);
    if (st.p > .5 || st.target === 1) {
      if (st.ddrag > .12 || moved < 8) { st.target = 0; } st.ddrag = 0;
    } else if (moved < 10 && t - st.ft < .45) {
      const i = hitTile(f.x * geo.sw, f.y * geo.sh); if (i >= 0) { st.idx = i; st.target = 1; }
    } else { st.v = -st.fvy * geo.sh; }
    st.ripples.push({ x: f.x, y: f.y, t, press: false });
  }

  return {
    name: 'Inertia', service: 'App development',
    pitch: 'A phone-shaped slab of glass turns in the light while an invisible finger scrolls, flings, taps and dismisses, and every tile answers with real mass, springs and rubber-banding. It sells the feel of a well-built app, which is the part nobody can screenshot.',
    tech: 'A DOM slab with CSS 3D transforms for the camera (GPU composited), a canvas screen running a small spring and momentum simulation (fixed script for the opening, your pointer afterwards), and a background canvas for the shadow, ripples and light spill.',
    ground: 'Dark in both page themes; the screen itself carries light and dark tiles.',
    duration: 10, stillT: 9.4, kind: 'dom',
    beats: [['0.0 s', 'A single touch presses into the dark and ripples out.'], ['0.8 s', 'The slab swings up out of the ripple and settles.'], ['2.2 s', 'Tiles drop in on springs, column by column.'], ['3.1 s', 'A fling: momentum, overscroll, rubber band.'], ['5.1 s', 'A tap: the orange tile expands to fill the screen, the slab turns to face you, light spills out.'], ['7.0 s', 'Swipe down to dismiss; the card shrinks home and the slab turns away.'], ['10.0 s', 'Idle: the slab follows the pointer; hover pushes the tiles, click or tap to open one, drag to scroll.']],
    activate(env) {
      const L = env.layer;
      L.innerHTML = '<canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas><div class="dev" style="position:absolute;left:0;top:0;transform-style:preserve-3d;will-change:transform;border-radius:40px;background:linear-gradient(145deg,#2a2a55,#0a0a22 40%,#03030f);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.22),inset 0 0 0 4px #05051a,0 0 0 1px rgba(0,0,0,.6)"><canvas style="position:absolute;display:block"></canvas><div style="position:absolute;inset:0;border-radius:inherit;pointer-events:none;mix-blend-mode:screen"></div></div>';
      bg = L.children[0]; bctx = bg.getContext('2d'); dev = L.children[1]; scr = dev.children[0]; sctx = scr.getContext('2d'); sheen = dev.children[1];
    },
    resize(env) {
      const { W, H, dpr, portrait } = env;
      bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
      const dh = Math.min(H * (portrait ? .74 : .8), (portrait ? W * .62 : W * .5) * 2.05), dw = dh / 2.05;
      const inset = dw * .038;
      geo = { dw, dh, inset, sw: dw - inset * 2, sh: dh - inset * 2, cx: portrait ? W / 2 : W * .6, cy: H * (portrait ? .47 : .5), r: dw * .16 };
      dev.style.width = dw + 'px'; dev.style.height = dh + 'px'; dev.style.borderRadius = geo.r + 'px';
      Object.assign(scr.style, { left: inset + 'px', top: inset + 'px', width: geo.sw + 'px', height: geo.sh + 'px', borderRadius: (geo.r - inset) + 'px' });
      scr.width = Math.round(geo.sw * dpr); scr.height = Math.round(geo.sh * dpr);
      const s = st && st.s, p = st && st.p; if (st) { layout(); } else reset();
    },
    init() {},
    reset() { reset(); },
    onTap(x, y, env, t) { if (t > 9) st.manual = true; },
    sim(t, dt, env) {
      const { ptr } = env;
      // finger: script in the opening, pointer (or an automatic flick) afterwards
      let f = script(t);
      if (!f && t > 9.6) {
        const devL = geo.cx - geo.dw / 2 + geo.inset, devT = geo.cy - geo.dh / 2 + geo.inset;
        if (ptr.inside && ptr.rpx > -1e3) {
          const x = (ptr.rpx - devL) / geo.sw, y = (ptr.rpy - devT) / geo.sh;
          const over = x > -.1 && x < 1.1 && y > -.05 && y < 1.05;
          f = { x, y, down: ptr.down && over, vis: over ? 1 : 0, hover: true }; st.lastAuto = t;
        } else if (t - st.lastAuto > 6.5) {
          const k = t - st.lastAuto - 6.5; // automatic flick, alternating direction
          const up = Math.floor(t / 6.5) % 2 === 0;
          const e = E.inOutCubic(seg(k, .15, .55));
          f = { x: .5, y: up ? lerp(.75, .35, e) : lerp(.3, .7, e), down: k > .1 && k < .55, vis: ss(0, .1, k) * (1 - seg(k, .6, .8)) };
          if (k > .8) st.lastAuto = t;
        }
      }
      f = f || { x: st.f.x, y: st.f.y, down: false, vis: Math.max(0, st.f.vis - dt * 4) };
      const vy = dt > 0 ? (f.y - st.f.y) / dt : 0; st.fvy = lerp(st.fvy, vy, .5);
      if (f.down && !st.pf.down) press(f, t);
      if (!f.down && st.pf.down) release(f, t);
      st.f = f; st.pf = { down: f.down };

      // scroll physics
      if (st.drag && st.p < .5 && st.target === 0) {
        let s = st.s0 + (st.fy0 - f.y) * geo.sh;
        if (s < 0) s = -Math.pow(-s, .75); if (s > st.maxS) s = st.maxS + Math.pow(s - st.maxS, .75);
        st.v = (s - st.s) / Math.max(dt, 1e-3); st.s = s;
      } else {
        st.s += st.v * dt; st.v *= Math.exp(-dt * 2.4);
        const b = st.s < 0 ? 0 : st.s > st.maxS ? st.maxS : null;
        if (b !== null) { const a = -180 * (st.s - b) - 24 * st.v; st.v += a * dt; }
      }
      if (st.drag && st.target === 1) { st.ddrag = Math.max(0, f.y - st.fy0); }
      // expand spring (slightly under-damped)
      const goal = st.target === 1 ? 1 - st.ddrag * 1.1 : 0;
      const a = 190 * (goal - st.p) - (st.drag ? 30 : 17) * st.pv; st.pv += a * dt; st.p += st.pv * dt;
      // tiles
      for (let i = 0; i < st.tiles.length; i++) {
        const T = st.tiles[i];
        if (t < T.drop) { T.dy = -geo.sh * 1.1 - i * 20; T.vdy = 0; }
        else { const a = -140 * T.dy - 13 * T.vdy; T.vdy += a * dt; T.dy += T.vdy * dt; }
        const r = tileRect(T); const fx = f.x * geo.sw, fy = f.y * geo.sh;
        const inside = f.vis > .5 && fx > r.x && fx < r.x + r.w && fy > r.y && fy < r.y + r.h;
        const pt = inside && f.down ? .93 : 1; const pa = 320 * (pt - T.press) - 22 * T.vp; T.vp += pa * dt; T.press += T.vp * dt;
        // magnetic push from a hovering finger
        let tx = 0, ty = 0;
        if (f.hover && f.vis > .5 && !f.down) { const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = cx - fx, dy = cy - fy, d = Math.hypot(dx, dy) + 1e-3, R = geo.sw * .55; if (d < R) { const k = (1 - d / R) * geo.sw * .05; tx = dx / d * k; ty = dy / d * k; } }
        const ax = 160 * (tx - T.ox) - 16 * T.vox, ay = 160 * (ty - T.oy) - 16 * T.voy; T.vox += ax * dt; T.voy += ay * dt; T.ox += T.vox * dt; T.oy += T.voy * dt;
      }
      st.ripples = st.ripples.filter(r => t - r.t < 1.2);
    },
    frame(t, dt, env) {
      const { W, H, dpr, ptr, portrait } = env;
      const idle = ss(9, 10.5, t);
      // camera on the slab
      const intro = E.outBack(seg(t, .75, 2.3), 1.3);
      const faceOn = ss(4.9, 5.7, t) * (1 - ss(7.2, 8.4, t));
      let ry = lerp(-58, -18, intro), rx = lerp(62, 10, intro), rz = lerp(-14, 4, intro);
      ry = lerp(ry, -2, faceOn); rx = lerp(rx, 2, faceOn); rz = lerp(rz, 0, faceOn);
      const after = ss(7.4, 9, t); ry = lerp(ry, 16, after * (1 - idle)); rz = lerp(rz, -3, after * (1 - idle));
      ry = lerp(ry, -14 + ptr.x * 22, idle); rx = lerp(rx, 7 - ptr.y * 12, idle); rz = lerp(rz, 2 - ptr.x * 3, idle);
      const bob = Math.sin(t * .9) * 6 * ss(2, 3, t);
      const sc = lerp(.55, 1, E.outCubic(seg(t, .7, 2.2))) * (1 + .04 * faceOn);
      const op = ss(.7, 1.1, t);
      dev.style.transform = `translate(${geo.cx - geo.dw / 2}px,${geo.cy - geo.dh / 2 + bob}px) perspective(1500px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`;
      dev.style.opacity = op;
      sheen.style.background = `linear-gradient(${110 + ry * 2}deg, rgba(255,255,255,0) ${30 + ry}%, rgba(255,255,255,.14) ${45 + ry * .6}%, rgba(255,255,255,0) ${60 + ry * .4}%)`;

      // background
      const b = bctx; b.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = b.createRadialGradient(geo.cx, geo.cy, 0, geo.cx, geo.cy, Math.max(W, H) * .8);
      g.addColorStop(0, '#0e0e58'); g.addColorStop(.5, '#040430'); g.addColorStop(1, '#010110'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      // light spill from the expanded tile
      const spill = clamp(st.p) * op; const col = st.tiles[st.idx].col;
      if (spill > .01) { const sg = b.createRadialGradient(geo.cx, geo.cy, 0, geo.cx, geo.cy, geo.dh * .9); const c = U.hex(col); sg.addColorStop(0, U.rgba(c, .32 * spill)); sg.addColorStop(1, U.rgba(c, 0)); b.fillStyle = sg; b.fillRect(0, 0, W, H); }
      // floor shadow
      const shY = geo.cy + geo.dh * .56;
      const sh = b.createRadialGradient(geo.cx, shY, 0, geo.cx, shY, geo.dw * .9); sh.addColorStop(0, `rgba(0,0,0,${.55 * op})`); sh.addColorStop(1, 'rgba(0,0,0,0)');
      b.save(); b.translate(geo.cx, shY); b.scale(1, .18); b.translate(-geo.cx, -shY); b.fillStyle = sh; b.fillRect(geo.cx - geo.dw, shY - geo.dw, geo.dw * 2, geo.dw * 2); b.restore();
      // opening touch: press, then ripple out of which the slab rises
      if (t < 1.8) {
        const x = geo.cx, y = geo.cy; const pr = E.inOutCubic(seg(t, .15, .45)) * (1 - E.outBack(seg(t, .45, .7)));
        const a = ss(.1, .3, t) * (1 - ss(.9, 1.3, t));
        b.strokeStyle = `rgba(255,255,255,${.8 * a})`; b.lineWidth = 1.5; b.beginPath(); b.arc(x, y, 22 - 7 * pr, 0, TAU); b.stroke();
        b.fillStyle = `rgba(255,255,255,${.12 * a})`; b.fill();
        for (let k = 0; k < 3; k++) { const q = seg(t, .55 + k * .12, 1.7 + k * .12); if (q <= 0 || q >= 1) continue; b.strokeStyle = `rgba(255,${150 - k * 30},${90 - k * 30},${(1 - q) * .6})`; b.lineWidth = 1.2; b.beginPath(); b.arc(x, y, 20 + E.outCubic(q) * Math.max(W, H) * .5, 0, TAU); b.stroke(); }
      }

      // screen
      const s = sctx; s.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { sw, sh: shh } = geo;
      s.fillStyle = '#06061f'; s.fillRect(0, 0, sw, shh);
      const p = st.p, pc = clamp(p);
      const fs = Math.max(8, sw * .03);
      // tiles
      st.tiles.forEach((T, i) => {
        if (i === st.idx && pc > .001) return;
        const r = tileRect(T); const scl = T.press * (1 - .05 * pc);
        const cx = r.x + r.w / 2 + T.ox, cy = r.y + r.h / 2 + T.oy;
        if (cy + r.h < -20 || cy - r.h > shh + 20) return;
        s.save(); s.translate(sw / 2 + (cx - sw / 2) * (1 - .05 * pc), shh / 2 + (cy - shh / 2) * (1 - .05 * pc)); s.scale(scl, scl);
        drawTile(s, T, -r.w / 2, -r.h / 2, r.w, r.h, sw * .045, i, fs);
        s.restore();
      });
      if (pc > .001) { s.fillStyle = `rgba(3,3,20,${.55 * pc})`; s.fillRect(0, 0, sw, shh); }
      // header and tab bar (fixed chrome)
      const hg = s.createLinearGradient(0, 0, 0, shh * .14); hg.addColorStop(0, '#06061f'); hg.addColorStop(.75, 'rgba(6,6,31,.9)'); hg.addColorStop(1, 'rgba(6,6,31,0)');
      s.fillStyle = hg; s.fillRect(0, 0, sw, shh * .14);
      s.fillStyle = '#f4f3ef'; s.beginPath(); U.roundRect(s, sw * .06, shh * .055, sw * .34, shh * .022, shh * .011); s.fill();
      s.fillStyle = '#ff6500'; s.beginPath(); s.arc(sw * .88, shh * .066, sw * .04, 0, TAU); s.fill();
      const tb = s.createLinearGradient(0, shh * .86, 0, shh); tb.addColorStop(0, 'rgba(6,6,31,0)'); tb.addColorStop(.35, 'rgba(6,6,31,.95)'); s.fillStyle = tb; s.fillRect(0, shh * .86, sw, shh * .14);
      for (let k = 0; k < 4; k++) { s.fillStyle = k === 0 ? '#ff6500' : 'rgba(220,220,255,.35)'; s.beginPath(); s.arc(sw * (.2 + k * .2), shh * .945, sw * .018, 0, TAU); s.fill(); }
      // expanded card
      if (pc > .001) {
        const T = st.tiles[st.idx]; const r = tileRect(T);
        const e = p; const x = lerp(r.x, 0, e), y = lerp(r.y, 0, e), w = lerp(r.w, sw, e), h = lerp(r.h, shh, e);
        s.save(); s.beginPath(); U.roundRect(s, x, y, w, h, lerp(sw * .045, geo.r - geo.inset, clamp(e))); s.clip();
        s.fillStyle = T.col; s.fillRect(x, y, w, h);
        // content of the opened card
        const ink = isLight(T.col) ? '#0a0a1a' : '#ffffff';
        const cy2 = y + h * .36, R = w * .3;
        const og = s.createRadialGradient(x + w * .5 - R * .3, cy2 - R * .3, R * .1, x + w * .5, cy2, R);
        og.addColorStop(0, 'rgba(255,255,255,.55)'); og.addColorStop(1, 'rgba(255,255,255,0.05)');
        s.fillStyle = og; s.beginPath(); s.arc(x + w * .5, cy2, R * (0.6 + .4 * ss(.4, 1, e)), 0, TAU); s.fill();
        s.globalAlpha = ss(.6, 1, e);
        s.fillStyle = ink; s.beginPath(); U.roundRect(s, x + w * .08, y + h * .64, w * .7, h * .035, h * .0175); s.fill();
        s.beginPath(); U.roundRect(s, x + w * .08, y + h * .69, w * .5, h * .035, h * .0175); s.fill();
        s.globalAlpha *= .6; s.beginPath(); U.roundRect(s, x + w * .08, y + h * .76, w * .76, h * .012, h * .006); s.fill(); s.beginPath(); U.roundRect(s, x + w * .08, y + h * .785, w * .6, h * .012, h * .006); s.fill();
        s.globalAlpha = ss(.6, 1, e); s.fillStyle = ink === '#ffffff' ? '#ffffff' : '#0a0a0a';
        s.beginPath(); U.roundRect(s, x + w * .08, y + h * .85, w * .84, h * .06, h * .03); s.fill();
        s.globalAlpha = 1; s.restore();
      }
      // finger
      const f = st.f;
      if (f.vis > .01) {
        const x = f.x * sw, y = f.y * shh;
        s.fillStyle = `rgba(255,255,255,${(f.down ? .28 : .14) * f.vis})`; s.beginPath(); s.arc(x, y, sw * (f.down ? .075 : .085), 0, TAU); s.fill();
        s.strokeStyle = `rgba(255,255,255,${.7 * f.vis})`; s.lineWidth = 1.2; s.stroke();
      }
      for (const r of st.ripples) { const q = (t - r.t) / 1.2; if (q < 0) continue; s.strokeStyle = `rgba(255,255,255,${(1 - q) * .45})`; s.lineWidth = 1; s.beginPath(); s.arc(r.x * sw, r.y * shh, sw * (.08 + E.outCubic(q) * .35), 0, TAU); s.stroke(); }
      // glass reflection across the screen
      const gl = s.createLinearGradient(0, 0, sw, shh); const k = clamp(.5 + dev._ry / 90 || .5);
      gl.addColorStop(0, 'rgba(255,255,255,.06)'); gl.addColorStop(.35, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,.03)');
      s.fillStyle = gl; s.fillRect(0, 0, sw, shh);
    }
  };
  function isLight(c) { const [r, g, b] = U.hex(c); return (r * .299 + g * .587 + b * .114) > 150; }
  function drawTile(s, T, x, y, w, h, r, i, fs) {
    s.fillStyle = T.col; s.beginPath(); U.roundRect(s, x, y, w, h, r); s.fill();
    const ink = isLight(T.col) ? 'rgba(10,10,26,' : 'rgba(255,255,255,';
    const kind = i % 4;
    if (kind === 0) { s.fillStyle = ink + '.9)'; s.beginPath(); s.arc(x + w * .3, y + h * .35, w * .16, 0, TAU); s.fill(); }
    if (kind === 1) { s.strokeStyle = ink + '.8)'; s.lineWidth = 1.5; s.beginPath(); s.moveTo(x + w * .12, y + h * .6); for (let k = 0; k <= 6; k++) s.lineTo(x + w * (.12 + k * .126), y + h * (.55 - Math.sin(k * 1.3 + i) * .12 - k * .03)); s.stroke(); }
    if (kind === 2) { for (let k = 0; k < 3; k++) { s.fillStyle = ink + (.9 - k * .25) + ')'; s.beginPath(); U.roundRect(s, x + w * .12, y + h * (.2 + k * .14), w * (.7 - k * .15), h * .07, h * .035); s.fill(); } }
    if (kind === 3) { s.fillStyle = ink + '.85)'; s.beginPath(); U.roundRect(s, x + w * .12, y + h * .18, w * .3, w * .3, w * .08); s.fill(); }
    s.fillStyle = ink + '.9)'; s.beginPath(); U.roundRect(s, x + w * .12, y + h - h * .24, w * .6, Math.max(4, h * .06), 3); s.fill();
    s.fillStyle = ink + '.45)'; s.beginPath(); U.roundRect(s, x + w * .12, y + h - h * .13, w * .4, Math.max(3, h * .04), 2); s.fill();
  }
})());
