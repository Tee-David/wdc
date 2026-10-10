# WDC platform: UX and product-gap audit (read-only)

Audit date 10 Oct 2026. All paths are under /home/user/wdc/frontend unless stated. Every claim was checked by opening the file cited. "TRACKED" means docs/status.md, docs/client-workspace-implementation.md or docs/audits/client-communications-and-service-portals.md already names it. Nothing was run in a browser; this is a source audit, and status.md itself says nothing has been exercised signed in against production.

## Summary

WDC is further along than a typical agency tool. It has a real project record with a stage track, health, per-update client visibility, versioned deliverables, exact-version client approval, an append-only audit log, invoices, estimates, credit, refunds, reversal, Paystack and Flutterwave, PDF receipts and a reconciliation page. A new "workspace" layer (migrations 0050-0053) adds per-service work records, handovers, staff tasks, notes, project membership, a personal inbox and email preferences.

The main weaknesses are structural, not missing screens:

1. Two parallel systems for the same thing. Legacy tasks, deliverables and updates (`lib/admin/types.ts`, JSON rows in `admin_records`) sit beside new workspace tasks (`workspace_team_tasks`), notes, and service items (`workspace_service_items`). The dashboard "My tasks", the attention queue and the portal "Needs your attention" read only the legacy rows. Work the new layer creates never reaches the daily screens.
2. One role vocabulary. The database holds exactly `owner | staff | client` (`lib/roles.ts`, migration 0019). Staff are one undifferentiated pool. There is no designer, developer, SEO lead, social manager, account manager or finance role. Departments are only labels on a client (`lib/departments.ts`); they do not touch projects, services, permissions or workload.
3. Staff read everything, write only what they lead, and the UI does not say so. Lists and project pages show every client and project to every staff account. Writes through `changeProjectRecord` and workspace actions require the staff member to be a named lead or a granted member (`lib/workspace/access.ts` `requireProjectActor`). The buttons still render and then refuse. The one exception is `createDeliverable`, which has no scope check at all (details under Staff).
4. The owner cannot see staff progress as a feed. Updates, tasks and handovers exist per project, but there is no cross-project activity feed, no "what changed since I last looked", no staff workload view, and no time or effort capture anywhere.
5. Money is solid for one-off invoicing, weak for the retainer, deposit and milestone shapes the studio sells. There is no recurring invoice, no payment plan, no online part payment, no estimate-to-milestone schedule, and no bank-statement matching.
6. The client portal tells the client the stage and shows shared work, but the client cannot upload a file, cannot message inside a project, and is not told about workspace review items on the overview. Messaging is tickets (plain text, no attachments).
7. Per service, only social has a purpose-built record (a post), but it is a list item with no calendar, no per-platform account model, no batch approval and no recurring cadence. The other services share generic "kinds" and have no metrics or reporting model (SEO rankings, ad spend, build versions).

## Roles and permissions map

Roles in code: `owner`, `staff`, `client` (`lib/roles.ts`; DB check `user_role_check`, migration 0019; type `Role`). No sub-roles exist. Admin areas (`lib/admin/permissions.ts`): clients, projects, forms, content, money, settings, team, exports, destructive.

| Capability | Owner | Staff | Client |
|---|---|---|---|
| Home | /admin | /admin (after /admin/welcome once, `app/admin/layout.tsx`) | /portal |
| Clients, projects, forms (leads), content (blog, FAQ, media) | all | all read; write per rules below | own company only |
| Money (invoices, payments, expenses, estimates, reports) | all | none: `can(staff,"money")` is false; Money, Reports absent from nav; dashboard shows no figures | own invoices on /portal/billing (primary contact, or members with billing flag) |
| Meetings (`/admin/meetings`) | yes | no (`NAV_AREA` maps it to "settings", comment says owner-only until delegation) | booking panel in portal |
| Email, contacts, campaigns, automations | yes | no ("settings") | unsubscribe and preferences only |
| Users, departments, invitations, support view | yes | no ("team") | no |
| Settings | all 17 sections | "My account", Blog and site copy, Policies, FAQ, Media only (`lib/settings/sections.ts`, area null or content) | own Settings: profile, notifications, sign-in |
| Archive, merge, permanent delete | yes (`owner()`, typed name, I understand) | no ("destructive") | no |
| Refund, reverse, void | owner with fresh sign-in under 15 minutes (`ownerFresh`) | no | no |
| Project lead scope | any | only projects where in `ownerIds` or a member with `can_manage` | n/a |
| Project membership grant | owner only (`lib/workspace/member-actions.ts`) | no | additional reviewer or billing contacts granted by owner |
| Read-only support view | owner can view as a client or as staff for 15 minutes, with a reason (`lib/users/support*.ts`) | no | no |

Client sub-permissions come from `workspace_project_members`: `can_review`, `can_billing`, plus the primary contact (matched by email to `client.email`, `lib/workspace/access.ts`). A second person at the client without an invited account cannot review, and the portal matches only one email per client record.

Gaps and leaks in this map:

- P0 leak or gap: staff can open every client record and every project (`app/admin/(lists)/projects/page.tsx` shows all; `components/admin/dashboard-view.tsx` builds KPIs, attention and pipeline from `getClients()` and `getProjects()` with no filter for staff). Client contact details, onboarding briefs and notes are readable by all staff. Decide whether staff should be scoped to their projects or told clearly that they read all.
- Staff are shown write controls they cannot use: `components/admin/delivery.tsx` and `project-forms.tsx` check only the money flag, not lead status.
- `createDeliverable` (`lib/admin/actions.ts` line 913) calls `allow("projects")` then `db.addDeliverable` directly. It skips `requireProjectActor`, writes no audit row, emits no workspace event and notifies nobody. Any staff account can add a deliverable to any project, silently. `addDeliverableVersion` and `moveApproval` do go through the workspace path.
- Staff who open a project without naming themselves as lead cannot then edit it. `createProjectRecord` does not auto-add the creator, and an unassigned project (`ownerIds` empty) can be managed only by the owner.
- Staff lose useful reach: no invoice status for their own clients (cannot chase a late payer or know whether a client has paid before starting work), no meeting list, no reports.
- Staff cannot be sub-roled, so "finance only", "designer sees only branding projects" or "account manager sees all" cannot be expressed.
- `/admin/notifications` (project inbox) is reachable only through the bell popover; the bell badge counts forms, failed mail and blog review only, never unread workspace notifications (`components/admin/shell.tsx`, `app/admin/layout.tsx` counts). TRACKED partly (inbox exists), badge gap not tracked.

## Owner/admin

### What exists (login lands on /admin dashboard)
`components/admin/dashboard-view.tsx`: greeting, Today strip (meetings, invoices due today, projects due today; `today-strip.tsx`), My projects and My tasks (`my-work.tsx`, only when something is the owner's), KPI tiles (collected, outstanding, live projects, cash position), 30-day forecast, cashflow chart, collection gauge, "Attention needed" (overdue invoices, projects with derived attention reasons via `projectAttention`, unmatched provider events, failed mail, blog in review, changes requested on deliverables, open tickets, unfinished onboarding), pipeline by stage, upcoming deadlines, customise-dashboard (hide panels), quick actions.
Navigation: Dashboard, Clients (Leads and forms, Meetings, Support under it), Projects, Money (Reconciliation under it), Email, Blog, Users, Settings (`components/admin/shell.tsx`). Ctrl+K command palette.
Projects: list and kanban board with drag, project page with stage track, health, owner(s), channel, budget, margin tiles, updates (client-visible flag), deliverables with versions and links or uploaded files, tasks with one dependency, spend, history, audit log, workspace layer.
Money: invoices with list, search, status, date range, sort, pager, bulk, CSV export, reminders schedule per invoice, estimates that become invoices on acceptance, credit, refund, reversal, void, Paystack and Flutterwave, NGN and USD, receipts and PDFs, reconciliation of provider events.

### Broken or half-done
- Command palette lies by omission. The topbar button says "Search clients, projects, invoices" (`shell.tsx` ~line 386) but the palette filters page names only; records are searched only after "No page is called that" and then it just opens the list page with `?q=` (`CommandPalette`, ~line 449-510). Tasks, deliverables, tickets, forms entries and contacts have no global search. The picker search (`lib/admin/search-actions.ts`) exists but is used for forms, not for a global finder.
- Dashboard "My tasks" ignores workspace tasks (`my-work.tsx` reads `getTasks()` legacy; `workspace_team_tasks` is read only in `lib/workspace/team-store.ts` for the project page). A task assigned in the new Team workspace to the owner or any staff never appears on a dashboard.
- Attention queue ignores new-layer items: service records in `client_review`, `changes_requested`, handovers awaiting acceptance, overdue workspace tasks, requests awaiting the client, scope changes. Only legacy deliverable `Revision requested` appears. Workspace events do reach the inbox, but that is a separate page.
- Attention queue is capped to six and the rest "are on the Money, Projects, Clients and Blog screens" (no full list page).
- Updates, tasks and history exist per project only. There is no cross-project "what staff did this week" feed, no weekly digest to the owner of staff progress. Workspace email "digest" mode exists per person (`workspace_notification_preferences`) but the owner cannot request a studio-wide progress summary.
- Mixed concerns in "Settings, System": migrations are applied by hand ("a schema change ships as a migration; production applies it from Settings > System"). Status.md notes migrations 0050-0053 were applied administratively, the Settings UI route not separately tested. TRACKED.
- Meetings: only owner can see them; staff cannot be delegated. TRACKED as "owner only until scoped staff delegation".
- Reports page (`/admin/reports`, area money) is owner-only; no project, staff or service profitability beyond the per-project margin tiles.

### Missing for the owner's stated goals
- A single "Studio pulse" screen: all workspace events across projects, newest first, filterable by staff member, client, service, with unread state. The events table (`workspace_events`, `workspace_notifications`) already has the data; only the cross-project view is missing.
- Staff workload view: open tasks and projects per person, overdue per person, upcoming deadlines per person.
- Weekly progress rollup per staff member and per project.
- Approvals waiting, by age: what has sat with a client for more than 7 days (the data exists: `reviewDueAt`, 7-day default in `service-deliverable-policy.ts`), surfaced as a chaser list.
- Revenue by service (project.service is single and the invoice has project link, so this is derivable).
- Owner-set review SLAs and a handover checklist enforcing the owner's rules in CLAUDE.md (two review meetings, recorded Google Meet handover, handover document). The `handover` kind has fields for guide, training and recording (`lib/workspace/service-model.ts`) but nothing counts review meetings, links meetings to the project, or blocks "Delivered" until a handover record is acknowledged.
- Project templates per service (a standard task and milestone list when a project opens).

## Staff

### What exists
After accepting an invitation: `/admin/welcome` once. Then the same shell with Dashboard, Clients (Leads, Support), Projects, Blog, Settings (My account and content sections). Dashboard: First week card (`first-week.tsx`), My projects and My tasks (always shown to staff, not hidden when empty), KPI tiles of counts (clients, open tickets, live projects, open forms), attention queue without money rows, pipeline, deadlines. Staff tour and page tours (`lib/tours/admin.ts`, role-filtered steps). Workspace: tasks with dependency and handover gating, handovers with accept, internal and client-visible notes, project inbox, notification preferences (`/admin/notifications`).

### Broken or half-done
- Staff scope mismatch (see map). A staff member who is not a lead sees an Add task, Post update, Add deliverable button and gets "Your session has ended or does not have access to this" style refusals; this wording is `REFUSED` in `lib/admin/guard.ts`, which says to sign in again, which is misleading for a permission problem.
- `createDeliverable` ungated and unaudited (above).
- Two task systems (above). A staff member sees two places to add tasks on the same project page (legacy `Tasks` panel and the Team workspace) with different assignee models (free text name versus user id).
- My work matches legacy tasks by lower-cased name text (`my-work.tsx`), so a renamed account or a typo drops a task from the person's list.
- Staff cannot see money at all, including whether the client's deposit is paid. For services like web, apps and software the team often needs "paid deposit, start work".
- No time capture (searched lib, components and app for timesheet, hours, effort, workload, capacity; no hit). The Nomarc task model has estimate and actual hours; WDC has neither.
- No "mine" filter shortcut on the projects list: filter is by owner name text (`projects/page.tsx` line 85 builds owner options from names).
- Blog: staff submit posts for owner review (counts on dashboard), working.

### Missing
- Department-aware assignment: staff cannot be filtered by department or service skill when picking a lead (`RemotePick` kind "staff" returns all active staff).
- Per-person calendar of due dates (tasks, reviews due, post schedule, meetings).
- Mention in notes (workspace notes have `mention_user_id` single mention in schema 0051, no UI search confirmed beyond a select; replies exist via `reply_to`).
- Quick capture: a one-field "log an update" from the dashboard, daily update prompt, "I am blocked" flag with reason that notifies the owner.

## Client

### What exists
Portal nav: Overview, Projects, Billing, Messages (tickets), Settings (`components/client/client-nav.ts`) plus bell to `/portal/notifications`. Overview: greeting, "Your next step" banner, KPIs (active projects, awaiting review, balance, support), attention (deliverables to review, invoices to pay, answered tickets), project cards with plain-language status ("We're waiting on you", "Ready for your look"), latest client-visible update, meetings panel, tour. Project page: stage track, deliverables with version history, open and download for uploaded files, Approve and Request changes (note required) tied to the exact version, client-visible updates, scope, money on this project (billing members), and the new ProjectWorkspace with shared work, notes, and client-visible team notes. Billing: invoices with pager, pay online, receipts, PDFs. Settings: profile, notification switches (project updates, invoice reminders, studio news), devices.

### Broken or half-done
- Overview "Needs your attention" counts only legacy deliverables, unpaid invoices and answered tickets (`app/portal/(lists)/page.tsx`). Workspace items waiting on the client (content or access requests, scope changes needing acceptance, ad spend approvals, post approvals, milestone acceptance, renewals) are not on the overview, in the KPI "Awaiting your review", or in the "next step" banner. The client must open each project to find them.
- Client cannot upload anything. Search of `components/client`, `components/workspace` and `app/portal` for upload controls finds only the profile photo. A "content or access request" (`kind: request`) has a text response field only; there is no way to send logos, images, copy, or credentials safely. This blocks social content intake, branding briefs and website content.
- Client cannot message about a project. Messages are tickets: subject plus plain-text body, three states, no attachments, no assignee, no project thread, no mention (`lib/admin/types.ts` Ticket, TicketMessage). The `submitTicket` form can carry a `projectId` but the project page has no "ask about this project" thread.
- Client cannot comment on a specific deliverable version or point at a spot on a design; the only response is approve or "request changes" with one note. Workspace service records do allow notes with a `context` field and resolve, but legacy deliverables (the main branding or design review path) do not.
- No client-side search, no filters on Projects, no activity timeline across projects, no unread count on the bell (shell comment in `components/client/shell.tsx` line 27 says there is no unread source on this side).
- Overview greeting comes from "client", but a company with several people sees only what their role allows; additional people must be invited as users first and granted per project by the owner (`ProjectMembers`), with no self-service "invite a colleague" for the client.
- Payment: the checkout always charges the full amount due (`app/api/pay/[token]/route.ts` `amount: totals.due`). A client cannot pay a deposit or part of an invoice online, or choose between provider options for a part. Manual transfer needs the studio to record it; the client cannot mark "I have paid by transfer" or upload proof.
- Handover: the client sees a handover record as shared work; the owner's rules (recorded Google Meet handover, handover document) are not surfaced as a checklist to the client.
- Complaints: only a support ticket. There is no escalate-to-owner, no satisfaction check after delivery, and no "request a revision round" count shown against the two-review allowance.

### Missing
- "What are you doing now" feed: client-facing live activity (today we updated X, next is Y). Client-visible updates exist, but there is no cadence enforcement (weekly update reminder to staff).
- Brand and asset library per client (logos, colours, fonts, guidelines, social handles and account access) reused across projects. The onboarding brief (Submission answers) is attached via entry links but is not rendered on either project page.
- Approvals inbox listing everything awaiting the client in one place, with due dates and one-click open.
- Invoice and quote history per project and a clear "estimates awaiting your answer" panel (estimates open from public `/q/[token]`; not surfaced in the portal nav).

## Per-service gaps

Facts common to all: `projects.service` is one of six slugs (`lib/services.ts`: branding, seo, web, apps, software, social); one project has exactly one service; a client can have many projects (`getProjects` by `clientId`). The workspace allows a seventh `ads` only as a tab inside a social project (`saveServiceItem` rule `service!==project.service && !(social && ads)`). Service "kinds" with fields and state lists are in `lib/workspace/service-model.ts` (18 kinds). Stages are shared: Onboarding, Discovery, In progress, Review, Revisions, Delivered. There is no recurring stage model, no per-service stage vocabulary, no project template, and no way to bundle several services into one engagement or programme (a client who buys branding plus web has two unrelated projects).

### Social media management (and paid ads)
Exists: kind `post` (platform text, caption, asset link, planned time, timezone, reviewer, publication URL, published time, evidence, deadline; states draft through failed), client approve per exact version, publish needs evidence (`checkState`); `creative`, `budget`, `campaign` kinds for ads with approved spend and creative IDs; `report` kind for periods.
Missing:
- No content calendar view. The workspace only has tabs Work, Review, Handover (`service-workspace-view.tsx`); posts are a flat list. No month or week grid, no drag to reschedule, no daily or weekly cadence rule, no "gaps in the calendar" warning, no timezone-correct display for the client.
- No social account model: platform is free text. No list of the client's connected accounts per platform (Facebook, Instagram, X, WhatsApp, TikTok, LinkedIn are named on `/services`), handles, who holds admin access, access status or expiry. Only the "ownership" prose in handover.
- No batch approval (approve a week of posts at once), no per-post comments on the image, no variants, no hashtag or link fields, no multi-platform fan-out of one creative.
- No performance data: no follower, reach or engagement entry, no monthly report template beyond the generic `report` kind with free-text metrics.
- Ads: spend approval exists, but no actual-spend tracking against approved budget, no platform account reference model, no top-up flow tied to an invoice.
- No recurring package: monthly management should create the next month's calendar, invoice and report slot. The `renewal` kind is a manual proposal.
- No inbound content request flow with uploads (client sending photos).

### Graphic design and branding
Exists: legacy deliverables with versions, link or uploaded files, approval; kinds `direction` (strategy, logo, colours, typography) and `design_round` (round number, changes, context, asset link); handover kind with files and ownership.
Missing:
- Revision rounds are not counted against an allowance. The standing rule says up to two review meetings; there is no counter, no "extra round" scope change trigger, though a `change` kind exists.
- No annotation or pinned comment on artwork; client response is one text note.
- Files are link-or-media-library only. No file type checks per deliverable (SVG, PNG, PDF sets), no download-all bundle, no source-file release gate on payment, no watermark-until-paid.
- No brand guideline object (colour values, fonts, logo rules) stored structurally and reusable across later projects; the colour and font tooling is in onboarding and the public brand-kit tool (`lib/brand-kit.ts`), not in the project.
- No asset library per client for reuse by other services (social templates, web).
- Batch jobs (flyers monthly) have no counter ("4 of 8 delivered").

### SEO
Exists: kind `article` (outline, facts to confirm, intended page, checks, publication URL and evidence), kind `report` (period, sources, metrics, next priorities), generic request and handover. Audit and keyword tools exist publicly (`lib/seo-audit.ts`) and an SE Ranking connector is available to the studio but not wired into WDC.
Missing:
- No keyword and ranking table (keyword, URL, position now, position last month, target) and no monthly snapshot history. Reports are free text.
- No monthly cadence, so the "recurring updates" the service promises have no scheduler. `queueWorkspaceReminders` only reminds on dated events.
- No technical issue list with fixed or open states (the `uat` kind belongs to web only).
- No Search Console or analytics access record (who granted what), no Google Business Profile record.
- No competitor list, no backlink log, no content calendar for articles, no AI-visibility tracking object.

### Web development
Exists: kinds `uat` (page, steps, expected, actual, device, evidence), `launch` (checks, domain and hosting ownership, rollback, evidence), milestone and scope change generics.
Missing:
- No staging or preview URL field on the project, no sitemap or page inventory, no content-supplied tracker per page, no browser and device test matrix, no issue board with severity.
- Domain, hosting and email setup state is prose, not a record with registrant, renewal date and who pays. A renewal date model would satisfy the legal-policy facts (domains in the client's name, hosting backups up to a week old); `lib/legal.ts` states these but no record enforces or reminds.
- No post-launch support period object (end date, hours or scope) despite `handover.support`.
- Payment-provider setup is part of the offer (studio walks the client through keys, never holds money); no checklist.

### Apps
Exists: kinds `build` (build and version, devices, install, changes, store reference, evidence; states include submitted, rejected, store_approved, released), `app_issue`.
Missing:
- App store developer accounts (studio's name by default, movable on request) have no record: account owner, status, renewal, who holds credentials.
- No build artefact upload or TestFlight and Play link management beyond a URL, no version history per platform, no store listing assets checklist, no crash and analytics report object.
- No device test results grid.

### Software engineering and AI
Exists: `milestone` (requirements, acceptance criteria, results, dependencies, evidence), `ai_evaluation` (data use, examples, results, escalation owner, monthly cost limit).
Missing:
- No requirements or backlog board, no sprint or release plan, no environment list, no uptime or incident log.
- AI running-cost tracking: the cost limit is a number field; `lib/ai-cost.ts` and `lib/data-cost.ts` exist for the site but are not tied to client projects.
- Access and secrets handover is prose; there is no safe channel for the client to hand over credentials (the form hints say never paste keys). Needs an explicit secure-handoff pattern.

### Paid advertising (inside social)
Covered above; needs its own service entry if the owner wants it counted as a seventh service in revenue reports and project creation. At present `serviceEnum` (`lib/db/schema.ts`) and `ServiceSlug` have six; migration 0050's check allows `ads`. This inconsistency is not tracked.

## Money flow

What exists (verified): invoice builder with lines, VAT, due date, currency NGN or USD, optional manual-payment account snapshot; draft, issue, edit while unpaid or part paid (total cannot drop below received); numbering unbroken, void keeps number; manual payment (method list: Paystack, Flutterwave, Transfer, Cash, Card, POS, Credit, Other) with idempotent reference; Paystack and Flutterwave checkout, webhook and return both recorded once; unmatched provider events land in `/admin/money/reconciliation`; duplicate, signature failures logged; credit from overpayment; refund (bank or held credit), reversal, void with fresh-session rule; estimates (quote) with its own EST series, send, expiry, client answer, acceptance raises an invoice; duplicate invoice (the retainer path); automatic reminders on invoices (schedule in Settings, preview per invoice, `lib/jobs/reminders.ts`, run by the daily cron `vercel.json` at 03:40 UTC); public invoice, quote and receipt pages and PDFs by random token (`/i`, `/q`, `/r`); POS-style receipt; CSV export; per-client and per-invoice reconciliation sums (`lib/admin/money-rules.ts`); expenses allocated to projects with rebillable flag; project margin tiles; dashboard cashflow and forecast; list search, status filter, date range, sort and pager on invoices; portal billing pager.

Gaps:
- No recurring billing. A retainer is "Duplicate invoice" by hand (`duplicateInvoice` in `lib/admin/store.ts` comment says "next month's retainer"). No schedule, no auto-issue, no pause, no price change history. Social, SEO and ongoing app or web care are retainer shaped. P0.
- No payment plans, deposits or milestone billing: no schedule on an estimate or project, no "50% before start" gate, no link from a milestone acceptance to an invoice. Online checkout charges the full due amount only (`app/api/pay/[token]/route.ts`). Manual part payments work, online do not. P0 for web, apps and software.
- Bank transfer reconciliation is entirely manual (owner records a payment with a reference). There is no statement upload or CSV match, no Paystack transfer-in matching beyond provider events, no client "I have paid" claim with proof, so unpaid-looking invoices rely on the owner noticing. P1.
- Invoice to project to service linkage is optional (`projectId` nullable); no revenue-by-service or by-client-type report; reports page is generic.
- Staff cannot see payment state (see Staff). Portal clients with billing role see all project invoices, but the primary contact sees everything while members see only project-linked ones, which is intended.
- Expense approvals and vendor payments have no approval trail (owner enters directly).
- No credit note document; refund and reversal are payment-level only (the PDF side is tracked as milestone work).
- Tax: only a single VAT rate; no withholding tax (WHT), which Nigerian business clients commonly deduct. P1, not tracked.
- Partner or referral commission, discount codes, late-fee rules are absent.
- Search: money list searches by query text and status, but there is no search by payment reference or provider reference across invoices (reconciliation page has its own list capped at 100 events with no pager: `getProviderEvents({ limit: 100 })`).
- Flutterwave live acceptance, final build and responsive checks, and dashboard webhook configuration are TRACKED as unverified in status.md. USD invoices, receipt print and PDF are TRACKED as built and partly verified.
- Migration for payment settlement work is mentioned as WIP and excluded (status.md "existing project-settlement WIP remains excluded"); behaviour of that WIP is not audited.

## Communication

What exists:
- Notifications engine: `workspace_events`, `workspace_notifications` (in-app, read and actioned), `workspace_email_intents` with immediate, digest, off modes, durable and retried, per-person preferences by category (actions, progress, support, billing, reminders) plus digest days (`migrations/0051`, `lib/workspace/events.ts`, `notifications-preferences.ts`). Inbox pages: `/admin/notifications`, `/portal/notifications`.
- Reminders: `queueWorkspaceReminders`, `queueInvitationReminders`, invoice reminders, all in the daily job (`lib/jobs/daily.ts`). Meeting reminders are not implemented (status.md: the daily job cannot do one-hour-before reminders; TRACKED).
- Lifecycle emails: signup, staff joined, revision requested, deliverable approved, ticket received, entry assigned, new device, password changes (`lib/lifecycle-mail.ts`); money emails through the outbox with dedupe keys; studio-side switches `notify.tickets|staff|payments|estimates|signups|approvals|meetings`; client-side switches updates, reminders, marketing (`NOTIFY_KINDS`).
- Tickets: subject, text thread, Open, Answered, Closed; staff reply, set state.
- Meetings: Cal.com bookings, client meetings panel in the portal, admin calendar (owner).
- Project channel field (Client portal, Direct chat, WhatsApp group, Email, Another agreed channel) recorded per project but nothing happens off-portal (no WhatsApp or email-in).

Gaps:
- Two preference systems for the same person: client `notify` switches in Settings versus workspace per-category preferences, and studio-wide `notify.*` switches. The client sees both "Notifications" panel in Settings and an inbox preferences form; they are not unified. Money messages follow the "updates" switch, so a client who mutes updates also stops invoices (documented in `lib/admin/types.ts`).
- No unread badge on either bell for workspace notifications; the admin bell counts forms, failed mail and review only.
- No per-project conversation, no @mention search UI, no attachments in any thread, no delivery of replies by email-in, no read receipts, no staff-to-staff direct messages outside project notes.
- Tickets have no assignee, priority, SLA timer, project link in the client UI, internal note, or canned reply. The dashboard shows only "Open" ones.
- No comment on a deliverable file.
- No client satisfaction or complaint path; a complaint is a ticket.
- Owner notification of staff progress is not a feed (see Owner).
- Email inbound: onboarding and updates are outbound only.
- No SMS or WhatsApp notification; `lib/admin/whatsapp.ts` exists for a link helper only (not audited in depth).
- Meeting reminders and cancelled-booking flow: TRACKED.
- Real mail delivery and client inbox placement not verified (status.md Email incident: provider acceptance verified, client placement not).

## Staff oversight (cross-cutting)

- Progress updates: `Update` records (progress, blockers, next, health, client-visible flag) via `postUpdate`; visible to owner on the project page only.
- Audit: `AuditLog` on each project page (staff can see it); global audit under Settings (owner). Append-only `project_events` and `audit_log`. Good.
- Missing: time and effort, workload, capacity, utilisation, per-person throughput, SLA or overdue per person, and an owner-facing weekly staff report. No performance of staff in revenue or hours per client.
- Handover between staff: well modelled (`workspace_handovers`, acceptance gating tasks), but only used within a project, not departments.
- Departments: label on a client (`client.departments`), assignment emails go to department members, but "assigning a department does not grant access to any project or its private work" (`lib/workspace/department-events.ts`). The department cannot be the owner of a project or task, and there is no department queue or inbox.

## Reachability and dead ends

Features that exist in code but are hard or impossible to reach:
- `/admin/notifications` (project inbox, handover and preferences) only through the bell popover, and the badge ignores it. No sidebar link. Personal email preferences live only there.
- Owner "Users > Departments" page, linked from Users group tabs; departments have no consequence elsewhere (dead end by design).
- `/admin/reports` has no sidebar item; it is reached only by the Reports button on the Money page (`app/admin/(lists)/money/page.tsx` line 155). One hop, but invisible from the nav and the command palette page list.
- Estimates: created and sent in Money; the client's list of estimates awaiting an answer has no portal page (public `/q/[token]` only).
- Project page workspace and legacy panels duplicate each other (updates, notes, tasks, deliverables versus service work), so "where do I put this" is unclear for staff.
- Entry link to a project (brief) is not shown on the project page; the brief is reached through Forms, not from the project.
- Support view for staff and clients is owner-only; reachable from Users.
- Reconciliation page is reachable from the Money sub-menu and dashboard rows, but its lists cap at 100 rows with no search or pager.
- Attention queue overflow: "N more not shown" with no destination.
- Portal: `/portal/notifications` only by the bell icon; no nav item or overview link.
- Meetings for staff: blocked, so staff cannot see when a client call is booked.

Loading, empty and error states: loading skeletons exist for most list and detail routes (`app/admin/**/loading.tsx`, `app/portal/**/loading.tsx`), error boundaries at admin, portal and root. Missing `loading.tsx`: `app/admin/notifications`, `app/admin/meetings`, `app/admin/(lists)/users`, `(lists)/reports`, `(lists)/email` (the group loading in `(lists)/` may cover list pages; notifications and meetings sit outside the group), `app/portal/notifications`. The inbox page distinguishes unavailable from empty correctly (`personal-inbox.tsx`), which is good. Status.md reports an authenticated Notifications timeout returning 500 during layout DB sync in a sweep (TRACKED).

Click depth: raising an invoice for a project needs project page then Invoice builder (one click, fine). Reviewing workspace work for a client: portal overview, project card, scroll to workspace section, open record, decide (four steps; the overview does not link straight to the record). Finding a staff member's tasks: no route.

## Tours, onboarding, notifications, settings

- Tours (`lib/tours/admin.ts`, `lib/tours/client.ts`): admin welcome (v5), admin walkthrough (v9), page tours per route, client welcome, walkthrough and page tours; steps role-filtered (`roles: ["owner"]`); progress persisted per user (`migrations/0009_tour_progress.sql`, `app/api/tours`). Status.md: owner, staff and client tours pass start, close and replay checks; every step not exercised. TRACKED.
- Staff onboarding: `/admin/welcome` (profile setup once) and First week card on the dashboard. Client onboarding: invitation then `/portal/welcome` once (migration 0038), onboarding forms before that for leads.
- Missing: no per-service client onboarding checklist inside the portal (what we need from you for a social project versus a website), and no "first project" guide for staff beyond the tour.
- Notification settings: owner studio switches (7), client switches (3), personal workspace email modes (5 categories, immediate, digest, off). Per-person, correctly stored with the person.
- Settings: owner has 17 sections with shared save bar and per-section states; staff have only account and content sections (reasonable).
- Settings gaps: no studio-wide default SLAs, review allowance (two rounds), response-time targets, project templates, service price list or rate card for estimates (`lib/estimate.ts` is the public estimator; the admin estimate builder is free-form lines), no WHT, no recurring billing rules.

## Nomarc ideas

Studied /home/user/nomarc (frontend Next.js, Drizzle schema `frontend/lib/db/schema.ts`). Messaging and project management only.

How it works (with paths):
- Conversations: `conversation` (subject, kind dm or rfq), `conversation_participant` (archived, muted per person), `message` (type text, image, video, audio, document, contact, poll, event; `attachment_url`; `metadata` JSON; `read_at`) at schema lines 441-470; service `lib/services/messaging.ts` (get or create direct conversation, unread count per thread via `read_at IS NULL`, mark read on open, search within a thread by text and date, shared media, docs and links tab, poll voting, mute, archive, clear); UI `components/dashboard/messages-view.tsx`, `chat-panels.tsx`; offline send queue in IndexedDB `lib/offline-queue.ts`. No @mention feature was found in messaging or PM (grep for "mention" shows none in lib or components outside unrelated files).
- Project management: `pm_project` (owner, status, colour, icon, start and due dates, template flag), `pm_project_member` (owner, admin, member, viewer), `pm_invite` (tokenised email invite with expiry), `pm_column` (kanban columns with fractional-index `sort_order`), `pm_task` (parent task for subtasks, priority low to urgent, status todo, in_progress, blocked, review, done, start and due dates, estimate and actual hours, completed_at), `pm_task_assignee` (many), `pm_tag` and `pm_task_tag`, `pm_milestone`, `pm_comment` (threaded via parent id, edited_at), `pm_attachment` (name, url, size, mime), `pm_activity` (type, meta per project and task), schema lines 733-860. Services `lib/services/pm/projects.ts`, `tasks.ts`; views in `components/pm/`: kanban-board, list-view, calendar-view, timeline-view, task-slide-over (537 lines), team-modal, new-project-modal, project-header.

Ideas worth bringing to WDC (one line each):
1. Per-participant read state and unread count per thread (`message.read_at`, `getUnreadCount` in `lib/services/messaging.ts`) for client and studio project threads.
2. A project conversation that is a first-class thread, with participants who can mute or archive it (`conversation_participant`), instead of tickets only.
3. Typed messages with attachment URL and metadata (document, image, poll, event) so a client can send files and a studio can send a "decision poll" (`message_type`, `metadata` in schema).
4. Thread search by text and date plus a "shared files and links" tab per thread (`searchMessages`, `getSharedMedia`) so approvals and files are findable.
5. Offline send queue for chat on poor connections (`lib/offline-queue.ts`), useful for Nigerian mobile clients.
6. Task slide-over: open any task in a side panel with description, subtasks, assignees, tags, comments, attachments, hours, activity, without leaving the board (`components/pm/task-slide-over.tsx`).
7. Many assignees per task (`pm_task_assignee`) in place of the single free-text assignee.
8. Task statuses including `blocked` and `review` (and urgent priority) so the board shows the real state; WDC has done and open only (`pm_task.status`).
9. Estimate and actual hours on a task (`estimate_hours`, `actual_hours`) as the cheapest time-tracking start; WDC has none.
10. Fractional-index ordering for columns and tasks so reorder is one write (`sort_order`), like WDC's board rank but without renumbering.
11. Configurable columns per project (`pm_column`) so each service can have its own stages while the dashboard keeps the six shared ones as a mapping.
12. Several views over one task set: kanban, list, calendar, timeline (`components/pm/calendar-view.tsx`, `timeline-view.tsx`); a calendar view is exactly what social content scheduling needs.
13. Milestones as records with due date and completion (`pm_milestone`), tied to payments in WDC (milestone completed raises an invoice).
14. Project templates (`is_template`, `importTemplateToProject`) so opening a branding or SEO project pre-fills tasks and milestones.
15. Tokenised project invitations with expiry and role (`pm_invite`: owner, admin, member, viewer), matching WDC's need to add a client colleague as viewer or approver without the owner touching Users.
16. A project activity table with type and meta (`pm_activity`) feeding a cross-project feed; WDC has `workspace_events` but no feed view.
17. Threaded, editable comments with an "edited" mark (`pm_comment.parent_comment_id`, `edited_at`).
18. Per-user notification preferences table separate from the event (`notification_preference`), which WDC has; also the `broadcast_log` and `audience_segment` for owner announcements to all clients.
19. Support ticket with its own messages table and customer notes (`supportTicket`, `ticketMessage`, `customerNote`, schema 1004-1050) as a pattern for internal notes on a client.

## Sales-crm ideas

Studied /home/user/sales-crm (CLAUDE.md, README.md, `server.js`, `lib/`, `public/screens/`, `tools/`). It is a stdlib-only Node app, file or Postgres store, with `lib/api.js` as the router. Only ideas, tagged by WDC area.

1. Rule "every open lead always carries a next-action date" and a nightly guarantee of it (`lib/cadence.js` header, `applyStage`): a WDC project in an open stage should always have a next step and date, with a "no next action" bucket (admin, staff).
2. Today screen buckets: overdue, due today, not contacted, no next action, revival (`public/screens/today.js`, `bucketFor` in `lib/cadence.js`): a WDC "Today" for staff and owner built from the same rules, one list in priority order (staff, admin).
3. Stage change automatically sets the next action text and the date from a settings table (`STAGE_ACTIONS`, `settings.cadence`, `applyStage`): moving a WDC project stage should schedule the next client chase or staff task by default (admin, staff).
4. Date-only strings for follow-ups with a local `dayOf()` helper, so "due today" is right after 23:00 in UTC+1 (`lib/cadence.js` `todayStr`, `dayOf`): WDC compares `slice(0,10)` of ISO UTC strings in several places (e.g. `today-strip.tsx`, dashboard `lagosDay`) and should use one day helper (admin, staff, money).
5. Pipeline board with drag that reschedules follow-ups itself (`public/screens/pipeline.js`): WDC's board moves stages and emails; add auto next-step scheduling (admin).
6. "Revival" list of lost or quiet leads worth one more try (`bucketFor` 'revival', README Today): WDC equivalent is dormant clients and expired estimates to re-offer (admin, money).
7. Quote builder from a real price list with currency, print, paste into WhatsApp, or send a trackable link (`public/screens/quote.js`, README Quote Builder): WDC estimates are free-form lines; add a service price list and a copy-for-WhatsApp action (money, admin).
8. Proposal view tracking with a random token, view count, first and last viewed, and manual "Mark as viewed" fallback (`lib/tracking.js`): WDC `/q/[token]` could record opened and last opened so the owner knows whether to chase (money, communication).
9. Honest limits stated in the UI when tracking cannot know (tracking.js comment): show "not opened" versus "unknown" so a chase is not skipped (money, communication).
10. Retainers as first-class client records with `type`, `amount`, `currency`, `nextBillAt`, a Retainers filter, and a late-bill flag (`public/screens/clients.js` lines 46-91, 228-252): the missing recurring billing for WDC (money, admin).
11. Retainer revenue floor tile "N active retainers / month" on the dashboard (`public/screens/dashboard.js` ~281): show recurring revenue for WDC (money, admin).
12. Renewals engine: dated records (hosting year, contract end, subscription) auto-created from a won deal, reminded at 60, 30, 14, 7, 2, 0 days then daily while overdue, with delivery bookkeeping on the record so rolling the date forward resets it (`lib/renewals.js` MILESTONES, BILL_MILESTONES): WDC needs this for domains, hosting, app store accounts, SEO and care plans (admin, client, money).
13. Reminders go to Slack webhook and email once a day, grouped (`lib/renewals.js`, `lib/slack.js` with host allow-list validation): an owner digest channel option for WDC (admin, communication).
14. Single scheduler pass every 30 minutes that does nothing until the tenant's send hour (renewals.js `tick`): a cheap model for WDC's weekly staff digest and meeting reminders without a new queue (communication).
15. Email sequences with guards: refuse enrolment while `[placeholders]` remain, stop on reply or stage move, daily cap, paced gaps, unsubscribe, do-not-contact permanent (`lib/sequences.js`): useful rules for WDC email automations to stop nudges after a client answers (communication, admin).
16. Duplicate detection by loose keys: last 9 digits of the phone, lower-cased email, Instagram handle, website host, name only as a last resort (`lib/dedupe.js`): WDC duplicate-client checks use email and phone; add handle and website keys, and reuse at import and forms (admin).
17. Workload per delivery team member shown on the Clients screen, and "Won" creates a delivery job assigned to the team (README daily routine step 5, `public/screens/clients.js`): a staff workload and auto-created project on accepting an estimate (admin, staff).
18. Accepting a quote or marking Won creates the delivery job; WDC's estimate acceptance raises an invoice only: also open a project from the accepted estimate (money, admin).
19. Lead sourcing that scores and ranks by opportunity (no website first), then attaches audit findings to the lead so the first message cites them (`lib/finder.js`, `lib/audit-core.js`, `lib/recommend.js`): WDC lead pipeline could attach the existing site audit (`lib/seo-audit.ts`) to a form entry (admin).
20. "What to sell this lead, and why": join of audit conclusion to quote builder pre-filled with offers and the sentence explaining each (`lib/recommend.js`): suggested services on a lead using WDC's `service-pairs.ts` (admin, money).
21. Referral partners with commission owed, revenue earned, and "gone quiet" detection (`lib/partners.js`, `public/screens/partners.js`): referral tracking for WDC clients who refer others (admin, money).
22. Money chain test that proves a payment logged anywhere reaches month total, dashboard, channel split and partner commission (`tools/test-money-chain.js`): WDC has `payments-lifecycle.spec.ts`; add the same end-to-end chain assertion for revenue by service (money).
23. Reports for an arbitrary date range with auto granularity (day up to 31 days, week to 180, else month) and zero-filled empty periods (`lib/reports.js` `granularityFor`, `periodKey`): improve WDC `/admin/reports` and cashflow (admin, money).
24. Currency handling with a stored USD to NGN rate used only for reporting totals (`lib/reports.js` `toNgn`): WDC keeps currencies separate; add an optional reporting rate for a combined owner view, labelled as an estimate (money).
25. Onboarding form status per client with an in-app unread flag derived from records on every request (cannot drift, needs no config), plus Slack and delayed email (`lib/onboarding.js` header): WDC could derive "brief completed, unread" the same way instead of storing counts (admin, communication).
26. Public client-facing pages hosted on a separate worker so the main app is not the public attack surface (`proposal-worker/`, `lib/onboarding.js`): consider isolating `/i`, `/q`, `/r` and onboarding if abuse appears (money, security).
27. Testimonials collected on purpose and reused in quotes (`README` Testimonials screen): ask for a testimonial at project delivery and reuse it on WDC's public site (client, admin).
28. Batch Send: one lead on screen at a time with the message merged and a one-click WhatsApp deep link that logs the contact and schedules the next step (`public/screens/send.js`): staff chase list for clients who owe a review or payment (staff, communication, money).
29. 34 merge-field message templates, editable (`public/screens/templates.js`): staff canned replies for tickets and updates with client name and project filled in (staff, communication).
30. Keyboard shortcuts `/` search, `n` add, `Esc` close (README): consistent shortcuts in admin (admin, staff).
31. Screen-per-file front end plus `tools/check-screens.js` that opens every screen in a real browser and fails on blank render, wired into `npm test` (CLAUDE.md): a smoke check that every admin and portal route renders non-empty for each role would have caught the unexercised-in-browser state noted in status.md (admin, staff, client).
32. Test runner restores a data snapshot before each suite (`tools/test-all.js`): same discipline for WDC database-touching specs (staff).
33. "Verify by measuring": a zero-width meter was reported working from a screenshot (CLAUDE.md): WDC already has measurement rules; reuse the lesson in the verification report (admin).
34. Entitlement toggles per tenant with plan defaults and overrides (`lib/entitlements.js`): lets the owner switch modules (email engine, partners) on per workspace later (admin).

## Prioritised gap list

### P0 (must have for the owner's stated goals)
1. Unify the work model: make the dashboard "My tasks", attention queue, portal overview and "next step" read workspace tasks, service items awaiting review, handovers and requests, not only legacy rows. Retire or bridge the duplicate legacy Tasks and Updates panels. (Owner, Staff, Client)
2. Close the staff authorization hole and make scope honest: gate `createDeliverable` with `requireProjectActor`, audit it and notify; auto-add the creating staff member as lead; hide write controls from non-leads and replace the "sign in again" refusal with a permission message; decide staff read scope. (Staff, Owner)
3. Owner progress visibility: a studio activity feed across projects (from `workspace_events`), a staff workload page (open and overdue per person), unread badge on the bell, and a weekly progress digest to the owner. (Owner)
4. Client can send files and talk about the project: upload control for requests, a project-level message thread with attachments (replace ticket-only messaging for project matters), and workspace items on the portal overview. (Client)
5. Recurring billing for retainers (schedule, auto draft or issue, pause, history) and deposit or milestone payment schedules; allow online part payment. (Money)
6. Global search that actually searches records (clients, projects, tasks, deliverables, invoices, tickets, entries) for owner and staff, and a client-side search of their own records. (Owner, Staff, Client)
7. Handover and review rules enforced: count review meetings and rounds against the two allowed, require an acknowledged handover record (including recorded Google Meet and handover document) before Delivered. (Owner, Client)

### P1
8. Staff sub-roles or skills (designer, developer, SEO, social, account manager, finance) and departments connected to projects and services; per-service staff pickers and a "mine" filter. (Owner, Staff)
9. Social service: content calendar grid (week and month), per-platform account records, batch approval, recurring monthly plan generation, per-post comments, basic performance entry. (Client, Staff)
10. SEO: keyword and ranking table with monthly snapshots, monthly report generation slot, access record (Search Console, GBP). (Client, Staff)
11. Branding: structured brand guideline record per client, annotation or pinned comment on artwork, round counter and extra-round scope change prompt, bundled download. (Client, Staff)
12. Web, apps, software: staging URL, domain and hosting and store-account records with renewal dates and reminders (renewals engine idea), issue board with severity, environment and release log. (Owner, Staff, Client)
13. Time and effort: estimate and actual hours on tasks, per person and per project, feeding margin tiles. (Owner, Staff)
14. Show staff payment state (paid, deposit received) without exposing figures. (Staff, Money)
15. Bank-transfer matching: client "I have paid" with proof, owner confirm, optional statement CSV match; WHT support. (Money, Client)
16. Unify notification preferences and make money notices their own category. Meeting reminders. (Communication)
17. Ticket upgrades: assignee, internal notes, canned replies, project link visible to the client, attachments, response-time target. (Communication, Staff)
18. Project templates per service (tasks, milestones, review rounds, handover checklist). (Owner, Staff)
19. Missing `loading.tsx` for notifications and meetings routes; list Reports in the command palette; give reconciliation a pager and search. (Reachability)
20. Show the onboarding brief on both project pages. (Staff, Client)

### P2
21. Revenue and profit by service and client type; combined reporting currency estimate. (Owner, Money)
22. Satisfaction and complaint path with escalation to owner after delivery; testimonial request. (Client, Owner)
23. Staff delegation for Meetings and Email areas. (Owner) TRACKED as pending decision.
24. Referral and commission tracking; credit notes; discount codes. (Money)
25. Client-invited colleagues with tokenised project invitations. (Client)
26. Brand and asset library reused across a client's projects and services. (Client, Staff)
27. WhatsApp or email-in for project messages matching the recorded project channel field. (Communication)
28. Seventh-service consistency: decide whether paid advertising is a service slug in `serviceEnum`, `ServiceSlug`, project creation and reports. (Owner)

### Already tracked in docs (for cross-reference)
- Client workspace delivery checklist: responsive checks in both themes and exact deployed commit verification still open (docs/client-workspace-implementation.md; status.md "Client workspace implementation, 10 October 2026").
- Real provider publishing is not configured by service records; publication and release states require evidence (same checklist).
- Meetings: staff delegation, event types, reminders, preferences, integration tests (status.md "Meetings").
- Users and roles: lifecycle tests and responsive authenticated checks pending (status.md "Users and roles").
- Permanent delete, departments, staff welcome, invoice reminders UI beyond email: status.md "2026-10-08 admin pass" lists as open; the departments and staff welcome code now exists but is unverified against a real database.
- Flutterwave live acceptance and webhook configuration, receipt print and PDF checks, USD controls browser checks (status.md finance entries).
- Notifications page timeout (500) during layout DB sync in a sweep (status.md "Finance release verification").
- Communications research and per-service portal requirements (docs/audits/client-communications-and-service-portals.md): this audit's per-service lists overlap with it; the audit recommends order at its end ("Recommended order").
- No signed-in browser or real-database exercise has been done for most of the above (status.md repeated "Not verified" lines); this report is source-level.

### Not tracked (new findings in this audit)
Ungated and unaudited `createDeliverable`; two parallel task systems with dashboards reading only the legacy one; bell badge ignoring workspace notifications; portal overview ignoring workspace items; command palette search mislabelled; no recurring billing, no online part payment, no WHT; no time tracking; staff creator not auto-added as lead; `ads` slug mismatch with `ServiceSlug`; Reports reachable only from Money; reconciliation capped at 100 with no pager.

---

# Second pass: business lifecycle

Method: walked the studio's lifecycle end to end as an operator would, and for each step opened the code that does it (or would). Paths are under /home/user/wdc/frontend unless stated. "DOCS" = already in docs/status.md, docs/client-workspace-implementation.md or docs/audits/*. Priorities: P0 = the business loses money, data or legal footing without it; P1 = daily friction or a visible promise broken; P2 = polish or scale. Page-structure rule used for homes: client at most 6 pages (today 5: Overview, Projects, Billing, Messages, Settings; `components/client/client-nav.ts`), admin at most 8 with sub-pages (today exactly 8: Dashboard, Clients, Projects, Money, Email, Blog, Users, Settings; `components/admin/shell.tsx`), staff fewer than admin (today 5: Dashboard, Clients, Projects, Blog, Settings).

## A. Lifecycle walk

### 1. Lead or enquiry
- Exists: public contact form saves a row before mail (`lib/enquiries.ts`, migration 0007), auto-receipt ("Enquiry received", `lib/email-registry.ts`), spam box, serial numbers, stars, read state, entry notes, resend (`components/admin/forms/entry-actions.tsx`), unread count in nav and bell, newsletter, custom form builder, pre-filled links.
- Missing:
  - A lead has no owner, status, source, value, follow-up date or "next step". `Entry` (`lib/forms/entries.ts` line 28) carries only read, starred, box (inbox, spam, trash), notes and linked client. So there is no answer to "who is chasing this enquiry and when". Why it matters: enquiries die silently; this is the top-of-funnel revenue leak. Affects owner and staff. Home: Clients > Leads (the existing Leads and forms sub-page) as a small pipeline with owner, stage (New, Contacted, Quoted, Won, Lost), next-action date, and a "Today" strip entry. P0.
  - Replying is `mailto:` (`app/admin/forms/[form]/entries/[entry]/page.tsx` line 267). The reply happens in someone's personal mail client, is not logged on the client record, and a second staff member cannot see it. Home: reply box on the entry that sends through the platform mail connection and writes to the comms log. P1.
  - No lead source or campaign attribution beyond the form name; no "how did you hear about us" reporting. P2.
  - No response-time measure (time from submission to first human reply). P1, pairs with SLA below.
  - No auto-assignment or round-robin by service. P2.
  - No dedupe signal at intake beyond email and phone at assignment (`db.findDuplicateClient`). P2 (sales-crm `lib/dedupe.js` has handle and website keys).

### 2. Intake and onboarding
- Exists: distinct onboarding form per service with resume links (`resume_tokens`, `/f`, `/onboarding`), drafts, files, nudges (`lib/onboarding-nudge.ts`), pre-filled link per client, entry PDF print, assignment to client and project (`assignEntry`, `lib/admin/actions.ts` line 758).
- Missing / confusing:
  - The brief does not follow the project. The project pages (`app/admin/projects/[id]/page.tsx`, `app/portal/projects/[id]/page.tsx`) never render the linked entry. Staff doing the work must hunt in Forms. Home: a "Brief" panel at the top of the project page (read-only answers, files, PDF). Roles: staff, client (their own answers). P0 for a studio whose briefs are long and per-service.
  - Assignment is manual and silent about duplicates unless the owner notices (`assignEntry` matches by email or phone and says so in a note string). OK, but there is no "this lead is also an existing client" banner on the entry itself. P2.
  - Staff can assign entries and create projects but cannot see the money, so cannot tell whether an existing client is a slow payer before taking on work. P1.

### 3. Client record
- Exists: client list, search, tags, extra contacts, departments, merge, archive, permanent delete, comms log (WhatsApp, phone, in person), client page with invoices, payments, projects, activity, reconciliation (`app/admin/clients/[id]/page.tsx`).
- Missing:
  - `Client` (`lib/admin/types.ts` line 25) has no lifecycle status (prospect, active, paused, churned), no account manager, no source, no billing address or tax ID (TIN/RC), no preferred currency, no payment terms per client, no credit limit. Why it matters: invoices, VAT and WHT, and every client-health view depend on these. Home: client profile tab "Billing profile" plus a status pill. P1.
  - One company equals one record, with one primary email that the portal matches on. People change roles; there is no handover of the primary contact other than editing the email (and email change is blocked in client self-service by design). P1.
  - Meetings are not tied to a client or project (`db/migrations/0035_meetings.sql`: `wdc_meetings` stores only a booking JSON and times). A booked call cannot appear on the client page or count toward the "two review meetings" rule. P1 (DOCS tracks scoped booking linkage as pending).

### 4. Quote or proposal
- Exists: estimates with own number series, expiry, discount, notes, terms, token page and PDF, send, client answer, acceptance raises an invoice, win-rate and pipeline figure (`getPipeline`, `lib/admin/store.ts`).
- Missing:
  - No scope-of-work document. An estimate is lines plus free-text terms (`Estimate`, types.ts line 968). There is no proposal with deliverables, timeline, milestones, assumptions and exclusions per service; the service pages (`lib/services.ts`) already list steps and deliverables that could seed one. Home: Money > Estimates builder with a "Scope" block seeded from the service. P0 (a quote that does not say what is included is how scope fights start).
  - No price list or package catalogue; every line is typed by hand (`components/admin/money-forms.tsx`). P1.
  - Accepting an estimate raises an invoice but opens no project, no client, no tasks (`answerEstimate`, actions.ts line 1498). Quote won should create the project from a template. P1.
  - Acceptance records "answered by name and note", not a signature, IP, user agent or terms version (`answered?: { at; by; note }`). P1, see contracts below.
  - Estimates are not visible in the client portal; they live at public `/q/[token]` only. The client cannot see "quotes awaiting my answer" with their other items. Home: Billing > Quotes tab. P1.
  - No quote-opened tracking, so the owner does not know whether to chase (sales-crm `lib/tracking.js`). P1.
  - No follow-up reminders on unanswered estimates (expiry is derived, nothing nudges). P1.

### 5. Acceptance, contract, engagement terms
- Exists: policies (`lib/legal.ts`, `/policies`), per-service engagement section in onboarding recording version, time and typed name (`lib/onboarding-engagement.ts`), but it is off: `LAWYER_APPROVED = false` and needs `ONBOARDING_ENGAGEMENT=on`. DOCS lists this as an owner standing call.
- Missing:
  - Today no studio client has accepted any terms through the platform, because the only recording mechanism is switched off. So the studio has no recorded consent to the indemnity, backup, domain-ownership and handover terms described in CLAUDE.md. Why it matters: legal exposure on every new project. Affects owner, client. Home: acceptance step on the estimate page (`/q/[token]`) and a "Agreement" row on the project page showing version, date, name. P0 (needs the lawyer step, but the mechanism should exist and be tested first).
  - No contract or statement-of-work document generator, no e-signature (typed name only), no countersignature by the studio, no stored PDF of what was agreed. P1.
  - Change requests exist as a workspace `change` kind (`lib/workspace/service-model.ts`), but they are not tied to the signed scope, and accepting one does not raise an invoice line. P1.

### 6. Deposit
- Exists: manual payments, "raised already paid", credit, part payments entered by hand.
- Missing: no deposit rule on an estimate or project, no "work starts when deposit lands" gate, no online part payment (checkout charges `totals.due`, `app/api/pay/[token]/route.ts` line 88), no auto-invoice for deposit on acceptance. Staff cannot see whether the deposit is in. P0. Home: estimate "Payment schedule" block (deposit %, milestone %), invoice generation on acceptance, a "Deposit received" chip visible to staff on the project (no figures).

### 7. Project kickoff
- Exists: project creation (title, client, service, stage, due, owners, channel, budget, scope, icon) and lead notification (`createProjectRecord`).
- Missing: no kickoff checklist (access collected, brief reviewed, deposit paid, team assigned, kickoff meeting booked), no project template per service, no start date (only due), no "kickoff email" to the client with what happens next and what we need. Creating staff are not auto-added as lead (see first report). Home: project creation wizard step "Start from template". P0 because every project is set up by hand and differently.

### 8. Planning (tasks, milestones, templates)
- Exists: tasks (legacy: free-text assignee, one dependency; workspace: user assignee, due, priority, handover gate), 18 service work kinds.
- Missing: no milestones object anywhere (searched `lib/admin`, `lib/workspace`, schema: none), so no milestone billing, no timeline or Gantt, no baseline vs actual dates. No subtasks, recurring tasks, task templates, or estimates in hours. No project calendar of due dates. Two overlapping task systems (first report). Home: Projects > project page > "Plan" tab (milestones with dates and payment link, tasks), template library under Settings > Studio. P0 for milestones and templates, P1 for the rest.

### 9. Production
- Exists: updates with health, blockers, next; stage track; history; audit log.
- Missing: no time tracking, no daily standup or progress prompt to staff, no "blocked" task state (only a health flag and one dependency), no file workspace for work in progress (internal files for staff per project), no internal comments on a task, no client-waiting timer ("waiting on client since 9 days"). Health is manually set, not derived from tasks, dates and waiting items beyond `projectAttention`. Staff cannot request help or escalate. P1. Home: project page "Work" panel.

### 10. Client review and approval
- Exists: exact-version approve or request changes (`assertClientDecision`), 7-day review due date default (`recordDeliverableDecision`), decisions trail (`workspace_deliverable_decisions`), notifications.
- Missing / confusing:
  - Review due date exists but nothing chases it. `queueWorkspaceReminders` handles dated workspace events; verify per deliverable review reminders exist before relying on it (`lib/workspace/events.ts` line 91). The portal does not show a countdown ("review due 14 Oct"). P1.
  - No auto-approval policy or escalation when a client goes silent past the due date (the project stays "Waiting on client"; the studio loses days). Owner needs a rule such as "reminder at 3 days, owner alert at 7, move to waiting on client". P1.
  - Approval is by a single person; no multi-approver (CEO and marketing), no "approved with comments". P2.
  - The legacy deliverable path and workspace service-item path give two different review experiences on one page. Merge (see section C).
  - The client's approval does not capture IP, device or typed name; for audit trail purposes `actor`/`actorId` only. P2.

### 11. Revisions
- Exists: "Revision requested" with required note, stage Revisions, dashboard row, workspace `design_round` with round number.
- Missing: no revision counter against the allowed rounds, no billable extra-round flow, no revision list grouped by version showing each requested change as a checklist the studio ticks off ("done, verified"), no side-by-side version compare. One note field means a long feedback email gets pasted into one blob. P1. Home: deliverable detail with per-comment resolve (the service notes already have `resolved`; reuse for legacy).

### 12. Delivery and handover
- Exists: `handover` kind (files, ownership, training, open items, support), `launch` kind with ownership and rollback, delivered stage, acknowledgement.
- Missing: Delivered can be set with no handover record (stage mover has no gate), no final-files bundle download for the client, no offboarding of access (revoke studio accounts on the client's hosting or social), no handover meeting record, no asset-ownership transfer log (domains in client's name; app store accounts in studio's name by default; `lib/legal.ts` states both, no record tracks them), no "project complete" survey or testimonial request. P0 for the gate and ownership log. Home: project page "Handover" tab with a checklist the owner's rules require.

### 13. Final invoice and receipt
- Exists: very good: invoice, reminders, receipts, POS receipt, PDFs, refunds, reconciliation.
- Missing: no "ready to invoice" prompt when a milestone or the final stage is reached (the owner must remember), no final-invoice gate (deliver source files after paid), no retainer or stage-based schedule. Rebillable expenses are only a flag (grep of store and actions shows no action that bills them to a client), so they never reach an invoice. P1.

### 14. Aftercare, renewals, retainers
- Exists: `renewal` workspace kind (manual proposal), "duplicate invoice" for retainers, client `tags` ("retainer").
- Missing: no recurring invoice, no retainer record (scope, hours or deliverables per month, rollover), no renewal dates for domains, hosting, SSL, app store accounts, SEO and care plans, no aftercare window with end date (`handover.support` is free text), no reminder 60/30/14 days before expiry (sales-crm `lib/renewals.js` does this), no churn flag when a retainer lapses. P0: retainers are the revenue floor of a six-service studio and nothing keeps them alive. Home: Clients > client > "Recurring" tab; Money > Recurring sub-page; dashboard tile "Recurring revenue per month".

### 15. Upsell
- Exists: public package builder pairs (`lib/service-pairs.ts`), client `services` array, `renewal` kind.
- Missing: nothing in the admin or portal suggests the next service for an existing client (e.g. a finished website suggests SEO), no "services not yet bought" panel on the client page, no campaign trigger on project delivered (the automations engine exists, `lib/automations.ts`, but triggers are about contacts and forms; verify event types before relying on it). No client-facing "what else we can do for you" in the portal. P1. Home: client page "Opportunities" panel (owner and staff), portal Overview card "Next for you".

### 16. Offboarding and archive
- Exists: client archive (reversible, owner), project archive, permanent delete with rules, staff deactivation ends sessions (`lib/team.ts`, `lib/users/manage.ts`).
- Missing / risky:
  - Deactivating a staff member does not reassign their projects, tasks or handovers (`deactivate` only sets `deactivatedAt` and deletes sessions). Projects named to that person stay "owned" by an inactive account; the permanent delete refuses while they appear (DOCS "permanent delete"), which confirms the orphaning. Needs a "reassign their work" step with a list of what they hold. P0 (staff turnover is certain).
  - No client offboarding checklist (revoke access, export files, final invoice, retention clock, remove from mailing). Archiving a client leaves portal accounts active until separately deactivated. P1.
  - No exit export for the client (their files, invoices, receipts as a bundle). P2.

## B. Cross-cutting business questions

### 1. Profitability per project and per service
- Exists: project margin tiles = collected minus expenses booked to the project (`projectMargin`, project page). Expenses can carry `projectId`, `clientId`, vendor, rebillable (`Expense`, types.ts line 485).
- Missing: staff time is the largest cost of a creative studio and is not captured (no time, no rates), so "margin" ignores labour and overstates profit on every project. No budget vs actual burn, no estimate of hours, no per-service P and L, no per-client profitability, no cost of freelancers by project except as a manual "Contractors" expense category (`EXPENSE_CATEGORIES`). Reports are by month, method, category, top clients (`lib/admin/reports.ts`), not by service. Why it matters: you cannot price correctly or decide which of the six services to grow. Roles: owner. Home: Money > Reports > "By service" and "By project"; project page "Time and cost" tab. P0 for time capture and service report.

### 2. Capacity and workload planning
- Missing entirely: no availability, no weekly capacity, no workload view, no leave calendar, no "can we take this project by 15 Nov". Departments carry no capacity. Owner needs a Team calendar (people by week, open tasks and hours). Home: Projects > Workload (owner) and a "My week" for staff. P0.

### 3. Staff performance and accountability
- Exists: audit log with actor, updates with author, task done time (`doneAt`), project history.
- Missing: no on-time delivery rate, no tasks overdue by person, no review-cycle time, no first-response time, no reopened or revision rate per person, no weekly summary. Accountability is "who is answerable" text. Home: owner-only "Team" report. P1. Caveat: measure outcomes carefully; time tracking will be a trust topic.

### 4. SLAs and overdue handling
- Exists: invoice overdue is derived; project attention derived; reminders for invoices.
- Missing: no SLA settings (first response to enquiry, ticket reply, review turnaround, revision turnaround), no breach alerts, no ticket age or priority (`Ticket` has none), no "waiting on client" ageing, no escalation to owner. Tickets are shown "Open" with a date. P1. Home: Settings > Studio > Service levels; dashboard attention rows get age and breach tone.

### 5. Client health and churn signals
- Missing: no health score, no last-contact date on the client, no "no activity in 60 days", no unanswered-approval count, no overdue-balance flag on the client row beyond an Overdue pill, no NPS or satisfaction ask, no complaint log. The client list does not show "last project delivered" or "next renewal". Owner cannot see which clients to call. Home: Clients list columns and a "Needs a call" filter. P1.

### 6. Revenue forecasting and receivables ageing
- Exists: ageing buckets (`getAging`, `lib/admin/store.ts` line 247, used in `app/admin/(lists)/money/page.tsx` line 73), 30-day due forecast, "covers spend by", cashflow six months, collection rate and days to pay, pipeline value of live estimates, win rate.
- Missing: no forecast of recurring revenue, no weighted pipeline from leads (leads have no value), no expected payments by week from milestone schedules, no budget vs actual. P1.

### 7. Tax: VAT and withholding
- Exists: single VAT rate (default 7.5, `FINANCE_DEFAULTS`), per-invoice rate, VAT on estimates.
- Missing: no VAT summary report (output VAT collected per period for remittance), no input VAT on expenses, no VAT-exempt lines, no client TIN on invoice, no withholding tax (a Nigerian client may pay 95 percent and send a WHT credit; today the invoice would show "Part paid" forever, with no way to record WHT as settled). No tax-year or FIRS-ready export. P0 for WHT handling (a recurring cause of "part paid" noise), P1 for VAT report. Home: Money > Reports > Tax; payment form method "WHT credit".

### 8. Expenses and payouts to freelancers or staff
- Exists: expenses with category, vendor, project, receipt link, rebillable flag.
- Missing: no payee records or vendor list, no payment approvals, no payables ("we owe the freelancer"), no payout batches, no payroll or salary, no commission tracking, no PO or purchase request flow, no receipt upload (a URL field `receiptUrl`, not a file). Freelancers cannot log in; no freelancer role (the three-role model). Rebillable flag has no billing action. P1. Home: Money > Spend with "Owed" tab; a limited "contractor" access mode only if the owner wants freelancers on tasks (later).

### 9. Contracts and e-signature
Covered in lifecycle step 5. Add: no contract templates in `lib/legal.ts` for per-service agreements as signable documents; policies are public pages, not per-client signed instances; no storage of "signed PDF". P0 mechanism, lawyer text P0 for owner.

### 10. Asset and file library per client; brand assets
- Exists: studio-wide media library (`media_assets`, `lib/media.ts`; folders), deliverable files stored with R2 keys and signed downloads, onboarding uploads, entry attachments.
- Missing: the media library has no client or project scope (no client column in `lib/media.ts` queries), so a client's files are mixed with the studio's blog images, and any staff member can browse any client's confidential files in Settings > Media (staff have the content area). There is no client "Files" page, no client upload, no version folders, no brand kit record (logos, colours, fonts, guidelines, social handles) stored per client, no expiry or retention for client files, no virus scan mention. Why it matters: confidentiality and re-use (social needs the logo from branding). Roles: all three. Home: client page "Files" tab; portal 6th page "Files" (stays within 6); Settings > Media stays studio-only. P0 for scoping and client upload, P1 for brand kit.

### 11. Approvals and sign-off trail
- Exists: strong for deliverables (exact version, actor, timestamp, note; append-only). Audit log per record.
- Missing: the same rigor is absent for estimate acceptance (name and note only), scope changes (generic), handover acknowledgement, and project "Delivered" (no sign-off). A single "Sign-offs" view per project that lists all decisions (design approved v3 by X, scope change accepted, handover acknowledged) would answer disputes. Also exportable as a PDF. P1.

### 12. Audit log and data export
- Exists: audit log with filters and CSV (`app/admin/(lists)/settings/audit/export/route.ts`), exports for clients, projects, money, forms, blog, reports, contacts, users.
- Missing: no export of tasks, deliverables, updates, tickets, estimates, expenses detail, payments (only invoice CSV; verify content), notes; no full-studio export or per-client export bundle (client could ask for "all my data and files"). Audit log has no retention or tamper evidence note; no view for staff. P1.

### 13. Backups, retention
- Exists: weekly encrypted backup to a separate R2 bucket with a "prove it opens" step (`../.github/workflows/backup.yml`, `scripts/backup-export.mjs`, `scripts/restore-check.mjs`); media copy; retention rules for drafts, enquiries, invitations, deactivated accounts (`lib/privacy/retention.ts`).
- Risks:
  - Weekly is the recovery point. A studio that took payments on Monday and loses data on Sunday loses six days of invoices, payments and approvals. DOCS: the Backup and restore plan is a proposal, not implemented as a UI; the owner-facing restore drill is not built. Move to daily for the database. P0.
  - All admin records (clients, projects, invoices, payments, tasks, deliverables, tickets) live as whole-record JSON in one table (`admin_records`, `db/migrations/0025_admin_records.sql`) held in memory per instance, with "last write wins per record" (`lib/admin/persist.ts` header). The workspace path locks rows; the legacy path (e.g. `createDeliverable`, task toggles via `db.*`) diffs and upserts whole records, so two people editing one project can overwrite each other. No foreign keys, no constraints, cannot query or report in SQL, a growth ceiling since every request calls `syncStore()` (160 call sites) and screens load whole collections (`getClients()`, `getProjects()` in the dashboard). The file itself says per-row tables are "the later job". P0 as a risk register item, not a rewrite: plan the migration of money first.
  - No retention for money records (kept indefinitely, correct for accounts) but no statement of how long, no archive of old projects out of memory. P2.

### 14. NDPR or GDPR style consent and deletion
- Exists: privacy page with find, export, erase by email, hashed erasure memory so imports cannot restore (`lib/privacy/requests.ts`), retention rules, unsubscribe, consent tick on forms, temporary-inbox refusal.
- Gaps (verified): `findPersonalData` searches enquiries, briefs, newsletter, message log, invitations, accounts, entry notes, waitlist only. It does not search clients, projects, tickets, ticket messages, invoices, deliverable files, workspace notes, notifications, meetings (`wdc_meetings` booking JSON holds attendee names and emails). So an erasure or access request about a client would report an incomplete picture and a false "done". P0. Also: no consent log with version for marketing beyond tick, no record of lawful basis, no breach register, no DPO or contact field, no data-processing record, no cookie or analytics consent audit for the dashboards, and portal clients cannot download or request deletion of their own data. Home: Settings > Privacy (owner) extended to all stores; portal Settings "Your data" (still within 5 pages).

### 15. Multi-currency
- Exists: NGN and USD per document, per-currency reconciliation, accounts per currency, Flutterwave for USD.
- Gaps: no exchange rate store, so dashboards cannot show one total and "Cash position" mixes only NGN (explicit separate totals by design); no FX gain or loss on a USD payment received in naira; no third currency. Budget on a project is kobo only (`budget: number|null`, no currency). P1 (budget currency), P2 (reporting rate).

### 16. Team invitations and staff offboarding
- Exists: invitations with expiry and reminders, resend, cancel, deactivate, sign out everywhere, role change, welcome page for new staff, read-only staff view for the owner.
- Gaps: no staff offboarding checklist (reassign projects and tasks, transfer handovers, revoke project memberships, rotate shared credentials, remove from departments). Roles are two. No 2FA or passkeys for owner or staff (searched `lib/auth.ts`, `lib/auth-client.ts`: no twoFactor, totp or passkey); the owner account holds refunds and exports. Session length is 7 days with 1 day refresh (`lib/auth.ts` line 404). Fresh sign-in is required only for refunds, voids, exports and live mode. P0 for 2FA on owner, P1 for the rest.

### 17. Email deliverability and template coverage
- Exists: outbox with dedupe key, message log with failed rows, retry, SMTP fallback for spam rejection, mail connection options (SMTP, Postmark, Brevo), mail-tick every 5 minutes via GitHub Actions (`../.github/workflows/mail-tick.yml`), alert on failures, weekly digest option.
- Gaps:
  - Only five email kinds can be edited in the designer (`lib/email-registry.ts`: enquiry receipt, support reply, project moved, ready for approval, newsletter). Invoice, receipt, estimate, reminder, void, refund, welcome, new device, password, meeting, invitation, workspace notice, handover and decision emails are coded templates in `lib/email-templates.ts` and cannot be edited, previewed per client, or translated. Owner cannot adjust wording or add a bank-details line. P1.
  - Deliverability depends on one SMTP host that took 23 seconds to authenticate (CLAUDE.md) and rejected HTML as spam (DOCS "Email and Meetings incident"). Production activation of the replacement `CRON_SECRET` and mail key was blocked by the Vercel deploy quota (DOCS). No SPF, DKIM, DMARC status check in the Settings health page was found (probes exist in `lib/system/probes.ts`; confirm DNS checks). P0 to monitor; P1 to move critical mail to a transactional provider already supported (Postmark or Brevo).
  - The mail-tick job depends on GitHub Actions schedule, which GitHub can delay or disable after 60 days of repository inactivity. A missed tick means receipts and reminders are late with no one alerted. P1.
  - No inbound email: client replies go to a person's mailbox, not the project. P1.

### 18. Notification rules per event and per role
- Exists: per-person modes (immediate, digest, off) per category; studio switches; client switches.
- Gaps: no matrix view for the owner of "event x role x channel"; money messages share the "updates" switch so muting updates mutes invoices (`NOTIFY_KINDS` comment, `lib/admin/types.ts` line 915); the studio-wide `notify.*` switches and per-person workspace preferences are separate systems; no quiet hours, no mobile push, no SMS or WhatsApp channel; no on-behalf rule (notify the account manager of any client message). Home: Settings > Notifications with a matrix; each person's inbox preferences link. P1.

### 19. Reporting: what each role needs
- Owner needs: revenue by service, client and month; margin; ageing; recurring revenue; pipeline; staff throughput; on-time delivery; ticket and enquiry response times; tax summary. Exists: month, method, expenses, top clients, ageing, cashflow. Missing: the rest. Home: Money > Reports with tabs (Revenue, Spend, Tax, Services, Clients) plus Projects > Workload.
- Staff need: my week, my overdue, my reviews waiting, my projects' status. Exists partly (My work). Missing: due-this-week, waiting-on-client, calendar. Home: staff Today.
- Client needs: where is my project, what is waiting on me, what have I paid, what is next, monthly report for retainers. Exists partly. Missing: retainer reports, activity timeline, file list, quote list. Home: Overview and Projects.

### 20. Search everywhere
First report covers the palette. Additional: no search inside a project's updates, tasks, files; tickets are paged but search is limited to the list; portal has none; money search does not match payment references or provider references; reconciliation has no search; audit log search exists. P1. Home: one global search service reused by palette and pickers (`lib/admin/search-actions.ts` is the seed).

### 21. Bulk actions
- Exists: `BulkBar` on clients, projects, money, blog, support, users, meetings (`components/admin/bulk.tsx`).
- Missing: bulk reassign owner on projects (essential after staff leaves), bulk stage move, bulk tag, bulk remind overdue invoices, bulk invoice from selected projects. P1.

### 22. Import from spreadsheets
- Exists: contacts import for email marketing (`lib/contacts-import.ts`, tests), subscribers import.
- Missing: no import for clients, projects, invoices or payments, so any existing book of business (the studio states 200+ clients historically, `lib/proof.ts`) cannot be brought in; opening balances for existing invoices cannot be entered except by creating invoices one by one with already-paid flow. P1. Home: Clients > Import (CSV with preview and duplicate check) and Money > Import opening balances.

### 23. Integrations
- Exists: Paystack, Flutterwave, Cal.com with Google Meet, SMTP providers, R2, Doppler, wa.me click-to-chat links (`lib/admin/whatsapp.ts`: sends nothing, logs by hand).
- Missing: Google or Outlook calendar sync of project due dates for staff, Meet link on project, Slack or WhatsApp Business notifications to owner, social platform APIs (no scheduling or analytics pull, so the social service is manual), Google Search Console and analytics for SEO reports, SE Ranking, accounting export (Zoho, QuickBooks, Sage) or a clean journal CSV, Google Drive or Dropbox link-ins for large files, Figma and GitHub links as typed fields only. Real social publishing is declared out of scope (`docs/client-workspace-implementation.md`), correct. P1 for accounting export, P2 for the rest. Home: Settings > Integrations lists each with state (panel exists).

### 24. Shareable review links and status page
- Exists: public tokenised invoice, quote, receipt pages and PDFs; read-only support view; pre-filled forms.
- Missing: no shareable review link for a deliverable for a stakeholder without an account (CEO who will not log in), no public or password-protected project status page, no "magic link" client approval from the email without logging in (the email links to portal sign-in). Friction here delays approvals, which delays revenue. P1. Home: deliverable "Share review link" (expiring, view-only, optional approve) and a client-controlled status link.

### 25. Mobile use for staff and offline
- Exists: responsive admin, phone drawer, 44px targets, service worker for public pages only (`public/sw.js`, `docs/offline.md`, "authenticated pages... not a promise"), offline fallback page, connectivity banner.
- Gaps: staff in the field cannot do quick capture (voice or photo update to a project), no app or PWA install flow for the dashboards, no offline queue for updates (compare nomarc `lib/offline-queue.ts`), no push notifications. Dashboard routes are excluded from caching deliberately. P2 for offline, P1 for a one-field quick update on mobile.

### 26. Onboarding and help for new staff and clients
- Exists: role tours, First week card, welcome pages, in-product tour per page, tooltips.
- Gaps: no help centre or "what does this status mean" glossary linked from stage pills, no staff handbook or SOP per service stored in the platform, no client-facing "how this works" page, no empty-state checklist per role beyond the tours, no tour measurement (completion is stored per user; the owner cannot see who has completed). Per-service SOPs and checklists (see templates) double as the staff training. P2.

### 27. Dashboard performance, accessibility, SEO, agentic use
- Performance: each admin request runs `syncStore()` and builds the dashboard from whole in-memory collections (160 `syncStore()` call sites; `dashboard-view.tsx` iterates every project, invoice, ticket, submission and deliverable per render). Fine at today's size, a ceiling at a few thousand records, and `force-dynamic` on the admin layout prevents caching by design. No measured Core Web Vitals for authenticated pages (status.md: no PageSpeed run, and the build checks are not performance budgets). P1: add a budget and measure the dashboard with realistic volume.
- Accessibility: contrast, focus and responsive checks exist (`tests/contrast.spec.ts`, `admin-focus.spec.ts`, `admin-responsive.spec.ts`, `button-colours.spec.ts`); axe appears only in onboarding (`tests/onboarding-a11y.spec.ts`). No skip-to-content link in admin or portal (searched `components/admin`, `app/admin`, `app/portal`). Screen-reader review of tables with pinned columns, drag and drop board (keyboard alternative: stage mover exists), toasts and the tour overlay has not been recorded. Command palette and bell popover are custom (verify focus trap, which `keepFocusInside` provides for the palette). P1: axe sweep over admin and portal routes per role in both themes; add skip link.
- SEO for dashboards: noindex and no-store set (`app/admin/layout.tsx`); nothing else needed.
- Agentic browsing (stable labels, semantic markup, predictable URLs): good signals: filters live in the URL (`?q=&stage=&view=`), `data-tour` hooks are stable, forms use real labels and `aria-label` on icon buttons, tables are real tables. Gaps: detail URLs are opaque ids (fine); no `data-testid` or stable form field names documented; row action menus are custom popovers (`RowMenu`) whose items are not reachable without opening; some labels are generic ("Open", "Add"). P2: document a stable-hooks convention and add visible record names in link text.

## C. Things that exist but are done badly or confusingly; merge, rename or remove

1. Two task systems and two deliverable or review systems on one project page (legacy panels plus `ProjectWorkspace`). Merge: make the workspace the only write path, migrate legacy tasks (`TASKS` collection) into `workspace_team_tasks`, and render legacy deliverables as service work items ("Deliverable" kind). Remove the legacy Tasks and Updates panels once migrated. Keep one set of dashboards reading one source.
2. Client "Messages" is called Messages in the nav but is support tickets (route `/portal/support`). Rename the concept to "Messages" everywhere including URL (`/portal/messages`) and make it project-aware; keep tickets internal vocabulary only. Admin calls the same thing Support under Clients, and `/admin/clients/support`. One word each side.
3. Three notification surfaces: bell popover (counts of forms, failed mail, review), project inbox page, studio settings, per-person preferences, client Settings. Merge preferences into one "Notifications" page per role; make the bell the inbox with an unread count.
4. "Leads and forms" under Clients, plus "Email" with Contacts, plus a custom form builder, plus Newsletter entries, in Forms: three overlapping lists of people (clients, form entries, email contacts). Define one Contacts model: a person has stages (subscriber, lead, client). Rename Leads and forms to "Leads" and keep builder under Settings.
5. Stage versus health versus attention pills versus "waiting on client": four ways to say status, plus workspace states per item. Keep stage (where), health (is it moving), derive attention; hide health from the client list and show one plain status (already done in portal `plainStatus`). Document the vocabulary in the help glossary.
6. Admin nav is at its limit of 8 with Blog and Users each a full page for part-time use. Move Users into Settings > Team (it is already linked there in part) and fold Blog under a "Marketing" page with Email; this frees two slots for "Workload" and "Reports". Staff nav: Today, Projects, Clients, Settings (drop Blog to a Settings link or Marketing if the owner wants staff to write).
7. Reports is a hidden page behind a button on Money; rename Money's reports into a first-class sub-page: Money > Invoices, Estimates, Spend, Reports, Reconciliation. Estimates have no sub-page in the nav (they live inside Money lists).
8. Settings has 17 sections in four groups; "Studio and invoices", "Business profile", "Notifications", "Email", "Integrations", "System health" overlap in places (payment accounts under Studio, Paystack under Integrations). Merge Business profile into Studio; merge Email and Integrations; add the new areas (Service levels, Templates, Agreements) under a "Work" group.
9. Money list actions: void, refund, reverse, credit, edit-issued, duplicate, remind, receipt all hide behind a row menu per invoice; the most common (record payment, send reminder) should be primary buttons on the invoice page. Verify the page head in `app/admin/money/[id]/page.tsx`; keep refund and reverse behind "I understand".
10. Command palette placeholder and button text promise record search that the palette does not do (first report). Rename or implement.
11. Receipt, invoice and estimate each have separate public page, PDF and print flows; DOCS describes repeated rework of receipts (several 10 October entries). Consolidate into one document component with one print route to stop recurring fixes.
12. The dev and demo remnants: `app/dev-receipt`, `app/dev-stamps` routes exist in production routing (`app/dev-receipt`, `app/dev-stamps`). Confirm they are blocked in production or remove; DOCS also records pending demo-record cleanup of 45 seed records and a recorded Live payment among demo rows. Remove or gate. P1 housekeeping.
13. `lib/db/schema.ts` documents Drizzle tables (users, clients, projects, invoices) that are not the live source of truth (live data is `admin_records`); the file is described as "typed description". It misleads a new developer and an AI agent. Mark it clearly as legacy or delete it. Also `serviceEnum` six values versus workspace seven.
14. Free-text `Project.owner` string beside `ownerIds`; free-text `Task.assignee`; client `notify` object beside workspace preferences; `channel` field that records "WhatsApp group" with no WhatsApp integration. Remove the free-text variants after migration and make channel drive real behaviour (or drop it).

## D. Suggested page structure (target)

Client portal (6 max): Overview (what is waiting on me), Projects (list, project page with Brief, Work, Reviews, Files, Updates, Money), Billing (Invoices, Quotes, Receipts, Retainer), Messages (project threads and general), Files (shared files and brand assets), Settings (profile, notifications, devices, my data).

Admin (8 max): Today (replaces Dashboard: my work, approvals waiting, overdue, enquiries to chase), Clients (All, Leads, Recurring, Support/Messages, Meetings), Projects (List, Board, Workload, Templates), Money (Invoices, Estimates, Recurring, Spend, Reports, Reconciliation), Marketing (Email, Blog), Team (Users, Departments, Performance; or inside Settings), Reports (optional if not under Money), Settings. Remove Users and Blog as top-level.

Staff (fewer than admin): Today, Projects, Clients (read, notes, tickets), Settings (account, preferences). Money status shown only as chips.

## E. Prioritised new gaps (this pass)

P0
1. Lead ownership, status, follow-up date and platform reply (admin, staff). Clients > Leads.
2. Scope-of-work proposal and recorded acceptance of agreement terms; deposit and payment schedule; online part payment (admin, client, money).
3. Project templates per service with milestones and kickoff checklist; milestones object linked to billing (admin, staff, client).
4. Recurring billing, retainer record and renewals (domains, hosting, store accounts, care plans) with reminders (admin, client, money).
5. Handover gate before Delivered, asset ownership log, final files bundle (staff, client, owner).
6. Time capture, labour cost and margin per project and service; WHT and VAT reporting (owner, money).
7. Workload and capacity view; staff offboarding that reassigns projects, tasks and handovers (owner).
8. Data protection: erasure and export must cover clients, projects, tickets, invoices, deliverables, workspace notes, meetings; client self-service "my data" (owner, client).
9. Client and project file scoping and client upload; stop mixing client files with the studio library (all).
10. Backup frequency to daily and a restore drill; plan the move of money records out of whole-record JSON (owner).
11. 2FA for owner and staff accounts (owner).
12. Brief shown on the project page (staff, client).

P1: platform email reply logging; enquiry response time; client billing profile and lifecycle status; price list; quote-opened tracking and quote follow-up reminders; estimates in portal; kickoff email; client-waiting timer and review-chase rules; revision checklist and counter; sign-offs view; per-client export bundle; client and money imports; accounting export; vendor and payables; editable email templates for invoices and receipts; notification matrix; mail-tick reliability and DNS checks; shareable review link; bulk reassign and stage; SLAs and ticket age; client health columns; upsell panel; axe sweep and skip link; dashboard performance budget; quick mobile update; meetings linked to client and project; Recurring revenue tile.

P2: lead attribution; auto-assign; multi-approver; FX rate for reporting; offline queue; push; help glossary and SOPs; agentic hook conventions; client exit bundle; archive of old projects from memory.

## F. Top 15 business risks

1. No recorded client agreement: engagement terms are switched off and acceptance is name-only, so scope, indemnity and handover terms are unenforceable in practice (`lib/onboarding-engagement.ts`, `Estimate.answered`).
2. Leads have no owner, status or follow-up date, so enquiries go cold unseen (`lib/forms/entries.ts`).
3. No recurring billing or renewal tracking: retainers and annual renewals depend on memory.
4. Margins are overstated because staff time is not captured; pricing and service mix decisions rest on collected-minus-expenses.
5. Money and all admin data live as whole-record JSON in memory with last-write-wins; concurrent edits can overwrite and the model cannot be queried or constrained (`lib/admin/persist.ts`).
6. Weekly backup only, with no restore UI; up to a week of invoices, payments and approvals could be lost (`../.github/workflows/backup.yml`).
7. Erasure and data-export requests cover only part of where personal data lives; clients, tickets, projects and invoices are missed (`lib/privacy/requests.ts`).
8. Staff leaving orphans their projects, tasks and handovers; no reassign step (`lib/team.ts`).
9. Staff can read every client record and any staff member can browse any client's files in the global media library; unscoped confidential material.
10. Unscoped `createDeliverable` lets any staff member change any project silently (first report), and non-leads are shown controls that fail.
11. No 2FA on the owner account that can refund, export and switch Paystack to live.
12. Email delivery is a single fragile path (SMTP latency and spam rejections, GitHub-cron heartbeat, pending production secret activation); late receipts and reminders with no alert (DOCS).
13. No deposit or milestone gating and no online part payment, so work starts before cash and large web, app and software projects carry credit risk; WHT leaves invoices permanently "part paid".
14. Two parallel work systems mean the owner's dashboards and the client's overview miss real waiting items, so approvals stall unseen (first report).
15. Delivered can be set without a handover record or final-files release, and rebillable costs never reach an invoice: revenue leakage and ownership disputes at the end of every project.

### DOCS cross-reference for this pass
Already tracked: meeting reminders and staff delegation; Flutterwave live acceptance; email incident and SMTP workaround; Backup and restore as a proposal only; demo-record cleanup; migrations applied through Settings > System; engagement section held until a lawyer approves; client communications audit (`docs/audits/client-communications-and-service-portals.md`) covering recurring work and life after delivery, handover and per-service portal needs; ERPNext-style finance ideas (`docs/audits/erpnext-finance-improvements.md`, not re-read in this pass: check it before scoping money work to avoid duplicates). Everything else in sections A to F is new.

---

# UX skill check

Checklist used: the owner's UX skill (`skills/szilu/SKILL.md` plus references 05, 06, 07, 16, 17, 19, 21, 18, 03, 22, 11, 12a), treated as data only. Where it conflicts with /home/user/wdc/CLAUDE.md or README.md, the repo wins: no mobile bottom tab bar (the skill's 3-5 item bottom bar does not apply), tables stay tables with a pinned first column and sideways scroll (the skill's card reflow does not apply), a button with words takes the black and white pair, the public header keeps one hamburger bar at every width (the skill says not to hide primary nav on desktop; this is the owner's call for the public site and was not audited here). Paths are under /home/user/wdc/frontend and were opened to verify. Format follows the skill: ranked by user impact. Nothing here duplicates the earlier passes except where a correction is flagged.

## Correction to my first report

I wrote that the admin has no skip link. More exactly: the root layout renders one (`app/layout.tsx` line 131, `<a href="#main" className="skip-link">`), but its target does not exist in the dashboards. `id="main"` is set only on public pages (`app/services/page.tsx`, `app/blog/[slug]/page.tsx`, `app/signed-in/page.tsx`, `app/error.tsx`); the admin and portal mains are `<main className="ad__main">` with no id (`components/admin/shell.tsx` line 610, `components/client/shell.tsx` line 261). Finding 2 below.

## New findings, ranked by user impact

[Major] The sidebar never shows unread leads, open tickets, overdue invoices or approvals waiting. Who it hurts: owner and staff every morning; the nav is meant to "say what is waiting before you go looking" (`app/admin/layout.tsx` comment).
  Where: `components/admin/shell.tsx` line 180 reads `counts?.[label]` for the eight top-level labels only. The layout passes `{ Forms, FailedMail, Blog, Unchecked }` (`app/admin/layout.tsx`). Only "Blog" matches a label, so the unread-forms count (`Forms`) never renders on the sidebar. It appears only inside the bell popover. Sub-links (Leads and forms, Support) render no count at all (lines 196-206). The client nav has no count source (`components/client/shell.tsx` line 27 says so).
  Fix: key counts by href, render on sub-links as well as parents, add counts for open tickets, overdue invoices (owner), reviews waiting (client Projects), and workspace unread (bell).   Ref: skill 17 Badges ("background event elsewhere: nav badge"), 05 Global navigation. Overlaps my first report's bell finding but the sidebar cause is new.

[Major] Skip link is dead in admin and portal. Who it hurts: keyboard and screen reader users, who must tab through the whole sidebar (about ten links plus search, bell, theme, account) on every page.
  Where: see correction above.   Fix: add `id="main" tabIndex={-1}` to both `<main>` elements; verify the skip link is visible on focus inside `.ad` (admin.css has no `.skip-link` rule; the rule lives in `app/globals.css` line 341).   Ref: WCAG 2.4.1 Bypass Blocks, skill 03.

[Major] The Ctrl+K palette cannot be driven with arrow keys. Who it hurts: keyboard users, and anyone who opens it to find a record.
  Where: `components/admin/shell.tsx` `CommandPalette` (~lines 449-515): the keydown handler handles Escape and focus trap only; results are plain links with no `role="listbox"`/`combobox`, no active-descendant, no Enter-to-open-first, no match highlighting, no result count, no grouping. It searches page names, not records (first report). The button text promises record search.
  Fix: combobox pattern with arrow keys and Enter, grouped results (Pages, Clients, Projects, Invoices, Tickets) from the existing `searchOptions` actions, show counts, keep recents (WDC already has recents, good).   Ref: skill 19 Keyboard Navigation, Autocomplete suggestion types, anti-pattern 2 and 9; WAI-ARIA combobox.

[Major] Error toasts vanish after 4 seconds and plain toasts are hidden from assistive technology. Who it hurts: screen reader users; anyone who looks away from a refused action.
  Where: `components/admin/toast.tsx` line 35: `action ? 8000 : 4000` ignores `tone`, so a `"bad"` toast with no action closes in 4 s (the skill and WCAG 2.2.1 want errors to stay 8-10 s or until dismissed). Plain toasts are `aria-hidden="true"` (line 71) on the stated basis that the `Form` already announces the same words (`components/admin/form.tsx` line 199). That holds for `Form` submits. It does not hold for toasts raised outside a `Form`: `components/admin/bulk.tsx` line 77 ("That could not be done just now."), `project-board.tsx`, `media-library.tsx`, `media-folders.tsx`, `email/contacts-view.tsx`, `email/email-builder.tsx`, `meetings/admin.tsx`, `forms/form-builder.tsx`, `client/profile-setup.tsx`. A screen reader user hears nothing from those, including failures. The close button inside a plain toast has `tabIndex={-1}` (line 79), so it is also unreachable by keyboard.
  Fix: error tone stays until dismissed (or 10 s), announce all toasts through one polite or assertive live region (and drop the form-level duplicate), give the close button normal tab order, cap at 3 (already done).   Ref: skill 17 Toasts duration; WCAG 2.2.1, 4.1.3.

[Major] Concurrent edits are caught for stage and task ticks only; every other project write silently overwrites. Who it hurts: two staff or owner plus staff editing one project; today the owner cannot tell.
  Where: `expectedStage` / `expectedDone` guards exist (`lib/admin/actions.ts` lines 269, 276, `components/admin/row-actions.tsx` lines 107-145, `project-forms.tsx` line 130) and service records carry `revision`. `saveProjectDetails`, `setDue`, `postUpdate`, `createDeliverable` and the legacy deliverable forms carry no expected-value token, and the store is last-write-wins (`lib/admin/persist.ts` header). There is no presence indicator ("Femi is viewing this project").
  Fix: add a `revision` or `updatedAt` hidden field to project details and due-date forms and refuse with "This changed since you opened it. Reload"; add a lightweight "also open: names" avatar stack on the project header using last-seen pings; at minimum show "last changed by X, 3 min ago" in `ProfileCard`.   Ref: skill 12a Anti-pattern 1 (no presence causes conflicts), Avatar stacks; 12b conflict resolution (not read in depth).

[Major] The onboarding tours are far longer than the skill's limit, and the staff first week has no activation checklist for clients. Who it hurts: new staff and new clients meeting the product for the first time.
  Where: `lib/tours/admin.ts`: admin welcome tour has 15 steps (the skill says 3-5, and calls 10+ an anti-pattern), the full walkthrough has 37 steps; page tours run 3 to 8 steps (within range). `lib/tours/client.ts`: client welcome 6, walkthrough 15. All are skippable and replayable and persisted per user, which matches the skill. A staff `FirstWeek` card exists (`components/admin/first-week.tsx`); the client portal has no first-value checklist (for example: confirm your details, upload your brand files, read your first update, review your first deliverable). No "since your last visit" re-engagement strip on either dashboard (searched components, app and lib for "since your last" and "what's new": none).   
  Fix: cut the welcome tour to 5 (map only), keep the 37-step walkthrough as an opt-in "full tour" (it already is), add a 4-6 item client checklist tied to real actions, and add "Since you last visited" on the portal Overview. This directly serves the owner's goal that clients always know what is being done.   Ref: skill 16 Product tours, Onboarding checklists, Re-engagement, Anti-patterns 1 and 4.

[Minor to Major] The projects list has no sortable columns, and filter state has no visible chips. Who it hurts: staff and owner scanning many projects.
  Where: `app/admin/(lists)/projects/page.tsx` has filters only (one `sort` mention, no sort links); money and clients have sort with `aria-sort` (`app/admin/(lists)/money/page.tsx` line 316). Active filters are never shown as removable chips with a "Clear all" and live count: "Clear filters" exists only inside empty states (`money/page.tsx` line 367, `blog/page.tsx` lines 186 and 231, `clients/page.tsx` line 316). The `ListSearch` count (`components/admin/list-search.tsx` line 74, "n of m clients") is good.
  Fix: one shared `ActiveFilters` chip row under each filter form; add sort to projects (due, stage, health, owner).   Ref: skill 21 Sorting, Filtering (Active Filter Display), 19 Active Filter Chips.

[Minor] Notification inbox lacks bulk and grouping. `components/workspace/notifications-inbox.tsx`: filters exist (Needs me, All, Summaries) and a count of items needing attention, but there is no "Mark all read", no Today or Earlier grouping, no unread dot on the bell, and the query is capped at 150 rows with no pager (`lib/workspace/notifications-store.ts`, `LIMIT 150`). Actions are single-item (`markWorkspaceNotification`). No quiet hours or "pause all" (already noted as a notification-rules gap).   Fix: mark-all and group headers; paginate; badge.   Ref: skill 17 Notification Center (inbox pattern), Attention management.

[Minor] Validation happens only on submit. `components/admin/form.tsx` has `aria-invalid` and `aria-describedby` wiring, focuses and opens the first bad field, and keeps typed values after a failed submit (all good), but no on-blur validation or re-validation on input after an error appears. Required fields are marked by `required` on `Wrap`; confirm each shows a visible marker and that the form explains it (not verified for every form).   Ref: skill 07 Validation timing, Required fields.

[Minor] No in-product "Reduce motion" setting (the app honours `prefers-reduced-motion`, which matches the repo rule). Skill 06 suggests an explicit toggle persisted per user; low priority because WDC's motion is limited to transform and opacity.

[Minor] Dashboards show no data-freshness cue. Server-rendered per request, so it is correct, but a long-open tab shows stale attention counts with no "updated" time and no refresh affordance (`components/admin/dashboard-view.tsx`; `syncStore` caches 150 ms per instance, `lib/admin/persist.ts`). Skill 18 and 22: stale data indicators. Add "Updated 14:05" and a refresh button, or revalidate on focus.

[Minor] Statuses are text plus colour (good) but several free-text status words differ by area (Open, Answered, Closed; Not sent, Awaiting client, Approved; shared, client_review, approved). The service workspace prints raw state keys with underscores replaced (`service-workspace-view.tsx` `label()`), which yields "Client review", "Changes requested" next to the legacy approval pills "Awaiting client", "Revision requested" for the same event. Skill 05 Labeling Consistency and 09. Normalise the vocabulary (ties to the merge recommendation in section C).

[Minor] Document a11y evidence is thin outside onboarding. Contrast, focus and responsive suites exist (`tests/contrast.spec.ts`, `admin-focus.spec.ts`, `admin-responsive.spec.ts`), but `tests/onboarding-a11y.spec.ts` is the only automated checker of structure; no axe or Lighthouse run over admin or portal routes (status.md also says no PageSpeed run, so no Core Web Vitals figure exists for authenticated pages). Skill 03 Testing checklist, 22 Key metrics. Already partly in my second pass; here it is specific to the skill's process.

## Where WDC already does better than the skill's advice

- Targets: 44 px minimum (README Layout) versus the skill's 24 px AA minimum.
- Drag and drop has a real keyboard path and live announcements: grip button with arrows and `aria-describedby="board-help"`, assertive status line, plus the stage mover form (`components/admin/project-board.tsx` lines 234-316, 42). Meets WCAG 2.5.7 without an extra control.
- Table semantics where it matters: `aria-sort` on sortable heads, a pinned first column, `aria-label` on the pager and rows-per-page, page size choice, range text, filters held in the URL so a filtered view can be shared (`components/admin/pager.tsx`, `money/page.tsx`). Matches skill 21 and goes further by keeping tables as tables on phones, which is the owner's rule.
- Search lists: `role="search"`, `type="search"`, label, clear button, Escape to clear, a live "n of m" count and a purpose-built no-results state (`components/admin/list-search.tsx`). Server-side searched pickers with 200 ms debounce, stale-answer dropping and ranking (`components/admin/remote-pick.tsx`, `lib/admin/search-rank.ts`), better than the skill's generic advice.
- Empty states are three distinct designs (first-use, cleared, no-results) with one next action each (`components/admin/empty-scene.tsx`, `admin-state.tsx`), and loading skeletons are shaped like the final page for most routes (`app/**/loading.tsx`). The skill asks for guidance and matching skeletons; WDC also distinguishes error from empty (`personal-inbox.tsx`).
- Chart accessibility: the cashflow chart is a labelled group with a per-month `aria-label`, a visible data table beneath it and a tooltip with `role="status"` (`components/admin/cashflow-chart.tsx` lines 63-102); the gauge SVG is `aria-hidden` with the figure beside it as text. Skill 18 asks for exactly this.
- Optimistic-concurrency tokens exist for stage changes, task ticks and service records (`expectedStage`, `expectedDone`, `revision`), which most products skip.
- Notifications give per-category, per-channel control with an email digest and keep the setting with the person (`lib/workspace/notifications-preferences.ts`, CLAUDE.md systems rule), exceeding the skill's "per-category, per-channel" baseline. Toasts cap at three visible and hold on hover (`toast.tsx` lines 33, 48).
- Destructive actions: in-app confirm dialog with "I understand" for irreversible ones, two-step delete via Trash, typed-name permanent delete. The skill only asks for confirmation.
- Sample data is clearly labelled and removable (`components/admin/example-note.tsx`), as skill 16 recommends.
- Design system: documented component table with tokens and per-pair contrast measured in tests (`README.md` § Design system, `tests/button-colours.spec.ts`, `contrast.spec.ts`), stronger than the skill's generic tier advice.
- Forms keep what was typed after a failed submit, move focus to the first invalid field even inside a closed section, and announce progress ("Saving.") (`components/admin/form.tsx` lines 15-23, 145-165, 199).
- Date and time pickers, searchable selects and phone fields are custom components with keyboard support instead of native widgets (owner call).

## Skill advice deliberately not applied
Bottom navigation (CLAUDE.md: no bottom tab bar, drawer on phones); card reflow for tables (CLAUDE.md: tables stay tables); desktop hamburger removal for the public header (README: one bar at every width, owner decision); i18n and RTL (the product is English and Nigerian-market only; not in scope); voice, canvas and barcode references (no matching flows).

## How these change the earlier priorities
- Add to the P0 list: none. All items above are P1 or P2 except the skip link and keyboard command palette, which are quick wins and should be treated as P1.
- Strengthen first-report P0 item 6 (global search): include keyboard-driven grouped results.
- Strengthen first-report P0 item 3 (owner visibility): include sidebar badge counts and a bell unread count.
- Strengthen second-pass C.3 (merge notification surfaces): include mark-all-read, grouping and badge.
- Strengthen the onboarding items: shorten the welcome tour and give clients a first-value checklist and a "since you last visited" strip.
