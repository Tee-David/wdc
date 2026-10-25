# Dashboard overhaul: the owner's preferences

The running ledger of every decision and preference the owner gave during the dashboard overhaul (October 2026). The final design system, the full prototype and the build must follow it. Add to it as new feedback arrives. When a line here conflicts with an older line, the newer one wins and the older one is edited, not left beside it.

Related: `docs/audits/dashboard-overhaul-ui-audit.md`, `docs/audits/dashboard-overhaul-ux-audit.md`, `docs/status.md` (security items), `CLAUDE.md` (standing calls, still authoritative).

## The plan and who does what

1. Concepts (done): three per role, then a fourth, "Flow" (Focus deck plus the Workbench sidebar). Flow is the chosen direction.
2. Apply every correction in this file to the Flow boards.
3. Design the new design system (Opus 5.5). It covers components, tokens, motion, receipts and documents, naming conventions, settings behaviour, empty states, skeletons and loading moments.
4. Design the full prototype artifact (Opus 5.5): every page of every role. Admin first, then staff, then client. Each page intentional. Surgical changes only, nothing done for its own sake.
5. Implement with two Sonnet agents, carefully, everything wired to real data. Gated on tsc, eslint, build, targeted tests and responsive checks.

Model rule, binding (updated 2026-10-11): the remaining prototype pages, for every role, are built by the main session on Sonnet, following the flow and standard set on Opus (the Flow home and the rebuilt Clients page). No agents for design. The main session builds every screen and artifact itself. Never launch parallel agents. If agents are ever approved again: at most 1 Opus agent, at most 2 Sonnet agents, model set explicitly on each. Spend usage carefully; the owner manages session limits.

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
- The design system artifact is built from `plans/dashboard-overhaul/design-system/` (`make.py` turns the kit into tokens, the stylesheet and component previews).

- The boards are built from one shared kit in `plans/dashboard-overhaul/kit/` (styles, shell, sheets, behaviour) plus a module per page, assembled by `build.py`. A correction goes into the kit once and lands on every page. The implementation follows the kit's patterns, not its prototype data.

## Standing direction for the page prototypes (owner, 2026-10-11)

- Every page is built to the standard of the approved Flow home: the Focus idea, colours, fields, buttons, pagination and components. Nothing generic. This is an overhaul, so each page has to be clearly better than what exists today.
- Plan each page the way the home was planned: anticipate the next step, think through UX and UI, and leave no dead ends and no gaps. Every flow is wired end to end.
- Projects differ by service. Branding and design, social media management, SEO, web development, custom development and app development each need their own stages, deliverables, approvals and pages. Project and client screens must handle all of them, not just one.
- Work happens in the artifacts only. Nothing goes live until implementation is approved.
- Each finished page is published to the canvas artifact (https://claude.ai/artifact/1HG99eCtChsHCLyTnh7iEQ, row "Overhaul pages") as it is done. Show the owner the artifact, not screenshots. Screenshots are only for my own verification.
- Responsive at phone, tablet and desktop in both themes, following the design system (https://claude.ai/artifact/XRhmw3yngg9bTxBzim5zLr) without deviating.
- Tables and lists: the row and its ⋮ are two separate touch areas. Tapping the row opens the item. Tapping the ⋮ opens its options and must not light up the row. The ⋮ shows its own press and stays pressed while its menu is open (`aria-expanded`). Row hover only applies on devices that can hover, so a phone never keeps a row highlighted after a tap.

## Prototype data rules (added 2026-10-11)

- The prototype's "today" is Saturday 10 October 2026. Every weekday name next to a date must match the 2026 calendar (13 October is a Tuesday, 1 November is a Sunday). The prototype once used a calendar where 13 October was a Monday, and the sweep that fixed it is the reason this line exists.
- One set of money figures across every page. Outstanding is overdue plus issued invoices not yet paid; scheduled invoices (a milestone, a retainer, a dollar deposit) are not counted until they go out. October collected is the sum of the paid invoices and matches the by-service breakdown. A matched bank transfer moves the invoice to Paid everywhere.
- Projects differ by service, so the project page has a service tab with its own content: Branding has rounds and what the client provides, SEO has rankings and reports, Websites have pages and launch checks, Apps have builds and the store release, Software has milestones and demos, Ads have the campaign. Social projects use the content calendar. Staff and clients see the same page with the owner's money removed or reworded.
- Staff see no amounts, only chips (Deposit paid, Awaiting payment, Retainer). Ad spend and cost per lead are campaign data, not invoice amounts, so staff may see them.

## Tools, lists and settings rules (added 2026-10-11)

- Searchable select everywhere a list is chosen from: five at a time, live search that matches words, and an inline "Add a new client" that checks for an existing email or phone before it creates one. One record and one portal per person.
- Every table and list has Filters, Export (CSV or Excel, all, filtered or selected), bulk select with a bar of actions, and Import where records can be brought in. Import is always a review step: matched, repeated and invalid rows are shown before anything is saved. A sample file can be downloaded.
- Sheets can be resized from the edge on desktop and dragged down to close on phones. Footers wrap; a disabled primary says why beside it. Closing a sheet with unsaved text asks first.
- Dates, times and date with time use the site's own pickers. Media fields take pictures and video with a real preview.
- Projects can be paused and resumed with a reason. A paused project shows a banner everywhere, hides its tasks from staff and is flagged in lists.
- Settings: every tab has its own Save bar and a dot on the tab when something is unsaved. Rows that need checking (a bank account, a domain, a sender) have a Verify step. Bank accounts verify the account number, resolve the name from the bank and use per-currency fields.
- Help centre categories and articles are managed in Settings and shared by the admin, staff and client help pages.
- Messages: reply by swipe or the reply button, tag, star, search inside a thread, a per-client gallery of pictures, files and links, a clearer attachment strip and multi-recipient new messages.
- Hub pages (Email, Enquiries, Meetings, Reconciliation, Notifications) share one layout: the deck, a tabbed table with filters, export and bulk actions, and a rail. They sit under the parent they belong to in the nav (Email under Messages, Enquiries under Clients, Meetings under Projects, Reconciliation under Money, Notifications from the bell).
- Every project opens its own detail page, shaped by its service (branding, social, web, SEO, apps, software). The page takes its stages, tasks, next steps and people from the project row, so a flyer job never shows a website's launch checklist. Services beyond these are created in Settings, Services, with their own stages, deliverables, client checklist and project page sections.
- The project board is a real board: drag a card between columns (Starting or blocked, In progress, With the client, Handover and reporting, Done) or use the card's menu on touch and keyboard. A move changes the project's stage and status, shows a toast with Undo, and Done asks first.
- Invoices and quotes are one document page with a view mode and an edit mode: client, project, dates, currency, lines (typed or from a price list, five at a time with search), VAT, discount, notes and terms, a live copy of what the client sees, and a readiness checklist. After sending: record a payment (searchable list of open invoices, five at a time), refund, remind, cancel, edit while unpaid, reconcile against the bank. Quotes can be accepted, declined, edited and resent, and turned into the deposit invoice.
- Navigation adds two top level pages for the admin: Marketing (campaigns, a calendar of sends, automations, blog posts and social posts, templates, contacts) and Forms (entries, forms and builder, subscribers, links). This supersedes the earlier "six pages plus Blog" limit, at the owner's request on 2026-10-11.
- Settings gains Services (create and edit services and their sections), Teams (next to Departments) and Lists and categories (blog categories and tags, expense categories, file folders, lead sources).

- 2026-10-12: Do not touch the sign-in, reset or invitation pages or the public invoice, quote and receipt pages. They keep their QR code, centred watermark and stamp. Reports filters and any list of five or more items use searchable dropdowns; Reports cards are one per row on phones and two per row on desktop. Meetings: the admin picks the exact date and time to offer, not only suggested slots. Every screen must be wired end to end: no control may open a missing or broken screen.

- 2026-10-25 retainers: billing is chosen per client (whole term up front, monthly or quarterly). When one falls due the system drafts the invoice on Today and asks; nothing is emailed without Admin pressing Send. A retainer tracks systems covered (each with notes, access owner, renewal date), included work per period, costs passed on (VPS, database, API credits) and a monthly report. Realtors' Practice: six month retainer, maintains the scraper app, the website (complete) and the VPS.
- 2026-10-25 social media client emails: posts ready to approve (one email per batch), reminder when approval is late, post published with its link, monthly results report.
- 2026-10-25 people and approvals: Admin and department leads assign work; staff can hand their own task over. A project has several equal owners. A silent client gets reminders and then a card on Today; nothing is ever approved on their behalf. Staff are told in the app plus one daily email.

## 2026-10-25 (responsive pass)

- Segmented controls never overflow: equal columns that shrink, long labels wrap; on a phone a view switch (List, Board, Timeline, Calendar) shows icons only.
- The registration number field follows the body picked: Business name number (BN), Company number (RC), Trustees number (IT), SMEDAN number, Membership number. BN and RC are different numbers.
- Customise on Today is an icon on the left of New project, on one row on a phone.
- Any pick from five options up is a searchable dropdown, never a wall of chips with a search box above it (filters, forms, the invoice builder's project).
- Every bottom sheet on a phone drags down to close, including menus, pickers, the date range, the per-page menu and notifications.

## 2026-10-25, Messages landing (owner: "compare it to WhatsApp", simpler without losing features)

- The conversation list is the page: one search pill, one row of filters (All, Unread, Waiting on us, Clients, Projects, Team, Pinned), Archived as a quiet row at the top of the list. No "Conversations" card head, no second row of tabs.
- New message is a round + on a phone, labelled on wider screens. The lede appears only when a client is waiting; a quiet inbox has no sentence.
- On a phone the list sits edge to edge with no card, and nothing is lit until a conversation is opened. On a wide screen the conversation being read is a soft solid fill, not navy.
- Each row is two lines: name and time, then the context (question, client or Team) with the last message, the Waiting tag, the unread dot and the pin. Unread rows are bold with an orange time.
- The chat list shows 20 before it pages, and the pager only appears past 5.
- Case studies: buttons run full width on a phone; the public site scrolls itself without end and pauses on hover or touch, with no caption explaining it; "Look through screens" carries no count.
- Conversations behave like WhatsApp without copying it: swipe or hold a message to reply with a quote that jumps back, unread counts in a solid badge, read ticks where reading is recorded (team chats), a pill composer with a round send, pictures and files with captions (grid with "+N", full-screen viewer, document cards), an attach menu of Photos and video, Camera and Document. No favourites (Pinned covers it) and no bottom tab bar (the drawer rule stands).
- A record's head stays uncluttered (owner, 2026-10-25): the name, one short line and only exception pills (Overdue, Archived). Contact details, since, portal access, services and tags live in a details sheet behind an info button. The actions stay on one row on a phone; a long label gets a short one below 420px.
