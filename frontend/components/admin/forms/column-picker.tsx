"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Columns3 } from "lucide-react";
import { resetColumns, saveColumns } from "@/lib/forms/actions";

/**
 * Which columns this viewer sees, and in what order.
 *
 * Saved per form in a cookie by the server, so the next page load draws the
 * chosen columns straight away instead of the defaults and then a jump.
 * Reordering is two buttons per row rather than dragging: they work from a
 * keyboard and on a phone, and need no library.
 */
export function ColumnPicker({ formKey, columns, chosen }: {
  formKey: string;
  columns: { key: string; label: string }[];
  chosen: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [order, setOrder] = useState<string[]>(() => [...chosen, ...columns.map((c) => c.key).filter((k) => !chosen.includes(k))]);
  const [on, setOn] = useState<Set<string>>(() => new Set(chosen));
  const [find, setFind] = useState("");
  const label = (k: string) => columns.find((c) => c.key === k)?.label ?? k;
  const move = (i: number, by: number) => setOrder((o) => { const n = [...o]; const [x] = n.splice(i, 1); n.splice(i + by, 0, x); return n; });
  const shown = order.filter((k) => !find || label(k).toLowerCase().includes(find.toLowerCase()));

  return (
    <details className="adForms__cols">
      <summary className="ad__btn"><Columns3 aria-hidden="true" /> Columns</summary>
      <div className="adForms__colsPanel" role="group" aria-label="Columns">
        {columns.length > 10 ? (
          <input type="search" placeholder="Find a column" aria-label="Find a column" value={find} onChange={(e) => setFind(e.target.value)} />
        ) : null}
        <ol>
          {shown.map((k) => {
            const i = order.indexOf(k);
            return (
              <li key={k}>
                <label>
                  <input type="checkbox" checked={on.has(k)}
                    onChange={() => setOn((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })} />
                  <span>{label(k)}</span>
                </label>
                <button type="button" className="ad__rm" aria-label={`Move ${label(k)} up`} disabled={i === 0 || Boolean(find)} onClick={() => move(i, -1)}><ArrowUp aria-hidden="true" /></button>
                <button type="button" className="ad__rm" aria-label={`Move ${label(k)} down`} disabled={i === order.length - 1 || Boolean(find)} onClick={() => move(i, 1)}><ArrowDown aria-hidden="true" /></button>
              </li>
            );
          })}
        </ol>
        <div className="ad__row">
          <button type="button" className="ad__btn ad__btn--primary" disabled={pending || !on.size}
            onClick={() => start(async () => { await saveColumns(formKey, order.filter((k) => on.has(k))); router.refresh(); })}>
            {pending ? "Saving..." : "Save columns"}
          </button>
          <button type="button" className="ad__btn" disabled={pending}
            onClick={() => start(async () => { await resetColumns(formKey); router.refresh(); })}>
            Reset
          </button>
        </div>
      </div>
    </details>
  );
}
