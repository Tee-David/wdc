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
  /* the keys that belong to one tab, so each tab has its own Save */
  secKeys(sec) {
    var out = [];
    sec.cards.forEach(function (c) { (c.rows || []).forEach(function (r) { out.push(r.key); }); if (c.grid) c.grid.rows.forEach(function (r) { r.cells.forEach(function (cl) { out.push(cl.key); }); }); });
    return out;
  }
  saveSection(si) {
    var self = this, M = this.setModel(), sec = M.sections[si], keys = this.secKeys(sec), s = this.state, I = this.icons();
    var dirty = Object.keys(s.sv).filter(function (k) { return keys.indexOf(k) >= 0; });
    if (!dirty.length) return;
    var rows = this.allRows(), byKey = {}; rows.forEach(function (r) { byKey[r.key] = r; });
    var commit = function () {
      var m = Object.assign({}, self.state.saved), sv = Object.assign({}, self.state.sv), th = null;
      dirty.forEach(function (k) { m[k] = sv[k]; if (k === 'theme') th = sv[k]; delete sv[k]; });
      self.setState(Object.assign({ saved: m, sv: sv, ra: self.state.ra + 1 }, th ? { dark: th === 'Dark' } : {}));
      self.say('Updated. ' + dirty.length + (dirty.length === 1 ? ' setting is' : ' settings are') + ' live on ' + sec.label + '.');
    };
    var confirmRows = dirty.map(function (k) { return byKey[k]; }).filter(function (r) { return r && r.confirm; });
    var verifyRow = dirty.map(function (k) { return byKey[k]; }).filter(function (r) { return r && r.verify; })[0];
    var afterVerify = function () {
      if (!confirmRows.length) { commit(); return; }
      self.ask({ eyebrow: sec.label, title: 'Confirm ' + confirmRows.length + (confirmRows.length === 1 ? ' change' : ' changes'), body: confirmRows.map(function (r) { return r.confirm(self.sval(r.key, r.def)); }).join(' '), ok: 'Confirm and save', icon: I.check, tone: 'var(--ad-tone-brand)', back: false, onOk: function () { commit(); } });
    };
    if (verifyRow) {
      var val = s.sv[verifyRow.key];
      this.open(this.sh({ eyebrow: 'Verify', title: 'Verify the new ' + verifyRow.label.toLowerCase(), icon: I.mail, body: verifyRow.verify.body(val), focus: 'f-code',
        fields: [{ key: 'code', label: '6 digit code', ph: '000000', mode: 'numeric', hint: verifyRow.verify.hint, check: function (v) { return v.trim() && !/^\d{0,6}$/.test(v.trim()) ? 'Numbers only.' : ''; } }],
        primary: 'Verify and save', secondary: 'Cancel', primaryDis: function (ctx) { return /^\d{6}$/.test((ctx.form.code || '').trim()) ? '' : 'Enter the 6 digit code we sent.'; },
        onPrimary: function () { afterVerify(); } }));
      return;
    }
    afterVerify();
  }
  discardSection(si) { var keys = this.secKeys(this.setModel().sections[si]), sv = Object.assign({}, this.state.sv); Object.keys(sv).forEach(function (k) { if (keys.indexOf(k) >= 0) delete sv[k]; }); this.setState({ sv: sv, ra: this.state.ra + 1 }); this.say('Changes discarded.'); }
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
    var sections = M.sections.map(function (x, i) { var on = i === si, n = x.n && x.n(self), keysI = self.secKeys(x), dirtyI = Object.keys(s.sv).filter(function (k) { return keysI.indexOf(k) >= 0; }).length; return { label: x.label, d: I[x.icon] || x.icon, cls: on ? 'on' : '', current: on ? 'page' : 'false', hasN: !!n, n: n, hasDot: dirtyI > 0, dotAria: dirtyI + ' unsaved', nTone: x.nTone || 'var(--ad-tone-live)', pick: function (e) { if (e && e.preventDefault) e.preventDefault(); if (!on) self.setState({ sec: i, ra: self.state.ra + 1 }); } }; });
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
        out.isList = true; var items = c.list(self), tkey = 'set-' + si + '-' + ci, LQ = (s.lists['q:' + tkey] || ''), LP = s.lists['p:' + tkey] || 0, LN = s.lists['n:' + tkey] || 5;
        var find = c.find || null, facets = (find && find.facets) || [], searchable = !!find;
        var all0 = items, qq = LQ.trim().toLowerCase();
        if (qq) items = items.filter(function (x) { return (x.t + ' ' + x.s + ' ' + (x.tag || '')).toLowerCase().indexOf(qq) >= 0; });
        items = self.applyFlt(tkey, items, facets);
        var paged = !!find || items.length > 5, pgN = Math.min(LP, Math.max(0, Math.ceil(items.length / LN) - 1)), pageItems = paged ? items.slice(pgN * LN, pgN * LN + LN) : items;
        out.hasFind = searchable; out.findPh = find ? find.ph : ''; out.findQ = LQ; out.hasFindQ = !!LQ; out.findId = 'fq-' + tkey;
        out.onFind = function (e) { var l = Object.assign({}, self.state.lists); l['q:' + tkey] = e.target.value; l['p:' + tkey] = 0; self.setState({ lists: l }); };
        out.clearFind = function () { var l = Object.assign({}, self.state.lists); l['q:' + tkey] = ''; l['p:' + tkey] = 0; self.setState({ lists: l }); };
        out.hasSel = !!c.bulk; out.hasTools = !!(c.bulk || facets.length);
        var bk = c.bulk || {};
        out.TL = out.hasTools ? self.toolsView(tkey, { noun: bk.noun || (c.title || 'items').toLowerCase(), one: bk.one || 'item', pageIds: pageItems.map(function (x) { return x.id; }), allIds: items.map(function (x) { return x.id; }), rowsById: function (ids) { return items.filter(function (x) { return ids.indexOf(x.id) >= 0; }); }, rows: all0, unfiltered: all0, facets: facets, acts: bk.acts || [], exportFn: bk.cols ? function (sel) { self.exportSheet({ noun: bk.noun, file: bk.file || 'wdc-' + bk.noun, cols: bk.cols, all: all0, filtered: items, selected: sel }); } : null }) : {};
        out.pg = paged ? Object.assign(self.pager(tkey, items.length, LN, pgN, function (k) { var l = Object.assign({}, self.state.lists); l['p:' + tkey] = k; self.setState({ lists: l, ra: self.state.ra + 1 }); }, function (n) { var l = Object.assign({}, self.state.lists); l['n:' + tkey] = n; l['p:' + tkey] = 0; self.setState({ lists: l, ra: self.state.ra + 1 }); }), { all: function () { var l = Object.assign({}, self.state.lists); l['n:' + tkey] = 20; l['p:' + tkey] = 0; self.setState({ lists: l, ra: self.state.ra + 1 }); } }) : {};
        out.hasPg = paged && items.length > 5;
        var filtered = !!(qq || (out.TL && out.TL.hasFn));
        out.items = pageItems.map(function (x, ii) {
          var bt = x.btn, rs = out.hasSel ? self.rowSel(tkey, x.id, x.t) : { sel: 'false', selCls: '', selAria: '', togSel: null, selRow: '' };
          return Object.assign({ t: x.t, s: x.s, tone: x.tone || 'var(--ad-tone-brand)', tileCls: 'lrTile' + (x.ini ? ' round' : ''), hasIni: !!x.ini, ini: x.ini, hasIcon: !x.ini, d: I[x.icon] || x.icon || I.folder, hasTag: !!x.tag, tag: x.tag, tagTone: tone(x.tagTone), tagInk: ink(x.tagTone), anim: self.anim(s.ra), delay: (ii * 0.035) + 's',
            hasBtn: !!bt, btnLabel: bt ? bt.label : '', btnCls: bt && bt.kind === 'danger' ? 'btnD' : 'btn2', btnDis: !!(bt && bt.dis), btn: bt ? bt.fn : null,
            hasMenu: !!(x.menu && x.menu.length), menuAria: 'Actions for ' + x.t, menuX: self.popOn('item', si + ':' + ci + ':' + all0.indexOf(x)), menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'item', si + ':' + ci + ':' + all0.indexOf(x), 260, 220, 'Actions for ' + x.t); } }, rs);
        });
        out.listEmpty = !items.length; out.emptyTitle = filtered ? 'Nothing matches.' : (c.emptyTitle || 'Nothing here.'); out.emptyBody = filtered ? 'Change the search or the filters, or clear them.' : (c.emptyBody || '');
        out.hasClearList = filtered; out.clearList = function () { var l = Object.assign({}, self.state.lists); l['q:' + tkey] = ''; l['p:' + tkey] = 0; var f = Object.assign({}, self.state.flt); delete f[tkey]; self.setState({ lists: l, flt: f, ra: self.state.ra + 1 }); };
      }
      if (c.grid) {
        var g = c.grid; out.isGrid = true; out.gridHead = g.head; out.cols = g.cols; out.hasGridNote = !!g.note; out.gridNoteT = g.note ? g.note.t + ' ' : ''; out.gridNoteS = g.note ? g.note.s : '';
        out.grid = g.rows.map(function (r) { return { t: r.t, s: r.s || '', cells: r.cells.map(function (cl) { var cur = self.sval(cl.key, cl.def); return { checked: cur ? 'true' : 'false', aria: cl.aria, locked: !!cl.locked, toggle: function () { self.setv(cl.key, !self.sval(cl.key, cl.def), cl.def); } }; }) }; });
      }
      return out;
    });
    var keysS = this.secKeys(sec), n = Object.keys(s.sv).filter(function (k) { return keysS.indexOf(k) >= 0; }).length, others = Object.keys(s.sv).length - n;
    return Object.assign(this.kit(), this.extraVals(), {
      pageTitle: M.title || 'Settings', hasHeadAct: !!M.headAct, headActLabel: M.headAct ? M.headAct.label : '', headAct: M.headAct ? function () { M.headAct.fn(self); } : null, lede: M.lede, sections: sections, cards: cards, dirty: n > 0, secName: sec.label, dirtyText: n ? n + (n === 1 ? ' change not saved' : ' changes not saved') : 'Nothing to save on ' + sec.label, otherNote: others ? others + (others === 1 ? ' change' : ' changes') + ' waiting on other tabs.' : '', hasOther: others > 0, saveDis: n === 0 || errs > 0, discardDis: n === 0, saveWhy: n === 0 ? 'Change a setting on this tab and Save lights up.' : 'Fix the highlighted fields to save.', showWhy: n === 0 || errs > 0,
      discard: function () { self.discardSection(si); },
      save: function () { self.saveSection(si); },
      openChores: function (e) { self.openPop(e, 'chores', 'chores', 260, 200, 'More for settings'); }, choresX: this.popOn('chores', 'chores')
    });
  }
  /* shared building blocks for the role models */
  notifGrid(kinds, locked) {
    var cols = ['Email', 'Push', 'In app'], self = this;
    return { head: 'Tell me about', cols: cols, rows: kinds.map(function (k) { return { t: k[1], s: k[2], cells: cols.map(function (c, i) { var lk = !!(k[4] && k[4][i]); return { key: 'n.' + k[0] + '.' + i, def: k[3][i], locked: lk, aria: k[1] + ' by ' + c.toLowerCase() + (lk ? ', required' : '') }; }) }; }), note: locked || null };
  }
  themeRow() { return { key: 'theme', type: 'seg', label: 'Theme', hint: 'Light or dark. The sidebar footer switch does the same thing.', def: 'Light', opts: ['Light', 'Dark'] }; }
