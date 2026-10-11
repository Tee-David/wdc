  /* ======================= Sign in: identify, method, code, success, reset ======================= */
  pubTitle() { return 'Sign in'; }
  pageState() { return { step: 'identify', email: '', pwd: '', showP: false, tab: 'magic', code: '', err: '', tries: 0, sent: 0, ra: 0 }; }
  renderVals() {
    var s = this.state, self = this, st = s.step, I = this.icons();
    var dest = /@wendiloveee\.com$/i.test(s.email) ? 'Today' : (/@wdcstudio\.ng$/i.test(s.email) ? 'My Day' : 'your Home page');
    var tabs = [['magic', 'Email link'], ['password', 'Password'], ['key', 'Passkey']].map(function (t) { var on = s.tab === t[0]; return { label: t[1], cls: on ? 'on' : '', sel: on ? 'true' : 'false', pick: function () { self.set({ tab: t[0], err: '' }); } }; });
    var boxes = [0, 1, 2, 3, 4, 5].map(function (i) { return { t: s.code.charAt(i) || '', cls: i === Math.min(s.code.length, 5) ? 'on' : '' }; });
    var locked = s.tries >= 5;
    return Object.assign(this.kit(), this.extraVals(), {
      hasStates: true, states: this.pvStates([['identify', 'Email'], ['method', 'Method'], ['magic', 'Code'], ['done', 'Signed in'], ['reset', 'Reset'], ['resetSent', 'Reset sent']], 'step'),
      isId: st === 'identify', isMethod: st === 'method', isMagic: st === 'magic', isDone: st === 'done', isReset: st === 'reset', isResetSent: st === 'resetSent',
      email: s.email || (st === 'identify' || st === 'reset' ? '' : 'adaeze@miraskincare.ng'), onEmail: function (e) { self.set({ email: e.target.value, err: '' }); }, err: s.err, hasErr: !!s.err, gPath: this.googleMark(),
      toMethod: function () { if (!self.emailOk(self.state.email)) { self.set({ err: 'Check the email address. It should look like you@business.ng.' }); return; } self.set({ step: 'method', err: '', tab: 'magic' }); },
      google: function () { self.say('Google opens here. Only addresses the studio has invited can come back in.'); },
      change: function () { self.set({ step: 'identify', code: '', err: '' }); }, tabs: tabs, tMagic: s.tab === 'magic', tPass: s.tab === 'password', tKey: s.tab === 'key',
      sendLink: function () { self.set({ step: 'magic', sent: Date.now(), code: '', err: '' }); },
      pwd: s.pwd, onPwd: function (e) { self.set({ pwd: e.target.value, err: '' }); }, pwType: s.showP ? 'text' : 'password', showP: s.showP ? 'true' : 'false', showLabel: s.showP ? 'Hide password' : 'Show password', toggleShow: function () { self.set({ showP: !self.state.showP }); },
      lockedOut: locked, signIn: function () { var t = self.state.tries; if (t >= 5) return; if (!self.state.pwd) { self.set({ err: 'Type your password.' }); return; } if (self.state.pwd !== 'Studio-2026-ok') { var n = t + 1; self.set({ tries: n, err: n >= 5 ? 'Too many tries. Wait 10 minutes, or sign in with an email link instead.' : 'That password does not match. ' + (5 - n) + (5 - n === 1 ? ' try' : ' tries') + ' left. Demo password: Studio-2026-ok' }); return; } self.set({ step: 'done', err: '', tries: 0 }); },
      forgot: function () { self.set({ step: 'reset', err: '' }); }, usePasskey: function () { self.say('Your device asks for your fingerprint, face or PIN.'); setTimeout(function () { self.set({ step: 'done' }); }, self.reduce ? 200 : 900); },
      code: s.code, onCode: function (e) { var v = e.target.value.replace(/\D/g, '').slice(0, 6); self.set({ code: v, err: '' }); if (v.length === 6) setTimeout(function () { self.verifyCode(); }, 60); }, boxes: boxes, verify: function () { self.verifyCode(); },
      waitResend: false, resendLabel: s.sent && s.sent !== 1 ? 'Send a new code' : 'Send a new code', resend: function () { self.set({ sent: Date.now(), code: '', err: '' }); self.say('A new link and code are on their way. The old ones stop working.'); },
      first: this.firstName(s.email), dest: dest, goOn: function () { self.say('In the live portal this opens ' + dest + '.'); }, restart: function () { self.set({ step: 'identify', email: '', pwd: '', code: '', err: '' }); },
      sendReset: function () { if (!self.emailOk(self.state.email)) { self.set({ err: 'Check the email address. It should look like you@business.ng.' }); return; } self.set({ step: 'resetSent', err: '' }); }, back: function () { self.set({ step: 'identify', err: '' }); }
    });
  }
  verifyCode() { if (this.state.code.length < 6) { this.set({ err: 'Type all 6 digits.' }); return; } if (this.state.code !== '482913') { this.set({ err: 'That code does not match. Check the email, or ask for a new one.' }); return; } this.set({ step: 'done', err: '' }); }
