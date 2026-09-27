/* ---------- hero reconciled: two mock screens, one engine, three concepts ---------- */
(() => {
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  window.__simRM = false;
  const rm = () => rmq.matches || window.__simRM;
  const ORDER = [7, 0, 1, 2, 3, 5, 4, 8, 6, 9];
  const HOLD = 3.5;
  const PHRASES = ['the one they copy?', 'convert like crazy?', 'unfairly good?', 'sell itself?', 'yours?'];
  const CHIPS = [['Branding', 0], ['Websites', 1], ['Apps', 3], ['SEO', 2], ['Social', 4], ['Content', 8], ['Advertising', 5], ['Print', 6]];
  const chipFor = i => i === 9 ? 0 : i;
  const TOOLS = ['Figma', 'Adobe Illustrator', 'Adobe InDesign', 'Blender', 'Framer', 'Next.js', 'React', 'WordPress', 'Flutter', 'Swift', 'Google Search Console', 'Semrush', 'Claude', 'Vercel', 'Instagram', 'TikTok'];
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg>';
  const PAUSE = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3.5" y="3" width="3" height="10" rx=".6"/><rect x="9.5" y="3" width="3" height="10" rx=".6"/></svg>';
  const PLAY = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z"/></svg>';

  /* ---------- the screen ---------- */
  function screenHTML(kind) {
    const tools = TOOLS.map(t => `<span>${t}</span>`).join('');
    const chips = CHIPS.map(([n, i]) => `<button type="button" data-p="${i}" aria-pressed="false">${n}</button>`).join('');
    return `
    <div class="scroll"><div class="track"><div class="pin">
      <div class="stage"><div class="stage-view" aria-hidden="true"></div></div>
      <div class="ov scrim"></div><div class="ov fade"></div><div class="ov topfade"></div>
      <header class="hdr">
        <a class="mark" href="#viewer"><i aria-hidden="true">C</i><span>We Dig<br>Creativity</span></a>
        <div class="hnav"><nav class="links" aria-label="Main"><span>Work</span><span>Services</span><span>Blog</span><span>Contact</span></nav>
          <a class="hbtn" href="#viewer">Start a project ${ARROW}</a>
          <button class="burger" type="button" aria-label="Open menu"><svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M1 2h24M1 9h24M1 16h24" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></button></div>
      </header>
      <div class="copy">
        <p class="eb rise" style="animation-delay:50ms;margin:0">...brilliant simplicity <b>of thought!</b></p>
        <h1 class="h1"><span class="l1">What if we made it</span><span class="l2"><span class="rotbox">${PHRASES.map(t => `<span class="rot-sizer" aria-hidden="true"><span class="chev">&gt;</span>${t}<i class="caret"></i></span>`).join('')}<span class="rot"><span class="chev" aria-hidden="true">&gt;</span><span class="rt">${PHRASES[0]}</span><i class="caret" aria-hidden="true"></i></span></span></span></h1>
        <p class="lede rise" style="animation-delay:300ms">Branding, websites, apps and SEO, designed and built by one team.</p>
        <div class="ctas rise" style="animation-delay:400ms"><a class="btn p" href="#viewer">Let’s Talk ${ARROW}</a><a class="btn s" href="#viewer">Explore Our Work</a></div>
        <div class="chips rise" style="animation-delay:500ms" role="group" aria-label="Show a service">${chips}</div>
      </div>
      <div class="reel"><div class="rl">Now showing</div><h4 class="reelname">Branding</h4><div class="chips" role="group" aria-label="Show a service">${chips}</div></div>
      <div class="hud rise" style="animation-delay:600ms"><button class="pbtn" type="button" aria-label="Pause motion">${PAUSE}</button><span class="dot" aria-hidden="true"></span><span class="now" aria-live="polite">Now showing <b>Every service</b></span></div>
      <div class="marq rise" style="animation-delay:500ms"><p>Powering brands with the world’s best tools</p><div class="mask"><div class="row" aria-hidden="true">${tools}${tools}</div></div></div>
    </div></div>
    <section class="next"><div class="ne">Selected work</div><h3>The page carries on here</h3><div class="cards"><div class="card">Branding</div><div class="card">Websites</div><div class="card">Apps</div></div></section></div>`;
  }
  const SIZES = { P: [390, 844], D: [1440, 900] };
  const screens = {};
  for (const k of ['P', 'D']) {
    const dev = $(k === 'P' ? 'devP' : 'devD'), scaler = dev.querySelector('.scaler'), clip = dev.querySelector('.clip');
    const [w, h] = SIZES[k];
    const s = document.createElement('div');
    s.className = 'screen play ' + (k === 'P' ? 'phone-s' : 'desk-s');
    s.style.width = w + 'px'; s.style.height = h + 'px'; s.style.setProperty('--sh', h); s.style.setProperty('--p', 0);
    s.innerHTML = screenHTML(k);
    scaler.append(s);
    const fit = () => { const cw = clip.clientWidth; const sc = cw / w; scaler.style.transform = `scale(${sc})`; clip.style.height = h * sc + 'px'; };
    new ResizeObserver(fit).observe(clip); fit();
    screens[k] = { el: s, dev, w, h };
  }

  /* ---------- stages ---------- */
  Motion.Stage.prototype.measure = function () { const w = this.host.offsetWidth, h = this.host.offsetHeight; if (w > 0 && h > 0) { this.W = w; this.H = h; return true; } return false; };
  const syncHG = () => {
    const cs = getComputedStyle(root);
    U.THEME.dark.g0 = cs.getPropertyValue('--h-g0').trim() || '#16168a';
    U.THEME.dark.g1 = cs.getPropertyValue('--h-g1').trim() || '#000065';
  };
  syncHG();
  let concept = 'A', k = 0, lastPiece = -1;
  const stD = new Motion.Stage(screens.D.el.querySelector('.stage'), { set: SET_D, dprMax: 1, onTick: s => autoAdvance(s), onChange: s => label(s.i) });
  const stP = new Motion.Stage(screens.P.el.querySelector('.stage'), { set: SET_P, dprMax: 1.5 });
  const stages = [stD, stP];
  stages.forEach(s => { s.setDark(true); });

  const TR = { A: 'iris', B: 'fade', C: 'wipe' };
  function showPiece(i, how) {
    lastPiece = i;
    stages.forEach(s => s.show(i, { from: 0, transition: how || TR[concept], dur: 900 }));
    markPieces(i);
  }
  function autoAdvance(s) {
    const d = SET_D[s.i]; if (!d) return;
    if (s.T > d.duration + HOLD) { k = (ORDER.indexOf(s.i) + 1) % ORDER.length; showPiece(ORDER[k]); }
  }
  function label(i) {
    const d = SET_D[i]; if (!d) return;
    const svc = i === 7 ? 'Every service' : d.short || d.service;
    for (const k of ['P', 'D']) {
      const el = screens[k].el;
      el.querySelector('.now').innerHTML = `Now showing <b>${svc}</b> · ${d.name}`;
      el.querySelector('.reelname').textContent = svc;
      el.querySelectorAll('.chips button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.p === chipFor(i))));
    }
  }

  /* ---------- piece picker ---------- */
  const pk = $('pieces');
  ORDER.forEach(i => {
    const d = SET_D[i], b = document.createElement('button');
    b.type = 'button'; b.dataset.p = i; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b>${d.name}`;
    b.title = d.service;
    b.addEventListener('click', () => showPiece(i));
    pk.append(b);
  });
  function markPieces(i) { pk.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.p === i))); }
  document.querySelectorAll('.screen .chips button').forEach(b => b.addEventListener('click', () => showPiece(+b.dataset.p)));

  /* ---------- pause (one control drives both screens, as it would on the page) ---------- */
  function paintPause() {
    const on = stD.playing && !stD.rm();
    document.querySelectorAll('.pbtn').forEach(b => { b.innerHTML = on ? PAUSE : PLAY; b.setAttribute('aria-label', on ? 'Pause motion' : 'Play motion'); });
  }
  document.querySelectorAll('.pbtn').forEach(b => b.addEventListener('click', () => { stages.forEach(s => s.toggle()); paintPause(); }));

  /* ---------- the rotating half of the headline ---------- */
  const typers = [];
  for (const k of ['P', 'D']) {
    const rt = screens[k].el.querySelector('.rt');
    const t = { rt, i: 0, n: PHRASES[0].length, dir: 0, tm: 0 };
    typers.push(t);
  }
  function typeStep() {
    clearTimeout(typeStep.tm);
    if (rm() || document.hidden) { typers.forEach(t => { t.rt.textContent = PHRASES[0]; t.i = 0; t.n = PHRASES[0].length; t.dir = 0; }); return; }
    const t0 = typers[0]; let wait = 70;
    const cur = PHRASES[t0.i];
    if (t0.dir === 0) { t0.dir = -1; wait = 1700; }
    else if (t0.dir === -1) { t0.n--; wait = 40; if (t0.n <= 0) { t0.i = (t0.i + 1) % PHRASES.length; t0.dir = 1; wait = 260; } }
    else { t0.n++; wait = 70; if (t0.n >= PHRASES[t0.i].length) { t0.dir = 0; wait = 0; } }
    const txt = PHRASES[t0.i].slice(0, Math.max(0, t0.n));
    typers.forEach(t => { t.rt.textContent = txt; });
    typeStep.tm = setTimeout(typeStep, wait);
  }
  document.addEventListener('visibilitychange', typeStep);

  /* ---------- concept switch ---------- */
  const COPY = {
    A: { t: 'A · Backdrop', h: 'The motion becomes the photograph.', line: 'The live hero, unchanged, with the photographs replaced by the ten pieces. Centred copy, a scrim shaped to the words, the tools rail at the foot. Each piece plays its opening, holds, then irises into the next.',
      notes: [['How it works', 'The stage fills the whole band, exactly where the photographs are today. The pieces cycle in the reel order; the orange iris from the mark hands one to the next. A radial scrim sits behind the copy, as <code>.hero-scrim</code> does now.'], ['On a phone', 'Identical to today: full screen, centred headline, stacked buttons, tools rail at the bottom. The motion shows round the edges of the copy.'], ['Performance', 'Full-screen canvas, so the most pixels of the three. No scroll work. LCP moves from the photograph to the headline text.'], ['Trade-offs', '<ul><li>Closest to what people already know.</li><li>The headline covers the middle of every piece, which is where the pieces do their best work.</li><li>Legibility depends on the scrim and on the frame: measured worst case in the table.</li></ul>']] },
    B: { t: 'B · Recede', h: 'Immersive on arrival, split once you scroll.', line: 'The page opens full-bleed, like today. As you scroll, the stage recedes into a window on the right (desktop) or the words step aside and the service reel takes the screen (phone). Scroll the frames, or use the slider.',
      notes: [['How it works', 'The hero pins for 0.6 of a screen. Scroll progress drives one custom property; the stage and copy move by transform and opacity only, so the scroll is never janky. On desktop the stage shrinks into a framed window beside the copy; the left feather fades out as it goes.'], ['On a phone', 'Full screen on arrival, with the copy at the foot over a scrim. Scrolling lifts the copy away and brings up “Now showing” with the service chips over the still-full-screen stage, then the page carries on.'], ['Performance', 'One passive scroll listener, coalesced into one animation frame. No layout reads per frame. Pinning adds 0.6 of a screen of scroll before the next section.'], ['Trade-offs', '<ul><li>The most cinematic and the most “studio”.</li><li>Pinning is a mild form of scroll hijack; some readers just want the next section.</li><li>Most moving parts to build and test, and the only one with a scroll listener.</li></ul>']] },
    C: { t: 'C · Shared ground', h: 'One band. The words and the motion share it.', line: 'Navy edge to edge, as today. On desktop the stage bleeds off the right, top and bottom and feathers into the copy side. On a phone it fills the top half of the screen under the header, and the copy sits on the same navy below. The chips pick a service.',
      notes: [['How it works', 'No card and no border: the stage is the band itself, feathered into flat navy where the copy sits. Words never sit on moving pixels. The service chips wipe to that service’s piece; left alone, the reel cycles.'], ['On a phone', 'Still one full screen. The motion runs under the header to all three edges, then eases into the navy that carries the headline, both buttons and the chip row. At 390 × 844 all of it is on the first screen.'], ['Performance', 'The stage is about half the screen, so half the pixels of A. No scroll listener, no scrim. The band paints as CSS before any script.'], ['Trade-offs', '<ul><li>Every ratio is fixed and passes, with no worst frame.</li><li>Less text-over-image drama than today.</li><li>On a 320 × 568 phone the chips fall under the fold.</li></ul>']] },
  };
  function setConcept(c) {
    concept = c;
    document.querySelectorAll('#cTabs button').forEach(b => { const on = b.dataset.c === c; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    for (const k of ['P', 'D']) {
      const s = screens[k].el;
      s.classList.remove('c-A', 'c-B', 'c-C'); s.classList.add('c-' + c);
      s.querySelector('.scroll').scrollTop = 0; s.style.setProperty('--p', 0);
      s.classList.remove('play'); void s.offsetWidth; s.classList.add('play');
    }
    $('scrub').hidden = c !== 'B'; $('scrubIn').value = 0; $('scrubV').textContent = '0%';
    const d = COPY[c];
    $('cEye').textContent = 'Concept ' + c; $('cTitle').textContent = d.h; $('cLine').textContent = d.line;
    $('notes').innerHTML = d.notes.map(([h, b]) => `<section><h3>${h}</h3>${b.startsWith('<ul>') ? b : '<p>' + b + '</p>'}</section>`).join('');
    requestAnimationFrame(() => stages.forEach(s => s.resized()));
    try { localStorage.setItem('wdc-hr-c', c); } catch (e) {}
  }
  document.querySelectorAll('#cTabs button').forEach(b => {
    b.addEventListener('click', () => setConcept(b.dataset.c));
    b.addEventListener('keydown', e => {
      const cs = ['A', 'B', 'C']; let j = cs.indexOf(b.dataset.c);
      if (e.key === 'ArrowRight') j = (j + 1) % 3; else if (e.key === 'ArrowLeft') j = (j + 2) % 3; else return;
      e.preventDefault(); setConcept(cs[j]); $('tab' + cs[j]).focus();
    });
  });

  /* ---------- B: scroll drives one property, coalesced into one frame ---------- */
  for (const k of ['P', 'D']) {
    const s = screens[k].el, sc = s.querySelector('.scroll'), span = screens[k].h * .6;
    let q = 0;
    sc.addEventListener('scroll', () => {
      if (q) return;
      q = requestAnimationFrame(() => {
        q = 0; if (concept !== 'B') return;
        const p = Math.min(1, Math.max(0, sc.scrollTop / span));
        s.style.setProperty('--p', p.toFixed(3));
        if (k === 'D') { $('scrubIn').value = Math.round(p * 100); $('scrubV').textContent = Math.round(p * 100) + '%'; }
      });
    }, { passive: true });
  }
  $('scrubIn').addEventListener('input', e => {
    const v = +e.target.value / 100; $('scrubV').textContent = e.target.value + '%';
    for (const k of ['P', 'D']) { const s = screens[k].el; s.querySelector('.scroll').scrollTop = v * screens[k].h * .6; s.style.setProperty('--p', v); }
  });

  /* ---------- theme and motion ---------- */
  const isDark = () => { const a = root.getAttribute('data-theme'); return a ? a === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  function paintTheme() {
    $('thL').setAttribute('aria-pressed', String(!isDark())); $('thD').setAttribute('aria-pressed', String(isDark()));
    syncHG(); stages.forEach(s => s.setDark(true));
  }
  $('thL').addEventListener('click', () => { root.setAttribute('data-theme', 'light'); paintTheme(); });
  $('thD').addEventListener('click', () => { root.setAttribute('data-theme', 'dark'); paintTheme(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintTheme);
  function setRM(on) {
    window.__simRM = on; root.classList.toggle('sim-rm', on);
    $('mOn').setAttribute('aria-pressed', String(!rm())); $('mRm').setAttribute('aria-pressed', String(rm()));
    stages.forEach(s => { s.force = false; if (s.front) { if (s.rm()) s.still(); else s.show(s.i, { from: 0 }); } s.setPlaying(true); });
    Motion.wake(); paintPause(); typeStep();
  }
  $('mOn').addEventListener('click', () => setRM(false));
  $('mRm').addEventListener('click', () => setRM(true));
  rmq.addEventListener('change', () => setRM(window.__simRM));

  /* ---------- references ---------- */
  const REFS = [
    ['Linear', 'https://linear.app', 'A headline that swaps one word in place, and the product itself directly under it. Behind the words, only a slow radial gradient on a 16-second cycle.', 'Motion behind words stays slow and colourless; the detailed motion sits beside them.', 'C'],
    ['Stripe', 'https://stripe.com', 'The long-running animated WebGL gradient behind the headline, drawn by a tiny custom renderer, with the text painted first and a static fallback.', 'A backdrop can be motion, as long as it is colour and not detail, and the words never wait for it.', 'A'],
    ['Apple product pages', 'https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/', 'A full-bleed film pins, then scales down into the page as you scroll. Now doable with CSS scroll timelines (builder.io/blog/view-timeline).', 'Immersive first, then hand the screen back. The move is transform only, driven by scroll.', 'B'],
    ['Active Theory', 'https://activetheory.net', 'A full-screen WebGL world that answers the pointer; the words are small labels inside the world, not a headline over it.', 'When the motion is the hero, the copy moves out of its way instead of sitting on top of it.', 'C'],
    ['Lusion', 'https://godly.website/website/989-lusion', 'An abstract 3D field that fills the screen and reacts to the mouse; type sits in the calm part of the frame.', 'Compose the stage so its busy centre is away from the words. A scrim is the fallback, not the plan.', 'B, C'],
    ['Unseen Studio', 'https://godly.website/website/918-unseen-studio', 'Bold type over a Three.js scene with a cursor-reveal interaction.', 'One interaction, done properly, reads as craft; five read as a demo reel.', 'All'],
    ['Locomotive', 'https://godly.website/website/locomotive-958', 'The studio that made smooth scroll famous: layered parallax and seamless page transitions.', 'Scroll-driven hand-offs are where studios show off, and also where phones suffer. Keep them native on touch.', 'B'],
    ['Awwwards SOTD and Godly hero gallery', 'https://godly.design/hero/', 'Scanning September 2026 Sites of the Day (awwwards.com/websites/sites_of_the_day) and Godly’s hero tag: the recurring shape is a dark full-bleed ground, one motion moment, and type in a calm zone.', 'Full-bleed and motion are not in tension. The tension is only in where the words sit.', 'All'],
  ];
  $('refs').innerHTML = REFS.map(([n, u, what, teach, c]) => `<li><h3>${n}</h3><a href="${u}" target="_blank" rel="noopener">${u.replace('https://', '')}</a><p>${what}</p><span class="t"><b>Teaches:</b> ${teach} <span class="muted">(Concept ${c})</span></span></li>`).join('');

  /* ---------- contrast ---------- */
  const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4)); return .2126 * r + .7152 * g + .0722 * b; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const L = { g0: '#16168a', g1: '#000065', paper: '#f4f3ef' }, D = { g0: '#15154e', g1: '#0a0a3a', paper: '#06061a' };
  const MEAS = window.__MEAS || {};
  const ROWS = [
    ['Headline, lede, eyebrow: white', 'Band, lightest point (C, all words)', '#ffffff', t => t.g0, 4.5],
    ['Headline: white', 'Band edge', '#ffffff', t => t.g1, 4.5],
    ['Eyebrow: white on its solid pill', 'Pill #05052e', '#ffffff', () => '#05052e', 4.5],
    ['“of thought!” #ff6500', 'Eyebrow pill #05052e', '#ff6500', () => '#05052e', 4.5],
    ['“Now showing” #c9cbf2', 'Band, lightest point', '#c9cbf2', t => t.g0, 4.5],
    ['Primary label: black on white', 'Let’s Talk, selected chip', '#000000', () => '#ffffff', 4.5],
    ['Primary fill: white', 'Its edge against the band', '#ffffff', t => t.g0, 3],
    ['Secondary label: white on black', 'Explore Our Work, chips', '#ffffff', () => '#000000', 4.5],
    ['Secondary edge: white border', 'Against the band', '#ffffff', t => t.g0, 3],
    ['Pause button: white glyph and border on black', 'Icon-only control', '#ffffff', () => '#000000', 3],
    ['Focus ring #ff6500', 'Against the band, lightest point', '#ff6500', t => t.g0, 3],
    ['Header “Start a project”: black on white', 'Over the band', '#000000', () => '#ffffff', 4.5],
    ['Next section ink', 'Page ground below the hero', null, t => t.paper, 4.5],
  ];
  function contrastTable() {
    const tb = $('ctbl').querySelector('tbody');
    const fmt = v => v.toFixed(2) + ':1';
    let html = ROWS.map(([pair, where, fg, bgf, need]) => {
      const fl = fg || '#0b0b1c', fd = fg || '#f2f2f7';
      const a = cr(fl, bgf(L)), b = cr(fd, bgf(D)), ok = Math.min(a, b) >= need;
      return `<tr><td>${pair}</td><td>${where}</td><td class="n"><span class="sw" style="background:${bgf(L)}"></span>${fmt(a)}</td><td class="n"><span class="sw" style="background:${bgf(D)}"></span>${fmt(b)}</td><td class="n">${need}:1</td><td><span class="pass ${ok ? '' : 'fail'}">${ok ? 'Pass' : 'Fail'}</span></td></tr>`;
    }).join('');
    for (const [c, where] of [['A', 'A: headline over motion, behind the scrim'], ['B', 'B: headline over motion, at arrival']]) {
      const m = MEAS[c]; if (!m) continue;
      const ok = Math.min(m.light, m.dark) >= 4.5;
      html += `<tr><td>Headline: white, over motion</td><td>${where}. Worst of ${m.frames} frames (${m.piece})</td><td class="n">${fmt(m.light)}</td><td class="n">${fmt(m.dark)}</td><td class="n">4.5:1</td><td><span class="pass ${ok ? '' : 'fail'}">${ok ? 'Pass' : 'Fail'}</span></td></tr>`;
    }
    tb.innerHTML = html;
  }
  contrastTable();

  /* ---------- boot ---------- */
  let startC = 'A'; try { const v = localStorage.getItem('wdc-hr-c'); if (/^[ABC]$/.test(v || '')) startC = v; } catch (e) {}
  const hc = (location.hash || '').replace('#', ''); if (/^concept-[abc]$/.test(hc)) startC = hc.slice(-1).toUpperCase();
  setConcept(startC);
  paintTheme();
  showPiece(ORDER[0], 'none');
  stages.forEach(s => s.setActive(true));
  $('mOn').setAttribute('aria-pressed', String(!rm())); $('mRm').setAttribute('aria-pressed', String(rm()));
  paintPause();
  setTimeout(typeStep, 1200);
  window.__hr = { stages, showPiece, setConcept, setRM, screens, SET_D };
})();
