  /* ======================= Owner · Form builder =======================
     The same page shape as Settings: sections on the left, rows on the right, a Save bar per section.
     Questions are a list with a menu per row. Wording, schedule, emails and spam are rows. Publish sits in the head. */
  setL(key, v) { var l = Object.assign({}, this.state.lists); l[key] = v; this.setState({ lists: l, ra: this.state.ra + 1 }); }
  getL(key) { return this.state.lists[key]; }
  pageName() { return 'Clients'; }
  fbTypes() { return ['Short answer', 'Long answer', 'Email', 'Phone', 'Number', 'Date', 'Dropdown', 'Choose one', 'Choose several', 'File', 'Section heading', 'Agreement']; }
  fbBase() {
    return [
      { id: 'q1', name: 'Your name', help: 'So we know who to reply to', type: 'Short answer', req: true, skips: 1 },
      { id: 'q2', name: 'Email address', help: 'Where we reply. Temporary inboxes are refused', type: 'Email', req: true, skips: 0 },
      { id: 'q3', name: 'Phone or WhatsApp', help: 'Optional, for a quick call', type: 'Phone', req: false, skips: 61 },
      { id: 'q4', name: 'What do you need?', help: 'Brand, website, social media, SEO, an app or something else', type: 'Dropdown', req: true, skips: 2, opts: ['Brand identity', 'Website', 'Social media', 'SEO', 'App or software', 'Something else'] },
      { id: 'q5', name: 'Tell us about it', help: 'A few lines about the project', type: 'Long answer', req: true, skips: 4, min: 20 },
      { id: 'q6', name: 'Anything we should look at?', help: 'A brief, a logo or a link', type: 'File', req: false, skips: 78 }
    ];
  }
  fbQs() { return this.getL('fq') || this.fbBase(); }
  fbMove(q, d) {
    var a = this.fbQs().slice(), i = a.map(function (x) { return x.id; }).indexOf(q.id), j = i + d;
    if (j < 0 || j >= a.length) { this.say(d < 0 ? 'It is already the first question.' : 'It is already the last question.'); return; }
    var t = a[i]; a[i] = a[j]; a[j] = t; this.setL('fq', a); this.say('Updated. “' + q.name + '” moved ' + (d < 0 ? 'up' : 'down') + '.');
  }
  fbEdit(q) {
    var self = this, I = this.icons(), edit = !!q;
    var start = q ? { name: q.name, help: q.help || '', ph: q.ph || '', type: q.type, req: q.req ? 'Required' : 'Optional', opts: (q.opts || []).join('\n'), min: q.min ? String(q.min) : '', max: q.max ? String(q.max) : '' } : { name: '', help: '', ph: '', type: 'Short answer', req: 'Optional', opts: '', min: '', max: '' };
    var choice = function (t) { return ['Dropdown', 'Choose one', 'Choose several'].indexOf(t) >= 0; };
    this.open(this.sh({ eyebrow: edit ? 'Edit question' : 'New question', title: edit ? q.name : 'Add a question', icon: I.file, keepOpen: true, focus: 'f-name',
      body: 'Ask only what changes the work. Every extra question costs a few visitors.',
      guard: function (ctx) { var f = ctx.form; return ['name', 'help', 'opts'].some(function (k) { return (f[k] || '') !== (start[k] || ''); }); }, guardBody: 'The question is not saved. If you close now, your changes are lost.',
      form: start,
      fields: function (st) { var f = st.form, out = [{ key: 'name', label: f.type === 'Section heading' ? 'Heading' : (f.type === 'Agreement' ? 'What they agree to' : 'The question'), ph: 'What do you need?', wide: true }]; if (f.type !== 'Section heading') out.push({ key: 'help', label: 'Help text', ph: 'A short line under the question', wide: true, hint: 'Say what it changes for them.' }); if (['Short answer', 'Long answer', 'Email', 'Phone', 'Number'].indexOf(f.type) >= 0) out.push({ key: 'ph', label: 'Placeholder', ph: 'Shown inside the field', wide: true }); if (f.type === 'Number') { out.push({ key: 'min', label: 'Smallest', mode: 'numeric' }); out.push({ key: 'max', label: 'Largest', mode: 'numeric' }); } if (choice(f.type)) out.push({ key: 'opts', label: 'Choices, one per line', type: 'area', wide: true, hint: f.type === 'Dropdown' && (f.opts || '').split('\n').filter(function (x) { return x.trim(); }).length > 10 ? 'More than ten: shown as a searchable list.' : (f.type === 'Dropdown' ? 'Ten or fewer: shown as a plain list.' : 'Visitors tick from these.') }); return out; },
      chipSets: function (st) { var out = [{ key: 'type', label: 'Type of answer', opts: self.fbTypes() }]; if (st.form.type !== 'Section heading') out.push({ key: 'req', label: 'Is it required?', opts: ['Required', 'Optional'] }); return out; },
      primary: edit ? 'Save question' : 'Add question', secondary: 'Cancel',
      primaryDis: function (ctx) { var f = ctx.form; if (!(f.name || '').trim()) return 'Write the question.'; if (choice(f.type) && (f.opts || '').split('\n').filter(function (x) { return x.trim(); }).length < 2) return 'Add at least two choices.'; if (f.type === 'Number' && f.min && f.max && +f.min > +f.max) return 'The smallest cannot be above the largest.'; return ''; },
      onPrimary: function (ctx) { var f = ctx.form, d = { id: edit ? q.id : 'qn' + Date.now(), name: f.name.trim(), help: (f.help || '').trim(), ph: (f.ph || '').trim(), type: f.type, req: f.req === 'Required' && f.type !== 'Section heading', skips: edit ? q.skips : 0, min: f.min ? +f.min : undefined, max: f.max ? +f.max : undefined, opts: choice(f.type) ? f.opts.split('\n').map(function (x) { return x.trim(); }).filter(Boolean) : undefined }; var a = self.fbQs().slice(); if (edit) a = a.map(function (x) { return x.id === q.id ? d : x; }); else a.push(d); self.setState({ sheet: null, stack: [] }); self.setL('fq', a); self.say(edit ? 'Updated. The question is saved on the draft.' : 'Saved. The question is on the draft.'); } }));
  }
  fbPreview() {
    var self = this, I = this.icons(), qs = this.fbQs();
    this.open(this.sh({ eyebrow: 'Preview', title: this.sval('fb.title', 'Contact the studio'), icon: I.eye, body: this.sval('fb.intro', 'Tell us what you need and we will reply within one working day.'),
      rows: qs.map(function (q) { return { k: q.name + (q.req ? ' *' : ''), v: q.type + (q.opts ? ': ' + q.opts.slice(0, 3).join(', ') + (q.opts.length > 3 ? '…' : '') : '') }; }).concat([{ k: 'Button', v: self.sval('fb.button', 'Send') }]),
      primary: 'Close', onPrimary: function () {} }));
  }
  fbProblems() {
    var p = [], qs = this.fbQs(); if (!this.sval('fb.title', 'Contact the studio').trim()) p.push('Give the form a title.'); if (!qs.some(function (q) { return q.type !== 'Section heading'; })) p.push('Add at least one question.'); if (!/^[a-z0-9-]{2,}$/.test(this.sval('fb.addr', 'contact'))) p.push('The address needs two or more small letters, numbers or dashes.'); if (this.sval('fb.state', 'Taking entries') === 'Closed' && !this.sval('fb.closedMsg', '').trim()) p.push('Say what visitors see while the form is closed.'); if (this.sval('fb.limit', '') && !/^\d+$/.test(this.sval('fb.limit', ''))) p.push('The entry limit is a whole number.');
    return p;
  }
  setModel() {
    var self = this, I = this.icons(), S = this.sh.bind(this), G = 'var(--ad-tone-good)', F = 'var(--ad-tone-flat)', B = 'var(--ad-tone-brand)', W = 'var(--ad-tone-warn)';
    var qs = this.fbQs(), TY = { 'Short answer': 'edit', 'Long answer': 'edit', Email: 'mail', Phone: 'phone', Number: 'chart', Date: 'cal', Dropdown: 'nav', 'Choose one': 'check', 'Choose several': 'check', File: 'upload', 'Section heading': 'layers', Agreement: 'check' };
    var sections = [
      { label: 'Questions', icon: 'edit', n: function () { return qs.length; }, cards: [
        { title: 'Questions', sub: 'In the order visitors see them. Open one to change it.', act: { label: 'Add a question', fn: function () { self.fbEdit(); } }, list: function () {
          return self.fbQs().map(function (q, i) { return { id: q.id, t: q.name, s: q.type + (q.req ? ', required' : '') + (q.skips > 50 ? ', skipped by ' + q.skips + '%' : ''), ini: String(i + 1), tone: q.skips > 50 ? W : B, tag: q.req ? 'Required' : 'Optional', tagTone: q.req ? B : F,
            menu: [{ t: 'Edit question', icon: 'edit', fn: function () { self.fbEdit(q); } }, { t: 'Move up', icon: 'out', fn: function () { self.fbMove(q, -1); } }, { t: 'Move down', icon: 'down', fn: function () { self.fbMove(q, 1); } }, { t: 'Duplicate', icon: 'file', fn: function () { var a = self.fbQs().slice(), k = a.map(function (x) { return x.id; }).indexOf(q.id); a.splice(k + 1, 0, Object.assign({}, q, { id: 'qc' + Date.now(), name: q.name + ' (copy)' })); self.setL('fq', a); self.say('Saved. The copy is on the draft.'); } }, { t: q.req ? 'Make optional' : 'Make required', icon: 'check', fn: function () { self.setL('fq', self.fbQs().map(function (x) { return x.id === q.id ? Object.assign({}, x, { req: !x.req }) : x; })); self.say('Updated.'); } }, { sep: true }, { t: 'Remove…', icon: 'trash', danger: true, fn: function () { self.ask({ eyebrow: 'Remove', title: 'Remove “' + q.name + '” from the form?', body: 'Visitors stop seeing it once you publish. Answers already received stay on their entries.', ok: 'Remove question', danger: true, icon: I.trash, tone: 'var(--ad-tone-bad)', onOk: function () { self.setL('fq', self.fbQs().filter(function (x) { return x.id !== q.id; })); self.say('“' + q.name + '” removed from the draft.'); } }); } }] }; });
        } }
      ] },
      { label: 'Wording and style', icon: 'layers', cards: [
        { title: 'The form', sub: 'What visitors read first.', rows: [
          { key: 'fb.title', type: 'text', label: 'Title', hint: 'The one heading on the page.', def: 'Contact the studio', check: function (v) { return v.trim() ? '' : 'Give the form a title.'; } },
          { key: 'fb.intro', type: 'area', label: 'Introduction', hint: 'Optional. One or two lines under the title.', def: 'Tell us what you need and we will reply within one working day.' },
          { key: 'fb.style', type: 'seg', label: 'Form style', hint: 'Sections puts every question on one page. Conversation asks one or two at a time with a progress bar.', def: 'Sections', opts: ['Sections', 'Conversation'] },
          { key: 'fb.per', type: 'seg', label: 'Questions on each screen', hint: 'Only for the Conversation style.', def: '1', opts: ['1', '2'] },
          { key: 'fb.button', type: 'text', label: 'Button', hint: 'Name the action.', def: 'Send your message' },
          { key: 'fb.addr', type: 'text', label: 'Address', hint: 'wdc.ng/f/' + this.sval('fb.addr', 'contact') + '. Two or more small letters, numbers or dashes.', def: 'contact', check: function (v) { return /^[a-z0-9-]{2,}$/.test(v) ? '' : 'Two or more small letters, numbers or dashes.'; } }] },
        { title: 'After sending', sub: 'What a visitor sees once the entry is in.', rows: [
          { key: 'fb.after', type: 'seg', label: 'Then', hint: 'Show a message here, or send them to a page on this site.', def: 'Show a message', opts: ['Show a message', 'Go to a page'] },
          { key: 'fb.thanks', type: 'text', label: 'Heading', hint: 'Used when you show a message.', def: 'Thank you' },
          { key: 'fb.msg', type: 'area', label: 'Message', hint: 'Empty fields keep the wording written for this form.', def: 'We have your message and will reply within one working day.' },
          { key: 'fb.page', type: 'text', label: 'Page on this site', hint: 'For a thank-you page. Only addresses on this site are allowed.', def: '', ph: '/thank-you', check: function (v) { return v && !/^\//.test(v) ? 'Start with a slash, for example /thank-you.' : ''; } }] }
      ] },
      { label: 'Opens and closes', icon: 'cal', cards: [
        { title: 'Taking entries', sub: 'Open or close the form, on a date or by a limit.', rows: [
          { key: 'fb.state', type: 'seg', label: 'State', hint: 'Closed shows the message below instead of the questions.', def: 'Taking entries', opts: ['Taking entries', 'Closed'] },
          { key: 'fb.closedMsg', type: 'area', label: 'What a visitor sees when it is closed', hint: 'Plain words, and where else to reach you.', def: 'This form is closed. Email hello@wdc.ng and we will help.' },
          { key: 'fb.opens', type: 'text', label: 'Opens on', hint: 'Optional. Studio time, UTC+1.', def: '', ph: '2026-10-20' },
          { key: 'fb.closes', type: 'text', label: 'Closes after', hint: 'Optional. The form takes entries until the end of this day.', def: '', ph: '2026-11-30' },
          { key: 'fb.limit', type: 'text', label: 'Entry limit', hint: 'Leave empty for no limit. Spam does not count.', def: '', ph: '200', check: function (v) { return v && !/^\d+$/.test(v) ? 'Use a whole number.' : ''; } },
          { key: 'fb.count', type: 'seg', label: 'Counted', hint: 'Whether the limit is for the whole life of the form or each month.', def: 'In total', opts: ['In total', 'Per month'] },
          { key: 'fb.limitMsg', type: 'area', label: 'What a visitor sees when the limit is reached', hint: 'Empty uses the closed message.', def: '' }] }
      ] },
      { label: 'Emails', icon: 'mail', cards: [
        { title: 'Who hears about an entry', sub: 'Every entry also sits in Enquiries.', rows: [
          { key: 'fb.to', type: 'text', label: 'Send to', hint: 'Separate addresses with commas. Empty means the studio inbox.', def: '', ph: 'Studio inbox' },
          { key: 'fb.reply', type: 'seg', label: 'A reply goes to', hint: 'The person who filled the form, or the studio.', def: 'The visitor', opts: ['The visitor', 'The studio'] },
          { key: 'fb.cc', type: 'text', label: 'Copy to', hint: 'Optional.', def: '' },
          { key: 'fb.bcc', type: 'text', label: 'Blind copy to', hint: 'Optional. Nobody else sees this address.', def: '' },
          { key: 'fb.subject', type: 'text', label: 'Subject', hint: 'Use {{name}} to add the visitor’s name.', def: 'New enquiry from {{name}}' }] },
        { title: 'Emails this form sends', sub: 'Preview uses the latest entry.', rows: [
          { key: 'fb.thank', type: 'switch', label: 'Send a thank you to the person who filled the form', hint: 'A short note with what happens next.', def: true },
          { key: 'fb.thankBody', type: 'area', label: 'The note', hint: 'Plain words. It is sent from the studio address.', def: 'Hello {{name}}, thank you for writing. We will reply within one working day.' },
          { key: 'fb.test', type: 'static', label: 'Send a test', hint: 'A test goes to you alone, with sample answers.', value: 'To babatope@wendiloveee.com', action: { label: 'Send test', fn: function () { self.say('A test went to babatope@wendiloveee.com.'); } } }] }
      ] },
      { label: 'Spam and keeping', icon: 'ban', cards: [
        { title: 'Spam', sub: 'A hidden field and a rate limit are always on.', rows: [
          { key: 'fb.blocked', type: 'area', label: 'Blocked words', hint: 'One per line. Entries with these words land in Spam instead of the inbox.', def: 'seo offer\ncrypto\nloan' }] },
        { title: 'Keeping entries', sub: 'Deleted entries wait in the Trash first.', rows: [
          { key: 'fb.keep', type: 'select', label: 'Keep entries in Trash for', hint: 'Then they are deleted for good.', def: '30 days', opts: ['7 days', '30 days', '90 days'] },
          { key: 'fb.reset', type: 'static', label: 'Reset to the defaults', hint: 'Puts every setting on this form back to the default. Questions stay.', value: 'Wording, emails and limits', action: { label: 'Reset settings', fn: function () { self.ask({ eyebrow: 'Reset', title: 'Put every setting on this form back to the default?', body: 'Wording, schedule, emails and spam words go back to the studio defaults. Your questions stay.', ok: 'Reset settings', danger: true, icon: I.undo, tone: 'var(--ad-tone-warn)', onOk: function () { self.setState({ saved: {}, sv: {}, ra: self.state.ra + 1 }); self.say('Updated. The settings are back to the defaults.'); } }); } } }] }
      ] }
    ];
    var ver = this.sval('fb.ver', 3);
    return { role: 'admin', title: 'Contact form', sections: sections, navBase: { Clients: { n: 5 }, Money: { n: 3, tone: 'var(--ad-tone-bad)' }, Messages: { n: 6 } }, lede: 'Live at wdc.ng/f/' + this.sval('fb.addr', 'contact') + ', version ' + ver + '. Changes wait for Save, then Publish.', tourNav: 'Questions, wording and style, when it opens, who hears about entries, and spam. Publish sits at the top.',
      headAct: { label: 'Publish changes', fn: function (s) { var p = s.fbProblems(); if (p.length) { s.open(s.sh({ eyebrow: 'Before it can be published', title: p.length + (p.length === 1 ? ' thing' : ' things') + ' to fix', icon: I.alert, iconTone: 'var(--ad-tone-warn)', rows: p.map(function (x, i) { return { k: String(i + 1), v: x }; }), primary: 'Close', onPrimary: function () {} })); return; } if (Object.keys(s.state.sv).length) { s.say('Save the unsaved changes on this section first.'); return; } s.ask({ eyebrow: 'Publish', title: 'Publish version ' + (ver + 1) + ' of this form?', body: 'Visitors see the new questions straight away. Entries keep the version they answered, so editing a live form never rewrites an answer.', ok: 'Publish version ' + (ver + 1), green: true, icon: I.send, tone: 'var(--ad-tone-good)', onOk: function () { s.setState({ saved: Object.assign({}, s.state.saved, { 'fb.ver': ver + 1 }), ra: s.state.ra + 1 }); s.say('Updated. Version ' + (ver + 1) + ' is live.'); } }); } },
      chores: function (s, it, I2) { return [it('Preview the form', I2.eye, function () { s.fbPreview(); }), it('Copy the address', I2.link, function () { s.say('Address copied: wdc.ng/f/' + s.sval('fb.addr', 'contact')); }), it('View live', I2.out, function () { s.say('The form opens at its address in a new tab.'); }), s.menuSep(), it('Back to Enquiries', I2.inbox, function () { window.location.href = 'A-Forms.dc.html'; }), it('Move form to Trash…', I2.trash, function () { s.ask({ eyebrow: 'Trash', title: 'Move this form to Trash?', body: 'It stops taking entries. Entries stay in Enquiries. You can restore it from Settings, Trash, for 30 days.', ok: 'Move to Trash', danger: true, icon: I2.trash, tone: 'var(--ad-tone-bad)', onOk: function () { window.location.href = 'A-Forms.dc.html'; } }); }, { danger: true })]; } };
  }
