  /* ======================= Owner · Client page: Mira Skincare ======================= */
  pageState() { return { ptab: 'overview', ta: 0, mtab: 'inv', mpage: 0, mper: 5, ftab: 'all', fpage: 0, fper: 5, fq: '', fa: 0, apage: 0, aper: 5, afil: 'all', aa: 0, slot: 0, people: null, reminded: false, ra: 0 }; }
  pageName() { return 'Mira Skincare'; }
  navSection() { return 'Clients'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'tabs', title: 'Everything about Mira in one place', icon: I.layers, body: 'Overview, money, files, people and the full history. Each tab keeps its own search and pages.' },
      { target: 'projects', title: 'Their projects', icon: I.folder, body: 'Each project shows its stage and the next step. Tap one to open it.' },
      { target: 'rail', title: 'Money, meetings, people', icon: I.wallet, body: 'What they have paid, what is due, the next meeting and who to talk to.' },
      { target: 'msg', title: 'Talk to Adaeze', icon: I.msg, body: 'Messages go to her portal and her email. Mark a note Team only to keep it inside the studio.' }
    ];
  }
  peopleData() {
    return this.state.people || [
      { id: 'p1', name: 'Adaeze O.', i: 'AO', tone: '#1f4d3a', email: 'adaeze@miraskincare.ng', role: 'Founder, main contact', gets: 'Approvals, invoices, meetings', portal: 'Signed in Tuesday', ptone: 'var(--ad-tone-good)', short: 'Active', main: true },
      { id: 'p2', name: 'Bola T.', i: 'BT', tone: '#3d2a5c', email: 'bola@miraskincare.ng', role: 'Marketing lead', gets: 'Social posts to approve', portal: 'Invited 2 Oct, not accepted', ptone: 'var(--ad-tone-warn)', short: 'Invited' },
      { id: 'p3', name: 'Kunle M.', i: 'KM', tone: '#5c5c7a', email: 'accounts@miraskincare.ng', role: 'Accounts', gets: 'Invoices and receipts by email', portal: 'No portal access', ptone: 'var(--ad-tone-neutral)', short: 'Email only' }
    ];
  }
  setPeople(list) { this.setState({ people: list, ra: this.state.ra + 1 }); }
  docs() {
    var paid = this.state.paidDep;
    return {
      inv: [{ no: 'INV-26-9QX4LM', for: 'Social media, deposit 50%', amount: '₦450,000', date: 'Wed 14 Oct', status: 'Due in 4 days', tone: 'var(--ad-tone-warn)', kind: 'inv', open: true }, { no: 'INV-26-2FT7RB', for: 'Brand identity, deposit 50%', amount: '₦600,000', date: '30 Sep', status: 'Paid', tone: 'var(--ad-tone-good)', kind: 'inv' }],
      est: [{ no: 'EST-2026-011', for: 'Social media management, 3 months', amount: '₦900,000', date: '3 Oct', status: 'Accepted', tone: 'var(--ad-tone-good)', kind: 'est' }, { no: 'EST-2026-009', for: 'Brand identity', amount: '₦1,200,000', date: '18 Sep', status: 'Accepted', tone: 'var(--ad-tone-good)', kind: 'est' }],
      rct: [{ no: 'RCT-2026-028', for: 'Brand identity deposit, Paystack card', amount: '₦600,000', date: '30 Sep', status: 'Sent', tone: 'var(--ad-tone-good)', kind: 'rct' }]
    };
  }
  docFile(d) { return { name: d.no + '.pdf', project: 'Mira Skincare', view: 'doc', ref: d.no, docTitle: ({ inv: 'Invoice', est: 'Quote', rct: 'Receipt' })[d.kind] + ' · ' + d.amount, when: d.date, size: '190 KB', tone: 'var(--ad-tone-bad)', by: 'Funmi K.' }; }
  docSheet(d) {
    var self = this, I = this.icons(), K = { inv: 'Invoice', est: 'Quote', rct: 'Receipt' }[d.kind];
    return this.sh({ eyebrow: K, title: d.no, chip: d.status, tone: d.tone, icon: I.file, iconTone: d.tone, rows: [{ k: 'For', v: d.for }, { k: 'Amount', v: d.amount }, { k: d.kind === 'inv' && d.open ? 'Due' : 'Date', v: d.date }, { k: 'Client', v: 'Mira Skincare' }],
      feed: d.open ? [{ t: 'Viewed by Adaeze', when: 'Fri 9 Oct' }, { t: 'Sent with the payment link', when: 'Wed 7 Oct · Funmi' }] : [{ t: d.status, when: d.date }],
      primary: 'Preview ' + K.toLowerCase(), secondary: d.open ? 'Send a reminder' : '',
      onPrimary: function () { setTimeout(function () { self.openFile(self.docFile(d)); }, 30); },
      onSecondary: function () { self.closeSheet(); self.sendReminder(); return 'stay'; } });
  }
  sendReminder() { var self = this; this.say('Reminder sent to Adaeze with the Paystack and Flutterwave link.', { delay: 8, pending: function (n) { return 'Sending the reminder to Adaeze in ' + n + 's'; }, cancel: function () { self.setState({ reminded: false }); } }); this.setState({ reminded: true }); }
  filesData() {
    return [
      ['Logo round 2.pdf', 'brand', 'Today', '4.2 MB', 'palette', 1, 'Ifeanyi N.'], ['Colour and type sheet.png', 'brand', 'Wed 7 Oct', '1.1 MB', 'palette', 1, 'Ifeanyi N.'],
      ['Instagram access guide.pdf', 'social', '7 Oct', '420 KB', 'doc', 1, 'Chiamaka A.'], ['Content pillars.pdf', 'social', '3 Oct', '1.6 MB', 'doc', 1, 'Chiamaka A.'],
      ['Moodboard.jpg', 'brand', '26 Sep', '3.8 MB', 'art', 1, 'Ifeanyi N.'], ['Competitor scan.pdf', 'brand', '25 Sep', '2.2 MB', 'doc', 0, 'Ifeanyi N.'],
      ['Discovery call notes.pdf', 'brand', '24 Sep', '320 KB', 'doc', 0, 'Babatope A.'], ['Logo round 1.pdf', 'brand', '22 Sep', '3.9 MB', 'art', 1, 'Ifeanyi N.'],
      ['Signed quote EST-2026-009.pdf', 'billing', '20 Sep', '210 KB', 'doc', 1, 'Funmi K.'], ['Receipt RCT-2026-028.pdf', 'billing', '30 Sep', '180 KB', 'doc', 1, 'Funmi K.']
    ].map(function (f, i) { var ext = f[0].split('.').pop().toUpperCase(); return { id: 'f' + i, name: f[0], cat: f[1], project: { brand: 'Brand identity', social: 'Social media', billing: 'Billing' }[f[1]], when: f[2], size: f[3], view: f[4], shared: !!f[5], by: f[6], ext: ext, docTitle: f[0].replace(/\.\w+$/, ''), ref: 'MIRA-' + (i + 1), pageCount: ext === 'PDF' ? 2 + (i % 4) : 1, bg: i === 4 ? '#c9a27a' : '#f1ece4', fg: '#2b2620', mark: i === 4 ? 'moodboard' : 'mira', swatches: [{ c: '#1f4d3a', n: 'Leaf' }, { c: '#f1ece4', n: 'Linen' }, { c: '#2b2620', n: 'Bark' }, { c: '#c9a27a', n: 'Clay' }], tone: ext === 'PDF' ? '#c62828' : (ext === 'PNG' ? '#000065' : '#b84a00') }; });
  }
  activity() {
    return [
      ['AO', '#1f4d3a', 'Adaeze', 'asked about the green in route B', 'Message', 'Today, 10:12', 'Message'], ['IN', '#000065', 'Ifeanyi', 'sent logo round 2', 'Brand identity', 'Today, 09:40', 'Work'],
      ['FK', '#15803d', 'Funmi', 'sent the social media deposit invoice', 'INV-26-9QX4LM · ₦450,000', 'Wed 7 Oct', 'Money'], ['CA', '#b84a00', 'Chiamaka', 'asked for Instagram access', 'Social media', 'Wed 7 Oct', 'Work'],
      ['AO', '#1f4d3a', 'Adaeze', 'accepted quote EST-2026-011', 'Social media management · ₦900,000', 'Sat 3 Oct', 'Money'], ['AO', '#1f4d3a', 'Adaeze', 'paid ₦600,000 by Paystack', 'Receipt RCT-2026-028', '30 Sep', 'Money'],
      ['AO', '#1f4d3a', 'Adaeze', 'asked for changes on round 1', 'Brand identity', '25 Sep', 'Work'], ['IN', '#000065', 'Ifeanyi', 'sent logo round 1', 'Brand identity', '22 Sep', 'Work'],
      ['BA', '#000065', 'Babatope', 'held the discovery call', 'Google Meet · 45 min', '24 Sep', 'Message'], ['BA', '#000065', 'Babatope', 'added Mira Skincare as a client', 'From the contact form', '18 Sep', 'Work']
    ].map(function (a) { return { i: a[0], tone: a[1], who: a[2], what: a[3], where: a[4], when: a[5], kind: a[6], ktone: a[6] === 'Money' ? 'var(--ad-tone-good)' : (a[6] === 'Message' ? 'var(--ad-tone-brand)' : 'var(--ad-tone-neutral)') }; });
  }
  personSheet(pp) {
    var self = this, I = this.icons();
    return this.sh({ eyebrow: 'Person at Mira Skincare', title: pp.name, chip: pp.short, tone: pp.ptone, icon: I.users, iconTone: pp.tone, rows: [{ k: 'Role', v: pp.role }, { k: 'Email', v: pp.email }, { k: 'Gets', v: pp.gets }, { k: 'Portal', v: pp.portal }], primary: 'Message ' + pp.name.split(' ')[0], secondary: pp.short === 'Invited' ? 'Resend the invite' : '',
      onPrimary: function () { setTimeout(function () { self.open(self.sh({ eyebrow: 'Message', title: 'Message ' + pp.name, icon: I.msg, compose: true, composeLabel: 'Message', vis: 'client', required: true, primary: 'Send', onPrimary: function (ctx) { self.say(ctx.vis === 'client' ? 'Sent to ' + pp.name.split(' ')[0] + '.' : 'Saved as a team note.'); } })); }, 30); },
      onSecondary: function () { self.closeSheet(); self.say('Invite sent again to ' + pp.email + '. It works for 7 days.'); return 'stay'; } });
  }
  personMenu(pp) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), out = [it('Open', I.open, function () { self.open(self.personSheet(pp)); })];
    if (pp.short === 'Invited') out.push(it('Resend the invite', I.mail, function () { self.say('Invite sent again to ' + pp.email + '.'); }));
    if (pp.short === 'Email only') out.push(it('Give portal access', I.key, function () { self.ask({ eyebrow: 'Portal', title: 'Invite ' + pp.name + ' to the portal?', body: 'They will see invoices, receipts and files for Mira Skincare. They will not see approvals unless you make them a reviewer.', ok: 'Send invite', icon: I.key, onOk: function () { self.setPeople(self.peopleData().map(function (x) { return x.id === pp.id ? Object.assign({}, x, { portal: 'Invited today', ptone: 'var(--ad-tone-warn)', short: 'Invited' }) : x; })); self.say('Invite sent to ' + pp.email + '.'); } }); }));
    if (!pp.main) out.push(it('Make main contact', I.star, function () { var prev = self.peopleData(); self.setPeople(prev.map(function (x) { return Object.assign({}, x, { main: x.id === pp.id, role: x.id === pp.id ? x.role.replace(', main contact', '') + ', main contact' : x.role.replace(', main contact', '') }); })); self.say(pp.name.split(' ')[0] + ' is now the main contact.', { undo: function () { self.setPeople(prev); } }); }));
    if (!pp.main) { out.push(this.menuSep()); out.push(it('Remove…', I.trash, function () { self.ask({ eyebrow: 'Remove', title: 'Remove ' + pp.name + '?', body: 'Their portal access ends now. Messages they sent stay in the history.', ok: 'Remove ' + pp.name.split(' ')[0], danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { var prev = self.peopleData(); self.setPeople(prev.filter(function (x) { return x.id !== pp.id; })); self.say(pp.name.split(' ')[0] + ' has been removed.', { undo: function () { self.setPeople(prev); } }); } }); }, { danger: true })); }
    return out;
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (pop.kind === 'chores') return [
      it('Edit details', I.edit, function () { self.editDetails(); }),
      it('Portal access', I.key, function () { self.setState({ ptab: 'people', ta: self.state.ta + 1 }); }),
      it('Export everything', I.down, function () { self.say('mira-skincare.zip is being prepared. We email you the link in a few minutes.'); }),
      this.menuSep(),
      it('Move to Trash…', I.trash, function () { self.ask({ eyebrow: 'Trash', title: 'Move Mira Skincare to Trash?', body: 'Two live projects and ₦450,000 outstanding go with it. Invoices keep their numbers in Money. You can restore it from Settings, Trash, for 30 days.', needAck: true, ackText: 'Adaeze and her team lose portal access straight away.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { self.say('Mira Skincare moved to Trash. Restore it from Settings.'); setTimeout(function () { window.location.href = 'A-Clients.dc.html'; }, 1600); } }); }, { danger: true })
    ];
    if (pop.kind === 'doc') { var d = null, D = this.docs(); ['inv', 'est', 'rct'].forEach(function (k) { D[k].forEach(function (x) { if (x.no === pop.id) d = x; }); }); if (!d) return []; var out = [it('Open', I.open, function () { self.open(self.docSheet(d)); }), it('Preview PDF', I.eye, function () { self.openFile(self.docFile(d)); }), it('Download', I.down, function () { self.say(d.no + '.pdf downloaded.'); })]; if (d.open) out.push(it('Send a reminder', I.mail, function () { self.sendReminder(); })); return out; }
    if (pop.kind === 'person') { var pp = this.peopleData().filter(function (x) { return x.id === pop.id; })[0]; return pp ? this.personMenu(pp) : []; }
    return [];
  }
  editDetails() {
    var self = this, I = this.icons();
    this.open(this.sh({ eyebrow: 'Mira Skincare', title: 'Edit details', icon: I.edit, form: { name: 'Mira Skincare', site: 'miraskincare.ng', phone: '+234 802 114 3390', address: 'Studio 4, 12 Admiralty Way', tax: '' },
      fields: [{ key: 'name', label: 'Business name', wide: true }, { key: 'site', label: 'Website' }, { key: 'phone', label: 'Phone', type: 'tel', mode: 'tel' }, { key: 'address', label: 'Billing address', wide: true, hint: 'Printed on invoices and receipts.' }, { key: 'tax', label: 'Tax ID (optional)', ph: 'For VAT invoices', wide: true }],
      primary: 'Save changes', secondary: 'Cancel', primaryDis: function (ctx) { return (ctx.form.name || '').trim() ? '' : 'The business needs a name.'; },
      onPrimary: function () { self.say('Updated. New invoices use these details.'); } }));
  }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this), L = this.socialLogos();
    var tabs = [['overview', 'Overview'], ['money', 'Money', 5], ['files', 'Files', 10], ['people', 'People', this.peopleData().length], ['activity', 'Activity']];
    var ptabs = tabs.map(function (t) { var on = s.ptab === t[0]; return { label: t[1], n: t[2] || 0, hasN: !!t[2], cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ptab: t[0], ta: self.state.ta + 1 }); } }; });
    var trk = function (labels, cur) { return labels.map(function (l, i) { return { l: l, n: i + 1, cls: i < cur ? 'done' : (i === cur ? 'cur' : 'todo'), isDone: i < cur, notDone: i >= cur, delay: (0.3 + i * 0.08) + 's' }; }); };
    var IN = { i: 'IN', c: '#000065' }, CA = { i: 'CA', c: '#b84a00' }, FK = { i: 'FK', c: '#15803d' };
    var projects = [
      { name: 'Brand identity', status: 'With the client', tone: 'var(--ad-tone-warn)', meta: 'Branding & Design · ₦1,200,000 · due Sat 17 Oct', track: trk(['Discovery', 'Concepts', 'Review', 'Final files', 'Handover'], 2), team: [IN], next: 'Waiting 9 days for Adaeze to choose a route', open: function () { window.location.href = 'A-Project.dc.html?p=mira-br'; } },
      { name: 'Social media management', status: 'Setup', tone: 'var(--ad-tone-live)', meta: 'Social & Ads · ₦300,000 a month · starts 1 Nov', track: trk(['Setup', 'Plan', 'Approve', 'Publish', 'Report'], 0), team: [CA, IN], next: 'Blocked on the deposit and Instagram access', open: function () { window.location.href = 'A-Project.dc.html?p=mira-so'; } }
    ].map(function (pj) { var c = pj.track.filter(function (x) { return x.cls === 'cur'; })[0]; return Object.assign({}, pj, { stepAria: pj.name + ': stage ' + c.n + ' of ' + pj.track.length + ', ' + c.l }); });
    var A = this.activity();
    var actOpen = function (a) { return function () { self.open(S({ eyebrow: a.kind, title: a.who + ' ' + a.what, icon: a.kind === 'Money' ? I.cash : (a.kind === 'Message' ? I.msg : I.layers), iconTone: a.ktone, rows: [{ k: 'Where', v: a.where }, { k: 'When', v: a.when }], primary: 'Close' })); }; };
    var recent = A.slice(0, 4).map(function (a, i) { return Object.assign({}, a, { dotCls: i === 0 ? 'now' : '', open: actOpen(a) }); });

    var D = this.docs(), dl = D[s.mtab], mp = Math.min(s.mpage, Math.max(0, Math.ceil(dl.length / s.mper) - 1));
    var mrows = dl.slice(mp * s.mper, mp * s.mper + s.mper).map(function (d) { var open = function () { self.open(self.docSheet(d)); }; return Object.assign({}, d, { anim: self.anim(s.ra), aria: d.no + ', ' + d.amount + ', ' + d.status + '. Press Enter to open.', menuAria: 'Actions for ' + d.no, open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }, menuX: self.popOn('doc', d.no), menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'doc', d.no, 230, 200, 'Actions for ' + d.no); } }); });
    var mtabs = [['inv', 'Invoices'], ['est', 'Quotes'], ['rct', 'Receipts']].map(function (t) { var on = s.mtab === t[0]; return { label: t[1], n: D[t[0]].length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ mtab: t[0], mpage: 0, ra: self.state.ra + 1 }); } }; });
    var MP = Object.assign(this.pager('docs', dl.length, s.mper, mp, function (k) { self.setState({ mpage: k }); }, function (n) { self.setState({ mper: n, mpage: 0 }); }), { all: function () { window.location.href = 'A-Money.dc.html'; } });

    var F = this.filesData(), fq = s.fq.trim().toLowerCase(), fl = F.filter(function (f) { return (s.ftab === 'all' || f.cat === s.ftab) && (!fq || f.name.toLowerCase().indexOf(fq) >= 0); });
    var fp = Math.min(s.fpage, Math.max(0, Math.ceil(fl.length / s.fper) - 1));
    var frows = fl.slice(fp * s.fper, fp * s.fper + s.fper).map(function (f, i) { var prev = function () { self.openFile(f); }; return Object.assign({}, f, { meta: f.project + ' · ' + f.when + ' · ' + f.size + ' · ' + f.by, aria: 'Preview ' + f.name, dlAria: 'Download ' + f.name, anim: self.anim(s.fa), delay: (i * 0.035) + 's', get: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.say('Downloading ' + f.name + ' (' + f.size + ')'); }, preview: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; prev(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); prev(); } } }); });
    var ftabs = [['all', 'All'], ['brand', 'Brand identity'], ['social', 'Social media'], ['billing', 'Billing']].map(function (t) { var on = s.ftab === t[0]; return { label: t[1], n: F.filter(function (f) { return (t[0] === 'all' || f.cat === t[0]) && (!fq || f.name.toLowerCase().indexOf(fq) >= 0); }).length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ftab: t[0], fpage: 0, fa: self.state.fa + 1 }); } }; });
    var FP = Object.assign(this.pager('files', fl.length, s.fper, fp, function (k) { self.setState({ fpage: k, fa: self.state.fa + 1 }); }, function (n) { self.setState({ fper: n, fpage: 0 }); }), { all: function () { self.setState({ fper: 20, fpage: 0 }); } });

    var PP = this.peopleData();
    var people = PP.map(function (pp) { var open = function () { self.open(self.personSheet(pp)); }; return Object.assign({}, pp, { anim: self.anim(s.ra), aria: pp.name + ', ' + pp.role + '. Press Enter to open.', menuAria: 'Actions for ' + pp.name, open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }, menuX: self.popOn('person', pp.id), menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'person', pp.id, 240, 220, 'Actions for ' + pp.name); } }); });

    var afs = [['all', 'All'], ['Money', 'Money'], ['Work', 'Work']], aI = 0; afs.forEach(function (a, i) { if (a[0] === s.afil) aI = i; });
    var al = A.filter(function (a) { return s.afil === 'all' || a.kind === s.afil || (s.afil === 'Work' && a.kind === 'Message'); });
    var ap = Math.min(s.apage, Math.max(0, Math.ceil(al.length / s.aper) - 1));
    var acts = al.slice(ap * s.aper, ap * s.aper + s.aper).map(function (a, i) { return Object.assign({}, a, { dotCls: ap === 0 && i === 0 ? 'now' : '', anim: self.anim(s.aa), delay: (i * 0.04) + 's', open: actOpen(a) }); });
    var AP = Object.assign(this.pager('acts', al.length, s.aper, ap, function (k) { self.setState({ apage: k, aa: self.state.aa + 1 }); }, function (n) { self.setState({ aper: n, apage: 0 }); }), { all: function () { self.setState({ aper: 20, apage: 0, aa: self.state.aa + 1 }); } });

    var slots = [['14', 'Wed 14 Oct, 15:30', 'In 4 days'], ['15', 'Thu 15 Oct, 11:00', 'In 5 days'], ['16', 'Fri 16 Oct, 14:00', 'In 6 days']], sl = slots[s.slot];
    var invoiced = 1050000, paid = 600000, pct = Math.round(paid / invoiced * 100);
    return Object.assign(this.kit(), this.extraVals(), {
      headLine: 'Adaeze O. · adaeze@miraskincare.ng · client since Sep 2026 · signed in Tuesday',
      ptabs: ptabs, tabAnim: s.ta % 2 ? 'kidIn' : 'kidIn2',
      isOverview: s.ptab === 'overview', isMoney: s.ptab === 'money', isFiles: s.ptab === 'files', isPeople: s.ptab === 'people', isActivity: s.ptab === 'activity',
      projects: projects, recent: recent,
      toActivity: function () { self.setState({ ptab: 'activity', ta: self.state.ta + 1 }); }, toMoney: function () { self.setState({ ptab: 'money', ta: self.state.ta + 1 }); }, toPeople: function () { self.setState({ ptab: 'people', ta: self.state.ta + 1 }); },
      newProject: function () { window.location.href = 'A-Projects.dc.html'; },
      billAria: pct + '% of invoices paid', paidPct: Math.round(pct * p), ringOff: (100 - pct * p).toFixed(1), paidShort: self.short(paid * p), invoicedTxt: self.ngn(invoiced), hasDue: !s.reminded, noDue: false,
      remind: function () { self.sendReminder(); },
      meetDay: sl[0], meetTime: sl[1], meetIn: sl[2],
      agenda: function () { self.open(S({ eyebrow: 'Logo review · ' + sl[1], title: 'Agenda', icon: I.cal, checksTitle: 'What we cover', checks: [{ t: 'Walk through both routes', s: 'Ifeanyi, 10 min' }, { t: 'Adaeze picks a route or lists changes', s: '10 min' }, { t: 'Agree the final files and brand guide date', s: '5 min' }, { t: 'Confirm the balance invoice timing', s: 'Babatope, 5 min' }], note: 'The Google Meet link and this agenda go to Adaeze 1 hour before.', primary: 'Close' })); },
      moveMeeting: function () { self.open(S({ eyebrow: 'Logo review', title: 'Move the meeting', icon: I.cal, body: 'Adaeze gets the new time by email and in her portal. It stays review 1 of 2.', listTitle: 'Times that suit Ifeanyi and you', select: true, pick: s.slot, list: slots.map(function (x, i) { return { t: x[1], s: i === s.slot ? 'Current time' : '30 min · Google Meet' }; }), primary: function (ctx) { return ctx.pick === self.state.slot ? 'Keep this time' : 'Move to ' + slots[ctx.pick][1]; }, onPrimary: function (ctx) { if (ctx.pick === self.state.slot) return; var prev = self.state.slot; self.setState({ slot: ctx.pick }); self.say('Moved to ' + slots[ctx.pick][1] + '. Adaeze has been told.', { undo: function () { self.setState({ slot: prev }); } }); } })); },
      peopleShort: PP.slice(0, 2).map(function (pp) { return Object.assign({}, pp, { portalShort: pp.short, open: function () { self.open(self.personSheet(pp)); } }); }),
      mtabs: mtabs, mrows: mrows, MP: MP, mDateHead: s.mtab === 'inv' ? 'Due or paid' : 'Date',
      ftabs: ftabs, frows: frows, FP: FP, fEmpty: !fl.length, fq: s.fq, hasFq: !!s.fq, onFq: function (e) { self.setState({ fq: e.target.value, fpage: 0, fa: self.state.fa + 1 }); }, clearFq: function () { self.setState({ fq: '', fa: self.state.fa + 1 }); },
      upload: function () { self.open(S({ eyebrow: 'Upload to Mira Skincare', title: 'Add files', icon: I.upload, body: 'Up to 50 MB a file. Choose who sees them before they land.', chipSets: [{ key: 'proj', label: 'Project', opts: ['Brand identity', 'Social media', 'Billing'] }], form: { proj: 'Brand identity', who: 'Team only' }, compose: false, list: [], fields: [], checks: [], note: '', primary: 'Choose files', secondary: 'Cancel', onPrimary: function (ctx) { self.say('The file picker opens here. Files go to ' + ctx.form.proj + '.'); } })); },
      people: people, addPerson: function () { self.open(S({ eyebrow: 'Mira Skincare', title: 'Add a person', icon: I.users, fields: [{ key: 'name', label: 'Full name' }, { key: 'role', label: 'Role', ph: 'For example: Operations' }, { key: 'email', label: 'Email', type: 'email', mode: 'email', wide: true, check: function (v) { v = v.trim(); if (!v) return ''; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Check the email address.'; return ''; } }], chipSets: [{ key: 'gets', label: 'They get', multi: true, opts: ['Approvals', 'Invoices and receipts', 'Meeting invites', 'Portal access'] }], primary: 'Add person', secondary: 'Cancel', primaryDis: function (ctx) { var f = ctx.form; return (f.name || '').trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((f.email || '').trim()) ? '' : 'Add a name and a valid email.'; }, onPrimary: function (ctx) { var f = ctx.form, gets = f.gets || [], portal = gets.indexOf('Portal access') >= 0; self.setPeople(self.peopleData().concat([{ id: 'p' + Date.now(), name: f.name.trim(), i: f.name.trim().split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(), tone: '#23239b', email: f.email.trim(), role: (f.role || 'Team member').trim(), gets: gets.filter(function (g) { return g !== 'Portal access'; }).join(', ') || 'Nothing yet', portal: portal ? 'Invited today' : 'No portal access', ptone: portal ? 'var(--ad-tone-warn)' : 'var(--ad-tone-neutral)', short: portal ? 'Invited' : 'Email only' }])); self.say(portal ? 'Added. ' + f.email.trim() + ' gets a portal invite.' : 'Added. They get email only.'); } })); },
      actI: aI, actFilters: afs.map(function (a) { var on = s.afil === a[0]; return { t: a[1], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ afil: a[0], apage: 0, aa: self.state.aa + 1 }); } }; }), acts: acts, AP: AP,
      messageMain: function () { self.open(S({ eyebrow: 'Message', title: 'Message Adaeze', icon: I.msg, compose: true, composeLabel: 'Message', composePh: 'Write to Adaeze', vis: 'client', required: true, primary: 'Send', onPrimary: function (ctx) { self.say(ctx.vis === 'client' ? 'Sent to Adaeze. She gets an email and a portal notice.' : 'Saved as a team note on Mira Skincare.'); } })); },
      openChores: function (e) { self.openPop(e, 'chores', 'chores', 240, 230, 'More for Mira Skincare'); }
    });
  }
