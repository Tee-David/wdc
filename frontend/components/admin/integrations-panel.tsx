import "server-only";

import Link from "next/link";
import { mailIsConfigured, missingMailVariables } from "@/lib/email";
import { paystackConfig, paystackMode } from "@/lib/paystack";
import { r2Config } from "@/lib/r2";
import { psiIsConfigured } from "@/lib/psi";
import { Panel } from "./bits";
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

type Row = { name: string; state: State; detail: React.ReactNode; probe?: ProbeName };

function rows(): Row[] {
  const database = Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
  const paystack = paystackConfig();
  const r2 = r2Config();
  const google = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return [
    {
      name: "Database (CockroachDB)", probe: "database",
      state: database ? "ready" : "missing",
      detail: database
        ? "Sign-in, onboarding drafts, the newsletter, the blog and contact enquiries are stored here. The admin's clients, projects and money are not yet: they are in memory until section 4.9's migration."
        : "COCKROACHDB_URL is not set. Sign-in, onboarding and stored enquiries cannot work.",
    },
    {
      name: "Email (SMTP)", probe: "email",
      state: mailIsConfigured() ? "ready" : "missing",
      detail: mailIsConfigured()
        ? <>Credentials are present. Whether a message arrived is recorded per message; failures are listed under <Link href="/admin/money/reconciliation">Reconciliation</Link>.</>
        : `Not set: ${missingMailVariables().join(", ")}. Every send is logged as failed rather than silently dropped.`,
    },
    {
      name: `Payments (Paystack, ${paystackMode()} mode)`, probe: "payments",
      state: paystack.ok ? "ready" : "missing",
      detail: paystack.ok
        ? "Keys for this mode are present. The webhook is /api/paystack/webhook and the checkout returns to /pay/done; both must be registered in Paystack's dashboard."
        : `Not set: ${paystack.missing.join(", ")}. Pressing pay on an invoice returns to it saying payments are unavailable, rather than failing silently.`,
    },
    {
      name: "File uploads (Cloudflare R2)", probe: "storage",
      state: r2.ok ? "ready" : "missing",
      detail: r2.ok
        ? "Onboarding uploads go straight to the bucket with a signed link. Admin uploads (receipts, project files) are not built yet."
        : `Not set: ${r2.missing.join(", ")}. An onboarding upload is refused with a message; the rest of the form still saves.`,
    },
    {
      name: "Google sign-in",
      state: google ? "ready" : "missing",
      detail: google
        ? "Only an existing owner or staff account can sign in with Google; it cannot create one."
        : "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set. Password sign-in still works.",
    },
    {
      name: "Site report scores (PageSpeed)",
      state: psiIsConfigured() ? "ready" : "missing",
      detail: psiIsConfigured()
        ? "The free site report includes Lighthouse scores, within the daily budget."
        : "No PAGESPEED_API_KEY or no quota store. The report still goes out, without scores, and the studio is told to run them by hand.",
    },
    {
      name: "Booking (Cal.com)",
      state: "unbuilt",
      detail: "There is no booking embed or webhook yet. Calls are arranged by email or WhatsApp.",
    },
    {
      name: "WhatsApp",
      state: "manual",
      detail: "The site cannot read or send WhatsApp messages. A WhatsApp row in a client's log means somebody wrote down that they sent one.",
    },
  ];
}

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

/** What the last "Check now" said, and when: the one thing this screen may call working. */
function Checked({ r }: { r?: ProbeResult }) {
  if (!r) return <small className="ad__dim">Not checked yet.</small>;
  return <small><span className={`ad__pill ${r.ok ? "ad__pill--good" : "ad__pill--bad"}`}>{r.ok ? "Answered" : "Failed"}</span> {when(r.at)}: {r.detail}</small>;
}

export async function IntegrationsPanel() {
  const probes = await lastProbes();
  return (
    <Panel title="Integrations" dataTour="settings-integrations">
      <div className="ad__scroll">
        <table className="ad__t">
          <thead>
            <tr><th>Service</th><th>State</th><th>What that means</th><th>Last check</th></tr>
          </thead>
          <tbody>
            {rows().map((row) => (
              <tr key={row.name}>
                <td><b>{row.name}</b></td>
                <td><span className={`ad__pill ${PILL[row.state].tone}`}>{PILL[row.state].label}</span></td>
                <td className="ad__dim">{row.detail}</td>
                <td>{row.probe ? <><Checked r={probes[row.probe]} /><CheckNow probe={row.probe} /></> : <span className="ad__dim">No cheap check</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
