"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PasswordField, PasswordRules, PrimaryButton } from "@/components/auth/fields";
import { passwordProblem } from "@/lib/auth/password-policy";
import { useStage } from "@/components/auth/stage/stage-context";
import { useHydrated } from "@/components/auth/use-hydrated";
import { authClient } from "@/lib/auth-client";

/**
 * CHOOSING A NEW PASSWORD, from the emailed reset link.
 *
 * THE TOKEN AND THE ERROR ARRIVE AS PROPS, read from the query on the server.
 * They used to come from `useSearchParams()`, which made this a dynamic client
 * component, and the Suspense boundary that required rendered NOTHING on the
 * server: primary content behind client-only rendering, on the page where
 * somebody is already locked out. Read on the server, the form is in the first
 * response.
 *
 * The orb turns its back while either password field has focus, the ring
 * tells the truth about the request, and a success earns a nod.
 */
export function ResetPasswordForm({ token = "", invalid = false }: { token?: string; invalid?: boolean }) {
  const stage = useStage();
  const hydrated = useHydrated();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(invalid ? "This reset link is invalid or has expired." : "");
  const [field, setField] = useState<{ password?: string; confirm?: string }>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const weak = passwordProblem(password);
    if (weak) {
      setField({ password: weak });
      passwordRef.current?.focus();
      return;
    }
    if (password !== confirm) {
      setField({ confirm: "The two passwords do not match." });
      confirmRef.current?.focus();
      return;
    }
    if (!token) return setError("This reset link is invalid or has expired.");
    setField({});
    setLoading(true);
    setError("");
    stage.setMood("attentive");
    stage.ringBegin();
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        await Promise.all([stage.ringEnd(false), stage.shakeHead()]);
        setError(
          result.error.status === 429
            ? "Too many attempts from this connection. Wait a minute and try again."
            : "This reset link is invalid or has expired. Request a new one.",
        );
        return;
      }
      await stage.ringEnd(true);
      void stage.nod();
      window.setTimeout(() => stage.ringHide(), 900);
      setDone(true);
    } catch {
      await stage.ringEnd(false);
      void stage.confused();
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lx">
      <div className="lx__step" data-dir="1">
        <h1 className="lx__heading">Choose a new password</h1>
        {done ? (
          <div className="au__notice" role="status">
            <b>Password updated.</b>
            <span>Every other session on this account has been signed out. Log in with the new password.</span>
            <Link href="/login" className="au-btn au-btn--primary" data-awake="true">
              Continue to log in
            </Link>
          </div>
        ) : (
          <>
            {error ? (
              <p className="au__error" role="alert">
                {error}
              </p>
            ) : null}
            <form onSubmit={submit} className="au__form lx__form" method="post" noValidate>
              <PasswordField
                ref={passwordRef}
                label="New password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (field.password) setField({});
                }}
                error={field.password ?? null}
              />
              <PasswordRules value={password} onSuggest={(made) => { setPassword(made); setConfirm(made); setField({}); }} />
              <PasswordField
                ref={confirmRef}
                label="Confirm password"
                name="confirm-password"
                autoComplete="new-password"
                value={confirm}
                onChange={(value) => {
                  setConfirm(value);
                  if (field.confirm) setField({});
                }}
                error={field.confirm ?? null}
              />
              <PrimaryButton awake={!passwordProblem(password) && confirm.length > 0} hydrated={hydrated} busy={loading}>
                Update password
              </PrimaryButton>
            </form>
            <Link className="au-link lx__back" href="/forgot-password">
              Request a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
