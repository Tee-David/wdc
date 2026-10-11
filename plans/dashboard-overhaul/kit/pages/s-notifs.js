  /* ======================= Staff · Notifications inbox ======================= */
  pageName() { return 'My Day'; }
  ntKinds() { return ['Tasks', 'Messages', 'Projects', 'Meetings']; }
  ntSettings() { return 'S-Settings.dc.html'; }
  ntRail() { return ['Tasks handed to you', 'Replies and mentions', 'Approvals on your projects', 'Meeting reminders']; }
  tourSteps() {
    var I = this.icons();
    return [
      { target: 'deck', title: 'What to read first', icon: I.target, body: 'Tasks handed to you and replies that wait on you.' },
      { target: 'table', title: 'Everything you were told', icon: I.bell, body: 'Tasks, mentions, approvals and meetings, newest first. Tap one to jump to it.' },
      { target: 'rail', title: 'What reaches you', icon: I.gear, body: 'Each kind can be switched off from Settings.' }
    ];
  }
  ntAll() {
    return this.hubApply('nt', [
      { id: 'n1', name: 'Babatope handed you “Write the October content plan”', sub: 'Ade’s Kitchen, due Wed 14 Oct.', kind: 'Tasks', read: false, when: 'Today, 08:20', go: 'S-Projects.dc.html' },
      { id: 'n2', name: 'Adaeze O. mentioned you in Brand guide v2', sub: '“Can you check the darker navy?”', kind: 'Messages', read: false, when: 'Today, 08:10', go: 'S-Messages.dc.html' },
      { id: 'n3', name: 'The client approved the logo concepts', sub: 'Mira Skincare, brand identity. Round 2 can start.', kind: 'Projects', read: true, when: 'Yesterday', go: 'S-Projects.dc.html' },
      { id: 'n4', name: 'Review meeting on Mon 12 Oct, 10:00', sub: 'Mira Skincare with you hosting.', kind: 'Meetings', read: true, when: 'Fri 9 Oct', go: 'S-Projects.dc.html' }
    ]);
  }
  ntDeck() {
    var self = this, I = this.icons(), a = this.ntAll().filter(function (n) { return n.id === 'n1'; })[0];
    return [{ id: 'nd1', kind: 'Task', urgency: 'Due Wed 14 Oct', utone: '#a16207', label: 'Tasks', dept: 'Social & Ads', title: 'Write the October content plan', body: 'Babatope handed it to you this morning. Ade’s Kitchen, three platforms.', meta: [{ k: 'Project', v: 'Social media' }, { k: 'Due', v: 'Wed 14 Oct' }, { k: 'From', v: 'Admin' }], why: 'The client approves on Thursday, so the plan has to be in by Wednesday.', primaryLabel: 'Open the project', primaryFn: function () { window.location.href = 'S-Projects.dc.html'; }, secondaryLabel: 'Mark as read', sToast: 'Updated. It is marked as read.', sheet: self.sh({ eyebrow: 'Tasks', title: a.name, icon: I.task, body: a.sub, primary: 'Open the project', secondary: 'Close', onPrimary: function () { window.location.href = 'S-Projects.dc.html'; } }) }];
  }
