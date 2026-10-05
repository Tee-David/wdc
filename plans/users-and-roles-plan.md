# Users and roles: WDC proposal

5 October 2026. Planning artifact for owner review, followed by a responsive design artifact before implementation. The supplied references inform table clarity and detail layouts; WDC's components, tokens and styling remain authoritative.

## Outcome and navigation

Give the owner one understandable place to invite people, manage access, resolve sign-in problems and see what changed. A dedicated **Users** page lives at `/admin/settings/users`, accessible from Settings. It does not add another primary sidebar destination. Existing `/admin/settings/team` and `/admin/settings/access` links redirect to it after the new page is complete.

Start with **Team**, **Invitations** and **Clients** tabs. Team is the studio's access list; Clients connects to existing client records and portal access. Do not turn a client account into staff through an inline role toggle. Keep client records, accounts and invitations distinct entities and show useful links between them.

## Audit of today's implementation

The source already contains a Team and Roles page, contrary to the experience of being unable to find these controls:

| Existing foundation | Source and limit |
| --- | --- |
| Team UI | `frontend/app/admin/(lists)/settings/team/page.tsx`: inline invitation form, accounts table, pending invitations and role explanation |
| Invitations | `lib/admin/invite-actions.ts`, `lib/invitations.ts`: owner-authorized staff/owner invites, client invites, cancellation, hashed tokens, expiry and transactional redemption |
| Team actions | `lib/admin/team-actions.ts`, `lib/team.ts`: rename, owner/staff role changes, deactivate/reactivate, revoke sessions; transactional last-owner protection |
| Permissions | `lib/admin/permissions.ts`: owner has all areas; staff has clients, projects, forms and content |
| Password recovery | `lib/auth.ts`: reset links with session revocation; `lib/account/password-actions.ts`: self-service password change with emailed confirmation |
| Own-account management | `lib/admin/account-actions.ts`: name, other sessions and Google unlink protection |

These findings are source evidence, not proof that the deployed owner session can use every action. First reproduce the discoverability/availability problem on the actual authenticated page and distinguish hidden navigation, missing configuration, permissions and runtime error.

Important gaps to address:

- Invitation actions currently return “sent” before deferred email delivery is proven. Model queued, provider-accepted, failed and delivered separately; show delivery evidence rather than optimism.
- The existing last-sign-in value derives from remaining session rows. Revoked sessions can erase that history. Persist a real successful-sign-in timestamp or show “latest retained session” until available; never invent a last-login figure.
- `invite-redeem.ts` narrows its outward role result to client/staff even though invitation persistence supports owner. Audit every caller and prove owner invitation routing remains correct.
- Staff invite account lookup catches failure as no account. In the new flow, database uncertainty must fail closed with a retry message.
- Current permission rules are fixed, not editable custom groups. Impersonation and two-factor UI are not configured merely because the screenshots contain them.

## Page design

Use the real AdminShell, Panel, `ad__t` table, solid status pills, form kit, designed pickers, confirmation dialog and toast. The page head says **Users**, explains its purpose in one sentence, and places **Invite user** in the right action slot. Less frequent chores belong in the existing ⋮ menu.

Use a compact search field and Role/Status filters. Table columns: Person (name and email), Role, Status, Last sign-in, Actions. Invitations instead show Person, Requested role, Invitation state, Expiry, Delivery and Actions. Pagination and filters are server-side and bounded; changes preserve the current search context. Counts come from persisted records rather than placeholder KPIs.

Each person opens a detail view with **Account**, **Access** and **Activity**. Account shows verified identity and configured sign-in methods, not secrets. Access explains the effective permissions in plain language. Activity records who changed what and when. Session information is limited to what is actually captured; do not show device/location guesses as facts.

Use one row menu for Edit details, Change role, Send password reset, Manage sessions and Deactivate. The menu lists only actions supported for that person, with an adjacent explanation for meaningful restrictions. Activation is explicit. Removing access does not erase historical authorship or financial records.

### Responsive behaviour

At 320–420px, search and filters stack with comfortable spacing. Tables stay tables inside their own horizontal scrolling container, with the Person column pinned and enough width for readable names. No conversion into cards. Phone dialogs use the available viewport with safe-area clearance, a bounded content region and visible actions. Desktop detail views use the shared panel/dialog geometry; long content never widens the page.

Check 320, 390, 640, 768, 1024 and 1440px in both themes. Assess spacing, grouping, overlap, scroll regions, readable labels and icon centering, not only overflow. Use 44px targets, visible focus, keyboard menus, proper dialog focus return and reduced motion. No unrelated photos, gradients, permission dashboards or decorative statistics from the references.

## Invitation journey

1. Owner enters a name and work email, then chooses Staff by default or Owner explicitly. Show the resulting access before submission. No admin-assigned password.
2. Validate identity, email policy and existing account status on the server. Existing-account cases offer the relevant account view instead of a dead invitation.
3. Persist the invitation and durable delivery intent together. Respond **Invitation queued**, then expose actual delivery state with refresh/retry. The recipient gets a one-time, expiring link.
4. Accepting establishes the intended account role transactionally. Prove password and configured Google paths, expired/cancelled/used links, duplicate submissions and existing-account recovery. Google admission remains owner/staff-only unless separately changed.
5. Resend rotates the token and invalidates the prior unredeemed link in the same transaction. Never retain a raw token solely for convenient resend. Apply action-specific throttling and dedupe clicks.
6. Cancel invalidates the link immediately, records the actor and leaves a visible cancelled history. Acceptance-versus-cancellation and resend-versus-acceptance races must have one authoritative result.

Show expired and failed invitations as recoverable states with a clear next action. Bulk invitations can follow only after the single-person lifecycle works; a bulk result must identify per-recipient outcomes.

## Roles without unnecessary complexity

Keep the enforced roles **Owner**, **Staff**, **Client**. “Admin” describes access to the admin workspace; it is not currently a fourth persisted role. Owner manages users, settings and finance. Staff retains the existing daily-work permissions. Client sees their own portal resources.

The first release provides a readable permission table derived from the same policy used by server guards and navigation. Avoid a wall of meaningless switches. If adjustable staff permissions are approved later, introduce named, bounded capability grants for the existing areas; distinguish viewing from writing and make dependencies explicit. Owners alone assign grants, and no grant can bypass ownership, exports, payment or account-security rules.

A separately named Administrator role would require a deliberate migration and changes to schema constraints, guards, sessions, navigation, invitation redemption and Google admission. Do not casually add one to satisfy a dropdown label. Ownership changes require fresh authentication, clear impact and existing last-active-owner protections, enforced inside a transaction.

## Account changes and recovery

- **Edit:** name changes retain old attribution in history. Email changes require a verified new address and explicit handling of portal linkage, active sessions and Google identity; do not silently rewrite identity joins.
- **Reset password:** send a secure recovery link through the existing auth flow; the owner cannot see or select the user's password. Show queued/failed/accepted evidence. Password validation and breach checks stay fail-closed. Reset completion revokes sessions as the current auth configuration intends.
- **Sessions:** list only legitimate persisted session details and allow owner-authorized revocation. Never expose raw session tokens in the browser. Access/role changes invalidate stale permission sessions and cached authority.
- **Deactivate:** confirm the access effect, revoke sessions transactionally and block every sign-in method. Reactivation restores access explicitly. Protect self-lockout and the last active owner under concurrency.
- **Delete:** prefer deactivation. If account deletion is approved, follow Move to Trash then owner-only permanent deletion with “I understand”, retention/legal obligations and preservation of authored records. Never cascade-delete business history to clear a users row.

## Impersonation: scoped support access

Support **View as client** after the rest of account management is sound. Default to read-only, owner-only, recent-authenticated, reason-required access lasting at most 15 minutes. No owner/staff impersonation and no chained impersonation. Show a persistent **Viewing as …** banner with **Exit** on every supported page. Record the real actor and target separately; never attribute support actions to the client.

Block payments, password/email/security changes, provider linking, exports, destructive actions, sending messages and all mutations during the read-only session. Hiding buttons is insufficient: enforce these restrictions at every server entry point and audit GET handlers for side effects. Expiry, revocation, actor deactivation or target deactivation ends access. Exiting returns to the original owner context only while it remains valid; otherwise require sign-in again. Test multiple tabs, refresh, expired original sessions and browser navigation.

Better Auth documents an Admin plugin for session revocation and impersonation, but it is not enabled in this app. Its default role model and unrestricted impersonation are not WDC's policy. Validate the installed package's APIs and schema requirements, with a focused compatibility proof, before deciding whether to use its plugin or an application-scoped support session. No external dashboard service is required by this proposal. [Official Admin documentation](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/admin.mdx), [session management](https://better-auth.com/docs/concepts/session-management).

## Notifications, audit and simplicity

Every action gives immediate truthful feedback. Pending delivery reads **Queued**, failed delivery explains retry, and persisted account changes read **Updated**. Preserve unsaved form data on failure; no spinner that traps the person and no optimistic authority change.

Relevant account-security changes and invitation outcomes have auditable events. Notify the affected person when access, identity or recovery changes according to the service-notice policy; configurable optional alerts belong to recipients. Persist delivery intent before provider work, dedupe retries and avoid duplicate owner/recipient messages. No automatic “undo” for a security action that cannot safely be reversed.

Use existing audit and message-log interfaces. Add durable security events only where current audit persistence cannot preserve actor ID, target ID, event, timestamp and outcome. Exclude passwords, tokens and unnecessary personal details from logs.

## Data and implementation boundaries

Reuse existing users, accounts, sessions, invitations and team guards. Propose migrations only for verified gaps: persisted sign-in history, invitation delivery relationships, permission revisions if needed, and support-session metadata. Do not create a parallel users database or a new queue service without a measured requirement.

All actions require real-session authorization, origin checks, validated IDs, bounded payloads, action-specific throttling and fresh authentication for sensitive changes. Database errors fail closed. Transactions settle duplicate/racing invitations, final-owner changes and revocation. Persist intent before slow third-party work and invalidate relevant page/session caches after writes.

## Delivery sequence and acceptance

1. Finish this source audit and approve scope. Produce the WDC-native responsive design artifact for Team, Invitations, client details, invite/edit flows, failure/empty states and support banner. Do not present it as production functionality.
2. Implement discoverable Users routing and core invitation/account actions using existing modules. Preserve old links. Add accurate delivery and sign-in states, with minimal migrations applied by the owner through Settings › System.
3. Verify authorization and lifecycle tests with a dedicated test database and approved recipients. Then implement the scoped support view after its guard coverage is proven.
4. Ship named changes and migrations with rollback notes; verify the exact deployed commit and authenticated journeys before removing the plan.

Required tests: owner/staff/client/anonymous access to pages and direct actions; tampered roles and IDs; same-address concurrent invites; resend/accept/cancel races; token expiry/reuse; delivery failure and retry; account-lookup failure; Google invitation redemption; breach-check outage; password-reset session revocation; simultaneous final-owner changes; deactivation through every sign-in method; stale cached roles; impersonation start/exit/expiry/multi-tab and blocked writes; long-content table scrolling; light/dark responsive geometry and keyboard focus. Reuse `team.spec.ts`, `auth-flow.spec.ts`, `google-admission.spec.ts` and account tests where appropriate, adding coverage for the gaps.

Success means the owner can find a person, invite or recover their access, understand the outcome, and safely resolve a failure without leaving this workflow. It does not require custom role builders, licensing columns, location hierarchies or multiple table/board modes.
