# Implementing the dashboard overhaul in the live app

This is the working agreement for anyone changing `frontend/` to match the approved boards. Read `CLAUDE.md` first (design system summary, owner's standing calls, safety rules). Then this file. A newer line in `preferences.md` beats an older one.

## What "done" means for a screen

1. The live route shows the same structure, components and words as its board. Not a similar idea. The same.
2. Every feature the live route had before still works. The old screen is the spec for behaviour; the board is the spec for look and flow. If the board drops something the live page did, keep it and put it where the board puts that kind of thing.
3. Light and dark, at 320, 390, 834 and 1440 px: no horizontal overflow, touch targets of 44px, text 4.5:1 and UI 3:1. Measured, not eyeballed.
4. Loading, empty, filtered, error and no-permission states exist and look like the final page.
5. `npx tsc --noEmit` and `npx eslint <the files you changed>` are clean. Do not run `next build` while the dev server is up (it shares `.next`); the lead runs it.

## Rules that have already cost something

- Never expose secrets. Never put real records in source. Server actions keep validating on the server; a UI change never loosens a check.
- Orange `#ff6500` never carries words. Words on orange are `#b84a00` with white. Tags, chips, badges and icon tiles are SOLID fills with white or ink labels. No tints, no alpha.
- Inputs: no orange outline in either theme. Focus is the container border `--ad-ink` plus a 4px `--ad-ring` halo. Keyboard focus elsewhere is a 2px `--ad-focus` ring, offset 2px.
- The active nav item is a solid fill, never a line.
- Sheets, never centred dialogs. Side sheet on desktop (480px, 720px wide), bottom sheet with a drag handle on phones. Confirmations are sheets. Irreversible actions need "I understand".
- Tables stay tables on every screen: first column pins, the table scrolls sideways inside its own box. Lists page at 5 with 5, 10 or 20 per page and "View all"; the pager is centred in its card.
- Motion is transform and opacity only, off under `prefers-reduced-motion`, and never blocks content.
- Voice: calm and specific. Sentence case. No exclamation marks, no emoji, no dashes in copy, no city names. Buttons name the action and its object. Staff and client copy says "Admin", never "the owner".
- Dates `Tue 14 Oct`, `14 Oct 2026` on documents, 24 hour time. Naira as `₦850,000`.
- Preserve unrelated changes. Do not touch `admin.css`, `shell.tsx`, `dialog.tsx`, `confirm.tsx`, `toast.tsx`, `pager.tsx` or any file outside your list unless the lead says so; write what you need in your report instead.
- Do not run migrations, change the schema, or edit `.env`. Do not commit or push; the lead commits after review.

## Running it

A local Postgres and the dev server are already running. Do not start another.

- App: `http://localhost:3100`. Owner account: `owner@example.test` / `Studio-2026-local-ok`. Sample records are loaded.
- Screenshot real pages signed in: `node /tmp/wdc-tools/live.js <width> <height> <out-prefix> <light|dark> /admin /admin/clients ...`. It prints status, `h1`, horizontal overflow and page errors, and writes one PNG per URL. Read the PNGs.
- For states that need a click, write a short Playwright script with `playwright-core` (chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, module path `/tmp/wdc-tools/node_modules`). Sign in the way `live.js` does. Only one Playwright run at a time.
- Theme is set with `localStorage.theme` (`light` or `dark`).
- Boards (the design): `node /tmp/wdc-tools/snap.js <Board> <outdir> <width> <height> <light|dark> [state chip labels]` writes PNGs of any board, one per "Preview as" chip. Prerendered public-page states are in `/tmp/wdc-design/`. The board sources are in `plans/dashboard-overhaul/kit/pages/` (HTML structure and the JS that shows each state) and `kit/kit.css` (the CSS, class by class). The design system is `design-system/project/` (README, Patterns, States, Writing, Motion, `tokens.json`).
- The dev store persists in Postgres. Sample data is for looking, never for committing.

## Report format

End with: files changed, what now matches which board, what does not yet and why, the measured checks (sizes, overflow, contrast) and anything that needs a decision or a migration. Say plainly what you did not verify.
