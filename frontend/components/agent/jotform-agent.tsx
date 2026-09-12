"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Keep chat discoverable without making its 15MB third-party runtime part of
 * page load or the visitor's first scroll. The lightweight button uses the
 * avatar configured in Jotform; tapping it loads the official widget and opens
 * the native conversation as soon as its launcher is ready.
 */
const SRC =
  "https://cdn.jotfor.ms/agent/embedjs/01a0907b3dd870008f3afa7ebca3bb7b4c1b/embed.js";
const AVATAR =
  "https://www.jotform.com/agent/01a0907b3dd870008f3afa7ebca3bb7b4c1b/avatar-icon";

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AVATAR} alt="" width="56" height="56" />
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
