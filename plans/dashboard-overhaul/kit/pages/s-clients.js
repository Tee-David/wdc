  /* ======================= Staff · Clients (the ones assigned to you) ======================= */
  pageState() { return { ctab: 'all', cpage: 0, cper: 5, q2: '', ra: 0, feedAdd: [] }; }
  pageName() { return 'Clients'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'Clients who need you', icon: I.target, body: 'A reply, an approval to send, a nudge. Act, snooze or hand it over, and the next card rises.', hint: 'Focus the card: D done, S snooze.' },
      { target: 'table', title: 'The clients assigned to you', icon: I.users, body: 'Tap a row to open the client. The ⋮ has messaging and the project page.', hint: 'You only see clients Admin assigned to you.' },
      { target: 'rail', title: 'Your clients at a glance', icon: I.chart, body: 'Who is waiting on you, and who you are waiting on.' },
      { target: 'new', title: 'Message a client', icon: I.msg, body: 'Messages go to the client’s portal and email, with Admin copied on anything about money.' }
    ];
  }
  navCounts() { return { Messages: { n: 2 } }; }
  allClients() { var self = this; return this.clientsData().filter(function (c) { return self.staffClientIds().indexOf(c.id) >= 0; }); }
  mineOf(c) { return ({ ade: [1, "Ade's Kitchen"], lumen: [1, 'Lumen Fitness'], mira: [1, 'Mira Skincare'] })[c.id] ? 1 : 0; }
  nextStep(c) {
    var T = { wait: ['Waiting on client', 'var(--ad-tone-warn)', '#fff'], ours: ['Your move', 'var(--ad-tone-live)', '#fff'], ok: ['On track', 'var(--ad-tone-flat)', 'var(--ad-on-flat)'] };
    var N = ({ ade: ['ours', 'Send the last six posts for approval', 'Due today'], lumen: ['ours', 'Reply about the ad budget', 'Asked 18 h ago'], mira: ['wait', 'Instagram access from Adaeze', 'Waiting 3 days'] })[c.id] || ['ok', 'Nothing due', ''];
    var t = T[N[0]]; return { tag: t[0], tone: t[1], ink: t[2], text: N[1], when: N[2] };
  }
  clientFacets(all, step) {
    var svc = []; all.forEach(function (c) { c.services.forEach(function (x) { if (svc.indexOf(x) < 0) svc.push(x); }); });
    return [{ k: 'next', t: 'Next step', opts: ['Your move', 'Waiting on client', 'On track'], get: function (c) { var t = step(c).tag; return t === 'Your move' || t === 'Waiting on client' ? t : 'On track'; } }, { k: 'svc', t: 'Service', opts: svc, get: function (c) { return c.services; } }];
  }
  clientBulk() {
    var self = this, I = this.icons();
    return [{ label: 'Message', icon: I.msg, fn: function (sel, done) { self.open(self.sh({ eyebrow: 'Message', title: 'Message ' + sel.length + (sel.length === 1 ? ' client' : ' clients'), icon: I.msg, compose: true, composeLabel: 'Message', composePh: 'Each person gets this in their portal and by email', required: true, body: sel.map(function (c) { return c.contact; }).join(', ') + '. Admin is copied on anything about money.', primary: 'Send to ' + sel.length, secondary: 'Cancel', onPrimary: function () { done(); self.say('Sending to ' + sel.length + ' in 8s', { delay: 8, pending: function (n) { return 'Sending to ' + sel.length + (sel.length === 1 ? ' client' : ' clients') + ' in ' + n + 's'; }, cancel: function () { }, cancelled: 'Cancelled. Nothing was sent.' }); } })); } }];
  }
  openClient(c) { var self = this, I = this.icons(), S = this.sh.bind(this), pk = { ade: 'ade-oct', lumen: 'lumen-ads', mira: 'mira-so' }[c.id]; this.open(S({ eyebrow: 'Client · assigned to you', title: c.name, icon: I.users, iconTone: c.tone, rows: [{ k: 'Contact', v: c.contact }, { k: 'Services', v: c.services.join(', ') }, { k: 'Client since', v: c.since }, { k: 'Portal', v: c.portal }], body: 'Anything about money goes through Admin, who sees the amounts. You see whether a deposit is in.', primary: 'Open the project', secondary: 'Message ' + c.contact.split(' ')[0], onPrimary: function () { window.location.href = 'S-Project.dc.html?p=' + pk; }, onSecondary: function () { window.location.href = 'S-Messages.dc.html'; return 'stay'; } })); }
  logFeed(i, tone, who, what, where) { this.setState({ feedAdd: [{ i: i, tone: tone, who: who, what: what, where: where, when: 'Just now' }].concat(this.state.feedAdd) }); }
  deck() {
    var self = this, I = this.icons(), S = this.sh.bind(this);
    var d1 = { id: 'lumen', kind: 'Reply', urgency: '18 h', utone: '#a16207', label: 'Lumen Fitness', dept: 'Social & Ads', title: 'Reply to Lumen about the ad budget', body: 'Daniel asked to lower the monthly ad spend. Admin is agreeing the options, so you can say what each budget still allows.', meta: [{ k: 'Contact', v: 'Daniel O.' }, { k: 'Range', v: '₦200,000 to ₦300,000' }, { k: 'Admin', v: 'Agreeing options' }], why: 'A quick answer on creatives keeps the November plan on schedule.',
      primaryLabel: 'Reply to Daniel', primaryFn: function () { self.open(S({ eyebrow: 'Lumen Fitness', title: 'Reply to Daniel', icon: I.msg, deckId: 'lumen', compose: true, composeLabel: 'Your reply', composePh: 'At ₦200,000 we would run two creatives instead of three…', required: true, vis: 'client', body: 'Admin is copied on anything about money. Daniel gets this in his portal and by email.', primary: 'Send reply', secondary: 'Cancel', onPrimary: function (ctx) { self.logFeed('CA', '#b84a00', 'You', 'replied to Daniel about the budget', 'Lumen Fitness'); self.clearId('lumen', 'done', '', 'Sent. Daniel gets it in the portal and by email, and Admin is copied.', { final: true }); } })); },
      secondaryLabel: 'Ask Admin first', secondaryFn: function () { self.open(S({ eyebrow: 'Admin', title: 'Ask Admin about the budget', icon: I.msg, deckId: 'lumen', compose: true, composeLabel: 'Your question', composePh: 'Which budget are we offering Daniel?', required: true, primary: 'Send to Admin', secondary: 'Cancel', onPrimary: function () { self.clearId('lumen', 'snooze', 'Tomorrow, 09:00', 'Sent to Admin. This card comes back tomorrow at 09:00.'); } })); },
      sheet: S({ eyebrow: 'Client', title: 'Lumen Fitness', icon: I.users, rows: [{ k: 'Contact', v: 'Daniel O.' }, { k: 'Project', v: 'Instagram ads' }], primary: 'Close' }) };
    var d2 = { id: 'ade', kind: 'Approvals', urgency: 'Due today', utone: '#a16207', label: 'Ade’s Kitchen', dept: 'Social & Ads', title: 'Send Ade the last six posts', body: 'October’s last six posts are drafted. Ade approves in about two hours on weekdays, so today keeps the plan on time.', meta: [{ k: 'Contact', v: 'Ade B.' }, { k: 'Posts', v: '6 drafted' }, { k: 'Approved so far', v: '18 of 24' }], why: 'Ade replies fastest to a one tap approval link.',
      primaryLabel: 'Send the six posts', delayed: { pending: function (n) { return 'Sending the posts to Ade in ' + n + 's'; }, done: 'Six posts sent to Ade with a one tap approval link.' }, secondaryLabel: 'Open the calendar', secondaryFn: function () { window.location.href = 'S-Project.dc.html?p=ade-oct'; },
      sheet: S({ eyebrow: 'Client', title: 'Ade’s Kitchen', icon: I.users, rows: [{ k: 'Contact', v: 'Ade B.' }, { k: 'Project', v: 'October content' }], primary: 'Close' }) };
    var d3 = { id: 'mira', kind: 'Waiting on client', urgency: '3 days', utone: '#5c5c7a', label: 'Mira Skincare', dept: 'Social & Ads', title: 'Nudge Adaeze about Instagram access', body: 'Without access you cannot schedule the launch posts or read insights. Asked on Wednesday, reminded on Friday.', meta: [{ k: 'Contact', v: 'Adaeze O.' }, { k: 'Asked', v: '3 days ago' }, { k: 'Blocks', v: 'Scheduling, insights' }], why: 'The two minute guide gets most clients through on the first try.',
      primaryLabel: 'Nudge Adaeze', delayed: { pending: function (n) { return 'Sending the nudge to Adaeze in ' + n + 's'; }, done: 'Nudge sent with the two minute access guide.' }, secondaryLabel: 'Open the guide', sToast: 'The access guide opens here.', keep: true,
      sheet: S({ eyebrow: 'Client', title: 'Mira Skincare', icon: I.users, rows: [{ k: 'Contact', v: 'Adaeze O.' }, { k: 'Project', v: 'Social media management' }], primary: 'Close' }) };
    return [d1, d2, d3];
  }
  clientFeed() { return this.state.feedAdd.concat([{ i: 'AK', tone: '#7a2e0e', who: 'Ade', what: 'approved the chef story post', where: "Ade's Kitchen", when: '8 min ago' }, { i: 'DO', tone: '#23239b', who: 'Daniel', what: 'asked to lower the ad budget', where: 'Lumen Fitness', when: '18 h ago' }, { i: 'AO', tone: '#1f4d3a', who: 'Adaeze', what: 'signed in to the portal', where: 'Mira Skincare', when: 'Tuesday' }, { i: 'AK', tone: '#7a2e0e', who: 'Ade', what: 'approved week one', where: "Ade's Kitchen", when: 'Wed 7 Oct' }]); }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (pop.kind === 'row') { var c = this.allClients().filter(function (x) { return x.id === pop.id; })[0]; var pk = { ade: 'ade-oct', lumen: 'lumen-ads', mira: 'mira-so' }[pop.id]; return c ? [it('Open client', I.open, function () { self.openClient(c); }), it('Open the project', I.folder, function () { window.location.href = 'S-Project.dc.html?p=' + pk; }), it('Message ' + c.contact.split(' ')[0], I.msg, function () { window.location.href = 'S-Messages.dc.html'; })] : []; }
    return [];
  }
  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this);
    var all = this.allClients(), q = s.q2.trim().toLowerCase();
    var dk = this.deck(), dv = this.deckView(dk), queue = dk.filter(function (d) { return !s.gone[d.id] && !s.snoozed[d.id]; });
    var match = function (c) { return !q || (c.name + ' ' + c.contact + ' ' + c.services.join(' ')).toLowerCase().indexOf(q) >= 0; };
    var step = function (c) { return self.nextStep(c); };
    var inTab = function (c, t) { return t === 'all' || (t === 'yours' ? step(c).tag === 'Your move' : step(c).tag === 'Waiting on client'); };
    var CF = this.clientFacets(all, step), list0 = all.filter(function (c) { return inTab(c, s.ctab) && match(c); }), list = this.applyFlt('sclients', list0, CF);
    var cp = Math.min(s.cpage, Math.max(0, Math.ceil(list.length / s.cper) - 1)), pageList = list.slice(cp * s.cper, cp * s.cper + s.cper);
    var rows = pageList.map(function (c, i) {
      var n = step(c);
      return { name: c.name, contact: c.contact, ini: c.ini, tone: c.tone, svc: c.services, nTag: n.tag, nTone: n.tone, nInk: n.ink, nText: n.text, nWhen: n.when, mine: String(self.mineOf(c)), anim: self.anim(s.ra), delay: (i * 0.035) + 's',
        aria: c.name + ', ' + c.contact + '. ' + n.tag + ': ' + n.text + '. Press Enter to open.', menuAria: 'Actions for ' + c.name, menuX: self.popOn('row', c.id),
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; self.openClient(c); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); self.openClient(c); } },
        menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', c.id, 250, 190, 'Actions for ' + c.name); } };
    });
    var tabs = [['all', 'All'], ['yours', 'Your move'], ['waiting', 'Waiting on client']].map(function (tb) { var on = s.ctab === tb[0]; return { label: tb[1], n: all.filter(function (c) { return inTab(c, tb[0]) && match(c); }).length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ctab: tb[0], cpage: 0, ra: self.state.ra + 1 }); } }; });
    rows.forEach(function (r, i) { Object.assign(r, self.rowSel('sclients', pageList[i].id, pageList[i].name)); });
    var TSC = this.toolsView('sclients', { noun: 'clients', one: 'client', pageIds: pageList.map(function (c) { return c.id; }), allIds: list.map(function (c) { return c.id; }), rowsById: function (ids) { return list.filter(function (c) { return ids.indexOf(c.id) >= 0; }); }, rows: list0, unfiltered: list0, facets: CF, acts: this.clientBulk(), exportFn: function (sel) { self.exportSheet({ noun: 'clients', file: 'my-clients', all: all, filtered: list, selected: sel, cols: [{ t: 'Business name', v: function (c) { return c.name; } }, { t: 'Main contact', v: function (c) { return c.contact; } }, { t: 'Email', v: function (c) { return c.email; } }, { t: 'Phone', v: function (c) { return c.phone; } }, { t: 'Services', v: function (c) { return c.services.join('; '); } }, { t: 'Next step', v: function (c) { return step(c).tag + ': ' + step(c).text; } }] }); } });
    var CP = Object.assign(this.pager('clients', list.length, s.cper, cp, function (k) { self.setState({ cpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ cper: n, cpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ cper: 20, cpage: 0, ra: self.state.ra + 1 }); self.say('Showing all ' + list.length + '.'); } });
    var yours = all.filter(function (c) { return step(c).tag === 'Your move'; }), wait = all.filter(function (c) { return step(c).tag === 'Waiting on client'; });
    var stats = [
      { label: 'Assigned to you', raw: all.length, note: 'Social & Ads', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', sheet: S({ eyebrow: 'Clients', title: 'Assigned to you', chip: String(all.length), tone: 'var(--ad-tone-brand)', icon: I.users, listTitle: 'Your clients', list: all.map(function (c) { return { t: c.name, s: c.contact + ' · ' + c.services.join(', '), ini: c.ini, av: c.tone }; }), primary: 'Close' }) },
      { label: 'Your move', raw: yours.length, note: yours.length ? 'Waiting on you' : 'Nothing waiting', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', sheet: S({ eyebrow: 'Clients', title: 'Waiting on you', icon: I.target, listTitle: 'Your move', list: yours.map(function (c) { return { t: c.name, s: step(c).text, tag: step(c).when, tone: 'var(--ad-tone-live)' }; }), primary: 'Close' }) },
      { label: 'Waiting on them', raw: wait.length, note: wait.length ? 'Oldest 3 days' : 'Nobody', noteCol: 'var(--ad-dim)', dot: 'var(--ad-tone-warn)', sheet: S({ eyebrow: 'Clients', title: 'Waiting on clients', icon: I.clock, listTitle: 'Their move', list: wait.map(function (c) { return { t: c.name, s: step(c).text, tag: step(c).when, tone: 'var(--ad-tone-warn)' }; }), primary: 'Close' }) },
      { label: 'Posts approved', raw: 18, note: 'Ade’s October, of 24', noteCol: 'var(--ad-tone-good)', dot: 'var(--ad-tone-good)', ic: I.check, sheet: S({ eyebrow: 'Posts', title: 'Approved posts', icon: I.check, rows: [{ k: 'Ade’s Kitchen', v: '18 of 24' }, { k: 'Mira Skincare', v: '0 of 5, with Adaeze' }], primary: 'Close' }) }
    ].map(function (k, i) { return Object.assign({}, k, self.statDeco(k), { value: String(Math.round(k.raw * p)), delay: 'd' + (i + 1), aria: k.label + ': ' + k.raw + '. ' + k.note, open: function () { self.open(k.sheet); } }); });
    var FD = this.clientFeed(), feed = FD.slice(0, 4).map(function (f) { var c = all.filter(function (x) { return x.name === f.where; })[0]; return Object.assign({}, f, { open: function () { if (c) self.openClient(c); } }); });
    var need = queue.length, hasFilter = !!q || s.ctab !== 'all' || TSC.hasFn;
    return Object.assign(this.kit(), this.extraVals(), dv, {
      ledeA: all.length + ' clients are assigned to you.', ledeB: need ? need + (need === 1 ? ' needs you today.' : ' need you today.') : 'Nobody is waiting on you.', ledeC: wait.length + (wait.length === 1 ? ' client is' : ' clients are') + ' slow to reply.',
      deckTitle: 'Clients needing you', deckKeys: 'Focus the card: D done, S snooze', snoozeLabel: 'Snooze', snoozeShort: 'Snooze', canPass: false,
      emptyTitle: 'Your clients are looked after.', emptyBody: 'Nobody is waiting on a reply from you. Next:', emptyNext: 'Ade’s chef story goes live Wed 14 Oct at 12:30.', emptyPrimaryLabel: 'Open Projects', emptySecondaryLabel: 'Bring everything back', emptyPrimary: function () { window.location.href = 'S-Projects.dc.html'; },
      total: all.length, tabs: tabs, rows: rows, TSC: TSC, CP: CP, q2: s.q2, hasQ2: !!s.q2, onQ2: function (e) { self.setState({ q2: e.target.value, cpage: 0, ra: self.state.ra + 1 }); }, clearQ2: function () { self.setState({ q2: '', ra: self.state.ra + 1 }); },
      hasFilter: hasFilter, noFilterEmpty: false, clearFilters: function () { self.setState({ q2: '', ctab: 'all', cpage: 0, flt: {}, ra: self.state.ra + 1 }); }, empty: !list.length, emptyTitleT: q ? 'No client matches "' + s.q2 + '".' : 'No clients in this view.', emptyBodyT: q ? 'Search by business, contact or service.' : 'Try another tab.',
      stats: stats, feed: feed, openFeed: function () { self.open(S({ eyebrow: 'Clients', title: 'Client activity', icon: I.clock, listTitle: 'Newest first', list: FD.map(function (f) { return { t: f.who + ' ' + f.what, s: f.where + ' · ' + f.when, ini: f.i, av: f.tone }; }), primary: 'Close' })); },
      newMsg: function () { window.location.href = 'S-Messages.dc.html'; }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 240, 120, 'More'); }
    });
  }
