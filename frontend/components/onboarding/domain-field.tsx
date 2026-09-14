"use client";

import { useState } from "react";
import { Check, Loader2, Minus, Plus, X } from "lucide-react";

/**
 * Up to three domain names, with an explicit availability check.
 *
 * WHY A BUTTON AND NOT A CHECK-AS-YOU-TYPE. Every keystroke would be a request
 * to somebody else's registry, which is rude at best and rate-limited at
 * worst, and a name half typed is not a question anyone wants answered. The
 * client says when they are ready.
 *
 * WHY "UNKNOWN" IS A REAL ANSWER AND NOT AN ERROR. Measured on 2026-09-14:
 * `.ng` is listed in the IANA bootstrap and its RDAP service returns 502 or
 * times out on every request, and `.io` and `.co` publish no such service at
 * all. For a Nigerian studio that is not an edge case, it is a normal Tuesday,
 * so the third state is designed rather than apologised for: we say we will
 * check that one by hand, which is true and is what happens.
 *
 * NOTHING HERE IS REQUIRED AND NOTHING HERE BLOCKS. A client can type three
 * names, check none of them, and finish the form. The answers are a
 * conversation starter for the first call, not a purchase.
 */

type Status = "available" | "taken" | "unknown";
type Row = { value: string; status?: Status; note?: string };

const MAX = 3;

export default function DomainField({
  id,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  /** Newline separated, so the stored answer stays a plain string like every
      other field and needs no migration in the draft or the submission. */
  value: string;
  onChange: (v: string) => void;
  describedBy?: string;
}) {
  const initial = value
    ? value.split("\n").map((v) => ({ value: v })).slice(0, MAX)
    : [{ value: "" }];
  const [rows, setRows] = useState<Row[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const push = (next: Row[]) => {
    setRows(next);
    onChange(next.map((r) => r.value).filter(Boolean).join("\n"));
  };

  const setAt = (i: number, patch: Partial<Row>) => {
    const next = rows.map((r, n) => (n === i ? { ...r, ...patch } : r));
    push(next);
  };

  const check = async () => {
    const domains = rows.map((r) => r.value.trim()).filter(Boolean);
    if (domains.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domains }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "We could not check those just now.");
        return;
      }
      /* Matched back by name rather than by index: the server normalises and
         deduplicates, so what comes back is not necessarily what went out in
         the same order or the same number. */
      const byName = new Map<string, { status: Status; note?: string }>(
        (data.results as { domain: string; status: Status; note?: string }[])
          .map((r) => [r.domain, { status: r.status, note: r.note }]),
      );
      push(
        rows.map((r) => {
          const key = r.value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
          const hit = byName.get(key);
          return hit ? { ...r, status: hit.status, note: hit.note } : { ...r, status: undefined, note: undefined };
        }),
      );
    } catch {
      setError("We could not reach the checker. Your answers are still saved.");
    } finally {
      setBusy(false);
    }
  };

  const anyValue = rows.some((r) => r.value.trim());

  return (
    <div className="dm" id={id} aria-describedby={describedBy}>
      <ul className="dm__list">
        {rows.map((row, i) => (
          <li className="dm__row" key={i}>
            <input
              className="dm__input"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder={i === 0 ? "yourbusiness.com" : "another idea"}
              value={row.value}
              aria-label={`Domain idea ${i + 1}`}
              onChange={(e) => setAt(i, { value: e.target.value, status: undefined, note: undefined })}
            />
            {rows.length > 1 && (
              <button
                type="button"
                className="dm__drop"
                onClick={() => push(rows.filter((_, n) => n !== i))}
                aria-label={`Remove domain idea ${i + 1}`}
              >
                <Minus aria-hidden="true" />
              </button>
            )}
            {row.status && (
              <p className={`dm__state dm__state--${row.status}`}>
                {row.status === "available" && <><Check aria-hidden="true" /> Looks available</>}
                {row.status === "taken" && <><X aria-hidden="true" /> Already registered</>}
                {row.status === "unknown" && <>{row.note ?? "We will check this one by hand."}</>}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="dm__acts">
        {rows.length < MAX && (
          <button type="button" className="dm__add" onClick={() => push([...rows, { value: "" }])}>
            <Plus aria-hidden="true" /> Add another
          </button>
        )}
        <button type="button" className="dm__check" onClick={check} disabled={busy || !anyValue}>
          {busy ? <><Loader2 className="dm__spin" aria-hidden="true" /> Checking</> : "Check availability"}
        </button>
      </div>

      {error && <p className="dm__err" role="status">{error}</p>}

      {/* SAID BEFORE ANYONE ACTS ON IT, not in the small print underneath a
          green tick. And no prices anywhere: what a registrar charges is not
          ours to quote, and a figure here would be wrong by the time it
          mattered. */}
      <p className="dm__note">
        A check asks the registry directly, but a name is only yours once it is
        registered. We will confirm before anything is bought, and it is
        registered in your name.
      </p>
    </div>
  );
}
