  /* ======================= Hub pages (Email, Forms, Meetings): tabs, one table, a rail ======================= */
  pageState() { return { hcm: 0, hsel: '', tab: 0, chip: 'all', hpg: 0, hper: 5, hq: '', ra: 0, pst: {}, added: {}, gone: {}, flt: {}, bsel: {} }; }
  hubApply(key, base) { var s = this.state; return (s.added[key] || []).concat(base).map(function (x) { return s.pst[x.id] ? Object.assign({}, x, s.pst[x.id]) : x; }).filter(function (x) { return !s.gone[x.id]; }); }
  hubPatch(id, patch) { var m = Object.assign({}, this.state.pst); m[id] = Object.assign({}, m[id] || {}, patch); this.setState({ pst: m, ra: this.state.ra + 1 }); }
  hubAdd(key, item) { var a = Object.assign({}, this.state.added); a[key] = [item].concat(a[key] || []); this.setState({ added: a, ra: this.state.ra + 1 }); }
  hubGone(ids, label) { var self = this, g = Object.assign({}, this.state.gone); ids.forEach(function (i) { g[i] = true; }); this.setState({ gone: g, ra: this.state.ra + 1 }); this.say(label, { undo: function () { var u = Object.assign({}, self.state.gone); ids.forEach(function (i) { delete u[i]; }); self.setState({ gone: u, ra: self.state.ra + 1 }); } }); }
  hubPick(k) { var T = this.hubCfg().tabs; return T[Math.min(this.state.tab, T.length - 1)]; }
  popItems(pop) {
    var I = this.icons(), it = this.menuItem.bind(this), self = this, C = this.hubCfg();
    if (pop.kind === 'row') { var T = this.hubPick(), x = T.items().filter(function (r) { return r.id === pop.id; })[0]; return x ? T.actions(x, it, I) : []; }
    if (pop.kind === 'chores') return C.chores(it, I);
    return [];
  }
  deck() { return this.hubCfg().deck(); }
  renderVals() {
    var s = this.state, self = this, I = this.icons(), C = this.hubCfg(), q = s.hq.trim().toLowerCase();
    var T = this.hubPick(), all = T.items(), F = 'var(--ad-tone-flat)';
    var dk = this.deck(), dv = this.deckView(dk);
    var chips = T.chips || [['all', 'All', function () { return true; }]];
    var cur = chips.filter(function (c) { return c[0] === s.chip; })[0] || chips[0];
    var match = function (x) { return !q || x.hay.toLowerCase().indexOf(q) >= 0; };
    var FX = T.facets ? T.facets(all) : [], list0 = all.filter(function (x) { return cur[2](x) && match(x); }), list = FX.length ? this.applyFlt(T.key, list0, FX) : list0;
    var cp = Math.min(s.hpg, Math.max(0, Math.ceil(list.length / s.hper) - 1)), pageList = list.slice(cp * s.hper, cp * s.hper + s.hper);
    var rows = pageList.map(function (x, i) {
      var open = function () { self.open(T.sheet(x)); };
      var cells = [{ isTwo: true, t: x.name, s: x.sub, cls: '', tcls: '' }].concat(x.cells.map(function (c) { return c.tag ? { isTag: true, t: c.t, tone: c.tone || F, ink: c.ink || 'var(--ad-on-flat)', cls: '' } : { isOne: true, t: c.t, col: c.col || 'var(--ad-ink)', fw: 400, cls: c.cls || '', tcls: c.cls || '' }; }));
      return { cells: cells, anim: self.anim(s.ra), delay: (i * 0.035) + 's', aria: x.name + '. Press Enter to open.', menuAria: 'Actions for ' + x.name, menuX: self.popOn('row', x.id),
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } },
        menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', x.id, 260, 330, 'Actions for ' + x.name); } };
    });
    rows.forEach(function (r, i) { Object.assign(r, self.rowSel(T.key, pageList[i].id, pageList[i].name)); });
    var TBL = this.toolsView(T.key, { noun: T.noun, one: T.one, pageIds: pageList.map(function (x) { return x.id; }), allIds: list.map(function (x) { return x.id; }), rowsById: function (ids) { return list.filter(function (x) { return ids.indexOf(x.id) >= 0; }); }, rows: list0, unfiltered: list0, facets: FX, acts: T.bulk ? T.bulk(self) : [], exportFn: function (sel) { self.exportSheet({ noun: T.noun, file: T.file, all: all, filtered: list, selected: sel, cols: T.exportCols }); } });
    var BP = Object.assign(this.pager(T.key, list.length, s.hper, cp, function (k) { self.setState({ hpg: k, ra: s.ra + 1 }); }, function (n) { self.setState({ hper: n, hpg: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ hper: 20, hpg: 0, ra: self.state.ra + 1 }); self.say('Showing all ' + list.length + ' ' + T.noun + '.'); } });
    var chipsV = chips.map(function (c) { var on = c === cur; return { t: c[1], n: all.filter(function (x) { return c[2](x) && match(x); }).length, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ chip: c[0], hpg: 0, ra: self.state.ra + 1 }); } }; });
    var tabs = C.tabs.map(function (t, i) { var on = i === Math.min(s.tab, C.tabs.length - 1), w = t.warn && t.warn(); return { label: t.label, n: t.items().length, chip: w ? 'var(--ad-tone-warn)' : F, ink: w ? '#fff' : 'var(--ad-on-flat)', cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ tab: i, chip: 'all', hpg: 0, hq: '', flt: {}, ra: self.state.ra + 1 }); } }; });
    var stats = C.stats(this).map(function (k, i) { return Object.assign({}, k, self.statDeco(k), { delay: 'd' + (i + 1), aria: k.label + ': ' + k.value + '. ' + k.note, open: k.fn || function () {} }); });
    var railCards = C.rail(this).map(function (c, i) { return { title: c.title, sub: c.sub || '', hasSub: !!c.sub, note: c.note || '', hasNote: !!c.note, delay: 'd' + (i + 3), hasAct: !!c.act, actLabel: c.actLabel || '', act: c.act || null, rows: c.rows.map(function (r) { var tt = r.tagTone || F; return { t: r.t, s: r.s, d: r.d, tone: r.tone || 'var(--ad-tone-neutral)', hasTag: !!r.tag, tag: r.tag || '', tagTone: tt, tagInk: tt === F ? 'var(--ad-on-flat)' : '#fff', open: r.open || function () {} }; }) }; });
    var CV = T.cal ? this.hubCal(T, list, rows) : {};
    var hasFilter = !!q || cur !== chips[0] || TBL.hasFn;
    return Object.assign(this.kit(), this.extraVals(), dv, {
      pageTitle: C.title, ledeA: C.ledeA(this), ledeB: C.ledeB(this), newLabel: C.newLabel, newPost: function () { C.newFn(self); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 260, 220, 'More for ' + C.title); }, choresX: this.popOn('chores', 'chores'),
      deckTitle: C.deckTitle, deckKeys: 'Focus the card: D done, S snooze', snoozeLabel: 'Snooze', snoozeShort: 'Snooze', canPass: true,
      emptyTitle: C.emptyTitle, emptyBody: 'Nothing needs a decision. Next:', emptyNext: C.emptyNext, emptyPrimaryLabel: C.newLabel, emptySecondaryLabel: 'Bring everything back', emptyPrimary: function () { C.newFn(self); },
      tabsAria: C.title + ' sections', tabs: tabs, tabTitle: T.title, total: list.length, chips: chipsV, cols: typeof T.cols === 'function' ? T.cols(self) : T.cols, rows: rows, BP: BP, TBL: TBL, qPh: T.ph, q: s.hq, hasQ: !!s.hq,
      onQ: function (e) { self.setState({ hq: e.target.value, hpg: 0, ra: self.state.ra + 1 }); }, clearQ: function () { self.setState({ hq: '', ra: self.state.ra + 1 }); },
      tabActLabel: T.actLabel, tabActD: T.actD, tabAct: function () { T.act(self); },
      empty: !list.length, hasFilter: hasFilter && !!all.length, noFilterEmpty: !all.length, clearFilters: function () { self.setState({ hq: '', chip: 'all', hpg: 0, flt: {}, ra: self.state.ra + 1 }); }, emptyTitleT: q ? 'Nothing matches "' + s.hq + '".' : (all.length ? 'Nothing in this view.' : T.emptyT), emptyBodyT: q ? T.ph + '.' : (all.length ? 'Try another filter.' : T.emptyB),
      hasStats: true, statsTitle: C.statsTitle, stats: stats, railCards: railCards, isCal: !!T.cal, notCal: !T.cal
    }, CV);
  }
  /* A month grid for any tab whose items carry an ISO date. The grid shows what is booked, the agenda under it lists the chosen day. */
  hubCal(T, list, rows) {
    var self = this, s = this.state, I = this.icons(), today = this.today(), base = this.addMonths('2026-10-01', s.hcm), y = +base.slice(0, 4), m = +base.slice(5, 7) - 1;
    var first = new Date(Date.UTC(y, m, 1)), lead = (first.getUTCDay() + 6) % 7, dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), by = {}, inMonth = 0;
    list.forEach(function (x) { if (x.date) { (by[x.date] = by[x.date] || []).push(x); if (x.date.slice(0, 7) === base.slice(0, 7)) inMonth++; } });
    var sel = s.hsel && s.hsel.slice(0, 7) === base.slice(0, 7) ? s.hsel : (today.slice(0, 7) === base.slice(0, 7) ? today : (Object.keys(by).filter(function (k) { return k.slice(0, 7) === base.slice(0, 7); }).sort()[0] || base));
    var cells = [];
    for (var ci = 0; ci < Math.ceil((lead + dim) / 7) * 7; ci++) {
      var dn = ci - lead + 1, inM = dn >= 1 && dn <= dim, iso = inM ? self.isoOf(y, m, dn) : '', ev = inM ? (by[iso] || []) : [];
      cells.push((function (iso, dn, inM, ev) { return { n: inM ? dn : '', cls: (inM ? '' : 'out') + (iso === today ? ' today' : '') + (iso === sel ? ' sel' : ''), dis: !inM, pressed: iso === sel ? 'true' : 'false', aria: inM ? self.fmtDate(iso) + ', ' + ev.length + (ev.length === 1 ? ' item' : ' items') : '', dots: ev.slice(0, 4).map(function (x) { return x.tone; }), more: ev.length ? ev.length + (ev.length === 1 ? ' item' : ' items') : '', open: function () { self.setState({ hsel: iso, ra: self.state.ra + 1 }); } }; })(iso, dn, inM, ev));
    }
    var open = function (x) { return function () { self.open(T.sheet(x)); }; };
    var ag = (by[sel] || []).slice().sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); }).map(function (x) { return { kind: x.kindLabel, tone: x.tone, ink: x.ink || '#fff', name: x.name, sub: x.sub, time: x.time || '', open: open(x) }; });
    return { wkdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], cells: cells, calLabel: this.monthName(m) + ' ' + y, calSum: inMonth + (inMonth === 1 ? ' thing' : ' things') + ' this month', calAnim: s.ra % 2 ? 'rinA' : 'rinB',
      calPrev: function () { self.setState({ hcm: s.hcm - 1, hsel: '', ra: self.state.ra + 1 }); }, calNext: function () { self.setState({ hcm: s.hcm + 1, hsel: '', ra: self.state.ra + 1 }); }, calToday: function () { self.setState({ hcm: 0, hsel: today, ra: self.state.ra + 1 }); },
      agTitle: this.fmtDateLong(sel), agenda: ag, agEmpty: !ag.length, agHint: 'Use the button above to add something.' };
  }
