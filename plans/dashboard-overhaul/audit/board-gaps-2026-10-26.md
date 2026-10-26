# Boards against live: what is not wired yet (audit, 26 Oct 2026)

Two read-only audits compared every canvas board's controls with the live code, plus a crawl of every live page (owner 400 pages, staff 200, client portal). No dead controls (toast-only or "#") were found and every page loads with a heading (two fixed: the error log, the Blog calendar link for staff). What remains is features the boards show that live does not have yet. Work through these in order; tick each when it ships.

## Staff
- [x] Staff Support: help articles for staff and "Ask Admin" (a direct chat with Admin), not the client-questions table
- [x] Staff Settings: (appearance is the theme switch in the sidebar; quiet hours skipped, the morning email follows working days) notifications (what reaches you, quiet hours), working week, appearance
- [x] My Day deck: client waiting (reply, Ask Admin first), handover to accept, blocked on client (Nudge), named team tasks, Hand over on cards. Not built: "review asked" and "weekly update" have no data model yet (no peer review requests or weekly updates exist in the app)
- [x] My Day tasks: In progress, In review, Blocked (with what it waits on) states, row menu (start, review, blocked, back, hand over, open), bulk Start, Send for review, Mark done
- [x] My Day rail: content calendar card (week arrows, posts from the records), week tiles open their list, project steppers. Platform filter on the card skipped (the project calendar has it)
- [x] Staff Projects and Clients: no New client or Start a project for staff (refused on the server too, the "intake" area), Your move and Waiting on client tabs, Message the client and Add a task on the project row menu, staff calendar shows meetings booked by their own clients
- [ ] Staff Welcome: the "Try Messages" step; Support link to the staff help centre

## Admin
- [ ] Client page People: add person, make main contact, remove, resend invite, give portal access
- [ ] Projects: Pause with a reason and Resume (banner, "Paused since")
- [ ] Project page: Post an update with who sees it, delivery evidence, budget and scope sheet, service sections still missing (SEO keywords and month's work, website pages and launch checks, app device testing and store release, software demo checklist, ads launch checklist)
- [ ] Quotes: create the deposit invoice from an accepted quote, withdraw a quote
- [ ] Today deck: Hand over on cards, act in place (match, approve payouts, book handover, draft quote, set follow up), renewal card
- [ ] Clients list: row Message, Convert lead, New invoice, Log a call; bulk Message
- [ ] Messages: mark all read, search inside messages, reactions, tags, saved replies, schedule send, conversation details with media, files and links, start a Google Meet, create a task from a conversation
- [ ] Support: articles on the Support page (new, edit, Trash), export tickets
- [ ] Reports and Money: save a view, email a report on a schedule
- [ ] Invoice builder: duplicate line, move up and down, add from the price list
- [ ] Payouts: preview payment advice, open payout
- [ ] Reconciliation: write off
- [ ] Meetings: attach the recording, remind about an unconfirmed handover
- [ ] Onboarding entry: forward to the team, ask for larger files, fresh invite to the approver, add to calendar
- [ ] Forms: duplicate form, Move to Trash and back, forward an entry; builder version publishing and reset to defaults
- [ ] Settings: one Recently deleted section across kinds, Teams, one Money section (currencies, banks, providers, VAT and numbering)
- [ ] Blog: reads and top posts in the rail, idea cards, search check in the editor; case study "waiting on client" reminder
- [ ] Email: duplicate campaign, template earlier versions
- [ ] Media: replace a file; Content: lawyer approval card
- [ ] Client data export from the client page

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
