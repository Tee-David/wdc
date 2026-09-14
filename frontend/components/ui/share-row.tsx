"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Link2, Mail, Share2 } from "lucide-react";

/**
 * Share this page, wherever the page happens to be.
 *
 * EVERY ONE IS A PLAIN LINK TO THE NETWORK'S OWN INTENT URL. Nothing is
 * embedded, nothing is loaded from a third party, and there is no tracking
 * script -- a share row is the commonest place a site quietly picks up four of
 * them, and the official buttons all cost between 40KB and 200KB of somebody
 * else's JavaScript to draw a logo we can draw in one path.
 *
 * WHY THESE. WhatsApp and Telegram are how this audience actually forwards
 * things and most share rows leave both out; Facebook and X are the two people
 * look for and notice the absence of; Reddit and LinkedIn are where a piece of
 * writing gets read rather than glanced at; email is the one that reaches
 * somebody's boss. Threads and Bluesky are deliberately not here: neither has
 * enough of this audience to earn a place in a row that is already seven wide.
 *
 * THE FIRST BUTTON IS THE PHONE'S OWN SHARE SHEET, where there is one. It
 * offers every app somebody actually has, including the ones no web intent URL
 * can reach, so on a phone it is strictly better than the row beside it. It is
 * rendered only after mounting because `navigator.share` cannot be read on the
 * server, and hiding it in CSS would leave a hole in the row on a desktop.
 */
export default function ShareRow({
  url,
  title,
  what = "page",
}: {
  url: string;
  title: string;
  /**
   * What the thing being shared IS, in the accessible names: "post", "case
   * study", "page". A button reading "Share on X" tells a screen reader the
   * network and not the subject, and a rail of them on a case study that all
   * said "this post" would simply be wrong. Nothing visible changes.
   */
  what?: string;
}) {
  const [copied, setCopied] = useState(false);
  /* `useSyncExternalStore` RATHER THAN AN EFFECT, because this is exactly what
     it is for: a value the server cannot know, read on the client without the
     render-then-correct that an effect would cause. The server snapshot is
     `false`, so the markup matches and the button appears on the first client
     render rather than the second. Nothing to subscribe to -- the capability
     does not change while the page is open. */
  const native = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  const enc = encodeURIComponent;
  const links = [
    { name: "X", href: `https://x.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
      path: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.3 22H3.2l7.3-8.3L2.8 2h6.4l4.4 5.9zm-1.1 18h1.7L7.3 3.7H5.5z" },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
      path: "M6.9 21H3.4V9h3.5zM5.1 7.5a2 2 0 1 1 0-4.1 2 2 0 0 1 0 4.1zM21 21h-3.5v-5.8c0-1.4 0-3.2-2-3.2s-2.2 1.5-2.2 3.1V21H9.8V9h3.3v1.6h.1a3.7 3.7 0 0 1 3.3-1.8c3.5 0 4.2 2.3 4.2 5.3z" },
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(title + " " + url)}`,
      path: "M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.6 14.1c-.2.7-1.4 1.3-1.9 1.3s-1.2.3-4-1.2-4.2-4.4-4.4-4.6-.9-1.4-.9-2.6.7-1.8 1-2a1 1 0 0 1 .7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.5-.3.4c-.1.2-.3.4-.1.7a10 10 0 0 0 1.7 2.1 9 9 0 0 0 2.4 1.5c.3.2.5.1.7-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3s0 .8-.2 1.5z" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" },
    { name: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`,
      path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 6.9-1.5 7.3c-.1.5-.4.6-.9.4l-2.4-1.8-1.2 1.1c-.1.1-.2.3-.5.3l.2-2.5 4.5-4.1c.2-.2 0-.3-.3-.1L8.9 13l-2.4-.8c-.5-.2-.5-.5.1-.8l9.3-3.6c.4-.2.8.1.7.8z" },
    { name: "Reddit", href: `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`,
      path: "M22 12a2.2 2.2 0 0 0-3.7-1.6 10.8 10.8 0 0 0-5.6-1.8l1-4.5 3.1.7a1.6 1.6 0 1 0 .2-1l-3.6-.8c-.2 0-.4.1-.4.3l-1.1 5.1a10.8 10.8 0 0 0-5.6 1.8A2.2 2.2 0 1 0 3.4 15a4 4 0 0 0 0 .6c0 3.2 3.8 5.8 8.5 5.8s8.5-2.6 8.5-5.8a4 4 0 0 0 0-.6A2.2 2.2 0 0 0 22 12zM7.3 13.6a1.6 1.6 0 1 1 3.1 0 1.6 1.6 0 0 1-3.1 0zm8.7 4.2c-1 1-3 1.1-3.6 1.1s-2.5 0-3.6-1.1a.4.4 0 0 1 .6-.6c.7.7 2.1.9 3 .9s2.3-.2 3-.9a.4.4 0 1 1 .6.6zm-.3-2.6a1.6 1.6 0 1 1 0-3.1 1.6 1.6 0 0 1 0 3.1z" },
  ];

  /* The phone's own sheet. It can be dismissed, and a dismissal throws the
     same AbortError as a genuine failure, so nothing is reported either way --
     there is nothing useful to say about somebody changing their mind. */
  const shareNative = async () => {
    try { await navigator.share({ title, url }); } catch { /* dismissed */ }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard can be refused (an insecure origin, a locked-down browser).
         Saying nothing is better than an error for something this small: the
         address bar still has the URL. */
    }
  };

  return (
    <div className="sh-share">
      <p className="sh-k">Share</p>
      <div className="sh-row">
        {native ? (
          <button
            type="button"
            className="sh-btn sh-btn--native"
            onClick={shareNative}
            aria-label={`Share this ${what}`}
          >
            <Share2 aria-hidden="true" />
          </button>
        ) : null}
        {links.map((l) => (
          <a
            key={l.name}
            className="sh-btn"
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${l.name} (opens in a new tab)`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={l.path} /></svg>
          </a>
        ))}
        <a
          className="sh-btn"
          href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}
          aria-label={`Share this ${what} by email`}
        >
          <Mail aria-hidden="true" />
        </a>
        <button
          type="button"
          className={`sh-btn${copied ? " is-done" : ""}`}
          onClick={copy}
          aria-label={copied ? "Link copied" : `Copy link to this ${what}`}
        >
          {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        </button>
      </div>
      {/* Announced, not just coloured: the tick alone tells a screen reader
          nothing. */}
      <span className="sh-said" role="status">{copied ? "Link copied" : ""}</span>
    </div>
  );
}
