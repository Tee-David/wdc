"use client";

import {
  createContext, Fragment, useActionState, useCallback, useContext, useEffect,
  useId, useRef,
} from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useSupportReadOnly } from "@/components/client/support-context";
import Tip from "@/components/onboarding/tip";
import type { ActionState, Errors } from "@/lib/admin/validate";
import { toast } from "./toast";
import { ask } from "./confirm";
import { DateInput, DateTimeInput, Pick } from "./pick";

/**
 * What was typed, read off the submission.
 *
 * REACT RESETS AN UNCONTROLLED FORM once its action has run, which is right
 * after a success and badly wrong after a failure: one mistyped email would
 * otherwise cost the person every other field. So on a failure the values are
 * carried back out and put in as the new defaults, and the controls are
 * remounted under a new key so the DOM actually takes them.
 *
 * Done here, once, rather than in each action: an action that forgot would
 * silently lose somebody's typing, and nothing would fail to warn us.
 */
function snapshot(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const had = out[k];
    if (had === undefined) out[k] = v;
    else if (Array.isArray(had)) had.push(v);
    else out[k] = [had, v];
  }
  return out;
}

/**
 * THE ADMIN'S FORM KIT.
 *
 * Small on purpose. Everything below exists because the alternative was the
 * same twelve lines copied into nine screens, where they would drift.
 *
 * The shape is the platform's: a real <form> with a server action, so it
 * submits and works before React has hydrated and while JavaScript is still
 * arriving. useActionState adds the returned message and the per-field errors
 * on top of that rather than replacing it, and useFormStatus gives the button
 * its pending state without the form having to hold one.
 *
 * ERRORS TRAVEL BY CONTEXT rather than by prop, because the field that needs
 * to know about an error is usually three components down from the form, and
 * threading `errors` through every wrapper is how a field ends up silently not
 * showing its own error.
 */

const EMPTY: ActionState = { ok: false };

type Kit = {
  errors: Errors;
  pendingId: string;
  /** What was typed, on a failed submit. */
  values: Record<string, string | string[]>;
  /** Bumped on every failure, to remount the controls with those values. */
  gen: number;
};
const Ctx = createContext<Kit>({ errors: {}, pendingId: "", values: {}, gen: 0 });

/**
 * A SECTION OF A FORM THAT FOLDS: closed on a phone, open on a wider screen,
 * and open wherever a field inside it was refused, so a mistake is never
 * behind a closed door.
 */
export function Fold({ title, summary, fields, className, children }: {
  title: string; summary?: string; fields: string[]; className?: string; children: React.ReactNode;
}) {
  const errors = useContext(Ctx).errors;
  const bad = fields.some((f) => errors[f]);
  return (
    <details
      className={`adFold ${className ?? ""}`}
      open={bad || undefined}
      /* Wide screens start open, set once on the element after it mounts, so
         the server render (closed) and hydration agree and the reader's own
         opening and closing is left alone after that. */
      ref={(el) => {
        if (!el || el.dataset.ready) return;
        el.dataset.ready = "1";
        if (window.matchMedia("(min-width: 1100px)").matches) el.open = true;
      }}
    >
      <summary className="adFold__sum">
        <span><b>{title}</b>{summary ? <small>{summary}</small> : null}</span>
      </summary>
      <div className="adFold__body">{children}</div>
    </details>
  );
}

export function Form({
  action,
  children,
  onDone,
  /** Clear the fields after a success. Right for "add another", wrong for edit. */
  resetOnDone = false,
  className,
  confirm,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  onDone?: (s: ActionState) => void;
  resetOnDone?: boolean;
  className?: string;
  /** Asked before the action runs. For the handful of writes that cannot be
      undone; anywhere else it is an interruption that teaches people to
      click through prompts without reading them. */
  confirm?: string;
}) {
  /* The action is wrapped rather than passed straight through, so the values
     come back on a failure without any action knowing about it. */
  const supportReadOnly = useSupportReadOnly();
  const keep = useCallback(
    async (prev: ActionState, fd: FormData): Promise<ActionState> => {
      const res = await action(prev, fd);
      /* The toast is raised HERE, as the answer arrives, not from an effect
         after the render that carries it: a form that disappears because it
         worked (the last pending migration applied, a panel that closes)
         never runs that effect, and its success went unsaid. */
      if (res.ok) { if (res.message) toast(res.message); return res; }
      return { ...res, values: snapshot(fd), attempt: (prev.attempt ?? 0) + 1 };
    },
    [action],
  );

  const [state, dispatch, pending] = useActionState(keep, EMPTY);
  const ref = useRef<HTMLFormElement>(null);
  const pendingId = useId();


  /* Reported after the render that carried the result, never during it: a
     parent closing its dialog is a setState in another component. */
  const done = useRef<ActionState | null>(null);
  /* A REFUSAL IS SAID AND SHOWN. The message used to sit at the foot of the
     form, which on a phone is a screen or two below the button, so a post that
     would not save looked like one that saved and changed nothing. Now it is
     a toast as well, and the first field that needs attention is opened
     (inside a closed section too), scrolled to and focused. */
  const refused = useRef<ActionState | null>(null);
  useEffect(() => {
    if (state.ok || !state.message || refused.current === state) return;
    refused.current = state;
    toast(state.message, "bad");
    const bad = ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!bad) return;
    for (let d = bad.closest("details"); d; d = d.parentElement?.closest("details") ?? null) d.open = true;
    bad.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    bad.focus({ preventScroll: true });
  }, [state]);

  useEffect(() => {
    if (!state.ok || done.current === state) return;
    done.current = state;
    if (resetOnDone) ref.current?.reset();
    onDone?.(state);
  }, [state, onDone, resetOnDone]);

  return (
    <Ctx.Provider
      value={{
        errors: state.errors ?? {},
        pendingId,
        values: state.values ?? {},
        /* The failure count, which the fields key on so a remount picks up the
           values above. Read off the state, never off a ref: a ref read during
           a render is a value React is entitled to have already changed. */
        gen: state.attempt ?? 0,
      }}
    >
      <form
        ref={ref}
        action={dispatch}
        className={className}
        noValidate
        onSubmit={confirm ? (e) => {
          /* Asked in the shared dialog (./confirm.tsx); a yes submits again
             from the same button with the question already answered. */
          const form = e.currentTarget;
          if (form.dataset.asked === "1") { delete form.dataset.asked; return; }
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          void ask(confirm).then((ok) => { if (ok) { form.dataset.asked = "1"; form.requestSubmit(submitter as HTMLButtonElement | null); } });
        } : undefined}
      >
        {supportReadOnly ? <><p className="ad__dim">Read-only support view. Exit to make changes.</p><fieldset disabled className="pSupport__fields">{children}</fieldset></> : children}
        {state.message ? <Result state={state} /> : null}
        {/* Announced rather than only drawn, so a screen reader hears that
            something is happening instead of silence. */}
        <p id={pendingId} className="ad__sr" aria-live="polite">
          {pending ? "Saving." : state.message ?? ""}
        </p>
      </form>
    </Ctx.Provider>
  );
}

function Result({ state }: { state: ActionState }) {
  return (
    <p className={`ad__msg${state.ok ? " is-ok" : " is-bad"}`} role="status">
      {state.ok ? <Check aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
      <span>
        {state.signIn ? state.message?.replace(/ Sign in again, then retry\.$/, "") : state.message}
        {/* In a NEW tab: signing in here would close this dialog and lose
            what was typed. Back in this tab, the same Save works. */}
        {state.signIn ? (
          <> <a href={`/login?redirect=${encodeURIComponent(typeof window === "undefined" ? "/admin" : window.location.pathname + window.location.search)}`} target="_blank" rel="noopener">Sign in in a new tab</a>, then save again here. Nothing you typed is lost.</>
        ) : null}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ field */

type Common = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Half-width on a wide screen, full on a phone. */
  half?: boolean;
};

/**
 * A text-like field. A date or a date-and-time gets the admin's own calendar
 * (components/admin/pick.tsx) rather than the browser's, which reads 09/14 on
 * one laptop and 14/09 on the next; it shows "Mon, 14 Sep 2026" to everybody
 * and still posts YYYY-MM-DD.
 */
export function Field({
  name, label, hint, required, half, type = "text", defaultValue, placeholder,
  step, min, inputMode,
}: Common & {
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  step?: string;
  min?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
}) {
  const kept = useKept(name, defaultValue);

  return (
    <Wrap name={name} label={label} hint={hint} required={required} half={half}>
      {(id, invalid, describedBy) => type === "date" ? (
        <DateInput id={id} name={name} defaultValue={String(kept ?? "")} min={min} required={required}
                   invalid={invalid} describedBy={describedBy} />
      ) : type === "datetime-local" ? (
        <DateTimeInput id={id} name={name} defaultValue={String(kept ?? "")} min={min} invalid={invalid} describedBy={describedBy} />
      ) : (
        <input
          id={id} name={name} type={type} defaultValue={kept}
          placeholder={placeholder} step={step} min={min} inputMode={inputMode}
          aria-invalid={invalid || undefined} aria-describedby={describedBy}
        />
      )}
    </Wrap>
  );
}

export function Area({
  name, label, hint, required, half, defaultValue, rows = 3, placeholder,
}: Common & { defaultValue?: string; rows?: number; placeholder?: string }) {
  const kept = useKept(name, defaultValue);
  return (
    <Wrap name={name} label={label} hint={hint} required={required} half={half}>
      {(id, invalid, describedBy) => (
        <textarea
          id={id} name={name} rows={rows} defaultValue={kept} placeholder={placeholder}
          aria-invalid={invalid || undefined} aria-describedby={describedBy}
        />
      )}
    </Wrap>
  );
}

export function Select({
  name, label, hint, required, half, defaultValue, options, placeholder, searchable,
}: Common & {
  defaultValue?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  /** Searchable by default above ten options, and for any record (a name
      ending in "Id": a client, a project, an invoice), because those lists
      only grow. */
  searchable?: boolean;
}) {
  const kept = useKept(name, defaultValue);
  const search = searchable ?? (options.length > 10 || /Id$/.test(name));
  return (
    <Wrap name={name} label={label} hint={hint} required={required} half={half}>
      {(id, invalid, describedBy) => (
        <Pick id={id} name={name} options={options} defaultValue={String(kept ?? "")} placeholder={placeholder}
              search={search} invalid={invalid} describedBy={describedBy} />
      )}
    </Wrap>
  );
}

/**
 * A choice between mutually exclusive answers, as radios rather than a select.
 *
 * A SELECT HIDES THE OTHER OPTION, and there are places where that is the
 * whole problem. "Back to their bank" and "held on their balance" are
 * different events with different consequences for the books, and one of them
 * has to be read and chosen rather than accepted as whatever the box happened
 * to say. Two options, both visible, each with its consequence under it.
 *
 * Reach for `Select` when the list is long or the choice is routine; reach for
 * this when there are two or three answers and picking the wrong one costs
 * something.
 */
export function Radios({
  name, label, hint, options, defaultValue,
}: {
  name: string; label: string; hint?: string;
  options: { value: string; label: string; note?: string }[];
  defaultValue?: string;
}) {
  const { errors, values, gen } = useContext(Ctx);
  const err = errors[name];
  const id = useId();
  const raw = values[name];
  const kept = (Array.isArray(raw) ? raw[0] : raw) ?? defaultValue;

  return (
    <div className="ad__f" role="radiogroup" aria-labelledby={`${id}-l`} aria-describedby={err ? `${id}-e` : undefined}>
      <span className="ad__flRow">
        <span className="ad__fl" id={`${id}-l`}>{label}</span>
        <HintTip hint={hint} label={label} />
      </span>
      {hint ? <Hint hint={hint} /> : null}
      <div className="ad__checks ad__checks--long">
        {options.map((o) => (
          <label key={`${o.value}-${gen}`} className="ad__check ad__check--long">
            <input type="radio" name={name} value={o.value} defaultChecked={kept === o.value} />
            <span>
              {o.label}
              {o.note ? <small>{o.note}</small> : null}
            </span>
          </label>
        ))}
      </div>
      {err ? <small className="ad__fe" id={`${id}-e`}>{err}</small> : null}
    </div>
  );
}

/** A set of checkboxes sharing one name, which FormData returns as a list. */
export function Checks({
  name, label, hint, options, defaultValue = [], long = false,
}: {
  name: string; label: string; hint?: string;
  options: { value: string; label: string }[];
  defaultValue?: string[];
  /**
   * Give each box a full-width row instead of a pill.
   *
   * The pill is right for a set of short tags picked from a list -- five
   * services, four channels -- where the shape helps you scan them. It is
   * wrong for one box carrying a sentence: a 999px capsule wraps "We can bill
   * this back to the client" onto three lines inside a shape built for two
   * words. Same control, given room. delivery.tsx had already hand-rolled this
   * label for the same reason; now there is one of it.
   */
  long?: boolean;
}) {
  const { errors, values, gen } = useContext(Ctx);
  const err = errors[name];
  const id = useId();
  const raw = values[name];
  const kept = raw === undefined
    ? defaultValue
    : Array.isArray(raw) ? raw : [raw];

  return (
    <div className="ad__f" role="group" aria-labelledby={`${id}-l`} aria-describedby={err ? `${id}-e` : undefined}>
      <span className="ad__flRow">
        <span className="ad__fl" id={`${id}-l`}>{label}</span>
        <HintTip hint={hint} label={label} />
      </span>
      {hint ? <Hint hint={hint} /> : null}
      <div className={`ad__checks${long ? " ad__checks--long" : ""}`}>
        {options.map((o) => (
          <label key={`${o.value}-${gen}`} className={`ad__check${long ? " ad__check--long" : ""}`}>
            <input type="checkbox" name={name} value={o.value} defaultChecked={kept.includes(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {err ? <small className="ad__fe" id={`${id}-e`}>{err}</small> : null}
    </div>
  );
}

/* A HINT THAT IS A SENTENCE OF BACKGROUND goes behind the question mark
   (components/onboarding/tip.tsx); a few words that the field cannot be
   filled without stay on show. Long hints under every label turned a
   six-field dialog into a page of prose on a phone. The words are still in
   the page, visually hidden and tied to the field by aria-describedby, so a
   screen reader hears them without anybody pressing anything. */
const SHORT_HINT = 48;
function Hint({ id, hint }: { id?: string; hint: string }) {
  return hint.length <= SHORT_HINT
    ? <small className="ad__fh" id={id}>{hint}</small>
    : <small className="ad__sr" id={id}>{hint}</small>;
}
/* Named "What does this mean?", like the onboarding form's, and NOT after
   the field: a button called "About Amount" is found by every lookup of the
   field by its label, which is how both people and tests find a field. */
function HintTip({ hint }: { hint?: string; label?: string }) {
  return hint && hint.length > SHORT_HINT ? <Tip text={hint} /> : null;
}

/** The label, hint and error around whatever control the caller renders. */
export function Wrap({
  name, label, hint, required, half, children,
}: Common & {
  children: (id: string, invalid: boolean, describedBy?: string) => React.ReactNode;
}) {
  const { errors, gen } = useContext(Ctx);
  const err = errors[name];
  const id = useId();
  const describedBy = [err ? `${id}-e` : "", hint ? `${id}-h` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`ad__f${half ? " ad__f--half" : ""}${err ? " is-bad" : ""}`}>
      <span className="ad__flRow">
        <label className="ad__fl" htmlFor={id}>
          {label}
          {required ? <b aria-hidden="true"> *</b> : null}
        </label>
        <HintTip hint={hint} label={label} />
      </span>
      {/* Keyed on the failure count: a changed key remounts the control, which
          is what makes a new defaultValue actually reach the DOM. Without it
          the reset stands and the typing is gone. */}
      <Fragment key={gen}>{children(id, Boolean(err), describedBy)}</Fragment>
      {/* UNDER the control, not between it and its label. Above, a field with
          a hint sat lower than its neighbour without one, so two fields in a
          row (Email's "From name" and "Replies go to") did not share a line. */}
      {hint ? <Hint id={`${id}-h`} hint={hint} /> : null}
      {err ? <small className="ad__fe" id={`${id}-e`}>{err}</small> : null}
    </div>
  );
}

/** The value to put back: what was submitted, else what the caller passed. */
export function useKept(name: string, fallback?: string | number) {
  const { values } = useContext(Ctx);
  const v = values[name];
  if (v === undefined) return fallback;
  return Array.isArray(v) ? v[0] : v;
}

/** The values to put back for a field that posts several (checkboxes, chips): what was submitted, else what the caller passed. */
export function useKeptList(name: string, fallback: string[] = []) {
  const { values } = useContext(Ctx);
  const v = values[name];
  if (v === undefined) return fallback;
  return Array.isArray(v) ? v : [v];
}

export function Fields({ children }: { children: React.ReactNode }) {
  return <div className="ad__fields">{children}</div>;
}

/* ---------------------------------------------------------------- buttons */

/**
 * The submit button, which knows it is submitting.
 *
 * DISABLED WHILE PENDING is not styling, it is the double-charge guard on the
 * payment form: a person who presses twice on a slow connection would
 * otherwise send two requests, and only one of them is caught by the
 * reference. The other is caught here.
 */
export function Submit({
  children, tone = "primary", icon: Icon, disabled = false,
}: {
  children: React.ReactNode;
  tone?: "primary" | "plain" | "danger";
  icon?: React.ComponentType<{ "aria-hidden"?: boolean }>;
  /** A client-side prerequisite (such as an upload) is still running. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const { pendingId } = useContext(Ctx);
  const cls = tone === "primary" ? " ad__btn--primary" : tone === "danger" ? " ad__btn--danger" : "";

  return (
    <button type="submit" className={`ad__btn${cls}`} disabled={pending || disabled} aria-describedby={pendingId}>
      {pending ? <Loader2 className="ad__spin" aria-hidden="true" /> : Icon ? <Icon aria-hidden={true} /> : null}
      {children}
    </button>
  );
}

export function Actions({ children }: { children: React.ReactNode }) {
  return <div className="ad__formActions">{children}</div>;
}

/** A hidden value the action needs and the person never edits. */
export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

/** The error for one field, for a control that is not one of the kit's own. */
export function useFieldError(name: string): string | undefined {
  return useContext(Ctx).errors[name];
}

/** Every field error the last submit came back with (the settings save bar counts them). */
export function useFormErrors(): Errors {
  return useContext(Ctx).errors;
}
