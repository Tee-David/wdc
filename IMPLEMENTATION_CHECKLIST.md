# WDC implementation checklist

**77 open** (31 in progress)

`[ ]` not started · `[-]` in progress. Only open work lives here: when a
task is finished, delete its line and let the commit that closed it carry
the evidence. Detail that used to sit in this file is in git history and in
`plans/`.

---

## 1A. Client onboarding experience

- [-] Make Save and continue later create a securely hashed, single-purpose resume token and email the link through Truehost SMTP. (Token flow is complete. UPDATED 2026-09-17: the `535` is gone -- SMTP authentication succeeds with the same credentials Vercel holds, in about 22 seconds, and a real message was accepted `250 OK` and seen by the owner. (…)
- [-] Keep client account creation optional in that email; bind its expiring, single-purpose invitation to the onboarded recipient so a forwarded link cannot register a different email address. The next-steps email now says an account is optional and offers an invitation on request, tied to that address. The invitation itself is not built: it is the same Better Auth invitation work as 4.3's second line.
- [ ] Let authenticated clients link or unlink Google in account settings; require another usable sign-in method before unlinking their last identity.
- [ ] Bind each client invitation to the intended normalized email and project/client record; store only a token hash, set an expiry, enforce one-time redemption, and reject email substitution or replay.
- [ ] Let an invited client create credentials or continue with an approved Google identity without granting admin access; keep the project relationship attached to the same client account.

## 2. Authentication and email

- [ ] **Mail is delivered but filed as spam by Gmail.** Diagnosed and written up in `plans/email-deliverability.md`. Authentication is NOT the headline problem: SPF lists the sending IP and aligns, a DKIM key is published on the `default` selector, MX is correct. (…)
- [ ] Truehost's OUTBOUND filter scores what we send and will discard it with `550 Message discarded as high-probability spam`. Found the hard way: a test enquiry whose body read like a diagnostic ("test", "confirm the mail path end to end", "no reply needed") was rejected, while the identical route with an ordinary customer enquiry was accepted. (…)
- [ ] Verify Google origin/callback configuration for apex, `www`, Vercel, and localhost without exposing credentials.
- [ ] Verify the redesigned login on the deployed commit and canonical domain: the sign-in email arrives with the code in its subject, its link lands on `/login?done=1` and moves on, the code signs in from a second device, Google (where configured) returns through `/login?done=1`, and the keyboard fold and orb hold up on a real low-end Android phone. Everything here passed locally against Postgres and an SMTP sink (`tests/auth-flow.spec.ts`, 17/17; `tests/login-demo.spec.ts`, 16/16); none of it has been seen on production yet.
- [ ] Passkeys on the login page. The whole UI (button, method row, waiting screen, cancel path, orb and ring behaviour) is built and covered in demo mode, and hidden in production by `passkeys: false` in `lib/auth/adapter.ts`. Real support needs `@better-auth/passkey` (a new package), a `passkey` table migration, and a registration screen inside the dashboard; shown before then, it would be a button that fails for everybody.
- [ ] Have a native speaker check Edo ("Kóyo"), Fulfulde ("Jam"), Wolof ("Nanga def") and Shona ("Mhoro"), then add them to `components/auth/greeting/greetings.ts`. Left out on purpose rather than shipped unverified; the login greeting cycles the other 36.

## 2A. Payments, invoices, and transaction integrity

- [ ] Review Litch Consulting's relevant payment, invoice, webhook, reconciliation, and audit-log patterns; adapt only what fits WDC. NOT VERIFIABLE FROM HERE -- a research step with no artifact of its own to check against; the code that resulted is mature enough that it plausibly happened, but there is nothing to confirm it by.
- [ ] Review Nomarc's local/private project and client-management flows; adopt only useful day-to-day patterns that fit WDC and keep the admin UX simple. Same as above -- not verifiable, not claimed.
- [-] Atomic invoice state update: true today (`applyPayment` is one function, one process, one in-memory write). "Retry Cockroach serialization failures safely" cannot be true yet because Money's writes are not on CockroachDB -- this half depends on section 4.9's own migration, not on anything payments-specific.
- [ ] Publish the exact Paystack webhook and callback URLs after routes are implemented and deployed. The routes exist and their paths are fixed by the file system: webhook `/api/paystack/webhook`, checkout callback `/pay/done`. (…)

## 3. Performance and release verification

- [-] Raise canonical-home mobile Lighthouse from the supplied 82 toward 90+ without regressing the supplied desktop 98; prioritise the 2.99s hero-text render delay, 3.8s LCP, 6.7s Speed Index, render-blocking CSS, forced reflow, and unused first-party JavaScript shown in the evidence.
- [ ] Rerun mobile Lighthouse on the canonical domain and target 90+. UNBLOCKED 2026-09-17 and MEASURED, and the number is bad: PageSpeed Insights, mobile, live homepage -- performance **42**, accessibility 100, best practices 73, SEO 100. That is well under the 82 this item started from, so something regressed and it needs attributing before anything else here. One run; PSI varies, so re-measure before concluding. (…)

### 4.0 Reference, scope, and release guardrails

- [ ] Capture desktop, tablet, and mobile reference screenshots for the Litch shell and every equivalent WDC admin route before visual implementation.

### 4.1 Litch-parity admin shell and UI foundation

- [-] Reusable primitives -- audited one at a time rather than assumed as a set: page headers (`adDash__head`, one shape, every page), stat cards (`Tile`), panels (`Panel`), badges (`StagePill`/`InvoicePill`/`HealthPill`/`ApprovalPill`, all thin wrappers over one `.ad__pill`), data tables (`.ad__t`, ONE class, used on 20 tables across nine routes -- checked by grep, not assumed), empty/skeleton/error states (`Empty`, `.ad__loading*`, `AdminState`'s five kinds), confirmation modals (`Dialog` on the platform `<dialog>`, plus `Form`'s `confirm` prop for the simple cases), export (a real CSV link on the clients list, `/admin/clients/export`). (…)
- [ ] Verify the shell and primitives visually against Litch at all target widths before building deeper routes. NOT DONE and not really doable from here now -- deeper routes are already built (4.2 through 4.9 all exist), so this is retroactive rather than a gate; a real side-by-side against Litch's own screenshots is 4.10's own line, not repeated here.

### 4.2 Daily admin dashboard

- [-] Overdue invoices, stalled onboarding, and project-derived reasons (blocked, waiting on a client, in revision, a slipped task) all feed one combined `attention` queue, sorted worst-first, every row linking straight to its resolution screen (`AdminDashboardView`). Added this pass: payment events that did not land cleanly and messages that did not go (both to Reconciliation), revision requests clients made in the portal, and support threads waiting on a studio reply; and the panel now says how many rows it did not show instead of cutting silently at six. NOT built: failed uploads, which nothing records yet, and live-form drafts in the stalled-onboarding rows (the queue still reads the demonstration list for those).
- [-] Outstanding, overdue, and a collection rate are on the KPI tiles; "Cashflow, last six months" charts collected income against recorded spend, which is the lightweight income-versus-expenditure view. NOT on this route: accounts-receivable aging, which exists (30-day buckets, drillable) but only on `/admin/money/reconciliation` -- it answers the question asked here, just from a different page.
- [-] Quick actions has a new client, a new invoice (`InvoiceBuilder`), a new expense, a standalone "Record a payment" that picks the invoice first, Review forms, and an onboarding-form link that opens the public form in its own tab. Deliberately NOT duplicated: "New project", which is already the dashboard header's button. NOT built: role filtering, because only `owner` is wired.

### 4.3 Clients and client workspace

- [-] Create, edit, archive and restore were already live (`createClient`/`updateClient`/`archiveClient` in `lib/admin/actions.ts`), with duplicate prevention on create and edit. Added this pass: **tags** (comma separated, searchable on the Clients list, shown as pills), **other contacts** (one per line: name, role, email, phone; searchable, listed on the client page) and **merge**, which folds a duplicate into the record kept: projects, invoices, estimates, credit, tickets, messages, expenses and forms move across, services, tags, notes and the duplicate's contact are added, the kept record's own details are never overwritten, and the duplicate is archived with a banner saying where it went. Pinned by `tests/client-records.spec.ts`. NOT DONE: client-level access status, which needs the Better Auth user rows (see the next line).
- [ ] NOT ATTEMPTED, and the reason is specific rather than "ran out of time": every part of this line reads the `user`/`account`/`session` tables Better Auth owns, and **this sandboxed environment has no `DATABASE_URL`/`COCKROACHDB_URL` configured at all** -- `lib/db/pool.ts` throws the moment anything tries to connect. (…)
- [ ] NOT ATTEMPTED, on purpose and for a size-and-risk reason rather than the database one above. (…)
- [ ] NOT ATTEMPTED, same reasoning as the invitation line above: unlinking is a core Better Auth capability and would not need a migration, but building the "require another usable sign-in method before unlinking the final identity" guard correctly means reading the account rows first, in a portal settings action, on a Better Auth setup this environment cannot connect to or test against. (…)

### 4.4 Projects and day-to-day delivery

- [-] Tasks are in, with assignee, due date, priority and ONE dependency, and ticking one writes a line on the project's history. Deliberately one dependency and not a list: a task waiting on two things waits on whichever finishes last, and modelling that properly means a graph, a cycle check and a topological sort for a screen that shows six rows. (…)

### 4.5 Money, invoices, payments, and expenditure

- [-] Estimates are built, with their own number series, their own public document and their own life. AN ESTIMATE IS NOT A DRAFT INVOICE, and building it as one would have been the easy mistake. A draft is a document the studio has not finished writing. (…)
- [-] Receipts are generated for every successful payment whatever the method, numbered `RCT-YYYY-NNN` in order and never reused, and each links to its invoice, client and project. (…)
- [-] Eight of the nine, and the ninth is named rather than faked. Expenses had carried four fields: date, description, category, amount. They now also carry who was paid, how it left, the project it belongs against, whether it can be billed back, a note, and the admin who entered it. WHO WAS PAID IS ITS OWN FIELD. "Adobe" answers "who do we pay for this" and "Creative Cloud, the team plan" answers "what is it". (…)
- [-] Cashflow, income, expenditure, outstanding, overdue and net were already on Money. Added: a collection rate, and accounts-receivable aging in the conventional 30-day buckets so the numbers mean to an accountant what they mean here. (…)
- [-] Ensure financial writes are transactional, integer-minor-unit based, server-validated, role-authorized, idempotent, and audited. True now: kobo integers, server-side parsing in `lib/admin/validate.ts`, idempotency on the payment reference, an audit row per write, and (since this pass) an owner check inside every action rather than only on the page. NOT true: transactional, because Money's writes are still in memory; that is 4.9's migration.

### 4.6 Forms, builder, onboarding, and submissions

- [ ] Build one shared admin data table to the standard in section 9 of the audit: state in the URL, keyset (cursor) pagination with a stable sort key plus id, 25/50/100 per page, capped counts, filter chips, saved views, select-all-matching for bulk actions, streamed CSV export that respects filters, a card layout at 320px, geometry-matched skeletons, `aria-sort` headers. (…)
- [ ] Build the notification centre from the audit: event, rule, template, log. A form notification is one kind of rule. Move the existing transactional templates into it with the code versions as fallback; eight templates in `lib/email-templates.ts` are currently never called.
- [ ] Rebuild Forms to Litch parity with draft/published/archived states, submission counts, last activity, duplication, preview, share link, and clear primary actions.
- [ ] Build a responsive form editor with sections/steps, reusable fields, labels/helpers/placeholders, option editing, required state, ordering, conditional visibility, and live preview without a heavy drag-and-drop dependency.
- [ ] Support text, textarea, email, phone, number, date, URL, radio, checkbox, multi-select, short/long dropdown, searchable long list, address/country, consent, and file upload controls.
- [ ] Use normal dropdowns for ten or fewer options and searchable, bounded, touch-scrollable lists for longer choices; popovers must render above every global control.
- [ ] Add versioned publishing so existing submissions retain the schema they answered; prevent destructive edits without an explicit new version.
- [-] Build a submission inbox with status, service, client/project link, assignee, tags, search/filter/export, detail view, internal notes, and activity history. Built: briefs from the live form (`onboarding_submissions`) are on `/admin/forms` with status, service, dates and the client they belong to, and open to a detail view that reads them back under the questions as asked. They were written to the table and shown nowhere before. NOT built: assignee, tags, search/filter/export, internal notes and activity history.
- [-] Convert a valid submission into or attach it to a client and project without duplicating people or losing the original answers/files. Built for live briefs: "Make them a client" matches on email or phone first, so a second press or a second brief from the same person lands on the existing client; the answers stay in the table untouched. The link is derived, not stored, until clients leave memory (4.9). NOT built: creating the project in the same step, and files.
- [ ] Finish conditional question sets, domain suggestions/checks, client fatigue validation, and completion/resume testing for every onboarding service.

### 4.7 Communications and client portal handoff

- [-] Seven of the eight are built and sending, all through the outbox (a row before the mail server is called): the invoice with its pay link, the payment receipt, the invoice reminder, the onboarding next-steps email, a project stage change, an approval request when a deliverable is sent for review, and a sign-off confirmation when a client approves in the portal. Stage changes and approval requests respect the client's "project updates" setting and log a Skipped row when it is off; the sign-off, like a receipt, always goes. NOT DONE: the account invitation (blocked with 4.3), and the templates are code, not editable by the studio.
- [-] The portal exists now, at `/portal` -- `lib/roles.ts`'s `client` door flipped to `ready: true`, matching where it always said a client belonged. Gives a client their projects, client-visible updates, invoices/payments, and approvals; internal notes, tasks, and admin-only money stay off every portal screen because the portal's own queries never read them, not because a flag hides them. (…)
- [-] Shell built to the same `.ad`/`admin.css`/`dashboard.css` system the admin uses -- one design system, not two, per this file's own authenticated-UX rule. Five sections, not six: Overview, Projects, Billing, Support, Settings. Forms & files deliberately left out rather than built empty: there is no forms builder yet for it to show.
- [-] Covered: project stage and health (the same stage-track component as the admin's own project page), update history filtered to `clientVisible`, deliverable approvals and revision requests, and a combined "needs your attention" queue on the overview (deliverables awaiting review, invoices with a balance, answered support tickets). (…)
- [-] Invoices link out to the existing public `/i/[token]` page rather than re-rendering payment history and receipts a second time -- one renderer for a document, not two that can disagree. (…)

### 4.8 Settings, content, team access, and audit

- [ ] Rebuild Settings to Litch parity with grouped navigation for business profile, branding, services/content, finance defaults, payment methods, email/templates, integrations, team, security, and data.
- [-] Two of these are real now, and three are a deliberate no rather than an oversight. Settings gained "Default VAT %" and "Default days to pay" (`app/admin/(lists)/settings/page.tsx`, `finance.vatRate`/`finance.dueInDays`), through the same override-by-key mechanism every other row on that screen already used -- so nothing new had to be built to store or reset them. (…)
- [ ] Add service catalogue and onboarding-template management without exposing implementation-only configuration to day-to-day users.
- [ ] Add owner/staff roles and least-privilege permissions for clients, projects, money, forms, content, settings, exports, and destructive actions. (…)
- [ ] Preserve last-owner/self-change guards, session revocation, invitation expiry, and a clear staff access/activity view. (…)
- [-] Append-only audit log built and wired into the writes that exist. APPEND-ONLY BY CONSTRUCTION, not by promise: the array is module-private and the only export that touches it pushes, so there is no update, no delete, and nowhere to write from. (…)
- [ ] Author and category records, once there is more than one person writing.
- [-] Editable site content beyond the blog: the FAQ list, testimonials, the services copy and the work catalogue all currently live in `lib/` and need the same treatment. DONE for the FAQ: `/admin/settings/faq` saves one override over `lib/faq.ts` (migration 0010, `site_content`), shown on the homepage, /contact and the service pages and in their FAQPage data; reset deletes the row and the shipped questions return. DELIBERATELY NOT for testimonials: they are clients' words verbatim and `lib/testimonials.ts` says nothing there may be written by us, so an editor that makes them typeable works against the rule. NOT DONE: the services copy and the work catalogue, which carry slugs and derivation chains (sitemap, work categories) and need more care than an override.
- [ ] Media library backed by R2, reusing `r2Config()` and `presignPut()` from `lib/r2.ts` rather than a second uploader. Note the SVG caveat recorded under upload safety.

### 4.9 CockroachDB, R2, and backend integrity

- [-] Connect document/upload workflows to Cloudflare R2. (`lib/r2.ts` signs presigned PUTs with SigV4 and no new dependency; `POST /api/onboarding/upload` authorises one file against the caller's draft, choosing the key, content type and 25MB ceiling server-side, and fails closed naming the missing variable. Files land under `onboarding/<draftId>/`. (…)
- [ ] Replace every remaining in-memory admin read/write with repository/query modules backed by CockroachDB; remove fictional seed data from production paths.
- [ ] Design and apply explicit migrations for clients/contacts, projects/tasks/updates, forms/versions/submissions, invoices/lines, payments/events, expenses, receipts, communications, invitations, files, notifications, and audit records.
- [ ] Add constraints, indexes, normalized identifiers, foreign-key/archive policy, timestamps, actor attribution, and idempotency keys; review migration storage and rollback risk before applying production changes.
- [ ] Use short retryable transactions for multi-record invariants; prevent duplicate invoice numbers, receipts, invitations, webhook events, payments, and form conversions.
- [ ] Extend R2 to client/project/invoice/expense files with scoped keys, persisted metadata, file-size/type rules, signed access, authorization checks, replacement/version rules, and safe deletion/archive behaviour.
- [ ] Add rate limits, origin/signature checks, server-side validation, structured redacted logs, backup/restore procedures, and fail-closed integration configuration.

### 4.10 Verification, parity review, and release

- [ ] Add focused unit/integration tests for derived money state, permissions, invitations, form conditions/versioning, project transitions, audit events, uploads, and idempotency.
- [ ] Add browser tests for every admin route's primary task, keyboard flow, navigation/top restoration, mobile drawer, tables/filters, empty/error states, and duplicate-submit protection.
- [ ] Compare WDC and Litch screenshots side by side at every target width; close shell, spacing, typography, component, state, and interaction gaps until parity is deliberate and documented.
- [ ] Run lint, TypeScript, production build, admin tests, responsive visual checks, accessibility checks, and a performance/bundle regression check.
- [ ] Test with production-like record volumes so dashboard queries, filters, tables, search, exports, and timelines remain responsive.
- [ ] Verify a database backup and rollback path before the first production migration; deploy the exact tested commit and validate authenticated admin routes on the canonical domain.
- [ ] Push each completed Section 4 milestone to `main` as a narrow commit that excludes Claude's public-frontend work and unrelated user files; update this checklist and the bridge at each boundary.

### 5.0 Tour architecture and content

- [-] Create separate typed tour registries for admin and client experiences, with one full walkthrough and independently launchable page-only tours. Admin: `lib/tours/admin.ts`, welcome, walkthrough and ten page tours. Client: `lib/tours/client.ts`, welcome and walkthrough, run by the same provider with `audience="client"`. NOT built, deliberately for now: client page tours. Five short screens with one job each, all already stops on the walkthrough; add one when a portal screen has more controls than its heading explains.

### 5.2 Page-only tours

- [-] Ensure dynamically loaded tables, tabs, drawers, empty states, and responsive variants provide valid alternate targets or skip logic. The missing-target case is covered (see 5.1's fourth line) and pinned by a test; `desktopOnly`/`mobileOnly` step flags are filtered by an actual `matchMedia` check against the sidebar's own 1024px collapse breakpoint, verified at both a 1440px and a 375px viewport live. (…)

### 5.3 UX, accessibility, state, and verification

- [-] Keep Joyride above dashboard popovers but below critical system dialogs; prevent clipping, off-screen placement, background scrolling, and collisions with mobile safe areas. `zIndex: 95` sits above popovers (80) and the new blur bands (94), below the command palette and mobile drawer (100); native `<dialog>` elements sit above everything regardless of any z-index, being in the browser's own top layer. (…)
- [-] Never show admin-only steps to clients or staff without the relevant permission; filter steps before a tour begins. The filtering mechanism is built and wired (`TourStep.roles`, applied in `tour-runtime.tsx` before steps ever reach Joyride) but nothing in the registry actually uses it: only one role (`owner`) is wired through auth today, so there is no `staff` step to filter yet. Ready rather than exercised.
- [-] Test full and page-only tours at all dashboard breakpoints, themes, permissions, empty/populated states, keyboard-only mode, reduced motion, and route transitions. (…)

### From screenshots, 2026-09-14

- [ ] Truehost SMTP takes about 23 seconds just to authenticate, measured from two networks. The contact form now answers in half that by sending the receipt after the response, but the real fix is a transactional provider, which would also give proper SPF and DKIM.
