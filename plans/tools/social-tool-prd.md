# WDC tools: the social tool, Rank Indeed and the tools contract

Product requirements document. Draft for the owner (Tee-David). Written 26 Oct 2026.

Status: proposal. Nothing in this document is built. No code was changed in any repository to write it.

Owner's decision (26 Oct 2026): run Postiz unmodified behind WDC. Everything a client or a staff member sees is WDC: WDC's name, logo, screens and emails. The name "Postiz" appears only in the licence notices the AGPL requires. The owner does not mind the licence saying so; clients must not see it as the product.

Writing standard: this document follows ASD-STE100 Simplified Technical English rules where practical. It is not a certified STE document.

---

## 1. Summary and recommendation

### The short answer

1. **Keep the social tool in its own repository and its own deployment.** Your instinct is correct, but for a stronger reason than "heavy backends". Postiz is AGPL-3.0. If Postiz code goes into the WDC repository, WDC itself can become AGPL work. A network boundary (an API between two separate programs) keeps WDC's code yours. Postiz also needs long-running workers (Temporal, Redis), and Vercel cannot run them.
2. **Do not make "everything a separate app" a rule.** Separate a tool only when it has (a) its own heavy runtime, (b) a licence boundary, or (c) its own paying customers. The social tool meets (a) and (b). Rank Indeed meets all three. A small website tool meets none, so build it inside WDC if you ever build it.
3. **WDC stays the source of truth for clients, projects, content, approvals and the client portal.** The social tool is the publishing engine: it holds the connected social accounts, runs the schedule and posts. It reports results back to WDC. Your Client Engagement Policy already promises that "nothing is posted until you approve it" (`frontend/lib/legal.ts`, social tab). WDC already records approval of an exact version (`frontend/lib/workspace/service-model.ts`, kind `post`). Postiz has no approval step at all. So the approval must stay in WDC.
4. **Start headless.** In the first release, staff do not sign in to Postiz at all. WDC drives the stock Postiz image through its public API. One Postiz organisation per WDC client gives clean per-client separation. This needs no fork, no rebrand and no single sign-on, and it tests the real risk first: getting your own developer apps approved by Meta, TikTok, LinkedIn and X.
5. **Fork later, and keep the fork thin.** Fork only when staff need the Postiz screens (calendar, previews, analytics). The fork adds: "Sign in with WDC", automatic access from WDC, an approval guard, signed webhooks and your brand. Change nothing else, so upstream security fixes merge easily.
6. **One sign-in: WDC is the identity provider.** Better Auth can act as an OpenID Connect provider through the `@better-auth/oauth-provider` plugin. Single sign-on alone does not remove access. WDC must also push access changes to each tool, because a Postiz session cookie lasts one year.
7. **Rank Indeed: the studio is one customer of the public product.** Do not run a second internal copy. Give the studio a free Agency workspace on the live service. Connect it to WDC through the same tools contract.
8. **Do not plan to sell the social tool yet.** Postiz Cloud sells the same features, and the AGPL makes you give your source to every paying customer. Decide after six months of internal use, when you know what WDC adds that Postiz does not.

### What you must decide (the five most important)

| # | Decision | My recommendation |
|---|---|---|
| D1 | Is WDC the only place where content is approved? | Yes. The tool never approves. |
| D2 | Who owns the developer apps on Meta, TikTok, LinkedIn, X and Google? | WDC Solutions, as a verified business, with two named admins. |
| D3 | Who connects a client's social account: the client, or a staff member's personal account? | The client's own admin, or a studio-owned Business Manager partner. Never a staff member's personal login. |
| D4 | Headless first release (no staff sign-in to Postiz) or a fork from day one? | Headless first. |
| D5 | Is the social tool a product for sale, now or later? | Not now. Review after six months of internal use. |

The full list of open questions with recommended answers is in section 14.

### Cost and effort at a glance (estimates)

| Item | Estimate |
|---|---|
| Hosting the social tool (one container host, Postgres, Redis, self-hosted Temporal) | About USD 30 to 120 a month (see section 9). |
| Phase 1, headless release | About 3 to 5 weeks of focused build in WDC, plus 2 to 8 weeks of platform review that runs in parallel. |
| Phase 2, thin fork with sign-in and approval guard | About 4 to 6 weeks. |
| Ongoing fork upkeep | About half a day a week to merge upstream releases and test. |

These are planning estimates, not quotes. They assume one experienced developer working with an assistant.

---

## 2. Background and scope

### 2.1 What WDC is today

WDC is a Next.js app on Vercel. Its server work runs inside the same app (`backend/README.md`). The database is CockroachDB, which speaks the Postgres protocol (`backend/README.md`). Sign-in uses Better Auth 1.7.4 (`frontend/package.json`, `frontend/lib/auth.ts`).

There are three roles: `owner`, `staff` and `client` (`frontend/lib/roles.ts`). Staff see a narrower admin (`frontend/lib/admin/permissions.ts`). A staff member's records are computed from department membership and project membership (`frontend/lib/admin/staff-scope.ts`, tables `department_members` and `workspace_project_members`).

Departments are in `frontend/db/migrations/0040_departments.sql`. A staff member can be in several departments. A client record lists its departments (`Client.departments` in `frontend/lib/admin/types.ts`).

Social work already exists in WDC:

- A social project holds "Content calendar post" records. The states are `draft`, `internal_review`, `client_review`, `approved`, `scheduled`, `published` and `failed`. The fields include platform, caption, asset, planned time, time zone, published link, actual publication time and evidence (`frontend/lib/workspace/service-model.ts`, line 8).
- WDC refuses `scheduled` or `published` without approval of that exact version. It refuses `published` without a live link and an actual time (`checkState` in the same file, lines 40 to 45).
- Versions, decisions, notes and activity are stored per item (`frontend/db/migrations/0050_service_workspace.sql`).
- The calendar view reads these records (`frontend/lib/admin/content-calendar.ts`).
- Clients review shared versions in the portal (`frontend/lib/portal/`).

WDC can approve and plan. It cannot publish. That is the gap the social tool fills.

### 2.2 What the owner asked for

A family of tools for staff, chosen by role or department: a social media tool based on Postiz, Rank Indeed for SEO (also sold as its own SaaS), and possibly a website tool. Staff open tools from their dashboard. Admin configures access.

### 2.3 Out of scope

Paid advertising tools, a website tool design, and any legal opinion. Legal points are flagged for a lawyer in section 10.

---

## 3. Evidence: what Postiz is

All facts below come from the shallow clone at `/home/user/gitroomhq/postiz-app`, version `v1.47.0` (`version.txt`). The clone has one commit, `a5affe6 fix: jwt bypass`, so I could not read the history behind it.

### 3.1 Stack

| Part | Technology | Evidence |
|---|---|---|
| Frontend | Next.js (React) | `apps/frontend/package.json` (`next dev`, `next build`) |
| API | NestJS | `apps/backend/` |
| Background jobs | Temporal worker (NestJS) | `apps/orchestrator/src/workflows/` |
| Database | PostgreSQL through Prisma 6.5 | `libraries/nestjs-libraries/src/database/prisma/schema.prisma`, root `package.json` |
| Queue and cache | Redis | `docker-compose.yaml`, `REDIS_URL` |
| Media storage | Local disk or Cloudflare R2 | `.env.example` (`STORAGE_PROVIDER`) |
| AI | OpenAI, Mastra, LangChain, CopilotKit | root `package.json`, `mastra_*` tables in the schema |
| Email | Resend | `.env.example` |
| Billing | Stripe (optional) | `.env.example`, `Subscription` model |

Note: Postiz's own `CLAUDE.md` says the frontend is "Vite ReactJS". The package file says Next.js. The guidance file is out of date.

### 3.2 Infrastructure it needs

The official `docker-compose.yaml` runs these services:

- `postiz`: one container with the frontend, the API and the worker, behind nginx on port 5000 (`Dockerfile.dev`, `var/docker/nginx.conf`, started with `pm2`).
- `postiz-postgres` (Postgres 17) and `postiz-redis` (Redis 7.2).
- A Temporal stack: `temporal` (1.28.1), `temporal-postgresql`, `temporal-elasticsearch`, `temporal-admin-tools` and `temporal-ui`.

So a production install needs about six long-running processes. None of them can run on Vercel's serverless functions.

### 3.3 Organisations, users and roles

- `Organization` is the tenant (the separated customer space). `UserOrganization` joins a user to an organisation with a role: `SUPERADMIN`, `ADMIN` or `USER`, and a `disabled` flag (`schema.prisma`, enum `Role`).
- A user can belong to several organisations and switch between them (the `showorg` cookie, `apps/frontend/src/components/layout/layout.context.tsx`).
- `Customer` groups social channels inside one organisation (`schema.prisma`, model `Customer`). It does not limit which users see which channels. Every member of an organisation sees all of its channels.

**Consequence:** to stop a staff member seeing another client's channels, each client must be its own Postiz organisation.

### 3.4 Approvals and clients

- A post has four states: `QUEUE`, `PUBLISHED`, `ERROR` and `DRAFT` (enum `State`). There is no approval state.
- There is a public preview at `/public/posts/:id` with anonymous comments (`apps/backend/src/api/routes/public.controller.ts`). Anyone with the link can read and comment. It is a review aid, not an approval record.
- `APPROVED_SUBMIT_FOR_ORDER` belongs to Postiz's marketplace feature, not to client approval.

### 3.5 Sign-in and external identity

- Built-in sign-in: email and password, GitHub, Google, Apple, Farcaster, wallet, and one generic OAuth provider (enum `Provider`).
- The generic provider is set by environment values `POSTIZ_GENERIC_OAUTH`, `POSTIZ_OAUTH_AUTH_URL`, `POSTIZ_OAUTH_TOKEN_URL`, `POSTIZ_OAUTH_USERINFO_URL`, `POSTIZ_OAUTH_CLIENT_ID` and `POSTIZ_OAUTH_CLIENT_SECRET` (`.env.example`). The code asks for `openid profile email` and reads only `sub` and `email` from the userinfo endpoint (`apps/backend/src/services/auth/providers/oauth.provider.ts`).
- **A first sign-in through the generic provider creates a new organisation for that user** (`loginOrRegisterProvider` calls `createOrgAndUser` in `apps/backend/src/services/auth/auth.service.ts`).
- **The generic provider ignores `DISABLE_REGISTRATION`** (`canRegister` returns true for `Provider.GENERIC`, same file). So anyone the identity provider lets through gets a Postiz account.
- There is no SCIM (the standard for pushing user changes) and no group or role mapping from the identity provider.

### 3.6 Sessions and revocation

- The session token is a JWT signed with `JWT_SECRET` and **no expiry** (`signJWT` in `libraries/helpers/src/auth/auth.service.ts`). The cookie lasts 365 days (`apps/backend/src/api/routes/auth.controller.ts`, around lines 77 to 86).
- On every request, the auth middleware reloads the user and the user's organisations from the database. It refuses a user who is not activated or who has no active membership (`apps/backend/src/services/auth/auth.middleware.ts`). So removing a membership takes effect on the next request. That is good. But nothing in Postiz removes the membership when WDC removes a person. WDC must do it.

### 3.7 Public API, SDK and webhooks

- Public API under `/public/v1`, authenticated by an organisation API key or an OAuth token that starts with `pos_` (`apps/backend/src/public-api/routes/v1/public.integrations.controller.ts`, `apps/backend/src/services/auth/public.auth.middleware.ts`).
- Useful endpoints: create, list and delete posts; delete a post group; upload media; list integrations (connected channels); **get a channel-connect URL** (`GET /social/:integration`); delete an integration; analytics per channel and per post; notifications; set post status.
- A rate limit applies (`API_LIMIT=30`, described as an hourly limit in `.env.example`). Check whether that limit is per organisation before you design bulk scheduling.
- A key from an organisation owned by a super admin can act on any other organisation with the `x-postiz-org` header (`public.auth.middleware.ts`). This is convenient for WDC and dangerous if the key leaks.
- The Node SDK is `@postiz/node`, licensed AGPL-3.0 (`apps/sdk/package.json`). There is also an MCP server, an n8n node and a Make.com app (`README.md`).
- **Webhooks fire only after a successful publish** (`sendWebhooks` in `apps/orchestrator/src/activities/post.activity.ts`, around lines 509 to 549). The body is the post as JSON. There is **no signature, no retry and no failure event**. A failure is logged and ignored.
- The integration list returns `disabled` but not `refreshNeeded` (`public.integrations.controller.ts`, `listIntegration`). So the stock API cannot tell WDC that a channel needs to be reconnected. A debug endpoint, `/public/v1/debug/channels`, may show more. I did not check it.

### 3.8 Social platforms

The `libraries/nestjs-libraries/src/integrations/social/` folder holds about 36 provider files. They include Instagram (through Facebook, and standalone), Facebook, LinkedIn (personal and page), X, TikTok (personal and business), YouTube, Threads, Pinterest, Google Business Profile (`gmb.provider.ts`), Bluesky, Mastodon, Reddit, Telegram, Discord, Slack, WordPress, Medium, Dribbble and others.

**There is no WhatsApp provider and no Behance provider.** WDC lists both as networks (`frontend/lib/social.ts`). Tell clients which networks the tool can post to.

Each platform needs its own developer app. The client ID and secret are environment values per install (`.env.example`: `FACEBOOK_APP_ID`, `LINKEDIN_CLIENT_ID`, `TIKTOK_CLIENT_ID`, `X_API_KEY` and so on). So one install uses one developer app per platform for all its organisations.

### 3.9 White label and custom domain

There is no white-label setting. The name "Postiz" appears 509 times in 57 frontend files (measured with `grep` over `apps/frontend/src` and `libraries/react-shared-libraries/src`). The logos are files in `apps/frontend/public/` (`postiz.svg`, `postiz-text.svg`, `postiz-fav.png`, `logo.svg`). A custom domain is just the URL you deploy on (`FRONTEND_URL`, `MAIN_URL`). Rebranding is a fork change.

### 3.10 Security signals worth your attention

| Signal | Evidence | What it means for WDC |
|---|---|---|
| Latest commit is `fix: jwt bypass` | git log, `a5affe6`; comment in `auth.middleware.ts` says "Never trust authorization-relevant claims ... from the token body" | Older versions trusted JWT claims. Always run the latest release. Pin images by digest and update within days of a security fix. |
| Session JWT never expires; cookie lasts one year | `libraries/helpers/src/auth/auth.service.ts`, `auth.controller.ts` | Revocation depends on removing the membership. WDC must push removals. |
| `JWT_SECRET` also derives the encryption key (MD5 based) | `deriveLegacyKeyIv` in `libraries/helpers/src/auth/auth.service.ts` | You cannot rotate `JWT_SECRET` without breaking encrypted values. Treat it as permanent and protect it. |
| Social access tokens appear to be stored as plain text | `Integration.token` and `refreshToken` in `schema.prisma`; no encryption calls in `integration.repository.ts` | Anyone who reads the database can post as every client. Encrypt the disk, restrict database access, encrypt backups. Confirm this in a test install. |
| Without Stripe keys, every permission check passes, including the admin section | `permissions.service.ts`, the early return when `STRIPE_PUBLISHABLE_KEY` is not set; `settings.controller.ts` uses `Sections.ADMIN` for team management | On a self-hosted install, a `USER` member can probably invite and remove team members. Do not give staff Postiz accounts until a fork closes this. Verify in a test install. |
| Webhooks are unsigned | `post.activity.ts` | WDC must not trust a webhook body. Treat it as a hint and read the truth from the API. |
| Generic OAuth bypasses the registration switch | `auth.service.ts`, `canRegister` | If WDC becomes the identity provider, WDC must refuse to issue a Postiz login to anyone who is not entitled, including clients. |
| One key can act on all organisations | `x-postiz-org` in `public.auth.middleware.ts` | Store it encrypted, use it only on the WDC server, rotate it on any suspicion (`POST /user/api-key/rotate` exists in `users.controller.ts`). |
| Upstream refuses AI-generated pull requests | `CONTRIBUTING.md`, section "AI" | Fixes you write with an assistant may not be accepted upstream. That makes a thin fork more important. |

---

## 4. Evidence: what Rank Indeed is

From `/home/user/rankindeed`:

- An SEO and AI-search visibility SaaS, "a subsidiary of WDC Solutions" (`README.md`, `CLAUDE.md`). Plans: Starter USD 29, Growth USD 89, Agency USD 249 a month, 7-day trial (`CLAUDE.md`).
- Built on the MIT-licensed open-seo project (`LICENSE`, `plans/upstream.md`). MIT lets you keep your changes private. This is the opposite of Postiz's AGPL.
- React and TanStack Start on Cloudflare Workers (`README.md`). Database is Cloudflare D1 or CockroachDB through Hyperdrive (`plans/02-hosted-mode-billing-auth.md`, `README.md` "Deploys and data").
- Better Auth 1.6.22 with the `organization` and `admin` plugins (`frontend/package.json`, `frontend/src/lib/auth-config.ts`).
- Billing through Autumn, written but not switched on. Production still runs `AUTH_MODE=cloudflare_access` (`plans/02-hosted-mode-billing-auth.md`, `plans/06-hosting-vercel-vs-cloudflare.md`).
- **It has its own clients, client contacts and client portal** for agencies (`plans/04-agency-clients-portal.md`, tables `clients`, `client_projects`, `client_contacts`).
- A platform admin console with admin and staff roles exists at `/admin` (`plans/01-platform-admin-console.md`).

The overlap that matters: Rank Indeed and WDC both have "clients" and a "client portal". If WDC's SEO clients are also set up as Rank Indeed agency clients with portal access, a client gets two portals and two sets of reports. Section 7.4 resolves this.

---

## 5. Architecture options

### 5.1 Options compared

| | A. Stock Postiz, headless, driven by WDC API | B. Thin fork in its own repo and deployment | C. Rebuild publishing inside WDC | D. Monorepo of all tools |
|---|---|---|---|---|
| What it is | Run the official image. Staff never sign in. WDC calls the public API. | Fork Postiz into `wdc-social`. Add sign-in with WDC, provisioning, approval guard, signed webhooks, brand. | Write your own connectors to each platform in WDC. | Put WDC, the social tool and Rank Indeed in one repository. |
| Licence effect on WDC | None. Separate programs over HTTP. Unmodified, so AGPL section 13 source duties do not start. | None for WDC, if kept separate. The fork must offer its source to its users. | None. | High risk. AGPL code beside WDC code invites a claim that WDC is a derivative work. |
| Runs on Vercel? | No. Needs a container host. | No. | Partly. Scheduled publishing needs a reliable worker; Vercel cron is not enough. | Partly, and the deploys get tangled. |
| Staff use the Postiz screens | No | Yes | Not applicable | Yes |
| Effort to first value | Low (3 to 5 weeks) | Medium (7 to 11 weeks in total) | High (months; every platform is a project) | High |
| Ongoing cost | Low; update the image | Medium; merge upstream | High; platforms change APIs often | High |
| Main risk | Staff miss Postiz's editor and calendar | Fork drift | You become a social API company | A licence and deploy tangle |

### 5.2 Recommendation

**A first, then B.** Option C is the trap. Publishing reliably to many platforms, with token refresh, media rules, retries and API changes, is exactly the hard part that Postiz already solves. Option D gives up the licence wall and puts three different runtimes (Vercel, a container host and Cloudflare Workers) into one repository.

Counterpoints I rejected:

- *"A fork from day one is less work overall."* It is not, if staff do not need the Postiz screens for the first months. WDC already has the calendar and approval screens. A fork you do not need is upkeep you pay every week.
- *"Headless means staff lose Postiz's AI and preview features."* True. That is a reason to move to B later, not a reason to start with B. Phase 1 proves the platform approvals and the sync first.
- *"Use Postiz Cloud instead of self-hosting."* Possible for a pilot. But Postiz Cloud uses Postiz's own developer apps, so the consent screen shows Postiz, not WDC. The client data and tokens sit with a third party. You also lose the option to fork. Use it only to try the product for a week.

### 5.3 Your "everything in a cloud of separate tools" idea

I agree with the direction and disagree with the rule. Each separate app adds a deploy, a database, backups, a sign-in path, security patching and a bill. Use this test before you split anything out:

1. Does it need a runtime that WDC's host cannot give (long-running workers, a different cloud)?
2. Does it carry a licence that must not touch WDC's code?
3. Does it have its own paying customers?

If the answer to all three is no, build it inside WDC. A website tool for staff (checklists, launch checks, uptime checks) answers no to all three today. Note that WDC already models website work (`uat` and `launch` kinds in `service-model.ts`).

---

## 6. Identity and access

### 6.1 One sign-in, with WDC as the identity provider

**Identity provider (IdP):** the system that proves who a person is. **OpenID Connect (OIDC):** the standard way for one app to ask another app "who is this person?". **Single sign-on (SSO):** one sign-in that opens many apps.

Recommended design:

- WDC becomes the IdP using Better Auth's OAuth 2.1 provider plugin, `@better-auth/oauth-provider`, with the `jwt()` plugin. Adding the `openid` scope gives OIDC: a userinfo endpoint, ID tokens and sign-out. Source: the Better Auth docs, [OAuth 2.1 Provider](https://better-auth.com/docs/plugins/oauth-provider). The older `oidcProvider` plugin is marked for deprecation in the v1.6 docs ([OIDC Provider](https://better-auth.com/docs/1.6/plugins/oidc-provider)). The plugin is not installed in WDC today; Better Auth 1.7.4 core does not ship an OIDC provider in `node_modules/better-auth/dist/plugins`. **Confirm that the plugin version matches WDC's Better Auth 1.7.x before you plan the work.**
- Each tool is a registered OAuth client of WDC, with an exact redirect URL.
- **WDC refuses to issue a login for a tool to a person who has no grant for that tool.** This check is in WDC's consent step. It is essential for Postiz, because Postiz creates an account for anyone the IdP lets through (section 3.5). Clients must never get a Postiz login.
- WDC keeps its own sign-in rules for everyone: breached-password refusal, device notices and so on (`frontend/lib/auth.ts`). The tools inherit them for free. That is a strong reason to make WDC the IdP rather than a third party.

How each tool accepts it:

| Tool | How | Change needed |
|---|---|---|
| Postiz, stock | `POSTIZ_GENERIC_OAUTH` and the `POSTIZ_OAUTH_*` values | None for sign-in. But stock behaviour creates a new empty organisation per person and does not join them to client organisations. Not usable for staff without the fork. |
| Postiz, fork | Generic OAuth plus a provisioning endpoint | Stop auto-creating organisations. Join people only to the organisations WDC sends. Hide email and password sign-in. |
| Rank Indeed | Better Auth `genericOAuth` plugin ("Sign in with WDC"), only for the studio workspace | Small. Public customers keep their own sign-in. |

### 6.2 Provisioning: access follows WDC automatically

**Provisioning:** creating, changing and removing a person's access in another system.

SSO decides who can sign in. It does not decide what a person can see, and it does not end a running session. So WDC must also push access changes to each tool.

| Event in WDC | What happens in the tool | Target time |
|---|---|---|
| Staff member added to a department that has the social tool | Account created on first sign-in. Memberships pushed for the clients in their scope. | Under 1 minute |
| Staff member added to or removed from a project | Memberships recomputed from `staffScope()` and pushed | Under 1 minute |
| Client added to or removed from a department | Memberships of every affected staff member recomputed | Under 1 minute |
| Staff member moved to another department | Old client memberships removed, new ones added | Under 1 minute |
| Staff member deactivated or removed (`frontend/db/migrations/0020_user_deactivation.sql`) | Account disabled in every tool. All memberships removed. | Under 1 minute; backstop sweep every 15 minutes |
| Owner revokes a grant | Account disabled in that tool | Under 1 minute |

How it works:

1. WDC writes the intent to a sync table first, with a dedupe key. This follows the repository rule "persist the intent first and make the retry safe to run twice" (`CLAUDE.md`, Systems design).
2. WDC calls the tool's provisioning endpoint behind the response (`after()`), with a signed request.
3. A sweep job compares WDC's view with the tool's view and fixes any difference. This catches missed pushes.

Postiz today: membership removal works through `deleteTeamMember` and `disableOrEnableNonSuperAdminUsers` (`libraries/nestjs-libraries/src/database/prisma/organizations/organization.repository.ts`). The only team routes are on the session API (`apps/backend/src/api/routes/settings.controller.ts`). `/settings/team/add` is super-admin only. There is no public API for team members. In phase 1 this does not matter, because staff have no Postiz accounts. In phase 2 the fork adds a small, signed provisioning endpoint.

### 6.3 Who decides which staff get which tool

Do not build a second permission system. Tool access has two parts:

1. **Entitlement (may this person open the tool?).** Default: the department. For example, everyone in the Social department gets the social tool. The owner can add a person-level grant or a person-level block.
2. **Scope (which clients can they work on inside the tool?).** Always computed from WDC's existing scope, `staffScope()` in `frontend/lib/admin/staff-scope.ts`. The tool never keeps its own list.

The owner always has full access. A tool-level role (for example, Postiz `ADMIN` versus `USER`) is set per grant. Default to the lowest role.

Your assumption "access depends on role or department" is close. Department alone is too coarse. A branding designer may need the social tool for one client. WDC already handles that through project membership. Use the same source.

### 6.4 Admin screens in WDC

These follow the dashboard design system (`CLAUDE.md`, "Dashboard design system"). They are shapes, not designs.

- **Settings › Tools (owner).** One row per tool: name, status (connected, degraded, down), last sync, number of people with access. A tool page shows: default departments (searchable picker, five or more options), person grants and blocks (table with search), the tool's OAuth client details, "Sync now" in the ⋮ menu, and the recent sync and event log. Changes go through the shared save bar. A revoke needs the confirmation sheet.
- **Client page › Social channels.** Connected channels with status (Connected, Needs reconnection, Disconnected). "Send a connect link" to the client contact. "Disconnect channel" (confirmation sheet). The Postiz organisation link for the owner.
- **Launcher.** The admin already has seven primary pages, with Blog as the agreed exception (`CLAUDE.md`, Authenticated product UX). Do not add "Tools" as an eighth. Put the tool launcher in the sidebar's second group beside Support, or in the top bar. **Owner decision.**
- **Staff My Day.** A post that failed or a channel that needs reconnection appears as a deck card for the staff member who owns that client.

---

## 7. Data ownership and sync

### 7.1 Source of truth

| Data | Source of truth | Copy elsewhere |
|---|---|---|
| Clients, contacts, departments | WDC | Tool holds a tenant per client, keyed by WDC client id |
| Projects and scope | WDC | None |
| Content calendar posts (caption, asset, planned time, platform) | WDC (`workspace_service_items`, kind `post`) | Postiz holds a scheduled copy of each approved version only |
| Approvals and change requests | WDC (`workspace_service_decisions`) | None. Postiz preview comments are not used. |
| Connected social accounts and their tokens | Social tool | WDC holds the channel id, name, platform and status only. Never the token. |
| Publishing result (live link, actual time, error) | Social tool reports it | WDC records it as evidence on the post, which `checkState` already requires |
| Analytics | Social tool | WDC pulls figures into period reports (kind `report`) |
| Media | WDC (R2) | Uploaded to the social tool at scheduling time |
| SEO data | Rank Indeed | WDC pulls summaries for reports |

### 7.2 The flow for one post

1. A staff member drafts a post in WDC. Internal review, then client review in the portal, as today.
2. The client approves version N. WDC records the decision.
3. WDC writes a "schedule post" intent with the dedupe key `post:<item id>:v<N>`.
4. Behind the response, WDC uploads the media and calls `POST /public/v1/posts` for the client's Postiz organisation and channel, with the planned time in UTC. WDC stores the Postiz post id and group in a link table, and moves the item to `scheduled`.
5. Postiz publishes at the time. Its webhook calls a WDC endpoint.
6. WDC treats the webhook as a hint only, because it is unsigned. WDC reads the post back from the Postiz API. It records the live link (`releaseURL`), the actual time and the evidence, then moves the item to `published`.
7. If no result arrives within a set time after the planned time, the reconcile job reads the post's state. On `ERROR`, WDC records the error and moves the item to `failed`. The owning staff member gets a deck card. The client is not told automatically; a person decides what to say.

### 7.3 Conflicts and failure cases

| Case | Rule |
|---|---|
| Caption changed after approval | A new version. It needs a new approval. On approval, WDC deletes the old Postiz group (`DELETE /public/v1/posts/group/:group`) and creates the new one. |
| Approval withdrawn, or the client asks to stop | WDC deletes the Postiz post. If the delete fails, WDC shows "Not cancelled, check now" and retries. Nobody marks it cancelled until the API confirms. |
| A staff member edits the post inside Postiz (phase 2) | The fork's approval guard refuses changes to any post created by WDC. Posts created in Postiz directly cannot be scheduled without a WDC approval reference. |
| Postiz create call times out | The Postiz create call is not idempotent (I found no idempotency key). Before a retry, WDC lists the channel's posts around the planned time and looks for its own marker. Put the dedupe key in a field that Postiz keeps, for example a tag. **Verify which field survives.** |
| Postiz is down at the planned time | Postiz's hourly sweep looks for posts missed in the last three hours (`apps/orchestrator/src/workflows/missing.post.workflow.ts`). So a post can go out up to about an hour late. For time-sensitive posts (a launch, a live event), that may be wrong. **Owner decision:** publish late, or hold and ask. |
| WDC is down when the webhook arrives | The webhook is lost, because Postiz does not retry. The reconcile job finds the result later. |
| Temporal database lost | Scheduled jobs may be lost. WDC holds every approved, unpublished post, so WDC can re-create them. Test this in the restore drill. |
| Channel token expired | Postiz tries to refresh (`apps/orchestrator/src/workflows/refresh.token.workflow.ts`). If that fails, posts fail. The stock API shows `disabled` but not `refreshNeeded`, so WDC learns late. The fork should send a `channel.needs_reconnect` event. |

### 7.4 Rank Indeed and WDC's SEO clients

- WDC keeps the client relationship, the approvals (kind `article`) and the reports clients see.
- Rank Indeed holds the projects, tracking and audits for each SEO client, inside the studio's workspace. Each Rank Indeed project carries the WDC client id.
- **Do not invite WDC clients to Rank Indeed's portal.** One client, one portal: WDC's. This matches your rule "a recurring client keeps one record and one client portal" (`CLAUDE.md`, standing calls).
- WDC pulls report figures from Rank Indeed, or staff attach the Rank Indeed report to a WDC `report` record.

---

## 8. The client side

### 8.1 Do clients see or approve posts in the tool?

No. Clients review and approve in the WDC portal only. The portal already shows the exact shared version, notes and decision history (`README.md`, design system section on client workspaces). If clients also approve in Postiz's preview, you get two approval records that can disagree. That breaks the promise in your policy.

### 8.2 Who owns the social account connections?

Your policy says: "The accounts belong to you, and you add us through each platform's sharing tools. We never ask for a password. At the end of the work we are removed" (`frontend/lib/legal.ts`, social tab).

In Postiz terms:

- **The client owns the account.** The studio holds an OAuth token, which is permission the client can withdraw. It is not a password. This fits the policy.
- **The studio owns the developer apps.** The consent screen the client sees names your app, for example "WDC Studio".
- **The person who clicks "connect" matters a lot.** The token is tied to that person's platform login. If a staff member connects a client's Facebook Page with their personal Facebook account, the token breaks when that person leaves, loses their Page role or is banned. Every scheduled post for that client then fails. **Recommendation:** the client's own admin connects, using a connect link that WDC sends. Or use Meta Business Manager partner access with a studio-owned business, where the platform supports it.

Connect flow in phase 1:

1. Staff click "Send a connect link" on the client page.
2. WDC calls `GET /public/v1/social/:integration` for that client's Postiz organisation and gets the platform's consent URL (`public.integrations.controller.ts`).
3. The client opens a WDC page that explains what they are allowing, then goes to the platform's own consent screen.
4. The platform returns to Postiz's callback (`/integrations/social-connect/:integration`, which needs no Postiz login, in `apps/backend/src/api/routes/no.auth.integrations.controller.ts`).
5. **Unverified:** where Postiz sends the person after the callback. It may be a Postiz page that asks for a login. A small fork change may be needed to return the client to a WDC "Connected" page. Test this first.

### 8.3 When a client leaves

1. WDC cancels all future posts in Postiz and confirms each delete.
2. WDC keeps its own records of posts and results (it already has them) under the retention rules (`frontend/lib/privacy/retention.ts`).
3. WDC exports the final analytics into a closing report.
4. WDC deletes each channel in Postiz (`DELETE /public/v1/integrations/:id`). This deletes the tokens.
5. WDC asks the client to remove the app's access on each platform. Your policy says the client does this.
6. The Postiz organisation is closed. The stock public API has no endpoint for this. In phase 1 the owner closes it by hand; the fork adds an endpoint.
7. If the client returns, reuse the same WDC client record and the same tenant mapping.

---

## 9. Hosting, cost and upkeep

### 9.1 Where it runs

Vercel runs WDC. It cannot run Postiz's long-running worker, Redis or Temporal. Options:

| Option | Fit | Notes |
|---|---|---|
| One VPS with Docker Compose (for example Hetzner or DigitalOcean) | Best value for one studio | You patch the server. Use the official compose file as the base. |
| Railway | Easy | The repository already has `railway.toml`. Cost is usage-based. |
| Render | Easy | WDC has a `render.yaml`, but it describes only the WDC frontend. |
| Temporal Cloud instead of self-hosted Temporal | Less to run | Official pricing: Essentials from USD 100 a month ([temporal.io/pricing](https://temporal.io/pricing.md)). |

You already run one VM deploy pattern in another project (`realtors-practice` deploys its backend with a systemd timer, per its `CLAUDE.md`). The same pattern fits here.

Do not put Postiz on WDC's CockroachDB. Postiz expects Postgres through Prisma's `postgresql` provider, and the Mastra AI tables use Postgres features. Give it its own Postgres. That also separates backups and blast radius.

### 9.2 Estimated monthly cost

| Item | Estimate (USD a month) |
|---|---|
| VPS, 4 vCPU and 8 GB RAM | 25 to 60 |
| Managed Postgres (optional; else on the VPS) | 0 to 30 |
| Object storage for media (R2; WDC already uses R2) | 0 to 5 |
| Off-site encrypted backups | 1 to 5 |
| Temporal Cloud (only if you do not self-host) | 100 or more |
| X API credits | Pay per post (see section 11) |
| **Total, self-hosted Temporal** | **About 30 to 100** |

These are estimates from typical public prices, not quotes. Elasticsearch in the compose file uses memory; Temporal can probably run with SQL visibility instead. Test that before you size the server.

### 9.3 Keeping current with upstream

- Phase 1 (stock image): pin the image by digest. Read each release note. Update within 7 days of any security fix, and test in a staging copy first.
- Phase 2 (fork): keep every WDC change in a small number of clearly named files or modules. Do not reformat upstream files. Merge upstream every two weeks. Keep a list of fork changes in the fork's README.
- Watch the Postiz security advisories. `SECURITY.md` says only the latest release is supported.
- Upstream rule from Postiz's own `CLAUDE.md`: published Temporal workflow files must never change; a change needs a new versioned workflow. Respect that in the fork, or upgrades will break running posts.

---

## 10. Licence: AGPL-3.0, trademark and the CLA

**This is not legal advice.** It is a summary to help you brief a lawyer.

### 10.1 What the AGPL means here

Postiz is licensed AGPL-3.0 (`LICENSE`; copyright notice "Copyright (C) 2025 Nevo David").

- **Running it unmodified, for your own use:** allowed. Section 13's duty to offer source applies "if you modify the Program" (`LICENSE`, section 13).
- **Modifying it (the fork):** you must offer the complete source of your modified version, at no charge, to **all users who interact with it over a network**. Staff are users. A client who opens a page served by the tool is a user. The simple, safe practice: keep the fork in a public repository and put a "Source code" link in the tool's footer.
- **Selling it as a hosted service:** allowed. You cannot add restrictions beyond the AGPL. Each paying customer can get your source and run it themselves. A competitor can do the same.
- **WDC's own code:** WDC talks to the tool over HTTP, as a separate program. That keeps WDC outside the AGPL. Do not copy Postiz code into WDC. Do not import the `@postiz/node` SDK into WDC, because it is also AGPL (`apps/sdk/package.json`). Write a small REST client in WDC instead.
- **Notices:** keep the copyright and licence notices in the fork. Add a line in the legal notices such as "Based on Postiz, licensed under AGPL-3.0".

### 10.2 Trademark

The AGPL gives no rights to names or logos (`LICENSE`, section 7(e) allows a licensor to decline trademark rights). I did not find a published Postiz trademark policy (a web search on 26 Oct 2026 returned none). Assume the name "Postiz" and its logo are protected. A product you offer to others must use your own name and logo. Do not use "Postiz" in your product name, domain or advertising. Saying "based on Postiz" in the legal notices is usually fine. Ask the lawyer.

### 10.3 The CLA files

`ICLA.md` (individuals) and `CCLA.md` (companies) are Fiduciary License Agreements. They matter **only if you contribute code back to Postiz.** By signing, you give Gitroom an exclusive, perpetual licence to your contribution, and Gitroom gives you a non-exclusive licence back. Gitroom promises to keep a free and open-source version available. The agreement uses German law.

For you, this means: you do not need to sign anything to fork or use Postiz. If you upstream a fix to cut your fork's upkeep, Gitroom gets broad rights to that fix. Small generic fixes are usually worth it. Also remember that upstream refuses mainly AI-generated pull requests (`CONTRIBUTING.md`).

### 10.4 Questions for a Nigerian lawyer (and an open-source specialist)

1. Do staff and clients using the modified tool count as "users interacting remotely" under AGPL section 13, and is a public repository link enough to comply?
2. Does WDC calling the tool's API keep WDC outside the AGPL?
3. Is "based on Postiz" in legal notices acceptable, and is any Postiz trademark registered in Nigeria or elsewhere?
4. Under the Nigeria Data Protection Act 2023, what must the studio do when client data and social tokens sit on a server outside Nigeria (cross-border transfer)? Does the studio need to register with the Nigeria Data Protection Commission?
5. Is Rank Indeed a separate legal entity from the studio? If so, does the studio need a data processing agreement with it?
6. What should the Client Engagement Policy say about the tool, the developer apps and the tokens the studio holds?

---

## 11. Platform API realities

These rules come from the platforms, not from Postiz. Check each platform's current documentation before you commit dates to clients.

| Platform | What you need | Notes |
|---|---|---|
| Meta (Facebook Pages, Instagram, Threads) | A Meta developer app, business verification, App Review for publishing permissions | Instagram API publishing needs a professional (business or creator) account. Review can take weeks. |
| LinkedIn | A LinkedIn developer app; posting to company pages needs approval for the Community Management API | Personal and page posting are separate products. |
| X | A developer account with paid credits | New developers are on pay per use since 6 Feb 2026. Sources disagree on the price; one lists USD 0.015 a post and USD 0.20 a post with a link ([postproxy.dev](https://www.postproxy.dev/blog/x-api-pricing-2026/), [opentweet.io](https://opentweet.io/x-api-pricing)). The X console is the authority. |
| TikTok | A TikTok developer app and an audit for the Content Posting API | Before the audit, posts are limited to private viewing ([TikTok for Developers](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)). Plan for public posting only after the audit passes. |
| YouTube, Google Business Profile | A Google Cloud project with OAuth consent verification | Sensitive scopes need Google's verification. |

What this means for WDC:

- **Who owns the apps:** WDC Solutions, as a verified business. Use a shared studio account with two named admins and hardware-key two-factor sign-in, not a staff member's personal account. If the only admin leaves, you can lose the app.
- **One app serves every client.** A platform ban or a rate-limit hit on the app affects all clients at once. Keep content within platform rules. Do not share these apps with a future public product (section 12).
- **Token lifetimes differ.** Some platforms expire access every few weeks or months and need a refresh or a new consent. Plan a monthly "channels that need attention" check.
- **Costs per client.** X charges per post. Decide whether X costs pass through to the client's invoice.
- **Media rules differ** (sizes, formats, video length). Postiz validates posts before scheduling (`validatePosts` in the create-post route). WDC should surface those errors at approval time, not at publish time.

---

## 12. Internal tool and product for sale

### 12.1 Rank Indeed (already a product)

- **Tenancy:** the studio is one Agency-plan workspace on the public Rank Indeed service, with a free internal plan. Do not run a separate internal copy. One copy means one set of fixes, and you feel what customers feel.
- **Data isolation:** Rank Indeed already separates workspaces with Better Auth organisations (`plans/01-platform-admin-console.md`). The studio's client data stays inside the studio's workspace.
- **Billing:** Autumn, in US dollars, for public customers. The studio workspace is not billed. WDC's own client billing (naira, Paystack and Flutterwave) does not change.
- **Brand:** Rank Indeed keeps its brand. Staff open it from WDC's launcher.
- **Staff accounts:** Rank Indeed's plan says staff use their own `@rankindeed.com` accounts for its admin console and do not mix staff roles with customer workspaces (`plans/01-platform-admin-console.md`). WDC staff who do SEO work are customer-side members of the studio workspace. They are not Rank Indeed platform staff. Keep the two apart.

### 12.2 The social tool (maybe later)

If you decide to sell it:

- **Run a separate instance for public customers.** Do not mix them with the studio's clients. Reasons: different developer apps (so a public customer cannot get your apps banned), different data (your clients' tokens are not on a server that strangers sign up to), and separate releases.
- **Billing:** Postiz has Stripe and RevenueCat billing built in (`.env.example`). You would need to decide on currency and payment provider.
- **Brand:** your own name and logo, never Postiz's.
- **Source:** published, as the AGPL requires.
- **Support:** a public product needs support hours, a status page and terms. That is a business, not a feature.

**My challenge:** Postiz Cloud sells the same product, and it does "not gate features" (`README.md`). Your differentiation would have to be the WDC parts: client approvals, the client portal, local payment methods, local platforms. Those live in WDC, not in the social tool. Selling the tool alone sells the part that is not yours. Revisit after six months.

---

## 13. The tools contract

Every tool plugs into WDC the same way. A new tool is a new row in Settings › Tools, not a new integration project.

| # | Part | Rule |
|---|---|---|
| 1 | Identity | The tool accepts "Sign in with WDC" (OIDC). WDC issues logins only to people with a grant. |
| 2 | Provisioning | The tool exposes three signed, idempotent endpoints: upsert a person, set a person's tenants and role, disable a person. WDC is the only caller. |
| 3 | Tenancy | One tool tenant per WDC client, keyed by the WDC client id. A studio tenant for the studio's own accounts. |
| 4 | Launch | WDC opens `https://<tool>/launch?client=<WDC client id>`. The tool signs the person in silently and opens that client. |
| 5 | Events back | The tool sends signed webhooks (HMAC SHA-256 over a timestamp and the body, with a unique event id). A small fixed set: `item.scheduled`, `item.published`, `item.failed`, `channel.needs_reconnect`, `report.ready`, `tenant.closed`. Delivery is at least once. WDC dedupes by event id and reads the truth from the tool's API. |
| 6 | Health | `GET /health` returns ready or not. WDC shows the status and stops scheduling when a tool is down. |
| 7 | Export and delete | Per tenant: export everything, and delete everything. Needed for client exit and for data protection requests. |
| 8 | Audit | Every action carries the WDC user id of the actor, even when WDC calls the API on someone's behalf. |
| 9 | Notifications | The tool does not email people directly. It sends events, and WDC notifies according to each person's preferences (`frontend/lib/workspace/notifications-preferences.ts`). |
| 10 | Secrets | Tool API keys live encrypted in WDC's database, with the same pattern as mail connections (`frontend/db/migrations/0044_mail_connections.sql`, `MAIL_SECRETS_KEY` in `docs/status.md`). |

How each tool fits:

| Part | Social tool, phase 1 (stock) | Social tool, phase 2 (fork) | Rank Indeed | Future website tool |
|---|---|---|---|---|
| Identity | Not needed (no staff sign-in) | Fork | `genericOAuth` | Built into WDC |
| Provisioning | Not needed | Fork | New endpoint | Not needed |
| Tenancy | Postiz organisation per client | Same | Project per client inside the studio workspace | Not needed |
| Events | Unsigned webhook plus polling | Signed webhook | New | Not needed |

### Proposed WDC tables (one migration, applied from Settings › System)

- `tools`: id, name, base URL, status, OAuth client id.
- `tool_grants`: tool, subject type (department or person), subject id, role, effect (grant or block), granted by, created, revoked.
- `tool_accounts`: tool, WDC user id, external user id, state, last synced.
- `tool_tenants`: tool, WDC client id, external tenant id, encrypted API key, created, closed.
- `tool_links`: WDC item id and version, tool, external id (for example the Postiz post group).
- `tool_events`: event id (unique), tool, type, received, processed, outcome.
- `tool_sync_outbox`: dedupe key (unique), intent, attempts, last error, settled.

---

## 14. Phased plan

### Phase 0: decisions and accounts (1 to 2 weeks, owner-led)

- **Owner decides:** D1 to D5 in section 1.
- **Owner provides:** a verified WDC Solutions business on Meta; developer accounts on LinkedIn, TikTok, X and Google; a domain for the tool (for example `social.<studio domain>`); a hosting account.
- **Start the platform reviews now.** They take the longest and do not depend on code.

### Phase 1: headless publishing (smallest useful release, 3 to 5 weeks of build)

Scope:

1. Deploy the stock Postiz image on a container host. Registration off. Email (Resend) off. AI features off unless you decide otherwise.
2. One Postiz organisation per social client, created by the owner by hand, recorded in `tool_tenants`.
3. Client page › Social channels: send a connect link, show connected channels.
4. Approved posts are scheduled through the API; results come back by webhook plus a reconcile job.
5. Failed posts and lost channels become deck cards.
6. A reconcile job runs every 15 minutes. WDC's daily cron (`app/api/cron/daily/route.ts`) is too slow; use GitHub Actions or a Vercel cron at a shorter interval. **Check the Vercel plan limits.**

Not in scope: staff sign-in to Postiz, analytics in reports, the studio's own accounts.

Exit test: a real client post goes from draft to client approval to published, and the live link and time appear in WDC without anyone typing them. A deliberately broken post shows as failed within 15 minutes.

**Owner provides:** one pilot client who agrees to connect their accounts.

### Phase 2: thin fork and staff sign-in (4 to 6 weeks)

1. Fork into its own repository, public, with a source link in the footer.
2. WDC becomes the OIDC provider. "Sign in with WDC" only, for granted staff.
3. Provisioning endpoint. No more auto-created organisations.
4. Approval guard: posts from WDC are read-only in the tool. Direct scheduling needs a WDC approval reference.
5. Signed webhooks with the event set from section 13, including failures and `channel.needs_reconnect`.
6. Fix the permission gap when Stripe is off.
7. Rebrand: name, logo, colours to the WDC tokens where cheap.
8. Settings › Tools screens in WDC.

**Owner decides:** the tool's name, and the launcher placement.

### Phase 3: Rank Indeed joins the contract (2 to 3 weeks, after Rank Indeed's hosted mode ships)

1. "Sign in with WDC" for the studio workspace.
2. Rank Indeed projects carry the WDC client id.
3. Report figures flow into WDC `report` records.

**Depends on:** Rank Indeed switching to `AUTH_MODE=hosted` (`plans/02-hosted-mode-billing-auth.md`).

### Postponed

- Selling the social tool (review after six months of phase 1 and 2 use).
- The website tool (build inside WDC if needed).
- Analytics dashboards in the client portal beyond period reports.
- Social inbox (comments and messages); your policy says replies are the client's unless the scope says otherwise.

---

## 15. Risks and edge cases

| # | Case | What happens | What to do |
|---|---|---|---|
| 1 | Staff member leaves | Their Postiz session cookie lasts a year | WDC disables the account and removes memberships on deactivation. Sweep every 15 minutes. |
| 2 | Staff member connected a client channel with a personal platform login, then leaves | Token dies; all that client's posts fail | Client admins connect. Show "connected by" on each channel. Warn when it is a staff member. |
| 3 | Staff member in two departments | Union of both scopes | Already how `staffScope()` works. |
| 4 | Client in two departments | Staff of both departments see it | Expected. Show it on the client page. |
| 5 | Client churns | Future posts must stop; tokens must go | Section 8.3. |
| 6 | Client returns | Risk of a second record | Reuse the WDC client and the tenant mapping. |
| 7 | Tool down | Posts not scheduled or late | WDC shows status, queues intents, retries. Owner decides late versus hold. |
| 8 | WDC down | Webhooks lost | Reconcile job. |
| 9 | Postiz API key leaks | Attacker can post for that client, or for all clients with the super-admin key | Keys encrypted in WDC, server-only, rotate on suspicion, one key per tenant where possible. |
| 10 | Database leak of the tool | Plain-text social tokens | Encrypted disk and backups, private network, no public database port. Consider encrypting tokens in the fork. |
| 11 | `JWT_SECRET` leak | Anyone can forge sessions | Treat as a root secret. Rotation breaks encrypted values, so plan a migration before you ever need it. |
| 12 | Approvals done twice | Client approves in WDC and comments in a Postiz preview | Never send Postiz preview links. Hide them in the fork. |
| 13 | Post edited after approval | Wrong content goes out | New version, new approval; fork guard in phase 2. |
| 14 | Posting errors | Silent in stock Postiz webhooks | Reconcile job in phase 1; failure events in phase 2. |
| 15 | Time zones | Client abroad, studio in West Africa Time, daylight saving shifts | WDC already stores `timeZone` per post. Send UTC to Postiz. Show the time in both the client's zone and studio time. |
| 16 | Duplicate posts after a retry | Postiz create is not idempotent | Marker field and look-up before retry. |
| 17 | Notification overload | Postiz emails success and failure per user (`sendSuccessEmails`, `sendFailureEmails` on `User`) | Turn Postiz email off. WDC notifies according to personal preferences. |
| 18 | Audit trail | Postiz sees "API" as the creator (`CreationMethod`) | WDC records the actor in its audit log (`frontend/db/migrations/0021_audit_log.sql`). |
| 19 | Data export | Client asks for their data | WDC export covers posts and decisions. Note that `lib/privacy/requests.ts` already skips projects and workspace items (`docs/status.md`, line 21); fix that first. |
| 20 | Backups | Two databases now | Back up Postiz Postgres daily, encrypted, off-site. Include it in the restore drill. WDC's own backups are not yet proven (`docs/status.md`, Backups). |
| 21 | Data protection (NDPA 2023) | Client data on a server outside Nigeria; AI features may send captions to OpenAI | Lawyer questions in 10.4. List the tool and its hosts as processors in the privacy policy (`frontend/lib/legal.ts`). Keep AI off until decided. |
| 22 | Platform bans the developer app | All clients lose publishing at once | Follow platform rules. Separate apps for any future public product. |
| 23 | Platform API change | A provider breaks | Upstream usually fixes it fast. Update often. |
| 24 | Networks the tool cannot post to | WhatsApp and Behance | Tell clients. Keep those as manual posts with evidence in WDC. |
| 25 | Clients get a tool login by accident | Generic OAuth creates accounts | WDC's IdP refuses clients for the social tool client. Test it. |
| 26 | A `USER` member manages the Postiz team | Permission checks pass without Stripe | No staff accounts until the fork fixes it. |
| 27 | Rate limits | Postiz `API_LIMIT` and platform limits | Space out bulk scheduling. Measure the real limit. |
| 28 | Media too large or the wrong format | Fails at publish | Validate at approval time. |
| 29 | Upstream licence change | Gitroom could release future versions under other terms | The current AGPL version stays usable. The CLA promises a free version. Keep your fork able to stand alone. |
| 30 | Owner is the only admin of the developer apps and the server | Single point of failure | Two named admins. Credentials in a password manager. A written runbook. |
| 31 | Staff working across time zones, or late at night | Wrong "studio time" assumptions | Keep times in UTC in storage; show local times. |
| 32 | Studio's own social accounts | Mixed with client data | A separate "WDC Studio" tenant. |

---

## 16. Open questions for the owner

1. **Is WDC the only place where content is approved?** Recommended: yes.
2. **Who owns the developer apps?** Recommended: WDC Solutions, verified, two named admins.
3. **Who connects client accounts?** Recommended: the client's own admin through a WDC connect link.
4. **Headless first release, or a fork from the start?** Recommended: headless first.
5. **Sell the social tool?** Recommended: not now; review in six months.
6. **Where does the tool launcher sit, given the seven-page limit?** Recommended: the sidebar's second group, beside Support.
7. **When Postiz was down and a post is late, publish late or hold?** Recommended: hold and ask if more than 30 minutes late; publish if less.
8. **Do X posting costs pass through to the client?** Recommended: yes, as a line on the invoice.
9. **Are Postiz's AI features on?** Recommended: off until the privacy policy and lawyer review cover them.
10. **Where is the tool hosted?** Recommended: one VPS in a region with good latency to West Africa, with self-hosted Temporal; revisit Temporal Cloud if upkeep hurts.
11. **The tool's name?** Recommended: decide in phase 2; nothing public needs it in phase 1.
12. **Is Rank Indeed a separate legal entity?** Recommended: confirm with the lawyer; it decides whether a data processing agreement is needed.
13. **Which departments get the social tool by default?** Recommended: the Social department only, plus person grants.
14. **Should staff see analytics in WDC or in the tool?** Recommended: summary figures in WDC reports; detail in the tool from phase 2.

---

## 17. Facts I could not confirm

- The exact behaviour after Postiz's channel-connect callback (where the client lands).
- Whether a `USER` member can manage the team on a self-hosted install without Stripe. The code suggests yes; it needs a test.
- Whether social tokens are encrypted anywhere I did not see. The repository shows no encryption.
- Which Postiz post field survives as a marker for idempotent retries.
- What `/public/v1/debug/channels` returns.
- Whether the Postiz public API limit is per organisation.
- Whether `@better-auth/oauth-provider` supports WDC's Better Auth 1.7.4.
- Whether a Postiz trademark is registered, and any Postiz trademark policy.
- The history behind the `fix: jwt bypass` commit. The clone is shallow.
- Current platform review times and X prices. Sources disagree; each platform's console is the authority.
- Whether Temporal runs well with SQL visibility instead of Elasticsearch for this workload.

---

## Appendix A. Evidence index

### Postiz (`/home/user/gitroomhq/postiz-app`)

| Topic | File |
|---|---|
| Licence | `LICENSE` (AGPL-3.0, section 13 at line 540) |
| CLAs | `ICLA.md`, `CCLA.md` |
| Contribution rules, AI policy | `CONTRIBUTING.md` |
| Stack and services | `docker-compose.yaml`, `Dockerfile.dev`, `var/docker/nginx.conf`, `package.json` |
| Environment values | `.env.example` |
| Data model | `libraries/nestjs-libraries/src/database/prisma/schema.prisma` |
| Session auth | `apps/backend/src/services/auth/auth.middleware.ts`, `libraries/helpers/src/auth/auth.service.ts`, `apps/backend/src/api/routes/auth.controller.ts` |
| Sign-in and registration | `apps/backend/src/services/auth/auth.service.ts`, `apps/backend/src/services/auth/providers/oauth.provider.ts` |
| Public API auth | `apps/backend/src/services/auth/public.auth.middleware.ts` |
| Public API routes | `apps/backend/src/public-api/routes/v1/public.integrations.controller.ts` |
| Permissions | `apps/backend/src/services/auth/permissions/permissions.service.ts`, `permissions.guard.ts` |
| Team management | `apps/backend/src/api/routes/settings.controller.ts`, `libraries/nestjs-libraries/src/database/prisma/organizations/organization.repository.ts` |
| Public preview and comments | `apps/backend/src/api/routes/public.controller.ts` |
| Webhooks | `apps/orchestrator/src/activities/post.activity.ts`, `libraries/nestjs-libraries/src/database/prisma/webhooks/webhooks.service.ts` |
| Workflows | `apps/orchestrator/src/workflows/` (post, refresh token, missing post) |
| Providers | `libraries/nestjs-libraries/src/integrations/social/` |
| Unauthenticated connect callback | `apps/backend/src/api/routes/no.auth.integrations.controller.ts` |
| SDK | `apps/sdk/package.json` |

### Rank Indeed (`/home/user/rankindeed`)

`README.md`, `CLAUDE.md`, `AGENTS.md`, `LICENSE`, `plans/00-START-HERE.md`, `plans/01-platform-admin-console.md`, `plans/02-hosted-mode-billing-auth.md`, `plans/04-agency-clients-portal.md`, `plans/06-hosting-vercel-vs-cloudflare.md`, `plans/upstream.md`, `frontend/package.json`, `frontend/src/lib/auth.ts`, `frontend/src/lib/auth-config.ts`, `frontend/AGENTS.md`.

### WDC (`/home/user/wdc`)

`CLAUDE.md`, `README.md`, `backend/README.md`, `docs/status.md`, `frontend/package.json`, `frontend/lib/auth.ts`, `frontend/lib/roles.ts`, `frontend/lib/admin/permissions.ts`, `frontend/lib/admin/staff-scope.ts`, `frontend/lib/admin/store.ts`, `frontend/lib/admin/types.ts`, `frontend/lib/admin/content-calendar.ts`, `frontend/lib/workspace/service-model.ts`, `frontend/lib/social.ts`, `frontend/lib/tools.ts` (public free tools, not staff tools), `frontend/lib/legal.ts`, `frontend/lib/outbox.ts`, `frontend/db/migrations/0020_user_deactivation.sql`, `0021_audit_log.sql`, `0025_admin_records.sql`, `0040_departments.sql`, `0044_mail_connections.sql`, `0050_service_workspace.sql`.

### Web sources (checked 26 Oct 2026)

- Better Auth, [OAuth 2.1 Provider](https://better-auth.com/docs/plugins/oauth-provider) and [OIDC Provider (v1.6)](https://better-auth.com/docs/1.6/plugins/oidc-provider).
- TikTok for Developers, [Content Posting API, direct post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post).
- X API pricing summaries: [postproxy.dev](https://www.postproxy.dev/blog/x-api-pricing-2026/), [opentweet.io](https://opentweet.io/x-api-pricing). Third-party; the X developer console is the authority.
- Temporal, [pricing](https://temporal.io/pricing.md).
- Postiz trademark policy: searched, none found.

## Appendix B. Fork change list (phase 2)

Keep this list in the fork's README. Each item should be a small, isolated change.

1. Generic OAuth: do not create an organisation on first sign-in; refuse sign-in without a provisioned account.
2. Provisioning endpoint (signed): upsert user, set memberships and roles, disable user, create and close organisation.
3. Permission fix: enforce `Sections.ADMIN` by role even when Stripe is off.
4. Approval guard: posts carrying a WDC reference are read-only; scheduling without a WDC approval reference is refused for tenants marked "WDC managed".
5. Signed webhooks with retries and the event set in section 13, including failures and reconnect needs.
6. Connect callback returns to a URL that WDC passes.
7. Hide the public preview and comments for WDC-managed tenants.
8. Brand: name, logos, colours, emails off.
9. Source code link in the footer (AGPL).
10. Optional: encrypt social tokens at rest.

## Appendix C. Glossary

| Term | Meaning |
|---|---|
| AGPL-3.0 | A licence that lets you use and change software, but makes you share your changed source with everyone who uses it over a network. |
| CLA | Contributor licence agreement: the terms under which you give code to a project. |
| Headless | Used only through its API, with no one using its screens. |
| IdP | Identity provider: the system that proves who a person is. |
| Idempotent | Safe to run twice; the second run changes nothing. |
| OIDC | OpenID Connect: the standard for one app to ask another who a person is. |
| Provisioning | Creating, changing and removing a person's access in another system. |
| SSO | Single sign-on: one sign-in that opens many apps. |
| Temporal | A system that runs long jobs on a schedule and retries them when they fail. |
| Tenant | One customer's separated space inside a shared system. |
| Webhook | A message one system sends another when something happens. |
