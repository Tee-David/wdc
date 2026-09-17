"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ExternalLink, HelpCircle, Link2, Loader2, Search, X } from "lucide-react";
import type { CheckedLink } from "@/app/api/tools/broken-links/route";
import type { LinkVerdict } from "@/lib/broken-links";
import WaitingLine from "./waiting-line";

/**
 * The single-page broken-link check at /tools/broken-links.
 *
 * SORTED, NOT FILTERED. Every link found stays on the page -- a tool that
 * hides the links it could not verify is a tool that can be wrong silently.
 * Broken links come first because they are the reason anyone pastes a URL
 * here, unverified ones next because they are the ones worth a human look,
 * and the links that simply work last, where a reader with none of the first
 * two kinds can still see the tool did something.
 */

type Answer = {
  url: string;
  finalUrl: string;
  redirected: boolean;
  total: number;
  truncated: boolean;
  links: CheckedLink[];
};

const ICON: Record<LinkVerdict, typeof Check> = {
  ok: Check,
  broken: X,
  unverified: HelpCircle,
};

const CLASS: Record<LinkVerdict, string> = {
  ok: "good",
  broken: "missing",
  unverified: "unknown",
};

const WORD: Record<LinkVerdict, string> = {
  ok: "Works",
  broken: "Broken",
  unverified: "Could not check",
};

const ORDER: Record<LinkVerdict, number> = { broken: 0, unverified: 1, ok: 2 };

const WAITING = [
  "Fetching your page 📄",
  "Finding every link on it 🔗",
  "Knocking on each one 🚪",
  "Waiting for the slow ones ⏳",
  "Counting what came back ✅",
];

export default function BrokenLinksChecker() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tools/broken-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "We could not read that page just now.");
        setResult(null);
        return;
      }
      setResult(data as Answer);
    } catch {
      setError("We could not reach the checker. Please try again in a moment.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const sorted = result ? [...result.links].sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict]) : [];
  const broken = result?.links.filter((l) => l.verdict === "broken").length ?? 0;
  const unverified = result?.links.filter((l) => l.verdict === "unverified").length ?? 0;

  const headline = !result
    ? ""
    : result.total === 0
      ? "No checkable links found on that page."
      : broken > 0
        ? `${broken} of ${result.total} link${result.total === 1 ? "" : "s"} ${broken === 1 ? "is" : "are"} broken.`
        : unverified > 0
          ? `No broken links found, but ${unverified} could not be checked from here.`
          : `All ${result.total} link${result.total === 1 ? "" : "s"} on that page work.`;

  return (
    <div className={`tl${result ? " tl--split" : ""}`}>
      <form className="tl__form" onSubmit={submit}>
        <label className="tl__label" htmlFor="broken-links-url">The page you want checked</label>
        <div className="tl__row">
          <input
            id="broken-links-url"
            className="tl__input"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="yourbusiness.com/page"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            aria-describedby="broken-links-hint"
          />
          <button className="tl__go" type="submit" disabled={busy || !url.trim()}>
            {busy
              ? <><Loader2 className="tl__spin" aria-hidden="true" /> Checking</>
              : <><Search aria-hidden="true" /> Check it</>}
          </button>
        </div>
        <p className="tl__hint" id="broken-links-hint">
          We fetch that one page, find every link on it, and check up to 25 of
          them. It never follows a link to crawl your whole site.
        </p>
      </form>

      {!result && !busy && (
        <p className="tl__hint">
          Want the deeper crawl instead? <Link href="/contact">Tell us about the site</Link>.
        </p>
      )}

      {error && <p className="tl__err" role="alert">{error}</p>}

      {busy && <WaitingLine phrases={WAITING} />}

      <div className="tl__out" aria-live="polite">
        {result && (
          <>
            <p className="tl__verdict">
              {broken > 0 ? <AlertTriangle aria-hidden="true" /> : <Check aria-hidden="true" />}
              <span>{headline}</span>
            </p>

            {result.redirected && (
              <p className="tl__note">
                That address redirects. Links were read from <b>{result.finalUrl}</b>.
              </p>
            )}
            {result.truncated && (
              <p className="tl__note">
                That page has more than 25 links. The first 25 in the page are
                checked; the rest are not shown.
              </p>
            )}

            {result.total > 0 && (
              <ul className="tl__list">
                {sorted.map((link) => {
                  const Icon = ICON[link.verdict];
                  return (
                    <li className={`tl__find tl__find--${CLASS[link.verdict]}`} key={link.href}>
                      <span className="tl__findhead" aria-hidden="true"><Icon /></span>
                      <span className="tl__findtop">
                        <span className="tl__findname">
                          {link.text}
                          {link.external && <Link2 aria-hidden="true" className="bl__ext" />}
                        </span>
                        <span className="tl__findverdict">{WORD[link.verdict]}</span>
                      </span>
                      <p className="tl__finddetail">
                        {link.note}{" "}
                        <a href={link.href} target="_blank" rel="noopener noreferrer">
                          {link.href} <ExternalLink aria-hidden="true" className="bl__ext" />
                        </a>
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
