# WDC implementation checklist

Status key: `[ ]` not started, `[-]` in progress, `[x]` done and verified.

Ordering rule: always keep `[ ]` and `[-]` items in `# Open` at the top, and
move every `[x]` item into the `# Done

` archive at the bottom when updating
this checklist. Never leave completed work mixed into the open queue.

**Open work is below. Everything already delivered is archived at the end** —
kept rather than deleted, because each line records what was measured and why,
and that is the only defence against redoing work or reintroducing a bug that
was already understood once.

At last update: **132 open** (15 of them in progress), **319 done**.

---

# Open

### From screenshots, 2026-09-14

  THE PANEL HAD NO STYLESHEET ON THE CONTACT PAGE. `picker.css` was imported by `onboarding-form.tsx` and by nothing else, so the contact form rendered the closed control correctly and then opened an unstyled, in-flow list of 245 rows -- no border, no ground, no elevation, no row padding, and a search icon rendered at three rows tall because a lucide glyph has no intrinsic size. It pushed the page down, so scrolling it meant scrolling the whole site. Both stylesheets are now imported by the components themselves; a control whose appearance depends on an import somewhere else will eventually be dropped somewhere else.

  THE BOX INSIDE THE BOX CAME BACK, in the other form. The reset that stops the number input drawing its own border inside the bar's border named `.ob__f`, the onboarding wrapper. On the contact page the ring came from `.ct-f input:focus`'s BOX-SHADOW, which a rule about borders never touched. Rewritten against the control's own ancestry -- `.pv .ph .ph__num:focus` outranks any `.wrapper input:focus` a form can write, including one nobody has written yet.

  AND THE COUNTRY BUTTON'S OWN OUTLINE WENT WITH IT: `:focus-within` already rings the whole bar, so a second orange rectangle inside it was the same fault in a different place. A tint marks which half has focus without drawing another edge.

  THE PANEL NOW FLIPS. A dropdown that only ever drops downward is off screen when the field is near the foot of the window, which no amount of styling fixes. `usePickerOpen` measures the room below against the room above on open and on resize, and only flips when there genuinely is not room AND up is roomier -- a panel that flips for eight pixels is worse than one slightly clipped, because the reader cannot predict where it appears. Measured at 1280x900 with the field 150px off the bottom: panel top 392, bottom 740.

  ROWS READ AS ROWS: flag, name, and the dial code in parentheses beside it, with a tick on the chosen one rather than a dot -- a dot says something is true about the row, a tick says which one is selected. 44px minimum, 48px on a phone. On a phone the panel is a bottom sheet with a grab handle and a scrim, and the scrim is the open control's own pseudo-element so no consumer renders an extra node and none can forget to.

  NOT VERIFIED, AND SAID RATHER THAN CLAIMED: the scrollbar's appearance. `::-webkit-scrollbar` painted nothing in this headless engine -- a thumb forced to solid red did not appear in a screenshot, though the gutter reserved its 10px -- so the list uses `scrollbar-width`/`scrollbar-color`, which is what `work.css` and `preview.css` already use for this site's rails.

  STILL A PLAIN TEXT FIELD: the admin client form's Phone. It never had the picker, so it never had the fault; giving it one means porting `--paper`, `--rule` and `--ink` into the admin scope, which is a deliberate change rather than part of this fix.

  Pinned by `tests/phone-field.spec.ts`, seven cases that walk BOTH forms: the panel is positioned, has a ground and has elevation; the list scrolls itself with `overscroll-behavior: contain` and `data-lenis-prevent`; the number input draws no border, radius, shadow or outline while the bar does; the panel stays inside the window when the field is low; and the sheet is full width at the bottom edge with a scrim and does not widen the page.

  THE NOUN IS A PROP, because the accessible names say what is being shared and seven buttons reading "this post" on a case study would simply be wrong. Nothing visible changes with it.

  IT SITS BELOW THE ARTICLE, IN ITS OWN ROW, on every page that has a contents rail. A sticky element releases at the edge of its grid area, so a share row inside the same row as the rail leaves the rail travelling beside a QR code long after there is any heading left to point at.

  THE CANONICAL ADDRESS IS BUILT ONCE PER PAGE and passed to the structured data, the share links and the code together. The case study was carrying four hand-typed copies of the same template literal, which is three chances for one to point elsewhere after a route moves.

  CODES DECODED, NOT EYEBALLED: jsQR at 1x, 2x and 3x on a case study, a discipline page and a second case study, nine reads, all clean at the default 136px box. Checked at 320, 390 and 1280 with no horizontal overflow, and the row wraps to two lines at 320 rather than pushing the page wide. Pinned by `tests/share.spec.ts`: every link on both work pages must carry the page's own canonical URL, the code must have modules in it, copy must announce itself, and the article must still end the way it did.

  Found on the way: `playwright.config.ts` asked for `channel: "chrome"`, and a container with a Chromium but no Chrome fails to launch on every test at once, which reads like a broken suite rather than a missing binary. `WDC_E2E_CHROME` now points it at a named binary; unset, nothing changes.

  NO JAVASCRIPT AT ALL. Not "a small amount": none. One CSS animation on a server-rendered element, so it costs no bundle, no hydration and no main-thread work beyond compositing. That matters more here than anywhere else on the site, because this page is reached on a phone on Nigerian mobile data immediately after somebody has parted with money. A test counts the scripts the page requests so a client component cannot creep in later.

  IT PRINTS THE TOP LINE FIRST, which the obvious build gets backwards. Translating the slip down out of a clip means its BOTTOM edge enters first: you watch "Thank you" and the torn edge appear and the amount arrives last. Caught by sampling the animation at 39% rather than by watching it. The paper does not move now; it is revealed top-down with `clip-path: inset()` in `steps(24)` over 1.4s, about 58ms a line, which is close to what a real till roll does and is the single thing that makes it read as printing rather than as a card sliding out.

  THE STAGE IS DARK BECAUSE PAPER ONLY LOOKS LIKE PAPER AGAINST SOMETHING THAT IS NOT. The first build was a white slip on a white sheet: the feed, the teeth and the shadow were all correct and none of it was visible. The brand navy does the job the reference does with black. The torn edge is a conic-gradient mask rather than an image, so the drop shadow follows the same shape and there is nothing to download.

  NO LOGO ON THE SLIP, on purpose. `/r/<token>` is the receipt and carries the mark; this is the moment, not the record, and branding it twice would make the animation look like the thing to keep. It uses our own two faces with tabular figures rather than a monospace, which is what makes it look like our document instead of a generic till roll.

  Measured at 320, 360, 390, 430, 768, 1280 and 1920: no horizontal overflow anywhere and the slip always inside its stage. At 320 the receipt number was wrapping across two lines, which is the one thing a reference must never do, so the detail values hold one line and the label beside them gives way instead.

  WHAT WAS ACTUALLY WRONG, measured rather than eyeballed. Fields were 39px tall, which is a mouse target and not a thumb one; the site's floor is 44px and the admin is not exempt. There was no hover state at all. Focus was an `outline`, which sits outside the box and gets clipped by the dialog's own overflow on the fields nearest its edge; it is a box-shadow ring now, which follows the border radius and never clips. And the select's caret was two 45-degree linear-gradients meeting in a corner, which is the old CSS trick for an arrowhead and looks like one: a filled wedge among stroked glyphs. It is a real chevron now, masked from one shared inline SVG so the select and anything else that grows a caret cannot drift apart, and it takes the accent on focus like the border does.

  AND THE ONE THING NATIVE GENUINELY DOES BADLY. A date input renders in the BROWSER's language, not the page's, and nothing on our side changes that: the same due date reads 09/14 on one laptop and 14/09 on the next, and for any day of the month under thirteen there is no telling them apart by looking. On an invoice date that is not a nicety. The picker stays native; underneath it there is now an echo in words, fixed to en-GB so it says the same thing to everybody -- "Monday 14 September 2026". No dependency and no second calendar to maintain.

  Found while doing it: the 44px floor had leaked onto tick boxes, whose rows went 60px tall with the box stranded at the bottom. The checkbox reset had to grow again; it now resets height and min-height as well, and the note there says why it has grown twice.

  THE OBSERVER IS NOW SHARED. There were about to be three copies of the same IntersectionObserver with the same band and the same comment -- legal wrote it, the blog copied it, and this would have copied it again. `components/ui/use-active-heading.ts` is the one copy; all three rails call it. The band is unchanged: `-30% 0px -55% 0px`, a strip across the upper middle, so the heading that lights up is the one being READ rather than the one that has just appeared at the bottom.

  THE RAIL IS FIRST IN THE DOM AND SECOND ON THE PAGE. Below 1001px there is no second column and it stacks, and a contents list under the thing it lists is a list nobody uses; the grid places it right on a wide screen without changing the order a screen reader or a narrow viewport sees. It collapses to a `<details>` on a phone, like the blog's.

  Pinned by `tests/work-toc.spec.ts`, which walks EVERY case study on the site and asserts every rail link resolves to exactly one element. The rail's ids and the section ids are declared in two places and two entries are conditional, so nothing in TypeScript can catch a dead anchor -- it is a valid string either way, and the reader just clicks and the page does not move.

Kept at the top because these came from someone looking at the live site, and
that is the shortest feedback loop there is.

- [ ] Truehost SMTP takes about 23 seconds just to authenticate, measured from two networks. The contact form now answers in half that by sending the receipt after the response, but the real fix is a transactional provider, which would also give proper SPF and DKIM.

### From live testing, 2026-09-17

The admin was loaded through the same door the skeleton capture script uses
(`BONEYARD_CAPTURE_TOKEN` plus a local Postgres for the auth tables) and
walked with Playwright, console and network errors watched throughout rather
than assumed clean. Two real faults came out of that, both fixed and pinned,
and one is only half fixed -- said plainly below rather than folded into the
"done" pile.

- [ ] **A missing admin id answers HTTP 200, not 404**, on all four dynamic
  detail routes (`clients/[id]`, `projects/[id]`, `money/[id]`,
  `forms/[id]`). Reproduced three ways -- curl, Node's own `fetch`, and
  Playwright, all against a production `next start` build as well as `next
  dev` -- so it is not a proxy or tooling artefact. `notFound()` fires (the
  page correctly renders `app/admin/not-found.tsx`, added below) but the
  response status stays 200. Moving the `notFound()` call into
  `generateMetadata`, which runs before the page body and is the pattern
  Next.js documents for exactly this race, made no difference. Every route
  everywhere ELSE on the site (`/blog/<missing>`, `/work/<missing>`, an
  unmatched path) returns a correct 404, including an unmatched path under
  `/admin` itself -- only a `notFound()` called from *inside* a page nested
  under the admin's `force-dynamic` layout is affected. Reads as a Next
  16.3.5 framework interaction rather than anything in this app's own code,
  worth a minimal reproduction filed upstream or an upgrade once one lands,
  not a workaround bolted on here.
  Kept open rather than folded into the fixes below because it is not
  actually fixed.

## 1A. Client onboarding experience

- [-] Make Save and continue later create a securely hashed, single-purpose resume token and email the link through Truehost SMTP. (Token flow is complete; Truehost currently rejects SMTP authentication with `535`.)
- [ ] After successful onboarding, send the client a personalized next-steps email; explain that project communication may use the client dashboard, direct chat, a WhatsApp project group where appropriate, or another agreed channel.
- [ ] Keep client account creation optional in that email; bind its expiring, single-purpose invitation to the onboarded recipient so a forwarded link cannot register a different email address.
- [ ] Let authenticated clients link or unlink Google in account settings; require another usable sign-in method before unlinking their last identity.
- [ ] Bind each client invitation to the intended normalized email and project/client record; store only a token hash, set an expiry, enforce one-time redemption, and reject email substitution or replay.
- [ ] Let an invited client create credentials or continue with an approved Google identity without granting admin access; keep the project relationship attached to the same client account.
- [ ] BLOCKED, needs the files: audit the supplied Fluent Forms exports for where dropdowns, radios, checkboxes, multi-selects and free text are intentionally used. No Fluent Forms export exists anywhere in this repo (checked 2026-09-14), so there is nothing to audit against. The client's own forms have clearly been consulted before -- the social step's nine conditional handle fields cite them -- so the exports exist somewhere; they need to be added to `plans/` before this can be done.

## 1B. Free tools on the service pages

Small tools that give a visitor something real in under thirty seconds. They
are the difference between saying we can do the work and showing it, and each
one ends with a lead we did not have to ask a stranger for.

Two findings shape all of them. There are no per-service routes -- `/services`
is one client page with six anchors -- so each tool is its own server-rendered
route at `/tools/<name>`, indexable in its own right and linked from the
matching `#slug` section. And `connect-src 'self'` in `next.config.ts` means a
browser cannot call a third-party API at all: every one of these goes through
our own route handler, which is the rule anyway. Client cost below is what a
reader downloads; the work is server-side, as in `lib/qr.ts`.

**All four of this section's tools shipped on 2026-09-15** and are archived in
`# Done`. `/tools/estimate`, `/tools/link-preview` and `/tools/seo` are live,
indexable, in the sitemap and linked from their service pages; the Nigerian
data-cost panel is part of the SEO result rather than a page of its own. What
is left of this section is the list below, which was always "later".

ONE THING NEEDS AN ENVIRONMENT VARIABLE BEFORE IT IS WHOLE: `PAGESPEED_API_KEY`
is not set on any environment, so the Lighthouse half of `/tools/seo` reports
as unavailable and the report email says a person will run it by hand. The tool
works without it -- that is rule 1 of the programme -- but the key is worth
twenty minutes.

**Three more shipped on 2026-09-16** and are archived in `# Done`: the
contrast checker, the readability checker and the ad budget & reach
calculator. All three are pure, Class A, no network and no key -- there was
never a reason for them to wait on anything.

**Two more shipped on 2026-09-17** and are archived in `# Done`: the brand
asset pack and the single-page broken-link check. That was the rest of the
"later" list except the CrUX card, which is Class B and stays open below.

Later: a CrUX field-data card beside the audit (free, 150 queries a minute,
sub-second, but it is a Google Cloud key -- Class B, same as PageSpeed --
rather than something to build blind). (The AI running-cost calculator came
off this list on 2026-09-15 and is archived in `# Done`.)

Deliberately not building: anything needing headless Chrome (Unlighthouse,
Puppeteer, axe-core run by us) -- PageSpeed Insights already runs Lighthouse
and axe for free, and a browser binary does not fit a serverless function; the
`psi` package, which wraps one URL; Domainr, whose standalone API is deprecated
and which answers a question RDAP answers free; WHOIS on port 43, which is
free-text parsing per registry over an unreliable outbound port; competitor
keyword or backlink data, where no free tier permits a public tool and
everything claiming otherwise is scraping; and any client-side call to a third
party, which our own CSP blocks and which we should not loosen it for.

## 2. Authentication and email

- [ ] **Mail is delivered but filed as spam by Gmail.** Diagnosed and written up in `plans/email-deliverability.md`. Authentication is NOT the headline problem: SPF lists the sending IP and aligns, a DKIM key is published on the `default` selector, MX is correct. The problems, in order: (1) the reverse DNS for `94.23.160.111` is `rbx107b.superfasthost.cloud`, a generic PTR on a SHARED IP, so forward-confirmed reverse DNS fails and our reputation is the average of everyone else on that box; (2) DMARC is `p=none` with no `rua`, so there is no policy and no reports; (3) SPF ends `~all`. Order of work: publish a DMARC record with `rua` (costs nothing, breaks nothing), ask Truehost about the PTR and a dedicated IP, read two weeks of reports, then move to `p=quarantine` and `-all`.
- [ ] Truehost's OUTBOUND filter scores what we send and will discard it with `550 Message discarded as high-probability spam`. Found the hard way: a test enquiry whose body read like a diagnostic ("test", "confirm the mail path end to end", "no reply needed") was rejected, while the identical route with an ordinary customer enquiry was accepted. Verified separately that the message SHAPE is fine -- plain text, our HTML blob, and the HTML with a Reply-To were all accepted when sent directly. Consequence: never test this path with text that reads like a test, and treat a 550 as content scoring rather than a broken form.

- [-] Re-sync the reset SMTP password from root `.env` to Doppler dev/stg/prd and Vercel without exposing it; redeploy and send a new production test email. (Doppler and Vercel values are updated; redeployment/test delivery in progress.)
- [ ] Verify a real SMTP delivery. (Production reached the mail server on 2026-09-12, but authentication was rejected with SMTP `535`; mailbox credentials or the accepted login identity still need correction.)
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

- [-] Raise canonical-home mobile Lighthouse from the supplied 82 toward 90+ without regressing the supplied desktop 98; prioritise the 2.99s hero-text render delay, 3.8s LCP, 6.7s Speed Index, render-blocking CSS, forced reflow, and unused first-party JavaScript shown in the evidence.
- [ ] Rerun mobile Lighthouse on the canonical domain and target 90+. BLOCKED: the PageSpeed Insights API returns 429 without a key, and local Lighthouse reports TBT about 10x worse than PSI, so it cannot give an honest absolute score. Needs a free PSI API key in the environment (25,000 queries a day). Field numbers measured directly meanwhile, live at 390px and 4x throttle: homepage LCP 1,708ms CLS 0.010, Services 1,944ms CLS 0, a service page 888ms CLS 0.002 (was 0.423 before the stage floor), Our Work 2,264ms CLS 0, Blog 1,492ms CLS 0. STILL BLOCKED as of this pass: PSI returns the same 429 without a key. See the newer local production-build numbers recorded below, and note the homepage CLS there reads 0.0563 rather than 0.010 because the hero is larger now, not because anything regressed.

### 4.0 Reference, scope, and release guardrails

- [ ] Capture desktop, tablet, and mobile reference screenshots for the Litch shell and every equivalent WDC admin route before visual implementation.
### 4.1 Litch-parity admin shell and UI foundation

- [ ] Match Litch's shell dimensions, spacing, radii, borders, shadows, typography hierarchy, icon sizing, active states, hover states, and responsive breakpoints while applying WDC's logo and established colour tokens.
- [ ] Create reusable Litch-parity primitives for page headers, stat cards, panels, badges, tabs, data tables, filters, empty states, skeletons, error states, pagination, confirmation modals, toasts, charts, and export menus.
- [ ] Distinguish first-use, cleared, filtered/no-results, permission-denied, and load-error states; provide clear-filters, request-access, retry, or create actions as appropriate instead of reusing one generic blank state.
- [ ] Ensure tables use tabular numerals, sticky or persistent context where useful, bounded horizontal scrolling, useful mobile row alternatives, and no page-level horizontal overflow.
- [ ] Give every admin mutation an immediate pending state, clear success/failure receipt, safe retry path, and protection against duplicate submission.
- [ ] Verify the shell and primitives visually against Litch at all target widths before building deeper routes.

### 4.2 Daily admin dashboard

Reconciled 2026-09-17: this section was marked entirely unstarted, and
`components/admin/dashboard-view.tsx` already does most of it -- the same
drift the older "Moved out of Open, 2026-09-14 (second pass)" note further
down this file already caught once for this exact section ("Marked done by
another agent but left in the open half"). Read line by line against the
running code rather than assumed from the file's own claims.

- [-] Overdue invoices, stalled onboarding, and project-derived reasons
  (blocked, waiting on a client, in revision, a slipped task) all feed one
  combined `attention` queue, sorted worst-first, every row linking straight
  to its resolution screen (`AdminDashboardView`). NOT built: failed
  payments/uploads and unread client actions -- both need a system that
  does not exist yet (Paystack is not wired; there is no client portal), so
  neither can honestly appear.
- [-] Outstanding, overdue, and a collection rate are on the KPI tiles;
  "Cashflow, last six months" charts collected income against recorded
  spend, which is the lightweight income-versus-expenditure view. NOT on
  this route: accounts-receivable aging, which exists (30-day buckets,
  drillable) but only on `/admin/money/reconciliation` -- it answers the
  question asked here, just from a different page.
- [-] Recent payments and upcoming deadlines are both rail panels, both now
  with a real empty state rather than a blank box (see the 2026-09-17
  closed entry). NOT built: a recent clients/leads panel -- there is
  nothing on `/admin` today naming who signed up or enquired most recently.
- [-] Quick actions has a new client, a new invoice (`InvoiceBuilder`), and
  a new expense. NOT built: a "new project" action in this panel
  specifically (it exists, but only as a header button, not beside the
  other three here), a standalone "record a payment" not tied to opening
  one invoice first, an onboarding-link action, and any role filtering --
  there is only one role (`owner`) wired today, so "show only what the
  role can do" has nothing to differ against yet.
- [x] A first-run dashboard with nothing in every store renders honestly:
  the KPI tiles show ₦0 rather than breaking, the pipeline strip shows
  every stage at zero, and every panel with a list now falls back to a
  real `Empty` state rather than a blank box. `app/admin/loading.tsx` and
  `app/admin/error.tsx` already cover the loading/error pair. The `DemoNote`
  banner discloses the seeded records are demonstration data rather than
  presenting them as real, which is the honest form this takes before the
  admin is on a real database.
- [ ] Verify every dashboard number reconciles to its underlying filtered
  records and every card/action links to the correct destination. NOT
  verified end to end -- the figures are derived from the same store
  functions Money's own pinned tests already exercise, but nobody has
  walked this specific route's numbers against the records one by one.

### 4.3 Clients and client workspace

- [ ] Support create, edit, archive, restore, merge/duplicate review, notes, tags, multiple contacts, communication preferences, and client-level access status without crowding the default view.
- [ ] Add client quick actions for a project, invoice, payment, onboarding request, portal invitation, message/WhatsApp handoff, note, and file upload.
- [ ] Keep personal and company identity distinct; normalize email and phone data, prevent accidental duplicate clients, and preserve archived records referenced by money or projects.
- [ ] Show invitation state, last portal activity, agreed communication channel, and whether Google or password sign-in is linked without exposing authentication secrets.
- [ ] Implement a personalized, expiring, one-time, email-bound client invitation; account creation remains optional and never grants admin access.
- [ ] Add Google link/unlink in client account settings; require another usable sign-in method before unlinking the final identity.

### 4.4 Projects and day-to-day delivery

- [-] Tasks are in, with assignee, due date, priority and ONE dependency, and ticking one writes a line on the project's history. Deliberately one dependency and not a list: a task waiting on two things waits on whichever finishes last, and modelling that properly means a graph, a cycle check and a topological sort for a screen that shows six rows. NOT DONE and not started: milestones, nested checklists, per-task comments and recurring work. The checklist's own instruction is not to turn the default screen into a project-management suite, so these want a deliberate decision rather than being added because the word appears in the line.

### 4.5 Money, invoices, payments, and expenditure

  ADDRESSED BY A RANDOM TOKEN, NEVER BY THE NUMBER. Invoice numbers are sequential by design -- that is what makes them auditable -- so a page at `/i/INV-2026-004` would hand anyone holding one invoice every other invoice the studio has raised, by subtracting one. The token is 128 bits from `crypto.getRandomValues`, it is the entire authorisation, and a wrong one gets a plain 404 rather than a message confirming the format was right. A draft has no public page at all. Pinned by `tests/money-documents.spec.ts`: the number 404s, a near-miss token 404s, a draft's token 404s.

  THE CODE WAS DECODED, NOT LOOKED AT, and the first attempt failed. These URLs carry a full absolute address plus a token, and the mark in the middle forces error-correction level H, so they need far more modules than a blog slug: at the 136px the blog rail uses, jsQR found NO code at all at 1x, 2x and 3x. Two fixes, both measured. The token moved from 32 hex characters to 22 base64url ones -- the same 128 bits, ten fewer characters of data. And `.qr__code`'s hard 136px cap became a variable, with the documents asking for 160px. All 36 decodes then passed. `content-visibility: auto` was also turned off for still codes: it exists to stop a looping animation below the fold, a still code has no loop, and it was leaving the code unrendered in a screenshot or print taken before it scrolled into view.

- [ ] Rebuild Money to Litch parity with overview, invoices, payments, receipts, expenses/accounting, exports, and useful filters while retaining WDC's concise primary navigation.
- [-] Estimates are built, with their own number series, their own public document and their own life.

  AN ESTIMATE IS NOT A DRAFT INVOICE, and building it as one would have been the easy mistake. A draft is a document the studio has not finished writing. An estimate is one it HAS finished and sent, waiting on somebody else -- so it has EST-YYYY-NNN of its own, an expiry rather than a due date, and a state only the client can move. Filed as drafts, the one thing nobody could answer is "what have we quoted and not heard back about", which is the question a pipeline is made of. A quote nobody takes must also not burn an invoice number.

  ACCEPTING RAISES A NEW INVOICE rather than converting the quote. The estimate keeps its number and its lines exactly as quoted; the invoice gets its own number, token and due date. When the scope changes next month there is still a document saying what the price was when it was agreed. Recording the answer requires the CLIENT'S name, not the studio's: "accepted by Studio" is a row nobody can defend, and an acceptance is what a disagreement about scope gets settled against.

  NO ACCEPT BUTTON ON THE PUBLIC PAGE, and the page says why. A click on a page addressed by a token is not a signature, and treating it as one would let anybody the link was forwarded to commit the client to a price. There is no pay button either: nobody should be able to pay a quote.

  DISCOUNT IS A RATE, ROUNDED ONCE ON THE SUM. Kept as a percentage so it survives a line being edited, and applied to the subtotal rather than per line, because a per-line discount summed drifts from one taken on the sum by a kobo or two -- and both figures sit on the same page. Carried onto the invoice as a negative LINE rather than an invoice-level rate, because an invoice's total has to be the sum of its lines and every other screen relies on that.

  NOTES AND TERMS ARE ON THE DOCUMENT, not in the covering email. The email is the thing nobody can find in December.

  NOTHING DELETES AN ESTIMATE. Declined and expired ones are kept, because a quote nobody took is the most useful row in a pipeline six months later and removing it is how a studio forgets what its prices have been doing. "Quote it again" copies the lines and terms to a fresh draft at today's date, which is what stops a price changing by accident during a re-type.

  EXPIRED IS DERIVED AND NEVER STORED, like an invoice's overdue -- a state time creates while nobody is looking. An ANSWERED estimate does not expire: accepting on the last day and invoicing a week later is normal, and a document that flipped to Expired after the client had said yes would be lying about something the studio has an agreement on.

  Pinned by `tests/estimates.spec.ts`, thirteen cases.

  ALSO DONE on invoices, from the same line: immutable numbering was already there, and void now is (see the entry above). NOT DONE: currency is naira only and the code says so rather than pretending to a currency field; PDF is still "print the public page" rather than a generated file; and an invoice cannot yet be duplicated, only an estimate.

  A VOID, A REVERSAL AND A REFUND ARE THREE DIFFERENT EVENTS. A void says the invoice should never have existed. A reversal says the money never really arrived: the transfer bounced, or somebody typed a row that should not be there. A refund says it arrived, we had it, and it went back. A client reconciling against their own bank statement sees TWO movements for a refund and none for the other two, so a system that collapses any pair of them forces somebody to record the wrong thing.

  A STRUCK INVOICE KEEPS ITS NUMBER. Unbroken numbering is most of what makes a set of books auditable, so there is no delete for anything issued -- only a strike. The row stays, `INV-2026-007` still follows `INV-2026-006`, the client's copy still opens and says plainly that nothing is owed with the reason on it, and every receivables figure skips it. A 404 on a document somebody is holding reads as the studio having made it disappear.

  AND IT CANNOT BE STRUCK IF MONEY HAS LANDED. That is the rule, not a limitation: the money is real, and the honest correction names where it went. Voiding it would leave a payment belonging to nothing. The menu does not offer the button, and the action refuses it if the request is made anyway.

  REFUNDS COME IN PARTS, because half a deposit returned when a project is cut short is the ordinary case. They are a list on the payment, never an edit to it -- `amount` is what arrived and the client is holding a receipt with that number on it. `paymentNet` is what every total reads instead, taking a reversal off in full and a refund off in part, and the receipt itemises what went back and where so a part refund can be checked rather than trusted.

  WHERE A REFUND GOES IS A REAL DISTINCTION. Back to their bank means the money has left the studio. Held on their balance means it has not, and the client now has credit -- which is what balance carry-forward actually is. Applying that credit creates an ORDINARY payment on the next invoice, with a receipt number in the same sequence and its own public page, marked as having come from credit. No parallel rules for money off a balance, and no way to adjust a balance by hand, because a balance that can be typed is one nobody can reconcile. A credit larger than the invoice is split: what fits is applied and the rest stays as its own row.

  OVERPAYMENTS ALREADY FLAGGED THEMSELVES AND NOW HAVE THE TWO ANSWERS: move the excess to the client's balance, or refund it. The excess is real money and silently swallowing it is the one outcome that is certainly wrong.

  DERIVED, NOT STORED, ALL OF IT. `invoiceStatus` returns Void before anything else; `invoiceTotals` returns nothing due on a struck invoice, which is what stops one table remembering and another forgetting; `collected` sums `paymentNet`; the client's balance is the sum of unapplied credits. Reconciled against the seeded books after the change: outstanding ₦3,003,150.00 on the tiles and in the aging footer, the struck ₦548,250.00 in neither, collected ₦2.1m net of the refund, and the collection rate 41% of what is still billed.

  Pinned by `tests/money-corrections.spec.ts`, fourteen cases across the documents and the arithmetic.
- [ ] Keep payment and invoice event histories append-only; correct mistakes through attributed reversals/voids and retain original evidence.
- [-] Receipts are generated for every successful payment whatever the method, numbered `RCT-YYYY-NNN` in order and never reused, and each links to its invoice, client and project. The number is assigned when the payment is recorded rather than when the receipt is opened, so reprinting cannot change it, and it is derived from the highest number already taken rather than from a count -- reversing a payment removes a row, and a count would then reissue a number already printed and posted. Each receipt has its own public page and its own QR.

  PRINTING WAS CHECKED AGAINST REAL PDFs, NOT A PREVIEW, and the first pass was wrong in three ways nothing on screen could have shown. The site's skip link printed as a navy button at the top of sheet one. A document printed from a dark session came out with a black border on every sheet, because `color-scheme: dark` paints the page canvas and a white background on the element does not undo it. And a two-line invoice cost two sheets: `min-height: 100dvh` is a full page of height on paper, and the colophon wrapped into a 218px band -- a fifth of an A4 page -- because the small print holds 30rem and the code could not fit beside it.

  MULTI-PAGE IS THE CASE THAT MATTERS, so there is a seeded 24-line retainer invoice (`INV-2026-005`) that exists only to find pagination bugs. Measured on it: the column headings reprint on every sheet, a running head carries the invoice number and the client onto sheet two -- otherwise it is a column of money with nothing saying whose it is -- no line item is cut in half by a fold, the totals stay with the items they total, and the stamp and the code appear once, on the last sheet. The stamp had to leave absolute positioning to do that: in paged media an absolutely positioned box lands on whichever page its containing block starts on, so it printed over the line items on page one.

  ROOM WAS MADE RATHER THAN TAKEN. The print rhythm is tighter than the screen's -- paper does not need thumb-sized gaps between rows -- which brought the two-line invoice from 1185px to 989px against a 1032px sheet. The code is now sized in millimetres because that is what a camera sees on paper: 34mm, with the quiet zone pulled in so the modules get 30mm of it, about 0.57mm each. Decoded out of the generated PDFs at 120, 150 and 200dpi, all three documents, every one read. Pinned by `tests/money-print.spec.ts`.

  NOT DONE: server-side PDF generation and resend history. "Save as PDF" from a browser now produces a correct document, but that is not the same as a generated file and is not claimed as one.
- [-] Eight of the nine, and the ninth is named rather than faked. Expenses had carried four fields: date, description, category, amount. They now also carry who was paid, how it left, the project it belongs against, whether it can be billed back, a note, and the admin who entered it.

  WHO WAS PAID IS ITS OWN FIELD. "Adobe" answers "who do we pay for this" and "Creative Cloud, the team plan" answers "what is it". They were one field, which is why the expense list could not be grouped by anybody.

  THE CLIENT IS DERIVED FROM THE PROJECT AND IS NEVER ASKED FOR. Two fields that have to agree will eventually disagree -- a project moved to a different client, or a form that let somebody pick both -- so there is one source. An expense with no project is overhead, which is a real answer and is shown as one rather than as a gap.

  WHICH BUYS THE THING IT WAS FOR: every project now has a "what it has made" panel reading invoiced, collected, spent on it and net. COLLECTED rather than invoiced, because an invoice nobody has paid is not income, and a project that looks profitable on billings and is not on receipts is exactly the one worth knowing about. Every figure is derived; nothing is stored, so nothing can go stale.

  REBILLABLE IS SEPARATE FROM HAVING A PROJECT, because plenty of project costs are ours to absorb.

  NOT DONE: the receipt is a LINK, not an upload. R2 upload from the admin is still not wired, and a file field that quietly does nothing is worse than one that asks for the address where the receipt already lives. The helper text says so. Links are validated as http or https on the server, because a URL field that accepts whatever is typed eventually holds a `javascript:` and the page that renders it as an href is where that becomes an attack.

  Found on the way: a checkbox inside `.ad__f` had been inheriting the text field rule -- `width: 100%`, a 9px radius, a border and a text field's padding. It never showed, because every checkbox in the admin sat inside a pill that shrink-wraps. The first box given a full-width row stretched its input to 654px and pushed its own label off the edge of the dialog. Fixed at the rule rather than at the one form.
- [-] Cashflow, income, expenditure, outstanding, overdue and net were already on Money. Added: a collection rate, and accounts-receivable aging in the conventional 30-day buckets so the numbers mean to an accountant what they mean here. One outstanding figure treats an invoice sent last Tuesday and one sent in March as the same thing, and they are not: the first is a cashflow line, the second is a conversation somebody has to have.

  THEY DRILL AND THEY RECONCILE, and both were checked rather than assumed. Every bucket lists the invoices behind it as links, so no total has to be taken on trust, and the panel's footer is summed from the same buckets the rows draw. Measured against the seeded books: the aging footer reads ₦646,500.00 and the Outstanding tile reads ₦647k, which is the same figure through `nairaShort`; collection rate reads 76% against ₦2.0m collected of ₦2.65m billed. The rate is capped at 100% and returns nothing rather than 0% when nothing has been invoiced — a red 0% for a studio that has simply not billed yet is a different thing and not a problem.

  NOT DONE: a cashflow FORECAST, and per-bucket export. The six-month chart is history, not projection, and is not labelled as one.

  WHAT IS IN IT IS EVERYTHING THAT DID NOT LAND CLEANLY. A charge whose reference matched no invoice. A transfer where somebody typed their company name into the narration instead of the invoice number. A webhook that arrived twice. One whose signature did not verify. A checkout that would not open. None of these appear anywhere else, because on every other screen they are an absence: an invoice that quietly stayed unpaid.

  THE BANNER IS ABOVE THE FIGURES, not beside them, because the figures are wrong while it is there -- an unmatched charge is money in the bank that the Collected tile does not know about.

  TWO ACTIONS, KEPT APART. "Match it to an invoice" banks real money through the same `applyPayment` everything else uses, with the same idempotency, the same receipt number and the same audit line, then closes the event with a note naming who decided. "Write it off" records what was done and moves no money. One button with a dropdown would make the consequential one something somebody reaches by accident. Both require a note, for the same reason a reversal requires a reason: "resolved" on its own is a tick somebody put there.

  MATCHING BY HAND IS THE LAST RESORT, NOT THE FIRST. `matchInvoice` tries the charge's metadata, then the invoice number inside the reference -- our own references carry it as a prefix, and "INV-2026-004" typed into a bank narration is the commonest reference a Nigerian transfer carries. It returns null rather than guessing, because a wrong match is a payment on somebody else's invoice.

  HOSTED CHECKOUT, NOT THE INLINE POPUP. Paystack offers both. The popup needs their script running on the page that shows a client what they owe; the redirect hands the card details to Paystack on Paystack's own origin, keeps our document free of third-party JavaScript, and works with JavaScript off. The cost is losing the client's context for the length of the payment, which for an invoice paid once is the cheaper side of the trade.

  THE BUTTON IS A REAL FORM POSTING TO A REAL ROUTE. Not a link -- a link that spends money can be followed by a prefetcher or a mail scanner -- and not a fetch. The route reads NOTHING from the request body: the amount, the invoice and the payer's email all come off the record the public token resolves to, because a form field is a number the payer can edit. A wrong token and a draft both get the same plain 404 the document itself gets.

  TWO PATHS IN, ONE FUNCTION AT THE END. The webhook is the reliable path and the browser's return is the fast one, and they race each other within the same second on almost every payment. Both verify with Paystack before anything is written, and both end at `applyPayment`, which is idempotent on the reference -- so whichever arrives second banks nothing and the client is not shown as having paid twice. The return page is the one people get wrong: it takes the reference out of the query string and nothing else, then asks Paystack what happened. A page that read `?status=success` would thank anybody who typed it.

  THE WEBHOOK FAILS CLOSED, in order. No signature header or one that does not verify is a 401 with nothing written and a Rejected row so the attempt is visible. An unparseable body is a 400. An event we do not act on is a 200 -- because a non-200 makes Paystack retry something that will never succeed -- with an Ignored row. The signature is an HMAC-SHA512 keyed on ONE account's secret, compared in constant time, which is also where MODE SAFETY comes from for free: a test-mode event cannot validate against a live key or the reverse, so there is no separate mode check to forget.

  PROVIDER EVENTS ARE APPEND-ONLY AND SEPARATE FROM THE AUDIT LOG. The audit log answers "who changed this"; this answers "what did Paystack say and what did we do about it", and most of its entries are things that happened TO us. Every event is written whatever its outcome, including the duplicates and the ones that were ignored, because a log of successful charges tells nobody anything they could not read off the invoice. The single mutation allowed is a resolution note, written once onto an event that has none.

  Pinned by `tests/payments.spec.ts`, which tests the closed door rather than the happy path: an unsigned webhook, a wrongly signed one, an empty signature header, a forged charge that must not appear on the invoice, a wrong token, a draft, a GET on the POST-only route, and a made-up reference that must never be treated as paid.

  NOT DONE: the keys are not set on this deployment, so no real card has been through it.
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
- [-] Three of the eight are built and sending: the invoice with its pay link, the payment receipt, and the invoice reminder. They share one shell, one delivery path and one set of rules, and the buttons that send them are on the invoice screen rather than buried in a menu. The orange call-to-action in them carries BLACK type, not white: white on #ff6500 measures 2.95:1 and fails even the 3:1 allowed for large text, and an email client is no more forgiving than a browser. The password-reset mail had that bug and it is fixed here too.

  NOT DONE: onboarding receipt, account invitation, project update, approval request and completion messages. And they are TEMPLATES IN CODE, not editable by the studio -- the checklist asks for editable, and a template editor is a real piece of work rather than a field. Said plainly rather than ticked.

  THE ROW IS WRITTEN BEFORE THE MAIL SERVER IS CALLED, NEVER AFTER. A receipt goes out behind the response -- this SMTP server takes about 23 seconds just to authenticate -- which means by the time it fails there is nobody left to tell. The row IS the telling: Queued first, then Sent or Failed. A row still reading Queued long after the fact is a send that disappeared inside the provider, which is exactly the thing a log written after a successful send can never show.

  FOUR STATES, NOT TWO. Skipped is separate from Failed and says why: "they have reminders switched off" is a different fact from "the mail server refused it", and a log that collapses them teaches people to distrust the log.
- [ ] Provide explicit WhatsApp handoff actions without pretending the website can read or sync WhatsApp messages unless a real approved integration is added.

  WHAT CANNOT BE SWITCHED OFF, AND WHY. A receipt for money a client has actually paid is a record they are entitled to. It is not a notification, and it is not in the list.

  THE DEDUPE KEY IS THE EVENT, NOT THE ATTEMPT. `receipt:y7` is the receipt for payment y7 however many times Paystack retries the webhook and however many times the payer reloads the return page. A reminder's key carries the day, so the same nudge cannot go twice in one day however many times a job runs, and tomorrow's is allowed through. Resend clears the key onto a superseded name so the failed row STAYS as the record that the first try did not go.

  NO PAYLOADS, ANYWHERE. Paystack's webhook body carries a customer record, an authorization object and on some events a card's last four and its bank. What is stored is the reference, the amount, the channel and our own verdict. A log that copies the rest is a second place for it to leak from.
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
- [-] Append-only audit log built and wired into the writes that exist. APPEND-ONLY BY CONSTRUCTION, not by promise: the array is module-private and the only export that touches it pushes, so there is no update, no delete, and nowhere to write from. A log you can edit answers "what happened" with "whatever somebody last wanted it to say", which is worse than none because it looks like evidence — so the screen has no controls at all.

  Covered now: client added/edited/archived (one entry per field that actually moved, never a single "edited"), project opened/stage moved/archived, invoice drafted/raised/issued/deleted-as-draft, payment recorded and reversed, expense recorded and removed, setting overridden and put back. Before/after is stored already formatted for reading rather than as raw values: an amount means nothing as `37725000`, and the rendered form still makes sense in a year when the formatting code has moved on.

  Reversing a payment keeps the receipt number and the bank reference ON THE ENTRY, because the row that carried them is gone and those are what tie the reversal to the bank's record of the original.

  Deliberately NOT stored: request bodies, provider payloads, credentials, or any field whose old value is a secret. A log that copies everything is a second place for a leak to come from.

  Verified in a browser: empty before any change, then a stage move and a settings override both landed with their before/after and actor, and the project workspace showed only its own entries.

  NOT DONE, because the subsystems do not exist yet: authentication and role changes (no auth), form and file changes (no form builder, no admin uploads), integration changes (no integrations wired). The actor reads "Studio" everywhere until there is a signed-in admin to name — the parameter is threaded through every write and just has nothing better to fill it with yet.
- [ ] Add content-management entry points only for public content that genuinely needs editing; avoid rebuilding a general-purpose CMS.
- [ ] Show honest integration health and “coming soon” states; never display a control as working before its backend is verified.

Moved here from section 1C on 2026-09-14. They were filed under the blog
because that is what they edit, but every one of them is admin UI and belongs
with the rest of section 4's content and settings work.

- [ ] Blog editor: create, edit, schedule and unpublish posts, writing the same block shape `lib/blog.ts` already defines (`p`, `h2`, `h3`, `list`, `quote`, `callout`). The renderer guarantees one h1 and a correct heading outline; an editor that emits raw HTML would give that away.
- [ ] Per-post SEO fields as first-class inputs, not afterthoughts: search-result title, meta description with a live character count, canonical override, and a social image.
- [ ] Draft, scheduled and published states, with the published date separate from the created date and a visible `updated` date when a post is revised.
- [ ] Author and category records, once there is more than one person writing.
- [ ] Editable site content beyond the blog: the FAQ list, testimonials, the services copy and the work catalogue all currently live in `lib/` and need the same treatment.
- [ ] Media library backed by R2, reusing `r2Config()` and `presignPut()` from `lib/r2.ts` rather than a second uploader. Note the SVG caveat recorded under upload safety.
- [ ] Preview a draft as it will actually render, on the real page, before publishing.

### 4.9 CockroachDB, R2, and backend integrity

- [-] Connect document/upload workflows to Cloudflare R2. (`lib/r2.ts` signs presigned PUTs with SigV4 and no new dependency; `POST /api/onboarding/upload` authorises one file against the caller's draft, choosing the key, content type and 25MB ceiling server-side, and fails closed naming the missing variable. Files land under `onboarding/<draftId>/`. BLOCKED on one value: `R2_ACCOUNT_ID`, the subdomain of the bucket's S3 API endpoint.)
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

---

# Done

Archived, with the evidence that closed each one. Search here before
reopening anything.

## Closed 2026-09-17, the SVG-inline finding from the independent audit, recorded

- [x] **Finding R3, recorded at both ends of the path it warns about.**
  `app/api/onboarding/upload/route.ts` now says, beside `svg` in the
  extension table, exactly what stays true for it to remain safe: every
  upload is served from R2's own domain, never drawn inline (an
  `<img>`/`<object>`) on `wedigcreativity.com.ng`, and an admin file
  preview that fetched the bytes and rendered them inline ON OUR ORIGIN
  would run a client's uploaded script as us. The two places a client's
  uploaded file is actually opened today -- the deliverable version link in
  `components/admin/delivery.tsx` and its twin on the client workspace
  (`app/admin/clients/[id]/page.tsx`) -- both carry the same note beside
  the `<a target="_blank">` that keeps them safe, so the constraint is
  visible exactly where someone would have to break it (turning either
  link into an `<img>`) rather than only in a document nobody reads before
  changing a component. Nothing behaviourally changed: both links were
  already links, never inline embeds -- this closes the finding by making
  that fact impossible to remove by accident rather than by fixing a bug
  that did not yet exist.

## Closed 2026-09-17, two real admin faults found by loading it and watching

- [x] **The admin never had its own 404.** Every one of the four dynamic
  detail routes -- `clients/[id]`, `projects/[id]`, `money/[id]`,
  `forms/[id]` -- calls `notFound()` on a deleted or mistyped id, and with
  no boundary anywhere under `app/admin`, that fell all the way through to
  the ROOT `app/not-found.tsx`: the public marketing 404, complete with the
  site header, the "lost" illustration and the `.pv` light/dark tokens. An
  admin who followed a stale link out of an old email left the dashboard
  entirely rather than landing on a page that still looked like the tool
  they were using. `app/admin/not-found.tsx` fixes it: a `not-found.tsx`
  placed in a route segment renders inside that segment's own layout, so
  this one keeps the admin shell -- nav, counts, signed-in owner -- and
  only swaps the content area for a plain "That isn't here" with links to
  the four main lists. (The response's HTTP status is a separate, still
  open fault -- see the entry kept in `# Open` above.)
- [x] **A hydration mismatch on every date field in the admin**, found from
  a `pageerror` event on `/admin` and `/admin/money` rather than from
  anything a snapshot of markup would show. The word-echo beside every date
  input (`inWords` in `components/admin/form.tsx`) used
  `toLocaleDateString("en-GB", {...})`, and naming the locale pins the
  language but not the CLDR data an engine formats it with: Node's ICU
  wrote "Thursday 17 September 2026", Chrome's wrote "Thursday, 17
  September 2026", comma and all, for the exact same input. Server and
  client disagreeing on rendered text is a hydration failure, and React
  discarded and rebuilt the whole dialog -- the invoice builder, the
  expense form, every dialog with a date in it -- on first paint, every
  time. Rewritten as a fixed lookup table (`WEEKDAYS`/`MONTHS` arrays and
  manual string assembly) rather than `Intl`, which can never disagree
  with itself between two engines because there is no second engine's
  opinion to consult.
- [x] **Every dynamic admin detail page shared one tab title**, the
  layout's own default "Admin | We Dig Creativity", because none of the
  four set their own `generateMetadata`. Five clients open in five tabs
  were five identical tabs. Fixed on all four: `<Company> · Client`,
  `<Title> · Project`, `<Number> · Invoice`, `<Name> · Form`, falling back
  to the same "Unnamed" a form's own `<h1>` already uses so the tab and the
  heading never disagree. Each `generateMetadata` also calls `notFound()`
  itself now rather than only returning a "not found" title string, which
  is the pattern Next.js documents for resolving a missing id before the
  page body renders -- it did not fix the status-code fault above, but it
  is still the more correct shape and was kept.
- [x] **Two dashboard panels had no empty state**, against the project's own
  written rule in AGENTS.md that every true first-use empty state needs a
  concise explanation. "Recent payments" and "Upcoming deadlines" rendered
  a blank box with nothing in it and no icon or sentence, unlike every
  other panel on the same screen, which invisibly matched the seeded demo
  data always having rows -- exactly the day-one production case (a fresh
  deploy with no payments recorded yet) this codebase measures rather than
  assumes. Both now fall back to `Empty` with the same icon the panel
  already uses and a one-line explanation of what will appear there.
- [x] Clicked through every row-menu action on `/admin/clients`,
  `/admin/projects`, `/admin/money` and `/admin/settings` with Playwright
  -- 34 menu items across 29 row menus, every dialog opened, console and
  network errors watched throughout. All clean; two intermittent
  `ERR_TUNNEL_CONNECTION_FAILED` entries traced to Chrome's own background
  requests to `google.com` and a JotForm CDN check being refused by this
  sandbox's network policy, confirmed by isolating the failing hosts, not
  anything the app itself requested.
- [x] Found by loading `/admin`, `/admin/clients`, `/admin/projects`,
  `/admin/money`, `/admin/forms`, `/admin/settings`, a client workspace, a
  project, an invoice and a form submission with Playwright, watching
  `console`, `pageerror` and every response over 400 throughout rather than
  assuming a clean load. Zero issues on any of them after the two fixes
  above. `tests/admin-not-found.spec.ts` (5 cases) pins both: the admin
  shell surviving a missing id on all four routes, and no hydration error
  firing on `/admin/money`. `tests/admin-actions.spec.ts`,
  `tests/admin-clients.spec.ts` and `tests/admin-responsive.spec.ts` (13
  cases, run against the same `BONEYARD_CAPTURE_TOKEN` door) all still
  pass. `npm run lint`, `npx tsc --noEmit` and `npm run build` are clean.

## Closed 2026-09-17, the last of section 1B: brand kit and broken links

- [x] **The brand asset pack (`/tools/brand-kit`).** A logo upload in, a
  real colour palette, a WCAG contrast row per colour against white and
  black, and a six-size favicon set (16 through 512, transparent
  background, cropped to fit) out. `sharp` was already in the dependency
  tree -- `next/image`'s own optimizer resolves it -- and is now a direct
  dependency at the exact version already locked, rather than code relying
  on a transitive one Next could stop needing. The palette comes from
  `lib/color-quantize.ts`, a bucket-counting reducer written for this
  rather than a clustering library: round each channel to a coarse step,
  count the buckets, average the real pixels inside the winner. Pixels more
  than about 12% transparent are not counted, so a logo on a transparent
  background reports its own colours rather than the checkerboard. The
  contrast row reuses `lib/contrast.ts` exactly -- no second
  implementation -- and a live upload of a flat #ff6500 square reproduces
  the 2.95:1-on-white figure AGENTS.md already states by hand for that
  colour, which is the cross-check that the maths agrees with itself
  everywhere it is used.
- [x] **NOTHING UPLOADED IS STORED.** Decoded, measured and resized for the
  length of one request, in memory, then gone -- no R2, no database row.
  `lib/r2.ts` stays reserved for what it already does: onboarding and admin
  uploads, which are ours to keep. The route checks the declared
  `content-length` before it reads a byte of the body, then the actual file
  size again once it has it, so an oversized upload never reaches `sharp`
  at all (capped at 8MB and 25 megapixels either way).
- [x] **The single-page broken-link check (`/tools/broken-links`).** One
  page fetched through the existing SSRF-guarded `fetchPage`, every
  `<a href>` on it read by the new pure `lib/broken-links.ts`
  (deduplicated, `mailto:`/`tel:`/`javascript:`/anchor-only links never
  enter the list, capped at 25), then every one of those checked in
  parallel -- eight at a time -- through a new `checkLink` added to
  `lib/fetch-page.ts` rather than a second SSRF path: a HEAD request,
  retried once as GET only when a server answers HEAD with 405 or 501, so a
  site that simply does not support HEAD is never reported as broken for
  it. Results are sorted broken first, then the ones we genuinely could not
  reach, then the ones that work -- nothing is filtered out of the list,
  because a tool that hides what it could not verify can be wrong silently.
  "Could not check" and "broken" stay two different words throughout,
  including in the one figure the headline reports.
- [x] **Both registered through `lib/tools.ts`** like every tool before
  them, which is what put brand-kit on the branding service page and
  broken-links on the web service page, both in the footer's Tools column
  and both in `sitemap.xml`, confirmed by reading a live dev server rather
  than assumed from the registry alone.
- [x] **Pure logic checked without a browser**: `scripts/check-brand-kit.mjs`
  (12 checks, `npm run check:brand-kit`) against hand-built pixel buffers,
  and `scripts/check-broken-links.mjs` (19 checks, `npm run check:broken-links`)
  against hand-built HTML. The browser half -- a real upload actually
  producing a real palette and a real favicon set with nothing sent to an
  email; broken links actually sorting before working ones; an unreachable
  private address still refused in a sentence through the real endpoint --
  is `tests/brand-kit.spec.ts` (5 cases) and `tests/broken-links.spec.ts`
  (6 cases), both passing against a production build. `npm run lint`,
  `npx tsc --noEmit` and `npm run build` are all clean, and
  `tests/button-colours.spec.ts` / `tests/service-tools.spec.ts` confirm
  nothing about the shared chrome these two pages sit inside broke.
- [x] Section 1B is now fully shipped except the CrUX field-data card, which
  is Class B (a Google Cloud API key) and stays open under that section
  rather than being built against a key nobody has set.

## Closed 2026-09-16, three more free tools: contrast, readability, ad budget

- [x] **The contrast checker (`/tools/contrast`).** Two colours in, the real
  WCAG ratio out against all six thresholds (AA/AAA, normal/large text, and
  UI components) at once, answering live as you type -- no submit, no
  network, no key. `lib/contrast.ts` parses hex and `rgb()`/`rgba()`,
  applies the published relative-luminance formula exactly (checked against
  the formula's own maximum: black on white is 21:1 to three decimal
  places), and never clamps a ratio, because clamping would hide exactly
  the pairing that most needs rewriting. A half-typed hex code holds the
  last good answer rather than erroring, the same "don't be naggy"
  principle the rest of the site's forms already follow. Registered on the
  branding service page; this is the "cheap subset of the brand asset
  pack" the checklist already named, and the brand asset pack itself now
  reuses this exact library rather than a second implementation.
  `scripts/check-contrast.mjs` (22 checks, `npm run check:contrast`) and
  `tests/contrast.spec.ts` (5 cases) both pass.
- [x] **The readability checker (`/tools/readability`).** Paste copy, get
  the Flesch Reading Ease and Grade Level scores instantly, with a plain
  line of advice rather than a bare number. `lib/readability.ts` counts
  syllables with the same vowel-group heuristic most open-source Flesch
  implementations converge on -- documented honestly, including its two
  known limitations (a blanket "-ed" strip, and vowel triphthongs
  occasionally over-splitting) rather than claimed as exact. Starts from
  real homepage copy already scored rather than a blank box, so the first
  thing a visitor sees is the tool proving itself on a sentence we are
  willing to be judged by. Registered on the SEO service page.
  `scripts/check-readability.mjs` (22 checks, `npm run check:readability`)
  and `tests/readability.spec.ts` (4 cases) both pass.
- [x] **The ad budget & reach calculator (`/tools/ad-budget`).** One naira
  figure compared across five platforms (Meta, Google Search, Google
  Display, TikTok, LinkedIn) at once, from each platform's own published
  CPM and click-through ranges for this market, reviewed 2026-09 like the
  estimator's own rate card. Ranges are paired at the same end
  deliberately -- the cheapest CPM with the LOWEST click-through rate that
  cheap reach tends to come with, not the highest, so the estimate never
  prints a rosier number than either extreme on its own would produce.
  Registered on the social service page. `scripts/check-ad-budget.mjs` (18
  checks, `npm run check:ad-budget`) and `tests/ad-budget.spec.ts` (3
  cases) both pass.
- [x] **All three wired through the existing `lib/tools.ts` registry**
  rather than by hand-editing the footer, the sitemap and each service
  page separately -- adding one entry there is what put all three on
  their matching service page, in the footer's Tools column and in
  `sitemap.xml` for free, confirmed by `tests/service-tools.spec.ts` (which
  already covers the registry generically and needed no changes) and by
  reading `sitemap.xml` directly off a live dev server.
  `tests/button-colours.spec.ts` (5/5) confirms nothing about these three
  pages' shared chrome broke, and `npm run build` completes clean.

## Closed 2026-09-16, the "sent" screen's buttons and the R2 upload diagnostic

- [x] **"Back to the site" on the onboarding form's own "sent" screen
  rendered near-white text on a white fill (1.09:1), reported from a
  screenshot.** Root-caused rather than guessed: `Link` renders an `<a>`,
  and `preview.css` carries `.pv a { color: inherit }` at specificity
  (0,1,1). The button's own rule, `.ob__btn--go { color: var(--btn-ink) }`,
  is a bare class at (0,1,0) and LOSES to it regardless of source order --
  so the label quietly inherited the page's own text colour instead of the
  token meant to contrast with its own fill. Fixed the way this same file
  already handles every other case of this exact trap (see its own
  SPECIFICITY note at the top): `.ob__btn--go`, its hover state,
  `.ob__btn--ghost`, its hover state, and the disabled-hover case are now
  `.pv .ob__btn--go` etc, (0,2,0), which beats (0,1,1) outright.
  `.ob__btn--danger` already had the prefix; the primary/secondary pair
  had simply been missed when it was retrofitted.
- [x] **Verified without needing to submit a real form.** What broke was
  two CSS rules and their specificity, not the submit flow, so
  `tests/onboarding.spec.ts` drops the exact markup the "sent" screen
  renders onto a live page and reads the browser's own resolved
  `color`/`background-color` against WCAG AA (4.5:1). Confirmed the test
  actually catches the regression by reverting the CSS fix and watching it
  fail, then restoring it and watching it pass.
- [x] **Reported separately: R2 uploads failing with "The upload did not
  finish. It is worth trying again." despite the bucket, the public
  endpoint and the API token all being set up already.** Read the whole
  path end to end -- `dropzone.tsx`, the `/api/onboarding/upload` route,
  the SigV4 signing and the existing CORS diagnostic in `lib/r2.ts` -- and
  found it internally correct: a fixed SigV4 vector confirms `presignPut`
  and a generalised `presignRequest({method:"PUT"})` produce byte-identical
  URLs, and Nigerian phone numbers aside, nothing here was broken by
  anything in this repository.
  THE MESSAGE ITSELF WAS THE GAP. It is shown specifically when the
  server's own CORS preflight simulation SUCCEEDS -- meaning the bucket's
  CORS policy is correctly configured for this exact origin -- and yet the
  browser's real PUT still failed outright (`xhr.onerror`, not a readable
  403). That combination has one very common cause `probeCors` cannot see:
  CORS and object permissions are two separate checks R2 makes, and a
  token that can sign a request but is scoped to Read only (or to a
  different bucket) gets a 403 whose error body, in practice, often carries
  no `Access-Control-Allow-Origin` -- so the browser blocks the response
  from script entirely and reports the exact same `onerror` a dropped
  connection would.
  Added `probeWrite()`: a request from THIS SERVER is never subject to
  CORS at all, so it can settle the question outright by actually signing
  and writing a tiny diagnostic object, reading R2's real answer, and
  cleaning up after itself. When CORS checks out, the upload route now
  runs this second probe and returns its verdict instead of a shrug: either
  confirmation that the credentials really can write (pointing at something
  transient) or, the likely case here, "the token can sign a request but
  is not allowed to write to this bucket -- check its permissions in the
  Cloudflare dashboard."
- [x] **`scripts/check-r2.mjs` (new, `npm run check:r2`)** pins the pure
  parts of `lib/r2.ts` -- key derivation, that changing the content type or
  the key changes the signature, that `presignPut` and
  `presignRequest({method:"PUT"})` agree -- and drives `probeCors` and
  `probeWrite` through every branch with a stubbed `fetch`, including the
  403-reads-as-a-permissions-problem case this fix exists for. 26/26 pass.
  `npm run build` and the onboarding/estimator/button-colours suites all
  still pass.

## Closed 2026-09-16, the mobile picker sheet can actually be dismissed

- [x] **Reported from a screenshot of the industry select stuck open on a
  phone: tapping the dimmed page behind it did nothing, and there was no
  way to drag it away either.** Root-caused rather than guessed: below
  560px the scrim is `.pk.is-open::before`, a pseudo-element with no DOM
  node of its own, so a tap on it reports the PICKER ITSELF
  (`root.current`) as the event's target. The outside-click handler in
  `usePickerOpen` (`components/onboarding/picker.tsx`, shared by the
  industry select, the phone field's country picker and the estimator's
  own dropdown) read `root.contains(root)` -- true, an element always
  contains itself -- as "the tap landed inside the picker," and never
  closed it. Fixed by also treating a tap that lands on `root` itself,
  rather than one of the real controls it wraps, as outside. Confirmed
  with a synthetic tap on the scrim corner in a touch-emulated context:
  closed 0/1 times before the fix, 1/1 after.
- [x] **Drag-to-dismiss did not exist at all, so there was nothing to try
  once the tap didn't work either.** The grab handle was purely
  decorative -- `.pk__pop::before`, again a pseudo-element, so nothing
  could attach a listener to it. Turned into a real `.pk__grab` element
  (added to the three consumers: `select-field.tsx`, `phone-field.tsx`,
  `option-select.tsx`), and `usePickerOpen` now tracks a pointer captured
  on it, translating the sheet with the finger and closing it past 28% of
  its own height or snapping back under that, skipping the snap-back
  transition under `prefers-reduced-motion`. Hidden above 560px, where the
  panel is a dropdown with nothing to grab.
- [x] **A genuine scroll region that iOS Safari gives no visible sign of
  being one**, which a screenshot showing the list cut off just past
  "Non-profit" is consistent with: that browser does not draw the
  `scrollbar-width: thin` bar this file already sets, only a transient
  thumb during an active scroll. Reproduced with real wheel-scroll
  events in a touch-emulated context first, confirming the list DOES
  scroll (the industry list's own overflow past its 12 options was small
  enough at a typical phone height that the missing affordance was easy
  to read as "stuck" rather than "nearly at the end already"). Added a
  four-layer CSS scroll shadow to `.pk__list` -- two fades attached to the
  content masking the shadow at whichever edge is flush with the true
  start or end of the list, two shadows attached to the viewport showing
  through once scrolling moves the content-attached fade away from that
  edge -- so there is a persistent visual cue on every browser regardless
  of whether it draws its own scrollbar.
- [x] **The phone field's own validation was checked against exactly what
  was described** -- a Nigerian number typed as 10 digits (no leading 0)
  or 11 (with it) should be accepted, anything longer should not -- and it
  already does both: `parsePhoneNumber(digits, "NG").isValid()` returns
  true for `8021234567` and `08021234567` and false for 12+ digits,
  confirmed directly against `libphonenumber-js/max` and then again
  through the real field (`aria-invalid` and the inline error both track
  it correctly, live, and block the step from advancing). No change made
  here since nothing reproduced; if this is still wrong in what is
  actually deployed rather than in this branch, the concrete number and
  country tried would narrow it down.
- [x] **Verified with the full suite.** Three new cases added to
  `tests/onboarding.spec.ts` (tap-outside now closes it, a small drag
  snaps back while a larger one dismisses, the list stays a genuine
  scroll region with the grab handle's own `touch-action` not leaking
  onto it), run five times over to confirm none of the three are flaky.
  `tests/onboarding.spec.ts`, `tests/onboarding-domain.spec.ts`,
  `tests/scope-estimator.spec.ts` (whose own dropdown shares this same
  code) and `tests/button-colours.spec.ts` all still pass together, and
  `npm run build` completes clean.

## Closed 2026-09-15, the onboarding form's orange service cards are black

- [x] **The onboarding form's opening picker (six cards: Branding, SEO, Web,
  Apps, Software & AI, Social & PPC) alternated navy and orange fills.**
  Asked to replace the orange with black and white text. Renamed the
  modifier class itself, `ob__svcCard--orange` to `ob__svcCard--black` in
  both `onboarding-form.tsx` and `onboarding.css`, rather than leaving a
  class called "orange" painting black -- the exact kind of stale name
  this repo's own comments keep singling out elsewhere.
  `background: var(--accent); color: var(--on-accent)` (orange fill, black
  label) became `background: #0e0e0e; color: #fff`, lifted to `#242424` in
  dark mode for the same reason the navy card already lifts to `#1b1b8f`
  there: a fill this close in value to the dark theme's own near-black
  page is a shape you can barely find. The selected-card tick badge, which
  had its own `#c24d00` override for legibility on white for the orange
  variant, now reads `#0e0e0e` for the black one.
- [x] **`tests/button-colours.spec.ts` does not audit these cards** (they
  were never in its `BUTTONS` selector list, being a selection-card
  pattern rather than the site's primary/secondary pair), so nothing there
  needed updating, and its "no button is filled with the brand orange"
  case still passes. Confirmed by reading the computed
  `background-color`/`color` of every `.ob__svcCard` in both themes at
  390px: navy `#000065`/`#1b1b8f` and black `#0e0e0e`/`#242424`, white
  label throughout, matching the source rather than assumed from it.
  `tests/onboarding.spec.ts` and `tests/onboarding-domain.spec.ts` (5/5)
  and the button-colours suite (5/5) all still pass. `npm run build`
  completes clean.

## Closed 2026-09-15, the estimator borrows the onboarding form's "not sure" and its tips

- [x] **Asked for the estimator to be as forgiving as the onboarding form:
  an "I'm not sure" escape hatch on questions a reader might not have an
  answer for, and the same hidden "background" affordance (`tip`) the
  onboarding form uses for a question that needs more than its one-line
  `hint`.** Five of the eight questions -- screens/journeys, accounts,
  payments, integrations and the AI feature -- now carry a "Not sure yet"
  option at the end of their list, added by a new `withUnsure()` helper in
  `lib/estimate.ts` rather than typed out by hand five times. THE NUMBER
  STILL HAS TO EXIST: unlike the onboarding form's `UNSURE`, which defers
  the question to a human and adds nothing to any total, this tool never
  stops being a calculator, so "not sure yet" prices at the ROUNDED AVERAGE
  of that question's real answers -- neither the cheapest nor the dearest
  guess, so picking it never quietly pushes the range toward either end on
  its own. Pinned in `scripts/check-estimate.mjs`, which now asserts that
  figure for every question that offers it, not just eyeballed once.
- [x] **Not every question got one.** What are we building, what exists
  today, and the deadline are things a reader always knows on arrival, or --
  the deadline -- already has "No fixed date" doing the same job a second
  "not sure" would only duplicate. Checked the site's other option-driven
  pickers for the same fit: the AI cost calculator's job picker stays
  without one, because its shape (word counts) is already a starting point
  the reader freely overwrites afterward rather than a commitment the way
  a wizard step is; the business-name checker's "business or company"
  choice stays without one too, since that is always something the person
  filling it in already knows. No question anywhere in these tools is
  genuinely a pick-more-than-one, so there was nothing to turn into
  checkboxes either -- the "roles and permissions" style questions are
  each one tier of a single scale, not an unrelated set of options.
- [x] **The hidden "?" tip is `components/onboarding/tip.tsx` reused
  outright**, not a second version: "Do people sign in?" and "Does it have
  to talk to anything else?" each carry one now, explaining the jargon
  ("roles", "integration") a client might not already have a word for,
  exactly the same press-to-open panel the contact form uses, pulling in
  `form-kit.css` for its `.tip` rules the same way `option-select.tsx`
  pulled in `picker.css` last time.
- [x] **Verified with the full suite.** `npm run check:estimate` (new
  "not sure yet" pricing assertions included) and
  `tests/scope-estimator.spec.ts` (14/14, two new cases: the escape hatch
  reaching a real figure, and the tip opening and closing on Escape without
  moving the wizard) both pass; `tests/onboarding.spec.ts`,
  `tests/onboarding-domain.spec.ts` and `tests/email-templates.spec.ts`
  confirm the reused `Tip` component and `form-kit.css` are unaffected on
  the contact form and in outbound email. `npm run build` completes clean.

## Closed 2026-09-15, the estimator's wizard steps are a dropdown, not a stack of cards

- [x] **Each of the scope estimator's eight steps laid its options out as a
  stack of full-width cards ("A website you can edit yourself", "A web app
  people log into"...), which on a step with five options was five card
  -heights to scroll past before the question could even be answered.**
  Reported from a screenshot of the "What are we building?" step, five
  boxes deep. Replaced with one dropdown per step
  (`components/tools/option-select.tsx`): closed, it shows the current
  answer in a single row; opened, it lists every option with the same
  explanatory line the cards used to carry underneath it, so nothing that
  used to be on the card is lost, just collapsed until it's wanted.
- [x] **Built on the contact form's own control, not a second one that
  looks close but isn't.** `option-select.tsx` reuses
  `usePickerOpen` from `components/onboarding/picker.tsx` and the `.pk`/`.sf`
  classes from `picker.css` verbatim: the same panel that flips up when the
  field is near the foot of the window, the same mobile bottom sheet with
  a grab handle, the same 44px row floor. The one thing it doesn't reuse is
  the search box `select-field.tsx` shows past ten options, since every
  question here tops out at five.
  Added to `picker.css` rather than duplicated: a `.pk__note` line under an
  option's label, shown only on a `.pk__opt` that actually has one
  (`:has(.pk__note)`), so the country list and the industry select --
  neither of which has ever carried a note -- render exactly as they did
  before this.
- [x] **Left alone, deliberately**: the AI cost calculator's own job picker
  (`.es__opts`/`.es__opt`) still renders as cards. It shares the screen
  with a live result column that updates as you go, which is a different
  problem from a step that owns the whole screen for one question -- and
  every one of its questions is genuinely single-select, so there was
  never a multi-pick list here to turn into checkboxes either.
- [x] **Verified with the full suite, not just a source read.**
  `tests/scope-estimator.spec.ts` rewritten for the dropdown interaction
  (12/12) and `tests/onboarding.spec.ts` plus
  `tests/onboarding-domain.spec.ts` (5/5) confirm the shared picker
  component still behaves exactly as before on the contact form. Checked
  by eye in both themes, on a 390px phone (the panel opens as a bottom
  sheet) and at desktop width (the panel opens as a dropdown under the
  field). `npm run build` completes clean.

## Closed 2026-09-15, the homepage link-preview card is the mark, not a screenshot

- [x] **The homepage's `og:image` was a photograph of the live hero,
  re-shot by `scripts/shoot-og-card.mjs` whenever the hero changed.**
  Asked to swap it for the two-colour brand mark (navy and orange) on a
  white ground instead: at the size a chat app actually renders a link
  preview, well under 200px wide, a hero screenshot reduces to a smear of
  colour with none of its own words legible, while the mark itself still
  reads at that size, and stops going stale every time the hero's copy or
  backdrop changes. `app/opengraph-image.tsx` now draws
  `public/brand/icon-color.svg` centred on white with `next/og`'s
  `ImageResponse`, the same renderer every other route's card already uses
  through `lib/og.tsx`, rather than serving a static JPEG off disk.
- [x] **Sized so it reads at any crop a preview surface takes.** The
  mark's own viewBox (904x944) sets the width from a fixed 440px height
  rather than a fixed width, so it is never stretched off its true ratio;
  440 of the canvas's 630px height leaves 95px of white above and below,
  comfortably inside the square crop several chat apps take from the
  centre of a 1200x630 image, and the same margin holds on the sides of
  that crop too.
- [x] **The screenshot approach's own supporting files went with it**:
  `scripts/shoot-og-card.mjs` (the Playwright re-shoot script) and
  `public/og/home-card.jpg` (the JPEG it produced) are both deleted rather
  than left as dead code now that nothing reads either. Every other
  route's card, drawn from `lib/og.tsx`'s shared `ogCard()`, is untouched.
- [x] **Verified against a live dev server**: `GET /opengraph-image`
  returns a 200 PNG with the mark centred on white as designed (checked by
  eye against the rendered file), and `/about`, `/services`, `/work`,
  `/contact`, `/blog` and `/legal`'s own `opengraph-image` routes still
  return 200, unaffected. `npm run build` completes with exit 0.

## Closed 2026-09-15, the last of the faint blue description text goes white in dark mode

- [x] **A screenshot of the homepage FAQ ("What does WDC actually do?")
  showed the open answer in a dim lavender-blue-grey against the navy
  background, not white.** Traced to `.qa__inner p`, which carries
  `color: var(--muted)` unconditionally. `--muted` is a plain grey against a
  light page but reads as a faint, blue-tinted grey against the dark
  theme's own near-black ground, a bigger jump in dimness than the same
  token makes on light. An answer someone has just opened to read is body
  copy, not a caption, so `.dark .qa__inner p` now takes the dark theme's
  own near-white `--ink` instead; light theme is untouched, since `--muted`
  there has none of the tint this was about. Confirmed with a direct
  `getComputedStyle` read on an opened panel: `rgb(241, 242, 255)`, `--ink`
  in dark theme, not the previous `--muted` value.
- [x] **The same audit swept every other place still painting description
  text with `var(--on-band-dim)`** on the always-dark band grounds (hero,
  hero-shaped step art, CTA, footer), the token this session had already
  moved the hero/CTA ledes off of for the same reason. Turned to `#fff`:
  the "How we work" step paragraphs (`.pv-step p`), the FAQ panel's aside
  intro sentence (`.pv-faq__aside p`), the "Reach us" capability list
  (`.pv-cwork li`), and the footer's own "what we do" blurb (`.ft__pitch`).
  Left alone, deliberately: the footer's nav links (`.ft__col a`), field
  labels, breadcrumbs, card metadata, tab labels and legal fine print,
  none of which are prose a reader is meant to read at length, and light
  theme's `--muted`/`--on-band-dim`, which was never the faint-blue
  complaint.
- [x] **Verified with the full suite, not just a source read.**
  `tests/button-colours.spec.ts` (5/5, both contrast checks and the
  "exactly one of the two" check, across both themes) and
  `tests/page-opening.spec.ts` (20/20, both themes, phone and desktop)
  pass against a live dev server; `npm run build` completes clean.
  Working tree left with only the three touched stylesheets modified,
  no stray scratch files.

## Closed 2026-09-15, the CTA card's headline gets more room on a phone

- [x] **The "Next step" CTA card's headline ("Most of this is an
  afternoon, not a rebuild." and its equivalents on every other tool and
  service page) read as cramped on a phone, wrapping into three short,
  narrow-looking lines centred inside a lot of empty side margin.** MEASURED
  RATHER THAN GUESSED: at 390px the card's own content width was 307px, the
  sum of two legitimate but stacked paddings, `.pv-wrap`'s page gutter and
  `.pv-cta`'s own internal padding, and the headline's natural (unwrapped)
  width is 325px, so three lines was the genuine minimum at that width, not
  a `text-wrap: balance` side effect (checked: the previous, non-balanced
  wrap needed three lines too, and forcing the box to roughly 360px is what
  actually drops it to two, per a direct binary search over widths). Real
  per-line measurements taken with `Range.getClientRects()` on the text,
  since the block element's own `getClientRects()` collapses to one rect
  regardless of how many lines are inside it and had been read as "already
  fits on one line" at first, wrongly.
  `.pv-cta`'s own mobile padding came down from 22px to 16px, which is
  exactly the safe direction: the 22px value was itself chosen to GIVE the
  buttons more room over an earlier 34px+ floor that made them wrap, so
  taking it down further only gives everything inside more room, never
  less. Reverified at 320px and 390px, the two widths the original fix was
  measured against: both buttons still hold one line each, and the
  headline's available width grew from 307px to 319px. True two-line
  wrapping would need roughly 360px, which is not reachable at a 390px
  phone without removing the padding almost entirely, so this is a real,
  bounded improvement rather than a full fix to an exact line count.
  `tests/button-colours.spec.ts` (25/25 across both themes) and
  `tests/page-opening.spec.ts` still pass.
- [x] **The two CTA buttons ("Start a conversation" and the service-specific
  second one) were reported as both rendering white**, which would be
  exactly the "two of the same colour" fault `tests/button-colours.spec.ts`
  exists to catch. Checked fresh rather than assumed: `.pv-btn--accent`
  computes white-fill/black-text and `.pv-btn--light` computes
  black-fill/white-text on this band in both themes, matching the pair the
  hero already uses, and the full button suite passes 25/25. Nothing in
  the code needed changing; what was seen was very likely an
  not-yet-refreshed view of the previously deployed site, the same gap a
  few earlier rounds this session turned out to be.

## Closed 2026-09-15, the proof band's lede stops explaining itself

- [x] **"10+ years in business, 200+ clients on record, nothing invented"
  is gone from the proof band's lede**, at the agency's own read that
  "nothing invented" sounded defensive rather than confident, and that
  restating the same three numbers the tiles two lines below already show
  was saying it twice. The lede is one sentence now: "A creative and digital
  agency spanning brand, web, apps, software, SEO and social, delivered by
  one team." `proofLine()` in `lib/proof.ts`, which only ever existed to
  build that recap sentence, went with it rather than being kept around
  unused.

## Closed 2026-09-15, the proof band's headline, its "2K+", and white ledes on every band

- [x] **"Ten years in, with the numbers to show for it" wrapped onto a
  second line holding only the word "it".** `text-wrap: balance` was added
  to `.pv-mix`, the shared mixed-weight heading class every `<b>`-emphasised
  h1/h2 on the site uses, so a heading landing an orphaned short word on its
  own line is no longer possible on a browser that supports the property
  (every evergreen one) and wraps the old way, at no cost, on one that does
  not. The headline itself was also shortened, to "Ten years in, and the
  numbers to prove it", both because it reads tighter and for a wider
  margin against the exact browser width that produced the fault, which this
  repo's own checks do not run at.
- [x] **"Deliverables met" now reads 2K+, not 500+,** at the agency's
  correction of its own figure. `lib/proof.ts`'s `shortCount` renders a
  thousand or more as "2K" rather than "2000", the same shorthand
  `lib/estimate.ts` already uses for a figure this size; the counter still
  animates over the real integer (0 to 2000) so the motion stays smooth, and
  only the digits actually shown are compacted. Exported from `lib/proof.ts`
  rather than kept local to the component, so `tests/proof.spec.ts` pins the
  displayed string against the same rule the page renders with instead of a
  copy of it.
- [x] **Every lede sitting on a navy band or hero is white now, not the
  dimmed `--on-band-dim` lavender** it was reviewed and signed off with. The
  agency's own read: on a screen where the h1 above it is already the
  brightest thing on the page, the dimmed second line looked like reduced
  contrast rather than intentional hierarchy. Three rules carried it --
  `.pv-sec--band .pv-lede`, `.pv .wk-hero .pv-lede` and `.ab-cta__in
  .pv-lede` -- which between them are the lede on every `wk-hero` (every
  landing page's opening band) and every CTA band on the site, so the
  change reaches all of them from three lines. `--on-band-dim` keeps every
  OTHER job it already had -- captions, the footer's secondary links, code
  syntax highlighting -- untouched, because none of those were the
  complaint. `tests/page-opening.spec.ts`'s own 4.5:1 contrast floor for the
  lede against the band, in both themes, at both a phone and a desktop
  width, only rises with white text on navy; it still passes, 25/25.

## Closed 2026-09-15, the domain checker's waiting line spreads to every tool that waits on one

- [x] **The count-up on the homepage stats band was checked, not assumed.**
  Sampled `.pf__num`'s text every hundred milliseconds or so on a fresh
  scroll-into-view: 0, 115, 263, 393, 485, 500, easing into the real figure
  exactly as `useCountUp` in `components/sections/proof.tsx` was built to.
  Nothing needed fixing; the one time it looked frozen in an earlier check was
  a scroll timing artefact in the check itself, not the component.
- [x] **The domain checker's rotating "still working" line, the one that
  says "Consulting the domain wizards" instead of showing a bare spinner, now
  plays on every free tool that makes a real round trip**: the email
  deliverability check, the link preview checker and the on-page SEO
  snapshot, alongside the domain checker it started on. Pulled out into
  `components/tools/waiting-line.tsx` so the four tools share one component
  rather than four copies of the same interval logic, and so a fifth tool
  gets the same treatment by passing it a phrase list rather than
  reimplementing the rotation. EACH TOOL'S PHRASES ARE TRUE TO WHAT IT IS
  ACTUALLY DOING in that moment (fifteen DKIM selectors at once for email,
  cropping the image for WhatsApp for link preview, reading the page the way
  Google does for the SEO snapshot), not a generic set borrowed from the
  domain checker, because the joke only lands if it is honest about the
  wait. `ai-cost`, `name-checker` and the estimator's own questions stay
  without one: they are synchronous or answer as you type, so there is no
  dead air to fill and a rotating line on top of an instant answer would be
  decoration pretending to be a delay.
- [x] **The four tool pages whose "how it works" facts ran two and three
  sentences a bullet (domain, SEO, AI cost, link preview) were trimmed to
  the one-sentence-plus-a-clause shape the business name checker and the
  estimator already used**, so the seven tool pages read as one family
  rather than four terser ones and three that talk on. Every specific fact
  that earned its place stayed (300KB at 1200x630, the four Open Graph tags,
  the twentyfold spread between models, Nigeria's registry going down);
  what came out was the connective sentence restating what the fact already
  said.

## Closed 2026-09-15, the stats band tells the agency's own story and "studio" comes out

- [x] **The homepage stats band now shows the agency's own hand-set track
  record** (10+ years in business, 50+ projects shipped, 200+ clients on
  record, 500+ deliverables met) instead of the count of case studies and
  testimonials published on this site, at the agency's explicit direction
  after being asked to reconcile the two. `lib/proof.ts` was rewritten: the
  four figures are set by hand now, with a `REVIEWED` date beside them the
  same way `RATE_CARD` in `lib/estimate.ts` carries one, rather than derived
  from `CASE_STUDIES`/`TESTIMONIALS`/`SERVICES` at build time. The eyebrow,
  headline and lede changed with them, since "nothing rounded up" and "open
  any of them and see for yourself" stopped being true the moment the figures
  stopped being a count of what is on the site; they now read "Track record"
  and "Ten years in, with the numbers to show for it". `tests/proof.spec.ts`
  was rewritten to pin the new contract: the page shows exactly
  `lib/proof.ts`'s figures, each one carries the "+" it is owed, and the
  server-rendered-before-hydration guarantee still holds. THIS IS A DELIBERATE
  DEPARTURE from the "counted, not claimed" principle the band shipped with
  on 2026-09-15 (see the entry above), on the client's own authority over
  their own company's numbers; the principle itself was not wrong, it was
  reconciled against real figures too large to click through one by one.
- [x] **"Studio" is out of the site's own voice.** WDC calls itself a
  creative and digital agency, not a studio; "studio" reads as design-only,
  which is one service among several. Fixed everywhere the word was
  describing the company to a reader rather than describing a client's own
  recording or photography studio (`lib/work.ts`'s Thinkers Diary case study
  keeps every one of its "studio photograph" references, since that studio is
  the client's, not ours): the About page's hero, its "most agencies hand you
  a logo and leave" line, its work-section caption and its aria-label; the
  About page's metadata description, JSON-LD `Organization.description` and
  OpenGraph note; the blog's RSS description; the admin shell's own label,
  the settings page's copy, an expense form's placeholder, and the
  `/signed-in` door label in `lib/roles.ts`. Left alone, on purpose: the
  hundreds of internal code comments that use "the studio" as reasoning
  shorthand for "the company" throughout `lib/`, `components/` and `tests/`,
  which nobody outside the team ever reads, and the demo social-calendar
  entry "Studio reel", which is a generic example post idea, not a reference
  to WDC.
- [x] **No em dashes anywhere the site actually speaks**, extended past the
  free tools (closed 2026-09-15, above) to the rest of the app: transactional
  email subjects and a preheader in `lib/email-templates.ts` (a plain hyphen
  now separates a reference number from a title, the way most inboxes already
  show subject lines); two SEO-finding sentences in `lib/seo-audit.ts`; four
  tool API error/notification strings across `app/api/tools/*`; a rate-limit
  error in the login form; and the em-dash-as-empty-value placeholder used in
  nine table cells and detail rows across the admin money pages and the
  client-facing quote/invoice/receipt pages, now an en dash so the "no value"
  convention still reads as a dash without being the character asked against.
  A CSS `::before` that printed an em dash ahead of a client testimonial's
  name became an en dash for the same reason. Left alone, on the same
  reasoning as the tools sweep: the internal code comments throughout the
  repository, and test files, neither of which a visitor or client ever
  reads.

## Closed 2026-09-15, the estimator becomes a conversational form

- [x] **`/tools/estimate` asks its eight questions one at a time now**, not as
  eight cards in a column. The earlier version tried a wizard and put it back
  on the theory that hiding how much is left is how people abandon a form;
  what it was missing was the wizard's own answer to that objection, so this
  version carries the one the onboarding form already proved: a progress bar
  and a running "Question 3 of 8" say exactly how much remains. PICKING A
  CARD IS THE ONLY ACTION. There is no separate Next to press: choosing an
  option answers the question and turns the page after a short pause long
  enough to see what was picked, skipped entirely under reduced motion. A
  keyboard visitor gets the same thing for free, because Enter and Space
  already activate a focused button; nothing had to be built to fake a
  keyboard shortcut for it. Every step keeps a Back arrow, and the result
  screen keeps a "Change an answer" link that reopens the last question
  without losing what was already answered, so the one-way door a
  conversational form usually is never actually is one here. THE PRINT PATH
  WAS THE ONE REAL HAZARD: `tools.css` scopes its print rules to the page with
  `body:has(.es__form)`, and that selector needs the form element to still
  exist in the DOM once the wizard is done, so the finished questions are
  hidden with conditional rendering of the form's CONTENTS rather than the
  form itself disappearing. `tests/scope-estimator.spec.ts` was rewritten for
  the new interaction (12 cases, up from 8) and a fresh dev server run proved
  the whole path by screenshot: one question on screen at a time, the
  progress bar and count advancing with each answer, Back reopening a
  question with its answer still on it, and the print output unchanged.
  `lib/estimate.ts` was not touched, so `npm run check:estimate`'s 37
  assertions did not need to change and still pass.
- [x] **No em dashes anywhere in the six free tools**, the same rule the
  onboarding form and the blog already carry, extended to `app/tools/*`,
  `components/tools/*`, `lib/tools.ts`, `lib/ai-cost.ts` and `lib/psi.ts`.
  Nineteen of them, replaced with a comma, a semicolon or a colon depending on
  which the sentence actually needed, never with a rewrite that changed what
  was said.

## Closed 2026-09-15, from conversation

- [x] **A stats band under the homepage hero**, in the shape of the reference layout supplied: one card, a sentence and the site's two buttons across the top, a row of figures under a hairline with a rule between each. Everything inside it is ours -- Space Grotesk on the figures, Outfit on the prose, `--paper` on `--paper-2` so the card reads as a card in both themes, and an orange EYEBROW rather than an orange figure, because orange is an accent in type and not a headline. NOT ONE NUMBER IS TYPED IN: `lib/proof.ts` counts them from the same data the rest of the site renders -- 17 projects from `CASE_STUDIES`, 107 deliverables summed from every case study's `did` list, 13 clients on the record from `TESTIMONIALS`, 6 disciplines from `SERVICES` -- so adding a project changes the band the same day and there is no second copy to drift. That is the whole design rather than an implementation detail: a stats band is the easiest thing on a marketing site to lie with, `lib/work.ts` already refuses to carry invented client results, and this site has previously deleted eight fabricated testimonials attributed to invented people. THE SMALLNESS IS THE ARGUMENT -- seventeen projects you can open beats five hundred you cannot, and the copy says so ("A small studio with numbers you can check", "nothing rounded up"). Deliberately absent: revenue, satisfaction scores, uptime, years in business, team size -- none of which we can evidence, and any one of which makes a reader discount the four beside it. The counter runs once, on first sight, for 1.1s, and never under reduced motion; the figures are SERVER-RENDERED at their real values so a reader with no JavaScript is not told the studio has delivered nothing. `tests/proof.spec.ts` pins the lot: each figure against the data it claims to count, no suffixes, the no-JavaScript case, the position between hero and work, and one column at 320px. `.sr-only` was hoisted from `stages.css` (four pages) to `globals.css` (every page) while wiring the accessible reading of each figure.

## Closed 2026-09-15, section 1B: the free tools on the service pages

- [x] **AI running-cost calculator** shipped at `/tools/ai-cost` for `software`, the first item off section 1B's own "later" list and the last Tier 2 tool in `docs/tools-programme.md`. It answers the second question nobody asks: not what an AI feature costs to build, but what it costs every month for as long as it is switched on. Four shapes of work (answering questions, summarising, classifying, drafting) each pre-fill the two numbers that matter -- words read and words written per use -- and both stay editable, because the reader knows their own use better than four examples do. Out comes the same feature priced across EIGHT models from Anthropic, OpenAI and Google, cheapest first, in naira a month and kobo per request. THE SPREAD IS THE POINT: at 5,000 uses a month of a support-style feature it runs ₦3,139 on the cheapest model and ₦78,469 on the dearest, which is 25x for identical work, and the panel says so in one sentence rather than repeating the figures. No submit button and no email field anywhere on the page -- the arithmetic is pure and runs on the reader's device -- which `tests/ai-cost.spec.ts` asserts, because the day somebody puts a gate in front of it that test goes red. Prices carry a review date (September 2026) and their sources; the Claude rows are Anthropic's published rates, the OpenAI and Google rows were read off public pricing trackers and the page says only the provider's own page is authoritative. Tokens are estimated from words at 1.35, leaning high, and the page says that too. It reuses the site's ONE dollar rate from the estimator's `RATE_CARD` -- passed in as an argument rather than imported, which is what lets `npm run check:ai-cost` load the module straight into node. And it carries the sentence the programme asks of it: sorting into fixed buckets, matching a record or answering from a table you already have is ordinary code's job, said before we quote for the other thing. 29 assertions in the check script (relationships, not figures, so a price change cannot silently break a test nobody reads) and six browser cases.

- [x] **Scope and budget estimator** shipped at `/tools/estimate` for `software` and `apps`, server-rendered and indexable with its own title, description, canonical, breadcrumb and WebApplication JSON-LD, and in the sitemap. Eight questions -- what we are building, what exists, screens, accounts, payments, integrations, AI, timeline -- and the eighth produces a range in naira AND dollars with four phases, the day count and the assumptions the answers earned. THE WHOLE MODEL IS DAYS: each answer adds days of team time, one blended day rate turns them into money, and the phases are proportions of that, so the studio tunes the whole tool by editing one number in `RATE_CARD` (`lib/estimate.ts`). Two numbers in that card are the studio's to confirm -- ₦120,000 a day and ₦1,550 to the dollar, both dated 2026-09 and printed beside the figure. It NEVER produces a single number: the high end sits further from the middle than the low end (x1.25 against x0.85) because under-scoping is the failure mode of every estimate, and the words "a range, not a quote" sit in the same panel as the figure so they travel with the screenshot. The email ask comes AFTER the figure, never before it, and a print stylesheet gives "save as PDF" for nothing -- the same way the invoices and receipts already print, since this project has no PDF renderer and the checklist itself rules out a headless browser in a serverless function. Posted answers are re-checked against the question set and the estimate is recomputed server-side in the route, so no number a browser chose can reach an email over our name. 37 assertions in `npm run check:estimate` (properties, not figures, so the rate card can change without editing tests) and six browser cases in `tests/scope-estimator.spec.ts`, including that no figure appears until the eighth answer and that the email field does not exist before it.

- [x] **Link preview checker** shipped at `/tools/link-preview` for `social`, with the same page furniture and sitemap entry. Paste a URL, get four cards -- WhatsApp first, deliberately, because in this market it is the channel links travel through and the fussiest of the four -- each cutting the title and description where that platform cuts them, each showing the real og:image or the reason it will not appear. The measurements are dated and sourced in `lib/link-preview.ts` (reviewed September 2026) and the page says "about" rather than pretending to the character, because every one of these platforms redraws its cards without telling anybody. The image is probed through the same audited fetcher: bytes counted as they arrive rather than trusted from Content-Length, and the header parsed for real pixel dimensions -- `lib/image-size.ts` grew GIF and WebP for this, which is a dozen lines against a dependency and also fixes the case where a site that HAS optimised its images was the one we could not measure. WhatsApp's 300KB ceiling is enforced per platform, so the same image shows on three cards and not on the fourth, which is exactly what happens in life. Tags are read from the `<head>` only, so a page documenting Open Graph tags is not read as having them; `name=` is accepted where the specification says `property=`, because the crawlers accept it. 43 assertions in `npm run check:link-preview` and six browser cases in `tests/link-preview.spec.ts`, rendered from a fixture rather than a live site so the suite does not depend on a stranger's uptime.

- [x] **On-page SEO snapshot** shipped at `/tools/seo`, with the full Lighthouse report emailed. Instantly and free: indexing (noindex first, because it is the only finding that makes everything else academic and it is almost always an accident), title and description lengths, one-H1, canonical, viewport, HTTPS, the three Open Graph tags, images missing `alt` -- where an EMPTY alt is correctly counted as done rather than missing -- and JSON-LD types, with blocks that will not parse counted as none because that is how Google treats them. Then the ask: "the full Lighthouse report takes about a minute, where should we send it?", and `POST /api/tools/seo/report` answers immediately and does the work in `after()`, exactly as the contact receipt does. `lib/psi.ts` is the only Class B thing on this site: capped at 300 runs a day through the shared `lib/quota.ts` counter (which fails closed, so an outage cannot become an open tap on Google's meter), the spend recorded BEFORE the call, and the raw PageSpeed JSON never leaving the server -- four scores and the three largest opportunities come out of it. With no key or a spent budget the email still goes, carrying every on-page finding and a line saying a person will run the rest, which is rule 4 of the programme written as a feature rather than an apology. 51 assertions in `npm run check:seo-audit` and six browser cases in `tests/seo-snapshot.spec.ts`.

- [x] **What your site costs a Nigerian visitor**, bolted onto the SEO result rather than given a page of its own. Page weight becomes naira and seconds: the default ₦250 a gigabyte is a mainstream MTN/Airtel bundle rate as of September 2026 (pay-as-you-go runs near ₦4,600, which is the case the editable input exists for), and the wait is Chrome's own Slow 3G profile at 400kbps, chosen because the question worth answering is what happens to the person having a bad day. It shows one visit, a thousand visits and our own homepage measured the same way on the same day -- fetched, not remembered, because a hard-coded figure for our own page is the sort of number that is quietly wrong for a year. IT SAYS WHAT IT MEASURED: the HTML document alone, which is all one fetch can honestly weigh, with images and scripts on top and Lighthouse counting those. Worth knowing and acting on: our own homepage HTML measured 428KB against example.com's 559 bytes, so the comparison currently flatters nobody. Arithmetic checked in `npm run check:seo-audit`; the panel, the editable rate and the half-typed-rate case in `tests/seo-snapshot.spec.ts`.

- [x] **The registry is now the only list.** `lib/tools.ts` grew four rows and every consumer followed on its own: the footer's Tools column, the `ServiceTools` row on each service page, and -- new -- `app/sitemap.ts`, which had the three original tools written out by hand and would otherwise have shipped four live, linked, indexable pages it had never heard of. That is the exact failure the sitemap's own header note says the file exists to prevent. `tests/service-tools.spec.ts` was rewritten to read the registry rather than copy it: it had a hard-coded list of three tools and a test naming the one service with no tool of its own, and after this section every service has one. The replacement asserts the rule over all six services instead, so a seventh service with no tool is covered without anybody remembering to come back.

- [x] **`lib/fetch-page.ts` refactored to one audited path.** The og:image probe needed a second kind of fetch, and the alternative was a second copy of the redirect-and-revalidate loop in another function -- two copies of an SSRF guard being one copy that gets fixed and one that does not. `walk()` now holds the hop loop and `readCapped()` the byte ceiling; `fetchPage` and `probeImage` are thin over both. No guard changed: `npm run check:fetch-page` still passes every case, and the pure rules it exercises live in `lib/net-guard.ts` as before.

## Closed 2026-09-14, from live-site review

- [x] **Email deliverability check** shipped at `/tools/email`, server-rendered and indexable with its own title, description, canonical, breadcrumb and WebApplication JSON-LD, and in the sitemap. A domain or an email address in (people paste the address, so the domain is taken out of it rather than refused); out comes DMARC, SPF, DKIM and the MX provider, each with a sentence saying what it means for the reader rather than a record dump. `node:dns` only: no dependency, no key, no quota. Every lookup goes through ONE `lookup()` so it can become DNS-over-HTTPS in one place if a runtime ever blocks UDP/53, and it pins 1.1.1.1 and 8.8.8.8 rather than trusting a serverless region's internal resolver. DMARC is listed FIRST deliberately, because it is the finding with a consequence a reader feels; there is no score out of ten, because a number lets somebody feel finished at 7/10. Verified live against real domains: our own reports the exact fault `plans/email-deliverability.md` records (DMARC `p=none` with no `rua`, SPF `~all`), github.com reports quarantine and Microsoft 365, an email address resolves to its domain, and junk input is refused with 400. DKIM probes fifteen selectors concurrently and says plainly that a miss is not proof of absence, which google.com demonstrates: it publishes on a selector outside the guessable set. Node runtime pinned, `maxDuration = 15`, 10 calls a minute per caller, 5-minute cache.

- [x] The six blog posts are real articles now, rewritten by the founder. Measured before and after: they ran 113 to 205 words, which is a long excerpt rather than a piece anybody finishes; they now run 800 to 1,148 words, mean 924, 5,544 across the six. Longest is the Nigeria website-costs piece at 1,148; shortest is the designer-handover piece at 800.
- [x] Reading-time estimate revisited against those real posts, which is the first time there was anything real to revisit it against. At 200 words a minute the six now read 4 to 6 minutes, and the figures order the posts correctly. **200 stays, deliberately.** The best available figure for adult silent reading of English non-fiction is about 238 words a minute (Brysbaert's 2019 meta-analysis of 190 studies) and Medium uses 265, so 200 is a ~19% cushion rather than an accident. The asymmetry is the argument: this number exists so somebody can decide whether they have time right now, and promising six minutes while taking five is a pleasant surprise, where promising four and taking six is the reader feeling misled on the one signal we gave them. Two real counting faults fixed while there: `"".split(/\s+/)` is `[""]`, so an empty string counted as ONE word, and a string with a leading space gained a phantom word at the front. Both now go through one `countWords` helper that trims and filters.

- [x] **Domain availability checker** shipped at `/tools/domain`, server-rendered and indexable in its own right with its own title, description, canonical, breadcrumb and WebApplication JSON-LD, and in the sitemap. One name in, six endings out (`.com .ng .com.ng .africa .app .co`), through the SAME `/api/domain` the onboarding form uses, because it is the same question of the same registries and two routes would be two things to keep in step. Resolved from IANA's bootstrap with longest-suffix matching: 404 available, 200 taken, anything else honestly unknown. Verified live: `.com`, `.africa` and `.app` answered; `.ng`, `.com.ng` and `.co` came back unknown, `.co` because it publishes no RDAP service at all. The trap the item warned about is avoided -- `wedigcreativity.com.ng` is REGISTERED and reports unknown, which is exactly what an NS lookup would have got wrong by calling it available. No dependency added, about 1KB of client code, work server-side because `connect-src 'self'` forbids the browser reaching a registry.
- [x] `jsqr` and `pngjs` added as devDependencies. Both were imported by `tests/money-documents.spec.ts` and `tests/money-print.spec.ts` and declared nowhere, so `npm run build` ended in "Failed to type check" and EVERY production deployment after those tests landed came back ERROR -- including `916ed44`, which failed for this and not for anything in that commit. Build green again.

- [x] Resume links expire after 3 days, and a client who misses that window can now get another one WITHOUT emailing a human. The expiry, replay rejection, invalid-link handling and rotation were already done; the missing half was self-service reissue, and the resume route's answer to an expired link was literally "Request a new link from WDC". `POST /api/onboarding/reissue` closes it, and both dead ends (expired, and already-used) now return `canReissue: true`. It is deliberately a NON-ENUMERATING oracle: unauthenticated and taking an email address, a truthful answer would let anyone learn whether a given person has an unfinished WDC onboarding, so the response is identical whether the address has a draft, has none, or was never seen -- including when the database or the mail send fails, because a different status or timing is still a signal. The link goes to the address ON THE DRAFT and there is no field to nominate another, which is what stops it forwarding somebody else's answers. Issuing revokes every outstanding unused token for that draft in the same transaction, so an old link is not a second key. Only `status = 'in_progress'` drafts qualify: handing an editable link to an already-submitted form would let answers we have acted on be changed. Origin-checked, rate-limited to 4 per 15 minutes, and the send is not awaited because this mail server takes ~23s just to authenticate.
- [x] Completion time and question count validated per service, computed from `lib/onboarding.ts` and its own `SECONDS` weights rather than estimated. Shortest path (no conditional revealed) to longest (every conditional revealed): branding 7-9 min over 24-35 questions, seo 8-9 over 26-35, apps 7-9 over 27-37, software 8-9 over 26-35, web 7-11 over 29-45, social 9-12 over 30-51. Every service sits inside a three-minute spread at the short end, which is the number a client actually experiences, and 20 always-shown questions are the shared core and closing steps rather than anything a service adds. The new `domains` field is weighted 45s, deliberately above `textarea`, because naming a business is the slowest question in the form.

- [x] **The footer's helper line is bent along the subscribe bar's own arc**, not along a second curve eyeballed into agreement with it. `components/ui/curved-note.tsx` imports `buildGeometry` and `bentLinePath` from the curved input and calls them with the arguments the bar itself passes, so the two are the same circle by construction and stay that way when the bend changes, which it does on every resize. The text sits at a constant `v` below the bar's centreline, which makes it a CONCENTRIC arc rather than a scaled copy: very slightly shorter than the bar, because an arc drawn inside another one is. TWO SEPARATE SVGS WAS THE TRAP -- both draw at scale 1 into the same coordinate system, but stacked by normal flow the note's box starts wherever the bar's box ends, and the bar's box carries the arc's dip plus its padding underneath, so a `gap` of 15 measured 45px on screen and the number was controlling nothing; the note is pulled up by the difference, which welds the two coordinate spaces together and makes `gap` real. TEXT ON A PATH CANNOT WRAP, so the sentence is measured against the usable arc length by an off-canvas ruler at the nominal size (measuring the visible copy would measure whatever size it had already been shrunk to, and the ratio would chase itself smaller every render) and the type steps down to fit; below 82% it stops pretending and renders as ordinary wrapped text, which is what a 280px column wants anyway. The ERROR message is never bent: its length changes at runtime, it is longer than the standing line, and it is the one sentence here that has to be read and acted on rather than admired. Announced once despite being in the DOM three times, because screen reader support for text inside `<textPath>` is uneven enough to leave to chance: the drawing and the ruler are `aria-hidden` and a plain node carries the words. Bend raised from 0.045/8/26 to 0.062/10/34 of the measured width on request. Pinned by `frontend/tests/curved-note.spec.ts`: the arc rises in the middle, is symmetric end to end, clears a real sagitta, falls back without losing a word at 320px, exposes exactly one copy to assistive technology, and never lets the page scroll sideways at six widths.
- [x] **The subscribe column is the widest of the five, and it had to become so.** Adding the Tools column took the width away: the fifth column measured 208px, which left about 32px of usable room between a fixed-width Subscribe button and the icon, so the button sat on top of the placeholder. A link list can be narrow and wrap; a field cannot. `1.3fr .8fr 1.3fr .8fr 1.1fr` becomes `1.15fr .7fr 1.2fr .7fr 1.75fr`, and the five-column layout now starts at 1280px rather than 1000px, because measurement says the last column does not clear the ~300px its control needs until then, and below that the whole five-column grid is cramped at once with "Domain checker" wrapping in a 106px Tools column. The breakpoint stops one pixel short of 1280 rather than rounding down, so the commonest laptop width gets the better of the two layouts. Swept at 15 widths from 320 to 1600: no horizontal overflow anywhere, and the helper line curves at every width except 320, where it correctly falls back.
- [x] **The name checker says what it is for in four words and stops explaining itself.** First version answered the question and then spent three paragraphs headed "What this has not told you" justifying the half it could not answer, under a heading that asked "Will CAC accept your business name?" All true, all unreadable, and it buried the thing somebody came for. Rewritten: the h1 is "Is your business name available?", the lede is one line saying it is two steps, and the disclaimer is now STEP 2 -- a short block headed "Is it already taken?" with a **Copy name** button and **Open CAC register**, because CAC's search takes a pasted name and two taps beats retyping what you just typed. Same limitation, same honesty, reframed as the next thing to do rather than as an apology, which is also the version that converts. Every finding's copy was cut to roughly a third: the consent one went from 46 words to 15, the suffix one from 38 to 13. The four-paragraph essay under the tool became three one-sentence cards. Measured: a three-finding result is 107 words of output where it used to be well over 250. Pinned by the spec, which now asserts step two is present whether the name passed or failed and that the register link is reachable.
- [x] **`/tools/business-name`, the free CAC name checker, shipped with no provider behind it.** Free here is an architecture, not a price: `lib/cac-name.ts` is pure, so the whole check runs in the visitor's browser. No route, no key, no quota, no rate limit, no bill, and nothing to cap. It reads a proposed name against CAMA 2020 section 852: the words section 852(2) says need the Commission's consent, and whether the ending matches the entity, which is why the entity is asked FIRST (a business name may not wear "Ltd"; a company must end in Limited, Plc or Unlimited, so asking afterwards would check the wrong rules). It NEVER says "available", and a panel headed "What this has not told you" renders whether the name passed or failed, because the commonest way a checker like this misleads people is by being right about the small half and silent about the big one. THE PRIVACY LINE IS THE REAL DIFFERENTIATOR and no paid lookup can make it: a business name is an idea somebody has not registered yet, and this one never leaves their device. Registered in `lib/tools.ts` under `branding`, so it appeared in the footer Tools column and on the brand service page without either file being touched, plus its own metadata, canonical, WebApplication JSON-LD and a sitemap entry. Pinned by `frontend/tests/name-checker.spec.ts`, whose first assertion is that the page issues ZERO fetch/xhr/websocket requests while answering, because the day somebody quietly adds one the tool gains a per-call cost, a rate limit, a privacy story and a bad day when it is popular.
- [x] **The orange left bar is gone from every status surface, site-wide.** A 3px coloured stripe down the left edge of a white card is the default look of every generated component on the internet, and it was the ONLY place this site marked state that way: everything else uses a solid `--paper-2` icon chip with a hairline, which is what `.ct-line__i` and the free-tool cards already were. `.tl__find` (both the name and email checkers) is now that chip plus the title plus an uppercase state word, three carriers and none of them a colour alone, on the same 16px hairline card as everything else; the state pill also stopped floating right on `margin-left: auto`, which marooned it on its own line as soon as a title wrapped. `.ob__reassure`, `.pv-note` and `.doc__warn` became hairline panels on `--paper-2`. `.ob__f--sub` keeps its rule, because that one is hierarchy rather than status and the indent needs an edge to indent from, but the orange became `--rule`. Blog and work pull quotes keep the rule and lose the orange. The TOC active markers keep theirs: a coloured left edge on the current item in a contents list is navigation, not a status badge, and reads as neither.
- [x] **The free tools become a programme rather than a pile**, written up in `docs/tools-programme.md` after the studio asked for a tool on every service "but not at something that would be cutting off my neck in terms of expenses. Maybe have fallbacks if it's not available." Three cost classes, and only one of them can hurt: **A** is free forever (pure computation, or a protocol anyone may speak like RDAP and DNS, or fetching a page the visitor gave us), **B** is somebody else's free quota (PageSpeed at 25,000/day, where the risk is being cut off rather than charged), **C** is real money per call (the CAC register lookup at roughly ₦19). Both shipped tools are class A and always will be. Four rules hold the line. **Every tool has a class A floor** -- no tool may exist that can only answer by spending money, so what degrades on a spent budget is the expensive half, never the tool. **The cap is set in naira, not calls**, because "400 lookups" is not a decision anybody can make and "₦8,000 a day" is. **Cache before you spend**, on the normalised query, because the cost of a tool is the number of DISTINCT questions and popular names get asked over and over. **Running out is a lead, not an error**: the free answer plus "leave your email and we will check the register by hand" ends with a name, an address and a reason to reply, which beats the automated answer. Tools are ranked by whether they answer an anxiety the visitor already has rather than by filling a six-row grid, and the recommendation is explicitly NOT six: tiers 1 and 2 are five tools across web, brand and SEO, and tier 3 is only if a quiet week wants filling.
- [x] **`lib/cac-name.ts`, the free half of the business name checker**, built before any provider exists and deliberately so. It reads a proposed name against CAMA 2020 section 852 with no network call, no key and nothing metered: the words section 852(2) says need the Commission's consent (federal, national, regional, state, government, municipal, chartered, cooperative, group, holding(s), building society), and whether the ending matches what is being registered -- a business name may not wear "Ltd" because that claims an incorporation it does not have, and a company name has to end in Limited, Plc or Unlimited. Those are the two commonest reasons a filing comes back and NEITHER depends on who else is on the register, so asking a paid lookup about them spends money on the wrong question. It never says "available": section 852(1) turns on names "calculated to deceive" and on misleading the public as to the nature of the business or the nationality, race or religion behind it, and no function decides that, so every finding is reported as something to KNOW rather than as a refusal. The word list is deliberately conservative -- a word we could not attribute to the section is left out. `lookupKey()` strips the ending so the free layer and any future paid layer cannot disagree about what the name is, and so "Wendi Loveee Ltd" and "Wendi Loveee Limited" are one cached question rather than two paid ones. 28 cases in `npm run check:cac-name`, about half of them asserting that NOTHING was reported, because a false alarm on somebody's good name teaches them to ignore the real warnings: "Stateside" is not "State", "Grouper" is not "Group", "Nationality" is not "National", "Cooperation" is not "Cooperative". Proved non-vacuous by swapping whole-word matching for substring matching, which turned four of them red.
- [x] Domain availability comes from RDAP, the registries' own records, via the IANA bootstrap at `data.iana.org/rdap/dns.json` (590 services). Free, no account, no key, and authoritative -- DNS was rejected outright because a parked domain has no zone, so NXDOMAIN would tell a client a name is theirs to buy when somebody owns it. **Measured 2026-09-14, and it changed the design: `.ng` is listed in the bootstrap and does not work.** rdap.nic.net.ng returned 502 or timed out on every attempt including its own root, and `.io` and `.co` publish no RDAP service at all. For a Nigerian studio "unknown" is therefore a normal answer, not an edge case, so it is a designed first-class state that says we will check that one by hand. `lib/rdap.ts`.
- [x] `components/onboarding/domain-field.tsx` replaces the free-text box on "three domain names you would like". Up to three names with add and remove, an explicit Check availability button (never check-as-you-type: every keystroke would be a request to somebody else's registry), and a per-name available/taken/unknown result carrying its own icon and words so it does not depend on telling green from red. Replaces a textarea that promised "we will check what is free" and then produced a paragraph somebody unpicked by hand days later.
- [x] The check is optional, conditional and bounded, verified against a running build rather than by reading the code. Shown only when the client answers "Neither" to having hosting and a domain. `POST /api/domain` validates and deduplicates server-side, caps at three names per call, rate-limits 12 calls a minute per caller through the existing `lib/rate-limit.ts`, and caches for 60s including the unknowns, because a registry that is down stays down. Tested live: google.com -> taken, a nonsense name -> available, wedigcreativity.com.ng -> unknown with its note, junk input -> 400, the 13th call in a minute -> 429, and five names submitted -> three returned. The response carries "Availability is informational until a name is actually registered" on the wire as well as in the UI, and no registrar pricing appears anywhere.
- [x] The checker is OFFERED rather than imposed, and choosing a name is part of the answer. The question used to arrive fully assembled -- an extra button, three status slots and a paragraph of caveats -- on a question most people answer by typing a name they already had in mind. It now opens as three boxes and one offer ("Want us to check if these names are free?"), and declining folds it away behind a reversible "Check them for me", like every other deferral on this form. Accepting reveals two tips and the check. A result that is not already registered carries **Use this one**; one tap records it as the client's first choice, and it is stored as plain words on the end of the line (`free-one.com (first choice)`), so the draft, the review screen and the admin record all read it without parsing and without a migration. Picking it also earns the sentence that actually matters: a check is not a reservation, we confirm it is still free, and we register it in the client's name once both sides have agreed. **NO QUESTION WAS ADDED** -- the opt-in and the pick are local state inside the control, not `Field` entries, so the step count, the completion estimate, the validation and the review screen are all unchanged. Two faults found while proving it: the review screen and the admin submission view both ran multi-line answers together into one string (no `white-space: pre-line`), which made three domain ideas read as "yourbusiness.comanother.ng"; and the Check availability button was still an orange fill, which the button rule forbids outright, so it now takes `--btn-fill`/`--btn-ink` from the ground like everything else. Pinned by `frontend/tests/onboarding-domain.spec.ts` with the registries stubbed.

- [x] All six services have their own onboarding question set, and the burden is genuinely equivalent. Counted from `lib/onboarding.ts`: branding 7 fields (4 always shown), seo 7 (6), apps 9 (7), software 7 (6), web 17 across three steps (9 always shown), social 23 across two steps (10 always shown). The always-shown number is the one that matters for fatigue, and it lands between 4 and 10 for every service. Social and web carry more TOTAL fields only because most of theirs are conditional: a client on two platforms answers two handle questions and never sees the other seven.
- [x] Conditional display is implemented throughout, not bolted on: 36 `showIf` rules across the form, 13 of them in the social steps and 8 in the web steps. A field declares `showIf: { key, equals }` and is revealed by the answer above it, so nobody is shown a question their previous answer made irrelevant.
- [x] The single-choice control already applies the ten-option rule: `select-field.tsx` sets `searchable = options.length > 10`, and the search box is rendered only when that is true, so a short list is a plain list and a long one can be typed into. Stacking checked rather than assumed: the popover is `z-index: 1000` in picker.css against 112 for the UserWay and back-to-top controls and a forced 110 for Jotform's container, and no ancestor of the picker opens a stacking context that would trap it (the only `z-index: 1` in form-kit.css is on a button inside the dropzone).
- [x] The onboarding page has a main heading: an `sr-only` h1, "Client onboarding", at `app/onboarding/page.tsx:54`. Visually hidden rather than displayed because the page opens on its own progress UI, but it is present for the screen-reader users who navigate by it. (Finding A4.)

- [x] Every service page answers questions a buyer of THAT service asks, and emits FAQPage structured data describing exactly the questions rendered. The block, the accordion and the JSON-LD were already wired; what was missing was the content. Counted before writing any: branding had ZERO questions tagged to it, so its page showed five general ones and answered nothing specific to branding, while seo, web and social had one each. Six new questions take the set from 10 to 16, and every service now leads with one of its own -- branding 3, web 3, and 2 each for seo, apps, software and social. Verified by parsing the FAQPage JSON-LD out of all six built pages: 5 questions each, specific ones first. Every answer is drawn from what lib/services.ts already says the studio does; no price, no turnaround, no capability invented for the tag.

- [x] Case-study titles fit, and the brand suffix is no longer dead code. The fitting logic was already in place, but it appended `COMPANY_NAME` -- "We Dig Creativity Solutions (WDC Solutions)", a 45-character suffix against a 60-character budget. Measured across all fifteen case studies, the two branches that carry the brand NEVER ran: thirteen fell through to sector-without-brand and two to the client alone. The comment also claimed the brand came from "the root template", but the page returns `title.absolute`, which bypasses the template entirely. Now appends `SITE_NAME` (20 characters), the same short name every other page carries. Titles measure 11-56 characters, all inside 60.
- [x] Meta descriptions on the work category and legal pages now land in the 120-160 range, verified by reading `<meta name="description">` out of the built HTML rather than by estimating. Legal was 75-114: whole sentences from the document's own `intro` are appended while they fit, which only helped the cookie policy, so the "Last updated" date is added when there is still room. It is what someone checks on a policy, it is already on the page, and it fits where a sentence does not. All four now 135-146. Work categories were 100-118: real client names are appended one at a time and dropped whole when the next will not fit, so the sentence never ends on half a client. All six now 142-155. Two grammar faults surfaced while doing it and are fixed: `c.label.toLowerCase()` was rendering "1 project in seo" (and would have done the same to AI and PPC), and the plural tail did not agree with its own count -- "1 project in seo, every one of them live".

- [x] The blog contents rail stops where the article does. A sticky element releases at the edge of its CONTAINING BLOCK, and a grid item's containing block is its GRID AREA -- while the rail and the whole of the end matter shared one row, the rail's area ran to the bottom of the longest column, so the contents list went on travelling beside the share row, the QR code and "Read next", long after there was any heading left to point at. The share row, QR and "Read next" now sit in row 2 as `.bl-after`, leaving the rail's area ending with the prose. That is also the honest grouping: those are things you do AFTER reading. The tags stay inside `<article>` because they describe it, and `.bl-after` keeps `.bl-post`'s 74ch measure so nothing moved on the page. Single-column below 1000px resets the explicit placement, or the end matter would be stranded in a column that no longer exists.
- [x] The contact page's left column is sticky beside the form at 980px and up, the same pattern the blog and legal rails use. `align-self: start`, because a stretched grid item has no room left to move in. Deliberately NOT sticky below that breakpoint: the columns stack there, and a sticky block in a single column would pin the contact details over the form someone is trying to type into.
- [x] The contact form's phone field uses the real dial-code picker instead of a `+234 …` placeholder, which asked a visitor to know their own dial code and quietly assumed Nigeria for everyone who did not. It reuses `components/onboarding/phone-field.tsx` rather than growing a second control: mounted with `ssr: false`, because that component reads a detached canvas during its first render to decide whether the platform can draw flag emoji, which has no meaning on a server -- and which also keeps the phone-number library off the page until the field is reached. The value rides to `FormData` in a hidden input, and a placeholder box of the same height holds the row still until the picker arrives.
- [x] The band CTA blocks were never narrow; their HEADINGS were. A 20ch cap inside a centred grid broke "Describe the problem and we will tell you which of these it is." onto three short lines in the middle of a box several times that wide, so the whole block read as indented. `text-wrap: balance` now gives the tidy ragging the cap was there for without deciding the width in advance. Fixed in `.pv-cta` and `.sv-cta__box` together, because they are the same component wearing two names; the ledes keep a measure, since prose is what actually suffers when a centred line runs long.
- [x] The `/login` testimonial is smaller (from clamp 1.3-1.85rem to 1.12-1.45rem). At the old size the longest of the three quotes ran to five lines and filled the panel, making a supporting detail compete with the form beside it -- and because the tallest quote sets the height for all three, that cost was paid on every one.

- [x] `3ad31d9` deployed to production. It was never an unpushed commit: it was already on GitHub, had been auto-deployed by the git integration, and came back `BLOCKED` by the Hobby-plan private-repo rule (the gate is on the commit author's GitHub LOGIN, not the email, which is why changing the commit email never helped). Recreated through `POST /v13/deployments` as the account owner, which bypasses that gate, and it reached READY.
- [x] The dark band at the top of every landing page was INDENTED, not merely narrow. `.wk-hero__in` carried `max-width: 62ch` inside a `.pv-wrap` that centres what it holds, so the cap did not shorten the band's content, it CENTRED it: the breadcrumb and title started several hundred pixels right of where every other section begins. Now `max-width: none`, with the lede keeping a 62ch measure because a line of prose at full desktop width is genuinely harder to read. One rule, eight route families: blog, contact, legal, legal/<slug>, services, services/<slug>, work, work/<category>. Note the rule had MOVED into `preview.css` in `3ad31d9`, so an earlier local fix was editing an address that no longer existed.
- [x] The homepage chevron travels with the rotating phrase again. `reserveWidth` holds the box of the LONGEST phrase and centres the live one inside it, so a chevron rendered as a SIBLING stayed pinned to the box edge while the words floated to the middle: the gap was half the difference between the longest and current phrase, and it resized on every cycle. `TextType` takes a `prefix` now, rendered inside the centred cell and measured into the hidden sizer, so it shrink-wraps with the text and the line still never reflows. The `justify-self: center` that stops the cursor and typing text becoming LCP candidates is untouched.
- [x] **Images on three live routes were returning 400, not loading slowly.** `next.config.ts` declares `images.qualities: [70, 78, 85]` and Next 16 rejects any quality the config does not list -- verified by reading `next/dist/server/image-optimizer.js`, which answers `"q" parameter (quality) of 74 is not allowed` and serves nothing. Four call sites asked for undeclared values. The worst was the blog post hero at 72: it is marked `priority` and IS the page's largest contentful paint, so the one image each post is built around was the one failing. Also the service-page case-study rail at 74 (while `/work/<category>` passes 78 for the very same `.wk-card`) and the feed-wall thumbnails at 68. All moved to the nearest declared value. `services-body.tsx` has two more at 74 and was deliberately left alone: it is the unreferenced file already queued for deletion above.
- [x] The blog contents rail says which section is being read. It had no active state at all -- eight links and no answer to the one question a contents rail exists to answer -- while the LEGAL rail has had one since it shipped. `components/blog/toc.tsx` reuses `legal-toc.tsx`'s mechanism exactly, including the `-30% 0px -55% 0px` band, rather than inventing a second one, and keeps the `<details>` collapse on phones. An observer rather than a scroll handler, because position alone cannot tell you the current heading without measuring every section per frame. `aria-current` carries the same information as the marker.
- [x] Removed the drop shadow from `.wk-card:hover`. The lift and the accent border already say the card is live, and `.bl-card` never had one, so the two rails now agree. The orphaned `box-shadow` transition went with it.
- [x] Blog cards are shorter without becoming fixed-height: the cover goes from 16/10 to 16/9 and the excerpt clamps to two lines rather than three. Both stay fluid, so a card still shortens as its column narrows.
- [x] Section heads are centred everywhere. `.pv-head` is centred by default and exactly two places opted out with `.pv-head--left` -- the homepage services block and About's "how we think" -- so both sat left-aligned among centred siblings. The modifier is deleted rather than left for someone to reach for again.
- [x] The fixed half of the homepage headline no longer ends in an ellipsis.
- [x] Chat returned to the real Jotform embed, by the owner's explicit decision taken with the measurements in front of them. Both cheaper versions were faster: the vendor loader pulls `for-embedded-agent.js`, 6,295,207 bytes served UNCOMPRESSED (requested twice, once with `Accept-Encoding: gzip, br` and once with `--compressed`, neither response carrying a `content-encoding` header), and Lighthouse attributed 10,096ms of blocking to `jotform.com` against 0ms for `jotfor.ms`, the agent's own iframe -- so all of the cost is the parent-side bundle and none of it is the conversation. What the alternatives cost is that neither is the vendor widget 1:1: framing means WE own the launcher and panel shell, losing Jotform's auto-open, the greeting-bubble animation and the picture-in-picture voice handoff. Asked directly whether a restyled launcher would be identical, the answer was no, and the owner chose 1:1. `993063d` reverted, CSP again allows Jotform's origins, orphaned facade CSS deleted, `chat-facade.spec.ts` removed because its first assertion is now false by design, and the measurements written into the component so this is not quietly optimised back.
- [x] The `--accent` step number on a service card was orange on a pale ground at about 2.8:1, a decoration rather than a number. Navy is 16.5:1 there, and black on the orange hover card is 7.11:1, which is the rule every accent fill on this site already follows.
- [x] The SERP demo's mask faded its bottom edge to fully transparent over the last 9%, which is exactly where the highlighted "your page" row arrives: the one row the whole animation exists to show was the row being erased. It eases to 55% now. The top keeps the harder fade because nothing important arrives there.

## 1. Public frontend

- [x] The remaining mobile vertical-scroll catch, reported as Edge for iOS specifically and not other iOS browsers. Lenis was confirmed absent on touch, so it was ours. TWO causes, both found by reading what runs per frame rather than by guessing. (1) `components/ui/scroll-reveal.tsx` scrubbed `filter: blur()` per word against the scroll position -- a paint-time filter, with `will-change` already giving every word its own layer, so a paragraph repainted dozens of layers in step with the finger. On touch it is now one CSS opacity transition per word, staggered by the word's own index and latched on first sight; pointer devices keep the scrubbed version and ScrollTrigger now loads only on that branch. (2) `components/ui/scroll-top.tsx` read `scrollHeight` and `clientHeight` every scroll frame to size the progress ring, which forces layout; the page height is now measured on resize and by a ResizeObserver instead, and the threshold no longer schedules a render per frame. Cause (2) is the likeliest reason it showed on Edge and not Safari: Edge animates its own toolbar far more eagerly while scrolling, so layout was dirty frame after frame rather than occasionally.
- [x] Make /services respond and scroll smoothly. (Profiled at 4x CPU throttling: 81.6% of scroll time was `(program)` -- style, layout and paint, not script -- with 1,356 style recalculations against the homepage's 1,608 costing twice as much each. Root cause: `LazyStage` mounted each demo once and then disconnected its observer, so all six ran timers for the rest of the visit, off screen. A non-latching live gate now pauses them: measured sitting still with all six mounted and none on screen, stage mutations went from six demos running to ZERO, and a full scroll dropped from 1,413 DOM mutations to ~1,070. The remaining "visible marquee writes a transform every frame" was then measured rather than assumed, sitting still on /services at 4x CPU throttling for ten seconds: with the marquees running, main-thread task time 6.985s and script 0.598s; with every marquee track removed from the page, 5.919s and 0.346s. So the rAF itself accounts for about 0.25s in ten seconds and the other 0.8s is paint and composite of a moving row, which a CSS keyframe still pays. Converting would therefore recover roughly 2.5% of the main thread and would cost the eased hover ramp, because CSS can pause an animation but cannot ease between two speeds. Not worth rewriting a component the hero also uses; the loop already stops dead off screen and drops its layer hint with it.)
- [x] The intro logo card carries no orange outline. Both faces of the flipping card are neutral: the front is `border-line` on `bg-surface` and the back is `border-white/25` on `bg-primary`. The only orange left in the intro is type -- the wordmark and the service names in the paragraph -- plus the skip button's hover, which is a deliberate accent on an interactive control rather than an outline on artwork.
- [x] Point the seven homepage project cards, and the `/work` cards, at our own case studies instead of opening the client's site in a new tab; move the outbound link inside the case study. (Finding C1. Fifteen case studies exist with their own URLs and currently receive no internal links at all, so a visitor who gets interested lands on somebody else's website. The audit calls this the cheapest commercial win available.) (Done: all seven verified pointing at /work/<category>/<slug>, every destination resolving. The plain click still opens the live preview, and the preview now offers the case study as its primary action with the client site beside it.)
- [x] The "hundreds of client accounts" claim is gone from both places it appeared: the Contact FAQ and the homepage "Every budget" card. Neither sentence was carrying its paragraph anyway -- the FAQ answer is the offer to be told honestly what a budget covers, and the card's promise is that the standard does not drop when the budget does. Both now say that instead of a number nothing on the site evidences. (Finding C2.)
- [x] Social preview images added for `/work`, the legal index and every legal page, drawn by the same `ogCard()` helper the other pages use. The work card counts `CASE_STUDIES` rather than hard-coding a number, and each policy card is generated from `LEGAL_DOCS` so a retitled document cannot keep a card naming the old one. Verified: all three routes return 200 image/png. (Finding S2.)
- [x] Canonicals fixed. The root layout canonicalises to the site root and metadata is INHERITED, so both pages were declaring themselves duplicates of the homepage -- the onboarding page had a comment explaining why it omitted a canonical, which is exactly why nobody noticed it had one. `/onboarding` now self-canonicalises; the 404 sets `canonical: null`, because it is served for whatever was asked for and has no address of its own to point at. Verified on the built site. (Finding S3.)
- [x] Footer navigation and legal contents links now measure 44px, verified at 390px: 10 footer links and 12 contents links, none under 44. Gated on `(pointer: coarse)` so desktop is untouched at 18px -- a mouse hits a 20px link without thinking, and growing every footer row by half again on desktop would cost real layout to solve a problem nobody has there. (Finding A4.)
- [x] New-tab links announce themselves through a shared `<NewTab />` (footer socials, both live-site links in the preview modal, and both outbound links on a case study). The blog share row already carried it in its `aria-label`. Verified on the built page. (Finding A4.)
- [x] Raw `<img>` tags routed through `next/image` where it actually buys something: the About wheel's fallback grid (12 tiles, verified all 12 optimised, none broken, none zero-sized), the Services art rail, the Services project covers and the social feed wall (48 tiles, all optimised). Each wrapper was given `position: relative` so `fill` has a containing block.
- [x] The rest stay raw, and this corrects the audit rather than ducking it. Measured: `frames/iphone.png` 560x1124 at 42KB, `frames/android.png` 560x1096 at 33KB, `work/app/realtors-mobile.jpg` 560x1217 at 48KB, and the device-viewer captures `trax-desktop` 820x4371 at 146KB, `trax-tablet` 440x4772 at 119KB, `trax-phone` 300x7689 at 147KB. They are already narrower than any variant the optimiser would generate, so there is nothing to resize, and the device viewer and app-store stages both loop by translating the image -50% -- a trick that reads the picture's natural height, which `fill` removes. The agent avatar is deliberately `unoptimized` (3.5KB, see jotform-agent.tsx) and the header mark is an SVG. (Finding P3.)

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
- [x] Fix hover-lift clipping across work, preview, service, and team card containers; preserve the full top border and focus outline at every responsive width. (Every card rail is an overflow container. A 4px lift plus a 2px focus ring at 3px offset needs 9px; .pv-track, .pv-icards and .pv-marq each gave 6px and .pv-pinstage gave 0, including an explicit padding:0 in the pinned state. One --card-lift-gutter token, now 10px everywhere, measured clear at mobile/tablet/desktop.)
- [x] Fix clipping on the large “One roof”/value cards and project showcase cards shown in the latest captures; audit their shared horizontal tracks and transformed ancestors. (Same root cause and same fix as the row above: these are .pv-icard and .pv-job/.pv-scard inside the shared rails.)
- [x] Apply WDC typography consistently to onboarding: Space Grotesk for headings and prominent display copy; the body token for body, descriptions, labels, helper text, and controls, with responsive sizing. (Confirmed with the user that Space Grotesk alone is fine. A `--font-body` token now carries the body side so the split is expressed in the stylesheets rather than waiting on a font file; both resolve to Space Grotesk today, so one line changes it if a second face is ever licensed.)
- [x] Encode concise WDC design, typography, accessibility, SEO, dependency, rendering, media, animation, and Core Web Vitals conventions in repository `AGENTS.md` and `CLAUDE.md` guidance.
- [x] Install and review `karpathy-guidelines`; merge its simplicity, surgical-change, explicit-assumption, and verifiable-success rules into repository guidance.
- [x] Remove the redundant “Opens the full contact form with your details carried over.” helper wherever it appears. (Verified absent from the codebase.)
- [x] Add responsive separation between the intro gallery arc and its text so neither overlaps at any supported viewport. (The arc apex was a fixed fraction of viewport height, which cannot know how tall a paragraph that rewraps with width is. The statement block is now measured and the apex clears it, with the old fraction kept only as a floor.)
- [x] Reduce the hero/media overlay enough to reveal the imagery while retaining text contrast and readability. (Measured off the image pixels behind the headline: the photograph is BRIGHT there, luminance 0.75, so white type needs a 0.76 black overlay to clear 4.5:1 and the flat 0.55 veil was under even the 3:1 allowed for large text. Reshaped rather than reduced: a 30% base so the picture reads across the frame, plus an elliptical scrim on the copy. Measured after: 16-19:1 behind the headline in both themes.)
- [x] Audit all internal and external links across headers, footers, cards, CTAs, forms, legal pages, previews, and error/offline states; correct destinations, fragments, stale paths, and broken links. (`tests/links.spec.ts` walks every public page, resolves each internal destination and asserts every in-page fragment has a real target.)
- [x] Improve delivery of the slow-loading selected-brand-work images using measured formats, responsive sizes, prioritisation, and lazy-loading choices without creating layout shifts. (Rendered widths measured at 360/412/620/768/900/1280/1600 and every `sizes` clause reset to just above the widest real width in its range; one clause was UNDER the real width and was upscaling.)
- [x] Align the desktop Jotform and UserWay launchers to the same horizontal baseline after the third-party widget is rendered. (Verified with the real widget loaded, not the facade: the native launcher and the UserWay disc both sit exactly 26px from the bottom. Note its LEFT gutter measured 42px against 26px on the right, which is Jotform's own inner padding and is tracked separately.)
- [x] Send every navigation to the top of the destination page. (Two causes: Lenis outlives the route and animated the document back to the previous page's offset, and a link to the page you are already on is a router no-op that never scrolled at all. `components/ui/scroll-reset.tsx` handles both; covered by `tests/navigation-scroll.spec.ts`.)
- [x] On phones, make call-to-action buttons fill the width and stack one per row rather than sitting two-up; excludes the hamburger sidebar.
- [x] Fix the accessibility (UserWay) launcher being invisible in dark mode. (It used `--ink`/`--rule`, which are declared only inside the `.pv` block, and it renders outside it: both fell through to their light-mode fallbacks in every theme, leaving the glyph at 1.00:1 on its own disc.)
- [x] Draw the SVG icon strokes for icons that mount after page load. (DrawGate scanned at 0/600/1600/3200ms and then stopped, so icons in the stages that mount on approach were never observed and never drew. It now also rescans on scroll, throttled to 400ms.)
- [x] Stop preselecting a service on the onboarding picker; Start stays disabled until the client chooses.
- [x] Use the brand orange for orange text on light grounds. (--accent-ink was #b34700 at 5.50:1, a whole stop darker than needed, which read as a different, muddier orange. Now #c95000, the lightest orange on the hue that still clears 4.5:1.)

### Raised by the independent audit, 2026-09-13 (see `plans/WDC_Site_Audit_And_SEO_Plan.docx`)

- [x] Stop `wedigcreativity.vercel.app` being indexed: redirect it to the canonical domain, or send `X-Robots-Tag: noindex` for any host that is not the canonical one. (Finding S1. It serves the complete site and allows indexing. It does declare a canonical, but a canonical is advisory where a redirect is binding. Both prior audits saw a second copy of the site in results and this is the likely reason. Highest-value SEO item; about an hour.) (Done as a header rather than a redirect: preview deployments live on that domain too, and redirecting them to production would make every preview untestable. Verified by Host header — the canonical host gets no robots header, `*.vercel.app` gets `noindex, nofollow`.)
- [x] Replace the five page titles and meta descriptions with the measured set in the plans document. (The homepage title currently omits web, branding, SEO and software; `Services |` and `About |` spend the most-weighted words on a generic one.) (Applied and verified against the rendered pages: every title is 46-58 characters and every description 125-148, inside what Google will display. `/work`, `/about` and `/contact` needed `title: { absolute }` because their recommended titles already carry the brand and the root template would have appended it twice.)
- [x] Add a skip-to-main-content link. (Finding A3. There is none anywhere. Tabbing the homepage reaches the Jotform button and the accessibility widget before the logo, then the whole nav, on every page.) (First element in the body so it is the first tab stop; clipped rather than hidden, because `display:none` removes an element from the focus order. Every `<main>` now carries `id="main"` and `tabIndex={-1}` so focus actually lands there. Verified: first Tab reaches it, Enter moves focus to `MAIN#main`.)
- [x] Mark the typewriter cursor character in the homepage h1 as decorative. (Finding A4. It is part of the heading text, so a screen reader announces the heading and then the cursor symbol.) (And the orange chevron beside it, which was being read as "greater than". The accessible name of the h1 is now the sentence and nothing else.)

## 1A. Client onboarding experience

- [x] Treat onboarding as a client-facing, normally post-payment intake link sent by WDC; rewrite every prompt and helper from the client's perspective.
- [x] Study both supplied Fluent Forms JSON exports for website and social-media question wording, conditional logic, and answer options; treat the exports as reference data only.
- [x] Reduce every service onboarding journey to 3 or 4 parts total; the client presses Next no more than 3 times before review/completion.
- [x] Replace the three-section progress treatment with one taller progress bar containing the percentage.
- [x] Add a subtle pulse to the onboarding progress fill; respect reduced-motion preferences.
- [x] Add subtle, encouraging progress hints without adding visual noise.
- [x] Make every tooltip aligned, viewport-aware, touch-accessible, dismissible, and fully visible on mobile and desktop.
- [x] Add clear `Other` choices where fixed options may not fit; reveal a concise follow-up field only when `Other` is selected.
- [x] Audit every prompt, option, helper, and uncertainty escape for the client's first-person perspective; use “I'm not sure; please advise me” and equivalent natural wording.
- [x] Remove em dashes from all onboarding form copy; use semicolons or natural sentence breaks instead.
- [x] Fix long searchable selectors and their internal scrolling on touch devices; prevent global FABs from obscuring options.
- [x] Re-audit every onboarding dropdown for a bounded, touch-scrollable option panel; use search automatically for long lists such as countries and any list with more than ten options. (Panels are bounded and scrollable; the wheel case is fixed with , since Lenis calls preventDefault on every wheel event while it owns the page and was cancelling the gesture over nested panels.)
- [x] Fix exclusive multi-select behaviour so choosing “I'm not sure; please advise me” clears other choices, and choosing any concrete choice afterwards clears the uncertainty choice instead of blocking selection. (The control was being made  while deferred, so every option in the question became unreachable and the escape was a trap. Choosing a real answer now simply replaces the deferral.)
- [x] Persist drafts server-side in CockroachDB rather than relying on local storage as the source of truth.
- [x] Allow cross-device resume with server answers restored accurately; local storage may only be a fail-safe draft cache.
- [x] Give file upload a progress animation and a clear completed state. (Real progress, not a timer: the browser PUTs straight to R2 through a presigned URL, so `xhr.upload.onprogress` reports bytes actually on the wire. Done rows show a tick and `added`; failed rows explain why and offer a retry.)
- [x] Stop a completed upload from breaking mobile layout; the page narrows once a file is attached and must not. (The file rows are grid items and a grid item defaults to `min-width: auto`, so it refuses to shrink below its content. One long filename took the page to a scrollWidth of 558 in a 360px viewport. Measured after the fix: no overflow at 320/360/390 and the name truncates.)

### Raised by the independent audit, 2026-09-13

- [x] Fix the service-picker cards rendering white on orange. (Finding A2, and it was a repeat of a rule this project had already written down. `.ob__svcT b` hard-coded `color: #fff` at (0,2,1) and beat the card variant; the correction written to fix it targeted `h3, p` while the markup uses `b`/`em`, so it never matched a single element. The label now inherits from the card.)
- [x] Wrap the onboarding facts list in a `<dl>`. (Finding A2. Three `dt`/`dd` pairs sat in plain `div`s, so the pairing was not conveyed. The same page does it correctly further down.)
- [x] Rate-limit the onboarding draft and submit routes, and require an origin header rather than accepting its absence. (Finding R1. The contact form allows five per address per ten minutes; these have no limit at all, and the origin check passes any request that simply omits the header — which a script does and a browser cannot. Today a script could create unlimited draft rows and submit unlimited forms.) (`lib/rate-limit.ts`, shared, and it sweeps — the contact form's old private Map never evicted anything. The draft route needed TWO limits, not one: with a cookie it UPDATES one row and the form autosaves 1.2s after every answer, so a single tight limit would have locked a client out of their own form halfway through. Creating a row without a cookie is the only abusable path and takes the tight number. Verified: 80 autosaves accepted, a script creating rows blocked at 6, a request with no Origin refused outright.)

## 1C. Blog

- [x] Build `/blog` and `/blog/[slug]` in the site's own design language, using the existing `.pv` tokens rather than a second visual system. (Index, post, related posts, tags, reading time and a CTA band. Verified: one h1 per page, canonical per page, Blog + BlogPosting + BreadcrumbList structured data, no horizontal overflow at 320px.)
- [x] Derive the sitemap entries from the post data, so a post cannot ship as a page the sitemap has never heard of. (Same rule the work catalogue already follows.)
- [x] Seed the blog with real posts written in the site's voice, each with its own search-result title and description rather than a generated one. (Six, covering pricing, AI search, brand guidelines, performance, app-or-website and project handover.)
- [x] Add Blog to the main navigation, between Services and About Us.

## 2. Authentication and email

- [x] Replace temporary environment-password auth with Better Auth backed by CockroachDB.
- [x] Protect every `/admin` route with a server-verified session and owner role.
- [x] Generate/apply Better Auth database schema.
- [x] Seed `wedigcreativity@gmail.com` as owner with the supplied temporary password.
- [x] Add the required auth/mail variables to the root environment template. (`.env.example` now also documents the R2 and Google variables, including which R2 value is which.)
- [x] Sync non-empty environment values to Doppler dev/stg/prd without overwriting the unresolved GitHub PAT.
- [x] Sync production environment values to Vercel, deploy the verified commit, and confirm canonical routes respond successfully.

## 2A. Payments, invoices, and transaction integrity

### Abuse and upload safety, raised by the independent audit 2026-09-13

- [x] Move the contact form's rate limit out of per-instance memory. (Finding R2. It counts in the memory of one serverless instance; Vercel spreads requests across instances that start and stop constantly, so the count resets often and is never shared. The list it keeps also never evicts, so it grows without bound on a long-lived instance. It stops a careless script, not a determined one.) (Partly: it now uses the shared limiter, which evicts, so the unbounded growth is gone and the behaviour is identical across routes. It is still per-instance — that needs shared state in Cockroach or edge KV, and the limitation is written down in the module rather than implied.)

## 3. Performance and release verification

- [x] Skip the intro/preloader on mobile.
- [x] Delay Jotform until user intent.
- [x] Delay UserWay until user intent.
- [x] Load smooth-scroll/cursor motion only on capable desktop pointers.
- [x] Run lint, TypeScript, dependency audit, and production build.

### Raised by the independent audit, 2026-09-13

- [x] Host the chat avatar ourselves. (Finding P1, severity high. Jotform's avatar URL redirected twice and then delivered a PNG still downloading after 180 seconds at ~12KB/s, for an image drawn at 56x56, on every page. `window.load` fired on NO page as a result, live or local, which broke Lighthouse runs and made every readiness measurement on this project unreliable. Local copy is 3,552 bytes; `load` now fires everywhere and no Jotform bytes are fetched until the chat is opened.)
- [x] Protect the layout stability result. (Cumulative layout shift measured 0.009 on the homepage and zero or near-zero everywhere else. Worth keeping rather than achieving.)

## 4. Admin product after frontend/auth milestone

- [x] Build a route/component parity matrix for Litch and WDC; identify direct equivalents, WDC-specific additions, and Litch-only features that should not be copied. (`frontend/docs/admin-parity.md` records the reusable patterns, WDC additions, and explicit exclusions.)
- [x] Keep admin work isolated from Claude's public-frontend files through bridge claims, narrow commits, and section-boundary bridge updates. (Section 4 is bridge-claimed by Codex; public files remain outside its staged commits.)
- [x] Define the admin verification matrix: 320/360/390/768/1024/1440px, light/dark themes, keyboard-only navigation, empty/loading/error/populated states, and reduced motion. (Recorded in `frontend/docs/admin-parity.md`; execution remains part of 4.10.)

### 4.0 Reference, scope, and release guardrails

- [x] Expand Section 4 into a dependency-ordered delivery plan covering the admin shell, daily dashboard, clients, projects, money, forms, communications, settings, persistence, storage, and verification.
- [x] Locate and inspect the actual local Litch Consulting admin implementation; use its admin shell, responsive navigation, topbar, information density, dashboard composition, and reusable UI states as the 1:1 parity reference.

### 4.1 Litch-parity admin shell and UI foundation

- [x] Rebuild the WDC admin shell to match Litch 1:1: collapsible and pinnable desktop sidebar, temporary hover expansion, persistent preference, sticky topbar, and animated mobile drawer with backdrop and close-on-navigation. (Implemented from the local Litch shell; responsive interaction checks passed at 320, 390, 1024, and 1440px.)
- [x] Add the Litch-style topbar with the active page title, responsive search/command trigger, theme control, notification bell, and account menu. (The command palette filters only real destinations; placeholder actions were deliberately excluded.)
- [x] Add accessible keyboard and dismissal behaviour for the mobile drawer, notification panel, account menu, command palette, and all modal/popover surfaces; restore focus after close. (Escape, outside click, focus containment, and focus restoration are wired; the shell hydration mismatch discovered in browser QA was fixed.)
- [x] Keep primary navigation concise; group secondary tools under their parent section and place low-frequency items in the lower “General” group.
- [x] Keep each admin/client sidebar to five or six primary destinations at most; Settings stays in the lower “General” group and sub-features live inside their parent page. (Admin has five daily destinations plus Settings.)
- [x] Give every first-use empty state a friendly icon or simple visual, a plain explanation of what belongs there and why it matters, and one clear next-step CTA such as “Add your first client”. (Clients, projects, forms, invoices, and expenses now use the shared visual/action pattern.)
- [x] Keep empty-state copy specific to the current admin/client task, concise, and action-oriented; never leave an empty table frame or dead blank panel.

## 0. Raised in conversation, not yet done

- [x] Tool logos that rendered as empty boxes. The cause was the monogram badge, not a wrong slug: in the greyscale marquee it filled the whole 24x24 rect with `currentColor` and knocked the letters out in the page background, which at that size is a solid square rather than a monogram. It is now an outline with the letters in the same ink, so both follow `currentColor` and it reads in either theme.
- [x] Blog post page rebuilt around its cover: the image is the hero behind a bottom-weighted scrim, the article column is wider, and a sticky left rail carries On this page, share links and a server-rendered QR code. On a phone the contents collapse above the article. The QR comes from `lib/qr.ts`, which takes its colours as arguments so the admin's invoices reuse it rather than adding a second encoder.
- [x] Hero image transition: built as a five-band slit wipe, compositor-only. Each band is an overflow window onto the same picture, shifted by its own index, so five layers add up to one viewport of texture and the browser makes one request. Only transform and opacity animate. Measured at 4x CPU throttle over three slide changes: main-thread task time 5.8-7.2s against a crossfade baseline of 6.0-8.1s, layout and style-recalc counts equal or lower, and the first frame is untouched because the wipe only runs from the second slide on. `@vfx-js/core` stays declined: a live WebGL context and a permanent rAF loop on the LCP element is the one cost this page cannot absorb.
- [x] SEO skill installed (`npx skills add https://github.com/addyosmani/web-quality-skills --skill seo`). Still to be RUN over the site - tracked as its own item below.
- [x] Read liquidslr/system-design-notes and folded five points into AGENTS.md as a Systems design section: slow third parties never run before the response, persist-then-send with a dedupe key, rate limits belong to the action and ours is per-instance so it is abuse control not a quota, earn infrastructure with an estimate, and every message a person receives must be switchable off.

## Completed items moved from Open on 2026-09-14

#### Front-end marketing pass, 2026-09-13

- [x] Mobile menu reworked to the reference: the `01`-`07` counters are gone, the items are sized against the PANEL rather than the viewport (`13cqw`, about 45px on a 390px phone against the old 27px), and the LIST is now the scroll region instead of the whole panel, so the socials and the theme/accessibility row stay pinned to the bottom when a short screen has to scroll. Items take `flex: none`, without which the flex column shrank them and `overflow: hidden` cropped the letters. Verified at 320x568, 360x640, 390x560, 390x844 and 1000x700: the list scrolls, the footer row does not move, and nothing overflows sideways.
- [x] Hero headline: both halves now share one size, `clamp(1.5rem, 7.8vw, 4.3rem)`, so the rotating line is no longer a caption under the fixed one. The numbers are measured, not chosen -- the longest phrase takes 14.53x the font size in measure and its wider half 9.55x, and the copy column moved to `max-w-7xl` because a 5xl column could not hold that phrase on one line at any size worth having. Note for anyone re-measuring: `.pv-hero [class*="tracking-"]` in preview.css overrides the h1's `tracking-tight` to +0.02em on the live homepage, which is worth about 4% of the width.
- [x] The rotating line reserves a BOX, not just a width. `TextType`'s sizer wraps exactly as the live text does (`pre-wrap` on both, and a `max-width` cap on the live span, which `justify-self: center` would otherwise let overflow the page), so the block is as tall as the longest phrase needs from the first frame and never changes. Measured over a full rotation at 390, 768 and 1280px: the button row's top stayed on a single value at every width. Line counts checked at 320/360/390/430/640/768/900/1024/1152/1280/1440/1920 -- the fixed line is always one line, the reserved line never exceeds two, and the document never scrolls sideways.
- [x] Blog post headline stepped down from the shared `.pv h1` scale to `clamp(2.15rem, 1.25rem + 3.9vw, 4.2rem)`; a post title is a sentence, and at 5.4rem it was taking four lines and most of a phone screen before the lede.
- [x] Share and the QR code moved out of the sticky rail and under the article, after the tags. In the rail they rendered ABOVE the article on every screen below 1000px, so a reader was offered the share buttons before they had read a word. The rail now carries only the contents, and a post with no headings gets no empty column.
- [x] Article lists show markers again. Tailwind's preflight resets every `ul` on the site to `list-style: none`, so prose lists were rendering as unindented paragraphs with a gap; `.bl-body ul` asks for `disc` back.
- [x] QR well widened from 11 modules to 13 and its corners rounded. The mark is about 20% larger; coverage on a real article code is 7.0% of 2,401 modules, against the 30% level H recovers and the 12% the component warns at. The rounding is PAINTED, not left to the data -- four nubs filled in the module colour inside the area the well already damaged -- because keeping the corner modules would have rounded the well on one article and squared it on the next. Verified by decoding, not by eye: every blog URL plus a deliberately short one and an invoice-shaped one, rasterised at 72/88/104/116/136/200/340px and read back with jsQR, three passes each. The new code decodes at exactly the same sizes as the old one; the only size either fails is 88px, where a 49-module code lands on 1.8 pixels per module and the test harness's own downscaler loses the grid. The decoder was installed with `--no-save` and is not a dependency.
- [x] The onboarding form no longer leaves a client standing at a dead end. "Do you have a logo ready?" → No used to be the end of it, which is the most consequential answer on that step: a client with no logo has no identity for the work to be built out of, and everything downstream has to invent one or wait. Seven answers now carry an offer, each with an always-visible `scope` line saying it is extra and will be quoted first. Logo (not offered to branding clients, who bought it), brand book (same), domain and hosting when they have neither, the app store developer accounts they are missing, someone to write SEO content when nobody does, someone to make social content when nobody does, and which of the words and pictures a web client needs from us.
- [x] "Please explain what this includes" on the maintenance question led nowhere at all -- the one answer on that step guaranteed to leave somebody waiting for a reply the form was never going to give. It is answered where it is asked now, and the answer ends with the question it was standing in for.
- [x] Two new field properties carry it: `scope`, always visible and marked rather than muted, because a client answering yes is asking for work they have not paid for and burying that is the kind of quiet upsell this studio does not do; and `notFor`, applied in `stepsFor` rather than the renderer so a filtered question cannot be required, validated or turn up in the submitted record. No offer is required, so none of them can block anybody. Checked per service: branding is offered neither a logo nor a brand book but is still asked whether it has them, and no offer anywhere is required.
- [x] The file's own "nothing commercial is asked" note was rewritten to match: no prices and no request for money is still true, and now says what IS said -- when an answer takes the work outside what was bought.
- [x] The dropdowns on the onboarding form can be scrolled again. Every option row ran `e.preventDefault()` on `pointerdown`, which is right for a mouse -- it stops the press moving focus out of the search box before the choice lands -- and on a touch screen cancels the browser's pan for that pointer. A finger put down on a row to scroll could not scroll, and the page underneath took the swipe. It is mouse-only now and the choice moved to `onClick`, which fires for both and which a scroll gesture correctly cancels. Verified by dispatching both pointer types: a touch press is no longer default-prevented, a mouse press still is.
- [x] A chosen card can be unchosen. A radio group cannot normally be emptied, which on this form was a trap: pick "I'm not sure; please advise me", change your mind, press it again and nothing happens. The only way back was a small text button underneath that nobody looks for, because the thing they want to undo is the thing they just pressed. Pressing the chosen option now clears it; a required question emptied this way goes back to reading as unanswered, which is honest.
- [x] The onboarding Start button is full width on a phone. The reasoning for the shrink-wrapped pill holds on a desktop, where a 72ch column makes a full-width button a banner; at 390px the column IS the screen. Its arrow also nudges once every two and a half seconds until a pointer arrives, and leans forward on hover -- one transform on one glyph, nothing under reduced motion.
- [x] The second orange curve inside the phone field is gone. `.ob__f input` gives every input in a field wrapper its own border, radius and focus ring, which is right for the nine plain text fields and wrong for the one input that is PART of a larger control: the phone bar drew the border and the number inside it drew a second one, so focusing put a rounded orange box inside the rounded orange box. Both rules were (0,2,0), so it was decided by stylesheet order; naming the wrapper settles it on specificity instead.
- [x] The blog share row went from four to eight: X, LinkedIn, WhatsApp, Facebook, Telegram, Reddit, email and copy, plus the phone's own share sheet where `navigator.share` exists. Every one is a plain intent URL -- no embeds, no third-party script, no tracking. The capability is read with `useSyncExternalStore` rather than an effect, so the button is there on the first client render instead of the second.
- [x] Uploads now say what is actually wrong. A cross-origin PUT that CORS refuses is cancelled before it is sent -- status 0, no reason, and the page cannot tell it from a dropped connection -- so the message blamed the reader's network for what is usually a bucket setting. The server is not blind: `probeCors()` sends the same preflight from outside CORS and reads R2's answer, and the route returns that reason to the browser. The reader now gets "the file store is not accepting uploads from this site yet" and the log gets the specific line: no Access-Control-Allow-Origin, or an origin that differs by a `www.`, or PUT missing from AllowedMethods, or content-type missing from AllowedHeaders -- which the presigned URL has to send because it signs it. Six classifications checked against stubbed answers. NOT verified against the live bucket: this sandbox has no R2 credentials, so the first real upload attempt is what will name the cause.
- [x] Every list in the admin now carries row actions. The screens were readable and inert: the only way to find out what could be done to a project was to open the project, and a list of six projects with no verbs on it is a report rather than a tool. `components/admin/row-menu.tsx` is the `⋯` and the list it opens; `row-actions.tsx` assembles the verbs per record, in one file so the same project's menu cannot differ between the dashboard, the board, the projects table and its client's page. Wired into the dashboard's two panels, the projects board and table, clients, invoices, payments, expenses, submissions, settings, and the lists on the client, project and invoice detail pages.
- [x] What a menu offers is what is true of the record. A draft invoice can be issued and deleted and has nothing to take a payment against; an issued one can take a payment and can never be deleted, because its number has been sent to somebody. A greyed-out row of things you cannot do teaches people to stop reading the menu.
- [x] There is no fire-on-click menu item, deliberately. These actions issue invoices, archive clients and move stages that email people, and a menu item is a small target read in passing, so a one-press action is a dialog with one sentence and one button. That also replaced the `window.confirm` prompts on the rows, which could not name the record or report a failure.
- [x] Settings is live rather than a disabled Edit button. `setSetting`/`clearSetting` in the store and `saveSetting`/`resetSetting` in actions write one override row keyed by field and merge it over what shipped in git; the row shows what the site is serving AND what it shipped as, so the screen answers the question people bring to it, which is whether somebody changed this. Putting it back deletes the row rather than restoring a copy.
- [x] Two faults found while building it, both measured rather than reasoned: the menu portalled to `document.body` rendered with no background at all, because every colour and the type on these screens are declared on `.ad` and inherited from it (it portals inside `.ad` now); and closing the menu on any scroll meant a press arriving while the page was still settling opened it and shut it again in the same frame -- one row in four failed to open when each was pressed in turn. It re-anchors on scroll instead, coalesced into one rAF, and only closes when the row itself leaves the screen. A third: a dialog opened from a row inherits that row's `white-space`, so the archive confirmation was a single unwrapped line running off the side of the dialog.
- [x] `tests/admin-actions.spec.ts` pins it: six screens each offer actions, the menu portals inside `.ad` and is opaque and on screen, the keyboard walks it and Escape closes it, an item opens a dialog naming the record, every invoice is offered only what its status allows, and a setting round-trips through edit and reset. Ten cases. It needs a session, so it goes in the way the skeleton capture script does -- `BONEYARD_CAPTURE_TOKEN` plus the matching header, dev only -- and skips rather than fails when that is not set.
- [x] The project chat works again, and costs the page nothing. It was loading Jotform's official embed on intent, waiting for that runtime's launcher to appear in our DOM, and clicking it -- so the button said "Starting the chat…" and stayed there, with no timeout and no failure path. Three faults, one of them structural: it depended on a CSS class inside a 6.3MB minified bundle served from a URL with no version in it, it clicked the launcher the instant it appeared rather than when its handlers were attached, and a blocked request hangs rather than errors so `onError` never fired. Reading that runtime showed what it was actually for: it appends a div, draws a launcher and a panel, and frames `https://www.jotform.com/agent/<id>`. We already had a launcher, so the panel is ours now and the frame is the same one. No Jotform script runs on this document at all any more -- verified with a test that fails if one appears -- and the agent's own code runs inside the frame, on its own event loop, where it cannot take main-thread time from us. Measured: the old runtime is 6,295,207 bytes and is served WITHOUT compression; the agent document the frame loads is 35,232 bytes gzipped. The Content-Security-Policy dropped every Jotform origin from `script-src`, `style-src` and `media-src`, and `connect-src` narrowed from `*.jotform.com` plus `cdn.jotfor.ms` to the single host the liveness probe needs.
- [x] And it can now fail honestly. A `no-cors` HEAD to the same URL answers the one question a cross-origin frame cannot -- is this reachable from this browser -- because an opaque response resolves on any status and rejects when the request is blocked or refused. A 12s timeout sits behind it for reachable-but-never-arrives. Either way the panel says so and offers the contact form and the email. The probe outranks the frame's own `load` event on purpose: a blocked frame navigates to the browser's error page, and THAT fires `load`, so a panel keyed on `load` alone would clear its loading state and present the error page as the conversation. Three cases pinned in `tests/chat-facade.spec.ts`: nothing third-party on an idle page, the panel opens and frames the agent and escape closes it with focus returning, and a blocked agent gives up with somewhere else to go.
- [x] /contact now opens with the band every other landing page opens with. It was not a missing hero: the markup was already right. `.wk-hero` lived in `work.css`, which /work, /services and /blog import and /contact does not, so on /contact the band had no background, no padding and no colours -- the page rendered white, the eyebrow sat under the fixed header, and `<Header overHero />` painted white navigation onto white. The logo was invisible and the hamburger was three white bars on nothing. The rules moved to `preview.css`, where every consumer already looks, and the blog and legal routes dropped the 23KB `work.css` import that was left holding nothing. Measured on /contact after: white header type over the band is 17.68:1 in light and 18.79:1 in dark, at 390 and 1280px, and the h1 clears the header at both.
- [x] The eyebrow on that band was `--accent-ink` (#c95000), which is the darkened orange meant for LIGHT surfaces: on navy it measures 3.93:1, under the 4.5:1 a 13px label needs. It is `--accent` (#ff6500) now, at 6.00:1 -- the same swap `.pv-sec--band` already made for the dark sections lower down the page. This was wrong on /services and /work/<category> too, not only on the new page.
- [x] `tests/page-opening.spec.ts` pins the whole pattern: /work, /services, /blog, /contact and /legal, in both themes at 390 and 1280px, each asserting the band exists, is opaque, clears the fixed header, and carries legible eyebrow, h1 and lede. Twenty cases. Restoring the old stylesheet fails fourteen of them, which is the point -- this fault has now arrived three times and never once looked like a CSS bug.
- [x] Back to the top now reaches the top. It stopped 189-358px short, every time, leaving the header in its scrolled state at what was meant to be the top of the page. The cause was the button's own show/hide state: the tap gave it DOM focus, crossing the 420px threshold on the way up re-rendered it, React restored focus onto the element it had just mutated, and that `.focus()` cancelled the smooth scroll still in flight. Visibility is written straight to the element now, so there is no commit and no selection to restore. The button also routes through Lenis where Lenis is running, and watches the glide to the end so that anything else cancelling it is finished off -- standing down the moment the reader touches, wheels or types. Covered by two tests in `navigation-scroll.spec.ts`, which fail on the old component and pass on the new one; the real pointer click in them is load-bearing, because a scripted click focuses nothing and lands on 0 even with the bug present.
- [x] Blog hero scrim raised at the head. It released to 18% at the top, which was a bet on the photograph: measured over the covers this blog uses, white header type came out at 1.80:1 on `search-console.jpg` and 2.04:1 on `web-design.jpg`, against the 4.5:1 it needs. It now runs 95% at the foot to 56% at the head, still heaviest at the bottom where the title sits. Re-measured from the rendered page at 390 and 1280px: the worst cover is 5.42:1 and every other clears 7:1.
- [x] Excerpts clamp to three lines with an ellipsis, on the post hero and on the cards. Card excerpts ran to four lines on two posts, which left cards of different heights in the same row.
- [x] Removed the drop shadow from `.bl-card:hover`. The lift and the warmed border already say the card is live, and in the "read next" rail the shadow read as a second edge beside the next card.

### 0. Raised in conversation, not yet done

Kept at the top because these came from someone looking at the live site, and
that is the shortest feedback loop there is.

- [x] SEO skill run over the built site as a crawl of all 44 sitemap URLs, and what it found is fixed. THE SIX SERVICE PAGES WERE NOT IN THE SITEMAP -- everything else there is derived from its data and services were the one set listed by hand, so the new URLs were invisible to crawlers. `/services/<slug>` and `/work/<slug>` were shipping IDENTICAL meta descriptions, because both used the service lede; the service pages now carry their own sentence. The six service pages and six work categories had no `og:image`; both sets now draw one. Blog posts carry their own date in the sitemap instead of the deploy time. Re-crawled after: no missing og:image, no duplicate titles or descriptions, one h1 per page, no skipped heading levels, valid JSON-LD on all 44.
- [x] R2 CORS policy set by the founder and verified end to end: an OPTIONS preflight from each origin returns 204 with a matching `access-control-allow-origin` (it was 403 with no headers at all), a real presigned PUT carrying a browser `Origin` returns 200, and the object reads back publicly as `image/png`. Onboarding uploads work.
- [x] Hero slit wipe re-measured on a quiet machine, three runs each, same build pipeline, with the ONLY variable the transition -- the crossfade variant was produced by forcing the plain branch in the same component rather than by reverting the file, so nothing else on the page differed. At 390px and 4x CPU throttling, over three slide changes: main-thread task time 7.78s mean for the crossfade against 7.94s for the wipe, with a spread of about 2s WITHIN each variant, so the gap is noise; style recalculations 895 and 895; layout counts 111 and 106, marginally in the wipe's favour; script time 0.369s and 0.358s; CLS 0.0085 for both. LCP means were 1,355ms and 1,567ms, but the first frame is the SAME code in both -- the wipe only runs from the second slide -- and the within-variant spread (1,160-1,688 and 1,340-1,940) is wider than the gap, so there is nothing there either. Conclusion: the wipe costs nothing measurable over the crossfade. The earlier numbers that suggested a regression were taken while two research agents were saturating the machine.
- [x] Environment synced to Doppler `wdc/dev`, which now holds 31 keys and is missing nothing the local `.env` has. Added: BUCKET_NAME, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_S3_API, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PAYSTACK_LIVE_PUBLIC_KEY, PAYSTACK_LIVE_SECRET_KEY, plus SMTP_FROM_NAME because that one was changed today on purpose. Compared by hash so no value was ever printed.
- [x] The two disputed keys are settled: the founder chose local as authoritative for both, so `GITHUB_PAT` and `BETTER_AUTH_SECRET` were pushed to Doppler from `.env`. NOTE: while adding `PAYSTACK_MODE` and `BETTER_AUTH_URL` to the local file, a regex insertion REPLACED two lines instead of preceding them and destroyed `BETTER_AUTH_SECRET` and `PAYSTACK_LIVE_SECRET_KEY` locally. Both were recovered from Doppler, which had them, and the file was verified back to a full key set with no duplicates. The rule that came out of it is now in AGENTS.md: never rewrite `.env` with a regex.
- [x] Paystack naming unified before anything reads it, which was the last moment it could be done cheaply. One scheme: `PAYSTACK_MODE` plus `PAYSTACK_TEST_*` and `PAYSTACK_LIVE_*`. The duplicate flat pair (`PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`) is deleted from Doppler, and `lib/paystack.ts` resolves the active pair so no route reads a raw name and no `NEXT_PUBLIC_` copy can drift out of step with the mode. It fails closed naming the missing variable, and defaults to test, because the failure mode of guessing wrong that way is a payment that does not happen rather than somebody being charged.
### 1. Public frontend

#### Raised by the independent audit, 2026-09-13 (see `plans/WDC_Site_Audit_And_SEO_Plan.docx`)

- [x] Six dedicated service URLs built, one per service, plus a hub. The founder chose six over the three I recommended: listing six services and building three pages advertises a gap. `/services` is now the same one-plate hub `/work` uses; each `/services/<slug>` carries that service's demo, prose, deliverables, tool marquee, the six steps, the case studies already filed under its slug, and the ask. Every class is one the design system already had. Six Service nodes point at six real URLs instead of six anchors, and the hub emits a CollectionPage. This also lands finding P2: the six stage demos no longer share one route. (Findings S4 and C3.)

### 1C. Blog

- [x] Blog posts and the index get drawn preview cards rather than the cover photograph. The covers are hero images cropped for a 16:10 band; handed to a network as a 1200x630 preview they are cropped again by someone else, and the headline -- the only thing that makes anyone click -- is not in the picture. The explicit `images` in the post metadata had to go, because setting it suppresses the file convention.
- [x] RSS at `/blog/rss.xml`, derived from the same array the pages render so it cannot go stale, linked from the index through `alternates.types`. RSS rather than JSON Feed: it is what readers, newsletters and aggregators all accept without being told. The channel timestamp is the newest post's, not "now" -- a lastBuildDate that moves on every fetch tells every reader the feed changed when it did not.
### 2. Authentication and email

- [x] `List-Unsubscribe` on automatic mail. `sendMail()` takes `unsubscribe: true` and the contact receipt uses it. A message offering no way out looks like mail that does not expect to be refused, and Gmail scores it that way. It is a `mailto:` for now because there is no unsubscribe endpoint yet, and a link to one that does not exist would be worse; swap it for a URL plus `List-Unsubscribe-Post` when there is one.

### 3. Performance and release verification

- [x] Deployed to production through the Vercel API, which is the working route on this plan (a git push does not deploy here). NOTE FOR EVERY FUTURE SESSION: a push to main is NOT a release. Everything built today sat on main and invisible until this deploy, which is why the blog redesign "had not been done".
#### Raised by the independent audit, 2026-09-13

- [x] Services main thread fixed by splitting the page. Measured on the LIVE domain at 390px and 4x CPU throttling: main-thread task time 1,426ms against the audit's 8,320ms, and 1,323KB against 3,707KB. The cause was six code-split stage demos sharing one route; each now lives on its own service page. (Finding P2.)
- [x] Page weight measured on the LIVE domain at 390px: homepage 916KB (audit 3,215KB), Services 1,323KB (3,707KB), Our Work 447KB (3,099KB). The savings come from the image optimiser, the services split and the stage gating rather than from deleting anything. (Finding P4.)

### 4. Admin product after frontend/auth milestone

#### 4.0 Reference, scope, and release guardrails

- [x] Keep every admin route private, no-store, noindex, server-authorized, and free of public-site animation, smooth scrolling, third-party FABs, and decorative loading work. (The owner gate remains server-verified; capture access is development-only, random-token gated, and excluded from production.)

#### 4.1 Litch-parity admin shell and UI foundation

- [x] Use Boneyard page-shaped skeletons for dashboard routes and data-heavy panels; capture the real responsive geometry so loading states track current UI structure and preserve dimensions. (The admin dashboard has 122 bones captured from its real layout at five breakpoints.)
- [x] Add a Boneyard rebuild/check step whenever a mirrored page or component layout changes; exclude interactive chrome and decorative SVG detail that should not become skeleton bones. (`npm run skeletons:build` uses installed system Chrome, an isolated temporary profile, and a development-only random capture token.)
#### 4.2 Daily admin dashboard

- [x] Recompose `/admin` to match Litch's dashboard structure: personal greeting and one clear primary action, compact KPI row, wide work column, and responsive right rail. (The newer Litch-style dashboard component is now the route implementation rather than an orphaned file; the session read is request-deduplicated between layout and page.)
- [x] Add a project pipeline strip with useful stage counts and one-click filtered navigation. (Each stage opens Projects filtered to that stage, with a visible clear-filter action and matching board/list results.)

## Moved out of Open, 2026-09-14 (second pass)

Marked done by another agent but left in the open half, which is what made
the count at the top wrong again.

## 3. Performance and release verification

- [x] Responsive visual QA run across home, services, contact, login, 404 and offline at 320/390/768/1440 in both themes, 48 screens. NO horizontal scroll anywhere: `scrollWidth` never exceeded `clientWidth` on any page at any width. Exactly one `h1` on every page. Three sub-44px tap targets found and fixed, all without moving a pixel of layout: the header logo link (was 36px tall, now 44 with the mark still h-9 inside it), the menu's social icons (22px glyph, now a 44px hit area from a pseudo-element so the icons stay aligned with the menu items above), and the `info@` email links on home and contact (21px tall, now 44px the same way). The footer already did this correctly at 330x44 and was the pattern followed. `/login` returns 500 in this sandbox ONLY because `COCKROACHDB_URL` is unset; the stack trace is `lib/db/pool.ts:32` and there is no code fault, so it is untested here rather than broken. The desktop nav links are 35px tall at 1440 and were left alone: the hamburger takes over below 900px, so they are not a touch surface, and changing the primary chrome's height is a design decision rather than a QA fix.
- [x] Field/lab boundary recorded. Measured on the PRODUCTION build at 390px, 4x CPU throttle, Slow-4G (1.6Mbps/150ms): home LCP 976ms CLS 0.0563, Services 2,312ms CLS 0, a service page 4,768ms CLS 0, Our Work 2,792ms CLS 0, Blog 976ms CLS 0.0029, Contact 1,008ms CLS 0, Onboarding 4,116ms CLS 0.0557. Total Blocking Time is 0ms on every one.
- [x] CLS WAS BEING MEASURED WRONG, and it is worth writing down because it cost an afternoon. Summing every `layout-shift` entry is not CLS: the metric is the largest SESSION WINDOW, which breaks after a 1s gap and caps at 5s. The homepage's typing hero emits ~105 tiny shifts, so the naive sum reads 0.112 and the real number is 0.0563 — comfortably inside the 0.1 "good" threshold. Three separate attempts to "fix" the sum (holding the phrase width with a hidden tail, a stretched box with centred text, pinning the line left) all measured WORSE or no better and were reverted. The hero is unchanged.
- [x] The remaining homepage CLS is the rotating hero line and nothing else; every other page measures exactly 0. The cause is inherent: a centred line that changes width moves what is already in it, once per character. Eliminating it entirely means left-aligning the phrases, which with a set running from "yours?" to "your competition's problem?" leaves the visible text badly off-centre. Not worth 0.05 of headroom.
- [x] The two LCP outliers are lab artefacts, named rather than papered over. The service page's 4,768ms LCP is `/work/long/trax-desktop.jpg`, a below-fold `loading="lazy"` image that a stage animation reveals at ~4.6s; it is served from cache (transferSize 0), so this is discovery timing and not weight, and Chrome finalises LCP at first user input — a real visitor who scrolls or taps before 4.7s never records it. Onboarding's 4,116ms is the deliberate `ssr: false` in `onboarding-mount.tsx`: the form restores a draft from localStorage, the page is noindex and link-gated, and server-rendering it would trade 4s of LCP on an unindexed page for a hydration mismatch on every visit.

### 4.4 Projects and day-to-day delivery

- [x] Project list and workspace rebuilt. The list filters by stage, service, owner and health, and the workspace opens with a health pill, the derived reasons it needs somebody, and a "what was agreed" row carrying scope, budget and the agreed channel. Every filter is a GET form and none of it is a client component, so a filtered view has its own URL, the back button undoes a filter, and the page ships no JavaScript for its own filtering.
- [x] Board/list switch added, server-rendered from `?view=`, so the choice survives a reload and can be linked to; changing a filter keeps it. Gesture behaviour MEASURED rather than assumed at 390px: the board's `.ad__scroll` reports `canScrollY: false`, so a vertical swipe starting inside it has nothing to consume it and chains to the page. Nothing calls `preventDefault` on it and no `touch-action` override was needed.
- [x] Both routes work. The New project form now carries owner, channel, budget and scope alongside client, service, stage and due, and `createProject` reads all of them — verified by creating one in a browser and reading ₦1,250,000.00, "WhatsApp group" and the scope back off the project page. From an attached onboarding submission, "Open a project from this" fixes the client and service (the form already settled both) and asks only for what the brief cannot know; verified end to end from /admin/forms to /admin/projects/p1002. The client-visibility default lives on updates rather than the project: each update is marked client-visible or internal, ticked by default.
- [x] Updates carry health, progress, blockers, next steps and a client-visible/internal switch, and posting one is what moves the project's health — one action, not two, so the badge and the words cannot disagree. "Decisions" are not a separate field: they are recorded on the project's append-only history, which is where an approval or a stage change already writes.
- [x] Deliverables keep every version they have had, each with its own number, date and note, so "which one did they approve" still has an answer months later. A new version resets the approval, because an approval given for v2 is not an approval of v3. A revision cannot be recorded without saying what was asked for. The activity timeline was already append-only and every delivery write now lands on it. FILES ARE LINKS, NOT UPLOADS: R2 upload from the admin is not wired, and the field says so rather than pretending.
- [x] All five are derived by `projectAttention` from the project, its tasks and today's date — never stored, for the same reason `invoiceStatus` derives "overdue": it is a state time creates while nobody is looking. The dashboard queue used to list everything in Onboarding or Revisions, which is a proxy and a poor one; it now lists projects actually asking for somebody and sorts ACROSS the whole queue, so three overdue invoices can no longer push every blocked project off a panel titled "Attention needed".
- [x] Recorded on the project, because it is agreed per project rather than per company, and shown in the "what was agreed" row. Changing it writes a line on the history.
- [x] Archiving takes a project out of the lists and the board and touches nothing else: invoices, payments, updates, approvals and file versions stay exactly as they are. There is deliberately no delete, and the confirmation says so.

## Moved out of Open, 2026-09-14

## 0. Raised in conversation, not yet done

- [x] The client work sent through chat is on the site: 29 new assets at both sizes. Thirteen flyers, logo boards and a conference backdrop (Artdoor, Timi's Jewels, Moore, Sparkle Foundation, Fash Footies, OGreen, Everything Men, Dhiol Tech Hub, Benedict Ogbogu, Vickygold, Direct Link, Teaching With Purpose), plus sixteen pages lifted from the Skinish and Thinkers Diary brand guides and the Moore letterhead. The guide pages were pulled from the PDFs themselves rather than remade — Thinkers embeds its pages as JPEGs so those were copied out byte-for-byte, and Skinish and the letterhead are vector so they were rendered with pdf.js at 2x. Both documents credit WDC by name inside them.
- [x] Skinish and Thinkers Diary added as full branding case studies, written only from what the guides actually say: Skinish's positioning line and its real HEX values off the colour system page, Thinkers Diary's own "what makes us different" paragraph and its core and secondary palettes. Nothing claims a result neither client has published.
- [x] FOUND WHILE DOING THAT: every branding case study was hiding five gallery images. `.wk-shots--tall` set `aspect-ratio: auto` and the `next/image` inside it uses `fill`, which is absolutely positioned and so contributes no height — the boxes collapsed to TWO PIXELS. Moore Designs had been hiding its usage rules, stationery, apparel, signage and storefront pages; Marfaa four more. Each figure now gets its real ratio, read from the file's own header at build time by `lib/image-size.ts`, so the artwork sets its own shape, nothing is cropped, and the space is reserved before the picture loads.

### 4.5 Money, invoices, payments, and expenditure

- [x] Done, and it needed more than pointing the existing helper at a new string. The code has to resolve to something a client can open without an account, so there are now public invoice and receipt documents at `/i/<token>` and `/r/<token>`.
- [x] All five, and the list lives in one place now. The action used to re-type `["Paystack", "Transfer", "Cash"]`, so adding POS and Other to the union in types.ts would have silently kept rejecting both and filed them as "Transfer" -- there is one reader and one list. "Other" is labelled rather than left as a gap, and picking it REQUIRES saying what it actually was: recording money against an unnamed catch-all is how a set of books stops being auditable.
- [x] All seven, and the point of the work was keeping them APART rather than adding seven buttons.
- [x] It already created a transaction rather than flipping a status; what was missing was the attribution. A payment now records who entered it and an optional note, both shown on the invoice's payment table and on the receipt. A manual entry with no name against it is the entry nobody can question three months later, which is the entry most worth questioning. Free text for now, and it becomes the signed-in admin the moment there is one -- said here rather than pretended.
- [x] All four, on a screen at `/admin/money/reconciliation` that is deliberately NOT a seventh nav item: the admin holds to six primary pages, so this is a room inside Money, reached from a banner that appears only when there is something in it.
- [x] All six, and the shape of it is worth stating because it is where payment integrations go wrong.

### 4.7 Communications and client portal handoff

- [x] Every field, on the client record and on the invoice, and it is a communication log rather than an email log: WhatsApp, phone and in-person rows have the same shape and are typed by a person. What the site CANNOT do is read WhatsApp, so a WhatsApp row means somebody wrote one down, and the empty state says so rather than implying a sync that does not exist.
- [x] Preferences live on the CLIENT, not on the template -- a client who has asked not to be chased must not be chased by a reminder written next month by somebody who never read that conversation, which is what happens when the switch lives on the message. Three kinds: project updates, invoice reminders, and studio news, opted in by default for the two that are part of doing the work and out of the one that is not.


## Moved out of Open, 2026-09-14

## 0. Raised in conversation, not yet done

- [x] The country picker is a proper dropdown on every form that has one, not only on the one it was written for. Two faults, one cause: a rule written for ONE form in a component used by TWO.
- [x] Share and "take it with you" now end a case study and a discipline page, not only an article. One component and one stylesheet rather than a second copy: the block was `bl-share`/`bl-qr` inside `blog.css`, which was the right place while an article was the only page that offered it, and became the wrong one the moment a second page wanted the same thing. Moved to `components/ui/share-row.tsx`, `components/ui/page-end.tsx` and `components/ui/share.css`; the blog's markup now renders the same component, so the two cannot drift.
- [x] A receipt prints itself on the payment return page, after the money has arrived. WHEN it runs is the whole of it: this renders only on the `paid` branch of `/pay/done`, which is reached only after `verifyTransaction` has asked Paystack what happened and `applyPayment` has banked it. The reference this was asked for fires on arrival at a success URL, which is a query string anybody can type; ours cannot, and `tests/payments.spec.ts` proves it against three URLs including one dressed up with `status=success`.
- [x] The admin's form controls were generic, and are not now. NOT by adding Material UI or any other component library, which was considered and refused: MUI is client-only and emotion-backed, so every field would become a client component in an admin that is server-rendered; it brings its own type scale, spacing and tokens, which would fight the shell; and it is a large dependency for boxes, carets and focus rings we can own outright. What a library genuinely gives you is the LIST a select opens, and the platform's own is better than anything we would draw: type-to-search, arrow keys, the phone wheel, and whatever screen reader the person already has configured.
- [x] The public invoice offers ONE way to pay, and it is the checkout. It used to put "prefer a bank transfer?" under the button, which read as a second, equal option and was not one: the studio collects through Paystack, and Paystack's own page already offers a transfer to a one-time account beside the card. The offer sent people out to email for something the button in front of them does better and records automatically, and an untracked transfer is then the studio's afternoon, not the client's. Transfer, cash and POS stay in the books as the STUDIO'S methods, for money that genuinely arrived some other way and for a charge that went wrong somewhere Paystack cannot tell us about, so the books never get stuck on a payment everybody knows happened. The record-a-payment dialog says so in as many words. Same change in the invoice email, and the redirect-back messages no longer send anybody off to make a transfer either. Pinned by `tests/payments.spec.ts`.
- [x] Em dashes are out of every string a visitor or an admin reads: case study and service copy, onboarding questions and helper text, page titles, alt text, the contact and upload replies, the receipt, the admin row menus and the credit picker. Twenty-eight replacements, each rewritten rather than swapped for a hyphen, so the sentence still reads. What is deliberately left: the lone dash in a table cell that means "no value", which is a glyph rather than punctuation, and en dashes inside numeric ranges like "18-24" and "₦100k-₦500k", which are ranges rather than sentence punctuation.
- [x] Case studies have an "on this page" rail, the same one the blog and legal pages use. It is on the RIGHT rather than the left, because that is where the space already was: `.wk-doc__body` is capped at 74ch so long-form prose is readable, and on a wide screen that cap was leaving a column of nothing beside every case study. On an article the rail leads, because it is furniture you glance at before starting; on a case study the work has to lead, so the rail fills the gap instead of taking width off the reading column.


## Completed Section 4 milestones

- [x] Rebuild the client list to Litch parity with responsive search, service/status filters, sortable columns, useful counts, accessible pagination, export, and a focused new-client action. (Native search, service/status filters, archived visibility, result counts, clickable sortable columns, reversible filtered-empty state, focused add-client action, accessible pagination, and a filter-aware owner-gated CSV export are implemented. Browser checks pin filtering, recovery, CSV scope, sorting, 44px controls, bounded table scrolling, and no page-level horizontal scroll at 320px.)
- [x] Build a unified client detail workspace with overview, projects, invoices/payments, forms/submissions, files, communications, notes, and an append-only activity timeline. (The existing client overview now also collects every retained payment with its receipt, gross and net amount, reversal/refund state; every project deliverable version with its approval and optional file link; and a bounded append-only audit view across the client, projects, invoices, payments, submissions, and deliverables. Empty states explain what will appear without inventing records.)


## Moved out of Open, 2026-09-15

## Closed 2026-09-15, section 2 verified

- [x] Login, logout, forgot-password and reset-password are complete and VERIFIED, not asserted: `tests/auth-flow.spec.ts` passes 15/15 against a PRODUCTION build. It covers the protected-route redirect carrying where it was going, a wrong password and an unknown address giving identical answers, a correct password landing on `/signed-in`, a valid non-owner session still being refused the admin, sign-out removing the session rather than the screen, and a reset link that is requested, answered immediately, emailed and works exactly once.
- [x] Password-reset mail goes through Truehost SMTP without holding up the response. Better Auth's deferred-job hook sends it after the response, for the measured reason the contact form already records: this server needs about 23 seconds just to authenticate. The token is written BEFORE the send is queued, so losing the send loses nothing -- the link exists and asking again sends another.
- [x] Google sign-in is enabled and OWNER-ONLY, and the rule is in `lib/auth-google.ts` rather than inside `lib/auth.ts` specifically so a test can reach it without opening a database pool. `tests/google-admission.spec.ts` passes 11/11 and covers the branch that matters most: **a database that will not answer refuses rather than admits.** A client with a perfectly valid Google account is refused, and a stranger and a client are refused in exactly the same words so the button cannot be used to find out who works here.
- [x] The ten transactional email templates are built and pinned by `tests/email-templates.spec.ts`, 11/11. Every message is a complete HTML document laid out in tables with a real plain-text alternative, the link in the HTML is the link in the text, no filled button carries a white label on orange, an unsubscribe appears exactly where one is owed and NOT on the password reset, the invoice and receipt carry a QR from the site's own encoder, and a hostile client name cannot inject markup.
- [x] **TO RUN THIS SUITE LOCALLY YOU MUST SET `BETTER_AUTH_URL=http://localhost:3100`**, and it cost an hour to find. It defaults to the production https URL, from which Better Auth derives a `Secure` session cookie -- which a browser will not store over plain http. Sign-in then SUCCEEDS, `/signed-in` renders correctly, and only the cookie assertion fails, so it reads like a session bug rather than a configuration one. The config also has no `webServer`, so a build must already be serving on port 3100.

### From screenshots, 2026-09-14

- [x] THE PHONE FIELD WAS DRAWING OVER THE TOPIC SELECT, and the cause was one missing declaration rather than the layout. As a grid item the control takes an automatic minimum size, which is the min-content width of the bar inside it -- and a text input's min-content width is its own default 20-character size, not zero. Measured on /contact at 1440px: a 267px cell carrying a 364px control, laid over the field beside it. `.pv .ph` is `min-width: 0` now, so the number (already `flex: 1; min-width: 0`) gives up the width and the control fits any column it is put in. The two fields were also separated while we were there: the phone takes a full row and the subject takes the next, which is the arrangement that was asked for and the one the control's natural width wants.
- [x] The dial code is set in the same ink as the number beside it. It was `--muted`, the placeholder grey, so the first half of a number read as a hint while the half typed next to it was full-strength ink.
- [x] THE SUBJECT IS OUR OWN PICKER, NOT THE OPERATING SYSTEM'S. The native popup is drawn by the OS -- a bare rectangle with a blue bar through it in the middle of a card that is otherwise entirely ours, and a white rectangle on a dark page in dark mode. `SelectField` is the control the onboarding form already uses and shares its panel with the country picker two fields above it, so the two menus on the page now open the same way, in the site's own type and colour, with arrow keys, Enter, Escape and `aria-activedescendant` already paid for. No component library: seven options is under the search threshold, so it opens as a plain list. NOT a new control -- the alternative was a second dropdown to maintain.
- [x] All three controls in the card are the same height and the same type size now. The phone bar was built against the onboarding form and kept that form's 1rem type and .85rem padding: 56px in a card whose inputs are 48px at .95rem. Side by side with the select nobody noticed; stacked directly above it, the two rows plainly did not match. Measured after: email 48, phone 48, subject 48.
- [x] The homepage CTA band is one colour. Three different things were happening to the same three lines: the eyebrow took `--accent-ink`, the darkened orange meant for small text on WHITE, which on navy reads as dried blood; the heading's own `<b>` kept `.pv-mix b { color: var(--ink) }`, because an element's own colour beats a colour inherited from its parent, so "what is not working" rendered black-on-navy in light mode; and the lede was dimmed while the rest was not. All white, 17.68:1, with the emphasis carried by weight -- which is what `.pv-mix` was always for. Same box on /blog, /services and the two tools pages, so all of them are fixed by the one rule.
- [x] `info@wedigcreativity.com.ng` stays on one line on a desktop. It was landing the "g" of ".ng" alone on a second line, which reads as a typo rather than as wrapping. The third footer column is sized from the longest thing in it rather than from tidiness about equal fractions (1.4/.9/1.5/1.15), and the address is held together from 1200px up; `overflow-wrap: anywhere` stays below that, where breaking beats overflowing. Checked at 360, 414, 768, 1000, 1024, 1200, 1280, 1366, 1440, 1600 and 1920: one line at every width, 89px of slack at 1440, and no horizontal scroll anywhere.
- [x] The homepage service-card icons draw in like every other icon on the site. They were flat lucide glyphs imported straight into `preview-body.tsx`, so the one row of icons a first-time visitor sees was the only row that sat still while /services, /about and the header menu all animate. They are `ServiceIcon` now -- same six glyphs, same meanings, `pathLength` stamped on every shape so a short line and a long curve draw at the same speed, gated by `draw-gate.tsx` so nothing animates off screen, and still under `prefers-reduced-motion`.
- [x] THE DROPDOWN FITS THE WINDOW IT OPENS IN, and flipping alone was not enough to do it. On a short window -- a laptop at 1280x430, a browser carrying three toolbars, a phone held sideways -- NEITHER side of the field has room for a 296px list, so the panel opened past the fold whichever way it went and the last rows could only be reached by scrolling the page behind it. Measured before: the 245-country list ran 59px past the bottom at 900x600 and 143px at 1280x430. Two things fix it. `usePickerOpen` now measures the room on the side it chose and publishes it as `--pk-room`, which caps the PANEL; the panel is a flex column, so the search row keeps its height and the list gives up the difference and scrolls inside it. And focus into the search box is taken with `preventScroll`: a browser scrolls a newly focused element into view, which moved the page under a panel that had just been measured against where the field was, leaving it 9-11px past the fold with the numbers still reading as correct. Checked at 360x740, 390x844, 560x900, 600x800, 768x1024, 900x600, 1024x560, 1024x700, 1280x430, 1280x500, 1280x620, 1366x640, 1440x900 and 1920x1080: the panel is inside the window at every one, the list scrolls, and the last row can be scrolled to. Pinned by four new cases in `tests/phone-field.spec.ts`, which fail on the previous commit.
- [x] The accent button's hover is black with a white label, everywhere it appears: the CTA on the contact form, the hero pair on /about, the header's "Start a project" and the hero's "Let's Talk". It used to invert to white, which on a light page turned the loudest control on the screen into an outline you had to hunt for. On a navy band the black fill takes a white edge so it does not sink into the band. Rest states are untouched, so `tests/button-colours.spec.ts` still pins the rule that a filled control carries a neutral label.
- [x] "Brands anywhere, remote-first" is gone from /contact. That is how a studio describes itself to other studios; a client reading that row wants to know whether we can take their work. It says "Clients across Nigeria and beyond", which is the published FAQ answer in fewer words.

## 1B. Free tools on the service pages

- [x] **One shared `lib/fetch-page.ts` before either fetching tool.** Built, with the pure half split into `lib/net-guard.ts` so it can be run without a bundler: `fetch-page.ts` imports `server-only`, which does not resolve in plain Node, and a security guard that cannot be exercised directly is one nobody exercises. Every rule the item asked for is in: http and https only, an explicit port must be 80 or 443 (the interesting internal things listen on 6379, 8080 and 9200), no credentials in the userinfo, `redirect: "manual"` with at most two hops each re-validated through the same door as the original, ONE 6s deadline for the whole journey rather than 6s per hop, a 2MB cap enforced WHILE READING rather than by trusting `Content-Length`, and a truthful user agent naming the site and saying it fetches one page per request. EVERY resolved address is checked, not just the first: `lookup(host, { all: true })` and `.every()`, because a hostile name carries one public A record and one 127.0.0.1 so that whichever is picked, the check passed. A literal IP skips DNS and is still checked. Failure to resolve fails CLOSED. THE RESIDUAL HOLE IS DOCUMENTED RATHER THAN HIDDEN: between our DNS check and `fetch`'s own resolution, an attacker running a name server with a 1s TTL can answer public for us and private for the socket; closing it needs a custom undici dispatcher to pin the validated address, and undici is not a dependency here. `npm run check:fetch-page` runs 51 cases with no network: 26 blocked addresses including 169.254.169.254, all of 127/8, the three private ranges, CGNAT, multicast, `::1`, `fc00::/7`, `fe80::/10`, `::ffff:127.0.0.1`, a 6to4 address wrapping loopback and NAT64 -- and 12 PUBLIC ones that must still work, chosen to sit one address either side of each boundary (172.15.255.255 and 172.32.0.1, 100.63.255.255 and 100.128.0.1, 126.255.255.255 and 128.0.0.1), because a guard that blocks everything is easy and useless.
- [x] **A shared rate-limit counter in Postgres for anything gating a metered key.** `lib/rate-limit.ts` lives in one instance's memory and cannot protect a 25,000/day quota; per-IP in memory is still fine for the free tools, and this sits behind it rather than replacing it. `db/migrations/0005_rate_limit_counters.sql` plus `lib/quota.ts`. A FIXED window, not sliding, which is what makes it cheap enough to put in front of every call: one row per bucket for the life of the bucket, and ONE statement that records a hit and reports whether it was allowed, so two instances racing cannot both read 99 and both write 100. The window start is computed by the DATABASE clock, so instances whose clocks differ still agree which window they are in. TWO KINDS OF BUCKET, and the second is the one the in-memory limiter could never see: `ip:<addr>` stops one person hammering it, `global` stops everybody hammering it, because a thousand different callers making one lookup each is a thousand paid lookups and not one of them trips a per-caller limit. IT FAILS CLOSED -- an unreachable database denies, because every other failure mode here ends with somebody else's meter running and an invoice we did not agree to. `unavailable` is reported separately from `spent` so a caller never claims a limit was reached when it could not tell. Stale buckets are swept on roughly one call in two hundred rather than on a timer, which would keep a serverless instance awake. Proved against a real Postgres 16 by `npm run db:check-quota`, which sends the shipping statement character for character: 200 simultaneous hits came back as exactly 1 to 200, every number distinct and none lost; a new window resets in place and leaves one row rather than one per window; windows align across buckets; and the sweep reclaims the stale bucket and only that one.


## Moved out of Open, 2026-09-15

## Closed 2026-09-15, blog into the database

- [x] The six posts are in CockroachDB and the pages read them. `blog_posts` holds them, `lib/blog-db.ts` returns the same `BlogPost` shape the renderer, outline builder, RSS feed and OG image already take, so every call site became an `await` and nothing else changed. This also closes the section 4.8 item that asked for the same move: the editor now has rows to edit.
- [x] BUILD-TIME READS, not per request, which is the trade `plans/blog-to-db.md` recommended. Every post stays as fast as it is today and nothing public can be slowed by a database; publishing from the editor will need a revalidation, which is a caching change later rather than a schema one.
- [x] The body is `jsonb` deliberately. `BlogBlock` is an ordered discriminated union and the renderer walks it to guarantee one h1 and a correct heading outline: normalising it into rows buys nothing and costs the ordering, and storing rendered HTML would give away the outline guarantee, which is the one thing an editor must not be able to break.
- [x] `lib/blog.ts` REMAINS THE SOURCE and the fallback until the editor ships. It is still the only way to write a post, so the seed copies it in, and if the database is unreachable at build time the site builds from the file rather than failing. Remove the fallback in the same change that ships the editor, not before.
- [x] `scripts/seed-blog.mjs` is dry by default and needs `--commit`, upserts on slug so re-running is safe, never deletes (it cannot tell "removed from the fixture" from "written in the editor"), and REFUSES TO RUN if `lib/blog.ts` contains an em dash, so the copy cannot drift into a tidied database copy of itself. Seeded: 6 added, 0 updated.
- [x] A fault found on the way: the blog index's JSON-LD was a module-level constant reading `BLOG_POSTS`. Correct while the fixture was the only source, and a quiet lie once the page read the table, since the structured data would describe the file while the cards described the database. It takes the rendered list as an argument now.


## Moved out of Open, 2026-09-15

### (no heading)

- [x] `components/services/services-body.tsx` deleted, 490 lines, and NOTHING was salvaged onto the hub -- deliberately, having checked each of the three things the item named. The brand rail already lives on `service-detail.tsx`, per service, so it was never at risk. The filter chips and the in-page ticker were built for the ONE-LONG-PAGE version: chips filtered six sections on a single page, and the ticker jumped between them. Six separate pages and a hub of cards make both obsolete by design rather than lost by accident. Verified unreferenced first: the only remaining mentions anywhere were three comments in `service-detail.tsx` explaining why it exists instead. 54 lines of orphaned `.sv-chip` and `.sv-jump` CSS went with it, including a hero/ticker note describing a 85/15 viewport split that no longer has a ticker to split with, and the media query it left empty. This also retires the two undeclared `quality={74}` call sites recorded under the images fix, which were left alone at the time precisely because this file was queued for deletion.
