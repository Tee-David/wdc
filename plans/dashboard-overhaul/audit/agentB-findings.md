# Agent B findings: owner routes (Forms, Marketing, Blog, Settings), then client portal

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
  - Clicks: CSV and Excel download links (export routes) were not followed by the helper (classified as download-link). "Every form" moved to `/admin/forms` (a filter select that navigates away on click). "Newest first" and "Columns (6)" open dialogs. "Apply" is DEAD (no visible change as measured, because the form was already in that state).
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
  - Clicks at 1440: "Forms" moved to `/admin/forms`; "Newest first" opens a dialog; "Apply" is dead (no visible change, as measured). At 390 the tab chips "All 0", "Unread 0", "Starred 0", "Trash 0", "Questions", "Settings" all navigate (working). "Apply" dead again.
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

