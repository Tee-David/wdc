## Public meeting introduction spacing, 6 October 2026

The booking introduction now groups its heading and description, metadata, paused notice and actions with explicit responsive spacing so public copy margin resets cannot collapse them. Empty paused-notice paragraphs are removed; duration uses the configured value. Mobile actions retain their existing full-width stack. Targeted lint/diff checks run; rendered browser verification remains pending due the browser session failure.

Marketing source checkpoint: targeted onboarding/cursor lint and integrated TypeScript passed. The unverified same-working-day promise is removed consistently from Start metadata, introduction and receipt copy. Rendered verification remains pending.

## Marketing audit implementation authorized, 6 October 2026

The owner authorized implementation of the completed marketing audit. The active checklist is plans/marketing-implementation-checklist.md. Root is implementing plain-language service help and portal terminology; the existing marketing agent is repairing draft/reset/email lifecycle in an isolated worktree. Verification remains pending; source changes are not deployed acceptance evidence.

## Studio reset completed, 6 October 2026

The owner explicitly authorized a full studio-data reset retaining only the current owner. The verified database transaction removed the other two accounts, cleared operational submissions/resume tokens/uploads metadata, invitations, entry activity, payment charge records, message jobs and counters, and tombstoned all 73 active admin records with fresh sequence numbers so warm instances can observe the deletions. One owner remains; its account and session counts are unchanged. Published content, media library and application configuration were preserved. External payment providers were not changed or refunded. A complete encrypted recovery checkpoint was written outside Git beneath LOCALAPPDATA/WDCRecovery, using AES-256-GCM and a Windows CurrentUser DPAPI-protected key. The transaction checked every cleared table and owner access before commit. Earlier demo-preservation and clarification notes below are historical and superseded by this explicit reset authorization.

Users, Meetings, Paystack source checkpoints and backup design corrections are pushed. Backup design reuses the shared Dialog and FileDrop markup and established row menu/bulk patterns. Automatic backups, downloads and restoration remain proposed functionality, not running jobs. Final authenticated responsive review and a complete production build remain pending; the last build compiled and type-checked but did not complete static generation. The practical delivery proposal reconciles the completed agents' dashboard, marketing and onboarding audits; a checklist awaits plan approval.
# Current work

Updated 5 October 2026. This replaces the historical implementation checklist and handoff queue. Removing an old plan does not mean all its proposals shipped.

## Meetings

Keep the [integration plan](../plans/cal-com-meetings-plan.md), [setup checkpoint](../plans/cal-com-setup-status.md), [reminder specification](../plans/cal-com-reminders-spec.md) and [design preview](../prototypes/cal-meetings/README.md) until end-to-end implementation and verification are complete.

The preview uses sample bookings. It does not book appointments, send reminders or connect calendars. The account API authenticated during setup; no event type existed at that checkpoint. The API credential was synchronized to Doppler without adding it to source.

Implementation checkpoint `3a66604` adds native booking/manage routes, an admin calendar/table, owner settings, durable commands, signed receipt storage and migration 0035. Publication defaults off. Initial targeted lint, TypeScript and the Meetings policy check passed. Build and responsive review remain open; migration 0035 is not applied.

Remaining delivery: event-type configuration, calendar/conferencing connections, authorized booking commands, durable synchronization, signed webhooks, cancellation/rescheduling, recipient preferences, reminder scheduling/retries, permissions, integration tests and live verification. The existing daily invoice-reminder job cannot accurately deliver one-hour-before-meeting reminders.

## Users and roles

2026-10-06 checkpoint: owner Users management is on main. Follow-up commits add bounded selected exports, guarded database tests, recoverable password-reset intents and authoritative client invitation linkage checks. Focused checks passed; integrated build, responsive authenticated checks and dedicated real-session lifecycle tests remain pending. Migration 0036 is not applied by this work. Legacy capture-auth mutation tests are disabled rather than presented as verified.

## Backup, restore and demo cleanup

2026-10-06 integration checkpoint: Meetings (0035), Users (0036) and Paystack mode (0037) source changes are integrated. None of these migrations was applied by this work. Booking remains disabled; timed reminders and scoped staff/client/project booking linkage remain pending. Paystack preserves original checkout mode and rejects test settlement. Integrated demo-source, phone, Users filter/CSV, Meetings policy and mocked Paystack checks passed. Integrated TypeScript passed before the small Pager dismissal change; targeted Pager lint passed. The combined webpack build compiled and passed TypeScript but static generation repeatedly timed out, so the full build is not marked passed. The authenticated browser review is also incomplete.

The interactive Backup and restore artifact is served at `http://127.0.0.1:3148/backup`. It now uses the real FileDrop and Dialog markup, shared row-menu and bulk-bar styles, Daily/Weekly/Monthly choices, archive-count retention and personal notifications. It performs no backup, restore, upload or schedule execution. Earlier layout checks passed at 320/768/1440px in both themes; the final upload/dialog/menu corrections still need visual recheck because the browser stopped responding. The shared Pager now dismisses outside and on Escape; prototype outside-click/toggle checks passed.

Runtime starter records and empty-database reseeding are removed. Persisted legacy demo records have not been deleted: the source inventory and read-only audit preserve provenance and current owner access. No blanket reset or financial-history rewrite ran.

The read-only live inventory succeeded and a private admin-record checkpoint was created outside the repository. It found 45 unchanged seed records, 15 edited seed records and 13 added records, including a recorded Live-mode payment. Two non-seed client accounts exist alongside the owner. Owner clarification is pending before linked data deletion; no user/account record was removed. The reconciled review proposal is `docs/audits/practical-delivery-plan.md`.

Dashboard and marketing audit proposals are in `docs/audits/dashboard-real-world-review.md` and `docs/audits/marketing-real-world-review.md`. These reconcile the existing onboarding plans across all six services. The owner requested a plans checklist after approval; it has not been created or treated as approved.

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

## Compact onboarding choices and colour preferences · 6 October 2026

Source implementation replaces the six welcome posters with the shared designed service picker, preserves closed-service/restored-draft rules and uses explicit Next. Optional colour preferences remain available alongside a supplied guide: up to five names/hex/roles, practical swatches, drag shade surface, keyboard sliders and reversible recommendation choice. New readable-string entries are validated in draft cleaning and final field validation; legacy prose stays intact unless explicitly replaced. No schema, database or provider changes. Deterministic storage/shade checks and focused lint passed; an isolated full TypeScript pass completed, with the final integrated pass and responsive browser checks still pending. The isolated Turbopack server rejected the shared dependency symlink; the webpack fallback is compiling the bounded phone/theme suite, with onboarding API writes mocked. Root copy/default-alias checkpoint was merged without replacing its changes.
