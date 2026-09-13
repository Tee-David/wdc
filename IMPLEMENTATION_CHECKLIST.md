# WDC implementation checklist

Status key: `[ ]` not started, `[-]` in progress, `[x]` done and verified.

Ordering rule: always keep `[ ]` and `[-]` items in `# Open` at the top, and
move every `[x]` item into the `# Done` archive at the bottom when updating
this checklist. Never leave completed work mixed into the open queue.

**Open work is below. Everything already delivered is archived at the end** —
kept rather than deleted, because each line records what was measured and why,
and that is the only defence against redoing work or reintroducing a bug that
was already understood once.

At last update: **174 open** (5 of them in progress), **180 done**.

---

# Open

## 0. Raised in conversation, not yet done

Kept at the top because these came from someone looking at the live site, and
that is the shortest feedback loop there is.

- [ ] Seed the six blog posts into CockroachDB, em-dash free, behind the existing accessors (`postBySlug`, `postsNewestFirst`, `relatedPosts`) so the pages do not change. MUST be shaped for the admin blog editor codex will build -- see the blog editor items in section 1C -- so they are real editable rows rather than a second static source. The plan is to be reviewed before anything writes to the database.
- [ ] Truehost SMTP takes about 23 seconds just to authenticate, measured from two networks. The contact form now answers in half that by sending the receipt after the response, but the real fix is a transactional provider, which would also give proper SPF and DKIM.

## 1. Public frontend


- [ ] `components/services/services-body.tsx` is now unreferenced: `/services` is a hub and each service renders through `service-detail.tsx`. Delete it once the new pages have been live long enough to be sure nothing is missed, and move anything worth keeping (the filter chips, the in-page nav, the brand rail) onto the hub first.

## 1A. Client onboarding experience

- [-] Make Save and continue later create a securely hashed, single-purpose resume token and email the link through Truehost SMTP. (Token flow is complete; Truehost currently rejects SMTP authentication with `535`.)
- [-] Set resume links to expire after 3 days; clearly handle expired, reused, and invalid links and allow a new link to be requested. (Expiry, replay rejection, invalid-link handling, and secure link rotation are complete; self-service reissue remains.)
- [ ] Design equivalent, concise onboarding question sets for branding, SEO, apps, software/AI, and paid advertising while preserving the same conversational voice.
- [ ] Audit and implement conditional display rules so clients see only questions relevant to their prior answers.
- [ ] Use a simple non-searchable dropdown for lists of ten or fewer options; keep search for longer lists, and ensure every open dropdown/popover renders above Jotform, UserWay, and back-to-top controls.
- [ ] After successful onboarding, send the client a personalized next-steps email; explain that project communication may use the client dashboard, direct chat, a WhatsApp project group where appropriate, or another agreed channel.
- [ ] Keep client account creation optional in that email; bind its expiring, single-purpose invitation to the onboarded recipient so a forwarded link cannot register a different email address.
- [ ] Let authenticated clients link or unlink Google in account settings; require another usable sign-in method before unlinking their last identity.
- [ ] Bind each client invitation to the intended normalized email and project/client record; store only a token hash, set an expiry, enforce one-time redemption, and reject email substitution or replay.
- [ ] Let an invited client create credentials or continue with an approved Google identity without granting admin access; keep the project relationship attached to the same client account.
- [ ] Keep collected detail sufficient for delivery while minimising client fatigue; validate completion time and question count per service.
- [ ] Audit the supplied Fluent Forms exports for where dropdowns, radios, checkboxes, multi-selects, and free text are intentionally used; choose the lowest-effort control for each WDC question.
- [ ] Research a free or self-hostable, production-safe domain-availability source (prefer authoritative RDAP/registry data; do not infer availability from DNS alone).
- [ ] For clients without a domain, provide up to three add/remove domain suggestions, an explicit Check availability action, per-domain available/taken/unknown feedback, and a Use selected action.
- [ ] Keep domain checks optional and conditional; rate-limit and cache checks, state that availability is informational until registration, and never show registrar pricing.

### Raised by the independent audit, 2026-09-13

- [ ] Give the onboarding page a main heading. (Finding A4. It has none. It is noindex so this costs nothing in ranking, but it is the element screen-reader users navigate by.)

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

Order is conversion divided by effort, lowest risk first.

- [ ] **Domain availability checker** (`web`). Type a name, see `.com .ng
  .com.ng .africa .app .co` as taken, free, or unknown. `/api/tools/domain`
  queries each registry's RDAP service directly, resolved from IANA's bootstrap
  file (`data.iana.org/rdap/dns.json`, cached 24h, longest-label match per RFC
  9224): 404 means available, 200 means taken, anything else says so honestly.
  Zero dependencies, about 1KB of client code. Measured: a `.com` lookup
  answers in 3.7s. **`.ng` is unreliable** -- `rdap.nic.net.ng` returned 502
  twice and timed out once -- so that row must degrade to "NiRA's lookup is
  down, we will confirm by hand", which is itself the lead. Never use an NS
  lookup as the primary signal: our own registered domain reads as available
  that way. `maxDuration = 15`, 4s per registry, `Promise.allSettled`.
- [ ] **Email deliverability check** (`web`, linked from `social`). A domain in,
  and out comes SPF, the DMARC policy in plain English, the MX provider, and a
  probe of about fifteen common DKIM selectors. `node:dns/promises` only: zero
  dependencies, zero cost, no ceiling, and verified working. "Your domain says
  `p=none`, which means anyone can send an invoice as you" is the highest-intent
  sentence on this site for a Nigerian SME. Keep the resolver behind one
  function so it can become DNS-over-HTTPS if the runtime ever blocks UDP/53.
- [ ] **Scope and budget estimator** (`software`, `apps`). Six to eight
  questions, then a range in naira and dollars with a phased breakdown. Pure
  arithmetic, no network until the visitor asks for it. The estimate appears
  *before* any email ask; the ask is "send me this as a PDF". Label it an
  indicative range, not a quote -- section 4 forbids fabricated totals and this
  is the same rule facing outward.
- [ ] **Link preview checker** (`social`). Paste a URL, see how it unfurls on
  WhatsApp, X, LinkedIn and Facebook, with the image dimensions checked and the
  description shown truncated where each one truncates it. Mock cards are CSS
  using existing tokens. WhatsApp is the channel that matters in this market,
  and this is the most shareable thing on the list.
- [ ] **On-page SEO snapshot, with the Lighthouse report emailed**
  (`seo`). Instantly: title and description lengths, one-H1 check, canonical,
  robots, viewport, `og:*`, images missing `alt`, structured data found, HTTPS,
  page weight. Then the ask -- "the full Lighthouse report takes about thirty
  seconds, where should we send it?" -- and PageSpeed Insights runs in `after()`
  exactly as the contact receipt does. The slow part becomes the magnet instead
  of a spinner, and nothing already shown is taken away. PSI needs an API key
  (keyless returned 429 in testing); 25,000/day, 400 per 100s. Extract the five
  scores and top opportunities server-side -- never return that JSON to a
  browser.
- [ ] **What your site costs a Nigerian visitor**, bolted onto the SEO result.
  Page weight times an editable naira-per-gigabyte figure, plus the wait on 3G,
  next to our own number. Pure arithmetic once the fetcher exists.
- [ ] **One shared `lib/fetch-page.ts` before either fetching tool.** The URL is
  attacker-supplied, so: http/https only, resolve the host and reject private,
  loopback, link-local and CGNAT ranges *before* fetching, `redirect: "manual"`
  with at most two hops each re-validated, a 6s timeout, a 2MB body cap, and a
  truthful user agent. One page, one fetch, never a crawl. `app/api/embeddable`
  already states the doctrine; this is the harder case because here the URL is
  genuinely arbitrary.
- [ ] **A shared rate-limit counter in Postgres for anything gating a metered
  key.** `lib/rate-limit.ts` lives in one instance's memory and cannot protect a
  25,000/day quota. Per-IP in memory is fine for the free tools.

Later, in rough order: a CrUX field-data card beside the audit (free, 150
queries a minute, sub-second); a brand asset pack from an uploaded logo using
`sharp`, which is already installed, giving a palette, a WCAG contrast grid and
a favicon set; a standalone contrast checker as the cheap subset of that; a
single-page broken-link check; a Flesch readability score; an AI running-cost
calculator with a dated price table; an ad budget and CPM calculator.

Deliberately not building: anything needing headless Chrome (Unlighthouse,
Puppeteer, axe-core run by us) -- PageSpeed Insights already runs Lighthouse
and axe for free, and a browser binary does not fit a serverless function; the
`psi` package, which wraps one URL; Domainr, whose standalone API is deprecated
and which answers a question RDAP answers free; WHOIS on port 43, which is
free-text parsing per registry over an unreliable outbound port; competitor
keyword or backlink data, where no free tier permits a public tool and
everything claiming otherwise is scraping; and any client-side call to a third
party, which our own CSP blocks and which we should not loosen it for.

## 1C. Blog

- [ ] Make the blog articles substantially longer, more useful and less generic. Measured today: the six posts run 113 to 205 words each, which is a long excerpt rather than an article. They should be the piece a prospect actually finishes, written from what this studio has really done rather than from what is generally true, and with no invented figures.

- [ ] Revisit the reading-time estimate against real posts; it is derived at 200 words a minute and has not been checked against anything longer than these six.

### Admin side, for whoever builds section 4

- [ ] Blog editor: create, edit, schedule and unpublish posts, writing the same block shape `lib/blog.ts` already defines (`p`, `h2`, `h3`, `list`, `quote`, `callout`). The renderer guarantees one h1 and a correct heading outline; an editor that emits raw HTML would give that away.
- [ ] Per-post SEO fields as first-class inputs, not afterthoughts: search-result title, meta description with a live character count, canonical override, and a social image.
- [ ] Draft, scheduled and published states, with the published date separate from the created date and a visible `updated` date when a post is revised.
- [ ] Move the posts from `lib/blog.ts` into CockroachDB behind the same accessors (`postBySlug`, `postsNewestFirst`, `relatedPosts`), so the pages do not change when the source does.
- [ ] Author and category records, once there is more than one person writing.
- [ ] Editable site content beyond the blog: the FAQ list, testimonials, the services copy and the work catalogue all currently live in `lib/` and need the same treatment.
- [ ] Media library backed by R2, reusing `r2Config()` and `presignPut()` from `lib/r2.ts` rather than a second uploader. Note the SVG caveat recorded under upload safety.
- [ ] Preview a draft as it will actually render, on the real page, before publishing.

## 2. Authentication and email

- [ ] **Mail is delivered but filed as spam by Gmail.** Diagnosed and written up in `plans/email-deliverability.md`. Authentication is NOT the headline problem: SPF lists the sending IP and aligns, a DKIM key is published on the `default` selector, MX is correct. The problems, in order: (1) the reverse DNS for `94.23.160.111` is `rbx107b.superfasthost.cloud`, a generic PTR on a SHARED IP, so forward-confirmed reverse DNS fails and our reputation is the average of everyone else on that box; (2) DMARC is `p=none` with no `rua`, so there is no policy and no reports; (3) SPF ends `~all`. Order of work: publish a DMARC record with `rua` (costs nothing, breaks nothing), ask Truehost about the PTR and a dedicated IP, read two weeks of reports, then move to `p=quarantine` and `-all`.
- [ ] Build the transactional email templates as a set, styled and laid out like Litch Consulting's, so the admin's email screens have something real to send rather than inventing a look later. One shared shell (header with the mark, a content column, a footer with the legal line and an unsubscribe where one is owed), then the messages themselves: enquiry receipt, onboarding invitation and reminder, quote, invoice and receipt, project stage change, deliverable ready for approval, sign-off, password reset. Table layout with a full document and a real plain-text alternative for every one -- see the spam note below for why that matters. Reuse `qrSvg()` on the invoice and receipt.
- [ ] Truehost's OUTBOUND filter scores what we send and will discard it with `550 Message discarded as high-probability spam`. Found the hard way: a test enquiry whose body read like a diagnostic ("test", "confirm the mail path end to end", "no reply needed") was rejected, while the identical route with an ordinary customer enquiry was accepted. Verified separately that the message SHAPE is fine -- plain text, our HTML blob, and the HTML with a Reply-To were all accepted when sent directly. Consequence: never test this path with text that reads like a test, and treat a 550 as content scoring rather than a broken form.

- [-] Re-sync the reset SMTP password from root `.env` to Doppler dev/stg/prd and Vercel without exposing it; redeploy and send a new production test email. (Doppler and Vercel values are updated; redeployment/test delivery in progress.)
- [ ] Complete login, logout, forgot-password, and reset-password flows.
- [ ] Wire password-reset emails through Truehost SMTP.
- [ ] Verify successful login, protected-route redirect, logout, and password reset locally.
- [ ] Verify a real SMTP delivery. (Production reached the mail server on 2026-09-12, but authentication was rejected with SMTP `535`; mailbox credentials or the accepted login identity still need correction.)
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

### Abuse and upload safety, raised by the independent audit 2026-09-13

- [ ] Record, in the upload route and wherever admin will render client files, that SVG uploads must only ever be served from the storage domain and never inline from ours. (Finding R3. SVG is a document format that can carry script. Safe today because nothing renders it on our origin; it becomes a live vulnerability the day the admin dashboard displays a client's uploaded SVG inline.)

## 3. Performance and release verification

- [-] Raise canonical-home mobile Lighthouse from the supplied 82 toward 90+ without regressing the supplied desktop 98; prioritise the 2.99s hero-text render delay, 3.8s LCP, 6.7s Speed Index, render-blocking CSS, forced reflow, and unused first-party JavaScript shown in the evidence.
- [x] Responsive visual QA run across home, services, contact, login, 404 and offline at 320/390/768/1440 in both themes, 48 screens. NO horizontal scroll anywhere: `scrollWidth` never exceeded `clientWidth` on any page at any width. Exactly one `h1` on every page. Three sub-44px tap targets found and fixed, all without moving a pixel of layout: the header logo link (was 36px tall, now 44 with the mark still h-9 inside it), the menu's social icons (22px glyph, now a 44px hit area from a pseudo-element so the icons stay aligned with the menu items above), and the `info@` email links on home and contact (21px tall, now 44px the same way). The footer already did this correctly at 330x44 and was the pattern followed. `/login` returns 500 in this sandbox ONLY because `COCKROACHDB_URL` is unset; the stack trace is `lib/db/pool.ts:32` and there is no code fault, so it is untested here rather than broken. The desktop nav links are 35px tall at 1440 and were left alone: the hamburger takes over below 900px, so they are not a touch surface, and changing the primary chrome's height is a design decision rather than a QA fix.
- [ ] Rerun mobile Lighthouse on the canonical domain and target 90+. BLOCKED: the PageSpeed Insights API returns 429 without a key, and local Lighthouse reports TBT about 10x worse than PSI, so it cannot give an honest absolute score. Needs a free PSI API key in the environment (25,000 queries a day). Field numbers measured directly meanwhile, live at 390px and 4x throttle: homepage LCP 1,708ms CLS 0.010, Services 1,944ms CLS 0, a service page 888ms CLS 0.002 (was 0.423 before the stage floor), Our Work 2,264ms CLS 0, Blog 1,492ms CLS 0. STILL BLOCKED as of this pass: PSI returns the same 429 without a key. See the newer local production-build numbers recorded below, and note the homepage CLS there reads 0.0563 rather than 0.010 because the hero is larger now, not because anything regressed.
- [x] Field/lab boundary recorded. Measured on the PRODUCTION build at 390px, 4x CPU throttle, Slow-4G (1.6Mbps/150ms): home LCP 976ms CLS 0.0563, Services 2,312ms CLS 0, a service page 4,768ms CLS 0, Our Work 2,792ms CLS 0, Blog 976ms CLS 0.0029, Contact 1,008ms CLS 0, Onboarding 4,116ms CLS 0.0557. Total Blocking Time is 0ms on every one.
- [x] CLS WAS BEING MEASURED WRONG, and it is worth writing down because it cost an afternoon. Summing every `layout-shift` entry is not CLS: the metric is the largest SESSION WINDOW, which breaks after a 1s gap and caps at 5s. The homepage's typing hero emits ~105 tiny shifts, so the naive sum reads 0.112 and the real number is 0.0563 — comfortably inside the 0.1 "good" threshold. Three separate attempts to "fix" the sum (holding the phrase width with a hidden tail, a stretched box with centred text, pinning the line left) all measured WORSE or no better and were reverted. The hero is unchanged.
- [x] The remaining homepage CLS is the rotating hero line and nothing else; every other page measures exactly 0. The cause is inherent: a centred line that changes width moves what is already in it, once per character. Eliminating it entirely means left-aligning the phrases, which with a set running from "yours?" to "your competition's problem?" leaves the visible text badly off-centre. Not worth 0.05 of headroom.
- [x] The two LCP outliers are lab artefacts, named rather than papered over. The service page's 4,768ms LCP is `/work/long/trax-desktop.jpg`, a below-fold `loading="lazy"` image that a stage animation reveals at ~4.6s; it is served from cache (transferSize 0), so this is discovery timing and not weight, and Chrome finalises LCP at first user input — a real visitor who scrolls or taps before 4.7s never records it. Onboarding's 4,116ms is the deliberate `ssr: false` in `onboarding-mount.tsx`: the form restores a draft from localStorage, the page is noindex and link-gated, and server-rendering it would trade 4s of LCP on an unindexed page for a hydration mismatch on every visit.

## 4. Admin product after frontend/auth milestone

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

- [ ] Add an “Attention needed” queue for overdue invoices, stalled onboarding, approaching deadlines, revision requests, failed payments/uploads, and unread client actions; each item must link directly to the resolution screen.
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

- [x] Project list and workspace rebuilt. The list filters by stage, service, owner and health, and the workspace opens with a health pill, the derived reasons it needs somebody, and a "what was agreed" row carrying scope, budget and the agreed channel. Every filter is a GET form and none of it is a client component, so a filtered view has its own URL, the back button undoes a filter, and the page ships no JavaScript for its own filtering.
- [x] Board/list switch added, server-rendered from `?view=`, so the choice survives a reload and can be linked to; changing a filter keeps it. Gesture behaviour MEASURED rather than assumed at 390px: the board's `.ad__scroll` reports `canScrollY: false`, so a vertical swipe starting inside it has nothing to consume it and chains to the page. Nothing calls `preventDefault` on it and no `touch-action` override was needed.
- [x] Both routes work. The New project form now carries owner, channel, budget and scope alongside client, service, stage and due, and `createProject` reads all of them — verified by creating one in a browser and reading ₦1,250,000.00, "WhatsApp group" and the scope back off the project page. From an attached onboarding submission, "Open a project from this" fixes the client and service (the form already settled both) and asks only for what the brief cannot know; verified end to end from /admin/forms to /admin/projects/p1002. The client-visibility default lives on updates rather than the project: each update is marked client-visible or internal, ticked by default.
- [-] Tasks are in, with assignee, due date, priority and ONE dependency, and ticking one writes a line on the project's history. Deliberately one dependency and not a list: a task waiting on two things waits on whichever finishes last, and modelling that properly means a graph, a cycle check and a topological sort for a screen that shows six rows. NOT DONE and not started: milestones, nested checklists, per-task comments and recurring work. The checklist's own instruction is not to turn the default screen into a project-management suite, so these want a deliberate decision rather than being added because the word appears in the line.
- [x] Updates carry health, progress, blockers, next steps and a client-visible/internal switch, and posting one is what moves the project's health — one action, not two, so the badge and the words cannot disagree. "Decisions" are not a separate field: they are recorded on the project's append-only history, which is where an approval or a stage change already writes.
- [x] Deliverables keep every version they have had, each with its own number, date and note, so "which one did they approve" still has an answer months later. A new version resets the approval, because an approval given for v2 is not an approval of v3. A revision cannot be recorded without saying what was asked for. The activity timeline was already append-only and every delivery write now lands on it. FILES ARE LINKS, NOT UPLOADS: R2 upload from the admin is not wired, and the field says so rather than pretending.
- [x] All five are derived by `projectAttention` from the project, its tasks and today's date — never stored, for the same reason `invoiceStatus` derives "overdue": it is a state time creates while nobody is looking. The dashboard queue used to list everything in Onboarding or Revisions, which is a proxy and a poor one; it now lists projects actually asking for somebody and sorts ACROSS the whole queue, so three overdue invoices can no longer push every blocked project off a panel titled "Attention needed".
- [x] Recorded on the project, because it is agreed per project rather than per company, and shown in the "what was agreed" row. Changing it writes a line on the history.
- [x] Archiving takes a project out of the lists and the board and touches nothing else: invoices, payments, updates, approvals and file versions stay exactly as they are. There is deliberately no delete, and the confirmation says so.

### 4.5 Money, invoices, payments, and expenditure

- [ ] Put a QR code on invoices and receipts, reusing `qrSvg()` from `lib/qr.ts` rather than a second encoder. It renders server-side as inline SVG, takes its colours as arguments, and defaults to error-correction level M so a printed invoice survives being folded.

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

---

# Done

Archived, with the evidence that closed each one. Search here before
reopening anything.

## Closed 2026-09-14, from live-site review

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
