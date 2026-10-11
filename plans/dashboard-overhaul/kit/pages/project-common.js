  /* ======================= The project page, shared by all three roles =======================
     The role file supplies projectModel(); this file turns it into the page. */
  pageState() { return Object.assign({ ptab: 'overview', ta: 0, ttab: 'open', tpage: 0, tper: 5, ra: 0, calView: 'week', calIdx: 0, plat: 'all', ca: 0, fpage: 0, fper: 5, apage: 0, aper: 5, aa: 0, tstat: {}, extraTasks: [], extraPosts: [], postEdits: {}, postSt: {}, apDone: {}, sw: 0, wchk: {}, posted: [], pmem: null, picon: null }, this.modelState ? this.modelState() : {}); }
  pageName() { return this.projectModel().pj.name; }
  tourSteps() {
    var I = this.icons(), M = this.projectModel(), out = [{ target: 'stage', title: 'Where the project stands', icon: I.layers, body: 'Each stage in order. The line under it says what the current stage needs.' }, { target: 'tabs', title: 'Everything in one place', icon: I.folder, body: M.role === 'client' ? 'What we are doing, what needs your yes, your files and the history.' : 'Tasks, the content calendar, approvals, files' + (M.role === 'admin' ? ', money' : '') + ' and the history.' }];
    if (M.blockers && M.blockers.length) out.push({ target: 'blockers', title: M.role === 'client' ? 'What we need from you' : 'What is in the way', icon: I.alert, body: 'Each item has the action that clears it.' });
    out.push({ target: 'search|searchS', title: 'Jump anywhere', icon: I.search, body: 'Press Ctrl K to find any project, file or invoice.' });
    return out;
  }
  postTone(st) { return { draft: ['Draft', 'var(--ad-tone-flat)', 'var(--ad-on-flat)'], client: ['With client', 'var(--ad-tone-warn)', '#fff'], approved: ['Approved', 'var(--ad-tone-good)', '#fff'], scheduled: ['Scheduled', 'var(--ad-tone-brand)', '#fff'], posted: ['Posted', 'var(--ad-tone-neutral)', '#fff'], changes: ['Changes asked', 'var(--ad-tone-bad)', '#fff'] }[st]; }
  postState(p) { var s = this.state; if (s.okPosts[p.id]) return 'approved'; if (s.askedPosts[p.id]) return 'client'; return s.postSt[p.id] || p.st; }
  allPosts() { var E = this.state.postEdits; return this.state.extraPosts.concat(this.projectModel().posts || []).map(function (p) { return E[p.id] ? Object.assign({}, p, E[p.id]) : p; }); }
  postView(p) {
    var L = this.socialLogos(), M = this.projectModel(), st = this.postState(p), T = this.postTone(st);
    return Object.assign({}, p, { platform: { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' }[p.plat], logo: L[p.plat], client: M.pj.client, handle: M.handle, when: p.dayLabel + ', ' + p.time, status: T[0], statusTone: T[1], owner: M.postOwner, cmtNote: M.role === 'client' ? 'Anything you write here goes to ' + M.postOwner + '.' : 'The client sees comments in their portal.' });
  }
  dayLabel(key) { var d = new Date(2026, +key.split('-')[0] - 1, +key.split('-')[1]); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]; }
  taskSheetFor(t) {
    var self = this, I = this.icons(), opts = [['todo', 'To do'], ['doing', 'In progress'], ['review', 'In review'], ['done', 'Done']], cur = this.state.tstat[t.id] || t.st, pick = 0;
    opts.forEach(function (o, i) { if (o[0] === cur) pick = i; });
    return this.sh({ eyebrow: 'Task · ' + this.projectModel().pj.name, title: t.t, icon: I.task, rows: [{ k: 'Who', v: t.who }, { k: 'Due', v: t.due }], body: t.s, listTitle: 'Status', select: true, pick: pick, list: opts.map(function (o) { return { t: o[1] }; }),
      primary: function (ctx) { return ctx.pick === pick ? 'Close' : 'Move to ' + opts[ctx.pick][1].toLowerCase(); }, secondary: 'Add a comment',
      onPrimary: function (ctx) { if (ctx.pick === pick) return; var prev = Object.assign({}, self.state.tstat), n = Object.assign({}, prev); n[t.id] = opts[ctx.pick][0]; self.setState({ tstat: n, ra: self.state.ra + 1 }); self.say('Moved to ' + opts[ctx.pick][1].toLowerCase() + '.', { undo: function () { self.setState({ tstat: prev, ra: self.state.ra + 1 }); } }); },
      onSecondary: function () { self.ask({ eyebrow: 'Comment', title: 'Comment on "' + t.t + '"', input: true, inputLabel: 'Comment', inputPh: 'Only the team sees this', ok: 'Add comment', icon: I.msg, back: true, okToast: 'Comment added. ' + t.who.split(' ')[0] + ' gets a notice.' }, true); return 'stay'; } });
  }
  /* Plan a post, or edit one. Platforms, format, caption, pictures and video, then the day and time from the site's own pickers. */
  planPostSheet(dayKeys, edit, push) {
    var self = this, I = this.icons(), M = this.projectModel(), conn = M.platforms || ['Instagram', 'Facebook', 'TikTok'], FM = ['Post', 'Carousel', 'Reel', 'Story'];
    var limit = { Instagram: 2200, Facebook: 5000, TikTok: 2200 }, keyOf = function (iso) { return (+iso.slice(5, 7)) + '-' + (+iso.slice(8)); }, isoOf = function (k) { var p = k.split('-'); return '2026-' + ('0' + p[0]).slice(-2) + '-' + ('0' + p[1]).slice(-2); };
    var start = edit ? { title: edit.title, cap: edit.cap === 'Caption to come.' ? '' : edit.cap, plat: [conn.filter(function (c) { return c.toLowerCase() === edit.plat; })[0] || conn[0]], fmt: edit.fmt || 'Post', when: isoOf(edit.key), whenT: edit.time, media: edit.media || [] }
      : { plat: [conn[0]], fmt: 'Post', when: '2026-10-13', whenT: '12:30', media: [] };
    this.open(this.sh({ eyebrow: 'Content calendar · ' + M.pj.client, title: edit ? 'Edit post' : 'Plan a post', icon: I.cal, wide: true, chipsFirst: true, focus: 'f-title',
      body: edit ? 'Changing a post the client has seen sends it back for their approval.' : 'Plan it here. Nothing reaches the client until you send it for approval.',
      fields: function (st) {
        var f = st.form, long = Math.min.apply(null, (f.plat && f.plat.length ? f.plat : conn).map(function (p) { return limit[p] || 2200; }));
        return [{ key: 'title', label: 'Working title', ph: 'For example: Serum restock', wide: true },
          { key: 'cap', label: 'Caption', type: 'area', wide: true, ph: 'The client reads this when you send it for approval.', hint: (f.cap || '').length.toLocaleString('en-NG') + ' of ' + long.toLocaleString('en-NG') + ' characters' + (f.plat && f.plat.length > 1 ? ' (the shortest limit of the platforms you chose)' : ''), check: function (v) { return v.length > long ? 'That is over the limit by ' + (v.length - long) + ' characters.' : ''; } },
          { key: 'media', type: 'media', label: 'Pictures and video', max: f.fmt === 'Carousel' ? 10 : 4, hint: f.fmt === 'Carousel' ? 'A carousel takes two to ten pictures.' : (f.fmt === 'Reel' ? 'A reel is one video, up to 90 seconds, 9 by 16.' : (f.fmt === 'Story' ? 'A story is one picture or video, 9 by 16.' : 'One to four pictures, or a video.')) },
          { key: 'when', type: 'datetime', label: 'Publish on', timeLabel: 'Time', hint: 'Best times from the last 30 days: 12:30 and 18:00.' }];
      },
      chipSets: [{ key: 'plat', label: edit ? 'Platform' : 'Platforms', multi: !edit, opts: conn, hint: edit ? '' : 'Pick more than one and each gets its own draft with the same caption and media.' }, { key: 'fmt', label: 'Format', opts: FM }],
      form: Object.assign({}, start),
      primary: edit ? 'Save changes' : function (ctx) { var n = (ctx.form.plat || []).length; return n > 1 ? 'Add ' + n + ' drafts' : 'Add as draft'; }, secondary: 'Cancel', back: !!push,
      primaryDis: function (ctx) {
        var f = ctx.form, md = f.media || [], vids = md.filter(function (m) { return m.kind === 'video'; }).length, imgs = md.length - vids, cap = (f.cap || '').length;
        if (!(f.title || '').trim()) return 'Give the post a working title.';
        if (!(f.plat && f.plat.length)) return 'Choose at least one platform.';
        if (f.fmt === 'Carousel' && imgs < 2) return 'A carousel needs at least two pictures.';
        if (f.fmt === 'Reel' && vids !== 1) return 'A reel needs one video.';
        if (f.fmt === 'Story' && md.length !== 1) return 'A story needs one picture or one video.';
        if (cap > Math.min.apply(null, f.plat.map(function (p) { return limit[p] || 2200; }))) return 'Shorten the caption to fit.';
        if (!f.when) return 'Choose the day it goes out.';
        if (!f.whenT) return 'Choose the time it goes out.';
        if (f.when === self.today() && f.whenT < '12:00') return 'That time has passed today. Choose a later time.';
        return '';
      },
      onPrimary: function (ctx) {
        var f = ctx.form, key = keyOf(f.when), thumb = (f.media || []).filter(function (m) { return m.kind === 'image'; })[0], base = { title: f.title.trim(), cap: (f.cap || '').trim() || 'Caption to come.', key: key, time: f.whenT, fmt: f.fmt, media: f.media || [], thumb: thumb ? thumb.url : '', hasThumb: !!thumb, hasMedia: !!(f.media || []).length, mediaN: (f.media || []).length };
        if (edit) {
          var E = Object.assign({}, self.state.postEdits), ok = Object.assign({}, self.state.okPosts), asked = Object.assign({}, self.state.askedPosts), seen = ok[edit.id] || asked[edit.id] || edit.st === 'client';
          E[edit.id] = Object.assign({}, base, { plat: f.plat[0].toLowerCase() }); delete ok[edit.id]; delete asked[edit.id];
          var st = Object.assign({}, self.state.postSt); if (seen) st[edit.id] = 'draft';
          self.setState({ postEdits: E, okPosts: ok, askedPosts: asked, postSt: st, ca: self.state.ca + 1 });
          self.say(seen ? 'Updated. It went back to draft, so send it for approval again.' : 'Updated. ' + self.fmtDate(f.when) + ', ' + f.whenT + '.');
          return;
        }
        var made = f.plat.map(function (pl, i) { return Object.assign({ id: 'np' + Date.now() + i, plat: pl.toLowerCase(), st: 'draft', art: '#3d2a5c', comments: [] }, base); });
        self.setState({ extraPosts: made.concat(self.state.extraPosts), ca: self.state.ca + 1 });
        self.say(made.length > 1 ? made.length + ' drafts added for ' + self.fmtDate(f.when) + ', ' + f.whenT + '.' : 'Draft added for ' + self.fmtDate(f.when) + ', ' + f.whenT + '. Send it for approval when it is ready.');
      } }), !!push);
  }
  projTaskFacets(TL) {
    var uniq = function (f) { var o = []; TL.forEach(function (x) { var v = f(x); if (v && o.indexOf(v) < 0) o.push(v); }); return o; };
    return [{ k: 'st', t: 'Status', opts: ['To do', 'In progress', 'In review', 'Done'], get: function (t) { return ({ todo: 'To do', doing: 'In progress', review: 'In review', done: 'Done' })[t.st] || t.st; } }, { k: 'who', t: 'Who', opts: uniq(function (t) { return t.who; }), get: function (t) { return t.who; } }, { k: 'due', t: 'Timing', opts: ['Due soon', 'Later'], get: function (t) { return t.hot ? 'Due soon' : 'Later'; } }];
  }
  projTaskBulk() {
    var self = this, I = this.icons(), move = function (label, st, text, icon) { return { label: label, icon: icon, fn: function (sel, done) { var prev = Object.assign({}, self.state.tstat), n = Object.assign({}, prev); sel.forEach(function (t) { n[t.id] = st; }); self.setState({ tstat: n, ra: self.state.ra + 1 }); done(); self.say(sel.length + (sel.length === 1 ? ' task' : ' tasks') + ' ' + text + '.', { undo: function () { self.setState({ tstat: prev, ra: self.state.ra + 1 }); } }); } }; };
    return [move('In progress', 'doing', 'moved to in progress', I.play), move('Send for review', 'review', 'sent for review', I.eye), move('Mark done', 'done', 'marked done', I.check)];
  }
  projAct(what, where) { var me = this.me(); this.setState({ posted: [{ i: me.i, tone: me.tone, who: me.name.split(' ')[0], what: what, where: where || '', when: 'Just now' }].concat(this.state.posted || []), apage: 0, aa: this.state.aa + 1 }); }
  projPostUpdate(pj) {
    var self = this, I = this.icons(), me = this.me();
    this.open(this.sh({ wide: true, eyebrow: 'Update', title: 'Post an update on ' + pj.name, icon: I.edit, keepOpen: true, body: 'The client sees it in their portal and by email. Say what moved and what is next. An empty “in the way” is a real answer and the commonest one.', form: { how: 'On track', moved: '', way: '', next: '', who: ['Tell the client'] },
      fields: [{ key: 'moved', label: 'What moved', type: 'area', wide: true, ph: 'Three identity routes sent, each with the reasoning.' }, { key: 'way', label: 'What is in the way', type: 'area', wide: true, ph: 'Leave this empty if nothing is.' }, { key: 'next', label: 'What happens next', type: 'area', wide: true, ph: 'Tobi picks a route. We build it out the same week.' }],
      chipSets: [{ key: 'how', label: 'How is it going', opts: ['On track', 'At risk', 'Late', 'Waiting on the client'] }, { key: 'who', label: 'Who sees it', multi: true, opts: ['Tell the client'], hint: 'Leave it off for a note only the team sees.' }], primary: 'Post update', secondary: 'Cancel',
      primaryDis: function (ctx) { return (ctx.form.moved || '').trim().length < 8 ? 'Say what moved.' : (!(ctx.form.next || '').trim() ? 'Say what happens next.' : ''); },
      onPrimary: function (ctx) { var f = ctx.form; self.projAct('posted an update: ' + f.how.toLowerCase(), f.moved.trim().slice(0, 80) + ((f.who || []).length ? ' · client told' : ' · team only')); self.setState({ sheet: null, stack: [], ptab: 'activity', ta: self.state.ta + 1 }); self.say((f.who || []).length ? 'Posted. The client sees it in their portal and by email.' : 'Saved as a team note.'); } }));
  }
  projHandover(pj) {
    var self = this, I = this.icons(), team = this.teamData().map(function (m) { return m.name; });
    this.open(this.sh({ wide: true, eyebrow: 'Hand work over', title: 'Hand ' + pj.name + ' to a department', icon: I.hand, keepOpen: true, body: 'The receiving lead has to accept it first. Nothing moves until they do.', form: { title: '', lead: team[1] || team[0], ctx: '', done: '', open: '', nextA: '', by: '2026-10-16' },
      fields: [{ key: 'title', label: 'Handover title', wide: true, ph: 'Brand files ready for the website build' }, { key: 'ctx', label: 'Context', type: 'area', wide: true, hint: 'What has been done, and why it matters for the next step.' }, { key: 'done', label: 'Files and record links', type: 'area', wide: true, hint: 'Link to approved project files. Do not paste passwords or secrets.' }, { key: 'open', label: 'Decisions already agreed, and open questions or risks', type: 'area', wide: true }, { key: 'nextA', label: 'Next action', wide: true }, { key: 'by', type: 'date', label: 'Acceptance deadline' }],
      chipSets: [{ key: 'lead', label: 'Receiving lead', opts: team }], primary: 'Request handover', secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form; return !(f.title || '').trim() ? 'Name the handover.' : ((f.ctx || '').trim().length < 20 ? 'Add context of at least 20 characters.' : (!(f.nextA || '').trim() ? 'Say the next action.' : '')); },
      onPrimary: function (ctx) { var f = ctx.form; self.projAct('requested a handover to ' + f.lead, f.title.trim() + ' · accept by ' + self.fmtDate(f.by)); self.setState({ sheet: null, stack: [], ptab: 'activity', ta: self.state.ta + 1 }); self.say('Sent. ' + f.lead + ' is asked to accept it by ' + self.fmtDate(f.by) + '.'); } }));
  }
  projMembers(pj) {
    var self = this, I = this.icons(), cur = this.state.pmem || [{ n: 'Ifeanyi N.', role: 'Staff access', who: 'Staff' }, { n: 'Chiamaka A.', role: 'Staff access', who: 'Staff' }, { n: 'Adaeze O.', role: 'Client review', who: 'Client' }, { n: 'Adaeze O.', role: 'Client billing', who: 'Client' }];
    this.open(this.sh({ eyebrow: 'Project access', title: 'Who can open ' + pj.name, icon: I.key, body: 'Invite the person from Settings, Team, first. Use their exact sign-in address. Staff manage the project; a client can review shared work or see and decide billing.', listTitle: 'People with access', select: true, selectWhy: 'Choose a person.', noSearch: true, list: cur.map(function (m) { return { t: m.n, s: m.role, ini: m.n.charAt(0), av: m.who === 'Client' ? 'var(--ad-tone-live)' : 'var(--ad-tone-brand)', ref: m }; }), primary: 'Revoke access', secondary: 'Add or update access', primaryDis: function (ctx) { return ctx.pick < 0 ? 'Choose a person to revoke.' : ''; },
      onPrimary: function (ctx) { var m = ctx.item.ref; self.ask({ eyebrow: 'Revoke', title: 'Remove ' + m.n + '’s ' + m.role.toLowerCase() + '?', body: 'They can no longer open this project in that role. Their work stays.', ok: 'Revoke access', danger: true, icon: I.ban, tone: 'var(--ad-tone-bad)', onOk: function () { self.setState({ pmem: cur.filter(function (x) { return x !== m; }) }); self.projAct('revoked ' + m.n + '’s ' + m.role.toLowerCase(), ''); self.say('Updated. ' + m.n + ' no longer has ' + m.role.toLowerCase() + '.'); } }, true); return 'stay'; },
      onSecondary: function () { var team = self.teamData().map(function (m) { return m.name; }).concat(['Adaeze O.']); setTimeout(function () { self.open(self.sh({ eyebrow: 'Add or update access', title: 'Set this person’s project access', icon: I.key, keepOpen: true, form: { n: team[0], role: 'Staff access' }, chipSets: [{ key: 'n', label: 'Person', opts: team }, { key: 'role', label: 'Access', opts: ['Staff access', 'Client review', 'Client billing'], hint: 'Staff manage this project. A client can review shared work. Billing lets a client see and decide this project’s billing agreements.' }], primary: 'Update access', secondary: 'Cancel', onPrimary: function (ctx) { var f = ctx.form; self.setState({ pmem: cur.filter(function (x) { return !(x.n === f.n && x.role === f.role); }).concat([{ n: f.n, role: f.role, who: f.role === 'Staff access' ? 'Staff' : 'Client' }]) }); self.projAct('gave ' + f.n + ' ' + f.role.toLowerCase(), ''); self.say('Updated. ' + f.n + ' has ' + f.role.toLowerCase() + '.'); } }), true); }, 60); return 'stay'; } }));
  }
  projAnswerable(pj) {
    var self = this, I = this.icons(), team = this.teamData().map(function (m) { return { t: m.name, s: m.role + (m.dept ? ' · ' + m.dept : ''), ini: m.i, av: m.tone, ref: m }; });
    this.open(this.sh({ eyebrow: 'Answerable', title: 'Who is answerable for ' + pj.name, icon: I.target, body: 'Search the team and pick one or more. Someone not listed can be invited from Settings, Team. The people picked see the project under My work.', listTitle: 'Team', select: true, multi: true, searchPh: 'Search the team', selectWhy: 'Pick at least one person.', list: team, primary: 'Save', secondary: 'Cancel', primaryDis: function (ctx) { return (ctx.picks || []).length ? '' : 'Pick at least one person.'; },
      onPrimary: function (ctx) { var names = ctx.items.map(function (x) { return x.t; }); self.projAct('set who is answerable: ' + names.join(', '), ''); self.say('Updated. ' + names.join(', ') + (names.length === 1 ? ' is' : ' are') + ' answerable.'); } }));
  }
  projIcon(pj) {
    var self = this, I = this.icons(), ICONS = [['Folder', 'M3 7h6l2 2h10v10H3z'], ['Chart', 'M4 20V10M10 20V4M16 20v-8M22 20H2'], ['Phone', 'M5 4h4l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'], ['Star', 'M12 3l2.8 6 6.2.7-4.6 4.2 1.3 6.1L12 17l-5.7 3 1.3-6.1L3 9.7 9.2 9z'], ['Layers', 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5'], ['Money', 'M12 3v18M17 7H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7']], COL = ['Navy', 'Green', 'Amber', 'Slate', 'Violet', 'Red'];
    this.open(this.sh({ eyebrow: 'Project icon', title: 'Choose an icon for ' + pj.name, icon: I.layers, keepOpen: true, body: 'The client sees it beside the project name.', form: { ic: 'Folder', col: 'Navy' }, chipSets: [{ key: 'ic', label: 'Icon', opts: ICONS.map(function (x) { return x[0]; }), hint: 'Search icons, like money, phone or chart, in the live product.' }, { key: 'col', label: 'Icon colour', opts: COL }], primary: 'Save icon', secondary: 'Cancel', onPrimary: function (ctx) { self.setState({ picon: ctx.form.ic + ' · ' + ctx.form.col }); self.projAct('changed the project icon', ctx.form.ic + ', ' + ctx.form.col.toLowerCase()); self.say('Updated. The client sees the new icon.'); } }));
  }
  projBudget(pj) {
    var self = this, I = this.icons();
    this.open(this.sh({ wide: true, eyebrow: 'Budget and scope', title: 'What was agreed on ' + pj.name, icon: I.cash, keepOpen: true, body: 'This is what an argument gets settled against, so write it in words the client would recognise.', form: { amt: '1200000', scope: 'Logo, palette, type scale and a short guideline set.', due: '2026-10-17', route: 'Portal and email' },
      fields: [{ key: 'amt', label: 'Agreed budget (₦)', mode: 'numeric', hint: 'Leave it empty when nothing is agreed. Empty is not zero.', check: function (v) { return v.trim() && !/^\d+$/.test(v.trim()) ? 'Numbers only.' : ''; } }, { key: 'due', type: 'date', label: 'Due date', hint: 'Leave it empty until a date is actually agreed.' }, { key: 'scope', label: 'What was bought', type: 'area', wide: true, ph: 'Logo, palette, type scale and a short guideline set.' }],
      chipSets: [{ key: 'route', label: 'Where updates go', opts: ['Portal and email', 'Portal only', 'WhatsApp group', 'Email only'], hint: 'Change it once a route is agreed with the client.' }], primary: 'Save changes', secondary: 'Cancel', onPrimary: function (ctx) { self.projAct('changed the budget and scope', (ctx.form.amt ? '₦' + Number(ctx.form.amt).toLocaleString('en-NG') : 'No figure agreed') + ' · updates by ' + ctx.form.route.toLowerCase()); self.say('Updated. The history records who changed what.'); } }));
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), M = this.projectModel();
    if (pop.kind === 'chores') return M.chores ? M.chores().filter(Boolean) : [];
    if (pop.kind === 'task') {
      var t = this.taskList().filter(function (x) { return x.id === pop.id; })[0]; if (!t) return [];
      var cur = this.state.tstat[t.id] || t.st, set = function (st, label) { var prev = Object.assign({}, self.state.tstat), n = Object.assign({}, prev); n[t.id] = st; self.setState({ tstat: n, ra: self.state.ra + 1 }); self.say('Moved to ' + label + '.', { undo: function () { self.setState({ tstat: prev, ra: self.state.ra + 1 }); } }); };
      var out = [it('Open', I.open, function () { self.open(self.taskSheetFor(t)); })];
      if (cur !== 'doing') out.push(it('Mark in progress', I.play, function () { set('doing', 'in progress'); }));
      if (cur !== 'review') out.push(it('Send for review', I.eye, function () { set('review', 'review'); }));
      if (cur !== 'done') out.push(it('Mark done', I.check, function () { set('done', 'done'); }));
      return out;
    }
    return [];
  }
  /* The service tab: stats, lists, tables and checklists chosen by the project's service. */
  workBlocks(M) {
    var self = this, s = this.state, I = this.icons(), F = 'var(--ad-tone-flat)', ink = function (t) { return t === F ? 'var(--ad-on-flat)' : '#fff'; };
    return (M.work ? M.work(this) : []).map(function (b, bi) {
      if (b.type === 'stats') return { isStats: true, isBlock: false, items: b.items.map(function (k) { return { t: k.t, v: k.v, note: k.note || '', noteCol: k.tone || 'var(--ad-dim)', dot: k.dot || 'var(--ad-series-1)' }; }) };
      var out = { isStats: false, isBlock: true, title: b.title, hasSub: !!b.sub, sub: b.sub || '', hasAct: !!b.act, actLabel: b.act ? b.act.label : '', act: b.act ? b.act.fn : null, isList: b.type === 'list', isTable: b.type === 'table', isChecks: b.type === 'checks' };
      if (b.type === 'list') out.items = b.items.map(function (x) { var t = x.tone || F; return { t: x.t, s: x.s, d: x.d || I.file, iconTone: x.iconTone || 'var(--ad-tone-brand)', hasTag: !!x.tag, tag: x.tag, tone: t, ink: ink(t), aria: x.t + '. ' + x.s, open: x.open || function () { self.say(x.t + ' opens here.'); } }; });
      if (b.type === 'table') { out.cols = b.cols.map(function (h) { return { t: h.t || h, cls: h.cls || '' }; }); out.rows = b.rows.map(function (r) { var open = r.open || function () { }; return { aria: r.aria || '', open: function () { open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }, cells: r.cells.map(function (c) { var t = c.tone || F; return { isTag: c.kind === 'tag', isTwo: c.kind === 'two', isOne: !c.kind || c.kind === 'text', t: c.t, s: c.s || '', tone: t, ink: ink(t), col: c.col || 'var(--ad-ink)', cls: c.cls || '', tcls: c.tcls || '' }; }) }; }); }
      if (b.type === 'checks') {
        var n = 0; out.items = b.items.map(function (x) { var key = 'k' + bi + '.' + x.k, on = key in s.wchk ? s.wchk[key] : !!x.on; if (on) n++; return { t: x.t, s: on ? (x.doneS || x.s) : x.s, checked: on ? 'true' : 'false', cls: on ? 'on' : '', toggle: function () { var w = Object.assign({}, self.state.wchk); w[key] = !on; self.setState({ wchk: w }); self.say(on ? 'Marked as not done: ' + x.t + '.' : 'Done: ' + x.t + '.', { undo: function () { var u = Object.assign({}, self.state.wchk); u[key] = on; self.setState({ wchk: u }); } }); } }; });
        out.done = n + ' of ' + b.items.length; out.pct = b.items.length ? Math.round(n / b.items.length * 100) : 0;
      }
      return out;
    });
  }
  taskList() { var s = this.state; return s.extraTasks.concat(this.projectModel().tasks || []); }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this), L = this.socialLogos(), M = this.projectModel(), pj = M.pj;
    var keys = M.tabs, names = { overview: 'Overview', tasks: 'Tasks', cal: 'Content calendar', approvals: M.role === 'client' ? 'Needs your yes' : 'Approvals', files: 'Files', money: 'Money', activity: 'Activity', work: M.workLabel || 'Service' };
    var openTasks = this.taskList().filter(function (t) { return (s.tstat[t.id] || t.st) !== 'done'; }).length;
    var apWaiting = (M.approvals || []).filter(function (a) { return !s.apDone[a.id]; }).length;
    var counts = { tasks: openTasks, approvals: apWaiting, files: (M.files || []).length };
    var ptabs = keys.map(function (k) { var on = s.ptab === k, n = counts[k] || 0; return { label: names[k], n: n, hasN: n > 0, chip: k === 'approvals' && n ? 'var(--ad-tone-warn)' : 'var(--ad-tone-flat)', chipInk: k === 'approvals' && n ? '#fff' : 'var(--ad-on-flat)', cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ptab: k, ta: self.state.ta + 1 }); } }; });
    var track = pj.stages.map(function (l, i) { return { l: l, n: i + 1, cls: i < pj.cur ? 'done' : (i === pj.cur ? 'cur' : 'todo'), isDone: i < pj.cur, notDone: i >= pj.cur, delay: (0.3 + i * 0.08) + 's' }; });

    var blockers = (M.blockers || []).filter(function (b) { return !s.apDone[b.id]; }).map(function (b) { return Object.assign({ hasAlt: !!b.altLabel, anim: self.anim(s.ra) }, b); });
    var nextItems = (M.next || []).map(function (l, i) { return Object.assign({ dotCls: i === 0 ? 'now' : '', hasWho: !!l.who, whenCol: i === 0 ? 'var(--ad-accent-ink)' : 'var(--ad-ink)', open: function () { self.open(S({ eyebrow: 'Coming up · ' + pj.name, title: l.t, icon: I.cal, rows: [{ k: 'When', v: l.when }].concat(l.whoName ? [{ k: 'Who', v: l.whoName }] : []), body: l.s + '.', primary: 'Close' })); } }, l); });
    var team = (M.team || []).map(function (m) { return Object.assign({}, m, { open: function () { self.open(S({ eyebrow: pj.name, title: 'Message ' + m.name, icon: I.msg, compose: true, composeLabel: 'Message', composePh: 'Write to ' + m.name.split(' ')[0], required: true, primary: 'Send', onPrimary: function () { self.say('Sent to ' + m.name.split(' ')[0] + ' in the project thread.'); } })); } }); });

    /* tasks */
    var TL = this.taskList().map(function (t) { return Object.assign({}, t, { st: s.tstat[t.id] || t.st }); });
    var tInTab = function (t, k) { return k === 'open' ? t.st !== 'done' : (k === 'review' ? t.st === 'review' : (k === 'mine' ? t.mine && t.st !== 'done' : t.st === 'done')); };
    var TKF = this.projTaskFacets(TL), tl0 = TL.filter(function (t) { return tInTab(t, s.ttab); }), tl = this.applyFlt('ptasks', tl0, TKF), tp = Math.min(s.tpage, Math.max(0, Math.ceil(tl.length / s.tper) - 1)), tpageList = tl.slice(tp * s.tper, tp * s.tper + s.tper);
    var STT = { todo: ['To do', 'var(--ad-tone-flat)', 'var(--ad-on-flat)'], doing: ['In progress', 'var(--ad-tone-live)', '#fff'], review: ['In review', 'var(--ad-tone-brand)', '#fff'], done: ['Done', 'var(--ad-tone-good)', '#fff'] };
    var trows = tpageList.map(function (t, i) { var open = function () { self.open(self.taskSheetFor(t)); }; return Object.assign({}, t, { status: STT[t.st][0], stTone: STT[t.st][1], stInk: STT[t.st][2], dueCol: t.hot ? 'var(--ad-accent-ink)' : 'var(--ad-ink)', dueW: t.hot ? '700' : '400', anim: self.anim(s.ra), delay: (i * 0.035) + 's', aria: t.t + ', ' + t.who + ', due ' + t.due + '. Press Enter to open.', menuAria: 'Actions for ' + t.t, open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }, menuX: self.popOn('task', t.id), menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'task', t.id, 230, 220, 'Actions for ' + t.t); } }); });
    trows.forEach(function (r, i) { Object.assign(r, self.rowSel('ptasks', tpageList[i].id, tpageList[i].t)); });
    var TPT = this.toolsView('ptasks', { noun: 'tasks', one: 'task', pageIds: tpageList.map(function (t) { return t.id; }), allIds: tl.map(function (t) { return t.id; }), rowsById: function (ids) { return tl.filter(function (t) { return ids.indexOf(t.id) >= 0; }); }, rows: tl0, unfiltered: tl0, facets: TKF, acts: this.projTaskBulk(), exportFn: function (sel) { self.exportSheet({ noun: 'tasks', file: 'project-tasks', all: TL, filtered: tl, selected: sel, cols: [{ t: 'Task', v: function (t) { return t.t; } }, { t: 'Who', v: function (t) { return t.who; } }, { t: 'Due', v: function (t) { return t.due; } }, { t: 'Status', v: function (t) { return ({ todo: 'To do', doing: 'In progress', review: 'In review', done: 'Done' })[t.st] || t.st; } }, { t: 'Note', v: function (t) { return t.s || ''; } }] }); } });
    var ttabs = (M.taskTabs || [['open', 'Open'], ['review', 'In review'], ['done', 'Done']]).map(function (k) { var on = s.ttab === k[0]; return { label: k[1], n: TL.filter(function (t) { return tInTab(t, k[0]); }).length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ttab: k[0], tpage: 0, ra: self.state.ra + 1 }); } }; });
    var TP = Object.assign(this.pager('tasks', tl.length, s.tper, tp, function (k) { self.setState({ tpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ tper: n, tpage: 0 }); }), { all: function () { self.setState({ tper: 20, tpage: 0 }); } });

    /* content calendar */
    var cal = M.calendar || { weeks: [], months: [] }, posts = this.allPosts().filter(function (x) { return s.plat === 'all' || x.plat === s.plat; });
    var byKey = {}; posts.forEach(function (x) { (byKey[x.key] = byKey[x.key] || []).push(x); });
    var openPost = function (x) { return function () { var v = self.postView(Object.assign({}, x, { dayLabel: self.dayLabel(x.key) })); if (M.role !== 'client') v.editFn = function () { self.planPostSheet(null, x, true); }; self.openPost(v, M.role === 'client' ? 'client' : 'staff'); }; };
    var isWeek = s.calView === 'week', W = cal.weeks[Math.min(s.calIdx, cal.weeks.length - 1)] || { label: '', days: [] };
    var days = W.days.map(function (k) { var items = (byKey[k] || []).map(function (x) { var T = self.postTone(self.postState(x)); return { t: x.title, time: x.time, pd: L[x.plat].d, pc: L[x.plat].c, st: T[0], tone: T[1], ink: T[2], aria: x.title + ', ' + x.plat + ', ' + T[0], open: openPost(x) }; }); var lbl = self.dayLabel(k).split(' '); return { d: lbl[0], n: lbl[1], items: items, empty: !items.length, dcol: k === M.today ? 'var(--ad-accent-ink)' : 'var(--ad-dim)', ncol: k === M.today ? 'var(--ad-accent-ink)' : 'var(--ad-ink)' }; });
    var MO = cal.months[Math.min(s.calIdx, cal.months.length - 1)] || { label: '', y: 2026, m: 10 };
    var first = new Date(MO.y, MO.m - 1, 1), lead = (first.getDay() + 6) % 7, dim = new Date(MO.y, MO.m, 0).getDate(), cells = [];
    for (var ci = 0; ci < Math.ceil((lead + dim) / 7) * 7; ci++) {
      var dn = ci - lead + 1, inM = dn >= 1 && dn <= dim, key = MO.m + '-' + dn, list = inM ? (byKey[key] || []) : [];
      cells.push((function (key, dn, inM, list) { return { n: inM ? dn : '', cls: (inM ? '' : 'out') + (key === M.today ? ' today' : ''), dis: !inM || !list.length, aria: inM ? self.dayLabel(key) + ', ' + list.length + (list.length === 1 ? ' post' : ' posts') : '', dots: list.slice(0, 4).map(function (x) { return self.postTone(self.postState(x))[1]; }), more: list.length ? list.length + (list.length === 1 ? ' post' : ' posts') : '', open: function () { if (!list.length) return; self.open(S({ eyebrow: 'Content calendar', title: self.dayLabel(key), icon: I.cal, listTitle: list.length + (list.length === 1 ? ' post' : ' posts'), list: list.map(function (x) { var T = self.postTone(self.postState(x)); return { t: x.title, s: x.time, logo: L[x.plat], tag: T[0], tone: T[1], act: { label: 'Preview', fn: function () { self.openPost(self.postView(Object.assign({}, x, { dayLabel: self.dayLabel(x.key) })), M.role === 'client' ? 'client' : 'staff', true); } } }; }), primary: 'Close' })); } }; })(key, dn, inM, list));
    }
    var nCal = isWeek ? cal.weeks.length : cal.months.length;
    var platDefs = [['all', 'All'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok']], platI = 0; platDefs.forEach(function (x, i) { if (x[0] === s.plat) platI = i; });
    var allP = this.allPosts(), waitN = allP.filter(function (x) { return self.postState(x) === 'client'; }).length;

    /* approvals, files, money, activity */
    var approvals = (M.approvals || []).filter(function (a) { return !s.apDone[a.id]; }).map(function (a) { return Object.assign({ anim: self.anim(s.ra), hasAlt: !!a.altLabel, hasAct: !!a.actLabel, actCls: a.actCls || 'btn' }, a); });
    var F = M.files || [], fp = Math.min(s.fpage, Math.max(0, Math.ceil(F.length / s.fper) - 1));
    var frows = F.slice(fp * s.fper, fp * s.fper + s.fper).map(function (f, i) { var prev = function () { self.openFile(f); }; return Object.assign({}, f, { meta: f.when + ' · ' + f.size + ' · ' + f.by, aria: 'Preview ' + f.name, dlAria: 'Download ' + f.name, anim: self.anim(s.ra), delay: (i * 0.035) + 's', get: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.say('Downloading ' + f.name + ' (' + f.size + ')'); }, preview: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; prev(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); prev(); } } }); });
    var FP = Object.assign(this.pager('pfiles', F.length, s.fper, fp, function (k) { self.setState({ fpage: k }); }, function (n) { self.setState({ fper: n, fpage: 0 }); }), { all: function () { self.setState({ fper: 20, fpage: 0 }); } });
    var mrows = ((M.money || {}).rows || []).map(function (r) { var open = function () { self.openFile({ name: r.no + '.pdf', project: pj.client, view: 'doc', ref: r.no, docTitle: r.for + ' · ' + r.amount, when: r.date, size: '190 KB', tone: 'var(--ad-tone-bad)', by: 'Funmi K.' }); }; return Object.assign({}, r, { aria: r.no + ', ' + r.amount + ', ' + r.status + '. Press Enter to preview.', open: open, key: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } }); });
    var A = (s.posted || []).concat(M.activity || []), ap = Math.min(s.apage, Math.max(0, Math.ceil(A.length / s.aper) - 1));
    var acts = A.slice(ap * s.aper, ap * s.aper + s.aper).map(function (a, i) { return Object.assign({ dotCls: ap === 0 && i === 0 ? 'now' : '', anim: self.anim(s.aa), delay: (i * 0.04) + 's' }, a); });
    var AP = Object.assign(this.pager('pacts', A.length, s.aper, ap, function (k) { self.setState({ apage: k, aa: self.state.aa + 1 }); }, function (n) { self.setState({ aper: n, apage: 0 }); }), { all: function () { self.setState({ aper: 20, apage: 0 }); } });

    return Object.assign(this.kit(), this.extraVals(), {
      pj: Object.assign({ hasFlag: !!pj.flag }, pj), hasCrumbs: !!M.crumb, crumbHref: M.crumb ? M.crumb.href : '', crumbLabel: M.crumb ? M.crumb.label : '',
      hasPause: !!M.pauseBanner, pause: M.pauseBanner || {}, pauseAct: function () { if (M.pauseBanner) M.pauseBanner.fn(); },
      hasSwitch: !!M.switches, switches: M.switches || [], switchN: (M.switches || []).length || 1, switchI: s.sw,
      hasHeadAct: !!M.headAct, headActLabel: M.headAct ? M.headAct.label : '', headActIcon: M.headAct ? M.headAct.icon : '', headAct: function () { if (M.headAct) M.headAct.fn(); }, hasChores: !!M.chores, openChores: function (e) { self.openPop(e, 'chores', 'chores', 240, 230, 'More for this project'); },
      track: track, stepAria: pj.name + ': stage ' + (pj.cur + 1) + ' of ' + pj.stages.length + ', ' + pj.stages[pj.cur], stageNote: pj.stageNote,
      ptabs: ptabs, tabAnim: s.ta % 2 ? 'kidIn' : 'kidIn2',
      isOverview: s.ptab === 'overview', isTasks: s.ptab === 'tasks', isCal: s.ptab === 'cal', isApprovals: s.ptab === 'approvals', isFiles: s.ptab === 'files', isMoney: s.ptab === 'money', isActivity: s.ptab === 'activity', isWork: s.ptab === 'work', moneyHref: M.moneyHref || 'A-Money.dc.html', moneyHrefLabel: M.moneyHrefLabel || 'Open Money', wblocks: this.workBlocks(M),
      hasBlockers: blockers.length > 0, noBlockers: !blockers.length, blockers: blockers, blockN: blockers.length, blockTitle: M.role === 'client' ? 'What we need from you' : 'What is in the way', clearNote: M.clearNote || 'Everything the team needs is in place.',
      nextItems: nextItems, nextN: nextItems.length,
      progress: (M.progress || []).map(function (g) { return Object.assign({}, g, { pct: Math.round(g.pct * p) }); }), team: team, teamTitle: M.teamTitle || 'Team', facts: M.facts || [],
      trows: trows, ttabs: ttabs, TP: TP, TPT: TPT, tEmpty: !tl.length, tEmptyTitle: s.ttab === 'done' ? 'Nothing finished yet.' : 'No open tasks here.', tEmptyBody: s.ttab === 'done' ? 'Tasks you mark done move here.' : 'Add a task, or look in another tab.', addTask: function () { self.open(self.taskSheet(Object.assign({ lead: M.defaultWho || self.me().name }, pj), function (f) { var m = self.teamData().filter(function (x) { return x.name === f.who; })[0] || { i: 'BA', tone: '#000065' }; self.setState({ extraTasks: [{ id: 'nt' + Date.now(), t: f.t.trim(), s: (f.note || '').trim() || 'Added just now', who: f.who, i: m.i, tone: m.tone, due: f.due, hot: f.due === 'Today', st: 'todo', mine: f.who === self.me().name }].concat(self.state.extraTasks), ptab: 'tasks', ttab: 'open', tpage: 0, ra: self.state.ra + 1 }); })); },
      calSummary: allP.length + ' posts planned · ' + waitN + ' with the client', isWeek: isWeek, isMonth: !isWeek, calViewI: isWeek ? 0 : 1, cWeek: isWeek ? 'on' : '', cMonth: isWeek ? '' : 'on', cWeekP: isWeek ? 'true' : 'false', cMonthP: isWeek ? 'false' : 'true',
      setWeek: function () { self.setState({ calView: 'week', calIdx: M.calStartWeek || 0, ca: self.state.ca + 1 }); }, setMonth: function () { self.setState({ calView: 'month', calIdx: 0, ca: self.state.ca + 1 }); },
      calLabel: isWeek ? W.label : MO.label, days: days, cells: cells, wkdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], calAnim: s.ca % 2 ? 'rinA' : 'rinB',
      calPrev: function () { self.setState({ calIdx: Math.max(0, self.state.calIdx - 1), ca: self.state.ca + 1 }); }, calNext: function () { self.setState({ calIdx: Math.min(nCal - 1, self.state.calIdx + 1), ca: self.state.ca + 1 }); }, calPrevDis: s.calIdx <= 0, calNextDis: s.calIdx >= nCal - 1,
      platI: platI, plats: platDefs.map(function (x) { var on = s.plat === x[0], lg = L[x[0]]; return { isAll: x[0] === 'all', hasLogo: !!lg, d: lg ? lg.d : '', c: lg ? (x[0] === 'tiktok' ? 'var(--ad-ink)' : lg.c) : '', aria: 'Show ' + x[1], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ plat: x[0], ca: self.state.ca + 1 }); } }; }),
      canPlan: M.role !== 'client', planPost: function () { self.planPostSheet(null); },
      legend: ['draft', 'client', 'approved', 'scheduled'].map(function (k) { var T = self.postTone(k); return { t: T[0], c: T[1] }; }),
      approvals: approvals, apEmpty: !approvals.length, apTitle: M.role === 'client' ? 'Needs your yes' : 'Waiting on ' + pj.client, apSub: M.apSub || '', apEmptyBody: M.apEmptyBody || 'New approvals appear here and in the deck on the home page.',
      frows: frows, FP: FP, canUpload: M.role !== 'client' || M.clientUpload, upload: function () { self.open(S({ eyebrow: pj.name, title: 'Upload files', icon: I.upload, body: 'Up to 50 MB a file. ' + (M.role === 'client' ? 'The team is told when your files land.' : 'Choose who sees them before they land.'), chipSets: M.role === 'client' ? [] : [{ key: 'who', label: 'Who sees them', opts: ['Team only', 'Client sees it'] }], form: { who: 'Team only' }, primary: 'Choose files', secondary: 'Cancel', onPrimary: function (ctx) { self.say('The file picker opens here.' + (ctx.form.who ? ' ' + ctx.form.who + '.' : '')); } })); },
      mrows: mrows, schedule: (M.money || {}).schedule || [], scheduleNote: (M.money || {}).note || '',
      acts: acts, AP: AP, fEmpty: !F.length, aEmpty: !A.length
    }, M.extra ? M.extra() : {});
  }
