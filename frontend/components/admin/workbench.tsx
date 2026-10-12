import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { CountUp } from "./count-up";
import "./workbench.css";

/**
 * THE WORK COLUMN AND ITS RAIL (the approved "Flow" layout): the work on the
 * left, a 356px rail of figures and context on the right. Under 1180px the
 * rail drops below the work as a two column grid; under 720px it is one
 * column. Pass `railLabel` so the rail is a named landmark.
 *
 * Pieces for the rail: RailHead, StatTiles (a grid of StatTile), RailCard and
 * MiniBar. StatTile is a solid icon tile, the label, the figure counting up
 * and one note line; give it `href` and it is a link, `onClick`-less on
 * purpose (a server page links to the list the figure counts).
 */
export function Workbench({ children, rail, railLabel }: { children: React.ReactNode; rail?: React.ReactNode; railLabel?: string }) {
  return (
    <div className="adWb">
      <div className="adWb__work">{children}</div>
      {rail ? <aside className="adWb__rail" aria-label={railLabel ?? "Context"} data-tour="rail">{rail}</aside> : null}
    </div>
  );
}

export function RailHead({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="adRh">
      <h2>{title}</h2>
      {href && link ? <Link href={href}>{link}<ArrowRight aria-hidden="true" width={14} height={14} /></Link> : null}
    </div>
  );
}

export type StatProps = {
  label: string;
  value: string;
  note?: string;
  noteTone?: "bad" | "accent";
  icon: LucideIcon;
  tone?: "brand" | "good" | "bad" | "warn" | "live" | "neutral";
  href?: string;
};

export function StatTile({ label, value, note, noteTone, icon: Icon, tone = "brand", href }: StatProps) {
  const inner = (
    <>
      <span className="adStat__hd">
        <span className={`adStat__ic adStat__ic--${tone}`} aria-hidden="true"><Icon /></span>
        <span className="adStat__lbl">{label}</span>
      </span>
      <CountUp value={value} className="adStat__v" />
      {note ? <span className={`adStat__n${noteTone ? ` adStat__n--${noteTone}` : ""}`}>{note}</span> : null}
    </>
  );
  return href
    ? <Link className="adStat" href={href} aria-label={`${label}: ${value}.${note ? ` ${note}` : ""}`}>{inner}</Link>
    : <div className="adStat" role="group" aria-label={`${label}: ${value}.${note ? ` ${note}` : ""}`}>{inner}</div>;
}

export function StatTiles({ items }: { items: StatProps[] }) {
  return <div className="adStats">{items.map((s) => <StatTile key={s.label} {...s} />)}</div>;
}

export function RailCard({ title, aside, link, children, wide, label }: {
  title: string;
  /** A short quiet word beside the title ("Tap to filter"). */
  aside?: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  wide?: boolean;
  label?: string;
}) {
  return (
    <section className={`adRc${wide ? " adRail--wide" : ""}`} aria-label={label ?? title}>
      <div className="adRc__hd">
        <h2>{title}</h2>
        {aside ? <span>{aside}</span> : null}
        {link ? <Link href={link.href}>{link.label}<ArrowRight aria-hidden="true" width={14} height={14} style={{ marginLeft: ".3rem" }} /></Link> : null}
      </div>
      {children}
    </section>
  );
}

/** A share of the largest value, drawn from the baseline. `tone` is a token like var(--ad-series-2). */
export function MiniBar({ share, tone }: { share: number; tone?: string }) {
  const w = Math.max(0, Math.min(1, share));
  return <span className="adBar" aria-hidden="true"><span style={{ "--w": w, ...(tone ? { background: tone } : {}) } as React.CSSProperties} /></span>;
}
