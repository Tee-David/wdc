  /* ======================= Client base: Adaeze O., Mira Skincare =======================
     Loads after the owner's shared file and overrides identity, scope and search. A client sees only their own
     projects, files, invoices and conversations. */
  brand() { return { name: 'Mira Skincare', sub: 'Client portal' }; }
  me() { return { name: 'Adaeze O.', i: 'AO', role: 'Mira Skincare', tone: '#1f4d3a' }; }
  role() { return 'client'; }
  projRole() { return 'client'; }
  searchHint() { return 'Search files, invoices, posts'; }
  palHint() { return 'File, invoice number, post or page'; }
  palEmptyHint() { return 'Try a file name or an invoice number like 9QX4LM.'; }
  installCopy() { return ['Get WDC on your phone', 'Approvals, new files and receipts as push alerts.']; }
  recordKinds() { return ['Page', 'Project', 'Invoice', 'File']; }
  snoozeOptions() { return [['This evening', '18:00'], ['Tomorrow', '09:00'], ['Monday', '09:00']]; }
  snoozeTitle() { return 'Remind me'; }
  teamData() { return []; }
  hideMoney() { return false; }
  projScope(p) { return p.client === 'Mira Skincare'; }
  projPageKeys() { return ['mira-br', 'mira-so']; }
  projPageHref(id) { return 'C-Projects.dc.html?p=' + id; }
  navCounts() { return { Billing: { n: this.state.paid ? 0 : 1, tone: 'var(--ad-tone-warn)' }, Messages: { n: 2 } }; }
  notesData() {
    var S = this.sh.bind(this), I = this.icons();
    var go = function (title, body, href, label, eyebrow) { return S({ eyebrow: eyebrow || 'Notice', title: title, icon: I.bell, body: body, primary: label, onPrimary: function () { window.location.href = href; }, secondary: 'Close' }); };
    return [
      { id: 'n1', i: 'IN', tone: 'var(--ad-tone-brand)', t: 'Round 2 of your logo is ready', when: '1 Oct', sheet: go('Round 2 is ready', 'Two refined routes are waiting. Pick the one you like most, or see both full size first.', 'C-Projects.dc.html?p=mira-br', 'Open Brand identity', 'Brand identity') },
      { id: 'n2', i: 'CA', tone: 'var(--ad-tone-live)', t: '5 posts are ready for your approval', when: '20 min ago', sheet: go('Five posts for your approval', 'The launch week posts are in your content calendar. Approving takes about two minutes.', 'C-Projects.dc.html?p=mira-so', 'Open the content calendar', 'Social media') },
      { id: 'n3', i: '₦', tone: 'var(--ad-tone-warn)', t: 'New invoice: social media deposit', when: '7 Oct', sheet: go('Invoice INV-26-9QX4LM', '₦450,000, due Wed 14 Oct. Pay with Paystack or Flutterwave, and your receipt arrives straight away.', 'C-Billing.dc.html', 'Open Billing', 'Billing') },
      { id: 'n4', i: 'CA', tone: 'var(--ad-tone-live)', t: 'Chiamaka asked for Instagram access', when: '7 Oct', sheet: go('Instagram access', 'Two minutes in Instagram settings lets Chiamaka schedule your posts. The guide has the exact clicks.', 'C-Projects.dc.html?p=mira-so', 'Open Social media', 'Social media') },
      { id: 'n5', i: '✓', tone: 'var(--ad-tone-good)', t: 'Receipt for ₦600,000, brand identity', when: '2 Oct', sheet: go('Receipt RCT-2026-035', '₦600,000 received by Paystack on 2 Oct. It is in Billing and your email.', 'C-Billing.dc.html', 'Open Billing', 'Billing') }
    ];
  }
  records() {
    var pages = [['Home', 'What needs you, and what is next', 'D-Client.dc.html'], ['Projects', 'Progress, approvals and files', 'C-Projects.dc.html'], ['Billing', 'Invoices, receipts and payments', 'C-Billing.dc.html'], ['Messages', 'Talk to the team', 'C-Messages.dc.html'], ['Support', 'Answers, tickets and questions', 'C-Support.dc.html'], ['Settings', 'Profile, people and notifications', 'C-Settings.dc.html']].map(function (x) { return { kind: 'Page', label: x[0], sub: x[1], ini: x[0].charAt(0), tone: 'var(--ad-tone-neutral)', href: x[2] }; });
    return pages.concat([
      { kind: 'Project', label: 'Brand identity', sub: 'Round 2 · waiting on you', ini: 'B', tone: 'var(--ad-tone-warn)', href: 'C-Projects.dc.html?p=mira-br' },
      { kind: 'Project', label: 'Social media management', sub: 'Starts 1 November', ini: 'S', tone: 'var(--ad-tone-brand)', href: 'C-Projects.dc.html?p=mira-so' },
      { kind: 'Invoice', label: 'INV-26-9QX4LM', sub: '₦450,000 · due Wed 14 Oct', ini: 'IN', tone: 'var(--ad-tone-warn)', href: 'C-Billing.dc.html' },
      { kind: 'Invoice', label: 'INV-26-2FT7RB', sub: '₦600,000 · paid 2 Oct', ini: 'IN', tone: 'var(--ad-tone-good)', href: 'C-Billing.dc.html' },
      { kind: 'File', label: 'Logo round 2.pdf', sub: '1 Oct · 4.2 MB', ini: 'PDF', tone: 'var(--ad-tone-bad)', href: 'C-Projects.dc.html?p=mira-br' },
      { kind: 'File', label: 'Content pillars.pdf', sub: '3 Oct · 1.6 MB', ini: 'PDF', tone: 'var(--ad-tone-bad)', href: 'C-Projects.dc.html?p=mira-so' }
    ]);
  }
  walk() { return { nav: 'Home is what needs you. Projects shows progress, files and each project’s content calendar, Billing has invoices and receipts, Messages is where you talk to the team, and Support has answers and tickets.', bell: 'Approvals, new files and receipts land here. We email you the important ones too, so you never have to check.' }; }
