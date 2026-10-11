# Button

Labelled actions. Primary (`btn`) is the one main action in a view: `ad-fill` with `ad-on-fill`. Secondary (`btn2`) is the alternative: `ad-panel` with an `ad-line` border. `btnG` confirms something good (approve, payouts), `btnD` confirms something destructive (void, refund, delete). A working button keeps its width and shows a spinner.

- Provide: the label (verb plus object), optional leading icon, `disabled` with the reason written under it.
- One primary per view; never two solid buttons side by side unless one is `btnG` or `btnD` in a confirmation.
- Never an orange primary in light mode; dark mode turns `ad-fill` orange automatically.
- 44px tall minimum, 12px radius, hover lifts, press scales to .96.
