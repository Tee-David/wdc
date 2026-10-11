# Money

## Invoices

- Number `INV-26-XXXXXX`, currency NGN by default (USD and others from Settings, Currencies and banks).
- States, each a solid tag: Draft, Sent, Due in N days (`ad-tone-warn` inside 7 days, else neutral), N days late (`ad-tone-bad`), Paid (`ad-tone-good`), Refunded and Void (neutral).
- Row actions: Send a reminder (8 second countdown with Undo), Record a payment (pick how it was paid), Copy payment link, Preview PDF; overdue adds Send final notice (confirm with the email preview); Void needs "I understand".
- Milestone billing: deposit, milestones, final 20% after the recorded handover meeting.

## Quotes

- Number `EST-2026-NNN`. Built from the price list: tick lines, set quantities, VAT at 7.5% on by default, the 50% deposit shown, and a fit line against the lead's budget (inside, under, or over by an exact amount).
- Review and send shows the email exactly; a sent quote is valid 14 days and becomes the deposit invoice when accepted. Save as draft never sends.

## Payments for clients

Clients pay by **Paystack** or **Flutterwave** only. No bank transfer in the client portal.

1. Choose the provider (both shown with their logos and what they accept). The invoice amount, "Processing fee: None for you" and the currency note sit under them.
2. Pay opens the provider. The sheet shows three steps: creating a secure payment, opening the provider, waiting for it to confirm. Closing mid-way is safe: we keep checking and email the result.
3. Success: confetti, "Payment received", and the receipt rolls out of the printer slot (the existing receipt printer component), with Download receipt. The invoice turns Paid everywhere and cannot be paid twice.
4. Failure: say what the provider said and that nothing was taken. Offer the other provider, and Ask us for help with the provider's answer attached.

## Receipts

- Number `RCT-2026-NNN` (Flutterwave: `RCT-2026-FNNNNNN`). File name `receipt-<number>.pdf`.
- A receipt shows: WDC Studio, the number, what it was for, the amount, paid with, the date and time, total paid, and a barcode strip. It is emailed and kept in Billing.
- Recording a payment by hand (owner) sends the same receipt.

## Payouts and expenses (owner)

Freelancer payouts are approved after the client approved the work, in a review sheet where each payout is ticked. Approval confirms with the exact total and the bank it pays from, and can be cancelled until the payment time.

## Who sees amounts

Owner and finance see every amount. Staff see chips only (Deposit paid, Awaiting deposit, Retainer, Not billed). Clients see their own invoices, receipts and balance.
