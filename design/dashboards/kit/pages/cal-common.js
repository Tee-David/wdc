  /* ======================= The calendar engine, one for every calendar in the product =======================
     Day, week and month on one set of events. A mini month with the shown week highlighted, a list of calendars
     that switch on and off, a time grid with outlined cards, today's column, and a line for now with an add button.
     The page hands it events and what each click should do; it hands back the values the %%CAL:KEY%% partial reads.

       calView('id', { cals: [{ id, label, color }], events: [{ id, date: 'M-D', start: 'HH:MM', end: 'HH:MM', title, sub, cal,
                       people: [{ i, tone }], logo: { d, c }, tag: [label, tone, ink], open: fn }],
                       today: '2026-10-12', now: '10:42', date: '2026-10-12', view: 'week', addLabel,
                       onAdd(iso, time), onSlot(iso, time), onExport, onEditCals, listTitle, startHour, endHour, rowH })

     The state lives in state.cals[id] so two calendars on one board never share a view. */
  calGet(id, cfg) { var c = (this.state.cals || {})[id] || {}; return { view: c.view || (this.isPhone() ? 'day' : (cfg.view || 'week')), date: c.date || cfg.date || cfg.today, off: c.off || {}, n: c.n || 0 }; }
  calSet(id, patch) { var all = Object.assign({}, this.state.cals || {}), cur = all[id] || {}; all[id] = Object.assign({}, cur, patch, { n: (cur.n || 0) + 1 }); this.setState({ cals: all }); }
  calView(id, cfg) {
    var self = this, st = this.calGet(id, cfg), view = st.view;
    var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], SH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var P = function (s) { var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); };
    var iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    var key = function (d) { return (d.getMonth() + 1) + '-' + d.getDate(); };
    var add = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
    var mins = function (t) { var a = (t || '09:00').split(':'); return (+a[0]) * 60 + (+a[1] || 0); };
    var hhmm = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
    var cur = P(st.date), today = P(cfg.today), rowH = cfg.rowH || 60, h0 = cfg.startHour || 8, h1 = cfg.endHour || 20;
    var monday = add(cur, -((cur.getDay() + 6) % 7)), calBy = {}; (cfg.cals || []).forEach(function (c) { calBy[c.id] = c; });
    var all = (cfg.events || []).map(function (e) { var s = mins(e.start), en = e.end ? mins(e.end) : s + 60; return Object.assign({}, e, { s: s, e: Math.max(en, s + 30), color: (calBy[e.cal] || {}).color || 'var(--ad-series-1)' }); });
    var vis = all.filter(function (e) { return !st.off[e.cal]; }), byKey = {};
    vis.forEach(function (e) { (byKey[e.date] = byKey[e.date] || []).push(e); });
    Object.keys(byKey).forEach(function (k) { byKey[k].sort(function (a, b) { return a.s - b.s || a.e - b.e; }); });
    var set = function (patch) { self.calSet(id, patch); };
    var shift = function (dir) { if (view === 'month') { var t = new Date(cur.getFullYear(), cur.getMonth() + dir, 1), dim = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); set({ date: iso(new Date(t.getFullYear(), t.getMonth(), Math.min(cur.getDate(), dim))) }); } else set({ date: iso(add(cur, dir * (view === 'week' ? 7 : 1))) }); };
    var shortOf = function (e) { return e.title; };

    /* the time grid: day or week */
    var days = view === 'day' ? [cur] : [0, 1, 2, 3, 4, 5, 6].map(function (i) { return add(monday, i); });
    var cols = days.map(function (d) {
      var list = (byKey[key(d)] || []).slice(), cl = [], cEnd = -1, start = 0;
      var close = function (to) { var n = 0; for (var q = start; q < to; q++) n = Math.max(n, list[q]._l + 1); for (var r = start; r < to; r++) list[r]._n = n; };
      var ends = [];
      list.forEach(function (e, i) { if (e.s >= cEnd && i > start) { close(i); start = i; ends = []; } var l = 0; while (ends[l] > e.s) l++; ends[l] = e.e; e._l = l; cEnd = Math.max(cEnd, e.e); });
      close(list.length);
      var evs = list.map(function (e) {
        var top = Math.max(0, (e.s - h0 * 60) / 60 * rowH), h = Math.max(46, (e.e - e.s) / 60 * rowH) - 3, n = e._n || 1, ppl = e.people || [], tag = e.tag;
        return { title: shortOf(e), time: hhmm(e.s) + ' to ' + hhmm(e.e), sub: e.sub || '', top: top + 1, h: h, left: 'calc(' + (e._l * 100 / n) + '% + 3px)', w: 'calc(' + (100 / n) + '% - 6px)', color: e.color,
          cls: (h < 56 ? 'short ' : '') + (h >= 96 ? 'tall' : ''), aria: e.title + ', ' + DW[d.getDay()] + ' ' + d.getDate() + ' ' + SH[d.getMonth()] + ', ' + hhmm(e.s) + ' to ' + hhmm(e.e) + (calBy[e.cal] ? ', ' + calBy[e.cal].label : ''),
          hasLogo: !!e.logo, logoBg: e.logo ? e.logo.c : '', logoD: e.logo ? e.logo.d : '', hasSub: h >= 104 && !!e.sub, hasPeople: h >= 76 && ppl.length > 0, people: ppl.slice(0, 3), hasMore: ppl.length > 3, more: '+' + (ppl.length - 3),
          hasTag: h >= 86 && !!tag, tag: tag ? tag[0] : '', tagTone: tag ? tag[1] : '', tagInk: tag ? tag[2] : '', open: function (ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); if (cfg.open) cfg.open(e); } };
      });
      var isT = iso(d) === iso(today);
      return { d: DW[d.getDay()], n: String(d.getDate()), cls: (isT ? 'is-today ' : '') + (iso(d) === iso(cur) && view === 'week' ? 'is-sel' : ''), events: evs,
        slot: function (ev) { if (ev && ev.target && ev.target.closest && ev.target.closest('.tgEv')) return; var r = ev.currentTarget.getBoundingClientRect(), m = Math.round(((ev.clientY - r.top) / rowH * 60) / 30) * 30 + h0 * 60; m = Math.max(h0 * 60, Math.min(h1 * 60 - 30, m)); if (cfg.onSlot) cfg.onSlot(iso(d), hhmm(m)); else if (cfg.onAdd) cfg.onAdd(iso(d), hhmm(m)); } };
    });
    var hours = []; for (var h = h0; h < h1; h++) hours.push({ top: (h - h0) * rowH, label: ('0' + h).slice(-2) + ':00' });
    var nowM = cfg.now ? mins(cfg.now) : -1, nowDay = days.some(function (d) { return iso(d) === iso(today); });
    var nowShow = nowM >= h0 * 60 && nowM <= h1 * 60 && nowDay;

    /* the month grid */
    var first = new Date(cur.getFullYear(), cur.getMonth(), 1), lead = (first.getDay() + 6) % 7, dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate(), rows = Math.ceil((lead + dim) / 7), cells = [], mini = [];
    for (var i = 0; i < rows * 7; i++) {
      (function (i) {
        var d = add(first, i - lead), inM = d.getMonth() === cur.getMonth(), list = byKey[key(d)] || [], isT = iso(d) === iso(today), isS = iso(d) === iso(cur);
        var inWeek = view === 'week' && d >= monday && d <= add(monday, 6), col = (i % 7);
        cells.push({ n: String(d.getDate()), cls: (inM ? '' : 'out ') + (isT ? 'is-today' : ''), aria: DW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + ', ' + list.length + (list.length === 1 ? ' item' : ' items'),
          items: list.slice(0, 3).map(function (e) { return { title: hhmm(e.s) + ' ' + e.title, color: e.color, aria: e.title + ', ' + hhmm(e.s), open: function (ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); if (cfg.open) cfg.open(e); } }; }),
          hasMore: list.length > 3, more: '+' + (list.length - 3) + ' more', pick: function () { set({ date: iso(d), view: 'day' }); } });
        mini.push({ n: String(d.getDate()), cls: (inM ? '' : 'out ') + (isT ? 'is-today ' : '') + (isS ? 'is-sel ' : '') + (inWeek ? 'is-week ' : '') + (inWeek && col === 0 ? 'wk-s ' : '') + (inWeek && col === 6 ? 'wk-e' : ''),
          dot: list.length ? list[0].color : 'transparent', pressed: isS ? 'true' : 'false', aria: DW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + (list.length ? ', ' + list.length + (list.length === 1 ? ' item' : ' items') : ''), pick: function () { set({ date: iso(d) }); } });
      })(i);
    }
    var inView = vis.filter(function (e) { var p = P('2026-' + ('0' + e.date.split('-')[0]).slice(-2) + '-' + ('0' + e.date.split('-')[1]).slice(-2)); return view === 'day' ? iso(p) === iso(cur) : (view === 'week' ? p >= monday && p <= add(monday, 6) : p.getMonth() === cur.getMonth()); }).length;
    var viewI = { day: 0, week: 1, month: 2 }[view];
    var rangeOf = function () { if (view === 'day') return DF[cur.getDay()] + ' ' + cur.getDate() + ' ' + MON[cur.getMonth()]; if (view === 'week') { var e = add(monday, 6); return monday.getMonth() === e.getMonth() ? monday.getDate() + ' to ' + e.getDate() + ' ' + SH[e.getMonth()] : monday.getDate() + ' ' + SH[monday.getMonth()] + ' to ' + e.getDate() + ' ' + SH[e.getMonth()]; } return inView + (inView === 1 ? ' item' : ' items'); };
    var seg = function (v) { return function () { set({ view: v }); }; };
    return {
      anim: st.n % 2 ? 'rinA' : 'rinB', add: function () { if (cfg.onAdd) cfg.onAdd(iso(cur), null); }, addLabel: cfg.addLabel || 'Add schedule', canAdd: cfg.canAdd !== false, sideAdd: cfg.canAdd !== false && cfg.sideAdd !== false,
      mini: { title: MON[cur.getMonth()] + ' ' + cur.getFullYear(), heads: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], cells: mini, prev: function () { var t = new Date(cur.getFullYear(), cur.getMonth() - 1, 1), dd = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); set({ date: iso(new Date(t.getFullYear(), t.getMonth(), Math.min(cur.getDate(), dd))) }); }, next: function () { var t = new Date(cur.getFullYear(), cur.getMonth() + 1, 1), dd = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); set({ date: iso(new Date(t.getFullYear(), t.getMonth(), Math.min(cur.getDate(), dd))) }); } },
      listTitle: cfg.listTitle || 'My calendars', editCals: function () { if (cfg.onEditCals) cfg.onEditCals(); else self.say('Choose which calendars show here. Your choice is kept for next time.'); },
      cals: (cfg.cals || []).map(function (c) { var on = !st.off[c.id]; return { label: c.label, color: c.color, on: on ? 'true' : 'false', n: all.filter(function (e) { return e.cal === c.id; }).length, tog: function () { var o = Object.assign({}, st.off); if (on) o[c.id] = true; else delete o[c.id]; set({ off: o }); } }; }),
      title: MON[cur.getMonth()] + ' ' + cur.getFullYear(), range: rangeOf(), prev: function () { shift(-1); }, next: function () { shift(1); }, today: function () { set({ date: iso(today) }); },
      viewI: viewI, cDay: view === 'day' ? 'on' : '', cWeek: view === 'week' ? 'on' : '', cMonth: view === 'month' ? 'on' : '', pDay: view === 'day' ? 'true' : 'false', pWeek: view === 'week' ? 'true' : 'false', pMonth: view === 'month' ? 'true' : 'false', setDay: seg('day'), setWeek: seg('week'), setMonth: seg('month'),
      export: function () { if (cfg.onExport) cfg.onExport(vis); else self.say('Exporting ' + inView + ' items as a calendar file.'); },
      strip: [0, 1, 2, 3, 4, 5, 6].map(function (i) { var d = add(monday, i), isS = iso(d) === iso(cur); return { d: DW[d.getDay()].charAt(0), n: String(d.getDate()), cls: (isS ? 'is-sel ' : '') + (iso(d) === iso(today) ? 'is-today' : ''), pressed: isS ? 'true' : 'false', aria: DW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()], pick: function () { set({ date: iso(d), view: view === 'month' ? 'day' : view }); } }; }),
      isGrid: view !== 'month', tgCls: view === 'day' ? 'is-day' : '', nCols: cols.length, gridH: (h1 - h0) * rowH, rowH: rowH, tz: 'GMT +1', cols: cols, hours: hours, nowShow: nowShow && view !== 'month', nowTop: (nowM - h0 * 60) / 60 * rowH, nowLabel: cfg.now || '',
      isMonth: view === 'month', wkdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], cells: cells,
      summary: inView ? inView + (inView === 1 ? ' item' : ' items') + (view === 'day' ? ' today' : view === 'week' ? ' this week' : ' this month') + (cfg.summaryNote ? '. ' + cfg.summaryNote : '.') : 'Nothing booked in this view. Pick another day or turn a calendar back on.'
    };
  }
