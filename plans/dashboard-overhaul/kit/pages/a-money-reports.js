  /* ======================= Money · Reports =======================
     One dataset of invoices (October is the real list from this page, earlier months are history that adds up to the same story),
     filtered by the parameters, summed into figures, a trend, breakdowns and ageing. Every number below is calculated from those rows. */
  repFamily(c) {
    var s = (c.services && c.services[0]) || '';
    return /Brand/.test(s) ? 'Branding & Design' : (/Social/.test(s) ? 'Social & Ads' : (/Web|Event|Domain/.test(s) ? 'Web & Apps' : (/SEO/.test(s) ? 'SEO' : (/app/i.test(s) ? 'Apps' : (/Software|Care/.test(s) ? 'Software & AI' : 'Web & Apps')))));
  }
  repIso(txt, fallbackYear) {
    var m = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.exec(txt || ''); if (!m) return '';
    var mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m[2]) + 1;
    return (fallbackYear || '2026') + '-' + ('0' + mo).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  /* every invoice the report can see */
  repRows() {
    var self = this, clients = this.clientsData().filter(function (c) { return c.status !== 'lead'; }), byName = {}; clients.forEach(function (c) { byName[c.name] = c; });
    var out = [];
    /* October: the live list */
    this.invAll().forEach(function (r) {
      if (r.sched) return;
      var c = byName[r.client] || { name: r.client, services: [] }, amt = self.amt(r), usd = r.amount.charAt(0) === '$', d = self.repIso(r.date), paid = r.tab === 'paid' && r.status === 'Paid', ref = r.tab === 'paid' && r.status === 'Refunded', later = function (x, y) { return x > y ? x : y; };
      var issued = paid || ref ? later(self.addDays(d, -4), '2026-10-01') : (r.tab === 'over' ? self.addDays(d, -14) : (function (x) { return x > '2026-10-09' ? '2026-10-09' : x; })(later(self.addDays(d, -14), '2026-10-01'))), due = paid || ref ? self.addDays(issued, 14) : d;
      out.push({ no: r.no, client: r.client, svc: self.repFamily(c), amt: usd ? parseInt(r.amount.replace(/[^\d]/g, ''), 10) : amt, cur: usd ? 'USD' : 'NGN', issued: issued, due: due, paid: paid ? d : '', st: paid ? 'paid' : (ref ? 'refunded' : (r.tab === 'over' ? 'over' : 'due')), method: self.way(r.method) === 'Bank' ? (/USD/.test(r.method) ? 'USD account' : 'Bank transfer') : self.way(r.method) });
    });
    /* earlier months: history, deterministic. September lands on 4,119,000 so October is +18% on it. */
    var seed = 7, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var targets = [['2025-11', 1250000], ['2025-12', 1620000], ['2026-01', 1900000], ['2026-02', 2200000], ['2026-03', 2900000], ['2026-04', 3100000], ['2026-05', 3600000], ['2026-06', 3300000], ['2026-07', 3000000], ['2026-08', 3700000], ['2026-09', 4119000]];
    var sizes = [90000, 150000, 180000, 225000, 300000, 350000, 450000, 520000, 600000, 850000, 1200000], methods = ['Paystack', 'Paystack', 'Paystack', 'Flutterwave', 'Bank transfer', 'Bank transfer', 'Cash'], n = 0;
    targets.forEach(function (t) {
      var left = t[1], mo = t[0], k = 0;
      while (left > 0) {
        var pick = sizes[Math.floor(rnd() * sizes.length)]; if (pick > left || left - pick < 90000 && left - pick > 0) pick = left;
        var c = clients[Math.floor(rnd() * clients.length)], day = 1 + Math.floor(rnd() * 27), paid = mo + '-' + ('0' + day).slice(-2), gap = 3 + Math.floor(rnd() * 16), late = rnd() < 0.18;
        out.push({ no: 'INV-' + mo.slice(2, 4) + '-' + ('000' + (++n)).slice(-4) + 'H', client: c.name, svc: self.repFamily(c), amt: pick, cur: 'NGN', issued: self.addDays(paid, -gap), due: late ? self.addDays(paid, -3) : self.addDays(paid, 7), paid: paid, st: 'paid', method: methods[Math.floor(rnd() * methods.length)] });
        left -= pick; k++;
      }
    });
    [['2026-02-12', 1200, 'Halo Clinics'], ['2026-05-20', 900, 'Halo Clinics'], ['2026-08-11', 1500, 'Halo Clinics']].forEach(function (u, i) { out.push({ no: 'INV-26-USD' + (i + 1), client: u[2], svc: 'Software & AI', amt: u[1], cur: 'USD', issued: self.addDays(u[0], -5), due: self.addDays(u[0], 9), paid: u[0], st: 'paid', method: 'USD account' }); });
    return out;
  }
  repExpenses() {
    var self = this, out = [];
    this.expensesAll().forEach(function (e) { out.push({ d: '2026-10-' + ('0' + (parseInt(e.date, 10) || 1)).slice(-2), amt: e.amount, cat: e.cat }); });
    var hist = [118000, 121000, 126000, 133000, 140000, 147000, 152000, 161000, 168000], mos = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'], split = [['Software', .4], ['Hosting', .25], ['Domains', .1], ['Fees', .15], ['Other', .1]];
    mos.forEach(function (mo, i) { split.forEach(function (sp) { out.push({ d: mo + '-15', amt: Math.round(hist[i] * sp[1]), cat: sp[0] }); }); });
    return out;
  }
  /* the dates a period name means */
  repSpan(p) {
    var T = this.today(), self = this, y = T.slice(0, 4), mo = T.slice(5, 7);
    if (p.period === 'month') return { from: y + '-' + mo + '-01', to: T, label: 'October 2026 so far', prev: { from: '2026-09-01', to: '2026-09-30', label: 'September' } };
    if (p.period === '30') return { from: this.addDays(T, -29), to: T, label: 'Last 30 days', prev: { from: this.addDays(T, -59), to: this.addDays(T, -30), label: 'The 30 days before' } };
    if (p.period === 'quarter') return { from: '2026-10-01', to: T, label: 'Q4 so far', prev: { from: '2026-07-01', to: '2026-09-30', label: 'Q3' } };
    if (p.period === 'ytd') return { from: '2026-01-01', to: T, label: 'Year to date', prev: { from: '2025-01-01', to: '2025-10-10', label: 'The same days in 2025' } };
    if (p.period === '12m') return { from: this.addDays(T, -364), to: T, label: 'Last 12 months', prev: { from: this.addDays(T, -729), to: this.addDays(T, -365), label: 'The 12 months before' } };
    var f = p.from || this.addDays(T, -29), t = p.to || T; if (t < f) { var x = f; f = t; t = x; }
    var len = Math.round((this.isoAt(t) - this.isoAt(f)) / 86400000) + 1;
    return { from: f, to: t, label: this.fmtDate(f) + ' to ' + this.fmtDate(t), prev: { from: this.addDays(f, -len), to: this.addDays(f, -1), label: 'The ' + len + ' days before' } };
  }
  repFilter(rows, p) {
    var self = this;
    return rows.filter(function (r) {
      if (r.cur !== (p.cur || 'NGN')) return false;
      if (p.svc.length && p.svc.indexOf(r.svc) < 0) return false;
      if (p.client.length && p.client.indexOf(r.client) < 0) return false;
      if (p.method.length && p.method.indexOf(r.method) < 0) return false;
      if (p.status.length) { var lab = r.st === 'paid' ? (r.paid > r.due ? 'Paid late' : 'Paid on time') : (r.st === 'over' ? 'Overdue' : (r.st === 'refunded' ? 'Refunded' : 'Due')); if (p.status.indexOf(lab) < 0) return false; }
      return true;
    });
  }
  repCalc(rows, exps, sp, T) {
    var self = this, inP = function (d) { return d >= sp.from && d <= sp.to; };
    var invoiced = 0, collected = 0, paidOfIssued = 0, days = 0, nDays = 0, open = 0, over = 0, nOver = 0, refunded = 0;
    rows.forEach(function (r) {
      if (inP(r.issued)) invoiced += r.amt;
      if (r.paid && inP(r.paid)) { collected += r.amt; days += Math.round((self.isoAt(r.paid) - self.isoAt(r.issued)) / 86400000); nDays++; }
      if (inP(r.issued) && r.paid) paidOfIssued += r.amt;
      if (r.st === 'refunded' && inP(r.issued)) refunded += r.amt;
      if (!r.paid && r.st !== 'refunded' && r.issued <= sp.to) { open += r.amt; if (r.due < T) { over += r.amt; nOver++; } }
    });
    var spent = 0; exps.forEach(function (e) { if (inP(e.d)) spent += e.amt; });
    return { invoiced: invoiced, collected: collected, open: open, over: over, nOver: nOver, avgDays: nDays ? Math.round(days / nDays * 10) / 10 : 0, rate: invoiced ? Math.round(paidOfIssued / invoiced * 100) : 0, spent: spent, net: collected - spent, refunded: refunded, n: nDays };
  }
  repVals() {
    var self = this, s = this.state, I = this.icons(), p = s.rp, T = this.today(), usd = p.cur === 'USD';
    var money = function (n) { return (usd ? '$' : '₦') + Math.round(n).toLocaleString('en-NG'); }, shortM = function (n) { return usd ? '$' + Math.round(n).toLocaleString('en-NG') : self.short(n); };
    var rows = this.repFilter(this.repRows(), p), exps = this.repExpenses(), sp = this.repSpan(p);
    var cur = this.repCalc(rows, usd ? [] : exps, sp, T), cmp = p.compare === 'none' ? null : this.repCalc(rows, usd ? [] : exps, p.compare === 'year' ? { from: this.addMonths(sp.from, -12), to: this.addMonths(sp.to, -12) } : sp.prev, T);
    var cmpLabel = p.compare === 'none' ? '' : (p.compare === 'year' ? 'the same days last year' : sp.prev.label.toLowerCase());
    var hasCmpData = !!(cmp && (cmp.invoiced || cmp.collected));
    var delta = function (a, b, lowerIsBetter) {
      if (!cmp) return { t: '', col: 'var(--ad-dim)' }; if (!hasCmpData) return { t: 'No data for ' + cmpLabel, col: 'var(--ad-dim)' };
      if (!b) return { t: a ? 'New against ' + cmpLabel : 'Same as ' + cmpLabel, col: 'var(--ad-dim)' };
      var pc = Math.round((a - b) / b * 100), good = lowerIsBetter ? pc <= 0 : pc >= 0;
      return { t: (pc > 0 ? '+' : '') + pc + '% on ' + cmpLabel, col: pc === 0 ? 'var(--ad-dim)' : (good ? 'var(--ad-tone-good)' : 'var(--ad-bad-ink)') };
    };
    var dInv = delta(cur.invoiced, cmp && cmp.invoiced), dCol = delta(cur.collected, cmp && cmp.collected), dSp = delta(cur.spent, cmp && cmp.spent, true), dNet = delta(cur.net, cmp && cmp.net);
    var dDays = !cmp || !hasCmpData ? { t: '', col: 'var(--ad-dim)' } : { t: (cur.avgDays - cmp.avgDays > 0 ? '+' : '') + (Math.round((cur.avgDays - cmp.avgDays) * 10) / 10) + ' days on ' + cmpLabel, col: cur.avgDays <= cmp.avgDays ? 'var(--ad-tone-good)' : 'var(--ad-bad-ink)' };
    var G = 'var(--ad-tone-good)', B = 'var(--ad-tone-brand)', W = 'var(--ad-tone-warn)';
    var kpis = [
      { label: 'Invoiced', value: shortM(cur.invoiced), full: money(cur.invoiced), note: dInv.t || 'Issued in this period', col: dInv.col, ic: I.file, tile: B },
      { label: 'Collected', value: shortM(cur.collected), full: money(cur.collected), note: dCol.t || (cur.n + (cur.n === 1 ? ' invoice paid' : ' invoices paid')), col: dCol.col, ic: I.cash, tile: G },
      { label: 'Outstanding', value: shortM(cur.open), full: money(cur.open), note: money(cur.over) + ' overdue, ' + cur.nOver + (cur.nOver === 1 ? ' invoice' : ' invoices'), col: cur.over ? 'var(--ad-bad-ink)' : 'var(--ad-dim)', ic: I.wallet, tile: W },
      { label: 'Collection rate', value: cur.rate + '%', full: cur.rate + '% of invoiced', note: 'Of what was invoiced, how much is paid', col: 'var(--ad-dim)', ic: I.check, tile: G },
      { label: 'Days to pay', value: cur.avgDays ? cur.avgDays + ' days' : 'None yet', full: '', note: dDays.t || 'From issue to payment', col: dDays.col, ic: I.clock, tile: 'var(--ad-tone-neutral)' }
    ];
    if (!usd) kpis.push({ label: 'Spent', value: shortM(cur.spent), full: money(cur.spent), note: dSp.t || 'Software, hosting, domains and fees', col: dSp.col, ic: I.card, tile: 'var(--ad-tone-neutral)' }, { label: 'Net after costs', value: shortM(cur.net), full: money(cur.net), note: dNet.t || 'Collected minus spent', col: cur.net >= 0 ? (dNet.col) : 'var(--ad-bad-ink)', ic: I.chart, tile: cur.net >= 0 ? G : 'var(--ad-tone-bad)' });
    kpis = kpis.map(function (k) { return Object.assign({ aria: k.label + ': ' + (k.full || k.value) + '. ' + k.note }, k); });
    /* trend */
    var span = Math.round((this.isoAt(sp.to) - this.isoAt(sp.from)) / 86400000) + 1, grp = p.group === 'auto' ? (span <= 21 ? 'day' : (span <= 120 ? 'week' : 'month')) : p.group, buckets = [], d0 = sp.from;
    var keyOf = function (d) { if (grp === 'day') return d; if (grp === 'month') return d.slice(0, 7); var dd = self.isoAt(d), dow = (dd.getUTCDay() + 6) % 7; return self.addDays(d, -dow); };
    var cursor = sp.from; var seen = {};
    while (cursor <= sp.to) { var k = keyOf(cursor); if (!seen[k]) { seen[k] = { k: k, inv: 0, col: 0 }; buckets.push(seen[k]); } cursor = self.addDays(cursor, 1); }
    rows.forEach(function (r) { if (r.issued >= sp.from && r.issued <= sp.to && seen[keyOf(r.issued)]) seen[keyOf(r.issued)].inv += r.amt; if (r.paid && r.paid >= sp.from && r.paid <= sp.to && seen[keyOf(r.paid)]) seen[keyOf(r.paid)].col += r.amt; });
    var lab = function (b) { if (grp === 'month') return self.monthName(+b.k.slice(5, 7) - 1).slice(0, 3); if (grp === 'week') { var d = self.isoAt(b.k); return d.getUTCDate() + ' ' + self.monthName(d.getUTCMonth()).slice(0, 3); } var d2 = self.isoAt(b.k); return '' + d2.getUTCDate(); };
    var mx = Math.max.apply(null, buckets.map(function (b) { return Math.max(b.inv, b.col); }).concat([1])), top = this.niceMax(mx);
    var hover = s.rhover, bars = buckets.map(function (b, i) { return { m: lab(b), cls: hover === i ? 'hot' : '', lcls: hover === i ? 'hot' : '', hi: Math.round(b.inv / top * 100), hc: Math.round(b.col / top * 100), delay: (i * 0.03) + 's', bg: 'transparent', aria: lab(b) + ': ' + money(b.inv) + ' invoiced, ' + money(b.col) + ' collected', a: money(b.inv), c: money(b.col), enter: function () { if (self.state.rhover !== i) self.setState({ rhover: i }); } }; });
    var ticks = [0, 0.5, 1].map(function (f) { return { b: f * 100, l: f ? shortM(top * f) : '0' }; });
    var tipB = hover >= 0 && bars[hover] ? bars[hover] : null;
    var tip = tipB ? { m: tipB.m, a: tipB.a, c: tipB.c, left: Math.max(8, Math.min(92, (hover + 0.5) / bars.length * 100)), b: Math.max(buckets[hover].inv, buckets[hover].col) / top * 100, tx: hover > bars.length / 2 ? '-100%' : '0' } : { m: '', a: '', c: '', left: 0, b: 0, tx: '0' };
    /* breakdowns, from the rows collected in the period */
    var inP = function (r) { return r.paid && r.paid >= sp.from && r.paid <= sp.to; }, paidRows = rows.filter(inP), totalC = paidRows.reduce(function (a, r) { return a + r.amt; }, 0) || 1;
    var group = function (f) { var m = {}; paidRows.forEach(function (r) { var k = f(r); m[k] = (m[k] || 0) + r.amt; }); return Object.keys(m).map(function (k) { return { t: k, v: m[k] }; }).sort(function (a, b) { return b.v - a.v; }); };
    var mkBreak = function (list, tone, open) { var mxv = list.length ? list[0].v : 1; return list.map(function (x) { return { t: x.t, v: money(x.v), share: Math.round(x.v / totalC * 100) + '%', pct: Math.round(x.v / mxv * 100), tone: tone, aria: x.t + ': ' + money(x.v) + ', ' + Math.round(x.v / totalC * 100) + '% of collected', pick: function () { open(x.t); } }; }); };
    var bySvc = mkBreak(group(function (r) { return r.svc; }), B, function (t) { self.repAddFilter('svc', t); });
    var byWay = mkBreak(group(function (r) { return r.method; }), 'var(--ad-tone-live)', function (t) { self.repAddFilter('method', t); });
    var cl = mkBreak(group(function (r) { return r.client; }), G, function (t) { self.repAddFilter('client', t); }), cper = 5, cpg = Math.min(s.rcp, Math.max(0, Math.ceil(cl.length / cper) - 1));
    var CL = Object.assign(this.pager('repclients', cl.length, cper, cpg, function (k) { self.setState({ rcp: k }); }, function () { }), { all: function () { self.setState({ rcp: 0 }); } });
    /* ageing of what is still open, as at today */
    var openRows = rows.filter(function (r) { return !r.paid && r.st !== 'refunded'; }), buckets2 = [['Not yet due', function (d) { return d <= 0; }, G], ['1 to 30 days late', function (d) { return d >= 1 && d <= 30; }, W], ['31 to 60 days late', function (d) { return d >= 31 && d <= 60; }, 'var(--ad-tone-live)'], ['Over 60 days late', function (d) { return d > 60; }, 'var(--ad-tone-bad)']];
    var ageTot = openRows.reduce(function (a, r) { return a + r.amt; }, 0), age = buckets2.map(function (b) { var list = openRows.filter(function (r) { return b[1](Math.round((self.isoAt(T) - self.isoAt(r.due)) / 86400000)); }), v = list.reduce(function (a, r) { return a + r.amt; }, 0); return { t: b[0], v: money(v), n: list.length + (list.length === 1 ? ' invoice' : ' invoices'), pct: ageTot ? Math.round(v / ageTot * 100) : 0, tone: b[2], aria: b[0] + ': ' + money(v) + ', ' + list.length + ' invoices', pick: function () { self.say(list.length ? list.map(function (r) { return r.client + ' ' + money(r.amt); }).join(', ') + '.' : 'Nothing in this bucket.'); } }; });
    /* expenses by category */
    var eRows = usd ? [] : exps.filter(function (e) { return e.d >= sp.from && e.d <= sp.to; }), eTot = eRows.reduce(function (a, e) { return a + e.amt; }, 0), eMap = {}; eRows.forEach(function (e) { eMap[e.cat] = (eMap[e.cat] || 0) + e.amt; });
    var eList = Object.keys(eMap).map(function (k) { return { t: k, v: eMap[k] }; }).sort(function (a, b) { return b.v - a.v; }), emx = eList.length ? eList[0].v : 1;
    var byExp = eList.map(function (x) { return { t: x.t, v: money(x.v), share: Math.round(x.v / (eTot || 1) * 100) + '%', pct: Math.round(x.v / emx * 100), tone: 'var(--ad-tone-neutral)', aria: x.t + ': ' + money(x.v), pick: function () { self.setState({ tab: 'expenses', rep: false, chip: x.t === 'Fees' || x.t === 'Software' || x.t === 'Hosting' || x.t === 'Domains' ? x.t : 'Other', mpage: 0 }); } }; });
    /* parameters, shown as chips so nothing is hidden */
    var P = this.state.rp, chips = [];
    [['svc', 'Service'], ['client', 'Client'], ['method', 'Paid with'], ['status', 'Status']].forEach(function (g) { P[g[0]].forEach(function (v) { chips.push({ t: g[1] + ': ' + v, aria: 'Remove ' + g[1] + ' ' + v, remove: function () { var r = Object.assign({}, self.state.rp); r[g[0]] = r[g[0]].filter(function (x) { return x !== v; }); self.setState({ rp: r, rcp: 0 }); } }); }); });
    var choose = function (key, val) { return function () { var r = Object.assign({}, self.state.rp); r[key] = val; if (key === 'period' && val !== 'custom') { r.from = ''; r.to = ''; } self.setState({ rp: r, rhover: -1, rcp: 0 }); }; };
    var seg = function (key, opts) { return opts.map(function (o) { var on = P[key] === o[0], go = choose(key, o[0]); return { t: o[1], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { go(); if (key === 'period' && o[0] === 'custom') setTimeout(function () { self.repParamsSheet(); }, 40); } }; }); };
    var empty = !rows.length || (!cur.invoiced && !cur.collected && !cur.open);
    return {
      period: seg('period', [['month', 'This month'], ['30', 'Last 30 days'], ['quarter', 'This quarter'], ['ytd', 'Year to date'], ['12m', 'Last 12 months'], ['custom', 'Custom']]), compare: seg('compare', [['prev', 'Previous period'], ['year', 'Same days last year'], ['none', 'No comparison']]), groupBy: seg('group', [['auto', 'Auto'], ['day', 'Day'], ['week', 'Week'], ['month', 'Month']]), curr: seg('cur', [['NGN', 'Naira'], ['USD', 'US dollars']]),
      spanLabel: sp.label + ' · ' + this.fmtDate(sp.from) + (sp.from === sp.to ? '' : ' to ' + this.fmtDate(sp.to)), hasChips: chips.length > 0, chips: chips, clearParams: function () { self.setState({ rp: { period: 'month', compare: 'prev', group: 'auto', from: '', to: '', svc: [], client: [], method: [], status: [], cur: 'NGN' }, rcp: 0 }); self.say('Report reset to October so far.'); },
      moreParams: function () { self.repParamsSheet(); }, paramN: chips.length + (P.period === 'custom' ? 1 : 0),
      kpis: kpis, bars: bars, ticks: ticks, hasTip: !!tipB, tip: tip, clearHover: function () { if (self.state.rhover !== -1) self.setState({ rhover: -1 }); }, plotCls: hover >= 0 ? 'dim' : '', groupLabel: grp === 'day' ? 'By day' : (grp === 'week' ? 'By week, starting Monday' : 'By month'),
      bySvc: bySvc, byWay: byWay, byExp: byExp, hasExp: byExp.length > 0, clients: cl.slice(cpg * cper, cpg * cper + cper), CL: CL, hasClientPg: cl.length > cper, age: age, ageTotal: money(ageTot),
      empty: empty, rowsN: rows.length, collectedLabel: money(cur.collected), periodTotal: money(cur.collected),
      exportReport: function () { self.exportReportSheet(rows, sp, cur, money); }, scheduleReport: function () { self.repScheduleSheet(); }, saveView: function () { self.repSaveSheet(); },
      savedViews: s.repSaved.map(function (v) { return { t: v.name, cls: '', pick: function () { self.setState({ rp: Object.assign({}, v.p) }); self.say('Opened the saved view ' + v.name + '.'); }, remove: function () { self.setState({ repSaved: self.state.repSaved.filter(function (x) { return x.name !== v.name; }) }); self.say('Saved view removed.'); } }; }), hasSaved: s.repSaved.length > 0,
      scheds: s.repSched.map(function (x, i) { return { t: x.freq + ' · ' + x.fmt, s: 'To ' + x.to.join(', ') + ' · ' + x.what, remove: function () { var c = self.state.repSched.slice(); c.splice(i, 1); self.setState({ repSched: c }); self.say('Scheduled report removed. Nothing more is sent.'); } }; }), hasScheds: s.repSched.length > 0
    };
  }
  niceMax(n) { var p = Math.pow(10, Math.floor(Math.log10(Math.max(n, 1)))), f = n / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  repAddFilter(key, val) { var r = Object.assign({}, this.state.rp); if (r[key].indexOf(val) < 0) r[key] = r[key].concat([val]); this.setState({ rp: r, rcp: 0 }); this.say('Report filtered to ' + val + '. Remove it from the chips above.'); }
  /* the other parameters: who, what, how it was paid, and exact dates */
  repParamsSheet() {
    var self = this, I = this.icons(), p = this.state.rp, rows = this.repRows(), uniq = function (f) { var o = []; rows.forEach(function (r) { var v = f(r); if (v && o.indexOf(v) < 0) o.push(v); }); return o; };
    this.open(this.sh({ eyebrow: 'Reports', title: 'Report parameters', icon: I.chart, wide: true, body: 'Everything in the report is calculated from the invoices that match. Leave a group empty to include all of it.',
      form: { svc: p.svc.slice(), client: p.client.slice(), method: p.method.slice(), status: p.status.slice(), period: p.period === 'custom' ? 'Custom dates' : 'Use the period on the page', from: p.from, to: p.to },
      chipSets: [{ key: 'svc', label: 'Service', multi: true, opts: ['Branding & Design', 'Web & Apps', 'Social & Ads', 'SEO', 'Apps', 'Software & AI'] }, { key: 'method', label: 'Paid with', multi: true, opts: ['Paystack', 'Flutterwave', 'Bank transfer', 'Cash', 'USD account'] }, { key: 'status', label: 'Status', multi: true, opts: ['Paid on time', 'Paid late', 'Due', 'Overdue', 'Refunded'] }, { key: 'client', label: 'Clients', multi: true, opts: uniq(function (r) { return r.client; }), hint: 'Pick the few you want to look at.' }, { key: 'period', label: 'Dates', opts: ['Use the period on the page', 'Custom dates'] }],
      fields: function (st) { return st.form.period === 'Custom dates' ? [{ key: 'from', type: 'date', label: 'From', min: '2025-01-01' }, { key: 'to', type: 'date', label: 'To', min: '2025-01-01' }] : []; },
      primary: 'Apply to the report', secondary: 'Reset all',
      primaryDis: function (ctx) { var f = ctx.form; if (f.period === 'Custom dates' && !f.from) return 'Choose the first day.'; if (f.period === 'Custom dates' && !f.to) return 'Choose the last day.'; return ''; },
      onPrimary: function (ctx) { var f = ctx.form, r = Object.assign({}, self.state.rp, { svc: f.svc || [], client: f.client || [], method: f.method || [], status: f.status || [] }); if (f.period === 'Custom dates') { r.period = 'custom'; r.from = f.from; r.to = f.to; } else if (r.period === 'custom') { r.period = 'month'; r.from = ''; r.to = ''; } self.setState({ rp: r, rcp: 0, rhover: -1 }); self.say('Updated. The report follows your parameters.'); },
      onSecondary: function () { self.setState({ rp: { period: 'month', compare: 'prev', group: 'auto', from: '', to: '', svc: [], client: [], method: [], status: [], cur: 'NGN' }, rcp: 0 }); self.say('Report reset to October so far.'); } }));
  }
  exportReportSheet(rows, sp, cur, money) {
    var self = this, inP = function (d) { return d >= sp.from && d <= sp.to; };
    var inside = rows.filter(function (r) { return inP(r.issued) || (r.paid && inP(r.paid)); });
    this.exportSheet({ noun: 'invoices in this report', file: 'wdc-report-' + sp.from + '-to-' + sp.to, all: inside, filtered: inside, selected: [], cols: [{ t: 'Invoice', v: function (r) { return r.no; } }, { t: 'Client', v: function (r) { return r.client; } }, { t: 'Service', v: function (r) { return r.svc; } }, { t: 'Amount', v: function (r) { return r.amt; } }, { t: 'Currency', v: function (r) { return r.cur; } }, { t: 'Issued', v: function (r) { return r.issued; } }, { t: 'Due', v: function (r) { return r.due; } }, { t: 'Paid', v: function (r) { return r.paid || ''; } }, { t: 'Days to pay', v: function (r) { return r.paid ? Math.round((self.isoAt(r.paid) - self.isoAt(r.issued)) / 86400000) : ''; } }, { t: 'Status', v: function (r) { return r.st === 'paid' ? (r.paid > r.due ? 'Paid late' : 'Paid on time') : (r.st === 'over' ? 'Overdue' : (r.st === 'refunded' ? 'Refunded' : 'Due')); } }, { t: 'Paid with', v: function (r) { return r.method; } }] });
  }
  repSaveSheet() {
    var self = this, I = this.icons();
    this.open(this.sh({ eyebrow: 'Reports', title: 'Save this view', icon: I.chart, body: 'Keeps the period, comparison and every parameter, so you can open the same view in one tap.', focus: 'f-name',
      fields: [{ key: 'name', label: 'Name', ph: 'For example: Social, this quarter', wide: true, check: function (v) { return v.trim().length > 40 ? 'Keep it under 40 characters.' : (self.state.repSaved.some(function (x) { return x.name.toLowerCase() === v.trim().toLowerCase(); }) ? 'You already saved a view with that name.' : ''); } }],
      primary: 'Save the view', secondary: 'Cancel', primaryDis: function (ctx) { var v = (ctx.form.name || '').trim(); return !v ? 'Give the view a name.' : (self.state.repSaved.some(function (x) { return x.name.toLowerCase() === v.toLowerCase(); }) ? 'Choose a different name.' : ''); },
      onPrimary: function (ctx) { self.setState({ repSaved: self.state.repSaved.concat([{ name: ctx.form.name.trim(), p: JSON.parse(JSON.stringify(self.state.rp)) }]) }); self.say('Saved. Find it under Saved views.'); } }));
  }
  repScheduleSheet() {
    var self = this, I = this.icons(), team = this.teamData();
    this.open(this.sh({ eyebrow: 'Reports', title: 'Email this report on a schedule', icon: I.mail, wide: true, body: 'The report is sent with the parameters you have now, calculated fresh each time. Anyone you pick can switch it off from the email.',
      chipSets: [{ key: 'freq', label: 'How often', opts: ['Every Monday', 'First of the month', 'Every Friday'] }, { key: 'fmt', label: 'Attach', opts: ['PDF summary', 'Excel with rows', 'Both'] }],
      form: { freq: 'Every Monday', fmt: 'PDF summary' },
      listTitle: 'Who gets it', select: true, multi: true, searchPh: 'Search the team', list: team.map(function (m) { return { t: m.name, s: m.dept, ini: m.i, av: m.tone, ref: m }; }), selectWhy: 'Choose at least one person.',
      primary: function (ctx) { return ctx.items.length ? 'Schedule for ' + ctx.items.length + (ctx.items.length === 1 ? ' person' : ' people') : 'Schedule it'; }, secondary: 'Cancel',
      onPrimary: function (ctx) { var f = ctx.form, sp = self.repSpan(self.state.rp); self.setState({ repSched: self.state.repSched.concat([{ freq: f.freq, fmt: f.fmt, to: ctx.items.map(function (it) { return it.ref.name.split(' ')[0]; }), what: sp.label }]) }); self.say('Scheduled. ' + f.freq + ', to ' + ctx.items.length + (ctx.items.length === 1 ? ' person.' : ' people.')); } }));
  }
