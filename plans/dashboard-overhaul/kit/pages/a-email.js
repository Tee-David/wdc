  /* ======================= Owner · Email marketing ======================= */
  pageName() { return 'Messages'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'What email needs this week', icon: I.target, body: 'A campaign to approve, a bounce to clear, an automation that stopped. Act, snooze or hand it over.', hint: 'Focus the card: D done, S snooze.' },
      { target: 'table', title: 'Four tabs, one table', icon: I.mail, body: 'Campaigns you send once, automations that run by themselves, the templates behind both and the people who get them.', hint: 'Tap a row to open it. The ⋮ has the rest.' },
      { target: 'rail', title: 'Reach and health', icon: I.chart, body: 'Opens, unsubscribes and bounces for the last 30 days. Bounces and unsubscribes are removed from every list for you.' },
      { target: 'new', title: 'New campaign', icon: I.plus, body: 'Write it, pick who gets it, send it now or book it. Every send shows a recipient count and can be tested first.' }
    ];
  }
  emAud() { return ['All contacts', 'Clients', 'Leads', 'Newsletter', 'Past clients']; }
  emCampaigns() {
    var B = [
      { id: 'c1', name: 'October studio news', sub: 'Three launches, one offer for returning clients', subject: 'Three launches and an offer for returning clients', aud: 'Newsletter', n: 412, status: 'scheduled', date: 'Wed 14 Oct, 09:00', open: 0, click: 0 },
      { id: 'c2', name: 'Brand guide offer', sub: 'A free review of your current guide', subject: 'A free review of your brand guide', aud: 'Past clients', n: 64, status: 'draft', date: 'Edited yesterday', open: 0, click: 0 },
      { id: 'c3', name: 'September round up', sub: 'What we shipped in September', subject: 'What we shipped in September', aud: 'Newsletter', n: 398, status: 'sent', date: '2 Oct', open: 46, click: 9 },
      { id: 'c4', name: 'Paystack and Flutterwave, explained', sub: 'Which one your shop should use', subject: 'Which payment provider should your shop use?', aud: 'Leads', n: 87, status: 'sent', date: '18 Sep', open: 52, click: 14 },
      { id: 'c5', name: 'Holiday hours', sub: 'Studio hours for the end of year', subject: 'Our hours over the holidays', aud: 'Clients', n: 58, status: 'sent', date: '4 Sep', open: 71, click: 6 }
    ];
    return this.hubApply('camp', B);
  }
  emAutos() {
    return this.hubApply('auto', [
      { id: 'a1', name: 'Welcome series', sub: 'Three emails over a week', trig: 'A person joins the newsletter', on: true, sent: 96, open: 61 },
      { id: 'a2', name: 'Invoice reminder', sub: 'Three days before, on the day, three days after', trig: 'An invoice is due', on: true, sent: 41, open: 78 },
      { id: 'a3', name: 'Handover thank you', sub: 'Asks for a review a week after handover', trig: 'A project is handed over', on: true, sent: 7, open: 83 },
      { id: 'a4', name: 'Quiet client check in', sub: 'A short note after ninety days of silence', trig: 'No activity for 90 days', on: false, sent: 0, open: 0 },
      { id: 'a5', name: 'Enquiry follow up', sub: 'Replies to a new form entry the same hour', trig: 'A form entry arrives', on: true, sent: 33, open: 69 }
    ]);
  }
  emTemplates() {
    return this.hubApply('tpl', [
      { id: 't1', name: 'Invoice', sub: 'Sent with every invoice', kind: 'Money', custom: true, edited: '12 Sep' },
      { id: 't2', name: 'Receipt', sub: 'Sent when a payment lands', kind: 'Money', custom: false, edited: 'Default' },
      { id: 't3', name: 'Welcome to your portal', sub: 'Sent with a client invitation', kind: 'Clients', custom: true, edited: '3 Aug' },
      { id: 't4', name: 'Review ready', sub: 'A file or post is waiting for approval', kind: 'Projects', custom: false, edited: 'Default' },
      { id: 't5', name: 'Meeting confirmation', sub: 'Google Meet link and time', kind: 'Meetings', custom: false, edited: 'Default' },
      { id: 't6', name: 'Newsletter layout', sub: 'The frame campaigns are written into', kind: 'Marketing', custom: true, edited: '28 Sep' }
    ]);
  }
  emContacts() {
    return this.hubApply('ct', [
      { id: 'p1', name: 'Adaeze Okonkwo', sub: 'adaeze@miraskincare.ng', src: 'Client', status: 'Subscribed', added: '12 Mar' },
      { id: 'p2', name: 'Tunde Bakare', sub: 'tunde@zaraevents.ng', src: 'Client', status: 'Subscribed', added: '2 Feb' },
      { id: 'p3', name: 'Ifeoma Eze', sub: 'ifeoma@lumenads.com', src: 'Newsletter', status: 'Subscribed', added: '30 Sep' },
      { id: 'p4', name: 'Temi Adeoye', sub: 'temi@oakandivy.ng', src: 'Form entry', status: 'Subscribed', added: '8 Oct' },
      { id: 'p5', name: 'Halima Sule', sub: 'halima@haloai.dev', src: 'Newsletter', status: 'Unsubscribed', added: '14 Jun' },
      { id: 'p6', name: 'Segun Ojo', sub: 'segun@korapp.ng', src: 'Client', status: 'Bounced', added: '19 Jan' },
      { id: 'p7', name: 'Bola Shittu', sub: 'bola@bloomseo.ng', src: 'Past client', status: 'Subscribed', added: '5 Nov 2025' }
    ]);
  }
  emStatus(x) { return { sent: ['Sent', 'var(--ad-tone-good)', '#fff'], scheduled: ['Scheduled', 'var(--ad-tone-brand)', '#fff'], draft: ['Draft', 'var(--ad-tone-flat)', 'var(--ad-on-flat)'] }[x]; }
  campaignSheet(c) {
    var self = this, I = this.icons(), st = this.emStatus(c.status), sent = c.status === 'sent';
    return this.sh({ eyebrow: c.aud + ' · ' + st[0], title: c.name, chip: st[0], tone: st[1], icon: I.mail, iconTone: st[1],
      rows: [{ k: 'Subject', v: c.subject }, { k: 'Goes to', v: c.aud + ', ' + c.n + ' people' }, { k: sent ? 'Sent' : (c.status === 'scheduled' ? 'Goes out' : 'Last edit'), v: c.date }].concat(sent ? [{ k: 'Opened', v: c.open + '% (' + Math.round(c.n * c.open / 100) + ' people)' }, { k: 'Clicked', v: c.click + '%' }, { k: 'Unsubscribed', v: '2 people' }] : []),
      body: sent ? 'Sent. Bounces and unsubscribes were removed from your lists.' : 'Nothing is sent until you confirm. Send a test to yourself first.',
      primary: sent ? 'Send again to people who did not open' : 'Edit campaign', secondary: sent ? 'Duplicate' : 'Send a test',
      onPrimary: function () { if (sent) { self.ask({ eyebrow: 'Resend', title: 'Send “' + c.name + '” to ' + Math.round(c.n * (100 - c.open) / 100) + ' people who did not open it?', body: 'They get the same email with a new subject line, “You may have missed this”. Nobody who opened it is emailed again.', ok: 'Send to ' + Math.round(c.n * (100 - c.open) / 100) + ' people', green: true, icon: I.send, tone: 'var(--ad-tone-good)', external: true, onOk: function () { self.say('Resent to ' + Math.round(c.n * (100 - c.open) / 100) + ' people.'); } }, true); return 'stay'; } self.closeSheet(true); setTimeout(function () { self.campaignEditor(c); }, 80); },
      onSecondary: function () { if (sent) { self.closeSheet(true); setTimeout(function () { self.campaignEditor(Object.assign({}, c, { id: null, name: c.name + ' (copy)', status: 'draft' })); }, 80); return; } self.say('A test went to babatope@wendiloveee.com.'); return 'stay'; } });
  }
  campaignEditor(c) {
    var self = this, I = this.icons(), edit = c && c.id;
    var start = c ? { name: c.name, subject: c.subject, body: c.body || '', aud: c.aud, when: c.status === 'scheduled' ? 'Schedule' : 'Save as draft', sched: '2026-10-14', schedT: '09:00' } : { name: '', subject: '', body: '', aud: 'Newsletter', when: 'Save as draft', sched: '2026-10-14', schedT: '09:00' };
    var count = function (a) { return ({ 'All contacts': 412, Clients: 58, Leads: 87, Newsletter: 398, 'Past clients': 64 })[a] || 0; };
    this.open(this.sh({ wide: true, eyebrow: edit ? 'Edit campaign' : 'New campaign', title: edit ? c.name : 'Write a campaign', icon: I.mail, keepOpen: true, focus: 'f-name',
      body: 'People who unsubscribed or bounced are left out automatically. Every email carries an unsubscribe link, which the law requires.',
      guard: function (ctx) { var f = ctx.form; return ['name', 'subject', 'body'].some(function (k) { return (f[k] || '') !== (start[k] || ''); }); }, guardBody: 'The campaign is not saved. If you close now, what you wrote is lost.',
      form: start,
      fields: function (st) { var f = st.form, out = [{ key: 'name', label: 'Campaign name', ph: 'October studio news', wide: true, hint: 'Only you see this.' }, { key: 'subject', label: 'Subject line', ph: 'Three launches and an offer', wide: true, hint: (f.subject || '').length + ' characters. Under 50 reads whole on a phone.' }, { key: 'body', type: 'editor', label: 'The email', ph: 'Start with the one thing the reader gains.', hint: 'Keep to one link and one ask.' }]; if (f.when === 'Schedule') out.push({ key: 'sched', type: 'datetime', label: 'Send on', timeLabel: 'Time', required: true, hint: 'Tuesday to Thursday mornings get the most opens.' }); return out; },
      chipSets: [{ key: 'aud', label: 'Who gets it', opts: this.emAud(), hint: 'People on more than one list get it once.' }, { key: 'when', label: 'What now?', opts: ['Save as draft', 'Send now', 'Schedule'] }],
      notice: function (ctx) { var f = ctx.form; return { tone: 'var(--ad-tone-brand)', icon: I.users, title: count(f.aud) + ' people', body: f.aud + '. Unsubscribed and bounced addresses are already removed.' }; },
      primary: function (ctx) { var f = ctx.form; return f.when === 'Send now' ? 'Send now' : (f.when === 'Schedule' ? 'Schedule send' : 'Save draft'); }, secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form; if (!(f.name || '').trim()) return 'Name the campaign.'; if (!(f.subject || '').trim()) return 'Add a subject line.'; if (f.when !== 'Save as draft' && (f.body || '').trim().split(/\s+/).filter(Boolean).length < 20) return 'Write at least 20 words before it goes out.'; if (f.when === 'Schedule' && f.sched <= self.today()) return 'Pick a day after today.'; return ''; },
      onPrimary: function (ctx) {
        var f = ctx.form, id = edit ? c.id : 'n' + Date.now(), n = count(f.aud);
        var fin = function (status, date, toast) { var d = { id: id, name: f.name.trim(), sub: f.subject.trim(), subject: f.subject.trim(), body: f.body, aud: f.aud, n: n, status: status, date: date, open: 0, click: 0 }; self.setState({ sheet: null, stack: [] }); if (edit) self.hubPatch(id, d); else self.hubAdd('camp', d); self.say(toast); };
        if (f.when === 'Send now') self.ask({ eyebrow: 'Send', title: 'Send “' + f.name.trim() + '” to ' + n + ' people now?', body: 'It goes to ' + f.aud + ' straight away. A sent email cannot be taken back.', ok: 'Send to ' + n + ' people', green: true, icon: I.send, tone: 'var(--ad-tone-good)', external: true, onOk: function () { fin('sent', 'Today', 'Sent to ' + n + ' people.'); } });
        else if (f.when === 'Schedule') fin('scheduled', self.fmtDate(f.sched) + ', ' + f.schedT, 'Saved. It goes out ' + self.fmtDate(f.sched) + ' at ' + f.schedT + '.');
        else fin('draft', 'Edited just now', 'Saved. “' + f.name.trim() + '” is a draft.');
      } }));
  }
  autoSheet(a) {
    var self = this, I = this.icons();
    return this.sh({ eyebrow: 'Automation · ' + (a.on ? 'On' : 'Paused'), title: a.name, chip: a.on ? 'On' : 'Paused', tone: a.on ? 'var(--ad-tone-good)' : 'var(--ad-tone-flat)', icon: I.play, iconTone: a.on ? 'var(--ad-tone-good)' : 'var(--ad-tone-neutral)',
      rows: [{ k: 'Starts when', v: a.trig }, { k: 'Steps', v: a.sub }, { k: 'Sent, 30 days', v: String(a.sent) }, { k: 'Opened', v: a.sent ? a.open + '%' : 'Nothing sent yet' }],
      body: a.on ? 'Runs by itself. Pausing stops new sends and leaves emails already queued to go.' : 'Paused. Nothing is sent until you turn it on.',
      primary: a.on ? 'Pause automation' : 'Turn on', secondary: 'Edit the emails',
      onPrimary: function () { self.hubPatch(a.id, { on: !a.on }); self.say(a.on ? 'Paused. “' + a.name + '” stops sending.' : 'Updated. “' + a.name + '” is on.'); },
      onSecondary: function () { self.say('The email editor opens for “' + a.name + '”.'); return 'stay'; } });
  }
  tplSheet(t) {
    var self = this, I = this.icons();
    return this.sh({ eyebrow: t.kind + ' · ' + (t.custom ? 'Customised' : 'Default'), title: t.name, chip: t.custom ? 'Customised' : 'Default', tone: t.custom ? 'var(--ad-tone-brand)' : 'var(--ad-tone-flat)', icon: I.file, iconTone: 'var(--ad-tone-brand)',
      rows: [{ k: 'Used for', v: t.sub }, { k: 'Last edit', v: t.edited }, { k: 'Sender', v: 'WDC Studio, hello@wedigcreativity.com' }],
      body: 'Names and amounts are filled in when it is sent. Preview shows it with sample details.',
      primary: 'Edit template', secondary: t.custom ? 'Reset to default' : 'Send a test',
      onPrimary: function () { self.say('The template editor opens.'); return 'stay'; },
      onSecondary: function () { if (t.custom) { self.ask({ eyebrow: 'Reset', title: 'Reset “' + t.name + '” to the default?', body: 'Your wording is replaced by the studio default. This cannot be undone.', ok: 'Reset template', danger: true, icon: I.undo, tone: 'var(--ad-tone-warn)', confirmCheck: true, onOk: function () { self.hubPatch(t.id, { custom: false, edited: 'Default' }); self.say('Updated. “' + t.name + '” is back to the default.'); } }, true); return 'stay'; } self.say('A test went to babatope@wendiloveee.com.'); return 'stay'; } });
  }
  contactSheet(p) {
    var self = this, I = this.icons(), tone = { Subscribed: 'var(--ad-tone-good)', Unsubscribed: 'var(--ad-tone-flat)', Bounced: 'var(--ad-tone-bad)' }[p.status];
    return this.sh({ eyebrow: p.src + ' · ' + p.status, title: p.name, chip: p.status, tone: tone, icon: I.users, iconTone: 'var(--ad-tone-neutral)',
      rows: [{ k: 'Email', v: p.sub }, { k: 'Source', v: p.src }, { k: 'Added', v: p.added }, { k: 'Status', v: p.status === 'Bounced' ? 'Bounced. The address does not accept mail.' : (p.status === 'Unsubscribed' ? 'Unsubscribed themselves. Do not add them back without asking.' : 'Gets campaigns and automations') }],
      body: p.src === 'Client' ? 'This person is a client. Their record and portal are in Clients.' : 'Added from ' + p.src.toLowerCase() + '.',
      primary: p.status === 'Subscribed' ? 'Unsubscribe' : 'Back to subscribed', secondary: p.src === 'Client' ? 'Open the client' : 'Close',
      primaryDis: p.status === 'Unsubscribed' || p.status === 'Bounced' ? 'They asked to leave, or the address fails. Ask them to join again.' : '',
      onPrimary: function () { self.ask({ eyebrow: 'Unsubscribe', title: 'Unsubscribe ' + p.name + '?', body: 'They stop getting campaigns and automations. Invoices and receipts still reach them, because those are not marketing.', ok: 'Unsubscribe', icon: I.ban, tone: 'var(--ad-tone-warn)', onOk: function () { self.hubPatch(p.id, { status: 'Unsubscribed' }); self.say('Updated. ' + p.name + ' is unsubscribed.'); } }, true); return 'stay'; },
      onSecondary: function () { if (p.src === 'Client') window.location.href = 'A-Clients.dc.html'; } });
  }
  hubCfg() {
    var self = this, I = this.icons(), G = 'var(--ad-tone-good)', W = 'var(--ad-tone-warn)', Bn = 'var(--ad-tone-brand)', Fl = 'var(--ad-tone-flat)';
    var camps = function () { return self.emCampaigns(); };
    var rep = function (nm, v) { return nm; };
    var pill = function (t, tone, ink) { return { tag: true, t: t, tone: tone, ink: ink }; };
    return {
      title: 'Email', statsTitle: 'Email pulse', deckTitle: 'Email this week', newLabel: 'New campaign', newFn: function () { self.campaignEditor(); },
      ledeA: function () { var c = camps(); return c.filter(function (x) { return x.status === 'sent'; }).length + ' sent this quarter, ' + c.filter(function (x) { return x.status === 'scheduled'; }).length + ' scheduled, ' + c.filter(function (x) { return x.status === 'draft'; }).length + ' in draft.'; },
      ledeB: function () { return 'Open rate is 56%.'; }, emptyTitle: 'Email is on track.', emptyNext: 'The next campaign goes out Wed 14 Oct.',
      chores: function (it, I2) { return [it('New campaign', I2.mail, function () { self.campaignEditor(); }), it('Import contacts', I2.upload, function () { self.importSheet(self.emImport()); }, { hint: 'CSV or Excel' }), it('Email settings', I2.gear, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Sender and signature' })]; },
      tabs: [
        { key: 'camp', label: 'Campaigns', title: 'Campaigns', noun: 'campaigns', one: 'campaign', ph: 'Name, subject or audience', file: 'wdc-campaigns', actLabel: 'New campaign', actD: I.plus, act: function () { self.campaignEditor(); }, emptyT: 'No campaigns yet.', emptyB: 'Write your first one and send it to a list.',
          cols: [{ t: 'Campaign' }, { t: 'Audience' }, { t: 'Status' }, { t: 'Date' }, { t: 'Opened', cls: 'r' }],
          items: function () { return camps().map(function (c) { var st = self.emStatus(c.status); return Object.assign({}, c, { hay: c.name + ' ' + c.subject + ' ' + c.aud, cells: [{ t: c.aud + ' · ' + c.n }, pill(st[0], st[1], st[2]), { t: c.date }, { t: c.status === 'sent' ? c.open + '%' : 'Not sent', cls: 'r num' }] }); }); },
          chips: [['all', 'All', function () { return true; }], ['draft', 'Drafts', function (x) { return x.status === 'draft'; }], ['scheduled', 'Scheduled', function (x) { return x.status === 'scheduled'; }], ['sent', 'Sent', function (x) { return x.status === 'sent'; }]],
          exportCols: [{ t: 'Name', v: function (c) { return c.name; } }, { t: 'Subject', v: function (c) { return c.subject; } }, { t: 'Audience', v: function (c) { return c.aud; } }, { t: 'Recipients', v: function (c) { return c.n; } }, { t: 'Status', v: function (c) { return c.status; } }, { t: 'Date', v: function (c) { return c.date; } }, { t: 'Opened %', v: function (c) { return c.open; } }],
          sheet: function (c) { return self.campaignSheet(c); },
          actions: function (c, it, I2) { var o = [it('Open campaign', I2.open, function () { self.open(self.campaignSheet(c)); })]; if (c.status !== 'sent') o.push(it('Edit campaign', I2.edit, function () { self.campaignEditor(c); })); o.push(it('Duplicate', I2.file, function () { self.campaignEditor(Object.assign({}, c, { id: null, name: c.name + ' (copy)', status: 'draft' })); })); o.push(self.menuSep()); o.push(it('Move to Trash…', I2.trash, function () { self.ask({ eyebrow: 'Trash', title: 'Move “' + c.name + '” to Trash?', body: 'Sent campaigns keep their numbers in reports. You can restore it from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, icon: I2.trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.hubGone([c.id], '“' + c.name + '” moved to Trash.'); } }); }, { danger: true })); return o; },
          bulk: function () { return [{ label: 'Move to Trash', icon: I.trash, danger: true, fn: function (sel, done) { self.ask({ eyebrow: 'Trash', title: 'Move ' + sel.length + ' campaigns to Trash?', body: 'You can restore them from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, icon: I.trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.hubGone(sel.map(function (x) { return x.id; }), sel.length + ' campaigns moved to Trash.'); done(); } }); } }]; } },
        { key: 'auto', label: 'Automations', title: 'Automations', noun: 'automations', one: 'automation', ph: 'Name or trigger', file: 'wdc-automations', actLabel: 'New automation', actD: I.plus, act: function () { self.say('Pick a trigger, then write the steps. Welcome, reminder and thank you emails are ready to copy.'); }, emptyT: 'No automations yet.', emptyB: 'Start from a welcome series.', warn: function () { return self.emAutos().some(function (a) { return !a.on; }); },
          cols: [{ t: 'Automation' }, { t: 'Starts when' }, { t: 'State' }, { t: 'Sent, 30 days', cls: 'r' }, { t: 'Opened', cls: 'r' }],
          items: function () { return self.emAutos().map(function (a) { return Object.assign({}, a, { hay: a.name + ' ' + a.trig, cells: [{ t: a.trig }, pill(a.on ? 'On' : 'Paused', a.on ? G : Fl, a.on ? '#fff' : 'var(--ad-on-flat)'), { t: String(a.sent), cls: 'r num' }, { t: a.sent ? a.open + '%' : 'None yet', cls: 'r num' }] }); }); },
          chips: [['all', 'All', function () { return true; }], ['on', 'On', function (x) { return x.on; }], ['off', 'Paused', function (x) { return !x.on; }]],
          exportCols: [{ t: 'Name', v: function (a) { return a.name; } }, { t: 'Starts when', v: function (a) { return a.trig; } }, { t: 'State', v: function (a) { return a.on ? 'On' : 'Paused'; } }, { t: 'Sent 30 days', v: function (a) { return a.sent; } }],
          sheet: function (a) { return self.autoSheet(a); },
          actions: function (a, it, I2) { return [it('Open automation', I2.open, function () { self.open(self.autoSheet(a)); }), it(a.on ? 'Pause…' : 'Turn on', a.on ? I2.ban : I2.play, function () { self.hubPatch(a.id, { on: !a.on }); self.say(a.on ? 'Paused. “' + a.name + '” stops sending.' : 'Updated. “' + a.name + '” is on.'); })]; },
          bulk: function () { return [{ label: 'Pause', icon: I.ban, fn: function (sel, done) { sel.forEach(function (a) { self.hubPatch(a.id, { on: false }); }); self.say(sel.length + ' paused.'); done(); } }, { label: 'Turn on', icon: I.play, fn: function (sel, done) { sel.forEach(function (a) { self.hubPatch(a.id, { on: true }); }); self.say('Updated. ' + sel.length + ' on.'); done(); } }]; } },
        { key: 'tpl', label: 'Templates', title: 'Templates', noun: 'templates', one: 'template', ph: 'Name or use', file: 'wdc-email-templates', actLabel: 'Email settings', actD: I.gear, act: function () { window.location.href = 'A-Settings.dc.html'; }, emptyT: 'No templates.', emptyB: 'Defaults are always available.',
          cols: [{ t: 'Template' }, { t: 'Group' }, { t: 'State' }, { t: 'Last edit' }],
          items: function () { return self.emTemplates().map(function (t) { return Object.assign({}, t, { hay: t.name + ' ' + t.kind, cells: [{ t: t.kind }, pill(t.custom ? 'Customised' : 'Default', t.custom ? Bn : Fl, t.custom ? '#fff' : 'var(--ad-on-flat)'), { t: t.edited }] }); }); },
          chips: [['all', 'All', function () { return true; }], ['cust', 'Customised', function (x) { return x.custom; }], ['def', 'Default', function (x) { return !x.custom; }]],
          exportCols: [{ t: 'Name', v: function (t) { return t.name; } }, { t: 'Group', v: function (t) { return t.kind; } }, { t: 'State', v: function (t) { return t.custom ? 'Customised' : 'Default'; } }],
          sheet: function (t) { return self.tplSheet(t); },
          actions: function (t, it, I2) { return [it('Open template', I2.open, function () { self.open(self.tplSheet(t)); }), it('Send a test', I2.send, function () { self.say('A test went to babatope@wendiloveee.com.'); })]; } },
        { key: 'ct', label: 'Contacts', title: 'Contacts', noun: 'contacts', one: 'contact', ph: 'Name, email or source', file: 'wdc-contacts', actLabel: 'Import contacts', actD: I.upload, act: function () { self.importSheet(self.emImport()); }, emptyT: 'No contacts yet.', emptyB: 'Import a list or add the newsletter form to your site.', warn: function () { return self.emContacts().some(function (p) { return p.status === 'Bounced'; }); },
          cols: [{ t: 'Person' }, { t: 'Source' }, { t: 'Status' }, { t: 'Added' }],
          items: function () { return self.emContacts().map(function (p) { var tn = { Subscribed: [G, '#fff'], Unsubscribed: [Fl, 'var(--ad-on-flat)'], Bounced: ['var(--ad-tone-bad)', '#fff'] }[p.status]; return Object.assign({}, p, { hay: p.name + ' ' + p.sub + ' ' + p.src, cells: [{ t: p.src }, pill(p.status, tn[0], tn[1]), { t: p.added }] }); }); },
          chips: [['all', 'All', function () { return true; }], ['sub', 'Subscribed', function (x) { return x.status === 'Subscribed'; }], ['uns', 'Unsubscribed', function (x) { return x.status === 'Unsubscribed'; }], ['bnc', 'Bounced', function (x) { return x.status === 'Bounced'; }]],
          facets: function (all) { var u = []; all.forEach(function (x) { if (u.indexOf(x.src) < 0) u.push(x.src); }); return [{ k: 'src', t: 'Source', opts: u, get: function (x) { return x.src; } }]; },
          exportCols: [{ t: 'Name', v: function (p) { return p.name; } }, { t: 'Email', v: function (p) { return p.sub; } }, { t: 'Source', v: function (p) { return p.src; } }, { t: 'Status', v: function (p) { return p.status; } }, { t: 'Added', v: function (p) { return p.added; } }],
          sheet: function (p) { return self.contactSheet(p); },
          actions: function (p, it, I2) { return [it('Open contact', I2.open, function () { self.open(self.contactSheet(p)); }), it('Remove from lists…', I2.trash, function () { self.ask({ eyebrow: 'Remove', title: 'Remove ' + p.name + ' from every list?', body: 'They leave the email lists. Their client record, if any, is not touched.', ok: 'Remove', danger: true, icon: I2.trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.hubGone([p.id], p.name + ' removed from the lists.'); } }); }, { danger: true })]; },
          bulk: function () { return [{ label: 'Unsubscribe', icon: I.ban, fn: function (sel, done) { sel.forEach(function (p) { self.hubPatch(p.id, { status: 'Unsubscribed' }); }); self.say(sel.length + ' unsubscribed.'); done(); } }]; } }
      ],
      stats: function () { var c = camps(); return [
        { label: 'Open rate', value: '56%', note: 'Industry average 38%', noteCol: G, dot: G, ic: I.eye, fn: function () { self.setState({ tab: 0, chip: 'sent', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Contacts', value: String(self.emContacts().filter(function (p) { return p.status === 'Subscribed'; }).length), note: '2 joined this week', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', ic: I.users, fn: function () { self.setState({ tab: 3, chip: 'all', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Scheduled', value: String(c.filter(function (x) { return x.status === 'scheduled'; }).length), note: 'Next: Wed 14 Oct', noteCol: 'var(--ad-dim)', dot: Bn, ic: I.cal, fn: function () { self.setState({ tab: 0, chip: 'scheduled', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Bounces', value: String(self.emContacts().filter(function (p) { return p.status === 'Bounced'; }).length), note: 'Removed from sends', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', ic: I.alert, fn: function () { self.setState({ tab: 3, chip: 'bnc', hpg: 0, ra: self.state.ra + 1 }); } }]; },
      rail: function () { return [
        { title: 'Running now', sub: 'Automations', rows: self.emAutos().filter(function (a) { return a.on; }).slice(0, 3).map(function (a) { return { t: a.name, s: a.sent + ' sent, ' + a.open + '% opened', d: I.play, open: function () { self.open(self.autoSheet(a)); } }; }) },
        { title: 'Best campaigns', sub: 'By opens', rows: camps().filter(function (x) { return x.status === 'sent'; }).sort(function (a, b) { return b.open - a.open; }).slice(0, 3).map(function (c) { return { t: c.name, s: c.open + '% opened · ' + c.aud, d: I.chart, open: function () { self.open(self.campaignSheet(c)); } }; }) }]; },
      deck: function () { return [
        { id: 'ebounce', kind: 'Clean up', urgency: '1 bounce', utone: '#a16207', label: 'Contacts', dept: 'Studio', title: 'Segun Ojo’s address bounced', body: 'The last email to segun@korapp.ng did not arrive. Sending again hurts your sender name.', meta: [{ k: 'Source', v: 'Client' }, { k: 'Last sent', v: '2 Oct' }, { k: 'Effect', v: 'Removed from lists' }], why: 'Bounces above 2% push every email you send towards spam.', primaryLabel: 'Open the contact', primaryFn: function () { self.setState({ tab: 3, chip: 'bnc', hpg: 0, ra: self.state.ra + 1 }); }, secondaryLabel: 'Ask for a new address', sToast: 'A message to Segun is in drafts.', sheet: self.contactSheet(self.emContacts().filter(function (p) { return p.id === 'p6'; })[0]) },
        { id: 'edraft', kind: 'Draft', urgency: 'Goes out in 3 days', utone: '#a16207', label: 'Campaigns', dept: 'Studio', title: 'Finish the brand guide offer', body: 'A draft for 64 past clients. It has a subject but no body yet.', meta: [{ k: 'Audience', v: 'Past clients, 64' }, { k: 'Subject', v: 'A free review of your brand guide' }, { k: 'Words', v: '0' }], why: 'Past clients reopen at about 7% of the time. A short, specific offer is the thing that moves them.', primaryLabel: 'Open the editor', primaryFn: function () { self.campaignEditor(camps().filter(function (c) { return c.id === 'c2'; })[0]); }, secondaryLabel: 'Not now', sToast: 'Parked. It comes back tomorrow.', sheet: self.campaignSheet(camps().filter(function (c) { return c.id === 'c2'; })[0] || { name: '', subject: '', aud: '', n: 0, status: 'draft', date: '' }) },
        { id: 'epause', kind: 'Stopped', urgency: 'Paused 4 weeks', utone: '#5c5c7a', label: 'Automations', dept: 'Studio', title: 'The quiet client check in is paused', body: 'It would have written to 9 clients with no activity for ninety days this month.', meta: [{ k: 'Would send to', v: '9 clients' }, { k: 'Paused', v: '4 weeks ago' }, { k: 'Opened', v: '83% when on' }], why: 'These are the clients most likely to leave without telling you.', primaryLabel: 'Turn it on', primaryFn: function () { self.hubPatch('a4', { on: true }); }, primaryToast: 'Updated. The check in is on.', secondaryLabel: 'Keep it off', sToast: 'Kept off. It stays on this list.', sheet: self.autoSheet(self.emAutos().filter(function (a) { return a.id === 'a4'; })[0] || { name: '', trig: '', sub: '', sent: 0, open: 0, on: false }) }]; }
    };
  }
  emImport() {
    var self = this;
    return { noun: 'contacts', one: 'contact', file: 'wdc-contacts', intro: 'Bring a mailing list over from a spreadsheet. Every row is checked against your current contacts first.', rule: 'One row per person. Only add people who agreed to hear from you.',
      fields: [{ k: 'name', t: 'Name', req: true, alias: ['full name', 'contact'] }, { k: 'email', t: 'Email', req: true, alias: ['email address'] }, { k: 'src', t: 'Source', alias: ['list', 'origin'] }],
      sample: [['Amaka Obi', 'amaka@obifoods.ng', 'Newsletter'], ['Dele Fash', 'dele@fashhq.ng', 'Newsletter'], ['Nneka Uzo', 'nneka@uzocreates.com', 'Past client']],
      check: function (r, seen) { if (!r.name) return 'Missing name'; if (!r.email) return 'Missing email'; var em = r.email.toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return 'Invalid email'; if (self.isTempEmail && self.isTempEmail(em)) return 'Temporary inbox'; if (self.emContacts().some(function (p) { return p.sub.toLowerCase() === em; })) return 'Already a contact'; if (seen[em]) return 'Repeated in this file'; seen[em] = true; return ''; },
      label: function (r) { return r.name || 'No name'; }, detail: function (r) { return r.email || 'No email'; }, initials: function (r) { return (r.name || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(); },
      onImport: function (ready) { ready.forEach(function (r, i) { self.hubAdd('ct', { id: 'imp' + Date.now() + i, name: r.name, sub: r.email, src: r.src || 'Import', status: 'Subscribed', added: 'Today' }); }); self.setState({ tab: 3 }); self.say(ready.length + ' contacts imported.'); } };
  }
