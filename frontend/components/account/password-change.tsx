"use client";

import { useCallback, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Dices, Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { confirmPasswordChange, requestPasswordCode } from "@/lib/account/password-actions";
import { passwordStrength, suggestPassword } from "@/lib/auth/password-policy";
import { Form, Hidden, useFieldError } from "@/components/admin/form";
import "./password-change.css";

/**
 * CHANGE PASSWORD WITHOUT THE OLD ONE: type the new password twice, then the
 * six-digit code we email to you (lib/account/password-actions.ts). The two
 * passwords are kept here between the steps and posted again with the code,
 * so the server checks them both times and stores nothing but a hash.
 */
export function PasswordChange({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [step, setStep] = useState<"new" | "code">("new");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const toCode = useCallback(() => setStep("code"), []);
  const done = useCallback(() => { setStep("new"); setNext(""); setAgain(""); }, []);

  if (step === "code") {
    return (
      <div className="adPw">
        <Form action={confirmPasswordChange} onDone={done} className="adPw__form">
          <Hidden name="next" value={next} />
          <Hidden name="again" value={again} />
          <p className="adPw__sent"><Mail aria-hidden="true" /> We sent a 6-digit code to <b>{email}</b>. It works for 10 minutes.</p>
          <CodeField />
          <span className="adPw__acts">
            <button type="button" className="ad__btn" onClick={() => setStep("new")}><ArrowLeft aria-hidden="true" /> Back</button>
            <Go icon={KeyRound}>{hasPassword ? "Change password" : "Set password"}</Go>
          </span>
        </Form>
        <Form action={requestPasswordCode} className="adPw__resend">
          <Hidden name="next" value={next} />
          <Hidden name="again" value={again} />
          <ResendButton />
        </Form>
      </div>
    );
  }

  const strength = passwordStrength(next);
  return (
    <Form action={requestPasswordCode} onDone={toCode} className="adPw adPw__form">
      <div className="ad__fields">
        <PwField name="next" label={hasPassword ? "New password" : "Password"} value={next} onChange={setNext} show={show} autoComplete="new-password" />
        <PwField name="again" label="Confirm it" value={again} onChange={setAgain} show={show} autoComplete="new-password"
          mismatch={Boolean(again) && again !== next} />
      </div>
      <div className="adPw__meter" aria-live="polite">
        <span className="adPw__bars" data-bars={strength.bars} aria-hidden="true"><i /><i /><i /><i /></span>
        <small>{next ? <><b>{strength.word}</b>{strength.next ? ` · ${strength.next}` : " · Good to go"}</> : "8+ characters with a capital, a small letter, a number and a symbol."}</small>
      </div>
      <span className="adPw__acts">
        <button type="button" className="ad__btn" onClick={() => setShow((s) => !s)} aria-pressed={show}>
          {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />} {show ? "Hide" : "Show"}
        </button>
        <button type="button" className="ad__btn" onClick={() => { const p = suggestPassword(); setNext(p); setAgain(p); setShow(true); }}>
          <Dices aria-hidden="true" /> Suggest one
        </button>
        <Go icon={Mail}>Send me a code</Go>
      </span>
    </Form>
  );
}

function PwField({ name, label, value, onChange, show, autoComplete, mismatch }: {
  name: string; label: string; value: string; onChange: (v: string) => void; show: boolean; autoComplete: string; mismatch?: boolean;
}) {
  const id = useId();
  const server = useFieldError(name);
  const err = server || (mismatch ? "The two passwords are not the same." : "");
  return (
    <div className={`ad__f ad__f--half${err ? " is-bad" : ""}`}>
      <span className="ad__flRow"><label className="ad__fl" htmlFor={id}>{label}<b aria-hidden="true"> *</b></label></span>
      <input id={id} name={name} type={show ? "text" : "password"} value={value} autoComplete={autoComplete} required
        spellCheck={false} onChange={(e) => onChange(e.target.value)}
        aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-e` : undefined} />
      {err ? <small className="ad__fe" id={`${id}-e`}>{err}</small> : null}
    </div>
  );
}

function CodeField() {
  const id = useId();
  const err = useFieldError("code");
  return (
    <div className={`ad__f adPw__code${err ? " is-bad" : ""}`}>
      <span className="ad__flRow"><label className="ad__fl" htmlFor={id}>Code from the email</label></span>
      <input id={id} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={7} required
        placeholder="000000" aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-e` : undefined} />
      {err ? <small className="ad__fe" id={`${id}-e`}>{err}</small> : null}
    </div>
  );
}

function Go({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="ad__btn ad__btn--primary" disabled={pending}>
      {pending ? <Loader2 className="ad__spin" aria-hidden="true" /> : <Icon aria-hidden="true" />} {children}
    </button>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="ad__link adPw__again" disabled={pending}>{pending ? "Sending" : "Send a new code"}</button>;
}
