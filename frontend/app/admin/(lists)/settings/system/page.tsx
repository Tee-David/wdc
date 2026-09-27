import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { lastProbes, PROBES, SLOW, type ProbeName } from "@/lib/system/probes";
import { migrationStatus } from "@/lib/system/migrations";
import { lastTools, MEDIA_CHECK_LIMIT, RETRY_DAYS, RETRY_LIMIT, type ToolName } from "@/lib/system/tools";
import { failedLoggedCount, stuckQueuedCount } from "@/lib/message-log";
import { lastAuditFor } from "@/lib/audit-db";
import { paystackMode } from "@/lib/paystack";
import { SITE_URL } from "@/lib/site";
import { AdminState } from "@/components/admin/admin-state";
import { Panel } from "@/components/admin/bits";
import { ApplyMigrations, CheckNow, CopyReport, ToolButton } from "@/components/admin/settings/system-controls";
import { version as nextVersion } from "next/package.json";
import "@/components/admin/forms/forms.css";

export const metadata = { title: "System" };
export const dynamic = "force-dynamic";
/* Applying a migration can rewrite a table (lib/system/migrations.ts); the
   action runs from this page, so it gets the longest run the plan allows. */
export const maxDuration = 300;

const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

const PROBE_LABEL: Record<ProbeName, string> = {
  database: "Database", email: "Mail server", payments: "Payments (Paystack)", storage: "File storage (R2)",
};

const TOOL_ROWS: { tool: ToolName; label: string; what: string; confirm?: string }[] = [
  { tool: "retry-mail", label: "Retry failed form emails", what: `Receipts, notices and next steps from the last ${RETRY_DAYS} days that did not go, rebuilt from their entries and sent again, up to ${RETRY_LIMIT} a run. Runs behind the page.` },
  { tool: "invitations", label: "Remove old invitations", what: "Invitations that expired or were withdrawn more than 30 days ago and were never used." },
  { tool: "revalidate", label: "Refresh public pages", what: "Every public page is rebuilt on its next visit. For a change that is saved but not showing." },
  { tool: "media", label: "Check the media library", what: `Asks the bucket whether each of the newest ${MEDIA_CHECK_LIMIT} files is still there. Reports; never deletes. Runs behind the page.` },
];

/**
 * How the site is running, asked rather than assumed: each outside service's
 * last answer and when, the schema against the code, work that did not
 * finish, and a report to paste to whoever is helping. The owner's.
 */
export default async function SystemPage() {
  const role = await adminRole();
  if (!can(role, "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="System is for the owner" description="How the site is running, and the tools to fix it." /></section>;
  }
  const [probes, migrations, tools, failed, stuck, daily] = await Promise.all([
    lastProbes(), migrationStatus({ fresh: true }), lastTools(), failedLoggedCount().catch(() => 0), stuckQueuedCount(), lastAuditFor("daily").catch(() => null),
  ]);
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "not a Vercel build";
  const env = [
    ["Site address", SITE_URL],
    ["Environment", process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown"],
    ["Commit", commit],
    ["Region", process.env.VERCEL_REGION ?? "unknown"],
    ["Next.js", nextVersion],
    ["Node.js", process.version],
    ["Payments mode", paystackMode()],
    ["Migrations", migrations.ok ? `${migrations.applied} applied of ${migrations.files}${migrations.pending.length ? `, ${migrations.pending.length} not applied` : ""}` : `could not be read: ${migrations.error}`],
    ...PROBES.map((p) => [PROBE_LABEL[p], probes[p] ? `${probes[p]!.ok ? "answered" : "failed"} ${time(probes[p]!.at)}: ${probes[p]!.detail}` : "not checked"]),
  ] as [string, string][];
  const report = env.map(([k, v]) => `${k}: ${v}`).join("\n");

  return (
    <>
      <div className="ad__head"><div><h1>System health</h1><p>Is everything answering?</p></div></div>
      <div className="ad__stack">
        <Panel title="Services">
          <div className="ad__scroll">
            <table className="ad__t">
              <thead><tr><th>Service</th><th>Last answer</th><th>What it said</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
              <tbody>
                {PROBES.map((p) => {
                  const r = probes[p];
                  return (
                    <tr key={p}>
                      <td><b>{PROBE_LABEL[p]}</b>{SLOW.has(p) ? <small>Takes about half a minute</small> : null}</td>
                      <td>{r ? <><span className={`ad__pill ${r.ok ? "ad__pill--good" : "ad__pill--bad"}`}>{r.ok ? "Answered" : "Failed"}</span><small>{time(r.at)} · {(r.ms / 1000).toFixed(1)} s</small></> : <span className="ad__pill ad__pill--flat">Not checked</span>}</td>
                      <td className="ad__dim">{r?.detail ?? "Press Check now to ask it."}</td>
                      <td><CheckNow probe={p} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Database schema"
          action={migrations.ok ? <span className={`ad__pill ${migrations.pending.length ? "ad__pill--bad" : "ad__pill--good"}`}>{migrations.pending.length ? `${migrations.pending.length} not applied` : "Up to date"}</span> : <span className="ad__pill ad__pill--bad">Unknown</span>}>
          <div style={{ padding: "0 1rem 1rem" }}>
            {!migrations.ok ? <p className="ad__dim">The migrations table could not be read: {migrations.error}</p>
              : migrations.pending.length ? (
                <>
                  <p>This deploy expects changes the database does not have yet, so the screens that use them fail (media folders, for one). Apply them here, or run <code>npm run db:migrate</code> against production:</p>
                  <ul className="adSys__pending">{migrations.pending.map((n) => <li key={n}><code>{n}</code></li>)}</ul>
                  {role === "owner" ? <ApplyMigrations count={migrations.pending.length} /> : <p className="ad__dim">The owner can apply them.</p>}
                </>
              ) : <p className="ad__dim">All {migrations.files} migrations in this deploy are applied.{migrations.unknown.length ? ` The database also has ${migrations.unknown.length} this deploy does not know, from a newer one.` : ""}</p>}
          </div>
        </Panel>

        <Panel title="Background work">
          <dl className="adForms__dl">
            <div><dt>Emails that did not go</dt><dd>{failed ? `${failed}, not yet sent on. They are in Settings, Email, under Failed.` : "None outstanding."}</dd></div>
            <div><dt>Sends that never finished</dt><dd>{stuck ? `${stuck} still marked Queued after 15 minutes: the server stopped before it heard back.` : "None."}</dd></div>
            <div><dt>Daily tidy</dt><dd>{daily ? `${time(daily.at)} by ${daily.actor}: ${daily.action}` : "Has not run yet. It needs CRON_SECRET set in Vercel, or run it from Settings, Email."}</dd></div>
            <div><dt>Payment notices</dt><dd>Kept in this server&apos;s memory until the money records move to the database (section 4.9), so there is no durable delivery history to show yet.</dd></div>
          </dl>
        </Panel>

        <Panel title="Tools">
          <div className="ad__scroll">
            <table className="ad__t">
              <thead><tr><th>Tool</th><th>What it does</th><th>Last run</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
              <tbody>
                {TOOL_ROWS.map((t) => {
                  const last = tools[t.tool];
                  return (
                    <tr key={t.tool}>
                      <td><b>{t.label}</b></td>
                      <td className="ad__dim">{t.what}</td>
                      <td>{last ? <><span className={`ad__pill ${last.ok ? "ad__pill--good" : "ad__pill--warn"}`}>{last.ok ? "Done" : "Needs a look"}</span><small>{time(last.at)} by {last.by}: {last.summary}</small></> : <span className="ad__dim">Never</span>}</td>
                      <td><ToolButton tool={t.tool} label="Run" confirm={t.confirm} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Environment" action={<CopyReport text={report} />}>
          <dl className="adForms__dl">
            {env.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </Panel>
      </div>
    </>
  );
}
