"use client";

import { useRouter } from "next/navigation";
import { Pick } from "./pick";
import type { ChipItem } from "./chips";

/** The chip row as a searchable picker, for a list that can grow. Choosing navigates to the chip's link. */
export function ChipPick({ items, current, label }: { items: ChipItem[]; current: string; label: string }) {
  const router = useRouter();
  return (
    <div className="adChipPick">
      <Pick label={label} search value={current}
        options={items.map((c) => ({ value: c.key, label: c.count !== undefined ? `${c.label} (${c.count})` : c.label }))}
        onChange={(v) => { const to = items.find((c) => c.key === v); if (to) router.push(to.href, { scroll: false }); }} />
    </div>
  );
}
