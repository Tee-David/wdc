"use client";

import { Stage, useCountUp, useNearViewport, useStageMotion } from "./stage-shell";
import { CALENDAR, SOCIAL_CHANNELS, SOCIAL_ENGAGEMENT } from "@/lib/showcase";

/**
 * 06 · Social & PPC — "The Feed Wall".
 *
 * Three columns of posts drifting at different speeds, the middle one against
 * the others. Same duplicated-track trick as the phone screens: each column
 * renders its cards twice and translates by exactly -50%, so the loop is
 * seamless without measuring anything.
 *
 * PLACEHOLDER: the posts and their numbers are illustrative furniture, not
 * campaign results. Publishing invented engagement figures as if they were a
 * client's would be a false claim, so the caption says what they are.
 */
const POSTS = [
  { tag: "Reel", t: "Behind the rebrand", n: "12.4k" },
  { tag: "Carousel", t: "Five signs your site is costing you", n: "8.1k" },
  { tag: "Ad", t: "Launch campaign — week one", n: "31.7k" },
  { tag: "Story", t: "Studio day in the life", n: "4.6k" },
  { tag: "Post", t: "New identity, same values", n: "9.3k" },
  { tag: "Ad", t: "Retargeting set B", n: "22.8k" },
  { tag: "Reel", t: "Shipping day", n: "6.9k" },
  { tag: "Carousel", t: "Before and after", n: "15.2k" },
  { tag: "Post", t: "Client win", n: "3.4k" },
];

/* Each column needs enough cards that ONE half of the duplicated track is
   taller than the column, or the -50% translate scrolls a gap into view. Six
   cards at ~97px clear a 745px frame; six still fell short of the taller
   columns, which is why the middle one ran out of wall. Offsetting the start index keeps the
   columns from reading as the same list three times. */
const column = (offset: number) =>
  Array.from({ length: 8 }, (_, i) => POSTS[(offset + i) % POSTS.length]);

const COLUMNS = [
  { items: column(0), dur: 34, up: true },
  { items: column(3), dur: 42, up: false },
  { items: column(6), dur: 38, up: true },
];

function Card({ p }: { p: (typeof POSTS)[number] }) {
  return (
    <article className="fw__card">
      <div className="fw__top">
        <span className="fw__tag">{p.tag}</span>
        <span className="fw__n">{p.n}</span>
      </div>
      <p className="fw__t">{p.t}</p>
      <div className="fw__meta" aria-hidden="true">
        <span /><span /><span />
      </div>
    </article>
  );
}

/* The two halves of this service: what goes out (the calendar) and what comes
   back (the wall). Showing only the drifting wall sells "posts"; showing the
   plan beside it sells management, which is the thing being bought. */
function Stat({ m, run }: { m: (typeof SOCIAL_ENGAGEMENT)[number]; run: boolean }) {
  const n = useCountUp(m.to, run);
  return (
    <div className="fw-stat">
      <span className="fw-stat__n">
        {Number.isInteger(m.to) ? Math.round(n) : n.toFixed(1)}{m.suffix}
      </span>
      <span className="fw-stat__l">{m.label}</span>
    </div>
  );
}

function Planner({ run }: { run: boolean }) {
  const { ref, near } = useNearViewport<HTMLDivElement>("100px");
  return (
    <div className="fw-plan" ref={ref}>
      <div className="fw-plan__head">
        <span className="fw-plan__t">Content calendar</span>
        <span className="fw-plan__sub">a fortnight</span>
      </div>
      <div className="fw-plan__grid" aria-hidden="true">
        {CALENDAR.map((k, i) => <span className={`fw-plan__c is-${k}`} key={i} />)}
      </div>
      <div className="fw-plan__key" aria-hidden="true">
        {(["organic", "paid", "story"] as const).map((k) => (
          <span className="fw-plan__ki" key={k}><i className={`is-${k}`} />{k}</span>
        ))}
      </div>
      <div className="fw-chan">
        {SOCIAL_CHANNELS.map((c) => (
          <span className="fw-chan__c" key={c.id}>{c.label}</span>
        ))}
      </div>
      {/* what comes back, beside what goes out */}
      <div className="fw-stats">
        {SOCIAL_ENGAGEMENT.map((m) => <Stat key={m.id} m={m} run={run && near} />)}
      </div>
    </div>
  );
}

export default function FeedWall() {
  const mode = useStageMotion();

  /* Still: no drift at all, just the wall. Compact: one column, because three
     columns of 3-line cards on a phone are unreadable slivers. */
  if (mode === "still") {
    return (
      <Stage caption="Illustrative posts and plan, not campaign results.">
        <div className="fw-split fw-split--still">
          <Planner run={false} />
          <div className="fw fw--still">
            {POSTS.slice(0, 4).map((p) => <Card key={p.t} p={p} />)}
          </div>
        </div>
      </Stage>
    );
  }

  /* Compact drops to a single drifting column: two of three columns on a phone
     are slivers, and the planner needs the width more than the wall does. */
  const cols = mode === "compact" ? COLUMNS.slice(0, 1) : COLUMNS.slice(0, 2);

  return (
    <Stage caption="Illustrative posts and plan, not campaign results." tall>
      <div className={`fw-split fw-split--${mode}`}>
        {/* the still branch already returned above, so motion is on here */}
        <Planner run />
        <div className={`fw fw--${mode}`} aria-hidden="true">
          {cols.map((c, i) => (
            <div className="fw__col" key={i}>
              <div
                className={`fw__track${c.up ? " is-up" : " is-down"}`}
                style={{ animationDuration: `${c.dur}s` }}
              >
                {[0, 1].map((dup) => (
                  <div className="fw__half" key={dup}>
                    {c.items.map((p, n) => <Card key={`${dup}-${n}-${p.t}`} p={p} />)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* the drifting wall is decorative; this is what a screen reader gets */}
      <p className="sr-only">
        A wall of illustrative social posts and paid campaign cards.
      </p>
    </Stage>
  );
}
