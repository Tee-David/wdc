import AreaGate from "@/components/admin/owner-only";
import { Tabs } from "@/components/admin/tabs";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { ExportMenu, FilterBar } from "@/components/admin/reports/bar";
import { Clients, Money, Overview, Owing, Receivables, Recurring, Sales, Team, Work, type Ctx } from "@/components/admin/reports/sections";
import { syncStore } from "@/lib/admin/persist";
import { dateWords, nowMs } from "@/lib/admin/when";
import { METHODS } from "@/lib/admin/types";
import { listDepartments } from "@/lib/departments";
import { SERVICES } from "@/lib/services";
import { compareSpan, filterQuery, readFilters, TABS } from "@/lib/admin/reports/filters";
import { buildScope, owners } from "@/lib/admin/reports/scope";
import "@/components/admin/dashboard.css";
import "@/components/admin/reports/reports.css";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

/**
 * REPORTS: the books and the work, for any stretch of days, narrowed by
 * service, department, person, client, method, status and size, set against
 * an earlier stretch, and taken away as CSV or Excel with the same filters.
 * Owner only, because it is the books. Every figure is added up here from the
 * invoices, payments, expenses, quotes, projects and tasks as they stand; none
 * is stored, and each tab says how its figures are counted.
 */
export default async function Reports({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await syncStore();
  const sp = await searchParams;
  const now = nowMs();
  const f = readFilters(sp, now);
  const s = buildScope(f, now);
  const depts = await listDepartments();
  const span = { from: f.from, to: f.to };
  const ctx: Ctx = { s, f, span, prev: compareSpan(f), depts, sp };

  const staff = [...new Set([...s.projects.flatMap((p) => owners(p)), ...s.tasks.map((t) => t.assignee).filter(Boolean)])].sort();
  const options = {
    services: SERVICES.map((x) => ({ value: x.slug, label: x.short })),
    departments: (depts ?? []).map((d) => ({ value: d.id, label: d.name })),
    staff: staff.map((n) => ({ value: n, label: n })),
    methods: METHODS.map((m) => ({ value: m, label: m })),
    statuses: ["Sent", "Part paid", "Paid", "Overdue"].map((x) => ({ value: x, label: x })),
    clients: s.allClients.filter((c) => !c.archived).sort((a, b) => a.company.localeCompare(b.company)).map((c) => ({ value: c.id, label: c.company })),
    currencies: ["NGN", ...s.otherCurrencies].map((c) => ({ value: c, label: c })),
  };
  const names: Record<string, string> = {};
  for (const o of options.services) names[`svc:${o.value}`] = o.label;
  for (const o of options.departments) names[`dept:${o.value}`] = o.label;
  for (const o of options.clients) names[`client:${o.value}`] = o.label;

  const body = { overview: Overview, money: Money, receivables: Receivables, owing: Owing, sales: Sales, recurring: Recurring, work: Work, team: Team, clients: Clients }[f.tab];
  const Body = body;
  return (
    <AreaGate area="money" what="Reports">
      <div className="ad__head">
        <div>
          <h1>Reports</h1>
          <p>{dateWords(f.from, now, false)} to {dateWords(f.to, now, false)}{ctx.prev ? <>, against {dateWords(ctx.prev.from, now, false)} to {dateWords(ctx.prev.to, now, false)}</> : null}. <b>Added up from the books as they stand.</b></p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          <ExportMenu f={f} tab={f.tab} />
        </div>
      </div>
      <FilterBar f={f} options={options} names={names} />
      <Tabs label="Reports" current={f.tab} items={TABS.map(([k, label]) => ({ key: k, label, href: `/admin/reports${filterQuery(f, { tab: k === "overview" ? "" : k }) ? `?${filterQuery(f, { tab: k === "overview" ? "" : k })}` : ""}` }))} />
      <Body {...ctx} />
    </AreaGate>
  );
}
