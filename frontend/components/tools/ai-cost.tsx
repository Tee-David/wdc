"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  JOBS, MODELS, PRICES_REVIEWED, naira, perRunLabel, priceAll, reading,
} from "@/lib/ai-cost";
import { RATE_CARD } from "@/lib/estimate";

/**
 * The AI running-cost calculator at /tools/ai-cost.
 *
 * THE SECOND QUESTION, ASKED OUT LOUD. "What will it cost to build" is the one
 * everybody asks and /tools/estimate answers. "What will it cost every month
 * once it is running" is the one that decides whether the feature survives its
 * first quarter, and almost nobody asks it before the build.
 *
 * IT ANSWERS IMMEDIATELY AND KEEPS ANSWERING. There is no submit button and no
 * email field anywhere on this page: the arithmetic is pure, it runs on the
 * reader's own device, and the figures move as they type. A calculator that
 * makes you press Go to see a number you have already given it every input for
 * is a form pretending to be a tool.
 *
 * AND IT IS ALLOWED TO SAY "DON'T". At a small volume it says the model bill is
 * not the thing to worry about; at a large one it says the choice of model
 * matters more than any prompt tuning. Both sentences cost us work we might
 * otherwise have been paid for, and both are why somebody believes the rest.
 */
export default function AiCost() {
  const [job, setJob] = useState(JOBS[0].key);
  const [runs, setRuns] = useState("5000");
  const [inWords, setInWords] = useState(String(JOBS[0].inWords));
  const [outWords, setOutWords] = useState(String(JOBS[0].outWords));

  /* A half-typed number must not read as zero and blank the table; it reads as
     nothing until it is a number again. */
  const read = (value: string) => (Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0);

  const usage = useMemo(
    () => ({ runs: read(runs), inWords: read(inWords), outWords: read(outWords) }),
    [runs, inWords, outWords],
  );

  const lines = useMemo(() => priceAll(usage, RATE_CARD.nairaPerUsd), [usage]);
  const note = reading(usage, lines);
  const chosen = JOBS.find((j) => j.key === job) ?? JOBS[0];

  /* Picking a shape overwrites the two word counts, because they are what the
     shape MEANS -- and they stay editable, because the reader knows their own
     use better than our four examples do. */
  const pickJob = (key: string) => {
    const next = JOBS.find((j) => j.key === key);
    if (!next) return;
    setJob(key);
    setInWords(String(next.inWords));
    setOutWords(String(next.outWords));
  };

  return (
    <div className="tl tl--split">
      <form className="tl__form es__form" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="tl__kinds es__q">
          <legend className="tl__label">What would it be doing?</legend>
          <div className="es__opts" role="radiogroup" aria-label="What would it be doing?">
            {JOBS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={job === option.key}
                className={`es__opt${job === option.key ? " is-on" : ""}`}
                onClick={() => pickJob(option.key)}
              >
                <span className="es__optT">{option.label}</span>
                <span className="es__optN">{option.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="tl__label" htmlFor="ai-runs">How many times a month?</label>
        <input
          id="ai-runs"
          className="tl__input sn__priceIn"
          type="number"
          min={0}
          max={100_000_000}
          inputMode="numeric"
          value={runs}
          onChange={(e) => setRuns(e.target.value)}
          aria-describedby="ai-runs-hint"
        />
        <p className="tl__hint" id="ai-runs-hint">
          Conversations, documents, messages — whatever one use of the feature is.
        </p>

        {/* THE TWO WORD COUNTS ARE THE HONEST PART OF THE FORM. Everybody
            understands words; nobody has any feel for tokens, and asking for
            them would make the tool look precise and be useless. */}
        <div className="ai__pair">
          <label className="tl__label" htmlFor="ai-in">
            Words it reads each time
            <input
              id="ai-in"
              className="tl__input sn__priceIn"
              type="number"
              min={0}
              inputMode="numeric"
              value={inWords}
              onChange={(e) => setInWords(e.target.value)}
            />
          </label>
          <label className="tl__label" htmlFor="ai-out">
            Words it writes each time
            <input
              id="ai-out"
              className="tl__input sn__priceIn"
              type="number"
              min={0}
              inputMode="numeric"
              value={outWords}
              onChange={(e) => setOutWords(e.target.value)}
            />
          </label>
        </div>
        <p className="tl__hint">
          Starting points for {chosen.label.toLowerCase()}. Change them to match what
          you actually have — writing costs several times more than reading, so the
          second box moves the bill hardest.
        </p>
      </form>

      <div className="tl__out" aria-live="polite">
        <div className="es__range">
          <p className="tl__stepK">Every month, at that volume</p>
          <p className="es__ngn">
            {naira(lines[0].naira)} <i aria-hidden="true">to</i> {naira(lines[lines.length - 1].naira)}
          </p>
          <p className="es__usd">
            Depending entirely on which model answers it. Prices reviewed {PRICES_REVIEWED};
            converted at ₦{RATE_CARD.nairaPerUsd.toLocaleString("en-NG")} to the dollar.
          </p>
          <p className="es__caveat">{note}</p>
        </div>

        <h3 className="es__h">Model by model</h3>
        <ul className="ai__list">
          {lines.map((line) => (
            <li key={line.model.key}>
              <span className="ai__name">
                {line.model.name}
                <b>{line.model.maker}</b>
              </span>
              <span className="ai__money">
                {naira(line.naira)}
                <b>{perRunLabel(line.perRun)} each</b>
              </span>
              <span className="ai__note">{line.model.note}</span>
            </li>
          ))}
        </ul>

        <div className="es__assume">
          <h3 className="es__h">What this does not include</h3>
          <ul className="es__bullets">
            <li>
              Caching, which most providers bill at a tenth of the input rate and which
              a well-built feature leans on heavily. Assume the real figure is lower
              than the one above, not higher.
            </li>
            <li>
              Batching, worth about half price where the answer can wait a few hours.
            </li>
            <li>
              Our fee for building it. That is the other tool:{" "}
              <Link href="/tools/estimate">what it costs to build</Link>.
            </li>
            <li>
              Anything a provider charges for images, audio or long-context tiers. The
              table above is text in, text out — check the provider&rsquo;s own page
              before you sign anything.
            </li>
          </ul>
        </div>

        <div className="tl__step">
          <p className="tl__stepK">Worth saying plainly</p>
          <h3>Sometimes the answer is not a model</h3>
          <p>
            If the job is sorting things into a fixed set of buckets, matching a
            record or answering from a table you already have, ordinary code does it
            faster, cheaper and the same way every time. We will tell you that before
            you pay us to build the other thing.
          </p>
          <div className="tl__stepActs">
            <Link className="pv-btn pv-btn--accent" href="/contact">
              Talk it through
            </Link>
            <Link className="pv-btn pv-btn--light" href="/services/software">
              See our software work
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Rendered nowhere else, and kept beside the component that needs it: the model
   count is used by the page copy above the tool. */
export const MODEL_COUNT = MODELS.length;
