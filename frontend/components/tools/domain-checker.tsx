"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Search, X } from "lucide-react";

/**
 * The public domain checker at /tools/domain.
 *
 * ONE NAME, SIX ENDINGS. The onboarding form asks the opposite question --
 * three names a client has already thought of -- and both go through the same
 * `/api/domain`, because it is the same question of the same registries and
 * two routes would be two things to keep in step.
 *
 * WHY THE HONEST THIRD STATE IS THE POINT OF THIS TOOL, not a caveat on it.
 * Measured: `.com`, `.africa` and `.app` answer properly. `.ng` is listed in
 * IANA's bootstrap and its RDAP service returns 502 or times out, `.com.ng`
 * resolves to that same dead service, and `.co` publishes no RDAP service at
 * all. A checker that guessed would be wrong about half this list, and the
 * half it would be wrong about is the half a Nigerian business cares most
 * about. So "we will confirm this one by hand" is a real row with a real
 * follow-up, which is also the lead.
 *
 * NEVER AN NS LOOKUP. A registered domain that is parked has no nameservers,
 * so DNS would report our own domain as available.
 */

/* The endings worth checking for this audience, in the order a Nigerian
   business would consider them. */
const TLDS = ["com", "ng", "com.ng", "africa", "app", "co"];

type Status = "available" | "taken" | "unknown";
type Row = { domain: string; status: Status; note?: string };

/* Mirrors the server's rule closely enough to catch a typo before spending a
   request on it. The server validates properly; this is only politeness. */
const looksLikeName = (v: string) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(v);

export default function DomainChecker() {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    /* Take whatever they pasted and keep only the label: someone types
       "https://mybusiness.com" as often as "mybusiness". */
    const base = name.trim().toLowerCase()
      .replace(/^https?:\/\//, "").replace(/^www\./, "")
      .split("/")[0].split(".")[0];
    if (!base || !looksLikeName(base)) {
      setError("Enter a name on its own, like mybusiness.");
      setRows(null);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domains: TLDS.map((t) => `${base}.${t}`) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "We could not check those just now.");
        setRows(null);
        return;
      }
      setRows(data.results as Row[]);
    } catch {
      setError("We could not reach the checker. Please try again in a moment.");
      setRows(null);
    } finally {
      setBusy(false);
    }
  };

  const unknowns = rows?.filter((r) => r.status === "unknown").length ?? 0;

  return (
    <div className="tl">
      <form className="tl__form" onSubmit={submit}>
        <label className="tl__label" htmlFor="tl-name">Your business name</label>
        <div className="tl__row">
          <input
            id="tl-name"
            className="tl__input"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="mybusiness"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            aria-describedby="tl-hint"
          />
          <button className="tl__go" type="submit" disabled={busy || !name.trim()}>
            {busy
              ? <><Loader2 className="tl__spin" aria-hidden="true" /> Checking</>
              : <><Search aria-hidden="true" /> Check</>}
          </button>
        </div>
        <p className="tl__hint" id="tl-hint">
          Just the name, without the ending. We check six endings at once.
        </p>
      </form>

      {error && <p className="tl__err" role="alert">{error}</p>}

      {/* `aria-live` so the answer is announced rather than silently appearing
          under a button somebody just pressed. */}
      <div aria-live="polite">
        {rows && (
          <>
            <ul className="tl__list">
              {rows.map((r) => (
                <li className={`tl__item tl__item--${r.status}`} key={r.domain}>
                  <span className="tl__name">{r.domain}</span>
                  <span className="tl__state">
                    {r.status === "available" && <><Check aria-hidden="true" /> Available</>}
                    {r.status === "taken" && <><X aria-hidden="true" /> Taken</>}
                    {r.status === "unknown" && <>We will confirm by hand</>}
                  </span>
                </li>
              ))}
            </ul>

            {unknowns > 0 && (
              <p className="tl__note">
                {unknowns === 1 ? "One ending" : `${unknowns} endings`} could not be
                confirmed automatically. Nigeria&rsquo;s registry does not publish a
                reliable lookup, so we check those ourselves rather than guess.
              </p>
            )}

            <div className="tl__cta">
              <p>
                A name is only yours once it is registered, and it is registered in
                your name, not ours.
              </p>
              <Link className="pv-btn pv-btn--accent" href="/contact">
                Ask us to secure one
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
