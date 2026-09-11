import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import { stepsFor } from "@/lib/onboarding";
import { getClient, getClients, getSubmission } from "@/lib/admin/store";
import { Empty, Panel, when } from "@/components/admin/bits";
import { AttachSubmission } from "@/components/admin/submission-forms";

/* NO generateStaticParams: a form that arrives after the build still has to
   open. */

/**
 * One brief, read back in the order it was asked.
 *
 * IT WALKS THE SCHEMA, not the answer map. Iterating the answers would print
 * them in whatever order the object happens to hold and label them with their
 * database keys; walking `stepsFor(service)` prints them under the step
 * headings the client saw, with the questions as they were worded, and shows
 * what was LEFT BLANK. A gap is information: it is the thing to ask about on
 * the call.
 */
export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sub = getSubmission(id);
  if (!sub) notFound();
  const client = sub.clientId ? getClient(sub.clientId) : null;
  const steps = stepsFor(sub.service);

  const shown = (key: string) => sub.answers[key];
  const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));
  const answered = steps.flatMap((s) => s.fields).filter((f) => has(shown(f.key))).length;
  const total = steps.reduce((n, s) => n + s.fields.length, 0);

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/forms">Forms</Link></p>
          <h1>{String(sub.answers.company ?? sub.answers.first_name ?? "Unnamed")}</h1>
          <p>
            {SERVICES.find((x) => x.slug === sub.service)?.short}
            {" · started "}{when(sub.startedAt)}
            {sub.submittedAt ? ` · sent ${when(sub.submittedAt)}` : " · not sent yet"}
            {client ? <> · <Link href={`/admin/clients/${client.id}`}>{client.company}</Link></> : null}
          </p>
        </div>
        <div className="ad__row">
          <span className={`ad__pill ${sub.status === "Submitted" ? "ad__pill--good" : "ad__pill--warn"}`}>
            {sub.status}
          </span>
          {client ? null : <AttachSubmission submissionId={sub.id} clients={getClients()} />}
        </div>
      </div>

      <Panel title={`${answered} of ${total} questions answered`}>
        <div style={{ padding: ".4rem 1rem 1rem" }}>
          {steps.map((st) => {
            const fields = st.fields.filter((f) => {
              /* The same condition the form used, so a question the client
                 never saw is not reported as one they skipped. */
              if (!f.showIf) return true;
              const v = sub.answers[f.showIf.key];
              return Array.isArray(v)
                ? v.some((x) => f.showIf!.equals.includes(x))
                : typeof v === "string" && f.showIf.equals.includes(v);
            });
            if (!fields.length) return null;
            return (
              <section key={st.id} style={{ paddingTop: ".9rem" }}>
                <h3 style={{ fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ad-dim)" }}>
                  {st.title}
                </h3>
                <dl style={{ margin: ".5rem 0 0" }}>
                  {fields.map((f) => {
                    const v = shown(f.key);
                    return (
                      <div key={f.key} style={{ padding: ".5rem 0", borderBottom: "1px solid var(--ad-line)" }}>
                        <dt className="ad__dim" style={{ fontSize: ".82rem" }}>{f.label}</dt>
                        <dd style={{ margin: ".15rem 0 0" }}>
                          {has(v)
                            ? (Array.isArray(v) ? v.join(", ") : String(v))
                            : <em className="ad__dim">Not answered</em>}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            );
          })}
          {!total && <Empty title="This form has no questions" />}
        </div>
      </Panel>
    </>
  );
}
