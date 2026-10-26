  /* ======================= Staff base: Chiamaka A., Social & Ads =======================
     Loads after the owner's shared file, so it overrides identity, scope and search. A staff member sees the
     projects in their departments and the clients assigned to them. Never an amount, only a billing chip. */
  brand() { return { name: 'WDC Studio', sub: 'Social & Ads' }; }
  me() { return { name: 'Chiamaka A.', i: 'CA', role: 'Social & Ads', tone: '#b84a00' }; }
  role() { return 'staff'; }
  projRole() { return 'staff'; }
  searchHint() { return 'Search tasks, projects, clients'; }
  palHint() { return 'Task, project, client or page'; }
  palEmptyHint() { return 'You only see projects in your departments and clients assigned to you.'; }
  installCopy() { return ['Get WDC on your phone', 'Approvals, replies and handovers as push alerts.']; }
  teamDay() { return 'My Day'; }
  recordKinds() { return ['Page', 'Project', 'Client']; }
  snoozeOptions() { return [['In 1 hour', '12:30'], ['After lunch', '14:30'], ['Tomorrow', '09:00'], ['Monday', '09:00']]; }
  hideMoney() { return true; }
  projScope(p) { return p.svc === 'Social & Ads'; }
  projPageKeys() { return ['ade-oct', 'lumen-ads', 'mira-so']; }
  projPageHref(id) { return 'S-Project.dc.html?p=' + id; }
  staffClientIds() { return ['ade', 'lumen', 'mira']; }
  teamData() { return [{ name: 'Tolu A.', i: 'TA', dept: 'Social & Ads', load: '2 open', tone: '#23239b' }, { name: 'Ifeanyi N.', i: 'IN', dept: 'Branding', load: '5 open', tone: '#000065' }, { name: 'Bisi O.', i: 'BO', dept: 'SEO', load: '4 open', tone: '#15803d' }, { name: 'Daniel E.', i: 'DE', dept: 'Web & Apps', load: '7 open', tone: '#5c5c7a' }]; }
  navCounts() { return { Messages: { n: 2 } }; }
  notesData() {
    var self = this, S = this.sh.bind(this), I = this.icons();
    var go = function (title, body, href, label) { return S({ eyebrow: 'Notice', title: title, icon: I.bell, body: body, primary: label, onPrimary: function () { window.location.href = href; }, secondary: 'Close' }); };
    return [
      { id: 'n1', i: 'AK', tone: 'var(--ad-tone-good)', t: 'Ade’s Kitchen approved the chef story post', when: '8 min ago', sheet: go('Chef story approved', 'Ade approved it. It goes live on Instagram Wed 14 Oct at 12:30.', 'S-Project.dc.html?p=ade-oct', 'Open October content') },
      { id: 'n2', i: 'LF', tone: 'var(--ad-tone-brand)', t: 'Lumen Fitness asked about the ad budget', when: '18 h ago', sheet: go('Lumen asked about the budget', 'Daniel asked to lower the monthly ad spend. Admin is agreeing the options, so plan for ₦200,000 to ₦300,000.', 'S-Messages.dc.html', 'Open the conversation') },
      { id: 'n3', i: 'IN', tone: 'var(--ad-tone-brand)', t: 'Ifeanyi handed you the social templates pack', when: 'Yesterday', sheet: go('Templates pack handed over', 'Ifeanyi shared square, portrait and story templates built from the logo Adaeze picks.', 'S-Project.dc.html?p=mira-so', 'Open Social media management') },
      { id: 'n4', i: 'BA', tone: 'var(--ad-tone-neutral)', t: 'Babatope commented on the Lumen ad creatives', when: 'Thursday', sheet: go('Babatope on the creatives', '“Ad B is strongest. Shorten the headline on A.”', 'S-Project.dc.html?p=lumen-ads', 'Open Instagram ads') },
      { id: 'n5', i: 'T', tone: 'var(--ad-tone-live)', t: 'Your ticket T-1038 is open', when: '3 days ago', sheet: go('Meta access request', 'You asked Admin to arrange Meta Business access for Lumen. Admin is sending Daniel the guide.', 'S-Support.dc.html', 'Open Support') }
    ];
  }
  records() {
    var self = this, pages = [['My Day', 'Your tasks, the deck and your week', 'D-Staff.dc.html'], ['Projects', 'Work in your departments', 'S-Projects.dc.html'], ['Clients', 'Clients assigned to you', 'S-Clients.dc.html'], ['Messages', 'Team threads and client conversations', 'S-Messages.dc.html'], ['Support', 'Knowledge base and your tickets', 'S-Support.dc.html'], ['Settings', 'Profile, notifications and appearance', 'S-Settings.dc.html']].map(function (x) { return { kind: 'Page', label: x[0], sub: x[1], ini: x[0].charAt(0), tone: 'var(--ad-tone-neutral)', href: x[2] }; });
    var pd = this.projectsData().filter(function (p) { return self.projPageKeys().indexOf(p.id) >= 0; }).map(function (p) { return { kind: 'Project', label: p.name, sub: p.client + ' · ' + p.stage, ini: p.name.charAt(0), tone: 'var(--ad-tone-brand)', href: self.projPageHref(p.id) }; });
    var cl = this.clientsData().filter(function (c) { return self.staffClientIds().indexOf(c.id) >= 0; }).map(function (c) { return { kind: 'Client', label: c.name, sub: 'Assigned to you · ' + c.services.join(', '), ini: c.ini, tone: c.tone, href: 'S-Clients.dc.html' }; });
    return pages.concat(pd, cl);
  }
  walk() { return { nav: 'My Day is your tasks. Projects shows work in your departments, Clients shows the clients assigned to you, Messages has every conversation you are in, and Support has the knowledge base.', bell: 'Client approvals, replies and handovers land here. Install the app to get them as push alerts.' }; }
