"use client";

import { useEffect, useState } from "react";

/**
 * The rotating line that plays while a tool's server round trip is in
 * flight, shared by every tool that fans out to something slow: a registry,
 * a DNS resolver, a page it has to fetch and read. A spinner says "wait";
 * this says "somebody is doing something", which is the same wait spent
 * better and is why the domain checker had one before any other tool did.
 *
 * MOUNTED ONLY WHILE BUSY, which is what gives every check its own random
 * opening line. `useState(() => random)` picks it during this component's
 * first render rather than inside an effect, so there is no synchronous
 * `setState` in an effect body to trigger a cascading render; the effect
 * below only ever sets state from its own interval callback.
 */
export default function WaitingLine({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * phrases.length));

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % phrases.length);
    }, 1500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- phrases is a module-level constant at every call site
  }, []);

  /* `aria-hidden`: a screen reader does not need a new line every 1.5
     seconds, and the button beside it already announces itself as busy. */
  return (
    <p className="tl__wait" aria-hidden="true">
      <span className="tl__waitDot" />
      {phrases[index]}
    </p>
  );
}
