  /* ======================= Client · Support model ======================= */
  supModel() {
    var self = this, I = this.icons(), f = function (t, when) { return { t: t, when: when }; };
    var tickets = [
      { id: 'T-1041', subject: 'Can posts be approved on WhatsApp?', kind: 'Question', from: 'You', org: 'Mira Skincare', about: 'Social media', status: 'wait', updated: 'Yesterday', feed: [f('You asked: “Can I approve the posts by replying on WhatsApp instead of the portal?”', 'Yesterday, 14:10'), f('Admin replied with “Approve a post or a logo route”. Approving takes two taps in the app, and there is no WhatsApp route yet.', 'Yesterday, 15:02')] },
      { id: 'T-1029', subject: 'Add a billing contact', kind: 'Request', from: 'You', org: 'Mira Skincare', about: 'Billing', status: 'done', updated: '3 weeks ago', feed: [f('You asked to add Bola as a billing contact.', '3 weeks ago'), f('Bola T. was added and got an invite.', '3 weeks ago'), f('Marked resolved.', '3 weeks ago')] }
    ];
    var arts = this.kbClient();
    var slotSheet = function () {
      var slots = [['Wed 14 Oct, 10:00', 'Chiamaka or Ifeanyi · 15 minutes'], ['Thu 15 Oct, 14:00', 'Chiamaka or Ifeanyi · 15 minutes'], ['Fri 16 Oct, 11:00', 'Chiamaka or Ifeanyi · 15 minutes']];
      self.open(self.sh({ eyebrow: 'Quick call', title: 'Book a 15 minute call', icon: I.phone, body: 'A short Google Meet with the person who knows your project. Nothing to prepare.', listTitle: 'Times that suit the team', select: true, list: slots.map(function (x) { return { t: x[0], s: x[1] }; }), selectWhy: 'Choose a time.', primary: function (ctx) { return ctx.pick >= 0 ? 'Book ' + slots[ctx.pick][0] : 'Book the call'; }, secondary: 'Cancel', onPrimary: function (ctx) { self.say('Booked for ' + slots[ctx.pick][0] + '. The Google Meet link is in your email and calendar.'); } }));
    };
    return {
      role: 'client', settingsHref: 'C-Settings.dc.html', navBase: { Billing: { n: 1, tone: 'var(--ad-tone-warn)' }, Messages: { n: 2 } }, labels: { open: 'With us', wait: 'Waiting on you', done: 'Resolved' }, defaultTab: 'kb',
      tickets: tickets, articles: arts, hero: { title: 'How can we help?', body: 'Most questions already have an answer. If yours does not, ask us and we reply within one working day.', ph: 'Search the help articles', popular: ['a3', 'a6', 'a4', 'a8'] },
      newLabel: 'Ask a question', newTitle: 'Ask us', newBody: 'Tell us what is happening. You also get the answer by email, so you never have to check the portal.', newPh: 'For example: Where can I find my receipt?', newPrimary: 'Send to the team', newToast: 'We reply within 1 working day.', kinds: ['Question', 'Something is wrong', 'Request'],
      aboutLabel: 'About', aboutOpts: ['Brand identity', 'Social media', 'Billing', 'Something else'], aboutDefault: 'Something else', me: { name: 'You', org: 'Mira Skincare' },
      ticketsLabel: 'My tickets', kbLabel: 'Help articles', ticketsTitle: 'My tickets', kbTitle: 'Help articles',
      tourTable: 'Your questions to us, and the help articles. Tap a row to open it. Resolved ones can be reopened.', tourNew: 'Ask us anything. You get the answer here and by email.',
      lede: function (s, openN) { return [openN + (openN === 1 ? ' open ticket.' : ' open tickets.'), 'We reply within 1 working day.']; },
      chores: function (s, it, I2) { return [it('Message your team', I2.msg, function () { window.location.href = 'C-Messages.dc.html'; }), it('Book a quick call', I2.phone, function () { slotSheet(); }), it('Support notifications', I2.bell, function () { window.location.href = 'C-Settings.dc.html'; }, { hint: 'Settings' })]; },
      rail: function (s, tks, arts2) {
        return { statsTitle: '', stats: [], cards: [
          { title: 'Talk to us', sub: 'We reply within 1 working day', rows: [{ t: 'Message your team', s: 'The person working on it answers', d: I.msg, tone: 'var(--ad-tone-brand)', open: function () { window.location.href = 'C-Messages.dc.html'; } }, { t: 'Book a quick call', s: '15 minutes on Google Meet', d: I.phone, tone: 'var(--ad-tone-brand)', open: slotSheet }, { t: 'Ask a question', s: 'It becomes a ticket you can follow', d: I.life, tone: 'var(--ad-tone-brand)', open: function () { s.newTicketSheet(); } }] },
          { title: 'Good to know', rows: [{ t: 'Pay an invoice', s: 'Paystack or Flutterwave, no fee to you', d: I.card, tone: 'var(--ad-tone-brand)', open: function () { s.openArticle(arts2.filter(function (a) { return a.id === 'a3'; })[0]); } }, { t: 'Approve a post', s: 'Two taps, even without signing in', d: I.eye, tone: 'var(--ad-tone-brand)', open: function () { s.openArticle(arts2.filter(function (a) { return a.id === 'a6'; })[0]); } }] }
        ] };
      }
    };
  }
