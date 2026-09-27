/* 09 LOOM: content. Hundreds of threads, one shuttle of light, a story woven row by row. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU } = U;
  let C = 0, R = 0, pats = [], lastP = null, nodes;
  // colour ids: 0 ground weft, 1 white, 2 orange, 3 peach
  const COL = [
    ['#05052a', '#0b0b44', '#16166a'],   // ground weft (dark)
    ['#9c9cc0', '#d9d9ee', '#ffffff'],   // white
    ['#a33d00', '#e45a00', '#ff7a26'],   // orange
    ['#b98464', '#e8a67c', '#ffc9a3'],   // peach
  ];
  const WARP = ['#101050', '#1c1c78', '#2c2ca0'];

  function pattern(draw) {
    const c = document.createElement('canvas'); c.width = C; c.height = R; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, C, R); draw(g, C, R);
    const d = g.getImageData(0, 0, C, R).data, out = new Uint8Array(C * R);
    for (let i = 0; i < C * R; i++) { const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2]; if (r + gg + b < 200) continue; out[i] = (r > 200 && gg > 200 && b > 200) ? 1 : (gg < 140 ? 2 : 3); }
    return out;
  }
  function build(portrait) {
    C = portrait ? 66 : 150; R = portrait ? 104 : 62;
    const S = '"Space Grotesk", sans-serif';
    const bar = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    pats = [
      pattern((g, W, H) => { // an article: kicker, headline, image, paragraph lines
        const m = portrait ? 5 : 8;
        bar(g, m, m, portrait ? 16 : 22, 2, '#ff6500');
        g.fillStyle = '#fff'; g.font = `700 ${portrait ? 11 : 13}px ${S}`; g.textBaseline = 'top';
        g.fillText(portrait ? 'The long' : 'The long read,', m, m + 5); g.fillText(portrait ? 'read,' : 'woven by hand', m, m + (portrait ? 17 : 21)); if (portrait) g.fillText('by hand', m, m + 29);
        const imgX = portrait ? m : 106, imgY = portrait ? 48 : 8, imgW = portrait ? W - m * 2 : W - 114, imgH = portrait ? 24 : 26;
        bar(g, imgX, imgY, imgW, imgH, '#ffb27e'); g.fillStyle = '#ff6500'; g.beginPath(); g.arc(imgX + imgW * .7, imgY + imgH * .5, imgH * .32, 0, TAU); g.fill();
        const y0 = portrait ? 78 : 42; const cols = portrait ? 1 : 3, cw = (W - m * 2 - (cols - 1) * 6) / cols;
        for (let c = 0; c < cols; c++) for (let l = 0; l < (portrait ? 8 : 6); l++) { const w = cw * (l % 4 === 3 ? .55 : .92 - (l * 7 % 5) * .03); bar(g, m + c * (cw + 6), y0 + l * 3, w, 1, '#fff'); }
      }),
      pattern((g, W, H) => { // the wordmark
        g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
        if (!portrait) { g.font = `700 25px ${S}`; g.fillText('We Dig', 8, 27); g.fillText('Creativity', 8, 54); g.fillStyle = '#ff6500'; g.fillRect(8 + g.measureText('Creativity').width + 2, 49, 5, 5); }
        else { g.font = `700 30px ${S}`; g.fillText('We', 4, 34); g.fillText('Dig', 4, 64); g.font = `700 13px ${S}`; g.fillText('Creativity', 4, 84); g.fillStyle = '#ff6500'; g.fillRect(4, 92, 20, 3); }
      }),
      pattern((g, W, H) => { // a grid of posts
        const n = portrait ? 2 : 4, rows = portrait ? 3 : 1, m = 6, gw = (W - m * (n + 1)) / n, gh = portrait ? (H - m * 4) / 3 : H - m * 2;
        for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) { const x = m + i * (gw + m), y = m + r * (gh + m); const k = (i + r) % 3; bar(g, x, y, gw, gh * .72, ['#ff6500', '#fff', '#ffb27e'][k]); bar(g, x, y + gh * .78, gw * .8, 1, '#fff'); bar(g, x, y + gh * .88, gw * .5, 1, '#ffb27e'); }
      }),
      pattern((g, W, H) => { // a pull quote
        g.fillStyle = '#ff6500'; g.font = `700 ${portrait ? 48 : 60}px ${S}`; g.textBaseline = 'top'; g.fillText('“', portrait ? 2 : 6, portrait ? 0 : -6);
        const x0 = portrait ? 6 : 44; for (let l = 0; l < (portrait ? 7 : 5); l++) bar(g, x0, (portrait ? 40 : 12) + l * (portrait ? 7 : 9), (W - x0 - 8) * (l === 4 ? .5 : .95 - l * .04), portrait ? 3 : 4, '#fff');
      }),
    ];
  }
  function patAt(t) { // [from, to, progress of the reflow wave]
    if (t < 5.4) return [0, 0, 0];
    if (t < 9.4) return [0, 1, E.inOutCubic(seg(t, 5.4, 7.0))];
    const per = 7, k = Math.floor((t - 9.4) / per), lt = (t - 9.4) % per;
    const seq = [1, 2, 3, 0, 1];
    const from = seq[k % 4], to = seq[k % 4 + 1];
    return lt < 5 ? [from, from, 0] : [from, to, E.inOutCubic(seg(lt, 5, 6.8))];
  }

  return {
    name: 'Loom', service: 'Content',
    pitch: 'Warp threads pluck taut in the dark, then a single shuttle of orange light weaves an article, row by row, and the cloth reflows into the wordmark before it lifts and billows like fabric. Content as the slow craft of weaving many strands into one story.',
    tech: 'Canvas 2D: a projected grid of thousands of thread segments, each cell showing warp or weft by a pattern sampled from tiny offscreen layouts (article, wordmark, posts, quote). Segments are batched into a few paths per colour and light level, so it stays cheap; the cloth shading comes from the wave slope.',
    ground: 'Dark in both page themes; the threads carry the light.',
    duration: 9.4, stillT: 9.6, kind: '2d',
    beats: [['0.0 s', 'Warp threads pluck taut one by one, from the centre out, and ring.'], ['1.6 s', 'A shuttle of orange light starts weaving, slow, then fast.'], ['5.4 s', 'The article reflows into the wordmark on a diagonal wave.'], ['7.0 s', 'The cloth lifts off the loom and billows toward you.'], ['9.4 s', 'Idle: it ripples; every few seconds it re-weaves into posts, a quote, an article. The pointer presses into the cloth.']],
    init() {},
    reset(env) { if (lastP !== env.portrait) { build(env.portrait); lastP = env.portrait; } },
    frame(t, dt, env) {
      const { ctx, W, H, ptr, portrait } = env;
      if (lastP !== portrait) { build(portrait); lastP = portrait; }
      const g = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .5, Math.max(W, H) * .75);
      g.addColorStop(0, '#0a0a44'); g.addColorStop(.6, '#030324'); g.addColorStop(1, '#010110');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      const idle = ss(9, 10.5, t);
      const release = E.inOutCubic(seg(t, 7.0, 8.6));
      const cw = portrait ? W * .88 / C : Math.min(W * .84 / C, H * .78 / R);
      const Wc = C * cw, Hc = R * cw;
      const yaw = lerp(0, -.32, release) + ptr.x * .25 * idle, pitch = lerp(0, .38, release) - ptr.y * .15 * idle;
      const proj = U.camera({ yaw, pitch, roll: lerp(0, .05, release), dist: 1800, scale: lerp(1, .88, release), cx: W / 2, cy: H / 2 });
      const amp = release * cw * 5 + E.outCubic(seg(t, 7.6, 8.4)) * (1 - E.inOutCubic(seg(t, 8.4, 9.6))) * cw * 9;
      // pointer in cloth space (approximate: the cloth is near face-on)
      const pu = (ptr.spx - (W - Wc) / 2) / Wc, pv = (ptr.spy - (H - Hc) / 2) / Hc;
      const press = idle * (ptr.inside ? 1 : 0);
      const wave = (u, v) => {
        let z = amp * (Math.sin(u * 5.2 - t * 1.3 + v * 1.6) * .6 + Math.sin(v * 4.1 + t * .9 + u * 2.3) * .4);
        z += amp * .5 * Math.sin(u * 11 - t * 2.1) * v;
        if (press > 0) { const d2 = (u - pu) * (u - pu) * 4 + (v - pv) * (v - pv); z += press * cw * 14 * Math.exp(-d2 * 22); }
        return z;
      };
      // grid nodes
      if (!nodes || nodes.length !== (C + 1) * (R + 1) * 3) nodes = new Float32Array((C + 1) * (R + 1) * 3);
      const tmp = {};
      for (let j = 0; j <= R; j++) for (let i = 0; i <= C; i++) {
        const u = i / C, v = j / R, z = wave(u, v);
        // plucked warp strings in the opening
        let xo = 0;
        if (t < 3.2) { const order = Math.abs(i - C / 2) / (C / 2); const t0 = .1 + order * 1.1; const tau = t - t0; if (tau > 0) xo = Math.sin(Math.PI * v) * Math.exp(-tau * 3.5) * Math.sin(tau * 38) * cw * 1.6; }
        const p = proj((u - .5) * Wc + xo, (.5 - v) * Hc, z, tmp);
        const k = (j * (C + 1) + i) * 3; nodes[k] = p.x; nodes[k + 1] = p.y; nodes[k + 2] = z;
      }
      const N = (i, j) => (j * (C + 1) + i) * 3;
      const rowsWoven = R * E.inOutSine(seg(t, 1.6, 5.3));
      const [pf, pt, pk] = patAt(t); const A = pats[pf], B = pats[pt];
      // warp threads first (visible where nothing is woven yet)
      ctx.lineCap = 'butt';
      const warpIn = t < 1.8 ? null : 1;
      ctx.lineWidth = Math.max(.6, cw * .32); ctx.strokeStyle = WARP[1];
      ctx.beginPath();
      for (let i = 0; i < C; i++) {
        const order = Math.abs(i - C / 2) / (C / 2); const k = warpIn ? 1 : E.outCubic(seg(t, .1 + order * 1.1, .5 + order * 1.1));
        if (k <= 0) continue;
        const jStart = Math.floor(rowsWoven);
        const jEnd = Math.round(jStart + (R - jStart) * k);
        const a = N(i, jStart);
        ctx.moveTo((nodes[a] + nodes[N(i + 1, jStart)]) / 2, (nodes[a + 1] + nodes[N(i + 1, jStart) + 1]) / 2);
        for (let j = jStart + 1; j <= jEnd; j++) { const b = N(i, j), c = N(i + 1, j); ctx.lineTo((nodes[b] + nodes[c]) / 2, (nodes[b + 1] + nodes[c + 1]) / 2); }
      }
      ctx.stroke();
      // woven cells, batched by colour, light level and orientation
      const paths = []; for (let c = 0; c < 5; c++) { paths.push([]); for (let l = 0; l < 3; l++) paths[c].push([new Path2D(), new Path2D()]); }
      const full = Math.floor(rowsWoven);
      for (let j = 0; j < Math.min(R, full + 1); j++) {
        const partial = j === full ? rowsWoven - full : 1;
        const dir = j % 2 === 0;
        for (let i = 0; i < C; i++) {
          const uc = (i + .5) / C;
          if (partial < 1) { const pos = dir ? uc : 1 - uc; if (pos > partial) continue; }
          const idx = j * C + i;
          const wv = (uc + (j / R) * .6) / 1.6; const useB = pk > 0 && wv < pk * 1.02;
          const val = (useB ? B : A)[idx];
          // plain weave ground: alternate warp / weft; pattern floats the weft
          const warpUp = val === 0 && ((i + j) % 2 === 0);
          const col = warpUp ? 4 : val;
          const a = N(i, j), b = N(i + 1, j), c = N(i, j + 1), d = N(i + 1, j + 1);
          const slope = (nodes[b + 2] - nodes[a + 2] + nodes[d + 2] - nodes[c + 2]) - (nodes[c + 2] - nodes[a + 2]) * .6;
          const lv = slope > cw * .35 ? 2 : slope < -cw * .35 ? 0 : 1;
          const cx = (nodes[a] + nodes[d]) / 2, cy = (nodes[a + 1] + nodes[d + 1]) / 2;
          const p = paths[col][lv][warpUp ? 1 : 0];
          if (warpUp) { const tx = (nodes[c] - nodes[a]) * .42, ty = (nodes[c + 1] - nodes[a + 1]) * .42; p.moveTo(cx - tx, cy - ty); p.lineTo(cx + tx, cy + ty); }
          else { const tx = (nodes[b] - nodes[a]) * .46, ty = (nodes[b + 1] - nodes[a + 1]) * .46; p.moveTo(cx - tx, cy - ty); p.lineTo(cx + tx, cy + ty); }
        }
      }
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1, cw * .62);
      for (let c = 0; c < 5; c++) for (let l = 0; l < 3; l++) for (let o = 0; o < 2; o++) {
        ctx.strokeStyle = c === 4 ? WARP[l] : COL[c][l]; ctx.stroke(paths[c][l][o]);
      }
      // the shuttle
      if (t > 1.5 && t < 5.4) {
        const j = Math.min(R - 1, full), partial = rowsWoven - full, dir = j % 2 === 0; const u = dir ? partial : 1 - partial;
        const i = Math.min(C - 1, Math.floor(u * C)), a = N(i, j), c = N(i, Math.min(R, j + 1));
        const x = (nodes[a] + nodes[c]) / 2, y = (nodes[a + 1] + nodes[c + 1]) / 2;
        ctx.globalCompositeOperation = 'lighter';
        const tail = (dir ? -1 : 1) * cw * 26;
        const lg = ctx.createLinearGradient(x + tail, y, x, y); lg.addColorStop(0, 'rgba(255,110,20,0)'); lg.addColorStop(1, 'rgba(255,150,70,.9)');
        ctx.strokeStyle = lg; ctx.lineWidth = cw * .9; ctx.beginPath(); ctx.moveTo(x + tail, y); ctx.lineTo(x, y); ctx.stroke();
        const rg = ctx.createRadialGradient(x, y, 0, x, y, cw * 7); rg.addColorStop(0, 'rgba(255,200,150,.95)'); rg.addColorStop(.3, 'rgba(255,110,20,.45)'); rg.addColorStop(1, 'rgba(255,90,0,0)');
        ctx.fillStyle = rg; ctx.fillRect(x - cw * 7, y - cw * 7, cw * 14, cw * 14);
        ctx.globalCompositeOperation = 'source-over';
      }
      // the reflow wave front glints
      if (pk > 0 && pk < 1) {
        ctx.globalCompositeOperation = 'lighter';
        const x0 = (W - Wc) / 2, y0 = (H - Hc) / 2; const f = pk * 1.6;
        const lg = ctx.createLinearGradient(x0 + (f - .6) * Wc, y0, x0 + (f - .6) * Wc + Wc * .15, y0 + Hc * .3);
        lg.addColorStop(0, 'rgba(255,120,40,0)'); lg.addColorStop(.5, 'rgba(255,140,60,.18)'); lg.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
      }
    }
  };
})());
