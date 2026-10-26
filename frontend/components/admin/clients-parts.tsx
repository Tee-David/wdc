"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Filter, Inbox, Trash2, Upload } from "lucide-react";
import { RowMenu, type RowMenuItem } from "./row-menu";
import { BulkBar, type BulkAction } from "./bulk";
import { MessageClientForm } from "./row-actions";
import { runBulk } from "@/lib/admin/bulk-actions";
import type { ActionState } from "@/lib/admin/validate";
import { Dialog } from "./dialog";
import { FilterPick } from "./pick";
import { ImportClientsBody } from "./client-import";

/** The ⋮ menu in the Clients head: chores that are not "add a client". */
export function ClientsChores({ exportHref }: { exportHref?: string }) {
  const items: RowMenuItem[] = [
    { kind: "link", label: "Enquiries and forms", href: "/admin/forms", icon: Inbox },
    ...(exportHref ? [{ kind: "link" as const, label: "Export clients", href: exportHref, icon: Download, external: true }] : []),
    { kind: "dialog", label: "Import from a spreadsheet", title: "Import clients", icon: Upload, wide: false, render: (close) => <ImportClientsBody close={close} /> },
    { kind: "link", label: "Open Trash", href: "/admin/clients?tab=archived", icon: Trash2 },
  ];
  return <RowMenu items={items} label="clients, more" />;
}

type Opt = { value: string; label: string };

/**
 * The Filters sheet: the facets that are not a chip or a tab (money, portal,
 * department). A plain GET form, so the choice lands in the address bar and a
 * filtered list is a link. `keep` carries every other filter through.
 */
export function ClientFilters({ keep, money, portal, dept, departments, active }: {
  keep: Record<string, string | undefined>;
  money: string; portal: string; dept: string;
  departments: Opt[];
  /** How many facets are on, for the badge. */
  active: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ad__btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Filter aria-hidden="true" />Filters{active ? <span className="adList__n" style={{ marginLeft: ".25rem" }}>{active}</span> : null}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Filter clients">
        {open ? (
          <form method="get" action="/admin/clients" className="ad__fields" onSubmit={() => setOpen(false)}>
            {Object.entries(keep).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
            <FilterPick label="Money" name="money" defaultValue={money} placeholder="Any" options={[{ value: "late", label: "Has a late invoice" }, { value: "owes", label: "Owes money" }, { value: "clear", label: "Nothing owed" }]} />
            <FilterPick label="Portal" name="portal" defaultValue={portal} placeholder="Any" options={[{ value: "account", label: "Has an account" }, { value: "invited", label: "Invited, not joined" }, { value: "none", label: "Not invited" }]} />
            {departments.length ? <FilterPick label="Department" name="dept" defaultValue={dept} placeholder="All departments" options={departments} /> : null}
            <div className="ad__formActions">
              <Link className="ad__btn" href={`/admin/clients${keep.tab && keep.tab !== "all" ? `?tab=${keep.tab}` : ""}`} onClick={() => setOpen(false)}>Clear filters</Link>
              <button className="ad__btn ad__btn--primary" type="submit">Show clients</button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}

/**
 * The Clients bulk bar with Message: Message asks for the words in a sheet first, then sends one conversation
 * per ticked client. The other actions run through the shared bar as before.
 */
export function ClientsBulk({ actions }: { actions: BulkAction[] }) {
  const [ids, setIds] = useState<string[] | null>(null);
  const [answer, setAnswer] = useState<((r: ActionState) => void) | null>(null);
  const done = (r: ActionState) => { answer?.(r); setAnswer(null); setIds(null); };
  return (
    <>
      <BulkBar target="clients-table" noun="clients" actions={[{ kind: "clients:message", label: "Message", icon: "mail" }, ...actions]}
        onRun={(kind, picked) => kind === "clients:message"
          ? new Promise<ActionState>((resolve) => { setIds(picked); setAnswer(() => resolve); })
          : runBulk(kind, picked)} />
      <Dialog open={Boolean(ids)} onClose={() => done({ ok: false, message: "Nothing was sent." })} title={`Message ${ids?.length ?? 0} ${ids?.length === 1 ? "client" : "clients"}`} wide>
        {ids ? <MessageClientForm ids={ids} close={() => done({ ok: true, message: "" })} /> : null}
      </Dialog>
    </>
  );
}
