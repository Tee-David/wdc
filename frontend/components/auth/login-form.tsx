"use client";

import { useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

/**
 * LABELS SIT ABOVE THE FIELDS, they do not float inside them.
 *
 * The floating label looked tidy and broke the moment a password manager or
 * the browser filled the field: the value and the label occupied the same
 * space and the box read as two overlapping strings. A label that never moves
 * cannot do that, survives autofill, zoom and translation, and is the thing a
 * screen reader announces either way.
 */
export default function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const search = useSearchParams();
  /* Passed through to the server, which decides whether it is allowed. This
     component never picks a destination: see lib/roles.ts and /signed-in. */
  const requested = search.get("redirect");
  const next = requested ? `/signed-in?redirect=${encodeURIComponent(requested)}` : "/signed-in";

  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
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
        callbackURL: next,
      });
      if (result.error) {
        /* One message for a wrong password and for an address with no account.
           Two messages would turn this form into a way to find out who has one. */
        setError("That email and password combination was not recognised.");
        return;
      }
      window.location.assign(next);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setLoading(true);
    setError("");
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
      errorCallbackURL: "/login?error=google",
    });
    if (result?.error) {
      setError("Google sign-in could not be started. Please use your password.");
      setLoading(false);
    }
  }

  /* Caps Lock is the single commonest reason a correct password is rejected,
     and the field is masked, so nobody can see why. */
  const watchCaps = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCaps(event.getModifierState?.("CapsLock") ?? false);
  };

  return (
    <div className="au__formWrap">
      <h1>Welcome back</h1>
      <p className="au__lede">
        Sign in to your We Dig Creativity account. We will take you to the right
        place once we know who you are.
      </p>


      <form onSubmit={submit} className="au__form" noValidate>
        <div className="au__field">
          <label htmlFor={emailId}>Email address</label>
          <input
            id={emailId}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="au__field">
          <label htmlFor={passwordId}>Password</label>
          <div className="au__inputWrap">
            <input
              id={passwordId}
              type={show ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              enterKeyHint="go"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyUp={watchCaps}
              onBlur={() => setCaps(false)}
              aria-describedby={caps ? `${passwordId}-caps` : undefined}
            />
            <button
              type="button"
              className="au__reveal"
              onClick={() => setShow((value) => !value)}
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
            >
              {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          {caps ? (
            <p className="au__hint" id={`${passwordId}-caps`}>Caps Lock is on.</p>
          ) : null}
        </div>

        <div className="au__formMeta">
          <label className="au__remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Keep me signed in
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        {error ? <p className="au__error" role="alert">{error}</p> : null}

        <button className="au__submit" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? <><span className="au__spin" aria-hidden="true" />Signing in…</> : "Log in"}
        </button>
      </form>

      {googleEnabled ? <>
        <div className="au__or"><span>or</span></div>
        <button type="button" className="au__google" onClick={googleSignIn} disabled={loading}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>
          Continue with Google
        </button>
              </> : null}

      <p className="au__help">
        Accounts are created by WDC, so there is nothing to sign up for here. If
        you are a client and have not been given one yet, ask your WDC contact
        or <Link href="/contact">send us a message</Link>.
      </p>
    </div>
  );
}
