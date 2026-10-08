import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminState } from "@/components/admin/admin-state";
import { Panel, when } from "@/components/admin/bits";
import { Head } from "@/components/admin/settings/kit";
import { AddConnection, ConnectionActions, DomainCheck, EnvTest, EventsKey, RoutingForm, SimulateSwitch, type ConnView } from "@/components/admin/settings/mail-connections";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getSetting } from "@/lib/admin/store";
import { hydrateSettings } from "@/lib/settings/store";
import { mailIsConfigured } from "@/lib/email";
import { KINDS } from "@/lib/mail-kinds";
import { listConnections } from "@/lib/mail-connections";
import { secretsReady } from "@/lib/mail-secrets";
import { WEBHOOK_KEY } from "@/lib/mail-webhook-alert";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Mail connections" };

/** Where the studio's mail can leave from: its own server, plus services added here. Owner only. */
export default async function Connections() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Mail connections are for the owner" description="Credentials are the owner's." /></section>;
  }
  await hydrateSettings();
  const conns = await listConnections();
  const def = getSetting("mail.default") || "env";
  const fb = getSetting("mail.fallback") || "";
  const envOk = mailIsConfigured();
  const options = [{ value: "env", label: "The studio's own server" }, ...(conns ?? []).map((c) => ({ value: c.id, label: c.name }))];
  const label = (id: string) => (id === "env" ? "The studio's own server" : conns?.find((c) => c.id === id)?.name ?? "Unknown");
  return (
    <>
      <Head title="Mail connections" line="How mail leaves the studio, and what happens when it fails.">
        <Link className="ad__btn" href="/admin/settings/email"><ArrowLeft aria-hidden="true" /> Email</Link>
        {conns && secretsReady() ? <AddConnection /> : null}
      </Head>
      <div className="ad__stack">
        {!secretsReady() ? (
          <p className="ad__note" role="note"><b>Adding a service needs one setting first.</b> Add <code>MAIL_SECRETS_KEY</code> to the hosting environment (64 hex characters, made with <code>openssl rand -hex 32</code>). It encrypts the keys saved here. Nothing is saved without it.</p>
        ) : null}
        {conns === null ? <AdminState kind="error" title="Connections are not set up yet" description="Apply migration 0044 in Settings › System, then reload." back={{ href: "/admin/settings/system", label: "Open system health" }} /> : null}
        <Panel title="Connections">
          <div className="ad__scroll" data-lenis-prevent>
            <table className="ad__t">
              <thead><tr><th>Connection</th><th>Used as</th><th>Last check</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
              <tbody>
                <tr>
                  <td><b>The studio&apos;s own server</b><small style={{ display: "block", color: "var(--ad-dim)" }}>Set in the hosting environment, never here.</small></td>
                  <td>{[def === "env" ? "Default" : "", fb === "env" ? "Fallback" : ""].filter(Boolean).join(", ") || "Available"}</td>
                  <td><span className={`ad__pill ${envOk ? "ad__pill--good" : "ad__pill--bad"}`}>{envOk ? "Configured" : "Not configured"}</span></td>
                  <td className="ad__rmC"><EnvTest /></td>
                </tr>
                {(conns ?? []).map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b><small style={{ display: "block", color: "var(--ad-dim)" }}>{KINDS[c.kind].label} · {c.fromEmail}</small></td>
                    <td>{[def === c.id ? "Default" : "", fb === c.id ? "Fallback" : ""].filter(Boolean).join(", ") || "Available"}</td>
                    <td>{c.health ? <><span className={`ad__pill ${c.health.status === "ok" ? "ad__pill--good" : "ad__pill--bad"}`}>{c.health.status === "ok" ? "Working" : "Failed"}</span><small style={{ display: "block", color: "var(--ad-dim)" }}>{when(c.health.at)}{c.health.status === "error" ? ` · ${c.health.message}` : ""}</small></> : <span className="ad__dim">Not checked yet</span>}</td>
                    <td className="ad__rmC"><ConnectionActions conn={c as ConnView} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Which one sends, and what if it fails">
          <div className="adSetPad">
            <p className="ad__dim">Now: everything goes through <b>{label(def)}</b>{fb ? <>, and if that fails, <b>{label(fb)}</b></> : ", with no fallback"}.</p>
            <RoutingForm options={options} def={def} fallback={fb} webhook={getSetting(WEBHOOK_KEY) ?? ""} digest={getSetting("mail.digest") === "yes"} />
          </div>
        </Panel>
        <Panel title="Bounces and complaints">
          <div className="adSetPad">
            <p className="ad__dim">Tell your mail service to post delivery events to these addresses. A bounce or complaint then puts the address on the suppression list at once, so it is never mailed again.</p>
            {getSetting("mail.eventsKey") ? (
              <ul className="adForms__dl" style={{ display: "grid", gap: ".5rem", listStyle: "none", padding: 0 }}>
                {["postmark", "brevo"].map((p) => <li key={p}><b style={{ textTransform: "capitalize" }}>{p}</b><code style={{ display: "block", overflowWrap: "anywhere" }}>{`${SITE_URL}/api/mail/events/${p}/${getSetting("mail.eventsKey")}`}</code></li>)}
              </ul>
            ) : <p className="ad__dim">No address yet.</p>}
            <EventsKey has={Boolean(getSetting("mail.eventsKey"))} />
          </div>
        </Panel>
        <Panel title="Sender domain check">
          <div className="adSetPad"><DomainCheck defaultDomain={(process.env.SMTP_FROM_EMAIL ?? "").split("@")[1] ?? ""} /></div>
        </Panel>
        <Panel title="Simulate mode">
          <div className="adSetPad">
            <p className="ad__dim">{getSetting("mail.simulate") === "yes" ? "On: nothing is being sent. Messages are built and logged only." : "Off: mail is sent for real. Turn it on to try things without emailing anyone."}</p>
            <SimulateSwitch on={getSetting("mail.simulate") === "yes"} />
          </div>
        </Panel>
      </div>
    </>
  );
}
