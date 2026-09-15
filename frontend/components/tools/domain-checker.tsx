"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, RotateCcw, Search, X } from "lucide-react";

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

/* A LABEL, OR A WHOLE DOMAIN. WHICHEVER THEY TYPED.

   The field used to throw away everything after the first dot, so somebody who
   typed `mybusiness.co.uk` got six Nigerian endings back and never the one
   they asked about. There is no reason for that: the registry lookup works on
   any name, so if they gave us an ending we check exactly that and nothing
   else.

   Told apart by whether a dot survives once the scheme, the www and any path
   are stripped. Two or more labels means they chose an ending, including the
   two-part ones like `.com.ng` and `.co.uk`, which is why this counts dots
   rather than trying to know the world's suffix list. */
function readInput(raw: string) {
  const cleaned = raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "")
    .split("/")[0].split("?")[0].replace(/\.$/, "");
  if (!cleaned) return null;
  const labels = cleaned.split(".").filter(Boolean);
  if (labels.length < 2) {
    return looksLikeName(cleaned) ? { kind: "name" as const, base: cleaned } : null;
  }
  const ok = labels.every(looksLikeName) && /^[a-z]{2,}$/.test(labels[labels.length - 1]);
  return ok ? { kind: "domain" as const, domain: labels.join(".") } : null;
}

/* SOMETHING TO READ WHILE THE REGISTRIES ANSWER.

   A lookup fans out to six registries and some of them are slow, so this is a
   couple of seconds of nothing. A spinner says "wait"; these say "somebody is
   doing something", which is the same wait spent better. They rotate rather
   than repeat, because the joke lands once. */
const WAITING = [
  "Knocking on the registry's door 🚪",
  "Consulting the domain wizards 🧙",
  "Asking six registries, politely 📬",
  "Rifling through the internet's filing cabinet 🗄️",
  "Waking up the .africa server ☕",
  "Checking who got there first 🏁",
];

export default function DomainChecker() {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [waitIndex, setWaitIndex] = useState(0);

  /* One interval, alive only while a check is in flight. The only setState
     here is inside the timer's callback: setting state synchronously in an
     effect body is a cascading render, and the compiler rejects it. The random
     starting phrase is chosen where the check starts instead, which is also
     where it belongs. */
  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => {
      setWaitIndex((n) => (n + 1) % WAITING.length);
    }, 1500);
    return () => window.clearInterval(id);
  }, [busy]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = readInput(name);
    if (!parsed) {
      setError("Enter a name like mybusiness, or a full one like mybusiness.com.ng.");
      setRows(null);
      return;
    }
    /* Their ending if they gave one, our six if they did not. */
    const wanted = parsed.kind === "domain"
      ? [parsed.domain]
      : TLDS.map((t) => `${parsed.base}.${t}`);
    /* A different opening line each time, picked here rather than in the
       effect that rotates them. */
    setWaitIndex(Math.floor(Math.random() * WAITING.length));
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domains: wanted }),
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
        <label className="tl__label" htmlFor="tl-name">The name you want</label>
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
          Type just the name and we check six endings. Type a full address,
          like mybusiness.com.ng, and we check only that one.
        </p>
      </form>

      {error && <p className="tl__err" role="alert">{error}</p>}

      {/* Not a spinner. The lookup fans out to six registries and some of them
          take their time, so this is a couple of seconds of dead air; a line
          that changes is the same wait spent better. `aria-live` is off here
          deliberately: a screen reader does not need a new joke every 1.5
          seconds, and the button already announces itself as busy. */}
      {busy && (
        <p className="tl__wait" aria-hidden="true">
          <span className="tl__waitDot" />
          {WAITING[waitIndex]}
        </p>
      )}

      {/* `aria-live` so the answer is announced rather than silently appearing
          under a button somebody just pressed. */}
      <div aria-live="polite">
        {rows && (
          <>
            <ul className="tl__list">
              {rows.map((r) => {
                /* THE ENDING, ON THE LEFT, AS A CHIP. The row used to be a name
                   at one end and a verdict at the other with a hand's width of
                   nothing between them, which read as a layout that had given
                   up. The ending is the thing a reader is actually comparing
                   across six rows, so pulling it out is useful as well as
                   something to look at. */
                const dot = r.domain.indexOf(".");
                const ending = dot > 0 ? r.domain.slice(dot) : "";
                const stem = dot > 0 ? r.domain.slice(0, dot) : r.domain;
                return (
                  <li className={`tl__item tl__item--${r.status}`} key={r.domain}>
                    <span className="tl__tld" aria-hidden="true">{ending}</span>
                    <span className="tl__name">
                      {stem}<b>{ending}</b>
                    </span>
                    <span className="tl__state">
                      {r.status === "available" && <><Check aria-hidden="true" /> Available</>}
                      {r.status === "taken" && <><X aria-hidden="true" /> Taken</>}
                      {r.status === "unknown" && <>Unconfirmed</>}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* The long explanation about Nigeria's registry is gone. It was
                three lines of our problem in the middle of their answer, and
                the reader's question is which names they can have. The short
                line says the same thing and gets out of the way. */}
            {unknowns > 0 && (
              <p className="tl__note">
                {unknowns === 1 ? "One ending" : `${unknowns} endings`} did not
                answer. We will check by hand and tell you.
              </p>
            )}

            {/* A WAY BACK. The tool answered and then left the reader with no
                way to ask again except selecting the box and retyping over it.
                One button clears the answer and puts the cursor back. */}
            <button
              type="button"
              className="tl__again"
              onClick={() => {
                setRows(null);
                setError("");
                setName("");
                document.getElementById("tl-name")?.focus();
              }}
            >
              <RotateCcw aria-hidden="true" /> Check another name
            </button>

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
