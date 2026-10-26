import { nowMs } from "@/lib/admin/when";
import Link from "next/link";
import { Clock, FolderKanban, Lightbulb, UserCheck, Users, Wallet } from "lucide-react";
import { SERVICES } from "@/lib/services";
import { getEstimates, getProjects, getTasks, getTickets } from "@/lib/admin/store";
import { waitingOnClients } from "@/lib/jobs/approval-reminders";
import { estimateTotals, naira } from "@/lib/admin/types";
import { adminRole } from "@/lib/admin/guard";
import { inScope, staffScope } from "@/lib/admin/staff-scope";
import { can } from "@/lib/admin/permissions";
import { nairaTile } from "@/lib/admin/short-money";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { listDepartments } from "@/lib/departments";
import { avTone, initials } from "@/lib/admin/client-mark";
import { buildClientRows, openQuotes, unownedSubmissions, type ClientRow } from "@/lib/admin/client-signals";
import { buildClientDeck } from "@/lib/admin/client-deck";
import { activityFeed } from "@/lib/admin/activity-feed";
import { dateWords } from "@/lib/admin/when";
import { Deck } from "@/components/admin/deck";
import { PageHead } from "@/components/admin/page-head";
import { MiniBar, RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { Tabs } from "@/components/admin/tabs";
import { Chips } from "@/components/admin/chips";
import { UrlSearch } from "@/components/admin/url-search";
import { ClickRow } from "@/components/admin/click-row";
import { Pager, readPer } from "@/components/admin/pager";
import { PickAll, RowPick } from "@/components/admin/bulk";
import { DateRange } from "@/components/admin/date-range";
import { ClientMenu } from "@/components/admin/row-actions";
import { AddClient } from "@/components/admin/client-form";
import { ClientFilters, ClientsBulk, ClientsChores } from "@/components/admin/clients-parts";
import { Empty } from "@/components/admin/bits";
import { SavedToast } from "@/components/admin/saved-toast";
import { serviceGlyph } from "@/components/client/service-glyph";

export const metadata = { title: "Clients" };

/**
 * CLIENTS: who needs a person first (the deck), then everyone (the table),
 * with the pulse of the client base in the rail. Everything on the page is
 * derived from the store by lib/admin/client-signals.ts; the address bar holds
 * the tab, the service chip, the search, the facets, the sort and the page, so
 * a filtered list is a link. Staff see the relationship and the work, never an
 * amount (no Outstanding column, tile, deck card or quote value).
 */
type Q = {
  new?: string; tab?: string; status?: string; service?: string; q?: string; money?: string; portal?: string; dept?: string;
  sort?: string; dir?: string; page?: string; per?: string; from?: string; to?: string; saved?: string;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TABS = [["all", "All"], ["active", "Active"], ["lead", "Leads"], ["past", "Past"], ["archived", "Archived"]] as const;
/* Staff sort their clients by whose turn it is, not by the studio's books (the kit's S-Clients). */
const STAFF_TABS = [["all", "All"], ["yours", "Your move"], ["waiting", "Waiting on client"]] as const;
type Tab = (typeof TABS)[number][0] | (typeof STAFF_TABS)[number][0];
const SORTS = ["company", "projects", "owed", "since"] as const;
type Sort = (typeof SORTS)[number];

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Q> }) {
  await syncStore();
  persistSoon();
  const query = await searchParams;
  const role = await adminRole();
  const money = can(role, "money");
  const exportable = can(role, "exports");
  const destructive = can(role, "destructive");

  const staffView = role !== "owner";
  const tabList = staffView ? STAFF_TABS : TABS;
  const tab: Tab = (tabList.find(([k]) => k === query.tab)?.[0]) ?? (!staffView && query.status === "archived" ? "archived" : "all");
  const service = SERVICES.find((s) => s.slug === query.service)?.slug;
  const search = query.q?.trim().toLocaleLowerCase() ?? "";
  const per = readPer(query.per);
  const from = query.from && DAY_RE.test(query.from) ? query.from : undefined;
  const to = query.to && DAY_RE.test(query.to) ? query.to : undefined;
  const moneyF = money && ["late", "owes", "clear"].includes(query.money ?? "") ? query.money! : "";
  const portalF = ["account", "invited", "none"].includes(query.portal ?? "") ? query.portal! : "";
  const departments = (await listDepartments()) ?? [];
  const dept = departments.find((d) => d.id === query.dept)?.id ?? "";
  const sort: Sort = SORTS.includes(query.sort as Sort) && (money || query.sort !== "owed") ? (query.sort as Sort) : "since";
  const direction = query.dir === "asc" || query.dir === "desc" ? query.dir : sort === "company" ? "asc" : "desc";

  /* Staff see the clients in their scope; the owner sees every one. */
  const scope = await staffScope(role);
  const { rows: allRows, portalKnown } = await buildClientRows({ money });
  const all = allRows.filter((r) => inScope(scope, "clients", r.client.id));

  /* WHOSE TURN IT IS, for the staff tabs. Waiting on client: shared work they have not decided on, or a project marked
     waiting on them. Your move: a question of theirs is open, or an open task on their projects is not blocked. */
  const liveIds = (clientId: string) => getProjects().filter((p) => p.clientId === clientId && p.stage !== "Delivered" && !p.archived).map((p) => p.id);
  const waitingProjects = staffView ? new Set((await waitingOnClients()).map((w) => w.projectId)) : new Set<string>();
  const openTickets = new Set(getTickets().filter((t) => t.status === "Open").map((t) => t.clientId));
  const openTaskProjects = new Set(getTasks().filter((t) => !t.done && t.state !== "blocked").map((t) => t.projectId));
  const turn = (r: ClientRow): "yours" | "waiting" | null => {
    const ids = liveIds(r.client.id);
    if (openTickets.has(r.client.id) || ids.some((id) => openTaskProjects.has(id))) return "yours";
    if (ids.some((id) => waitingProjects.has(id)) || getProjects().some((p) => ids.includes(p.id) && p.health === "Waiting on client")) return "waiting";
    return null;
  };
  const matchesTab = (r: ClientRow, t: Tab) => (t === "yours" || t === "waiting") ? r.state !== "archived" && turn(r) === t
    : t === "archived" ? r.state === "archived" : r.state !== "archived" && (t === "all" || r.state === t);

  /* ONE FILTER, APPLIED WITH ONE FACET LEFT OUT, so each tab and chip counts
     what it would show if pressed, with every other choice kept. */
  const matches = (r: ClientRow, skip: "tab" | "service" | null) => {
    const c = r.client;
    if (skip !== "tab" && !matchesTab(r, tab)) return false;
    if (skip !== "service" && service && !c.services.includes(service)) return false;
    if (dept && !(c.departments ?? []).includes(dept)) return false;
    if ((from && c.since.slice(0, 10) < from) || (to && c.since.slice(0, 10) > to)) return false;
    if (moneyF === "late" && !r.late) return false;
    if (moneyF === "owes" && !r.owed) return false;
    if (moneyF === "clear" && r.owed) return false;
    if (portalF && r.portal !== portalF) return false;
    if (search && ![c.company, c.name, c.email, c.sector, ...(c.tags ?? []), ...(c.contacts ?? []).flatMap((x) => [x.name, x.email ?? ""])].some((v) => v.toLocaleLowerCase().includes(search))) return false;
    return true;
  };
  const list = all.filter((r) => matches(r, null)).sort((a, b) => {
    const o = direction === "asc" ? 1 : -1;
    if (sort === "company") return o * a.client.company.localeCompare(b.client.company);
    if (sort === "projects") return o * (a.live.length - b.live.length) || a.client.company.localeCompare(b.client.company);
    if (sort === "owed") return o * (a.owed - b.owed) || a.client.company.localeCompare(b.client.company);
    return o * a.client.since.localeCompare(b.client.since);
  });
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageCount = Math.max(1, Math.ceil(list.length / per));
  const page = Math.min(requestedPage, pageCount);
  const pageRows = list.slice((page - 1) * per, page * per);
  const facetN = [moneyF, portalF, dept].filter(Boolean).length;
  const hasFilters = Boolean(search || service || facetN || from || to || tab !== "all");

  const href = (changes: Partial<Q>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, saved: undefined, new: undefined, ...changes })) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/admin/clients${s ? `?${s}` : ""}`;
  };
  const sortHref = (col: Sort) => href({ sort: col, dir: sort === col ? (direction === "asc" ? "desc" : "asc") : col === "company" ? "asc" : "desc", page: undefined });
  const exportParams = new URLSearchParams();
  if (tab === "archived") exportParams.set("status", "archived");
  for (const key of ["q", "service", "sort", "dir", "from", "to"] as const) if (query[key]) exportParams.set(key, query[key]!);
  const exportHref = `/admin/clients/export${exportParams.size ? `?${exportParams}` : ""}`;

  /* THE FIGURES. */
  const live = all.filter((r) => r.state !== "archived");
  const active = live.filter((r) => r.state === "active");
  const leads = live.filter((r) => r.state === "lead");
  const owedTotal = live.reduce((n, r) => n + r.owed, 0);
  const lateTotal = live.reduce((n, r) => n + r.late, 0);
  const deck = buildClientDeck(all, money);
  const projects = getProjects();
  const liveProjects = projects.filter((p) => p.stage !== "Delivered" && live.some((r) => r.client.id === p.clientId));
  const dueWeek = liveProjects.filter((p) => p.due && Date.parse(p.due) >= nowMs() - 86_400_000 && Date.parse(p.due) <= nowMs() + 7 * 86_400_000).length;
  const waiting = liveProjects.filter((p) => p.health === "Waiting on client").length;
  const withAccount = active.filter((r) => r.portal === "account").length;
  const quarter = new Date(nowMs() + 3_600_000); quarter.setUTCMonth(Math.floor(quarter.getUTCMonth() / 3) * 3, 1);
  const newThisQuarter = live.filter((r) => r.client.since.slice(0, 10) >= quarter.toISOString().slice(0, 10)).length;

  const quotes = openQuotes();
  const forms = unownedSubmissions();
  const since90 = nowMs() - 90 * 86_400_000;
  const won = getEstimates().filter((e) => e.state === "Accepted" && e.answered && Date.parse(e.answered.at) >= since90);
  const pipeValue = quotes.reduce((n, q) => n + q.total, 0);
  const pipe = [
    { t: "New enquiries", n: forms.length, s: forms.length ? "Forms nobody owns yet" : "The forms are quiet, nothing is waiting", href: "/admin/forms", bar: "var(--ad-series-1)" },
    { t: "Leads", n: leads.length, s: leads.length ? leads.slice(0, 2).map((r) => r.client.company).join(", ") : "No client is waiting for a first project", href: href({ tab: "lead", page: undefined }), bar: "var(--ad-series-1)" },
    ...(money ? [
      { t: "Quote sent", n: quotes.length, s: quotes.length ? quotes.slice(0, 2).map((q) => `${q.estimate.number} · ${naira(q.total)}`).join(", ") : "No quote is waiting for an answer", href: "/admin/money", bar: "var(--ad-series-2)" },
      { t: "Won in the last 90 days", n: won.length, s: won.length ? won.slice(0, 2).map((e) => `${e.number} · ${naira(estimateTotals(e).total)}`).join(", ") : "No quote was accepted in that time", href: "/admin/money", bar: "var(--ad-tone-good)" },
    ] : []),
  ];
  const pmax = Math.max(1, ...pipe.map((p) => p.n));
  const svcN = SERVICES.map((s) => ({ s, n: live.filter((r) => r.state !== "past" && r.client.services.includes(s.slug)).length }));
  const smax = Math.max(1, ...svcN.map((x) => x.n));
  const feed = await activityFeed({ money, limit: 4, kinds: ["client", "project", "deliverable", "submission", "update", "invoice", "payment"] });

  /* THE CHIPS AND TABS COUNT WHAT PRESSING THEM WOULD SHOW. */
  const tabItems = tabList.map(([key, label]) => {
    const n = all.filter((r) => matchesTab(r, key as Tab) && matches(r, "tab")).length;
    return { key, label, href: href({ tab: key === "all" ? undefined : key, page: undefined }), count: n };
  });
  const chipItems = [
    { key: "", label: "All services", href: href({ service: undefined, page: undefined }), count: all.filter((r) => matches(r, "service")).length },
    ...SERVICES.map((s) => ({ key: s.slug, label: s.short, href: href({ service: s.slug, page: undefined }), count: all.filter((r) => matches(r, "service") && r.client.services.includes(s.slug)).length })),
  ];

  const lede = <>
    {scope ? `${active.length} ${active.length === 1 ? "client is" : "clients are"} assigned to you.` : `${active.length} active ${active.length === 1 ? "client" : "clients"} and ${leads.length} ${leads.length === 1 ? "lead" : "leads"}.`}{" "}
    <strong>{deck.length ? `${deck.length} need${deck.length === 1 ? "s" : ""} you today.` : "Nobody is waiting on you."}</strong>
    {money ? ` ${naira(owedTotal)} outstanding.` : ""}
  </>;

  const emptyTitle = !all.length ? "No clients yet"
    : search ? `No client matches “${query.q?.trim()}”`
    : tab === "archived" ? "Nothing is archived"
    : tab === "yours" ? "Nothing is your move" : tab === "waiting" ? "No client is holding anything up" : tab === "lead" ? "No open leads" : tab === "past" ? "No past clients yet" : "No clients match these filters";
  const emptyBody = !all.length ? "Add your first client. They get a portal to approve work and pay."
    : search ? "Search by business, contact, email, sector or tag."
    : tab === "archived" ? "Clients you archive land here, with their history kept."
    : "Try another tab or service, or clear the filters.";

  return (
    <>
      {query.saved ? <SavedToast message="Saved. They are on the books." /> : null}
      <PageHead
        title="Clients"
        lede={lede}
        action={<AddClient dataTour="clients-add" startOpen={query.new === "1"} label="New client" />}
        chores={<ClientsChores exportHref={exportable ? exportHref : undefined} />}
      />

      <Workbench
        railLabel="Client pulse"
        rail={<>
          <RailHead title="Client pulse" />
          <StatTiles items={[
            { label: "Active clients", value: String(active.length), note: `${leads.length} ${leads.length === 1 ? "lead" : "leads"} open`, noteTone: "accent", icon: Users, tone: "brand", href: href({ tab: "active", page: undefined }) },
            money
              ? { label: "Outstanding", value: nairaTile(owedTotal), note: lateTotal ? `${nairaTile(lateTotal)} late` : "Nothing is late", noteTone: lateTotal ? "bad" : undefined, icon: Wallet, tone: "bad", href: href({ money: "owes", page: undefined }) }
              : { label: "New this quarter", value: String(newThisQuarter), note: "Clients added since quarter start", icon: UserCheck, tone: "good" },
            { label: "Live projects", value: String(liveProjects.length), note: waiting ? `${waiting} waiting on clients` : "None waiting on clients", noteTone: waiting ? "accent" : undefined, icon: FolderKanban, tone: "live", href: "/admin/projects" },
            portalKnown
              ? { label: "Using the portal", value: `${withAccount} of ${active.length}`, note: `${active.length - withAccount} not yet`, noteTone: active.length - withAccount ? "accent" : undefined, icon: UserCheck, tone: "good", href: href({ portal: "invited", page: undefined }) }
              : money
                ? { label: "New this quarter", value: String(newThisQuarter), note: "Since the quarter began", icon: UserCheck, tone: "good" }
                /* Staff already see New this quarter above; the fourth figure is what is due for their clients this week. */
                : { label: "Due this week", value: String(dueWeek), note: dueWeek ? "Projects with a date in the next 7 days" : "Nothing is due this week", icon: Clock, tone: "warn", href: "/admin/projects?view=calendar" },
          ]} />
          <RailCard title="Pipeline" aside={money ? (quotes.length ? `${quotes.length} open · ${naira(pipeValue)}` : "Nothing open") : undefined}>
            {pipe.map((p) => (
              <Link key={p.t} href={p.href} className="adRc__row" aria-label={`${p.t}: ${p.n}. ${p.s}`}>
                <span className="adRc__line"><strong>{p.t}</strong><span className="ad__num">{p.n}</span></span>
                <MiniBar share={p.n / pmax} tone={p.bar} />
                <span className="adRc__sub">{p.s}</span>
              </Link>
            ))}
            <p className="adRc__tip"><Lightbulb aria-hidden="true" /><span>A quote sent the same day is the one most often accepted.</span></p>
          </RailCard>
          <RailCard title="By service" aside="Tap to filter">
            {svcN.map(({ s, n }) => (
              <Link key={s.slug} href={href({ service: service === s.slug ? undefined : s.slug, page: undefined })} className={`adRc__row${service === s.slug ? " on" : ""}`} aria-pressed={service === s.slug} aria-label={`${s.short}: ${n} clients. ${service === s.slug ? "Showing them. Press to show all." : "Press to filter the table."}`}>
                <span className="adRc__split">
                  <span className="adRc__ic">{serviceGlyph(s.slug)}</span>
                  <span><span className="adRc__line"><strong>{s.short}</strong><span className="ad__num" style={{ color: "var(--ad-dim)" }}>{n}</span></span><MiniBar share={n / smax} /></span>
                </span>
              </Link>
            ))}
          </RailCard>
          <RailCard title="Client activity" wide>
            {feed.length ? feed.map((f) => {
              const inner = <>
                <span className={`adMk adMk--sm adMk--${avTone(f.who)}`} aria-hidden="true">{initials(f.who)}</span>
                <span style={{ minWidth: 0, display: "grid", fontSize: ".85rem" }}><span><strong>{f.who}</strong> {f.what}</span><span className="adRc__sub">{f.when}</span></span>
              </>;
              return f.href
                ? <Link key={f.id} href={f.href} className="adRc__row" style={{ flexDirection: "row", gap: ".65rem", alignItems: "flex-start" }}>{inner}</Link>
                : <div key={f.id} className="adRc__row" style={{ flexDirection: "row", gap: ".65rem", alignItems: "flex-start" }}>{inner}</div>;
            }) : <p className="ad__dim" style={{ margin: 0 }}>Nothing has changed for a client yet. New work shows here as it happens.</p>}
          </RailCard>
        </>}
      >
        <Deck
          id="clients"
          title="Clients needing you"
          items={deck}
          emptyTitle="Every client is looked after."
          emptyBody="Nobody is waiting on a reply from you."
          emptyNext={{ label: "Add a client", href: "/admin/clients?new=1" }}
        />

        <section className="adList" aria-label="All clients" data-tour="clients-filters">
          <div className="adList__hd">
            <h2>All clients</h2>
            <span className="adList__n">{all.filter((r) => r.state !== "archived").length}</span>
            <span className="adList__sp" />
            <UrlSearch label="Search clients" placeholder="Client or contact" />
          </div>
          <div className="adList__pad"><Chips label="Service" grows items={chipItems} current={service ?? ""} /></div>
          <Tabs label="Client status" items={tabItems} current={tab} />
          <div className="adList__tools">
            <ClientFilters
              keep={{ tab: tab === "all" ? undefined : tab, service, q: query.q, sort: query.sort, dir: query.dir, per: query.per, from, to }}
              money={moneyF} portal={portalF} dept={dept} departments={departments.map((d) => ({ value: d.id, label: d.name }))} active={facetN}
            />
            <DateRange
              label="Client since"
              value={{ from, to }}
              href={(r) => href({ from: r.from, to: r.to, page: undefined })}
              keep={{ q: query.q, tab: query.tab, dept: query.dept, service: query.service, money: query.money, portal: query.portal, sort: query.sort, dir: query.dir, per: query.per }}
              action="/admin/clients"
            />
            <span className="adSp" />
            {hasFilters ? <Link className="ad__btn" href="/admin/clients">Clear filters</Link> : null}
            {exportable ? <a className="ad__btn" href={exportHref}>Export</a> : null}
          </div>
          {destructive ? (
            <ClientsBulk actions={[
              { kind: "clients:invite", label: "Send portal invite", icon: "mail", confirm: "Send a portal invite to {n} clients? Anyone who already has an account is skipped." },
              { kind: "clients:archive", label: "Archive", icon: "archive", danger: true, confirm: "Archive {n} clients? Their projects, invoices and history stay; you can restore them from Archived." },
            ]} />
          ) : null}
          <div className="ad__scroll" id="clients-table" tabIndex={0} role="region" aria-label="Clients table, scrolls sideways" data-lenis-prevent>
            <table className="ad__t">
              <thead>
                <tr>
                  <th aria-sort={sort === "company" ? (direction === "asc" ? "ascending" : "descending") : undefined}>
                    <span className="ad__pickRow">{destructive ? <PickAll label="Select every client" /> : null}<Link href={sortHref("company")}>Client</Link></span>
                  </th>
                  <th>Next step</th>
                  <th>Services</th>
                  <th className="num" aria-sort={sort === "projects" ? (direction === "asc" ? "ascending" : "descending") : undefined}><Link href={sortHref("projects")}>Live</Link></th>
                  {money ? <th className="num" aria-sort={sort === "owed" ? (direction === "asc" ? "ascending" : "descending") : undefined}><Link href={sortHref("owed")}>Outstanding</Link></th> : null}
                  <th aria-sort={sort === "since" ? (direction === "asc" ? "ascending" : "descending") : undefined}><Link href={sortHref("since")}>Since</Link></th>
                  <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const c = r.client;
                  const tone = r.next.tone;
                  return (
                    <ClickRow key={c.id} href={`/admin/clients/${c.id}`} label={`${c.company}, ${c.name}. ${r.next.tag}: ${r.next.text}. Press Enter to open.`}>
                      <td>
                        <span className="ad__who">
                          {destructive ? <RowPick id={c.id} label={c.company} /> : null}
                          <span className={`adMk adMk--${avTone(c.company)}`} aria-hidden="true">{initials(c.company)}</span>
                          <span>
                            <Link href={`/admin/clients/${c.id}`}><b>{c.company}</b></Link>
                            <small>{c.name}{c.tags?.length ? ` · ${c.tags.join(", ")}` : ""}</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="adT__stack">
                          <span className="adT__row">
                            <span className={`ad__pill ad__pill--${tone}`}>{r.next.tag}</span>
                            {r.next.when ? <small className="ad__dim">{r.next.when}</small> : null}
                          </span>
                          <span className="adT__clip">{r.next.text}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "flex", gap: ".35rem", flexWrap: "wrap", maxWidth: "14rem" }}>
                          {c.services.length ? c.services.map((s) => <span key={s} className="ad__pill ad__pill--flat">{SERVICES.find((x) => x.slug === s)?.short}</span>) : <span className="ad__dim">None yet</span>}
                        </span>
                      </td>
                      <td className="num">{r.live.length}</td>
                      {money ? <td className="num" style={r.late ? { color: "var(--ad-bad-ink)", fontWeight: 600 } : undefined}>{r.owed ? naira(r.owed) : <span className="ad__dim">Nothing owed</span>}</td> : null}
                      <td className="num">{dateWords(c.since, nowMs(), false)}</td>
                      <td className="ad__rmC"><ClientMenu client={c} lead={r.state === "lead"} /></td>
                    </ClickRow>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!list.length ? (
            <Empty title={emptyTitle} action={hasFilters && all.length ? <Link className="ad__btn" href="/admin/clients">Clear filters</Link> : !all.length ? <AddClient label="Add your first client" /> : undefined}>{emptyBody}</Empty>
          ) : (
            <Pager
              label="Client pages" total={list.length} page={page} per={per} noun={list.length === 1 ? "client" : "clients"}
              href={(patch) => href({ page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : query.per })}
            />
          )}
        </section>
      </Workbench>
    </>
  );
}

