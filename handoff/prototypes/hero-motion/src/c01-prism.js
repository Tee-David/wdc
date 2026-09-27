/* 01 PRISM: brand identity. One card fans open into a swatch book, then breaks rank into a brand board. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU } = U;
  const DEG = Math.PI / 180;
  // the parts of the identity, bottom of the deck first; the mark is on top so it is what you see first
  const CARDS = [
    { name: 'Navy', hex: '#000065', col: '#000065', ink: '#ffffff' },
    { name: 'Electric', hex: '#3B3BFF', col: '#3b3bff', ink: '#ffffff' },
    { name: 'Ink', hex: '#0A0A0A', col: '#0a0a0a', ink: '#ffffff' },
    { name: 'Paper', hex: '#F4F3EF', col: '#f4f3ef', ink: '#0a0a0a' },
    { name: 'Peach', hex: '#FFB27E', col: '#ffb27e', ink: '#0a0a0a' },
    { name: 'Signal', hex: '#FF6500', col: '#ff6500', ink: '#0a0a0a' },
    { name: 'Space Grotesk', hex: 'Display', col: '#ffffff', ink: '#000065', type: '"Space Grotesk"', w: 600 },
    { name: 'Outfit', hex: 'Text', col: '#e9e7ff', ink: '#000065', type: 'Outfit', w: 400 },
    { name: 'The mark', hex: 'WDC.', col: '#000065', ink: '#ffffff', logo: true },
  ];
  const NC = CARDS.length;
  // board position of each card (col,row) so the grid reads as a designed board, not deck order
  const SLOT = [[0, 1], [1, 1], [2, 2], [2, 1], [1, 2], [0, 2], [1, 0], [2, 0], [0, 0]];
  let lift = new Float32Array(NC), taps = [];

  /* canonical choreography time: 0 drop, .9 fan, 2.7 riffle, 4.5 to the board, 6.2 labels */
  const CYC = 16, IDLE0 = 9.6;
  function clock(t) {
    if (t < IDLE0) return { tau: t, gather: 0 };
    let c = (t - IDLE0) % CYC;
    const tapAt = taps.length ? taps[taps.length - 1] : -1e9;
    if (t - tapAt < 7.4 && t >= tapAt) c = 8 + (t - tapAt); // a tap runs the re-deal now
    if (c < 8) return { tau: 9, gather: 0 };
    if (c < 9.2) return { tau: 9, gather: E.inOutCubic(seg(c, 8, 9.2)), gk: seg(c, 8, 9.2) };
    return { tau: .9 + (c - 9.2), gather: 1, replay: true };
  }
  function geom(env) {
    const { W, H, portrait } = env;
    const m = Math.min(W, H * (portrait ? 1 : 1.08));
    const tile = m * (portrait ? .27 : .24), gap = m * .03;
    const sw = m * (portrait ? .15 : .14), sh = m * (portrait ? .56 : .6);
    const spread = portrait ? 46 : 56;
    return { m, tile, gap, sw, sh, spread, cx: W / 2, cy: H * .5, px: W / 2, py: H * .5 + sh * .46 };
  }
  function deckPose(G, k) { const th = (k - NC / 2) * .35 * DEG; const d = G.sh / 2 - G.sw * .38; return { x: G.px + Math.sin(th) * d, y: G.py - Math.cos(th) * d, th, w: G.sw, h: G.sh, z: k * .6 }; }
  function fanPose(G, k, extra = 0, push = 0) {
    const th = (lerp(-G.spread, G.spread, k / (NC - 1)) + extra) * DEG; const d = G.sh / 2 - G.sw * .38 + push;
    return { x: G.px + Math.sin(th) * d, y: G.py - Math.cos(th) * d, th, w: G.sw, h: G.sh, z: k * .6 };
  }
  function boardPose(G, k) {
    const [c, r] = SLOT[k]; const step = G.tile + G.gap;
    return { x: G.cx + (c - 1) * step, y: G.cy + (r - 1) * step, th: 0, w: G.tile, h: G.tile, z: 0 };
  }
  const mixPose = (a, b, e) => ({ x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), th: lerp(a.th, b.th, e), w: lerp(a.w, b.w, e), h: lerp(a.h, b.h, e), z: lerp(a.z, b.z, e) });
  function pose(G, k, tau, gather, replay, gk) {
    let p;
    const fanK = E.outBack(seg(tau, .9 + k * .07, 1.9 + k * .07), 1.25);
    const riffle = Math.exp(-Math.pow((tau - 2.8 - k * .15) / .2, 2));
    const toB = E.inOutCubic(seg(tau, 4.5 + (NC - 1 - k) * .07, 5.7 + (NC - 1 - k) * .07));
    const fan = fanPose(G, k, riffle * 6, riffle * G.sh * .05);
    p = mixPose(deckPose(G, k), fan, fanK);
    p.z += riffle * 18;
    if (toB > 0) { p = mixPose(p, boardPose(G, k), toB); p.z += Math.sin(Math.PI * toB) * 60; }
    if (gather > 0 && !replay) { const e = E.inOutCubic(clamp(gk * 1.6 - k * .07)); p = mixPose(boardPose(G, k), deckPose(G, k), e); p.z += Math.sin(Math.PI * e) * 50; }
    return p;
  }
  const labelK = (tau, gather, replay) => (replay ? ss(6.2, 7.4, tau) : ss(6.2, 7.4, tau)) * (gather > 0 && !replay ? 1 - ss(0, .35, gather) : 1);

  function drawCard(ctx, c, w, h, lk, dark, rimA) {
    const r = Math.min(w, h) * .07;
    ctx.beginPath(); U.roundRect(ctx, 0, 0, w, h, r);
    ctx.fillStyle = c.col; ctx.fill();
    ctx.save(); ctx.clip();
    const bh = Math.min(h * .3, w * .6), by = h - bh;
    const fs = clamp(Math.min(w, h) * .105, 9, 15);
    if (c.type) {
      ctx.fillStyle = c.ink; ctx.font = `${c.w} ${Math.min(w * .5, h * .42)}px ${c.type}, sans-serif`; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Aa', w * .1, Math.min(by - h * .08, w * .1 + Math.min(w * .5, h * .42) * .9));
    }
    if (c.logo) {
      const ls = Math.min(w * .25, h * .2);
      ctx.fillStyle = '#ffffff'; ctx.font = `700 ${ls}px "Space Grotesk", sans-serif`; ctx.textBaseline = 'alphabetic';
      const tw = ctx.measureText('WDC').width; const lx = w * .1, ly = Math.min(by - h * .1, w * .12 + ls);
      ctx.fillText('WDC', lx, ly); ctx.fillStyle = '#ff6500'; ctx.fillRect(lx + tw + ls * .06, ly - ls * .18, ls * .18, ls * .18);
    }
    // label band
    ctx.fillStyle = c.col === '#ffffff' ? '#f4f3ef' : '#ffffff'; ctx.fillRect(0, by, w, bh);
    if (lk > .01) {
      ctx.globalAlpha = lk; ctx.fillStyle = '#0b0b1c'; ctx.textBaseline = 'alphabetic';
      ctx.font = `500 ${fs}px Outfit, sans-serif`; ctx.fillText(fit(ctx, c.name, w * .82), w * .09, by + bh * .42);
      ctx.font = `500 ${fs * .9}px "Space Grotesk", sans-serif`; ctx.fillStyle = '#4a4a5e';
      const hx = c.hex; ctx.fillText(hx.slice(0, Math.max(1, Math.round(hx.length * ss(0, 1, lk)))), w * .09, by + bh * .78);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // edge: light cards need a line on a light ground; everything gets a faint rim on the dark one
    ctx.beginPath(); U.roundRect(ctx, .5, .5, w - 1, h - 1, r);
    ctx.lineWidth = 1; ctx.strokeStyle = dark ? `rgba(255,255,255,${rimA})` : 'rgba(10,10,40,.12)'; ctx.stroke();
  }
  const fitCache = new Map();
  function fit(ctx, s, max) { if (ctx.measureText(s).width <= max) return s; let t = s; while (t.length > 2 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; }

  return {
    name: 'Prism', service: 'Brand identity', short: 'Branding',
    pitch: 'One card, the mark, drops onto the table and fans open into a swatch book: navy, electric blue, ink, paper, peach, signal orange, two typefaces. It riffles like a designer thumbing for the right colour, then breaks rank and lays itself out as a brand board with names and values. Identity as a system you can hold, not a logo on its own.',
    fix: 'Rebuilt from scratch so it is its own idea: no beam, no triangle, no spectrum. The refraction survives only as a metaphor (one card splitting into its colours). Designed for both grounds: real card shadows on paper, a faint rim on navy. The loop re-deals from the board and ends on the board, so the seam is a hold, not a cut. Tap to re-deal.',
    tech: 'Canvas 2D. Each card is drawn procedurally (colour, label band, live type) under an affine transform from a light perspective camera, so it can morph from a tall swatch strip to a square tile in one motion. Poses are pure functions of time, so any frame can be rendered cold.',
    duration: 9.5, stillT: 9.4, cue: .7, focus: [.5, .5], kind: '2d',
    beats: [['0.0 s', 'The mark drops onto the table as the top card of a deck.'], ['0.9 s', 'The deck fans open around its rivet, card by card, with a little overshoot.'], ['2.7 s', 'A riffle runs through the fan, like a thumb looking for the right colour.'], ['4.5 s', 'The fan breaks rank: every card flies to its place on a board and squares up.'], ['6.2 s', 'Names and values type onto the labels.'], ['9.6 s', 'Idle: the board tilts to the pointer and the card under it lifts; every sixteen seconds (or on a tap) it gathers and re-deals.']],
    init() {},
    reset() { lift = new Float32Array(NC); taps = []; },
    onTap(x, y, env, t) { if (t > IDLE0) taps.push(t); },
    frame(t, dt, env) {
      const { ctx, W, H, dpr, ptr, dark } = env;
      U.ground(ctx, env);
      const G = geom(env);
      const ck = clock(t), tau = ck.tau;
      const idle = ss(8.6, 10, t) * (ck.gather > 0 ? 0 : 1);
      const lk = labelK(tau, ck.gather, ck.replay);
      const drop = t < 1 ? E.outBack(seg(t, 0, .7), 1.4) : 1;
      const yaw = (ptr.x * 9 * idle + Math.sin(t * .35) * 2.2 * idle) * DEG, pitch = (-ptr.y * 7 * idle + 10 * (1 - ss(4.5, 6, tau)) * (ck.replay ? 0 : 1)) * DEG;
      const cam = U.camera({ yaw, pitch, dist: 1800, scale: 1, cx: G.cx, cy: G.cy });
      const pr = (x, y, z) => cam(x - G.cx, G.cy - y, -z, {});
      // which board tile is under the pointer
      let hover = -1;
      if (idle > .5 && ptr.inside && ptr.rpx > -1e3) for (let k = 0; k < NC; k++) { const b = boardPose(G, k); if (Math.abs(ptr.rpx - b.x) < b.w / 2 && Math.abs(ptr.rpy - b.y) < b.h / 2) hover = k; }
      const a = 1 - Math.exp(-(dt || 0) * 10);
      for (let k = 0; k < NC; k++) lift[k] += ((k === hover ? 1 : 0) - lift[k]) * (dt ? a : 1);

      const poses = [];
      for (let k = 0; k < NC; k++) { const p = pose(G, k, tau, ck.gather, ck.replay, ck.gk || 0); p.z += lift[k] * 26; if (t < 1) { p.z += (1 - drop) * 120; } poses.push({ k, p }); }
      if (t < .75) { /* only the top of the deck is visible while it drops */ }
      poses.sort((A, B) => A.p.z - B.p.z || A.k - B.k);
      const shadowC = dark ? 'rgba(0,0,10,' : 'rgba(20,20,60,';
      for (const { k, p } of poses) {
        const c = CARDS[k];
        const s = Math.sin(p.th), co = Math.cos(p.th);
        const hw = p.w / 2, hh = p.h / 2;
        const corner = (lx, ly) => pr(p.x + lx * co - ly * s, p.y + lx * s + ly * co, p.z);
        const p0 = corner(-hw, -hh), p1 = corner(hw, -hh), p3 = corner(-hw, hh);
        const alpha = t < .7 ? (k === NC - 1 ? ss(0, .25, t) : ss(.5, .75, t)) : 1;
        if (alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.setTransform(dpr * (p1.x - p0.x) / p.w, dpr * (p1.y - p0.y) / p.w, dpr * (p3.x - p0.x) / p.h, dpr * (p3.y - p0.y) / p.h, dpr * p0.x, dpr * p0.y);
        const zl = 1 + p.z / 40;
        ctx.shadowColor = shadowC + (dark ? .55 : .2) + ')'; ctx.shadowBlur = (8 + 10 * Math.min(3, zl)) * dpr; ctx.shadowOffsetY = (3 + 4 * Math.min(3, zl)) * dpr;
        ctx.beginPath(); U.roundRect(ctx, 0, 0, p.w, p.h, Math.min(p.w, p.h) * .07); ctx.fillStyle = c.col; ctx.fill();
        ctx.shadowColor = 'transparent';
        drawCard(ctx, c, p.w, p.h, lk, dark, .1 + .1 * lift[k]);
        ctx.restore();
      }
      // the rivet, while the deck is bound
      const bound = (1 - E.inOutCubic(seg(tau, 4.5, 5.2))) * (ck.gather > 0 && !ck.replay ? ss(.7, 1, ck.gather) : 1) * ss(.3, .7, t);
      if (bound > .01) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const q = pr(G.px, G.py, 14), r = Math.max(6, G.sw * .2);
        ctx.globalAlpha = bound;
        const rg = ctx.createRadialGradient(q.x - r * .35, q.y - r * .35, r * .1, q.x, q.y, r);
        rg.addColorStop(0, '#ffffff'); rg.addColorStop(.55, '#c9c8d6'); rg.addColorStop(1, '#6b6b85');
        ctx.shadowColor = 'rgba(0,0,20,.35)'; ctx.shadowBlur = 6 * dpr; ctx.shadowOffsetY = 2 * dpr;
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ff6500'; ctx.beginPath(); ctx.arc(q.x, q.y, r * .32, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  };
})());
