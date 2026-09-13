"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, ArrowRight, BadgeInfo, BrainCircuit, Check, Code2, HelpCircle,
  Megaphone, Palette, Save, Search, Smartphone, Undo2,
} from "lucide-react";
import Link from "next/link";
import { SERVICES, type ServiceSlug } from "@/lib/services";
import { CONTACT_EMAIL } from "@/lib/site";
import {
  isFilled, minutesLeft, PICKER_LINE, problemWith, stepsFor, UNSURE,
  type Field, type Step,
} from "@/lib/onboarding";
import PhoneField from "./phone-field";
/* THEIR SelectField, not the one this branch grew in parallel. It shares its
   open, filter and keyboard behaviour with the phone field's country picker
   through picker.tsx, where mine was a second copy of the same logic under a
   different class name. One searchable control used twice beats two that
   drift apart. */
import SelectField from "./select-field";
import Dropzone from "./dropzone";
import Tip from "./tip";
import Dialog from "./dialog";
import Confetti from "./confetti";
import { useServerDraft } from "./use-server-draft";
/* THE ONE OWNER OF SCROLL POSITION. See the note at the top of that file:
   a bare window.scrollTo is animated straight back down by Lenis on a desktop
   pointer, because Lenis keeps its own target and nothing here told it. */
import { toTop } from "@/components/ui/scroll-reset";
import "./onboarding.css";
import "./phone-field.css";
import "./picker.css";
import "./form-kit.css";

/**
 * The onboarding form.
 *
 * Drafts are persisted server-side for cross-device resume, with local storage
 * retained only as a fail-safe cache. The final submission is validated again
 * by the server before it is stored.
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
const EXCLUSIVE_MULTI_OPTIONS = new Set(["None yet", "None of these", UNSURE]);

/** A field is asked only when its condition is met. Hidden means not asked. */
function visible(f: Field, a: Answers) {
  if (!f.showIf) return true;
  const v = a[f.showIf.key];
  if (Array.isArray(v)) return v.some((x) => f.showIf!.equals.includes(x));
  return typeof v === "string" && f.showIf.equals.includes(v);
}

type Draft = { answers: Answers; service: ServiceSlug | null; step: number; started: boolean };

/**
 * Draft, layer one: local, from the first keystroke, so a temporary network
 * failure cannot erase work. The server copy remains authoritative for a
 * cross-device resume.
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
  /* NOTHING IS PRESELECTED. This defaulted to "web", which put a tick on a
     card the client had not chosen and quietly decided the whole form for
     anyone who pressed Start without noticing. A picker with a default is not
     a question, it is an assumption. `null` until they choose. */
  const [service, setService] = useState<ServiceSlug | null>(() =>
    typeof draft.service === "string" ? (draft.service as ServiceSlug) : null,
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
  const [submitted, setSubmitted] = useState(false);
  /* Whether there is a draft to return to, so the opening button can say
     "pick up where you left off" rather than "start". Cleared by "start over",
     which wipes the draft: the button must not keep offering one. */
  const [restored, setRestored] = useState(() => draft.started === true);

  const restoreServerDraft = useCallback((saved: {
    service: ServiceSlug; currentStep: number; answers: Answers;
  }) => {
    setService(saved.service);
    setI(saved.currentStep);
    setA(saved.answers);
    setStarted(true);
    setRestored(true);
  }, []);

  /* Past the picker `service` is always set -- `started` cannot become true
     without a choice -- but the hooks below run before that is known, so the
     non-null form is named once here rather than asserted at each call. */
  const chosen: ServiceSlug = service ?? "web";

  const serverDraft = useServerDraft({
    started,
    service: chosen,
    currentStep: i,
    answers: a,
    onRestore: restoreServerDraft,
  });

  const steps = useMemo(() => stepsFor(chosen), [chosen]);
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
    requestAnimationFrame(() => toTop(false));
  };
  const back = () => {
    setTried(false);
    setI((n) => Math.max(0, n - 1));
    requestAnimationFrame(() => toTop(false));
  };

  const done = i >= steps.length;

  /* One progress signal for one journey. The first screen starts visibly at
     8% so it feels begun, then each of the three parts advances the same bar.
     Review is 100%. */
  const progress = done ? 100 : Math.max(8, Math.round((i / steps.length) * 100));
  const encouragement =
    i === 0
      ? "You are off to a good start."
      : i === 1
        ? "This detail helps us begin with fewer follow-up questions."
        : i === 2
          ? "We have the shape of the project now."
          : "Nearly there; review comes next.";

  const mins = useMemo(
    () => minutesLeft(steps, i, a, (f) => visible(f, a)),
    [steps, i, a],
  );

  /* An explicit save, even though it also saves on every keystroke.
     The automatic draft is invisible, and invisible reassurance reassures
     nobody -- a client who has to leave halfway wants to be TOLD it is safe
     before they close the tab, not to hope. This is also where a fresh,
     single-use resume link is issued. */
  const saveNow = useCallback(async () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ answers: a, service, step: i, started: true }));
    } catch { /* a blocked store is what the dialog below exists to survive */ }
    setCopied(false);
    setSaveOpen(true);
    try {
      await serverDraft.save({ rotateLink: true });
      setSavedAt(Date.now());
    } catch { /* The dialog keeps the local fallback and shows the server message. */ }
  }, [a, service, i, serverDraft]);

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

     The server stores only a hash of the single-use token. A fresh link
     invalidates any previous unused link for the same draft and expires after
     three days. */
  const copyLink = async () => {
    try {
      const link = (await serverDraft.save({ rotateLink: true })).resumeUrl;
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      /* A denied clipboard is not a failure worth an error: the field beside
         the button is selectable, which is how this worked before the API
         existed. */
      setCopied(false);
    }
  };

  const emailResumeLink = async () => {
    const email = resumeEmail.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      serverDraft.setMessage("Enter the email address where you want the link sent.");
      return;
    }
    try {
      const result = await serverDraft.save({ email, emailLink: true });
      serverDraft.setMessage(result.emailSent
        ? "Your secure link has been sent. It expires in three days."
        : "Your answers are saved, but the email could not be delivered. Copy the link instead.");
    } catch { /* The hook exposes a useful message. */ }
  };

  useEffect(() => {
    if (!savedAt) return;
    const t = window.setTimeout(() => setSavedAt(0), 5000);
    return () => window.clearTimeout(t);
  }, [savedAt]);

  /* SEND, THEN SHOW WHAT SENDING DID.

     Send sits at the foot of the read-back, which on a full brief is several
     screens tall. Pressing it swapped the page for a short thank-you note and
     left the scroll exactly where it was -- which, on the now much shorter
     document, is still below everything there is to see. The reported
     symptom was that the button did nothing.

     IN AN EFFECT, NOT IN THE CLICK HANDLER. The handler runs before React has
     committed the new screen, so a scroll there is measured against the old,
     taller document and clamped back the moment the short one replaces it. The
     frame gives the browser time to lay the new screen out first.

     INSTANT, NOT SMOOTH. The confetti starts on the same frame, and a
     two-second glide would spend it looking at the wrong part of the page. */
  useEffect(() => {
    if (!submitted) return;
    const f = requestAnimationFrame(() => toTop(true));
    return () => cancelAnimationFrame(f);
  }, [submitted]);

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
    /* Before a choice there is no form to measure, so the estimate is the
       shortest of the six rather than a number invented from a default. */
    const preview = service ? stepsFor(service) : null;
    const previewMins = preview
      ? minutesLeft(preview, 0, {}, (f) => !f.showIf)
      : null;
    return (
      <div className="ob ob--intro">
        <p className="ob__k">Welcome</p>
        <h2>Let&rsquo;s get started.</h2>
        <p className="ob__lede">
          A few questions so we can begin. Your answers go straight into the
          work, and this is the last time we will ask you for most of it.
        </p>

        <h2 className="ob__pickH">What are we working on for you?</h2>
        <p className="ob__pickSub">Choose the one this form is for.</p>

        {/* FILLED CARDS, and the icon is the card's own artwork rather than a
            badge sitting on it. The colour alternates navy and orange by
            index: a navy column beside an orange one at two columns, a strict
            alternation at one. See the note in onboarding.css for why not a
            staggered checker. */}
        <ul className="ob__svc">
          {SERVICES.map((sv, n) => (
            <li key={sv.slug}>
              <button
                type="button"
                className={`ob__svcCard ob__svcCard--${n % 2 ? "orange" : "navy"}${
                  service === sv.slug ? " is-on" : ""
                }`}
                aria-pressed={service === sv.slug}
                onClick={() => setService(sv.slug)}
              >
                {/* The watermark. Cropped by the card, drawn in the card's own
                    ink at low alpha, and deliberately NOT `ServiceIcon`: that
                    one stamps `pathLength` on every shape and hands it to the
                    draw-gate, which at this size would be six large SVGs
                    repainting their strokes. This is a static mark. */}
                <PickIcon name={sv.icon} />
                <span className="ob__svcT">
                  <b>{sv.short}</b>
                  <em>{PICKER_LINE[sv.slug]}</em>
                </span>
                <span className="ob__svcMark" aria-hidden="true">
                  <Check />
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* A <dl>, because it holds dt/dd pairs. They were in plain divs,
            which is invalid and leaves the pairing unannounced. */}
        <dl className="ob__facts">
          <div><dt>About</dt><dd>{previewMins === null ? "5-10 min" : `${previewMins} min`}</dd></div>
          <div><dt>Saves</dt><dd>As you go</dd></div>
          <div><dt>Leave anytime</dt><dd>Pick up where you stopped</dd></div>
        </dl>

        <p className="ob__reassure">
          Not sure about something? Say so. &ldquo;Not sure yet&rdquo; is a real
          answer here and it will not hold anything up. What you write stays
          between us and the people working on your project.
        </p>

        {/* Disabled until a card is chosen, with the reason said out loud
            rather than left to be inferred from a button that does nothing. */}
        <button
          className="ob__btn ob__btn--go"
          type="button"
          onClick={() => service && setStarted(true)}
          disabled={!service}
          aria-describedby={!service ? "ob-pick-first" : undefined}
        >
          {restored ? "Pick up where you left off" : "Start"} <ArrowRight aria-hidden="true" />
        </button>
        {!service && (
          <p className="ob__pickHint" id="ob-pick-first">
            Choose what we are working on to begin.
          </p>
        )}
      </div>
    );
  }

  /* ------------------------------------------------ sent */
  /* THE ONE SCREEN NOBODY PLANS AND EVERYBODY SEES.

     A client has just spent ten minutes answering questions about work they
     have already paid for, and the old version of this met them with four
     lines of grey text. It also left them halfway down the page, because
     nothing moved the scroll: they pressed Send at the foot of a long review
     and the thank-you note rendered above the fold they were looking at, so
     the form appeared to do nothing at all. Both are fixed here.

     What it says now is the thing a client actually wants at this point, which
     is not "thank you" -- it is "and what happens now". Three steps with real
     timings, said plainly, so nobody has to write and ask. */
  if (submitted) {
    return (
      <div className="ob ob--sent">
        <Confetti />

        {/* The mark, drawn rather than imported so it can take the page's own
            accent and scale with the type. It grows and settles once on
            arrival: transform and opacity, one run, and skipped entirely
            under reduced motion by the rule in the stylesheet. */}
        <span className="ob__seal" aria-hidden="true">
          <Check />
        </span>

        <p className="ob__k">Sent</p>
        <h2>Thank you. That is everything we need.</h2>
        <p className="ob__lede">
          Your brief is with us, and it goes straight to the people who will do
          the work. You have just saved yourself a fortnight of back-and-forth,
          and us a pile of guessing.
        </p>

        <div className="ob__next">
          <h2>What happens next</h2>
          <ol>
            <li>
              <b>We read it properly</b>
              <span>
                Not a skim. Someone goes through every answer and lists what is
                clear and what still needs a conversation.
              </span>
            </li>
            <li>
              <b>You hear from us within two working days</b>
              <span>
                With the plan, the dates and anything we need from you to
                start. If something you asked about carries a cost, the number
                comes with it.
              </span>
            </li>
            <li>
              <b>Then the work begins</b>
              <span>
                Updates reach you through your client dashboard, direct chat, a
                WhatsApp project group where that suits, or whichever channel
                we agree for your project.
              </span>
            </li>
          </ol>
        </div>

        <p className="ob__warm">
          Remembered something after sending? That happens on almost every
          project and it is never a problem. Write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will
          add it to your brief.
        </p>

        {/* `Link`, not `<a>`: a full document load here would throw away the
            router's cache and reload the whole app to leave a screen the
            client is finished with. */}
        <div className="ob__acts ob__acts--sent">
          <Link className="ob__btn ob__btn--go" href="/">
            Back to the site <ArrowRight aria-hidden="true" />
          </Link>
          <Link className="ob__btn ob__btn--ghost" href="/work">
            See what we have made
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------ review */
  if (done) {
    return (
      <div className="ob ob--intro">
        <p className="ob__k">Review</p>
        <h2>Read it back.</h2>
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

        {serverDraft.message ? <p className="ob__saved" role="status">{serverDraft.message}</p> : null}

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
          <button
            className="ob__btn ob__btn--go"
            type="button"
            disabled={serverDraft.submitting}
            onClick={async () => {
              try {
                await serverDraft.submit();
                try { localStorage.removeItem(KEY); } catch { /* local fallback only */ }
                setSubmitted(true);
              } catch { /* The hook presents the server message. */ }
            }}
          >
            {serverDraft.submitting ? "Sending..." : "Send the brief"} <ArrowRight aria-hidden="true" />
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
          resumeUrl={serverDraft.resumeUrl} copied={copied} onCopy={copyLink}
          email={resumeEmail} onEmail={setResumeEmail}
          onEmailSend={emailResumeLink} busy={serverDraft.saving} message={serverDraft.message}
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
          <div
            className="ob__progress"
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
            <b>{progress}%</b>
          </div>

          <div className="ob__topMeta">
            {/* THE PART IS NOT NAMED AGAIN HERE. It was, and between this
                line, the lit bar above it and the rail beside it, one screen
                said "About you" three separate times before asking a single
                question. The bar names the part; this line carries only what
                the bar cannot say. */}
            <p>
              Part {i + 1} of {steps.length}
              <span aria-hidden="true"> · </span>
              <span className="ob__mins">about {mins} min left</span>
            </p>
            <button type="button" className="ob__save" onClick={saveNow}>
              <Save aria-hidden="true" /> Save &amp; continue later
            </button>
          </div>
          <p className="ob__encourage">{encouragement}</p>

          {/* `role="status"` rather than an alert: this is good news, and it
              should not interrupt anyone. */}
          {savedAt > 0 && (
            <p className="ob__saved" role="status">
              <Check aria-hidden="true" />
              Saved. Close the tab whenever you like; this same link brings you
              back to this question.
            </p>
          )}
        </div>

        <h2>{step.title}</h2>
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
          resumeUrl={serverDraft.resumeUrl} copied={copied} onCopy={copyLink}
          email={resumeEmail} onEmail={setResumeEmail}
          onEmailSend={emailResumeLink} busy={serverDraft.saving} message={serverDraft.message}
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
 * The oversized mark on a picker card.
 *
 * SIX ICONS, NAMED, rather than a dynamic lookup across lucide: a computed
 * import pulls the whole package into this route's bundle for the sake of
 * six shapes. `lib/services.ts` stores the export name, and this is the one
 * place that has to agree with it.
 */
function PickIcon({ name }: { name: string }) {
  const Ico =
    name === "Palette" ? Palette
    : name === "Search" ? Search
    : name === "Code2" ? Code2
    : name === "Smartphone" ? Smartphone
    : name === "BrainCircuit" ? BrainCircuit
    : name === "Megaphone" ? Megaphone
    : null;
  if (!Ico) return null;
  return (
    <span className="ob__svcArt" aria-hidden="true">
      <Ico strokeWidth={1.4} />
    </span>
  );
}

/**
 * The two dialogs, rendered from wherever they are needed rather than written
 * out twice. Both are the platform's `<dialog>` -- see dialog.tsx.
 */
function Dialogs({
  saveOpen, onSaveClose, resumeUrl, copied, onCopy, email, onEmail,
  onEmailSend, busy, message,
  wipeOpen, onWipeClose, onWipe,
}: {
  saveOpen: boolean; onSaveClose: () => void;
  resumeUrl: string; copied: boolean; onCopy: () => void;
  email: string; onEmail: (v: string) => void;
  onEmailSend: () => void; busy: boolean; message: string;
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
          <button type="button" onClick={onCopy} disabled={busy}>{copied ? "Copied" : busy ? "Saving..." : "Copy"}</button>
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
          <button type="button" onClick={onEmailSend} disabled={busy}>{busy ? "Saving..." : "Send"}</button>
        </div>
        <p className="ob__hint" style={{ marginTop: ".5rem" }}>
          The link works on another device, expires in three days, and can be opened once.
        </p>
        {message ? <p className="ob__saved" role="status">{message}</p> : null}
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
  const scopeId = `${id}-scope`;
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

  /* WHAT IT COSTS TO SAY YES, SAID BEFORE THEY SAY IT.

     These sit on the questions that offer something outside what the client
     bought -- design us a logo, buy us a domain, write our pages. It is marked
     rather than set as a quiet grey hint on purpose: a client answering "yes"
     here is asking for work they have not paid for, and burying that would be
     the kind of upsell nobody should have to go looking for. It carries no
     number, because nothing is charged from this form; what it promises is a
     quote before anything starts. */
  const scope = f.scope ? (
    <p className="ob__scope" id={scopeId}>
      <BadgeInfo aria-hidden="true" />
      <span>{f.scope}</span>
    </p>
  ) : null;

  /* The hint, the cost note and the error are all read out, in that order:
     what the question wants, what saying yes commits to, then what is wrong
     with the answer. */
  const describedBy = [f.hint ? hintId : "", f.scope ? scopeId : "", problem ? errId : ""]
    .filter(Boolean).join(" ") || undefined;

  /* THE "NOT SURE" ESCAPE.
     The welcome screen promises that not knowing something will not hold
     anyone up. That was only true of the handful of multiple-choice questions
     that happened to carry a "Not sure" option; every required text field
     blocked, and a client who did not know was stuck on it. Questions of
     judgement now carry this, and the answer is RECORDED rather than left
     blank -- "the client would like our recommendation on their search terms"
     is a real finding and the first thing to raise on the call. */
  const deferred = v === UNSURE || (Array.isArray(v) && v.includes(UNSURE));
  /* A deferred text field shows EMPTY rather than the literal sentence
     "I am not sure; please advise me" sitting in the box as if the client had
     typed it. The deferral is recorded in the answer either way; this is only
     what the control displays, and it means the first keystroke replaces it. */
  const shown = deferred && typeof v === "string" ? "" : v;
  const escape = f.assist ? (
    <button
      type="button"
      className={`ob__unsure${deferred ? " is-on" : ""}`}
      onClick={() => onChange(
        f.kind === "multi" ? (deferred ? [] : [UNSURE]) : (deferred ? "" : UNSURE),
      )}
      aria-pressed={deferred}
    >
      {deferred ? <Undo2 aria-hidden="true" /> : <HelpCircle aria-hidden="true" />}
      {deferred ? "Actually, let me answer this" : "I'm not sure; please advise me"}
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
      {scope}
      {/* The control stays in the DOM while deferred rather than being
          replaced, so nothing jumps when it is toggled and anything already
          typed is still there if they change their mind.

          IT IS NOT `inert`. It used to be, and that made the escape a trap:
          once a client picked "I am not sure", every option in the question
          was unreachable, so changing their mind meant first finding the
          small "Actually, let me answer this" button underneath. Nobody
          reads a form that way -- they tap the option they want, nothing
          happens, and the form looks broken. Choosing a real answer now
          simply REPLACES the deferral, which is what the reader already
          expects to happen. */}
      <div className="ob__ctl">{inner}</div>
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
        id={id} value={shown as string} placeholder={f.placeholder} rows={4}
        aria-invalid={invalid || undefined} aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      />,
    );
  }

  if (f.kind === "select") {
    return wrap(
      <SelectField
        id={id}
        options={f.options ?? []}
        value={shown as string}
        invalid={invalid}
        describedBy={describedBy}
        onChange={onChange}
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
            /* PRESSING THE CHOSEN ONE AGAIN UNCHOOSES IT.

               A radio group cannot normally be emptied once it has been
               answered, and on paper that is correct. On this form it was a
               trap: pick "I'm not sure; please advise me", change your mind,
               press it again, and nothing happens -- the form looks broken at
               the exact moment somebody is trying to correct themselves. The
               only way back was a small text button underneath that nobody
               looks for, because the thing they want to undo is the thing
               they just pressed.

               So the answer toggles. Choosing a different option still simply
               replaces this one; this only adds the case where the option
               pressed is the one already on. A required question that is
               emptied this way goes back to being unanswered, which is
               honest -- it IS unanswered. */
            onClick={() => onChange(v === o ? "" : o)}
          >
            <span className="ob__dot" aria-hidden="true" />
            {o}
          </button>
        ))}
      </div>,
    );
  }

  if (f.kind === "multi") {
    const arr = Array.isArray(v) ? v : v === UNSURE ? [UNSURE] : [];
    /* CARDS, AT EVERY LENGTH. A long list briefly became a multi-select
       dropdown here; that needed a second searchable control, because the one
       this form already has is single-choice by design. Two controls doing
       almost the same job is how a form stops feeling like one thing, and the
       wall of cards it was avoiding is a scroll rather than a confusion:
       everything is visible, everything is one tap, and nothing is hidden
       behind a panel a reader has to know to open. */
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
              onClick={() => {
                if (on) return onChange(arr.filter((x) => x !== o));
                if (EXCLUSIVE_MULTI_OPTIONS.has(o)) return onChange([o]);
                onChange([...arr.filter((x) => !EXCLUSIVE_MULTI_OPTIONS.has(x)), o]);
              }}
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
        onChange={onChange}
        describedBy={describedBy}
      />,
    );
  }

  if (f.kind === "tel") {
    return wrap(
      <PhoneField
        id={id}
        value={shown as string}
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
      value={shown as string}
      placeholder={f.placeholder}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
    />,
  );
}
