# Settings: Backup and restore

Status: proposed architecture and interaction design; no backup or restore has run.

## Page and interaction

Add an owner-only Backup and restore section under Settings > System. Reuse the Settings shell, Panel, shared form/save bar, designed pickers, confirmation dialog, toasts, RowMenu and Pager. Head action: Create backup. The overflow menu contains retention settings and recovery instructions. Keep actions distinct from configuration saves.

Show the most recent verified backup and its exact scope, date, size and result. No green “protected” status merely because a job started. First use explains that no verified backup exists and offers Create backup. Separate loading, failed, unavailable and filtered-empty states.

History stays a horizontally scrollable table with the name pinned at phone widths. Columns: backup, scope, created, size, verification, actions. Include search, status filter, 10/25/50/100 page sizes and existing pagination. Row actions: view manifest, download, validate, restore preview, move to trash. Permanent deletion is owner-only with “I understand”; a backup used by an active job cannot be deleted.

## What a backup means

Distinguish an application export from full disaster recovery. An application archive holds explicitly supported studio records, settings, relationships and a media manifest; it is not an SQL dump and does not include environment secrets, API keys, password hashes, sessions, reset/invitation tokens or signed URLs. State excluded data before creation and on every manifest. Auth identity survives application restore; restoring credentials requires a separate secured provider/database recovery procedure.

Full recovery also requires database-provider backups, original R2 objects, deployment source/version and secret-manager recovery. Identify actual provider capabilities and retention before claiming these are available. A media manifest alone does not back up file bytes. Offer metadata-only and verified files-inclusive scopes only when implemented and tested; show skipped/missing files and fail verification when required objects are absent.

Archives contain format version, schema/migration compatibility, creation time, scope, record counts, object sizes and cryptographic checksums. Store them privately with encryption at rest; downloads require fresh owner authorization and short-lived links. Never store bearer credentials in the archive. External archives require structural/checksum validation and an explicit untrusted-source warning; a checksum proves integrity, not authorship.

## Creation lifecycle

Persist a job before returning queued feedback. Job states: queued, running, verifying, ready, failed, cancelled; record progress only when measured. Capture a consistent database snapshot and record its boundary. Pin or snapshot media versions where possible, otherwise disclose that files may change during capture. Bounded work and checkpoints permit recovery from worker interruption. Do not assume a serverless after-response callback is a durable worker.

Estimate current record counts, bytes, provider limits and runtime budget before choosing synchronous export, provider-native backup or a worker. Streaming must respect a configured maximum and protect memory. Retention deletes only verified-expired backups, keeps at least the most recent verified recovery point and pauses deletion during restore or validation. Automatic schedules and recipient-controlled completion/failure notifications are optional settings, disabled until a durable scheduler exists.

## Restore lifecycle

Upload/select archive > validate > preview differences > create safety checkpoint > confirm > restore > verify. Validation is read-only and checks schema, supported version, checksums, bounded decompression size, path traversal, duplicate IDs, relationships and media availability. Reject incompatible or corrupt archives before any write. No arbitrary SQL, executable content or arbitrary object destinations.

Preview exact additions, replacements, omissions and conflicts. Initial implementation restores a documented application scope as one unit; selective per-record merging is deferred until a proven need. Never silently invent a conflict resolution policy. Preserve the current owner's identity and access. Explain that external Paystack charges, Cal bookings and delivered emails cannot be rolled back by restoring application data.

Restore requires fresh real-owner authentication, explicit environment/site identification, the in-app irreversible confirmation and “I understand”. Block support impersonation. Obtain a durable exclusive restore lock, create and verify a pre-restore checkpoint, and gate conflicting writes. Resume or roll back safely on interruption; do not rely on browser connection lifetime. Stop outbound jobs during restoration and prevent replay of old receipts, reminders, invitations and payment side effects. Reconcile provider facts separately before resuming automation.

After commit, verify counts, relationships, owner access and media, invalidate caches and reconnect readers. Report partial failure accurately with checkpoint/recovery instructions. Preserve a non-sensitive audit of actor, scope, archive identity, preview, validation and outcome outside the replaced dataset. Dry-run recovery must pass on a dedicated disposable database and private storage prefix before a production restore control is enabled.

## Delivery gates

1. Inventory persisted tables, settings, media ownership, provider recovery facilities and demo provenance; publish supported/excluded scope.
2. Produce responsive light/dark page artifact using existing components; review creation, history and restore-preview flows.
3. Ship owner-authorized archive export plus manifest verification and private download; no restore writes yet.
4. Implement checkpointed restore on isolated fixtures with corruption, interruption, stale-schema, concurrent-write and notification-replay checks.
5. Demonstrate a full restore drill, publish recovery instructions and enable production restore only after its exact scope is verified.

Demo cleanup is a separate operation: inventory real and sample records first, preserve the current authenticated owner, create an appropriate recovery checkpoint, remove only confirmed sample records and eliminate reseeding/fallback sample UI. Never use reset-admin-store.mjs as production cleanup: it clears records and intentionally causes starting records to be written again.
