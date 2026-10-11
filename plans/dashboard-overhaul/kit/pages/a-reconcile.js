  /* ======================= Owner · Reconciliation ======================= */
  pageName() { return 'Money'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'Payments to match', icon: I.target, body: 'Bank lines that look like an invoice but are not matched yet. Confirm, or record as something else.' },
      { target: 'table', title: 'Every line on the statement', icon: I.cash, body: 'To match, matched and ignored. A line matches an invoice by amount, name and reference.', hint: 'Tap a row to see the suggested invoice.' },
      { target: 'rail', title: 'Does it add up', icon: I.chart, body: 'The statement total and what the studio has recorded, side by side.' },
      { target: 'new', title: 'Import a statement', icon: I.upload, body: 'CSV or Excel from the bank. Nothing is recorded until you confirm a match.' }
    ];
  }
  rcAll() {
    return this.hubApply('bk', [
      { id: 'b1', name: 'Transfer from MIRA SKINCARE LTD', sub: 'Ref INV-26-4KQ8ZD', amt: 850000, date: 'Fri 9 Oct', st: 'To match', sug: 'INV-26-4KQ8ZD', sugC: 'Mira Skincare', score: 'Exact amount and reference' },
      { id: 'b2', name: 'Paystack settlement', sub: 'Settlement for 8 Oct', amt: 1240000, date: 'Fri 9 Oct', st: 'Matched', sug: '3 invoices', sugC: 'Paystack', score: 'Settlement report' },
      { id: 'b3', name: 'Transfer from Z EVENTS', sub: 'No reference', amt: 300000, date: 'Thu 8 Oct', st: 'To match', sug: 'INV-26-9PL2WX', sugC: 'Zara Events', score: 'Name and amount, no reference' },
      { id: 'b4', name: 'POS purchase, Computer Village', sub: 'Card ending 4417', amt: -185000, date: 'Wed 7 Oct', st: 'To match', sug: '', sugC: '', score: 'Looks like an expense' },
      { id: 'b5', name: 'Flutterwave settlement', sub: 'Settlement for 6 Oct', amt: 560000, date: 'Tue 6 Oct', st: 'Matched', sug: '2 invoices', sugC: 'Flutterwave', score: 'Settlement report' },
      { id: 'b6', name: 'Bank charges', sub: 'Monthly maintenance', amt: -4200, date: 'Mon 5 Oct', st: 'Ignored', sug: '', sugC: '', score: 'Recorded as a bank charge' }
    ]);
  }
  rcTone(st) { return { 'To match': ['var(--ad-tone-live)', '#fff'], Matched: ['var(--ad-tone-good)', '#fff'], Ignored: ['var(--ad-tone-flat)', 'var(--ad-on-flat)'] }[st]; }
  naira(n) { return (n < 0 ? '-' : '') + '₦' + Math.abs(n).toLocaleString('en-NG'); }
  rcSheet(b) {
    var self = this, I = this.icons(), t = this.rcTone(b.st), todo = b.st === 'To match', exp = b.amt < 0;
    return this.sh({ eyebrow: 'Bank line · ' + b.st, title: b.name, chip: b.st, tone: t[0], icon: I.cash, iconTone: t[0],
      rows: [{ k: 'Amount', v: this.naira(b.amt) }, { k: 'Date', v: b.date }, { k: 'Narration', v: b.sub }].concat(b.sug ? [{ k: exp ? 'Suggested' : 'Suggested invoice', v: b.sug + (b.sugC ? ', ' + b.sugC : '') }, { k: 'Why', v: b.score }] : [{ k: 'Note', v: b.score }]),
      body: todo ? (b.sug ? 'Confirming marks the invoice paid, issues the receipt and emails the client. Nothing is changed until you confirm.' : 'No invoice matches. Record it as an expense, or ignore it.') : 'Done. Reopen it if it was matched by mistake.',
      primary: todo ? (b.sug ? 'Confirm the match' : 'Record as expense') : 'Reopen', secondary: todo ? 'Ignore this line' : 'Close',
      onPrimary: function () { if (!todo) { self.hubPatch(b.id, { st: 'To match' }); self.say('Updated. The line is back in To match.'); return; } if (!b.sug) { self.hubPatch(b.id, { st: 'Matched', sug: 'Expense', score: 'Recorded as an expense' }); self.say('Saved. Recorded as an expense of ' + self.naira(Math.abs(b.amt)) + '.'); return; } self.ask({ eyebrow: 'Match', title: 'Match this to ' + b.sug + '?', body: b.sugC + ' is told the payment was received and gets receipt RCT-2026-0' + (40 + Math.floor(Math.random() * 9)) + '. The invoice shows as paid.', ok: 'Confirm match', green: true, icon: I.check, tone: 'var(--ad-tone-good)', external: true, onOk: function () { self.hubPatch(b.id, { st: 'Matched' }); self.closeSheet(true); self.say('Matched. ' + b.sug + ' is paid and the receipt is on its way.'); } }, true); return 'stay'; },
      onSecondary: function () { if (todo) { self.hubPatch(b.id, { st: 'Ignored', score: 'Ignored by you' }); self.say('Ignored.', { undo: function () { self.hubPatch(b.id, { st: 'To match' }); } }); } } });
  }
  rcImport() {
    var self = this;
    return { noun: 'bank lines', one: 'bank line', file: 'wdc-statement', intro: 'Upload the statement from your bank. Lines are compared with open invoices. Nothing is recorded until you confirm a match.', rule: 'One row per transaction. Credits are positive, debits negative.',
      fields: [{ k: 'date', t: 'Date', req: true, alias: ['transaction date', 'value date'] }, { k: 'desc', t: 'Narration', req: true, alias: ['description', 'details'] }, { k: 'amt', t: 'Amount', req: true, alias: ['credit', 'value'] }],
      sample: [['9 Oct', 'Transfer from KORA LOGISTICS INV-26-7DM3QA', '1500000'], ['9 Oct', 'POS purchase, Shoprite', '-42000'], ['8 Oct', 'Transfer from ADES KITCHEN', '120000']],
      check: function (r) { if (!r.date) return 'Missing date'; if (!r.desc) return 'Missing narration'; if (isNaN(parseFloat((r.amt || '').replace(/,/g, '')))) return 'Amount is not a number'; if (self.rcAll().some(function (b) { return b.name === r.desc && b.date === r.date; })) return 'Already on the statement'; return ''; },
      label: function (r) { return r.desc || 'No narration'; }, detail: function (r) { return (r.date || '') + ' · ₦' + (r.amt || ''); }, initials: function () { return '₦'; },
      onImport: function (ready) { ready.forEach(function (r, i) { var a = parseFloat(r.amt.replace(/,/g, '')); self.hubAdd('bk', { id: 'bi' + Date.now() + i, name: r.desc, sub: 'Imported just now', amt: a, date: r.date, st: 'To match', sug: /INV-26-\w+/.test(r.desc) ? /INV-26-\w+/.exec(r.desc)[0] : '', sugC: '', score: /INV-26/.test(r.desc) ? 'Reference found' : (a < 0 ? 'Looks like an expense' : 'No reference') }); }); self.setState({ tab: 0, chip: 'all' }); self.say(ready.length + ' lines imported. Review the ones to match.'); } };
  }
  hubCfg() {
    var self = this, I = this.icons(), G = 'var(--ad-tone-good)';
    var pill = function (t) { var x = self.rcTone(t); return { tag: true, t: t, tone: x[0], ink: x[1] }; };
    var items = function () { return self.rcAll().map(function (b) { return Object.assign({}, b, { hay: b.name + ' ' + b.sub + ' ' + b.sug + ' ' + b.sugC, cells: [{ t: b.date }, { t: b.sug || 'No match', col: b.sug ? 'var(--ad-ink)' : 'var(--ad-dim)' }, pill(b.st), { t: self.naira(b.amt), cls: 'r num' }] }); }); };
    return {
      title: 'Reconciliation', statsTitle: 'Statement pulse', deckTitle: 'Payments to match', newLabel: 'Import statement', newFn: function () { self.importSheet(self.rcImport()); },
      ledeA: function () { var a = self.rcAll(); return a.filter(function (b) { return b.st === 'To match'; }).length + ' lines to match, ' + a.filter(function (b) { return b.st === 'Matched'; }).length + ' matched.'; },
      ledeB: function () { return 'Last statement: Fri 9 Oct.'; }, emptyTitle: 'Every line is matched.', emptyNext: 'Import the next statement when the bank issues it.',
      chores: function (it, I2) { return [it('Import statement', I2.upload, function () { self.importSheet(self.rcImport()); }, { hint: 'CSV or Excel' }), it('Back to Money', I2.cash, function () { window.location.href = 'A-Money.dc.html'; })]; },
      tabs: [{ key: 'bk', label: 'Statement', title: 'Statement', noun: 'bank lines', one: 'bank line', ph: 'Narration, client or invoice', file: 'wdc-statement', actLabel: 'Import statement', actD: I.upload, act: function () { self.importSheet(self.rcImport()); }, emptyT: 'No statement yet.', emptyB: 'Import one from your bank.', warn: function () { return self.rcAll().some(function (b) { return b.st === 'To match'; }); },
        cols: [{ t: 'Line' }, { t: 'Date' }, { t: 'Matched to' }, { t: 'State' }, { t: 'Amount', cls: 'r' }], items: items,
        chips: [['all', 'All', function () { return true; }], ['todo', 'To match', function (x) { return x.st === 'To match'; }], ['done', 'Matched', function (x) { return x.st === 'Matched'; }], ['ign', 'Ignored', function (x) { return x.st === 'Ignored'; }]],
        exportCols: [{ t: 'Date', v: function (b) { return b.date; } }, { t: 'Narration', v: function (b) { return b.name; } }, { t: 'Amount', v: function (b) { return b.amt; } }, { t: 'State', v: function (b) { return b.st; } }, { t: 'Matched to', v: function (b) { return b.sug; } }],
        sheet: function (b) { return self.rcSheet(b); },
        actions: function (b, it, I2) { var o = [it('Open line', I2.open, function () { self.open(self.rcSheet(b)); })]; if (b.st === 'To match') { if (b.sug) o.push(it('Confirm the match…', I2.check, function () { self.open(self.rcSheet(b)); })); o.push(it('Ignore', I2.ban, function () { self.hubPatch(b.id, { st: 'Ignored', score: 'Ignored by you' }); self.say('Ignored.', { undo: function () { self.hubPatch(b.id, { st: 'To match' }); } }); })); } return o; },
        bulk: function () { return [{ label: 'Ignore', icon: I.ban, fn: function (sel, done) { sel.filter(function (b) { return b.st === 'To match'; }).forEach(function (b) { self.hubPatch(b.id, { st: 'Ignored' }); }); self.say('Ignored.'); done(); } }]; } }],
      stats: function () { var a = self.rcAll(), cr = a.filter(function (b) { return b.amt > 0; }).reduce(function (s, b) { return s + b.amt; }, 0); return [
        { label: 'To match', value: String(a.filter(function (b) { return b.st === 'To match'; }).length), note: self.naira(a.filter(function (b) { return b.st === 'To match' && b.amt > 0; }).reduce(function (s, b) { return s + b.amt; }, 0)) + ' in', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', ic: I.cash, fn: function () { self.setState({ chip: 'todo', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Money in', value: self.naira(cr), note: 'On this statement', noteCol: 'var(--ad-dim)', dot: G, ic: I.wallet, fn: function () {} },
        { label: 'Matched', value: String(a.filter(function (b) { return b.st === 'Matched'; }).length), note: 'Receipts issued', noteCol: G, dot: G, ic: I.check, fn: function () { self.setState({ chip: 'done', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Ignored', value: String(a.filter(function (b) { return b.st === 'Ignored'; }).length), note: 'Bank charges and the like', noteCol: 'var(--ad-dim)', dot: 'var(--ad-tone-neutral)', ic: I.ban, fn: function () { self.setState({ chip: 'ign', hpg: 0, ra: self.state.ra + 1 }); } }]; },
      rail: function () { return [{ title: 'Open invoices', sub: '₦2,315,000', rows: [{ t: 'INV-26-4KQ8ZD', s: 'Mira Skincare · ₦850,000', d: I.file, tag: 'Match', tagTone: 'var(--ad-tone-warn)', open: function () { self.setState({ chip: 'todo', ra: self.state.ra + 1 }); } }, { t: 'INV-26-9PL2WX', s: 'Zara Events · ₦300,000', d: I.file, tag: 'Match', tagTone: 'var(--ad-tone-warn)', open: function () { self.setState({ chip: 'todo', ra: self.state.ra + 1 }); } }, { t: 'INV-26-7DM3QA', s: 'Kora Logistics · ₦1,015,000', d: I.file, tag: 'Overdue', tagTone: 'var(--ad-tone-bad)', open: function () { window.location.href = 'A-Money.dc.html'; } }] }]; },
      deck: function () { var b1 = self.rcAll().filter(function (b) { return b.id === 'b1'; })[0], b3 = self.rcAll().filter(function (b) { return b.id === 'b3'; })[0]; return [
        { id: 'rc1', kind: 'Match', urgency: 'Fri 9 Oct', utone: '#a16207', label: 'Bank line', dept: 'Finance', title: '₦850,000 from Mira Skincare looks like INV-26-4KQ8ZD', body: 'Amount and reference both match. Confirming marks the invoice paid and sends the receipt.', meta: [{ k: 'Amount', v: '₦850,000' }, { k: 'Reference', v: 'INV-26-4KQ8ZD' }, { k: 'Confidence', v: 'Exact' }], why: 'A paid invoice stops the reminder emails, so a quick yes keeps the client from getting one.', primaryLabel: 'Confirm the match', primaryConfirm: { eyebrow: 'Match', title: 'Match this to INV-26-4KQ8ZD?', body: 'Mira Skincare gets a receipt and the invoice shows as paid.', ok: 'Confirm match', green: true, okToast: 'Matched. The receipt is on its way.', icon: I.check, tone: 'var(--ad-tone-good)' }, secondaryLabel: 'Look closer', sheetSecondary: true, sheet: self.rcSheet(b1) },
        { id: 'rc2', kind: 'Check', urgency: 'Thu 8 Oct', utone: '#a16207', label: 'Bank line', dept: 'Finance', title: '₦300,000 from Z EVENTS has no reference', body: 'The name and amount fit INV-26-9PL2WX for Zara Events. Check before you confirm.', meta: [{ k: 'Amount', v: '₦300,000' }, { k: 'Reference', v: 'None' }, { k: 'Confidence', v: 'Name and amount' }], why: 'Without a reference the match is a good guess, not a fact.', primaryLabel: 'Open the line', primaryFn: function () { self.open(self.rcSheet(b3)); }, secondaryLabel: 'Not now', sToast: 'Parked. It comes back tomorrow.', sheet: self.rcSheet(b3) }]; }
    };
  }
