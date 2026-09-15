/**
 * What an AI feature costs to RUN, every month, in naira.
 *
 * WHY THIS IS THE TOOL FOR "SOFTWARE & AI". Every enquiry that starts with "can
 * you add AI to it" is really two questions, and only the first one gets asked:
 * what will it cost to build, and what will it cost to keep running. The
 * estimator at /tools/estimate answers the first. This answers the second, and
 * it is the one that surprises people -- a build is a number you agree once,
 * and a model bill arrives every month for as long as the feature is switched
 * on.
 *
 * IT IS ALLOWED TO TALK SOMEBODY OUT OF IT. `docs/tools-programme.md` says this
 * one "disqualifies bad-fit enquiries before they reach a call", and that is a
 * feature rather than a risk: a reader who discovers here that their idea costs
 * ₦40,000 a month to run either proceeds knowing it or does not waste an
 * afternoon of both our time. The copy says plainly where a model is not the
 * answer.
 *
 * PURE ARITHMETIC, CLASS A, no key and no network. The prices are a table in
 * this file with the date they were read and where from, exactly like the
 * estimator's rate card, because a tool that quietly quotes last year's prices
 * is worse than one that admits it has a review date.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not call a tokeniser, it does not
 * price caching, batching or fine-tuning, and it does not pretend to three
 * significant figures. Tokens are estimated from words at the ratio every
 * provider publishes, and the page says so. A monthly bill somebody can plan
 * against is the job; an invoice is not.
 */

/* ------------------------------------------------------------- the prices */

export type Model = {
  key: string;
  /** What the provider calls it, so a reader can search for it. */
  name: string;
  maker: string;
  /** USD per million input tokens. */
  inUsd: number;
  /** USD per million output tokens. Always the dearer of the two. */
  outUsd: number;
  /** One line on where it fits, in the words a client would use. */
  note: string;
};

/**
 * REVIEWED SEPTEMBER 2026, and the date matters more than the numbers.
 *
 * Model prices move in both directions and new tiers appear every few months;
 * the honest thing is a table with a review date printed beside it on the page
 * rather than a figure presented as permanent.
 *
 * WHERE THEY COME FROM. The Claude rows are Anthropic's published API rates.
 * The OpenAI and Google rows were read from public pricing pages and trackers
 * in September 2026 -- secondary sources, and only each provider's own pricing
 * page is authoritative, which is why the page says to check before signing
 * anything.
 *
 * WHY THESE EIGHT. Three ladders, cheapest to dearest, from the three makers a
 * Nigerian business would actually be offered. The point of showing all of them
 * is the SPREAD: the same feature runs 25x dearer on a frontier model than on a
 * small one, and most features do not need the frontier.
 */
export const PRICES_REVIEWED = "September 2026";

export const MODELS: Model[] = [
  { key: "gpt-luna", name: "GPT-5.6 Luna", maker: "OpenAI", inUsd: 0.20, outUsd: 1.20, note: "The cheap one. Classifying, tagging, routing, short replies." },
  { key: "gemini-flash", name: "Gemini 3 Flash", maker: "Google", inUsd: 0.50, outUsd: 3.00, note: "Fast and cheap, good at reading long documents." },
  { key: "haiku", name: "Claude Haiku 4.5", maker: "Anthropic", inUsd: 1.00, outUsd: 5.00, note: "Small and quick, and still careful with instructions." },
  { key: "gemini-pro", name: "Gemini 3.1 Pro", maker: "Google", inUsd: 2.00, outUsd: 12.00, note: "The middle of Google's range." },
  { key: "sonnet", name: "Claude Sonnet 5", maker: "Anthropic", inUsd: 2.00, outUsd: 10.00, note: "The workhorse. Most features we build sit here." },
  { key: "gpt-terra", name: "GPT-5.6 Terra", maker: "OpenAI", inUsd: 2.00, outUsd: 12.00, note: "The middle of OpenAI's range." },
  { key: "gpt-sol", name: "GPT-5.6 Sol", maker: "OpenAI", inUsd: 5.00, outUsd: 30.00, note: "OpenAI's flagship." },
  { key: "opus", name: "Claude Opus 5", maker: "Anthropic", inUsd: 5.00, outUsd: 25.00, note: "The heavy one. Worth it where the answer has to be right." },
];

/* --------------------------------------------------------------- the shape */

/**
 * WORDS TO TOKENS, at the ratio every provider quotes: roughly four characters,
 * or three quarters of a word, per token in English.
 *
 * IT IS AN ESTIMATE AND THE PAGE SAYS SO. A real tokeniser would give an exact
 * count for text nobody has written yet, which is precision about the wrong
 * thing. Nigerian names, pidgin and mixed-language text all tokenise a little
 * heavier than plain English, so the figure leans high rather than low -- the
 * same asymmetry as the build estimator, and for the same reason.
 */
export const TOKENS_PER_WORD = 1.35;

export type Job = {
  key: string;
  label: string;
  /** Words in, per request, including whatever context is sent with it. */
  inWords: number;
  /** Words out, per request. */
  outWords: number;
  hint: string;
};

/**
 * THE FOUR SHAPES, and they differ by which half is big.
 *
 * This is the thing nobody expects: output tokens cost four to six times what
 * input tokens cost, so a feature that READS a lot and answers briefly is cheap
 * however much it reads, and one that writes for you is dear however little you
 * give it. Every one of these numbers is a starting point the reader can
 * overwrite.
 */
export const JOBS: Job[] = [
  {
    key: "support",
    label: "Answering customer questions",
    inWords: 600,
    outWords: 150,
    hint: "A question, the last few messages, and a chunk of your own material as context.",
  },
  {
    key: "summarise",
    label: "Summarising documents",
    inWords: 2_000,
    outWords: 200,
    hint: "Reads a lot, writes a little — which is the cheap shape.",
  },
  {
    key: "classify",
    label: "Sorting or tagging things",
    inWords: 200,
    outWords: 15,
    hint: "A message in, a label out. The cheapest thing you can ask a model to do.",
  },
  {
    key: "write",
    label: "Drafting copy",
    inWords: 300,
    outWords: 700,
    hint: "Writes more than it reads — which is the dear shape, because output costs several times input.",
  },
];

/* ---------------------------------------------------------------- the sums */

export type Usage = {
  /** Requests a month. */
  runs: number;
  inWords: number;
  outWords: number;
};

export type Line = {
  model: Model;
  /** Naira a month, at this volume. */
  naira: number;
  usd: number;
  /** Naira for one request, which is the figure that makes it real. */
  perRun: number;
};

export function tokensFor(usage: Usage) {
  return {
    input: usage.runs * usage.inWords * TOKENS_PER_WORD,
    output: usage.runs * usage.outWords * TOKENS_PER_WORD,
  };
}

/**
 * Every model priced for the same month of use, cheapest first.
 *
 * ONE FX NUMBER ON THE SITE, AND IT IS PASSED IN. The rate belongs to the build
 * estimator's `RATE_CARD` -- two dollar rates on one site is how a page ends up
 * disagreeing with the page next to it -- but this module does not import it.
 * It has no imports at all, which is what lets `scripts/check-ai-cost.mjs` load
 * it straight into node: the TypeScript path alias does not exist there, and a
 * pure module a check script cannot load is a pure module nobody checks. The
 * caller reads the rate and hands it over.
 */
export function priceAll(usage: Usage, nairaPerUsd: number): Line[] {
  const { input, output } = tokensFor(usage);
  return MODELS.map((model) => {
    const usd = (input / 1_000_000) * model.inUsd + (output / 1_000_000) * model.outUsd;
    const naira = usd * nairaPerUsd;
    return { model, usd, naira, perRun: usage.runs > 0 ? naira / usage.runs : 0 };
  }).sort((a, b) => a.naira - b.naira);
}

/* ------------------------------------------------------------- the reading */

/**
 * The sentence that goes under the table.
 *
 * A TOOL THAT ONLY PRINTS NUMBERS MAKES THE READER DO THE THINKING. The whole
 * reason this one exists is to say the quiet part: at small volumes the model
 * bill is not the thing to worry about, at large ones the choice of model is
 * worth more than any amount of prompt tuning, and past a certain size the
 * answer may be that a model is the wrong tool entirely.
 */
export function reading(usage: Usage, lines: Line[]) {
  const cheapest = lines[0];
  const dearest = lines[lines.length - 1];

  if (usage.runs === 0) return "Put a volume in and the monthly figures appear.";

  if (dearest.naira < 5_000) {
    return `Even on the dearest model this is ${Math.round(dearest.naira).toLocaleString("en-NG")} naira a month. At this volume the model bill is not the thing to think about — the build is.`;
  }

  /* THE RATIO, NOT THE RANGE AGAIN. The two figures are already the largest
     thing on the panel; repeating them here spends the one sentence a reader
     will actually read on something they have just looked at. What the range
     does not say on its own is how far apart the ends are. */
  const spread = cheapest.naira > 0 ? dearest.naira / cheapest.naira : 0;
  return `That is ${spread.toFixed(0)}x between the cheapest model and the dearest, for identical work. Which one answers is worth more than any amount of prompt tuning, and most features do not need the dearest.`;
}

/** Naira, at the precision a monthly figure deserves. */
export function naira(value: number) {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `₦${Math.round(value).toLocaleString("en-NG")}`;
  if (value >= 1) return `₦${value.toFixed(0)}`;
  return `${Math.round(value * 100)} kobo`;
}

/** The per-request figure, which is usually a fraction of a naira. */
export function perRunLabel(value: number) {
  if (value >= 10) return `₦${Math.round(value)}`;
  if (value >= 1) return `₦${value.toFixed(1)}`;
  return `${(value * 100).toFixed(value * 100 >= 10 ? 0 : 1)} kobo`;
}
