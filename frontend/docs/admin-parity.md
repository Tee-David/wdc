# Admin dashboard parity map

Litch is the interaction and density reference; WDC keeps its own workflows, terminology, colours, and data rules.

| WDC area | Litch reference | Reuse deliberately | WDC additions / exclusions |
| --- | --- | --- | --- |
| `/admin` | `/admin` | Collapsible shell, compact KPI row, wide work column, right rail | Attention queue, project pipeline, cashflow, onboarding, and direct daily actions |
| `/admin/clients` | Client directory | Responsive search, filters, useful counts, focused creation | Contacts, portal access, communications, projects, money, forms, and activity |
| `/admin/projects` | Project delivery | Responsive stage views, owners, dates, health, and next actions | Updates, deliverables, approvals, revisions, files, and agreed communication route |
| `/admin/money` | Finance workspace | Overview, invoices, payments, expenses, exports, and reconciliation | Paystack and manual methods, partial payments, reversals, receipts, and audit history |
| `/admin/forms` | Form management | Draft/published states, submissions, preview, sharing, and export | Versioned WDC onboarding schemas and client/project conversion |
| `/admin/settings` | Grouped settings | Business, finance, communications, integrations, team, security, and data | Low-frequency tools remain nested here instead of becoming a seventh page |
| Client portal | Client area | The same shell quality with simpler client-first navigation | Projects, billing, forms/files, messages, approvals, and one action queue |

Explicit exclusions: fictional metrics, internal client notes in the portal, unsupported WhatsApp syncing, hardcoded payment status, and heavyweight dependencies for small UI effects.

## Verification matrix

- Widths: 320, 360, 390, 768, 1024, and 1440px.
- Modes: light, dark, keyboard-only, and reduced motion.
- States: first-use empty, cleared, filtered-no-results, loading, error, permission denied, and populated.
- Every figure must reconcile to its underlying records, and every card or action must lead to the screen that resolves it.
- Admin routes remain private, no-store, noindex, and free of public-site animation, smooth scrolling, and third-party FABs.
