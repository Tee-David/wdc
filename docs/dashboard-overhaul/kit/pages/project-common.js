  /* ======================= The project page, shared by all three roles =======================
     The role file supplies projectModel(); this file turns it into the page. */
  pageState() { return Object.assign({ ptab: 'overview', ta: 0, ttab: 'open', tpage: 0, tper: 5, ra: 0, calView: 'week', calIdx: 0, plat: 'all', ca: 0, fpage: 0, fper: 5, apage: 0, aper: 5, aa: 0, tstat: {}, extraTasks: [], extraPosts: [], postSt: {}, apDone: {}, sw: 0, wchk: {} }, this.modelState ? this.modelState() : {}); }
  pageName() { return this.projectModel().pj.name; }
  tourSteps() {
    var I = this.icons(), M = this.projectModel(), out = [{ target: 'stage', title: 'Where the project stands', icon: I.layers, body: 'Each stage in order. The line under it says what the current stage needs.' }, { target: 'tabs', title: 'Everything in one place', icon: I.folder, body: M.role === 'client' ? 'What we are doing, what needs your yes, your files and the history.' : 'Tasks, the content calendar, approvals, files' + (M.role === 'admin' ? ', money' : '') + ' and the history.' }];
    if (M.blockers && M.blockers.length) out.push({ target: 'blockers', title: M.role === 'client' ? 'What we need from you' : 'What is in the way', icon: I.alert, body: 'Each item has the action that clears it.' });
    out.push({ target: 'search|searchS', title: 'Jump anywhere', icon: I.search, body: 'Press Ctrl K to find any project, file or invoice.' });
    return out;
  }
  postTone(st) { return { draft: ['Draft', 'var(--ad-tone-flat)', 'var(--ad-on-flat)'], client: ['With client', 'var(--ad-tone-warn)', '#fff'], approved: ['Approved', 'var(--ad-tone-good)', '#fff'], scheduled: ['Scheduled', 'var(--ad-tone-brand)', '#fff'], posted: ['Posted', 'var(--ad-tone-neutral)', '#fff'], changes: ['Changes asked', 'var(--ad-tone-bad)', '#fff'] }[st]; }
  postState(p) { var s = this.state; if (s.okPosts[p.id]) return 'approved'; if (s.askedPosts[p.id]) return 'client'; return s.postSt[p.id] || p.st; }
  allPosts() { return this.state.extraPosts.concat(this.projectModel().posts || []); }
  postView(p) {
    var L = this.socialLogos(), M = this.projectModel(), st = this.postState(p), T = this.postTone(st);
    return Object.assign({}, p, { platform: { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' }[p.plat], logo: L[p.plat], client: M.pj.client, handle: M.handle, when: p.dayLabel + ', ' + p.time, status: T[0], statusTone: T[1], owner: M.postOwner, cmtNote: M.role === 'client' ? 'Anything you write here goes to ' + M.postOwner + '.' : 'The client sees comments in their portal.' });
  }
  dayLabel(key) { var d = new Date(2026, +key.split('-')[0] - 1, +key.split('-')[1]); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]; }
  taskSheetFor(t) {
    var self = this, I = this.icons(), opts = [['todo', 'To do'], ['doing', 'In progress'], ['review', 'In review'], ['done', 'Done']], cur = this.state.tstat[t.id] || t.st, pick = 0;
    opts.forEach(function (o, i) { if (o[0] === cur) pick = i; });
    return this.sh({ eyebrow: 'Task · ' + this.projectModel().pj.name, title: t.t, icon: I.task, rows: [{ k: 'Who', v: t.who }, { k: 'Due', v: t.due }], body: t.s, listTitle: 'Status', select: true, pick: pick, list: opts.map(function (o) { return { t: o[1] }; }),
      primary: function (ctx) { return ctx.pick === pick ? 'Close' : 'Move to ' + opts[ctx.pick][1].toLowerCase(); }, secondary: 'Add a comment',
      onPrimary: function (ctx) { if (ctx.pick === pick) return; var prev = Object.assign({}, self.state.tstat), n = Object.assign({}, prev); n[t.id] = opts[ctx.pick][0]; self.setState({ tstat: n, ra: self.state.ra + 1 }); self.say('Moved to ' + opts[ctx.pick][1].toLowerCase() + '.', { undo: function () { self.setState({ tstat: prev, ra: self.state.ra + 1 }); } }); },
      onSecondary: function () { self.ask({ eyebrow: 'Comment', title: 'Comment on "' + t.t + '"', input: true, inputLabel: 'Comment', inputPh: 'Only the team sees this', ok: 'Add comment', icon: I.msg, back: true, okToast: 'Comment added. ' + t.who.split(' ')[0] + ' gets a notice.' }, true); return 'stay'; } });
  }
  planPostSheet(dayKeys) {
    var self = this, I = this.icons();
    this.open(this.sh({ eyebrow: 'Content calendar · ' + this.projectModel().pj.client, title: 'Plan a post', icon: I.cal,
      fields: [{ key: 'title', label: 'Working title', ph: 'For example: Serum restock', wide: true }, { key: 'cap', label: 'Caption draft', type: 'area', wide: true, ph: 'The client sees this when you send it for approval.' }],
      chipSets: [{ key: 'plat', label: 'Platform', opts: ['Instagram', 'Facebook', 'TikTok'] }, { key: 'day', label: 'Day', opts: dayKeys.map(function (k) { return self.dayLabel(k); }) }, { key: 'time', label: 'Time', opts: ['09:00', '12:30', '18:00'], hint: 'Best times from the last 30 days: 12:30 and 18:00.' }],
      form: { plat: 'Instagram', time: '12:30', day: self.dayLabel(dayKeys[0]) },
      primary: 'Add as draft', secondary: 'Cancel', primaryDis: function (ctx) { return (ctx.form.title || '').trim() ? '' : 'Give the post a working title.'; },
      onPrimary: function (ctx) { var f = ctx.form, key = dayKeys.filter(function (k) { return self.dayLabel(k) === f.day; })[0]; var p = { id: 'np' + Date.now(), plat: f.plat.toLowerCase(), title: f.title.trim(), cap: (f.cap || '').trim() || 'Caption to come.', key: key, dayLabel: f.day, time: f.time, st: 'draft', art: '#3d2a5c', comments: [] }; self.setState({ extraPosts: [p].concat(self.state.extraPosts), ca: self.state.ca + 1 }); self.say('Draft added for ' + f.day + ', ' + f.time + '. Send it for approval when it is ready.'); } }));
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), M = this.projectModel();
    if (pop.kind === 'chores') return M.chores ? M.chores() : [];
    if (pop.kind === 'task') {
      var t = this.taskList().filter(function (x) { return x.id === pop.id; })[0]; if (!t) return [];
      var cur = this.state.tstat[t.id] || t.st, set = function (st, label) { var prev = Object.assign({}, self.state.tstat), n = Object.assign({}, prev); n[t.id] = st; self.setState({ tstat: n, ra: self.state.ra + 1 }); self.say('Moved to ' + label + '.', { undo: function () { self.setState({ tstat: prev, ra: self.state.ra + 1 }); } }); };
      var out = [it('Open', I.open, function () { self.open(self.taskSheetFor(t)); })];
      if (cur !== 'doing') out.push(it('Mark in progress', I.play, function () { set('doing', 'in progress'); }));
      if (cur !== 'review') out.push(it('Send for review', I.eye, function () { set('review', 'review'); }));
      if (cur !== 'done') out.push(it('Mark done', I.check, function () { set('done', 'done'); }));
      return out;
    }
    return [];
  }
  /* The service tab: stats, lists, tables and checklists chosen by the project's service. */
  workBlocks(M) {
    var self = this, s = this.state, I = this.icons(), F = 'var(--ad-tone-flat)', ink = function (t) { return t === F ? 'var(--ad-on-flat)' : '#fff'; };
    return (M.work ? M.work(this) : []).map(function (b, bi) {
      if (b.type === 'stats') return { isStats: true, isBlock: false, items: b.items.map(function (k) { return { t: k.t, v: k.v, note: k.note || '', noteCol: k.tone || 'var(--ad-dim)', dot: k.dot || 'var(--ad-series-1)' }; }) };
      var out = { isStats: false, isBlock: true, title: b.title, hasSub: !!b.sub, sub: b.sub || '', hasAct: !!b.act, actLabel: b.act ? b.act.label : '', act: b.act ? b.act.fn : null, isList: b.type === 'list', isTable: b.type === 'table', isChecks: b.type === 'checks' };
      if (b.type === 'list') out.items = b.items.map(function (x) { var t = x.tone || F; return { t: x.t, s: x.s, d: x.d || I.file, iconTone: x.iconTone || 'var(--ad-tone-brand)', hasTag: !!x.tag, tag: x.tag, tone: t, ink: ink(t), aria: x.t + '. ' + x.s, open: x.open || function () { self.say(x.t + ' opens here.'); } }; });
      if (b.type === 'table') { out.cols = b.cols.map(function (h) { return { t: h.t || h, cls: h.cls || '' }; }); out.rows = b.rows.map(function (r) { var open = r.open || function () { }; return { aria: r.aria || '', open: function () { open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }, cells: r.cells.map(function (c) { var t = c.tone || F; return { isTag: c.kind === 'tag', isTwo: c.kind === 'two', isOne: !c.kind || c.kind === 'text', t: c.t, s: c.s || '', tone: t, ink: ink(t), col: c.col || 'var(--ad-ink)', cls: c.cls || '', tcls: c.tcls || '' }; }) }; }); }
      if (b.type === 'checks') {
        var n = 0; out.items = b.items.map(function (x) { var key = 'k' + bi + '.' + x.k, on = key in s.wchk ? s.wchk[key] : !!x.on; if (on) n++; return { t: x.t, s: on ? (x.doneS || x.s) : x.s, checked: on ? 'true' : 'false', cls: on ? 'on' : '', toggle: function () { var w = Object.assign({}, self.state.wchk); w[key] = !on; self.setState({ wchk: w }); self.say(on ? 'Marked as not done: ' + x.t + '.' : 'Done: ' + x.t + '.', { undo: function () { var u = Object.assign({}, self.state.wchk); u[key] = on; self.setState({ wchk: u }); } }); } }; });
        out.done = n + ' of ' + b.items.length; out.pct = b.items.length ? Math.round(n / b.items.length * 100) : 0;
      }
      return out;
    });
  }
  taskList() { var s = this.state; return s.extraTasks.concat(this.projectModel().tasks || []); }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this), L = this.socialLogos(), M = this.projectModel(), pj = M.pj;
    var keys = M.tabs, names = { overview: 'Overview', tasks: 'Tasks', cal: 'Content calendar', approvals: M.role === 'client' ? 'Needs your yes' : 'Approvals', files: 'Files', money: 'Money', activity: 'Activity', work: M.workLabel || 'Service' };
    var openTasks = this.taskList().filter(function (t) { return (s.tstat[t.id] || t.st) !== 'done'; }).length;
    var apWaiting = (M.approvals || []).filter(function (a) { return !s.apDone[a.id]; }).length;
    var counts = { tasks: openTasks, approvals: apWaiting, files: (M.files || []).length };
    var ptabs = keys.map(function (k) { var on = s.ptab === k, n = counts[k] || 0; return { label: names[k], n: n, hasN: n > 0, chip: k === 'approvals' && n ? 'var(--ad-tone-warn)' : 'var(--ad-tone-flat)', chipInk: k === 'approvals' && n ? '#fff' : 'var(--ad-on-flat)', cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ptab: k, ta: self.state.ta + 1 }); } }; });
    var track = pj.stages.map(function (l, i) { return { l: l, n: i + 1, cls: i < pj.cur ? 'done' : (i === pj.cur ? 'cur' : 'todo'), isDone: i < pj.cur, notDone: i >= pj.cur, delay: (0.3 + i * 0.08) + 's' }; });

    var blockers = (M.blockers || []).filter(function (b) { return !s.apDone[b.id]; }).map(function (b) { return Object.assign({ hasAlt: !!b.altLabel, anim: self.anim(s.ra) }, b); });
    var nextItems = (M.next || []).map(function (l, i) { return Object.assign({ dotCls: i === 0 ? 'now' : '', hasWho: !!l.who, whenCol: i === 0 ? 'var(--ad-accent-ink)' : 'var(--ad-ink)', open: function () { self.open(S({ eyebrow: 'Coming up · ' + pj.name, title: l.t, icon: I.cal, rows: [{ k: 'When', v: l.when }].concat(l.whoName ? [{ k: 'Who', v: l.whoName }] : []), body: l.s + '.', primary: 'Close' })); } }, l); });
    var team = (M.team || []).map(function (m) { return Object.assign({}, m, { open: function () { self.open(S({ eyebrow: pj.name, title: 'Message ' + m.name, icon: I.msg, compose: true, composeLabel: 'Message', composePh: 'Write to ' + m.name.split(' ')[0], required: true, primary: 'Send', onPrimary: function () { self.say('Sent to ' + m.name.split(' ')[0] + ' in the project thread.'); } })); } }); });

    /* tasks */
    var TL = this.taskList().map(function (t) { return Object.assign({}, t, { st: s.tstat[t.id] || t.st }); });
    var tInTab = function (t, k) { return k === 'open' ? t.st !== 'done' : (k === 'review' ? t.st === 'review' : (k === 'mine' ? t.mine && t.st !== 'done' : t.st === 'done')); };
    var tl = TL.filter(function (t) { return tInTab(t, s.ttab); }), tp = Math.min(s.tpage, Math.max(0, Math.ceil(tl.length / s.tper) - 1));
    var STT = { todo: ['To do', 'var(--ad-tone-flat)', 'var(--ad-on-flat)'], doing: ['In progress', 'var(--ad-tone-live)', '#fff'], review: ['In review', 'var(--ad-tone-brand)', '#fff'], done: ['Done', 'var(--ad-tone-good)', '#fff'] };
    var trows = tl.slice(tp * s.tper, tp * s.tper + s.tper).map(function (t, i) { var open = function () { self.open(self.taskSheetFor(t)); }; return Object.assign({}, t, { status: STT[t.st][0], stTone: STT[t.st][1], stInk: STT[t.st][2], dueCol: t.hot ? 'var(--ad-accent-ink)' : 'var(--ad-ink)', dueW: t.hot ? '700' : '400', anim: self.anim(s.ra), delay: (i * 0.035) + 's', aria: t.t + ', ' + t.who + ', due ' + t.due + '. Press Enter to open.', menuAria: 'Actions for ' + t.t, open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }, menuX: self.popOn('task', t.id), menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'task', t.id, 230, 220, 'Actions for ' + t.t); } }); });
    var ttabs = (M.taskTabs || [['open', 'Open'], ['review', 'In review'], ['done', 'Done']]).map(function (k) { var on = s.ttab === k[0]; return { label: k[1], n: TL.filter(function (t) { return tInTab(t, k[0]); }).length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ttab: k[0], tpage: 0, ra: self.state.ra + 1 }); } }; });
    var TP = Object.assign(this.pager('tasks', tl.length, s.tper, tp, function (k) { self.setState({ tpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ tper: n, tpage: 0 }); }), { all: function () { self.setState({ tper: 20, tpage: 0 }); } });

    /* content calendar */
    var cal = M.calendar || { weeks: [], months: [] }, posts = this.allPosts().filter(function (x) { return s.plat === 'all' || x.plat === s.plat; });
    var byKey = {}; posts.forEach(function (x) { (byKey[x.key] = byKey[x.key] || []).push(x); });
    var openPost = function (x) { return function () { self.openPost(self.postView(Object.assign({}, x, { dayLabel: self.dayLabel(x.key) })), M.role === 'client' ? 'client' : 'staff'); }; };
    var isWeek = s.calView === 'week', W = cal.weeks[Math.min(s.calIdx, cal.weeks.length - 1)] || { label: '', days: [] };
    var days = W.days.map(function (k) { var items = (byKey[k] || []).map(function (x) { var T = self.postTone(self.postState(x)); return { t: x.title, time: x.time, pd: L[x.plat].d, pc: L[x.plat].c, st: T[0], tone: T[1], ink: T[2], aria: x.title + ', ' + x.plat + ', ' + T[0], open: openPost(x) }; }); var lbl = self.dayLabel(k).split(' '); return { d: lbl[0], n: lbl[1], items: items, empty: !items.length, dcol: k === M.today ? 'var(--ad-accent-ink)' : 'var(--ad-dim)', ncol: k === M.today ? 'var(--ad-accent-ink)' : 'var(--ad-ink)' }; });
    var MO = cal.months[Math.min(s.calIdx, cal.months.length - 1)] || { label: '', y: 2026, m: 10 };
    var first = new Date(MO.y, MO.m - 1, 1), lead = (first.getDay() + 6) % 7, dim = new Date(MO.y, MO.m, 0).getDate(), cells = [];
    for (var ci = 0; ci < Math.ceil((lead + dim) / 7) * 7; ci++) {
      var dn = ci - lead + 1, inM = dn >= 1 && dn <= dim, key = MO.m + '-' + dn, list = inM ? (byKey[key] || []) : [];
      cells.push((function (key, dn, inM, list) { return { n: inM ? dn : '', cls: (inM ? '' : 'out') + (key === M.today ? ' today' : ''), dis: !inM || !list.length, aria: inM ? self.dayLabel(key) + ', ' + list.length + (list.length === 1 ? ' post' : ' posts') : '', dots: list.slice(0, 4).map(function (x) { return self.postTone(self.postState(x))[1]; }), more: list.length ? list.length + (list.length === 1 ? ' post' : ' posts') : '', open: function () { if (!list.length) return; self.open(S({ eyebrow: 'Content calendar', title: self.dayLabel(key), icon: I.cal, listTitle: list.length + (list.length === 1 ? ' post' : ' posts'), list: list.map(function (x) { var T = self.postTone(self.postState(x)); return { t: x.title, s: x.time, logo: L[x.plat], tag: T[0], tone: T[1], act: { label: 'Preview', fn: function () { self.openPost(self.postView(Object.assign({}, x, { dayLabel: self.dayLabel(x.key) })), M.role === 'client' ? 'client' : 'staff', true); } } }; }), primary: 'Close' })); } }; })(key, dn, inM, list));
    }
    var nCal = isWeek ? cal.weeks.length : cal.months.length;
    var platDefs = [['all', 'All'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok']], platI = 0; platDefs.forEach(function (x, i) { if (x[0] === s.plat) platI = i; });
    var allP = this.allPosts(), waitN = allP.filter(function (x) { return self.postState(x) === 'client'; }).length;

    /* approvals, files, money, activity */
    var approvals = (M.approvals || []).filter(function (a) { return !s.apDone[a.id]; }).map(function (a) { return Object.assign({ anim: self.anim(s.ra), hasAlt: !!a.altLabel, hasAct: !!a.actLabel, actCls: a.actCls || 'btn' }, a); });
    var F = M.files || [], fp = Math.min(s.fpage, Math.max(0, Math.ceil(F.length / s.fper) - 1));
    var frows = F.slice(fp * s.fper, fp * s.fper + s.fper).map(function (f, i) { var prev = function () { self.openFile(f); }; return Object.assign({}, f, { meta: f.when + ' · ' + f.size + ' · ' + f.by, aria: 'Preview ' + f.name, dlAria: 'Download ' + f.name, anim: self.anim(s.ra), delay: (i * 0.035) + 's', get: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.say('Downloading ' + f.name + ' (' + f.size + ')'); }, preview: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; prev(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); prev(); } } }); });
    var FP = Object.assign(this.pager('pfiles', F.length, s.fper, fp, function (k) { self.setState({ fpage: k }); }, function (n) { self.setState({ fper: n, fpage: 0 }); }), { all: function () { self.setState({ fper: 20, fpage: 0 }); } });
    var mrows = ((M.money || {}).rows || []).map(function (r) { var open = function () { self.openFile({ name: r.no + '.pdf', project: pj.client, view: 'doc', ref: r.no, docTitle: r.for + ' · ' + r.amount, when: r.date, size: '190 KB', tone: 'var(--ad-tone-bad)', by: 'Funmi K.' }); }; return Object.assign({}, r, { aria: r.no + ', ' + r.amount + ', ' + r.status + '. Press Enter to preview.', open: open, key: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } }); });
    var A = M.activity || [], ap = Math.min(s.apage, Math.max(0, Math.ceil(A.length / s.aper) - 1));
    var acts = A.slice(ap * s.aper, ap * s.aper + s.aper).map(function (a, i) { return Object.assign({ dotCls: ap === 0 && i === 0 ? 'now' : '', anim: self.anim(s.aa), delay: (i * 0.04) + 's' }, a); });
    var AP = Object.assign(this.pager('pacts', A.length, s.aper, ap, function (k) { self.setState({ apage: k, aa: self.state.aa + 1 }); }, function (n) { self.setState({ aper: n, apage: 0 }); }), { all: function () { self.setState({ aper: 20, apage: 0 }); } });

    return Object.assign(this.kit(), this.extraVals(), {
      pj: Object.assign({ hasFlag: !!pj.flag }, pj), hasCrumbs: !!M.crumb, crumbHref: M.crumb ? M.crumb.href : '', crumbLabel: M.crumb ? M.crumb.label : '',
      hasSwitch: !!M.switches, switches: M.switches || [], switchN: (M.switches || []).length || 1, switchI: s.sw,
      hasHeadAct: !!M.headAct, headActLabel: M.headAct ? M.headAct.label : '', headActIcon: M.headAct ? M.headAct.icon : '', headAct: function () { if (M.headAct) M.headAct.fn(); }, hasChores: !!M.chores, openChores: function (e) { self.openPop(e, 'chores', 'chores', 240, 230, 'More for this project'); },
      track: track, stepAria: pj.name + ': stage ' + (pj.cur + 1) + ' of ' + pj.stages.length + ', ' + pj.stages[pj.cur], stageNote: pj.stageNote,
      ptabs: ptabs, tabAnim: s.ta % 2 ? 'kidIn' : 'kidIn2',
      isOverview: s.ptab === 'overview', isTasks: s.ptab === 'tasks', isCal: s.ptab === 'cal', isApprovals: s.ptab === 'approvals', isFiles: s.ptab === 'files', isMoney: s.ptab === 'money', isActivity: s.ptab === 'activity', isWork: s.ptab === 'work', moneyHref: M.moneyHref || 'A-Money.dc.html', moneyHrefLabel: M.moneyHrefLabel || 'Open Money', wblocks: this.workBlocks(M),
      hasBlockers: blockers.length > 0, noBlockers: !blockers.length, blockers: blockers, blockN: blockers.length, blockTitle: M.role === 'client' ? 'What we need from you' : 'What is in the way', clearNote: M.clearNote || 'Everything the team needs is in place.',
      nextItems: nextItems, nextN: nextItems.length,
      progress: (M.progress || []).map(function (g) { return Object.assign({}, g, { pct: Math.round(g.pct * p) }); }), team: team, teamTitle: M.teamTitle || 'Team', facts: M.facts || [],
      trows: trows, ttabs: ttabs, TP: TP, tEmpty: !tl.length, tEmptyTitle: s.ttab === 'done' ? 'Nothing finished yet.' : 'No open tasks here.', tEmptyBody: s.ttab === 'done' ? 'Tasks you mark done move here.' : 'Add a task, or look in another tab.', addTask: function () { self.open(self.taskSheet(Object.assign({ lead: M.defaultWho || self.me().name }, pj), function (f) { var m = self.teamData().filter(function (x) { return x.name === f.who; })[0] || { i: 'BA', tone: '#000065' }; self.setState({ extraTasks: [{ id: 'nt' + Date.now(), t: f.t.trim(), s: (f.note || '').trim() || 'Added just now', who: f.who, i: m.i, tone: m.tone, due: f.due, hot: f.due === 'Today', st: 'todo', mine: f.who === self.me().name }].concat(self.state.extraTasks), ptab: 'tasks', ttab: 'open', tpage: 0, ra: self.state.ra + 1 }); })); },
      calSummary: allP.length + ' posts planned · ' + waitN + ' with the client', isWeek: isWeek, isMonth: !isWeek, calViewI: isWeek ? 0 : 1, cWeek: isWeek ? 'on' : '', cMonth: isWeek ? '' : 'on', cWeekP: isWeek ? 'true' : 'false', cMonthP: isWeek ? 'false' : 'true',
      setWeek: function () { self.setState({ calView: 'week', calIdx: M.calStartWeek || 0, ca: self.state.ca + 1 }); }, setMonth: function () { self.setState({ calView: 'month', calIdx: 0, ca: self.state.ca + 1 }); },
      calLabel: isWeek ? W.label : MO.label, days: days, cells: cells, wkdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], calAnim: s.ca % 2 ? 'rinA' : 'rinB',
      calPrev: function () { self.setState({ calIdx: Math.max(0, self.state.calIdx - 1), ca: self.state.ca + 1 }); }, calNext: function () { self.setState({ calIdx: Math.min(nCal - 1, self.state.calIdx + 1), ca: self.state.ca + 1 }); }, calPrevDis: s.calIdx <= 0, calNextDis: s.calIdx >= nCal - 1,
      platI: platI, plats: platDefs.map(function (x) { var on = s.plat === x[0], lg = L[x[0]]; return { isAll: x[0] === 'all', hasLogo: !!lg, d: lg ? lg.d : '', c: lg ? (x[0] === 'tiktok' ? 'var(--ad-ink)' : lg.c) : '', aria: 'Show ' + x[1], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ plat: x[0], ca: self.state.ca + 1 }); } }; }),
      canPlan: M.role !== 'client', planPost: function () { self.planPostSheet(W.days.length ? W.days : cal.weeks[0].days); },
      legend: ['draft', 'client', 'approved', 'scheduled'].map(function (k) { var T = self.postTone(k); return { t: T[0], c: T[1] }; }),
      approvals: approvals, apEmpty: !approvals.length, apTitle: M.role === 'client' ? 'Needs your yes' : 'Waiting on ' + pj.client, apSub: M.apSub || '', apEmptyBody: M.apEmptyBody || 'New approvals appear here and in the deck on the home page.',
      frows: frows, FP: FP, canUpload: M.role !== 'client' || M.clientUpload, upload: function () { self.open(S({ eyebrow: pj.name, title: 'Upload files', icon: I.upload, body: 'Up to 50 MB a file. ' + (M.role === 'client' ? 'The team is told when your files land.' : 'Choose who sees them before they land.'), chipSets: M.role === 'client' ? [] : [{ key: 'who', label: 'Who sees them', opts: ['Team only', 'Client sees it'] }], form: { who: 'Team only' }, primary: 'Choose files', secondary: 'Cancel', onPrimary: function (ctx) { self.say('The file picker opens here.' + (ctx.form.who ? ' ' + ctx.form.who + '.' : '')); } })); },
      mrows: mrows, schedule: (M.money || {}).schedule || [], scheduleNote: (M.money || {}).note || '',
      acts: acts, AP: AP
    }, M.extra ? M.extra() : {});
  }
