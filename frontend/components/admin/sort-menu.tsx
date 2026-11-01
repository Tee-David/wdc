import Link from "next/link";
import { ArrowDownUp, ChevronDown } from "lucide-react";
import { DismissDetails } from "./dismiss-details";

/**
 * THE ONE "SORT BY" every list carries, beside its filters (owner, 2026-11-01:
 * every table sorts, newest first by default). Same shape as the date range
 * and the pager's rows choice: a <details> of links, so the order lives in the
 * URL, works before hydration, closes once a choice is made, and the page
 * stays where the reader is (components/ui/scroll-reset.tsx).
 *
 * A column header that sorts is still fine; this is the visible control.
 */
export type SortOption = { label: string; href: string; on: boolean };

export function SortMenu({ options, label = "Sort" }: { options: SortOption[]; label?: string }) {
  const current = options.find((o) => o.on) ?? options[0];
  return (
    <DismissDetails className="ad__range ad__sort">
      <summary aria-label={`${label}: ${current.label}`}>
        <ArrowDownUp aria-hidden="true" />
        <span>{current.label}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="ad__rangeMenu ad__sortMenu">
        <div className="ad__rangePresets">
          {options.map((o) => (
            <Link key={o.label} href={o.href} aria-current={o.on ? "true" : undefined}>{o.label}</Link>
          ))}
        </div>
      </div>
    </DismissDetails>
  );
}
