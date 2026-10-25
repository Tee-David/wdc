# Agent A findings: owner routes (read only)

Scope: 35 owner routes at http://localhost:3100. Measured by `/tmp/wdc-tools/audit-page.js` at 1440, 390 and 320 wide (light theme), with every visible control clicked one at a time and print emulated. Raw output: `/tmp/claude-0/-home-user/9f63f343-f2fc-572f-8909-9449f9c19e38/scratchpad/audit/out/agentA.jsonl` (35 complete lines, no fatal, no crash). Source and curl reads only; nothing in `/home/user/wdc` was edited, committed or pushed. No Sign out, Delete permanently, Empty trash, Apply migrations, Reset or Purge was pressed.

Measurement notes:
- "Touch under 40px" is the tool's threshold (40, not the 44 the design system asks for). Small boxes are listed by their label and size, `name|WxH`.
- "dead" in the tool means: no navigation, no dialog, and less than 30 characters of DOM change. A toast, a checkbox toggle or a server action that succeeds quietly will look "dead". Every "dead" below is therefore only "no visible reaction measured", not proven broken unless a source reason is given.
- "moved" means the URL changed. Where the label and the target do not match, I say so and do not guess the cause.
- Design status comes from the tool's `design` flags at 1440. NEW = flowGrid, deck, rail and tiles. HYBRID = some of those flags. OLD = none, or only `oldPanelsOnly`.
- Not measured by the tool: loading skeletons, error states, no-permission states, empty states (only the ones visible on the default data), and the staff or client view.

Summary of the run (all 35 routes):
- Overflow sideways: 0 at 320, 390 and 1440 on every route.
- Responses 4xx or 5xx on any route: none. Console errors: none. Error boundary text: none.
- Click errors: one, on `/admin/reports?tab=team`, control "This month" at 1440: `Internal Next.js error: Router action dispatched before initialization.`
- Print: every route printed with the sidebar still present (`sidebarVisible: true` on 35 of 35). Page counts 1 to 4. Byte sizes 33 KB (`/admin/users/departments`) to 433 KB (`/admin/reports`).

---

## Route by route

### 1. /admin  (Today)
- Design: NEW (flowGrid, deck, rail, tiles, tabs, table). Deck and rail present.
- Defects: no overflow. Touch under 40px: 27 at 1440, 22 at 390, 34 at 320. Examples: `System|51x18`, `Calendar|79x21`, `Open Money|104x21`, `INV-26-JFQF|83x18` at 1440, `Actions for INV-26-JFQF|36x36`. Dead: "Dismiss: 3 database changes have not been applied" (1440) (see cross-page pattern A). "New project" (1440) moved to `/admin/settings/system`. "Snooze" (390) moved to `/admin/money/i5`.
- Print: 4 pages, 402,952 bytes, sidebar kept.
- Missing states: not measured (no empty deck or skeleton check). The H1 is data-driven ("Good morning, WDC. 18 things need you.").
- Owner would expect: a single place to see cash due this week. Present in the rail via "Open Money", so no gap seen.

### 2. /admin/clients
- Design: HYBRID (deck, tiles, tabs, table, form; no flowGrid, no rail).
- Defects: no overflow. Touch under 40px: 7 at every width. `Select every client|18x18`, `LIVE|26x44` (width 26), and five row checkboxes `Select Shop With Peculiar`, `Select Realtors' Practice`, `Select Mira Skincare`, `Select Kora Logistics`, `Select Bloom Pharmacy`, each 18x18. Dead: "Send reminder" (1440 and 390), and "Dismiss: 1 email did not go in the last day" (390).
- Print: 2 pages, 274,479 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: a search box for the list (the rule is required from five rows). Source imports `url-search`, but the tool did not measure the box itself.

### 3. /admin/clients/mira  (Mira Skincare)
- Design: OLD (tabs, form only).
- Defects: no overflow. Touch under 40px: `Actions for Mira Skincare, more` is 29x44 at 320 and 36x44 at 390 (fine at 1440). Clicks: "Open WhatsApp" opens an external wa.me link with a prefilled message (x2). "People 1", "Money 1", "Files 0", "Activity" are tabs and move correctly. At 390, "Log a call or message" moved to `/admin/clients` (the list, not a log sheet). At 1440, "New project" moved to `?tab=activity`. Both are recorded facts; I have not checked the cause.
- Print: 2 pages, 157,025 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: the activity of this client with a log action that stays on the client page.

### 4. /admin/clients/c2916087989001795  (Realtors' Practice, recurring client with 7 projects)
- Design: OLD (tabs only).
- Defects: no overflow, no touch target under 40px at any width. Clicks: 10 dialogs and 11 moves. Row menus like `Actions for Cloud infrastructure` moved to the project page. At 390, `Actions for Realtors' Practice, more` moved to `/admin/clients`, which should open the menu. Recorded; not checked. "Open meetings to book one" moved to `/admin/meetings`.
- Print: 3 pages, 245,462 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: the full list of this client's projects, invoices and payments in one place, which is present.

### 5. /admin/clients/support  (legacy Support list)
- Design: HYBRID (deck, tiles, table; no tabs).
- Defects: no overflow. Touch under 40px: 6 at 1440 (`System|51x18`, `Message log|85x18`, and four 18x18 checkboxes), 4 at 390 and 320 (checkboxes). Dead: "Dismiss: 3 database changes" (1440), "Dismiss: 3 emails did not go in the last day" (390). "Snooze" (1440) moved to `/admin/clients/mira`. A deck "Snooze" that navigates away does not match the deck spec (Snooze should stamp the card). "Message log" moved to `/admin/settings/email/log?state=Failed`. Ticket rows open `/admin/messages?c=t-…`.
- Print: 2 pages, 212,443 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: the support list in Messages only. This page is a second copy of the Messages list (see route 6).

### 6. /admin/clients/support/t0  (redirect)
- Design: OLD. The page redirects to `/admin/messages?c=t-t0` (source: `app/admin/clients/support/[id]/page.tsx`). The tool measured the Messages page, not the support detail.
- Defects: no overflow, no touch under 40px. Clicks: pager links to `/admin/messages?page=2..5`, "Next page", per-page links, "View all" (`per=1000`), and "Send reply" (1440), which moved to `/admin/clients/support` with an empty box. The tool does not type, so the cause is not known. Needs a hand check.
- Print: 1 page, 76,352 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: a support thread reachable from an email. The redirect covers this.

### 7. /admin/projects  (All projects)
- Design: HYBRID (tiles, tabs, table; no deck, no rail).
- Defects: no overflow. Touch under 40px: 6 at every width. `Select every project|18x18` and five row checkboxes (`Select Brand identity`, `Select Social media management`, `Select Driver app`, `Select SEO retainer`, `Select Booking assistant`). Dead: six row clicks named like "Brand identity Mira Skincare Branding At…" (1440 and 390). The row is a `ClickRow` (source `components/admin/click-row.tsx`), which opens on any cell not in a checkbox or link. The tool likely clicked the checkbox cell, so this is probably a false "dead", but I have not confirmed it. The name link opens the project in the same run. Service filters: `?service=branding|seo|web|apps|software|social`. Views: `?view=board|timeline|calendar`. Tabs: `?tab=waiting`, `?tab=done`. "Export" is a CSV download (`/admin/projects/export`).
- Print: 1 page, 152,546 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: a list of services in each row, which is shown. The Service tags are different per project, so a list cannot show service stages here; that belongs on each project page.

### 8. Project pages (all 10): see the comparison section below
Common results for every project page:
- Design: OLD on all ten (`oldPanelsOnly` true, plus tabs, table, form). None of them uses the NEW deck or rail.
- Overflow: 0 at every width.
- Touch under 40px: the client link in the header, `Mira Skincare|99x19` and `Mira Skincare|88x17` (or the equivalent client name) at every width. Other ones: `System|51x18` and `Message log|85x18` at 1440 on the projects where the notice bar shows.
- Dead: "Dismiss" on the notices bar (1440) for p2, p6, and p2916087990008414. Also "Dismiss: 12 emails…" on p2916087990008414.
- Errors and console: none.
- Print: 2 pages each (p1 175,545; p2 179,350; p3 186,034; p4 160,977; p5 176,054; p6 163,931; p7 176,838; p8 160,426; p2916087990004041 166,060; p2916087990008414 167,888 bytes). Sidebar kept on all.
- Missing states: not measured. The "Service work" panel shows the empty state "No work recorded yet" on all ten (see comparison).

Per-project click notes (1440 unless shown):
- p1 Brand identity (Branding, client Mira Skincare): 32 clicks. Tab labels seen: Overview, Tasks 3, Design rounds, Approvals, Files, Money, Activity. "Post an update" and "Open tasks" move to tabs.
- p2 Social media management (Social, Mira Skincare): 16 clicks. Tabs: Overview, Tasks 2, Content calendar, Approvals, Files, Money 1, Activity. At 390, the control "Add a task" moved to `/admin/clients/mira`. This is probably a header overlap at phone width. Not checked.
- p3 Driver app (Apps, Kora Logistics): 31 clicks. Tabs: Tasks 1, Builds, Approvals, Files, Money 1, Activity. "Add or update access" moved to `/admin/money/i1`. The access form lives in this page's "Project access" panel, so the link target does not match the label. Recorded; cause not checked.
- p4 SEO retainer (SEO, Bloom Pharmacy): 14 clicks. Tabs: Tasks 1, Content, Approvals, Files, Activity. No Money tab with an amount (Money 1 is shown in the tab list).
- p5 Website (Web, Oak and Ivy Interiors): 22 clicks. Tabs: Tasks 1, Build and launch, Approvals, Files, Money 1, Activity. "Add or update access" moved to `/admin/money/i5` (same pattern as p3).
- p6 Booking assistant (Software, Halo Clinics): 8 clicks, only Dismiss dead. Tabs: Tasks, Milestones, Approvals, Files, Money 1, Activity.
- p7 Instagram ads (Social, Lumen Fitness): 16 clicks. Tabs: Tasks, Content calendar, Approvals, Files, Money 1, Activity. "Actions for Instagram ads" moved to `/admin/clients/lumen`.
- p8 October content (Social, Ade's Kitchen): 21 clicks. Tabs: Tasks, Content calendar, Approvals, Files, Money 1, Activity. At 390 "Add a task" moved to `/admin/clients/ade`.
- p2916087990004041 Real estate property aggregation platform (Software, Realtors' Practice): 19 clicks. Tabs: Tasks, Milestones, Approvals, Files, Money 3, Activity. "Add or update access" moved to `?tab=activity`.
- p2916087990008414 Cloud infrastructure (Software, Realtors' Practice): 22 clicks. Tabs: Tasks, Milestones, Approvals, Files, Money 3, Activity. Dead: two Dismiss buttons (1440).

### 9. /admin/money  (Invoices and spend)
- Design: HYBRID (deck, tiles, oldPanelsOnly, tabs, table, form).
- Defects: no overflow. Touch under 40px: 24 at 1440, 18 at 390, 21 at 320. Examples: `Select every invoice|18x18`, row checkboxes (`Select INV-26-JIWO|18x18`), and stat chips `DUE|36x44`, `TOTAL|37x44`, `OWED|35x44`. The tool also found `Search|1x1`, a one-pixel control named "Search" that moved to `/admin/reports`. That looks like a hidden or mis-styled control. Recorded; not checked. "In 1 hour An hour from now" (1440) moved to `/admin/money/i5`. "Snooze" (390) moved to `/admin/money/i8`.
- Print: 2 pages, 251,342 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: the overdue list and the cash tiles; both are present.

### 10. /admin/money/i1  (Invoice INV-26-JBI3, Kora Logistics)
- Design: OLD (tiles, oldPanelsOnly, table, form).
- Defects: no overflow. Touch under 40px: `Kora Logistics|104x19`, `Driver app|75x19`, `Schedule in Settings|136x21`. Dead: "Email it with the pay link" (both widths) and "Try again" (both widths). These are `Submit` controls in `components/admin/reconcile-forms.tsx`, and the tool saw no reaction. Not confirmed. "Edit invoice" (1440) moved to `/admin/projects/p3`. The button's trigger is a dialog in `money-forms` (source `app/admin/money/[id]/page.tsx` line 157), so the target does not match what it should do. Recorded; not checked.
- Print: 3 pages, 272,841 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: a pay link and a receipt action that does something visible. Not confirmed.

### 11. /admin/money/new  (New invoice)
- Design: OLD (pageHead, table, form).
- Defects: no overflow. Touch under 40px: 10 at all widths. `Remove this line|32x32` (the line remover is icon-sized, 32px, under 40), `What does this mean?|19x19`, `Money|50x19` (breadcrumb-style link), `INPUT|13x13`, and the form's text inputs at 35 to 37 tall. Dead: "Remove this line" (1440 and 390). With one blank line this is probably a no-op by design. Not confirmed. "NGN" (1440) moved to `/admin/money`. "What does this mean?" (390) moved to `/admin/money`.
- Print: 2 pages, 160,826 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: a line-item form where quotes and invoices share one shape. Source: `?type=quote` link from the Money ⋮.

### 12. /admin/money/reconciliation
- Design: HYBRID (deck, tiles, tabs; no table, no form flag).
- Defects: no overflow, no touch under 40px at 390 or 320. At 1440, `System|51x18` and `Message log|85x18`. Dead: "Dismiss: 3 database changes" (1440), "Dismiss: 19 emails" (390). Clicks: 19 moves on filter tabs (`?tab=emails`, `?tab=statement`, `?show=attention`, `?tab=provider&show=attention`), and "INV-26-JEOC Mira Skincare · ₦4,500 Overdue" moved to `/admin/money/i4`.
- Print: 2 pages, 210,366 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: a bank-statement upload. The "Bank statement 0" tab exists, so this is present.

### 13. /admin/reports  (Overview)
- Design: NEW (flowGrid, rail, tiles, pageHead, tabs, table, form).
- Defects: no overflow. Touch under 40px: 4 at every width: `Owed to us|78x18`, `Realtors' Practice|120x21`, `Bloom Pharmacy|113x21`, `Ade's Kitchen|93x21`. Dead: an unnamed primary button (`ad__btn ad__btn--primary`, with no text read by the tool) at 1440 and 390. Its target is not identified. Clicks: 8 downloads (`/admin/reports/export?report=income|all&format=csv|xlsx`), and date links that move correctly.
- Print: 4 pages, 432,557 bytes, sidebar kept.
- Missing states: not measured.
- Owner would expect: the books for any period. Present (range, from/to, compare-with).

### 14. /admin/reports?tab=money
- Design: NEW.
- Defects: no overflow, no touch under 40px. Dead: the same unnamed primary button, 1440 and 390. Clicks: 4 downloads and 4 date moves.
- Print: 4 pages, 389,285 bytes, sidebar kept.

### 15. /admin/reports?tab=owing  ("We owe" in the UI)
- Design: NEW.
- Defects: no overflow. Touch under 40px at 320 and 390: `SEO retainer|164x21`, `Booking assistant|164x21`, `October content|164x21`, `Cloud infrastructure|164x21` (height 21). At 1440: `SEO retainer|83x18`, `Booking assistant|122x18`, `October content|113x18`, `Real estate website platform|195x18`, `Cloud infrastructure|138x18`. Dead: unnamed primary button (1440), "Apply" (390).
- Print: 3 pages, 299,835 bytes, sidebar kept.

### 16. /admin/reports?tab=sales
- Design: NEW (tool flags: flowGrid, rail, tiles, tabs, form; no table flag).
- Defects: no overflow. At 1440: `System|51x18`, `Message log|85x18`. Dead: "Dismiss" twice (1440), the unnamed primary button (1440 and 390). "Export" (1440) moved to `/admin/settings/email/log?state=Failed`. That is a page the label does not describe. Recorded; cause not checked (possibly the notices bar overlapped the button when clicked).
- Print: 3 pages, 291,588 bytes, sidebar kept.

### 17. /admin/reports?tab=recurring
- Design: NEW.
- Defects: no overflow. Touch under 40px: `Realtors' Practice|120x21`, `Bloom Pharmacy|113x21`, `Tunde Okafor Law|120x21` at every width (height 21). Dead: "Apply" (1440) and the unnamed primary (390).
- Print: 3 pages, 298,409 bytes, sidebar kept.

### 18. /admin/reports?tab=work
- Design: NEW.
- Defects: no overflow. Touch under 40px: `Firm flyers`, `Instagram ads`, `Brand identity`, `Booking assistant`, `Website` at every width. The 1440 heights are 18px. Dead: unnamed primary button (1440 and 390).
- Print: 4 pages, 381,341 bytes, sidebar kept.

### 19. /admin/reports?tab=team
- Design: NEW.
- Defects: no overflow, no touch under 40px. Click error at 1440: "This month" → `Internal Next.js error: Router action dispatched before initialization.` This is a real error in the client router. Also one dead unnamed primary button (390).
- Print: 3 pages, 309,587 bytes, sidebar kept.

### 20. /admin/reports?tab=clients
- Design: NEW.
- Defects: no overflow. Touch under 40px: at 320 and 390, 10 client names at 120 to 127 by 21. At 1440, `Realtors' Practice|60x39`, `Bloom Pharmacy|67x39`, `Ade's Kitchen|52x39`, plus `System|51x18` and `Message log|85x18`. Dead: "Dismiss" twice (1440), unnamed primary button (1440 and 390).
- Print: 3 pages, 352,466 bytes, sidebar kept.

### 21. /admin/meetings  (Meetings)
- Design: HYBRID (deck, tiles, tabs, form).
- Defects: no overflow, no touch under 40px, no dead controls, no click errors. Moves: `Calendar` → `?tab=calendar`, `Waiting for an answer 0 0 No open requests` → `?tab=requests`, `Held, 30 days` → `?tab=past`, and "Book a meeting" → `/meet` (the public page; it leaves the dashboard in the same tab).
- Print: 2 pages, 164,274 bytes, sidebar kept.
- Nav: sits under Projects in the sub-nav (source `components/admin/shell.tsx` line 75), not as its own item.

### 22. /admin/messages
- Design: OLD (form only).
- Defects: no overflow, no touch under 40px, no dead controls, no click errors. 30 moves, all filters (`?kind=waiting|client|project|team`), pager (`?page=`, `?per=`), and conversation rows (`?c=…`).
- Print: 1 page, 101,659 bytes, sidebar kept.

### 23. /admin/notifications  (personal inbox)
- Design: HYBRID (deck, tiles, table, form).
- Defects: no overflow, no touch under 40px. Dead: "Mark all as read" (1440). The tool DID click it, so it may have marked the inbox read; no visible reaction was measured. Two rows "A reminder about invoice INV-26-JFQF WDC" and "…INV-26-JEOC WDC" (390), recorded as dead. The rows may be buttons that do not open anything; not confirmed.
- Print: 2 pages, 223,449 bytes, sidebar kept.
- Missing states: not measured.

### 24. /admin/welcome  (staff onboarding)
- Design: OLD (no design markers).
- Defects: no overflow, no touch under 40px at 320 or 390. At 1440: `System|51x18`, `Message log|85x18`. Dead: "Dismiss" twice (1440).
- Print: 1 page, 108,564 bytes, sidebar kept.
- Hidden: not linked from any nav or page. Staff are redirected here by `app/admin/layout.tsx` lines 66 to 71 while their `client_profile_preferences.setup_state` is `pending`. The owner reaches it only by typing the URL.
- Missing states: not measured. The owner sees a staff welcome.

### 25. /admin/users  (Team and permissions)
- Design: HYBRID (deck, tiles, tabs, table, form).
- Defects: no overflow. Touch under 40px at every width: `Select eligible rows on this page|18x18`, and `You|25x44` (25 wide). Dead: "Apply" (1440 and 390). Moves: 4 (tabs and pager). Dialogs: 5.
- Print: 2 pages, 186,671 bytes, sidebar kept.
- Navigation: not in the nav. Reached from Settings → "Team and permissions" (`lib/settings/sections.ts` line 37). The Settings item is the only nav link (`shell.tsx` line 105, `also: ["/admin/users"]`). The owner-field "Invite them to the team" link opens `/admin/users` in a new tab.

### 26. /admin/users/departments
- Design: OLD (no markers).
- Defects: no overflow, no dead controls, no click errors. `Users|36x44` (back link) at every width.
- Print: 1 page, 33,007 bytes, sidebar kept.
- Navigation: Settings → "Departments" (`lib/settings/sections.ts` line 38). Not in the nav.

---

## Project pages compared (all 10)

Measured in the rendered HTML of each project's Overview and each tab (`?tab=tasks|work|approvals|files|money|activity`), fetched read-only with the owner session cookie. The browser audit also covered each project's default view.

Identical on all ten:
- Head: the client link, the "Add a task" dialog button, the "Post an update" link, and the ⋮ menu (`ProjectMenu`: Open the project, Move its stage, Set the due date, Add to the history, Open the client, Archive it; on the project's own page, "Edit details" first).
- Tabs: Overview, Tasks, [work tab], Approvals, Files, Money (shown when the owner or the client account is allowed to see money), Activity.
- Overview sections: "What is in the way", "What happens next", "Project access" (with "Set this person's project access" and "Add or update access"), "Progress", "Team", "Key facts".
- Work tab sub-tabs: "Work & calendar", "Review & decisions", "Handover & periods". Head: "Project workspace". Stat tiles: "Shared work", "Needs review", "Final packages". Panel "Service work" with the same empty state on all ten: "No work recorded yet. Add the next real piece of work, then share it when it is re…".
- Approvals: heading "Approvals". Files: "Deliverables" and "Add a deliverable". Money: "Invoices", "Raise an invoice", "Spent on it", "Money out". Activity: "Updates", "Post an update", "History", "Team tasks", "Department handovers", "Assign the next step", "Discussion and published updates", "Write a project note". Tasks: "What is left (n)".
- The work-tab kind list is also the same on every project in its markup. The per-service kinds (below) are a client-side picker, so they are only known from source (`lib/workspace/service-model.ts`).

Different between services:
- Work tab label (from `WORK` in `app/admin/projects/[id]/page.tsx`): social → "Content calendar" (p2, p7, p8); branding → "Design rounds" (p1); web → "Build and launch" (p5); apps → "Builds" (p3); software → "Milestones" (p6, p2916087990004041, p2916087990008414); seo → "Content" (p4).
- Work kinds offered by "Add work" (source `SERVICE_KINDS` filtered by `kindsFor(service)`):
  - social: "Content calendar post" (states draft, internal review, client review, approved, scheduled, published, failed; needs approval; "Planned publishing time" and "Timezone" fields). Plus, on social projects only, a toggle between "Social content" and "Paid advertising", which adds "Campaign creative", "Advertising spend approval" and "Campaign launch / delivery".
  - branding: "Creative direction" (accept/decline), "Design review round" (approve, changes requested, round number).
  - web: "Website test or issue" (test states), "Website launch permission" (approve; needs passed tests before "launched").
  - apps: "App test build" (store submission states), "App issue".
  - software: "Software milestone" (accept; needs test results before release), "AI evaluation and limits" (permitted data, escalation owner, approved monthly running-cost limit in naira).
  - seo: "SEO content review" (approve, published page link).
  - all services: "Period report", "Content or access request", "Scope change", "Final package and handover", "Next service period". These are not filtered by service, so an SEO project can be given a "Final package and handover" and a branding project a "Period report". That is the same shell for every service.
- Money tab counts differ with data only.
- Form detail: the work form's "Planned publishing time" and every date field use `datetime-local`, the browser's own picker (`components/workspace/service-workspace-view.tsx`). The owner's standing call replaces native pickers with the site's own components. Not measured in the browser; source only.

What the owner would want to see that is not separate by service: no service-specific Overview. A social project's Overview looks like a software project's Overview (same six sections). SEO's Overview has no reporting cadence. Software has no milestone progress bar. Branding has no revision count on the Overview. These are inferred from the identical markup, not measured in data.

---

## Hidden or unfinished things found

1. `/admin/welcome`: staff onboarding, reachable only through the forced redirect for pending staff (`app/admin/layout.tsx` lines 66 to 71). No link from any page. Owner visits by URL only.
2. `/admin/users` and `/admin/users/departments`: not in the nav. Reached only from Settings ("Team and permissions", "Departments", `lib/settings/sections.ts` lines 37 and 38). Owner-field's "Invite them to the team" opens `/admin/users` in a new tab.
3. `/admin/meetings`: nested under Projects in the sub-nav (`shell.tsx` line 75). Not visible as a top-level item.
4. `/admin/money/reconciliation`: a sub-nav item under Money, and `/admin/clients/support` is a legacy list (its detail page redirects to Messages).
5. `/admin/clients/support/[id]`: redirect only (`app/admin/clients/support/[id]/page.tsx`). Kept for old emails.
6. Query-string-only views, all reachable only from links on the page:
   - `/admin/projects?view=board|timeline|calendar`, `?tab=waiting|done`, `?service=branding|seo|web|apps|software|social`.
   - `/admin/money?tab=quotes|payouts|expenses`, `?status=Paid|Overdue`, `?from=&to=`, `#invoice-list`.
   - `/admin/reports?tab=…`, `?range=`, `?from=&to=`, and the export URLs `/admin/reports/export?report=income|all&format=csv|xlsx`, `/admin/projects/export` (CSV).
   - `/admin/clients/<id>?tab=money|files|people|activity` and `activity?only=money|work`.
   - `/admin/messages?c=t-<id>|p-<id>`, `?kind=`, `?page=`, `?per=`.
   - `/admin/projects/<id>?tab=work&new=1` (opens the add-work form).
7. Reports tab "Owed to us" (key `receivables`, `lib/admin/reports/filters.ts` line 13) is a tab in the code but was NOT in my route list, so it was not run by the tool. Please audit `/admin/reports?tab=receivables` separately.
8. Three-dot menus with items that are hidden unless true:
   - Client ⋮ (`components/admin/client-chores.tsx`): "Merge a duplicate" only when another client exists and this one is not archived; "Put them back on the books" or "Archive them"; "Delete permanently" only when archived (owner area "settings"). Not pressed, as required.
   - Project ⋮ (`components/admin/row-actions.tsx`): "Edit details" only on the project's own page; "Open the project" hidden on the project's own page.
   - Money ⋮ (`components/admin/chores-menu.tsx` usage on `/admin/money`): "New quote" (`?type=quote`), "Reconciliation", "Reports", "Export invoices as CSV", "Payment settings".
9. "Book a meeting" on `/admin/meetings` opens the public `/meet` page in the same tab, leaving the dashboard.
10. "Dismiss" on notice banners does not work (see cross-page pattern A). The notices banner is the only place the migration state is shown on the admin pages.
11. Reports: a primary button with no visible text (`ad__btn ad__btn--primary`) appears on all seven report tabs and the overview. Its target was not identified.
12. Money: a one-pixel control named "Search" (`Search|1x1`) moved to `/admin/reports`.

---

## Cross-page patterns

A. Notice "Dismiss" never sticks (root cause found in source, not in the browser). `components/admin/notices.tsx` line 9 writes `wdc.notices` with `encodeURIComponent(keys.join("|"))`, so the separator is `%7C` and the colon in each key is `%3A`. `lib/admin/notices.ts` line 82 reads the cookie raw and splits on the literal `|`, then compares with keys such as `migrations:…`. A stored key therefore never matches and the banner stays. The tool recorded "Dismiss" as dead on every page that shows a banner: /admin, /admin/clients/support, /admin/money/reconciliation, /admin/reports?tab=sales and ?tab=clients, /admin/welcome, /admin/projects/p2, p6, p2916087990008414, and the notice-bearing pages at 390. Fix: decode the cookie before splitting, or split on `%7C`. Not tested in the browser.

B. Every table has bulk checkboxes under 40px. `Select every …` and `Select <row>` are 18x18 on /admin/clients, /admin/clients/support, /admin/projects, /admin/money, /admin/users, /admin/money/new (INPUT 13x13), and the messages list. The hit area needs to be 44px on phones.

C. Unnamed primary button on Reports (seven tabs). A `ad__btn ad__btn--primary` with no text sits on the report header at 1440 and 390. Either it has an icon and no label, or its label is outside the button. It needs an accessible name.

D. Labels that move somewhere else. The tool recorded these label-to-target mismatches (each recorded, none verified by hand):
- "Snooze" → a client page (/admin/clients/support, 1440), an invoice page (/admin, 390 → /admin/money/i5; /admin/money, 390 → /admin/money/i8).
- "Export" → `/admin/settings/email/log?state=Failed` (/admin/reports?tab=sales, 1440).
- "Search" → `/admin/reports` (/admin/money, 1x1 control).
- "Edit invoice" → `/admin/projects/p3` (/admin/money/i1, 1440).
- "Add or update access" → `/admin/money/i1` (p3) and `/admin/money/i5` (p5), and `?tab=activity` (p2916087990004041).
- "Log a call or message" → `/admin/clients` (/admin/clients/mira, 390).
- "Send reply" (empty) → `/admin/clients/support` (/admin/clients/support/t0, 1440).
- "Add a task" at 390 → the client page (p2, p7, p8, p2916087990004041). Likely a header overlap at phone width.
- "Actions for <project>" → the client page (p7 at 1440; p2916087990008414 at 390). On c2916087989001795 at 1440 the same label went to its project page, so the two are inconsistent.
- "New project" → `/admin/settings/system` (/admin, 1440) and → `?tab=activity` (/admin/clients/mira, 1440).
This pattern needs a hand check. The most likely shared cause is a click landing on an overlapping element (the notice bar or the client link in the header) at the tool's coordinate. I did not confirm that.

E. Dead-by-design or no-feedback actions: "Email it with the pay link", "Try again" (/admin/money/i1), "Remove this line" (/admin/money/new), "Send reminder" (/admin/clients), "Mark all as read" (/admin/notifications), "Apply" (reports, users). The tool's dead test ignores toasts, so these may succeed quietly. Needs a hand check.

F. Old layout still on the main working pages: all ten project pages, /admin/clients/<id>, /admin/money/<id>, /admin/money/new, /admin/messages, /admin/welcome, /admin/users/departments. The owner brief names the NEW layout as the standard for every page. Only /admin and the reports tabs are NEW.

G. Overview page shell repeats on every NEW page: the rail and figure tiles are there. The deck is only on /admin and partly on /admin/clients, /admin/money, /admin/reconciliation, /admin/meetings, /admin/notifications, /admin/users (as HYBRID). The deck pattern is not used on the project pages (the owner asked for a deck on "what needs me here").

H. Print: every route keeps the sidebar in print (`sidebarVisible: true`, 35 of 35). The owner print spec for invoices and receipts is out of this audit's scope (public pages are not on my list), but admin printing shows the navigation.

I. Errors: the one click error is the router error on `/admin/reports?tab=team` ("Router action dispatched before initialization"). Other pages had no page errors.

J. Route-level 4xx/5xx and boundary text: none on any of the 35 routes.

K. Not measured on any route: loading skeletons, error and no-permission states, staff or client view, and the empty states beyond what the default data shows.

L. Tool limitation to remember: "dead" is not proof. Checkbox and row clicks, server actions with a toast, and disabled controls all look dead.

---

## Side effects of the audit run (please check the local database)

The helper clicks every visible control that is not in its skip list (sign out, delete permanently, empty trash, apply migrations, reset, erase, purge, run, and similar). It did NOT skip the following, which write data or send messages. The tool recorded no visible reaction for most of them, but a server action can succeed with only a toast, which the tool does not see:
- `/admin/clients` (1440 and 390): "Send reminder" (recorded dead). A reminder email may have been queued or sent.
- `/admin/money/i1` (1440 and 390): "Email it with the pay link" (recorded dead) and "Try again" (recorded dead). A payment-link email may have been sent for INV-26-JBI3.
- `/admin/money/i1`: "Record a payment" opened a dialog at both widths. The tool did not submit it, but the dialog may hold a draft.
- `/admin/notifications` (1440): "Mark all as read" (recorded dead). The owner's inbox may now show as read.
- `/admin/reports?tab=owing` and `?tab=recurring` (390 and 1440): "Apply" (recorded dead). Filter only, as far as I know.
- `/admin/users` (1440 and 390): "Apply" (recorded dead). Source (`components/admin/settings/users.tsx` line 75) is a GET form for the role filter, so it cannot change a role. Harmless.
- Snooze buttons on /admin, /admin/clients, /admin/clients/support, /admin/money, /admin/money/reconciliation and /admin/notifications: some opened a dialog, some moved to other pages. Snooze may have stored a snooze on a deck item.
- "Dismiss" notice buttons: each writes the `wdc.notices` browser cookie only (no database write), and the dismissal does not stick (pattern A).
- "Post an update", "Export" and "Due next 7 days" were clicked on project and report pages. They open dialogs or download files.
- `/admin/clients/support/t0`: "Send reply" was clicked with an empty box and moved to `/admin/clients/support`. The tool types nothing, so this should have been a no-op or a validation error. Nothing was sent as far as the tool could see.

Recommended: check the outbox (Settings › Email log) and the inbox for anything sent between the start of the run and now, and check INV-26-JBI3 and the Realtors' Practice client's reminder history. I did not check these myself because the checks needed a second Playwright run, which the rules forbid while the audit runs.
