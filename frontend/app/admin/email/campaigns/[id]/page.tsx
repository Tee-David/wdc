import { notFound } from "next/navigation";
import { PageHead } from "@/components/admin/page-head";
import { Mail, PenSquare } from "lucide-react";
import AreaGate from "@/components/admin/owner-only";
import { Empty, when } from "@/components/admin/bits";
import { RailCard, Workbench } from "@/components/admin/workbench";

/** A card in the Flow list-card look: a heading row and what it holds. */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="adList" aria-label={title}><div className="adList__hd"><h2>{title}</h2></div>{children}</section>;
}
import { AfterButtons, AudienceForm, DuplicateCampaign, SendForm, StateButtons, TagClickers } from "@/components/admin/email/campaign-ui";
import { CAMPAIGN_STATE } from "@/components/admin/email/campaigns-tab";
import { DesignEditor } from "@/components/admin/email/design-editor";
import { audienceCount, getCampaign, reportFor } from "@/lib/campaigns";
import { kindByKey } from "@/lib/email-registry";
import { COMPANY_NAME } from "@/lib/site";
import "@/components/admin/email/design-editor.css";
import "@/components/admin/email/campaigns.css";

export const metadata = { title: "Campaign" };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCampaign(id);
  if (!c) notFound();
  const k = kindByKey("newsletter")!;
  const draft = c.status === "draft";
  const [reach, report] = await Promise.all([audienceCount(c.audience), reportFor(c)]);
  const st = CAMPAIGN_STATE[c.status] ?? { label: c.status, tone: "" };
  const pct = (n: number) => (report.sent ? `${Math.round((n / report.sent) * 100)}%` : "–");
  const max = Math.max(1, ...report.links.map((l) => l.clicks));
  const first = c.title.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  const reaches = `${reach.toLocaleString("en-NG")} ${reach === 1 ? "person" : "people"}`;
  return (
    <AreaGate area="settings" what="Email">
      <PageHead
        title={c.title}
        crumbs={[{ href: "/admin/email?tab=campaigns", label: "Marketing" }]}
        lede={<>
          <span className={`ad__pill${st.tone ? ` ad__pill--${st.tone}` : ""}`}>{st.label}</span>
          {c.scheduledAt && c.status === "scheduled" ? ` Goes out ${when(c.scheduledAt)}.` : c.startedAt ? ` Started ${when(c.startedAt)}.` : ""}
        </>}
        action={<span className="ad__row"><StateButtons id={c.id} status={c.status} /><DuplicateCampaign id={c.id} /></span>}
      />
      {!draft ? (
          <Workbench railLabel="After sending" rail={<>
            <RailCard title="What to do next"><AfterButtons id={c.id} failed={report.failed} /></RailCard>
            <RailCard title="Who got it">
              <p className="adCp__line">
                {c.audience.onlyIds ? "A chosen group: people who got an earlier campaign and did not open it." : <>
                  {c.audience.types.length ? c.audience.types.map((t) => `${t}s`).join(", ") : "Everyone who asked to hear from us"}
                  {c.audience.tags.length ? `, with the tag ${c.audience.tags.join(" or ")}` : ""}
                  {c.audience.excludeTags.length ? `, leaving out ${c.audience.excludeTags.join(" and ")}` : ""}.
                </>}
              </p>
              <p className="ad__dim adCp__line">Subject: {c.design.subject}</p>
            </RailCard>
          </>}>
            {report.sent === 0 && report.pending === 0 ? (
              <section className="ad__panel"><Empty title="Nothing to report yet" icon={Mail} kind="first-use">{c.status === "scheduled" ? "The report fills in once this campaign goes out." : "Nobody has been sent this campaign, so there is nothing to count."}</Empty></section>
            ) : (
              <Panel title="Report">
                <div className="adCp__pad">
                  <dl className="adCp__mini">
                    <div><dt>Sent</dt><dd>{report.sent.toLocaleString("en-NG")}</dd><small>{report.pending ? `${report.pending} still to go` : `${c.recipients.toLocaleString("en-NG")} chosen`}</small></div>
                    <div><dt>Opened</dt><dd>{c.track === "off" ? "–" : pct(report.opened)}</dd><small>{c.track === "off" ? "Tracking was off" : "Approximate. Includes anyone who clicked"}</small></div>
                    <div><dt>Clicked</dt><dd>{c.track === "full" ? pct(report.clickers) : "–"}</dd><small>{c.track === "full" ? `${report.clickers} ${report.clickers === 1 ? "person" : "people"}, ${report.clicks} clicks` : c.track === "anonymous" ? `${report.clicks} clicks, counted without names` : "Tracking was off"}</small></div>
                    <div><dt>Bounced</dt><dd>{report.bounced.toLocaleString("en-NG")}</dd><small>{report.failed ? `${report.failed} more failed to send` : "None failed to send"}</small></div>
                    <div><dt>Asked to stop</dt><dd>{report.unsubscribed.toLocaleString("en-NG")}</dd><small>Left out of every send from now on</small></div>
                    <div><dt>Delivered</dt><dd>{report.sent ? (report.sent - report.bounced).toLocaleString("en-NG") : "–"}</dd><small>Sent, less the bounced</small></div>
                  </dl>
                  <h3>Clicks by link</h3>
                  {report.links.length ? (
                    <ul className="adCp__bars">
                      {report.links.map((l) => (
                        <li key={l.url} className="adCp__bar">
                          <div><span>{l.url}</span><b>{l.clicks.toLocaleString("en-NG")}</b></div>
                          <i role="img" aria-label={`${l.url}: ${l.clicks} clicks`}><b style={{ width: `${(l.clicks / max) * 100}%` }} /></i>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="ad__dim" style={{ margin: 0 }}>No link has been clicked yet{c.track === "off" ? ", and tracking was off for this campaign" : ". Clicks fill in over the next day"}.</p>}
                  {c.track === "full" && report.clickers ? <TagClickers id={c.id} people={report.clickers} suggested={`clicked-${first}`} /> : null}
                </div>
              </Panel>
            )}
          </Workbench>
        ) : (
          <div className="adCp__draft">
            <div id="campaign-design">
              <DesignEditor kind="newsletter" name="This campaign" tags={[...k.tags]} starters={[{ name: "This campaign", design: c.design }]} saved={null} history={[]} campaignId={c.id} />
            </div>
            <div className="adCp__pair">
            <Panel title="Who gets it">
              <div className="adCp__pad">
                <AudienceForm id={c.id} title={c.title} audience={c.audience} track={c.track} reach={reach} />
              </div>
            </Panel>
            <Panel title="Send it">
              <div className="adCp__pad">
                <div className="adCp__mail">
                  <span aria-hidden="true"><Mail /></span>
                  <div style={{ flex: 1 }}><b>{c.design.subject}</b><br /><small>From {COMPANY_NAME} · an unsubscribe link is added for you · {reaches} right now</small></div>
                  <a className="ad__btn" href="#campaign-design"><PenSquare aria-hidden="true" /> Edit the email</a>
                </div>
                <p className="ad__dim" style={{ margin: 0 }}>Send yourself a test from the builder first. A test goes to you alone, with sample names.</p>
                <SendForm id={c.id} recipients={reach} />
              </div>
            </Panel>
            </div>
          </div>
        )}
    </AreaGate>
  );
}
