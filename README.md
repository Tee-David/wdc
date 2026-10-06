# We Dig Creativity

The studio's website, the studio admin and the client portal, in one Next.js app (`frontend/`). "We Dig Creativity" means we **love** creativity; nothing in the product illustrates digging.

- **Run it:** `cd frontend && npm install && npm run dev` (port 3000). The repo-root `.env` is loaded by `frontend/next.config.ts`.
- **Database:** `npm run db:migrate` applies `frontend/db/migrations/` in order. On production the owner can also apply pending migrations from **Settings › System › Database schema**.
- **Tests:** Playwright specs in `frontend/tests/` (`npx playwright test <name>`). Most need a database and `BONEYARD_CAPTURE_TOKEN`; each spec says what it needs at the top.
- **Rules for anyone changing the code, people and agents alike:** `AGENTS.md`. Current work: [docs/status.md](docs/status.md).

---

## Repository and infrastructure

| Directory | Purpose |
| --- | --- |
| [frontend](frontend/README.md) | Running full-stack Next.js app: website, admin, portal and API |
| [backend](backend/README.md) | Reserved directory; server architecture guide, no separate service |
| [docs](docs/README.md) | Maintained product and operational documentation |
| plans | Active Meetings and Users/roles proposals |
| prototypes/cal-meetings | Sample-data design preview, not live scheduling |
| .agents/skills and .claude/skills | Project skills, including the owner-provided Motion Studio workflow |

Use the frontend guide for environment boundaries, persistence, provider integration, tests and deployment. Production migrations remain owner-managed through Settings › System. A successful Git push is not live deployment evidence. Retired mockups and handoff material remain in Git history where previously tracked.

## Design system

One system for everything we ship: the public site, the admin and the portal. The interactive reference, with every component live in light and dark, is the **Design System artifact**: https://claude.ai/artifact/Xa6aPYNrgVhJnyHnkbu93c. This section is the short version. When the two disagree, the code and this file win, and the artifact gets updated.

The [Meetings design preview](prototypes/cal-meetings/README.md) renders the current admin shell, Panel, DemoNote, logo and Lucide icons directly from these components. It is a proposal with sample data, awaiting review; it does not implement scheduling.

Users under Settings reuses `Panel`, `ad__t`, `RowMenu`, `BulkBar`, `PickAll`, `RowPick` and `Pager`. Reviewed bulk outcomes appear in the shared dialog; the Person column stays pinned, and filters/page size remain in the URL. Recipient-owned account-change email preferences use the shared Settings save bar.

Public custom forms reuse SelectField and the lazy searchable PhoneField used by Contact. lib/phone.ts normalizes numbers to E.164 and enforces Nigerian national length; custom answer checks, Contact submission and its server endpoint share it. Choice keyboard focus belongs to the whole label, without a second input shadow. Users group tabs reuse ad__tabsNav and its shared panel spacing.

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

- **Design direction:** Space Grotesk for headings and prominent numbers; Outfit for body and controls. Current runtime configuration aliases body text to Space Grotesk in `frontend/app/layout.tsx` and `frontend/app/globals.css`. Match that runtime in previews; changing it requires an explicit design-system update.
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
- **Header:** one bar at every width: the logo on the left, "Start a Project" and the menu button on the right. The menu icon is the hot dog: two buns round a longer sausage (`.sm-burger` in `components/ui/staggered-menu.css`; the same drawing as an SVG in `components/admin/nav-drawer.tsx` for the dashboards' phone drawer), turning into an X when open. The links, theme switch, accessibility and log in all live in the menu. On a phone it is the staggered panel (`components/ui/staggered-menu.tsx`); from 768px up the same button opens a **film strip** (`components/ui/film-strip-menu.tsx`, the owner's pick from the WDC Menu Concepts canvas): six frames, one per page, each a real picture of that page (`public/menu/`, made by `frontend/scripts/menu-previews.mjs`: re-run it when one of the six pages is redesigned), run through a gate with sprocket holes. Drag, scroll, the arrow keys or the bars move the reel; the frame in the gate opens its page, zooming that same picture to fill the screen while the page loads. It is a layer under the header (z-115 against the header's 130 while open), loaded only on first use, and only mounted at desktop widths; `tests/film-menu.spec.ts` pins the 767/768 line. The bar is a rounded pill inset from the top and sides (`.hd-bar`): clear over a dark hero, frosted glass once the page scrolls or wherever there is no dark hero (white at 74% in light, navy at 66% in dark, solid under reduced transparency). Only fill, edge and shadow change, so it never moves. Over a dark hero the menu button is a glass disc.
- **The homepage hero is the film** (`components/sections/hero.tsx`): the 30-second showreel full-bleed under a navy shade anchored to the copy, the headline bottom left (centred, and on one line, on a phone), the black/white pair, and a chapter bar naming the six services as the film reaches them (a glass strip of clickable chapters on a desktop; on a phone, progress bars and play/pause in one row under the buttons, with nothing over the film). The poster is the LCP; the video is attached after `load`, never under reduced motion or Save-Data, and pauses off screen. Posters come from `frontend/scripts/hero-film-posters.sh`, and a re-cut film gets new filenames (`-v2`, `-v3`) because the service worker never revalidates a cached image. Over it a phone shows the mark plus a glass menu (`<Header overHero markOnlyOnPhones />`). The tool rail sits directly under the hero.
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
| A read-only client support view | `SupportBanner`, `SupportReadOnly`, `ClientSupportButton` (`components/client/`) | Owner-only, reason-required and limited to 15 minutes. The original owner session stays intact. Shared forms and payment controls explain their disabled state; server guards enforce it. The persistent banner offers Exit, including when the view expires or cannot be verified. |
| A one-time code | Six boxes over one input (`components/account/password-change.tsx`) | Paste and autofill work. The sixth digit submits. A refusal shakes the boxes. |
| A file from the library | `MediaPicker` (`media-picker.tsx`) | Search, folder, grid; a picture's description is asked for there and saved back to the file. Used by the blog cover and the editor's Picture and Video panels. |
| Files uploaded in an admin form | `FileDrop` (`file-drop.tsx`) | The standard dashed WDC dropzone: one real native input across the whole panel for click, keyboard and drag-and-drop. The owning form keeps its own type, count and storage rules. |
| Files attached to a form entry | `EntryAttachments` (`forms/entry-attachments.tsx`) | Up to four files use the responsive grid. Five or more use a keyboard-focusable native sideways rail with a partial next card, contained by its panel at every width. Long names ellipsize and never widen the page. |
| Files attached to a project deliverable | `DeliverableUpload` (`delivery.tsx`) | Upload one or more media-library files and/or add a link. The record keeps validated R2 keys, so the portal can offer signed Open and Download actions. |
| Move between form entries | `.adEntryNav` in `forms.css` | Inline on wider screens. On phones the position is centred above two equal-width Previous and Next controls, with the page-tour control on its own full-width row. |
| Change a team member's name | `MemberControls` (`settings/team-controls.tsx`) | Owner-only dialog on Team and roles. The signed-in person changes their own name on My account, linked as “Your name and password” from the avatar menu. Both paths toast and audit the saved name. |
| Choose a project icon | `IconPicker` (`icon-picker.tsx`) | Keyboard radio grid with a solid preview and Shuffle control. On phones the explanatory hint takes its own full-width row below them. |
| Ask before acting | `ask()` / `confirm` (`confirm.tsx`) | Never `window.confirm`. Anything that "cannot be undone" also needs "I understand". |
| Say it worked | `toast()` (`toast.tsx`) | Every save, update, toggle and bulk action. Undo when it can be undone. |
| Loading | `Skeleton` | Shaped like the real screen, never invented data. |
| Nothing here | `AdminState` / `EmptyScene` | Empty, filtered-to-nothing, error and no-permission are different screens, each with one next step. |

- **Deletion is two steps:** Move to Trash (reversible), then Delete permanently from the Trash (owner only, behind "I understand").

### Motion

- **Easing:** everything eases out; things travelling between two rests ease in and out.
- **Speeds:** hover and press are quick. Menus and calendars rise 4px and fade in. Sheets slide up in 240ms.
- **Screens arrive in order:** the head first, then blocks a beat apart. KPI figures count up (`count-up.tsx`, `.adCountUp`) and bars grow from their baseline. The server always renders the real value first; the KPI class is deliberately separate from Settings' `.adCount` field counter so route-persistent CSS cannot move a figure out of its tile.
- **What moves:** transform and opacity only. Under reduced motion nothing moves. Anything off screen or in a hidden tab pauses. One-shot celebrations keep their final invisible frame until their finish events remove the layer; cleanup must not rely only on the `Animation.finished` promise.
- **Hero motion:** ten pieces and three ways to put them in the homepage hero, in the Hero Motion artifact (https://claude.ai/artifact/VtKhKJkgMBSgop26cphUPv). The CTAs never wait for the motion.
- **Payment receipt printer** (`components/money/receipt-printer.tsx`, on `/pay/done` after a verified payment): EasyUI's Payment Receipt Printer (MIT) in our colours: a dark navy stage holding the status card (green tick ring) and printer, a clean white slip with side notches and torn teeth, monospace rows with colon labels, the invoice's real lines and totals, Paid as the one large figure, a decorative barcode over the real receipt number, Replay and Copy. Lights blink orange while printing or feeding and turn green when ready. A long slip scrolls inside its own window (capped to the screen, with a fade while there is more below) so the printer and its buttons always fit on screen, and carries a "Pull for more" paper tab: drag it to pull paper out, or tap it to feed the rest out. Demo: https://claude.ai/artifact/7imA4UHPz53kxRiakVSWVk. CSS keyframes, not an animation library; the slip feeds bottom first (`tests/receipt-feed.spec.ts`). Preview at `/dev-receipt` (dev only).
- **Hero film:** the concepts behind it (and the ones not taken) are in the WDC Hero Concepts canvas (https://claude.ai/artifact/6NMiGXyWnFTg94jUskN45S); concept 06, Timeline, is the one built.

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
