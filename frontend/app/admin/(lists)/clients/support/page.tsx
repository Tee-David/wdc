import Link from "next/link";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { BulkBar, PickAll, RowPick } from "@/components/admin/bulk";
import { CheckCircle2, Inbox, LifeBuoy, MessageSquare } from "lucide-react";
import { getClient, getProject, getTicketMessages, getTickets } from "@/lib/admin/store";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { Empty, Panel, Tile, when } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { Pager, readPer } from "@/components/admin/pager";
import { FilterPick } from "@/components/admin/pick";

export const metadata = { title: "Support" };

type Query = { q?: string; status?: string; page?: string; per?: string };
const STATUS = ["Open", "Answered", "Closed"] as const;
const PILL: Record<string, string> = { Open: "ad__pill--warn", Answered: "ad__pill--good", Closed: "ad__pill--flat" };
/* "Open" is how the table stores it; to the studio it means the next move is theirs. */
const LABEL: Record<string, string> = { Open: "Waiting on us", Answered: "Answered", Closed: "Closed" };

function queryHref(query: Query, changes: Partial<Query>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) if (value) params.set(key, value);
  const suffix = params.toString();
  return `/admin/clients/support${suffix ? `?${suffix}` : ""}#tickets`;
}

/**
 * EVERY CLIENT QUESTION IN ONE PLACE: what is waiting on the studio first,
 * then the rest, searchable by subject, company or person. Each opens its
 * conversation, where the studio answers, marks it answered, closes or
 * reopens it.
 */
export default async function SupportPage({ searchParams }: { searchParams: Promise<Query> }) {
  await syncStore();
  persistSoon();
  const role = await adminRole();
  if (!can(role, "clients")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Support is not in your role" description="Ask the owner if you need to answer client questions." /></section>;
  }
  const query = await searchParams;
  const per = readPer(query.per);
  const status = STATUS.find((s) => s === query.status);
  const search = query.q?.trim().toLocaleLowerCase() ?? "";

  const all = getTickets().map((t) => {
    const messages = getTicketMessages(t.id);
    const last = messages.at(-1);
    const client = getClient(t.clientId);
    return { t, client, last, count: messages.length, project: t.projectId ? getProject(t.projectId) : null };
  });
  /* Waiting on the studio first, then newest activity. */
  const order = { Open: 0, Answered: 1, Closed: 2 } as const;
  const rows = all
    .filter((r) => !status || r.t.status === status)
    .filter((r) => !search || [r.t.subject, r.client?.company ?? "", r.client?.name ?? ""].some((v) => v.toLocaleLowerCase().includes(search)))
    .sort((a, b) => order[a.t.status] - order[b.t.status] || b.t.updatedAt.localeCompare(a.t.updatedAt));
  const pageCount = Math.max(1, Math.ceil(rows.length / per));
  const page = Math.min(Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1), pageCount);
  const shown = rows.slice((page - 1) * per, page * per);
  const counts = { Open: 0, Answered: 0, Closed: 0 };
  for (const r of all) counts[r.t.status]++;
  const filtered = Boolean(search || status);

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Support</h1>
          <p>Questions clients ask in their portal. Answer here; they are emailed and see it in the portal.</p>
        </div>
        <div className="ad__row"><PageTourButton /></div>
      </div>

      <dl className="ad__tiles" data-tour="support-tiles">
        <Tile label="Waiting on us" href="/admin/clients/support?status=Open" value={String(counts.Open)} icon={Inbox} iconTone="live" tone={counts.Open ? "accent" : undefined} note={counts.Open ? "The client is waiting for an answer" : "Nobody is waiting"} />
        <Tile label="Answered" href="/admin/clients/support?status=Answered" value={String(counts.Answered)} icon={MessageSquare} iconTone="good" note="Over to the client" />
        <Tile label="Closed" href="/admin/clients/support?status=Closed" value={String(counts.Closed)} icon={CheckCircle2} iconTone="neutral" note="Reopens if the client writes again" />
      </dl>

      <div style={{ marginTop: ".9rem" }}>
        <Panel title={filtered ? `${rows.length} of ${all.length} questions` : `${all.length} question${all.length === 1 ? "" : "s"}`}>
          <div className="ad__filterBar" data-tour="support-filters">
            <form className="ad__filterForm" method="get" action="/admin/clients/support#tickets" aria-label="Filter questions">
              <label className="ad__filterSearch">
                <span className="ad__sr">Search questions</span>
                <input name="q" type="search" defaultValue={query.q} placeholder="Search subject, company or person" />
              </label>
              <FilterPick label="Status" hideLabel name="status" defaultValue={status ?? ""} placeholder="Every status"
                          options={STATUS.map((s) => ({ value: s, label: LABEL[s] }))} />
              {query.per ? <input type="hidden" name="per" value={per} /> : null}
              <button type="submit" className="ad__btn ad__btn--primary">Apply</button>
            </form>
            {filtered ? <Link className="ad__btn" href="/admin/clients/support">Clear</Link> : null}
          </div>
          {rows.length ? (
            <>
              <BulkBar target="tickets" noun="questions" actions={[
                { kind: "tickets:Answered", label: "Mark answered", icon: "check" },
                { kind: "tickets:Closed", label: "Close", icon: "close", confirm: "Close {n} questions? Each client sees theirs as settled. Any of them opens again if someone writes." },
                { kind: "tickets:Open", label: "Reopen", icon: "reopen" },
              ]} />
            <div className="ad__scroll" id="tickets">
              <table className="ad__t">
                <thead><tr><th><span className="ad__pickRow"><PickAll label="Select every question" />Question</span></th><th>Status</th><th>Last message</th><th className="num">Messages</th><th>Opened</th></tr></thead>
                <tbody>
                  {shown.map(({ t, client, last, count, project }) => (
                    <tr key={t.id}>
                      <td>
                        <span className="ad__pickRow"><RowPick id={t.id} label={t.subject} />
                        <Link href={`/admin/clients/support/${t.id}`}><b>{t.subject}</b></Link></span>
                        <small>{client?.company ?? "Unknown client"}{project ? ` · ${project.title}` : ""}</small>
                      </td>
                      <td><span className={`ad__pill ${PILL[t.status]}`}>{LABEL[t.status]}</span></td>
                      <td className="ad__dim">{last ? `${last.from === "studio" ? last.author : "Client"}, ${when(last.at)}` : ""}</td>
                      <td className="num">{count}</td>
                      <td className="ad__dim ad__num">{when(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : filtered ? (
            <Empty title="No questions match" icon={LifeBuoy} action={<Link className="ad__btn" href="/admin/clients/support">Clear filters</Link>}>
              Try a broader search, or clear the filters.
            </Empty>
          ) : (
            <Empty title="No questions yet" icon={LifeBuoy}>
              When a client asks something from their portal it lands here, and you are emailed.
            </Empty>
          )}
          {rows.length ? (
            <Pager label="Question pages" total={rows.length} page={page} per={per} noun={rows.length === 1 ? "question" : "questions"}
              href={(patch) => queryHref(query, { page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : query.per })} />
          ) : null}
        </Panel>
      </div>
    </>
  );
}
