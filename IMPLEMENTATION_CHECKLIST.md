# WDC implementation checklist

Status key: `[ ]` pending, `[-]` in progress, `[x]` implemented and verified.

## 1. Public frontend

- [x] Audit every public and onboarding button so its text stays neutral: white or black according to background contrast; remove coloured button-label text. (Black on orange measures 7.11:1; white was 2.95:1 and navy 5.99:1. `--on-accent` is now the single token for any accent fill, and `tests/button-colours.spec.ts` fails the build if white returns to orange.)
- [x] Preserve existing button shapes/layouts while adding consistent polished hover, focus-visible, active, disabled, and reduced-motion states; orange buttons invert to white/black and blue buttons to black/white where appropriate. (The shared focus ring was orange, so it was invisible on the orange CTA; it now takes its colour from the section behind it. Disabled and reduced-motion states were missing entirely.)
- [x] Keep the mobile navigation theme switch and accessibility control on the same responsive row without overlap or clipping. (Measured with the panel open at 320/360/390/430px: one row, equal halves, no overlap, nothing off-screen, no horizontal page overflow.)
- [x] Desktop FAB stack: Jotform bottom-left; UserWay bottom-right beneath back-to-top.
- [x] Mobile FAB layout: Jotform bottom-left; back-to-top bottom-right; UserWay corner hidden.
- [x] Keep the Jotform/avatar FAB on the left and back-to-top on the right; align both controls to the same responsive bottom baseline.
- [x] Give the Jotform/avatar launcher the same responsive left gutter that the back-to-top control has on the right.
- [x] Services "Let's talk" particle text loops.
- [x] Remove the stray thin vertical line after the services "Let's talk" particle text and verify repeated looping in the rendered page.
- [x] Team cards do not clip while hovered at desktop or mobile widths.
- [x] Dark-mode service cards consistently use navy surfaces, fine blue borders, unboxed white icons, and bright `#ff6500` numbers.
- [x] 404 page fits the desktop viewport without scrolling and remains responsive.
- [x] Offline page fits the desktop viewport without scrolling and remains responsive.
- [x] Reconnection transitions from "The line went quiet" to "And the line is back" with the services particle language.
- [x] Public contact form sends through the site endpoint instead of opening the visitor's mail app.
- [x] Contact form has responsive states, anti-spam handling, accessible errors, and a clear receipt state.
- [x] Diagnose and eliminate mobile vertical-scroll catching/lag; confirm no Lenis or pointer animation intercepts touch scrolling.
- [-] Re-profile the remaining subtle mobile vertical-scroll catch on real touch-sized routes; inspect pinned horizontal rails, per-frame scroll work, passive listeners, layout reads, third-party launchers, and compositor-heavy effects after confirming Lenis is absent.
- [x] Fix hover-lift clipping across work, preview, service, and team card containers; preserve the full top border and focus outline at every responsive width. (Every card rail is an overflow container. A 4px lift plus a 2px focus ring at 3px offset needs 9px; .pv-track, .pv-icards and .pv-marq each gave 6px and .pv-pinstage gave 0, including an explicit padding:0 in the pinned state. One --card-lift-gutter token, now 10px everywhere, measured clear at mobile/tablet/desktop.)
- [x] Fix clipping on the large “One roof”/value cards and project showcase cards shown in the latest captures; audit their shared horizontal tracks and transformed ancestors. (Same root cause and same fix as the row above: these are .pv-icard and .pv-job/.pv-scard inside the shared rails.)
- [x] Apply WDC typography consistently to onboarding: Space Grotesk for headings and prominent display copy; the body token for body, descriptions, labels, helper text, and controls, with responsive sizing. (Confirmed with the user that Space Grotesk alone is fine. A `--font-body` token now carries the body side so the split is expressed in the stylesheets rather than waiting on a font file; both resolve to Space Grotesk today, so one line changes it if a second face is ever licensed.)
- [x] Encode concise WDC design, typography, accessibility, SEO, dependency, rendering, media, animation, and Core Web Vitals conventions in repository `AGENTS.md` and `CLAUDE.md` guidance.
- [x] Install and review `karpathy-guidelines`; merge its simplicity, surgical-change, explicit-assumption, and verifiable-success rules into repository guidance.
- [x] Remove the redundant “Opens the full contact form with your details carried over.” helper wherever it appears. (Verified absent from the codebase.)
- [ ] Remove or neutralise the orange outline on the intro technology/logo card; use white only if an outline remains.
- [x] Add responsive separation between the intro gallery arc and its text so neither overlaps at any supported viewport. (The arc apex was a fixed fraction of viewport height, which cannot know how tall a paragraph that rewraps with width is. The statement block is now measured and the apex clears it, with the old fraction kept only as a floor.)
- [x] Reduce the hero/media overlay enough to reveal the imagery while retaining text contrast and readability. (Measured off the image pixels behind the headline: the photograph is BRIGHT there, luminance 0.75, so white type needs a 0.76 black overlay to clear 4.5:1 and the flat 0.55 veil was under even the 3:1 allowed for large text. Reshaped rather than reduced: a 30% base so the picture reads across the frame, plus an elliptical scrim on the copy. Measured after: 16-19:1 behind the headline in both themes.)
- [x] Audit all internal and external links across headers, footers, cards, CTAs, forms, legal pages, previews, and error/offline states; correct destinations, fragments, stale paths, and broken links. (`tests/links.spec.ts` walks every public page, resolves each internal destination and asserts every in-page fragment has a real target.)
- [x] Improve delivery of the slow-loading selected-brand-work images using measured formats, responsive sizes, prioritisation, and lazy-loading choices without creating layout shifts. (Rendered widths measured at 360/412/620/768/900/1280/1600 and every `sizes` clause reset to just above the widest real width in its range; one clause was UNDER the real width and was upscaling.)
- [x] Align the desktop Jotform and UserWay launchers to the same horizontal baseline after the third-party widget is rendered. (Verified with the real widget loaded, not the facade: the native launcher and the UserWay disc both sit exactly 26px from the bottom. Note its LEFT gutter measured 42px against 26px on the right, which is Jotform's own inner padding and is tracked separately.)
- [-] Make /services respond and scroll smoothly. (Profiled at 4x CPU throttling: 81.6% of scroll time was `(program)` -- style, layout and paint, not script -- with 1,356 style recalculations against the homepage's 1,608 costing twice as much each. Root cause: `LazyStage` mounted each demo once and then disconnected its observer, so all six ran timers for the rest of the visit, off screen. A non-latching live gate now pauses them: measured sitting still with all six mounted and none on screen, stage mutations went from six demos running to ZERO, and a full scroll dropped from 1,413 DOM mutations to ~1,070. Still to do: the visible marquee writes a transform every frame.)
- [x] Send every navigation to the top of the destination page. (Two causes: Lenis outlives the route and animated the document back to the previous page's offset, and a link to the page you are already on is a router no-op that never scrolled at all. `components/ui/scroll-reset.tsx` handles both; covered by `tests/navigation-scroll.spec.ts`.)
- [x] On phones, make call-to-action buttons fill the width and stack one per row rather than sitting two-up; excludes the hamburger sidebar.
- [x] Fix the accessibility (UserWay) launcher being invisible in dark mode. (It used `--ink`/`--rule`, which are declared only inside the `.pv` block, and it renders outside it: both fell through to their light-mode fallbacks in every theme, leaving the glyph at 1.00:1 on its own disc.)
- [x] Draw the SVG icon strokes for icons that mount after page load. (DrawGate scanned at 0/600/1600/3200ms and then stopped, so icons in the stages that mount on approach were never observed and never drew. It now also rescans on scroll, throttled to 400ms.)
- [x] Stop preselecting a service on the onboarding picker; Start stays disabled until the client chooses.
- [x] Use the brand orange for orange text on light grounds. (--accent-ink was #b34700 at 5.50:1, a whole stop darker than needed, which read as a different, muddier orange. Now #c95000, the lightest orange on the hue that still clears 4.5:1.)

## 1A. Client onboarding experience

- [x] Treat onboarding as a client-facing, normally post-payment intake link sent by WDC; rewrite every prompt and helper from the client's perspective.
- [x] Study both supplied Fluent Forms JSON exports for website and social-media question wording, conditional logic, and answer options; treat the exports as reference data only.
- [ ] Design equivalent, concise onboarding question sets for branding, SEO, apps, software/AI, and paid advertising while preserving the same conversational voice.
- [x] Reduce every service onboarding journey to 3 or 4 parts total; the client presses Next no more than 3 times before review/completion.
- [x] Replace the three-section progress treatment with one taller progress bar containing the percentage.
- [x] Add a subtle pulse to the onboarding progress fill; respect reduced-motion preferences.
- [x] Add subtle, encouraging progress hints without adding visual noise.
- [x] Make every tooltip aligned, viewport-aware, touch-accessible, dismissible, and fully visible on mobile and desktop.
- [ ] Audit and implement conditional display rules so clients see only questions relevant to their prior answers.
- [x] Add clear `Other` choices where fixed options may not fit; reveal a concise follow-up field only when `Other` is selected.
- [x] Audit every prompt, option, helper, and uncertainty escape for the client's first-person perspective; use “I'm not sure; please advise me” and equivalent natural wording.
- [x] Remove em dashes from all onboarding form copy; use semicolons or natural sentence breaks instead.
- [x] Fix long searchable selectors and their internal scrolling on touch devices; prevent global FABs from obscuring options.
- [x] Re-audit every onboarding dropdown for a bounded, touch-scrollable option panel; use search automatically for long lists such as countries and any list with more than ten options. (Panels are bounded and scrollable; the wheel case is fixed with , since Lenis calls preventDefault on every wheel event while it owns the page and was cancelling the gesture over nested panels.)
- [ ] Use a simple non-searchable dropdown for lists of ten or fewer options; keep search for longer lists, and ensure every open dropdown/popover renders above Jotform, UserWay, and back-to-top controls.
- [x] Fix exclusive multi-select behaviour so choosing “I'm not sure; please advise me” clears other choices, and choosing any concrete choice afterwards clears the uncertainty choice instead of blocking selection. (The control was being made  while deferred, so every option in the question became unreachable and the escape was a trap. Choosing a real answer now simply replaces the deferral.)
- [x] Persist drafts server-side in CockroachDB rather than relying on local storage as the source of truth.
- [-] Make Save and continue later create a securely hashed, single-purpose resume token and email the link through Truehost SMTP. (Token flow is complete; Truehost currently rejects SMTP authentication with `535`.)
- [-] Set resume links to expire after 3 days; clearly handle expired, reused, and invalid links and allow a new link to be requested. (Expiry, replay rejection, invalid-link handling, and secure link rotation are complete; self-service reissue remains.)
- [ ] After successful onboarding, send the client a personalized next-steps email; explain that project communication may use the client dashboard, direct chat, a WhatsApp project group where appropriate, or another agreed channel.
- [ ] Keep client account creation optional in that email; bind its expiring, single-purpose invitation to the onboarded recipient so a forwarded link cannot register a different email address.
- [ ] Let authenticated clients link or unlink Google in account settings; require another usable sign-in method before unlinking their last identity.
- [ ] Bind each client invitation to the intended normalized email and project/client record; store only a token hash, set an expiry, enforce one-time redemption, and reject email substitution or replay.
- [ ] Let an invited client create credentials or continue with an approved Google identity without granting admin access; keep the project relationship attached to the same client account.
- [x] Allow cross-device resume with server answers restored accurately; local storage may only be a fail-safe draft cache.
- [ ] Keep collected detail sufficient for delivery while minimising client fatigue; validate completion time and question count per service.
- [ ] Audit the supplied Fluent Forms exports for where dropdowns, radios, checkboxes, multi-selects, and free text are intentionally used; choose the lowest-effort control for each WDC question.
- [ ] Research a free or self-hostable, production-safe domain-availability source (prefer authoritative RDAP/registry data; do not infer availability from DNS alone).
- [ ] For clients without a domain, provide up to three add/remove domain suggestions, an explicit Check availability action, per-domain available/taken/unknown feedback, and a Use selected action.
- [ ] Keep domain checks optional and conditional; rate-limit and cache checks, state that availability is informational until registration, and never show registrar pricing.

- [x] Give file upload a progress animation and a clear completed state. (Real progress, not a timer: the browser PUTs straight to R2 through a presigned URL, so `xhr.upload.onprogress` reports bytes actually on the wire. Done rows show a tick and `added`; failed rows explain why and offer a retry.)
- [x] Stop a completed upload from breaking mobile layout; the page narrows once a file is attached and must not. (The file rows are grid items and a grid item defaults to `min-width: auto`, so it refuses to shrink below its content. One long filename took the page to a scrollWidth of 558 in a 360px viewport. Measured after the fix: no overflow at 320/360/390 and the name truncates.)


### From the independent audit (2026-09-13)

- [x] Stop the chat avatar costing every page 2.35MB. (Jotform's `avatar-icon` 302s to a 1254x1254 PNG of 2,459,310 bytes served at ~15KB/s — measured at 156 SECONDS for an image drawn at 56x56, on every page, which is why `window.load` never fired anywhere and why Lighthouse runs kept failing outright. The same artwork, sized to what it is drawn at, is 3,552 bytes and is now served from `public/brand/`. After: `window.load` fires on every page and no Jotform bytes are fetched until the reader opens the chat.)
- [x] Fix the onboarding service cards rendering white on orange. (`.ob__svcT b` hard-coded `color: #fff` at (0,2,1), which beat the card variant; an earlier correction aimed at `h3, p` and silently missed because the markup is `b`/`em`. The label now inherits from the card, so the navy variant stays white and the orange one takes `--on-accent`.)
- [x] Wrap the onboarding facts list in a `<dl>`. (Six `dt`/`dd` pairs sat in plain `div`s, which is invalid and leaves the pairing unannounced to a screen reader.)
- [ ] Stop `wedigcreativity.vercel.app` being indexed. It serves the whole site with `index, follow`, which is a second complete copy competing with the canonical domain. Either `X-Robots-Tag: noindex` for that host or a permanent redirect. Highest-value SEO item and about an hour.
- [ ] Point the homepage and `/work` cards at the case-study pages that already exist, and put the outbound client link inside the case study. Fifteen of them are live and are currently getting no internal links.
- [ ] Replace the five page titles and meta descriptions with the measured set in `plans/WDC_Site_Audit_And_SEO_Plan.docx`. The homepage title currently omits web, branding, SEO and software.
- [ ] Add a skip-to-content link. There is none on any page.
- [ ] Move the six remaining raw `<img>` tags onto `next/image`.
- [ ] Decide on the six dedicated service URLs (`/services/<slug>`). Worth doing, but only one at a time and only where there is enough to say — six thin pages rank worse than one strong one. See the plans document.
- [ ] Re-check the two live claims about client numbers; the audit could not verify them and they read as overstated.
## 2. Authentication and email

- [x] Replace temporary environment-password auth with Better Auth backed by CockroachDB.
- [x] Protect every `/admin` route with a server-verified session and owner role.
- [ ] Complete login, logout, forgot-password, and reset-password flows.
- [ ] Wire password-reset emails through Truehost SMTP.
- [x] Generate/apply Better Auth database schema.
- [x] Seed `wedigcreativity@gmail.com` as owner with the supplied temporary password.
- [ ] Verify successful login, protected-route redirect, logout, and password reset locally.
- [x] Add the required auth/mail variables to the root environment template. (`.env.example` now also documents the R2 and Google variables, including which R2 value is which.)
- [x] Sync non-empty environment values to Doppler dev/stg/prd without overwriting the unresolved GitHub PAT.
- [x] Sync production environment values to Vercel, deploy the verified commit, and confirm canonical routes respond successfully.
- [ ] Verify a real SMTP delivery. (Production reached the mail server on 2026-09-12, but authentication was rejected with SMTP `535`; mailbox credentials or the accepted login identity still need correction.)
- [-] Re-sync the reset SMTP password from root `.env` to Doppler dev/stg/prd and Vercel without exposing it; redeploy and send a new production test email. (Doppler and Vercel values are updated; redeployment/test delivery in progress.)
- [ ] Enable Google sign-in through Better Auth using the configured Google client credentials.
- [ ] Keep Google auth owner-only; a valid Google account must not automatically gain admin access unless its email maps to an approved owner/staff row.
- [ ] Verify Google origin/callback configuration for apex, `www`, Vercel, and localhost without exposing credentials.

## 2A. Payments, invoices, and transaction integrity

- [ ] Inventory the newly added Paystack test/live environment key names without exposing values; sync them to Doppler and Vercel.
- [ ] Review Litch Consulting's relevant payment, invoice, webhook, reconciliation, and audit-log patterns; adapt only what fits WDC.
- [ ] Review Nomarc's local/private project and client-management flows; adopt only useful day-to-day patterns that fit WDC and keep the admin UX simple.
- [ ] Support multiple payment methods per invoice: Paystack, bank transfer, cash, POS, and a clearly labelled other method.
- [ ] Support deposits and partial payments; derive `Part paid`, `Paid`, and remaining balance from payment entries rather than a manually typed invoice total.
- [ ] Make manual “mark paid” create an attributed payment transaction with method, amount, date, reference or note, and acting admin; never silently flip invoice status.
- [ ] Keep append-only transaction history for every invoice; correct mistakes with attributed reversals or voids and retain the original evidence.
- [ ] Generate client receipts for successful payment entries and keep receipt numbering and linkage auditable regardless of payment method.
- [ ] Add lightweight income, expenditure, outstanding, overdue, and net views that reconcile to their underlying transactions.
- [ ] Add a concise admin activity feed for meaningful client/project events, payments, overdue items, submissions, deadlines, and actions needing attention.
- [ ] Use test keys outside production and live keys only in production; fail closed when a key or mode is inconsistent.
- [ ] Initialize Paystack payments server-side from a persisted invoice/order; never trust amount, currency, customer, or invoice state supplied by the browser.
- [ ] Add a signed Paystack webhook endpoint with raw-body HMAC verification, supported-event allowlisting, payload validation, and fast acknowledgement.
- [ ] Make webhook/callback processing idempotent by provider reference/event identity; duplicate delivery must not duplicate money or side effects.
- [ ] Verify every payment with Paystack server-to-server before marking an invoice paid; callback pages are status displays, not payment authority.
- [ ] Record append-only payment attempts/events and structured audit entries; exclude secrets, authorization headers, and excessive personal data from logs.
- [ ] Update invoice paid/part-paid/overpaid state atomically with the payment insert and retry Cockroach serialization failures safely.
- [ ] Handle abandoned, failed, reversed, refunded, disputed, underpaid, overpaid, duplicate, delayed, and out-of-order events explicitly.
- [ ] Add reconciliation views/actions for unmatched or inconsistent transactions and preserve provider payload evidence safely.
- [ ] Send payment receipts/alerts through the email service only after verified transaction commit; retries must not send duplicate receipts.
- [ ] Add permission checks, CSRF/origin protections where applicable, rate limits, safe redirects, and non-enumerating public errors.
- [ ] Add unit/integration/E2E tests for initialization, callback, valid and invalid webhook signatures, duplicates, retries, partial payment, and reconciliation.
- [ ] Publish the exact Paystack webhook and callback URLs after routes are implemented and deployed.

## 3. Performance and release verification

- [x] Skip the intro/preloader on mobile.
- [x] Delay Jotform until user intent.
- [x] Delay UserWay until user intent.
- [x] Load smooth-scroll/cursor motion only on capable desktop pointers.
- [x] Run lint, TypeScript, dependency audit, and production build.
- [ ] Run responsive visual QA: home, services, contact, login, 404, offline.
- [ ] Deploy the exact tested commit to Vercel.
- [ ] Rerun mobile Lighthouse on the canonical domain and target 90+.
- [-] Raise canonical-home mobile Lighthouse from the supplied 82 toward 90+ without regressing the supplied desktop 98; prioritise the 2.99s hero-text render delay, 3.8s LCP, 6.7s Speed Index, render-blocking CSS, forced reflow, and unused first-party JavaScript shown in the evidence.
- [ ] Record any remaining field/lab boundary honestly.

## 4. Admin product after frontend/auth milestone

### 4.0 Reference, scope, and release guardrails

- [x] Expand Section 4 into a dependency-ordered delivery plan covering the admin shell, daily dashboard, clients, projects, money, forms, communications, settings, persistence, storage, and verification.
- [x] Locate and inspect the actual local Litch Consulting admin implementation; use its admin shell, responsive navigation, topbar, information density, dashboard composition, and reusable UI states as the 1:1 parity reference.
- [ ] Build a route/component parity matrix for Litch and WDC; identify direct equivalents, WDC-specific additions, and Litch-only features that should not be copied.
- [ ] Capture desktop, tablet, and mobile reference screenshots for the Litch shell and every equivalent WDC admin route before visual implementation.
- [ ] Keep admin work isolated from Claude's public-frontend files through bridge claims, narrow commits, and section-boundary bridge updates.
- [ ] Keep every admin route private, no-store, noindex, server-authorized, and free of public-site animation, smooth scrolling, third-party FABs, and decorative loading work.
- [ ] Define the admin verification matrix: 320/360/390/768/1024/1440px, light/dark themes, keyboard-only navigation, empty/loading/error/populated states, and reduced motion.

### 4.1 Litch-parity admin shell and UI foundation

- [ ] Rebuild the WDC admin shell to match Litch 1:1: collapsible and pinnable desktop sidebar, temporary hover expansion, persistent preference, sticky topbar, and animated mobile drawer with backdrop and close-on-navigation.
- [ ] Match Litch's shell dimensions, spacing, radii, borders, shadows, typography hierarchy, icon sizing, active states, hover states, and responsive breakpoints while applying WDC's logo and established colour tokens.
- [ ] Add the Litch-style topbar with the active page title, responsive search/command trigger, theme control, notification bell, and account menu.
- [ ] Add accessible keyboard and dismissal behaviour for the mobile drawer, notification panel, account menu, command palette, and all modal/popover surfaces; restore focus after close.
- [ ] Keep primary navigation concise; group secondary tools under their parent section and place low-frequency items in the lower “General” group.
- [ ] Keep each admin/client sidebar to five or six primary destinations at most; Settings stays in the lower “General” group and sub-features live inside their parent page.
- [ ] Create reusable Litch-parity primitives for page headers, stat cards, panels, badges, tabs, data tables, filters, empty states, skeletons, error states, pagination, confirmation modals, toasts, charts, and export menus.
- [ ] Use Boneyard page-shaped skeletons for dashboard routes and data-heavy panels; capture the real responsive geometry so loading states automatically track current UI structure, preserve dimensions, and avoid CLS after future design changes.
- [ ] Add a Boneyard rebuild/check step whenever a mirrored page or component layout changes; exclude interactive chrome and decorative SVG detail that should not become skeleton bones.
- [ ] Give every first-use empty state a friendly icon or simple visual, a plain explanation of what belongs there and why it matters, and one clear next-step CTA such as “Add your first client”.
- [ ] Distinguish first-use, cleared, filtered/no-results, permission-denied, and load-error states; provide clear-filters, request-access, retry, or create actions as appropriate instead of reusing one generic blank state.
- [ ] Keep empty-state copy specific to the current admin/client task, concise, and action-oriented; never leave an empty table frame or dead blank panel.
- [ ] Ensure tables use tabular numerals, sticky or persistent context where useful, bounded horizontal scrolling, useful mobile row alternatives, and no page-level horizontal overflow.
- [ ] Give every admin mutation an immediate pending state, clear success/failure receipt, safe retry path, and protection against duplicate submission.
- [ ] Verify the shell and primitives visually against Litch at all target widths before building deeper routes.

### 4.2 Daily admin dashboard

- [ ] Recompose `/admin` to match Litch's dashboard structure: personal greeting and one clear primary action, compact KPI row, wide work column, and responsive right rail.
- [ ] Add an “Attention needed” queue for overdue invoices, stalled onboarding, approaching deadlines, revision requests, failed payments/uploads, and unread client actions; each item must link directly to the resolution screen.
- [ ] Add a project pipeline strip with useful stage counts and one-click filtered navigation.
- [ ] Add billed-versus-collected trends, collection rate, outstanding and overdue totals, lightweight income versus expenditure, and accounts-receivable aging backed by transaction data.
- [ ] Add recent payments, recent clients/leads, upcoming deadlines or meetings, incomplete onboarding, and meaningful activity without duplicating the attention queue.
- [ ] Add Litch-style quick actions for a new client, project, invoice, payment, expense, and onboarding link; show only actions the current role can perform.
- [ ] Support a useful empty first-run dashboard and compact loading/error states rather than displaying fictional production data.
- [ ] Verify every dashboard number reconciles to its underlying filtered records and every card/action links to the correct destination.

### 4.3 Clients and client workspace

- [ ] Rebuild the client list to Litch parity with responsive search, service/status filters, sortable columns, useful counts, accessible pagination, export, and a focused new-client action.
- [ ] Support create, edit, archive, restore, merge/duplicate review, notes, tags, multiple contacts, communication preferences, and client-level access status without crowding the default view.
- [ ] Build a unified client detail workspace with overview, projects, invoices/payments, forms/submissions, files, communications, notes, and an append-only activity timeline.
- [ ] Add client quick actions for a project, invoice, payment, onboarding request, portal invitation, message/WhatsApp handoff, note, and file upload.
- [ ] Keep personal and company identity distinct; normalize email and phone data, prevent accidental duplicate clients, and preserve archived records referenced by money or projects.
- [ ] Show invitation state, last portal activity, agreed communication channel, and whether Google or password sign-in is linked without exposing authentication secrets.
- [ ] Implement a personalized, expiring, one-time, email-bound client invitation; account creation remains optional and never grants admin access.
- [ ] Add Google link/unlink in client account settings; require another usable sign-in method before unlinking the final identity.

### 4.4 Projects and day-to-day delivery

- [ ] Rebuild the project list and detail pages to Litch parity with responsive filters, status/stage views, owners, clients, services, health, dates, and clear next actions.
- [ ] Add a simple board/list switch using the shared WDC stages; vertical page scrolling must remain native and mobile cards must not trap gestures.
- [ ] Support project creation from a client or accepted onboarding submission, with service, scope, owner, dates, budget, communication channel, and client-visibility defaults.
- [ ] Add milestones, tasks, assignees, due dates, priorities, dependencies, checklists, comments, and lightweight recurring work without turning the default screen into a complex project-management suite.
- [ ] Add concise daily/weekly updates with health, progress, blockers, decisions, next steps, and client-visible/internal visibility controls.
- [ ] Add deliverables, versioned files, approval/revision requests, decisions, and an append-only project activity timeline.
- [ ] Surface overdue, blocked, waiting-on-client, revision, and upcoming-deadline states in the project workspace and dashboard attention queue.
- [ ] Record the agreed project communication route: client dashboard/chat, direct chat, WhatsApp project group where appropriate, or another agreed channel.
- [ ] Make project completion archive-safe; preserve invoices, payments, files, updates, approvals, and client access history.

### 4.5 Money, invoices, payments, and expenditure

- [ ] Rebuild Money to Litch parity with overview, invoices, payments, receipts, expenses/accounting, exports, and useful filters while retaining WDC's concise primary navigation.
- [ ] Add estimates/quotes and invoices with immutable numbering, line items, discounts, tax, currency, issue/due dates, project linkage, notes, terms, preview, PDF, send, duplicate, void, and reminder actions.
- [ ] Support Paystack, bank transfer, cash, POS, and a clearly labelled other payment method on the same invoice.
- [ ] Support deposits, partial payments, overpayments, refunds, reversals, voids, and balance carry-forward; derive invoice status and balance from payment entries.
- [ ] Make manual “mark paid” create an attributed payment transaction with amount, method, date, reference/evidence, note, and acting admin; never silently flip an invoice status.
- [ ] Keep payment and invoice event histories append-only; correct mistakes through attributed reversals/voids and retain original evidence.
- [ ] Generate auditable receipts for every successful payment regardless of method, with unique numbering, invoice/client/project linkage, PDF/download, and resend history.
- [ ] Add expenses with category, vendor/payee, date, amount, method, project/client allocation, receipt attachment, notes, and acting admin.
- [ ] Add cashflow, income, expenditure, outstanding, overdue, net, collection rate, and accounts-receivable aging views that drill into and reconcile with their source transactions.
- [ ] Add payment reconciliation for unmatched or duplicate provider events, transfers without invoices, failed verification, and administrator resolution notes.
- [ ] Implement Paystack initialization, callback display, server-to-server verification, signed idempotent webhook handling, mode safety, and append-only provider events.
- [ ] Ensure financial writes are transactional, integer-minor-unit based, server-validated, role-authorized, idempotent, and audited.

### 4.6 Forms, builder, onboarding, and submissions

- [ ] Consolidate the supplied Fluent Forms exports and research into a concise WDC form-builder specification covering field types, validation, conditional logic, calculated/default values, notifications, confirmations, exports, and accessibility.
- [ ] Rebuild Forms to Litch parity with draft/published/archived states, submission counts, last activity, duplication, preview, share link, and clear primary actions.
- [ ] Build a responsive form editor with sections/steps, reusable fields, labels/helpers/placeholders, option editing, required state, ordering, conditional visibility, and live preview without a heavy drag-and-drop dependency.
- [ ] Support text, textarea, email, phone, number, date, URL, radio, checkbox, multi-select, short/long dropdown, searchable long list, address/country, consent, and file upload controls.
- [ ] Use normal dropdowns for ten or fewer options and searchable, bounded, touch-scrollable lists for longer choices; popovers must render above every global control.
- [ ] Add versioned publishing so existing submissions retain the schema they answered; prevent destructive edits without an explicit new version.
- [ ] Build a submission inbox with status, service, client/project link, assignee, tags, search/filter/export, detail view, internal notes, and activity history.
- [ ] Convert a valid submission into or attach it to a client and project without duplicating people or losing the original answers/files.
- [ ] Finish conditional question sets, domain suggestions/checks, client fatigue validation, and completion/resume testing for every onboarding service.

### 4.7 Communications and client portal handoff

- [ ] Send a personalized next-steps/thank-you email after successful onboarding, including the agreed next steps and the optional account invitation.
- [ ] State that project communication may use the client dashboard, direct chat, a WhatsApp project group where appropriate, or another agreed channel.
- [ ] Add reusable, editable templates for onboarding receipt, invitation, invoice, payment receipt, reminder, project update, approval request, and completion messages.
- [ ] Keep a concise communication log on the client and project records with channel, direction, subject/summary, delivery state, timestamp, sender, and related entity.
- [ ] Provide explicit WhatsApp handoff actions without pretending the website can read or sync WhatsApp messages unless a real approved integration is added.
- [ ] Add notification preferences, quiet/failure handling, resend controls, and delivery audit data without storing full provider payloads or credentials.
- [ ] Give clients a simple portal view of their projects, updates, invoices/payments, files, approvals, forms, and agreed communication route; keep internal notes and admin-only money data private.
- [ ] Build the client dashboard with the same Litch-parity shell quality but a simpler client-first information architecture: Overview, Projects, Billing, Forms & files, Messages/support, and Settings at most.
- [ ] Add the client-use-case areas Litch currently lacks: project progress/health, milestones and next steps, update history, deliverable versions, approvals/revision requests, onboarding status, agreed communication channel, and a single “what do I need to do?” queue.
- [ ] Let clients download invoices/receipts, see partial-payment history and remaining balance, upload requested files, answer forms, approve work, request a revision, and reply to project updates without exposing internal operational data.

### 4.8 Settings, content, team access, and audit

- [ ] Rebuild Settings to Litch parity with grouped navigation for business profile, branding, services/content, finance defaults, payment methods, email/templates, integrations, team, security, and data.
- [ ] Add business identity, invoice/receipt numbering, currency/tax, payment instructions, due/reminder defaults, and document branding settings with preview and validation.
- [ ] Add service catalogue and onboarding-template management without exposing implementation-only configuration to day-to-day users.
- [ ] Add owner/staff roles and least-privilege permissions for clients, projects, money, forms, content, settings, exports, and destructive actions.
- [ ] Preserve last-owner/self-change guards, session revocation, invitation expiry, and a clear staff access/activity view.
- [ ] Add an append-only audit log for authentication, role, client, project, form, file, invoice, payment, expense, integration, and settings changes with safe before/after summaries.
- [ ] Add content-management entry points only for public content that genuinely needs editing; avoid rebuilding a general-purpose CMS.
- [ ] Show honest integration health and “coming soon” states; never display a control as working before its backend is verified.

### 4.9 CockroachDB, R2, and backend integrity

- [ ] Replace every remaining in-memory admin read/write with repository/query modules backed by CockroachDB; remove fictional seed data from production paths.
- [ ] Design and apply explicit migrations for clients/contacts, projects/tasks/updates, forms/versions/submissions, invoices/lines, payments/events, expenses, receipts, communications, invitations, files, notifications, and audit records.
- [ ] Add constraints, indexes, normalized identifiers, foreign-key/archive policy, timestamps, actor attribution, and idempotency keys; review migration storage and rollback risk before applying production changes.
- [ ] Use short retryable transactions for multi-record invariants; prevent duplicate invoice numbers, receipts, invitations, webhook events, payments, and form conversions.
- [-] Connect document/upload workflows to Cloudflare R2. (`lib/r2.ts` signs presigned PUTs with SigV4 and no new dependency; `POST /api/onboarding/upload` authorises one file against the caller's draft, choosing the key, content type and 25MB ceiling server-side, and fails closed naming the missing variable. Files land under `onboarding/<draftId>/`. BLOCKED on one value: `R2_ACCOUNT_ID`, the subdomain of the bucket's S3 API endpoint.)
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

## 5. React Joyride tours for admin and client dashboards

### 5.0 Tour architecture and content

- [ ] Add React Joyride only to authenticated dashboard bundles; lazy-load it after the dashboard is interactive and never include it in public marketing routes.
- [ ] Create separate typed tour registries for admin and client experiences, with one full walkthrough and independently launchable page-only tours.
- [ ] Keep tour copy task-oriented and concise: explain the outcome, identify the control, and tell the user what to do next without narrating obvious UI.
- [ ] Give every tour target a stable semantic `data-tour` identifier that survives layout and copy changes; do not target generated classes or DOM position.
- [ ] Define versioned tour IDs so meaningful product changes can offer an updated tour without repeatedly showing completed old tours.

### 5.1 Full walkthroughs

- [ ] Build the admin full walkthrough around the real daily workflow: attention queue, clients, projects/updates, invoices/payments, forms/submissions, communications, search/quick actions, notifications, and settings.
- [ ] Build the client full walkthrough around the real client workflow: required actions, project status/updates, deliverables/approvals, invoices/payments/receipts, forms/files, messages/support, and account settings.
- [ ] Allow the full walkthrough to navigate between pages safely while preserving the current step, waiting for the next target to mount, and handling a missing/unauthorized target gracefully.
- [ ] Offer full tours on first eligible sign-in and from a persistent “Take a tour” entry; never block the dashboard if dismissed.

### 5.2 Page-only tours

- [ ] Add a short page tour launcher to each major admin and client page; page tours start and finish without changing routes.
- [ ] Keep page tours focused on the page's primary task and non-obvious controls, usually three to seven steps rather than exhaustive tours.
- [ ] Maintain separate completion state for every page tour so users can replay one page without resetting the full walkthrough.
- [ ] Ensure dynamically loaded tables, tabs, drawers, empty states, and responsive variants provide valid alternate targets or skip logic.

### 5.3 UX, accessibility, state, and verification

- [ ] Style React Joyride tooltips, beacons, buttons, overlays, progress, and focus treatment to match the WDC/Litch-parity dashboard in both themes.
- [ ] Keep Joyride above dashboard popovers but below critical system dialogs; prevent clipping, off-screen placement, background scrolling, and collisions with mobile safe areas.
- [ ] Support keyboard navigation, Escape/dismissal, readable focus order, screen-reader labels, reduced motion, and minimum 44px touch targets.
- [ ] Persist tour progress/completion per authenticated account and role in CockroachDB; local storage may cache UI state but is not the cross-device source of truth.
- [ ] Never show admin-only steps to clients or staff without the relevant permission; filter steps before a tour begins.
- [ ] Add “Skip tour”, “Back”, “Next”, “Finish”, and “Restart tour” behaviour with clear neutral button contrast and no dark patterns.
- [ ] Instrument only privacy-safe tour events: started, step reached, skipped, completed, replayed, tour/version, role, and page; never capture field contents.
- [ ] Test full and page-only tours at all dashboard breakpoints, themes, permissions, empty/populated states, keyboard-only mode, reduced motion, and route transitions.
