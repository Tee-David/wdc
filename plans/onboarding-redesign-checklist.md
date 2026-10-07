# Onboarding redesign checklist

Plan: [onboarding-redesign-plan.md](onboarding-redesign-plan.md). Update this file with each finished piece. Commit and push to `main` and the working branch as you go.

## Read first (for an agent picking this up)

1. `CLAUDE.md` and `AGENTS.md` in the repo root. Never add AI attribution to a commit or PR.
2. The plan above, sections 2, 3 and 10.
3. `frontend/lib/onboarding.ts`, `components/onboarding/`, `lib/brand-colours.ts`, `tests/onboarding*.spec.ts`, `tests/brief-preferences.spec.ts`.
4. Writing style for owner facing text: short sentences, plain words, no dashes, no semicolons.
5. A schema change ships as a migration. The owner applies it in Settings > System. Say so.

Owner approved the plan and chose Flow 1 (Size first) for every service on 7 October 2026. Decisions: [onboarding-decisions.md](onboarding-decisions.md). Agent brief: [onboarding-build-brief.md](onboarding-build-brief.md).

Legend: [x] done, [ ] to do, [~] in progress, [!] blocked on the owner.

## Phase 0. Understand and agree

- [x] Restate the request in plain English (owner confirmed)
- [x] Audit the current forms in the code
- [x] Research how strong teams run onboarding
- [x] Ask the 30 questions, get answers (6 October 2026)
- [x] Write the plan and this checklist
- [x] Owner approves the plan (6 October 2026)
- [x] Owner allows client films (Litch Consulting, Realtors' Practice) and pitch deck slides, with sensitive parts redacted
- [x] Owner allows the dropdown hardening change to ship
- [x] O1 pre-fill: blank link by default, optional pre-filled link (plan 6.6)
- [ ] [!] O2 signed agreement versus ticked section
- [x] O3 past work: studio chooses from public work (plan 6.7)
- [x] Open and check each sample image (72 chosen, election flyers left out)
- [x] Motion design samples: owner zip received and reviewed (plan 6.7a)
- [x] Motion zip downloaded after the network opened. Pitch deck PDFs received
- [x] Script `frontend/scripts/make-motion-loops.sh` cuts seven muted 4 second loops and posters into `public/work/motion/` (about 600 KB). Studio services clip left out (shows a city name)
- [x] Pitch deck samples: Realtors' Practice PDFs received (plan 6.7)
- [x] O4 owner repos read (plan 6.8)
- [x] O5 Flutterwave and coolors.co confirmed

## Phase 1. Dropdown scroll fix (small, separate commit)

Owner device: Microsoft Edge on iPhone (Apple WebKit engine). Not reproduced in headless Chromium.

- [x] Reproduce on a touch phone viewport with Playwright (not reproduced)
- [x] Ship the hardening in commit 2d3a089 on main: no auto focus of the search box on touch, sheet sized from the visual viewport, list has its own definite max height (WebKit flex shrink guard), dvh with svh fallback
- [x] Three new tests in `tests/onboarding.spec.ts`. Targeted specs: 47 passed, 10 skipped (need a capture token), 0 failed. eslint and tsc exit 0
- [x] Second hardening, 7 October: `.ob__f--sub` animation fill `both` to `backwards` in `onboarding.css` (pushed to the working branch, not yet on main)
- [ ] Production build and targeted specs not run for the second change (no node_modules in the session)
- [ ] Add a spec that `.ob__f--sub` computes `animation-fill-mode: backwards`
- [ ] Production build not run for this change
- [ ] [!] Owner tests on the iPhone in Edge: open the industry list, scroll to the last row without touching search, tap search, repeat with the toolbar collapsed, and try the phone country list
- [ ] If it still fails: owner sends a screenshot with keyboard state and Edge and iOS version. Next step is a page scroll lock through `components/ui/scroll-reset.tsx`
- [ ] Confirm the deployed commit includes 2d3a089

## Phase 2. Six artifacts (three flows each)

Built 7 October 2026 by two Sonnet agents (the first set was lost with the earlier session). Links and results are in plan section 14.

- [x] Branding & Design: https://claude.ai/artifact/HuH9m4pSzSyewNc8WKYAeA
- [x] Web: https://claude.ai/artifact/MriCB9ndK6H7PBryRjWQpV
- [x] SEO: https://claude.ai/artifact/3HCL7uWVikQm8zgpbtYdW6
- [x] Apps: https://claude.ai/artifact/Kpt2Eq4XKkSyViw78SgGHh
- [x] Software & AI: https://claude.ai/artifact/X7ci8wZvcma7vgWPNbduJX
- [x] Social Media Marketing & Paid Ads: https://claude.ai/artifact/5w7yaRsx14gUzZaaA3Tg4Y
- [x] Engagement section sample in each artifact (draft, not legal advice)
- [x] Measured: no overflow at 320 to 1280, no console errors, 44px targets (agents). Copy scan clean (main session)
- [ ] Not checked: real phone, Edge on iPhone, keyboard walk, screen reader, reduced motion, focus ring contrast
- [ ] Fix 14.3: add Stationery and Apparel cards to Branding, reword the time chips, widen the question map text column on phones
- [ ] [!] Owner reviews the artifacts and answers plan 14.4 (23 decisions)
- [ ] [!] Owner picks one flow per service
- [ ] [!] Owner approves the style help copy
- [ ] [!] Owner approves the engagement wording
- [ ] [!] Owner confirms HeroUI ColorPicker scope: free picker only (plan 6.2 item 10)

Agent rule: at most two agents at a time. Sonnet for artifacts and planning. Haiku for execution once the owner approves.

## Phase 3. Legal review

- [ ] Qualified Nigerian lawyer reviews the six engagement sections
- [ ] Decide how acceptance is stored (answers JSON or new columns)
- [ ] If new columns: write the migration and note it for Settings > System

## Phase 4. Shared build

- [ ] Cards that show past work (`next/image`, reduced motion, pause off screen)
- [ ] HeroUI ColorPicker check: dependency added, tokens do not clash, WDC button pair, bottom sheet on phones
- [ ] Colour system: family, shade, auto name, like slider, first choice
- [ ] `brand-colours.ts` format with like level and first choice, old lines still read
- [ ] Update `scripts/check-brand-colours.mjs` and the colour specs
- [ ] Studio side colour sort, shown in the admin as a suggestion
- [ ] Internal scope signals in the admin entry view
- [ ] Review screen ("Here is what we heard") and next steps
- [ ] Optional pre-filled link from the admin (one time token, no personal data in the URL)
- [ ] Abandoned draft reminder email (outbox, dedupe key, can be switched off)
- [ ] README design system section updated for each new component

## Phase 5. Build each service

Do one at a time. Keep stored keys. Map old values on read.

- [ ] Branding & Design
- [ ] SEO
- [ ] Web (remove maintenance from the default path)
- [ ] Apps
- [ ] Software & AI
- [ ] Social Media & Paid Ads
- [ ] Engagement section per service, behind a flag until legal review ends

## Phase 6. Verify

- [ ] Lint, TypeScript, production build
- [ ] Targeted specs updated and passing
- [ ] Each form completed by keyboard and by touch, every condition
- [ ] 320px overflow check, 44px targets, both themes
- [ ] Old drafts and old submissions still open and read in the admin
- [ ] Visual and copy review reported separately from measured checks
- [ ] Deployed commit and canonical domain checked
- [ ] `docs/status.md` updated
- [ ] Retire superseded parts of the three earlier onboarding plans

## Phase 7. Services and Works pages (added 6 October 2026)

Plan section 13. Small updates. Copy needs owner approval first.

- [x] Works data checked 7 October: case studies in `lib/work.ts` and a self creating `case_studies` table (`lib/work-db.ts`), loose artwork in `lib/showcase.ts`. No migration needed for anything in the proposal
- [x] Draft the small additions for each service page: exact copy in [services-and-works-copy-proposal.md](services-and-works-copy-proposal.md)
- [ ] [!] Owner decides on the Maintenance line on the Web page
- [ ] [!] Owner approves the "work starts at three months" line on the SEO page
- [ ] [!] Owner approves the copy for all six service pages
- [ ] Update `lib/services.ts` (check the JSON-LD still reads truthfully)
- [x] Drive folder "We Dig Creativity - Graphic Samples" is readable from this account (7 October). No sharing step needed
- [ ] Pick and download only the samples that earn a place, cut web sized copies
- [ ] Works: add motion loops (studio promo, Litch Consulting film, Realtors' Practice post and story) with posters, lazy loaded
- [ ] Works: add the Realtors' Practice pitch deck (cover and story slides only, redacted)
- [ ] Works: add packaging, apparel and uniform pieces, and real brand guide spreads
- [ ] Works: group Branding by the same deliverable names as the form cards
- [ ] Works: let a case study hold a video loop (small type change)
- [ ] Works: tighten category ledes, keep quotes and metrics honest
- [ ] Responsive and performance check, both themes, video loops measured on a phone
- [ ] Update the services and work tests in the same commit
- [ ] Migration note if the Works data lives in the database

## Phase 8. Build progress (7 October 2026 onward)

Two agents at a time, Haiku executes, the lead verifies, commits and pushes. Only the Size first flow is built.

- [x] Owner picks Flow 1 (Size first) for all six, and approves all decisions (onboarding-decisions.md)
- [x] Engine: one `isVisible`, combined conditions, `notice` kind, richer option info, comma "not sure" (old wording still reads). Pushed
- [x] One steps file per service in `lib/onboarding-services/`, `stepsFor` uses a service's own steps. Pushed
- [x] Stale picker specs fixed, spec helpers added (`tests/onboarding-helpers.ts`). Pushed
- [x] Specs without a browser for the engine (`tests/onboarding-engine.spec.ts`, 5 passing)
- [x] Realtors' Practice deck slides rendered into `public/work/deck` (no prices, no contact details)
- [x] Drive checked: motion zip is 113 MB and the Drive tool caps downloads at 10 MB, so it cannot be fetched here. Owner can upload each clip under 10 MB later
- [!] Round 1: Branding paused 7 October. Owner found the colour flow too complicated. Redesign the colour flow and the question flow of all six forms from the research first
- [x] UX research: forms, question order, Nigeria, colour picking for non-designers. Report: plans/onboarding-ux-research.md
- [x] Apply the research to all six forms: final question lists are in `frontend/lib/onboarding-services/*.ts` and `lib/onboarding.ts` (decisions 21 to 33). The six artifacts are history. A refreshed reference artifact is to be published from the final lists
- [x] Guardrail spec measures every form against the research (`tests/onboarding-guardrails.spec.ts`): small jobs are 17 to 21 questions over 7 screens, required 10 or 11 (was about 18)
- [~] Simplified colour flow: 2 to 3 taps, optional deeper path (agent building)
- [~] Round 1: Web and SEO (and the legacy answer map `lib/onboarding-aliases.ts`)
- [x] Question lists for Apps, Software & AI and Social rewritten from the research (final)
- [~] Picture cards, the grouped feature checklist and the dropdown rule (single choice with 3 or more plain options is a dropdown, 2 options or Yes/No is one compact line) (agent building)
- [x] Studio scope note derived from answers (`lib/onboarding-scope.ts`), engagement text grouped to four ticks behind a lawyer approval flag (`lib/onboarding-engagement.ts`)
- [x] Services page copy updated for branding, apps, software, social (web and SEO next with the Web steps)
- [x] Works: motion loops on /work/branding and on the Litch and Realtors case studies, Pitch decks group, pause control, lazy loading
- [ ] Round 3: Social & Ads, then shared pieces: review screen, studio scope note, engagement section behind a flag, reminder email, pre-filled link
- [ ] Round 4: Services and Works pages (copy in services-and-works-copy-proposal.md), pitch deck and motion on Works
- [ ] Final: lint, tsc, production build, every spec, full e2e of each form at 320, 390, 768, 1280 in both themes, merge to main, verify deploy

## Phase 9. Voice and feel (owner request, 7 October 2026)

Guide: [onboarding-voice-guide.md](onboarding-voice-guide.md). Pure helpers and tests are done (`lib/onboarding-voice.ts`, `tests/onboarding-voice.spec.ts`). Applying them waits for the two form agents, because it touches the same form file and the labels their tests use.

- [x] Voice guide: the voice, ten ideas, a before and after table of the words
- [x] Helpers: fill names and business into copy, industry aware examples, reflect back lines, milestones, next button names
- [ ] Hook `fill()` into step titles, labels, hints and placeholders in the form, with neutral fallbacks
- [ ] Industry aware examples in the five text questions (main job, search terms, goal, success, pains)
- [ ] Reflect back line under each screen heading, and milestone lines
- [ ] Next button names the next screen, last button "Review and send", send button "Send to the studio"
- [ ] Rewrite step titles, blurbs and labels in the new voice across all six forms and the shared screens, and update the specs that read them
- [ ] A reason line under personal questions, voice note link on long text questions, "Skip if you like" for optional
- [ ] Sent screen says their name and business and what happens next
- [ ] Dropdown placeholder "Pick the closest"
