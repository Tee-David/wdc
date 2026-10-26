# Motion

- Motion explains state. It is transform and opacity only, interruptible, and off under reduced motion.
- Easing: `ease` `cubic-bezier(.16,1,.3,1)` for arrivals; `spring` (a linear() spring) for things that land; `out` `cubic-bezier(.4,0,1,1)` for exits.
- Arrival: head, then blocks, a beat apart (60 to 80ms); KPI figures count up over 1 second; bars grow from the baseline; steppers and timelines draw on.
- Exits are 200ms and play before the element leaves (sheets slide out, menus shrink, toasts drop).
- Sheets slide in 460ms on the spring; bottom sheets rise 420ms.
- The deck: stamp reveal 500ms from the pressed button, mark draws in 360ms, card exit 540 to 740ms by action, next card rises 660ms.
- Line icons draw once (`pathLength="1"`) when they mean something: a nav icon on hover, a check, a sheet's header icon.
- Confetti: 70 pieces (44 on phones), the site's palette, about 3 seconds, removes itself.
- Pause loops off screen. Nothing animates forever except a live dot and the tour ring.
