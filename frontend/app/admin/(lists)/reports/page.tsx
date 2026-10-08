import Link from "next/link";
import { ArrowLeft, Banknote, Download, FileText, Landmark, TrendingUp, UserPlus, Wallet} from "lucide-react";
import AreaGate from "@/components/admin/owner-only";
import { Empty, Panel, Tile } from "@/components/admin/bits";
import { DateRange } from "@/components/admin/date-range";
import { naira, nairaShort } from "@/lib/admin/types";
import { syncStore } from "@/lib/admin/persist";
import { byMethod, byMonth, change, expensesByCategory, previousOf, readPeriod, topClients, totalsFor } from "@/lib/admin/reports";
import "@/components/admin/dashboard.css";

export const metadata = { title: "Reports" };

/**
 * Reports: what came in, what went out and who it came from, for any stretch
 * of days, set against the stretch just before it. Owner only (it is the
 * books). Every figure is derived on the page; the CSV is the same query.
 */
export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await syncStore();
  const sp = await searchParams;
  const period = readPeriod(sp);
  const before = previousOf(period);
  const now = totalsFor(period);
  const prev = totalsFor(before);
  const months = byMonth(period);
  const clients = topClients(period);
  const methods = byMethod(period);
  const cats = expensesByCategory(period);
  const peak = Math.max(1, ...months.flatMap((m) => [m.collected, m.spent]));
  const qs = `from=${period.from}&to=${period.to}`;

  const badge = (a: number, b: number, goodWhenUp = true) => {
    const c = change(a, b);
    if (c === null) return { label: "New", tone: "live" as const };
    if (c === 0) return { label: "No change", tone: "flat" as const };
    return { label: `${c > 0 ? "+" : ""}${c}%`, tone: (c > 0) === goodWhenUp ? "good" as const : "bad" as const };
  };

  return (
    <AreaGate area="money" what="Reports">
      <div className="ad__head">
        <div>
          <Link href="/admin/money" className="ad__btn ad__btn--plain"><ArrowLeft aria-hidden="true" /> Money</Link>
          <h1>Reports</h1>
          <p>{period.from} to {period.to}, against the {before.from} to {before.to} before it.</p>
        </div>
        <div className="ad__row">
          <DateRange value={period} action="/admin/reports"
            href={(r) => `/admin/reports?${new URLSearchParams({ ...(r.from ? { from: r.from } : {}), ...(r.to ? { to: r.to } : {}) })}`} />
          <a className="ad__btn" href={`/admin/reports/export?${qs}`}><Download aria-hidden="true" /> CSV</a>
        </div>
      </div>

      <dl className="ad__tiles ad__tiles--5">
        <Tile label="Invoiced" value={nairaShort(now.invoiced)} icon={FileText} badge={badge(now.invoiced, prev.invoiced)} note={`${nairaShort(prev.invoiced)} before`} />
        <Tile label="Collected" value={nairaShort(now.collected)} icon={Wallet} iconTone="good" badge={badge(now.collected, prev.collected)} note={`${nairaShort(prev.collected)} before`} />
        <Tile label="Spent" value={nairaShort(now.spent)} icon={Banknote} iconTone="warn" badge={badge(now.spent, prev.spent, false)} note={`${nairaShort(prev.spent)} before`} />
        <Tile label="Net" value={nairaShort(now.net)} tone={now.net >= 0 ? "good" : "bad"} icon={TrendingUp} iconTone={now.net >= 0 ? "good" : "bad"} badge={badge(now.net, prev.net)} note="Collected less spent" />
        <Tile label="New clients" value={String(now.newClients)} icon={UserPlus} iconTone="live" badge={badge(now.newClients, prev.newClients)} note={`${now.projectsStarted} project${now.projectsStarted === 1 ? "" : "s"} started`} />
      </dl>

      <Panel title="Month by month">
        {months.some((m) => m.invoiced || m.collected || m.spent) ? (
          <>
            <ul className="adRep__bars" aria-label="Collected and spent by month">
              {months.map((m) => (
                <li key={m.month}>
                  <span className="adRep__pair" role="img" aria-label={`${m.label}: collected ${naira(m.collected)}, spent ${naira(m.spent)}`}>
                    <i className="adRep__in" style={{ height: `${Math.max(m.collected ? 3 : 0, (m.collected / peak) * 100)}%` }} />
                    <i className="adRep__out" style={{ height: `${Math.max(m.spent ? 3 : 0, (m.spent / peak) * 100)}%` }} />
                  </span>
                  <small>{m.label.replace(/\s\d{4}$/, "")}</small>
                </li>
              ))}
            </ul>
            <p className="adRep__key"><span><i className="adRep__in" /> Collected</span><span><i className="adRep__out" /> Spent</span></p>
            <div className="ad__scroll" data-lenis-prevent>
              <table className="ad__t">
                <thead><tr><th>Month</th><th className="num">Invoiced</th><th className="num">Collected</th><th className="num">Spent</th><th className="num">Net</th></tr></thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month}>
                      <td><b>{m.label}</b></td>
                      <td className="num">{naira(m.invoiced)}</td><td className="num">{naira(m.collected)}</td>
                      <td className="num">{naira(m.spent)}</td><td className="num">{naira(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Empty title="Nothing on the books for these days" icon={Landmark}>Widen the dates. Invoices, payments and expenses appear here as they are recorded.</Empty>
        )}
      </Panel>

      <div className="adRep__grid">
        <Panel title="Who paid most">
          {clients.length ? (
            <table className="ad__t"><thead><tr><th>Client</th><th className="num">Collected</th></tr></thead>
              <tbody>{clients.map((c) => <tr key={c.id}><td><Link href={`/admin/clients/${c.id}`}><b>{c.name}</b></Link></td><td className="num">{naira(c.amount)}</td></tr>)}</tbody></table>
          ) : <Empty title="No payments in this period">Collected money, by client, shows here.</Empty>}
        </Panel>
        <Panel title="How they paid">
          {methods.length ? (
            <table className="ad__t"><thead><tr><th>Method</th><th className="num">Collected</th></tr></thead>
              <tbody>{methods.map((m) => <tr key={m.method}><td>{m.method}</td><td className="num">{naira(m.amount)}</td></tr>)}</tbody></table>
          ) : <Empty title="No payments in this period">Cash, card, transfer and the rest, by amount.</Empty>}
        </Panel>
        <Panel title="Where it went">
          {cats.length ? (
            <table className="ad__t"><thead><tr><th>Category</th><th className="num">Spent</th></tr></thead>
              <tbody>{cats.map((c) => <tr key={c.category}><td>{c.category}</td><td className="num">{naira(c.amount)}</td></tr>)}</tbody></table>
          ) : <Empty title="No expenses in this period">Spend by category shows here.</Empty>}
        </Panel>
      </div>
    </AreaGate>
  );
}
