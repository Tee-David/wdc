"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/components/auth/use-hydrated";

/**
 * THE TOKEN AND THE ERROR ARRIVE AS PROPS, read from the query on the server.
 *
 * They used to come from `useSearchParams()`, which made this a dynamic
 * client component -- and the Suspense boundary it therefore needed rendered
 * NOTHING on the server. `curl /forgot-password` returned the brand panel and
 * no form at all: primary content behind client-only rendering, which is the
 * one thing this repo says not to do, on the page where somebody is already
 * locked out and least in the mood for a blank panel.
 *
 * Both pages now read their own query and hand it down, so the form is in the
 * first response and there is no boundary to render empty.
 */

export function ForgotPasswordForm() {
  const emailId = useId();
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: "/reset-password" });
      /* The endpoint answers the same way whether or not the address has an
         account, so there is nothing here to leak. The one real error worth
         distinguishing is the rate limit, which is not "we could not send it". */
      if (result.error?.status === 429) { setError("Too many requests from this connection. Wait a minute and try again."); return; }
      if (result.error) throw new Error(result.error.message);
      setDone(true);
    } catch { setError("The reset email could not be sent. Please try again shortly."); }
    finally { setLoading(false); }
  }

  return <div className="au__formWrap">
    <h1>Reset your password</h1>
    <p className="au__lede">We will send a secure, one-hour reset link to the email on your account.</p>
    {done ? <div className="au__notice" role="status"><b>Check your inbox.</b><span>If that address has an account, a reset link is on its way. It expires in an hour.</span><Link href="/login">Return to login</Link></div> :
      <form onSubmit={submit} className="au__form" method="post">
        <div className="au__field"><label htmlFor={emailId}>Email address</label><input id={emailId} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {error ? <p className="au__error" role="alert">{error}</p> : null}
        <button className="au__submit" type="submit" disabled={loading || !hydrated}>{loading ? "Sending…" : "Email reset link"}</button>
        <Link className="au__textLink" href="/login">Back to login</Link>
      </form>}
  </div>;
}

export function ResetPasswordForm({ token = "", invalid = false }: { token?: string; invalid?: boolean }) {
  const passwordId = useId();
  const confirmId = useId();
  const hydrated = useHydrated();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(invalid ? "This reset link is invalid or has expired." : "");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) return setError("The two passwords do not match.");
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (!token) return setError("This reset link is invalid or has expired.");
    setLoading(true); setError("");
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error?.status === 429) { setError("Too many attempts from this connection. Wait a minute and try again."); return; }
      if (result.error) throw new Error(result.error.message);
      setDone(true);
    } catch { setError("This reset link is invalid or has expired. Request a new one."); }
    finally { setLoading(false); }
  }

  return <div className="au__formWrap">
    <h1>Choose a new password</h1>
    <p className="au__lede">Use at least 10 characters and keep it unique to this account.</p>
    {done ? <div className="au__notice" role="status"><b>Password updated.</b><span>You can now sign in with the new password.</span><Link href="/login">Continue to login</Link></div> :
      <form onSubmit={submit} className="au__form" method="post">
        <div className="au__field"><label htmlFor={passwordId}>New password</label><input id={passwordId} type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="au__field"><label htmlFor={confirmId}>Confirm password</label><input id={confirmId} type="password" autoComplete="new-password" required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        {error ? <p className="au__error" role="alert">{error}</p> : null}
        <button className="au__submit" type="submit" disabled={loading || !hydrated}>{loading ? "Updating…" : "Update password"}</button>
        <Link className="au__textLink" href="/forgot-password">Request a new link</Link>
      </form>}
  </div>;
}
