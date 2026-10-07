"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { MOTION_PIECES, type MotionPiece } from "@/lib/motion-work";

/**
 * Motion work as muted four second loops.
 *
 * Nothing here is on the critical path. A video loads only once its card is
 * near the screen (`preload="none"` until then, poster first), plays while it
 * is on screen and stops the moment it is not, and does not start by itself
 * for a visitor who asked for reduced motion. Because a loop that never ends
 * is moving content, every card carries a real pause and play button, 44px,
 * which is also how a reduced-motion visitor starts one.
 */
function Card({ piece }: { piece: MotionPiece }) {
  const box = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  /* A person who pressed pause has made a choice that scrolling must not undo. */
  const chosen = useRef<"play" | "pause" | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = box.current;
    const v = video.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (v.preload === "none") v.preload = "auto";
        if (chosen.current === "pause" || (reduced.current && chosen.current !== "play")) return;
        void v.play().catch(() => { /* blocked: the poster and the button remain */ });
      } else {
        v.pause();
      }
    }, { rootMargin: "120px", threshold: 0.35 });
    io.observe(el);
    const hidden = () => { if (document.hidden) v.pause(); };
    document.addEventListener("visibilitychange", hidden);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", hidden); };
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) { chosen.current = "play"; v.preload = "auto"; void v.play().catch(() => {}); }
    else { chosen.current = "pause"; v.pause(); }
  };

  return (
    <figure className="wk-motion__card">
      <div className="wk-motion__box" ref={box} style={{ aspectRatio: `${piece.width} / ${piece.height}` }}>
        <video
          ref={video}
          muted loop playsInline preload="none"
          poster={piece.poster}
          width={piece.width} height={piece.height}
          aria-label={piece.alt}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          <source src={piece.src} type="video/mp4" />
        </video>
        <button
          type="button" className="wk-motion__btn" onClick={toggle}
          aria-label={`${playing ? "Pause" : "Play"} ${piece.title}`}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
      </div>
      <figcaption className="wk-motion__cap">
        <span className="wk-motion__t">{piece.title}</span>
        <span className="wk-card__meta">
          <span className="wk-chip">{piece.kind}</span>
          <span className="wk-chip wk-chip--quiet">{piece.client}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export default function MotionWall({ pieces = MOTION_PIECES }: { pieces?: MotionPiece[] }) {
  const wide = pieces.filter((p) => p.width > p.height);
  const tall = pieces.filter((p) => p.width <= p.height);
  return (
    <div className="wk-motion">
      {wide.length ? <div className="wk-motion__wide">{wide.map((p) => <Card key={p.id} piece={p} />)}</div> : null}
      {tall.length ? <div className="wk-motion__tall">{tall.map((p) => <Card key={p.id} piece={p} />)}</div> : null}
    </div>
  );
}
