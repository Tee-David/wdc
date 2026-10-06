# Onboarding flow improvements

Status: proposal for owner review, 5 October 2026. Planning only; no product code, schema, uploads, account settings or provider configuration changed for this proposal.

This plan covers the shared onboarding journey and optional client account setup. The companion [service experience plan](onboarding-service-experience-plan.md) owns service-specific wording, helpful visual cues and examples for the six briefs. Colour roles and picker details below are recommendations for review, not final brand decisions.

## Intended experience

A client recognises the service, answers a short brief, sees truthful saving feedback and can return safely. Questions use ordinary words. Colours are a preference to discuss, never a claim that WDC has approved a final identity. Account setup happens after secure invitation activation, remains optional and never holds up access to the portal.

Preserve WDC's actual components, typography, colour tokens, public black/white button pair, 44px targets, responsive spacing and existing three form styles. No new form product or unrelated redesign.

## What the current code actually does

| Area | Current source and behaviour | Consequence for this change |
|---|---|---|
| Questions | `frontend/lib/onboarding.ts`; six service slugs, four persisted steps, shared closing fields | Change the inventory and shared renderer once. Preserve service-specific visibility and all three styles: steps, conversation and board. |
| Service choice | `frontend/components/onboarding/onboarding-form.tsx`; six large illustrated cards, a separate Start button, estimate/facts/reassurance | Simplify the first screen without creating a second service list or losing the closed-service explanation. |
| Colours | Shared `brand_colours` text field; shown when the client has no brand guide or is unsure | Existing drafts and submissions contain free text. New structured editing must not silently reinterpret or discard it. |
| Repeater precedent | `frontend/components/onboarding/domain-field.tsx`; bounded rows stored as newline-separated text | Reuse the interaction approach, not its domain checking. The colour field needs no registry or network requests. |
| Project updates | `PROJECT_UPDATE_PORTAL` currently displays “Your client portal”; defaults select it. `withAnswerDefaults` maps old “Client dashboard” answers | Use one client-facing label and explicit read aliases. Preserve the client's other channel choices and ability to deselect the portal. |
| Drafts | `use-server-draft.ts` saves after 1.2 seconds of inactivity; localStorage is an immediate fallback. Server answers are JSONB strings/string arrays | Do not add a second autosave system. Improve status, request ordering and recovery around the existing one. |
| Start over | Shared native `<dialog>`; handlers clear local answers immediately and fire `forget()` without awaiting it. `forget()` ignores HTTP failures | A reset can currently look successful while server clearing failed or an older save is still in flight. Server DELETE currently clears only this browser cookie; it does not revoke old resume links or archive the draft. The proposed reset below is a deliberate change, not existing functionality. |
| Cursor | `smooth-cursor.tsx` mounts a body overlay with a very high z-index; globals hide the native cursor. Native dialogs occupy the browser top layer | More z-index cannot put a body overlay above a modal. This is a top-layer ownership problem. |
| Activation | `invite/[token]/page.tsx`, `InviteForm`, `invite-redeem.ts`, `invitations.ts`; invitation creates a bound account, then password sign-in or a later magic-link sign-in happens | Profile setup must require the resulting authenticated client session. Possession of an invitation or “account created” alone is insufficient. |
| Theme/photo | Existing `next-themes` provider defaults to dark with system mode disabled; shell already renders `user.image` or initials | Add account preference deliberately. Do not quietly change the global default or persist temporary signed image URLs. |

These are source findings, not a claim that every issue was reproduced in a live browser or that any proposed flow has shipped.

## 1. A compact, recognisable service picker

Use one designed single-choice picker backed by the existing `SERVICES` list. Its trigger says “Choose the service this brief is for”; its expanded panel shows all six choices as compact cards with the current small static service icon, service name and one recognition line from `PICKER_LINE`. Keep the picker closed initially. Its labelled trigger makes selection clear, while the short selected-service description and Next button remain beside/below it. The six compact options appear only when the client opens the picker. This replaces the current wall of cards rather than reproducing it inside a permanently open panel.

- One column at 320–390px; two columns when each option can carry readable copy; three only where the content genuinely fits. No horizontal service carousel.
- Use semantic single-choice behaviour, visible selection and keyboard arrows/Space. A choice selects the service; it does not unexpectedly advance the form. The primary **Next** remains visible below the options and names the next action.
- Closed services retain their plain explanation and cannot be selected for a new brief. A restored valid draft for a closed service can continue under the existing rule.
- Keep the intro to one heading and one short explanation. Replace the three large facts blocks with one quiet line: “About X minutes · Your answers save as you go”, backed by the existing estimate. The privacy/not-sure explanation belongs in brief help, not a second large introductory panel.
- Put the estimate immediately beside/below the selected service. Do not invent a precise estimate before selection; use a clearly approximate range. Keep public button colours and the service icons' established WDC treatment.
- A restored draft gets one concise summary: service, completed step/section and last confirmed save if known, plus **Continue your brief**. **Change service** remains available and preserves answers shared by both briefs through `answersForService`.

“Next” here replaces the welcome screen's separate Start action. It does not remove Next/Back inside the question journey or bypass validation.

## 2. Up to five brand colours, with names a client understands

Reuse the bounded repeater interaction: start with one optional row, **Add a colour** until five, **Remove colour** per row. Each row has a solid preview swatch, editable colour name, editable hex code and an optional “How might we use it?” choice. A small summary shows the name and code together, never colour alone.

Recommended plain-language labels cover all five requested roles: **Main colour (primary)**, **Supporting colour (secondary)**, **Highlight (accent)**, **Text**, and **Neutral / background**, plus **Not decided**. Tips explain them in ordinary words: “The colour used most often”; “A second colour that works beside it”; “Used sparingly to draw attention”; “A colour you imagine using for words—we will check readability”; “A quiet colour behind the content”. Multiple roles are allowed; this is a brief, not a final design rulebook.

Recommended picker interaction: clicking the swatch opens the site's own bounded picker with a practical colour grid and an editable code. Include a draggable shade surface and hue slider as requested, with keyboard-operable equivalents and direct hex input. Keep name/palette selection as the simple default; RGB/HSL editing can sit under an optional advanced disclosure. No pointer-only canvas or required technical notation. Reuse existing colour/contrast helpers where applicable (`lib/contrast.ts`, `lib/color-quantize.ts`); do not add a package or call the public brand-kit upload service just to pick a colour. No browser-native colour dialog as the only way to complete the field.

- Expand valid three-digit hex to six digits and display uppercase; accept only opaque RGB hex for this field. Invalid code retains the typed value and explains the fix beside it. Swatch contrast is measured against its edge; labels sit on their own readable surface, not arbitrary client colours.
- A client may name a colour without knowing its exact code. Show “No exact shade chosen” instead of inventing a swatch or blocking the whole brief.
- Offer “Please recommend colours” using the existing reversible not-sure pattern. Selecting a real colour replaces that deferral; no field becomes permanently disabled.
- Explain once: “These are your preferences. We will confirm the final palette with you.” A role, a contrast reading or a selected swatch must not imply approval or suitability for every use.
- If a guide is uploaded, keep an optional collapsed **Add colour preferences** entry available. Do not exclude these clients from the requested editor, require duplicate work, override their guide or claim the typed preferences supersede it.

### Proposed data contract and backward compatibility

Prefer retaining `brand_colours` as a human-readable newline-separated string, consistent with `DomainField`, rather than introducing nested answer objects throughout the entire form system. A new canonical row can read `Navy (#000065) [Main colour]`; a name-only row remains valid. Define one formatter/parser with an explicit allowed optional-role vocabulary covering primary, secondary, accent, text and neutral, plus round-trip checks. Names cannot contain line breaks, so one row remains one row. Do not build a general-purpose answer codec.

A legacy unparseable sentence is preserved verbatim as a saved note, not guessed into five colours. The UI lets the client keep it or explicitly replace it with up to five editable rows. Legacy submissions remain immutable. More-than-five legacy descriptions are shown intact with an explanation; never `.slice(0, 5)` a saved client's answer. The final storage choice is reviewable; if structured objects are preferred later, first expand every validator/reader/export deliberately rather than slipping objects into the current string-only type.

Touch points: `FieldKind`, `FieldView`, `problemWith`, estimate weights and answer normalization in `lib/onboarding.ts`; `cleanAnswers` and submit validation; review rendering; admin form entry/details; email/PDF/CSV/JSON export formatting. JSONB storage itself does not require a SQL migration for the proposed string representation. Server validation must enforce five rows, bounded names, code format and role values, not just trust the picker.

## 3. Consistent Client portal language across the six briefs

Use **Client portal** consistently as the displayed project-update choice, with a tip such as “Your place to view project progress, shared work and invoices.” Normalize known old labels, including current “Your client portal” and legacy “Client dashboard”, when opening an editable draft. Keep all other channels, their ordering and the Other follow-up answer.

New empty drafts may default to Client portal as now. A saved empty selection must remain empty: a default is not permission to reselect a channel the client removed. Read historical submissions truthfully; display aliases through one presentation helper without rewriting completed records. Audit all six generated onboarding definitions, all three render styles, review, mail and exports. This does not rename unrelated contact/newsletter fields or promise that choosing a channel creates an account automatically.

## 4. Saving, resuming and resetting without surprises

Keep the existing server draft/token flow and immediate local fallback. Use one short status near the navigation: **Saving…**, **Saved**, **Saved on this device; reconnect to sync**, or **Couldn't save online — Try again**. “Saved” means a successful response for the latest answers. Do not toast every 1.2-second autosave; announce meaningful errors/recovery and explicit saves, while the inline status carries routine progress.

Before issuing a cross-device resume link or submitting, await the latest save. Distinguish “email queued” from provider acceptance; the current draft route sets `emailSent=true` before `after()` sends, so the UI must not claim delivery. Persist the outbound intent and dedupe key before scheduling `after()`; a lost worker must leave an honest queued/uncertain row rather than no record. A user-requested resend rotates resume authority safely instead of blindly replaying a token that is no longer retained. Keep copy-link available if mail fails. Tokens stay hashed, bounded, single-use for cross-device redemption, and removed from the address bar after restore. Do not put answers or raw tokens into analytics or logs.

Start over keeps the existing shared in-app confirmation, adds **I understand** because clearing answers cannot be undone, and offers **Keep my answers** as the safe default. On confirmation:

1. Pause autosave scheduling, settle the current save before reset where possible, and stop older responses from reapplying state. Do not assume aborting a browser request cancels a server write.
2. Await the server's reset response and inspect `res.ok`; do not convert a failure into success.
3. In a transaction, archive the current in-progress draft and revoke its resume tokens, then clear this browser binding. Derive the draft from its verified cookie, never a submitted client ID. Preserve answers for the studio's existing retention/audit policy and preserve already-submitted history. This extends the current cookie-only DELETE. If server resetting failed, retain the current answers and offer retry.
4. Clear the corresponding local draft and return focus to the compact service picker only after the successful reset. If local storage itself is unavailable, explain that the server reset succeeded and stale local data will not be used for this new generation.
5. A new brief gets a new draft identity. An old delayed save cannot resurrect the discarded journey or overwrite the new one.

Use a small save generation/ordering guard within `use-server-draft.ts`, not another worker or queue. Document the two-tab ceiling and add a lightweight revision check only if the existing save route cannot prevent stale writes; same-brief multi-device editing must report a conflict instead of silently claiming both copies were saved.

## 5. Start-over dialog cursor, focus and touch

Reuse the top-layer lesson already implemented by `Tip`: it portals help inside the owning dialog. When a fine-pointer custom cursor is active and a native modal opens, its visual must be rendered inside the active top-layer dialog (one position owner, not a second cursor). Restore its normal host when the modal closes. Do not try to solve this with a larger z-index. A native visible pointer is the safe fallback if the custom cursor cannot be mounted correctly.

Test Start over, Save for later, colour picker and nested help together. The cursor never intercepts pointer events. Escape/close returns focus to the trigger; Tab remains inside the modal; keyboard activation of a button does not count as a backdrop click. No custom cursor bundle or pointer-position writer on touch/coarse-pointer or reduced-motion devices. Dialog controls remain visible at safe-area edges and on a phone with the keyboard open.

## 6. Optional profile setup after secure client activation

Proposed route: `/portal/welcome`, or a small equivalent portal first-use screen. Show it once only to a newly activated, linked **client** whose own authenticated session is valid. Owner/staff invitations follow their existing admin destination. A redeemed invite without a completed sign-in shows the existing recovery/login message; it must not grant access to profile APIs or upload storage.

The screen is one short form:

- Existing display name shown, with initials/photo preview.
- Optional **Add a profile photo**, replace/remove and a clear upload status.
- **Appearance**: System, Light, Dark, using the site's own designed choices.
- **Continue** saves chosen changes and goes to the portal. **Skip for now** does not change the name/photo/theme, marks this first-use prompt as dismissed and opens the same portal.

Use the normal portal shell, no new multi-step wizard or recurring compulsory tour. All settings remain editable later under portal Settings. A linked-client failure gets the honest existing not-linked state and an actionable studio contact path, not an empty dashboard. Capture/demo sessions and read-only support views never create/update a profile setup state.

### Persistence and security

A migration will be needed for an account-scoped appearance preference and the one-time setup marker. Allocate the next free migration number after current Users/Meetings migrations; production applies it through Settings › System. Prefer explicit pending/finished timestamps set only when a new client invitation is securely redeemed, so every existing client with a null column is not unexpectedly forced through setup. Continue and Skip are idempotent and role/account checked on the server.

Theme is recipient-owned, not a staff field. Keep next-themes and enable system selection deliberately. Persist only the allowed values `system | light | dark`; follow the system after choosing System, preserve an existing browser/account choice on Skip, and prevent first-paint/hydration flashes. Do not globally switch the site's existing default as part of this flow. Theme controls must not write the viewed client's preference during an owner support view.

For uploaded photos, reuse R2 signing/storage primitives and existing FileDrop patterns, but not the onboarding endpoint's draft authority or permissive 25MB/type policy. Authorize the actual signed-in account, choose its object key server-side, require same-origin, rate-limit the upload action and deny support mode. Proposed ceiling: one JPEG/PNG/WebP/AVIF image up to 2MB and a bounded decoded pixel count, normalized to a small raster avatar with metadata stripped using installed sharp. Exclude SVG, documents, archives and animated inputs. Validate decoded content, not just extension or declared MIME.

Persist an owned object key after confirmed validation/storage, never a temporary signed URL or arbitrary remote URL. Sign/render it server-side when needed; keep initials/current photo if upload fails. Photo upload is optional: Continue/Skip remain available, but a pending file must not be represented as saved. Cancellation/replacement removes abandoned objects through existing bounded cleanup/retention, not a new background system. Server/provider acceptance and deletion outcomes remain truthful; no credentials or invitation tokens appear in filenames, links to public images, logs or fixtures.

## Delivery phases and acceptance

1. **Design review:** show compact service choice, one colour row/five rows/legacy note, resume summary, Start over and optional profile screen in both themes. Update README Design system alongside any new component. Review the service companion together so no jargon or inconsistent help slips between plans.
2. **Shared brief improvements:** implement single shared picker/colour field/wording and status/reset ordering. Add focused normalization, row-boundary and save-order checks. Preserve current question visibility, estimates, not-sure reversibility, submitted history and single-use resume proof.
3. **Account setup:** migrate account preference/setup state; wire invitation-to-authenticated-first-use routing, upload validation, Continue/Skip and later settings. Do not relax sign-in admission, invite identity, breach checks or support restrictions.
4. **Verification and release:** lint, TypeScript, production build and targeted functional/security/responsive checks; apply the approved migration from owner Settings › System; verify the exact deployed commit on the canonical domain. A pushed plan, preview or local build is not a live feature.

Acceptance checks:

- All six services × all three form styles use the same Client portal answer and shared colour behaviour. Back/Change service/Review preserve the correct visible answers.
- At 320, 390, 640, 768, 1024 and 1440px in light/dark, check actual grouping, text, icon centres, 44px targets, keyboard-visible focus and safe-area clearances, not only horizontal overflow. Include long names, five colours, picker/help open, keyboard open and Start-over/Save dialogs.
- Legacy text, valid old rows, unknown colours, blank optional palette, no-exact-shade names, three/six-digit hex, duplicate choices, malformed/oversized/six-row payloads, reversible recommendations and export round-trips are covered by a small runnable data check.
- Simulate offline save, rejected save, delayed older response, failed reset, double confirm, reset during upload/autosave, two tabs, expired/used/withdrawn resume link and successful reconnect. No false Saved/email-delivered message and no discarded answer resurrected.
- Profile setup cannot run from an anonymous/replayed/expired/cancelled invitation, another account's identity, owner/staff role or read-only support view. Existing clients are not forced into setup. Continue/Skip are repeat-safe and settings remain reachable.
- Reject wrong owner key, fake MIME, oversized/decompression-bomb image, SVG/animation and expired signing authority. Failed photo uploads retain the prior avatar; no raw tokens or personal contents enter logs/test screenshots.
- Cursor is visible over the real native dialog on a fine pointer; native cursor/focus work under reduced motion; touch performs no cursor work. No hover-only instruction or focus trap escapes.
- Keep `/onboarding`, activation and authenticated setup noindex; preserve resume-token cleanup, real loading/error states and source-of-truth boundaries.

## Deliberate limits

No logo extraction, palette approval engine, extra brand questionnaire, staff-authored client theme, new scheduling/invite platform or general-purpose onboarding framework. Add those only for a concrete later requirement. Optional profile setup is separate from completing a project brief: neither creates authority for the other.
