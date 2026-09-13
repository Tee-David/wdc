"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

/**
 * Share a post, and take its link away with you.
 *
 * WHY THESE THREE. X, LinkedIn and WhatsApp are where this audience actually
 * forwards things; WhatsApp especially, which most share rows leave out. Each
 * is a plain link to the network's own intent URL, so nothing is embedded,
 * nothing is loaded from a third party, and there is no tracking script --
 * a share row is the commonest place a site quietly picks up four of them.
 *
 * The copy button is the only part that needs JavaScript, which is why this is
 * the one client component on the page.
 */
export default function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const enc = encodeURIComponent;
  const links = [
    { name: "X", href: `https://x.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
      path: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.3 22H3.2l7.3-8.3L2.8 2h6.4l4.4 5.9zm-1.1 18h1.7L7.3 3.7H5.5z" },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
      path: "M6.9 21H3.4V9h3.5zM5.1 7.5a2 2 0 1 1 0-4.1 2 2 0 0 1 0 4.1zM21 21h-3.5v-5.8c0-1.4 0-3.2-2-3.2s-2.2 1.5-2.2 3.1V21H9.8V9h3.3v1.6h.1a3.7 3.7 0 0 1 3.3-1.8c3.5 0 4.2 2.3 4.2 5.3z" },
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(title + " " + url)}`,
      path: "M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.6 14.1c-.2.7-1.4 1.3-1.9 1.3s-1.2.3-4-1.2-4.2-4.4-4.4-4.6-.9-1.4-.9-2.6.7-1.8 1-2a1 1 0 0 1 .7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.5-.3.4c-.1.2-.3.4-.1.7a10 10 0 0 0 1.7 2.1 9 9 0 0 0 2.4 1.5c.3.2.5.1.7-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3s0 .8-.2 1.5z" },
  ];

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
    <div className="bl-share">
      <p className="bl-rail__k">Share</p>
      <div className="bl-share__row">
        {links.map((l) => (
          <a
            key={l.name}
            className="bl-share__btn"
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${l.name} (opens in a new tab)`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={l.path} /></svg>
          </a>
        ))}
        <button
          type="button"
          className={`bl-share__btn${copied ? " is-done" : ""}`}
          onClick={copy}
          aria-label={copied ? "Link copied" : "Copy link to this post"}
        >
          {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        </button>
      </div>
      {/* Announced, not just coloured: the tick alone tells a screen reader
          nothing. */}
      <span className="bl-share__said" role="status">{copied ? "Link copied" : ""}</span>
    </div>
  );
}
