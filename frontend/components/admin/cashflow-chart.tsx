"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { naira, nairaShort } from "@/lib/admin/types";

/**
 * COLLECTED AGAINST SPENT, BY MONTH. Drawn here in HTML and CSS rather than
 * by a charting package: six months of two series is twelve rectangles, and
 * a library for that is weight on two pages that are opened every day.
 *
 * Shared by the dashboard and Money so the two can never draw the same
 * months differently. The styles are in dashboard.css (`.adDash__plot`).
 */
export type Month = { month: string; label: string; in: number; out: number };

/** A round step for a chart axis: 1, 2 or 5 times a power of ten. */
export function niceStep(raw: number) {
  if (raw <= 0) return 100_00;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

export function CashflowChart({ months, totals }: {
  months: Month[];
  /** The footer's figures, e.g. Collected, Spend, Billed. */
  totals: { label: string; value: number; key?: "in" | "out" }[];
}) {
  const max = Math.max(1, ...months.flatMap((m) => [m.in, m.out]));
  /* Four gridlines on round numbers, so the axis reads ₦150k, ₦300k rather
     than ₦137,512. */
  const step = niceStep(max / 4);
  const top = step * 4;
  const now = months.at(-1);
  /* INTERACTIVE: each month is a button. Hover, tap or focus shows its
     figures in one tooltip (collected, spent, and the difference); the arrow
     keys walk the months. The same figures are in the table under the chart,
     so nothing is only in the tooltip. */
  const [active, setActive] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);
  const cols = useRef<(HTMLButtonElement | null)[]>([]);
  const m = active === null ? null : months[active];
  /* Beside the month, never over its bars: to the right in the first half, to the left in the second. */
  const right = active !== null && active < months.length / 2;
  const left = active === null ? 0 : ((right ? active + 1 : active) / months.length) * 100;
  const tip = useRef<HTMLDivElement>(null);
  /* Measured, so the tooltip stays inside the card on a narrow screen: beside
     the month when there is room, otherwise pushed back in from the edge. */
  useLayoutEffect(() => {
    const t = tip.current, box = plot.current;
    if (!t || !box || active === null) return;
    const w = box.clientWidth, tw = t.offsetWidth, col = w / months.length, gap = 6;
    const want = right ? (active + 1) * col + gap : active * col - tw - gap;
    t.style.left = `${Math.max(0, Math.min(w - tw, want))}px`;
  }, [active, right, months.length]);
  const move = (i: number) => { const n = Math.max(0, Math.min(months.length - 1, i)); setActive(n); cols.current[n]?.focus(); };
  return (
    <>
      <div className="adDash__plot">
        <div className="adDash__axis" aria-hidden="true">
          {[4, 3, 2, 1, 0].map((i) => <span key={i}>{nairaShort(step * i)}</span>)}
        </div>
        <div ref={plot} className="adDash__chart" role="group" aria-label="Collected and spent by month" onPointerLeave={() => setActive(null)}>
          {months.map((mo, i) => (
            <button type="button" key={mo.month} ref={(el) => { cols.current[i] = el; }}
              className={`adDash__chartMonth${mo === now ? " is-now" : ""}${active === i ? " is-on" : ""}`}
              aria-label={`${mo.label}: collected ${naira(mo.in)}, spent ${naira(mo.out)}`}
              tabIndex={active === null ? (mo === now ? 0 : -1) : active === i ? 0 : -1}
              onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") { e.preventDefault(); move(i + 1); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); move(i - 1); }
                else if (e.key === "Home") { e.preventDefault(); move(0); }
                else if (e.key === "End") { e.preventDefault(); move(months.length - 1); }
                else if (e.key === "Escape") setActive(null);
              }}>
              <span className="adDash__chartBars" aria-hidden="true">
                <span className="adDash__chartBar adDash__chartBar--in" style={{ height: `${mo.in ? Math.max(2, mo.in / top * 100) : 0}%` }} />
                <span className="adDash__chartBar adDash__chartBar--out" style={{ height: `${mo.out ? Math.max(2, mo.out / top * 100) : 0}%` }} />
              </span>
              <small aria-hidden="true">{mo.label}</small>
            </button>
          ))}
          {m ? (
            <div ref={tip} className="adDash__tip" style={{ left: `${left}%` }} role="status">
              <b className="adDash__tipH">{m.label}</b>
              <span><i className="is-in" aria-hidden="true" /><b>{naira(m.in)}</b> collected</span>
              <span><i className="is-out" aria-hidden="true" /><b>{naira(m.out)}</b> spent</span>
              <span className="adDash__tipNet">{m.in - m.out >= 0 ? "Kept" : "Short"} <b>{naira(Math.abs(m.in - m.out))}</b></span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="adDash__foot">
        {totals.map((t) => (
          <span className="adDash__legend" key={t.label}>{t.key ? <i className={`is-${t.key}`} /> : null}{t.label} <b>{nairaShort(t.value)}</b></span>
        ))}
        <details className="adDash__table">
          <summary>Show as a table</summary>
          <div className="ad__scroll">
            <table className="ad__t">
              <thead><tr><th>Month</th><th className="num">Collected</th><th className="num">Spent</th><th className="num">Difference</th></tr></thead>
              <tbody>
                {months.map((mo) => (
                  <tr key={mo.month}><td>{mo.label}</td><td className="num">{naira(mo.in)}</td><td className="num">{naira(mo.out)}</td><td className="num">{naira(mo.in - mo.out)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </>
  );
}
