import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FORMS, type FormDef } from "@/lib/forms/registry";
import { formSummaries, summaryOf, type FormSummary } from "@/lib/forms/entries";
import { AdminState } from "@/components/admin/admin-state";
import { Panel, when } from "@/components/admin/bits";
import PageTourButton from "@/components/admin/tour/page-tour-button";

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

async function load(): Promise<{ state: "off" | "error" | "ok"; all: Record<string, FormSummary> }> {
  if (!configured()) return { state: "off", all: {} };
  try { return { state: "ok", all: await formSummaries() }; } catch (error) {
    console.error("[forms] summaries could not be read", error instanceof Error ? error.message : error);
    return { state: "error", all: {} };
  }
}

function counts(form: FormDef, s: FormSummary) {
  if (form.source === "newsletter") {
    return <><b className="ad__num">{s.total}</b> subscribed{s.recent ? <small>+{s.recent} in the last 30 days</small> : null}</>;
  }
  return (
    <>
      <b className="ad__num">{s.unread}</b> unread of <span className="ad__num">{s.total}</span>
      {form.source === "onboarding" && s.drafts ? <small>{s.drafts} {s.drafts === 1 ? "draft" : "drafts"} in progress</small> : null}
    </>
  );
}

function FormTable({ forms, all, tour }: { forms: FormDef[]; all: Record<string, FormSummary>; tour?: string }) {
  return (
    <div className="ad__scroll" data-tour={tour}>
      <table className="ad__t">
        <thead>
          <tr><th>Form</th><th>State</th><th>Entries</th><th>Last entry</th><th className="ad__rmH"><span className="ad__sr">Open the form</span></th></tr>
        </thead>
        <tbody>
          {forms.map((f) => {
            const s = summaryOf(all, f.key);
            return (
              <tr key={f.key}>
                <td>
                  <Link href={`/admin/forms/${f.key}`}><b>{f.title}</b></Link>
                  <small>{f.publicLabel}</small>
                </td>
                <td>
                  <span className="ad__pill ad__pill--good">Open</span>
                  {s.noticeProblems ? (
                    <Link href={`/admin/forms/${f.key}`} className="ad__pill ad__pill--bad" style={{ marginLeft: ".35rem" }}>
                      {s.noticeProblems} notice{s.noticeProblems === 1 ? "" : "s"} not delivered
                    </Link>
                  ) : null}
                </td>
                <td>{counts(f, s)}</td>
                <td className="num">{s.last ? when(s.last) : <span className="ad__dim">No entries yet</span>}</td>
                <td className="ad__rmC">
                  <a className="ad__rm" href={f.publicPath} target="_blank" rel="noopener" aria-label={`Open the ${f.title} form`} title="Open the form">
                    <ExternalLink aria-hidden="true" />
                  </a>
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
  const { state, all } = await load();
  const unread = FORMS.reduce((n, f) => n + (f.inbox ? summaryOf(all, f.key).unread : 0), 0);

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Forms</h1>
          <p>{state === "ok" ? `${unread} unread across the site's forms.` : "The site's forms and their entries."}</p>
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
          <Panel title="Onboarding" dataTour="forms-live">
            <FormTable forms={FORMS.filter((f) => f.group === "onboarding")} all={all} tour="forms-table" />
          </Panel>
          <Panel title="Website">
            <FormTable forms={FORMS.filter((f) => f.group === "website")} all={all} />
          </Panel>
          <p className="ad__dim" style={{ margin: 0, fontSize: ".85rem" }}>
            These forms are defined in the site&apos;s code. This is where their entries, and the emails they send, are looked after.
          </p>
        </div>
      )}
    </>
  );
}
