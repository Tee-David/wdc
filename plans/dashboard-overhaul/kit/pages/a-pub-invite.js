  /* ======================= Accept an invitation, reset a password ======================= */
  pubTitle() { return 'Set your password'; }
  pageState() { return { v: 'invite', pwd: '', pwd2: '', showP: false, err: '', ra: 0 }; }
  renderVals() {
    var s = this.state, self = this, v = s.v, p = s.pwd, G = 'M5 12l5 5L20 7', X = 'M6 6l12 12M18 6L6 18';
    var breached = ['password123', 'qwerty12345', 'welcome2026', 'passwordpassword'].indexOf(p.toLowerCase()) >= 0;
    var reqs = [[p.length >= 10, 'At least 10 characters'], [!!p && !/^(.)\1+$/.test(p) && !/^(0123456789|abcdefghij)/i.test(p), 'Not a run of one character or a simple sequence'], [!!p && !breached, 'Not in a known data breach'], [!!s.pwd2 && s.pwd2 === p, 'Both entries match']].map(function (r) { return { t: r[1], cls: r[0] ? '' : 'no', d: r[0] ? G : (p ? X : 'M12 12h.01') }; });
    var ok = reqs.every(function (r) { return r.cls === ''; });
    return Object.assign(this.kit(), this.extraVals(), {
      hasStates: true, states: this.pvStates([['invite', 'Invitation'], ['reset', 'Reset'], ['check', 'Check unavailable'], ['used', 'Link used'], ['done', 'Done']], 'v'),
      isForm: v === 'invite' || v === 'reset' || v === 'check', isInvite: v === 'invite', isUsed: v === 'used', isDone: v === 'done',
      heading: v === 'reset' ? 'Choose a new password' : 'Welcome, Adaeze', lede: v === 'reset' ? 'Pick one you have not used here before. Everywhere you are signed in is signed out when you save.' : 'Babatope invited you to your Mira Skincare portal. Set a password and you are in. You can add a passkey later in Settings.',
      pwd: p, pwd2: s.pwd2, onPwd: function (e) { self.set({ pwd: e.target.value, err: '' }); }, onPwd2: function (e) { self.set({ pwd2: e.target.value, err: '' }); }, pwType: s.showP ? 'text' : 'password', showP: s.showP ? 'true' : 'false', showLabel: s.showP ? 'Hide password' : 'Show password', toggleShow: function () { self.set({ showP: !self.state.showP }); },
      reqs: reqs, err: v === 'check' && !s.err ? 'We could not check this password against known breaches just now, so we cannot accept it. Try again in a moment.' : s.err, hasErr: !!s.err || v === 'check', cta: v === 'reset' ? 'Save the new password' : 'Create my password',
      submit: function () { var st = self.state; if (st.v === 'check') { self.set({ err: 'We could not check this password against known breaches just now, so we cannot accept it. Try again in a moment.' }); return; } if (!ok) { self.set({ err: breached ? 'That password has appeared in a known data breach. Pick another.' : 'Check the rules above. Every one needs a tick.' }); return; } self.set({ v: 'done', err: '' }); },
      doneHead: v === 'done' && s.pwd ? 'Password saved' : 'Password saved', doneNote: 'You are signed in on this device. Other devices were signed out.', doneCta: 'Go to my portal',
      newLink: function () { self.say('A fresh link is on its way to your inbox.'); }, toSignIn: function () { self.say('In the live site this opens the sign in page or your portal.'); }
    });
  }
