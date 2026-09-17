import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { CORE_STEPS, SERVICE_STEPS, CLOSING_STEPS } from "@/lib/onboarding";
import { getClient, getClients, getSubmissions } from "@/lib/admin/data";
import { DemoNote, Empty, Panel, when } from "@/components/admin/bits";
import { SubmissionMenu } from "@/components/admin/row-actions";
import PageTourButton from "@/components/admin/tour/page-tour-button";

export const metadata = { title: "Forms" };

/**
 * What clients have sent, and what the form actually asks.
 *
 * THE QUESTION INVENTORY IS HERE RATHER THAN IN A BUILDER, for now and on
 * purpose. `lib/onboarding.ts` already IS a form schema -- typed fields,
 * steps, conditions, a schema-driven renderer -- so the builder's job is to
 * edit that shape rather than invent a second one. Until it can be persisted
 * there is nothing honest for a canvas to save, and a builder that cannot save
 * is a demo. What is useful today is seeing every question the form asks in
 * one place, which is what this is.
 */
export default async function FormsPage() {
  const clientById = new Map((await getClients({ includeArchived: true })).map((c) => [c.id, c]));
  const subs = await getSubmissions();
  const open = subs.filter((s) => s.status === "In progress");
  const done = subs.filter((s) => s.status === "Submitted");
  const allSteps = [...CORE_STEPS, ...SERVICE_STEPS, ...CLOSING_STEPS];
  const questions = allSteps.reduce((n, s) => n + s.fields.length, 0);
  /* Only what the attach dialog needs: a submission's menu offers the list of
     people it could belong to. */
  const clientList = (await getClients()).map((c) => ({ id: c.id, company: c.company }));

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Forms</h1>
          <p>{done.length} sent, {open.length} still open.</p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          <Link className="ad__btn" href="/onboarding" target="_blank">Open the form</Link>
        </div>
      </div>

      <DemoNote>
        A form that arrives from somebody not yet on the books can be turned
        into a client in one press, from the form itself. The visual builder
        edits the schema in <code>lib/onboarding.ts</code>, which is already
        typed fields, steps and conditions with a schema-driven renderer; it
        needs somewhere to save to before it is more than a canvas, so what is
        here is every question the live form asks.
      </DemoNote>

      <div className="ad__stack">
        <Panel title="Submissions">
          {subs.length ? (
            <div className="ad__scroll" data-tour="forms-table">
              <table className="ad__t">
                <thead><tr><th>Who</th><th>Service</th><th>Status</th><th>Started</th><th>Sent</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/admin/forms/${s.id}`}>
                          <b>{String(s.answers.company ?? s.answers.first_name ?? "Unnamed")}</b>
                        </Link>
                        <small>
                          {s.clientId
                            ? clientById.get(s.clientId)?.name
                            : <span className="ad__dim">Not linked to a client yet</span>}
                        </small>
                      </td>
                      <td>{SERVICES.find((x) => x.slug === s.service)?.short}</td>
                      <td>
                        <span className={`ad__pill ${s.status === "Submitted" ? "ad__pill--good" : "ad__pill--warn"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="num">{when(s.startedAt)}</td>
                      <td className="num">{s.submittedAt ? when(s.submittedAt) : <span className="ad__dim">Not yet</span>}</td>
                      <td className="ad__rmC"><SubmissionMenu submission={s} clients={clientList} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No submissions yet"
              action={<Link className="ad__btn" href="/onboarding" target="_blank">Open onboarding form</Link>}
            >
              Client onboarding responses and saved drafts will appear here.
            </Empty>
          )}
        </Panel>

        <Panel title={`The form asks ${questions} questions across ${allSteps.length} steps`}>
          <div style={{ padding: ".8rem 1rem" }}>
            {allSteps.map((st) => (
              <div key={st.id} style={{ padding: ".55rem 0", borderBottom: "1px solid var(--ad-line)" }}>
                <div className="ad__row" style={{ justifyContent: "space-between" }}>
                  <b>
                    {st.title}
                    {st.service ? (
                      <span className="ad__pill ad__pill--flat" style={{ marginLeft: ".45rem" }}>
                        {SERVICES.find((x) => x.slug === st.service)?.short}
                      </span>
                    ) : null}
                  </b>
                  <span className="ad__dim ad__num">{st.fields.length}</span>
                </div>
                <div className="ad__row" style={{ marginTop: ".35rem" }}>
                  {st.fields.map((f) => (
                    <span key={f.key} className="ad__pill ad__pill--flat" title={f.label}>
                      {f.label.length > 34 ? `${f.label.slice(0, 32)}…` : f.label}
                      {f.required ? <b style={{ color: "var(--ad-accent)" }}>*</b> : null}
                      {f.showIf ? <span className="ad__dim">·cond</span> : null}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
