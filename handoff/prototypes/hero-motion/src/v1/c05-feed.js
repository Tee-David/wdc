/* 05 FEED: social media. An endless ribbon of posts flowing through space, and the one that stops the scroll. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU } = U;
  const TW = 240, TH = 300, NT = 10;
  let hi = [], lo = [], back, backLo, table = [], total = 0, st, glowO;
  const R = 2.3, CW = .52, CH = .65, GAP = .05;

  function P(u) { return [R * Math.sin(u), .34 * Math.cos(u) + .12 * Math.sin(3 * u), R * .62 * Math.sin(u) * Math.cos(u)]; }
  function buildPath() {
    table = [0]; total = 0; let prev = P(0);
    for (let i = 1; i <= 2000; i++) { const p = P(i / 2000 * TAU); total += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]); table.push(total); prev = p; }
  }
  function uAt(s) { s = ((s % total) + total) % total; let lo2 = 0, hi2 = 2000; while (hi2 - lo2 > 1) { const m = (lo2 + hi2) >> 1; if (table[m] < s) lo2 = m; else hi2 = m; } const f = (s - table[lo2]) / (table[hi2] - table[lo2] || 1); return (lo2 + f) / 2000 * TAU; }

  function tex(i) {
    const c = document.createElement('canvas'); c.width = TW; c.height = TH; const g = c.getContext('2d');
    g.save(); g.beginPath(); U.roundRect(g, 0, 0, TW, TH, 22); g.clip();
    const lin = (a, b, x0 = 0, y0 = 0, x1 = TW, y1 = TH) => { const l = g.createLinearGradient(x0, y0, x1, y1); l.addColorStop(0, a); l.addColorStop(1, b); return l; };
    const bars = (x, y, col, ws) => { ws.forEach((w, k) => { g.fillStyle = col; g.beginPath(); U.roundRect(g, x, y + k * 20, w, 12, 6); g.fill(); }); };
    switch (i) {
      case 0: g.fillStyle = lin('#3b3bff', '#000065'); g.fillRect(0, 0, TW, TH); g.fillStyle = '#ff6500'; g.beginPath(); g.arc(170, 190, 70, 0, TAU); g.fill(); bars(22, 26, '#fff', [150, 110]); break;
      case 1: g.fillStyle = '#ff6500'; g.fillRect(0, 0, TW, TH); g.fillStyle = '#0a0a0a'; g.translate(120, 128); for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 4); g.beginPath(); U.roundRect(g, -8, -62, 16, 124, 8); g.fill(); } g.setTransform(1, 0, 0, 1, 0, 0); break;
      case 2: g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, TW, TH); for (let k = 0; k < 6; k++) { const h = [60, 90, 70, 130, 110, 160][k]; g.fillStyle = k === 5 ? '#ff6500' : '#000065'; g.fillRect(24 + k * 33, 220 - h, 22, h); } bars(24, 26, '#0a0a1a', [120]); break;
      case 3: { g.fillStyle = '#1a0a30'; g.fillRect(0, 0, TW, TH); const blob = (x, y, r, col) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, TW, TH); }; blob(80, 90, 160, 'rgba(255,101,0,.95)'); blob(190, 220, 170, 'rgba(60,60,255,.85)'); blob(150, 60, 90, 'rgba(255,210,170,.8)'); break; }
      case 4: g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, TW, TH); g.fillStyle = '#fff'; g.font = '700 124px "Space Grotesk", sans-serif'; g.fillText('24', 20, 170); g.fillStyle = '#ff6500'; g.fillRect(24, 190, 90, 8); bars(24, 26, 'rgba(255,255,255,.5)', [90]); break;
      case 5: g.fillStyle = '#000065'; g.fillRect(0, 0, TW, TH); g.strokeStyle = '#ffffff'; g.lineWidth = 14; for (let k = -10; k < 20; k++) { g.beginPath(); g.moveTo(k * 34, 0); g.lineTo(k * 34 + TH, TH); g.stroke(); } g.fillStyle = '#ff6500'; g.beginPath(); U.roundRect(g, 60, 90, 120, 120, 60); g.fill(); break;
      case 6: g.fillStyle = '#ffffff'; g.fillRect(0, 0, TW, TH); g.fillStyle = '#ff6500'; g.font = '700 150px "Space Grotesk", sans-serif'; g.fillText('“', 14, 130); bars(24, 130, '#0a0a1a', [190, 170, 120]); break;
      case 7: g.fillStyle = lin('#ffb27e', '#ff6500', 0, 0, 0, TH); g.fillRect(0, 0, TW, TH); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; for (let k = 1; k < 8; k++) { g.beginPath(); g.arc(120, 140, k * 18, 0, TAU); g.stroke(); } break;
      case 8: g.fillStyle = lin('#0d0d45', '#000065'); g.fillRect(0, 0, TW, TH); g.fillStyle = '#fff'; g.font = '700 52px "Space Grotesk", sans-serif'; g.fillText('WDC', 24, 150); g.fillStyle = '#ff6500'; g.fillText('.', 142, 150); bars(24, 176, 'rgba(255,255,255,.45)', [150, 100]); break;
      case 9: g.fillStyle = '#3b3bff'; g.fillRect(0, 0, TW, TH); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { g.fillStyle = a === 2 && b === 1 ? '#ff6500' : '#ffffff'; g.beginPath(); g.arc(60 + b * 60, 60 + a * 60, 22, 0, TAU); g.fill(); } break;
    }
    // post chrome: avatar and two lines on a glass band
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, TH - 52, TW, 52);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(28, TH - 26, 11, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); U.roundRect(g, 48, TH - 34, 90, 8, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); U.roundRect(g, 48, TH - 20, 60, 7, 3.5); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); U.roundRect(g, 1, 1, TW - 2, TH - 2, 21); g.stroke();
    return c;
  }
  function small(src, f) { const c = document.createElement('canvas'); c.width = Math.round(TW * f); c.height = Math.round(TH * f); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height); return c; }

  function speedAt(t) { // scripted flow speed in path units per second
    if (t < 3.1) return 0;
    if (t < 6.0) return lerp(0, 2.6, E.inOutCubic(seg(t, 3.1, 4.6)));
    if (t < 7.2) return 2.6 * (1 - E.outExpo(seg(t, 6.0, 6.5)));
    return lerp(0, .32, ss(7.4, 9, t));
  }
  function camAt(t, env) {
    const { W, H, ptr, portrait } = env;
    const idle = ss(9, 11, t);
    const pull = E.inOutCubic(seg(t, 1.1, 3.6));
    // the hero card at s=0 sits where u=uAt(0)
    const u0 = uAt(st.heroS), p0 = P(u0), p1 = P(u0 + .001); const tx = p1[0] - p0[0], tz = p1[2] - p0[2], tl = Math.hypot(tx, tz);
    const nx = tz / tl, nz = -tx / tl;
    const yawHero = Math.atan2(-nx, -nz);
    let yaw = lerp(yawHero, -.25 + Math.sin(t * .12) * .25, pull) + ptr.x * .7 * idle;
    let pitch = lerp(0, .68, pull) + ptr.y * .25 * idle;
    const dist = lerp(1.9, portrait ? 9.4 : 7.2, pull);
    const tgt = [lerp(p0[0], 0, pull), lerp(p0[1], 0, pull), lerp(p0[2], 0, pull)];
    const scale = (portrait ? W * .42 : Math.min(W * .3, H * .5)) * lerp(portrait ? 1.5 : 2.1, 1, pull);
    return { proj: U.camera({ yaw, pitch, dist, scale, cx: W / 2, cy: H * .5 }), tgt, yaw, pitch };
  }

  return {
    name: 'Feed', service: 'Social media and content',
    pitch: 'One post, alone in the dark, deals itself out into an endless figure-of-eight ribbon of posts that races past the camera. Then the ribbon slams to a stop and a single post steps forward, glowing: the one that stopped the scroll.',
    tech: 'Canvas 2D: ten generated post textures affine-mapped onto cards riding an arc-length-parameterised lemniscate, banked like a rollercoaster, painter-sorted by depth. Depth of field comes from swapping in a tiny version of each texture when a card is out of focus, and fast flow leaves motion-blur ghosts.',
    ground: 'Dark in both page themes, so the posts carry the colour.',
    duration: 10, stillT: 10.5, kind: '2d',
    beats: [['0.0 s', 'One post, face-on, a sheen of light crossing it.'], ['1.1 s', 'The camera pulls back as the post deals out a ribbon in both directions.'], ['3.1 s', 'The feed starts to flow and accelerates to a blur.'], ['6.0 s', 'A hard stop. One post steps forward and lights up.'], ['7.4 s', 'It slides back into line; the flow resumes, slowly.'], ['10.0 s', 'Idle: pointer orbits and pushes the flow; tap to pull a post forward.']],
    init() { buildPath(); for (let i = 0; i < NT; i++) { hi.push(tex(i)); lo.push(small(hi[i], .16)); }
      back = document.createElement('canvas'); back.width = TW; back.height = TH; const g = back.getContext('2d'); const bgr = g.createLinearGradient(0, 0, TW, TH); bgr.addColorStop(0, '#1a1a6a'); bgr.addColorStop(1, '#07072a'); g.fillStyle = bgr; g.beginPath(); U.roundRect(g, 0, 0, TW, TH, 22); g.fill(); g.strokeStyle = 'rgba(160,170,255,.35)'; g.lineWidth = 2; g.stroke(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); U.roundRect(g, 30, 40, 120, 12, 6); g.fill(); backLo = small(back, .16);
      glowO = U.glowSprite(64, [255, 110, 20], 1.6); },
    reset() { st = { s: 0, heroS: 0, pop: -1, popT: -9, boost: 0 }; },
    onTap(x, y, env, t) { if (t > 9) { st.popReq = { x, y }; } },
    sim(t, dt, env) {
      const { ptr } = env;
      st.boost = lerp(st.boost, Math.abs(ptr.vx) * 1.4 * (t > 9 ? 1 : 0), 1 - Math.exp(-dt * 3));
      st.s += (speedAt(t) + st.boost) * dt;
      if (t >= 6.0 && st.pop < 0) { st.pop = pickFront(t, env); st.popT = 6.05; window.__feedpop = st.pop; }
      if (st.popReq) { st.pop = pickFront(t, env, st.popReq); st.popT = t; st.popReq = null; }
    },
    frame(t, dt, env) {
      const { ctx, W, H, dpr } = env;
      const g = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .5, Math.max(W, H) * .8);
      g.addColorStop(0, '#0b0b4a'); g.addColorStop(.6, '#030326'); g.addColorStop(1, '#010110');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const cam = camAt(t, env);
      const cards = layoutCards(t, cam, env);
      const speed = speedAt(t) + st.boost;
      const focusZ = cards.focus;
      cards.list.sort((a, b) => b.z - a.z);
      for (const c of cards.list) {
        if (c.vis <= 0.01) continue;
        const blur = clamp(Math.abs(c.z - focusZ) / 3.2);
        const img = blur > .45 ? lo[c.tex] : hi[c.tex];
        const fog = 1 - clamp((c.z - focusZ - 1) / 7) * .7;
        if (c.pop > 0) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'lighter'; const s = c.size * 1.3 * c.pop; ctx.globalAlpha = .8 * c.pop; ctx.drawImage(glowO, c.cx - s, c.cy - s, s * 2, s * 2); ctx.globalCompositeOperation = 'source-over'; }
        // motion blur ghosts along the flow
        if (speed > .8 && !c.pop) {
          ctx.globalAlpha = c.vis * fog * .18 * clamp((speed - .8) / 1.5);
          for (const k of [1, 2]) U.mapImage(ctx, img, c.g[k][0], c.g[k][1], c.g[k][2], dpr);
        }
        ctx.globalAlpha = c.vis * fog;
        U.mapImage(ctx, img, c.p0, c.p1, c.p3, dpr);
        if (!c.front) { /* back face already dark */ }
        ctx.globalAlpha = 1;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // sheen across the hero card at the start
      if (t < 1.4) { const k = seg(t, .2, 1.2); const x = lerp(-W * .2, W * 1.2, E.inOutCubic(k)); const sg = ctx.createLinearGradient(x - 80, 0, x + 80, H * .3); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, `rgba(255,255,255,${.12 * Math.sin(Math.PI * k)})`); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); }
    }
  };

  function layoutCards(t, cam, env) {
    const n = Math.floor(total / (CW + GAP)), step = total / n;
    const out = [];
    const reveal = t < 1.1 ? 0 : E.inOutCubic(seg(t, 1.1, 3.4)) * total * .5 + .01;
    let focus = 1e9;
    const q = {};
    const pr = (x, y, z) => cam.proj(x - cam.tgt[0], y - cam.tgt[1], z - cam.tgt[2], {});
    for (let i = 0; i < n; i++) {
      let base = i * step; const s = base + st.s;
      const u = uAt(s), p = P(u), p2 = P(u + .002);
      let tx = p2[0] - p[0], ty = p2[1] - p[1], tz = p2[2] - p[2]; const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
      // up vector banked around the tangent
      const bank = .35 * Math.sin(u * 2);
      let ux = 0, uy = 1, uz = 0; const d = ux * tx + uy * ty + uz * tz; ux -= d * tx; uy -= d * ty; uz -= d * tz; const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
      let nx = ty * uz - tz * uy, ny = tz * ux - tx * uz, nz = tx * uy - ty * ux;
      const cb = Math.cos(bank), sb = Math.sin(bank);
      const ux2 = ux * cb + nx * sb, uy2 = uy * cb + ny * sb, uz2 = uz * cb + nz * sb; nx = nx * cb - ux * sb; ny = ny * cb - uy * sb; nz = nz * cb - uz * sb;
      // distance along the ribbon from the hero card (index 0)
      const di = Math.min(i, n - i) * step;
      let vis = i === 0 ? ss(0, .5, t) : ss(0, .4, (reveal - di) / .6);
      // popped card
      let pop = 0;
      if (i === st.pop) { const k = t - st.popT; pop = ss(0, .35, k) * (1 - ss(1.1, 1.6, k)); if (t > 9) pop = ss(0, .35, k) * (1 - ss(1.8, 2.4, k)); }
      const cp = [p[0], p[1], p[2]];
      const hw = CW / 2 * (1 + .4 * pop), hh = CH / 2 * (1 + .4 * pop);
      // step towards the camera along the side facing it
      const cc = pr(cp[0], cp[1], cp[2]); const cn = pr(cp[0] + nx * .01, cp[1] + ny * .01, cp[2] + nz * .01);
      const faceSign = cn.z < cc.z ? 1 : -1;
      const lift = .9 * E.outBack(clamp(pop), 1.4) * faceSign;
      cp[0] += nx * lift; cp[1] += ny * lift + .15 * pop; cp[2] += nz * lift;
      const corner = (a, b) => pr(cp[0] + tx * a * hw + ux2 * b * hh, cp[1] + ty * a * hw + uy2 * b * hh, cp[2] + tz * a * hw + uz2 * b * hh);
      // choose orientation so the texture reads the right way round
      const front = faceSign < 0;
      const p0 = front ? corner(-1, 1) : corner(1, 1), p1 = front ? corner(1, 1) : corner(-1, 1), p3 = front ? corner(-1, -1) : corner(1, -1);
      const c0 = pr(cp[0], cp[1], cp[2]);
      if (c0.z < .3) continue;
      const gh = [];
      for (const k of [1, 2]) { const off = -k * .07; gh[k] = [p0, p1, p3].map(pp => ({ x: pp.x + (c0.x - pr(cp[0] - tx * off, cp[1] - ty * off, cp[2] - tz * off).x), y: pp.y + (c0.y - pr(cp[0] - tx * off, cp[1] - ty * off, cp[2] - tz * off).y) })); }
      if (i === 0 && t < 3) focus = c0.z;
      out.push({ i, tex: i % NT, p0, p1, p3, z: c0.z, cx: c0.x, cy: c0.y, size: Math.hypot(p1.x - p0.x, p1.y - p0.y), front, vis, pop, g: gh });
    }
    if (focus > 1e8) { focus = Math.min(...out.map(c => c.z)) + 1.6; }
    // dim everything else while a card is popped
    const popped = out.find(c => c.pop > 0);
    if (popped) for (const c of out) if (c !== popped) c.vis *= 1 - .55 * popped.pop;
    return { list: out, focus };
  }
  function pickFront(t, env, at) {
    const cam = camAt(t, env); const cs = layoutCards(t, cam, env).list.filter(c => c.vis > .5);
    if (at) { cs.sort((a, b) => Math.hypot(a.cx - at.x, a.cy - at.y) - Math.hypot(b.cx - at.x, b.cy - at.y)); return cs.length ? cs[0].i : -1; }
    const W = env.W, H = env.H;
    cs.sort((a, b) => (a.z + Math.hypot(a.cx - W / 2, a.cy - H / 2) / 300) - (b.z + Math.hypot(b.cx - W / 2, b.cy - H / 2) / 300));
    return cs.length ? cs[0].i : -1;
  }
})());
