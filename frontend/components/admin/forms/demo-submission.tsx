import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import { isQuestion, isVisible, stepsFor } from "@/lib/onboarding";
import { getClient, getClients, getSubmission } from "@/lib/admin/store";
import { Empty, Panel, when } from "@/components/admin/bits";
import { AttachSubmission } from "@/components/admin/submission-forms";

/**
 * A demonstration brief from the in-memory store (`s1`, `s2` ...).
 *
 * These are not real entries and have no form page of their own; they are
 * still linked from the dashboard's demonstration rows, so they keep the page
 * they always had until section 4.9 removes the demonstration data.
 */
export function demoTitle(id: string) {
  const sub = getSubmission(id);
  return sub ? `${String(sub.answers.company ?? sub.answers.first_name ?? "Unnamed")} · Form` : null;
}

export default function DemoSubmission({ id }: { id: string }) {
  const sub = getSubmission(id);
  if (!sub) notFound();
  const live = false;
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
          {client || live ? null : <AttachSubmission submissionId={sub.id} clients={getClients()} />}
        </div>
      </div>

      <Panel title={`${answered} of ${total} questions answered`}>
        <div style={{ padding: ".4rem 1rem 1rem" }}>
          {steps.map((st) => {
            /* The same condition the form used, so a question the client never
               saw is not reported as one they skipped. */
            const fields = st.fields.filter((f) => isQuestion(f) && isVisible(f, sub.answers));
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
                        {/* `pre-line`, so a three-line answer (the domain ideas, any long
                            textarea) reads as three lines here instead of one run-on
                            string. Same fix as the client review screen. */}
                        <dd style={{ margin: ".15rem 0 0", whiteSpace: "pre-line" }}>
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
