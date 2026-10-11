  /* ======================= Client · Billing ======================= */
  pageState() { return { tab: 'inv', bpage: 0, bper: 5, bq: '', ra: 0, paid: false, lastProv: 'paystack', ptab: '' }; }
  pageName() { return 'Billing'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'hero', title: 'What to pay, and how', icon: I.card, body: 'The next invoice sits at the top. Pay with Paystack or Flutterwave in a few taps. Your receipt arrives straight away.' },
      { target: 'table', title: 'Everything you have been billed', icon: I.file, body: 'Invoices, receipts and quotes. Tap a row to open it, and the ⋮ for download and questions.', hint: 'Receipts are also emailed to you.' },
      { target: 'rail', title: 'Where you stand', icon: I.chart, body: 'What you have paid, what is coming and when. Nothing is billed without a quote you accepted.' }
    ];
  }
  navCounts() { return { Billing: { n: this.state.paid ? 0 : 1, tone: 'var(--ad-tone-warn)' }, Messages: { n: 2 } }; }
  due() { return { no: 'INV-26-9QX4LM', amount: '₦450,000', forLabel: 'Social media management, deposit 50%', due: 'Due Wed 14 Oct', receipt: 'RCT-2026-043' }; }
  docsAll() {
    var s = this.state, G = 'var(--ad-tone-good)', F = 'var(--ad-tone-flat)', W = 'var(--ad-tone-warn)';
    var inv = [{ no: 'INV-26-9QX4LM', t: 'Social media management', for: 'Deposit, 50% of 3 months', amount: 450000, date: s.paid ? 'Paid today' : 'Due Wed 14 Oct', status: s.paid ? 'Paid' : 'Due in 4 days', tone: s.paid ? G : W, paid: s.paid, via: s.paid ? (s.lastProv === 'flutterwave' ? 'Flutterwave' : 'Paystack') : '' }, { no: 'INV-26-2FT7RB', t: 'Brand identity', for: 'Deposit, 50%', amount: 600000, date: 'Paid 2 Oct', status: 'Paid', tone: G, paid: true, via: 'Paystack' }];
    var rec = (s.paid ? [{ no: s.lastProv === 'flutterwave' ? 'RCT-2026-F000131' : 'RCT-2026-043', inv: 'INV-26-9QX4LM', t: 'Social media management', amount: 450000, date: 'Today', via: s.lastProv === 'flutterwave' ? 'Flutterwave' : 'Paystack' }] : []).concat([{ no: 'RCT-2026-035', inv: 'INV-26-2FT7RB', t: 'Brand identity', amount: 600000, date: '2 Oct', via: 'Paystack' }]);
    var q = [{ no: 'EST-2026-011', t: 'Social media management, 3 months', amount: 900000, date: 'Accepted 3 Oct', status: 'Accepted', tone: G }, { no: 'EST-2026-004', t: 'Brand identity', amount: 1200000, date: 'Accepted 11 Sep', status: 'Accepted', tone: G }];
    return { inv: inv, rec: rec, q: q };
  }
  fileFor(d, kind) { return { name: d.no + '.pdf', project: 'Billing', view: 'doc', ref: d.no, docTitle: (kind === 'rec' ? 'Receipt · ' : (kind === 'q' ? 'Quote · ' : 'Invoice · ')) + this.ngn(d.amount), when: d.date, size: '190 KB', tone: kind === 'rec' ? '#15803d' : '#c62828', by: 'WDC Studio', ext: 'PDF' }; }
  payNow() {
    var self = this, d = this.due();
    if (this.state.paid) { this.say('This invoice is already paid. Your receipt is in Billing.'); return; }
    this.openPay(d, function (prov) { self.setState({ paid: true, lastProv: prov, tab: 'rec', bpage: 0, ra: self.state.ra + 1 }); self.say('Paid with ' + self.provName(prov) + '. Receipt ' + (prov === 'flutterwave' ? 'RCT-2026-F000131' : 'RCT-2026-043') + ' is in Billing and your email.'); });
  }
  docSheet(d, kind) {
    var self = this, I = this.icons(), due = kind === 'inv' && !d.paid;
    var eb = kind === 'rec' ? 'Receipt' : (kind === 'q' ? 'Quote' : 'Invoice');
    return this.sh({ eyebrow: eb, title: d.no + ' · ' + d.t, chip: kind === 'rec' ? 'Paid' : d.status, tone: kind === 'rec' ? 'var(--ad-tone-good)' : d.tone, icon: kind === 'rec' ? I.check : I.file, iconTone: kind === 'rec' ? 'var(--ad-tone-good)' : d.tone,
      rows: kind === 'rec' ? [{ k: 'For', v: d.inv + ' · ' + d.t }, { k: 'Amount', v: this.ngn(d.amount) }, { k: 'Paid with', v: d.via }, { k: 'Date', v: d.date }] : [{ k: 'For', v: d.for || d.t }, { k: 'Amount', v: this.ngn(d.amount) + (kind === 'q' ? ' with VAT' : '') }, { k: kind === 'q' ? 'Status' : (d.paid ? 'Paid' : 'Due'), v: d.date }].concat(kind === 'inv' ? [{ k: 'Pay with', v: 'Paystack or Flutterwave, no fee to you' }] : []),
      body: due ? 'Pay in a few taps. Your receipt arrives straight away, in Billing and your email.' : (kind === 'rec' ? 'This receipt is also in your email.' : (kind === 'q' ? 'You accepted this quote. The deposit invoice followed it.' : 'Paid. Your receipt is in Receipts.')),
      primary: due ? 'Pay ' + this.ngn(d.amount) : 'Preview the PDF', secondary: due ? 'Preview the PDF' : (kind === 'rec' ? 'Email me a copy' : 'Ask about this'),
      onPrimary: function () { if (due) { self.closeSheet(); setTimeout(function () { self.payNow(); }, 80); } else self.openFile(self.fileFor(d, kind)); },
      onSecondary: function () { if (due) { self.openFile(self.fileFor(d, kind), true); return 'stay'; } if (kind === 'rec') { self.say('Sent to adaeze@miraskincare.ng.'); return; } window.location.href = 'C-Messages.dc.html'; return 'stay'; } });
  }
  rowActions(d, kind) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), out = [];
    if (kind === 'inv' && !d.paid) out.push(it('Pay ' + this.ngn(d.amount), I.card, function () { self.payNow(); }));
    out.push(it('Open', I.open, function () { self.open(self.docSheet(d, kind)); }));
    out.push(it('Preview the PDF', I.eye, function () { self.openFile(self.fileFor(d, kind)); }));
    out.push(it('Download', I.down, function () { self.say(d.no + '.pdf downloaded.'); }));
    if (kind === 'rec') out.push(it('Email me a copy', I.mail, function () { self.say('Sent to adaeze@miraskincare.ng.'); }));
    if (kind !== 'rec') out.push(it('Ask about this', I.msg, function () { window.location.href = 'C-Messages.dc.html'; }));
    return out;
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (pop.kind === 'row') { var D = this.docsAll(), p = pop.id.split(':'), d = (D[p[0]] || []).filter(function (x) { return x.no === p[1]; })[0]; return d ? this.rowActions(d, p[0]) : []; }
    if (pop.kind === 'chores') return [it('Download a statement', I.down, function () { self.say('statement-october-2026.pdf downloaded.'); }, { hint: 'PDF' }), it('Add a billing contact', I.users, function () { window.location.href = 'C-Settings.dc.html'; }, { hint: 'Settings' }), this.menuSep(), it('Ask Finance a question', I.msg, function () { window.location.href = 'C-Messages.dc.html'; })];
    return [];
  }
  renderVals() {
    var s = this.state, self = this, I = this.icons(), S = this.sh.bind(this), D = this.docsAll(), q = s.bq.trim().toLowerCase(), G = 'var(--ad-tone-good)', F = 'var(--ad-tone-flat)';
    var kinds = [['inv', 'Invoices', D.inv], ['rec', 'Receipts', D.rec], ['q', 'Quotes', D.q]];
    var cur = kinds.filter(function (k) { return k[0] === s.tab; })[0];
    var match = function (d) { return !q || (d.no + ' ' + d.t + ' ' + (d.for || '')).toLowerCase().indexOf(q) >= 0; };
    var list = cur[2].filter(match), cp = Math.min(s.bpage, Math.max(0, Math.ceil(list.length / s.bper) - 1));
    var tag = function (t, tone) { return { isTag: true, t: t, tone: tone, ink: tone === F ? 'var(--ad-on-flat)' : '#fff', cls: '' }; }, two = function (t, sub) { return { isTwo: true, t: t, s: sub, cls: '', tcls: 'num' }; }, one = function (t, o) { return Object.assign({ isOne: true, t: t, col: 'var(--ad-ink)', fw: 400, cls: '', tcls: '' }, o || {}); };
    var cols = { inv: ['Invoice', 'Amount', 'Due or paid', 'Status'], rec: ['Receipt', 'Amount', 'Paid', 'Paid with'], q: ['Quote', 'Value', 'Date', 'Status'] }[s.tab].map(function (t, i) { return { t: t, cls: i === 1 ? 'r' : '' }; });
    var rows = list.slice(cp * s.bper, cp * s.bper + s.bper).map(function (d, i) {
      var open = function () { self.open(self.docSheet(d, s.tab)); }, id = s.tab + ':' + d.no;
      var cells = s.tab === 'inv' ? [two(d.no, d.t + ' · ' + d.for), one(self.ngn(d.amount), { cls: 'r', tcls: 'num', fw: 600 }), one(d.date), tag(d.status, d.tone)] : (s.tab === 'rec' ? [two(d.no, d.inv + ' · ' + d.t), one(self.ngn(d.amount), { cls: 'r', tcls: 'num', fw: 600 }), one(d.date), one(d.via, { col: 'var(--ad-dim)' })] : [two(d.no, d.t), one(self.ngn(d.amount), { cls: 'r', tcls: 'num', fw: 600 }), one(d.date), tag(d.status, d.tone)]);
      return { cells: cells, anim: self.anim(s.ra), delay: (i * 0.035) + 's', aria: d.no + ', ' + d.t + ', ' + self.ngn(d.amount) + '. Press Enter to open.', menuAria: 'Actions for ' + d.no, menuX: self.popOn('row', id),
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } },
        menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', id, 250, 250, 'Actions for ' + d.no); } };
    });
    var tabs = kinds.map(function (k) { var on = s.tab === k[0], due = k[0] === 'inv' && !s.paid; return { label: k[1], n: k[2].length, chip: due ? 'var(--ad-tone-warn)' : F, ink: due ? '#fff' : 'var(--ad-on-flat)', cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ tab: k[0], bpage: 0, bq: '', ra: self.state.ra + 1 }); } }; });
    var BL = Object.assign(this.pager('billing', list.length, s.bper, cp, function (k) { self.setState({ bpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ bper: n, bpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ bper: 20, bpage: 0, ra: self.state.ra + 1 }); } });
    var invoiced = D.inv.reduce(function (a, d) { return a + d.amount; }, 0), paid = D.inv.filter(function (d) { return d.paid; }).reduce(function (a, d) { return a + d.amount; }, 0), pct = Math.round(paid / invoiced * 100);
    var d0 = this.due(), P = this.payLogos(), provs = [{ name: 'Paystack', sub: 'Cards and bank transfer', logo: P.paystack }, { name: 'Flutterwave', sub: 'Cards, bank and USSD', logo: P.flutterwave }];
    var upc = [{ when: s.paid ? 'Paid' : 'Wed 14 Oct', tone: s.paid ? G : 'var(--ad-tone-warn)', ink: '#fff', t: 'Social media deposit', s: 'INV-26-9QX4LM', amount: '₦450,000', open: function () { self.open(self.docSheet(D.inv[0], 'inv')); } }, { when: 'At final files', tone: F, ink: 'var(--ad-on-flat)', t: 'Brand identity, 30%', s: 'After you approve the final files', amount: '₦360,000', open: function () { self.say('This invoice goes out when the final logo files are delivered.'); } }, { when: 'After handover', tone: F, ink: 'var(--ad-on-flat)', t: 'Brand identity, 20%', s: 'After the recorded handover meeting', amount: '₦240,000', open: function () { self.say('The last 20% goes out after the handover meeting, as the engagement policy says.'); } }, { when: '1 Dec', tone: F, ink: 'var(--ad-on-flat)', t: 'Social media, second instalment', s: 'Of 3 months', amount: '₦225,000', open: function () { self.say('Invoices go out automatically on these dates.'); } }];
    var lastR = D.rec[0], hasDue = !s.paid;
    return Object.assign(this.kit(), this.extraVals(), {
      ledeA: 'You have paid ' + this.ngn(paid) + ' of ' + this.ngn(invoiced) + ' invoiced.', ledeB: s.paid ? 'Nothing is due.' : this.ngn(450000) + ' is due Wed 14 Oct.',
      headLabel: 'Download a statement', headD: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', headAct: function () { self.say('statement-october-2026.pdf downloaded.'); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 250, 200, 'More for billing'); }, choresX: this.popOn('chores', 'chores'),
      hasDue: hasDue, due: { no: d0.no, when: 'Due Wed 14 Oct', title: 'Pay the social media deposit', body: 'Your monthly social media starts on 1 November. The deposit lets Chiamaka start planning, and it is half of the first three months.', payLabel: 'Pay ₦450,000' }, provs: provs, payNow: function () { self.payNow(); }, previewDue: function () { self.openFile(self.fileFor(D.inv[0], 'inv')); },
      allPaid: s.paid, paidLine: 'Receipt ' + (lastR ? lastR.no : '') + ' for ₦450,000 is in Receipts and your email. Monthly publishing starts on 1 November.', openLastReceipt: function () { self.open(self.docSheet(lastR, 'rec')); },
      tabTitle: cur[1], total: list.length, tabs: tabs, cols: cols, rows: rows, BL: BL, bq: s.bq, hasQ: !!s.bq, onQ: function (e) { self.setState({ bq: e.target.value, bpage: 0, ra: self.state.ra + 1 }); }, clearQ: function () { self.setState({ bq: '', ra: self.state.ra + 1 }); },
      empty: !list.length, emptyTitleT: q ? 'Nothing matches "' + s.bq + '".' : 'Nothing here yet.', emptyBodyT: q ? 'Search by number or project.' : 'It appears here as soon as there is one.',
      paidPct: pct, ringOff: (100 - pct).toFixed(1), paidShort: this.short(paid), invoicedLabel: this.ngn(invoiced), billAria: pct + '% of invoices paid', dueNote: s.paid ? 'All paid' : '₦450,000 due Wed 14 Oct', dueCol: s.paid ? G : 'var(--ad-accent-ink)', upcoming: upc
    });
  }
