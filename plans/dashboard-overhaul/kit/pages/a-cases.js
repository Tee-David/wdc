  /* ======================= Owner · Case studies ======================= */
  pageName() { return 'Blog'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'Work waiting to be shown', icon: I.target, body: 'Finished projects with no case study yet, and drafts that need a client yes.' },
      { target: 'table', title: 'Every case study', icon: I.folder, body: 'Published ones show on the work pages. Hidden ones stay out of search and the sitemap.', hint: 'Tap a row to open it.' },
      { target: 'new', title: 'New case study', icon: I.plus, body: 'Start from a handed over project. The client approves the wording before it goes live.' }
    ];
  }
  csAll() {
    return this.hubApply('cs', [
      { id: 'k1', name: 'Mira Skincare, a calmer brand', sub: 'Brand identity', client: 'Mira Skincare', svc: 'Branding', st: 'Published', ok: true, date: '2 Oct', views: 842 },
      { id: 'k2', name: 'Bloom Pharmacy, found on the first page', sub: 'SEO', client: 'Bloom Pharmacy', svc: 'SEO', st: 'Published', ok: true, date: '18 Sep', views: 611 },
      { id: 'k3', name: 'Ade’s Kitchen, a month of content', sub: 'Social media', client: 'Ade’s Kitchen', svc: 'Social', st: 'Draft', ok: false, date: 'Edited 3 days ago', views: 0 },
      { id: 'k4', name: 'Zara Events, a guide the team uses', sub: 'Brand guide', client: 'Zara Events', svc: 'Branding', st: 'Awaiting client', ok: false, date: 'Sent Tue 6 Oct', views: 0 },
      { id: 'k5', name: 'Kora Logistics, a driver app', sub: 'Apps', client: 'Kora Logistics', svc: 'Apps', st: 'Hidden', ok: true, date: 'Hidden 12 Sep', views: 0 }
    ]);
  }
  csTone(st) { return { Published: ['var(--ad-tone-good)', '#fff'], Draft: ['var(--ad-tone-flat)', 'var(--ad-on-flat)'], 'Awaiting client': ['var(--ad-tone-warn)', '#fff'], Hidden: ['var(--ad-tone-neutral)', '#fff'] }[st]; }
  csSheet(c) {
    var self = this, I = this.icons(), t = this.csTone(c.st);
    return this.sh({ eyebrow: c.svc + ' · ' + c.st, title: c.name, chip: c.st, tone: t[0], icon: I.folder, iconTone: t[0],
      rows: [{ k: 'Client', v: c.client }, { k: 'Service', v: c.sub }, { k: 'Client approval', v: c.ok ? 'Approved' : 'Not yet' }, { k: c.st === 'Published' ? 'Published' : 'Last change', v: c.date }, { k: 'Reads, 30 days', v: c.st === 'Published' ? String(c.views) : 'Not live' }],
      body: c.ok ? 'The client approved the wording and pictures.' : 'It cannot go live until the client approves the wording.',
      primary: c.st === 'Published' ? 'Hide from the site' : (c.ok ? 'Publish' : 'Ask the client to approve'), secondary: 'Edit case study',
      onPrimary: function () { if (c.st === 'Published') { self.ask({ eyebrow: 'Hide', title: 'Hide “' + c.name + '”?', body: 'It leaves the work pages and the sitemap. You can show it again any time.', ok: 'Hide case study', icon: I.ban, tone: 'var(--ad-tone-warn)', onOk: function () { self.hubPatch(c.id, { st: 'Hidden' }); self.say('Updated. The case study is hidden.'); } }, true); return 'stay'; } if (c.ok) { self.hubPatch(c.id, { st: 'Published', date: 'Today' }); self.closeSheet(true); self.say('Updated. The case study is live.'); return; } self.ask({ eyebrow: 'Approval', title: 'Ask ' + c.client + ' to approve?', body: 'They get an email with the wording and pictures and can approve or request changes from their portal.', ok: 'Send for approval', green: true, icon: I.send, tone: 'var(--ad-tone-good)', external: true, onOk: function () { self.hubPatch(c.id, { st: 'Awaiting client', date: 'Sent today' }); self.say('Sent. ' + c.client + ' is asked to approve.'); } }, true); return 'stay'; },
      onSecondary: function () { self.say('The case study editor opens.'); return 'stay'; } });
  }
  csNew() {
    var self = this, I = this.icons(), cs = this.clientsData();
    this.open(this.sh({ eyebrow: 'New case study', title: 'Which client is it about?', icon: I.folder, keepOpen: true, body: 'Pick the client and the service. The editor opens with the project’s brief and pictures.', listTitle: 'Client', select: true, searchPh: 'Search clients by name, contact or email', create: this.clientCreate('Add a new client'), list: cs.map(function (c) { return { t: c.name, s: c.contact + ' · ' + c.services.join(', '), ini: c.ini, av: c.tone, ref: c, k: c.email }; }), selectWhy: 'Choose the client.',
      form: { svc: 'Branding' }, chipSets: [{ key: 'svc', label: 'Service', opts: ['Branding', 'Social', 'SEO', 'Web', 'Apps'] }], primary: 'Start the case study', secondary: 'Cancel', primaryDis: function (ctx) { return ctx.pick < 0 ? 'Choose the client.' : ''; },
      onPrimary: function (ctx) { var c = ctx.item.ref; self.hubAdd('cs', { id: 'kn' + Date.now(), name: c.name + ', case study', sub: ctx.form.svc, client: c.name, svc: ctx.form.svc, st: 'Draft', ok: false, date: 'Edited just now', views: 0 }); self.setState({ sheet: null, stack: [] }); self.say('Saved. The draft is ready to write.'); } }));
  }
  hubCfg() {
    var self = this, I = this.icons();
    var pill = function (t) { var x = self.csTone(t); return { tag: true, t: t, tone: x[0], ink: x[1] }; };
    return {
      title: 'Case studies', statsTitle: 'Work pulse', deckTitle: 'Case studies this week', newLabel: 'New case study', newFn: function () { self.csNew(); },
      ledeA: function () { var a = self.csAll(); return a.filter(function (x) { return x.st === 'Published'; }).length + ' live, ' + a.filter(function (x) { return x.st === 'Draft'; }).length + ' in draft, ' + a.filter(function (x) { return x.st === 'Awaiting client'; }).length + ' waiting for a client.'; },
      ledeB: function () { return 'Clients approve every one.'; }, emptyTitle: 'Nothing is waiting.', emptyNext: 'Hand over a project and it shows here as a candidate.',
      chores: function (it, I2) { return [it('New case study', I2.folder, function () { self.csNew(); }), it('Back to the Blog', I2.edit, function () { window.location.href = 'A-Blog.dc.html'; })]; },
      tabs: [{ key: 'cs', label: 'Case studies', title: 'Case studies', noun: 'case studies', one: 'case study', ph: 'Title, client or service', file: 'wdc-case-studies', actLabel: 'New case study', actD: I.plus, act: function () { self.csNew(); }, emptyT: 'No case studies yet.', emptyB: 'Start one from a handed over project.', warn: function () { return self.csAll().some(function (c) { return c.st === 'Awaiting client'; }); },
        cols: [{ t: 'Case study' }, { t: 'Service' }, { t: 'State' }, { t: 'Date' }, { t: 'Reads', cls: 'r' }],
        items: function () { return self.csAll().map(function (c) { return Object.assign({}, c, { hay: c.name + ' ' + c.client + ' ' + c.svc, cells: [{ t: c.svc }, pill(c.st), { t: c.date }, { t: c.st === 'Published' ? String(c.views) : 'Not live', cls: 'r num' }] }); }); },
        chips: [['all', 'All', function () { return true; }], ['pub', 'Published', function (x) { return x.st === 'Published'; }], ['dr', 'Drafts', function (x) { return x.st === 'Draft'; }], ['aw', 'Awaiting client', function (x) { return x.st === 'Awaiting client'; }], ['hid', 'Hidden', function (x) { return x.st === 'Hidden'; }]],
        exportCols: [{ t: 'Title', v: function (c) { return c.name; } }, { t: 'Client', v: function (c) { return c.client; } }, { t: 'Service', v: function (c) { return c.svc; } }, { t: 'State', v: function (c) { return c.st; } }, { t: 'Reads', v: function (c) { return c.views; } }],
        sheet: function (c) { return self.csSheet(c); },
        actions: function (c, it, I2) { return [it('Open case study', I2.open, function () { self.open(self.csSheet(c)); }), it('Edit', I2.edit, function () { self.say('The case study editor opens.'); }), self.menuSep(), it('Move to Trash…', I2.trash, function () { self.ask({ eyebrow: 'Trash', title: 'Move “' + c.name + '” to Trash?', body: 'It leaves the site. You can restore it from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, icon: I2.trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.hubGone([c.id], 'Case study moved to Trash.'); } }); }, { danger: true })]; },
        bulk: function () { return [{ label: 'Hide', icon: I.ban, fn: function (sel, done) { sel.forEach(function (c) { self.hubPatch(c.id, { st: 'Hidden' }); }); self.say('Updated. ' + sel.length + ' hidden.'); done(); } }]; } }],
      stats: function () { var a = self.csAll(); return [
        { label: 'Live', value: String(a.filter(function (x) { return x.st === 'Published'; }).length), note: 'On the work pages', noteCol: 'var(--ad-tone-good)', dot: 'var(--ad-tone-good)', ic: I.eye, fn: function () { self.setState({ chip: 'pub', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Waiting on client', value: String(a.filter(function (x) { return x.st === 'Awaiting client'; }).length), note: 'Needs their approval', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', ic: I.clock, fn: function () { self.setState({ chip: 'aw', hpg: 0, ra: self.state.ra + 1 }); } }]; },
      rail: function () { return [{ title: 'Ready to write', sub: 'Handed over, no case study', rows: [{ t: 'Oak and Ivy Interiors', s: 'Website · handed over 2 Oct', d: I.folder, tag: 'Start', tagTone: 'var(--ad-tone-brand)', open: function () { self.csNew(); } }, { t: 'Halo AI', s: 'Software · handed over 22 Sep', d: I.folder, tag: 'Start', tagTone: 'var(--ad-tone-brand)', open: function () { self.csNew(); } }] }]; },
      deck: function () { var k4 = self.csAll().filter(function (c) { return c.id === 'k4'; })[0], k3 = self.csAll().filter(function (c) { return c.id === 'k3'; })[0]; return [
        { id: 'cs1', kind: 'Approval', urgency: 'Sent Tue 6 Oct', utone: '#a16207', label: 'Branding', dept: 'Branding & Design', title: 'Zara Events has not approved their case study', body: 'The wording went out four days ago. They have not opened it.', meta: [{ k: 'Client', v: 'Zara Events' }, { k: 'Service', v: 'Brand guide' }, { k: 'Opened', v: 'No' }], why: 'Clients usually approve within a week. A short nudge helps.', primaryLabel: 'Send a reminder', primaryConfirm: { eyebrow: 'Remind', title: 'Remind Zara Events to approve?', body: 'A short email goes from hello@wedigcreativity.com with the link.', ok: 'Send reminder', green: true, okToast: 'Reminder sent.', icon: I.send, tone: 'var(--ad-tone-good)' }, secondaryLabel: 'Open it', sheetSecondary: true, sheet: self.csSheet(k4) },
        { id: 'cs2', kind: 'Draft', urgency: 'Edited 3 days ago', utone: '#5c5c7a', label: 'Social', dept: 'Social & Ads', title: 'Finish the Ade’s Kitchen case study', body: 'The results are written. The pictures and the client quote are missing.', meta: [{ k: 'Client', v: 'Ade’s Kitchen' }, { k: 'Missing', v: 'Pictures, quote' }, { k: 'Approval', v: 'Not asked' }], why: 'A client quote lifts reads by about a third.', primaryLabel: 'Open the editor', primaryFn: function () { self.say('The case study editor opens.'); }, secondaryLabel: 'Not now', sToast: 'Parked. It comes back tomorrow.', sheet: self.csSheet(k3) }]; }
    };
  }
