# Onboarding redesign checklist

Plan: [onboarding-redesign-plan.md](onboarding-redesign-plan.md). Update this file with each finished piece. Commit and push to `main` and the working branch as you go.

## Read first (for an agent picking this up)

1. `CLAUDE.md` and `AGENTS.md` in the repo root. Never add AI attribution to a commit or PR.
2. The plan above, sections 2, 3 and 10.
3. `frontend/lib/onboarding.ts`, `components/onboarding/`, `lib/brand-colours.ts`, `tests/onboarding*.spec.ts`, `tests/brief-preferences.spec.ts`.
4. Writing style for owner facing text: short sentences, plain words, no dashes, no semicolons.
5. A schema change ships as a migration. The owner applies it in Settings > System. Say so.

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
- [ ] Script: cut muted 3 to 6 second loops and posters from the zip (ffmpeg, committed)
- [x] Pitch deck samples: Realtors' Practice PDFs received (plan 6.7)
- [x] O4 owner repos read (plan 6.8)
- [x] O5 Flutterwave and coolors.co confirmed

## Phase 1. Dropdown scroll fix (small, separate commit)

Owner device: Microsoft Edge on iPhone (Apple WebKit engine). Not reproduced in headless Chromium.

- [x] Reproduce on a touch phone viewport with Playwright (not reproduced)
- [x] Ship the hardening in commit 2d3a089 on main: no auto focus of the search box on touch, sheet sized from the visual viewport, list has its own definite max height (WebKit flex shrink guard), dvh with svh fallback
- [x] Three new tests in `tests/onboarding.spec.ts`. Targeted specs: 47 passed, 10 skipped (need a capture token), 0 failed. eslint and tsc exit 0
- [ ] Production build not run for this change
- [ ] [!] Owner tests on the iPhone in Edge: open the industry list, scroll to the last row without touching search, tap search, repeat with the toolbar collapsed, and try the phone country list
- [ ] If it still fails: owner sends a screenshot with keyboard state and Edge and iOS version. Next step is a page scroll lock through `components/ui/scroll-reset.tsx`
- [ ] Confirm the deployed commit includes 2d3a089

## Phase 2. Six artifacts (three flows each)

Each artifact lists every question of a flow in one view with its conditions. It uses real tokens, type and components. Check 320, 390, 768, 1024 and 1440, light and dark.

- [~] Branding & Design (with motion design, cards, colour system, style help)
- [~] Web (running)
- [ ] SEO (paused, resume next)
- [ ] Apps (paused)
- [ ] Software & AI (paused)
- [ ] Social Media & Paid Ads (paused)

Owner rule (6 October 2026): run at most two agents at a time. Stopped agents keep their work in the session scratchpad and can be resumed.
- [ ] Engagement section sample for each service (inside its artifact)
- [ ] Owner picks one flow per service
- [ ] Owner approves the style help copy
- [ ] Owner approves the engagement wording

## Phase 3. Legal review

- [ ] Qualified Nigerian lawyer reviews the six engagement sections
- [ ] Decide how acceptance is stored (answers JSON or new columns)
- [ ] If new columns: write the migration and note it for Settings > System

## Phase 4. Shared build

- [ ] Cards that show past work (`next/image`, reduced motion, pause off screen)
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

- [ ] Check whether Works live in files, the database, or both (`lib/work.ts`, admin editor)
- [ ] Draft the small additions for each service page: Branding & Design, SEO, Web, Apps, Software & AI, Social & PPC
- [ ] [!] Owner decides on the Maintenance line on the Web page
- [ ] [!] Owner approves the "work starts at three months" line on the SEO page
- [ ] [!] Owner approves the copy for all six service pages
- [ ] Update `lib/services.ts` (check the JSON-LD still reads truthfully)
- [ ] [!] Owner shares the Drive folder "We Dig Creativity - Graphic Samples" by link
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
