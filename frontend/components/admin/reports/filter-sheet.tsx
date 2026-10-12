"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Dialog } from "@/components/admin/dialog";
import { ChecklistPick } from "./multi-pick";

/**
 * THE FILTERS THAT DO NOT FIT ON THE BAR, in a sheet.
 *
 * A plain GET form: nothing is held in client state except open or closed, so
 * "Apply" is a navigation and the report you land on is a link you can send.
 * Each group is a searchable dropdown of ticked choices, shown as chips; none ticked means no limit.
 * The period, the comparison and the grouping stay on the bar, and ride along
 * here as hidden fields so applying a filter never resets them.
 */
type Opt = { value: string; label: string };
export type SheetOptions = { services: Opt[]; departments: Opt[]; staff: Opt[]; methods: Opt[]; statuses: Opt[]; clients: Opt[]; currencies: Opt[] };
export type SheetValues = { svc: string[]; dept: string[]; staff: string[]; method: string[]; status: string[]; client: string[]; cur: string; min: number | null; max: number | null; q: string };

export function FilterSheet({ options, values, carry, count }: { options: SheetOptions; values: SheetValues; carry: Record<string, string>; count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ad__btn rp__filterBtn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <SlidersHorizontal aria-hidden="true" /> Filters{count ? <span className="rp__badge ad__num">{count}</span> : null}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Filter this report" wide>
        <form method="get" action="/admin/reports" className="rp__sheet">
          {Object.entries(carry).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <div className="rp__sheetBody" data-lenis-prevent>
            <ChecklistPick name="svc" legend="Service" options={options.services} checked={values.svc} />
            <ChecklistPick name="dept" legend="Department" options={options.departments} checked={values.dept} />
            <ChecklistPick name="client" legend="Client" options={options.clients} checked={values.client} />
            <ChecklistPick name="staff" legend="Person leading the work" options={options.staff} checked={values.staff} />
            <ChecklistPick name="method" legend="How the money moved" options={options.methods} checked={values.method} />
            <ChecklistPick name="status" legend="Invoice status" options={options.statuses} checked={values.status} />
            <fieldset className="rp__fs">
              <legend>Size of the invoice or expense</legend>
              <div className="rp__pair2">
                <label>At least<input type="number" name="min" inputMode="numeric" min={0} defaultValue={values.min ?? ""} placeholder="No minimum" /></label>
                <label>At most<input type="number" name="max" inputMode="numeric" min={0} defaultValue={values.max ?? ""} placeholder="No maximum" /></label>
              </div>
            </fieldset>
            <fieldset className="rp__fs">
              <legend>Currency</legend>
              <div className="rp__checks">
                {options.currencies.map((c) => (
                  <label key={c.value} className="rp__check"><input type="radio" name="cur" value={c.value} defaultChecked={values.cur === c.value} /><span>{c.label}</span></label>
                ))}
              </div>
              <p className="rp__hint">One currency at a time. Amounts in other currencies are never converted.</p>
            </fieldset>
            <fieldset className="rp__fs">
              <legend>Search</legend>
              <input type="search" name="q" className="rp__find" defaultValue={values.q} placeholder="A client or contact name" aria-label="Search clients" />
            </fieldset>
          </div>
          <div className="rp__sheetFoot">
            <a className="ad__btn ad__btn--plain" href={`/admin/reports?${new URLSearchParams(carry).toString()}`}>Clear filters</a>
            <button type="submit" className="ad__btn ad__btn--primary">Apply filters</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
