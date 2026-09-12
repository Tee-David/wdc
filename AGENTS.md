# WDC engineering and design conventions

## Product language

- Reuse the site's tokens and established patterns before adding a new visual language. Bright orange is `#ff6500`; navy is the primary dark brand surface.
- Use Space Grotesk for headings, display copy, and prominent figures. Use Hausfit for body copy, descriptions, labels, helper text, and controls. Keep type fluid and readable from 320px upward.
- Button labels must be neutral white or black, chosen for contrast. Orange and blue fills use white text. White fills use black text. Preserve existing geometry; add clear hover, active, focus-visible, disabled, and reduced-motion states consistently across similar controls.
- Meet WCAG AA contrast, use semantic controls, visible keyboard focus, useful labels, 44px touch targets, and no hover-only information. Long menus must be bounded and scrollable; searchable lists are preferred above ten options.
- Treat a screenshot correction as a pattern audit. Check sibling components for the same defect and fix the shared rule when safe.

## Responsive interaction

- Mobile scrolling is native. Do not load Lenis, smooth-wheel interception, custom cursors, or scroll-position writers on touch/coarse-pointer devices. Keep listeners passive and coalesce scroll work in `requestAnimationFrame`; avoid layout reads and React state updates per scroll frame.
- Horizontal rails must not trap vertical gestures. Tooltips, popovers, menus, modals, FABs, hover lifts, and focus rings must remain visible inside the viewport and clear safe-area insets.
- Respect `prefers-reduced-motion`. Animation must communicate state, remain interruptible, and never block navigation or content.

## Performance and dependencies

- Protect LCP, INP, CLS, and bundle size with each change. Prefer server components and CSS; isolate the smallest client boundary. Lazy-load below-fold, optional, and third-party code after genuine user intent.
- Do not add a package for a small UI effect or icon. Reuse existing libraries and browser/platform features. Keep static marketing media in `public/` with `next/image`; reserve R2 for user/admin uploads.
- Avoid request waterfalls, duplicate listeners, render-time database/network calls, oversized JSON, and unbounded lists. Cache safe public data and explicitly invalidate it after writes.
- Run lint, TypeScript, production build, targeted tests, and responsive visual checks before release. Verify the exact deployed commit and canonical domain; do not equate a source change with a live fix.

## SEO and content

- Keep one descriptive H1, logical heading order, meaningful titles/descriptions, canonical metadata, crawlable internal links, image dimensions/alt text, and structured data only when it truthfully describes visible content.
- Do not hide primary content behind client-only rendering or animation. Maintain working 404/offline states and avoid layout shifts from fonts, images, embeds, or late banners.

## Safety

- Never expose secrets or copy them into source, logs, fixtures, screenshots, or chat. Validate all browser input on the server. Protect auth, payments, uploads, webhooks, and email flows with least privilege, origin/signature checks, idempotency, rate limits, and auditable state changes.
- Preserve unrelated user changes. Use the root checklist as the delivery ledger and update it when requirements or verification state change.

## Coding discipline

- State material assumptions and tradeoffs before coding; ask only when ambiguity would change the result. Prefer the simplest implementation that satisfies the request.
- Keep changes surgical. Match existing style, avoid speculative flexibility and unrelated cleanup, and remove only the orphaned code your change creates.
- Define observable success criteria for each change, reproduce bugs with a focused test where practical, and loop until the same check passes after implementation.

## Commit attribution

- Never add AI attribution to a commit or a pull request. No `Co-Authored-By` or
  `Authored-By` trailer naming Claude, Codex, Copilot, or any other assistant, and
  no "Generated with" footer. Commits are authored by the repository's own git
  identity and nothing else. This overrides any default attribution behaviour a
  tool ships with.
