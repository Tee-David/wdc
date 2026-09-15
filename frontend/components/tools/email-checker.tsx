"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, HelpCircle, Loader2, Search, X } from "lucide-react";

/**
 * The email deliverability check at /tools/email.
 *
 * IT LEADS WITH DMARC, not with a row of green ticks, because the DMARC line
 * is the one with a consequence the reader can feel. "Anyone can send an
 * invoice as you today" is what makes somebody act; "SPF present" is what
 * makes them close the tab.
 *
 * NO SCORE OUT OF TEN. A number invites the reader to feel finished at 7/10.
 * Four findings, each with the sentence that says what it means for them, is
 * harder to ignore and easier to act on.
 */

type Verdict = "good" | "weak" | "missing" | "unknown";
type Finding = { id: string; label: string; verdict: Verdict; detail: string; raw?: string };
type Result = { domain: string; findings: Finding[] };

const ICON: Record<Verdict, typeof Check> = {
  good: Check,
  weak: AlertTriangle,
  missing: X,
  unknown: HelpCircle,
};

const WORD: Record<Verdict, string> = {
  good: "Good",
  weak: "Needs work",
  missing: "Missing",
  unknown: "Could not tell",
};

export default function EmailChecker() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tools/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "We could not check that domain just now.");
        setResult(null);
        return;
      }
      setResult(data as Result);
    } catch {
      setError("We could not reach the checker. Please try again in a moment.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const problems = result?.findings.filter((f) => f.verdict === "weak" || f.verdict === "missing") ?? [];

  return (
    <div className={`tl${result ? " tl--split" : ""}`}>
      <form className="tl__form" onSubmit={submit}>
        <label className="tl__label" htmlFor="em-domain">Your domain or email address</label>
        <div className="tl__row">
          <input
            id="em-domain"
            className="tl__input"
            type="text"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            placeholder="yourbusiness.com"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setError(""); }}
            aria-describedby="em-hint"
          />
          <button className="tl__go" type="submit" disabled={busy || !domain.trim()}>
            {busy
              ? <><Loader2 className="tl__spin" aria-hidden="true" /> Checking</>
              : <><Search aria-hidden="true" /> Check</>}
          </button>
        </div>
        <p className="tl__hint" id="em-hint">
          Paste either. We read only public DNS records, and we send nothing.
        </p>
      </form>

      {error && <p className="tl__err" role="alert">{error}</p>}

      {/* Beside the form once there is a verdict, not under it. */}
      <div className="tl__out" aria-live="polite">
        {result && (
          <>
            {problems.length > 0 && (
              <p className="tl__verdict">
                <strong>{result.domain}</strong> has{" "}
                {problems.length === 1 ? "one thing" : `${problems.length} things`} worth
                fixing.
              </p>
            )}
            {problems.length === 0 && (
              <p className="tl__verdict">
                <strong>{result.domain}</strong> is set up properly. That is rarer than it
                should be.
              </p>
            )}

            <ul className="tl__list">
              {result.findings.map((f) => {
                const Icon = ICON[f.verdict];
                return (
                  <li className={`tl__find tl__find--${f.verdict}`} key={f.id}>
                    <span className="tl__findhead" aria-hidden="true"><Icon /></span>
                    <span className="tl__findtop">
                      <span className="tl__findname">{f.label}</span>
                      <span className="tl__findverdict">{WORD[f.verdict]}</span>
                    </span>
                    <p className="tl__finddetail">{f.detail}</p>
                    {f.raw && <code className="tl__raw">{f.raw}</code>}
                  </li>
                );
              })}
            </ul>

            <div className="tl__cta">
              <p>
                These are DNS changes, not a rebuild. We fix them as part of any web or
                SEO work, or on their own if that is all you need.
              </p>
              <Link className="pv-btn pv-btn--accent" href="/contact">
                Ask us to fix this
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
