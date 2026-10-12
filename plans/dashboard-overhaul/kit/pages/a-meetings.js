  /* ======================= Owner · Meetings ======================= */
  pageName() { return 'Projects'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'Meetings that need a decision', icon: I.target, body: 'A request waiting for a time, a recording to attach, a handover to book.' },
      { target: 'table', title: 'Coming up, past and requests', icon: I.cal, body: 'Each project has up to two review meetings and one recorded handover. Tap a row for the Meet link, notes and recording.' },
      { target: 'rail', title: 'This week', icon: I.clock, body: 'Today and tomorrow at a glance, with who is on each call.' },
      { target: 'new', title: 'Book a meeting', icon: I.plus, body: 'Pick the client and project, then a time the team is free. The client gets a Google Meet link by email.' }
    ];
  }
  mtKinds() { return ['Discovery call', 'Review meeting 1', 'Review meeting 2', 'Handover meeting']; }
  mtAll() {
    return this.hubApply('mt', [
      { id: 'm1', name: 'Mira Skincare · Review meeting 1', sub: 'Brand identity, first concepts', client: 'Mira Skincare', proj: 'Brand identity', kind: 'Review meeting 1', when: 'Mon 12 Oct, 10:00', who: 'Ifeanyi N.', st: 'Confirmed', past: false },
      { id: 'm2', name: 'Kora Logistics · Review meeting 2', sub: 'App build, milestone 2 demo', client: 'Kora Logistics', proj: 'Delivery app', kind: 'Review meeting 2', when: 'Tue 13 Oct, 14:00', who: 'Daniel E.', st: 'Confirmed', past: false },
      { id: 'm3', name: 'Oak and Ivy Interiors · Discovery call', sub: 'New website enquiry', client: 'Oak and Ivy Interiors', proj: 'Website', kind: 'Discovery call', when: 'Wed 14 Oct, 11:00', who: 'Daniel E.', st: 'Awaiting client', past: false },
      { id: 'm4', name: 'Bloom Pharmacy · Handover meeting', sub: 'Website handover, recorded', client: 'Bloom Pharmacy', proj: 'Website', kind: 'Handover meeting', when: 'Fri 16 Oct, 14:00', who: 'Daniel E.', st: 'Confirmed', past: false },
      { id: 'm5', name: 'Ade’s Kitchen · Review meeting 1', sub: 'Social content plan', client: 'Ade’s Kitchen', proj: 'Social media', kind: 'Review meeting 1', when: 'Thu 8 Oct, 15:00', who: 'Chiamaka A.', st: 'Held', past: true, rec: true },
      { id: 'm6', name: 'Zara Events · Handover meeting', sub: 'Brand guide handover', client: 'Zara Events', proj: 'Brand guide', kind: 'Handover meeting', when: 'Tue 6 Oct, 11:00', who: 'Ifeanyi N.', st: 'Held', past: true, rec: false }
    ]);
  }
  mtTone(st) { return { Confirmed: ['var(--ad-tone-good)', '#fff'], 'Awaiting client': ['var(--ad-tone-warn)', '#fff'], Held: ['var(--ad-tone-flat)', 'var(--ad-on-flat)'], Cancelled: ['var(--ad-tone-bad)', '#fff'] }[st] || ['var(--ad-tone-flat)', 'var(--ad-on-flat)']; }
  mtBook(m) {
    var self = this, I = this.icons(), cs = this.clientsData(), team = this.teamData().map(function (x) { return x.name; });
    var start = m ? { kind: m.kind, who: m.who, date: '2026-10-15', dateT: '11:00' } : { kind: 'Review meeting 1', who: team[0], date: '2026-10-15', dateT: '11:00' };
    this.open(this.sh({ eyebrow: m ? 'Move meeting' : 'New meeting', title: m ? m.client : 'Book a meeting', icon: I.cal, keepOpen: true, body: 'The client gets a Google Meet link and a calendar invite. Handover meetings are recorded.',
      select: !m, listTitle: 'Client', searchPh: 'Search clients by name, contact or email', create: m ? null : this.clientCreate('Add a new client'), list: m ? null : cs.map(function (c) { return { t: c.name, s: c.contact + ' · ' + c.email, ini: c.ini, av: c.tone, ref: c, k: c.phone }; }), selectWhy: 'Choose the client.',
      form: start, fields: function () { return [{ key: 'date', type: 'datetime', label: 'When', timeLabel: 'Time', required: true, hint: 'Hours are 09:00 to 17:00 on weekdays.' }]; },
      chipSets: [{ key: 'kind', label: 'Which meeting', opts: this.mtKinds() }, { key: 'who', label: 'Who hosts', opts: team }],
      primary: m ? 'Move meeting' : 'Send the invite', secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form; if (!m && ctx.pick < 0) return 'Choose the client.'; if (!f.date || f.date <= self.today()) return 'Pick a day after today.'; if (!f.dateT || f.dateT < '09:00' || f.dateT > '17:00') return 'Choose a time between 09:00 and 17:00.'; return ''; },
      onPrimary: function (ctx) { var f = ctx.form, when = self.fmDate(f.date) + ', ' + f.dateT; if (m) { self.hubPatch(m.id, { when: when, kind: f.kind, who: f.who, st: 'Awaiting client' }); self.say('Updated. ' + m.client + ' is asked to confirm ' + when + '.'); return; } var c = ctx.item.ref; self.hubAdd('mt', { id: 'mn' + Date.now(), name: c.name + ' · ' + f.kind, sub: 'Booked just now', client: c.name, proj: '', kind: f.kind, when: when, who: f.who, st: 'Awaiting client', past: false }); self.say('Saved. The invite for ' + c.name + ' is sent.'); } }));
  }
  fmDate(iso) { return this.fmtDate(iso); }
  mtSheet(m) {
    var self = this, I = this.icons(), t = this.mtTone(m.st);
    return this.sh({ eyebrow: m.kind + ' · ' + m.st, title: m.client, chip: m.st, tone: t[0], icon: I.cal, iconTone: t[0],
      rows: [{ k: 'When', v: m.when }, { k: 'Host', v: m.who }, { k: 'Project', v: m.proj || 'Not linked yet' }, { k: 'Google Meet', v: m.past ? 'Ended' : 'meet.google.com/wdc-' + m.id }].concat(m.past ? [{ k: 'Recording', v: m.rec ? 'Saved to the project files' : 'Not attached yet' }] : []),
      body: m.past ? (m.rec ? 'The recording and notes are in the project files.' : 'Attach the recording so the handover document can be written.') : (m.kind === 'Handover meeting' ? 'Recorded. The handover document goes out after it.' : 'The client gets the Meet link in the invite.'),
      primary: m.past ? (m.rec ? 'Open the recording' : 'Attach the recording') : 'Move meeting', secondary: m.past ? 'Close' : 'Cancel meeting',
      onPrimary: function () { if (m.past) { if (m.rec) self.say('The recording opens in the project files.'); else { self.hubPatch(m.id, { rec: true }); self.closeSheet(true); self.say('Saved. The recording is attached to the project.'); } return m.rec ? 'stay' : undefined; } self.closeSheet(true); setTimeout(function () { self.mtBook(m); }, 80); },
      onSecondary: function () { if (m.past) return; self.ask({ eyebrow: 'Cancel', title: 'Cancel the meeting with ' + m.client + '?', body: 'They get an email saying it is off, with a link to pick another time.', ok: 'Cancel meeting', danger: true, icon: I.ban, tone: 'var(--ad-tone-bad)', external: true, onOk: function () { self.hubPatch(m.id, { st: 'Cancelled', past: true }); self.say('Cancelled. ' + m.client + ' is told.'); } }, true); return 'stay'; } });
  }
  hubCfg() {
    var self = this, I = this.icons(), G = 'var(--ad-tone-good)';
    var pill = function (t) { var x = self.mtTone(t); return { tag: true, t: t, tone: x[0], ink: x[1] }; };
    var mk = function (past) { return function () { return self.mtAll().filter(function (m) { return !!m.past === past && m.st !== 'Cancelled' || (past && m.st === 'Cancelled'); }).map(function (m) { return Object.assign({}, m, { hay: m.name + ' ' + m.client + ' ' + m.who, cells: [{ t: m.kind }, { t: m.when }, { t: m.who }, pill(m.st)] }); }); }; };
    var acts = function (m, it, I2) { var o = [it('Open meeting', I2.open, function () { self.open(self.mtSheet(m)); })]; if (!m.past) { o.push(it('Copy Meet link', I2.link, function () { self.say('The Meet link is copied.'); })); o.push(it('Move meeting', I2.cal, function () { self.mtBook(m); })); } return o; };
    var cols = [{ t: 'Meeting' }, { t: 'Kind' }, { t: 'When' }, { t: 'Host' }, { t: 'State' }];
    var exp = [{ t: 'Meeting', v: function (m) { return m.name; } }, { t: 'Client', v: function (m) { return m.client; } }, { t: 'Kind', v: function (m) { return m.kind; } }, { t: 'When', v: function (m) { return m.when; } }, { t: 'Host', v: function (m) { return m.who; } }, { t: 'State', v: function (m) { return m.st; } }];
    var chipsK = [['all', 'All', function () { return true; }], ['rev', 'Reviews', function (x) { return /Review/.test(x.kind); }], ['hand', 'Handovers', function (x) { return x.kind === 'Handover meeting'; }], ['disc', 'Discovery', function (x) { return x.kind === 'Discovery call'; }]];
    return {
      title: 'Meetings', statsTitle: 'Meeting pulse', deckTitle: 'Meetings this week', newLabel: 'Book a meeting', newFn: function () { self.mtBook(); },
      ledeA: function () { var u = self.mtAll().filter(function (m) { return !m.past; }); return u.length + ' coming up, ' + u.filter(function (m) { return m.st === 'Awaiting client'; }).length + ' waiting for the client.'; },
      ledeB: function () { return 'Next is Mon 12 Oct, 10:00.'; }, emptyTitle: 'Nothing is waiting.', emptyNext: 'The next meeting is Mon 12 Oct at 10:00.',
      chores: function (it, I2) { return [it('Book a meeting', I2.cal, function () { self.mtBook(); }), it('Meeting settings', I2.gear, function () { window.location.href = 'A-Settings.dc.html'; }, { hint: 'Hours and recording' })]; },
      tabs: [
        { key: 'up', label: 'Coming up', title: 'Coming up', noun: 'meetings', one: 'meeting', ph: 'Client, kind or host', file: 'wdc-meetings', actLabel: 'Book a meeting', actD: I.plus, act: function () { self.mtBook(); }, emptyT: 'No meetings booked.', emptyB: 'Book a review or a handover.', cols: cols, items: mk(false), chips: chipsK, exportCols: exp, sheet: function (m) { return self.mtSheet(m); }, actions: acts, warn: function () { return self.mtAll().some(function (m) { return !m.past && m.st === 'Awaiting client'; }); } },
        { key: 'past', label: 'Past', title: 'Past meetings', noun: 'meetings', one: 'meeting', ph: 'Client, kind or host', file: 'wdc-meetings-past', actLabel: 'Book a meeting', actD: I.plus, act: function () { self.mtBook(); }, emptyT: 'No past meetings.', emptyB: 'Held meetings appear here with their recordings.', cols: cols, items: mk(true), chips: chipsK, exportCols: exp, sheet: function (m) { return self.mtSheet(m); }, actions: acts },
        { key: 'cal', cal: true, label: 'Calendar', title: 'Calendar', noun: 'meetings', one: 'meeting', ph: 'Client, kind or host', file: 'wdc-meetings-calendar', actLabel: 'Book a meeting', actD: I.plus, act: function () { self.mtBook(); }, emptyT: 'No meetings booked.', emptyB: 'Book a review or a handover.', cols: [], chips: [['all', 'All', function () { return true; }]], exportCols: exp, sheet: function (m) { return self.mtSheet(m); },
          items: function () { var MO = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }; return self.mtAll().map(function (m) { var r = /(\d{1,2})\s+(\w{3}),\s+(\d\d:\d\d)/.exec(m.when || ''), T = self.mtTone(m.st); return Object.assign({}, m, { date: r ? '2026-' + MO[r[2]] + '-' + ('0' + r[1]).slice(-2) : '', time: r ? r[3] : '09:00', kindLabel: m.kind, calTitle: m.client, calSub: m.kind + ' · ' + m.who, tone: T[0], ink: T[1], hay: m.name + ' ' + m.who, cells: [] }); }); } }
      ],
      stats: function () { var a = self.mtAll(); return [
        { label: 'Coming up', value: String(a.filter(function (m) { return !m.past; }).length), note: 'Next: Mon 12 Oct', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', ic: I.cal, fn: function () { self.setState({ tab: 0, chip: 'all', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Waiting on client', value: String(a.filter(function (m) { return !m.past && m.st === 'Awaiting client'; }).length), note: 'Time not confirmed', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', ic: I.clock, fn: function () { self.setState({ tab: 0, chip: 'all', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Recordings missing', value: String(a.filter(function (m) { return m.past && m.kind === 'Handover meeting' && !m.rec; }).length), note: 'Needed for handover', noteCol: 'var(--ad-accent-ink)', dot: 'var(--ad-tone-live)', ic: I.play, fn: function () { self.setState({ tab: 1, chip: 'hand', hpg: 0, ra: self.state.ra + 1 }); } },
        { label: 'Held, 30 days', value: '9', note: 'Two a project at most', noteCol: G, dot: G, ic: I.check, fn: function () { self.setState({ tab: 1, chip: 'all', hpg: 0, ra: self.state.ra + 1 }); } }]; },
      rail: function () { return [{ title: 'Next up', sub: 'This week', rows: self.mtAll().filter(function (m) { return !m.past; }).slice(0, 3).map(function (m) { return { t: m.client, s: m.kind + ' · ' + m.when, d: I.cal, tag: m.st === 'Awaiting client' ? 'Waiting' : '', tagTone: 'var(--ad-tone-warn)', open: function () { self.open(self.mtSheet(m)); } }; }) }]; },
      deck: function () { var m3 = self.mtAll().filter(function (m) { return m.id === 'm3'; })[0], m6 = self.mtAll().filter(function (m) { return m.id === 'm6'; })[0]; return [
        { id: 'mt1', kind: 'Waiting', urgency: 'Wed 14 Oct, 11:00', utone: '#a16207', label: 'Discovery call', dept: 'Web & Apps', title: 'Oak and Ivy Interiors has not confirmed Wednesday', body: 'The discovery call is offered for 11:00. They have not opened the invite.', meta: [{ k: 'Host', v: 'Daniel E.' }, { k: 'Sent', v: '3 days ago' }, { k: 'Opened', v: 'No' }], why: 'A reminder the day before cuts no shows roughly in half.', primaryLabel: 'Send a reminder', primaryConfirm: { eyebrow: 'Remind', title: 'Remind Oak and Ivy Interiors about Wednesday?', body: 'A short email with the Meet link goes from hello@wedigcreativity.com.', ok: 'Send reminder', green: true, okToast: 'Reminder sent.', icon: I.send, tone: 'var(--ad-tone-good)' }, secondaryLabel: 'Move it', secondaryFn: function () { self.mtBook(m3); }, sheet: self.mtSheet(m3) },
        { id: 'mt2', kind: 'Recording', urgency: 'Held Tue 6 Oct', utone: '#a16207', label: 'Handover', dept: 'Branding & Design', title: 'Attach the Zara Events handover recording', body: 'The handover document cannot be written until the recording is on the project.', meta: [{ k: 'Host', v: 'Ifeanyi N.' }, { k: 'Held', v: 'Tue 6 Oct' }, { k: 'Recording', v: 'Not attached' }], why: 'Handover is done only when the recording and the document are both in the files.', primaryLabel: 'Attach the recording', primaryFn: function () { self.hubPatch('m6', { rec: true }); }, primaryToast: 'Saved. The recording is attached.', secondaryLabel: 'Not now', sToast: 'Parked. It comes back tomorrow.', sheet: self.mtSheet(m6) }]; }
    };
  }
