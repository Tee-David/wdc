/* Proposed dashboard interactions. All people, work and message states are sample data. */
(function () {
  'use strict';
  const state = { accepted: false, taskDone: false, assigned: false, noteAudience: 'internal', notes: [], query: '', flowStatus: 'all' };
  const notices = [
    { id: 'handover', title: 'Accept the website handover', category: 'Team', person: 'Maya · Branding', body: 'Brand direction is approved. Website needs the selected logo, colour guide and one open question about product photography.', due: 'Due 13 October', action: 'Open handover', view: 'team' },
    { id: 'review', title: 'Client feedback needs your answer', category: 'Review', person: 'Alex · Paper & Pine', body: 'The client asked for a shorter caption on the autumn launch post, version 2. Reply beside the post so the decision stays with the work.', due: 'Due 13 October', action: 'Open project', view: 'project', service: 'social', tab: 'review' },
    { id: 'access', title: 'Store access is still needed', category: 'Request', person: 'Sam · Website lead', body: 'The staging checkout test is waiting for a client-managed payment test account. The client contact owns this request.', due: 'Due 14 October', action: 'Open requests', view: 'project', service: 'web', tab: 'work' },
    { id: 'progress', title: 'Your weekly project summary', category: 'Summary', person: 'Project activity', body: 'Brand direction approved. One post awaits a decision. Website build can start after handover is accepted.', due: 'Sample summary', action: 'Open projects', view: 'overview' }
  ];
  const clientNotices = [
    { id: 'client-review', title: 'Your launch post is ready to review', category: 'Review', person: 'Maya · Your social team', body: 'Review the caption and visual for the launch post, version 2. Approve it or leave a revision note beside it.', due: 'Due 13 October', action: 'Review posts', view: 'project', service: 'social', tab: 'review' },
    { id: 'client-access', title: 'Please provide the product photographs', category: 'Request', person: 'Sam · Your website lead', body: 'Upload the approved product photographs to your project request. We need them for the website pages. For account access, use the agreed secure invitation method rather than posting passwords in a comment.', due: 'Due 14 October', action: 'Open your requests', view: 'project', service: 'web', tab: 'work' },
    { id: 'client-progress', title: 'Your weekly project summary', category: 'Summary', person: 'Your project team', body: 'Your brand direction is approved. Your website layout is the next milestone. One launch post is awaiting your decision.', due: 'Sample summary', action: 'Open your projects', view: 'overview' }
  ];
  const ui = () => window.WDC_UI;
  const isClient = () => ui().role && ui().role() === 'client';
  const makePerson = selected => ({ filter: 'action', selected, preferences: false, progressDigest: true, reminders: true, draftProgress: true, draftReminders: true, preferencesSaved: false, read: [] });
  const people = { studio: makePerson('handover'), client: makePerson('client-review') };
  const person = () => people[isClient() ? 'client' : 'studio'];
  const e = value => ui().escape(String(value));
  const b = (label, action, extra = '') => ui().button(label, action, extra);
  const p = (label, tone = 'neutral') => ui().pill(label, tone);
  const panel = (title, body) => ui().panel(title, body);
  const head = (title, text) => `<div class="view-head"><div><p class="eyebrow">Paper &amp; Pine · Sample workspace</p><h1>${title}</h1><p class="cx-meta">${text}</p></div></div>`;
  function inbox() {
    const visible = isClient() ? clientNotices.concat(state.notes.filter(n => n.audience === 'client').map((n,i) => ({id: `published-${i}`, title:'A new project update', category:'Update', person:'Sam · Your project team', body:n.text, due:'Sample update', action:'Open your project', view:'overview'}))) : notices;
    const items = visible.filter(n => person().filter === 'all' || person().filter === 'summary' ? (person().filter === 'all' || n.category === 'Summary') : n.category !== 'Summary' && !person().read.includes(n.id));
    const selected = visible.find(n => n.id === person().selected) || visible[0];
    person().selected = selected.id;
    return head('Your inbox', 'Decisions, replies and assignments come to the person responsible. Routine progress can be a summary.') +
      `<div class="cx-toolbar">${['action', 'all', 'summary'].map(x => `<button class="ad-btn ${person().filter === x ? 'is-active' : ''}" data-action="comm-filter" data-value="${x}" aria-pressed="${person().filter === x}">${x === 'action' ? 'Needs me' : x === 'all' ? 'All activity' : 'Summaries'}</button>`).join('')}${b('Email preferences', 'comm-preferences')}</div>` +
      (person().preferences ? panel('Your email preferences', `<p>In-app history remains available. These choices affect this sample person, not the whole studio.</p><div class="cx-stack"><label class="cx-row"><input type="checkbox" data-action="comm-pref-progress" ${person().draftProgress ? 'checked' : ''}> Weekly routine progress summary</label><label class="cx-row"><input type="checkbox" data-action="comm-pref-reminders" ${person().draftReminders ? 'checked' : ''}> Email reminders for my approaching deadlines</label><p class="cx-meta">Review requests, important replies and assignments appear in your inbox. Account security notices remain separate from optional updates.</p></div>${person().preferencesSaved ? '<p role="status">Preferences saved for this sample person.</p>' : ''}${person().draftProgress !== person().progressDigest || person().draftReminders !== person().reminders ? `<div class="save-bar"><span>Unsaved preference changes</span><div class="cx-toolbar">${b('Discard changes','comm-pref-discard')}${b('Save preferences','comm-pref-save')}</div></div>` : ''}`) : '') +
      `<div class="cx-grid">${panel('Messages', items.length ? `<div class="cx-stack">${items.map(n => `<button class="cx-notice ${person().selected === n.id ? 'is-active' : ''}" data-action="comm-select" data-value="${n.id}" aria-pressed="${person().selected === n.id}"><span class="cx-row">${p(n.category, n.category === 'Summary' ? 'neutral' : 'warn')}<span class="cx-meta">${n.due}</span></span><strong>${n.title}</strong><span class="cx-meta">${n.person}</span></button>`).join('')}</div>` : '<div class="empty-state"><h3>You are caught up</h3><p>There are no remaining sample actions in this filter. All activity keeps the history.</p></div>')}${panel(selected.title, `<p class="cx-meta">${selected.person} · ${selected.due}</p><p>${selected.body}</p><div class="cx-callout"><strong>Visibility: ${isClient() || selected.id === 'review' ? 'Client and assigned project team' : 'Internal team only'}</strong><p>Proposed access: project members with the appropriate role receive the detail. This preview does not enforce production permissions. An email points here; it is not the only record.</p></div><div class="cx-toolbar">${b(selected.action, 'navigate', `data-view="${selected.view}" ${selected.service ? `data-service="${selected.service}" data-tab="${selected.tab}"` : ''}`)}${b(person().read.includes(selected.id) ? 'Marked read' : 'Mark read', 'comm-read', person().read.includes(selected.id) ? 'disabled' : '')}</div><p class="cx-meta">Sample notification · No message is sent by this prototype.</p>`)}</div>`;
  }
  function team() {
    return head('Team & handovers', 'Pass the context with the work. Keep internal notes separate from anything shared with the client.') +
      `<div class="cx-grid">${panel('Branding → Website', `<div class="cx-row">${p(state.accepted ? 'Accepted' : 'Acceptance needed', state.accepted ? 'good' : 'warn')}<span class="cx-meta">Maya → Sam · Due 13 October</span></div><h3>Build from the approved brand direction</h3><p>The selected logo and colour guide are ready. Product photography is still needed from the client.</p><ul><li>Approved direction: Warm editorial · version 3</li><li>Files: logo exports, colour guide, type guidance</li><li>Decision kept: use the wordmark on the homepage</li><li>Open risk: product photos due 14 October</li><li>Next action: build the homepage layout</li></ul><p class="cx-meta">Internal handover. Client sees only the published project update.</p>${b(state.accepted ? 'Handover accepted' : 'Accept handover', 'comm-accept', state.accepted ? 'disabled' : '')}${state.accepted ? '<p role="status">Sam accepted the sample handover. Maya and the project lead are notified in the proposed flow. Homepage build is now unblocked.</p>' : ''}`)}${panel('Who owns the next step?', `<div class="cx-stack"><div><h3>Homepage layout</h3>${p(state.taskDone ? 'Completed' : state.accepted ? 'Ready to start' : 'Blocked by handover', state.taskDone ? 'good' : state.accepted ? 'live' : 'warn')}<p>Sam · Website · Due 16 October</p>${b(state.taskDone ? 'Task completed' : 'Complete sample task', 'comm-complete', !state.accepted || state.taskDone ? 'disabled' : '')}${!state.accepted ? '<p class="cx-meta">Accept the handover before starting.</p>' : ''}</div><div><h3>Check product images</h3>${p(state.assigned ? 'Assigned to Jo' : 'Needs an owner', state.assigned ? 'good' : 'warn')}<p>Website · Due 14 October</p>${b(state.assigned ? 'Assigned to Jo' : 'Assign to Jo', 'comm-assign', state.assigned ? 'disabled' : '')}</div></div>`)}
      </div>${panel('Discussion attached to this handover', `<p><strong>Maya · Internal note</strong><br>The export folder contains only approved files. Please keep the unused concept sketches private.</p>${state.notes.map(n => `<div class="cx-callout">${p(n.audience === 'internal' ? 'Internal only' : 'Shared with client', n.audience === 'internal' ? 'neutral' : 'brand')}<p>${e(n.text)}</p><span class="cx-meta">Sam · Sample comment · Saved in this preview</span></div>`).join('')}<div class="cx-toolbar"><button class="ad-btn ${state.noteAudience === 'internal' ? 'is-active' : ''}" data-action="comm-audience" data-value="internal" aria-pressed="${state.noteAudience === 'internal'}">Internal note</button><button class="ad-btn ${state.noteAudience === 'client' ? 'is-active' : ''}" data-action="comm-audience" data-value="client" aria-pressed="${state.noteAudience === 'client'}">Client update</button></div><label class="field-label" for="comm-note">${state.noteAudience === 'internal' ? 'Note for the project team' : 'Update the client will see'}</label><textarea id="comm-note" rows="3" placeholder="Write the decision, question or next step…"></textarea><p class="cx-meta">${state.noteAudience === 'internal' ? 'Visible only to the assigned team. Never included in client email.' : 'A deliberate sharing action. The client can see this update in their project.'}</p>${b(state.noteAudience === 'internal' ? 'Save internal note' : 'Publish sample update', 'comm-note')}`)}${panel('What gets communicated', `<div class="cx-table-wrap"><table class="cx-table"><thead><tr><th>Event</th><th>Recipient</th><th>Next action</th></tr></thead><tbody><tr><td>Handover requested</td><td>Receiving lead</td><td>Read context and accept</td></tr><tr><td>Handover accepted</td><td>Outgoing lead, project lead</td><td>Start dependent work</td></tr><tr><td>Task assigned / reassigned</td><td>Named staff account</td><td>Confirm ownership and due date</td></tr><tr><td>Task completed</td><td>Lead and dependent owner</td><td>Start next task</td></tr><tr><td>Internal review failed</td><td>Creator and reviewer</td><td>Correct work before client sharing</td></tr></tbody></table></div>`)}`;
  }
  function flows() {
    const rows = window.WDC_COMMUNICATION_ROWS.filter(r => (state.flowStatus === 'all' || r.status === state.flowStatus) && `${r.group} ${r.event} ${r.recipient} ${r.detail}`.toLowerCase().includes(state.query.toLowerCase()));
    return head('Communication coverage', 'Every important flow from the audit, with its current position and proposed owner. This is a planning inventory, not a claim that new emails are live.') + `<div class="cx-toolbar"><label for="comm-search">Search flows</label><input id="comm-search" type="search" data-action="comm-search" value="${e(state.query)}" placeholder="Try approval, billing or social…">${['all', 'Exists', 'Partial', 'Proposed'].map(x => `<button class="ad-btn ${state.flowStatus === x ? 'is-active' : ''}" data-action="comm-status" data-value="${x}" aria-pressed="${state.flowStatus === x}">${x === 'all' ? 'All' : x}</button>`).join('')}</div><p class="cx-meta">${rows.length} matching flows · Exists = source path found, not delivery verified · Partial = current path needs more work · Proposed = missing workflow</p>${panel('Event, recipient and missing work', `<div class="cx-table-wrap"><table class="cx-table"><thead><tr><th>Flow</th><th>Position</th><th>Who needs it</th><th>What it needs</th></tr></thead><tbody>${rows.map(r => `<tr><td><strong>${e(r.event)}</strong><span class="cx-meta">${e(r.group)}</span></td><td>${p(r.status, r.status === 'Exists' ? 'good' : r.status === 'Partial' ? 'warn' : 'neutral')}</td><td>${e(r.recipient)}</td><td>${e(r.detail)}<div class="cx-toolbar">${b('Inspect flow', 'comm-inspect', `data-index="${window.WDC_COMMUNICATION_ROWS.indexOf(r)}"`)}</div></td></tr>`).join('') || '<tr><td colspan="4">No flows match. Clear your search or choose All.</td></tr>'}</tbody></table></div>`)}${panel('Before adding more emails', '<ol><li>Use scoped project roles for recipients.</li><li>Separate internal drafts from deliberately shared work.</li><li>Save the event and pending message before background sending.</li><li>Keep decisions, versions, deadlines and comments in the portal.</li><li>Respect personal preferences and cancel stale reminders.</li><li>Use a real event identity for deduplication and safe resend.</li><li>Say provider accepted, failed or pending accurately; do not invent read status.</li><li>Send immediate decisions and exceptions; group routine progress.</li></ol>')}`;
  }
  window.WDC_COMMUNICATIONS = {
    summary() { return { handovers: state.accepted ? 0 : 1 }; },
    render(view) { return view === 'inbox' ? inbox() : view === 'team' ? (isClient() ? head('Team workspace', 'Internal team work is not part of the proposed client navigation.') : team()) : view === 'flows' ? flows() : ''; },
    handle(action, element) {
      if (!action.startsWith('comm-')) return null;
      if (action === 'comm-filter') person().filter = element.dataset.value;
      else if (action === 'comm-select') person().selected = element.dataset.value;
      else if (action === 'comm-read') { if (!person().read.includes(person().selected)) person().read.push(person().selected); }
      else if (action === 'comm-preferences') person().preferences = !person().preferences;
      else if (action === 'comm-pref-progress') { person().draftProgress = element.checked; person().preferencesSaved = false; }
      else if (action === 'comm-pref-reminders') { person().draftReminders = element.checked; person().preferencesSaved = false; }
      else if (action === 'comm-pref-save') { person().progressDigest = person().draftProgress; person().reminders = person().draftReminders; person().preferencesSaved = true; }
      else if (action === 'comm-pref-discard') { person().draftProgress = person().progressDigest; person().draftReminders = person().reminders; person().preferencesSaved = false; }
      else if (action === 'comm-inspect') { const r = window.WDC_COMMUNICATION_ROWS[Number(element.dataset.index)]; if (!r) return null; ui().open(r.event, `${p(r.status, r.status === 'Exists' ? 'good' : r.status === 'Partial' ? 'warn' : 'neutral')}<p><strong>Trigger:</strong> ${e(r.event)}</p><p><strong>Recipient:</strong> ${e(r.recipient)}</p><p><strong>Reason to notify:</strong> let the responsible person see the change and take the next step in its project record.</p><p><strong>Current position:</strong> ${e(r.detail)}</p><p>Before implementation: define visibility, personal preference category, actual deadline, reminder cancellation and a durable retry record. Existing routes need source and live checks before changing their ownership.</p><p class="cx-meta">Planning detail only. No sample email is sent.</p>`); return false; }
      else if (action === 'comm-accept') state.accepted = true;
      else if (action === 'comm-complete' && state.accepted) state.taskDone = true;
      else if (action === 'comm-assign') state.assigned = true;
      else if (action === 'comm-audience') state.noteAudience = element.dataset.value;
      else if (action === 'comm-note') { const text = document.getElementById('comm-note').value.trim(); if (text) state.notes.push({ text, audience: state.noteAudience }); }
      else if (action === 'comm-search') state.query = element.value;
      else if (action === 'comm-status') state.flowStatus = element.dataset.value;
      else return null;
      return true;
    }
  };
})();

window.WDC_COMMUNICATION_ROWS = [
  {
    "group": "Existing communication",
    "event": "Enquiry or brief submitted",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Form-specific receipts, studio notices and onboarding next steps; form settings control recipients and whether a notice is enabled."
  },
  {
    "group": "Existing communication",
    "event": "Brief left unfinished",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "A limited daily reminder process exists, with recipient opt-out. It is not an hourly follow-up service."
  },
  {
    "group": "Existing communication",
    "event": "Portal or staff invitation",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Invitation with expiry and account link; a separate send-again flow exists for invitations."
  },
  {
    "group": "Existing communication",
    "event": "Invitation accepted",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Client welcome and studio notice; staff acceptance and completed staff welcome notices."
  },
  {
    "group": "Existing communication",
    "event": "Account security change",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Sign-in/reset messages, new-device and password-change notices, and queued user-management security notices."
  },
  {
    "group": "Existing communication",
    "event": "Project stage changes",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Client email from both the stage form and drag-and-drop board. This is already implemented, subject to the client's updates preference."
  },
  {
    "group": "Existing communication",
    "event": "Work explicitly sent for approval",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Client review email when a deliverable becomes “Awaiting client”. Uploading a file alone does not send this email."
  },
  {
    "group": "Existing communication",
    "event": "Client approves work",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Client sign-off confirmation and studio approval notice. The browser submits the version seen so a newer version cannot be approved accidentally."
  },
  {
    "group": "Existing communication",
    "event": "Client requests revisions",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "The note is saved and the studio inbox is notified."
  },
  {
    "group": "Existing communication",
    "event": "Client opens a support question",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Acknowledgement to the client and notice to the studio inbox."
  },
  {
    "group": "Existing communication",
    "event": "Client replies / studio replies",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Studio notice for the client's reply; client email for the studio's reply."
  },
  {
    "group": "Existing communication",
    "event": "Estimates and billing",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Estimate sent/answered messages, invoices, receipts, invoice reminders, void/refund/reversal notices and payment/estimate studio notices. Some are explicit choices or manual sends; they are not all automatic."
  },
  {
    "group": "Existing communication",
    "event": "Meeting booked, moved or cancelled",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Cal.com owns the client's calendar notices; WDC sends studio notices. Optional timed reminders remain off."
  },
  {
    "group": "Existing communication",
    "event": "Marketing and general follow-up",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Campaigns and an automation builder exist. Its triggers are new contacts and added tags, not native project, task, department or deliverable events."
  },
  {
    "group": "Existing communication",
    "event": "Mail trouble",
    "status": "Exists",
    "recipient": "Client or studio, according to the existing path",
    "detail": "Message log, failure alerts, saved-provider health checks and optional weekly mail digest. Postmark/Brevo bounce and complaint handlers exist; the current SMTP setup is not proof of delivered/read status."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Brief picked up and linked to a project",
    "status": "Partial",
    "recipient": "Client and project lead",
    "detail": "Optional client notice exists when the studio ticks “Tell the client”; no corresponding assigned-team notice was found."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Brief needs clarification",
    "status": "Proposed",
    "recipient": "Client's decision-maker",
    "detail": "No structured request, deadline, answer record or reminder tied to an individual question. Support can handle it manually."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Required content, access or documents missing",
    "status": "Proposed",
    "recipient": "Client responsible for supplying them; project lead",
    "detail": "No client action checklist or request-specific email/reminder."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Project opened / work authorised to start",
    "status": "Proposed",
    "recipient": "Client and assigned lead",
    "detail": "Project creation saves the record but does not send a dedicated kickoff or team-assignment notice."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Scope, plan and expected review dates ready",
    "status": "Proposed",
    "recipient": "Client decision-maker and lead",
    "detail": "No structured plan acceptance flow. Scope is text and the project has one due date."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Department assigned to the client",
    "status": "Partial",
    "recipient": "New department's responsible staff",
    "detail": "Assignment exists; no assignment notification."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Client moved between departments",
    "status": "Proposed",
    "recipient": "Old lead, new lead and owner",
    "detail": "No handover request, acceptance, context summary or unaccepted-handover escalation."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Project lead added or replaced",
    "status": "Proposed",
    "recipient": "New lead, previous lead; client if their contact changes",
    "detail": "Owner accounts can be saved on the project; no targeted notice or client introduction."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Client's approver or billing contact changes",
    "status": "Proposed",
    "recipient": "Relevant studio team and new contact",
    "detail": "Extra contacts are stored, but not formal per-project reviewer/billing roles with portal permissions and notification routing."
  },
  {
    "group": "Getting a client and project ready",
    "event": "Invitation unaccepted or about to expire",
    "status": "Partial",
    "recipient": "Invited person and responsible studio person",
    "detail": "Expiry and resend exist; no dedicated scheduled acceptance reminder/escalation was found."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Stage changes",
    "status": "Partial",
    "recipient": "Client; relevant project team",
    "detail": "Client email exists. Targeted staff/team notification is missing."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Client-visible update published",
    "status": "Proposed",
    "recipient": "Client followers",
    "detail": "Update appears in the portal but `postUpdate` does not send an email."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Routine progress summary",
    "status": "Proposed",
    "recipient": "Client and lead",
    "detail": "No project digest summarising progress, next steps and outstanding decisions. The mail digest is about delivery statistics, not project work."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Due date changes",
    "status": "Proposed",
    "recipient": "Client and people whose work depends on it",
    "detail": "Saves and refreshes screens; no date-change notice, reason or acknowledgement flow."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Project becomes at risk, blocked or waiting on client",
    "status": "Proposed",
    "recipient": "Lead; person who can unblock it; client when appropriate",
    "detail": "Health is stored; no targeted notice or escalation. Internal reasons must remain private."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Client action due soon / overdue",
    "status": "Proposed",
    "recipient": "Person who owes the action; lead on escalation",
    "detail": "No general action/reminder record. Invoice reminders do not cover project inputs or approvals."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Scope change requested",
    "status": "Proposed",
    "recipient": "Project lead and client decision-maker",
    "detail": "No linked change-request workflow with cost/date impact and acceptance."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Scope change approved, declined or withdrawn",
    "status": "Proposed",
    "recipient": "Client, lead, affected teams and finance when needed",
    "detail": "No dedicated record or messages. An estimate alone does not connect the decision to a changed scope and plan."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Project paused, resumed or cancelled",
    "status": "Proposed",
    "recipient": "Client and affected teams",
    "detail": "No explicit lifecycle separate from the six normal stages and archive flag."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Milestone reached / acceptance required",
    "status": "Proposed",
    "recipient": "Client reviewer and lead",
    "detail": "No milestone acceptance records or notices. A whole-project stage is not a milestone."
  },
  {
    "group": "Progress, dates and decisions",
    "event": "Repeated lack of response",
    "status": "Proposed",
    "recipient": "Client first, then responsible lead",
    "detail": "No agreed escalation cadence; avoid automatic threats or automatic approval."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Internal draft added",
    "status": "Proposed",
    "recipient": "Assigned reviewer/team",
    "detail": "File/link version is saved; no internal-review assignment or notice. Client email should wait until sharing is deliberate."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "New work shared without asking for approval",
    "status": "Proposed",
    "recipient": "Client",
    "detail": "No separate published-deliverable notice. Current mail is tied to “Awaiting client”."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "New version ready for review",
    "status": "Partial",
    "recipient": "Client approver",
    "detail": "Review mail can be sent after changing the approval state; no complete revised-work workflow or change summary beyond the version note."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Review due soon or overdue",
    "status": "Proposed",
    "recipient": "Client approver; lead if overdue",
    "detail": "No review reminder job. The email computes a seven-day date, but this is not a stored review deadline."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Client submits review notes",
    "status": "Partial",
    "recipient": "Assigned reviewer and lead; acknowledgement to client",
    "detail": "Studio inbox notice exists. No targeted assignment or email acknowledgement back to the client that their revision note was received."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Team answers a review note",
    "status": "Proposed",
    "recipient": "Client or internal reviewer who wrote it",
    "detail": "No deliverable-specific comment thread with reply notifications. A support ticket is the workaround."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Specific correction completed",
    "status": "Proposed",
    "recipient": "Person who requested it",
    "detail": "No individual feedback item with “addressed”, “needs clarification” or “reopened” state."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Reviewer mentioned / review handed to another person",
    "status": "Proposed",
    "recipient": "Named person",
    "detail": "No mention or delegated-review flow."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Approval recorded",
    "status": "Partial",
    "recipient": "Client and studio",
    "detail": "Both emails exist. Department/staff routing and a structured per-version approval record need strengthening."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Approval recorded by staff on the client's behalf",
    "status": "Partial",
    "recipient": "Client and lead",
    "detail": "Admin approval changes are not wired to the same confirmation/notice paths as a client's portal approval. Record the actual evidence and actor."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Approved work changed",
    "status": "Proposed",
    "recipient": "Approver and downstream team",
    "detail": "A new version resets approval, which is useful; there is no tailored notice explaining that a fresh decision is required."
  },
  {
    "group": "Deliverables, review notes and sign-off",
    "event": "Final files/handover package ready",
    "status": "Partial",
    "recipient": "Client's relevant contacts",
    "detail": "Can be represented as generic files and a review request; no dedicated final-handover flow/checklist."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Task assigned or reassigned",
    "status": "Proposed",
    "recipient": "Actual staff account",
    "detail": "Tasks store a free-text assignee; no account-linked task email."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Task due soon or overdue",
    "status": "Proposed",
    "recipient": "Assignee; lead when escalation is needed",
    "detail": "No task reminder/escalation job."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Priority or required date changes",
    "status": "Proposed",
    "recipient": "Assignee and affected lead",
    "detail": "No targeted notification flow."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Task completed or reopened",
    "status": "Partial",
    "recipient": "Lead and dependent task owner",
    "detail": "Completion exists; no dependent-owner notification."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Dependency becomes unblocked",
    "status": "Partial",
    "recipient": "Person who can now start",
    "detail": "One task dependency exists; no “you can start now” notice."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Internal note or review request needs action",
    "status": "Proposed",
    "recipient": "Named colleague",
    "detail": "Internal notes/updates exist, but there are no recipient, reply, mention or acknowledgement records."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Department hands work to another department",
    "status": "Proposed",
    "recipient": "Receiving lead, outgoing lead and owner",
    "detail": "No handover object with files, decisions, open risks, next action and acceptance."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Internal quality review passed or failed",
    "status": "Proposed",
    "recipient": "Creator and reviewer",
    "detail": "No internal approval step before client sharing."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Staff unavailable or access removed while work is assigned",
    "status": "Partial",
    "recipient": "Owner and replacement lead",
    "detail": "User management exists; no operational reassignment/handover communication around outstanding work."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Client approval or revision affects a team",
    "status": "Proposed",
    "recipient": "Project lead and responsible team",
    "detail": "Current notices go to the studio inbox, not automatically to the staff responsible."
  },
  {
    "group": "Internal work and communication between departments",
    "event": "Daily “what needs me” summary",
    "status": "Proposed",
    "recipient": "Each staff member",
    "detail": "No personal work digest or notification inbox covering these events."
  },
  {
    "group": "Support and meetings",
    "event": "Support opened or replied to",
    "status": "Partial",
    "recipient": "Client and studio",
    "detail": "Existing emails; no assigned-agent/department routing."
  },
  {
    "group": "Support and meetings",
    "event": "Support assigned, escalated or unanswered too long",
    "status": "Proposed",
    "recipient": "Responsible staff and lead",
    "detail": "Tickets have no formal assignee, service deadline or escalation flow."
  },
  {
    "group": "Support and meetings",
    "event": "Support closed or reopened",
    "status": "Partial",
    "recipient": "Other participant when useful",
    "detail": "State changes refresh the portal; no dedicated state-change notice. Client replies already notify the studio, so avoid a second duplicate reopen email."
  },
  {
    "group": "Support and meetings",
    "event": "Email reply should join its portal conversation",
    "status": "Proposed",
    "recipient": "Relevant participants",
    "detail": "No inbound email-to-ticket ingestion or thread matching found. A Reply-To mailbox is not a portal conversation integration."
  },
  {
    "group": "Support and meetings",
    "event": "Meeting confirmation, change or cancellation",
    "status": "Partial",
    "recipient": "Attendee and studio",
    "detail": "Existing Cal.com/WDC ownership; do not duplicate those messages."
  },
  {
    "group": "Support and meetings",
    "event": "Meeting reminder",
    "status": "Proposed",
    "recipient": "Attendee and host who opt in",
    "detail": "Optional timed reminders deliberately remain off."
  },
  {
    "group": "Support and meetings",
    "event": "Agenda / material needed before meeting",
    "status": "Proposed",
    "recipient": "Attendee and lead",
    "detail": "No project-linked agenda or preparation request."
  },
  {
    "group": "Support and meetings",
    "event": "Review meeting outcome and next actions",
    "status": "Proposed",
    "recipient": "Client and assigned team",
    "detail": "No minutes/action acceptance workflow tied to the project."
  },
  {
    "group": "Support and meetings",
    "event": "Missed meeting / next appointment needed",
    "status": "Proposed",
    "recipient": "Attendee and lead",
    "detail": "No attendance/no-show workflow."
  },
  {
    "group": "Support and meetings",
    "event": "Handover recording and document ready",
    "status": "Proposed",
    "recipient": "Client",
    "detail": "No purpose-specific handover package and acknowledgement."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Estimate, invoice, receipt and invoice reminders",
    "status": "Partial",
    "recipient": "Client and relevant studio inbox",
    "detail": "Existing, but client role routing and separate billing preferences are missing."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Revised invoice or estimate materially changes the agreement",
    "status": "Partial",
    "recipient": "Billing contact and decision-maker",
    "detail": "Editing exists; do not assume a revised document is automatically emailed or explicitly reaccepted."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Payment needed to start/unblock a milestone",
    "status": "Partial",
    "recipient": "Client payer, project lead",
    "detail": "Existing invoices/reminders do not form a milestone/start-condition communication workflow."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Payment failed, unidentified or needs reconciliation",
    "status": "Proposed",
    "recipient": "Owner/finance; payer where appropriate",
    "detail": "Payment events and reconciliation exist; dedicated actionable exception routing needs review rather than treating every failure as a generic client email."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Retainer period starts / purchased allowance nearly used",
    "status": "Proposed",
    "recipient": "Client and lead",
    "detail": "No recurring service-period and allowance records."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Additional work exceeds agreed allowance",
    "status": "Proposed",
    "recipient": "Client decision-maker",
    "detail": "No connected overage request with approval; never silently bill or publish beyond scope."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Monthly report ready / next month's plan needs approval",
    "status": "Partial",
    "recipient": "Client stakeholders",
    "detail": "Files can be uploaded; no reporting-period or next-cycle workflow."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Final delivery and handover complete",
    "status": "Proposed",
    "recipient": "Client and studio team",
    "detail": "“Delivered” triggers the generic stage email, not a checked handover package."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Launch permission, launch completed or launch delayed",
    "status": "Proposed",
    "recipient": "Client approver and teams",
    "detail": "No dedicated launch/release workflow."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Support/warranty period ending",
    "status": "Proposed",
    "recipient": "Client and responsible team",
    "detail": "No agreed support-period record and reminder."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Domain, hosting, maintenance or service renewal due",
    "status": "Proposed",
    "recipient": "Account owner and payer",
    "detail": "No dedicated ownership/renewal records and notices. Dates and ownership must be real, not guessed."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Service ends / access and assets handed back",
    "status": "Proposed",
    "recipient": "Client, lead and relevant staff",
    "detail": "No offboarding checklist and completion notice."
  },
  {
    "group": "Money, recurring work and life after delivery",
    "event": "Feedback/testimonial requested",
    "status": "Proposed",
    "recipient": "Client who chooses to participate",
    "detail": "Marketing can do a manual campaign; no built-in completion-linked, optional request. This is lower priority than delivery."
  },
  {
    "group": "Social media",
    "event": "Calendar ready",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Social media",
    "event": "Post needs approval",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Social media",
    "event": "Feedback answered",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Social media",
    "event": "Approved post changed",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Social media",
    "event": "Publishing schedule changed",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Social media",
    "event": "Publishing failed",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Social media",
    "event": "Social account access lost",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Social media",
    "event": "Monthly report ready",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Social media",
    "event": "Next-period plan needed",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Social media",
    "event": "Community message needs client decision",
    "status": "Proposed",
    "recipient": "Client approver and assigned social team",
    "detail": "Versioned posts, calendar dates, individual approvals and publishing proof. Successful posts can be grouped into a summary."
  },
  {
    "group": "Paid advertising",
    "event": "Campaign plan ready",
    "status": "Proposed",
    "recipient": "Client decision-maker and campaign lead",
    "detail": "Creative and spending approval are separate; store budget limits and platform state."
  },
  {
    "group": "Paid advertising",
    "event": "Creative needs approval",
    "status": "Proposed",
    "recipient": "Client decision-maker and campaign lead",
    "detail": "Creative and spending approval are separate; store budget limits and platform state."
  },
  {
    "group": "Paid advertising",
    "event": "Spend increase requested",
    "status": "Proposed",
    "recipient": "Client decision-maker and campaign lead",
    "detail": "Creative and spending approval are separate; store budget limits and platform state."
  },
  {
    "group": "Paid advertising",
    "event": "Campaign started or paused",
    "status": "Proposed",
    "recipient": "Client decision-maker and campaign lead",
    "detail": "Creative and spending approval are separate; store budget limits and platform state."
  },
  {
    "group": "Paid advertising",
    "event": "Advert rejected",
    "status": "Proposed",
    "recipient": "Client decision-maker and campaign lead",
    "detail": "Creative and spending approval are separate; store budget limits and platform state."
  },
  {
    "group": "Paid advertising",
    "event": "Budget limit approaching",
    "status": "Proposed",
    "recipient": "Client decision-maker and campaign lead",
    "detail": "Creative and spending approval are separate; store budget limits and platform state."
  },
  {
    "group": "Paid advertising",
    "event": "Tracking failed",
    "status": "Proposed",
    "recipient": "Client decision-maker and campaign lead",
    "detail": "Creative and spending approval are separate; store budget limits and platform state."
  },
  {
    "group": "Paid advertising",
    "event": "Campaign report ready",
    "status": "Proposed",
    "recipient": "Client decision-maker and campaign lead",
    "detail": "Creative and spending approval are separate; store budget limits and platform state."
  },
  {
    "group": "Branding and design",
    "event": "Direction options ready",
    "status": "Proposed",
    "recipient": "Client reviewer and assigned designer",
    "detail": "Attach feedback and lasting decisions to the exact artwork, page or timestamp."
  },
  {
    "group": "Branding and design",
    "event": "Direction selected",
    "status": "Proposed",
    "recipient": "Client reviewer and assigned designer",
    "detail": "Attach feedback and lasting decisions to the exact artwork, page or timestamp."
  },
  {
    "group": "Branding and design",
    "event": "Design round ready",
    "status": "Proposed",
    "recipient": "Client reviewer and assigned designer",
    "detail": "Attach feedback and lasting decisions to the exact artwork, page or timestamp."
  },
  {
    "group": "Branding and design",
    "event": "Feedback needs clarification",
    "status": "Proposed",
    "recipient": "Client reviewer and assigned designer",
    "detail": "Attach feedback and lasting decisions to the exact artwork, page or timestamp."
  },
  {
    "group": "Branding and design",
    "event": "Revision ready",
    "status": "Proposed",
    "recipient": "Client reviewer and assigned designer",
    "detail": "Attach feedback and lasting decisions to the exact artwork, page or timestamp."
  },
  {
    "group": "Branding and design",
    "event": "Final design signed off",
    "status": "Proposed",
    "recipient": "Client reviewer and assigned designer",
    "detail": "Attach feedback and lasting decisions to the exact artwork, page or timestamp."
  },
  {
    "group": "Branding and design",
    "event": "Export package ready",
    "status": "Proposed",
    "recipient": "Client reviewer and assigned designer",
    "detail": "Attach feedback and lasting decisions to the exact artwork, page or timestamp."
  },
  {
    "group": "Branding and design",
    "event": "Production information missing",
    "status": "Proposed",
    "recipient": "Client reviewer and assigned designer",
    "detail": "Attach feedback and lasting decisions to the exact artwork, page or timestamp."
  },
  {
    "group": "Website and ecommerce",
    "event": "Content or access needed",
    "status": "Proposed",
    "recipient": "Client approver and website lead",
    "detail": "Keep design approval separate from functional acceptance; record launch checks, ownership and support dates."
  },
  {
    "group": "Website and ecommerce",
    "event": "Page design ready",
    "status": "Proposed",
    "recipient": "Client approver and website lead",
    "detail": "Keep design approval separate from functional acceptance; record launch checks, ownership and support dates."
  },
  {
    "group": "Website and ecommerce",
    "event": "Staging site ready",
    "status": "Proposed",
    "recipient": "Client approver and website lead",
    "detail": "Keep design approval separate from functional acceptance; record launch checks, ownership and support dates."
  },
  {
    "group": "Website and ecommerce",
    "event": "Functional testing requested",
    "status": "Proposed",
    "recipient": "Client approver and website lead",
    "detail": "Keep design approval separate from functional acceptance; record launch checks, ownership and support dates."
  },
  {
    "group": "Website and ecommerce",
    "event": "Website issue fixed",
    "status": "Proposed",
    "recipient": "Client approver and website lead",
    "detail": "Keep design approval separate from functional acceptance; record launch checks, ownership and support dates."
  },
  {
    "group": "Website and ecommerce",
    "event": "Launch permission needed",
    "status": "Proposed",
    "recipient": "Client approver and website lead",
    "detail": "Keep design approval separate from functional acceptance; record launch checks, ownership and support dates."
  },
  {
    "group": "Website and ecommerce",
    "event": "Website launched",
    "status": "Proposed",
    "recipient": "Client approver and website lead",
    "detail": "Keep design approval separate from functional acceptance; record launch checks, ownership and support dates."
  },
  {
    "group": "Website and ecommerce",
    "event": "Training and handover ready",
    "status": "Proposed",
    "recipient": "Client approver and website lead",
    "detail": "Keep design approval separate from functional acceptance; record launch checks, ownership and support dates."
  },
  {
    "group": "Mobile apps",
    "event": "Prototype ready",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Mobile apps",
    "event": "Test build ready",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Mobile apps",
    "event": "Build testing due",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Mobile apps",
    "event": "App bug fixed",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Mobile apps",
    "event": "Store listing needs approval",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Mobile apps",
    "event": "App submitted",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Mobile apps",
    "event": "Store rejected app",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Mobile apps",
    "event": "Store approved app",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Mobile apps",
    "event": "App publicly released",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Mobile apps",
    "event": "App update ready",
    "status": "Proposed",
    "recipient": "Client testers, approver and app lead",
    "detail": "Store exact build versions, device evidence, installation guidance and separate approval/release states."
  },
  {
    "group": "Custom software and AI",
    "event": "Requirements need acceptance",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "Milestone demonstration ready",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "Acceptance testing requested",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "Change estimate ready",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "Integration access blocked",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "Release planned",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "Release completed",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "AI evaluation ready",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "Incident reported",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "Recovery completed",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "Custom software and AI",
    "event": "Running cost limit approaching",
    "status": "Proposed",
    "recipient": "Client decision-maker and software lead",
    "detail": "Record acceptance checks, bug/change distinction, human escalation, safe data access and approved running costs."
  },
  {
    "group": "SEO and AI visibility",
    "event": "Analytics access needed",
    "status": "Proposed",
    "recipient": "Client content approver and SEO lead",
    "detail": "Use sourced, dated metrics and clear implementation responsibility. Do not promise rankings or combine unlike metrics."
  },
  {
    "group": "SEO and AI visibility",
    "event": "Audit and plan ready",
    "status": "Proposed",
    "recipient": "Client content approver and SEO lead",
    "detail": "Use sourced, dated metrics and clear implementation responsibility. Do not promise rankings or combine unlike metrics."
  },
  {
    "group": "SEO and AI visibility",
    "event": "Article or page needs approval",
    "status": "Proposed",
    "recipient": "Client content approver and SEO lead",
    "detail": "Use sourced, dated metrics and clear implementation responsibility. Do not promise rankings or combine unlike metrics."
  },
  {
    "group": "SEO and AI visibility",
    "event": "Technical change needs permission",
    "status": "Proposed",
    "recipient": "Client content approver and SEO lead",
    "detail": "Use sourced, dated metrics and clear implementation responsibility. Do not promise rankings or combine unlike metrics."
  },
  {
    "group": "SEO and AI visibility",
    "event": "Indexing problem found",
    "status": "Proposed",
    "recipient": "Client content approver and SEO lead",
    "detail": "Use sourced, dated metrics and clear implementation responsibility. Do not promise rankings or combine unlike metrics."
  },
  {
    "group": "SEO and AI visibility",
    "event": "Search security issue found",
    "status": "Proposed",
    "recipient": "Client content approver and SEO lead",
    "detail": "Use sourced, dated metrics and clear implementation responsibility. Do not promise rankings or combine unlike metrics."
  },
  {
    "group": "SEO and AI visibility",
    "event": "SEO work completed",
    "status": "Proposed",
    "recipient": "Client content approver and SEO lead",
    "detail": "Use sourced, dated metrics and clear implementation responsibility. Do not promise rankings or combine unlike metrics."
  },
  {
    "group": "SEO and AI visibility",
    "event": "Period results ready",
    "status": "Proposed",
    "recipient": "Client content approver and SEO lead",
    "detail": "Use sourced, dated metrics and clear implementation responsibility. Do not promise rankings or combine unlike metrics."
  },
  {
    "group": "SEO and AI visibility",
    "event": "Next priorities ready",
    "status": "Proposed",
    "recipient": "Client content approver and SEO lead",
    "detail": "Use sourced, dated metrics and clear implementation responsibility. Do not promise rankings or combine unlike metrics."
  }
];
