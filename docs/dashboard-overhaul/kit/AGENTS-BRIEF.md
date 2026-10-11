# Brief for the page agents: WDC dashboard prototype

You are designing and building pages of the WDC dashboard prototype: three roles (owner "Admin", staff, client) of one studio product. The home page of each role already exists and is the quality bar. Your pages must look and behave like they were made by the same hand.

Working folder: `/tmp/claude-0/-home-user/9f63f343-f2fc-572f-8909-9449f9c19e38/scratchpad/proto` (call it PROTO). Tools folder: `../pw` (harness and scenario runner). Output folder for builds: `../out`.

## Read first (all of it, in this order)

1. `ds-docs/preferences-ledger.md`: the owner's preferences. Binding.
2. `ds-docs/README.md`, `Writing.md`, `Patterns.md`, `States.md`, `Motion.md`, `Pages.md`, plus `Money.md` or `Settings.md` if your pages touch them. This is the design system. Binding.
3. `kit.css`, `kit.js`, `extras.js`, `shell.html`, `sheet.html`, `popbody.html`, `parts/*.html`: the shared kit. Learn its classes and its JS API.
4. `pages/admin.html` + `pages/admin.js`, then `pages/staff.*` and `pages/client.*`: the finished home pages. Copy their patterns, data style and level of follow-through.
5. `build.py`: how a board is assembled from `pages/<id>.board.json`.

## What you may and may not touch

- CREATE only files inside `pages/` whose names start with your group prefix (given in your task), plus `notes/<prefix>.md`.
- DO NOT edit any shared file: `kit.css`, `kit.js`, `extras.js`, `shell.html`, `sheet.html`, `popbody.html`, `parts/*`, `build.py`, the existing `pages/admin.*`, `pages/staff.*`, `pages/client.*`, or another group's files. Other agents are working in the same folder at the same time.
- If the kit lacks something you need, build it page-locally (your own CSS file, your own markup) using kit tokens and conventions, and write the proposal for moving it into the kit in `notes/<prefix>.md` (what, why, exact CSS/JS).

## A board

`pages/<id>.board.json`: `{"file": "A-Clients.dc.html", "title": "Clients, Owner", "role": 0, "html": "<prefix>-x.html", "js": ["<prefix>-shared.js", "<prefix>-x.js"], "css": ["<prefix>.css"], "headact": "<optional top bar button markup>"}`. `role` is 0 owner, 1 staff, 2 client. The `id` is the json file name. Build one board: `python3 build.py ../out <id>` (from PROTO).

The html file is the page's `main` content only. The shell (sidebar, top bar, sheets, menus, bell, search palette, tour, toasts, confetti) is added for you. `%%PAGER:KEY:Label%%` inserts a pagination footer bound to the hole object `KEY` (from `this.pager(...)` plus an `all` function).

## Template language (strict)

- Holes are LOOKUPS ONLY: `{{name}}` or `{{obj.prop}}`. No expressions, no calls, no operators, no string building in holes. Compute everything in JS.
- Loops: `<sc-for list="{{items}}" as="it" hint-placeholder-count="3">…{{it.x}}…</sc-for>`. Conditionals: `<sc-if value="{{flag}}" hint-placeholder-val="{{ false }}">…</sc-if>`. Nest freely.
- Events: `onClick`, `onChange` (fires on input), `onKeyDown`, `onMouseEnter`, `onMouseLeave`, `onFocus`, `onScroll`, `onPointerDown`, each bound to a function hole. `disabled="{{bool}}"`. Styles may contain holes: `style="width: {{pct}}%"`.
- Inputs: `<input id="stable-id" value="{{q}}" onChange="{{onQ}}">`. Give every input a stable id.

## JS: a class body

Your js files are method definitions inside one class (no `class` keyword, no top-level code). The kit's methods come first; yours follow and can override. Every page MUST define:

`pageState()` (your extra state), `icons()` (usually `return this.baseIcons();` or extend it), `brand()` `{name, sub}`, `me()` `{name, i, role, tone}`, `role()` `'admin'|'staff'|'client'`, `navCounts()` (`{Messages:{n:6}}` etc, same counts as the home page of your role), `pageName()` (top bar title on phones), `navSection()` when the page is a detail page (the nav item to light, e.g. `'Clients'`), `searchHint()`, `palHint()`, `records()` (search palette rows: `{kind, label, sub, ini, tone, sheet | href}`), `recordKinds()`, `notesData()` (bell rows, copy the role's home page set), `tourSteps()` (3 to 5 steps, `{target, title, icon, body, hint?}` where target matches `data-tour="…"` in your html, and include `'search|searchS'`), `walk()` `{nav, bell}` strings, `installCopy()`, `deck()` (return `[]` if the page has no deck), `snoozeOptions()`, `teamData()`, and `renderVals()` which returns `Object.assign(this.kit(), this.extraVals(), { …your holes })`.

Kit API you should use instead of inventing your own:
- Sheets: `this.open(this.sh({eyebrow, title, chip, tone, icon, iconTone, rows:[{k,v}], body, list:[{t,s,tag,tone,logo,ini,av,open:sheet,act:{label,fn}}] | function(state), select:true, pick, checks:[…], compose:true, composeLabel, composePh, vis:'team', required:true, reason:{label,ph,required}, feed:[{t,when}], note, primary: string|fn(ctx,state), primaryDis: fn, secondary, pToast, sToast, onPrimary(ctx), onSecondary(ctx) returning 'stay' to keep open, keepOpen:true, wide:true}), push)`.
- Confirm: `this.ask({eyebrow, title, body, to, subject, preview, needAck, ackText, input, inputLabel, inputPh, ok, okToast, danger, green, tone, icon, back, onOk(text)})`. Confirmations are sheets; never use window.confirm.
- Toast: `this.say(msg, {undo: fn})` or delayed send `this.say(done, {delay: 8, pending: n => '… in ' + n + 's', cancel})`.
- Menus: `this.openPop(e, kind, id, width, height, label, {search, searchPh})` then return items from `popItems(pop)` built with `this.menuItem(label, iconPath, fn, {hint, danger, sub, av, ini, badge})` and `this.menuSep()`. Phones get a bottom sheet automatically.
- Pagination: `this.pager(key, total, size, page, setPage, setSize)` → object for `%%PAGER%%`; add `.all = fn` for View all. Default size 5.
- Previews and flows: `this.openFile(fileObj, push)`, `this.openPost(post, 'client'|'staff', push)`, `this.openPay(invoice, onPaid)`, `this.openQuote(q, onSent)`, `this.openFollow(lead, onSet)`. Read `extras.js` for their data shapes.
- Helpers: `this.ngn(n)`, `this.short(n)`, `this.anim(k)` (alternates `rinA`/`rinB` to replay list animations), `this.later(msg)`, `this.socialLogos()` (`{instagram:{d,c},…}`), `this.payLogos()`, state `p` (0→1 count-up progress after load), `loading` / `ready` holes.

## Every page must have

- A page head: h1 (one per page), a one-line lede, and the page's one action in the head's right slot (chores in a ⋮ menu). Detail pages get breadcrumbs (`crumbs`) linking back, using the real board file names below.
- A skeleton that matches the page's real geometry inside `<sc-if value="{{loading}}">`, with the real content inside `<sc-if value="{{ready}}">`. Never show invented figures while loading.
- Lists paged at 5 with the per-page menu and View all; tables whose WHOLE ROW opens the item (tabindex 0, Enter opens) with a ⋮ menu that does not open the row; tabs using the kit `tabs`/`tab` classes; search with clear and a filtered-no-results state; true empty states with an icon, a sentence and one action.
- Real follow-through on every control: a sheet with real content, a confirmation with nuance, a toast that says what happened and where. No dead buttons. `this.later()` only for things that genuinely belong to another page, and then prefer a real link (`<a href="A-Money.dc.html">`).
- `data-tour` targets for your tour steps.
- Responsive from 320px: phone (390), tablet (834), desktop (1440), in light and dark. No horizontal page scroll. Touch targets 44px. Text-bearing flex/grid children get `min-width: 0`.
- Tokens only (`var(--ad-…)`), solid fills for tags and tiles, no orange outlines anywhere, orange never behind words except `ad-tone-live`/`ad-act` (#b84a00) with white.

## Board files (link between them with these names)

Owner: `D-Admin.dc.html` (Today), `A-Clients.dc.html`, `A-Client.dc.html` (Mira Skincare's client page), `A-Projects.dc.html`, `A-Project.dc.html` (Mira Skincare · Social media management), `A-Money.dc.html`, `A-Messages.dc.html`, `A-Blog.dc.html`, `A-Settings.dc.html`, `A-Support.dc.html`.
Staff: `D-Staff.dc.html` (My Day), `S-Projects.dc.html`, `S-Project.dc.html` (Ade's Kitchen · October content), `S-Clients.dc.html`, `S-Messages.dc.html`, `S-Settings.dc.html`, `S-Support.dc.html`.
Client: `D-Client.dc.html` (Home), `C-Projects.dc.html` (Mira's projects: Brand identity and Social media management, switchable), `C-Billing.dc.html`, `C-Messages.dc.html`, `C-Settings.dc.html`, `C-Support.dc.html`.

## The studio's world (stay consistent with the home pages)

Today is Saturday 10 October 2026. Owner: Babatope A. Team: Funmi K. (Finance), Daniel E. (Web & Apps), Ifeanyi N. (Branding & Design), Chiamaka A. (Social & Ads), Bisi O. (SEO), Tolu A. (Social & Ads, freelancer). Clients: Mira Skincare (Adaeze O.; Brand identity in review round 2, Social media starts 1 Nov after a ₦450,000 deposit INV-26-9QX4LM), Kora Logistics (Adebayo K.; driver app, INV-26-4KQ8ZD ₦850,000 12 days late), Bloom Pharmacy (SEO retainer ₦300,000/month), Ade's Kitchen (Ade B.; social retainer ₦350,000/month, October content), Oak and Ivy Interiors (website launched, handover pending, final invoice ₦520,000), Halo Clinics (booking assistant, care plan ₦500,000/month), Lumen Fitness (Daniel; Instagram ads), Tunde Okafor Law (okaforlaw.ng domain renewal), Zara Events (lead, event website). Numbering: invoices `INV-26-XXXXXX`, quotes `EST-2026-NNN`, receipts `RCT-2026-NNN`. Staff never see amounts. Copy: plain, sentence case, no exclamation marks, no emoji, no city names, "Admin" (never "the owner") in staff and client copy. Avoid dashes in copy; use commas, full stops and the middle dot ` · ` as a separator.

## Verify before you report (measure, do not guess)

From PROTO, for each board:
1. `python3 build.py ../out <id>`
2. `cd ../pw && FULL=1 node harness.js ../out/<file> $PWD/<prefix>-<id> '{}' 1440` then the same with `'{"dev":"phone"}'` and `'{"dev":"tablet","dark":true}'`. The printed JSON must show `"bad": []` and no ERRORS except `ERR_FILE_NOT_FOUND` (images and support.js are expected to miss locally). Fix every small target it lists unless it is a deliberate inline text link.
3. Look at the screenshots (`<prefix>-<id>.png`) with the Read tool: grouping, spacing, alignment, truncation, both themes.
4. Write a scenario (`../pw/<prefix>-<id>.json`, see `../pw/s-admin.json` for the format) that clicks through the important interactions (row click opens a sheet, ⋮ menu, tabs switch, search filters and empties, a confirmation flow, pagination) and run `node scen.js $PWD/<file>.html $PWD/shots 1440 950 <json>` on the html the harness wrote (`<prefix>-<id>.html`). Every step must work; read the shots you take.
5. Iterate until clean. The harness re-renders the whole DOM on every state change, so line-draw animations may look half drawn in screenshots; that is a harness artefact.

## Report back

For each board: what is on it, the interactions you verified (with the scenario results), what you could not finish, and every kit proposal from your notes file. Keep it factual.

Use a distinct output prefix per run (`<prefix>-<id>-ph`, `<prefix>-<id>-dark`) and start every shot name in your scenarios with your prefix, so you never overwrite another agent's files.
