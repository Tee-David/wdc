"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Lock, Plus, Redo2, RotateCcw, Save, Send, Smartphone, Monitor, Trash2, Undo2, Power } from "lucide-react";
import {
  BLOCK_LABEL, newBlock, tagsIn, type Block, type Design,
} from "@/lib/email-design";
import type { Tag } from "@/lib/email-registry";
import {
  previewDesign, resetDesignAction, restoreVersionAction, saveDesignAction, sendTestAction, setDesignOn,
} from "@/lib/admin/email-design-actions";
import { saveCampaignDesign } from "@/lib/admin/campaign-actions";
import { toast } from "../toast";
import { ask } from "../confirm";
import "./design-editor.css";

type Props = {
  kind: string; name: string; tags: Tag[];
  starters: { name: string; design: Design }[];
  saved: { design: Design; enabled: boolean } | null;
  history: { id: string; savedBy: string; savedAt: string }[];
  /** Set when this edits a campaign's own copy: saving goes to the campaign, and there is no on/off, reset or version list. */
  campaignId?: string;
};

const ADDABLE: Block["type"][] = ["text", "heading", "button", "facts", "figure", "image", "columns", "divider", "space", "note"];
type Field = { id: string; name: string; el: HTMLInputElement | HTMLTextAreaElement };

export function DesignEditor({ kind, name, tags, starters, saved, history, campaignId }: Props) {
  const [design, setDesign] = useState<Design>(() => saved?.design ?? starters[0].design);
  const [base, setBase] = useState<string>(() => JSON.stringify(saved?.design ?? null));
  const [enabled, setEnabled] = useState(saved?.enabled ?? false);
  const [exists, setExists] = useState(Boolean(saved));
  const [past, setPast] = useState<Design[]>([]);
  const [future, setFuture] = useState<Design[]>([]);
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [phone, setPhone] = useState(true);
  const [busy, setBusy] = useState(false);
  const last = useRef<Field | null>(null);
  const json = useMemo(() => JSON.stringify(design), [design]);
  const dirty = json !== base;

  /* Every change goes through here so undo and redo see it. */
  const change = useCallback((next: Design) => {
    setPast((p) => [...p.slice(-49), design]);
    setFuture([]);
    setDesign(next);
  }, [design]);
  const patchBlock = (id: string, patch: Partial<Block>) =>
    change({ ...design, blocks: design.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= design.blocks.length) return;
    const blocks = design.blocks.slice(); [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    change({ ...design, blocks });
  };
  const undo = () => { const p = past.at(-1); if (!p) return; setFuture((f) => [design, ...f]); setPast((x) => x.slice(0, -1)); setDesign(p); };
  const redo = () => { const f = future[0]; if (!f) return; setPast((x) => [...x, design]); setFuture((x) => x.slice(1)); setDesign(f); };

  /* Live preview, a beat after the last keystroke. */
  useEffect(() => {
    let on = true;
    const t = window.setTimeout(async () => {
      const r = await previewDesign(kind, json).catch(() => null);
      if (on && r?.ok) { setHtml(r.html); setSubject(r.subject); }
    }, 450);
    return () => { on = false; window.clearTimeout(t); };
  }, [kind, json]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const known = useMemo(() => new Set([...tags.map((t) => t.key), "studio.name", "studio.email"]), [tags]);
  const unknown = useMemo(() => {
    const texts: string[] = [design.subject, design.preheader, design.heading];
    for (const b of design.blocks) texts.push(...Object.values(b).filter((v): v is string => typeof v === "string"), ...(b.type === "facts" ? b.rows.flatMap((r) => [r.label, r.value]) : []));
    return [...new Set(texts.flatMap(tagsIn))].filter((k) => !known.has(k));
  }, [design, known]);

  const insertTag = (key: string) => {
    const f = last.current;
    const tag = `{{${key}}}`;
    if (!f || !f.el.isConnected) { toast("Click into a field first, then pick a tag.", "bad"); return; }
    const el = f.el;
    const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
    const next = el.value.slice(0, s) + tag + el.value.slice(e);
    if (f.id === "meta") change({ ...design, [f.name]: next } as Design);
    else {
      const [bid, field, idx, sub] = f.id.split(":");
      change({
        ...design, blocks: design.blocks.map((b) => {
          if (b.id !== bid) return b;
          if (b.type === "facts" && field === "row") return { ...b, rows: b.rows.map((r, i) => (i === Number(idx) ? { ...r, [sub]: next } : r)) };
          return { ...b, [field]: next } as Block;
        }),
      });
    }
    window.setTimeout(() => { el.focus(); el.setSelectionRange(s + tag.length, s + tag.length); }, 0);
  };
  const remember = useCallback((id: string, name: string, el: HTMLInputElement | HTMLTextAreaElement) => { last.current = { id, name, el }; }, []);
  const track = (id: string, name: string) => ({ onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => remember(id, name, e.currentTarget) });

  async function run(fn: () => Promise<void>) { setBusy(true); try { await fn(); } finally { setBusy(false); } }
  const save = (on: boolean | null) => run(async () => {
    const r = campaignId
      ? await saveCampaignDesign(campaignId, json).then((x) => (x.ok ? ({ ok: true } as const) : ({ ok: false, message: x.message ?? "That could not be saved." } as const)))
      : await saveDesignAction(kind, json, on);
    if (!r.ok) { toast(r.message, "bad"); return; }
    setBase(json); setExists(true); if (on !== null) setEnabled(on);
    toast(on ? "Saved, and your design is now used." : "Saved.", "good");
  });
  const switchOff = () => run(async () => {
    const r = await setDesignOn(kind, false);
    if (!r.ok) { toast(r.message, "bad"); return; }
    setEnabled(false); toast("Switched off. The built-in design is sent again.", "good");
  });
  const reset = () => run(async () => {
    if (!(await ask(`Reset ${name} to the built-in design? Your saved design is deleted. This cannot be undone, though the version history is kept until the next save.`))) return;
    const r = await resetDesignAction(kind);
    if (!r.ok) { toast(r.message, "bad"); return; }
    setDesign(starters[0].design); setBase("null"); setExists(false); setEnabled(false); setPast([]); setFuture([]);
    toast("Reset to the built-in design.", "good");
  });
  const test = () => run(async () => {
    const r = await sendTestAction(kind, json);
    toast(r.ok ? `Test sent to ${r.to}, with sample data.` : r.message, r.ok ? "good" : "bad");
  });
  const restore = (id: string) => run(async () => {
    const r = await restoreVersionAction(kind, id);
    if (!r.ok) { toast(r.message, "bad"); return; }
    change(JSON.parse(r.json) as Design); toast("Version loaded. Save to keep it.", "good");
  });

  return (
    <div className="deEd">
      <div className="deEd__bar" role="toolbar" aria-label="Design actions">
        <button type="button" className="ad__btn" onClick={undo} disabled={!past.length} aria-label="Undo"><Undo2 aria-hidden="true" /></button>
        <button type="button" className="ad__btn" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 aria-hidden="true" /></button>
        <span className="deEd__state" role="status">
          {dirty ? "Unsaved changes" : campaignId ? "Saved" : exists ? (enabled ? "Your design is on" : "Saved, switched off") : "Built-in design is in use"}
        </span>
        <span className="deEd__spacer" />
        <button type="button" className="ad__btn" onClick={test} disabled={busy}><Send aria-hidden="true" /> Send me a test</button>
        <button type="button" className="ad__btn" onClick={() => save(null)} disabled={busy || !dirty}><Save aria-hidden="true" /> Save</button>
        {campaignId ? null : <button type="button" className="ad__btn ad__btn--primary" onClick={() => save(true)} disabled={busy || (!dirty && enabled)}><Power aria-hidden="true" /> Save and use it</button>}
      </div>

      <div className="deEd__grid">
        <div className="deEd__col">
          <section className="ad__panel deEd__panel">
            <h2>The message</h2>
            <label className="deEd__f">Subject<input value={design.subject} onChange={(e) => change({ ...design, subject: e.target.value })} {...track("meta", "subject")} maxLength={200} /></label>
            <label className="deEd__f">Preview line<input value={design.preheader} onChange={(e) => change({ ...design, preheader: e.target.value })} {...track("meta", "preheader")} maxLength={200} /><small>The grey text after the subject in an inbox.</small></label>
            <label className="deEd__f">Heading<input value={design.heading} onChange={(e) => change({ ...design, heading: e.target.value })} {...track("meta", "heading")} maxLength={200} /></label>
          </section>

          <section className="ad__panel deEd__panel">
            <h2>Tags</h2>
            <p className="deEd__hint">Click into a field, then pick a tag to drop in a real value when it is sent. Write <code>{"{{client.first_name | \"there\"}}"}</code> to say what to use when it is missing.</p>
            <div className="deEd__tags">
              {tags.map((t) => <button type="button" key={t.key} className="deEd__tag" onClick={() => insertTag(t.key)} title={`Example: ${t.sample}`}>{t.label}</button>)}
            </div>
            {unknown.length ? <p className="deEd__warn" role="alert">Not a tag here: {unknown.map((u) => `{{${u}}}`).join(", ")}. It will be left empty.</p> : null}
          </section>

          <section className="ad__panel deEd__panel">
            <h2>Content</h2>
            <ol className="deEd__blocks">
              {design.blocks.map((b, i) => (
                <li key={b.id} className="deEd__block">
                  <div className="deEd__bh">
                    <b>{BLOCK_LABEL[b.type]}</b>
                    <span className="deEd__acts">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${BLOCK_LABEL[b.type]} up`}><ArrowUp aria-hidden="true" /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === design.blocks.length - 1} aria-label={`Move ${BLOCK_LABEL[b.type]} down`}><ArrowDown aria-hidden="true" /></button>
                      {b.type !== "system" ? <button type="button" onClick={() => { const c = { ...b, id: Math.random().toString(36).slice(2, 10) } as Block; const blocks = design.blocks.slice(); blocks.splice(i + 1, 0, c); change({ ...design, blocks }); }} aria-label={`Duplicate ${BLOCK_LABEL[b.type]}`}><Copy aria-hidden="true" /></button> : null}
                      <button type="button" onClick={() => change({ ...design, blocks: design.blocks.filter((x) => x.id !== b.id) })} aria-label={`Remove ${BLOCK_LABEL[b.type]}`}><Trash2 aria-hidden="true" /></button>
                    </span>
                  </div>
                  <BlockFields b={b} patch={(p) => patchBlock(b.id, p)} track={track} />
                  {b.type !== "system" ? (
                    <label className="deEd__f">Show only if
                      <select value={b.when ? `${b.when.is}` : ""} onChange={(e) => patchBlock(b.id, { when: e.target.value ? { key: b.when?.key ?? "tag.client", is: e.target.value as "filled" | "empty" } : undefined } as Partial<Block>)}>
                        <option value="">Always</option><option value="filled">This value is filled in</option><option value="empty">This value is empty</option>
                      </select>
                      {b.when ? <input value={b.when.key} maxLength={60} aria-label="Value to check" placeholder="tag.client" onChange={(e) => patchBlock(b.id, { when: { key: e.target.value.trim(), is: b.when!.is } } as Partial<Block>)} /> : null}
                      {b.when ? <small className="deEd__hint">A person&apos;s tags are values named tag.name, so tag.client is filled for anyone tagged client.</small> : null}
                    </label>
                  ) : null}
                </li>
              ))}
            </ol>
            <div className="deEd__add" role="group" aria-label="Add a block">
              {ADDABLE.map((t) => <button type="button" key={t} className="ad__btn" onClick={() => change({ ...design, blocks: [...design.blocks, newBlock(t)].slice(0, 60) })}><Plus aria-hidden="true" /> {BLOCK_LABEL[t]}</button>)}
            </div>
          </section>

          {campaignId ? null : <section className="ad__panel deEd__panel">
            <h2>Versions and reset</h2>
            {history.length ? (
              <ul className="deEd__hist">
                {history.map((h) => (
                  <li key={h.id}>
                    <span>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(h.savedAt))} by {h.savedBy || "someone"}</span>
                    <button type="button" className="ad__btn" onClick={() => restore(h.id)} disabled={busy}>Load</button>
                  </li>
                ))}
              </ul>
            ) : <p className="deEd__hint">Every save is kept here, so you can go back.</p>}
            <div className="deEd__row">
              {enabled ? <button type="button" className="ad__btn" onClick={switchOff} disabled={busy}><Power aria-hidden="true" /> Switch off, use built-in</button> : null}
              {exists ? <button type="button" className="ad__btn ad__btn--danger" onClick={reset} disabled={busy}><RotateCcw aria-hidden="true" /> Reset to built-in</button> : null}
            </div>
          </section>}
        </div>

        <div className="deEd__col deEd__previewCol">
          <section className="ad__panel deEd__panel deEd__preview">
            <div className="deEd__ph">
              <h2>Preview</h2>
              <span className="deEd__acts">
                <button type="button" className="ad__btn" aria-pressed={phone} onClick={() => setPhone(true)}><Smartphone aria-hidden="true" /> Phone</button>
                <button type="button" className="ad__btn" aria-pressed={!phone} onClick={() => setPhone(false)}><Monitor aria-hidden="true" /> Desktop</button>
              </span>
            </div>
            <p className="deEd__hint">Sample data. Subject: <b>{subject || "…"}</b></p>
            <div className={`deEd__frame${phone ? " is-phone" : ""}`}>
              <iframe title="Email preview" sandbox="" srcDoc={html || "<p style='font-family:sans-serif;padding:1rem'>Drawing the preview…</p>"} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function BlockFields({ b, patch, track }: {
  b: Block; patch: (p: Partial<Block>) => void;
  track: (id: string, name: string) => ReturnType<typeof Object>;
}) {
  const t = (name: string) => track(`${b.id}:${name}`, name) as object;
  const inp = (label: string, field: string, value: string, max = 2000, area = false) => (
    <label className="deEd__f">{label}
      {area
        ? <textarea rows={4} value={value} maxLength={max} onChange={(e) => patch({ [field]: e.target.value } as Partial<Block>)} {...t(field)} />
        : <input value={value} maxLength={max} onChange={(e) => patch({ [field]: e.target.value } as Partial<Block>)} {...t(field)} />}
    </label>
  );
  switch (b.type) {
    case "heading": return inp("Text", "text", b.text, 200);
    case "text": return <>{inp("Text", "text", b.text, 4000, true)}<small className="deEd__hint">A blank line starts a new paragraph. **bold** and [a link](https://example.com) work.</small></>;
    case "note": return inp("Text", "text", b.text, 1000, true);
    case "button": return <>{inp("Label", "label", b.label, 80)}{inp("Link", "url", b.url, 500)}</>;
    case "figure": return <>{inp("Label", "label", b.label, 80)}{inp("Value", "value", b.value, 80)}{inp("Note under it", "note", b.note, 160)}</>;
    case "image": return <>{inp("Picture address (https)", "src", b.src, 500)}{inp("Describe it", "alt", b.alt, 200)}{inp("Link when pressed (optional)", "url", b.url, 500)}</>;
    case "columns": return <>{inp("Left", "left", b.left, 1500, true)}{inp("Right", "right", b.right, 1500, true)}</>;
    case "space": return <label className="deEd__f">Height ({b.size}px)<input type="range" min={4} max={80} value={b.size} onChange={(e) => patch({ size: Number(e.target.value) } as Partial<Block>)} /></label>;
    case "divider": return <small className="deEd__hint">A thin line.</small>;
    case "system": return <p className="deEd__lock"><Lock aria-hidden="true" /> Filled in by the studio when it is sent. You can move it or remove it.</p>;
    case "facts": return (
      <div className="deEd__rows">
        {b.rows.map((r, i) => (
          <div key={i} className="deEd__row2">
            <input aria-label="Label" value={r.label} maxLength={80} onChange={(e) => patch({ rows: b.rows.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) } as Partial<Block>)} {...(track(`${b.id}:row:${i}:label`, "label") as object)} />
            <input aria-label="Value" value={r.value} maxLength={300} onChange={(e) => patch({ rows: b.rows.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)) } as Partial<Block>)} {...(track(`${b.id}:row:${i}:value`, "value") as object)} />
            <button type="button" onClick={() => patch({ rows: b.rows.filter((_, k) => k !== i) } as Partial<Block>)} aria-label="Remove this row"><Trash2 aria-hidden="true" /></button>
          </div>
        ))}
        {b.rows.length < 8 ? <button type="button" className="ad__btn" onClick={() => patch({ rows: [...b.rows, { label: "", value: "" }] } as Partial<Block>)}><Plus aria-hidden="true" /> Row</button> : null}
      </div>
    );
  }
}
