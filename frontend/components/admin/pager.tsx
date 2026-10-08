import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DismissDetails } from "./dismiss-details";

/**
 * THE ONE PAGER every admin list uses (the mockups' .pager).
 *
 * "1–25 of 132 people" and the rows-per-page choice on the left; Previous,
 * "Page 2 of 6" and Next on the right, each button with its chevron beside
 * the word. On a phone the range and the rows choice share one line and the
 * three controls become a full-width bar underneath, 48px tall (the approved
 * Contacts design). A server component with a native <details> list for the
 * per-page choice, of links, so it works before hydration and with JavaScript
 * off, and the state lives in the URL where a reload or a shared link keeps it.
 *
 * `href` builds the address for a change; the page owns its own query.
 */
export const PER_PAGE_OPTIONS = [10, 25, 50, 100, 250] as const;

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
      <span className="ad__pgRange ad__num">{first}–{last} of {total} {noun}</span>
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
        {page > 1 ? (
          <Link className="ad__pgBtn" href={href({ page: page - 1 })} rel="prev"><ChevronLeft aria-hidden="true" />Previous</Link>
        ) : (
          <span className="ad__pgBtn" aria-disabled="true"><ChevronLeft aria-hidden="true" />Previous</span>
        )}
        <span className="ad__pgPage ad__num">Page {Math.min(page, pages)} of {pages}</span>
        {page < pages ? (
          <Link className="ad__pgBtn" href={href({ page: page + 1 })} rel="next">Next<ChevronRight aria-hidden="true" /></Link>
        ) : (
          <span className="ad__pgBtn" aria-disabled="true">Next<ChevronRight aria-hidden="true" /></span>
        )}
      </div>
    </nav>
  );
}
