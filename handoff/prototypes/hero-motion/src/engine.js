/* ---------- engine: stages, slots, hand-offs, one shared frame loop ---------- */
const Motion = (() => {
  const { clamp } = U;
  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  const stages = [];
  let raf = 0, last = 0;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const ICON_PAUSE = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3.5" y="3" width="3" height="10" rx=".6"/><rect x="9.5" y="3" width="3" height="10" rx=".6"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z"/></svg>';

  function newPtr() { return { x: 0, y: 0, tx: 0, ty: 0, rpx: -1e4, rpy: -1e4, spx: -1e4, spy: -1e4, inside: false, down: false, act: 0, vx: 0, vy: 0, gesture: null, dragX: 0, x0: 0, y0: 0, type: 'mouse' }; }
  function updPtr(ptr, dt) {
    const a = 1 - Math.exp(-dt * (ptr.inside ? 5 : 1.4));
    const tx = ptr.inside ? ptr.tx : 0, ty = ptr.inside ? ptr.ty : 0;
    const ox = ptr.x, oy = ptr.y;
    ptr.x += (tx - ptr.x) * a; ptr.y += (ty - ptr.y) * a;
    ptr.vx = dt > 0 ? (ptr.x - ox) / dt : 0; ptr.vy = dt > 0 ? (ptr.y - oy) / dt : 0;
    const b = 1 - Math.exp(-dt * 9);
    if (ptr.rpx > -1e3) { if (ptr.spx < -1e3) { ptr.spx = ptr.rpx; ptr.spy = ptr.rpy; } ptr.spx += (ptr.rpx - ptr.spx) * b; ptr.spy += (ptr.rpy - ptr.spy) * b; }
    ptr.act = Math.max(0, ptr.act - dt * 0.5);
  }
  function mkEnv(ptr) {
    const slot = el('div', 'slot'), inner = el('div', 'slot-in');
    const cv2 = el('canvas'), cvgl = el('canvas'), layer = el('div', 'layer');
    cvgl.style.display = 'none';
    inner.append(cv2, cvgl, layer); slot.append(inner);
    const env = { slot, inner, cv2, cvgl, layer, ctx: cv2.getContext('2d'), ptr, W: 1, H: 1, dpr: 1, portrait: false, dark: false, t: 0, gl: null, piece: null, i: -1 };
    env.getGL = () => { if (!env.gl) env.gl = cvgl.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true }); return env.gl; };
    return env;
  }
  function bind(env, i) {
    const p = CONCEPTS[i];
    env.piece = p; env.i = i;
    env.cv2.style.display = p.kind === 'gl' ? 'none' : 'block';
    env.cvgl.style.display = p.kind === 'gl' ? 'block' : 'none';
    env.layer.innerHTML = ''; env.layer.style.cssText = '';
    if (!p._inited) { p.init && p.init(env); p._inited = true; }
    p.activate && p.activate(env);
  }
  function sizeEnv(env, W, H, dprCap = 2) {
    const p = env.piece;
    env.W = Math.max(1, W); env.H = Math.max(1, H);
    env.dpr = Math.min(dprCap, window.devicePixelRatio || 1);
    env.portrait = env.H > env.W * 1.05;
    if (p.kind === 'gl') { env.cv2.width = env.cv2.height = 1; const s = p.glScale ? p.glScale(env) : 1; env.cvgl.width = Math.round(env.W * s); env.cvgl.height = Math.round(env.H * s); }
    else { env.cv2.width = Math.round(env.W * env.dpr); env.cv2.height = Math.round(env.H * env.dpr); }
    p.resize && p.resize(env);
  }
  function simTo(env, t) { const p = env.piece; if (!p.sim) return; const st = 1 / 60; let s = 0; while (s < t - 1e-6) { const d = Math.min(st, t - s); s += d; p.sim(s, d, env); } }
  function drawEnv(env, t, dt) { env.t = t; if (env.piece.kind !== 'gl') env.ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0); env.piece.frame(t, dt, env); }

  class Stage {
    constructor(host, o = {}) {
      this.host = host; this.o = o;
      this.view = host.querySelector('.stage-view');
      this.ptr = newPtr();
      this.envs = [mkEnv(this.ptr), mkEnv(this.ptr)];
      this.envs.forEach(e => { e.slot.style.visibility = 'hidden'; this.view.append(e.slot); });
      this.ring = el('div', 'tr-ring'); this.edge = el('div', 'tr-edge'); this.view.append(this.ring, this.edge);
      this.front = null; this.i = -1; this.T = 0; this.W = 1; this.H = 1;
      this.playing = true; this.active = false; this.onscreen = true; this.force = false; this.tr = null; this.dark = false;
      this.btn = host.querySelector('.sbtn');
      if (this.btn) { this.btn.innerHTML = ICON_PAUSE; this.btn.addEventListener('click', () => this.toggle()); }
      this.io = new IntersectionObserver(es => { this.onscreen = es[es.length - 1].isIntersecting; wake(); }, { threshold: 0 });
      this.io.observe(host);
      let q = 0; new ResizeObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; this.resized(); }); }).observe(host);
      pointer(this);
      stages.push(this);
    }
    rm() { return rmq.matches && !this.force; }
    get running() { return !!(this.active && this.playing && this.onscreen && !document.hidden && !this.rm() && this.front); }
    measure() { const r = this.host.getBoundingClientRect(); if (r.width > 0 && r.height > 0) { this.W = r.width; this.H = r.height; return true; } return false; }
    setDark(d) {
      this.dark = !!d; this.host.dataset.ground = d ? 'dark' : 'light';
      if (this.front) { this.front.dark = this.dark; if (!this.running) this.redraw(); }
    }
    redraw() { if (!this.front || !this.measure()) return; if (this.rm()) this.still(); else { const p = this.front.piece; p.reset(this.front); simTo(this.front, this.T); drawEnv(this.front, this.T, 0); } }
    resized() {
      if (!this.front || !this.measure()) return;
      if (Math.abs(this.front.W - this.W) < .5 && Math.abs(this.front.H - this.H) < .5) return;
      if (this.tr) this.endTr();
      sizeEnv(this.front, this.W, this.H);
      if (this.rm()) this.still(); else drawEnv(this.front, this.T, 0);
    }
    /* pieces are singletons; another stage (or a poster) may have borrowed one, so re-bind on the way back in */
    setActive(a) {
      this.active = a;
      if (a && this.front && this.measure()) { if (this.tr) this.endTr(); const env = this.front; env.dark = this.dark; bind(env, this.i); sizeEnv(env, this.W, this.H); if (this.rm()) this.still(); else { env.piece.reset(env); simTo(env, this.T); drawEnv(env, this.T, 0); } }
      wake();
    }
    /* show piece i. from: seconds into the piece, or 'still' for its designed still frame. transition: iris | wipe | fade | none */
    show(i, opt = {}) {
      this.measure();
      if (this.tr) this.endTr();
      const cur = this.front;
      const env = cur ? (this.envs[0] === cur ? this.envs[1] : this.envs[0]) : this.envs[0];
      const useTr = !!(cur && opt.transition && opt.transition !== 'none' && this.running);
      env.dark = this.dark;
      bind(env, i); sizeEnv(env, this.W, this.H);
      env.slot.style.visibility = 'visible'; env.slot.style.zIndex = 2; if (cur) cur.slot.style.zIndex = 1;
      this.front = env; this.i = i;
      const p = env.piece;
      this.T = this.rm() || opt.from === 'still' ? p.stillT : (opt.from || 0);
      p.reset(env); simTo(env, this.T); drawEnv(env, this.T, 0);
      if (useTr) { this.tr = { type: opt.transition, t0: performance.now(), dur: opt.dur || 900, from: cur, to: env, origin: opt.origin }; this.applyTr(0); }
      else if (cur && cur !== env) this.retire(cur);
      this.host.classList.toggle('is-rm', this.rm());
      this.o.onChange && this.o.onChange(this);
      wake();
    }
    replay() { if (this.front) this.show(this.i, { from: 0 }); }
    still() { const env = this.front, p = env.piece; p.reset(env); this.T = p.stillT; simTo(env, this.T); drawEnv(env, this.T, 0); }
    retire(env) {
      env.slot.style.visibility = 'hidden';
      env.slot.style.cssText = 'visibility:hidden'; env.inner.style.cssText = '';
    }
    applyTr(k) {
      const tr = this.tr, e = ease(k), W = this.W, H = this.H, to = tr.to, from = tr.from;
      if (tr.type === 'iris') {
        const [ox, oy] = tr.origin || [W * .5, H * .5];
        const D = 2 * Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy)) + 4;
        const s = Math.max(.035, e);
        const box = { left: ox - D / 2 + 'px', top: oy - D / 2 + 'px', width: D + 'px', height: D + 'px' };
        Object.assign(to.slot.style, box, { borderRadius: '50%', transform: `scale(${s})` });
        Object.assign(to.inner.style, { left: D / 2 - ox + 'px', top: D / 2 - oy + 'px', width: W + 'px', height: H + 'px', transformOrigin: `${ox}px ${oy}px`, transform: `scale(${1 / s})` });
        Object.assign(this.ring.style, box, { display: 'block', transform: `scale(${s})`, opacity: String(1 - U.ss(.7, 1, k)), borderWidth: Math.min(6, 2 / s) + 'px' });
      } else if (tr.type === 'wipe') {
        const x = (e - 1) * W;
        to.slot.style.transform = `translateX(${x}px)`; to.inner.style.transform = `translateX(${-x}px)`;
        Object.assign(this.edge.style, { display: 'block', transform: `translateX(${e * W}px)`, opacity: String(1 - U.ss(.85, 1, k)) });
      } else {
        to.slot.style.opacity = String(e);
      }
    }
    endTr() {
      const tr = this.tr; if (!tr) return; this.tr = null;
      tr.to.slot.style.cssText = 'visibility:visible;z-index:2'; tr.to.inner.style.cssText = '';
      this.ring.style.display = 'none'; this.edge.style.display = 'none';
      if (tr.from !== tr.to) this.retire(tr.from);
    }
    tick(dt, now) {
      const env = this.front, p = env.piece;
      this.T += dt; updPtr(this.ptr, dt);
      if (p.sim) p.sim(this.T, dt, env);
      drawEnv(env, this.T, dt);
      if (this.tr) { const hold = window.__trHold; const k = hold != null ? hold : Math.min(1, (now - this.tr.t0) / this.tr.dur); this.applyTr(k); if (k >= 1) this.endTr(); } // __trHold: test hook to freeze a hand-off
      this.o.onTick && this.o.onTick(this);
    }
    setPlaying(p) {
      this.playing = p;
      if (this.btn) { this.btn.innerHTML = p && !this.rm() ? ICON_PAUSE : ICON_PLAY; this.btn.setAttribute('aria-label', p && !this.rm() ? 'Pause motion' : 'Play motion'); }
      this.o.onPlay && this.o.onPlay(this);
      wake();
    }
    toggle() {
      if (this.rm()) { this.force = true; this.host.classList.remove('is-rm'); this.playing = true; this.show(this.i, { from: 0 }); this.setPlaying(true); return; }
      this.setPlaying(!this.playing);
    }
  }

  function pointer(s) {
    const h = s.host, P = s.ptr;
    const set = e => { const r = h.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; P.rpx = x; P.rpy = y; P.tx = clamp(x / r.width * 2 - 1, -1, 1); P.ty = clamp(y / r.height * 2 - 1, -1, 1); P.act = 1; };
    const onUI = e => e.target.closest && e.target.closest('button,a');
    h.addEventListener('pointerenter', e => { P.inside = true; set(e); }, { passive: true });
    h.addEventListener('pointermove', e => {
      P.inside = true; set(e);
      if (P.down) { const dx = e.clientX - P.x0, dy = e.clientY - P.y0; if (!P.gesture && Math.hypot(dx, dy) > 8) P.gesture = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v'; if (P.gesture === 'h') P.dragX = dx; }
    }, { passive: true });
    h.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { P.inside = false; P.rpx = P.rpy = -1e4; } }, { passive: true });
    h.addEventListener('pointerdown', e => { if (onUI(e)) return; P.down = true; P.gesture = null; P.dragX = 0; P.x0 = e.clientX; P.y0 = e.clientY; P.type = e.pointerType; P.inside = true; set(e); P.spx = P.rpx; P.spy = P.rpy; }, { passive: true });
    const up = cancel => {
      if (!P.down) return;
      const tap = !cancel && !P.gesture; P.down = false; P.gesture = null;
      if (tap && s.front && s.front.piece.onTap) { s.front.piece.onTap(P.rpx, P.rpy, s.front, s.T); if (!s.running) drawEnv(s.front, s.T, 0); }
    };
    h.addEventListener('pointerup', () => up(false), { passive: true });
    h.addEventListener('pointercancel', () => { up(true); P.inside = false; }, { passive: true });
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 20); last = now;
    let any = false;
    for (const s of stages) if (s.running) { s.tick(dt, now); any = true; }
    if (any) raf = requestAnimationFrame(frame);
  }
  function wake() {
    for (const s of stages) {
      if (!s.running && s.tr) s.endTr(); s.host.classList.toggle('is-paused', !s.running); s.host.classList.toggle('is-rm', !!s.front && s.rm());
      const on = s.playing && !s.rm(); if (s.btn && s._btnOn !== on) { s._btnOn = on; s.btn.innerHTML = on ? ICON_PAUSE : ICON_PLAY; s.btn.setAttribute('aria-label', on ? 'Pause motion' : 'Play motion'); }
    }
    if (!raf && stages.some(s => s.running)) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  document.addEventListener('visibilitychange', wake);
  rmq.addEventListener && rmq.addEventListener('change', () => { for (const s of stages) { if (s.front) { if (s.rm()) s.still(); s.setPlaying(s.playing); } } wake(); });

  /* a designed still of piece i, drawn once into a plain canvas (used by Layout C's cards) */
  let scratch = null;
  function poster(i, w, h, dark, dprCap = 1.5) {
    if (!scratch) scratch = mkEnv(newPtr());
    const env = scratch; env.dark = !!dark;
    bind(env, i); sizeEnv(env, w, h, dprCap);
    const p = env.piece; p.reset(env); simTo(env, p.stillT); drawEnv(env, p.stillT, 0);
    const out = el('canvas'); out.width = Math.round(w * env.dpr); out.height = Math.round(h * env.dpr);
    const g = out.getContext('2d');
    if (p.kind === 'gl') g.drawImage(env.cvgl, 0, 0, out.width, out.height);
    else if (p.poster) p.poster(env, g, out.width, out.height);
    else g.drawImage(env.cv2, 0, 0);
    env.layer.innerHTML = '';
    return out;
  }

  return { Stage, poster, rm: () => rmq.matches, wake, stages };
})();
