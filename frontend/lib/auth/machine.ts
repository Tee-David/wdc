/**
 * THE LOGIN FLOW AS A REDUCER.
 *
 * Every step change is an explicit event, so no component moves the flow by
 * setting a step directly, and browser Back can replay any step through the
 * same door as a click.
 *
 *   identify -> method -> password | magicSent | passkey
 *   password -> reset -> resetSent      (the card flips)
 *   any sign-in -> success
 */

export type Step = "identify" | "method" | "password" | "magicSent" | "passkey" | "reset" | "resetSent" | "success";
export type Method = "magic" | "password" | "passkey" | "google";
export type ErrorKey =
  | "emailInvalid"
  | "passwordEmpty"
  | "invalidCredentials"
  | "rateLimited"
  | "network"
  | "badCode"
  | "codeIncomplete"
  | "expired"
  | "passkeyCancelled";

export interface AuthState {
  step: Step;
  email: string;
  status: "idle" | "submitting" | "error";
  errorKey: ErrorKey | null;
  failedPasswordAttempts: number;
  lastMethod: Method | null;
  resendAvailableAt: number | null;
  requestId: string | null;
  /** 1 forward, -1 back: which way the steps slide. */
  direction: 1 | -1;
  /** A one-off message for the live region, e.g. "Sent again". */
  notice: string | null;
  /** The front of the card while the back is showing, and under the closing moment. */
  lastFront: Step;
}

export type AuthEvent =
  | { type: "EMAIL_CHANGED"; email: string }
  | { type: "IDENTIFY_SUBMIT" }
  | { type: "CHANGE_EMAIL" }
  | { type: "CHOOSE_METHOD"; method: "password" | "passkey" }
  | { type: "REQUEST_START" }
  | { type: "REQUEST_FAILED"; errorKey: ErrorKey; countsAsPasswordFailure?: boolean }
  | { type: "MAGIC_SENT"; requestId: string; resend?: boolean }
  | { type: "RESET_SENT" }
  | { type: "FORGOT_PASSWORD" }
  | { type: "BACK_TO_LOGIN" }
  | { type: "SET_ERROR"; errorKey: ErrorKey | null }
  | { type: "GO"; step: Step }
  | { type: "SIGNED_IN" };

export const RESEND_COOLDOWN_MS = 30_000;

/** Reading order, so a jump backwards slides the other way. */
const ORDER: Step[] = ["identify", "method", "password", "passkey", "magicSent", "reset", "resetSent", "success"];
const dir = (from: Step, to: Step): 1 | -1 => (ORDER.indexOf(to) >= ORDER.indexOf(from) ? 1 : -1);

/** Steps shown on the back of the card. */
export const isBackFace = (step: Step) => step === "reset" || step === "resetSent";

const go = (state: AuthState, step: Step, extra: Partial<AuthState> = {}): AuthState => ({
  ...state,
  step,
  status: "idle",
  errorKey: null,
  notice: null,
  direction: dir(state.step, step),
  lastFront: isBackFace(step) || step === "success" ? state.lastFront : step,
  ...extra,
});

export function initialState(step: Step = "identify", lastMethod: Method | null = null): AuthState {
  return {
    step,
    email: "",
    status: "idle",
    errorKey: null,
    failedPasswordAttempts: 0,
    lastMethod,
    resendAvailableAt: null,
    requestId: null,
    direction: 1,
    notice: null,
    lastFront: isBackFace(step) ? "identify" : step,
  };
}

export function reducer(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case "EMAIL_CHANGED":
      /* A new address is a new person: forget the old one's failures. */
      return {
        ...state,
        email: event.email,
        errorKey: state.errorKey === "emailInvalid" ? null : state.errorKey,
        failedPasswordAttempts: event.email === state.email ? state.failedPasswordAttempts : 0,
      };
    case "IDENTIFY_SUBMIT":
      return go(state, "method");
    case "CHANGE_EMAIL":
      return go(state, "identify");
    case "CHOOSE_METHOD":
      return go(state, event.method);
    case "REQUEST_START":
      return { ...state, status: "submitting", errorKey: null, notice: null };
    case "REQUEST_FAILED":
      return {
        ...state,
        status: "error",
        errorKey: event.errorKey,
        failedPasswordAttempts: state.failedPasswordAttempts + (event.countsAsPasswordFailure ? 1 : 0),
      };
    case "MAGIC_SENT": {
      const resendAvailableAt = Date.now() + RESEND_COOLDOWN_MS;
      if (event.resend) return { ...state, status: "idle", errorKey: null, requestId: event.requestId, resendAvailableAt, notice: "resent" };
      return go(state, "magicSent", { requestId: event.requestId, resendAvailableAt });
    }
    case "RESET_SENT":
      return go(state, "resetSent");
    case "FORGOT_PASSWORD":
      return go(state, "reset");
    case "BACK_TO_LOGIN":
      return go(state, state.email ? "password" : "identify", { direction: -1 });
    case "SET_ERROR":
      return { ...state, errorKey: event.errorKey, status: event.errorKey ? "error" : "idle" };
    case "GO": {
      /* Browser Back and Forward. A step that needs something it no longer
         has (a sent link with no address) falls back to the nearest one that
         makes sense, rather than rendering half a screen. */
      let step = event.step;
      if (step === "success") step = "identify";
      if (!state.email && step !== "identify" && step !== "reset") step = "identify";
      if (step === "magicSent" && !state.requestId) step = "method";
      if (step === "resetSent") step = "reset";
      return step === state.step ? state : go(state, step);
    }
    case "SIGNED_IN":
      return go(state, "success");
  }
}
