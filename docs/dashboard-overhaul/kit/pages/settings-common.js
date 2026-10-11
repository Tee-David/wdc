  /* ======================= Settings (shared by all roles, driven by this.setModel()) ======================= */
  pageState() { return { sec: 0, sv: {}, saved: {}, ra: 0, lists: {} }; }
  pageName() { return 'Settings'; }
  tourSteps() {
    var I = this.icons(), M = this.setModel();
    return [
      { target: 'nav', title: 'Sections', icon: I.gear, body: M.tourNav, hint: 'On a phone this is a strip you swipe sideways.' },
      { target: 'cards', title: 'Each row says what it does', icon: I.check, body: 'The label and one line of explanation sit on the left, the control on the right. A control you cannot use says why, and who can change it.' },
      { target: 'search|searchS', title: 'Changes wait for Save', icon: I.search, body: 'Nothing changes until you press Save changes. Discard puts everything back.' }
    ];
  }
  navCounts() { return this.setModel().navBase || {}; }
  sval(key, def) { var s = this.state; return key in s.sv ? s.sv[key] : (key in s.saved ? s.saved[key] : def); }
  setv(key, v, def) { var s = this.state, sv = Object.assign({}, s.sv), base = key in s.saved ? s.saved[key] : def; if (JSON.stringify(v) === JSON.stringify(base)) delete sv[key]; else sv[key] = v; this.setState({ sv: sv }); }
  allRows() { var out = []; this.setModel().sections.forEach(function (sec) { sec.cards.forEach(function (c) { (c.rows || []).forEach(function (r) { out.push(r); }); }); }); return out; }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), M = this.setModel();
    if (pop.kind === 'sel') {
      var r = this.allRows().filter(function (x) { return x.key === pop.id; })[0]; if (!r) return [];
      var cur = this.sval(r.key, r.def);
      return r.opts.map(function (o) { return it(o, '', function () { self.setv(r.key, o, r.def); }, o === cur ? { hint: 'Current' } : undefined); });
    }
    if (pop.kind === 'item') {
      var p = pop.id.split(':'), sec = M.sections[+p[0]], card = sec && sec.cards[+p[1]], items = card && card.list ? card.list(this) : [], row = items[+p[2]];
      return row && row.menu ? row.menu.map(function (m) { return m.sep ? self.menuSep() : it(m.t, I[m.icon] || I.open, m.fn, m.danger ? { danger: true } : (m.hint ? { hint: m.hint } : undefined)); }) : [];
    }
    if (pop.kind === 'chores') return M.chores(this, it, I);
    return [];
  }
  renderVals() {
    var s = this.state, self = this, I = this.icons(), M = this.setModel(), S = this.sh.bind(this);
    var si = Math.min(s.sec, M.sections.length - 1), sec = M.sections[si], F = 'var(--ad-tone-flat)';
    var tone = function (t) { return t || F; }, ink = function (t) { return tone(t) === F ? 'var(--ad-on-flat)' : '#fff'; };
    var sections = M.sections.map(function (x, i) { var on = i === si, n = x.n && x.n(self); return { label: x.label, d: I[x.icon] || x.icon, cls: on ? 'on' : '', current: on ? 'page' : 'false', hasN: !!n, n: n, nTone: x.nTone || 'var(--ad-tone-live)', pick: function (e) { if (e && e.preventDefault) e.preventDefault(); if (!on) self.setState({ sec: i, ra: self.state.ra + 1 }); } }; });
    var errs = 0;
    var cards = sec.cards.map(function (c, ci) {
      var out = { title: c.title, hasSub: !!c.sub, sub: c.sub || '', delay: (ci * 0.06) + 's', hasAct: !!c.act, actLabel: c.act ? c.act.label : '', act: c.act ? c.act.fn : null, rows: [], isList: false, isGrid: false };
      out.rows = (c.rows || []).map(function (r) {
        var v = self.sval(r.key, r.def), dirty = r.key in s.sv, locked = !!r.lock, err = (!locked && r.check && dirty) ? r.check(v) : '';
        if (err) errs++;
        var row = { label: r.label, hint: r.hint || '', cls: err ? 'err' : '', locked: locked, hasErr: !!err, err: err, hasLock: locked, lockWhy: locked ? r.lock.why + ' ' : '', lockFix: locked ? r.lock.fix : '', ph: r.ph || '',
          isText: r.type === 'text', isArea: r.type === 'area', isSwitch: r.type === 'switch', isSeg: r.type === 'seg', isSelect: r.type === 'select', isStatic: r.type === 'static', value: r.type === 'static' ? (typeof r.value === 'function' ? r.value(self) : r.value) : v };
        row.on = function (e) { self.setv(r.key, e.target.value, r.def); };
        row.checked = v ? 'true' : 'false'; row.state = r.type === 'switch' ? (v ? (r.onText || 'On') : (r.offText || 'Off')) : '';
        row.toggle = function () { self.setv(r.key, !self.sval(r.key, r.def), r.def); };
        if (r.type === 'seg') { row.segI = r.opts.indexOf(v) < 0 ? 0 : r.opts.indexOf(v); row.opts = r.opts.map(function (o) { var on = o === v; return { t: o, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setv(r.key, o, r.def); } }; }); }
        if (r.type === 'select') { row.menuX = self.popOn('sel', r.key); row.open = function (e) { self.openPop(e, 'sel', r.key, 300, Math.min(360, r.opts.length * 48 + 24), r.label); }; }
        if (r.type === 'static') { var tg = typeof r.tag === 'function' ? r.tag(self) : r.tag; row.hasTag = !!tg; row.tag = tg ? tg[0] : ''; row.tagTone = tg ? tone(tg[1]) : ''; row.tagInk = tg ? ink(tg[1]) : ''; row.hasAct = !!r.action; row.actLabel = r.action ? (typeof r.action.label === 'function' ? r.action.label(self) : r.action.label) : ''; row.act = r.action ? r.action.fn : null; }
        return row;
      });
      if (c.list) {
        out.isList = true; var items = c.list(self);
        out.items = items.map(function (x, ii) {
          var bt = x.btn;
          return { t: x.t, s: x.s, tone: x.tone || 'var(--ad-tone-brand)', tileCls: 'lrTile' + (x.ini ? ' round' : ''), hasIni: !!x.ini, ini: x.ini, hasIcon: !x.ini, d: I[x.icon] || x.icon || I.folder, hasTag: !!x.tag, tag: x.tag, tagTone: tone(x.tagTone), tagInk: ink(x.tagTone), anim: self.anim(s.ra), delay: (ii * 0.035) + 's',
            hasBtn: !!bt, btnLabel: bt ? bt.label : '', btnCls: bt && bt.kind === 'danger' ? 'btnD' : 'btn2', btnDis: !!(bt && bt.dis), btn: bt ? bt.fn : null,
            hasMenu: !!(x.menu && x.menu.length), menuAria: 'Actions for ' + x.t, menuX: self.popOn('item', si + ':' + ci + ':' + ii), menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'item', si + ':' + ci + ':' + ii, 260, 220, 'Actions for ' + x.t); } };
        });
        out.listEmpty = !items.length; out.emptyTitle = c.emptyTitle || 'Nothing here.'; out.emptyBody = c.emptyBody || '';
      }
      if (c.grid) {
        var g = c.grid; out.isGrid = true; out.gridHead = g.head; out.cols = g.cols; out.hasGridNote = !!g.note; out.gridNoteT = g.note ? g.note.t + ' ' : ''; out.gridNoteS = g.note ? g.note.s : '';
        out.grid = g.rows.map(function (r) { return { t: r.t, s: r.s || '', cells: r.cells.map(function (cl) { var cur = self.sval(cl.key, cl.def); return { checked: cur ? 'true' : 'false', aria: cl.aria, locked: !!cl.locked, toggle: function () { self.setv(cl.key, !self.sval(cl.key, cl.def), cl.def); } }; }) }; });
      }
      return out;
    });
    var n = Object.keys(s.sv).length;
    return Object.assign(this.kit(), this.extraVals(), {
      lede: M.lede, sections: sections, cards: cards, dirty: n > 0, dirtyText: n + (n === 1 ? ' change not saved' : ' changes not saved'), saveDis: errs > 0, saveWhy: 'Fix the highlighted fields to save.',
      discard: function () { self.setState({ sv: {} }); self.say('Changes discarded.'); },
      save: function () { var m = Object.assign({}, self.state.saved, self.state.sv), c = Object.keys(self.state.sv).length; self.setState(Object.assign({ saved: m, sv: {}, ra: self.state.ra + 1 }, 'theme' in self.state.sv ? { dark: self.state.sv.theme === 'Dark' } : {})); self.say('Updated. ' + c + (c === 1 ? ' setting is' : ' settings are') + ' live now.'); },
      openChores: function (e) { self.openPop(e, 'chores', 'chores', 260, 200, 'More for settings'); }, choresX: this.popOn('chores', 'chores')
    });
  }
  /* shared building blocks for the role models */
  notifGrid(kinds, locked) {
    var cols = ['Email', 'Push', 'In app'], self = this;
    return { head: 'Tell me about', cols: cols, rows: kinds.map(function (k) { return { t: k[1], s: k[2], cells: cols.map(function (c, i) { var lk = !!(k[4] && k[4][i]); return { key: 'n.' + k[0] + '.' + i, def: k[3][i], locked: lk, aria: k[1] + ' by ' + c.toLowerCase() + (lk ? ', required' : '') }; }) }; }), note: locked || null };
  }
  themeRow() { return { key: 'theme', type: 'seg', label: 'Theme', hint: 'Light or dark. The sidebar footer switch does the same thing.', def: 'Light', opts: ['Light', 'Dark'] }; }
