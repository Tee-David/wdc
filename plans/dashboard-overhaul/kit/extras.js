
  /* ======================= kit extras: the sheets that do real work (file preview, post review, payment, follow up, quote) ======================= */
  extraState() { return { payStage: 'choose', payProv: 'paystack', payOut: 'ok', payStep: 0, fuWhen: 1, fuHow: 1, fuWho: 0, qtOn: {}, qtQty: {}, qtVat: true, okPosts: {}, askedPosts: {} }; }

  /* A file opens as a real preview with zoom, print and download. */
  openFile(f, push) {
    var self = this, I = this.icons();
    this.open(this.sh({ kind: 'file', wide: true, eyebrow: 'File · ' + (f.project || 'Library'), title: f.name, chip: f.fresh ? 'New' : '', tone: 'var(--ad-tone-live)', icon: I.file, iconTone: f.tone || 'var(--ad-tone-brand)', file: f,
      rows: [{ k: 'Added', v: f.when }, { k: 'Size', v: f.size }, { k: 'By', v: f.by || 'The studio' }],
      primary: 'Download', secondary: 'Ask about this file',
      onPrimary: function () { self.say('Downloading ' + f.name + ' (' + f.size + ')'); },
      onSecondary: function () { self.ask({ eyebrow: 'Message', title: 'Ask about ' + f.name, body: 'It goes to the person who shared the file, with the file attached.', input: true, inputLabel: 'Your question', inputPh: 'For example: can we see the leaf a little thinner?', ok: 'Send question', back: true, okToast: 'Sent. Replies come to Messages and your email.', icon: I.msg }, true); return 'stay'; } }), push);
  }
  /* A post opens as it will look on the platform, with comments, changes and approval. */
  openPost(p, mode, push) {
    var self = this, I = this.icons();
    var client = mode === 'client';
    this.open(this.sh({ kind: 'post', eyebrow: p.client + ' · ' + p.platform + ' · ' + p.when, title: p.title, chip: this.postStatus(p).label, tone: this.postStatus(p).tone, post: p, focus: 'cmtIn',
      primary: function (ctx, s) { return s.okPosts[p.id] ? 'Approved' : (client ? 'Approve this post' : (s.askedPosts[p.id] || p.status === 'With client' ? 'Send a reminder' : 'Send for approval')); },
      primaryDis: function (ctx, s) { return s.okPosts[p.id] ? (client ? 'You approved this post. It goes out ' + p.when + '.' : 'The client approved it.') : ''; },
      secondary: client ? 'Request changes' : (p.editFn ? 'Edit post' : 'Close'), keepOpen: true,
      onPrimary: function () {
        if (client) self.ask({ eyebrow: 'Approve', title: 'Approve "' + p.title + '"?', body: 'It goes out on ' + p.platform + ' on ' + p.when + ' exactly as you see it. You can still pull it until an hour before.', ok: 'Approve post', back: true, green: true, icon: I.check, tone: 'var(--ad-tone-good)', onOk: function () { var o = Object.assign({}, self.state.okPosts); o[p.id] = true; self.setState({ okPosts: o }); self.say('Approved. It goes out ' + p.when + '.', { undo: function () { var u = Object.assign({}, self.state.okPosts); delete u[p.id]; self.setState({ okPosts: u }); } }); } }, true);
        else if (self.state.askedPosts[p.id] || p.status === 'With client') { self.closeSheet(); self.say('Reminder sent to ' + p.client + ' with a one-tap approval link.', { delay: 8, pending: function (n) { return 'Sending the reminder in ' + n + 's'; } }); }
        else self.ask({ eyebrow: 'Send for approval', title: 'Send "' + p.title + '" to ' + p.client + '?', body: 'They get an email and a portal notice. They see this version only.', ok: 'Send for approval', icon: I.send, onOk: function () { var o = Object.assign({}, self.state.askedPosts); o[p.id] = true; self.setState({ askedPosts: o }); self.closeSheet(); self.say('Sent to ' + p.client + ' for approval.'); } }, true);
      },
      onSecondary: function () {
        if (!client) { if (p.editFn) p.editFn(); else self.closeSheet(); return 'stay'; }
        self.ask({ eyebrow: 'Request changes', title: 'What should change on "' + p.title + '"?', body: 'Chiamaka gets your note with the post. Changes to a post do not use a revision.', input: true, inputLabel: 'Your note', inputPh: 'For example: use the photo with the pink bottle', ok: 'Send to Chiamaka', back: true, icon: I.msg, onOk: function (txt) { self.addComment(p.id, txt); self.say('Sent. Chiamaka replies here and by email.'); } }, true);
        return 'stay';
      } }), push);
  }
  postStatus(p) { var s = this.state; if (s.okPosts[p.id]) return { label: 'Approved', tone: 'var(--ad-tone-good)' }; if (s.askedPosts[p.id]) return { label: 'With client', tone: 'var(--ad-tone-live)' }; return { label: p.status || 'Needs approval', tone: p.statusTone || 'var(--ad-tone-warn)' }; }
  addComment(id, text) { var c = Object.assign({}, this.state.comments), list = (c[id] || []).concat([{ who: this.me().name.split(' ')[0], i: this.me().i, tone: this.me().tone, when: 'Just now', t: text }]); c[id] = list; this.setState({ comments: c, cmt: '' }); }

  /* Paystack and Flutterwave only. Choose, initialise, confirm, then the receipt rolls out; a failure offers the other provider or help. */
  openPay(inv, onPaid) {
    var self = this, I = this.icons();
    var other = function (k) { return k === 'paystack' ? 'flutterwave' : 'paystack'; };
    this.setState({ payStage: 'choose', payStep: 0 });
    this.open(this.sh({ kind: 'pay', eyebrow: 'Invoice ' + inv.no, title: 'Pay ' + inv.amount, chip: function (c, s) { return s.payStage === 'success' ? 'Paid' : inv.due; }, tone: function (c, s) { return s.payStage === 'success' ? 'var(--ad-tone-good)' : 'var(--ad-tone-warn)'; }, pay: inv, keepOpen: true,
      primary: function (ctx, s) { var n = self.provName(s.payProv); return ({ choose: 'Pay ' + inv.amount + ' with ' + n, loading: 'Waiting for ' + n, success: 'Done', failed: 'Try ' + n + ' again' })[s.payStage]; },
      primaryDis: function (ctx, s) { return s.payStage === 'loading' ? 'Keep this open. If you close it we still check, and email you the result.' : ''; },
      secondary: function (c, s) { return s.payStage === 'success' ? 'Download receipt' : 'Download invoice PDF'; },
      onPrimary: function () {
        var s = self.state;
        if (s.payStage === 'success') { self.closeSheet(); if (onPaid) onPaid(s.payProv); return; }
        self.setState({ payStage: 'loading', payStep: 0 });
        var t = self.reduce ? 150 : 750;
        setTimeout(function () { self.setState({ payStep: 1 }); }, t);
        setTimeout(function () { self.setState({ payStep: 2 }); }, t * 2);
        setTimeout(function () { var ok = self.state.payOut === 'ok'; self.setState({ payStage: ok ? 'success' : 'failed', payStep: 3 }); if (ok) self.confetti(); }, t * 3);
      },
      onSecondary: function () { var s = self.state; self.say(s.payStage === 'success' ? 'Receipt ' + inv.receipt + ' downloaded' : 'Invoice ' + inv.no + ' PDF downloaded'); return 'stay'; },
      switchProvider: function () { self.setState({ payProv: other(self.state.payProv), payStage: 'choose' }); },
      support: function () { self.ask({ eyebrow: 'Billing help', title: 'Tell us what happened', body: 'Funmi in finance replies within a working day. We attach the invoice and the provider’s answer for you.', input: true, inputLabel: 'Message', inputPh: 'For example: my card works elsewhere, can I pay in two parts?', ok: 'Send to billing', back: true, icon: I.msg, okToast: 'Sent. Funmi replies within a working day.' }, true); }
    }));
  }
  provName(k) { return k === 'flutterwave' ? 'Flutterwave' : 'Paystack'; }

  /* Set follow up asks when, how and who; the follow up becomes a dated item on that person's Today. */
  openFollow(lead, onSet) {
    var self = this, I = this.icons();
    this.setState({ fuWhen: 1, fuHow: 1, fuWho: 0 });
    this.open(this.sh({ kind: 'follow', eyebrow: 'Follow up · ' + lead.name, title: 'When should we follow up?', icon: I.clock, iconTone: 'var(--ad-tone-live)', fu: lead, focus: 'shPrimary',
      primary: function (ctx, s) { return 'Set for ' + lead.whens[s.fuWhen][0]; }, secondary: 'Cancel',
      onPrimary: function () { var s = self.state, w = lead.whens[s.fuWhen], h = ['Call', 'WhatsApp', 'Email'][s.fuHow], who = lead.whos[s.fuWho]; if (onSet) onSet(w, h, who, (s.draft || '').trim()); } }));
  }

  /* Draft quote opens the real quote: lines from the price list, quantities, VAT at 7.5%, the 50% deposit, and a fit check against the budget. */
  openQuote(q, onSent) {
    var self = this, I = this.icons(), on = {}, qty = {};
    q.lines.forEach(function (l, i) { on[i] = !!l.on; qty[i] = l.qty || 1; });
    this.setState({ qtOn: on, qtQty: qty, qtVat: true });
    this.open(this.sh({ kind: 'quote', wide: true, eyebrow: 'New quote · ' + q.client, title: q.title, chip: 'Draft', tone: 'var(--ad-tone-neutral)', icon: I.quote, quote: q, focus: 'shPrimary',
      primary: 'Review and send', secondary: 'Save as draft', keepOpen: true,
      primaryDis: function () { return self.quoteTotals(q).sub ? '' : 'Add at least one line to send a quote.'; },
      onPrimary: function () { var T = self.quoteTotals(q); self.ask({ eyebrow: 'Send quote', title: 'Send ' + self.ngn(T.total) + ' quote to ' + q.client + '?', body: 'It stays valid for 14 days. When they accept, the deposit invoice is created for you.', to: q.to, subject: 'Your quote from WDC: ' + q.title, preview: 'Hello ' + q.contact + ',\n' + T.lines.map(function (l) { return l.t + (l.qty > 1 ? ' × ' + l.qty : '') + ': ' + self.ngn(l.total); }).join('\n') + '\nTotal ' + self.ngn(T.total) + (self.state.qtVat ? ' including VAT' : '') + '. Deposit to start: ' + self.ngn(T.total / 2) + '.', ok: 'Send quote', icon: I.send, onOk: function () { self.setState({ sheet: null, stack: [] }); if (onSent) onSent(T); } }, true); },
      onSecondary: function () { self.closeSheet(); self.say('Draft saved in Money, Quotes. Nothing was sent.'); return 'stay'; } }));
  }
  quoteTotals(q) {
    var s = this.state, lines = [];
    q.lines.forEach(function (l, i) { if (s.qtOn[i]) lines.push({ t: l.t, qty: s.qtQty[i] || 1, total: l.price * (s.qtQty[i] || 1) }); });
    var sub = lines.reduce(function (a, l) { return a + l.total; }, 0), vat = s.qtVat ? Math.round(sub * 0.075) : 0;
    return { lines: lines, sub: sub, vat: vat, total: sub + vat };
  }

  /* The values the sheet template reads for these kinds. */
  extraVals() {
    var s = this.state, self = this, raw = s.sheet || {}, out = {};
    var f = raw.file || {};
    out.file = { isDoc: f.view === 'doc', isPalette: f.view === 'palette', isArt: f.view === 'art', ref: f.ref || '', docTitle: f.docTitle || f.name, lines: ['92%', '78%', '86%', '60%', '88%', '70%', '82%', '54%'], pageCount: f.pageCount || 1, pages: (f.pageCount || 1) + (f.pageCount > 1 ? ' pages' : ' page'), swatches: f.swatches || [], bg: f.bg || '#000065', fg: f.fg || '#fff', mark: f.mark || '' };
    out.zoom = s.zoom; out.zoomLabel = Math.round(s.zoom * 100) + '%';
    out.zoomIn = function () { self.setState({ zoom: Math.min(2, Math.round((self.state.zoom + 0.25) * 100) / 100) }); };
    out.zoomOut = function () { self.setState({ zoom: Math.max(0.5, Math.round((self.state.zoom - 0.25) * 100) / 100) }); };
    out.printFile = function () { self.say('The print dialog opens with ' + (f.name || 'the file') + ' at full size.'); };
    out.downloadFile = function () { self.say('Downloading ' + (f.name || 'the file')); };

    var p = raw.post || {}, base = p.comments || [], mine = (s.comments[p.id] || []);
    out.post = Object.assign({}, p, { comments: base.concat(mine), noComments: !base.length && !mine.length, cmtNote: p.cmtNote || 'Everyone on this project sees comments here.', pd: p.logo ? p.logo.d : '', pc: p.logo ? p.logo.c : '#000' });
    out.cmt = s.cmt || ''; out.onCmt = function (e) { self.setState({ cmt: e.target.value }); }; out.cmtDis = !(s.cmt || '').trim();
    out.sendCmt = function () { var t = (self.state.cmt || '').trim(); if (!t || !p.id) return; self.addComment(p.id, t); self.say('Comment added. ' + (p.owner || 'The team') + ' gets a notice.'); };

    var inv = raw.pay || {}, prov = s.payProv, P = this.payLogos ? this.payLogos() : {};
    var provs = [['paystack', 'Paystack', 'Card, bank app, USSD or bank transfer through Paystack'], ['flutterwave', 'Flutterwave', 'Card, bank app or mobile money through Flutterwave']];
    out.pay = { choose: s.payStage === 'choose', loading: s.payStage === 'loading', success: s.payStage === 'success', failed: s.payStage === 'failed', amount: inv.amount || '', forLabel: inv.forLabel || '', receiptNo: inv.receipt || '', providerName: this.provName(prov), otherName: this.provName(prov === 'paystack' ? 'flutterwave' : 'paystack'), logo: P[prov] || '',
      providers: provs.map(function (v) { var on = prov === v[0]; return { name: v[1], sub: v[2], logo: P[v[0]] || '', cls: on ? 'on' : '', checked: on ? 'true' : 'false', pick: function () { self.setState({ payProv: v[0] }); } }; }),
      steps: ['Creating a secure payment', 'Opening ' + this.provName(prov), 'Waiting for ' + this.provName(prov) + ' to confirm'].map(function (t, i) { var done = s.payStep > i, cur = s.payStep === i; return { t: t, done: done, cls: done ? 'on' : '', col: done || cur ? 'var(--ad-ink)' : 'var(--ad-dim)' }; }),
      outI: s.payOut === 'ok' ? 0 : 1, okCls: s.payOut === 'ok' ? 'on' : '', failCls: s.payOut === 'fail' ? 'on' : '', setOk: function () { self.setState({ payOut: 'ok' }); }, setFail: function () { self.setState({ payOut: 'fail' }); },
      switchProvider: raw.switchProvider || function () {}, support: raw.support || function () {} };
    out.askUsd = function () { self.ask({ eyebrow: 'Billing', title: 'Ask for a USD invoice?', body: 'Finance reissues it in US dollars at today’s rate and cancels the Naira one. You get it by email within a working day.', ok: 'Ask for USD', back: true, okToast: 'Asked. The USD invoice comes by email.', icon: self.icons().cash }, true); };

    var lead = raw.fu || { whens: [], whos: [], name: '' };
    out.fu = { whoName: lead.whos.length ? lead.whos[s.fuWho].t : '', howI: s.fuHow,
      whens: lead.whens.map(function (w, i) { var on = s.fuWhen === i; return { t: w[0], cls: on ? 'on' : '', checked: on ? 'true' : 'false', pick: function () { self.setState({ fuWhen: i }); } }; }),
      hows: ['Call', 'WhatsApp', 'Email'].map(function (h, i) { var on = s.fuHow === i; return { t: h, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ fuHow: i }); } }; }),
      whos: lead.whos.map(function (w, i) { var on = s.fuWho === i; return Object.assign({}, w, { cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ fuWho: i }); } }); }) };

    var q = raw.quote || { lines: [] }, T = this.quoteTotals(q);
    out.qt = { vat: s.qtVat, vatCls: s.qtVat ? 'on' : '', toggleVat: function () { self.setState({ qtVat: !self.state.qtVat }); },
      sub: this.ngn(T.sub), vatAmt: this.ngn(T.vat), total: this.ngn(T.total), deposit: this.ngn(T.total / 2),
      fit: !q.budget ? '' : (T.total < q.budget[0] ? 'Under their budget of ' + this.short(q.budget[0]) + ' to ' + this.short(q.budget[1]) + '. Room to add hosting or rush delivery.' : (T.total > q.budget[1] ? 'Over their top budget of ' + this.short(q.budget[1]) + ' by ' + this.ngn(T.total - q.budget[1]) + '.' : 'Inside their budget of ' + this.short(q.budget[0]) + ' to ' + this.short(q.budget[1]) + '.')),
      fitCol: !q.budget ? 'var(--ad-dim)' : (T.total > q.budget[1] ? 'var(--ad-bad-ink)' : 'var(--ad-tone-good)'),
      lines: q.lines.map(function (l, i) { var on = !!s.qtOn[i], n = s.qtQty[i] || 1; return { t: l.t, s: l.s + ' · ' + self.ngn(l.price) + (l.unit ? ' ' + l.unit : ''), on: on, cls: on ? '' : 'off', boxCls: on ? 'on' : '', checked: on ? 'true' : 'false', aria: 'Include ' + l.t, qty: n, total: on ? self.ngn(l.price * n) : '—',
        toggle: function () { var o = Object.assign({}, self.state.qtOn); o[i] = !on; self.setState({ qtOn: o }); },
        dec: function () { var o = Object.assign({}, self.state.qtQty); o[i] = Math.max(1, n - 1); self.setState({ qtQty: o }); },
        inc: function () { var o = Object.assign({}, self.state.qtQty), m = Object.assign({}, self.state.qtOn); o[i] = Math.min(l.max || 20, n + 1); m[i] = true; self.setState({ qtQty: o, qtOn: m }); } }; }) };
    return out;
  }
