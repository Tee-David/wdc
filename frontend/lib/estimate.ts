/**
 * The scope and budget estimator behind /tools/estimate.
 *
 * WHAT IT IS ALLOWED TO SAY, and this is the first decision rather than a
 * disclaimer bolted on afterwards. Section 4 of the checklist forbids
 * fabricated totals in the admin product; the same rule facing outward means
 * this may produce an INDICATIVE RANGE and may never produce a quote. So
 * nothing here returns a single number: every result is a low and a high, the
 * gap between them is wide on purpose, and the copy that renders it says what
 * would move it. A visitor who leaves with one figure in their head has been
 * misled by a tool that was trying to be helpful.
 *
 * WHY A MODEL RATHER THAN A PRICE LIST. The site publishes no prices, and that
 * is deliberate -- see `lib/onboarding.ts`, which asks about budget and asks
 * nothing about price. A price list would change that policy by accident. A
 * model does not: it answers "what does a thing this size cost to build",
 * which is a question about the work, and it is the same arithmetic anybody
 * scoping a project does on paper.
 *
 * THE WHOLE MODEL IS DAYS. Each answer adds days of the team's time, the total
 * is multiplied by one rate, and the phases are proportions of that total.
 * Two consequences worth stating: the studio tunes this by editing ONE number
 * when its rate changes, and every figure the tool shows can be traced back to
 * a decision somebody made in `QUESTIONS` rather than to a lookup table nobody
 * can defend.
 *
 * ALL OF IT IS PURE AND SYNCHRONOUS. No network, no key, no server: it is
 * Class A in the terms of `docs/tools-programme.md`, and it runs in the
 * visitor's browser as they answer. `scripts/check-estimate.mjs` calls it
 * directly, which is why there is no `server-only` here. The API route
 * recomputes with this same module rather than trusting numbers posted back to
 * it, which is the only reason a browser may hold the arithmetic at all.
 */

/* ------------------------------------------------------------- the numbers */

/**
 * THE TWO NUMBERS THE STUDIO OWNS, and the only two worth arguing about.
 *
 * `dayRateNgn` is a blended day rate for the team, not one person's salary
 * divided by twenty: it carries design, engineering, project management and
 * the overhead the studio actually pays. `nairaPerUsd` -- naira to ONE dollar,
 * which is the way the rate is quoted here -- exists because half the
 * enquiries for software arrive in dollars and a reader who thinks in dollars
 * should not have to open a converter to know whether to keep reading.
 *
 * BOTH ARE REVIEWED BY HAND, and `reviewed` is the date somebody last did it.
 * Nothing here calls an FX API: a rate that moves under a visitor mid-session
 * makes a tool look broken, and a tool that fetches a third-party price to
 * quote a range it has already called indicative is spending a request to
 * gain nothing. The page prints the review date beside the dollar figure so
 * the reader can see how fresh it is.
 */
export const RATE_CARD = {
  dayRateNgn: 120_000,
  nairaPerUsd: 1_550,
  reviewed: "2026-09",
} as const;

/** Rounded so a range reads as a range and not as a bill. */
const ROUND_TO = 50_000;

/**
 * THE BAND, and why it is not symmetrical.
 *
 * Under-scoping is the failure mode of every estimate ever made, so the high
 * end sits further from the middle than the low end does. A project that comes
 * in under the range is a good conversation; one that lands above a range we
 * published is the conversation that loses a client.
 */
const LOW = 0.85;
const HIGH = 1.25;

/* ----------------------------------------------------------- the questions */

export type Option = {
  key: string;
  label: string;
  /** Days of the team's time this answer adds. */
  days?: number;
  /** Applied to the total instead of adding to it. Timeline only. */
  multiplier?: number;
  /** Shown under the option. What the answer means, not what it costs. */
  note?: string;
};

export type Question = {
  key: string;
  /** The question in the words a client would use. */
  label: string;
  /** One line under it, where the question needs a boundary drawn. */
  hint?: string;
  options: Option[];
};

/**
 * EIGHT QUESTIONS, WHICH IS THE CEILING RATHER THAN A TARGET.
 *
 * The checklist says six to eight. Every one below changes the answer by more
 * than the rounding does, which is the test a ninth would have to pass: a
 * question whose effect disappears into a ₦50,000 rounding step is a question
 * that costs the visitor thirty seconds and buys them nothing.
 *
 * THEY ARE ORDERED BY HOW EASILY A READER CAN ANSWER THEM. What are we
 * building and what exists already are things anybody knows on arrival; roles,
 * integrations and AI need a moment's thought. Starting with the hard ones is
 * how a form gets abandoned on question two.
 */
export const QUESTIONS: Question[] = [
  {
    key: "kind",
    label: "What are we building?",
    options: [
      { key: "site", label: "A website you can edit yourself", days: 12, note: "Marketing pages, a CMS behind them." },
      { key: "webapp", label: "A web app people log into", days: 25, note: "Accounts, data, something that does work." },
      { key: "mobile", label: "A mobile app, iOS and Android", days: 35, note: "One codebase, both stores." },
      { key: "both", label: "Web and mobile together", days: 50, note: "A shared back end under both." },
      { key: "internal", label: "An internal tool for your team", days: 18, note: "Fewer users, sharper workflow." },
    ],
  },
  {
    key: "start",
    label: "What exists today?",
    options: [
      { key: "idea", label: "An idea, nothing drawn yet", days: 6, note: "Adds discovery, which is where the scope is settled." },
      { key: "designs", label: "Designs, no code", days: 0 },
      { key: "extend", label: "Something live we would extend", days: 4, note: "Reading someone else's code costs time before anything is added." },
      { key: "rebuild", label: "Something live we would rebuild", days: 8, note: "Migration, redirects and the data already in there." },
    ],
  },
  {
    key: "screens",
    label: "Roughly how many screens or journeys?",
    hint: "A journey is one thing a person comes to do: sign up, place an order, file a report.",
    options: [
      { key: "xs", label: "Under five", days: 0 },
      { key: "s", label: "Five to twelve", days: 8 },
      { key: "m", label: "Thirteen to twenty-five", days: 20 },
      { key: "l", label: "More than twenty-five", days: 36 },
    ],
  },
  {
    key: "accounts",
    label: "Do people sign in?",
    options: [
      { key: "none", label: "No accounts at all", days: 0 },
      { key: "simple", label: "Yes, one kind of user", days: 5 },
      { key: "roles", label: "Yes, with roles and permissions", days: 12, note: "An admin, a staff member and a client see different things." },
    ],
  },
  {
    key: "payments",
    label: "Does it take money?",
    options: [
      { key: "none", label: "No", days: 0 },
      { key: "once", label: "One-off payments", days: 6, note: "Paystack or Flutterwave, receipts, a webhook that has to be idempotent." },
      { key: "recurring", label: "Subscriptions or a wallet", days: 14, note: "Renewals, failures and refunds are most of the work here." },
    ],
  },
  {
    key: "integrations",
    label: "Does it have to talk to anything else?",
    options: [
      { key: "none", label: "Nothing", days: 0 },
      { key: "few", label: "One or two services", days: 4, note: "Email, maps, analytics, a calendar." },
      { key: "many", label: "Several, or a system we do not control", days: 14, note: "A bank, an ERP, a government portal. The unknowns live here." },
    ],
  },
  {
    key: "ai",
    label: "Is there an AI feature?",
    hint: "We will say plainly if the answer is no when you expected yes.",
    options: [
      { key: "none", label: "No", days: 0 },
      { key: "one", label: "One job: search, summaries, support", days: 8 },
      { key: "core", label: "It is the product", days: 22, note: "Evaluation, guardrails and a running cost to model." },
    ],
  },
  {
    key: "timeline",
    label: "When does it need to be live?",
    options: [
      { key: "open", label: "No fixed date", multiplier: 1 },
      { key: "quarter", label: "Within three months", multiplier: 1.05 },
      { key: "rush", label: "Six weeks or less", multiplier: 1.25, note: "Compression costs money: more people, more overlap, more rework." },
    ],
  },
];

/* --------------------------------------------------------------- the phases */

/**
 * The shape of the work, as proportions of the total.
 *
 * WHY A BREAKDOWN AT ALL. A single range invites one question -- "why so
 * much?" -- and leaves the reader to answer it themselves, usually
 * uncharitably. Four phases answer it before it is asked, and they are the
 * phases the studio actually runs, so the estimate and the first call describe
 * the same project.
 *
 * Care is DELIBERATELY OUTSIDE the total. Hosting, updates and support are a
 * monthly decision, not a slice of a build, and folding them in would inflate
 * the headline number for something the client may not buy.
 */
export const PHASES = [
  { key: "discovery", label: "Discovery and design", share: 0.24, blurb: "Scope, flows, the interface and the decisions that are expensive to change later." },
  { key: "build", label: "Build", share: 0.56, blurb: "Front end, back end, the integrations and the tests that keep them honest." },
  { key: "launch", label: "Launch and handover", share: 0.12, blurb: "Deployment, the store submissions where there are any, and showing your team how it runs." },
  { key: "settle", label: "Settling-in", share: 0.08, blurb: "The fortnight after launch, when real use finds the things a test never does." },
] as const;

/* ------------------------------------------------------------ the arithmetic */

export type Answers = Record<string, string>;

export type Money = { low: number; high: number };

export type Estimate = {
  /** Days of team time at the middle of the range, for the honest version of
   *  "how long will this take". */
  days: number;
  ngn: Money;
  usd: Money;
  phases: Array<{ key: string; label: string; blurb: string; ngn: Money }>;
  /** What this number assumes, in the reader's words. Rendered as a list. */
  assumptions: string[];
};

function round(value: number) {
  return Math.max(ROUND_TO, Math.round(value / ROUND_TO) * ROUND_TO);
}

/** The option a set of answers picked, or the first one as the default. */
export function chosen(question: Question, answers: Answers): Option {
  return question.options.find((o) => o.key === answers[question.key]) ?? question.options[0];
}

export function isComplete(answers: Answers) {
  return QUESTIONS.every((q) => q.options.some((o) => o.key === answers[q.key]));
}

/**
 * The assumptions worth printing, and only the ones the answers earned.
 *
 * A LIST OF EVERYTHING WOULD BE READ BY NOBODY. Four or five lines that each
 * name a real fork in this particular project are read, and each one is an
 * opening for the conversation the tool exists to start.
 */
function assumptionsFor(answers: Answers): string[] {
  const out: string[] = [
    "One round of design revisions per screen, which is what most projects use.",
    "Content and images come from you, or we price writing and shooting separately.",
  ];
  if (answers.kind === "mobile" || answers.kind === "both") {
    out.push("Store accounts are yours: Apple charges $99 a year, Google $25 once.");
  }
  if (answers.payments && answers.payments !== "none") {
    out.push("Payment gateway fees are charged by the gateway, not by us.");
  }
  if (answers.ai && answers.ai !== "none") {
    out.push("Model usage is billed by the provider each month and is not in this figure.");
  }
  if (answers.integrations === "many") {
    out.push("Whoever owns the other system gives us documentation and a test account.");
  }
  if (answers.start === "rebuild") {
    out.push("The data in the current system can be exported. If it cannot, that is its own piece of work.");
  }
  out.push("Hosting, care and support are monthly and quoted separately.");
  return out;
}

/**
 * The estimate for a complete set of answers.
 *
 * INCOMPLETE ANSWERS RETURN NULL rather than a partial figure. A number that
 * appears while somebody is still answering is a number they will remember,
 * and it will be wrong.
 */
export function estimate(answers: Answers): Estimate | null {
  if (!isComplete(answers)) return null;

  let days = 0;
  let multiplier = 1;
  for (const question of QUESTIONS) {
    const option = chosen(question, answers);
    days += option.days ?? 0;
    multiplier *= option.multiplier ?? 1;
  }
  days = Math.round(days * multiplier);

  const middle = days * RATE_CARD.dayRateNgn;
  const ngn = { low: round(middle * LOW), high: round(middle * HIGH) };

  return {
    days,
    ngn,
    usd: {
      /* Rounded to fifty dollars for the same reason the naira is rounded to
         fifty thousand: a range reading $18,350 to $27,000 claims a precision
         the model does not have. */
      low: Math.round((ngn.low / RATE_CARD.nairaPerUsd) / 50) * 50,
      high: Math.round((ngn.high / RATE_CARD.nairaPerUsd) / 50) * 50,
    },
    phases: PHASES.map((phase) => ({
      key: phase.key,
      label: phase.label,
      blurb: phase.blurb,
      ngn: { low: round(ngn.low * phase.share), high: round(ngn.high * phase.share) },
    })),
    assumptions: assumptionsFor(answers),
  };
}

/* ------------------------------------------------------------- for the eyes */

/**
 * Naira, shortened, because a range is read at a glance and eight digits are
 * not. ₦2.4m and ₦850k are how the amounts get said out loud, so they are how
 * they are written.
 */
export function shortNaira(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    /* One decimal below ten million, none above: ₦2.4m is useful, ₦24.3m is
       false precision on a figure rounded to the nearest fifty thousand. */
    return `₦${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}m`;
  }
  return `₦${Math.round(value / 1_000)}k`;
}

export function shortDollars(value: number) {
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `$${value}`;
}

/** The plain version, for an email where a glance is not the point. */
export function fullNaira(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

/**
 * The answers as sentences, for the studio's copy of the estimate.
 *
 * The email that lands on our side has to be readable by somebody who was not
 * in the browser when it was filled in, so it carries the questions and the
 * answers rather than a set of keys.
 */
export function describe(answers: Answers): Array<{ question: string; answer: string }> {
  return QUESTIONS.map((q) => ({ question: q.label, answer: chosen(q, answers).label }));
}
