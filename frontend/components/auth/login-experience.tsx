"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { ChevronRight, Fingerprint, KeyRound, Mail } from "lucide-react";
import { useStage } from "@/components/auth/stage/stage-context";
import { useHydrated } from "@/components/auth/use-hydrated";
import { CodeField, EmailChip, EmailField, GoogleMark, InboxButton, PasswordField, PrimaryButton } from "@/components/auth/fields";
import { playSuccess } from "@/components/auth/success";
import { realAdapter, type AuthAdapter, type SignedIn } from "@/lib/auth/adapter";
import { copy, RETURN_ERRORS, RETURN_ERROR_FALLBACK } from "@/lib/auth/copy";
import { demoAdapter } from "@/lib/auth/demo-adapter";
import { clearHint, hintSnapshot, serverHint, subscribeHint, writeHint } from "@/lib/auth/device-memory";
import { firstNameFromEmail, firstWord } from "@/lib/auth/first-name";
import { initialState, isBackFace, reducer, type ErrorKey, type Method, type Step } from "@/lib/auth/machine";
import { isCode, isEmail } from "@/lib/auth/validation";

const CHANNEL = "wdc-auth";
const POLL_MS = 3000;
const LISTEN_FOR_MS = 15 * 60 * 1000;
const PENDING_KEY = "wdc.auth.pending";

type Props = {
  demo: boolean;
  googleEnabled: boolean;
  /** A ?redirect= the middleware carried here, checked later by /signed-in. */
  requested: string;
  /** A Better Auth error code from a sign-in that left the page and came back refused. */
  refused: string;
  initialStep: "identify" | "reset";
  /** The address sign-in mail is sent from, for the "Open Gmail" search. */
  sender: string;
  /** Set when a sign-in that left the page (link, Google) came back successful. */
  completed?: { destination: string; name: string | null } | null;
};

/** Headings, so step changes can be announced and focus has somewhere to land. */
const HEADINGS: Record<Step, string> = {
  identify: copy.identify.heading,
  method: copy.method.heading,
  password: copy.password.heading,
  magicSent: copy.magic.heading,
  passkey: copy.passkey.heading,
  reset: copy.reset.heading,
  resetSent: copy.resetSent.heading,
  success: copy.identify.heading,
};

const errorText = (key: ErrorKey | null) => (key ? copy.errors[key] : null);

const noSubscription = () => () => {};
const hasWebAuthn = () => typeof window.PublicKeyCredential !== "undefined";
const noWebAuthn = () => false;

function Heading({ step }: { step: Step }) {
  return (
    <h1 className="lx__heading" tabIndex={-1} data-heading>
      {HEADINGS[step]}
    </h1>
  );
}

export default function LoginExperience({ demo, googleEnabled, requested, refused, initialStep, sender, completed = null }: Props) {
  const stage = useStage();
  const router = useRouter();
  const hydrated = useHydrated();
  const [adapter] = useState<AuthAdapter & { cancelPasskey?: () => void; openLink?: () => void }>(() =>
    demo ? demoAdapter() : realAdapter({ requested, google: googleEnabled }),
  );
  const [state, dispatch] = useReducer(reducer, initialStep, (step) => initialState(step));
  /* Read through the store, not copied into state by an effect: the server
     answers "nobody" and "no WebAuthn", the browser answers for real. */
  const hint = useSyncExternalStore(subscribeHint, hintSnapshot, serverHint);
  const webauthn = useSyncExternalStore(noSubscription, hasWebAuthn, noWebAuthn);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [live, setLive] = useState("");
  const [returnError, setReturnError] = useState(refused ? RETURN_ERRORS[refused] ?? RETURN_ERROR_FALLBACK : "");
  const [now, setNow] = useState(() => Date.now());
  const [shownFace, setShownFace] = useState<"front" | "back">(isBackFace(initialStep) ? "back" : "front");
  const [flipping, setFlipping] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const resetEmailRef = useRef<HTMLInputElement>(null);
  const finishing = useRef(false);
  const popping = useRef(false);
  const selectEmailNext = useRef(false);
  const pressingSubmit = useRef(false);
  /** How many step entries this page has pushed onto the history stack. */
  const historyIndex = useRef(0);

  const { step, email, status, errorKey } = state;
  const busy = status === "submitting";
  const face = isBackFace(step) ? "back" : "front";
  /* Success keeps showing the step that earned it, under the closing moment. */
  const frontStep = state.lastFront;
  const passkeyOffered = adapter.passkeys && webauthn;
  const lastMethod = hint?.lastMethod ?? null;

  /* --------------------------------------------------------------- setup */

  useEffect(() => {
    /* Step animations only once the page is live: the first paint is the
       server's HTML and should simply be there, not fade in. */
    rootRef.current?.setAttribute("data-live", "true");
    stage.setMood("idle");
  }, [stage]);

  /* A returning visitor: greet them by name, in the language they last saw. */
  useEffect(() => {
    if (hint?.firstName && !completed) stage.restoreGreeting(hint.firstName, hint.greetingLang ?? "English");
  }, [hint, completed, stage]);

  /* ---------------------------------------------------------- success */

  /**
   * LEAVE SO THAT BACK DOES NOT RETURN HERE.
   *
   * Every step pushed a history entry (so Back works between steps), and all
   * of them are /login. Replacing only the last one would leave the others
   * behind the dashboard, and Back would walk into a cached login form. So
   * rewind to the first entry, the one that arrived at /login, and replace
   * THAT with the destination: Back from the dashboard then goes wherever the
   * person was before they came to log in. The curtain is already covering
   * the screen, so the rewind is never seen.
   */
  const leave = useCallback(
    (href: string) => {
      const back = historyIndex.current;
      if (back <= 0) return router.replace(href);
      const arrived = () => {
        window.removeEventListener("popstate", arrived);
        router.replace(href);
      };
      window.addEventListener("popstate", arrived);
      window.history.go(-back);
    },
    [router],
  );

  const succeed = useCallback(
    (result: SignedIn, method: Method) => {
      if (finishing.current) return;
      finishing.current = true;
      dispatch({ type: "SIGNED_IN" });
      setLive(copy.success.sr);
      const greeting = stage.greetingSnapshot();
      writeHint({
        firstName: firstWord(result.name) ?? greeting.name ?? firstNameFromEmail(email),
        greetingLang: greeting.lang ?? stage.currentLang?.lang ?? "English",
        lastMethod: method,
      });
      try {
        window.sessionStorage.removeItem(PENDING_KEY);
      } catch {
        /* Storage blocked. */
      }
      void playSuccess({ stage, destination: result.redirectTo, navigate: leave, demo });
    },
    [stage, leave, demo, email],
  );

  /* A sign-in that left the page came back successful: this is the tab the
     link or Google returned to. Tell any tab still waiting on the inbox
     screen, then play the closing moment here. */
  useEffect(() => {
    if (!completed) return;
    try {
      const channel = new BroadcastChannel(CHANNEL);
      channel.postMessage({ type: "wdc-auth-signed-in" });
      channel.close();
    } catch {
      /* No BroadcastChannel: the other tab's own polling will notice. */
    }
    let method: Method = "magic";
    try {
      if (window.sessionStorage.getItem(PENDING_KEY) === "google") method = "google";
    } catch {
      /* Storage blocked. */
    }
    stage.ringBegin();
    succeed({ ok: true, redirectTo: completed.destination, name: completed.name }, method);
  }, [completed, stage, succeed]);

  /* ------------------------------------------------------- browser Back */

  useEffect(() => {
    window.history.replaceState({ ...(window.history.state ?? {}), authStep: initialStep, authIndex: 0 }, "");
    const onPop = (event: PopStateEvent) => {
      const entry = event.state as { authStep?: Step; authIndex?: number } | null;
      const target = entry?.authStep;
      if (!target || finishing.current) return;
      historyIndex.current = entry?.authIndex ?? 0;
      popping.current = true;
      dispatch({ type: "GO", step: target });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [initialStep]);

  const previousStep = useRef<Step>(initialStep);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    if (step === "success") return;
    if (popping.current) {
      popping.current = false;
    } else {
      /* The URL never changes: an email address does not belong in one. */
      historyIndex.current += 1;
      window.history.pushState({ authStep: step, authIndex: historyIndex.current }, "");
    }
  }, [step]);

  /* -------------------------------------------------- focus and moods */

  /* Compared with the last step rather than skipped on "first run", because
     React runs effects twice in development and a first-run flag is spent
     by the rehearsal, which put focus on the heading at page load. */
  const focusedStep = useRef<Step>(initialStep);
  useEffect(() => {
    if (focusedStep.current === step) return;
    focusedStep.current = step;
    if (step === "success") return;
    const focusHeading = () => {
      const container = isBackFace(step) ? backRef.current : frontRef.current;
      container?.querySelector<HTMLElement>("[data-heading]")?.focus({ preventScroll: true });
    };
    /* Announced and focused together, once the new step is on screen. */
    const id = requestAnimationFrame(() => {
      setLive(HEADINGS[step]);
      if (step === "password") passwordRef.current?.focus({ preventScroll: true });
      else if (step === "identify" && selectEmailNext.current) {
        selectEmailNext.current = false;
        emailRef.current?.focus({ preventScroll: true });
        emailRef.current?.select();
      } else focusHeading();
    });

    if (step === "magicSent") stage.setMood("watching");
    else if (step === "passkey") stage.setMood("attentive");
    else if (step !== "password") stage.setMood("idle");
    return () => cancelAnimationFrame(id);
  }, [step, stage]);

  /* ------------------------------------------------------- card flip */

  useEffect(() => {
    if (face === shownFace) return;
    const flipper = flipRef.current;
    let settle = 0;
    const turn = () => {
      /* Both faces stay mounted for the length of the turn, then the one
         facing away is removed: a hidden copy of the email field is a second
         field to a password manager, whatever `inert` says to a screen reader. */
      setFlipping(true);
      setShownFace(face);
      settle = window.setTimeout(() => setFlipping(false), stage.reduced ? 150 : 650);
    };
    if (!flipper || stage.reduced) {
      const id = requestAnimationFrame(turn);
      return () => {
        cancelAnimationFrame(id);
        window.clearTimeout(settle);
      };
    }
    /* A small wobble first, so the card feels like it has weight. */
    const wobble = flipper.animate(
      [{ transform: `rotateY(${shownFace === "back" ? 180 : 0}deg) rotate(0deg)` }, { transform: `rotateY(${shownFace === "back" ? 180 : 0}deg) rotate(-2deg)` }, { transform: `rotateY(${shownFace === "back" ? 180 : 0}deg) rotate(2deg)` }, { transform: `rotateY(${shownFace === "back" ? 180 : 0}deg) rotate(0deg)` }],
      { duration: 240, easing: "ease-in-out" },
    );
    let cancelled = false;
    wobble.finished.then(() => !cancelled && turn(), () => undefined);
    return () => {
      cancelled = true;
      wobble.cancel();
      window.clearTimeout(settle);
    };
  }, [face, shownFace, stage]);

  /* The card is as tall as the face showing, and the change of height is
     the only layout the form ever animates. */
  useLayoutEffect(() => {
    const flipper = flipRef.current;
    const target = shownFace === "back" ? backRef.current : frontRef.current;
    if (!flipper || !target) return;
    const apply = () => {
      flipper.style.height = `${target.offsetHeight}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(target);
    return () => ro.disconnect();
  }, [shownFace]);

  /* --------------------------------------------------------- helpers */

  const shakeCard = useCallback(() => {
    if (stage.reduced) return;
    rootRef.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }],
      { duration: 420, easing: "ease-out" },
    );
  }, [stage]);

  const personalise = useCallback(
    (value: string) => {
      if (hint?.firstName) return;
      stage.personalise(isEmail(value) ? firstNameFromEmail(value) : null);
    },
    [hint, stage],
  );

  /**
   * A BLUR CAUSED BY PRESSING SUBMIT DOES NOT VALIDATE. Otherwise the error
   * line appears between mouse-down and mouse-up, the button moves under the
   * pointer, the click lands on nothing, and focus never comes back to the
   * field that needs fixing. The submit handler validates anyway.
   */
  const notePress = (event: React.PointerEvent) => {
    if (!(event.target as Element).closest?.('button[type="submit"]')) return;
    pressingSubmit.current = true;
    const release = () => window.setTimeout(() => (pressingSubmit.current = false), 0);
    window.addEventListener("pointerup", release, { once: true });
    window.addEventListener("pointercancel", release, { once: true });
  };
  const blurValidates = () => !pressingSubmit.current;

  const forgetMe = () => {
    clearHint();
    stage.forgetGreeting();
    emailRef.current?.focus();
  };

  /* ---------------------------------------------------------- identify */

  const submitIdentify = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isEmail(email)) {
      dispatch({ type: "SET_ERROR", errorKey: "emailInvalid" });
      emailRef.current?.focus();
      return;
    }
    setReturnError("");
    personalise(email);
    dispatch({ type: "IDENTIFY_SUBMIT" });
  };

  /* ------------------------------------------------------------ magic */

  const sendMagic = async (resend = false) => {
    if (busy) return;
    dispatch({ type: "REQUEST_START" });
    setLive(copy.status.sending);
    stage.setMood("attentive");
    stage.ringBegin();
    const result = await adapter.sendMagicLink(email);
    if (result.ok) {
      await stage.ringEnd(true);
      dispatch({ type: "MAGIC_SENT", requestId: result.requestId, resend });
      setLive(resend ? copy.magic.resent : copy.status.sent);
      void stage.nod();
      window.setTimeout(() => stage.ringHide(), 900);
    } else {
      await stage.ringEnd(false);
      dispatch({ type: "REQUEST_FAILED", errorKey: result.reason === "rate_limited" ? "rateLimited" : "network" });
      if (result.reason === "network") void stage.confused();
    }
  };

  const check = useCallback(async () => {
    if (finishing.current || !state.requestId) return;
    const result = await adapter.checkMagicStatus(state.requestId);
    if (result.ok && !finishing.current) {
      stage.ringBegin();
      succeed(result, "magic");
    }
  }, [adapter, state.requestId, stage, succeed]);

  /* Waiting for the link: another tab says so, or polling notices the session. */
  useEffect(() => {
    if (step !== "magicSent") return;
    const started = Date.now();
    let timer = 0;
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (event) => {
        /* Only a nudge. The session is confirmed with the server before
           anything happens, so a forged message can do nothing. */
        if ((event.data as { type?: string })?.type === "wdc-auth-signed-in") void check();
      };
    } catch {
      /* Polling alone, then. */
    }
    const poll = () => {
      window.clearTimeout(timer);
      if (document.hidden || Date.now() - started > LISTEN_FOR_MS) return;
      timer = window.setTimeout(async () => {
        await check();
        poll();
      }, POLL_MS);
    };
    const onVisibility = () => (document.hidden ? window.clearTimeout(timer) : (void check(), poll()));
    poll();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      channel?.close();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [step, check]);

  /* The resend countdown. */
  useEffect(() => {
    if (step !== "magicSent") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);
  const resendIn = state.resendAvailableAt ? Math.max(0, Math.ceil((state.resendAvailableAt - now) / 1000)) : 0;

  const submitCode = async (value = code) => {
    if (busy || finishing.current) return;
    if (!isCode(value)) {
      dispatch({ type: "SET_ERROR", errorKey: "codeIncomplete" });
      codeRef.current?.focus();
      return;
    }
    dispatch({ type: "REQUEST_START" });
    setLive(copy.status.checking);
    stage.setMood("attentive");
    stage.ringBegin();
    const result = await adapter.verifyCode(email, value, state.requestId ?? "");
    if (result.ok) return succeed(result, "magic");
    const errorKey: ErrorKey = result.reason === "expired" ? "expired" : result.reason === "rate_limited" ? "rateLimited" : result.reason === "network" ? "network" : "badCode";
    if (errorKey === "badCode") {
      await Promise.all([stage.ringEnd(false), stage.shakeHead(), shakeCard()]);
    } else {
      await stage.ringEnd(false);
      if (errorKey === "network") void stage.confused();
    }
    dispatch({ type: "REQUEST_FAILED", errorKey });
    setCode("");
    stage.setMood("watching");
    codeRef.current?.focus();
  };

  /* --------------------------------------------------------- password */

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || finishing.current) return;
    if (!password) {
      dispatch({ type: "SET_ERROR", errorKey: "passwordEmpty" });
      passwordRef.current?.focus();
      return;
    }
    dispatch({ type: "REQUEST_START" });
    setLive(copy.status.checking);
    /* It turns back round to hear the answer. */
    stage.setMood("attentive");
    stage.ringBegin();
    const result = await adapter.signInWithPassword(email, password);
    if (result.ok) return succeed(result, "password");

    if (result.reason === "invalid") {
      await Promise.all([stage.ringEnd(false), stage.shakeHead(), shakeCard()]);
      dispatch({ type: "REQUEST_FAILED", errorKey: "invalidCredentials", countsAsPasswordFailure: true });
    } else if (result.reason === "rate_limited") {
      await stage.ringEnd(false);
      dispatch({ type: "REQUEST_FAILED", errorKey: "rateLimited" });
    } else {
      /* Not their fault, so no head shake: a puzzled tilt instead. */
      await stage.ringEnd(false);
      void stage.confused();
      dispatch({ type: "REQUEST_FAILED", errorKey: "network" });
    }
    const node = passwordRef.current;
    node?.focus();
    node?.select();
  };

  /* ---------------------------------------------------------- passkey */

  /* From the first screen there may be no address yet, which is fine: a
     passkey knows who it belongs to. */
  const startPasskey = async () => {
    dispatch({ type: "CHOOSE_METHOD", method: "passkey" });
    dispatch({ type: "REQUEST_START" });
    stage.setMood("attentive");
    stage.ringIndeterminate();
    const result = await adapter.passkeySignIn();
    if (result.ok) return succeed(result, "passkey");
    stage.ringHide();
    dispatch({ type: "REQUEST_FAILED", errorKey: "passkeyCancelled" });
  };

  /* ----------------------------------------------------------- google */

  const startGoogle = async () => {
    if (busy) return;
    setReturnError("");
    dispatch({ type: "REQUEST_START" });
    stage.setMood("attentive");
    stage.ringIndeterminate();
    try {
      window.sessionStorage.setItem(PENDING_KEY, "google");
    } catch {
      /* Storage blocked: the closing moment just will not know it was Google. */
    }
    const result = await adapter.signInWithGoogle();
    if (demo && !result) return succeed({ ok: true, redirectTo: "/login?demo=done", name: null }, "google");
    if (result && !result.ok) {
      stage.ringHide();
      dispatch({ type: "SET_ERROR", errorKey: null });
      setReturnError(result.reason === "rate_limited" ? copy.errors.rateLimited : "Google sign-in could not be started. Please use your email.");
    }
    /* Otherwise the browser is already on its way to Google. */
  };

  /* ------------------------------------------------------------ reset */

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isEmail(email)) {
      dispatch({ type: "SET_ERROR", errorKey: "emailInvalid" });
      resetEmailRef.current?.focus();
      return;
    }
    dispatch({ type: "REQUEST_START" });
    setLive(copy.status.sending);
    stage.setMood("attentive");
    stage.ringBegin();
    const result = await adapter.requestPasswordReset(email);
    if (result.ok) {
      await stage.ringEnd(true);
      dispatch({ type: "RESET_SENT" });
      setLive(copy.status.resetSent);
      void stage.nod();
      window.setTimeout(() => stage.ringHide(), 900);
    } else {
      await stage.ringEnd(false);
      if (result.reason === "network") void stage.confused();
      dispatch({ type: "REQUEST_FAILED", errorKey: result.reason === "rate_limited" ? "rateLimited" : "network" });
    }
  };

  /* ------------------------------------------------------------ views */

  const methods = useMemo(() => {
    const list: Array<{ id: "magic" | "password" | "passkey"; icon: React.ReactNode; title: string; desc: string }> = [
      { id: "magic", icon: <Mail aria-hidden="true" />, ...copy.method.magic },
      { id: "password", icon: <KeyRound aria-hidden="true" />, ...copy.method.password },
    ];
    if (passkeyOffered) list.push({ id: "passkey", icon: <Fingerprint aria-hidden="true" />, ...copy.method.passkey });
    const last = list.findIndex((m) => m.id === lastMethod);
    if (last > 0) list.unshift(...list.splice(last, 1));
    return list;
  }, [passkeyOffered, lastMethod]);

  const onMethodKeys = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : event.key === "ArrowDown" ? (at + 1) % buttons.length : (at - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
    event.preventDefault();
  };

  const changeEmail = () => {
    selectEmailNext.current = true;
    setPassword("");
    setCode("");
    dispatch({ type: "CHANGE_EMAIL" });
  };

  const blockError = (keys: ErrorKey[]) =>
    errorKey && keys.includes(errorKey) ? (
      <p className="au__error" role="alert">
        {errorText(errorKey)}
      </p>
    ) : null;

  const socialRow =
    passkeyOffered || adapter.google ? (
      <>
        <div className="lx__or">
          <span>{copy.common.or}</span>
        </div>
        <div className="lx__social">
          {passkeyOffered ? (
            <button type="button" className="au-btn au-btn--secondary" onClick={() => void startPasskey()} disabled={!hydrated} aria-disabled={busy || undefined}>
              <Fingerprint aria-hidden="true" />
              {copy.common.passkeyButton}
            </button>
          ) : null}
          {adapter.google ? (
            <button type="button" className="au-btn au-btn--secondary" onClick={() => void startGoogle()} disabled={!hydrated} aria-disabled={busy || undefined}>
              <GoogleMark />
              {copy.common.googleButton}
            </button>
          ) : null}
        </div>
      </>
    ) : null;

  function renderFront(current: Step) {
    switch (current) {
      case "identify":
      case "success":
        return (
          <>
            <Heading step="identify" />
            <p className="lx__sub">
              {hint?.firstName ? (
                <>
                  {copy.identify.subRemembered(hint.firstName)}{" "}
                  <button type="button" className="au-link" onClick={forgetMe}>
                    {copy.identify.notYou(hint.firstName)}
                  </button>
                </>
              ) : (
                copy.identify.sub
              )}
            </p>
            {returnError ? (
              <p className="au__error" role="alert">
                {returnError}
              </p>
            ) : null}
            {/* `method="post"` although this handler never lets the browser
                submit: before hydration there IS no handler, and a form with
                no method GETs its fields into the URL. See use-hydrated.ts. */}
            <form className="au__form lx__form" method="post" noValidate onSubmit={submitIdentify} onPointerDownCapture={notePress}>
              <EmailField
                ref={emailRef}
                value={email}
                onChange={(value) => dispatch({ type: "EMAIL_CHANGED", email: value })}
                onBlur={(value) => {
                  if (value && !isEmail(value)) {
                    if (blurValidates()) dispatch({ type: "SET_ERROR", errorKey: "emailInvalid" });
                  } else personalise(value);
                }}
                error={errorKey === "emailInvalid" ? copy.errors.emailInvalid : null}
                autoComplete={passkeyOffered ? "username webauthn" : "username"}
                autoFocus={false}
              />
              <PrimaryButton awake={isEmail(email)} hydrated={hydrated} busy={busy}>
                {copy.identify.continue}
              </PrimaryButton>
            </form>
            {socialRow}
          </>
        );

      case "method":
        return (
          <>
            <EmailChip email={email} onChange={changeEmail} />
            <Heading step="method" />
            <ul className="lx__methods" onKeyDown={onMethodKeys}>
              {methods.map((method) => (
                <li key={method.id}>
                  <button
                    type="button"
                    className="lx__method"
                    aria-disabled={busy || undefined}
                    disabled={!hydrated}
                    onClick={() => {
                      if (busy) return;
                      if (method.id === "magic") void sendMagic();
                      else if (method.id === "password") dispatch({ type: "CHOOSE_METHOD", method: "password" });
                      else void startPasskey();
                    }}
                  >
                    <span className="lx__methodIcon">{method.icon}</span>
                    <span className="lx__methodText">
                      <span className="lx__methodTitle">
                        {method.title}
                        {method.id === lastMethod ? <span className="lx__badge">{copy.method.lastUsed}</span> : null}
                      </span>
                      <span className="lx__methodDesc">{method.desc}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="lx__methodGo" />
                  </button>
                </li>
              ))}
            </ul>
            {blockError(["rateLimited", "network"])}
          </>
        );

      case "password": {
        const suggest = state.failedPasswordAttempts >= 3 || errorKey === "rateLimited";
        return (
          <>
            <EmailChip email={email} onChange={changeEmail} />
            <Heading step="password" />
            <form className="au__form lx__form" method="post" noValidate onSubmit={submitPassword}>
              {/* The address, invisibly, in the same form, so a password
                  manager saves the pair rather than a password for nobody. */}
              <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
              <PasswordField
                ref={passwordRef}
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (errorKey === "passwordEmpty") dispatch({ type: "SET_ERROR", errorKey: null });
                }}
                error={errorKey && ["passwordEmpty", "invalidCredentials", "rateLimited", "network"].includes(errorKey) ? errorText(errorKey) : null}
                onCaps={(on) => on && setLive(copy.password.capsLock)}
              />
              <PrimaryButton awake={password.length > 0} hydrated={hydrated} busy={busy}>
                {copy.password.submit}
              </PrimaryButton>
            </form>
            <button type="button" className="au-link lx__forgot" onClick={() => dispatch({ type: "FORGOT_PASSWORD" })}>
              {copy.password.forgot}
            </button>
            {suggest ? (
              <div className="lx__suggest">
                <p>{copy.password.suggestMagic}</p>
                <button type="button" className="au-btn au-btn--secondary" onClick={() => void sendMagic()} disabled={!hydrated}>
                  <Mail aria-hidden="true" />
                  {copy.password.suggestMagicButton}
                </button>
              </div>
            ) : null}
          </>
        );
      }

      case "magicSent":
        return (
          <>
            <Heading step="magicSent" />
            <p className="lx__sub">
              If <strong className="lx__email">{email}</strong> has a WDC account, a sign-in link is on its way. It works for 15 minutes.
            </p>
            <div className="lx__inbox">
              <InboxButton email={email} sender={sender} />
            </div>
            <form
              className="lx__form"
              noValidate
              method="post"
              onSubmit={(event) => {
                event.preventDefault();
                void submitCode();
              }}
            >
              <CodeField
                ref={codeRef}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (errorKey) dispatch({ type: "SET_ERROR", errorKey: null });
                }}
                onComplete={(value) => void submitCode(value)}
                error={errorKey && ["badCode", "codeIncomplete", "expired", "rateLimited", "network"].includes(errorKey) ? errorText(errorKey) : null}
                label={copy.magic.codeLabel}
                disabled={busy}
              />
            </form>
            <div className="lx__row">
              <button type="button" className="au-link" onClick={() => void sendMagic(true)} disabled={resendIn > 0 || busy} aria-live="off">
                {resendIn > 0 ? copy.magic.resendIn(resendIn) : copy.magic.resend}
              </button>
              <button type="button" className="au-link" onClick={() => dispatch({ type: "GO", step: "method" })}>
                {copy.magic.otherWay}
              </button>
            </div>
            {state.notice === "resent" ? <p className="lx__note">{copy.magic.resent}</p> : null}
            {demo ? (
              <button type="button" className="au-btn au-btn--secondary lx__demo" onClick={() => { adapter.openLink?.(); void check(); }}>
                {copy.magic.demoSimulate}
              </button>
            ) : null}
          </>
        );

      case "passkey":
        return (
          <>
            {email ? <EmailChip email={email} onChange={changeEmail} /> : null}
            <Heading step="passkey" />
            <p className="lx__sub">{copy.passkey.body}</p>
            {errorKey === "passkeyCancelled" ? (
              <>
                <p className="au__error" role="alert">
                  {copy.errors.passkeyCancelled}
                </p>
                <div className="lx__stack">
                  <button type="button" className="au-btn au-btn--primary" data-awake="true" onClick={() => void startPasskey()}>
                    {copy.passkey.retry}
                  </button>
                  <button type="button" className="au-btn au-btn--secondary" onClick={() => dispatch({ type: "GO", step: email ? "method" : "identify" })}>
                    {copy.passkey.otherWay}
                  </button>
                </div>
              </>
            ) : demo && busy ? (
              <button type="button" className="au-btn au-btn--secondary lx__demo" onClick={() => adapter.cancelPasskey?.()}>
                {copy.passkey.demoCancel}
              </button>
            ) : null}
          </>
        );

      default:
        return null;
    }
  }

  function renderBack() {
    if (step === "resetSent") {
      return (
        <>
          <Heading step="resetSent" />
          <p className="lx__sub">
            If <strong className="lx__email">{email}</strong> has a WDC account, a reset link is on its way. It works for one hour.
          </p>
          <div className="lx__inbox">
            <InboxButton email={email} sender={sender} />
          </div>
          <button type="button" className="au-link lx__back" onClick={() => dispatch({ type: "BACK_TO_LOGIN" })}>
            {copy.reset.back}
          </button>
        </>
      );
    }
    return (
      <>
        <Heading step="reset" />
        <p className="lx__sub">{copy.reset.body}</p>
        <form className="au__form lx__form" method="post" noValidate onSubmit={submitReset} onPointerDownCapture={notePress}>
          <EmailField
            ref={resetEmailRef}
            value={email}
            onChange={(value) => dispatch({ type: "EMAIL_CHANGED", email: value })}
            onBlur={(value) => {
              if (value && !isEmail(value) && blurValidates()) dispatch({ type: "SET_ERROR", errorKey: "emailInvalid" });
            }}
            error={errorKey === "emailInvalid" ? copy.errors.emailInvalid : null}
            enterKeyHint="send"
          />
          <PrimaryButton awake={isEmail(email)} hydrated={hydrated} busy={busy}>
            {copy.reset.submit}
          </PrimaryButton>
        </form>
        {blockError(["rateLimited", "network"])}
        <button type="button" className="au-link lx__back" onClick={() => dispatch({ type: "BACK_TO_LOGIN" })}>
          {copy.reset.back}
        </button>
      </>
    );
  }

  return (
    <div className="lx" ref={rootRef}>
      <div className="lx__flip" ref={flipRef} data-face={shownFace}>
        <div className="lx__face lx__face--front" ref={frontRef} inert={shownFace !== "front" || undefined}>
          {face === "front" || shownFace === "front" || flipping ? (
            <div className="lx__step" key={frontStep} data-dir={state.direction}>
              {renderFront(frontStep)}
            </div>
          ) : null}
        </div>
        <div className="lx__face lx__face--back" ref={backRef} inert={shownFace !== "back" || undefined}>
          {face === "back" || shownFace === "back" || flipping ? (
            <div className="lx__step" key={step === "resetSent" ? "resetSent" : "reset"} data-dir={state.direction}>
              {renderBack()}
            </div>
          ) : null}
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {live}
      </p>
    </div>
  );
}
