<!-- AI_CONTEXT_BRIDGE_BEGIN -->
# Shared AI project context bridge

For substantive local project work, load shared context before beginning:

```powershell
& "$env:LOCALAPPDATA\AIContextBridge\bin\aictx.ps1" session-start --agent codex --cwd "$PWD"
```

The bridge is advisory and must not block work. Git, repository files and user instructions remain authoritative. The bridge writes only beneath `%LOCALAPPDATA%\AIContextBridge`; never use it to edit application files.

Before finishing meaningful work, re-read section versions and update only relevant shared sections with `aictx update --base-version`. On conflict, re-read and merge. Claim overlapping work, log short non-sensitive events and release the session when finished. Never store credentials, private keys, personal data or raw transcripts. Start a new session when changing project roots.
<!-- AI_CONTEXT_BRIDGE_END -->

# WDC engineering and design conventions

## Motion design skill

- For brand films, motion graphics, promos, social ads/reels, kinetic typography, logo reveals, explainers and website hero videos, read and use `.agents/skills/motion-pilot/SKILL.md` before beginning. Its scripts, engine, templates and reference library are installed alongside it.
- Research the brand and use real assets, then follow the skill's concept, script/voice, storyboard preview, sound, deterministic rendering and quality-check workflow. Respect the owner's existing choices and authorization; do not repeat answered intake questions.
- WDC's current design system and the user's instructions remain authoritative. Keep ordinary dashboard transitions under this repository's accessibility/performance rules; a small UI transition does not require a film production workflow.
- Adapt the skill's Linux/claude.ai environment examples to the actual Windows/Codex/Claude environment. Do not install render dependencies or run reference scripts just because the skill is installed. Report measured checks separately from visual/audio review.
- The matching Claude installation is `.claude/skills/motion-pilot/SKILL.md`. The owner's supplied archive and standalone entry point were one skill. The installed directories are now the maintained copies.

## Product language

- Reuse the site's tokens and established patterns before adding a new visual language. Bright orange is `#ff6500`; navy is the primary dark brand surface.
- Use Space Grotesk for headings, display copy, and prominent figures. Use Outfit for body copy, descriptions, labels, helper text, and controls. Keep type fluid and readable from 320px upward.
- Buttons are black and white, and WHICH of the two is decided by the ground, not by the variant name. The pair is the homepage hero's pair: on paper the primary is a black fill with a white label and the secondary is the same two colours the other way round; on a dark ground (the navy band, the CTA card, the heroes, the footer, the whole dark theme) both invert. The secondary is SOLID, not an outline, and its border is the primary's fill so its edge survives the grounds where its own fill matches the page. The two trade places on hover, so a row always shows both halves of the pair. Navy and orange remain the palette everywhere else — bands, heroes, icon chips, eyebrows, rules, accents in type — and the line for a button is "does it have words in it": labelled controls take the pair, icon-only chrome (rail arrows, the modal's close cross, the round log-in) keeps the accent. This is carried by `--btn-fill` and `--btn-ink`, declared at `:root` in `globals.css` and inverted under `.dark` so that EVERY control on the site can reach them — the header, the hero, the footer and the 404 could not see them while they lived on `.pv`, which is how the site ended up with an orange onboarding button and a navy-and-orange pair on the 404. `preview.css` still lists the dark surfaces inside a light page, so a new surface joins that selector list rather than writing its own override, and `.btn-primary` / `.btn-secondary` in `globals.css` carry the colours for anything written in Tailwind or in its own stylesheet (geometry stays at the call site; a call site that also sets `bg-*` or `text-*` is fighting the system). A LIGHT panel nested inside a dark one has to set them back, which is the one trap — the contact form did not, and rendered white on white at 1.00:1. The one sanctioned exception is Log out in the signed-in phone menu: a red fill (`#c62828`) with a white label (5.6:1), at the owner's request, so the action nobody should take by accident reads as that at a glance. Orange is never a button fill; it is an accent in type, icons, chips and rules, and as TEXT on a light surface it is `--accent-ink` (`#c95000`), never `#ff6500`. Orange that CARRIES WORDS (a chip, tag, badge, active row) is `--accent-fill` (`#b84a00`) with a white `--on-accent` label in BOTH themes (owner's call, 2026-09-26; it replaced black on `#ff6500`): words never sit on the bright orange. IN DARK MODE the orange used as a FILL (chips, dots, bars, `--accent`, `--ad-accent-fill`, `--ad-tone-live`) is `#b84a00`, which carries white type at 5.23:1 (owner's choice, 2026-09-26); orange as TEXT on dark stays the brighter `--accent-ink`, because `#b84a00` as type on near-black is only about 3.8:1. The invoice Pay button and document buttons are the sanctioned orange-fill exception: white on `#b84a00` in both themes. Both halves are measured, not assumed: the label against its own fill at 4.5:1 AND the fill against what it actually sits on at 3:1 — a perfect label on a button whose edge you cannot see is how a navy submit sat at 1.15:1 on the dark theme for months. Pinned by `frontend/tests/button-colours.spec.ts`, which walks fifteen public pages in both themes, audits every labelled button rather than only `.pv-btn`, and asserts separately that each one IS one of the two — a navy button with white type passes both contrast checks and is still a third button. Where the DOM cannot say what is behind a button (the hero's pair on a photograph, the fixed header over a band) it samples the rendered pixels rather than guessing. Preserve existing geometry; add clear hover, active, focus-visible, disabled, and reduced-motion states consistently across similar controls.
- Meet WCAG AA contrast, use semantic controls, visible keyboard focus, useful labels, 44px touch targets, and no hover-only information. Long menus must be bounded and scrollable; searchable lists are required from five options.
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

- Onboarding forms: single choice with three or more plain options is a dropdown, two options is a one-line segmented control, ticks and chips only for multi-select; rich cards only with a description and picture. A set date uses the site's own calendar. Every first page of every layout has "Back to the onboarding menu". Everything should feel involved and intentional, in plain words, and stay light: ask more only where it changes the work, and say why.
- Colours and fonts share one idea: three cards at a time, a Shuffle button for the rest, "I already know mine" for exact choices. Fonts load from Google Fonts only while the Fonts step is open, cut to the preview letters (`text=`), so a shuffle never costs more than a few kilobytes. Do not add a package or load a whole list for it.
- Registration is asked as Yes or No, then the body (CAC BN, RC, IT, SMEDAN, a professional body) and the number. Websites and social pages are a repeatable row list (`profiles`), the same shape as colour codes. Brand guidelines are part of a full identity system; "Brand guidelines" on its own means the guide for a logo they already have.
- A recurring client keeps one record and one client portal (matched by email or phone). When assigning a form entry or making a pre-filled link, search existing clients or add a new one. Never create a second client for the same person.
- Policies live in `frontend/lib/legal.ts` and are drafts for a Nigerian lawyer, not legal advice. Facts the owner has given: domains are registered in the client's name and details by default; hosting is either the client's own account or ours on the terms in the Client Engagement Policy (there is no separate hosting agreement), with regular backups up to one week old; app store developer accounts are in the studio's name by default and can move to the client on request; up to three business mailboxes are free with a website we build; a project has up to two review meetings and a recorded Google Meet handover meeting followed by a handover document; the client indemnifies the studio; the studio is not responsible for lost domains, banned accounts or payment provider decisions; for payments the studio walks the client through the provider's setup and keys but never holds the money. The onboarding engagement section stays off until a lawyer approves it (`LAWYER_APPROVED`).
- Working rules for this repo: push to `main` and the working branch as you go, gated on `tsc` and eslint; run one Playwright run at a time against the dev server on port 3100, because overlapping runs clobber `test-results`; never `pkill -f` or `pgrep -f` a pattern that also appears in your own command line (it kills the shell); keep long runs in the background with `setsid`.

## Dashboard design system (Admin, staff and client)

The admin (owner), staff and client dashboards are three views of one studio. They share one shell, one component set and one vocabulary. This section is the binding summary. The full reference is `design/design-system/project/` (README, Writing, Patterns, Money, Settings, States, Motion, Pages, `tokens.json`, `components/`), published as the Design System artifact (https://claude.ai/artifact/XRhmw3yngg9bTxBzim5zLr). The approved page prototypes live in the canvas artifact (https://claude.ai/artifact/1HG99eCtChsHCLyTnh7iEQ, row "Overhaul pages"). Every decision the owner gave is logged in `plans/dashboard-overhaul/preferences.md`, and a newer line there wins. Do not deviate from any of these. If a screen needs something the system lacks, add it to the system first, then use it.

### The standard every page meets

- The approved home ("Flow": the Focus deck plus the Workbench sidebar) is the benchmark. Every other page uses the same idea, colours, fields, buttons, pagination and components. Nothing generic. A page that is only tiles and a table is not finished.
- A page answers "what needs me here" first (a deck or its equivalent), then the work (tables, lists, calendars), with a rail of figures and context beside it.
- Plan each page before building it: anticipate the next step, think through every nuance, and leave no dead ends. Every button has real follow-through that changes what the page shows.
- Projects differ by service. Branding and design, social media, SEO, websites, apps and custom software each have their own stages, deliverables, approvals and project page sections. Never model one service and reuse it for the rest. Branding nuance: flyers get one revision or two editions, brand guides start with a discovery call, motion is priced by seconds, clients provide assets. The content calendar belongs to social projects.

### Tokens

All colour comes from the `--ad-*` tokens shared with `components/admin/admin.css`.

| Token | Light | Dark |
| --- | --- | --- |
| `ad-bg` page ground | `#f6f7fb` | `#06061c` |
| `ad-panel` cards, sheets | `#fff` | `#0e0e2e` |
| `ad-panel-2` insets, table heads | `#f2f3f9` | `#121238` |
| `ad-ink` text | `#0e0e2c` | `#eef0fb` |
| `ad-dim` secondary text | `#5c5c7a` | `#9b9dc4` |
| `ad-line` / `ad-line-2` borders | `#e4e6f0` / `#c9ccdc` | `#1e2046` / `#33366a` |
| `ad-hover` | `#eceefa` | `#1b1b4a` |
| `ad-fill` primary button (white label) | `#000065` | `#b84a00` |
| `ad-accent-ink` orange text | `#b84a00` | `#ff6500` |
| `ad-focus` focus ring | `#0e0e2c` | `#eef0fb` |
| `ad-tone-good` / `warn` / `bad` (status only) | `#15803d` / `#a16207` / `#c62828` | same |
| `ad-tone-live` orange that carries words | `#b84a00` | `#b84a00` |
| `ad-tone-brand` / `neutral` | `#000065` / `#5c5c7a` | `#23239b` / `#3a3c6e` |
| `ad-tone-flat` routine tag (label `ad-on-flat`) | `#e4e6f0` | `#2a2c56` |
| `ad-hero` deck card | `#000065` | `#121238` |
| `ad-series-1` / `ad-series-2` charts | `#000065` / `#ff6500` | `#7377ff` / `#b84a00` |
| `ad-nav-on` / `ad-nav-on-ink` active nav | `#000065` / `#fff` | `#fff` / `#000065` |
| `ad-act` deck primary, hover `ad-act-hover` | `#b84a00`, hover `#15803d` | same |

- Easing: `ease` `cubic-bezier(.16,1,.3,1)` for arrivals, `spring` (a `linear()` spring) for things that land, `out` `cubic-bezier(.4,0,1,1)` for exits. Shadows `ad-sh-1` to `ad-sh-3`.
- Type: Space Grotesk for headings, figures and document numbers (tabular numerals). Outfit for body, labels and controls. Titles use the full width they have, never `text-wrap: balance`.
- Spacing 4, 8, 12, 16, 20, 24, 32. Radius: cards 20, the deck card 24, controls 12, tags and chips pills, phone sheets 26 at the top. Touch targets 44px; a smaller visual gets an invisible hit area.

### Colour and control rules

- Bright orange `#ff6500` never carries words. Words on orange use `#b84a00` with white. Green, amber and red mean status only; routine states are flat (`ad-tone-flat`), only exceptions take a colour.
- Tags, chips, badges and icon tiles are solid fills with a white (or ink on flat) label. No tints, no alpha.
- No orange outline on any input, ever, in either theme. Inputs show focus on the container: border `ad-ink` plus a 4px `ad-ring` halo. Keyboard focus elsewhere is a 2px `ad-focus` ring offset 2px.
- The active nav item is a solid fill (`ad-nav-on`), never a line or outline.
- Every control has designed hover, active, focus-visible and disabled states. Close crosses and Sign out turn red with white on hover. A disabled control is solid and flat with the reason beside it.
- Contrast is measured: text 4.5:1, non-text UI 3:1, in both themes.

### Layout and the shell

- Shell: Sidebar (logo, primary nav, a second group with Support, a footer pinned to the bottom with the dismissible install card, Tour, theme switch, collapse, profile with Sign out) and a TopBar (hamburger and page title on phones, search `Ctrl K`, bell, the page's one action).
- Rail mode at 900px and below (icons with tooltips). Below 640px the sidebar is a drawer from the site hamburger. No bottom tab bar.
- A page is a head (h1, a one-line lede that can stress one phrase in bold, the one action in the right slot, chores in its ⋮) then a two-column layout: the work column and a 356px rail. Below 1180px the rail drops under the work as a two-column grid.
- Figure cards (StatTile): a solid icon tile with a white icon beside the label, the figure counting up, one note line. At most two cards a row on phones; an odd last card spans the row.
- Verify every page at 320, 390, 834 and 1440 in both themes by measuring overflow and target sizes, not by looking.

### Patterns

- **Deck.** One card at a time: kind and urgency tags, a title, one sentence, two or three facts, a "why" line. One primary (`ad-act`, green on hover), one secondary, then Snooze, Hand over and Open details in one row on desktop. Each action stamps the card from the pressed button and sends it away in a meaningful direction; the next card rises. Clearing the deck plays the site's confetti, then an empty state with the next calendar item. Keyboard: D done, S snooze.
- **Sheets, never centred dialogs.** Side sheet on desktop (480px, 720px wide), bottom sheet with a drag handle on phones. Header and footer stay put, the body scrolls without chaining. Sheets stack; a small confirmation returns to its sheet, one that finishes the task closes the stack. Confirmations are sheets too, with the email preview when something is sent. Irreversible actions need "I understand".
- **Menus.** Popover anchored to its button on wide screens, bottom sheet on phones, searchable when long, close on outside click and Esc.
- **Tables and lists.** Tables stay tables on every screen: first column pinned, sideways scroll inside the box. Tapping a row opens the item. The row's ⋮ is a separate touch area: it opens the options, never lights the row, shows its own press and stays pressed while open (`aria-expanded`). Row hover only on devices that can hover. Every list pages at 5 with 5, 10 or 20 per page and View all; the pager is centred in its card.
- **Tabs** draw their own underline and switch with their content. **Search** animates its results; filtered-no-results is its own state with Clear.
- **Toasts** bottom centre with a visible timer: 5 seconds, 8 with Undo. External sends count down 8 seconds with Undo. Anything already confirmed in a sheet gets no Undo. A toast never covers a sheet's buttons.
- **Tour.** "Tour this page" offers this page or the full walkthrough; spotlight with a white flowing ring, dim and blur the rest, the card follows the page and never covers the target, arrows and Esc, completion kept per person and version.
- **Previews.** Files and posts open in a real in-app preview with their own actions (download, print, comment, request changes, approve).
- **Platforms and payments** use their real marks: social on a solid tile of the platform colour, Paystack and Flutterwave logos on white.

### States and motion

- Every page has a skeleton matching its final geometry, in both themes, with no invented figures. Every true empty state has a short reason, a drawn icon and one next action. Empty, filtered, loading, error and no permission are distinct.
- Motion is transform and opacity, interruptible, off under reduced motion. Arrival: head, then blocks a beat apart; figures count up; bars grow from the baseline; steppers and timelines draw on. Sheets slide in on the spring (460ms, bottom sheets 420ms); exits 200ms. Line icons draw once with `pathLength="1"` where it means something.

### Money

- Invoices `INV-26-XXXXXX`, quotes `EST-2026-NNN` (called Quote), receipts `RCT-2026-NNN` (Flutterwave `RCT-2026-FNNNNNN`). Naira as `₦850,000`; short form only in tiles and charts.
- Clients pay with Paystack or Flutterwave only. Initialising shows its steps, success plays confetti and rolls out the receipt, a decline says nothing was taken and offers the other provider or help, closing mid-payment keeps checking and emails the result, a paid invoice cannot be paid twice.
- Staff never see amounts, only chips (Deposit paid, Awaiting deposit, Retainer, Not billed). Every figure is calculated from persisted truth and adds up.

### Writing

- Calm and specific: what happened, what happens next, where to find it. Sentence case, no exclamation marks, no emoji, no dashes in copy, no city names.
- Buttons name the action and its object ("Send final reminder"), never "Submit" or "OK". A confirmation's title is the question, its body the consequence, its button the verb.
- Staff and client copy says "Admin", never "the owner". Words: Quote, Hand over, Snooze, Approve, Request changes, Move to Trash, Saved (new) and Updated (live).
- Dates `Tue 14 Oct`, `14 Oct 2026` on documents, 24-hour time, relative only under a day.

### Pages per role

- **Admin:** Today, Clients, Projects, Money, Messages, Blog, Settings, plus Support.
- **Staff:** My Day, Projects (their departments, no amounts), Clients (assigned to them), Messages, Settings, plus Support.
- **Client:** Home, Projects, Billing, Messages, Settings, plus Support.

### How the prototypes are made

- Source: `design/dashboards/kit/` holds the shared styles, shell, sheet, behaviour and a module per page, assembled by `build.py` into `.dc.html` boards. A correction goes into the kit once and lands on every page. The implementation follows the kit's patterns, not its prototype data.
- Each finished page is verified (desktop, phone, dark tablet; overflow, target sizes; an end to end interaction run), published to the canvas artifact, and committed. Show the owner the artifact, not screenshots.
- The design work is done by the main session alone. No agents for design. If agents are ever approved for implementation: at most 2 Sonnet agents, model set explicitly.

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
