Onboarding browser evidence: colour editing, picker sliders, row limits/removal and reversible recommendation choices passed at 320/390/768/1440px in light and dark. Next navigation passed at 320/1440px; the active board section is visible below the fixed header. All six service illustrated-help journeys passed at 390px, and a native-touch Next check passed without Lenis. These total 19 distinct browser cases across focused runs. Optional client profile setup and final exact-source build remain pending.

## Onboarding priority integration, 6 October 2026

The owner requested onboarding completion before remaining Settings/dashboard tasks. Draft reset ordering, full resume-token revocation and durable queued-email intent are integrated (081eccd). Compact service selection, maximum-five optional colour preferences and legacy prose preservation are integrated (d663b81/62c012a). All six service briefs now have compact option explanations and optional illustrated help (f182b40). Step/back/tab/review navigation resets after committed layout through the shared scroll owner; board navigation reveals the active card, while steps/conversation return to the top (138532a). Start/custom conversations also reset after navigation. Focused deterministic colour and draft checks, targeted lint and integrated TypeScript pass. Browser picker passed; responsive colour/navigation suite remains running. Optional post-invitation personalization is under implementation; no live messages/provider writes were performed.

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

## Onboarding redesign, 7 and 8 October 2026

The owner approved the plan and chose the Size first flow for all six services. All six forms were rewritten from the UX research (`plans/onboarding-ux-research.md`) and are on main. Decisions: `plans/onboarding-decisions.md`. Checklist: `plans/onboarding-redesign-checklist.md`. Words: `plans/onboarding-voice-guide.md`.

Shipped: one visibility rule with combined conditions and tiers, a step file per service, shared screens trimmed to about 90 seconds, the simple colour flow (feeling, ready palette, Yes use these), picture cards, the searchable feature checklist, the dropdown rule (single choice of three or more is a dropdown), the voice pass (names, industry examples, reflect back lines, next screen buttons), a help strip, the studio note and Earlier questions in the admin entry page, a pre-filled link from a form's Settings, reminders for unfinished drafts, the Services copy and the Works motion section, pitch decks and case study loops.

Measured on main: tsc clean, eslint clean, production build passes, `onboarding-colours` 19 of 19, `onboarding-guardrails` 36 of 36, `onboarding-walk` 12 of 12 (every form from first screen to review at 390 and 1280), `work-motion`. Small jobs measure 17 to 21 questions over 7 screens with 10 or 11 required, down from about 18 required.

**Needs the owner:** apply migration `0039_onboarding_steps_and_nudges.sql` in Settings, System. Until then draft saves from screen 5 onward are stored at step 4 (nothing is lost, a resumed draft opens a little earlier) and unfinished draft reminders do nothing. The engagement section is built but off until a Nigerian lawyer approves it and `ONBOARDING_ENGAGEMENT=on` is set. The WhatsApp button appears when `NEXT_PUBLIC_STUDIO_WHATSAPP` is set. The sent screen already promises a reply within two working days.

Not verified: a real phone (Edge on iPhone included), keyboard only and screen reader use, the admin pages in a browser (they need a login), reminder emails sent for real, the engagement section in a browser. The dropdown fix for Edge on iPhone is unconfirmed on the device.

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

The owner approved a deeper onboarding redesign on 6 October 2026: a distinct form per service, three flow options to choose from per service, a new colour system, motion design inside Branding & Design, and a per-service client engagement section. The [plan](../plans/onboarding-redesign-plan.md) and [checklist](../plans/onboarding-redesign-checklist.md) are written and await the owner's approval. No form code has changed for it yet. The dropdown scroll fix is separate and in progress.

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

All six briefs now use compact choice explanations and optional illustrated examples through the existing shared Tip: identity outputs, search/tools access, website structure/hosting, app roles/backend, software workflow/integrations and social content/delegation. Help keeps stable answer keys/options and never grants access, charges money or promises automatic outcomes. A metadata integrity check verifies every help mapping against the real service inventories. It passed; focused lint passed. The isolated browser attempt initially timed out cold and later did not hydrate the form; root is rerunning the integrated suite against its warm localhost preview. Responsive acceptance remains pending until that run and screenshot review pass.

Onboarding spacing correction: service picker label/helper gaps are explicit; optional colour preferences now show a bordered disclosure, explanatory instruction and rotating chevron. Existing keyboard-native details behavior is preserved. Focused rendered checks are in progress.

Release check at bb96c27: production build exited successfully (compilation, TypeScript and static generation). Database reads timed out during static generation and used existing source fallbacks, so this is build evidence, not live data verification. Nine profile/draft runtime checks passed. Source f2d220a spacing/disclosure has targeted lint and focused service/390px colour browser checks passing. Current requested HeroUI/FileDrop replacements remain in progress. Profile setup still requires owner-applied migration 0038 and a fresh-invitation authenticated walkthrough.

Onboarding picker hardening (not a reproduced fix): on touch the sheet no longer auto-focuses the search box, follows visualViewport above the keyboard, uses dvh with an svh fallback and gives its list a definite max-height for WebKit; Chromium specs pass, real iOS WebKit/Edge still needs the owner to test on a phone.

## Onboarding follow-ups, 8 October 2026

Added: font pairings (about a hundred, lazy and subset), shuffle for colours, registration and online-presence questions, company age, flyer content and pictures, fonts step, a "Back to the onboarding menu" button on every first page, a timing question with a calendar, an update-channel tooltip (existing clients reuse their portal), a pre-filled link that starts from an existing client, and a full policy rewrite with a new Hosting, Domains and Accounts policy. Verified: TypeScript and ESLint clean on each push. Not yet verified: a full clean Playwright run of every onboarding spec (overlapping runs clobbered results), a production build after the latest changes, and the real iPhone and Edge dropdown fix. Owner to do: apply migration 0039; lawyer review of `lib/legal.ts` before the engagement section is turned on.


## Backups (added 2026-10-08)

- `frontend/scripts/backup-export.mjs` + `restore-check.mjs` + `.github/workflows/backup.yml`: weekly AES-256-GCM sealed export (all tables except `session`/`verification`) to a separate R2 bucket. Round-trip and wrong-key rejection verified locally with a synthetic file; NOT yet run against the real database.
- Owner to do: create a read-only DB role, a separate R2 bucket and a no-delete token, add the secrets listed at the top of the workflow, store `BACKUP_KEY` in a password manager, run the workflow once by hand, then run a restore drill (`restore-check.mjs`) and record it here. Not counted as a backup until that drill passes. Files in R2 are not yet copied.
- Invoice numbers are now random (`INV-YY-XXXXXX`); old sequential numbers stay valid. Project budget no longer reaches staff browsers on the board.
