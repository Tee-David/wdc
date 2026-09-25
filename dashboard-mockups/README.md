# WDC dashboard mockups

High-fidelity mockups of the WDC admin dashboard and client portal, for desktop (1440px) and mobile (390px): every page, sheet, dialog, menu and state.

## What is in here

| Path | What it is |
|---|---|
| `index.html` | Gallery of every board, grouped by page. Open it straight from the folder. |
| `screens/*.png` | A 1× screenshot of every board, named after its source file. |
| `source/*.dc.html` | The boards themselves. Each is HTML with WDC class names; links between boards work. |
| `source/wdc.css` | All tokens and component styles the boards use. Start here when you implement. |
| `source/support.js` | The small runtime that renders the boards (shared components, loops, conditions). |
| `source/canvas.json` | Board sizes, titles and how they are laid out on the design canvas. |
| `source/brand/` | Logo and icon SVGs, copied from `frontend/public/brand`. |
| `scripts/` | Regenerate `screens/` and audit the boards (below). |

## Previewing the live boards

The boards load shared pieces (sidebar, top bar, mobile tabs) at runtime, which a browser blocks on `file://`. Serve the folder instead:

```sh
cd wdc-dashboard-mockups
python3 -m http.server 8000
# then open http://localhost:8000/ and use "Open the live board"
```

## Regenerating the screenshots and checking the boards

Both scripts serve `source/` themselves and use the frontend's own Playwright, so run `npm ci` in `frontend/` first.

```sh
node dashboard-mockups/scripts/screens.mjs          # every board into screens/
node dashboard-mockups/scripts/screens.mjs MTabs    # just the boards named
node dashboard-mockups/scripts/audit.mjs            # wraps, overflow, off-board overlays; exits 1 on any
```

If the installed browser does not match the pinned Playwright, point at one with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## How this folder relates to the app

These are the target for the dashboard redesign, tracked in section 4.11 of `IMPLEMENTATION_CHECKLIST.md`. Where a mockup and the rules in `AGENTS.md` disagree, `AGENTS.md` wins. The one board that is deliberately NOT a target is the invitation page (`PInvite`, `PMInvite`): the real page uses the shared auth shell (`components/auth/auth-shell.tsx`, the orb, greeting and royal-blue panel that log-in and forgot-password use), and only its content (who invited you, the address shown rather than asked for, the password with a strength meter, what the portal is for) is taken from the mockup.

## Rules the mockups follow

- **Tags, pills, badges and icon tiles** use solid fills with white text or icons, and every one passes WCAG AA. Tones in `wdc.css`: good `#15803d`, warn `#a16207`, bad `#c62828`, live `#c95000`, flat `#6b6d8a`, neutral `#5c5c7a`. In the app they map to `--ad-tone-*` / `--ad-on-*` in `components/admin/admin.css`.
- **Admin primary buttons** are a navy fill with a white label in light mode, and an orange fill with a black label in dark mode (`--fill` / `--on-fill`).
- **Every list** has a rows-per-page picker, and its Previous/Next arrows sit beside their labels, on desktop and mobile.
- **Date filters** offer presets plus a custom range, and every list that filters by date uses them.
- **Nothing overflows its container at the drawn size.** Long values truncate, and table description cells wrap.
- **Touch targets** are at least 44px on mobile.
- **The sidebar** keeps its menu at the top, scrolling, with the tour card and profile pinned to the bottom.
- **Settings** use a single section menu (`SetNav`) on desktop and a grouped list on mobile. Secrets such as the SMTP password and the Paystack keys are shown only as set or not set.
- **Forms** keep the eight coded forms (six onboarding briefs, Contact, Newsletter) and add a builder for new forms. Entries, columns, export, trash, notifications and versions are drawn.

## Boards

### Admin · desktop (27)

- `Main.dc.html` · Dashboard · 1440×1600
- `MainDark.dc.html` · Dashboard · dark theme · 1440×1600
- `DashCommand.dc.html` · Search anything (⌘K) · 1440×1000
- `DashNotify.dc.html` · Notifications, account and New menus · 1440×1000
- `Clients.dc.html` · Clients · everyone · 1440×1250
- `ClientsService.dc.html` · Clients · by service · 1440×1250
- `ClientsFilter.dc.html` · Clients · filter and row menus · 1440×1000
- `ClientsAdd.dc.html` · Clients · add a client · 1440×1000
- `Client.dc.html` · Client detail · 1440×2000
- `ClientEdit.dc.html` · Client · edit details · 1440×1000
- `ClientMerge.dc.html` · Client · merge a duplicate · 1440×1000
- `Projects.dc.html` · Projects · board · 1440×1150
- `ProjectsList.dc.html` · Projects · list with stage menu · 1440×1150
- `ProjectsNew.dc.html` · Projects · open a project · 1440×1000
- `Project.dc.html` · Project detail · 1440×2050
- `ProjectUpdate.dc.html` · Project · post an update · 1440×1000
- `ProjectDeliverable.dc.html` · Project · add a deliverable · 1440×1000
- `Money.dc.html` · Money · 1440×2300
- `MoneyInvoice.dc.html` · Money · new invoice · 1440×1000
- `MoneyPayment.dc.html` · Money · record a payment · 1440×1000
- `MoneyExpense.dc.html` · Money · add an expense · 1440×1000
- `MoneyFilters.dc.html` · Money · filters with dates · 1440×1000
- `Invoice.dc.html` · Invoice detail · 1440×1400
- `Reconciliation.dc.html` · Money · reconciliation · 1440×1400
- `Blog.dc.html` · Blog · 1440×1100
- `BlogEditor.dc.html` · Blog · editor · 1440×1500
- `BlogPublish.dc.html` · Blog · publish or schedule · 1440×1000

### Admin · mobile (21)

- `MDashboard.dc.html` · Dashboard · 390×1900
- `MMore.dc.html` · More menu · 390×844
- `MSearch.dc.html` · Search · 390×844
- `MNew.dc.html` · Create menu · 390×844
- `MClients.dc.html` · Clients · 390×1300
- `MClient.dc.html` · Client detail · 390×1900
- `MClientsFilter.dc.html` · Clients · filter sheet · 390×844
- `MClientAdd.dc.html` · Add a client · 390×1300
- `MProjects.dc.html` · Projects · 390×1400
- `MProject.dc.html` · Project detail · 390×2000
- `MProjectUpdate.dc.html` · Post an update · 390×844
- `MRowActions.dc.html` · Move stage · action sheet · 390×844
- `MMoney.dc.html` · Money · 390×1900
- `MInvoice.dc.html` · Invoice detail · 390×1500
- `MPayment.dc.html` · Record a payment · 390×844
- `MNewInvoice.dc.html` · New invoice · 390×1400
- `MDateRange.dc.html` · Choose dates · 390×844
- `MReconciliation.dc.html` · Reconciliation · 390×1300
- `MBlog.dc.html` · Blog · 390×1100
- `MBlogEditor.dc.html` · Blog editor · 390×1500
- `MMedia.dc.html` · Media · 390×1200

### Forms · desktop (16)

- `Forms.dc.html` · Forms · 1440×1500
- `FormNew.dc.html` · New form · 1440×1000
- `FormNewsletter.dc.html` · Newsletter subscribers · 1440×1200
- `FormImport.dc.html` · Import subscribers · 1440×1000
- `FormEntries.dc.html` · Entries, 2 selected · 1440×1560
- `FormColumns.dc.html` · Entries · columns · 1440×1000
- `FormExport.dc.html` · Entries · export · 1440×1000
- `FormTrash.dc.html` · Entries · delete forever · 1440×1000
- `FormEntry.dc.html` · Entry view · 1440×1700
- `FormBuild.dc.html` · Builder · 1440×1500
- `FormBuildLogic.dc.html` · Builder · conditional logic · 1440×1000
- `FormPreview.dc.html` · Builder · preview · 1440×1100
- `FormPublish.dc.html` · Builder · publish a version · 1440×1000
- `FormSettings.dc.html` · Form settings · 1440×1720
- `FormNotify.dc.html` · Form notifications · 1440×1250
- `FormNotifyEdit.dc.html` · Edit a form email · 1440×1000

### Forms · mobile (7)

- `MForms.dc.html` · Forms · 390×1500
- `MFormEntries.dc.html` · Entries · bulk select · 390×1400
- `MFormSubmission.dc.html` · One entry · 390×1800
- `MFormBuild.dc.html` · Builder · 390×1300
- `MFormField.dc.html` · Builder · field settings sheet · 390×844
- `MFormAddField.dc.html` · Builder · add a field sheet · 390×844
- `MFormSettings.dc.html` · Form settings and emails · 390×2150

### Settings, email and money · desktop (19)

- `Settings.dc.html` · Settings overview · 1440×1300
- `SettingsAccount.dc.html` · My account · 1440×1300
- `SettingsBusiness.dc.html` · Business profile · 1440×1300
- `SettingsTeam.dc.html` · Team and access · 1440×1300
- `SettingsInvoicing.dc.html` · Invoicing and payments · 1440×1600
- `SettingsSite.dc.html` · Site and SEO · 1440×1300
- `SettingsContent.dc.html` · Content · 1440×1300
- `SettingsFaq.dc.html` · Content · FAQ · 1440×1200
- `SettingsMedia.dc.html` · Content · media · 1440×1150
- `MediaUpload.dc.html` · Content · upload media · 1440×1000
- `SettingsEmail.dc.html` · Email: SMTP, test, log · 1440×1420
- `SettingsEmailView.dc.html` · Email log · one message · 1440×1000
- `SettingsPrivacy.dc.html` · Privacy and retention · 1440×1400
- `SettingsSystem.dc.html` · System status and tools · 1440×1200
- `SettingsAudit.dc.html` · Audit log · 1440×1300
- `Receipt.dc.html` · Money · receipt · 1440×1250
- `MoneyRefund.dc.html` · Money · record a refund · 1440×1000
- `Estimate.dc.html` · Money · estimate · 1440×1300
- `InvoiceVoid.dc.html` · Money · void an invoice · 1440×1000

### Settings, email and money · mobile (5)

- `MSettings.dc.html` · Settings · 390×1560
- `MSettingsAccount.dc.html` · My account · 390×1700
- `MSettingsTeam.dc.html` · Team and access · 390×1120
- `MSettingsEmail.dc.html` · Email · connection, test and log · 390×2050
- `MReceipt.dc.html` · Receipt · 390×1220

### Client portal · desktop (15)

- `POverview.dc.html` · Overview · 1440×1400
- `PAccount.dc.html` · Account menu and notifications · 1440×900
- `PNotLinked.dc.html` · Account not linked yet · 1440×900
- `PInvite.dc.html` · Accept an invitation · 1440×900
- `PProjects.dc.html` · Your projects · 1440×1000
- `PProject.dc.html` · Project detail · 1440×1700
- `PRevision.dc.html` · Request a revision · 1440×1000
- `PApprove.dc.html` · Approve a deliverable · 1440×1000
- `PBilling.dc.html` · Billing · 1440×1250
- `PInvoice.dc.html` · Invoice · your copy · 1440×1400
- `PPay.dc.html` · Pay an invoice · 1440×1000
- `PSupport.dc.html` · Support · 1440×1000
- `PNewTicket.dc.html` · Ask a question · 1440×1000
- `PConversation.dc.html` · Conversation · 1440×1200
- `PSettings.dc.html` · Settings · 1440×1200

### Client portal · mobile (12)

- `PMOverview.dc.html` · Overview · 390×1500
- `PMMenu.dc.html` · Account menu · 390×844
- `PMInvite.dc.html` · Accept an invitation · 390×1180
- `PMProjects.dc.html` · Projects · 390×1100
- `PMProject.dc.html` · Project detail · 390×1700
- `PMRevision.dc.html` · Request a revision · 390×844
- `PMBilling.dc.html` · Billing · 390×1300
- `PMInvoice.dc.html` · Invoice · 390×1400
- `PMSupport.dc.html` · Support · 390×1000
- `PMNewTicket.dc.html` · Ask a question · 390×844
- `PMConversation.dc.html` · Conversation · 390×1200
- `PMSettings.dc.html` · Settings · 390×1300

### Design system (12)

- `Foundations.dc.html` · Foundations · 1440×1800
- `Controls.dc.html` · Buttons, fields and selection · 1440×1800
- `Overlays.dc.html` · Menus, popovers, dialogs and toasts · 1440×1500
- `States.dc.html` · Empty, loading, error and no-access states · 1440×1300
- `Filters.dc.html` · Filters and date ranges · 1440×1640
- `Sidebar.dc.html` · Admin sidebar · 264×900
- `PSidebar.dc.html` · Portal sidebar · 264×900
- `Topbar.dc.html` · Top bar · 1176×72
- `SetNav.dc.html` · Settings section menu · 250×760
- `MTop.dc.html` · Mobile header · 390×64
- `MTabs.dc.html` · Mobile tab bar · 390×84
- `FormHead.dc.html` · Form header and tabs · 1112×160
