# Email operations

The maintained implementation lives in `frontend/lib/`: email templates, message records, money mail, health probes, alerts and `jobs/`. Read those modules for current configuration and message types.

Validate and persist the request before slow delivery work. Persist outbound intent and its deduplication key before contacting the provider. An accepted form is not proof that its receipt arrived. Deferred work needs an auditable outcome and a safe retry; avoid duplicate sends.

Recipient preferences govern optional messages. Invoice reminders use day-specific deduplication keys and respect opt-outs. The daily job also performs retention, maintenance notifications and delivery alerts. It is not a minute-resolution scheduling service.

Templates use truthful persisted state, useful links and the WDC visual language. Do not expose secrets or internal diagnostics to recipients. An old proposal to replace the template framework is not an installed dependency.

Use Settings › System, message records and provider diagnostics to distinguish missing configuration, provider acceptance, retryable failure and delivery. DNS and reputation change independently of Git: check SPF, DKIM, DMARC and sender alignment for the actual sender during an incident. Old provider support drafts and dated DNS measurements are not current evidence.

The [Meetings reminder specification](../plans/cal-com-reminders-spec.md) covers proposed optional reminders, stale-job suppression, retries and observability. Settle notification ownership between Cal.com and WDC before enabling either. SMS requires configured support, cost and consent.
