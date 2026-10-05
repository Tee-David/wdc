"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Loader2, Mail, MoreHorizontal, RotateCcw, Send, Trash2, X, type LucideIcon } from "lucide-react";
import { runBulk } from "@/lib/admin/bulk-actions";
import { toast } from "./toast";
import { ask } from "./confirm";
import { Dialog } from "./dialog";
import type { ActionState } from "@/lib/admin/validate";

const ICONS: Record<string, LucideIcon> = { check: Check, close: X, archive: Archive, mail: Mail, reopen: RotateCcw, publish: Send, trash: Trash2 };

export type BulkAction = { kind: string; label: string; icon: keyof typeof ICONS; danger?: boolean; confirm?: string };

/** A row's tick box. Inside the first cell, so the phone's sticky column keeps it. */
export function RowPick({ id, label }: { id: string; label: string }) {
  return <input type="checkbox" className="adRowPick" value={id} aria-label={`Select ${label}`} />;
}

/** "Select all" in the header: ticks or clears every visible row in the table. */
export function PickAll({ label = "Select all" }: { label?: string }) {
  return (
    <input type="checkbox" className="adRowPickAll" aria-label={label}
      onChange={(e) => {
        const table = e.currentTarget.closest("table");
        table?.querySelectorAll<HTMLInputElement>("tbody tr:not([hidden]) .adRowPick").forEach((b) => { b.checked = e.currentTarget.checked; });
        table?.dispatchEvent(new Event("change", { bubbles: true }));
      }} />
  );
}

/**
 * THE BULK BAR, for any list whose rows carry a `RowPick`: it appears when
 * something is ticked, says how many, and offers what those rows can have done
 * to them. Sticky at the top of the list on a wide screen, and floating above
 * the tab bar on a phone, with the words dropped to icons (the same bar as the
 * form entries).
 */
export function BulkBar({ target, noun, actions, more = [], onRun }: {
  target: string; noun: string; actions: BulkAction[];
  /** The rest, under More, so the bar stays one line: never a wall of buttons. */
  more?: Omit<BulkAction, "icon">[];
  onRun?: (kind: string, ids: string[]) => Promise<ActionState>;
}) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<ActionState["outcomes"]>();

  useEffect(() => {
    const box = document.getElementById(target);
    if (!box) return;
    const read = () => {
      const picked = [...box.querySelectorAll<HTMLInputElement>(".adRowPick:checked")].map((b) => b.value);
      setIds(picked);
      const all = box.querySelector<HTMLInputElement>(".adRowPickAll");
      const every = box.querySelectorAll(".adRowPick").length;
      if (all) { all.checked = picked.length > 0 && picked.length === every; all.indeterminate = picked.length > 0 && picked.length < every; }
      box.querySelectorAll<HTMLInputElement>(".adRowPick").forEach((b) => b.closest("tr")?.classList.toggle("is-picked", b.checked));
    };
    box.addEventListener("change", read);
    return () => box.removeEventListener("change", read);
  }, [target]);

  const clear = () => {
    const box = document.getElementById(target);
    box?.querySelectorAll<HTMLInputElement>(".adRowPick, .adRowPickAll").forEach((b) => { b.checked = false; b.indeterminate = false; });
    box?.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const run = async (a: Omit<BulkAction, "icon">) => {
    if (a.confirm && !(await ask(a.confirm.replace("{n}", String(ids.length))))) return;
    setBusy(a.kind);
    const r = await (onRun ? onRun(a.kind, ids) : runBulk(a.kind, ids)).catch(() => null);
    setBusy(null);
    toast(r?.message ?? "That could not be done just now.", r?.ok ? "good" : "bad");
    if (r?.outcomes?.length) { setOutcomes(r.outcomes); clear(); router.refresh(); }
    if (r?.ok && !r.outcomes?.length) { clear(); router.refresh(); }
  };

  if (!ids.length && !outcomes?.length) return null;
  return (
    <>
    {ids.length ? (
    <div className="adBulk" role="region" aria-label={`Selected ${noun}`}>
      <b className="adBulk__n">{ids.length} selected</b>
      {actions.map((a) => {
        const Icon = ICONS[a.icon];
        return (
          <button key={a.kind} type="button" className={`ad__btn adBulk__btn${a.danger ? " is-danger" : ""}`} disabled={Boolean(busy)} onClick={() => void run(a)}>
            {busy === a.kind ? <Loader2 className="ad__spin" aria-hidden="true" /> : <Icon aria-hidden="true" />} <span className="adBulk__t">{a.label}</span>
          </button>
        );
      })}
      {more.length ? (
        <details className="adBulk__more">
          <summary className="ad__btn adBulk__btn"><MoreHorizontal aria-hidden="true" /> <span className="adBulk__t">More</span></summary>
          <div className="adBulk__menu" role="group" aria-label="More actions">
            {more.map((a) => (
              <button key={a.kind} type="button" className={a.danger ? "is-danger" : undefined} disabled={Boolean(busy)}
                onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); void run(a); }}>
                {busy === a.kind ? <Loader2 className="ad__spin" aria-hidden="true" /> : null}{a.label}
              </button>
            ))}
          </div>
        </details>
      ) : null}
      <button type="button" className="ad__iconButton adBulk__x" aria-label="Clear the selection" onClick={clear}><X aria-hidden="true" /></button>
    </div>) : null}
    <Dialog open={Boolean(outcomes?.length)} onClose={() => setOutcomes(undefined)} title="Selection results" wide>
      <p>Each row was checked separately. Updated rows are saved; failed rows explain what to do next.</p>
      <div className="ad__scroll" tabIndex={0} role="region" aria-label="Bulk action results" data-lenis-prevent>
        <table className="ad__t"><thead><tr><th>Person</th><th>Result</th></tr></thead><tbody>{outcomes?.map(row => <tr key={row.id}><td><b>{row.label}</b></td><td><span className={`ad__pill ${row.ok ? "ad__pill--good" : "ad__pill--bad"}`}>{row.ok ? "Updated" : "Not updated"}</span><small>{row.message}</small></td></tr>)}</tbody></table>
      </div>
      <button type="button" className="ad__btn" onClick={() => setOutcomes(undefined)}>Close</button>
    </Dialog>
    </>
  );
}
