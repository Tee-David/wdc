# WDC implementation checklist

**132 open** (33 in progress)

`[ ]` not started · `[-]` in progress. Only open work lives here: when a
task is finished, delete its line and let the commit that closed it carry
the evidence. Detail that used to sit in this file is in git history and in
`plans/`.

---

## 1A. Client onboarding experience

- [-] Make Save and continue later create a securely hashed, single-purpose resume token and email the link through Truehost SMTP. (Token flow is complete. UPDATED 2026-09-17: the `535` is gone -- SMTP authentication succeeds with the same credentials Vercel holds, in about 22 seconds, and a real message was accepted `250 OK` and seen by the owner. (…)
- [ ] Let authenticated clients link or unlink Google in account settings; require another usable sign-in method before unlinking their last identity.
- [-] Let an invited client create credentials or continue with an approved Google identity without granting admin access; keep the project relationship attached to the same client account. DONE for credentials: an invited client sets a password (or chooses emailed sign-in links, no password) and gets role `client` only; the portal binds by the signed-in email, which is the invitation's, which is the client record's. BUILT 2026-09-24: `db/migrations/0012_invitations.sql`, `lib/invitations.ts`, `/invite/[token]`. The table keeps only a SHA-256 of the token, the normalised address, role, client id, a 7-day expiry, and redeemed/revoked stamps; redemption locks the row (`FOR UPDATE`) and creates the verified account, its password and the redeemed stamp in one retried transaction, so a link works once and two tabs make one account. The page shows the address and has no field to change it. An address that already has an account is refused, never taken over or promoted. Sending another invitation withdraws the outstanding one. Admin: "Portal access" on each client record (invite, resend, withdraw, account status). Pinned by `tests/invitations.spec.ts` (7 cases) against Postgres over TLS; not yet run against CockroachDB. **OWNER DECISION for Google:** `lib/auth-google.ts` deliberately admits Google for owner and staff only ("Clients sign in with a password"), pinned by `tests/google-admission.spec.ts`; that was not overridden. Staff invitations offer Google; client ones do not until that rule is changed on purpose.

## 2. Authentication and email

- [ ] **Mail is delivered but filed as spam by Gmail.** Diagnosed and written up in `plans/email-deliverability.md`. Authentication is NOT the headline problem: SPF lists the sending IP and aligns, a DKIM key is published on the `default` selector, MX is correct. (…)
- [ ] Truehost's OUTBOUND filter scores what we send and will discard it with `550 Message discarded as high-probability spam`. Found the hard way: a test enquiry whose body read like a diagnostic ("test", "confirm the mail path end to end", "no reply needed") was rejected, while the identical route with an ordinary customer enquiry was accepted. (…)
- [ ] Add the studio's real social profile URLs to `SOCIAL_LINKS` in `frontend/lib/site.ts`. The email footer draws a row of marks for each entry (pictures already built in `public/email/`) and draws none while the list is empty; nothing in the repo says what the handles are, so none were guessed.
- [ ] Verify Google origin/callback configuration for apex, `www`, Vercel, and localhost without exposing credentials.
- [ ] Verify the redesigned login on the deployed commit and canonical domain: the sign-in email arrives with the code in its subject, its link lands on `/login?done=1` and moves on, the code signs in from a second device, Google (where configured) returns through `/login?done=1`, and the keyboard fold and orb hold up on a real low-end Android phone. Everything here passed locally against Postgres and an SMTP sink (`tests/auth-flow.spec.ts`, 17/17; `tests/login-demo.spec.ts`, 16/16); none of it has been seen on production yet.
- [ ] Passkeys on the login page. The whole UI (button, method row, waiting screen, cancel path, orb and ring behaviour) is built and covered in demo mode, and hidden in production by `passkeys: false` in `lib/auth/adapter.ts`. Real support needs `@better-auth/passkey` (a new package), a `passkey` table migration, and a registration screen inside the dashboard; shown before then, it would be a button that fails for everybody.
- [ ] Have a native speaker check Edo ("Kóyo"), Fulfulde ("Jam"), Wolof ("Nanga def") and Shona ("Mhoro"), then add them to `components/auth/greeting/greetings.ts`. Left out on purpose rather than shipped unverified; the login greeting cycles the other 36.

## 2A. Payments, invoices, and transaction integrity

- [ ] Review Litch Consulting's relevant payment, invoice, webhook, reconciliation, and audit-log patterns; adapt only what fits WDC. NOT VERIFIABLE FROM HERE -- a research step with no artifact of its own to check against; the code that resulted is mature enough that it plausibly happened, but there is nothing to confirm it by.
- [ ] Review Nomarc's local/private project and client-management flows; adopt only useful day-to-day patterns that fit WDC and keep the admin UX simple. Same as above -- not verifiable, not claimed.
- [-] Atomic invoice state update: true today (`applyPayment` is one function, one process, one in-memory write). "Retry Cockroach serialization failures safely" cannot be true yet because Money's writes are not on CockroachDB -- this half depends on section 4.9's own migration, not on anything payments-specific.
- [ ] Publish the exact Paystack webhook and callback URLs after routes are implemented and deployed. The routes exist and their paths are fixed by the file system: webhook `/api/paystack/webhook`, checkout callback `/pay/done`. (…)
- [ ] (S) Audit the Paystack verification against the invariants Fluent enforces: our own random reference, metadata that must match the invoice, a reused charge id refused, amount and currency checked strictly, and an "actions ran" flag so a webhook delivered twice does nothing twice. Record what already holds rather than rebuilding it.
- [ ] (M) Refunds as their own ledger rows (positive amount, type refund, note or provider id), with refunded vs partially refunded decided by summing them against the charge. Recorded only; the admin does not call Paystack to refund at first.

## 3. Performance and release verification

- [-] Raise canonical-home mobile Lighthouse from the supplied 82 toward 90+ without regressing the supplied desktop 98; prioritise the 2.99s hero-text render delay, 3.8s LCP, 6.7s Speed Index, render-blocking CSS, forced reflow, and unused first-party JavaScript shown in the evidence.
- [ ] Rerun mobile Lighthouse on the canonical domain and target 90+. UNBLOCKED 2026-09-17 and MEASURED, and the number is bad: PageSpeed Insights, mobile, live homepage -- performance **42**, accessibility 100, best practices 73, SEO 100. That is well under the 82 this item started from, so something regressed and it needs attributing before anything else here. One run; PSI varies, so re-measure before concluding. (…) ATTRIBUTED 2026-09-24, locally, because the live domain is unreachable from the sandbox and PSI answered 429: a production build scores 73-76 mobile (simulated, three runs) with the Jotform agent BLOCKED by the sandbox network, so the gap to 42 is almost certainly `components/agent/jotform-agent.tsx` -- its own header records 10,096ms of blocking time from the 6.3MB uncompressed runtime, loaded `afterInteractive` on every page. That component is marked as the owner's deliberate choice not to change without asking, so it was NOT changed; **owner decision needed**: keep it, or load it on first interaction/click. FIXED the rest of what was measurable: (1) every lucide icon no longer ships on every page, and Space Grotesk is WOFF2 -- both landed as 9a031b5 (in parallel with the same fix here; that version kept), and `scripts/build-web-fonts.py` now regenerates the WOFF2s from the TTFs; (2) the hero marquee no longer renders its second 72-logo copy into the HTML -- it is added after mount (HTML 104KB -> 72KB compressed). Measured on one production build here with all three: homepage JS 551KB -> 332KB, page weight 874KB -> 630KB, TBT ~400ms -> 140-280ms, simulated mobile score 73-76 -> 78-83; with DevTools (real) throttling LCP = FCP = 2.5s, and what is left before it is render-blocking CSS (12 files, 134KB) and the fonts. STILL OPEN: the live PSI rerun after deploy, and the Jotform decision.

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
- [-] Client account status in the admin: the client record's "Portal access" panel now reads the `user` table for the client's address (has an account, since when) and the latest invitation (pending until, expired, withdrawn), with invite/resend/withdraw. The earlier blocker -- no database in this environment -- was worked around with a local Postgres over TLS carrying every migration. NOT yet shown: last sign-in and active sessions per client.
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
- [ ] Build a responsive form editor with sections/steps, reusable fields, labels/helpers/placeholders, option editing, required state, ordering, conditional visibility, and live preview without a heavy drag-and-drop dependency.
- [ ] Support text, textarea, email, phone, number, date, URL, radio, checkbox, multi-select, short/long dropdown, searchable long list, address/country, consent, and file upload controls.
- [ ] Use normal dropdowns for ten or fewer options and searchable, bounded, touch-scrollable lists for longer choices; popovers must render above every global control.
- [ ] Add versioned publishing so existing submissions retain the schema they answered; prevent destructive edits without an explicit new version.
- [-] Convert a valid submission into or attach it to a client and project without duplicating people or losing the original answers/files. Built for live briefs: "Make them a client" matches on email or phone first, so a second press or a second brief from the same person lands on the existing client; the answers stay in the table untouched. The link is derived, not stored, until clients leave memory (4.9). NOT built: creating the project in the same step, and files.
- [ ] Finish conditional question sets, domain suggestions/checks, client fatigue validation, and completion/resume testing for every onboarding service.

### 4.6A Forms section, the Fluent Forms shape

Agreed 2026-09-24 after reading Fluent Forms, Fluent Forms Pro and FluentSMTP (working notes in the gitignored `plans/`). The eight forms stay defined in code: six onboarding forms (one per service), contact, and newsletter. The estimate and SEO report tools are NOT forms here, by decision. CSV and XLSX export both ship from day one. Left out on purpose: a form builder, editable email bodies, conditional routing, charts, an advanced filter builder, editing entries, double opt-in, IP logging, a second SMTP connection. Build in this order.

- [ ] (S) A form registry in code (`lib/forms/registry.ts`): one record per form with a stable key (`onboarding-branding` ... `contact`, `newsletter`), title, group, public path, its columns and its notifications.
- [ ] (S) `/admin/forms` lists the eight forms in two groups (Onboarding, Website): open or closed, unread and total (plus drafts for onboarding, active subscribers for the newsletter), last entry, and a pill when a studio notice failed. No create/duplicate/delete. The "Submissions (demonstration)" panel goes. The Forms nav item shows the unread count.
- [ ] (S) Entry state and numbers: read, starred, and inbox/spam/trash on onboarding briefs and contact enquiries, validated on the server; a per-form number ("Brief #12", "Enquiry #7") assigned inside the insert; opening an entry marks it read.
- [ ] (M) The entries table at `/admin/forms/[form]`, with Entries, Questions and Settings tabs as real links. Status tabs counted in one query; search; date presets (today, 7 days, 30 days, custom, end of day included); 25/50/100 per page; sort by date or name; all of it in the URL. A column picker (show, hide, reorder, reset) saved per viewer per form in a cookie so the first paint has the right columns. Unread rows bold with a "New" pill. Cards at 320px. Empty, filtered-empty, error and not-connected states.
- [ ] (M) The entry view at `/admin/forms/[form]/entries/[entry]`: answers under the questions as worded (gaps shown by default, a toggle to hide them), a details side panel (number, received, state, service, client with "Make them a client", source page, device), previous/next through the filtered list, one timeline of notes and events (status changes, emails sent or failed with a link to the log row, conversion to a client), reply by email, print stylesheet. No editing of answers.
- [ ] (S) Bulk actions over ticked rows: read/unread, star/unstar, spam (contact), trash/restore, export selected, and delete permanently from Trash only with a confirmation naming the count. Every id re-checked on the server; every change writes a timeline event.
- [ ] (S) Export from day one in CSV and XLSX, through the list's own query so filters and "selected" apply: entry number, received, state, one column per question by its label. Close the formula-guard gap in `lib/admin/csv.ts` (leading tab and carriage return). XLSX built on the server only; measure the library before adding it.
- [ ] (M) The Settings tab per form: open/closed with a closed message, optional opening and closing dates, an optional entry limit (total, per day, per month), all enforced in the submit and draft routes and failing closed; the message after submit or a redirect to a page on this site only; spam facts plus an optional blocked-words list; how long entries and Trash are kept.
- [ ] (M) The form's emails as notifications, seeded from what already sends: contact notice and receipt, newsletter welcome and notice, onboarding next steps and notice. Each has on/off (off writes a Skipped log row), to, cc, bcc, reply-to, subject with a small token set, a preview against the latest real entry, and "send a test to me". From comes from the mail settings. Every studio notice links to the entry in the admin. Resend from an entry, to the original address or another (another clears cc and bcc).
- [ ] (M) Settings, Email: the SMTP connection as configured (host, port, encryption, username, From) with the password never shown; a test email that reports "Delivered in 23.4 s" or the server's error; the email log with search (`to:`, `subject:`), view, retry and resend; retention (30 days default, daily purge); an in-app alert when a message fails for the last time, at most one a minute.
- [ ] (S) Newsletter: a subscribers list in the admin, a one-click signed unsubscribe link (today it is only a mailto), and a CSV import of subscribers.
- [ ] (S) Old `/admin/forms/<uuid>` links redirect to the new entry address.

### 4.7 Communications and client portal handoff

- [-] Seven of the eight are built and sending, all through the outbox (a row before the mail server is called): the invoice with its pay link, the payment receipt, the invoice reminder, the onboarding next-steps email, a project stage change, an approval request when a deliverable is sent for review, and a sign-off confirmation when a client approves in the portal. Stage changes and approval requests respect the client's "project updates" setting and log a Skipped row when it is off; the sign-off, like a receipt, always goes. NOT DONE: the account invitation (blocked with 4.3), and the templates are code, not editable by the studio.
- [-] The portal exists now, at `/portal` -- `lib/roles.ts`'s `client` door flipped to `ready: true`, matching where it always said a client belonged. Gives a client their projects, client-visible updates, invoices/payments, and approvals; internal notes, tasks, and admin-only money stay off every portal screen because the portal's own queries never read them, not because a flag hides them. (…)
- [-] Shell built to the same `.ad`/`admin.css`/`dashboard.css` system the admin uses -- one design system, not two, per this file's own authenticated-UX rule. Five sections, not six: Overview, Projects, Billing, Support, Settings. Forms & files deliberately left out rather than built empty: there is no forms builder yet for it to show.
- [-] Covered: project stage and health (the same stage-track component as the admin's own project page), update history filtered to `clientVisible`, deliverable approvals and revision requests, and a combined "needs your attention" queue on the overview (deliverables awaiting review, invoices with a balance, answered support tickets). (…)
- [-] Invoices link out to the existing public `/i/[token]` page rather than re-rendering payment history and receipts a second time -- one renderer for a document, not two that can disagree. (…)

### 4.8 Settings, content, team access, and audit

- [-] Two of these are real now, and three are a deliberate no rather than an oversight. Settings gained "Default VAT %" and "Default days to pay" (`app/admin/(lists)/settings/page.tsx`, `finance.vatRate`/`finance.dueInDays`), through the same override-by-key mechanism every other row on that screen already used -- so nothing new had to be built to store or reset them. (…)
- [ ] Add service catalogue and onboarding-template management without exposing implementation-only configuration to day-to-day users.
- [-] Append-only audit log built and wired into the writes that exist. APPEND-ONLY BY CONSTRUCTION, not by promise: the array is module-private and the only export that touches it pushes, so there is no update, no delete, and nowhere to write from. (…)
- [ ] Author and category records, once there is more than one person writing.
- [-] Editable site content beyond the blog: the FAQ list, testimonials, the services copy and the work catalogue all currently live in `lib/` and need the same treatment. DONE for the FAQ: `/admin/settings/faq` saves one override over `lib/faq.ts` (migration 0010, `site_content`), shown on the homepage, /contact and the service pages and in their FAQPage data; reset deletes the row and the shipped questions return. DELIBERATELY NOT for testimonials: they are clients' words verbatim and `lib/testimonials.ts` says nothing there may be written by us, so an editor that makes them typeable works against the rule. NOT DONE: the services copy and the work catalogue, which carry slugs and derivation chains (sitemap, work categories) and need more care than an override.
- [-] Media library backed by R2, reusing `r2Config()` and `presignPut()` from `lib/r2.ts` rather than a second uploader. BUILT 2026-09-24 at `/admin/settings/media` (linked from Settings): the browser PUTs straight to R2 under a server-chosen `media/YYYY/MM/` key, then the server asks the bucket (`headObject`, a signed HEAD) whether the object really arrived and records R2's own size -- a browser that claims an upload the bucket never got is refused, and that is pinned by `tests/media-library.spec.ts`. Alt text per image with a "No description" pill until it has one; archive and restore rather than delete, because a published page may be using the address; every upload, alt change, archive and restore goes to the audit log. **SVG is refused** (the caveat recorded under upload safety): these files are meant to be drawn inline on our own pages, which the onboarding uploader never does. PNG/JPEG/WebP/AVIF/GIF/PDF, 10MB. Fails closed and says which of `COCKROACHDB_URL`, the four R2 credentials or `CLOUDFLARE_R2_URL` is missing. STILL OPEN: (1) apply `db/migrations/0011_media_library.sql` to the production database (`npm run db:migrate`) -- until then the page shows its "could not be read" state; (2) pictures INSIDE a post now upload to the library straight from the blog editor's Picture panel (same sign-then-verify steps), and the post accepts images only from this site or the bucket's own origin; the cover and social image still only accept the shipped cover photographs (`BLOG_COVERS` in `lib/blog-validate.ts`), and there is no "pick from the library" browser yet; (3) the bucket's CORS policy has to allow PUT from the admin origin, the same requirement as onboarding uploads. Verified against a local Postgres over TLS (the table, alt text, archive/restore, the refused forged upload, 320px) -- not yet against CockroachDB or a real bucket.

### 4.8A Settings, roles and a light CMS

Agreed 2026-09-24. Settings takes the Realtors Practice layout (grouped sections, a sidebar on desktop, a tappable section list on a phone, each section its own page) in WDC's own tokens and type. Ideas taken from WordPress (capabilities, post statuses, revisions, site health, admin notices, personal data tools) and WooCommerce (a settings registry, business address, retention, logs, a maintenance mode that never blocks payments), and only where they fit a small studio. The email and forms settings are in 4.6A. Left out on purpose: a fourth role or a role editor, editable menus or a page builder, comments, editable email bodies, Paystack or SMTP secrets in the UI, API keys and webhooks, a job queue, currency options, appearance settings, a backups button, open sign-up.

#### Honesty fixes (do first)

- [ ] (S) Settings: make "Contact email", "Social links", "Services", "Case studies" and "Legal documents" read-only with a "Not editable yet" pill until each has a consumer; today `saveSetting` says "The site shows it now" while only `finance.*` is read (`lib/admin/store.ts:1453`).
- [ ] (S) Refuse unknown setting keys on the server: `saveSetting` accepts only keys in the settings registry, each parsed by its own validator.
- [ ] (S) Fix the enum comments: `"user"."role"` is a STRING with no CHECK (migrations 0001/0004), not a Postgres enum as `lib/roles.ts` and `lib/db/schema.ts` say; add the next free migration with `CHECK ("role" IN ('owner','staff','client'))`.

#### Settings foundation

- [ ] (S) `lib/settings/registry.ts`: one record per setting (key, section, label, help, type, default = shipped value, parse, capability, paths to revalidate).
- [ ] (S) Migration `app_settings (key, value JSONB, saved_by, saved_at)`; move the in-memory `SETTINGS` map behind the same get/set/clear functions; cached read with tag invalidation on write; audit row per change.
- [ ] (M) Settings shell: `/admin/settings/layout.tsx` with grouped sub-navigation (sticky at 1000px+), an overview/list page shared by desktop overview and phone list (icon tile, label, one-line description, state pill, chevron), section routes with a "Settings" back link, per-section `loading.tsx`, `aria-current`, 44px rows, tour targets updated.
- [ ] (S) Panel save kit: dirty tracking, primary Save disabled until dirty, Discard, "Unsaved changes" pill, leave-page warning only while dirty, inline `role="status"` result, server value re-synced only when it changes, provenance line ("Edited by … · shipped as … · Reset").
- [ ] (S) Move the Integrations table, the audit log and the FAQ/Media links into their sections; the long single page goes.

#### Roles and team

- [ ] (M) `lib/admin/can.ts` with a capability table per role and `can()`/`canOn()`; replace all 59 `owner()` calls with specific capabilities; every refusal test posts to the action directly as staff.
- [ ] (S) Admin layout lets owner and staff in; each page calls `requireCap()` and renders the no-permission state; NAV and command palette filtered by capability; staff dashboard omits money tiles and money attention rows at the query.
- [ ] (S) Capture-as-staff for tests (non-production, same token), and tag money/settings tour steps `owner` so `TourStep.roles` filtering is exercised.
- [ ] (M) Team and access section: list owners and staff with last sign-in and session count; invite staff (wires the existing `inviteStaff`); pending staff invitations with resend/withdraw; change role; deactivate/reactivate; sign out everywhere.
- [ ] (S) Migration for `deactivatedAt`/`deactivatedBy`; refuse sign-in for a deactivated row in the session-create hook and in the Google admission check; deactivation deletes the user's sessions in the same transaction.
- [ ] (S) Last-owner and self-change guards inside the transaction (`FOR UPDATE` on owner rows); staff may act on client rows only; flip `staff.ready` in `lib/roles.ts` in the same commit.
- [ ] (M) My account section: name, password change (revoking other sessions), sign-in methods with last-method unlink guard (closes 1A's Google line for admins too), active sessions with "Sign out everywhere else", replay tours.

#### Business, site and money settings

- [ ] (M) Business profile: trading and legal name, BN, registrar, tagline, contact email, phone/WhatsApp, address, location, social URLs (validated, fills `SOCIAL_LINKS`), timezone, date format, week start; wire every consumer (footer, legal pages, email footer, invoice/receipt header, Organization JSON-LD) in the same change.
- [ ] (S) Studio notice address with confirmation mailed to the new address (hashed token, TTL) before it takes effect.
- [ ] (S) Site and SEO: default description and social image; "ask search engines not to index" read by `robots.ts` and root metadata, with a shell notice while on and a typed confirmation to enable.
- [ ] (M) Invoicing and payments section: default VAT and days to pay (moved), VAT registered toggle with TIN, bank transfer details, payment terms and footer note, reminder schedule on/off per step, next invoice/receipt/estimate numbers shown read-only, Paystack mode and key status from env, webhook and callback URLs with copy.
- [ ] (S) Content section: FAQ and Media entries, blog defaults (default topic, posts per page, RSS count), read-only rows for services/work/legal/testimonials saying why.

#### Privacy, visibility, system

- [ ] (M) Retention rules per data type (drafts, enquiries, spam/Trash, invitations, email log, unsubscribed addresses, deactivated accounts), a daily batched job that anonymises or deletes, and one audit row per run with counts; money records excluded by design.
- [ ] (M) Personal data request: look up an email across tables, export JSON/CSV, erase by anonymising personal fields, log the request.
- [ ] (M) Maintenance mode: whole-site 503 with `Retry-After` and noindex, a reviewer share link, bypass for signed-in owner/staff, never blocking admin, portal, login, Paystack webhook, `/pay/*` and `/i/*`; shell notice; audited.
- [ ] (M) System status: health probes (DB, applied migrations vs files, SMTP connect behind the response, bucket HEAD and CORS, recent webhook deliveries), environment info with "Copy report", background work (pending/failed outbox rows, last retention run).
- [ ] (S) Tools panel: retry failed emails, purge expired invitations, re-verify media against R2, revalidate public pages; each audited and safe to run twice.
- [ ] (S) "Check now" on each integration row where a cheap probe exists, showing the answer and its time rather than "working".
- [ ] (S) Audit log section with filters by kind and actor, date presets and search; bounded with a count.
- [ ] (S) Admin notices in the shell for persistent conditions (Paystack test mode, maintenance on, noindex on, failed emails today, unapplied migration), at most two at once, solid tone fills, dismissible per user by cookie.

#### Blog as a CMS

- [ ] (S) Pending review status: staff "Submit for review", owner publish or return with a note, count on the Blog nav item and an attention row on the dashboard.
- [ ] (S) Optimistic concurrency on post saves: refuse when the row's `saved_at` is newer than the one the editor opened, and say who saved it and when.
- [ ] (M) Revisions for published posts (last 25, in the save transaction), list with who/when and Restore; last 10 values per `site_content` key for the FAQ.
- [ ] (S) Trash for posts with Restore and a 30-day purge, replacing permanent draft deletion.
- [ ] (S) Verify scheduled posts reach /blog, the post page, the sitemap and RSS within the promised window with a one-minute-ahead test; fix or reword the editor's promise.
- [ ] (M) "Choose from library" for cover and social image, with search, type filter and "Used in".
- [ ] (M) Services copy override by key (names, blurbs, deliverables; slugs locked), shown with provenance and Reset, following the FAQ's pattern.
- [ ] (S) Post locking with a 150-second heartbeat and "Take over" — only if the concurrency refusal is ever hit in practice.

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
- [ ] Run lint, TypeScript, production build, admin tests, responsive visual checks, accessibility checks, and a performance/bundle regression check. PART, 2026-09-24: phone fit is now pinned. On a phone every admin list table is a card per row with each line named after its column (`components/admin/table-labels.tsx`, admin.css), rather than a sideways scroller up to three screens wide; the project stage bar wraps to two rows; long attention titles wrap; and one onboarding question no longer widens a 320px page to 345-363px. `tests/mobile-fit.spec.ts` checks 12 admin and portal routes plus onboarding at 320px (page width, no sideways table, nothing past its panel) and fails on the previous commit. All six onboarding forms were walked step by step at 320px. Still open: the rest of this line.
- [ ] Test with production-like record volumes so dashboard queries, filters, tables, search, exports, and timelines remain responsive.
- [ ] Verify a database backup and rollback path before the first production migration; deploy the exact tested commit and validate authenticated admin routes on the canonical domain.
- [ ] Push each completed Section 4 milestone to `main` as a narrow commit that excludes Claude's public-frontend work and unrelated user files; update this checklist and the bridge at each boundary.

### 4.11 Dashboard redesign, from the mockups

Started 2026-09-25. The target is `dashboard-mockups/` at the repo root: 134 boards (admin, forms, settings and money, client portal; desktop 1440px and mobile 390px), a gallery (`index.html`), a PNG per board, the source and the scripts that regenerate and audit them. Where a board and `AGENTS.md` disagree, `AGENTS.md` wins. This restyles and reshapes the screens; it does not change what 4.2 to 4.8A say a screen must do, and a board showing data the app does not have yet is a target, never licence to fake it. **OWNER DECISION 2026-09-25:** a form builder for NEW forms, with the eight coded forms kept exactly as they are; this supersedes the "form builder" in 4.6A's left-out list, and only that item. Build in this order; each line lands as its own commit with light and dark, 320px to 1440px, keyboard and reduced motion checked.

#### Foundation

- [-] (S) Tokens to the boards: solid tone fills with a white label on every one (warn `#a16207`, live `#c95000`, good `#15803d`, bad `#c62828`), chart colours, radii and shadows, in `components/admin/admin.css` at `:root` so the portalled tour card still sees them. Re-run `tests/contrast.spec.ts` and `tests/button-colours.spec.ts`. DONE 2026-09-25 with the shells: the tone fills (warn and live now carry white), `--ad-nav-on`, and `--ad-bad-ink` for red text on a dark panel (the bad fill measured 3.33:1 as text there). NOT yet: chart colours, radii and shadows, which move with the primitives below.
- [ ] (M) Shared primitives: page header (eyebrow, h1, lede, actions that never shrink), KPI card, panel, pill, tag, icon tile, segmented control, tabs, chips, inputs, the pager (rows per page, 25/50/100; Previous and Next with their arrows beside the words), the date range popover (presets plus a custom range, end of day included), row menu, dialog, drawer, bottom sheet, bulk bar, toast, and the empty, filtered-empty, loading, error and no-permission states. Rebuild the Boneyard snapshots once geometry moves.

#### Admin pages

- [ ] (M) Dashboard: greeting and date range, KPI row, cashflow chart, collected-of-billed gauge, attention queue, project pipeline, recent payments; dark theme board included.
- [ ] (M) Clients: the list (filters sheet on a phone, bulk bar), a client (overview, projects, money, contacts, portal access, timeline), add, edit, merge.
- [ ] (M) Projects: board and list views, new project, a project (stage track, tasks, deliverables, updates), post an update, send a deliverable for review.
- [ ] (L) Money: overview with tabs, invoice builder and invoice, record a payment, expense, estimate, receipt, refund, void, filters, reconciliation.
- [ ] (L) Forms (with 4.6A): the list in its groups, entries with columns, export and trash, one entry, and the builder (steps, field list, field settings, add-a-field, logic, preview, publish), form settings, and the form's emails with the editor.
- [ ] (L) Settings (with 4.8A): the overview and one page per section through the section menu (My account, Business profile, Team and access, Invoicing and payments, Site and SEO, Content with FAQ and Media, Email with the log, Privacy and retention, System status, Audit log); a grouped list on a phone.
- [ ] (M) Blog: list, editor, publish or schedule.

#### Client portal

- [ ] (M) Overview, projects and a project, approve a deliverable, request a revision, billing, an invoice, pay, support, a conversation, a new ticket, settings, and the not-linked state.
- [ ] (S) Accepting an invitation stays on the auth shell (`AuthShell`: the royal-blue panel, orb and greeting that log-in and forgot-password use), NOT the navy split screen on the `PInvite` board. Take only its content: who invited you and to which company, the address shown and never asked for, a password strength meter, a line on what the portal is for, and when the link expires.

#### Verification

- [ ] (S) Side by side with the boards at 390px and 1440px using `dashboard-mockups/scripts/screens.mjs` and the same shots of the app; `tests/mobile-fit.spec.ts` at 320px; the tours walked on both shells; and the gaps that remain written down as deliberate.

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
