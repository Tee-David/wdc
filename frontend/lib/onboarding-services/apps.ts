import { UNSURE, type Step } from "../onboarding-shared";

/**
 * The apps form's steps (Size first). One file per service so two people can
 * work on two services without touching the same lines. Composed by
 * `stepsFor` in ../onboarding.ts.
 */
export const APPS_STEPS: Step[] = [
  {
    phase: "work", id: "apps", service: "apps", title: "Apps",
    blurb: "What the app does, and what it has to talk to.",
    fields: [
      { key: "platforms", label: "iOS, Android, or both?", kind: "multi", required: true, options: ["iOS", "Android"] },
      { key: "one_job", assist: true, label: "In one sentence, what does the app do for the person holding the phone?", kind: "text", required: true },
      { key: "accounts", assist: true, label: "Who uses the app, and what should each person be allowed to do?", kind: "textarea", required: true, tip: "For example: customers place orders; staff update them. Tell us if people need to sign in." },
      { key: "offline", assist: true, label: "Must it work without a connection?", kind: "cards", options: ["Yes", "No", UNSURE] },
      { key: "payments", assist: true, label: "Will customers pay through the app?", kind: "cards", options: ["No", "One-off payments", "Subscriptions", "Other"] },
      { key: "payments_other", label: "How else should payments work?", kind: "text", showIf: { key: "payments", equals: ["Other"] } },
      {
        key: "store_accounts", label: "Do you have developer accounts for the stores?", kind: "cards",
        required: true, options: ["Both", "One of them", "Neither", UNSURE],
        tip: "Apple and Google both require a paid developer account in YOUR name to publish. If you have neither, we will walk you through it. It is not a blocker.",
      },
      {
        key: "store_accounts_wanted", label: "Would you like us to set up the ones you are missing?", kind: "yesno",
        showIf: { key: "store_accounts", equals: ["One of them", "Neither", UNSURE] },
        scope: "Apple and Google charge their own developer fees, paid to them and in your name. Our time to open the accounts and get the app through review is extra to the build, and quoted before we start.",
      },
      { key: "backend", assist: true, tip: "This is the system behind the app that stores information and handles requests. You do not need to know how it is built.", label: "Does the app already have a system behind it?", kind: "cards", options: ["One exists", "Build it", UNSURE] },
    ],
  },
];
