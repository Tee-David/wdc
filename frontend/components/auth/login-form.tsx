"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function LoginForm() {
  const search = useSearchParams();
  const requested = search.get("redirect");
  const redirectTo = requested?.startsWith("/admin") ? requested : "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: remember,
        callbackURL: redirectTo,
      });
      if (result.error) {
        setError("That email and password combination was not recognised.");
        return;
      }
      window.location.assign(redirectTo);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="au__formWrap">
      <h1>Welcome back</h1>
      <p className="au__lede">Sign in to the WDC studio admin.</p>

      <form onSubmit={submit} className="au__form">
        <label className="au__field">
          <input
            type="email"
            autoComplete="email"
            placeholder=" "
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <span>Email</span>
        </label>

        <label className="au__field">
          <input
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder=" "
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <span>Password</span>
          <button
            type="button"
            className="au__reveal"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </label>

        <div className="au__formMeta">
          <label className="au__remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember me
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        {error ? <p className="au__error" role="alert">{error}</p> : null}

        <button className="au__submit" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="au__help">
        Need admin access? Contact the account owner. Credentials are never
        recovered or displayed by this page.
      </p>
    </div>
  );
}
