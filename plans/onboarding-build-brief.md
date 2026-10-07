# Onboarding build brief (for the agents that implement the forms)

Read first: `CLAUDE.md` and `AGENTS.md` (repo root), `plans/onboarding-decisions.md` (decisions, final), `plans/onboarding-redesign-plan.md` sections 1, 2, 6, 7, 14, and the artifact data file for your service in `plans/onboarding-artifact-specs/`. The artifact data is the ground truth for questions, wording, conditions and tiers. The published artifacts are the visual reference (links in plan 14.1).

## How the form works (verified)

- Questions are DATA. `lib/onboarding-shared.ts` holds the `Field` and `Step` types. Each service's steps live in `lib/onboarding-services/<service>.ts` (an exported `<SERVICE>_STEPS: Step[]`). `lib/onboarding.ts` composes them in `stepsFor(service)`: About you, then the service's own steps exactly as written (two or more steps are used as written; one step is cut in half, which is the old behaviour), then Finishing up. Closing questions: `CLOSING_STEPS` in `lib/onboarding.ts`.
- `isVisible(field, answers)` is the only visibility rule (form, server check, admin views). `showIf` takes one condition or a list (all must hold). A condition is `{ key, equals?: string[], filled?: boolean }`.
- Size first = one opening question per service whose answer gates later questions. A question at tier 2 gets `showIf: [{ key: SIZE_KEY, equals: ["Medium", "Large"] }, ...its own condition]`. Tier 3 gets `equals: ["Large"]`. Tier 1 has no size condition. Unanswered size shows tier 1 only.
- Kinds: text, email, tel, url, textarea, cards (pick one), multi (pick many), select (searchable list, bottom sheet on phones), yesno, upload, domains, notice (read-only text, never validated or stored). `assist: true` adds the reversible "not sure" button. `scope` is the always visible extra-cost line. `tip` is the help behind the question mark. `hint` is always visible.
- Keep stored keys that the artifact marks "Existing key". New questions use the artifact's new key. Old saved answers must still read: add a small alias map where a value changed (for example `platforms` "iOS" becomes "iPhone") and apply it where answers are read for display (`lib/forms/entries.ts`, the admin entry page), never by migrating data.
- Never ask for passwords. No prices. No city names. No dashes or semicolons in new owner facing copy. Body text one colour. Voice: plain words, short sentences.
- Design rules: `CLAUDE.md` Product language. Solid chips (white on `#b84a00`), black and white button pair, 44px targets, visible focus, no hover only information, 320px upward with no horizontal scroll, light and dark, transform and opacity animation only and nothing under reduced motion.

## Rules of engagement

1. Touch only the files named in your task. If something outside them must change, stop and say so in your report. Two agents work at once.
2. Do NOT commit and do NOT push. The lead commits after verifying. Do not run `git stash`, `git checkout` of files, or `git reset`.
3. The dev server is already running on port 3100 (`npx next dev -p 3100`). If it is not, start it. Playwright: `export WDC_E2E_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` then `npx playwright test <spec>` from `frontend/`.
4. Fast route into any step in a spec: `tests/onboarding-helpers.ts` (`seedDraft`, `isolate`, `pickService`). The form restores a localStorage draft, so a spec lands on step N with answers already given.
5. Before you report: `npx tsc --noEmit` (zero errors), `npx eslint <changed files>` (zero errors), every spec you added or changed passes, and `tests/onboarding.spec.ts`, `tests/brief-preferences.spec.ts`, `tests/onboarding-engine.spec.ts`, `tests/onboarding-change-service.spec.ts`, `tests/onboarding-styles.spec.ts` still pass or are updated by you in the same change when the question they pin has moved.
6. e2e for your service, written as a Playwright spec, covering: (a) every step renders at 320, 390, 768 and 1280 in light and dark with no horizontal overflow and every visible button, option card and checkbox row at least 44px high; (b) the size question gates what the artifact says it gates (Small hides tier 2 and 3, Medium shows tier 2, Large shows all); (c) each conditional question appears directly under its parent and disappears when the parent answer changes; (d) required questions block Next with a message that names the question; (e) "not sure" is reversible (choosing a real answer replaces it, the control stays enabled); (f) a complete run through every step to the review screen at 390 and 1280; (g) an old saved draft with legacy values still opens and displays. Use `isolate` so nothing is saved.
7. Report in plain text: what changed (files), what you measured (numbers), what you could not check, and anything in the artifact that contradicts the code or the plan.

## Update, 7 October 2026 (after the UX research)

The question lists are now FINAL and live in `frontend/lib/onboarding-services/*.ts` and the shared screens in `frontend/lib/onboarding.ts` (`CORE_STEPS`, `CLOSING_STEPS`). They supersede the artifact data in `plans/onboarding-artifact-specs/`, which is history. Read `plans/onboarding-decisions.md` decisions 21 to 33 and `plans/onboarding-ux-research.md` (sections B, D, F) before you start.

Engine facts you can rely on: `showIf` takes one condition or a list (all must hold). A condition is `{ key, equals?, filled? }`, `{ any: [...] }` or `{ tier: 2 | 3 }`. `isVisible`, `tierOf`, `SIZE_TIER`, `SIZE_KEYS` are in `lib/onboarding.ts` and `lib/onboarding-shared.ts`. A screen with no visible question is skipped by the form. `Field` has `optionInfo` (`{ desc?, images?, swatches? }` per option), `groups` and `popular` (for the grouped searchable list), kinds `notice` and `colours`. Legacy answers are read through `lib/onboarding-aliases.ts` (`displayAnswers`, `shownInBrief`, `earlierAnswers`).

Two agents edit `components/onboarding/onboarding-form.tsx` at once. Use the Edit tool with exact strings only, never Write the whole file, never reformat code you did not change, and re-read the lines you are about to edit just before editing.

Cards and checklists must follow the repo design rules: solid fills, no tints, `--accent-fill` with `--on-accent` for chips that carry words, 44px targets, visible focus, no hover only information, 320px upward, light and dark, transform and opacity animation only and none under reduced motion.
