  /* ======================= Owner · Notifications inbox ======================= */
  pageName() { return 'Today'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'What to read first', icon: I.target, body: 'The notifications that need an action. The rest is a record.' },
      { target: 'table', title: 'Everything you were told', icon: I.bell, body: 'Payments, approvals, replies and system notices, newest first. Tap one to jump to the page it is about.' },
      { target: 'rail', title: 'What reaches you', icon: I.gear, body: 'Each kind can be switched off, by email or in the app, from Settings.' }
    ];
  }
  ntKinds() { return ['Money', 'Messages', 'Enquiries', 'Meetings', 'System']; }
  ntSettings() { return 'A-Settings.dc.html'; }
  ntRail() { return ['Payments and receipts', 'Replies and approvals', 'New enquiries', 'System notices']; }
  ntAll() {
    return this.hubApply('nt', [
      { id: 'n1', name: 'Mira Skincare paid INV-26-4KQ8ZD', sub: '₦850,000 by Paystack. Receipt RCT-2026-041 sent.', kind: 'Money', read: false, when: 'Today, 08:52', go: 'A-Money.dc.html' },
      { id: 'n2', name: 'Adaeze O. replied to Brand guide v2', sub: 'She approved the colours and asked for a darker navy.', kind: 'Messages', read: false, when: 'Today, 08:10', go: 'A-Messages.dc.html' },
      { id: 'n3', name: 'Temi Adeoye sent an enquiry', sub: 'Contact form. The email matches Oak and Ivy Interiors.', kind: 'Enquiries', read: false, when: 'Today, 08:12', go: 'A-Forms.dc.html' },
      { id: 'n4', name: 'Kora Logistics invoice is 12 days overdue', sub: '₦1,015,000. The final reminder goes out Monday.', kind: 'Money', read: true, when: 'Yesterday', go: 'A-Money.dc.html' },
      { id: 'n5', name: 'A database migration is waiting', sub: '043 Support ticket categories. Apply it from Settings, System.', kind: 'System', read: true, when: 'Thu 8 Oct', go: 'A-Settings.dc.html' },
      { id: 'n6', name: 'Zara Events handover recording is missing', sub: 'Held Tue 6 Oct. The handover document waits for it.', kind: 'Meetings', read: true, when: 'Wed 7 Oct', go: 'A-Meetings.dc.html' }
    ]);
  }
  ntDeck() {
    var self = this, I = this.icons();
    var a = self.ntAll().filter(function (n) { return n.id === 'n1'; })[0]; return [{ id: 'nd1', kind: 'Payment', urgency: 'Today, 08:52', utone: '#15803d', label: 'Money', dept: 'Finance', title: 'Mira Skincare paid ₦850,000', body: 'The payment arrived by Paystack. The receipt was sent and the invoice shows as paid.', meta: [{ k: 'Invoice', v: 'INV-26-4KQ8ZD' }, { k: 'Receipt', v: 'RCT-2026-041' }, { k: 'Provider', v: 'Paystack' }], why: 'Nothing to do. Open it if you want to thank them.', primaryLabel: 'Open the invoice', primaryFn: function () { window.location.href = 'A-Money.dc.html'; }, secondaryLabel: 'Mark as read', sToast: 'Updated. It is marked as read.', sheet: self.sh({ eyebrow: 'Money', title: a.name, icon: I.cash, body: a.sub, primary: 'Open the invoice', secondary: 'Close', onPrimary: function () { window.location.href = 'A-Money.dc.html'; } }) }];
  }
  hubCfg() {
    var self = this, I = this.icons(), Fl = 'var(--ad-tone-flat)';
    var kinds = this.ntKinds();
    var items = function () { return self.ntAll().map(function (n) { return Object.assign({}, n, { hay: n.name + ' ' + n.sub + ' ' + n.kind, cells: [{ t: n.kind }, { tag: true, t: n.read ? 'Read' : 'New', tone: n.read ? Fl : 'var(--ad-tone-live)', ink: n.read ? 'var(--ad-on-flat)' : '#fff' }, { t: n.when }] }); }); };
    return {
      title: 'Notifications', statsTitle: 'Notice pulse', deckTitle: 'Read first', newLabel: 'Mark all as read', newFn: function () { self.ntAll().forEach(function (n) { if (!n.read) self.hubPatch(n.id, { read: true }); }); self.say('Updated. Everything is marked as read.'); },
      ledeA: function () { var u = self.ntAll().filter(function (n) { return !n.read; }).length; return u ? u + ' unread.' : 'Everything is read.'; }, ledeB: function () { return 'Kept for 90 days.'; }, emptyTitle: 'Nothing new.', emptyNext: 'New payments, replies and notices show here.',
      chores: function (it, I2) { return [it('Notification settings', I2.gear, function () { window.location.href = self.ntSettings(); }, { hint: 'Switch kinds off' })]; },
      tabs: [{ key: 'nt', label: 'Inbox', title: 'Inbox', noun: 'notifications', one: 'notification', ph: 'Title or kind', file: 'wdc-notifications', actLabel: 'Settings', actD: I.gear, act: function () { window.location.href = self.ntSettings(); }, emptyT: 'No notifications.', emptyB: 'They arrive here as things happen.',
        cols: [{ t: 'Notice' }, { t: 'Kind' }, { t: 'State' }, { t: 'When' }], items: items,
        chips: [['all', 'All', function () { return true; }], ['unread', 'Unread', function (x) { return !x.read; }]].concat(kinds.map(function (k) { return [k, k, function (x) { return x.kind === k; }]; })),
        exportCols: [{ t: 'Notice', v: function (n) { return n.name; } }, { t: 'Kind', v: function (n) { return n.kind; } }, { t: 'When', v: function (n) { return n.when; } }, { t: 'Read', v: function (n) { return n.read ? 'Yes' : 'No'; } }],
        sheet: function (n) { self.hubPatch(n.id, { read: true }); return self.sh({ eyebrow: n.kind + ' · ' + n.when, title: n.name, icon: I.bell, body: n.sub, primary: 'Open the page', secondary: 'Close', onPrimary: function () { window.location.href = n.go; } }); },
        actions: function (n, it, I2) { return [it(n.read ? 'Mark as unread' : 'Mark as read', I2.check, function () { self.hubPatch(n.id, { read: !n.read }); self.say('Updated.'); }), it('Remove…', I2.trash, function () { self.hubGone([n.id], 'Notification removed.'); }, { danger: true })]; },
        bulk: function () { return [{ label: 'Mark as read', icon: I.check, fn: function (sel, done) { sel.forEach(function (n) { self.hubPatch(n.id, { read: true }); }); self.say('Updated. ' + sel.length + ' marked as read.'); done(); } }, { label: 'Remove', icon: I.trash, danger: true, fn: function (sel, done) { self.hubGone(sel.map(function (x) { return x.id; }), sel.length + ' removed.'); done(); } }]; } }],
      stats: function () { var a = self.ntAll(); return [
        { label: 'Unread', value: String(a.filter(function (n) { return !n.read; }).length), note: 'Newest: today 08:52', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', ic: I.bell, fn: function () { self.setState({ chip: 'unread', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: kinds[0], value: String(a.filter(function (n) { return n.kind === kinds[0]; }).length), note: 'Newest first', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', ic: I.cash, fn: function () { self.setState({ chip: kinds[0], hpg: 0, ra: self.state.ra + 1 }); } }]; },
      rail: function () { return [{ title: 'What reaches you', sub: 'By email and in the app', rows: self.ntRail().map(function (t) { return { t: t, s: 'On', d: I.bell, open: function () { window.location.href = self.ntSettings(); } }; }) }]; },
      deck: function () { return self.ntDeck(); }
    };
  }
