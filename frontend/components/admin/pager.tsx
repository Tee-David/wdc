import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { DismissDetails } from "./dismiss-details";

/**
 * THE ONE PAGER every admin list uses (the mockups' .pager).
 *
 * Rows per page on the left, then "1–25 of 132", then Previous and Next
 * with their arrows beside the words rather than on their own. A server
 * component with a native <details> list for the per-page choice,
 * of links, so it works before hydration and with JavaScript off, and the
 * state lives in the URL where a reload or a shared link keeps it.
 *
 * `href` builds the address for a change; the page owns its own query.
 */
export const PER_PAGE_OPTIONS = [25, 50, 100] as const;

export function readPer(value: string | string[] | undefined, fallback = 25) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PER_PAGE_OPTIONS as readonly number[]).includes(n) ? n : fallback;
}

export function Pager({
  label,
  total,
  page,
  per,
  href,
  noun = "rows",
  perOptions = PER_PAGE_OPTIONS,
}: {
  label: string;
  total: number;
  page: number;
  per: number;
  href: (patch: { page?: number; per?: number }) => string;
  noun?: string;
  perOptions?: readonly number[];
}) {
  const pages = Math.max(1, Math.ceil(total / per));
  const first = total ? (page - 1) * per + 1 : 0;
  const last = Math.min(page * per, total);
  return (
    <nav className="ad__pager" aria-label={label}>
      {perOptions.length ? (
        <DismissDetails className="ad__perPage">
          <summary aria-label={`Rows per page, ${per}`}>
            {per} per page <ChevronDown aria-hidden="true" />
          </summary>
          <div className="ad__perMenu">
            {perOptions.map((n) => (
              <Link key={n} href={href({ per: n, page: 1 })} aria-current={n === per ? "true" : undefined}>
                {n} per page
              </Link>
            ))}
          </div>
        </DismissDetails>
      ) : <span />}
      <div className="ad__pgNav">
        <span className="ad__pgRange ad__num">{first}–{last} of {total} {noun}</span>
        {page > 1 ? (
          <Link className="ad__pgBtn" href={href({ page: page - 1 })} rel="prev"><ArrowLeft aria-hidden="true" />Previous</Link>
        ) : (
          <span className="ad__pgBtn" aria-disabled="true"><ArrowLeft aria-hidden="true" />Previous</span>
        )}
        {page < pages ? (
          <Link className="ad__pgBtn" href={href({ page: page + 1 })} rel="next">Next<ArrowRight aria-hidden="true" /></Link>
        ) : (
          <span className="ad__pgBtn" aria-disabled="true">Next<ArrowRight aria-hidden="true" /></span>
        )}
      </div>
    </nav>
  );
}
