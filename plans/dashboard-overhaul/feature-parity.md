# Feature parity: live dashboards against the new design

Written 11 Oct 2026 after reading the live components, not only the route list. The first checklist mapped routes to boards. This one maps features. Nothing on the Missing and Partial rows may be dropped when the live UI is replaced. Each row says what the live product does, where the prototype stands, and the board that carries it.

Status: Covered, Partial (exists but thinner than live), Missing (not in any prototype yet).
Sources: `components/admin/*`, `components/admin/forms/*`, `components/admin/email/*`, `components/admin/settings/*`, `components/client/*`, `components/workspace/*` and every `page.tsx` under `app/admin` and `app/portal`.

## Admin: Forms and enquiries (`/admin/forms/*`)

| Live feature | Status | Notes |
| --- | --- | --- |
| Forms list with state (Open, Closed date passed, Limit reached, Not open yet), unread count, drafts, last entry | Partial | `A-Forms` has state, no unread, drafts or last entry |
| Built-in forms: Onboarding, Website, Newsletter, plus built-here forms | Partial | Newsletter and onboarding exist as rows only |
| New form: name and address (two or more lowercase letters, digits, dashes) then questions | Missing | `A-FormBuilder` edits Contact only, no create step |
| Form builder: title, introduction, form style (Sections or Conversation), questions per screen, button text, address, after-sending message | Missing | Prototype lists questions only |
| Question types, help text, placeholder, smallest and largest, choices one per line, required, "any of", duplicate, remove; more than ten choices shows searchable list | Partial | Type, required, choices; no help text, limits, duplicate |
| Preview, copy address, open the live form, unsaved-changes bar, publish with a list of things to fix first, draft vs published | Missing | |
| Form settings: state and closed message, opens on, closes after, entry limit (total or per month, spam excluded), limit message, then-show message or go to a page, email recipients (studio inbox, separate addresses, reply-to, copy, blind copy, subject), emails the form sends (to visitor, to studio) with preview, blocked words, trash retention, reset to defaults, send a test | Missing | |
| Entries table: tick rows, star, mark read and unread, spam and not spam, move to Trash, put back, delete for good, export CSV and XLSX, sort, filters, search, choose columns, Trash view, spam view | Partial | Status chips, spam, trash, export; no star, read, columns, delete for good |
| Entry page: details, earlier questions, show unanswered, history, studio notes, emails about this entry, attachments (open, download), previous and next, PDF, print, reply by email, resend, forward to another address | Partial | Sheet has reply and assign only |
| Assign an entry: search clients or make one from the entry, choose or open a project (starts at Onboarding), service, project name, optionally email the client | Partial | Client search yes; project, service and the email option missing |
| Pre-filled link: existing client or new person, first and last name, email, phone, business name, note shown to the client | Partial | Client and form only |
| Subscribers (newsletter) and import CSV with permission confirmation | Missing | |
| Notices that failed (form emails) | Missing | |
| All entries across forms with form filter and columns | Missing | |

## Admin: Email (`/admin/email/*`)

| Live feature | Status | Notes |
| --- | --- | --- |
| Overview: contacts, can get marketing, asked to stop, never emailed again, new contacts by month, campaigns summary | Partial | Four tabs; no overview figures or chart |
| Campaign creator: title, subject, send to (only these tags, leave out these tags, search tags), tracking (per person or counts), send now or schedule, tag everyone who clicked, copy to people who did not open (tag them), cancel a scheduled campaign | Partial | Audience is a list name; no tag targeting or tracking choice |
| Campaign report: sent, delivered, opened (approximate), clicked, bounced, asked to stop, clicks by link, who got it, what to do next, edit the email, send me a test | Missing | |
| Email builder: blocks (heading, text, picture, button, columns, divider, small print), drag or press to add, 60 block limit, show only if contact has or does not have a tag, merge tags with fallbacks, preview line, desktop and phone preview, versions, reset to built-in, checklist before switching on, send me a test | Missing | Prototype has a text editor only |
| Templates: design each system email, switch the design on or off, built-in design, reset | Partial | List and a text editor, no blocks, versions, switch on |
| Automations: visual canvas (steps, zoom, fit), triggers (someone becomes a contact, tag added), steps (email, wait days and hours, check a tag yes or no, add or remove a tag, note on record, stop), per-step counts, test as a contact, switch on and off, save draft, duplicate step, delete, results tab, kind (Marketing or Service) | Missing | Prototype lists steps in a sheet |
| Contacts: type and status filters, tags, opens, source, add contact, import CSV (5,000 rows, 2 MB, sample, row-by-row preview, confirmation of permission), export CSV and XLSX, add tag, send email, suppress, contact page (timeline, notes, open the client) | Partial | List, import, status; no tags, notes, timeline, XLSX |

## Admin: Clients, projects, delivery

| Live feature | Status | Notes |
| --- | --- | --- |
| Add or edit a client: company, who you deal with, email, phone, sector, what they buy, tags, other contacts, notes | Partial | No sector, tags, other contacts |
| Merge a duplicate client | Missing | |
| Archive a client, view archived, delete permanently with the "goes with it, stays" list | Missing | |
| Clients views: by service, department filter, client since, archived | Partial | |
| Client page: projects, invoices, onboarding brief and link, departments, notes, payment history, files and deliverables, what we have sent them (comms log), activity, other contacts, portal access (invite, withdraw, resend) | Partial | Portal access exists; comms log and deliverables thin |
| Log a call or message (WhatsApp, phone, in person, direction, what was said) | Missing | |
| Comms log with channel, state, resend | Missing | |
| Credit on account: balance, where it came from, apply to an invoice | Partial | In `A-Money`, not on the client page |
| Projects list and Board (cards move between stages with a reason written to history), filters by stage, service, health, owner | Partial | List and stages; no drag board |
| New project: client (or new client inline), name, service, starting stage, due date, update route, agreed budget, scope in words | Partial | |
| Project page: budget, invoiced, collected, spent, net, history of changes, scope, update route | Partial | |
| Delivery: tasks (who, by when, priority, waits for), updates (how it is going, what moved, what is in the way, what next), deliverables with versions and recorded client response | Partial | Tasks and files exist; updates, versions, responses missing |
| Answerable people for a project, invite to team | Missing | |
| Project icon and colour picker | Missing | |
| Project members and access: staff, client review, client billing, revoke | Missing | |
| Department handovers (title, receiving lead, context, files, decisions, open questions, next action, deadline) and team tasks | Missing | |
| Service workspace: shared work versions, needs review, final packages, record delivery evidence, review conversation | Missing | |

## Admin: Money

| Live feature | Status | Notes |
| --- | --- | --- |
| Invoice page: lines, payments, view on Paystack, open as client sees it, edit the draft, email invoice, refunds, cancelled state | Partial | |
| Record a payment (amount, reference, method, when, note), receipts | Covered | |
| Estimates accepted or declined; quote builder | Covered | |
| Invoice reminders schedule and states | Partial | Rule exists, schedule per invoice missing |
| Reconciliation: needs somebody, messages that did not go, everything Paystack said, match to an invoice, write it off, bank it, resend | Partial | `A-Reconcile` has bank statement, not the Paystack event log, write off, bank it |
| Credit panel and apply | Partial | |
| Reports (months, who paid most, how they paid, where it went) | Covered | |
| Cashflow chart with table view | Partial | |
| Expenses with rebillable flag and vendor | Partial | |
| Date range picker presets | Partial | |

## Admin: Blog and site content

| Live feature | Status | Notes |
| --- | --- | --- |
| Post list, filters, trash, delete for good, export | Covered | |
| Editor (cover, headline, card sentence, rich text with picture and video, SEO, canonical, social image, revision flag, review workflow, backup restore) | Covered | Updated 11 Oct |
| Case studies list and editor (steps, client, sector, location, brief, approach, what we did, client line, cover, hide) | Partial | List and states; no editor steps |
| Media library: folders with colours, drag to folders, trash, alt text, caption, used in, copy addresses, grid and list, search | Missing | Only a simple upload sheet |
| Media picker inside editors | Partial | |
| FAQ editor with reset and revisions | Missing | Help centre exists; the site FAQ editor does not |
| Policies editor (summary, opening paragraph, tabs, sections, reset, earlier versions) | Missing | Policy list sheet only |
| Revisions component (last 10 and 25 kept, restore) | Missing | |

## Admin: Settings and users

| Live feature | Status | Notes |
| --- | --- | --- |
| Settings overview with search | Partial | |
| Studio and invoices: next numbers, payment due, VAT, TIN, foot note, reminders, currencies, manual payment accounts | Partial | |
| Payment accounts (ten, with ACH, SWIFT, IBAN, instructions) | Covered | Naira lookup redone with nomarc logic |
| Paystack payment mode (Test, Live with "I understand", re-sign-in within 15 minutes) | Missing | |
| Business profile (registered details, social profiles) | Partial | |
| Notifications (email the studio when...) and alert targets | Partial | |
| Email: sender, reply-to, message log with retention, resend, withdraw | Partial | |
| Mail connections (service, address, secret, send everything through, fallback, Slack or Discord alert, SPF DKIM DMARC check, simulate mode, weekly summary) | Missing | |
| Message log | Partial | |
| Integrations health (database, SMTP, R2, Google sign-in, PageSpeed, WhatsApp) | Partial | |
| Site and SEO (search visibility, description, link preview picture, reviewer preview link) | Partial | |
| Maintenance and holding page (templates, back-by date, preview) | Missing | |
| Privacy (retention periods, nightly run, request lookup by email, export JSON or CSV, erase, request list) | Partial | |
| System: services, schema migrations, background work, Paystack webhook and callback addresses, tools with last run, retry failed | Partial | |
| Error log | Partial | |
| Audit log with filters, export, entry detail with before and after | Partial | |
| Users: invite, role, status, export, bulk, user page with sessions and activity, view as client, view as staff (read-only support view with reason), queue recovery, make owner, deactivate, delete permanently | Partial | Team list only |
| Roles table (what each role can open) | Missing | |
| Departments (rename, people, clients looked after) | Partial | |
| Account: name, sign-in methods (password, emailed link, Google), sessions, sign out everywhere, tours replay, account-change emails | Partial | |
| Customise the dashboard panels | Missing | |
| Dashboard panels: cash position, open forms, onboarding not finished, due in 30 days, typical month's spend, recent payments, upcoming deadlines, project pipeline | Partial | Deck and rail cover most |
| Notifications inbox with summary frequency and retry | Partial | |
| Welcome and first week for staff | Covered | New `S-Welcome` |

## Staff

| Live feature | Status | Notes |
| --- | --- | --- |
| My work (my projects, my tasks) | Covered | |
| Staff see forms, entries, clients, blog, support within their role; owner-only areas show an explanation | Partial | Role gates need their own empty states |
| Staff welcome (what you work on, departments, what stays with Admin) | Covered | |

## Client portal

| Live feature | Status | Notes |
| --- | --- | --- |
| Home: next step, active projects, awaiting review, balance, support, recent updates, quick actions | Covered | |
| Project page: deliverables with approve and request revision (specific note), decision history, updates, money on project, ask about project, timeline, meetings panel (book, join) | Partial | Meetings panel and decision history thin |
| Billing: balance, paid to date, credit, invoices, payments, receipts, pay now, checkout unavailable fallback with bank details | Covered | |
| Support conversations: ask a question, reply, close, reopen | Covered | |
| Settings: contact name, phone, company, email, password, sessions, notification choices, project access | Partial | |
| Profile setup (display name, photo, appearance) | Missing | `C-Welcome` covers details only |
| Support view banner (read-only) | Missing | |
| Not linked screen | Missing | |

## Closing order

1. Forms (builder, settings, entries, subscribers).
2. Email (campaign targeting and report, email builder, automation canvas, contacts).
3. Clients and projects (merge, archive, log, comms, board, delivery, members, handovers, service workspace).
4. Media library, FAQ and policy editors with revisions.
5. Settings (roles, payment mode, mail connections, maintenance, privacy, users and support view, customise).
6. Money gaps and portal gaps.

Each closed row is updated here with the board that carries it.
