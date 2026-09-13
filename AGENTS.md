# WDC engineering and design conventions

## Product language

- Reuse the site's tokens and established patterns before adding a new visual language. Bright orange is `#ff6500`; navy is the primary dark brand surface.
- Use Space Grotesk for headings, display copy, and prominent figures. Use Outfit for body copy, descriptions, labels, helper text, and controls. Keep type fluid and readable from 320px upward.
- Button labels must be neutral white or black, chosen for contrast, and the choice is measured rather than assumed. An `--accent` (orange) fill takes `--on-accent`, which is BLACK at 7.11:1 — white on `#ff6500` is 2.95:1 and fails even the 3:1 allowed for large text. A navy fill takes white at 17.68:1. A white fill takes black. Orange as TEXT on a light surface is `--accent-ink` (`#c95000`), never `#ff6500`. Pinned by `frontend/tests/button-colours.spec.ts`. Preserve existing geometry; add clear hover, active, focus-visible, disabled, and reduced-motion states consistently across similar controls.
- Meet WCAG AA contrast, use semantic controls, visible keyboard focus, useful labels, 44px touch targets, and no hover-only information. Long menus must be bounded and scrollable; searchable lists are preferred above ten options.
- Treat a screenshot correction as a pattern audit. Check sibling components for the same defect and fix the shared rule when safe.
- CSS custom properties must be declared at a scope shared by every consumer; use root tokens for site-wide chrome and local tokens only within their owning component.

## Responsive interaction

- Mobile scrolling is native. Do not load Lenis, smooth-wheel interception, custom cursors, or scroll-position writers on touch/coarse-pointer devices. Keep listeners passive and coalesce scroll work in `requestAnimationFrame`; avoid layout reads and React state updates per scroll frame.
- Horizontal rails must not trap vertical gestures. Tooltips, popovers, menus, modals, FABs, hover lifts, and focus rings must remain visible inside the viewport and clear safe-area insets.
- Give text-bearing flex/grid children `min-width: 0`, and test long real-world content at 320px so truncation cannot widen the viewport.
- Mark genuine nested scroll regions with `data-lenis-prevent` on devices where Lenis is active; preserve native page scrolling everywhere else.
- One owner for scroll position. Lenis, the router and `history.scrollRestoration` will each move the page and none of them knows about the others; a second writer is how a link lands you at the bottom of the next page. Route new scroll behaviour through `components/ui/scroll-reset.tsx`, and never fight a reader who has already scrolled.
- Respect `prefers-reduced-motion`. Animation must communicate state, remain interruptible, and never block navigation or content.

## Performance and dependencies

- Protect LCP, INP, CLS, and bundle size with each change. Prefer server components and CSS; isolate the smallest client boundary. Lazy-load below-fold, optional, and third-party code after genuine user intent.
- Do not add a package for a small UI effect or icon. Reuse existing libraries and browser/platform features. Keep static marketing media in `public/` with `next/image`; reserve R2 for user/admin uploads.
- Avoid request waterfalls, duplicate listeners, render-time database/network calls, oversized JSON, and unbounded lists. Cache safe public data and explicitly invalidate it after writes.
- Measure third-party assets before placing them on the critical path; self-host and right-size stable assets when permitted.
- Pause timers, `requestAnimationFrame` loops, and decorative animations when off-screen or hidden; mounting and runtime visibility are separate concerns.
- Run lint, TypeScript, production build, targeted tests, and responsive visual checks before release. Verify the exact deployed commit and canonical domain; do not equate a source change with a live fix.

## SEO and content

- Keep one descriptive H1, logical heading order, meaningful titles/descriptions, canonical metadata, crawlable internal links, image dimensions/alt text, and structured data only when it truthfully describes visible content.
- Do not hide primary content behind client-only rendering or animation. Maintain working 404/offline states and avoid layout shifts from fonts, images, embeds, or late banners.

## Safety

- Never expose secrets or copy them into source, logs, fixtures, screenshots, or chat. Validate all browser input on the server. Protect auth, payments, uploads, webhooks, and email flows with least privilege, origin/signature checks, idempotency, rate limits, and auditable state changes.
- Form deferral choices such as “I’m not sure, please advise me” must be reversible; selecting a real answer replaces the deferral without disabling the field.
- Security checks must fail closed: missing origin, signature, authorization, or required identity is not valid input.
- Preserve unrelated user changes. Use the root checklist as the delivery ledger and update it when requirements or verification state change.

## Systems design

- Nothing whose latency we do not own runs before the response. Truehost SMTP needs about 23 seconds just to authenticate, which is why the contact receipt sends from `after()`. Any third party added later inherits that rule: answer the user first, do the slow work behind the response.
- Work moved behind the response has no one left to tell when it fails, so persist the intent first and make the retry safe to run twice. Every outbound message gets a row and a dedupe key before the provider is called.
- Rate limits belong to the action, not the route. The expensive or abusable path gets the tight limit; a chatty path the same handler serves gets a loose one. `lib/rate-limit.ts` is a sliding window in one instance's memory, so on Vercel the real ceiling is the limit times the number of warm instances and a cold start forgives everything: it is abuse control, not a quota. Say so at the call site rather than trusting the number.
- Earn infrastructure with an estimate. Queues, caches, workers and background runners each add a failure mode; add one when a written-down number says the simple version will not hold, not because the shape looks more serious.
- Anything we send to a person must be something they can switch off, and the setting lives with the person, not the template.

## Coding discipline

- State material assumptions and tradeoffs before coding; ask only when ambiguity would change the result. Prefer the simplest implementation that satisfies the request.
- Keep changes surgical. Match existing style, avoid speculative flexibility and unrelated cleanup, and remove only the orphaned code your change creates.
- Define observable success criteria for each change, reproduce bugs with a focused test where practical, and loop until the same check passes after implementation.
- Verify that changed selectors and handlers match the rendered element and reproduce the intended interaction; source-only fixes are not evidence.
- Report only measurements taken from the build and environment being described; re-measure contradictory results.

## Authenticated product UX

- Keep admin and client navigation task-based and compact: no more than six primary pages, with infrequent controls under Settings. Preserve the established Litch-style shell while adapting content to WDC workflows.
- Loading states must resemble the final page geometry, reserve layout space, support light/dark and reduced-motion modes, and never show invented data. When Boneyard is used, rebuild its snapshots whenever captured UI geometry changes.
- Every true first-use empty state needs a concise explanation, a friendly existing icon or lightweight visual, and one clear next action. Distinguish empty, filtered-no-results, loading, error, and no-permission states.
- React Joyride tours are optional, short, keyboard-accessible, role-aware, and lazy-loaded only inside authenticated dashboards. Support a full walkthrough and page-only tours using stable `data-tour` targets; persist completion per user and tour version, and always allow skip, close, and replay.
- Financial, project, client, and communication UI must reflect persisted truth. Never fabricate totals, activity, payment status, or delivery progress; preserve auditable histories for manual and automated changes.

## Commit attribution

- Never add AI attribution to a commit or a pull request. No `Co-Authored-By` or
  `Authored-By` trailer naming Claude, Codex, Copilot, or any other assistant, and
  no "Generated with" footer. Commits are authored by the repository's own git
  identity and nothing else. This overrides any default attribution behaviour a
  tool ships with.
