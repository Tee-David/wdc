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

/**
 * How long the frame gets before we stop waiting for it.
 *
 * Was 4000. That is a long time to look at a placeholder, and it was being
 * spent twice: the reachability probe below used to run AFTER `load` fired, so
 * a site that framed fine still paid a second full round trip to the same host
 * before the modal would admit it had worked. The probe now starts the moment
 * the modal opens, in parallel with the frame, so by the time `load` arrives
 * the answer is usually already in hand — and a probe that REJECTS early drops
 * straight to the capture without waiting out the timer at all.
 */
/* TEN SECONDS, not the 2,600ms this was.
   The timeout is a BACKSTOP for a frame that never reports either way, and at
   2.6s it was firing on sites that simply had not finished loading yet --
   third-party origins on a cold connection routinely take longer than that.
   The result was a modal telling the reader a site refuses to be embedded when
   the site was about to embed perfectly well. Ten seconds is long enough that
   reaching it means something is genuinely wrong, and the frame keeps loading
   behind the message either way, so a late success still wins. */
const GRACE = 10000;

export default function SiteModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  /* Four states, because "we could not show it" and "it refuses to be shown"
   are different claims and only one of them is ever proven.
     loading  the frame has not reported yet
     live     it framed
     blocked  ESTABLISHED refusal: the server-side header check said no
     slow     the backstop timer ran out, which proves nothing about policy */
  const [state, setState] = useState<"loading" | "live" | "blocked" | "slow">("loading");
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

  /* THE POLICY CHECK, started immediately and in parallel with the frame.
     `/api/embeddable` reads the target's `X-Frame-Options` and CSP
     `frame-ancestors` server-side, which is the only place they are readable —
     see the note in that route about why no client-side signal can tell a
     refused frame from a working one.

     Three answers: true (frame it), false (go straight to the capture and never
     flash the browser's grey refusal), or null (our own check could not reach
     the host, so fall back to the frame's own behaviour rather than declare a
     site unframeable because our network had a moment). */
  const policy = useRef<Promise<boolean | null> | null>(null);
  if (policy.current === null) {
    policy.current = fetch(`/api/embeddable?url=${encodeURIComponent(project.url)}`)
      .then((r) => r.json())
      .then((d: { embeddable?: boolean | null }) => d.embeddable ?? null)
      .catch(() => null);
  }

  /* AND a reachability probe, because the two catch different failures and
     neither covers the other. The policy check answers "would this site let us
     frame it"; it says nothing about whether the host is up right now. A dead
     host still fires `load` on the browser's error page, which throws on the
     location read exactly like a real cross-origin frame — so without this,
     an unreachable site reports itself as a live preview. Opaque by design:
     the response tells us nothing except that something answered. */
  const reachable = useRef<Promise<boolean> | null>(null);
  if (reachable.current === null) {
    reachable.current = fetch(project.url, { mode: "no-cors", cache: "no-store" })
      .then(() => true)
      .catch(() => false);
  }

  /* Warm the connection before the frame asks for it. DNS, TCP and TLS to
     somebody else's origin is most of the wait on a slow link, and doing it
     here overlaps it with the modal's own open animation instead of putting it
     in front of the first byte. */
  useEffect(() => {
    const origin = new URL(project.url).origin;
    const links = (["preconnect", "dns-prefetch"] as const).map((rel) => {
      const l = document.createElement("link");
      l.rel = rel;
      l.href = origin;
      l.crossOrigin = "anonymous";
      document.head.appendChild(l);
      return l;
    });
    return () => links.forEach((l) => l.remove());
  }, [project.url]);

  /* The race. Cleared on load, so a site that frames fine never shows the
     fallback even if it is slow — and short-circuited the moment the probe
     says the host is not answering, because nothing is going to paint. */
  useEffect(() => {
    /* `slow` is not settled: the frame is still loading behind the note and a
       late `load` event can still promote it to `live`. Only `live` and
       `blocked` are final. */
    if (state === "live" || state === "blocked") return;
    let live = true;
    /* `slow`, not `blocked`. Running out of patience is not evidence of a
       framing policy, and saying otherwise puts a false statement about
       somebody else's site in front of the reader. */
    const t = window.setTimeout(() => { if (live) setState("slow"); }, GRACE);
    /* A definite NO settles it before the frame has finished failing, which is
       the difference between a preview that resolves and one that flashes an
       error page on its way to the capture. */
    policy.current?.then((ok) => {
      if (live && ok === false) setState("blocked");
    });
    reachable.current?.then((up) => {
      if (live && !up) setState("blocked");
    });
    return () => { live = false; window.clearTimeout(t); };
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
    /* The server's answer wins where it has one, because the frame's own
       signals cannot tell "framed successfully" from "refused and showing an
       error page". Where it has none (null — host unreachable from our server)
       we keep the frame's reading, which is all there is. */
    const [allowed, up] = await Promise.all([policy.current, reachable.current]);
    /* A host that is not answering cannot be a live preview whatever its
       framing policy says, so reachability is the first veto. */
    if (!up) embedded = false;
    else if (allowed === false) embedded = false;
    else if (allowed === true) embedded = true;
    setState(embedded ? "live" : "blocked");
  }, []);

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

        <div data-lenis-prevent className={`pv-modal__view${state === "blocked" ? " is-shot" : ""}`}>
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

          {state === "blocked" || state === "slow" ? (
            <div className="pv-modal__note">
              <p>
                {state === "blocked"
                  ? `${project.name} does not allow itself to be embedded, so this is the capture. The live site is one click away.`
                  : `${project.name} is taking a while to load in here. This is the capture meanwhile, and the live site is one click away.`}
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
