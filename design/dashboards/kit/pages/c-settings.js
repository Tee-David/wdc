  /* ======================= Client · Settings model ======================= */
  setL(key, v) { var l = Object.assign({}, this.state.lists); l[key] = v; this.setState({ lists: l, ra: this.state.ra + 1 }); }
  setModel() {
    var self = this, I = this.icons(), S = this.sh.bind(this), F = 'var(--ad-tone-flat)', G = 'var(--ad-tone-good)', B = 'var(--ad-tone-brand)', L = function (k) { return self.state.lists[k] || {}; };
    var people = [{ id: 'ada', n: 'Adaeze O.', i: 'AO', tone: '#1f4d3a', role: 'Account owner', gets: 'Everything' }, { id: 'bola', n: 'Bola T.', i: 'BT', tone: '#5c3d1f', role: 'Approver', gets: 'Approvals and invoices' }];
    var plist = function () { var added = self.state.lists.invited || [], gone = L('gone'); return added.concat(people).filter(function (p) { return !gone[p.id]; }); };
    var addPerson = function () {
      self.open(S({ eyebrow: 'People at your business', title: 'Add someone', icon: I.users, body: 'They get their own sign in. Choose what reaches them, and change it any time.',
        fields: [{ key: 'name', label: 'Full name', ph: 'Kemi Adeyemi', wide: true }, { key: 'email', label: 'Email', ph: 'kemi@miraskincare.ng', type: 'email', mode: 'email', wide: true, hint: 'The invite goes here.', check: function (v) { v = v.trim(); if (!v) return ''; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Check the email address.'; if (/@(mailinator|tempmail|yopmail|guerrillamail|10minutemail)\./i.test(v)) return 'Temporary inboxes cannot receive an invite. Use a business or personal email.'; return ''; } }],
        chipSets: [{ key: 'gets', label: 'They receive', multi: true, opts: ['Invoices and receipts', 'Approvals', 'Project updates', 'Messages'] }], primary: 'Send the invite', secondary: 'Cancel',
        primaryDis: function (ctx) { var f = ctx.form; if (!(f.name || '').trim()) return 'Add their name.'; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((f.email || '').trim()) || /@(mailinator|tempmail|yopmail|guerrillamail|10minutemail)\./i.test(f.email)) return 'Add a business or personal email.'; if (!f.gets || !f.gets.length) return 'Choose at least one thing they receive.'; return ''; },
        onPrimary: function (ctx) { var f = ctx.form, nm = f.name.trim(), ini = nm.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(); self.setL('invited', [{ id: 'i' + Date.now(), n: nm, i: ini, tone: '#23239b', role: 'Invited', gets: f.gets.join(', '), invited: true }].concat(self.state.lists.invited || [])); self.say('Saved. ' + nm.split(' ')[0] + ' gets an invite at ' + f.email.trim() + '.'); } }));
    };
    var sections = [
      { label: 'Profile', icon: 'users', cards: [
        { title: 'Your details', sub: 'We use these on invoices and to reach you.', rows: [
          { key: 'p.biz', type: 'static', label: 'Business', hint: 'Shown on every invoice and receipt.', value: 'Mira Skincare', tag: ['Set by WDC', F], lock: { why: 'Only the studio can change the business name on documents.', fix: 'Ask us if it needs changing.' }, action: { label: 'Ask us', fn: function () { window.location.href = 'C-Support.dc.html'; } } },
          { key: 'p.name', type: 'text', label: 'Your name', hint: 'How the team addresses you.', def: 'Adaeze O.', check: function (v) { return v.trim() ? '' : 'Add your name.'; } },
          { key: 'p.email', type: 'text', label: 'Email', hint: 'Invoices, receipts and approvals go here.', def: 'adaeze@miraskincare.ng', check: function (v) { var t = v.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) return 'Check the email address.'; if (/@(mailinator|tempmail|yopmail|guerrillamail|10minutemail)\./i.test(t)) return 'Temporary inboxes cannot receive invoices. Use a business or personal email.'; return ''; } },
          { key: 'p.phone', type: 'text', label: 'Phone', hint: 'Only used if we need to reach you fast.', def: '+234 802 114 3390' }] },
        { title: 'Password', sub: 'No old password needed: we email you a code. A password found in a breach is refused.', rows: [{ key: 'ac.pw', type: 'static', label: 'Password', hint: 'Every other session is signed out when you change it.', value: '••••••••••', action: { label: 'Change password', fn: function () { self.pwChange('adaeze@miraskincare.ng'); } } }] }
      ] },
      { label: 'People at your business', icon: 'users', cards: [
        { title: 'Who has access', sub: 'Everyone here has their own sign in.', act: { label: 'Add a person', fn: addPerson }, list: function () {
          return plist().map(function (p) { return { t: p.n + (p.id === 'ada' ? ' (you)' : ''), s: p.role + ' · ' + p.gets + (p.invited ? ' · invite sent' : ''), ini: p.i, tone: p.tone, tag: p.id === 'ada' ? 'Owner' : '', tagTone: B, menu: p.id === 'ada' ? [{ t: 'You are the account owner. Ask us to transfer it.', icon: 'key', fn: function () { window.location.href = 'C-Support.dc.html'; } }] : [
            { t: 'Change what they receive', icon: 'bell', fn: function () { self.open(S({ eyebrow: p.n, title: 'What reaches ' + p.n.split(' ')[0], icon: I.bell, listTitle: 'They receive', checksTitle: 'They receive', keepOpen: true, checks: ['Invoices and receipts', 'Approvals', 'Project updates', 'Messages'].map(function (t, i) { return { t: t, s: '', on: i < 2 }; }), primary: 'Save', secondary: 'Cancel', onPrimary: function () { self.closeSheet(); self.say('Updated. ' + p.n.split(' ')[0] + ' receives only what you ticked.'); } })); } },
            { sep: true },
            { t: 'Remove access…', icon: 'ban', danger: true, fn: function () { self.ask({ eyebrow: 'People', title: 'Remove ' + p.n + '?', body: 'They can no longer sign in or get emails from us about your projects. You can add them again any time.', ok: 'Remove access', danger: true, tone: 'var(--ad-tone-bad)', icon: I.ban, onOk: function () { var g = Object.assign({}, L('gone')); g[p.id] = true; self.setL('gone', g); self.say(p.n + ' no longer has access.', { undo: function () { var u = Object.assign({}, L('gone')); delete u[p.id]; self.setL('gone', u); } }); } }); } }] }; });
        } }
      ] },
      { label: 'Notifications', icon: 'bell', cards: [
        { title: 'What reaches you', sub: 'Many of our clients never sign in, so email matters most. Switch off anything you do not need.', grid: self.notifGrid([['inv', 'Invoices and receipts', 'When one is issued, paid or overdue', [true, true, true]], ['app', 'Approvals and reviews', 'Posts, logos and anything that needs your yes', [true, true, true]], ['file', 'New files', 'When we share something with you', [true, false, true]], ['msg', 'Messages', 'Replies from your team', [true, true, true]], ['upd', 'Project updates', 'A stage finishes or a date changes', [true, false, true]], ['rem', 'Reminders to pay', 'The day before and the day after the due date', [true, true, false]]]) },
        { title: 'Quiet hours', rows: [{ key: 'q.hours', type: 'select', label: 'Hold push alerts', hint: 'Email is never held.', def: '21:00 to 07:00', opts: ['Off', '21:00 to 07:00', '22:00 to 06:00'] }] }
      ] },
      { label: 'Appearance', icon: 'sun', cards: [
        { title: 'How it looks', sub: 'Applies on this device when you save.', rows: [
          { key: 'theme', type: 'seg', label: 'Theme', hint: 'Light or dark. The footer switch in the sidebar does the same.', def: 'Light', opts: ['Light', 'Dark'] },
          { key: 'a.motion', type: 'static', label: 'Motion', hint: 'We follow your device. If it asks for less motion, animations stop.', value: 'Follows your device', tag: ['Automatic', F] },
          { key: 'a.app', type: 'static', label: 'The app', hint: 'Approvals, new files and receipts as push alerts.', value: 'Not installed on this device', action: { label: 'Install the app', fn: function () { self.say('Installing… the app appears on your home screen.'); } } }] }
      ] }
    ];
    return { role: 'client', sections: sections, navBase: { Billing: { n: 1, tone: 'var(--ad-tone-warn)' }, Messages: { n: 2 } }, lede: 'Your details, who else has access and what we send you. Changes wait for Save.', tourNav: 'Profile, the people at your business, notifications and appearance. Anything we send you can be switched off.',
      chores: function (s, it, I2) { return [it('Reset unsaved changes', I2.undo, function () { s.setState({ sv: {} }); s.say('Unsaved changes discarded.'); }), it('Ask us about your account', I2.life, function () { window.location.href = 'C-Support.dc.html'; })]; } };
  }
