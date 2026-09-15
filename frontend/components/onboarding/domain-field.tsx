"use client";

import { useState } from "react";
import { Check, Globe, Loader2, Minus, Plus, Sparkles, X } from "lucide-react";

/**
 * Up to three domain names, with the availability check offered rather than
 * imposed.
 *
 * WHY THE CHECKER IS BEHIND A YES. This is one question on a long form, and
 * the checker used to arrive fully assembled: an extra button, three status
 * slots and a paragraph of caveats, on a question most people answer by typing
 * a name they already had in mind. That is a lot of apparatus to read past.
 * Now the question is just three boxes, and above them one offer: do you want
 * us to check these. Say no and it folds away; the offer stays reversible,
 * because a client who declines on the way down often wants it on the way back
 * up.
 *
 * WHY THIS ADDS NO QUESTION TO THE FORM. The opt-in is local state inside this
 * control, not a `Field` in lib/onboarding.ts. The step still asks what it
 * asked before, the progress count is unchanged, and nothing new has to be
 * answered, validated, stored or reviewed.
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
 * WHY THE PICK IS PART OF THE ANSWER. "Which of these do you actually want" is
 * the thing the first call opens with, and asking it as a fourth question
 * would be a fourth question. One tap on a result records it, and it is stored
 * as plain text on the end of the line, so the saved answer is still the
 * newline-separated string every other field is and the review screen, the
 * draft and the submitted record all read it without knowing anything new.
 *
 * NOTHING HERE IS REQUIRED AND NOTHING HERE BLOCKS. A client can type three
 * names, check none of them, pick none of them, and finish the form. The
 * answers are a conversation starter for the first call, not a purchase.
 */

type Status = "available" | "taken" | "unknown";
type Row = { value: string; status?: Status; note?: string };

const MAX = 3;

/** Appended to the chosen line. Plain words, because a human reads this next. */
const PICK_TAG = " (first choice)";

function parse(value: string): { rows: Row[]; picked: number } {
  if (!value) return { rows: [{ value: "" }], picked: -1 };
  let picked = -1;
  const rows = value.split("\n").slice(0, MAX).map((line, i) => {
    if (line.endsWith(PICK_TAG)) {
      picked = i;
      return { value: line.slice(0, -PICK_TAG.length) };
    }
    return { value: line };
  });
  return { rows: rows.length ? rows : [{ value: "" }], picked };
}

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
  const start = parse(value);
  const [rows, setRows] = useState<Row[]>(start.rows);
  const [picked, setPicked] = useState(start.picked);
  /* "ask" until they answer the offer. A restored draft that already carries a
     pick opens with the checker on, because they clearly used it last time. */
  const [offer, setOffer] = useState<"ask" | "on" | "off">(
    start.picked >= 0 ? "on" : "ask",
  );
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  const push = (next: Row[], nextPicked = picked) => {
    setRows(next);
    setPicked(nextPicked);
    onChange(
      next
        .map((r, i) => (r.value.trim() ? r.value.trim() + (i === nextPicked ? PICK_TAG : "") : ""))
        .filter(Boolean)
        .join("\n"),
    );
  };

  /* Editing a name drops whatever was known about it, the pick included: the
     tick beside a name you have just changed is about the old name. */
  const edit = (i: number, text: string) => {
    push(
      rows.map((r, n) => (n === i ? { value: text } : r)),
      picked === i ? -1 : picked,
    );
  };

  const drop = (i: number) => {
    push(
      rows.filter((_, n) => n !== i),
      picked === i ? -1 : picked > i ? picked - 1 : picked,
    );
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
      setChecked(true);
    } catch {
      setError("We could not reach the checker. Your answers are still saved.");
    } finally {
      setBusy(false);
    }
  };

  const anyValue = rows.some((r) => r.value.trim());
  const open = offer === "on";
  const pickedName = picked >= 0 ? rows[picked]?.value.trim() : "";

  return (
    <div className="dm" id={id} aria-describedby={describedBy}>
      {/* THE OFFER, ABOVE THE BOXES. Above rather than below, because the
          answer to "shall we check these" changes how you fill the boxes in:
          somebody who knows a name will be checked types the ending they
          actually want instead of a bare word. */}
      {offer === "ask" ? (
        <div className="dm__offer">
          <p className="dm__offerT">
            <Globe aria-hidden="true" />
            Want us to check if these names are free?
          </p>
          <p className="dm__offerP">
            We ask the registries directly, right here. It takes a second, and
            nothing is bought.
          </p>
          <div className="dm__offerActs">
            <button type="button" className="dm__yes" onClick={() => setOffer("on")}>
              Yes, check them
            </button>
            <button type="button" className="dm__no" onClick={() => setOffer("off")}>
              No thanks
            </button>
          </div>
        </div>
      ) : null}

      {/* REVERSIBLE, like every other deferral on this form. Declining the
          offer hides the checker; it does not take it away. */}
      {offer === "off" ? (
        <p className="dm__reopen">
          Changed your mind?{" "}
          <button type="button" onClick={() => setOffer("on")}>Check them for me</button>
        </p>
      ) : null}

      {open ? (
        <ul className="dm__tips">
          <li>
            <Sparkles aria-hidden="true" />
            <span>
              Short and easy to say out loud beats clever. If you have to spell
              it down the phone, it is too long.
            </span>
          </li>
          <li>
            <Check aria-hidden="true" />
            <span>
              Found one you like? Tap <b>Use this one</b>. If it is still free
              when we start, we buy it in your name once we have both agreed.
            </span>
          </li>
        </ul>
      ) : null}

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
              onChange={(e) => edit(i, e.target.value)}
            />
            {rows.length > 1 && (
              <button
                type="button"
                className="dm__drop"
                onClick={() => drop(i)}
                aria-label={`Remove domain idea ${i + 1}`}
              >
                <Minus aria-hidden="true" />
              </button>
            )}

            {(row.status || picked === i) && (
              <div className="dm__after">
                {row.status && (
                  <p className={`dm__state dm__state--${row.status}`}>
                    {row.status === "available" && <><Check aria-hidden="true" /> Looks available</>}
                    {row.status === "taken" && <><X aria-hidden="true" /> Already registered</>}
                    {row.status === "unknown" && <>{row.note ?? "We will check this one by hand."}</>}
                  </p>
                )}
                {/* OFFERED ON ANYTHING NOT ALREADY GONE. A name the registry
                    would not answer for is still a name they can want; that is
                    what we check by hand. A taken one is not a choice. */}
                {picked === i ? (
                  <span className="dm__is">
                    <Check aria-hidden="true" /> Your first choice
                  </span>
                ) : row.status && row.status !== "taken" ? (
                  <button
                    type="button"
                    className="dm__use"
                    onClick={() => push(rows, i)}
                  >
                    Use this one
                  </button>
                ) : null}
              </div>
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
        {open && (
          <button type="button" className="dm__check" onClick={check} disabled={busy || !anyValue}>
            {busy ? <><Loader2 className="dm__spin" aria-hidden="true" /> Checking</> : "Check availability"}
          </button>
        )}
      </div>

      {error && <p className="dm__err" role="status">{error}</p>}

      {/* SAID ONCE, WHERE IT LANDS. It used to sit under the field from the
          moment the step opened, caveating results nobody had asked for yet.
          A check is not a reservation, and that is worth saying the second
          there is a green tick on screen to misread. */}
      {pickedName ? (
        <p className="dm__won" role="status">
          <Check aria-hidden="true" />
          <span>
            Noted, <b>{pickedName}</b>. A check is not a reservation, so we will
            confirm it is still free and register it in your name once we have
            agreed. You can change this any time before then.
          </span>
        </p>
      ) : checked ? (
        <p className="dm__note">
          A check asks the registry directly, but a name is only yours once it
          is registered. Nothing is bought without your say-so, and it goes in
          your name.
        </p>
      ) : null}
    </div>
  );
}
