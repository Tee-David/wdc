# Dashboard overhaul: design system, screens and plan

Everything for the admin, staff and client dashboard overhaul lives in this folder, so anyone can open it, run it or work on it.

| Path | What it is |
| --- | --- |
| `design-system/` | The design system: rules, tokens (`tokens.json`), writing, patterns, money, settings, states, motion, components. Published as an artifact too. |
| `kit/` | The prototype source: shared styles, shell, sheets, behaviour (`kit.js`, `kit2.js`, `tools.js`, `extras.js`), a module per page in `pages/`, and `build.py` that assembles boards. |
| `screens/` | The built boards (`D-*` homes, `A-*` admin, `S-*` staff, `C-*` client). Each is a `.dc.html` design canvas file, the same ones published to the canvas artifact. |
| `preferences.md` | Every decision the owner has given. A newer line wins. |
| `replacement-checklist.md` | The checklist for replacing the live dashboards once every artifact is complete. |

Rebuild the screens: `cd kit && python3 build.py ../screens`.

Artifacts: design system https://claude.ai/artifact/XRhmw3yngg9bTxBzim5zLr, canvas https://claude.ai/artifact/1HG99eCtChsHCLyTnh7iEQ.
