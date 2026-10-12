  /* ======================= Owner · Invoice and quote document =======================
     One page for both. ?new=invoice or ?new=quote starts a draft, ?no=<number> opens an existing one, &pay=1 opens Record a payment straight away.
     Documents are kept in shared memory, so Money, the client page and the project page all list what is saved here. */
  pageState() { return { pvm: 'doc', doc: null, mode: '', ra: 0, gone: {}, recorded: {}, voided: {}, refunded: {}, newInv: [], newQ: [], qst: {}, fuMeta: {}, exp: [], expGone: {}, added: [], dirty: false }; }
  navSection() { return 'Money'; }
  pageName() { var d = this.D(); return this.state.mode === 'edit' && !d.sent ? 'New ' + d.kind : (d.kind === 'quote' ? 'Quote ' : 'Invoice ') + d.no; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'new', title: 'Fill it in, check it, send it', icon: I.file, body: 'Client, dates, lines, tax and notes. The client’s copy on the right changes as you type, and the checklist says what is missing.' },
      { target: 'rail', title: 'The client’s copy', icon: I.eye, body: 'This is what they receive. Nothing is sent until you confirm the email.' },
      { target: 'new', title: 'After it is sent', icon: I.cash, body: 'Record a payment, send a reminder, refund, reconcile a bank transfer or cancel. Every change is kept in the history.' }
    ];
  }
  /* ----- the document itself ----- */
  catalog() {
    var p = function (t, s, price, svc) { return { t: t, s: svc + (price ? ' · ₦' + price.toLocaleString('en-NG') : ' · included'), price: price, svc: svc }; };
    return [p('Logo design, three routes', 'Two review rounds', 350000, 'Branding'), p('Brand guidelines', 'Colours, type, usage', 250000, 'Branding'), p('Flyer design', 'One revision, or two editions', 60000, 'Branding'), p('Social media templates', 'Square, portrait and story', 90000, 'Branding'), p('Motion graphics, per second', 'Priced by seconds', 6000, 'Branding'),
      p('Social media management, one month', 'Plan, post, report', 300000, 'Social'), p('Content calendar, 12 posts', 'Planned with approvals', 150000, 'Social'), p('Ad creatives, set of three', 'Meta or TikTok', 75000, 'Social'), p('Ad management, one month', 'Plus ad spend', 150000, 'Social'),
      p('SEO audit', 'Technical and content', 150000, 'SEO'), p('SEO retainer, one month', 'Fixes, content, report', 300000, 'SEO'), p('Local listing setup', 'Google Business and maps', 80000, 'SEO'),
      p('Website, up to 6 pages', 'Mobile first', 1200000, 'Web'), p('Extra page', 'Per page', 80000, 'Web'), p('Hosting, first year', 'Our account, weekly backups', 120000, 'Web'), p('Business email, 3 inboxes', 'Free with a website we build', 0, 'Web'), p('Website care plan, one month', 'Updates, backups, security', 40000, 'Web'),
      p('Mobile app, discovery', 'Scope, flows, estimate', 400000, 'Apps'), p('Mobile app, build milestone', 'Per milestone', 850000, 'Apps'),
      p('Software or AI, build milestone', 'Per milestone', 1200000, 'Software'), p('Rush delivery', 'Adds a second person', 250000, 'Extras'), p('Domain registration', 'In the client’s name', 18000, 'Extras')];
  }
  termsDefault(kind) { return kind === 'quote' ? 'This quote is valid until the date above. Work starts when the deposit is paid. Two review meetings and a recorded handover are included. Extra rounds are quoted before we start them.' : 'Pay by the due date with Paystack or Flutterwave. Work continues while an invoice is open and pauses when it is more than 14 days late.'; }
  blankDoc(kind, cid) {
    var all = this.sharedDocs(), n = Object.keys(all).filter(function (k) { return all[k].kind === 'quote'; }).length, t = this.today(), c = cid ? this.clientRoster().filter(function (x) { return x.id === cid; })[0] : null;
    return { no: kind === 'quote' ? 'EST-2026-0' + (15 + n) : 'INV-26-' + this.gen6(), kind: kind, client: c ? this.docClient(c) : null, project: '', issued: t, due: this.addDays(t, kind === 'quote' ? 14 : 14), valid: this.addDays(t, 14), po: '', cur: 'NGN', acct: 'Sterling USD ****0932', deposit: '30%', lines: [{ d: '', q: 1, u: '', opt: false }], vat: true, disc: { type: 'none', v: 0 }, note: '', terms: this.termsDefault(kind), sent: false, cancelled: false, qstatus: 'Draft', payments: [], history: [{ t: kind === 'quote' ? 'Quote started' : 'Invoice started', when: 'Today' }], title: '' };
  }
  docClient(c) { return { id: c.id, name: c.name, ini: c.ini, tone: c.tone, contact: c.contact, email: c.email, phone: c.phone }; }
  isoLabel(t) { var m = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.exec(t || ''); if (!m) return ''; return '2026-' + ('0' + (['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m[2]) + 1)).slice(-2) + '-' + ('0' + m[1]).slice(-2); }
  /* A document that exists only as a row in Money is rebuilt from that row, so every invoice and quote can be opened. */
  synthDoc(no) {
    var self = this, t = this.today(), num = function (v) { return parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0; };
    var cli = function (name) { var c = self.clientRoster().filter(function (x) { return x.name === name; })[0]; return c ? self.docClient(c) : { id: 'x', name: name, ini: name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(), tone: '#000065', contact: name, email: '', phone: '' }; };
    var inv = this.invAll().filter(function (r) { return r.no === no; })[0];
    if (inv) {
      var n = num(inv.amount), st = inv.status, late = /(\d+) days? late/.exec(st), soon = /in (\d+) days?/.exec(st), d = this.blankDoc('invoice');
      d.no = no; d.client = cli(inv.client); d.cur = inv.amount.charAt(0) === '$' ? 'USD' : 'NGN'; d.sent = true; d.vat = false; d.lines = [{ d: inv.for || inv.title || 'Services for ' + inv.client, q: 1, u: n, opt: false }]; d.issued = this.addDays(t, -14);
      d.due = late ? this.addDays(t, -(+late[1])) : (soon ? this.addDays(t, +soon[1]) : (/today/i.test(st) ? t : (this.isoLabel(inv.date) || this.addDays(t, 14))));
      d.history = [{ t: 'Invoice sent to ' + inv.client, when: this.fmtDate(d.issued) }];
      if (inv.tab === 'paid') { var iso = this.isoLabel(inv.date) || t; d.payments = [{ rc: this.rcpt(inv), iso: iso, when: this.fmtDate(iso), method: inv.method || 'Paystack', ref: '', by: 'The client', amt: n }]; d.history.unshift({ t: 'Paid by ' + (inv.method || 'Paystack') + ', receipt ' + this.rcpt(inv), when: this.fmtDate(iso) }); if (st === 'Refunded') { d.payments.push({ rc: 'REF-' + no.slice(-4), iso: iso, when: this.fmtDate(iso), method: 'Refund', ref: '', by: 'Babatope A.', amt: -n }); d.history.unshift({ t: 'Refunded in full', when: this.fmtDate(iso) }); } }
      return d;
    }
    var q = this.quotesAll().filter(function (r) { return r.no === no; })[0];
    if (q) { var dq = this.blankDoc('quote'); dq.no = no; dq.client = cli(q.client); dq.title = q.title; dq.lines = [{ d: q.title, q: 1, u: q.value, opt: false }]; dq.vat = false; dq.sent = q.sent !== 'Not sent'; dq.qstatus = q.st; dq.valid = this.isoLabel(q.valid) || this.addDays(t, 14); dq.history = [{ t: dq.sent ? 'Quote sent to ' + q.to : 'Quote started', when: q.sent }]; return dq; }
    return null;
  }
  buildDoc() {
    var u = (typeof window !== 'undefined' && window.location.search) || '', g = function (k) { var m = new RegExp('[?&]' + k + '=([^&]*)').exec(u); return m ? decodeURIComponent(m[1]) : ''; };
    var no = g('no'), nw = g('new'), saved = no ? this.sharedDocs()[no] : null;
    if (saved) return { doc: JSON.parse(JSON.stringify(saved)), mode: saved.sent || saved.kind === 'quote' && saved.qstatus !== 'Draft' ? 'view' : 'edit' };
    var sy = no ? this.synthDoc(no) : null;
    if (sy) return { doc: sy, mode: sy.sent ? 'view' : 'edit' };
    return { doc: this.blankDoc(nw === 'quote' ? 'quote' : 'invoice', g('client')), mode: 'edit' };
  }
  D() { var s = this.state; if (!s.doc) { var b = this.buildDoc(); s.doc = b.doc; s.mode = b.mode; } return s.doc; }
  upd(patch, keep) { var d = Object.assign({}, this.D(), patch); this.setState({ doc: d, dirty: true, ra: keep ? this.state.ra : this.state.ra + 1 }); }
  persist(d) { var all = Object.assign({}, this.sharedDocs()); all[d.no] = JSON.parse(JSON.stringify(d)); this.setShared('docs', all); }
  here(no) { try { var u = window.location.pathname.replace(/[^/]*$/, ''); window.history.replaceState(null, '', window.location.pathname + '?no=' + encodeURIComponent(no)); } catch (e) {} }
  go(no, extra) { window.location.href = 'A-Invoice.dc.html?no=' + encodeURIComponent(no) + (extra || ''); }
  log(d, t) { return Object.assign({}, d, { history: [{ t: t, when: 'Today, 10:30' }].concat(d.history || []) }); }
  /* problems that stop a send, in the order a person fixes them */
  problems(d) {
    var out = [], self = this, T = this.docTotals(d), full = d.lines.filter(function (l) { return (l.d || '').trim() && +l.u > 0 && +l.q > 0; }), half = d.lines.filter(function (l) { return ((l.d || '').trim() || +l.u > 0) && !((l.d || '').trim() && +l.u > 0 && +l.q > 0); });
    if (!d.client) out.push('Choose who it is for.');
    if (!full.length) out.push('Add at least one line with a description and a price.');
    if (half.length) out.push('Finish or remove the incomplete line.');
    if (d.kind === 'invoice' && d.due < d.issued) out.push('The due date is before the issue date.');
    if (d.kind === 'quote' && d.valid <= this.today()) out.push('Choose a validity date after today.');
    if (T.total <= 0 && full.length) out.push('The total is zero. Check the discount.');
    if (d.client && !d.client.email) out.push('This client has no email on record. Add one first.');
    return out;
  }
  /* ----- the lists that need a search bar: client, price list ----- */
  pickClient() {
    var self = this, I = this.icons(), d = this.D(), cs = this.clientRoster().filter(function (c) { return d.kind === 'quote' || c.status !== 'past'; });
    this.open(this.sh({ eyebrow: d.kind === 'quote' ? 'Quote' : 'Invoice', title: 'Who is it for?', icon: I.users, body: 'Five at a time. Search by name, contact, email or phone. A returning client keeps one record, so pick them rather than adding them again.', listTitle: d.kind === 'quote' ? 'Clients and leads' : 'Clients', select: true, selectWhy: 'Choose the client.', searchPh: 'Search clients', create: this.clientCreate('Add a new client'),
      list: cs.map(function (c) { return { t: c.name, s: c.contact + ' · ' + c.email + (c.status === 'lead' ? ' · lead' : ''), ini: c.ini, av: c.tone, ref: c, k: c.phone }; }), pick: d.client ? cs.map(function (c) { return c.id; }).indexOf(d.client.id) : -1,
      primary: function (ctx) { return ctx.item ? 'Bill ' + ctx.item.ref.name : 'Choose'; }, secondary: 'Cancel',
      onPrimary: function (ctx) { var c = ctx.item.ref; self.landClient(c); var same = d.client && d.client.id === c.id; self.upd({ client: self.docClient(c), project: same ? d.project : '' }); self.say(c.name + ' is the client.'); } }));
  }
  projectsOf(d) { var self = this; return d.client ? this.projectsData().filter(function (p) { return p.cid === d.client.id && p.status !== 'done'; }) : []; }
  dateSheet(key, label, min) {
    var self = this, I = this.icons(), d = this.D();
    this.open(this.sh({ eyebrow: d.kind === 'quote' ? 'Quote' : 'Invoice', title: label, icon: I.cal, form: { d: d[key] }, fields: [{ key: 'd', type: 'date', label: label, required: true }], primary: 'Set date', secondary: 'Cancel',
      primaryDis: function (ctx) { var v = ctx.form.d; if (!v) return 'Choose a date.'; if (min && v < (typeof min === 'function' ? min() : min)) return 'Choose a date on or after ' + self.fmtDate(typeof min === 'function' ? min() : min) + '.'; return ''; },
      onPrimary: function (ctx) { var p = {}; p[key] = ctx.form.d; self.upd(p); } }));
  }
  fromList() {
    var self = this, I = this.icons(), cat = this.catalog();
    this.open(this.sh({ eyebrow: 'Lines', title: 'Add from the price list', icon: I.list, body: 'Tick as many as you need. They land as lines you can still edit. Five at a time, with a search for the rest.', listTitle: 'Price list', select: true, multi: true, selectWhy: 'Tick at least one.', searchPh: 'Search the price list', list: cat.map(function (c) { return { t: c.t, s: c.s }; }),
      primary: function (ctx) { var n = (ctx.picks || []).length; return n ? 'Add ' + n + (n === 1 ? ' line' : ' lines') : 'Add lines'; }, secondary: 'Cancel',
      onPrimary: function (ctx) { var d = self.D(), keep = d.lines.filter(function (l) { return (l.d || '').trim() || +l.u > 0; }), add = (ctx.picks || []).map(function (i) { return { d: cat[i].t, q: 1, u: cat[i].price, opt: false }; }); self.upd({ lines: keep.concat(add) }); self.say(add.length + (add.length === 1 ? ' line' : ' lines') + ' added.'); } }));
  }
  setLine(i, patch) { var d = this.D(), ls = d.lines.map(function (l, k) { return k === i ? Object.assign({}, l, patch) : l; }); this.upd({ lines: ls }, true); this.setState({ ra: this.state.ra + 1 }); }
  lineMenu(i) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), d = this.D(), n = d.lines.length, mv = function (a, b) { var ls = d.lines.slice(); var t = ls[a]; ls[a] = ls[b]; ls[b] = t; self.upd({ lines: ls }); };
    var out = [it('Duplicate line', I.plus, function () { var ls = d.lines.slice(); ls.splice(i + 1, 0, Object.assign({}, d.lines[i])); self.upd({ lines: ls }); })];
    if (d.kind === 'quote') out.push(it(d.lines[i].opt ? 'Make it included' : 'Make it optional', I.check, function () { self.setLine(i, { opt: !d.lines[i].opt }); }, { hint: 'Optional lines are not in the total unless the client ticks them' }));
    if (i > 0) out.push(it('Move up', I.up || I.plus, function () { mv(i, i - 1); }));
    if (i < n - 1) out.push(it('Move down', I.down || I.plus, function () { mv(i, i + 1); }));
    out.push(this.menuSep(), it('Remove line', I.trash, function () { var ls = d.lines.filter(function (l, k) { return k !== i; }); self.upd({ lines: ls.length ? ls : [{ d: '', q: 1, u: '', opt: false }] }); }, { danger: true }));
    return out;
  }
  /* ----- actions ----- */
  clientCopy(d) { var T = this.docTotals(d), c = d.client || { contact: '' }, first = (c.contact || '').split(' ')[0]; return 'Hello ' + first + ',\n' + (d.kind === 'quote' ? 'Here is your quote for ' + (d.title || d.lines[0].d) + ': ' + this.docMoney(d, T.total) + '. It is valid until ' + this.fmtDate(d.valid) + '. You can accept it in one tap from the link below.' : 'Here is your invoice ' + d.no + ': ' + this.docMoney(d, T.total) + ', due ' + this.fmtDate(d.due) + '. Pay in one tap with ' + (d.cur === 'USD' ? 'a transfer to the USD account' : 'Paystack or Flutterwave') + ' from the link below.') + (d.note ? '\n\n' + d.note : ''); }
  saveDraft() {
    var self = this, d = this.D();
    if (!d.client) { this.say('Choose who it is for before saving.'); return; }
    var title = d.title || (d.lines[0] && d.lines[0].d) || '';
    var nd = Object.assign({}, d, { title: title }); this.persist(nd); this.setState({ doc: nd, dirty: false });
    this.here(d.no); this.say('Saved. ' + d.no + ' is a draft in Money.', { undo: function () { var all = Object.assign({}, self.sharedDocs()); delete all[d.no]; self.setShared('docs', all); } });
  }
  cancelEdit() { var self = this, d = this.D(), sv = this.sharedDocs()[d.no]; if (!sv) { window.location.href = 'A-Money.dc.html'; return; } this.setState({ doc: JSON.parse(JSON.stringify(sv)), mode: 'view', dirty: false, ra: this.state.ra + 1 }); this.say('No changes were saved.'); }
  review() {
    var self = this, I = this.icons(), d = this.D(), P = this.problems(d);
    if (P.length) { this.say(P[0]); return; }
    var T = this.docTotals(d), isQ = d.kind === 'quote', resend = d.sent;
    this.ask({ eyebrow: resend ? 'Send the corrected copy' : (isQ ? 'Send quote' : 'Send invoice'), title: (resend ? 'Send the corrected ' : 'Send ') + (isQ ? 'quote ' : 'invoice ') + d.no + ' for ' + this.docMoney(d, T.total) + ' to ' + d.client.name + '?', body: isQ ? 'It is valid until ' + this.fmtDate(d.valid) + '. We tell you when it is opened. ' + (d.deposit && d.deposit !== 'None' ? 'When they accept, the ' + d.deposit + ' deposit invoice is made for you.' : '') : 'It is due ' + this.fmtDate(d.due) + '. The client pays with ' + (d.cur === 'USD' ? 'a transfer to the USD account' : 'Paystack or Flutterwave') + ' and a receipt follows by itself.', to: d.client.contact + ' · ' + d.client.email, subject: (isQ ? 'Quote ' : 'Invoice ') + d.no + (d.title ? ': ' + d.title : ''), preview: this.clientCopy(d), ok: isQ ? 'Send quote' : 'Send invoice', icon: I.send,
      onOk: function () {
        var title = d.title || (d.lines[0] && d.lines[0].d) || '', nd = self.log(Object.assign({}, d, { sent: true, title: title, qstatus: isQ ? 'Sent' : d.qstatus }), (resend ? 'Corrected copy sent to ' : (isQ ? 'Quote sent to ' : 'Invoice sent to ')) + d.client.name);
        self.persist(nd); self.landClient(d.client); self.setState({ sheet: null, stack: [], doc: nd, mode: 'view', dirty: false, ra: self.state.ra + 1 }); self.here(d.no);
        self.say(d.no + ' sent to ' + d.client.contact.split(' ')[0] + '. It is at the top of ' + (isQ ? 'Quotes' : 'Invoices') + '.');
      } });
  }
  recordPay() {
    var self = this, I = this.icons(), d = this.D(), T = this.docTotals(d), fmt = function (n) { return self.docMoney(d, n); }, M = ['Bank transfer', 'Cash', 'POS', 'Cheque', 'Other'];
    if (d.cancelled || T.owed <= 0) { this.say(d.cancelled ? 'This invoice is cancelled.' : 'Nothing is owed on this invoice.'); return; }
    var ok = function (v) { return /^\d[\d,]*$/.test((v || '').trim()); }, num = function (v) { return parseInt(String(v).replace(/,/g, ''), 10) || 0; };
    this.open(this.sh({ eyebrow: 'Record a payment', title: d.no + ' · ' + d.client.name, icon: I.cash, iconTone: 'var(--ad-tone-good)', keepOpen: true, body: 'For money that came in outside Paystack and Flutterwave. A receipt goes to the client. ' + fmt(T.owed) + ' is owed.',
      form: { amt: String(T.owed), when: this.today(), ref: '', method: 'Bank transfer' }, fields: [{ key: 'amt', label: 'Amount received', mode: 'numeric', hint: 'A part payment is fine. The balance stays open.', check: function (v) { return v.trim() && !ok(v) ? 'Use numbers only, for example 450000.' : (ok(v) && num(v) > T.owed ? 'That is more than the ' + fmt(T.owed) + ' owed.' : ''); } }, { key: 'when', type: 'date', label: 'Received on', required: true }, { key: 'ref', label: 'Reference', ph: 'Transfer narration, cheque number or note', wide: true }],
      chipSets: [{ key: 'method', label: 'How it was paid', opts: M }], primary: function (ctx) { var n = num(ctx.form.amt); return ok(ctx.form.amt) && n ? 'Record ' + fmt(n) : 'Record payment'; }, secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form; if (!ok(f.amt) || !num(f.amt)) return 'Add the amount, numbers only.'; if (num(f.amt) > T.owed) return 'That is more than is owed.'; if (!f.when) return 'Choose the date it arrived.'; if (!f.method) return 'Choose how it was paid.'; return ''; },
      onPrimary: function (ctx) {
        var f = ctx.form, n = num(f.amt), cur = self.D(), all = self.sharedDocs(), count = Object.keys(all).reduce(function (a, k) { return a + (all[k].payments || []).length; }, 0), rc = 'RCT-2026-0' + (44 + count);
        var nd = self.log(Object.assign({}, cur, { payments: (cur.payments || []).concat([{ rc: rc, iso: f.when, when: self.fmtDate(f.when), method: f.method, ref: (f.ref || '').trim() || 'None given', by: 'Babatope A.', amt: n }]) }), fmt(n) + ' received by ' + f.method.toLowerCase() + ', receipt ' + rc);
        self.persist(nd); self.setState({ sheet: null, stack: [], doc: nd, ra: self.state.ra + 1 });
        var left = self.docTotals(nd).owed; self.say(left ? fmt(n) + ' recorded. ' + fmt(left) + ' is still owed. Receipt ' + rc + ' sent.' : 'Paid in full. Receipt ' + rc + ' sent to ' + cur.client.contact.split(' ')[0] + '.');
      } }));
  }
  refundPay(p) {
    var self = this, I = this.icons(), d = this.D(), fmt = function (n) { return self.docMoney(d, n); }, hasRef = (d.payments || []).some(function (x) { return x.amt < 0 && x.ref === 'Refund of ' + p.rc; });
    if (hasRef) { this.say(p.rc + ' is already refunded.'); return; }
    this.ask({ eyebrow: 'Refund', title: 'Refund ' + fmt(p.amt) + ' to ' + d.client.name + '?', body: 'This records the refund against ' + p.rc + '. Money for Paystack or Flutterwave payments is returned from their dashboards. The client is emailed.', to: d.client.contact + ' · ' + d.client.email, subject: 'Refund for ' + d.no, preview: 'Hello ' + d.client.contact.split(' ')[0] + ',\nWe have refunded ' + fmt(p.amt) + ' for invoice ' + d.no + '. It reaches you in the usual time for your bank.', needAck: true, ackText: 'A refund cannot be taken back.', ok: 'Refund ' + fmt(p.amt), icon: I.cash, tone: 'var(--ad-tone-bad)', danger: true,
      onOk: function () { var cur = self.D(), nd = self.log(Object.assign({}, cur, { payments: cur.payments.concat([{ rc: 'REF-' + p.rc.slice(-4), iso: self.today(), when: self.fmtDate(self.today()), method: 'Refund', ref: 'Refund of ' + p.rc, by: 'Babatope A.', amt: -p.amt }]) }), fmt(p.amt) + ' refunded against ' + p.rc); self.persist(nd); self.setState({ doc: nd, ra: self.state.ra + 1 }); self.say(fmt(p.amt) + ' refunded. ' + d.client.contact.split(' ')[0] + ' is told by email.'); } });
  }
  remind() {
    var self = this, I = this.icons(), d = this.D(), T = this.docTotals(d), late = d.due < this.today();
    this.ask({ eyebrow: 'Reminder', title: 'Remind ' + d.client.contact.split(' ')[0] + ' about ' + d.no + '?', body: this.docMoney(d, T.owed) + ' is owed' + (late ? ', ' + Math.abs(this.docDays(d.due, this.today())) + ' days late' : ', due ' + this.fmtDate(d.due)) + '. The ' + (late ? 'polite reminder' : 'friendly nudge') + ' carries the Paystack and Flutterwave link.', to: d.client.contact + ' · ' + d.client.email, subject: late ? 'A reminder about invoice ' + d.no : 'Invoice ' + d.no + ' is due ' + this.fmtDate(d.due), preview: 'Hello ' + d.client.contact.split(' ')[0] + ',\n' + (late ? 'Invoice ' + d.no + ' is past its due date.' : 'A quick note that invoice ' + d.no + ' is due on ' + this.fmtDate(d.due) + '.') + ' ' + this.docMoney(d, T.owed) + ' is open. You can pay in one tap from the link below.', ok: 'Send reminder', icon: I.mail, tone: 'var(--ad-tone-warn)',
      onOk: function () { self.say('Sending in 8s', { delay: 8, pending: function (n) { return 'Reminder to ' + d.client.contact.split(' ')[0] + ' in ' + n + 's'; }, cancel: function () {}, cancelled: 'Cancelled. Nothing was sent.', done: function () { var nd = self.log(self.D(), 'Reminder sent to ' + d.client.name); self.persist(nd); self.setState({ doc: nd, ra: self.state.ra + 1 }); } }); } });
  }
  cancelDoc() {
    var self = this, I = this.icons(), d = this.D();
    this.ask({ eyebrow: 'Cancel', title: 'Cancel ' + d.no + '?', body: 'The pay link stops working and ' + d.client.name + ' is told it was cancelled. The number stays in Money as Cancelled and is never reused.', needAck: true, ackText: 'Cancelling cannot be undone. You can issue a new invoice instead.', ok: 'Cancel invoice', danger: true, icon: I.block || I.trash, tone: 'var(--ad-tone-bad)', onOk: function () { var nd = self.log(Object.assign({}, self.D(), { cancelled: true }), 'Invoice cancelled'); self.persist(nd); self.setState({ doc: nd, ra: self.state.ra + 1 }); self.say(d.no + ' cancelled.'); } });
  }
  editSent() {
    var self = this, I = this.icons(), d = this.D();
    if ((d.payments || []).length) { this.say('Payments are already recorded, so the lines are locked. Refund first, or issue a new invoice.'); return; }
    this.ask({ eyebrow: 'Edit', title: 'Edit ' + d.no + '?', body: d.client.name + ' already has this copy. When you send the changes they get a corrected one and the old link shows the new numbers.', ok: 'Edit it', icon: I.edit, onOk: function () { self.setState({ sheet: null, stack: [], mode: 'edit', ra: self.state.ra + 1 }); } });
  }
  quoteStatus(to) {
    var self = this, I = this.icons(), d = this.D(), A = to === 'Accepted';
    this.ask({ eyebrow: 'Quote', title: 'Mark ' + d.no + ' ' + to.toLowerCase() + '?', body: A ? d.client.name + ' said yes outside the portal. The project can start, and you can make the ' + (d.deposit && d.deposit !== 'None' ? d.deposit + ' deposit ' : '') + 'invoice next.' : 'It moves to ' + to + '. You can still duplicate it into a new quote.', ok: 'Mark ' + to.toLowerCase(), icon: A ? I.check : I.block || I.trash, tone: A ? 'var(--ad-tone-good)' : 'var(--ad-tone-neutral)', onOk: function () { var nd = self.log(Object.assign({}, self.D(), { qstatus: to }), 'Marked ' + to.toLowerCase()); self.persist(nd); self.setState({ doc: nd, ra: self.state.ra + 1 }); self.say(d.no + ' is ' + to.toLowerCase() + '.' + (A ? ' Create the invoice from the button above.' : '')); } });
  }
  invoiceFromQuote() {
    var self = this, d = this.D(), T = this.docTotals(d), dep = T.dep, no = 'INV-26-' + this.gen6();
    var nd = this.blankDoc('invoice'); nd.no = no; nd.client = d.client; nd.project = d.project; nd.po = d.po; nd.cur = d.cur; nd.vat = d.vat; nd.disc = dep ? { type: 'none', v: 0 } : d.disc; nd.title = dep ? 'Deposit, ' + d.deposit + ' of ' + (d.title || d.lines[0].d) : (d.title || d.lines[0].d);
    nd.lines = dep ? [{ d: nd.title, q: 1, u: Math.round(dep / (d.vat ? 1.075 : 1)), opt: false }] : d.lines.filter(function (l) { return !l.opt; }).map(function (l) { return Object.assign({}, l); });
    nd.history = [{ t: 'Started from quote ' + d.no, when: 'Today, 10:30' }];
    this.persist(nd); var q = this.log(Object.assign({}, d, { invoiced: no }), 'Invoice ' + no + ' started from this quote'); this.persist(q); this.go(no);
  }
  duplicate() {
    var d = this.D(), nd = this.blankDoc(d.kind); nd.client = d.client; nd.project = d.project; nd.lines = d.lines.map(function (l) { return Object.assign({}, l); }); nd.vat = d.vat; nd.disc = Object.assign({}, d.disc); nd.cur = d.cur; nd.note = d.note; nd.terms = d.terms; nd.title = d.title; nd.deposit = d.deposit; nd.history = [{ t: 'Copied from ' + d.no, when: 'Today, 10:30' }];
    this.persist(nd); this.go(nd.no);
  }
  preview() { var d = this.D(), T = this.docTotals(d); this.openFile({ name: d.no + '.pdf', project: d.client ? d.client.name : '', view: 'doc', ref: d.no, docTitle: (d.kind === 'quote' ? 'Quote · ' : 'Invoice · ') + this.docMoney(d, T.total), when: this.fmtDate(d.issued), size: '190 KB', tone: 'var(--ad-tone-bad)' }); }
  remSteps(d) { var base = [['b3', 'Friendly note', -3, 'Three days before it is due'], ['d0', 'On the due date', 0, 'The day it is due'], ['a3', 'Polite reminder', 3, 'Three days late'], ['a7', 'Weekly nudge', 7, 'Every week after that, until paid'], ['a14', 'Final notice', 14, 'Fourteen days late. Says work pauses.']], on = d.rem || { b3: true, d0: true, a3: true, a7: false, a14: true }; return base.map(function (x) { return { k: x[0], t: x[1], off: x[2], note: x[3], on: !!on[x[0]] }; }); }
  editRem() {
    var self = this, I = this.icons(), d = this.D(), steps = this.remSteps(d);
    this.open(this.sh({ eyebrow: 'Reminders', title: 'Reminders for ' + d.no, icon: I.mail, keepOpen: true, body: 'Each one is an email with the Paystack and Flutterwave link. They stop the moment the invoice is paid or cancelled. This schedule is for this invoice only. The default is in Settings.', form: { on: steps.filter(function (x) { return x.on; }).map(function (x) { return x.t; }) }, chipSets: [{ key: 'on', label: 'Send these', multi: true, opts: steps.map(function (x) { return x.t; }), hint: 'The final notice is the firmest message we send.' }], primary: 'Save the schedule', secondary: 'Cancel',
      onPrimary: function (ctx) { var r = {}; steps.forEach(function (x) { r[x.k] = ctx.form.on.indexOf(x.t) >= 0; }); var nd = self.log(Object.assign({}, self.D(), { rem: r }), 'Reminder schedule changed'); self.persist(nd); self.setState({ doc: nd, ra: self.state.ra + 1 }); self.say('Saved. ' + Object.keys(r).filter(function (k) { return r[k]; }).length + ' reminders are set for ' + d.no + '.'); } }));
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), d = this.D(), T = this.docTotals(d);
    if (pop.kind === 'line') return this.lineMenu(+pop.id);
    if (pop.kind === 'pay') { var p = (d.payments || []).filter(function (x) { return x.rc === pop.id; })[0]; if (!p) return []; var out = [it('Download receipt', I.down, function () { self.openFile({ name: p.rc + '.pdf', project: d.client.name, view: 'doc', ref: p.rc, docTitle: 'Receipt · ' + self.docMoney(d, Math.abs(p.amt)), when: p.when, size: '96 KB', tone: 'var(--ad-tone-bad)' }); }), it('Email the receipt again', I.mail, function () { self.say('Receipt ' + p.rc + ' sent to ' + d.client.contact.split(' ')[0] + '.'); }), it('Match against the bank', I.cash, function () { window.location.href = 'A-Reconcile.dc.html'; }, { hint: 'Reconcile' })]; if (p.amt > 0) out.push(this.menuSep(), it('Refund…', I.cash, function () { self.refundPay(p); }, { danger: true })); return out; }
    if (pop.kind !== 'chores') return [];
    var out2 = [];
    if (this.state.mode === 'edit') return [it('Preview the PDF', I.eye, function () { self.preview(); }), it('Duplicate into a new draft', I.plus, function () { self.saveDraft(); setTimeout(function () { self.duplicate(); }, 60); }), this.menuSep(), it('Discard and go back to Money', I.trash, function () { window.location.href = 'A-Money.dc.html'; }, { danger: true })];
    out2.push(it('Preview the PDF', I.eye, function () { self.preview(); }), it('Copy the link', I.link, function () { self.say('Link copied. ' + (d.kind === 'quote' ? 'The client accepts from it.' : 'The client pays from it.')); }));
    if (d.kind === 'invoice' && !d.cancelled) out2.push(it('Edit invoice', I.edit, function () { self.editSent(); }, { hint: (d.payments || []).length ? 'Locked after a payment' : '' }));
    if (d.kind === 'quote' && ['Sent', 'Opened'].indexOf(d.qstatus) >= 0) out2.push(it('Edit and resend', I.edit, function () { self.setState({ mode: 'edit', ra: self.state.ra + 1 }); }));
    out2.push(it('Duplicate', I.plus, function () { self.duplicate(); }));
    if (d.kind === 'invoice') out2.push(it('Match against the bank', I.cash, function () { window.location.href = 'A-Reconcile.dc.html'; }, { hint: 'Reconcile' }));
    if (d.kind === 'quote' && ['Sent', 'Opened'].indexOf(d.qstatus) >= 0) out2.push(this.menuSep(), it('Mark declined', I.block || I.trash, function () { self.quoteStatus('Declined'); }));
    if (d.kind === 'invoice' && !d.cancelled && T.paid <= 0) out2.push(this.menuSep(), it('Cancel invoice…', I.block || I.trash, function () { self.cancelDoc(); }, { danger: true }));
    return out2;
  }
  renderVals() {
    var s = this.state, self = this, d = this.D(), I = this.icons(), isQ = d.kind === 'quote', edit = s.mode === 'edit', T = this.docTotals(d), st = this.docStatus(d), cur = function (n) { return self.docMoney(d, n); };
    if (/[?&]pay=1/.test((typeof window !== 'undefined' && window.location.search) || '') && !this._paid && !edit) { this._paid = true; setTimeout(function () { self.recordPay(); }, 500); }
    var G = 'var(--ad-tone-good)', W = 'var(--ad-tone-warn)', B = 'var(--ad-tone-bad)', ink = function (t) { return t === 'var(--ad-tone-flat)' ? 'var(--ad-on-flat)' : '#fff'; };
    var chip = edit && !d.sent ? 'Draft' : st.t, chipTone = edit && !d.sent ? 'var(--ad-tone-flat)' : st.tone;
    var full = d.lines.filter(function (l) { return (l.d || '').trim() && +l.u > 0 && +l.q > 0; }), counted = full.filter(function (l) { return !l.opt; });
    var totRows = [{ k: 'Subtotal', v: cur(T.sub), cls: '' }];
    if (T.disc) totRows.push({ k: 'Discount' + (d.disc.type === 'pct' ? ' (' + d.disc.v + '%)' : ''), v: '-' + cur(T.disc), cls: '' });
    if (d.vat) totRows.push({ k: 'VAT 7.5%', v: cur(T.vat), cls: '' });
    totRows.push({ k: 'Total', v: cur(T.total), cls: 'tot' });
    if (!edit && !isQ) { if (T.paid) totRows.push({ k: 'Paid', v: '-' + cur(T.paid), cls: '' }); totRows.push({ k: 'Balance', v: cur(T.owed), cls: 'tot' }); }
    var dueDays = this.docDays(d.due, this.today()), isPaid = !isQ && T.total > 0 && T.owed <= 0;
    var figs = isQ ? [{ label: 'Total', value: cur(T.total), note: counted.length + ' lines' + (d.lines.some(function (l) { return l.opt; }) ? ' plus optional' : ''), col: 'var(--ad-dim)', tile: 'var(--ad-tone-brand)', ic: I.file }, { label: 'Valid until', value: this.fmtDate(d.valid), note: this.docDays(d.valid, this.today()) < 0 ? 'Expired' : this.docDays(d.valid, this.today()) + ' days left', col: this.docDays(d.valid, this.today()) <= 3 ? 'var(--ad-accent-ink)' : 'var(--ad-dim)', tile: 'var(--ad-tone-live)', ic: I.clock }, { label: 'Deposit to start', value: T.dep ? cur(T.dep) : 'None', note: T.dep ? d.deposit + ' of the total' : 'Work starts on accept', col: 'var(--ad-dim)', tile: G, ic: I.cash }]
      : [{ label: 'Total', value: cur(T.total), note: d.vat ? 'Includes 7.5% VAT' : 'No VAT', col: 'var(--ad-dim)', tile: 'var(--ad-tone-brand)', ic: I.file }, { label: 'Paid', value: cur(T.paid), note: (d.payments || []).length + ((d.payments || []).length === 1 ? ' payment' : ' payments'), col: T.paid ? 'var(--ad-good-ink, #15803d)' : 'var(--ad-dim)', tile: G, ic: I.check }, { label: 'Owed', value: cur(T.owed), note: isPaid ? 'Settled' : (d.cancelled ? 'Cancelled' : (dueDays < 0 ? Math.abs(dueDays) + ' days late' : 'Due ' + this.fmtDate(d.due))), col: isPaid ? 'var(--ad-dim)' : (dueDays < 0 && !d.cancelled ? 'var(--ad-bad-ink)' : 'var(--ad-dim)'), tile: isPaid ? 'var(--ad-tone-neutral)' : (dueDays < 0 ? B : W), ic: I.cash }];
    /* the buttons in the head depend on what the document is and where it stands */
    var a1 = ['', null, false], a2 = ['', null];
    if (!edit) {
      if (isQ) {
        if (['Sent', 'Opened'].indexOf(d.qstatus) >= 0) { a1 = ['Mark accepted', function () { self.quoteStatus('Accepted'); }, false]; a2 = ['Edit and resend', function () { self.setState({ mode: 'edit', ra: s.ra + 1 }); }]; }
        else if (d.qstatus === 'Accepted') { a1 = [d.invoiced ? 'Open invoice ' + d.invoiced : (T.dep ? 'Create the deposit invoice' : 'Create the invoice'), function () { if (d.invoiced) self.go(d.invoiced); else self.invoiceFromQuote(); }, false]; a2 = ['Preview the PDF', function () { self.preview(); }]; }
        else { a1 = ['Duplicate', function () { self.duplicate(); }, false]; a2 = ['Preview the PDF', function () { self.preview(); }]; }
      } else if (d.cancelled) { a1 = ['Duplicate', function () { self.duplicate(); }, false]; a2 = ['Preview the PDF', function () { self.preview(); }]; }
      else if (isPaid) { a1 = ['Preview the receipt', function () { var p = d.payments[d.payments.length - 1]; self.openFile({ name: p.rc + '.pdf', project: d.client.name, view: 'doc', ref: p.rc, docTitle: 'Receipt · ' + cur(T.total), when: p.when, size: '96 KB', tone: 'var(--ad-tone-bad)' }); }, false]; a2 = ['Resend receipt', function () { self.say('Receipt sent to ' + d.client.contact.split(' ')[0] + '.'); }]; }
      else { a1 = ['Record a payment', function () { self.recordPay(); }, false]; a2 = ['Send a reminder', function () { self.remind(); }]; }
    }
    var pays = (d.payments || []).map(function (p) { return Object.assign({}, p, { amt: (p.amt < 0 ? '-' : '') + cur(Math.abs(p.amt)), menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'pay', p.rc, 250, 230, 'Actions for ' + p.rc); } }); });
    var prj = this.projectsOf(d), chipSet = function (opts, isOn, pick) { return opts.map(function (o) { var on = isOn(o); return { t: o, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { pick(o); } }; }); };
    var projChips = chipSet(['No project'].concat(prj.map(function (p) { return p.name; })), function (o) { return (o === 'No project' && !d.project) || o === d.project; }, function (o) { self.upd({ project: o === 'No project' ? '' : o }); });
    var checks = [[!!d.client, 'Client chosen'], [full.length > 0, 'At least one complete line'], [!this.problems(d).some(function (p) { return /incomplete/.test(p); }), 'No half-filled lines'], [isQ ? d.valid > this.today() : d.due >= d.issued, isQ ? 'Valid until a future date' : 'Due on or after the issue date'], [!!(d.client && d.client.email), 'Client has an email to send to']].map(function (c) { return { t: c[1], cls: c[0] ? '' : 'no', d: c[0] ? 'M5 12l5 5L20 7' : 'M12 8v5M12 17h.01' }; });
    var ledeB = isQ ? cur(T.total) + ' · valid until ' + this.fmtDate(d.valid) : (isPaid ? 'Paid in full' : cur(T.owed) + ' owed');
    var title = edit ? (d.sent ? 'Edit ' : 'New ') + (isQ ? 'quote' : 'invoice') : (isQ ? 'Quote ' : 'Invoice ') + d.no;
    var lede = edit ? (d.client ? 'For ' + d.client.name + '. ' : 'Choose a client first. ') + 'Nothing is sent until you confirm the email.' : (d.client ? d.client.name : '') + (d.project ? ' · ' + d.project : '') + ' · ' + (isQ ? 'sent ' : 'issued ') + this.fmtDate(d.issued) + ' ·';
    var discOn = d.disc && d.disc.type !== 'none';
    return Object.assign(this.kit(), this.extraVals ? this.extraVals() : {}, {
      hasRem: !edit && !isQ && !d.cancelled && !isPaid, remNote: 'Stops by itself when it is paid.', editRem: function () { self.editRem(); }, remRows: this.remSteps(d).map(function (x) { var iso = self.addDays(d.due, x.off), past = iso < self.today(), t = self.today() === iso; return { t: x.t, when: x.on ? self.fmtDate(iso) + ' · ' + x.note : 'Off · ' + x.note, state: !x.on ? 'Off' : (past ? 'Sent' : (t ? 'Today' : 'Booked')), tone: !x.on ? 'var(--ad-tone-flat)' : (past ? 'var(--ad-tone-good)' : (t ? 'var(--ad-tone-live)' : 'var(--ad-tone-brand)')), ink: !x.on ? 'var(--ad-on-flat)' : '#fff' }; }),
      pageTitle: title, chip: chip, chipTone: chipTone, chipInk: ink(chipTone), lede: lede, ledeB: edit ? '' : ledeB, isView: !edit, isEdit: edit, isQuote: isQ,
      act1: a1[1] || function () {}, act1Label: a1[0], act1Dis: !!a1[2], act2: a2[1] || function () {}, act2Label: a2[0],
      saveDraft: function () { if (d.sent) self.cancelEdit(); else self.saveDraft(); }, saveLabel: d.sent ? 'Discard changes' : 'Save draft', review: function () { self.review(); }, reviewLabel: d.sent ? 'Send corrected copy' : (isQ ? 'Review and send' : 'Review and send'),
      openChores: function (e) { self.openPop(e, 'chores', 'chores', 260, 300, 'More for this document'); }, choresX: this.popOn('chores', 'chores'),
      figs: figs, lineRows: d.lines.filter(function (l) { return (l.d || '').trim() || +l.u > 0; }).map(function (l) { return { d: l.d, q: l.q, u: cur(+l.u || 0), a: cur((+l.q || 0) * (+l.u || 0)), opt: !!l.opt }; }), totRows: totRows,
      payTitle: 'Payments', noPays: !pays.length, noPaysText: d.cancelled ? 'This invoice is cancelled, so nothing is expected.' : (isQ ? 'Quotes take no payment. The deposit invoice does.' : 'Nothing has been paid yet. Record a bank transfer, cash or POS payment, or wait for Paystack and Flutterwave.'), hasPays: pays.length > 0, payRows: pays,
      history: d.history || [],
      pickClient: function () { self.pickClient(); }, hasClient: !!d.client, noClient: !d.client, cIni: d.client ? d.client.ini : '', cTone: d.client ? d.client.tone : '', cName: d.client ? d.client.name : 'Choose a client', cNameCls: d.client ? '' : 'dimT', cSub: d.client ? d.client.contact + ' · ' + (d.client.email || 'no email on record') : 'Search clients, or add a new one',
      projChips: projChips, projHint: !d.client ? 'Choose a client to see their projects.' : (prj.length ? 'Ties this to the project’s Money tab. Optional.' : 'This client has no live project. That is fine.'),
      no: d.no, pickIssued: function () { self.dateSheet('issued', 'Issue date'); }, issuedText: this.fmtDate(d.issued), pickDue: function () { self.dateSheet(isQ ? 'valid' : 'due', isQ ? 'Valid until' : 'Due date', isQ ? function () { return self.addDays(self.today(), 1); } : d.issued); }, dueText: this.fmtDate(isQ ? d.valid : d.due), dueLabel: isQ ? 'Valid until' : 'Due date', dueHint: isQ ? 'After this the client cannot accept it.' : (this.docDays(d.due, d.issued) + ' days after it is issued.'),
      po: d.po, onPo: function (e) { self.upd({ po: e.target.value }, true); },
      curChips: chipSet(['Naira', 'US dollars'], function (o) { return (o === 'Naira') === (d.cur !== 'USD'); }, function (o) { self.upd({ cur: o === 'Naira' ? 'NGN' : 'USD' }); }), curHint: d.cur === 'USD' ? 'Dollars are paid by transfer to the USD account. Paystack and Flutterwave are Naira only.' : 'Naira pays with Paystack or Flutterwave. A receipt follows by itself.',
      showAcct: d.cur === 'USD', acctChips: chipSet(['Sterling USD ****0932'], function (o) { return d.acct === o; }, function (o) { self.upd({ acct: o }); }),
      depChips: chipSet(['None', '30%', '50%', '70%'], function (o) { return (d.deposit || 'None') === o; }, function (o) { self.upd({ deposit: o }); }),
      fromList: function () { self.fromList(); }, addLine: function () { self.upd({ lines: d.lines.concat([{ d: '', q: 1, u: '', opt: false }]) }); setTimeout(function () { var el = document.getElementById('dl' + (self.D().lines.length - 1) + 'd'); if (el && el.focus) el.focus(); }, 60); },
      eLines: d.lines.map(function (l, i) { return { idD: 'dl' + i + 'd', idQ: 'dl' + i + 'q', idU: 'dl' + i + 'u', d: l.d, q: l.q, u: l.u === '' ? '' : l.u, a: cur((+l.q || 0) * (+l.u || 0)), n: i + 1, onD: function (e) { self.setLine(i, { d: e.target.value }); }, onQ: function (e) { self.setLine(i, { q: parseFloat(e.target.value) || 0 }); }, onU: function (e) { self.setLine(i, { u: parseInt(String(e.target.value).replace(/[^\d]/g, ''), 10) || '' }); }, menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'line', String(i), 250, 260, 'Actions for line ' + (i + 1)); } }; }),
      noLines: !d.lines.length, hasLineErr: this.problems(d).some(function (p) { return /incomplete/.test(p); }), lineErr: 'A line needs a description, a quantity and a price. Finish it or remove it.',
      vatChips: chipSet(['Add 7.5% VAT', 'No VAT'], function (o) { return (o === 'Add 7.5% VAT') === !!d.vat; }, function (o) { self.upd({ vat: o === 'Add 7.5% VAT' }); }),
      discChips: chipSet(['None', 'Percent', 'Amount'], function (o) { return (o === 'None' && !discOn) || (o === 'Percent' && d.disc.type === 'pct') || (o === 'Amount' && d.disc.type === 'amt'); }, function (o) { self.upd({ disc: { type: o === 'None' ? 'none' : (o === 'Percent' ? 'pct' : 'amt'), v: 0 } }); }),
      hasDisc: discOn, discLabel: d.disc.type === 'pct' ? 'Discount percent' : 'Discount amount', discV: d.disc.v || '', onDisc: function (e) { var v = parseFloat(String(e.target.value).replace(/,/g, '')) || 0; self.upd({ disc: { type: d.disc.type, v: d.disc.type === 'pct' ? Math.min(100, v) : v } }); }, discHint: d.disc.type === 'pct' ? 'Taken off the subtotal before VAT. Up to 100.' : 'Taken off the subtotal before VAT, in ' + (d.cur === 'USD' ? 'dollars.' : 'naira.'),
      note: d.note, onNote: function (e) { self.upd({ note: e.target.value }, true); }, terms: d.terms, onTerms: function (e) { self.upd({ terms: e.target.value }, true); },
      prevSub: edit ? 'Updates as you type' : 'As the client sees it', prevKind: isQ ? 'Quote' : 'Invoice', layoutCls: edit ? 'layoutWide' : '',
      pvProject: d.project || 'No project', pvIssued: this.fmtDate(d.issued), pvDueLabel: isQ ? 'Valid until' : 'Due', pvDue: this.fmtDate(isQ ? d.valid : d.due), pvToName: d.client ? d.client.name : 'Choose a client', pvToContact: d.client ? d.client.contact : '', pvToMail: d.client ? d.client.email : '', pvPo: d.po ? 'Reference ' + d.po : '', hasPvPo: !!d.po,
      pvNote: d.note, hasPvNote: !!(d.note || '').trim(), pvTerms: d.terms, pvAcct: d.cur === 'USD' ? d.acct : 'Paystack or Flutterwave, from the link in the email', pvNone: !d.lines.some(function (l) { return (l.d || '').trim() || +l.u > 0; }),
      isPvDoc: s.pvm !== 'mail', isPvMail: s.pvm === 'mail', pvI: s.pvm === 'mail' ? 1 : 0, pvDocCls: s.pvm === 'mail' ? '' : 'on', pvMailCls: s.pvm === 'mail' ? 'on' : '', setPvDoc: function () { self.setState({ pvm: 'doc' }); }, setPvMail: function () { self.setState({ pvm: 'mail' }); },
      pvMailSubject: (isQ ? 'Quote ' : 'Invoice ') + d.no + ' from WDC Studio', pvMailBody: 'Hello ' + (d.client ? d.client.contact.split(' ')[0] : 'there') + ',\n\n' + (isQ ? 'Here is your quote' : 'Here is your invoice') + ' for ' + cur(T.total) + (isQ ? ', valid until ' + this.fmtDate(d.valid) : ', due ' + this.fmtDate(d.due)) + '. The link below opens it, and ' + (isQ ? 'lets you accept it or ask a question.' : 'you can pay it with Paystack or Flutterwave.') + '\n\nThank you,\nWDC Studio', prevTo: d.client ? 'To ' + d.client.name : 'Choose a client', prevDates: 'Issued ' + this.fmtDate(d.issued) + ' · ' + (isQ ? 'Valid until ' + this.fmtDate(d.valid) : 'Due ' + this.fmtDate(d.due)),
      prevLines: d.lines.filter(function (l) { return (l.d || '').trim() || +l.u > 0; }).map(function (l) { return { d: (l.d || 'Untitled line') + ((+l.q || 0) > 1 ? ' × ' + l.q : '') + (l.opt ? ' (optional)' : ''), a: cur((+l.q || 0) * (+l.u || 0)) }; }), prevFoot: d.note || (isQ ? 'Accept in one tap from the email.' : (d.cur === 'USD' ? 'Pay by transfer to the USD account.' : 'Pay with Paystack or Flutterwave from the link in the email.')),
      checks: checks,
      linkTitle: isQ ? 'The client’s link' : 'The payment link', linkNote: isQ ? 'They read the quote and accept in the portal. You are told when it is opened.' : (d.cancelled ? 'The link is switched off because the invoice is cancelled.' : 'One tap to pay with Paystack or Flutterwave. A paid invoice cannot be paid twice.'),
      linkActs: [{ t: 'Copy the link', s: 'No login needed', d: 'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1', fn: function () { self.say('Link copied.'); } }, { t: 'See it as the client', s: 'The PDF and the portal view', d: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', fn: function () { self.preview(); } }].concat(isQ ? [] : [{ t: 'Match a bank transfer', s: 'Open Reconcile', d: 'M3 10h18M5 6l7-3 7 3M6 10v8M10 10v8M14 10v8M18 10v8M4 21h16', fn: function () { window.location.href = 'A-Reconcile.dc.html'; } }])
    });
  }
