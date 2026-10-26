import Link from "next/link";
import { BookOpen, Coins, LifeBuoy, MessageSquare, Ruler, Users } from "lucide-react";
import { STAFF_HELP } from "@/lib/staff-help";
import { getClients } from "@/lib/admin/store";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { inScope, staffScope } from "@/lib/admin/staff-scope";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { UrlSearch } from "@/components/admin/url-search";
import { Chips } from "@/components/admin/chips";
import { Empty } from "@/components/admin/bits";
import { AskAdmin } from "@/components/admin/ask-admin";
import "@/components/client/portal.css";

export const metadata = { title: "Support" };

/**
 * SUPPORT FOR THE TEAM (the S-Support board): the help articles for the tools
 * and client work, searchable and by category, with Ask Admin beside them.
 * Asking Admin writes into the person's direct chat with Admin, so answers
 * stay in Messages. Client questions are answered in Messages too.
 */
export default async function StaffHelp({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; ask?: string }> }) {
  await syncStore();
  persistSoon();
  const sp = await searchParams;
  const role = await adminRole();
  const scope = await staffScope(role);
  const clients = getClients().filter((c) => !c.archived && inScope(scope, "clients", c.id)).map((c) => c.company);
  const needle = String(sp.q ?? "").trim().toLocaleLowerCase().slice(0, 80);
  const cats = [...new Set(STAFF_HELP.map((a) => a.cat))];
  const cat = cats.find((c) => c === sp.cat) ?? "";
  const found = STAFF_HELP.filter((a) => (!cat || a.cat === cat) && (!needle || `${a.t} ${a.s} ${a.steps.map((x) => `${x.t} ${x.s}`).join(" ")}`.toLocaleLowerCase().includes(needle)));
  const href = (c: string) => `/admin/help${c ? `?cat=${encodeURIComponent(c)}` : ""}`;
  const open = (id: string) => `/admin/help?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(cat ? { cat } : {}) }).toString()}#${id}`;

  return (
    <>
      <PageHead title="Support" lede={<>Most questions about the tools have an article. <strong>Anything about money or scope goes to Admin first.</strong></>}
        action={<AskAdmin about={clients} startOpen={sp.ask === "1"} />} />
      <Workbench railLabel="Ask Admin first"
        rail={<>
          <RailCard title="Ask Admin first" aside="Before you promise">
            <RailRows empty="" rows={[
              { key: "money", title: "Money and prices", sub: "Discounts, refunds, payment dates", icon: Coins, href: open("sa6") },
              { key: "scope", title: "Changes to scope", sub: "New platforms, extra rounds, longer terms", icon: Ruler, href: open("sa6") },
            ]} />
          </RailCard>
          <RailCard title="Talk to someone">
            <RailRows empty="" rows={[
              { key: "admin", title: "Ask Admin", sub: "The answer lands in Messages", icon: MessageSquare, href: "/admin/help?ask=1" },
              { key: "team", title: "Message the team", sub: "Direct and group chats", icon: Users, href: "/admin/messages?kind=team" },
              ...(can(role, "clients") ? [{ key: "clients", title: "Client questions", sub: "Answer them in Messages", icon: LifeBuoy, href: "/admin/messages?kind=client" }] : []),
            ]} />
          </RailCard>
        </>}
      >
        <section className="adList pSup__panel" aria-label="Help articles" data-tour="staff-help">
          <div className="adList__hd"><h2>Help articles</h2><span className="adList__n">{STAFF_HELP.length}</span><span className="adList__sp" /><UrlSearch label="Search the help articles" placeholder="Search the articles" /></div>
          <div className="adList__pad" style={{ paddingTop: ".75rem" }}>
            <Chips label="Categories" current={cat || "all"} items={[{ key: "all", label: "All", href: href(""), count: STAFF_HELP.length }, ...cats.map((c) => ({ key: c, label: c, href: href(c), count: STAFF_HELP.filter((a) => a.cat === c).length }))]} />
          </div>
          {found.length ? (
            <ul className="pSup__faq">
              {found.map((a) => (
                <li key={a.id} id={a.id}>
                  <details>
                    <summary>{a.t}</summary>
                    <p className="ad__dim" style={{ margin: "0 0 .5rem" }}>{a.s} · {a.mins}</p>
                    <ol className="adHelp__steps">{a.steps.map((x, i) => <li key={i}><b>{x.t}</b><span>{x.s}</span></li>)}</ol>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No article matches" icon={BookOpen} action={<Link className="ad__btn" href={href(cat)}>Clear search</Link>}>Try fewer words, or ask Admin.</Empty>
          )}
        </section>
      </Workbench>
    </>
  );
}
