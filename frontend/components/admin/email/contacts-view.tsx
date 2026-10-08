"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, ChevronRight, Download, Mail, Plus, Search, SearchX, Tag, Upload, X } from "lucide-react";
import { mailPickedAction, mailPlanAction, suppressAction } from "@/lib/admin/contact-actions";
import { AdminState } from "../admin-state";
import { Pick } from "../pick";
import { ask } from "../confirm";
import { toast } from "../toast";
import { SyncButton } from "./contacts-ui";
import { AddSheet, Avatar, ContactSheet, ExportSheet, ImportSheet, TagSheet, TypeChip, type ContactRow } from "./contacts-sheets";
import type { ExportScope } from "@/lib/contacts-export";
import "./contacts.css";

type Filters = { q: string; type: string; status: string; tag: string; marketing: string };
type Picked = { id: string; name: string; email: string; status: ContactRow["status"] };

const TYPE_OPTIONS = [{ value: "client", label: "Client" }, { value: "lead", label: "Lead" }, { value: "subscriber", label: "Subscriber" }];
const STATUS_OPTIONS = [
  { value: "can-email", label: "Can get campaigns" }, { value: "subscribed", label: "Subscribed" }, { value: "stopped", label: "Asked to stop" },
  { value: "unsubscribed", label: "Unsubscribed" }, { value: "bounced", label: "Bounced" }, { value: "complained", label: "Complained" },
];
const people = (n: number) => `${n.toLocaleString("en-GB")} ${n === 1 ? "person" : "people"}`;

/**
 * THE CONTACTS LIST (the approved Contacts design on the admin's own parts).
 *
 * The server owns the data: the page reads one page of people, already
 * filtered, searched and counted, from the address (?q &type &status &tag
 * &page &per), and every control here only changes the address. What lives in
 * this component is what the address cannot hold: who is ticked (kept while
 * you page, so a bulk action can span pages), which sheet is open, and the
 * search box's text while it is being typed.
 *
 * Tables stay tables: the table is in its own scroll box, the first column
 * pinned. While a new page is coming the rows hold their place and dim; no
 * invented data is drawn.
 */
export function ContactsView({ rows, total, stats, filters, tags, filtered, kpis, pager }: {
  rows: ContactRow[]; total: number; stats: { total: number };
  filters: Filters; tags: { tag: string; n: number }[]; filtered: boolean;
  kpis: React.ReactNode; pager: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qv, setQv] = useState(filters.q);
  const [sel, setSel] = useState<Map<string, Picked>>(new Map());
  const [sheet, setSheet] = useState<null | "add" | "import" | "export" | "tag">(null);
  const [exportScope, setExportScope] = useState<ExportScope>("filtered");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const head = useRef<HTMLInputElement>(null);

  const go = useCallback((patch: Partial<Record<keyof Filters, string>>) => {
    const next = { ...filters, marketing: "", ...patch };
    const u = new URLSearchParams({ tab: "contacts" });
    for (const [k, v] of Object.entries(next)) if (v) u.set(k, v);
    start(() => router.push(`/admin/email?${u}`, { scroll: false }));
  }, [filters, router]);

  /* The search runs a beat after the last key, and not at all if nothing changed. */
  useEffect(() => {
    if (qv.trim() === filters.q) return;
    const t = window.setTimeout(() => go({ q: qv.trim() }), 350);
    return () => window.clearTimeout(t);
  }, [qv, filters.q, go]);

  const ids = useMemo(() => [...sel.keys()], [sel]);
  const onPage = rows.map((r) => r.id);
  const ticked = onPage.filter((i) => sel.has(i)).length;
  useEffect(() => { if (head.current) head.current.indeterminate = ticked > 0 && ticked < onPage.length; }, [ticked, onPage.length]);

  const tick = (r: ContactRow, on: boolean) => setSel((m) => {
    const n = new Map(m);
    if (on) n.set(r.id, { id: r.id, name: r.name, email: r.email, status: r.status }); else n.delete(r.id);
    return n;
  });
  const tickAll = (on: boolean) => setSel((m) => {
    const n = new Map(m);
    for (const r of rows) { if (on) n.set(r.id, { id: r.id, name: r.name, email: r.email, status: r.status }); else n.delete(r.id); }
    return n;
  });

  const refresh = () => router.refresh();

  /** Send email: a campaign draft for the ticked people who asked to hear from us, nobody else. */
  const mail = async (who: string[]) => {
    if (busy || !who.length) return;
    setBusy(true);
    try {
      const plan = await mailPlanAction(who);
      if (!plan.ok) { toast("That could not be done just now.", "bad"); return; }
      if (!plan.eligible) {
        toast(who.length === 1
          ? "They have not asked to hear from us, or they asked to stop, so campaigns cannot go to them."
          : `None of these ${who.length} people can get a campaign: they have not asked to hear from us, or they asked to stop.`, "bad");
        return;
      }
      if (plan.eligible < plan.total && !(await ask(`Email ${plan.eligible} of the ${plan.total} people? The other ${plan.total - plan.eligible} have not asked to hear from us, or asked to stop, so they are left out. A draft campaign opens for you to write.`, { verb: "Start the draft" }))) return;
      const r = await mailPickedAction(who).catch(() => null);
      toast(r?.message ?? "That could not be done just now.", r?.ok ? "good" : "bad");
      if (r?.ok && r.stamp) router.push(`/admin/email/campaigns/${r.stamp}`);
    } finally { setBusy(false); }
  };

  /** Suppress: behind the confirm dialog, which asks twice because leaving cannot be undone. */
  const stop = async (who: string[]): Promise<boolean> => {
    if (!who.length) return false;
    if (!(await ask(`Remove ${people(who.length)} from all email? They are moved to Asked to stop and never emailed again. Anything waiting to go to them is cancelled. This cannot be undone here.`, { verb: "Suppress" }))) return false;
    const r = await suppressAction(who).catch(() => null);
    toast(r?.message ?? "That could not be done just now.", r?.ok ? "good" : "bad");
    if (!r?.ok) return false;
    setSel((m) => { const n = new Map(m); who.forEach((i) => n.delete(i)); return n; });
    refresh();
    return true;
  };

  const exportSel = { ids, stopped: [...sel.values()].filter((p) => p.status !== "subscribed").length };
  const seed = rows.find((r) => r.id === openId) ?? null;
  const showSheet = (k: "add" | "import" | "export" | "tag", scope: ExportScope = "filtered") => { setExportScope(scope); setSheet(k); };

  return (
    <>
      <section className="ad__panel ctPanel" data-tour="email-contacts" aria-label="Contacts">
        <div className="ctHead">
          <div>
            <h2>Contacts</h2>
            <small role="status">{filtered ? `${people(total)} shown of ${stats.total.toLocaleString("en-GB")}` : people(stats.total)}</small>
          </div>
          <div className="ctActs">
            <SyncButton compact />
            <button type="button" className="ad__btn" data-icon-only aria-label="Import" onClick={() => showSheet("import")}><Upload aria-hidden="true" /><span className="ctLbl">Import</span></button>
            <button type="button" className="ad__btn" data-icon-only aria-label="Export" onClick={() => showSheet("export")}><Download aria-hidden="true" /><span className="ctLbl">Export</span></button>
            <button type="button" className="ad__btn ad__btn--primary" onClick={() => showSheet("add")}><Plus aria-hidden="true" />Add contact</button>
          </div>
        </div>
        {kpis}

        {stats.total === 0 ? (
          <div className="ctEmpty">
            <AdminState kind="first-use" title="No contacts yet" description="Bring in your clients, enquiries and newsletter sign-ups in one press, or import a list you already have permission to write to."
              action={<SyncButton />} secondaryAction={<button type="button" className="ad__btn" onClick={() => showSheet("import")}><Upload aria-hidden="true" />Import a list</button>} />
          </div>
        ) : (
          <>
            <div className="ctFilt">
              <div className="ctPick"><Pick label="Type" value={filters.type} placeholder="Any type" options={TYPE_OPTIONS} onChange={(v) => go({ type: v })} /></div>
              <div className="ctPick"><Pick label="Status" value={filters.status} placeholder="Any status" options={STATUS_OPTIONS} onChange={(v) => go({ status: v })} /></div>
              <div className="ctPick"><Pick label="Tag" value={filters.tag} placeholder="Any tag" search options={tags.map((t) => ({ value: t.tag, label: `${t.tag} (${t.n})` }))} onChange={(v) => go({ tag: v })} /></div>
              <label className="ctSearch">
                <Search aria-hidden="true" />
                <span className="ad__sr">Search contacts</span>
                <input type="search" value={qv} onChange={(e) => setQv(e.target.value)} placeholder="Search name, email or phone" autoComplete="off" />
              </label>
            </div>

            {rows.length ? (
              <>
                <p className="ctSwipe">Swipe the table sideways for more columns.</p>
                <div className={`ad__scroll ctScroll${pending ? " is-loading" : ""}`} aria-busy={pending} data-lenis-prevent>
                  <table className="ad__t ctT">
                    <caption className="ad__sr">Contacts, {rows.length} on this page</caption>
                    <thead>
                      <tr>
                        <th><span className="ctTh1"><label className="ctCb"><input ref={head} type="checkbox" checked={ticked === onPage.length && onPage.length > 0} onChange={(e) => tickAll(e.target.checked)} aria-label="Select everyone on this page" /></label>Contact</span></th>
                        <th>Type</th><th>Source</th><th>Tags</th><th>Opens</th><th className="ctR"><span className="ad__sr">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className={`ctRow${sel.has(r.id) ? " is-picked" : ""}`} tabIndex={0} aria-label={`Open ${r.name || r.email}`}
                          onClick={(e) => { if (!(e.target as HTMLElement).closest("button, a, label, input")) setOpenId(r.id); }}
                          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); setOpenId(r.id); } }}>
                          <td>
                            <div className="ctCell1">
                              <label className="ctCb"><input type="checkbox" checked={sel.has(r.id)} onChange={(e) => tick(r, e.target.checked)} aria-label={`Select ${r.name || r.email}`} /></label>
                              <span className="ctWho"><Avatar r={r} /><span><b>{r.name || r.email}</b><small>{r.name ? r.email : r.phone}</small></span></span>
                            </div>
                          </td>
                          <td><TypeChip r={r} /></td>
                          <td className="ad__dim">{r.source || "–"}</td>
                          <td>{r.tags.length ? <span className="ctTags">{r.tags.slice(0, 3).map((t) => <span className="ctTag" key={t}>{t}</span>)}{r.tags.length > 3 ? <span className="ctTag">+{r.tags.length - 3}</span> : null}</span> : <span className="ad__dim">–</span>}</td>
                          <td>{r.opens === null ? <span className="ad__dim" title="No campaign has reached them yet">–</span> : <span className="ctOpens" role="img" aria-label={`Opened ${r.opens}% of emails`}><i><b style={{ width: `${r.opens}%` }} /></i><span>{r.opens}%</span></span>}</td>
                          <td className="ctR">
                            <button type="button" className="ctIcon" aria-label={`Email ${r.name || r.email}`} onClick={() => void mail([r.id])}><Mail aria-hidden="true" /></button>
                            <button type="button" className="ctIcon" aria-label={`Open ${r.name || r.email}`} onClick={() => setOpenId(r.id)}><ChevronRight aria-hidden="true" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="ctEmpty">
                {total > 0 ? (
                  <AdminState kind="no-results" title="That page is empty" description="There are fewer people than that page number. Go back to the first page."
                    action={<button type="button" className="ad__btn" onClick={() => start(() => router.push(`/admin/email?${new URLSearchParams({ tab: "contacts", ...(filters.q ? { q: filters.q } : {}) })}`, { scroll: false }))}>First page</button>} />
                ) : (
                  <AdminState kind="no-results" title="No one matches" description="Nothing fits the search and filters you have on. Clear them to see everyone."
                    action={<button type="button" className="ad__btn" onClick={() => { setQv(""); go({ q: "", type: "", status: "", tag: "" }); }}><SearchX aria-hidden="true" />Clear search and filters</button>} />
                )}
              </div>
            )}
            {pager}
          </>
        )}
      </section>

      {ids.length ? (
        <div className="ctBulk" role="toolbar" aria-label={`${ids.length} selected, bulk actions`}>
          <button type="button" aria-label="Clear the selection" onClick={() => setSel(new Map())}><X aria-hidden="true" /></button>
          <b>{ids.length} selected</b><i aria-hidden="true" />
          <button type="button" aria-label="Add tag" onClick={() => showSheet("tag")}><Tag aria-hidden="true" /><span className="ctLbl">Add tag</span></button>
          <button type="button" aria-label="Send email" disabled={busy} onClick={() => void mail(ids)}><Mail aria-hidden="true" /><span className="ctLbl">Send email</span></button>
          <button type="button" aria-label="Export" onClick={() => showSheet("export", "selected")}><Download aria-hidden="true" /><span className="ctLbl">Export</span></button>
          <button type="button" aria-label="Suppress" onClick={() => void stop(ids)}><Ban aria-hidden="true" /><span className="ctLbl">Suppress</span></button>
        </div>
      ) : null}

      <ContactSheet id={openId} seed={seed} tags={tags.map((t) => t.tag)} onClose={() => setOpenId(null)} onChanged={refresh} onMail={(w) => void mail(w)} onStop={stop} />
      <AddSheet open={sheet === "add"} onClose={() => setSheet(null)} onSaved={(id) => { refresh(); setOpenId(id); }} />
      <ImportSheet open={sheet === "import"} onClose={() => setSheet(null)} onDone={refresh} />
      <ExportSheet open={sheet === "export"} onClose={() => setSheet(null)} startScope={exportScope} selected={exportSel} filters={{ q: filters.q, tag: filters.tag, type: filters.type, status: filters.status, marketing: filters.marketing }} totalAll={stats.total} />
      <TagSheet open={sheet === "tag"} onClose={() => setSheet(null)} ids={ids} tags={tags.map((t) => t.tag)} onDone={refresh} />
    </>
  );
}

