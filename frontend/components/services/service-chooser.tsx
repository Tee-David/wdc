"use client";

import { useState } from "react";
import Link from "next/link";
import { NEEDS, type NeedId } from "@/lib/service-needs";

/**
 * "I need to ...": marks the service rows that fit, on the page, with nothing
 * loaded and nothing hidden. The rows are server-rendered with the needs they
 * answer in `data-needs`; this only sets `data-need` on their list, and the
 * CSS does the rest, so the whole list is readable without script.
 */
export function ServiceChooser({ listId }: { listId: string }) {
  const [need, setNeed] = useState<NeedId | null>(null);

  const pick = (id: NeedId) => {
    const next = need === id ? null : id;
    setNeed(next);
    const list = document.getElementById(listId);
    if (!list) return;
    if (next) list.dataset.need = next;
    else delete list.dataset.need;
  };

  const fits = need ? NEEDS.find((n) => n.id === need)!.services.length : 0;
  return (
    <div className="svh-choose">
      <div className="svh-choose__row" role="group" aria-label="What do you need to do?">
        <span className="svh-choose__k">I need to</span>
        {NEEDS.map((n) => (
          <button key={n.id} type="button" className="svh-need" aria-pressed={need === n.id} onClick={() => pick(n.id)}
            aria-controls={listId}>
            {n.label}
          </button>
        ))}
      </div>
      <p className="svh-choose__alt">
        <span role="status">{need ? `${fits === 1 ? "One service fits" : `${fits} services fit`}, marked below.` : ""}</span>{" "}
        Want a number first? <Link href="/tools/estimate">Get a price range in eight questions</Link>.
      </p>
    </div>
  );
}

export default ServiceChooser;
