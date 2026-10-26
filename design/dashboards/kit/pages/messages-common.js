  /* ======================= Messages (shared by all roles, driven by this.msgModel()) ======================= */
  pageState() { return { conv: null, mfilter: 'inbox', mkind: 'all', mq: '', mpage: 0, mper: 5, ra: 0, mread: {}, munread: {}, sent: {}, mvis: 'client', thread: false, newConvs: [], muted: {}, archived: {}, pinned: {}, drafts: {}, mreply: null, mtags: {}, mstar: {}, matt: [], msOn: false, msq: '', typing: null, mreact: {}, mstate: {}, divider: {}, info: null, rxFor: null, emoOn: false, emoq: '', emoRecent: ['👍', '🙏', '✅', '😊', '🎉'], mnOn: false, mnq: '', mnI: 0, offline: false, sched: [], failNext: false, jumpOn: false, newBelow: 0, madd: {}, briefs: {}, demoEmpty: false, demoNoPerm: false, mdel: {}, rz: 0 }; }
  pageName() { return 'Messages'; }
  tourSteps() {
    var I = this.icons(), M = this.msgModel();
    return [
      { target: 'list', title: 'Every conversation in one list', icon: I.msg, body: M.tourList, hint: 'Switch between Inbox, Unread, Pinned and Archived. Pinned chats stay on top.' },
      { target: 'thread', title: 'Reply without leaving the page', icon: I.send, body: M.tourThread, hint: 'Enter sends. Shift Enter starts a new line. Type @ to mention someone.' },
      { target: 'info', title: 'Details beside the thread', icon: I.users, body: M.tourInfo, hint: 'Members, shared photos, files, links and the call buttons live here.' },
      { target: 'new', title: 'Start a conversation', icon: I.plus, body: M.tourNew }
    ];
  }
  navCounts() { var M = this.msgModel(), c = Object.assign({}, M.navBase), n = this.msgUnreadTotal(); c.Messages = n ? { n: n } : { n: 0 }; return c; }

  /* ---------- the conversations, with everything the panes need ---------- */
  isPinned(c) { var v = this.state.pinned[c.id]; return v != null ? !!v : !!c.pinned; }
  isMuted(c) { var v = this.state.muted[c.id]; return v != null ? !!v : !!c.muted; }
  isArch(c) { var v = this.state.archived[c.id]; return v != null ? !!v : !!c.archived; }
  msgAll() {
    var s = this.state, M = this.msgModel(), self = this, dir = this.msgDir();
    return s.newConvs.concat(M.convs).map(function (c) {
      var msgs = self.msgSeed(c, M).concat(c.msgs, s.sent[c.id] || []).map(function (m, i) { return Object.assign({ id: c.id + ':' + i }, m); });
      var cc = Object.assign({}, c, { msgs: msgs, ckind: c.ckind || (c.group ? 'group' : (c.kind === 'support' ? 'support' : 'direct')) });
      cc.pp = c.p ? dir[c.p] || null : null; cc.mem = self.msgMembers(cc);
      return cc;
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
  msgUnreadTotal() { var self = this; return this.msgAll().reduce(function (a, c) { return a + (self.isArch(c) ? 0 : self.msgUnread(c)); }, 0); }
  msgLast(c) { var l = c.msgs.filter(function (m) { return m.kind !== 'event'; }).slice(-1)[0]; return l ? ((l.mine ? 'You: ' : ((c.ckind === 'group' || c.ckind === 'project') ? l.who.split(' ')[0] + ': ' : '')) + (l.kind === 'note' ? 'Team note: ' : '') + (l.text || (l.file ? l.file.name : (l.media && l.media.length ? 'Photo' : 'Attachment')))) : 'No messages yet'; }
  msgWhen(c) { var l = c.msgs.slice(-1)[0]; return l ? l.when : ''; }
  msgTabIn(c, t) { var a = this.isArch(c); if (t === 'archived') return a; if (a) return false; return t === 'inbox' || (t === 'unread' ? this.msgUnread(c) > 0 : this.isPinned(c)); }
  msgKindIn(c, k) { var s = this.state; if (k === 'all') return true; if (k === 'tagged') return c.msgs.some(function (m) { return (s.mtags[m.id] || []).length; }); if (k === 'starred') return c.msgs.some(function (m) { return s.mstar[m.id]; }); if (k === 'team') return c.kind === 'team' && c.ckind === 'direct'; if (k === 'project') return c.ckind === 'project'; if (k === 'group') return c.ckind === 'group'; return c.kind === k; }
  /* the list as the person has filtered it */
  msgView() {
    var s = this.state, self = this, M = this.msgModel(), all = this.msgAll(), q = s.mq.trim().toLowerCase();
    var inSearch = function (c) { return !q || (c.name + ' ' + c.sub + ' ' + c.msgs.map(function (m) { return m.text || ''; }).join(' ')).toLowerCase().indexOf(q) >= 0; };
    var KINDS = M.kinds || [], kind = KINDS.map(function (f) { return f[0]; }).indexOf(s.mkind) >= 0 ? s.mkind : 'all', tab = ['inbox', 'unread', 'pinned', 'archived'].indexOf(s.mfilter) >= 0 ? s.mfilter : 'inbox';
    var base = s.demoEmpty ? [] : all;
    var list = base.filter(function (c) { return self.msgTabIn(c, tab) && self.msgKindIn(c, kind) && inSearch(c); });
    list = list.filter(function (c) { return self.isPinned(c); }).concat(list.filter(function (c) { return !self.isPinned(c); }));
    return { all: all, base: base, q: q, kind: kind, tab: tab, list: list, inSearch: inSearch, KINDS: KINDS };
  }
  msgFilterIn(c, f) { return this.msgKindIn(c, f) || (f === 'unread' && this.msgUnread(c) > 0); }

  /* ---------- opening, sending, delivery ---------- */
  msgMode() {
    var s = this.state; if (s.dev === 'phone') return 'sheet'; if (s.dev === 'tablet') return 'over';
    if (window.innerWidth <= 600) return 'sheet';
    var sc = document.querySelector('.scroller'), w = sc ? sc.clientWidth : window.innerWidth - 244;
    return w <= 640 ? 'sheet' : (w >= 1100 ? 'col' : 'over');
  }
  msgInfoOpen(mode) { var v = this.state.info; return v == null ? mode === 'col' : !!v; }
  msgTypingWho(c) { var me = this.msgMeId(); if (!c) return null; if (c.pp) return c.pp.pres === 'on' && c.pp.id !== me ? c.pp : null; return (c.mem || []).filter(function (p) { return p.id !== me && p.pres === 'on'; })[0] || null; }
  msgTypingOn(id, ms) {
    var self = this; clearTimeout(this._tyT); this.setState({ typing: id });
    this._tyT = setTimeout(function () { if (self.state.typing === id) self.setState({ typing: null }); }, ms || 3200);
  }
  msgOpen(id) {
    var s = this.state, self = this, c = this.msgAll().filter(function (x) { return x.id === id; })[0], n = c ? this.msgUnread(c) : 0;
    var m = Object.assign({}, s.mread), u = Object.assign({}, s.munread), dv = Object.assign({}, s.divider); m[id] = true; delete u[id]; dv[id] = n;
    this._thScroll = 0; clearTimeout(this._tyT); clearTimeout(this._tyW);
    this.setState({ conv: id, thread: true, mread: m, munread: u, divider: dv, mreply: null, matt: [], msOn: false, msq: '', ra: s.ra + 1, typing: null, rxFor: null, emoOn: false, mnOn: false, jumpOn: false, newBelow: 0 });
    if (c && this.msgTypingWho(c) && !s.offline && !c.locked) this._tyW = setTimeout(function () { if (self.state.conv === id) self.msgTypingOn(id, 3400); }, 700);
  }
  msgDividerN(c) { var d = this.state.divider[c.id]; return d != null ? d : this.msgUnread(c); }
  msgAppend(id, msg) {
    var s = Object.assign({}, this.state.sent); s[id] = (s[id] || []).concat([msg]);
    var patch = { sent: s, ra: this.state.ra + 1 };
    if (msg.mine) { var m = Object.assign({}, this.state.mread), u = Object.assign({}, this.state.munread); m[id] = true; delete u[id]; patch.mread = m; patch.munread = u; }
    this.setState(patch);
  }
  msgNew(conv) { return { who: this.me().name, i: this.me().i, tone: this.me().tone, mine: true }; }
  msgSetState(id, st, extra) { var m = Object.assign({}, this.state.mstate); m[id] = Object.assign({ st: st }, extra || {}); this.setState({ mstate: m }); }
  /* Sending, Sent, Delivered, Seen: simulated, a beat apart, and only when the person is around to see it */
  msgChain(id, convId, noFail) {
    var self = this, s = this.state;
    if (s.offline) { this.msgSetState(id, 'queued'); return; }
    if (s.failNext && !noFail) { this.setState({ failNext: false }); this.msgSetState(id, 'failed'); return; }
    this.msgSetState(id, 'sending');
    setTimeout(function () {
      self.msgSetState(id, 'sent');
      setTimeout(function () {
        self.msgSetState(id, 'delivered');
        var c = self.msgAll().filter(function (x) { return x.id === convId; })[0], w = c ? self.msgTypingWho(c) : null; if (!c || !w) return;
        setTimeout(function () {
          var names = c.pp ? [] : (c.mem || []).filter(function (p) { return p.id !== self.msgMeId() && p.pres === 'on'; }).map(function (p) { return self.mxFirst(p.name); });
          self.msgSetState(id, 'seen', { at: '11:33', by: names });
          if (c.auto && c.auto.length && !self.state.offline) setTimeout(function () {
            self.msgTypingOn(convId, 2800);
            setTimeout(function () { self.msgIncoming(c, w, c.auto[Math.floor(Math.random() * c.auto.length)]); }, 2800);
          }, 1400);
        }, 2400);
      }, 900);
    }, 650);
  }
  msgIncoming(c, p, text) {
    var s = this.state, vis = s.conv === c.id, msg = { who: p.name, i: p.i, tone: p.tone, text: text, when: 'Just now', kind: 'text' };
    var sent = Object.assign({}, s.sent); sent[c.id] = (sent[c.id] || []).concat([msg]);
    var patch = { sent: sent, ra: s.ra + 1 };
    if (!vis) { var u = Object.assign({}, s.munread); u[c.id] = (this.msgUnread(c) || 0) + 1; patch.munread = u; } else if (s.jumpOn) patch.newBelow = s.newBelow + 1;
    if (s.typing === c.id) patch.typing = null;
    this.setState(patch);
  }
  setOffline(v) {
    var self = this; this.setState({ offline: v, ra: this.state.ra + 1 });
    if (v) { this.say('Offline demo on. Messages you send will wait.'); return; }
    var q = Object.keys(this.state.mstate).filter(function (k) { return self.state.mstate[k].st === 'queued'; });
    q.forEach(function (k, n) { setTimeout(function () { self.msgChain(k, k.split(':')[0], true); }, 400 * n); });
    this.say(q.length ? 'Back online. ' + q.length + (q.length === 1 ? ' message is' : ' messages are') + ' sending.' : 'Back online.');
  }
  /* what a sender's tick says, as a state, some text and an icon */
  msgDelivery(c, m, i, rows) {
    var s = this.state, X = this.mxI(), ov = s.mstate[m.id] || {}, st = ov.st || m.st, txt = '', nx = null, k;
    if (m.kind === 'note') return null;
    if (!st) { for (k = i + 1; k < rows.length; k++) if (!rows[k].mine && rows[k].kind !== 'event') { nx = rows[k]; break; } st = nx ? 'seen' : 'delivered'; }
    if (st === 'sending') txt = 'Sending'; else if (st === 'queued') txt = 'Waiting for connection'; else if (st === 'sent') txt = 'Sent'; else if (st === 'failed') txt = 'Not sent';
    else if (st === 'delivered') txt = m.status || 'Delivered';
    else {
      if (c.ckind === 'group' || c.ckind === 'project') {
        var names = ov.by || []; if (!names.length) { var seen = {}; rows.slice(i + 1).forEach(function (r) { if (!r.mine && r.kind !== 'event' && r.who) seen[r.who.split(' ')[0]] = true; }); names = Object.keys(seen); }
        txt = names.length ? 'Seen by ' + (names.length > 2 ? names[0] + ', ' + names[1] + ' and ' + (names.length - 2) + ' more' : names.join(' and ')) : 'Delivered';
        if (!names.length) st = 'delivered';
      } else {
        var at = ov.at || (nx ? (this.mxTimeOf(nx.when) ? (this.mxDay(nx.when).k === this.mxDay(m.when).k ? this.mxTimeOf(nx.when) : this.mxDay(nx.when).label + ' ' + this.mxTimeOf(nx.when)) : this.mxDay(nx.when).label) : '');
        txt = 'Seen' + (at ? ' ' + at : '');
      }
    }
    var d = st === 'failed' ? X.fail : (st === 'sending' || st === 'queued' ? X.clock : (st === 'sent' ? X.tick1 : X.tick2));
    return { st: st, txt: txt, d: d, cls: st === 'seen' ? 'seen' : (st === 'failed' ? 'failed' : st) };
  }
  msgRetry(id, convId) { this.msgChain(id, convId, true); this.say('Trying again.'); }
  msgDiscard(id) { var d = Object.assign({}, this.state.mdel); d[id] = true; this.setState({ mdel: d, ra: this.state.ra + 1 }); this.say('Discarded. The message was not sent.'); }
  /* people named with an @ in a piece of text */
  msgMenRe() { if (this._mxRe) return this._mxRe; var d = this.msgDir(), names = Object.keys(d).map(function (k) { return d[k].name; }).sort(function (a, b) { return b.length - a.length; }); this._mxRe = new RegExp('@(' + names.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'g'); return this._mxRe; }
  msgParts(text) {
    var re = this.msgMenRe(), out = [], last = 0, m; re.lastIndex = 0;
    while ((m = re.exec(text))) { if (m.index > last) out.push({ t: text.slice(last, m.index), isMen: false, isTxt: true }); out.push({ t: m[1], isMen: true, isTxt: false }); last = m.index + m[0].length; }
    if (last < text.length) out.push({ t: text.slice(last), isMen: false, isTxt: true });
    return out.length ? out : [{ t: text, isMen: false, isTxt: true }];
  }
  msgMentionsIn(text) { var re = this.msgMenRe(), out = [], m; re.lastIndex = 0; while ((m = re.exec(text || ''))) if (out.indexOf(m[1]) < 0) out.push(m[1]); return out; }
  msgMentionPool(sel) {
    var M = this.msgModel(), dir = this.msgDir(), me = this.msgMeId(), pool = [];
    if (sel && sel.mem && sel.mem.length) pool = sel.mem.slice(); else { if (sel && sel.pp) pool.push(sel.pp); (M.team || []).forEach(function (id) { if (dir[id]) pool.push(dir[id]); }); }
    var seen = {}; return pool.filter(function (p) { if (p.id === me || seen[p.id]) return false; seen[p.id] = true; return true; });
  }
  msgDraftSet(id, v, caret) {
    var s = this.state, d = Object.assign({}, s.drafts); d[id] = v;
    var before = v.slice(0, caret == null ? v.length : caret), m = /(^|\s)@([\w.]*)$/.exec(before), patch = { drafts: d };
    if (m) { patch.mnOn = true; patch.mnq = m[2]; patch.mnI = 0; this._mnAt = before.length - m[2].length - 1; } else if (s.mnOn) patch.mnOn = false;
    this.setState(patch);
  }
  msgMentionPick(sel, p) {
    var s = this.state, v = s.drafts[sel.id] || '', at = this._mnAt != null && v.charAt(this._mnAt) === '@' ? this._mnAt : v.length - (s.mnq || '').length - 1;
    if (at < 0 || v.charAt(at) !== '@') { v += (v && !/\s$/.test(v) ? ' ' : '') + '@'; at = v.length - 1; }
    var nv = v.slice(0, at) + '@' + p.name + ' ' + v.slice(at + 1 + (s.mnq || '').length), d = Object.assign({}, s.drafts); d[sel.id] = nv;
    this.setState({ drafts: d, mnOn: false, mnq: '' }); setTimeout(function () { var el = document.getElementById('msgIn'); if (el) { el.focus(); try { el.setSelectionRange(nv.length, nv.length); } catch (e) { /* no caret */ } } }, 60);
  }
  sendMsg() {
    var self = this, s = this.state, M = this.msgModel(), all = this.msgAll();
    var c = all.filter(function (x) { return x.id === s.conv; })[0] || all[0]; if (!c) return;
    var text = (s.drafts[c.id] || '').trim(), att = s.matt || [];
    if (!text && !att.length) { this.say('Write a message or attach something first.'); return; }
    var team = M.vis && c.kind === 'client' && s.mvis === 'team', first = this.mxFirst(c.name), many = c.ckind === 'group' || c.ckind === 'project';
    var msg = Object.assign(this.msgNew(c), { text: text, when: 'Just now', kind: team ? 'note' : 'text', st: team ? 'note' : 'sending' });
    if (team) msg.status = 'Saved as a team note. ' + first + ' does not see it.'; else if (c.kind === 'client' && M.role !== 'client') msg.status = 'Delivered to the portal and emailed to ' + first; else if (c.kind === 'support') msg.status = 'Sent to support';
    if (s.mreply) msg.quote = { who: s.mreply.who, text: s.mreply.text };
    var media = att.filter(function (a) { return a.kind === 'image' || a.kind === 'video'; }), docs = att.filter(function (a) { return a.kind === 'doc'; }), link = att.filter(function (a) { return a.kind === 'link'; })[0];
    if (media.length) msg.media = media; if (docs.length) msg.files = docs; if (link) msg.link = link;
    var id = c.id + ':' + c.msgs.length, mens = this.msgMentionsIn(text), d = Object.assign({}, s.drafts); d[c.id] = '';
    this._thScroll = 0; this.setState({ mreply: null, matt: [], drafts: d, emoOn: false, mnOn: false, jumpOn: false, newBelow: 0 });
    this.msgAppend(c.id, msg);
    if (!team) this.msgChain(id, c.id);
    var note = mens.length ? ' ' + (mens.length > 2 ? mens.length + ' people are' : mens.join(' and ') + (mens.length === 1 ? ' is' : ' are')) + ' notified.' : '';
    if (s.offline && !team) this.say('Saved. It sends when you are back online.' + note);
    else this.say(team ? 'Saved as a team note. ' + first + ' does not see it.' : (c.kind === 'client' && M.role !== 'client' ? 'Sent. ' + first + ' gets it in the portal and by email.' : 'Sent to ' + (many ? c.name : first) + '.') + note);
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
          var msg = Object.assign(self.msgNew({}), { text: text, when: 'Just now', kind: 'text', st: 'sending', status: 'Delivered' + (rec.kind === 'client' && M.role !== 'client' ? ' and emailed' : '') });
          if (media.length) msg.media = media;
          var cid;
          if (ex) { cid = ex.id; var idx = ex.msgs.length; self.msgAppend(ex.id, msg); self.msgChain(ex.id + ':' + idx, ex.id); if (!first) first = ex.id; }
          else { var id = 'n' + Date.now() + names.length, pp = self.msgPersonByName(rec.name), c = { id: id, p: pp ? pp.id : null, name: rec.name, i: rec.i, tone: rec.tone, sub: rec.sub, kind: rec.kind, ckind: rec.kind === 'support' ? 'support' : 'direct', unread: 0, ctx: [], msgs: [msg], quick: [] }; self.setState({ newConvs: [c].concat(self.state.newConvs) }); self.msgChain(id + ':0', id); if (!first) first = id; }
          names.push(rec.name.split(' (')[0]);
        });
        self.setState({ conv: first, thread: true, mfilter: 'inbox', mkind: 'all', mq: '', mpage: 0, ra: self.state.ra + 1 });
        self.say(('Sent to ' + (names.length > 2 ? names[0] + ' and ' + (names.length - 1) + ' others' : names.join(' and ')) + '.' + (ctx.items.some(function (it) { return it.ref.kind === 'client' || it.ref.isNew; }) && M.role !== 'client' ? ' Clients also get an email.' : '')).replace(/\.\.+/g, '.'));
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
  msgGallery(c, tabName) {
    var self = this, I = this.icons(), med = this.msgMediaOf(c), pics = med.pics, docs = med.docs, links = med.links;
    var tabs = ['Pictures and video (' + pics.length + ')', 'Files (' + docs.length + ')', 'Links (' + links.length + ')'], first = tabName === 'Files' ? tabs[1] : (tabName === 'Links' ? tabs[2] : tabs[0]);
    this.open(this.sh({ eyebrow: 'Shared with ' + c.name, title: 'Media, files and links', icon: I.layers, wide: true, back: false, chipsFirst: true,
      body: pics.length + docs.length + links.length ? 'Everything that has been shared in this conversation, newest first.' : 'Nothing has been shared yet. Pictures, files and links you send show up here.',
      chipSets: function () { return [{ key: 'tab', label: 'Show', opts: tabs }]; }, form: { tab: first },
      gallery: function (st) { var tab = st.form.tab || ''; return /^Pictures/.test(tab) ? pics.map(function (x) { return { url: x.url, name: x.name, isVideo: x.video, isImage: !x.video, aria: 'Open ' + x.name + ', from ' + x.who + ', ' + x.when, sub: x.who + ' · ' + x.when, open: function () { self.openFile({ name: x.name, project: c.name, view: x.video ? 'video' : 'image', url: x.url, when: x.when, size: '', by: x.who, tone: 'var(--ad-tone-brand)' }, true); } }; }) : []; },
      galleryEmpty: function (st) { return /^Pictures/.test(st.form.tab || '') && !pics.length; },
      listTitle: '', list: function (st) { var tab = st.form.tab || ''; if (/^Files/.test(tab)) return docs.map(function (x) { return { t: x.f.name, s: (x.f.size || '') + ' · ' + x.who + ' · ' + x.when, ini: (x.f.ext || 'PDF'), av: x.f.tone || 'var(--ad-tone-bad)', act: { label: 'Open', fn: function () { self.openFile(x.f.view ? self.fileSpec(x.f) : { name: x.f.name, project: c.name, view: 'doc', ref: 'SHARED', docTitle: x.f.name, when: x.when, size: x.f.size, tone: 'var(--ad-tone-bad)' }, true); } } }; }); if (/^Links/.test(tab)) return links.map(function (x) { return { t: x.l.name, s: x.l.url + ' · ' + x.who + ' · ' + x.when, ini: 'URL', av: 'var(--ad-tone-brand)', act: { label: 'Open', fn: function () { self.say('The link opens in a new tab in the live product.'); } } }; }); return []; },
      primary: 'Done' }));
  }
  /* drag a message to the right to reply to it, on a phone or with a mouse */
  swipeReply(e, fn) {
    var el = e.currentTarget; if (!el || (e.target.closest && e.target.closest('button, a, input, textarea, label, video, [role=button]'))) return;
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
  /* touch: hold to react or to open the actions */
  msgHold(e, fn) {
    if (e.pointerType === 'mouse') return; var x0 = e.clientX, y0 = e.clientY, t = null, self = this;
    var stop = function () { clearTimeout(t); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
    var mv = function (ev) { if (Math.abs(ev.clientX - x0) > 8 || Math.abs(ev.clientY - y0) > 8) stop(); };
    t = setTimeout(function () { stop(); self._lp = true; fn(); }, 480);
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', stop);
  }
  msgReactToggle(id, key) {
    var s = this.state, me = this.msgMe().name, all = this.msgAll(), cid = id.split(':')[0], c = all.filter(function (x) { return x.id === cid; })[0], m = c && c.msgs.filter(function (x) { return x.id === id; })[0];
    var base = (m && m.react) || {}, ov = Object.assign({}, s.mreact[id] || {}), cur = ov[key] != null ? ov[key] : (base[key] || []).indexOf(me) >= 0; ov[key] = !cur;
    var all2 = Object.assign({}, s.mreact); all2[id] = ov; this.setState({ mreact: all2, rxFor: null, ra: s.ra + 1 });
  }
  msgRx(m) {
    var s = this.state, me = this.msgMe().name, base = m.react || {}, ov = s.mreact[m.id] || {}, out = [];
    this.mxReacts().forEach(function (r) { var k = r[0], names = (base[k] || []).filter(function (n) { return n !== me; }), mine = ov[k] != null ? ov[k] : (base[k] || []).indexOf(me) >= 0, n = names.length + (mine ? 1 : 0); if (n > 0) out.push({ k: k, label: r[1], d: r[2], n: n, mine: mine, names: names.concat(mine ? ['You'] : []) }); });
    return out;
  }
  msgToggleMute(c) {
    var self = this, was = this.isMuted(c), m = Object.assign({}, this.state.muted); m[c.id] = !was; this.setState({ muted: m, ra: this.state.ra + 1 });
    this.say(was ? 'Notifications are back on for ' + c.name + '.' : 'Muted. ' + c.name + ' stays in your list and stops buzzing your phone.', { undo: function () { var u = Object.assign({}, self.state.muted); u[c.id] = was; self.setState({ muted: u, ra: self.state.ra + 1 }); } });
  }
  msgTogglePin(c) {
    var self = this, was = this.isPinned(c), p = Object.assign({}, this.state.pinned); p[c.id] = !was; this.setState({ pinned: p, ra: this.state.ra + 1 });
    this.say(was ? 'Unpinned ' + c.name + '.' : 'Pinned. ' + c.name + ' stays at the top of your list.', { undo: function () { var u = Object.assign({}, self.state.pinned); u[c.id] = was; self.setState({ pinned: u, ra: self.state.ra + 1 }); } });
  }
  msgArchive(c, on) {
    var self = this, a = Object.assign({}, this.state.archived); a[c.id] = on; var patch = { archived: a, ra: this.state.ra + 1 }; if (on && this.state.conv === c.id) { patch.conv = null; patch.thread = false; }
    this.setState(patch);
    this.say(on ? 'Archived. Find ' + c.name + ' under Archived. A new message brings it back.' : 'Moved ' + c.name + ' back to your inbox.', { undo: function () { var u = Object.assign({}, self.state.archived); u[c.id] = !on; self.setState({ archived: u, ra: self.state.ra + 1 }); } });
  }
  msgMarkUnread(c) { var self = this, u = Object.assign({}, this.state.munread); u[c.id] = 1; this.setState({ munread: u, thread: false, ra: this.state.ra + 1 }); this.say('Marked as unread.', { undo: function () { var v = Object.assign({}, self.state.munread); delete v[c.id]; var r = Object.assign({}, self.state.mread); r[c.id] = true; self.setState({ munread: v, mread: r, ra: self.state.ra + 1 }); } }); }
  msgMenu(c, m) {
    var self = this, I = this.icons(), X = this.mxI(), it = this.menuItem.bind(this), s = this.state, out = [];
    var reply = function () { self.setState({ mreply: { id: m.id, who: m.mine ? 'yourself' : m.who, text: (m.text || (m.file && m.file.name) || (m.media && m.media.length ? m.media.length + ' pictures' : 'Attachment')).slice(0, 140) } }); setTimeout(function () { var t = document.getElementById('msgIn'); if (t) t.focus(); }, 60); };
    out.push(it('Reply', I.send, reply));
    out.push(it('React…', X.smile, function () { self.setState({ rxFor: m.id }); }));
    out.push(it('Tag…', I.target, function () { self.msgTagSheet(m); }));
    out.push(it(s.mstar[m.id] ? 'Remove the star' : 'Star it', I.check, function () { var all = Object.assign({}, self.state.mstar); if (all[m.id]) delete all[m.id]; else all[m.id] = true; self.setState({ mstar: all, ra: self.state.ra + 1 }); self.say(all[m.id] ? 'Starred. Find it under the Starred filter.' : 'Star removed.'); }));
    out.push(it('Copy the text', I.file, function () { try { navigator.clipboard.writeText(m.text || ''); self.say('Copied.'); } catch (e) { self.say('Select the text and copy it. Your browser blocked the shortcut.'); } }));
    var mk = (c.menu || []).filter(function (x) { return x.icon === 'task'; })[0]; if (mk) out.push(it(mk.t, I.task, function () { mk.fn(); }));
    return out;
  }
  threadMenu(c) {
    var self = this, I = this.icons(), X = this.mxI(), it = this.menuItem.bind(this), M = this.msgModel(), out = [];
    out.push(it('Conversation details', I.users, function () { self.setState({ info: true }); }));
    out.push(it('Media, files and links', I.layers, function () { self.msgGallery(c); }));
    if (c.pp) out.push(it('View profile', I.users, function () { self.msgProfile(c.pp.id, true); }));
    (c.menu || []).forEach(function (m) { out.push(it(m.t, I[m.icon] || I.open, function () { m.fn(); }, m.hint ? { hint: m.hint } : undefined)); });
    out.push(this.menuSep());
    out.push(it(this.isPinned(c) ? 'Unpin from the top' : 'Pin to the top', X.pin, function () { self.msgTogglePin(c); }));
    out.push(it('Mark as unread', I.msg, function () { self.msgMarkUnread(c); }));
    out.push(it(this.isMuted(c) ? 'Turn notifications back on' : 'Mute notifications', this.isMuted(c) ? X.bell : X.bellOff, function () { self.msgToggleMute(c); }));
    out.push(it(this.isArch(c) ? 'Move back to the inbox' : 'Archive conversation', X.archive, function () { self.msgArchive(c, !self.isArch(c)); }));
    return out;
  }
  rowMenu(c) {
    var self = this, I = this.icons(), X = this.mxI(), it = this.menuItem.bind(this);
    return [
      it(this.isPinned(c) ? 'Unpin from the top' : 'Pin to the top', X.pin, function () { self.msgTogglePin(c); }),
      it(this.isMuted(c) ? 'Turn notifications back on' : 'Mute notifications', this.isMuted(c) ? X.bell : X.bellOff, function () { self.msgToggleMute(c); }),
      it('Mark as unread', I.msg, function () { self.msgMarkUnread(c); }),
      this.menuSep(),
      it(this.isArch(c) ? 'Move back to the inbox' : 'Archive conversation', X.archive, function () { self.msgArchive(c, !self.isArch(c)); })
    ];
  }
  popItems(pop) {
    var self = this, I = this.icons(), X = this.mxI(), it = this.menuItem.bind(this), M = this.msgModel(), s = this.state;
    if (pop.kind === 'msg') { var pc = pop.id.split(':')[0], conv = this.msgAll().filter(function (x) { return x.id === pc; })[0], mm = conv && conv.msgs.filter(function (x) { return x.id === pop.id; })[0]; return mm ? this.msgMenu(conv, mm) : []; }
    if (pop.kind === 'thread' || pop.kind === 'row') { var c = this.msgAll().filter(function (x) { return x.id === pop.id; })[0]; return c ? (pop.kind === 'row' ? this.rowMenu(c) : this.threadMenu(c)) : []; }
    if (pop.kind === 'attmore') { var sc = this.state.conv && this.msgAll().filter(function (x) { return x.id === self.state.conv; })[0]; if (!sc) return []; return [
      it('Attach from the library', I.folder, function () { self.attachFile(sc); }), it('Attach a link', I.link, function () { self.attLinkSheet(); })
    ].concat(M.role !== 'client' && M.saved && M.saved.length && self._mxMode !== 'col' ? [it('Saved replies', X.zap, function () { self.msgSavedSheet(sc); })] : []).concat(M.role === 'admin' && self._mxMode !== 'col' ? [it('Schedule send', X.cal, function () { self.msgScheduleSheet(sc); })] : []); }
    if (pop.kind === 'chores') return [
      it('Mark all as read', I.check, function () { var m = Object.assign({}, self.state.mread); self.msgAll().forEach(function (c) { m[c.id] = true; }); self.setState({ mread: m, munread: {}, ra: self.state.ra + 1 }); self.say('Everything is marked as read.'); }),
      it('Search all messages', I.search, function () { self.setState({ pal: true, q: '' }); }, { hint: 'Ctrl K' })
    ].concat(M.role !== 'client' ? [it('New group', X.users, function () { self.msgGroupSheet(); })] : []).concat([
      it('Message notifications', I.bell, function () { window.location.href = M.settingsHref; }, { hint: 'Settings' })
    ]).concat(M.role === 'admin' ? [it('Email marketing', I.mail, function () { window.location.href = 'A-Email.dc.html'; }, { hint: 'Campaigns and contacts' })] : []).concat([
      this.menuSep(),
      it('Demo: offline banner', X.wifiOff, function () { self.setOffline(!self.state.offline); }, { checked: s.offline, hint: s.offline ? 'On' : 'Off' }),
      it('Demo: next send fails', X.fail, function () { self.setState({ failNext: !self.state.failNext }); self.say(self.state.failNext ? 'The next message will fail so you can try Retry.' : 'Sending works as normal.'); }, { checked: s.failNext, hint: s.failNext ? 'On' : 'Off' }),
      it('Demo: empty inbox', X.inbox, function () { self.setState({ demoEmpty: !self.state.demoEmpty, ra: self.state.ra + 1 }); }, { checked: s.demoEmpty, hint: s.demoEmpty ? 'On' : 'Off' }),
      it('Demo: no permission', X.lock, function () { self.setState({ demoNoPerm: !self.state.demoNoPerm, ra: self.state.ra + 1 }); }, { checked: s.demoNoPerm, hint: s.demoNoPerm ? 'On' : 'Off' })
    ]);
    return [];
  }
  pageDidUpdate(ps) {
    var s = this.state, self = this;
    if (s.ready && !this._mxBoot) {
      this._mxBoot = true; this._mxMode = this.msgMode();
      var onR = function () { var m = self.msgMode(); if (m !== self._mxMode) { self._mxMode = m; self.setState({ info: null, rz: self.state.rz + 1 }); } };
      window.addEventListener('resize', onR, { passive: true }); window.addEventListener('transitionend', function (e) { if (e.propertyName === 'width') onR(); }, true);
      if (!s.conv && this._mxMode !== 'sheet') { var v = this.msgView(); if (v.list[0]) setTimeout(function () { if (!self.state.conv) self.msgOpen(v.list[0].id); }, 0); }
    }
    var b = document.querySelector('.mxBody'); if (b && this._thScroll && Math.abs(b.scrollTop - this._thScroll) > 1) b.scrollTop = this._thScroll;
    var mode = this._mxMode || 'col'; if (s.info && mode !== 'col' && !ps.info) setTimeout(function () { var o = document.getElementById('mxOv'); if (o) o.focus({ preventScroll: true }); }, 60);
  }
  renderVals() {
    var s = this.state, self = this, I = this.icons(), X = this.mxI(), M = this.msgModel(), V = this.msgView(), all = V.all, list = V.list, q = V.q, filter = V.tab, kind = V.kind, me = this.msgMe();
    var mode = this.msgMode(); this._mxMode = mode;
    var cp = Math.min(s.mpage, Math.max(0, Math.ceil(list.length / s.mper) - 1));
    var noPerm = !!s.demoNoPerm;
    var sel = s.demoEmpty ? null : (all.filter(function (c) { return c.id === s.conv; })[0] || list[0] || null);
    var slice = list.slice(cp * s.mper, cp * s.mper + s.mper), anyPinned = list.some(function (c) { return self.isPinned(c); }) && (filter === 'inbox' || filter === 'unread');
    var convs = [], seenHead = {};
    slice.forEach(function (c, i) {
      var n = self.msgUnread(c), on = sel && sel.id === c.id && (mode !== 'sheet' || s.thread), pn = self.isPinned(c), typ = s.typing === c.id, w = typ ? self.msgTypingWho(c) : null, pr = self.mxPres(c.pp), mine = null, lastM = c.msgs.filter(function (m) { return m.kind !== 'event'; }).slice(-1)[0];
      if (anyPinned) { var hk = pn ? 'p' : 'r'; if (!seenHead[hk]) { seenHead[hk] = true; convs.push({ isHead: true, isRow: false, label: pn ? 'Pinned' : 'Recent' }); } }
      var del = lastM && lastM.mine ? self.msgDelivery(c, lastM, c.msgs.indexOf(lastM), c.msgs) : null;
      convs.push({ isHead: false, isRow: true, label: '', name: c.name, i: c.i, tone: c.tone, sub: c.ckind === 'direct' && c.pp ? self.mxRoleLine(c.pp) : c.sub, last: typ ? (w ? self.mxFirst(w.name) + ' is typing…' : 'typing…') : self.msgLast(c), when: self.mxShort(self.msgWhen(c)), unread: n, hasUnread: n > 0, fw: n > 0 ? 600 : 400, pcol: typ ? 'var(--ad-accent-ink)' : (n > 0 ? 'var(--ad-ink)' : 'var(--ad-dim)'), cls: on ? 'on' : '', current: on ? 'true' : 'false', anim: self.anim(s.ra), delay: (i * 0.035) + 's',
        avDirect: c.ckind === 'direct' || c.ckind === 'support', avGroup: c.ckind === 'group', avProj: c.ckind === 'project', dotCls: pr.cls, presT: pr.t, pinned: pn, muted: self.isMuted(c),
        hasTick: !!del && !typ, tickD: del ? del.d : '', tickCls: del ? del.cls : '', tickAria: del ? del.txt : '',
        aria: c.name + ', ' + (c.pp ? pr.t : c.sub) + (pn ? ', pinned' : '') + (self.isMuted(c) ? ', muted' : '') + (n ? ', ' + n + ' unread' : '') + '. ' + self.msgLast(c),
        open: function () { if (self._lp) { self._lp = false; return; } self.msgOpen(c.id); }, press: function (e) { self.msgHold(e, function () { self.openPop({ currentTarget: e.currentTarget }, 'row', c.id, 250, 260, 'Actions for ' + c.name); }); },
        more: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', c.id, 250, 260, 'Actions for ' + c.name); }, moreX: self.popOn('row', c.id) });
    });
    /* One row of filters, the way a phone's chat app has one: the inbox views and the kinds together; Archived is a row at the top of the list. */
    var src = s.demoEmpty ? [] : all;
    var cnt = function (tab, k) { return src.filter(function (c) { return self.msgTabIn(c, tab) && self.msgKindIn(c, k) && V.inSearch(c); }).length; };
    var unreadN0 = cnt('unread', 'all'), archN = cnt('archived', 'all');
    var filters = [['all', 'All', 'inbox', 'all', 0], ['unread', 'Unread', 'unread', 'all', unreadN0]]
      .concat(V.KINDS.filter(function (f) { return f[0] !== 'all'; }).map(function (f) { return [f[0], f[1], 'inbox', f[0], 0]; }))
      .concat([['pinned', 'Pinned', 'pinned', 'all', 0]])
      .map(function (f) {
        var on = filter !== 'archived' && filter === f[2] && kind === f[3];
        return { t: f[1], n: f[4], hasN: f[4] > 0, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ mfilter: f[2], mkind: f[3], mpage: 0, ra: s.ra + 1 }); } };
      });
    var inArch = filter === 'archived';
    var TABS = [['inbox', 'Inbox'], ['unread', 'Unread'], ['pinned', 'Pinned'], ['archived', 'Archived']];
    var tabs = TABS.map(function (t) { var on = filter === t[0]; return { label: t[1], n: (s.demoEmpty ? [] : all).filter(function (c) { return self.msgTabIn(c, t[0]) && self.msgKindIn(c, kind) && V.inSearch(c); }).length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { self.setState({ mfilter: t[0], mpage: 0, ra: s.ra + 1 }); } }; });
    var kinds = V.KINDS.map(function (f) { var on = kind === f[0]; return { t: f[1], n: (s.demoEmpty ? [] : all).filter(function (c) { return self.msgTabIn(c, filter) && self.msgKindIn(c, f[0]) && V.inSearch(c); }).length, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ mkind: f[0], mpage: 0, ra: s.ra + 1 }); } }; });
    var MG = Object.assign(this.pager('conversations', list.length, s.mper, cp, function (k) { self.setState({ mpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ mper: n, mpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ mper: 20, mpage: 0, ra: self.state.ra + 1 }); self.say('Showing all ' + list.length + ' conversations.'); } });

    var th = { aria: 'Conversation' }, msgs = [], quick = [], canVis = false, team = s.mvis === 'team', infoOpen = this.msgInfoOpen(mode), inf = this.msgInfoVals(null, mode);
    var draft = sel ? (s.drafts[sel.id] || '') : '';
    var blank = { isDate: false, isDiv: false, isTyping: false, isSched: false, isEvent: false, isMsg: false, label: '', text: '', tone: '', i: '', who: '', when: '', d: '', cls: '', bcls: '', isNote: false, starred: false, hasQuote: false, quote: { who: '', text: '' }, hasText: false, parts: [], hasMedia: false, mediaCls: '', media: [], hasDocs: false, docs: [], hasLink: false, link: {}, profRole: 'button', profTab: '0', profAria: '', hasRx: false, rx: [], hasTags: false, tags: [], hasDel: false, delCls: '', delIc: false, delD: '', delAria: '', delTxt: '', isFailed: false, hasStatus: false, status: '' };
    if (sel && !noPerm) {
      var kindT = ({ client: ['Client', 'var(--ad-tone-brand)'], team: ['Team', 'var(--ad-tone-flat)'], support: ['Support', 'var(--ad-tone-live)'] })[sel.kind] || ['Team', 'var(--ad-tone-flat)'];
      if (sel.ckind === 'group') kindT = ['Group', 'var(--ad-tone-flat)']; if (sel.ckind === 'project') kindT = ['Project', 'var(--ad-tone-brand)'];
      var direct = sel.ckind === 'direct' || sel.ckind === 'support', p = sel.pp, pr = this.mxPres(p), typ = s.typing === sel.id, tw = typ ? this.msgTypingWho(sel) : null, mem = sel.mem || [], online = mem.filter(function (x) { return x.id !== me.id && x.pres === 'on'; }).length;
      var sub = direct ? (p ? pr.t + (p.grp !== p.role ? ' · ' + p.grp : '') : sel.sub) : (sel.ckind === 'project' ? 'Project channel · ' : '') + mem.length + ' members · ' + online + ' active';
      if (typ) sub = (tw ? this.mxFirst(tw.name) : 'Someone') + ' is typing…';
      var brief = s.briefs[sel.id] != null ? s.briefs[sel.id] : (sel.brief || '');
      th = { aria: 'Conversation with ' + sel.name, name: sel.name.split(' (')[0], i: sel.i, tone: sel.tone, avDirect: direct, avGroup: sel.ckind === 'group', avProj: sel.ckind === 'project', dotCls: direct ? pr.cls : 'off', presT: pr.t, showDot: direct && !typ && !!p, sub: sub, subCls: typ ? 'typ' : '',
        who: function () { if (direct && p) self.msgProfile(p.id, true); else self.setState({ info: true }); }, whoAria: direct && p ? 'Open the profile of ' + sel.name : 'Open the details of ' + sel.name,
        hasKind: true, kind: kindT[0], kindTone: kindT[1], kindInk: kindT[1] === 'var(--ad-tone-flat)' ? 'var(--ad-on-flat)' : '#fff',
        meet: function () { self.msgMeetSheet(direct && p && p.cid ? p.grp : sel.name.split(' (')[0], true, p && p.id); },
        info: function () { self.setState({ info: !self.msgInfoOpen(mode) }); }, infoOn: infoOpen ? 'true' : 'false', infoCls: '',
        menu: function (e) { self.openPop(e, 'thread', sel.id, 270, 380, 'More for ' + sel.name); }, menuX: self.popOn('thread', sel.id),
        hasBrief: sel.ckind === 'project' && !!brief, briefText: brief, brief: function () { self.msgBriefSheet(sel); },
        hasCtx: !!(sel.ctx && sel.ctx.length), ctx: (sel.ctx || []).map(function (x) { var tone = x.tone ? self.msgTone(x.tone) : null; return { t: x.t, d: I[x.icon] || I.link, hasTag: !!x.tag, tag: x.tag, tone: tone ? tone[0] : '', ink: tone ? tone[1] : '', open: function () { if (x.href) window.location.href = x.href; else if (x.fn) x.fn(); } }; }) };
      inf = this.msgInfoVals(sel, mode);
      var rows = sel.msgs.filter(function (m) { return !s.mdel[m.id]; });
      var qlow = s.msOn ? s.msq.trim().toLowerCase() : '';
      var incoming = []; rows.forEach(function (m, i) { if (m.kind !== 'event' && !m.mine) incoming.push(i); });
      var nUn = Math.min(this.msgDividerN(sel), incoming.length), divAt = nUn > 0 ? incoming[incoming.length - nUn] : -1;
      var match = function (m) { return !qlow || (m.kind !== 'event' && ((m.text || '') + ' ' + (m.file ? m.file.name : '') + ' ' + ((m.files || []).map(function (f) { return f.name; }).join(' ')) + ' ' + (m.link ? m.link.name : '')).toLowerCase().indexOf(qlow) >= 0); };
      var tagInk = function (t) { return self.msgTone(self.msgTagTone(t)); };
      var lastMine = -1; rows.forEach(function (m, i) { if (m.mine && m.kind !== 'note') lastMine = i; });
      var items = [], prevDay = null, shown = 0;
      rows.forEach(function (m, i) {
        if (!match(m)) return; shown++;
        var ev = m.kind === 'event', note = m.kind === 'note', tags = s.mtags[m.id] || [], docsAll = (m.file ? [m.file] : []).concat(m.files || []), media = m.media || [];
        var dy = self.mxDay(m.when);
        if (!qlow && dy.k !== prevDay) { items.push(Object.assign({}, blank, { isDate: true, label: dy.label })); prevDay = dy.k; }
        if (!qlow && i === divAt) items.push(Object.assign({}, blank, { isDiv: true, label: nUn + ' unread' }));
        if (ev) { items.push(Object.assign({}, blank, { isEvent: true, text: m.text, d: I.clock })); return; }
        var qt = m.quote ? { who: m.quote.who, text: m.quote.text } : { who: '', text: '' };
        var reply = function () { self.setState({ mreply: { id: m.id, who: m.mine ? 'yourself' : m.who, text: (m.text || (m.file && m.file.name) || (media.length ? media.length + (media.length === 1 ? ' picture' : ' pictures') : 'Attachment')).slice(0, 140) } }); setTimeout(function () { var t = document.getElementById('msgIn'); if (t) t.focus(); }, 60); };
        var del = m.mine && (i === lastMine || ['sending', 'queued', 'failed'].indexOf((s.mstate[m.id] || {}).st || m.st) >= 0) ? self.msgDelivery(sel, m, i, rows) : null;
        var who = m.mine ? me : self.msgPersonByName(m.who), rx = self.msgRx(m), rxOn = s.rxFor === m.id;
        var openProf = function () { if (m.mine) self.say('That is you. Edit your profile in Settings.'); else if (who) self.msgProfile(who.id, true); else self.say('Their profile appears once they have replied.'); };
        items.push(Object.assign({}, blank, { id: m.id, isMsg: true, text: m.text || '', hasText: !!m.text, parts: m.text ? self.msgParts(m.text) : [], who: m.mine ? 'You' : m.who, i: m.i, tone: m.tone, when: m.when, isNote: note, bcls: note ? 'note' : '', cls: m.mine ? 'mine' : '',
          hasQuote: !!m.quote, quote: qt, hasTags: tags.length > 0, tags: tags.map(function (t) { var tn = tagInk(t); return { t: t, tone: tn[0], ink: tn[1] }; }), starred: !!s.mstar[m.id],
          hasMedia: media.length > 0, mediaCls: 'mg mg' + Math.min(media.length, 4), media: media.slice(0, 4).map(function (x2, k) { return { url: x2.url, isVideo: x2.kind === 'video', isImage: x2.kind !== 'video', name: x2.name, more: k === 3 && media.length > 4 ? '+' + (media.length - 3) : '', hasMore: k === 3 && media.length > 4, aria: 'Open ' + x2.name, open: function () { self.openFile({ name: x2.name, project: sel.name, view: x2.kind === 'video' ? 'video' : 'image', url: x2.url, when: m.when, size: x2.size || '', by: m.mine ? 'You' : m.who, tone: 'var(--ad-tone-brand)' }, false); } }; }),
          hasDocs: docsAll.length > 0, docs: docsAll.map(function (f) { return { name: f.name, size: f.size, ext: f.ext || 'PDF', tone: f.tone || 'var(--ad-tone-bad)', aria: 'Open ' + f.name, open: function () { self.openFile(f.view ? self.fileSpec(f) : { name: f.name, project: sel.name, view: 'doc', ref: 'SHARED', docTitle: f.name, when: m.when, size: f.size, tone: 'var(--ad-tone-bad)' }); } }; }),
          hasLink: !!m.link, link: m.link ? { name: m.link.name, url: m.link.url, aria: 'Open the link ' + m.link.name, open: function () { self.say('The link opens in a new tab in the live product.'); } } : {},
          hasRx: rx.length > 0, rx: rx.map(function (r) { return { d: r.d, n: r.n, cls: r.mine ? 'on' : '', pressed: r.mine ? 'true' : 'false', title: r.names.join(', '), aria: r.label + ', ' + r.n + (r.n === 1 ? ' reaction' : ' reactions') + ': ' + r.names.join(', ') + '. ' + (r.mine ? 'Press to remove yours.' : 'Press to add yours.'), toggle: function () { self.msgReactToggle(m.id, r.k); } }; }),
          rxOpen: rxOn ? 'true' : 'false', rxBarOn: rxOn, rxClose: function () { self.setState({ rxFor: null }); },
          rxBar: self.mxReacts().map(function (r) { var mine = rx.filter(function (x) { return x.k === r[0]; })[0]; var on = !!(mine && mine.mine); return { d: r[2], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', aria: (on ? 'Remove ' : 'React: ') + r[1], pick: function () { self.msgReactToggle(m.id, r[0]); } }; }),
          react: function () { self.setState({ rxFor: rxOn ? null : m.id }); },
          hasDel: !!del, delCls: del ? del.cls : '', delIc: !!del, delD: del ? del.d : '', delAria: del ? del.txt : '', delTxt: del ? del.txt : '', isFailed: !!del && del.st === 'failed', retry: function () { self.msgRetry(m.id, sel.id); }, discard: function () { self.msgDiscard(m.id); },
          profRole: m.mine ? 'presentation' : 'button', profTab: m.mine ? '-1' : '0', profAria: m.mine ? 'You' : 'Open the profile of ' + m.who, profile: openProf, profKey: function (e) { if (e && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openProf(); } },
          reply: reply, swipe: function (e) { self.msgHold(e, function () { self.setState({ rxFor: m.id }); }); self.swipeReply(e, reply); }, more: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'msg', m.id, 250, 320, 'Message actions'); }, moreX: self.popOn('msg', m.id),
          hasStatus: !!(m.mine && m.status && i === lastMine && note), status: m.status || '' }));
      });
      if (typ && !qlow) items.push(Object.assign({}, blank, { isTyping: true, i: tw ? tw.i : sel.i, tone: tw ? tw.tone : sel.tone, label: (tw ? self.mxFirst(tw.name) : 'Someone') + ' is typing' }));
      if (!qlow) s.sched.filter(function (x) { return x.conv === sel.id; }).forEach(function (x) {
        items.push(Object.assign({}, blank, { isSched: true, text: x.text, when: x.when,
          sendNow: function () { var sc = self.state.sched.filter(function (y) { return y.id !== x.id; }), cc = sel, idx = cc.msgs.length, msg = Object.assign(self.msgNew(cc), { text: x.text, when: 'Just now', kind: 'text', st: 'sending', status: cc.kind === 'client' && M.role !== 'client' ? 'Delivered to the portal and emailed to ' + self.mxFirst(cc.name) : '' }); self.setState({ sched: sc }); self.msgAppend(cc.id, msg); self.msgChain(cc.id + ':' + idx, cc.id); self.say('Sent now.'); },
          cancel: function () { self.setState({ sched: self.state.sched.filter(function (y) { return y.id !== x.id; }), ra: self.state.ra + 1 }); self.say('Cancelled. The message was not sent.', { undo: function () { self.setState({ sched: self.state.sched.concat([x]), ra: self.state.ra + 1 }); } }); } }));
      });
      th.searchCount = qlow ? shown + (shown === 1 ? ' match' : ' matches') : '';
      msgs = items.reverse();
      quick = M.role === 'client' ? [] : (sel.quick || []).map(function (t) { return { t: t, pick: function () { var d = Object.assign({}, self.state.drafts); d[sel.id] = t; self.setState({ drafts: d }); setTimeout(function () { var el = document.getElementById('msgIn'); if (el) el.focus(); }, 40); } }; });
      canVis = !!(M.vis && sel.kind === 'client');
    }
    var unreadN = all.filter(function (c) { return !self.isArch(c) && self.msgUnread(c) > 0; }).length, total = this.msgUnreadTotal();
    var hasFilter = !!q || kind !== 'all';
    /* the empty states: nothing at all, nothing under a filter, nothing in a view */
    var emptyTitle, emptyBody, emptyD = X.inbox, emptyNew = false;
    if (q) { emptyTitle = 'No conversation matches "' + s.mq + '".'; emptyBody = 'Search by name, project or a word in a message.'; emptyD = X.search; }
    else if (kind !== 'all') { emptyTitle = 'Nothing under ' + (V.KINDS.filter(function (f) { return f[0] === kind; })[0] || ['', 'this filter'])[1] + ' here.'; emptyBody = 'Clear the filter to see everything in this view.'; emptyD = X.search; }
    else if (filter === 'unread') { emptyTitle = 'Nothing unread.'; emptyBody = 'You are all caught up. That is a good place to be.'; emptyD = I.check; }
    else if (filter === 'pinned') { emptyTitle = 'Nothing pinned yet.'; emptyBody = 'Pin a conversation from its menu to keep it at the top.'; emptyD = X.pin; }
    else if (filter === 'archived') { emptyTitle = 'Nothing archived.'; emptyBody = 'Archive a conversation to tidy your inbox. A new message from them brings it back.'; emptyD = X.archive; }
    else { emptyTitle = 'Your inbox is empty.'; emptyBody = M.emptyBody || 'Start a conversation with New message.'; emptyNew = true; }
    var mens = (function () { var out = [], seen = {}; self.msgMentionsIn(draft).forEach(function (n) { var pp = self.msgPersonByName(n); if (pp && !seen[pp.id]) { seen[pp.id] = true; out.push({ name: pp.name, i: pp.i, tone: pp.tone, remove: function () { var d = Object.assign({}, self.state.drafts); d[sel.id] = (d[sel.id] || '').split('@' + pp.name + ' ').join('').split('@' + pp.name).join('').replace(/\s{2,}/g, ' '); self.setState({ drafts: d }); } }); } }); return out; })();
    var mnq = (s.mnq || '').toLowerCase(), pool = sel ? this.msgMentionPool(sel).filter(function (p) { return !mnq || (p.name + ' ' + p.role + ' ' + p.grp).toLowerCase().indexOf(mnq) >= 0; }).slice(0, 5) : [];
    var mnI = Math.min(s.mnI, Math.max(0, pool.length - 1)), mnList = pool.map(function (p, k) { return { name: p.name, role: p.role + ' · ' + p.grp, i: p.i, tone: p.tone, cls: k === mnI ? 'on' : '', sel: k === mnI ? 'true' : 'false', pick: function () { self.msgMentionPick(sel, p); } }; });
    var EMO = this.mxEmoji(), eq = (s.emoq || '').trim().toLowerCase(), emoF = EMO.filter(function (e) { return !eq || e.k.indexOf(eq) >= 0; });
    var emoItem = function (e) { return { c: e.c, name: e.k.split(' ')[0], pick: function () { self.msgEmojiPick(sel, e.c); } }; };
    var recents = s.emoRecent.map(function (c) { var f = EMO.filter(function (e) { return e.c === c; })[0]; return emoItem(f || { c: c, k: 'emoji' }); });
    var attN = (s.matt || []).length, sendDis = !draft.trim() && !attN;
    var sendHint = sendDis ? 'Write a message or attach something to send it.' : (s.offline ? 'You are offline. This sends when you are back.' : 'Enter to send, Shift Enter for a new line');
    var ovOn = !!sel && !noPerm && infoOpen && mode !== 'col';
    return Object.assign(this.kit(), this.extraVals(), M.vals ? M.vals(this) : {}, {
      ledeA: s.demoEmpty ? 'Your inbox is empty.' : total ? total + (total === 1 ? ' unread message' : ' unread messages') + ' in ' + unreadN + (unreadN === 1 ? ' conversation.' : ' conversations.') : 'You are all caught up.', ledeB: M.waiting ? M.waiting(this, all) : '',
      skRows: [1, 2, 3, 4, 5], modeCls: 'm-' + mode, paneCls: s.thread ? 'isThread' : '', infoCls: mode === 'col' && infoOpen && sel && !noPerm ? 'hasInfo' : '', showInfoCol: mode === 'col' && infoOpen && !!sel && !noPerm,
      offline: s.offline, goOnline: function () { self.setOffline(false); },
      tabs: tabs, hasKinds: V.KINDS.length > 0, kinds: kinds, filters: filters, archRow: inArch || archN > 0, archLabel: inArch ? 'Archived conversations' : 'Archived', archN: inArch ? 'Back to the inbox' : archN, archD: inArch ? 'm12 19-7-7 7-7M19 12H5' : 'M21 8v13H3V8M1 3h22v5H1zM10 12h4', archGo: function () { self.setState({ mfilter: inArch ? 'inbox' : 'archived', mkind: 'all', mpage: 0, ra: s.ra + 1 }); }, hasLede: !!(M.waiting && M.waiting(self, all)), convs: convs, MG: MG, mq: s.mq, hasMq: !!s.mq,
      onMq: function (e) { self.setState({ mq: e.target.value, mpage: 0, ra: self.state.ra + 1 }); }, clearMq: function () { self.setState({ mq: '', ra: self.state.ra + 1 }); }, clearFilters: function () { self.setState({ mq: '', mkind: 'all', mpage: 0, ra: self.state.ra + 1 }); },
      noConvs: !list.length, hasFilter: hasFilter, emptyTitle: emptyTitle, emptyBody: emptyBody, emptyD: emptyD, emptyNew: emptyNew,
      hasThread: !!sel && !noPerm, noThread: !sel && !noPerm, noPerm: noPerm, noPermT: M.role === 'admin' ? 'You are not a member of this channel' : 'You do not have access to this conversation', noPermB: M.role === 'admin' ? 'Only members can read a channel. Add yourself and it opens with its full history.' : 'It belongs to a project you are not part of. Ask Admin to add you and it appears here with its full history.', noPermBtn: M.role === 'admin' ? 'Add me to the channel' : 'Ask Admin for access',
      askAccess: function () { if (M.role === 'admin') { self.setState({ demoNoPerm: false, ra: self.state.ra + 1 }); self.say('Added. The channel is open in your list.'); } else self.say('Admin has been asked. You get a message here when you are added.'); },
      th: th, msgs: msgs, noMsgs: !msgs.length && !!sel, quick: quick, hasQuick: quick.length > 0,
      hasReply: !!s.mreply, replyWho: s.mreply ? s.mreply.who : '', replyText: s.mreply ? s.mreply.text : '', cancelReply: function () { self.setState({ mreply: null }); },
      hasAtt: attN > 0, attN: attN + ' attached', att: (s.matt || []).map(function (a, k) { return { name: a.name, size: a.size || '', ext: a.ext || '', url: a.url || '', isImg: a.kind === 'image', isVid: a.kind === 'video', isDoc: a.kind === 'doc', isLink: a.kind === 'link', aria: 'Remove ' + a.name, remove: function () { var c = (self.state.matt || []).slice(); c.splice(k, 1); self.setState({ matt: c }); } }; }),
      attFilesPhoto: function (e) { if (e && e.target && e.target.files) { self.attFromFiles(e.target.files); e.target.value = ''; } }, attFilesDoc: function (e) { if (e && e.target && e.target.files) { self.attFromFiles(e.target.files); e.target.value = ''; } },
      attLib: function () { if (sel) self.attachFile(sel); }, attLink: function () { self.attLinkSheet(); },
      toggleSearch: function () { self.setState({ msOn: !self.state.msOn, msq: '' }); setTimeout(function () { var t = document.getElementById('msq'); if (t) t.focus(); }, 60); },
      msOn: s.msOn, msq: s.msq, onMsq: function (e) { self.setState({ msq: e.target.value }); }, closeSearch: function () { self.setState({ msOn: false, msq: '' }); }, searchPressed: s.msOn ? 'true' : 'false', canVis: canVis, visI: team ? 1 : 0, vClient: team ? '' : 'on', vTeam: team ? 'on' : '', pClient: team ? 'false' : 'true', pTeam: team ? 'true' : 'false', clientLabel: M.clientLabel || 'Client sees it',
      visHint: team ? 'Only the team sees this note. It never reaches the client.' : 'Goes to the client’s portal and email.', setClient: function () { self.setState({ mvis: 'client' }); }, setTeam: function () { self.setState({ mvis: 'team' }); },
      ph: sel ? (sel.group || sel.ckind === 'project' ? 'Message ' + sel.name : 'Reply to ' + sel.name.split(' (')[0].split(' ')[0]) : 'Write a message', draft: draft,
      onDraft: function (e) { if (sel) self.msgDraftSet(sel.id, e.target.value, e.target.selectionStart); },
      onKey: function (e) {
        var k = e.key;
        if (self.state.mnOn && pool.length) {
          if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); self.setState({ mnI: (mnI + (k === 'ArrowDown' ? 1 : pool.length - 1)) % pool.length }); return; }
          if (k === 'Enter' || k === 'Tab') { e.preventDefault(); self.msgMentionPick(sel, pool[mnI]); return; }
        }
        if (k === 'Escape' && (self.state.mnOn || self.state.emoOn)) { e.preventDefault(); self.setState({ mnOn: false, emoOn: false }); return; }
        if (k === 'Enter' && !e.shiftKey && !e.isComposing && !self.isPhone()) { e.preventDefault(); self.sendMsg(); return; }
        if ((e.ctrlKey || e.metaKey) && k === 'Enter') { e.preventDefault(); self.sendMsg(); }
      },
      moreOptX: this.popOn('attmore', 'attmore'), openMoreOpt: function (e) { self.openPop(e, 'attmore', 'attmore', 270, 240, 'More options'); },
      send: function () { self.sendMsg(); }, sendDis: sendDis, sendHint: sendHint, hintCls: sendDis ? 'mxWhy' : 'tip',
      canSaved: M.role !== 'client' && !!(M.saved && M.saved.length), openSaved: function () { if (sel) self.msgSavedSheet(sel); }, canSched: M.role === 'admin', openSched: function () { if (sel) self.msgScheduleSheet(sel); },
      hasMens: mens.length > 0, mens: mens, mnOn: s.mnOn, mnList: mnList, mnNone: !mnList.length,
      startMention: function () { if (!sel) return; var d = Object.assign({}, self.state.drafts), v = d[sel.id] || ''; v += (v && !/\s$/.test(v) ? ' ' : '') + '@'; d[sel.id] = v; self._mnAt = v.length - 1; self.setState({ drafts: d, mnOn: true, mnq: '', mnI: 0, emoOn: false }); setTimeout(function () { var el = document.getElementById('msgIn'); if (el) { el.focus(); try { el.setSelectionRange(v.length, v.length); } catch (er) { /* no caret */ } } }, 60); },
      emoOn: s.emoOn, emoX: s.emoOn ? 'true' : 'false', toggleEmo: function () { self.setState({ emoOn: !self.state.emoOn, emoq: '', mnOn: false }); if (!self.state.emoOn) setTimeout(function () { var el = document.getElementById('emoq'); if (el) el.focus(); }, 80); },
      emoq: s.emoq, onEmoq: function (e) { self.setState({ emoq: e.target.value }); }, emoHasRecent: !eq && recents.length > 0, emoRecent: recents, emoList: emoF.map(emoItem), emoNone: !emoF.length, emoLabel: eq ? 'Results' : 'All emoji',
      onThScroll: function (e) { var el = e && (e.currentTarget || e.target); if (!el) return; var t = el.scrollTop; self._thScroll = t; var up = t < -140; if (up !== self.state.jumpOn) self.setState(up ? { jumpOn: true } : { jumpOn: false, newBelow: 0 }); },
      jumpOn: s.jumpOn, newBelow: s.newBelow, hasNewBelow: s.newBelow > 0, jumpLatest: function () { var el = document.querySelector('.mxBody'); self._thScroll = 0; if (el) { try { el.scrollTo({ top: 0, behavior: self.reduce ? 'auto' : 'smooth' }); } catch (er) { el.scrollTop = 0; } } self.setState({ jumpOn: false, newBelow: 0 }); },
      inf: inf, ovOn: ovOn, ovCls: 'm-' + mode, ovKey: function (e) { if (e && e.key === 'Escape') { e.stopPropagation(); self.setState({ info: false }); } },
      backToList: function () { self.setState({ thread: false }); }, newMsg: function () { self.msgNewSheet(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 270, 420, 'More for messages'); }, choresX: this.popOn('chores', 'chores')
    });
  }
  msgEmojiPick(sel, c) {
    var s = this.state, d = Object.assign({}, s.drafts); d[sel.id] = (d[sel.id] || '') + c;
    var rec = [c].concat(s.emoRecent.filter(function (x) { return x !== c; })).slice(0, 8);
    this.setState({ drafts: d, emoRecent: rec, emoOn: false, emoq: '' }); setTimeout(function () { var el = document.getElementById('msgIn'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* no caret */ } } }, 60);
  }
  msgTone(t) { return ({ warn: ['var(--ad-tone-warn)', '#fff'], bad: ['var(--ad-tone-bad)', '#fff'], good: ['var(--ad-tone-good)', '#fff'], live: ['var(--ad-tone-live)', '#fff'], flat: ['var(--ad-tone-flat)', 'var(--ad-on-flat)'], brand: ['var(--ad-tone-brand)', '#fff'] })[t] || ['var(--ad-tone-flat)', 'var(--ad-on-flat)']; }
