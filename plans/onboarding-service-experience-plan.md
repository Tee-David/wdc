# Service-specific onboarding experience

Planning proposal, 5 October 2026. No onboarding implementation is authorised by this document alone. Read alongside `onboarding-flow-improvements-plan.md`; that companion owns service selection, saving/resuming, restarting and post-invitation setup. This document owns the clarity of the six briefs and their optional visual help.

## What the source already does

- `frontend/lib/onboarding.ts` defines six service slugs: branding, seo, web, apps, software and social. Branding/SEO/Apps/Software each have one service section; Web has goals, content/care and domain/hosting sections; Social has platforms and content sections. Shared business and closing sections surround these. Preserve those distinct inventories rather than replacing them with a generic questionnaire.
- `FieldView` in `components/onboarding/onboarding-form.tsx` renders cards, multi-selection, conditional questions, uploads, and the reversible `UNSURE` answer. `answersForService`, `stepsFor`, `problemWith`, review rendering and server submission validation share the inventory.
- Answers remain a flat JSONB-compatible map of strings/string arrays. `cleanAnswers` bounds the map, each value and the total payload. Existing uploads have separate authorisation, size/type checks and records. A visual enhancement must not bypass them.
- `Tip` is already a press-to-open button with `aria-expanded`, Escape/outside-press dismissal and a dialog-aware portal. It is not hover-only. Its current prop accepts text; rich examples would need a small, deliberate extension rather than a second tooltip implementation.
- `hint` is necessary visible guidance; `tip` is optional background; `scope` is a visible commercial fact. Keep that separation. Do not conceal an extra charge, account-access warning or required prerequisite in optional help.
- `brand_colours` is currently one free-text answer in the shared asset section, conditional on not having a brand guide. This is the correct integration point for the proposed optional, maximum-five colour editor. A saved free-text answer is valid legacy information, not malformed data to delete.
- README's design system, actual onboarding controls, native scrolling and shared scroll reset remain authoritative. The display colour of an example does not change WDC's interface palette or button rules.

## The interaction we are proposing

Ask in familiar language first. Put a short explanation directly below a label only when it is needed to answer. Put a small labelled help button beside a specialised term; pressing it reveals a brief definition and, where useful, one lightweight example. Use compact option cards only for meaningful choices, with a real radio/checkbox and an optional small illustration that helps distinguish the answer.

Keep the current value and field key stable while improving its label. For example, the client may see **Search Console · search performance** while the stored choice remains `Search Console`. A display label must never accidentally change conditional `showIf` comparisons. Additional optional questions must earn their place by changing the work we deliver; the first pass should improve the existing questions before adding more.

Wireframe for one specialised choice:

```text
What are we making?                          [What do these mean?]
[ ] Logo                  Small mark example; one-line definition
[ ] Full identity system  Mark + type + colour shown together
[ ] Brand guidelines      Small rules-page example
...
I’m not sure; please advise me
```

On a phone, this is a single column of compact rows, not a gallery of tall posters. On wider screens two columns may be used where labels and descriptions still fit. Examples are illustrations of a category, never a promise that a pictured item is included in a purchased package.

## Branding & Design

**Existing keys:** `brand_state`, `deliverables`, `surfaces`, `untouchable`, `avoid`, shared `has_brandbook`, `brand_colours`, `inspiration` and uploads.

| Existing topic | Proposed client-facing explanation | Useful visual cue |
|---|---|---|
| Logo | “The mark or wordmark people recognise your business by.” | One simple studio-owned fictional mark, clearly an example. |
| Full identity system | “The logo, colours, type and layout working together across your materials.” | The same mark on a card and a small heading sample. |
| Brand guidelines / brand guide | “A document showing how to use your logo, colours and type consistently.” | A miniature rules page with labelled swatches and logo spacing. This is a document, not an additional logo. |
| Packaging | “The design on boxes, bags, labels or wrappers for your product.” | A small neutral box/label outline, with no fabricated product claim. |
| Signage | “Signs people see at your premises or at an event.” | A flat sign panel. Manufacture/installation is not implied. |
| Social templates | “Reusable post layouts your team can fill with new content.” | Two small layouts using the same fictional example. |
| Pitch deck | “A presentation that explains your business, offer or proposal.” | A small cover plus one contents slide. |
| Embroidery / stamp / vehicle | Explain how small stitching, one-colour stamps or a large vehicle surface constrain a mark. | Three simple surface outlines, not three new questionnaire screens. |

Change specialised question labels such as “Where does the mark have to work?” to “Where will people see or use your logo?” Keep current stored options. Show preservation questions only when something exists today, as the source already does. Add an optional short “What should it feel like?” aid only if useful to the designer; describe choices such as calm/bold/playful in words, allow multiple directions and “please advise”, and never infer a final brand strategy from them.

If a client chooses “I’m not sure what that is” for a brand guide, show the concise definition and an optional **See an example** panel immediately. Keep the choice reversible; reading the explanation does not automatically mark the client as owning a guide.

### Optional colour editor, maximum five

Colour names are enough. A client must not need to know a hex code, choose an accessibility system or invent five colours to continue.

```text
Your brand colours                              Optional
[navy swatch] Name: Navy   Hex: #000065  Role: Main colour [Remove]
[orange]      Name: Orange Hex: #FF6500  Role: Accent      [Remove]
[Add a colour]   2 of 5
[I’m not sure; please advise me]
```

- Start empty. Do not assign WDC's own navy/orange to a client's brand; the wireframe values are examples only.
- Each row has a labelled swatch button opening the site's designed colour panel, a name input and an optional valid hex value. Provide a small useful palette and a custom picker; all are reachable by keyboard, focus and touch. A visual drag surface must have text/keyboard alternatives. No operating-system-only picker is the sole interface.
- “Main colour (primary)”, “Supporting colour (secondary)”, “Highlight (accent)”, “Text”, “Neutral / background” and “Not decided” are optional preference roles. Describe them as where the client imagines using a colour, not a contrast certification. Do not force unique roles or require a main/accent pair.
- Keep name-only entries such as “deep green” valid, with a neutral **Colour not specified** sample. Do not fabricate a hex code from a name. Normalise a valid short hex to its full uppercase value; show invalid hex beside its field, preserving the typed value until corrected or removed.
- A swatch is not the only identifier: repeat its name/hex. Keep UI labels outside arbitrary colour fills. Light/white swatches need a visible edge against their actual surface. Never claim client-selected colours satisfy WCAG merely because the WDC controls do.
- At five rows, **Add a colour** is disabled with “You can add up to five. Remove a colour to add another.” This reason is visible beside the control. Removing affects only the chosen row. `UNSURE` can be replaced by a real colour and never locks editing.
- Proposed compatibility format: keep `brand_colours` a human-readable string, with one canonical line per entry (`Navy (#000065) — main colour`, or `Deep green — not decided`). Reuse the stored string shape and server cleaning limits; bound rows to five on both client and server for newly structured input. Optional role suffixes must round-trip exactly.
- Preserve a legacy paragraph verbatim. Show it as an existing note with **Convert to colour entries** as an explicit action; safely recognised entries may be suggested, but unparsed wording must remain visible and retained. A draft with more than five historical colours needs a manual consolidation step, not silent truncation. Never impose the new five-row rule by deleting an old answer.
- Review, admin entry view, exports and notifications must continue showing the answer as readable text. The client and server must agree on the serialisation and deferral state; cover missing hex, commas/newlines in names, duplicate colours, malformed pasted hex and legacy prose with runnable round-trip checks.

Keep the shared asset step’s existing guide questions. A client with a guide may optionally expand Add colour preferences; entering preferences is never required and does not override the supplied guide. This follows the companion flow plan and keeps colour selection available without duplicating mandatory work.

## Search Engine Optimisation

**Existing keys:** `site_url`, `target_terms`, `geo`, `competitors`, `tools_access`, `content_owner` and conditional writing offer.

- Introduce the service section as “How should customers find you?” The service can still be labelled SEO; immediately explain that it concerns unpaid search visibility. Do not promise a ranking, traffic number or guaranteed date.
- `target_terms`: “What might a customer search for when they need you?” Help example: “A product you sell, a problem you solve, or a service you offer.” Preserve the free response and **please advise**. A tiny fictional search-result illustration explains a phrase; it does not display invented ranking analytics.
- `competitors`: “Which similar businesses show up when you search?” Keep optional. “You can share names or links; you do not need to know who outranks you.” Do not make the client perform a keyword audit before being onboarded.
- `geo`: ask which areas/customers they serve; do not introduce a city-specific studio identity. This is the client's market, not WDC positioning.
- `tools_access`: individual descriptions: Search Console shows search performance; Analytics shows website visits/actions; Business Profile is the listing that can appear on maps/search; CMS admin is where website pages are edited. Icons can cue each category; do not show invented connected status.
- Clearly say: “Choose what you have. We’ll arrange delegated access securely.” Selecting a tool is an answer, not a connected integration or permission grant. Keep the existing **None of these** exclusive choice and do not ask for passwords/API keys.
- Keep content ownership and the separately quoted writing offer visible. No new long glossary or automatic site audit should be added to the critical form path.

## Websites

**Existing sections:** goals/features (`site_new_or_existing`, `site_goal`, `features`, `page_count`); content/care; domain/hosting.

- Existing-site clients see their link and problems; new-site clients do not. This conditional structure is already appropriate.
- `site_goal`: “What should someone be able to do on your website?” Add short prompt examples: buy, book, contact, read or view work. Retain free text and deferral rather than forcing all businesses into one goal.
- Feature explanations: Online store means product browsing and checkout; Bookings means selecting an appointment time; Members area means content/actions behind sign-in; Multi-language means content in more than one language. Small thumbnails should illustrate the action, not propose a finished design or stack choice.
- Page count is approximate. Explain pages with “Home, About and Contact are three pages”; clients uncertain about site structure may ask WDC to recommend it. Do not infer scope from this estimate without a human review.
- Keep content readiness honest and its extra writing/photography scope visible. A thumbnail can distinguish words/photos; it must not encourage uploading every file before the brief can be submitted.
- Explain ongoing care with an optional concise “What is included?” panel while preserving the current follow-up answer and separate quote. Fixing the label is preferable to adding a new maintenance subflow.
- Domain means the web address; hosting means where the website runs. Use an address-to-website diagram with text labels. Preserve `DomainField`, live availability's available/taken/unknown distinction and the secure account-holder prompt. Neither a suggested domain nor an availability result purchases anything.

## Mobile Apps

**Existing keys:** `platforms`, `one_job`, `accounts`, `offline`, `payments`, `store_accounts`, `backend`.

- Platforms: display “iPhone/iPad (iOS)” and “Android phones/tablets” over the existing stored values. Two small device outlines are sufficient; do not invent unsupported desktop platforms.
- `one_job`: keep the strong existing question about the person holding the phone. Example: “Customers book a visit” or “Staff record a delivery.” Examples are placeholders/help, never saved automatically.
- `accounts`: “Who uses the app, and what should each person be allowed to do?” Optional example: “Customers place orders; staff update them.” This is a business question, not a requirement to design permissions.
- Offline help: “What must still work when internet is unavailable?” Explain that saved viewing and new changes that sync later are different. An optional device → waiting → sync diagram helps; selecting Yes must not promise every function operates offline. Keep it a brief answer to review, not a detailed sync questionnaire.
- Payments: distinguish one-off purchases from recurring subscriptions in a help panel. No price, store-fee claim or payment provider is implied. App-store rules are a later implementation check, not something the client must recall.
- Store accounts: “Do you have the Apple/Google accounts used to publish the app?” Say they remain in the client's name and WDC can help; retain visible extra-scope wording. Never collect store passwords.
- `backend`: display “Is there an existing system the app needs to use?” Explain “the system behind the app that stores information or connects services”. Keep the stored values and deferral rather than asking the client to choose server technology.

## Software & AI

**Existing keys:** `process`, `users_count`, `data_home`, `systems`, `compliance`, `success_metric`.

- `process`: “Walk us through the task people do by hand today.” A three-box before-flow (receive → check → record) illustrates how little detail is needed. It is illustrative, not an AI-generated solution suggestion.
- `users_count`: ask a rough team size and who uses it. A count plus role description is enough; do not require formal job titles.
- `data_home`: familiar source cards (spreadsheet, chat, paper, existing system). Keep existing stored choices; real screenshots or private sample spreadsheets are unnecessary during onboarding.
- `systems`: “What other tools must this work with?” Examples can include accounting, payments or an existing customer system. Do not imply integrations are supported just because the client names one.
- `compliance`: “Are there rules about who may see this information or where it can be stored?” Offer examples such as customer/health/financial information, with **please advise**. No legal compliance assurance or broad questionnaire is appropriate here.
- `success_metric`: “How would you know this is helping?” Existing examples (hours saved or orders processed) remain useful. A number is optional; do not force an invented baseline.
- Optional AI aid: a short “Where AI may help” example panel explains summarising, drafting or sorting, alongside “People review important decisions”. Do not add model/vendor selectors, promise autonomous sensitive actions or make AI a mandatory choice for a software project.

## Social Media & Paid Ads

**Existing sections:** selected platforms and their handles; content ownership/access; goals/content/themes/upcoming/media budget.

- Preserve selected-platform-only handle inputs; a client choosing two platforms should still see only their two fields. Familiar platform marks may use existing licensed assets; no API connection badges or claimed follower counts.
- Keep `None yet` exclusive. Selecting it should naturally move into help setting up the client's presence, without treating an empty handle as an error.
- Explain Awareness (“more people recognise you”), Sales (“more purchases”), Bookings (“more appointments”), Community (“more conversation”) and Recruitment (“reach potential hires”). Compact text is more useful than decorative miniature dashboards.
- Content-type help uses simple, reusable examples: one image, several swipeable images, a short clip, an ephemeral update. Keep wording accurate without hardcoding platform durations that can change.
- `themes_yes` and `themes_no` remain free, optional answers. Remind the client they can give examples rather than create a full content strategy.
- `access_ok`: delegated access versus working through the client; neither answer grants permissions. Never ask for login credentials or connect social accounts from the briefing step.
- `ad_spend`: keep “media budget” and the existing always-understood distinction that it is paid to the ad platform, separate from WDC's fee. That fact should be a visible hint, not only optional help. Selecting a band does not charge, create a campaign or guarantee results.
- Optional PPC explanation: “Paid ads are sponsored placements; results also depend on the offer, creative and destination page.” Avoid a second generic marketing survey or a campaign-builder inside onboarding.

## Help and media rules

1. Reuse `Tip` for short text. A definition essential to answering remains visible. For an actual thumbnail/example panel, extend this component with bounded content; keep its existing press, focus, Escape, outside-press and dialog-aware behaviour. Do not substitute browser `title` attributes for help.
2. A click/tap or Enter/Space opens the help. Keyboard focus makes the help control and its purpose visible; focusing must not unexpectedly navigate or erase answers. The panel exposes a labelled close control, remains within viewport/safe area and allows native scrolling for longer notes.
3. Use existing studio assets or tiny reproducible SVG/CSS illustrations. No unlicensed inspiration screenshots, fabricated client work, external image fetches or new image/icon dependency. Visuals load only with the relevant form/help and reserve their size.
4. Every example has a concise caption and meaningful alternative text, or is marked decorative when the nearby text fully explains it. Images never replace labels. Animation is unnecessary here; reduced motion must still show the full meaning if an illustration later moves.
5. Visually selected options must retain actual semantic state. No pastel/translucent status wash, arbitrary new shadows or coloured body-copy fragments; reuse solid WDC fills and the current form geometry.

## Compatibility and implementation order after approval

First improve wording and optional explanations using existing keys/options. Then build only the colour editor and any rich example panel demonstrated to be useful in the reviewed artifact. Avoid a new renderer/schema architecture for a handful of aids.

Retain conditional relationships, visible scope statements, server validation, exclusive “none/unsure” choices, draft serialisation, current upload references, review/export readability and deferral reversibility. Display-label aliases must work for old saved values as well as newly chosen ones. Keep a saved answer if an option becomes hidden; the existing service-switch logic decides which service-specific answers belong in the submitted brief.

No schema migration is expected merely to change help or to serialise colours into the existing string; if implementation discovers a true new persistent structure, propose and ship a migration explicitly. Do not silently change production JSON shapes under a cosmetic update.

## Acceptance before release

- Review an actual artifact for all six services with real current WDC typography, icons, tokens and component geometry. Test at 320, 390, 768, 1024 and 1440px in light/dark; inspect readable labels, grouping, help placement, swatch borders, touch targets and save-bar clearance, not just zero overflow.
- Complete each six-service brief by keyboard and touch, including conditional branches, `Other`, missing assets, `None yet`, deferral → real answer → deferral, and an invalid field retained after server rejection.
- Check tooltip open/close at every viewport edge, in an open dialog, at 200% zoom, while scrolling and with long content. All interactive targets have at least 44px hit areas and visible focus. Test actual text/glyph contrast, including arbitrary client swatches' adjacent controls.
- Exercise zero/one/five colours, sixth rejected with explanation, remove middle/add again, duplicate/name-only/invalid hex, legacy paragraphs and more-than-five legacy entries. Verify client/server round-trip, review, admin submission view, exports and notifications preserve names/hex/optional roles.
- Save and resume a draft containing conditional answers and uploads across refresh/device; explicit Start over must follow the companion plan's safe reset rules. A colour/help edit must not alter progress incorrectly or lose another service's common answers.
- Final submission remains server-validated and auditable. No credentials, artificial sample answers, automatic scope purchase, invented analytics, or interface-only “connected/saved/delivered” claims.
- Run targeted validation/round-trip checks plus lint, TypeScript, build and responsive visual verification for the implemented changes. Source inspection in this proposal is evidence about today's code, not evidence that proposed behaviour has shipped.
