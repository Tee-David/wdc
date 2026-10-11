  /* ======================= Owner · Projects ======================= */
  pageState() { return { view: 'list', va: 0, svc: 'all', ptab: 'live', ppage: 0, pper: 5, q2: '', ra: 0, wk: 0, added: [], paused: {}, trashed: {} }; }
  pageName() { return 'Projects'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'figures', title: 'Where the work stands', icon: I.chart, body: 'Live projects, what waits on clients, and what is due this week. Tap a figure for the list.' },
      { target: 'views', title: 'List, board or calendar', icon: I.layers, body: 'The same projects three ways. Filter by service with the chips; tap any project to open it.', hint: 'The board scrolls sideways on a phone.' },
      { target: 'new', title: 'Start a project', icon: I.plus, body: 'Pick the client, the service and the lead. The stages come from the service, and the deposit invoice can go out straight away.' },
      { target: 'search|searchS', title: 'Jump anywhere', icon: I.search, body: 'Press Ctrl K to find any client, project or invoice.' }
    ];
  }
  allProjects() { var s = this.state; return s.added.concat(this.projectsData()).filter(function (p) { return !s.trashed[p.id]; }).map(function (p) { return s.paused[p.id] ? Object.assign({}, p, { flag: 'Paused' }) : p; }); }
  openProject(pj) { if (pj.id === 'mira-so') { window.location.href = 'A-Project.dc.html'; return; } this.open(this.projectSheet(pj)); }
  newProjectSheet() {
    var self = this, I = this.icons(), clients = this.clientsData().filter(function (c) { return c.status !== 'past'; });
    var stagesFor = { 'Brand identity': 'Discovery, Concepts, Review, Final files, Handover', 'Website': 'Discovery, Design, Build, Launch, Handover', 'Social media': 'Setup, Plan, Approve, Publish, Report', 'SEO': 'Audit, Fix, Content, Report', 'App': 'Discovery, Design, Build, Test, Release', 'Software & AI': 'Discovery, Design, Build, Test, Release' };
    this.open(this.sh({ eyebrow: 'New project', title: 'Start a project', icon: I.folder, wide: true,
      listTitle: 'Client', select: true, selectWhy: 'Choose the client.', list: clients.map(function (c) { return { t: c.name, s: c.contact + (c.status === 'lead' ? ' · lead, converts when the project starts' : ''), ini: c.ini, av: c.tone }; }),
      chipSets: function (s) { return [{ key: 'svc', label: 'Service', opts: Object.keys(stagesFor), hint: s.form.svc ? 'Stages: ' + stagesFor[s.form.svc] + '.' : 'The stages come from the service.' }, { key: 'lead', label: 'Lead', opts: self.teamData().map(function (m) { return m.name; }) }, { key: 'start', label: 'Starts', opts: ['Mon 13 Oct', 'Mon 20 Oct', 'Sat 1 Nov'] }, { key: 'dep', label: 'Deposit', opts: ['Send the 50% deposit invoice now', 'Bill later'] }]; },
      fields: [{ key: 'name', label: 'Project name (optional)', ph: 'Defaults to the service', wide: true }, { key: 'value', label: 'Project value', ph: '₦0', mode: 'numeric', hint: 'Leave empty for a retainer you bill monthly.' }],
      form: { start: 'Mon 20 Oct', dep: 'Send the 50% deposit invoice now' },
      primary: function (ctx) { return ctx.form.dep === 'Bill later' ? 'Create project' : 'Create and send the deposit invoice'; }, secondary: 'Cancel',
      primaryDis: function (ctx) { if (ctx.pick < 0) return 'Choose the client.'; if (!ctx.form.svc) return 'Choose the service.'; if (!ctx.form.lead) return 'Choose who leads it.'; return ''; },
      onPrimary: function (ctx) {
        var c = clients[ctx.pick], f = ctx.form, v = parseInt(String(f.value || '').replace(/\D/g, ''), 10) || 0, m = self.teamData().filter(function (x) { return x.name === f.lead; })[0];
        var st = stagesFor[f.svc].split(', ');
        var pj = { id: 'np' + Date.now(), name: (f.name || '').trim() || f.svc, client: c.name, cid: c.id, svc: f.svc === 'App' ? 'Apps' : (f.svc === 'Website' ? 'Web & Apps' : (f.svc === 'Social media' ? 'Social & Ads' : (f.svc === 'Brand identity' ? 'Branding & Design' : f.svc))), stages: st, cur: 0, stage: st[0], lead: m.name, leadI: m.i, leadTone: m.tone, due: 'Starts ' + f.start, dueHot: false, value: v ? self.ngn(v) : 'Monthly', pay: f.dep === 'Bill later' ? 'Not billed yet' : 'Deposit invoice sent', payTone: f.dep === 'Bill later' ? 'var(--ad-dim)' : 'var(--ad-tone-warn)', status: 'live', flag: 'New', next: st[0] + ' with ' + m.name.split(' ')[0] };
        self.setState({ added: [pj].concat(self.state.added), ptab: 'live', ppage: 0, svc: 'all', q2: '', view: 'list', ra: self.state.ra + 1 });
        self.say(f.dep === 'Bill later' ? 'Project started. It is on ' + m.name.split(' ')[0] + '’s My Day.' : 'Project started and the deposit invoice' + (v ? ' for ' + self.ngn(v / 2) : '') + ' went to ' + c.contact.split(' ')[0] + ' by email.');
      } }));
  }
  rowMenu(pj) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), out = [it('Open', I.open, function () { self.openProject(pj); })];
    if (pj.status !== 'done') {
      out.push(it('Add a task', I.task, function () { self.open(self.taskSheet(pj)); }));
      out.push(it(pj.flag === 'Paused' && self.state.paused[pj.id] ? 'Resume' : 'Pause…', I.clock, function () {
        if (self.state.paused[pj.id]) { var u = Object.assign({}, self.state.paused); delete u[pj.id]; self.setState({ paused: u, ra: self.state.ra + 1 }); self.say(pj.name + ' resumed. The team sees it on My Day again.'); return; }
        self.ask({ eyebrow: 'Pause', title: 'Pause ' + pj.name + '?', body: 'Its tasks leave everyone’s My Day and deadlines stop counting down. ' + pj.client + ' sees “Paused” in their portal with the reason you give.', input: true, inputLabel: 'Reason the client sees', inputPh: 'For example: paused until milestone 2 is paid', ok: 'Pause project', icon: I.clock, tone: 'var(--ad-tone-warn)', onOk: function () { var pp = Object.assign({}, self.state.paused); pp[pj.id] = true; self.setState({ paused: pp, ra: self.state.ra + 1 }); self.say(pj.name + ' paused.'); } });
      }));
    }
    out.push(this.menuSep());
    out.push(it('Move to Trash…', I.trash, function () { self.ask({ eyebrow: 'Trash', title: 'Move ' + pj.name + ' to Trash?', body: 'Tasks, files and the content calendar go with it. Invoices stay in Money. Restore it from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { var t = Object.assign({}, self.state.trashed); t[pj.id] = true; self.setState({ trashed: t, ra: self.state.ra + 1 }); self.say(pj.name + ' moved to Trash.', { undo: function () { var u = Object.assign({}, self.state.trashed); delete u[pj.id]; self.setState({ trashed: u, ra: self.state.ra + 1 }); } }); } }); }, { danger: true }));
    return out;
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (pop.kind === 'row') { var pj = this.allProjects().filter(function (x) { return x.id === pop.id; })[0]; return pj ? this.rowMenu(pj) : []; }
    if (pop.kind === 'chores') return [it('Export projects', I.down, function () { self.say('projects.csv downloaded with ' + self.allProjects().length + ' projects.'); }, { hint: 'CSV' }), it('Stage templates', I.layers, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Settings' }), this.menuSep(), it('Open Trash', I.trash, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Settings' })];
    return [];
  }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this);
    var all = this.allProjects(), q = s.q2.trim().toLowerCase();
    var SV = ['Branding & Design', 'Web & Apps', 'Social & Ads', 'SEO', 'Apps', 'Software & AI'];
    var matchQ = function (x) { return !q || (x.name + ' ' + x.client + ' ' + x.lead).toLowerCase().indexOf(q) >= 0; };
    var matchS = function (x) { return s.svc === 'all' || x.svc === s.svc; };
    var inTab = function (x, t) { return t === 'live' ? x.status !== 'done' : (t === 'waiting' ? x.status === 'waiting' : x.status === 'done'); };
    var base = all.filter(function (x) { return matchQ(x) && matchS(x); });
    var list = base.filter(function (x) { return inTab(x, s.ptab); });
    var pp = Math.min(s.ppage, Math.max(0, Math.ceil(list.length / s.pper) - 1));
    var pct = function (x) { return x.status === 'done' ? 100 : Math.round((x.cur + (x.stages.length > 1 ? 0.5 : 0.5)) / Math.max(1, x.stages.length) * 100); };
    var rows = list.slice(pp * s.pper, pp * s.pper + s.pper).map(function (x, i) {
      var open = function () { self.openProject(x); };
      return Object.assign({}, x, { stage: x.flag && x.flag !== 'New' ? x.flag : x.stage, tone: x.flag === 'Paused' || x.flag === 'Blocked' ? 'var(--ad-tone-bad)' : (x.status === 'waiting' ? 'var(--ad-tone-warn)' : (x.status === 'done' ? 'var(--ad-tone-good)' : (x.flag === 'New' ? 'var(--ad-tone-brand)' : 'var(--ad-tone-flat)'))), ink: x.flag || x.status !== 'live' ? '#fff' : 'var(--ad-on-flat)', stepTxt: x.stages.length > 1 && x.status !== 'done' ? (x.cur + 1) + ' of ' + x.stages.length : '', pct: pct(x), dueCol: x.dueHot ? 'var(--ad-accent-ink)' : 'var(--ad-ink)', dueW: x.dueHot ? '700' : '400', payCol: x.payTone, anim: self.anim(s.ra), delay: (i * 0.035) + 's',
        aria: x.name + ' for ' + x.client + ', ' + x.stage + '. Press Enter to open.', menuAria: 'Actions for ' + x.name,
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } },
        menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', x.id, 240, 230, 'Actions for ' + x.name); } });
    });
    var tabs = [['live', 'Live'], ['waiting', 'Waiting on client'], ['done', 'Done']].map(function (t) { var on = s.ptab === t[0], n = base.filter(function (x) { return inTab(x, t[0]); }).length; return { label: t[1], n: n, cls: on ? 'on' : '', sel: on ? 'true' : 'false', chip: t[0] === 'waiting' && n ? 'var(--ad-tone-warn)' : 'var(--ad-tone-flat)', chipInk: t[0] === 'waiting' && n ? '#fff' : 'var(--ad-on-flat)', pick: function () { if (!on) self.setState({ ptab: t[0], ppage: 0, ra: self.state.ra + 1 }); } }; });
    var PP = Object.assign(this.pager('projects', list.length, s.pper, pp, function (k) { self.setState({ ppage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ pper: n, ppage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ pper: 20, ppage: 0, ra: self.state.ra + 1 }); } });
    var svcs = [{ t: 'All services', k: 'all' }].concat(SV.map(function (v) { return { t: v, k: v }; })).map(function (c) { var on = s.svc === c.k; return { t: c.t, n: all.filter(function (x) { return x.status !== 'done' && (c.k === 'all' || x.svc === c.k); }).length, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ svc: c.k, ppage: 0, ra: self.state.ra + 1, va: self.state.va + 1 }); } }; });
    var V = [['list', 'List', 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'], ['board', 'Board', 'M3 3h7v18H3zM14 3h7v10h-7z'], ['cal', 'Calendar', 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z']], vI = 0;
    V.forEach(function (v, i) { if (v[0] === s.view) vI = i; });
    var live = base.filter(function (x) { return x.status !== 'done'; });
    var colOf = function (x) { if (x.flag === 'Paused' || x.flag === 'Blocked' || x.cur === 0) return 0; if (x.status === 'waiting') return 2; if (x.stage === 'Handover' || x.stage === 'Report' || x.stage === 'Release') return 3; return 1; };
    var cols = [['Starting or blocked', 'var(--ad-tone-neutral)'], ['In progress', 'var(--ad-tone-live)'], ['With the client', 'var(--ad-tone-warn)'], ['Handover and reporting', 'var(--ad-tone-good)']].map(function (c, ci) {
      var cards = live.filter(function (x) { return colOf(x) === ci; }).map(function (x) { return Object.assign({}, x, { pct: pct(x), hasFlag: !!x.flag, flagTone: x.flag === 'New' ? 'var(--ad-tone-brand)' : (x.flag === 'With client' || x.flag.indexOf('Waiting') === 0 ? 'var(--ad-tone-warn)' : 'var(--ad-tone-bad)'), dueCol: x.dueHot ? 'var(--ad-accent-ink)' : 'var(--ad-dim)', aria: x.name + ' for ' + x.client, open: function () { self.openProject(x); } }); });
      return { t: c[0], tone: c[1], n: cards.length, cards: cards, empty: !cards.length };
    });
    var weeks = [
      { label: 'This week · 13 to 19 Oct', days: [['Mon', 13, [['lumen-tt', 'Print files due', 'deadline']]], ['Tue', 14, [['mira-br', 'Logo review with Adaeze, 15:30', 'meeting'], ['mira-so', 'Mira deposit due', 'money']]], ['Wed', 15, [['okafor-fl', 'Flyers revision due', 'deadline']]], ['Thu', 16, [['oak-web', 'Handover meeting, 14:00', 'meeting'], ['lumen-ads', 'Ad creatives round 2', 'deadline']]], ['Fri', 17, [['mira-br', 'Final files and brand guide', 'deadline']]], ['Sat', 18, []], ['Sun', 19, []]] },
      { label: 'Next week · 20 to 26 Oct', days: [['Mon', 20, [['halo-ai', 'Milestone 2 invoice', 'money']]], ['Tue', 21, []], ['Wed', 22, [['ade-menu', 'Menu directions review', 'meeting']]], ['Thu', 23, []], ['Fri', 24, [['ade-menu', 'Menu redesign due', 'deadline'], ['okafor-web', 'okaforlaw.ng renews', 'money']]], ['Sat', 25, []], ['Sun', 26, []]] }
    ];
    var K = { deadline: ['Deadline', 'var(--ad-tone-live)', I.clock], meeting: ['Meeting', 'var(--ad-tone-brand)', I.cal], money: ['Money', 'var(--ad-tone-good)', I.cash] };
    var byId = {}; all.forEach(function (x) { byId[x.id] = x; });
    var W = weeks[s.wk], days = W.days.map(function (d) { var items = d[2].filter(function (e) { var x = byId[e[0]]; return x && matchS(x) && matchQ(x); }).map(function (e) { var x = byId[e[0]], k = K[e[2]]; return { t: e[1], s: x.name + ' · ' + x.client, kind: k[0], tone: k[1], d: k[2], open: function () { self.openProject(x); } }; }); return { d: d[0], n: d[1], items: items, empty: !items.length, dcol: 'var(--ad-dim)', ncol: 'var(--ad-ink)' }; });

    var waiting = all.filter(function (x) { return x.status === 'waiting'; }), allLive = all.filter(function (x) { return x.status !== 'done'; });
    var dueWeek = 7;
    var stats = [
      { label: 'Live projects', raw: allLive.length, note: SV.map(function (v) { return allLive.filter(function (x) { return x.svc === v; }).length; }).filter(Boolean).length + ' services', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', sheet: S({ eyebrow: 'Projects', title: 'Live projects by service', chip: String(allLive.length), tone: 'var(--ad-tone-brand)', icon: I.folder, listTitle: 'By service', list: SV.map(function (v) { var n = allLive.filter(function (x) { return x.svc === v; }); return { t: v, s: n.length + ' live · ' + n.map(function (x) { return x.client; }).join(', ') }; }).filter(function (r) { return r.s.charAt(0) !== '0'; }), primary: 'Close' }) },
      { label: 'Waiting on clients', raw: waiting.length, note: 'oldest 9 days', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-warn)', sheet: S({ eyebrow: 'Waiting', title: 'Waiting on clients', chip: String(waiting.length), tone: 'var(--ad-tone-warn)', icon: I.clock, iconTone: 'var(--ad-tone-warn)', listTitle: 'Oldest first', list: waiting.map(function (x) { return { t: x.name + ' · ' + x.client, s: x.next, tag: x.flag, tone: 'var(--ad-tone-warn)', open: self.projectSheet(x) }; }), primary: 'Close' }) },
      { label: 'Due this week', raw: dueWeek, note: '2 meetings, 1 payment', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-2)', sheet: S({ eyebrow: 'This week', title: 'Due 13 to 19 Oct', icon: I.cal, listTitle: 'In order', list: weeks[0].days.reduce(function (a, d) { return a.concat(d[2].map(function (e) { return { t: d[0] + ' ' + d[1] + ' · ' + e[1], s: byId[e[0]].name + ' · ' + byId[e[0]].client, tag: K[e[2]][0], tone: K[e[2]][1] }; })); }, []), primary: 'Open the calendar', onPrimary: function () { self.setState({ view: 'cal', wk: 0, va: self.state.va + 1 }); } }) }
    ].map(function (k, i) { return Object.assign({}, k, { value: String(Math.round(k.raw * p)), delay: 'd' + (i + 1), aria: k.label + ': ' + k.raw + '. ' + k.note, open: function () { self.open(k.sheet); } }); });

    return Object.assign(this.kit(), this.extraVals(), {
      lede: allLive.length + ' live projects across ' + (SV.length) + ' services. ' + waiting.length + ' wait on clients.',
      stats: stats, svcs: svcs, viewI: vI, views: V.map(function (v) { var on = s.view === v[0]; return { t: v[1], d: v[2], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ view: v[0], va: self.state.va + 1 }); } }; }),
      isList: s.view === 'list', isBoard: s.view === 'board', isCal: s.view === 'cal', viewAnim: s.va % 2 ? 'kidIn' : 'kidIn2',
      tabs: tabs, rows: rows, PP: PP, empty: !list.length, emptyTitle: q ? 'No project matches "' + s.q2 + '".' : 'No projects here.', emptyBody: q ? 'Search by project, client or lead, or clear the service filter.' : (s.ptab === 'waiting' ? 'Nothing is waiting on a client in this service.' : 'Try another service or tab.'),
      clearFilters: function () { self.setState({ q2: '', svc: 'all', ppage: 0, ra: self.state.ra + 1 }); },
      cols: cols, wkLabel: W.label, days: days, wkPrev: function () { self.setState({ wk: 0, va: self.state.va + 1 }); }, wkNext: function () { self.setState({ wk: 1, va: self.state.va + 1 }); }, wkPrevDis: s.wk === 0, wkNextDis: s.wk === 1,
      q2: s.q2, hasQ2: !!s.q2, onQ2: function (e) { self.setState({ q2: e.target.value, ppage: 0, ra: self.state.ra + 1 }); }, clearQ2: function () { self.setState({ q2: '', ra: self.state.ra + 1 }); },
      newProject: function () { self.newProjectSheet(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 240, 180, 'More for projects'); }
    });
  }
