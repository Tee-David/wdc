import "server-only";

import Link from "next/link";
import { CalendarDays, CreditCard, Database, Gauge, HardDrive, KeyRound, Mail, MessageCircle, type LucideIcon } from "lucide-react";
import { mailIsConfigured, missingMailVariables } from "@/lib/email";
import { paystackConfig, type PaystackMode } from "@/lib/paystack";
import { selectedPaystackMode } from "@/lib/paystack-mode";
import { r2Config } from "@/lib/r2";
import { psiIsConfigured } from "@/lib/psi";
import { lastProbes, type ProbeName, type ProbeResult } from "@/lib/system/probes";
import { CheckNow } from "./settings/system-controls";

/**
 * What each outside service is, honestly.
 *
 * FOUR STATES AND NO FIFTH. "Set up" means the credentials are present on
 * this deployment, which is all this screen can know without calling the
 * service; it never says "working", because a key that is present can still
 * be wrong. "Missing" names the variables so whoever holds them knows what to
 * add. "Not built" is a feature the site does not have, said as one rather
 * than drawn as a switch. "Manual" is a channel people use that the site
 * cannot read.
 *
 * NO SECRET IS READ INTO THE PAGE. Only whether a value is present, and the
 * NAME of any that is not.
 */
type State = "ready" | "missing" | "unbuilt" | "manual";

const PILL: Record<State, { label: string; tone: string }> = {
  ready: { label: "Set up", tone: "ad__pill--good" },
  missing: { label: "Missing", tone: "ad__pill--warn" },
  unbuilt: { label: "Not built", tone: "ad__pill--flat" },
  manual: { label: "Manual", tone: "ad__pill--flat" },
};

type Row = { name: string; state: State; detail: React.ReactNode; icon: LucideIcon; probe?: ProbeName };

function rows(mode:PaystackMode): Row[] {
  const database = Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
  const paystack = paystackConfig(mode);
  const r2 = r2Config();
  const google = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return [
    {
      name: "Database", probe: "database", icon: Database,
      state: database ? "ready" : "missing",
      detail: database ? "Accounts, clients, money, posts and the logs." : "COCKROACHDB_URL is not set. Sign-in and saving cannot work.",
    },
    {
      name: "Email (SMTP)", probe: "email", icon: Mail,
      state: mailIsConfigured() ? "ready" : "missing",
      detail: mailIsConfigured()
        ? <>Every email the site sends. <Link href="/admin/settings/email/log">Message log</Link></>
        : `Not set: ${missingMailVariables().join(", ")}.`,
    },
    {
      name: `Paystack (${mode})`, probe: "payments", icon: CreditCard,
      state: paystack.ok ? "ready" : "missing",
      detail: paystack.ok ? "Card and transfer payments on invoices." : `Not set: ${paystack.missing.join(", ")}.`,
    },
    {
      name: "File storage (R2)", probe: "storage", icon: HardDrive,
      state: r2.ok ? "ready" : "missing",
      detail: r2.ok ? "Uploads, blog pictures and the media library." : `Not set: ${r2.missing.join(", ")}.`,
    },
    {
      name: "Google sign-in", icon: KeyRound,
      state: google ? "ready" : "missing",
      detail: google ? "Owner and staff can sign in with Google." : "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set.",
    },
    {
      name: "PageSpeed", icon: Gauge,
      state: psiIsConfigured() ? "ready" : "missing",
      detail: psiIsConfigured() ? "Scores in the free site report." : "No PAGESPEED_API_KEY. Reports go out without scores.",
    },
    {
      name: "Cal.com", icon: CalendarDays,
      state: "unbuilt",
      detail: "No booking embed yet. Calls are arranged by email or WhatsApp.",
    },
    {
      name: "WhatsApp", icon: MessageCircle,
      state: "manual",
      detail: "The site cannot send or read WhatsApp. A WhatsApp row in a log was written by a person.",
    },
  ];
}

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

/** What the last "Check now" said, and when: the one thing this screen may call working. */
function Checked({ r }: { r?: ProbeResult }) {
  if (!r) return <small className="ad__dim">Not checked yet</small>;
  return <small className="ad__dim"><span className={`ad__pill ${r.ok ? "ad__pill--good" : "ad__pill--bad"}`}>{r.ok ? "Answered" : "Failed"}</span> {when(r.at)}</small>;
}

export async function IntegrationsPanel() {
  const probes = await lastProbes();
  const mode = await selectedPaystackMode();
  return (
    <div className="adIntg" data-tour="settings-integrations">
      {rows(mode).map((row) => {
        const Icon = row.icon;
        const flat = row.state === "unbuilt" || row.state === "manual" || row.state === "missing";
        return (
          <article key={row.name} className="adIntg__card">
            <div className="adIntg__top">
              <span className={`adIntg__tile${flat ? " is-flat" : ""}`} aria-hidden="true"><Icon /></span>
              <b>{row.name}</b>
              <span className={`ad__pill ${PILL[row.state].tone}`}>{PILL[row.state].label}</span>
            </div>
            <p>{row.detail}</p>
            {row.probe ? (
              <div className="adIntg__check"><Checked r={probes[row.probe]} /><CheckNow probe={row.probe} /></div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
