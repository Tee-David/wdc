  /* ======================= Owner · Money ======================= */
  /* Invoices, Quotes, Payments, Payouts and Expenses in one place, led by the money that needs the owner. Every figure is derived from the rows below it, so a recorded payment moves Outstanding, Collected and the invoice together. */
  pageState() { return { rep: /[?&]tab=reports/.test((typeof window !== 'undefined' && window.location.search) || ''), rp: { period: 'month', compare: 'prev', group: 'auto', from: '', to: '', svc: [], client: [], method: [], status: [], cur: 'NGN' }, rhover: -1, rcp: 0, repSaved: [], repSched: [], tab: 'inv', chip: 'all', mpage: 0, mper: 5, mq: '', ra: 0, voided: {}, refunded: {}, recorded: {}, added: [], fuMeta: {}, newInv: [], newQ: [], qst: {}, exp: [], expGone: {} }; }
  pageName() { return 'Money'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'Money that needs you first', icon: I.target, body: 'A late invoice, a transfer to match, payouts to approve. Act, snooze or hand it over, and the next card rises.', hint: 'Focus the card: D done, S snooze.' },
      { target: 'table', title: 'Five lists, one table', icon: I.wallet, body: 'Invoices, Quotes, Payments, Payouts and Expenses. Tap a row to open it. The ⋮ is its own button with the actions.', hint: 'The chips filter by status or provider.' },
      { target: 'rail', title: 'Where the money stands', icon: I.chart, body: 'Collected, outstanding and what is coming. Tap how people pay to see those payments.' },
      { target: 'new', title: 'Bill a client', icon: I.plus, body: 'New invoice checks the client, the amount and the due date, then shows the email before it goes.' }
    ];
  }
  gen6() { var a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', o = ''; for (var i = 0; i < 6; i++) o += a.charAt(Math.floor(Math.random() * a.length)); return o; }
  amt(r) { var a = typeof r === 'string' ? r : r.amount; return a.charAt(0) === '$' ? 0 : parseInt(a.replace(/[^\d]/g, ''), 10) || 0; }
  toneFlat(tone) { return tone === 'var(--ad-tone-neutral)' || tone === 'var(--ad-tone-brand)' ? 'var(--ad-tone-flat)' : tone; }
  toneInk(tone) { return tone === 'var(--ad-tone-flat)' ? 'var(--ad-on-flat)' : '#fff'; }
  /* every invoice, with the bank transfer that has been matched moved to Paid */
  invAll() {
    var s = this.state, M = this.moneyNow(), G = 'var(--ad-tone-good)';
    var tag = function (t, rows) { return rows.map(function (x) { return Object.assign({}, x, { tab: t, sched: ['Milestone 2', 'Deposit', 'Retainer'].indexOf(x.status) >= 0 }); }); };
    var over = tag('over', M.over), due = tag('due', M.due), paid = tag('paid', M.paid);
    if (s.gone.match) { var i = due.map(function (r) { return r.no; }).indexOf('INV-26-7HB2QA'); if (i >= 0) { var r = due.splice(i, 1)[0]; paid.unshift(Object.assign({}, r, { tab: 'paid', status: 'Paid', tone: G, date: '9 Oct', method: 'Bank transfer' })); } }
    var self = this, docs = this.sharedDocs(), mine = Object.keys(docs).map(function (k) { return docs[k]; }).filter(function (d) { return d.kind === 'invoice'; }).map(function (d) { return self.docRow(d); }), seen = {}; mine.forEach(function (r) { seen[r.no] = 1; });
    var rest = over.concat(due, paid).filter(function (r) { return !seen[r.no]; });
    return mine.concat(s.newInv, rest);
  }
  rcpt(r) {
    var K = { 'INV-26-4WE9KS': 'RCT-2026-041', 'INV-26-1QP7ZM': 'RCT-2026-040', 'INV-26-6NB3XR': 'RCT-2026-039', 'INV-26-7DM1XS': 'RCT-2026-038', 'INV-26-5TY4WC': 'RCT-2026-037', 'INV-26-3MS8QA': 'RCT-2026-036', 'INV-26-2FT7RB': 'RCT-2026-035', 'INV-26-9KD2PL': 'RCT-2026-034', 'INV-26-2GH5TY': 'RCT-2026-033', 'INV-26-8HG1VE': 'RCT-2026-F000123', 'INV-26-6CK8NB': 'RCT-2026-F000118', 'INV-26-7HB2QA': 'RCT-2026-042' };
    if (K[r.no]) return K[r.no];
    var n = Object.keys(this.state.recorded).indexOf(r.no); return 'RCT-2026-0' + (43 + Math.max(0, n));
  }
  way(m) { return /Paystack/.test(m) ? 'Paystack' : /Flutterwave/.test(m) ? 'Flutterwave' : /Cash|POS/.test(m) ? 'Cash' : 'Bank'; }
  quotesAll() {
    var s = this.state, B = [
      { no: 'EST-2026-014', client: 'Zara Events', title: 'Event website', value: 1924250, sent: 'Not sent', valid: '—', st: 'Draft', to: 'Zara B.' },
      { no: 'EST-2026-013', client: 'Lumen Fitness', title: 'Ad creative pack', value: 225000, sent: '6 Oct', valid: '20 Oct', st: 'Sent', to: 'Daniel O.' },
      { no: 'EST-2026-012', client: 'Nkem Realty', title: 'Website and SEO', value: 1350000, sent: '3 Oct', valid: '17 Oct', st: 'Opened', to: 'Chidi N.', note: 'Opened 3 times, last yesterday at 18:12' },
      { no: 'EST-2026-011', client: 'Mira Skincare', title: 'Social media management, 3 months', value: 900000, sent: '30 Sep', valid: 'Accepted 3 Oct', st: 'Accepted', to: 'Adaeze O.', invoiced: true },
      { no: 'EST-2026-010', client: 'Oak and Ivy Interiors', title: 'Website', value: 2600000, sent: '2 May', valid: 'Accepted 12 May', st: 'Accepted', to: 'Temi A.', invoiced: true },
      { no: 'EST-2026-009', client: 'Tunde Okafor Law', title: 'Firm flyers', value: 150000, sent: '24 Sep', valid: 'Accepted 28 Sep', st: 'Accepted', to: 'Tunde O.', invoiced: true }
    ];
    var self = this, docs = this.sharedDocs(), mineQ = Object.keys(docs).map(function (k) { return docs[k]; }).filter(function (d) { return d.kind === 'quote'; }).map(function (d) { return self.docRow(d); }), seenQ = {}; mineQ.forEach(function (r) { seenQ[r.no] = 1; });
    B = B.filter(function (q) { return !seenQ[q.no]; });
    return mineQ.concat(s.newQ, B).map(function (q) { return s.qst[q.no] ? Object.assign({}, q, s.qst[q.no]) : q; }).filter(function (q) { return q.st !== 'Withdrawn' || true; });
  }
  paymentsAll() {
    var self = this, s = this.state, G = 'var(--ad-tone-good)';
    var out = this.invAll().filter(function (r) { return r.tab === 'paid'; }).map(function (r) {
      return { id: r.no, ref: self.rcpt(r), client: r.client, amount: r.amount, date: r.date, status: r.status === 'Refunded' ? 'Refunded' : 'Matched', tone: r.status === 'Refunded' ? 'var(--ad-tone-flat)' : G, via: r.method, inv: r };
    });
    if (!s.gone.match) out.unshift({ id: 'bloom-oct', ref: 'BLOOM OCT', client: 'Bloom Pharmacy Ltd (payer name)', amount: '₦180,000', date: '9 Oct', status: 'Unmatched', tone: 'var(--ad-tone-warn)', via: 'GTBank transfer', unmatched: true });
    return out;
  }
  payoutsAll() {
    var s = this.state, ok = !!s.gone.payouts;
    var ready = function (id, who, i, work, amount) { return { id: id, who: who, i: i, work: work, amount: amount, status: ok ? 'Approved' : 'Ready', tone: ok ? 'var(--ad-tone-flat)' : 'var(--ad-tone-live)', due: ok ? 'Pays Tue 13 Oct' : 'Tue 13 Oct', ready: !ok }; };
    var paid = function (id, who, i, work, amount, d) { return { id: id, who: who, i: i, work: work, amount: amount, status: 'Paid', tone: 'var(--ad-tone-good)', due: d, ready: false }; };
    return [ready('p1', 'Tolu A.', 'TA', 'Motion design, Mira reel (20 seconds)', 120000), ready('p2', 'Kemi S.', 'KS', "Copywriting, Ade's Kitchen captions", 60000), paid('p3', 'Tolu A.', 'TA', 'Mira launch teaser (10 seconds)', 90000, '29 Sep'), paid('p4', 'Bisi O.', 'BO', 'SEO audit, Bloom Pharmacy', 70000, '22 Sep')];
  }
  expensesAll() {
    var s = this.state, B = [
      { id: 'e1', t: 'Google Workspace', n: '8 seats', amount: 38000, cat: 'Software', date: '1 Oct', from: 'GTBank NGN' },
      { id: 'e2', t: 'Adobe Creative Cloud', n: '3 seats', amount: 45000, cat: 'Software', date: '1 Oct', from: 'GTBank card' },
      { id: 'e3', t: 'Vercel hosting', n: 'Pro plan', amount: 32000, cat: 'Hosting', date: '3 Oct', from: 'GTBank card' },
      { id: 'e4', t: 'Domain registrations', n: '3 domains for clients', amount: 18000, cat: 'Domains', date: '6 Oct', from: 'GTBank NGN' }
    ];
    var fees = s.gone.paystack ? [{ id: 'e5', t: 'Paystack fees', n: 'Settlement of 6 payments', amount: 25200, cat: 'Fees', date: '10 Oct', from: 'Settlement' }] : [];
    return s.exp.concat(fees, B).filter(function (e) { return !s.expGone[e.id]; });
  }
  tabData() {
    var self = this, s = this.state, F = 'var(--ad-tone-flat)', G = 'var(--ad-tone-good)', W = 'var(--ad-tone-warn)';
    var cell = function (o) { return Object.assign({ cls: '', t: '', s: '', tone: F, ink: 'var(--ad-on-flat)', col: 'var(--ad-ink)', fw: 400, tcls: '' }, o); };
    var one = function (t, o) { return cell(Object.assign({ isOne: true, t: t }, o || {})); };
    var two = function (t, sub, o) { return cell(Object.assign({ isTwo: true, t: t, s: sub }, o || {})); };
    var tg = function (t, tone) { return cell({ isTag: true, t: t, tone: self.toneFlat(tone || F), ink: self.toneInk(self.toneFlat(tone || F)) }); };
    var R = function (o) { return o; };
    if (s.tab === 'inv') {
      var all = this.invAll();
      var inChip = function (r, c) { return c === 'all' || (c === 'over' && r.tab === 'over') || (c === 'due' && r.tab === 'due') || (c === 'paid' && r.tab === 'paid'); };
      return { key: 'inv', title: 'Invoices', ph: 'Invoice or client', all: all, chips: [['all', 'All'], ['over', 'Overdue'], ['due', 'Due'], ['paid', 'Paid']], inChip: inChip,
        match: function (r) { return (r.no + ' ' + r.client).toLowerCase(); },
        cols: [{ t: 'Invoice' }, { t: 'Amount', cls: 'r' }, { t: 'Due or paid' }, { t: 'Status' }, { t: 'Method' }],
        cells: function (r) { return [two(r.no, r.client, { tcls: 'num' }), one(r.amount, { cls: 'r', tcls: 'num', fw: 600 }), one(r.date), tg(r.status, r.tone), one(r.method, { col: 'var(--ad-dim)' })]; },
        id: function (r) { return r.no; }, open: function (r) { self.goDoc(r.no); }, menu: function (r) { return self.rowActions(r, r.tab); }, aria: function (r) { return r.no + ', ' + r.client + ', ' + r.amount + ', ' + r.status; },
        emptyTitle: 'No invoices here.', emptyBody: 'Nothing matches this filter. Bill a client with New invoice.' };
    }
    if (s.tab === 'quotes') {
      var qs = this.quotesAll();
      return { key: 'quotes', title: 'Quotes', ph: 'Quote or client', all: qs, chips: [['all', 'All'], ['Draft', 'Draft'], ['open', 'Waiting'], ['Accepted', 'Accepted']],
        inChip: function (r, c) { return c === 'all' || (c === 'open' ? (r.st === 'Sent' || r.st === 'Opened') : r.st === c); },
        match: function (r) { return (r.no + ' ' + r.client + ' ' + r.title).toLowerCase(); },
        cols: [{ t: 'Quote' }, { t: 'Value', cls: 'r' }, { t: 'Sent' }, { t: 'Status' }, { t: 'Valid until' }],
        cells: function (r) { var tone = r.st === 'Accepted' ? G : (r.st === 'Opened' ? W : (r.st === 'Withdrawn' ? 'var(--ad-tone-flat)' : F)); return [two(r.no, r.client + ' · ' + r.title, { tcls: 'num' }), one(self.ngn(r.value), { cls: 'r', tcls: 'num', fw: 600 }), one(r.sent), tg(r.st === 'Opened' ? 'Opened 3 times' : r.st, tone), one(r.valid, { col: 'var(--ad-dim)' })]; },
        id: function (r) { return r.no; }, open: function (r) { self.goDoc(r.no); }, menu: function (r) { return self.quoteActions(r); }, aria: function (r) { return r.no + ', ' + r.client + ', ' + self.ngn(r.value) + ', ' + r.st; },
        emptyTitle: 'No quotes here.', emptyBody: 'Build one from the price list with New quote.' };
    }
    if (s.tab === 'payments') {
      var ps = this.paymentsAll();
      return { key: 'payments', title: 'Payments', ph: 'Receipt or client', all: ps, chips: [['all', 'All'], ['Paystack', 'Paystack'], ['Flutterwave', 'Flutterwave'], ['Bank', 'Bank'], ['Cash', 'Cash'], ['unm', 'Unmatched']],
        inChip: function (r, c) { return c === 'all' || (c === 'unm' ? !!r.unmatched : self.way(r.via) === c); },
        match: function (r) { return (r.ref + ' ' + r.client).toLowerCase(); },
        cols: [{ t: 'Payment' }, { t: 'Amount', cls: 'r' }, { t: 'Received' }, { t: 'Status' }, { t: 'Paid with' }],
        cells: function (r) { return [two(r.ref, r.client, { tcls: 'num' }), one(r.amount, { cls: 'r', tcls: 'num', fw: 600 }), one(r.date), tg(r.status, r.tone), one(r.via, { col: 'var(--ad-dim)' })]; },
        id: function (r) { return r.id; }, open: function (r) { if (r.unmatched) self.open(self.sheets().match); else self.goDoc(r.inv.no); }, menu: function (r) { return self.paymentActions(r); }, aria: function (r) { return r.ref + ', ' + r.client + ', ' + r.amount + ', ' + r.status; },
        emptyTitle: 'No payments here.', emptyBody: 'Payments from Paystack, Flutterwave and the bank land here.' };
    }
    if (s.tab === 'payouts') {
      var po = this.payoutsAll();
      return { key: 'payouts', title: 'Payouts', ph: 'Freelancer or work', all: po, chips: [['all', 'All'], ['Ready', 'Ready'], ['Approved', 'Approved'], ['Paid', 'Paid']],
        inChip: function (r, c) { return c === 'all' || r.status === c; },
        match: function (r) { return (r.who + ' ' + r.work).toLowerCase(); },
        cols: [{ t: 'Freelancer' }, { t: 'Amount', cls: 'r' }, { t: 'Work' }, { t: 'Status' }, { t: 'Pays' }],
        cells: function (r) { return [two(r.who, 'Client approved the work'), one(self.ngn(r.amount), { cls: 'r', tcls: 'num', fw: 600 }), one(r.work), tg(r.status, r.tone), one(r.due, { col: 'var(--ad-dim)' })]; },
        id: function (r) { return r.id; }, open: function (r) { self.open(self.payoutSheet(r)); }, menu: function (r) { return self.payoutActions(r); }, aria: function (r) { return r.who + ', ' + self.ngn(r.amount) + ', ' + r.status; },
        emptyTitle: 'No payouts here.', emptyBody: 'Payouts appear after a client approves the work.' };
    }
    var ex = this.expensesAll();
    return { key: 'expenses', title: 'Expenses', ph: 'Expense or category', all: ex, chips: [['all', 'All'], ['Software', 'Software'], ['Hosting', 'Hosting'], ['Domains', 'Domains'], ['Fees', 'Fees'], ['Other', 'Other']],
      inChip: function (r, c) { return c === 'all' || r.cat === c; },
      match: function (r) { return (r.t + ' ' + r.cat + ' ' + r.n).toLowerCase(); },
      cols: [{ t: 'Expense' }, { t: 'Amount', cls: 'r' }, { t: 'Category' }, { t: 'Date' }, { t: 'Paid from' }],
      cells: function (r) { return [two(r.t, r.n), one(self.ngn(r.amount), { cls: 'r', tcls: 'num', fw: 600 }), tg(r.cat, F), one(r.date), one(r.from, { col: 'var(--ad-dim)' })]; },
      id: function (r) { return r.id; }, open: function (r) { self.open(self.expenseSheet(r)); }, menu: function (r) { return self.expenseActions(r); }, aria: function (r) { return r.t + ', ' + self.ngn(r.amount) + ', ' + r.cat; },
      emptyTitle: 'No expenses logged.', emptyBody: 'Add what the studio spends so every month shows what is left.' };
  }

  /* what each tab can be filtered by, exported as, and done in bulk */
  tabTools(T) {
    var self = this, I = this.icons(), uniq = function (rows, f) { var o = []; rows.forEach(function (r) { var v = f(r); if (v && o.indexOf(v) < 0) o.push(v); }); return o; };
    var size = function (n) { return n < 200000 ? 'Under ₦200k' : (n <= 1000000 ? '₦200k to ₦1m' : 'Over ₦1m'); }, SIZES = ['Under ₦200k', '₦200k to ₦1m', 'Over ₦1m'];
    var way = function (m) { return /USD/.test(m) ? 'USD account' : self.way(m) === 'Bank' ? 'Bank transfer' : self.way(m); };
    var key = T.key, cl = function (r) { return r.client; };
    var out = { noun: key === 'inv' ? 'invoices' : key, one: ({ inv: 'invoice', quotes: 'quote', payments: 'payment', payouts: 'payout', expenses: 'expense' })[key], facets: [], xcols: [], acts: [], label: function (r) { return String(T.id(r)); }, importFn: null };
    if (key === 'inv') {
      out.facets = [{ k: 'st', t: 'Status', opts: ['Overdue', 'Due', 'Paid'], get: function (r) { return r.tab === 'over' ? 'Overdue' : (r.tab === 'paid' ? 'Paid' : 'Due'); } }, { k: 'cl', t: 'Client', opts: uniq(T.all, cl), get: cl }, { k: 'way', t: 'Paid with', opts: ['Paystack', 'Flutterwave', 'Bank transfer', 'Cash', 'USD account'], get: function (r) { return way(r.method); } }, { k: 'size', t: 'Size', opts: SIZES, get: function (r) { return size(self.amt(r)); } }];
      out.xcols = [{ t: 'Invoice', v: function (r) { return r.no; } }, { t: 'Client', v: cl }, { t: 'Amount', v: function (r) { return self.amt(r); } }, { t: 'Currency', v: function (r) { return /^\$/.test(r.amount) ? 'USD' : 'NGN'; } }, { t: 'Due or paid', v: function (r) { return r.date; } }, { t: 'Status', v: function (r) { return r.status; } }, { t: 'Paid with', v: function (r) { return r.method; } }];
      out.label = function (r) { return r.no; };
      out.acts = [{ label: 'Remind', icon: I.mail, fn: function (sel, done) { var open = sel.filter(function (r) { return r.tab !== 'paid'; }); if (!open.length) { self.say('Everything selected is already paid. Nobody to remind.'); return; } self.ask({ eyebrow: 'Reminders', title: 'Remind ' + open.length + (open.length === 1 ? ' client?' : ' clients?'), body: open.map(function (r) { return r.client + ' ' + r.amount; }).join(', ') + '. Paid invoices in your selection are left out.', to: open.map(function (r) { return r.client; }).join(', '), subject: 'A reminder about your invoice', preview: 'Hello,\nA friendly reminder about your open invoice. You can pay with Paystack or Flutterwave from the link.', ok: 'Send reminders', icon: I.mail, onOk: function () { done(); self.say('Sending ' + open.length + (open.length === 1 ? ' reminder' : ' reminders') + ' in 8s', { delay: 8, pending: function (n) { return 'Sending ' + open.length + ' reminders in ' + n + 's'; }, cancel: function () { }, cancelled: 'Cancelled. Nothing was sent.' }); } }); } }];
    } else if (key === 'quotes') {
      out.facets = [{ k: 'st', t: 'Status', opts: ['Draft', 'Sent', 'Opened', 'Accepted', 'Withdrawn'], get: function (r) { return r.st; } }, { k: 'cl', t: 'Client', opts: uniq(T.all, cl), get: cl }, { k: 'size', t: 'Size', opts: SIZES, get: function (r) { return size(r.value); } }];
      out.xcols = [{ t: 'Quote', v: function (r) { return r.no; } }, { t: 'Client', v: cl }, { t: 'For', v: function (r) { return r.title; } }, { t: 'Value (NGN)', v: function (r) { return r.value; } }, { t: 'Sent', v: function (r) { return r.sent; } }, { t: 'Status', v: function (r) { return r.st; } }, { t: 'Valid until', v: function (r) { return r.valid; } }, { t: 'Sent to', v: function (r) { return r.to; } }];
      out.label = function (r) { return r.no; };
      out.acts = [{ label: 'Remind', icon: I.mail, fn: function (sel, done) { var w = sel.filter(function (r) { return r.st === 'Sent' || r.st === 'Opened'; }); if (!w.length) { self.say('None of these are waiting on the client.'); return; } done(); self.say('Reminders sent for ' + w.length + (w.length === 1 ? ' quote.' : ' quotes.'), { delay: 8, pending: function (n) { return 'Sending ' + w.length + ' reminders in ' + n + 's'; }, cancel: function () { }, cancelled: 'Cancelled. Nothing was sent.' }); } }];
    } else if (key === 'payments') {
      out.facets = [{ k: 'way', t: 'Paid with', opts: ['Paystack', 'Flutterwave', 'Bank transfer', 'Cash'], get: function (r) { return way(r.via); } }, { k: 'st', t: 'Status', opts: ['Matched', 'Unmatched', 'Refunded'], get: function (r) { return r.status; } }, { k: 'cl', t: 'Client', opts: uniq(T.all, cl), get: cl }, { k: 'size', t: 'Size', opts: SIZES, get: function (r) { return size(self.amt(r)); } }];
      out.xcols = [{ t: 'Reference', v: function (r) { return r.ref; } }, { t: 'Client', v: cl }, { t: 'Amount', v: function (r) { return self.amt(r); } }, { t: 'Received', v: function (r) { return r.date; } }, { t: 'Status', v: function (r) { return r.status; } }, { t: 'Paid with', v: function (r) { return r.via; } }, { t: 'Invoice', v: function (r) { return r.inv ? r.inv.no : ''; } }];
      out.label = function (r) { return r.ref; };
    } else if (key === 'payouts') {
      out.facets = [{ k: 'st', t: 'Status', opts: ['Ready', 'Approved', 'Paid'], get: function (r) { return r.status; } }, { k: 'who', t: 'Freelancer', opts: uniq(T.all, function (r) { return r.who; }), get: function (r) { return r.who; } }];
      out.xcols = [{ t: 'Freelancer', v: function (r) { return r.who; } }, { t: 'Work', v: function (r) { return r.work; } }, { t: 'Amount (NGN)', v: function (r) { return r.amount; } }, { t: 'Status', v: function (r) { return r.status; } }, { t: 'Pays', v: function (r) { return r.due; } }];
      out.label = function (r) { return r.who + ', ' + r.work; };
      out.acts = [{ label: 'Approve', icon: I.check, fn: function (sel, done) { if (!sel.some(function (r) { return r.ready; })) { self.say('None of these are waiting for approval.'); return; } done(); self.open(self.sheets().payouts); } }];
    } else {
      out.facets = [{ k: 'cat', t: 'Category', opts: ['Software', 'Hosting', 'Domains', 'Fees', 'Other'], get: function (r) { return r.cat; } }, { k: 'from', t: 'Paid from', opts: uniq(T.all, function (r) { return r.from; }), get: function (r) { return r.from; } }];
      out.xcols = [{ t: 'Expense', v: function (r) { return r.t; } }, { t: 'Note', v: function (r) { return r.n; } }, { t: 'Amount (NGN)', v: function (r) { return r.amount; } }, { t: 'Category', v: function (r) { return r.cat; } }, { t: 'Date', v: function (r) { return r.date; } }, { t: 'Paid from', v: function (r) { return r.from; } }];
      out.label = function (r) { return r.t; };
      out.importFn = function () { self.importExpenses(); };
      out.acts = [{ label: 'Delete', icon: I.trash, danger: true, fn: function (sel, done) { self.ask({ eyebrow: 'Expenses', title: 'Delete ' + sel.length + (sel.length === 1 ? ' expense?' : ' expenses?'), body: 'They stop counting in this month. You can restore them from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { var g = Object.assign({}, self.state.expGone); sel.forEach(function (r) { g[r.id] = true; }); self.setState({ expGone: g, ra: self.state.ra + 1 }); done(); self.say(sel.length + ' moved to Trash.', { undo: function () { var u = Object.assign({}, self.state.expGone); sel.forEach(function (r) { delete u[r.id]; }); self.setState({ expGone: u, ra: self.state.ra + 1 }); } }); } }); } }];
    }
    return out;
  }
  importExpenses() {
    var self = this, CAT = ['Software', 'Hosting', 'Domains', 'Fees', 'Other'], FROM = ['GTBank NGN', 'GTBank card', 'Cash'];
    this.importSheet({ noun: 'expenses', one: 'expense', file: 'wdc-expenses', intro: 'Bring a month of expenses over from a spreadsheet or a bank export. Each row is checked before anything is added.', rule: 'Amount is in naira, numbers only. Category is one of ' + CAT.join(', ') + '.',
      fields: [{ k: 'name', t: 'Expense', req: true, alias: ['description', 'what', 'item'] }, { k: 'amount', t: 'Amount', req: true, alias: ['amount ngn', 'value', 'cost'] }, { k: 'cat', t: 'Category', alias: ['type'] }, { k: 'date', t: 'Date' }, { k: 'from', t: 'Paid from', alias: ['account', 'paid with'] }],
      sample: [['Figma', '24000', 'Software', '2026-10-05', 'GTBank card'], ['Cloudflare', '12500', 'Hosting', '2026-10-06', 'GTBank NGN'], ['Courier to client', '4500', 'Other', '2026-10-08', 'Cash']],
      check: function (r) { if (!r.name) return 'Missing expense'; if (!r.amount) return 'Missing amount'; if (!/^\d[\d,]*(\.\d+)?$/.test(r.amount.replace(/[₦\s]/g, ''))) return 'Amount is not a number'; if (r.cat && CAT.indexOf(r.cat) < 0) return 'Unknown category'; if (r.date && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return 'Date should read 2026-10-05'; return ''; },
      label: function (r) { return r.name || 'No name'; }, detail: function (r) { return (r.cat || 'Other') + ' · ' + (r.amount ? '₦' + r.amount : 'No amount'); }, initials: function (r) { return (r.name || '?').charAt(0).toUpperCase(); },
      onImport: function (ready) { var t = Date.now(), made = ready.map(function (r, i) { var d = r.date ? parseInt(r.date.slice(8), 10) + ' ' + self.monthName(parseInt(r.date.slice(5, 7), 10) - 1).slice(0, 3) : '10 Oct'; return { id: 'xi' + t + i, t: r.name, n: 'Imported from a spreadsheet', amount: Math.round(parseFloat(r.amount.replace(/[₦,\s]/g, ''))), cat: r.cat || 'Other', date: d, from: FROM.indexOf(r.from) >= 0 ? r.from : 'GTBank NGN' }; }); self.setState({ exp: made.concat(self.state.exp), tab: 'expenses', chip: 'all', mpage: 0, ra: self.state.ra + 1 }); } });
  }

  /* ---------- sheets and actions with follow through ---------- */
  quoteSheet(q) {
    var self = this, I = this.icons(), st = q.st, done = st === 'Accepted';
    var inv = this.state.qst[q.no] && this.state.qst[q.no].invoiced || q.invoiced;
    var tone = done ? 'var(--ad-tone-good)' : (st === 'Opened' ? 'var(--ad-tone-warn)' : 'var(--ad-tone-neutral)');
    return this.sh({ eyebrow: 'Quote', title: q.no + ' · ' + q.client, chip: st === 'Opened' ? 'Opened 3 times' : st, tone: tone, icon: I.quote, iconTone: tone,
      rows: [{ k: 'For', v: q.title }, { k: 'Value', v: this.ngn(q.value) + ' with VAT' }, { k: 'Deposit', v: '50% · ' + this.ngn(q.value / 2) }, { k: 'Sent to', v: q.to }, { k: 'Valid until', v: q.valid }],
      feed: [q.note ? { t: q.note, when: '' } : null, st === 'Draft' ? { t: 'Draft saved. Nothing has been sent', when: 'by you' } : { t: 'Sent ' + q.sent, when: 'by you' }].filter(Boolean),
      body: st === 'Draft' ? 'Review it, then send. A sent quote is valid for 14 days.' : (done ? (inv ? 'The deposit invoice was created when it was accepted.' : 'Accepted. Create the deposit invoice so the work can start.') : 'Waiting for ' + q.to.split(' ')[0] + '. A short reminder usually gets an answer within a day.'),
      primary: st === 'Draft' ? 'Edit and send' : (done ? (inv ? 'Preview the quote' : 'Create the deposit invoice') : 'Send a reminder'), secondary: st === 'Draft' ? 'Delete draft' : 'Preview the PDF',
      onPrimary: function () {
        if (st === 'Draft') { self.closeSheet(); setTimeout(function () { self.editQuote(q); }, 80); return; }
        if (done) { if (inv) { self.openFile({ name: q.no + '.pdf', project: q.client, view: 'doc', ref: q.no, docTitle: 'Quote · ' + self.ngn(q.value), when: q.sent, size: '210 KB', tone: 'var(--ad-tone-bad)' }); } else self.depositInvoice(q); return; }
        self.say('Reminder sent to ' + q.to + '.', { delay: 8, pending: function (n) { return 'Sending a reminder to ' + q.to.split(' ')[0] + ' in ' + n + 's'; } });
      },
      onSecondary: function () { if (st === 'Draft') { self.dropQuote(q); return; } self.openFile({ name: q.no + '.pdf', project: q.client, view: 'doc', ref: q.no, docTitle: 'Quote · ' + self.ngn(q.value), when: q.sent, size: '210 KB', tone: 'var(--ad-tone-bad)' }, true); return 'stay'; } });
  }
  dropQuote(q) {
    var self = this, I = this.icons();
    this.ask({ eyebrow: 'Draft', title: 'Delete the draft ' + q.no + '?', body: 'Nothing was sent to ' + q.client + '. The number stays reserved so the sequence is unbroken.', ok: 'Delete draft', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { var m = Object.assign({}, self.state.qst); m[q.no] = { st: 'Withdrawn', valid: 'Draft deleted' }; self.setState({ qst: m, ra: self.state.ra + 1 }); self.say(q.no + ' deleted. Nothing was sent.', { undo: function () { var u = Object.assign({}, self.state.qst); delete u[q.no]; self.setState({ qst: u, ra: self.state.ra + 1 }); } }); } });
  }
  depositInvoice(q) {
    var self = this, I = this.icons(), amount = q.value / 2, no = 'INV-26-' + this.gen6();
    this.ask({ eyebrow: 'Deposit invoice', title: 'Create the ' + this.ngn(amount) + ' deposit invoice?', body: q.client + ' pays 50% to start. They get the invoice by email with Paystack and Flutterwave links, and the project starts when it is paid.', to: q.to, subject: 'Invoice ' + no + ': 50% deposit to start ' + q.title, preview: 'Hello ' + q.to.split(' ')[0] + ',\nThank you for accepting ' + q.no + '.\n50% deposit: ' + this.ngn(amount) + '. Due in 7 days.', ok: 'Send the invoice', icon: I.file, onOk: function () {
      self.setState({ sheet: null, stack: [] });
      var row = { no: no, client: q.client, amount: self.ngn(amount), date: '17 Oct', status: 'Due in 7 days', tone: 'var(--ad-tone-warn)', method: 'Paystack or Flutterwave', tab: 'due' };
      var m = Object.assign({}, self.state.qst); m[q.no] = Object.assign({}, m[q.no] || {}, { invoiced: true });
      self.setState({ newInv: [row].concat(self.state.newInv), qst: m, tab: 'inv', chip: 'all', mpage: 0, ra: self.state.ra + 1 });
      self.say(no + ' sent to ' + q.client + '. It is at the top of Invoices.');
    } }, true);
  }
  quoteActions(q) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), out = [];
    out.push(it('Open quote', I.open, function () { self.goDoc(q.no); }));
    if (q.st === 'Draft') { out.push(it('Edit and send', I.quote, function () { self.editQuote(q); })); out.push(this.menuSep()); out.push(it('Delete draft…', I.trash, function () { self.dropQuote(q); }, { danger: true })); return out; }
    if (q.st === 'Sent' || q.st === 'Opened') {
      out.push(it('Send a reminder', I.mail, function () { self.say('Reminder sent to ' + q.to + '.', { delay: 8, pending: function (n) { return 'Sending a reminder in ' + n + 's'; } }); }));
      out.push(it('Mark as accepted', I.check, function () { self.ask({ eyebrow: 'Accepted', title: 'Mark ' + q.no + ' as accepted?', body: q.to + ' agreed by phone or message. You can create the deposit invoice next.', ok: 'Mark as accepted', icon: I.check, tone: 'var(--ad-tone-good)', green: true, onOk: function () { var m = Object.assign({}, self.state.qst); m[q.no] = { st: 'Accepted', valid: 'Accepted today' }; self.setState({ qst: m, ra: self.state.ra + 1 }); self.say(q.no + ' accepted. Create the deposit invoice from its row.'); } }); }));
      out.push(this.menuSep());
      out.push(it('Withdraw quote…', I.ban, function () { self.ask({ eyebrow: 'Withdraw', title: 'Withdraw ' + q.no + '?', body: q.client + ' can no longer accept it. You can send a new quote any time.', input: true, inputLabel: 'Reason, kept on the record', inputPh: 'For example: they chose another studio', ok: 'Withdraw quote', danger: true, tone: 'var(--ad-tone-bad)', icon: I.ban, onOk: function () { var m = Object.assign({}, self.state.qst); m[q.no] = { st: 'Withdrawn', valid: 'Withdrawn' }; self.setState({ qst: m, ra: self.state.ra + 1 }); self.say(q.no + ' withdrawn.', { undo: function () { var u = Object.assign({}, self.state.qst); delete u[q.no]; self.setState({ qst: u, ra: self.state.ra + 1 }); } }); } }); }, { danger: true }));
      return out;
    }
    if (q.st === 'Accepted') { if (!(self.state.qst[q.no] && self.state.qst[q.no].invoiced) && !q.invoiced) out.push(it('Create deposit invoice', I.file, function () { self.depositInvoice(q); })); out.push(it('Preview the PDF', I.eye, function () { self.openFile({ name: q.no + '.pdf', project: q.client, view: 'doc', ref: q.no, docTitle: 'Quote · ' + self.ngn(q.value), when: q.sent, size: '210 KB', tone: 'var(--ad-tone-bad)' }); })); }
    return out;
  }
  editQuote(q) { this.goDoc(q.no); }
  newQuote() { window.location.href = 'A-Invoice.dc.html?new=quote'; }
  newInvoice() { window.location.href = 'A-Invoice.dc.html?new=invoice'; }
  remindLate() {
    var self = this, I = this.icons(), late = this.invAll().filter(function (r) { return r.tab === 'over'; });
    if (!late.length) { this.say('Nothing is overdue, so there is nobody to remind.'); return; }
    var total = late.reduce(function (a, r) { return a + self.amt(r); }, 0);
    this.ask({ eyebrow: 'Reminders', title: 'Remind ' + late.length + ' clients about late invoices?', body: late.map(function (r) { return r.client + ' ' + r.amount; }).join(', ') + '. ' + this.ngn(total) + ' in all. Each gets the polite reminder, not the final notice.', to: late.map(function (r) { return r.client; }).join(', '), subject: 'A reminder about your invoice', preview: 'Hello,\nThis is a friendly reminder that your invoice is overdue. You can pay in one tap with Paystack or Flutterwave from the link below.', ok: 'Send ' + late.length + ' reminders', icon: I.mail, tone: 'var(--ad-tone-warn)',
      onOk: function () { self.say('Sending ' + late.length + ' reminders in 8s', { delay: 8, pending: function (n) { return 'Sending ' + late.length + ' reminders in ' + n + 's'; }, cancel: function () {}, cancelled: 'Cancelled. Nothing was sent.' }); } });
  }
  /* Which invoice was paid: five at a time, searchable by number, client or amount. The payment itself is recorded on the invoice page. */
  recordPick() {
    var self = this, I = this.icons(), rows = this.invAll().filter(function (r) { return r.tab !== 'paid' && r.status !== 'Cancelled' && r.status !== 'Draft'; });
    this.open(this.sh({ eyebrow: 'Record a payment', title: 'Which invoice was paid?', icon: I.cash, iconTone: 'var(--ad-tone-good)', body: 'Use this for money that came in outside Paystack and Flutterwave. Five at a time. Search by number, client or amount.', listTitle: 'Open invoices', select: true, searchPh: 'Search invoices', list: rows.map(function (r) { return { t: r.no + ' · ' + r.client, s: r.amount + ' · ' + r.status, k: r.amount + ' ' + r.client + ' ' + r.no }; }), selectWhy: 'Choose the invoice.', primary: function (ctx) { return ctx.pick >= 0 ? 'Next: how was it paid' : 'Next'; }, secondary: 'Cancel',
      onPrimary: function (ctx) { var r = rows[ctx.pick]; self.goDoc(r.no, '&pay=1'); } }));
  }
  payoutSheet(r) {
    var self = this, I = this.icons();
    return this.sh({ eyebrow: 'Payout', title: r.who + ' · ' + this.ngn(r.amount), chip: r.status, tone: r.tone, icon: I.cash, iconTone: r.tone, rows: [{ k: 'Work', v: r.work }, { k: 'Client approved', v: r.status === 'Paid' ? 'Yes' : '8 Oct 2026' }, { k: 'Paid from', v: 'GTBank NGN' }, { k: r.status === 'Paid' ? 'Paid on' : 'Pays', v: r.due }],
      body: r.ready ? 'The client approved this work, so it is ready. Approving confirms the exact total and bank before anything moves.' : (r.status === 'Approved' ? 'Approved. Finance pays it on Tuesday and the freelancer gets a payment advice by email.' : 'Paid. The payment advice was emailed to ' + r.who.split(' ')[0] + '.'),
      primary: r.ready ? 'Review both payouts' : 'Preview the payment advice', secondary: 'Close',
      onPrimary: function () { if (r.ready) { self.closeSheet(); setTimeout(function () { self.open(self.sheets().payouts); }, 80); } else self.openFile({ name: 'Payment advice ' + r.who.split(' ')[0] + '.pdf', project: r.who, view: 'doc', ref: 'PA-26-' + r.id.toUpperCase(), docTitle: 'Payment advice · ' + self.ngn(r.amount), when: r.due, size: '96 KB', tone: 'var(--ad-tone-bad)' }); } });
  }
  expenseSheet(r) {
    var self = this, I = this.icons();
    return this.sh({ eyebrow: 'Expense', title: r.t, chip: this.ngn(r.amount), tone: 'var(--ad-tone-neutral)', icon: I.wallet, iconTone: 'var(--ad-tone-neutral)', rows: [{ k: 'Amount', v: this.ngn(r.amount) }, { k: 'Category', v: r.cat }, { k: 'Date', v: r.date }, { k: 'Paid from', v: r.from }, { k: 'Note', v: r.n }], primary: 'Close', secondary: 'Move to Trash…',
      onSecondary: function () { self.trashExpense(r); return 'stay'; } });
  }
  trashExpense(r) {
    var self = this, I = this.icons();
    this.ask({ eyebrow: 'Trash', title: 'Move ' + r.t + ' to Trash?', body: 'It stops counting in this month’s expenses. You can restore it from Settings, Trash.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { self.setState({ sheet: null, stack: [] }); var g = Object.assign({}, self.state.expGone); g[r.id] = true; self.setState({ expGone: g, ra: self.state.ra + 1 }); self.say(r.t + ' moved to Trash.', { undo: function () { var u = Object.assign({}, self.state.expGone); delete u[r.id]; self.setState({ expGone: u, ra: self.state.ra + 1 }); } }); } }, true);
  }
  addExpense() {
    var self = this, I = this.icons(), ok = function (v) { return /^\d[\d,]*$/.test((v || '').trim()); };
    this.open(this.sh({ eyebrow: 'New expense', title: 'Add an expense', icon: I.wallet, body: 'Log what the studio spends so every month shows what is left after costs.',
      fields: [{ key: 'name', label: 'What was it for', ph: 'For example: Figma, 3 seats', wide: true }, { key: 'amt', label: 'Amount (₦)', ph: '24000', mode: 'numeric', check: function (v) { return v.trim() && !ok(v) ? 'Use numbers only, for example 24000.' : ''; } }, { key: 'when', type: 'date', label: 'Date', min: '2026-01-01', required: true }],
      form: { when: '2026-10-10' },
      chipSets: [{ key: 'cat', label: 'Category', opts: ['Software', 'Hosting', 'Domains', 'Fees', 'Other'] }, { key: 'from', label: 'Paid from', opts: ['GTBank NGN', 'GTBank card', 'Cash'] }],
      primary: 'Save expense', secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form; if (!(f.name || '').trim()) return 'Say what it was for.'; if (!ok(f.amt)) return 'Add the amount, numbers only.'; if (!f.cat) return 'Choose a category.'; if (!f.from) return 'Choose where it was paid from.'; if (!f.when) return 'Choose the date.'; return ''; },
      onPrimary: function (ctx) { var f = ctx.form, e = { id: 'x' + Date.now(), t: f.name.trim(), n: 'Added just now', amount: parseInt(f.amt.replace(/,/g, ''), 10), cat: f.cat, date: parseInt(f.when.slice(8), 10) + ' ' + self.monthName(parseInt(f.when.slice(5, 7), 10) - 1).slice(0, 3), from: f.from }; self.setState({ exp: [e].concat(self.state.exp), tab: 'expenses', chip: 'all', mpage: 0, ra: self.state.ra + 1 }); self.say('Saved. ' + e.t + ' counts in October.'); } }));
  }
  paymentActions(r) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (r.unmatched) return [it('Match to an invoice', I.link, function () { self.open(self.sheets().match); }), it('Record as credit', I.undo, function () { self.say('Saved as ₦180,000 credit on Bloom Pharmacy. It pays their next invoice.'); })];
    return [it('View receipt', I.eye, function () { self.open(self.invSheet(r.inv)); }), it('Download receipt', I.down, function () { self.say('receipt-' + r.ref + '.pdf downloaded'); }), it('Resend receipt', I.mail, function () { self.say('Receipt sent to ' + r.client, { delay: 8, pending: function (n) { return 'Resending to ' + r.client + ' in ' + n + 's'; } }); })];
  }
  payoutActions(r) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    var out = [it('Open payout', I.open, function () { self.open(self.payoutSheet(r)); })];
    if (r.ready) out.push(it('Approve payouts', I.check, function () { self.open(self.sheets().payouts); }));
    else out.push(it('Preview payment advice', I.eye, function () { self.open(self.payoutSheet(r)); }));
    return out;
  }
  expenseActions(r) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    return [it('Open expense', I.open, function () { self.open(self.expenseSheet(r)); }), this.menuSep(), it('Move to Trash…', I.trash, function () { self.trashExpense(r); }, { danger: true })];
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (pop.kind === 'row') { var T = this.tabData(), r = T.all.filter(function (x) { return String(T.id(x)) === pop.id; })[0]; return r ? T.menu(r) : []; }
    if (pop.kind === 'chores') return [
      it('Reconciliation', I.link, function () { window.location.href = 'A-Reconcile.dc.html'; }, { hint: 'Import a bank statement' }),
      it('New quote', I.quote, function () { self.newQuote(); }),
      it('Record a payment', I.cash, function () { self.recordPick(); }),
      it('Match bank transfers', I.link, function () { self.open(self.sheets().match); }),
      this.menuSep(),
      it('Export this tab', I.down, function () { var T = self.tabData(), TT = self.tabTools(T); self.exportSheet({ noun: TT.noun, file: 'wdc-' + self.state.tab, cols: TT.xcols, all: T.all, filtered: T.all, selected: [] }); }, { hint: 'CSV or Excel' }),
      it('Currencies and banks', I.gear, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Settings' })
    ];
    return [];
  }

  /* ---------- the deck: money that needs the owner ---------- */
  deck() {
    var self = this, I = this.icons(), S = this.sh.bind(this), X = this.sheets();
    var home = this.homeDeck(), pick = function (id) { return home.filter(function (d) { return d.id === id; })[0]; };
    var match = pick('match');
    match.primaryFn = function (at) { self.clear(match, 'done', '', 'Matched to INV-26-7HB2QA. Bloom gets a receipt by email and the invoice is Paid.', { at: at, final: true }); };
    var retain = { id: 'retain', kind: 'Recurring', urgency: 'Goes out 1 Nov', utone: '#5c5c7a', label: 'Retainers', dept: 'Finance', title: 'Schedule the November retainers', body: 'Four retainer invoices are drafted from last month. They go out on 1 November at 08:00.', meta: [{ k: 'Total', v: '₦1,450,000' }, { k: 'Invoices', v: '4' }, { k: 'Check', v: 'Lumen may drop to ₦200,000' }], why: 'Scheduling now means nobody waits on a manual invoice on the 1st.',
      primaryLabel: 'Schedule all four', primaryConfirm: { eyebrow: 'Retainers', title: 'Schedule four retainer invoices?', body: 'They go out on 1 Nov at 08:00 with Paystack and Flutterwave links. You can cancel any of them until then.', ok: 'Schedule for 1 Nov', okToast: 'Scheduled. Four invoices go out on 1 Nov at 08:00.', icon: I.cash, tone: 'var(--ad-tone-brand)' },
      secondaryLabel: 'Review the drafts', sheetSecondary: true, sheet: S({ eyebrow: 'Recurring', title: 'November retainers', chip: '₦1,450,000', tone: 'var(--ad-tone-brand)', icon: I.cash, listTitle: 'Drafts ready', list: [{ t: "Ade's Kitchen", s: '₦350,000 · Social media' }, { t: 'Bloom Pharmacy', s: '₦300,000 · SEO' }, { t: 'Halo Clinics', s: '₦500,000 · Care plan' }, { t: 'Lumen Fitness', s: '₦300,000 · Social. A lower budget is waiting on you in Clients' }], primary: 'Schedule for 1 Nov', pToast: 'Scheduled. They go out 1 Nov at 08:00.' }) };
    var pay = { id: 'paystack', kind: 'Reconcile', urgency: 'This week', utone: '#5c5c7a', label: 'Paystack', dept: 'Finance', title: 'Reconcile this week’s Paystack settlement', body: 'Six payments settled for ₦1,680,000. Paystack kept ₦25,200 in fees.', meta: [{ k: 'Settled', v: '₦1,680,000' }, { k: 'Fees', v: '₦25,200' }, { k: 'Payments', v: '6, all matched' }], why: 'Reconciling records the fees as an expense, so October shows what is left after costs.',
      primaryLabel: 'Reconcile all 6', primaryFn: function (at) { self.clear(pay, 'done', '', 'All 6 matched. ₦25,200 of fees is now in Expenses.', { at: at, final: true }); },
      secondaryLabel: 'Review each', sheetSecondary: true, sheet: S({ eyebrow: 'Paystack', title: 'This week’s settlement', chip: '₦1,680,000', tone: 'var(--ad-tone-brand)', icon: I.cash, listTitle: 'Six payments', list: [{ t: 'Zara Events · ₦200,000', s: 'INV-26-4WE9KS · 9 Oct' }, { t: 'Lumen Fitness · ₦150,000', s: 'INV-26-1QP7ZM · 7 Oct' }, { t: 'Tunde Okafor Law · ₦150,000', s: 'INV-26-7DM1XS · 4 Oct' }, { t: 'Bloom Pharmacy · ₦280,000', s: 'INV-26-3MS8QA · 2 Oct' }, { t: 'Mira Skincare · ₦600,000', s: 'INV-26-2FT7RB · 2 Oct' }, { t: 'Lumen Fitness · ₦300,000', s: 'INV-26-2GH5TY · 1 Oct' }], body: 'Fees of ₦25,200 are recorded as an expense when you reconcile.', primary: 'Reconcile all 6', onPrimary: function () { self.clearId('paystack', 'done', '', 'All 6 matched. ₦25,200 of fees is now in Expenses.', { final: true }); } }) };
    return [pick('kora'), match, pick('payouts'), retain, pick('renew'), pay];
  }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this), X = this.sheets();
    var dk = this.deck(), dv = this.deckView(dk), queue = dk.filter(function (d) { return !s.gone[d.id] && !s.snoozed[d.id]; });
    var T = this.tabData(), q = s.mq.trim().toLowerCase();
    var chip = T.chips.map(function (c) { return c[0]; }).indexOf(s.chip) >= 0 ? s.chip : 'all';
    var TT = this.tabTools(T), fkey = 'money-' + s.tab;
    var list0 = T.all.filter(function (r) { return T.inChip(r, chip) && (!q || T.match(r).indexOf(q) >= 0); }), list = this.applyFlt(fkey, list0, TT.facets);
    var cp = Math.min(s.mpage, Math.max(0, Math.ceil(list.length / s.mper) - 1)), pageList = list.slice(cp * s.mper, cp * s.mper + s.mper);
    var rows = pageList.map(function (r, i) {
      var id = String(T.id(r));
      return { cells: T.cells(r), anim: self.anim(s.ra), delay: (i * 0.035) + 's', aria: T.aria(r) + '. Press Enter to open.', menuAria: 'Actions for ' + id, menuX: self.popOn('row', id),
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; T.open(r); },
        key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); T.open(r); } },
        menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', id, 260, 250, 'Actions for ' + id); } };
    });
    rows.forEach(function (r, i) { Object.assign(r, self.rowSel(fkey, String(T.id(pageList[i])), TT.label(pageList[i]))); });
    var TMO = this.toolsView(fkey, { noun: TT.noun, one: TT.one, pageIds: pageList.map(function (r) { return String(T.id(r)); }), allIds: list.map(function (r) { return String(T.id(r)); }), rowsById: function (ids) { return list.filter(function (r) { return ids.indexOf(String(T.id(r))) >= 0; }); }, rows: list0, unfiltered: list0, facets: TT.facets, acts: TT.acts, exportFn: function (sel) { self.exportSheet({ noun: TT.noun, file: 'wdc-' + s.tab, cols: TT.xcols, all: T.all, filtered: list, selected: sel }); }, importFn: TT.importFn });
    var counts = { inv: this.invAll().length, quotes: this.quotesAll().length, payments: this.paymentsAll().length, payouts: this.payoutsAll().length, expenses: this.expensesAll().length };
    var tabDefs = [['inv', 'Invoices'], ['quotes', 'Quotes'], ['payments', 'Payments'], ['payouts', 'Payouts'], ['expenses', 'Expenses']];
    var warnN = { inv: this.invAll().filter(function (r) { return r.tab === 'over'; }).length, payments: this.paymentsAll().filter(function (r) { return r.unmatched; }).length, payouts: this.payoutsAll().filter(function (r) { return r.ready; }).length };
    var tabs = tabDefs.map(function (t) { var on = !s.rep && s.tab === t[0], w = warnN[t[0]] > 0; return { hasN: true, label: t[1], n: counts[t[0]], chip: w ? (t[0] === 'inv' ? 'var(--ad-tone-bad)' : 'var(--ad-tone-warn)') : 'var(--ad-tone-flat)', ink: w ? '#fff' : 'var(--ad-on-flat)', cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ tab: t[0], rep: false, chip: 'all', mpage: 0, mq: '', ra: self.state.ra + 1 }); } }; });
    tabs.push({ hasN: false, label: 'Reports', n: '', chip: 'var(--ad-tone-flat)', ink: 'var(--ad-on-flat)', cls: s.rep ? 'on' : '', sel: s.rep ? 'true' : 'false', pick: function () { if (!s.rep) self.setState({ rep: true, ra: self.state.ra + 1 }); } });
    var chips = T.chips.map(function (c) { var on = chip === c[0]; return { t: c[1], n: T.all.filter(function (r) { return T.inChip(r, c[0]) && (!q || T.match(r).indexOf(q) >= 0); }).length, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ chip: c[0], mpage: 0, ra: self.state.ra + 1 }); } }; });
    var MP = Object.assign(this.pager('money', list.length, s.mper, cp, function (k) { self.setState({ mpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ mper: n, mpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ mper: 20, mpage: 0, ra: self.state.ra + 1 }); self.say('Showing all ' + list.length + ' on one page.'); } });
    var ACT = { inv: ['Remind late clients', I.mail, function () { self.remindLate(); }], quotes: ['New quote', 'M12 5v14M5 12h14', function () { self.newQuote(); }], payments: ['Record a payment', I.cash, function () { self.recordPick(); }], payouts: ['Approve payouts', I.check, function () { if (s.gone.payouts) self.say('Both payouts are approved. Finance pays them Tuesday.'); else self.open(X.payouts); }], expenses: ['Add expense', 'M12 5v14M5 12h14', function () { self.addExpense(); }] }[s.tab];

    /* figures, all from the rows */
    var inv = this.invAll(), G = 'var(--ad-tone-good)';
    var collected = inv.filter(function (r) { return r.tab === 'paid' && r.status === 'Paid'; }).reduce(function (a, r) { return a + self.amt(r); }, 0);
    var lateN = inv.filter(function (r) { return r.tab === 'over'; }), late = lateN.reduce(function (a, r) { return a + self.amt(r); }, 0);
    var outstanding = late + inv.filter(function (r) { return r.tab === 'due' && !r.sched; }).reduce(function (a, r) { return a + self.amt(r); }, 0);
    var next = this.payoutsAll().filter(function (r) { return r.ready; }).reduce(function (a, r) { return a + r.amount; }, 0);
    var spent = this.expensesAll().reduce(function (a, r) { return a + r.amount; }, 0);
    var stats = [
      { label: 'Collected, October', raw: collected, note: '+18% on September', noteCol: G, dot: G, sheet: S({ eyebrow: 'Money', title: 'Collected in October', chip: this.ngn(collected), tone: G, icon: I.chart, iconTone: G, listTitle: 'By service', list: [{ t: 'Software & AI', s: '₦1,700,000 · 2 payments' }, { t: 'Web', s: '₦1,330,000 · 3 payments' }, { t: 'Social & Ads', s: '₦800,000 · 3 payments' }, { t: 'Branding & Design', s: '₦750,000 · 2 payments' }, { t: 'SEO', s: '₦280,000 · 1 payment' }].concat(s.gone.match ? [{ t: 'SEO, matched transfer', s: '₦180,000 · 1 payment' }] : []), body: 'Paid invoices only, in naira. Dollar invoices are tracked in their own currency.', primary: 'Close' }) },
      { label: 'Outstanding', raw: outstanding, note: this.short(late) + ' late', noteCol: 'var(--ad-bad-ink)', dot: 'var(--ad-tone-bad)', sheet: S({ eyebrow: 'Money', title: 'Outstanding', chip: this.ngn(outstanding), tone: 'var(--ad-tone-warn)', icon: I.wallet, iconTone: 'var(--ad-tone-warn)', listTitle: 'Late first', list: inv.filter(function (r) { return r.tab !== 'paid' && !r.sched; }).sort(function (a, b) { return (a.tab === 'over' ? 0 : 1) - (b.tab === 'over' ? 0 : 1); }).map(function (r) { return { t: r.client + ' · ' + r.amount, s: r.no + ' · ' + r.status, tag: r.tab === 'over' ? 'Late' : 'Due', tone: r.tab === 'over' ? 'var(--ad-tone-bad)' : 'var(--ad-tone-neutral)', open: self.invSheet(r) }; }), body: 'Issued and unpaid. Scheduled invoices (a milestone, a retainer, a dollar deposit) are not counted until they go out.', primary: 'Close' }) },
      { label: 'Next payout', raw: next, note: next ? 'Tue 13 Oct' : 'All approved', noteCol: next ? 'var(--ad-accent-ink)' : G, dot: 'var(--ad-tone-live)', ic: I.send, sheet: next ? X.payouts : S({ eyebrow: 'Payouts', title: 'All approved', icon: I.check, iconTone: G, tone: G, chip: 'Pays Tuesday', body: 'Both payouts are approved. Finance pays them from GTBank NGN on Tuesday and each freelancer gets a payment advice.', primary: 'Close' }) },
      { label: 'Spent, October', raw: spent, note: this.expensesAll().length + ' expenses', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-2)', ic: I.card, sheet: S({ eyebrow: 'Expenses', title: 'Spent in October', chip: this.ngn(spent), tone: 'var(--ad-tone-neutral)', icon: I.card, listTitle: 'Newest first', list: this.expensesAll().map(function (e) { return { t: e.t + ' · ' + self.ngn(e.amount), s: e.cat + ' · ' + e.date, open: self.expenseSheet(e) }; }), primary: 'Add expense', onPrimary: function () { setTimeout(function () { self.addExpense(); }, 60); } }) }
    ].map(function (k, i) { return Object.assign({}, k, self.statDeco(k), { value: self.short(k.raw * p), delay: 'd' + (i + 1), aria: k.label + ': ' + self.ngn(k.raw) + '. ' + k.note, open: function () { self.open(k.sheet); } }); });

    var wayK = ['Paystack', 'Flutterwave', 'Bank', 'Cash'], wayD = { Paystack: [I.card, 'Paystack'], Flutterwave: [I.card, 'Flutterwave'], Bank: [I.cash, 'Bank transfer'], Cash: [I.cash, 'Cash and POS'] };
    var paidRows = inv.filter(function (r) { return r.tab === 'paid' && r.status === 'Paid'; });
    var wayN = wayK.map(function (k) { return paidRows.filter(function (r) { return self.way(r.method) === k; }).reduce(function (a, r) { return a + self.amt(r); }, 0); }), wmax = Math.max.apply(null, wayN.concat([1]));
    var ways = wayK.map(function (k, i) { return { t: wayD[k][1], d: wayD[k][0], v: self.short(wayN[i]), pct: Math.round(wayN[i] / wmax * 100), tone: 'var(--ad-tone-brand)', cls: s.tab === 'payments' && s.chip === k ? 'on' : '', aria: wayD[k][1] + ': ' + self.ngn(wayN[i]) + ' collected. Show these payments.', pick: function () { self.setState({ tab: 'payments', chip: k, mpage: 0, mq: '', ra: self.state.ra + 1 }); } }; });
    var banks = [
      { t: 'GTBank NGN', s: '****4821 · reconciled today', d: I.cash, tag: s.gone.match ? 'Matched' : '1 unmatched', tone: s.gone.match ? G : 'var(--ad-tone-warn)', ink: '#fff', open: function () { if (s.gone.match) self.open(S({ eyebrow: 'Bank account', title: 'GTBank NGN · ****4821', icon: I.cash, rows: [{ k: 'Currency', v: 'Naira' }, { k: 'Last reconciled', v: 'Today' }, { k: 'Used for', v: 'Transfers, payouts, expenses' }], body: 'Every transfer is matched to an invoice.', primary: 'Close' })); else self.open(X.match); } },
      { t: 'Sterling USD', s: '****0932 · all matched', d: I.cash, tag: 'Matched', tone: G, ink: '#fff', open: function () { self.open(S({ eyebrow: 'Bank account', title: 'Sterling USD · ****0932', icon: I.cash, rows: [{ k: 'Currency', v: 'US dollars' }, { k: 'Last reconciled', v: 'Today' }, { k: 'Waiting for', v: 'Zara Events deposit, $1,800' }], body: 'Dollar invoices pay into this account. Add or change banks in Settings.', primary: 'Close' })); } }
    ];
    var upcoming = [
      { when: 'Tue 13', t: 'Freelancer payouts', s: s.gone.payouts ? 'Approved, Finance pays them' : 'Tolu and Kemi · client approved', amount: '₦180,000', tone: s.gone.payouts ? 'var(--ad-tone-neutral)' : 'var(--ad-tone-live)', open: function () { self.open(s.gone.payouts ? S({ eyebrow: 'Payouts', title: 'Approved', icon: I.check, tone: G, iconTone: G, chip: 'Pays Tuesday', body: 'Finance pays both from GTBank NGN on Tuesday.', primary: 'Close' }) : X.payouts); } },
      { when: '14 Oct', t: 'Mira Skincare deposit', s: 'INV-26-9QX4LM', amount: '₦450,000', tone: 'var(--ad-tone-warn)', open: function () { self.open(self.invSheet(inv.filter(function (r) { return r.no === 'INV-26-9QX4LM'; })[0] || {})); } },
      { when: '16 Oct', t: 'Oak and Ivy final invoice', s: 'After the recorded handover', amount: '₦520,000', tone: 'var(--ad-tone-neutral)', open: function () { self.open(X.oak); } },
      { when: '20 Oct', t: 'Halo Clinics milestone 2', s: 'Scheduled · Flutterwave', amount: '₦1.2m', tone: 'var(--ad-tone-neutral)', open: function () { self.open(self.invSheet(inv.filter(function (r) { return r.no === 'INV-26-3HN8TP'; })[0] || {})); } },
      { when: '1 Nov', t: 'November retainers', s: s.gone.retain ? 'Scheduled · 08:00' : 'Four drafts ready', amount: '₦1.45m', tone: 'var(--ad-tone-brand)', open: function () { self.open(dk.filter(function (d) { return d.id === 'retain'; })[0].sheet); } }
    ];
    var hasFilter = !!q || chip !== 'all' || TMO.hasFn;
    return Object.assign(this.kit(), this.extraVals(), dv, {
      ledeA: this.short(collected) + ' collected in October. ' + this.ngn(outstanding) + ' outstanding,', ledeB: this.ngn(late) + ' of it late.',
      deckTitle: 'Money needing you', deckKeys: 'Focus the card: D done, S snooze', snoozeLabel: 'Snooze', snoozeShort: 'Snooze', canPass: true,
      emptyTitle: 'The money is looked after.', emptyBody: 'Nothing needs you on invoices, payouts or reconciliation. Next:', emptyNext: 'Mira’s ₦450,000 deposit is due Wed 14 Oct.', emptyPrimaryLabel: 'New invoice', emptySecondaryLabel: 'Bring everything back', emptyPrimary: function () { self.newInvoice(); },
      tabTitle: s.rep ? 'Reports' : T.title, total: s.rep ? '' : counts[s.tab], tabs: tabs, chips: chips, cols: T.cols, rows: rows, MP: MP, TMO: TMO, isReports: s.rep, notReports: !s.rep, RV: s.rep ? this.repVals() : {}, qPh: T.ph, mq: s.mq, q: s.mq, hasQ: !!s.mq,
      onQ: function (e) { self.setState({ mq: e.target.value, mpage: 0, ra: self.state.ra + 1 }); }, clearQ: function () { self.setState({ mq: '', ra: self.state.ra + 1 }); },
      tabActLabel: ACT[0], tabActD: ACT[1], tabAct: ACT[2],
      empty: !list.length, hasFilter: hasFilter && !!T.all.length, noFilterEmpty: !T.all.length, clearFilters: function () { self.setState({ mq: '', chip: 'all', mpage: 0, flt: {}, ra: self.state.ra + 1 }); },
      emptyTitleT: q ? 'Nothing matches "' + s.mq + '".' : T.emptyTitle, emptyBodyT: q ? 'Search by number, client or amount.' : T.emptyBody,
      stats: stats, ways: ways, banks: banks, upcoming: upcoming,
      newInvoice: function () { self.newInvoice(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 250, 240, 'More for money'); }, choresX: this.popOn('chores', 'chores')
    });
  }
