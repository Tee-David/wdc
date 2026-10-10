# Small finance improvements for WDC

Research date: 10 October 2026. This is a proposal. No application code was changed for this research. WDC findings refer to the current implementation source; production verification is recorded separately in `docs/status.md`.

I reviewed the supplied [ERPNext topic page](https://github.com/topics/erpnext), then the official Frappe documentation and ERPNext source. The ideas below are WDC adaptations. They keep the present Money, Clients, project and portal pages.

## What WDC already has

The source already supports draft and issued invoices; estimates with expiry, acceptance and conversion to invoices; duplicate estimates; partial and full payments; individual payment receipts; refunds and reversals; client credit and same-currency allocation; per-currency balances; manual payment references; Paystack event reconciliation; reminders; an email delivery log; audit history; invoice CSV export; expense categories and receipt links; monthly cash charts; and project margin figures.

The current release also contains branded document print/PDF controls, receipt PDF email copies, alternate receipt recipients, NGN/USD display, and selected payment account details. These are implementation findings, not a claim that every production check has finished.

Evidence: `frontend/lib/admin/types.ts`, `store.ts`, `money-rules.ts`; `frontend/app/admin/(lists)/money/page.tsx`; Money export and document routes; credit and reconciliation components; `frontend/lib/money-mail.ts`.

An invoice asks for payment. An estimate proposes a price. A receipt records one payment that arrived. A part payment must keep its own receipt amount and the remaining balance. These meanings stay the same in every proposed flow.

## Recommended order

### 1. Send a client statement

**Present:** The client has invoice tables, receipts and reconciliation. **Gap:** There is no customer statement PDF covering those records together.

**Use:** A client can check several invoices without opening each link.

**Flow:** Clients > client record > finance panel > Statement. The existing dialog asks for currency and period. Show invoices, payments, refunds, credits and current balance. Preview, Print, Download PDF and Send use the present document style and logged email path. Start with a current statement. Historical opening/closing balances need reliable dated event history before they are offered.

ERPNext supports customer-specific statement PDFs, date/currency filters and optional ageing. [Official guide](https://docs.frappe.io/erpnext/process-statement-of-accounts), [official source](https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/doctype/process_statement_of_accounts/process_statement_of_accounts.py).

### 2. Show a collection list for every currency

**Present:** WDC has overdue states, reminders and NGN ageing. **Gap:** There is no full currency-filtered collection report with invoice-level overdue buckets.

**Use:** The owner can see whom to contact first.

**Flow:** Money > existing Who owes what panel > View all. Use the existing table and designed filters. Columns: client, invoice, currency, due date, days overdue, outstanding, last reminder. Each row opens the invoice or sends an existing reminder. Start with today's balances; label the report date.

ERPNext receivables reports support invoice-level balances, report dates, due-date ageing and currency filters. [Official guide](https://docs.frappe.io/erpnext/accounts-receivable-and-payable), [official ageing source](https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/report/accounts_receivable/accounts_receivable.py).

### 3. Prepare a monthly accountant pack

**Present:** Invoice CSV export, expenses and cash charts exist. **Gap:** There is no single period-based export for payments, refunds, credits and expenses alongside invoices.

**Use:** The accountant receives linked records rather than screenshots.

**Flow:** Money > head menu > Export period. Choose dates and currency. Download separate CSV files with record IDs, document references, dates and currency. Include an explanation of each total. Cash received minus recorded expenses must be labelled as cash net; it is not a complete accounting profit calculation. Tax totals are summaries for review, not a tax filing service.

ERPNext distinguishes cash flow, profit and loss, receivables and source-entry reports. WDC should give each report a clear purpose. [Official guide](https://docs.frappe.io/erpnext/accounting-reports).

### 4. Put the agreed payment schedule on a quote

**Present:** Part payments work, but each invoice has one due date. **Gap:** The records do not store a deposit/balance schedule with separate amounts and due dates.

**Use:** A website client can see a deposit and handover balance clearly.

**Flow:** Estimate/Invoice > existing builder > Payment schedule. Start with two designed rows: amount or percentage, due date and plain description. The schedule must sum to the total. Copy it on quote acceptance. Show it in the document and portal. A schedule never marks a milestone complete or invents a payment.

ERPNext payment terms cover deposits, instalments and staged payments, with total allocation checked. [Official guide](https://docs.frappe.io/erpnext/payment-terms).

### 5. Create monthly draft invoices for retainers

**Present:** Duplicate invoice and service-period records exist. **Gap:** There is no finance repeat schedule that creates the next invoice draft.

**Use:** Social media or maintenance billing is less likely to be missed.

**Flow:** Invoice menu > Repeat as a draft. Set start, end and monthly date with existing controls. Show the next date and Pause. The owner reviews and issues each draft. Use one client/project/period key so a retry cannot create a second draft. Begin with monthly repeats and no automatic collection.

ERPNext Auto Repeat separates document creation, submission and email notification and supports stopping a schedule. [Official guide](https://docs.frappe.io/erpnext/auto-repeat).

### 6. Preview and match a bank CSV

**Present:** Paystack events can be matched and manual payments can be recorded. **Gap:** General bank statement rows cannot be imported into a matching review.

**Use:** Manual NGN/USD transfers can be checked against bank evidence.

**Flow:** Money > Reconciliation > Import statement. Select the account and currency, upload with FileDrop, then review a bounded table. Match an existing payment first. Show possible invoice matches as suggestions. Require confirmation before recording a missing payment. A duplicate bank row must not create new money. Begin with one supported CSV format.

ERPNext bank reconciliation compares statement lines with existing vouchers before creating missing entries. [Official guide](https://docs.frappe.io/erpnext/bank-reconciliation).

### 7. Link revised quotes

**Present:** Duplicate estimates preserve the old document and create a new draft. **Gap:** The new draft has no explicit replaces this quote relationship or linked revision summary.

**Use:** The client knows which offer to accept.

**Flow:** Estimate menu > Revise quote. Reuse duplication, then link old and new numbers. Ask for a short reason. Show the revised price and validity. Only the current offer is actionable; an accepted quote keeps its original record. Start with links and a summary, without a complex comparison editor.

ERPNext quotations keep pricing, validity, proposed payment terms and downstream order conversion together. This revision relationship is a proposed WDC adaptation. [Official guide](https://docs.frappe.io/erpnext/quotation).

## Later, when the accountant needs it

A numbered credit note can record an agreed reduction to an issued invoice while keeping the original invoice. It is different from refunding money or holding client credit. WDC should define that accounting flow before adding it. [Official credit-note guide](https://docs.frappe.io/erpnext/credit-note).

A closed-period control can protect reports that have already been reviewed. It needs controlled corrections and consistent historical records first. [Official accounting-period guide](https://docs.frappe.io/erpnext/accounting-period).

## Dashboard fit

Keep the existing shell and primary navigation. Reuse ProfileCard, Panel, the existing table, designed date/select controls, FileDrop, Dialog, Confirm and toasts. Tables remain tables at 320px, with a pinned first column and scrolling inside the panel. Use the same typography, colours, solid status fills and light/dark tokens. Reports open from Money; statements open from the client record. Owner finance permission and client project/billing scope apply to every report and download.

The first useful delivery is items 1 to 3. Items 4 to 7 can follow when their workflow is needed. Each needs an artifact and separate implementation verification. This research adds no dependency or application feature.
