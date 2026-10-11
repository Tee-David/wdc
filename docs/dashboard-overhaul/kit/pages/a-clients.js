  /* ======================= Owner · Clients ======================= */
  pageState() { return { ctab: 'all', cpage: 0, cper: 5, q2: '', ra: 0, trashed: {}, converted: {}, added: [] }; }
  pageName() { return 'Clients'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'figures', title: 'Money and retainers at a glance', icon: I.chart, body: 'Tap a figure to see which clients make it up.' },
      { target: 'table', title: 'Every client in one table', icon: I.users, body: 'Tap anywhere on a row to open the client. The ⋮ menu has messaging, invoicing and Trash.', hint: 'Leads live in their own tab.' },
      { target: 'new', title: 'One record per client', icon: I.plus, body: 'New client checks the email and phone first. A returning client keeps one record and one portal.' },
      { target: 'search|searchS', title: 'Jump anywhere', icon: I.search, body: 'Press Ctrl K to find any client, project or invoice.' }
    ];
  }
  allClients() {
    var s = this.state, self = this;
    return s.added.concat(this.clientsData()).filter(function (c) { return !s.trashed[c.id]; }).map(function (c) { return s.converted[c.id] ? Object.assign({}, c, { status: 'active', since: 'Oct 2026', portal: 'Invite sent today', last: 'Converted from a lead', lastWhen: 'Just now' }) : c; });
  }
  temp(email) { var d = (email.split('@')[1] || '').toLowerCase(); return ['mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'sharklasers.com', 'trashmail.com'].indexOf(d) >= 0; }
  newClientSheet() {
    var self = this, I = this.icons();
    var digits = function (p) { return (p || '').replace(/\D/g, '').slice(-10); };
    var dup = function (f) {
      var e = (f.email || '').trim().toLowerCase(), p = digits(f.phone);
      return self.allClients().filter(function (c) { return (e && c.email.toLowerCase() === e) || (p.length >= 10 && digits(c.phone) === p); })[0];
    };
    this.open(this.sh({ eyebrow: 'New client', title: 'Add a client', icon: I.users, wide: false,
      body: 'We check the email and phone first. A returning client keeps one record and one portal, so their history stays in one place.',
      fields: [
        { key: 'name', label: 'Business name', ph: 'For example: Nkem Realty', wide: true },
        { key: 'contact', label: 'Main contact', ph: 'Full name' },
        { key: 'phone', label: 'Phone', ph: '+234 800 000 0000', mode: 'tel', type: 'tel' },
        { key: 'email', label: 'Email', ph: 'name@business.ng', mode: 'email', type: 'email', wide: true, hint: 'The portal invite goes here.', check: function (v) { v = v.trim(); if (!v) return ''; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Check the email address.'; if (self.temp(v)) return 'Temporary inboxes cannot receive a portal invite. Ask for a business or personal email.'; return ''; } }
      ],
      chipSets: [{ key: 'svc', label: 'What are they here for?', multi: true, opts: ['Brand identity', 'Website', 'Social media', 'SEO', 'Apps', 'Software & AI'], hint: 'Pick any. You can start the projects after saving.' }],
      notice: function (ctx) { var m = dup(ctx.form); if (!m) return null; return { tone: 'var(--ad-tone-warn)', icon: I.alert, title: m.name + ' already uses these details', body: m.contact + ' · ' + m.email + '. Open their record instead and start a new project there.', hasAct: true, actLabel: 'Open ' + m.name, act: function () { if (m.id === 'mira') window.location.href = 'A-Client.dc.html'; else self.open(self.clientSheet(m)); } }; },
      primary: 'Save and send portal invite', secondary: 'Cancel',
      primaryDis: function (ctx) {
        var f = ctx.form, e = (f.email || '').trim();
        if (dup(f)) return 'This client already exists. Open their record instead.';
        if (!(f.name || '').trim() || !(f.contact || '').trim()) return 'Add the business name and the main contact.';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return 'Add a valid email for the portal invite.';
        if (self.temp(e)) return 'Use a business or personal email, not a temporary inbox.';
        return '';
      },
      onPrimary: function (ctx) {
        var f = ctx.form, nm = f.name.trim(), ini = nm.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
        var c = { id: 'new' + Date.now(), name: nm, ini: ini, tone: '#000065', contact: f.contact.trim(), email: f.email.trim(), phone: (f.phone || '').trim() || 'Not given', services: f.svc && f.svc.length ? f.svc : ['Not set'], live: 0, owed: 0, late: 0, retainer: 0, since: 'Oct 2026', last: 'Client added, invite sent', lastWhen: 'Just now', status: 'active', portal: 'Invite sent today' };
        self.setState({ added: [c].concat(self.state.added), ctab: 'all', cpage: 0, q2: '', ra: self.state.ra + 1 });
        self.say('Saved. ' + c.contact.split(' ')[0] + ' gets a portal invite at ' + c.email + '.');
      } }));
  }
  rowMenu(c) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), lead = c.status === 'lead', out = [];
    out.push(it(c.id === 'mira' ? 'Open client page' : 'Open client', I.open, function () { if (c.id === 'mira') window.location.href = 'A-Client.dc.html'; else self.open(self.clientSheet(c)); }));
    out.push(it('Message ' + c.contact.split(' ')[0], I.msg, function () { self.open(self.sh({ eyebrow: 'Message', title: 'Message ' + c.contact, icon: I.msg, compose: true, composeLabel: 'Message', composePh: 'Write to ' + c.contact.split(' ')[0], vis: 'client', required: true, primary: 'Send', onPrimary: function (ctx) { self.say(ctx.vis === 'client' ? 'Sent to ' + c.contact.split(' ')[0] + '. They get an email and a portal notice.' : 'Saved as a team note on ' + c.name + '.'); } })); }));
    if (lead) out.push(it('Convert to client', I.users, function () { self.ask({ eyebrow: 'Convert', title: 'Make ' + c.name + ' a client?', body: c.contact + ' gets a portal invite by email and the lead history moves to their record.', ok: 'Convert and invite', icon: I.users, onOk: function () { var cv = Object.assign({}, self.state.converted); cv[c.id] = true; self.setState({ converted: cv, ra: self.state.ra + 1 }); self.say(c.name + ' is now a client. Invite sent to ' + c.email + '.'); } }); }));
    else out.push(it('New invoice', I.file, function () { window.location.href = 'A-Money.dc.html'; }, { hint: 'Money' }));
    out.push(this.menuSep());
    out.push(it('Move to Trash…', I.trash, function () {
      self.ask({ eyebrow: 'Trash', title: 'Move ' + c.name + ' to Trash?', body: c.owed ? c.name + ' still owes ' + self.ngn(c.owed) + '. Their invoices stay in Money and keep their numbers. You can restore the client from Settings, Trash, for 30 days.' : 'Their projects, files and invoices go with them. You can restore everything from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash,
        onOk: function () { var t = Object.assign({}, self.state.trashed); t[c.id] = true; self.setState({ trashed: t, ra: self.state.ra + 1 }); self.say(c.name + ' moved to Trash.', { undo: function () { var u = Object.assign({}, self.state.trashed); delete u[c.id]; self.setState({ trashed: u, ra: self.state.ra + 1 }); } }); } });
    }, { danger: true }));
    return out;
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (pop.kind === 'row') { var c = this.allClients().filter(function (x) { return x.id === pop.id; })[0]; return c ? this.rowMenu(c) : []; }
    if (pop.kind === 'chores') return [
      it('Export clients', I.down, function () { self.say('clients.csv downloaded with ' + self.allClients().length + ' clients.'); }, { hint: 'CSV' }),
      it('Import from a spreadsheet', I.upload, function () { self.open(self.sh({ eyebrow: 'Import', title: 'Import clients', icon: I.upload, body: 'Upload a CSV or Excel file with one client per row: business name, contact, email and phone. We match emails and phones against existing clients so nobody gets a second record, and show you every match before anything is saved.', checksTitle: 'Before you upload', checks: [{ t: 'One client per row', s: 'Headers in the first row' }, { t: 'Email or phone on every row', s: 'We use them to find duplicates' }], primary: 'Choose a file', onPrimary: function () { self.say('The file picker opens here. CSV or XLSX, up to 5 MB.'); } })); }),
      this.menuSep(),
      it('Open Trash', I.trash, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Settings' })
    ];
    return [];
  }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this);
    var all = this.allClients(), q = s.q2.trim().toLowerCase();
    var match = function (c) { return !q || (c.name + ' ' + c.contact + ' ' + c.email + ' ' + c.services.join(' ')).toLowerCase().indexOf(q) >= 0; };
    var inTab = function (c, t) { return t === 'all' || c.status === t; };
    var list = all.filter(function (c) { return inTab(c, s.ctab) && match(c); });
    var cp = Math.min(s.cpage, Math.max(0, Math.ceil(list.length / s.cper) - 1));
    var rows = list.slice(cp * s.cper, cp * s.cper + s.cper).map(function (c, i) {
      var open = function () { if (c.id === 'mira') { window.location.href = 'A-Client.dc.html'; return; } self.open(self.clientSheet(c)); };
      return { name: c.name, contact: c.contact, ini: c.ini, tone: c.tone, svc: c.services, liveTxt: c.status === 'lead' ? 'Lead' : String(c.live), isLate: c.late > 0, owedTxt: c.owed ? self.ngn(c.owed) : '—', owedCol: c.late ? 'var(--ad-bad-ink)' : 'var(--ad-ink)', last: c.last, lastWhen: c.lastWhen, anim: self.anim(s.ra), delay: (i * 0.035) + 's',
        aria: c.name + ', ' + c.contact + (c.owed ? ', owes ' + self.ngn(c.owed) : '') + '. Press Enter to open.', menuAria: 'Actions for ' + c.name,
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); },
        key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } },
        menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', c.id, 250, 230, 'Actions for ' + c.name); } };
    });
    var tabs = [['all', 'All'], ['active', 'Active'], ['lead', 'Leads'], ['past', 'Past']].map(function (tb) { var on = s.ctab === tb[0]; return { label: tb[1], n: all.filter(function (c) { return inTab(c, tb[0]) && match(c); }).length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ctab: tb[0], cpage: 0, ra: self.state.ra + 1 }); } }; });
    var CP = Object.assign(this.pager('clients', list.length, s.cper, cp, function (k) { self.setState({ cpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ cper: n, cpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ cper: 20, cpage: 0, ra: self.state.ra + 1 }); self.say('Showing ' + list.length + ' clients on one page.'); } });

    var active = all.filter(function (c) { return c.status === 'active'; }), leads = all.filter(function (c) { return c.status === 'lead'; });
    var owed = active.reduce(function (a, c) { return a + c.owed; }, 0), late = active.reduce(function (a, c) { return a + c.late; }, 0), ret = active.filter(function (c) { return c.retainer; });
    var retSum = ret.reduce(function (a, c) { return a + c.retainer; }, 0);
    var stats = [
      { label: 'Active clients', raw: active.length, note: leads.length + (leads.length === 1 ? ' lead waiting' : ' leads waiting'), noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-series-1)', sheet: S({ eyebrow: 'Clients', title: 'Active clients', chip: String(active.length), tone: 'var(--ad-tone-brand)', icon: I.users, listTitle: 'By live projects', list: active.slice().sort(function (a, b) { return b.live - a.live; }).map(function (c) { return { t: c.name, s: c.services.join(', ') + ' · ' + c.live + ' live', ini: c.ini, av: c.tone, open: c.id === 'mira' ? null : self.clientSheet(c) }; }), primary: 'Close' }) },
      { label: 'Outstanding', raw: owed, money: true, note: self.short(late) + ' late', noteCol: 'var(--ad-bad-ink)', dot: 'var(--ad-tone-bad)', sheet: S({ eyebrow: 'Money', title: 'Outstanding by client', chip: self.ngn(owed), tone: 'var(--ad-tone-warn)', icon: I.wallet, iconTone: 'var(--ad-tone-warn)', listTitle: 'Late first', list: active.filter(function (c) { return c.owed; }).sort(function (a, b) { return b.late - a.late || b.owed - a.owed; }).map(function (c) { return { t: c.name, s: self.ngn(c.owed) + (c.late ? ' · ' + self.ngn(c.late) + ' late' : ' · not due yet'), tag: c.late ? 'Late' : 'Due', tone: c.late ? 'var(--ad-tone-bad)' : 'var(--ad-tone-warn)', open: c.id === 'mira' ? null : self.clientSheet(c) }; }), note: 'Reminders and final notices are in Money.', primary: 'Open Money', onPrimary: function () { window.location.href = 'A-Money.dc.html'; } }) },
      { label: 'Retainers a month', raw: retSum, money: true, note: ret.length + ' retainers', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-2)', sheet: S({ eyebrow: 'Recurring', title: 'Retainers', chip: self.ngn(retSum) + ' a month', tone: 'var(--ad-tone-brand)', icon: I.cash, listTitle: 'Next bill 1 Nov', list: ret.map(function (c) { return { t: c.name, s: self.ngn(c.retainer) + ' · ' + c.services.join(', '), open: self.clientSheet(c) }; }), primary: 'Close' }) }
    ].map(function (k, i) { return Object.assign({}, k, { value: k.money ? self.short(k.raw * p) : String(Math.round(k.raw * p)), delay: 'd' + (i + 1), aria: k.label + ': ' + (k.money ? self.ngn(k.raw) : k.raw) + '. ' + k.note, open: function () { self.open(k.sheet); } }); });

    return Object.assign(this.kit(), this.extraVals(), {
      lede: active.length + ' active clients and ' + leads.length + ' leads. ' + self.ngn(owed) + ' outstanding, ' + self.ngn(late) + ' of it late.',
      stats: stats, total: all.length, tabs: tabs, rows: rows, CP: CP,
      q2: s.q2, hasQ2: !!s.q2, onQ2: function (e) { self.setState({ q2: e.target.value, cpage: 0, ra: self.state.ra + 1 }); }, clearQ2: function () { self.setState({ q2: '', ra: self.state.ra + 1 }); },
      empty: !list.length, emptyTitle: q ? 'No client matches "' + s.q2 + '".' : (s.ctab === 'lead' ? 'No open leads.' : 'Nothing here yet.'), emptyBody: q ? 'Search by business, contact, email or service, or look in another tab.' : (s.ctab === 'lead' ? 'New enquiries from the contact form land here.' : 'Clients you add appear here.'),
      newClient: function () { self.newClientSheet(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 240, 180, 'More for clients'); }
    });
  }
