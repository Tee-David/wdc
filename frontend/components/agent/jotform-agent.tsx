"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The project chat: our own launcher and panel, with Jotform's agent running
 * inside an iframe.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO LONGER A JOTFORM SCRIPT ON THIS PAGE.
 *
 * The previous version loaded Jotform's official embed on intent, waited for
 * its launcher to appear in our DOM, and clicked it. It stopped working, and
 * the way it failed is the reason it is gone rather than patched: the button
 * said "Starting the chat…" and stayed there. Forever. There was no timeout,
 * no failure path, and nothing the reader could do about it.
 *
 * Three things were wrong, and only one of them was fixable:
 *
 *  1. IT DEPENDED ON A CLASS NAME INSIDE A MINIFIED VENDOR BUNDLE. We watched
 *     document.body for `.ai-agent-chat-avatar-container` and clicked it. That
 *     class is an implementation detail of a 6.3MB file we do not control and
 *     cannot version-pin -- the URL has no version in it, so their next deploy
 *     is our next deploy. Rename it, mount it in a shadow root, or change when
 *     it appears, and our handoff silently never happens.
 *  2. IT CLICKED THE LAUNCHER THE INSTANT IT APPEARED, which is not the same
 *     moment its own handlers are attached.
 *  3. THERE WAS NO WAY TO GIVE UP. An ad blocker -- and chat widgets are among
 *     the most commonly blocked things on the web -- leaves that request
 *     hanging rather than failing, so `onError` never fires either.
 *
 * WHAT THE VENDOR RUNTIME ACTUALLY DID FOR US. Reading it: it appends a div,
 * draws a launcher and a panel, and puts `https://www.jotform.com/agent/<id>`
 * in an iframe inside that panel. We already have a launcher -- 3.5KB of
 * avatar. So the panel is ours now and the iframe is the same one.
 *
 * WHAT THAT BUYS, and it is not a small amount:
 *
 *  - No third-party JavaScript on this page at all. Not deferred until intent,
 *    not loaded in the background: none. The chat's own code runs inside the
 *    iframe, which is a separate browsing context with its own event loop, so
 *    it cannot take main-thread time from our page, contend with our INP, or
 *    add a MutationObserver to our body.
 *  - A click costs one 102KB HTML document instead of a 6.3MB runtime that
 *    then fetches the same document anyway.
 *  - We own open, close, position, size, focus and failure. The timeout below
 *    is the part that fixes the reported bug whatever caused it: if the frame
 *    has not loaded, the panel says so and offers the contact form instead of
 *    pretending to be busy.
 *  - The Content-Security-Policy no longer has to allow ANY Jotform origin to
 *    run script, style or fetch on our document -- only to be framed. See the
 *    csp block in next.config.ts.
 *
 * THE TRADE, stated plainly. We lose the vendor's launcher behaviours we were
 * not using -- their pulse and greeting bubble (we draw our own), and
 * proactive auto-open (`autoOpenChatIn` was "0"). We also lose the
 * picture-in-picture handoff their embed wires up for voice calls; the agent
 * is configured `isVoice: false`, and re-implementing a vendor postMessage
 * protocol from a minified bundle is exactly the coupling this change exists
 * to remove. If voice popout is ever wanted, it is a message listener away and
 * should be written against their documentation, not their bundle.
 */

const AGENT_ID = "01a0907b3dd870008f3afa7ebca3bb7b4c1b";

/* `skipWelcome=1` is one of the two parameters Jotform's own generated embed
   passes. The other, `maximizable=1`, is deliberately NOT passed: it offers a
   maximise control that expects a parent listening for its message, and a
   control that does nothing is worse than no control. */
const AGENT_SRC = `https://www.jotform.com/agent/${AGENT_ID}?skipWelcome=1`;

/* THE AVATAR IS SERVED FROM HERE, NOT FROM JOTFORM, AND THIS IS NOT A
   MICRO-OPTIMISATION. Jotform's own avatar-icon URL 302s to a file that is
   2,459,310 bytes -- a 1254x1254 PNG -- for something drawn at 56x56, and it
   comes down their CDN at about 15 KB/s. Measured from here: 156 SECONDS for
   one decorative image, on every page, because this button is site chrome.
   Long enough that `window.load` never fired at all, which broke Lighthouse
   runs outright and made every "is the page ready" measurement unreliable.

   The same artwork, resized to what it is actually drawn at and re-encoded,
   is 3,552 bytes. That is the whole change: 2.35MB and 156s becomes 3.5KB. */
const AVATAR = "/brand/agent-avatar.webp";

/* Long enough that a slow phone on mobile data is not accused of being broken,
   short enough that nobody sits in front of a lie. Measured against the frame
   loading, not against the click, so arming early counts towards it. */
const STALL_AFTER_MS = 12_000;

export default function JotformAgent() {
  /* `armed` means the frame has been asked for. `open` means a person has
     asked to talk to someone. They are different decisions: reaching for the
     button starts the fetch, clicking it shows the result, and the click
     usually finds the frame already there. */
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [unreachable, setUnreachable] = useState(false);

  /* `load` FIRES FOR A BROWSER ERROR PAGE TOO, which is why readiness alone
     cannot be trusted. Blocked by an extension, the frame navigates to
     Chrome's "this site can't be reached", that document fires `load`, and a
     panel keyed on `load` would clear its loading state and present the error
     page as the conversation. Measured here with the request refused: `ready`
     went true, the state overlay disappeared, and what was left looked like
     the chat had opened and broken.

     So a failure the probe has established outranks `load`. */
  const failed = unreachable || stalled;

  const facadeRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* DNS and TLS to their origin, at idle, costing no bytes. On a high-latency
     connection the handshake alone is a few hundred milliseconds that would
     otherwise be spent after the tap. */
  useEffect(() => {
    const warm = () => {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = "https://www.jotform.com";
      link.crossOrigin = "";
      document.head.appendChild(link);
    };
    /* TypeScript's lib says this always exists. Safari only shipped it in
       16.4, and this site's audience is mostly phones, so the check stays --
       written as a typeof so the compiler can see why. */
    const hasIdle = typeof window.requestIdleCallback === "function";
    const id = hasIdle
      ? window.requestIdleCallback(warm, { timeout: 4000 })
      : window.setTimeout(warm, 2500);
    return () => {
      if (hasIdle) window.cancelIdleCallback?.(id);
      else window.clearTimeout(id);
    };
  }, []);

  /* A LIVENESS PROBE, BECAUSE THE FRAME CANNOT TELL US ANYTHING.

     A cross-origin frame is opaque: we cannot read its document, its status,
     or whether what it rendered is the agent or an error. A `no-cors` HEAD to
     the same URL can answer the one question that matters -- is this
     reachable from this browser at all -- because an opaque response resolves
     on any status and REJECTS on a network failure or a blocked request. It
     is the same URL, so an extension blocking the frame blocks this too.

     HEAD, so it is headers and nothing else; the frame still fetches the
     document itself. A server that refuses HEAD resolves opaquely anyway,
     which errs towards believing the chat works and falling back on the
     timeout below -- the safe direction. */
  useEffect(() => {
    if (!armed) return;
    let live = true;
    fetch(AGENT_SRC, { method: "HEAD", mode: "no-cors", credentials: "omit" }).catch(
      () => { if (live) setUnreachable(true); },
    );
    return () => { live = false; };
  }, [armed]);

  /* AND A TIMEOUT BEHIND IT, for reachable-but-never-arrives: a captive
     portal answering every request, a cold start that never finishes, a
     phone that dropped to no signal between the tap and the response. This
     is the part the old version did not have at all, and the reason its
     button could say "Starting the chat…" for the rest of the session. */
  useEffect(() => {
    if (!armed || ready || failed) return;
    const id = window.setTimeout(() => setStalled(true), STALL_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [armed, ready, failed]);

  const close = useCallback(() => {
    setOpen(false);
    facadeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  /* Focus follows the panel, or a keyboard user opens a conversation they are
     not standing in. The frame's own contents take focus from there. */
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const arm = useCallback(() => setArmed(true), []);
  const toggle = () => {
    setArmed(true);
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={facadeRef}
        type="button"
        className={`jf-facade${open ? " is-open" : ""}`}
        /* Pointer DOWN rather than pointer ENTER, and the difference is a
           whole chat application's worth of bandwidth. The frame runs the
           agent, not just a script tag, so arming it for a mouse that merely
           crossed the corner would start a conversation nobody asked for.
           `pointerdown` still lands 80-150ms before the click, and
           `touchstart` further ahead of it than that. */
        onPointerDown={arm}
        onTouchStart={arm}
        onFocus={arm}
        onClick={toggle}
        aria-label={open ? "Close project chat" : "Open project chat"}
        aria-expanded={open}
        aria-controls="jf-panel"
      >
        <Image src={AVATAR} alt="" width={56} height={56} priority={false} unoptimized />
        <span className="jf-facade__bubble" aria-hidden="true">
          Hiiii 👋
        </span>
      </button>

      {/* Mounted as soon as the button is reached for, shown on the click.
          Hidden with `visibility`, not `display: none`, so the frame is a real
          layout box that loads and paints while it waits. */}
      {armed ? (
        <div
          id="jf-panel"
          className={`jf-panel${open ? " is-open" : ""}`}
          role="dialog"
          aria-label="Project chat"
          aria-hidden={!open}
        >
          <div className="jf-panel__bar">
            <span className="jf-panel__title">Chat with us</span>
            <button
              ref={closeRef}
              type="button"
              className="jf-panel__close"
              onClick={close}
              aria-label="Close project chat"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                   strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="jf-panel__body">
            <iframe
              className="jf-panel__frame"
              src={AGENT_SRC}
              title="Project chat"
              /* Voice is off on this agent today, but the permission belongs
                 to the frame rather than to a later code change. */
              allow="microphone; clipboard-write"
              onLoad={() => setReady(true)}
            />

            {failed || !ready ? (
              <div className="jf-panel__state" role="status">
                {failed ? (
                  <>
                    <p className="jf-panel__said">
                      The chat is not loading. It is often a browser extension
                      blocking it rather than anything on your end.
                    </p>
                    <a className="jf-panel__alt" href="/contact">
                      Use the contact form instead
                    </a>
                    <a className="jf-panel__mail" href={`mailto:${CONTACT_EMAIL}`}>
                      {CONTACT_EMAIL}
                    </a>
                  </>
                ) : (
                  <p className="jf-panel__said">Starting the chat…</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
