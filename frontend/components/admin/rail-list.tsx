import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import "./workbench.css";

/**
 * A SHORT LIST FOR THE RAIL ("Running now", "Best campaigns", "Top posts"):
 * a solid icon tile, a title, one quiet line, and optionally a solid tag at the
 * end. A row with `href` is a link. Inside a RailCard. Nothing here invents
 * data: a page passes the rows it has and an `empty` sentence for when it has
 * none.
 */
export type RailRow = {
  key: string;
  title: string;
  sub?: string;
  icon: LucideIcon;
  /** The tile colour; brand by default. */
  tone?: "brand" | "good" | "bad" | "warn" | "live" | "neutral";
  href?: string;
  tag?: { text: string; tone?: "good" | "warn" | "bad" | "flat" | "brand" | "live" };
};

const TILE: Record<string, string> = {
  brand: "var(--ad-tone-brand)", good: "var(--ad-tone-good)", bad: "var(--ad-tone-bad)",
  warn: "var(--ad-tone-warn)", live: "var(--ad-tone-live)", neutral: "var(--ad-tone-neutral)",
};

export function RailRows({ rows, empty }: { rows: RailRow[]; empty: string }) {
  if (!rows.length) return <p className="ad__dim" style={{ margin: 0, fontSize: ".85rem" }}>{empty}</p>;
  return (
    <>
      {rows.map((r) => {
        const Icon = r.icon;
        const inner = (
          <span className="adRc__split">
            <span className="adRc__ic" style={{ background: TILE[r.tone ?? "brand"] }} aria-hidden="true"><Icon /></span>
            <span>
              <span className="adRc__line"><strong>{r.title}</strong></span>
              {r.sub ? <span className="adRc__sub">{r.sub}</span> : null}
            </span>
            {r.tag ? <span className={`ad__pill ad__pill--${r.tag.tone ?? "flat"}`} style={{ flex: "none" }}>{r.tag.text}</span> : null}
          </span>
        );
        return r.href
          ? <Link key={r.key} href={r.href} className="adRc__row">{inner}</Link>
          : <div key={r.key} className="adRc__row">{inner}</div>;
      })}
    </>
  );
}
