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
  return (
    <>
      <div className="adDash__plot">
        <div className="adDash__axis" aria-hidden="true">
          {[4, 3, 2, 1, 0].map((i) => <span key={i}>{nairaShort(step * i)}</span>)}
        </div>
        <div className="adDash__chart" role="img" aria-label={`Collected and spent by month: ${months.map((m) => `${m.label} ${nairaShort(m.in)} in, ${nairaShort(m.out)} out`).join("; ")}`}>
          {months.map((m) => (
            <div className={`adDash__chartMonth${m === now ? " is-now" : ""}`} key={m.month}>
              <div className="adDash__chartBars">
                <span className="adDash__chartBar adDash__chartBar--in" style={{ height: `${m.in ? Math.max(2, m.in / top * 100) : 0}%` }} title={`Collected ${naira(m.in)}`} />
                <span className="adDash__chartBar adDash__chartBar--out" style={{ height: `${m.out ? Math.max(2, m.out / top * 100) : 0}%` }} title={`Spend ${naira(m.out)}`} />
              </div>
              <small>{m.label}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="adDash__foot">
        {totals.map((t) => (
          <span className="adDash__legend" key={t.label}>{t.key ? <i className={`is-${t.key}`} /> : null}{t.label} <b>{nairaShort(t.value)}</b></span>
        ))}
      </div>
    </>
  );
}
