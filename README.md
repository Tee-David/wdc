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

`CurrencyBalances` shows separate persisted currency totals using the shared table and panel. `PaymentAccounts` uses the Settings save bar and existing form controls; controlled `Field`, `Area` and `Select` values support repeatable rows. `DocumentControls` provides print and server PDF download. Financial PDFs repeat the onboarding watermark and branded table headers. NGN/USD amounts are integer minor units and are never implicitly converted.

Client workspaces live inside the existing project record pages. `components/workspace/project-workspace.tsx` composes the shared Panel, Tile, Dialog, FileDrop and form controls; service records use the same admin tokens and typography. Review opens the actual shared version with its notes and decision history. Work tables keep a pinned first column and scroll inside their own box on phones. Personal inbox and preferences use existing dashboard chrome and the shared settings save bar.

Stage controls and board moves ask for confirmation through `components/admin/confirm.tsx` before saving a new stage; cancel preserves the current stage. The dialog identifies the project and the old and new stages.

Onboarding service choice reuses `SelectField` through `ServicePicker`: a closed trigger, compact icon/name/description rows, disabled-service reasons and explicit Next.

**Onboarding forms (redesign, October 2026).** Every question is data in `lib/onboarding-services/<service>.ts` (one file per service) and the shared screens in `lib/onboarding.ts` (`CORE_STEPS`, `CLOSING_STEPS`). Each service opens with a Size first question and `showIf` conditions that combine (`{ key, equals?, filled? }`, `{ any: [...] }`, `{ tier: 2 | 3 }`) so a later pick can raise the tier; `isVisible` is the only visibility rule and a screen with no visible question is skipped. Decisions are in `plans/onboarding-decisions.md`, the research behind the numbers in `plans/onboarding-ux-research.md`, the words in `plans/onboarding-voice-guide.md`. `tests/onboarding-guardrails.spec.ts` holds every form to its question, required and free text ceilings.

Controls (all in `components/onboarding/`, one rule: **a single choice with three or more plain options is a dropdown (`SelectField`), a two option choice or Yes and No is one compact segmented line, and listed out cards are for checkboxes, multi select, or the few single choices that need a picture or a sentence**):

| Need | Use | Notes |
|---|---|---|
| Pick one of three or more | `SelectField` (dropdown, bottom sheet on phones) | Placeholder "Pick the closest". |
| Pick one of two, or Yes and No | segmented control in `FieldView` | One line, 44px, press again to unchoose. |
| Pick one with a picture or explanation | `OptionCards` (`option-card.tsx`) when the field has `optionInfo` | One lazy thumbnail per card through next/image, swatches named in text. |
| Pick several | chips for six or fewer, checkbox cards otherwise | Exclusive options such as None of these replace the rest. |
| Pick from a long list | `FeatureChecklist` (`feature-checklist.tsx`) when the field has `groups` | Search, popular first, See all, removable chips. |
| Colours | `ColourField` (`colour-field.tsx`), `kind: "colours"` | Pick a feeling, then Yes use these (two taps), or read colours from a logo on the phone, type codes, describe in words, or Choose for me. Stored as readable `Name | #HEX | Role` lines with the lead colour as `Main colour (primary)`, plus `brand_vibe`, `brand_colour_source`, `brand_colours_words`. Palettes and names are in `lib/colour-palettes.ts`. `suggestRoles` in `lib/brand-colours.ts` sorts them for the studio when read. Run `node --experimental-strip-types frontend/scripts/check-brand-colours.mjs`. |
| Read only text between questions | `kind: "notice"` | Never validated or stored. |
| A person is one tap away | `HelpStrip` (`help-strip.tsx`) | WhatsApp button only when `NEXT_PUBLIC_STUDIO_WHATSAPP` is set, email always, and the line saying what we never ask for. |
| Agree the terms | `EngagementSection` (`engagement-section.tsx`) | Four grouped ticks and a typed name, only when `engagementIsLive()` (a lawyer has approved and `ONBOARDING_ENGAGEMENT=on`). The server checks it again. |

Words are filled in by `lib/onboarding-voice.ts`: the client's name in titles, industry aware examples inside text boxes, a reflect back line after a screen, milestone lines, buttons that name the next screen. Old answers are read through `lib/onboarding-aliases.ts` and anything no question asks any more is listed under Earlier questions in the admin.

**Colours, fonts, links and dates (October 2026).** `colour-field.tsx` shows three palettes at a time with Shuffle across eighteen titled palettes (`PALETTE_POOL` in `lib/colour-palettes.ts`), plus codes with a colour box and pictures through the shared `FileDrop`. `fonts-field.tsx` does the same for fonts: about a hundred pairings in `lib/font-pairings.ts` (rows of headline font, reading font, weight, title; the "why it works" line is generated from the kind of each face), a preview-size slider, and a searchable Google Fonts list for "I know my fonts". Fonts are fetched only while that step is open and cut to the preview letters. `profiles-field.tsx` is the website and social list (stored as `Platform: link` lines). `kind: "date"` uses `DateInput` from `components/admin/pick.tsx`. Registration (`registered`, `registration_body`, `registration_number`) and `company_age` live on the shared business screen at medium size and up, and for any identity or guide.

**Policies.** `lib/legal.ts` holds six documents (privacy, terms, cookies, client engagement, payments and refunds, messages and reminders). Hosting, domains, email and payment integrations are tabs of the Client Engagement Policy, not separate documents. Every policy page ends with a Download as PDF link (`lib/legal-pdf.ts`, route `/policies/<slug>/pdf`), drawn in the same style as the entry PDF as plain data; the page links the studio email automatically. They are drafts for a lawyer. The Client Engagement Policy is tabbed: `LegalSection.tab` and `LegalDoc.tabs` in `lib/legal.ts`, rendered by `components/legal/legal-tabs.tsx` with a search across every tab. Add a tab per service there when a service has its own rules. The text is also editable in the admin under Settings > Policies (`lib/legal-store.ts`, `lib/admin/legal-actions.ts`, `components/admin/legal-editor.tsx`): an edit is one `site_content` row per policy (`legal.<slug>`), laid over what shipped, with the last ten versions kept and a reset. Titles and addresses are not editable. `OPEN_ITEMS` lists what still needs a decision.

Brief option descriptions and press-to-open illustrated examples live in `lib/onboarding-help.ts` and `BriefExample`, through the existing `Tip`. They explain all six services without new questions or renamed stored values. Examples are labelled illustrations, not included outputs or connected services; costs and secure-access requirements stay visible. The shared help panel has bounded native scrolling and 44px controls.

One system for everything we ship: the public site, the admin and the portal. The interactive reference, with every component live in light and dark, is the **Design System artifact**: https://claude.ai/artifact/Xa6aPYNrgVhJnyHnkbu93c. This section is the short version. When the two disagree, the code and this file win, and the artifact gets updated.

The [Meetings design preview](prototypes/cal-meetings/README.md) renders the current admin shell, Panel, DemoNote, logo and Lucide icons directly from these components. It is a proposal with sample data, awaiting review; it does not implement scheduling.

Meetings implementation uses `Panel`, `Pick`, `DateInput`, `DateTimeInput`, `Dialog`, `ad__t`, `RowMenu`, `BulkBar` and `Pager`. Its calendar period control supplies designed month/year pickers; availability ranges remain independent per weekday. Scheduling settings use the shared save bar. Public booking uses the site's black/white button pair. Production booking stays disabled until its migration, provider setup, signed webhook and release verification are complete.

Users under Settings reuses `Panel`, `ad__t`, `RowMenu`, `BulkBar`, `PickAll`, `RowPick` and `Pager`. Reviewed bulk outcomes appear in the shared dialog; the Person column stays pinned, and filters/page size remain in the URL. Recipient-owned account-change email preferences use the shared Settings save bar.

Newly invited clients get one optional `/portal/welcome` profile screen after secure sign-in. It reuses `Panel`, `Form`, `Field`, `Radios`, `Submit` and portal chrome; later edits use `SettingsForm` and its save bar in portal Settings. Continue saves the display name, optional normalized private photo and System/Light/Dark preference; Skip preserves current choices. Existing clients are not enrolled. Migration 0038 is applied by the owner from Settings › System before activating new invitations. Profile controls and uploads deny capture and read-only support sessions; the public default remains dark.

Onboarding service explanations reuse the existing press-to-open Tip and field hints. Keep stored keys and option values stable; historical Client dashboard and Your client portal answers map to Client portal on draft load. Specialist explanations remain optional unless needed to answer safely.

Public custom forms reuse SelectField and the lazy searchable PhoneField used by Contact. lib/phone.ts normalizes numbers to E.164 and enforces Nigerian national length; custom answer checks, Contact submission and its server endpoint share it. Choice keyboard focus belongs to the whole label, without a second input shadow. Users group tabs reuse ad__tabsNav and its shared panel spacing.

`Pager` keeps native disclosure and links with a small `DismissDetails` boundary for outside-pointer and Escape dismissal. Backup/restore design reuses `FileDrop`, `Dialog`, `Panel`, `Pager`, shared row-menu/bulk-bar geometry and pinned scrollable tables; it is an interactive proposal, not a running backup service.
Paystack mode in Settings › Integrations uses `SettingsForm`, the designed `Select`, `Switch`, and the shared confirmation dialog. Live mode requires explicit acknowledgement and a fresh owner session. Configuration indicators contain no key values; existing checkout references retain their original account when mode changes.

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

All of these live in `frontend/components/admin/`. The public site has its own onboarding picker (`components/onboarding/`): on a touch screen it opens as a bottom sheet that does not auto-focus the search box (focus lands on the list; a tap raises the keyboard), is sized from `visualViewport` so the keyboard does not cover it, and gives its list its own definite max-height.

| Need | Use | Notes |
|---|---|---|
| Choose one of a list | `Pick` (`pick.tsx`) | Searchable above ten options; type-ahead otherwise. A bottom sheet on phones. Lists own their native vertical scroll; touch movement never changes the keyboard-active row. Posts a hidden input. |
| Choose one (or several) from a list that GROWS: clients, projects, staff, contacts, tags, invoices | `RemotePick`, `RemoteMultiPick`, and the form-kit fields `RemoteSelect` / `RemoteChecks` (`remote-pick.tsx`) | Same look and keys as `Pick`, but the options are asked of the server (`searchOptions` in `lib/admin/search-actions.ts`, ranking in `search-rank.ts`): the first 20 on open, then as you type (200ms pause, stale answers dropped), about six rows showing and the rest scrolling, "Type more to narrow it" past 20. The page never ships the list: pass `defaultValue` + `defaultLabel` so the chosen one reads by name. Permission is checked in the action (staff get clients, projects and the team; contacts, tags and invoices are the owner's). `lead` adds fixed rows such as "+ Add a new client"; `scope` narrows (`{clientId}` for projects, `{invoices: "open"}`, `{exclude}`). Never pass a whole list of records as props to a picker. |
| Choose several onboarding answers | `FieldView` multi cards (`components/onboarding/onboarding-form.tsx`) | Checkbox cards store a list. Older one-string drafts normalize on read. Project-update channels start with “Your client portal” checked, and the client may add or remove channels. |
| A select in a GET filter row | `FilterPick` | Named by its label only. |
| A date | `DateInput` | Monday-first month grid. The title opens a month grid, then a 12-year grid. Arrows, Page Up/Down, Home/End, Today, Clear. Shows "Mon, 14 Sep 2026". Posts `YYYY-MM-DD`. |
| A date and a time | `DateTimeInput` | Quarter hours; posts `YYYY-MM-DDTHH:MM`. |
| A date range filter | `DateRange` (`date-range.tsx`) | Presets first, then a custom pair of calendars. |
| A form | `Form`, `Field`, `Select`, `Radios`, `Checks`, `Submit` (`form.tsx`) | Hints go under the input. A failed submit keeps what was typed. The toast is raised as the action answers. |
| A choice shown as a range | Select with `slider: true` in `lib/forms/custom-def.ts`; `SliderField` (`components/forms/custom-form-view.tsx`) | A display mode for a dropdown: its options run along a range in order. A last "not sure" option stays a tick box beside the range. |
| A read-only client support view | `SupportBanner`, `SupportReadOnly`, `ClientSupportButton` (`components/client/`) | Owner-only, reason-required and limited to 15 minutes. The original owner session stays intact. Shared forms and payment controls explain their disabled state; server guards enforce it. The persistent banner offers Exit, including when the view expires or cannot be verified. |
| A one-time code | Six boxes over one input (`components/account/password-change.tsx`) | Paste and autofill work. The sixth digit submits. A refusal shakes the boxes. |
| A file from the library | `MediaPicker` (`media-picker.tsx`) | Search, folder, grid; a picture's description is asked for there and saved back to the file. Used by the blog cover and the editor's Picture and Video panels. |
| Files uploaded in admin or onboarding forms | `FileDrop` (`file-drop.tsx`) | The standard dashed WDC dropzone: one real native input across the whole panel for click, keyboard and drag-and-drop. The owning form keeps its own type, count and storage rules. FileDrop owns its stylesheet; onboarding maps public theme tokens locally and keeps authorization, transfer progress and retries in Dropzone. |
| Files attached to a form entry | `EntryAttachments` (`forms/entry-attachments.tsx`) | Up to four files use the responsive grid. Five or more use a keyboard-focusable native sideways rail with a partial next card, contained by its panel at every width. Long names ellipsize and never widen the page. |
| Files attached to a project deliverable | `DeliverableUpload` (`delivery.tsx`) | Upload one or more media-library files and/or add a link. The record keeps validated R2 keys, so the portal can offer signed Open and Download actions. |
| Move between form entries | `.adEntryNav` in `forms.css` | Inline on wider screens. On phones the position is centred above two equal-width Previous and Next controls, with the page-tour control on its own full-width row. |
| Change a team member's name | `MemberControls` (`settings/team-controls.tsx`) | Owner-only dialog on Team and roles. The signed-in person changes their own name on My account, linked as “Your name and password” from the avatar menu. Both paths toast and audit the saved name. |
| Choose a project icon | `IconPicker` (`icon-picker.tsx`) | About 350 icons from `lib/project-icons.ts`, each found by its name and everyday words (`kw`). Keyboard radio grid with a solid preview and Shuffle control. On phones the explanatory hint takes its own full-width row below them. |
| Show where a project stands | `.ad__stageTrack` (`admin.css`) | Chevron steps: finished steps navy, the current step orange with a shimmer. Delivered turns the whole row green; moving back clears it. Scrolls sideways on phones. |
| Ask before acting | `ask()` / `confirm` (`confirm.tsx`) | Never `window.confirm`. Anything that "cannot be undone" also needs "I understand". |
| Email with an action | `NoticeTick` / `ReceiptTick` (`reconcile-forms.tsx`) | "Email the client a receipt", "Tell the client". Ticked when the client can be emailed; disabled, flat, with the reason and the fix beside it when they have no address or switched updates off. The server asks again. |
| Billed, paid, refunded, due | `ClientReconciliation` / `InvoiceReconciliation` (`reconciliation.tsx`) | Every figure summed from the invoice and payment rows (`lib/admin/money-rules.ts`), so the client summary is exactly the sum of its invoices and invoiced = received + outstanding. Overpayments and held credit are named, never folded in. |
| Work beside the page | `Dialog` / `DialogButton` (`dialog.tsx`) | Opens as a right-hand sheet on every screen: it slides in, fills the screen on phones and keeps safe-area padding. Native `<dialog>`. |
| Say it worked | `toast()` (`toast.tsx`) | Every save, update, toggle and bulk action. Undo when it can be undone. |
| Loading | `Skeleton` | Shaped like the real screen, never invented data. |
| Nothing here | `AdminState` / `EmptyScene` | Empty, filtered-to-nothing, error and no-permission are different screens, each with one next step. |

- **Deletion is two steps:** Move to Trash (reversible), then Delete permanently from the Trash (owner only, behind "I understand").
- **The "I understand" row** in the confirm dialog is a tick, an icon and words on one centre line.

### Motion

- **Easing:** everything eases out; things travelling between two rests ease in and out.
- **Speeds:** hover and press are quick. Menus and calendars rise 4px and fade in. Sheets slide up in 240ms.
- **Screens arrive in order:** the head first, then blocks a beat apart. KPI figures count up (`count-up.tsx`, `.adCountUp`) and bars grow from their baseline. The server always renders the real value first; the KPI class is deliberately separate from Settings' `.adCount` field counter so route-persistent CSS cannot move a figure out of its tile.
- **What moves:** transform and opacity only. Under reduced motion nothing moves. Anything off screen or in a hidden tab pauses. One-shot celebrations keep their final invisible frame until their finish events remove the layer; cleanup must not rely only on the `Animation.finished` promise.
- **Hero motion:** ten pieces and three ways to put them in the homepage hero, in the Hero Motion artifact (https://claude.ai/artifact/VtKhKJkgMBSgop26cphUPv). The CTAs never wait for the motion.
- **Payment receipt printer** (`components/money/receipt-printer.tsx`, on `/pay/done` after a verified payment and `/r/[token]` for every recorded payment): EasyUI's Payment Receipt Printer (MIT) in our colours: a dark navy stage holding the status card (green tick ring) and printer, a clean white slip with side notches and torn teeth, monospace rows with colon labels, the invoice's real lines and totals, Amount received as the one large figure, a decorative barcode over the real receipt number, Replay and Copy. Lights blink orange while printing or feeding and turn green when ready. A long slip scrolls inside its own window (capped to the screen, with a fade while there is more below) so the printer and its buttons always fit on screen, and carries a "Pull for more" paper tab: drag it to pull paper out, or tap it to feed the rest out. Demo: https://claude.ai/artifact/7imA4UHPz53kxRiakVSWVk. CSS keyframes, not an animation library; the slip feeds bottom first (`tests/receipt-feed.spec.ts`). Preview at `/dev-receipt` (dev only).
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
Production admin collections start empty and hydrate only from persisted records. Empty databases are never seeded from demo fixtures; missing or failed database access is reported. The legacy candidate manifest and read-only audit script live in docs/audits and frontend/scripts/audit-demo-records.mjs; candidate IDs require full-record provenance review before deletion, and authentication/current owner records are outside the cleanup scope.

Onboarding service labels and helper copy have explicit spacing. The colour question is the feeling cards flow described above, not an expandable control.

Receipt navigation uses the established POS overview first; **View full receipt** opens `/r/[token]?view=full`. The overview uses the persisted currency, refund and reversal state. Print actions open the generated PDF inline (`?print=1`), and Download PDF remains a download. Reuse this flow rather than printing the webpage or introducing another receipt design.
