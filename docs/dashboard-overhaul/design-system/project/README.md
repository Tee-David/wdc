The WDC dashboards are three views of one studio: the **owner** (Admin), the **staff** and the **client**. They share one shell, one set of components and one vocabulary, so a person who moves from client to staff to owner never relearns anything. This system is the reference for every page of all three.

Build every screen from the tokens and components here. When a screen needs something this system does not have, add it here first, then use it. A page that invents its own button, sheet or table is the page that looks like a different product.

## Who it is for

- **Owner (Admin).** Runs the studio. Sees money, every client, every project, the team. Wants the one thing that needs them next, then the numbers.
- **Staff.** Does the work inside their departments. Sees their tasks, the clients assigned to them and the projects in their departments. Never sees amounts, only whether a deposit is in.
- **Client.** Pays, approves and receives files. Many clients never sign in, so every important thing they see here also reaches them by email.

## Content fundamentals

Write the way a calm, competent studio manager talks: short sentences, plain words, the next step first. Full voice rules, naming and number formats are in **Writing**.

- Speak to the reader as "you". The studio is "we" to a client, and people are named ("Ifeanyi replies within a working day").
- Lead with what happened and what happens next: "Paid with Paystack. Receipt RCT-2026-041 is in Billing and your email."
- Sentence case everywhere: headings, buttons, tabs, menu items. No exclamation marks, no emoji.
- A button says exactly what it does with the object it acts on: "Send final reminder", "Approve route B", "Pay ₦450,000 with Paystack". Never "Submit", "OK" or "Continue".
- No city names in copy. "We Dig Creativity" means we love creativity, never digging.
- Body text is one colour. Stress a phrase with weight (`<strong>` in `ad-ink`), never with orange or a second colour.

## Visual foundations

**Colour.** Navy `#000065` is the brand and the primary fill in light mode. Bright orange `#ff6500` is a dot, a chart series and an accent; it never carries words. Orange that carries words (a tag, a deck card's main action) is `#b84a00` with a white label, 5.23:1, in both themes. Orange text is `ad-accent-ink`. Green, amber and red are status only (`ad-tone-good`, `ad-tone-warn`, `ad-tone-bad`); a colour repeated down every row of a table is decoration wearing a reserved colour.

- Page ground is `ad-bg`; cards and sheets are `ad-panel`; insets, table heads and wells are `ad-panel-2`.
- Text is `ad-ink`; secondary text is `ad-dim`. Both meet 4.5:1 on `ad-bg`, `ad-panel` and `ad-panel-2` in both themes.
- Borders are `ad-line`; a hovered or stronger border is `ad-line-2`.
- The deck card and other dark heroes are `ad-hero` with white text and `ad-hero-dim` for secondary text.
- Tags, chips, badges and icon tiles are SOLID fills (`ad-tone-*`) with a white label. Never a tint, never alpha, never `color-mix` against transparent.
- In dark mode the primary fill becomes orange `#b84a00` with a white label, and the active nav item turns white with a navy label.

**Focus and inputs.** There is no orange outline anywhere, ever. Keyboard focus is a 2px ring in `ad-focus` (ink) offset by 2px. Text inputs show focus on their container: the border turns `ad-ink` and a 4px `ad-ring` halo appears. The browser outline on inputs is removed so it can never come back orange.

**Type.** Space Grotesk for headings, figures, numbers and document numbers. Outfit for body copy, labels, helper text and controls. Headings use the full width of their container; never balance or squeeze them. Figures use tabular numerals.

**Space and shape.** Spacing steps are 4, 8, 12, 16, 20, 24 and 32px. Cards are radius 20, the deck card 24, controls 12, tags and chips are pills. Sheets on phones have a 26px top radius. Touch targets are at least 44px; a smaller visual (an avatar in a stack) gets an invisible hit area.

**Elevation.** Three shadows, `ad-sh-1` to `ad-sh-3`. Cards use `ad-sh-1` or a border, never both heavily. Sheets, toasts and menus use `ad-sh-3`.

**Layout.** A page is a head (h1, one-line lede, the page's one action in the right slot) then a two-column layout: the work column and a rail. Below 1180px the rail drops under the work; below 640px the sidebar becomes a drawer opened from the hamburger. Tables stay tables on every screen: the first column pins, the table scrolls sideways inside its own box.

## Iconography

Icons are 24px-grid line icons drawn with a 2px stroke, round caps and joins, `currentColor` (Lucide geometry). They sit at 16, 18 or 20px. Icon-only buttons always carry an `aria-label`. Social platforms use their real marks (Simple Icons paths: Instagram `#E1306C`, Facebook `#0866FF`, TikTok black, LinkedIn `#0A66C2`, YouTube `#E00000`, WhatsApp `#128C7E`, Google Meet `#00897B`) on a solid tile of the platform colour. Payment providers use their official logos on a white tile. The WDC logo and icon come from the **Logos** assets; never redraw them.

## Sections

**Writing** has voice, words and every naming and number convention. **Patterns** has the shell, deck, sheets, menus, tables, tabs and the tour. **Money** has invoices, quotes, payments and receipts. **Settings** has how every settings page behaves. **States** has skeletons, empty states, loading and errors. **Motion** has timing and choreography. **Pages** maps every page of every role.
