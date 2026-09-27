/* ---------- views: the ten pieces, and three hero layouts ---------- */
(() => {
  const $ = id => document.getElementById(id);
  const pad2 = n => String(n + 1).padStart(2, '0');
  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  const rm = () => rmq.matches;
  const isDark = () => { const a = document.documentElement.getAttribute('data-theme'); return a ? a === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  const N = CONCEPTS.length;
  const ORDER = [7, 0, 1, 2, 3, 5, 4, 8, 6, 9]; // reel and strip order: the all-in-one form first, the signature last

  /* ================= the ten pieces ================= */
  const pv = { ground: null, lastBeat: -2 };
  const pvStage = new Motion.Stage($('pvStage'), {
    onTick: s => pvProgress(s),
    onChange: s => { pvInfo(s.i); pvProgress(s); },
    onPlay: s => { $('pvPlayLbl').textContent = s.playing && !s.rm() ? 'Pause' : 'Play'; },
  });
  const picker = $('picker');
  CONCEPTS.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab'); b.id = 'tab' + i;
    b.setAttribute('aria-controls', 'pvInfo'); b.innerHTML = `<b>${pad2(i)}</b><span>${c.name}</span>`;
    b.addEventListener('click', () => pvSelect(i, true));
    b.addEventListener('keydown', e => { let j = null; const cols = 2;
      if (e.key === 'ArrowRight') j = (i + 1) % N; if (e.key === 'ArrowLeft') j = (i - 1 + N) % N; if (e.key === 'ArrowDown') j = Math.min(N - 1, i + cols); if (e.key === 'ArrowUp') j = Math.max(0, i - cols); if (e.key === 'Home') j = 0; if (e.key === 'End') j = N - 1;
      if (j !== null) { e.preventDefault(); pvSelect(j, true); $('tab' + j).focus(); } });
    picker.appendChild(b);
  });
  function pvSelect(i, user) {
    CONCEPTS.forEach((c, j) => { const b = $('tab' + j); b.setAttribute('aria-selected', j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; });
    $('pvInfo').setAttribute('aria-labelledby', 'tab' + i);
    pvStage.show(i, { from: 0 }); pvStage.setPlaying(true);
    if (user) setHash('pieces-' + (i + 1));
  }
  function pvInfo(i) {
    const d = CONCEPTS[i];
    $('cName').textContent = d.name;
    $('cTag').textContent = d.service;
    $('cPitch').textContent = d.pitch;
    $('cFix').innerHTML = '<strong>Smoothed.</strong> ' + (d.fix || '');
    $('cTech').innerHTML = '<strong>Technique.</strong> ' + d.tech;
    const ol = $('beats'); ol.innerHTML = '';
    d.beats.forEach(([a, txt]) => { const li = document.createElement('li'); li.innerHTML = `<b>${a}</b><span>${txt}</span>`; ol.appendChild(li); });
    pv.lastBeat = -2;
  }
  function pvProgress(s) {
    const d = CONCEPTS[s.i]; const T = s.T;
    $('pvFill').style.transform = `scaleX(${s.rm() ? 1 : Math.min(1, T / d.duration)})`;
    $('pvLbl').textContent = s.rm() ? 'Still frame' : T < d.duration ? `${T.toFixed(1)} / ${d.duration.toFixed(1)} s` : 'Idle loop';
    let bi = -1; d.beats.forEach(([a], k) => { const x = parseFloat(a); if (!isNaN(x) && T >= x) bi = k; });
    if (bi !== pv.lastBeat) { pv.lastBeat = bi; [...$('beats').children].forEach((li, k) => li.classList.toggle('on', k === bi)); }
  }
  const setGround = g => { pv.ground = g; applyTheme(); };
  $('gLight').addEventListener('click', () => setGround('light'));
  $('gDark').addEventListener('click', () => setGround('dark'));
  $('replayBtn').addEventListener('click', () => { pvStage.force = pvStage.force || false; pvStage.replay(); if (!pvStage.rm()) pvStage.setPlaying(true); });
  $('pvPlay').addEventListener('click', () => pvStage.toggle());

  /* ================= Layout A: the reel ================= */
  const aSegs = $('aSegs'); let aK = 0;
  ORDER.forEach((pi, k) => {
    const c = CONCEPTS[pi], b = document.createElement('button');
    b.type = 'button'; b.className = 'seg'; b.innerHTML = `<span class="n">${pad2(k)}</span><span class="bar"><i></i></span>`;
    b.setAttribute('aria-label', `${pad2(k)}: ${c.short}, ${c.name}`);
    b.addEventListener('click', () => aGo(k));
    aSegs.appendChild(b);
  });
  const aStage = new Motion.Stage($('aStage'), {
    onTick: s => {
      const d = CONCEPTS[s.i].duration + 1.8;
      aSegs.children[aK].querySelector('i').style.transform = `scaleX(${Math.min(1, s.T / d)})`;
      if (s.T >= d) aGo(aK + 1);
    },
    onChange: () => aUI(),
  });
  function aGo(k) {
    aK = (k + N) % N; const pi = ORDER[aK], c = CONCEPTS[pi];
    const f = c.focus || [.5, .5];
    aStage.show(pi, { from: 0, transition: 'iris', dur: 1000, origin: [aStage.W * f[0], aStage.H * f[1]] });
  }
  function aUI() {
    const c = CONCEPTS[ORDER[aK]];
    $('aNum').textContent = pad2(aK); $('aName').textContent = c.short;
    [...aSegs.children].forEach((b, k) => { b.classList.toggle('done', k < aK); b.setAttribute('aria-current', k === aK ? 'true' : 'false'); const i = b.querySelector('i'); if (k !== aK) i.style.transform = ''; else i.style.transform = aStage.rm() ? 'scaleX(1)' : 'scaleX(0)'; });
  }
  $('aPrev').addEventListener('click', () => aGo(aK - 1));
  $('aNext').addEventListener('click', () => aGo(aK + 1));

  /* ================= Layout B: service-linked ================= */
  const SVC = [
    { label: 'Branding', pieces: [9, 0] },
    { label: 'Websites', pieces: [1] },
    { label: 'SEO', pieces: [2] },
    { label: 'Apps', pieces: [3] },
    { label: 'Advertising', pieces: [5] },
    { label: 'Social and content', pieces: [4, 8] },
    { label: 'Print and packaging', pieces: [6] },
  ];
  let bK = -1, bStart = 0, bHold = 0, bTimer = 0;
  const bList = $('bList'), bChips = $('bChips');
  SVC.forEach((s, k) => {
    s.n = 0;
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'svc'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="txt">${s.label}</span>`;
    const intent = () => { clearTimeout(bTimer); bHold = Infinity; bTimer = setTimeout(() => { if (bK !== k) bGo(k); }, 140); };
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') intent(); });
    b.addEventListener('focus', intent);
    b.addEventListener('click', () => { clearTimeout(bTimer); bHold = performance.now() + 12000; if (bK !== k) bGo(k); });
    li.appendChild(b); bList.appendChild(li); s.btn = b;
    const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = s.label; c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', () => { bHold = performance.now() + 12000; if (bK !== k) bGo(k); });
    bChips.appendChild(c); s.chip = c;
  });
  bList.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { clearTimeout(bTimer); bHold = performance.now() + 5000; } });
  bList.addEventListener('focusout', e => { if (!bList.contains(e.relatedTarget)) bHold = performance.now() + 5000; });
  const bStage = new Motion.Stage($('bStage'), {
    onTick: s => { if (s.T - bStart >= 8.5 && performance.now() > bHold) bGo(bK + 1 >= SVC.length ? -1 : bK + 1, true); },
  });
  function bGo(k, auto) {
    bK = k;
    let pi, label, name;
    if (k < 0) { pi = 7; label = 'Every service'; }
    else { const s = SVC[k]; pi = s.pieces[s.n % s.pieces.length]; s.n++; label = s.label; }
    const c = CONCEPTS[pi];
    const from = c.cue != null ? c.cue : 2;
    bStage.show(pi, { from, transition: 'wipe', dur: 760 });
    bStart = bStage.T;
    $('bTag').innerHTML = `<b>${k < 0 ? 'ALL' : pad2(k)}</b><span>${label} · ${c.name}</span>`;
    SVC.forEach((s, j) => { s.btn.setAttribute('aria-pressed', j === k ? 'true' : 'false'); s.chip.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
    if (auto && k >= 0 && bChips.scrollWidth > bChips.clientWidth + 2) {
      const ch = SVC[k].chip; bChips.scrollTo({ left: ch.offsetLeft - 20, behavior: rm() ? 'auto' : 'smooth' });
    }
  }

  /* ================= Layout C: the strip ================= */
  const strip = $('cStrip'), cDots = $('cDots');
  const cards = [];
  const cHost = document.createElement('div');
  cHost.className = 'stage'; cHost.id = 'cStage';
  cHost.innerHTML = '<div class="stage-view" aria-hidden="true"></div><div class="rmnote"><span>Reduced motion: still frames</span></div><button class="sbtn" type="button" aria-label="Pause motion"></button>';
  [...ORDER, ORDER[0]].forEach((pi, k) => {
    const c = CONCEPTS[pi], f = document.createElement('figure');
    f.className = 'card'; f.dataset.k = k; f.dataset.i = pi;
    if (k === N) f.setAttribute('aria-hidden', 'true');
    f.innerHTML = `<canvas class="poster" aria-hidden="true" width="2" height="2"></canvas><figcaption class="stag ctag"><b>${pad2(k % N)}</b><span>${c.short}</span></figcaption>`;
    f.addEventListener('click', () => { if (cK !== k) cGo(k); });
    strip.appendChild(f); cards.push(f);
  });
  ORDER.forEach((pi, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<i></i>';
    b.setAttribute('aria-label', `${pad2(k)}: ${CONCEPTS[pi].short}, ${CONCEPTS[pi].name}`);
    b.addEventListener('click', () => { cHoldNow(); cGo(k); });
    cDots.appendChild(b);
  });
  let cK = -1, cStart = 0, cHold = 0, cSettle = 0, cPostersFor = '', cQueue = [], cPosterTimer = 0;
  const cStage = new Motion.Stage(cHost, {
    onTick: s => { if (s.T - cStart >= 9 && performance.now() > cHold) cGo(cK + 1); },
  });
  const cHoldNow = () => { cHold = performance.now() + 9000; };
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(ev => strip.addEventListener(ev, cHoldNow, { passive: true }));
  function cScrollTo(k, instant) {
    const card = cards[k]; const padL = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
    strip.scrollTo({ left: card.offsetLeft - padL, behavior: instant || rm() ? 'auto' : 'smooth' });
  }
  function cGo(k) { cScrollTo(Math.max(0, Math.min(N, k))); }
  function cActivate(k) {
    if (k === cK) return;
    const prevPiece = cK >= 0 ? cards[cK].dataset.i : null;
    cK = k; const card = cards[k], pi = +card.dataset.i;
    card.appendChild(cHost);
    cStage.measure();
    if (String(pi) === prevPiece && cStage.front) { cStage.resized(); }
    else { cStage.show(pi, { from: 'still' }); cStart = cStage.T; }
    const kk = k % N;
    $('cNum').textContent = pad2(kk); $('cName2').textContent = `${CONCEPTS[pi].short} · ${CONCEPTS[pi].name}`;
    [...cDots.children].forEach((b, j) => b.setAttribute('aria-current', j === kk ? 'true' : 'false'));
  }
  const cIO = new IntersectionObserver(es => {
    let best = null; for (const e of es) if (e.isIntersecting && e.intersectionRatio >= .6) best = e.target;
    if (!best) return;
    clearTimeout(cSettle); const k = +best.dataset.k;
    cSettle = setTimeout(() => cActivate(k), 140);
  }, { root: strip, threshold: [.6] });
  cards.forEach(c => cIO.observe(c));
  /* the clone of card 01 at the end lets the strip loop forward; once it settles, jump back to the real one, which looks identical */
  const cWrap = () => { if (cK === N) { cScrollTo(0, true); clearTimeout(cSettle); cK = -1; const pi = ORDER[0]; cards[0].appendChild(cHost); cK = 0; cStage.resized(); } };
  strip.addEventListener('scrollend', () => setTimeout(cWrap, 160));
  $('cPrev').addEventListener('click', () => { cHoldNow(); cGo(cK <= 0 ? N - 1 : cK - 1); });
  $('cNext').addEventListener('click', () => { cHoldNow(); cGo(cK + 1); });
  function cPosters() {
    const card = cards[0]; const w = card.clientWidth, h = card.clientHeight; if (!w || !h) return;
    const key = `${w}x${h}-${isDark()}`; if (key === cPostersFor) return; cPostersFor = key;
    clearTimeout(cPosterTimer);
    const start = Math.max(0, cK % N);
    cQueue = []; for (let d = 1; d <= N; d++) { const k = (start + d) % N; cQueue.push(k); }
    const run = () => {
      if (!cQueue.length) return;
      const k = cQueue.shift(), pi = ORDER[k];
      const cv = Motion.poster(pi, w, h, isDark());
      cv.className = 'poster'; cv.setAttribute('aria-hidden', 'true');
      cards[k].querySelector('.poster').replaceWith(cv);
      if (k === 0) { const cl = document.createElement('canvas'); cl.width = cv.width; cl.height = cv.height; cl.getContext('2d').drawImage(cv, 0, 0); cl.className = 'poster'; cl.setAttribute('aria-hidden', 'true'); cards[N].querySelector('.poster').replaceWith(cl); }
      if (cStage.front && cStage.i === pi && cStage.active) cStage.setActive(true); // the poster borrowed the live piece; hand it back
      window.__cPosters = N - cQueue.length;
      cPosterTimer = setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(run, { timeout: 400 }) : run()), 30);
    };
    window.__cPosters = 0;
    cPosterTimer = setTimeout(run, 250);
  }

  /* ================= views, theme, phone ================= */
  const VIEWS = {
    pieces: { stages: [pvStage], start: () => { if (!pvStage.front) pvSelect(pv.startI || 0); } },
    a: { stages: [aStage], start: () => { if (!aStage.front) { aStage.show(ORDER[0], { from: 0 }); aUI(); } } },
    b: { stages: [bStage], start: () => { if (!bStage.front) bGo(-1); } },
    c: { stages: [cStage], start: () => { if (cK < 0) { cards[0].appendChild(cHost); cActivate(0); } cPosters(); } },
  };
  let view = null;
  function setView(v, user) {
    if (!VIEWS[v]) v = 'pieces';
    for (const [k, o] of Object.entries(VIEWS)) if (k !== v) o.stages.forEach(s => s.setActive(false));
    for (const k of Object.keys(VIEWS)) { $('view-' + k).hidden = k !== v; const t = $('tv-' + k); t.setAttribute('aria-selected', k === v ? 'true' : 'false'); t.tabIndex = k === v ? 0 : -1; }
    view = v;
    VIEWS[v].start();
    VIEWS[v].stages.forEach(s => s.setActive(true));
    if (user) setHash(v === 'pieces' ? 'pieces-' + (pvStage.i + 1) : v);
  }
  function setHash(h) { try { history.replaceState(null, '', '#' + h); } catch (e) {} }
  document.querySelectorAll('.switch [role=tab]').forEach((b, i, all) => {
    b.addEventListener('click', () => setView(b.dataset.view, true));
    b.addEventListener('keydown', e => { let j = null; if (e.key === 'ArrowRight') j = (i + 1) % all.length; if (e.key === 'ArrowLeft') j = (i - 1 + all.length) % all.length; if (j !== null) { e.preventDefault(); all[j].focus(); setView(all[j].dataset.view, true); } });
  });

  function applyTheme() {
    const d = isDark();
    $('themeBtn').textContent = d ? 'Light theme' : 'Dark theme';
    const g = pv.ground || (d ? 'dark' : 'light');
    pvStage.setDark(g === 'dark');
    $('gLight').setAttribute('aria-pressed', g === 'light' ? 'true' : 'false'); $('gDark').setAttribute('aria-pressed', g === 'dark' ? 'true' : 'false');
    [aStage, bStage, cStage].forEach(s => s.setDark(d));
    cards.forEach(c => c.dataset.ground = d ? 'dark' : 'light');
    if (view === 'c') cPosters(); else cPostersFor = '';
  }
  $('themeBtn').addEventListener('click', () => { const n = isDark() ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('wdc-hm-theme', n); } catch (e) {} applyTheme(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  function setPhone(on) {
    $('phoneBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
    document.querySelectorAll('.device-wrap').forEach(d => d.classList.toggle('phone', on));
    $('pvWrap').classList.toggle('phone', on);
    requestAnimationFrame(() => { if (view === 'c') { cPostersFor = ''; cPosters(); if (cK >= 0) cScrollTo(cK, true); } });
  }
  $('phoneBtn').addEventListener('click', () => setPhone($('phoneBtn').getAttribute('aria-pressed') !== 'true'));
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (view === 'c') cPosters(); }, 250); }, { passive: true });

  /* test hook: render a stage's piece at time t, paused */
  window.__wdc = {
    view: v => setView(v), phone: setPhone, theme: t => { document.documentElement.setAttribute('data-theme', t); applyTheme(); },
    stage: n => ({ pieces: pvStage, a: aStage, b: bStage, c: cStage })[n],
    seek(i, t, px, py) { if (view !== 'pieces') setView('pieces'); pvSelect(i); pvStage.setPlaying(false); const s = pvStage; if (px !== undefined) { s.ptr.x = s.ptr.tx = px; s.ptr.y = s.ptr.ty = py; } s.show(i, { from: t }); s.setPlaying(false); return true; },
    ground: g => setGround(g), aGo, bGo, cGo, get cK() { return cK; },
  };

  /* the initial view is visible at once; only the motion waits for the fonts its canvases draw with */
  (() => { const h = location.hash.slice(1); const v = /^pieces-/.test(h) ? 'pieces' : (VIEWS[h] ? h : 'pieces'); for (const k of Object.keys(VIEWS)) $('view-' + k).hidden = k !== v; $('tv-' + v).setAttribute('aria-selected', 'true'); })();
  const start = () => {
    applyTheme();
    const h = location.hash.slice(1);
    const m = /^pieces-(\d+)$/.exec(h);
    if (m) pv.startI = Math.max(0, Math.min(N - 1, +m[1] - 1));
    setView(m ? 'pieces' : (VIEWS[h] ? h : 'pieces'));
  };
  const fontsReady = document.fonts ? Promise.race([Promise.all([document.fonts.load('600 40px "Space Grotesk"'), document.fonts.load('700 40px "Space Grotesk"'), document.fonts.load('500 40px "Space Grotesk"'), document.fonts.load('400 20px Outfit')]), new Promise(r => setTimeout(r, 1800))]) : Promise.resolve();
  fontsReady.then(start, start);
})();
