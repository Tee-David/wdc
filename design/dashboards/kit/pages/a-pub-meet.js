  /* ======================= Book, change or cancel a meeting ======================= */
  pubTitle() { return 'Book a meeting'; }
  pageState() { return { ph: 'pick', type: 'Discovery call', day: '', time: '', month: 0, name: 'Zara Bello', email: 'hello@zaraevents.ng', why: '', err: '', ra: 0 }; }
  meetTypes() { return [['Discovery call', '30 minutes. Tell us what you need and we say what it takes.'], ['Project review', '45 minutes. For clients with a project in review.'], ['Handover', '60 minutes, recorded. The last meeting of a project.'], ['Something else', '30 minutes. A question that does not fit the others.']]; }
  renderVals() {
    var s = this.state, self = this, today = this.today(), base = this.addMonths('2026-10-01', s.month), y = +base.slice(0, 4), m = +base.slice(5, 7) - 1;
    var first = new Date(Date.UTC(y, m, 1)), lead = (first.getUTCDay() + 6) % 7, dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), cells = [];
    for (var ci = 0; ci < Math.ceil((lead + dim) / 7) * 7; ci++) {
      var dn = ci - lead + 1, inM = dn >= 1 && dn <= dim, iso = inM ? this.isoOf(y, m, dn) : '', dow = inM ? (new Date(Date.UTC(y, m, dn)).getUTCDay()) : 0, past = inM && iso <= today, wk = dow === 0 || dow === 6, busy = inM && (dn % 7 === 3);
      cells.push((function (iso, dn, inM, dis, busy) { return { n: inM ? dn : '', cls: (inM ? '' : 'out') + (iso === s.day ? ' sel' : ''), dis: !inM || dis, pressed: iso === s.day ? 'true' : 'false', aria: inM ? self.fmtDate(iso) + (dis ? ', not available' : ', times available') : '', note: inM && !dis ? (busy ? 'Few left' : 'Open') : '', pick: function () { self.set({ day: iso, time: '' }); } }; })(iso, dn, inM, past || wk, busy));
    }
    var times = ['09:00', '09:30', '10:00', '11:00', '11:30', '13:00', '14:00', '14:30', '15:30', '16:00'], taken = { '10:00': 1, '14:00': 1 };
    var slots = times.map(function (t) { var on = s.time === t; return { t: t, cls: on ? 'on' : '', checked: on ? 'true' : 'false', dis: !!taken[t], pick: function () { self.set({ time: t }); } }; });
    var types = this.meetTypes(), tn = types.filter(function (t) { return t[0] === s.type; })[0][1];
    var summary = s.type + (s.day ? ', ' + this.fmtDateLong(s.day) + (s.time ? ' at ' + s.time : '') : '') + ' · Lagos time';
    var ph = s.ph;
    return Object.assign(this.kit(), this.extraVals(), {
      hasStates: true, states: this.pvStates([['pick', 'Pick a time'], ['details', 'Details'], ['booked', 'Booked'], ['manage', 'Change or cancel'], ['cancelled', 'Cancelled']], 'ph'),
      isPick: ph === 'pick', isDetails: ph === 'details', isBooked: ph === 'booked', isManage: ph === 'manage', isCancelled: ph === 'cancelled',
      types: types.map(function (t) { var on = s.type === t[0]; return { t: t[0], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { self.set({ type: t[0] }); } }; }), typeNote: tn,
      monthLabel: this.monthName(m) + ' ' + y, wk: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], cells: cells, prev: function () { self.set({ month: Math.max(0, s.month - 1) }); }, prevDis: s.month <= 0, next: function () { self.set({ month: Math.min(3, s.month + 1) }); },
      hasDay: !!s.day, dayLabel: s.day ? this.fmtDateLong(s.day) : '', slots: slots, summary: summary,
      toDetails: function () { if (!self.state.day || !self.state.time) { self.say(!self.state.day ? 'Pick a day first.' : 'Pick a time.'); return; } self.set({ ph: 'details', err: '' }); },
      name: s.name, email: s.email, why: s.why, onName: function (e) { self.set({ name: e.target.value }); }, onEmail: function (e) { self.set({ email: e.target.value, err: '' }); }, onWhy: function (e) { self.set({ why: e.target.value }); }, err: s.err, hasErr: !!s.err,
      backPick: function () { self.set({ ph: 'pick' }); }, book: function () { var st = self.state; if (!st.name.trim()) { self.set({ err: 'Add your name.' }); return; } if (!self.emailOk(st.email)) { self.set({ err: 'Check the email address. The invite goes there.' }); return; } if (self.isTempEmail(st.email)) { self.set({ err: 'Use a business or personal email, not a temporary inbox.' }); return; } self.set({ ph: 'booked', err: '' }); },
      addCal: function () { self.say('The .ics file downloaded. Open it to add the meeting.'); }, manage: function () { self.set({ ph: 'manage' }); }, resched: function () { self.set({ ph: 'pick', time: '' }); },
      cancel: function () { self.ask({ eyebrow: 'Cancel', title: 'Cancel this meeting?', body: 'The studio is told and the calendar invite is removed.', ok: 'Cancel the meeting', danger: true, icon: self.icons().trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.set({ ph: 'cancelled' }); } }); }, again: function () { self.set({ ph: 'pick', day: '', time: '' }); }
    });
  }
