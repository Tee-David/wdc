import type { Step } from "../onboarding-shared";

/**
 * The software form's steps (Size first). One file per service so two people can
 * work on two services without touching the same lines. Composed by
 * `stepsFor` in ../onboarding.ts.
 */
export const SOFTWARE_STEPS: Step[] = [
  {
    phase: "work", id: "software", service: "software", title: "Software & AI",
    blurb: "What it replaces, and how we will know it worked.",
    fields: [
      { key: "process", assist: true, label: "What are people doing by hand today that this should take over?", kind: "textarea", required: true },
      { key: "users_count", assist: true, label: "How many people will use it, and who are they?", kind: "text", required: true },
      { key: "data_home", assist: true, label: "Where does that information live now?", kind: "cards", options: ["Spreadsheets", "WhatsApp", "Paper", "An existing system", "Nowhere yet", "Other"] },
      { key: "data_home_other", label: "Where else is the information kept?", kind: "text", showIf: { key: "data_home", equals: ["Other"] } },
      { key: "systems", assist: true, label: "What must it talk to?", kind: "textarea", tip: "Accounting software, a payment provider, an existing database." },
      { key: "compliance", assist: true, label: "Any regulation or data rule we must design around?", kind: "textarea" },
      { key: "success_metric", assist: true, label: "What number tells us this worked?", kind: "text", placeholder: "e.g. hours saved a week, orders processed a day" },
    ],
  },
];
