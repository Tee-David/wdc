  /* ======================= Help articles: the knowledge base, its categories and what Admin has changed ======================= */
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

  /* what Admin sees: the client articles plus two drafts */
  kbAdmin() {
    var I = this.icons(), st = function (t, s) { return { t: t, s: s }; };
    return this.kbClient().concat([

      { id: 'd1', t: 'Match a bank transfer to an invoice', s: 'Draft for clients who pay by transfer in USD.', cat: 'Billing and payments', mins: '2 min read', d: I.cash, kw: 'bank transfer match reconcile usd dollars', draft: true, steps: [st('Pay into the USD account', 'The details are on the invoice.'), st('Use the invoice number as the reference', 'It lets us match it the same day.'), st('We email the receipt', 'Usually within one working day.')] },
      { id: 'd2', t: 'Switch an invoice to US dollars', s: 'Draft. Answers the most searched question that has no article yet.', cat: 'Billing and payments', mins: '1 min read', d: I.cash, kw: 'dollars usd currency invoice', draft: true, steps: [st('Ask us in Support', 'Dollar invoices are set up by Admin.'), st('Pay into the Sterling USD account', 'Paystack and Flutterwave are for naira.')] }
    ]);
  }
  /* categories are one shared list, edited in Settings and used by the help centre, new articles and filters */
  helpCats() { return this.state.hc || this.helpCatsDefault(); }
  setHelpCats(list) { this.setState({ hc: list, ra: (this.state.ra || 0) + 1 }); this.setShared('helpCats', list); }
  /* the article list after Admin's edits: moves, publishing, trash and new articles */
  kbEdited(base) {
    var ov = this.state.ha || {}, news = (this.state.hn || []);
    return news.concat(base).map(function (a) { return ov[a.id] ? Object.assign({}, a, ov[a.id]) : a; }).filter(function (a) { return !a.gone; });
  }
  setArt(id, patch) { var o = Object.assign({}, this.state.ha); o[id] = Object.assign({}, o[id] || {}, patch); this.setState({ ha: o, ra: (this.state.ra || 0) + 1 }); this.setShared('helpArts', o); }
  addArt(a) { var n = [a].concat(this.state.hn || []); this.setState({ hn: n, ra: (this.state.ra || 0) + 1 }); this.setShared('helpNew', n); }
  kbBody(a) { return (a.steps || []).map(function (x, i) { return (i + 1) + '. ' + x.t + (x.s ? ': ' + x.s : ''); }).join('\n'); }
  kbSteps(body) {
    var lines = String(body || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean), out = [];
    lines.forEach(function (l) { var m = /^\d+\.\s+(.+)$/.exec(l) || /^[-*]\s+(.+)$/.exec(l), t = m ? m[1] : l, i = t.indexOf(': '); out.push(i > 0 ? { t: t.slice(0, i), s: t.slice(i + 2) } : { t: t, s: '' }); });
    return out;
  }
  /* write or edit a help article: the same editor as the blog, a category from the shared list (or a new one), draft or publish */
  openArticleEditor(a, titleHint) {
    var self = this, I = this.icons(), cats = this.helpCats().map(function (c) { return c.name; });
    var start = a ? { title: a.t, sum: a.s, body: this.kbBody(a), kw: a.kw || '', cat: a.cat, newcat: '', when: a.draft ? 'Save as draft' : 'Publish now' } : { title: titleHint || '', sum: '', body: '', kw: (titleHint || '').toLowerCase(), cat: '', newcat: '', when: 'Save as draft' };
    this.open(this.sh({ wide: true, xl: true, eyebrow: a ? 'Edit article' : 'New article', title: a ? a.t : 'Write a help article', icon: I.file, keepOpen: true, focus: 'f-title',
      body: 'Write the steps a client would follow, one per line, numbered. Short sentences, plain words. It stays a draft until you publish it.',
      guard: function (ctx) { var f = ctx.form; return ['title', 'sum', 'body'].some(function (k) { return (f[k] || '') !== (start[k] || ''); }); }, guardBody: 'The article is not saved yet. If you close now, what you wrote here is lost.',
      form: start,
      fields: [{ key: 'title', label: 'Title', ph: 'How to change my domain', wide: true }, { key: 'sum', label: 'One line summary', ph: 'What the reader will be able to do', wide: true }, { key: 'body', type: 'editor', label: 'The steps', ph: '1. Open Settings\n2. Tap the thing\n3. Done', hint: 'Number the steps. Add “: and the detail” after a step to give it a second line.' }, { key: 'kw', label: 'Words people search for', ph: 'domain change transfer dns', wide: true, hint: 'Search finds an article by these as well as by its title.' }, { key: 'newcat', label: 'Or a new category', ph: 'For example: Domains and email', wide: true, hint: 'Leave empty to use the one chosen above. A new category is added to the list in Settings, Help centre.', check: function (v) { return v.trim() && cats.some(function (c) { return c.toLowerCase() === v.trim().toLowerCase(); }) ? 'That category already exists. Choose it above.' : ''; } }],
      chipSets: [{ key: 'cat', label: 'Category', opts: cats }, { key: 'when', label: 'What now?', opts: ['Save as draft', 'Publish now'] }],
      notice: function (ctx) { var f = ctx.form, n = self.kbSteps(f.body).length; return { tone: n >= 2 && (f.sum || '').trim() ? 'var(--ad-tone-good)' : 'var(--ad-tone-warn)', icon: n >= 2 ? I.check : I.alert, title: n + (n === 1 ? ' step' : ' steps'), body: n < 2 ? 'Most articles read best with three to six steps.' : 'It reads as ' + Math.max(1, Math.round(n / 2)) + ' min read.' }; },
      primary: function (ctx) { return ctx.form.when === 'Publish now' ? 'Publish article' : 'Save draft'; }, secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form, nc = (f.newcat || '').trim(); if (!(f.title || '').trim()) return 'Add a title.'; if (!(f.sum || '').trim()) return 'Add a one line summary.'; if (!f.cat && !nc) return 'Choose a category or name a new one.'; if (nc && cats.some(function (c) { return c.toLowerCase() === nc.toLowerCase(); })) return 'That category already exists. Choose it above.'; if (f.when === 'Publish now' && self.kbSteps(f.body).length < 2) return 'Write at least two steps before it is published.'; return ''; },
      onPrimary: function (ctx) {
        var f = ctx.form, nc = (f.newcat || '').trim(), cat = nc || f.cat, steps = self.kbSteps(f.body);
        if (nc) self.setHelpCats(self.helpCats().concat([{ id: 'c' + Date.now(), name: nc, desc: '', visible: true }]));
        var draft = f.when !== 'Publish now', patch = { t: f.title.trim(), s: f.sum.trim(), cat: cat, kw: (f.kw || '').toLowerCase(), draft: draft, steps: steps.length ? steps : [{ t: 'Add the steps', s: '' }], mins: Math.max(1, Math.round(steps.length / 2)) + ' min read' };
        self.setState({ sheet: null, stack: [] });
        if (a) self.setArt(a.id, patch); else self.addArt(Object.assign({ id: 'n' + Date.now(), d: I.file }, patch));
        self.setState({ stab: 'kb', schip: 'all', spage: 0, ra: self.state.ra + 1 });
        self.say(draft ? 'Saved. “' + patch.t + '” is a draft in the Knowledge base.' : 'Published. “' + patch.t + '” is live for clients in ' + cat + '.');
      } }));
  }
  renameCat(from, to) { var self = this, o = Object.assign({}, this.state.ha); this.kbEdited(this.kbAdmin()).forEach(function (a) { if (a.cat === from) o[a.id] = Object.assign({}, o[a.id] || {}, { cat: to }); }); this.setState({ ha: o }); this.setShared('helpArts', o); }
  moveArts(ids, cat) { var o = Object.assign({}, this.state.ha); ids.forEach(function (id) { o[id] = Object.assign({}, o[id] || {}, { cat: cat }); }); this.setState({ ha: o, ra: (this.state.ra || 0) + 1 }); this.setShared('helpArts', o); }
  patchArts(ids, patch) { var o = Object.assign({}, this.state.ha); ids.forEach(function (id) { o[id] = Object.assign({}, o[id] || {}, patch); }); this.setState({ ha: o, ra: (this.state.ra || 0) + 1 }); this.setShared('helpArts', o); }
  catSheet(c) {
    var self = this, I = this.icons(), cats = this.helpCats();
    this.open(this.sh({ eyebrow: 'Help centre', title: c ? 'Edit ' + c.name : 'New category', icon: I.life, body: 'Categories group the articles clients browse. The order here is the order they see.', focus: 'f-name',
      form: { name: c ? c.name : '', desc: c ? c.desc : '', vis: !c || c.visible ? 'Shown to clients' : 'Hidden from clients' },
      fields: [{ key: 'name', label: 'Name', ph: 'Domains and email', wide: true, check: function (v) { v = v.trim(); if (v.length > 32) return 'Keep it under 32 characters.'; return v && cats.some(function (x) { return x.name.toLowerCase() === v.toLowerCase() && (!c || x.id !== c.id); }) ? 'That category already exists.' : ''; } }, { key: 'desc', label: 'One line about it', ph: 'What clients find here', type: 'area', wide: true }],
      chipSets: [{ key: 'vis', label: 'Visibility', opts: ['Shown to clients', 'Hidden from clients'], hint: 'A hidden category and its articles stay in Settings and are not shown in the client help centre.' }],
      primary: c ? 'Save changes' : 'Add the category', secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form, v = (f.name || '').trim(); if (!v) return 'Name the category.'; if (cats.some(function (x) { return x.name.toLowerCase() === v.toLowerCase() && (!c || x.id !== c.id); })) return 'That category already exists.'; return ''; },
      onPrimary: function (ctx) { var f = ctx.form, name = f.name.trim(), vis = f.vis === 'Shown to clients'; if (c) { if (c.name !== name) self.renameCat(c.name, name); self.setHelpCats(cats.map(function (x) { return x.id === c.id ? Object.assign({}, x, { name: name, desc: (f.desc || '').trim(), visible: vis }) : x; })); self.say('Updated. ' + name + ' is saved.'); } else { self.setHelpCats(cats.concat([{ id: 'c' + Date.now(), name: name, desc: (f.desc || '').trim(), visible: vis }])); self.say('Saved. ' + name + ' is at the end of the list. Move it up from its menu.'); } } }));
  }
