# Current work

Updated 5 October 2026. This replaces the historical implementation checklist and handoff queue. Removing an old plan does not mean all its proposals shipped.

## Meetings

Keep the [integration plan](../plans/cal-com-meetings-plan.md), [setup checkpoint](../plans/cal-com-setup-status.md), [reminder specification](../plans/cal-com-reminders-spec.md) and [design preview](../prototypes/cal-meetings/README.md) until end-to-end implementation and verification are complete.

The preview uses sample bookings. It does not book appointments, send reminders or connect calendars. The account API authenticated during setup; no event type existed at that checkpoint. The API credential was synchronized to Doppler without adding it to source.

Remaining delivery: event-type configuration, calendar/conferencing connections, authorized booking commands, durable synchronization, signed webhooks, cancellation/rescheduling, recipient preferences, reminder scheduling/retries, permissions, integration tests and live verification. The existing daily invoice-reminder job cannot accurately deliver one-hour-before-meeting reminders.

## Users and roles

2026-10-06 checkpoint: owner Users management is on main. Follow-up commits add bounded selected exports, guarded database tests, recoverable password-reset intents and authoritative client invitation linkage checks. Focused checks passed; integrated build, responsive authenticated checks and dedicated real-session lifecycle tests remain pending. Migration 0036 is not applied by this work. Legacy capture-auth mutation tests are disabled rather than presented as verified.

## Backup, restore and demo cleanup

The owner requested a clean dashboard retaining the current admin account, improved Users spacing and a comprehensive Settings recovery section. The [Backup and restore proposal](../plans/backup-and-restore-plan.md) defines scoped archives, exclusions, private downloads, validation, safety checkpoints and a restore drill. It is a proposal, not an implemented backup. Demo provenance is being audited before removing persisted records; no blanket database reset has run. The existing reset-admin-store script would recreate starting records and is not a production cleanup procedure.

Paystack Test/Live Settings implementation is assigned separately. The audit found current mode-bound verification and test-settlement risks; reference-bound verification and isolation of test payments must accompany the control. No production mode has been changed.

The owner requested a clearer, complete Users workflow. The [Users and Roles proposal](../plans/users-and-roles-plan.md) audits the existing Team page and invitations. It covers responsive tables, invitation delivery/resend/cancellation, role protection, recovery, session management and scoped support impersonation. The interactive Users artifact is available at `http://127.0.0.1:3147/?view=users`. Implementation is now authorized and running in parallel with Meetings. The artifact uses clearly labelled sample accounts; it does not change users or send mail. Search alignment, pinned tables, row selection, reviewed bulk actions, pagination, 10/25/50/100 items per page and CSV/JSON export choices are included. The search field stays within the viewport and its icon stays inside it at 320, 390, 640, 768, 1024 and 1440px in both themes. Production account management and read-only support guards remain under implementation and have not been released.

## Verification boundaries

- Google provider initiation and admission checks were verified during setup. A real user's completed sign-in journey still needs verification.
- `/onboarding` was checked for noindex, robots exclusion and sitemap exclusion. Preserve this requirement.
- Migration `0033` was already applied; cleanup must not rerun it.
- Older payment, invitation, dashboard and email plans mixed implementation and proposals. Check current modules and targeted tests before reviving a requirement. Their retirement is not a new production acceptance claim.

Update this ledger as work ships, and retire temporary artifacts only after their work is complete. Production schema changes remain owner-managed through Settings › System.


## Support access checkpoint

Scoped read-only client support code is integrated into main: persisted actor/session/target validation, 15-minute expiry, server mutation/download guards, disabled shared forms/payment controls and a persistent Exit banner. Targeted lint, TypeScript and route/scope checks passed in the isolated feature branch; the route/scope checks passed again after integration. Migration0034 remains owner-applied through Settings > System. Production database lifecycle checks, integrated Users controls and responsive authenticated visual review remain pending.

## Onboarding planning

The owner confirmed the scope. Two agents are mapping the existing onboarding flows and service-specific experience separately, including branding colour preferences and visual explanations, simpler service selection, client activation/profile setup, terminology and the start-over cursor issue. Their proposals will be reconciled for review before onboarding implementation.

## Form controls and demo provenance audit, 6 October 2026

Source changes: Start topic uses the existing designed SelectField; custom forms reuse the lazy searchable country PhoneField. Nigerian numbers accept ten national digits, or eleven beginning with zero, and normalize to E.164. Contact client/server and custom-answer validation share that rule. Radio/checkbox label keyboard focus remains visible; the stray input shadow is removed. Users tabs reuse the dashboard tab component and its spacing. Focused phone normalization checks pass. Responsive rendered verification and integrated release checks remain pending; source changes are not live evidence.

Read-only demo provenance: `frontend/lib/admin/store.ts` contains starter arrays exposed by `persistedCollections()` (CLIENTS, PROJECTS, INVOICES, PAYMENTS, EXPENSES, SUBMISSIONS, TICKETS, TICKET_MESSAGES, CREDITS, TASKS, UPDATES, DELIVERABLES, PROVIDER_EVENTS, MESSAGES, ESTIMATES). `frontend/lib/admin/persist.ts` `load()` persists those arrays with `write(true)` when `admin_records` has zero rows. Removing database rows alone can therefore reintroduce starters. Prototype fixtures and browser test fixtures are separate from production `admin_records`; removing their samples is not database cleanup.

No database deletion occurred. Before any cleanup, export/checkpoint the exact database and related records, compare candidate `(collection,id)` rows and full contents against committed starters, identify real records edited from those IDs, and review relationships. A seed-looking ID or sample-like name alone is insufficient provenance. Preserve the actual administrator and all actual client/work/payment records. First retire the empty-database auto-seed source, then remove only reviewed demo rows with a recoverable checkpoint and verify remaining references; do not truncate `admin_records` or auth tables.

Demo source remediation now removes all fifteen persisted starter array initializers and their unused invoice fixture helpers. Missing database and failed sync/save paths raise errors rather than returning a synthetic success. Empty `admin_records` clears runtime collections and stays empty. Existing persisted records and authentication tables remain untouched. The checked-in `docs/audits/legacy-demo-records.json` inventories 60 literal source candidates and relation IDs; it is not an approved deletion list.

`frontend/scripts/audit-demo-records.mjs` is read-only and deliberately has no delete operation. It requires an explicit `WDC_DEMO_AUDIT_DATABASE_URL`, matching `--database-name`, existing `--checkpoint` export and a new `--output` path. It never loads `.env`, never inherits the application URL and never overwrites an audit artifact. Root must review full persisted candidate records, edits and relationships before any later authorized cleanup. No database audit script was run against a live target.
