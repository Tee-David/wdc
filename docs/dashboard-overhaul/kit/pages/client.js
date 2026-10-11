  /* ======================= Client · Home ======================= */
  pageState() { return { pick: 1, rIdx: 0, npage: 0, nper: 5, na: 0, ftab: 'all', fpage: 0, fper: 5, fq: '', fa: 0, slot: 0, sa: 0, paid: false, upl: '' }; }
  icons() { return this.baseIcons(); }
  brand() { return { name: 'Mira Skincare', sub: 'Client portal' }; }
  me() { return { name: 'Adaeze O.', i: 'AO', role: 'Mira Skincare', tone: '#1f4d3a' }; }
  pageName() { return 'Home'; }
  searchHint() { return 'Search files, invoices, posts'; }
  palHint() { return 'File, invoice number, post or page'; }
  palEmptyHint() { return 'Try a file name or an invoice number like 9QX4LM.'; }
  installCopy() { return ['Get WDC on your phone', 'Approvals, new files and receipts as push alerts.']; }
  role() { return 'client'; }
  navCounts() { return { Billing: { n: this.state.paid ? 0 : 1, tone: 'var(--ad-tone-warn)' }, Messages: { n: 2 } }; }
  recordKinds() { return ['Page', 'Project', 'Invoice', 'Post', 'File']; }
  snoozeOptions() { return [['This evening', '18:00'], ['Tomorrow', '09:00'], ['Monday', '09:00']]; }
  snoozeTitle() { return 'Remind me'; }
  teamData() { return []; }
  clearId(id, how, label, msg, opt) { var it = this.deck().filter(function (d) { return d.id === id; })[0]; if (it && !this.state.gone[id] && !this.state.snoozed[id]) this.clear(it, how, label, msg, opt); else if (msg) this.say(msg); }
  routeDefs() { return [{ name: 'Route A, Wordmark', short: 'route A', mark: 'mira', note: 'Clean lettering. Works small on labels and stamps.', bg: '#f1ece4', fg: '#2b2620' }, { name: 'Route B, Leaf mark', short: 'route B', mark: 'mira ❦', note: 'A leaf joins the letters. Warmer, more natural.', bg: '#1f4d3a', fg: '#f1ece4' }]; }
  invoice() { return { no: 'INV-26-9QX4LM', amount: '₦450,000', due: 'Due Tuesday', forLabel: 'Social media deposit, 50%', receipt: 'RCT-2026-041' }; }
  posts() {
    var L = this.socialLogos();
    return [['m1', 'instagram', 'Serum launch', 'Mon 13 Oct, 12:30', '#3d2a5c', 'New in: the brightening serum. Vitamin C, niacinamide, nothing harsh.'], ['m2', 'instagram', 'Skin tip carousel', 'Tue 14 Oct, 18:00', '#1f4d3a', '3 steps for a calmer evening routine. Save this for tonight.'], ['m3', 'facebook', 'Customer review', 'Wed 15 Oct, 12:30', '#5c3d1f', '“My skin has never felt this soft.” Thank you, Kemi.'], ['m4', 'tiktok', 'Behind the lab', 'Thu 16 Oct, 18:00', '#1f3a5c', 'How one bottle is made, start to finish.'], ['m5', 'instagram', 'Weekend offer', 'Fri 17 Oct, 12:30', '#5c1f3a', '10% off the gift set this weekend only.']].map(function (p) {
      return { id: p[0], plat: p[1], platform: { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' }[p[1]], logo: L[p[1]], title: p[2], when: p[3], art: p[4], cap: p[5], client: 'Mira Skincare', handle: '@miraskincare', owner: 'Chiamaka', cmtNote: 'Anything you write here goes to Chiamaka.', comments: p[0] === 'm1' ? [{ who: 'Chiamaka', i: 'CA', tone: '#b84a00', when: '20 min ago', t: 'We used the pink bottle shot from your last upload. Happy to swap it.' }] : [] };
    });
  }
  sheets() {
    var S = this.sh.bind(this), self = this, I = this.icons();
    var P = this.posts();
    return {
      changes: S({ eyebrow: 'Brand identity · round 2', title: 'Ask for changes', chip: 'Uses your included revision', tone: 'var(--ad-tone-brand)', icon: I.msg, body: 'Tell Ifeanyi what to keep and what to change. This uses your one included revision. Anything after it is quoted before we start.', compose: true, composeLabel: 'What should change?', composePh: 'For example: keep route B, make the leaf thinner, try a darker green', required: true, primary: 'Send to Ifeanyi', secondary: 'Book a quick call instead', sToast: 'Booking link opened. Calls are 15 minutes.',
        onPrimary: function () { self.clearId('logo', 'done', '', 'Sent. Ifeanyi replies within a working day.', { final: true }); } }),
      posts: S({ eyebrow: 'Social media · 13 to 17 October', title: '5 posts for next week', chip: 'Needs approval', tone: 'var(--ad-tone-live)', icon: I.eye, body: 'Tap a post to see it as it will look, comment or ask for changes. Nothing goes out without your yes.', listTitle: 'Posts',
        list: function (s) { return P.map(function (p) { var ok = !!s.okPosts[p.id]; return { t: p.title, s: p.platform + ' · ' + p.when, logo: p.logo, tag: ok ? 'Approved' : 'Waiting', tone: ok ? 'var(--ad-tone-good)' : 'var(--ad-tone-neutral)', open: null, act: { label: 'Preview', fn: function () { self.openPost(p, 'client', true); } } }; }); },
        primary: function (ctx, s) { var n = P.filter(function (p) { return !s.okPosts[p.id]; }).length; return n === 0 ? 'Done, all 5 approved' : (n === 5 ? 'Approve all 5' : 'Approve the other ' + n); }, keepOpen: true,
        onPrimary: function () { var s = self.state, left = P.filter(function (p) { return !s.okPosts[p.id]; }); if (!left.length) { self.closeSheet(); self.clearId('posts', 'done', '', 'All 5 approved. Chiamaka schedules them.'); return; } self.ask({ eyebrow: 'Approve', title: 'Approve ' + (left.length === 5 ? 'all 5 posts' : 'the other ' + left.length) + '?', body: 'They go out on the dates shown, exactly as you see them. You can still pull a post until an hour before.', ok: 'Approve ' + left.length, green: true, icon: I.check, tone: 'var(--ad-tone-good)', onOk: function () { var o = Object.assign({}, self.state.okPosts); left.forEach(function (p) { o[p.id] = true; }); self.setState({ okPosts: o }); self.clearId('posts', 'done', '', 'Approved. Chiamaka schedules them for next week.', { final: true }); } }, true); } }),
      access: S({ eyebrow: 'Social media · setup', title: 'Share Instagram access', chip: '2 minute guide', tone: 'var(--ad-tone-neutral)', icon: I.link, body: 'We never ask for your password. You can remove our access any time from the same screen.', checksTitle: 'In Meta Business Suite', checks: [{ t: 'Open Settings, then Partners', s: 'On your phone or computer' }, { t: 'Add partner: WDC Studio', s: 'Partner ID 1234 5678 90' }, { t: 'Give it content and insights', s: 'Not full control' }],
        primary: function (ctx, s) { var n = [0, 1, 2].filter(function (i) { return s.ck[i]; }).length; return n === 3 ? 'I have done it' : 'Tick the steps as you go'; }, primaryDis: function (ctx, s) { return [0, 1, 2].every(function (i) { return s.ck[i]; }) ? '' : 'Tick each step once it is done.'; }, secondary: 'Do it together on a call', sToast: 'Booking link opened.',
        onPrimary: function () { self.clearId('access', 'done', '', 'Thanks. Chiamaka checks it works and tells you.'); } }),
      upload: S({ eyebrow: 'Social media · November', title: 'Upload product photos', chip: '10 to 20 photos', tone: 'var(--ad-tone-neutral)', icon: I.upload, body: 'Daylight shots of each product work best. Up to 25 MB each. Chiamaka picks from these for your November posts.', keepOpen: true, listTitle: 'Your photos',
        list: function (s) { if (!s.upl) return []; var names = ['Serum front.jpg', 'Gift set.jpg', 'Cleanser.jpg']; return names.map(function (n, i) { return { t: n, s: (2.4 + i * 0.6).toFixed(1) + ' MB', tag: s.upl === 'done' ? 'Uploaded' : 'Uploading', tone: s.upl === 'done' ? 'var(--ad-tone-good)' : 'var(--ad-tone-live)' }; }).concat([{ t: 'and 9 more', s: s.upl === 'done' ? 'All 12 uploaded' : 'Uploading 12 photos' }]); },
        primary: function (ctx, s) { return s.upl === 'done' ? 'Send 12 photos to Chiamaka' : (s.upl ? 'Uploading…' : 'Choose photos'); }, primaryDis: function (ctx, s) { return s.upl === 'busy' ? 'Keep this open until the uploads finish.' : ''; },
        secondary: 'Remind me tomorrow',
        onPrimary: function () { var s = self.state; if (s.upl === 'done') { self.closeSheet(); self.clearId('photos', 'done', '', 'Sent. Chiamaka has been told.'); return; } self.setState({ upl: 'busy' }); setTimeout(function () { self.setState({ upl: 'done' }); }, self.reduce ? 200 : 1600); },
        onSecondary: function () { self.closeSheet(); self.clearId('photos', 'snooze', 'Tomorrow, 09:00', 'We will remind you tomorrow at 09:00.'); return 'stay'; } })
    };
  }
  deck() {
    var X = this.sheets(), self = this, I = this.icons(), R = this.routeDefs(), s = this.state;
    return [
      { id: 'logo', isLogo: true, kind: 'Brand identity', urgency: 'Round 2 of 2', utone: '#b84a00', label: 'From Ifeanyi · 1 h ago', title: 'Choose your logo', body: 'Two routes, built from the colours and fonts you picked on Tuesday. Tap one to make it your pick, then approve it or ask for changes.', meta: [{ k: 'Next after this', v: 'Final files, brand guide' }, { k: 'Ready by', v: 'Friday' }], primaryLabel: 'Approve ' + R[s.pick].short,
        primaryFn: function (at) { var r = R[self.state.pick]; self.ask({ eyebrow: 'Approve your logo', title: 'Approve ' + r.name + '?', body: 'Ifeanyi starts your final files and brand guide today, ready by Friday. Changes to the logo after this are quoted before we start.', ok: 'Approve ' + r.short, green: true, tone: 'var(--ad-tone-good)', icon: I.check, note: 'Your pick: ' + r.name + '. ' + r.note, onOk: function () { self.clear(self.deck()[0], 'done', '', 'Approved ' + r.short + '. Final files and brand guide by Friday.', { at: at, final: true }); } }); },
        secondaryLabel: 'Ask for changes', secondaryFn: function () { self.open(Object.assign({}, X.changes, { deckId: 'logo' })); }, sheet: this.sh({ eyebrow: 'Brand identity', title: 'Logo round 2', icon: I.eye, rows: [{ k: 'Sent', v: 'Today, 1 h ago' }, { k: 'Round', v: '2 of 2 included' }, { k: 'Designer', v: 'Ifeanyi N.' }], body: 'Both routes use the colours and fonts you picked. The PDF has each route on a label, a bag and your Instagram profile.', primary: 'See both routes full size', onPrimary: function () { setTimeout(function () { self.openRoutes(); }, 30); } }) },
      { id: 'pay', kind: 'Invoice', urgency: 'Due Tuesday', utone: '#a16207', label: 'INV-26-9QX4LM', title: 'Pay the social media deposit', body: 'Your monthly social media starts on 1 November. The deposit lets Chiamaka start planning.', meta: [{ k: 'Amount', v: '₦450,000' }, { k: 'Pay with', v: 'Paystack or Flutterwave' }], primaryLabel: 'Pay ₦450,000', primaryFn: function () { self.payNow(); }, secondaryLabel: 'Preview invoice', secondaryFn: function () { self.openFile(self.invoiceFile()); }, sheet: this.invoiceSheet() },
      { id: 'posts', kind: 'Social media', urgency: '5 posts', utone: '#b84a00', label: 'From Chiamaka · 20 min ago', title: 'Approve next week’s posts', body: 'Serum launch, a skin tip carousel, a customer review and two more, for 13 to 17 October.', meta: [{ k: 'Platforms', v: 'Instagram, Facebook, TikTok' }, { k: 'Approve by', v: 'Monday 09:00' }], primaryLabel: 'Review posts', primarySheet: X.posts, secondaryLabel: 'Approve all 5', secondaryFn: function () { X.posts.onPrimary(); }, sheet: X.posts },
      { id: 'access', kind: 'Social media', urgency: 'Needed by 1 Nov', utone: '#5c5c7a', label: 'From Chiamaka', title: 'Share Instagram access', body: 'Add the studio as a partner in Meta Business Suite. No password needed.', meta: [{ k: 'Takes', v: 'About 2 minutes' }, { k: 'You keep', v: 'Full control' }], primaryLabel: 'See the guide', primarySheet: X.access, secondaryLabel: 'Do it on a call', sToast: 'Booking link opened. Chiamaka walks you through it.', keep: true, sheet: X.access },
      { id: 'photos', kind: 'Social media', urgency: 'For November', utone: '#5c5c7a', label: 'From Chiamaka', title: 'Upload product photos', body: '10 to 20 daylight photos of your products for November posts.', meta: [{ k: 'From', v: 'Phone or computer' }, { k: 'Size', v: 'Up to 25 MB each' }], primaryLabel: 'Upload photos', primaryFn: function () { self.setState({ upl: '' }); self.open(Object.assign({}, X.upload, { deckId: 'photos' })); }, secondaryLabel: 'Remind me tomorrow', secondaryFn: function () { self.clearId('photos', 'snooze', 'Tomorrow, 09:00', 'We will remind you tomorrow at 09:00.'); }, sheet: X.upload }
    ];
  }
  openRoutes() { this.openFile({ name: 'Logo round 2.pdf', project: 'Brand identity', view: 'palette', when: 'Today', size: '4.2 MB', by: 'Ifeanyi N.', tone: 'var(--ad-tone-bad)', fresh: true, pageCount: 6, swatches: [{ c: '#1f4d3a', n: 'Leaf' }, { c: '#f1ece4', n: 'Linen' }, { c: '#2b2620', n: 'Bark' }, { c: '#c9a27a', n: 'Clay' }] }); }
  invoiceFile() { return { name: 'Invoice INV-26-9QX4LM.pdf', project: 'Billing', view: 'doc', ref: 'INV-26-9QX4LM', docTitle: 'Invoice · ₦450,000', when: '7 Oct', size: '190 KB', tone: 'var(--ad-tone-bad)', by: 'Funmi K.' }; }
  invoiceSheet() { var I = this.icons(), self = this; return this.sh({ eyebrow: 'Invoice', title: 'INV-26-9QX4LM', chip: this.state.paid ? 'Paid' : 'Due Tuesday', tone: this.state.paid ? 'var(--ad-tone-good)' : 'var(--ad-tone-warn)', icon: I.file, rows: [{ k: 'Amount', v: '₦450,000' }, { k: 'For', v: 'Social media, deposit 50%' }, { k: 'Issued', v: '7 Oct 2026' }, { k: 'Due', v: 'Tue 14 Oct' }], body: 'Paying with Paystack or Flutterwave opens their secure page. We never see your card.', primary: 'Preview the invoice', onPrimary: function () { self.openFile(self.invoiceFile()); } }); }
  payNow() { var self = this; if (this.state.paid) { this.say('This invoice is already paid. Your receipt is in Billing.'); return; } this.openPay(this.invoice(), function (prov) { self.setState({ paid: true }); self.clearId('pay', 'done', '', 'Paid with ' + self.provName(prov) + '. Receipt RCT-2026-041 is in Billing and your email.', { final: true }); }); }
  filesData() {
    var C = { brand: 'Brand identity', social: 'Social media', billing: 'Billing' };
    return [
      ['Logo round 2.pdf', 'brand', 'Today', '4.2 MB', 1, 'palette'], ['Colour and type sheet.png', 'brand', 'Tue 7 Oct', '1.1 MB', 1, 'palette'],
      ['Instagram access guide.pdf', 'social', '7 Oct', '420 KB', 0, 'doc'], ['Invoice INV-26-9QX4LM.pdf', 'billing', '7 Oct', '190 KB', 0, 'doc'],
      ['Content pillars.pdf', 'social', '3 Oct', '1.6 MB', 0, 'doc'], ['Social plan October.pdf', 'social', '2 Oct', '2.4 MB', 0, 'doc'],
      ['Receipt INV-26-2FT7RB.pdf', 'billing', '30 Sep', '180 KB', 0, 'doc'], ['Moodboard.jpg', 'brand', '26 Sep', '3.8 MB', 0, 'art'],
      ['Competitor scan.pdf', 'brand', '25 Sep', '2.2 MB', 0, 'doc'], ['Discovery notes.pdf', 'brand', '24 Sep', '320 KB', 0, 'doc'],
      ['Logo round 1.pdf', 'brand', '22 Sep', '3.9 MB', 0, 'art'], ['Signed quote.pdf', 'billing', '20 Sep', '210 KB', 0, 'doc']
    ].map(function (f, i) { var ext = f[0].split('.').pop().toUpperCase(); return { id: 'f' + i, name: f[0], cat: f[1], project: C[f[1]], when: f[2], size: f[3], fresh: !!f[4], view: f[5], ext: ext, docTitle: f[0].replace(/\.\w+$/, ''), ref: 'MIRA-' + (i + 1), pageCount: ext === 'PDF' ? 2 + (i % 5) : 1, bg: i === 7 ? '#c9a27a' : '#f1ece4', fg: '#2b2620', mark: i === 7 ? 'moodboard' : 'mira', swatches: [{ c: '#1f4d3a', n: 'Leaf' }, { c: '#f1ece4', n: 'Linen' }, { c: '#2b2620', n: 'Bark' }, { c: '#c9a27a', n: 'Clay' }], tone: ext === 'PDF' ? '#c62828' : (ext === 'PNG' ? '#000065' : '#b84a00') }; });
  }
  fileActions(f) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    return [
      it('Preview', I.eye, function () { self.openFile(f); }),
      it('Download', I.down, function () { self.say('Downloading ' + f.name); }, { hint: f.size }),
      it('Copy a share link', I.link, function () { self.say('Link copied. It works for 7 days.'); }, { hint: '7 days' }),
      this.menuSep(),
      it('Ask about this file', I.msg, function () { self.ask({ eyebrow: 'Message', title: 'Ask about ' + f.name, body: 'It goes to the person who shared it, with the file attached.', input: true, inputLabel: 'Your question', inputPh: 'Ask anything about this file', ok: 'Send', icon: I.msg, okToast: 'Sent. Replies come to Messages and your email.' }); })
    ];
  }
  popItems(pop) { if (pop.kind === 'row') { var f = this.filesData().filter(function (x) { return x.id === pop.id; })[0]; return f ? this.fileActions(f) : []; } return []; }
  notesData() {
    var X = this.sheets(), self = this, I = this.icons();
    return [
      { id: 'n1', i: 'IN', tone: 'var(--ad-tone-brand)', t: 'Round 2 of your logo is ready', when: '1 h ago', sheet: this.sh({ eyebrow: 'Brand identity', title: 'Round 2 is ready', icon: I.eye, body: 'Choose a route at the top of your Home page, or see both full size first.', primary: 'See both routes', onPrimary: function () { setTimeout(function () { self.openRoutes(); }, 30); } }) },
      { id: 'n2', i: 'CA', tone: 'var(--ad-tone-live)', t: '5 posts are ready for your approval', when: '20 min ago', sheet: X.posts },
      { id: 'n3', i: '₦', tone: 'var(--ad-tone-warn)', t: 'New invoice: social media deposit', when: '7 Oct', sheet: this.invoiceSheet() },
      { id: 'n4', i: 'CA', tone: 'var(--ad-tone-live)', t: 'Chiamaka asked for Instagram access', when: '7 Oct', sheet: X.access },
      { id: 'n5', i: '✓', tone: 'var(--ad-tone-good)', t: 'Receipt for ₦600,000, brand identity', when: '30 Sep', sheet: this.receipt() }
    ];
  }
  receipt() { var self = this; return this.sh({ eyebrow: 'Receipt', title: '₦600,000 received', chip: 'Paid', tone: 'var(--ad-tone-good)', icon: this.icons().check, iconTone: 'var(--ad-tone-good)', rows: [{ k: 'Invoice', v: 'INV-26-2FT7RB' }, { k: 'Method', v: 'Paystack card' }, { k: 'For', v: 'Brand identity, 50%' }, { k: 'Date', v: '30 Sep 2026' }], primary: 'Preview the receipt', onPrimary: function () { self.openFile({ name: 'Receipt INV-26-2FT7RB.pdf', project: 'Billing', view: 'doc', ref: 'RCT-2026-028', docTitle: 'Receipt · ₦600,000', when: '30 Sep', size: '180 KB', tone: 'var(--ad-tone-good)' }); } }); }
  records() {
    var X = this.sheets(), self = this;
    var files = this.filesData().slice(0, 4).map(function (f) { return { kind: 'File', label: f.name, sub: f.when + ' · ' + f.size, ini: f.ext, tone: f.tone, sheet: null, file: f }; });
    return [
      { kind: 'Page', label: 'Billing', sub: 'Invoices, receipts and payments', ini: '₦', tone: 'var(--ad-tone-neutral)' },
      { kind: 'Page', label: 'Support', sub: 'Answers, tickets and questions', ini: '?', tone: 'var(--ad-tone-neutral)' },
      { kind: 'Project', label: 'Brand identity', sub: 'Ready for your look · round 2', ini: 'B', tone: 'var(--ad-tone-brand)', sheet: this.deck()[0].sheet },
      { kind: 'Project', label: 'Social media management', sub: 'Starts 1 November', ini: 'S', tone: 'var(--ad-tone-brand)', sheet: X.posts },
      { kind: 'Invoice', label: 'INV-26-9QX4LM', sub: '₦450,000 · ' + (this.state.paid ? 'paid' : 'due Tuesday'), ini: 'IN', tone: 'var(--ad-tone-warn)', sheet: this.invoiceSheet() },
      { kind: 'Invoice', label: 'INV-26-2FT7RB', sub: '₦600,000 · paid 30 Sep', ini: 'IN', tone: 'var(--ad-tone-good)', sheet: this.receipt() },
      { kind: 'Post', label: 'Serum launch', sub: 'Instagram · Mon 13 Oct', ini: 'IG', tone: 'var(--ad-tone-live)', sheet: X.posts }
    ].concat(files);
  }
  palPick(r) { this.setState({ pal: false, q: '' }); if (r.file) { this.openFile(r.file); return; } if (r.sheet) this.open(r.sheet); else this.later(r.label + ' opens in the full prototype.'); }
  walk() { return { nav: 'Home is what needs you. Projects shows progress, files and each project’s content calendar, Billing has invoices and receipts, Messages is where you talk to the team, and Support has answers and tickets.', bell: 'Approvals, new files and receipts land here. We email you the important ones too, so you never have to check.' }; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'What we need from you', icon: I.layers, body: 'One thing at a time. When you finish one, the next one appears. Nothing goes out without your yes.', hint: 'Swipe the logo routes on a phone.' },
      { target: 'later', title: 'What we are doing next', icon: I.cal, body: 'The studio’s next steps on your projects, with dates. You get an email when each one lands.' },
      { target: 'rail', title: 'Money and meetings', icon: I.card, body: 'What you have paid, what is due and your next meeting. Pay with Paystack or Flutterwave in a few taps.' },
      { target: 'search|searchS', title: 'Find any file or invoice', icon: I.search, body: 'Search by name or number. Every file we send you lives in your library.' }
    ];
  }
  routeScroll(e) { var el = e.currentTarget || e.target; if (!el || !el.firstElementChild) return; var w = el.firstElementChild.offsetWidth + 10, i = Math.round(el.scrollLeft / w); if (i !== this.state.rIdx) this.setState({ rIdx: i }); }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this), X = this.sheets(), L = this.socialLogos();
    var all = this.deck(), dv = this.deckView(all), queue = all.filter(function (d) { return !s.gone[d.id] && !s.snoozed[d.id]; });
    var R = this.routeDefs();
    var routes = R.map(function (r, i) { var on = s.pick === i; return Object.assign({}, r, { isSel: on, cls: on ? 'on' : '', checked: on ? 'true' : 'false', pick: function () { self.setState({ pick: i, rIdx: i }); } }); });

    var SV = { brand: ['Brand', 'var(--ad-tone-brand)'], social: ['Social', 'var(--ad-tone-live)'], billing: ['Billing', 'var(--ad-tone-good)'] };
    var slots = [['Tue', '14', 'Oct', '15:30'], ['Wed', '15', 'Oct', '11:00'], ['Thu', '16', 'Oct', '14:00']], sl = slots[s.slot];
    var nextAll = [
      ['Logo review meeting', 'With Ifeanyi on Google Meet', 'brand', sl[0] + ' ' + sl[1] + ' Oct'],
      ['Final logo files', 'SVG, PNG and PDF, light and dark', 'brand', 'Fri 17 Oct'],
      ['Your brand guide', 'Colours, fonts, logo rules, 12 pages', 'brand', 'Fri 17 Oct'],
      ['Balance invoice, brand identity', '₦600,000, sent with the final files', 'billing', 'Fri 17 Oct'],
      ['Handover meeting', 'Recorded, with your handover document', 'brand', 'Mon 20 Oct'],
      ['November content plan', '24 posts across 3 platforms', 'social', 'Mon 27 Oct'],
      ['Social media starts', 'First post goes live', 'social', 'Sat 1 Nov'],
      ['Mid-month check-in', 'What is working, with Chiamaka', 'social', 'Sat 15 Nov'],
      ['First monthly report', 'Reach, followers and what worked', 'social', 'Mon 1 Dec']
    ];
    var NS = s.nper, np = Math.min(s.npage, Math.max(0, Math.ceil(nextAll.length / NS) - 1));
    var nextItems = nextAll.slice(np * NS, np * NS + NS).map(function (l, i) { var k = np * NS + i, same = k > 0 && nextAll[k - 1][3] === l[3]; return { t: l[0], s: l[1], svc: SV[l[2]][0], tone: SV[l[2]][1], dotCls: k === 0 ? 'now' : '', whenShow: same ? 'Same day' : l[3], whenCol: same ? 'var(--ad-dim)' : (k === 0 ? 'var(--ad-accent-ink)' : 'var(--ad-ink)'), anim: self.anim(s.na), delay: (i * 0.04) + 's', open: function () { self.open(S({ eyebrow: 'Coming up · ' + SV[l[2]][0], title: l[0], icon: I.cal, rows: [{ k: 'When', v: l[3] }, { k: 'Project', v: l[2] === 'social' ? 'Social media' : (l[2] === 'billing' ? 'Billing' : 'Brand identity') }], body: l[1] + '. We email you when it is ready.', primary: 'Got it' })); } }; });
    var NP = Object.assign(this.pager('next', nextAll.length, NS, np, function (k) { self.setState({ npage: k, na: self.state.na + 1 }); }, function (n) { self.setState({ nper: n, npage: 0, na: self.state.na + 1 }); }), { all: function () { self.open(S({ eyebrow: 'Coming up', title: 'Everything we have planned', icon: I.cal, listTitle: 'In date order', list: nextAll.map(function (l) { return { t: l[0], s: l[3] + ' · ' + l[1], tag: SV[l[2]][0], tone: SV[l[2]][1] }; }), primary: 'Close' })); } });

    var FILES = this.filesData(), fq = s.fq.trim().toLowerCase();
    var fl = FILES.filter(function (f) { return (s.ftab === 'all' || f.cat === s.ftab) && (!fq || f.name.toLowerCase().indexOf(fq) >= 0); });
    var fp = Math.min(s.fpage, Math.max(0, Math.ceil(fl.length / s.fper) - 1));
    var frows = fl.slice(fp * s.fper, fp * s.fper + s.fper).map(function (f, i) { var prev = function () { self.openFile(f); }; return Object.assign({}, f, { meta: f.project + ' · ' + f.when + ' · ' + f.size, aria: 'Preview ' + f.name, dlAria: 'Download ' + f.name, menuAria: 'More for ' + f.name, anim: self.anim(s.fa), delay: (i * 0.035) + 's',
      get: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.say('Downloading ' + f.name); }, preview: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; prev(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); prev(); } },
      menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', f.id, 250, 240, 'More for ' + f.name); } }); });
    var ftabs = [['all', 'All', 'var(--ad-series-1)'], ['brand', 'Brand', 'var(--ad-tone-brand)'], ['social', 'Social', 'var(--ad-tone-live)'], ['billing', 'Billing', 'var(--ad-tone-good)']].map(function (tb) { var on = s.ftab === tb[0]; return { label: tb[1], dot: tb[2], n: FILES.filter(function (f) { return (tb[0] === 'all' || f.cat === tb[0]) && (!fq || f.name.toLowerCase().indexOf(fq) >= 0); }).length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ftab: tb[0], fpage: 0, fa: self.state.fa + 1 }); } }; });
    var FP = Object.assign(this.pager('files', fl.length, s.fper, fp, function (k) { self.setState({ fpage: k, fa: self.state.fa + 1 }); }, function (n) { self.setState({ fper: n, fpage: 0, fa: self.state.fa + 1 }); }), { all: function () { self.later('Your full library opens in Projects in the full prototype.'); } });

    var invoiced = 1050000, paid = s.paid ? 1050000 : 600000, pct = Math.round(paid / invoiced * 100);
    var trk = function (labels, cur) { return labels.map(function (l, i) { return { l: l, n: i + 1, cls: i < cur ? 'done' : (i === cur ? 'cur' : 'todo'), isDone: i < cur, notDone: i >= cur, delay: (0.3 + i * 0.08) + 's' }; }); };
    var projects = [
      { name: 'Brand identity', status: 'Ready for your look', tone: 'var(--ad-tone-live)', track: trk(['Discovery', 'Concepts', 'Review', 'Final files', 'Handover'], 2), next: 'Your choice of route moves this to final files.', sheet: all[0].sheet },
      { name: 'Social media management', status: 'Starts 1 Nov', tone: 'var(--ad-tone-brand)', track: trk(['Setup', 'Plan', 'Approve', 'Publish', 'Report'], s.paid ? 1 : 0), next: s.paid ? 'Deposit paid. Chiamaka is planning November.' : 'Starts after the deposit and Instagram access.', sheet: X.posts }
    ].map(function (pj) { var c = pj.track.filter(function (x) { return x.cls === 'cur'; })[0]; return Object.assign({}, pj, { stepAria: pj.name + ': stage ' + c.n + ' of ' + pj.track.length + ', ' + c.l, open: function () { self.open(pj.sheet); } }); });
    var team = [{ name: 'Ifeanyi N., Branding', i: 'IN', tone: '#000065' }, { name: 'Chiamaka A., Social media', i: 'CA', tone: '#b84a00' }, { name: 'Funmi K., Billing', i: 'FK', tone: '#15803d' }];
    var personSheet = function (m) { return S({ eyebrow: 'Your team', title: m.name, icon: I.users, iconTone: m.tone, body: 'Replies within a working day, Monday to Friday.', primary: 'Message ' + m.name.split(' ')[0], onPrimary: function () { self.say('Opening a conversation with ' + m.name.split(' ')[0] + ' in Messages.'); } }); };

    return Object.assign(this.kit(), this.extraVals(), dv, {
      deckTitle: 'Waiting on you', deckKeys: '', snoozeLabel: 'Remind me later', snoozeShort: 'Later', canPass: false, routes: routes, routeDots: R.map(function (r, i) { return i === s.rIdx ? 'on' : ''; }), routeScroll: this.routeScroll.bind(this), openRouteFile: function () { self.openRoutes(); },
      emptyTitle: 'Nothing is waiting on you, Adaeze.', emptyBody: 'The team has what they need. Next from us:', emptyNext: 'your final logo files and brand guide by Friday.', emptyPrimaryLabel: 'Message the team', emptySecondaryLabel: 'Show what I did',
      emptyPrimary: function () { self.ask({ eyebrow: 'Messages', title: 'Message the team', body: 'Ifeanyi and Chiamaka see this. Replies come here and to your email.', input: true, inputLabel: 'Your message', inputPh: 'Ask anything about your projects', ok: 'Send', icon: I.msg, okToast: 'Sent. We reply within a working day.' }); },
      headline: queue.length ? 'Welcome back, Adaeze. ' + queue.length + (queue.length === 1 ? ' thing is waiting on you.' : ' things are waiting on you.') : 'Welcome back, Adaeze. You are all caught up.',
      nextTotal: nextAll.length, nextItems: nextItems, NP: NP,
      fq: s.fq, hasFq: !!s.fq, onFq: function (e) { self.setState({ fq: e.target.value, fpage: 0, fa: self.state.fa + 1 }); }, clearFq: function () { self.setState({ fq: '', fa: self.state.fa + 1 }); },
      ftabs: ftabs, frows: frows, fEmpty: !fl.length, FP: FP,
      paid: this.short(paid * p), invoiced: this.ngn(invoiced), paidPct: Math.round(pct * p), ringOff: (100 - pct * p).toFixed(1), billAria: pct + '% of invoices paid', hasDue: !s.paid, allPaid: s.paid, dueAmount: '₦450,000', dueWhen: 'Tuesday', payNow: function () { self.payNow(); },
      lastReceipt: s.paid ? 'Receipt RCT-2026-041 · ₦450,000' : 'Receipt · ₦600,000', lastReceiptSub: s.paid ? 'Social media deposit · today' : 'Brand identity deposit · 30 Sep', openReceipt: function () { self.open(self.receipt()); },
      openInvoices: function () { self.open(S({ eyebrow: 'Billing', title: 'Invoices and receipts', icon: I.card, listTitle: 'Newest first', list: [{ t: 'INV-26-9QX4LM · ₦450,000', s: 'Social media deposit · 7 Oct', tag: s.paid ? 'Paid' : 'Due Tue', tone: s.paid ? 'var(--ad-tone-good)' : 'var(--ad-tone-warn)', open: self.invoiceSheet() }, { t: 'INV-26-2FT7RB · ₦600,000', s: 'Brand identity deposit · 20 Sep', tag: 'Paid', tone: 'var(--ad-tone-good)', open: self.receipt() }], primary: 'Close' })); },
      meetMon: sl[2], meetDay: sl[1], meetTime: sl[0] + ', ' + sl[3], meetIn: s.slot === 0 ? 'In 4 days' : (s.slot === 1 ? 'In 5 days' : 'In 6 days'), slotAnim: self.anim(s.sa), meetLogoD: L.meet.d, meetLogoC: L.meet.c,
      joinDis: true, joinNote: 'Join opens 10 minutes before. We email you the link too.', join: function () {},
      addCal: function () { self.say('Added. Your calendar file has the Google Meet link.'); },
      moveMeeting: function () { self.open(S({ eyebrow: 'Logo review · Ifeanyi', title: 'Pick a new time', icon: I.cal, body: 'Ifeanyi is free at these times. Moving keeps this as review 1 of 2.', listTitle: 'Open times', select: true, pick: s.slot, list: slots.map(function (x, i) { return { t: x[0] + ' ' + x[1] + ' ' + x[2] + ', ' + x[3], s: i === s.slot ? 'Current time' : '30 min · Google Meet', tag: i === s.slot ? 'Now' : '', tone: 'var(--ad-tone-neutral)' }; }),
        primary: function (ctx) { return ctx.pick === self.state.slot ? 'Keep this time' : 'Move to ' + slots[ctx.pick][0] + ' ' + slots[ctx.pick][3]; }, onPrimary: function (ctx) { if (ctx.pick === self.state.slot) return; var prev = self.state.slot; self.setState({ slot: ctx.pick, sa: self.state.sa + 1 }); self.say('Moved. Ifeanyi has the new time.', { undo: function () { self.setState({ slot: prev, sa: self.state.sa + 1 }); } }); } })); },
      projects: projects, teamStack: team.slice(0, 2).map(function (m) { return Object.assign({}, m, { open: function () { self.open(personSheet(m)); } }); }), teamMore: 1, teamMoreAria: 'Show 1 more person',
      openTeam: function () { self.open(S({ eyebrow: 'Your team', title: 'The people on your projects', icon: I.users, listTitle: 'Team', list: team.map(function (m) { return { t: m.name, s: 'Replies within a working day', ini: m.i, av: m.tone, open: personSheet(m) }; }), primary: 'Close' })); },
      showHelp: !s.sheet && !s.pal, openHelp: function () { self.openHelp(); }
    });
  }
  openHelp() {
    var self = this, I = this.icons(), S = this.sh.bind(this);
    var qa = [['How do I pay an invoice?', 'Tap Pay on the invoice, choose Paystack or Flutterwave, and finish on their secure page. Your receipt arrives straight away, in Billing and by email.'], ['How many changes are included?', 'Your logo includes two rounds. After the second, changes are quoted before we start.'], ['Who owns my domain?', 'Domains are registered in your name and details. We remind you before every renewal.'], ['How do I get my final files?', 'They land in Your files, and at handover you get every file plus a handover document.']];
    this.open(S({ eyebrow: 'Jotform assistant', title: 'Ask us anything', icon: I.msg, body: 'Answers come from our help articles. Anything it cannot answer goes to a person, who replies within a working day.', listTitle: 'People often ask', list: qa.map(function (q) { return { t: q[0], s: 'Tap to read the answer', open: S({ eyebrow: 'Answer', title: q[0], icon: I.life, body: q[1], primary: 'That helped', pToast: 'Thanks for telling us.', secondary: 'Ask a person', sToast: 'A person replies within a working day.' }) }; }), compose: true, composeLabel: 'Or ask your own question', composePh: 'For example: can I add a second Instagram account?', required: true, requiredWhy: 'Type a question, or pick one above.', primary: 'Ask', pToast: 'Asked. The answer comes here and to your email.', note: 'In the live portal this is the Jotform assistant we already use, opened in this panel.' }));
  }
