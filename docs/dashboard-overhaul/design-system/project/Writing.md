# Writing

## Voice

Calm, specific, kind. Say what happened, then what happens next, then where to find it. Write from the reader's side of the screen: people manage *notifications*, not *webhook settings*.

- Use active voice and present tense. "Chiamaka schedules them", not "They will be scheduled".
- Name people by first name in sentences and by first name plus initial in lists ("Funmi K.").
- Give the reason with the request: "Approving today keeps your 5 day payment promise."
- Errors say what went wrong and how to fix it, without apology: "The amounts differ by ₦210,000. Record it as credit instead, or pick another invoice."
- Never invent a total, a status or a progress figure. If the data is not there, say what is missing.

## Words we use

| Use | Not |
| --- | --- |
| Admin (staff and clients refer to the owner this way) | the owner, superuser |
| Quote | estimate, proposal (the record's number still reads EST) |
| Hand over | delegate, reassign |
| Snooze, Remind me later | defer, postpone |
| Approve, Request changes | accept, reject |
| Move to Trash, Delete permanently | remove, destroy |
| Saved (a draft or a new thing), Updated (a live thing) | Success, Done! |
| Deposit, Balance, Retainer | down payment, remainder |
| Handover meeting, Handover document | offboarding |
| Paystack, Flutterwave | card processor, gateway |

## Naming conventions

**Documents.**
- Invoice: `INV-26-XXXXXX`. Two-digit year, six characters from an alphabet without 0, O, 1, I or L, so it survives being read down a phone. Older `INV-2026-003` numbers stay valid.
- Quote: `EST-2026-014`. Its own series, so a quote nobody takes never burns an invoice number.
- Receipt: `RCT-2026-041`. A Flutterwave receipt carries its source letter: `RCT-2026-F000123`.
- File names for downloads: `receipt-RCT-2026-041.pdf`, `INV-26-4KQ8ZD.pdf`.
- In running text show the full number once, then the short tail if repeated ("Match to 7HB2QA").

**Money.** Naira with the sign and grouping: `₦850,000`. Short form only in tiles and charts: `₦4.86m`, `₦120k`. US dollars as `$1,800`. VAT is "VAT 7.5%". A deposit is "50% deposit to start". Never show an amount to staff; show a chip instead: Deposit paid, Awaiting deposit, Retainer, Not billed.

**Dates and times.** `Tue 14 Oct` in lists, `14 Oct 2026` on documents, `Tue 14 Oct, 15:30` with a time. 24-hour clock. Relative only under a day ("12 min ago", "3 h"), then "Yesterday", then the day name for this week, then the date. Times are Africa/Lagos internally; never name the city in copy.

**People and roles.** Departments: Branding & Design, Web & Apps, Social & Ads, SEO, Software & AI, Finance. Clients are businesses first ("Mira Skincare"), with the contact in rows ("Contact: Adaeze O.").

**Pages and navigation.** Nav labels are one or two words: Today, My Day, Home, Clients, Projects, Money, Billing, Messages, Support, Settings, Blog. Settings sub-pages read as "Settings, Currencies and banks" in search and breadcrumbs.

## Buttons, toasts and confirmations

- A primary button names the action and its object. A secondary names the alternative ("Save as draft", "Book a quick call instead").
- A toast confirms what happened and where it went: "Sent to Daniel. He gets an email and a portal notice." Add Undo when nothing confirmed the action first.
- A confirmation's title is the question ("Send the final reminder?"), its body the consequence, its button the verb ("Send final reminder"). Irreversible actions add "I understand." with the specific thing that cannot be undone.
- The disabled reason sits under the button in plain words: "Tick each step once it is done."
