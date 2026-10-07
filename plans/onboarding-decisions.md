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

## Build order (two agents at a time, one commit per piece, pushed as it lands)

1. Foundation (done): one `isVisible`, conditions that combine, `notice` kind, richer option info, the comma wording, tests.
2. Branding (largest): sample cards, colour system, style help, motion card, size first gating, new steps.
3. Web and SEO.
4. Apps and Software.
5. Social, then shared: review screen, studio scope note in the admin, engagement section behind the flag, reminder email, pre-filled link.
6. Services and Works pages.
7. Verify: lint, tsc, build, every spec, full e2e of each form at 320, 390, 768, 1280 in both themes.
