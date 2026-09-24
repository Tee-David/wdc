import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import { stepsFor } from "@/lib/onboarding";
import { findDuplicateClient, getClient, getClients, getSubmission } from "@/lib/admin/store";
import type { Submission } from "@/lib/admin/types";
import { answer, isLiveSubmissionId, liveSubmission } from "@/lib/onboarding-admin";
import { LiveSubmissionClient } from "@/components/admin/submission-forms";
import { Empty, Panel, when } from "@/components/admin/bits";
import { AttachSubmission } from "@/components/admin/submission-forms";

/* NO generateStaticParams: a form that arrives after the build still has to
   open. */

/* See the note beside the same function in clients/[id]/page.tsx. The name
   falls back the same way the page's own `<h1>` does, so the tab and the
   heading never disagree about what to call an unnamed lead. */
/** A demonstration row from the store, or a live one from the table. */
async function load(id: string): Promise<{ sub: Submission; live: boolean } | null> {
  if (isLiveSubmissionId(id)) {
    try {
      const sub = await liveSubmission(id);
      return sub ? { sub, live: true } : null;
    } catch {
      return null;
    }
  }
  const sub = getSubmission(id);
  return sub ? { sub, live: false } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const sub = (await load(id))?.sub;
  if (!sub) notFound();
  const name = String(sub.answers.company ?? sub.answers.first_name ?? "Unnamed");
  return { title: `${name} · Form` };
}

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
  const found = await load(id);
  if (!found) notFound();
  const { sub, live } = found;
  /* A live brief's client is whoever has its email or phone; see
     lib/onboarding-admin.ts for why that is derived rather than stored. */
  const client = live
    ? findDuplicateClient(answer(sub, "email"), answer(sub, "phone"))
    : sub.clientId ? getClient(sub.clientId) : null;
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
          {client ? null : live
            ? <LiveSubmissionClient submissionId={sub.id} />
            : <AttachSubmission submissionId={sub.id} clients={getClients()} />}
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
