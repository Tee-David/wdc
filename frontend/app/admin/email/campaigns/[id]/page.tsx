import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AreaGate from "@/components/admin/owner-only";
import { Panel, Tile, when } from "@/components/admin/bits";
import { AfterButtons, AudienceForm, SendForm, StateButtons } from "@/components/admin/email/campaign-ui";
import { DesignEditor } from "@/components/admin/email/design-editor";
import { audienceCount, getCampaign, reportFor } from "@/lib/campaigns";
import { allTags } from "@/lib/contacts";
import { kindByKey } from "@/lib/email-registry";
import "@/components/admin/email/design-editor.css";

export const metadata = { title: "Campaign" };

const STATE: Record<string, string> = { draft: "Draft", scheduled: "Scheduled", sending: "Sending", paused: "Paused", sent: "Sent", cancelled: "Cancelled" };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCampaign(id);
  if (!c) notFound();
  const k = kindByKey("newsletter")!;
  const draft = c.status === "draft";
  const [tags, reach, report] = await Promise.all([allTags(), audienceCount(c.audience), reportFor(c)]);
  const pct = (n: number) => (report.sent ? `${Math.round((n / report.sent) * 100)}%` : "–");
  return (
    <AreaGate area="settings" what="Email">
      <div className="ad__head">
        <div>
          <Link href="/admin/email?tab=campaigns" className="ad__btn ad__btn--plain"><ArrowLeft aria-hidden="true" /> Campaigns</Link>
          <h1>{c.title}</h1>
          <p><span className="ad__pill ad__pill--flat">{STATE[c.status] ?? c.status}</span>{c.scheduledAt ? ` · goes out ${when(c.scheduledAt)}` : ""}</p>
        </div>
        <StateButtons id={c.id} status={c.status} />
      </div>
      <div className="ad__stack">
        {!draft ? (
          <>
            <dl className="ad__tiles ad__tiles--4">
              <Tile label="Sent" value={String(report.sent)} note={report.pending ? `${report.pending} still to go` : `${c.recipients} chosen`} />
              <Tile label="Clicked" value={pct(report.clickers)} note={`${report.clickers} people, ${report.clicks} clicks`} />
              <Tile label="Opened (approximate)" value={pct(report.opened)} note="Includes anyone who clicked" />
              <Tile label="Unsubscribed" value={String(report.unsubscribed)} tone={report.unsubscribed ? "bad" : undefined} note={report.failed ? `${report.failed} failed to send` : "None failed"} />
            </dl>
            <Panel title="What to do next"><div style={{ padding: "1rem 1.25rem" }}><AfterButtons id={c.id} failed={report.failed} /></div></Panel>
            <Panel title="Links clicked">
              {report.links.length ? <table className="ad__t"><thead><tr><th>Link</th><th className="num">Clicks</th></tr></thead><tbody>{report.links.map((l) => <tr key={l.url}><td style={{ overflowWrap: "anywhere" }}>{l.url}</td><td className="num">{l.clicks}</td></tr>)}</tbody></table> : <p className="ad__dim" style={{ padding: "1rem 1.25rem", margin: 0 }}>No link has been clicked yet{c.track === "off" ? ", and tracking is off for this campaign" : ""}.</p>}
            </Panel>
          </>
        ) : (
          <>
            <Panel title="Who gets it">
              <div style={{ padding: "1rem 1.25rem" }}>
                <p className="ad__dim">Right now this reaches <b>{reach}</b> {reach === 1 ? "person" : "people"}.</p>
                <AudienceForm id={c.id} title={c.title} tags={tags} audience={c.audience} track={c.track} />
              </div>
            </Panel>
            <DesignEditor kind="newsletter" name="This campaign" tags={[...k.tags]} starters={[{ name: "This campaign", design: c.design }]} saved={null} history={[]} campaignId={c.id} />
            <Panel title="Send it">
              <div style={{ padding: "1rem 1.25rem" }}>
                <p className="ad__dim">Use Send me a test above first. A test goes to you alone, with sample names.</p>
                <SendForm id={c.id} recipients={reach} />
              </div>
            </Panel>
          </>
        )}
      </div>
    </AreaGate>
  );
}
