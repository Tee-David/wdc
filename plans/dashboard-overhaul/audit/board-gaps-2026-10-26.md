# Boards against live: what is not wired yet (audit, 26 Oct 2026)

Two read-only audits compared every canvas board's controls with the live code, plus a crawl of every live page (owner 400 pages, staff 200, client portal). No dead controls (toast-only or "#") were found and every page loads with a heading (two fixed: the error log, the Blog calendar link for staff). What remains is features the boards show that live does not have yet. Work through these in order; tick each when it ships.

## Staff
- [x] Staff Support: help articles for staff and "Ask Admin" (a direct chat with Admin), not the client-questions table
- [x] Staff Settings: (appearance is the theme switch in the sidebar; quiet hours skipped, the morning email follows working days) notifications (what reaches you, quiet hours), working week, appearance
- [x] My Day deck: client waiting (reply, Ask Admin first), handover to accept, blocked on client (Nudge), named team tasks, Hand over on cards. Not built: "review asked" and "weekly update" have no data model yet (no peer review requests or weekly updates exist in the app)
- [x] My Day tasks: In progress, In review, Blocked (with what it waits on) states, row menu (start, review, blocked, back, hand over, open), bulk Start, Send for review, Mark done
- [x] My Day rail: content calendar card (week arrows, posts from the records), week tiles open their list, project steppers. Platform filter on the card skipped (the project calendar has it)
- [x] Staff Projects and Clients: no New client or Start a project for staff (refused on the server too, the "intake" area), Your move and Waiting on client tabs, Message the client and Add a task on the project row menu, staff calendar shows meetings booked by their own clients
- [x] Staff Welcome: the "Try Messages" step; the help rail links the staff help centre and Message Admin

## Admin
- [x] Client page People: add person, make main contact, remove, give portal access (to every live project, approvals and invoices as ticked), send the invitation again; colleagues the client added themselves are listed
- [x] Projects: Pause with a reason and Resume (Admin only): banner on the project, Paused tag in the list, the client sees "Paused since" and the reason and is told on both moves
- [ ] Project page: Post an update with who sees it, delivery evidence, budget and scope sheet, service sections still missing (SEO keywords and month's work, website pages and launch checks, app device testing and store release, software demo checklist, ads launch checklist)
- [x] Quotes: on acceptance invoice the whole amount or a deposit first (a percentage); "Invoice the balance" drafts the rest less the deposit; "Withdraw the quote" ends a sent quote (its page reads as no longer standing; the public page itself is untouched)
- [x] Today deck: Hand over on project and approval cards; act in place: overdue invoices send the reminder from the card (Record a payment beside it), ready payouts approved in one press; renewal card for plan systems renewing within 14 days. Snooze on short cards opens inside the card. Not built: match, book handover, draft quote and set follow up have no Today card kind yet (they live on Reconciliation, Meetings, Clients)
- [x] Clients list: row Message (a studio-opened conversation, emailed by their setting), Convert lead (open their first project), New invoice (Admin), Log a call or message; bulk Message (one conversation per ticked client)
- [x] Messages: mark all read, search inside messages, conversation details with media, files and links, start a Google Meet, make a message a task, saved replies, reactions, team-only tags, schedule send (Admin; client questions and team chats; migration 0062)
- [x] Support: Help articles on the Support page (search, paged, New and Edit go to the help-centre editor whose history restores a removed one), Export questions (CSV, Admin)
- [ ] Reports and Money: save a view, email a report on a schedule
- [x] Invoice builder: a menu on each line (Duplicate, Move up, Move down, Remove) and "Add from earlier work", the price list read from lines already billed (latest price per line, searchable)
- [ ] Payouts: preview payment advice, open payout
- [ ] Reconciliation: write off
- [ ] Meetings: attach the recording, remind about an unconfirmed handover
- [ ] Onboarding entry: forward to the team, ask for larger files, fresh invite to the approver, add to calendar
- [ ] Forms: duplicate form, Move to Trash and back, forward an entry; builder version publishing and reset to defaults
- [ ] Settings: one Recently deleted section across kinds, Teams, one Money section (currencies, banks, providers, VAT and numbering)
- [ ] Blog: reads and top posts in the rail, idea cards, search check in the editor; case study "waiting on client" reminder
- [ ] Email: duplicate campaign, template earlier versions
- [ ] Media: replace a file; Content: lawyer approval card
- [x] Client data export from the client page: "Export everything about them" (record, plan, projects with tasks, updates and deliverables, invoices with payments, quotes, questions; JSON, Admin, audited) plus the privacy export for forms and accounts

## Client portal
- [ ] Home: Your files, Your team, approve in place from the deck, client task cards (upload photos, share access), meeting reschedule
- [ ] Messages: direct chats with named team members, quick replies, reactions, pin, context chips, file preview
- [ ] Billing: row menu (ask about this, email me a copy, preview), search, download statement, ask Finance
- [ ] Support: categories, popular, article detail with steps, "Was this helpful", search-before-you-ask
- [ ] Project page: content calendar for social, per-file comments and ask, in-app file preview, pause banner

## Public pages (frozen by the owner: function only, look unchanged)
- Quote Accept and Decline online is not built; the frozen page asks for a reply by email. Needs the owner's yes before the public quote page changes.
- Invoice "I've sent the transfer": bank transfer was removed on purpose. No change.
- Meetings: meeting types picker and Add to calendar (.ics)
- Error pages: report a problem; no-permission: ask for access
