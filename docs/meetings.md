# Meetings operations

Native routes: `/meet`, private noindex `/meet/manage/<opaque-token>`, `/admin/meetings` and owner-only `/admin/settings/meetings`. Server functionality runs within frontend. Do not put private management links in analytics or logs.

## Publishing

Migration `0035_meetings.sql` is owner-applied through Settings > System; preserve the checkpoint and verify its receipt. Booking is disabled by default. Server-only `CAL_API_KEY` and `CAL_WEBHOOK_SECRET` belong in the existing environment/Doppler workflow.

Create the private Project conversation event type from Scheduling settings. Review the existing schedule, date exceptions, notice, buffers and duration. Connect a destination calendar and Google Meet in Cal.com.

Deploy and verify the canonical endpoint `/api/meetings/webhook`. Register an active Cal.com webhook with the same secret, default payload, and BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED, BOOKING_CONFIRMED and BOOKING_REJECTED triggers. Publication checks this registration, calendar and Meet readback; an environment key alone is not a healthy integration.

Perform an owner-approved test booking, cancellation and reschedule. Confirm the invite/link, webhook receipt, projection and private management access before enabling public entry points.

## Recovery

Commands persist before provider calls, with an actor, request fingerprint and state. A pending command is claimed once. Polling resumes that command; ambiguous provider POSTs are never blindly repeated. A failed read does not prove no booking exists.

Pending commands and signed webhook receipts recover on subsequent calendar/status requests. Interrupted workers become uncertain. Booking reconciliation examines at most 100 provider bookings, accepting only one exact command-metadata match. Older ambiguous changes require provider review. Rescheduling transfers private management access transactionally when Cal.com returns a new UID.

## Notifications and validation

Cal.com owns calendar confirmations and changes. Delivery is not claimed without evidence. Timed reminders and SMS stay off until consent, opt-out, change/cancellation suppression and workflow outcomes are verified. The daily invoice job does not deliver one-hour meeting reminders.

Run targeted lint, TypeScript and `node --experimental-strip-types frontend/scripts/check-meetings-policy.mjs`. The runnable policy check covers signatures, required origins, dates, zones, safe links and overlapping ranges.

Staff access fails closed until assignment/delegation checks and client/project linkage are implemented. A staff role alone never grants the whole studio calendar.

Checkpoint validation: targeted lint and TypeScript passed; policy checks passed. A webpack production build passed before the final small follow-up edits. HTTP checks against that build rejected missing/foreign origins and unsigned webhooks, and returned bounded-body and malformed-JSON errors. Final exact-source build remains pending.

Not yet verified: migration application; live event-type settings and slots with an actual booking; webhook delivery; timed reminder policy; client/project linkage; responsive review in both themes; final build and canonical deployment. A source checkpoint is not production readiness.
