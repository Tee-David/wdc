"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, HelpCircle, ImageOff, Loader2, Search, X } from "lucide-react";
import type { Card, Finding, ImageFacts, Tags } from "@/lib/link-preview";

import "./link-preview.css";

/**
 * The link preview checker at /tools/link-preview.
 *
 * THE CARDS ARE THE ANSWER, and everything else on the page is support. A list
 * of tags and their lengths is a report; four cards showing what a WhatsApp
 * group is about to see is the thing somebody came for, and it is the thing
 * they screenshot and send to whoever owns the site.
 *
 * WHATSAPP IS FIRST, deliberately and not alphabetically. In this market it is
 * the channel a link actually travels through, and it is also the fussiest of
 * the four -- one image over 300KB and the card is a line of grey text. A tool
 * that led with Facebook would be answering an American question.
 *
 * THE PICTURE IS THE REAL ONE. `img-src https:` in our CSP allows it, and a
 * mock card with a grey rectangle where the image goes proves nothing about
 * the image. It is a plain `<img>` rather than `next/image`: optimising a
 * stranger's file would put their host in our image pipeline and cost us the
 * CPU to do it, for a picture shown once.
 */

type Result = {
  url: string;
  finalUrl: string;
  redirected: boolean;
  reviewed: string;
  tags: Tags;
  image: ImageFacts | null;
  cards: Card[];
  findings: Finding[];
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

export default function LinkPreviewChecker() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /* THE READER'S OWN BROWSER IS A CHECK WE DID NOT HAVE TO WRITE. An og:image
     that 404s, a host with hotlink protection, an http image on an https page
     -- our probe reads the bytes from the server side and sees none of that.
     If the picture will not draw here, it will not draw in a preview card
     either, so the card says so rather than showing a broken-image glyph with
     the alt text spilling out of it. One flag, not one per card: there is only
     ever one image, and it fails everywhere or nowhere. */
  const [imageBroken, setImageBroken] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError("");
    setImageBroken(false);
    try {
      const response = await fetch("/api/tools/link-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "We could not check that link just now.");
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
        <label className="tl__label" htmlFor="lp-url">The link you are about to share</label>
        <div className="tl__row">
          <input
            id="lp-url"
            className="tl__input"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="yourbusiness.com/that-page"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            aria-describedby="lp-hint"
          />
          <button className="tl__go" type="submit" disabled={busy || !url.trim()}>
            {busy
              ? <><Loader2 className="tl__spin" aria-hidden="true" /> Reading</>
              : <><Search aria-hidden="true" /> Check it</>}
          </button>
        </div>
        <p className="tl__hint" id="lp-hint">
          We fetch the page once and read its tags, exactly as WhatsApp&rsquo;s own
          scraper would. Nothing is posted anywhere.
        </p>
      </form>

      {error && <p className="tl__err" role="alert">{error}</p>}

      <div className="tl__out" aria-live="polite">
        {result && (
          <>
            <p className="tl__verdict">
              {problems.length === 0 ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
              <span>
                {problems.length === 0 ? (
                  <><strong>{result.tags.title || result.finalUrl}</strong> unfurls properly on all four.</>
                ) : (
                  <>
                    {problems.length === 1 ? "One thing" : `${problems.length} things`} would make this
                    link look better wherever it is shared.
                  </>
                )}
              </span>
            </p>

            {result.redirected && (
              <p className="tl__note">
                That address redirects. The cards below are for{" "}
                <b>{result.finalUrl}</b>, which is the page a scraper ends up on.
              </p>
            )}

            {/* THE FOUR CARDS. Each is a mock built from our own tokens rather
                than a copy of a platform's chrome: the point is what YOUR copy
                looks like at their measurements, and a pixel-perfect imitation
                of somebody else's interface would be both a trademark problem
                and out of date within a quarter. */}
            <div className="lp__cards">
              {result.cards.map((card) => (
                <figure className={`lp__card lp__card--${card.platform.key}`} key={card.platform.key}>
                  <figcaption className="lp__head">
                    <span className="lp__who">{card.platform.label}</span>
                    <span className="lp__note">{card.platform.note}</span>
                  </figcaption>

                  <div className={`lp__mock${card.large ? "" : " lp__mock--small"}`}>
                    {card.showsImage && result.tags.image && !imageBroken ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        className="lp__img"
                        src={result.tags.image}
                        alt={result.tags.imageAlt || "The preview image this page offers"}
                        loading="lazy"
                        /* Their server learns nothing about who is checking. */
                        referrerPolicy="no-referrer"
                        onError={() => setImageBroken(true)}
                      />
                    ) : (
                      <div className="lp__noimg">
                        <ImageOff aria-hidden="true" />
                        <span>
                          {imageBroken && card.showsImage
                            ? "The image address is there, but nothing loads from it. A preview card would show this same empty space."
                            : card.imageReason || "No picture here."}
                        </span>
                      </div>
                    )}

                    <div className="lp__text">
                      <span className="lp__domain">{card.domain}</span>
                      <span className="lp__title">
                        {card.title || <i>No title, so this line is the bare link.</i>}
                      </span>
                      {card.platform.description > 0 && card.description && (
                        <span className="lp__desc">{card.description}</span>
                      )}
                    </div>
                  </div>

                  {(card.titleCut || card.descriptionCut) && (
                    <p className="lp__cut">
                      {card.titleCut && `Title cut at about ${card.platform.title} characters. `}
                      {card.descriptionCut && `Description cut at about ${card.platform.description}.`}
                    </p>
                  )}
                </figure>
              ))}
            </div>

            <p className="tl__note">
              Measurements reviewed in {result.reviewed}. Every one of these platforms
              redraws its cards without telling anybody, so they are close rather than
              exact — which is why the cards say &ldquo;about&rdquo;.
            </p>

            <h3 className="es__h">What to fix</h3>
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

            <div className="tl__step">
              <p className="tl__stepK">If it is wrong</p>
              <h3>Fixed once, right everywhere</h3>
              <p>
                These are four meta tags in the head of the page. Adding them is an
                afternoon at most, and it changes how every link to your site looks in
                every app anyone shares it in.
              </p>
              <div className="tl__stepActs">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Ask us to fix it
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/social">
                  See our social work
                </Link>
              </div>
              <p className="tl__stepAlt">
                Already fixed it? LinkedIn caches hard — run its Post Inspector on the
                URL or it will keep showing the old card.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
