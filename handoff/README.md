# Handoff: pick up WDC work from here

Written 2026-09-27 so any session (Claude, Codex, a person) can continue without
the conversation that produced it. Read this file, then `QUEUE.md`, then start
at the top of the queue.

## What is where

| File | What it is |
|---|---|
| `QUEUE.md` | **The work still to do**, in order, each with the owner's words, the screenshot, where the code is, and what "done" means. Tick items there as you finish them. |
| `CHECKLIST.md` | Link to `../IMPLEMENTATION_CHECKLIST.md`, the long-running delivery ledger (AGENTS.md says to keep it current). |
| `ARTIFACTS.md` | Every design proposal / prototype published so far, with its link and status (approved, waiting, built). |
| `screenshots/` | The owner's screenshots for the open queue items, named by queue number. |
| `prototypes/` | Source of the two hero prototypes (`hero-motion` = the ten motion pieces; `hero-reconcile` = concepts A/B/C). Build with `node build.mjs` inside each folder. |
| `scripts/` | Local dev helpers (Postgres on 5433, dev server on 3100). Set `SCRATCH` to any writable folder first. |

## Rules that are not optional

`AGENTS.md` at the repo root is the rulebook (design tokens, button pair, solid
fills, WCAG AA, 44px targets, no city names, toasts on every save, in-app
confirm dialog, tables stay tables, migrations applied from Settings > System,
large proposals are an artifact first). The two that bite most:

- **Never add AI attribution** to commits or PRs (no Co-Authored-By, no "Generated with").
- **Push as you go**, to both `main` and `claude/dashboard-redesign-mockups-iidska`:
  ```
  git add -A frontend handoff IMPLEMENTATION_CHECKLIST.md && git commit -m "…" \
    && git fetch origin main && git merge origin/main -m "Merge origin/main"; \
    git push origin HEAD:main && git push origin HEAD:claude/dashboard-redesign-mockups-iidska
  ```
  Every push to `main` deploys to Vercel through `.github/workflows/deploy.yml`.

## Running it locally

```
export SCRATCH=/tmp/wdc-scratch; mkdir -p $SCRATCH
# a local Postgres on 5433 with database "wdc"; write $SCRATCH/dbenv.sh:
#   export DATABASE_URL="postgresql://postgres@localhost:5433/wdc"
bash handoff/scripts/dev.sh start          # Next dev server on :3100 with placeholder R2 and a random auth secret
cd frontend && source $SCRATCH/dbenv.sh
WDC_E2E_CHROME=/opt/pw-browsers/chromium BONEYARD_CAPTURE_TOKEN=local-capture npx playwright test <spec-name>
```

- The admin is reached in tests through `x-boneyard-capture: local-capture` (and
  `x-boneyard-capture-role: staff` for staff). Never in production.
- `npx tsc --noEmit -p .` and `npx eslint <files>` before every push.
- If a compile looks stale: stop the server, `rm -rf .next`, start again.
- A production build (`npx next build`) writes into `.next` too; restart the dev server after it.

## Where things stand (2026-09-27)

Done and pushed this session, each with its spec in `frontend/tests/`:
screenshot batch (entry files as a rail, page tours end at their own top,
drawer focus, wider board cards, invoice tiles, new-form padding, cover
buttons, blog save toasts and refusals, migrations Apply, cashflow table);
Paystack double-banking fix (`lib/paystack-claim.ts`, migration 0031); staff
walkthrough without Money; Settings > Blog and site copy; default link-preview
picture; notice address confirmed by email; post revisions and FAQ history
(migration 0032); refund state on payment lists; TIN and footer note on
documents; next document numbers; Paystack delivery history on System; media
"Used in"; a post's social image from the library.

Queue items 1–12 and 14–15 are now pushed to both tracked branches; item 13's
tooltip proposal was declined, so the existing tooltip stays. Item 10 adds
multi-file project deliverables through the media-library/R2 flow, with signed
Open and Download links in the portal; it uses the existing persisted JSON
record and needs no schema migration. Git-triggered Vercel deploys remain
blocked by the private-repository Hobby policy, and the direct-deploy API is at
its daily limit; do not treat these pushes as live-production verification.

Owner follow-ups 16–17 are also complete in `5b6e43b`: the Details conversion
button stays inside its panel, attachment lists become a native carousel only
above four files, and project deliverables plus newsletter CSV import share the
design-system `FileDrop` component. Responsive browser checks cover 600/390/320
and the production build passes. No migration is needed.

Production also has `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` set as a write-only
Vercel secret. Keep it stable across deployments: without Skew Protection, an
open admin or portal page can post an old action identifier to a new build and
fall into the route error boundary. Rotate it only as a deliberate reload/sign-
out event for every open dashboard page.

**Production still needs migrations 0028–0032 applied** from Settings > System
(the owner presses Apply). Everything works without them, but they make the
tables permanent and indexed.

## What to do next

The phone bug queue is complete. The owner asked to skip refined hero Option C.
Queue item 21 is marked complete for its design phase in `85b75df`. The Google
sign-in flow proposal is in `prototypes/google-signin-21/`; it must be approved
before production auth changes are built.

When you finish an item: tick it in `QUEUE.md`, add a line to
`IMPLEMENTATION_CHECKLIST.md` if it closes something there, commit, push.
