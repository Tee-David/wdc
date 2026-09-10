"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/projects";

/**
 * Live preview of a client site, in a modal, without leaving this one.
 *
 * The cards used to be plain outbound links, which is a strange thing for a
 * portfolio to do: the one moment a visitor is most interested is the moment
 * you send them somewhere else. This keeps them here and still lets them poke
 * at the real, live site.
 *
 * Three things this has to survive, because an <iframe> pointed at somebody
 * else's domain is not a solved problem:
 *
 *  1. THE SITE MAY REFUSE TO BE FRAMED. `X-Frame-Options: DENY` and CSP
 *     `frame-ancestors` are common, and a refused frame is NOT silent-but-idle:
 *     it fires `load` exactly like a successful one, so trusting that event
 *     paints the browser's own grey error page over the screenshot and calls it
 *     a live preview. `frameLoaded` below is the discriminator that actually
 *     works. A frame that really navigated cross-origin makes
 *     `contentWindow.location.href` THROW a SecurityError; a frame that was
 *     refused never left `about:blank`, which is same-origin, so the read
 *     succeeds and hands back that string. Throwing means it worked; answering
 *     means it did not. The `GRACE` timer stays as the backstop for a frame
 *     that never fires `load` at all.
 *  2. THE SCREENSHOT IS THE FLOOR, NOT A SPINNER. It is a real capture of that
 *     page, so the modal is never empty and never worse than the card was.
 *  3. IT IS A DIALOG, SO IT BEHAVES LIKE ONE. Escape closes it, the backdrop
 *     closes it, focus moves in on open and back to the card on close, the page
 *     behind it does not scroll, and it is announced as a modal.
 */

/** How long the frame gets to paint before we stop waiting for it. */
const GRACE = 4000;

export default function SiteModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const [state, setState] = useState<"loading" | "live" | "blocked">("loading");
  const panel = useRef<HTMLDivElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement | null>(null);

  const host = (() => {
    try { return new URL(project.url).host.replace(/^www\./, ""); }
    catch { return project.url; }
  })();

  /* Escape, and a focus trap simple enough to be obviously correct: Tab cycles
     within the panel because there is nothing else on the page to reach. */
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key !== "Tab" || !panel.current) return;
    const focusable = panel.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    /* Lock the page behind the modal — but only if it is not ALREADY locked by
       something else. The intro loader holds the same lock while it plays, and
       a save-then-restore would hand that lock's release back to whichever of
       us unmounted last: close the modal after the intro finished and the page
       would be frozen for good. Touching nothing when someone else owns the
       lock cannot get that wrong. The padding compensates for the scrollbar
       going away, or the whole page shifts sideways as the modal opens. */
    const held = document.body.style.overflow === "hidden";
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (!held) {
      document.body.style.overflow = "hidden";
      if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    }
    closeBtn.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      if (!held) {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
    };
  }, [onKey]);

  /* The race described above. Cleared on load, so a site that frames fine never
     shows the fallback even if it is slow. */
  useEffect(() => {
    if (state !== "loading") return;
    const t = window.setTimeout(() => setState("blocked"), GRACE);
    return () => window.clearTimeout(t);
  }, [state]);

  /* See (1) above: a throw is the success signal here, not the failure one.
     But a throw alone is not ENOUGH. A frame whose load simply failed — the
     site is down, DNS is gone, the visitor is offline — holds the browser's own
     error page, which is also cross-origin and therefore also throws. Trusting
     the throw there paints a grey "this page can't be reached" over the capture
     and calls it a live preview.
     So reachability is checked separately, with a no-cors fetch: the response
     is opaque and tells us nothing about its status, which does not matter —
     what matters is that it RESOLVES for a host that answered and REJECTS for
     one that did not. Frame refused (still about:blank) or host unreachable
     both land on the capture, which is the honest thing to show for either. */
  const frameLoaded = useCallback(async (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    let embedded = false;
    try {
      const href = e.currentTarget.contentWindow?.location?.href;
      embedded = !!href && href !== "about:blank";
    } catch {
      embedded = true;
    }
    if (embedded) {
      try {
        await fetch(project.url, { mode: "no-cors", cache: "no-store" });
      } catch {
        embedded = false;
      }
    }
    setState(embedded ? "live" : "blocked");
  }, [project.url]);

  return (
    <div className="pv-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="pv-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${project.name} — live preview`}
        ref={panel}
      >
        <header className="pv-modal__bar">
          <span className="pv-modal__lights" aria-hidden="true"><i /><i /><i /></span>
          <span className="pv-modal__url">
            <span className="pv-modal__name">{project.name}</span>
            <span className="pv-modal__host">{host}</span>
          </span>
          <a
            className="pv-modal__open"
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open live
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
          </a>
          <button
            type="button"
            className="pv-modal__x"
            onClick={onClose}
            aria-label="Close preview"
            ref={closeBtn}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className={`pv-modal__view${state === "blocked" ? " is-shot" : ""}`}>
          {/* the real capture, underneath: the modal is never blank, and it is
              what remains if the site refuses to be framed */}
          {/* Once the frame is refused this becomes a SCROLLABLE full-page
              capture rather than a cropped header. A blocked preview is then
              still the whole page, which is most of what the visitor came for.
              Falls back to the cover where no long capture exists yet. */}
          {project.cover || project.long ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              className="pv-modal__shot"
              src={(state === "blocked" && project.long) || project.cover}
              alt={`${project.name} website`}
            />
          ) : null}

          <iframe
            className={`pv-modal__frame${state === "live" ? " is-live" : ""}`}
            src={project.url}
            title={`${project.name} live site`}
            loading="eager"
            /* Let the site behave like a site, but not like a parent: no
               top-navigation, so it cannot yank the visitor out of this page. */
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={frameLoaded}
          />

          {state === "loading" ? (
            <span className="pv-modal__wait" aria-hidden="true"><i /><i /><i /></span>
          ) : null}

          {state === "blocked" ? (
            <div className="pv-modal__note">
              <p>
                {project.name} does not allow itself to be embedded, so this is
                the capture. The live site is one click away.
              </p>
              <a className="pv-btn pv-btn--accent" href={project.url} target="_blank" rel="noopener noreferrer">
                Open {host}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
