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
- [x] Apply WDC typography consistently to onboarding: Space Grotesk for headings and prominent display copy; the body token for body, descriptions, labels, helper text, and controls, with responsive sizing. (Confirmed with the user that Space Grotesk alone is fine. A  token now carries the body side so the split is expressed in the stylesheets rather than waiting on a font file; both resolve to Space Grotesk today, so one line changes it if a second face is ever licensed.)
- [x] Encode concise WDC design, typography, accessibility, SEO, dependency, rendering, media, animation, and Core Web Vitals conventions in repository `AGENTS.md` and `CLAUDE.md` guidance.
- [x] Install and review `karpathy-guidelines`; merge its simplicity, surgical-change, explicit-assumption, and verifiable-success rules into repository guidance.
- [x] Remove the redundant “Opens the full contact form with your details carried over.” helper wherever it appears. (Verified absent from the codebase.)
- [ ] Remove or neutralise the orange outline on the intro technology/logo card; use white only if an outline remains.
- [x] Add responsive separation between the intro gallery arc and its text so neither overlaps at any supported viewport. (The arc apex was a fixed fraction of viewport height, which cannot know how tall a paragraph that rewraps with width is. The statement block is now measured and the apex clears it, with the old fraction kept only as a floor.)
- [x] Reduce the hero/media overlay enough to reveal the imagery while retaining text contrast and readability. (Measured off the image pixels behind the headline: the photograph is BRIGHT there, luminance 0.75, so white type needs a 0.76 black overlay to clear 4.5:1 and the flat 0.55 veil was under even the 3:1 allowed for large text. Reshaped rather than reduced: a 30% base so the picture reads across the frame, plus an elliptical scrim on the copy. Measured after: 16-19:1 behind the headline in both themes.)
- [x] Audit all internal and external links across headers, footers, cards, CTAs, forms, legal pages, previews, and error/offline states; correct destinations, fragments, stale paths, and broken links. (`tests/links.spec.ts` walks every public page, resolves each internal destination and asserts every in-page fragment has a real target.)
- [x] Improve delivery of the slow-loading selected-brand-work images using measured formats, responsive sizes, prioritisation, and lazy-loading choices without creating layout shifts. (Rendered widths measured at 360/412/620/768/900/1280/1600 and every `sizes` clause reset to just above the widest real width in its range; one clause was UNDER the real width and was upscaling.)
- [x] Align the desktop Jotform and UserWay launchers to the same horizontal baseline after the third-party widget is rendered. (Verified with the real widget loaded, not the facade: the native launcher and the UserWay disc both sit exactly 26px from the bottom. Note its LEFT gutter measured 42px against 26px on the right, which is Jotform's own inner padding and is tracked separately.)
- [-] Make /services respond and scroll smoothly. (Profiled at 4x CPU throttling: 81.6% of scroll time was  -- style, layout and paint, not script -- with 1,356 style recalculations against the homepage's 1,608 costing twice as much each. Root cause:  mounted each demo once and then disconnected its observer, so all six ran timers for the rest of the visit, off screen. A non-latching live gate now pauses them: measured sitting still with all six mounted and none on screen, stage mutations went from six demos running to ZERO, and a full scroll dropped from 1,413 DOM mutations to ~1,070. Still to do: the visible marquee writes a transform every frame.)
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
- [ ] Re-audit every onboarding dropdown for a bounded, touch-scrollable option panel; use search automatically for long lists such as countries and any list with more than ten options.
- [ ] Use a simple non-searchable dropdown for lists of ten or fewer options; keep search for longer lists, and ensure every open dropdown/popover renders above Jotform, UserWay, and back-to-top controls.
- [ ] Fix exclusive multi-select behaviour so choosing “I'm not sure; please advise me” clears other choices, and choosing any concrete choice afterwards clears the uncertainty choice instead of blocking selection.
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

## 2. Authentication and email

- [x] Replace temporary environment-password auth with Better Auth backed by CockroachDB.
- [x] Protect every `/admin` route with a server-verified session and owner role.
- [ ] Complete login, logout, forgot-password, and reset-password flows.
- [ ] Wire password-reset emails through Truehost SMTP.
- [x] Generate/apply Better Auth database schema.
- [x] Seed `wedigcreativity@gmail.com` as owner with the supplied temporary password.
- [ ] Verify successful login, protected-route redirect, logout, and password reset locally.
- [ ] Add the required auth/mail variables to the root environment template.
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

- [ ] Consolidate Fluent Forms research into the WDC form-builder specification.
- [ ] Dashboard: plan, design, implement, and verify.
- [ ] Clients: plan, design, implement, and verify.
- [ ] Projects: plan, design, implement, and verify.
- [ ] Money/invoices: plan, design, implement, and verify.
- [ ] Forms/builder/submissions: plan, design, implement, and verify.
- [ ] Settings/content/team access: plan, design, implement, and verify.
- [ ] Replace remaining in-memory admin data paths with CockroachDB persistence.
- [ ] Connect document/upload workflows to Cloudflare R2.
