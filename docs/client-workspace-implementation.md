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
- [x] Run TypeScript, lint, build and focused domain and security checks (136-page production build; Flutterwave, currency, PDF and communications checks).
- [x] Verify phone, tablet and desktop layout and targeted USD/stage-cancel interactions in both themes (60 page cases and twelve targeted cases; read-only development capture).
- [x] Push verified source milestones to main and the working branch (6711897); final release acceptance remains below.
- [x] Apply migrations using the established owner migration engine and verify production schema (administrative invocation; Settings UI not separately tested).
- [x] Verify the exact deployed source commit and canonical pages (0006606 production READY).
- [x] Verify persisted workspace privacy, version decisions and gates using rolled-back database checks.
- [ ] Complete provider acceptance: real payment submission and Flutterwave dashboard webhook registration remain unverified.

Real provider publishing is not configured by the service records. Publication and release states require evidence; source records must not claim an external provider accepted work without that evidence. No client messages are sent for visual verification.

- [x] Add separate invoice/receipt Print/Save PDF, faithful receipt PDF attachment and alternate-email delivery; native PDF checks pass.
- [x] Complete invitation expiry escalation and client-level notices without project bindings.

## Currency and printable documents (10 October)

NGN and USD start enabled. Settings > Studio and invoices controls enabled supported currencies and up to ten manual-payment accounts. Each invoice/quote selects its currency and an optional matching account, copied into the document; issued currencies and recorded payments stay fixed. Accepted quotes and duplicates keep the original currency. Credits cannot cross currencies. Paystack remains NGN only; Flutterwave supports NGN and USD, alongside selected manual-payment details. Financial summaries show each currency separately; expense/margin charts remain NGN.

Receipt, invoice and estimate PDF/print layouts repeat the onboarding watermark on every page and use WDC fonts, tables, QR and document status. Receipt sending supports an explicitly entered alternative email without replacing the client address. Native PDF and currency boundary tests passed. Finance release ac5ec06 is READY in production and aliased to the canonical domain. A replacement browser sweep passed 60 full-page cases at phone, tablet and desktop widths in both themes, without overflow or JavaScript page errors. All three role tours passed start, close and replay. These are read-only development capture checks; every tour step and production persisted client journeys remain open. Six payment-selector component cases also passed.

Draft invoices use current Settings account details when saved; issued documents preserve their saved snapshot. A focused account-selection regression covers edited and removed accounts and currency boundaries. Twelve USD-control and stage-cancellation browser cases passed; no settings saves or project mutations. The actual completed-entry Print route passed a synthetic six-page A4 PDF check, including answers, watermark on every page, inline print and attachment download. b702ad8 is production READY and canonically aliased; persisted production workflows remain distinct from read-only capture checks.

- [x] Full owner, staff and client walkthroughs reach Finish with displayed cards inside the viewport (35 owner, 28 staff, 12 client phone steps; unavailable optional read-only targets omitted).
- [x] Rendered Users page and export dialog load after the SSR fix; staff support recovery/authorization native checks pass.
- [ ] Real-account production staff support-view acceptance remains unverified.

- [x] Database-backed staff support creation, effective identity, role/deactivation/expiry/revocation guards, Exit and audit verified with rolled-back fixtures; zero fixture rows remain.
- [x] TEST/LIVE signed no-op production webhook probes accepted without financial writes.
- [ ] Flutterwave dashboard wiring is retained by the owner, per their 11 October instruction; further provider sandbox submission stopped.
