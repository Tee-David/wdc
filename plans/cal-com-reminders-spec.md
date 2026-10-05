# Meetings reminder contract

Design and implementation specification, 5 Oct 2026. The preview demonstrates settings only; it sends nothing.

Cal.com documents workflows with before-event, booking and cancellation triggers, and host/attendee email actions: https://cal.com/features/workflows. Confirm the owner's account entitlement, configuration interface, cancellation behavior and receipt visibility before enabling the policy. Documentation alone is not an account capability test.

## Ownership and preferences

Keep user-facing controls short and understandable. Show whether a preference has been saved, explain delivery configuration failures beside the affected option, and expose the next safe action. Cancellation and rescheduling confirmations summarize what changed and what notices are queued; they never imply delivery before evidence exists. Phone layouts stack related controls with adequate spacing and must not hide content under the save bar.

- One sender for each message: Cal.com owns meeting/calendar notices and timed attendee reminders. WDC's durable logged outbox owns additional project context and opted-in operational alerts. Do not enable equivalent reminders in both.
- Proposed optional email reminders: 24 hours and 1 hour before a confirmed meeting. Skip elapsed reminders for short-notice bookings. Requested or declined meetings receive no attendance reminders.
- Save the attendee preference with the person and the booking; guests manage it through a scoped, expiring management token. Apply opt-out before dispatch. Host/staff notices use each person's own preference.
- Required confirmations, changes and cancellations are separate service notices. SMS/WhatsApp stay off until costs, entitlement, consent and regional support are verified.
- Settings save only succeeds after the effective provider policy is read back. If provider configuration cannot enforce consent, show the reason and setup action; leave optional reminders off. A sample preview save is never a production save.

## Lifecycle and dispatch

Store the UTC meeting instant, recipient IANA zone, booking revision, policy version, recipient preference and message ownership. Render the date in the recipient's zone; calculate due times from the UTC instant, so DST does not shift the meeting.

Reschedule supersedes reminders for the old booking revision and creates only future reminders for the new time. Cancellation, decline and opt-out suppress unsent optional reminders. Re-fetch canonical state after unordered webhook events. Re-check revision/status/preference just before dispatch; an already accepted provider send cannot be recalled, and that race must remain visible in the audit.

For WDC-owned messages, persist intent before any send. Use a unique key comprising booking identity/revision, recipient, message kind, policy version and due time. Claim work atomically with a bounded lease; concurrent runners must not both send it. Distinguish pending, suppressed, sending, provider-accepted, delivered (only with a receipt), failed and uncertain.

Retry transient failures with bounded backoff and respect provider rate limits. Permanent recipient/configuration errors stop and expose an actionable reason. Timeouts after possible provider acceptance become uncertain: reconcile against a supported provider correlation/receipt before retrying. If proof is unavailable, ask the owner to resolve it; never automatically duplicate the message. No stale reminders after the meeting ends.

## Monitoring and recovery

Show actual last synchronization, configuration state and known delivery evidence. Use “Managed by Cal.com” when delivery receipts are unavailable. “Enabled” is not “Sent”, and provider acceptance is not delivery.

Surface failed or uncertain WDC messages in the existing message log, including recipient, meeting context, attempts and safe next action. Retry needs permission, audit and the same dedupe key. Notify only subscribed operators; avoid producing an alert loop when email itself is down.

Cal.com owns timed scheduling unless a tested capability gap requires another runner. A once-daily Hobby cron cannot meet a one-hour reminder promise. Before a WDC timed worker is introduced, document expected volume, execution interval, latency budget, missed-run recovery and deployment monitoring. Do not rely on a browser tab, process memory or `after()` as durable scheduling.

## Release evidence

Owner-approved test recipients only. Verify: ordinary confirmed booking; booking inside one hour; pending approval; approve/decline; reschedule before and during dispatch; cancel; opt-out; DST boundary; duplicate/out-of-order webhook; concurrent workers; provider 429; permanent refusal; accepted send with timeout; process restart; missed scheduled run; configuration read-back mismatch; missing receipts. Demonstrate suppression/dedupe and audit records, not just a successful email. No production readiness claim until these checks and real account capability proof pass.
