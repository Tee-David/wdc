# WDC UI audit: admin, staff, client portal

Read-only audit of /home/user/wdc/frontend (Next.js). Date: 2026-10-10. No repo files were edited. All paths are relative to `frontend/` unless they start with `/`.

Design System artifact (noted only): https://claude.ai/artifact/Xa6aPYNrgVhJnyHnkbu93c (linked from README.md "Design system", line 59). Other artifacts it mentions: Hero Motion (VtKhKJkgMBSgop26cphUPv), Hero Concepts (6NMiGXyWnFTg94jUskN45S), tables-stay-tables design (KNeBe4abjbkqTRQaRrUVp4 in admin.css:498).

---

## 1. Summary

**What the three dashboards really are.** There are two shells, not three. Staff is not a separate area. Staff log into the same `/admin` shell as the owner, with a role filter (`lib/admin/permissions.ts`). The portal (`/portal`) is a second shell that is a near-copy of the admin shell and loads the admin's own CSS (`app/portal/layout.tsx` imports `components/admin/admin.css` and `dashboard.css`). All three use the `ad__*` class family and `--ad-*` tokens. The "different directions" feeling therefore does not come from three design languages. It comes from:

1. **The same job done several ways inside the admin itself** (see section 4): five tab styles, six filter-form class families, five search mechanisms, three table skins, three form kits, three empty-state components, two confirm paths, two rich-text editors, three chart implementations, three notification surfaces, three "tasks/updates" implementations on one project page.
2. **Whole feature areas written in a different code style.** `components/workspace/*`, `components/meetings/*`, and `components/admin/settings/users.tsx` are minified one-line JSX with minified CSS (`workspace/*.css` is one line per file; `meetings.css` is one line). They are visibly different in density, radius, spacing (px instead of rem), and in how they build tables and tabs.
3. **Page structure drift.** Detail pages (client, project, invoice, entry) are long scrolls of 7 to 13 panels with no tabs. List pages each assemble their own toolbar. Settings has 21 pages and its own side nav. Money is one page with six stacked panels.
4. **Two real defects found:** the custom form builder is orphaned (route missing, link and redirect lead to a 404), and the global focus ring uses a colour that fails 3:1 on light panels.

**Size.** Admin: 52 real pages (55 `page.tsx` minus 2 redirects and 1 catch-all). Portal: 9 real pages (10 minus catch-all). Staff: same routes, about 14 reachable. `components/admin` is 134 TSX plus 24 CSS files (about 24k lines). `admin.css` alone is 2,091 lines. There are 177 test files in `tests/`, many tied to selectors, so a redesign must budget test updates. 167 admin tour steps and 44 client tour steps depend on `data-tour` hooks (63 `data-tour=` plus 49 `dataTour=` in source).

**Biggest consolidation levers** (details in section 7):
- One `Tabs` component, one `Toolbar` (search + filters + date range + view switch), one `DataTable` (pinned first column, selection, sort, pager).
- Collapse Settings (21 pages) into about 6 groups. Move Content sections (FAQ, Media, Policies, Blog defaults) under Blog, and Meetings settings under Meetings.
- Merge the project page's three overlapping systems (Tasks/Updates/Deliverables in `delivery.tsx` vs service records vs team workspace).
- Make the portal shell and admin shell one `Shell` driven by a nav config.
- Money: tabs (Invoices, Estimates, Payments, Expenses, Reconciliation) plus Reports as a view.

---

## 2. Staff model

**Staff is the admin area with role-limited access.** There is no `/staff` route.

- `lib/roles.ts:17-27`: `Role = "owner" | "staff" | "client"`. `DOORS`: owner and staff both have `home: "/admin"`; client `home: "/portal"`. The DB column is a string guarded by `user_role_check` (migration 0019).
- `lib/admin/permissions.ts`: one table. `Area` = clients, projects, forms, content, money, settings, team, exports, destructive. `STAFF` set = `clients, projects, forms, content` only. `can(role, area)` is read by (a) server-action guard `lib/admin/guard.ts`, (b) pages, (c) the shell nav. `NAV_AREA` (line 40-51) maps nav hrefs to areas.
- `app/admin/layout.tsx`: admits owner and staff, bounces client to `/portal?studio=1`. New staff are redirected once to `/admin/welcome` (setup_state = pending).
- `proxy.ts`: session cookie check only. Support views (owner viewing as client or as staff, read-only, 15 min) use two extra cookies and an allow-list (`lib/users/support-policy.ts`).
- Per-project scoping: `lib/workspace/access.ts` (line 54): staff get manage rights on a project only if in `ownerIds` or a project member. But admin list pages do **not** scope by ownership. `app/admin/(lists)/projects/page.tsx` has no role filter except hiding budget (line 199), so staff see every client and project; "My work" panel (`components/admin/my-work.tsx`) is the only personal filter.

**What staff see in the sidebar** (computed from `NAV` in `components/admin/shell.tsx:63-95` and `NAV_AREA`):

| Item | Owner | Staff |
|---|---|---|
| Dashboard (money tiles hidden for staff via `money` flag) | yes | yes |
| Clients, with subs: All clients, Leads and forms, Support | yes | yes |
| Clients sub: Meetings (`NAV_AREA` = "settings") | yes | no |
| Projects | yes | yes |
| Money (+ Reconciliation), Reports | yes | no |
| Email | yes (`AreaGate area="settings"`) | no |
| Blog (posts + case studies) | yes | yes |
| Users (+ Departments, roles table) | yes | no (`adminRole() !== "owner"` forbidden screen) |
| Settings | all 17 sections | only My account plus Content group (Blog and site copy, Policies, FAQ, Media library) |

So staff currently see 5 sidebar items: Dashboard, Clients (3 subs), Projects, Blog, Settings. Owner sees 8.

**Staff-specific UI:** `/admin/welcome` (`staff-welcome.tsx`: profile, departments, "what you work on"), dashboard "Today" strip and "My work" (`today-strip.tsx`, `my-work.tsx`), `/admin/notifications` personal inbox, per-project "Team workspace" (handovers, team tasks, internal notes; `workspace/team-workspace.tsx`). Staff are hidden from: money, exports, destructive actions (archive/merge: `can(role,"destructive")`), budget field.

**Role/permission UI is read-only.** `components/admin/settings/roles-table.tsx` draws a static Owner vs Staff matrix (a `<details>` inside Users, `#roles`) from the same table. There is no per-person permission editing. Departments (`/admin/users/departments`, `components/admin/departments.tsx`, `lib/departments.ts`) group people but do not grant anything.

**Inconsistencies in the staff model worth fixing in the redesign:**
- Settings is in staff's nav only to reach 5 pages. It mixes "My account" with Content. Better: Account under the avatar menu (already linked there: `shell.tsx:344`), Content under Blog.
- Meetings is owner-only with a one-line "Studio meetings need scoped staff access" message (`app/admin/meetings/page.tsx`). Email is owner-only. Staff cannot reach either even to read.
- `NAV_AREA` has stale mappings: `/admin/reports` is mapped to "money" but Reports is not in the nav at all (reachable only from the Money header button, `money/page.tsx:155`).

---

## 3. Component inventory

Legend: path | what | notes. "Native" means browser-drawn control. Component families are all under `components/admin/` unless stated.

### Shell, navigation, chrome
- `shell.tsx` (622 lines): admin shell. NAV array, sidebar with collapse/pin (localStorage `wdc:admin-sidebar-collapsed`), topbar with command palette (Ctrl K, `shell.tsx:454-520`), bell popover, account menu, theme toggle. Recents list in localStorage.
- `client/shell.tsx` (272 lines) + `client/client-nav.ts`: portal shell. A trimmed copy: duplicates `Sidebar`, `AccountMenu`, `MenuTheme`, `ThemeButton`, `signOut`, sidebar collapse logic. No command palette. Has bell icon linking `/portal/notifications` (comment at line 25 says no bell: stale).
- `nav-drawer.tsx`, `side-foot.tsx`: phone drawer (hot-dog menu) and sidebar foot (tour card, profile). Shared by both shells.
- `support-bar.tsx`, `client/support-banner.tsx`, `client/support-context.tsx`: read-only "viewing as" bars (two implementations, admin vs portal).
- `notices.tsx` + `.ad__banner` CSS: dismissible system banners.
- `theme`: `ThemeButton` in both shells (two copies); the admin copy also lives in the account menu.
- `table-scroll.tsx`: sets `data-scrolled` / `data-more` for the sideways-scroll hints.

### Buttons and actions
- `.ad__btn` family in `admin.css:618-636`: default (white raised), `--primary` (navy light / #b84a00 dark), `--danger` (`:833`, outline red, solid red only inside `.adAsk`), `--plain` (35 uses, **no CSS rule**), `--ghost` (1 use, **no CSS rule**). Button 44px min.
- `form.tsx:493` `Submit` (tone primary/plain/danger, busy spinner), `Actions`.
- `row-menu.tsx` (343 lines) `RowMenu` (the ⋮ menu: items of kind link/dialog/form, danger styling). `row-actions.tsx` (810 lines) composes it into `ProjectMenu, ClientMenu, InvoiceMenu, PaymentMenu, ExpenseMenu, SubmissionMenu, EstimateMenu`.
- `dialog.tsx` `Dialog`, `DialogButton`: right-hand sheet on every screen (native `<dialog>`). The in-file comment still calls it "a modal... tool's dialog".
- `confirm.tsx`: `ask()` / `confirmClick` / `ConfirmHost`. Centred in-app confirm with the "I understand" tick for irreversible actions. A second confirmation body, `Confirm` in `row-menu.tsx:331`, is a dialog paragraph wrapper for the one-sentence confirm behind a ⋮ item.
- `bulk.tsx`: `BulkBar`, `RowPick`, `PickAll`. Imperative: finds the table by DOM id (`target`), reads `.adRowPick:checked`, toggles `tr.is-picked` classes.
- `permanent-delete.tsx`, `client-archive.tsx`, `case-hide.tsx`, `blog-menu.tsx`: one-off destructive controls, each with its own form.

### Inputs and pickers
- `form.tsx`: `Form` (server-action form with kept values, per-field errors, toast on answer), `Field`, `Area`, `Select` (maps to `Pick`; searchable above 10 options or for names ending `Id`), `Radios`, `Checks`, `Wrap`, `Fold`, `Fields`, `Hidden`, `useKept`. `Field type="date"` and `type="datetime-local"` are mapped to `DateInput` / `DateTimeInput` (`form.tsx:255-259`), so most "native date" call sites are already the designed picker.
- `pick.tsx` (590 lines): `Pick` (custom dropdown, search above ten, bottom sheet on phones), `FilterPick` (for GET filter rows), `DateInput`, `DateTimeInput` (quarter hours), popover primitives. `pick.css` has a `[data-pick-skin="public"]` variant so the public site can reuse it.
- `remote-pick.tsx`: `RemotePick`, `RemoteMultiPick`, `RemoteSelect`, `RemoteChecks` (server-searched, 200 ms debounce). `owner-field.tsx`: multi-person picker for project owners (own chip list, own popover).
- `date-range.tsx`: `DateRange` with presets plus custom calendar pair (its custom range is a nested GET `<form>`).
- `icon-picker.tsx`: 350 project icons. `cover-field.tsx`, `social-image-field.tsx`, `media-picker.tsx`: file/image pickers.
- `file-drop.tsx`: standard dashed dropzone. `media-upload.ts`, `delivery.tsx` `DeliverableUpload`, `forms/entry-attachments.tsx`: file handling.
- Settings controls (`settings/kit.tsx`): `Switch`, `Toggle`, `Text` (self-validating, counter), `Chips`, `Row`, `ConfirmSwitch`, `Head`.
- Remaining native controls in admin/portal: one `<select>` (`legal-editor.tsx:106`), `<input type="color">` (`case-editor.tsx:173`), `<input type="range">` (`email/eb-panels.tsx:176`), checkboxes/radios (styled). `.ad__filters select` CSS (`admin.css:1225`) is an orphan rule (no TSX renders a native select in a filter row any more; verify before deleting).

### Tables, lists, pagination, search, filters
- `.ad__t` table (`admin.css:495-549`, `.ad__scroll` wrapper): the standard table. Pinned first column on phones (`:512-522`), "Swipe for more" hint, sortable header links (`aria-sort` links built per page), `.ad__rmC` cell for the ⋮ menu.
- `pager.tsx` `Pager`: single pagination for all (`PER_PAGE_OPTIONS = 10/25/50/100/250`, native `<details>` per-page menu, `DismissDetails`). Used by 15 files (blog, clients, support, email, money invoices, projects, email log, media, forms entries and all, portal billing, audit log, campaigns, users, meetings).
- `list-search.tsx` `ListSearch`: live client-side filter of rows already on the page. Finds its table by DOM id, sets `row.hidden`, injects a portal `div` into the table container for the no-results scene. Used by 6 pages.
- Server GET filter forms with an Apply button: clients, projects, blog, money, support, forms entries, forms all, audit, media, email log, privacy, campaigns, users (classes `ad__filterForm`, `ad__filters`, `ad__filterBar`, `adMedia__filters`, `adForms__filters`, `adUsers__filters`).
- Debounced URL push (350 ms): `email/contacts-view.tsx:71-74` only.
- Client state with fetch: `meetings/admin.tsx` filters in memory after `fetch('/api/meetings')`.
- Command palette search: `shell.tsx:454-520` (pages plus "Clients/Projects/Invoices for 'q'", which navigate to the list with `?q=`).
- `forms/column-picker.tsx`: column chooser stored in a cookie. `forms/entries-table.tsx`: the entries table (its own selection/bulk wiring).
- `audit-table.tsx`, `audit-log.tsx`: audit table plus detail with diff; `adAuditD__*` CSS has its own dark `pre` block.

### Tabs and switches
Five distinct styles (section 4.2). `blog-tabs.tsx` (`BlogTabs`, `ad__switch`), `legal/legal-tabs.tsx`, `meetings/settings-tabs.tsx` (`SectionTabs`), plus the inline ones in pages.

### Panels, cards, KPI, charts
- `bits.tsx`: `Panel`, `Tile` (KPI card with solid icon tile and badge, `CountUp`), `Empty`, `StagePill`, `InvoicePill`, `HealthPill`, `ApprovalPill`, `AttentionPills`, `when()`.
- `count-up.tsx`: KPI count-up (server renders the real value).
- `profile-card.tsx` `ProfileCard`: record header (avatar, meta, actions) for client, project, support, portal project.
- `cashflow-chart.tsx` (CSS bars), `.adRep__*` bars in `reports/page.tsx` and `email/page.tsx`, `.ad__barTrack`, `.adDash__chartBar` in `dashboard.css`: no chart library, three bar implementations, no shared tooltip.
- `dashboard-view.tsx` (527 lines), `customise-dashboard.tsx`, `lib/admin/dashboard-panels.ts` (8 hideable panels), `today-strip.tsx`, `recent-leads.tsx`, `first-week.tsx`, `my-work.tsx`.
- `project-board.tsx` (345 lines): kanban board, `stage-scroll.tsx` / `.ad__stageTrack` chevron stage track.
- `money/currency-balances.tsx`: per-currency totals (used on Money, client page, portal billing).

### Status, badges, pills
- `.ad__pill` with tones `good|warn|bad|live|flat|brand` (solid fills, `admin.css:589-610`). Consistent. 35 + 34 + 24 + 22 + 6 + 5 uses. One `.rp__pill` outlier. `.ad__tileIcon--*` solid tiles. `.ad__tab N` count chips. Count badge `.ad__navCount`. No tinted badges found; see 5.3 for the banners that are tinted.

### Empty / loading / error
- `empty-scene.tsx` (SVG scenes by kind), `admin-state.tsx` `AdminState` (kind: first-use, cleared, no-results, forbidden, error; title, description, action, back), `bits.tsx` `Empty`. Three components for the same idea (4.8).
- `skeleton.tsx`: `Skeleton, SkTiles, SkPanel, SkFilters, SkTable, SkChart, SkRows, SkCards, SkBoard, SkForm, SkSplit`. Hand-assembled per route in 17 admin and 7 portal `loading.tsx` files. Boneyard is not used anywhere.
- `app/admin/error.tsx`, `app/portal/error.tsx`, `app/admin/not-found.tsx`.

### Feedback
- `toast.tsx` `toast()`, `ToastHost`, `ToastOnArrival`: good/bad tones, Undo action (8 s), 4 s default. Comment still references "the phone's tab bar".
- `form.tsx` announces the same text to screen readers.
- Tooltips: no shared tooltip. Icon-only controls use native `title=` (shell.tsx:188, 229, 290). Onboarding's press-to-open `Tip` (`components/onboarding/tip.tsx`) is reused in `form.tsx` and `blog-editor.tsx` only. The Joyride tour has its own tooltip (`tour/tooltip.tsx`).

### Save bar and forms for settings
- `settings/kit.tsx:51-136` `SettingsForm` + `Tracker`: pinned bar "N unsaved changes / Discard / Save changes", `beforeunload` guard. Used by 13 forms (business, content, email, maintenance, notifications, paystack, privacy, security-email, site, studio, client profile-setup, meetings settings tabs, workspace notifications). Not used by: FAQ editor, Policies editor, account page, media, mail connections, system, blog editor, form settings (`forms/form-settings.tsx`), client/support/project edit dialogs. Those use plain `Form` with a Submit.

### Rich text, builders
- `rich-text-editor.tsx` (359 lines, Tiptap) used by the blog editor (`blog-editor.tsx`).
- `email/email-builder.tsx` (673 lines) + `eb-tiptap.tsx` + `eb-panels.tsx` (Tiptap again, a separate toolbar and block model), loaded lazily via `design-editor.tsx`. Side tabs: Blocks, Tags, Settings, Checklist (`email-builder.tsx:56`). Hex colours in `email-builder.css` (58) mostly describe the fixed white email canvas, so legitimate.
- `email/automation-canvas.tsx` (405 lines): workflow canvas (node graph) with its own panel tabs (Setup / Results) in `automation-panel.tsx`.
- `case-editor.tsx` (432 lines): case study editor with its own cover/gallery/palette UI.
- `faq-editor.tsx`, `legal-editor.tsx`: sectioned editors with revision history (`revisions.tsx`).
- `forms/form-builder.tsx` (294 lines): custom form builder. **Orphaned**, see 6.5.

### Tours
- `tour/` (provider, runtime, launcher, tooltip, blur), `lib/tours/admin.ts` (167 steps), `lib/tours/client.ts` (44 steps), `PageTourButton` on 17 pages. `react-joyride` is dynamically imported (good). Role-aware via `tour-roles.check.cjs`.

### Meetings, money documents, workspace (separate code styles)
- `meetings/`: `admin.tsx` (14 KB one-liners), `calendar.tsx` (own month grid), `booking.tsx`, `manage.tsx`, `settings*.tsx`, `schedule-editor.tsx`. Uses `ad__btn` buttons as tabs (`["Calendar","Requests","History"]`, `["Agenda","Day","Week","Month"]`).
- `money/document.tsx` + `document.css` (569 lines): paper document for `/i`, `/q`, `/r` pages with fixed light colours (by design, a printable page). `receipt-printer.tsx` (+589-line CSS) for the receipt animation. `receipt-controls.tsx`: print/PDF buttons. `payment-account.tsx`, `pay-form.tsx`, `stamp.tsx`.
- `workspace/`: `project-workspace.tsx` composes `ServiceWorkspace` (service records with versions, decisions, notes), `ProjectMembers`, `TeamWorkspace` (staff) or `ClientProjectUpdates` (client). `notifications-inbox.tsx`, `personal-inbox.tsx`, `personal-preferences.tsx`. All minified single-line files. CSS `service-workspace.css` and `notifications-team.css` are one-liners using px and `.sw-*` / `workspaceCommunications__*` naming.

---

## 4. Duplicates: same job, done differently

### 4.1 Shell
- `shell.tsx` vs `client/shell.tsx`: duplicated `Sidebar`, `AccountMenu`, `MenuTheme`, `ThemeButton`, `signOut`, `SIDEBAR_KEY` logic, `subscribeToClientMount`. Portal omits the command palette and recents. Fix: one `Shell` fed by a nav config (`NAV` vs `CLIENT_NAV`).
- Support banners: `admin/support-bar.tsx` vs `client/support-banner.tsx`.

### 4.2 Tabs (five styles)
1. Underline nav `ad__tabsNav` (`admin.css:1458`): clients, email, users (`app/admin/(lists)/clients/page.tsx:177`, `email/page.tsx:43`, `users/page.tsx:29`), meetings settings (`meetings/settings-tabs.tsx:47`).
2. Segmented `ad__switch` (`admin.css:1203-1213`, 36px high, below 44px): blog posts/case studies (`blog-tabs.tsx`), money invoice status, projects table/board, portal projects/billing/support filters.
3. Form entries `adForms__tabs` list (`app/admin/forms/[form]/(form)/page.tsx:59-74`, plus a second status-tab row from `lib/forms/registry.ts:129-145`).
4. Builder side tabs: `eb-tabs` (email builder), `adWf__tabs` (automations).
5. Buttons styled as tabs: `meetings/admin.tsx` (Calendar/Requests/History and Agenda/Day/Week/Month use `ad__btn`), `workspace` `sw-tabs`/`workspaceCommunications__tabs`, `media-folders.tsx`.
Plus public-style `lg-tabs` (legal), `lx__tabs` (login), `sv-tabs` (services) which are not dashboard concerns.

### 4.3 Search and filtering (five mechanisms)
- Submit-and-reload: GET form with an Apply button (clients `page.tsx:220-240`, projects, blog, money, support, forms, audit, media, email log, users, campaigns). The user types, then must press Apply. Class families: `ad__filterForm`, `ad__filters`, `ad__filterBar`, `adMedia__filters`, `adForms__filters`, `adUsers__filters`, `adPriv__look`.
- Live in-DOM filter (`ListSearch`): reconciliation, case studies, forms list, portal projects, portal billing, portal support. Works only on the loaded page; portal billing combines it with a `Pager`, so the search does not span pages.
- Debounced URL push: email contacts only.
- In-memory filter after fetch: meetings.
- Command palette `Ctrl K`: navigates to the list with `?q=`.
Result: the same "search clients" feels live in one place and needs Apply in another. The owner's note says "live/AJAX": only contacts and ListSearch pages are.

### 4.4 Date range and period filters
`DateRange` (`date-range.tsx`) on clients, money, reports, blog, email log, forms. Money also has status segmented switch plus filter form plus DateRange in one toolbar (`money/page.tsx:273-301`) = three controls with three submit models.

### 4.5 Table skins
- `.ad__t` (standard, 100+ tables).
- `.sw-table` (`workspace/service-workspace.css`): own sticky first column, min-width 800px, padding 1rem.
- `.workspaceCommunications__table` (`notifications-team.css`): own sticky column, min-width 680px, 16px padding.
- Users table (`settings/users.tsx`) uses `ad__t` plus `adUsers__*` extras; `adRoles` table; `adAuditD` diff table; entries table with its own selection.
Radii and paddings differ between skins (px vs rem).

### 4.6 Form kits
1. `form.tsx` `Form/Field/Select/Radios/Checks` (admin default; 64 files import it).
2. `settings/kit.tsx` `SettingsForm/Row/Text/Switch/Chips` (settings, with save bar).
3. `components/onboarding/*` `FieldView/SelectField/OptionCards` (client-facing; separate by design but visually a third kit, also reached from admin pages via `PrefilledLink` previews and public custom forms).
Also `auth/fields.tsx` (login), `contact-form.tsx`, `custom-form-view.tsx` on the public side.
Settings pages without the save bar use immediate-submit `Form`, so "unsaved changes" behaviour differs by page.

### 4.7 Dialogs, sheets, confirms
- `Dialog` (right sheet) for forms. Centred `ConfirmHost` for confirmations. `Confirm` wrapper in `row-menu.tsx`. `adDrawer` (nav drawer). `ad__overlay` + `ad__command` (palette). `Popover` (menus). `addlg` dialog backdrop CSS. `onboarding/dialog.tsx`, `preview/site-modal.tsx` (public). `media-picker.tsx` has its own modal. Mostly consistent in practice, but names and in-file comments are stale ("a modal" vs "sheet").
- `ConfirmSwitch` (settings, inline confirm) is a third confirmation style next to `ask()` and the dialog.

### 4.8 Empty states (three components)
`bits.tsx` `Empty` (+ `sceneFor(title)` guessing the scene from the title string), `AdminState` (explicit kinds, used for page-level), `EmptyScene` (raw art). Inline hand-written empties too: users table (`settings/users.tsx:85`), `.adLS__none` in `ListSearch`, forms page "Questions". `Empty` and `AdminState` have different markup and spacing.

### 4.9 Status display
Pills are consistent in tones, but status is defined in many separate maps: `bits.tsx` (`STAGE_TONE`, `INV_TONE`, `HEALTH_TONE`, `APPROVAL_TONE`), client status in `clients/page.tsx:150`, `Pill` in `service-workspace-view.tsx`, inline ternaries (`team-workspace.tsx`, `email/page.tsx:62`). Forms use `ad__pill--brand` for "client" and "neutral" tone `ad__pill--neutral` in `team-workspace.tsx` (class has no CSS; renders as default grey). Project progress is shown 3 ways: chevron `ad__stageTrack` (admin), six-segment `.cpStages` (portal card), `.pProj__stages` (portal list).

### 4.10 Project page: three overlapping systems
`app/admin/projects/[id]/page.tsx`:
1. `delivery.tsx` `Deliverables` + `Tasks` + `Updates` + `AddNote` + `SetDue` (the original).
2. `ServiceWorkspace` (service records by kind, versions, decisions, notes; `workspace/service-workspace-view.tsx`).
3. `TeamWorkspace` (handovers, team tasks with dependencies, discussion and published updates).
Overlap: Tasks vs Team tasks; Updates vs Discussion and published updates vs service "Review conversation"; Deliverables (approve/revise, files) vs service records (approve/changes requested, versions). The portal mirrors this: "Deliverables" and "Updates" panels plus `ProjectWorkspace` below (`app/portal/projects/[id]/page.tsx:109,176,233`).

### 4.11 Notifications (three surfaces plus two preference pages)
- Bell popover (`shell.tsx:354-425`): counts unread forms + failed mail + posts in review; does **not** count the personal inbox, only links to it.
- Dashboard "needs attention" queue (`dashboard-view.tsx:60-160`): overdue invoices, stuck projects, failed events, failed mail, posts in review, changes asked, waiting tickets, unfinished onboarding.
- `/admin/notifications` and `/portal/notifications` (`workspace/personal-inbox.tsx`): workspace notifications (decisions, handovers).
- Preferences: Settings › Notifications (studio is emailed about, `notifications-form.tsx`), `workspace/personal-preferences.tsx` (inbox email mode, shown in Settings › Notifications and portal Settings), `security-email-preference.tsx` (account change email), `settings/security-email-form.tsx`.

### 4.12 Rich text
Two Tiptap editors: `rich-text-editor.tsx` (blog) and `email/eb-tiptap.tsx` (email), with different toolbars and extensions.

### 4.13 Charts
`cashflow-chart.tsx`, `.adRep__bars` (reports and email reports), `.adDash__chartBar` (dashboard, `dashboard.css:37-50` uses `#3d52e0` blue and `#e25a00`, not brand navy/orange), `.ad__barTrack`. No shared chart tokens, no shared tooltip, no axis component.

### 4.14 Misc
- Two Ticket UIs: admin `ticket-panel.tsx` (on client page) + `clients/support/[id]` `conversation.tsx` + `ticket-controls.tsx`; portal `support/[id]` reuses `conversation.tsx` (good) but `new-ticket-form.tsx` and `ticket-reply-form.tsx` are portal-only.
- Two comms logs: `comms-log.tsx` (what we sent) plus `log-message.tsx` (add a log), plus Settings › Email › log (`app/admin/(lists)/settings/email/log/page.tsx`) which is the same data in a paged table.
- Two audit views: `audit-log.tsx` (per record: client, project) and Settings › Audit log (global).
- Invoice reconciliation: `ClientReconciliation` / `InvoiceReconciliation` (`reconciliation.tsx`) vs page `/admin/money/reconciliation` vs Settings › System "Payments from Paystack".
- Payment setup spread across four places: Settings › Studio and invoices (payment accounts, currencies), Settings › Integrations (Paystack mode), Settings › System (Paystack events), Money › Reconciliation.

---

## 5. Design-system drift

### 5.1 Tokens and fonts
- **Two token systems.** Public/site: `--btn-fill/--btn-ink/--accent-fill/--accent-ink/--band` (`app/globals.css`). Dashboards: `--ad-*` in `admin.css:25-114`. They overlap in intent (accent, navy, ink) but are separate declarations. The admin button rule is documented as a separate rule from the public black/white pair (CLAUDE.md), but the redesign goal "one system" will need a mapping layer.
- **Two status colour sets.** Legacy `--ad-good/#1d9a63`, `--ad-warn/#b8860b`, `--ad-bad/#d63333` (`admin.css:38-40`) still used in 28 places (form errors, `ad__msg`, password bars, meetings alerts) next to the solid `--ad-tone-*` tokens. They disagree (`--ad-good` #1d9a63 vs `--ad-tone-good` #15803d).
- **Undefined tokens with fallbacks:** `--ad-focus` (`admin.css:455`, never declared), `--ad-raise` (`:1139`, `:1289`), `--ad-line-2` (`portal.css:15`), `--ad-sh-2` (`:451`), `--ad-good-ink` (`audit-table.css:57`).
- **Font:** `admin.css:50` and the rest ask for `--font-outfit`, but `app/globals.css:170` aliases `--font-outfit: var(--font-space-grotesk)`. Outfit is never loaded. At runtime everything is Space Grotesk. README Type section acknowledges this ("Match that runtime in previews"). CLAUDE.md still says "Outfit for body". The redesign must decide: truly load Outfit, or declare Space Grotesk everywhere.
- **Literal colours that belong in tokens:** `#7377ff` (dark-mode "done navy") in 7 places (`portal.css:26,36,199`, `dashboard.css:39,40,49,50`); chart colours `#3d52e0` / `#e25a00` / `#e8600f` (`dashboard.css:37-50`, 5 uses); `#4ade80` (`admin.css:477`, `media-library.css:110`), `#c62828`/`#a61f1f` hard-coded in `.adAsk` (`admin.css:1947-1948`) although `--ad-tone-bad` exists, `#1b7a43` (`admin.css:1627`), `#8e1b1b` (`:1665`), `#23239b` repeated (`:940, 1613`), `#c9cfdb`, `#d63333` in `delivery.tsx`, `#000065` in `case-editor.tsx` and `settings.css:248`, tour.css (14 hex), settings.css (`#8a8ca6`, `#5a5c8e` switch track, `#1a0dab`/`#4d5156` Google SERP preview: legit mimic). `money/document.css` (69 hex) is a printable paper page, intentional.
- Hex-in-TSX is essentially clean (2 occurrences).

### 5.2 Focus ring (real defect)
`admin.css:125-127`: global `.ad :is(a, button, [tabindex]):focus-visible { outline: 2px solid var(--ad-accent) }`. `--ad-accent` is `#ff6500` in light (`:31`), about 2.9:1 on white, below the 3:1 non-text minimum. README "States" says focus is `#c95000` light / `#ff6500` dark. About 72 `:focus-visible` rules use `var(--ad-accent)` (`admin.css:569, 799, 828, 969, 1062, 1104, 1157, 1213`, ...). `--ad-accent-ink` (#c95000) is the intended token. 21 `outline: none/0` rules exist; each should be checked for a replacement ring.

### 5.3 Translucent tints (forbidden by the repo's own rule)
Badges and pills are solid. Tints remain on **banners and hover states**, not pills:
- `.ad__msg.is-ok` / `.is-bad` (`admin.css:842-859`): `color-mix(in srgb, var(--ad-good) 12%, var(--ad-panel))` background and 35% border. 6 uses (`money/[id]/page.tsx` overpaid notice, forms, etc.). This is the exact "low-percentage wash" the rules forbid. The solid `.ad__banner--bad/--warn` (`:1341-1342`) is the compliant sibling; two alert idioms exist.
- `.ad__lineX:hover` (`:984`) 12% red wash. Focus glow `box-shadow: 0 0 0 3px color-mix(... 22%, transparent)` (`:803`). `.ad__bannerX:hover` `rgb(0 0 0/.12)`. `.ad__task:hover` / `.ad__logRow:hover` `rgba(127,127,160,.07)` (`:1139, 1289`). Hover washes are low risk but not tokens.
- `money/document.css:167-168, 321-322, 540-541` orange/brown/red `rgba(... .06-.07)` washes on the paper notes (printable page; flag only).
- Duplicate `.ad__banner` definitions at `admin.css:675` and `:1334` (second wins).

### 5.4 Native pickers
Admin date/time are already custom (via `Field type="date|datetime-local"`). Remaining native: `<select>` in `legal-editor.tsx:106` (section tab chooser), `type="color"` (`case-editor.tsx:173`), `type="range"` (`eb-panels.tsx:176`). Orphan native-select CSS at `admin.css:1225`. Public custom forms and onboarding are covered by the design system (`SelectField`, `DateInput`).
Dates written with `new Date().toISOString().slice(0,10)` as defaults (UTC) at `row-actions.tsx:370`, `money-forms.tsx:392, 684`; the picker itself uses studio-time (`pick.tsx studioToday`), so a payment recorded after 23:00 studio time defaults to the previous day.

### 5.5 Buttons
- `ad__btn--plain` (35 uses) and `ad__btn--ghost` (1, `settings/media/page.tsx:198`) have no CSS. They render as the default secondary. Harmless but meaningless; `Submit tone="plain"` also just omits the modifier.
- `ad__btn--danger` (10 uses) is an outline in red text (`color: var(--ad-bad)` #d63333, about 4.4:1 on white, borderline AA for 14px) until hover. README says irreversible actions are solid red behind a confirm; only `.adAsk` does that. `--ad-bad-ink` (#c62828) exists and is the right token for text.
- Pagination buttons `.ad__pgBtn` and row `⋮` `.ad__rm` have their own look. Primary buttons carry a coloured glow in light mode (`:629` `box-shadow: 0 6px 14px -6px rgb(0 0 101/.55)`); the comment at `:631` says the owner asked for no glow on Pay.
- Money header has five controls in one row (`money/page.tsx:152-165`: tour, Reports, Add expense, New estimate, New invoice), no clear single primary.
- Portal reuses admin buttons: consistent. Public black/white pair is deliberately not used in dashboards.

### 5.6 Touch targets under 44px
(The tour test `admin-buttons.spec.ts` covers some; these remain in CSS.)
- `.ad__rm` ⋮ button 36x36 (`admin.css:1053`), "44 of target with the cell padding" per comment: verify on the row.
- `.ad__rmItem` min-height 38px (`:1094`).
- `.ad__switch a` min-height 2.25rem = 36px (`:1207`). This segmented control is used on 6 pages (money, projects, blog, portal x3).
- `.adBulk__btn` 2.5rem = 40px (`:1773`).
- `.ad__sub .ad__subLink` 2.5rem (`:209`). Top bar icons 2.5rem under 760px (`:379`).
- `.adToast__act` 2.25rem (`:1999`). `.adDelUpload__list button` 36px (`:907`). `.ad__av` 36px is not a target.
- `.ad__iconButton` 2.25rem (`:171`, corrected to 2.75rem on coarse pointers only, `:175`).

### 5.7 Tables turned into cards on mobile
No violations found. `admin.css:498-531` explicitly keeps tables as tables with a pinned first column; `.sw-table` and `.workspaceCommunications__table` also scroll sideways. Portal lists use cards by design: **portal projects** (`.cpProjects` grid, `.cpProject` cards; `app/portal/(lists)/projects/page.tsx`) and the portal overview "Your projects" panel are card lists, not tables. That is a different list idiom from admin projects (table plus board), probably fine ("rail/grid when the set is the destination") but should be a deliberate choice. Messages and invoices in the portal: check `pBill__*` / `pSup__list` (list rows).

### 5.8 Inline styles and code style
- 242 `style={{...}}` in app/admin, app/portal and component TSX. Hot spots: `forms/[form]/entries/[entry]/page.tsx` (13), `clients/[id]/page.tsx` (11), `money/page.tsx` (9), `blog/[id]/page.tsx` (7), `settings/privacy/page.tsx` (7), `forms/demo-submission.tsx` (7). Examples: `clients/page.tsx` "By service" view is built from inline styles (`:179-203`), `email/page.tsx:62` inline small.
- Minified code: `components/workspace/*.tsx`, `meetings/*.tsx`, `settings/users.tsx`, `app/admin/(lists)/users/page.tsx`, `app/admin/meetings/page.tsx`, `app/admin/notifications/page.tsx`. 36 lines over 400 characters in `workspace/`, 16 in `meetings/`. They cannot be reviewed, themed or diffed like the rest.
- Mojibake: `service-workspace-view.tsx:35` renders `?` where a middle dot was meant (`{a.actor_name} ? version {a.version} ? {date(...)}`).
- Stale comments: tab bar mentions in `toast.tsx:18`, `settings.css:124`, `bulk.tsx:37`, `client/shell.tsx:25`, `tour-runtime.tsx:77,137`, `tests/more-sheet.spec.ts` (CLAUDE.md says no bottom tab bar).
- Inline hyphenless `ad__demo`/`DemoNote` and `ExampleNote` remain on pages (clients, money, projects, portal home): they say "invented data" while README says production never seeds demo data. Check what `ExampleNote` renders in production.

### 5.9 Loading and states
- Skeletons exist for the main routes (17 admin, 7 portal) but not for: Email hub, Users, Meetings, Reports, Notifications, Welcome, the Settings subpages (one shared `settings/loading.tsx` plus `settings/media/loading.tsx`). `meetings/admin.tsx` shows "Loading meetings…" text instead.
- Empty vs filtered vs error vs no-permission: well covered by `AdminState`. Meetings and Users show plain text for forbidden (`app/admin/meetings/page.tsx` renders a bare head, not `AdminState kind="forbidden"`).

### 5.10 Light/dark
Dark mode is token-driven and generally clean. Risks: the literal dark values (`#7377ff`, `#23237a`, `#14145a`, `#d6d6f5` in `portal.css:128-129`, `conversation.css:9-12`), `pick.css:145-151` re-declares tokens for a "public skin" (a third token scope), and `settings.css:174` Google result preview colours (intentional).

---

## 6. Page-by-page

### 6.1 Admin: 52 pages
Nav: 8 primary items (Dashboard, Clients [4 subs], Projects, Money [2 subs], Email, Blog, Users, Settings), plus account menu (My account, back to website, theme, sign out), bell, command palette, tour button. Reachable but not in the nav: Reports (button on Money), Notifications inbox (bell), Departments (button on Users), Welcome (redirect for new staff), form entries, support threads.

Legend: S = sheet (`Dialog`/`DialogButton`), C = confirm (`ask()`), T = table, Pg = Pager, Srch = search type.

**Dashboard** `/admin` (`dashboard-view.tsx`): attention queue, KPI tiles (owner: collected, outstanding, clients, tickets, projects, cash position, forms, due 30 days, spend, cover; staff: fewer, no money), cashflow bars, forecast, collected-of-billed, pipeline, deadlines, recent payments, quick actions, today strip, my work, recent leads, first week. Customise = `customise-dashboard.tsx` (hide 8 panels). No tabs. Actions: Quick actions, tour. No tables with pager.

**Clients (4 pages)**
- `/admin/clients`: tiles (4), tabs (Everyone / By service / Archived, `ad__tabsNav`), table (client, sector, buys, projects, owed, since, status, ⋮), Srch = GET form + Apply (q, service, dept, status) plus `DateRange`, Pg yes, bulk archive. S: Add client, Edit (menu). Actions: Add client, Export CSV, tour.
- `/admin/clients/[id]`: header `ProfileCard`; 13 blocks, no tabs: Projects, CurrencyBalances, Invoices, PortalAccess, Onboarding, Departments, Notes, ClientReconciliation, Payment history, Files and deliverables, Credit, Tickets, CommsLog. S: Edit, Merge, Archive, Add project, New invoice, credit forms. Tables: invoices, payments (unpaged).
- `/admin/clients/support`: tiles (3), GET filter + Apply, table, Pg, bulk. 
- `/admin/clients/support/[id]`: conversation thread (`conversation.tsx`), `ticket-controls.tsx` (status, assign).

**Forms (5 pages)** (nav: Clients › Leads and forms)
- `/admin/forms`: three groups of panels (Onboarding x6 services, Website: contact/newsletter, "Built here" custom forms), tiles (4), ListSearch.
- `/admin/forms/all`: cross-form entries, GET filters + DateRange, Pg.
- `/admin/forms/new`: New form (creates a custom form, then redirects to `/build`, which does not exist: see 7.5).
- `/admin/forms/[form]`: tabs Entries / Questions (read-only) / Settings (`adForms__tabs`), second row of status tabs (All|Submitted, Unread, Starred, Drafts, Spam, Trash), table with column picker, GET filters + DateRange, Pg, bulk actions. Panels: PrefilledLink, ImportSubscribers (newsletter), FormSettingsEditor (emails and tokens).
- `/admin/forms/[form]/entries/[entry]`: 8 panels (answers, Details, Version, Emails about this entry, Studio note, Subscriber, History, Subject), entry nav previous/next (`.adEntryNav`), assign to client (`assign-entry.tsx`), PDF route.

**Meetings** `/admin/meetings` (owner only; `meetings/admin.tsx`): view buttons Agenda/Day/Week/Month plus Calendar/Requests/History switch, table with BulkBar (approve etc.) and Pg, detail dialog "Meeting details", client-side search, fetches `/api/meetings`. Settings live separately at `/admin/settings/meetings` (tabs Availability, Booking rules, Reminders, Connections).

**Projects (2 pages)**
- `/admin/projects`: `ad__switch` Table / Board, GET filter form (q, service, stage, health...) + Apply, tiles (4?), table (pg) or kanban (`project-board.tsx`, move asks `ask()`), bulk. S: Add project.
- `/admin/projects/[id]`: ProfileCard with stage track and mover, 5 money tiles (owner), panels: Deliverables, Tasks, Spent on it, What was agreed, Due date, History, Invoices, then `ProjectWorkspace` (service records, members, team workspace), then audit log. S: Edit details, New invoice, Add expense, Add deliverable, task, note. No tabs.

**Money (3 pages)**
- `/admin/money`: 5 KPI tiles, banner (unreconciled), CurrencyBalances, cashflow, who owes what, **Invoices** (GET search + status `ad__switch` + DateRange, table, bulk, Pg), spend breakdown, Expenses (table), Estimates (table), Payments received (table). Only invoices are paged. Header: tour, Reports, Add expense, New estimate, New invoice (all S).
- `/admin/money/[id]` (invoice): 4 tiles, Lines, Payments (⋮ per payment: record, refund, reverse, print receipt, email), "The client's copy" (QR + link), overpay notice, Reconciliation, Reminders, CommsLog. No Print/PDF button on the page itself: "Print invoice" is in the ⋮ menu (`row-actions.tsx:296`) and opens `/i/<token>`; PDF is on the public page.
- `/admin/money/reconciliation`: "Needs somebody", messages that did not go, "Everything Paystack has said" (ListSearch; unpaged).
- Reports `/admin/reports` (owner): DateRange, 5 tiles, panels (month by month, who paid most, how they paid, where it went), CSV export. Linked only from Money header.

**Email (5 pages)** `/admin/email` (owner): tabs Contacts / Campaigns / Automations / Templates / Reports (`ad__tabsNav`). Contacts: tiles, search (debounced URL), filters, table with bulk bar `ctBulk`, Pg, sheets for import/export/new contact (`contacts-sheets.tsx`). Campaigns: GET search, table, Pg. Automations: tile grid. Templates: table of 15 email kinds with Design/Edit. Reports: tiles, bar chart, campaigns table.
- `/admin/email/templates/[kind]`: email builder (design editor).
- `/admin/email/campaigns/[id]`: campaign detail with builder, schedule, results.
- `/admin/email/contacts/[id]`: contact record.
- `/admin/email/automations/[id]`: workflow canvas (nodes, panel tabs).
- Header lede still says "Design the emails the studio sends", although the default tab is Contacts.

**Blog (4 pages)**: `/admin/blog` (posts: state filters, GET form + Apply, bulk, Pg, Trash panel with Delete permanently), `/admin/blog/work` (case studies, ListSearch), `/admin/blog/[id]` (editor: `blog-editor.tsx`, cover, social image, revisions, submit for review, publish), `/admin/blog/work/[slug]` (`case-editor.tsx`). `BlogTabs` segmented switch at top. Tiles (4) on posts only.

**Users (3 pages)**: `/admin/users` (owner; tabs Team / Invitations / Clients, GET filters, table, Pg, bulk, invite sheet, roles table in a `<details>`), `/admin/users/[id]` (security notices), `/admin/users/departments`. The "Clients" tab lists client accounts (duplicates `/admin/clients` portal access). `/admin/settings/team` and `/admin/settings/access` redirect here.

**Notifications** `/admin/notifications` (personal inbox; `notifications-inbox.tsx`; inbox list + detail, preferences dialog) and **Welcome** `/admin/welcome` (staff onboarding).

**Settings (21 pages)** `/admin/settings` overview + 20 sections in a side list with groups (`lib/settings/sections.ts`; group "People" is declared but empty):
- You: My account `/account`.
- Studio: Studio and invoices `/general` (money settings + payment accounts + reminders + numbering), Business profile `/business`, Meetings `/meetings`, Notifications `/notifications`, Website and SEO `/site`, Maintenance `/maintenance`, Email `/email` (+ `/email/connections`, `/email/log`).
- Content: Blog and site copy `/content`, Policies `/policies` (+ `/policies/[slug]` editor), FAQ `/faq`, Media library `/media`.
- System: Integrations `/integrations`, Privacy and data `/privacy`, Audit log `/audit`, Error log `/errors`, System health `/system`.
- Most use `SettingsForm` (save bar). Tables: audit (GET + Pg), email log (GET + DateRange + Pg), media grid (GET + Pg), errors. Search: side-nav search plus overview search (`settings-nav.tsx`, `settings-overview.tsx`).

### 6.2 Staff: same routes, role-filtered
Reachable (14): Dashboard, Clients list/detail (no money panels, no archive/merge/export), Support list/detail, Forms (5 pages), Projects list/detail (no budget, no money tiles), Blog (4 pages), Settings (account + 4 content pages + policies detail = 6), Notifications, Welcome. Not reachable: Money (3), Reports, Email (5), Meetings, Users (3), 15 Settings sections.

### 6.3 Portal: 9 pages
Nav: 5 items (Overview, Projects, Billing, Messages, Settings). Billing and Messages are hidden per client permission (`canBilling`, `canSupport`). The bell (`/portal/notifications`) and welcome are outside the nav. Max 6 target: fits, with room.
- `/portal` Overview (`page.tsx`): greeting, banner, 4 tiles (Active projects, Awaiting your review, Balance owed, Support), panels: Needs your attention, Your projects (cards), Recent updates (feed), Quick actions, meetings panel (`meetings-panel.tsx`).
- `/portal/projects`: `ad__switch` Active / Delivered, ListSearch, project cards (no pager).
- `/portal/projects/[id]`: stage track, `ProjectTimeline`, Deliverables (approve/request changes via `deliverable-actions.tsx`, signed file open/download, decision history), Updates, What we are making, Money on this project, `ProjectWorkspace` (service records and decisions, members, client-visible team updates).
- `/portal/billing`: CurrencyBalances, invoices table (`ad__switch` Open/Paid, ListSearch, Pg), `PayForm` (Paystack/Flutterwave), Payments you have made.
- `/portal/support` (Messages): `ad__switch` Open/Closed, ListSearch, `NewTicketForm`. `/portal/support/[id]`: `conversation.tsx` plus reply form.
- `/portal/settings`: Notifications (inbox mode + security email), Profile (name, photo, theme), Project access (members), Sign-in (password).
- `/portal/notifications`: personal inbox (same component as admin). `/portal/welcome`: one-time profile.
- Not in portal, though clients may expect them: files (only inside project deliverables), receipts list (inside billing), meetings list (only a panel on Overview).

---

## 7. Deep dives

### 7.1 Money
- **Pages:** list (`money/page.tsx`, 584 lines), invoice (`money/[id]`), reconciliation, reports. Public documents `/i/[token]`, `/q/[token]` (estimate), `/r/[token]` (receipt), `/pay/*` checkout.
- **Records:** invoices, estimates, expenses, payments, credit, refunds, reversals. Forms in `money-forms.tsx` (696 lines) and `row-actions.tsx` (810 lines): record payment, refund, reverse, void invoice, send reminder, credit, send receipt.
- **Structure problem:** one scrolling page with six panels and four tables (invoices paged; estimates, expenses, payments not paged). The page mixes dashboard (tiles, cashflow, owes) and ledger. Natural tabs: Overview, Invoices, Estimates, Payments, Expenses, plus Reconciliation and Reports as sub-views.
- **Free-text "by" fields:** `Struck by`, `Refunded by`, `Reversed by`, `Who said so` (`row-actions.tsx:414, 542, 580, 776`) with placeholder "Babatope". The actor is known from the session, so these should be implicit (the audit log already records the session user).
- **Payment methods UI:** payment accounts (bank details, USD fields: routing, SWIFT, IBAN) sit inside Settings › Studio and invoices (`settings/payment-accounts.tsx`, `studio-form.tsx:21`). Provider mode in Settings › Integrations (`paystack-form.tsx`). Provider events in Settings › System and Money › Reconciliation. Checkout for clients: `components/money/pay-form.tsx` (NGN: Paystack or Flutterwave; USD: Flutterwave).
- **Receipts:** POS-style overview on `/r/[token]` (`receipt-printer.tsx`), "View full receipt" `?view=full`, PDF at `/r/[token]/pdf` (`lib/money/receipt-pdf.ts`), admin `money/[id]/receipt` route. Print opens the PDF inline (`?print=1`). `ReceiptControls` on public pages. Invoice Print is a ⋮ menu item, not on the invoice page.
- **PDF generators:** three separate pdf-lib drawers: `lib/money/receipt-pdf.ts` (88 lines), `lib/legal-pdf.ts` (100), `lib/forms/entry-pdf.ts` (307) ("drawn in the same style as the entry PDF"). Invoice/estimate PDFs share the receipt one. One PDF kit would simplify branding changes.
- **Document skin** `money/document.css` is an intentionally light paper with 69 hard-coded values (fixed white, so no dark mode on `/i`, `/q`, `/r` by design).
- **Currency:** NGN/USD kept separate (`CurrencyBalances`). Money rule "never fabricated totals" is respected (sums from rows, `lib/admin/money-rules.ts`).
- **Portal side:** `/portal/billing` shows invoices only to clients with the `billing` permission. No receipts list. Pay button is the sanctioned orange fill exception.

### 7.2 Projects
- **Detail structure:** header (`ProfileCard` with stage track and `StageMover`, confirm on move) then money tiles (owner) then ten blocks, no tabs (see 6.1). Board and table are two views on the list.
- **Deliverables:** `delivery.tsx` `Deliverables` (426 lines): versions, files (`DeliverableUpload`: media library files or links, validated R2 keys, signed open/download on the portal), approval states (`ApprovalPill`: Not sent, Awaiting client, Approved, Revision requested). Client acts through `client/deliverable-actions.tsx`.
- **Reviews and revisions:** two systems. (1) Deliverable approve/request revision with `DeliverableDecisionHistory` (portal page). (2) Service records "review conversation" with versions, notes (resolved/open), decisions per version (`service-workspace-view.tsx`), kinds by service via `lib/workspace/service-model.ts`. `revisions.tsx` in admin is for blog posts and FAQ history only (name collision).
- **Tasks:** `delivery.tsx` `Tasks` (simple checklist, `project-task-toggle` test) vs workspace team tasks (assignee, deadline, handover dependency, blocked state). Two models of a task on one page.
- **Updates:** `Updates` (project updates by `channel`) vs "Discussion and published updates" (internal vs client-visible notes, replies). Two ways to tell a client something.
- **Members/access:** `ProjectMembers` (project access for client contacts and staff), owner field (`OwnerField`) on details. Roles: staff must be in `ownerIds` or members to manage.
- **Portal view:** stage track, ProjectTimeline, Deliverables, Updates, What we are making, Money on this project (only if the client may see billing), then workspace.
- **Performance/UX:** `ProjectWorkspace` is rendered unconditionally and can show a "workspace migration" error panel if its tables are missing (`project-workspace.tsx`).

### 7.3 Email
- Hub `/admin/email` (owner only, `AreaGate area="settings"`): five tabs. `lib/email-registry.ts` lists 15 designed kinds (invoices, receipts, reminders keep built-in design). `email-templates.ts` is 2,212 lines.
- **Builder** (`email-builder.tsx`): Tiptap blocks on a 600px canvas with brand header/footer, drag and drop, merge-tag chips, conditional blocks, desktop/dark preview, "Send me a test", versions and enable switch per kind. Side panel tabs Blocks / Tags / Settings / Checklist. Lazy chunk (good).
- **Campaigns:** list (GET search + status), detail page with the same builder, schedule ("Send on" uses `datetime-local` picker, "Lagos time" hint), batch sending, results tab.
- **Automations:** node canvas (`automation-canvas.tsx`, `lib/automations-flow.ts`), tile grid on the tab, step panel with Setup/Results tabs.
- **Contacts:** `contacts-view.tsx` (the one live debounced search), import/export sheets, tags, consent status (subscribed/unsubscribed/bounced/complained). `/admin/forms` newsletter is a second place subscribers live (forms entries) vs Email › Contacts. `components/admin/forms/import-subscribers.tsx` imports into the newsletter form, not into Contacts.
- **Reports tab** is a fourth analytics view alongside Money › Reports and the dashboard.
- **Naming clash:** Settings › Email (sender, connections, send log) vs nav "Email". Two "email logs": Settings › Email › log (messages sent) and CommsLog per record.
- Hex in `email-builder.css` (58) and `automation-canvas.css` (18) include literal brand colours for the email canvas and node colours; the node colours are not tied to the tone tokens.

### 7.4 Forms and onboarding
- Forms are **defined in code**, not built in the UI: six onboarding forms (web, branding, seo, social, apps, software; `lib/onboarding-services/*.ts`, `lib/onboarding.ts` 552 lines, UI `components/onboarding/onboarding-form.tsx` 1,583 lines), Contact, Newsletter (`lib/forms/registry.ts`). Admin "Questions" tab is a read-only listing of what the form asks (`forms/[form]/(form)/page.tsx` `Questions`). Admin cannot edit onboarding questions; it can edit emails/tokens and open/close dates (`form-settings.tsx`).
- **Custom form builder (broken):** `components/admin/forms/form-builder.tsx` (294 lines) + `form-builder.css` + `tests/form-builder.spec.ts` exist, `lib/forms/custom-actions.ts:41` redirects to `/admin/forms/<key>/build` after "New form", and the Tabs "Edit form" link (`forms/[form]/(form)/page.tsx:65`) points there. **No `build` route exists** (`find app -path '*build*'` returns nothing; `FormBuilder` is imported nowhere; `git log` shows the component arrived in merge 6213040 without its page). Result: creating or editing a custom form lands on `app/admin/[...rest]` 404. Verify in a running build, but source evidence is conclusive. Public rendering `components/forms/custom-form-view.tsx` and `/f/[slug]` exist.
- Second orphan: `components/client/support-button.tsx` (`ClientSupportButton`, listed in README as the way to open a read-only support view) is imported nowhere.
- Entry detail: answers, assign to existing client or create (`assign-entry.tsx`: search existing clients first, per owner rule), PDF, attachments, studio note, history. Entry list: column picker (cookie), status tabs, bulk actions, spam/trash.
- **Prefilled links** (`prefilled-link.tsx`) per form. **Drafts** tab for onboarding (partial entries).
- Two tab rows on one page (Entries/Questions/Settings and the status tabs).

### 7.5 Settings
- 21 pages (6.1). Side list `settings-nav.tsx` with search; overview `settings-overview.tsx` repeats the same list as a one-column set of panels (README "Settings overview"). Search: both menus have one.
- Save bar (`SettingsForm`) described in 3 above; flat disabled controls with reason, hints under inputs as per rules. Inconsistent: policy editor and FAQ editor save per section with their own buttons and revision lists.
- Some sections are not settings: Audit log and Error log (log tables), System health (tools: retry, cache, migrations, environment report), Media library (a full media manager with folders, uploads and a tray: `media-library.tsx` 542 lines + `media-folders.tsx` 465 + CSS 272), Policies (document editor). They share the chrome but not the settings idiom.
- Group "People" is declared in `SETTINGS_GROUPS` with no sections.
- Staff reach Settings only for Content.

### 7.6 Users, roles and permissions
- `/admin/users` (owner): Team / Invitations / Clients tabs, filters (q, role, status, size), bulk actions with reviewed outcomes dialog, export (CSV/XLSX route `/api/admin/users/export`), invite sheet (`UserInviteButton`), per-user detail (security notices `security-notice-retry.tsx`), member controls (name change dialog, deactivate, sign out devices, reset, support view: owner only, read-only 15 min, reason required).
- Roles: owner and staff plus client accounts. A static comparison table only. No custom roles, per-user area toggles, or department-based access.
- Departments: separate page (`/admin/users/departments`) and also attachable to clients (`ClientDepartments`) and chosen on staff welcome; they filter clients (`dept` filter) but grant nothing.
- Client account management is split: Users › Clients (accounts) vs Clients › Portal access (`portal-access.tsx`, invites, per-client permissions billing/support/review).
- Code style: users page and `settings/users.tsx` are minified one-liners.

### 7.7 Blog
- Posts: states draft / review / published / trash (`blog-db.ts`). Review needs an owner; staff can write (`content` area). List with GET filter and bulk, Trash panel (permanent delete owner only, "I understand").
- Editor: `blog-editor.tsx` + `rich-text-editor.tsx` (Tiptap) + `cover-field.tsx` + `social-image-field.tsx` (OG preview) + `revisions.tsx` + `MediaPicker`. Lives at `/admin/blog/[id]`.
- Case studies: `/admin/blog/work` and `case-editor.tsx` (own editor, palette with `<input type="color">`, gallery). Segmented tabs Posts / Case studies (`blog-tabs.tsx`).
- Settings that belong to Blog are in Settings › Content (blog defaults, "what is set in code"), FAQ, Policies, Media.

### 7.8 Reports
`/admin/reports` (owner; `reports/page.tsx`, 119 lines): DateRange, 5 tiles, 4 panels (month by month, who paid most, how they paid, where it went) using CSS bars; CSV export (`reports/export/route.ts`). Not in the nav. Other analytics: dashboard cashflow, Money cashflow chart, Email › Reports. No charts library, no tooltips; no staff or project profitability report beyond per-project margin tiles.

### 7.9 Meetings
Admin: `/admin/meetings` (owner only), `components/meetings/admin.tsx`. Views Agenda/Day/Week/Month, Calendar/Requests/History, approve/decline bulk, detail dialog. Own calendar grid (`meetings/calendar.tsx`) separate from the date picker's calendar (`pick.tsx DateInput`). Public: `/meet` (`booking.tsx`, 4-step), `/meet/manage/[token]`. Settings: `/admin/settings/meetings`, 4 tabs inside the page. Portal: `meetings-panel.tsx` on Overview only. README says production booking stays disabled until migration, provider and webhook are verified. A `prototypes/cal-meetings` design preview exists. Code is minified; CSS one line.

### 7.10 Notifications and Support
- Notifications: see 4.11. Preferences per category and mode (`lib/workspace/notifications-policy.ts`), recipient-controlled as required. `Settings › Notifications` is "what the studio is emailed about" (owner), a different thing under the same name.
- Support: admin `/admin/clients/support` (tickets list) and `[id]` (thread + status/assign), `TicketPanel` on the client page, dashboard tile and attention row; portal "Messages" with new ticket and thread. Called "Support" in admin, "Messages" in the portal nav (`lifebuoy` icon), "Support" tile on portal Overview. Attachments/files not supported in tickets (not found in `new-ticket-form.tsx`).

---

## 8. Consolidation ideas

Owner limits: portal max 6 main pages, admin max 8 (sub-pages allowed), staff fewer than admin.

### 8.1 Proposed structure (one route tree, one shell, role-filtered)
**Portal (5 to 6):** Overview, Projects (with files, billing and messages for that project inside the project page), Billing, Messages, Settings. Optionally merge Messages into Projects as a per-project thread plus a global "Messages" list. Already 5; no growth needed. Bell (inbox) moves into Overview or the shell.

**Admin (8):** Dashboard, Clients (clients, support, leads/forms, meetings), Projects, Money (overview, invoices, estimates, payments, expenses, reconciliation, reports), Email (contacts, campaigns, automations, templates), Blog (posts, case studies, plus FAQ, Media library, Policies, blog defaults), People (users, departments, invitations, roles, client accounts), Settings (everything else, in 6 groups). That is 8 with Blog and People as exceptions. Staff: Dashboard, Clients, Projects, Blog (5 or fewer).

### 8.2 Candidates (each with paths)
1. **Settings 21 pages to about 9.** Merge: Studio and invoices + Business profile + Notifications = Studio. Site + Maintenance = Website. Email (+ connections, log) as one page with tabs. Integrations + Privacy + System + Errors + Audit = System with tabs. Content group (Blog and site copy, Policies, FAQ, Media) moves under Blog; Meetings settings under Meetings; My account under the avatar menu. Remove the empty "People" group and the overview page that duplicates the side list.
2. **Money tabs.** Replace the six stacked panels with tabs (Overview | Invoices | Estimates | Payments | Expenses | Reconciliation); Reports becomes a view. One primary action (New invoice), the rest in a "New" menu.
3. **Project detail tabs:** Overview, Deliverables and reviews, Tasks and team, Money, Files, Activity. Merge `Tasks`/team tasks, `Updates`/discussion, `Deliverables`/service records into one model. Same tab set on the portal (Deliverables, Updates, Money).
4. **Client detail tabs:** Overview, Projects, Money (invoices, payments, credit, reconciliation), Messages (tickets + comms log), Files, Settings (portal access, departments, notes, onboarding).
5. **One `Tabs` component** replacing `ad__tabsNav`, `ad__switch`, `adForms__tabs`, `eb-tabs`, `adWf__tabs`, meetings button-tabs, `sw-tabs`. Sizes: page-level (underline), in-card (segmented, 44px).
6. **One list toolbar** (search live, filter chips/popover, date range, view switch, export, primary action) replacing 7 filter-form classes and the Apply button. Live URL-driven search (debounce) everywhere like Contacts; keep GET URLs so filters stay shareable. Retire `ListSearch` DOM mutation, and make it work with paging by moving to the server or loading the full list.
7. **One `DataTable`** (pinned first column, selection with bulk bar, sort, empty/no-results states, `Pager`) replacing `.ad__t` + `BulkBar` DOM-id coupling + `.sw-table` + `.workspaceCommunications__table` + entries table. Row ⋮ menus unchanged.
8. **One shell** for admin and portal.
9. **One empty-state component** (kind + icon + one action), retiring `Empty`'s title-sniffing `sceneFor`.
10. **One form kit** with an optional save bar: make `Form` accept `dirtyBar` so Settings, FAQ, policies and account all behave the same; delete the `Row/Text/Switch` duplicates where `Field` and `Switch` can serve.
11. **One alert/banner**: delete `.ad__msg` tints in favour of `.ad__banner--*` solid tones (and add `good` and `info`).
12. **One rich-text editor** used by blog and email blocks (toolbar, link dialog, image picker).
13. **One chart kit** (bars, line, donut; tokens for series colours from brand tokens; one tooltip). Replace `#3d52e0/#e25a00` pairs.
14. **Notifications:** one inbox page fed by dashboard attention items + workspace notifications + system alerts (failed mail, unreconciled payments), the bell showing the total. One preferences page.
15. **People:** Users + Departments + client accounts + roles table into one People page. Client accounts live on the client record (portal access), so remove Users › Clients or make it a filtered view of the same list.
16. **Email subscribers** merge: Newsletter form entries and Email › Contacts are the same people.
17. **PDF kit** shared by invoices, receipts, entries, policies (`lib/*-pdf.ts`).
18. **Remove dead code:** `form-builder.tsx` (or finish its route), `support-button.tsx`, `.ad__filters select` CSS, `ad__btn--plain/--ghost` modifiers (or define them), duplicate `.ad__banner`, stale tab-bar comments and `more-sheet.spec.ts`.
19. **Tours:** 211 steps depend on current DOM. Decide whether to keep Joyride tours or replace with short empty-state hints plus a help panel; any restructure needs `lib/tours/admin.ts` / `client.ts` rewrites.
20. **Tests:** 177 test files; many selectors target `ad__*` classes and tour ids; plan for a selector migration (data-testid layer).

### 8.3 Order of work suggestion (lowest risk first)
Tokens (fix focus ring, add chart and "done" tokens, define missing tokens), alert/banner, Tabs, Toolbar, DataTable, Shell merge, then page restructures (Settings, Money, Project, Client), then deletion of dead code and tour/test migration.

---

## 9. Inspo ideas (components/interactions only; 26 PNGs, not a style to copy)

All in `/tmp/claude-0/-home-user-wdc/9f63f343-f2fc-572f-8909-9449f9c19e38/scratchpad/inspo/inspo/`.

- `image.png`: segmented step bar at top of a multi-step flow, with "Go back" at left and "Skip Step" at right. Fits onboarding and the payment flow. The vertical check-circle timeline (left) suits portal payment/receipt status and project history.
- `image copy.png`: in-card segmented tabs (Overview | Availability), soft "Next available" highlight card, label/value rows with hairlines, paired secondary + primary buttons at the bottom. Good for a project or client overview card.
- `image copy 2.png`: integration cards with a Manage link plus toggle in the footer, toolbar with Search, primary Add and Filters button. Good for Settings › Integrations and Email automations tiles.
- `image copy 3.png`: task side sheet with a two-column metadata grid (Assignees, Status, Priority, Due), Comments | Change history tabs, and an Internal / External visibility switch on each comment and the composer. Directly maps to our project notes (internal vs published to client) and the project/task side sheet; also board columns with count chips.
- `image copy 4.png`: KPI tiles with an arrow link in the corner, one highlighted (solid) tile, reminders card, team collaboration list. Tile idea: whole tile links to its list (we have `href` on `Tile`).
- `image copy 5.png`: "Add widget" side sheet with preview thumbnails and a Select button per widget, tagged by category; top toolbar with date range chip, Add widget and Export; chart tooltip on hover. Maps to dashboard customise (replace the checkbox list in `customise-dashboard.tsx`).
- `image copy 6.png`: quick-action tiles in a row (Request, Send, Receive) and small solid delta chips (+14%, -24%). Quick actions on dashboard and client portal.
- `image copy 7.png`: top-level section tabs in the header bar (Overview, Clients, Projects, Inbox, Analytics) and a "Manage Projects" table with count-chip tabs (Priority 02, Active 04, Draft 02, Completed 08) in the panel header. Count chips on status tabs for invoices, projects.
- `image copy 8.png`: report page toolbar: period dropdown + date range + settings + primary Create button; summary tiles beside a timeline calendar; history table with search, Filter and column-settings icon, status chips, row ⋮. A good Money/Reports and Meetings page template; the table toolbar pattern (search with shortcut hint, Filter, column settings) is the one to borrow.
- `image copy 9.png`: week view with mini-month at left and a floating "+" create button. Candidate for Meetings admin.
- `image copy 10.png`: stacked meeting rows (time, person, date, status chip, avatars, edit and ⋮) next to a month picker with AM/PM time stepper. Good for the portal's upcoming meetings list and the time picker.
- `image copy 11.png`: month grid with a Filter popover, "Today" and "Clear All" in the header. Month view for meetings.
- `image copy 12.png`: calendar page header: breadcrumb, title, All events | Teams | Public tabs, search with shortcut hint, Schedule + primary Add event; Today with arrow buttons and a Month-view dropdown. Meetings and Money page header pattern.
- `image copy 13.png`: "Add Schedule" popover with a type switcher (Task | Event | Reminders | Appointment) at the top of a compact sheet. One create sheet with a type switch (e.g. "New" for invoice/estimate/expense).
- `image copy 14.png`: project page with a tab row that carries count badges (Discussions 5, Notifications 5), key/value project info block with inline chips and avatars, attachments with View and Download, and a right rail of Team chat and Recent activity. Direct model for the project detail tab structure and a right-hand activity rail.
- `image copy 15.png`: projects list with Table View | Kanban View underline tabs, search field and Filters button in one row, table with a progress bar column. Projects list toolbar and board toggle.
- `image copy 16.png`: pill-shaped time filters (Today, This Week, This Month, Reports) in the header, My Tasks with Today/Tomorrow chips, Invoice Overview as horizontal status bars with count and amount. Invoice status overview bars for Money.
- `image copy 17.png`: client-facing project timeline as chevron phases with days, status/paid/due summary in the header, a To-Do/Done tab list with "Due very soon / soon" chips, and a right column with project links and "Copy link". Strong reference for the portal project page (stage track, client tasks, links).
- `image copy 18.png`: finance dashboard with tab-like segmented Monthly/Weekly/Yearly on a chart, a transactions table with a status chip and row ⋮, savings goal bars. Segmented period switch on a chart header.
- `image copy 19.png`: top-level tabs inside a page (All Transaction, Saving Plan, Schedule Payment, Transaction History) above a table with search/filter/"This Month" icons, pagination footer with numbered pages and Previous/Next. Money page tab model and page-number pagination.
- `image copy 20.png`: KPI tiles with a ⋯ menu per card, a donut with callouts, budget rows with progress bars. Card ⋯ menu for hide/export per dashboard panel.
- `image copy 21.png`: header with date and a two-level tab bar (section tabs with a sub-tab row beneath, count chips), breadcrumb, side rail with "Expense list" and a search bar that explains what it matches. Two-level nav inside a section (Money > Reports > ...).
- `image copy 22.png`: workflow builder: node list in the centre, a right-hand editor panel for the selected node, bottom canvas toolbar (zoom, fit, minimap), top bar with Back, Save, Test, undo/redo. Matches our automation canvas; the right panel and bottom toolbar are the pieces to borrow.
- `image copy 23.png`: reports list: toggle filter chips (Meeting, Topic) plus dropdowns (Group, Source, Tag), table with status chip and ⋮, numbered pagination plus "Showing 1-20 of 260 entries". A filter-chip row for the unified toolbar.
- `image copy 24.png`: three-pane inbox: views list with count chips, conversation list with search, thread, and a right "Details" panel with collapsible sections and a Details | Copilot tab. A model for admin Support (or a single Messages inbox: list, thread, client/project details beside it).
- `image copy 25.png`: email builder: block-type grid (Button, Content, Section, List) with preview tiles on the right, inline variable chip with a fallback popover, top breadcrumb, undo/redo, formatting toolbar, "Send Preview" button, side tabs Blocks / Recipient / Tag / Content Guide. Close to our builder; borrow the block-type tiles and the variable fallback popover.

---

## Appendix: quick reference of verified facts and locations

- Staff routing: `lib/roles.ts:17-27`; permissions: `lib/admin/permissions.ts`; nav: `components/admin/shell.tsx:63-95`; portal nav: `components/client/client-nav.ts`.
- Page counts: `find app/admin -name page.tsx | wc -l` = 55 (2 redirects: `settings/access`, `settings/team`; 1 catch-all `[...rest]`), portal = 10 (1 catch-all). Admin route handlers: 15 (exports, PDFs, receipt). Portal: none.
- Orphans: `components/admin/forms/form-builder.tsx`, `components/client/support-button.tsx`.
- Missing route: `/admin/forms/<key>/build` (linked at `app/admin/forms/[form]/(form)/page.tsx:65`, redirect at `lib/forms/custom-actions.ts:41,52,80,94`).
- Focus ring: `components/admin/admin.css:125-127`; undefined `--ad-focus`: `admin.css:455`.
- Tinted alerts: `admin.css:842-859`; duplicate banner: `:675` and `:1334`.
- `ad__btn--plain` (35 uses) / `--ghost` (1): no CSS rule in `app/` or `components/`.
- Sub-44px: `admin.css:209, 379, 907, 1053, 1094, 1207, 1773, 1999`.
- Font alias: `app/globals.css:170-172`.
- Inline styles: 242 `style={{` across app/admin, app/portal and dashboard components.
- Minified code: `components/workspace/*.tsx`, `components/meetings/*.tsx`, `components/admin/settings/users.tsx`, `app/admin/(lists)/users/page.tsx`, `app/admin/meetings/page.tsx`, `app/admin/notifications/page.tsx`.
- Tests: 177 files in `tests/`. Tours: `lib/tours/admin.ts` (167 `id:`), `lib/tours/client.ts` (44).
- Not verified at runtime (no dev server was started): the `/build` 404, rendered contrast of the focus ring, and 44px target measurements; each rests on source evidence only.

---

# Second pass: whole-product UI

Method and limits. Everything below was verified by opening or grepping source in this session (file:line given). No dev server or browser was started, so contrast ratios, rendered sizes, bundle sizes and runtime behaviour are NOT measured; where a finding rests on source alone it says so. The owner's UX skill was read at `/tmp/claude-0/-home-user-wdc/9f63f343-f2fc-572f-8909-9449f9c19e38/scratchpad/skills/szilu` (SKILL.md plus references 03, 07, 11, 17, 19, 21, 22). It is cited as `[ux:NN]` next to findings it informs. Repo rules in CLAUDE.md win on conflicts: the skill's "3-5 item mobile bottom bar" is NOT applied (we have the drawer, no tab bar). Two earlier errors in section 3 are corrected here: a shared hint control does exist (`HintTip` in `form.tsx:~255`, reusing onboarding `Tip`), and `Connectivity` is mounted from the root layout so it does reach the dashboards.

## S1. Controls (buttons, links, inputs, pickers)

Verified clean:
- No `div`/`span`/`li` with `onClick` anywhere in app/admin, app/portal, components/admin, client, workspace, meetings, money (grep returned nothing). No `role="button"` hacks. Good for agentic browsing and keyboard [ux:03].
- One icon family: lucide-react (189 imports). Exceptions: inline SVG in `nav-drawer.tsx:34` (hot dog menu, by design), `dashboard-view.tsx`, `email/automation-canvas.tsx`; `tour/tour-icon.tsx` pulls from another icon package. No emoji.
- `Select`/`Pick` is the designed combobox with ArrowUp/Down, type-ahead and search above ten (`pick.tsx:195-222`), `RowMenu` has `aria-haspopup="menu"` + arrow keys (`row-menu.tsx:191-240`).

Defects:
1. **Buttons without `type`** (default to submit inside any form): `app/admin/error.tsx:20`, `app/portal/error.tsx:20`, `forms/entry-actions.tsx:19-26`, `forms/entries-table.tsx:55-70` (these are intentional submits with `name/value`, but the unlabelled ones at `:65-70` are plain `<button>` inside a menu). Low risk, but the repo has no lint rule for it.
2. **Meaningless modifiers:** `ad__btn--plain` (35 uses) and `ad__btn--ghost` (1) have no CSS (re-verified, none in any `.css`). `ad__pill--neutral` (`team-workspace.tsx`) also has no rule (only `--flat/--good/--warn/--bad/--live/--brand` exist, `admin.css:603-608`). These render as the default style and hide the intended hierarchy.
3. **Equal-weight buttons** [skill "generated-UI defaults"]: Money header has five controls (tour, Reports, Add expense, New estimate, New invoice; `money/page.tsx:152-165`); only the last is a primary. Client page header has seven (`clients/[id]/page.tsx:124-140`: tour, Archive, Merge, Edit, Add project, New invoice...). The rule "one primary per area" (README Buttons) is met, but secondary actions are not grouped into a menu.
4. **Native pickers left:** `<select>` `legal-editor.tsx:106`, `type="color"` `case-editor.tsx:173`, `type="range"` `eb-panels.tsx:176`. (Date/time already custom via `Field`.)
5. **UTC date defaults** for "today" at `row-actions.tsx:370`, `money-forms.tsx:392,684` while the picker uses studio time (`pick.tsx studioToday`).
6. **Free-text actor fields** ("Struck by", "Refunded by", "Reversed by", "Who said so", `row-actions.tsx:414,542,580,776`), placeholder "Babatope": a person's name typed into a financial audit action. [ux:07 "ask only for what you need"]
7. **Colour picker:** the admin has no designed colour input; `case-editor.tsx` uses the browser's, onboarding has its own `ColourField`. Two colour paradigms.
8. **File upload:** `FileDrop` (good), but `media-library.tsx`, `delivery.tsx` `DeliverableUpload`, `forms/entry-attachments.tsx`, `onboarding/dropzone.tsx` each carry their own progress/error UI (4 upload UIs).
9. **Links styled as buttons** are used heavily (`<Link className="ad__btn">` for Export CSV, Back, Clear; `a.ad__pgBtn`): correct semantics (navigation), but `ad__btn--primary` on a link in `row-actions` menus is mixed with form `button`s. Fine.
10. **Switches/checkboxes:** `Switch` is `role="switch"` button + hidden input (`settings/kit.tsx:152-199`); `.ad__check`, `.ad__tick`, `.adRowPick` are three checkbox skins; `Chips` is a fourth (pill checkboxes).
11. **Rich text:** two Tiptap setups (blog, email) with different toolbars [see 4.12]; no shared link dialog.

## S2. Tables [ux:21]

Verified from `admin.css:495-549`, `bulk.tsx`, `pager.tsx`, pages:
- Sticky first column only below 720px (`admin.css:512-522`). On desktop a wide table has no sticky column or sticky header (no `position: sticky` on `thead` found for `.ad__t`). Compare [ux:21 Fixed Headers/Columns].
- Sort: `aria-sort` set on `<th>`, links built per page (`clients/page.tsx:~253`). Indicator is an arrow only on the sorted column (`admin.css:540-541`); no "sortable" hint (↕) on others, so sortable vs non-sortable columns look identical until hover. Sorting exists only on a few lists (clients: company/projects/owed/since). Most tables (invoices? payments, expenses, estimates, support) are not sortable.
- Bulk select: current page only. No Shift+click range (`shiftKey` not used anywhere in `bulk.tsx` or `entries-table.tsx`), no "Select all N across pages". `BulkBar` finds its table by DOM id and toggles `.is-picked` classes imperatively (`bulk.tsx:49-60`), so it breaks if a table is wrapped or re-keyed.
- Filtering: no active-filter chips anywhere (grep for filter chip components found none); the only feedback is a "Clear" button. [ux:21 Active Filter Display, ux:19 Active Filter Chips]
- Search: five different models (S4 table in section 4.3); the text filter in contacts debounces at 350ms (skill says 300ms) while clients/projects/blog/money need an Apply press. [ux:19, ux:21]
- Column choice: only the forms entries table has a column picker (`forms/column-picker.tsx`, cookie).
- Density: one density for all; no compact option. Row actions: consistent ⋮ `RowMenu` (good) but the trigger is 36px (`.ad__rm`, `admin.css:1053`).
- Pagination: one `Pager` (good), but 4 Money tables, reconciliation log, portal projects, portal support, case studies, forms list are unbounded (no pager and no virtualisation).
- Empty/loading/error: `Empty`/`AdminState` and per-route skeletons exist; list pages with a filtered-to-empty state are handled; reconciliation and workspace tables use a different empty (`Empty` inside `Panel`).
- Mobile: tables stay tables (OK per repo rule). The "Swipe for more" hint is injected as `::after` content with a hard-coded English string (`admin.css:527`).
- Three table skins (4.5) plus the portal list rows (`pBill__*`, `pSup__list`).

## S3. Sheets, modals, popovers [ux:06, ux:03]

- `Dialog` (`dialog.tsx`): native `<dialog>` + `showModal()`: focus trap, Escape and inert background come from the platform. Good. Gaps: no scroll lock (no `body`/`html` overflow rule keyed to an open dialog in `admin.css` or `globals.css`; only `body.smooth-cursor:has(dialog:modal)` at `globals.css:303` for the public cursor), so the page behind can scroll with the wheel on desktop. Focus is placed on the dialog panel, not the first field (deliberate, `dialog.tsx:36-41`).
- Dialog vs side panel choice [skill tree]: our `Dialog` is always a right-hand sheet, including one-sentence confirmations that use a separate centred `ConfirmHost`. Large creation flows (New invoice, `InvoiceBuilder`) are sheets rather than pages; the skill says complex entities should be full pages.
- Command palette (`shell.tsx:454-520`): manual `role="dialog" aria-modal`, `keepFocusInside`, Escape, focus return, but no `inert` on the background, no scroll lock, results are a plain link list (no listbox/arrow-key roving: only `Tab`). Recents in localStorage.
- Popovers: `Pick`, `RemotePick`, `RowMenu`, bell and account menus each re-implement outside-click and Escape (`shell.tsx:354-380` and again in `client/shell.tsx`). Account menu uses `role="menu"` with `<a>` children but no arrow-key handling (arrow keys exist only in `row-menu.tsx`). Bell popover has no role at all.
- Mobile: Pick becomes a bottom sheet (`pick.css:110` scrim), dialogs fill the screen with safe-area padding (README); drawer is `adDrawer` native dialog. Not measured on device.
- Z-index has no scale: 25 distinct values in admin CSS, from 1 to 1000 (`admin.css`, `skeleton`, `pick.css`: e.g. 30, 45, 60, 70, 80, 90, 94, 95, 99, 100, 1000). Layering bugs are likely when features are added.

## S4. Toasts, tooltips, banners [ux:17]

- Toasts (`toast.tsx`): 4s default, **8s with Undo, then auto-dismiss** (`toast.tsx` timer: `action ? 8000 : 4000`). The skill and WCAG 2.2.1 want toasts that carry an action to persist until dismissed. Success and error share one component; error toasts also auto-dismiss at 4s [ux:17: warning/error toasts should be manual dismiss]. Max 3 stacked, hover/focus pauses (comment says so). `role="status"` only on the "acting" wrapper (`toast.tsx:58`); regular toasts are `aria-hidden` on purpose with the form announcing the same text; toasts raised from non-form code (`toast()` calls from client handlers, e.g. bulk results) may be silent to screen readers: unverified per call site.
- Double messaging on failed saves: `Form` raises a bad toast AND renders the tinted `ad__msg` block (`form.tsx:~150, Result`) AND sets `aria-live` text: three channels for one error.
- Tooltips: no tooltip component. Icon-only controls rely on native `title=` (`shell.tsx:188,229,290`), invisible on touch and keyboard. `HintTip` is a press-to-open hint for field help. Tour tooltips are separate. [ux:06 tooltips, skill "hover-only affordances"]
- Banners: `.ad__banner` (solid `bad`/`warn` only; defined twice, `admin.css:675` and `:1334`), `.ad__msg` (tinted, forbidden), `.ad__demo`/`DemoNote`, `ExampleNote`, `AdminNotices` (dismissible), `SupportBar`. No `info` or `good` banner tone; five alert idioms.
- Offline: `Connectivity` mounted for admin and portal from `app/layout.tsx:176`; its look is the public chrome's (not verified against admin tokens). Forms have no offline queue; a save while offline fails through the generic error path.

## S5. Forms [ux:07]

- All admin forms are `noValidate` (`form.tsx:~170`); validation is **server-side on submit only**, errors appear after a round trip, then the first invalid field is opened, scrolled and focused and a toast fires. No validate-on-blur (the skill's recommended hybrid) except `settings/kit.tsx Text`, which validates on leaving a field. Result: Settings and the rest of the admin validate differently.
- Error placement: under the field with `aria-describedby` (good, `form.tsx:Wrap`); no error summary list at the top for long forms (toast + focus on the first only).
- Required: `*` with `aria-hidden` plus no native `required` (because `noValidate`), so assistive tech is not told a field is required unless the server rejects it. `<b aria-hidden> *</b>` at `form.tsx:Wrap`. [ux:03 Forms Accessibility, ux:07 Marking Required Fields] This is a real a11y gap (WCAG 3.3.2 / 1.3.1): add `aria-required`.
- Autosave: none in admin. Drafts exist only in onboarding (`use-server-draft.ts`) and the form builder (orphaned).
- Unsaved-changes guard (`beforeunload`): only `settings/kit.tsx`, `email-builder.tsx`, `automation-canvas.tsx`, orphaned `form-builder.tsx`. **Not on the blog editor, case editor, FAQ editor, policies editor, campaign editor page, project/client edit sheets.** A post or policy can be lost by navigating away. Highest data-loss risk in the product.
- Save bar: only `SettingsForm` (13 uses). On viewports under 1024px it sits at `bottom: calc(5.25rem + env(safe-area-inset-bottom))` (`settings/settings.css:141`), a leftover offset for the removed bottom tab bar; it floats about 84px above the screen bottom. Verified in source.
- Submit buttons: `Submit` shows spinner and blocks double press (good).
- Labels: always above fields, sr-only label for search inputs, placeholders as examples only (compliant).
- Dialog forms: close on success via `onDone`; a failed save keeps typing (`useKept`, good).

## S6. Navigation, URL state, deep links

- Sidebar: 8 items, sub-links shown only while inside a section (`shell.tsx:63-95`), active state `aria-current` plus `is-on` rail, collapse persisted in localStorage; collapsed mode relies on `title` for labels.
- **No breadcrumbs anywhere.** Detail pages use a phone back arrow (`shell.tsx:578`, parent derived from the nav list) and ad-hoc "← Money" / "← Email" links (`reports/page.tsx:43`, `email/templates/[kind]`). Nav location on deep pages (invoice, entry, contact, case study) is inferred only from the sidebar highlight. [ux:05; skill "current location is always visible"]
- Tabs and filters in the URL: clients view/status/service/q, email tab/q/filters, users tab, forms view and status, money status and q, blog state, projects view/stage: good and shareable. Not in the URL: meetings view/tab (it is, partly, via `query`), `sw-tabs` in the project workspace (React state), automation panel tabs, `media-folders` tabs, settings overview search. The project page's workspace section cannot be deep-linked to a tab (there are none).
- Skip link: **none** in either shell (grep for "skip" in shells and layouts empty). The first Tab stop is the sidebar, then the top bar, before `<main>`. [WCAG 2.4.1; ux:03]
- Landmarks: `<main>` exists (`shell.tsx:610`, `client/shell.tsx:261`), sidebar nav labelled "Admin sections"/"Portal sections". Secondary navs (tabs) are `<nav aria-label>` (good).
- Headings: one `<h1>` per page by convention (`ad__head`). Missing: `/admin/settings/errors` has no `h1` (`settings/errors/page.tsx`: only a `Panel` h2). Panels render `<h2>`; `h3` is rare (20 uses), so subsection hierarchy inside long pages is flat. Dashboard h1 is inside `dashboard-view.tsx` (1 match).
- Command palette: Ctrl+K opens it; it searches pages and links to `?q=` lists; no entity search results inline (client names, invoice numbers) despite README claiming `RemotePick` server search exists, so the palette cannot jump to "Acme" directly. [ux:19 Entity matches]

## S7. Notifications UI [ux:17]

See 4.11 for the three surfaces. Additional findings:
- The bell's count excludes the personal inbox, which is the surface for decisions and handovers, the highest-signal items.
- No per-category "mark all read", no grouping or batching in the dashboard attention list.
- No Do-Not-Disturb or digest control in the UI except the inbox email mode `immediate | digest | off` (`workspace/notifications-inbox.tsx`).
- Severity vs visual weight: the attention queue uses tone icons; the bell popover uses one generic `Bell` icon for failed mail, forms and review (`shell.tsx:396-415` use `Bell` for two of three items).
- Push: none exists (fine; skill says ask in context).

## S8. Charts and KPI tiles [ux:18]

- No chart library: CSS bars (`cashflow-chart.tsx`, `.adRep__*`, `.adDash__chartBar`, `.ad__barTrack`). Series colours are literals (`#3d52e0`/`#e25a00` light, `#7377ff`/`#e8600f` dark; `dashboard.css:37-50`), not tokens, and blue/orange rather than navy/orange. No shared tooltip, axis, legend or empty state; keyboard users have `role="img"` labels per bar (`email/page.tsx`), good, but no data table alternative.
- KPI `Tile`: icon tile + label + `CountUp` figure + optional badge + note; `href` makes the whole tile a link via a stretched `::after` (`admin.css:453`) with focus ring on a pseudo-element using the undefined `--ad-focus` (falls back to `currentColor`). Tiles with `tone` change the figure colour only (`ad__tile--good dd`): colour-only signal supported by sign/words elsewhere. Tiles have no period/comparison arrow convention (some show "new this quarter" in a note, some a badge).
- Counts animate up on arrival (`CountUp`); reduced-motion handled (README); server renders the real number.

## S9. Avatars, status, tone

- Avatars: `.ad__av` 2.25rem initials with tone class by hash (`avTone`), `ad__av--live`, `ad__profileAv` 4.5rem radius 22px, `ctAv--N` (contacts), `.ad__avatar` in the shell, `ProfileCard`. Three size/radius conventions; photos only for the signed-in user (`<img>` without width/height, `shell.tsx:329`, `side-foot.tsx:48`). No avatar group ("+N") component, though team and project owners are multi-person (`ad__ownerChips` is a chip list). [skill: avatar stack 3-5 then +N]
- Status/tone: `--ad-tone-*` is the single solid token set (good, consistent) but status words are mapped in many files (4.9). Two parallel status colour sets still in use (S2.1 in section 5.1).
- Workflow node colours in `automation-canvas.css:12-13` use literal `#15803d`, `#c62828`, `#4a4f5c`.

## S10. Type, spacing, radius, elevation, motion

- Type: README admin scale (title 30/600, panel title 16.5/600, UI 14, label 13.8, hint 12, table head 11.5) vs reality: **36 distinct `font-size` values** across admin/client CSS (most used: .8rem x25, .78rem x23, .72rem x20, .88rem x19, .9rem x18, .86rem x17, .84rem x15, .82rem x13, .92rem, .85rem, .74rem, .75rem...). Many differ by 0.02rem. Body is 14px (`.ad{font-size:14px}`, `admin.css:~45`), below the skill's 16px body minimum for reading text; controls are 16px on phones only (README). [ux:04] Heading font vs body font are the same family at runtime (font alias, section 5.1).
- Radius: README says 12px controls, 18px panels, pill. Actual usage in admin CSS: 12px x82, 10px x70, 14px x38, 8px x33, 9px x26, 16px x15, 6px x13, 3px x13, 99/999px, 4px, 18px x6, 5px, 2px: **14 radii**; panels are 18px in only 6 places. Portal cards 16px/14px (`portal.css`).
- Spacing: no spacing tokens; rem and px mixed (workspace and meetings in px: 24px/20px gaps, admin in rem). The 8px scale from the README is not enforced anywhere (no tokens), not measured further.
- Elevation: only `--ad-sh-1` and `--ad-sh-3` exist; `--ad-sh-2` is referenced (`admin.css:451`) with a fallback but never defined.
- Motion: every one of the 20 CSS files that declare transitions/animations also contains a `prefers-reduced-motion` rule (checked by grep: none missing). Durations vary (.14s, .15s, .18s, .2s, .22s, .24s, 3.6s pulse in `empty-scene.css:24`): no motion tokens. An infinite `es-pulse` animation runs on every empty state icon (pauses off-screen? not verified).

## S11. States matrix (source evidence)

| State | Status |
|---|---|
| hover | present on `.ad__btn`, rows, tiles; many icon buttons rely on colour only |
| active | `translateY(1px)` on `.ad__btn`, `a.ad__pgBtn`; not on `.ad__rm`, `.ad__switch a`, tab links |
| focus-visible | global ring uses `--ad-accent` (#ff6500 light, fails 3:1) at `admin.css:125-127` and ~72 rules; 21 `outline:none/0` rules need individual review; WCAG 2.4.11: no `scroll-padding`/`scroll-margin` anywhere in admin CSS, so a focused element can sit under the sticky top bar or the sticky save bar [ux:03] |
| disabled | solid flat (`admin.css:636`), but the reason is often missing outside forms (`team-workspace`: "Complete task" disabled with a note under it: good; many `disabled` buttons in `entries-table` have none) |
| loading | `Submit` spinner; skeletons on 24 routes; none for Email, Users, Meetings, Reports, Notifications, Welcome; no delay before showing skeletons (route `loading.tsx` renders immediately, so very fast loads flash a skeleton) [ux:22: show only after about 300ms] |
| empty | covered (3 components) |
| error | `AdminState kind="error"` plus route `error.tsx` (button lacks `type`) |
| no-permission | `AreaGate`/`AdminState forbidden`; Meetings page renders a bare header instead (`app/admin/meetings/page.tsx`) |
| offline | root `Connectivity` bar only |

## S12. Quality gates

### Core Web Vitals risks (source-level; no profiling was run)
- Client component weight: 101 of 134 files in `components/admin` are `"use client"`. Largest client modules (bytes): `email-builder` 39 KB (lazy, good), `row-actions` 38 KB, `money-forms` 35 KB, `contacts-sheets` 31 KB, `media-library` 31 KB, `pick` 30 KB, `media-folders` 28 KB, `shell` 26 KB, `automation-canvas` 25 KB, `case-editor` 24 KB, `form` 22 KB, `delivery` 20 KB. `row-actions.tsx` (every row menu's dialogs and forms: invoice, payment, refund, reverse, estimate, expense...) ships on any page importing `InvoiceMenu` etc., i.e. Money, project, client pages, even though dialogs only open on click: candidate for dynamic import per dialog.
- Admin-wide: Tour provider and `TourLauncher` in the shell (Joyride runtime lazy, good), `confetti` imported by the tour provider (`tour-provider.tsx:11`), root layout still mounts `DrawGate`, `Preloader`, `ScrollTop`, `Connectivity`, JSON-LD for the public site (`app/layout.tsx:153`) on every dashboard page (SiteChrome and the pre-paint script skip the heavy parts by path).
- Hydration: dashboards are `force-dynamic`, `syncStore()` + `persistSoon()` run in both layouts on every request (`app/admin/layout.tsx`, `app/portal/layout.tsx`): server latency, not client, but it is the TTFB for every page and navigation.
- Layout shift: `<img>` without dimensions in avatars (`shell.tsx:329`, `side-foot.tsx:48`), media tiles (`media-picker.tsx:177`, `media-library.tsx:415`), `cover-field.tsx:53`, `case-editor.tsx:250,266,351`, `social-image-field.tsx:30`. No `next/image` in dashboards (fine for R2 user uploads per repo rules, but add width/height or aspect-ratio). `ListSearch` injects a node into the table container for no-results (`list-search.tsx`), causing a shift; `TableScroll` mutates attributes after load; `DateRange`/`Pager` `<details>` expand in flow.
- Fonts: Space Grotesk local (2 files); body alias means one family; no FOUT risk from Outfit because it is never requested.
- Bundle per route: not measured (no `.next` output present).

### Accessibility
Verified positives: native dialog/`details`, labels on every search input, `aria-current`, `aria-sort`, `aria-live` on counts, sr-only labels for icon buttons (`aria-label` on icon-only controls; no icon-only button without a name found in the shells), `role="switch"`, reduced-motion coverage.
Verified defects (ordered by severity): (1) focus ring below 3:1 on light panels (`admin.css:125`), (2) no skip link, (3) focus not protected from sticky UI, (4) required fields not exposed to AT (`aria-hidden *` and `noValidate`, no `aria-required`), (5) toast with action disappears (WCAG 2.2.1), (6) sub-44px targets at `admin.css:209,379,907,1053,1094,1207,1773,1999` (all >= 24px so WCAG 2.5.8 AA passes; only the repo's 44px rule fails), (7) `/admin/settings/errors` lacks an `h1`, (8) account menu `role="menu"` without arrow keys, (9) tour card is portalled to `body` with a duplicated token set (`tour.css:25-40`) kept "in sync by hand".
Contrast in light and dark: tone tokens are declared with measured ratios in `admin.css:69-75,109-113` (comments claim 4.6 to 17.7:1); I did not recompute them. Known failures by source: `.ad__stageTrack li.is-now` (white text on `#ff6500`, see S13), danger outline text `#d63333` on white (about 4.4:1 by my arithmetic, unmeasured), `--ad-dim` `#5c5c7a` on `--ad-panel-2` for 12px hints (unmeasured).

### SEO and agentic browsing
Dashboards are `noindex, nofollow, nocache` (`app/admin/layout.tsx`, `app/portal/layout.tsx` metadata): correct. Agent-friendliness: native buttons/links (no div-buttons), stable `data-tour` hooks (63+49) but no `data-testid`/stable accessible names on many icon buttons; filters are GET URLs (good); BulkBar/ListSearch rely on DOM ids and classes (brittle for agents); ids like `client-list`, `invoices-table` are stable anchors. Titles use template `%s · WDC Admin`, good for tab disambiguation.

### Responsive 320 / 768 / 1280
Tests exist (`tests/admin-responsive.spec.ts`, `mobile-fit.spec.ts`). Breakpoints are not a system: 26 uses of 560px, 16 of 640px, 7 of `max-width:640px` (minified), plus 900/760/720/520/1100/1180/980/620/480/420/400/360 and `min-width: 1000/1100`; the shell switches at 1024px, workspace at 700/760/1200. Four near-duplicate "phone" breakpoints (559/560/639/640). Not rendered here, so overflow at 320px is unverified.

### Light/dark parity
Token-driven and mostly consistent. Parity risks: dark-mode-only literals (`#7377ff`, `#23237a`, `#14145a`, `#d6d6f5`, `#4ade80`), re-declared token sets in `tour.css:25-40` and `pick.css:143-151`, `money/document.css` and `email-builder.css` canvases are always-light by design. `.ad__btn--primary` in light is navy with a coloured shadow, in dark orange without (`admin.css:629-631`): intended.

## S13. Colour rules from CLAUDE.md, checked against the CSS

1. **Words on bright orange (violation):** `admin.css:1611` `.ad__stageTrack li.is-now { background: var(--ad-accent-fill); color:#fff }`, and `:1612` the step number badge in `--ad-accent-fill` on `#fff`. In light mode `--ad-accent-fill` is `#ff6500` (`admin.css:34`), so the current-stage label is white on `#ff6500`, 2.95:1 by the repo's own figure (CLAUDE.md: "words never sit on the bright orange"). Dark mode is `#b84a00` (fine). This is the stage track on every project page.
2. **Token name collision:** CLAUDE.md/README `--accent-fill` = `#b84a00` (orange that carries words). Admin `--ad-accent-fill` = `#ff6500` in light (no-words fills). Same word, different colour; one is safe for labels, the other is not. This caused violation 1. Rename (`--ad-dot`/`--ad-accent-bar` vs `--ad-accent-fill`).
3. **Orange as a button fill:** none in the dashboards except the sanctioned dark-mode admin primary (`--ad-fill: #b84a00`, `admin.css:106`) and the invoice Pay button. Public: `services.css:444` hover state fills a button with `--accent-fill` (violates "orange is never a button fill", minor). `tour.css:114` orange dot with black glyph, no words (OK).
4. **Orange as text on light:** I did not find `color: var(--accent)`/`#ff6500` as text in admin CSS (`--ad-accent-ink` is used for eyebrows, `dashboard.css:11`). `empty-scene.css:58,79` and `email-builder.css:110`, `audit-table.css:63` use `#ff6500` as fills/outline on decorative or dark surfaces.
5. **Solid badges:** pills, tile icons, chips, counts, nav counts (`ad__count`), tab counts (`ad__tabN`), tags (`adMt__tag`, `cpStatus`) all use solid `--ad-tone-*`. Violations are the tinted **alerts** (`.ad__msg`, `admin.css:842-859`, 6 uses) and hover washes (`:984`).
6. **Button pair on grounds:** the public pair is implemented by `--btn-fill/--btn-ink` (globals). The dashboards intentionally use `--ad-fill`; only `pick.css:147` maps `--ad-fill: var(--btn-fill)` for the public skin. `components/meetings/meetings.css` uses `--font-body` and `--ad-*` for public booking pages; booking buttons use `ad__btn`, not the public pair (`booking.tsx` uses `ad__btn`/`ad__btn--plain`): a public page that wears the dashboard button style, contradicting README ("Public booking uses the site's black/white button pair"). Verify visually.
7. **Tokens at shared scope:** `--ad-*` are declared at `:root` (`admin.css:25`): compliant. Violations: local re-declarations of the whole palette in `tour/tour.css:25-40` (including `--ad-r: 14px`) and `pick.css:143-151`; local-only tokens `--sk-*`, `--wf-*` are scoped to their consumers (acceptable); undefined tokens used with fallbacks: `--ad-focus`, `--ad-raise`, `--ad-line-2`, `--ad-sh-2`, `--ad-good-ink`.
8. **Focus ring colour:** README says `#c95000` light / `#ff6500` dark; code uses `--ad-accent` (`#ff6500` in light): violation (S11).
9. **Dark-mode orange fills carry white:** `--ad-tone-live: #b84a00`, white label: compliant. Admin primary in dark: compliant.
10. **Red:** Log out special-case `#c62828` is in `admin.css:1940-1948` as hard-coded values rather than `--ad-tone-bad`; fine functionally.
11. **Copy colour one colour:** `--ad-dim` is used for secondary copy (a second text colour) broadly; the repo rule "stress with weight, not colour" targets orange; `.ad__tile--accent dd` colours a figure with `--ad-accent-ink` and `.ad__tile--good/bad dd` with green/red, which is a second colour on prominent figures (violates "copy is one colour" in spirit; used on KPI tiles).

## S14. Generated-UI defaults check (from SKILL.md) against our dashboards

- Purple/indigo gradients, glassmorphism: not found in dashboards (`rg gradient` hits are skeleton sweep, shimmer, fades). The dark theme navy-indigo `#23239b`/`#7377ff` is brand-derived. Glow shadow: the primary button's coloured shadow (`admin.css:629`) is a glow in light mode.
- Emoji as icons: none. Decorative icons on every item: tile icons on every KPI tile, `ad__noticeIcon` on every notice, an `EmptyScene` illustration on every empty state, icons in every button. Borderline.
- A card around everything / nested cards: every block is a `Panel`; the workspace intro card, handover cards and service document cards nest inside panels (`team-workspace.tsx`, `service-workspace-view.tsx`: `Panel` inside `Panel` inside a section).
- Hero/marketing filler in app UI: `ExampleNote`/`DemoNote` banners, `SideTourCard` ("Two-minute tour") promo card pinned in every sidebar until dismissed, the portal "Quick actions" list.
- Buttons all equal weight: see S1.3.
- Gray-on-gray: `--ad-dim` hints at 12px (`admin.css` hint) on `--ad-panel-2`: unmeasured risk.
- Hover-only affordances: `title=` tooltips; sidebar labels when collapsed; sort header underline on hover only.

## S15. Additional gaps found (business perspective)

1. **Data-loss on content editors** (S5): blog, case studies, FAQ, policies, campaigns: no guard or autosave.
2. **Money list unbounded** (S2): estimates, expenses and payments tables render every row; on a growing ledger this is a performance and scan problem, and Money has no way to see "this month's payments" except Reports.
3. **No invoice PDF/Print on the invoice page** (7.1); finance staff go through the ⋮ menu or the public page.
4. **Custom form builder 404** (6.5) and orphan `support-button` (the README lists `ClientSupportButton` as part of the support view).
5. **Staff cannot see Meetings, Email or any money context** but can see all clients and projects; staff dashboards omit money while project pages still link invoices? (`projects/[id]/page.tsx:229` gated by `money`; fine).
6. **Client portal has no files area, no receipts list, no meetings page**; files only appear inside project deliverables, receipts inside billing/payment rows, meetings as an Overview panel (`client/meetings-panel.tsx`).
7. **Portal and admin use the same ticket thread but different names** (Support vs Messages), and tickets lack attachments (`new-ticket-form.tsx` has no `FileDrop`).
8. **Empty "People" settings group**, `settings/access` and `settings/team` redirects still in the sitemap; `NAV_AREA["/admin/reports"]` maps to money but Reports is not in nav.
9. **Stale copy and comments** (tab bar, "modal", "Design the emails the studio sends" lede) mislead future work; mojibake `?` in `service-workspace-view.tsx:35`.
10. **Test and tour coupling**: 177 tests and 211 tour steps are tied to current markup; no `data-testid` layer.
11. **No audit-trail UI on money records** besides History/CommsLog; the Audit log (Settings) is owner-only and global; per-invoice audit view is absent (project and client pages have `AuditLog`, invoice page does not: `money/[id]/page.tsx` lacks it).
12. **No density, no saved views**: filters are not saved or nameable [ux:19 Saved searches].
13. **Currency, date formatting** use fixed tables and `en-GB`; no i18n structure (`Intl` appears 10 times in admin/app/admin) [ux:23]; single-language product, low priority; physical `left/padding-left` (34) vs logical (9) in `admin.css`.

## S16. (1) Components that should exist in a cleaner design system but do not yet

1. `Tabs` (page, in-card, with URL sync, counts, roving focus).
2. `Toolbar`/`FilterBar` (live search, filter popover, active filter chips, date range, view switch, export, saved views).
3. `DataTable` (sticky header and first column, sortable header with indicator, selection with shift-range and select-all-N, density, column visibility, row menu, empty/loading/error slots, mobile scroll hints).
4. `Breadcrumbs` and `PageHeader` (title, eyebrow, back link, one primary, overflow menu).
5. `Tooltip` (focus and touch aware) and `IconButton` (required label, 44px hit area).
6. `Alert`/`Banner` with tones good/info/warn/bad and one dismiss behaviour; `Toast` with persistent-on-action rule.
7. `Menu`/`Popover` primitive (outside-click, Escape, arrow keys, roles) used by account, bell, row, pick.
8. `Sheet` and `Modal` variants (size, footer actions slot, sticky footer, scroll lock) plus `FullPageOverlay` for big creation flows.
9. `FormSection`/`FieldGroup` and a form-wide dirty guard and autosave hook; `aria-required` support.
10. `Avatar` and `AvatarGroup`.
11. `Stat`/`KPI` with delta, sparkline slot and consistent period label; `Chart` kit (bar, line, donut, legend, tooltip, series tokens).
12. `Timeline`/`ActivityFeed` (one component for history, comms log, audit, project updates, portal feed).
13. `Stepper` (stage track and onboarding).
14. `EmptyState` unifying `Empty`/`AdminState`/`EmptyScene`.
15. `StatusBadge` driven by one status registry (stage, invoice, health, approval, ticket, form entry).
16. `Combobox` with async option source as one component (merge Pick/RemotePick/OwnerField).
17. `FileUpload` with a shared progress, validation and error UI.
18. `Skeleton` generated from component slots rather than hand-built per route, with a 300ms delay.
19. `SkipLink`, `VisuallyHidden`, `LiveRegion` utilities.
20. Design tokens file with tiers (primitive, semantic, component): colour, type scale, spacing, radius (3 values), elevation (3), z-index scale, motion durations, breakpoints (3). [ux:11]
21. `CommandPalette` with entity search (clients, projects, invoices) and listbox semantics.
22. `ConfirmDialog` consolidating `ask()`, `Confirm`, `ConfirmSwitch`.
23. `Notification center` (one inbox merging attention queue, workspace notifications, system alerts).

## S17. (2) Components to merge or delete

Merge:
- `shell.tsx` + `client/shell.tsx` + `support-bar` + `support-banner` into one Shell.
- `ad__tabsNav`, `ad__switch`, `adForms__tabs`, `eb-tabs`, `adWf__tabs`, `sw-tabs`, meetings button-tabs into `Tabs`.
- `Empty` + `AdminState` + `EmptyScene` + inline empties.
- `.ad__msg` + `.ad__banner` (two definitions) + `DemoNote` + `ExampleNote`.
- `Form` + `SettingsForm` (save bar as an option) and `Row/Text/Switch/Chips` into the form kit.
- `.ad__t`, `.sw-table`, `.workspaceCommunications__table`, `entries-table`, `roles-table`, audit table into `DataTable`.
- `ListSearch` + GET filter forms + `contacts-view` search + meetings in-memory search.
- `Pick` + `RemotePick` + `RemoteMultiPick` + `OwnerField`.
- `rich-text-editor` + `eb-tiptap`.
- `cashflow-chart` + `.adRep__*` + `.adDash__chartBar` + `.ad__barTrack`.
- `Tasks`/`Updates`/`Deliverables` (`delivery.tsx`) with team workspace and service records.
- `ConfirmSwitch` + `ask()` + `Confirm`.
- Notifications: bell popover + `PersonalInbox` + dashboard attention list.
- Users › Clients tab with Clients › Portal access.
- Three PDF drawers (`receipt-pdf`, `legal-pdf`, `entry-pdf`).
Delete (after confirming no use): `components/admin/forms/form-builder.tsx` (or finish the route), `components/client/support-button.tsx`, `.ad__filters select` CSS, `ad__btn--plain`/`--ghost` modifiers (or define them), the second `.ad__banner` block, the `tour.css:25-40` token copy, undefined-token fallbacks, `pick.css` public skin duplication, stale tab-bar offsets (`settings.css:141`, comments), `tests/more-sheet.spec.ts`, the empty "People" settings group, redirect pages `settings/access` and `settings/team` (once links are updated).

## S18. (3) Top 20 UI problems, ranked by user and business impact

1. **Unsaved work can be lost** in blog, case-study, FAQ, policy and campaign editors (no `beforeunload`, no autosave). `settings/kit.tsx` has the guard; the long editors do not. [ux:07, ux:12b]
2. **Custom form builder is unreachable**: "New form" redirects to a route that does not exist (`lib/forms/custom-actions.ts:41`; no `build` page). A shipped feature 404s. 
3. **Global focus ring fails 3:1 on light** (`admin.css:125`, ~72 rules; `--ad-focus` undefined) and nothing guards focus from the sticky bars (no `scroll-padding`). Keyboard users across all three dashboards. [ux:03, 2.4.11]
4. **Three overlapping project systems** (tasks, updates, deliverables vs service records vs team workspace) on one long page, mirrored in the portal: confusing for staff and clients, and the core product page.
5. **Settings sprawl**: 21 pages, 17 side-list sections, payment setup split across four places, "Email" vs Email, empty "People" group; staff reach Settings only for content.
6. **Tables lack core controls**: no sticky header/column on desktop, no shift-select or select-all-across-pages, no sort affordance, no active filter chips, unbounded Money tables. [ux:21]
7. **Search and filter behave five different ways** (live, Apply-to-submit, debounced URL, in-memory, palette), and palette cannot find records. [ux:19]
8. **Five tab styles and no breadcrumbs**: location on deep pages is unclear; tab state often not in the URL.
9. **Required fields invisible to assistive tech and validation only after submit** (`noValidate`, `aria-hidden *`). [ux:07, ux:03]
10. **Detail pages are 10 to 13 untabbed panels** (client, project, invoice, entry) with inline-style layouts.
11. **Two shells**: portal shell is a copy of admin shell; every shell fix is made twice; portal loads admin's 2,091-line CSS.
12. **Tinted alert banners and stage track violate the colour rules**: `.ad__msg` tints (`admin.css:842-859`) and white-on-`#ff6500` stage labels (`:1611`), plus the `--ad-accent-fill` naming collision that causes it.
13. **Mixed code styles**: workspace, meetings, users, notifications pages are minified one-liners with px CSS; unreviewable, unthemeable, and visually off-system.
14. **Toast rules**: action toasts and error toasts auto-dismiss; failed saves show three redundant messages. [ux:17, WCAG 2.2.1]
15. **No skip link, no tooltip system, native `title` hints only**, icon-only controls with 36 to 40px targets (S12). [ux:03, ux:06]
16. **Token system incomplete**: 36 font sizes, 14 radii, 25 z-indexes, no spacing/motion/breakpoint tokens, undefined tokens, duplicate palettes (tour, pick), two status colour sets.
17. **Notification model fragmented** (bell counts exclude the personal inbox; attention list vs inbox vs settings pages). [ux:17]
18. **Client portal gaps**: no files area, no receipts list, no meeting page, tickets without attachments; portal naming differs from admin (Messages/Support).
19. **Heavy client bundles on common pages** (`row-actions` 38 KB, `money-forms` 35 KB loaded for menus that rarely open; 101 of 134 admin components are client components) and per-request `syncStore()` in both layouts; images without dimensions cause shift. [ux:22]
20. **Dead and stale UI**: orphan components, no-CSS modifiers, `?` mojibake, stale tab-bar offsets (save bar floats 84px above the bottom under 1024px), outdated copy ("Design the emails the studio sends"), misleading comments; 177 tests and 211 tour steps coupled to markup make every cleanup costlier.
