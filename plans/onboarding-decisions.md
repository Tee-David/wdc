# Onboarding redesign: decisions (7 October 2026)

The owner said: use Flow 1 (Size first) for every service, and "do the best for all decisions". These are the calls made on the owner's behalf, so each can be reversed by changing one thing. Source of every question and condition: the six artifacts in plan section 14.1, kept as data in `plans/onboarding-artifact-specs/` (`branding.js`, `web.js`, `seo.js`, `data_apps.js`, `data_software.js`, `data_social.js`, shared `engine.js`). Build only the Size first flow (tier 1 questions always, tier 2 at Medium and Large, tier 3 at Large only). The Outcome first and Choose your depth flows are not built.

| # | Decision | Reverse by |
|---|---|---|
| 1 | Flow 1, Size first, for all six services. | Add a second layout later. Questions already carry a tier. |
| 2 | Stored "not sure" wording is the comma form. The semicolon form still reads as not sure (`UNSURE_LEGACY`). | One constant in `lib/onboarding.ts`. |
| 3 | The review screen promises no number of days. It says a person from the studio replies with a quote and a start date. One constant, `QUOTE_PROMISE`, holds the sentence so the owner can add a time later. | That constant. |
| 4 | Branding takes `fixed_dates`, `inspiration` and `assets` from the shared closing step. Other services keep them in the closing step. | `notFor` on those fields. |
| 5 | One approver. The closing step asks "Who signs work off" once. Social asks only how fast posts are approved, not who. | Add `social_approver`. |
| 6 | O2: ticks sit beside a signed agreement and do not replace it. | Plan section 8 wording. |
| 7 | Engagement sections stay behind the flag `ONBOARDING_ENGAGEMENT` until a Nigerian lawyer approves. Liability limit and dispute steps stay placeholders. | Flip the flag after legal review. |
| 8 | "A bit of both" in style help also asks "Would you like to see a few directions". | `showIf` on that question. |
| 9 | Motion: the owner's zip was downloaded once the network opened (113 MB, 7 clips). `frontend/scripts/make-motion-loops.sh` cuts seven muted 4 second loops plus posters into `public/work/motion/` (about 600 KB in total). Loops are used on the Branding motion card and the Works page. The studio's own services animation is left out because its scene names a city. Client scenes that show place names are kept (the no city names rule is about our copy). | Re-run the script with other start times. |
| 10 | Web: Maintenance leaves the default form. On the Services page the step becomes "After launch" and "Ongoing maintenance" leaves the deliverables. | `lib/services.ts`. |
| 11 | SEO: the public page may say work starts at three months. | `lib/services.ts`. |
| 12 | Software: the AI data rules question shows for AI assistants, automations and data pipelines. An early notice says very heavy software is out of scope. | `showIf`. |
| 13 | Apps: "who uses it" splits into where people use it, and who uses it and what each may do. Uploads keep the current limit of 8 files of 25 MB. | `dropzone.tsx`. |
| 14 | Free colour picker is built in plain code, no HeroUI. The 100 or so lines it needs avoid a new dependency and a second set of theme tokens. HeroUI stays allowed if the owner wants it later. | Swap the component. |
| 15 | Colour storage line: `Name | #HEX | Role | like N | first`. Old three part lines still read. | `lib/brand-colours.ts`. |
| 16 | Old answers map on read: `page_count` en dash ranges, `platforms` "iOS" and "Android", `tools_access`, `brand_colours`, the semicolon "not sure". Nothing is migrated. | n/a |
| 17 | Stationery and Apparel cards are added to Branding. | `deliverables` options. |
| 18 | Services and Works copy in `plans/services-and-works-copy-proposal.md` is approved as written, with decisions 10 and 11. | Edit the copy. |
| 19 | Pitch deck sample uses Realtors' Practice slides with no prices or contact details: `public/work/deck/`. | Remove the files. |
| 20 | Drive samples: not downloaded. The 147 images already in `public/brand-work/` cover every card. | Download later through the Drive API. |

## Decisions from the UX research (7 October 2026)

The owner asked for deep research into form and onboarding UX, a simpler colour flow, and adjustments to every form. Report: [onboarding-ux-research.md](onboarding-ux-research.md). The owner said to decide, so every recommendation in it is adopted unless listed under "Not adopted". Step files in `frontend/lib/onboarding-services/` were rewritten to match. The old artifact data in `onboarding-artifact-specs/` is superseded by those files.

| # | Decision | Where |
|---|---|---|
| 21 | Colour flow replaced. Six feeling cards with ready palettes, then "Yes, use these" (two taps). Also: read colours from a logo or picture, type codes, describe in words, or "Choose for me". Optional deeper path: eleven named colour chips and a code field. Removed: colour families, shade slider, Like it to Love it slider, first choice control, role dropdown, free picker, HeroUI. Stored in the existing `Name \| #HEX \| Role` lines with the lead colour as `Main colour (primary)`, plus `brand_vibe`, `brand_colour_source`, `brand_colours_words`. Decisions 14 and 15 are superseded. | research D, `kind: "colours"` |
| 22 | Shared screens trimmed. About you is two screens: contact in four fields, then business in three taps. Address, long company description and the brand colour text box are cut or moved. Age and "what makes you the one" open at medium and large only. Finishing up is three screens: timing and who decides, what you already have, last things. Decision 3 reversed. | `CORE_STEPS`, `CLOSING_STEPS` |
| 23 | Deadline and any fixed date are asked once, on the shared closing screen, for every service. | `CLOSING_STEPS` |
| 24 | A later pick can raise the tier. `showIf` takes `{ any: [...] }` and `{ tier: 2 \| 3 }`. Ticking Brand guidelines on a small job still reaches the colour screen. | `lib/onboarding-shared.ts` |
| 25 | A screen with no visible questions is skipped. | `onboarding-form.tsx` |
| 26 | Required questions at most ten at any size. Branding four, Web four, SEO four, Apps three, Software two, Social four, plus approver and update channel. | step files |
| 27 | Typing became tapping wherever possible: pain chips (Software), tool chips, who uses it (Apps), booking kinds (Web), tools you have (SEO, one question), account route (Social, four answers in one). | step files |
| 28 | Cut: Web contact methods and the search optimisation sell (now a notice), SEO business kind below large, Apps offline parts text, Software "walk us through the work" and "seen something you liked", Branding layouts and recurring kind, Social handle per platform and four end boxes (now one). | step files |
| 29 | Apps feature list is about thirty items with eight popular shown first and the rest behind See all. Still searchable. | `FEATURE_GROUPS` |
| 30 | Branding cards show one picture each. The Motion design card uses a real loop from the owner's clips, not a "clip pending" tile. | `DELIVERABLE_INFO` |
| 31 | Engagement section on the last screen is four grouped ticks, not thirteen, each with a short summary and Read in full. Still behind the flag until the lawyer approves. | plan 8 changed |
| 32 | Review screen and reminders: the review screen is the Send screen. It says what happens next and carries no number of days. Reminders: at most two per unfinished form, each switchable off. | plan 6.5 |
| 33 | WhatsApp: the resume link is also sent by WhatsApp, a Talk to a person button saves the form and flags it, and a WhatsApp button carries the form reference. A trust line says we never ask for passwords, PINs, OTP codes, BVN or card numbers. | form chrome |

| 34 | Control rule (owner, 7 October 2026, from the screenshots of the question lists): a single choice with three or more plain options is a DROPDOWN (the site's own select, a bottom sheet on phones). A two option choice and Yes or No are one compact line, not tall tiles. Listed out cards are for checkboxes and multi select, and for the few single choices that need a picture or a sentence (the size question, style route, packages, kind of software help). The big "Required" pill is gone: the existing asterisk and "(optional)" are enough. Trade off noted: a dropdown costs one extra tap over a card, accepted for a calmer screen. | `onboarding-form.tsx` FieldView |

**Not adopted, or deferred.** Pre-filling name, phone, email and business from the payment record: not verified that the record holds them, so the first screen stays four short fields. Voice notes recorded inside the form: offered through WhatsApp instead. Real timing calibration: needs real clients, so the time estimates stay formula based and a task records timings after launch.

## Build order (two agents at a time, one commit per piece, pushed as it lands)

1. Foundation (done): one `isVisible`, conditions that combine, `notice` kind, richer option info, the comma wording, tests.
2. Branding (largest): sample cards, colour system, style help, motion card, size first gating, new steps.
3. Web and SEO.
4. Apps and Software.
5. Social, then shared: review screen, studio scope note in the admin, engagement section behind the flag, reminder email, pre-filled link.
6. Services and Works pages.
7. Verify: lint, tsc, build, every spec, full e2e of each form at 320, 390, 768, 1280 in both themes.
