  /* ======================= Staff · My Day ======================= */
  pageState() { return { steps: { 0: true }, ttab: 'todo', tpage: 0, tper: 5, tq: '', ra: 0, status: {}, wk: 0, plat: 'all', wa: 0, wkDir: 0 }; }
  icons() { return Object.assign(this.baseIcons(), { block: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM4.93 4.93l14.14 14.14' }); }
  brand() { return { name: 'WDC Studio', sub: 'Social & Ads' }; }
  me() { return { name: 'Chiamaka A.', i: 'CA', role: 'Social & Ads', tone: '#b84a00' }; }
  pageName() { return 'My Day'; }
  searchHint() { return 'Search tasks, projects, clients'; }
  palHint() { return 'Task, project, client or post'; }
  palEmptyHint() { return 'You only see projects in your departments and clients assigned to you.'; }
  installCopy() { return ['Get WDC on your phone', 'Approvals, replies and handovers as push alerts.']; }
  teamDay() { return 'My Day'; }
  role() { return 'staff'; }
  navCounts() { return { Messages: { n: 2 } }; }
  recordKinds() { return ['Page', 'Task', 'Project', 'Client', 'Post']; }
  snoozeOptions() { return [['In 1 hour', '12:30'], ['After lunch', '14:30'], ['Tomorrow', '09:00'], ['Monday', '09:00']]; }
  snoozeTitle() { return 'Snooze until'; }
  teamData() {
    return [
      { name: 'Tolu A.', i: 'TA', dept: 'Social & Ads', load: '2 open', tone: '#23239b' },
      { name: 'Ifeanyi N.', i: 'IN', dept: 'Branding', load: '5 open', tone: '#000065' },
      { name: 'Bisi O.', i: 'BO', dept: 'SEO', load: '4 open', tone: '#15803d' },
      { name: 'Daniel E.', i: 'DE', dept: 'Web & Apps', load: '7 open', tone: '#5c5c7a' }
    ];
  }
  clearId(id, how, label, msg, opt) { var it = this.deck().filter(function (d) { return d.id === id; })[0]; if (it && !this.state.gone[id] && !this.state.snoozed[id]) this.clear(it, how, label, msg, opt); else if (msg) this.say(msg); }
  stepNames() { return ['Template 3 crops', 'Alt text', 'Square and story', 'Final check']; }

  sheets() {
    var S = this.sh.bind(this), self = this, I = this.icons();
    var askAdmin = function (topic, draft, onSent) { self.open(S({ eyebrow: 'Ask Admin first', title: topic, icon: I.msg, compose: true, composeLabel: 'Your question', draft: draft, required: true, body: 'Babatope sees this on Today and in Messages. The card comes back to you when he answers.', primary: 'Ask Admin', onPrimary: onSent })); };
    return {
      askAdmin: askAdmin,
      posts: S({ eyebrow: 'Task · Ade’s Kitchen', title: 'Posts for 16 and 17 October', chip: 'Due 14:00', tone: 'var(--ad-tone-live)', icon: I.task, rows: [{ k: 'Project', v: 'October content' }, { k: 'Client', v: "Ade's Kitchen" }, { k: 'Platforms', v: 'Instagram, Facebook' }, { k: 'Template', v: 'Ifeanyi, template 3' }], body: 'Captions are approved. Use template 3 for the promo post; it has the right food crop.', feed: [{ t: 'Captions approved by the client', when: 'Thu · Ade' }, { t: 'Task created from the October plan', when: '1 Oct · you' }], primary: 'Preview the promo post', onPrimary: function () { self.openPost(self.postById('p4'), 'staff'); } }),
      lumen: S({ eyebrow: 'Reply · Lumen Fitness', title: 'Reply to Daniel about the budget', chip: '18 hours', tone: 'var(--ad-tone-warn)', icon: I.msg, iconTone: 'var(--ad-tone-warn)', body: '“Can we start the ads at ₦100,000 instead of ₦150,000?” Daniel at Lumen, yesterday at 17:20.', compose: true, vis: 'client', composeLabel: 'Your reply', required: true, draft: 'Hi Daniel, yes we can start at ₦100,000. You will reach about 30% fewer people in the first two weeks. We can raise it once we see which ad works best. Shall I update the spend approval?', primary: function (ctx) { return ctx.vis === 'client' ? 'Send to Daniel' : 'Save as a team note'; }, secondary: 'Save draft', sToast: 'Draft saved. It waits here.',
        onPrimary: function (ctx) { if (ctx.vis === 'client') self.clearId('lumen', 'done', '', 'Sent to Daniel. He gets an email and a portal notice.', { final: true }); else self.say('Saved as a team note. Daniel does not see it.'); } }),
      hand: S({ eyebrow: 'Handover · from Ifeanyi', title: 'Social templates pack', chip: 'New', tone: 'var(--ad-tone-brand)', icon: I.hand, listTitle: 'What is attached', list: [{ t: 'Brand colours and fonts', s: "Ade's Kitchen brand sheet · PDF", open: null }, { t: '6 post templates', s: 'Square, portrait and story sizes' }, { t: 'Logo files', s: 'SVG and PNG, light and dark' }].map(function (l, i) { return Object.assign(l, { act: { label: 'Preview', fn: function () { self.openFile({ name: ['Brand sheet.pdf', 'Templates.png', 'Logo files.png'][i], project: "Ade's Kitchen", view: ['doc', 'art', 'art'][i], docTitle: "Ade's Kitchen brand sheet", ref: 'AK-BRAND', bg: i === 1 ? '#7a2e0e' : '#fff6ea', fg: i === 1 ? '#fff6ea' : '#7a2e0e', mark: i === 1 ? 'Template 3' : "Ade's", when: 'Yesterday', size: ['1.4 MB', '6.2 MB', '2.1 MB'][i], by: 'Ifeanyi N.', tone: 'var(--ad-tone-brand)' }, true); } } }); }), body: 'Note from Ifeanyi: “Template 3 is for promos. Use the stacked logo on stories.”', primary: 'Accept handover', secondary: 'Ask Ifeanyi a question',
        onPrimary: function () { self.clearId('hand', 'done', '', 'Accepted. Ifeanyi has been told and the files are in the project.'); },
        onSecondary: function () { self.ask({ eyebrow: 'Question', title: 'Ask Ifeanyi about the pack', input: true, inputLabel: 'Your question', inputPh: 'For example: is there a dark version of template 3?', ok: 'Send to Ifeanyi', back: true, icon: I.msg, okToast: 'Sent. It shows in Messages when he replies.' }, true); return 'stay'; } }),
      bloom: S({ eyebrow: 'Review · asked by Bisi', title: 'Bloom September report', chip: 'Goes Monday', tone: 'var(--ad-tone-brand)', icon: I.chart, rows: [{ k: 'Keywords in top 10', v: '6, up from 2' }, { k: 'Clicks', v: '1,840, up 22%' }], compose: true, composeLabel: 'Your notes for Bisi', required: true, draft: 'Numbers match Search Console. One thing: the clicks chart starts on 2 Sep, not 1 Sep.', primary: 'Send notes to Bisi', secondary: 'Preview the report', onPrimary: function () { self.clearId('bloom', 'done', '', 'Notes sent to Bisi.'); }, onSecondary: function () { self.openFile({ name: 'Bloom September report.pdf', project: 'Bloom Pharmacy', view: 'doc', ref: 'SEO-0926', docTitle: 'SEO report · September', pageCount: 7, when: 'Thu', size: '2.4 MB', by: 'Bisi O.', tone: 'var(--ad-tone-bad)' }, true); return 'stay'; } }),
      update: S({ eyebrow: 'Weekly update', title: 'Your Friday update', chip: 'Due Friday', tone: 'var(--ad-tone-warn)', icon: I.mega, body: 'We filled this in from your tasks. Edit anything before you post it.', compose: true, composeLabel: 'Update', required: true, draft: "Moved: Ade's Kitchen October content, 18 of 24 approved. Lumen ads waiting on the budget answer. Blocked: Mira Instagram access, reminder sent Thursday. Next week: November plan for Ade's Kitchen.", primary: 'Post update', secondary: 'Save draft', sToast: 'Draft saved.', onPrimary: function () { self.clearId('update', 'done', '', 'Update posted. Admin sees it on Today.', { final: true }); } }),
      mira: S({ eyebrow: 'Blocked · Mira Skincare', title: 'Instagram access for Mira', chip: 'Waiting on client', tone: 'var(--ad-tone-bad)', icon: I.block, iconTone: 'var(--ad-tone-bad)', rows: [{ k: 'Asked', v: 'Wed 7 Oct' }, { k: 'Reminder', v: 'Fri 9 Oct' }, { k: 'Needed by', v: '1 Nov start' }, { k: 'Contact', v: 'Adaeze O.' }], body: 'We never ask for passwords. The guide shows Adaeze how to add the studio as a partner in Meta Business Suite.', primary: 'Close' })
    };
  }
  deck() {
    var X = this.sheets(), self = this, I = this.icons(), s = this.state, names = this.stepNames();
    var done = names.filter(function (n, i) { return s.steps[i]; }).length;
    return [
      { id: 'posts', kind: 'Task', urgency: 'Due 14:00', utone: '#b84a00', label: "Ade's Kitchen · October", title: 'Finish posts for 16 and 17 October', body: 'Captions are approved. Drop the final images in, then send both for client approval.', hasSteps: true, stepText: done + ' of ' + names.length, stepPct: Math.round(done / names.length * 100),
        stepList: names.map(function (n, i) { var on = !!s.steps[i]; return { t: n, on: on, cls: on ? 'on' : '', pressed: on ? 'true' : 'false', toggle: function () { var st = Object.assign({}, self.state.steps); st[i] = !on; self.setState({ steps: st }); } }; }),
        why: 'Ade approves within 2 hours on weekdays. Sending by 14:00 keeps Thursday on schedule.', primaryLabel: 'Send for approval',
        primaryFn: function (at) {
          var send = function () { self.clear(self.deck()[0], 'done', '', '', { at: at, delayed: { pending: function (n) { return "Sending both posts to Ade's Kitchen in " + n + 's'; }, done: "Sent. Ade's Kitchen gets an email and a portal notice." } }); };
          if (done < names.length) self.ask({ eyebrow: 'Steps left', title: (names.length - done === 1 ? '1 step is' : (names.length - done) + ' steps are') + ' not ticked yet', body: 'Still open: ' + names.filter(function (n, i) { return !s.steps[i]; }).join(', ') + '. The client sees exactly what you send.', ok: 'Send anyway', cancel: 'Go back and finish', tone: 'var(--ad-tone-warn)', icon: I.alert, onOk: send });
          else send();
        }, secondaryLabel: 'Open the brief', sheetSecondary: true, dept: 'Social & Ads', sheet: X.posts },
      { id: 'lumen', kind: 'Client waiting', urgency: '18 hours', utone: '#a16207', label: 'Lumen Fitness · ads', title: 'Reply to Lumen about the ad budget', body: 'Daniel wants to start at ₦100,000 instead of ₦150,000.', why: 'We drafted a reply that explains the trade-off. Check it and send.', primaryLabel: 'Review reply', primarySheet: X.lumen, secondaryLabel: 'Ask Admin first',
        secondaryFn: function () { X.askAdmin('Lumen wants to start ads at ₦100,000', 'Lumen asked to start at ₦100,000 instead of ₦150,000. I would say yes and raise it after two weeks. Okay with you?', function () { self.clearId('lumen', 'snooze', 'When Admin replies', 'Asked Admin. The card comes back when Babatope answers.'); }); }, dept: 'Social & Ads', sheet: X.lumen },
      { id: 'hand', kind: 'Handover', urgency: 'New', utone: '#23239b', label: 'From Ifeanyi', title: 'Accept the social templates pack', body: '6 templates, brand colours and logo files, handed over by Ifeanyi.', why: 'Your 14:00 posts use template 3 from this pack.', primaryLabel: 'Accept handover', pToast: 'Accepted. Ifeanyi has been told.', secondaryLabel: 'See what is inside', sheetSecondary: true, dept: 'Branding', sheet: X.hand },
      { id: 'bloom', kind: 'Review', urgency: 'Asked by Bisi', utone: '#5c5c7a', label: 'Bloom · SEO monthly', title: 'Check the September report numbers', body: 'Bisi wants a second pair of eyes before it goes to the client.', why: 'It goes to Bloom on Monday morning.', primaryLabel: 'Leave notes', primarySheet: X.bloom, secondaryLabel: 'Looks good', sToast: 'Bisi told: looks good.', dept: 'SEO', sheet: X.bloom },
      { id: 'update', kind: 'Update', urgency: 'Due Friday', utone: '#a16207', label: 'Weekly update', title: 'Write your weekly update', body: 'Three projects moved this week. We filled in what we could.', why: 'Admin reads these on Saturday morning.', primaryLabel: 'Write update', primarySheet: X.update, secondaryLabel: 'Remind me Friday', secondaryFn: function (at) { self.clearId('update', 'snooze', 'Friday, 16:00', 'We will bring it back on Friday at 16:00.'); }, dept: 'Team', sheet: X.update },
      { id: 'mira', kind: 'Blocked', urgency: 'Waiting on client', utone: '#c62828', label: 'Mira · social setup', title: 'Instagram access is still missing', body: 'Adaeze has not added the studio in Meta Business Suite yet.', why: 'Social starts 1 November. Without access the first posts slip.', primaryLabel: 'Nudge Adaeze', delayed: { pending: function (n) { return 'Sending the nudge to Adaeze in ' + n + 's'; }, done: 'Nudge sent with the access guide.' }, secondaryLabel: 'Tell Admin', sToast: 'Flagged to Admin on Today.', keep: true, dept: 'Social & Ads', sheet: X.mira }
    ];
  }
  tasks() {
    var X = this.sheets(), S = this.sh.bind(this), I = this.icons(), self = this;
    var CA = { i: 'CA', c: '#b84a00' }, IN = { i: 'IN', c: '#000065' }, BO = { i: 'BO', c: '#15803d' };
    var t = function (id, st, title, p, due, hot, people, pay, payTone, client, sheet) { return { id: id, st: st, t: title, p: p, due: due, hot: hot, people: people, pay: pay, payTone: payTone, client: client, sheet: sheet || S({ eyebrow: 'Task · ' + p, title: title, icon: I.task, rows: [{ k: 'Due', v: due }, { k: 'Payment', v: pay }], body: 'Payment chips show whether a deposit is in. Amounts stay with Admin and finance.', primary: 'Mark done', secondary: 'Add a comment', onPrimary: function () { var n = Object.assign({}, self.state.status), prev = self.state.status; n[id] = 'done'; self.setState({ status: n, ra: self.state.ra + 1 }); self.say('Done. Your lead can see it.', { undo: function () { self.setState({ status: prev, ra: self.state.ra + 1 }); } }); }, onSecondary: function () { self.ask({ eyebrow: 'Comment', title: 'Comment on "' + title + '"', input: true, inputLabel: 'Comment', inputPh: 'Only the team sees this', ok: 'Add comment', back: true, icon: I.msg, okToast: 'Comment added.' }, true); return 'stay'; } }) }; };
    return [
      t('t1', 'todo', 'Reply to Lumen about the budget', 'Lumen Fitness · Instagram ads', 'Today', true, [CA], 'Deposit paid', 'var(--ad-tone-good)', 'Lumen', X.lumen),
      t('t2', 'todo', 'Resize carousel for Stories', "Ade's Kitchen · October", 'Today', true, [CA], 'Retainer', 'var(--ad-tone-brand)', 'Ade'),
      t('t3', 'todo', 'Draft November content ideas', "Ade's Kitchen · November", 'Wed 15', false, [CA], 'Retainer', 'var(--ad-tone-brand)', 'Ade'),
      t('t4', 'todo', 'Write the weekly update', 'Team', 'Fri 17', false, [CA], 'Not billed', 'var(--ad-tone-neutral)', '', X.update),
      t('t5', 'todo', 'Hashtag set for Mira launch', 'Mira Skincare · Social', 'Mon 27', false, [CA], 'Awaiting deposit', 'var(--ad-tone-warn)', 'Adaeze'),
      t('t6', 'todo', 'Story highlight covers', "Ade's Kitchen · October", 'Tue 21', false, [CA, IN], 'Retainer', 'var(--ad-tone-brand)', 'Ade'),
      t('t7', 'doing', 'Posts for 16 and 17 October', "Ade's Kitchen · October", 'Today 14:00', true, [CA, IN], 'Retainer', 'var(--ad-tone-brand)', 'Ade', X.posts),
      t('t8', 'doing', 'Ad creatives, round 2', 'Lumen Fitness · Instagram ads', 'Thu 16', false, [CA, IN], 'Deposit paid', 'var(--ad-tone-good)', 'Lumen'),
      t('t9', 'review', 'Check September report numbers', 'Bloom Pharmacy · SEO', 'Mon 13', false, [BO, CA], 'Retainer', 'var(--ad-tone-brand)', 'Bloom', X.bloom),
      t('t10', 'review', 'October report draft', "Ade's Kitchen · October", 'Sun 1 Nov', false, [CA], 'Retainer', 'var(--ad-tone-brand)', 'Ade'),
      t('t11', 'blocked', 'Instagram access for Mira', 'Mira Skincare · Social setup', 'Mon 13', false, [CA], 'Awaiting deposit', 'var(--ad-tone-warn)', 'Adaeze', X.mira)
    ];
  }
  taskActions(task) {
    var self = this, I = this.icons(), it = this.menuItem.bind(this);
    var setSt = function (st, msg) { var prev = Object.assign({}, self.state.status), n = Object.assign({}, prev); n[task.id] = st; self.setState({ status: n, ra: self.state.ra + 1 }); self.say(msg, { undo: function () { self.setState({ status: prev, ra: self.state.ra + 1 }); } }); };
    var cur = self.state.status[task.id] || task.st;
    var out = [it('Open task', I.open, function () { self.open(task.sheet); })];
    if (cur !== 'doing') out.push(it('Mark in progress', I.play, function () { setSt('doing', 'Moved to In progress.'); }));
    if (cur !== 'review') out.push(it('Send for review', I.eye, function () {
      if (task.client) self.ask({ eyebrow: 'Review', title: 'Send "' + task.t + '" for review?', body: task.client + ' gets an email and a portal notice asking them to review it. They see the latest version only.', ok: 'Send for review', icon: I.eye, onOk: function () { setSt('review', 'Sent to ' + task.client + ' for review.'); } });
      else setSt('review', 'Moved to review.');
    }));
    if (cur !== 'blocked') out.push(it('Mark blocked…', I.block, function () { self.ask({ eyebrow: 'Blocked', title: 'What is blocking this?', body: 'Your lead and Admin see the reason on their Today page, so they can help.', input: true, inputLabel: 'Reason', inputPh: 'For example: waiting on product photos from the client', ok: 'Mark blocked', danger: true, tone: 'var(--ad-tone-bad)', icon: I.block, onOk: function (txt) { setSt('blocked', 'Marked blocked: ' + txt); } }); }, { danger: true }));
    out.push(this.menuSep());
    out.push(it('Hand over to a teammate', I.hand, function () { self.open(self.sh({ eyebrow: 'Hand over', title: task.t, icon: I.hand, listTitle: 'Who takes it?', select: true, list: self.teamData().map(function (m) { return { t: m.name, s: m.dept + ' · ' + m.load, ini: m.i, av: m.tone, tag: m.dept === 'Social & Ads' ? 'Fits' : '', tone: 'var(--ad-tone-good)' }; }), compose: true, composeLabel: 'Note for them', composePh: 'What they need to know', primary: function (ctx) { return ctx.pick >= 0 ? 'Hand to ' + self.teamData()[ctx.pick].name.split(' ')[0] : 'Hand over'; }, selectWhy: 'Choose who takes it.',
      onPrimary: function (ctx) { var m = self.teamData()[ctx.pick], g = Object.assign({}, self.state.status), prev = self.state.status; g[task.id] = 'gone'; self.setState({ status: g, ra: self.state.ra + 1 }); self.say('Handed to ' + m.name.split(' ')[0] + ' with your note.', { undo: function () { self.setState({ status: prev, ra: self.state.ra + 1 }); } }); } })); }));
    return out;
  }
  postDefs() {
    var C = "Ade's Kitchen", ig = 'instagram', fb = 'facebook', tt = 'tiktok';
    var p = function (id, plat, t, st, art, cap) { return { id: id, plat: plat, title: t, st: st, art: art, cap: cap, client: t.indexOf('Lumen') === 0 ? 'Lumen Fitness' : C }; };
    return {
      '-1': [['Tue', 6, [p('a1', ig, 'Menu teaser', 'posted', '#7a2e0e', 'New week, new plates.')]], ['Wed', 7, [p('a2', ig, 'Kitchen crew', 'posted', '#3d2a5c', 'Meet the people behind your lunch.'), p('a3', fb, 'Lumen launch', 'posted', '#1f3a5c', 'Lumen Fitness opens its second studio.')]], ['Thu', 8, []], ['Fri', 9, [p('a4', tt, 'Behind the pass', 'posted', '#111', '60 seconds of a Friday rush.')]], ['Sat', 10, [p('a5', ig, 'Weekend menu', 'scheduled', '#5c3d1f', 'Your weekend just got tastier.')]], ['Sun', 11, [p('a6', fb, 'Review repost', 'scheduled', '#1f4d3a', '“Best jollof on the island.”')]], ['Mon', 12, []]],
      '0': [['Tue', 13, [p('p1', ig, 'Menu reel', 'scheduled', '#7a2e0e', 'Ten dishes, ten seconds.')]], ['Wed', 14, [p('p2', ig, 'Chef story', 'approved', '#3d2a5c', 'Chef Bola on why we smoke our own peppers.'), p('p3', fb, 'Lumen ad A', 'client', '#1f3a5c', 'Your first class is on us.')]], ['Thu', 15, [p('p6', fb, 'Carousel', 'approved', '#5c3d1f', 'Five sides worth the trip.')]], ['Fri', 16, [p('p4', ig, 'Promo post', 'client', '#7a2e0e', '20% off family platters this Thursday only.')]], ['Sat', 17, [p('p5', ig, 'Weekend menu', 'draft', '#5c3d1f', 'Draft caption, waiting on photos.'), p('p7', tt, 'Kitchen tour', 'draft', '#111', 'Come in the back door with us.')]], ['Sun', 18, [p('p8', ig, 'Review repost', 'draft', '#1f4d3a', '“Came for lunch, stayed for dessert.”')]], ['Mon', 19, []]],
      '1': [['Tue', 20, [p('b1', ig, 'New dessert', 'draft', '#5c1f3a', 'Meet the puff-puff sundae.')]], ['Wed', 21, [p('b2', fb, 'Lumen ad B', 'draft', '#1f3a5c', 'Strong starts here.')]], ['Thu', 22, []], ['Fri', 23, [p('b3', ig, 'Chef Q and A', 'draft', '#3d2a5c', 'Ask Chef Bola anything.')]], ['Sat', 24, [p('b4', tt, 'Plating trend', 'draft', '#111', 'We tried the viral plating trend.')]], ['Sun', 25, []], ['Mon', 26, []]]
    };
  }
  postById(id) { var D = this.postDefs(), out = null, self = this; Object.keys(D).forEach(function (k) { D[k].forEach(function (d) { d[2].forEach(function (p) { if (p.id === id) out = self.postView(p, d); }); }); }); return out; }
  postView(p, d) {
    var L = this.socialLogos(), PN = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' }, SM = { posted: 'Posted', scheduled: 'Scheduled', approved: 'Approved', client: 'With client', draft: 'Draft' }, ST = { posted: 'var(--ad-tone-neutral)', scheduled: 'var(--ad-tone-brand)', approved: 'var(--ad-tone-good)', client: 'var(--ad-tone-live)', draft: 'var(--ad-tone-neutral)' };
    return Object.assign({}, p, { platform: PN[p.plat], logo: L[p.plat], handle: p.client === 'Lumen Fitness' ? '@lumenfitness' : '@adeskitchen', when: d[0] + ' ' + d[1] + ' Oct, 12:30', status: SM[p.st], statusTone: ST[p.st], owner: 'Chiamaka', comments: p.st === 'client' ? [{ who: 'Ade', i: 'AB', tone: '#5c5c7a', when: 'Yesterday', t: 'Can we show the family platter from above?' }] : [] });
  }
  notesData() {
    var X = this.sheets(), self = this;
    return [
      { id: 'n1', i: 'AK', tone: 'var(--ad-tone-good)', t: "Ade's Kitchen approved the chef story post", when: '8 min ago', sheet: this.sh({ eyebrow: 'Approval', title: 'Chef story approved', chip: 'Approved', tone: 'var(--ad-tone-good)', icon: this.icons().check, iconTone: 'var(--ad-tone-good)', rows: [{ k: 'Goes live', v: 'Wed 14 Oct, 12:30' }], primary: 'Preview the post', onPrimary: function () { self.openPost(self.postById('p2'), 'staff'); } }) },
      { id: 'n2', i: 'LF', tone: 'var(--ad-tone-brand)', t: 'Lumen Fitness: "Can we start at ₦100k?"', when: '18 h ago', sheet: X.lumen },
      { id: 'n3', i: 'IN', tone: 'var(--ad-tone-brand)', t: 'Ifeanyi handed you the social templates pack', when: 'Yesterday', sheet: X.hand },
      { id: 'n4', i: 'BO', tone: 'var(--ad-tone-good)', t: 'Bisi asked you to check a report', when: 'Yesterday', sheet: X.bloom },
      { id: 'n5', i: 'BA', tone: 'var(--ad-tone-neutral)', t: 'Babatope commented on Lumen ad round 1', when: 'Thursday', sheet: this.sh({ eyebrow: 'Comment', title: 'Babatope on Lumen round 1', icon: this.icons().msg, body: '“Ad B is strongest. Shorten the headline on A.”', compose: true, composeLabel: 'Reply', required: true, primary: 'Reply', pToast: 'Reply sent.' }) }
    ];
  }
  records() {
    var X = this.sheets(), S = this.sh.bind(this), I = this.icons();
    return [
      { kind: 'Page', label: 'Messages', sub: 'Team threads and client conversations', ini: 'M', tone: 'var(--ad-tone-neutral)' },
      { kind: 'Page', label: 'Support', sub: 'Knowledge base and tickets', ini: 'S', tone: 'var(--ad-tone-neutral)' },
      { kind: 'Task', label: 'Posts for 16 and 17 October', sub: "Ade's Kitchen · due today 14:00", ini: 'T', tone: 'var(--ad-tone-live)', sheet: X.posts },
      { kind: 'Task', label: 'Reply to Lumen about the budget', sub: 'Lumen Fitness · today', ini: 'T', tone: 'var(--ad-tone-live)', sheet: X.lumen },
      { kind: 'Task', label: 'Check September report numbers', sub: 'Bloom Pharmacy · Mon', ini: 'T', tone: 'var(--ad-tone-live)', sheet: X.bloom },
      { kind: 'Project', label: 'October content', sub: "Ade's Kitchen · In progress", ini: 'P', tone: 'var(--ad-tone-brand)', sheet: X.posts },
      { kind: 'Project', label: 'Instagram ads', sub: 'Lumen Fitness · Review', ini: 'P', tone: 'var(--ad-tone-brand)', sheet: X.lumen },
      { kind: 'Client', label: "Ade's Kitchen", sub: 'Assigned to you · Social retainer', ini: 'AK', tone: 'var(--ad-tone-good)', sheet: S({ eyebrow: 'Client', title: "Ade's Kitchen", icon: I.users, rows: [{ k: 'Contact', v: 'Ade B.' }, { k: 'Channel', v: 'Client portal' }], primary: 'Close' }) },
      { kind: 'Client', label: 'Lumen Fitness', sub: 'Assigned to you · Ads', ini: 'LF', tone: 'var(--ad-tone-good)', sheet: X.lumen }
    ];
  }
  walk() { return { nav: 'My Day is your tasks. Projects shows work in your departments, Clients shows the clients assigned to you, Messages has every conversation you are in, and Support has the knowledge base.', bell: 'Client approvals, replies and handovers land here. Install the app to get them as push alerts.' }; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'Your next task', icon: I.layers, body: 'Tick the steps as you go. Send it, snooze it to a time, or hand it to a teammate with a note.', hint: 'Tap a step to tick it.' },
      { target: 'later', title: 'All your tasks', icon: I.task, body: 'Filter by status and search. Tap a row to open it, or use ⋮ to move it along. Payment chips show if a deposit is in, without amounts.' },
      { target: 'rail', title: 'Your week', icon: I.cal, body: 'Your numbers, the content calendar and your projects. Tap a post to preview it the way it will look.' },
      { target: 'search|searchS', title: 'Find anything you can see', icon: I.search, body: 'Press Ctrl K. You only see projects in your departments and clients assigned to you.' }
    ];
  }
  taskFacets(T) {
    var uniq = function (f) { var o = []; T.forEach(function (x) { var v = f(x); if (v && o.indexOf(v) < 0) o.push(v); }); return o; };
    return [{ k: 'proj', t: 'Project', opts: uniq(function (x) { return x.p; }), get: function (x) { return x.p; } }, { k: 'due', t: 'Due', opts: ['Today', 'This week', 'Later'], get: function (x) { return /^Today/.test(x.due) ? 'Today' : (/^(Wed 15|Thu 16|Fri 17|Sat 18)/.test(x.due) ? 'This week' : 'Later'); } }, { k: 'pay', t: 'Payment', opts: uniq(function (x) { return x.pay; }), get: function (x) { return x.pay; } }, { k: 'who', t: 'With', opts: ['Chiamaka A.', 'Ifeanyi N.', 'Bisi O.'], get: function (x) { return x.people.map(function (p) { return { CA: 'Chiamaka A.', IN: 'Ifeanyi N.', BO: 'Bisi O.' }[p.i] || p.i; }); } }];
  }
  exportTasks(selected, view, all) {
    this.exportSheet({ noun: 'tasks', file: 'my-tasks', all: all, filtered: view, selected: selected, cols: [{ t: 'Task', v: function (t) { return t.t; } }, { t: 'Project', v: function (t) { return t.p; } }, { t: 'Due', v: function (t) { return t.due; } }, { t: 'Status', v: function (t) { return ({ todo: 'To do', doing: 'In progress', review: 'In review', blocked: 'Blocked' })[t.st] || t.st; } }, { t: 'Payment chip', v: function (t) { return t.pay; } }] });
  }
  taskBulk() {
    var self = this, I = this.icons(), move = function (label, st, text) { return { label: label, icon: st === 'doing' ? I.play : I.eye, fn: function (sel, done) { var m = Object.assign({}, self.state.status), prev = Object.assign({}, m); sel.forEach(function (t) { m[t.id] = st; }); self.setState({ status: m, ra: self.state.ra + 1 }); done(); self.say(sel.length + (sel.length === 1 ? ' task' : ' tasks') + ' ' + text + '.', { undo: function () { self.setState({ status: prev, ra: self.state.ra + 1 }); } }); } }; };
    return [move('Start', 'doing', 'moved to in progress'), move('Send for review', 'review', 'sent for review'), { label: 'Hand over', icon: I.hand, fn: function (sel, done) { self.open(self.sh({ eyebrow: 'Hand over', title: 'Hand over ' + sel.length + (sel.length === 1 ? ' task' : ' tasks'), icon: I.hand, body: 'They get the tasks on My Day with your note.', listTitle: 'Who takes them?', select: true, searchPh: 'Search the team', list: self.teamData().map(function (m) { return { t: m.name, s: m.dept + ' · ' + m.load, ini: m.i, av: m.tone, ref: m }; }), selectWhy: 'Choose who takes them.', compose: true, composeLabel: 'Note for them', composePh: 'Anything they need to know', primary: function (ctx) { return ctx.item ? 'Hand over to ' + ctx.item.ref.name.split(' ')[0] : 'Hand over'; }, secondary: 'Cancel', onPrimary: function (ctx) { var m = Object.assign({}, self.state.status); sel.forEach(function (t) { m[t.id] = 'gone'; }); self.setState({ status: m, ra: self.state.ra + 1 }); done(); self.say(sel.length + (sel.length === 1 ? ' task' : ' tasks') + ' handed to ' + ctx.item.ref.name.split(' ')[0] + '.'); } })); } }];
  }
  popItems(pop) { if (pop.kind === 'row') { var t = this.tasks().filter(function (x) { return x.id === pop.id; })[0]; return t ? this.taskActions(t) : []; } return []; }

  renderVals() {
    var s = this.state, self = this, p = s.p, I = this.icons(), S = this.sh.bind(this), X = this.sheets(), L = this.socialLogos();
    var all = this.deck(), dv = this.deckView(all), queue = all.filter(function (d) { return !s.gone[d.id] && !s.snoozed[d.id]; });
    var doneWeek = 11 + Object.keys(s.gone).length;

    var ST = { todo: ['To do', 'var(--ad-tone-neutral)'], doing: ['In progress', 'var(--ad-tone-live)'], review: ['In review', 'var(--ad-tone-brand)'], blocked: ['Blocked', 'var(--ad-tone-bad)'], done: ['Done', 'var(--ad-tone-good)'] };
    var T = this.tasks().map(function (t) { return Object.assign({}, t, { st: s.status[t.id] || t.st }); }).filter(function (t) { return t.st !== 'gone' && t.st !== 'done'; });
    var tq = s.tq.trim().toLowerCase(), match = function (t) { return !tq || (t.t + ' ' + t.p).toLowerCase().indexOf(tq) >= 0; };
    var TF = this.taskFacets(T), list0 = T.filter(function (t) { return t.st === s.ttab && match(t); }), list = this.applyFlt('tasks', list0, TF);
    var tp = Math.min(s.tpage, Math.max(0, Math.ceil(list.length / s.tper) - 1)), pageList = list.slice(tp * s.tper, tp * s.tper + s.tper);
    var trows = pageList.map(function (t, i) {
      var open = function () { self.open(t.sheet); };
      return Object.assign({}, t, { status: ST[t.st][0], tone: ST[t.st][1], dueCol: t.hot ? 'var(--ad-accent-ink)' : 'var(--ad-ink)', dueW: t.hot ? '700' : '400', anim: self.anim(s.ra), delay: (i * 0.035) + 's', aria: t.t + ', due ' + t.due + '. Press Enter to open.', menuAria: 'Actions for ' + t.t,
        open: function (e) { if (e && e.target && e.target.closest && e.target.closest('[data-menu]')) return; open(); }, key: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } },
        menuX: self.popOn('row', t.id), menu: function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.openPop(e, 'row', t.id, 250, 290, 'Actions for ' + t.t); } });
    });
    trows.forEach(function (r, i) { Object.assign(r, self.rowSel('tasks', pageList[i].id, pageList[i].t)); });
    var TST = this.toolsView('tasks', { noun: 'tasks', one: 'task', pageIds: pageList.map(function (t) { return t.id; }), allIds: list.map(function (t) { return t.id; }), rowsById: function (ids) { return list.filter(function (t) { return ids.indexOf(t.id) >= 0; }); }, rows: list0, unfiltered: list0, facets: TF, acts: this.taskBulk(), exportFn: function (sel) { self.exportTasks(sel, list, T); } });
    var ttabs = [['todo', 'To do', 'var(--ad-tone-neutral)'], ['doing', 'In progress', 'var(--ad-tone-live)'], ['review', 'In review', 'var(--ad-tone-brand)'], ['blocked', 'Blocked', 'var(--ad-tone-bad)']].map(function (tb) { var on = s.ttab === tb[0]; return { label: tb[1], dot: tb[2], n: T.filter(function (t) { return t.st === tb[0] && match(t); }).length, cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { if (!on) self.setState({ ttab: tb[0], tpage: 0, ra: self.state.ra + 1 }); } }; });
    var TP = Object.assign(this.pager('tasks', list.length, s.tper, tp, function (k) { self.setState({ tpage: k, ra: self.state.ra + 1 }); }, function (n) { self.setState({ tper: n, tpage: 0, ra: self.state.ra + 1 }); }), { all: function () { self.open(S({ eyebrow: 'Tasks', title: 'All my open tasks', chip: T.length + ' tasks', tone: 'var(--ad-tone-brand)', icon: I.task, listTitle: 'Soonest first', list: T.map(function (t) { return { t: t.t, s: t.p + ' · ' + t.due, tag: ST[t.st][0], tone: ST[t.st][1], open: t.sheet }; }), primary: 'Close' })); } });

    var stats = [
      { label: 'Due today', raw: 3, note: '1 more tomorrow', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', sheet: S({ eyebrow: 'Today', title: 'Due today', icon: I.clock, listTitle: 'In order', list: [{ t: 'Posts for 16 and 17 Oct', s: '14:00', tag: 'In progress', tone: 'var(--ad-tone-live)', open: X.posts }, { t: 'Reply to Lumen', s: 'Before lunch', tag: 'To do', tone: 'var(--ad-tone-neutral)', open: X.lumen }, { t: 'Resize carousel', s: 'End of day', tag: 'To do', tone: 'var(--ad-tone-neutral)' }], primary: 'Close' }) },
      { label: 'With clients', raw: 4, note: 'oldest 3 days', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', sheet: S({ eyebrow: 'Waiting', title: 'With clients for review', icon: I.eye, list: [{ t: 'Lumen ad creatives', s: '1 day' }, { t: "Ade's Kitchen, 3 posts", s: '2 days' }, { t: 'Mira social plan', s: '3 days' }, { t: 'Ade November ideas', s: 'Today' }], listTitle: 'Oldest first', primary: 'Close' }) },
      { label: 'Replies waiting', raw: 2, note: 'Lumen, Ade', noteCol: 'var(--ad-tone-warn)', dot: 'var(--ad-tone-warn)', sheet: X.lumen },
      { label: 'Done this week', raw: doneWeek, note: '3 more than last week', noteCol: 'var(--ad-tone-good)', dot: 'var(--ad-tone-good)', sheet: S({ eyebrow: 'This week', title: 'You finished ' + doneWeek, icon: I.check, iconTone: 'var(--ad-tone-good)', body: 'Your lead and Admin see this in the team feed.', primary: 'Close' }) }
    ].map(function (k, i) { return Object.assign({}, k, self.statDeco(k), { value: String(Math.round(k.raw * p)), delay: 'd' + (i + 1), aria: k.label + ': ' + k.raw + '. ' + k.note, open: function () { self.open(k.sheet); } }); });

    var SM = { posted: ['Posted', 'var(--ad-tone-neutral)'], scheduled: ['Scheduled', 'var(--ad-tone-brand)'], approved: ['Approved', 'var(--ad-tone-good)'], client: ['With client', 'var(--ad-tone-live)'], draft: ['Draft', 'var(--ad-tone-neutral)'] };
    var weekDays = this.postDefs()[String(s.wk)], cnt = 0, wait = 0;
    var days = weekDays.map(function (d) {
      var items = d[2].filter(function (e) { return s.plat === 'all' || e.plat === s.plat; }).map(function (e) {
        var st = s.askedPosts[e.id] ? 'client' : (s.okPosts[e.id] ? 'approved' : e.st); cnt++; if (st === 'client') wait++;
        return { t: e.title, pd: L[e.plat].d, pc: L[e.plat].c, st: SM[st][0], tone: SM[st][1], aria: e.title + ', ' + e.plat + ', ' + SM[st][0] + ', ' + d[0] + ' ' + d[1], open: function () { self.openPost(self.postView(e, d), 'staff'); } };
      });
      var today = s.wk === -1 && d[1] === 10;
      return { d: d[0], n: d[1], items: items, empty: !items.length, dcol: today ? 'var(--ad-accent-ink)' : 'var(--ad-dim)', ncol: today ? 'var(--ad-accent-ink)' : 'var(--ad-ink)' };
    });
    var platDefs = [['all', 'All'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok']], platI = 0;
    platDefs.forEach(function (x, i) { if (x[0] === s.plat) platI = i; });
    var plats = platDefs.map(function (x) { var on = s.plat === x[0], lg = L[x[0]]; return { isAll: x[0] === 'all', hasLogo: !!lg, d: lg ? lg.d : '', c: lg ? (x[0] === 'tiktok' ? 'var(--ad-ink)' : lg.c) : '', aria: 'Show ' + x[1], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.setState({ plat: x[0], wa: self.state.wa + 1, wkDir: 0 }); } }; });
    var trk = function (labels, cur) { return labels.map(function (l, i) { return { l: l, n: i + 1, cls: i < cur ? 'done' : (i === cur ? 'cur' : 'todo'), isDone: i < cur, notDone: i >= cur, delay: (0.3 + i * 0.08) + 's' }; }); };
    var projects = [
      { name: 'October content', client: "Ade's Kitchen", stage: 'In progress', track: trk(['Plan', 'Create', 'Approve', 'Publish', 'Report'], 1), pay: 'Retainer active', payTone: 'var(--ad-tone-good)', sheet: X.posts },
      { name: 'Instagram ads', client: 'Lumen Fitness', stage: 'Review', track: trk(['Brief', 'Creatives', 'Review', 'Live', 'Report'], 2), pay: 'Deposit paid', payTone: 'var(--ad-tone-good)', sheet: X.lumen },
      { name: 'Social setup', client: 'Mira Skincare', stage: 'Onboarding', track: trk(['Access', 'Brand kit', 'Plan', 'First posts', 'Report'], 0), pay: 'Awaiting deposit', payTone: 'var(--ad-tone-warn)', sheet: X.mira }
    ].map(function (pj) { var c = pj.track.filter(function (x) { return x.cls === 'cur'; })[0]; return Object.assign({}, pj, { stepAria: pj.name + ': stage ' + c.n + ' of ' + pj.track.length + ', ' + c.l, open: function () { self.open(pj.sheet); } }); });

    return Object.assign(this.kit(), this.extraVals(), dv, {
      deckTitle: 'Up next', deckKeys: 'Focus the card: D done, S snooze', snoozeLabel: 'Snooze', snoozeShort: 'Snooze', canPass: true,
      emptyTitle: 'Your day is clear, Chiamaka.', emptyBody: 'Nothing is waiting on you. Next up:', emptyNext: 'November content ideas for Ade’s Kitchen, due Wednesday.', emptyPrimaryLabel: 'Start the next task', emptySecondaryLabel: 'Bring everything back',
      emptyPrimary: function () { self.open(T.filter(function (t) { return t.id === 't3'; })[0].sheet); },
      headline: queue.length ? 'Morning, Chiamaka. ' + queue.length + (queue.length === 1 ? ' thing is up next.' : ' things are up next.') : 'Morning, Chiamaka. Your day is clear.', doneWeek: doneWeek,
      tq: s.tq, hasTq: !!s.tq || TST.hasFn, onTq: function (e) { self.setState({ tq: e.target.value, tpage: 0, ra: self.state.ra + 1 }); }, clearTq: function () { self.setState({ tq: '', flt: {}, ra: self.state.ra + 1 }); },
      ttabs: ttabs, trows: trows, TP: TP, TST: TST, tEmpty: !list.length, tEmptyTitle: tq ? 'No task matches "' + s.tq + '".' : 'Nothing here.', tEmptyBody: tq ? 'Search by task or client, or look in another tab.' : (s.ttab === 'blocked' ? 'Nothing is blocked. Good.' : 'Tasks move here as you work.'),
      stats: stats, openAllStats: function () { self.open(S({ eyebrow: 'My week', title: 'Your numbers', icon: I.chart, listTitle: 'This week', list: [{ t: 'Due today', s: '3' }, { t: 'With clients', s: '4 · oldest 3 days' }, { t: 'Replies waiting', s: '2 · Lumen, Ade' }, { t: 'Done this week', s: doneWeek + ' · 3 more than last week' }, { t: 'Approval time, average', s: '1 day 4 h' }], primary: 'Close' })); },
      calClient: "Ade's Kitchen and Lumen Fitness", days: days, wkLabel: { '-1': '6 to 12 Oct', '0': '13 to 19 Oct', '1': '20 to 26 Oct' }[String(s.wk)], wkSummary: cnt + ' posts · ' + wait + ' with client',
      wkAnim: s.wkDir > 0 ? (s.wa % 2 ? 'wkR' : 'wkR2') : (s.wkDir < 0 ? (s.wa % 2 ? 'wkL' : 'wkL2') : self.anim(s.wa)), platI: platI, plats: plats,
      wkPrev: function () { self.setState({ wk: Math.max(-1, self.state.wk - 1), wa: self.state.wa + 1, wkDir: -1 }); }, wkNext: function () { self.setState({ wk: Math.min(1, self.state.wk + 1), wa: self.state.wa + 1, wkDir: 1 }); }, wkPrevDis: s.wk <= -1, wkNextDis: s.wk >= 1,
      openCalendar: function () { self.later('Each project has its own content calendar. It opens in Projects in the full prototype.'); },
      projects: projects, allProjects: function () { self.later('Projects opens in the full prototype.'); }
    });
  }
