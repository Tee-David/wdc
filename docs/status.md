# Current work

Updated 5 October 2026. This replaces the historical implementation checklist and handoff queue. Removing an old plan does not mean all its proposals shipped.

## Meetings

Keep the [integration plan](../plans/cal-com-meetings-plan.md), [setup checkpoint](../plans/cal-com-setup-status.md), [reminder specification](../plans/cal-com-reminders-spec.md) and [design preview](../prototypes/cal-meetings/README.md) until end-to-end implementation and verification are complete.

The preview uses sample bookings. It does not book appointments, send reminders or connect calendars. The account API authenticated during setup; no event type existed at that checkpoint. The API credential was synchronized to Doppler without adding it to source.

Remaining delivery: event-type configuration, calendar/conferencing connections, authorized booking commands, durable synchronization, signed webhooks, cancellation/rescheduling, recipient preferences, reminder scheduling/retries, permissions, integration tests and live verification. The existing daily invoice-reminder job cannot accurately deliver one-hour-before-meeting reminders.

## Users and roles

The owner requested a clearer, complete Users workflow. The [Users and Roles proposal](../plans/users-and-roles-plan.md) audits the existing Team page and invitations. It covers responsive tables, invitation delivery/resend/cancellation, role protection, recovery, session management and scoped support impersonation. This remains a proposal awaiting review, with a design artifact before implementation.

## Verification boundaries

- Google provider initiation and admission checks were verified during setup. A real user's completed sign-in journey still needs verification.
- `/onboarding` was checked for noindex, robots exclusion and sitemap exclusion. Preserve this requirement.
- Migration `0033` was already applied; cleanup must not rerun it.
- Older payment, invitation, dashboard and email plans mixed implementation and proposals. Check current modules and targeted tests before reviving a requirement. Their retirement is not a new production acceptance claim.

Update this ledger as work ships, and retire temporary artifacts only after their work is complete. Production schema changes remain owner-managed through Settings › System.
