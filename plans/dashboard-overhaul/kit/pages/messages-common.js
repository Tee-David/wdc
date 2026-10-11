  /* ======================= Messages (shared by all roles, driven by this.msgModel()) ======================= */
  pageState() { return { conv: null, mfilter: 'all', mq: '', mpage: 0, mper: 5, ra: 0, mread: {}, munread: {}, sent: {}, mvis: 'client', thread: false, newConvs: [], muted: {}, archived: {}, mdraft: '', mreply: null, mtags: {}, mstar: {}, matt: [], msOn: false, msq: '' }; }
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
    var s = this.state, M = this.msgModel(), self = this;
    return s.newConvs.concat(M.convs).filter(function (c) { return !s.archived[c.id]; }).map(function (c) {
      var msgs = self.msgSeed(c, M).concat(c.msgs, s.sent[c.id] || []).map(function (m, i) { return Object.assign({ id: c.id + ':' + i }, m); });
      return Object.assign({}, c, { msgs: msgs });
    });
  }
  /* sample pictures drawn in the browser, so the gallery has something real to show */
  art(label, c1, c2) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="480" height="480" fill="url(#g)"/><circle cx="350" cy="130" r="54" fill="#fff" fill-opacity=".85"/><path d="M0 390 140 250l100 100 80-70 160 140v70H0z" fill="#fff" fill-opacity=".3"/><text x="28" y="450" font-family="Arial" font-size="26" font-weight="700" fill="#fff">' + label + '</text></svg>';
    return { kind: 'image', name: label + '.jpg', size: '1.1 MB', url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg) };
  }
  msgSeed(c, M) {
    var me = M.role === 'client', who = c.kind === 'client' || me ? { who: c.name, i: c.i, tone: c.tone } : { who: 'Chiamaka A.', i: 'CA', tone: '#b84a00' }, A = this.art.bind(this);
    var from = me ? { mine: true, who: this.me().name, i: this.me().i, tone: this.me().tone } : who, t = function (text, when, o) { return Object.assign({ kind: 'text', text: text, when: when }, from, o || {}); };
    var S = {
      mira: [{ kind: 'event', text: 'Brand discovery call held', when: '28 Sep' }, t('Moodboard from our shelf. These are the colours and textures I keep coming back to.', '28 Sep, 11:05', { media: [A('Leaf green', '#1f4d3a', '#0b2a1d'), A('Linen', '#c9a27a', '#7a5a38'), A('Bark', '#4a3f34', '#2b2620')] }), t('And this packaging I saw, for the shape of the jar.', '28 Sep, 11:09', { link: { kind: 'link', url: 'https://www.pinterest.com/pin/skincare-packaging', name: 'Minimal skincare packaging ideas' } })],
      lumen: [t('Photos from Saturday’s class, for the timetable.', '24 Sep, 18:40', { media: [A('Class one', '#23239b', '#0e0e5c'), A('Class two', '#b84a00', '#7a2e0e')] })],
      social: [t('Menu photos from Ade for this month.', '30 Sep, 09:12', { media: [A('Jollof', '#b84a00', '#7a2e0e'), A('Suya', '#7a2e0e', '#2b1208'), A('Zobo', '#6b1a3d', '#2b0a18'), A('Puff puff', '#a16207', '#5a3504')] })],
      bloom: [t('Our opening hours page, for reference.', '26 Sep, 10:02', { link: { kind: 'link', url: 'https://bloompharmacy.ng/opening-hours', name: 'bloompharmacy.ng opening hours' } })],
      ade: [t('Photos for the chef story.', '29 Sep', { media: [A('Chef', '#7a2e0e', '#2b1208'), A('Kitchen', '#5c3d1f', '#2b2620')] })]
    };
    return S[c.id] || [];
  }
  msgUnread(c) { var s = this.state; return s.munread[c.id] || (s.mread[c.id] ? 0 : (c.unread || 0)); }
  msgUnreadTotal() { var self = this; return this.msgAll().reduce(function (a, c) { return a + self.msgUnread(c); }, 0); }
  msgLast(c) { var l = c.msgs.filter(function (m) { return m.kind !== 'event'; }).slice(-1)[0]; return l ? ((l.mine ? 'You: ' : (c.kind === 'team' && c.group ? l.who.split(' ')[0] + ': ' : '')) + (l.kind === 'note' ? 'Team note: ' : '') + (l.text || (l.file ? l.file.name : ''))) : 'No messages yet'; }
  msgWhen(c) { var l = c.msgs.slice(-1)[0]; return l ? l.when : ''; }
  msgFilterIn(c, f) { var s = this.state; if (f === 'tagged') return c.msgs.some(function (m) { return (s.mtags[m.id] || []).length; }); if (f === 'starred') return c.msgs.some(function (m) { return s.mstar[m.id]; }); return f === 'all' || (f === 'unread' ? this.msgUnread(c) > 0 : c.kind === f); }
  msgOpen(id) { var m = Object.assign({}, this.state.mread), u = Object.assign({}, this.state.munread); m[id] = true; delete u[id]; this.setState({ conv: id, thread: true, mread: m, munread: u, mdraft: '', mreply: null, matt: [], msOn: false, msq: '', ra: this.state.ra + 1 }); }
  msgAppend(id, msg) { var s = Object.assign({}, this.state.sent); s[id] = (s[id] || []).concat([msg]); var m = Object.assign({}, this.state.mread), u = Object.assign({}, this.state.munread); m[id] = true; delete u[id]; this.setState({ sent: s, mread: m, munread: u, mdraft: '', ra: this.state.ra + 1 }); }
  msgNew(conv) { return { who: this.me().name, i: this.me().i, tone: this.me().tone, mine: true }; }
  sendMsg() {
    var self = this, s = this.state, M = this.msgModel(), all = this.msgAll();
    var c = all.filter(function (x) { return x.id === s.conv; })[0] || all[0]; if (!c) return;
    var el = document.getElementById('msgIn'), text = ((el ? el.value : s.mdraft) || '').trim(), att = s.matt || [];
    if (!text && !att.length) { this.say('Write a message or attach something first.'); return; }
    var team = M.vis && c.kind === 'client' && s.mvis === 'team', first = c.name.split(' ')[0];
    var msg = Object.assign(this.msgNew(c), { text: text, when: 'Just now', kind: team ? 'note' : 'text', status: team ? 'Saved as a team note. ' + first + ' does not see it.' : (c.kind === 'client' && M.role !== 'client' ? 'Delivered to the portal and emailed to ' + first : (c.kind === 'support' ? 'Sent to support' : 'Delivered')) });
    if (s.mreply) msg.quote = { who: s.mreply.who, text: s.mreply.text };
    var media = att.filter(function (a) { return a.kind === 'image' || a.kind === 'video'; }), docs = att.filter(function (a) { return a.kind === 'doc'; }), link = att.filter(function (a) { return a.kind === 'link'; })[0];
    if (media.length) msg.media = media; if (docs.length) msg.files = docs; if (link) msg.link = link;
    this.setState({ mreply: null, matt: [] });
    this.msgAppend(c.id, msg);
    this.say(team ? 'Saved as a team note. ' + first + ' does not see it.' : (c.kind === 'client' && M.role !== 'client' ? 'Sent. ' + first + ' gets it in the portal and by email.' : 'Sent to ' + (c.group ? c.name : first) + '.'));
  }
  /* attachments waiting under the composer: pictures, video, files and links */
  attAdd(list) { var cur = (this.state.matt || []).slice(), self = this; list.forEach(function (x) { if (cur.length < 10) cur.push(x); else self.say('Ten attachments is the most one message takes.'); }); this.setState({ matt: cur }); }
  attFromFiles(files) {
    var self = this, out = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.size > 25 * 1048576) { this.say(f.name + ' is over 25 MB. Share it from the library or as a link.'); continue; }
      var img = /^image\//.test(f.type), vid = /^video\//.test(f.type), ext = (f.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4);
      out.push({ id: 'a' + Date.now() + i, kind: img ? 'image' : (vid ? 'video' : 'doc'), name: f.name, size: this.fileSize(f.size), ext: ext, url: img || vid ? URL.createObjectURL(f) : '' });
    }
    if (out.length) this.attAdd(out);
  }
  attLinkSheet() {
    var self = this, I = this.icons();
    this.open(this.sh({ eyebrow: 'Attach', title: 'Add a link', icon: I.link, body: 'The person opens it in a new tab. Only links that start with https are accepted.', focus: 'f-url',
      fields: [{ key: 'url', label: 'Link', ph: 'https://', wide: true, mode: 'url', check: function (v) { v = v.trim(); if (!v) return ''; return /^https:\/\/[^\s.]+\.[^\s]+$/.test(v) ? '' : 'Start with https:// and use a full address.'; } }, { key: 'label', label: 'Name for the link (optional)', ph: 'For example: the brief', wide: true }],
      primary: 'Add the link', secondary: 'Cancel', primaryDis: function (ctx) { return /^https:\/\/[^\s.]+\.[^\s]+$/.test((ctx.form.url || '').trim()) ? '' : 'Add a full link that starts with https://.'; },
      onPrimary: function (ctx) { var u = ctx.form.url.trim(), host = u.replace(/^https:\/\//, '').split('/')[0]; self.attAdd([{ kind: 'link', url: u, name: (ctx.form.label || '').trim() || host }]); self.say('Link added. It sends with your message.'); } }));
  }
  attachFile(c) {
    var self = this, I = this.icons(), M = this.msgModel(), files = M.files;
    this.open(this.sh({ eyebrow: 'Attach', title: 'Attach from the library', icon: I.link, body: 'Pick one or more files. They sit under your message until you send it, and the person opens them in the app with no download needed.', listTitle: 'Recent files', select: true, multi: true, search: true, searchPh: 'Search files', list: files.map(function (f) { return { t: f.name, s: f.size + ' · ' + f.when + (f.project ? ' · ' + f.project : ''), ini: f.ext || 'PDF', av: f.tone || 'var(--ad-tone-bad)', ref: f, k: f.project || '' }; }), selectWhy: 'Choose at least one file.',
      primary: function (ctx) { return ctx.items.length ? 'Attach ' + ctx.items.length + (ctx.items.length === 1 ? ' file' : ' files') : 'Attach'; }, secondary: 'Cancel',
      onPrimary: function (ctx) { self.attAdd(ctx.items.map(function (it) { var f = it.ref; return { kind: 'doc', name: f.name, size: f.size, ext: f.ext || 'PDF', lib: f }; })); self.say(ctx.items.length + (ctx.items.length === 1 ? ' file' : ' files') + ' ready to send with your message.'); } }));
  }
  fileSpec(f) { var self = this; return { name: f.name, project: f.project || 'Conversation', view: f.view || 'doc', ref: f.ref, docTitle: f.docTitle || f.name, when: f.when, size: f.size, tone: f.tone, by: f.by, swatches: f.swatches, pageCount: f.pageCount }; }
  /* everyone this person may message: the model's own list, then (for Admin) every other client */
  msgRecipients() {
    var M = this.msgModel(), recs = M.recipients.slice(), have = {}, self = this;
    recs.forEach(function (r) { have[(r.name || '').toLowerCase()] = true; });
    if (M.role === 'admin' && this.clientsData) this.clientsData().filter(function (c) { return c.status !== 'past'; }).forEach(function (c) {
      var nm = c.contact + ' (' + c.name + ')'; if (have[nm.toLowerCase()]) return;
      recs.push({ conv: null, name: nm, sub: (c.status === 'lead' ? 'Lead · ' : 'Client · ') + c.services.join(', '), i: c.contact.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(), tone: c.tone, kind: 'client' });
    });
    return recs;
  }
  msgNewSheet() {
    var self = this, I = this.icons(), M = this.msgModel(), recs = this.msgRecipients();
    this.open(this.sh({ eyebrow: 'New message', title: M.newTitle, icon: I.msg, wide: true, body: M.newBody + ' Pick more than one and each person gets their own copy.', listTitle: M.newList, select: true, multi: true, searchPh: 'Search people by name, company or role',
      create: M.role === 'admin' ? this.clientCreate('Add a new client and message them') : null,
      list: recs.map(function (r) { return { t: r.name, s: r.sub, ini: r.i, av: r.tone, ref: r, k: r.kind }; }), selectWhy: 'Choose at least one person.',
      fields: [{ key: 'att', type: 'media', label: 'Pictures and video (optional)', max: 5, hint: 'Documents and links go in the thread, where you can attach them from the library.' }],
      compose: true, composeLabel: 'Message', composePh: 'Write your message', required: true, requiredWhy: 'Write a message to send it.',
      primary: function (ctx) { var n = ctx.items.length; return n > 1 ? 'Send to ' + n + ' people' : (n ? 'Send to ' + ctx.items[0].t.split(' (')[0] : 'Send message'); }, secondary: 'Cancel',
      onPrimary: function (ctx) {
        var text = ctx.draft, media = (ctx.form.att || []).map(function (x) { return { kind: x.kind, name: x.name, size: x.size, url: x.url }; }), first = null, names = [];
        ctx.items.forEach(function (it) {
          var r = it.ref, rec = r;
          if (r.isNew) { self.landClient(r); rec = { conv: null, name: r.contact + ' (' + r.name + ')', sub: 'Client · New', i: r.ini, tone: r.tone, kind: 'client' }; }
          var all = self.msgAll(), ex = all.filter(function (c) { return c.id === rec.conv; })[0] || all.filter(function (c) { return c.name === rec.name; })[0];
          var msg = Object.assign(self.msgNew({}), { text: text, when: 'Just now', kind: 'text', status: 'Delivered' + (rec.kind === 'client' && M.role !== 'client' ? ' and emailed' : '') });
          if (media.length) msg.media = media;
          if (ex) { self.msgAppend(ex.id, msg); if (!first) first = ex.id; }
          else { var id = 'n' + Date.now() + names.length, c = { id: id, name: rec.name, i: rec.i, tone: rec.tone, sub: rec.sub, kind: rec.kind, unread: 0, round: rec.kind === 'team' && rec.group ? '12px' : '50%', ctx: [], msgs: [msg], quick: [] }; self.setState({ newConvs: [c].concat(self.state.newConvs) }); if (!first) first = id; }
          names.push(rec.name.split(' (')[0]);
        });
        self.setState({ conv: first, thread: true, mfilter: 'all', mq: '', mpage: 0, mdraft: '', ra: self.state.ra + 1 });
        self.say('Sent to ' + (names.length > 2 ? names[0] + ' and ' + (names.length - 1) + ' others' : names.join(' and ')) + '.' + (ctx.items.some(function (it) { return it.ref.kind === 'client' || it.ref.isNew; }) && M.role !== 'client' ? ' Clients also get an email.' : ''));
      } }));
  }
  /* tags on a message: a few ready made, and your own */
  msgTagSheet(m) {
    var self = this, I = this.icons(), base = ['Decision', 'Action needed', 'Approved', 'Question', 'Money', 'Feedback'], cur = this.state.mtags[m.id] || [], extra = cur.filter(function (t) { return base.indexOf(t) < 0; });
    this.open(this.sh({ eyebrow: 'Tag', title: 'Tag this message', icon: I.target, body: '“' + (m.text || (m.file && m.file.name) || 'Attachment').slice(0, 90) + '”. Tags are for the team and never show to the client. Filter the list by Tagged to find them again.',
      chipSets: function () { return [{ key: 'tags', label: 'Tags', multi: true, opts: base.concat(extra) }]; }, form: { tags: cur.slice() },
      fields: [{ key: 'custom', label: 'Your own tag (optional)', ph: 'For example: Invoice', wide: true, check: function (v) { return v.trim().length > 20 ? 'Keep it under 20 characters.' : ''; } }],
      primary: 'Save tags', secondary: 'Cancel',
      onPrimary: function (ctx) { var t = (ctx.form.tags || []).slice(), c = (ctx.form.custom || '').trim(); if (c && t.indexOf(c) < 0) t.push(c); var all = Object.assign({}, self.state.mtags); if (t.length) all[m.id] = t; else delete all[m.id]; self.setState({ mtags: all, ra: self.state.ra + 1 }); self.say(t.length ? 'Updated. ' + t.length + (t.length === 1 ? ' tag' : ' tags') + ' on that message.' : 'Tags removed.'); } }));
  }
  msgTagTone(t) { return ({ 'Decision': 'brand', 'Action needed': 'warn', 'Approved': 'good', 'Question': 'live', 'Money': 'flat', 'Feedback': 'flat' })[t] || 'flat'; }
  /* pictures, files and links shared in one conversation, newest first */
  msgGallery(c) {
    var self = this, I = this.icons(), pics = [], docs = [], links = [];
    c.msgs.slice().reverse().forEach(function (m) {
      (m.media || []).forEach(function (x) { pics.push({ url: x.url, name: x.name, video: x.kind === 'video', when: m.when, who: m.mine ? 'You' : m.who }); });
      (m.file ? [m.file] : []).concat(m.files || []).forEach(function (f) { docs.push({ f: f, when: m.when, who: m.mine ? 'You' : m.who }); });
      if (m.link) links.push({ l: m.link, when: m.when, who: m.mine ? 'You' : m.who });
    });
    this.open(this.sh({ eyebrow: 'Shared with ' + c.name, title: 'Media, files and links', icon: I.layers, wide: true, back: false, chipsFirst: true,
      body: pics.length + docs.length + links.length ? 'Everything that has been shared in this conversation, newest first.' : 'Nothing has been shared yet. Pictures, files and links you send show up here.',
      chipSets: function () { return [{ key: 'tab', label: 'Show', opts: ['Pictures and video (' + pics.length + ')', 'Files (' + docs.length + ')', 'Links (' + links.length + ')'] }]; }, form: { tab: 'Pictures and video (' + pics.length + ')' },
      gallery: function (st) { var tab = st.form.tab || ''; return /^Pictures/.test(tab) ? pics.map(function (x) { return { url: x.url, name: x.name, isVideo: x.video, isImage: !x.video, aria: 'Open ' + x.name + ', from ' + x.who + ', ' + x.when, sub: x.who + ' · ' + x.when, open: function () { self.openFile({ name: x.name, project: c.name, view: x.video ? 'video' : 'image', url: x.url, when: x.when, size: '', by: x.who, tone: 'var(--ad-tone-brand)' }, true); } }; }) : []; },
      galleryEmpty: function (st) { return /^Pictures/.test(st.form.tab || '') && !pics.length; },
      listTitle: '', list: function (st) { var tab = st.form.tab || ''; if (/^Files/.test(tab)) return docs.map(function (x) { return { t: x.f.name, s: (x.f.size || '') + ' · ' + x.who + ' · ' + x.when, ini: (x.f.ext || 'PDF'), av: x.f.tone || 'var(--ad-tone-bad)', act: { label: 'Open', fn: function () { self.openFile(x.f.view ? self.fileSpec(x.f) : { name: x.f.name, project: c.name, view: 'doc', ref: 'SHARED', docTitle: x.f.name, when: x.when, size: x.f.size, tone: 'var(--ad-tone-bad)' }, true); } } }; }); if (/^Links/.test(tab)) return links.map(function (x) { return { t: x.l.name, s: x.l.url + ' · ' + x.who + ' · ' + x.when, ini: 'URL', av: 'var(--ad-tone-brand)', act: { label: 'Open', fn: function () { self.say('The link opens in a new tab in the live product.'); } } }; }); return []; },
      primary: 'Done' }));
  }
  /* drag a message to the right to reply to it, on a phone or with a mouse */
  swipeReply(e, fn) {
    var el = e.currentTarget; if (!el || (e.target.closest && e.target.closest('button, a, input, textarea, label, video'))) return;
    var x0 = e.clientX, y0 = e.clientY, dx = 0, active = false, wrap = el.parentElement, self = this;
    var done = function () { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    var move = function (ev) {
      var ddx = ev.clientX - x0, ddy = ev.clientY - y0;
      if (!active) { if (Math.abs(ddy) > 12 && Math.abs(ddy) > Math.abs(ddx)) { done(); return; } if (ddx > 10 && ddx > Math.abs(ddy) * 1.4) { active = true; el.classList.add('swiping'); } else return; }
      dx = Math.max(0, Math.min(ddx, 88)); el.style.transform = 'translateX(' + dx + 'px)'; if (wrap) wrap.style.setProperty('--sw', Math.min(1, dx / 56));
    };
    var up = function () {
      done(); var hit = active && dx >= 56; el.classList.remove('swiping'); el.style.transition = 'transform .28s cubic-bezier(.16,1,.3,1)'; el.style.transform = '';
      setTimeout(function () { el.style.transition = ''; if (wrap) wrap.style.removeProperty('--sw'); }, 300);
      if (hit) fn();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  msgMenu(c, m) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), s = this.state, out = [];
    var reply = function () { self.setState({ mreply: { id: m.id, who: m.mine ? 'yourself' : m.who, text: (m.text || (m.file && m.file.name) || (m.media && m.media.length ? m.media.length + ' pictures' : 'Attachment')).slice(0, 140) } }); setTimeout(function () { var t = document.getElementById('msgIn'); if (t) t.focus(); }, 60); };
    out.push(it('Reply', I.send, reply));
    out.push(it('Tag…', I.target, function () { self.msgTagSheet(m); }));
    out.push(it(s.mstar[m.id] ? 'Remove the star' : 'Star it', I.check, function () { var all = Object.assign({}, self.state.mstar); if (all[m.id]) delete all[m.id]; else all[m.id] = true; self.setState({ mstar: all, ra: self.state.ra + 1 }); self.say(all[m.id] ? 'Starred. Find it under the Starred filter.' : 'Star removed.'); }));
    out.push(it('Copy the text', I.file, function () { try { navigator.clipboard.writeText(m.text || ''); self.say('Copied.'); } catch (e) { self.say('Select the text and copy it. Your browser blocked the shortcut.'); } }));
    var mk = (c.menu || []).filter(function (x) { return x.icon === 'task'; })[0]; if (mk) out.push(it(mk.t, I.task, function () { mk.fn(); }));
    return out;
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
    if (pop.kind === 'msg') { var pc = pop.id.split(':')[0], conv = this.msgAll().filter(function (x) { return x.id === pc; })[0], mm = conv && conv.msgs.filter(function (x) { return x.id === pop.id; })[0]; return mm ? this.msgMenu(conv, mm) : []; }
    if (pop.kind === 'thread') { var c = this.msgAll().filter(function (x) { return x.id === pop.id; })[0]; return c ? this.threadMenu(c) : []; }
    if (pop.kind === 'chores') return [
      it('Mark all as read', I.check, function () { var m = Object.assign({}, self.state.mread); self.msgAll().forEach(function (c) { m[c.id] = true; }); self.setState({ mread: m, munread: {}, ra: self.state.ra + 1 }); self.say('Everything is marked as read.'); }),
      it('Search all messages', I.search, function () { self.setState({ pal: true, q: '' }); }, { hint: 'Ctrl K' }),
      this.menuSep(),
      it('Message notifications', I.bell, function () { window.location.href = M.settingsHref; }, { hint: 'Settings' })
    ].concat(M.role === 'admin' ? [this.menuSep(), it('Email marketing', I.mail, function () { window.location.href = 'A-Email.dc.html'; }, { hint: 'Campaigns and contacts' })] : []);
    return [];
  }
  renderVals() {
    var s = this.state, self = this, I = this.icons(), M = this.msgModel(), all = this.msgAll(), q = s.mq.trim().toLowerCase();
    var inSearch = function (c) { return !q || (c.name + ' ' + c.sub + ' ' + c.msgs.map(function (m) { return m.text || ''; }).join(' ')).toLowerCase().indexOf(q) >= 0; };
    var FILT = M.filters.concat([['tagged', 'Tagged'], ['starred', 'Starred']]), filter = FILT.map(function (f) { return f[0]; }).indexOf(s.mfilter) >= 0 ? s.mfilter : 'all';
    var list = all.filter(function (c) { return self.msgFilterIn(c, filter) && inSearch(c); });
    var cp = Math.min(s.mpage, Math.max(0, Math.ceil(list.length / s.mper) - 1));
    var sel = all.filter(function (c) { return c.id === s.conv; })[0] || list[0] || all[0];
    var convs = list.slice(cp * s.mper, cp * s.mper + s.mper).map(function (c, i) {
      var n = self.msgUnread(c), on = sel && sel.id === c.id;
      return { name: c.name, i: c.i, tone: c.tone, round: c.round || '50%', sub: c.sub, last: self.msgLast(c), when: self.msgWhen(c), unread: n, hasUnread: n > 0, fw: n > 0 ? 600 : 400, pcol: n > 0 ? 'var(--ad-ink)' : 'var(--ad-dim)', cls: on ? 'on' : '', current: on ? 'true' : 'false', anim: self.anim(s.ra), delay: (i * 0.035) + 's',
        aria: c.name + ', ' + c.sub + (n ? ', ' + n + ' unread' : '') + '. ' + self.msgLast(c), open: function () { self.msgOpen(c.id); } };
    });
    var filters = FILT.map(function (f) { var on = filter === f[0]; return { t: f[1], n: all.filter(function (c) { return self.msgFilterIn(c, f[0]) && inSearch(c); }).length, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ mfilter: f[0], mpage: 0, ra: self.state.ra + 1 }); } }; });
    var MG = Object.assign(this.pager('conversations', list.length, s.mper, cp, function (k) { self.setState({ mpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ mper: n, mpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ mper: 20, mpage: 0, ra: self.state.ra + 1 }); self.say('Showing all ' + list.length + ' conversations.'); } });

    var th = { aria: 'Conversation' }, msgs = [], quick = [], canVis = false, team = s.mvis === 'team';
    if (sel) {
      var kindT = ({ client: ['Client', 'var(--ad-tone-brand)'], team: ['Team', 'var(--ad-tone-flat)'], support: ['Support', 'var(--ad-tone-live)'] })[sel.kind] || ['Team', 'var(--ad-tone-flat)'];
      th = { aria: 'Conversation with ' + sel.name, name: sel.name, sub: sel.sub, i: sel.i, tone: sel.tone, round: sel.round || '50%', kind: kindT[0], kindTone: kindT[1], kindInk: kindT[1] === 'var(--ad-tone-flat)' ? 'var(--ad-on-flat)' : '#fff',
        menu: function (e) { self.openPop(e, 'thread', sel.id, 270, 280, 'More for ' + sel.name); }, menuX: self.popOn('thread', sel.id),
        hasCtx: !!(sel.ctx && sel.ctx.length), ctx: (sel.ctx || []).map(function (x) { var tone = x.tone ? self.msgTone(x.tone) : null; return { t: x.t, d: I[x.icon] || I.link, hasTag: !!x.tag, tag: x.tag, tone: tone ? tone[0] : '', ink: tone ? tone[1] : '', open: function () { if (x.href) window.location.href = x.href; else if (x.fn) x.fn(); } }; }) };
      var rows = sel.msgs, lastMine = -1; rows.forEach(function (m, i) { if (m.mine) lastMine = i; });
      var qlow = s.msOn ? s.msq.trim().toLowerCase() : '';
      var shown = rows.map(function (m, i) { return { m: m, i: i }; }).filter(function (x) { return !qlow || (x.m.kind !== 'event' && ((x.m.text || '') + ' ' + (x.m.file ? x.m.file.name : '') + ' ' + ((x.m.files || []).map(function (f) { return f.name; }).join(' ')) + ' ' + (x.m.link ? x.m.link.name : '')).toLowerCase().indexOf(qlow) >= 0); });
      th.searchCount = qlow ? shown.length + (shown.length === 1 ? ' match' : ' matches') : '';
      var tagInk = function (t) { var tn = self.msgTone(self.msgTagTone(t)); return tn; };
      msgs = shown.map(function (x) {
        var m = x.m, i = x.i, ev = m.kind === 'event', note = m.kind === 'note', tags = s.mtags[m.id] || [], docsAll = (m.file ? [m.file] : []).concat(m.files || []), media = m.media || [];
        var qt = m.quote ? { who: m.quote.who, text: m.quote.text } : { who: '', text: '' };
        var reply = function () { self.setState({ mreply: { id: m.id, who: m.mine ? 'yourself' : m.who, text: (m.text || (m.file && m.file.name) || (media.length ? media.length + (media.length === 1 ? ' picture' : ' pictures') : 'Attachment')).slice(0, 140) } }); setTimeout(function () { var t = document.getElementById('msgIn'); if (t) t.focus(); }, 60); };
        return { id: m.id, isEvent: ev, isMsg: !ev, d: I.clock, text: m.text || '', hasText: !!m.text, who: m.mine ? 'You' : m.who, i: m.i, tone: m.tone, when: m.when, isNote: note, bcls: note ? 'note' : '', cls: ev ? 'ev' : (m.mine ? 'mine' : ''),
          hasQuote: !!m.quote, quote: qt, hasTags: tags.length > 0, tags: tags.map(function (t) { var tn = tagInk(t); return { t: t, tone: tn[0], ink: tn[1] }; }), starred: !!s.mstar[m.id],
          hasMedia: media.length > 0, mediaCls: 'mg mg' + Math.min(media.length, 4), media: media.slice(0, 4).map(function (x2, k) { return { url: x2.url, isVideo: x2.kind === 'video', isImage: x2.kind !== 'video', name: x2.name, more: k === 3 && media.length > 4 ? '+' + (media.length - 3) : '', hasMore: k === 3 && media.length > 4, aria: 'Open ' + x2.name, open: function () { self.openFile({ name: x2.name, project: sel.name, view: x2.kind === 'video' ? 'video' : 'image', url: x2.url, when: m.when, size: x2.size || '', by: m.mine ? 'You' : m.who, tone: 'var(--ad-tone-brand)' }, false); } }; }),
          hasDocs: docsAll.length > 0, docs: docsAll.map(function (f) { return { name: f.name, size: f.size, ext: f.ext || 'PDF', tone: f.tone || 'var(--ad-tone-bad)', aria: 'Open ' + f.name, open: function () { self.openFile(f.view ? self.fileSpec(f) : { name: f.name, project: sel.name, view: 'doc', ref: 'SHARED', docTitle: f.name, when: m.when, size: f.size, tone: 'var(--ad-tone-bad)' }); } }; }),
          hasLink: !!m.link, link: m.link ? { name: m.link.name, url: m.link.url, aria: 'Open the link ' + m.link.name, open: function () { self.say('The link opens in a new tab in the live product.'); } } : {},
          reply: reply, swipe: function (e) { self.swipeReply(e, reply); }, more: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'msg', m.id, 250, 300, 'Message actions'); }, moreX: self.popOn('msg', m.id), tagIt: function () { self.msgTagSheet(m); },
          hasStatus: !!(m.mine && m.status && i === lastMine), status: m.status || '' };
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
      hasThread: !!sel, noThread: !sel, th: th, msgs: msgs, noMsgs: !msgs.length, quick: quick,
      hasReply: !!s.mreply, replyWho: s.mreply ? s.mreply.who : '', replyText: s.mreply ? s.mreply.text : '', cancelReply: function () { self.setState({ mreply: null }); },
      hasAtt: (s.matt || []).length > 0, attN: (s.matt || []).length + ' attached', att: (s.matt || []).map(function (a, k) { return { name: a.name, size: a.size || '', ext: a.ext || '', url: a.url || '', isImg: a.kind === 'image', isVid: a.kind === 'video', isDoc: a.kind === 'doc', isLink: a.kind === 'link', aria: 'Remove ' + a.name, remove: function () { var c = (self.state.matt || []).slice(); c.splice(k, 1); self.setState({ matt: c }); } }; }),
      attFilesPhoto: function (e) { if (e && e.target && e.target.files) { self.attFromFiles(e.target.files); e.target.value = ''; } }, attFilesDoc: function (e) { if (e && e.target && e.target.files) { self.attFromFiles(e.target.files); e.target.value = ''; } },
      attLib: function () { if (sel) self.attachFile(sel); }, attLink: function () { self.attLinkSheet(); },
      openMedia: function () { if (sel) self.msgGallery(sel); }, toggleSearch: function () { self.setState({ msOn: !self.state.msOn, msq: '' }); setTimeout(function () { var t = document.getElementById('msq'); if (t) t.focus(); }, 60); },
      msOn: s.msOn, msq: s.msq, onMsq: function (e) { self.setState({ msq: e.target.value }); }, closeSearch: function () { self.setState({ msOn: false, msq: '' }); }, searchPressed: s.msOn ? 'true' : 'false', canVis: canVis, visI: team ? 1 : 0, vClient: team ? '' : 'on', vTeam: team ? 'on' : '', pClient: team ? 'false' : 'true', pTeam: team ? 'true' : 'false', clientLabel: M.clientLabel || 'Client sees it',
      visHint: team ? 'Only the team sees this note. It never reaches the client.' : 'Goes to the client’s portal and email.', setClient: function () { self.setState({ mvis: 'client' }); }, setTeam: function () { self.setState({ mvis: 'team' }); },
      ph: sel ? (sel.group ? 'Message ' + sel.name : 'Reply to ' + sel.name.split(' ')[0]) : 'Write a message', draft: s.mdraft, onDraft: function (e) { self.setState({ mdraft: e.target.value }); },
      onKey: function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); self.sendMsg(); } }, send: function () { self.sendMsg(); }, 
      backToList: function () { self.setState({ thread: false }); }, newMsg: function () { self.msgNewSheet(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 250, 220, 'More for messages'); }, choresX: this.popOn('chores', 'chores')
    });
  }
  msgTone(t) { return ({ warn: ['var(--ad-tone-warn)', '#fff'], bad: ['var(--ad-tone-bad)', '#fff'], good: ['var(--ad-tone-good)', '#fff'], live: ['var(--ad-tone-live)', '#fff'], flat: ['var(--ad-tone-flat)', 'var(--ad-on-flat)'], brand: ['var(--ad-tone-brand)', '#fff'] })[t] || ['var(--ad-tone-flat)', 'var(--ad-on-flat)']; }
