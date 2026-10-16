import Link from "next/link";
import { CheckCircle2, FolderKanban, LifeBuoy, MessageSquare, Phone, Plus } from "lucide-react";
import { siteFaqs } from "@/lib/site-content";
import { nowMs, whenWords } from "@/lib/admin/when";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, RailHead, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { Tabs } from "@/components/admin/tabs";
import { Chips } from "@/components/admin/chips";
import { UrlSearch } from "@/components/admin/url-search";
import { Pager, readPer } from "@/components/admin/pager";
import { getPortalRequest } from "@/lib/portal/session";
import { getProjectsFor, getTicketMessages, getTicketsFor } from "@/lib/admin/store";
import { Empty } from "@/components/admin/bits";
import { NewTicketForm } from "@/components/client/new-ticket-form";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import "@/components/client/portal.css";

export const metadata = { title: "Support" };

type Query = { new?: string; subject?: string; project?: string; show?: string; tab?: string; q?: string; page?: string; per?: string };

/**
 * SUPPORT, as PSupport.dc.html draws it: open and closed conversations on
 * two tabs, each row showing who spoke last and what they said, and a
 * thread the studio has answered marked "New reply" while it is Answered.
 */
export default async function PortalSupport({ searchParams }: { searchParams: Promise<Query> }) {
  await syncStore();
  persistSoon();
  const { client, isPrimaryContact } = await getPortalRequest();
  if (!client) return null;
  if (!isPrimaryContact) return <div className="adDash"><header className="adDash__head"><h1>Messages</h1></header><Empty title="Ask in your project" icon={MessageSquare} action={<Link className="ad__btn" href="/portal/projects">Open your projects</Link>}>Your invitation gives you access to specific projects. Use their shared conversations to speak with the team.</Empty></div>;
  const sp = await searchParams;
  const asking = sp.new === "1";
  const now = nowMs();

  const tickets = getTicketsFor(client.id).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const open = tickets.filter((t) => t.status !== "Closed");
  const closed = tickets.filter((t) => t.status === "Closed");
  const tab = sp.tab === "articles" ? "articles" : "conversations";
  const show = sp.show === "closed" ? "closed" : "open";
  const rows = show === "closed" ? closed : open;
  const per = readPer(sp.per);
  const needle = String(sp.q ?? "").trim().slice(0, 80).toLocaleLowerCase();

  /* Help articles are the studio's own questions and answers (Settings, Help centre), narrowed to this client's services. */
  const mine = new Set(getProjectsFor(client.id).map((p) => p.service));
  const { faqs } = await siteFaqs();
  const articles = faqs.filter((f) => !f.services?.length || f.services.some((x) => mine.has(x)));
  const found = articles.filter((f) => !needle || `${f.q} ${f.a}`.toLocaleLowerCase().includes(needle));
  const list = tab === "articles" ? found : rows;
  const pageCount = Math.max(1, Math.ceil(list.length / per));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const href = (patch: Partial<Query>) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab: tab === "articles" ? "articles" : "", show: show === "closed" ? "closed" : "", q: sp.q, per: sp.per, ...patch })) if (v) n.set(k, v);
    const q = n.toString();
    return `/portal/support${q ? `?${q}` : ""}`;
  };
  const fresh = open.filter((t) => t.status === "Answered").length;
  const channels = getProjectsFor(client.id).filter((p) => !p.archived).slice(0, 5);

  return (
    <>
      <PageHead title="Messages" lede={<>{open.length} open. <strong>We usually reply the same working day.</strong></>}
        action={asking ? undefined : <Link className="ad__btn ad__btn--primary" href="/portal/support?new=1#ask" scroll={false}><Plus aria-hidden="true" />Ask a question</Link>} />

      {asking ? <NewTicketForm startOpen subject={sp.subject} projectId={sp.project} closeHref="/portal/support"
        projects={getProjectsFor(client.id).map((p) => ({ id: p.id, title: p.title }))} /> : null}

      <Workbench railLabel="Talk to us"
        rail={<>
          <RailHead title="Talk to us" />
          <RailCard title="How quickly we reply" aside="Studio hours, UTC+1">
            <p className="adRc__sub" style={{ whiteSpace: "normal" }}>Usually the same working day, Monday to Friday. Anything urgent on a live site, say so in the subject.</p>
            <RailRows empty="" rows={[
              { key: "ask", title: "Ask a question", sub: "It becomes a conversation you can follow", icon: MessageSquare, href: "/portal/support?new=1#ask" },
              { key: "call", title: "Book a call", sub: "Pick a time that suits you", icon: Phone, href: "/meet" },
            ]} />
          </RailCard>
          {channels.length ? (
            <RailCard title="Your project channels" aside="Your team reads these">
              <RailRows empty="" rows={channels.map((p) => ({ key: p.id, title: p.title, sub: "Message the people working on it", icon: FolderKanban, href: `/portal/support/project/${p.id}` }))} />
            </RailCard>
          ) : null}
          {fresh ? <RailCard title="New replies"><p className="adRc__sub" style={{ whiteSpace: "normal" }}>{fresh} {fresh === 1 ? "conversation has" : "conversations have"} a reply from the studio.</p></RailCard> : null}
        </>}
      >
        <section className="adList pSup__panel" data-tour="portal-support" aria-label="Conversations and help articles">
          <div className="adList__hd">
            <h2>{tab === "articles" ? "Help articles" : "Conversations"}</h2><span className="adList__n">{tab === "articles" ? articles.length : tickets.length}</span><span className="adList__sp" />
            {tab === "articles" ? <UrlSearch label="Search the help articles" placeholder="Search the articles" /> : null}
          </div>
          <Tabs label="Support views" current={tab} items={[
            { key: "conversations", label: "My conversations", href: href({ tab: undefined, q: undefined, page: undefined }), count: open.length, tone: fresh ? "warn" : undefined },
            { key: "articles", label: "Help articles", href: href({ tab: "articles", page: undefined }), count: articles.length },
          ]} />
          {tab === "conversations" ? (
            <>
              <div className="adList__pad" style={{ paddingTop: ".75rem" }}>
                <Chips label="Which conversations" current={show} items={[
                  { key: "open", label: "Open", count: open.length, href: href({ show: undefined, page: undefined }) },
                  { key: "closed", label: "Closed", count: closed.length, href: href({ show: "closed", page: undefined }) },
                ]} />
              </div>
              {rows.length ? (
                <>
                  <ul className="pSup__list" id="portal-tickets">
                    {rows.slice((page - 1) * per, page * per).map((t) => {
                      const last = getTicketMessages(t.id).at(-1);
                      const isNew = t.status === "Answered";
                      const done = t.status === "Closed";
                      return (
                        <li key={t.id} data-row>
                          <Link href={`/portal/support/${t.id}`} className={isNew ? "is-fresh" : undefined}>
                            <span className={`ad__tileIcon ad__tileIcon--${done ? "neutral" : "live"}`} aria-hidden="true">{done ? <CheckCircle2 /> : <MessageSquare />}</span>
                            <span className="pSup__main">
                              <span className="pSup__subject">
                                <b>{t.subject}</b>
                                {isNew ? <span className="ad__pill ad__pill--live">New reply</span> : null}
                                {done ? <span className="ad__pill ad__pill--flat">Closed</span> : null}
                              </span>
                              {last ? <small>{last.from === "client" ? "You" : last.author.split(/\s+/)[0]}: {last.body}</small> : null}
                            </span>
                            <time className="pSup__when" dateTime={t.updatedAt}>{whenWords(t.updatedAt, now)}</time>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <Pager label="Conversation pages" total={rows.length} page={page} per={per} noun={rows.length === 1 ? "conversation" : "conversations"}
                    href={(patch) => href({ page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : sp.per })} />
                </>
              ) : show === "closed" ? (
                <Empty title="Nothing closed yet" icon={LifeBuoy} action={<Link className="ad__btn" href="/portal/support">See open conversations</Link>}>Conversations move here once the question is settled.</Empty>
              ) : (
                <Empty title="No open conversations" icon={LifeBuoy} action={<Link className="ad__btn ad__btn--primary" href="/portal/support?new=1">Ask a question</Link>}>
                  Ask us anything about your project. We usually reply the same working day.
                </Empty>
              )}
            </>
          ) : found.length ? (
            <>
              <ul className="pSup__faq">
                {found.slice((page - 1) * per, page * per).map((f) => (
                  <li key={f.q}><details><summary>{f.q}</summary><p>{f.a}</p></details></li>
                ))}
              </ul>
              <Pager label="Article pages" total={found.length} page={page} per={per} noun={found.length === 1 ? "article" : "articles"}
                href={(patch) => href({ page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : sp.per })} />
            </>
          ) : (
            <Empty title={needle ? "No article matches" : "No articles yet"} icon={LifeBuoy} action={needle ? <Link className="ad__btn" href={href({ q: undefined })}>Clear search</Link> : <Link className="ad__btn ad__btn--primary" href="/portal/support?new=1">Ask a question</Link>}>
              {needle ? "Try fewer words, or ask us directly." : "Ask us a question and we will answer it."}
            </Empty>
          )}
        </section>
      </Workbench>
    </>
  );
}
