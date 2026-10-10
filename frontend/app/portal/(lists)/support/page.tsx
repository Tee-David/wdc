import Link from "next/link";
import { ListSearch } from "@/components/admin/list-search";
import { CheckCircle2, Clock, LifeBuoy, MessageSquare, Plus } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getProjectsFor, getTicketMessages, getTicketsFor } from "@/lib/admin/store";
import { Empty, when } from "@/components/admin/bits";
import { NewTicketForm } from "@/components/client/new-ticket-form";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import "@/components/client/portal.css";

export const metadata = { title: "Support" };

type Query = { new?: string; subject?: string; project?: string; show?: string };

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

  const tickets = getTicketsFor(client.id).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const open = tickets.filter((t) => t.status !== "Closed");
  const closed = tickets.filter((t) => t.status === "Closed");
  const tab = sp.show === "closed" ? "closed" : "open";
  const rows = tab === "closed" ? closed : open;

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <h1>Messages</h1>
          <p>Ask us anything about your account, a project, or an invoice.</p>
        </div>
        {asking ? null : (
          <Link className="ad__btn ad__btn--primary" href="/portal/support?new=1#ask" scroll={false}>
            <Plus aria-hidden="true" /> Ask a question
          </Link>
        )}
      </header>

      {asking ? <NewTicketForm startOpen subject={sp.subject} projectId={sp.project} closeHref="/portal/support"
        projects={getProjectsFor(client.id).map((p) => ({ id: p.id, title: p.title }))} /> : null}

      <div className="pSup">
        <section className="ad__panel" data-tour="portal-support" aria-label="Conversations">
          <div className="pSup__bar">
            <nav className="ad__switch" aria-label="Which conversations">
              <Link href="/portal/support" aria-current={tab === "open" ? "true" : undefined}>Open {open.length}</Link>
              <Link href="/portal/support?show=closed" aria-current={tab === "closed" ? "true" : undefined}>Closed {closed.length}</Link>
            </nav>
          </div>
          {rows.length ? <ListSearch target="portal-tickets" placeholder="Search conversations" noun="conversations" /> : null}
          {rows.length ? (
            <ul className="pSup__list" id="portal-tickets">
              {rows.map((t) => {
                const last = getTicketMessages(t.id).at(-1);
                const fresh = t.status === "Answered";
                const done = t.status === "Closed";
                return (
                  <li key={t.id} data-row>
                    <Link href={`/portal/support/${t.id}`} className={fresh ? "is-fresh" : undefined}>
                      <span className={`ad__tileIcon ad__tileIcon--${done ? "neutral" : "live"}`} aria-hidden="true">
                        {done ? <CheckCircle2 /> : <MessageSquare />}
                      </span>
                      <span className="pSup__main">
                        <span className="pSup__subject">
                          <b>{t.subject}</b>
                          {fresh ? <span className="ad__pill ad__pill--live">New reply</span> : null}
                          {done ? <span className="ad__pill ad__pill--flat">Closed</span> : null}
                        </span>
                        {last ? (
                          <small>{last.from === "client" ? "You" : last.author.split(/\s+/)[0]}: {last.body}</small>
                        ) : null}
                      </span>
                      <time className="pSup__when" dateTime={t.updatedAt}>{when(t.updatedAt)}</time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : tab === "closed" ? (
            <Empty title="Nothing closed yet" icon={LifeBuoy}
              action={<Link className="ad__btn" href="/portal/support">See open conversations</Link>}>Conversations move here once the question is settled.</Empty>
          ) : (
            <Empty title="No open conversations" icon={LifeBuoy}
              action={<Link className="ad__btn ad__btn--primary" href="/portal/support?new=1">Ask a question</Link>}>
              Ask us anything about your project. We usually reply the same working day.
            </Empty>
          )}
        </section>

        <aside className="ad__panel pSup__aside">
          <span className="ad__tileIcon ad__tileIcon--brand" aria-hidden="true"><Clock /></span>
          <h2>How quickly we reply</h2>
          <p>Usually the same working day, Monday to Friday, studio hours (UTC+1). Anything urgent on a live site, say so in the subject.</p>
        </aside>
      </div>
    </div>
  );
}
