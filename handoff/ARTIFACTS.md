# Artifacts (design proposals and prototypes)

All are private claude.ai artifacts owned by the studio account. A new session
reads one with the Artifact tool (`action: "read"`), not a web fetch.

| Link | What | Status |
|---|---|---|
| https://claude.ai/artifact/6NMiGXyWnFTg94jUskN45S | **WDC Hero Concepts** (design canvas): six film-hero concepts in desktop and phone artboards, the 30s showreel playing in each. 01 Cinema, 02 Frost, 03 Studio, 04 Ambient, 05 Spotlight, 06 Timeline, plus a Final row (04 + Stories). | **06 Timeline built** 2026-10-04 (`components/sections/hero.tsx`), with the Stories phone layout. 02 and 03 declined. |
| https://claude.ai/artifact/H3pMsULKtfdzgPfHtEMuPd | **Hero, reconciled**: concepts A (backdrop), B (recede), C (shared ground), live in phone and desktop frames. Source: `prototypes/hero-reconcile/`. | Owner chose **C**, with changes: see QUEUE item 20. Not built. |
| https://claude.ai/artifact/VtKhKJkgMBSgop26cphUPv | **Hero motion**: the ten motion pieces (one per service), the first prototype. Source: `prototypes/hero-motion/`. | Pieces liked; its layout was not. Feeds item 20. |
| https://claude.ai/artifact/Xa6aPYNrgVhJnyHnkbu93c | **Design System**: every admin/portal component live in both themes. Linked from `README.md` § Design system. | Reference; keep in step with components. |
| https://claude.ai/artifact/8sjXczuyFAGDbAdzRNwBSq | Dashboard redesign canvas (admin and portal boards, `Main.dc.html`). Local copy of the boards: `dashboard-mockups/`. | Built. |
| https://claude.ai/artifact/4p2nm5CF2BBHoD1gDZSP9S | Settings canvas (sections, save bar, kit). | Built (see checklist 4.8A). |
| https://claude.ai/artifact/28Go1WNCuccJfB268qwc8s | Settings improvements (audit log detail and diff, and the rest). | **Waiting on the owner.** |
| https://claude.ai/artifact/AgHqC7o7WnB3TrtgJGYRw8 | Media library, folders and the "Choose media" picker (five phases). | Built. |
| https://claude.ai/artifact/4EZwydSEMjGyQf8SLCfKup | Entry PDFs and attachments. | Built. |
| https://claude.ai/artifact/5RQG4iK9TZBzrLSg7fm5pM | All 24 emails in the sign-in email's design. | Partly built: invoice issued and reminder need rework, eleven need small changes (checklist). |
| https://claude.ai/artifact/XD76MRCv3hKboNNAbcdWbt | Pay button motion ideas (recommended: border trace while Paystack opens, a paid stamp on return). | **Waiting on the owner's pick.** |
| https://claude.ai/artifact/HQVFLW8y3Ui5De7ywsqNve | Page tours for every admin and portal page. | Built. |
| https://claude.ai/artifact/KNeBe4abjbkqTRQaRrUVp4 | Forms / onboarding list redesign. | Built. |
| https://claude.ai/artifact/GyFR3Wyfs1ppqU4c7k5enu | Empty states and dead ends audit. | Built. |
| https://claude.ai/artifact/Bqtw4xKmkbYzydFphD4EAY | Loading skeletons. | Built. |
| https://claude.ai/artifact/BYT5c6gzNLne7Kwbby9Wwp | Case studies. | Reference. |
| `prototypes/tooltip-13/` | Tooltip proposal: compact solid anchored panel, directional arrow, edge-safe placement and both themes. Includes 390px light/dark and 320px captures. | **Declined 2026-09-28: retain the existing tooltip design.** |
| `prototypes/google-signin-21/` | Google sign-in flow: login, invitation match/mismatch, first sign-in, client/admin linking, safe unlinking and unconnected-account errors. Eight reproducible captures plus a 48-state responsive check. | **Waiting on the owner. Design only; production auth unchanged.** |

The Google sign-in flow (item 21) is ready for approval. The owner asked to
skip refined hero C (item 20) on 2026-09-28.
