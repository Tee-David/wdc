  /* ======================= Owner · A client's monthly plan (retainer): Mira Skincare, social media ======================= */
  pageState() {
    return { ptab: 'parts', billing: 'Two parts', ended: false, sent: false,
      costs: [{ id: 'c1', what: 'Meta ad credits, top up', date: '20 Oct 2026', amt: 25000, on: '' }],
      systems: [{ id: 's1', name: 'Instagram business account', access: 'Bola T. (client)', renews: 'Does not renew', soon: false, notes: 'WDC Studio is a partner in Meta Business Suite. Bola approves new partners.' },
        { id: 's2', name: 'Canva team', access: 'The studio', renews: 'Mon 2 Nov', soon: true, notes: 'Mira brand kit lives here. Renews monthly on the studio card.' }],
      reports: { '2026-10': { body: '', shared: false } } };
  }
  pageName() { return 'Social media plan'; }
  navSection() { return 'Clients'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'What this plan needs', icon: I.target, body: 'A draft to send, costs not yet billed, a renewal coming and last month’s report. Act on one and the next rises.' },
      { target: 'records', title: 'The plan’s books and work', icon: I.layers, body: 'Every part of the term with its invoice and what was paid, the costs passed on, the systems it looks after and the monthly reports.' },
      { target: 'billing', title: 'How they pay', icon: I.wallet, body: 'Monthly, every three months, in two parts or the whole term up front. A change only moves what is not yet drafted.' },
      { target: 'rail', title: 'The figures', icon: I.wallet, body: 'The term, what is drafted, what is paid and the costs still to bill, with what a month includes and the next draft.' }
    ];
  }
  deck() {
    var self = this, I = this.icons(), s = this.state, unbilled = s.costs.filter(function (c) { return !c.on; });
    var D = [];
    if (!s.sent) D.push({ id: 'send', kind: 'Money', urgency: 'Draft ready', utone: '#b84a00', label: 'INV-26-9QX4LM', title: 'Send the 1 Nov invoice', body: '₦483,750 with VAT: the first of two parts. Check it, then send it with the pay link.', meta: [{ k: 'Part', v: '₦450,000' }, { k: 'VAT', v: '₦33,750' }],
      why: 'Drafted this morning because the part falls due on 1 Nov. Nothing goes to Adaeze until you press Send.',
      primaryLabel: 'Open and send', primaryFn: function () { window.location.href = 'A-Invoice.dc.html'; }, secondaryLabel: 'Open the client', secondaryFn: function () { window.location.href = 'A-Client.dc.html'; } });
    if (unbilled.length) D.push({ id: 'costs', kind: 'Costs', urgency: unbilled.length + ' not billed', utone: '#a16207', label: 'Passed on', title: this.ngn(unbilled.reduce(function (n, c) { return n + c.amt; }, 0)) + ' paid on Mira’s behalf', body: 'They ride on the next part (1 Dec) unless you bill them now.', meta: unbilled.slice(0, 3).map(function (c) { return { k: c.what, v: self.ngn(c.amt) }; }),
      primaryLabel: 'Bill them now', primaryFn: function () { self.billNow(); }, secondaryLabel: 'See the costs', secondaryFn: function () { self.setState({ ptab: 'costs' }); } });
    D.push({ id: 'renew', kind: 'Renewal', urgency: 'Renews Mon 2 Nov', utone: '#a16207', label: 'Systems', title: 'Canva team renews soon', body: 'Mira brand kit lives here. Renews monthly on the studio card.', meta: [{ k: 'Access', v: 'The studio' }],
      primaryLabel: 'See the systems', primaryFn: function () { self.setState({ ptab: 'systems' }); self.clearId('renew', 'done', '', 'Opened the systems.'); } });
    if (!s.reports['2026-10'].shared) D.push({ id: 'report', kind: 'Report', urgency: s.reports['2026-10'].body ? 'Written, not shared' : 'Not written', utone: '#5c5c7a', label: 'October 2026', title: 'October 2026 report for Mira Skincare', body: 'Say what was done and what it achieved. It appears on their Billing page once you share it.',
      primaryLabel: s.reports['2026-10'].body ? 'Open the report' : 'Write the report', primaryFn: function () { self.writeReport('2026-10'); } });
    return D;
  }
  ngn(n) { return '₦' + Math.round(n).toLocaleString('en-NG'); }
  billNow() {
    var self = this, I = this.icons(), un = this.state.costs.filter(function (c) { return !c.on; }), total = un.reduce(function (n, c) { return n + c.amt; }, 0);
    this.ask({ eyebrow: 'Social media plan', title: 'Draft an invoice for the costs not yet billed?', body: this.ngn(total) + ' for ' + un.length + (un.length === 1 ? ' cost' : ' costs') + '. It waits on Today for you to send.', ok: 'Draft the invoice', icon: I.cash,
      onOk: function () { self.setState({ costs: self.state.costs.map(function (c) { return c.on ? c : Object.assign({}, c, { on: 'INV-26-YE54BH' }); }) }); self.clearId('costs', 'done', '', 'Saved. INV-26-YE54BH is drafted on Today for you to send.'); } });
  }
  addCost() {
    var self = this, I = this.icons();
    this.open(this.sh({ eyebrow: 'Social media plan', title: 'Add a cost to pass on', icon: I.cash, body: 'It goes on the next invoice the plan drafts, or bill it on its own from this page.', form: { what: '', amt: '', date: 'Mon 26 Oct' },
      fields: [{ key: 'what', label: 'What it was', ph: 'VPS for October', wide: true }, { key: 'amt', label: 'Amount (₦)', mode: 'decimal', ph: '25,000' }, { key: 'date', label: 'Paid on' }],
      primary: 'Add the cost', secondary: 'Cancel', primaryDis: function (ctx) { return (ctx.form.what || '').trim() && Number(String(ctx.form.amt || '').replace(/[^\d.]/g, '')) > 0 ? '' : 'Say what it was and what it cost.'; },
      onPrimary: function (ctx) { var amt = Number(String(ctx.form.amt).replace(/[^\d.]/g, '')); self.setState({ ptab: 'costs', costs: self.state.costs.concat([{ id: 'c' + Date.now(), what: ctx.form.what.trim(), date: ctx.form.date || 'Mon 26 Oct', amt: amt, on: '' }]) }); self.say('Saved. ' + ctx.form.what.trim() + ' goes on the next invoice.'); } }));
  }
  addSystem() {
    var self = this, I = this.icons();
    this.open(this.sh({ eyebrow: 'Social media plan', title: 'Add a system the plan looks after', icon: I.layers, form: { name: '', access: '', renews: '', notes: '' },
      fields: [{ key: 'name', label: 'What it is', ph: 'VPS, website, scraper app' }, { key: 'access', label: 'Access held by', ph: 'The studio, or the client' }, { key: 'renews', label: 'Renews', ph: 'Leave empty if it does not renew', hint: 'A domain, hosting or licence date.' }, { key: 'notes', label: 'Notes', type: 'area', wide: true, ph: 'Where it lives and anything the next person should know. Never a password.' }],
      primary: 'Add the system', secondary: 'Cancel', primaryDis: function (ctx) { return (ctx.form.name || '').trim() ? '' : 'Name what the plan looks after.'; },
      onPrimary: function (ctx) { self.setState({ ptab: 'systems', systems: self.state.systems.concat([{ id: 's' + Date.now(), name: ctx.form.name.trim(), access: ctx.form.access || 'Not noted', renews: ctx.form.renews || 'Does not renew', soon: false, notes: ctx.form.notes || 'No notes' }]) }); self.say('Saved. ' + ctx.form.name.trim() + ' is on the plan.'); } }));
  }
  writeReport(m) {
    var self = this, I = this.icons(), cur = this.state.reports[m];
    this.open(this.sh({ eyebrow: 'Social media plan', title: 'Report for October 2026', icon: I.edit, body: 'What was done, what it achieved and what comes next. It stays a draft until you press Share.', compose: true, composeLabel: 'The report', composePh: 'Posted 12 of 12 planned posts and 4 reels.', draft: cur.body, required: true, requiredWhy: 'Say what was done this month.',
      primary: 'Save the report', secondary: 'Cancel', onPrimary: function (ctx) { var r = Object.assign({}, self.state.reports); r[m] = { body: ctx.draft, shared: false }; self.setState({ ptab: 'reports', reports: r }); self.say('Saved. Share it when it reads right.'); } }));
  }
  shareReport(m) {
    var self = this, I = this.icons();
    this.ask({ eyebrow: 'Social media plan', title: 'Share the October 2026 report with Mira Skincare?', body: 'It appears on their Billing page and Adaeze gets a notice. She can switch these emails off.', ok: 'Share the report', icon: I.send,
      onOk: function () { var r = Object.assign({}, self.state.reports); r[m] = Object.assign({}, r[m], { shared: true }); self.setState({ reports: r }); self.clearId('report', 'done', '', 'Updated. The report is on their Billing page.'); } });
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (pop.kind === 'chores') return [
      it('Open the client', I.users, function () { window.location.href = 'A-Client.dc.html'; }),
      it('Money for this client', I.wallet, function () { window.location.href = 'A-Money.dc.html'; }),
      this.menuSep(),
      it('End the plan', I.x, function () { self.endPlan(); }, { danger: true })
    ];
    return [];
  }
  endPlan() {
    var self = this, I = this.icons();
    this.ask({ eyebrow: 'Social media plan', title: 'End the social media plan?', body: 'Parts not yet drafted never will be. Drafts already made stay for you to send or void.', ok: 'End the plan', icon: I.x, tone: 'var(--ad-tone-bad)', needAck: true, ackText: 'I understand the second part will not be drafted.',
      onOk: function () { self.setState({ ended: true }); self.say('Updated. The social media plan has ended.'); } });
  }
  renderVals() {
    var s = this.state, self = this, I = this.icons();
    var BILL = { 'Monthly': '₦300,000 on the same day each month, 3 parts from 1 Nov', 'Quarterly': '₦900,000 once, before the start (a 3 month term is one quarter)', 'Two parts': '₦450,000 before the start, ₦450,000 on 1 Dec', 'Whole term up front': '₦900,000 once, before the start' };
    var parts = s.billing === 'Two parts' ? [['1 of 2', '1 Nov 2026', 'INV-26-9QX4LM', s.sent ? 'Sent' : 'Draft', 450000], ['2 of 2', '1 Dec 2026', '', 'Scheduled', 450000]]
      : s.billing === 'Monthly' ? [['1 of 3', '1 Nov 2026', 'INV-26-9QX4LM', s.sent ? 'Sent' : 'Draft', 450000], ['2 of 3', '1 Dec 2026', '', 'Scheduled', 225000], ['3 of 3', '1 Jan 2027', '', 'Scheduled', 225000]]
      : [['1 of 1', '1 Nov 2026', 'INV-26-9QX4LM', s.sent ? 'Sent' : 'Draft', 450000], ['2 of 2', '1 Dec 2026', '', 'Scheduled', 450000]];
    var TONE = { Draft: ['var(--ad-tone-flat)', 'var(--ad-on-flat)'], Sent: ['var(--ad-tone-warn)', '#fff'], Scheduled: ['var(--ad-tone-flat)', 'var(--ad-on-flat)'] };
    var unbilled = s.costs.filter(function (c) { return !c.on; }), unSum = unbilled.reduce(function (n, c) { return n + c.amt; }, 0);
    var dk = this.deck(), dv = this.deckView(dk);
    var figs = [
      { label: 'The term', raw: '₦900k', note: '3 months', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', tile: 'var(--ad-tone-brand)', ic: I.cal },
      { label: 'Drafted so far', raw: '₦450k', note: '1 of ' + (parts.length) + ' parts', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', tile: 'var(--ad-tone-neutral)', ic: I.doc || I.edit },
      { label: 'Paid', raw: '₦0', note: 'Nothing drafted is paid yet', noteCol: 'var(--ad-dim)', dot: 'var(--ad-tone-good)', tile: 'var(--ad-tone-good)', ic: I.check },
      { label: 'Costs to bill', raw: this.ngn(unSum), note: unbilled.length ? unbilled.length + ' not billed yet' : 'All billed', noteCol: unbilled.length ? 'var(--ad-accent-ink)' : 'var(--ad-dim)', dot: 'var(--ad-tone-warn)', tile: unbilled.length ? 'var(--ad-tone-warn)' : 'var(--ad-tone-neutral)', ic: I.cash }
    ].map(function (k, i) { return Object.assign({}, k, { value: k.raw, delay: 'd' + (i + 1), aria: k.label + ': ' + k.raw + '. ' + k.note }); });
    var TABS = [['parts', 'Parts and payments', parts.length], ['costs', 'Costs passed on', s.costs.length, unbilled.length], ['systems', 'Systems', s.systems.length], ['reports', 'Reports', Object.keys(s.reports).filter(function (k) { return s.reports[k].body; }).length]];
    var rep = s.reports['2026-10'];
    return Object.assign(this.kit(), this.extraVals(), dv, {
      walletIc: I.wallet, termText: '1 Nov 2026 to 31 Jan 2027', billingLower: s.billing.toLowerCase(),
      deckTitle: 'This plan needs', deckKeys: 'Focus the card: D done, S snooze', snoozeLabel: 'Snooze', snoozeShort: 'Snooze', canPass: false,
      emptyTitle: 'Nothing is waiting on this plan.', emptyBody: 'Every draft is sent, every cost is billed and last month’s report is shared. Next:', emptyNext: '₦450,000 on 1 Dec.', emptyPrimaryLabel: 'Open the client', emptySecondaryLabel: 'Bring the cards back', emptyPrimary: function () { window.location.href = 'A-Client.dc.html'; },
      figs: figs,
      ptabs: TABS.map(function (t) { var on = s.ptab === t[0]; return { label: t[1], n: t[2], tone: t[3] ? 'var(--ad-tone-warn)' : 'var(--ad-tone-flat)', ink: t[3] ? '#fff' : 'var(--ad-on-flat)', cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ptab: t[0] }); } }; }),
      isParts: s.ptab === 'parts', isCosts: s.ptab === 'costs', isSystems: s.ptab === 'systems', isReports: s.ptab === 'reports',
      parts: parts.map(function (p, i) { var t = TONE[p[3]]; return { n: p[0], date: p[1], inv: p[2], hasInv: !!p[2], noInv: !p[2], st: p[3], tone: t[0], ink: t[1], amt: self.ngn(p[4]), paid: 'Nil', anim: 'rinA', delay: (i * 0.04) + 's' }; }),
      costs: s.costs.map(function (c) { return { what: c.what, date: c.date, amt: self.ngn(c.amt), on: c.on || 'Not billed yet', tone: c.on ? 'var(--ad-tone-flat)' : 'var(--ad-tone-warn)', ink: c.on ? 'var(--ad-on-flat)' : '#fff', anim: 'rinA' }; }),
      hasUnbilled: unbilled.length > 0, addCost: function () { self.addCost(); }, billNow: function () { self.billNow(); },
      systems: s.systems.map(function (x) { return Object.assign({}, x, { anim: 'rinA' }); }), addSystem: function () { self.addSystem(); },
      reports: [{ month: 'October 2026', st: rep.shared ? 'Shared today' : rep.body ? 'Draft' : 'Not written', tone: rep.shared ? 'var(--ad-tone-good)' : 'var(--ad-tone-flat)', ink: rep.shared ? '#fff' : 'var(--ad-on-flat)', body: rep.body, hasBody: !!rep.body, writeLabel: (rep.body ? 'Edit' : 'Write') + ' the October 2026 report', write: function () { self.writeReport('2026-10'); }, canShare: !!rep.body, share: function () { self.shareReport('2026-10'); } }],
      nextTitle: s.ended ? 'The plan has ended' : '₦450,000 on 1 Dec 2026', nextSub: s.ended ? 'No more parts will be drafted.' : 'Part 2 of 2. Drafted on Today that morning' + (unbilled.length ? ', with ' + self.ngn(unSum) + ' of costs.' : '.'),
      planIncl: [{ t: '12 posts', s: 'a month' }, { t: '4 reels', s: 'a month' }, { t: '1 report', s: 'on the 1st' }],
      endPlan: function () { self.endPlan(); },
      openChores: function (e) { self.openPop(e, 'chores', 'chores', 240, 180, 'More for this plan'); },
      changeBilling: function () {
        var B = Object.keys(BILL);
        self.open(self.sh({ eyebrow: 'Social media · EST-2026-011', title: 'How Mira pays for social media', icon: I.wallet, body: 'Billing is set per client. A draft invoice appears on Today when each part falls due; nothing is emailed until you press Send.', listTitle: 'Billing', select: true, pick: B.indexOf(s.billing), list: B.map(function (b) { return { t: b, s: BILL[b] }; }), note: 'INV-26-9QX4LM is drafted for ₦450,000. A change only affects invoices not yet drafted.',
          primary: function (ctx) { return ctx.pick >= 0 && B[ctx.pick] !== self.state.billing ? 'Change to ' + B[ctx.pick].toLowerCase() : 'Keep this billing'; }, secondary: 'Cancel',
          onPrimary: function (ctx) { var nb = B[ctx.pick], prev = self.state.billing; if (nb === prev) return; self.setState({ billing: nb }); self.say('Updated. Social media is billed ' + nb.toLowerCase() + ' from the next invoice.', { undo: function () { self.setState({ billing: prev }); } }); } }));
      }
    });
  }
