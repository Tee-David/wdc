# Client workspace delivery

The owner approved implementation on 10 October 2026. This ledger separates source work from live acceptance.

- [x] Preserve unrelated payment work in the original checkout; use `codex/client-workspace-live` for integration.
- [x] Inspect existing rendered project pages and shared record headers, panels, badges and controls.
- [x] Add service-specific records, immutable versions, client review and publication evidence.
- [x] Add durable events, personal inbox, recipient-controlled email categories and summaries.
- [x] Add staff tasks, dependency checks, internal notes and accepted handovers.
- [x] Integrate workspaces into existing project pages and inbox links into existing chrome.
- [x] Strengthen generic deliverable draft privacy and exact-version decisions.
- [x] Complete project access management and additional client reviewer access.
- [x] Integrate legacy project, department and client-level communications.
- [x] Update owner, staff and client tours; verify account-specific completion in focused checks. Rendered tour checks remain below.
- [ ] Run TypeScript, lint, build and focused domain and security checks.
- [ ] Verify phone, tablet and desktop interactions in both themes.
- [x] Push verified source milestones to main and the working branch (6711897); final release acceptance remains below.
- [x] Apply migrations using the established owner migration engine and verify production schema (administrative invocation; Settings UI not separately tested).
- [ ] Verify the exact deployed commit, canonical pages and persisted workflow behaviour.

Real provider publishing is not configured by the service records. Publication and release states require evidence; source records must not claim an external provider accepted work without that evidence. No client messages are sent for visual verification.

- [x] Add separate invoice/receipt Print/Save PDF, faithful receipt PDF attachment and alternate-email delivery; native PDF checks pass.
- [x] Complete invitation expiry escalation and client-level notices without project bindings.

## Currency and printable documents (10 October)

NGN and USD start enabled. Settings > Studio and invoices controls enabled supported currencies and up to ten manual-payment accounts. Each invoice/quote selects its currency and an optional matching account, copied into the document; issued currencies and recorded payments stay fixed. Accepted quotes and duplicates keep the original currency. Credits cannot cross currencies. Paystack remains NGN only; foreign documents show manual-payment details. Financial summaries show each currency separately; expense/margin charts remain NGN.

Receipt, invoice and estimate PDF/print layouts repeat the onboarding watermark on every page and use WDC fonts, tables, QR and document status. Receipt sending supports an explicitly entered alternative email without replacing the client address. Native PDF and currency boundary tests passed; final browser/build/deployment checks remain pending.
