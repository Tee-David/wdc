# WDC server architecture

This directory is reserved. It contains no backend package, server entry point or independent deployment. The running backend is part of the full-stack Next.js application in [frontend](../frontend/README.md).

## Implementation map

All paths below are relative to the repository root.

| Responsibility | Location |
| --- | --- |
| HTTP handlers | `frontend/app/api/` |
| Server pages and actions | `frontend/app/` and imported domain modules |
| Authentication and admission | `frontend/lib/auth.ts`, `auth-google.ts`, `roles.ts`, `auth/` |
| Database connection, schema and transactions | `frontend/lib/db/` |
| Versioned schema changes | `frontend/db/migrations/`, `lib/system/migrations.ts`, `scripts/migrate.mjs` |
| Admin state and persistence | `frontend/lib/admin/store.ts`, `persist.ts` |
| Forms and onboarding | `frontend/lib/forms/` and onboarding API routes |
| Storage signing and validation | `frontend/lib/r2.ts` and upload routes |
| Payments | `frontend/lib/paystack.ts` and payment/webhook routes |
| Email delivery and outcomes | Email modules, `message-log.ts`, `money-mail.ts` |
| Scheduled work | `frontend/lib/jobs/`, `app/api/cron/daily/route.ts` |

## Data and request boundaries

CockroachDB is accessed through the PostgreSQL-compatible `pg` connection pool. Use the lazy shared pool and existing transaction helpers. Schema definitions and SQL migrations are separate: a changed TypeScript definition does not update a deployed database.

The admin store currently has module-level mutable collections synchronized through its persistence layer. Do not describe it as a completed standalone database repository, assume instance memory is durable, or increase test concurrency without isolating state.

Validate browser input and authorize sensitive operations on the server. Proxy navigation is not a mutation's security boundary. Verify provider signatures and applicable persisted state before granting payment access. Uploads need scoped keys, ownership and server checks rather than trust in filenames.

Persist outbound intent before contacting slow providers. Every deferred message needs a deduplication key, recorded outcome and safe retry. In-memory rate limits provide abuse control per warm instance, not an account-wide quota across serverless instances.

## Configuration and operations

The root `.env` is loaded by the frontend configuration; already exported values win. Keep secrets in the configured environment and secret stores. Doppler synchronization does not establish that a particular deployment has received the same configuration.

Run development, build and tests from `frontend/`, using its README. There is no API-start command in this directory. Production SQL migrations are owner-managed through Settings › System, with applied state recorded in `wdc_schema_migrations`. The CLI affects whichever database its environment selects, so establish the target first.

The deployed daily cron is configured in `frontend/vercel.json`. It handles retention and invoice reminders. The proposed Cal.com integration is not implemented in this directory or by that daily job. See [current work](../docs/status.md).

## Future extraction

Create a separate service only for a measured requirement, such as long-running work that cannot fit the request lifecycle. Define authentication, data ownership, API contracts, retries, deployment, monitoring and rollback first. Keep business rules in the existing domain modules until then; do not create a second implementation here.

