# Paystack mode Settings implementation

Status: architecture proposal before payment-path changes. No production mode, credentials, payment, or migration has been changed.

## Existing behaviour and required correction

`frontend/lib/paystack.ts` resolves mode synchronously from `PAYSTACK_MODE`. Initialisation stamps metadata mode, but verification and webhook signatures use the currently selected key. `/pay/done`, the webhook, manual Paystack entry, and reconciliation stamp current mode. Consequently switching mode can reject an already-open live checkout. `applyPayment` accepts a test-mode payment and recalculates the real invoice balance: mode is currently descriptive, not a financial boundary.

The requested control must therefore ship with reference-bound verification and a test-payment boundary. A standalone UI toggle would not be safe.

## Settings and authorization

Add a Payments section using existing SettingsForm, custom designed selector, shared save bar, dirty-state/discard, and toast. Choices: Test and Live. Explain that Test uses simulated payments and never settles a real invoice. Display only whether each mode's existing secret/public pair is configured; never return key values. Selecting Live requires the existing in-app confirmation with an explicit real-money disclosure, fresh real owner authentication, current persisted owner status, origin validation, support-view rejection, and audit recording.

Persist `payments.paystackMode` using the existing settings store. Missing override falls back to the ENV default; database failure must refuse checkout/config changes rather than silently choose a different account. Validate key prefixes and selected pair presence server-side. Keep configuration reads server-only. Do not rewrite ENV or Doppler. Existing references retain their original mode when settings change.

## Payment identity and settlement

Introduce a small migration-owned `paystack_checkout_attempts` table: reference primary key, invoice ID, expected amount/currency, mode constrained to test/live, created time, and initialization state. Reserve migration number with root after 0035/0036 and other active changes; do not assume 0037 is free. Persist the attempt before calling Paystack and use one resolved config snapshot throughout initiation. New references may include a readable mode prefix, but the persisted record is authoritative.

Verification loads the attempt, selects its original mode's secret, verifies Paystack's reference/amount/currency and invoice identity, and records that mode. Never infer mode from current settings or unsigned metadata. For legacy references without attempts, locate persisted checkout/provider evidence where present; otherwise verify against configured accounts in a bounded explicit fallback, require one unambiguous successful result, and record provenance. Missing or ambiguous evidence remains unmatched for review.

Webhook HMAC checks both configured account secrets and returns the authenticated mode rather than a boolean. Require an unambiguous match, compare it to persisted attempt mode when present, and acknowledge authenticated test events as test reconciliation entries without claiming/banking a charge. Unknown mode, mismatched metadata, amount/currency/reference, or missing identity fails closed. Configuration switching never disables verification of already-created live references.

At the central financial boundary, refuse `method=Paystack` unless mode is live. Apply the same protection to callback, webhook, manual entries, and reconciliation assignment. Test success produces no real payment, receipt, invoice status change, client credit, financial KPI, or client payment email. The UI explicitly says the test checkout succeeded and the invoice remains unpaid. Preserve historical test rows without destructive rewriting; separately identify existing test-credit contamination for owner review rather than silently altering financial history.

## Minimal delivery sequence

1. Add focused checks proving test Paystack cannot affect balances and mode switching does not alter verification identity.
2. Implement explicit-mode config helpers and authenticated webhook mode result; update all callers identified by the source trace, including probes, notices, integrations, System page and manual/reconciliation actions.
3. Ship attempt migration and persistence with fail-closed missing-migration states. Owner applies through Settings > System; no runtime DDL for this new table.
4. Convert mode-dependent consumers to awaited persisted resolution, avoiding settings cache drift across instances. Reuse existing setting invalidation and do not introduce a worker or package.
5. Add Settings UI only once settlement and legacy-reference handling are verified. Preserve current tokens, fonts, button rules and geometry.

## Acceptance and release evidence

Cover owner/staff/client/support access, missing/invalid origin, stale owner session, unavailable store, missing selected keys, invalid mode, and audit failures. Cover live initialization followed by Test selection before callback/webhook, reverse switching, duplicate callback/webhook races, unsigned or wrong-key events, mismatched attempt mode, legacy references, test-event acknowledgement, and manual/reconciliation test assignment refusal. No provider calls are needed for these checks: use deterministic signed fixtures and mocked API responses.

Check 320/375px phone, tablet and desktop, long descriptions, icon centering, keyboard selector/dialog/save-bar navigation, touch targets and both themes. Run targeted tests, TypeScript, lint and production build. Report local evidence separately from production. After owner-controlled migration/deploy, verify exact commit and configured status without charging, toggling production mode or exposing credentials. Preserve rollback to the previous mode setting while leaving reference-bound verification active for in-flight payments.
