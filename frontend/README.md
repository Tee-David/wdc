# WDC full-stack application

The public studio site, admin workspace, client portal and server endpoints run together in this Next.js App Router application. The [backend directory](../backend/README.md) is reserved, not a second running service. The root [README](../README.md) owns the design system; [AGENTS.md](../AGENTS.md) owns engineering conventions.

## Development

Run these commands from `frontend/`:

```powershell
npm ci
npm run dev
```

Development defaults to port 3000. Use `npm run dev -- --port 3100` for the default test URL, or set `WDC_E2E_BASE_URL` to an existing instance. For production, run `npm run build`, then `npm start`. The lockfile determines installed dependency versions; `package.json` defines supported scripts.

The stack includes Next.js, React, TypeScript, Tailwind CSS, Better Auth, PostgreSQL-compatible CockroachDB, R2, SMTP and Paystack. Lucide supplies existing icons. Motion, GSAP and Lenis are available for appropriate use; keep optional effects off the critical rendering path.

## Infrastructure map

| Location | Responsibility |
| --- | --- |
| `app/` | Routes, layouts, metadata, server actions and HTTP handlers |
| `proxy.ts` | Session/navigation routing and maintenance behaviour |
| `components/admin/` | Shared shell, panels, tables, forms, dialogs, tokens and loading states |
| `components/client/` | Client portal interfaces |
| `components/auth/` | Authentication interfaces |
| `components/ui/` | Shared interaction and scroll behaviour |
| `lib/` | Domain logic, content registries, provider adapters and persistence |
| `lib/db/` | Database pool, schema and transaction helpers |
| `db/migrations/` | Versioned SQL changes |
| `public/` | Static brand/media/font assets and service worker |
| `tests/` | Playwright behaviour, security and visual checks |
| `scripts/` | Migration and focused diagnostics |

Public routes include work, services, blog, contact, tools and onboarding. Authenticated work lives under `/admin` and `/portal`. Form/payment links have separate server validation. `/onboarding` intentionally excludes indexing. Inspect route metadata when adding pages: inherited canonical and robots settings can produce incorrect behaviour.

## Rendering and design

Prefer server components and small client boundaries. Load optional third-party code after genuine user intent. Avoid request waterfalls, duplicate listeners and render-time side effects. Cache safe public data with explicit invalidation after writes; personalized state and financial status must remain truthful.

Build from the existing shell, Panel, form kit, confirmation dialog, toast, picker and table components. Preserve the public black/white button pair and separate admin tone tokens. Distinguish empty, filtered, loading, failed and unauthorized states. All saves and changes need immediate feedback; provider failure must not appear successful.

The documented typography direction is Space Grotesk headings and Outfit body. Current runtime configuration aliases body text to Space Grotesk; inspect `app/layout.tsx` and `app/globals.css` before changing it. Previews reproduce the runtime. A font correction is a deliberate design-system change.

Mobile uses native scrolling and the existing sidebar drawer. Tables stay tables and scroll inside their container. Check at 320px and desktop, both themes, long content, keyboard focus, touch targets and reduced motion. Check spacing and control grouping as well as overflow. Route scroll changes through `components/ui/scroll-reset.tsx`.

For authored motion designs, read the installed [Motion Studio skill](../.agents/skills/motion-studio/SKILL.md). Its film workflow does not replace ordinary UI accessibility and performance rules.

## Configuration and secrets

`next.config.ts` loads the repository-root `.env`, since Next normally reads its own project directory. An existing environment value wins. Playwright has a matching root loader. Never print or commit secret values, expose them through `NEXT_PUBLIC_*`, or rewrite `.env` using a regular expression.

| Service | Configuration boundary |
| --- | --- |
| Database | `DATABASE_URL` or `COCKROACHDB_URL`; certificates handled in `lib/db/pool.ts` |
| Authentication | `lib/auth.ts`; Google uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` |
| Email | Mail-module SMTP/sender resolvers; use their names rather than adding aliases |
| R2 | `lib/r2.ts` resolves account, bucket and credentials; `CLOUDFLARE_R2_URL` supplies the public asset base |
| Payments | `PAYSTACK_MODE` with the corresponding `PAYSTACK_TEST_*` or `PAYSTACK_LIVE_*` pair, resolved by `lib/paystack.ts` |
| Daily jobs | Authentication in `app/api/cron/daily/route.ts` |
| Capture tests | `BONEYARD_CAPTURE_TOKEN`, limited to the source-defined capture behaviour |
| Proposed Meetings | Server-only `CAL_API_KEY`; retained integration plan governs implementation |

Check configuration through application diagnostics. A key synchronized to Doppler does not prove a particular deployment received it. Examples contain names and placeholders only.

## Database and persistence

Use `lib/db/pool.ts` for the lazy shared connection and transaction helpers for coordinated writes. Schema definitions live in `lib/db/schema.ts`; deploy schema changes through SQL migrations. Applied state is recorded in `wdc_schema_migrations`.

```powershell
npm run db:migrate
```

The CLI affects the database selected by its environment. Establish the target first. Production migrations are owner-managed through Settings › System › Database schema. A committed SQL file is not evidence that it ran.

The admin store currently uses module-level mutable collections with `lib/admin/persist.ts` synchronization. Do not assume these collections are an independent durable database or safe shared state across processes. Tests use one worker because concurrent mutations interfere.

## Providers and scheduled work

HTTP handlers live in `app/api/`; business logic belongs in domain modules. Validate browser input, authenticate/authorize sensitive operations and verify webhook signatures. Proxy routing is not a mutation's security boundary. In-memory rate limiting controls abuse per instance; it is not a distributed quota.

Contact, forms and onboarding must persist their result before deferred email. Slow provider authentication must not delay an interactive response. Every outbound message needs durable intent, deduplication and a safe retry. Preferences belong to the person. See [email operations](../docs/email.md).

R2 uploads use scoped signed requests and server validation. Keep static marketing assets in `public/`; reserve R2 for managed uploads. CORS and browser CSP are separate policies, and either can block a correctly signed request. Use configured origins instead of a broad wildcard.

Paystack mode is centralized. Verify provider callbacks and persisted amounts before changing financial/access state. A browser return URL alone does not prove a successful payment.

`vercel.json` schedules `/api/cron/daily` at 03:40 UTC daily. It performs retention, invoice reminders and related maintenance. It cannot accurately schedule an hour-before-meeting reminder. The [Meetings preview](../prototypes/cal-meetings/README.md) uses sample data and does not implement Cal.com bookings.

## Media, caching and offline behaviour

Use `next/image` where measurement justifies it. Remote-image rules, output tracing and image sizing live in `next.config.ts`. Traced fonts, PDF assets and SQL files must remain available in deployed server output.

`public/sw.js` caches eligible public pages and static assets. Connectivity controls coordinate reconnect behaviour. It excludes API and sensitive routes; it cannot submit forms, perform payments or run authenticated operations offline. Verify against a production build using the [offline guide](../docs/offline.md).

## Validation

```powershell
npm run lint
npx tsc --noEmit
npm run build
npx playwright test <spec-name>
```

Start the application separately before browser tests. The default URL is port 3100. Tests use installed Chrome or `WDC_E2E_CHROME`. Read each spec's prerequisites; database/auth tests can create and remove records and must use an appropriate test database. Do not run mutation tests against production.

Use focused behaviour checks, then lint, TypeScript and production build for a release. Visual checks cover light/dark, phone/tablet/desktop, overflow, actual icon centering and useful layout spacing. Run provider/database diagnostic scripts only after understanding their effects.

If development serves stale imported CSS or generated diagnostics, stop the affected dev server, clear only this project's `.next` output and restart. Preserve unrelated processes and generated data.

## Deployment

Vercel deploys `frontend/`. `.github/workflows/deploy.yml` reconciles main with deployment state, prefers native Git delivery and has a guarded API fallback and catch-up scheduling. Quota handling does not guarantee every push immediately goes live. Root Render configuration also targets this directory.

Verify the exact deployed commit, readiness and canonical domain before claiming a live fix. Check migrations separately. A push or successful build is not production evidence. Keep Git rollback and avoid rewriting shared history.

Use [current work](../docs/status.md) for unfinished delivery and verification boundaries. Keep temporary Meetings artifacts until end-to-end implementation is complete; maintained documentation replaces superseded planning material.
