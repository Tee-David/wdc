  /* ======================= kit: shared behaviour for every board and page ======================= */
  constructor(props) {
    super(props);
    var pref = {};
    try { pref = JSON.parse(window.localStorage.getItem('wdc-proto') || '{}') || {}; } catch (e) { pref = {}; }
    this.state = Object.assign({
      dev: pref.dev || 'desktop', dark: !!pref.dark, ready: false, p: 0, mini: false, drawer: false,
      sheet: null, stack: [], sheetFull: false, bell: false, bellTab: 'all', read: {}, push: false,
      pal: false, q: '', hi: 0, pa: 0, tour: -1, tourKind: 'page', toast: null, ta: 0, menu: null, pop: null, dq: '',
      draft: '', reason: '', ack: false, spick: -1, ck: {}, vis: 'team', zoom: 1, cmt: '', comments: {},
      gone: {}, snoozed: {}, leaving: null, leaveKind: 'done', stampAt: null, enterN: 0, segPop: -1,
      installing: false, installHidden: !!pref.installHidden, celebrated: false, form: {}, lq: '', lpg: 0, lcreate: false, lcf: {}, lextra: [], lsel: {}, ui: null, bsel: {}, flt: {}, edMode: 'write', hc: this.shared('helpCats', null), ha: this.shared('helpArts', {}), hn: this.shared('helpNew', []), paused: this.shared('paused', { 'kora-app': { reason: 'Build paused until milestone 2 is paid', since: 'Sat 26 Sep', by: 'Babatope A.' } })
    }, this.extraState ? this.extraState() : {}, this.pageState ? this.pageState() : {});
    this._per = {};
  }
  componentDidMount() {
    var self = this;
    this.reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.onResize = function () { if (self.state.pop && !self.state.pop.asSheet) self.setState({ pop: null }); self.queueTour(); };
    this.onScroll = function (e) { var t = e && e.target; if (t && t.closest && t.closest('.board, .tgWrap, .tlWrap, .cmWrap')) return; if (self.state.pop && !self.state.pop.asSheet) self.setState({ pop: null }); self.queueTour(); };
    this.onKey = function (e) {
      var k = e.key;
      if ((e.ctrlKey || e.metaKey) && (k === 'k' || k === 'K')) { e.preventDefault(); self.openPalette(); return; }
      if (k === 'Escape') { var s = self.state; if (s.pop) self.setState({ pop: null }); else if (s.tour >= 0) self.setState({ tour: -1 }); else if (s.sheet) self.closeSheet(); else if (s.pal) self.setState({ pal: false }); else if (s.bell) self.setState({ bell: false }); else if (s.drawer) self.setState({ drawer: false }); }
    };
    /* Typing must never lose its place: remember the focused field and put focus and caret back after a render replaces it. */
    this.onFocusIn = function (e) { var t = e.target; if (t && t.id && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && t.type !== 'file') self._foc = { id: t.id, s: t.selectionStart, e: t.selectionEnd }; };
    this.onTyped = function (e) { var t = e.target; if (t && t.id && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && t.type !== 'file') self._foc = { id: t.id, s: t.selectionStart, e: t.selectionEnd }; };
    this.onDown = function (e) { var t = e.target; if (!(t && t.closest && t.closest('input, textarea, label'))) self._foc = null; };
    document.addEventListener('focusin', this.onFocusIn); document.addEventListener('input', this.onTyped, true); document.addEventListener('pointerdown', this.onDown, true);
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
    document.addEventListener('keydown', this.onKey);
    this.boot(this.reduce ? 150 : 750);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.raf); cancelAnimationFrame(this.traf); clearTimeout(this.tm); clearTimeout(this.ta); clearTimeout(this.bt); clearInterval(this.ti);
    window.removeEventListener('resize', this.onResize); window.removeEventListener('scroll', this.onScroll, true); document.removeEventListener('keydown', this.onKey); document.removeEventListener('focusin', this.onFocusIn); document.removeEventListener('input', this.onTyped, true); document.removeEventListener('pointerdown', this.onDown, true);
    document.documentElement.style.overflow = '';
  }
  componentDidUpdate(pp, ps) {
    var s = this.state, self = this;
    if (s.dev !== ps.dev || s.dark !== ps.dark || s.installHidden !== ps.installHidden) { try { window.localStorage.setItem('wdc-proto', JSON.stringify({ dev: s.dev, dark: s.dark, installHidden: s.installHidden })); } catch (e) { /* storage can be off */ } }
    var locked = !!(s.sheet || s.drawer || s.pal || (s.pop && s.pop.asSheet) || s.tour >= 0);
    if (s.dev === 'desktop') document.documentElement.style.overflow = locked ? 'hidden' : '';
    if (s.pal && !ps.pal) setTimeout(function () { var el = document.getElementById('palIn'); if (el) el.focus(); }, 40);
    if (s.pop && s.pop.search && !(ps.pop && ps.pop.search)) setTimeout(function () { var el = document.getElementById('popIn'); if (el) el.focus(); }, 60);
    if (s.sheet && s.sheet !== ps.sheet) {
      setTimeout(function () { var el = document.getElementById(s.sheet.focus || 'shPrimary'); if (el && el.focus) el.focus({ preventScroll: true }); var b = document.getElementById('shBody'); if (b && !s.sheet.keepScroll) b.scrollTop = 0; }, 80);
    }
    if (s.tour >= 0 && (s.tour !== ps.tour || s.dev !== ps.dev)) this.tourGo();
    else if (s.tour >= 0) this.queueTour();
    var f = this._foc;
    if (f) { var fe = document.getElementById(f.id); if (fe && document.activeElement !== fe) { try { fe.focus({ preventScroll: true }); if (f.s != null && fe.setSelectionRange) fe.setSelectionRange(f.s, f.e); } catch (err) { /* some input types have no caret */ } } }
    if (s.sheet && s.sheet.watch) s.sheet.watch(this.sheetCtx(), s);
    if (this.pageDidUpdate) this.pageDidUpdate(ps);
  }

  /* ---------- boot and skeleton ---------- */
  boot(ms) {
    var self = this;
    clearTimeout(this.bt); cancelAnimationFrame(this.raf);
    this.setState({ ready: false, p: 0 });
    this.bt = setTimeout(function () {
      self.setState({ ready: true });
      if (self.reduce) { self.setState({ p: 1 }); return; }
      var t0 = performance.now();
      var step = function (t) { var k = Math.min(1, (t - t0) / 1000); self.setState({ p: 1 - Math.pow(1 - k, 3) }); if (k < 1) self.raf = requestAnimationFrame(step); };
      self.raf = requestAnimationFrame(step);
    }, ms);
  }

  /* ---------- small helpers ---------- */
  anim(k) { return k % 2 ? 'rinA' : 'rinB'; }
  ngn(n) { return '₦' + Math.round(n).toLocaleString('en-NG'); }
  short(n) { if (n >= 1e6) return '₦' + (Math.round(n / 1e4) / 100).toString() + 'm'; if (n >= 1e3) return '₦' + Math.round(n / 1e3) + 'k'; return '₦' + Math.round(n); }
  isPhone() { return this.state.dev === 'phone' || (this.state.dev === 'desktop' && window.innerWidth <= 600); }
  exitThen(sel, fn) {
    var els = document.querySelectorAll(sel);
    if (this.reduce || !els.length) { fn(); return; }
    for (var k = 0; k < els.length; k++) els[k].classList.add('isOut');
    setTimeout(fn, 200);
  }
  say(msg, opt) {
    opt = opt || {}; var self = this;
    clearInterval(this.ti); clearTimeout(this.ta);
    var te = document.querySelector('.toastP.isOut'); if (te) te.classList.remove('isOut');
    var n = (this.state.ta || 0) + 1;
    if (opt.delay) {
      var left = opt.delay;
      this.setState({ ta: n, toast: { msg: opt.pending(left), undo: function () { clearInterval(self.ti); if (opt.cancel) opt.cancel(); self.say(opt.cancelled || 'Cancelled. Nothing was sent.'); }, auto: false } });
      this.ti = setInterval(function () { left--; if (left <= 0) { clearInterval(self.ti); self.say(msg); } else if (self.state.toast) self.setState({ toast: Object.assign({}, self.state.toast, { msg: opt.pending(left) }) }); }, 1000);
      return;
    }
    var dur = opt.undo ? 8000 : 5000;
    this.setState({ ta: n, toast: { msg: msg, undo: opt.undo || null, auto: true, dur: dur } });
    this.ta = setTimeout(function () { self.exitThen('.toastP', function () { if (self.state.ta === n) self.setState({ toast: null }); }); }, dur);
  }
  later(msg) { this.say(msg || 'This opens in the full prototype.'); }

  /* ---------- sheets: a stack, so a confirmation opened from a sheet returns to it on Cancel ---------- */
  sh(o) { return Object.assign({ kind: '', eyebrow: '', title: '', chip: '', tone: 'var(--ad-tone-neutral)', rows: [], body: '', list: [], listTitle: '', checks: [], checksTitle: '', feed: [], primary: 'Done', pToast: '', secondary: '', sToast: '', compose: false, composeLabel: 'Message', composePh: 'Write here', draft: '', note: '' }, o); }
  open(sh, push) {
    var s = this.state;
    var stack = push && s.sheet ? s.stack.concat([{ sheet: s.sheet, draft: s.draft, reason: s.reason, ack: s.ack, spick: s.spick, ck: s.ck, zoom: s.zoom, form: s.form, lextra: s.lextra, lsel: s.lsel, lq: s.lq, lpg: s.lpg }]) : [];
    this.setState({ sheet: sh, stack: stack, sheetFull: false, bell: false, pal: false, drawer: false, menu: null, pop: null, tour: -1, draft: sh.draft || '', reason: '', ack: false, ck: {}, spick: sh.pick != null ? sh.pick : -1, vis: sh.vis || 'team', zoom: 1, cmt: '', form: Object.assign({}, sh.form || {}), lq: '', lpg: 0, lcreate: false, lcf: {}, lextra: [], lsel: Object.assign({}, sh.lsel || {}), ui: null, edMode: 'write', shTab: 0 });
  }
  closeSheet(force) {
    var self = this, raw = this.state.sheet;
    if (!force && raw && raw.guard && raw.guard(this.sheetCtx(), this.state)) { this.ask({ eyebrow: 'Unsaved', title: 'Close without saving?', body: raw.guardBody || 'What you have written here will be lost.', ok: 'Close without saving', cancel: 'Keep writing', danger: true, icon: this.icons().alert, tone: 'var(--ad-tone-warn)', onOk: function () { self.setState({ stack: [] }); self.closeSheet(true); } }, true); return; }
    this.exitThen('.sheetP, .sheetP ~ .scrim, .scrim', function () { self.setState({ sheet: null, stack: [], sheetFull: false }); }); }
  sheetBack() {
    var s = this.state; if (!s.stack.length) { this.closeSheet(); return; }
    var prev = s.stack[s.stack.length - 1];
    this.setState({ sheet: prev.sheet, stack: s.stack.slice(0, -1), draft: prev.draft || '', reason: prev.reason || '', ack: !!prev.ack, spick: prev.spick == null ? -1 : prev.spick, ck: prev.ck || {}, zoom: prev.zoom || 1, form: prev.form || {}, lextra: prev.lextra || [], lsel: prev.lsel || {}, lq: prev.lq || '', lpg: prev.lpg || 0, lcreate: false, lcf: {}, ui: null });
  }
  ask(cf, push) {
    var self = this, I = this.icons();
    this.open(this.sh({
      kind: 'confirm', eyebrow: cf.eyebrow || 'Please confirm', title: cf.title, body: cf.body || '', icon: cf.icon || I.check, iconTone: cf.tone || 'var(--ad-tone-brand)',
      preview: cf.to ? { to: cf.to, subject: cf.subject || '', text: cf.preview || '' } : null,
      ack: cf.needAck ? (cf.ackText || 'This cannot be undone.') : '', reason: cf.input ? { label: cf.inputLabel || 'Reason', ph: cf.inputPh || '', required: true } : null,
      primary: cf.ok || 'Confirm', back: !!cf.back, danger: !!cf.danger, green: !!cf.green, secondary: cf.cancel || 'Cancel', note: cf.note || '',
      onPrimary: function (ctx) { if (cf.onOk) cf.onOk(ctx.reason); if (cf.okToast) self.say(cf.okToast); },
      onSecondary: function () { if (cf.onCancel) { cf.onCancel(); return 'stay'; } if (self.state.stack.length) self.sheetBack(); else self.closeSheet(); return 'stay'; }
    }), push !== false && !!this.state.sheet);
  }
  sheetCtx() {
    var s = this.state, raw = s.sheet || {}, base = typeof raw.list === 'function' ? raw.list(s) : (raw.list || []), full = base.concat(s.lextra || []);
    var picks = Object.keys(s.lsel || {}).filter(function (k) { return s.lsel[k]; }).map(Number).sort(function (a, b) { return a - b; });
    return { draft: (s.draft || '').trim(), reason: (s.reason || '').trim(), pick: s.spick, picks: picks, item: s.spick >= 0 ? full[s.spick] : null, items: picks.map(function (k) { return full[k]; }), ack: s.ack, checks: s.ck, vis: s.vis, form: s.form || {} };
  }
  runSheet(which) {
    var self = this, cur = this.state.sheet; if (!cur) return;
    var fn = which === 'p' ? cur.onPrimary : cur.onSecondary, toast = which === 'p' ? cur.pToast : cur.sToast, ctx = this.sheetCtx();
    if (cur.keepOpen && which === 'p') { if (fn) fn(ctx); return; }
    if (which === 's' && cur.onSecondary) { var r = fn(ctx); if (r === 'stay') return; }
    if (which === 'p' && cur.back && this.state.stack.length) { this.sheetBack(); if (fn) fn(ctx); if (toast) this.say(toast); return; }
    this.exitThen('.sheetP, .scrim', function () {
      self.setState({ sheet: null, stack: [], sheetFull: false });
      if (fn && !(which === 's' && cur.onSecondary)) fn(ctx);
      if (toast) self.say(toast);
    });
  }
  /* Drag the grab handle: down past a threshold closes, up expands, otherwise it springs back. */
  grabStart(e, sel, onClose) {
    var self = this, el = document.querySelector(sel); if (!el) return;
    var y0 = e.clientY, t0 = performance.now(), dy = 0;
    el.classList.add('dragging');
    var move = function (ev) { dy = ev.clientY - y0; el.style.transform = 'translateY(' + Math.max(-40, dy) + 'px)'; };
    var up = function () {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      var v = dy / Math.max(1, performance.now() - t0);
      el.classList.remove('dragging');
      if (dy > 120 || v > 0.6) { el.style.transition = 'transform .22s cubic-bezier(.4,0,1,1)'; el.style.transform = 'translateY(110%)'; setTimeout(function () { el.style.transform = ''; el.style.transition = ''; onClose(); }, 210); return; }
      el.style.transition = 'transform .4s ' + (self.reduce ? 'linear' : 'cubic-bezier(.16,1,.3,1)'); el.style.transform = '';
      setTimeout(function () { el.style.transition = ''; }, 420);
      if (dy < -50 && sel === '#sheetEl') self.setState({ sheetFull: true });
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }

  /* ---------- menus: a popover on wide screens, a bottom sheet on phones ---------- */
  /* aria-expanded for the ⋮ that opened the current menu, so it stays pressed while its options show */
  /* Figure cards carry a solid icon tile, white icon on a tone fill, chosen by what the figure is. */
  statDeco(k) {
    var I = this.icons();
    var rep = 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3', hour = 'M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2', inn = 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3';
    var ic = ({ 'Collected, October': I.cash, 'Outstanding': I.wallet, 'Live projects': I.folder, 'Recurring a month': rep, 'Retainers a month': rep, 'Due today': I.clock, 'With clients': I.users, 'Replies waiting': I.msg, 'Done this week': I.check, 'Waiting on clients': hour, 'Due this week': I.cal, 'Due next 7 days': I.cal, 'Active clients': I.users, 'Using the portal': inn })[k.label] || k.ic || I.chart;
    var tile = ({ 'var(--ad-tone-good)': 'var(--ad-tone-good)', 'var(--ad-tone-bad)': 'var(--ad-tone-bad)', 'var(--ad-series-1)': 'var(--ad-tone-brand)', 'var(--ad-series-2)': 'var(--ad-tone-live)', 'var(--ad-tone-live)': 'var(--ad-tone-live)', 'var(--ad-tone-warn)': 'var(--ad-tone-warn)' })[k.dot] || 'var(--ad-tone-brand)';
    return { ic: ic, tile: tile };
  }
  popOn(kind, id) { var p = this.state.pop; return p && p.kind === kind && p.id === id ? 'true' : 'false'; }
  openPop(e, kind, id, w, h, label, extra) {
    var asSheet = this.isPhone();
    if (this.state.pop && this.state.pop.id === id && this.state.pop.kind === kind) { this.setState({ pop: null }); return; }
    var base = Object.assign({ kind: kind, id: id, w: w, label: label || 'Menu', asSheet: asSheet, origin: 'top right', x: 0, y: 0, search: false, searchPh: '', note: '' }, extra || {});
    if (!asSheet && e && e.currentTarget) {
      var r = e.currentTarget.getBoundingClientRect(), dev = document.querySelector('.device.framed');
      var ox = 0, oy = 0, W = window.innerWidth, H = window.innerHeight;
      if (dev) { var d = dev.getBoundingClientRect(); ox = d.left + 10; oy = d.top + 10; W = dev.clientWidth; H = dev.clientHeight; }
      var x = Math.min(Math.max(8, r.right - ox - w), W - w - 8), y = r.bottom - oy + 6;
      if (y + h > H - 8) { y = Math.max(8, r.top - oy - 6 - h); base.origin = 'bottom right'; }
      base.x = Math.round(x); base.y = Math.round(y);
    }
    this.setState({ pop: base, menu: null, dq: '' });
  }
  closePop() { var self = this; this.exitThen('.mSheet, .mSheet ~ .scrim, .menuF', function () { self.setState({ pop: null }); }); }
  menuItem(label, d, fn, opt) {
    opt = opt || {}; var self = this;
    return { isItem: true, sep: false, label: label, d: d, hasIcon: !!d, sub: opt.sub || '', hasSub: !!opt.sub, hint: opt.hint || '', col: opt.danger ? 'var(--ad-bad-ink)' : 'var(--ad-ink)', role: opt.role || 'menuitem', checked: opt.checked ? 'true' : 'false', cls: opt.on ? 'on' : '', hasAv: !!opt.av, av: opt.av || '', ini: opt.ini || '', hasBadge: !!opt.badge, badge: opt.badge || '', badgeTone: opt.badgeTone || 'var(--ad-tone-good)', pick: function () { self.setState({ pop: null }); fn(); } };
  }
  menuSep() { return { sep: true, isItem: false }; }

  /* ---------- pagination: default 5 per page, menu of 5, 10, 20 ---------- */
  pager(key, total, size, page, setPage, setSize) {
    var self = this, n = Math.max(1, Math.ceil(total / size)), pages = [];
    this._per[key] = { cur: size, set: setSize };
    var add = function (k) { pages.push({ n: k + 1, isNum: true, gap: false, cls: k === page ? 'on' : '', cur: k === page ? 'page' : 'false', aria: 'Page ' + (k + 1), go: function () { setPage(k); } }); };
    if (n <= 7) { for (var i = 0; i < n; i++) add(i); }
    else { add(0); if (page > 2) pages.push({ gap: true, isNum: false }); for (var j = Math.max(1, page - 1); j <= Math.min(n - 2, page + 1); j++) add(j); if (page < n - 3) pages.push({ gap: true, isNum: false }); add(n - 1); }
    return { range: total ? (page * size + 1) + ' to ' + Math.min(total, page * size + size) + ' of ' + total : '0 results', pages: pages, compact: 'Page ' + (page + 1) + ' of ' + n, prevDis: page === 0, nextDis: page >= n - 1, prev: function () { setPage(Math.max(0, page - 1)); }, next: function () { setPage(Math.min(n - 1, page + 1)); }, perLabel: size + ' per page', openPer: function (e) { self.openPop(e, 'per', key, 170, 160, 'Items per page'); } };
  }
  perItems(key) {
    var self = this, P = this._per[key], I = this.icons(); if (!P) return [];
    return [5, 10, 20].map(function (n) { return self.menuItem(n + ' per page', n === P.cur ? I.check : '', function () { P.set(n); }, { role: 'menuitemradio', checked: n === P.cur, on: n === P.cur }); });
  }

  /* ---------- the tour: Joyride behaviour (scroll to target, offset, spotlight, adaptive placement, follows scrolling, blocks the rest) ---------- */
  startTour() { this.open(this.sh({ kind: 'tour', eyebrow: 'Tour', title: 'How do you want to look around?', body: 'Pick one. You can stop at any step, and replay either from Tour this page.', primary: this.state.tourKind === 'full' ? 'Start the walkthrough' : 'Start the page tour', secondary: 'Not now', onPrimary: this.beginTour.bind(this) })); }
  beginTour() { this.setState({ tour: 0 }); }
  allSteps(kind) {
    var p = this.tourSteps(); if (kind !== 'full') return p;
    var w = this.walk(), I = this.icons();
    var nav = { target: 'nav|menu', title: 'Your pages', icon: I.home, body: w.nav };
    var bell = { target: 'bell', title: 'Alerts', icon: I.bell, body: w.bell };
    var foot = { target: 'foot|menu', title: 'Tour, theme and you', icon: I.gear, body: 'Replay a tour, switch light and dark, install the app or sign out. It all lives at the bottom of the menu.' };
    return [nav].concat(p.filter(function (x) { return x.target.indexOf('search') === 0; }), [bell], p.filter(function (x) { return x.target.indexOf('search') !== 0; }), [foot]);
  }
  tourTarget(step) {
    var names = step.target.split('|');
    for (var i = 0; i < names.length; i++) {
      var els = document.querySelectorAll('[data-tour="' + names[i] + '"]');
      for (var k = 0; k < els.length; k++) { var r = els[k].getBoundingClientRect(); if (r.width > 0 && r.height > 0) return els[k]; }
    }
    return null;
  }
  frame() {
    var dev = document.querySelector('.device.framed');
    if (dev) { var d = dev.getBoundingClientRect(); return { ox: d.left + 10, oy: d.top + 10, W: dev.clientWidth, H: dev.clientHeight, sc: document.getElementById('scroller'), framed: true }; }
    return { ox: 0, oy: 0, W: window.innerWidth, H: window.innerHeight, sc: null, framed: false };
  }
  tourGo() {
    var self = this, steps = this.allSteps(this.state.tourKind), st = steps[this.state.tour]; if (!st) return;
    setTimeout(function () {
      var el = self.tourTarget(st), F = self.frame(); if (!el) { self.placeTour(); return; }
      var r = el.getBoundingClientRect(), top = r.top - F.oy, offset = st.target.indexOf('nav') === 0 || st.target.indexOf('foot') === 0 || st.target === 'bell' || st.target.indexOf('search') === 0 || st.target === 'menu' ? null : 92;
      if (offset != null && (top < offset || top + Math.min(r.height, F.H * 0.55) > F.H - 24)) {
        var delta = top - offset;
        if (F.sc) F.sc.scrollTo({ top: F.sc.scrollTop + delta, behavior: self.reduce ? 'auto' : 'smooth' });
        else window.scrollTo({ top: window.scrollY + delta, behavior: self.reduce ? 'auto' : 'smooth' });
      }
      self.placeTour(); setTimeout(function () { self.placeTour(); var c = document.getElementById('tCard'); if (c) c.focus({ preventScroll: true }); }, self.reduce ? 0 : 460);
    }, 40);
  }
  queueTour() { var self = this; if (this.state.tour < 0) return; cancelAnimationFrame(this.traf); this.traf = requestAnimationFrame(function () { self.placeTour(); }); }
  placeTour() {
    var steps = this.allSteps(this.state.tourKind), st = steps[this.state.tour]; if (!st) return;
    var T = document.getElementById('tmT'), B = document.getElementById('tmB'), L = document.getElementById('tmL'), R = document.getElementById('tmR'), ring = document.getElementById('tRing'), card = document.getElementById('tCard');
    if (!T || !card) return;
    var F = this.frame(), el = this.tourTarget(st), pad = 8;
    var x = F.W / 2, y = F.H / 2, w = 0, h = 0;
    if (el) { var r = el.getBoundingClientRect(); x = r.left - F.ox - pad; y = r.top - F.oy - pad; w = r.width + pad * 2; h = r.height + pad * 2; }
    if (el) { var e = 4; if (x < e) { w -= e - x; x = e; } if (y < e) { h -= e - y; y = e; } if (x + w > F.W - e) w = F.W - e - x; if (y + h > F.H - e) h = F.H - e - y; }
    var x2 = x + w, y2 = y + h, px = function (v) { return Math.round(v) + 'px'; };
    T.style.cssText = 'left:0;top:0;width:' + px(F.W) + ';height:' + px(Math.max(0, y));
    B.style.cssText = 'left:0;top:' + px(y2) + ';width:' + px(F.W) + ';height:' + px(Math.max(0, F.H - y2));
    L.style.cssText = 'left:0;top:' + px(y) + ';width:' + px(Math.max(0, x)) + ';height:' + px(h);
    R.style.cssText = 'left:' + px(x2) + ';top:' + px(y) + ';width:' + px(Math.max(0, F.W - x2)) + ';height:' + px(h);
    ring.style.cssText = 'left:' + px(x) + ';top:' + px(y) + ';width:' + px(w) + ';height:' + px(h) + ';opacity:' + (el ? 1 : 0);
    var cw = card.offsetWidth || 340, chh = card.offsetHeight || 220, gap = 14, m = 12, cx, cy;
    var vy = Math.max(m, Math.min(y, F.H - m)), vy2 = Math.max(m, Math.min(y2, F.H - m));
    if (F.H - vy2 >= chh + gap + m) { cy = vy2 + gap; cx = x + w / 2 - cw / 2; }
    else if (vy >= chh + gap + m) { cy = vy - gap - chh; cx = x + w / 2 - cw / 2; }
    else if (F.W - x2 >= cw + gap + m) { cx = x2 + gap; cy = y + h / 2 - chh / 2; }
    else if (x >= cw + gap + m) { cx = x - gap - cw; cy = y + h / 2 - chh / 2; }
    else { cx = (F.W - cw) / 2; cy = F.H - chh - m; }
    cx = Math.max(m, Math.min(cx, F.W - cw - m)); cy = Math.max(m, Math.min(cy, F.H - chh - m));
    card.style.left = px(cx); card.style.top = px(cy);
  }

  /* ---------- the deck: stamp from the pressed button, a directional exit, the next card rising from the stack ---------- */
  stampFrom(e) {
    if (!e || !e.currentTarget || !e.currentTarget.getBoundingClientRect) return null;
    var card = document.querySelector('.topCard'); if (!card) return null;
    var r = card.getBoundingClientRect(), b = e.currentTarget.getBoundingClientRect();
    return { cx: ((b.left + b.width / 2 - r.left) / r.width * 100).toFixed(1) + '%', cy: ((b.top + b.height / 2 - r.top) / r.height * 100).toFixed(1) + '%' };
  }
  clear(item, how, label, msg, opt) {
    opt = opt || {}; var self = this;
    var all = this.deck(), idx = all.map(function (d) { return d.id; }).indexOf(item.id);
    var apply = function () {
      var gone = Object.assign({}, self.state.gone), sn = Object.assign({}, self.state.snoozed);
      if (how === 'snooze') sn[item.id] = label; else gone[item.id] = how;
      self.setState(Object.assign({ gone: gone, snoozed: sn, leaving: null, menu: null, pop: null, enterN: self.state.enterN + 1, segPop: idx }, opt.extra || {}));
      var restore = function () { var g = Object.assign({}, self.state.gone), z = Object.assign({}, self.state.snoozed); delete g[item.id]; delete z[item.id]; self.setState(Object.assign({ gone: g, snoozed: z, enterN: self.state.enterN + 1, celebrated: false }, opt.undoPatch || {})); };
      if (opt.delayed) self.say(opt.delayed.done, { delay: 8, pending: opt.delayed.pending, cancel: restore, cancelled: 'Cancelled. Nothing was sent, and the card is back.' });
      else if (opt.final) self.say(msg);
      else self.say(msg, { undo: restore });
      var left = all.filter(function (d) { return !gone[d.id] && !sn[d.id]; }).length;
      if (!left && !self.state.celebrated) { self.setState({ celebrated: true }); setTimeout(function () { self.confetti(); }, 380); }
    };
    if (this.reduce) { apply(); return; }
    var kind = opt.delayed ? 'send' : (how === 'snooze' ? 'snooze' : (how === 'delegated' ? 'pass' : 'done'));
    this.setState({ leaving: item.id, leaveKind: kind, stampAt: opt.at || null, menu: null, pop: null });
    clearTimeout(this.tm); this.tm = setTimeout(apply, { done: 700, send: 700, snooze: 540, pass: 560 }[kind]);
  }
  deckView(all, extra) {
    var s = this.state, self = this, I = this.icons();
    var queue = all.filter(function (d) { return !s.gone[d.id] && !s.snoozed[d.id]; });
    var top = queue[0], leaving = top && s.leaving === top.id;
    var LK = ({ done: { anim: 'cardDone', dur: '.74s', tone: '#15803d', d: 'M15 27l7.5 7.5L37 19', label: 'Done' }, send: { anim: 'cardSend', dur: '.74s', tone: '#b84a00', d: 'M16 36 36 16M22 16h14v14', label: 'Sending' }, snooze: { anim: 'cardSnooze', dur: '.58s', tone: '#3a3c6e', d: 'M26 14v12l8 5', label: 'Snoozed' }, pass: { anim: 'cardPass', dur: '.6s', tone: '#23239b', d: 'M15 26h22M29 18l8 8-8 8', label: 'Handed over' } })[s.leaveKind || 'done'];
    var at = s.stampAt || { cx: '50%', cy: '82%' };
    var strip = all.map(function (d, i) { var on = !!(s.gone[d.id] || s.snoozed[d.id]); return { cls: (on ? 'on' : '') + (i === s.segPop ? ' pop' : '') }; });
    var act = function (fn) { return function (e) { if (!top) return; var at2 = self.stampFrom(e); fn(at2); }; };
    var topV = top ? Object.assign({}, top, {
      anim: leaving ? LK.anim : (s.enterN % 2 ? 'deckIn' : 'deckIn2'), dur: leaving ? LK.dur : '.66s', ease: leaving ? 'cubic-bezier(.45,0,.2,1)' : 'var(--spring)', fill: leaving ? 'forwards' : 'backwards',
      kidCls: leaving ? 'isLeaving' : (s.enterN % 2 ? 'inA' : 'inB'), deckCls: leaving ? 'shift' : '', stamp: !!leaving, stampTone: LK.tone, stampD: LK.d, stampLabel: LK.label, cx: at.cx, cy: at.cy,
      pos: (all.indexOf(top) + 1) + ' of ' + all.length, aria: top.kind + ': ' + top.title, hasMeta: !!(top.meta && top.meta.length), hasWhy: !!top.why, hasProject: !!top.project,
      primary: act(function (at2) { self.deckPrimary(top, at2); }),
      secondary: act(function (at2) { self.deckSecondary(top, at2); }),
      details: function () { self.open(Object.assign({}, top.sheet, { deckId: top.id })); }
    }) : { meta: [] };
    var stripDone = all.length - queue.length;
    return Object.assign({
      strip: strip, stripText: stripDone + ' of ' + all.length + ' cleared', stripLabel: stripDone + ' of ' + all.length + ' cleared today',
      hasTop: !!top, deckEmpty: !top, top: topV, hasG1: queue.length > 1, hasG2: queue.length > 2, queueLen: queue.length,
      openSnooze: function (e) { self.openPop(e, 'snooze', 'deck', 260, 250, self.snoozeTitle ? self.snoozeTitle() : 'Snooze until', { note: '' }); },
      openDelegate: function (e) { self.openPop(e, 'delegate', 'deck', 300, 340, 'Hand over to', { search: true, searchPh: 'Name or department' }); },
      deckKey: function (e) { if (!top || e.target !== e.currentTarget) return; var k = (e.key || '').toLowerCase(); if (k === 'd') { e.preventDefault(); self.clear(top, 'done', '', 'Done: ' + top.title); } else if (k === 's') { e.preventDefault(); self.openPop(null, 'snooze', 'deck', 260, 250, 'Snooze until'); } },
      restoreDeck: function () { self.setState({ gone: {}, snoozed: {}, enterN: self.state.enterN + 1, celebrated: false, segPop: -1 }); self.say('All cards are back.'); }
    }, extra || {});
  }
  deckPrimary(top, at) {
    var self = this;
    if (top.primaryFn) { top.primaryFn(at); return; }
    if (top.primaryConfirm) { var c = top.primaryConfirm; this.ask(Object.assign({}, c, { okToast: '', onOk: function (r) { self.clear(top, 'done', '', typeof c.okToast === 'function' ? c.okToast(r) : c.okToast, { at: at, final: !c.undo }); } })); return; }
    if (top.delayed) { this.clear(top, 'done', '', '', { delayed: top.delayed, at: at }); return; }
    if (top.primarySheet) { this.open(Object.assign({}, top.primarySheet, { deckId: top.id })); return; }
    this.clear(top, 'done', '', top.pToast, { at: at });
  }
  deckSecondary(top, at) {
    var self = this;
    if (top.secondaryFn) { top.secondaryFn(at); return; }
    if (top.confirm) { var c = top.confirm; this.ask(Object.assign({}, c, { okToast: '', onOk: function () { self.clear(top, 'done', '', c.okToast, { at: at, final: !c.undo }); } })); return; }
    if (top.sheetSecondary) { this.open(Object.assign({}, top.sheet, { deckId: top.id })); return; }
    if (top.keep) { this.say(top.sToast); return; }
    this.clear(top, 'done', '', top.sToast, { at: at });
  }
  snoozeItems() {
    var self = this, I = this.icons(), all = this.deck(), s = this.state;
    var top = all.filter(function (d) { return !s.gone[d.id] && !s.snoozed[d.id]; })[0]; if (!top) return [];
    return this.snoozeOptions().map(function (o) { return self.menuItem(o[0], I.clock, function () { self.clear(top, 'snooze', o[0] + ', ' + o[1], 'Snoozed until ' + o[0].toLowerCase() + ', ' + o[1] + '. It waits in Later.'); }, { hint: o[1] }); });
  }
  delegateItems() {
    var self = this, all = this.deck(), s = this.state, dq = (s.dq || '').trim().toLowerCase();
    var top = all.filter(function (d) { return !s.gone[d.id] && !s.snoozed[d.id]; })[0]; if (!top) return [];
    return this.teamData().filter(function (m) { return !dq || (m.name + ' ' + m.dept).toLowerCase().indexOf(dq) >= 0; }).map(function (m) {
      return self.menuItem(m.name, '', function () { self.clear(top, 'delegated', '', 'Handed to ' + m.name + '. It is on their ' + (self.teamDay ? self.teamDay() : 'My Day') + ' now, with your notes.'); }, { sub: m.dept + ' · ' + m.load, av: m.tone, ini: m.i, badge: m.dept === top.dept ? 'Fits' : '', badgeTone: 'var(--ad-tone-good)' });
    });
  }

  /* ---------- confetti: the site's (onboarding/confetti.tsx), seventy pieces, one Web Animation each, removes itself ---------- */
  confetti() {
    if (this.reduce) return;
    var layer = document.getElementById('confL'); if (!layer) return;
    var COL = ['#ff6500', '#000065', '#ffb066', '#4a4ad4', '#ff8a2b', '#ffd8b0'], W = layer.clientWidth || window.innerWidth, H = layer.clientHeight || window.innerHeight;
    var noise = function (i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
    var done = 0, N = W < 560 ? 44 : 70;
    for (var i = 0; i < N; i++) {
      var p = document.createElement('i'), size = 6 + noise(i, 6) * 7;
      p.style.cssText = 'left:' + (noise(i, 1) * 100) + '%;width:' + size + 'px;height:' + (noise(i, 8) > 0.66 ? size : size * 0.45) + 'px;background:' + COL[Math.floor(noise(i, 7) * COL.length)] + ';border-radius:' + (noise(i, 8) > 0.66 ? '50%' : '2px');
      layer.appendChild(p);
      var drift = (noise(i, 4) - 0.5) * 0.26 * W, spin = 360 + noise(i, 5) * 900;
      var a = p.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + drift + 'px,' + (H * 1.1) + 'px) rotate(' + spin + 'deg)', opacity: 0.9, offset: 0.85 }, { transform: 'translate(' + drift * 1.1 + 'px,' + (H * 1.15) + 'px) rotate(' + spin + 'deg)', opacity: 0 }], { duration: 2600 + noise(i, 3) * 1700, delay: noise(i, 2) * 900, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'both' });
      a.onfinish = (function (node) { return function () { node.remove(); if (++done >= N) layer.innerHTML = ''; }; })(p);
    }
    setTimeout(function () { layer.innerHTML = ''; }, 6500);
  }

  /* ---------- search ---------- */
  openPalette() { this.setState({ pal: true, q: '', hi: 0, pa: this.state.pa + 1, bell: false, menu: null, pop: null, tour: -1, drawer: false }); }
  palPick(r) { this.setState({ pal: false, q: '' }); if (r.href) { window.location.href = r.href; return; } if (r.sheet) this.open(r.sheet); else this.later(r.label + ' opens in the full prototype.'); }

  /* ---------- the values every template shares ---------- */
  kit() {
    var s = this.state, self = this, I = this.icons(); var svq = (function () { try { return new URLSearchParams(window.location.search); } catch (e) { return new URLSearchParams(''); } })();
    var DEV = [['desktop', 'Desktop', 'M2 4h20v12H2zM8 20h8M12 16v4', '100%', 'auto', 'Full width'], ['tablet', 'Tablet', 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2', '834px', '1112px', '834 × 1112'], ['phone', 'Phone', 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2', '390px', '844px', '390 × 844']];
    var devI = 0; DEV.forEach(function (d, i) { if (d[0] === s.dev) devI = i; });
    var cur = DEV[devI];
    var navOn = this.navSection ? this.navSection() : this.pageName();
    var mk = function (n) { var on = n.label === navOn; return {  label: n.label, d: n.d, href: n.href || '#', hasCount: n.count > 0, count: n.count, tone: n.tone || 'var(--ad-tone-brand)', aria: n.label + (n.count ? ', ' + n.count + ' new' : ''), cls: on ? 'on' : '', current: on ? 'page' : 'false', go: function (e) { if (on || !n.href || n.href === '#') { if (e && e.preventDefault) e.preventDefault(); self.setState({ drawer: false }); } } }; };
    var nav2 = this.roleNav().filter(function (n) { return n.second; }).map(mk);
    var nav = this.navData().map(function (n) { var on = n.label === navOn; return { label: n.label, d: n.d, href: n.href || '#', hasCount: n.count > 0, count: n.count, tone: n.tone || 'var(--ad-tone-brand)', aria: n.label + (n.count ? ', ' + n.count + ' new' : ''), cls: on ? 'on' : '', current: on ? 'page' : 'false', go: function (e) { if (on || !n.href || n.href === '#') { if (e && e.preventDefault) e.preventDefault(); self.setState({ drawer: false }); if (!on) self.later(n.label + ' opens in the full prototype.'); } } }; });
    var notesRaw = this.notesData();
    var notes = notesRaw.map(function (n) { var rd = !!s.read[n.id]; return Object.assign({}, n, { unread: !rd, dotBg: rd ? 'transparent' : 'var(--ad-dot)', weight: rd ? '400' : '600', open: function () { var r = Object.assign({}, self.state.read); r[n.id] = true; self.setState({ read: r }); self.open(n.sheet); } }); });
    var unread = notes.filter(function (n) { return n.unread; }).length;
    var shown = (s.bellTab === 'unread' ? notes.filter(function (n) { return n.unread; }) : notes).map(function (n, i) { return Object.assign({}, n, { anim: self.anim(s.bellTab === 'unread' ? 1 : 0), delay: (i * 0.03) + 's' }); });
    var q = s.q.trim().toLowerCase(), recs = this.records().filter(function (r) { return !q || (r.label + ' ' + r.sub + ' ' + r.kind).toLowerCase().indexOf(q) >= 0; });
    var flat = [], groups = [];
    this.recordKinds().forEach(function (k) {
      var items = recs.filter(function (r) { return r.kind === k; }); if (!items.length) return;
      groups.push({ name: k === 'Page' ? 'Go to' : k + 's', items: items.map(function (r) { var idx = flat.length; flat.push(r); return { id: 'pal-' + idx, label: r.label, sub: r.sub, ini: r.ini, tone: r.tone, cls: '', sel: 'false', idx: idx, anim: self.anim(s.pa), delay: Math.min(idx, 8) * 0.025 + 's', pick: function () { self.palPick(r); }, hover: function () { if (self.state.hi !== idx) self.setState({ hi: idx }); } }; }) });
    });
    var hi = Math.max(0, Math.min(s.hi, flat.length - 1));
    groups.forEach(function (g) { g.items.forEach(function (it) { if (it.idx === hi) { it.cls = 'on'; it.sel = 'true'; } }); });
    this.flat = flat; this.hiNow = hi;

    /* tour */
    var steps = this.allSteps(s.tourKind), t = s.tour;
    var tour = t >= 0 && steps[t] ? { n: t + 1, of: steps.length, title: steps[t].title, body: steps[t].body, icon: steps[t].icon || I.compass, hint: steps[t].hint || '', hasHint: !!steps[t].hint, hasBack: t > 0, next: t === steps.length - 1 ? 'Finish' : 'Next', pct: Math.round((t + 1) / steps.length * 100), kind: s.tourKind === 'full' ? 'Full walkthrough' : 'Tour of ' + this.pageName(), anim: this.anim(t) } : { n: 0, of: 0 };
    var finishTour = function () { self.setState({ tour: -1 }); self.say('Tour finished. Replay it any time from Tour this page.'); };
    var tourOpts = [['page', 'Tour this page', 'The ' + this.pageName() + ' page, stop by stop. The parts you use most.', '1 min', I.target, 'var(--ad-tone-live)'], ['full', 'Full walkthrough', 'Your menu, search, alerts and this page, then where your settings live.', '3 min', I.map, 'var(--ad-tone-brand)']].map(function (o) {
      var on = s.tourKind === o[0], n = self.allSteps(o[0]).length, dots = []; for (var k = 0; k < n; k++) dots.push(on ? 'var(--ad-dot)' : 'var(--ad-line-2)');
      return { t: o[1], s: o[2] + ' ' + n + ' stops.', time: o[3], d: o[4], tone: o[5], dots: dots, cls: on ? 'on' : '', checked: on ? 'true' : 'false', pick: function () { var sh = Object.assign({}, self.state.sheet, { primary: o[0] === 'full' ? 'Start the walkthrough' : 'Start the page tour' }); self.setState({ tourKind: o[0], sheet: sh }); } };
    });

    /* sheet */
    var raw = s.sheet || this.sh({}), ctx = this.sheetCtx();
    var LV = this.listView(raw, s), list = LV.list, ss = LV.ss;
    var ckDone = 0, checks = (typeof raw.checks === 'function' ? raw.checks(s) : (raw.checks || [])).map(function (c, i) {
      var on = s.ck[i] != null ? s.ck[i] : !!c.on; if (on) ckDone++;
      return { t: c.t, s: c.s || '', on: on, cls: on ? 'on' : '', checked: on ? 'true' : 'false', aria: c.t, hasAct: !!c.act && !on, actLabel: c.act ? c.act.label : '', act: function () { if (c.act) c.act.fn(); },
        toggle: function () { var ck = Object.assign({}, self.state.ck); ck[i] = !on; if (!on && c.confirm) { self.ask(Object.assign({}, c.confirm, { onOk: function () { var c2 = Object.assign({}, self.state.ck); c2[i] = true; self.setState({ ck: c2 }); if (c.onDone) c.onDone(); } })); return; } self.setState({ ck: ck }); if (!on && c.onDone) c.onDone(); } };
    });
    /* Forms inside a sheet: text fields, chip sets (single or multi) and a notice. Values live in state.form by field key. */
    var F = s.form || {}, setF = function (key, v) { var f = Object.assign({}, self.state.form); f[key] = v; self.setState({ form: f }); };
    var fields = this.fieldViews(raw, s);
    var chipSets = (typeof raw.chipSets === 'function' ? raw.chipSets(s) : (raw.chipSets || [])).map(function (cs) {
      var cur = F[cs.key] != null ? F[cs.key] : (cs.multi ? [] : '');
      var cq = (F['~q' + cs.key] || '').toLowerCase(), srch = cs.search !== false && cs.opts.length >= 5;
      var shownOpts = cs.opts.filter(function (o) { return !srch || !cq || o.toLowerCase().indexOf(cq) >= 0 || (cs.multi ? cur.indexOf(o) >= 0 : cur === o); });
      return { label: cs.label, hint: cs.hint || '', hasHint: !!cs.hint, role: cs.multi ? 'group' : 'radiogroup', searchable: srch, q: F['~q' + cs.key] || '', hasQ: !!F['~q' + cs.key], noMatch: srch && !!cq && shownOpts.every(function (o) { return o.toLowerCase().indexOf(cq) < 0; }), onQ: function (e) { setF('~q' + cs.key, e.target.value); }, clearQ: function () { setF('~q' + cs.key, ''); }, opts: shownOpts.map(function (o) {
        var on = cs.multi ? cur.indexOf(o) >= 0 : cur === o;
        return { t: o, cls: on ? 'on' : '', checked: on ? 'true' : 'false', role: cs.multi ? 'checkbox' : 'radio', pick: function () { var c = self.state.form[cs.key] != null ? self.state.form[cs.key] : (cs.multi ? [] : ''); if (cs.multi) { c = c.indexOf(o) >= 0 ? c.filter(function (x) { return x !== o; }) : c.concat([o]); } else c = o; setF(cs.key, c); } };
      }) };
    });
    var notice = typeof raw.notice === 'function' ? raw.notice(ctx, s) : raw.notice;
    var plabel = typeof raw.primary === 'function' ? raw.primary(ctx, s) : raw.primary;
    var dis = '', reqText = '';
    if (raw.required && !ctx.draft) { dis = 'y'; reqText = raw.requiredWhy || 'Write a message to send it.'; }
    if (raw.reason && raw.reason.required && !ctx.reason) { dis = 'y'; reqText = 'Write a reason to continue.'; }
    if (raw.ack && !ctx.ack) { dis = 'y'; reqText = 'Tick "I understand" to continue.'; }
    if (raw.select && raw.selectRequired !== false && (raw.multi ? ctx.picks.length === 0 : ctx.pick < 0)) { dis = 'y'; reqText = raw.selectWhy || 'Choose one to continue.'; }
    if (raw.primaryDis) { var pd = raw.primaryDis(ctx, s); if (pd) { dis = 'y'; reqText = pd; } }
    var galRaw = typeof raw.gallery === 'function' ? raw.gallery(s) : (raw.gallery || []), galEmpty = typeof raw.galleryEmpty === 'function' ? raw.galleryEmpty(s) : false;
    var TB = raw.tabs || [], tbi = Math.min(s.shTab || 0, Math.max(0, TB.length - 1)), tbOn = TB[tbi] || {};
    var sheet = Object.assign({}, raw, {
      hasAttrs: !!(raw.attrs && raw.attrs.length), attrs: (raw.attrs || []).map(function (a) { var ch = a.chips || [], pe = a.people || []; return { ic: a.ic || '', k: a.k, v: a.v || '', hasText: !!a.v && !ch.length && !pe.length, chips: ch, people: pe }; }),
      hasTabs: TB.length > 0, tabs: TB.map(function (t, i) { var on = i === tbi; return { t: t.t, n: t.items ? t.items.length : (t.n != null ? t.n : ''), hasN: !!(t.items ? t.items.length : t.n), cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ shTab: i }); } }; }), hasTabText: !!tbOn.text, tabText: tbOn.text || '', hasTabItems: !!(tbOn.items && tbOn.items.length), tabItems: tbOn.items || [], tabEmpty: tbOn.items && !tbOn.items.length ? (tbOn.empty || 'Nothing here yet.') : '', hasTabEmpty: !!(tbOn.items && !tbOn.items.length),
      feedTitle: raw.feedTitle || 'History', hasQuick: !!(raw.quick && raw.quick.length), quick: (raw.quick || []).map(function (q) { return { t: q.t, d: q.d || '', fn: function () { if (q.fn) q.fn(); } }; }), hasGallery: galRaw.length > 0, gallery: galRaw, galleryEmpty: galEmpty, back: s.stack.length > 0, hasChip: !!raw.chip, hasIcon: !!raw.icon, icon: raw.icon || '', iconTone: raw.iconTone || 'var(--ad-tone-brand)', hasRows: raw.rows.length > 0, hasBody: !!raw.body, hasPreview: !!raw.preview, preview: raw.preview || {},
      hasList: list.length > 0 || ss.has, list: list, ss: ss, listRole: raw.select ? (raw.multi ? 'group' : 'radiogroup') : 'list', hasChecks: checks.length > 0, checks: checks, checksTitle: raw.checksTitle || 'Checklist', checksDone: ckDone + ' of ' + checks.length, checksPct: checks.length ? Math.round(ckDone / checks.length * 100) : 0,
      hasFeed: raw.feed.length > 0, hasNote: !!raw.note, reason: !!raw.reason, reasonLabel: raw.reason ? raw.reason.label : '', reasonPh: raw.reason ? raw.reason.ph : '', ack: !!raw.ack, ackText: raw.ack || '',
      hasFields: fields.length > 0, fields: fields, fieldsCls: raw.chipsFirst ? 'fieldsLate' : '', listCls: raw.chipsFirst ? 'listLate' : '', chipsCls: raw.chipsFirst ? 'chipsMid' : '', hasChipSets: chipSets.length > 0, chipSets: chipSets, hasNotice: !!notice, notice: notice || {}, primaryLabel: plabel, primaryCls: raw.danger ? 'btnD' : (raw.green ? 'btnG' : 'btn'), primaryDis: !!dis, why: reqText, hasSecondary: !!raw.secondary, secondaryLabel: typeof raw.secondary === 'function' ? raw.secondary(ctx, s) : raw.secondary, chip: typeof raw.chip === 'function' ? raw.chip(ctx, s) : raw.chip, tone: typeof raw.tone === 'function' ? raw.tone(ctx, s) : raw.tone, hasFoot: !raw.noFoot, busy: !!raw.busy
    });
    var popItems = [];
    if (s.pop) {
      if (s.pop.kind === 'per') popItems = this.perItems(s.pop.id);
      else if (s.pop.kind === 'snooze') popItems = this.snoozeItems();
      else if (s.pop.kind === 'delegate') popItems = this.delegateItems();
      else if (this.popItems) popItems = this.popItems(s.pop) || [];
      popItems = popItems.map(function (m, i) { return Object.assign({ anim: self.anim(s.dq.length), delay: Math.min(i, 8) * 0.025 + 's' }, m); });
    }
    var client = s.vis === 'client';
    var anyOverlay = !!(s.sheet || s.drawer || s.pal || (s.pop && s.pop.asSheet) || s.tour >= 0);
    return { svOn: !!svq.get('sv'), svName: svq.get('who') ? svq.get('who') + ' as ' + svq.get('sv') : 'read only', svEnds: '09:00',
      rootCls: 'wdc' + (s.dark ? ' dark' : '') + (s.dev === 'phone' ? ' isPhone' : '') + (anyOverlay ? ' locked' : ''),
      themeLabel: s.dark ? 'Switch to light mode' : 'Switch to dark mode', themeIcon: s.dark ? I.sun : I.moon, themeShort: s.dark ? 'Light' : 'Dark', themeLong: s.dark ? 'Light mode' : 'Dark mode',
      toggleTheme: function () { self.setState({ dark: !self.state.dark }); },
      devs: DEV.map(function (d) { return { label: d[1], d: d[2], cls: s.dev === d[0] ? 'on' : '', pressed: s.dev === d[0] ? 'true' : 'false', pick: function () { self.setState({ dev: d[0], drawer: false, menu: null, sheet: null, stack: [], bell: false, pop: null, tour: -1 }); } }; }),
      devI: devI, devW: cur[3], devH: cur[4], devNote: cur[5], deviceCls: s.dev === 'desktop' ? '' : 'framed',
      replaySkeleton: function () { self.boot(1600); },
      rootClick: function (e) { var st = self.state; if (!st.menu && !(st.pop && !st.pop.asSheet)) return; var el = e.target; if (el && el.closest && el.closest('[data-menu]')) return; self.setState({ menu: null, pop: null }); },
      brand: this.brand(), me: this.me(), pageTitle: this.pageName(), searchHint: this.searchHint(), palHint: this.palHint(), palEmptyHint: this.palEmptyHint ? this.palEmptyHint() : '',
      nav: nav, nav2: nav2, miniCls: s.mini ? 'mini' : '', toggleMini: function () { self.setState({ mini: true }); }, expandSide: function () { if (self.state.mini) self.setState({ mini: false }); else self.setState({ drawer: true }); },
      signOut: function () { self.ask({ eyebrow: 'Sign out', title: 'Sign out of WDC on this device?', body: 'You will need your email and password to come back in. Drafts you have open are kept.', ok: 'Sign out', icon: I.out, tone: 'var(--ad-tone-neutral)', okToast: 'Signed out. In the real portal you land on the sign-in page.' }, false); },
      showInstall: !s.push && !s.installHidden, installing: s.installing, installIdle: !s.installing, installTitle: this.installCopy()[0], installBody: this.installCopy()[1],
      installApp: function () { if (self.state.installing) return; self.setState({ installing: true, drawer: false }); setTimeout(function () { self.setState({ installing: false, push: true }); self.say('WDC is on this device. Notifications are on.'); }, self.reduce ? 200 : 1900); },
      hideInstall: function () { self.setState({ installHidden: true, drawer: false }); self.say('Hidden. We will offer it again in 30 days. Install any time from Settings.', { undo: function () { self.setState({ installHidden: false }); } }); },
      drawer: s.drawer, openDrawer: function () { self.setState({ drawer: true }); }, closeDrawer: function () { self.exitThen('.drawerP, .scrim', function () { self.setState({ drawer: false }); }); },
      sheetOpen: !!s.sheet, sheet: sheet, sheetCls: (raw.xl ? 'xl ' : '') + (raw.wide ? 'wide ' : '') + (s.sheetFull ? 'full' : ''),
      closeSheet: function () { self.closeSheet(); }, sheetBack: function () { self.sheetBack(); },
      sheetKey: function () {}, edgeGrab: function (e) { self.edgeStart(e); }, edgeReset: function () { var el = document.getElementById('sheetEl'); if (el) el.style.removeProperty('--shW'); }, grabSheet: function (e) { self.grabStart(e, '#sheetEl', function () { self.setState({ sheet: null, stack: [], sheetFull: false }); }); },
      sheetPrimary: function () { self.runSheet('p'); }, sheetSecondary: function () { if (!self.state.sheet || !self.state.sheet.secondary) return; self.runSheet('s'); },
      draft: s.draft || '', onDraft: function (e) { self.setState({ draft: e.target.value }); }, reason: s.reason || '', onReason: function (e) { self.setState({ reason: e.target.value }); },
      ackOn: s.ack, ackCls: s.ack ? 'on' : '', ackChecked: s.ack ? 'true' : 'false', toggleAck: function () { self.setState({ ack: !self.state.ack }); },
      visI: client ? 1 : 0, visTeam: client ? '' : 'on', visClient: client ? 'on' : '', visTeamP: client ? 'false' : 'true', visClientP: client ? 'true' : 'false',
      setTeam: function () { self.setState({ vis: 'team' }); }, setClient: function () { self.setState({ vis: 'client' }); },
      visNote: client ? 'The client sees this in their portal and gets an email.' : 'Only the studio team sees this.', visCol: client ? 'var(--ad-accent-ink)' : 'var(--ad-dim)',
      attach: function () { self.say('The file picker opens here. Up to 50 MB a file.'); },
      isTourPick: raw.kind === 'tour', tourOpts: tourOpts, isFile: raw.kind === 'file', isPost: raw.kind === 'post', isPay: raw.kind === 'pay', isFollow: raw.kind === 'follow', isQuote: raw.kind === 'quote',
      popOpen: !!s.pop && (popItems.length > 0 || s.pop.search), popAsMenu: !!s.pop && !s.pop.asSheet, popAsSheet: !!s.pop && s.pop.asSheet, pop: Object.assign({ hasNote: !!(s.pop && s.pop.note) }, s.pop || {}), popItems: popItems, popEmpty: !!s.pop && s.pop.search && !popItems.length, popEmptyText: 'Nobody matches "' + s.dq + '".',
      closePop: function () { self.closePop(); }, grabPop: function (e) { self.grabStart(e, '.mSheet', function () { self.setState({ pop: null }); }); },
      dq: s.dq, onDq: function (e) { self.setState({ dq: e.target.value }); },
      bellOpen: s.bell, bellExp: s.bell ? 'true' : 'false', toggleBell: function () { if (self.state.bell) { self.exitThen('.popP, .scrim', function () { self.setState({ bell: false }); }); return; } self.setState({ bell: true, menu: null, pop: null }); },
      notes: shown, notesEmpty: !shown.length, unread: unread, hasUnread: unread > 0, bellLabel: 'Notifications, ' + unread + ' unread', bellI: s.bellTab === 'unread' ? 1 : 0,
      bAll: s.bellTab === 'all' ? 'on' : '', bUn: s.bellTab === 'unread' ? 'on' : '', bAllP: s.bellTab === 'all' ? 'true' : 'false', bUnP: s.bellTab === 'unread' ? 'true' : 'false',
      tabAll: function () { self.setState({ bellTab: 'all' }); }, tabUnread: function () { self.setState({ bellTab: 'unread' }); },
      allNotesHref: { admin: 'A-Notifications.dc.html', staff: 'S-Notifications.dc.html', client: 'C-Notifications.dc.html' }[this.role()] || '#', hasAllNotes: true,
      markAll: function () { var r = {}; notesRaw.forEach(function (n) { r[n.id] = true; }); var prev = self.state.read; self.setState({ read: r }); self.say('All marked as read', { undo: function () { self.setState({ read: prev }); } }); },
      pushText: s.push ? 'Push notifications are on for this device.' : this.installCopy()[0] + '.', pushBtn: s.push ? 'Turn off' : 'Install app',
      togglePush: function () { var on = !self.state.push; self.setState({ push: on }); self.say(on ? 'WDC installed. Push notifications are on.' : 'Push notifications are off. Email still reaches you.'); },
      palOpen: s.pal, openPal: function () { self.openPalette(); }, closePal: function () { self.exitThen('.palP, .scrim', function () { self.setState({ pal: false }); }); },
      q: s.q, onQ: function (e) { self.setState({ q: e.target.value, hi: 0, pa: self.state.pa + 1 }); },
      onPalKey: function (e) { var n = self.flat.length; if (e.key === 'ArrowDown') { e.preventDefault(); self.setState({ hi: Math.min(self.hiNow + 1, n - 1) }); } else if (e.key === 'ArrowUp') { e.preventDefault(); self.setState({ hi: Math.max(self.hiNow - 1, 0) }); } else if (e.key === 'Enter') { e.preventDefault(); if (self.flat[self.hiNow]) self.palPick(self.flat[self.hiNow]); } },
      palGroups: groups, palEmpty: !flat.length, palActive: flat.length ? 'pal-' + hi : '',
      tourOn: t >= 0, tour: tour, startTour: function () { self.setState({ drawer: false }); self.startTour(); },
      tourNext: function () { if (self.state.tour + 1 >= steps.length) finishTour(); else self.setState({ tour: self.state.tour + 1 }); },
      tourBack: function () { self.setState({ tour: Math.max(0, self.state.tour - 1) }); },
      tourSkip: function () { self.setState({ tour: -1 }); }, tourBlock: function (e) { if (e && e.stopPropagation) e.stopPropagation(); },
      tourKey: function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); if (self.state.tour + 1 >= steps.length) finishTour(); else self.setState({ tour: self.state.tour + 1 }); } else if (e.key === 'ArrowLeft') { e.preventDefault(); self.setState({ tour: Math.max(0, self.state.tour - 1) }); } },
      hasToast: !!s.toast, toastMsg: s.toast ? s.toast.msg : '', hasUndo: !!(s.toast && s.toast.undo), toastAuto: !!(s.toast && s.toast.auto), toastDur: (s.toast && s.toast.dur ? s.toast.dur / 1000 : 5) + 's', tbarAnim: s.ta % 2 ? 'tbar' : 'tbar2',
      undo: function () { var u = self.state.toast && self.state.toast.undo; self.setState({ toast: null }); if (u) u(); },
      closeToast: function () { clearInterval(self.ti); var tid = self.state.ta; self.exitThen('.toastP', function () { if (self.state.ta === tid) self.setState({ toast: null }); }); },
      loading: !s.ready, ready: s.ready
    };
  }
  /* One map of every role's pages, so every board links to every other. Counts come from the page. */
  roleNav() {
    var I = this.icons(), c = this.navCounts ? this.navCounts() : {};
    var R = {
      admin: [['Today', I.home, 'D-Admin.dc.html'], ['Clients', I.users, 'A-Clients.dc.html'], ['Projects', I.folder, 'A-Projects.dc.html'], ['Money', I.wallet, 'A-Money.dc.html'], ['Reports', I.chart, 'A-Reports.dc.html'], ['Messages', I.msg, 'A-Messages.dc.html'], ['Marketing', I.mail, 'A-Email.dc.html'], ['Forms', I.inbox, 'A-Forms.dc.html'], ['Blog', I.pen, 'A-Blog.dc.html'], ['Settings', I.gear, 'A-Settings.dc.html'], ['Support', I.life, 'A-Support.dc.html', 1]],
      staff: [['My Day', I.home, 'D-Staff.dc.html'], ['Projects', I.folder, 'S-Projects.dc.html'], ['Clients', I.users, 'S-Clients.dc.html'], ['Messages', I.msg, 'S-Messages.dc.html'], ['Settings', I.gear, 'S-Settings.dc.html'], ['Support', I.life, 'S-Support.dc.html', 1]],
      client: [['Home', I.home, 'D-Client.dc.html'], ['Projects', I.folder, 'C-Projects.dc.html'], ['Billing', I.card, 'C-Billing.dc.html'], ['Messages', I.msg, 'C-Messages.dc.html'], ['Settings', I.gear, 'C-Settings.dc.html'], ['Support', I.life, 'C-Support.dc.html', 1]]
    }[this.role()];
    return R.map(function (r) { var x = c[r[0]] || {}; return { label: r[0], d: r[1], href: r[2], second: !!r[3], count: x.n || 0, tone: x.tone || 'var(--ad-tone-brand)' }; });
  }
  navData() { return this.roleNav().filter(function (n) { return !n.second; }); }
  baseIcons() {
    return {
      home: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
      users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
      folder: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
      wallet: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
      inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
      msg: 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
      life: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24',
      mega: 'm3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6',
      gear: 'M20 7h-9M14 17H5M17 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      card: 'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20',
      mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
      cash: 'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
      down: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
      ban: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM4.93 4.93l14.14 14.14',
      undo: 'M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13',
      eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      check: 'M20 6 9 17l-5-5',
      alert: 'M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
      clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
      bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
      compass: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z',
      target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
      map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
      search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
      layers: 'm12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5',
      chart: 'M3 3v18h18M7 16V9M12 16V5M17 16v-6',
      phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
      out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
      send: 'm22 2-7 20-4-9-9-4zM22 2 11 13',
      file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4',
      quote: 'M9 12h6M9 16h6M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
      task: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
      hand: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6',
      open: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
      play: 'M5 3l14 9-14 9V3z',
      cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
      upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
      sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
      moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
      pen: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'
    };
  }
