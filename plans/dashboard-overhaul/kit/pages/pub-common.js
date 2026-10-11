  /* ======================= Public and sign in pages: shared helpers =======================
     These pages have no sidebar. They are what a client, a payer or a visitor sees, so the words are plain and each one has a preview-as row to show its states. */
  role() { return 'admin'; }
  pageName() { return this.pubTitle ? this.pubTitle() : 'WDC Studio'; }
  navCounts() { return {}; }
  pvStates(list, key) { var self = this, s = this.state; return list.map(function (o) { var on = s[key] === o[0]; return { t: o[1], cls: on ? 'on' : '', pressed: on ? 'true' : 'false', pick: function () { var p = { ra: self.state.ra + 1 }; p[key] = o[0]; self.setState(p); } }; }); }
  set(patch) { this.setState(Object.assign({ ra: this.state.ra + 1 }, patch)); }
  emailOk(v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v || '').trim()); }
  googleMark() { return 'M21.35 11.1H12v2.9h5.35c-.5 2.4-2.5 3.9-5.35 3.9a6 6 0 1 1 3.9-10.55l2.1-2.1A9 9 0 1 0 12 21c5 0 8.6-3.5 8.6-8.4 0-.5 0-1-.1-1.5z'; }
  firstName(email) { var n = (email || '').split('@')[0].split(/[._-]/)[0] || ''; return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'there'; }
  tourSteps() { return []; }
