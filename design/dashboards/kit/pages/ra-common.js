  /* ======================= Owner pages: shared identity and studio data ======================= */
  icons() { return Object.assign(this.baseIcons(), { block: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM4.93 4.93l14.14 14.14', trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6', dots: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zM15.5 7.5l3 3L22 7l-3-3', plus: 'M12 5v14M5 12h14', edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z', star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z' }); }
  brand() { return { name: 'WDC Studio', sub: 'Owner' }; }
  me() { return { name: 'Babatope A.', i: 'BA', role: 'Owner', tone: '#000065' }; }
  role() { return 'admin'; }
  navCounts() { return { Clients: { n: 5 }, Money: { n: 3, tone: 'var(--ad-tone-bad)' }, Messages: { n: 6 } }; }
  searchHint() { return 'Search clients, projects, invoices'; }
  palHint() { return 'Client, project, invoice number or page'; }
  palEmptyHint() { return 'Try a client name or an invoice number like 4KQ8ZD.'; }
  installCopy() { return ['Get WDC on your phone', 'Payments, approvals and replies as push alerts.']; }
  teamDay() { return 'My Day'; }
  recordKinds() { return ['Page', 'Client', 'Project', 'Invoice']; }
  snoozeOptions() { return [['In 1 hour', '12:30'], ['This afternoon', '15:00'], ['Tomorrow', '09:00'], ['Monday', '09:00']]; }
  deck() { return []; }
  teamData() {
    return [
      { name: 'Funmi K.', i: 'FK', dept: 'Finance', load: '3 open', tone: '#15803d' },
      { name: 'Daniel E.', i: 'DE', dept: 'Web & Apps', load: '7 open', tone: '#5c5c7a' },
      { name: 'Ifeanyi N.', i: 'IN', dept: 'Branding & Design', load: '5 open', tone: '#000065' },
      { name: 'Chiamaka A.', i: 'CA', dept: 'Social & Ads', load: '6 open', tone: '#b84a00' },
      { name: 'Bisi O.', i: 'BO', dept: 'SEO', load: '4 open', tone: '#15803d' },
      { name: 'Tolu A.', i: 'TA', dept: 'Social & Ads', load: '2 open', tone: '#23239b' }
    ];
  }
  walk() { return { nav: 'Today is what needs you. Clients holds every record, Projects runs work by service, Money covers invoices, payments and payouts, Messages has every conversation, Marketing runs email campaigns, automations and the calendar, Forms collects enquiries and entries, Blog is the studio journal, and Settings has the team and permissions. Support is just below.', bell: 'Payments, approvals and replies land here. Install the app to get them as push alerts. The important ones are emailed too.' }; }

  /* The studio's clients. Outstanding sums to ₦2,315,000 and overdue to ₦1,015,000, as on Today. */
  /* ----- Money documents (invoice and quote), shared by the Money list and the document page ----- */
  docTotals(d) {
    var sub = 0; (d.lines || []).forEach(function (l) { if (l.d !== '' || l.u) sub += (+l.q || 0) * (+l.u || 0); });
    var disc = d.disc && d.disc.type === 'pct' ? Math.round(sub * (+d.disc.v || 0) / 100) : (d.disc && d.disc.type === 'amt' ? Math.min(sub, +d.disc.v || 0) : 0);
    var net = sub - disc, vat = d.vat ? Math.round(net * 0.075) : 0, total = net + vat;
    var paid = (d.payments || []).reduce(function (t, p) { return t + p.amt; }, 0);
    return { sub: sub, disc: disc, vat: vat, total: total, paid: paid, owed: Math.max(0, total - paid), dep: d.kind === 'quote' && d.deposit ? Math.round(total * (+String(d.deposit).replace('%', '') || 0) / 100) : 0 };
  }
  docMoney(d, n) { return (d.cur === 'USD' ? '$' : '₦') + Math.round(n).toLocaleString('en-NG'); }
  docDays(iso, from) { return Math.round((new Date(iso + 'T00:00:00Z') - new Date(from + 'T00:00:00Z')) / 86400000); }
  docStatus(d) {
    var T = this.docTotals(d), G = 'var(--ad-tone-good)', today = '2026-10-10';
    if (d.kind === 'quote') { var qs = d.qstatus || 'Draft'; return { t: qs, tone: { Draft: 'var(--ad-tone-flat)', Sent: 'var(--ad-tone-brand)', Opened: 'var(--ad-tone-live)', Accepted: G, Declined: 'var(--ad-tone-bad)', Expired: 'var(--ad-tone-neutral)' }[qs] || 'var(--ad-tone-flat)' }; }
    if (d.cancelled) return { t: 'Cancelled', tone: 'var(--ad-tone-neutral)' };
    if (!d.sent) return { t: 'Draft', tone: 'var(--ad-tone-flat)' };
    if (T.total > 0 && T.owed <= 0) return { t: (d.payments || []).some(function (p) { return p.amt < 0; }) && T.paid <= 0 ? 'Refunded' : 'Paid', tone: G };
    if (T.paid > 0) return { t: 'Part paid', tone: 'var(--ad-tone-warn)' };
    var n = this.docDays(d.due, today);
    if (n < 0) return { t: Math.abs(n) + (Math.abs(n) === 1 ? ' day late' : ' days late'), tone: 'var(--ad-tone-bad)' };
    return { t: n === 0 ? 'Due today' : 'Due in ' + n + (n === 1 ? ' day' : ' days'), tone: n <= 7 ? 'var(--ad-tone-warn)' : 'var(--ad-tone-neutral)' };
  }
  docRow(d) {
    var T = this.docTotals(d), st = this.docStatus(d), mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], f = function (iso) { var p = iso.split('-'); return +p[2] + ' ' + mo[+p[1] - 1]; };
    if (d.kind === 'quote') return { no: d.no, client: d.client ? d.client.name : '', title: d.title || 'Quote', value: T.total, sent: d.sent ? 'Today' : 'Not sent', valid: d.valid ? f(d.valid) : '—', st: st.t, to: d.client ? d.client.contact : '' };
    var paid = st.t === 'Paid' || st.t === 'Refunded';
    return { no: d.no, client: d.client ? d.client.name : '', amount: this.docMoney(d, T.total), date: paid ? f((d.payments[d.payments.length - 1] || {}).iso || d.due) : f(d.due), status: st.t, tone: st.tone, method: d.cur === 'USD' ? 'USD account' : 'Paystack or Flutterwave', tab: paid ? 'paid' : (this.docDays(d.due, '2026-10-10') < 0 && d.sent ? 'over' : 'due'), doc: true };
  }
  sharedDocs() { return this.shared('docs', {}); }
  clientsData() {
    var c = function (id, name, ini, tone, contact, email, phone, services, live, owed, late, retainer, since, last, lastWhen, status, portal) { return { id: id, name: name, ini: ini, tone: tone, contact: contact, email: email, phone: phone, services: services, live: live, owed: owed, late: late, retainer: retainer, since: since, last: last, lastWhen: lastWhen, status: status, portal: portal }; };
    return [
      c('mira', 'Mira Skincare', 'MS', '#1f4d3a', 'Adaeze O.', 'adaeze@miraskincare.ng', '+234 802 114 3390', ['Brand identity', 'Social media'], 2, 450000, 0, 0, 'Sep 2026', 'Logo round 2 sent', 'Today', 'active', 'Signed in Tuesday'),
      c('kora', 'Kora Logistics', 'KL', '#5c3d1f', 'Adebayo K.', 'billing@koralogistics.ng', '+234 803 555 0142', ['Driver app'], 1, 850000, 850000, 0, 'Jun 2026', 'Second reminder not opened', 'Yesterday', 'active', 'Never signed in'),
      c('bloom', 'Bloom Pharmacy', 'BP', '#15803d', 'Ngozi E.', 'ngozi@bloompharmacy.ng', '+234 809 220 4471', ['SEO'], 1, 180000, 0, 300000, 'Mar 2026', 'September report published', '3 h ago', 'active', 'Signed in 2 Oct'),
      c('ade', "Ade's Kitchen", 'AK', '#7a2e0e', 'Ade B.', 'ade@adeskitchen.ng', '+234 816 004 2210', ['Social media'], 1, 0, 0, 350000, 'Jan 2026', 'Approved the chef story post', '8 min ago', 'active', 'Signed in today'),
      c('oak', 'Oak and Ivy Interiors', 'OI', '#3d2a5c', 'Temi A.', 'temi@oakandivy.ng', '+234 805 761 9902', ['Website'], 1, 520000, 0, 0, 'May 2026', 'Last launch check closed', 'Thursday', 'active', 'Signed in Thursday'),
      c('halo', 'Halo Clinics', 'HC', '#1f3a5c', 'Dr Kemi S.', 'kemi@haloclinics.ng', '+234 812 330 5518', ['Software & AI', 'Care plan'], 1, 0, 0, 500000, 'Apr 2026', 'Milestone 2 demo booked', 'Yesterday', 'active', 'Signed in 7 Oct'),
      c('lumen', 'Lumen Fitness', 'LF', '#23239b', 'Daniel O.', 'daniel@lumenfitness.ng', '+234 807 448 1203', ['Social & Ads'], 1, 225000, 75000, 300000, 'Feb 2026', 'Asked to lower the ad budget', '18 h ago', 'active', 'Signed in yesterday'),
      c('okafor', 'Tunde Okafor Law', 'TO', '#5c5c7a', 'Tunde O.', 'tunde@okaforlaw.ng', '+234 803 901 7764', ['Website', 'Domain'], 0, 90000, 90000, 0, 'Nov 2025', 'Domain renews in 14 days', '2 days ago', 'active', 'Signed in 30 Sep'),
      c('zara', 'Zara Events', 'ZE', '#b84a00', 'Zara B.', 'hello@zaraevents.ng', '+234 818 552 6637', ['Event website'], 0, 0, 0, 0, '', 'Discovery call today at 11:00', 'Yesterday', 'lead', 'No portal yet'),
      c('nkem', 'Nkem Realty', 'NR', '#a16207', 'Chidi N.', 'chidi@nkemrealty.ng', '+234 810 772 0051', ['Website', 'SEO'], 0, 0, 0, 0, '', 'Viewed quote EST-2026-012', '2 days ago', 'lead', 'No portal yet'),
      c('pine', 'Pinewood Bakery', 'PB', '#2b2620', 'Fola A.', 'fola@pinewoodbakery.ng', '+234 806 113 8840', ['Brand identity'], 0, 0, 0, 0, 'Aug 2025', 'Handover recorded, project closed', 'Jul 2026', 'past', 'Signed in Jul')
    ].concat(this.shared('newClients', []));
  }
  records() {
    var self = this;
    var pages = [['Today', 'The deck, money moving and the studio pulse', 'D-Admin.dc.html'], ['Clients', 'Every client and lead', 'A-Clients.dc.html'], ['Projects', 'Work by service', 'A-Projects.dc.html'], ['Money', 'Invoices, quotes, payments and payouts', 'A-Money.dc.html'], ['Messages', 'Team, clients and support', 'A-Messages.dc.html'], ['Marketing', 'Campaigns, automations, contacts and the calendar', 'A-Email.dc.html'], ['Forms', 'Enquiries, entries, subscribers and form builder', 'A-Forms.dc.html'], ['Settings', 'Team, money, notifications and system', 'A-Settings.dc.html'], ['Support', 'Tickets and the knowledge base', 'A-Support.dc.html']].map(function (p) { return { kind: 'Page', label: p[0], sub: p[1], ini: p[0].charAt(0), tone: 'var(--ad-tone-neutral)', href: p[2] }; });
    var clients = this.clientsData().map(function (c) { return { kind: 'Client', label: c.name, sub: c.contact + ' · ' + c.services.join(', '), ini: c.ini, tone: c.tone, href: c.id === 'mira' ? 'A-Client.dc.html' : '', sheet: c.id === 'mira' ? null : self.clientSheet(c) }; });
    return pages.concat(clients, [
      { kind: 'Project', label: 'Social media management', sub: 'Mira Skincare · Setup', ini: 'S', tone: 'var(--ad-tone-live)', href: 'A-Project.dc.html?p=mira-so' },
      { kind: 'Project', label: 'Brand identity', sub: 'Mira Skincare · Review', ini: 'B', tone: 'var(--ad-tone-warn)', href: 'A-Project.dc.html?p=mira-br' },
      { kind: 'Project', label: 'SEO retainer', sub: 'Bloom Pharmacy · Report', ini: 'S', tone: 'var(--ad-tone-good)', href: 'A-Project.dc.html?p=bloom-seo' },
      { kind: 'Project', label: 'Website', sub: 'Oak and Ivy Interiors · Handover', ini: 'W', tone: 'var(--ad-tone-good)', href: 'A-Project.dc.html?p=oak-web' },
      { kind: 'Project', label: 'Driver app', sub: 'Kora Logistics · Paused', ini: 'D', tone: 'var(--ad-tone-bad)', href: 'A-Project.dc.html?p=kora-app' },
      { kind: 'Project', label: 'Booking assistant', sub: 'Halo Clinics · Build', ini: 'B', tone: 'var(--ad-tone-brand)', href: 'A-Project.dc.html?p=halo-ai' },
      { kind: 'Project', label: 'Instagram ads', sub: 'Lumen Fitness · Review', ini: 'I', tone: 'var(--ad-tone-warn)', href: 'A-Project.dc.html?p=lumen-ads' },
      { kind: 'Invoice', label: 'INV-26-4KQ8ZD', sub: 'Kora Logistics · ₦850,000 · 12 days late', ini: 'IN', tone: 'var(--ad-tone-bad)', href: 'A-Money.dc.html' },
      { kind: 'Invoice', label: 'INV-26-9QX4LM', sub: 'Mira Skincare · ₦450,000 · due Wed 14 Oct', ini: 'IN', tone: 'var(--ad-tone-warn)', href: 'A-Money.dc.html' }
    ]);
  }
  notesData() {
    var S = this.sh.bind(this), I = this.icons();
    return [
      { id: 'n1', i: 'BP', tone: 'var(--ad-tone-good)', t: 'Bloom Pharmacy paid ₦280,000 by Paystack', when: '12 min ago', sheet: S({ eyebrow: 'Payment', title: '₦280,000 from Bloom Pharmacy', chip: 'Paid', tone: 'var(--ad-tone-good)', icon: I.cash, iconTone: 'var(--ad-tone-good)', rows: [{ k: 'Invoice', v: 'INV-26-3MS8QA' }, { k: 'Method', v: 'Paystack card' }, { k: 'Receipt', v: 'RCT-2026-040' }, { k: 'When', v: 'Today, 11:18' }], body: 'Bloom got the receipt by email. It is in Money, Payments.', primary: 'Close' }) },
      { id: 'n2', i: 'CA', tone: 'var(--ad-tone-live)', t: "Chiamaka sent 5 posts to Ade's Kitchen for approval", when: '20 min ago', sheet: S({ eyebrow: 'Team', title: '5 posts with Ade for approval', icon: I.eye, body: 'Ade approves within 2 hours on weekdays. You are copied on the approval.', primary: 'Close' }) },
      { id: 'n3', i: 'AO', tone: 'var(--ad-tone-neutral)', t: 'Adaeze asked about the green in route B', when: '1 h ago', sheet: S({ eyebrow: 'Message', title: 'Adaeze on logo route B', icon: I.msg, body: '“Is the green in route B the same as our packaging green, or a little darker?” Adaeze, 10:12.', compose: true, composeLabel: 'Reply', composePh: 'It is a touch darker so it holds up on white labels.', vis: 'client', required: true, primary: 'Send reply', pToast: 'Sent to Adaeze. She gets an email and a portal notice.' }) },
      { id: 'n4', i: 'ZE', tone: 'var(--ad-tone-brand)', t: 'New lead: Zara Events wants an event website', when: 'Yesterday', sheet: this.clientSheet(this.clientsData()[8]) },
      { id: 'n5', i: '!', tone: 'var(--ad-tone-bad)', t: 'Reminder to Kora was not opened', when: 'Yesterday', sheet: this.clientSheet(this.clientsData()[1]) },
      { id: 'n6', i: 'DE', tone: 'var(--ad-tone-neutral)', t: 'Daniel closed the last Oak and Ivy launch check', when: 'Thursday', sheet: S({ eyebrow: 'Project', title: 'Oak and Ivy website, launch checks done', icon: I.check, iconTone: 'var(--ad-tone-good)', rows: [{ k: 'Checks', v: '7 of 7' }, { k: 'Next', v: 'Recorded handover meeting' }], body: 'Book the handover from Today. The final 20% invoice goes after it.', primary: 'Open Today', onPrimary: function () { window.location.href = 'D-Admin.dc.html'; } }) }
    ];
  }
  /* A client's summary, used by the list, search and alerts. Mira has a full page; the others show everything here. */
  clientSheet(c) {
    var self = this, I = this.icons(), S = this.sh.bind(this), lead = c.status === 'lead';
    var rows = [{ k: 'Contact', v: c.contact }, { k: 'Email', v: c.email }, { k: 'Phone', v: c.phone }];
    if (!lead) rows.push({ k: 'Client since', v: c.since }, { k: 'Outstanding', v: c.owed ? this.ngn(c.owed) + (c.late ? ', ' + this.ngn(c.late) + ' late' : '') : 'Nothing owed' }, { k: 'Portal', v: c.portal });
    else rows.push({ k: 'Interested in', v: c.services.join(', ') }, { k: 'Stage', v: c.last });
    return S({ eyebrow: lead ? 'Lead' : (c.status === 'past' ? 'Past client' : 'Client'), title: c.name, chip: lead ? 'Lead' : (c.late ? 'Payment late' : ''), tone: lead ? 'var(--ad-tone-brand)' : 'var(--ad-tone-bad)', icon: I.users, iconTone: c.tone, rows: rows,
      listTitle: lead ? '' : 'Services', list: lead ? [] : c.services.map(function (sv) { return { t: sv, s: c.live ? 'Live' : 'Delivered' }; }),
      feed: [{ t: c.last, when: c.lastWhen }],
      primary: c.id === 'mira' ? 'Open client page' : (lead ? 'Draft quote' : 'Message ' + c.contact.split(' ')[0]), secondary: lead ? 'Convert to client' : 'New invoice',
      onPrimary: function () {
        if (c.id === 'mira') { window.location.href = 'A-Client.dc.html'; return; }
        if (lead) { setTimeout(function () { self.openQuote({ client: c.name, contact: c.contact.split(' ')[0], to: c.contact + ' · ' + c.email, title: c.services[0], budget: c.id === 'zara' ? [1500000, 2500000] : null, lines: [{ t: c.services[0] + ', design and build', s: 'Up to 6 pages, mobile first', price: 1200000, on: true }, { t: 'Extra page', s: 'Each', price: 80000, qty: 2, on: true, max: 10 }, { t: 'Hosting, first year', s: 'Our account, weekly backups', price: 120000, on: false }, { t: 'Business email, 3 inboxes', s: 'Free with a website we build', price: 0, on: true, max: 3 }] }, function (T) { self.say('Quote sent to ' + c.name + ' for ' + self.ngn(T.total) + '. We tell you when they open it.'); }); }, 30); return; }
        setTimeout(function () { self.open(S({ eyebrow: 'Message', title: 'Message ' + c.contact, icon: I.msg, compose: true, composeLabel: 'Message', composePh: 'Write to ' + c.contact.split(' ')[0], vis: 'client', required: true, primary: 'Send', onPrimary: function (ctx) { self.say(ctx.vis === 'client' ? 'Sent to ' + c.contact.split(' ')[0] + '. They get an email and a portal notice.' : 'Saved as a team note on ' + c.name + '.'); } })); }, 30);
      },
      onSecondary: function () {
        if (lead) { self.ask({ eyebrow: 'Convert', title: 'Make ' + c.name + ' a client?', body: c.contact + ' gets a portal invite by email. The lead history moves to their client record, and you can start a project straight away.', ok: 'Convert and invite', icon: I.users, onOk: function () { var cv = Object.assign({}, self.state.converted); cv[c.id] = true; self.setState({ converted: cv }); self.say(c.name + ' is now a client. Portal invite sent to ' + c.email + '.'); } }, true); return 'stay'; }
        window.location.href = 'A-Money.dc.html'; return 'stay';
      } });
  }

  /* The studio's projects: 14 live (Branding 4, Social 3, Web 3, SEO 2, Apps 1, Software & AI 1), 2 waiting on clients, as on Today. */
  bookSheet(client, push, onBooked) {
    var self = this, I = this.icons(), slots = [['Wed 14 Oct, 11:00', 'Daniel is free · 60 min'], ['Thu 15 Oct, 15:00', 'Daniel is free · 60 min'], ['Fri 16 Oct, 14:00', 'Daniel and you are free · 60 min']];
    var D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var own = function (f) { if (!f || !f.own) return ''; var p = f.own.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); return D[d.getDay()] + ' ' + d.getDate() + ' ' + M[d.getMonth()] + ', ' + (f.ownT || '09:00'); };
    this.open(this.sh({ eyebrow: 'Handover meeting · ' + client, title: 'Pick a time to offer', icon: I.cal, iconTone: 'var(--ad-tone-brand)', body: 'We send ' + client + ' a booking link with the time you choose. The Google Meet is recorded and the handover document goes out after it.', listTitle: 'Times that suit the team', select: true, pick: 2, list: slots.map(function (x) { return { t: x[0], s: x[1] }; }),
      form: { own: '', ownT: '' }, fields: [{ key: 'own', type: 'datetime', label: 'Or suggest your own time', hint: 'Any day and time. We check it against the studio calendar before the link goes out.', clearable: true }],
      primary: function (ctx) { var o = own(ctx.form); return o ? 'Offer ' + o : (ctx.pick >= 0 ? 'Offer ' + slots[ctx.pick][0] : 'Offer this time'); }, selectWhy: 'Choose a time to offer, or set your own.', secondary: 'Let them choose any time', sToast: 'Booking link sent with all open times.',
      onPrimary: function (ctx) { var o = own(ctx.form), sl = slots[ctx.pick]; if (onBooked) onBooked(o || (sl && sl[0])); } }), push);
  }

  clearId(id, how, label, msg, opt) { var it = this.deck().filter(function (d) { return d.id === id; })[0]; if (it && !this.state.gone[id] && !this.state.snoozed[id]) this.clear(it, how, label, msg, opt); else if (msg) this.say(msg); }
  hideMoney() { return false; }
  projScope(p) { return true; }
  payChip(p) { var t = p.pay || ''; return /Retainer/.test(t) ? 'Retainer' : (/late|Deposit due|Deposit and/.test(t) ? 'Awaiting payment' : (/Paid in full|^Paid$/.test(t) ? 'Paid in full' : 'Deposit paid')); }
  projPageKeys() { return this.projectsData().map(function (p) { return p.id; }); }
  projPageHref(id) { return 'A-Project.dc.html?p=' + id; }
  projectsData() {
    var T = { IN: ['Ifeanyi N.', 'IN', '#000065'], CA: ['Chiamaka A.', 'CA', '#b84a00'], DE: ['Daniel E.', 'DE', '#5c5c7a'], BO: ['Bisi O.', 'BO', '#15803d'], TA: ['Tolu A.', 'TA', '#23239b'] };
    var p = function (id, name, client, cid, svc, stages, cur, lead, due, dueHot, value, pay, payTone, status, flag, next) { var L = T[lead]; return { id: id, name: name, client: client, cid: cid, svc: svc, stages: stages, cur: cur, stage: stages[cur] || 'Done', lead: L[0], leadI: L[1], leadTone: L[2], due: due, dueHot: dueHot, value: value, pay: pay, payTone: payTone, status: status, flag: flag || '', next: next }; };
    var BR = ['Discovery', 'Concepts', 'Review', 'Final files', 'Handover'], SO = ['Setup', 'Plan', 'Approve', 'Publish', 'Report'], WB = ['Discovery', 'Design', 'Build', 'Launch', 'Handover'], SE = ['Audit', 'Fix', 'Content', 'Report'], AP = ['Discovery', 'Design', 'Build', 'Test', 'Release'];
    return [
      p('mira-br', 'Brand identity', 'Mira Skincare', 'mira', 'Branding & Design', BR, 2, 'IN', 'Sat 17 Oct', false, '₦1,200,000', '50% paid', 'var(--ad-tone-good)', 'waiting', 'Waiting 9 days', 'Adaeze to choose a logo route'),
      p('mira-so', 'Social media management', 'Mira Skincare', 'mira', 'Social & Ads', SO, 0, 'CA', 'Starts 1 Nov', false, '₦300,000 a month', 'Deposit due Wed', 'var(--ad-tone-warn)', 'live', 'Blocked', 'Deposit and Instagram access'),
      p('okafor-fl', 'Firm flyers', 'Tunde Okafor Law', 'okafor', 'Branding & Design', BR, 2, 'IN', 'Thu 15 Oct', true, '₦180,000', 'Paid', 'var(--ad-tone-good)', 'live', '', 'Revision 1 in progress'),
      p('ade-menu', 'Menu redesign', "Ade's Kitchen", 'ade', 'Branding & Design', BR, 1, 'IN', 'Sat 24 Oct', false, '₦250,000', 'Deposit paid', 'var(--ad-tone-good)', 'live', '', 'Two directions on Wednesday'),
      p('lumen-tt', 'Class timetable design', 'Lumen Fitness', 'lumen', 'Branding & Design', BR, 3, 'IN', 'Tue 13 Oct', true, '₦90,000', 'Paid', 'var(--ad-tone-good)', 'live', '', 'Print files on Monday'),
      p('ade-oct', 'October content', "Ade's Kitchen", 'ade', 'Social & Ads', SO, 1, 'CA', 'Sat 31 Oct', false, '₦350,000 a month', 'Retainer', 'var(--ad-tone-brand)', 'live', '', '18 of 24 posts approved'),
      p('lumen-ads', 'Instagram ads', 'Lumen Fitness', 'lumen', 'Social & Ads', ['Brief', 'Creatives', 'Review', 'Live', 'Report'], 2, 'CA', 'Fri 16 Oct', false, '₦150,000 plus spend', '₦75,000 late', 'var(--ad-bad-ink)', 'waiting', 'With client', 'Daniel to agree the budget'),
      p('oak-web', 'Website', 'Oak and Ivy Interiors', 'oak', 'Web & Apps', WB, 4, 'DE', 'Fri 16 Oct', false, '₦2,600,000', 'Final 20% after handover', 'var(--ad-tone-warn)', 'live', '', 'Book the recorded handover'),
      p('okafor-web', 'Website care plan', 'Tunde Okafor Law', 'okafor', 'Web & Apps', ['Monthly'], 0, 'DE', 'Monthly', false, '₦40,000 a month', '₦90,000 late', 'var(--ad-bad-ink)', 'live', '', 'Domain renews 24 Oct'),
      p('halo-pages', 'Patient portal pages', 'Halo Clinics', 'halo', 'Web & Apps', WB, 2, 'DE', 'Thu 29 Oct', false, '₦600,000', 'Deposit paid', 'var(--ad-tone-good)', 'live', '', 'Booking pages in build'),
      p('bloom-seo', 'SEO retainer', 'Bloom Pharmacy', 'bloom', 'SEO', SE, 3, 'BO', 'Monthly', false, '₦300,000 a month', 'Retainer', 'var(--ad-tone-brand)', 'live', '', 'September report sent'),
      p('halo-seo', 'SEO setup', 'Halo Clinics', 'halo', 'SEO', SE, 0, 'BO', 'Sat 31 Oct', false, '₦220,000', 'Deposit paid', 'var(--ad-tone-good)', 'live', '', 'Technical audit this week'),
      p('kora-app', 'Driver app', 'Kora Logistics', 'kora', 'Apps', AP, 2, 'DE', 'Paused', true, '₦3,400,000', '₦850,000 late', 'var(--ad-bad-ink)', 'live', 'Paused', 'Build paused until milestone 2 is paid'),
      p('halo-ai', 'Booking assistant', 'Halo Clinics', 'halo', 'Software & AI', AP, 2, 'DE', 'Tue 20 Oct', false, '₦4,800,000', 'Milestone 2 on 20 Oct', 'var(--ad-tone-neutral)', 'live', '', 'Milestone 2 demo on Monday'),
      p('pine-br', 'Brand identity', 'Pinewood Bakery', 'pine', 'Branding & Design', BR, 5, 'IN', 'Done Jul 2026', false, '₦950,000', 'Paid in full', 'var(--ad-tone-good)', 'done', '', 'Handover recorded'),
      p('bloom-web', 'Website', 'Bloom Pharmacy', 'bloom', 'Web & Apps', WB, 5, 'DE', 'Done Mar 2026', false, '₦1,800,000', 'Paid in full', 'var(--ad-tone-good)', 'done', '', 'Handover recorded'),
      p('ade-sep', 'September content', "Ade's Kitchen", 'ade', 'Social & Ads', SO, 5, 'CA', 'Done 30 Sep', false, '₦350,000', 'Paid', 'var(--ad-tone-good)', 'done', '', 'Report sent 1 Oct')
    ];
  }
  projectSheet(pj) {
    var self = this, I = this.icons(), done = pj.status === 'done', team = this.teamData(), tone = pj.flag ? (pj.flag === 'Paused' || pj.flag === 'Blocked' ? 'var(--ad-tone-bad)' : 'var(--ad-tone-warn)') : (done ? 'var(--ad-tone-good)' : 'var(--ad-tone-live)');
    var hs = 0; for (var ci = 0; ci < pj.id.length; ci++) hs += pj.id.charCodeAt(ci);
    var crew = [{ name: pj.lead, i: pj.leadI, tone: pj.leadTone }].concat([team[hs % team.length], team[(hs + 2) % team.length]].filter(function (m) { return m && m.name !== pj.lead; }).slice(0, 2).map(function (m) { return { name: m.name, i: m.i, tone: m.tone }; }));
    var FILES = { 'Branding & Design': ['Logo round 2.pdf', 'Colour and type sheet.png', 'Brand guide draft.pdf'], 'Web & Apps': ['Sitemap.pdf', 'Homepage design.png', 'Launch checklist.pdf'], 'Social & Ads': ['Content pillars.pdf', 'Instagram access guide.pdf'], SEO: ['Audit report.pdf', 'Keyword list.xlsx'], Apps: ['Screens round 1.pdf', 'Build plan.pdf'], 'Software & AI': ['Flow diagram.pdf', 'Test cases.xlsx'] }[pj.svc] || ['Brief.pdf'];
    var STT = { 'Branding & Design': 'Concepts built from the colours and fonts the client chose.', 'Web & Apps': 'Pages, content and the build, with a recorded handover at the end.', 'Social & Ads': 'A monthly plan of posts the client approves before they go out.', SEO: 'An audit, fixes, and a monthly report on what moved.', Apps: 'Screens, build milestones and store release.', 'Software & AI': 'Scoping, a working build and tests the client signs off.' };
    return this.sh({ eyebrow: 'Project · ' + pj.client, title: pj.name, chip: pj.flag || (done ? 'Done' : pj.stage), tone: tone, icon: I.folder,
      attrs: [{ ic: 'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', k: 'Status', chips: [{ t: pj.flag || (done ? 'Done' : pj.stage), tone: tone, ink: '#fff' }] }, { ic: 'M4 6h16M4 12h16M4 18h10', k: 'Service', chips: [{ t: pj.svc, tone: 'var(--ad-tone-flat)', ink: 'var(--ad-on-flat)' }] }, { ic: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', k: 'Team', people: crew }, { ic: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', k: 'Due', v: pj.due }, { ic: 'M3 3h7v18H3zM14 3h7v10h-7z', k: 'Stage', v: done ? 'Done' : pj.stage + (pj.stages.length > 1 ? ', ' + (pj.cur + 1) + ' of ' + pj.stages.length : '') }].concat(this.hideMoney() ? [{ ic: 'M2 7h20v10H2zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', k: 'Billing', chips: [{ t: this.payChip(pj), tone: 'var(--ad-tone-flat)', ink: 'var(--ad-on-flat)' }] }] : [{ ic: 'M2 7h20v10H2zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', k: 'Value', v: pj.value }, { ic: 'M20 6 9 17l-5-5', k: 'Payment', v: pj.pay }]),
      tabs: [{ t: 'Description', text: (STT[pj.svc] || 'Work for this client.') + ' Next: ' + pj.next + '.' }, { t: 'Discussion', items: [{ t: pj.lead, i: pj.leadI, tone: pj.leadTone, when: 'Today, 09:12', s: pj.next + '.' }, { t: 'Client', i: pj.client.split(' ').map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(), tone: 'var(--ad-tone-neutral)', when: 'Yesterday, 16:40', s: 'Thank you, we will look at it today.' }] }, { t: 'Attachments', items: FILES.map(function (f, k) { return { t: f, i: f.split('.').pop().toUpperCase().slice(0, 3), tone: 'var(--ad-tone-bad)', when: ['Today', 'Wed 7 Oct', 'Sat 3 Oct'][k] || 'Sat 3 Oct', s: ['4.2 MB', '1.1 MB', '420 KB'][k] || '300 KB' }; }) }],
      primary: 'Open project page', secondary: done ? '' : 'Message ' + pj.lead.split(' ')[0],
      onPrimary: function () { if (self.projPageKeys().indexOf(pj.id) >= 0) window.location.href = self.projPageHref(pj.id); else self.say('The project page opens here.'); },
      onSecondary: function () {
        self.open(self.sh({ eyebrow: pj.name + ' · ' + pj.client, title: 'Message ' + pj.lead, icon: I.msg, compose: true, composeLabel: 'Message', required: true, primary: 'Send', onPrimary: function () { self.say('Sent to ' + pj.lead.split(' ')[0] + ' in the project thread.'); } }), true); return 'stay';
      } });
  }
  taskSheet(pj, onAdd) {
    var self = this, I = this.icons();
    return this.sh({ eyebrow: pj.name + ' · ' + pj.client, title: 'Add a task', icon: I.task,
      fields: [{ key: 't', label: 'Task', ph: 'For example: Resize the carousel for Stories', wide: true }, { key: 'note', label: 'Notes (optional)', type: 'area', wide: true, ph: 'What done looks like' }],
      chipSets: [{ key: 'who', label: 'Who does it', opts: this.teamData().map(function (m) { return m.name; }) }, { key: 'due', label: 'Due', opts: ['Today', 'Tomorrow', 'Sat 17 Oct', 'Tue 20 Oct'] }],
      form: { who: pj.lead, due: 'Sat 17 Oct' },
      primary: 'Add task', secondary: 'Cancel', primaryDis: function (ctx) { return (ctx.form.t || '').trim() ? '' : 'Name the task.'; },
      onPrimary: function (ctx) { if (onAdd) onAdd(ctx.form); self.say('Task added. It is on ' + ctx.form.who.split(' ')[0] + '’s My Day, due ' + ctx.form.due.toLowerCase() + '.'); } });
  }
