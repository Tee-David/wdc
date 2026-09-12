"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: "/reset-password" });
      if (result.error) throw new Error(result.error.message);
      setDone(true);
    } catch { setError("The reset email could not be sent. Please try again shortly."); }
    finally { setLoading(false); }
  }

  return <div className="au__formWrap">
    <h1>Reset your password</h1>
    <p className="au__lede">We will send a secure, one-hour reset link to your admin email.</p>
    {done ? <div className="au__notice" role="status"><b>Check your inbox.</b><span>If that address belongs to an admin, a reset link is on its way.</span><Link href="/login">Return to login</Link></div> :
      <form onSubmit={submit} className="au__form">
        <label className="au__field"><input type="email" autoComplete="email" placeholder=" " required value={email} onChange={(e) => setEmail(e.target.value)} /><span>Admin email</span></label>
        {error ? <p className="au__error" role="alert">{error}</p> : null}
        <button className="au__submit" type="submit" disabled={loading}>{loading ? "Sending…" : "Email reset link"}</button>
        <Link className="au__textLink" href="/login">Back to login</Link>
      </form>}
  </div>;
}

export function ResetPasswordForm() {
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(search.get("error") ? "This reset link is invalid or has expired." : "");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) return setError("The two passwords do not match.");
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (!token) return setError("This reset link is invalid or has expired.");
    setLoading(true); setError("");
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.message);
      setDone(true);
    } catch { setError("This reset link is invalid or has expired. Request a new one."); }
    finally { setLoading(false); }
  }

  return <div className="au__formWrap">
    <h1>Choose a new password</h1>
    <p className="au__lede">Use at least 10 characters and keep it unique to this account.</p>
    {done ? <div className="au__notice" role="status"><b>Password updated.</b><span>You can now sign in with the new password.</span><Link href="/login">Continue to login</Link></div> :
      <form onSubmit={submit} className="au__form">
        <label className="au__field"><input type="password" autoComplete="new-password" placeholder=" " required value={password} onChange={(e) => setPassword(e.target.value)} /><span>New password</span></label>
        <label className="au__field"><input type="password" autoComplete="new-password" placeholder=" " required value={confirm} onChange={(e) => setConfirm(e.target.value)} /><span>Confirm password</span></label>
        {error ? <p className="au__error" role="alert">{error}</p> : null}
        <button className="au__submit" type="submit" disabled={loading}>{loading ? "Updating…" : "Update password"}</button>
        <Link className="au__textLink" href="/forgot-password">Request a new link</Link>
      </form>}
  </div>;
}
