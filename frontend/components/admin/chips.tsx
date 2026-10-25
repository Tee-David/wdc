import Link from "next/link";
import "./workbench.css";
import { ChipPick } from "./chip-pick";

/**
 * A ROW OF FILTER CHIPS THAT ARE LINKS ("All services 11", "Branding 2").
 *
 * The page reads the choice from the URL and says which chip is current, so a
 * reload and a shared link keep it and the chips work before hydration. The
 * current chip is a solid fill. The row scrolls sideways inside itself on a
 * phone and never widens the page. A list that can grow (`grows`, such as
 * services) is a searchable picker from five options instead: a wall of chips
 * past five is cut off on a phone (the owner's call, 2026-10-12).
 */
export type ChipItem = { key: string; label: string; href: string; count?: number | string };

export function Chips({ items, current, label, grows }: { items: ChipItem[]; current: string; label: string; grows?: boolean }) {
  if (grows && items.length >= 5) return <ChipPick items={items} current={current} label={label} />;
  return (
    <div className="adChips" role="group" aria-label={label} data-lenis-prevent-touch>
      {items.map((c) => (
        <Link key={c.key} href={c.href} scroll={false} className="adChip" aria-current={c.key === current ? "true" : undefined}>
          {c.label}{c.count !== undefined ? <span className="adChip__n">{c.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}
