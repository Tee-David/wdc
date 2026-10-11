  /* ======================= Staff · Messages model ======================= */
  msgModel() {
    var self = this, I = this.icons();
    var P = { daniel: { who: 'Daniel O.', i: 'DO', tone: '#23239b' }, ade: { who: 'Ade B.', i: 'AK', tone: '#7a2e0e' }, adaeze: { who: 'Adaeze O.', i: 'AO', tone: '#1f4d3a' }, ifeanyi: { who: 'Ifeanyi N.', i: 'IN', tone: '#000065' }, tolu: { who: 'Tolu A.', i: 'TA', tone: '#23239b' }, bab: { who: 'Babatope A.', i: 'BA', tone: '#000065' } };
    var m = function (p, text, when, o) { return Object.assign({ who: p.who, i: p.i, tone: p.tone, text: text, when: when, kind: 'text' }, o || {}); };
    var mine = function (text, when, o) { return Object.assign({ mine: true, who: 'Chiamaka A.', i: 'CA', tone: '#b84a00', text: text, when: when, kind: 'text' }, o || {}); };
    var ev = function (text, when) { return { kind: 'event', text: text, when: when }; };
    var F = { cal: { name: 'October content calendar.pdf', ext: 'PDF', size: '860 KB', when: '2 Oct', project: "Ade's Kitchen", view: 'doc', ref: 'CAL-26-10', docTitle: 'October content calendar', tone: 'var(--ad-tone-bad)' }, res: { name: 'Lumen October results.pdf', ext: 'PDF', size: '1.4 MB', when: '6 Oct', project: 'Lumen Fitness', view: 'doc', ref: 'RPT-26-10L', docTitle: 'Lumen October results', tone: 'var(--ad-tone-bad)' }, tpl: { name: 'Social templates.zip', ext: 'ZIP', size: '12 MB', when: 'Yesterday', project: 'Mira Skincare', view: 'doc', ref: 'TPL-26', docTitle: 'Social templates pack', tone: 'var(--ad-tone-live)' } };
    var ask = function (project) { return function () { self.say('The task is added to ' + project + ' and lands on your My Day.'); }; };
    var convs = [
      { id: 'lumen', p: 'daniel', pinned: true, auto: ['Thank you Chiamaka. Admin already called me, so two creatives at ₦200,000 is fine.', 'Understood, thank you.'], name: 'Daniel O.', i: 'DO', tone: '#23239b', sub: 'Lumen Fitness · Instagram ads', kind: 'client', unread: 1,
        ctx: [{ t: 'Lumen Fitness', icon: 'users', href: 'S-Clients.dc.html' }, { t: 'Instagram ads', icon: 'folder', href: 'S-Project.dc.html?p=lumen-ads' }, { t: 'Ad budget', icon: 'wallet', tag: 'Admin is agreeing', tone: 'warn', fn: function () { self.say('Admin is agreeing options with Daniel. Plan for ₦200,000 to ₦300,000.'); } }],
        menu: [{ t: 'Open the project', icon: 'folder', fn: function () { window.location.href = 'S-Project.dc.html?p=lumen-ads'; } }, { t: 'Create a task from this', icon: 'task', fn: ask('Instagram ads') }],
        quick: ['Thanks Daniel. Admin is confirming the options and we will come back today.', 'At ₦200,000 we would run two creatives instead of three.', 'Happy to talk it through on a call.'],
        msgs: [mine('October results are in: 212 leads at ₦1,415 each. The full report is in your portal.', '6 Oct, 16:20', { file: F.res }), m(P.daniel, 'Great numbers. Can we lower the ad spend to ₦200k from November? Cash is tight this month.', '18 h ago')] },
      { id: 'ade', p: 'ade', auto: ['Perfect, thank you!', 'Great, I will tell the team in the kitchen.'], name: 'Ade B.', i: 'AK', tone: '#7a2e0e', sub: 'Ade’s Kitchen · October content', kind: 'client', unread: 0,
        ctx: [{ t: 'Ade’s Kitchen', icon: 'users', href: 'S-Clients.dc.html' }, { t: 'October content', icon: 'folder', tag: '18 of 24', tone: 'good', href: 'S-Project.dc.html?p=ade-oct' }],
        menu: [{ t: 'Open the project', icon: 'folder', fn: function () { window.location.href = 'S-Project.dc.html?p=ade-oct'; } }],
        quick: ['The last six posts go to you today.', 'Thank you Ade. It goes live Tuesday at 12:30.'],
        msgs: [mine('Hi Ade, the October calendar is in your portal. Eighteen posts are already approved.', '2 Oct, 10:00', { file: F.cal }), m(P.ade, 'Looks great. The chef story is my favourite.', '2 Oct, 14:30'), ev('Chef story approved', '8 min ago'), m(P.ade, 'Approved. Can we add the new menu name to the caption?', '8 min ago')] },
      { id: 'social', ckind: 'group', members: ['chiamaka', 'tolu', 'ifeanyi', 'bab'], auto: ['Noted.', 'Thanks Chiamaka.'], name: 'Social team', i: 'ST', tone: 'var(--ad-tone-brand)', round: '12px', group: true, sub: 'Tolu, Ifeanyi, Babatope and you', kind: 'team', unread: 1,
        ctx: [{ t: 'Ade’s Kitchen · October content', icon: 'folder', tag: '18 of 24', tone: 'good', href: 'S-Project.dc.html?p=ade-oct' }],
        quick: ['On it.', 'Thanks all.'],
        msgs: [mine('Ade’s October calendar is 18 of 24 approved. The last six go for approval today.', 'Yesterday, 15:02'), m(P.tolu, 'Mira reel v2 is uploaded. Ten seconds, the wordmark is in the last frame.', 'Yesterday, 16:40'), m(P.bab, 'Looks good. Ifeanyi, is the template pack ready for Chiamaka?', 'Yesterday, 17:10'), m(P.ifeanyi, 'Handing it over this morning. @Chiamaka A. the three crops are in the project folder.', 'Today, 08:15', { react: { like: ['Chiamaka A.', 'Tolu A.'] } }), m(P.bab, 'Chiamaka, keep an eye on Lumen. Daniel may ask about the budget.', 'Today, 09:05')] },
      { id: 'ifeanyi', p: 'ifeanyi', auto: ['Happy to help.'], name: 'Ifeanyi N.', i: 'IN', tone: '#000065', sub: 'Branding', kind: 'team', unread: 0, ctx: [{ t: 'Social templates', icon: 'folder', tag: 'Handed over', tone: 'good', fn: function () { self.openFile(self.fileSpec(F.tpl)); } }],
        quick: ['Got it, thank you.', 'The story size is perfect.'],
        msgs: [m(P.ifeanyi, 'The social templates pack is in the project files. Square, portrait and story, built from the leaf monogram.', 'Yesterday, 17:30', { file: F.tpl }), mine('Got it. I will use them from the November plan.', 'Yesterday, 17:45', { st: 'seen' }), m(P.ifeanyi, 'Perfect. The story size works best for the launch reel.', 'Today, 09:20', { react: { like: ['Chiamaka A.'] } })] },
      { id: 'bab', p: 'bab', name: 'Babatope A. (Admin)', i: 'BA', tone: '#000065', sub: 'Admin', kind: 'team', unread: 0, ctx: [{ t: 'Ticket T-1038', icon: 'life', tag: 'Open', tone: 'live', href: 'S-Support.dc.html' }],
        quick: ['Thanks, I will wait for Daniel.', 'Can we agree a budget today?'],
        msgs: [mine('Admin, I cannot start the November Lumen ads without Meta Business access. Can Daniel be asked?', '8 Oct, 09:30'), m(P.bab, 'Raised as ticket T-1038. I am sending Daniel the two minute guide today.', '8 Oct, 11:10'), mine('Thank you Admin. I will wait for Daniel.', 'Today, 11:25', { st: 'failed' })] },
      { id: 'mira', p: 'adaeze', name: 'Adaeze O.', i: 'AO', tone: '#1f4d3a', sub: 'Mira Skincare · Social media', kind: 'client', unread: 0, ctx: [{ t: 'Mira Skincare', icon: 'users', href: 'S-Clients.dc.html' }, { t: 'Instagram access', icon: 'key', tag: 'Waiting 3 days', tone: 'warn', href: 'S-Project.dc.html?p=mira-so' }],
        quick: ['Here is the two minute guide again.', 'Thank you Adaeze, take your time.'],
        msgs: [mine('Hi Adaeze, to schedule the launch posts I need Instagram partner access. The two minute guide is attached.', '7 Oct, 10:00'), ev('Reminder sent', '9 Oct')] }
,
      { id: 'tolu', p: 'tolu', name: 'Tolu A.', i: 'TA', tone: '#23239b', sub: 'Social & Ads', kind: 'team', unread: 0, ctx: [{ t: 'Ade’s Kitchen · October content', icon: 'folder', tag: '18 of 24', tone: 'good', href: 'S-Project.dc.html?p=ade-oct' }],
        quick: ['Thanks Tolu.', 'Can you send the crops by Monday?'],
        msgs: [mine('Tolu, can you crop the three reel stills for the Mira launch in square and story?', '8 Oct, 10:00', { st: 'seen' }), m(P.tolu, 'Yes, I will send them Monday morning.', '8 Oct, 13:20')] },
      { id: 'chade', ckind: 'project', members: ['chiamaka', 'tolu', 'bab'], auto: ['Got it.'], name: 'Ade’s Kitchen · October content', i: 'AO', tone: '#7a2e0e', sub: 'Project channel · Tolu, Babatope and you', kind: 'team', unread: 0, round: '12px',
        brief: 'October content for Ade’s Kitchen. 24 posts, 18 approved. The last six go out for approval today. Chef story goes live Wed 14 Oct at 12:30. New menu name goes into the caption.',
        ctx: [{ t: 'October content', icon: 'folder', tag: '18 of 24', tone: 'good', href: 'S-Project.dc.html?p=ade-oct' }],
        menu: [{ t: 'Open the project', icon: 'folder', fn: function () { window.location.href = 'S-Project.dc.html?p=ade-oct'; } }],
        quick: ['Thanks both.'],
        msgs: [mine('Chef story is approved. Ade also wants the new menu name in the caption.', '8 min ago', { st: 'seen' }), m(P.tolu, 'I will update the caption and send it for a last look.', '5 min ago', { react: { done: ['Chiamaka A.'] } })] },
      { id: 'clumen', ckind: 'project', members: ['chiamaka', 'bab', 'ifeanyi'], name: 'Lumen Fitness · Instagram ads', i: 'LI', tone: '#23239b', sub: 'Project channel · Babatope, Ifeanyi and you', kind: 'team', unread: 0, round: '12px',
        brief: 'Instagram ads for Lumen Fitness. 212 leads in October. Daniel asked to lower the monthly spend, and Admin is agreeing the options. Plan for two creatives until it is settled.',
        ctx: [{ t: 'Instagram ads', icon: 'folder', tag: 'Review', tone: 'warn', href: 'S-Project.dc.html?p=lumen-ads' }],
        menu: [{ t: 'Open the project', icon: 'folder', fn: function () { window.location.href = 'S-Project.dc.html?p=lumen-ads'; } }],
        quick: ['Thanks, noted.'],
        msgs: [m(P.bab, 'Daniel wants to lower the spend. I will agree the options with him today. Please plan for two creatives.', 'Yesterday, 18:00', { react: { like: ['Chiamaka A.'] } }), mine('Understood. Two creatives, with Ad B as the lead.', 'Yesterday, 18:20', { st: 'seen' })] }
    ];
    var rec = function (id, name, sub, p, kind, group) { return { conv: id, name: name, sub: sub, i: p.i, tone: p.tone, kind: kind, group: group }; };
    return {
      role: 'staff', me: 'chiamaka', team: ['tolu', 'ifeanyi', 'bab', 'chiamaka'], settingsHref: 'S-Settings.dc.html', navBase: {}, convs: convs, files: [F.cal, F.res, F.tpl],
      kinds: [['all', 'All'], ['client', 'Clients'], ['team', 'Team'], ['project', 'Projects'], ['group', 'Groups'], ['tagged', 'Tagged'], ['starred', 'Starred']],
      saved: [{ t: 'Share an update', s: 'Hi {name}, a quick update: the work is on track and the next step is with you. Tell us if anything is unclear.' }, { t: 'Ask for assets', s: 'Hi {name}, to keep moving we need your photos and logo files. Share them here or from your portal and we will take it from there.' }, { t: 'Confirm a time', s: 'Hi {name}, that time works for us. You will get a Google Meet link in your email invite.' }, { t: 'Thank you', s: 'Thank you {name}. We appreciate it.' }],
      tourInfo: 'Presence, call buttons, members, shared photos, files and links for the open conversation. On a smaller screen it slides over the thread.', emptyBody: 'Message a client or a teammate with New message.', vis: true, clientLabel: 'Client sees it',
      newTitle: 'Who is it for?', newBody: 'Clients get your message in their portal and by email, with Admin copied on anything about money.', newList: 'Clients and team',
      recipients: [rec('lumen', 'Daniel O. (Lumen Fitness)', 'Client · Instagram ads', P.daniel, 'client'), rec('ade', 'Ade B. (Ade’s Kitchen)', 'Client · October content', P.ade, 'client'), rec('mira', 'Adaeze O. (Mira Skincare)', 'Client · Social media', P.adaeze, 'client'), rec('social', 'Social team', 'Tolu, Ifeanyi, Babatope', { i: 'ST', tone: 'var(--ad-tone-brand)' }, 'team', true), rec('ifeanyi', 'Ifeanyi N.', 'Team · Branding', P.ifeanyi, 'team'), rec('bab', 'Babatope A. (Admin)', 'Ask Admin first', P.bab, 'team')],
      tourList: 'Your clients, the team and Admin in one list. Unread ones carry a count.', tourThread: 'Reply here. Switch to Team only to leave a note the client never sees, and use the chips above the thread to open the client or the project.', tourNew: 'Message a client or a teammate. Ask Admin first about anything involving money or scope.',
      waiting: function (s, all) { var l = all.filter(function (c) { return c.id === 'lumen'; })[0]; return l && s.msgUnread(l) ? 'Daniel at Lumen Fitness has waited 18 hours.' : ''; }
    };
  }
