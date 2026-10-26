# Kit design progress (prototype boards)

Resume file for the design runs on the prototype kit. Build order is in `remaining-screens.md`.
Kit source in the session scratchpad `proto/`; saved to `design/dashboards/kit/` by sync.
Publishing is done by the main session (owner's call, 2026-10-25). Design runs rebuild `canvas/project/` with build.py, sync, and list here the boards ready to publish.

## Done
- 2026-10-25 A-Client (Mira Skincare), canvas v49.
  - Overview opens with a "Mira needs" deck (five cards: late route approval with Call Adaeze and Move the final date; social deposit with a delayed reminder or Record a payment; Instagram access with Ask Bola or Access received; Bola's expired portal invite; the logo review agenda). Clearing it shows the empty state with the next meeting.
  - Every action changes the page: project stage and next step, the paid ring, invoice and receipt rows (RCT-2026-031), the People portal column, Recent activity, the head lede count.
  - Rail gains a Social media plan card (retainer: term, what is included each month, billing per client with a Change billing sheet; next draft invoice waits on Today) and Team notes (add, view all).
  - Checked: harness at 1440, 390 phone, 834 dark tablet and 320: no overflow, no small targets (install card close excepted, shell). Scenario of 20 steps passed (pw scenario `w/acl-s.json`).

- 2026-10-25 A-Invoice (money detail and new invoice). READY TO PUBLISH: A-Invoice.dc.html, A-Client.dc.html, and every other board (kit.js fix below; all of `canvas/project/` rebuilt).
  - View mode opens with a "what this needs" card, the deck idea on one document: overdue (Call the client with a promised date that pauses reminders, or Send the final notice now), work paused after the final notice, promised, due soon (reminder or record a payment), quote waiting (follow up or mark accepted), quote accepted (create the deposit invoice). Not due yet shows a calm one-line status. Paid and cancelled show none.
  - Reopened Money rows now show their real project and lines (Kora: Driver app milestone 2; Tunde Okafor Law: domain and hosting, and so on), issue dates 14 days before due, and the reminders that already went in the history.
  - The client's copy in the rail no longer squeezes the description to one letter a line: in a narrow card each line's description takes its own row and the parties stack.
  - New invoice: the line editor has column headings on wide screens and named placeholders (Qty, Unit price) on phones; the Document/Email toggle is 44px tall.
  - Kit fix: a delayed toast's `done` callback now runs (the invoice reminder never wrote its history line and showed "Sending in 8s" as its final message).
  - Client page receipts aligned with Money: INV-26-2FT7RB paid 2 Oct, receipt RCT-2026-035; the new deposit receipt is RCT-2026-043.
  - Checked: harness 1440, phone, dark tablet for new invoice and two overdue invoices: no overflow, no small targets. Scenario: call with a promised date, clear it, final notice, record full payment, all passed.
  - Found, not yet fixed: Notifications and Reconciliation say Mira paid INV-26-4KQ8ZD (₦850,000), which is Kora's invoice. Fix in the hybrid lists pass.

- 2026-10-25 Forms. READY TO PUBLISH: A-Entry.dc.html (new board), A-Forms.dc.html, and canvas.json (A-Entry added to the Admin row after Forms; boards below it moved one slot).
  - New board A-Entry: a long onboarding entry read as a page (Mira Skincare's social media brief). Opens with "This brief needs" (advice asked on the ad budget, three product photos too small, the body oil launch to plan, an approver with no portal), then the answers by section with settled and open marks, a searchable Section pick, platform profiles on their real tiles, product photos with size warnings and a preview. Rail: how complete it is (ring), the entry facts, the client match (one record, one portal) and project, history with notes.
  - Every card changes the brief: answers move from "Please advise" or "To plan" to settled, the ring and the lede count follow, history logs each step, and clearing the deck shows the next step.
  - Forms board: the Mira entry is now the social media onboarding (new form "Onboarding, social media"), its sheet opens the full brief; New form gains "Start from" and continues into the form builder.
  - Checked: 1440, phone, dark tablet, 320: no overflow, no small targets (crumb links now 44 wide in the kit). Scenario of all four cards, the section pick and the photo preview passed.

- 2026-10-25 Hybrid lists, part 1: Projects (admin and staff), Reconciliation, Notifications. READY TO PUBLISH: all of `canvas/project/` (kit.css changed: segmented controls now have a 44px hit area; A-Projects, S-Projects, A-Reconcile, A-Notifications, C-Notifications changed).
  - Projects opens with "Projects needing you" (print files due, a handover to book, a demo agenda, the paused driver app with Resume with a reason, Mira's blocked social setup). Staff see only their own projects' cards and none with amounts ("Your projects need": Instagram access for Chiamaka). Below the deck, "Due in the next 7 days"; the figures move into the rail with a "By service" bar list that filters the table. Views stay full width.
  - Money data made consistent: Reconciliation's bank line is now Bloom Pharmacy ₦180,000 for INV-26-7HB2QA (it said Mira paid Kora's invoice), the Paystack event and failed receipt belong to Zara's INV-26-4WE9KS, Notifications say Zara paid ₦200,000 yesterday, the client's notification is Mira's deposit INV-26-9QX4LM due Wed 14 Oct. Mira's deposit reads "due Wed" everywhere; the Halo demo is on Monday.
  - Checked: A-Projects and S-Projects at 1440, phone, dark tablet: no overflow, no small targets. Scenario: hand over, book a handover, send the demo agenda, resume with a reason (disabled until a reason), service bar filter: passed.

- 2026-10-26 Client portal. READY TO PUBLISH: C-Billing.dc.html, C-Projects.dc.html, A-Project.dc.html, S-Project.dc.html (shared project data), and all of `canvas/project/` rebuilt.
  - Billing: the pay card names Paystack and Flutterwave beside their logos (the logos alone were unreadable). The social media second half is ₦450,000 on 1 Dec (it said ₦225,000, which did not add up to the ₦900,000 quote), and its note says the invoice reaches them by email on 1 Dec and nothing is taken automatically.
  - Projects (client view): the client reads about themselves as "you" ("Final files start once you pick a route", "You pick a route", "Assets from you"), and a wait on them shows as "Waiting on you" rather than a day count. Brand identity dates now match the admin side (final files Sat 17 Oct, handover Thu 22 Oct, document Sat 24 Oct) and the quote is EST-2026-009, accepted 18 Sep, everywhere.
  - Settings (client): Password card from the earlier pass; the rest was already at the standard.
  - Checked: 1440, phone, dark tablet and 320 on all three: no overflow, no small targets.

- 2026-10-26 Staff pages. READY TO PUBLISH: S-Clients.dc.html (all of `canvas/project/` rebuilt).
  - S-Projects was done in the projects pass (own cards only, no amounts). S-Project, S-Support, S-Notifications and S-Settings were already at the standard; S-Settings gained the Password card earlier.
  - S-Clients: the three figure tiles had the same chart icon; now people, target and clock. Mira's next step names Bola, who holds the Instagram account.

- 2026-10-26 320 scan of every board, light and dark. READY TO PUBLISH: all of `canvas/project/` (kit.css: the automation "Add a step" buttons get a 44px hit area).
  - No board overflows sideways at 320 in either theme.
  - Small boxes left, by design: avatar stacks on Today and Home (34px circles that overlap, with a larger invisible hit area), the revenue bars on Today (36px wide bars, 169px tall), the 7 column date grid on Book a meeting (31px wide at 320, 68px tall; seven columns cannot be 44px wide in 288px), and the Terms and Help links in the public footer (the public face is hands off).

## Next
Everything in the build order is designed. Open for the owner: see the report. Hybrid lists are done: Clients was already at the standard (deck, pipeline, by service, activity); checked at 1440 and 320.
