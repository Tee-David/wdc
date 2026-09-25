import Link from "next/link";
import { BulkBar, PickAll, RowPick } from "@/components/admin/bulk";
import { SERVICES } from "@/lib/services";
import { getClients, getClientsByService, getInvoicesFor, getProjectsFor } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira, nairaShort } from "@/lib/admin/types";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { Empty, Panel, Tile, when } from "@/components/admin/bits";
import { Archive, Boxes, Users, Wallet } from "lucide-react";
import { AddClient } from "@/components/admin/client-form";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { ClientMenu } from "@/components/admin/row-actions";
import { Pager, readPer } from "@/components/admin/pager";
import { DateRange } from "@/components/admin/date-range";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { avTone, initials } from "@/lib/admin/client-mark";
import { ExampleNote } from "@/components/admin/example-note";

export const metadata = { title: "Clients" };

/**
 * Clients, GROUPED BY SERVICE, which is how you asked to see them.
 *
 * A client appears under every service they buy, because that is the truth: a
 * client on branding and web is a branding client on the day you are looking
 * at branding work. The flat list underneath is the same people once each,
 * with what they are worth and what is open.
 */
type ClientQuery = {
  q?: string;
  service?: string;
  status?: string;
  sort?: string;
  dir?: string;
  page?: string;
  per?: string;
  /* "service" shows the grouping by what they buy; anything else, the list. */
  view?: string;
  /* Client since, as Lagos calendar days; `to` includes the whole day. */
  from?: string;
  to?: string;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SORTS = ["company", "projects", "owed", "since"] as const;
type ClientSort = (typeof SORTS)[number];

function queryHref(query: ClientQuery, changes: Partial<ClientQuery>) {
  const params = new URLSearchParams();
  const next = { ...query, ...changes };
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const suffix = params.toString();
  return `/admin/clients${suffix ? `?${suffix}` : ""}#client-list`;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<ClientQuery>;
}) {
  await syncStore();
  persistSoon();
  const query = await searchParams;
  /* Staff see who and what, not what is owed; exports are the owner's. */
  const role = await adminRole();
  const money = can(role, "money");
  const exportable = can(role, "exports");
  const search = query.q?.trim().toLocaleLowerCase() ?? "";
  const per = readPer(query.per);
  const from = query.from && DAY_RE.test(query.from) ? query.from : undefined;
  const to = query.to && DAY_RE.test(query.to) ? query.to : undefined;
  const service = SERVICES.find((item) => item.slug === query.service)?.slug;
  const status = query.status === "archived" || query.status === "all" ? query.status : "active";
  const sort: ClientSort = SORTS.includes(query.sort as ClientSort) && (money || query.sort !== "owed") ? query.sort as ClientSort : "since";
  const direction = query.dir === "asc" || query.dir === "desc"
    ? query.dir
    : sort === "company" ? "asc" : "desc";
  const source = getClients({ includeArchived: status !== "active" });
  const grouped = getClientsByService();
  const rows = source
    .filter((client) => status !== "archived" || client.archived)
    .filter((client) => !service || client.services.includes(service))
    .filter((client) => (!from || client.since.slice(0, 10) >= from) && (!to || client.since.slice(0, 10) <= to))
    .filter((client) => !search || [client.company, client.name, client.email, client.sector,
      ...(client.tags ?? []), ...(client.contacts ?? []).flatMap((x) => [x.name, x.email ?? ""])]
      .some((value) => value.toLocaleLowerCase().includes(search)))
    .map((client) => ({
      client,
      owed: getInvoicesFor(client.id)
        .filter((invoice) => invoice.status !== "Draft")
        .reduce((sum, invoice) => sum + invoiceTotals(invoice).due, 0),
      live: getProjectsFor(client.id).filter((project) => project.stage !== "Delivered").length,
    }))
    .sort((a, b) => {
      const order = direction === "asc" ? 1 : -1;
      if (sort === "company") return order * a.client.company.localeCompare(b.client.company);
      if (sort === "projects") return order * (a.live - b.live) || a.client.company.localeCompare(b.client.company);
      if (sort === "owed") return order * (a.owed - b.owed) || a.client.company.localeCompare(b.client.company);
      return order * a.client.since.localeCompare(b.client.since);
    });
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageCount = Math.max(1, Math.ceil(rows.length / per));
  const page = Math.min(requestedPage, pageCount);
  const clients = rows.slice((page - 1) * per, page * per);
  const hasFilters = Boolean(search || service || status !== "active" || from || to);
  const sortHref = (column: ClientSort) => queryHref(query, {
    sort: column,
    dir: sort === column ? direction === "asc" ? "desc" : "asc" : column === "company" ? "asc" : "desc",
    page: undefined,
  });
  const exportParams = new URLSearchParams();
  for (const key of ["q", "service", "status", "sort", "dir", "from", "to"] as const) {
    if (query[key]) exportParams.set(key, query[key]);
  }
  const exportHref = `/admin/clients/export${exportParams.size ? `?${exportParams}` : ""}`;

  /* THE ROW OF FIGURES, all read off the store: nothing here is typed. */
  const active = getClients();
  const archivedCount = getClients({ includeArchived: true }).filter((c) => c.archived).length;
  const quarterStart = quarterStartInLagos();
  const newThisQuarter = active.filter((c) => c.since.slice(0, 10) >= quarterStart).length;
  const balances = active.map((c) => getInvoicesFor(c.id)
    .filter((invoice) => invoice.status !== "Draft")
    .reduce((sum, invoice) => sum + invoiceTotals(invoice).due, 0));
  const owedTotal = balances.reduce((a, b) => a + b, 0);
  const withBalance = balances.filter((b) => b > 0).length;
  const multi = active.filter((c) => c.services.length > 1);
  const pairs = new Map<string, number>();
  for (const c of multi) {
    const names = c.services.map((x) => SERVICES.find((sv) => sv.slug === x)?.short ?? x).sort();
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const key = `${names[i]} and ${names[j]}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
  }
  const topPair = [...pairs.entries()].sort((a, b) => b[1] - a[1])[0];
  const view = query.view === "service" ? "service" : status === "archived" ? "archived" : "everyone";
  const statusOf = (c: (typeof rows)[number]["client"]) => c.archived
    ? (c.mergedInto ? { label: "Merged", tone: "flat" } : { label: "Archived", tone: "flat" })
    : money && getInvoicesFor(c.id).some((invoice) => invoiceStatus(invoice) === "Overdue")
      ? { label: "Overdue", tone: "bad" }
      : { label: "Active", tone: "good" };

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Clients</h1>
          <p>{money ? "Everyone you work for, what they buy and what they owe." : "Everyone you work for, and what they buy."}</p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          {exportable ? <a className="ad__btn" href={exportHref}>Export CSV</a> : null}
          <AddClient dataTour="clients-add" />
        </div>
      </div>

      <ExampleNote />

      <dl className="ad__tiles ad__tiles--4">
        <Tile label="Active clients" value={String(active.length)} icon={Users} note={newThisQuarter ? `${newThisQuarter} new this quarter` : "None new this quarter"} />
        {money ? (
          <Tile label="Owed to us" value={nairaShort(owedTotal)} icon={Wallet} iconTone="live" note={withBalance ? `${withBalance} client${withBalance === 1 ? "" : "s"} with a balance` : "Nobody owes anything"} />
        ) : null}
        <Tile label="Buying more than one service" value={`${multi.length} of ${active.length}`} icon={Boxes} iconTone="good" note={topPair ? `${topPair[0]} bought together most` : "Each buys one service"} />
        <Tile label="Archived" value={String(archivedCount)} icon={Archive} iconTone="warn" note="Kept for their invoices and history" />
      </dl>

      <nav className="ad__tabsNav" aria-label="Client views">
        <Link href="/admin/clients" aria-current={view === "everyone" ? "page" : undefined}>Everyone <span className="ad__tabN">{active.length}</span></Link>
        <Link href="/admin/clients?view=service" aria-current={view === "service" ? "page" : undefined}>By service</Link>
        <Link href="/admin/clients?status=archived#client-list" aria-current={view === "archived" ? "page" : undefined}>Archived <span className="ad__tabN">{archivedCount}</span></Link>
      </nav>

      <div className="ad__stack">
        {view === "service" ? (
        <Panel title="By service">
          <div style={{ padding: ".8rem 1rem" }}>
            {SERVICES.map((sv) => {
              const list = grouped.get(sv.slug) ?? [];
              return (
                <div key={sv.slug} style={{ padding: ".5rem 0", borderBottom: "1px solid var(--ad-line)" }}>
                  <div className="ad__row" style={{ justifyContent: "space-between" }}>
                    <b>{sv.short}</b>
                    <span className="ad__dim ad__num">{list.length}</span>
                  </div>
                  <div className="ad__row" style={{ marginTop: ".35rem" }}>
                    {list.length
                      ? list.map((c) => (
                          <Link key={c.id} href={`/admin/clients/${c.id}`} className="ad__pill ad__pill--flat">
                            {c.company}
                          </Link>
                        ))
                      : <span className="ad__dim">Nobody yet.</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
        ) : (
        <Panel title="Everyone">
          <div className="ad__filterBar" data-tour="clients-filters">
          {/* The range is its own form, so it sits beside this one rather
              than inside it: a form inside a form is invalid HTML. */}
          <form className="ad__filterForm" method="get" action="/admin/clients#client-list" aria-label="Filter clients">
            <label className="ad__filterSearch">
              <span className="ad__sr">Search clients</span>
              <input name="q" type="search" defaultValue={query.q} placeholder="Search name, company, email, sector or tag" />
            </label>
            <label>
              <span className="ad__sr">Service</span>
              <select name="service" defaultValue={service ?? ""}>
                <option value="">All services</option>
                {SERVICES.map((item) => <option key={item.slug} value={item.slug}>{item.short}</option>)}
              </select>
            </label>
            <label>
              <span className="ad__sr">Status</span>
              <select name="status" defaultValue={status}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All statuses</option>
              </select>
            </label>
            {from ? <input type="hidden" name="from" value={from} /> : null}
            {to ? <input type="hidden" name="to" value={to} /> : null}
            {query.per ? <input type="hidden" name="per" value={per} /> : null}
            <button className="ad__btn ad__btn--primary" type="submit">Apply</button>
          </form>
            <DateRange
              label="Client since"
              value={{ from, to }}
              href={(r) => queryHref(query, { from: r.from, to: r.to, page: undefined })}
              keep={{ q: query.q, service: query.service, status: query.status, sort: query.sort, dir: query.dir, per: query.per }}
              action="/admin/clients#client-list"
            />
            {hasFilters ? <Link className="ad__btn" href="/admin/clients#client-list">Clear</Link> : null}
          </div>
          <div className="ad__listMeta" id="client-list" aria-live="polite">
            <span>{rows.length} {rows.length === 1 ? "client" : "clients"}</span>
          </div>
            {can(role, "destructive") ? (
              <BulkBar target="clients-table" noun="clients" actions={[
                { kind: "clients:archive", label: "Archive", icon: "archive", danger: true, confirm: "Archive {n} clients? Their projects, invoices and history stay; you can restore them from Archived." },
              ]} />
            ) : null}
          <div className="ad__scroll" id="clients-table">
            <table className="ad__t">
              <thead>
                <tr>
                  <th aria-sort={sort === "company" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                    <span className="ad__pickRow">{can(role, "destructive") ? <PickAll label="Select every client" /> : null}<Link href={sortHref("company")}>Client</Link></span>
                  </th><th>Sector</th><th>Buys</th>
                  <th className="num" aria-sort={sort === "projects" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                    <Link href={sortHref("projects")}>Projects</Link>
                  </th>
                  {money ? <th className="num" aria-sort={sort === "owed" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                    <Link href={sortHref("owed")}>Owed</Link>
                  </th> : null}
                  <th aria-sort={sort === "since" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                    <Link href={sortHref("since")}>Since</Link>
                  </th>
                  <th>Status</th>
                  <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(({ client: c, owed, live }) => {
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="ad__who">
                          {can(role, "destructive") ? <RowPick id={c.id} label={c.company} /> : null}
                          <span className={`ad__av ad__av--${avTone(c.company)}`} aria-hidden="true">{initials(c.company)}</span>
                          <span>
                            <Link href={`/admin/clients/${c.id}`}><b>{c.company}</b></Link>
                            <small>{c.name}{c.tags?.length ? ` · ${c.tags.join(", ")}` : ""}</small>
                          </span>
                        </span>
                      </td>
                      <td>{c.sector || <span className="ad__dim">Not set</span>}</td>
                      <td>
                        <span className="ad__row">
                          {c.services.map((s) => (
                            <span key={s} className="ad__pill ad__pill--flat">
                              {SERVICES.find((x) => x.slug === s)?.short}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="num">{live}</td>
                      {money ? <td className="num">{owed ? naira(owed) : <span className="ad__dim">Nil</span>}</td> : null}
                      <td className="num">{when(c.since)}</td>
                      <td><span className={`ad__pill ad__pill--${statusOf(c).tone}`}>{statusOf(c).label}</span></td>
                      <td className="ad__rmC"><ClientMenu client={c} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <Empty title={hasFilters ? "No clients match these filters" : "No clients yet"} action={hasFilters ? <Link className="ad__btn" href="/admin/clients#client-list">Clear filters</Link> : <AddClient />}>
              {hasFilters
                ? "Try a broader search or clear the filters to see every active client."
                : "Add the first person or business you work with, then connect their projects, forms, and invoices."}
            </Empty>
          )}
          {rows.length ? (
            <Pager
              label="Client pages"
              total={rows.length}
              page={page}
              per={per}
              noun={rows.length === 1 ? "client" : "clients"}
              href={(patch) => queryHref(query, {
                page: patch.page && patch.page > 1 ? String(patch.page) : undefined,
                per: patch.per ? String(patch.per) : query.per,
              })}
            />
          ) : null}
        </Panel>
        )}
      </div>
    </>
  );
}

/** The first day of this calendar quarter, in Lagos (UTC+1, no daylight saving). */
function quarterStartInLagos() {
  const d = new Date(Date.now() + 3_600_000);
  return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1)).toISOString().slice(0, 10);
}
