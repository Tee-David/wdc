  /* ======================= Welcome: first run checklist, same shape for all three roles ======================= */
  pageState() { return { ra: 0, wd: this.shared('welcome-' + this.role(), {}) }; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'table', title: 'Your first steps', icon: I.check, body: 'Each step takes a minute and ends with a tick. Skip any of them and come back from the profile menu.' },
      { target: 'rail', title: 'Help is close', icon: I.life, body: 'The tour, the help centre and a person to ask.' }
    ];
  }
  deck() { return []; }
  wdMark(id) { var d = Object.assign({}, this.state.wd); d[id] = true; this.setShared('welcome-' + this.role(), d); this.setState({ wd: d, ra: this.state.ra + 1 }); }
  renderVals() {
    var s = this.state, self = this, I = this.icons(), W = this.welcomeCfg(), G = 'var(--ad-tone-good)';
    var firstOpen = -1; W.steps.forEach(function (x, i) { if (!s.wd[x.id] && !(x.auto && x.auto(self)) && firstOpen < 0) firstOpen = i; });
    var steps = W.steps.map(function (x, i) { var done = !!s.wd[x.id] || !!(x.auto && x.auto(self)), next = i === firstOpen; return { t: x.t, s: x.s, d: done ? 'M20 6 9 17l-5-5' : (I[x.icon] || I.check), tone: done ? G : 'var(--ad-tone-brand)', tag: done ? 'Done' : (next ? 'Next' : 'To do'), tagTone: done ? G : (next ? 'var(--ad-tone-live)' : 'var(--ad-tone-flat)'), tagInk: done || next ? '#fff' : 'var(--ad-on-flat)', btnCls: next ? 'btn' : 'btn2', label: done ? 'Open again' : x.label, run: function () { x.run(self, function (msg) { self.wdMark(x.id); self.say(msg || 'Saved. Step done.'); }); } }; });
    var n = W.steps.filter(function (x) { return s.wd[x.id] || (x.auto && x.auto(self)); }).length, all = n === W.steps.length;
    var railCards = W.rail(this).map(function (c, i) { return { title: c.title, note: c.note, delay: 'd' + (i + 3), rows: c.rows.map(function (r) { return { t: r.t, s: r.s, d: I[r.icon] || I.life, open: r.open }; }) }; });
    return Object.assign(this.kit(), this.extraVals(), this.deckView([]), {
      pageTitle: W.title, ledeA: all ? 'Everything is set up.' : 'A few quick steps and you are ready.', ledeB: all ? 'Welcome aboard.' : n + ' of ' + W.steps.length + ' done.',
      skip: function () { window.location.href = W.home; }, skipLabel: all ? 'Go to ' + W.homeName : 'Skip for now',
      heroTitle: all ? 'You are all set' : W.hero, heroBody: all ? 'You can change any of this later from Settings.' : W.heroBody, total: W.steps.length, doneN: n, pct: Math.round(n / W.steps.length * 100), progressText: n + ' of ' + W.steps.length,
      steps: steps, railCards: railCards
    });
  }
