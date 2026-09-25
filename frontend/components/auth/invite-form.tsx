"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleMark, PasswordField, PasswordRules, PrimaryButton } from "@/components/auth/fields";
import { passwordProblem } from "@/lib/auth/password-policy";
import { useStage } from "@/components/auth/stage/stage-context";
import { useHydrated } from "@/components/auth/use-hydrated";
import { authClient } from "@/lib/auth-client";
import { redeem } from "@/lib/invite-redeem";

/**
 * ACCEPTING AN INVITATION.
 *
 * THE ADDRESS IS SHOWN, NOT ASKED FOR. It is the invitation's, the account
 * will be made for it, and there is no field that could change it -- which is
 * the whole of "a forwarded link cannot register a different address".
 *
 * Three ways to finish, one account either way:
 *  - a password, then signed straight in with it;
 *  - Google, for staff, where the Google account must be this same address;
 *  - for a client, no password at all: sign-in links by email, the same ones
 *    the login page sends.
 */
export function InviteForm({ token, email, name: invitedName, role, google, company, expires }: {
  token: string;
  email: string;
  name: string;
  role: "client" | "staff";
  invitedBy: string;
  google: boolean;
  /** The client's company, when the invitation is tied to one. */
  company?: string | null;
  /** When the link stops working, already written out for Lagos ("2 Oct"). */
  expires: string;
}) {
  const router = useRouter();
  const stage = useStage();
  const hydrated = useHydrated();
  const nameId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(invitedName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [field, setField] = useState<{ password?: string; confirm?: string }>({});
  const [sent, setSent] = useState(false);


  async function finish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const weak = passwordProblem(password);
    if (weak) { setField({ password: weak }); passwordRef.current?.focus(); return; }
    if (password !== confirm) { setField({ confirm: "The two passwords do not match." }); confirmRef.current?.focus(); return; }
    setField({});
    setBusy(true);
    setError("");
    stage.ringBegin();
    try {
      const made = await redeem({ token, name, password });
      if (!made.ok) { await stage.ringEnd(false); setError(made.error); return; }
      const signed = await authClient.signIn.email({ email: made.email, password, rememberMe: true });
      await stage.ringEnd(!signed.error);
      /* The account exists either way; a failed sign-in here is only a
         missing cookie, and the login page fixes that. */
      router.replace(signed.error ? "/login" : "/signed-in");
    } catch {
      await stage.ringEnd(false);
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function withoutPassword(then: "google" | "link") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const made = await redeem({ token, name, password: null });
      if (!made.ok) { setError(made.error); return; }
      if (then === "google") {
        const result = await authClient.signIn.social({ provider: "google", callbackURL: "/login?done=1", errorCallbackURL: "/login" });
        if (result?.error) router.replace("/login");
        return;
      }
      await authClient.signIn.magicLink({ email: made.email, callbackURL: "/login?done=1", errorCallbackURL: "/login" });
      setSent(true);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="lx">
        <div className="lx__step" data-dir="1">
          <h1 className="lx__heading">Check your inbox</h1>
          <div className="au__notice" role="status">
            <b>Your account is ready.</b>
            <span>We have sent a sign-in link to {email}. Any time you want to come back, ask for another on the log-in page.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lx">
      <div className="lx__step" data-dir="1">
        <h1 className="lx__heading">{role === "staff" ? "Join the studio" : company ? `Welcome, ${company}` : "Your project portal"}</h1>
        {/* One line: who asked, and the address the account is for. */}
        <p className="lx__sub"><b>{email}</b> · invited by WDC Solutions</p>
        {error ? <p className="au__error" role="alert">{error}</p> : null}
        <form onSubmit={finish} className="au__form lx__form" method="post" noValidate>
          <div className="au-field" data-state={name ? "valid" : "empty"}>
            <label htmlFor={nameId}>Your name</label>
            <div className="au-input">
              <input id={nameId} name="name" autoComplete="name" value={name} maxLength={120}
                     onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <PasswordField ref={passwordRef} label="Choose a password" name="new-password" autoComplete="new-password"
            value={password} onChange={(v) => { setPassword(v); if (field.password) setField({}); }} error={field.password ?? null} />
          <PasswordRules value={password} onSuggest={(made) => {
            setPassword(made); setConfirm(made); setField({});
          }} />
          <PasswordField ref={confirmRef} label="Confirm password" name="confirm-password" autoComplete="new-password"
            value={confirm} onChange={(v) => { setConfirm(v); if (field.confirm) setField({}); }} error={field.confirm ?? null} />
          <PrimaryButton awake={!passwordProblem(password) && confirm.length > 0} hydrated={hydrated} busy={busy}>
            Create my account
          </PrimaryButton>
        </form>
        {google ? (
          <button type="button" className="au-btn au-btn--secondary lx__social" disabled={!hydrated || busy}
                  onClick={() => withoutPassword("google")}>
            <GoogleMark /> Continue with Google instead
          </button>
        ) : null}
        {role === "client" ? (
          <button type="button" className="au-link lx__back" disabled={!hydrated || busy}
                  onClick={() => withoutPassword("link")}>
            Email me a sign-in link instead
          </button>
        ) : null}
        <p className="lx__fine">Link expires {expires}.</p>
      </div>
    </div>
  );
}
