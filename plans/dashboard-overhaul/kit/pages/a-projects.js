  /* ======================= Owner · Projects ======================= */
  pageState() { return { bgroup: 'stage', drag: '', dover: -1, view: 'list', va: 0, svc: 'all', ptab: 'live', ppage: 0, pper: 5, q2: '', ra: 0, wk: 0, added: [], trashed: {}, leadOv: {} }; }
  pageName() { return 'Projects'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'figures', title: 'Where the work stands', icon: I.chart, body: 'Live projects, what waits on clients, and what is due this week. Tap a figure for the list.' },
      { target: 'views', title: 'List, board or calendar', icon: I.layers, body: 'The same projects three ways. Filter by service with the chips; tap any project to open it.', hint: 'The board scrolls sideways on a phone.' },
      !this.hideMoney() && { target: 'new', title: 'Start a project', icon: I.plus, body: 'Pick the client, the service and the lead. The stages come from the service, and the deposit invoice can go out straight away.' },
      { target: 'search|searchS', title: 'Jump anywhere', icon: I.search, body: 'Press Ctrl K to find any client, project or invoice.' }
    ].filter(Boolean);
  }
  allProjects() { var s = this.state, self = this; return s.added.concat(this.projectsData()).filter(function (p) { return !s.trashed[p.id] && self.projScope(p); }).map(function (p) { var o = s.leadOv[p.id] ? Object.assign({}, p, s.leadOv[p.id]) : p, ps = s.paused[p.id]; if (ps) return Object.assign({}, o, { flag: 'Paused', due: 'Paused', dueHot: true, next: ps.reason }); if (o.flag === 'Paused') return Object.assign({}, o, { flag: '', due: 'To be set', dueHot: false, next: 'Resumed. Set the next date' }); return o; }); }
  openProject(pj) { if (this.projPageKeys().indexOf(pj.id) >= 0) { window.location.href = this.projPageHref(pj.id); return; } this.open(this.projectSheet(pj)); }
  newProjectSheet() {
    var self = this, I = this.icons(), clients = this.clientsData().filter(function (c) { return c.status !== 'past'; });
    var stagesFor = { 'Brand identity': 'Discovery, Concepts, Review, Final files, Handover', 'Website': 'Discovery, Design, Build, Launch, Handover', 'Social media': 'Setup, Plan, Approve, Publish, Report', 'SEO': 'Audit, Fix, Content, Report', 'App': 'Discovery, Design, Build, Test, Release', 'Software & AI': 'Discovery, Design, Build, Test, Release' };
    this.shared('services', []).forEach(function (v) { stagesFor[v.n] = v.stages.join(', '); });
    this.open(this.sh({ eyebrow: 'New project', title: 'Start a project', icon: I.folder, wide: true,
      listTitle: 'Client', select: true, selectWhy: 'Choose the client.', searchPh: 'Search clients by name, contact or email', create: this.clientCreate('Add a new client'), list: clients.map(function (c) { return { t: c.name, s: c.contact + (c.status === 'lead' ? ' · lead, converts when the project starts' : ''), ini: c.ini, av: c.tone, ref: c, k: c.email + ' ' + c.phone }; }),
      chipSets: function (s) { return [{ key: 'svc', label: 'Service', opts: Object.keys(stagesFor), hint: s.form.svc ? 'Stages: ' + stagesFor[s.form.svc] + '.' : 'The stages come from the service.' }, { key: 'lead', label: 'Lead', opts: self.teamData().map(function (m) { return m.name; }) }, { key: 'start', label: 'Starts', opts: ['Tue 13 Oct', 'Tue 20 Oct', 'Sun 1 Nov'] }, { key: 'dep', label: 'Deposit', opts: ['Send the 50% deposit invoice now', 'Bill later'] }]; },
      fields: [{ key: 'name', label: 'Project name (optional)', ph: 'Defaults to the service', wide: true }, { key: 'value', label: 'Project value', ph: '₦0', mode: 'numeric', hint: 'Leave empty for a retainer you bill monthly.' }],
      form: { start: 'Tue 20 Oct', dep: 'Send the 50% deposit invoice now' },
      primary: function (ctx) { return ctx.form.dep === 'Bill later' ? 'Create project' : 'Create and send the deposit invoice'; }, secondary: 'Cancel',
      primaryDis: function (ctx) { if (ctx.pick < 0) return 'Choose the client.'; if (!ctx.form.svc) return 'Choose the service.'; if (!ctx.form.lead) return 'Choose who leads it.'; return ''; },
      onPrimary: function (ctx) {
        var c = ctx.item.ref, f = ctx.form, v = parseInt(String(f.value || '').replace(/\D/g, ''), 10) || 0, m = self.teamData().filter(function (x) { return x.name === f.lead; })[0];
        var st = stagesFor[f.svc].split(', ');
        var pj = { id: 'np' + Date.now(), name: (f.name || '').trim() || f.svc, client: c.name, cid: c.id, svc: f.svc === 'App' ? 'Apps' : (f.svc === 'Website' ? 'Web & Apps' : (f.svc === 'Social media' ? 'Social & Ads' : (f.svc === 'Brand identity' ? 'Branding & Design' : f.svc))), stages: st, cur: 0, stage: st[0], lead: m.name, leadI: m.i, leadTone: m.tone, due: 'Starts ' + f.start, dueHot: false, value: v ? self.ngn(v) : 'Monthly', pay: f.dep === 'Bill later' ? 'Not billed yet' : 'Deposit invoice sent', payTone: f.dep === 'Bill later' ? 'var(--ad-dim)' : 'var(--ad-tone-warn)', status: 'live', flag: 'New', next: st[0] + ' with ' + m.name.split(' ')[0] };
        self.landClient(c); self.setState({ added: [pj].concat(self.state.added), ptab: 'live', ppage: 0, svc: 'all', q2: '', view: 'list', ra: self.state.ra + 1 });
        self.say(f.dep === 'Bill later' ? 'Project started. It is on ' + m.name.split(' ')[0] + '’s My Day.' : 'Project started and the deposit invoice' + (v ? ' for ' + self.ngn(v / 2) : '') + ' went to ' + c.contact.split(' ')[0] + ' by email.');
      } }));
  }
  projectFacets(all) {
    var self = this, money = !this.hideMoney(), uniq = function (f) { var o = []; all.forEach(function (x) { var v = f(x); if (v && o.indexOf(v) < 0) o.push(v); }); return o; };
    var flagOf = function (x) { return !x.flag ? 'On track' : (x.flag.indexOf('Waiting') === 0 ? 'Waiting on client' : x.flag); };
    var out = [{ k: 'flag', t: 'Health', opts: ['On track', 'New', 'With client', 'Waiting on client', 'Blocked', 'Paused'], get: flagOf }, { k: 'lead', t: 'Lead', opts: uniq(function (x) { return x.lead; }), get: function (x) { return x.lead; } }, { k: 'client', t: 'Client', opts: uniq(function (x) { return x.client; }), get: function (x) { return x.client; } }, { k: 'stage', t: 'Stage', opts: uniq(function (x) { return x.stage; }), get: function (x) { return x.stage; } }, { k: 'due', t: 'Timing', opts: ['Due this week', 'Later', 'Recurring'], get: function (x) { return x.dueHot ? 'Due this week' : (/Monthly/.test(x.due) ? 'Recurring' : 'Later'); } }];
    if (money) out.push({ k: 'pay', t: 'Payment', opts: ['Paid', 'Deposit paid', 'Late', 'Retainer', 'Other'], get: function (x) { return /late/i.test(x.pay) ? 'Late' : (/Retainer/.test(x.pay) ? 'Retainer' : (/Deposit paid/.test(x.pay) ? 'Deposit paid' : (/^Paid/.test(x.pay) ? 'Paid' : 'Other'))); } });
    return out;
  }
  exportProjects(selected, view) {
    var money = !this.hideMoney(), cols = [{ t: 'Project', v: function (x) { return x.name; } }, { t: 'Client', v: function (x) { return x.client; } }, { t: 'Service', v: function (x) { return x.svc; } }, { t: 'Stage', v: function (x) { return x.stage; } }, { t: 'Step', v: function (x) { return x.stages.length > 1 ? (x.cur + 1) + ' of ' + x.stages.length : ''; } }, { t: 'Lead', v: function (x) { return x.lead; } }, { t: 'Due', v: function (x) { return x.due; } }, { t: 'Health', v: function (x) { return x.flag || 'On track'; } }, { t: 'Next step', v: function (x) { return x.next; } }];
    if (money) cols.push({ t: 'Value', v: function (x) { return x.value; } }, { t: 'Payment', v: function (x) { return x.pay; } });
    this.exportSheet({ noun: 'projects', file: 'wdc-projects', cols: cols, all: this.allProjects(), filtered: view, selected: selected });
  }
  projectBulk() {
    var self = this, I = this.icons(), out = [];
    out.push({ label: 'Hand over', icon: I.hand, fn: function (sel, done) {
      var team = self.teamData();
      self.open(self.sh({ eyebrow: 'Hand over', title: 'Hand over ' + sel.length + (sel.length === 1 ? ' project' : ' projects'), icon: I.hand, body: 'The new lead gets the projects on My Day and a message with the context. The client is told who to speak to.', listTitle: 'New lead', select: true, searchPh: 'Search the team', list: team.map(function (m) { return { t: m.name, s: m.dept + ' · ' + m.load, ini: m.i, av: m.tone, ref: m }; }), selectWhy: 'Choose who takes them.',
        primary: function (ctx) { return ctx.item ? 'Hand over to ' + ctx.item.ref.name.split(' ')[0] : 'Hand over'; }, secondary: 'Cancel',
        onPrimary: function (ctx) { var m = ctx.item.ref, o = Object.assign({}, self.state.leadOv); sel.forEach(function (x) { o[x.id] = { lead: m.name, leadI: m.i, leadTone: m.tone }; }); self.setState({ leadOv: o, ra: self.state.ra + 1 }); done(); self.say(sel.length + (sel.length === 1 ? ' project' : ' projects') + ' handed to ' + m.name.split(' ')[0] + '.', { undo: function () { var u = Object.assign({}, self.state.leadOv); sel.forEach(function (x) { delete u[x.id]; }); self.setState({ leadOv: u, ra: self.state.ra + 1 }); } }); } }));
    } });
    if (!this.hideMoney()) out.push({ label: 'Pause', icon: I.clock, fn: function (sel, done) {
      var live = sel.filter(function (x) { return !self.state.paused[x.id] && x.status !== 'done'; }); if (!live.length) { self.say('Nothing selected can be paused. Done and already paused projects are left alone.'); return; }
      self.ask({ eyebrow: 'Pause', title: 'Pause ' + live.length + (live.length === 1 ? ' project?' : ' projects?'), body: live.map(function (x) { return x.name + ' (' + x.client + ')'; }).join(', ') + '. Their tasks leave My Day, deadlines stop, and each client sees “Paused” with the reason below.', input: true, inputLabel: 'Reason the clients see', inputPh: 'For example: paused for the holiday break', ok: 'Pause ' + live.length, icon: I.clock, tone: 'var(--ad-tone-warn)',
        onOk: function (reason) { var p = Object.assign({}, self.state.paused); live.forEach(function (x) { p[x.id] = { reason: (reason || '').trim() || 'Paused by Admin', since: 'Sat 10 Oct', by: self.me().name }; }); self.setState({ paused: p, ra: self.state.ra + 1 }); self.setShared('paused', p); done(); self.say(live.length + ' paused. Each client is told.', { undo: function () { var u = Object.assign({}, self.state.paused); live.forEach(function (x) { delete u[x.id]; }); self.setState({ paused: u, ra: self.state.ra + 1 }); self.setShared('paused', u); } }); } });
    } }, { label: 'Resume', icon: I.play, fn: function (sel, done) {
      var ps = sel.filter(function (x) { return self.state.paused[x.id]; }); if (!ps.length) { self.say('None of these are paused.'); return; }
      self.ask({ eyebrow: 'Resume', title: 'Resume ' + ps.length + (ps.length === 1 ? ' project?' : ' projects?'), body: 'Tasks return to My Day, deadlines count down again, and each client is told.', ok: 'Resume ' + ps.length, green: true, icon: I.play, tone: 'var(--ad-tone-good)',
        onOk: function () { var u = Object.assign({}, self.state.paused); ps.forEach(function (x) { delete u[x.id]; }); self.setState({ paused: u, ra: self.state.ra + 1 }); self.setShared('paused', u); done(); self.say(ps.length + ' resumed.'); } });
    } });
    if (!this.hideMoney()) out.push({ label: 'Move to Trash', icon: I.trash, danger: true, fn: function (sel, done) {
      self.ask({ eyebrow: 'Trash', title: 'Move ' + sel.length + (sel.length === 1 ? ' project' : ' projects') + ' to Trash?', body: 'Tasks, files and content calendars go with them. Invoices stay in Money. Restore from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash,
        onOk: function () { var t = Object.assign({}, self.state.trashed); sel.forEach(function (x) { t[x.id] = true; }); self.setState({ trashed: t, ra: self.state.ra + 1 }); done(); self.say(sel.length + ' moved to Trash.', { undo: function () { var u = Object.assign({}, self.state.trashed); sel.forEach(function (x) { delete u[x.id]; }); self.setState({ trashed: u, ra: self.state.ra + 1 }); } }); } });
    } });
    return out;
  }
  boardCols() { return [['Starting or blocked', 'var(--ad-tone-neutral)', 'Setup, discovery or something in the way'], ['In progress', 'var(--ad-tone-live)', 'The team is working on it'], ['With the client', 'var(--ad-tone-warn)', 'Waiting on a reply, approval or payment'], ['Handover and reporting', 'var(--ad-tone-good)', 'Final stage'], ['Done', 'var(--ad-tone-flat)', 'Finished']]; }
  boardCol(x) { if (x.status === 'done') return 4; if (x.flag === 'Paused' || x.flag === 'Blocked' || (x.cur === 0 && x.stages.length > 1)) return 0; if (x.status === 'waiting') return 2; if (x.stage === 'Handover' || x.stage === 'Report' || x.stage === 'Release' || (x.stages.length > 1 && x.cur >= x.stages.length - 1)) return 3; return 1; }
  /* Moving a card changes the project for real: its stage, status and flag move with it, the Projects list agrees, and Undo puts it back. */
  moveProject(x, ci) {
    var self = this, I = this.icons(), BC = this.boardCols(), from = this.boardCol(x), L = x.stages.length;
    if (ci === from) return;
    if (x.flag === 'Paused' && ci !== 0) { this.say(x.name + ' is paused. Resume it from its menu first, then move it.'); return; }
    var prev = this.state.leadOv[x.id], patch = {};
    if (ci === 0) patch = { cur: 0, status: 'live', flag: x.flag === 'Waiting' ? '' : x.flag };
    else if (ci === 1) patch = { cur: Math.min(Math.max(1, x.cur), Math.max(1, L - 2)), status: 'live', flag: x.flag === 'Blocked' || x.flag === 'With client' || /^Waiting/.test(x.flag) ? '' : x.flag };
    else if (ci === 2) patch = { cur: Math.min(Math.max(1, x.cur), Math.max(1, L - 2)), status: 'waiting', flag: x.flag === 'Blocked' ? '' : (x.flag || 'With client') };
    else if (ci === 3) patch = { cur: Math.max(0, L - 1), status: 'live', flag: x.flag === 'Blocked' || x.flag === 'With client' || /^Waiting/.test(x.flag) ? '' : x.flag };
    else patch = { cur: L, status: 'done', flag: '' };
    if (L === 1) patch.cur = ci === 4 ? 1 : 0;
    patch.stage = patch.status === 'done' ? 'Done' : (x.stages[patch.cur] || x.stage);
    var apply = function () {
      var ov = Object.assign({}, self.state.leadOv); ov[x.id] = Object.assign({}, prev || {}, patch);
      self.setState({ leadOv: ov, ra: self.state.ra + 1 });
      self.say(x.name + ' moved to ' + BC[ci][0] + '.' + (ci === 3 ? ' Stage is now ' + patch.stage + '.' : ''), { undo: function () { var o2 = Object.assign({}, self.state.leadOv); if (prev) o2[x.id] = prev; else delete o2[x.id]; self.setState({ leadOv: o2, ra: self.state.ra + 1 }); } });
    };
    if (ci === 4) this.ask({ eyebrow: 'Mark done', title: 'Mark ' + x.name + ' done?', body: 'It moves to Done and its tasks leave My Day. Usually this happens after the recorded handover meeting. You can move it back.', ok: 'Mark done', icon: I.check, tone: 'var(--ad-tone-good)', onOk: apply });
    else apply();
  }
  rowMenu(pj) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), out = [it('Open', I.open, function () { self.openProject(pj); })];
    if (this.hideMoney()) { if (pj.status !== 'done') out.push(it('Add a task', I.task, function () { self.open(self.taskSheet(pj)); })); out.push(it('Message ' + pj.client, I.msg, function () { window.location.href = 'S-Messages.dc.html'; })); return out; }
    if (pj.status !== 'done') {
      out.push(it('Add a task', I.task, function () { self.open(self.taskSheet(pj)); }));
      out.push(self.state.paused[pj.id] ? it('Resume', I.play, function () { self.resumeProject(pj.id, pj.name, pj.client); }) : it('Pause…', I.clock, function () { self.pauseProject(pj.id, pj.name, pj.client); }));
    }
    out.push(this.menuSep());
    out.push(it('Move to Trash…', I.trash, function () { self.ask({ eyebrow: 'Trash', title: 'Move ' + pj.name + ' to Trash?', body: 'Tasks, files and the content calendar go with it. Invoices stay in Money. Restore it from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { var t = Object.assign({}, self.state.trashed); t[pj.id] = true; self.setState({ trashed: t, ra: self.state.ra + 1 }); self.say(pj.name + ' moved to Trash.', { undo: function () { var u = Object.assign({}, self.state.trashed); delete u[pj.id]; self.setState({ trashed: u, ra: self.state.ra + 1 }); } }); } }); }, { danger: true }));
    return out;
  }
  cardMenu(pop, I, it) {
    var self = this, mp = this.allProjects().filter(function (x) { return x.id === pop.id; })[0]; if (!mp) return []; var cur = this.boardCol(mp);
    var head = [it('Open details', I.eye || I.open, function () { self.open(self.projectSheet(mp)); }), it('Open project page', I.open, function () { self.openProject(mp); }), it('Copy link', I.link || I.open, function () { self.say('Link to ' + mp.name + ' copied.'); }), this.menuSep()];
    var moves = this.boardCols().map(function (c, ci) { return it('Move to ' + c[0].toLowerCase(), I.layers, function () { self.moveProject(mp, ci); }, { hint: ci === cur ? 'Now' : '', checked: ci === cur, on: ci === cur, role: 'menuitemradio' }); });
    var rest = this.rowMenu(mp).filter(function (x, i) { return i > 0; });
    return head.concat(moves, [this.menuSep()], rest);
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (pop.kind === 'move') { try { return this.cardMenu(pop, I, it); } catch (er) { console.log('cardMenu failed', er && er.message); return []; } }
    if (pop.kind === 'moveOld') { var mp = this.allProjects().filter(function (x) { return x.id === pop.id; })[0]; if (!mp) return []; var cur = this.boardCol(mp);
      var head = [it('Open details', I.eye || I.open, function () { self.open(self.projectSheet(mp)); }), it('Open project page', I.open, function () { self.openProject(mp); }), it('Copy link', I.link || I.open, function () { self.say('Link to ' + mp.name + ' copied.'); }), this.menuSep()];
      var moves = this.boardCols().map(function (c, ci) { return it('Move to ' + c[0].toLowerCase(), I.layers, function () { self.moveProject(mp, ci); }, { hint: ci === cur ? 'Now' : '', checked: ci === cur, on: ci === cur, role: 'menuitemradio' }); });
      var rest = this.rowMenu(mp).filter(function (x, i) { return i > 0; });
      return head.concat(moves, [this.menuSep()], rest); }
    if (pop.kind === 'row') { var pj = this.allProjects().filter(function (x) { return x.id === pop.id; })[0]; return pj ? this.rowMenu(pj) : []; }
    if (pop.kind === 'chores') return [it('Meetings', I.cal, function () { window.location.href = 'A-Meetings.dc.html'; }, { hint: 'Reviews and handovers' }), it('Export projects', I.down, function () { self.exportProjects([], self.allProjects()); }, { hint: 'CSV or Excel' }), it('Stage templates', I.layers, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Settings' }), this.menuSep(), it('Open Trash', I.trash, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Settings' })];
    return [];
  }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this);
    var all = this.allProjects(), q = s.q2.trim().toLowerCase();
    var SV = ['Branding & Design', 'Web & Apps', 'Social & Ads', 'SEO', 'Apps', 'Software & AI'].concat(this.shared('services', []).map(function (v) { return v.n; })).filter(function (v) { return !self.hideMoney() || all.some(function (x) { return x.svc === v; }); });
    var matchQ = function (x) { return !q || (x.name + ' ' + x.client + ' ' + x.lead).toLowerCase().indexOf(q) >= 0; };
    var matchS = function (x) { return s.svc === 'all' || x.svc === s.svc; };
    var inTab = function (x, t) { return t === 'live' ? x.status !== 'done' : (t === 'waiting' ? x.status === 'waiting' : x.status === 'done'); };
    var PF = this.projectFacets(all), base0 = all.filter(function (x) { return matchQ(x) && matchS(x); }), base = this.applyFlt('projects', base0, PF);
    var list = base.filter(function (x) { return inTab(x, s.ptab); });
    var pp = Math.min(s.ppage, Math.max(0, Math.ceil(list.length / s.pper) - 1));
    var pct = function (x) { return x.status === 'done' ? 100 : Math.round((x.cur + (x.stages.length > 1 ? 0.5 : 0.5)) / Math.max(1, x.stages.length) * 100); };
    var pageList = list.slice(pp * s.pper, pp * s.pper + s.pper);
    var rows = pageList.map(function (x, i) {
      var open = function () { self.openProject(x); };
      return Object.assign({}, x, { stage: x.flag && x.flag !== 'New' ? x.flag : x.stage, tone: x.flag === 'Paused' || x.flag === 'Blocked' ? 'var(--ad-tone-bad)' : (x.status === 'waiting' ? 'var(--ad-tone-warn)' : (x.status === 'done' ? 'var(--ad-tone-good)' : (x.flag === 'New' ? 'var(--ad-tone-brand)' : 'var(--ad-tone-flat)'))), ink: x.flag || x.status !== 'live' ? '#fff' : 'var(--ad-on-flat)', stepTxt: x.stages.length > 1 && x.status !== 'done' ? (x.cur + 1) + ' of ' + x.stages.length : '', pct: pct(x), dueCol: x.dueHot ? 'var(--ad-accent-ink)' : 'var(--ad-ink)', dueW: x.dueHot ? '700' : '400', payCol: x.payTone, value: self.hideMoney() ? self.payChip(x) : x.value, pay: self.hideMoney() ? '' : x.pay, anim: self.anim(s.ra), delay: (i * 0.035) + 's',
        aria: x.name + ' for ' + x.client + ', ' + x.stage + '. Press Enter to open.', menuAria: 'Actions for ' + x.name,
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } },
        menuX: self.popOn('row', x.id), menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', x.id, 240, 230, 'Actions for ' + x.name); } });
    });
    rows.forEach(function (r, i) { Object.assign(r, self.rowSel('projects', pageList[i].id, pageList[i].name)); });
    var TPR = this.toolsView('projects', { noun: 'projects', one: 'project', pageIds: pageList.map(function (x) { return x.id; }), allIds: list.map(function (x) { return x.id; }), rowsById: function (ids) { return list.filter(function (x) { return ids.indexOf(x.id) >= 0; }); }, rows: base0, unfiltered: base0, facets: PF, acts: this.projectBulk(), exportFn: function (sel) { self.exportProjects(sel, list); } });
    var tabs = [['live', 'Live'], ['waiting', 'Waiting on client'], ['done', 'Done']].map(function (t) { var on = s.ptab === t[0], n = base.filter(function (x) { return inTab(x, t[0]); }).length; return { label: t[1], n: n, cls: on ? 'on' : '', sel: on ? 'true' : 'false', chip: t[0] === 'waiting' && n ? 'var(--ad-tone-warn)' : 'var(--ad-tone-flat)', chipInk: t[0] === 'waiting' && n ? '#fff' : 'var(--ad-on-flat)', pick: function () { if (!on) self.setState({ ptab: t[0], ppage: 0, ra: self.state.ra + 1 }); } }; });
    var PP = Object.assign(this.pager('projects', list.length, s.pper, pp, function (k) { self.setState({ ppage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ pper: n, ppage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ pper: 20, ppage: 0, ra: self.state.ra + 1 }); } });
    var svcs = [{ t: 'All services', k: 'all' }].concat(SV.map(function (v) { return { t: v, k: v }; })).map(function (c) { var on = s.svc === c.k; return { t: c.t, n: all.filter(function (x) { return x.status !== 'done' && (c.k === 'all' || x.svc === c.k); }).length, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ svc: c.k, ppage: 0, ra: self.state.ra + 1, va: self.state.va + 1 }); } }; });
    var V = [['list', 'List', 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'], ['board', 'Board', 'M3 3h7v18H3zM14 3h7v10h-7z'], ['tl', 'Timeline', 'M3 6h10M7 12h14M5 18h9'], ['cal', 'Calendar', 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z']], vI = 0;
    V.forEach(function (v, i) { if (v[0] === s.view) vI = i; });
    var live = base.filter(function (x) { return x.status !== 'done'; });
    var colOf = function (x) { return self.boardCol(x); }, BC = this.boardCols();
    var G = s.bgroup || 'stage', team0 = this.teamData(), TONES = ['var(--cal-1)', 'var(--cal-2)', 'var(--cal-3)', 'var(--cal-5)', 'var(--cal-6)', 'var(--cal-7)'];
    var mkCard = function (x) {
      var hs = 0; for (var ci = 0; ci < x.id.length; ci++) hs += x.id.charCodeAt(ci);
      var crew = [{ i: x.leadI, tone: x.leadTone }].concat([team0[hs % team0.length], team0[(hs + 2) % team0.length]].filter(function (m) { return m && m.i !== x.leadI; }).slice(0, 2).map(function (m) { return { i: m.i, tone: m.tone }; }));
      var tot = 6 + (hs % 9), dn = x.status === 'done' ? tot : Math.min(tot - 1, Math.round(tot * pct(x) / 100));
      return Object.assign({}, x, { pct: pct(x), crew: crew, tasks: dn + '/' + tot, cmts: 1 + (hs % 6), files: hs % 7, desc: x.next || '', hasDesc: !!x.next, hasFlag: !!x.flag, flagTone: x.flag === 'New' ? 'var(--ad-tone-brand)' : (x.flag === 'With client' || x.flag.indexOf('Waiting') === 0 ? 'var(--ad-tone-warn)' : (x.flag === 'Done' ? 'var(--ad-tone-good)' : 'var(--ad-tone-bad)')), dueCol: x.dueHot ? 'var(--ad-accent-ink)' : 'var(--ad-dim)', aria: x.name + ' for ' + x.client + (G === 'stage' ? '. Drag to another column, or use its menu to move it.' : '.'), open: function () { self.open(self.projectSheet(x)); }, drag: G === 'stage' ? 'true' : 'false', dragging: s.drag === x.id ? 'dragging' : '',
        dragStart: function (e) { try { e.dataTransfer.setData('text/plain', x.id); e.dataTransfer.effectAllowed = 'move'; var el = e.currentTarget, g = el.cloneNode(true); g.className = 'bCardW bGhost'; g.style.width = el.offsetWidth + 'px'; document.body.appendChild(g); e.dataTransfer.setDragImage(g, 28, 24); setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 0); } catch (er) {} self.setState({ drag: x.id }); }, dragEnd: function () { self.setState({ drag: '', dover: -1 }); }, moveAria: 'Actions for ' + x.name, moveMenu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'move', x.id, 290, 420, 'Actions for ' + x.name); }, moveX: self.popOn('move', x.id), hasMove: G === 'stage' });
    };
    var board = base.filter(function (x) { return x.status !== 'done' || s.ptab === 'done' || true; });
    var gdefs, gof;
    if (G === 'service') { gdefs = SV.map(function (v, i) { return [v, TONES[i % 6], 'Projects in ' + v]; }); gof = function (x) { return Math.max(0, SV.indexOf(x.svc)); }; }
    else if (G === 'lead') { var leads = []; all.forEach(function (x) { if (leads.indexOf(x.lead) < 0) leads.push(x.lead); }); gdefs = leads.map(function (l, i) { return [l, TONES[i % 6], 'Projects led by ' + l]; }); gof = function (x) { return leads.indexOf(x.lead); }; }
    else { gdefs = BC; gof = colOf; }
    var cols = gdefs.map(function (c, ci) {
      var cards = board.filter(function (x) { return gof(x) === ci; }).map(mkCard);
      return { t: c[0], tone: c[1], n: cards.length, cards: cards, empty: !cards.length, hint: c[2], cls: s.dover === ci && G === 'stage' ? 'over' : '', addAria: 'Add a project to ' + c[0], add: function () { self.newProjectSheet(); }, hasAdd: !self.hideMoney(),
        over: function (e) { if (G !== 'stage') return; e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch (er) {} if (self.state.dover !== ci) self.setState({ dover: ci }); }, leave: function (e) { if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return; if (self.state.dover === ci) self.setState({ dover: -1 }); }, drop: function (e) { if (G !== 'stage') return; e.preventDefault(); var id = self.state.drag; try { id = id || e.dataTransfer.getData('text/plain'); } catch (er) {} var pj = self.allProjects().filter(function (z) { return z.id === id; })[0]; self.setState({ drag: '', dover: -1 }); if (pj) self.moveProject(pj, ci); } };
    });
    var GR = [['stage', 'Stage'], ['service', 'Service'], ['lead', 'Lead']], gI = 0; GR.forEach(function (g, i) { if (g[0] === G) gI = i; });
    var groups = GR.map(function (g) { var on = G === g[0]; return { t: g[1], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ bgroup: g[0], dover: -1, va: self.state.va + 1 }); } }; });
    var weeks = [
      { label: 'Next 7 days · 13 to 19 Oct', days: [['Tue', 13, [['lumen-tt', 'Print files due', 'deadline']]], ['Wed', 14, [['mira-br', 'Logo review with Adaeze, 15:30', 'meeting'], ['mira-so', 'Mira deposit due', 'money']]], ['Thu', 15, [['okafor-fl', 'Flyers revision due', 'deadline']]], ['Fri', 16, [['oak-web', 'Handover meeting, 14:00', 'meeting'], ['lumen-ads', 'Ad creatives round 2', 'deadline']]], ['Sat', 17, [['mira-br', 'Final files and brand guide', 'deadline']]], ['Sun', 18, []], ['Mon', 19, []]] },
      { label: 'The 7 days after · 20 to 26 Oct', days: [['Tue', 20, [['halo-ai', 'Milestone 2 invoice', 'money']]], ['Wed', 21, []], ['Thu', 22, [['ade-menu', 'Menu directions review', 'meeting']]], ['Fri', 23, []], ['Sat', 24, [['ade-menu', 'Menu redesign due', 'deadline'], ['okafor-web', 'okaforlaw.ng renews', 'money']]], ['Sun', 25, []], ['Mon', 26, []]] }
    ];
    var K = { deadline: ['Deadline', 'var(--ad-tone-live)', I.clock], meeting: ['Meeting', 'var(--ad-tone-brand)', I.cal], money: ['Money', 'var(--ad-tone-good)', I.cash] };
    var byId = {}; all.forEach(function (x) { byId[x.id] = x; });
    var W = weeks[s.wk], days = W.days.map(function (d) { var items = d[2].filter(function (e) { var x = byId[e[0]]; return x && matchS(x) && matchQ(x); }).map(function (e) { var x = byId[e[0]], k = K[e[2]]; return { t: e[1], s: x.name + ' · ' + x.client, kind: k[0], tone: k[1], d: k[2], open: function () { self.openProject(x); } }; }); return { d: d[0], n: d[1], items: items, empty: !items.length, dcol: 'var(--ad-dim)', ncol: 'var(--ad-ink)' }; });

    /* The calendar: deadlines, meetings and payments on the shared engine, with times, people and the line for now. */
    var addMin = function (t, m) { var a = t.split(':'), v = (+a[0]) * 60 + (+a[1]) + m; return ('0' + Math.floor(v / 60)).slice(-2) + ':' + ('0' + (v % 60)).slice(-2); };
    var seen = {}, cev = [], pushEv = function (pid, d, label, kind, start, end) { var x = byId[pid]; if (!x || !matchS(x) || !matchQ(x)) return; if (kind === 'money' && self.hideMoney()) return; var k = pid + d + kind + label; if (seen[k]) return; seen[k] = 1; cev.push({ id: k, date: d, start: start, end: end, title: label, sub: x.name + ' · ' + x.client, cal: kind, people: [{ i: x.leadI, tone: x.leadTone }], tag: [K[kind][0], K[kind][1], '#fff'], open: function () { self.openProject(x); } }); };
    weeks.forEach(function (w) { w.days.forEach(function (d) { d[2].forEach(function (e) { var m = /(\d\d:\d\d)/.exec(e[1]), st = m ? m[1] : (e[2] === 'money' ? '09:00' : '16:00'); pushEv(e[0], '10-' + d[1], e[1], e[2], st, addMin(st, e[2] === 'money' ? 30 : 60)); }); }); });
    pushEv('mira-br', '10-12', 'Review meeting 1', 'meeting', '10:00', '10:45'); pushEv('kora-app', '10-13', 'Review meeting 2', 'meeting', '14:00', '14:45');
    all.forEach(function (x) { var m = /(\d{1,2})\s+(Oct|Nov)/.exec(x.due || ''); if (m && x.status !== 'done') { var hs = 0; for (var ci = 0; ci < x.id.length; ci++) hs += x.id.charCodeAt(ci); var at = ['09:30', '11:00', '12:30', '14:00', '15:30', '16:30'][hs % 6]; pushEv(x.id, (m[2] === 'Oct' ? '10-' : '11-') + m[1], x.name + ' due', 'deadline', at, addMin(at, 60)); } });
    var CALP = this.calView('pcal', { today: '2026-10-12', now: '10:42', date: '2026-10-13', view: 'week', startHour: 8, endHour: 18, rowH: 80, addLabel: 'Book a meeting', listTitle: 'My calendars',
      cals: [{ id: 'meeting', label: 'Meetings', color: 'var(--cal-1)' }, { id: 'deadline', label: 'Deadlines', color: 'var(--cal-2)' }].concat(self.hideMoney() ? [] : [{ id: 'money', label: 'Payments due', color: 'var(--cal-3)' }]), events: cev,
      open: function (e) { e.open(); }, onAdd: function () { if (self.bookSheet) self.bookSheet('', true); else self.say('The booking sheet opens here.'); }, onSlot: function (d, t) { self.say('Book a meeting on ' + d + ' at ' + t + '. The booking sheet opens with this time chosen.'); },
      onExport: function () { self.say('Exporting the calendar as a file you can add to Google Calendar.'); } });
    /* The timeline: each live project as a bar from its start to its due date, filled to how far along it is. Nine weeks from Mon 5 Oct. */
    var DAYS = 63, tlWeeks = []; for (var wi = 0; wi < 9; wi++) { var wd = new Date(2026, 9, 5 + wi * 7); tlWeeks.push(wd.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][wd.getMonth()]); }
    var dayOf = function (mo, d) { return Math.round((new Date(2026, mo - 1, +d) - new Date(2026, 9, 5)) / 86400000); };
    var tlRows = board.filter(function (x) { return x.status !== 'done'; }).map(function (x) {
      var hs = 0; for (var ci = 0; ci < x.id.length; ci++) hs += x.id.charCodeAt(ci);
      var m = /(\d{1,2})\s+(Oct|Nov|Dec)/.exec(x.due || ''), st, en;
      if (m) { en = dayOf({ Oct: 10, Nov: 11, Dec: 12 }[m[2]], m[1]); st = /^Starts/.test(x.due) ? en : en - (14 + hs % 21); if (/^Starts/.test(x.due)) en = st + 28; }
      var has = m && en >= 0 && st < DAYS; st = has ? Math.max(0, st) : 0; en = has ? Math.min(DAYS, en) : 0;
      var color = x.flag === 'Paused' || x.flag === 'Blocked' ? 'var(--ad-tone-bad)' : (x.status === 'waiting' ? 'var(--ad-tone-warn)' : 'var(--ad-series-1)');
      return { name: x.name, client: x.client, hasBar: !!has, noBar: !has, none: x.flag === 'Paused' ? 'Paused, no date' : (/^Monthly/.test(x.due || '') ? 'Monthly retainer, no end date' : 'No date yet'), left: (st / DAYS * 100).toFixed(2), w: Math.max(4, (en - st) / DAYS * 100).toFixed(2), pct: pct(x), color: color, txt: x.stage + ' · ' + pct(x) + '%', aria: x.name + ', ' + x.stage + ', ' + pct(x) + ' percent, due ' + x.due, open: function () { self.open(self.projectSheet(x)); } };
    });
    var TLV = { weeks: tlWeeks, nWeeks: 9, today: (dayOf(10, 12) / DAYS).toFixed(4), rows: tlRows };
    var waiting = all.filter(function (x) { return x.status === 'waiting'; }), allLive = all.filter(function (x) { return x.status !== 'done'; });
    var dueWeek = weeks[0].days.reduce(function (a, d) { return a + d[2].filter(function (e) { return byId[e[0]]; }).length; }, 0), kinds = { meeting: 0, money: 0, deadline: 0 }; weeks[0].days.forEach(function (d) { d[2].forEach(function (e) { if (byId[e[0]]) kinds[e[2]]++; }); });
    var stats = [
      { label: 'Live projects', raw: allLive.length, note: SV.map(function (v) { return allLive.filter(function (x) { return x.svc === v; }).length; }).filter(Boolean).length + ' services', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', sheet: S({ eyebrow: 'Projects', title: 'Live projects by service', chip: String(allLive.length), tone: 'var(--ad-tone-brand)', icon: I.folder, listTitle: 'By service', list: SV.map(function (v) { var n = allLive.filter(function (x) { return x.svc === v; }); return { t: v, s: n.length + ' live · ' + n.map(function (x) { return x.client; }).join(', ') }; }).filter(function (r) { return r.s.charAt(0) !== '0'; }), primary: 'Close' }) },
      { label: 'Waiting on clients', raw: waiting.length, note: 'oldest 9 days', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-warn)', sheet: S({ eyebrow: 'Waiting', title: 'Waiting on clients', chip: String(waiting.length), tone: 'var(--ad-tone-warn)', icon: I.clock, iconTone: 'var(--ad-tone-warn)', listTitle: 'Oldest first', list: waiting.map(function (x) { return { t: x.name + ' · ' + x.client, s: x.next, tag: x.flag, tone: 'var(--ad-tone-warn)', open: self.projectSheet(x) }; }), primary: 'Close' }) },
      { label: 'Due next 7 days', raw: dueWeek, note: kinds.meeting + (kinds.meeting === 1 ? ' meeting' : ' meetings') + (self.hideMoney() ? ', ' + kinds.deadline + (kinds.deadline === 1 ? ' deadline' : ' deadlines') : ', ' + kinds.money + (kinds.money === 1 ? ' payment' : ' payments')), noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-2)', sheet: S({ eyebrow: 'This week', title: 'Due 13 to 19 Oct', icon: I.cal, listTitle: 'In order', list: weeks[0].days.reduce(function (a, d) { return a.concat(d[2].filter(function (e) { return byId[e[0]]; }).map(function (e) { return { t: d[0] + ' ' + d[1] + ' · ' + e[1], s: byId[e[0]].name + ' · ' + byId[e[0]].client, tag: K[e[2]][0], tone: K[e[2]][1] }; })); }, []), primary: 'Open the calendar', onPrimary: function () { self.setState({ view: 'cal', wk: 0, va: self.state.va + 1 }); } }) }
    ].map(function (k, i) { return Object.assign({}, k, self.statDeco(k), { value: String(Math.round(k.raw * p)), delay: 'd' + (i + 1), aria: k.label + ': ' + k.raw + '. ' + k.note, open: function () { self.open(k.sheet); } }); });

    return Object.assign(this.kit(), this.extraVals(), {
      lede: allLive.length + (allLive.length === 1 ? ' live project' : ' live projects') + (self.hideMoney() ? ' in your departments. ' : ' across ' + SV.length + ' services. ') + waiting.length + (waiting.length === 1 ? ' waits' : ' wait') + ' on clients.', canNew: !self.hideMoney(), valueHead: self.hideMoney() ? 'Billing' : 'Payment',
      stats: stats, svcs: svcs, svcSel: self.chipsAsPick('svc', 'Service', svcs), viewI: vI, views: V.map(function (v) { var on = s.view === v[0]; return { t: v[1], d: v[2], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ view: v[0], va: self.state.va + 1 }); } }; }),
      isList: s.view === 'list', isBoard: s.view === 'board', isTl: s.view === 'tl', tl: TLV, isCal: s.view === 'cal', viewAnim: s.va % 2 ? 'kidIn' : 'kidIn2',
      tabs: tabs, rows: rows, PP: PP, TPR: TPR, empty: !list.length, emptyTitle: q ? 'No project matches "' + s.q2 + '".' : 'No projects here.', emptyBody: q ? 'Search by project, client or lead, or clear the service filter.' : (s.ptab === 'waiting' ? 'Nothing is waiting on a client in this service.' : 'Try another service or tab.'),
      clearFilters: function () { self.setState({ q2: '', svc: 'all', ppage: 0, ra: self.state.ra + 1 }); },
      CALP: CALP, groups: groups, groupI: gI, boardCount: board.length + (board.length === 1 ? ' project' : ' projects'), boardTip: G === 'stage' ? 'Drag a card to move it to another stage.' : 'Switch to Stage to drag projects between columns.', cols: cols, wkLabel: W.label, days: days, wkPrev: function () { self.setState({ wk: 0, va: self.state.va + 1 }); }, wkNext: function () { self.setState({ wk: 1, va: self.state.va + 1 }); }, wkPrevDis: s.wk === 0, wkNextDis: s.wk === 1,
      q2: s.q2, hasQ2: !!s.q2, onQ2: function (e) { self.setState({ q2: e.target.value, ppage: 0, ra: self.state.ra + 1 }); }, clearQ2: function () { self.setState({ q2: '', ra: self.state.ra + 1 }); },
      newProject: function () { self.newProjectSheet(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 240, 180, 'More for projects'); }
    });
  }
