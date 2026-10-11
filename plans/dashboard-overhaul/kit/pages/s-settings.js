  /* ======================= Staff · Settings model ======================= */
  setL(key, v) { var l = Object.assign({}, this.state.lists); l[key] = v; this.setState({ lists: l, ra: this.state.ra + 1 }); }
  setModel() {
    var self = this, I = this.icons(), F = 'var(--ad-tone-flat)', G = 'var(--ad-tone-good)';
    var sections = [
      { label: 'Profile', icon: 'users', cards: [
        { title: 'About you', sub: 'Shown to your teammates and on client messages.', rows: [
          { key: 'p.name', type: 'text', label: 'Name', hint: 'How clients and teammates see you.', def: 'Chiamaka A.', check: function (v) { return v.trim() ? '' : 'Add your name.'; } },
          { key: 'p.email', type: 'text', label: 'Email', hint: 'Where your notifications go.', def: 'chiamaka@wdc.ng', check: function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()) ? '' : 'Check the email address.'; } },
          { key: 'p.phone', type: 'text', label: 'Phone', hint: 'Only Admin sees it.', def: '+234 810 000 0000' },
          { key: 'p.dept', type: 'static', label: 'Department', hint: 'Decides which projects and clients you see.', value: 'Social & Ads', tag: ['Set by Admin', F], lock: { why: 'Only Admin can change your department.', fix: 'Ask Admin if your work has moved.' }, action: { label: 'Ask Admin', fn: function () { window.location.href = 'S-Support.dc.html'; } } }] },
        { title: 'Working week', sub: 'Tells teammates when to expect a reply.', rows: [
          { key: 'w.days', type: 'select', label: 'Working days', hint: 'Alerts are held outside these days.', def: 'Monday to Friday', opts: ['Monday to Friday', 'Monday to Saturday', 'Custom'] },
          { key: 'w.hours', type: 'select', label: 'Working hours', hint: 'Push alerts wait until the morning.', def: '09:00 to 17:30', opts: ['08:00 to 16:30', '09:00 to 17:30', '10:00 to 18:30'] }] }
      ] },
      { label: 'Notifications', icon: 'bell', cards: [
        { title: 'What reaches you', sub: 'Nothing is sent that you switch off here. Admin can still message you in the app.', grid: self.notifGrid([['reply', 'Client replies and approvals', 'Messages and approvals on your projects', [true, true, true]], ['task', 'Tasks assigned to you', 'New tasks and handovers', [true, true, true]], ['due', 'Tasks due today', 'A reminder at the start of the day', [false, true, true]], ['ment', 'Mentions', 'When a teammate mentions you', [true, true, true]], ['week', 'Weekly update reminder', 'Friday afternoon', [true, false, false]], ['ticket', 'Your tickets', 'Answers from Admin', [true, true, true]]]) },
        { title: 'Quiet hours', rows: [{ key: 'q.hours', type: 'select', label: 'Hold push alerts', hint: 'Email is never held.', def: '19:00 to 07:00', opts: ['Off', '19:00 to 07:00', '21:00 to 07:00'] }] }
      ] },
      { label: 'Appearance', icon: 'sun', cards: [
        { title: 'How it looks', sub: 'Applies on this device when you save.', rows: [
          { key: 'theme', type: 'seg', label: 'Theme', hint: 'Light or dark. The footer switch in the sidebar does the same.', def: 'Light', opts: ['Light', 'Dark'] },
          { key: 'a.motion', type: 'static', label: 'Motion', hint: 'We follow your device. If it asks for less motion, animations stop.', value: 'Follows your device', tag: ['Automatic', F] },
          { key: 'a.app', type: 'static', label: 'The app', hint: 'Approvals, replies and handovers as push alerts.', value: 'Installed on this device? Not yet', action: { label: 'Install the app', fn: function () { self.say('Installing… the app appears on your home screen.'); } } }] }
      ] }
    ];
    return { role: 'staff', sections: sections, navBase: { Messages: { n: 2 } }, lede: 'Your profile, notifications and how it looks. Changes wait for Save.', tourNav: 'Profile, Notifications and Appearance. Anything about your role or department is set by Admin.',
      chores: function (s, it, I2) { return [it('Reset unsaved changes', I2.undo, function () { s.setState({ sv: {} }); s.say('Unsaved changes discarded.'); }), it('Ask Admin about access', I2.life, function () { window.location.href = 'S-Support.dc.html'; })]; } };
  }
