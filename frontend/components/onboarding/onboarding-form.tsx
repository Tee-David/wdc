"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, HelpCircle, Save, Undo2,
} from "lucide-react";
import { SERVICES, type ServiceSlug } from "@/lib/services";
import {
  isFilled, minutesLeft, PHASES, PICKER_LINE, problemWith, stepsFor, UNSURE,
  type Field, type PhaseId, type Step,
} from "@/lib/onboarding";
import PhoneField from "./phone-field";
import SearchableSelect from "./searchable-select";
import Dropzone from "./dropzone";
import ServiceIcon from "@/components/ui/service-icon";
import Tip from "./tip";
import Dialog from "./dialog";
import "./onboarding.css";
import "./phone-field.css";
import "./form-kit.css";

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

/** A field is asked only when its condition is met. Hidden means not asked. */
function visible(f: Field, a: Answers) {
  if (!f.showIf) return true;
  const v = a[f.showIf.key];
  if (Array.isArray(v)) return v.some((x) => f.showIf!.equals.includes(x));
  return typeof v === "string" && f.showIf.equals.includes(v);
}

type Draft = { answers: Answers; service: ServiceSlug; step: number; started: boolean };

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

  /* WHICH SERVICE THIS FORM IS FOR -- one, not a list.
     A client who bought three fills this three times, each run short and about
     one thing. See the note on `stepsFor` in lib/onboarding.ts for why that
     beats stitching them into a single fifteen-step run.

     In production it comes from the project record behind the link; in the
     demo it is pickable so every version is reachable. */
  const [service, setService] = useState<ServiceSlug>(() =>
    typeof draft.service === "string" ? draft.service : "web",
  );
  const [started, setStarted] = useState(() => draft.started === true);
  const [i, setI] = useState(() => (typeof draft.step === "number" ? draft.step : 0));
  const [a, setA] = useState<Answers>(() => draft.answers ?? {});
  const [tried, setTried] = useState(false);
  /* WHICH FIELDS HAVE BEEN LEFT, not which have been typed in. A form that
     turns red while you are still halfway through typing your email address is
     scolding you for not having finished yet, so nothing is judged until the
     caret has moved on -- or until Next is pressed, which is the other moment
     a person has declared they are done. */
  const [touched, setTouched] = useState<Record<string, true>>({});
  /* The phone field's own verdict, which the schema cannot reach: whether the
     digits are a real number FOR THE COUNTRY CHOSEN is libphonenumber's
     judgement, not a regular expression's. */
  const [phoneOk, setPhoneOk] = useState<Record<string, boolean>>({});
  /* "Saved" confirmation, shown for a beat after the explicit save. */
  const [savedAt, setSavedAt] = useState(0);
  /* The two dialogs: saving for later, and confirming a wipe. */
  const [saveOpen, setSaveOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resumeEmail, setResumeEmail] = useState("");
  /* Whether there is a draft to return to, so the opening button can say
     "pick up where you left off" rather than "start". Cleared by "start over",
     which wipes the draft: the button must not keep offering one. */
  const [restored, setRestored] = useState(() => draft.started === true);

  const steps = useMemo(() => stepsFor(service), [service]);
  const step: Step | undefined = steps[i];

  useEffect(() => {
    if (!started) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ answers: a, service, step: i, started }));
    } catch { /* ignore */ }
  }, [a, service, i, started]);

  const set = (k: string, v: string | string[]) => setA((p) => ({ ...p, [k]: v }));

  /* Memoised because `problems` below depends on it: a fresh array every
     render would make that useMemo recompute every render, which is the same
     as not having it. */
  const shown = useMemo(
    () => (step ? step.fields.filter((f) => visible(f, a)) : []),
    [step, a],
  );

  /* Every problem on this step, in the order the questions are asked, so the
     summary reads down the page rather than in whatever order the checks
     happened to run. */
  const problems = useMemo(
    () =>
      shown
        .map((f) => ({ f, msg: problemWith(f, a[f.key], { phoneOk: phoneOk[f.key] }) }))
        .filter((x): x is { f: Field; msg: string } => x.msg !== null),
    [shown, a, phoneOk],
  );

  /* Shown against a field only once that field has been left, or once Next has
     been pressed. See the note on `touched`. */
  const showProblem = (k: string) => tried || touched[k] === true;

  const goTo = (key: string) => {
    const el = document.querySelector<HTMLElement>(`[data-field="${key}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    /* Focus, not just scroll: a keyboard or screen-reader user who presses
       Next and is only scrolled has been told nothing. */
    el?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
  };

  const next = () => {
    setTried(true);
    if (problems.length) { goTo(problems[0].f.key); return; }
    setTried(false);
    setTouched({});
    setI((n) => Math.min(n + 1, steps.length));
    /* Back to the top of the new step. Landing halfway down a fresh set of
       questions because the last one was long is disorienting. */
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };
  const back = () => {
    setTried(false);
    setI((n) => Math.max(0, n - 1));
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const done = i >= steps.length;

  /* --------------------------------------------------------- the progress */
  /* Progress is measured in PARTS, not in steps -- see the long note on PHASES
     in lib/onboarding.ts. Each part fills as its own steps are finished, so
     the reader is watching three short bars complete rather than one long one
     crawl. */
  const phase: PhaseId = step?.phase ?? "final";
  const inPhase = useMemo(() => steps.filter((s) => s.phase === phase), [steps, phase]);
  const posInPhase = inPhase.findIndex((s) => s.id === step?.id) + 1;

  const phaseFill = (id: PhaseId) => {
    const all = steps.filter((s) => s.phase === id);
    if (!all.length) return 0;
    const doneHere = all.filter((s) => steps.indexOf(s) < i).length;
    return Math.round((doneHere / all.length) * 100);
  };

  const mins = useMemo(
    () => minutesLeft(steps, i, a, (f) => visible(f, a)),
    [steps, i, a],
  );

  /* An explicit save, even though it also saves on every keystroke.
     The automatic draft is invisible, and invisible reassurance reassures
     nobody -- a client who has to leave halfway wants to be TOLD it is safe
     before they close the tab, not to hope. In production this is also where
     the resume link gets emailed. */
  const saveNow = useCallback(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ answers: a, service, step: i, started: true }));
    } catch { /* a blocked store is what the dialog below exists to survive */ }
    setSavedAt(Date.now());
    setCopied(false);
    setSaveOpen(true);
  }, [a, service, i]);

  /* WHY THIS DIALOG EXISTS, and why the draft in this browser is not enough.

     Local storage is a good first layer and a bad only layer. It is tied to
     one browser on one device: a client who starts on their laptop at work and
     wants to finish on their phone in the evening has nothing to come back to,
     and a cleared cache takes the lot with no warning and no way to recover.
     Neither of those is an unusual thing for a person to do.

     So there are three layers, and the reader chooses:
       1. this browser, automatic, already happening;
       2. a link they can copy and keep, or send themselves;
       3. the same link emailed to them, which is the one that survives a
          different device AND a cleared cache.

     The link carries a token today only in the sense that the address is
     recorded; the token that makes it work on another device is issued by the
     server, which is the next piece of work. The dialog is written so that
     wiring it changes one function and no copy. */
  const resumeUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/onboarding`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resumeUrl);
      setCopied(true);
    } catch {
      /* A denied clipboard is not a failure worth an error: the field beside
         the button is selectable, which is how this worked before the API
         existed. */
      setCopied(false);
    }
  };

  useEffect(() => {
    if (!savedAt) return;
    const t = window.setTimeout(() => setSavedAt(0), 5000);
    return () => window.clearTimeout(t);
  }, [savedAt]);

  /* ------------------------------------------------ welcome */
  /* THE FIRST SCREEN ASKS WHICH SERVICE THIS IS FOR.

     It used to be a panel labelled "Demo only, pick what a client bought",
     which framed the whole form as something WDC fills in about a client. It
     is the opposite: the client opens this link on their own time, with nobody
     beside them, and fills it themselves. Every word here is written to them.

     Six cards, one tap, and the form that follows is only about the one they
     chose. A client who bought two services gets two links and fills two short
     forms; nobody is ever handed a fifteen-step run. */
  if (!started) {
    const preview = stepsFor(service);
    const previewMins = minutesLeft(preview, 0, {}, (f) => !f.showIf);
    return (
      <div className="ob ob--intro">
        <p className="ob__k">Welcome</p>
        <h1>Let&rsquo;s get started.</h1>
        <p className="ob__lede">
          A few questions so we can begin. Your answers go straight into the
          work, and this is the last time we will ask you for most of it.
        </p>

        <h2 className="ob__pickH">What are we working on for you?</h2>
        <p className="ob__pickSub">Choose the one this form is for.</p>

        <ul className="ob__svc">
          {SERVICES.map((sv) => (
            <li key={sv.slug}>
              <button
                type="button"
                className={`ob__svcCard${service === sv.slug ? " is-on" : ""}`}
                aria-pressed={service === sv.slug}
                onClick={() => setService(sv.slug)}
              >
                <span className="ob__svcIc" aria-hidden="true">
                  <ServiceIcon name={sv.icon} />
                </span>
                <span className="ob__svcT">
                  <b>{sv.short}</b>
                  <em>{PICKER_LINE[sv.slug]}</em>
                </span>
                <ArrowRight className="ob__svcGo" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <div className="ob__facts">
          <div><dt>About</dt><dd>{previewMins} min</dd></div>
          <div><dt>Saves</dt><dd>As you go</dd></div>
          <div><dt>Leave anytime</dt><dd>Pick up where you stopped</dd></div>
        </div>

        <p className="ob__reassure">
          Not sure about something? Say so. &ldquo;Not sure yet&rdquo; is a real
          answer here and it will not hold anything up. What you write stays
          between us and the people working on your project.
        </p>

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

        {/* BACK FIRST, THEN SEND, and Start over on its own line.

            The row used to read Send / Back / Start over left to right, which
            put the irreversible action between the two safe ones and left
            "Back" floating at a different height on a narrow screen because
            the row wrapped mid-group. Back is a step, Send is the finish, and
            wiping everything is not a peer of either. */}
        <div className="ob__acts ob__acts--end">
          <button className="ob__btn ob__btn--ghost" type="button" onClick={back}>
            <ArrowLeft aria-hidden="true" /> Back
          </button>
          <button className="ob__btn ob__btn--go" type="button" disabled>
            Send the brief <ArrowRight aria-hidden="true" />
          </button>
          {/* ASKS FIRST. This throws away everything the client has typed,
              it is next to the button that submits, and it cannot be undone. */}
          <button
            className="ob__btn ob__btn--ghost"
            type="button"
            onClick={() => setWipeOpen(true)}
          >
            Start over
          </button>
        </div>

        <Dialogs
          saveOpen={saveOpen} onSaveClose={() => setSaveOpen(false)}
          resumeUrl={resumeUrl} copied={copied} onCopy={copyLink}
          email={resumeEmail} onEmail={setResumeEmail}
          wipeOpen={wipeOpen} onWipeClose={() => setWipeOpen(false)}
          onWipe={() => {
            try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
            setA({}); setI(0); setStarted(false); setRestored(false);
            setWipeOpen(false);
          }}
        />
      </div>
    );
  }

  /* ------------------------------------------------ a step */
  return (
    <div className="ob">
      {/* the rail */}
      {/* THE RAIL IS THE MAP, AND IT IS GROUPED BY PART.

          It used to open with "Step 1 of 7" in bold, which is the one line
          this whole redesign exists to get rid of -- moving it out of the main
          column and leaving it at the top of the rail would have been moving
          the problem rather than fixing it.

          Grouping the same steps under the three part headings does the
          opposite job. Seeing the whole map is reassuring, not alarming, as
          long as it is shaped: three named groups of two or three, rather than
          an undifferentiated list of eleven. The numbers are still on every
          row for anyone who wants them, at the size a number deserves. */}
      <nav className="ob__rail" aria-label="Progress">
        {PHASES.map((ph) => {
          const mine = steps
            .map((s, n) => ({ s, n }))
            .filter(({ s }) => s.phase === ph.id);
          if (!mine.length) return null;
          const allDone = mine.every(({ n }) => n < i);
          return (
            <section key={ph.id} className={`ob__railGrp${ph.id === phase ? " is-on" : ""}${allDone ? " is-done" : ""}`}>
              <h2>{ph.title}</h2>
              <ol>
                {mine.map(({ s, n }) => (
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
            </section>
          );
        })}
      </nav>

      {/* the step */}
      <div className="ob__main">
        {/* ------------------------------------------------ the top bar.

            THIS IS THE ANSWER TO "STEP 1 OF 7 IS DAUNTING". Three short bars,
            one per part, each filling with its own steps -- so what a client
            watches is a small thing completing rather than a long thing
            crawling. The part they are in is named; the exact step number has
            moved to the rail beside it, where it is available without being
            the first thing anyone reads.

            The minutes are the other half of it, and they are honest: they
            count only questions still visible given the answers so far, so
            answering "no" to a branching question makes the estimate actually
            drop. A number that never moves is worse than no number. */}
        <div className="ob__top">
          <ol className="ob__phases">
            {PHASES.map((ph) => {
              const fill = phaseFill(ph.id);
              const on = ph.id === phase;
              return (
                <li
                  key={ph.id}
                  className={`ob__ph${on ? " is-on" : ""}${fill === 100 ? " is-done" : ""}`}
                  aria-current={on ? "step" : undefined}
                >
                  <span className="ob__phBar" aria-hidden="true">
                    <i style={{ width: `${on ? Math.max(fill, 6) : fill}%` }} />
                  </span>
                  <span className="ob__phName">{ph.title}</span>
                </li>
              );
            })}
          </ol>

          <div className="ob__topMeta">
            {/* THE PART IS NOT NAMED AGAIN HERE. It was, and between this
                line, the lit bar above it and the rail beside it, one screen
                said "About you" three separate times before asking a single
                question. The bar names the part; this line carries only what
                the bar cannot say. */}
            <p>
              {posInPhase} of {inPhase.length} in this part
              <span aria-hidden="true"> · </span>
              <span className="ob__mins">about {mins} min left</span>
            </p>
            <button type="button" className="ob__save" onClick={saveNow}>
              <Save aria-hidden="true" /> Save &amp; continue later
            </button>
          </div>

          {/* `role="status"` rather than an alert: this is good news, and it
              should not interrupt anyone. */}
          {savedAt > 0 && (
            <p className="ob__saved" role="status">
              <Check aria-hidden="true" />
              Saved. Close the tab whenever you like — this same link brings you
              back to this question.
            </p>
          )}
        </div>

        <h1>{step.title}</h1>
        <p className="ob__blurb">{step.blurb}</p>

        <div className="ob__fields">
          {shown.map((f) => (
            <FieldView
              key={f.key}
              f={f}
              value={a[f.key]}
              onChange={(v) => set(f.key, v)}
              onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
              onPhoneValidity={(ok) => setPhoneOk((p) => ({ ...p, [f.key]: ok }))}
              problem={
                showProblem(f.key)
                  ? problemWith(f, a[f.key], { phoneOk: phoneOk[f.key] })
                  : null
              }
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

        {/* THE SUMMARY LISTS THEM AND LINKS TO THEM. "3 questions still need an
            answer" tells someone they have failed without telling them where,
            which on a step of twelve questions means hunting. Each line here
            jumps to and focuses its own field. */}
        {tried && problems.length > 0 && (
          <div className="ob__err" role="alert">
            <p>
              <AlertCircle aria-hidden="true" />
              {problems.length === 1
                ? "One question needs attention before you go on."
                : `${problems.length} questions need attention before you go on.`}
            </p>
            <ul>
              {problems.map(({ f, msg }) => (
                <li key={f.key}>
                  <button type="button" onClick={() => goTo(f.key)}>{msg}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

        <Dialogs
          saveOpen={saveOpen} onSaveClose={() => setSaveOpen(false)}
          resumeUrl={resumeUrl} copied={copied} onCopy={copyLink}
          email={resumeEmail} onEmail={setResumeEmail}
          wipeOpen={wipeOpen} onWipeClose={() => setWipeOpen(false)}
          onWipe={() => {
            try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
            setA({}); setI(0); setStarted(false); setRestored(false);
            setWipeOpen(false);
          }}
        />
    </div>
  );
}

/**
 * The two dialogs, rendered from wherever they are needed rather than written
 * out twice. Both are the platform's `<dialog>` -- see dialog.tsx.
 */
function Dialogs({
  saveOpen, onSaveClose, resumeUrl, copied, onCopy, email, onEmail,
  wipeOpen, onWipeClose, onWipe,
}: {
  saveOpen: boolean; onSaveClose: () => void;
  resumeUrl: string; copied: boolean; onCopy: () => void;
  email: string; onEmail: (v: string) => void;
  wipeOpen: boolean; onWipeClose: () => void; onWipe: () => void;
}) {
  return (
    <>
      <Dialog open={saveOpen} onClose={onSaveClose} title="Saved. Come back whenever." labelledBy="ob-save-h">
        <p>
          Your answers are kept in this browser, so closing the tab on this
          device is safe. For anything else, take the link.
        </p>
        <div className="rs__link">
          {/* `readOnly`, not `disabled`: a disabled input cannot be selected,
              which removes the fallback for anyone whose browser refuses the
              clipboard API. */}
          <input type="text" value={resumeUrl} readOnly aria-label="Your link back to this form"
                 onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={onCopy}>{copied ? "Copied" : "Copy"}</button>
        </div>
        <p className="rs__or">
          Changing device, or worried about clearing your browser? Email it to
          yourself and it will be waiting.
        </p>
        <div className="rs__link">
          <input
            type="email" inputMode="email" autoComplete="email"
            placeholder="you@business.com" aria-label="Where to email your link"
            value={email} onChange={(e) => onEmail(e.target.value)}
          />
          {/* Deliberately inert, and it says so below rather than pretending.
              Sending mail needs the server that is not built yet; a button that
              looked like it worked and quietly did nothing would be worse than
              one that is honest. */}
          <button type="button" disabled>Send</button>
        </div>
        <p className="ob__hint" style={{ marginTop: ".5rem" }}>
          Emailing the link switches on with the rest of the back end. Until
          then, copy it above.
        </p>
        <div className="dlg__acts">
          <button className="ob__btn ob__btn--go" type="button" onClick={onSaveClose}>
            Back to the form
          </button>
        </div>
      </Dialog>

      <Dialog open={wipeOpen} onClose={onWipeClose} title="Start over?" labelledBy="ob-wipe-h">
        <p>
          This clears every answer you have given and takes you back to the
          first question. It cannot be undone.
        </p>
        <div className="dlg__acts">
          <button className="ob__btn ob__btn--ghost" type="button" onClick={onWipeClose}>
            Keep my answers
          </button>
          <button className="ob__btn ob__btn--danger" type="button" onClick={onWipe}>
            Yes, start over
          </button>
        </div>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ field */

function FieldView({
  f, value, onChange, onBlur, onPhoneValidity, problem,
}: {
  f: Field;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  onBlur: () => void;
  onPhoneValidity: (ok: boolean) => void;
  /** The message to show, or null. Null also means "not judged yet". */
  problem: string | null;
}) {
  const id = `ob-${f.key}`;
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const invalid = problem !== null;
  const v = value ?? (f.kind === "multi" ? [] : "");

  const label = (
    <label className="ob__label" htmlFor={id}>
      {f.label}
      {f.required ? <b aria-hidden="true"> *</b> : <i> (optional)</i>}
      {/* Background lives behind the question mark, so the form stays a list
          of questions rather than a page of prose. Only explanations the
          question genuinely cannot be answered without stay inline, as
          `hint`. */}
      {f.tip ? <Tip text={f.tip} /> : null}
    </label>
  );
  /* Always visible, under the label. A hint the form cannot be completed
     without is not a hint, it is a label, so none of these are hidden behind
     a hover. */
  const hint = f.hint ? <p className="ob__hint" id={hintId}>{f.hint}</p> : null;
  /* The hint and the error are both read out, in that order: what the question
     wants, then what is wrong with the answer. */
  const describedBy = [f.hint ? hintId : "", problem ? errId : ""].filter(Boolean).join(" ") || undefined;

  /* THE "NOT SURE" ESCAPE.
     The welcome screen promises that not knowing something will not hold
     anyone up. That was only true of the handful of multiple-choice questions
     that happened to carry a "Not sure" option; every required text field
     blocked, and a client who did not know was stuck on it. Questions of
     judgement now carry this, and the answer is RECORDED rather than left
     blank -- "the client would like our recommendation on their search terms"
     is a real finding and the first thing to raise on the call. */
  const deferred = v === UNSURE;
  const escape = f.assist ? (
    <button
      type="button"
      className={`ob__unsure${deferred ? " is-on" : ""}`}
      onClick={() => onChange(deferred ? "" : UNSURE)}
      aria-pressed={deferred}
    >
      {deferred ? <Undo2 aria-hidden="true" /> : <HelpCircle aria-hidden="true" />}
      {deferred ? "Actually, let me answer this" : "Not sure — you advise us"}
    </button>
  ) : null;

  const wrap = (inner: React.ReactNode) => (
    <div
      /* `ob__f--sub` MARKS A QUESTION THAT APPEARED BECAUSE OF AN ANSWER.
         A field that materialises out of nowhere when you tap "Yes" is
         startling, and worse, it is not obviously connected to what caused it.
         The indent and the rule down its left say "this follows from the one
         above", and the reveal animation gives the eye something to follow
         rather than a jump cut. */
      className={[
        "ob__f",
        f.showIf ? "ob__f--sub" : "",
        invalid ? "is-bad" : "",
        deferred ? "is-deferred" : "",
      ].filter(Boolean).join(" ")}
      data-field={f.key}
      /* One listener for the whole group rather than one per control, which
         also means the card and multi-select groups report being left --
         they have no single input to hang a blur on. `onBlur` bubbles in
         React, unlike the DOM event. */
      onBlur={onBlur}
    >
      {label}
      {hint}
      {/* The control stays in the DOM while deferred rather than being
          replaced, so nothing jumps when it is toggled and anything already
          typed is still there if they change their mind. `inert` keeps it out
          of the tab order and out of reach while it does not apply. */}
      <div className="ob__ctl" {...(deferred ? { inert: true } : {})}>{inner}</div>
      {deferred ? (
        <p className="ob__unsureNote">
          Noted. We will come to this with a recommendation rather than a blank.
        </p>
      ) : null}
      {problem && (
        <p className="ob__fErr" id={errId}>
          <AlertCircle aria-hidden="true" />
          {problem}
        </p>
      )}
      {escape}
    </div>
  );

  if (f.kind === "textarea") {
    return wrap(
      <textarea
        id={id} value={v as string} placeholder={f.placeholder} rows={4}
        aria-invalid={invalid || undefined} aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      />,
    );
  }

  if (f.kind === "select") {
    return wrap(
      <SearchableSelect
        id={id}
        options={f.options ?? []}
        value={v as string}
        onChange={onChange}
        invalid={invalid}
        describedBy={describedBy}
      />,
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
    /* A LONG MULTI-SELECT BECOMES A DROPDOWN. Nine or more options as cards is
       a wall that pushes everything below it off the screen, and on a phone it
       is most of a scroll to get past a question somebody may not even be
       answering. Below that, cards win: they are one tap, nothing is hidden,
       and the whole set is readable at a glance. */
    if ((f.options?.length ?? 0) >= 9) {
      return wrap(
        <SearchableSelect
          id={id}
          options={f.options ?? []}
          value={arr}
          onChange={onChange}
          multiple
          placeholder="Choose any that apply"
          invalid={invalid}
          describedBy={describedBy}
        />,
      );
    }
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
    return wrap(
      <Dropzone
        id={id}
        value={Array.isArray(v) ? v : []}
        onChange={onChange}
        describedBy={describedBy}
      />,
    );
  }

  if (f.kind === "tel") {
    return wrap(
      <PhoneField
        id={id}
        value={v as string}
        onChange={onChange}
        onValidity={onPhoneValidity}
        invalid={invalid}
        describedBy={describedBy}
      />,
    );
  }

  return wrap(
    <input
      id={id}
      type={f.kind === "email" ? "email" : f.kind === "url" ? "url" : "text"}
      /* `inputMode` changes the KEYBOARD a phone shows. An email field that
         offers an @ key without the reader hunting for it is the cheapest
         improvement available on a form filled in mostly on phones. */
      inputMode={f.kind === "email" ? "email" : f.kind === "url" ? "url" : undefined}
      autoComplete={
        f.key === "first_name" ? "given-name"
        : f.key === "last_name" ? "family-name"
        : f.key === "email" ? "email"
        : f.key === "company" ? "organization"
        : undefined
      }
      value={v as string}
      placeholder={f.placeholder}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
    />,
  );
}
