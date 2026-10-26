  /* ======================= Owner · Project: Mira Skincare, Social media management ======================= */
  projRole() { return 'admin'; }
  socialSpec() {
    var self = this, I = this.icons(), S = this.sh.bind(this);
    var remind = function (id, msg) { return function () { self.say(msg, { delay: 8, pending: function (n) { return 'Sending to Adaeze in ' + n + 's'; }, cancel: function () { var d = Object.assign({}, self.state.apDone); delete d[id]; self.setState({ apDone: d }); } }); var d = Object.assign({}, self.state.apDone); d[id] = true; self.setState({ apDone: d }); }; };
    var IGd = 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z';
    var post = function (id, plat, title, key, time, st, art, cap) { return { id: id, plat: plat, title: title, key: key, time: time, st: st, art: art, cap: cap, comments: id === 'm1' ? [{ who: 'Adaeze', i: 'AO', tone: '#1f4d3a', when: 'Today', t: 'Can the bottle sit a little higher in the frame?' }] : [] }; };
    return {
      role: 'admin', crumb: { href: 'A-Projects.dc.html', label: 'Projects' }, handle: '@miraskincare', postOwner: 'Chiamaka', today: '10-10', defaultWho: 'Chiamaka A.',
      pj: { name: 'Social media management', client: 'Mira Skincare', svc: 'Social & Ads', flag: 'Blocked', flagTone: 'var(--ad-tone-bad)', stages: ['Setup', 'Plan', 'Approve', 'Publish', 'Report'], cur: 0, lede: 'Mira Skincare · led by Chiamaka A. · launch week 13 Oct, monthly plan from 1 Nov', stageNote: 'Setup: launch week posts are with Adaeze. Monthly publishing starts once the deposit and Instagram access are in.' },
      tabs: ['overview', 'tasks', 'cal', 'approvals', 'files', 'money', 'activity'],
      headAct: { label: 'Add a task', icon: 'M12 5v14M5 12h14', fn: function () { self.setState({ ptab: 'tasks', ta: self.state.ta + 1 }); setTimeout(function () { self.open(self.taskSheet({ name: 'Social media management', client: 'Mira Skincare', lead: 'Chiamaka A.' }, function (f) { var m = self.teamData().filter(function (x) { return x.name === f.who; })[0]; self.setState({ extraTasks: [{ id: 'nt' + Date.now(), t: f.t.trim(), s: (f.note || '').trim() || 'Added just now', who: f.who, i: m.i, tone: m.tone, due: f.due, hot: f.due === 'Today', st: 'todo' }].concat(self.state.extraTasks), ttab: 'open', ra: self.state.ra + 1 }); })); }, 30); } },
      chores: function () {
        var it = self.menuItem.bind(self);
        return [it('Edit project', I.edit, function () { self.open(S({ eyebrow: 'Mira Skincare', title: 'Edit project', icon: I.edit, form: { name: 'Social media management', plats: ['Instagram', 'Facebook', 'TikTok'], lead: 'Chiamaka A.' }, fields: [{ key: 'name', label: 'Project name', wide: true }], chipSets: [{ key: 'plats', label: 'Platforms', multi: true, opts: ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube'] }, { key: 'lead', label: 'Lead', opts: self.teamData().map(function (m) { return m.name; }) }], primary: 'Save changes', secondary: 'Cancel', onPrimary: function () { self.say('Updated. The team and Adaeze see the changes.'); } })); }),
          it('Pause project…', I.clock, function () { self.ask({ eyebrow: 'Pause', title: 'Pause Social media management?', body: 'Scheduled posts stop and tasks leave My Day. Adaeze sees “Paused” in her portal with your reason.', input: true, inputLabel: 'Reason Adaeze sees', inputPh: 'For example: paused until the deposit is paid', ok: 'Pause project', tone: 'var(--ad-tone-warn)', icon: I.clock, okToast: 'Project paused. Adaeze has been told.' }); }),
          it('Delivery evidence', I.check, function () { self.projEvidence({ name: 'Social media management', client: 'Mira Skincare' }); }, { hint: 'Proof of what was delivered' }),
          it('Mark done…', I.check, function () { self.ask({ eyebrow: 'Done', title: 'Mark this project done?', body: 'Setup is still open, 6 tasks are not finished and the deposit is unpaid. Usually a project is marked done after the handover meeting.', ok: 'Mark done anyway', tone: 'var(--ad-tone-warn)', icon: I.check, okToast: 'Marked done. It moves to Done in Projects.' }); }),
          self.menuSep(),
          it('Move to Trash…', I.trash, function () { self.ask({ eyebrow: 'Trash', title: 'Move this project to Trash?', body: 'Tasks, files and the content calendar go with it. Invoices stay in Money. Restore it from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, tone: 'var(--ad-tone-bad)', icon: I.trash, onOk: function () { self.say('Project moved to Trash.'); setTimeout(function () { window.location.href = 'A-Projects.dc.html'; }, 1500); } }); }, { danger: true })];
      },
      blockers: [
        { id: 'b-dep', t: 'Deposit not paid', s: 'INV-26-9QX4LM · ₦450,000 · due Wed 14 Oct. Monthly publishing starts after it is paid.', tone: 'var(--ad-tone-warn)', d: I.cash, actLabel: 'Send a reminder', act: remind('b-dep', 'Reminder sent to Adaeze with the Paystack and Flutterwave link.'), altLabel: 'Preview invoice', alt: function () { self.openFile({ name: 'INV-26-9QX4LM.pdf', project: 'Mira Skincare', view: 'doc', ref: 'INV-26-9QX4LM', docTitle: 'Invoice · ₦450,000', when: '7 Oct', size: '190 KB', tone: 'var(--ad-tone-bad)', by: 'Funmi K.' }); } },
        { id: 'b-ig', t: 'Instagram access missing', s: 'Asked Wed 7 Oct, reminded Fri 9 Oct. Without it Chiamaka cannot schedule posts or read insights.', tone: 'var(--ad-tone-bad)', d: I.key, actLabel: 'Nudge Adaeze', act: remind('b-ig', 'Nudge sent with the 2 minute access guide.'), altLabel: 'Options', alt: function () { self.open(S({ eyebrow: 'Instagram access', title: 'If access does not come in time', icon: I.key, listTitle: 'Choose a fallback', select: true, list: [{ t: 'Adaeze posts launch week herself', s: 'We send each post ready to upload, with the caption, at 09:00 on the day' }, { t: 'Book a 15 minute call to set it up together', s: 'Chiamaka walks her through Meta Business Suite' }, { t: 'Move launch week to 20 Oct', s: 'The five posts shift by one week' }], primary: function (ctx) { return ['Send posts to Adaeze each morning', 'Send a booking link', 'Move launch week'][ctx.pick] || 'Choose a fallback'; }, selectWhy: 'Choose one.', onPrimary: function (ctx) { self.say(['Done. Adaeze gets each post ready to upload at 09:00 on its day.', 'Booking link sent to Adaeze for a 15 minute call.', 'Launch week moved to 20 Oct. Adaeze has been told.'][ctx.pick]); } })); } }
      ],
      next: [
        { t: 'Launch week posts approved', s: '5 posts with Adaeze, needed by Tue 13 Oct 09:00', when: 'Tue 13 Oct', who: 'AO', whoTone: '#1f4d3a', whoName: 'Adaeze O.' },
        { t: 'Deposit due', s: 'INV-26-9QX4LM, ₦450,000', when: 'Wed 14 Oct', who: 'FK', whoTone: '#15803d', whoName: 'Funmi K.' },
        { t: 'Brand templates for social', s: 'Built from the logo Adaeze picks', when: 'Tue 20 Oct', who: 'IN', whoTone: '#000065', whoName: 'Ifeanyi N.' },
        { t: 'November plan to Adaeze', s: '24 posts across Instagram, Facebook and TikTok', when: 'Tue 27 Oct', who: 'CA', whoTone: '#b84a00', whoName: 'Chiamaka A.' },
        { t: 'Monthly publishing starts', s: 'First post of the November plan', when: 'Sun 1 Nov', who: 'CA', whoTone: '#b84a00', whoName: 'Chiamaka A.' }
      ],
      progress: [{ t: 'Setup checklist', v: '2 of 5', pct: 40, tone: 'var(--ad-series-1)' }, { t: 'Launch posts approved', v: '0 of 5', pct: 0, tone: 'var(--ad-tone-good)' }, { t: 'Tasks done', v: '1 of 7', pct: 14, tone: 'var(--ad-series-2)' }],
      team: [{ name: 'Chiamaka A.', i: 'CA', tone: '#b84a00', role: 'Lead · Social & Ads' }, { name: 'Ifeanyi N.', i: 'IN', tone: '#000065', role: 'Brand templates' }, { name: 'Tolu A.', i: 'TA', tone: '#23239b', role: 'Motion, freelancer' }],
      facts: [{ k: 'Client', v: 'Mira Skincare' }, { k: 'Approvers', v: 'Adaeze O., Bola T.' }, { k: 'Platforms', v: 'Instagram, Facebook, TikTok' }, { k: 'Quote', v: 'EST-2026-011, accepted 3 Oct' }, { k: 'Value', v: '₦900,000 for 3 months' }, { k: 'Then', v: '₦300,000 a month' }],
      taskTabs: [['open', 'Open'], ['review', 'In review'], ['done', 'Done']],
      tasks: [
        { id: 't1', t: 'Get Instagram partner access', s: 'Guide sent 7 Oct, reminder 9 Oct', who: 'Chiamaka A.', i: 'CA', tone: '#b84a00', due: 'Today', hot: true, st: 'todo' },
        { id: 't2', t: 'Launch week posts', s: '5 posts, 13 to 17 Oct', who: 'Chiamaka A.', i: 'CA', tone: '#b84a00', due: 'Tue 13 Oct', hot: true, st: 'review' },
        { id: 't3', t: 'November content plan', s: '24 posts, pillars from the brand workshop', who: 'Chiamaka A.', i: 'CA', tone: '#b84a00', due: 'Tue 27 Oct', st: 'doing' },
        { id: 't4', t: 'Brand templates for social', s: 'Square, portrait and story sizes', who: 'Ifeanyi N.', i: 'IN', tone: '#000065', due: 'Tue 20 Oct', st: 'todo' },
        { id: 't5', t: 'Serum launch reel', s: '15 seconds, from the product shoot', who: 'Tolu A.', i: 'TA', tone: '#23239b', due: 'Sat 24 Oct', st: 'doing' },
        { id: 't6', t: 'Reporting in Meta Business Suite', s: 'Needs Instagram access first', who: 'Chiamaka A.', i: 'CA', tone: '#b84a00', due: 'Sat 31 Oct', st: 'todo' },
        { id: 't7', t: 'Content pillars signed off', s: 'Approved by Adaeze on 3 Oct', who: 'Chiamaka A.', i: 'CA', tone: '#b84a00', due: 'Done 3 Oct', st: 'done' }
      ],
      calendar: { weeks: [{ label: '13 to 19 Oct', days: ['10-13', '10-14', '10-15', '10-16', '10-17', '10-18', '10-19'] }, { label: '20 to 26 Oct', days: ['10-20', '10-21', '10-22', '10-23', '10-24', '10-25', '10-26'] }, { label: '27 Oct to 2 Nov', days: ['10-27', '10-28', '10-29', '10-30', '10-31', '11-1', '11-2'] }, { label: '3 to 9 Nov', days: ['11-3', '11-4', '11-5', '11-6', '11-7', '11-8', '11-9'] }], months: [{ label: 'October 2026', y: 2026, m: 10 }, { label: 'November 2026', y: 2026, m: 11 }] },
      posts: [
        post('m1', 'instagram', 'Serum launch', '10-13', '12:30', 'client', '#3d2a5c', 'New in: the brightening serum. Vitamin C, niacinamide, nothing harsh.'),
        post('m2', 'instagram', 'Skin tip carousel', '10-14', '18:00', 'client', '#1f4d3a', '3 steps for a calmer evening routine. Save this for tonight.'),
        post('m3', 'facebook', 'Customer review', '10-15', '12:30', 'client', '#5c3d1f', '“My skin has never felt this soft.” Thank you, Kemi.'),
        post('m4', 'tiktok', 'Behind the lab', '10-16', '18:00', 'client', '#1f3a5c', 'How one bottle is made, start to finish.'),
        post('m5', 'instagram', 'Weekend offer', '10-17', '12:30', 'client', '#5c1f3a', '10% off the gift set this weekend only.'),
        post('n1', 'tiktok', 'Teaser: something new', '10-28', '18:00', 'draft', '#2b2620', 'Something new is coming on 1 November.'),
        post('n2', 'instagram', 'Hello from Mira', '11-1', '12:30', 'draft', '#1f4d3a', 'We are Mira. Gentle skincare, made with care.'),
        post('n3', 'instagram', 'November skin tips', '11-3', '18:00', 'draft', '#3d2a5c', 'Harmattan is coming. Three ways to keep your skin calm.'),
        post('n4', 'facebook', 'Founder story', '11-5', '12:30', 'draft', '#5c3d1f', 'Why Adaeze started Mira.'),
        post('n5', 'instagram', 'Gift set restock', '11-7', '12:30', 'draft', '#5c1f3a', 'The gift set is back.')
      ],
      approvals: [
        { id: 'a-posts', t: 'Launch week posts', s: '5 posts for 13 to 17 Oct · sent today · needed by Tue 13 Oct 09:00', st: 'With client', stTone: 'var(--ad-tone-warn)', tone: 'var(--ad-tone-live)', d: I.eye, actLabel: 'Send a reminder', act: remind('a-posts', 'Reminder sent to Adaeze with a one-tap approval link.'), altLabel: 'Open calendar', alt: function () { self.setState({ ptab: 'cal', ta: self.state.ta + 1, calView: 'week', calIdx: 0 }); } },
        { id: 'a-ig', t: 'Instagram partner access', s: 'Asked Wed 7 Oct · reminded Fri 9 Oct', st: '3 days', stTone: 'var(--ad-tone-bad)', tone: 'var(--ad-tone-bad)', d: I.key, actLabel: 'Nudge Adaeze', act: remind('a-ig', 'Nudge sent with the 2 minute access guide.') },
        { id: 'a-plan', t: 'November content plan', s: 'Draft at 14 of 24 posts · not sent yet', st: 'Draft', stTone: 'var(--ad-tone-neutral)', tone: 'var(--ad-tone-brand)', d: I.cal, actLabel: 'Send for approval', actCls: 'btn2', act: function () { self.ask({ eyebrow: 'Send for approval', title: 'Send a plan with 14 of 24 posts?', body: '10 posts are still empty. Adaeze sees the gaps marked “to come”. Most clients prefer the full plan in one go.', ok: 'Send it now', icon: I.send, tone: 'var(--ad-tone-warn)', onOk: function () { var d = Object.assign({}, self.state.apDone); d['a-plan'] = true; self.setState({ apDone: d }); self.say('Plan sent to Adaeze. She gets an email and a portal notice.'); } }); } }
      ],
      apSub: 'Everything here also sits on Adaeze’s Home page and in her email.',
      files: [
        ['Content pillars.pdf', '3 Oct', '1.6 MB', 'doc', 'Chiamaka A.'], ['Instagram access guide.pdf', '7 Oct', '420 KB', 'doc', 'Chiamaka A.'], ['Launch week posts.pdf', 'Today', '6.4 MB', 'art', 'Chiamaka A.'], ['Brand workshop notes.pdf', '2 Oct', '540 KB', 'doc', 'Babatope A.'], ['Product shoot selects.jpg', '30 Sep', '18 MB', 'art', 'Tolu A.'], ['Signed quote EST-2026-011.pdf', '3 Oct', '210 KB', 'doc', 'Funmi K.']
      ].map(function (f, i) { var ext = f[0].split('.').pop().toUpperCase(); return { name: f[0], when: f[1], size: f[2], view: f[3], by: f[4], ext: ext, project: 'Social media', docTitle: f[0].replace(/\.\w+$/, ''), ref: 'MIRA-S' + (i + 1), pageCount: 3, bg: '#1f4d3a', fg: '#f1ece4', mark: 'launch week', tone: ext === 'PDF' ? '#c62828' : '#b84a00' }; }),
      money: { rows: [{ no: 'INV-26-9QX4LM', for: 'Deposit, 50% of 3 months', amount: '₦450,000', date: 'Due Wed 14 Oct', status: 'Due in 4 days', tone: 'var(--ad-tone-warn)' }, { no: 'EST-2026-011', for: 'Social media management, 3 months', amount: '₦900,000', date: '3 Oct', status: 'Accepted', tone: 'var(--ad-tone-good)' }],
        schedule: [{ when: 'Wed 14 Oct', t: 'Deposit, 50%', amount: '₦450,000', tone: 'var(--ad-tone-warn)' }, { when: '1 Dec', t: 'Second instalment', amount: '₦225,000', tone: 'var(--ad-tone-neutral)' }, { when: '1 Jan', t: 'Final instalment', amount: '₦225,000', tone: 'var(--ad-tone-neutral)' }],
        note: 'From February it rolls onto ₦300,000 a month unless Adaeze stops it. Invoices go out automatically on these dates.' },
      activity: [
        ['AO', '#1f4d3a', 'Adaeze', 'commented on Serum launch', '“Can the bottle sit a little higher?”', 'Today, 10:05'], ['CA', '#b84a00', 'Chiamaka', 'sent 5 launch week posts for approval', 'Launch week', 'Today, 09:20'],
        ['CA', '#b84a00', 'Chiamaka', 'reminded Adaeze about Instagram access', 'Email and portal', 'Fri 9 Oct'], ['FK', '#15803d', 'Funmi', 'sent the deposit invoice', 'INV-26-9QX4LM · ₦450,000', 'Wed 7 Oct'],
        ['CA', '#b84a00', 'Chiamaka', 'asked for Instagram access', 'With the access guide', 'Wed 7 Oct'], ['AO', '#1f4d3a', 'Adaeze', 'approved the content pillars', 'Content pillars.pdf', 'Sat 3 Oct'],
        ['AO', '#1f4d3a', 'Adaeze', 'accepted quote EST-2026-011', '₦900,000 for 3 months', 'Sat 3 Oct'], ['BA', '#000065', 'Babatope', 'ran the brand workshop', 'Google Meet · 60 min', 'Fri 2 Oct']
      ].map(function (a) { return { i: a[0], tone: a[1], who: a[2], what: a[3], where: a[4], when: a[5] }; })
    };
  }
