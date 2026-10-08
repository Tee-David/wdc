"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Mail, Phone, Plus, StickyNote, X } from "lucide-react";
import { addContactAction, setTypeAction, tagAction } from "@/lib/admin/contact-actions";
import { Field, Fields, Form, Submit } from "../form";
import { Dialog } from "../dialog";
import { RemotePick } from "../remote-pick";
import { FileDrop } from "../file-drop";
import { toast } from "../toast";
import { NoteForm } from "./contacts-ui";
import { EXPORT_COLUMNS, type ExportKey, type ExportFormat, type ExportScope } from "@/lib/contacts-export";
import "./contacts.css";

/* ------------------------------------------------------------------ shared */

export type ContactRow = {
  id: string; name: string; email: string; phone: string; type: "client" | "lead" | "subscriber";
  status: "subscribed" | "unsubscribed" | "bounced" | "complained"; marketing: boolean; source: string;
  tags: string[]; createdAt: string; opens: number | null;
};

export const TYPE_LABEL = { client: "Client", lead: "Lead", subscriber: "Subscriber" } as const;
export const STOP_LABEL = { unsubscribed: "Unsubscribed", bounced: "Bounced", complained: "Complained" } as const;
const pl = (n: number) => `${n.toLocaleString("en-GB")} ${n === 1 ? "person" : "people"}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : "–");
const stamp = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export const initials = (name: string, email: string) => {
  const src = (name || email.split("@")[0]).trim();
  return (src.split(/[\s._-]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("") || "?").toUpperCase();
};
const toneOf = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 6; };

export function Avatar({ r, lg }: { r: Pick<ContactRow, "id" | "name" | "email">; lg?: boolean }) {
  return <span className={`ctAv ctAv--${toneOf(r.id)}${lg ? " ctAv--lg" : ""}`} aria-hidden="true">{initials(r.name, r.email)}</span>;
}

/** Type as a solid chip; anyone who stopped shows that instead, in words. */
export function TypeChip({ r }: { r: Pick<ContactRow, "type" | "status"> }) {
  if (r.status !== "subscribed") return <span className="ad__pill ad__pill--bad">{STOP_LABEL[r.status]}</span>;
  const tone = r.type === "client" ? "good" : r.type === "lead" ? "live" : "flat";
  return <span className={`ad__pill ad__pill--${tone}`}>{TYPE_LABEL[r.type]}</span>;
}

/** A text box for a new tag, and a searched list of the existing ones (they are looked up on the server, so none are missing past a dozen). */
function TagField({ value, onChange, label = "Tag", autoFocus }: { value: string; onChange: (v: string) => void; label?: string; autoFocus?: boolean }) {
  return (
    <div>
      <label className="ad__fl" htmlFor="ct-tag-in">{label}</label>
      <div className="ctTagIn">
        <input id="ct-tag-in" value={value} onChange={(e) => onChange(e.target.value)} placeholder="A tag, like interested-in-web" maxLength={40} autoComplete="off" autoFocus={autoFocus} />
      </div>
      <div style={{ marginTop: ".6rem" }}>
        <RemotePick kind="tags" label="Pick an existing tag" placeholder="Or pick an existing tag" value="" onChange={(v) => { if (v) onChange(v); }} />
      </div>
    </div>
  );
}

async function tagCall(ids: string[], tag: string, mode: "add" | "remove") {
  const fd = new FormData();
  ids.forEach((i) => fd.append("ids", i)); fd.set("tag", tag); fd.set("mode", mode);
  const r = await tagAction({ ok: false }, fd).catch(() => null);
  toast(r?.ok ? `Updated. ${r.message}` : r?.message ?? "That could not be done just now.", r?.ok ? "good" : "bad");
  return Boolean(r?.ok);
}

/* --------------------------------------------------------- tag the ticked */

export function TagSheet({ open, onClose, ids, onDone }: { open: boolean; onClose: () => void; ids: string[]; onDone: () => void }) {
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (mode: "add" | "remove") => {
    setBusy(true);
    const ok = await tagCall(ids, tag, mode);
    setBusy(false);
    if (ok) { setTag(""); onDone(); onClose(); }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Tag the people you ticked">
      {open ? (
        <div className="ctSheet">
          <p className="ctNote">{pl(ids.length)} ticked. Tags do the job of lists: a campaign can go to everyone with one.</p>
          <TagField value={tag} onChange={setTag} autoFocus />
          <div className="ctFoot">
            <button type="button" className="ad__btn" onClick={onClose}>Cancel</button>
            <button type="button" className="ad__btn" disabled={busy || !tag.trim()} onClick={() => void run("remove")}>Remove tag</button>
            <button type="button" className="ad__btn ad__btn--primary" disabled={busy || !tag.trim()} onClick={() => void run("add")}>
              {busy ? <Loader2 className="ad__spin" aria-hidden="true" /> : null}Add tag
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

/* -------------------------------------------------------------- add by hand */

export function AddSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Add a contact">
      {open ? (
        <Form action={addContactAction} onDone={(s) => { onClose(); if (s.stamp) onSaved(s.stamp); }}>
          <div className="ctSheet">
            <p className="ctNote">They get campaigns only if they asked for them. Someone added here is kept, but not emailed.</p>
            <Fields>
              <Field name="name" label="Name" required placeholder="Full name" />
              <Field name="email" label="Email" required type="email" placeholder="name@example.com" inputMode="email" />
              <Field name="phone" label="Phone or WhatsApp" placeholder="Optional" inputMode="tel" hint="If the email or phone already belongs to someone, we open that record instead of making a second one." />
            </Fields>
            <div className="ctFoot">
              <button type="button" className="ad__btn" onClick={onClose}>Cancel</button>
              <Submit>Save contact</Submit>
            </div>
          </div>
        </Form>
      ) : null}
    </Dialog>
  );
}

/* ---------------------------------------------------------- the contact sheet */

type Ev = { id: string; kind: string; title: string; detail: string; by: string; at: string };
type Send = { campaignId: string; title: string; sentAt: string | null; opened: boolean; clicked: boolean };
type SheetData = { contact: ContactRow & { consentAt: string | null; consentSource: string | null; unsubReason: string | null; clientId: string | null }; events: Ev[]; sends: Send[]; opens: number | null };

export function ContactSheet({ id, seed, onClose, onChanged, onMail, onStop }: {
  id: string | null; seed: ContactRow | null;
  onClose: () => void; onChanged: () => void;
  onMail: (ids: string[]) => void; onStop: (ids: string[]) => Promise<boolean>;
}) {
  const [data, setData] = useState<SheetData | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  const [noting, setNoting] = useState(false);
  const [tag, setTag] = useState("");
  const note = useRef<HTMLDivElement>(null);

  /* Fetched when the sheet opens for a person and again after a change. The row
     the sheet was opened from is shown at once, so nothing waits on the network. */
  useEffect(() => {
    if (!id) return;
    const stop = new AbortController();
    fetch(`/admin/email/contacts/${encodeURIComponent(id)}/sheet`, { cache: "no-store", signal: stop.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no"))))
      .then((d: SheetData) => { setData(d); setFailed(false); })
      .catch((e) => { if (e?.name !== "AbortError") setFailed(true); });
    return () => stop.abort();
  }, [id, version]);

  const reload = useCallback(() => { setVersion((v) => v + 1); onChanged(); }, [onChanged]);
  const shown = data && data.contact.id === id ? data : null;
  const c = shown?.contact ?? (seed && seed.id === id ? seed : null);
  const stopped = c ? c.status !== "subscribed" : false;

  const setType = async (type: string) => {
    if (!c) return;
    if (type === "stop") {
      if (await onStop([c.id])) reload();
      return;
    }
    const r = await setTypeAction(c.id, type).catch(() => null);
    toast(r?.message ?? "That could not be done just now.", r?.ok ? "good" : "bad");
    if (r?.ok) reload();
  };

  const addTag = async () => {
    if (!c || !tag.trim()) return;
    if (await tagCall([c.id], tag, "add")) { setTag(""); setAdding(false); reload(); }
  };

  return (
    <Dialog open={Boolean(id)} onClose={onClose} title={c ? c.name || c.email : "Contact"}>
      {id && c ? (
        <div className="ctSheet">
          <p className="ctNote">Contact since {day(c.createdAt)}</p>
          <div className="ctCard">
            <div className="ctTop">
              <Avatar r={c} lg />
              <div className="ctNm"><b>{c.name || c.email}</b><span>{c.email}{c.phone ? ` · ${c.phone}` : ""}</span></div>
              <div className="ctBtns">
                <button type="button" className="ctIcon ctIcon--ring" aria-label="Email them" onClick={() => onMail([c.id])}><Mail aria-hidden="true" /></button>
                {c.phone ? <a className="ctIcon ctIcon--ring" aria-label={`Call ${c.phone}`} href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}><Phone aria-hidden="true" /></a> : null}
                <button type="button" className="ctIcon ctIcon--ring" aria-label="Add a note" onClick={() => { setNoting(true); window.setTimeout(() => note.current?.querySelector("textarea")?.focus(), 0); }}><StickyNote aria-hidden="true" /></button>
              </div>
            </div>
            <dl className="ctFacts">
              <div><dt>Source</dt><dd>{c.source || "–"}</dd></div>
              <div><dt>Marketing</dt><dd>{stopped ? "Asked to stop" : c.marketing ? "Allowed" : "Not asked"}</dd></div>
              <div><dt>Opens</dt><dd>{shown ? (shown.opens === null ? "–" : `${shown.opens}%`) : c.opens === null ? "–" : `${c.opens}%`}</dd></div>
              <div><dt>Added</dt><dd>{day(c.createdAt)}</dd></div>
            </dl>
          </div>
          {shown?.contact.consentAt ? <p className="ctNote">Asked to hear from us on {day(shown.contact.consentAt)}{shown.contact.consentSource ? ` (${shown.contact.consentSource})` : ""}.</p> : null}

          <section className="ctSec" aria-labelledby="ct-type">
            <h3 id="ct-type">Type</h3>
            <div className="ctSeg" role="group" aria-label="Type">
              {(["lead", "client", "subscriber"] as const).map((t) => (
                <button key={t} type="button" aria-pressed={!stopped && c.type === t} disabled={stopped} onClick={() => void setType(t)}>{TYPE_LABEL[t]}</button>
              ))}
              <button type="button" className="is-stop" aria-pressed={stopped} disabled={stopped} onClick={() => void setType("stop")}>Stop</button>
            </div>
            {stopped ? <p className="ctNote" style={{ marginTop: ".5rem" }}>{c.status === "unsubscribed" ? "They asked to stop" : c.status === "bounced" ? "Their address bounced" : "They marked an email as spam"}. They are never emailed again, and this cannot be undone here.</p> : null}
          </section>

          <section className="ctSec" aria-labelledby="ct-tags">
            <h3 id="ct-tags">Tags</h3>
            <div className="ctChips">
              {c.tags.map((t) => (
                <button key={t} type="button" className="ctChip" aria-label={`Remove tag ${t}`} onClick={async () => { if (await tagCall([c.id], t, "remove")) reload(); }}>{t}<X aria-hidden="true" /></button>
              ))}
              <button type="button" className="ctChip ctChip--add" aria-expanded={adding} onClick={() => setAdding((a) => !a)}><Plus aria-hidden="true" />Add tag</button>
            </div>
            {adding ? (
              <>
                <TagField value={tag} onChange={setTag} label="New tag" autoFocus />
                <div className="ctTagIn"><button type="button" className="ad__btn ad__btn--primary" disabled={!tag.trim()} onClick={() => void addTag()}>Add tag</button></div>
              </>
            ) : null}
          </section>

          <section className="ctSec" aria-labelledby="ct-mails">
            <h3 id="ct-mails">Emails <span className="ctGrow" /><span className="ctDim">{shown ? `${shown.sends.length} sent` : ""}</span></h3>
            {!shown ? <p className="ctNote" role={failed ? "alert" : "status"}>{failed ? "Their history could not be loaded. " : "Loading their history."}{failed ? <button type="button" className="ad__btn ctSmall" onClick={() => setVersion((v) => v + 1)}>Try again</button> : null}</p>
              : stopped ? <p className="ctNote">Nothing is sent to them any more.</p>
              : shown.sends.length ? shown.sends.map((s) => (
                <div className="ctItem" key={`${s.campaignId}-${s.sentAt}`}>
                  <span className="ctIc"><Mail aria-hidden="true" /></span>
                  <div><b>{s.title}</b><br /><small>Campaign{s.sentAt ? ` · ${stamp(s.sentAt)}` : ""} · {s.clicked ? "clicked" : s.opened ? "opened" : "delivered"}</small></div>
                </div>
              )) : <p className="ctNote">No campaign has gone to them yet.</p>}
          </section>

          <section className="ctSec" aria-labelledby="ct-notes">
            <h3 id="ct-notes">Notes <span className="ctGrow" />
              <button type="button" className="ad__btn ctSmall" onClick={() => setNoting((n) => !n)} aria-expanded={noting}><Plus aria-hidden="true" />Add note</button>
            </h3>
            {noting ? <div ref={note} style={{ marginBottom: ".75rem" }}><NoteForm id={c.id} onDone={() => { setNoting(false); reload(); }} /></div> : null}
            {shown ? (shown.events.filter((e) => e.kind === "note").length
              ? shown.events.filter((e) => e.kind === "note").map((e) => (
                <div className="ctItem" key={e.id}><span className="ctIc"><StickyNote aria-hidden="true" /></span><div><b>{e.by || "Studio"}</b> <small>{stamp(e.at)}</small><br />{e.detail}</div></div>
              )) : <p className="ctNote">No notes yet.</p>) : null}
          </section>

          {shown && shown.events.some((e) => e.kind !== "note") ? (
            <section className="ctSec" aria-labelledby="ct-act">
              <h3 id="ct-act">Activity</h3>
              {shown.events.filter((e) => e.kind !== "note").slice(0, 8).map((e) => (
                <div className="ctItem" key={e.id}><span className="ctIc"><Check aria-hidden="true" /></span><div><b>{e.title}</b>{e.detail ? <><br /><small>{e.detail}</small></> : null}<br /><small>{stamp(e.at)}{e.by ? ` · ${e.by}` : ""}</small></div></div>
              ))}
            </section>
          ) : null}

          <div className="ctFoot">
            <Link className="ad__btn ctFoot__l" href={`/admin/email/contacts/${c.id}`}><ExternalLink aria-hidden="true" />View full page</Link>
            <button type="button" className="ad__btn" onClick={onClose}>Close</button>
            <button type="button" className="ad__btn ad__btn--primary" onClick={() => onMail([c.id])}><Mail aria-hidden="true" />Send an email</button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

/* ------------------------------------------------------------------- import */

type CheckRow = { n: number; email: string; verdict: "new" | "update" | "refused"; why: string };
type CheckResult = { file: string; counts: { new: number; update: number; refused: number }; needsPermission: boolean; total: number; rows: CheckRow[] };

const RULES: [string, React.ReactNode][] = [
  ["✓", <><code>email</code> is required and each address is used once.</>],
  ["✓", <><code>tags</code> are separated by a semicolon, like <code>client;web</code>.</>],
  ["✓", <><code>marketing</code> is <code>yes</code> only for people who agreed to hear from you. Then <code>source</code> must say how, for example &ldquo;Newsletter form&rdquo;.</>],
  ["✓", <>Someone already on your list (same email, or same phone number) is updated, never duplicated.</>],
  ["!", <>People who asked to stop are never added back, and temporary inboxes are refused.</>],
  ["i", <>Up to 5,000 rows and 2 MB. CSV only: in Excel choose Save As, then CSV (UTF-8).</>],
];
const SAMPLE_COLS = ["email", "name", "phone", "tags", "marketing", "source"];
const SAMPLE = [["ada@example.com", "Ada Obi", "+234 803 555 0142", "client;web", "yes", "Newsletter form"], ["kemi@example.com", "Kemi Bello", "", "lead", "no", "Contact page"], ["tunde@example.com", "Tunde A.", "+234 805 555 0111", "newsletter", "yes", "Event sign-up sheet"]];

export function ImportSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "check" | "import">("");
  const [ok, setOk] = useState(false);

  const send = async (f: File, step: "check" | "import", confirmed = false) => {
    const fd = new FormData();
    fd.set("file", f); fd.set("step", step); if (confirmed) fd.set("confirmed", "1");
    const res = await fetch("/admin/email/contacts/import", { method: "POST", body: fd, cache: "no-store" }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (!res || !body) return { ok: false as const, error: "That could not be done just now. Check your connection and try again." };
    return body;
  };
  const choose = async (f: File) => {
    setFile(f); setCheck(null); setError(""); setOk(false); setBusy("check");
    const r = await send(f, "check");
    setBusy("");
    if (r.ok) setCheck(r as CheckResult); else setError(r.error);
  };
  const reset = () => { setFile(null); setCheck(null); setError(""); setOk(false); };
  const trySample = async () => {
    const res = await fetch("/admin/email/contacts/sample", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) { setError("The sample file could not be loaded."); return; }
    void choose(new File([await res.blob()], "wdc-contacts-sample.csv", { type: "text/csv" }));
  };
  const go = async () => {
    if (!file || !check) return;
    setBusy("import");
    const r = await send(file, "import", ok);
    setBusy("");
    if (r.ok) {
      toast(`Saved. ${r.added} added, ${r.updated} updated${r.refused ? `, ${r.refused} left out` : ""}.`);
      reset(); onDone(); onClose();
    } else { setError(r.error); toast(r.error, "bad"); }
  };
  const importable = check ? check.counts.new + check.counts.update : 0;
  const ready = Boolean(check) && importable > 0 && (!check?.needsPermission || ok);

  return (
    <Dialog open={open} onClose={onClose} title="Import contacts">
      {open ? (
        <div className="ctSheet">
          <p className="ctNote">From a CSV file. Nothing is saved until you press Import.</p>
          <div className="ctCards">
            <section className="ctStep" aria-labelledby="ct-i1">
              <h3 id="ct-i1"><span className="ctNo">1</span>Start from the sample</h3>
              <p>Use the same column names. Only <b>email</b> is required.</p>
              <div className="ctMini" tabIndex={0} role="region" aria-label="Sample file preview">
                <table><thead><tr>{SAMPLE_COLS.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>{SAMPLE.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c || <span className="ad__dim">empty</span>}</td>)}</tr>)}</tbody></table>
              </div>
              <div><a className="ad__btn ctSmall" href="/admin/email/contacts/sample" download>Download sample CSV</a></div>
            </section>
            <section className="ctStep" aria-labelledby="ct-i2">
              <h3 id="ct-i2"><span className="ctNo">2</span>Check the rules</h3>
              <ul className="ctRules">{RULES.map(([mark, text], i) => <li key={i} className={mark === "!" ? "is-warn" : undefined}><i aria-hidden="true">{mark}</i><span>{text}</span></li>)}</ul>
            </section>
            <section className="ctStep" aria-labelledby="ct-i3">
              <h3 id="ct-i3"><span className="ctNo">3</span>Add your file</h3>
              {!file ? (
                <>
                  <FileDrop id="ct-file" label="CSV file" hint="Up to 5,000 rows and 2 MB" accept=".csv,text/csv" onFiles={(l) => void choose(l[0])} />
                  <div><button type="button" className="ad__btn ctSmall" onClick={() => void trySample()}>Try the sample file</button></div>
                  {error ? <p className="ctErr" role="alert">{error}</p> : null}
                </>
              ) : (
                <div className="ctRes" aria-live="polite">
                  <div className="ctFile"><b>{file.name}</b><button type="button" className="ad__btn ctSmall" onClick={reset} disabled={busy === "import"}>Change file</button></div>
                  {busy === "check" ? <p className="ctNote"><Loader2 className="ad__spin" aria-hidden="true" style={{ width: "1rem", height: "1rem", verticalAlign: "-.15rem" }} /> Checking every row on the server.</p> : null}
                  {error ? <p className="ctErr" role="alert">{error}</p> : null}
                  {check ? (
                    <>
                      <div className="ctCounts"><span className="ad__pill ad__pill--good">{check.counts.new} new</span><span className="ad__pill ad__pill--flat">{check.counts.update} updated</span><span className="ad__pill ad__pill--bad">{check.counts.refused} refused</span></div>
                      <div className="ctMini" tabIndex={0} role="region" aria-label="File preview, row by row">
                        <table><thead><tr><th>Row</th><th>Email</th><th>Result</th></tr></thead>
                          <tbody>{check.rows.map((x) => (
                            <tr key={x.n}><td>{x.n}</td><td>{x.email || <span className="ad__dim">(empty)</span>}</td>
                              <td className="ctWrap"><span className={`ad__pill ad__pill--${x.verdict === "new" ? "good" : x.verdict === "update" ? "flat" : "bad"}`}>{x.verdict === "new" ? "New" : x.verdict === "update" ? "Update" : "Refused"}</span>{x.verdict !== "new" ? <> <span className="ad__dim">{x.why}</span></> : null}</td></tr>
                          ))}</tbody></table>
                      </div>
                      {check.total > check.rows.length ? <small className="ad__dim">Showing {check.rows.length} of {check.total.toLocaleString("en-GB")} rows, refused ones first.</small> : null}
                    </>
                  ) : null}
                </div>
              )}
            </section>
            {check?.needsPermission ? (
              <label className="ctTick">
                <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
                <span>I confirm everyone marked <b>marketing = yes</b> agreed to hear from us.</span>
              </label>
            ) : null}
          </div>
          <div className="ctFoot">
            {check && !ready && importable > 0 ? <span className="ctFoot__l">Tick the box above to import.</span> : null}
            {check && importable === 0 ? <span className="ctFoot__l">Nothing in this file can be imported.</span> : null}
            <button type="button" className="ad__btn" onClick={onClose}>Cancel</button>
            <button type="button" className="ad__btn ad__btn--primary" disabled={!ready || busy !== ""} onClick={() => void go()}>
              {busy === "import" ? <Loader2 className="ad__spin" aria-hidden="true" /> : null}{check ? `Import ${pl(importable)}` : "Import"}
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

/* ------------------------------------------------------------------- export */

const DEFAULT_COLS = EXPORT_COLUMNS.filter((c) => c.key !== "opens").map((c) => c.key);

export function ExportSheet({ open, onClose, startScope, selected, filters, totalAll }: {
  open: boolean; onClose: () => void; startScope: ExportScope;
  /** The ticked people: how many, how many of them are stopped, and their ids. */
  selected: { ids: string[]; stopped: number };
  filters: { q: string; tag: string; type: string; status: string; marketing: string };
  totalAll: number;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Export contacts">
      {open ? <ExportBody onClose={onClose} startScope={startScope} selected={selected} filters={filters} totalAll={totalAll} /> : null}
    </Dialog>
  );
}

function ExportBody({ onClose, startScope, selected, filters, totalAll }: {
  onClose: () => void; startScope: ExportScope; selected: { ids: string[]; stopped: number };
  filters: { q: string; tag: string; type: string; status: string; marketing: string }; totalAll: number;
}) {
  const [fmt, setFmt] = useState<ExportFormat>("csv");
  const [scope, setScope] = useState<ExportScope>(startScope === "selected" && !selected.ids.length ? "filtered" : startScope);
  const [cols, setCols] = useState<Set<ExportKey>>(new Set(DEFAULT_COLS));
  const [stopped, setStopped] = useState(false);
  const [counts, setCounts] = useState<{ filtered: number | null; all: number | null }>({ filtered: null, all: null });
  const filtered = Boolean(filters.q || filters.tag || filters.type || filters.status || filters.marketing);

  /* How many people each choice would export, asked of the server so the button never promises a number it has not counted. */
  useEffect(() => {
    const stop = new AbortController();
    const base = new URLSearchParams({ count: "1", stopped: stopped ? "1" : "0" });
    const ask1 = (scopeName: string, withFilters: boolean) => {
      const u = new URLSearchParams(base); u.set("scope", scopeName);
      if (withFilters) for (const [k, v] of Object.entries(filters)) if (v) u.set(k, v);
      return fetch(`/admin/email/contacts/export?${u}`, { cache: "no-store", signal: stop.signal }).then((r) => (r.ok ? r.json() : null)).then((b) => (b ? (b.n as number) : null)).catch(() => null);
    };
    Promise.all([ask1("filtered", true), ask1("all", false)]).then(([f, a]) => { if (!stop.signal.aborted) setCounts({ filtered: f, all: a }); });
    return () => stop.abort();
  }, [stopped, filters]);

  const selN = selected.ids.length - (stopped ? 0 : selected.stopped);
  const n = scope === "selected" ? selN : scope === "all" ? counts.all : counts.filtered;
  const opt = (k: ExportScope, title: string, text: string, count: number | null, off?: boolean) => (
    <label className="ctOpt" aria-disabled={off || undefined}>
      <input type="radio" name="scope" value={k} checked={scope === k} disabled={off} onChange={() => setScope(k)} />
      <span className="ctRd" aria-hidden="true" />
      <span><b>{title}</b><small>{text}</small></span>
      <span className="ctN">{count === null ? "…" : count.toLocaleString("en-GB")}</span>
    </label>
  );
  const toggle = (k: ExportKey) => setCols((c) => { const x = new Set(c); if (x.has(k)) x.delete(k); else x.add(k); return x; });
  const allOn = cols.size === EXPORT_COLUMNS.length;
  const ready = Boolean(n) && cols.size > 0;

  return (
    <form className="ctSheet" method="post" action="/admin/email/contacts/export" onSubmit={() => {
      /* The browser saves the answer as a file and this page stays where it is. Closing waits a beat so the submit is not cancelled with the form. */
      window.setTimeout(() => { toast(`Export ready: ${pl(n ?? 0)} as ${fmt === "csv" ? "CSV" : "Excel"}.`); onClose(); }, 400);
    }}>
      <p className="ctNote">Choose the file, the people and the columns.</p>
      <input type="hidden" name="fmt" value={fmt} /><input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="stopped" value={stopped ? "1" : "0"} /><input type="hidden" name="cols" value={[...cols].join(",")} />
      {Object.entries(filters).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {scope === "selected" ? selected.ids.map((i) => <input key={i} type="hidden" name="ids" value={i} />) : null}
      <div className="ctCards">
        <section className="ctStep" aria-labelledby="ct-x1">
          <h3 id="ct-x1">File type</h3>
          <div className="ctSeg" role="group" aria-label="File type">
            <button type="button" aria-pressed={fmt === "csv"} onClick={() => setFmt("csv")}>CSV</button>
            <button type="button" aria-pressed={fmt === "xlsx"} onClick={() => setFmt("xlsx")}>Excel (.xlsx)</button>
          </div>
          <p>{fmt === "csv" ? "Opens anywhere and imports straight back in here." : "Opens in Excel and Google Sheets, one sheet, every cell as text."}</p>
        </section>
        <section className="ctStep" aria-labelledby="ct-x2">
          <h3 id="ct-x2">Who</h3>
          <div className="ctOpts" role="radiogroup" aria-label="Who to export">
            {opt("filtered", "Matching the current view", filtered ? "The filters you have on now" : "Everyone, because no filter is on", counts.filtered)}
            {opt("selected", "Ticked rows", "The people you selected in the table", selN, !selected.ids.length)}
            {opt("all", "Everyone", "Ignores filters", counts.all ?? totalAll)}
          </div>
          <label className="ctTick">
            <input type="checkbox" checked={stopped} onChange={(e) => setStopped(e.target.checked)} />
            <span>Include people who asked to stop. They are marked in a Status column, and are never emailed.</span>
          </label>
        </section>
        <section className="ctStep" aria-labelledby="ct-x3">
          <h3 id="ct-x3">Columns <span className="ctGrow" />
            <button type="button" className="ad__btn ctSmall" onClick={() => setCols(allOn ? new Set() : new Set(EXPORT_COLUMNS.map((c) => c.key)))}>{allOn ? "Clear all" : "Select all"}</button>
          </h3>
          <div className="ctCols">
            {EXPORT_COLUMNS.map((c) => (
              <button key={c.key} type="button" aria-pressed={cols.has(c.key)} onClick={() => toggle(c.key)}>{cols.has(c.key) ? <Check aria-hidden="true" /> : null}{c.label}</button>
            ))}
          </div>
          {stopped && !cols.has("status") ? <p>A Status column is added so the people who asked to stop are marked.</p> : null}
        </section>
      </div>
      <div className="ctFoot">
        {!ready ? <span className="ctFoot__l">{!cols.size ? "Pick at least one column." : n === null ? "Counting…" : "No one matches these choices."}</span> : null}
        <button type="button" className="ad__btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="ad__btn ad__btn--primary" disabled={!ready}>Export {n === null ? "" : pl(n)}</button>
      </div>
    </form>
  );
}

