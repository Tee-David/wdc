"use client";

// react-bits LogoLoop (horizontal), typed and trimmed for the hero carousel.
// Velocity-smoothed rAF marquee with hover deceleration/pause and edge fade.

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import "./logo-loop.css";

/* COPY_HEADROOM WAS 2 AND ONLY EVER NEEDED TO BE 1.

   The track holds `copies` back-to-back sequences and is translated left by an
   offset that wraps at one sequence width, so the visible window is
   [offset, offset + container] with offset < seqWidth. Covering the worst case
   needs copies x seq >= seq + container, which is exactly
   ceil(container / seq) + 1. The second unit of headroom was a whole extra
   copy of every logo in every marquee, rendered and painted and never seen.

   On /services that is seven marquees, six of them the narrow tool rails where
   the sequence is wider than its rail -- so the count was three copies where
   two do the job, a third of the marquee DOM on the page for nothing. */
const ANIMATION_CONFIG = { SMOOTH_TAU: 0.25, MIN_COPIES: 2, COPY_HEADROOM: 1 };

export interface LogoLoopItem {
  node: ReactNode;
  title?: string;
  ariaLabel?: string;
  href?: string;
}

interface LogoLoopProps {
  logos: LogoLoopItem[];
  speed?: number;
  direction?: "left" | "right";
  width?: number | string;
  logoHeight?: number;
  gap?: number;
  pauseOnHover?: boolean;
  hoverSpeed?: number;
  fadeOut?: boolean;
  scaleOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const toCssLength = (value: number | string | undefined) =>
  typeof value === "number" ? `${value}px` : (value ?? undefined);

function useAnimationLoop(
  trackRef: RefObject<HTMLDivElement | null>,
  targetVelocity: number,
  seqWidth: number,
  isHovered: boolean,
  hoverSpeed: number | undefined
) {
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      track.style.transform = "translate3d(0, 0, 0)";
      return;
    }

    /* THE LAYER HINT LIVES WITH THE LOOP, not in the stylesheet.

       It used to be an unconditional `will-change: transform` on
       `.logoloop__track`, which meant the layer was promoted for the life of
       the page even though this loop already stops itself off screen. Seven
       marquees on /services is seven permanent compositor layers for rows that
       are almost all stopped and invisible. Traced during a touch scroll at 4x
       CPU throttling, Layerize was the largest rendering cost on the page at
       1266ms, ahead of Commit and Paint.

       Starting and stopping the animation and promoting and dropping the layer
       are the same decision, so they are made in the same place. */
    const hint = (on: boolean) => {
      track.style.willChange = on ? "transform" : "";
    };
    hint(true);

    if (seqWidth > 0) {
      offsetRef.current = ((offsetRef.current % seqWidth) + seqWidth) % seqWidth;
      track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
    }

    /* OFF SCREEN, IT STOPS COMPLETELY.
       This loop writes `track.style.transform` on every frame, and the
       services page carries SEVEN marquees -- the jump ticker plus one row of
       tool marks per service -- of which at most one is ever in view. Six rAF
       callbacks per frame, each producing compositor work on an element that
       already holds a `will-change: transform` layer, all for rows nobody can
       see. Measured on that page, 80% of scroll time was going to style,
       layout and paint; this is a straight subtraction from it.

       Cancelling the frame rather than skipping the work inside it: a
       scheduled callback that returns early still costs a wake-up per frame
       per marquee. `lastTimestampRef` is cleared on the way out so the first
       frame after it returns does not integrate the whole time it spent
       paused into one enormous jump. */
    let visible = true;
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              const next = entry.isIntersecting;
              if (next === visible) return;
              visible = next;
              if (!visible) {
                if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
                lastTimestampRef.current = null;
                hint(false);
              } else {
                hint(true);
                if (rafRef.current === null) {
                  rafRef.current = requestAnimationFrame(animate);
                }
              }
            },
            /* NO MARGIN. 200px of it meant a marquee started running while it
               was still most of a thumb-scroll below the fold, and on a page
               carrying seven of them that is several running at once through
               every scroll. Measured on /services at 4x CPU throttling with an
               in-page scroll driver: taking the marquees out entirely moved
               the average frame from 29.2ms to 23.4ms, the largest single
               saving available on that page, so how many run at once is worth
               being strict about. They start instantly on arrival either way
               -- there is nothing to catch up on, the offset is preserved. */
            { rootMargin: "0px" },
          );

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null)
        lastTimestampRef.current = timestamp;
      const deltaTime =
        Math.max(0, timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      const target =
        isHovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity;
      const easingFactor =
        1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
      velocityRef.current += (target - velocityRef.current) * easingFactor;

      if (seqWidth > 0) {
        let nextOffset = offsetRef.current + velocityRef.current * deltaTime;
        nextOffset = ((nextOffset % seqWidth) + seqWidth) % seqWidth;
        offsetRef.current = nextOffset;
        track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    /* The track's parent is the clipping container, which is what is actually
       on or off screen; the track itself is `width: max-content` and can be
       far wider than the viewport. */
    if (io && track.parentElement) io.observe(track.parentElement);

    return () => {
      io?.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimestampRef.current = null;
      hint(false);
    };
  }, [targetVelocity, seqWidth, isHovered, hoverSpeed, trackRef]);
}

export const LogoLoop = memo(function LogoLoop({
  logos,
  speed = 120,
  direction = "left",
  width = "100%",
  logoHeight = 28,
  gap = 32,
  pauseOnHover = true,
  hoverSpeed,
  fadeOut = false,
  scaleOnHover = false,
  ariaLabel = "Partner logos",
  className,
  style,
}: LogoLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef<HTMLUListElement>(null);

  const [seqWidth, setSeqWidth] = useState(0);
  /* ONE COPY IN THE SERVER HTML, THE REST AFTER MOUNT.

     The copies only matter once the track moves, and it only moves from the
     animation loop, which needs hydration anyway. Until then the first
     sequence sits still at offset 0, and one sequence is already wider than
     its rail, so a second copy in the HTML is bytes nobody can see: on the
     homepage it was 72 more inline SVGs, about a fifth of the document, on
     the critical path of every first visit. `updateDimensions` raises this
     to the real count on mount, before the first animated frame. */
  const [copyCount, setCopyCount] = useState<number>(1);
  const [isHovered, setIsHovered] = useState(false);

  const effectiveHoverSpeed = useMemo(() => {
    if (hoverSpeed !== undefined) return hoverSpeed;
    return pauseOnHover ? 0 : undefined;
  }, [hoverSpeed, pauseOnHover]);

  const targetVelocity = useMemo(() => {
    const magnitude = Math.abs(speed);
    const directionMultiplier = direction === "left" ? 1 : -1;
    const speedMultiplier = speed < 0 ? -1 : 1;
    return magnitude * directionMultiplier * speedMultiplier;
  }, [speed, direction]);

  const updateDimensions = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const sequenceWidth =
      seqRef.current?.getBoundingClientRect?.().width ?? 0;
    if (sequenceWidth > 0) {
      setSeqWidth(Math.ceil(sequenceWidth));
      const copiesNeeded =
        Math.ceil(containerWidth / sequenceWidth) +
        ANIMATION_CONFIG.COPY_HEADROOM;
      setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
    }
  }, []);

  useEffect(() => {
    if (!window.ResizeObserver) {
      window.addEventListener("resize", updateDimensions);
      updateDimensions();
      return () => window.removeEventListener("resize", updateDimensions);
    }
    const observers = [containerRef, seqRef].map((ref) => {
      if (!ref.current) return null;
      const observer = new ResizeObserver(updateDimensions);
      observer.observe(ref.current);
      return observer;
    });
    updateDimensions();
    return () => observers.forEach((o) => o?.disconnect());
  }, [updateDimensions, logos, gap, logoHeight]);

  useAnimationLoop(
    trackRef,
    targetVelocity,
    seqWidth,
    isHovered,
    effectiveHoverSpeed
  );

  const cssVariables = useMemo(
    () =>
      ({
        "--logoloop-gap": `${gap}px`,
        "--logoloop-logoHeight": `${logoHeight}px`,
      }) as CSSProperties,
    [gap, logoHeight]
  );

  const rootClassName = useMemo(
    () =>
      [
        "logoloop",
        fadeOut && "logoloop--fade",
        scaleOnHover && "logoloop--scale-hover",
        className,
      ]
        .filter(Boolean)
        .join(" "),
    [fadeOut, scaleOnHover, className]
  );

  const handleMouseEnter = useCallback(() => {
    if (effectiveHoverSpeed !== undefined) setIsHovered(true);
  }, [effectiveHoverSpeed]);
  const handleMouseLeave = useCallback(() => {
    if (effectiveHoverSpeed !== undefined) setIsHovered(false);
  }, [effectiveHoverSpeed]);
  /* Focus pauses too. Tabbing to a link that is still sliding away is the
     keyboard equivalent of chasing a moving target, and pauseOnHover alone
     never fires for anyone not using a pointer. */
  const handleFocus = useCallback(() => {
    if (effectiveHoverSpeed !== undefined) setIsHovered(true);
  }, [effectiveHoverSpeed]);
  const handleBlur = useCallback(() => {
    if (effectiveHoverSpeed !== undefined) setIsHovered(false);
  }, [effectiveHoverSpeed]);

  const renderLogoItem = useCallback((item: LogoLoopItem, key: string) => {
    const content = (
      <span
        className="logoloop__node"
        aria-hidden={!!item.href && !item.ariaLabel}
        title={item.title}
      >
        {item.node}
      </span>
    );
    const itemAriaLabel = item.ariaLabel ?? item.title;
    // Only an off-site link should open a new tab: an in-page anchor or an
    // internal route that does so is a bug, not a convenience.
    const external = !!item.href && /^https?:\/\//i.test(item.href);
    const itemContent = item.href ? (
      <a
        className="logoloop__link"
        href={item.href}
        aria-label={itemAriaLabel || "logo link"}
        {...(external ? { target: "_blank", rel: "noreferrer noopener" } : null)}
      >
        {content}
      </a>
    ) : (
      content
    );
    return (
      <li className="logoloop__item" key={key} role="listitem">
        {itemContent}
      </li>
    );
  }, []);

  const logoLists = useMemo(
    () =>
      Array.from({ length: copyCount }, (_, copyIndex) => (
        <ul
          className="logoloop__list"
          key={`copy-${copyIndex}`}
          role="list"
          aria-hidden={copyIndex > 0}
          /* `copy > 0` are the duplicated tracks that make the loop seamless.
             They are aria-hidden, but hiding an element from assistive tech does
             NOT take it out of the tab order: without this, tabbing through the
             marquee walked every link two or three times over, into copies a
             screen reader had been told do not exist. `inert` removes the whole
             subtree from focus in one attribute. */
          /* React 19 takes `inert` as a real boolean. Passing the empty string
             instead — the raw HTML form — is FALSY to React, so the attribute
             was silently dropped and the duplicates stayed focusable. */
          inert={copyIndex > 0}
          ref={copyIndex === 0 ? seqRef : undefined}
        >
          {logos.map((item, itemIndex) =>
            renderLogoItem(item, `${copyIndex}-${itemIndex}`)
          )}
        </ul>
      )),
    [copyCount, logos, renderLogoItem]
  );

  const containerStyle = useMemo(
    () => ({
      width: toCssLength(width) ?? "100%",
      ...cssVariables,
      ...style,
    }),
    [width, cssVariables, style]
  );

  return (
    <div
      ref={containerRef}
      className={rootClassName}
      style={containerStyle}
      role="region"
      aria-label={ariaLabel}
    >
      <div
        className="logoloop__track"
        ref={trackRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
      >
        {logoLists}
      </div>
    </div>
  );
});

export default LogoLoop;
