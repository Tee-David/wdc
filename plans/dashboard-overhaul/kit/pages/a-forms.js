  /* ======================= Owner · Forms and enquiries ======================= */
  pageName() { return 'Clients'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'Enquiries waiting for you', icon: I.target, body: 'The newest entries that nobody has answered. Reply, assign to a client or mark as spam.', hint: 'Focus the card: D done, S snooze.' },
      { target: 'table', title: 'Entries, forms and links', icon: I.inbox, body: 'Entries are what people sent. Forms are the pages that collect them. Links are pre-filled forms you send to a client.', hint: 'Tap a row to open it.' },
      { target: 'rail', title: 'How the forms are doing', icon: I.chart, body: 'Entries and replies for the last 30 days, and the form that brings the most work.' },
      { target: 'new', title: 'Pre-filled link', icon: I.link, body: 'Pick an existing client or add one. A returning client keeps one record and one portal, never a second one.' }
    ];
  }
  fmForms() {
    return this.hubApply('form', [
      { id: 'f1', name: 'Contact', sub: 'The form on /contact', where: '/contact', on: true, n: 21, conv: 38 },
      { id: 'f2', name: 'Onboarding, brand identity', sub: 'Eleven questions about the brand', where: '/start/brand', on: true, n: 6, conv: 67 },
      { id: 'f3', name: 'Onboarding, website', sub: 'Pages, content and payments', where: '/start/website', on: true, n: 4, conv: 75 },
      { id: 'f4', name: 'Quote request', sub: 'A short form from the services pages', where: '/services', on: true, n: 12, conv: 42 },
      { id: 'f5', name: 'Newsletter signup', sub: 'One field in the footer', where: 'Footer', on: false, n: 0, conv: 0 }
    ]);
  }
  fmEntries() {
    return this.hubApply('ent', [
      { id: 'e1', name: 'Temi Adeoye', sub: 'Contact · “We need a site for our estate agency…”', form: 'Contact', status: 'New', client: '', recv: 'Today, 08:12', email: 'temi@oakandivy.ng' },
      { id: 'e2', name: 'Ifeoma Eze', sub: 'Quote request · Social media management', form: 'Quote request', status: 'New', client: '', recv: 'Today, 07:40', email: 'ifeoma@lumenads.com' },
      { id: 'e3', name: 'Mira Skincare', sub: 'Onboarding, brand identity · Logo and guide', form: 'Onboarding, brand identity', status: 'Assigned', client: 'Mira Skincare', recv: 'Fri 9 Oct', email: 'adaeze@miraskincare.ng' },
      { id: 'e4', name: 'Tunde Bakare', sub: 'Contact · “Can you redo our menu design?”', form: 'Contact', status: 'Replied', client: 'Zara Events', recv: 'Thu 8 Oct', email: 'tunde@zaraevents.ng' },
      { id: 'e5', name: 'seo-offers@cheapranks.top', sub: 'Contact · “Rank first on Google in 24 hours”', form: 'Contact', status: 'Spam', client: '', recv: 'Wed 7 Oct', email: 'seo-offers@cheapranks.top' },
      { id: 'e6', name: 'Bola Shittu', sub: 'Onboarding, website · Pages and payments', form: 'Onboarding, website', status: 'Assigned', client: 'Bloom SEO', recv: 'Mon 5 Oct', email: 'bola@bloomseo.ng' }
    ]);
  }
  fmLinks() {
    return this.hubApply('lnk', [
      { id: 'l1', name: 'Halo AI', sub: 'Onboarding, website · created Mon 5 Oct', form: 'Onboarding, website', state: 'Opened', when: 'Mon 5 Oct' },
      { id: 'l2', name: 'Lumen Ads', sub: 'Onboarding, brand identity · created Sat 3 Oct', form: 'Onboarding, brand identity', state: 'Not opened', when: 'Sat 3 Oct' },
      { id: 'l3', name: 'Oak and Ivy Interiors', sub: 'Quote request · created Thu 1 Oct', form: 'Quote request', state: 'Completed', when: 'Thu 1 Oct' }
    ]);
  }
  fmTone(st) { return { New: ['var(--ad-tone-live)', '#fff'], Assigned: ['var(--ad-tone-brand)', '#fff'], Replied: ['var(--ad-tone-good)', '#fff'], Spam: ['var(--ad-tone-flat)', 'var(--ad-on-flat)'], Opened: ['var(--ad-tone-brand)', '#fff'], 'Not opened': ['var(--ad-tone-warn)', '#fff'], Completed: ['var(--ad-tone-good)', '#fff'] }[st] || ['var(--ad-tone-flat)', 'var(--ad-on-flat)']; }
  entryAssign(e) {
    var self = this, I = this.icons(), cs = this.clientsData();
    this.open(this.sh({ eyebrow: 'Assign', title: 'Which client is this?', icon: I.users, body: 'Search first. A returning client keeps one record and one portal, matched by email or phone.', listTitle: 'Clients and leads', select: true, searchPh: 'Search clients by name, contact or email', create: this.clientCreate('Add a new client'), list: cs.map(function (c) { return { t: c.name, s: c.contact + ' · ' + c.email, ini: c.ini, av: c.tone, ref: c, k: c.phone, hit: c.email && e.email && c.email.toLowerCase() === e.email.toLowerCase() }; }), selectWhy: 'Choose the client.',
      primary: 'Assign entry', secondary: 'Cancel', primaryDis: function (ctx) { return ctx.pick < 0 ? 'Choose the client.' : ''; },
      onPrimary: function (ctx) { var c = ctx.item && ctx.item.ref; if (!c) return; self.hubPatch(e.id, { status: 'Assigned', client: c.name }); self.say('Updated. The entry is assigned to ' + c.name + '.'); } }), true);
  }
  entrySheet(e) {
    var self = this, I = this.icons(), t = this.fmTone(e.status), spam = e.status === 'Spam';
    return this.sh({ eyebrow: e.form + ' · ' + e.status, title: e.name, chip: e.status, tone: t[0], icon: I.inbox, iconTone: t[0],
      rows: [{ k: 'Form', v: e.form }, { k: 'Email', v: e.email }, { k: 'Received', v: e.recv }, { k: 'Client', v: e.client || 'Not assigned yet' }],
      body: e.sub.replace(/^[^·]*·\s*/, ''), primary: e.client ? 'Open ' + e.client : 'Assign to a client', secondary: spam ? 'Not spam' : 'Reply by email',
      onPrimary: function () { if (e.client) { window.location.href = 'A-Clients.dc.html'; return; } self.entryAssign(e); return 'stay'; },
      onSecondary: function () { if (spam) { self.hubPatch(e.id, { status: 'New' }); self.closeSheet(true); self.say('Updated. The entry is back in New.'); return; } self.ask({ eyebrow: 'Reply', title: 'Reply to ' + e.name + '?', body: 'The reply goes from hello@wedigcreativity.com to ' + e.email + ' and is kept in the client’s message history.', ok: 'Send reply', green: true, icon: I.send, tone: 'var(--ad-tone-good)', external: true, onOk: function () { self.hubPatch(e.id, { status: 'Replied' }); self.say('Reply sent to ' + e.email + '.'); } }, true); return 'stay'; } });
  }
  formSheet(f) {
    var self = this, I = this.icons();
    return this.sh({ eyebrow: 'Form · ' + (f.on ? 'Live' : 'Paused'), title: f.name, chip: f.on ? 'Live' : 'Paused', tone: f.on ? 'var(--ad-tone-good)' : 'var(--ad-tone-flat)', icon: I.file, iconTone: 'var(--ad-tone-brand)',
      rows: [{ k: 'Where it lives', v: f.where }, { k: 'Entries, 30 days', v: String(f.n) }, { k: 'Finish rate', v: f.n ? f.conv + '% of people who start it' : 'Nothing yet' }, { k: 'Spam check', v: 'On: a hidden field and a rate limit' }],
      body: f.on ? 'Turning it off shows people a note to email you instead. Entries already received stay.' : 'Paused. The page shows a note to email you.',
      primary: f.on ? 'Pause form' : 'Turn on', secondary: 'Edit questions',
      onPrimary: function () { self.hubPatch(f.id, { on: !f.on }); self.say(f.on ? 'Paused. “' + f.name + '” shows a note to email you.' : 'Updated. “' + f.name + '” is live.'); },
      onSecondary: function () { window.location.href = 'A-FormBuilder.dc.html'; } });
  }
  linkMake() {
    var self = this, I = this.icons(), cs = this.clientsData(), forms = this.fmForms().map(function (f) { return f.name; });
    this.open(this.sh({ eyebrow: 'Pre-filled link', title: 'Send a form to a client', icon: I.link, keepOpen: true, body: 'The link opens the form with the client’s details already filled in. One record, one portal per person.', listTitle: 'Client', select: true, searchPh: 'Search clients by name, contact or email', create: this.clientCreate('Add a new client'), list: cs.map(function (c) { return { t: c.name, s: c.contact + ' · ' + c.email, ini: c.ini, av: c.tone, ref: c, k: c.phone }; }), selectWhy: 'Choose the client.',
      form: { form: forms[1] }, chipSets: [{ key: 'form', label: 'Which form', opts: forms }], primary: 'Create the link', secondary: 'Cancel',
      primaryDis: function (ctx) { return ctx.pick < 0 ? 'Choose the client.' : (!ctx.form.form ? 'Choose the form.' : ''); },
      onPrimary: function (ctx) { var c = ctx.item.ref; self.hubAdd('lnk', { id: 'ln' + Date.now(), name: c.name, sub: ctx.form.form + ' · created Today', form: ctx.form.form, state: 'Not opened', when: 'Today' }); self.setState({ tab: 2, sheet: null, stack: [] }); self.say('Saved. The link for ' + c.name + ' is copied.'); } }));
  }
  hubCfg() {
    var self = this, I = this.icons(), G = 'var(--ad-tone-good)', Fl = 'var(--ad-tone-flat)';
    var pill = function (t) { var x = self.fmTone(t); return { tag: true, t: t, tone: x[0], ink: x[1] }; };
    var ents = function () { return self.fmEntries(); };
    return {
      title: 'Enquiries', statsTitle: 'Form pulse', deckTitle: 'Enquiries this week', newLabel: 'Pre-filled link', newFn: function () { self.linkMake(); },
      ledeA: function () { var e = ents(); return e.filter(function (x) { return x.status === 'New'; }).length + ' new, ' + e.filter(function (x) { return x.status === 'Assigned'; }).length + ' assigned to a client.'; },
      ledeB: function () { return 'Most come from Contact.'; }, emptyTitle: 'No enquiry is waiting.', emptyNext: 'The next entry shows here the moment it arrives.',
      chores: function (it, I2) { return [it('Pre-filled link', I2.link, function () { self.linkMake(); }), it('Export entries', I2.down, function () { self.exportSheet({ noun: 'entries', file: 'wdc-entries', all: ents(), filtered: ents(), selected: [], cols: [{ t: 'Name', v: function (e) { return e.name; } }, { t: 'Email', v: function (e) { return e.email; } }, { t: 'Form', v: function (e) { return e.form; } }, { t: 'Status', v: function (e) { return e.status; } }, { t: 'Client', v: function (e) { return e.client; } }, { t: 'Received', v: function (e) { return e.recv; } }] }); }, { hint: 'CSV or Excel' }), it('Form settings', I2.gear, function () { window.location.href = 'A-Settings.dc.html'; })]; },
      tabs: [
        { key: 'ent', label: 'Entries', title: 'Entries', noun: 'entries', one: 'entry', ph: 'Name, email or form', file: 'wdc-entries', actLabel: 'Pre-filled link', actD: I.link, act: function () { self.linkMake(); }, emptyT: 'No entries yet.', emptyB: 'They arrive here from your forms.',
          cols: [{ t: 'From' }, { t: 'Form' }, { t: 'Status' }, { t: 'Client' }, { t: 'Received' }],
          items: function () { return ents().map(function (e) { return Object.assign({}, e, { hay: e.name + ' ' + e.email + ' ' + e.form + ' ' + e.client, cells: [{ t: e.form }, pill(e.status), { t: e.client || 'Not assigned', col: e.client ? 'var(--ad-ink)' : 'var(--ad-dim)' }, { t: e.recv }] }); }); },
          chips: [['all', 'All', function () { return true; }], ['New', 'New', function (x) { return x.status === 'New'; }], ['Assigned', 'Assigned', function (x) { return x.status === 'Assigned'; }], ['Replied', 'Replied', function (x) { return x.status === 'Replied'; }], ['Spam', 'Spam', function (x) { return x.status === 'Spam'; }]],
          facets: function (all) { var u = []; all.forEach(function (x) { if (u.indexOf(x.form) < 0) u.push(x.form); }); return [{ k: 'form', t: 'Form', opts: u, get: function (x) { return x.form; } }]; },
          exportCols: [{ t: 'Name', v: function (e) { return e.name; } }, { t: 'Email', v: function (e) { return e.email; } }, { t: 'Form', v: function (e) { return e.form; } }, { t: 'Status', v: function (e) { return e.status; } }, { t: 'Client', v: function (e) { return e.client; } }, { t: 'Received', v: function (e) { return e.recv; } }],
          sheet: function (e) { return self.entrySheet(e); },
          actions: function (e, it, I2) { var o = [it('Open entry', I2.open, function () { self.open(self.entrySheet(e)); })]; if (!e.client) o.push(it('Assign to a client', I2.users, function () { self.entryAssign(e); })); if (e.status !== 'Spam') o.push(it('Mark as spam', I2.ban, function () { self.hubPatch(e.id, { status: 'Spam' }); self.say('Marked as spam.', { undo: function () { self.hubPatch(e.id, { status: e.status }); } }); })); o.push(self.menuSep()); o.push(it('Move to Trash…', I2.trash, function () { self.ask({ eyebrow: 'Trash', title: 'Move this entry to Trash?', body: 'You can restore it from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, icon: I2.trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.hubGone([e.id], 'Entry moved to Trash.'); } }); }, { danger: true })); return o; },
          bulk: function () { return [{ label: 'Mark as spam', icon: I.ban, fn: function (sel, done) { sel.forEach(function (e) { self.hubPatch(e.id, { status: 'Spam' }); }); self.say(sel.length + ' marked as spam.'); done(); } }, { label: 'Move to Trash', icon: I.trash, danger: true, fn: function (sel, done) { self.ask({ eyebrow: 'Trash', title: 'Move ' + sel.length + ' entries to Trash?', body: 'You can restore them from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, icon: I.trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.hubGone(sel.map(function (x) { return x.id; }), sel.length + ' entries moved to Trash.'); done(); } }); } }]; } },
        { key: 'form', label: 'Forms', title: 'Forms', noun: 'forms', one: 'form', ph: 'Name or address', file: 'wdc-forms', actLabel: 'New form', actD: I.plus, act: function () { window.location.href = 'A-FormBuilder.dc.html'; }, emptyT: 'No forms yet.', emptyB: 'Start from Contact.',
          cols: [{ t: 'Form' }, { t: 'Where' }, { t: 'State' }, { t: 'Entries, 30 days', cls: 'r' }, { t: 'Finish rate', cls: 'r' }],
          items: function () { return self.fmForms().map(function (f) { return Object.assign({}, f, { hay: f.name + ' ' + f.where, cells: [{ t: f.where }, { tag: true, t: f.on ? 'Live' : 'Paused', tone: f.on ? G : Fl, ink: f.on ? '#fff' : 'var(--ad-on-flat)' }, { t: String(f.n), cls: 'r num' }, { t: f.n ? f.conv + '%' : 'None yet', cls: 'r num' }] }); }); },
          chips: [['all', 'All', function () { return true; }], ['on', 'Live', function (x) { return x.on; }], ['off', 'Paused', function (x) { return !x.on; }]],
          exportCols: [{ t: 'Form', v: function (f) { return f.name; } }, { t: 'Where', v: function (f) { return f.where; } }, { t: 'State', v: function (f) { return f.on ? 'Live' : 'Paused'; } }, { t: 'Entries 30 days', v: function (f) { return f.n; } }],
          sheet: function (f) { return self.formSheet(f); },
          actions: function (f, it, I2) { return [it('Open form', I2.open, function () { self.open(self.formSheet(f)); }), it(f.on ? 'Pause…' : 'Turn on', f.on ? I2.ban : I2.play, function () { self.hubPatch(f.id, { on: !f.on }); self.say(f.on ? 'Paused.' : 'Updated. The form is live.'); })]; } },
        { key: 'lnk', label: 'Links', title: 'Pre-filled links', noun: 'links', one: 'link', ph: 'Client or form', file: 'wdc-links', actLabel: 'Pre-filled link', actD: I.link, act: function () { self.linkMake(); }, emptyT: 'No links yet.', emptyB: 'Make one for a client and it appears here.',
          cols: [{ t: 'Client' }, { t: 'Form' }, { t: 'State' }, { t: 'Created' }],
          items: function () { return self.fmLinks().map(function (l) { return Object.assign({}, l, { hay: l.name + ' ' + l.form, cells: [{ t: l.form }, pill(l.state), { t: l.when }] }); }); },
          chips: [['all', 'All', function () { return true; }], ['no', 'Not opened', function (x) { return x.state === 'Not opened'; }], ['done', 'Completed', function (x) { return x.state === 'Completed'; }]],
          exportCols: [{ t: 'Client', v: function (l) { return l.name; } }, { t: 'Form', v: function (l) { return l.form; } }, { t: 'State', v: function (l) { return l.state; } }],
          sheet: function (l) { return self.sh({ eyebrow: 'Pre-filled link · ' + l.state, title: l.name, chip: l.state, tone: self.fmTone(l.state)[0], icon: I.link, rows: [{ k: 'Form', v: l.form }, { k: 'Created', v: l.when }, { k: 'State', v: l.state }], body: 'The link works once for this client and expires after thirty days.', primary: 'Copy link', secondary: 'Send a reminder', onPrimary: function () { self.say('The link is copied.'); return 'stay'; }, onSecondary: function () { self.ask({ eyebrow: 'Remind', title: 'Remind ' + l.name + ' to finish the form?', body: 'A short email with the link goes from hello@wedigcreativity.com.', ok: 'Send reminder', green: true, icon: I.send, tone: 'var(--ad-tone-good)', external: true, onOk: function () { self.say('Reminder sent to ' + l.name + '.'); } }, true); return 'stay'; } }); },
          actions: function (l, it, I2) { return [it('Copy link', I2.link, function () { self.say('The link is copied.'); }), it('Remove…', I2.trash, function () { self.hubGone([l.id], 'Link removed. It no longer opens.'); }, { danger: true })]; } }
      ],
      stats: function () { var e = ents(); return [
        { label: 'New entries', value: String(e.filter(function (x) { return x.status === 'New'; }).length), note: 'Oldest from today 07:40', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', ic: I.inbox, fn: function () { self.setState({ tab: 0, chip: 'New', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Entries, 30 days', value: '43', note: '+9 on last month', noteCol: G, dot: G, ic: I.chart, fn: function () { self.setState({ tab: 0, chip: 'all', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Replied', value: '81%', note: 'Within 3 hours on average', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', ic: I.send, fn: function () { self.setState({ tab: 0, chip: 'Replied', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Spam stopped', value: '14', note: 'Never reached your inbox', noteCol: 'var(--ad-dim)', dot: 'var(--ad-tone-neutral)', ic: I.ban, fn: function () { self.setState({ tab: 0, chip: 'Spam', hpg: 0, ra: self.state.ra + 1 }); } }]; },
      rail: function () { return [
        { title: 'Best forms', sub: '30 days', rows: self.fmForms().filter(function (f) { return f.n; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 3).map(function (f) { return { t: f.name, s: f.n + ' entries · ' + f.conv + '% finish', d: I.file, open: function () { self.open(self.formSheet(f)); } }; }) },
        { title: 'Links to follow up', sub: 'Not opened', rows: self.fmLinks().filter(function (l) { return l.state === 'Not opened'; }).map(function (l) { return { t: l.name, s: l.form + ' · ' + l.when, d: I.link, tag: 'Remind', tagTone: 'var(--ad-tone-warn)', open: function () { self.setState({ tab: 2, ra: self.state.ra + 1 }); } }; }) }]; },
      deck: function () { var n1 = ents().filter(function (e) { return e.id === 'e1'; })[0], n2 = ents().filter(function (e) { return e.id === 'e2'; })[0]; return [
        { id: 'fe1', kind: 'Enquiry', urgency: 'Today, 08:12', utone: '#a16207', label: 'Contact', dept: 'Studio', title: 'Temi Adeoye wants a website', body: '“We need a site for our estate agency, with listings we can update ourselves.” Not answered yet.', meta: [{ k: 'Form', v: 'Contact' }, { k: 'Email', v: 'temi@oakandivy.ng' }, { k: 'Match', v: 'Oak and Ivy Interiors, a client' }], why: 'The email matches Oak and Ivy Interiors. Assign it so the project starts on the existing record and portal.', primaryLabel: 'Assign to Oak and Ivy', primaryConfirm: { eyebrow: 'Assign', title: 'Assign this entry to Oak and Ivy Interiors?', body: 'It joins their record. No second client or portal is made.', ok: 'Assign', green: true, okToast: 'Updated. The entry is assigned to Oak and Ivy Interiors.', icon: I.check, tone: 'var(--ad-tone-good)' }, secondaryLabel: 'Reply first', sheetSecondary: true, sheet: self.entrySheet(n1) },
        { id: 'fe2', kind: 'Quote', urgency: 'Today, 07:40', utone: '#a16207', label: 'Quote request', dept: 'Social & Ads', title: 'Ifeoma Eze asked for a social media quote', body: 'Social media management, three platforms. She is not in your clients yet.', meta: [{ k: 'Form', v: 'Quote request' }, { k: 'Service', v: 'Social media' }, { k: 'Known client', v: 'No' }], why: 'Leads answered within the hour book at about twice the rate.', primaryLabel: 'Assign to a client', primaryFn: function () { self.entryAssign(n2); }, secondaryLabel: 'Not now', sToast: 'Parked. It comes back this afternoon.', sheet: self.entrySheet(n2) }]; }
    };
  }
