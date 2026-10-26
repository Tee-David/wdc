import Link from "next/link";
import { CreditCard, Eye, FolderKanban, LifeBuoy, MessageSquare, Phone } from "lucide-react";
import { siteFaqs } from "@/lib/site-content";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { UrlSearch } from "@/components/admin/url-search";
import { Pager, readPer } from "@/components/admin/pager";
import { getPortalRequest } from "@/lib/portal/session";
import { getProjectsFor, getTicketsFor } from "@/lib/admin/store";
import { Empty } from "@/components/admin/bits";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import "@/components/client/portal.css";

export const metadata = { title: "Support" };

type Query = { q?: string; page?: string; per?: string };

/**
 * SUPPORT, as C-Support draws it: the help articles first (most questions
 * already have an answer), searchable, with the ways to talk to us beside
 * them. Conversations themselves live in Messages. Articles are the studio's
 * own questions and answers (Settings, Help centre), narrowed to the services
 * this client has with us.
 */
export default async function PortalHelp({ searchParams }: { searchParams: Promise<Query> }) {
  await syncStore();
  persistSoon();
  const { client, isPrimaryContact } = await getPortalRequest();
  if (!client) return null;
  const sp = await searchParams;
  const needle = String(sp.q ?? "").trim().slice(0, 80).toLocaleLowerCase();
  const mine = new Set(getProjectsFor(client.id).map((p) => p.service));
  const { faqs } = await siteFaqs();
  const articles = faqs.filter((f) => !f.services?.length || f.services.some((x) => mine.has(x)));
  const found = articles.filter((f) => !needle || `${f.q} ${f.a}`.toLocaleLowerCase().includes(needle));
  const per = readPer(sp.per, 10);
  const pageCount = Math.max(1, Math.ceil(found.length / per));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const href = (patch: Partial<Query>) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, per: sp.per, ...patch })) if (v) n.set(k, v);
    const s = n.toString();
    return `/portal/help${s ? `?${s}` : ""}#articles`;
  };
  const open = isPrimaryContact ? getTicketsFor(client.id).filter((t) => t.status !== "Closed").length : 0;
  const ask = isPrimaryContact ? "/portal/support?new=1#ask" : "/portal/projects";

  return (
    <>
      <PageHead title="Support" lede={<>Most questions already have an answer here. <strong>If yours does not, ask us and we reply within one working day.</strong></>}
        action={<Link className="ad__btn ad__btn--primary" href={ask}><MessageSquare aria-hidden="true" />Ask a question</Link>} />
      <Workbench railLabel="Talk to us"
        rail={<>
          <RailCard title="Talk to us" aside="Within 1 working day">
            <RailRows empty="" rows={[
              ...(isPrimaryContact ? [{ key: "msg", title: "Message your team", sub: open ? `${open} open ${open === 1 ? "conversation" : "conversations"}` : "The person working on it answers", icon: MessageSquare, href: "/portal/support" }] : []),
              { key: "call", title: "Book a quick call", sub: "15 minutes on Google Meet", icon: Phone, href: "/meet" },
              { key: "ask", title: "Ask a question", sub: isPrimaryContact ? "It becomes a conversation you can follow" : "Ask in your project's conversation", icon: LifeBuoy, href: ask },
            ]} />
          </RailCard>
          <RailCard title="Good to know">
            <RailRows empty="" rows={[
              { key: "pay", title: "Pay an invoice", sub: "Paystack or Flutterwave, from Billing", icon: CreditCard, href: "/portal/billing" },
              { key: "approve", title: "Approve work", sub: "Open the project, then the file", icon: Eye, href: "/portal/projects" },
              { key: "projects", title: "Your projects", sub: "Stages, files and what we need from you", icon: FolderKanban, href: "/portal/projects" },
            ]} />
          </RailCard>
        </>}
      >
        <section className="adList pSup__panel" id="articles" data-tour="portal-help" aria-label="Help articles">
          <div className="adList__hd">
            <h2>Help articles</h2><span className="adList__n">{articles.length}</span><span className="adList__sp" />
            {articles.length ? <UrlSearch label="Search the help articles" placeholder="Search the articles" /> : null}
          </div>
          {found.length ? (
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
            <Empty title={needle ? "No article matches" : "No articles yet"} icon={LifeBuoy}
              action={needle ? <Link className="ad__btn" href={href({ q: undefined, page: undefined })}>Clear search</Link> : <Link className="ad__btn ad__btn--primary" href={ask}>Ask a question</Link>}>
              {needle ? "Try fewer words, or ask us directly." : "Ask us a question and we will answer it."}
            </Empty>
          )}
        </section>
      </Workbench>
    </>
  );
}
