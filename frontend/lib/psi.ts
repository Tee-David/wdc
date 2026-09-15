import "server-only";

import { consume, quotaIsConfigured } from "@/lib/quota";

/**
 * PageSpeed Insights: the metered half of the SEO tool, and the only Class B
 * thing on this site.
 *
 * WHAT CLASS B MEANS HERE, from `docs/tools-programme.md`: free, but against
 * somebody else's allowance. Google gives 25,000 calls a day and 400 per
 * hundred seconds against a key. The risk is being cut off, not being charged,
 * and the rule is to stay inside the allowance and DEGRADE when it is gone
 * rather than fail.
 *
 * SO NOTHING DEPENDS ON THIS. The on-page snapshot is complete without it, the
 * email goes out either way, and a day when this cannot run is a day the tool
 * still works. Rule 1 of the programme: no tool may exist that can only answer
 * by spending something.
 *
 * THE CAP IS SHARED, NOT PER-INSTANCE. `lib/quota.ts` counts in the database
 * and fails closed, which is the whole point: a limiter held in one serverless
 * instance's memory gives a fresh allowance on every cold start, and Google's
 * allowance is not per instance. When the counter cannot be reached we do not
 * call -- an outage must not become an open tap on somebody else's meter.
 *
 * IT RUNS BEHIND THE RESPONSE, NEVER IN FRONT OF IT. A Lighthouse run takes
 * tens of seconds; the route hands the reader their on-page findings first and
 * calls this from `after()`. That is the same rule the contact receipt follows
 * and the reason the slow part became the magnet rather than a spinner.
 *
 * THE RAW RESPONSE NEVER LEAVES THE SERVER. It is a megabyte of JSON carrying
 * our key's quota headers and a full audit tree; what comes out of here is
 * four numbers and three sentences.
 */

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * OUR OWN DAILY CEILING, well under Google's.
 *
 * 300 a day against their 25,000 is deliberately conservative: this is a free
 * tool on a marketing site, a run costs a reader nothing, and the failure we
 * are insuring against is a script discovering the endpoint and spending the
 * studio's allowance in an afternoon. The number to raise when the tool is
 * genuinely popular is here, and raising it is a decision rather than an
 * accident.
 */
const DAILY_LIMIT = 300;
const DAY_SECONDS = 24 * 60 * 60;

/** Lighthouse is slow by nature. 45 seconds is the ceiling before we stop
    waiting, and it is chosen against the rest of the work in the route that
    calls this: a page fetch in front of it and a slow mail server behind it,
    all inside one function's lifetime. */
const DEADLINE_MS = 45_000;

export type PsiScore = { key: string; label: string; score: number };

export type PsiResult =
  | { ok: true; scores: PsiScore[]; opportunities: string[] }
  /* TOLD APART ON PURPOSE. "spent" means the tool did its job and the budget
     is gone; "unconfigured" means there is no key on this installation; both
     end in the same message to the reader, and only the first is worth a
     decision about money. `failed` is Google's side, which is not the
     reader's problem either. */
  | { ok: false; reason: "spent" | "unconfigured" | "failed" };

export function psiIsConfigured() {
  return Boolean(process.env.PAGESPEED_API_KEY) && quotaIsConfigured();
}

const LABELS: Record<string, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  "best-practices": "Best practices",
  seo: "SEO",
  pwa: "Installable",
};

type Category = { id?: string; title?: string; score?: number | null };
type Audit = {
  title?: string;
  displayValue?: string;
  numericValue?: number;
  details?: { type?: string; overallSavingsMs?: number };
};

/**
 * Runs Lighthouse against a URL, if we are allowed to spend a call on it.
 *
 * The URL has already been through `lib/fetch-page.ts` by the time this is
 * called, which is what makes it safe to hand to Google: this never sees an
 * address the SSRF guards have not already accepted and followed.
 */
export async function runPsi(url: string): Promise<PsiResult> {
  if (!psiIsConfigured()) return { ok: false, reason: "unconfigured" };

  /* THE SPEND IS RECORDED BEFORE THE CALL, not after it. A counter
     incremented on success alone is a counter that does not count the failures
     Google still charged us an attempt for. */
  const allowed = await consume("psi:daily", DAILY_LIMIT, DAY_SECONDS);
  if (!allowed.ok) return { ok: false, reason: "spent" };

  const query = new URLSearchParams({
    url,
    key: process.env.PAGESPEED_API_KEY!,
    strategy: "mobile",
  });
  /* Asked for by name rather than taking the default set: each category is
     work Google does on our behalf, and we show four. */
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) {
    query.append("category", category);
  }

  let payload: {
    lighthouseResult?: {
      categories?: Record<string, Category>;
      audits?: Record<string, Audit>;
    };
  };
  try {
    const response = await fetch(`${ENDPOINT}?${query}`, {
      signal: AbortSignal.timeout(DEADLINE_MS),
      headers: { accept: "application/json" },
    });
    if (!response.ok) return { ok: false, reason: "failed" };
    payload = await response.json();
  } catch {
    return { ok: false, reason: "failed" };
  }

  const categories = payload.lighthouseResult?.categories ?? {};
  const scores: PsiScore[] = Object.values(categories)
    .filter((c): c is Category & { score: number } => typeof c?.score === "number")
    /* Lighthouse scores are 0 to 1 and everybody quotes them out of 100. */
    .map((c) => ({
      key: c.id ?? "",
      label: LABELS[c.id ?? ""] ?? c.title ?? "Score",
      score: Math.round(c.score * 100),
    }));

  /**
   * THE THREE BIGGEST WINS, NOT THE FORTY FINDINGS.
   *
   * Lighthouse returns every audit it ran. A reader handed all of them does
   * nothing; a reader handed the three with the largest measured saving does
   * one of them. `overallSavingsMs` is Lighthouse's own estimate, so the
   * ordering is its arithmetic rather than ours.
   */
  const audits = Object.values(payload.lighthouseResult?.audits ?? {});
  const opportunities = audits
    .filter((a) => a.details?.type === "opportunity" && (a.details.overallSavingsMs ?? 0) > 100)
    .sort((a, b) => (b.details?.overallSavingsMs ?? 0) - (a.details?.overallSavingsMs ?? 0))
    .slice(0, 3)
    .map((a) => {
      const saving = Math.round((a.details?.overallSavingsMs ?? 0) / 100) / 10;
      return `${a.title ?? "An improvement"}${saving ? `, about ${saving}s faster` : ""}`;
    });

  return { ok: true, scores, opportunities };
}
