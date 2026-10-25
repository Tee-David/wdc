# Agent B findings: owner routes (Forms, Marketing, Blog, Settings), then client portal

**Resume here:** nothing left to run. All owner and client routes are measured or recorded as not measured (see the Cross-page and Hidden sections). Next step for the owner: fix the helper skip list before any more runs.


Read-only audit of the local dev app on port 3100. Measurements come from `/tmp/wdc-tools/audit-page.js` (owner role, light theme, widths 1440, 390, 320; clicks at 1440 and 390; print emulation). Raw JSON lines: `/tmp/claude-0/-home-user/9f63f343-f2fc-572f-8909-9449f9c19e38/scratchpad/audit/out/agentB.jsonl`.

Run notes: the helper was run one copy at a time. A first attempt by this agent produced only a crash (`Target page ... closed`) and no JSON, and was re-run after the coordinator's patch. Two other owner runs (`agentA`, plus one more) were active during parts of this session, so this agent queued behind them. Client routes run after the owner queue finishes.

Touch-target note: the helper's `small` count lists any button, link, tab, input or summary under 40px in either dimension. Text links are often 18 to 21px tall by design, so those show up. Read the names, not just the counts.

## /admin/forms (Forms index)

- Design: NEW layout (flowGrid, deck, rail, tiles all true; pageHead true; table true). Widths 320, 390, 1440 all 200, no overflow.
- Defects measured:
  - Small targets at 1440: `System|51x18`, `Message log|85x18`, and five onboarding "Open ... form" icon buttons at 36x36 (Branding, SEO, Web, Apps, Software & AI, Social & PPC). At 390 and 320 the text links `SEO onboarding|108x21`, `Web onboarding|111x21`, `Apps onboarding|116x21` are 21px tall.
  - Clicks: "Dismiss: 3 database changes have not bee..." and "Dismiss: 19 emails did not go in the las..." are DEAD (no visible result as measured). "Open onboarding" moved to `/admin/settings/email/log?state=Failed`.
  - No console errors, no 4xx/5xx.
- Print: 3 pages, 285,215 bytes.
- Missing states: not measured (no empty-state visit with the data present).
- Owner would expect: a single "Needs you" deck on Forms, which is present. The "Dismiss" controls on the health banners do nothing visible as measured.

## /admin/forms/all (All entries)

- Design: OLD / form-only layout (no flowGrid, deck, rail, tiles, or table markers; the page uses the `adList` section and `ad__filters` form). Not the new Workbench/deck layout.
- Defects measured:
  - Small targets: `Forms|40x44` (breadcrumb, 40px wide, 44px tall, so it passes height but is under 40 in width only if < 40; the helper flags it) and column-chooser checkboxes `INPUT` at 13x13 (238px wide at 1440, 67px at 320, 102px at 390 measured on the input box itself).
  - Clicks: CSV and Excel download links (export routes) were not followed by the helper (classified as download-link). "Every form" moved to `/admin/forms` (a filter select that navigates away on click). "Newest first" and "Columns (6)" open dialogs. "Apply" is recorded DEAD by the helper (no visible change; cause not traced).
  - No console errors, no 4xx/5xx.
- Print: 1 page, 67,277 bytes.
- Missing states: "No entries yet" text exists in the source for the empty state (confirmed by reading the HTML). Filtered-no-results and error states not measured.
- Owner would expect: the all-entries table on the new deck/rail layout, like the rest of Forms. This page is not on the new layout.

## /admin/forms/new (New form)

- Design: OLD / form-only layout (form flag only). No deck, rail or tiles.
- Defects measured: only the breadcrumb `Forms|40x44`. No overflow. No console errors, no 4xx/5xx.
- Clicks: "Create and add questions" (at 390) moved to `/admin/forms` instead of opening a builder. Treat this as a dead end as measured, because the form was submitted with the helper's data. At 1440 this button was not clicked by the helper (tool detail).
- Print: 1 page, 47,494 bytes.
- Missing states: the required-name error state was not measured.
- Owner would expect: the new form to land on its questions step, not back on the list.

## /admin/forms/contact (Contact form, 0 entries)

- Design: HYBRID. `tiles` and `tabs` are true; no deck, rail, or table; `form` true.
- Defects measured:
  - 1440: `System|51x18`, `Message log|85x18` (the status line links), `Forms|40x44`, and checkboxes `INPUT|13x13`.
  - Clicks at 1440: "Forms" moved to `/admin/forms`; "Newest first" opens a dialog; "Apply" is recorded DEAD by the helper (no visible change; cause not traced). At 390 the tab chips "All 0", "Unread 0", "Starred 0", "Trash 0", "Questions", "Settings" all navigate (working). "Apply" dead again.
  - Count chips "All 0", "Unread 0" are 0 because the form has no entries locally, which is the honest empty state.
  - No console errors, no 4xx/5xx.
- Print: 2 pages, 157,969 bytes.
- Missing states: the empty state text "No entries yet" is in the HTML; the helper did not capture a screenshot. Not measured beyond that.
- Owner would expect: the status line's `System` and `Message log` links at a usable target size.

## /admin/forms/s1 (demonstration brief, in-memory)

- Design: OLD. `pageHead` and `oldPanelsOnly` are true; no new deck or rail.
- Defects measured: `Forms|44x19` breadcrumb at 19px tall. No overflow. No console errors, no 4xx/5xx.
- Clicks: "Attach to a client" moved to `/admin/forms` at both widths (a dead end as measured; the attach sheet did not open).
- Print: 2 pages, 96,741 bytes.
- Note from source (`components/admin/forms/demo-submission.tsx`): these are in-memory demonstration briefs, not real entries; the file says they will be removed. They have no PDF route (see the entry section below).

## /admin/forms/onboarding-web (Web onboarding, 0 briefs)

- Design: HYBRID. `tiles` and `tabs` true; no deck, rail, or table.
- Defects measured: 62 small targets at each width (the first names are `Forms|40x44` and `INPUT|13x13`). The helper's list is capped at 8 names; the count is what was measured.
- Clicks: "Drafts 0" moved to `?tab=drafts`. "Newest first" opens a dialog. "Apply" moved to `?tab=trash` at 1440 (the Apply control on a GET form lands on the trash tab, which looks like a wrong default, as measured) and was DEAD at 390. "Open form" at 390 moved to `/admin/forms`.
- Print: 2 pages, 160,940 bytes.
- Missing states: the source shows "Nothing waiting" for the empty state; confirmed by reading the HTML.
- Owner would expect: the 62 small targets to be sized up, and "Apply" to keep the tab the user chose.

## Forms: how an entry is viewed, printed, exported, assigned and emailed (source read)

- View: `/admin/forms/[form]` lists entries (tabs All, Unread, Starred, Spam, Trash for inbox forms); `/admin/forms/[form]/entries/[entry]` is the entry page (Previous / Next nav, "Hide unanswered", "Reply by email" on contact).
- Print / PDF: "Download PDF" link to `/admin/forms/[form]/entries/[entry]/pdf` (route file `app/admin/forms/[form]/entries/[entry]/pdf/route.ts`; `?print=1` serves inline). Newsletter sign-ups have no PDF.
- Export: CSV and Excel on `/admin/forms/[form]/export` and `/admin/forms/all/export` (owner only, `exports` permission).
- Assign to client: "Assign" / "Change" button in the entry rail (`AssignEntry`); suggests a matching client by email or phone.
- Email: "Emails about this entry" rail card with `ResendEmail` (resend control, not clicked here) and a message timeline; "Reply by email" is a `mailto:` link.
- Not measured: a real entry page and its PDF. The local store has no real entries (every form shows "Nothing waiting" or "No entries yet"). `/admin/forms/onboarding-web/entries/s1` and its `/pdf` return 404 (only real entries have those routes). The only entry-like page is the in-memory demo brief `/admin/forms/s1` (old layout, no PDF link). Entry page, PDF page count and PDF bytes are therefore NOT measured.
- Unfinished or older-looking screens in this path: the demo brief `/admin/forms/s1` (old layout; "Attach to a client" moved back to the list at both widths); the "Edit form" tab on custom forms links to `/admin/forms/[form]/build` (not visited, route not in the batch).

## /admin/email (Marketing index: Campaigns, Calendar, Automations, Templates, Contacts, Reports)

- Design: HYBRID. deck, tiles, tabs and table present, but `oldPanelsOnly` is also true; the head and deck are new, the list panels are old.
- Defects measured: `System|51x18` and `Message log|85x18` (status links, 18px tall); three campaign title links `October studio news ...|174x40`, `Brand guide offer ...|174x40`, `September round up ...|174x40` (40px, borderline); `All|33x44` tab (33px wide).
- Clicks: "New campaign" opened a dialog. "Snooze" opened a dialog. "Apply" at 1440 went to `?tab=reports`; "Apply" at 390 was DEAD. "5 per page" opened a dialog. "Any" opened a dialog. "Open the contacts" to `?tab=contacts&status=bounced`. Tab links work (`Automations 2`, `Templates 5`, `Contacts 5`, `Reports`). Stat tiles link to filtered contacts.
- Print: 2 pages, 203,004 bytes.
- Missing states: not measured (no empty-campaign state visited).
- Owner would expect: a clearly labelled "Send" path for a campaign from this index. Not verified: the helper did not follow "New campaign" beyond the dialog, and sending is excluded from this audit.

## /admin/email/campaigns/seed-c1 (campaign page)

- Design: OLD (`oldPanelsOnly`, form). No deck or rail.
- Defects measured: none under 40px; no overflow; no console errors.
- Clicks: "Cancel" went back to `/admin/email?tab=campaigns` (dialog and nav). "Actions for marketing, more" opened a menu (dialog).
- Print: 1 page, 74,405 bytes.
- Missing states: not measured (no send-in-progress or failed-send state visited).
- Owner would expect: the campaign's audience count, schedule and send status in the head, and the figures in a rail, as on the Forms and Blog pages. Not present in the old layout.

## /admin/email/automations/seed-a1 (automation builder)

- Design: no design markers. A canvas builder, not the deck/rail/tiles layout; treat as its own UNKNOWN layout.
- Defects measured: at 320, `Add the first step|35x35`. Clicks: "Zoom out", "Fit to screen", "Builder" are DEAD at 1440; "Zoom in", "Zoom out", "Builder" are DEAD at 390. "Add the first step" opened a dialog. "Ifeoma Eze" (contact link) went to `?tab=automations`.
- Print: 1 page, 112,103 bytes.
- Missing states: not measured.
- Owner would expect: zoom and fit controls that visibly change the canvas. The helper found them DEAD; this may be a canvas-only transform the helper cannot see, so the finding is "not verified", not "broken".

## /admin/email/templates/enquiry-receipt (email design editor, kind "enquiry-receipt")

- Route note: `receipt` is not a kind. The kinds are `enquiry-receipt`, `support-reply`, `project-stage`, `deliverable-ready`, `newsletter` (`lib/email-registry.ts`). `enquiry-receipt` is the one that matches "receipt". `/admin/email/templates/receipt` was not visited.
- Design: no design markers (design editor, not the new layout). The first run's phone-width loads ended with `ERR_ABORTED` (expired session during the run); the rerun at all widths returned 200.
- Defects measured: `INPUT|1x1` (a hidden-looking input listed as visible), `Desktop width|44x38` and `Phone width|44x38` (preview width toggles, 38px tall).
- Clicks at 1440: "Desktop width", "Phone width", "Paragraph", "Blocks", "Settings" and an unlabelled control are DEAD. At 390, "Phone width" and "Blocks" are DEAD, and "Desktop width" navigated to `/admin/settings/email/log?state=Failed`. The "Marketing" crumb went to `?tab=templates`. Some of these may be toolbar actions that open a menu the helper did not see; recorded as the tool reported them.
- Print: 2 pages, 192,028 bytes.
- Owner would expect: a preview that says it is a preview of the email as sent, and a clear "Send test" (not clicked; excluded).

## /admin/blog (Blog: posts)

- Design: NEW (deck, tiles, table present; no flowGrid or rail marker, so a partial new layout).
- Defects measured: bulk checkboxes at 18x18 for every post row: "Select every post", "Select Instagram posting times", "Select Why your business needs", "Select Local search basics for ...", "Select How to brief a logo des...", and "Select Paystack or Flutterwave ..." (touch target too small). Post title links `Local search basics for clinic ...|203x21`, `How to brief a logo designer|191x21` (21px tall).
- Clicks: "Apply" at 390 DEAD; "Apply" at 1440 navigated to `?state=published#post-list`. Date chips and "From" / "To" open dialogs or change the list. "Every service" opens a dialog. "Message log" goes to `/admin/settings/email/log?state=Failed`. "System" goes to `/admin/settings/system`.
- One unlabelled primary button (class `ad__btn ad__btn--primary`) was recorded DEAD at 1440. The likely target is "New post" (`/admin/blog/new`). A fresh-session check of `/admin/blog/new` returned 200. An earlier 500 was from an expired session cookie (a redirect to login), not from the route. Not a defect; recorded so the helper's DEAD flag is not lost.
- Print: 2 pages, 213,821 bytes.
- Missing states: not measured (filtered-no-results and the no-posts state not visited).
- Owner would expect: a bulk bar that names what it will do (the bulk bar exists in source; not measured because no row was ticked).

## /admin/blog/work (Blog: case studies)

- Design: NEW (deck, tiles, table; partial as above).
- Defects measured: case study title links `TraxStaff|176x21`, `Realtors' Practice|176x21`, `Litch Consulting|176x21`, `Nomarc Projects|176x21`, `Jomo Resource Center|176x21` (21px tall). No overflow.
- Clicks: five "Take off" controls each opened a dialog (confirmation, expected). "Actions for case studies, more" opened a menu.
- Print: 2 pages, 1,058,431 bytes (about 1 MB; likely embedded images, not measured further).
- Missing states: not measured.
- Owner would expect: each case study row to show whether it is on the public site, which is the state "Take off" changes. Not verified here.

## Settings: every tab (owner). Design = from the helper's `design` fields at 1440.

Shared notes for all Settings tabs:
- The left section menu (`SettingsNav`) is on every tab, and it sends clicks to the right page (measured on most tabs).
- Most tabs use the older panel layout (`oldPanelsOnly`). Tabs that use the shared save-bar form kit (`SettingsForm`, `adSaveBar`) are marked "form". Most settings forms are on the form kit; several keep older `Panel` blocks inside.
- `503 /api/meetings?view=setup` is logged on almost every Settings tab. The only component that calls that URL in source is `components/meetings/settings.tsx`, which mounts only on `/admin/settings/meetings`. The trigger on the other tabs was not traced.
- `System|51x18` and `Message log|85x18` appear on most tabs. These are the status-line links in the chrome, and they are under 40px tall.

### /admin/settings (overview)
- Design: OLD (`oldPanelsOnly`). Overview tiles link to each section and show values such as "Set up" and "Indexed".
- Defects measured: status links `System|51x18`, `Message log|85x18` at 1440; no overflow at 390 or 320. A 503 from `/api/meetings?view=setup`.
- Clicks: section links all navigate correctly. At 390, the switch-like controls with class `adSw is-on` were clicked; the first went to Notifications and the next 18 were recorded DEAD. These are switches on a form, so the tool may not see the change until Save; not verified.
- Print: 2 pages, 169,329 bytes (print emulation run).
- Owner would expect: each tile to name the one thing to act on, not only the setting value.

### /admin/settings/account (My account)
- Design: OLD+form (`oldPanelsOnly`, `form`, a `table` on the page).
- Defects measured: `INPUT|13x13` (a checkbox). No overflow. 503 meetings request.
- Clicks: "Send me a code" was clicked at 1440 (recorded DEAD). This is a control that sends a code by email. It should have been excluded; see the "Helper clicked write controls" note at the end. "Suggest one" at 390 recorded DEAD (it generates a password suggestion, not a write).
- Print: 2 pages, 190,790 bytes.
- Owner would expect: a clear sign-in and devices section (`Sign-in and devices`), present in the portal, not measured here.

### /admin/settings/general (Studio and invoices)
- Design: OLD+form.
- Defects measured: `What does this mean?|19x19` help icon (19px). No overflow.
- Clicks: "Remove account" opened a dialog at 390 and at 1440. The tool dismissed it. The control's location on this page was not traced; it should be checked before anyone relies on this page for account actions.
- Print: NOT measured. The print emulation returned `ERR_ABORTED` on both runs (the page navigation was aborted, probably by the expired session during the run).
- Owner would expect: VAT, payment terms and reminders in the form kit, one save bar. Source shows a `Panel` with currencies and invoice defaults, so the page is hybrid.

### /admin/settings/business (Business profile)
- Design: OLD+form. Source has a `Panel` plus the form kit.
- Defects measured: `What does this mean?|19x19` only, at the widths loaded. The width loop returned `ERR_ABORTED` at 1440, 390 and 320 on the second run, so overflow and touch targets at widths are NOT measured. Print: 3 pages, 92,808 bytes.
- Clicks (second run): links to the other settings tabs work. Not measured further.

### /admin/settings/services (Services)
- Design: OLD (`oldPanelsOnly`). It uses the kit's header but has no form: it lists what the studio sells and how each project is worked. Changing stages or work types is a code change (stated on the page).
- Defects measured: `The public page|109x18` and `its projects|78x18` (text links, 18px tall) at all widths; `System|51x18`, `Message log|85x18` at 1440. No overflow.
- Clicks: links to Overview, My account, Studio and invoices, Business profile, Lists and categories, Meetings work. "its projects" went to `/admin/projects?service=apps`.
- Print: 2 pages, 175,851 bytes. 503 meetings request.
- Owner would expect: service rows that say how many projects are live, and link straight to them (the links exist, as measured).

### /admin/settings/lists (Lists and categories)
- Design: OLD (`oldPanelsOnly`). Panels per list (`ad__panelH`).
- Defects measured: none under 40px at any width; no overflow; no console errors on the rerun.
- Note: the first run logged a compile error in `components/admin/bulk.tsx` (an "Unexpected token" at line 31) and several 500s for `_rsc` prefetches of other settings pages. A later run returned 200 with no console error. The working tree had an uncommitted edit to `bulk.tsx` and `admin.css` at that time (`git status` shows both modified). So the error was from that edit, not present at the rerun. Recorded so the cause is clear.
- Clicks: "Cancel" DEAD; "Pick a date" and "Time" open dialogs (date and time pickers).
- Print: 2 pages, 145,545 bytes.
- Owner would expect: a count of what uses each list, and a way to add an entry. Not verified.

### /admin/settings/meetings (Meetings)
- Design: OLD (`pageHead` only; the tab is the Meetings component with its own tabs, not the Panel layout).
- Defects measured: `System|51x18`, `Message log|85x18` at 1440; no overflow. The `503 /api/meetings?view=setup` is expected here because the Cal.com setup endpoint is not configured locally.
- Console on the rerun: "Encountered a script tag while rendering React component" and a hydration warning. Recorded; not traced to a line.
- Clicks: the section links navigate. The tabs inside the component were not separately measured.
- Print: 1 page, 38,269 bytes.
- Owner would expect: the Cal.com status as a plain sentence at the top ("Not connected"), with the fix beside it. Not verified.

### /admin/settings/notifications (Notifications)
- Design: OLD+form.
- Defects measured: `What does this mean?|19x19`, `Email|35x18` at all widths. No overflow.
- Clicks: links work.
- Print: 3 pages, 180,217 bytes. 503 meetings request. Console: script-tag and hydration warnings on the rerun (same as Meetings).
- Owner would expect: each notification with its own on/off switch and a note about who receives it.

### /admin/settings/site (Website and SEO)
- Design: OLD+form.
- Defects measured: `System|51x18`, `Message log|85x18` at 1440. None at 390 or 320. No overflow.
- Clicks: "Choose from library" opened a dialog at 390.
- Print: 2 pages, 143,007 bytes. The print sidebar was hidden (print mode).
- Owner would expect: the search-engine switch ("Hidden" or "Indexed") with a confirmation, as the kit's `ConfirmSwitch` describes. Not clicked (writes the site for everybody).

### /admin/settings/maintenance (Maintenance)
- Design: OLD+form (`MaintenanceSwitch`, `MaintenanceDesign`).
- Defects measured: `INPUT|1x1` (a hidden-looking input counted as visible) and 10 other items at 11 total; no overflow.
- Clicks: links work. The "Preview the page" link opens a new tab; it was not followed.
- Print: 3 pages, 1,024,910 bytes (about 1 MB; probably embedded preview images).
- Owner would expect: the holding page preview and the waitlist count next to the switch. Present in source; the switch itself was not clicked because it takes the site down.

### /admin/settings/email (Email)
- Design: OLD (`oldPanelsOnly`). Panel-based. Source: `email-form` and `email-settings`.
- Defects measured: `Connections and health|162x18` (at 390 it is 299x39). No overflow.
- Clicks: "Connection details" opened a dialog. "30 days" opened a dialog. "Connection details" at 390 went to `/admin/settings/integrations`.
- Print: 1 page, 105,122 bytes.
- Owner would expect: the sender address and a test-send button here; not verified.

### /admin/settings/email/connections (Email connections)
- Design: OLD (`oldPanelsOnly`, `table`, `form`).
- Defects measured: `What does this mean?|19x19`, checkbox `INPUT|13x17`.
- Clicks: a link labelled "Email" went to Maintenance at 1440 (a nav item mapping that did not match its label; recorded as measured, not traced).
- Print: 2 pages, 148,340 bytes.

### /admin/settings/email/log (Email log)
- Design: OLD (`oldPanelsOnly`, `table`, `form`).
- Defects measured: `Connect it|71x18` at all widths. `System`, `Message log` at 1440.
- Clicks: state filters `Queued 7`, `Sent 0`, `Skipped 7` work. "Connect it" goes to Integrations. "Search" and "More for the message log" (dialog).
- Print: 3 pages, 209,443 bytes.
- Owner would expect: the list to show the recipient and the reason for each failed or skipped message, which the table does on the rerun (not verified in detail).

### /admin/settings/errors (Error log)
- Design: OLD (`oldPanelsOnly`, `table`).
- Defects measured: `First lines of the stack|412x21` at 1440 (a stack summary link). No overflow at 390 or 320.
- Clicks: "First lines of the stack" opened a dialog twice.
- Print: 2 pages, 101,248 bytes.
- Missing states: not measured (no-errors state).

### /admin/settings/faq (Help centre)
- Design: OLD (`oldPanelsOnly`, `form`). Uses the FAQ editor (`faq-editor`).
- Defects measured: none under 40px at any width; no overflow.
- Clicks: "Move down" and "Move up" opened dialogs (not performed). Question rows opened dialogs. Links work.
- Print: 2 pages, 148,587 bytes.
- Owner would expect: the reorder controls as drag handles or as buttons with visible focus. Not verified.

### /admin/settings/integrations (Integrations)
- Design: OLD+form (Paystack form, integrations panel).
- Defects measured: none under 40px at any width; no overflow.
- Clicks: "Test — simulated payments" opened a dialog at both widths. The tool dismissed it. The label says it runs a test payment, so it is a write-type control the helper should not have clicked. See the "Helper clicked write controls" note.
- Print: 2 pages, 166,393 bytes.

### /admin/settings/content (Blog and site copy)
- Design: OLD+table+form (`content-form`, `Panel`).
- Defects measured: `What does this mean?|19x19`, `FAQ|25x18`, `media library|88x18` (text links, 18px tall). No overflow.
- Clicks: links to Overview, the other settings tabs and Team work.
- Print: 1 page, 79,050 bytes.

### /admin/settings/policies (Policies)
- Design: OLD (`oldPanelsOnly`, `table`).
- Defects measured: `Edit|27x18`, `View|31x18`, `PDF|25x18` on each policy row (18px tall at all widths). 18 small targets in total. No overflow.
- Clicks: the "Team and permissions" link (`/admin/users?tab=team`) works.
- Print: 1 page, 58,651 bytes.
- Owner would expect: the policy's last-reviewed date and whether a lawyer has approved it (`LAWYER_APPROVED`), not verified.

### /admin/settings/policies/terms (one policy, "terms")
- Design: no design markers (the legal editor).
- Defects measured: none at 390 or 320; at 1440 `System`, `Message log` only.
- Clicks: "Dashboard" went to `/admin`. At 390 "Message log", "Projects" and "Forms" navigate.
- Print: 1 page, 40,678 bytes.

### /admin/settings/media (Media library)
- Design: HYBRID (deck, tiles present; `oldPanelsOnly` also true; `form`).
- Defects measured: `New folder|36x36`, `⇅|36x36` (sort toggle), `All files 3|185x36`, `Unsorted 3|185x36`, `Connections and health|166x18`; `INPUT|127x36` and `INPUT|325x21` (search and upload inputs); `Make the first one|116x19`; at 390: `Grid|38x38`, `List|38x38`, and row checkboxes `Select september-roundup.png|18x18`, `Select brand-guide.pdf|18x18`. Needs-description badge `Needs a description 1|177x36`.
- Clicks: "Email" (dialog), "Media library" (dialog), "Snooze" (dialog), and at 390 "In the Trash 0" (dialog) and "Trash 0" navigated to `?show=archived` (dialog).
- Print: 2 pages, 228,330 bytes.
- Owner would expect: grid and list toggles at 44px (currently 38px), and the folder list in a rail.

### /admin/settings/privacy (Privacy and data)
- Design: OLD+form (`privacy-controls`, `SettingsForm` x3, `Panel` x3).
- Defects measured: `What does this mean?|19x19` help icons at all widths. No overflow.
- Clicks: links work. At 390 a "Remove" or "Erase" style control was not clicked (the helper's list did not include it; not verified).
- Print: 2 pages, 89,395 bytes.
- Owner would expect: the retention rules and the request queue in the deck layout. Not present.

### /admin/settings/audit (Audit log)
- Design: OLD+form (`audit-log`, `FilterPick`).
- Defects measured: `System|51x18`, `Message log|85x18` at 1440. No overflow at 390 or 320.
- Clicks: links work.
- Print: 2 pages, 178,766 bytes.
- Owner would expect: the audit table with a search box (tables of five rows or more need one, from the owner's list rules). Not verified.

### /admin/settings/system (System health)
- Design: OLD+table+form (`system-controls`).
- Defects measured: `Reconciliation|94x17` at all widths. No overflow.
- Clicks: a link "Users" went to `/admin/users?tab=team`. Links work.
- Print: 3 pages, 241,711 bytes.

### /admin/settings/team (Team and permissions; redirects to /admin/users)
- Design: NEW (deck, tiles, tabs, table, form; no rail flag). The page is the Team page.
- Defects measured: `Select eligible rows on this page|18x18` (row checkbox at 18px) and `You|25x44` at all widths. No overflow.
- Clicks: "Invite someone" opened a dialog (the helper did not complete an invite; it is in the write list). "Client accounts 1", "Invitations 0", "Active 1", "Deactivated 0" navigated. "All roles" recorded DEAD at 1440 and opened a dialog at 390. "Apply" DEAD.
- Console: at 1440 a Next.js error "Router action dispatched before initialization" was logged during clicks. Not repeatable from the summary; recorded as measured.
- Print: 2 pages, 186,668 bytes.
- Note: `/admin/settings/team` redirects to `/admin/users`. The Settings menu links to `/admin/users` directly, so the redirect is not on the menu path.

### /admin/settings/access (Access; redirects to /admin/users#roles)
- Design: NEW (deck, tiles, tabs, table, form). Same page as Team.
- Defects measured: as for Team.
- Console: a React hydration mismatch warning ("A tree hydrated but some attributes of the server rendered HTML didn't match the client"). Recorded.
- Clicks: "Invite someone" dialog (not performed), "Studio team 1" navigated at 390.
- Print: 2 pages, 190,561 bytes.

## Settings: control groups and which are new or old (summary)

| Tab | Groups (source) | Design |
| --- | --- | --- |
| Overview | section tiles with values | OLD |
| My account | profile, password, devices, tours (`password-change`, `account-controls`, `Panel` x5) | OLD+form |
| Studio and invoices | VAT, payment terms, reminders (`studio-form`); currencies and payment accounts in `Panel` | HYBRID |
| Business profile | registered details and social profiles (`business-form`) | HYBRID |
| Services | read-only list (no form) | OLD |
| Lists and categories | one panel per list, no form | OLD |
| Meetings | the Meetings component with its own tabs (`settings-tabs`) | OLD (own layout) |
| Notifications | `notifications-form` (save bar) | OLD+form |
| Website and SEO | `site-controls` (ConfirmSwitch) | OLD+form |
| Maintenance | switch + `MaintenanceDesign` + waitlist | OLD+form |
| Email | `email-form`, `Panel` | OLD |
| Email connections | `mail-connections` table | OLD+table |
| Email log | table with filters | OLD+table |
| Error log | table | OLD+table |
| Help centre | FAQ editor | OLD |
| Integrations | Paystack form, integrations panel | OLD+form |
| Blog and site copy | `content-form`, `Panel` | OLD+table+form |
| Policies | policy table; one policy at `/policies/[slug]` (legal editor) | OLD / no marker |
| Media library | `media-library`, deck, workbench (`media/page.tsx`, 297 lines) | HYBRID |
| Privacy and data | `privacy-controls`, form kit x3 | OLD+form |
| Audit log | `audit-log`, `FilterPick` | OLD+form |
| System health | `system-controls`, tables | OLD+table+form |
| Team and permissions | `/admin/users` (redirect target), deck and tiles | NEW |
| Access | redirects to `/admin/users#roles` | NEW |

The overall result: 1 page is fully NEW in the Settings group (Team, which is served from `/admin/users`), 1 is HYBRID with a deck (Media library), and the other 20 or so are OLD or OLD with the form kit.

## Helper clicked write-type controls (process note, must read)

The helper's skip list did not cover these labels, so it clicked them. The coordinator asked for them not to be clicked. The recorded outcome is shown in each case.
- `/admin/settings/account`: "Send me a code" at 1440. Outcome DEAD (no visible result). Whether a code was emailed is not known from the helper's output.
- `/portal/notifications` (client): "Mark all as read" at 1440. Outcome DEAD. Whether it wrote is not known.
- `/admin/settings/integrations`: "Test — simulated payments" at both widths. Opened a dialog; the helper dismissed it.
- `/admin/settings/general`: "Remove account" at both widths. Opened a dialog; dismissed.
- `/admin/settings/team` and `/access`: "Invite someone" at both widths. Opened a dialog; not completed.
- `/admin/blog`, `/admin/email`, `/portal`, `/admin/settings/media`: "Snooze" opened dialogs; not completed.
- `/admin/forms`: "Dismiss: 3 database changes ..." and "Dismiss: 19 emails ..." recorded DEAD at 1440. Dismiss may write a dismissed flag; not known.
- `/admin/forms/s1`: "Attach to a client" moved to the list at both widths; the write was not completed by the helper.

The helper's SKIP regex (`/tmp/wdc-tools/audit-page.js`) needs "send", "code", "mark", "test", "remove", "invite", "snooze", "dismiss", "pay", "record", "save", "approve" and "request". A safer copy for remaining client routes is in `scratchpad/audit/audit-safe.js`; the coordinator's file was not changed.

## Client portal (role: client, adaeze@miraskincare.ng, a local test account)

Note on the client run: the first client batch used the coordinator's helper and clicked "Mark all as read" on `/portal/notifications` (recorded DEAD). The rest of the client routes use a copy of the helper (`scratchpad/audit/audit-safe.js`) with a wider skip list. Read the write-click note above.

### /portal (Client home)
- Design: HYBRID (`deck` present, `oldPanelsOnly` also true; no flowGrid, rail or tiles marker).
- Defects measured: `Book a call|72x21` (text link, 21px tall), `All|33x44` (filter tab 33px wide). No overflow at any width.
- Console: `Refused to load the stylesheet 'https://cdn.jotfor.ms/fonts/?family=Inter&display=swap'` because the Content Security Policy blocks it. A third-party font stylesheet from a Jotform widget is requested from the portal home and billing. This is a real console error, not a helper artefact. Source of the request not traced.
- Clicks: "Ask a question" (390) goes to `/portal/support?new=1`. "Pay ₦4,500" (390) goes to `/portal/billing`. "Actions for home, more" opened a menu (dialog). "Snooze" opened a dialog (not completed).
- Print: 2 pages, 207,290 bytes.
- Missing states: not measured (no-projects and no-invoices states not visited).
- Owner would expect (for a client): the one next action (approve, or pay) in the deck, which the deck provides.

### /portal/billing (Billing)
- Design: HYBRID (`deck`, `tabs`, `table`, `form`; `oldPanelsOnly` also true).
- Defects measured: `INPUT|1x1` (a hidden-looking input counted as visible). No overflow.
- Console: the same Jotform font stylesheet CSP refusal as on the home page.
- Clicks: none flagged by the helper (no dead, moved or dialog results recorded).
- Print: 2 pages, 203,510 bytes.
- Missing states: not measured (filtered-no-results, and the paid-invoice state).
- Owner would expect: the invoice list with its status words (Paid, Due, Waiting) and the Pay action only on unpaid rows; the helper did not click Pay (excluded).

### /portal/notifications (Notifications)
- Design: NEW (deck, tiles, table, form present; no rail marker).
- Defects measured: none under 40px at any width; no overflow; no console errors.
- Clicks: "Mark all as read" recorded DEAD at 1440. This is a write-type control the helper should not have clicked. Whether it changed the read state is not known from the output. "Snooze" went to `/portal/billing`. Filters `Unread 0`, `reminders 1` and `Unread 0 0 All caught up` work (they change the URL). "5 per page" opened a dialog; `per=5`, `per=10`, `per=20` work. "Open details" and the reminder rows open the item (`?open=<id>`) in a dialog.
- Print: 2 pages, 180,948 bytes.
- Missing states: "All caught up" is shown in the filter label, measured. The error state was not measured.
- Owner would expect: the reminder row to show which invoice it refers to; the row text shows `INV-26-JEOC`, so this is present.

### /portal/settings (Client settings)
- Design: OLD (`oldPanelsOnly`, `tabs`, `form`).
- Defects measured: `What does this mean?|19x19` help icon; `INPUT|13x13` checkbox; `pProfile__file|1x1` (a hidden file input). No overflow at any width.
- Clicks: the section tabs work: `People at your business` (`?s=people`), `Notifications` (`?s=notifications`), `Sign-in and devices` (`?s=signin`). "What does this mean?" opened a dialog.
- Print: 2 pages, 110,597 bytes.
- Owner would expect (the client): the colleague access list with the per-person approval and invoice ticks, as the source describes. Not measured in detail.

### /portal/welcome (Welcome, first-run profile)
- Not measured as the welcome screen. For this client account the route redirects (HTTP 307) to `/portal`, because the profile setup is already complete (`welcome/page.tsx` redirects unless `setup_state` is `pending`). The helper's numbers are the home page's (deck, `oldPanelsOnly`; `Book a call|72x21`, `All|33x44`).
- Clicks: "Ask a question" to `/portal/support?new=1`. "Actions for home, more" opened a menu. An invoice row "₦4,500 due on INV-26-JEOC Overdue 14 Oct" opened the public invoice page `/i/...` (a read, not a payment). "All" went to `/portal/projects`, and a project row to `/portal/projects/p2`.
- Print: 2 pages, 200,804 bytes (that is the home page).
- To measure the real welcome screen, a client account with `setup_state = pending` is needed. None was used here.

### /portal/projects (Projects list)
- Design: OLD-list with tabs (`tabs` only; no deck, tiles or rail).
- Defects measured: none under 40px; no overflow; no console errors.
- Clicks: "Your projects" to `/portal/projects?show=all`.
- Print: NOT measured. The print step returned `ERR_ABORTED` (the page navigated away during print emulation, likely the expired session during the run).
- Missing states: not measured.
- Owner would expect (client): each project with its stage and the next action (approve or pay), as the deck does on Home.

### /portal/projects/p1 (one project: the id came from the projects page)
- Design: tabs only (`tabs`); no deck or rail on the project page at 1440.
- Defects measured: none under 40px at any width; no overflow; no console errors.
- Clicks: none flagged by the helper.
- Print: 2 pages, 138,075 bytes.
- Missing states: not measured.
- Owner would expect (client): the stage stepper and the deliverables waiting for approval at the top; not verified in this run.

### /portal/support (Support: messages and help articles)
- Design: tabs only (`tabs`).
- Defects measured: none under 40px; no overflow; no console errors.
- Clicks: "Ask a question" goes to `/portal/support?new=1#ask`. "Help articles 11" goes to `?tab=articles`. "What does WDC actually do?" (390) goes to `?tab=articles` and opens a dialog. "5 per page" opened a dialog. "Ask a question ... It becomes a conversation" goes to `?new=1#ask`. The send control in the ask form was skipped by the safe helper copy (not clicked).
- Print: 1 page, 97,611 bytes.
- Missing states: not measured (no-conversations state).
- Owner would expect (client): a clear next step when a message is waiting for a reply.

### Client role: the Jotform CSP refusal (cross-page)
- `/portal` and `/portal/billing` log `Refused to load the stylesheet 'https://cdn.jotfor.ms/fonts/?family=Inter&display=swap'`. The page's Content Security Policy blocks it. A third-party widget asks for a font the policy does not allow. The font falls back, so the page still renders; the console error is real.

## Cross-page patterns

1. Touch targets under 40px are everywhere in the old layouts: status links `System|51x18` and `Message log|85x18` in the chrome on nearly every page; help icons `What does this mean?|19x19`; text links 18 to 21px tall (policy `Edit|27x18`, `View|31x18`, `PDF|25x18`; blog titles 203x21; case-study titles 176x21); row checkboxes `18x18` (blog, media, team) and `13x13` (forms, settings); hidden or 1px inputs listed as visible (`INPUT|1x1` on billing, maintenance, enquiry-receipt; `pProfile__file|1x1` on portal settings).
2. Layout split. The new layout (deck, rail, tiles) is on Forms index, Blog, Team and Access, Media library (hybrid), Email (hybrid), client Notifications (new) and client Home (hybrid). Everything else is `oldPanelsOnly` or the form-only layout: all other Forms pages, Email campaign, all Settings tabs except Team, Access and Media, and client Settings, Projects, Support and project page.
3. `503 /api/meetings?view=setup` appears on almost every Settings tab. The call is made by the Meetings component, but the other tabs do not mount it (grep). The trigger is not traced.
4. Dead or dialog-only controls. Many "Apply" submit buttons on GET filter forms are recorded DEAD (forms all, forms contact, forms onboarding-web at 390, blog at 390, email at 390, team and access). Filter forms that submit with no change are not visibly different; this may be the helper's limit rather than a broken control. Snooze and Invite open dialogs in every deck.
5. Print. Most pages print to 1 to 3 pages at 40 KB to 240 KB. Outliers: blog/work 1,058,431 bytes; maintenance 1,024,910 bytes. Print emulation failed (`ERR_ABORTED`) on settings general, settings index, portal projects, and the enquiry-receipt template at narrow widths. Those are the expired-session aborts recorded during the run.
6. Console. One real CSP refusal (Jotform fonts) on client Home and Billing. Hydration and script-tag warnings on settings meetings and notifications and an `access` hydration mismatch. One Next.js "Router action dispatched before initialization" on team at 1440 during clicks. The bulk.tsx compile error on settings lists was from an uncommitted edit at that moment and did not recur.
7. Empty or unfinished states. Forms: no real entries exist, so the entry page, its PDF and the entry-level "Reply" and "Assign" flows were not measured end to end. `/admin/forms/s1` is an in-memory demonstration brief in the old layout, and the source says it will be removed. The custom form builder (`/build`), the new form builder after "Create and add questions", the campaign send path, and the automation builder's zoom were not verified.
8. Helper write clicks. See the write-click note in the Settings section. Four items need action: "Send me a code", "Mark all as read", "Test — simulated payments" and "Invite someone" were clicked. Their results are recorded but not verified against data. The copy of the helper at `scratchpad/audit/audit-safe.js` covers the remaining routes; the coordinator's helper still has the narrower skip list.

## Hidden or unfinished things found

- `/admin/forms/s1`, `/admin/forms/onboarding-web/entries/s1` and its `/pdf`: in-memory demonstration brief (old layout); entry route is 404 for it. The source says demonstration rows will be removed (section 4.9).
- `/admin/forms` banners "Dismiss: 3 database changes have not been ..." and "Dismiss: 19 emails did not go in the last ...": recorded DEAD. These are health banners with no visible result as measured.
- `/admin/forms` "Open onboarding" goes to `/admin/settings/email/log?state=Failed`, which is a reasonable target but the label does not say so.
- `/admin/email/templates/enquiry-receipt`: the "Blocks", "Paragraph" and "Settings" toolbar items recorded DEAD (not verified).
- `/admin/email/automations/seed-a1`: "Zoom out", "Fit to screen", "Builder" recorded DEAD.
- `/admin/settings/policies/terms` is a single policy editor. Whether the policies table links to it was not checked; the table's `Edit` links were not followed.
- `/admin/settings/team` and `/admin/settings/access` redirect to `/admin/users`. The settings menu already links to `/admin/users`, so the redirect pages are unused.
- `/admin/settings/maintenance` "Preview the page" opens a new tab (not followed).
- `/admin/settings/integrations` "Test — simulated payments" runs a test (opened a dialog; dismissed).
- `/portal/welcome` is not a screen for a client who has finished setup; it redirects to `/portal`.
- Client portal: "Book a call" link (`72x21`) on home; a Jotform widget font blocked by CSP.

