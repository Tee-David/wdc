/**
 * EVERY SENTENCE ON THE LOGIN PAGE, in one place.
 *
 * UK spelling, to match the site. No dashes. And one rule that is not about
 * style: nothing here may differ depending on whether an address has an
 * account. The method step, both "check your inbox" screens and the password
 * error are the same sentence for everybody, which is what stops this page
 * being a way to find out who works with us.
 */
export const copy = {
  identify: {
    heading: "Log in to WDC",
    sub: "Use your email to continue.",
    subRemembered: (name: string) => `Good to see you again, ${name}.`,
    notYou: (name: string) => `Not ${name}?`,
    emailLabel: "Email",
    emailPlaceholder: "you@company.com",
    continue: "Continue",
  },
  common: {
    or: "or",
    passkeyButton: "Sign in with a passkey",
    googleButton: "Continue with Google",
    backToSite: "Back to site",
    change: "Change",
    demo: "Demo mode",
    newHere: "New to WDC?",
    talkToUs: "Talk to us",
  },
  method: {
    heading: "How would you like to log in?",
    magic: { title: "Email me a sign-in link", desc: "No password needed. We'll also include a code." },
    password: { title: "Use my password", desc: "Type the password for this account." },
    passkey: { title: "Use a passkey", desc: "Your fingerprint, face or screen lock." },
    lastUsed: "Last used",
  },
  password: {
    heading: "Enter your password",
    label: "Password",
    show: "Show password",
    hide: "Hide password",
    submit: "Log in",
    forgot: "Forgot password?",
    capsLock: "Caps Lock is on",
    suggestMagic: "Having trouble? We can email you a sign-in link instead.",
    suggestMagicButton: "Email me a sign-in link",
  },
  magic: {
    heading: "Check your inbox",
    body: (email: string) => `If ${email} has a WDC account, a sign-in link is on its way. It works for 15 minutes.`,
    openGmail: "Open Gmail",
    openOutlook: "Open Outlook",
    openYahoo: "Open Yahoo Mail",
    openIcloud: "Open iCloud Mail",
    codeLabel: "Or enter the 6-digit code from the email",
    resend: "Resend link",
    resendIn: (seconds: number) => `Resend in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    resent: "Sent again. Check your inbox.",
    otherWay: "Try another way",
    demoSimulate: "Simulate opening the link",
  },
  passkey: {
    heading: "Use your passkey",
    body: "Follow the prompt on your device.",
    retry: "Try again",
    otherWay: "Choose another way",
    demoCancel: "Simulate cancel",
  },
  reset: {
    heading: "Reset your password",
    body: "We'll email you a link to set a new one.",
    submit: "Send reset link",
    back: "Back to log in",
  },
  resetSent: {
    heading: "Check your inbox",
    body: (email: string) => `If ${email} has a WDC account, a reset link is on its way. It works for one hour.`,
  },
  errors: {
    emailInvalid: "Enter a full email address, like name@company.com.",
    passwordEmpty: "Enter your password to continue.",
    invalidCredentials: "That email and password don't match. Check both and try again.",
    rateLimited: "Too many attempts. Wait a few minutes, or use a sign-in link instead.",
    network: "We couldn't reach the server. Check your connection and try again.",
    badCode: "That code didn't work. Check the email and try again.",
    codeIncomplete: "Enter all six digits from the email.",
    expired: "That link or code has expired. We can send you a new one.",
    passkeyCancelled: "No problem. Try again, or choose another way.",
  },
  status: {
    sending: "Sending your link",
    checking: "Checking",
    sent: "Link sent",
    resetSent: "Reset link sent",
  },
  success: { sr: "Logged in. Opening your dashboard." },
  panel: { tagline: "...brilliant simplicity", taglineStrong: "of thought!" },
} as const;

/**
 * WHY A SIGN-IN THAT LEFT THE PAGE CAME BACK REFUSED, in English.
 *
 * Google and the emailed link both return here as `?error=<code>` when they
 * fail. Without a sentence the person lands on a form that looks exactly as
 * it did before, which reads as the button being broken. The Google codes are
 * Better Auth's plus the ones `validateUserInfo` in lib/auth.ts returns; ONE
 * sentence covers "no account" and "not one of ours", because telling them
 * apart would turn the button into a way of finding out who works here.
 */
const NOT_CONNECTED = "That Google account is not connected to a We Dig Creativity account. Sign in with your email, or ask your WDC contact.";
const NO_EMAIL = "Google did not share an email address with us, so there was nothing to match against an account.";
const UNAVAILABLE = "We could not check that account just now. Please sign in with your email.";

export const RETURN_ERRORS: Record<string, string> = {
  not_approved: NOT_CONNECTED,
  signup_disabled: NOT_CONNECTED,
  account_not_linked: NOT_CONNECTED,
  email_required: NO_EMAIL,
  email_not_found: NO_EMAIL,
  verification_unavailable: UNAVAILABLE,
  validation_failed: UNAVAILABLE,
  /* The emailed link: spent, expired, or opened twice. */
  INVALID_TOKEN: copy.errors.expired,
  EXPIRED_TOKEN: copy.errors.expired,
  new_user_signup_disabled: copy.errors.expired,
};

export const RETURN_ERROR_FALLBACK = "That sign-in did not complete. Please try again with your email.";
