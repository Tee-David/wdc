import Link from "next/link";
import type { Point, Row } from "@/lib/admin/reports/compute";
import { full, short } from "./fmt";

/**
 * THE CHARTS OF THE REPORTS PAGE, drawn on the server from the same numbers as
 * the tables under them. Bars are solid fills (series colours), grow from the
 * baseline on arrival and not at all under reduced motion; every bar has its
 * figure as text, so nothing is only a picture.
 */

/** Money in against money out, one pair of bars per period, with the running net as a line. */
export function FlowChart({ points, cur }: { points: Point[]; cur: string }) {
  const peak = Math.max(1, ...points.flatMap((p) => [p.collected, p.spent]));
  const run = points.map((p) => p.cumulative);
  const lo = Math.min(0, ...run), hi = Math.max(1, ...run);
  const y = (v: number) => 100 - ((v - lo) / (hi - lo || 1)) * 100;
  const pts = points.map((p, i) => `${((i + 0.5) / points.length) * 100},${y(p.cumulative)}`).join(" ");
  return (
    <figure className="rp__flow" aria-label="Money in, money out and running net">
      <div className="rp__plot">
        <ul className={`rp__cols${points.length > 8 ? " rp__cols--dense" : ""}`} style={{ ["--n" as string]: points.length }}>
          {points.map((p) => (
            <li key={p.key}>
              <span className="rp__pair" role="img" aria-label={`${p.label}: collected ${full(p.collected, cur)}, spent ${full(p.spent, cur)}, net ${full(p.net, cur)}`}>
                <i className="rp__in" style={{ height: `${Math.max(p.collected ? 3 : 0, (p.collected / peak) * 100)}%` }} />
                <i className="rp__out" style={{ height: `${Math.max(p.spent ? 3 : 0, (p.spent / peak) * 100)}%` }} />
              </span>
              <small>{p.label}</small>
            </li>
          ))}
        </ul>
        {points.length > 1 ? (
          <svg className="rp__line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={pts} vectorEffect="non-scaling-stroke" />
          </svg>
        ) : null}
      </div>
      <figcaption className="rp__key">
        <span><i className="rp__in" /> Collected</span><span><i className="rp__out" /> Spent</span><span><i className="rp__net" /> Running net, ends at {short(run[run.length - 1] ?? 0, cur)}</span>
      </figcaption>
    </figure>
  );
}

/** A list of rows as horizontal bars: name, figure, share. Rows link when they carry an address. */
export function HList({ rows, cur, empty, count, noun, unit = "money" }: { rows: Row[]; cur: string; empty: string; count?: number; noun?: string; unit?: "money" | "count" | "days" }) {
  if (!rows.length) return <p className="rp__empty">{empty}</p>;
  const shown = count ? rows.slice(0, count) : rows;
  const peak = Math.max(1, ...shown.map((r) => r.amount));
  const text = (r: Row) => (unit === "money" ? full(r.amount, cur) : unit === "days" ? `${r.amount} days` : String(r.amount));
  return (
    <ul className="rp__hl">
      {shown.map((r) => (
        <li key={r.label}>
          <span className="rp__hlTop">
            {r.href ? <Link href={r.href}><b>{r.label}</b></Link> : <b>{r.label}</b>}
            <span className="ad__num">{text(r)}</span>
          </span>
          <span className="rp__track" aria-hidden="true"><i style={{ width: `${Math.max(r.amount > 0 ? 2 : 0, (r.amount / peak) * 100)}%` }} /></span>
          <small>
            {[r.share != null && unit === "money" ? `${Math.round(r.share * 100)}% of the total` : "", r.n != null && noun ? `${r.n} ${noun}${r.n === 1 ? "" : "s"}` : "", r.sub ?? ""].filter(Boolean).join(" · ")}
          </small>
        </li>
      ))}
    </ul>
  );
}

/** Vertical bars for a handful of labelled buckets, each with its figure on top. */
export function Columns({ items, cur, unit = "money", tone = "series" }: { items: { label: string; value: number; sub?: string; bad?: boolean }[]; cur: string; unit?: "money" | "count"; tone?: "series" | "age" }) {
  const peak = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="rp__cols rp__cols--few" style={{ ["--n" as string]: items.length }}>
      {items.map((i, k) => (
        <li key={i.label}>
          <b className="ad__num">{unit === "money" ? short(i.value, cur) : i.value}</b>
          <span className="rp__pair rp__pair--one" role="img" aria-label={`${i.label}: ${unit === "money" ? full(i.value, cur) : i.value}`}>
            <i className={tone === "age" ? `rp__age rp__age--${Math.min(k, 4)}` : "rp__in"} style={{ height: `${Math.max(i.value ? 4 : 0, (i.value / peak) * 100)}%` }} />
          </span>
          <small>{i.label}</small>
          {i.sub ? <small className="rp__sub">{i.sub}</small> : null}
        </li>
      ))}
    </ul>
  );
}

/** Funnel: each step a bar scaled to the first, with the step's own figure and how many of the one before it came through. */
export function Funnel({ steps }: { steps: { label: string; n: number; note?: string }[] }) {
  const top = Math.max(1, steps[0]?.n ?? 1);
  return (
    <ol className="rp__funnel">
      {steps.map((s, i) => (
        <li key={s.label}>
          <span className="rp__hlTop"><b>{s.label}</b><span className="ad__num">{s.n}{i > 0 && steps[i - 1].n ? ` · ${Math.round((s.n / steps[i - 1].n) * 100)}% of the step before` : ""}</span></span>
          <span className="rp__track" aria-hidden="true"><i style={{ width: `${Math.max(s.n ? 2 : 0, (s.n / top) * 100)}%` }} /></span>
          {s.note ? <small>{s.note}</small> : null}
        </li>
      ))}
    </ol>
  );
}
