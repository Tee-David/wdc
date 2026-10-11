  /* ======================= Support (shared by all roles, driven by this.supModel()) ======================= */
  pageState() { var M = this.supModel(); return { stab: M.defaultTab || 'tickets', sq: '', schip: 'all', spage: 0, sper: 5, ra: 0, tstat: {}, replies: {}, newT: [], newA: [], helpful: {} }; }
  pageName() { return 'Support'; }
  /* The client facing knowledge base: clients read it, the owner edits it. */
  kbClient() {
    var I = this.icons(), st = function (t, s) { return { t: t, s: s }; };
    return [
      { id: 'a1', t: 'How a project works from start to finish', s: 'Discovery, deposit, work, review meetings, launch and handover.', cat: 'Getting started', mins: '3 min read', d: I.folder, kw: 'process steps start deposit handover meeting timeline', steps: [st('Discovery call', 'We agree the scope and send a quote you can accept online.'), st('50% deposit', 'Work starts when the deposit is paid.'), st('Work and approvals', 'Nothing goes live before you approve it.'), st('Two review meetings', 'Included in every project, booked from your Home page.'), st('Launch and handover', 'A recorded Google Meet, followed by a handover document.'), st('Final 20%', 'The last invoice goes out after the handover meeting.')] },
      { id: 'a2', t: 'Install the app on your phone', s: 'Get approvals, files and receipts as push alerts.', cat: 'Getting started', mins: '1 min read', d: I.phone, kw: 'app install phone push notifications pwa', steps: [st('Open the portal in your phone browser', 'Chrome on Android, Safari on iPhone.'), st('Tap Install app', 'It is in the menu, and on the card at the bottom of the sidebar.'), st('Allow notifications', 'Choose which ones in Settings, Notifications.')] },
      { id: 'a3', t: 'Pay an invoice with Paystack or Flutterwave', s: 'Two ways to pay, the same receipt either way.', cat: 'Billing and payments', mins: '2 min read', d: I.card, kw: 'pay invoice paystack flutterwave card payment', steps: [st('Open Billing and tap Pay', 'The amount and the invoice number are shown first.'), st('Choose Paystack or Flutterwave', 'Both take cards and bank transfers. There is no fee to you.'), st('Pay on the provider’s page', 'Closing it halfway is safe. We keep checking and email you the result.'), st('Your receipt appears', 'It is in Billing and in your email. An invoice cannot be paid twice.')] },
      { id: 'a4', t: 'Find or resend a receipt', s: 'Every payment has a receipt in Billing.', cat: 'Billing and payments', mins: '1 min read', d: I.file, kw: 'receipt find resend accountant proof', steps: [st('Open Billing, then Receipts', 'Each one is named with its number, for example RCT-2026-038.'), st('Tap a receipt to preview it', 'Download or print from the preview.'), st('Need it emailed again?', 'Tap Resend, or ask us from Support.')] },
      { id: 'a5', t: 'What happens when an invoice is late', s: 'Reminders first, then a final notice. Work pauses only after that.', cat: 'Billing and payments', mins: '2 min read', d: I.alert, kw: 'late overdue reminder final notice pause', steps: [st('Day after the due date', 'A friendly reminder with a pay link.'), st('One week late', 'A second reminder, copied to every billing contact.'), st('Two weeks late', 'A final notice. Work on that project pauses until it is paid.')] },
      { id: 'a6', t: 'Approve a post or a logo route', s: 'Approve, comment or ask for changes, one item at a time.', cat: 'Approvals and files', mins: '2 min read', d: I.eye, kw: 'approve post logo route changes review approval whatsapp', steps: [st('Open the item from Home or Projects', 'A preview opens in the app.'), st('Comment, or choose Request changes', 'Say what to change. The team sees it straight away.'), st('Approve when it is right', 'Approved posts are scheduled, and you get an email when they go live.')] },
      { id: 'a7', t: 'Where your files live', s: 'Every file we send you, with a preview, in one library.', cat: 'Approvals and files', mins: '1 min read', d: I.folder, kw: 'files library download preview pdf', steps: [st('Open Projects, then Files', 'Filter by type or search by name.'), st('Preview in the app', 'PDFs and images open without downloading.'), st('Download or print', 'Both are in the preview’s menu.')] },
      { id: 'a8', t: 'Add someone from your business', s: 'Give a colleague their own sign in, with the access you choose.', cat: 'Your account', mins: '2 min read', d: I.users, kw: 'add person colleague team access approver invite', steps: [st('Open Settings, then People at your business', 'You see everyone who has access.'), st('Add a person', 'Their email gets an invite. Temporary inboxes are not accepted.'), st('Choose what they receive', 'Invoices, approvals and project updates, each on its own.')] },
      { id: 'a9', t: 'Choose which emails and alerts you get', s: 'Email, push and in-app, kind by kind.', cat: 'Your account', mins: '1 min read', d: I.bell, kw: 'notifications email alerts settings unsubscribe', steps: [st('Open Settings, then Notifications', 'Each kind has its own switches.'), st('Switch off what you do not need', 'We never send what you have turned off.'), st('Keep invoices on', 'They are the one email we recommend leaving on.')] }
    ];
  }

  tourSteps() {
    var I = this.icons(), M = this.supModel();
    var st = [];
    if (M.deck) st.push({ target: 'deck', title: 'Tickets that need you', icon: I.target, body: 'The oldest or most urgent ticket first. Act, snooze or hand it over, and the next one rises.', hint: 'Focus the card: D done, S snooze.' });
    if (M.hero) st.push({ target: 'hero', title: 'Search before you ask', icon: I.search, body: 'Most questions already have an answer. Type a few words, or tap one of the popular questions.' });
    st.push({ target: 'table', title: 'Tickets and articles', icon: I.life, body: M.tourTable, hint: 'Tap a row to open it. The ⋮ has its actions.' });
    st.push({ target: 'new', title: M.newLabel, icon: I.plus, body: M.tourNew });
    return st;
  }
  navCounts() { return this.supModel().navBase || {}; }
  deck() { var M = this.supModel(); return M.deck ? M.deck(this) : []; }
  tkAll() {
    var s = this.state, M = this.supModel();
    return s.newT.concat(M.tickets).map(function (t) {
      var o = s.tstat[t.id] || {}, extra = s.replies[t.id] || [];
      return Object.assign({}, t, o, { feed: (o.feedAdd || []).concat(t.feed, extra).filter(Boolean) });
    });
  }
  tkSet(id, patch, line) {
    var m = Object.assign({}, this.state.tstat), cur = m[id] || {}, fa = (cur.feedAdd || []).slice();
    if (line) fa.push({ t: line, when: 'Just now' });
    m[id] = Object.assign({}, cur, patch, { updated: 'Just now', feedAdd: fa }); this.setState({ tstat: m, ra: this.state.ra + 1 });
  }
  tkTone(st) { return ({ open: 'var(--ad-tone-live)', wait: 'var(--ad-tone-warn)', done: 'var(--ad-tone-good)' })[st]; }
  artAll() { var M = this.supModel(); return this.state.newA.concat(M.articles); }
  tkOrder(a, b) { var o = { open: 0, wait: 1, done: 2 }; return o[a.status] - o[b.status]; }
  openTicket(t) {
    var self = this, I = this.icons(), M = this.supModel(), done = t.status === 'done', L = M.labels;
    var first = t.feed.length ? t.feed[0].when : t.updated;
    this.open(this.sh({ eyebrow: 'Ticket ' + t.id, title: t.subject, chip: L[t.status], tone: this.tkTone(t.status), icon: I.life, iconTone: this.tkTone(t.status),
      rows: [{ k: M.role === 'admin' ? 'From' : 'About', v: M.role === 'admin' ? t.from + ' · ' + t.org : t.about }, { k: 'Type', v: t.kind }, { k: 'Opened', v: first }, { k: 'Last update', v: t.updated }],
      listTitle: '', feed: t.feed, compose: !done, composeLabel: 'Reply', composePh: M.role === 'admin' ? 'Write your reply' : 'Add to this ticket', required: !done, vis: M.role === 'admin' ? 'client' : '',
      primary: done ? 'Reopen ticket' : 'Send reply', secondary: done ? 'Close' : 'Mark as resolved',
      onPrimary: function (ctx) {
        if (done) { self.tkSet(t.id, { status: 'open' }, 'Reopened by ' + (M.role === 'admin' ? 'you' : 'you')); self.say(t.id + ' is open again.'); return; }
        var team = M.role === 'admin' && ctx.vis === 'team';
        self.tkSet(t.id, team ? {} : { status: M.role === 'admin' ? 'wait' : 'open' }, (team ? 'Team note: ' : (M.role === 'admin' ? 'You replied: ' : 'You added: ')) + ctx.draft);
        self.say(team ? 'Saved as a team note on ' + t.id + '.' : (M.role === 'admin' ? 'Reply sent to ' + t.from.split(' ')[0] + '. The ticket now waits on them.' : 'Added to ' + t.id + '. We reply within 1 working day.'));
      },
      onSecondary: function () { if (done) { self.closeSheet(); return 'stay'; } self.resolveAsk(t); return 'stay'; } }));
  }
  resolveAsk(t) {
    var self = this, I = this.icons(), M = this.supModel();
    this.ask({ eyebrow: 'Resolve', title: 'Mark ' + t.id + ' as resolved?', body: M.role === 'admin' ? t.from.split(' ')[0] + ' is told it is resolved and can reopen it within 14 days by replying.' : 'We close it, and you can reopen it within 14 days by replying.', ok: 'Mark as resolved', green: true, icon: I.check, tone: 'var(--ad-tone-good)',
      onOk: function () { self.setState({ sheet: null, stack: [] }); self.tkSet(t.id, { status: 'done' }, 'Marked resolved by ' + (M.role === 'admin' ? 'you' : 'you')); self.say(t.id + ' resolved.', { undo: function () { self.tkSet(t.id, { status: t.status }, 'Resolved status undone'); } }); } }, true);
  }
  ticketActions(t) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), out = [it('Open ticket', I.open, function () { self.openTicket(t); })];
    if (t.status === 'done') out.push(it('Reopen ticket', I.undo, function () { self.tkSet(t.id, { status: 'open' }, 'Reopened'); self.say(t.id + ' is open again.'); }));
    else { out.push(it('Mark as resolved', I.check, function () { self.resolveAsk(t); })); }
    return out;
  }
  openArticle(a, push) {
    var self = this, I = this.icons(), M = this.supModel();
    var rel = this.artAll().filter(function (x) { return x.cat === a.cat && x.id !== a.id; }).slice(0, 3);
    this.open(this.sh({ eyebrow: a.cat + ' · ' + a.mins, title: a.t, icon: I.life, iconTone: 'var(--ad-tone-brand)', chip: a.draft ? 'Draft' : '', tone: 'var(--ad-tone-warn)', body: a.s,
      listTitle: 'Steps', list: a.steps.map(function (x, i) { return { t: (i + 1) + '. ' + x.t, s: x.s }; }), checksTitle: '', note: a.note || '',
      primary: M.role === 'admin' ? (a.draft ? 'Publish article' : 'Edit article') : 'Yes, this helped', secondary: M.role === 'admin' ? 'Close' : 'Not quite, ask us',
      onPrimary: function () { if (M.role === 'admin') { self.say(a.draft ? '“' + a.t + '” is published and visible to clients.' : 'The editor opens here, with a preview of what clients see.'); return; } var h = Object.assign({}, self.state.helpful); h[a.id] = true; self.setState({ helpful: h }); self.say('Thanks. That helps us decide what to write next.'); },
      onSecondary: function () { if (M.role === 'admin') { self.closeSheet(); return 'stay'; } self.closeSheet(); setTimeout(function () { self.newTicketSheet('Question about: ' + a.t); }, 80); return 'stay'; } }), push);
  }
  newTicketSheet(subject) {
    var self = this, I = this.icons(), M = this.supModel(), kw = function (s) { return (s || '').toLowerCase().split(/\W+/).filter(function (w) { return w.length > 3; }); };
    this.open(this.sh({ eyebrow: M.newLabel, title: M.newTitle, icon: I.life, body: M.newBody,
      fields: [{ key: 'subject', label: 'In a few words', ph: M.newPh, wide: true }, { key: 'details', label: 'What happened, or what do you need', ph: 'Include the project, invoice or page if it helps', type: 'area', wide: true }],
      chipSets: [{ key: 'kind', label: 'What is it?', opts: M.kinds }].concat(M.aboutOpts ? [{ key: 'about', label: M.aboutLabel, opts: M.aboutOpts }] : []),
      notice: function (ctx) { var w = kw(ctx.form.subject); if (!w.length) return null; var best = null, score = 0; self.artAll().forEach(function (a) { var hay = (a.t + ' ' + a.kw).toLowerCase(), sc = w.filter(function (x) { return hay.indexOf(x) >= 0; }).length; if (sc > score) { score = sc; best = a; } }); if (!best) return null; return { tone: 'var(--ad-tone-brand)', icon: I.life, title: 'This article may answer it', body: best.t + ' · ' + best.mins + '. If it does not, send the ticket anyway.', hasAct: true, actLabel: 'Read it', act: function () { self.openArticle(best, true); } }; },
      primary: M.newPrimary, secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form; if (!(f.subject || '').trim()) return 'Say what it is about in a few words.'; if (!(f.details || '').trim()) return 'Add a few details so we can help the first time.'; if (!f.kind) return 'Choose what kind of ticket it is.'; if (M.aboutOpts && !f.about) return 'Choose what it is about.'; return ''; },
      onPrimary: function (ctx) {
        var f = ctx.form, id = 'T-' + (1050 + self.state.newT.length), t = { id: id, subject: f.subject.trim(), kind: f.kind, from: M.me.name, org: M.role === 'admin' ? (f.about || 'WDC') : M.me.org, about: f.about || M.aboutDefault, status: 'open', updated: 'Just now', feed: [{ t: 'You opened this: ' + f.details.trim(), when: 'Just now' }, { t: 'We reply within 1 working day. You also get an email copy.', when: 'Automatic' }] };
        self.setState({ newT: [t].concat(self.state.newT), stab: 'tickets', schip: 'all', spage: 0, sq: '', ra: self.state.ra + 1 });
        self.say('Ticket ' + id + ' sent. ' + M.newToast);
      } }));
    if (subject) setTimeout(function () { self.setState({ form: { subject: subject } }); }, 40);
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), M = this.supModel();
    if (pop.kind === 'row') {
      var t = this.tkAll().filter(function (x) { return x.id === pop.id; })[0]; if (t) return this.ticketActions(t);
      var a = this.artAll().filter(function (x) { return x.id === pop.id; })[0]; return a ? [it('Open article', I.open, function () { self.openArticle(a); })] : [];
    }
    if (pop.kind === 'chores') return M.chores(this, it, I);
    return [];
  }
  renderVals() {
    var s = this.state, self = this, I = this.icons(), M = this.supModel(), S = this.sh.bind(this);
    var dk = this.deck(), dv = this.deckView(dk), q = s.sq.trim().toLowerCase();
    var tickets = this.tkAll().sort(function (a, b) { return self.tkOrder(a, b); }), arts = this.artAll();
    var isT = s.stab === 'tickets';
    var cats = ['all'].concat(arts.map(function (a) { return a.cat; }).filter(function (c, i, arr) { return arr.indexOf(c) === i; }));
    var chipsT = [['all', 'All'], ['open', 'Open'], ['wait', 'Waiting'], ['done', 'Resolved']];
    var chipKey = isT ? (chipsT.map(function (c) { return c[0]; }).indexOf(s.schip) >= 0 ? s.schip : 'all') : (cats.indexOf(s.schip) >= 0 ? s.schip : 'all');
    var tMatch = function (t) { return !q || (t.subject + ' ' + t.id + ' ' + t.from + ' ' + t.org + ' ' + t.about).toLowerCase().indexOf(q) >= 0; };
    var aMatch = function (a) { return !q || (a.t + ' ' + a.s + ' ' + a.kw + ' ' + a.cat).toLowerCase().indexOf(q) >= 0; };
    var tList = tickets.filter(function (t) { return (chipKey === 'all' || t.status === chipKey) && tMatch(t); });
    var aList = arts.filter(function (a) { return (chipKey === 'all' || a.cat === chipKey) && aMatch(a); });
    var list = isT ? tList : aList;
    var cp = Math.min(s.spage, Math.max(0, Math.ceil(list.length / s.sper) - 1));
    var page = list.slice(cp * s.sper, cp * s.sper + s.sper);
    var F = 'var(--ad-tone-flat)';
    var tag = function (t, tone) { return { isTag: true, t: t, tone: tone, ink: tone === F ? 'var(--ad-on-flat)' : '#fff', cls: '' }; };
    var two = function (t, sub) { return { isTwo: true, t: t, s: sub, cls: '', tcls: '' }; };
    var one = function (t, col) { return { isOne: true, t: t, col: col || 'var(--ad-ink)', cls: '' }; };
    var rows = isT ? page.map(function (t, i) {
      var open = function () { self.openTicket(t); };
      return { cells: [two(t.subject, t.id + ' · ' + t.kind), M.role === 'admin' ? two(t.from, t.org) : one(t.about), tag(M.labels[t.status], self.tkTone(t.status)), one(t.updated, 'var(--ad-dim)')], anim: self.anim(s.ra), delay: (i * 0.035) + 's', aria: t.id + ', ' + t.subject + ', ' + M.labels[t.status] + '. Press Enter to open.', menuAria: 'Actions for ' + t.id, menuX: self.popOn('row', t.id),
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } },
        menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', t.id, 250, 190, 'Actions for ' + t.id); } };
    }) : [];
    var artCards = !isT ? page.map(function (a, i) { return { t: a.t, s: a.s, cat: a.cat, mins: a.mins, d: a.d || I.life, tone: 'var(--ad-tone-brand)', draft: !!a.draft, anim: self.anim(s.ra), delay: (i * 0.035) + 's', aria: a.t + ', ' + a.cat + ', ' + a.mins, open: function () { self.openArticle(a); } }; }) : [];
    var openN = tickets.filter(function (t) { return t.status !== 'done'; }).length;
    var tabs = [['tickets', M.ticketsLabel || 'Tickets', tickets.length, openN], ['kb', M.kbLabel || 'Knowledge base', arts.length, 0]].map(function (t) { var on = s.stab === t[0]; return { label: t[1], n: t[2], chip: t[3] ? 'var(--ad-tone-live)' : 'var(--ad-tone-flat)', ink: t[3] ? '#fff' : 'var(--ad-on-flat)', cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ stab: t[0], schip: 'all', spage: 0, ra: self.state.ra + 1 }); } }; });
    var chips = (isT ? chipsT : cats.map(function (c) { return [c, c === 'all' ? 'All' : c]; })).map(function (c) { var on = chipKey === c[0]; var n = isT ? tickets.filter(function (t) { return (c[0] === 'all' || t.status === c[0]) && tMatch(t); }).length : arts.filter(function (a) { return (c[0] === 'all' || a.cat === c[0]) && aMatch(a); }).length; return { t: c[1], n: n, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ schip: c[0], spage: 0, ra: self.state.ra + 1 }); } }; });
    var SP = Object.assign(this.pager('support', list.length, s.sper, cp, function (k) { self.setState({ spage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ sper: n, spage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ sper: 20, spage: 0, ra: self.state.ra + 1 }); self.say('Showing all ' + list.length + '.'); } });
    var R = M.rail(this, tickets, arts), stats = (R.stats || []).map(function (k, i) { return Object.assign({}, k, self.statDeco(k), { delay: 'd' + (i + 1), aria: k.label + ': ' + k.value + '. ' + k.note, open: function () { if (k.sheet) self.open(k.sheet); else if (k.fn) k.fn(); } }); });
    var railCards = (R.cards || []).map(function (c, i) { return { title: c.title, sub: c.sub || '', hasSub: !!c.sub, note: c.note || '', hasNote: !!c.note, delay: 'd' + (i + 3), actLabel: c.actLabel, hasAct: !!c.actLabel, act: c.act, rows: (c.rows || []).map(function (r) { var tt = r.tagTone || F; return { t: r.t, s: r.s, d: r.d || I.life, tone: r.tone || 'var(--ad-tone-brand)', open: r.open, hasTag: !!r.tag, tag: r.tag, tagTone: tt, tagInk: tt === F ? 'var(--ad-on-flat)' : '#fff' }; }) }; });
    var hasFilter = !!q || chipKey !== 'all', hero = M.hero ? { title: M.hero.title, body: M.hero.body, ph: M.hero.ph, popular: M.hero.popular.map(function (id) { var a = arts.filter(function (x) { return x.id === id; })[0]; return { t: a.t, open: function () { self.openArticle(a); } }; }) } : { popular: [] };
    var lede = M.lede(this, openN);
    return Object.assign(this.kit(), this.extraVals(), dv, {
      ledeA: lede[0], ledeB: lede[1], newLabel: M.newLabel, newTicket: function () { self.newTicketSheet(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 260, 220, 'More for support'); }, choresX: this.popOn('chores', 'chores'),
      hasDeck: !!M.deck, deckTitle: M.deckTitle || 'Tickets needing you', deckKeys: 'Focus the card: D done, S snooze', snoozeLabel: 'Snooze', snoozeShort: 'Snooze', canPass: !!M.canPass,
      emptyTitle: 'Every ticket is answered.', emptyBody: 'Nobody is waiting on a reply from you. Next:', emptyNext: M.emptyNext || 'Check the knowledge base for gaps.', emptyPrimaryLabel: 'Open the knowledge base', emptySecondaryLabel: 'Bring everything back', emptyPrimary: function () { self.setState({ stab: 'kb', schip: 'all', spage: 0, ra: self.state.ra + 1 }); },
      hasHero: !!M.hero, hero: hero, tabTitle: isT ? (M.ticketsTitle || 'Tickets') : (M.kbTitle || 'Help articles'), total: list.length, tabs: tabs, chips: chips, isTickets: isT, isKb: !isT, cols: (M.role === 'admin' ? ['Ticket', 'From', 'Status', 'Updated'] : ['Ticket', 'About', 'Status', 'Updated']).map(function (t) { return { t: t, cls: '' }; }), rows: rows, arts: artCards, SP: SP,
      qPh: isT ? 'Subject, number or name' : 'Search the articles', sq: s.sq, hasSq: !!s.sq, onSq: function (e) { self.setState({ sq: e.target.value, stab: (M.hero && s.stab === 'tickets' && e.target.value) ? 'kb' : s.stab, spage: 0, ra: self.state.ra + 1 }); }, clearSq: function () { self.setState({ sq: '', ra: self.state.ra + 1 }); },
      empty: !list.length, hasFilter: hasFilter, clearFilters: function () { self.setState({ sq: '', schip: 'all', spage: 0, ra: self.state.ra + 1 }); },
      emptyTitleT: q ? 'Nothing matches "' + s.sq + '".' : (isT ? 'No tickets here.' : 'No articles here.'), emptyBodyT: q ? (isT ? 'Search by subject, ticket number or name.' : 'Try fewer words, or ask us directly.') : (isT ? 'Nothing is open in this view, which is good.' : 'Try another category.'), emptyActLabel: isT || q ? M.newLabel : 'Ask a question', emptyAct: function () { self.newTicketSheet(q ? s.sq : undefined); },
      hasStats: stats.length > 0, statsTitle: R.statsTitle || 'Support pulse', stats: stats, railCards: railCards
    });
  }
