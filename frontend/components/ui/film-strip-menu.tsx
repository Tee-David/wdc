"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import "./film-strip-menu.css";

export interface FilmPage {
  label: string;
  link: string;
  /** One line under the title: the page's own headline. */
  desc: string;
  /** A picture of the page, from scripts/menu-previews.mjs. */
  preview: string;
}

/**
 * THE DESKTOP MENU: A FILM STRIP (the owner's pick, 2026-10-05, from the
 * WDC Menu Concepts canvas).
 *
 * Six frames, one per page, run through a gate with sprocket holes along both
 * edges. Each frame is a real picture of the page it goes to, so a visitor sees
 * what is behind a link before they click it. The frame in the gate is at full
 * size and the rest are scaled back and dimmed; drag, scroll, the arrow keys or
 * the bars under it move the reel, and the frame in the gate opens its page.
 * Choosing one zooms that same picture to fill the screen while the page loads
 * under it, which is the whole transition.
 *
 * DESKTOP ONLY. staggered-menu.tsx mounts this from 768px up and keeps the
 * panel for phones, which the owner asked to leave exactly as it was.
 *
 * WHAT THE REEL IS MADE OF, SO NOBODY "OPTIMISES" IT WRONG:
 *  - `pos` is a float. While dragging it follows the finger; on release it
 *    snaps to the nearest frame, with a throw projected from the last 120ms of
 *    velocity. Every frame's place, size and dimming is derived from `pos` in
 *    render and written as custom properties (--d, --s, --o, ...), so React
 *    never animates anything itself: CSS transitions on transform and opacity
 *    do. There are six frames; a re-render per pointer move is cheap.
 *  - The sprocket holes travel 1.12x as fast as the frames, which is what makes
 *    the strip read as a strip. They are one long repeating row, translated.
 *  - The zoom reads layout once, at the moment of choosing: the gate's box
 *    against the window's, to get a translate and a scale for the picture.
 *  - It is a portal under the header (z-45 against z-50), so the bar, the
 *    Start a Project button and the X stay where they are and stay clickable.
 */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The reel's geometry for a window of this size. */
function dimensions(W: number, H: number, count: number) {
  const sp = 26; // film base above and below the frame
  const capH = 112; // the caption under the frame
  const bh = 120; // the foot
  const top = 96; // clear of the header bar
  const gap = 26;
  const avail = H - top - bh - capH - 2 * sp - gap;
  const fw = Math.round(Math.min(W * 0.46, avail * 1.6));
  const fh = Math.round(fw / 1.6);
  const blockH = fh + 2 * sp + capH;
  const bt = Math.round(top + Math.max(0, (H - top - bh - blockH) / 2));
  const pitch = Math.round(fw * 1.03);
  const hpad = Math.round(0.6 * pitch * 1.12 + 28);
  const hw = Math.round(W + hpad + (count - 0.2) * pitch * 1.12 + 56);
  return { sp, bh, fw, fh, bt, pitch, hpad, hw };
}

export default function FilmStripMenu({
  open,
  onClose,
  pages,
  extra,
  footerSlot,
  accountSlot,
  toggleRef,
  openedByKeyboard,
}: {
  open: boolean;
  onClose: () => void;
  pages: FilmPage[];
  /** Log in, or Dashboard when somebody is signed in. */
  extra: { label: string; link: string; ariaLabel: string };
  footerSlot?: ReactNode;
  accountSlot?: ReactNode;
  /** The header's menu button, which stays outside the dialog and is part of its focus loop. */
  toggleRef: RefObject<HTMLButtonElement | null>;
  openedByKeyboard: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const count = pages.length;
  const last = count - 1;

  const rootRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const frameEls = useRef<(HTMLAnchorElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);
  const suppress = useRef(false);
  const pointer = useRef<{ id: number; x: number; pos0: number; moved: boolean; smp: [number, number][] } | null>(null);
  const wheelState = useRef({ acc: 0, until: 0 });

  /* Only ever mounted in the browser (staggered-menu loads it with ssr:false,
     on the first opening), so the window is there to read. */
  const [size, setSize] = useState(() => ({ W: window.innerWidth, H: window.innerHeight }));
  const [pos, setPos] = useState(0);
  const [drag, setDrag] = useState(false);
  const [snap, setSnap] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);
  const [hinted, setHinted] = useState(false);
  const [zoom, setZoom] = useState({ x: 0, y: 0, s: 1 });

  const current = pages.findIndex((p) =>
    p.link === "/" ? pathname === "/" : pathname === p.link || pathname.startsWith(p.link + "/"),
  );
  const idx = clamp(Math.round(pos), 0, last);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  /* Window size. */
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSize({ W: window.innerWidth, H: window.innerHeight }));
    };
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, []);

  /* Opening: start on the page you are on, and take the page's scroll away
     from it (Lenis would otherwise scroll the page under the reel). */
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      clearTimers();
      busy.current = false;
      setLeaving(false);
      setDone(false);
      setHinted(false);
      setSnap(true);
      setPos(Math.max(0, current));
      window.__lenis?.stop();
      if (openedByKeyboard) {
        later(() => frameEls.current[Math.max(0, current)]?.focus({ preventScroll: true }), 380);
      }
    }
    if (!open && wasOpen.current) {
      window.__lenis?.start();
      /* Put focus back on the button that opened it, if it was inside. */
      if (rootRef.current?.contains(document.activeElement)) toggleRef.current?.focus({ preventScroll: true });
      later(() => {
        setLeaving(false);
        setDone(false);
      }, 400);
    }
    wasOpen.current = open;
    // `current` is read at the moment of opening only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => () => window.__lenis?.start(), []);

  /* While the picture zooms, the real header steps aside: the picture carries
     its own header (it is a capture of the page), and the two would sit on top
     of each other. It fades back in as the page arrives (see `.hd-bar` in
     globals.css). Cleanup also covers the page swap unmounting this. */
  useEffect(() => {
    const root = document.documentElement;
    if (leaving && !done) root.dataset.filmLeaving = "1";
    else delete root.dataset.filmLeaving;
    return () => {
      delete root.dataset.filmLeaving;
    };
  }, [leaving, done]);

  /* After a snap, let the transitions back on. */
  useEffect(() => {
    if (!snap) return;
    const id = window.setTimeout(() => setSnap(false), 60);
    return () => window.clearTimeout(id);
  }, [snap]);

  const tick = () => {
    try {
      navigator.vibrate?.(6);
    } catch {
      /* no haptics */
    }
  };
  const goTo = useCallback(
    (i: number, refocus = false) => {
      const target = clamp(i, 0, last);
      if (target !== clamp(Math.round(pos), 0, last)) tick();
      setPos(target);
      setHinted(true);
      if (refocus) later(() => frameEls.current[target]?.focus({ preventScroll: true }), 0);
    },
    [last, later, pos],
  );

  /* CHOOSING. The frame in the gate zooms to the window while the page loads
     under it; the scrim and the zoomed picture then fade to reveal the new page.
     Reduced motion skips the zoom and just goes. */
  const choose = useCallback(
    (i: number) => {
      if (leaving || busy.current) return;
      const page = pages[i];
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const here = page.link === "/" ? pathname === "/" : pathname === page.link;
      const run = () => {
        busy.current = false;
        if (reduce) {
          if (!here) router.push(page.link);
          onClose();
          return;
        }
        const g = gateRef.current?.getBoundingClientRect();
        if (!g) {
          if (!here) router.push(page.link);
          onClose();
          return;
        }
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setZoom({
          x: vw / 2 - (g.left + g.width / 2),
          y: vh / 2 - (g.top + g.height / 2),
          s: Math.max(vw / g.width, vh / g.height),
        });
        setLeaving(true);
        later(() => {
          if (!here) router.push(page.link);
          setDone(true);
        }, 650);
        later(onClose, 960);
      };
      if (clamp(Math.round(pos), 0, last) !== i) {
        busy.current = true;
        goTo(i);
        later(run, 520);
      } else run();
    },
    [goTo, last, later, leaving, onClose, pages, pathname, pos, router],
  );

  /* Escape closes; the arrow keys, Home and End move the reel (from anywhere,
     so it works after opening with the mouse too); Tab loops through the dialog
     and the header's button. One listener, on only while the menu is open. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
        if (leaving || busy.current) return;
        e.preventDefault();
        goTo(e.key === "Home" ? 0 : e.key === "End" ? last : e.key === "ArrowRight" && idx === last ? 0 : idx + (e.key === "ArrowRight" ? 1 : -1), true);
        return;
      }
      if (e.key !== "Tab") return;
      const root = rootRef.current;
      if (!root) return;
      const inside = Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")).filter(
        (el) => el.tabIndex >= 0 && el.offsetParent !== null,
      );
      const loop = [...(toggleRef.current ? [toggleRef.current] : []), ...inside];
      if (!loop.length) return;
      const at = loop.indexOf(document.activeElement as HTMLElement);
      const next = at === -1 ? 0 : (at + (e.shiftKey ? -1 : 1) + loop.length) % loop.length;
      if (at === -1 || (e.shiftKey && at === 0) || (!e.shiftKey && at === loop.length - 1) || loop[at] === toggleRef.current) {
        e.preventDefault();
        loop[next].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [goTo, idx, last, leaving, onClose, open, toggleRef]);

  /* The wheel steps the reel one frame at a time. Native and non-passive so
     the page behind can never scroll; throttled so a trackpad's long tail of
     deltas is one step, not six. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (leaving || busy.current) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const now = performance.now();
      const w = wheelState.current;
      if (now < w.until) return;
      w.acc += d;
      if (Math.abs(w.acc) > 36) {
        goTo(idx + (w.acc > 0 ? 1 : -1));
        w.acc = 0;
        w.until = now + 220;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goTo, idx, leaving, open]);

  /* Dragging. Past the ends the reel gives, at about a third of the distance. */
  const D = dimensions(size.W, size.H, count);
  const rubber = (p: number) => (p < 0 ? p * 0.35 : p > last ? last + (p - last) * 0.35 : p);
  const onDown = (e: ReactPointerEvent) => {
    if (leaving || busy.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointer.current = { id: e.pointerId, x: e.clientX, pos0: pos, moved: false, smp: [[performance.now(), e.clientX]] };
  };
  const onMove = (e: ReactPointerEvent) => {
    const p = pointer.current;
    if (!p || e.pointerId !== p.id) return;
    const dx = e.clientX - p.x;
    if (!p.moved) {
      if (Math.abs(dx) < 7) return;
      p.moved = true;
      suppress.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* the pointer is already gone */
      }
      setDrag(true);
      setHinted(true);
    }
    const now = performance.now();
    p.smp.push([now, e.clientX]);
    while (p.smp.length > 2 && now - p.smp[0][0] > 120) p.smp.shift();
    const next = rubber(p.pos0 - dx / D.pitch);
    if (clamp(Math.round(next), 0, last) !== clamp(Math.round(pos), 0, last)) tick();
    setPos(next);
  };
  const onUp = (e: ReactPointerEvent) => {
    const p = pointer.current;
    if (!p || e.pointerId !== p.id) return;
    pointer.current = null;
    if (p.moved) {
      const a = p.smp[0];
      const b = p.smp[p.smp.length - 1];
      const v = b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0;
      const projected = pos - (v * 170) / D.pitch;
      const target = clamp(Math.round(clamp(projected, pos - 2, pos + 2)), 0, last);
      setPos(target);
      setDrag(false);
      later(() => {
        suppress.current = false;
      }, 60);
    }
  };

  const hx = -(pos * D.pitch * 1.12);
  const style = {
    "--fw": `${D.fw}px`,
    "--fh": `${D.fh}px`,
    "--sp": `${D.sp}px`,
    "--pitch": `${D.pitch}px`,
    "--bt": `${D.bt}px`,
    "--bh": `${D.bh}px`,
    "--hx": `${hx.toFixed(1)}px`,
    "--hpad": `${D.hpad}px`,
    "--hw": `${D.hw}px`,
    "--zx": `${zoom.x.toFixed(1)}px`,
    "--zy": `${zoom.y.toFixed(1)}px`,
    "--zs": zoom.s.toFixed(4),
  } as CSSProperties;

  return createPortal(
    <div
      ref={rootRef}
      id="film-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      inert={!open}
      data-lenis-prevent
      className={`fm${open ? " is-open" : ""}${leaving ? " is-leaving" : ""}${done ? " is-done" : ""}`}
      style={style}
    >
      <div className="fm-scrim" />
      <div
        className={`fm-stage${drag ? " is-drag" : ""}${snap ? " is-snap" : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="group"
        aria-roledescription="carousel"
        aria-label={`The reel: ${count} pages`}
      >
        <div className="fm-reel">
          <div className="fm-glow" />
          <div className="fm-band">
            <div className="fm-holes-slide">
              <div className="fm-holes fm-holes--t" />
              <div className="fm-holes fm-holes--b" />
            </div>
          </div>
          <div className="fm-gate" ref={gateRef}>
            <span className="fm-ring" />
            <span className="fm-scratch" />
          </div>
          <div className="fm-track">
            {pages.map((p, i) => {
              const d = i - pos;
              const ad = Math.abs(d);
              const scale = 1 - 0.16 * Math.min(1, ad);
              const opacity = ad < 1 ? 1 - 0.5 * ad : Math.max(0.22, 0.5 - 0.22 * (ad - 1));
              const capOpacity = 1 - 0.22 * Math.min(1, ad);
              const tc = Math.max(0, 1 - ad * 1.6);
              const centre = i === idx;
              return (
                <Link
                  key={p.link}
                  href={p.link}
                  ref={(el) => {
                    frameEls.current[i] = el;
                  }}
                  className={`fm-frame${centre ? " is-centre" : ""}${i === current ? " is-cur" : ""}`}
                  style={
                    {
                      "--d": d.toFixed(3),
                      "--s": scale.toFixed(3),
                      "--o": opacity.toFixed(3),
                      "--co": capOpacity.toFixed(3),
                      "--tc": tc.toFixed(3),
                      zIndex: Math.round(10 - ad * 3),
                    } as CSSProperties
                  }
                  tabIndex={centre ? 0 : -1}
                  draggable={false}
                  prefetch={false}
                  aria-label={`${p.label}. ${p.desc}. Frame ${i + 1} of ${count}.${centre ? " Press to open." : " Press to bring into view."}`}
                  aria-current={i === current ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (suppress.current || leaving) return;
                    if (idx === i) choose(i);
                    else goTo(i, e.detail === 0);
                  }}
                >
                  <span className="fm-pic">
                    <span className="fm-lift">
                      <Image className="fm-img" src={p.preview} alt="" width={960} height={600} sizes="46vw" loading="eager" draggable={false} />
                      <span className="fm-tc" aria-hidden="true">{`0:0${i + 1}`}</span>
                      <span className="fm-play" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
                        </svg>
                      </span>
                    </span>
                  </span>
                  <span className="fm-cap" aria-hidden="true">
                    <span className="fm-here">
                      <i />
                      You are here
                    </span>
                    <span className="fm-title">{p.label}</span>
                    <span className="fm-desc">{p.desc}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* TWO QUIET ARROWS for anyone who does not know the reel can be dragged.
          Previous is hidden on the first page; Next is always there and goes
          round from the last page back to the first, because it is a film. */}
      <button type="button" className={`fm-arrow fm-arrow--prev${idx === 0 ? " is-off" : ""}`} aria-label="Previous page" tabIndex={idx === 0 ? -1 : undefined} aria-hidden={idx === 0 || undefined} onClick={() => goTo(idx - 1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
      </button>
      <button type="button" className="fm-arrow fm-arrow--next" aria-label={idx === last ? "Back to the first page" : "Next page"} onClick={() => goTo(idx === last ? 0 : idx + 1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
      </button>

      <div className="fm-foot">
        <div className="fm-foot-l">
          <div className="fm-meta">
            <span className="fm-count" aria-hidden="true">
              <span className="fm-roll">
                <span className="fm-roll-in" style={{ "--i": idx } as CSSProperties}>
                  {pages.map((p, i) => (
                    <b key={p.link}>{String(i + 1).padStart(2, "0")}</b>
                  ))}
                </span>
              </span>
              <span className="fm-of">/ {String(count).padStart(2, "0")}</span>
            </span>
            <span className={`fm-hint${hinted ? " is-gone" : ""}`}>Drag, scroll or use the arrow keys. Enter opens.</span>
          </div>
          <div className="fm-pager" role="group" aria-label="Jump to a page">
            {pages.map((p, i) => (
              <button
                key={p.link}
                type="button"
                className={`fm-bar${i === idx ? " is-on" : i < idx ? " is-past" : ""}`}
                aria-label={`Frame ${i + 1}: ${p.label}`}
                aria-current={i === idx ? "true" : undefined}
                onClick={() => goTo(i)}
              >
                <span className="fm-bar-track">
                  <span className="fm-bar-fill" />
                </span>
                <span className="fm-bar-name">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="fm-acts">
          <Link href={extra.link} className="fm-btn" aria-label={extra.ariaLabel} onClick={onClose}>
            {extra.label}
          </Link>
          {footerSlot ? <div className="fm-tools">{footerSlot}</div> : null}
          {accountSlot ? <div className="fm-account">{accountSlot}</div> : null}
        </div>
      </div>
      <p className="fm-sr" aria-live="polite">{`Frame ${idx + 1} of ${count}: ${pages[idx]?.label ?? ""}`}</p>
    </div>,
    document.body,
  );
}
