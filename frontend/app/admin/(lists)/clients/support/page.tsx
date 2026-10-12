import Link from "next/link";
import { BulkBar, PickAll, RowPick } from "@/components/admin/bulk";
import { CheckCircle2, Clock, Inbox, LifeBuoy, MessageSquare } from "lucide-react";
import { getClient, getProject, getTicketMessages, getTickets } from "@/lib/admin/store";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { Empty } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { Pager, readPer } from "@/components/admin/pager";
import { dateWords, nowMs, whenWords } from "@/lib/admin/when";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { Chips } from "@/components/admin/chips";
import { UrlSearch } from "@/components/admin/url-search";
import { ClickRow } from "@/components/admin/click-row";
import { ChoresMenu } from "@/components/admin/chores-menu";

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
    return <section className="ad__panel"><AdminState kind="forbidden" title="Support is not in your role" description="Ask Admin if you need to answer client questions." /></section>;
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

  /* THE FIGURES: median first reply is the time from a question to the first studio message, over tickets that have one. */
  const now = nowMs();
  const firsts = all.flatMap((r) => {
    const reply = getTicketMessages(r.t.id).find((m) => m.from === "studio");
    return reply ? [Date.parse(reply.at) - Date.parse(r.t.createdAt)] : [];
  }).filter((n) => n >= 0).sort((a, b) => a - b);
  const median = firsts.length ? firsts[Math.floor(firsts.length / 2)] : null;
  const words = (ms: number) => { const m = Math.round(ms / 60_000); return m < 60 ? `${m} m` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${Math.round(m / 1440)} d`; };
  const waiting = all.filter((r) => r.t.status === "Open").sort((a, b) => a.t.updatedAt.localeCompare(b.t.updatedAt));
  const closedWeek = all.filter((r) => r.t.status === "Closed" && Date.parse(r.t.updatedAt) >= now - 7 * 86_400_000).length;
  const href = (patch: Partial<Query>) => queryHref({ ...query, ...patch, page: undefined }, {}).replace("#tickets", "");

  const deck: DeckItem[] = waiting.slice(0, 8).map(({ t, client, last, project }) => ({
    id: `t-${t.id}`, kind: "Question", urgency: `Opened ${dateWords(t.createdAt, now, false)}`, tone: "warn", label: project?.title ?? client?.company,
    title: t.subject,
    body: last && last.from === "client" ? (last.body.length > 170 ? `${last.body.slice(0, 167)}...` : last.body) : "The client is waiting for an answer.",
    facts: [{ k: "From", v: client?.name ?? "Unknown" }, { k: "Company", v: client?.company ?? "Unknown" }, { k: "Last message", v: last ? whenWords(last.at, now) : "None" }],
    why: "The next move is the studio's.",
    primary: { label: "Reply", href: `/admin/clients/support/${t.id}` },
    ...(client ? { secondary: { label: "Open client", href: `/admin/clients/${client.id}` } } : {}),
    open: `/admin/clients/support/${t.id}`,
  }));

  const chips = [
    { key: "", label: "All", count: all.length },
    ...STATUS.map((s) => ({ key: s, label: LABEL[s], count: counts[s] })),
  ].map((c) => ({ ...c, href: href({ status: c.key || undefined }) }));

  return (
    <>
      <PageHead title="Support"
        lede={<>{counts.Open + counts.Answered} open {counts.Open + counts.Answered === 1 ? "question" : "questions"}. <strong>{median === null ? "No reply has been sent yet." : `Median first reply is ${words(median)}.`}</strong></>}
        chores={<ChoresMenu label="support, more" items={[{ label: "Help centre articles", href: "/admin/settings/faq", icon: "file" }, { label: "Clients", href: "/admin/clients", icon: "users" }]} />} />
      <Workbench
        railLabel="Support pulse"
        rail={<>
          <RailHead title="Support pulse" />
          <StatTiles items={[
            { label: "Waiting on us", value: String(counts.Open), note: counts.Open ? "The client is waiting" : "Nobody is waiting", noteTone: counts.Open ? "accent" : undefined, icon: Inbox, tone: "live", href: href({ status: "Open" }) },
            { label: "First reply", value: median === null ? "None yet" : words(median), note: median === null ? "Measured once a reply is sent" : "Median, question to first reply", icon: Clock, tone: "good" },
            { label: "Answered", value: String(counts.Answered), note: "Over to the client", icon: MessageSquare, tone: "brand", href: href({ status: "Answered" }) },
            { label: "Closed", value: String(counts.Closed), note: closedWeek ? `${closedWeek} this week` : "Reopens if the client writes", icon: CheckCircle2, tone: "neutral", href: href({ status: "Closed" }) },
          ]} />
          <RailCard title="Latest questions" aside="Newest first">
            <RailRows empty="Questions clients ask from their portal show here." rows={all.slice().sort((a, b) => b.t.createdAt.localeCompare(a.t.createdAt)).slice(0, 3).map(({ t, client }) => ({
              key: t.id, title: t.subject, sub: `${client?.company ?? "Unknown client"} · ${whenWords(t.createdAt, now)}`, icon: LifeBuoy, tone: t.status === "Open" ? "warn" as const : "neutral" as const, href: `/admin/clients/support/${t.id}`,
              tag: { text: LABEL[t.status], tone: t.status === "Open" ? "warn" as const : t.status === "Answered" ? "good" as const : "flat" as const },
            }))} />
          </RailCard>
        </>}
      >
        <Deck id="support" title="Questions needing you" items={deck} emptyTitle="Every question is answered." emptyBody="Nobody is waiting on the studio." emptyNext={{ label: "Open the help centre", href: "/admin/settings/faq" }} />
        <section className="adList" aria-label="Tickets" id="tickets" data-tour="support-filters">
          <div className="adList__hd"><h2>Questions</h2><span className="adList__n">{all.length}</span><span className="adList__sp" /><UrlSearch label="Search questions" placeholder="Subject, company or person" /></div>
          <div className="adList__pad"><Chips label="Status" current={status ?? ""} items={chips} /></div>
          {rows.length ? (
            <>
              <BulkBar target="tickets-table" noun="questions" actions={[
                { kind: "tickets:Answered", label: "Mark answered", icon: "check" },
                { kind: "tickets:Closed", label: "Close", icon: "close", confirm: "Close {n} questions? Each client sees theirs as settled. Any of them opens again if someone writes." },
                { kind: "tickets:Open", label: "Reopen", icon: "reopen" },
              ]} />
              <div className="ad__scroll" id="tickets-table" tabIndex={0} role="region" aria-label="Questions table, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th><span className="ad__pickRow"><PickAll label="Select every question" />Question</span></th><th>From</th><th>Status</th><th>Last message</th><th className="num">Messages</th></tr></thead>
                  <tbody>
                    {shown.map(({ t, client, last, count, project }) => (
                      <ClickRow key={t.id} href={`/admin/clients/support/${t.id}`} label={`${t.subject}, ${client?.company ?? "unknown client"}. ${LABEL[t.status]}. Press Enter to open.`}>
                        <td>
                          <span className="ad__who"><RowPick id={t.id} label={t.subject} />
                            <span><Link href={`/admin/clients/support/${t.id}`}><b>{t.subject}</b></Link><small>Opened {dateWords(t.createdAt, now, false)}{project ? ` · ${project.title}` : ""}</small></span></span>
                        </td>
                        <td><b>{client?.name ?? "Unknown"}</b><small style={{ display: "block", color: "var(--ad-dim)" }}>{client?.company ?? ""}</small></td>
                        <td><span className={`ad__pill ${PILL[t.status]}`}>{LABEL[t.status]}</span></td>
                        <td className="ad__dim">{last ? `${last.from === "studio" ? last.author : "Client"}, ${whenWords(last.at, now)}` : ""}</td>
                        <td className="num">{count}</td>
                      </ClickRow>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager label="Question pages" total={rows.length} page={page} per={per} noun={rows.length === 1 ? "question" : "questions"}
                href={(patch) => queryHref(query, { page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : query.per })} />
            </>
          ) : filtered ? (
            <Empty title="No questions match" icon={LifeBuoy} action={<Link className="ad__btn" href="/admin/clients/support">Clear filters</Link>}>Try a broader search, or clear the filters.</Empty>
          ) : (
            <Empty title="No questions yet" icon={LifeBuoy}>When a client asks something from their portal it lands here, and you are emailed.</Empty>
          )}
        </section>
      </Workbench>
    </>
  );
}
