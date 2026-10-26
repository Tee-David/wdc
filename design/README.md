# WDC design files

Everything we designed for WDC lives here, so you can find it, download it or reuse it later. The live site's own files (logos it serves, fonts, the CSS the app runs on) stay in `frontend/`, because the site needs them there. This folder points to them rather than keeping a second copy that could drift.

## What is where

| Folder | What it holds | How to open it |
| --- | --- | --- |
| `design-system/project/` | The dashboard design system: rules (`README.md`, `Writing.md`, `Patterns.md`, `Money.md`, `Settings.md`, `States.md`, `Motion.md`, `Pages.md`), the tokens (`tokens.json`, `design-system.json`), the components (`components/`) and assets. | Read the Markdown files. The published version is the Design System artifact. |
| `dashboards/screens/` | Every approved board for the three dashboards and the public pages, one `.dc.html` file per page, plus `canvas.json` (the layout of the canvas). | These are the canvas artifact's own files. Open them in the canvas, or use `standalone/`. |
| `dashboards/standalone/` | The same boards as plain pages that open in any browser, with a small copy of the canvas runtime so you can click through them. | Double-click any `.html` file. Rebuild with `node design/dashboards/export.js`. |
| `dashboards/kit/` | The source the boards are built from: shared styles, shell, sheet, behaviour and one module per page. A correction goes into the kit once and lands on every board. | `python3 design/dashboards/kit/build.py <out_dir>` builds the boards. |
| `case-study/` | Screens captured for the app case studies, and the scripts that capture them again. | See `case-study/README.md`. |
| `onboarding/specs/` | The data behind the onboarding form artifacts, one file per service. | Plain JavaScript data files. |

Board names start with the role: `A-` admin, `S-` staff, `C-` client, `D-` the three home pages, `P-` public pages (sign in, invoice, quote, receipt, meetings, forms, onboarding, system states).

## Published artifacts

- Dashboard canvas (every board): https://claude.ai/artifact/1HG99eCtChsHCLyTnh7iEQ
- Design System: https://claude.ai/artifact/XRhmw3yngg9bTxBzim5zLr
- App case study canvas: https://claude.ai/artifact/6ms2WAytQWxpKHQoRwkG7f

The artifacts are private to the owner until shared from their Share menu.

## Brand and live tokens (kept in the app)

- Logos, icons and the document watermark: `frontend/public/brand/`
- Work and portfolio images: `frontend/public/brand-work/`, `frontend/public/work/`
- Payment marks: `frontend/public/payments/`
- Fonts: Space Grotesk for headings, figures and the wordmark (`frontend/assets/fonts/SpaceGrotesk-*.woff2`); Outfit for body text, labels and controls in the dashboards (`frontend/assets/fonts/Outfit-Variable-latin.woff2`, one variable file, OFL). The public site keeps Space Grotesk. ₦ falls back to Space Grotesk, which draws it.
- Site colour tokens: `frontend/app/globals.css` (`--btn-fill`, `--btn-ink`, `--accent-*`)
- Dashboard colour tokens: `frontend/components/admin/admin.css` (`--ad-*`), the same values as `design-system/project/tokens.json`

## Decisions and plans

The owner's design decisions are in `plans/dashboard-overhaul/preferences.md` (a newer line wins). Audits and build progress are in `plans/dashboard-overhaul/audit/`.
