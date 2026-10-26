# Patterns

## The shell

Every page of every role sits in the same shell: **Sidebar** on the left, **TopBar** across the top, the page in `main`.

- Sidebar: logo and workspace name, the primary nav, a second group with Support, then a footer pinned to the bottom with the install card (dismissible), Tour, theme switch, collapse, and the profile row with Sign out. The footer never scrolls away.
- The active nav item is a solid fill: `ad-nav-on` with `ad-nav-on-ink` (navy with white in light, white with navy in dark). Never an outline or an orange line.
- Collapsed rail at 900px and below shows icons with tooltips. Below 640px the sidebar is a drawer opened by the hamburger; there is no bottom tab bar.
- TopBar: hamburger (phones), page title (phones), search (`Ctrl K`), notifications bell, then the page's one action (for example New on the owner's Today).

## The deck

The home page of each role leads with a deck: one card at a time, the thing that needs this person most.

- The card shows kind and urgency tags, a short title that uses the card's full width, one sentence of body, two or three facts, and a "why" line when it helps decide.
- Actions: one primary (solid `ad-act`, turns green `ad-act-hover` on hover with a lift), one secondary (outline), then Snooze, Hand over and Open details as tools. Tools sit in one row on desktop; at narrow card widths they lose labels, then go full width. They never stack vertically on desktop.
- Every action has real follow-through. "Draft quote" opens the quote; "Set follow up" asks when, how and who; "Call" logs how the call went; a send counts down 8 seconds with Undo.
- Taking an action stamps the card from the button you pressed, draws its mark, and sends the card away in a direction that means something (done lifts, send flies up-right, snooze drops, hand over slides right). The next card rises from the stack.
- Clearing the last card plays the site's confetti, then the empty state's check draws in.

## Sheets, never centred dialogs

- Desktop: a side sheet from the right, 480px, or 720px for wide content (quotes, file previews). Phones: a bottom sheet with a grab bar.
- Header (back when stacked, icon tile, eyebrow and chip, title, close) and footer (primary, secondary, the disabled reason) stay put; only the body scrolls, and it never scrolls the page behind.
- Bottom sheets drag: down past a threshold closes, up expands to full height, otherwise they spring back.
- Sheets stack. A confirmation opened from a sheet is pushed; Cancel returns to it. A small confirmation (approve one post, ask a question) returns to the sheet it came from when done; a confirmation that finishes the task closes the whole stack.
- Sheets are real: selectable lists (radio), checklists with actions on each row, compose areas with "Team only / Client sees it", file and post previews, the quote builder, the payment flow.

## Menus

A small menu is a popover anchored to its button on wide screens and a bottom sheet on phones. Long lists get a search field. Menus close on outside click and Esc.

## Lists, tables and pagination

- Every list pages at 5 items by default, with 5, 10 or 20 per page, and View all.
- Clicking anywhere on a table row opens the item; the row's ⋮ menu holds its actions and does not open the row.
- Tabs draw their own underline under the selected tab, so the tab and its content always change together.
- Filtered-no-results is its own state, with a Clear search button.

## Search and notifications

- Search (`Ctrl K`) opens a palette grouped by kind (Go to, Clients, Projects, Invoices, Files), keyboard first.
- The bell opens a panel with All and Unread, Mark all read, and the install prompt.

## Toasts

Bottom centre, dark, with a visible timer: 5 seconds, or 8 when it carries Undo. A delayed send shows a countdown with Undo. A toast never covers an open sheet's buttons: beside a side sheet it centres in the remaining space; over a bottom sheet it moves to the top.

## The tour

"Tour this page" opens a chooser: tour this page or full walkthrough. Each step scrolls its target into view with an offset, spotlights it with a white flowing ring, dims and blurs everything else, blocks clicks outside, and places the card where it fits without covering the target. The card follows the page as it scrolls, has an animated icon, a progress bar, Back and Next, arrow keys and Esc. Completion is kept per person and tour version.
