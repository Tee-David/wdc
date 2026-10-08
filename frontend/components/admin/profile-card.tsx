import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/**
 * THE TOP OF A RECORD'S PAGE (the mockups' Client, Project and Invoice
 * boards): a breadcrumb, then one card holding who or what this is, its state,
 * how to reach them, the actions, and a strip of the few figures that matter.
 *
 * Every value is passed in by the page from its own records; the card only
 * lays them out. The page keeps its one h1, which is here.
 */
export type ProfileStat = { label: string; value: ReactNode; badge?: { label: string; tone: "good" | "bad" | "warn" | "live" | "flat" } };

export function ProfileCard({
  crumbs,
  initials,
  icon,
  iconStyle,
  tone = "live",
  title,
  pills,
  lines,
  tags,
  actions,
  stats,
  children,
}: {
  crumbs: { href: string; label: string }[];
  initials?: string;
  /** A glyph in place of initials, for a thing rather than a person. */
  icon?: ReactNode;
  /** Colours the icon tile (a project's chosen colour); unset keeps the tone. */
  iconStyle?: CSSProperties;
  tone?: "brand" | "live" | "good" | "warn" | "neutral";
  title: string;
  pills?: ReactNode;
  lines?: ReactNode;
  tags?: ReactNode;
  actions?: ReactNode;
  stats?: ProfileStat[];
  /** Anything that belongs in the card under the rest, such as a stage track. */
  children?: ReactNode;
}) {
  return (
    <>
      <nav className="ad__crumbs" aria-label="Breadcrumb">
        {crumbs.map((c) => (
          <span key={c.href}><Link href={c.href}>{c.label}</Link><ChevronRight aria-hidden="true" /></span>
        ))}
        <b aria-current="page">{title}</b>
      </nav>
      <section className="ad__profile">
        <div className="ad__profileTop">
          {initials || icon ? <span className={`ad__profileAv ad__av--${tone}`} style={icon ? iconStyle : undefined} aria-hidden="true">{icon ?? initials}</span> : null}
          <div className="ad__profileMain">
            <div className="ad__profileTitle">
              <h1>{title}</h1>
              {pills}
            </div>
            {lines ? <div className="ad__profileLines">{lines}</div> : null}
            {tags ? <div className="ad__profileTags">{tags}</div> : null}
          </div>
          {actions ? <div className="ad__profileActions">{actions}</div> : null}
        </div>
        {stats?.length ? (
          <dl className="ad__profileStats">
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}{s.badge ? <span className={`ad__pill ad__pill--${s.badge.tone}`}>{s.badge.label}</span> : null}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {children}
      </section>
    </>
  );
}
