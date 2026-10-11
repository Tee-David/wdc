  /* ======================= Owner · Blog ======================= */
  pageState() { return { chip: 'all', bpage: 0, bper: 5, bq: '', ra: 0, pst: {}, newP: [], gone: {}, fuMeta: {}, voided: {}, refunded: {}, recorded: {}, added: [] }; }
  pageName() { return 'Blog'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'What the blog needs this week', icon: I.target, body: 'A draft to finish, a post to approve, an idea worth assigning. Act, snooze or hand it over.', hint: 'Focus the card: D done, S snooze.' },
      { target: 'table', title: 'Every post in one table', icon: I.edit, body: 'Tap a row to open the post. The ⋮ has edit, preview, publish and Trash.', hint: 'The chips filter by status.' },
      { target: 'rail', title: 'Rhythm and reach', icon: I.chart, body: 'One post a week keeps the blog ranking. Open slots can take any draft in one tap.' },
      { target: 'new', title: 'Write a post', icon: I.plus, body: 'The editor checks the title and description for search as you type, and can publish, schedule or save a draft.' }
    ];
  }
  navCounts() { return { Clients: { n: 5 }, Money: { n: 3, tone: 'var(--ad-tone-bad)' }, Messages: { n: 6 } }; }
  slugify(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
  slots() { return [['Wed 14 Oct, 09:00', 'Wed 14 Oct'], ['Wed 21 Oct, 09:00', 'Wed 21 Oct'], ['Wed 28 Oct, 09:00', 'Wed 28 Oct']]; }
  postsAll() {
    var s = this.state, B = [
      { id: 'p1', t: 'How to brief a logo designer', cat: 'Branding', author: 'Ifeanyi N.', i: 'IN', tone: '#000065', status: 'published', date: '2 Oct', views: 1284, words: 1180, excerpt: 'A good brief saves two rounds. Here is the one page we ask every client to fill in before a logo project starts.' },
      { id: 'p2', t: 'Why your business needs three logo versions', cat: 'Branding', author: 'Ifeanyi N.', i: 'IN', tone: '#000065', status: 'draft', date: 'Edited yesterday', views: 0, words: 840, pct: 70, excerpt: 'A full logo, a compact mark and a one colour version. What each one is for, and where people get it wrong.', body: 'Most businesses leave with one logo file and discover the problem on the first signboard. A full logo is for letterheads and websites. A compact mark is for profile pictures and app icons. A one colour version is for stamps, embroidery and anything printed cheaply. Ask for all three in the brief.' },
      { id: 'p3', t: 'Instagram posting times that work in Nigeria', cat: 'Social', author: 'Chiamaka A.', i: 'CA', tone: '#b84a00', status: 'scheduled', date: 'Wed 14 Oct, 09:00', views: 0, words: 960, needsApproval: true, excerpt: 'We looked at six months of posts across our restaurant and retail clients. The best slots are not the ones the guides say.', body: 'Across six months and four clients, posts at 12:30 and 19:30 on weekdays earned the most saves. Weekend mornings were the quietest. Test two slots for two weeks before changing your plan.' },
      { id: 'p4', t: 'Paystack or Flutterwave: which should your shop use?', cat: 'Web', author: 'Daniel E.', i: 'DE', tone: '#5c5c7a', status: 'published', date: '25 Sep', views: 962, words: 1320, excerpt: 'Both take cards and bank transfers. The differences that matter are dollars, payouts and how support answers.' },
      { id: 'p5', t: 'What a website handover should include', cat: 'Web', author: 'Daniel E.', i: 'DE', tone: '#5c5c7a', status: 'published', date: '18 Sep', views: 731, words: 1040, excerpt: 'Logins, a recorded walkthrough, backups and who owns the domain. A checklist you can hold any studio to.' },
      { id: 'p6', t: 'SEO for a pharmacy: five pages that earn trust', cat: 'SEO', author: 'Bisi O.', i: 'BO', tone: '#15803d', status: 'draft', date: 'Edited 3 days ago', views: 0, words: 420, pct: 40, excerpt: 'Opening hours, the pharmacist, delivery areas, prescriptions and a plain price list.' },
      { id: 'p7', t: 'A month of content for a restaurant, planned', cat: 'Social', author: 'Chiamaka A.', i: 'CA', tone: '#b84a00', status: 'published', date: '4 Sep', views: 612, words: 1100, excerpt: 'Twenty four posts, three platforms and one rule: every dish gets a story.' }
    ];
    return s.newP.concat(B).map(function (p) { return s.pst[p.id] ? Object.assign({}, p, s.pst[p.id]) : p; }).filter(function (p) { return !s.gone[p.id]; });
  }
  stTone(st) { return ({ published: 'var(--ad-tone-good)', scheduled: 'var(--ad-tone-brand)', draft: 'var(--ad-tone-flat)' })[st]; }
  stLabel(st) { return ({ published: 'Published', scheduled: 'Scheduled', draft: 'Draft' })[st]; }
  patchPost(id, patch) { var m = Object.assign({}, this.state.pst); m[id] = Object.assign({}, m[id] || {}, patch); this.setState({ pst: m, ra: this.state.ra + 1 }); }
  /* The editor: a wide sheet with a search check. It saves a draft, publishes or schedules. */
  openEditor(p) {
    var self = this, I = this.icons(), slots = this.slots(), me = this.me();
    var cats = ['Branding', 'Social', 'SEO', 'Web'];
    this.open(this.sh({ kind: '', wide: true, eyebrow: p ? 'Edit post' : 'New post', title: p ? p.t : 'Write a post', icon: I.edit, keepOpen: true, body: 'Write the way you would explain it to a client. Short sentences, one idea per paragraph.',
      fields: [{ key: 'title', label: 'Title', ph: 'Why your business needs three logo versions', wide: true }, { key: 'excerpt', label: 'Description for search and sharing', ph: 'One or two sentences that make someone click', type: 'area', wide: true }, { key: 'body', label: 'The post', ph: 'Start with the problem the reader has today.', type: 'area', wide: true }],
      chipSets: function (st) { var f = st.form || {}; var out = [{ key: 'cat', label: 'Category', opts: cats }, { key: 'when', label: 'What now?', opts: ['Save as draft', 'Publish now', 'Schedule'] }]; if (f.when === 'Schedule') out.push({ key: 'slot', label: 'Publish on', opts: slots.map(function (x) { return x[0]; }), hint: 'One post a week keeps the blog ranking.' }); return out; },
      notice: function (ctx) { var f = ctx.form, t = (f.title || '').trim().length, d = (f.excerpt || '').trim().length, w = ((f.body || '').trim().split(/\s+/).filter(Boolean)).length;
        var msg = !t ? 'Add a title. Aim for 50 to 60 characters so search shows it whole.' : (t < 40 ? 'Title is ' + t + ' characters. Aim for 50 to 60 so it reads fully in search.' : (t > 65 ? 'Title is ' + t + ' characters. Search cuts it near 60.' : (d < 120 ? 'Description is ' + d + ' characters. Aim for 120 to 155.' : (d > 160 ? 'Description is ' + d + ' characters. Search cuts it near 155.' : (w < 300 ? 'The post is ' + w + ' words. Posts that rank usually run 600 or more.' : 'Title and description fit search, and the post has ' + w + ' words.')))));
        var good = t >= 40 && t <= 65 && d >= 120 && d <= 160 && w >= 300;
        return { tone: good ? 'var(--ad-tone-good)' : 'var(--ad-tone-warn)', icon: good ? I.check : I.alert, title: 'Search check', body: msg }; },
      primary: function (ctx) { var f = ctx.form; return f.when === 'Publish now' ? 'Publish now' : (f.when === 'Schedule' ? (f.slot ? 'Schedule for ' + f.slot : 'Schedule') : 'Save draft'); }, secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form, live = f.when === 'Publish now' || f.when === 'Schedule'; if (!(f.title || '').trim()) return 'Add a title.'; if (!f.cat) return 'Choose a category.'; if (!f.when) return 'Choose what happens next.'; if (live && (f.excerpt || '').trim().length < 40) return 'Add a description of at least 40 characters before it goes out.'; if (live && ((f.body || '').trim().split(/\s+/).filter(Boolean)).length < 20) return 'Write at least 20 words before it goes out.'; if (f.when === 'Schedule' && !f.slot) return 'Choose when it publishes.'; return ''; },
      onPrimary: function (ctx) {
        var f = ctx.form, id = p ? p.id : 'n' + Date.now(), words = (f.body || '').trim().split(/\s+/).filter(Boolean).length;
        var finish = function (status, date, toast) {
          var data = { id: id, t: f.title.trim(), cat: f.cat, excerpt: (f.excerpt || '').trim(), body: f.body || '', words: Math.max(words, p ? p.words || 0 : 0), status: status, date: date, pct: status === 'draft' ? Math.min(95, Math.round(words / 12)) : undefined, views: p ? p.views : 0, author: p ? p.author : me.name, i: p ? p.i : me.i, tone: p ? p.tone : me.tone };
          self.setState({ sheet: null, stack: [] });
          if (p) self.patchPost(id, data); else self.setState({ newP: [data].concat(self.state.newP), chip: 'all', bpage: 0, bq: '', ra: self.state.ra + 1 });
          if (p && p.id === 'p2' && status !== 'draft') self.clearId('bdraft', 'done', '', '', { final: true });
          self.say(toast);
        };
        if (f.when === 'Publish now') self.ask({ eyebrow: 'Publish', title: 'Publish “' + f.title.trim() + '” now?', body: 'It goes live on the blog straight away and is added to the sitemap. You can unpublish it any time.', ok: 'Publish now', green: true, icon: I.send, tone: 'var(--ad-tone-good)', onOk: function () { finish('published', 'Today', 'Published. It is live at /blog/' + self.slugify(f.title) + '.'); } }, true);
        else if (f.when === 'Schedule') finish('scheduled', f.slot, 'Saved. It publishes ' + f.slot + '.');
        else finish('draft', 'Edited just now', 'Saved. “' + f.title.trim() + '” is a draft.');
      } }));
    var pre = p ? { title: p.t, excerpt: p.excerpt || '', body: p.body || '', cat: p.cat, when: p.status === 'published' ? 'Publish now' : 'Save as draft' } : {};
    setTimeout(function () { self.setState({ form: pre }); }, 40);
  }
  postSheet(p) {
    var self = this, I = this.icons(), pub = p.status === 'published';
    return this.sh({ eyebrow: p.cat + ' · ' + this.stLabel(p.status), title: p.t, chip: this.stLabel(p.status), tone: this.stTone(p.status), icon: I.edit, iconTone: this.stTone(p.status),
      rows: [{ k: 'Author', v: p.author }, { k: pub ? 'Published' : (p.status === 'scheduled' ? 'Goes live' : 'Last edit'), v: p.date }, { k: 'Words', v: String(p.words) + (p.pct ? ' · about ' + p.pct + '% written' : '') }, { k: 'Reads, 30 days', v: pub ? p.views.toLocaleString('en-NG') : 'Not live yet' }, { k: 'Address', v: '/blog/' + this.slugify(p.t) }],
      body: p.excerpt, primary: 'Edit post', secondary: pub ? 'View on the site' : 'Preview',
      onPrimary: function () { self.closeSheet(); setTimeout(function () { self.openEditor(p); }, 80); },
      onSecondary: function () { if (pub) self.say('The post opens on the site in a new tab.'); else self.openFile({ name: p.t + '.preview', project: 'Blog', view: 'doc', ref: 'PREVIEW', docTitle: p.t, when: p.date, size: p.words + ' words', tone: 'var(--ad-tone-neutral)', pageCount: 3 }, true); return 'stay'; } });
  }
  postActions(p) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this), out = [it('Open post', I.open, function () { self.open(self.postSheet(p)); }), it('Edit post', I.edit, function () { self.openEditor(p); })];
    if (p.status === 'published') { out.push(it('View on the site', I.link, function () { self.say('The post opens on the site in a new tab.'); })); out.push(it('Unpublish…', I.undo, function () { self.ask({ eyebrow: 'Unpublish', title: 'Unpublish “' + p.t + '”?', body: 'It disappears from the blog and the sitemap. The address redirects to the blog home so no link breaks.', ok: 'Unpublish', icon: I.undo, tone: 'var(--ad-tone-warn)', onOk: function () { self.patchPost(p.id, { status: 'draft', date: 'Unpublished today' }); self.say('Unpublished. It is a draft again.'); } }); })); }
    else { out.push(it('Publish now…', I.send, function () { self.ask({ eyebrow: 'Publish', title: 'Publish “' + p.t + '” now?', body: 'It goes live straight away and is added to the sitemap.', ok: 'Publish now', green: true, icon: I.send, tone: 'var(--ad-tone-good)', onOk: function () { self.patchPost(p.id, { status: 'published', date: 'Today', views: 0 }); self.say('Published. It is live at /blog/' + self.slugify(p.t) + '.'); } }); })); out.push(it('Schedule…', I.cal, function () { self.slotSheet(null, p); })); }
    out.push(this.menuSep());
    out.push(it('Move to Trash…', I.trash, function () { self.ask({ eyebrow: 'Trash', title: 'Move “' + p.t + '” to Trash?', body: p.status === 'published' ? 'It leaves the site and its address redirects to the blog home. You can restore it from Settings, Trash, for 30 days.' : 'You can restore it from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { var g = Object.assign({}, self.state.gone); g[p.id] = true; self.setState({ gone: g, ra: self.state.ra + 1 }); self.say('“' + p.t + '” moved to Trash.', { undo: function () { var u = Object.assign({}, self.state.gone); delete u[p.id]; self.setState({ gone: u, ra: self.state.ra + 1 }); } }); } }); }, { danger: true }));
    return out;
  }
  /* put a draft into a slot, or pick a slot for a draft */
  slotSheet(slot, draft) {
    var self = this, I = this.icons(), slots = this.slots(), drafts = this.postsAll().filter(function (p) { return p.status === 'draft'; });
    if (draft) {
      this.open(this.sh({ eyebrow: 'Schedule', title: 'When should “' + draft.t + '” go out?', icon: I.cal, listTitle: 'Open slots', select: true, list: slots.map(function (x) { var b = self.postsAll().filter(function (p) { return p.status === 'scheduled' && p.date === x[0]; })[0]; return { t: x[0], s: b ? 'Booked: ' + b.t : 'Open' }; }), selectWhy: 'Choose a slot.', primary: function (ctx) { return ctx.pick >= 0 ? 'Schedule for ' + slots[ctx.pick][1] : 'Schedule'; }, secondary: 'Cancel',
        primaryDis: function (ctx) { var x = slots[ctx.pick]; return x && self.postsAll().some(function (p) { return p.status === 'scheduled' && p.date === x[0]; }) ? 'That slot is booked. Pick an open one.' : ''; },
        onPrimary: function (ctx) { self.patchPost(draft.id, { status: 'scheduled', date: slots[ctx.pick][0] }); self.say('Scheduled for ' + slots[ctx.pick][0] + '.'); } }));
      return;
    }
    if (!drafts.length) { this.say('There are no drafts to schedule. Write one with New post.'); return; }
    this.open(this.sh({ eyebrow: 'Slot', title: slot, icon: I.cal, body: 'Pick a draft for ' + slot + '. It publishes at 09:00 and keeps its search check.', listTitle: 'Drafts', select: true, list: drafts.map(function (d) { return { t: d.t, s: d.author + ' · ' + d.words + ' words' + (d.pct ? ' · ' + d.pct + '% written' : '') }; }), selectWhy: 'Choose a draft.', primary: function (ctx) { return ctx.pick >= 0 ? 'Schedule it for ' + slot : 'Schedule'; }, secondary: 'Cancel',
      onPrimary: function (ctx) { self.patchPost(drafts[ctx.pick].id, { status: 'scheduled', date: slot + ', 09:00' }); self.say('“' + drafts[ctx.pick].t + '” is scheduled for ' + slot + ', 09:00.'); } }));
  }
  popItems(pop) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    if (pop.kind === 'row') { var p = this.postsAll().filter(function (x) { return x.id === pop.id; })[0]; return p ? this.postActions(p) : []; }
    if (pop.kind === 'chores') return [it('New post', I.edit, function () { self.openEditor(); }), it('Open the blog on the site', I.link, function () { self.say('The blog opens in a new tab.'); }), this.menuSep(), it('Blog settings', I.gear, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Settings' })];
    return [];
  }
  deck() {
    var self = this, I = this.icons(), S = this.sh.bind(this), post = function (id) { return self.postsAll().filter(function (p) { return p.id === id; })[0]; };
    var d1 = { id: 'bdraft', kind: 'Draft', urgency: '70% written', utone: '#a16207', label: 'Branding', dept: 'Branding', title: 'Finish “Why your business needs three logo versions”', body: 'Ifeanyi has the intro, the three versions and the examples. The closing and the call to action are missing.', meta: [{ k: 'Author', v: 'Ifeanyi N.' }, { k: 'Written', v: '840 words' }, { k: 'Next open slot', v: 'Wed 21 Oct' }], why: 'One post a week keeps the blog ranking, and the slot on 21 October is still empty.',
      primaryLabel: 'Open the editor', primaryFn: function () { var p = post('p2'); if (p) self.openEditor(p); }, secondaryLabel: 'Schedule it as it is', secondaryFn: function () { var p = post('p2'); if (p) self.slotSheet(null, p); }, sheet: self.postSheet(post('p2') || {}) };
    var d2 = { id: 'bappr', kind: 'Review', urgency: 'Goes out Wed 14 Oct', utone: '#a16207', label: 'Social', dept: 'Social & Ads', title: 'Approve Chiamaka’s post for Tuesday', body: '“Instagram posting times that work in Nigeria” is scheduled for 09:00 and waits for your yes.', meta: [{ k: 'Author', v: 'Chiamaka A.' }, { k: 'Words', v: '960' }, { k: 'Search check', v: 'Passes' }], why: 'Approving today keeps Wednesday’s slot on schedule.',
      primaryLabel: 'Approve the schedule', primaryConfirm: { eyebrow: 'Approve', title: 'Approve “Instagram posting times that work in Nigeria”?', body: 'It publishes on Wed 14 Oct at 09:00. Chiamaka is told.', ok: 'Approve', green: true, okToast: 'Approved. It publishes Wed 14 Oct at 09:00, and Chiamaka is told.', icon: I.check, tone: 'var(--ad-tone-good)' }, secondaryLabel: 'Read it first', sheetSecondary: true, sheet: S({ eyebrow: 'Social · Scheduled', title: 'Instagram posting times that work in Nigeria', chip: 'Wed 14 Oct', tone: 'var(--ad-tone-brand)', icon: I.eye, body: 'Across six months and four clients, posts at 12:30 and 19:30 on weekdays earned the most saves. Weekend mornings were the quietest. Test two slots for two weeks before changing your plan.', primary: 'Approve the schedule', pToast: 'Approved. It publishes Wed 14 Oct at 09:00.' }) };
    var d3 = { id: 'bidea', kind: 'Idea', urgency: 'Asked 6 times', utone: '#5c5c7a', label: 'Support gap', dept: 'Web & Apps', title: 'Write about paying in dollars', body: 'Six client searches for “invoice in dollars” found nothing. A post and a help article would answer them.', meta: [{ k: 'Searches', v: '6 in 30 days' }, { k: 'Help article', v: 'Draft ready' }, { k: 'Suggested author', v: 'Daniel E.' }], why: 'A post that answers a question clients already ask is the easiest one to rank.',
      primaryLabel: 'Assign to Daniel', primaryFn: function (at) { var np = { id: 'n' + Date.now(), t: 'How to pay in dollars', cat: 'Web', author: 'Daniel E.', i: 'DE', tone: '#5c5c7a', status: 'draft', date: 'Assigned today', views: 0, words: 0, pct: 0, excerpt: 'Dollar invoices, the Sterling USD account and how long a transfer takes.' }; self.setState({ newP: [np].concat(self.state.newP), ra: self.state.ra + 1 }); self.clear(d3, 'delegated', '', 'Assigned to Daniel. A draft “How to pay in dollars” is in his list and in Drafts here.', { at: at, final: true }); },
      secondaryLabel: 'Not now', sToast: 'Parked. It comes back if clients keep asking.', sheet: S({ eyebrow: 'Idea', title: 'Write about paying in dollars', icon: I.life, rows: [{ k: 'Searches', v: '6 in 30 days' }, { k: 'Also asked', v: 'Pay by bank transfer, 4 times' }], body: 'Clients search the help centre for how to pay in dollars and find nothing. Assign it so the blog and the help article answer the same question.', primary: 'Close' }) };
    return [d1, d2, d3];
  }
  renderVals() {
    var s = this.state, self = this, I = this.icons(), S = this.sh.bind(this), G = 'var(--ad-tone-good)';
    var dk = this.deck(), dv = this.deckView(dk), q = s.bq.trim().toLowerCase(), all = this.postsAll();
    var chips = [['all', 'All'], ['draft', 'Drafts'], ['scheduled', 'Scheduled'], ['published', 'Published']];
    var chipKey = chips.map(function (c) { return c[0]; }).indexOf(s.chip) >= 0 ? s.chip : 'all';
    var match = function (p) { return !q || (p.t + ' ' + p.cat + ' ' + p.author).toLowerCase().indexOf(q) >= 0; };
    var list = all.filter(function (p) { return (chipKey === 'all' || p.status === chipKey) && match(p); });
    var cp = Math.min(s.bpage, Math.max(0, Math.ceil(list.length / s.bper) - 1));
    var F = 'var(--ad-tone-flat)', tone = function (t) { return t; };
    var rows = list.slice(cp * s.bper, cp * s.bper + s.bper).map(function (p, i) {
      var st = self.stTone(p.status), open = function () { self.open(self.postSheet(p)); };
      return { cells: [{ isTwo: true, t: p.t, s: p.cat + ' · ' + (p.words ? p.words + ' words' : 'Not started'), cls: '', tcls: '' }, { isOne: true, t: p.author, col: 'var(--ad-ink)', fw: 400, cls: '', tcls: '' }, { isTag: true, t: p.needsApproval && p.status === 'scheduled' && !s.gone.bappr ? 'Needs approval' : self.stLabel(p.status), tone: p.needsApproval && p.status === 'scheduled' && !s.gone.bappr ? 'var(--ad-tone-warn)' : st, ink: st === F ? 'var(--ad-on-flat)' : '#fff', cls: '' }, { isOne: true, t: p.date, col: 'var(--ad-ink)', fw: 400, cls: '', tcls: '' }, { isOne: true, t: p.status === 'published' ? p.views.toLocaleString('en-NG') : '—', col: p.status === 'published' ? 'var(--ad-ink)' : 'var(--ad-dim)', fw: 600, cls: 'r', tcls: 'num' }],
        anim: self.anim(s.ra), delay: (i * 0.035) + 's', aria: p.t + ', ' + self.stLabel(p.status) + ', by ' + p.author + '. Press Enter to open.', menuAria: 'Actions for ' + p.t, menuX: self.popOn('row', p.id),
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } },
        menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', p.id, 260, 330, 'Actions for ' + p.t); } };
    });
    var chipsV = chips.map(function (c) { var on = chipKey === c[0]; return { t: c[1], n: all.filter(function (p) { return (c[0] === 'all' || p.status === c[0]) && match(p); }).length, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ chip: c[0], bpage: 0, ra: self.state.ra + 1 }); } }; });
    var BP = Object.assign(this.pager('posts', list.length, s.bper, cp, function (k) { self.setState({ bpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ bper: n, bpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.setState({ bper: 20, bpage: 0, ra: self.state.ra + 1 }); self.say('Showing all ' + list.length + ' posts.'); } });
    var pubs = all.filter(function (p) { return p.status === 'published'; }), reads = pubs.reduce(function (a, p) { return a + p.views; }, 0), drafts = all.filter(function (p) { return p.status === 'draft'; }), sched = all.filter(function (p) { return p.status === 'scheduled'; }), order = this.slots().map(function (x) { return x[0]; }); sched.sort(function (a, b) { return order.indexOf(a.date) - order.indexOf(b.date); });
    var stats = [
      { label: 'Published', value: String(pubs.length), note: 'This month: ' + pubs.filter(function (p) { return /Oct|Today/.test(p.date); }).length, noteCol: 'var(--ad-dim)', dot: G, ic: I.edit, fn: function () { self.setState({ chip: 'published', bpage: 0, ra: self.state.ra + 1 }); } },
      { label: 'Drafts', value: String(drafts.length), note: drafts.length ? 'Oldest edited 3 days ago' : 'Nothing in progress', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', ic: I.file, fn: function () { self.setState({ chip: 'draft', bpage: 0, ra: self.state.ra + 1 }); } },
      { label: 'Scheduled', value: String(sched.length), note: sched.length ? 'Next: ' + sched[0].date : 'Nothing booked', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', ic: I.cal, fn: function () { self.setState({ chip: 'scheduled', bpage: 0, ra: self.state.ra + 1 }); } },
      { label: 'Reads, 30 days', value: reads.toLocaleString('en-NG'), note: pubs.length + ' posts live', noteCol: G, dot: 'var(--ad-tone-good)', ic: I.eye, fn: function () { self.setState({ chip: 'published', bpage: 0, ra: self.state.ra + 1 }); } }
    ].map(function (k, i) { return Object.assign({}, k, self.statDeco(k), { delay: 'd' + (i + 1), aria: k.label + ': ' + k.value + '. ' + k.note, open: k.fn }); });
    var booked = {}; sched.forEach(function (p) { booked[p.date] = p; });
    var slotRows = this.slots().map(function (x) { var b = booked[x[0]]; return { t: x[1] + ', 09:00', s: b ? b.t : 'Open. Tap to put a draft here.', d: I.cal, tone: b ? 'var(--ad-tone-brand)' : 'var(--ad-tone-neutral)', tag: b ? 'Booked' : 'Open', tagTone: b ? G : 'var(--ad-tone-warn)', open: function () { if (b) self.open(self.postSheet(b)); else self.slotSheet(x[1], null); } }; });
    var top = pubs.slice().sort(function (a, b) { return b.views - a.views; }).slice(0, 3).map(function (p) { return { t: p.t, s: p.views.toLocaleString('en-NG') + ' reads · ' + p.cat, d: I.eye, open: function () { self.open(self.postSheet(p)); } }; });
    var railCards = [{ title: 'Publishing rhythm', sub: 'One a week', rows: slotRows, delay: 'd3' }, { title: 'Top posts', sub: 'Last 30 days', rows: top, delay: 'd4' }].map(function (c) { return { title: c.title, sub: c.sub, hasSub: true, note: '', hasNote: false, delay: c.delay, hasAct: false, actLabel: '', act: null, rows: c.rows.map(function (r) { var tt = r.tagTone || F; return { t: r.t, s: r.s, d: r.d, tone: r.tone || 'var(--ad-tone-brand)', open: r.open, hasTag: !!r.tag, tag: r.tag, tagTone: tt, tagInk: tt === F ? 'var(--ad-on-flat)' : '#fff' }; }) }; });
    var hasFilter = !!q || chipKey !== 'all';
    return Object.assign(this.kit(), this.extraVals(), dv, {
      ledeA: pubs.length + ' posts live, ' + drafts.length + (drafts.length === 1 ? ' draft' : ' drafts') + ', ' + sched.length + ' scheduled.', ledeB: sched.length ? 'Next goes out ' + sched[0].date + '.' : 'Nothing is scheduled.',
      newLabel: 'New post', newPost: function () { self.openEditor(); }, openChores: function (e) { self.openPop(e, 'chores', 'chores', 260, 200, 'More for the blog'); }, choresX: this.popOn('chores', 'chores'),
      deckTitle: 'The blog this week', deckKeys: 'Focus the card: D done, S snooze', snoozeLabel: 'Snooze', snoozeShort: 'Snooze', canPass: true,
      emptyTitle: 'The blog is on track.', emptyBody: 'Nothing needs a decision. Next:', emptyNext: 'The next slot is Wed 21 Oct.', emptyPrimaryLabel: 'Write a post', emptySecondaryLabel: 'Bring everything back', emptyPrimary: function () { self.openEditor(); },
      tabTitle: 'All posts', total: list.length, chips: chipsV, cols: [{ t: 'Post', cls: '' }, { t: 'Author', cls: '' }, { t: 'Status', cls: '' }, { t: 'Date', cls: '' }, { t: 'Reads', cls: 'r' }], rows: rows, BP: BP, qPh: 'Title, category or author', q: s.bq, hasQ: !!s.bq,
      onQ: function (e) { self.setState({ bq: e.target.value, bpage: 0, ra: self.state.ra + 1 }); }, clearQ: function () { self.setState({ bq: '', ra: self.state.ra + 1 }); },
      tabActLabel: 'Open slots', tabActD: I.cal, tabAct: function () { var open = self.slots().filter(function (x) { return !booked[x[0]]; })[0]; if (open) self.slotSheet(open[1], null); else self.say('Every slot this month is booked.'); },
      empty: !list.length, hasFilter: hasFilter && !!all.length, noFilterEmpty: !all.length, clearFilters: function () { self.setState({ bq: '', chip: 'all', bpage: 0, ra: self.state.ra + 1 }); }, emptyTitleT: q ? 'No post matches "' + s.bq + '".' : (all.length ? 'No posts in this view.' : 'No posts yet.'), emptyBodyT: q ? 'Search by title, category or author.' : 'Try another status, or write one.',
      hasStats: true, statsTitle: 'Blog pulse', stats: stats, railCards: railCards
    });
  }
