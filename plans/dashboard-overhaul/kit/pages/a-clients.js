  /* ======================= Owner · Clients ======================= */
  /* The home's Focus idea applied to clients: a deck of relationship work first (leads to close, a client going cold, a request, a renewal, a win back), then the table, with the client pulse on the right. */
  pageState() { return { ctab: 'all', cpage: 0, cper: 5, q2: '', svc: 'all', ra: 0, trashed: {}, converted: {}, added: [], patch: {}, feedAdd: [] }; }
  pageName() { return 'Clients'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'Clients who need you, one at a time', icon: I.target, body: 'Leads to close, clients going quiet, requests and renewals. Act, snooze or hand it over, and the next card rises.', hint: 'Focus the card: D done, S snooze.' },
      { target: 'table', title: 'Every client in one table', icon: I.users, body: 'Tap a row to open the client. The ⋮ is its own button, with messaging, invoicing and Trash.', hint: 'Filter by service or status.' },
      { target: 'rail', title: 'The client pulse', icon: I.chart, body: 'Money owed, the pipeline and which services your clients use. Tap a service to filter the table.' },
      { target: 'new', title: 'One record per client', icon: I.plus, body: 'New client checks the email and phone first. A returning client keeps one record and one portal.' }
    ];
  }
  allClients() {
    var s = this.state;
    return s.added.concat(this.clientsData().filter(function (c) { return c.isNew; }), this.clientsData().filter(function (c) { return !c.isNew; })).filter(function (c) { return !s.trashed[c.id]; }).map(function (c) {
      var x = s.converted[c.id] ? Object.assign({}, c, { status: 'active', since: 'Oct 2026', portal: 'Invite sent today', last: 'Converted from a lead', lastWhen: 'Just now' }) : c;
      return s.patch[c.id] ? Object.assign({}, x, s.patch[c.id]) : x;
    });
  }
  patchClient(id, p) { var all = Object.assign({}, this.state.patch); all[id] = Object.assign({}, all[id] || {}, p); this.setState({ patch: all, ra: this.state.ra + 1 }); }
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
  clientFacets(FAM) {
    var self = this;
    return [{ k: 'status', t: 'Status', opts: ['Active', 'Lead', 'Past'], get: function (c) { return c.status === 'lead' ? 'Lead' : (c.status === 'past' ? 'Past' : 'Active'); } },
      { k: 'svc', t: 'Service', opts: FAM.map(function (f) { return f.k; }), get: function (c) { return FAM.filter(function (f) { return self.hasFamily(c, f.k); }).map(function (f) { return f.k; }); } },
      { k: 'owes', t: 'Money', opts: ['Overdue', 'Owes money', 'Nothing owed'], get: function (c) { return c.late ? 'Overdue' : (c.owed ? 'Owes money' : 'Nothing owed'); } },
      { k: 'ret', t: 'Retainer', opts: ['On a retainer', 'No retainer'], get: function (c) { return c.retainer ? 'On a retainer' : 'No retainer'; } },
      { k: 'portal', t: 'Portal', opts: ['Signed in', 'Not signed in yet'], get: function (c) { return /Never|No portal|Invite sent/.test(c.portal) ? 'Not signed in yet' : 'Signed in'; } }];
  }
  clientCols() {
    var self = this;
    return [{ t: 'Business name', v: function (c) { return c.name; } }, { t: 'Main contact', v: function (c) { return c.contact; } }, { t: 'Email', v: function (c) { return c.email; } }, { t: 'Phone', v: function (c) { return c.phone; } }, { t: 'Services', v: function (c) { return c.services.join('; '); } }, { t: 'Status', v: function (c) { return c.status === 'lead' ? 'Lead' : (c.status === 'past' ? 'Past' : 'Client'); } }, { t: 'Live projects', v: function (c) { return c.live; } }, { t: 'Outstanding (NGN)', v: function (c) { return c.owed; } }, { t: 'Overdue (NGN)', v: function (c) { return c.late; } }, { t: 'Retainer a month (NGN)', v: function (c) { return c.retainer; } }, { t: 'Client since', v: function (c) { return c.since || ''; } }, { t: 'Portal', v: function (c) { return c.portal; } }];
  }
  exportClients(selected, view) { this.exportSheet({ noun: 'clients', file: 'wdc-clients', cols: this.clientCols(), all: this.allClients(), filtered: view, selected: selected }); }
  importClients() {
    var self = this;
    this.importSheet(this.clientImportSpec(function () { return self.allClients(); }, function (made) { var all = self.shared('newClients', []); self.setShared('newClients', made.concat(all)); self.setState({ ctab: 'all', svc: 'all', cpage: 0, q2: '', ra: self.state.ra + 1 }); }));
  }
  clientBulk() {
    var self = this, I = this.icons();
    return [
      { label: 'Message', icon: I.msg, fn: function (sel, done) { self.open(self.sh({ eyebrow: 'Message', title: 'Message ' + sel.length + (sel.length === 1 ? ' client' : ' clients'), icon: I.msg, compose: true, composeLabel: 'Message', composePh: 'Each person gets this in their portal and by email', vis: 'client', required: true, body: sel.map(function (c) { return c.contact; }).join(', ') + '.', primary: 'Send to ' + sel.length, secondary: 'Cancel', onPrimary: function (ctx) { done(); self.say('Sending to ' + sel.length + ' in 8s', { delay: 8, pending: function (n) { return 'Sending to ' + sel.length + (sel.length === 1 ? ' client' : ' clients') + ' in ' + n + 's'; }, cancel: function () { }, cancelled: 'Cancelled. Nothing was sent.' }); } })); } },
      { label: 'Send portal invite', icon: I.mail, fn: function (sel, done) { var need = sel.filter(function (c) { return /Never|No portal|Invite sent/.test(c.portal); }); if (!need.length) { self.say('Everyone selected already signs in. No invites needed.'); return; } self.ask({ eyebrow: 'Portal', title: 'Send ' + need.length + (need.length === 1 ? ' portal invite?' : ' portal invites?'), body: need.map(function (c) { return c.contact; }).join(', ') + ' get a link to set a password. Clients who already sign in are left out.', to: need.map(function (c) { return c.email; }).join(', '), subject: 'Your WDC portal is ready', preview: 'Hello,\nYour client portal is ready. Approve work, pay invoices and message us in one place.', ok: 'Send invites', icon: I.mail, onOk: function () { done(); self.say('Sending ' + need.length + (need.length === 1 ? ' invite' : ' invites') + ' in 8s', { delay: 8, pending: function (n) { return 'Sending ' + need.length + ' invites in ' + n + 's'; }, cancel: function () { }, cancelled: 'Cancelled. Nothing was sent.' }); } }); } },
      { label: 'Move to Trash', icon: I.trash, danger: true, fn: function (sel, done) { self.ask({ eyebrow: 'Trash', title: 'Move ' + sel.length + (sel.length === 1 ? ' client' : ' clients') + ' to Trash?', body: 'Their projects, files and invoices go with them. Invoices keep their numbers. You can restore everything from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { var t = Object.assign({}, self.state.trashed); sel.forEach(function (c) { t[c.id] = true; }); self.setState({ trashed: t, ra: self.state.ra + 1 }); done(); self.say(sel.length + (sel.length === 1 ? ' client' : ' clients') + ' moved to Trash.', { undo: function () { var u = Object.assign({}, self.state.trashed); sel.forEach(function (c) { delete u[c.id]; }); self.setState({ trashed: u, ra: self.state.ra + 1 }); } }); } }); } }
    ];
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
      it('Enquiries and forms', I.inbox, function () { window.location.href = 'A-Forms.dc.html'; }, { hint: 'Entries, forms, links' }),
      it('Export clients', I.down, function () { self.exportClients([], self.allClients()); }, { hint: 'CSV or Excel' }),
      it('Import from a spreadsheet', I.upload, function () { self.importClients(); }, { hint: 'CSV or Excel' }),
      this.menuSep(),
      it('Open Trash', I.trash, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Settings' })
    ];
    return [];
  }

  /* Service families. Every project type has different needs, so the table and the rail group clients by the family of work, not the label on the quote. */
  families() {
    return [
      { k: 'Branding', d: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4' },
      { k: 'Social media', d: this.icons().mega },
      { k: 'SEO', d: this.icons().chart },
      { k: 'Websites', d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' },
      { k: 'Apps', d: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01' },
      { k: 'Software & AI', d: 'M9 9h6v6H9zM4 4h16v16H4zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3' }
    ];
  }
  familyOf(svc) { return ({ 'Brand identity': 'Branding', 'Brand guidelines': 'Branding', 'Social media': 'Social media', 'Social & Ads': 'Social media', 'SEO': 'SEO', 'Website': 'Websites', 'Event website': 'Websites', 'Domain': 'Websites', 'Driver app': 'Apps', 'Apps': 'Apps', 'Software & AI': 'Software & AI', 'Care plan': 'Software & AI' })[svc] || svc; }
  hasFamily(c, f) { var self = this; return f === 'all' || c.services.some(function (v) { return self.familyOf(v) === f; }); }
  /* What happens next with each client, and whose move it is. Routine is flat; only exceptions take a colour. */
  nextStep(c) {
    var T = { wait: ['Waiting on client', 'var(--ad-tone-warn)', '#fff'], late: ['Late', 'var(--ad-tone-bad)', '#fff'], ours: ['Your move', 'var(--ad-tone-live)', '#fff'], ok: ['On track', 'var(--ad-tone-flat)', 'var(--ad-on-flat)'], lead: ['Lead', 'var(--ad-tone-brand)', '#fff'], past: ['Past client', 'var(--ad-tone-flat)', 'var(--ad-on-flat)'], fresh: ['New', 'var(--ad-tone-brand)', '#fff'] };
    var N = ({
      mira: ['wait', 'Logo pick from Adaeze', 'Waiting 9 days'], kora: ['late', 'Payment of ₦850,000', '12 days late'], bloom: ['ok', 'October SEO report', 'Due 1 Nov'],
      ade: ['ok', 'November plan to Ade', 'Tue 27 Oct'], oak: ['ours', 'Book the recorded handover', 'Launched Thursday'], halo: ['ok', 'Milestone 2 demo', 'Sun 11 Oct, 10:00'],
      lumen: ['ours', 'Reply about the ad budget', 'Asked 18 h ago'], okafor: ['late', '₦90,000, then the domain renewal', 'Renews 24 Oct'], zara: ['lead', 'Discovery call', 'Today, 11:00'],
      nkem: ['lead', 'Decision on EST-2026-012', 'Opened 3 times'], pine: ['past', 'Brand identity handed over', 'July 2026']
    })[c.id] || (c.status === 'lead' ? ['lead', 'First call', 'Not booked'] : ['fresh', c.nextText || 'Start the first project', 'Added just now']);
    if (c.nextOverride) N = c.nextOverride;
    var t = T[N[0]]; return { tag: t[0], tone: t[1], ink: t[2], text: N[1], when: N[2] };
  }
  openClient(c) { if (c.id === 'mira') { window.location.href = 'A-Client.dc.html'; return; } this.open(this.clientSheet(c)); }
  /* A call is logged with its outcome, so the record shows what was said, not just that we rang. */
  callSheet(o) {
    var self = this, I = this.icons();
    return this.sh({ eyebrow: 'Call', title: 'Call ' + o.who, icon: I.phone, rows: [{ k: 'Phone', v: o.phone }, { k: 'About', v: o.about }], body: o.prep,
      chipSets: [{ key: 'out', label: 'How did it go?', opts: o.outcomes, hint: 'Pick one after the call. It is saved to ' + o.client + '’s activity.' }],
      fields: [{ key: 'note', label: 'Note for the record', ph: 'What was agreed', type: 'area', wide: true }],
      primary: 'Save the call', secondary: 'Not now', primaryDis: function (ctx) { return ctx.form.out ? '' : 'Pick how the call went to save it.'; },
      onPrimary: function (ctx) { o.onLog(ctx.form.out, (ctx.form.note || '').trim()); } });
  }
  logFeed(i, tone, who, what, where) { this.setState({ feedAdd: [{ i: i, tone: tone, who: who, what: what, where: where, when: 'Just now' }].concat(this.state.feedAdd) }); }
  lead(name) { return { name: name, whens: [['Today 16:00', 'today'], ['Tomorrow 09:00', 'tomorrow'], ['Wed 14 Oct', 'Wednesday'], ['Fri 16 Oct', 'Friday']], whos: [{ t: 'Me', i: 'BA', tone: '#000065' }, { t: 'Daniel', i: 'DE', tone: '#5c5c7a' }, { t: 'Funmi', i: 'FK', tone: '#15803d' }] }; }
  quote() { return { client: 'Zara Events', contact: 'Zara', to: 'Zara Bello · hello@zaraevents.ng', title: 'Event website', budget: [1500000, 2500000], lines: [{ t: 'Event website, design and build', s: 'Up to 6 pages, mobile first', price: 1200000, on: true }, { t: 'Ticketing page', s: 'Paystack or Flutterwave checkout', price: 350000, on: true }, { t: 'Extra page', s: 'Speakers, sponsors, gallery', price: 80000, unit: 'each', qty: 3, on: true, max: 10 }, { t: 'Hosting, first year', s: 'Our account, weekly backups', price: 120000, on: false }, { t: 'Business email, 3 inboxes', s: 'Free with a website we build', price: 0, on: true, max: 3 }, { t: 'Rush delivery before 30 Nov', s: 'Adds a second developer', price: 250000, on: false }] }; }
  clearId(id, how, label, msg, opt) { var it = this.deck().filter(function (d) { return d.id === id; })[0]; if (it && !this.state.gone[id] && !this.state.snoozed[id]) this.clear(it, how, label, msg, opt); else if (msg) this.say(msg); }
  snoozeTitle() { return 'Bring it back'; }
  snoozeItems() {
    var self = this, I = this.icons(), s = this.state, top = this.deck().filter(function (d) { return !s.gone[d.id] && !s.snoozed[d.id]; })[0]; if (!top) return [];
    return this.snoozeOptions().map(function (o) { return self.menuItem(o[0], I.clock, function () { self.clear(top, 'snooze', o[0] + ', ' + o[1], 'Snoozed. It comes back to this deck and to Today ' + o[0].toLowerCase().replace('in 1 hour', 'in an hour') + ', ' + o[1] + '.'); }, { hint: o[1] }); });
  }
  deck() {
    var self = this, I = this.icons(), S = this.sh.bind(this);
    return [
      { id: 'zara', kind: 'Lead', urgency: 'Call at 11:00', utone: '#a16207', label: 'Contact form', dept: 'Web & Apps', title: 'Get ready for the Zara Events call', body: 'An event website for three events a year, wanted by 30 November. Nobody owns this lead yet.', meta: [{ k: 'Budget', v: '₦1.5m to ₦2.5m' }, { k: 'Contact', v: 'Zara B.' }, { k: 'Where', v: 'Google Meet' }], why: 'Same day quotes won 11 of your last 20 leads. Draft it straight after the call.',
        primaryLabel: 'Prep the call', primaryFn: function () { self.open(S({ eyebrow: 'Discovery call', title: 'Zara Events · today 11:00', icon: I.cal, deckId: 'zara', rows: [{ k: 'Where', v: 'Google Meet, link in the invite' }, { k: 'Budget', v: '₦1.5m to ₦2.5m' }, { k: 'Wants it by', v: '30 Nov 2026' }], checksTitle: 'Ask on the call', checks: [{ t: 'Which three events, and their dates', s: 'Sets the launch order' }, { t: 'Tickets: Paystack or Flutterwave', s: 'We set it up, the money goes to them' }, { t: 'Who writes speaker and sponsor copy', s: 'Changes the timeline' }, { t: 'Domain and hosting', s: 'Their account or ours' }], body: '“We run three events a year and need one site for tickets, speakers and sponsors.” Zara, 9 Oct.', primary: 'Call done, draft the quote', onPrimary: function () { setTimeout(function () { self.openQuote(self.quote(), function (T) { self.clearId('zara', 'done', '', 'Quote EST-2026-014 for ' + self.ngn(T.total) + ' sent. We tell you when Zara opens it.', { final: true }); self.patchClient('zara', { qsent: true, last: 'Quote EST-2026-014 sent', lastWhen: 'Just now', nextOverride: ['lead', 'Decision on EST-2026-014', 'Sent just now'] }); self.logFeed('BA', '#000065', 'You', 'sent quote EST-2026-014', 'Zara Events'); }); }, 60); }, secondary: 'Close' })); },
        secondaryLabel: 'Draft quote now', secondaryFn: function () { self.openQuote(self.quote(), function (T) { self.clearId('zara', 'done', '', 'Quote EST-2026-014 for ' + self.ngn(T.total) + ' sent. We tell you when Zara opens it.', { final: true }); self.patchClient('zara', { qsent: true, last: 'Quote EST-2026-014 sent', lastWhen: 'Just now', nextOverride: ['lead', 'Decision on EST-2026-014', 'Sent just now'] }); }); },
        sheet: this.clientSheet(this.clientsData()[8]) },
      { id: 'nkem', kind: 'Lead', urgency: 'Opened 3 times', utone: '#5c5c7a', label: 'EST-2026-012', dept: 'Web & Apps', title: 'Nkem Realty keeps reopening the quote', body: 'Chidi opened the ₦1,350,000 website and SEO quote three times since Thursday and has not replied.', meta: [{ k: 'Contact', v: 'Chidi N.' }, { k: 'Quote', v: '₦1,350,000' }, { k: 'Expires', v: 'Sat 17 Oct' }], why: 'A reopened quote usually means one question is left. A short call answers it faster than email.',
        primaryLabel: 'Call Chidi', primaryFn: function () { self.open(Object.assign(self.callSheet({ who: 'Chidi N.', phone: '+234 810 772 0051', client: 'Nkem Realty', about: 'EST-2026-012 · Website and SEO', prep: 'He has looked at the price section most. Have the two payment plans ready: 50% now and 50% at launch, or three monthly parts.', outcomes: ['Accepting the quote', 'Has a question', 'Wants a lower price', 'No answer'],
          onLog: function (out, note) {
            if (out === 'Accepting the quote') { var cv = Object.assign({}, self.state.converted); cv.nkem = true; self.setState({ converted: cv }); self.patchClient('nkem', { last: 'Accepted EST-2026-012 on a call', nextOverride: ['ours', 'Send the deposit invoice', '50% of ₦1,350,000'] }); self.clearId('nkem', 'done', '', 'Nkem Realty is now a client. Chidi gets a portal invite and the deposit invoice next.', { final: true }); }
            else if (out === 'No answer') { self.patchClient('nkem', { last: 'Call, no answer', lastWhen: 'Just now' }); self.clearId('nkem', 'snooze', 'Tomorrow, 09:00', 'No answer logged. We bring Chidi back tomorrow at 09:00.'); }
            else { self.patchClient('nkem', { last: out + (note ? ': ' + note : ''), lastWhen: 'Just now', nextOverride: ['ours', out === 'Wants a lower price' ? 'Send a revised quote' : 'Answer his question', 'From today’s call'] }); self.clearId('nkem', 'done', '', 'Call saved to Nkem Realty. The next step is on their row.', { final: true }); }
            self.logFeed('BA', '#000065', 'You', 'called Chidi: ' + out.toLowerCase(), 'Nkem Realty');
          } }), { deckId: 'nkem' })); },
        secondaryLabel: 'Set follow up', secondaryFn: function () { self.openFollow(self.lead('Nkem Realty'), function (w, h, who) { self.clearId('nkem', 'snooze', w[0], 'Follow up set: ' + h + ', ' + (who.t === 'Me' ? 'you' : who.t) + ' calls Chidi.'); }); },
        sheet: this.clientSheet(this.clientsData()[9]) },
      { id: 'kora', kind: 'Going quiet', urgency: 'Never signed in', utone: '#c62828', label: 'Driver app', dept: 'Finance', title: 'Kora Logistics has gone quiet', body: 'Billing has not opened two reminders, Adebayo has never used the portal, and the driver app build is paused.', meta: [{ k: 'Late', v: '₦850,000' }, { k: 'Last reply', v: '22 Sep' }, { k: 'Lead', v: 'Daniel' }], why: 'Every reminder goes to billing@, which nobody may read. Adding Adebayo himself gives the next one a real reader.',
        primaryLabel: 'Add Adebayo as a contact', primaryFn: function () { self.open(S({ eyebrow: 'Kora Logistics', title: 'Add a contact', icon: I.users, deckId: 'kora', body: 'Invoices, reminders and approvals go to the people you tick here. billing@koralogistics.ng stays on the record.',
          fields: [{ key: 'name', label: 'Full name', ph: 'Adebayo Kolawole' }, { key: 'phone', label: 'Phone', ph: '+234 803 555 0142', type: 'tel', mode: 'tel' }, { key: 'email', label: 'Email', ph: 'name@koralogistics.ng', type: 'email', mode: 'email', wide: true, check: function (v) { v = v.trim(); if (!v) return ''; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Check the email address.'; if (self.temp(v)) return 'Temporary inboxes cannot receive invoices. Ask for a work email.'; return ''; } }],
          chipSets: [{ key: 'gets', label: 'They receive', multi: true, opts: ['Invoices and reminders', 'Approvals', 'Project updates'] }],
          primary: 'Save and send portal invite', secondary: 'Cancel',
          primaryDis: function (ctx) { var f = ctx.form, e = (f.email || '').trim(); if (!(f.name || '').trim()) return 'Add their name.'; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || self.temp(e)) return 'Add a work email they read.'; if (!f.gets || !f.gets.length) return 'Tick at least one thing they receive.'; return ''; },
          onPrimary: function (ctx) { var f = ctx.form, first = f.name.trim().split(' ')[0]; self.patchClient('kora', { contact: f.name.trim(), last: first + ' added as a contact', lastWhen: 'Just now' }); self.clearId('kora', 'done', '', 'Saved. ' + first + ' now gets ' + f.gets.map(function (g) { return g.toLowerCase(); }).join(' and ') + '. A portal invite is on its way.', { final: true }); self.logFeed('BA', '#000065', 'You', 'added ' + first + ' as a contact', 'Kora Logistics'); } })); },
        secondaryLabel: 'Call Adebayo', secondaryFn: function () { self.open(Object.assign(self.callSheet({ who: 'Adebayo K.', phone: '+234 803 555 0142', client: 'Kora Logistics', about: 'INV-26-4KQ8ZD · ₦850,000, 12 days late', prep: 'They paid the last two invoices within a day of a phone call. Ask who should receive invoices from now on.', outcomes: ['Paying today', 'Gave a date', 'Disputes the invoice', 'No answer'],
          onLog: function (out) { if (out === 'No answer') { self.clearId('kora', 'snooze', 'This afternoon, 15:00', 'No answer logged. Kora comes back at 15:00.'); return; } self.patchClient('kora', { last: 'Call: ' + out.toLowerCase(), lastWhen: 'Just now', nextOverride: out === 'Disputes the invoice' ? ['ours', 'Resolve the dispute', 'From today’s call'] : ['wait', 'Payment of ₦850,000', out] }); self.clearId('kora', 'done', '', 'Call saved to Kora Logistics: ' + out.toLowerCase() + '.', { final: true }); self.logFeed('BA', '#000065', 'You', 'called Adebayo: ' + out.toLowerCase(), 'Kora Logistics'); } }), { deckId: 'kora' })); },
        sheet: this.clientSheet(this.clientsData()[1]) },
      { id: 'lumen', kind: 'Request', urgency: '18 h ago', utone: '#a16207', label: 'Social & Ads', dept: 'Social & Ads', title: 'Lumen wants a smaller ad budget', body: 'Daniel asked to drop monthly ad spend from ₦300,000 to ₦200,000 from November.', meta: [{ k: 'Contact', v: 'Daniel O.' }, { k: 'Last month', v: '212 leads' }, { k: 'Lead', v: 'Chiamaka' }], why: 'Leads cost ₦1,415 each last month. Show him what ₦200,000 buys before agreeing.',
        primaryLabel: 'Reply with options', primaryFn: function () { self.open(S({ eyebrow: 'Lumen Fitness', title: 'Reply to Daniel', icon: I.msg, deckId: 'lumen', rows: [{ k: 'At ₦300,000', v: 'About 212 leads a month' }, { k: 'At ₦250,000', v: 'About 175 leads a month' }, { k: 'At ₦200,000', v: 'About 140 leads a month' }], chipSets: [{ key: 'rec', label: 'What do you recommend?', opts: ['Keep ₦300,000', 'Try ₦250,000 for a month', 'Drop to ₦200,000'] }], fields: [{ key: 'note', label: 'Add a line (optional)', ph: 'For example: the gym launch is in November', type: 'area', wide: true }], body: 'The figures above go in the reply, so Daniel sees what each budget buys.', primary: 'Send reply', secondary: 'Cancel', primaryDis: function (ctx) { return ctx.form.rec ? '' : 'Pick what you recommend.'; },
          onPrimary: function (ctx) { var r = ctx.form.rec; self.patchClient('lumen', { last: 'Budget options sent', lastWhen: 'Just now', nextOverride: ['wait', 'Daniel to pick a budget', 'Sent just now'] }); self.clearId('lumen', 'done', '', '', { delayed: { pending: function (n) { return 'Sending to Daniel in ' + n + 's'; }, done: 'Sent. Daniel sees all three budgets, with “' + r + '” recommended.' } }); } })); },
        secondaryLabel: 'Agree to ₦200,000', secondaryFn: function () { self.ask({ eyebrow: 'Ad budget', title: 'Drop Lumen to ₦200,000 a month?', body: 'The November invoice and every one after it is ₦200,000. Chiamaka is told and the campaign plan is cut to match.', ok: 'Agree to ₦200,000', icon: I.cash, tone: 'var(--ad-tone-warn)', onOk: function () { self.patchClient('lumen', { retainer: 200000, last: 'Ad budget lowered to ₦200,000', lastWhen: 'Just now', nextOverride: ['ok', 'November plan at ₦200,000', 'From 1 Nov'] }); self.clearId('lumen', 'done', '', 'Agreed. Lumen moves to ₦200,000 from November, and Chiamaka has the new plan.', { final: true }); self.logFeed('BA', '#000065', 'You', 'agreed a ₦200,000 ad budget', 'Lumen Fitness'); } }); },
        sheet: this.clientSheet(this.clientsData()[6]) },
      { id: 'halo', kind: 'Renewal', urgency: '21 days', utone: '#5c5c7a', label: 'Care plan', dept: 'Software & AI', title: 'Renew the Halo Clinics care plan', body: 'The monthly care plan ends on 1 November. Dr Kemi has used 14 of 20 support hours this term.', meta: [{ k: 'Plan', v: '₦500,000 a month' }, { k: 'Hours used', v: '14 of 20' }, { k: 'Ends', v: '1 Nov' }], why: 'Renewing before the end date means the clinic never loses a day of support.',
        primaryLabel: 'Send renewal', delayed: { pending: function (n) { return 'Sending the renewal to Dr Kemi in ' + n + 's'; }, done: 'Renewal sent. Dr Kemi can accept and pay from her portal.' },
        secondaryLabel: 'Change the plan', secondaryFn: function () { self.open(S({ eyebrow: 'Halo Clinics', title: 'Change the care plan', icon: I.gear, deckId: 'halo', listTitle: 'Plans', select: true, list: [{ t: 'Care 10', s: '10 support hours · ₦300,000 a month' }, { t: 'Care 20, current', s: '20 support hours · ₦500,000 a month' }, { t: 'Care 30', s: '30 support hours and a monthly review · ₦700,000 a month' }], body: 'Dr Kemi gets the new plan to accept in her portal. Nothing changes until she does.', primary: 'Send this plan', secondary: 'Cancel', primaryDis: function (ctx) { if (ctx.pick < 0) return 'Choose a plan.'; return ctx.pick === 1 ? 'That is the plan she has. Use Send renewal to keep it.' : ''; }, onPrimary: function (ctx) { var t = ['Care 10', 'Care 20', 'Care 30'][ctx.pick]; self.clearId('halo', 'done', '', t + ' sent to Dr Kemi to accept.', { final: true }); } })); },
        sheet: this.clientSheet(this.clientsData()[5]) },
      { id: 'pine', kind: 'Win back', urgency: '3 months', utone: '#5c5c7a', label: 'Past client', dept: 'Branding', title: 'Check in with Pinewood Bakery', body: 'Their brand identity was handed over in July. Bakeries usually need packaging and a menu site next.', meta: [{ k: 'Contact', v: 'Fola A.' }, { k: 'Last project', v: 'Brand identity' }, { k: 'Client since', v: 'Aug 2025' }], why: 'Past clients answer a personal note far more often than a newsletter.',
        primaryLabel: 'Send a check in', delayed: { pending: function (n) { return 'Sending your note to Fola in ' + n + 's'; }, done: 'Sent to Fola from your email, with a link to book a call.' },
        secondaryLabel: 'Not now', sToast: 'Removed from today. We suggest Pinewood again in 3 months.',
        sheet: this.clientSheet(this.clientsData()[10]) }
    ];
  }
  clientFeed() {
    return this.state.feedAdd.concat([
      { i: 'AB', tone: '#7a2e0e', who: 'Ade', what: 'approved the chef story post', where: "Ade's Kitchen", when: '8 min ago' },
      { i: 'NE', tone: '#15803d', who: 'Ngozi', what: 'opened the September SEO report', where: 'Bloom Pharmacy', when: '3 h ago' },
      { i: 'DO', tone: '#23239b', who: 'Daniel', what: 'asked to lower the ad budget', where: 'Lumen Fitness', when: '18 h ago' },
      { i: 'KS', tone: '#1f3a5c', who: 'Dr Kemi', what: 'booked the milestone 2 demo', where: 'Halo Clinics', when: 'Yesterday' },
      { i: 'CN', tone: '#a16207', who: 'Chidi', what: 'opened EST-2026-012 again', where: 'Nkem Realty', when: '2 days ago' },
      { i: 'AO', tone: '#1f4d3a', who: 'Adaeze', what: 'signed in to the portal', where: 'Mira Skincare', when: 'Tuesday' },
      { i: 'TA', tone: '#3d2a5c', who: 'Temi', what: 'closed the last launch check', where: 'Oak and Ivy Interiors', when: 'Thursday' }
    ]);
  }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this);
    var all = this.allClients(), q = s.q2.trim().toLowerCase(), FAM = this.families();
    var dk = this.deck(), dv = this.deckView(dk), queue = dk.filter(function (d) { return !s.gone[d.id] && !s.snoozed[d.id]; });

    var match = function (c) { return !q || (c.name + ' ' + c.contact + ' ' + c.email + ' ' + c.services.join(' ')).toLowerCase().indexOf(q) >= 0; };
    var inTab = function (c, t) { return t === 'all' || c.status === t; };
    var FACETS = this.clientFacets(FAM), list0 = all.filter(function (c) { return inTab(c, s.ctab) && self.hasFamily(c, s.svc) && match(c); }), list = this.applyFlt('clients', list0, FACETS);
    var cp = Math.min(s.cpage, Math.max(0, Math.ceil(list.length / s.cper) - 1)), pageList = list.slice(cp * s.cper, cp * s.cper + s.cper);
    var rows = pageList.map(function (c, i) {
      var n = self.nextStep(c);
      return { name: c.name, contact: c.contact, ini: c.ini, tone: c.tone, svc: c.services, nTag: n.tag, nTone: n.tone, nInk: n.ink, nText: n.text, nWhen: n.when,
        owedTxt: c.owed ? self.ngn(c.owed) : 'Nothing owed', owedCol: c.late ? 'var(--ad-bad-ink)' : (c.owed ? 'var(--ad-ink)' : 'var(--ad-dim)'), last: c.last, lastWhen: c.lastWhen, anim: self.anim(s.ra), delay: (i * 0.035) + 's',
        aria: c.name + ', ' + c.contact + '. ' + n.tag + ': ' + n.text + '. ' + (c.owed ? 'Owes ' + self.ngn(c.owed) + '. ' : '') + 'Press Enter to open.', menuAria: 'Actions for ' + c.name, menuX: self.popOn('row', c.id),
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; self.openClient(c); },
        key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); self.openClient(c); } },
        menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', c.id, 250, 230, 'Actions for ' + c.name); } };
    });
    rows.forEach(function (r, i) { Object.assign(r, self.rowSel('clients', pageList[i].id, pageList[i].name)); });
    var TCL = this.toolsView('clients', { noun: 'clients', one: 'client', pageIds: pageList.map(function (c) { return c.id; }), allIds: list.map(function (c) { return c.id; }), rowsById: function (ids) { return list.filter(function (c) { return ids.indexOf(c.id) >= 0; }); }, rows: list0, unfiltered: all, facets: FACETS, acts: this.clientBulk(), exportFn: function (sel) { self.exportClients(sel, list); }, importFn: function () { self.importClients(); } });
    var tabs = [['all', 'All'], ['active', 'Active'], ['lead', 'Leads'], ['past', 'Past']].map(function (tb) { var on = s.ctab === tb[0]; return { label: tb[1], n: all.filter(function (c) { return inTab(c, tb[0]) && self.hasFamily(c, s.svc) && match(c); }).length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ctab: tb[0], cpage: 0, ra: self.state.ra + 1 }); } }; });
    var pickSvc = function (k) { self.setState({ svc: k, cpage: 0, ra: self.state.ra + 1 }); };
    var svcs = [{ k: 'all', t: 'All services' }].concat(FAM.map(function (f) { return { k: f.k, t: f.k }; })).map(function (c) { var on = s.svc === c.k; return { t: c.t, n: all.filter(function (x) { return inTab(x, s.ctab) && self.hasFamily(x, c.k); }).length, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { pickSvc(c.k); } }; });
    var CP = Object.assign(this.pager('clients', list.length, s.cper, cp, function (k) { self.setState({ cpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ cper: n, cpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ cper: 20, cpage: 0, ra: self.state.ra + 1 }); self.say('Showing all ' + list.length + ' on one page.'); } });
    var hasFilter = !!q || s.svc !== 'all' || s.ctab !== 'all' || TCL.hasFn;

    var active = all.filter(function (c) { return c.status === 'active'; }), leads = all.filter(function (c) { return c.status === 'lead'; });
    var owed = active.reduce(function (a, c) { return a + c.owed; }, 0), late = active.reduce(function (a, c) { return a + c.late; }, 0), ret = active.filter(function (c) { return c.retainer; });
    var retSum = ret.reduce(function (a, c) { return a + c.retainer; }, 0);
    var signed = active.filter(function (c) { return /today|Tuesday|Thursday|yesterday|Oct/.test(c.portal) && !/Never/.test(c.portal); });
    var stats = [
      { label: 'Active clients', raw: active.length, note: leads.length + (leads.length === 1 ? ' lead open' : ' leads open'), noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-series-1)', sheet: S({ eyebrow: 'Clients', title: 'Active clients', chip: String(active.length), tone: 'var(--ad-tone-brand)', icon: I.users, listTitle: 'By live projects', list: active.slice().sort(function (a, b) { return b.live - a.live; }).map(function (c) { return { t: c.name, s: c.services.join(', ') + ' · ' + c.live + ' live', ini: c.ini, av: c.tone, open: c.id === 'mira' ? null : self.clientSheet(c) }; }), primary: 'Close' }) },
      { label: 'Outstanding', raw: owed, money: true, note: self.short(late) + ' late', noteCol: 'var(--ad-bad-ink)', dot: 'var(--ad-tone-bad)', sheet: S({ eyebrow: 'Money', title: 'Outstanding by client', chip: self.ngn(owed), tone: 'var(--ad-tone-warn)', icon: I.wallet, iconTone: 'var(--ad-tone-warn)', listTitle: 'Late first', list: active.filter(function (c) { return c.owed; }).sort(function (a, b) { return b.late - a.late || b.owed - a.owed; }).map(function (c) { return { t: c.name, s: self.ngn(c.owed) + (c.late ? ' · ' + self.ngn(c.late) + ' late' : ' · not due yet'), tag: c.late ? 'Late' : 'Due', tone: c.late ? 'var(--ad-tone-bad)' : 'var(--ad-tone-warn)', open: c.id === 'mira' ? null : self.clientSheet(c) }; }), note: 'Reminders and final notices are in Money.', primary: 'Open Money', onPrimary: function () { window.location.href = 'A-Money.dc.html'; } }) },
      { label: 'Retainers a month', raw: retSum, money: true, note: ret.length + ' retainers', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-2)', sheet: S({ eyebrow: 'Recurring', title: 'Retainers', chip: self.ngn(retSum) + ' a month', tone: 'var(--ad-tone-brand)', icon: I.cash, listTitle: 'Next bill 1 Nov', list: ret.map(function (c) { return { t: c.name, s: self.ngn(c.retainer) + ' · ' + c.services.join(', '), open: self.clientSheet(c) }; }), primary: 'Close' }) },
      { label: 'Using the portal', raw: signed.length, of: active.length, note: (active.length - signed.length) + ' not this month', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-good)', sheet: S({ eyebrow: 'Portal', title: 'Who uses the portal', chip: signed.length + ' of ' + active.length, tone: 'var(--ad-tone-good)', icon: I.home, listTitle: 'Not signed in this month', list: active.filter(function (c) { return signed.indexOf(c) < 0; }).map(function (c) { return { t: c.name, s: c.contact + ' · ' + c.portal, ini: c.ini, av: c.tone }; }), body: 'Clients who use the portal approve and pay faster. A fresh invite has a one tap sign in link.', primary: 'Resend invites', pToast: 'Fresh portal invites sent to ' + (active.length - signed.length) + ' clients.' }) }
    ].map(function (k, i) { return Object.assign({}, k, self.statDeco(k), { value: k.money ? self.short(k.raw * p) : (Math.round(k.raw * p) + (k.of ? ' of ' + k.of : '')), delay: 'd' + (i + 1), aria: k.label + ': ' + (k.money ? self.ngn(k.raw) : k.raw + (k.of ? ' of ' + k.of : '')) + '. ' + k.note, open: function () { self.open(k.sheet); } }); });

    var openLeads = all.filter(function (c) { return c.status === 'lead'; });
    var stageOf = function (c) { return c.qsent || c.id === 'nkem' ? 'quote' : 'call'; };
    var LV = { zara: [2500000, 'Zara Events · ₦1.5m to ₦2.5m budget', 'Zara Events · EST-2026-014 · ₦1,924,250'], nkem: [1350000, '', 'Nkem Realty · EST-2026-012 · ₦1,350,000'] };
    var inCall = openLeads.filter(function (c) { return stageOf(c) === 'call'; }), inQuote = openLeads.filter(function (c) { return stageOf(c) === 'quote'; });
    var won = ['Mira Skincare'].concat(['nkem', 'zara'].filter(function (id) { return s.converted[id]; }).map(function (id) { return id === 'nkem' ? 'Nkem Realty' : 'Zara Events'; }));
    var pipe = [
      { t: 'New enquiries', n: 0, s: 'The contact form is quiet today', bar: 'var(--ad-series-1)', items: [] },
      { t: 'Discovery call', n: inCall.length, s: inCall.length ? inCall.map(function (c) { return (LV[c.id] || [0, c.name])[1] || c.name; }).join(', ') : 'No calls booked', bar: 'var(--ad-series-1)', items: inCall },
      { t: 'Quote sent', n: inQuote.length, s: inQuote.length ? inQuote.map(function (c) { return (LV[c.id] || [0, '', c.name])[2]; }).join(', ') : 'No quotes waiting', bar: 'var(--ad-series-2)', items: inQuote },
      { t: 'Won in the last 90 days', n: won.length, s: won.join(', '), bar: 'var(--ad-tone-good)', items: [] }
    ];
    var pipeTotal = openLeads.reduce(function (a, c) { return a + ((LV[c.id] || [0])[0]); }, 0);
    var pmax = Math.max.apply(null, pipe.map(function (x) { return x.n; }).concat([1]));
    pipe = pipe.map(function (x) { return Object.assign({}, x, { pct: Math.round(x.n / pmax * 100), aria: x.t + ': ' + x.n + '. ' + x.s, open: function () { if (x.items.length === 1) { self.open(self.clientSheet(x.items[0])); return; } self.setState({ ctab: x.t === 'Won in the last 90 days' ? 'active' : 'lead', svc: 'all', cpage: 0, ra: self.state.ra + 1 }); self.say(x.t === 'Won in the last 90 days' ? 'Showing active clients.' : 'Showing leads in the table.'); } }); });

    var famN = FAM.map(function (f) { return all.filter(function (c) { return c.status !== 'past' && self.hasFamily(c, f.k); }).length; });
    var fmax = Math.max.apply(null, famN.concat([1]));
    var bySvc = FAM.map(function (f, i) { var on = s.svc === f.k; return { t: f.k, d: f.d, n: famN[i], pct: Math.round(famN[i] / fmax * 100), tone: 'var(--ad-tone-brand)', cls: on ? 'on' : '', pressed: on ? 'true' : 'false', aria: f.k + ': ' + famN[i] + ' clients. ' + (on ? 'Filtering the table. Press to show all.' : 'Press to filter the table.'), pick: function () { pickSvc(on ? 'all' : f.k); } }; });

    var FD = this.clientFeed();
    var feed = FD.slice(0, 4).map(function (f) { var c = all.filter(function (x) { return x.name === f.where; })[0]; return Object.assign({}, f, { open: function () { if (c) self.openClient(c); } }); });

    var need = queue.length;
    return Object.assign(this.kit(), this.extraVals(), dv, {
      ledeA: active.length + (active.length === 1 ? ' active client and ' : ' active clients and ') + leads.length + (leads.length === 1 ? ' lead.' : ' leads.'), ledeB: need ? need + (need === 1 ? ' needs you today.' : ' need you today.') : 'Nobody is waiting on you.', ledeC: self.ngn(owed) + ' outstanding.',
      deckTitle: 'Clients needing you', deckKeys: 'Focus the card: D done, S snooze', snoozeLabel: 'Snooze', snoozeShort: 'Snooze', canPass: true,
      emptyTitle: 'Every client is looked after.', emptyBody: 'Nobody is waiting on a reply from you. Next:', emptyNext: 'Discovery call with Zara Events at 11:00.', emptyPrimaryLabel: 'Add a client', emptySecondaryLabel: 'Bring everything back', emptyPrimary: function () { self.newClientSheet(); },
      total: all.length, tabs: tabs, svcs: svcs, rows: rows, CP: CP, TCL: TCL,
      q2: s.q2, hasQ2: !!s.q2, onQ2: function (e) { self.setState({ q2: e.target.value, cpage: 0, ra: self.state.ra + 1 }); }, clearQ2: function () { self.setState({ q2: '', ra: self.state.ra + 1 }); },
      hasFilter: hasFilter && !!all.length, noFilterEmpty: !all.length, clearFilters: function () { var f = Object.assign({}, self.state.flt); delete f.clients; self.setState({ q2: '', svc: 'all', ctab: 'all', cpage: 0, flt: f, ra: self.state.ra + 1 }); },
      empty: !list.length,
      emptyTitleT: !all.length ? 'No clients yet.' : (q ? 'No client matches "' + s.q2 + '".' : (s.ctab === 'lead' ? 'No open leads' + (s.svc !== 'all' ? ' for ' + s.svc : '') + '.' : 'No ' + (s.ctab === 'all' ? '' : s.ctab + ' ') + 'clients' + (s.svc !== 'all' ? ' for ' + s.svc : '') + '.')),
      emptyBodyT: !all.length ? 'Add your first client. They get a portal to approve work and pay.' : (q ? 'Search by business, contact, email or service.' : 'Try another service or status, or clear the filters.'),
      stats: stats, pipe: pipe, pipeValue: openLeads.length ? openLeads.length + ' open · up to ' + self.short(pipeTotal) : 'Nothing open', bySvc: bySvc, feed: feed,
      openFeed: function () { self.open(S({ eyebrow: 'Clients', title: 'Client activity', chip: FD.length + ' this week', tone: 'var(--ad-tone-brand)', icon: I.clock, listTitle: 'Newest first', list: FD.map(function (f) { return { t: f.who + ' ' + f.what, s: f.where + ' · ' + f.when, ini: f.i, av: f.tone }; }), primary: 'Close' })); },
      newClient: function () { self.newClientSheet(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 240, 180, 'More for clients'); }
    });
  }
