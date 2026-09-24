"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { AtSign, Check, Eye, EyeOff, CircleAlert, ArrowUpRight } from "lucide-react";
import { useStage } from "@/components/auth/stage/stage-context";
import { caretPoint } from "@/lib/auth/caret";
import { copy } from "@/lib/auth/copy";
import { hasAt, isEmail } from "@/lib/auth/validation";

/**
 * Leaving a field returns the orb to idle after 80ms, unless another field
 * took focus in the meantime. Without the delay, tabbing from the email to
 * the password would flash "idle" for one frame between "reading" and
 * "turning away".
 */
function useRelax() {
  const stage = useStage();
  return () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && active.closest(".au__panel")) return;
      if (stage.getMood() === "reading" || stage.getMood() === "private") stage.setMood("idle");
    }, 80);
  };
}

function Message({ id, tone, children }: { id: string; tone: "error" | "hint"; children: React.ReactNode }) {
  return (
    <p id={id} className={`au-msg au-msg--${tone}`}>
      <CircleAlert aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/* ------------------------------------------------------------------ email */

/**
 * THE FIELD SHARPENS AS IT BECOMES RIGHT. Three cues and no more: the edge
 * firms up once there is text, an "@" appears once it looks like an address,
 * and the "@" turns into a tick when it is one. Nothing flashes, nothing
 * bounces, and nothing is ever called wrong while the person is still typing.
 */
export const EmailField = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    onBlur?: (value: string) => void;
    error: string | null;
    label?: string;
    autoFocus?: boolean;
    /** Autofill hint. The identify step adds `webauthn` where passkeys are live. */
    autoComplete?: string;
    enterKeyHint?: "next" | "go" | "send";
  }
>(function EmailField({ value, onChange, onBlur, error, label = copy.identify.emailLabel, autoFocus, autoComplete = "username", enterKeyHint = "next" }, forwarded) {
  const id = useId();
  const stage = useStage();
  const relax = useRelax();
  const input = useRef<HTMLInputElement>(null);
  const frame = useRef(0);
  useImperativeHandle(forwarded, () => input.current!);

  const state = error ? "invalid" : isEmail(value) ? "valid" : hasAt(value) ? "has-at" : value ? "typing" : "empty";

  /* The orb reads along: its gaze follows the caret, throttled to a frame. */
  const read = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const node = input.current;
      if (!node || document.activeElement !== node) return;
      const point = caretPoint(node);
      stage.lookAtPoint(point.x, point.y);
    });
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div className="au-field" data-state={state}>
      <label htmlFor={id}>{label}</label>
      <div className="au-input">
        <input
          ref={input}
          id={id}
          type="email"
          name="email"
          autoComplete={autoComplete}
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={enterKeyHint}
          placeholder={copy.identify.emailPlaceholder}
          autoFocus={autoFocus}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            onChange(event.target.value);
            read();
          }}
          onFocus={() => {
            stage.setMood("reading");
            read();
          }}
          onSelect={read}
          onKeyUp={read}
          onBlur={(event) => {
            onBlur?.(event.target.value);
            relax();
          }}
        />
        <span className="au-input__mark" aria-hidden="true">
          <AtSign className="au-input__at" />
          <Check className="au-input__check" />
        </span>
      </div>
      {error ? <Message id={`${id}-error`} tone="error">{error}</Message> : null}
    </div>
  );
});

/* --------------------------------------------------------------- password */

export const PasswordField = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (value: string) => void; error: string | null; autoFocus?: boolean; onCaps?: (on: boolean) => void; autoComplete?: string; label?: string; name?: string }
>(function PasswordField({ value, onChange, error, autoFocus, onCaps, autoComplete = "current-password", label = copy.password.label, name = "password" }, forwarded) {
  const id = useId();
  const stage = useStage();
  const relax = useRelax();
  const input = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  useImperativeHandle(forwarded, () => input.current!);

  /* Caps Lock is the commonest reason a correct password is refused, and the
     field is masked, so nobody can see why. */
  const watchCaps = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const on = event.getModifierState?.("CapsLock") ?? false;
    if (on !== caps) {
      setCaps(on);
      onCaps?.(on);
    }
  };

  /* Switching the input type throws the caret to the end in some browsers;
     put it back where it was. */
  const toggle = () => {
    const node = input.current;
    const start = node?.selectionStart ?? null;
    const end = node?.selectionEnd ?? null;
    setShow((value) => !value);
    requestAnimationFrame(() => {
      if (node && start !== null && end !== null && document.activeElement === node) node.setSelectionRange(start, end);
    });
  };

  const described = [error ? `${id}-error` : "", caps ? `${id}-caps` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className="au-field" data-state={error ? "invalid" : value ? "typing" : "empty"}>
      <label htmlFor={id}>{label}</label>
      <div className="au-input au-input--action">
        <input
          ref={input}
          id={id}
          type={show ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          enterKeyHint="go"
          autoFocus={autoFocus}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={watchCaps}
          onKeyUp={watchCaps}
          onFocus={() => stage.setMood("private")}
          onBlur={() => {
            setCaps(false);
            onCaps?.(false);
            relax();
          }}
        />
        <button
          type="button"
          className="au-input__reveal"
          onClick={toggle}
          aria-label={show ? copy.password.hide : copy.password.show}
          aria-pressed={show}
        >
          {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {caps ? <Message id={`${id}-caps`} tone="hint">{copy.password.capsLock}</Message> : null}
      {error ? <Message id={`${id}-error`} tone="error">{error}</Message> : null}
    </div>
  );
});

/* ------------------------------------------------------------------- code */

/**
 * ONE INPUT, DRAWN AS SIX BOXES.
 *
 * A single real `<input>` so the phone's "code from Messages/Mail" autofill,
 * paste and screen readers all see one field with one value; the boxes are a
 * drawing of that value underneath it. Six separate inputs break every one of
 * those.
 */
export const CodeField = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (value: string) => void; onComplete: (value: string) => void; error: string | null; label: string; disabled?: boolean }
>(function CodeField({ value, onChange, onComplete, error, label, disabled }, forwarded) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(forwarded, () => input.current!);

  return (
    <div className="au-field au-code" data-state={error ? "invalid" : value.length === 6 ? "valid" : value ? "typing" : "empty"}>
      <label htmlFor={id}>{label}</label>
      <div className="au-code__row">
        <div className="au-code__boxes" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`au-code__box${focused && i === Math.min(value.length, 5) ? " is-active" : ""}${value[i] ? " is-filled" : ""}`}>
              {value[i] ?? ""}
            </span>
          ))}
        </div>
        <input
          ref={input}
          id={id}
          className="au-code__input"
          type="text"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          enterKeyHint="go"
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
            onChange(digits);
            if (digits.length === 6) onComplete(digits);
          }}
        />
      </div>
      {error ? <Message id={`${id}-error`} tone="error">{error}</Message> : null}
    </div>
  );
});

/* ---------------------------------------------------------------- buttons */

/**
 * THE PRIMARY BUTTON, ASLEEP UNTIL THE STEP IS READY.
 *
 * Never `disabled` once the page is live: a disabled button cannot be
 * pressed, focused or explained, so pressing an asleep one says what is
 * missing instead. `aria-disabled` carries the state to a screen reader.
 *
 * It IS disabled before hydration, deliberately, and for a reason this repo
 * paid for: see components/auth/use-hydrated.ts. The form has no handler
 * until React is live, and a submit in that gap must not go anywhere.
 *
 * Awake, it is the site's primary: black on paper, white on the dark theme.
 */
export function PrimaryButton({
  children,
  awake,
  busy,
  hydrated,
  onClick,
  type = "submit",
}: {
  children: React.ReactNode;
  awake: boolean;
  busy?: boolean;
  hydrated: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      className="au-btn au-btn--primary au__submit"
      data-awake={awake ? "true" : "false"}
      aria-disabled={!awake || busy ? true : undefined}
      aria-busy={busy ? true : undefined}
      disabled={!hydrated}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="au-google">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}

/* ------------------------------------------------------------ email chip */

/** `tee.davidolawale@gmail.com` becomes `tee.davi…ale@gmail.com`. */
export function middleTruncate(email: string, max = 26) {
  if (email.length <= max) return email;
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const room = Math.max(6, max - domain.length - 1);
  if (local.length <= room) return email;
  const head = Math.ceil(room * 0.7);
  return `${local.slice(0, head)}…${local.slice(local.length - (room - head))}${domain}`;
}

export function EmailChip({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <div className="au-chip">
      <span className="au-chip__email" title={email}>
        <span className="sr-only">Signing in as </span>
        {middleTruncate(email)}
      </span>
      <button type="button" className="au-link au-chip__change" onClick={onChange} aria-label={`Change email address, currently ${email}`}>
        {copy.common.change}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ inbox links */

const INBOXES: Array<{ domains: string[]; label: string; url: (sender: string) => string }> = [
  {
    domains: ["gmail.com", "googlemail.com"],
    label: copy.magic.openGmail,
    url: (sender) => `https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(sender)}+newer_than%3A1h`,
  },
  { domains: ["outlook.com", "hotmail.com", "live.com"], label: copy.magic.openOutlook, url: () => "https://outlook.live.com/mail/0/" },
  { domains: ["yahoo.com", "ymail.com"], label: copy.magic.openYahoo, url: () => "https://mail.yahoo.com/" },
  { domains: ["icloud.com", "me.com"], label: copy.magic.openIcloud, url: () => "https://www.icloud.com/mail" },
];

/** A shortcut to the right inbox, for the four we can recognise. Nothing for the rest. */
export function InboxButton({ email, sender }: { email: string; sender: string }) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const inbox = INBOXES.find((entry) => entry.domains.includes(domain));
  if (!inbox) return null;
  return (
    <a className="au-btn au-btn--secondary" href={inbox.url(sender)} target="_blank" rel="noopener noreferrer">
      {inbox.label}
      <ArrowUpRight aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
