import Link from "next/link";
import { ChevronRight } from "lucide-react";
import "./workbench.css";

/**
 * THE HEAD OF EVERY ADMIN PAGE: an h1, one line of lede, the page's one action
 * in the right slot and its chores behind a ⋮ menu (`chores`, a client
 * component that renders a RowMenu). The lede may stress one phrase with
 * <strong>. A record page passes `mark` (initials on a solid tile) and
 * `crumbs`. Server component: nothing here needs script.
 */
export function PageHead({
  title, lede, action, chores, crumbs, mark, markTone = "brand", children,
}: {
  title: string;
  lede?: React.ReactNode;
  /** The page's one action: a button or a sheet trigger. */
  action?: React.ReactNode;
  /** The ⋮ menu. */
  chores?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
  mark?: string;
  markTone?: "brand" | "live" | "good" | "warn" | "neutral";
  /** Extra lines under the lede (tags, facts). */
  children?: React.ReactNode;
}) {
  return (
    <>
      {crumbs?.length ? (
        <nav className="adPh__crumb" aria-label="Breadcrumb">
          {crumbs.map((c) => (<span key={c.href} style={{ display: "contents" }}><Link href={c.href}>{c.label}</Link><ChevronRight aria-hidden="true" /></span>))}
          <span aria-current="page">{title}</span>
        </nav>
      ) : null}
      <header className="adPh">
        <div className={mark ? "adPh__lead" : "adPh__text"}>
          {mark ? <span className={`adMk adMk--lg adMk--${markTone}`} aria-hidden="true">{mark}</span> : null}
          <div className="adPh__text">
            <h1>{title}</h1>
            {lede ? <p className="adPh__lede">{lede}</p> : null}
            {children}
          </div>
        </div>
        {action || chores ? <div className="adPh__acts">{action}{chores}</div> : null}
      </header>
    </>
  );
}
