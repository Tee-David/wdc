"use client";

import {
  createContext, Fragment, useActionState, useCallback, useContext, useEffect,
  useId, useRef, useState,
} from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { ActionState, Errors } from "@/lib/admin/validate";

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
  const keep = useCallback(
    async (prev: ActionState, fd: FormData): Promise<ActionState> => {
      const res = await action(prev, fd);
      if (res.ok) return res;
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
        onSubmit={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
      >
        {children}
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
      <span>{state.message}</span>
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
 * 09/14/2026 OR 14/09/2026, AND THE FIELD CANNOT TELL YOU WHICH.
 *
 * A native date input renders in the BROWSER's language, not the page's, and
 * nothing on our side changes that. So the same due date reads 09/14 on one
 * laptop and 14/09 on the next, and for any day of the month under thirteen
 * there is no way to tell them apart by looking. On an invoice date that is
 * not a nicety.
 *
 * The picker stays native, because the platform's calendar is keyboard
 * complete, localised, and on a phone it is the wheel the person already
 * knows. What is added is an echo in words, fixed to en-GB so it says the same
 * thing to everybody: "Monday, 14 September 2026". No dependency, no second
 * calendar to maintain, and the ambiguity is gone.
 */
function inWords(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  /* Midday UTC, so reading it back in Lagos or in London names the same day --
     the same reason `isoDate` in validate.ts stores it that way. */
  const d = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

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
  const [day, setDay] = useState(() => (type === "date" ? String(kept ?? "") : ""));

  return (
    <Wrap name={name} label={label} hint={hint} required={required} half={half}>
      {(id, invalid, describedBy) => (
        <>
          <input
            id={id} name={name} type={type} defaultValue={kept}
            placeholder={placeholder} step={step} min={min} inputMode={inputMode}
            aria-invalid={invalid || undefined} aria-describedby={describedBy}
            onChange={type === "date" ? (e) => setDay(e.target.value) : undefined}
          />
          {type === "date" && inWords(day) ? (
            /* `aria-hidden`, because the input already announces its own date
               to a screen reader and hearing it twice is noise. This is for
               the eye, which is where the ambiguity lives. */
            <small className="ad__fd" aria-hidden="true">{inWords(day)}</small>
          ) : null}
        </>
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
  name, label, hint, required, half, defaultValue, options, placeholder,
}: Common & {
  defaultValue?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  const kept = useKept(name, defaultValue);
  return (
    <Wrap name={name} label={label} hint={hint} required={required} half={half} kind="select">
      {(id, invalid, describedBy) => (
        <select
          id={id} name={name} defaultValue={kept ?? ""}
          aria-invalid={invalid || undefined} aria-describedby={describedBy}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
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
      <span className="ad__fl" id={`${id}-l`}>{label}</span>
      {hint ? <small className="ad__fh">{hint}</small> : null}
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
      <span className="ad__fl" id={`${id}-l`}>{label}</span>
      {hint ? <small className="ad__fh">{hint}</small> : null}
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

/** The label, hint and error around whatever control the caller renders. */
function Wrap({
  name, label, hint, required, half, kind, children,
}: Common & {
  /* What is inside, so the wrapper can carry the caret a `<select>` needs.
     Drawn on the WRAPPER rather than as a background on the control itself,
     because a background-image on a select is what makes several browsers
     drop their own arrow and leave nothing -- and because a pseudo-element can
     take `currentColor`, change on focus-within and be masked from one shared
     chevron. */
  kind?: "select";
  children: (id: string, invalid: boolean, describedBy?: string) => React.ReactNode;
}) {
  const { errors, gen } = useContext(Ctx);
  const err = errors[name];
  const id = useId();
  const describedBy = [err ? `${id}-e` : "", hint ? `${id}-h` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`ad__f${half ? " ad__f--half" : ""}${kind === "select" ? " ad__f--sel" : ""}${err ? " is-bad" : ""}`}>
      <label className="ad__fl" htmlFor={id}>
        {label}
        {required ? <b aria-hidden="true"> *</b> : null}
      </label>
      {hint ? <small className="ad__fh" id={`${id}-h`}>{hint}</small> : null}
      {/* Keyed on the failure count: a changed key remounts the control, which
          is what makes a new defaultValue actually reach the DOM. Without it
          the reset stands and the typing is gone. */}
      <Fragment key={gen}>{children(id, Boolean(err), describedBy)}</Fragment>
      {err ? <small className="ad__fe" id={`${id}-e`}>{err}</small> : null}
    </div>
  );
}

/** The value to put back: what was submitted, else what the caller passed. */
function useKept(name: string, fallback?: string | number) {
  const { values } = useContext(Ctx);
  const v = values[name];
  if (v === undefined) return fallback;
  return Array.isArray(v) ? v[0] : v;
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
  children, tone = "primary", icon: Icon,
}: {
  children: React.ReactNode;
  tone?: "primary" | "plain" | "danger";
  icon?: React.ComponentType<{ "aria-hidden"?: boolean }>;
}) {
  const { pending } = useFormStatus();
  const { pendingId } = useContext(Ctx);
  const cls = tone === "primary" ? " ad__btn--primary" : tone === "danger" ? " ad__btn--danger" : "";

  return (
    <button type="submit" className={`ad__btn${cls}`} disabled={pending} aria-describedby={pendingId}>
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
