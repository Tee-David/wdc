# Replacement checklist: live dashboards to the new design

Status: prototypes are complete for the owner, staff and client roles. Live implementation: second wave 12 October, third wave 16 October (see docs/status.md); the messaging upgrade is the main open item. Implementation waits for the owner's approval and then runs with at most two Sonnet agents, model set explicitly.

How to read it: each row is a live route or component, the board that shows the new design, what changes, and the check that closes it. Boards are in `design/dashboards/screens/`. The shared kit that built them is in `design/dashboards/kit/`. Tokens and components are in `design-system/`. A newer line in `preferences.md` wins over anything here.

## Order of work

1. Foundations (tokens, shell, shared components). Nothing else starts before these land.
2. Admin pages, in the order of the nav.
3. Staff pages (the same components, amounts hidden).
4. Client portal pages.
5. Auth-adjacent screens (welcome, invite, tours).
6. Retire the old components and CSS, then re-run every Playwright spec.

Every step ends with: `tsc`, eslint, the targeted Playwright specs, overflow and target-size measurement at 320, 390, 834 and 1440 in both themes, and a screenshot pass against the board.

## 1. Foundations

| Task | Live source | New design | Done when |
| --- | --- | --- | --- |
| Tokens | `components/admin/admin.css` (`--ad-*`), `app/globals.css` | `design-system/tokens.json` | Every colour in the dashboards comes from a `--ad-*` token; the table in CLAUDE.md matches the file |
| Shell: sidebar, top bar, rail mode, drawer | `components/admin/shell.tsx`, `side-foot.tsx`, `nav-drawer.tsx`, `components/client/shell.tsx` | Any board's frame | One shell for the three roles, role decides the nav; drawer on phones, no bottom bar |
| Sheets (side and bottom, stacked, resizable) | `components/admin/dialog.tsx`, `confirm.tsx` | `kit/sheet.html`, `kit.js` | Dialog and confirm are the same sheet; unsaved-close guard; "I understand" for irreversible |
| Deck (Focus card) | `today-strip.tsx`, `my-work.tsx` | Deck on every board | One component, fed by each page's "what needs me" query |
| Tables, pager, filters, export, import, bulk | `table-scroll.tsx`, `pager.tsx`, `bulk.tsx`, `list-search.tsx`, `row-menu.tsx`, `row-actions.tsx` | `kit/tools.js`, `parts/tools.html` | First column pins, five rows a page, 5/10/20 and View all, row and ⋮ are separate targets |
| Searchable select, date, time, media, editor fields | `pick.tsx`, `remote-pick.tsx`, `date-range.tsx`, `media-picker.tsx`, `rich-text-editor.tsx`, `file-drop.tsx` | `kit/kit2.js` | Native pickers gone from the dashboards; inline create client |
| StatTile, CountUp, skeletons, empty states | `count-up.tsx`, `skeleton.tsx`, `empty-scene.tsx`, `states.css` | Figure cards on every board | Skeletons match final geometry, empty vs filtered vs error vs no permission are distinct |
| Toasts, tour | `toast.tsx`, `tour` | Toast timer 5s/8s, Joyride tour per page | Completion kept per user and version |
| Settings engine | `components/admin/settings`, `email-settings.tsx` | `A-Settings` | Per-tab save bar, verify rows, nav dots |

## 2. Admin

| Live route | Board | What changes | Gaps closed in the prototype |
| --- | --- | --- | --- |
| `/admin` (dashboard) | `D-Admin` | Flow home: Focus deck, workbench rail | Notifications "See all" |
| `/admin/clients`, `/admin/clients/[id]` | `A-Clients`, `A-Client` | Tabs, facets, import, bulk, one record per person | Inline create client everywhere |
| `/admin/clients/support`, `/admin/clients/support/[id]` | `A-Support` | Tickets as table plus sheet, help centre categories | Categories managed in Settings |
| `/admin/forms`, `/forms/[form]`, `/forms/[form]/entries/[entry]`, `/forms/all`, `/forms/new` | `A-Forms` | Entries, forms and pre-filled links in one hub, assign to a client with search | Builder opens from "New form" (to design when approved) |
| `/admin/projects`, `/admin/projects/[id]` | `A-Projects`, `A-Project` | Per-service project pages, pause and resume, stage templates | Meetings link in the ⋮ |
| `/admin/meetings` | `A-Meetings` | Coming up, past, requests; recording attach | None open |
| `/admin/money`, `/admin/money/[id]` | `A-Money` | Tabs, Reports tab, bank accounts | Month by month table and New clients added |
| `/admin/money/reconciliation` | `A-Reconcile` | Statement import and match | Account-level matching rules stay as in live |
| `/admin/reports` | `A-Money` Reports tab | Folded into Money; keep `/admin/reports` as a redirect | Saved views, schedule, export |
| Messages (the conversation views) | `A-Messages` | Built at `/admin/messages` (15 Oct): tickets and project channels, reply in place. Tags, gallery, multi-recipient, unread and team chats still to come (need a migration) | Email marketing link in the ⋮ |
| `/admin/email`, `/email/campaigns/[id]`, `/email/automations/[id]`, `/email/contacts/[id]`, `/email/templates/[kind]` | `A-Email` | Four tabs, one table | Template and automation editors open from the sheet (to design when approved) |
| `/admin/blog`, `/blog/[id]`, `/blog/work`, `/blog/work/[slug]` | `A-Blog` | Real editor, schedule, search check | Case studies tab: design when approved |
| `/admin/users`, `/users/[id]`, `/users/departments` | `A-Settings` Team section | Team, Departments, sign in and security, sessions | Per-user page stays a sheet |
| `/admin/notifications` | `A-Notifications` | Inbox with filters | None open |
| `/admin/welcome` | none | First-run welcome | To design when approved |
| `/admin/settings/*` (general, business, team, access, account, audit, content, email, faq, integrations, maintenance, media, meetings, notifications, policies, privacy, site, system, errors) | `A-Settings` | One page, sections with their own Save | All sections present |

## 3. Staff

| Live route | Board | Notes |
| --- | --- | --- |
| My Day | `D-Staff` | Tasks hide for paused projects |
| Projects | `S-Projects`, `S-Project` | Their departments, no amounts, chips only |
| Clients | `S-Clients` | Assigned to them |
| Messages | `S-Messages` | Same engine, notes visible to staff |
| Settings | `S-Settings` | Account, notifications |
| Support | `S-Support` | Shared help centre |

## 4. Client portal

| Live route | Board | Notes |
| --- | --- | --- |
| `/portal` | `D-Client` | Home, "What we are doing next" |
| `/portal/projects`, `/portal/projects/[id]` | `C-Projects` | Per-service sections, approvals, previews |
| `/portal/billing` | `C-Billing` | Paystack and Flutterwave, receipts, no double pay |
| `/portal/support`, `/portal/support/[id]` | `C-Support` | Shared help centre |
| `/portal/settings` | `C-Settings` | Account, notices |
| `/portal/notifications` | bell panel | Portal inbox is the bell; a full page is not designed |
| `/portal/welcome` | none | To design when approved |

## 5. After the swap

- Delete the superseded components and styles once nothing imports them (grep before deleting).
- Update `README.md` § Design system and `docs/status.md`.
- A schema change anywhere in this list ships as a migration, applied from Settings, System by the owner.
- Verify the deployed commit and the canonical domain, not the source.

## Designed since the first checklist

Form builder (`A-FormBuilder`), email template editor and automation step editor (in `A-Email`), case studies (`A-Cases`), welcome screens (`A-Welcome`, `S-Welcome`, `C-Welcome`) and the staff and client notification inboxes (`S-Notifications`, `C-Notifications`) are in the prototypes. The bank account flow in `A-Settings` now suggests the bank from the account number, then verifies the name.

## Still open

1. The form builder edits the Contact form only; the other forms use the same page with their own questions.
2. Messaging upgrade (presence, typing, reactions, mentions, info panel, profiles): in progress.
