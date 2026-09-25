import type { Metadata } from "next";
import { r2PublicBase } from "@/lib/r2";
import { answerText, type Answers, type FileAnswer } from "@/lib/forms/custom-def";
import { versionDef } from "@/lib/forms/custom";
import { findForm } from "@/lib/forms/find";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import { stepsFor } from "@/lib/onboarding";
import type { FormDef } from "@/lib/forms/registry";
import { answeredCount, clientFor, entryIds, getEntry, markRead, readFilters, type Entry } from "@/lib/forms/entries";
import { eventsFor, type EntryEvent } from "@/lib/forms/events";
import { listForRecord } from "@/lib/message-log";
import { Empty, Panel, when } from "@/components/admin/bits";
import { LiveSubmissionClient } from "@/components/admin/submission-forms";
import { AddNote, EntryState, ResendEmail } from "@/components/admin/forms/entry-actions";
import { NOTIFICATIONS } from "@/lib/forms/settings";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import "@/components/admin/forms/forms.css";

type Props = {
  params: Promise<{ form: string; entry: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function load(formKey: string, id: string): Promise<{ form: FormDef; entry: Entry } | null> {
  const form = await findForm(formKey);
  if (!form) return null;
  try {
    const entry = await getEntry(form, id);
    return entry ? { form, entry } : null;
  } catch {
    return null;
  }
}

const who = (form: FormDef, e: Entry) =>
  (form.source === "onboarding" ? String(e.answers.company ?? "") : "") || e.name || e.email || "Not named";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { form, entry } = await params;
  const found = await load(form, entry);
  if (!found) notFound();
  return { title: `${who(found.form, found.entry)} · ${found.form.title}` };
}

const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));
const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

/** A built form's answers, labelled with the questions of the version it answered. */
async function CustomAnswers({ form, entry }: { form: FormDef; entry: Entry }) {
  const def = await versionDef(form.key, entry.version ?? 0);
  const bucket = r2PublicBase();
  const answers = entry.answers as unknown as Answers;
  const fields = (def?.fields ?? []).filter((f) => f.type !== "heading");
  return (
    <Panel title={def ? `Version ${entry.version} of the form` : "Answers"}>
      <dl className="adForms__dl">
        {fields.length ? fields.map((f) => {
          const a = answers[f.id];
          const files = Array.isArray(a) && a.length && typeof a[0] === "object" ? (a as FileAnswer[]) : null;
          return (
            <div key={f.id}>
              <dt>{f.label}</dt>
              <dd>
                {a === undefined ? <span className="ad__dim">Not answered</span>
                  : files ? (
                    <ul className="adForms__files">{files.map((x) => (
                      <li key={x.key}>{bucket ? <a href={`${bucket}/${x.key}`} target="_blank" rel="noopener noreferrer">{x.name}</a> : x.name} <span className="ad__dim">({Math.max(1, Math.round(x.size / 1024))} KB)</span></li>
                    ))}</ul>
                  ) : answerText(a)}
              </dd>
            </div>
          );
        }) : Object.entries(answers).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{answerText(v)}</dd></div>)}
      </dl>
    </Panel>
  );
}

function Answers({ form, entry, hideEmpty }: { form: FormDef; entry: Entry; hideEmpty: boolean }) {
  if (form.source === "custom") return <CustomAnswers form={form} entry={entry} />;
  if (form.source === "contact") {
    return (
      <Panel title={entry.topic || "Enquiry"}>
        <dl className="adForms__dl">
          <div><dt>Message</dt><dd>{entry.message}</dd></div>
          <div><dt>Email</dt><dd><a href={`mailto:${entry.email}`}>{entry.email}</a></dd></div>
          {entry.phone ? <div><dt>Phone</dt><dd>{entry.phone}</dd></div> : null}
        </dl>
      </Panel>
    );
  }
  if (form.source === "newsletter") {
    return (
      <Panel title="Subscriber">
        <dl className="adForms__dl">
          <div><dt>Email</dt><dd>{entry.email}</dd></div>
          <div><dt>Signed up from</dt><dd>{entry.source}</dd></div>
          <div><dt>Status</dt><dd>{entry.unsubscribedAt ? `Unsubscribed ${when(entry.unsubscribedAt)}` : "Subscribed"}</dd></div>
        </dl>
      </Panel>
    );
  }
  /* WALKS THE SCHEMA, not the answer map, so every answer sits under the
     question as the client saw it and a gap shows as a gap: the thing to ask
     about on the call. Questions they were never shown are left out. */
  const steps = stepsFor(form.service!);
  const { answered, total } = answeredCount(form.service!, entry.answers);
  return (
    <Panel title={`${answered} of ${total} questions answered`}
      action={<Link className="ad__btn adForms__noPrint" href={`?${hideEmpty ? "" : "hide=1"}`}>{hideEmpty ? "Show unanswered" : "Hide unanswered"}</Link>}>
      <div style={{ padding: "0 1rem 1rem" }}>
        {steps.map((st) => {
          const fields = st.fields.filter((f) => {
            if (f.showIf) {
              const v = entry.answers[f.showIf.key];
              const shown = Array.isArray(v) ? v.some((x) => f.showIf!.equals.includes(x)) : typeof v === "string" && f.showIf.equals.includes(v);
              if (!shown) return false;
            }
            return !hideEmpty || has(entry.answers[f.key]);
          });
          if (!fields.length) return null;
          return (
            <section key={st.id} style={{ paddingTop: ".9rem" }}>
              <h3 style={{ fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ad-dim)" }}>{st.title}</h3>
              <dl className="adForms__dl" style={{ padding: 0 }}>
                {fields.map((f) => {
                  const v = entry.answers[f.key];
                  return (
                    <div key={f.key}>
                      <dt>{f.label}</dt>
                      <dd>{has(v) ? (Array.isArray(v) ? v.join(", ") : String(v)) : <em className="ad__dim">Not answered</em>}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}

const KIND: Record<EntryEvent["kind"], string> = { note: "Note", state: "Changed", email: "Email", client: "Client" };

export default async function EntryPage({ params, searchParams }: Props) {
  const { form: formKey, entry: id } = await params;
  const found = await load(formKey, id);
  if (!found) notFound();
  const { form, entry } = found;
  const sp = await searchParams;

  /* Opening it is reading it; behind the response, so the page never waits. */
  if (!entry.read) after(() => markRead(form, entry.id).catch(() => undefined));

  const f = readFilters(form, sp);
  const listQuery = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "hide" ? [[k, v]] : []))).toString();
  const [filteredIds, events, messages] = await Promise.all([
    entryIds(form, f).catch(() => [] as string[]),
    eventsFor(entry.id).catch(() => [] as EntryEvent[]),
    listForRecord(entry.id),
  ]);
  /* AN ENTRY OUTSIDE THE CURRENT FILTER (opened from an email, a search or
     an old link) still steps through its form: the unfiltered list, and the
     links drop the filter so they lead where they say. */
  const inList = filteredIds.includes(entry.id);
  const ids = inList ? filteredIds : await entryIds(form, readFilters(form, {})).catch(() => [] as string[]);
  const at = ids.indexOf(entry.id);
  const prev = at > 0 ? ids[at - 1] : null;
  const next = at >= 0 && at < ids.length - 1 ? ids[at + 1] : null;
  const link = (x: string) => `/admin/forms/${form.key}/entries/${x}${inList && listQuery ? `?${listQuery}` : ""}`;
  const client = form.source === "newsletter" ? null : clientFor(entry);
  const mayResend = can(await adminRole(), "settings");

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim">
            <Link href="/admin/forms">Forms</Link> / <Link href={`/admin/forms/${form.key}${listQuery ? `?${listQuery}` : ""}`}>{form.title}</Link>
          </p>
          <h1>{who(form, entry)}</h1>
          <p>
            {entry.serial ? `${form.noun} #${entry.serial} · ` : ""}
            {form.service ? `${SERVICES.find((s) => s.slug === form.service)?.short} · ` : ""}
            {entry.draft ? `Draft, last saved ${time(entry.at)}` : `Received ${time(entry.at)}`}
          </p>
        </div>
        <div className="ad__row adForms__noPrint">
          {/* BOTH, ALWAYS, with where this one sits: a button that vanishes at
              the end of the list reads as a missing feature, not an end. */}
          {ids.length > 1 ? (
            <nav className="adEntryNav" aria-label={`${form.noun} ${at + 1} of ${ids.length}`}>
              {prev
                ? <Link className="ad__btn" href={link(prev)} rel="prev"><ChevronLeft aria-hidden="true" /> Previous</Link>
                : <span className="ad__btn is-off" aria-disabled="true"><ChevronLeft aria-hidden="true" /> Previous</span>}
              <span className="adEntryNav__at ad__dim">{at + 1} of {ids.length}</span>
              {next
                ? <Link className="ad__btn" href={link(next)} rel="next">Next <ChevronRight aria-hidden="true" /></Link>
                : <span className="ad__btn is-off" aria-disabled="true">Next <ChevronRight aria-hidden="true" /></span>}
            </nav>
          ) : null}
          {form.source === "contact" ? (
            <a className="ad__btn ad__btn--primary" href={`mailto:${entry.email}?subject=${encodeURIComponent(`Re: ${entry.topic ?? "your enquiry"}`)}`}>Reply by email</a>
          ) : null}
        </div>
      </div>

      {form.inbox ? (
        <div style={{ marginBottom: ".9rem" }}>
          <EntryState formKey={form.key} id={entry.id} read={true} starred={entry.starred} box={entry.box} />
        </div>
      ) : null}

      <div className="adForms__entry">
        <div className="ad__stack">
          <Answers form={form} entry={entry} hideEmpty={sp.hide === "1"} />

          {form.inbox ? (
            <Panel title="History">
              <AddNote formKey={form.key} id={entry.id} />
              {events.length ? (
                <ol className="adForms__timeline">
                  {events.map((e) => (
                    <li key={e.id}>
                      <span><b>{KIND[e.kind]}</b> · {e.body}</span>
                      <small>{e.actor} · {time(e.at)}</small>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty title="Nothing has happened here yet">Notes, changes and emails about this entry are kept here.</Empty>
              )}
            </Panel>
          ) : null}
        </div>

        <div className="ad__stack">
          <Panel title="Details">
            <dl className="adForms__dl">
              {entry.serial ? <div><dt>Number</dt><dd>{form.noun} #{entry.serial}</dd></div> : null}
              <div><dt>{form.source === "newsletter" ? "Subscribed" : "Received"}</dt><dd>{time(entry.at)}</dd></div>
              {form.inbox ? (
                <div><dt>State</dt><dd>
                  {entry.box === "inbox" ? "Inbox" : entry.box === "spam" ? "Spam" : "Trash"}
                  {entry.starred ? " · starred" : ""}{entry.draft ? " · draft" : ""}
                </dd></div>
              ) : null}
              {entry.email ? <div><dt>Email</dt><dd><a href={`mailto:${entry.email}`}>{entry.email}</a></dd></div> : null}
              {entry.phone ? <div><dt>Phone</dt><dd>{entry.phone}</dd></div> : null}
              {form.source !== "newsletter" ? (
                <div><dt>Client</dt><dd>
                  {client ? <Link href={`/admin/clients/${client.id}`}>{client.company}</Link>
                    : form.source === "onboarding" && !entry.draft ? <LiveSubmissionClient submissionId={entry.id} />
                    : <span className="ad__dim">Not a client yet</span>}
                </dd></div>
              ) : null}
              <div><dt>Entry id</dt><dd className="ad__dim" style={{ fontSize: ".78rem" }}>{entry.id}</dd></div>
            </dl>
          </Panel>

          {form.source !== "newsletter" ? (
            <Panel title="Emails about this entry">
              {mayResend ? <ResendEmail formKey={form.key} id={entry.id} notifications={NOTIFICATIONS[form.source].map((n) => ({ key: n.key, name: n.name }))} /> : null}
              {messages.length ? (
                <ol className="adForms__timeline">
                  {messages.map((m) => (
                    <li key={m.id}>
                      <span><b>{m.subject}</b></span>
                      <small>
                        To {m.to} · <span className={`ad__pill ${m.state === "Sent" ? "ad__pill--good" : m.state === "Failed" ? "ad__pill--bad" : "ad__pill--warn"}`}>{m.state}</span>
                        {m.ms ? ` · ${(m.ms / 1000).toFixed(1)} s` : ""} · {time(m.at)}
                      </small>
                      {m.error ? <small>{m.error}</small> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty title="No emails yet">The confirmation and the studio&apos;s notice for this entry appear here once they send.</Empty>
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
