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
  const [wanted, setWanted] = useState(false);
  const [handedOff, setHandedOff] = useState(false);

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
          onClick={() => setWanted(true)}
          aria-label={wanted ? "Opening project chat" : "Open project chat"}
          aria-busy={wanted || undefined}
        >
          <Image src={AVATAR} alt="" width={56} height={56} priority={false} unoptimized />
          <span className="jf-facade__bubble" aria-hidden="true">Hiiii 👋</span>
        </button>
      ) : null}
      {wanted ? (
        <Script
          id="jotform-agent"
          src={SRC}
          strategy="afterInteractive"
          onError={() => {
            setWanted(false);
            setHandedOff(false);
          }}
        />
      ) : null}
    </>
  );
}
