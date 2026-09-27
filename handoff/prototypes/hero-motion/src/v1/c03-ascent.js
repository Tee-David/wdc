/* 03 ASCENT: SEO. A signal climbs a lattice of pages to the one position that matters. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU, rng } = U;
  const LC = 9;
  let nodes = [], layers = [], edges = [], path = [], pathT = [], rivals = [], glowO, glowW;

  const G = 5, NL = 8, MID = 2;
  let XS = 1, YS = 1, builtP = null;
  function build() {
    const r = rng(11); nodes = []; layers = []; edges = [];
    const idAt = (i, gx, gz) => i * G * G + gz * G + gx;
    for (let i = 0; i < NL; i++) {
      const ids = [];
      for (let gz = 0; gz < G; gz++) for (let gx = 0; gx < G; gx++) {
        nodes.push({ i, gx, gz, x: lerp(-1, 1, gx / (G - 1)) * XS, z: lerp(-1, 1, gz / (G - 1)), y: lerp(-1.25, 1.0, i / (NL - 1)) * YS, jx: (r() - .5), jy: (r() - .5), jz: (r() - .5), ph: r() * TAU, out: [], up: r() < .3 });
        ids.push(nodes.length - 1);
      }
      layers.push(ids);
    }
    nodes.push({ i: NL, gx: MID, gz: MID, x: 0, z: 0, y: 1.0 * YS + .6, jx: 0, jy: 0, jz: 0, ph: 0, out: [], up: false }); layers.push([nodes.length - 1]);
    const APEX = nodes.length - 1;
    for (let i = 0; i < NL; i++) for (let gz = 0; gz < G; gz++) for (let gx = 0; gx < G; gx++) {
      const id = idAt(i, gx, gz), n = nodes[id];
      if (gx < G - 1) { edges.push([id, idAt(i, gx + 1, gz)]); }
      if (gz < G - 1) { edges.push([id, idAt(i, gx, gz + 1)]); }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = gx + dx, z = gz + dz; if (x >= 0 && x < G && z >= 0 && z < G) n.out.push(idAt(i, x, z)); }
      if (i < NL - 1) { n.out.push(idAt(i + 1, gx, gz)); n.out.push(idAt(i + 1, gx, gz)); if (n.up) edges.push([id, idAt(i + 1, gx, gz), 1]); }
    }
    // hero path: from a far corner, one sideways step per layer toward the centre, with a dead end on layer 5
    const rp = rng(4); let gx = 0, gz = G - 1, i = 0; path = [idAt(0, gx, gz)];
    const step = () => { if (gx !== MID && (gz === MID || rp() < .6)) gx += Math.sign(MID - gx); else if (gz !== MID) gz += Math.sign(MID - gz); path.push(idAt(i, gx, gz)); };
    for (i = 0; i < NL; i++) {
      if (i > 0) path.push(idAt(i, gx, gz));
      if (i % 2 === 0) step();
      if (i === 4) { DS = path.length; path.push(idAt(i, Math.min(G - 1, gx + 1), gz)); path.push(idAt(i, Math.min(G - 1, gx + 2), gz)); path.push(idAt(i, Math.min(G - 1, gx + 1), gz)); path.push(idAt(i, gx, gz)); }
    }
    i = NL - 1; while (gx !== MID || gz !== MID) step();
    path.push(APEX);
    DEAD = DS + 1;
    pathT = []; let tt = 2.5;
    for (let k = 0; k < path.length; k++) { pathT.push(tt); const f = k / path.length; tt += lerp(.3, .1, E.inQuad(f)) + (k === DEAD ? .45 : 0) + (k === path.length - 2 ? .25 : 0); }
    rivals = [];
    for (let s = 0; s < 26; s++) {
      const rr = rng(100 + s); let c = layers[0][Math.floor(rr() * layers[0].length)]; const p = [c]; const hops = 3 + Math.floor(rr() * 8);
      for (let h = 0; h < hops; h++) { const o = nodes[c].out; c = o[Math.floor(rr() * o.length)]; p.push(c); }
      rivals.push({ p, t0: 1.4 + rr() * 5.5, hop: .16 + rr() * .14, period: 5 + rr() * 5 });
    }
  }
  let DEAD = 0, DS = 0;
  function sparkAt(t) { // position index along the hero path
    if (t < pathT[0]) return -1;
    for (let k = 0; k < path.length - 1; k++) if (t < pathT[k + 1]) return k + E.inOutCubic((t - pathT[k]) / (pathT[k + 1] - pathT[k]));
    return path.length - 1;
  }

  return {
    name: 'Ascent', service: 'SEO',
    pitch: 'Eight stacked planes of pages, and one signal of light that climbs it, hop by hop and layer by layer, loses its way once, recovers and takes the single point above them all. When it lands, the whole lattice snaps into order: ranking as the moment chaos becomes structure.',
    tech: 'Canvas 2D point-and-line lattice in true perspective with depth-graded dots (a cheap depth of field), a scripted path with a dead end and a backtrack, rival signals that fade out, and a shock ring on arrival. Constant spin is the only linear motion.',
    ground: 'Dark in both page themes, because the signal is light.',
    duration: 10, stillT: 11, kind: '2d',
    beats: [['0.0 s', 'Eight planes of pages rise from the fog, out of order.'], ['1.6 s', 'Rival signals start climbing and fading.'], ['2.5 s', 'Our signal leaves the base and climbs, accelerating.'], ['5.3 s', 'It hits a dead end, hesitates, backtracks, finds the way.'], ['7.4 s', 'It takes the top: flash, shock ring, and every node snaps into order.'], ['8.3 s', 'The winning path glows all the way down.'], ['10.0 s', 'Idle: new signals climb; the pointer orbits the stack.']],
    init() { build(); glowO = U.glowSprite(64, [255, 120, 30], 1.8); glowW = U.glowSprite(64, [210, 220, 255], 2.2); },
    reset(env) { if (builtP !== env.portrait) { builtP = env.portrait; XS = env.portrait ? 1 : 1.35; YS = env.portrait ? 1 : .8; build(); } },
    frame(t, dt, env) {
      const { ctx, W, H, ptr, portrait } = env;
      if (builtP !== portrait) this.reset(env);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#010114'); g.addColorStop(.55, '#050538'); g.addColorStop(1, '#0d0d5a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      const tTop = pathT[path.length - 1];
      const order = t < tTop ? 0 : E.outElastic(seg(t, tTop, tTop + 1.4));
      const idle = ss(9, 11, t);
      const sk = sparkAt(t);
      const sparkY = sk < 0 ? -1.05 : (() => { const k = Math.floor(sk), f = sk - k, a = nodes[path[k]], b = nodes[path[Math.min(path.length - 1, k + 1)]]; return lerp(a.y, b.y, f); })();
      const camY = lerp(lerp(-.5, sparkY * .4, ss(2.4, 4, t)), portrait ? .2 : .42, ss(tTop - .5, tTop + 1.8, t));
      const yaw = t * .16 + ptr.x * .9 * idle + .6;
      const pitch = lerp(.05, .42, E.inOutCubic(seg(t, 0, 8))) + ptr.y * .22 * idle;
      const scale = (portrait ? Math.min(W * .3, H * .26) : Math.min(H * .36, W * .24)) * lerp(1.15, 1, E.inOutCubic(seg(t, 0, 8)));
      const proj = U.camera({ yaw, pitch, dist: 4.2, scale, cx: W / 2, cy: H * (portrait ? .5 : .55) });
      const dis = 1 - order;
      const P = nodes.map(n => {
        const w = Math.sin(t * .8 + n.ph) * .015;
        const x = n.x + n.jx * dis * .14 + w, z = n.z + n.jz * dis * .14;
        const y = n.y + n.jy * dis * .12 - camY;
        const p = proj(x, y, z, {}); p.rise = ss(0, 1, (t - .1 - n.i * .12) / .9); return p;
      });
      // rise from the fog
      P.forEach((p, k) => { p.y += (1 - E.outCubic(p.rise)) * H * .25; });
      const zN = z => clamp((z - 3.3) / 2.2); // 0 near .. 1 far

      // lit state per edge key
      const lit = new Map();
      const heroLit = (a, b, s) => { const key = a < b ? a + ',' + b : b + ',' + a; lit.set(key, Math.max(lit.get(key) || 0, s)); };
      for (let k = 0; k < Math.min(path.length - 1, Math.floor(sk)); k++) {
        const dead = k >= DS - 1 && k <= DS + 2;
        const age = t - pathT[k + 1];
        heroLit(path[k], path[k + 1], dead ? Math.max(0, 1 - age / .6) * .8 : 1);
      }
      // cascade down after the top
      const cascade = t > tTop ? seg(t, tTop, tTop + 1) : 0;

      ctx.lineCap = 'round';
      // edges
      for (const [a, b, v] of edges) {
        const pa = P[a], pb = P[b]; const r = Math.min(pa.rise, pb.rise); if (r <= 0) continue;
        const d = zN((pa.z + pb.z) / 2);
        ctx.strokeStyle = `rgba(150,160,255,${(v ? .16 : .08 + .16 * (1 - d)) * r * lerp(.8, 1.3, order)})`; ctx.lineWidth = v ? .7 : .8;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      // hero trail
      lit.forEach((s, key) => {
        const [a, b] = key.split(',').map(Number); const pa = P[a], pb = P[b];
        const layerF = 1 - nodes[Math.max(a, b)].i / LC; const boost = cascade > 0 ? Math.exp(-Math.pow((layerF - cascade) * 5, 2)) * 1.4 : 0;
        for (const [w, al] of [[6, .08], [2.4, .35], [1, .9]]) { ctx.strokeStyle = `rgba(255,${110 + 60 * boost},${30 + 40 * boost},${al * clamp(s + boost)})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); }
      });
      // rivals
      for (const rv of rivals) {
        let lt = t - rv.t0; if (t > 8) lt = ((t - rv.t0) % rv.period + rv.period) % rv.period; if (lt < 0) continue;
        const pos = lt / rv.hop; if (pos > rv.p.length + 1.5) continue;
        const k = Math.min(rv.p.length - 1, Math.floor(pos)), f = E.inOutCubic(clamp(pos - k)), fade = 1 - ss(rv.p.length - 1, rv.p.length + 1.5, pos);
        const a = P[rv.p[k]], b = P[rv.p[Math.min(rv.p.length - 1, k + 1)]];
        const x = lerp(a.x, b.x, f), y = lerp(a.y, b.y, f); const s = 10;
        ctx.globalAlpha = .55 * fade * (1 - order * .6); ctx.drawImage(glowW, x - s, y - s, s * 2, s * 2);
        for (let h = Math.max(0, k - 2); h < k; h++) { const p1 = P[rv.p[h]], p2 = P[rv.p[h + 1]]; ctx.strokeStyle = `rgba(190,200,255,${.25 * fade})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      // idle climbers
      if (t > tTop + 2) {
        const per = 3.8, c = Math.floor((t - tTop - 2) / per), lt = (t - tTop - 2) % per;
        const rr = rng(500 + c); let id = layers[0][Math.floor(rr() * layers[0].length)]; const p = [id];
        while (nodes[id].i < NL - 1) { const n = nodes[id]; const o = n.out; id = rr() < .55 ? o[o.length - 1] : o[Math.floor(rr() * (o.length - 2))]; p.push(id); }
        const pos = E.inOutCubic(clamp(lt / 2.2)) * (p.length - 1); if (p.length < 2) p.push(p[0]);
        for (let h = 0; h < Math.floor(pos); h++) { const a = P[p[h]], b = P[p[h + 1]]; ctx.strokeStyle = `rgba(255,120,40,${.45 * (1 - ss(2.2, 3.6, lt))})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        const k = Math.min(p.length - 2, Math.floor(pos)), f = pos - k, a = P[p[k]], b = P[p[k + 1]];
        if (lt < 2.3) { const s = 16; ctx.drawImage(glowO, lerp(a.x, b.x, f) - s, lerp(a.y, b.y, f) - s, s * 2, s * 2); }
      }
      ctx.globalCompositeOperation = 'source-over';
      // nodes, far to near
      const order2 = P.map((p, k) => k).sort((a, b) => P[b].z - P[a].z);
      for (const k of order2) {
        const p = P[k]; if (p.rise <= 0) continue; const d = zN(p.z);
        const top = nodes[k].i === LC - 1 && t > tTop;
        const r = (top ? 4 : .8 + 1.4 * (1 - d)) * p.k;
        const onPath = path.indexOf(k) >= 0 && path.indexOf(k) <= sk;
        ctx.fillStyle = onPath ? '#ffb07a' : `rgba(210,215,255,${(.25 + .6 * (1 - d)) * p.rise})`;
        if (d > .55 && !onPath) { ctx.globalAlpha = .4; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); }
      }
      ctx.globalCompositeOperation = 'lighter';
      // the spark
      if (sk >= 0 && sk < path.length - 1) {
        const k = Math.floor(sk), f = sk - k, a = P[path[k]], b = P[path[k + 1]];
        const x = lerp(a.x, b.x, f), y = lerp(a.y, b.y, f);
        const hes = k === DEAD ? .5 + .5 * Math.sin(t * 40) : 1;
        const s = 26 * hes; ctx.drawImage(glowO, x - s, y - s, s * 2, s * 2); ctx.drawImage(glowW, x - 6, y - 6, 12, 12);
        ctx.strokeStyle = 'rgba(255,200,150,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lerp(a.x, x, .4), lerp(a.y, y, .4)); ctx.lineTo(x, y); ctx.stroke();
      }
      // arrival
      const topP = P[layers[LC - 1][0]];
      if (t > tTop - .1) {
        const k = t - tTop;
        const flash = Math.exp(-k * 2.2) * (k > 0 ? 1 : 0);
        const pulse = t > tTop + 2 ? .5 + .5 * Math.sin(t * 2) : 1;
        const s = 30 + 140 * flash; ctx.globalAlpha = .6 + .4 * flash; ctx.drawImage(glowO, topP.x - s, topP.y - s, s * 2, s * 2);
        ctx.globalAlpha = .9 * pulse; ctx.drawImage(glowW, topP.x - 9, topP.y - 9, 18, 18); ctx.globalAlpha = 1;
        // shock rings: horizontal circles around the spire at the top's height
        const ringsAt = [tTop, tTop + .35];
        if (t > tTop + 2) { const per = 3.8; ringsAt.push(tTop + 2 + Math.floor((t - tTop - 2) / per) * per + 2.2); }
        for (const r0 of ringsAt) {
          const q = (t - r0) / 2.2; if (q < 0 || q > 1) continue;
          const rad = E.outCubic(q) * 2.4, al = (1 - q) * .8;
          ctx.strokeStyle = `rgba(255,140,60,${al})`; ctx.lineWidth = 1.5; ctx.beginPath();
          const yy = nodes[layers[LC - 1][0]].y - camY;
          for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; const p = proj(Math.cos(a) * rad, yy, Math.sin(a) * rad, {}); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      // fog at the base
      const fg = ctx.createLinearGradient(0, H * .6, 0, H);
      fg.addColorStop(0, 'rgba(10,10,80,0)'); fg.addColorStop(1, `rgba(12,12,90,${.75 - .25 * ss(0, 3, t)})`);
      ctx.fillStyle = fg; ctx.fillRect(0, H * .6, W, H * .4);
      // position label
      if (t > tTop + .4) {
        const a = ss(tTop + .4, tTop + 1.2, t);
        ctx.font = `600 ${Math.round(Math.max(13, scale * .06))}px "Space Grotesk", sans-serif`; ctx.fillStyle = `rgba(255,255,255,${a})`;
        const lx = topP.x + 26, ly = topP.y - 22;
        ctx.strokeStyle = `rgba(255,255,255,${a * .5})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(topP.x + 6, topP.y - 5); ctx.lineTo(lx - 4, ly + 4); ctx.lineTo(lx + 60 * a, ly + 4); ctx.stroke();
        ctx.fillText('01', lx, ly);
      }
    }
  };
})());
