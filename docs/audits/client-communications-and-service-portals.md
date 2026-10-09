# Client communications and service portal audit

9 October 2026. Research and proposal, not an implementation or permission to send messages.

## What this review establishes

Reviewed the current repository at `c0caa65918a0739bead4500549ca0a514e368b68`, including the local project-settlement work without changing it. Traced action handlers, actual mail callers, recipient rules, templates, scheduled jobs, portal pages and records. An agent independently researched the six published services and compared their working needs with the portal.

“Exists” below means a sending path is present in source. It does not mean this review exercised that journey with a signed-in client or verified delivery. The preceding production repair verified SMTP acceptance and the live meeting lifecycle; it did not exercise all the other messages. “Missing” means no corresponding built-in path was found in the inspected handlers. Recommendations are proposed flows, not new contractual promises.

The main finding: we already have several useful client emails, but we lack much of the communication between the people doing the work. We also lack the service-specific records that would make many useful client messages possible.

## What already exists

| Moment | Current communication |
| --- | --- |
| Enquiry or brief submitted | Form-specific receipts, studio notices and onboarding next steps; form settings control recipients and whether a notice is enabled. |
| Brief left unfinished | A limited daily reminder process exists, with recipient opt-out. It is not an hourly follow-up service. |
| Portal or staff invitation | Invitation with expiry and account link; a separate send-again flow exists for invitations. |
| Invitation accepted | Client welcome and studio notice; staff acceptance and completed staff welcome notices. |
| Account security change | Sign-in/reset messages, new-device and password-change notices, and queued user-management security notices. |
| Project stage changes | Client email from both the stage form and drag-and-drop board. This is already implemented, subject to the client's updates preference. |
| Work explicitly sent for approval | Client review email when a deliverable becomes “Awaiting client”. Uploading a file alone does not send this email. |
| Client approves work | Client sign-off confirmation and studio approval notice. The browser submits the version seen so a newer version cannot be approved accidentally. |
| Client requests revisions | The note is saved and the studio inbox is notified. |
| Client opens a support question | Acknowledgement to the client and notice to the studio inbox. |
| Client replies / studio replies | Studio notice for the client's reply; client email for the studio's reply. |
| Estimates and billing | Estimate sent/answered messages, invoices, receipts, invoice reminders, void/refund/reversal notices and payment/estimate studio notices. Some are explicit choices or manual sends; they are not all automatic. |
| Meeting booked, moved or cancelled | Cal.com owns the client's calendar notices; WDC sends studio notices. Optional timed reminders remain off. |
| Marketing and general follow-up | Campaigns and an automation builder exist. Its triggers are new contacts and added tags, not native project, task, department or deliverable events. |
| Mail trouble | Message log, failure alerts, saved-provider health checks and optional weekly mail digest. Postmark/Brevo bounce and complaint handlers exist; the current SMTP setup is not proof of delivered/read status. |

Main evidence: [project messages](../../frontend/lib/project-mail.ts), [lifecycle messages](../../frontend/lib/lifecycle-mail.ts), [support messages](../../frontend/lib/support-mail.ts), [money messages](../../frontend/lib/money-mail.ts), [admin actions](../../frontend/lib/admin/actions.ts), [portal actions](../../frontend/lib/portal/actions.ts), [daily jobs](../../frontend/lib/jobs/daily.ts), [automations](../../frontend/lib/automations.ts).

## Important missing or incomplete communication flows

The intended recipients below are recommendations. The system needs to know who owns the work and who may see it before it can send correctly.

### Getting a client and project ready

| Flow | Who should hear | Current gap |
| --- | --- | --- |
| Brief picked up and linked to a project | Client and project lead | Optional client notice exists when the studio ticks “Tell the client”; no corresponding assigned-team notice was found. |
| Brief needs clarification | Client's decision-maker | No structured request, deadline, answer record or reminder tied to an individual question. Support can handle it manually. |
| Required content, access or documents missing | Client responsible for supplying them; project lead | No client action checklist or request-specific email/reminder. |
| Project opened / work authorised to start | Client and assigned lead | Project creation saves the record but does not send a dedicated kickoff or team-assignment notice. |
| Scope, plan and expected review dates ready | Client decision-maker and lead | No structured plan acceptance flow. Scope is text and the project has one due date. |
| Department assigned to the client | New department's responsible staff | Assignment exists; no assignment notification. |
| Client moved between departments | Old lead, new lead and owner | No handover request, acceptance, context summary or unaccepted-handover escalation. |
| Project lead added or replaced | New lead, previous lead; client if their contact changes | Owner accounts can be saved on the project; no targeted notice or client introduction. |
| Client's approver or billing contact changes | Relevant studio team and new contact | Extra contacts are stored, but not formal per-project reviewer/billing roles with portal permissions and notification routing. |
| Invitation unaccepted or about to expire | Invited person and responsible studio person | Expiry and resend exist; no dedicated scheduled acceptance reminder/escalation was found. |

### Progress, dates and decisions

| Flow | Who should hear | Current gap |
| --- | --- | --- |
| Stage changes | Client; relevant project team | Client email exists. Targeted staff/team notification is missing. |
| Client-visible update published | Client followers | Update appears in the portal but `postUpdate` does not send an email. |
| Routine progress summary | Client and lead | No project digest summarising progress, next steps and outstanding decisions. The mail digest is about delivery statistics, not project work. |
| Due date changes | Client and people whose work depends on it | Saves and refreshes screens; no date-change notice, reason or acknowledgement flow. |
| Project becomes at risk, blocked or waiting on client | Lead; person who can unblock it; client when appropriate | Health is stored; no targeted notice or escalation. Internal reasons must remain private. |
| Client action due soon / overdue | Person who owes the action; lead on escalation | No general action/reminder record. Invoice reminders do not cover project inputs or approvals. |
| Scope change requested | Project lead and client decision-maker | No linked change-request workflow with cost/date impact and acceptance. |
| Scope change approved, declined or withdrawn | Client, lead, affected teams and finance when needed | No dedicated record or messages. An estimate alone does not connect the decision to a changed scope and plan. |
| Project paused, resumed or cancelled | Client and affected teams | No explicit lifecycle separate from the six normal stages and archive flag. |
| Milestone reached / acceptance required | Client reviewer and lead | No milestone acceptance records or notices. A whole-project stage is not a milestone. |
| Repeated lack of response | Client first, then responsible lead | No agreed escalation cadence; avoid automatic threats or automatic approval. |

### Deliverables, review notes and sign-off

| Flow | Who should hear | Current gap |
| --- | --- | --- |
| Internal draft added | Assigned reviewer/team | File/link version is saved; no internal-review assignment or notice. Client email should wait until sharing is deliberate. |
| New work shared without asking for approval | Client | No separate published-deliverable notice. Current mail is tied to “Awaiting client”. |
| New version ready for review | Client approver | Review mail can be sent after changing the approval state; no complete revised-work workflow or change summary beyond the version note. |
| Review due soon or overdue | Client approver; lead if overdue | No review reminder job. The email computes a seven-day date, but this is not a stored review deadline. |
| Client submits review notes | Assigned reviewer and lead; acknowledgement to client | Studio inbox notice exists. No targeted assignment or email acknowledgement back to the client that their revision note was received. |
| Team answers a review note | Client or internal reviewer who wrote it | No deliverable-specific comment thread with reply notifications. A support ticket is the workaround. |
| Specific correction completed | Person who requested it | No individual feedback item with “addressed”, “needs clarification” or “reopened” state. |
| Reviewer mentioned / review handed to another person | Named person | No mention or delegated-review flow. |
| Approval recorded | Client and studio | Both emails exist. Department/staff routing and a structured per-version approval record need strengthening. |
| Approval recorded by staff on the client's behalf | Client and lead | Admin approval changes are not wired to the same confirmation/notice paths as a client's portal approval. Record the actual evidence and actor. |
| Approved work changed | Approver and downstream team | A new version resets approval, which is useful; there is no tailored notice explaining that a fresh decision is required. |
| Final files/handover package ready | Client's relevant contacts | Can be represented as generic files and a review request; no dedicated final-handover flow/checklist. |

Review records need the exact version, reviewer identity, time, decision and surviving feedback history. Keeping old files is useful but does not by itself supply those records. Feedback on a logo image, a page in a PDF, a video timestamp and a software bug need different context.

### Internal work and communication between departments

| Flow | Who should hear | Current gap |
| --- | --- | --- |
| Task assigned or reassigned | Actual staff account | Tasks store a free-text assignee; no account-linked task email. |
| Task due soon or overdue | Assignee; lead when escalation is needed | No task reminder/escalation job. |
| Priority or required date changes | Assignee and affected lead | No targeted notification flow. |
| Task completed or reopened | Lead and dependent task owner | Completion exists; no dependent-owner notification. |
| Dependency becomes unblocked | Person who can now start | One task dependency exists; no “you can start now” notice. |
| Internal note or review request needs action | Named colleague | Internal notes/updates exist, but there are no recipient, reply, mention or acknowledgement records. |
| Department hands work to another department | Receiving lead, outgoing lead and owner | No handover object with files, decisions, open risks, next action and acceptance. |
| Internal quality review passed or failed | Creator and reviewer | No internal approval step before client sharing. |
| Staff unavailable or access removed while work is assigned | Owner and replacement lead | User management exists; no operational reassignment/handover communication around outstanding work. |
| Client approval or revision affects a team | Project lead and responsible team | Current notices go to the studio inbox, not automatically to the staff responsible. |
| Daily “what needs me” summary | Each staff member | No personal work digest or notification inbox covering these events. |

There is no built-in general team chat found in this setup. “Direct chat” is a saved communication-channel choice, not evidence of a chat feature. A logged WhatsApp message or phone call is a record of communication, not an actual sent message.

### Support and meetings

| Flow | Who should hear | Current gap |
| --- | --- | --- |
| Support opened or replied to | Client and studio | Existing emails; no assigned-agent/department routing. |
| Support assigned, escalated or unanswered too long | Responsible staff and lead | Tickets have no formal assignee, service deadline or escalation flow. |
| Support closed or reopened | Other participant when useful | State changes refresh the portal; no dedicated state-change notice. Client replies already notify the studio, so avoid a second duplicate reopen email. |
| Email reply should join its portal conversation | Relevant participants | No inbound email-to-ticket ingestion or thread matching found. A Reply-To mailbox is not a portal conversation integration. |
| Meeting confirmation, change or cancellation | Attendee and studio | Existing Cal.com/WDC ownership; do not duplicate those messages. |
| Meeting reminder | Attendee and host who opt in | Optional timed reminders deliberately remain off. |
| Agenda / material needed before meeting | Attendee and lead | No project-linked agenda or preparation request. |
| Review meeting outcome and next actions | Client and assigned team | No minutes/action acceptance workflow tied to the project. |
| Missed meeting / next appointment needed | Attendee and lead | No attendance/no-show workflow. |
| Handover recording and document ready | Client | No purpose-specific handover package and acknowledgement. |

### Money, recurring work and life after delivery

| Flow | Who should hear | Current gap |
| --- | --- | --- |
| Estimate, invoice, receipt and invoice reminders | Client and relevant studio inbox | Existing, but client role routing and separate billing preferences are missing. |
| Revised invoice or estimate materially changes the agreement | Billing contact and decision-maker | Editing exists; do not assume a revised document is automatically emailed or explicitly reaccepted. |
| Payment needed to start/unblock a milestone | Client payer, project lead | Existing invoices/reminders do not form a milestone/start-condition communication workflow. |
| Payment failed, unidentified or needs reconciliation | Owner/finance; payer where appropriate | Payment events and reconciliation exist; dedicated actionable exception routing needs review rather than treating every failure as a generic client email. |
| Retainer period starts / purchased allowance nearly used | Client and lead | No recurring service-period and allowance records. |
| Additional work exceeds agreed allowance | Client decision-maker | No connected overage request with approval; never silently bill or publish beyond scope. |
| Monthly report ready / next month's plan needs approval | Client stakeholders | Files can be uploaded; no reporting-period or next-cycle workflow. |
| Final delivery and handover complete | Client and studio team | “Delivered” triggers the generic stage email, not a checked handover package. |
| Launch permission, launch completed or launch delayed | Client approver and teams | No dedicated launch/release workflow. |
| Support/warranty period ending | Client and responsible team | No agreed support-period record and reminder. |
| Domain, hosting, maintenance or service renewal due | Account owner and payer | No dedicated ownership/renewal records and notices. Dates and ownership must be real, not guessed. |
| Service ends / access and assets handed back | Client, lead and relevant staff | No offboarding checklist and completion notice. |
| Feedback/testimonial requested | Client who chooses to participate | Marketing can do a manual campaign; no built-in completion-linked, optional request. This is lower priority than delivery. |

## Problems to fix before multiplying the number of emails

1. **The right person must receive the message.** Most studio notices go to one studio inbox. Client notices mostly use the client's main address. Departments, project owners, reviewers, billing contacts and watchers need explicit roles and access checks. Department membership is not permission to receive every client's private information.
2. **Client preferences are too broad for the proposed flows.** Currently “Project updates” also controls various billing and support messages; “Invoice reminders” and marketing are the other categories. Proposed choices should distinguish actions/reviews, routine progress, support, billing, reminders and marketing. Staff also need their own preferences; a global studio switch is not a personal staff setting. Keep required security/transaction records distinct and respect existing owner rules.
3. **Important actions need a durable pending-message record before the response.** Several project/support/lifecycle handlers enter `after()` before the outbox row is created. If that deferred work never starts, the event can have no message row. The generic log can also fall back to memory on database failure. The money and security paths already offer stronger patterns to reuse; this does not automatically justify a new queue service.
4. **Duplicate prevention must name the real event.** Stage mail keys use project, destination stage and day. Moving away and back to that stage on the same day can suppress a legitimate new notice. Some skipped project messages reuse the send key, so turning updates on later may still collide. Use distinct event identity, not only a daily label.
5. **Review dates must exist in the project record.** Today's email computes a seven-day response date. There is no corresponding persisted review deadline/reminder/schedule adjustment. Do not promise an automatic timeline change that the app has not made.
6. **Not all failed messages have a working rebuild-and-resend path.** Money and form messages can be rebuilt. Other kinds can reach a fallback that clears for another attempt and explicitly says nothing was sent. Project, support and review messages need deliberate safe recovery; invitations already have a separate workflow.
7. **Drafts need a clear sharing boundary.** The inspected portal page renders all project deliverables, including “Not sent”. Adding or revising work can therefore expose it before the studio sends it for review. Decide what is internal, published and awaiting approval before adding “new deliverable” emails.
8. **Reviews need a lasting decision history.** Current deliverables have version files and one current approval/note. A new version resets that state. Add exact-version decisions and feedback history so the portal can explain what was approved and by whom after further changes.
9. **Email copy must match real capabilities.** A starter design invites direct comments on work, but the portal currently provides a general revision note rather than annotations and threaded feedback. Support acknowledgement promises must match real response staffing/deadlines.
10. **Sent is not delivered or read.** The current SMTP result establishes acceptance. Do not present it as client delivery, and do not escalate merely because an email was not opened. Provider bounce/complaint support exists for saved services, but does not establish full delivery tracking for the current SMTP path.
11. **Keep full history in the portal.** Email should state the change, the next action, who owns it, its real due date and a direct link. Do not make email the only location of a decision or forward internal notes to clients.
12. **Use immediate messages for decisions and exceptions, digests for routine work.** Assignments, review requests, important replies and failures deserve prompt notice. Several completed tasks or routine status details can be grouped. Asana documents this distinction, while Figma lets people choose all comments, mentions/replies or none. These are useful patterns, not recommendations to replace WDC with those products. [Asana inbox](https://help.asana.com/s/article/inbox), [Figma comment preferences](https://help.figma.com/hc/en-us/articles/360041547813-Manage-email-notifications-for-comments-on-files).

## What each service needs in its client portal

Keep one client portal and the existing common stages. Give each project the service-specific work views it needs. A client buying two services should not need two accounts or a different navigation system.

### Social media management and content creation

This needs the most distinct recurring workflow. “In progress” cannot tell a client what is happening to next Tuesday's reel.

Needed records and views:

- Monthly/weekly content calendar, package, platforms and agreed quantity.
- Each post's caption, visual/video, format, platform preview, purpose and intended publication date/time/time zone.
- Internal review before client sharing; individual or batch client approvals bound to the exact version.
- Feedback attached to the post, agreed approval deadline, reviewer and revision history.
- Separate draft, review, approved, scheduled, published, failed and cancelled states.
- Material changes after approval require a fresh decision; no response must not become approval.
- Publishing proof or live link, clear failures, disconnected-account status and recovery owner.
- Content requests, photo/video needs, community-management decisions and escalated messages that require the client's answer.
- Period report with source/date range and the next plan.

Important communications: calendar ready; content ready to review; deadline approaching/missed; feedback received/answered; changed approved content; schedule changed; publishing failed; account access lost; report ready; next period plan due. Routine successful posts can be a digest.

WDC's published service copy already promises a content calendar, scheduling and approval before posting. Generic deliverable files can support this manually, but do not currently implement the workflow. Buffer also separates drafts, approvals, scheduling and sent content: [collaboration](https://buffer.com/collaborate), [post states](https://support.buffer.com/en-us/articles/how-to-use-the-all-channels-view-in-buffer-oqqE4Sdf3T).

### Paid advertising, within social/PPC

Keep paid advertising distinct from organic posting even when sold together. Needs: campaign goal, target audience, channels, dates, creative, landing page, tracking readiness, approved spending cap and reports. Separate agency fees from funds paid to platforms. Client approval of creative is not approval of extra spending, and platform review is not client review.

Important communications: plan/creative needs approval; spend increase requested; campaign started/paused; advert rejected; budget limit approaching; conversion tracking failed; report ready. [Google Ads review process](https://support.google.com/google-ads/answer/1722120).

### Branding and design

Needs: approved brief/strategy, direction options and selected direction, review rounds, artwork-specific feedback, internal quality review, final approval and organised export/source files. Label what each file is for: screen, print, editable source, colour/font guidance or usage guide. Motion/design reviews need image/page/frame/timestamp context where relevant. Keep resolved notes in history.

Important communications: direction options ready; selection recorded; design round ready; feedback acknowledged; clarification needed; revision ready; final sign-off recorded; final files/guide delivered; missing production information.

Use the revision allowance actually agreed in the scope. The repository's engagement/legal text remains draft until lawyer approval; do not silently enforce a proposed allowance. [Figma's contextual comments](https://help.figma.com/hc/en-us/articles/360039825314-Guide-to-comments-in-Figma).

### Websites and ecommerce

Needs: page/sitemap plan; client content and image checklist; page design approval; staging link; functional testing list and issue reports; domain/hosting ownership; client-managed provider setup; launch checklist and permission; training recording/document; support and renewal details. Ecommerce also needs product, stock, tax, shipping, checkout and order-email checks appropriate to the actual shop.

Design approval and functional acceptance must be separate: approving a homepage does not establish that forms or checkout work.

Important communications: content/access needed; design ready; staging ready; testing requested; issue acknowledged/fixed; scope/date change proposed; launch permission needed; launched; handover ready; support period/renewal approaching. [Shopify launch checks](https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-prepare-for-launch), [W3C evaluation guidance](https://www.w3.org/WAI/test-evaluate/).

### Mobile and cross-platform apps

Needs: feature scope and prototype decisions; test builds with version and install instructions; what changed/what to test; feedback with device, operating system, steps and evidence; store listing/screenshots approval; submission/rejection/release states; update and support history.

Important communications: prototype ready; test build ready; testing due; bug fixed; store materials need approval; submitted; rejected and action needed; approved; actually released; update ready; support window ending. Approval by a store is not the same moment as public release. [Apple TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [build statuses](https://developer.apple.com/help/app-store-connect/reference/app-uploads/app-build-statuses).

### Custom software, integrations and AI

Needs: agreed requirements and acceptance criteria; clear milestones/features; demo/staging access; testing checklist; bug and change-request distinction; price/date impact approvals; release notes and launch permission; data/integration access checklist; migration/backup responsibility; training and operational handover; maintenance/incident records.

AI work additionally needs permitted data, expected answers/actions, refusal/escalation behaviour, real test examples, known limitations, human correction, approved running costs, versioned changes and monitoring. A chatbot link by itself does not show that these checks passed.

Important communications: requirements/milestone ready for acceptance; demo ready; testing needed; scope-change estimate ready; access blocked; release planned/completed; AI evaluation ready; incident and recovery; cost limit/renewal approaching. Keep technical detail behind a useful client summary. [GitHub milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work), [NIST AI lifecycle framework](https://www.nist.gov/itl/ai-risk-management-framework).

### SEO and AI visibility

Needs: starting baseline and goals; audit findings linked to planned work; keyword-to-page plan; content review queue; technical changes and implementation responsibility; analytics/Search Console access; indexing problems; period reports and next priorities. Metrics need source and date range. Clicks, impressions, rankings, leads and sampled AI mentions should not be combined into an invented success number.

Important communications: access needed; audit/plan ready; article/page needs approval; technical changes need permission; indexing/security issue found; work completed; report ready; next period priorities. No ranking or AI-visibility outcome should be promised from a generic status email. [Search Console guidance](https://developers.google.com/search/docs/monitor-debug/search-console-start), [performance report](https://support.google.com/webmasters/answer/7576553).

## Shared portal needs across all services

- “What we need from you”: a short actionable list with responsible person, deadline and completion state.
- Named client reviewers, final decision-makers and billing contacts, with appropriate project access. The current portal resolves a client from its main email; storing extra contact names does not give them scoped portal access.
- Agreed milestones and review deadlines while retaining the common project stages.
- Conversations attached to the exact update, deliverable, post or issue. Today's update Reply starts a support question instead of a native update thread.
- Lasting review decisions and resolved/unresolved feedback.
- Explicit change requests and accepted price/date effects.
- Internal discussion visibly separated from client-visible work.
- Project-linked meetings, agenda, notes and actions. The current timeline matches meetings by attendee email, which can place one client's meeting on several of their projects.
- Handover checklist, final files, training materials, support terms and ownership details.
- Recurring service periods, allowances, reporting dates and renewal decisions where relevant.
- A notification inbox and personal email/digest preferences, with direct links to the relevant work.

## Recommended order

1. Repair the common foundation: exact recipients, draft sharing, durable pending messages, meaningful event identity, review history/deadlines and safe resend.
2. Add the missing everyday notices: department/lead/task assignments; client-visible updates; due-date and blocker changes; review replies/reminders; internal handovers.
3. Build the social calendar and per-post approval workflow, because it is already promised publicly and recurring clients need it continually.
4. Add shared client requests, milestone decisions, scope changes and handover records.
5. Add service views for website testing/launch, app builds/stores, software/AI acceptance, branding review rounds, SEO reports and paid-campaign approval/reporting.
6. Add recurring period, renewal and post-delivery communications. Measure routine notification volume before choosing digest frequency or introducing additional infrastructure.

For each proposed message, specify the real event, recipient, visibility, next action, preference category, timing, stale-event cancellation and delivery/retry record. Do not build a large collection of disconnected templates. Build the working flow first, then let its records drive the communication.
