# Dashboard overhaul: the owner's preferences

The running ledger of every decision and preference the owner gave during the dashboard overhaul (October 2026). The final design system, the full prototype and the build must follow it. Add to it as new feedback arrives. When a line here conflicts with an older line, the newer one wins and the older one is edited, not left beside it.

Related: `docs/audits/dashboard-overhaul-ui-audit.md`, `docs/audits/dashboard-overhaul-ux-audit.md`, `docs/status.md` (security items), `CLAUDE.md` (standing calls, still authoritative).

## The plan and who does what

1. Concepts (done): three per role, then a fourth, "Flow" (Focus deck plus the Workbench sidebar). Flow is the chosen direction.
2. Apply every correction in this file to the Flow boards.
3. Design the new design system (Opus 5.5). It covers components, tokens, motion, receipts and documents, naming conventions, settings behaviour, empty states, skeletons and loading moments.
4. Design the full prototype artifact (Opus 5.5): every page of every role. Admin first, then staff, then client. Each page intentional. Surgical changes only, nothing done for its own sake.
5. Implement with two Sonnet agents, carefully, everything wired to real data. Gated on tsc, eslint, build, targeted tests and responsive checks.

## Roles and pages

- Client: about 5 to 6 pages. Admin: about 7 to 8 (Blog is the agreed extra). Staff: fewer than admin.
- Staff see projects in their departments (tied to the six services) plus clients assigned to them. A permission tick grid lives in Settings. Default is the minimum.
- One work system: the workspace model replaces legacy tasks, updates and deliverables.
- Every role gets a Support page: knowledge base, tickets, issues and questions with resolution states. Model it on nomarc's support section and improve on it. The client portal also carries the Jotform widget, bottom right.
- Messages is its own well-designed page: conversations with the team on your projects, and a separate support channel.
- Project pages differ by service. Branding nuance: flyers usually get one revision or two editions, brand guides start with a discovery call, motion is priced by seconds, clients provide assets. The content calendar belongs to each project page; the dashboard only gives an overview.
- Staff do not track hours. Tasks and deliverables, as in nomarc's task panel.
- Wording: "Ask Admin first", never "Ask the owner first".
- The owner's display name is "Babatope".

## Money

- Naira first, USD and others supported. Several banks per currency. Payment methods tie to currency.
- Client payments today: Paystack and Flutterwave only. No manual bank transfer option in the client portal (the owner handles transfers by hand and can hide that). The client picks a provider, the payment initialises, then:
  - success: a receipt rolls out with the existing receipt component and animation;
  - failure or cancel: a clear fallback page with retry, switch provider and contact support, nothing lost;
  - pending or slow: a designed loading moment, never a frozen button.
- Keep the PDF look: watermark, heading, stamps, tables.
- Every figure on a dashboard must be calculated from persisted truth and add up. "Get the calculations right."

## Layout and responsiveness

- Responsiveness is extremely important. Test at 320, 390, 834 and 1440, both themes. Measure, do not guess.
- Headlines and card titles use the width they have. No `text-wrap: balance` squeezing a title into a narrow column ("Kora Logistics / owes ₦850,000" was wrong).
- Stacked buttons are full width. Side by side only when they fit.
- Deck card actions on desktop sit in one row; never a vertical stack of Snooze, Hand over and Open.
- Phone top bar: our site hamburger (two buns round a longer bar), page name, search, bell, main action. The search field fills its row where it appears.
- Sidebar: logo, pages (scroll if long), footer pinned to the bottom with install card (dismissible, it can return later on a set schedule), Tour, theme switch, collapse, profile with sign-out. Rail mode shows icons with tooltips.
- Active nav item: a SOLID fill, never an orange line or outline. Light mode: navy fill, white text and icon. Dark mode: white fill, navy text and icon.
- Bento grids, cards aligned to each other, text and icons that scale.
- Logo route choices (and similar option sets) on phones become a horizontal carousel showing about 1.2 to 1.5 cards with a slider, so the card is not a tall stack.

## Colour and controls

- NO ORANGE OUTLINES IN TEXT BOXES OR INPUTS. Ever. Not on focus, not in dark mode. Focus is shown on the field container with a neutral or navy ring. This has been raised more than once; it must not come back.
- Hover states are designed for every control: dark-card buttons turn white with navy text; white buttons take another solid fill; rows, tabs, pager buttons and menu items take a solid fill.
- The deck card's primary action uses a proper fill colour, not plain white, and its hover is a stronger action fill (green for doing it).
- Close crosses and sign-out turn red with white on hover.
- Solid fills for tags, chips, badges and icon tiles (CLAUDE.md rule).
- Real platform logos for Instagram, Facebook, TikTok and others, never letter chips.

## Lists, tables and pagination

- Every list paginates. Default 5 items per page. Items-per-page menu. "View all" when there are more than 5.
- Pagination is centred in its card and never floats out of it.
- Tables stay tables on every screen, first column pinned, sideways scroll inside the box.
- Clicking anywhere on a table row opens that item. Row ⋮ menus for actions.
- Tabs: the selected tab must visibly switch (a bug was seen where content changed but the tab did not). Tabs and their content animate.
- Searches animate their results.

## Side sheets, bottom sheets and dialogs

- No centred pop-up dialogs. Desktop uses a side sheet; mobile uses a bottom sheet. This includes confirmations.
- Bottom sheets can be dragged by the grab handle up or down (snap points, drag to dismiss). Footer buttons stay pinned while the content scrolls.
- Scrolling inside a sheet never scrolls the page behind it (scroll containment, no scroll chaining, background locked).
- Sheets are realistic, not templates: real actions inside them (approve each post, tick a checklist item, pick a match, preview a file), with selectable items where a choice is made.
- Small menus that get cut off on phones (Snooze, Hand over and similar) become bottom sheets on mobile.
- Sensitive actions confirm, with nuance: some confirm, some get an Undo window, some neither. Irreversible ones also need "I understand". Approving a post confirms.
- Files open with a real preview inside the app (PDF and image), with download and print.
- Posts can be previewed and acted on individually: comment, request changes, approve.
- A small confirmation opened from a sheet (approve one post, ask a question) returns to that sheet when it is done. A confirmation that finishes the task closes the whole stack.
- A toast never covers an open sheet's buttons: beside a side sheet it centres in the space left; above a bottom sheet it moves to the top.

## Motion

- Micro animations, count-ups, interactive charts, subtle framer-like motion, bento cards that arrive, tabs and search that move.
- Use the site's SVG line-drawing technique (pathLength 1, draw once) where it adds meaning.
- Taking an action on a deck card plays a rich transition: a stamp that confirms the action, a directional exit, the next card rising from the stack. Keep improving it, do not swap it for something simpler.
- Clearing the whole deck plays the site's existing confetti (components/onboarding/confetti.tsx), then the check appears.
- Loading moments for slow actions (payment initialising, PWA install) are designed, beautiful and short.
- Respect reduced motion. Transform and opacity only for decorative animation.

## Tour

- "Tour this page" opens a chooser: tour this page or full walkthrough.
- Model the behaviour on React Joyride as used in litchconsulting: scroll to target, scroll offset, spotlight on the target, placement that adapts, block interaction outside the target, the tooltip follows the page as it scrolls so target and card stay visible together.
- Spotlight: a white, subtly flowing shimmer ring traces the target's edges; no orange outline. Blur and dim everything else.
- The tour card never overlaps or crowds the target, and nothing touches the edges awkwardly. A target taller than the screen is spotlit only where it is visible.
- The tour card can use animated SVG illustrations instead of plain step counts.
- Keyboard: arrows and Esc. Persist completion per user and tour version.

## Empty, loading and error states

- Every page has a proper skeleton that matches its final geometry, in both themes.
- Empty states are very important: a short explanation, a friendly visual, one clear next action. Distinguish empty, filtered no results, loading, error and no permission.

## UX thinking

- Every action has its follow-through. "Draft quote" opens the real quote flow (or saves a draft and says where to find it); "Set follow up" asks when and how and creates it. Think through the tens of nuances and make everything connect.
- Toasts confirm what happened and where to find it. External messages send after a short countdown with Undo.
- Something already confirmed in a sheet (a quote sent, a reminder sent) does not offer Undo afterwards; the confirmation was the safeguard. Undo is for quick actions taken without one. Undo toasts stay 8 seconds, plain toasts 5, both with a visible timer.
- Payments: Paystack or Flutterwave, chosen in the sheet. Initialising shows its steps; success rolls out the receipt and plays the confetti; a decline says nothing was taken and offers the other provider or help. Closing mid-payment keeps checking and emails the result. A paid invoice cannot be paid twice.
- Notifications: email matters most because many clients never sign in; PWA push and in-app as well, all switchable by the recipient.
- Gates: Core Web Vitals, accessibility, SEO, agentic browsing.

## Prototype source

- Colour tokens use the codebase's admin names (`--ad-bg`, `--ad-panel`, `--ad-ink`, `--ad-tone-*`), so the prototype, the design system and `components/admin/admin.css` share one vocabulary. Orange text in light mode is `#b84a00` (4.9:1 on the page ground); `#c95000` fell to 4.2:1 there.
- Primary navigation stays at six pages per role plus the owner's Blog. Support sits in a second nav group in the sidebar for every role, so it is always one tap away without breaking that rule.
- Document numbers follow the code: invoices `INV-26-XXXXXX`, quotes `EST-2026-NNN` (called Quote in the interface), receipts `RCT-2026-NNN`.
- The design system artifact is built from `docs/dashboard-overhaul/design-system/` (`make.py` turns the kit into tokens, the stylesheet and component previews).

- The boards are built from one shared kit in `docs/dashboard-overhaul/kit/` (styles, shell, sheets, behaviour) plus a module per page, assembled by `build.py`. A correction goes into the kit once and lands on every page. The implementation follows the kit's patterns, not its prototype data.
