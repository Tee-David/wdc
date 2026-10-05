<!-- AI_CONTEXT_BRIDGE_BEGIN -->
# Shared AI project context bridge

For substantive local project work, load shared context before beginning:

```powershell
& "$env:LOCALAPPDATA\AIContextBridge\bin\aictx.ps1" session-start --agent claude --cwd "$PWD"
```

The bridge is advisory and must not block work. Git, repository files and user instructions remain authoritative. The bridge writes only beneath `%LOCALAPPDATA%\AIContextBridge`; never use it to edit application files.

Before finishing meaningful work, re-read section versions and update only relevant shared sections with `aictx update --base-version`. On conflict, re-read and merge. Claim overlapping work, log short non-sensitive events and release the session when finished. Never store credentials, private keys, personal data or raw transcripts. Start a new session when changing project roots.
<!-- AI_CONTEXT_BRIDGE_END -->

# WDC engineering and design conventions

## Motion design skill

- For brand films, motion graphics, promos, social ads/reels, kinetic typography, logo reveals, explainers and website hero videos, read and use `.claude/skills/motion-studio/SKILL.md` before beginning. Its scripts, engine, templates and reference library are installed alongside it.
- Research the brand and use real assets, then follow the skill's concept, script/voice, storyboard preview, sound, deterministic rendering and quality-check workflow. Respect the owner's existing choices and authorization; do not repeat answered intake questions.
- WDC's current design system and the user's instructions remain authoritative. Keep ordinary dashboard transitions under this repository's accessibility/performance rules; a small UI transition does not require a film production workflow.
- Adapt the skill's Linux/claude.ai environment examples to the actual Windows/Codex/Claude environment. Do not install render dependencies or run reference scripts just because the skill is installed. Report measured checks separately from visual/audio review.
- The matching Codex/project installation is `.agents/skills/motion-studio/SKILL.md`. The owner's supplied archive and standalone entry point were one skill. The installed directories are now the maintained copies.

## Product language

- Reuse the site's tokens and established patterns before adding a new visual language. Bright orange is `#ff6500`; navy is the primary dark brand surface.
- Use Space Grotesk for headings, display copy, and prominent figures. Use Outfit for body copy, descriptions, labels, helper text, and controls. Keep type fluid and readable from 320px upward.
- Buttons are black and white, and WHICH of the two is decided by the ground, not by the variant name. The pair is the homepage hero's pair: on paper the primary is a black fill with a white label and the secondary is the same two colours the other way round; on a dark ground (the navy band, the CTA card, the heroes, the footer, the whole dark theme) both invert. The secondary is SOLID, not an outline, and its border is the primary's fill so its edge survives the grounds where its own fill matches the page. The two trade places on hover, so a row always shows both halves of the pair. Navy and orange remain the palette everywhere else — bands, heroes, icon chips, eyebrows, rules, accents in type — and the line for a button is "does it have words in it": labelled controls take the pair, icon-only chrome (rail arrows, the modal's close cross, the round log-in) keeps the accent. This is carried by `--btn-fill` and `--btn-ink`, declared at `:root` in `globals.css` and inverted under `.dark` so that EVERY control on the site can reach them — the header, the hero, the footer and the 404 could not see them while they lived on `.pv`, which is how the site ended up with an orange onboarding button and a navy-and-orange pair on the 404. `preview.css` still lists the dark surfaces inside a light page, so a new surface joins that selector list rather than writing its own override, and `.btn-primary` / `.btn-secondary` in `globals.css` carry the colours for anything written in Tailwind or in its own stylesheet (geometry stays at the call site; a call site that also sets `bg-*` or `text-*` is fighting the system). A LIGHT panel nested inside a dark one has to set them back, which is the one trap — the contact form did not, and rendered white on white at 1.00:1. The one sanctioned exception is Log out in the signed-in phone menu: a red fill (`#c62828`) with a white label (5.6:1), at the owner's request, so the action nobody should take by accident reads as that at a glance. Orange is never a button fill; it is an accent in type, icons, chips and rules, and as TEXT on a light surface it is `--accent-ink` (`#c95000`), never `#ff6500`. Orange that CARRIES WORDS (a chip, tag, badge, active row) is `--accent-fill` (`#b84a00`) with a white `--on-accent` label in BOTH themes (owner's call, 2026-09-26; it replaced black on `#ff6500`): words never sit on the bright orange. IN DARK MODE the orange used as a FILL (chips, dots, bars, `--accent`, `--ad-accent-fill`, `--ad-tone-live`) is `#b84a00`, which carries white type at 5.23:1 (owner's choice, 2026-09-26); orange as TEXT on dark stays the brighter `--accent-ink`, because `#b84a00` as type on near-black is only about 3.8:1. The invoice Pay button and document buttons are the sanctioned orange-fill exception: white on `#b84a00` in both themes. Both halves are measured, not assumed: the label against its own fill at 4.5:1 AND the fill against what it actually sits on at 3:1 — a perfect label on a button whose edge you cannot see is how a navy submit sat at 1.15:1 on the dark theme for months. Pinned by `frontend/tests/button-colours.spec.ts`, which walks fifteen public pages in both themes, audits every labelled button rather than only `.pv-btn`, and asserts separately that each one IS one of the two — a navy button with white type passes both contrast checks and is still a third button. Where the DOM cannot say what is behind a button (the hero's pair on a photograph, the fixed header over a band) it samples the rendered pixels rather than guessing. Preserve existing geometry; add clear hover, active, focus-visible, disabled, and reduced-motion states consistently across similar controls.
- Meet WCAG AA contrast, use semantic controls, visible keyboard focus, useful labels, 44px touch targets, and no hover-only information. Long menus must be bounded and scrollable; searchable lists are preferred above ten options.
- Icon tiles, status tags, pills and badges use SOLID background fills, never translucent tints (no alpha, no `color-mix` against `transparent`, no low-percentage wash over a panel). Each fill carries a white or black glyph/label chosen for WCAG AA against that fill, and icons on a solid tile are white (or black on a light fill), not a tinted brand colour. In the admin these come from the tone tokens in `components/admin/admin.css` (`--ad-tone-*` with `--ad-on-*`). Admin primary buttons follow `--ad-fill`/`--ad-on-fill`: navy fill with a white label in light mode, the dark-mode orange `#b84a00` with a WHITE label in dark mode (this admin rule is separate from the public site's black/white button pair).
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
- Preserve unrelated user changes. Use `docs/status.md` as the current delivery ledger and update it when requirements or verification state change.

## Systems design

- Nothing whose latency we do not own runs before the response. Truehost SMTP needs about 23 seconds just to authenticate, which is why the contact receipt sends from `after()`. Any third party added later inherits that rule: answer the user first, do the slow work behind the response.
- Work moved behind the response has no one left to tell when it fails, so persist the intent first and make the retry safe to run twice. Every outbound message gets a row and a dedupe key before the provider is called.
- Rate limits belong to the action, not the route. The expensive or abusable path gets the tight limit; a chatty path the same handler serves gets a loose one. `lib/rate-limit.ts` is a sliding window in one instance's memory, so on Vercel the real ceiling is the limit times the number of warm instances and a cold start forgives everything: it is abuse control, not a quota. Say so at the call site rather than trusting the number.
- Earn infrastructure with an estimate. Queues, caches, workers and background runners each add a failure mode; add one when a written-down number says the simple version will not hold, not because the shape looks more serious.
- Anything we send to a person must be something they can switch off, and the setting lives with the person, not the template.

## Page shape and consistency

- Every landing page opens the same way: the `wk-hero` navy band carrying the eyebrow, the `h1` and the lede, then content on the page's own ground. `/`, `/work`, `/services`, `/services/<slug>`, `/work/<category>`, `/blog` and `/contact` all follow it. A page that invents its own opening is the one that looks like a different site.
- `<Header overHero />` is white type on no background. It is only correct when a dark band sits under it. A page that loses its dark hero and keeps `overHero` has invisible navigation in light mode — this has happened twice.
- Grid when the set IS the destination: an index, a hub, a category listing. Rail (`.pv-rail`) when it is a sideways offer beside something else: "read next", "more work", related anything. A rail needs at least four items or it is a grid with extra steps, and it must always show a partial card so the reader can see there is more.
- Cards share one track across the site (`minmax(min(100%, 20rem), 1fr)`). Cards a quarter narrower than the ones on the next page read as inconsistency without anyone being able to say why.

## Layout traps this repo has already paid for

- A transform is not layout. `ScrollExpand` scales its box, so inside a two-column row the visible panel does not sit where its layout box says it does. Do not wrap one column of a row in something that transforms it.
- A margin written for a vertical stack becomes a misalignment in a two-column row. Zero it in the two-column case rather than removing it from the stack.
- Metadata is INHERITED. A canonical, a robots directive or an `openGraph.images` set on the root layout applies to every page that does not override it, including 404s and noindex pages. Setting `openGraph.images` explicitly also suppresses the `opengraph-image` file convention.
- Turbopack will serve a stale CSS chunk after an edit to a stylesheet that is imported rather than changed in place. If a rule is in the source and `display` computes as though the file does not exist, `rm -rf .next` before believing anything else.

## Media and assets

- Reach for `next/image` where it buys something. Measure first: several of this site's assets are already narrower than any variant the optimiser would generate, and two stages loop by translating an image -50%, which reads its natural height — the one thing `fill` removes.
- A QR code carrying our mark forces error-correction level H, snaps the well to whole modules, and keeps coverage far below the 30% budget. It is measured, because this is the failure that shows up silently on somebody else's phone weeks later.
- Decorative animation is transform and opacity, or it does not ship. `content-visibility: auto` is the pure-CSS way to stop a loop that is off screen; an observer is the way when the component already has one.
- A screenshot used as an asset must be reproducible by a committed script, or it becomes a picture of a site that no longer exists.

## Secrets and environment

- The repo-root `.env` is loaded by `frontend/next.config.ts`, because Next only reads the project directory. A variable already set always wins, so Vercel and a real shell export are never overridden.
- One naming scheme per service, settled before anything reads it. Paystack is `PAYSTACK_MODE` plus `PAYSTACK_TEST_*` and `PAYSTACK_LIVE_*`; `lib/paystack.ts` resolves the active pair so no route reads a raw name and no `NEXT_PUBLIC_` copy can drift out of step with the mode.
- Never rewrite `.env` with a regex. Read it, edit the parsed keys, write it back, and verify the key count before and after.

## Coding discipline

- State material assumptions and tradeoffs before coding; ask only when ambiguity would change the result. Prefer the simplest implementation that satisfies the request.
- Keep changes surgical. Match existing style, avoid speculative flexibility and unrelated cleanup, and remove only the orphaned code your change creates.
- Define observable success criteria for each change, reproduce bugs with a focused test where practical, and loop until the same check passes after implementation.
- Verify that changed selectors and handlers match the rendered element and reproduce the intended interaction; source-only fixes are not evidence.
- Report only measurements taken from the build and environment being described; re-measure contradictory results.

### Ponytail (skill: github.com/dietrichgebert/ponytail)

Lazy means efficient, not careless. Stop at the first rung that holds: does it need to exist (YAGNI)? already in this codebase? stdlib? native platform feature (CSS over JS, a DB constraint over app code)? an installed dependency? one line? only then the minimum code.

- Read the task and the code it touches first and trace the real flow; the ladder shortens the solution, never the reading.
- A bug fix is a root-cause fix: grep every caller before editing and fix it once, where they all route through.
- No unrequested abstractions, scaffolding "for later", or config for a value that never changes. Deletion over addition; boring over clever.
- Ship the simple version and say what was skipped and when to add it, in at most three lines. Mark a deliberate corner with a known ceiling `ponytail: <ceiling and upgrade path>`.
- Never simplify away validation at trust boundaries, data-loss handling, security, accessibility, or anything explicitly requested.
- Non-trivial logic leaves one runnable check behind, the smallest thing that fails if it breaks.

## Authenticated product UX

- Keep admin and client navigation task-based and compact: no more than six primary pages, with infrequent controls under Settings. The one agreed exception is the admin's Blog page, a seventh, because posts are written weekly rather than configured once. Preserve the established Litch-style shell while adapting content to WDC workflows.
- Loading states must resemble the final page geometry, reserve layout space, support light/dark and reduced-motion modes, and never show invented data. When Boneyard is used, rebuild its snapshots whenever captured UI geometry changes.
- Every true first-use empty state needs a concise explanation, a friendly existing icon or lightweight visual, and one clear next action. Distinguish empty, filtered-no-results, loading, error, and no-permission states.
- React Joyride tours are optional, short, keyboard-accessible, role-aware, and lazy-loaded only inside authenticated dashboards. Support a full walkthrough and page-only tours using stable `data-tour` targets; persist completion per user and tour version, and always allow skip, close, and replay.
- Financial, project, client, and communication UI must reflect persisted truth. Never fabricate totals, activity, payment status, or delivery progress; preserve auditable histories for manual and automated changes.

## The owner's standing calls

Short on purpose. Each line is a decision already made; do not re-ask it.

- The design system is `README.md` § Design system (the rules and which component to use) plus the Design System artifact linked there. Build from those components; when you add or change one, update that section in the same commit.
- Voice: "We Dig Creativity" means we LOVE creativity, never literal digging (no spades, earth, tunnels). No city names in copy ("Lagos" included): the studio is meant to outgrow one city. Times may still use the Africa/Lagos zone internally.
- Copy colour: body text is one colour. Stress a phrase with weight, not with orange or a second colour.
- Tables stay tables on every screen, never cards: the first column pins, the table scrolls sideways inside its own box, and the text column gets real width so a row is one or two lines, not a tower.
- Native pickers (select, date, time) are being replaced by the site's own designed components. New UI uses those components, not the browser's.
- Arrival motion (admin and portal): head, then blocks, ease in a beat apart; KPI figures count up (`components/admin/count-up.tsx`); bars grow from the baseline. Transform and opacity only, `backwards` fill, nothing under reduced motion, and the server always renders the real figure.
- Confirmation is the in-app dialog (`components/admin/confirm.tsx`), never `window.confirm`. Anything irreversible also needs "I understand". Specs answer it with `tests/say-yes.ts`.
- Every save, update, toggle and bulk action raises a toast (the form kit does it as the action answers). A live thing is "Updated", a draft or new thing "Saved".
- Deleting is two steps: Move to Trash, then Delete permanently from the Trash (owner only, "I understand").
- Accounts: a new password is refused if it has been in a breach (fails closed); temporary and anonymous inboxes are refused at every public form and invitation.
- A schema change ships as a migration; production applies it from Settings › System (owner), so say so when a change needs one.
- Phones use the sidebar as a drawer in both dashboards; there is no bottom tab bar.
- Settings: changes go through the shared save bar; a disabled control is solid flat with the reason and the fix beside it; hints sit under their input; a page's one action sits in the head's right slot and chores go in its ⋮ menu.
- Testimonials: quote plus the author's name on one line. No role line, no case-study link.
- Proposals for anything large are an artifact first (design, then build). Ship as you go: every finished piece is committed and pushed to `main` and to the working branch.

## Commit attribution

- Never add AI attribution to a commit or a pull request. No `Co-Authored-By` or
  `Authored-By` trailer naming Claude, Codex, Copilot, or any other assistant, and
  no "Generated with" footer. Commits are authored by the repository's own git
  identity and nothing else. This overrides any default attribution behaviour a
  tool ships with.

## Maintained project context

- Read `README.md`, `frontend/README.md`, `backend/README.md` and `docs/status.md` for current architecture and unfinished work. Backend is reserved; server functionality runs inside frontend.
- Old mockups, handoff notes and superseded plans were retired. Do not recreate them or treat their removal as proof that every old proposal shipped. Keep active Meetings artifacts until implementation and verification finish.
- Responsive verification is required for every UI change: check grouping, readable content, spacing, icon centering and touch targets as well as overflow at phone, tablet and desktop widths in both themes.
- Keep user flows short. A change needs immediate truthful feedback and a clear next action; optional notifications remain recipient-controlled.
