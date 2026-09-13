# WDC implementation checklist

Status key: `[ ]` not started, `[-]` in progress, `[x]` done and verified.

**Open work is below. Everything already delivered is archived at the end** —
kept rather than deleted, because each line records what was measured and why,
and that is the only defence against redoing work or reintroducing a bug that
was already understood once.

At last update: **189 open** (7 of them in progress), **86 done**.

---

# Open

## 0. Raised in conversation, not yet done

Kept at the top because these came from someone looking at the live site, and
that is the shortest feedback loop there is.

- [x] SEO skill run over the built site as a crawl of all 44 sitemap URLs, and what it found is fixed. THE SIX SERVICE PAGES WERE NOT IN THE SITEMAP -- everything else there is derived from its data and services were the one set listed by hand, so the new URLs were invisible to crawlers. `/services/<slug>` and `/work/<slug>` were shipping IDENTICAL meta descriptions, because both used the service lede; the service pages now carry their own sentence. The six service pages and six work categories had no `og:image`; both sets now draw one. Blog posts carry their own date in the sitemap instead of the deploy time. Re-crawled after: no missing og:image, no duplicate titles or descriptions, one h1 per page, no skipped heading levels, valid JSON-LD on all 44.
- [x] R2 CORS policy set by the founder and verified end to end: an OPTIONS preflight from each origin returns 204 with a matching `access-control-allow-origin` (it was 403 with no headers at all), a real presigned PUT carrying a browser `Origin` returns 200, and the object reads back publicly as `image/png`. Onboarding uploads work.
- [ ] Re-measure the hero slit wipe against the old crossfade on a quiet machine. The numbers recorded above were taken while two research agents were running and the interleaved re-run was polluted by server restarts, so they are not trustworthy enough to quote.
- [ ] Sync the environment to Doppler as well as Vercel. The CLI is installed (v3.76.1) but has no project configured in this working copy.
- [ ] Truehost SMTP takes about 23 seconds just to authenticate, measured from two networks. The contact form now answers in half that by sending the receipt after the response, but the real fix is a transactional provider, which would also give proper SPF and DKIM.

## 1. Public frontend

- [ ] Sixteen case-study titles run 82-115 characters once the brand suffix is appended, so Google will rewrite or truncate every one of them. Give the long ones an explicit `title.absolute` without the suffix, or shorten the descriptive half. Copy decision, not a mechanical one.
- [ ] Meta descriptions on the six work category pages (57-76 chars) and the five legal pages (75-114) are short enough that Google will usually write its own snippet instead. Not a failure -- the skill is explicit that the 120-160 range is a linting proxy, not a rule -- but these are cheap to improve and two of them are landing pages.

- [ ] `components/services/services-body.tsx` is now unreferenced: `/services` is a hub and each service renders through `service-detail.tsx`. Delete it once the new pages have been live long enough to be sure nothing is missed, and move anything worth keeping (the filter chips, the in-page nav, the brand rail) onto the hub first.
- [ ] The six service pages want a FAQ block each, fed from `lib/faq.ts` filtered by service. The hub inherits the general questions; the detail pages should answer the ones a buyer of THAT service asks, and it is the cheapest structured-data win left on the site.

### Raised by the independent audit, 2026-09-13 (see `plans/WDC_Site_Audit_And_SEO_Plan.docx`)

- [x] Six dedicated service URLs built, one per service, plus a hub. The founder chose six over the three I recommended: listing six services and building three pages advertises a gap. `/services` is now the same one-plate hub `/work` uses; each `/services/<slug>` carries that service's demo, prose, deliverables, tool marquee, the six steps, the case studies already filed under its slug, and the ask. Every class is one the design system already had. Six Service nodes point at six real URLs instead of six anchors, and the hub emits a CollectionPage. This also lands finding P2: the six stage demos no longer share one route. (Findings S4 and C3.)

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

- [x] Blog posts and the index get drawn preview cards rather than the cover photograph. The covers are hero images cropped for a 16:10 band; handed to a network as a 1200x630 preview they are cropped again by someone else, and the headline -- the only thing that makes anyone click -- is not in the picture. The explicit `images` in the post metadata had to go, because setting it suppresses the file convention.
- [x] RSS at `/blog/rss.xml`, derived from the same array the pages render so it cannot go stale, linked from the index through `alternates.types`. RSS rather than JSON Feed: it is what readers, newsletters and aggregators all accept without being told. The channel timestamp is the newest post's, not "now" -- a lastBuildDate that moves on every fetch tells every reader the feed changed when it did not.
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
- [x] `List-Unsubscribe` on automatic mail. `sendMail()` takes `unsubscribe: true` and the contact receipt uses it. A message offering no way out looks like mail that does not expect to be refused, and Gmail scores it that way. It is a `mailto:` for now because there is no unsubscribe endpoint yet, and a link to one that does not exist would be worse; swap it for a URL plus `List-Unsubscribe-Post` when there is one.

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
- [ ] Run responsive visual QA: home, services, contact, login, 404, offline.
- [x] Deployed to production through the Vercel API, which is the working route on this plan (a git push does not deploy here). NOTE FOR EVERY FUTURE SESSION: a push to main is NOT a release. Everything built today sat on main and invisible until this deploy, which is why the blog redesign "had not been done".
- [ ] Rerun mobile Lighthouse on the canonical domain and target 90+. BLOCKED: the PageSpeed Insights API returns 429 without a key, and local Lighthouse reports TBT about 10x worse than PSI, so it cannot give an honest absolute score. Needs a free PSI API key in the environment (25,000 queries a day). Field numbers measured directly meanwhile, live at 390px and 4x throttle: homepage LCP 1,708ms CLS 0.010, Services 1,944ms CLS 0, a service page 888ms CLS 0.002 (was 0.423 before the stage floor), Our Work 2,264ms CLS 0, Blog 1,492ms CLS 0.
- [ ] Record any remaining field/lab boundary honestly.

### Raised by the independent audit, 2026-09-13

- [x] Services main thread fixed by splitting the page. Measured on the LIVE domain at 390px and 4x CPU throttling: main-thread task time 1,426ms against the audit's 8,320ms, and 1,323KB against 3,707KB. The cause was six code-split stage demos sharing one route; each now lives on its own service page. (Finding P2.)
- [x] Page weight measured on the LIVE domain at 390px: homepage 916KB (audit 3,215KB), Services 1,323KB (3,707KB), Our Work 447KB (3,099KB). The savings come from the image optimiser, the services split and the stage gating rather than from deleting anything. (Finding P4.)

## 4. Admin product after frontend/auth milestone

### 4.0 Reference, scope, and release guardrails

- [ ] Capture desktop, tablet, and mobile reference screenshots for the Litch shell and every equivalent WDC admin route before visual implementation.
- [ ] Keep every admin route private, no-store, noindex, server-authorized, and free of public-site animation, smooth scrolling, third-party FABs, and decorative loading work.

### 4.1 Litch-parity admin shell and UI foundation

- [ ] Match Litch's shell dimensions, spacing, radii, borders, shadows, typography hierarchy, icon sizing, active states, hover states, and responsive breakpoints while applying WDC's logo and established colour tokens.
- [ ] Create reusable Litch-parity primitives for page headers, stat cards, panels, badges, tabs, data tables, filters, empty states, skeletons, error states, pagination, confirmation modals, toasts, charts, and export menus.
- [ ] Use Boneyard page-shaped skeletons for dashboard routes and data-heavy panels; capture the real responsive geometry so loading states automatically track current UI structure, preserve dimensions, and avoid CLS after future design changes.
- [ ] Add a Boneyard rebuild/check step whenever a mirrored page or component layout changes; exclude interactive chrome and decorative SVG detail that should not become skeleton bones.
- [ ] Distinguish first-use, cleared, filtered/no-results, permission-denied, and load-error states; provide clear-filters, request-access, retry, or create actions as appropriate instead of reusing one generic blank state.
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
