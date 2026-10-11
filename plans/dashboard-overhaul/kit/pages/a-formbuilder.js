  /* ======================= Owner · Form builder (Contact form) ======================= */
  pageName() { return 'Clients'; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'What the form needs', icon: I.target, body: 'Questions that people skip, and the one setting that stops the form working.' },
      { target: 'table', title: 'The questions, in order', icon: I.file, body: 'Move a question up or down, make it required, or remove it. The preview on the right updates as you go.' },
      { target: 'rail', title: 'How it reads to a visitor', icon: I.eye, body: 'The form exactly as it shows on the site, with the required marks.' },
      { target: 'new', title: 'Add a question', icon: I.plus, body: 'Short answer, long answer, a choice or a file. Each says why it is asked.' }
    ];
  }
  fbTypes() { return ['Short answer', 'Long answer', 'Email', 'Phone', 'Choice', 'File']; }
  fbAll() {
    var base = [
      { id: 'q1', name: 'Your name', sub: 'So we know who to reply to', type: 'Short answer', req: true, skips: 1 },
      { id: 'q2', name: 'Email address', sub: 'Where we reply. Temporary inboxes are refused', type: 'Email', req: true, skips: 0 },
      { id: 'q3', name: 'Phone number', sub: 'Optional, for a quick call', type: 'Phone', req: false, skips: 61 },
      { id: 'q4', name: 'What do you need?', sub: 'Brand, website, social media, SEO, an app or something else', type: 'Choice', req: true, skips: 2, opts: ['Brand identity', 'Website', 'Social media', 'SEO', 'App or software', 'Something else'] },
      { id: 'q5', name: 'Tell us about it', sub: 'A few lines about the project', type: 'Long answer', req: true, skips: 4 },
      { id: 'q6', name: 'Anything we should look at?', sub: 'A brief, a logo or a link', type: 'File', req: false, skips: 78 }
    ];
    var self = this, list = this.hubApply('fq', base);
    return list.map(function (x, i) { return Object.assign({ ord: i }, x); }).sort(function (a, b) { return (a.ord || 0) - (b.ord || 0); });
  }
  fbMove(q, d) {
    var self = this, all = this.fbAll(), i = all.map(function (x) { return x.id; }).indexOf(q.id), j = i + d;
    if (j < 0 || j >= all.length) { this.say(d < 0 ? 'It is already the first question.' : 'It is already the last question.'); return; }
    var m = Object.assign({}, this.state.pst);
    all.forEach(function (x, k) { m[x.id] = Object.assign({}, m[x.id] || {}, { ord: k }); });
    m[all[i].id].ord = j; m[all[j].id].ord = i;
    this.setState({ pst: m, ra: this.state.ra + 1 }); this.say('Updated. “' + q.name + '” moved ' + (d < 0 ? 'up' : 'down') + '.');
  }
  fbEdit(q) {
    var self = this, I = this.icons(), edit = !!q;
    var start = q ? { name: q.name, sub: q.sub, type: q.type, req: q.req ? 'Required' : 'Optional', opts: (q.opts || []).join(', ') } : { name: '', sub: '', type: 'Short answer', req: 'Optional', opts: '' };
    this.open(this.sh({ eyebrow: edit ? 'Edit question' : 'New question', title: edit ? q.name : 'Add a question', icon: I.file, keepOpen: true, focus: 'f-name',
      body: 'Ask only what changes the work. Every extra question costs a few visitors.',
      guard: function (ctx) { var f = ctx.form; return ['name', 'sub', 'opts'].some(function (k) { return (f[k] || '') !== (start[k] || ''); }); }, guardBody: 'The question is not saved. If you close now, your changes are lost.',
      form: start,
      fields: function (st) { var f = st.form, out = [{ key: 'name', label: 'The question', ph: 'What do you need?', wide: true }, { key: 'sub', label: 'Why we ask', ph: 'A short line under the question', wide: true, hint: 'Shown under the question. Say what it changes for them.' }]; if (f.type === 'Choice') out.push({ key: 'opts', label: 'Options', ph: 'Brand identity, Website, SEO', type: 'area', wide: true, hint: 'Separate the options with commas. Three or more shows as a dropdown, two as a switch.' }); return out; },
      chipSets: [{ key: 'type', label: 'Type of answer', opts: this.fbTypes() }, { key: 'req', label: 'Is it required?', opts: ['Required', 'Optional'] }],
      primary: edit ? 'Save question' : 'Add question', secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form; if (!(f.name || '').trim()) return 'Write the question.'; if (f.type === 'Choice' && (f.opts || '').split(',').filter(function (x) { return x.trim(); }).length < 2) return 'Add at least two options.'; if (f.type === 'Email' && f.req === 'Optional') return ''; return ''; },
      onPrimary: function (ctx) { var f = ctx.form, d = { id: edit ? q.id : 'qn' + Date.now(), name: f.name.trim(), sub: (f.sub || '').trim(), type: f.type, req: f.req === 'Required', skips: edit ? q.skips : 0, opts: f.type === 'Choice' ? f.opts.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : undefined }; self.setState({ sheet: null, stack: [] }); if (edit) self.hubPatch(q.id, d); else self.hubAdd('fq', Object.assign(d, { ord: 99 })); self.say(edit ? 'Updated. The question is saved on the live form.' : 'Saved. The question is on the form.'); } }));
  }
  fbSheet(q) {
    var self = this, I = this.icons();
    return this.sh({ eyebrow: q.type + ' · ' + (q.req ? 'Required' : 'Optional'), title: q.name, icon: I.file, iconTone: 'var(--ad-tone-brand)', chip: q.req ? 'Required' : 'Optional', tone: q.req ? 'var(--ad-tone-brand)' : 'var(--ad-tone-flat)',
      rows: [{ k: 'Why we ask', v: q.sub || 'Not set' }, { k: 'Type', v: q.type }, { k: 'Skipped by', v: q.skips + '% of visitors' }].concat(q.opts ? [{ k: 'Options', v: q.opts.join(', ') }] : []),
      body: q.skips > 50 ? 'More than half of visitors skip this. If you never use the answer, remove it.' : 'Most visitors answer this.',
      primary: 'Edit question', secondary: q.req ? 'Make optional' : 'Make required',
      onPrimary: function () { self.closeSheet(true); setTimeout(function () { self.fbEdit(q); }, 80); },
      onSecondary: function () { self.hubPatch(q.id, { req: !q.req }); self.closeSheet(true); self.say('Updated. “' + q.name + '” is ' + (q.req ? 'optional' : 'required') + '.'); } });
  }
  hubCfg() {
    var self = this, I = this.icons(), G = 'var(--ad-tone-good)', Fl = 'var(--ad-tone-flat)';
    var items = function () { return self.fbAll().map(function (q, i) { return Object.assign({}, q, { hay: q.name + ' ' + q.type, cells: [{ t: q.type }, { tag: true, t: q.req ? 'Required' : 'Optional', tone: q.req ? 'var(--ad-tone-brand)' : Fl, ink: q.req ? '#fff' : 'var(--ad-on-flat)' }, { t: q.skips + '%', cls: 'r num' }, { t: String(i + 1), cls: 'r num' }] }); }); };
    return {
      title: 'Contact form', statsTitle: 'Form pulse', deckTitle: 'The form this week', newLabel: 'Add a question', newFn: function () { self.fbEdit(); },
      ledeA: function () { var a = self.fbAll(); return a.length + ' questions, ' + a.filter(function (q) { return q.req; }).length + ' required.'; }, ledeB: function () { return 'Live at /contact.'; },
      emptyTitle: 'The form is in good shape.', emptyNext: 'The next change shows on the site straight away.',
      chores: function (it, I2) { return [it('Add a question', I2.plus, function () { self.fbEdit(); }), it('Back to Enquiries', I2.inbox, function () { window.location.href = 'A-Forms.dc.html'; }), it('View on the site', I2.link, function () { self.say('The form opens on the site in a new tab.'); })]; },
      tabs: [{ key: 'fq', label: 'Questions', title: 'Questions', noun: 'questions', one: 'question', ph: 'Question or type', file: 'wdc-contact-form', actLabel: 'Add a question', actD: I.plus, act: function () { self.fbEdit(); }, emptyT: 'No questions yet.', emptyB: 'Start with the name and email.',
        cols: [{ t: 'Question' }, { t: 'Type' }, { t: 'Required' }, { t: 'Skipped', cls: 'r' }, { t: 'Order', cls: 'r' }], items: items,
        chips: [['all', 'All', function () { return true; }], ['req', 'Required', function (x) { return x.req; }], ['opt', 'Optional', function (x) { return !x.req; }]],
        exportCols: [{ t: 'Question', v: function (q) { return q.name; } }, { t: 'Type', v: function (q) { return q.type; } }, { t: 'Required', v: function (q) { return q.req ? 'Yes' : 'No'; } }, { t: 'Skipped %', v: function (q) { return q.skips; } }],
        sheet: function (q) { return self.fbSheet(q); },
        actions: function (q, it, I2) { return [it('Edit question', I2.edit, function () { self.fbEdit(q); }), it('Move up', I2.out, function () { self.fbMove(q, -1); }), it('Move down', I2.down, function () { self.fbMove(q, 1); }), it(q.req ? 'Make optional' : 'Make required', I2.check, function () { self.hubPatch(q.id, { req: !q.req }); self.say('Updated.'); }), self.menuSep(), it('Remove…', I2.trash, function () { self.ask({ eyebrow: 'Remove', title: 'Remove “' + q.name + '” from the form?', body: 'Visitors stop seeing it straight away. Answers already received stay on their entries.', ok: 'Remove question', danger: true, icon: I2.trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.hubGone([q.id], '“' + q.name + '” removed from the form.'); } }); }, { danger: true })]; },
        bulk: function () { return [{ label: 'Make optional', icon: I.check, fn: function (sel, done) { sel.forEach(function (q) { self.hubPatch(q.id, { req: false }); }); self.say('Updated. ' + sel.length + ' made optional.'); done(); } }, { label: 'Remove', icon: I.trash, danger: true, fn: function (sel, done) { self.ask({ eyebrow: 'Remove', title: 'Remove ' + sel.length + ' questions?', body: 'They leave the form straight away.', ok: 'Remove questions', danger: true, icon: I.trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.hubGone(sel.map(function (x) { return x.id; }), sel.length + ' questions removed.'); done(); } }); } }]; } }],
      stats: function () { var a = self.fbAll(); return [
        { label: 'Questions', value: String(a.length), note: 'Fewer finish more', noteCol: 'var(--ad-dim)', dot: 'var(--ad-series-1)', ic: I.file, fn: function () {} },
        { label: 'Finish rate', value: '38%', note: 'Of people who start', noteCol: G, dot: G, ic: I.check, fn: function () {} }]; },
      rail: function () { var a = self.fbAll(); return [{ title: 'Preview', sub: 'As visitors see it', rows: a.map(function (q) { return { t: q.name + (q.req ? ' *' : ''), s: q.type, d: I.file, open: function () { self.open(self.fbSheet(q)); } }; }) }]; },
      deck: function () { var q6 = self.fbAll().filter(function (q) { return q.id === 'q6'; })[0] || { id: 'q6', name: '', sub: '', type: 'File', req: false, skips: 0 }; return [
        { id: 'fb1', kind: 'Drop off', urgency: '78% skip it', utone: '#a16207', label: 'Question', dept: 'Studio', title: 'Most visitors skip the file upload', body: '“Anything we should look at?” is optional and 78% leave it empty. People who attach a file get a reply that is more specific.', meta: [{ k: 'Skipped by', v: '78%' }, { k: 'Type', v: 'File' }, { k: 'Required', v: 'No' }], why: 'A line saying what a good file looks like usually lifts uploads.', primaryLabel: 'Edit the question', primaryFn: function () { self.fbEdit(q6); }, secondaryLabel: 'Leave it', sToast: 'Left as it is.', sheet: self.fbSheet(q6) }]; }
    };
  }
