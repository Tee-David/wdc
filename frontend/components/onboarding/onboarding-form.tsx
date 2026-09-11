"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Paperclip } from "lucide-react";
import { SERVICES, type ServiceSlug } from "@/lib/services";
import { stepsFor, type Field, type Step } from "@/lib/onboarding";
import "./onboarding.css";

/**
 * The onboarding form.
 *
 * DEMO. There is no endpoint yet: the last step says so, and nothing leaves
 * the browser. Everything else is real — branching, validation, the draft that
 * survives a closed tab, the read-back. Wiring it to CockroachDB and R2 does
 * not require any of this to change.
 *
 * THE SHAPE, from the two references: a step rail carrying a title AND a line
 * of explanation for each step, one decision per screen, and a panel beside
 * the fields saying what the step is for. The rail collapses to a progress bar
 * on a phone, where there is no room for eleven descriptions.
 *
 * ANSWERS ARE A FLAT MAP keyed by field key, which is the shape the database
 * will store as JSONB. Multi-selects hold an array, everything else a string.
 */

type Answers = Record<string, string | string[]>;

const KEY = "wdc-onboarding-draft";

function isFilled(v: string | string[] | undefined) {
  return Array.isArray(v) ? v.length > 0 : Boolean(v && v.trim());
}

/** A field is asked only when its condition is met. Hidden means not asked. */
function visible(f: Field, a: Answers) {
  if (!f.showIf) return true;
  const v = a[f.showIf.key];
  if (Array.isArray(v)) return v.some((x) => f.showIf!.equals.includes(x));
  return typeof v === "string" && f.showIf.equals.includes(v);
}

type Draft = { answers: Answers; services: ServiceSlug[]; step: number; started: boolean };

/**
 * Draft, layer one: local, from the first keystroke, no infrastructure. The
 * server draft and the emailed resume link are the next piece of work.
 *
 * READ ONCE, IN A LAZY INITIALISER, NOT IN AN EFFECT. Restoring in an effect
 * means the form paints empty and then jumps to the saved state a frame
 * later, which looks like the draft was lost; it is also a cascading render
 * React now warns about. Reading it during the first render instead is only
 * safe because this component never renders on the server -- see the
 * `ssr: false` mount beside it -- so there is no server HTML for a restored
 * draft to disagree with.
 */
function readDraft(): Partial<Draft> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw);
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    /* a blocked or full store is not a reason to break the form */
    return {};
  }
}

export default function OnboardingForm() {
  const [draft] = useState(readDraft);

  /* Which services this client bought. In production this comes from the
     token's project record; in the demo it is pickable so the whole form can
     be seen without six separate links. */
  const [services, setServices] = useState<ServiceSlug[]>(() =>
    Array.isArray(draft.services) && draft.services.length ? draft.services : ["branding", "web"],
  );
  const [started, setStarted] = useState(() => draft.started === true);
  const [i, setI] = useState(() => (typeof draft.step === "number" ? draft.step : 0));
  const [a, setA] = useState<Answers>(() => draft.answers ?? {});
  const [tried, setTried] = useState(false);
  /* Whether there is a draft to return to, so the opening button can say
     "pick up where you left off" rather than "start". Cleared by "start over",
     which wipes the draft: the button must not keep offering one. */
  const [restored, setRestored] = useState(() => draft.started === true);

  const steps = useMemo(() => stepsFor(services), [services]);
  const step: Step | undefined = steps[i];

  useEffect(() => {
    if (!started) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ answers: a, services, step: i, started }));
    } catch { /* ignore */ }
  }, [a, services, i, started]);

  const set = (k: string, v: string | string[]) => setA((p) => ({ ...p, [k]: v }));

  const shown = step ? step.fields.filter((f) => visible(f, a)) : [];
  const missing = shown.filter((f) => f.required && !isFilled(a[f.key]));

  const next = () => {
    setTried(true);
    if (missing.length) {
      document.querySelector(`[data-field="${missing[0].key}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setTried(false);
    setI((n) => Math.min(n + 1, steps.length));
  };
  const back = () => { setTried(false); setI((n) => Math.max(0, n - 1)); };

  const done = i >= steps.length;
  const pct = Math.round((Math.min(i, steps.length) / steps.length) * 100);

  /* ------------------------------------------------ welcome */
  if (!started) {
    const preview = stepsFor(services);
    const mins = Math.max(4, Math.round(preview.length * 1.8));
    return (
      <div className="ob ob--intro">
        <p className="ob__k">Client onboarding</p>
        <h1>Tell us about the work.</h1>
        <p className="ob__lede">
          This is the brief. It is the last time we will ask you for most of
          this, and the answers go straight into the work rather than into a
          file nobody opens.
        </p>

        <div className="ob__facts">
          <div><dt>Steps</dt><dd>{preview.length}</dd></div>
          <div><dt>About</dt><dd>{mins} min</dd></div>
          <div><dt>Saves</dt><dd>As you go</dd></div>
        </div>

        <div className="ob__note">
          <h2>Before you start</h2>
          <ul>
            <li>Have your logo files and brand colours to hand if you have them.</li>
            <li>If you are not sure about something, say so. &ldquo;Not sure yet&rdquo; is a real answer here and it will not hold anything up.</li>
            <li>It saves itself. Close the tab and come back to this link.</li>
            <li>What you write stays between us and the people working on your project.</li>
          </ul>
        </div>

        {/* In production the services come from the project record behind the
            token. Here they are pickable so the whole form is reachable. */}
        <div className="ob__demo">
          <p className="ob__k">Demo only · pick what a client bought</p>
          <div className="ob__picks">
            {SERVICES.map((s) => (
              <label className="ob__pick" key={s.slug}>
                <input
                  type="checkbox"
                  checked={services.includes(s.slug)}
                  onChange={(e) =>
                    setServices((p) =>
                      e.target.checked ? [...p, s.slug] : p.filter((x) => x !== s.slug),
                    )
                  }
                />
                <span>{s.short}</span>
              </label>
            ))}
          </div>
        </div>

        <button className="ob__btn ob__btn--go" type="button" onClick={() => setStarted(true)}>
          {restored ? "Pick up where you left off" : "Start"} <ArrowRight aria-hidden="true" />
        </button>
      </div>
    );
  }

  /* ------------------------------------------------ review */
  if (done) {
    return (
      <div className="ob ob--intro">
        <p className="ob__k">Review</p>
        <h1>Read it back.</h1>
        <p className="ob__lede">
          Everything you have told us. Change anything that is not right before
          you send it.
        </p>

        <div className="ob__review">
          {steps.map((s, n) => (
            <section key={s.id}>
              <h2>
                {s.title}
                <button type="button" onClick={() => setI(n)}>Edit</button>
              </h2>
              <dl>
                {s.fields.filter((f) => visible(f, a)).map((f) => (
                  <div key={f.key}>
                    <dt>{f.label}</dt>
                    <dd>
                      {isFilled(a[f.key])
                        ? (Array.isArray(a[f.key]) ? (a[f.key] as string[]).join(", ") : a[f.key])
                        : <em>Not answered</em>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div className="ob__demo ob__demo--end">
          <p className="ob__k">Demo</p>
          <p>
            There is no submit endpoint yet, so nothing is sent and nothing
            leaves this browser. Your answers are held in this device&rsquo;s local
            storage only.
          </p>
        </div>

        <div className="ob__acts">
          <button className="ob__btn ob__btn--go" type="button" disabled>
            Send the brief <ArrowRight aria-hidden="true" />
          </button>
          <button className="ob__btn ob__btn--ghost" type="button" onClick={back}>
            <ArrowLeft aria-hidden="true" /> Back
          </button>
          <button
            className="ob__btn ob__btn--ghost"
            type="button"
            onClick={() => {
              try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
              setA({}); setI(0); setStarted(false); setRestored(false);
            }}
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------ a step */
  return (
    <div className="ob">
      {/* the rail */}
      <nav className="ob__rail" aria-label="Progress">
        <div className="ob__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <p className="ob__count">Step {i + 1} of {steps.length}</p>
        <ol>
          {steps.map((s, n) => (
            <li key={s.id} className={n === i ? "is-on" : n < i ? "is-done" : undefined}>
              <button type="button" onClick={() => { setTried(false); setI(n); }} disabled={n > i}>
                <span className="ob__n" aria-hidden="true">
                  {n < i ? <Check /> : String(n + 1).padStart(2, "0")}
                </span>
                <span>
                  <b>{s.title}</b>
                  <em>{s.blurb}</em>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* the step */}
      <div className="ob__main">
        <p className="ob__k">Step {i + 1} of {steps.length}</p>
        <h1>{step.title}</h1>
        <p className="ob__blurb">{step.blurb}</p>

        <div className="ob__fields">
          {shown.map((f) => (
            <FieldView
              key={f.key}
              f={f}
              value={a[f.key]}
              onChange={(v) => set(f.key, v)}
              invalid={tried && f.required === true && !isFilled(a[f.key])}
            />
          ))}
        </div>

        <div className="ob__acts">
          {i > 0 && (
            <button className="ob__btn ob__btn--ghost" type="button" onClick={back}>
              <ArrowLeft aria-hidden="true" /> Back
            </button>
          )}
          <button className="ob__btn ob__btn--go" type="button" onClick={next}>
            {i === steps.length - 1 ? "Review" : "Next"} <ArrowRight aria-hidden="true" />
          </button>
        </div>

        {tried && missing.length > 0 && (
          <p className="ob__err" role="alert">
            {missing.length === 1
              ? `${missing[0].label} still needs an answer.`
              : `${missing.length} questions still need an answer.`}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ field */

function FieldView({
  f, value, onChange, invalid,
}: {
  f: Field;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  invalid: boolean;
}) {
  const id = `ob-${f.key}`;
  const v = value ?? (f.kind === "multi" ? [] : "");

  const label = (
    <label className="ob__label" htmlFor={id}>
      {f.label}
      {f.required ? <b aria-hidden="true"> *</b> : <i> (optional)</i>}
    </label>
  );
  /* Always visible, under the label. A hint the form cannot be completed
     without is not a hint, it is a label, so none of these are hidden behind
     a hover. */
  const hint = f.hint ? <p className="ob__hint">{f.hint}</p> : null;

  const wrap = (inner: React.ReactNode) => (
    <div className={`ob__f${invalid ? " is-bad" : ""}`} data-field={f.key}>
      {label}
      {hint}
      {inner}
    </div>
  );

  if (f.kind === "textarea") {
    return wrap(<textarea id={id} value={v as string} placeholder={f.placeholder}
                          onChange={(e) => onChange(e.target.value)} rows={4} />);
  }

  if (f.kind === "select") {
    return wrap(
      <div className="ob__sel">
        <select id={id} value={v as string} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose one</option>
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>,
    );
  }

  if (f.kind === "cards" || f.kind === "yesno") {
    const opts = f.kind === "yesno" ? ["Yes", "No"] : f.options ?? [];
    return wrap(
      <div className="ob__cards" role="radiogroup" aria-labelledby={id}>
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={v === o}
            className={`ob__card${v === o ? " is-on" : ""}`}
            onClick={() => onChange(o)}
          >
            <span className="ob__dot" aria-hidden="true" />
            {o}
          </button>
        ))}
      </div>,
    );
  }

  if (f.kind === "multi") {
    const arr = v as string[];
    return wrap(
      <div className="ob__cards">
        {f.options?.map((o) => {
          const on = arr.includes(o);
          return (
            <button
              key={o}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={`ob__card${on ? " is-on" : ""}`}
              onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}
            >
              <span className="ob__tick" aria-hidden="true">{on ? <Check /> : null}</span>
              {o}
            </button>
          );
        })}
      </div>,
    );
  }

  if (f.kind === "upload") {
    /* Deliberately inert. Uploads go browser-to-R2 through a presigned URL,
       which needs the endpoint that does not exist yet; a file picker that
       accepts a file and silently drops it would be worse than one that says
       what it is. */
    return wrap(
      <div className="ob__upload">
        <Paperclip aria-hidden="true" />
        <span>File upload arrives with the backend. Send anything you have by email for now.</span>
      </div>,
    );
  }

  return wrap(
    <input
      id={id}
      type={f.kind === "email" ? "email" : f.kind === "tel" ? "tel" : f.kind === "url" ? "url" : "text"}
      value={v as string}
      placeholder={f.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />,
  );
}
