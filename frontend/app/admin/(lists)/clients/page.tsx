import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { getClients, getClientsByService, getInvoicesFor, getProjectsFor } from "@/lib/admin/store";
import { invoiceTotals, naira } from "@/lib/admin/types";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { DemoNote, Empty, Panel, when } from "@/components/admin/bits";
import { AddClient } from "@/components/admin/client-form";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { ClientMenu } from "@/components/admin/row-actions";

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
};

const PAGE_SIZE = 10;
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
  const query = await searchParams;
  /* Staff see who and what, not what is owed; exports are the owner's. */
  const role = await adminRole();
  const money = can(role, "money");
  const exportable = can(role, "exports");
  const search = query.q?.trim().toLocaleLowerCase() ?? "";
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
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const clients = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = Boolean(search || service || status !== "active");
  const sortHref = (column: ClientSort) => queryHref(query, {
    sort: column,
    dir: sort === column ? direction === "asc" ? "desc" : "asc" : column === "company" ? "asc" : "desc",
    page: undefined,
  });
  const exportParams = new URLSearchParams();
  for (const key of ["q", "service", "status", "sort", "dir"] as const) {
    if (query[key]) exportParams.set(key, query[key]);
  }
  const exportHref = `/admin/clients/export${exportParams.size ? `?${exportParams}` : ""}`;

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Clients</h1>
          <p>{getClients().length} active clients, grouped by what they buy.</p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          <AddClient dataTour="clients-add" />
        </div>
      </div>

      <DemoNote>
        Adding, editing and archiving are live and go through{" "}
        <code>lib/admin/actions.ts</code>. What they write to is still the
        in-memory store, so a change holds until the server restarts and is
        then gone. Wiring CockroachDB underneath it changes one file.
      </DemoNote>

      <div className="ad__stack">
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

        <Panel title="Everyone">
          <form className="ad__filterBar" method="get" action="/admin/clients#client-list" aria-label="Filter clients" data-tour="clients-filters">
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
            <button className="ad__btn ad__btn--primary" type="submit">Apply</button>
            {hasFilters ? <Link className="ad__btn" href="/admin/clients#client-list">Clear</Link> : null}
            {exportable ? <a className="ad__btn" href={exportHref}>Export CSV</a> : null}
          </form>
          <div className="ad__listMeta" id="client-list" aria-live="polite">
            <span>{rows.length} {rows.length === 1 ? "client" : "clients"}</span>
            {pageCount > 1 ? <span>Page {page} of {pageCount}</span> : null}
          </div>
          <div className="ad__scroll">
            <table className="ad__t">
              <thead>
                <tr>
                  <th aria-sort={sort === "company" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                    <Link href={sortHref("company")}>Client</Link>
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
                  <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(({ client: c, owed, live }) => {
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/clients/${c.id}`}><b>{c.company}</b></Link>
                        <small>{c.name}{c.archived ? (c.mergedInto ? " · Merged" : " · Archived") : ""}{c.tags?.length ? ` · ${c.tags.join(", ")}` : ""}</small>
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
          {pageCount > 1 ? (
            <nav className="ad__pagination" aria-label="Client pages">
              {page > 1 ? <Link className="ad__btn" href={queryHref(query, { page: String(page - 1) })}>Previous</Link> : <span />}
              <span>Page {page} of {pageCount}</span>
              {page < pageCount ? <Link className="ad__btn" href={queryHref(query, { page: String(page + 1) })}>Next</Link> : <span />}
            </nav>
          ) : null}
        </Panel>
      </div>
    </>
  );
}
