# Motion vocabulary

Easing, moves and timing rules that make the work feel like this user's taste: clean, confident, precise, with small moments of delight.

## Timing rules
- Entrances 0.15-0.4s, exits 0.06-0.14s. **Exits always faster than entrances.**
- Never slow the whole piece to add time: keep transitions at full speed and add **holds** on reading moments.
- Every scene cut lands on a beat or a spoken word.
- Beat length: 30s holds ~5-6 ideas; text lines need ~0.4s per 2 words to be read.
- One accent colour moment per beat. If two things are orange, one is wrong.

## Moves (all expressible with `M.*` and `C.*`)
| Move | Recipe |
|---|---|
| **Blur swap** | In: `dy 60→0`, `blur 14→0`, opacity, `eo`; out: reverse with `ei`, faster. `M.swap`. |
| **Typing + cursor** | Slice with `typed`, 0.02-0.045s/char. Cursor solid while typing, blinks at 3.6Hz idle (use real time `M.RT`). |
| **Cursor wipe** | Cursor grows to full height (`eio`), widens to full width (`xi`), exits (`xo`), revealing the next scene. |
| **Circular colour reveal** | `clip-path: circle()` grown with `xio` from an anchor (cursor, button, dot) plus a thin ring. |
| **Chaos orbit then implode** | `C.orbit` of labelled pills, jitter rising, then collapse to centre with `xi`, scale→0.1, blur, fade. |
| **Scatter-to-sentence** | Words start at random offsets/rotations/blur, `back(1.25)` into place, staggered 0.14s; optional confetti burst. |
| **Highlight-box swap** | A coloured box behind one word; the word swaps while the box width tweens (`eio`). |
| **Pointer click** | `C.pointer`: ease to target (`eio`), press scale 0.86, ripple ring, UI state flips on the click frame. |
| **Notification toast** | Pill/card drops in from above with `back`, holds 1.2s, exits up. Pair with `notify` cue. |
| **Counter roll** | `round(n*eo(p))`, blur-swap between stats, label delayed 0.05s. |
| **3D phone stage** | `perspective:1800px`; phone `rotateY(-14deg) rotateX(6deg)` with a slow sine sway; enter from depth with `back`. |
| **Card fan** | 3 cards, offsets ±0.62 card width, rotate ±9°, `back(1.4)` entrance staggered 0.1s. |
| **Prompt bar → result** | Glass pill types a prompt, pointer clicks send, a result card scales in with glow (R18). |
| **Aurora gradient + grain** | `C.bg` blobs drifting at 0.3 rad/s, plus the engine grain layer at 0.05-0.07. |
| **Logo assembly** | `C.logoParts`: arcs rotate in (`back`), a part drops in and squashes, ring pulse from the landing point. |
| **Pen-tool reveal** | SVG outline stroke-dasharray draws on; small squares (anchors) and lines (handles) fade in then out; then fill. (R22) |
| **Giant cropped type wipe** | Type at 2-3x frame width slides through and uncovers the next scene (R03, R14). |
| **Progress chapters** | `C.progress` bar of n segments fills with the beat; matches a website's chapter UI when used as a hero. |

## 3D without a 3D engine
CSS 3D is good for planes: phones, cards, browser windows, rings. For modelled objects (R09), ask for rendered assets (PNG with alpha / image sequence / video with alpha) or approve a three.js or Blender step.

## Composition
- Safe margins: 6% on 16:9, 8% on 9:16. In 9:16 keep key text out of the top 12% and bottom 22% (platform UI).
- Fit the longest line, then use *one* size for the set. Never break a title onto two lines just because it is long: reduce the size.
- Centered layout for hooks and CTAs; left-aligned text + right-hand object for service/feature beats on 16:9; stack vertically on 9:16.
