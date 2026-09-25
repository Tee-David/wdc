# Maintenance page concepts

Eleven interactive prototypes for the page `lib/maintenance.ts` serves while the
public site is in maintenance mode. Each one is a single standalone HTML file, so
any of them could be ported into `maintenancePage()`, which also returns one
self-contained string.

Every concept shares one lockup, in `shared/`: plain type set beside the scene, not a panel on top of it. It carries:

- the admin's message and the back-by time, in Lagos time and the visitor's own
- a live countdown
- "Notify me": one email when the site is back, then the address is deleted
- after sign-up only, an optional "what brings you here" question (a new project, a client, just looking)
- the things that still work during maintenance: the client portal, invoice links and the contact email

The forms in these prototypes do not send anything.

| # | File | Idea |
| - | ---- | ---- |
| 01 | `01-we-are-digging.html` | A cross-section of the earth. An orange shaft drills down as the work progresses and lights up buried bits of the site. |
| 02 | `02-wireframe-rebuild.html` | A blueprint that drafts, measures, fills and then redesigns the homepage in a loop. |
| 03 | `03-orange-thread.html` | One orange line that draws ideas and ends on a clock set to the back-by time. It leans toward the cursor. |
| 04 | `04-studio-sign.html` | A hanging shop sign with pendulum physics. Flick it to spin it. The back has a split-flap countdown. |
| 05 | `05-constellations.html` | The studio's services drawn as constellations, with shooting stars that carry the motto. |
| 06 | `06-zero-gravity.html` | The homepage floats apart. Gravity returns as the work finishes and the page lands back in place. |
| 07 | `07-tiny-crew.html` | A tiny crew puts the "BACK SHORTLY" sign up letter by letter. You can pick them up. |
| 08 | `08-rebuild-the-logo.html` | The mark is shattered, and everyone with the page open rebuilds it together (artifact `room` presence). |
| 09 | `09-paper-plane.html` | The page folds into a paper plane that loops the sky. Catch it to read the note inside. |
| 10 | `10-dig-it-up.html` | The page is buried. Brush the soil away to find the message, the back-by tablet and easter eggs. |
| 11 | `11-event-horizon.html` | The site spirals into a black hole. The countdown chip suffers time dilation near the edge. |

Concepts 01, 06 and 09 are tied to the maintenance window. Their "Preview the clock"
slider scrubs through it.

## Build

```sh
node docs/maintenance-concepts/build.mjs
```

This inlines `shared/head.html`, `shared/dock.html` and `shared/dock.js` into each
file in `src/` and writes the results to `dist/`.
