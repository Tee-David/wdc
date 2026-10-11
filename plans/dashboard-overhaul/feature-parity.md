# Feature parity: live dashboards against the new design

First written 11 Oct 2026 from the live components, updated the same day after the gaps were designed. Each row says what the live product does, where the prototype stands, and the board that carries it. Nothing on a Partial or Missing row may be dropped when the live UI is replaced.

Status: Covered, Partial (exists but thinner than live, with what is left), Missing.
Sources read: `components/admin/*`, `forms/*`, `email/*`, `settings/*`, `components/client/*`, `components/workspace/*` and every `page.tsx` under `app/admin` and `app/portal`.

## Admin: Forms and enquiries

| Live feature | Status | Board and notes |
| --- | --- | --- |
| Forms list with state, unread, drafts, last entry, open and close, duplicate, Trash | Covered | `A-Forms` Forms tab |
| New form: name and checked address | Covered | `A-Forms` |
| Form builder: questions (twelve types, help text, placeholder, limits, choices, required, duplicate, move, remove), title, introduction, Sections or Conversation style, button, address, after sending (message or page), preview, draft and publish with a list of things to fix | Covered | `A-FormBuilder`, same shape as Settings with a Save bar per section |
| Form settings: open and close state and message, opens on, closes after, entry limit (total or monthly), recipients, reply to, copy, blind copy, subject, thank you email, test email, blocked words, Trash retention, reset | Covered | `A-FormBuilder` sections |
| Entries: star, read and unread, spam, Trash, put back, delete for good (with "I understand"), export, filters, columns, bulk | Covered | `A-Forms` Entries tab |
| Entry: details, answers, attachments, history, notes, emails about it, reply with preview, forward, print, PDF | Covered | Entry sheet (print and PDF are toasts in the prototype) |
| Assign: search or add a client, open a project at Onboarding, service, project name, optional email to the client | Covered | `A-Forms` |
| Pre-filled link with note | Covered | `A-Forms` Links tab |
| Subscribers and CSV import with permission | Covered | `A-Forms` Subscribers tab |
| Notices that failed | Covered | Rail card and `A-Reconcile` Emails that failed tab |
| All entries across forms with a form filter | Covered | Entries tab has a Form filter |

## Admin: Email

| Live feature | Status | Board and notes |
| --- | --- | --- |
| Overview figures | Covered | `A-Email` pulse |
| Campaign creator: tags in and out, tracking per person or counts, schedule, tag clickers | Covered | `A-Email` |
| Campaign report: delivered, opened (approximate), clicked, bounced, asked to stop, clicks by link, what to do next, resend to people who did not open, tag clickers | Covered | Campaign sheet |
| Email builder: blocks, 60 limit, show only if the contact has or lacks a tag, merge tags with fallbacks, preview line, desktop and phone preview, versions, reset, checklist, test | Covered | `A-EmailBuilder` |
| Templates list and switch the design on or off | Covered | `A-Email` Templates, `A-EmailBuilder` |
| Automations: flow canvas, triggers, email, wait, tag check with Yes and No, tag and note steps, stop, per step counts, results, test as a contact, draft and on and off | Covered | `A-Automation` |
| Contacts: filters, tags, notes, opens, add, import with row preview, export, suppress, bulk | Covered | `A-Email` Contacts. XLSX export is in the shared export sheet |

## Admin: Clients, projects, delivery

| Live feature | Status | Board and notes |
| --- | --- | --- |
| Add and edit client: sector, what they buy, tags, other contacts, notes | Covered | `A-Clients` |
| Merge a duplicate | Covered | `A-Clients` row menu |
| Archive, Archived tab, restore, delete permanently with what goes and what stays | Covered | `A-Clients` |
| Log a call or message | Covered | `A-Clients` row menu |
| Comms log, other contacts, portal access, files and deliverables | Covered | `A-Client` tabs |
| Credit on account on the client page | Partial | Credit is in `A-Money`. Add a card to the client Money tab |
| Projects list and board with a reason on each move | Covered | `A-Projects` |
| New project and project budget, scope, update route | Covered | `A-Projects` and the project ⋮ "Budget and scope" |
| Post an update (how it is going, what moved, in the way, next) | Covered | Project ⋮, shows in Activity |
| Project access (staff, client review, client billing) | Covered | Project ⋮ |
| Answerable people, project icon and colour | Covered | Project ⋮ |
| Department handovers | Covered | Project ⋮ |
| Tasks with owner, due date, priority, waits for | Covered | `A-Project` Tasks |
| Deliverables with versions and the client's recorded response | Partial | Files and Approvals tabs carry versions and decisions. A per-version response form is left |
| Service workspace (shared work versions, delivery evidence, review conversation) | Partial | The service tab of each project covers the stages. Delivery evidence entry is left |

## Admin: Money

| Live feature | Status | Board and notes |
| --- | --- | --- |
| Invoices, quotes, receipts, record payment, refunds, reports, expenses | Covered | `A-Money` |
| Reconciliation: statement import and match | Covered | `A-Reconcile` Statement |
| Paystack events: needs somebody, match to an invoice, write off, bank it | Covered | `A-Reconcile` Paystack tab |
| Messages that did not go, resend | Covered | `A-Reconcile` Emails that failed tab |
| Invoice reminders schedule | Partial | Rule in Settings. A per invoice schedule is left |

## Admin: Blog and site content

| Live feature | Status | Board and notes |
| --- | --- | --- |
| Blog list, editor, review workflow, SEO, previews, backup | Covered | `A-Blog` |
| Case studies list | Covered | `A-Cases` |
| Case study editor steps (client, sector, brief, approach, what we did, client line, cover) | Partial | Needs its own steps sheet |
| Media library: folders with colours, move, Trash, alt text, caption, used in, copy addresses | Covered | `A-Media` |
| FAQ editor with order, where it shows first, reset, earlier versions | Covered | `A-Content` |
| Policies editor with sections, tabs, reset, earlier versions | Covered | `A-Content` |
| Pages set in code, read only | Covered | `A-Content` Set in code |

## Admin: Settings, users

| Live feature | Status | Board and notes |
| --- | --- | --- |
| Studio, invoices, numbers, VAT, TIN, reminders, currencies | Covered | `A-Settings` |
| Bank accounts with Naira lookup, other currencies, test deposit | Covered | `A-Settings`, logic from nomarc and NairaGate |
| Paystack payment mode (Test, Live with confirmation) | Covered | `A-Settings` Money |
| Business profile, notifications, sender, message log | Covered | `A-Settings` |
| Mail connections, fallback, alert, SPF DKIM DMARC check, simulate mode, weekly summary | Covered | `A-Settings` Notifications |
| Site and SEO, maintenance and holding page with preview | Covered | `A-Settings` Website and System |
| Privacy: retention, requests, look up by email, export, erase | Covered | `A-Settings` Privacy |
| System: services, migrations, tools, error log | Covered | `A-Settings` System |
| Audit log with filters and export | Covered | `A-Settings` Audit log |
| Users: team, client accounts, invitations, sessions, activity, view as client or staff with a reason, recovery, make owner, deactivate, delete permanently | Covered | `A-Users` and the support view bar |
| Roles table | Covered | `A-Settings` Team, what each role can do |
| Departments | Covered | `A-Settings` Team |
| Customise the dashboard | Covered | `D-Admin` Customise |
| Notifications inbox | Covered | `A-Notifications` |
| Staff welcome | Covered | `S-Welcome` |

## Client portal and staff

| Live feature | Status | Board and notes |
| --- | --- | --- |
| Home, projects, billing, support, settings, notifications | Covered | `D-Client`, `C-*` |
| Deliverable approve and request a revision with a specific note, decision history | Covered | `C-Projects` Needs your yes |
| Meetings panel (book, join) | Covered | Project page and Messages |
| Profile setup (display name, photo, appearance) | Covered | `C-Welcome` |
| Support view bar (read only) | Covered | Any board with `?sv=client` or `?sv=staff` |
| Not linked screen | Missing | A small page for a signed in person with no client record |
| Staff: My work, welcome, notifications | Covered | `D-Staff`, `S-Welcome`, `S-Notifications` |
| Role gate screens ("is the owner's") | Partial | Each owner only page needs a no permission state |

## What is left

1. Credit on the client Money tab, per version client responses, delivery evidence, case study editor steps, per invoice reminder schedule.
2. The "not linked" portal screen and no permission states for owner only pages.
3. Real bank logos as files, and the live name lookup behind a server route.
