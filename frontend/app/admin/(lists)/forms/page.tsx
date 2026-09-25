import Link from "next/link";
import { ListSearch } from "@/components/admin/list-search";
import { ClipboardList, ExternalLink, Globe, Inbox, Mail, MailWarning, MessageCircle, Newspaper, Smartphone, Star, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import { FORMS, type FormDef } from "@/lib/forms/registry";
import { formSummaries, summaryOf, type FormSummary } from "@/lib/forms/entries";
import { availability, type Availability } from "@/lib/forms/settings-db";
import { AdminState } from "@/components/admin/admin-state";
import { Panel, Tile, when } from "@/components/admin/bits";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import "@/components/admin/forms/forms.css";

export const metadata = { title: "Forms" };

/**
 * The site's forms, and what is waiting in each.
 *
 * EIGHT ROWS, BECAUSE THERE ARE EIGHT FORMS. They are defined in the site's
 * code (`lib/forms/registry.ts`), so there is no create, copy or delete here:
 * this is where their entries and their emails are looked after. Each row goes
 * to that form's entries.
 */

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);

async function load(): Promise<{ state: "off" | "error" | "ok"; all: Record<string, FormSummary>; open: Record<string, Availability> }> {
  if (!configured()) return { state: "off", all: {}, open: {} };
  try {
    const [all, open] = await Promise.all([
      formSummaries(),
      Promise.all(FORMS.map(async (f) => [f.key, await availability(f)] as const)).then(Object.fromEntries),
    ]);
    return { state: "ok", all, open };
  } catch (error) {
    console.error("[forms] summaries could not be read", error instanceof Error ? error.message : error);
    return { state: "error", all: {}, open: {} };
  }
}

const REASON: Record<string, string> = { closed: "Closed", "not-yet": "Not open yet", ended: "Closed, date passed", limit: "Limit reached" };

/* One icon per form: the service an onboarding brief is for, or what a
   website form is. A solid tile, like every icon tile in the admin. */
const ICON: Record<string, LucideIcon> = {
  branding: Star, web: Globe, seo: TrendingUp, apps: Smartphone, software: Zap, social: MessageCircle,
  contact: Mail, newsletter: Newspaper,
};
function iconFor(f: FormDef) {
  return ICON[f.key.replace(/^onboarding-/, "")] ?? ClipboardList;
}

function FormTable({ forms, all, open, tour }: { forms: FormDef[]; all: Record<string, FormSummary>; open: Record<string, Availability>; tour?: string }) {
  const drafts = forms.some((f) => f.source === "onboarding");
  return (
    <div className="ad__scroll" data-tour={tour}>
      <table className="ad__t adForms__list">
        <thead>
          <tr>
            <th>Form</th><th>State</th><th className="num">Unread</th><th className="num">Entries</th>
            {drafts ? <th className="num">Drafts</th> : null}
            <th>Last entry</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {forms.map((f) => {
            const s = summaryOf(all, f.key);
            const Icon = iconFor(f);
            const a = open[f.key];
            const news = f.source === "newsletter";
            return (
              <tr key={f.key}>
                <td>
                  <span className="ad__who">
                    <span className="adForms__icon" aria-hidden="true"><Icon /></span>
                    <span>
                      <Link href={`/admin/forms/${f.key}`}><b>{f.title}</b></Link>
                      <small>{f.publicLabel}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="ad__row">
                    {!a || a.open
                      ? <span className="ad__pill ad__pill--good">Open</span>
                      : <span className="ad__pill ad__pill--warn">{REASON[a.reason]}</span>}
                    {s.noticeProblems ? (
                      <Link href={`/admin/forms/${f.key}`} className="ad__pill ad__pill--bad">
                        {s.noticeProblems} notice{s.noticeProblems === 1 ? "" : "s"} not delivered
                      </Link>
                    ) : null}
                  </span>
                </td>
                <td className="num">
                  {news ? <span className="ad__dim">–</span>
                    : s.unread ? <span className="ad__count adForms__unread" aria-label={`${s.unread} unread`}>{s.unread}</span>
                    : <span className="ad__dim">0</span>}
                </td>
                <td className="num">
                  {s.total}
                  {news && s.recent ? <small>+{s.recent} in 30 days</small> : null}
                </td>
                {drafts ? <td className="num">{f.source === "onboarding" ? s.drafts : <span className="ad__dim">–</span>}</td> : null}
                <td className="ad__dim">{s.last ? when(s.last) : "No entries yet"}</td>
                <td className="ad__rmC">
                  <span className="ad__row adForms__acts">
                    <Link className="ad__btn" href={`/admin/forms/${f.key}`}>{news ? "Subscribers" : "Entries"}</Link>
                    <a className="ad__rm" href={f.publicPath} target="_blank" rel="noopener" aria-label={`Open the ${f.title} form`} title="Open the form">
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function FormsPage() {
  const { state, all, open } = await load();
  const unread = FORMS.reduce((n, f) => n + (f.inbox ? summaryOf(all, f.key).unread : 0), 0);
  /* The four figures, each a sum of what the rows below say. */
  const inbox = FORMS.filter((f) => f.inbox);
  const withUnread = inbox.filter((f) => summaryOf(all, f.key).unread).length;
  const entries = FORMS.filter((f) => f.source !== "newsletter").reduce((n, f) => n + summaryOf(all, f.key).total, 0);
  const drafts = FORMS.reduce((n, f) => n + (f.source === "onboarding" ? summaryOf(all, f.key).drafts : 0), 0);
  const newsletter = FORMS.find((f) => f.source === "newsletter");
  const subs = newsletter ? summaryOf(all, newsletter.key) : null;
  const failed = FORMS.reduce((n, f) => n + summaryOf(all, f.key).noticeProblems, 0);

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Forms</h1>
          <p>Every form on the site, its entries, and who hears about them.</p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          <Link className="ad__btn" href="/onboarding" target="_blank">Open onboarding</Link>
        </div>
      </div>

      {state === "off" ? (
        <AdminState kind="error" title="The form database is not connected"
          description="COCKROACHDB_URL is not set, so the forms cannot save and there is nothing to show." />
      ) : state === "error" ? (
        <AdminState kind="error" title="The forms could not be loaded"
          description="The database did not answer. Nothing has been lost; reload in a minute." />
      ) : (
        <div className="ad__stack">
          <dl className="ad__tiles ad__tiles--4" style={{ margin: 0 }}>
            <Tile label="Unread entries" value={String(unread)} icon={Inbox} iconTone="live"
              note={withUnread ? `Across ${withUnread} form${withUnread === 1 ? "" : "s"}` : "Nothing waiting"} />
            <Tile label="Entries" value={String(entries)} icon={ClipboardList}
              note={drafts ? `${drafts} onboarding draft${drafts === 1 ? "" : "s"} in progress` : "No drafts in progress"} />
            <Tile label="Newsletter" value={String(subs?.total ?? 0)} icon={Newspaper} iconTone="good"
              note={subs?.recent ? `+${subs.recent} in the last 30 days` : "Subscribed"} />
            <Tile label="Notices that failed" value={String(failed)} icon={MailWarning} iconTone={failed ? "bad" : "good"}
              note={failed ? "Retry them from the email log" : "Every studio notice went"} />
          </dl>
          <section className="ad__panel"><ListSearch target="forms-lists" placeholder="Search forms" noun="forms" /></section>
          <div className="ad__stack" id="forms-lists">
          <Panel title="Onboarding" dataTour="forms-live">
            <FormTable forms={FORMS.filter((f) => f.group === "onboarding")} all={all} open={open} tour="forms-table" />
          </Panel>
          <Panel title="Website">
            <FormTable forms={FORMS.filter((f) => f.group === "website")} all={all} open={open} />
          </Panel>
          </div>
          <p className="ad__dim" style={{ margin: 0, fontSize: ".85rem" }}>
            These forms are defined in the site&apos;s code. This is where their entries, and the emails they send, are looked after.
          </p>
        </div>
      )}
    </>
  );
}
