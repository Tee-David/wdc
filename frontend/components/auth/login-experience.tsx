"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { Fingerprint, KeyRound, Mail } from "lucide-react";
import { useStage } from "@/components/auth/stage/stage-context";
import { useHydrated } from "@/components/auth/use-hydrated";
import { CodeField, type CodePhase, EmailChip, EmailField, GoogleMark, InboxButton, PasswordField, PrimaryButton } from "@/components/auth/fields";
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
/** From a right code to the tick finished: the fold, the heading, the outline, the check. */
const CODE_VERIFIED_MS = 1700;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

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

type Tab = "magic" | "password" | "passkey";

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
  const [codePhase, setCodePhase] = useState<CodePhase>("entry");
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
  /** Where focus goes after a tab changes the step: stay on the tab (keyboard), or into the field (a tap on Password). */
  const tabFocus = useRef<"tab" | "field" | null>(null);
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
    /** `hold`: something on the card still finishing, which the curtain waits for. */
    (result: SignedIn, method: Method, hold?: Promise<void>) => {
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
      /* The dashboard's code starts downloading now, under the orb's flood
         and the circle, so it is ready by the time the circle has covered. */
      if (!demo) {
        try {
          router.prefetch(result.redirectTo);
        } catch {
          /* A prefetch is a head start, never a requirement. */
        }
      }
      void playSuccess({ stage, destination: result.redirectTo, navigate: leave, demo, hold });
    },
    [stage, leave, demo, email, router],
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
    const fromTab = tabFocus.current;
    tabFocus.current = null;
    const id = requestAnimationFrame(() => {
      setLive(HEADINGS[step]);
      /* Switching tabs from the keyboard keeps focus on the tabs, so the
         arrows keep working; a tap on Password goes straight to the field. */
      if (fromTab === "tab") return;
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
    /* The way in that worked last time opens first. Password is a step of
       its own, so its tab is opened by going there. */
    if (lastMethod === "password") dispatch({ type: "CHOOSE_METHOD", method: "password" });
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
    setCodePhase("checking");
    setLive(copy.status.checking);
    stage.setMood("attentive");
    stage.ringBegin();
    const result = await adapter.verifyCode(email, value, state.requestId ?? "");
    if (result.ok) {
      /* The code folds into its tick while the orb lights up; the curtain
         waits until the tick has been drawn. */
      setCodePhase("verified");
      return succeed(result, "magic", sleep(stage.reduced ? 500 : CODE_VERIFIED_MS));
    }
    const errorKey: ErrorKey = result.reason === "expired" ? "expired" : result.reason === "rate_limited" ? "rateLimited" : result.reason === "network" ? "network" : "badCode";
    if (errorKey === "badCode") {
      /* The orb shakes its head and the boxes shake theirs, together. */
      setCodePhase("refused");
      await Promise.all([stage.ringEnd(false), stage.shakeHead(), sleep(stage.reduced ? 0 : 460)]);
    } else {
      setCodePhase("entry");
      await stage.ringEnd(false);
      if (errorKey === "network") void stage.confused();
    }
    dispatch({ type: "REQUEST_FAILED", errorKey });
    setCode("");
    setCodePhase("entry");
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

  /* A FIXED ORDER. Tabs that reorder themselves by last use move under the
     thumb; last use chooses which one opens instead. */
  const methods = useMemo(() => {
    const list: Array<{ id: Tab; icon: React.ReactNode; tab: string }> = [
      { id: "magic", icon: <Mail aria-hidden="true" />, tab: copy.method.magic.tab },
      { id: "password", icon: <KeyRound aria-hidden="true" />, tab: copy.method.password.tab },
    ];
    if (passkeyOffered) list.push({ id: "passkey", icon: <Fingerprint aria-hidden="true" />, tab: copy.method.passkey.tab });
    return list;
  }, [passkeyOffered]);

  /* Password is a step of its own (Back, focus, the reducer's failure count),
     so its tab IS the step; the other two are views of the method step. */
  const [pickedTab, setPickedTab] = useState<Tab | null>(null);
  const fallbackTab: Tab = lastMethod === "passkey" && passkeyOffered ? "passkey" : lastMethod === "password" ? "password" : "magic";
  /* `frontStep`, not `step`: under the closing moment the step is "success"
     while the password screen stays on show, and the tab must not jump. */
  const shownTab = frontStep === "password" ? "password" : pickedTab && pickedTab !== "password" ? pickedTab : fallbackTab === "password" ? "magic" : fallbackTab;
  const activeTab: Tab = methods.some((m) => m.id === shownTab) ? shownTab : "magic";

  const chooseTab = (id: Tab, pointer: boolean) => {
    if (busy) return;
    setPickedTab(id);
    /* Set only when the step changes, or it would be spent on a later one. */
    if (id === "password") {
      if (step === "password") return;
      tabFocus.current = pointer ? "field" : "tab";
      dispatch({ type: "CHOOSE_METHOD", method: "password" });
    } else if (step === "password") {
      tabFocus.current = "tab";
      dispatch({ type: "GO", step: "method" });
    }
  };

  const onTabKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const at = methods.findIndex((m) => m.id === activeTab);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = (event.key === "ArrowRight") !== rtl;
    const next = event.key === "Home" ? 0 : event.key === "End" ? methods.length - 1 : forward ? (at + 1) % methods.length : (at - 1 + methods.length) % methods.length;
    event.preventDefault();
    chooseTab(methods[next].id, false);
    event.currentTarget.querySelector<HTMLButtonElement>(`#lx-tab-${methods[next].id}`)?.focus();
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

  function passwordPanel() {
    const suggest = state.failedPasswordAttempts >= 3 || errorKey === "rateLimited";
    return (
      <>
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
            aside={
              <button type="button" className="au-link lx__forgot" onClick={() => dispatch({ type: "FORGOT_PASSWORD" })}>
                {copy.password.forgot}
              </button>
            }
          />
          <PrimaryButton awake={password.length > 0} hydrated={hydrated} busy={busy}>
            {copy.password.submit}
          </PrimaryButton>
        </form>
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
      case "password":
        return (
          <>
            <EmailChip email={email} onChange={changeEmail} />
            <Heading step="method" />
            {/* ICONS UNTIL CHOSEN. Three labelled tabs did not fit a phone:
                "Password" was cut to "Passwo..." and lost its icon. The
                chosen tab opens to icon and label; the others close to an
                icon. The label stays in the DOM, only its width animates, so
                every tab keeps its accessible name. */}
            <div className="lx__tabs" role="tablist" aria-label={copy.method.heading} onKeyDown={onTabKeys}>
              {methods.map((method) => {
                const selected = method.id === activeTab;
                return (
                  <button
                    key={method.id}
                    type="button"
                    role="tab"
                    id={`lx-tab-${method.id}`}
                    aria-selected={selected}
                    aria-controls="lx-tabpanel"
                    tabIndex={selected ? 0 : -1}
                    className="lx__tab"
                    disabled={!hydrated}
                    onClick={(event) => chooseTab(method.id, event.detail > 0)}
                  >
                    {method.icon}
                    <span className="lx__tabLabel">
                      <span>{method.tab}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="lx__panel" role="tabpanel" id="lx-tabpanel" key={activeTab}>
              {activeTab === "password" ? passwordPanel() : activeTab === "passkey" ? (
                <>
                  <p className="lx__sub">
                    {copy.method.passkey.desc}
                    {lastMethod === "passkey" ? <span className="lx__badge">{copy.method.lastUsed}</span> : null}
                  </p>
                  <div className="lx__stack">
                    <button type="button" className="au-btn au-btn--primary" data-awake="true" onClick={() => void startPasskey()} disabled={!hydrated} aria-disabled={busy || undefined}>
                      <Fingerprint aria-hidden="true" />
                      {copy.method.passkey.title}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="lx__sub">
                    {copy.method.magic.desc}
                    {lastMethod === "magic" ? <span className="lx__badge">{copy.method.lastUsed}</span> : null}
                  </p>
                  <div className="lx__stack">
                    <button type="button" className="au-btn au-btn--primary" data-awake="true" onClick={() => void sendMagic()} disabled={!hydrated} aria-disabled={busy || undefined}>
                      <Mail aria-hidden="true" />
                      {copy.method.magic.title}
                    </button>
                  </div>
                  {blockError(["rateLimited", "network"])}
                </>
              )}
            </div>
          </>
        );

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
                disabled={busy || codePhase === "verified"}
                phase={codePhase}
              />
            </form>
            {codePhase === "verified" ? (
              /* Said to a screen reader by the live region already. */
              <div className="lx__verified" aria-hidden="true">
                <p className="lx__heading lx__verifiedTitle">{copy.magic.verifiedHeading}</p>
                <p className="lx__sub lx__verifiedSub">{copy.magic.verifiedSub}</p>
              </div>
            ) : null}
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
          {/* Method and password are one screen with tabs: the same key, so a
              tab change neither remounts the tabs (and drops focus) nor
              slides the whole card in again. */}
          {face === "front" || shownFace === "front" || flipping ? (
            <div className="lx__step" key={frontStep === "password" ? "method" : frontStep} data-dir={state.direction} data-code={frontStep === "magicSent" && codePhase === "verified" ? "verified" : undefined}>
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
