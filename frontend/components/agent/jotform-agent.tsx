"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Script from "next/script";

/**
 * Keep chat discoverable without making its 15MB third-party runtime part of
 * page load or the visitor's first scroll. The lightweight button uses the
 * avatar configured in Jotform; tapping it loads the official widget and opens
 * the native conversation as soon as its launcher is ready.
 */
const SRC =
  "https://cdn.jotfor.ms/agent/embedjs/01a0907b3dd870008f3afa7ebca3bb7b4c1b/embed.js";
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

export default function JotformAgent() {
  /* TWO FLAGS, BECAUSE FETCHING AND OPENING ARE DIFFERENT DECISIONS.

     `loading` means the runtime has been asked for. `wanted` means a person
     has actually asked to talk to someone, and is the only thing that opens
     the conversation. Separating them is the whole fix for "it takes an awful
     amount of time before it opens": the download used to start on the click,
     so the entire wait sat between the tap and anything happening. Now it
     starts when someone reaches for the button -- hover, focus, or the moment
     a finger lands on it -- and the click usually finds it already there.

     It is still never speculative. Nobody who does not go for the button pays
     for it, which matters more here than usual: this runtime is about 15MB,
     and on a phone on mobile data that is not a thing to spend on a guess. */
  const [loading, setLoading] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [handedOff, setHandedOff] = useState(false);

  /* DNS and TLS to their CDN, at idle, costing no bytes. On a high-latency
     connection the handshake alone is a few hundred milliseconds that would
     otherwise be spent after the tap. */
  useEffect(() => {
    const warm = () => {
      for (const href of ["https://cdn.jotfor.ms", "https://www.jotform.com"]) {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = href;
        link.crossOrigin = "";
        document.head.appendChild(link);
      }
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

  useEffect(() => {
    if (!wanted || handedOff) return;
    const openNative = () => {
      const launcher = document.querySelector<HTMLElement>(
        ".ai-agent-chat-avatar-container",
      );
      if (!launcher) return false;
      launcher.click();
      setHandedOff(true);
      return true;
    };

    if (openNative()) return;
    const observer = new MutationObserver(() => {
      if (openNative()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [wanted, handedOff]);

  return (
    <>
      {!handedOff ? (
        <button
          type="button"
          className={`jf-facade${wanted ? " is-loading" : ""}`}
          /* Reaching for the button is enough to start fetching. `pointerenter`
             covers a mouse and a trackpad; `touchstart` fires before the click
             a tap produces, so a finger gets a head start too; `focus` covers
             the keyboard. All three only ever set the same flag once. */
          onPointerEnter={() => setLoading(true)}
          onTouchStart={() => setLoading(true)}
          onFocus={() => setLoading(true)}
          onClick={() => { setLoading(true); setWanted(true); }}
          aria-label={wanted ? "Opening project chat" : "Open project chat"}
          aria-busy={wanted || undefined}
        >
          <Image src={AVATAR} alt="" width={56} height={56} priority={false} unoptimized />
          {/* SAY WHAT IS HAPPENING. A pulsing avatar and nothing else is what
              made the wait feel broken rather than slow. The bubble is already
              here; while the runtime is coming it carries the news instead of
              a greeting. */}
          <span className="jf-facade__bubble" aria-hidden="true">
            {wanted ? "Starting the chat…" : "Hiiii 👋"}
          </span>
        </button>
      ) : null}
      {/* Rendered once either flag is set, so an intent that never became a
          click still leaves the runtime cached for the one that does. */}
      {loading ? (
        <Script
          id="jotform-agent"
          src={SRC}
          strategy="afterInteractive"
          onError={() => {
            setLoading(false);
            setWanted(false);
            setHandedOff(false);
          }}
        />
      ) : null}
    </>
  );
}
