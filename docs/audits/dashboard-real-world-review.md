# Dashboard real-world review: proposal for approval

6 October 2026. Read-only source audit of the integrated admin, staff workspace and client portal. This is an audit plan and a proposal, not an implementation checklist or a claim that production has passed these journeys. No application source, database records, provider settings or messages were changed for this review.

## Outcome to design for

A client can enquire, provide a brief, agree scope, activate their account, review work, request changes, pay and receive a clear handover. The studio can see who owes the next action, what has actually happened and how to recover a failed step. Staff can do their daily work without seeing owner-only controls or reaching an unexplained refusal. Keep the existing pages and components; repair the connections before adding features.

## Evidence and boundaries

Reviewed integrated root `main` at `96f881434bf5ea22f0262d02e5662a2970f3b92b`: the root, frontend and backend READMEs, `docs/status.md`, the onboarding proposals, Users/Meetings plans, backup proposal and current source modules below. The backend is part of the Next.js frontend; there is no separate backend deployment to audit. Source inspection establishes available handlers and their decision logic. It does **not** establish applied migrations, canonical deployment identity, completed Google sign-in, provider delivery, browser geometry, payment settlement or concurrent database behaviour.

The delivery ledger contains both newer checkpoints and older paragraphs describing Users, Meetings and demo sources as unfinished or seeded. Reconcile those statements against current source and deployment evidence; do not use either an old plan or a pushed implementation as proof of live completion. Keep backup/restore and the optional onboarding profile setup explicitly proposed until their own acceptance evidence exists.

| Area | Observed in source | Verification still needed |
| --- | --- | --- |
| Admission and roles | `lib/roles.ts`, `lib/auth.ts`, `lib/admin/permissions.ts` and `guard.ts` define owner/staff/client admission and server permissions. Staff get clients/projects/forms/content; money, exports, user administration and destructive controls are owner-only. Meetings currently belongs to the owner settings permission. | Real sessions, deactivation/role changes during an open tab, cross-role direct requests, database failure and full sign-in/recovery. |
| Users | `lib/users/manage.ts`, `authorize.ts`, `notices.ts`, `lib/admin/user-actions.ts` and `settings/users/` implement owner management, protected roles, bounded exports, queued notices/recovery and scoped support. | Applied schema, real-session invitation/recovery lifecycle and actual delivery. Legacy capture-auth mutation tests remain retired. |
| Briefs | `lib/onboarding.ts`, `onboarding-server.ts`, onboarding API routes and `forms/links.ts` provide service questions, drafts/resume and assignment. | Reset/autosave races, resume authority and reliable identity/linking across actual client records. |
| Delivery | Admin/project and portal/project routes expose tasks, stages, updates, deliverable versions and approval/revision actions. | Concurrent edits, persisted exact-version sign-off and delivery/receipt recovery. |
| Finance | Quotes, invoices, payments, refunds, credit and reconciliation already exist. `lib/paystack.ts` records checkout mode, verifies against the originating reference and rejects ambiguous identity; `store.ts` refuses non-live Paystack settlement. | Interrupted callbacks, duplicate webhook/reconciliation, manual adjustments, restore behaviour and live-provider evidence. The old Paystack proposal's “current mode verification” finding is superseded in source. |
| Meetings | `lib/meetings/`, booking/manage components and owner settings implement durable commands, projections and recovery. | Event type/calendar setup, publication readiness, DST/overrides, real cancellation/rescheduling and notices. The guest screen explicitly says optional timed reminders are off until consent is configured. |
| Persistence/recovery | `lib/admin/persist.ts` loads persisted records; runtime collections start empty and no longer seed an empty database. Backup/restore remains a proposal. | Failure-after-response, overlapping writes, a safe restore drill and reviewed legacy demo provenance. No data cleanup is approved by this artifact. |

Paths in the tables are under `frontend/` unless stated otherwise. Comments describing earlier demo or in-memory-only architecture are not accepted as evidence where current logic differs.

## Proposed priorities

### P0: make the result trustworthy before extending the product

**Persist a successful action before reporting it.** Many older actions in `lib/admin/actions.ts` and `lib/portal/actions.ts` call `syncStore(); persistSoon();`, mutate the shared cache, then return success. `persistSoon()` schedules `saveStore` behind the response (`lib/admin/persist.ts`); throwing on save failure now prevents a silent internal failure, but cannot retract an already displayed success. The adapter also documents last-write-wins per JSON record. A client approval, finance adjustment or support reply can therefore be reported before its durable write finishes, and two instances need real conflict tests.

Propose tracing each write family and moving its authoritative record/audit update before success. Use a transaction or conditional version check for financial and approval conflicts; avoid a broad storage rewrite unless the bounded tests show it is necessary. Keep slow email/provider calls behind the response, with their intent persisted before it. On failure retain entered text, explain that the change was not confirmed and offer retry without duplicating the event.

Minimal acceptance: interrupt after mutation/before persistence; fail the database; submit the same request twice; issue opposing updates from two tabs/instances. A successful response must survive restart, and a conflict must not silently overwrite money, approval or client ownership.

**Bind approval to exactly the version reviewed.** `approveDeliverable` in `lib/portal/actions.ts` checks project ownership and rejects `seen < latest`, which is useful. It also defaults a missing version to latest and does not reject a claimed future version. `requestRevision` does not currently bind the request to a version. `Deliverable` in `lib/admin/types.ts` holds a current approval flag/note; `store.ts:setApproval` changes those and adds a general project note, rather than a structured approver/version/time decision.

Propose requiring an exact existing version and an eligible review state, recording that decision with the real actor and timestamp, and retaining decisions when a new version resets the current flag. Do not add electronic-signature claims or an approval engine. Separate an owner's recorded offline decision from a client's own sign-off.

Minimal acceptance: missing/future/stale version, another client's deliverable, double approval, approval racing a new upload, revision after approval and a database failure. History must say who approved which version; no unseen replacement becomes approved.

**Tell the truth about notices.** `replyToTicketAsStudio` in `lib/admin/actions.ts` returns “The client has been emailed” while `support-mail` runs in `after()`. `project-mail.ts` creates email log rows inside that deferred callback; an interrupted callback can leave no queued email intent. Stage notice dedupe uses project/destination/day, so two legitimate transitions to the same stage on one day can collide. Approval request/sign-off keys are already version-based and should be preserved.

Propose “Reply saved” with separate queued/accepted/failed notice status. Persist the notification intent with the actual business event, then reuse the existing log, preference and bounded retry controls. Include skipped-by-preference and unknown outcomes. Do not introduce another general notification service or treat SMTP acceptance as delivery.

Minimal acceptance: opted-out recipient, provider refusal, interrupted callback, repeated click, a real return to the same stage that day and ambiguous send outcome. The client portal always contains the saved change even if email fails.

### P1: close the handoff gaps on existing pages

**Make client identity explicit and recoverable.** `lib/portal/session.ts` links the signed-in address to the first matching active client, then an archived match, and follows merges up to five hops. `Client.contacts` allows secondary contacts, but the portal binding uses the primary email. Current Users invitation logic correctly validates active, unmerged client linkage at creation/redemption; this does not automatically solve an existing account after a client-email edit, multiple businesses sharing an address, a merge cycle or secondary approvers.

Propose displaying the linked primary account and a clear “access needs reconnecting” next action on the client record. Verify duplicates/merge targets before silently selecting a business. Keep archived historical access policy explicit rather than equating archive with account deactivation. Start with one accountable primary contact; consider durable account-to-client membership only if actual multi-contact cases require it. Email replacement needs verification and portal-link review, not an editable string that immediately moves access.

Minimal acceptance: duplicate address, changed address, archived/merged/deleted client, missing target, expired session and read-only support expiry. No client sees another company's records or loses typed work without guidance.

**Connect brief → client → project once.** `clientFromLiveSubmission` matches email/phone or creates a client; `assignEntry` and `forms/links.ts` can associate an entry with a client/project. `onboarding-admin.ts` itself returns a nullable client ID, and link reads can fall back to identity matching if the assignment table is unavailable. A proposed audit must test which screens honour explicit assignments instead of assuming every brief is permanently connected.

Propose one visible assignment summary and one next action: match/create client, choose/create its project, then invite when needed. Warn before merging ambiguous matches. Preserve the original submitted brief and distinguish a submitted request from agreed scope. Avoid automatic account, quote or project creation from an unreviewed answer.

Minimal acceptance: repeated submission, same person ordering another service, existing client with a new email, assignment unavailable, wrong-client project and reassignment. No duplicate client/project from a double click; original answers remain readable.

**Make “waiting for” and handover concrete.** Generic project stages are Onboarding, Discovery, In progress, Review, Revisions and Delivered (`lib/admin/types.ts`). Existing tasks, owner, due date, update and deliverable components can express service differences. A manual Delivered stage is not proof of approved work, final files, a launch or paid terms.

Propose a small project summary using existing data: next action, accountable person, due/response date and any blocker. Before handover show unresolved client review, missing final assets and any agreed payment prerequisite; allow an owner to record a deliberate exception rather than inventing a universal pay-before-delivery rule. Record the handover links and support/care terms in the existing deliverables and update history.

Minimal acceptance: partial approval, client late with content, no response deadline, waived review, cancelled/postponed job, launch delayed by a third party and continuing retainer. Preserve closed-project invoices, versions and support history.

**Keep meetings and payments recoverable, not duplicated.** Use the existing command/reconciliation pages for pending or uncertain provider actions, with a clear next step. Confirm that a meeting enquiry can be linked to a real client/project without auto-creating duplicates; show pending approval distinctly from booked. Reconcile the current Paystack implementation with its stale proposal, and verify test payments never affect invoice balances, paid figures or receipt automation. Quotes deliberately use a named reply recorded by the owner (`app/q/[token]/page.tsx`, `answerEstimate`); preserve that simple trustworthy flow unless a verified digital acceptance journey is separately approved.

Minimal acceptance: mode switch while checkout is open, test webhook, duplicate payment reference, overpayment/refund, wrong amount/currency/invoice, Cal timeout then successful retry, conflicting slots, cancellation near a reminder and meeting changes from Cal directly.

### P2: make the workspace comfortable and understandable

Use the actual shared shell, table, `Pager`, `RowMenu`, `BulkBar`, form save bar, dialogs and toasts. Tables stay tables with a readable pinned identity column and contained sideways scrolling. No extra primary navigation page, mobile tab bar, giant setup wizard or decorative analytics.

Audit staff-visible list/detail/notification counts together: owner-only money/export/restore controls must not leak through a KPI, row menu or download. Audit first-use empty, filtered-no-results, loading, no-permission and unavailable states independently. A failed data read is not a zero total. Persisted portal “needs your review”/next-action data is a better starting point than a new notification bell or fabricated unread count. Add client unread acknowledgement only when a real per-account read state is required.

Shared account details should eventually use the new phone normalization policy as well: `updateMyDetails` in `lib/portal/actions.ts` still uses its older permissive regex. Optional photo/System appearance belongs to the existing approved-scope onboarding proposal, not a second profile initiative.

Minimal acceptance: 320/390px phones, tablet and desktop, light/dark, long identities, empty/new studio, large tables, keyboard, touch, reduced motion, open menu/dialog and on-screen keyboard. Confirm grouping, icon centres, readable text, focus, safe areas and feedback, not just overflow.

## All six service journeys

Keep the reconciled onboarding entry point in `plans/onboarding-improvements-plan.md`, with its flow and service companions. Preserve answer keys, three form styles, legacy free text, reversible advice choices and explicit cost facts. Implement that proposal once; this review extends the **post-brief** journey using existing project tools.

| Service | Existing brief evidence | Minimum post-brief continuity to review |
| --- | --- | --- |
| Branding & Design | `onboarding.ts` branding section: state, deliverables, surfaces, untouchable/avoid; shared guide/colour/inspiration/assets. Existing proposal supplies optional five colours and small explanatory visuals. | Agree outputs and usage scope; identify the approver; show concept/version decisions; hand over agreed export/source files and guide. Extra packaging/signage or a changed brand direction needs an explicit scope decision, not a silent task. Preserve supplied guides and colour notes. |
| SEO | Site URL, target terms, geography, competitors, tools access and content owner. Proposal explains the tools and secure delegated access. | Confirm access actually works and the baseline/date agreed; identify who supplies/approves content and implements site fixes; use tasks for access/content blockers. Deliver a readable periodic findings/action update. Briefing checkboxes are not connected tools, guaranteed rankings or measured results. |
| Websites | New/existing conditionals, goals/features/page count, content readiness/care, domain and hosting. | Confirm approved pages/features, content owner and client-owned domain/hosting access; track content and staging review; record launch authority, final URL, ownership and care terms. Domain availability is not purchase. A working staging link is not a completed public launch. |
| Mobile Apps | Platforms, one job, accounts/roles, offline, payment type, store accounts and backend. | Confirm real platform scope and acceptance devices; obtain delegated store access; record testing and release artifacts. Distinguish approved build, submitted store review, rejection and published version through existing notes/tasks, rather than presenting all as Delivered. Hand over account/source/backend ownership and agreed support. |
| Software & AI | Process, users count, data location, integrations, compliance and success measure. | Confirm actual roles/workflow, representative approved data, integration access and human acceptance. Record migration/testing/training/rollback ownership. AI output requires an agreed human review/exception path; a brief selecting AI is not permission to process all client data or a promise of autonomous accuracy. |
| Social Media & Paid Ads | Platforms/handles, delegated access, content ownership, goals/themes/upcoming dates and media budget. | Confirm usable delegated access and approval dates; use versioned creative/calendar review and existing update history. Separate studio fee from spend paid to the ad platform. Distinguish scheduled, actually published, paused and rejected content; record recurring period and agreed reporting. Selecting platforms or a budget band does not launch a campaign or authorize a charge. |

Across all six, multiple services may share a client but need distinct briefs and agreed project scope. A client change request should be classified by a human as an included revision or additional work; no automatic price, recurring charge or delivery promise is inferred from form answers.

## Design and delivery approach after approval

First present a small WDC artifact for the repaired “next action”, client linkage and exact-version approval/history states on existing pages, including errors. Reuse the already reviewed onboarding artifacts for their own scope. Then choose one bounded implementation family at a time: durable writes/approval evidence; truthful notification lifecycle; linkage/brief assignment; handover/service explanations; remaining responsive polish. Do not create an implementation checklist until the owner approves this plan.

Validation should use real owner, staff and client sessions on a dedicated disposable database, seeded with deliberate test fixtures and no real recipients. Cover one new and one existing client, all six services, resumed brief, repeat submit, linked project, quote decision, invoice/test checkout, approval/revision, support reply and handover. Capture the actual role/phone/theme states; distinguish mocked provider behaviour from a later authorized live-provider check. Verify schema and the exact canonical deployed commit separately.

Keep source fixes, migration readiness, provider configuration and live verification as separate statuses. Backup/restore requires its existing safety checkpoint and disposable restore drill; demo deletion requires the read-only candidate/provenance review. Neither is a shortcut to finishing this audit.

## Deliberate limits

No new role framework, customer chat platform, CRM pipeline, service-specific dashboard stack, compulsory tour, automatic campaign launcher, AI approval system or generic worker infrastructure. Expand only when one observed studio workflow cannot be represented clearly and safely with the current records and controls.
