"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/admin/validate";
import { Form, Hidden, useFormErrors, useKept, Wrap } from "@/components/admin/form";

/**
 * THE SETTINGS KIT (the Settings canvas: dashboard redesign). Every section is
 * the same few parts, so they read as one screen:
 *
 *  - `SettingsForm`: a form that knows what changed. The first edit brings up
 *    a bar pinned to the foot of the page with "N unsaved changes", Discard
 *    and Save; leaving with changes asks first. A save with a bad field says
 *    how many are wrong instead.
 *  - `Switch`: a real switch (a button with role="switch") posting "1" or "0"
 *    through a hidden input, so the server action reads it like any field.
 *  - `Text`: a field that checks itself on leaving it (the browser's own
 *    constraints, with our words) and can count towards a limit.
 *  - `Chips`: several on/off choices as checkboxes drawn as pills.
 *  - `Row`: a label and a one-line note beside the control.
 *  - `ConfirmSwitch`: for the switches that change the site for everybody
 *    (search engines, maintenance). Flipping it asks, inline, before anything
 *    happens, and it saves on its own rather than with the bar.
 */

type Ping = () => void;
const Dirty = createContext<Ping>(() => {});

function serial(form: HTMLFormElement) {
  const m = new Map<string, string>();
  for (const [k, v] of new FormData(form)) {
    if (typeof v !== "string" || k.startsWith("$")) continue;
    m.set(k, m.has(k) ? `${m.get(k)}\u0000${v}` : v);
  }
  return m;
}

function differences(a: Map<string, string>, b: Map<string, string>) {
  let n = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) if ((a.get(k) ?? "") !== (b.get(k) ?? "")) n += 1;
  return n;
}

export function SettingsForm({ action, children }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
}) {
  const [saved, setSaved] = useState(0);
  const onDone = useCallback(() => setSaved((n) => n + 1), []);
  return (
    <Form action={action} onDone={onDone} className="adSF">
      <Tracker saved={saved}>{children}</Tracker>
    </Form>
  );
}

function Tracker({ saved, children }: { saved: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const base = useRef<Map<string, string>>(new Map());
  const frame = useRef(0);
  const [count, setCount] = useState(0);
  const errors = Object.keys(useFormErrors()).length;

  const measure = useCallback(() => {
    cancelAnimationFrame(frame.current);
    /* Two frames: a switch that was reset re-renders its hidden input first. */
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => {
        const form = box.current?.closest("form");
        if (form) setCount(differences(base.current, serial(form)));
      });
    });
  }, []);

  /* The baseline is what the page loaded with, and again after every save. */
  useEffect(() => {
    const form = box.current?.closest("form");
    if (form) base.current = serial(form);
    measure();
  }, [saved, measure]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.addEventListener("input", measure);
    el.addEventListener("change", measure);
    return () => { el.removeEventListener("input", measure); el.removeEventListener("change", measure); cancelAnimationFrame(frame.current); };
  }, [measure]);

  useEffect(() => {
    if (!count) return;
    const stay = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", stay);
    return () => window.removeEventListener("beforeunload", stay);
  }, [count]);

  const discard = () => { box.current?.closest("form")?.reset(); measure(); };

  return (
    <Dirty.Provider value={measure}>
      <div ref={box} className="adSF__body">{children}</div>
      <div className={`adSaveBar${count ? " is-on" : ""}`} role="region" aria-label="Unsaved changes" hidden={!count}>
        <span className="adSaveBar__msg" aria-live="polite">
          <i className={errors ? "is-bad" : undefined} aria-hidden="true" />
          {errors
            ? `Fix ${errors} ${errors === 1 ? "field" : "fields"} before saving`
            : `${count} unsaved ${count === 1 ? "change" : "changes"}`}
        </span>
        <span className="adSaveBar__acts">
          <button type="button" className="ad__btn" onClick={discard}>Discard</button>
          <SaveButton />
        </span>
      </div>
    </Dirty.Provider>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="ad__btn ad__btn--primary" disabled={pending}>
      {pending ? <Loader2 className="ad__spin" aria-hidden="true" /> : null}
      {pending ? "Saving" : "Save changes"}
    </button>
  );
}

/** A setting's label and one-line note, with its control beside it. */
export function Row({ label, note, labelId, children }: {
  label: string; note?: string; labelId?: string; children: React.ReactNode;
}) {
  return (
    <div className="adSR">
      <span className="adSR__text">
        <b id={labelId}>{label}</b>
        {note ? <small>{note}</small> : null}
      </span>
      <span className="adSR__ctl">{children}</span>
    </div>
  );
}

/** The switch itself, without a row. `onFlip` is for a caller that reacts. */
export function Toggle({ name, on, labelledBy, label, disabled, onFlip }: {
  name?: string; on: boolean; labelledBy?: string; label?: string; disabled?: boolean; onFlip?: (next: boolean) => void;
}) {
  return (
    <>
      <button type="button" role="switch" aria-checked={on} aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label}
        className={`adSw${on ? " is-on" : ""}`} disabled={disabled} onClick={() => onFlip?.(!on)}>
        <span className="adSw__t"><span className="adSw__k" /></span>
      </button>
      {name ? <input type="hidden" name={name} value={on ? "1" : "0"} /> : null}
    </>
  );
}

/** A switch row inside a `SettingsForm`: saved with the bar, put back by Discard. */
export function Switch({ name, label, note, defaultChecked, disabled, onChange }: {
  name: string; label: string; note?: string; defaultChecked: boolean; disabled?: boolean;
  onChange?: (on: boolean) => void;
}) {
  const ping = useContext(Dirty);
  const kept = useKept(name, defaultChecked ? "1" : "0");
  const [on, setOn] = useState(kept === "1");
  const ref = useRef<HTMLDivElement>(null);
  const id = `sw-${name}`;
  /* Discard resets the form; a switch is state, so it listens for that. */
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const back = () => { setOn(defaultChecked); onChange?.(defaultChecked); };
    form.addEventListener("reset", back);
    return () => form.removeEventListener("reset", back);
  }, [defaultChecked, onChange]);
  return (
    <div ref={ref} className="adSR__wrap">
      <Row label={label} note={note} labelId={id}>
        <Toggle name={name} on={on} labelledBy={id} disabled={disabled}
          onFlip={(next) => { setOn(next); onChange?.(next); ping(); }} />
      </Row>
    </div>
  );
}

/**
 * A text field that checks itself when you leave it. The rules are the
 * browser's own (type, required, pattern, min, max) so the server's are not
 * duplicated here in a second language; `message` is what we say when one
 * fails. The server still checks everything: this only says it sooner.
 */
export function Text({
  name, label, hint, defaultValue, type = "text", required, pattern, min, max, step, inputMode,
  placeholder, message, count, suffix, prefix, rows, half, autoComplete,
}: {
  name: string; label: string; hint?: string; defaultValue?: string | number; type?: string;
  required?: boolean; pattern?: string; min?: number; max?: number; step?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email"; placeholder?: string;
  message?: string; count?: number; suffix?: string; prefix?: string; rows?: number; half?: boolean; autoComplete?: string;
}) {
  const kept = useKept(name, defaultValue);
  const [local, setLocal] = useState("");
  const [len, setLen] = useState(String(kept ?? "").length);
  const check = (el: HTMLInputElement | HTMLTextAreaElement) => {
    setLen(el.value.length);
    if (el.validity.valid && !(count && el.value.length > count)) { setLocal(""); return; }
    setLocal(message ?? (count && el.value.length > count ? `Keep it to ${count} characters.` : el.validationMessage));
  };
  const over = count ? len > count : false;
  return (
    <Wrap name={name} label={label} hint={hint} required={required} half={half}>
      {(id, invalid, describedBy) => {
        const bad = invalid || Boolean(local);
        const attrs = {
          id, name, defaultValue: kept, required, placeholder, autoComplete,
          "aria-invalid": bad || undefined,
          "aria-describedby": [describedBy, local && !invalid ? `${id}-l` : "", count ? `${id}-c` : ""].filter(Boolean).join(" ") || undefined,
          onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => check(e.currentTarget),
          onInput: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => { setLen(e.currentTarget.value.length); if (local) check(e.currentTarget); },
        };
        return (
          <>
            {count ? <span className={`adCount${over ? " is-bad" : len > count * .92 ? " is-warn" : ""}`} id={`${id}-c`} aria-live="polite">{len} / {count}</span> : null}
            {rows ? (
              <textarea {...attrs} rows={rows} />
            ) : (
              <span className={`adAffix${suffix ? " adAffix--suf" : ""}${prefix ? " adAffix--pre" : ""}`}>
                {prefix ? <span aria-hidden="true">{prefix}</span> : null}
                <input {...attrs} type={type} pattern={pattern} min={min} max={max} step={step} inputMode={inputMode} />
                {suffix ? <span aria-hidden="true">{suffix}</span> : null}
              </span>
            )}
            {local && !invalid ? <small className="ad__fe" id={`${id}-l`}>{local}</small> : null}
          </>
        );
      }}
    </Wrap>
  );
}

/** Several on/off choices, drawn as pills. Real checkboxes, so reset and FormData just work. */
export function Chips({ name, legend, options, defaultValues, disabled }: {
  name: string; legend: string; options: { value: string; label: string }[]; defaultValues: string[]; disabled?: boolean;
}) {
  return (
    <fieldset className="adChips" disabled={disabled}>
      <legend className="ad__sr">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="adChip">
          <input type="checkbox" name={name} value={o.value} defaultChecked={defaultValues.includes(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * A switch that changes the site for everyone, so it asks first, in place:
 * flipping it opens a short confirmation (with any fields the change needs)
 * and nothing happens until "confirm" is pressed. Saved on its own.
 */
export function ConfirmSwitch({ label, note, on, post, action, ask, confirmLabel, danger, children }: {
  label: string; note?: string; on: boolean;
  /** What the confirmation posts as `on`, the action's own meaning of it. */
  post: string;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  ask: string; confirmLabel: string; danger?: boolean; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = `cs-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="adSR__wrap">
      <Row label={label} note={note} labelId={id}>
        <Toggle on={open ? !on : on} labelledBy={id} onFlip={() => setOpen((o) => !o)} />
      </Row>
      {open ? (
        <Form action={action} onDone={close} className="adConfirm">
          <Hidden name="on" value={post} />
          <b className="adConfirm__q">{ask}</b>
          {children}
          <span className="adConfirm__acts">
            <button type="button" className="ad__btn" onClick={close}>Cancel</button>
            <ConfirmButton danger={danger}>{confirmLabel}</ConfirmButton>
          </span>
        </Form>
      ) : null}
    </div>
  );
}

function ConfirmButton({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`ad__btn ${danger ? "ad__btn--danger" : "ad__btn--primary"}`} disabled={pending}>
      {pending ? <Loader2 className="ad__spin" aria-hidden="true" /> : null}{children}
    </button>
  );
}

/** The page's own title and one line, the same on every section. */
export function Head({ title, line, children }: { title: string; line?: string; children?: React.ReactNode }) {
  return (
    <div className="ad__head">
      <div><h1>{title}</h1>{line ? <p>{line}</p> : null}</div>
      {children ? <div className="ad__row">{children}</div> : null}
    </div>
  );
}
