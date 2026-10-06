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
- [ ] [!] Owner approves the plan
- [x] O1 pre-fill: blank link by default, optional pre-filled link (plan 6.6)
- [ ] [!] O2 signed agreement versus ticked section
- [x] O3 past work: studio chooses from public work (plan 6.7)
- [ ] Open and check each sample image before it ships
- [x] Motion design samples: owner zip received and reviewed (plan 6.7a)
- [ ] [!] Owner confirms Litch Consulting and Realtors' Practice films may be shown
- [ ] Script: cut muted 3 to 6 second loops and posters from the zip (ffmpeg, committed)
- [x] Pitch deck samples: Realtors' Practice PDFs received (plan 6.7)
- [ ] [!] Owner confirms which pitch deck slides may be shown
- [x] O4 owner repos read (plan 6.8)
- [x] O5 Flutterwave and coolors.co confirmed

## Phase 1. Dropdown scroll fix (small, separate commit)

- [~] Reproduce on a touch phone viewport with Playwright
- [ ] Find the root cause and fix it once in the shared picker
- [ ] Add one test that fails before and passes after
- [ ] Lint, typecheck, targeted specs
- [ ] Commit and push to main and the working branch
- [ ] Line in `docs/status.md`

## Phase 2. Six artifacts (three flows each)

Each artifact lists every question of a flow in one view with its conditions. It uses real tokens, type and components. Check 320, 390, 768, 1024 and 1440, light and dark.

- [ ] Branding & Design (with motion design, cards, colour system, style help)
- [ ] SEO
- [ ] Web
- [ ] Apps
- [ ] Software & AI
- [ ] Social Media & Paid Ads
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
