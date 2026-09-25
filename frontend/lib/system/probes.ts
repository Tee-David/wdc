import "server-only";

import { db } from "@/lib/db/pool";
import { mailIsConfigured, missingMailVariables, verifyMail } from "@/lib/email";
import { paystackConfig } from "@/lib/paystack";
import { headObject, probeCors, r2Config } from "@/lib/r2";
import { SITE_URL } from "@/lib/site";
import { setAppSetting } from "@/lib/app-settings";

/**
 * "Check now": one cheap question to each outside service, timed, with the
 * answer kept so the page can say what it saw and when rather than
 * "working".
 *
 * NO SECRET LEAVES THIS FILE. A result carries a sentence and a status
 * code, never a key, a URL with a signature in it, or a response body.
 *
 * Results live in `app_settings` under `probe.<name>`, so the answer from a
 * check that ran behind the response (SMTP, about 23 seconds) is there on the
 * next load, and is the same on every instance.
 */

export const PROBES = ["database", "email", "payments", "storage"] as const;
export type ProbeName = (typeof PROBES)[number];
export type ProbeResult = { ok: boolean; ms: number; at: string; detail: string; by: string };

const KEY = (n: ProbeName) => `probe.${n}`;
const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);

async function timed(fn: () => Promise<string>): Promise<{ ok: boolean; ms: number; detail: string }> {
  const started = Date.now();
  try {
    const detail = await fn();
    return { ok: true, ms: Date.now() - started, detail };
  } catch (error) {
    return { ok: false, ms: Date.now() - started, detail: error instanceof Error ? error.message.slice(0, 240) : "No answer." };
  }
}

const RUN: Record<ProbeName, () => Promise<string>> = {
  async database() {
    if (!configured()) throw new Error("COCKROACHDB_URL is not set.");
    await db.query("SELECT 1");
    return "Answered a query.";
  },
  async email() {
    if (!mailIsConfigured()) throw new Error(`Not set: ${missingMailVariables().join(", ")}.`);
    await verifyMail();
    return "Connected and signed in. Nothing was sent.";
  },
  async payments() {
    const p = paystackConfig();
    if (!p.ok) throw new Error(`Not set: ${p.missing.join(", ")}.`);
    const res = await fetch("https://api.paystack.co/balance", {
      headers: { authorization: `Bearer ${p.config.secretKey}` },
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    if (res.status === 401) throw new Error(`Paystack refused the ${p.config.mode} secret key (401).`);
    if (!res.ok) throw new Error(`Paystack answered ${res.status}.`);
    return `The ${p.config.mode} secret key was accepted.`;
  },
  async storage() {
    const r2 = r2Config();
    if (!r2.ok) throw new Error(`Not set: ${r2.missing.join(", ")}.`);
    /* A key nobody wrote: 404 means the bucket answered and the signature was
       good; 403 means the credentials are wrong. */
    const head = await headObject({ config: r2.config, key: `health/probe-${crypto.randomUUID()}` });
    if (!head.ok && head.status === 0) throw new Error("The bucket did not answer.");
    if (!head.ok && (head.status === 401 || head.status === 403)) throw new Error(`The bucket refused the credentials (${head.status}).`);
    const cors = await probeCors({ config: r2.config, origin: new URL(SITE_URL).origin });
    if (!cors.ok) throw new Error(`Credentials work, but uploads from the site will fail: ${cors.reason}`);
    return "Credentials accepted, and uploads from the site are allowed.";
  },
};

/** Run one probe now and keep the answer. */
export async function runProbe(name: ProbeName, by: string): Promise<ProbeResult> {
  const r = await timed(RUN[name]);
  const result: ProbeResult = { ...r, at: new Date().toISOString(), by };
  if (configured()) await setAppSetting(KEY(name), result, by).catch(() => undefined);
  return result;
}

/** The last answer from each probe, where one has run. */
export async function lastProbes(): Promise<Partial<Record<ProbeName, ProbeResult>>> {
  if (!configured()) return {};
  try {
    const r = await db.query<{ key: string; value: ProbeResult }>("SELECT key, value FROM app_settings WHERE key LIKE 'probe.%'");
    return Object.fromEntries(r.rows.map((x) => [x.key.slice("probe.".length), x.value]));
  } catch {
    return {};
  }
}

/** Probes that take longer than a person should wait on a button. */
export const SLOW: ReadonlySet<ProbeName> = new Set(["email"]);
