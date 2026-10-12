"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

/**
 * A TABLE ROW THAT OPENS ITS ITEM when pressed anywhere (the pattern for every
 * admin list). Links, buttons, inputs and the row's ⋮ menu keep their own
 * behaviour and never open the row. The row is a tab stop and Enter opens it;
 * `label` is what a screen reader hears, so it says what Enter does.
 */
const OWN = "a, button, input, select, textarea, label, [role='menu'], [data-own]";

export function ClickRow({ href, label, className, children, search, scroll = true }: {
  href: string; label: string; className?: string; children: ReactNode; search?: string;
  /** False when the address only opens a sheet on this page, so the page stays where it is. */
  scroll?: boolean;
}) {
  const router = useRouter();
  const go = (e: MouseEvent<HTMLTableRowElement>) => {
    if ((e.target as HTMLElement).closest(OWN)) return;
    if (e.metaKey || e.ctrlKey) { window.open(href, "_blank"); return; }
    router.push(href, { scroll });
  };
  const key = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); router.push(href, { scroll }); }
  };
  return <tr className={`adRow${className ? ` ${className}` : ""}`} tabIndex={0} aria-label={label} data-search={search} onClick={go} onKeyDown={key}>{children}</tr>;
}
