"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { GalleryPiece } from "@/lib/work";

/**
 * Branding and social are walls of finished artwork, not case studies.
 *
 * A flyer has no brief, approach and outcome behind it that could fill a
 * detail page, so a click enlarges the piece in place rather than navigating
 * to a page that would have nothing on it but the same image bigger.
 *
 * The dialog is a real one: Escape closes it, focus moves into it on open and
 * back to the tile that opened it on close, and the page behind it cannot be
 * scrolled or tabbed into while it is up.
 */
export function GalleryWall({ pieces }: { pieces: GalleryPiece[] }) {
  const [open, setOpen] = useState<GalleryPiece | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(null);
    // back to the tile that opened it, or a keyboard visitor is dumped at the
    // top of a hundred-tile wall with no idea where they were
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    // Lenis owns the scroll position, so hiding overflow alone does not stop
    // the page moving underneath the dialog.
    const lenis = window.__lenis;
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => closeBtn.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
      lenis?.start();
    };
  }, [open, close]);

  return (
    <>
      <div className="wk-grid">
        {pieces.map((p) => (
          <button
            type="button"
            className="wk-card wk-art"
            key={p.id}
            onClick={(e) => { opener.current = e.currentTarget; setOpen(p); }}
            aria-haspopup="dialog"
          >
            <span className="wk-card__shot">
              { }
              <Image
                src={p.src}
                alt={p.title}
                fill
                sizes="(max-width: 560px) 50vw, (max-width: 1000px) 33vw, 25vw"
                quality={78}
              />
            </span>
            <span className="wk-card__body">
              <span className="wk-card__t">{p.title}</span>
              <span className="wk-card__meta">
                <span className="wk-chip">{p.kind}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {open ? (
        <div
          className="wk-lb"
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          // clicking the scrim closes; clicking the artwork inside does not
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <button
            type="button"
            className="wk-lb__x"
            onClick={close}
            ref={closeBtn}
            aria-label="Close"
          >
            ×
          </button>
          <figure className="wk-lb__fig">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.src} alt={open.title} />
            <figcaption className="wk-lb__cap">
              {open.title}
              <span>{open.kind}</span>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}

export default GalleryWall;
