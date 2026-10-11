  /* ======================= Client · Messages model ======================= */
  msgModel() {
    var self = this, I = this.icons();
    var sw = [{ c: '#1f4d3a', n: 'Leaf' }, { c: '#f1ece4', n: 'Linen' }, { c: '#2b2620', n: 'Bark' }, { c: '#c9a27a', n: 'Clay' }];
    var P = { ifeanyi: { who: 'Ifeanyi N.', i: 'IN', tone: '#000065' }, chiamaka: { who: 'Chiamaka A.', i: 'CA', tone: '#b84a00' }, funmi: { who: 'Funmi K.', i: 'FK', tone: '#15803d' }, bab: { who: 'Babatope A.', i: 'BA', tone: '#000065' } };
    var m = function (p, text, when, o) { return Object.assign({ who: p.who, i: p.i, tone: p.tone, text: text, when: when, kind: 'text' }, o || {}); };
    var mine = function (text, when, o) { return Object.assign({ mine: true, who: 'Adaeze O.', i: 'AO', tone: '#1f4d3a', text: text, when: when, kind: 'text' }, o || {}); };
    var ev = function (text, when) { return { kind: 'event', text: text, when: when }; };
    var F = { logo: { name: 'Logo round 2.pdf', ext: 'PDF', size: '4.2 MB', when: '1 Oct', project: 'Brand identity', view: 'palette', swatches: sw, by: 'Ifeanyi N.', tone: 'var(--ad-tone-bad)' }, ig: { name: 'Instagram access guide.pdf', ext: 'PDF', size: '420 KB', when: '7 Oct', project: 'Social media', view: 'doc', ref: 'IG-GUIDE', docTitle: 'Instagram access guide', tone: 'var(--ad-tone-bad)' }, inv: { name: 'Invoice INV-26-9QX4LM.pdf', ext: 'PDF', size: '190 KB', when: '7 Oct', project: 'Billing', view: 'doc', ref: 'INV-26-9QX4LM', docTitle: 'Invoice · ₦450,000', tone: 'var(--ad-tone-bad)' }, photos: { name: 'Product photos.zip', ext: 'ZIP', size: '38 MB', when: '2 Oct', project: 'Brand identity', view: 'doc', ref: 'PHOTOS', docTitle: 'Product photos', tone: 'var(--ad-tone-live)' }, cols: { name: 'Colours I like.pdf', ext: 'PDF', size: '1.1 MB', when: 'Today', project: 'Brand identity', view: 'doc', ref: 'COLOURS', docTitle: 'Colours I like', tone: 'var(--ad-tone-bad)' } };
    var convs = [
      { id: 'ifeanyi', name: 'Ifeanyi N.', i: 'IN', tone: '#000065', sub: 'Brand identity · your logo', kind: 'team', unread: 1,
        ctx: [{ t: 'Brand identity', icon: 'folder', tag: 'Waiting on you', tone: 'warn', href: 'C-Projects.dc.html?p=mira-br' }, { t: 'Logo round 2', icon: 'eye', fn: function () { self.openFile(self.fileSpec(F.logo)); } }],
        menu: [{ t: 'Open the project', icon: 'folder', fn: function () { window.location.href = 'C-Projects.dc.html?p=mira-br'; } }],
        quick: ['I will choose tonight.', 'Can we talk it through for ten minutes?', 'Thank you, this is helpful.'],
        msgs: [ev('Logo round 2 sent', '1 Oct'), m(P.ifeanyi, 'Hi Adaeze, round 2 is in your portal: two routes, a wordmark and a monogram. Tell us which feels closer to Mira.', '1 Oct, 10:12', { file: F.logo }), mine('Thank you! I am travelling this week, so I will look properly on Sunday.', '2 Oct, 19:30'), m(P.bab, 'No rush. Round 2 is the last included round, so pick the one you like most and we will polish it.', '5 Oct, 09:05'), mine('Hi, I will look at the routes tonight. Can you send the link again?', 'Yesterday, 18:40'), mine('Also, do you still need my Instagram login for the posts?', 'Yesterday, 18:41'), m(P.ifeanyi, 'Of course. Here is the review link again, and both routes open fine on a phone. Chiamaka will answer the Instagram question in her thread.', 'Today, 08:20')] },
      { id: 'chiamaka', name: 'Chiamaka A.', i: 'CA', tone: '#b84a00', sub: 'Social media', kind: 'team', unread: 1,
        ctx: [{ t: 'Social media management', icon: 'folder', tag: 'Starts 1 Nov', tone: 'brand', href: 'C-Projects.dc.html?p=mira-so' }, { t: 'Instagram access guide', icon: 'key', fn: function () { self.openFile(self.fileSpec(F.ig)); } }],
        menu: [{ t: 'Open the project', icon: 'folder', fn: function () { window.location.href = 'C-Projects.dc.html?p=mira-so'; } }],
        quick: ['Done, you should have access now.', 'Can we do it together on a call?', 'Which step is the hardest?'],
        msgs: [m(P.chiamaka, 'Hi Adaeze, to schedule your launch posts I need Instagram partner access. It takes two minutes and the guide has every click.', '7 Oct, 10:00', { file: F.ig }), ev('Reminder sent', '9 Oct'), m(P.chiamaka, 'A quick reminder about Instagram access. Without it I cannot schedule the five launch posts that are with you for approval. Happy to do it together on a call.', 'Today, 09:00')] },
      { id: 'funmi', name: 'Funmi K.', i: 'FK', tone: '#15803d', sub: 'Billing', kind: 'team', unread: 0,
        ctx: [{ t: 'INV-26-9QX4LM', icon: 'file', tag: 'Due Wed', tone: 'warn', href: 'C-Billing.dc.html' }],
        menu: [{ t: 'Open Billing', icon: 'wallet', fn: function () { window.location.href = 'C-Billing.dc.html'; } }],
        quick: ['I will pay today.', 'Can you resend the invoice?', 'Could I pay in two parts?'],
        msgs: [m(P.funmi, 'Hi Adaeze, your deposit invoice INV-26-9QX4LM for ₦450,000 is in Billing. Pay by Wednesday 14 October with Paystack or Flutterwave, and your receipt arrives straight away.', '7 Oct, 11:30', { file: F.inv })] }
    ];
    var rec = function (id, name, sub, p) { return { conv: id, name: name, sub: sub, i: p.i, tone: p.tone, kind: 'team' }; };
    return {
      role: 'client', settingsHref: 'C-Settings.dc.html', navBase: { Billing: { n: 1, tone: 'var(--ad-tone-warn)' } }, convs: convs, files: [F.photos, F.cols, F.inv],
      filters: [['all', 'All'], ['unread', 'Unread']], vis: false, clientLabel: 'Client sees it',
      newTitle: 'Who do you want to ask?', newBody: 'Your message reaches them in the portal and by email. They reply within one working day.', newList: 'Your team',
      recipients: [rec('ifeanyi', 'Ifeanyi N.', 'Your logo and brand', P.ifeanyi), rec('chiamaka', 'Chiamaka A.', 'Social media', P.chiamaka), rec('funmi', 'Funmi K.', 'Invoices and payments', P.funmi), rec(null, 'Babatope A. (Admin)', 'Anything else, or something is wrong', P.bab)],
      tourList: 'Everyone working on your projects, in one list. Unread ones carry a count.', tourThread: 'Reply here, attach a file, or tap a chip above to open the project or the invoice. We reply within one working day.', tourNew: 'Ask your team anything. Your message arrives in their portal and by email.',
      waiting: function (s, all) { return 'We reply within 1 working day.'; }
    };
  }
