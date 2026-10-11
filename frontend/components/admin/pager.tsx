import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DismissDetails } from "./dismiss-details";

/**
 * THE ONE PAGER every admin list uses (the mockups' .pager).
 *
 * "1 to 5 of 9" on the left, the page numbers centred between chevrons, the
 * rows choice and "View all" on the right (the approved boards). On a phone
 * the range and the rows choice share one line and the numbers sit under them. A server component with a native <details> list for the
 * per-page choice, of links, so it works before hydration and with JavaScript
 * off, and the state lives in the URL where a reload or a shared link keeps it.
 *
 * `href` builds the address for a change; the page owns its own query.
 */
export const PER_PAGE_OPTIONS = [5, 10, 20] as const;
/** "View all": a page size no list reaches, so the whole list shows on one page. */
export const VIEW_ALL = 1000;

export function readPer(value: string | string[] | undefined, fallback = 5) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "all") return VIEW_ALL;
  const n = Number(raw);
  return n === VIEW_ALL || (PER_PAGE_OPTIONS as readonly number[]).includes(n) ? n : fallback;
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
  const cur = Math.min(page, pages);
  const first = total ? (cur - 1) * per + 1 : 0;
  const last = Math.min(cur * per, total);
  /* Numbers, with gaps once there are more than seven: 1 … 4 5 6 … 12. */
  const nums: (number | "gap")[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - cur) <= 1 || (pages <= 7)) nums.push(n);
    else if (nums[nums.length - 1] !== "gap") nums.push("gap");
  }
  return (
    <nav className="ad__pager" aria-label={label}>
      <span className="ad__pgRange ad__num" aria-label={`${first} to ${last} of ${total} ${noun}`}>{first} to {last} of {total}</span>
      <div className="ad__pgNav">
        {cur > 1 ? (
          <Link className="ad__pgBtn" href={href({ page: cur - 1 })} rel="prev" aria-label="Previous page"><ChevronLeft aria-hidden="true" /></Link>
        ) : (
          <span className="ad__pgBtn" aria-disabled="true"><ChevronLeft aria-hidden="true" /><span className="ad__sr">Previous page</span></span>
        )}
        {nums.map((n, i) => n === "gap" ? <span key={`g${i}`} className="ad__pgGap" aria-hidden="true">…</span> : n === cur ? (
          <span key={n} className="ad__pgBtn ad__pgNum is-on" aria-current="page"><span className="ad__sr">Page </span>{n}</span>
        ) : (
          <Link key={n} className="ad__pgBtn ad__pgNum" href={href({ page: n })} aria-label={`Page ${n}`}>{n}</Link>
        ))}
        {cur < pages ? (
          <Link className="ad__pgBtn" href={href({ page: cur + 1 })} rel="next" aria-label="Next page"><ChevronRight aria-hidden="true" /></Link>
        ) : (
          <span className="ad__pgBtn" aria-disabled="true"><ChevronRight aria-hidden="true" /><span className="ad__sr">Next page</span></span>
        )}
      </div>
      <div className="ad__pgEnd">
        {perOptions.length ? (
          <DismissDetails className="ad__perPage">
            <summary aria-label={`Rows per page, ${per >= VIEW_ALL ? "all" : per}`}>
              {per >= VIEW_ALL ? "All" : `${per} per page`} <ChevronDown aria-hidden="true" />
            </summary>
            <div className="ad__perMenu">
              {perOptions.map((n) => (
                <Link key={n} href={href({ per: n, page: 1 })} aria-current={n === per ? "true" : undefined}>
                  {n} per page
                </Link>
              ))}
            </div>
          </DismissDetails>
        ) : null}
        {perOptions === PER_PAGE_OPTIONS && per < VIEW_ALL && total > per ? (
          <Link className="ad__pgAll" href={href({ per: VIEW_ALL, page: 1 })}>View all <ArrowRight aria-hidden="true" /></Link>
        ) : null}
      </div>
    </nav>
  );
}
