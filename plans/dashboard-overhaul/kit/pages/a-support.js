  /* ======================= Owner · Support model ======================= */
  supModel() {
    var self = this, I = this.icons(), S = this.sh.bind(this), st = function (t, s) { return { t: t, s: s }; };
    var f = function (t, when) { return { t: t, when: when }; };
    var tickets = [
      { id: 'T-1042', subject: 'Cannot find my flyer receipt', kind: 'Problem', from: 'Tunde O.', org: 'Tunde Okafor Law', about: 'Billing', status: 'open', updated: 'Today, 09:20', feed: [f('Tunde opened this: “I cannot find the receipt for the flyers I paid for on 4 October. My accountant needs it today.”', 'Today, 09:20'), f('We reply within 1 working day. Tunde got an email copy.', 'Automatic')] },
      { id: 'T-1041', subject: 'Can posts be approved on WhatsApp?', kind: 'Question', from: 'Adaeze O.', org: 'Mira Skincare', about: 'Social media', status: 'wait', updated: 'Yesterday', feed: [f('Adaeze asked: “Can I approve the posts by replying on WhatsApp instead of the portal?”', 'Yesterday, 14:10'), f('You replied with “Approve a post or a logo route” and a link to the app. Approving takes two taps, and there is no WhatsApp route yet.', 'Yesterday, 15:02')] },
      { id: 'T-1040', subject: 'The report shows the wrong date range', kind: 'Problem', from: 'Ngozi E.', org: 'Bloom Pharmacy', about: 'SEO', status: 'open', updated: '2 days ago', feed: [f('Ngozi opened this: “One chart in the September report lists 1 to 30 August.”', '2 days ago, 11:40'), f('Bisi checked: the report is right, and the chart label is wrong.', '2 days ago, 13:05')] },
      { id: 'T-1039', subject: 'Add a second approver', kind: 'Request', from: 'Daniel O.', org: 'Lumen Fitness', about: 'Social media', status: 'done', updated: '3 days ago', feed: [f('Daniel asked to add his marketing lead as a second approver.', '3 days ago, 10:00'), f('You added Kemi M. as an approver. She got an invite.', '3 days ago, 10:20'), f('Marked resolved.', '3 days ago, 10:21')] },
      { id: 'T-1038', subject: 'Need Meta Business access for Lumen', kind: 'Request', from: 'Chiamaka A.', org: 'Social & Ads (staff)', about: 'Instagram ads', status: 'open', updated: '3 days ago', feed: [f('Chiamaka asked: “I cannot start the November ads without Meta Business Manager access. Can Daniel be asked?”', '3 days ago, 09:30')] },
      { id: 'T-1037', subject: 'Invoice sent to the wrong email', kind: 'Problem', from: 'Adebayo K.', org: 'Kora Logistics', about: 'Billing', status: 'done', updated: 'Last week', feed: [f('Adebayo said invoices go to an inbox nobody reads.', 'Last week'), f('You added a second billing contact and resent the invoice.', 'Last week'), f('Marked resolved.', 'Last week')] }
    ];
    var arts = this.kbClient().concat([
      { id: 'd1', t: 'Match a bank transfer to an invoice', s: 'Draft for clients who pay by transfer in USD.', cat: 'Billing and payments', mins: '2 min read', d: I.cash, kw: 'bank transfer match reconcile usd dollars', draft: true, steps: [st('Pay into the USD account', 'The details are on the invoice.'), st('Use the invoice number as the reference', 'It lets us match it the same day.'), st('We email the receipt', 'Usually within one working day.')] },
      { id: 'd2', t: 'Switch an invoice to US dollars', s: 'Draft. Answers the most searched question that has no article yet.', cat: 'Billing and payments', mins: '1 min read', d: I.cash, kw: 'dollars usd currency invoice', draft: true, steps: [st('Ask us in Support', 'Dollar invoices are set up by Admin.'), st('Pay into the Sterling USD account', 'Paystack and Flutterwave are for naira.')] }
    ]);
    var tk = function (id) { return self.tkAll().filter(function (t) { return t.id === id; })[0]; };
    var hand = function (top, who, msg) { return function () { self.clear(top, 'delegated', '', msg, { final: true }); }; };
    var deck = function (me) {
      var d1 = { id: 'k1042', kind: 'Billing', urgency: 'Opened 09:20', utone: '#a16207', label: 'T-1042', dept: 'Finance', title: 'Tunde cannot find his flyer receipt', body: 'His accountant needs it today. Receipt RCT-2026-038 exists and was emailed on 4 October.', meta: [{ k: 'From', v: 'Tunde O.' }, { k: 'Invoice', v: 'INV-26-7DM1XS' }, { k: 'Paid', v: '₦150,000, Paystack' }], why: 'Resending it and pointing him to Billing fixes this, and the next time.',
        primaryLabel: 'Resend the receipt', primaryFn: function (at) { me.tkSet('T-1042', { status: 'wait' }, 'You resent receipt RCT-2026-038 and pointed him to Billing, Receipts'); me.clear(d1, 'done', '', 'Receipt RCT-2026-038 resent to Tunde. The ticket now waits on him.', { at: at, final: true }); },
        secondaryLabel: 'Reply', secondaryFn: function () { me.open(Object.assign({}, me.ticketSheetFor(tk('T-1042')), { deckId: 'k1042' })); }, sheet: me.ticketSheetFor(tk('T-1042')) };
      var d2 = { id: 'k1038', kind: 'Staff request', urgency: '3 days', utone: '#a16207', label: 'T-1038', dept: 'Social & Ads', title: 'Chiamaka needs Meta access for Lumen', body: 'The November ads cannot start without Meta Business Manager access. Daniel has not been asked yet.', meta: [{ k: 'From', v: 'Chiamaka A.' }, { k: 'Client', v: 'Lumen Fitness' }, { k: 'Waiting', v: '3 days' }], why: 'A short guide with the exact clicks gets access granted the same day most of the time.',
        primaryLabel: 'Ask Daniel for access', primaryFn: function (at) { me.clear(d2, 'done', '', '', { at: at, delayed: { pending: function (n) { return 'Sending the request to Daniel in ' + n + 's'; }, done: 'Request sent to Daniel with the step by step guide. Chiamaka is told.' } }); setTimeout(function () { if (me.state.gone.k1038) me.tkSet('T-1038', { status: 'wait' }, 'Asked Daniel for access, with the step by step guide'); }, 8300); }, secondaryLabel: 'Open the ticket', sheetSecondary: true, sheet: me.ticketSheetFor(tk('T-1038')) };
      var d3 = { id: 'k1040', kind: 'Problem', urgency: '2 days', utone: '#a16207', label: 'T-1040', dept: 'SEO', title: 'Bloom’s report has a wrong chart label', body: 'The September report lists 1 to 30 August in one chart. Bisi confirmed the numbers are right.', meta: [{ k: 'From', v: 'Ngozi E.' }, { k: 'Fix', v: 'Relabel one chart' }, { k: 'Owner', v: 'Bisi' }], why: 'It is a two minute fix, and Ngozi is waiting for the corrected PDF.',
        primaryLabel: 'Hand to Bisi', primaryFn: function (at) { me.tkSet('T-1040', { status: 'wait' }, 'Handed to Bisi to correct the chart label'); me.clear(d3, 'delegated', '', 'Handed to Bisi. He sends Ngozi the corrected report, and the ticket waits on her.', { at: at, final: true }); },
        secondaryLabel: 'Reply to Ngozi', secondaryFn: function () { me.open(Object.assign({}, me.ticketSheetFor(tk('T-1040')), { deckId: 'k1040' })); }, sheet: me.ticketSheetFor(tk('T-1040')) };
      return [d1, d2, d3];
    };
    var openTk = function (id) { return function () { var t = tk(id); if (t) self.openTicket(t); }; };
    return {
      role: 'admin', settingsHref: 'A-Settings.dc.html', navBase: { Clients: { n: 5 }, Money: { n: 3, tone: 'var(--ad-tone-bad)' }, Messages: { n: 6 } }, labels: { open: 'Open', wait: 'Waiting on client', done: 'Resolved' }, defaultTab: 'tickets',
      tickets: tickets, articles: arts, deck: deck, deckTitle: 'Tickets needing you', canPass: true, emptyNext: 'The knowledge base has two drafts to publish.',
      newLabel: 'New ticket', newTitle: 'Log a ticket', newBody: 'Use this for something a client told you by phone or in person, so it is tracked and answered. The client gets an email copy.', newPh: 'For example: Receipt for the October retainer', newPrimary: 'Log the ticket', newToast: 'The client gets an email copy and it is at the top of Tickets.', kinds: ['Question', 'Problem', 'Request'],
      aboutLabel: 'For whom', aboutOpts: ['Mira Skincare', 'Lumen Fitness', 'Bloom Pharmacy', 'Kora Logistics', 'Someone else'], aboutDefault: 'WDC', me: { name: 'You', org: 'WDC' },
      ticketsLabel: 'Tickets', kbLabel: 'Knowledge base', ticketsTitle: 'Tickets', kbTitle: 'Help articles',
      tourTable: 'Every ticket from clients and staff, newest problems first. The Knowledge base tab is what clients read, and where you publish drafts.', tourNew: 'Log something a client told you by phone, so it is tracked and answered.',
      lede: function (s, openN) { return [openN + (openN === 1 ? ' open ticket.' : ' open tickets.'), 'Median first reply is 1 h 40 m.']; },
      chores: function (s, it, I2) { return [it('New article', I2.file, function () { s.newArticle(); }), it('Export tickets', I2.down, function () { s.say('support-tickets.csv downloaded.'); }, { hint: 'CSV' }), s.menuSep(), it('Ticket notifications', I2.bell, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Settings' })]; },
      rail: function (s, tks, arts2) {
        var open = tks.filter(function (t) { return t.status !== 'done'; }), waiting = tks.filter(function (t) { return t.status === 'wait'; }), done = tks.filter(function (t) { return t.status === 'done'; });
        return { statsTitle: 'Support pulse',
          stats: [
            { label: 'Open tickets', value: String(open.length), note: waiting.length + ' waiting on clients', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', ic: I.life, fn: function () { s.setState({ stab: 'tickets', schip: 'open', spage: 0, ra: s.state.ra + 1 }); } },
            { label: 'First reply', value: '1 h 40 m', note: 'Target: 1 working day', noteCol: 'var(--ad-tone-good)', dot: 'var(--ad-tone-good)', ic: I.clock, fn: function () { s.say('Median over the last 30 days: 1 h 40 m. 92% got a first reply inside the target.'); } },
            { label: 'Resolved', value: String(done.length + 5), note: 'This week', noteCol: 'var(--ad-tone-good)', dot: 'var(--ad-tone-good)', ic: I.check, fn: function () { s.setState({ stab: 'tickets', schip: 'done', spage: 0, ra: s.state.ra + 1 }); } },
            { label: 'Articles helped', value: '92%', note: 'Of readers said yes', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', ic: I.eye, fn: function () { s.setState({ stab: 'kb', schip: 'all', spage: 0, ra: s.state.ra + 1 }); } }
          ],
          cards: [
            { title: 'Searches with no answer', sub: 'Last 30 days', rows: [{ t: 'invoice in dollars', s: '6 searches · no article', d: I.cash, tone: 'var(--ad-tone-warn)', tag: 'Draft ready', tagTone: 'var(--ad-tone-warn)', open: function () { s.openArticle(arts2.filter(function (a) { return a.id === 'd2'; })[0]); } }, { t: 'pay by bank transfer', s: '4 searches · no article', d: I.cash, tone: 'var(--ad-tone-warn)', tag: 'Draft ready', tagTone: 'var(--ad-tone-warn)', open: function () { s.openArticle(arts2.filter(function (a) { return a.id === 'd1'; })[0]); } }, { t: 'change my domain', s: '3 searches · no article', d: I.link, tone: 'var(--ad-tone-neutral)', open: function () { s.newArticle('Change my domain'); } }], actLabel: 'Write an article', act: function () { s.newArticle(); } },
            { title: 'Most read', sub: 'Last 30 days', rows: [['a3', '214 reads'], ['a6', '168 reads'], ['a4', '131 reads']].map(function (x) { var a = arts2.filter(function (y) { return y.id === x[0]; })[0]; return { t: a.t, s: x[1] + ' · ' + a.cat, d: a.d, open: function () { s.openArticle(a); } }; }) }
          ] };
      }
    };
  }
  ticketSheetFor(t) {
    var self = this, I = this.icons(), M = this.supModel();
    return this.sh({ eyebrow: 'Ticket ' + t.id, title: t.subject, chip: M.labels[t.status], tone: this.tkTone(t.status), icon: I.life, iconTone: this.tkTone(t.status), rows: [{ k: 'From', v: t.from + ' · ' + t.org }, { k: 'Type', v: t.kind }, { k: 'Last update', v: t.updated }], feed: t.feed, compose: true, composeLabel: 'Reply', composePh: 'Write your reply', required: true, vis: 'client', primary: 'Send reply', secondary: 'Mark as resolved',
      onPrimary: function (ctx) { var team = ctx.vis === 'team'; self.tkSet(t.id, team ? {} : { status: 'wait' }, (team ? 'Team note: ' : 'You replied: ') + ctx.draft); self.say(team ? 'Saved as a team note on ' + t.id + '.' : 'Reply sent to ' + t.from.split(' ')[0] + '. The ticket now waits on them.'); },
      onSecondary: function () { self.resolveAsk(t); return 'stay'; } });
  }
  newArticle(title) {
    var self = this, I = this.icons(), cats = ['Getting started', 'Billing and payments', 'Approvals and files', 'Your account'];
    this.open(this.sh({ eyebrow: 'New article', title: 'Write a help article', icon: I.file, body: 'It saves as a draft. Nothing is visible to clients until you publish it.',
      fields: [{ key: 'title', label: 'Title', ph: 'How to change my domain', wide: true }, { key: 'sum', label: 'One line summary', ph: 'What the reader will be able to do', wide: true }],
      chipSets: [{ key: 'cat', label: 'Category', opts: cats }], primary: 'Save draft', secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form; if (!(f.title || '').trim()) return 'Add a title.'; if (!(f.sum || '').trim()) return 'Add a one line summary.'; if (!f.cat) return 'Choose a category.'; return ''; },
      onPrimary: function (ctx) { var f = ctx.form, a = { id: 'n' + Date.now(), t: f.title.trim(), s: f.sum.trim(), cat: f.cat, mins: '1 min read', d: I.file, kw: f.title.toLowerCase(), draft: true, steps: [{ t: 'Add the steps', s: 'The editor opens here.' }] }; self.setState({ newA: [a].concat(self.state.newA), stab: 'kb', schip: 'all', spage: 0, ra: self.state.ra + 1 }); self.say('Saved. “' + a.t + '” is a draft in the Knowledge base.'); } }));
    if (title) setTimeout(function () { self.setState({ form: { title: title } }); }, 40);
  }
