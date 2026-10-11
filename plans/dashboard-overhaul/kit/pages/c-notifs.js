  /* ======================= Client · Notifications inbox ======================= */
  pageName() { return 'Home'; }
  ntKinds() { return ['Billing', 'Messages', 'Projects', 'Meetings']; }
  ntSettings() { return 'C-Settings.dc.html'; }
  ntRail() { return ['Invoices and receipts', 'Replies from the studio', 'Files and posts to approve', 'Meeting reminders']; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'What to read first', icon: I.target, body: 'The things waiting on you: an invoice, a file to approve.' },
      { target: 'table', title: 'Everything the studio told you', icon: I.bell, body: 'Invoices, replies, approvals and meetings, newest first. Tap one to go to the page it is about.' },
      { target: 'rail', title: 'What reaches you', icon: I.gear, body: 'Each kind can be switched off, by email or in the portal, from Settings.' }
    ];
  }
  ntAll() {
    return this.hubApply('nt', [
      { id: 'n1', name: 'Invoice INV-26-4KQ8ZD is due Tue 13 Oct', sub: '₦850,000. Pay with Paystack or Flutterwave from Billing.', kind: 'Billing', read: false, when: 'Today, 08:00', go: 'C-Billing.dc.html' },
      { id: 'n2', name: 'Ifeanyi replied about Brand guide v2', sub: 'The darker navy is ready for you to look at.', kind: 'Messages', read: false, when: 'Today, 08:10', go: 'C-Messages.dc.html' },
      { id: 'n3', name: 'Two posts are waiting for your approval', sub: 'Social media, the week of 12 Oct.', kind: 'Projects', read: false, when: 'Yesterday', go: 'C-Projects.dc.html' },
      { id: 'n4', name: 'Review meeting on Mon 12 Oct, 10:00', sub: 'Google Meet with Ifeanyi. The link is in your email.', kind: 'Meetings', read: true, when: 'Fri 9 Oct', go: 'C-Projects.dc.html' },
      { id: 'n5', name: 'Receipt RCT-2026-038 is ready', sub: '₦450,000 paid on 2 Oct. Download it from Billing.', kind: 'Billing', read: true, when: 'Fri 2 Oct', go: 'C-Billing.dc.html' }
    ]);
  }
  ntDeck() {
    var self = this, I = this.icons(), a = this.ntAll().filter(function (n) { return n.id === 'n1'; })[0];
    return [{ id: 'nd1', kind: 'Invoice', urgency: 'Due Tue 13 Oct', utone: '#a16207', label: 'Billing', dept: 'Studio', title: 'Invoice INV-26-4KQ8ZD is due Tuesday', body: 'Social media for October, ₦850,000. Pay with Paystack or Flutterwave in a minute.', meta: [{ k: 'Invoice', v: 'INV-26-4KQ8ZD' }, { k: 'Amount', v: '₦850,000' }, { k: 'Due', v: 'Tue 13 Oct' }], why: 'Paying on time keeps your posts scheduled without a pause.', primaryLabel: 'Open Billing', primaryFn: function () { window.location.href = 'C-Billing.dc.html'; }, secondaryLabel: 'Mark as read', sToast: 'Updated. It is marked as read.', sheet: self.sh({ eyebrow: 'Billing', title: a.name, icon: I.cash, body: a.sub, primary: 'Open Billing', secondary: 'Close', onPrimary: function () { window.location.href = 'C-Billing.dc.html'; } }) }];
  }
