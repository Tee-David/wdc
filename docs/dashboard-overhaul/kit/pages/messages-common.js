  /* ======================= Messages (shared by all roles, driven by this.msgModel()) ======================= */
  pageState() { return { conv: null, mfilter: 'all', mq: '', mpage: 0, mper: 5, ra: 0, mread: {}, munread: {}, sent: {}, mvis: 'client', thread: false, newConvs: [], muted: {}, archived: {}, mdraft: '' }; }
  pageName() { return 'Messages'; }
  tourSteps() {
    var I = this.icons(), M = this.msgModel();
    return [
      { target: 'list', title: 'Every conversation in one list', icon: I.msg, body: M.tourList, hint: 'Filter by who it is with. Unread ones carry a count.' },
      { target: 'thread', title: 'Reply without leaving the page', icon: I.send, body: M.tourThread, hint: 'Ctrl Enter sends.' },
      { target: 'new', title: 'Start a conversation', icon: I.plus, body: M.tourNew }
    ];
  }
  navCounts() { var M = this.msgModel(), c = Object.assign({}, M.navBase), n = this.msgUnreadTotal(); c.Messages = n ? { n: n } : { n: 0 }; return c; }
  msgAll() {
    var s = this.state, M = this.msgModel();
    return s.newConvs.concat(M.convs).filter(function (c) { return !s.archived[c.id]; }).map(function (c) { return Object.assign({}, c, { msgs: c.msgs.concat(s.sent[c.id] || []) }); });
  }
  msgUnread(c) { var s = this.state; return s.munread[c.id] || (s.mread[c.id] ? 0 : (c.unread || 0)); }
  msgUnreadTotal() { var self = this; return this.msgAll().reduce(function (a, c) { return a + self.msgUnread(c); }, 0); }
  msgLast(c) { var l = c.msgs.filter(function (m) { return m.kind !== 'event'; }).slice(-1)[0]; return l ? ((l.mine ? 'You: ' : (c.kind === 'team' && c.group ? l.who.split(' ')[0] + ': ' : '')) + (l.kind === 'note' ? 'Team note: ' : '') + (l.text || (l.file ? l.file.name : ''))) : 'No messages yet'; }
  msgWhen(c) { var l = c.msgs.slice(-1)[0]; return l ? l.when : ''; }
  msgFilterIn(c, f) { return f === 'all' || (f === 'unread' ? this.msgUnread(c) > 0 : c.kind === f); }
  msgOpen(id) { var m = Object.assign({}, this.state.mread), u = Object.assign({}, this.state.munread); m[id] = true; delete u[id]; this.setState({ conv: id, thread: true, mread: m, munread: u, mdraft: '', ra: this.state.ra + 1 }); }
  msgAppend(id, msg) { var s = Object.assign({}, this.state.sent); s[id] = (s[id] || []).concat([msg]); var m = Object.assign({}, this.state.mread), u = Object.assign({}, this.state.munread); m[id] = true; delete u[id]; this.setState({ sent: s, mread: m, munread: u, mdraft: '', ra: this.state.ra + 1 }); }
  msgNew(conv) { return { who: this.me().name, i: this.me().i, tone: this.me().tone, mine: true }; }
  sendMsg() {
    var self = this, s = this.state, M = this.msgModel(), all = this.msgAll();
    var c = all.filter(function (x) { return x.id === s.conv; })[0] || all[0]; if (!c) return;
    var el = document.getElementById('msgIn'), text = ((el ? el.value : s.mdraft) || '').trim();
    if (!text) { this.say('Write a message first.'); return; }
    var team = M.vis && c.kind === 'client' && s.mvis === 'team', first = c.name.split(' ')[0];
    this.msgAppend(c.id, Object.assign(this.msgNew(c), { text: text, when: 'Just now', kind: team ? 'note' : 'text', status: team ? 'Saved as a team note. ' + first + ' does not see it.' : (c.kind === 'client' && M.role !== 'client' ? 'Delivered to the portal and emailed to ' + first : (c.kind === 'support' ? 'Sent to support' : 'Delivered')) }));
    this.say(team ? 'Saved as a team note. ' + first + ' does not see it.' : (c.kind === 'client' && M.role !== 'client' ? 'Sent. ' + first + ' gets it in the portal and by email.' : 'Sent to ' + (c.group ? c.name : first) + '.'));
  }
  attachFile(c) {
    var self = this, I = this.icons(), M = this.msgModel(), files = M.files;
    this.open(this.sh({ eyebrow: 'Attach', title: 'Attach a file to ' + c.name, icon: I.link, body: 'Pick a file from the library. The recipient opens it in the app, with no download needed.', listTitle: 'Recent files', select: true, list: files.map(function (f) { return { t: f.name, s: f.size + ' · ' + f.when }; }), selectWhy: 'Choose a file.',
      primary: function (ctx) { return ctx.pick >= 0 ? 'Attach ' + files[ctx.pick].name : 'Attach'; }, secondary: 'Upload from this device', sToast: 'The file picker opens here. PDF, image or video, up to 100 MB.',
      onPrimary: function (ctx) { var f = files[ctx.pick]; self.msgAppend(c.id, Object.assign(self.msgNew(c), { text: 'Here is ' + f.name + '.', when: 'Just now', kind: 'text', file: f, status: 'Delivered' })); self.say(f.name + ' attached and sent.'); } }));
  }
  fileSpec(f) { var self = this; return { name: f.name, project: f.project || 'Conversation', view: f.view || 'doc', ref: f.ref, docTitle: f.docTitle || f.name, when: f.when, size: f.size, tone: f.tone, by: f.by, swatches: f.swatches, pageCount: f.pageCount }; }
  msgNewSheet() {
    var self = this, I = this.icons(), M = this.msgModel(), recs = M.recipients;
    this.open(this.sh({ eyebrow: 'New message', title: M.newTitle, icon: I.msg, body: M.newBody, listTitle: M.newList, select: true, list: recs.map(function (r) { return { t: r.name, s: r.sub, ini: r.i, av: r.tone }; }), selectWhy: 'Choose who it is for.',
      compose: true, composeLabel: 'Message', composePh: 'Write your message', required: true, requiredWhy: 'Write a message to send it.',
      primary: function (ctx) { return ctx.pick >= 0 ? 'Send to ' + recs[ctx.pick].name.split(' (')[0] : 'Send message'; }, secondary: 'Cancel',
      onPrimary: function (ctx) {
        var r = recs[ctx.pick], all = self.msgAll(), ex = all.filter(function (c) { return c.id === r.conv; })[0], text = ctx.draft;
        var msg = Object.assign(self.msgNew({}), { text: text, when: 'Just now', kind: 'text', status: 'Delivered' + (r.kind === 'client' ? ' and emailed' : '') });
        if (ex) { self.msgAppend(ex.id, msg); self.setState({ conv: ex.id, thread: true, mfilter: 'all', mq: '' }); }
        else { var id = 'n' + Date.now(), c = { id: id, name: r.name, i: r.i, tone: r.tone, sub: r.sub, kind: r.kind, unread: 0, round: r.kind === 'team' && r.group ? '12px' : '50%', ctx: [], msgs: [msg], quick: [] }; self.setState({ newConvs: [c].concat(self.state.newConvs), conv: id, thread: true, mfilter: 'all', mq: '', mpage: 0, mdraft: '' }); }
        self.say('Sent to ' + r.name.split(' (')[0] + '.' + (r.kind === 'client' && self.msgModel().role !== 'client' ? ' They also get an email.' : ''));
      } }));
  }
  threadMenu(c) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), M = this.msgModel(), out = [];
    (c.menu || []).forEach(function (m) { out.push(it(m.t, I[m.icon] || I.open, function () { m.fn(); }, m.hint ? { hint: m.hint } : undefined)); });
    if (out.length) out.push(this.menuSep());
    out.push(it('Mark as unread', I.msg, function () { var u = Object.assign({}, self.state.munread); u[c.id] = 1; self.setState({ munread: u, thread: false, ra: self.state.ra + 1 }); self.say('Marked as unread.'); }));
    out.push(it(this.state.muted[c.id] ? 'Turn notifications back on' : 'Mute notifications', I.bell, function () { var m = Object.assign({}, self.state.muted); if (m[c.id]) delete m[c.id]; else m[c.id] = true; self.setState({ muted: m }); self.say(m[c.id] ? 'Muted. You still see it here, and it stops buzzing your phone.' : 'Notifications are back on for ' + c.name + '.'); }));
    out.push(it('Archive conversation', I.layers, function () { self.ask({ eyebrow: 'Archive', title: 'Archive the conversation with ' + c.name + '?', body: 'It leaves your list but nothing is deleted. A new message from them brings it back.', ok: 'Archive', icon: I.layers, onOk: function () { var a = Object.assign({}, self.state.archived); a[c.id] = true; self.setState({ archived: a, thread: false, conv: null, ra: self.state.ra + 1 }); self.say('Archived.', { undo: function () { var u = Object.assign({}, self.state.archived); delete u[c.id]; self.setState({ archived: u, ra: self.state.ra + 1 }); } }); } }); }));
    return out;
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), M = this.msgModel();
    if (pop.kind === 'thread') { var c = this.msgAll().filter(function (x) { return x.id === pop.id; })[0]; return c ? this.threadMenu(c) : []; }
    if (pop.kind === 'chores') return [
      it('Mark all as read', I.check, function () { var m = Object.assign({}, self.state.mread); self.msgAll().forEach(function (c) { m[c.id] = true; }); self.setState({ mread: m, munread: {}, ra: self.state.ra + 1 }); self.say('Everything is marked as read.'); }),
      it('Search all messages', I.search, function () { self.setState({ pal: true, q: '' }); }, { hint: 'Ctrl K' }),
      this.menuSep(),
      it('Message notifications', I.bell, function () { window.location.href = M.settingsHref; }, { hint: 'Settings' })
    ];
    return [];
  }
  renderVals() {
    var s = this.state, self = this, I = this.icons(), M = this.msgModel(), all = this.msgAll(), q = s.mq.trim().toLowerCase();
    var inSearch = function (c) { return !q || (c.name + ' ' + c.sub + ' ' + c.msgs.map(function (m) { return m.text || ''; }).join(' ')).toLowerCase().indexOf(q) >= 0; };
    var filter = M.filters.map(function (f) { return f[0]; }).indexOf(s.mfilter) >= 0 ? s.mfilter : 'all';
    var list = all.filter(function (c) { return self.msgFilterIn(c, filter) && inSearch(c); });
    var cp = Math.min(s.mpage, Math.max(0, Math.ceil(list.length / s.mper) - 1));
    var sel = all.filter(function (c) { return c.id === s.conv; })[0] || list[0] || all[0];
    var convs = list.slice(cp * s.mper, cp * s.mper + s.mper).map(function (c, i) {
      var n = self.msgUnread(c), on = sel && sel.id === c.id;
      return { name: c.name, i: c.i, tone: c.tone, round: c.round || '50%', sub: c.sub, last: self.msgLast(c), when: self.msgWhen(c), unread: n, hasUnread: n > 0, fw: n > 0 ? 600 : 400, pcol: n > 0 ? 'var(--ad-ink)' : 'var(--ad-dim)', cls: on ? 'on' : '', current: on ? 'true' : 'false', anim: self.anim(s.ra), delay: (i * 0.035) + 's',
        aria: c.name + ', ' + c.sub + (n ? ', ' + n + ' unread' : '') + '. ' + self.msgLast(c), open: function () { self.msgOpen(c.id); } };
    });
    var filters = M.filters.map(function (f) { var on = filter === f[0]; return { t: f[1], n: all.filter(function (c) { return self.msgFilterIn(c, f[0]) && inSearch(c); }).length, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ mfilter: f[0], mpage: 0, ra: self.state.ra + 1 }); } }; });
    var MG = Object.assign(this.pager('conversations', list.length, s.mper, cp, function (k) { self.setState({ mpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ mper: n, mpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ mper: 20, mpage: 0, ra: self.state.ra + 1 }); self.say('Showing all ' + list.length + ' conversations.'); } });

    var th = { aria: 'Conversation' }, msgs = [], quick = [], canVis = false, team = s.mvis === 'team';
    if (sel) {
      var kindT = ({ client: ['Client', 'var(--ad-tone-brand)'], team: ['Team', 'var(--ad-tone-flat)'], support: ['Support', 'var(--ad-tone-live)'] })[sel.kind] || ['Team', 'var(--ad-tone-flat)'];
      th = { aria: 'Conversation with ' + sel.name, name: sel.name, sub: sel.sub, i: sel.i, tone: sel.tone, round: sel.round || '50%', kind: kindT[0], kindTone: kindT[1], kindInk: kindT[1] === 'var(--ad-tone-flat)' ? 'var(--ad-on-flat)' : '#fff',
        menu: function (e) { self.openPop(e, 'thread', sel.id, 270, 280, 'More for ' + sel.name); }, menuX: self.popOn('thread', sel.id),
        hasCtx: !!(sel.ctx && sel.ctx.length), ctx: (sel.ctx || []).map(function (x) { var tone = x.tone ? self.msgTone(x.tone) : null; return { t: x.t, d: I[x.icon] || I.link, hasTag: !!x.tag, tag: x.tag, tone: tone ? tone[0] : '', ink: tone ? tone[1] : '', open: function () { if (x.href) window.location.href = x.href; else if (x.fn) x.fn(); } }; }) };
      var rows = sel.msgs, lastMine = -1; rows.forEach(function (m, i) { if (m.mine) lastMine = i; });
      msgs = rows.map(function (m, i) {
        var ev = m.kind === 'event', note = m.kind === 'note';
        return { isEvent: ev, isMsg: !ev, d: I.clock, text: m.text, who: m.mine ? 'You' : m.who, i: m.i, tone: m.tone, when: m.when, isNote: note, bcls: note ? 'note' : '', cls: ev ? 'ev' : (m.mine ? 'mine' : ''),
          hasFile: !!m.file, file: m.file ? { name: m.file.name, size: m.file.size, ext: m.file.ext || 'PDF', tone: m.file.tone || 'var(--ad-tone-bad)', aria: 'Open ' + m.file.name, open: function () { self.openFile(self.fileSpec(m.file)); } } : {}, hasStatus: !!(m.mine && m.status && i === lastMine), status: m.status || '' };
      }).reverse();
      quick = (sel.quick || []).map(function (t) { return { t: t, pick: function () { self.setState({ mdraft: t }); } }; });
      canVis = !!(M.vis && sel.kind === 'client');
    }
    var unreadN = all.filter(function (c) { return self.msgUnread(c) > 0; }).length, total = this.msgUnreadTotal();
    var hasFilter = !!q || filter !== 'all';
    return Object.assign(this.kit(), this.extraVals(), M.vals ? M.vals(this) : {}, {
      ledeA: total ? total + (total === 1 ? ' unread message' : ' unread messages') + ' in ' + unreadN + (unreadN === 1 ? ' conversation.' : ' conversations.') : 'You are all caught up.', ledeB: M.waiting ? M.waiting(this, all) : '',
      paneCls: s.thread ? 'isThread' : '', filters: filters, convs: convs, MG: MG, mq: s.mq, hasMq: !!s.mq,
      onMq: function (e) { self.setState({ mq: e.target.value, mpage: 0, ra: self.state.ra + 1 }); }, clearMq: function () { self.setState({ mq: '', ra: self.state.ra + 1 }); }, clearFilters: function () { self.setState({ mq: '', mfilter: 'all', mpage: 0, ra: self.state.ra + 1 }); },
      noConvs: !list.length, hasFilter: hasFilter, emptyTitle: q ? 'No conversation matches "' + s.mq + '".' : (filter === 'unread' ? 'Nothing unread.' : 'Nothing here yet.'), emptyBody: q ? 'Search by name, project or a word in a message.' : (filter === 'unread' ? 'You are all caught up. That is a good place to be.' : 'Start one with New message.'),
      hasThread: !!sel, noThread: !sel, th: th, msgs: msgs, quick: quick, canVis: canVis, visI: team ? 1 : 0, vClient: team ? '' : 'on', vTeam: team ? 'on' : '', pClient: team ? 'false' : 'true', pTeam: team ? 'true' : 'false', clientLabel: M.clientLabel || 'Client sees it',
      visHint: team ? 'Only the team sees this note. It never reaches the client.' : 'Goes to the client’s portal and email.', setClient: function () { self.setState({ mvis: 'client' }); }, setTeam: function () { self.setState({ mvis: 'team' }); },
      ph: sel ? (sel.group ? 'Message ' + sel.name : 'Reply to ' + sel.name.split(' ')[0]) : 'Write a message', draft: s.mdraft, onDraft: function (e) { self.setState({ mdraft: e.target.value }); },
      onKey: function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); self.sendMsg(); } }, send: function () { self.sendMsg(); }, attach: function () { if (sel) self.attachFile(sel); },
      backToList: function () { self.setState({ thread: false }); }, newMsg: function () { self.msgNewSheet(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 250, 220, 'More for messages'); }, choresX: this.popOn('chores', 'chores')
    });
  }
  msgTone(t) { return ({ warn: ['var(--ad-tone-warn)', '#fff'], bad: ['var(--ad-tone-bad)', '#fff'], good: ['var(--ad-tone-good)', '#fff'], live: ['var(--ad-tone-live)', '#fff'], flat: ['var(--ad-tone-flat)', 'var(--ad-on-flat)'], brand: ['var(--ad-tone-brand)', '#fff'] })[t] || ['var(--ad-tone-flat)', 'var(--ad-on-flat)']; }
