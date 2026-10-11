  /* ======================= Staff · Welcome ======================= */
  pageName() { return 'My Day'; }
  welcomeCfg() {
    var self = this, I = this.icons();
    var form = function (o) { return function (self2, done) { self2.open(self2.sh(Object.assign({ icon: I.check, secondary: 'Cancel' }, o, { onPrimary: function () { done(o.doneMsg); } }))); }; };
    return { title: 'Welcome, Funmi', home: 'D-Staff.dc.html', homeName: 'My Day', hero: 'Get ready for your first day', heroBody: 'Five steps. Your day, your projects and your messages are all in the menu.',
      steps: [
        { id: 'me', t: 'Check your profile', s: 'Your name, role and working hours show to the team.', icon: 'users', label: 'Check profile', run: form({ eyebrow: 'Profile', title: 'Your profile', body: 'Clients on your projects see your name and role. They never see your phone or email.', form: { name: 'Funmi K.', hours: '09:00 to 17:00' }, fields: [{ key: 'name', label: 'Display name', wide: true }], chipSets: [{ key: 'hours', label: 'Working hours', opts: ['09:00 to 17:00', '10:00 to 18:00', '08:00 to 16:00'] }], primary: 'Save profile', primaryDis: function (ctx) { return (ctx.form.name || '').trim() ? '' : 'Add your name.'; }, doneMsg: 'Saved. Your profile is updated.' }) },
        { id: 'day', t: 'Look at My Day', s: 'Your tasks, meetings and what waits on you.', icon: 'home', label: 'Open My Day', run: function (s2, done) { window.location.href = 'D-Staff.dc.html'; } },
        { id: 'proj', t: 'Meet your projects', s: 'The projects in your departments. No amounts, only chips.', icon: 'folder', label: 'Open Projects', run: function (s2, done) { window.location.href = 'S-Projects.dc.html'; } },
        { id: 'msg', t: 'Try Messages', s: 'Replies, mentions and notes to the team.', icon: 'msg', label: 'Open Messages', run: function (s2, done) { window.location.href = 'S-Messages.dc.html'; } },
        { id: 'note', t: 'Choose what reaches you', s: 'Tasks, mentions and approvals, by email or in the app.', icon: 'bell', label: 'Choose', run: form({ eyebrow: 'Notifications', title: 'What reaches you', body: 'You can change this any time in Settings.', form: { mail: 'Tasks and mentions' }, chipSets: [{ key: 'mail', label: 'Email me about', opts: ['Everything', 'Tasks and mentions', 'Mentions only', 'Nothing'] }], primary: 'Save choice', doneMsg: 'Saved. Your notifications are set.' }) }
      ],
      rail: function () { return [{ title: 'Need a hand?', note: 'Ask the team or read a guide.', rows: [{ t: 'Help centre', s: 'Short guides', icon: 'life', open: function () { window.location.href = 'S-Support.dc.html'; } }, { t: 'Message Admin', s: 'Usually the same hour', icon: 'msg', open: function () { window.location.href = 'S-Messages.dc.html'; } }] }]; } };
  }
