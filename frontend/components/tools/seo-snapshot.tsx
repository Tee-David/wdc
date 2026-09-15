"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, HelpCircle, Loader2, Search, Send, X } from "lucide-react";
import type { Facts, Finding } from "@/lib/seo-audit";
import {
  DEFAULT_NAIRA_PER_GB, PRICE_REVIEWED, dataCost, nairaCost, waitLabel, weightLabel,
} from "@/lib/data-cost";

/**
 * The on-page SEO snapshot at /tools/seo, and the data-cost panel bolted onto
 * its result.
 *
 * THE ORDER IS THE POINT, again. Everything we can say for nothing is said
 * first and in full; the email ask comes after it and buys the reader
 * something they can see we have not already given them -- the Lighthouse run,
 * which takes the better part of a minute and is the one thing worth waiting
 * for. Nothing on the page is taken away if they ignore it.
 *
 * WHAT COSTS A NIGERIAN VISITOR is not a separate tool and should never have
 * been one. It is the same page weight, said in the unit the person paying for
 * it thinks in, and it sits beside the findings because that is where it
 * changes somebody's mind: an SEO report is an argument with a developer, and
 * a naira figure is an argument anybody can have.
 *
 * THE PRICE IS THE READER'S TO SET. Bundles differ by network and by month,
 * and pay-as-you-go is many times a bundle. A tool that hard-codes one rate is
 * wrong for most people reading it, so the rate is an input and the default is
 * only a sensible middle.
 */

type Result = {
  url: string;
  finalUrl: string;
  redirected: boolean;
  facts: Facts;
  findings: Finding[];
  headline: string;
  ours: { url: string; bytes: number } | null;
};

const ICON: Record<Finding["verdict"], typeof Check> = {
  good: Check,
  weak: AlertTriangle,
  missing: X,
  unknown: HelpCircle,
};

const WORD: Record<Finding["verdict"], string> = {
  good: "Good",
  weak: "Worth fixing",
  missing: "Missing",
  unknown: "Could not tell",
};

export default function SeoSnapshot() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [price, setPrice] = useState(String(DEFAULT_NAIRA_PER_GB));
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [mailError, setMailError] = useState("");

  /* A rate somebody is mid-way through typing must not make the figures jump
     to zero, so an unreadable value falls back to the default rather than to
     nothing. */
  const nairaPerGb = Number(price) > 0 ? Number(price) : DEFAULT_NAIRA_PER_GB;

  const cost = useMemo(
    () => (result ? dataCost(result.facts.bytes, nairaPerGb) : null),
    [result, nairaPerGb],
  );
  const ourCost = useMemo(
    () => (result?.ours ? dataCost(result.ours.bytes, nairaPerGb) : null),
    [result, nairaPerGb],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError("");
    setSent(false);
    setMailError("");
    try {
      const response = await fetch("/api/tools/seo", {
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
      setResult(data as Result);
    } catch {
      setError("We could not reach the checker. Please try again in a moment.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const askForReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !email.trim()) return;
    setSending(true);
    setMailError("");
    try {
      const response = await fetch("/api/tools/seo/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, url: result.finalUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMailError(data?.error ?? "That did not send. Everything above is still yours.");
        return;
      }
      setSent(true);
    } catch {
      setMailError("We could not reach us just now. Everything above is still on this page.");
    } finally {
      setSending(false);
    }
  };

  const problems = result?.findings.filter((f) => f.verdict === "weak" || f.verdict === "missing") ?? [];

  return (
    <div className={`tl${result ? " tl--split" : ""}`}>
      <form className="tl__form" onSubmit={submit}>
        <label className="tl__label" htmlFor="seo-url">The page you want checked</label>
        <div className="tl__row">
          <input
            id="seo-url"
            className="tl__input"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="yourbusiness.com"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            aria-describedby="seo-hint"
          />
          <button className="tl__go" type="submit" disabled={busy || !url.trim()}>
            {busy
              ? <><Loader2 className="tl__spin" aria-hidden="true" /> Reading</>
              : <><Search aria-hidden="true" /> Check it</>}
          </button>
        </div>
        <p className="tl__hint" id="seo-hint">
          One fetch of one page, read the way Google reads it. No sign-up, and the
          answer appears before we ask you for anything.
        </p>
      </form>

      {error && <p className="tl__err" role="alert">{error}</p>}

      <div className="tl__out" aria-live="polite">
        {result && cost && (
          <>
            <p className="tl__verdict">
              {problems.length === 0 ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
              <span>{result.headline}</span>
            </p>

            {result.redirected && (
              <p className="tl__note">
                That address redirects. Everything below is for <b>{result.finalUrl}</b>.
              </p>
            )}

            {/* WHAT IT COSTS THE PERSON LOADING IT, first, because it is the
                finding nobody else tells them and the one that gets repeated
                in the meeting afterwards. */}
            <div className="sn__cost">
              <p className="tl__stepK">What this page costs a visitor</p>
              <p className="sn__big">
                {nairaCost(cost.naira)} <i aria-hidden="true">and</i> {waitLabel(cost.seconds)}
              </p>
              <p className="sn__sub">
                {weightLabel(cost.bytes)} of HTML, at ₦{nairaPerGb} a gigabyte and on a slow 3G
                signal. A thousand visits costs them {nairaCost(cost.perThousand)} between them.
              </p>

              {ourCost && result.ours && (
                <p className="sn__ours">
                  Ours is {weightLabel(result.ours.bytes)}, or {nairaCost(ourCost.naira)} a visit.
                  Same measurement, same day.
                </p>
              )}

              <label className="sn__price">
                <span>Your data price, per gigabyte</span>
                <input
                  className="tl__input sn__priceIn"
                  type="number"
                  min={1}
                  max={10_000}
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <p className="tl__hint">
                ₦{DEFAULT_NAIRA_PER_GB} is a typical bundle as of {PRICE_REVIEWED}. Pay-as-you-go runs
                many times that, so put your own number in and watch it move.
              </p>
              <p className="tl__hint">
                This is the HTML document alone, which is all one fetch can honestly
                measure. Images, fonts and scripts are on top — the Lighthouse report
                below counts them.
              </p>
            </div>

            <h3 className="es__h">What we read off the page</h3>
            <ul className="tl__list">
              {result.findings.map((finding) => {
                const Icon = ICON[finding.verdict];
                return (
                  <li className={`tl__find tl__find--${finding.verdict}`} key={finding.id}>
                    <span className="tl__findhead" aria-hidden="true"><Icon /></span>
                    <span className="tl__findtop">
                      <span className="tl__findname">{finding.label}</span>
                      <span className="tl__findverdict">{WORD[finding.verdict]}</span>
                    </span>
                    <p className="tl__finddetail">{finding.detail}</p>
                  </li>
                );
              })}
            </ul>

            {/* THE ASK. It buys something the reader can see they have not
                already been given, which is the only kind of ask worth making
                after you have handed everything else over. */}
            <div className="tl__step">
              <p className="tl__stepK">The slow half</p>
              <h3>Want the full Lighthouse report?</h3>
              <p>
                Google runs it on your live page — performance, accessibility, best
                practices and SEO, scored, with the biggest wins named. It takes about
                a minute, which is why we send it rather than make you wait for it.
              </p>

              {sent ? (
                <p className="es__sent" role="status">
                  <Check aria-hidden="true" /> On its way to {email}. It lands in a minute
                  or two.
                </p>
              ) : (
                <form className="es__mail" onSubmit={askForReport}>
                  <label className="tl__label" htmlFor="seo-email">Where should we send it?</label>
                  <div className="tl__row">
                    <input
                      id="seo-email"
                      className="tl__input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@yourbusiness.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setMailError(""); }}
                      aria-describedby="seo-mail-hint"
                    />
                    <button className="tl__go" type="submit" disabled={sending || !email.trim()}>
                      {sending
                        ? <><Loader2 className="tl__spin" aria-hidden="true" /> Sending</>
                        : <><Send aria-hidden="true" /> Send it</>}
                    </button>
                  </div>
                  <p className="tl__hint" id="seo-mail-hint">
                    One email with everything above in it plus the Lighthouse scores. You
                    keep the findings whether or not you give us an address.
                  </p>
                </form>
              )}

              {mailError && <p className="tl__err" role="alert">{mailError}</p>}

              <p className="tl__stepAlt">
                Rather we fixed them? <Link href="/contact">Tell us about the site</Link>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
