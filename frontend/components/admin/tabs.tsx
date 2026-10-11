import Link from "next/link";
import "./tabs.css";

/**
 * TABS THAT DRAW THEIR OWN UNDERLINE, for a page whose tab lives in the URL.
 *
 * The page reads the tab from its search params (so a reload and a shared
 * link keep it) and says which one is current. Each tab is a link, so it works
 * before hydration; the underline is a pseudo-element that scales in from the
 * left on the current one (transform only, off under reduced motion). A count
 * is a solid chip: flat normally, `warn` or `bad` when the tab holds something
 * that needs a person.
 */
export type TabItem = { key: string; label: string; href: string; count?: number; tone?: "warn" | "bad" };

export function Tabs({ items, current, label }: { items: TabItem[]; current: string; label: string }) {
  return (
    <nav className="adTabs" aria-label={label}>
      {items.map((t) => (
        <Link key={t.key} href={t.href} scroll={false} className="adTabs__tab" aria-current={t.key === current ? "page" : undefined}>
          {t.label}
          {t.count !== undefined ? <span className={`adTabs__n${t.tone ? ` adTabs__n--${t.tone}` : ""} ad__num`}>{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
