"use client";

import { useEffect, useRef } from "react";

/**
 * The live public site in a browser window that scrolls itself without end.
 * The capture is drawn twice and the position steps back by one copy's height
 * once the first has gone by, so the loop has no seam. It stops for a reader
 * (hover, touch, wheel, keyboard focus), when it is off screen or the tab is
 * hidden, and never runs under reduced motion. It only ever moves its own box,
 * never the page, so it is not a second owner of the page's scroll position.
 * The position is kept as a fraction because browsers round `scrollTop`, and a
 * sub-pixel step written straight to it never moves.
 */
export default function SiteScroll({ src, w, h, client, domain }: { src: string; w: number; h: number; client: string; domain: string }) {
  const box = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, last = 0, pos = 0, held = false, seen = false, resume = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (held || !seen || document.hidden) { last = t; pos = el.scrollTop; return; }
      const loop = first.current?.offsetHeight ?? 0;
      if (loop <= el.clientHeight) { last = t; return; }
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      if (Math.abs(pos - el.scrollTop) > 2) pos = el.scrollTop;
      pos += dt * 0.05;
      if (pos >= loop) pos -= loop;
      el.scrollTop = pos;
    };
    const hold = () => { clearTimeout(resume); held = true; };
    const free = () => { clearTimeout(resume); resume = window.setTimeout(() => { held = false; }, 1500); };
    const io = new IntersectionObserver(([e]) => { seen = !!e?.isIntersecting; });
    io.observe(el);
    const on: [string, () => void][] = [["pointerenter", hold], ["pointerleave", free], ["touchstart", hold], ["touchend", free], ["wheel", hold], ["focus", hold], ["blur", free]];
    on.forEach(([k, f]) => el.addEventListener(k, f, { passive: true }));
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(resume); io.disconnect(); on.forEach(([k, f]) => el.removeEventListener(k, f)); };
  }, []);

  return (
    <figure className="ac-site">
      <div className="ac-site__bar" aria-hidden="true">
        <i /><i /><i />
        <span>{domain}</span>
      </div>
      <div className="ac-site__win" ref={box} tabIndex={0} data-lenis-prevent aria-label={`${client} public site, scroll to read it`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a 1200px capture, already sized and compressed for this window */}
        <img ref={first} src={src} alt={`${client} public site, top to bottom`} width={w} height={h} loading="lazy" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element -- the second copy that makes the loop seamless */}
        <img src={src} alt="" aria-hidden="true" width={w} height={h} loading="lazy" decoding="async" />
      </div>
    </figure>
  );
}
