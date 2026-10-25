# Kit design progress (prototype boards)

Resume file for the design runs on the prototype kit. Build order is in `remaining-screens.md`.
Kit source in the session scratchpad `proto/`; saved to `plans/dashboard-overhaul/kit/` by sync.
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

## Next
1. Hybrid lists, Settings tabs, client portal pages, staff pages.
