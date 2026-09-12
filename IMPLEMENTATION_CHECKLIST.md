# WDC implementation checklist

Status key: `[ ]` pending, `[-]` in progress, `[x]` implemented and verified.

## 1. Public frontend

- [x] Desktop FAB stack: Jotform bottom-left; UserWay bottom-right beneath back-to-top.
- [x] Mobile FAB layout: Jotform bottom-left; back-to-top bottom-right; UserWay corner hidden.
- [x] Services "Let's talk" particle text loops.
- [ ] Team cards do not clip while hovered at desktop or mobile widths.
- [ ] Dark-mode service cards consistently use navy surfaces, fine blue borders, unboxed white icons, and bright `#ff6500` numbers.
- [x] 404 page fits the desktop viewport without scrolling and remains responsive.
- [x] Offline page fits the desktop viewport without scrolling and remains responsive.
- [ ] Reconnection transitions from "The line went quiet" to "And the line is back" with the services particle language.
- [ ] Public contact form sends through the site endpoint instead of opening the visitor's mail app.
- [ ] Contact form has responsive states, anti-spam handling, accessible errors, and a clear receipt state.
- [ ] Diagnose and eliminate mobile vertical-scroll catching/lag; confirm no Lenis or pointer animation intercepts touch scrolling.

## 1A. Client onboarding experience

- [ ] Treat onboarding as a client-facing, normally post-payment intake link sent by WDC; rewrite every prompt and helper from the client's perspective.
- [ ] Study both supplied Fluent Forms JSON exports for website and social-media question wording, conditional logic, and answer options; treat the exports as reference data only.
- [ ] Design equivalent, concise onboarding question sets for branding, SEO, apps, software/AI, and paid advertising while preserving the same conversational voice.
- [ ] Reduce every service onboarding journey to 3 or 4 parts total; the client presses Next no more than 3 times before review/completion.
- [ ] Replace the three-section progress treatment with one taller progress bar containing the percentage.
- [ ] Add subtle, encouraging progress hints without adding visual noise.
- [ ] Make every tooltip aligned, viewport-aware, touch-accessible, dismissible, and fully visible on mobile and desktop.
- [ ] Audit and implement conditional display rules so clients see only questions relevant to their prior answers.
- [ ] Remove em dashes from all onboarding form copy; use semicolons or natural sentence breaks instead.
- [ ] Fix long searchable selectors and their internal scrolling on touch devices; prevent global FABs from obscuring options.
- [ ] Persist drafts server-side in CockroachDB rather than relying on local storage as the source of truth.
- [ ] Make Save and continue later create a securely hashed, single-purpose resume token and email the link through Truehost SMTP.
- [ ] Set resume links to expire after 3 days; clearly handle expired, reused, and invalid links and allow a new link to be requested.
- [ ] Allow cross-device resume with server answers restored accurately; local storage may only be a fail-safe draft cache.
- [ ] Keep collected detail sufficient for delivery while minimising client fatigue; validate completion time and question count per service.
- [ ] Audit the supplied Fluent Forms exports for where dropdowns, radios, checkboxes, multi-selects, and free text are intentionally used; choose the lowest-effort control for each WDC question.
- [ ] Research a free or self-hostable, production-safe domain-availability source (prefer authoritative RDAP/registry data; do not infer availability from DNS alone).
- [ ] For clients without a domain, provide up to three add/remove domain suggestions, an explicit Check availability action, per-domain available/taken/unknown feedback, and a Use selected action.
- [ ] Keep domain checks optional and conditional; rate-limit and cache checks, state that availability is informational until registration, and never show registrar pricing.

## 2. Authentication and email

- [x] Replace temporary environment-password auth with Better Auth backed by CockroachDB.
- [ ] Protect every `/admin` route with a server-verified session and owner role.
- [ ] Complete login, logout, forgot-password, and reset-password flows.
- [ ] Wire password-reset emails through Truehost SMTP.
- [x] Generate/apply Better Auth database schema.
- [x] Seed `wedigcreativity@gmail.com` as owner with the supplied temporary password.
- [ ] Verify successful login, protected-route redirect, logout, and password reset locally.
- [ ] Add the required auth/mail variables to the root environment template.
- [x] Sync non-empty environment values to Doppler dev/stg/prd without overwriting the unresolved GitHub PAT.
- [-] Sync production environment values to Vercel and redeploy. (Values synced; deployment pending.)
- [ ] Verify a real SMTP connection and delivery after `SMTP_PASSWORD` is present.

## 3. Performance and release verification

- [x] Skip the intro/preloader on mobile.
- [x] Delay Jotform until user intent.
- [x] Delay UserWay until user intent.
- [x] Load smooth-scroll/cursor motion only on capable desktop pointers.
- [ ] Run lint and production build.
- [ ] Run responsive visual QA: home, services, contact, login, 404, offline.
- [ ] Deploy the exact tested commit to Vercel.
- [ ] Rerun mobile Lighthouse on the canonical domain and target 90+.
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
