"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { LogoGlyph } from "@/components/ui/logo-glyph";
import { INTRO_LOGOS } from "@/lib/logos";
import type { LogoEntry } from "@/lib/logos";

type AnimationPhase = "scatter" | "line" | "circle";

const TILE = 76;
const TOTAL = INTRO_LOGOS.length;
const MAX_SCROLL = 3000;
// Touch screens deliver much smaller deltas per gesture than desktop wheels,
// so scale touch travel up — otherwise shuffling through the arc takes
// several long swipes on mobile.
//
// Derived from the screen rather than fixed. At a flat multiplier of 3 the arc
// needed 1000px of finger travel to clear, which is about three full swipes on
// a 844px phone and MORE on a small one — the shorter the screen, the longer
// the intro, which is exactly backwards. Expressing the budget as a fraction of
// screen height instead means it costs the same gesture or so on every device.
const TOUCH_SCREENS = 0.75;
const touchMultiplier = () =>
  MAX_SCROLL / Math.max(280, (window.innerHeight || 800) * TOUCH_SCREENS);
// Timestamp of the last time the intro was seen. The intro only replays
// after the viewer has been away for INTRO_TTL_MS — a returning visitor
// within the window goes straight to the page. Kept in sync with the
// blocking script in app/layout.tsx (same key + TTL).
const STORAGE_KEY = "wdc-intro-seen-at";
const INTRO_TTL_MS = 30 * 60 * 1000;

function markIntroSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}

const lerp = (start: number, end: number, t: number) =>
  start * (1 - t) + end * t;

interface TileTarget {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}

function LogoTile({
  entry,
  target,
}: {
  entry: LogoEntry;
  target: TileTarget;
}) {
  return (
    <motion.div
      animate={{
        x: target.x,
        y: target.y,
        rotate: target.rotation,
        scale: target.scale,
        opacity: target.opacity,
      }}
      transition={{ type: "spring", stiffness: 40, damping: 15 }}
      style={{
        position: "absolute",
        width: TILE,
        height: TILE,
        transformStyle: "preserve-3d",
        perspective: "1000px",
        willChange: "transform, opacity",
      }}
      className="group cursor-pointer"
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ rotateY: 180 }}
      >
        {/* Front: the tool logo */}
        <div
          className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
          style={{ backfaceVisibility: "hidden" }}
        >
          <LogoGlyph entry={entry} className="h-9 w-9" />
        </div>

        {/* Back: the tool name */}
        <div
          className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-secondary/40 bg-primary p-2 shadow-lg"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-center font-heading text-[10px] font-semibold leading-tight text-white">
            {entry.name}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Full-screen intro: logo tiles scatter in, snap to a line, form a circle,
 * then morph on (virtual) scroll into a bottom arc that shuffles — and
 * finally releases, handing the viewer to the hero whose marquee carries
 * the same logos. Plays once per browser session.
 */
// Decide once, client-side. The blocking script in <head> already made
// this call (and set data-intro) before first paint so the hero never
// flashes underneath — mirror its decision; fall back to computing it
// if the script didn't run.
function getIntroDecision(): boolean {
  if (typeof document === "undefined") return false;
  const decided = document.documentElement.dataset.intro;
  let play: boolean;
  if (decided === "play" || decided === "skip") {
    play = decided === "play";
  } else {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = 0;
    try {
      seen = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0;
    } catch {}
    play = !reduce && (!seen || Date.now() - seen > INTRO_TTL_MS);
    document.documentElement.dataset.intro = play ? "play" : "skip";
  }
  // Returning visitor: refresh the timestamp so the away-window slides.
  if (!play) markIntroSeen();
  return play;
}

export default function IntroAnimation() {
  const [releasing, setReleasing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const releasingRef = useRef(false);

  // Server renders `active = null` (intro hidden); on the client the
  // blocking head script has already stamped the decision, so this flips
  // to a boolean in the same render, avoiding a paint flash. Since the
  // decision is immutable once made, subscribe is a no-op.
  const active = useSyncExternalStore(
    () => () => {},
    getIntroDecision,
    () => null
  );

  // Lock page scroll while the overlay owns the viewport (including during exit
  // transition). `finished` is load-bearing in the dependency list: the intro
  // stops RENDERING when it finishes but stays MOUNTED, so an effect keyed on
  // `active` alone never cleans up and the page stays unscrollable for the rest
  // of the visit. Releasing on `finished` is what hands scrolling back.
  useEffect(() => {
    if (!active || finished) return;
    /* Set, do not save-and-restore. Saving the previous value looks careful but
       is the bug: React invokes an effect, cleans it up and invokes it again,
       so the second run captures the value the FIRST run wrote ("hidden") and
       its cleanup faithfully puts it back — leaving the page unscrollable for
       good once the intro is gone. The intro is the only thing holding this
       lock while it plays, so clearing it outright is both simpler and the only
       version that survives being run twice. */
    document.body.style.overflow = "hidden";
    // Halt Lenis so it doesn't accumulate a scroll target from the intro's
    // wheel/touch input and fling the page to the bottom on hand-off.
    window.__lenis?.stop();
    window.scrollTo(0, 0);

    const preventScroll = () => {
      if (document.body.style.overflow === "hidden") {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("scroll", preventScroll);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("scroll", preventScroll);
      // Pin both native and Lenis scroll to the top, then resume smooth scroll.
      window.scrollTo(0, 0);
      window.__lenis?.scrollTo(0, { immediate: true, force: true });
      window.__lenis?.start();
    };
  }, [active, finished]);

  // --- Container size ---
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    setContainerSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => observer.disconnect();
  }, [active]);

  // --- Virtual scroll ---
  const virtualScroll = useMotionValue(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const release = () => {
      if (releasingRef.current) return;
      releasingRef.current = true;
      markIntroSeen();
      // Lift the pre-paint cover so the hero is revealed as the intro exits.
      document.documentElement.dataset.intro = "done";
      setReleasing(true);
    };

    const advance = (delta: number) => {
      if (releasingRef.current) return;
      const next = Math.min(
        Math.max(scrollRef.current + delta, 0),
        MAX_SCROLL
      );
      scrollRef.current = next;
      virtualScroll.set(next);
      // Arc fully shuffled + a push further → hand off to the page.
      if (next >= MAX_SCROLL && delta > 0) release();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      advance(e.deltaY);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      advance((touchStartY - touchY) * touchMultiplier());
      touchStartY = touchY;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [active, virtualScroll]);

  // Morph: circle → bottom arc (scroll 0–600)
  const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
  const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });
  // Shuffle: rotate the arc (scroll 600–3000)
  const scrollRotate = useTransform(virtualScroll, [600, MAX_SCROLL], [0, 360]);
  const smoothScrollRotate = useSpring(scrollRotate, {
    stiffness: 40,
    damping: 20,
  });

  // --- Mouse parallax ---
  const mouseX = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normalizedX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseX.set(normalizedX * 100);
    };
    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [active, mouseX]);

  // --- Intro sequence: scatter → line → circle ---
  useEffect(() => {
    if (!active) return;
    const timer1 = setTimeout(() => setIntroPhase("line"), 500);
    const timer2 = setTimeout(() => setIntroPhase("circle"), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [active]);

  // Scatter targets are generated once (lazily) so they're stable across
  // re-renders — but not during render, satisfying React purity rules.
  const [scatterPositions] = useState(() =>
    INTRO_LOGOS.map(() => ({
      x: (Math.random() - 0.5) * 1500,
      y: (Math.random() - 0.5) * 1000,
      rotation: (Math.random() - 0.5) * 180,
      scale: 0.6,
      opacity: 0,
    }))
  );

  // --- Render values ---
  const [morphValue, setMorphValue] = useState(0);
  const [rotateValue, setRotateValue] = useState(0);
  const [parallaxValue, setParallaxValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const u1 = smoothMorph.on("change", setMorphValue);
    const u2 = smoothScrollRotate.on("change", setRotateValue);
    const u3 = smoothMouseX.on("change", setParallaxValue);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [active, smoothMorph, smoothScrollRotate, smoothMouseX]);

  const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
  const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

  /* The opening line sits in the HOLE of the logo ring, so its width cap has to
     come from the ring itself. The tiles below are placed at `circleRadius`
     with a TILE-wide face, which leaves a clear diameter of
     2 * (circleRadius - TILE / 2); 0.82 of that keeps the copy off the curve,
     since text lays out in a rectangle and the hole is a circle. On a phone
     that is ~175px, so the heading wraps to two lines instead of running out
     under the tiles. Undefined until the container is measured, so the first
     paint is uncapped rather than zero-width. */
  const ringRadius = Math.min(
    Math.min(containerSize.width, containerSize.height) * 0.35,
    350
  );
  const ringHole = containerSize.width
    ? Math.max(0, (ringRadius - TILE / 2) * 2 * 0.82)
    : 0;
  const ringHoleWidth = ringHole || undefined;
  /* Type scales WITH the hole rather than at breakpoints. A 320px phone leaves
     ~121px of clear width and a desktop ~454px, and no set of breakpoints gets
     both right for long — sizing off the same measurement that draws the ring
     does, at every width in between. The divisors are the ratios that keep the
     heading to two lines and the caption to one. */
  const headingSize = ringHole
    ? `${Math.min(48, Math.max(14, ringHole / 8))}px`
    : undefined;
  const captionSize = ringHole
    ? `${Math.min(12, Math.max(8, ringHole / 16))}px`
    : undefined;

  if (!active || finished) return null;

  return (
    <AnimatePresence onExitComplete={() => setFinished(true)}>
      {!releasing ? (
        <motion.div
          key="intro"
          ref={containerRef}
          exit={{ opacity: 0, y: "-12vh", transition: { duration: 0.7, ease: "easeInOut" } }}
          className="fixed inset-0 z-[100] overflow-hidden bg-background"
        >
          <div className="flex h-full w-full flex-col items-center justify-center">
            {/* Opening statement (fades as the circle morphs) */}
            <div
              className="pointer-events-none absolute top-1/2 z-0 flex -translate-y-1/2 flex-col items-center justify-center text-center"
              style={{ maxWidth: ringHoleWidth }}
            >
              <motion.h1
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={
                  introPhase === "circle" && morphValue < 0.5
                    ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" }
                    : { opacity: 0, filter: "blur(10px)" }
                }
                transition={{ duration: 1 }}
                style={{ fontSize: headingSize }}
                className="font-heading text-xl font-bold tracking-tight md:text-5xl"
              >
                We Dig <span className="text-secondary">Creativity</span>.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={
                  introPhase === "circle" && morphValue < 0.5
                    ? { opacity: 0.6 - morphValue }
                    : { opacity: 0 }
                }
                transition={{ duration: 1, delay: 0.2 }}
                style={{ fontSize: captionSize }}
                className="mt-3 text-[10px] font-bold tracking-[0.14em] text-muted md:mt-4 md:text-xs md:tracking-[0.25em]"
              >
                SCROLL TO EXPLORE
              </motion.p>
            </div>

            <motion.div
              style={{ opacity: contentOpacity, y: contentY }}
              className="pointer-events-none absolute top-[20%] z-10 flex flex-col items-center justify-center px-6 text-center md:top-[22%] xl:top-[25%]"
            >
              <h2 className="mb-6 font-heading text-4xl font-bold tracking-tight text-foreground md:text-6xl xl:text-7xl 2xl:text-[5.5rem]">
                Most brands are buried.
              </h2>
              {/* foreground, not muted: this paragraph is the intro's one piece of real
                  copy, and it reads at full contrast in both themes (near-black on
                  light, near-white on dark). The orange service names stay accent. */}
              <p className="max-w-xl text-base leading-relaxed text-foreground md:text-lg xl:max-w-4xl xl:text-2xl">
                Whether you&apos;re underground, fighting for visibility, shaping a new concept, or scaling an established brand; we’ve got you. Through elite <strong className="font-bold text-secondary">Branding & Design</strong>, full-stack <strong className="font-bold text-secondary">Web & App Development</strong>, dominant <strong className="font-bold text-secondary">SEO</strong>, strategic <strong className="font-bold text-secondary">Social Media</strong>, and results-driven <strong className="font-bold text-secondary">PPC & Growth Marketing</strong>. Keep scrolling to meet We Dig Creativity
              </p>
            </motion.div>

            {/* Logo tiles */}
            <div className="relative flex h-full w-full items-center justify-center">
              {INTRO_LOGOS.map((entry, i) => {
                let target: TileTarget = {
                  x: 0,
                  y: 0,
                  rotation: 0,
                  scale: 1,
                  opacity: 1,
                };

                if (introPhase === "scatter") {
                  target = scatterPositions[i];
                } else if (introPhase === "line") {
                  const lineSpacing = TILE + 12;
                  const lineTotalWidth = TOTAL * lineSpacing;
                  target = {
                    x: i * lineSpacing - lineTotalWidth / 2,
                    y: 0,
                    rotation: 0,
                    scale: 1,
                    opacity: 1,
                  };
                } else {
                  const isMobile = containerSize.width < 768;
                  const minDimension = Math.min(
                    containerSize.width,
                    containerSize.height
                  );

                  // A. circle
                  const circleRadius = Math.min(minDimension * 0.35, 350);
                  const circleAngle = (i / TOTAL) * 360;
                  const circleRad = (circleAngle * Math.PI) / 180;
                  const circlePos = {
                    x: Math.cos(circleRad) * circleRadius,
                    y: Math.sin(circleRad) * circleRadius,
                    rotation: circleAngle + 90,
                  };

                  // B. bottom arc ("rainbow", apex up)
                  const baseRadius = Math.min(
                    containerSize.width,
                    containerSize.height * 1.5
                  );
                  const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);
                  const arcApexY = containerSize.height * (isMobile ? 0.35 : 0.25);
                  const arcCenterY = arcApexY + arcRadius;
                  const spreadAngle = isMobile ? 100 : 130;
                  const startAngle = -90 - spreadAngle / 2;
                  const step = spreadAngle / (TOTAL - 1);

                  const scrollProgress = Math.min(
                    Math.max(rotateValue / 360, 0),
                    1
                  );
                  const maxRotation = spreadAngle * 0.8;
                  const boundedRotation = -scrollProgress * maxRotation;

                  const currentArcAngle =
                    startAngle + i * step + boundedRotation;
                  const arcRad = (currentArcAngle * Math.PI) / 180;
                  const arcPos = {
                    x: Math.cos(arcRad) * arcRadius + parallaxValue,
                    y: Math.sin(arcRad) * arcRadius + arcCenterY,
                    rotation: currentArcAngle + 90,
                    scale: isMobile ? 1.15 : 1.45,
                  };

                  // C. interpolate
                  target = {
                    x: lerp(circlePos.x, arcPos.x, morphValue),
                    y: lerp(circlePos.y, arcPos.y, morphValue),
                    rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
                    scale: lerp(1, arcPos.scale, morphValue),
                    opacity: 1,
                  };
                }

                return <LogoTile key={entry.id} entry={entry} target={target} />;
              })}
            </div>

            {/* Skip affordance */}
            <button
              type="button"
              onClick={() => {
                releasingRef.current = true;
                markIntroSeen();
                document.documentElement.dataset.intro = "done";
                setReleasing(true);
              }}
              className="absolute bottom-6 right-6 z-20 rounded-full border border-line px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted transition-colors hover:border-secondary hover:text-secondary"
            >
              Skip intro
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
