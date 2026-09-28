# We Dig Creativity

The studio's website, the studio admin and the client portal, in one Next.js app (`frontend/`). "We Dig Creativity" means we **love** creativity; nothing in the product illustrates digging.

- **Run it:** `cd frontend && npm install && npm run dev` (port 3000). The repo-root `.env` is loaded by `frontend/next.config.ts`.
- **Database:** `npm run db:migrate` applies `frontend/db/migrations/` in order. On production the owner can also apply pending migrations from **Settings › System › Database schema**.
- **Tests:** Playwright specs in `frontend/tests/` (`npx playwright test <name>`). Most need a database and `BONEYARD_CAPTURE_TOKEN`; each spec says what it needs at the top.
- **Rules for anyone changing the code, people and agents alike:** `AGENTS.md`. Open work: `IMPLEMENTATION_CHECKLIST.md`.

---

## Design system

One system for everything we ship: the public site, the admin and the portal. The interactive reference, with every component live in light and dark, is the **Design System artifact**: https://claude.ai/artifact/Xa6aPYNrgVhJnyHnkbu93c. This section is the short version. When the two disagree, the code and this file win, and the artifact gets updated.

### Voice

- Write from the reader's side of the screen, in plain sentences. Say it the way the studio does: clients, projects, invoices, briefs, the portal.
- Buttons are verbs that say what happens ("Send invoice", "Move to Trash", "Leave it"). The toast says it back in the past tense ("Invoice sent.").
- A saved thing that is live is **Updated**; a draft or a new thing is **Saved**.
- Errors say what went wrong and how to fix it, with no apology.
- Sentence case, except eyebrows and table heads (uppercase, tracked).
- No city names in copy. No emoji in the product.
- Money is in naira with ₦. Use short figures on dashboards ("₦2.1m") and full figures in tables and documents. Dates are in words ("9 Oct 2026"), never 09/10.

### Colour

| Role | Token | Light | Dark |
|---|---|---|---|
| Brand surface (bands, heroes, icon tiles) | `--band` / `--ad-navy` | `#000065` | `#0a0a3a` band |
| Accent with no words on it (dots, rules, bars, rings) | `--accent` | `#ff6500` | `#b84a00` |
| **Orange that carries words** (chips, tags, badges, active rows) | `--accent-fill` with `--on-accent` | `#b84a00` + white, 5.23:1 | same |
| Orange as text on paper | `--accent-ink` | `#c95000` | `#ff6500` |
| Orange as text on a band, hero or footer (dark in both themes) | `--on-band-accent` | `#ff6500` (5.99:1) | `#ff6500` (6.37:1) |
| Admin primary button | `--ad-fill` / `--ad-on-fill` | navy + white | `#b84a00` + white |

- **Type is never `var(--accent)`.** It is `#ff6500` in light and `#b84a00` in dark, which fails as type in one theme or the other. Use `--accent-ink` on paper and `--on-band-accent` on the dark bands; `tests/orange-text.spec.ts` measures every orange word on the public pages in both themes.
- **Words never sit on the bright orange.** White on `#ff6500` is 2.95:1. Any orange with a label is `--accent-fill` with a white label, in both themes.
- **Copy is one colour.** Stress a phrase with weight, not with orange or a second colour.
- **Status, tags, pills and icon tiles are SOLID fills,** never tints: `--ad-tone-good | warn | bad | live | neutral | brand | flat`, each with its `--ad-on-*` label. Status also carries a word, so it is never colour alone.
- **Every pair is measured:** text 4.5:1 on its ground, and a control's edge 3:1 against what it sits on, in both themes.
- **Lines are solid colours where they carry a form.** The contact card restates `--rule` solid; a 12% navy wash made its fields vanish.

### Buttons

- **Public site:** the black-and-white pair (`--btn-fill`, `--btn-ink`), inverted on every dark ground. The pair swaps on hover. Orange is never a button fill. The one exception is the invoice Pay button: white on `#b84a00`.
- **Admin and portal:** one primary per area (`--ad-fill`); everything else is secondary.
- **Words or no words:** a button with words takes the pair. Icon-only chrome (close crosses, ⋮, rail arrows) stays quiet.
- **Irreversible actions:** solid red (`--ad-tone-bad`), always behind the confirm dialog.

### Type

- **Space Grotesk** is for headings, KPI figures and prominent numbers. **Outfit** is for everything else, controls included. Both are self-hosted.
- **Admin scale:** page title 30/600, panel title 16.5/600, figure 30/700, UI 14, label 13.8/600, hint 12, table head 11.5 uppercase.
- **Numbers:** tabular numerals wherever figures line up or count.
- **Phones:** fields use 16px text, so iOS does not zoom into them.

### Layout

- **Targets:** 44px minimum (buttons, fields, options, menu items, calendar days on touch).
- **Radii:** 12px for controls, 18px for panels and dialogs, full rounding for pills.
- **Spacing:** 8px between buttons, 12px between fields, 20px panel padding, 24px between panels.
- **Tables stay tables on every screen:** the first column is pinned, and the table scrolls sideways inside its own box. The page body never scrolls sideways.
- **Nothing widens the page at 320px:** every text-bearing flex or grid child has `min-width: 0`.
- **Public page shape:** every landing page opens with the `wk-hero` navy band (eyebrow, h1, lede). Cards share one track: `minmax(min(100%, 20rem), 1fr)`.
- **Settings overview:** one column of full-width panels, in the order of the side list.

### Components (admin and portal)

All of these live in `frontend/components/admin/`. The public site has its own onboarding picker (`components/onboarding/`).

| Need | Use | Notes |
|---|---|---|
| Choose one of a list | `Pick` (`pick.tsx`) | Searchable above ten options; type-ahead otherwise. A bottom sheet on phones. Lists own their native vertical scroll; touch movement never changes the keyboard-active row. Posts a hidden input. |
| Choose several onboarding answers | `FieldView` multi cards (`components/onboarding/onboarding-form.tsx`) | Checkbox cards store a list. Older one-string drafts normalize on read. Project-update channels start with “Your client portal” checked, and the client may add or remove channels. |
| A select in a GET filter row | `FilterPick` | Named by its label only. |
| A date | `DateInput` | Monday-first month grid. The title opens a month grid, then a 12-year grid. Arrows, Page Up/Down, Home/End, Today, Clear. Shows "Mon, 14 Sep 2026". Posts `YYYY-MM-DD`. |
| A date and a time | `DateTimeInput` | Quarter hours; posts `YYYY-MM-DDTHH:MM`. |
| A date range filter | `DateRange` (`date-range.tsx`) | Presets first, then a custom pair of calendars. |
| A form | `Form`, `Field`, `Select`, `Radios`, `Checks`, `Submit` (`form.tsx`) | Hints go under the input. A failed submit keeps what was typed. The toast is raised as the action answers. |
| A one-time code | Six boxes over one input (`components/account/password-change.tsx`) | Paste and autofill work. The sixth digit submits. A refusal shakes the boxes. |
| A file from the library | `MediaPicker` (`media-picker.tsx`) | Search, folder, grid; a picture's description is asked for there and saved back to the file. Used by the blog cover and the editor's Picture and Video panels. |
| Files attached to a form entry | `EntryAttachments` (`forms/entry-attachments.tsx`) | Grid on wider screens; a sideways rail contained by its panel at every phone width. Long names ellipsize and never widen the page. |
| Ask before acting | `ask()` / `confirm` (`confirm.tsx`) | Never `window.confirm`. Anything that "cannot be undone" also needs "I understand". |
| Say it worked | `toast()` (`toast.tsx`) | Every save, update, toggle and bulk action. Undo when it can be undone. |
| Loading | `Skeleton` | Shaped like the real screen, never invented data. |
| Nothing here | `AdminState` / `EmptyScene` | Empty, filtered-to-nothing, error and no-permission are different screens, each with one next step. |

- **Deletion is two steps:** Move to Trash (reversible), then Delete permanently from the Trash (owner only, behind "I understand").

### Motion

- **Easing:** everything eases out; things travelling between two rests ease in and out.
- **Speeds:** hover and press are quick. Menus and calendars rise 4px and fade in. Sheets slide up in 240ms.
- **Screens arrive in order:** the head first, then blocks a beat apart. KPI figures count up (`count-up.tsx`) and bars grow from their baseline. The server always renders the real value first.
- **What moves:** transform and opacity only. Under reduced motion nothing moves. Anything off screen or in a hidden tab pauses. One-shot celebrations keep their final invisible frame until their finish events remove the layer; cleanup must not rely only on the `Animation.finished` promise.
- **Hero motion:** ten pieces and three ways to put them in the homepage hero, in the Hero Motion artifact (https://claude.ai/artifact/VtKhKJkgMBSgop26cphUPv). The CTAs never wait for the motion.

### States

- **Focus:** a 2px ring, 2px offset (`#c95000` in light, `#ff6500` in dark).
- **Disabled:** solid flat fill and dim text, never faded, with the reason and the fix beside it.
- **Busy:** the label stays, the icon becomes a spinner, and a second press is blocked.

### Icons

- **Style:** Lucide, 18px in controls, 2px stroke, `currentColor`.
- **On a solid tile:** a white glyph. In menus: dim. In a destructive item: red.
- **Labels:** an icon goes before its label. An icon with no label has an `aria-label` naming the action and the record.

### Security that shapes the UI

- **New passwords** need 8+ characters with a capital, a small letter, a number and a symbol. They are refused if they appear in a known breach (Have I Been Pwned, k-anonymity; fails closed).
- **Addresses:** temporary inboxes and anonymous mail services are refused at every public form and on invitations (`lib/email-domains.ts`).
