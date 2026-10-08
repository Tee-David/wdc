"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorState, type Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Braces, ChevronDown, ChevronUp, Copy, Eye, GripVertical, Italic, Link2, List, ListOrdered,
  Lock, Monitor, Redo2, Save, Send, Smartphone, Trash2, Underline, Undo2,
} from "lucide-react";
import { BLOCK_LABEL, blockId, newBlock, tagText, type Block, type Design } from "@/lib/email-design";
import { kindByKey, type Tag } from "@/lib/email-registry";
import {
  previewDesign, resetDesignAction, restoreVersionAction, saveDesignAction, sendTestAction, setDesignOn,
} from "@/lib/admin/email-design-actions";
import { saveCampaignDesign } from "@/lib/admin/campaign-actions";
import { toast } from "../toast";
import { ask } from "../confirm";
import { Pick } from "../pick";
import { KitContext, LineText, RichText, insertTag, type Kit } from "./eb-tiptap";
import { BlocksPane, Chips, ChecklistPane, SettingsPane, TagsPane, tagReport } from "./eb-panels";
import "./email-builder.css";

/**
 * THE EMAIL BUILDER (the approved "Email builder" design).
 *
 * The email is written on the page itself: click any words to edit them with
 * real formatting (TipTap, see eb-tiptap.tsx). Blocks reorder by their grip
 * (pointer events, so a finger works too) or by the arrow buttons, which are
 * the keyboard route and are announced. The side panel holds the Blocks, the
 * merge Tags, the selected block's Settings and a Checklist.
 *
 * ONE history for the whole email. Every change goes through `commit`, so
 * undo and redo see typing, moves and settings alike; typing in one place is
 * folded into one step.
 */

export type BuilderProps = {
  kind: string; name: string; tags: Tag[];
  starters: { name: string; design: Design }[];
  saved: { design: Design; enabled: boolean } | null;
  history: { id: string; savedBy: string; savedAt: string }[];
  /** Set when this edits a campaign's own copy: saving goes to the campaign, and there is no on/off, reset or version list. */
  campaignId?: string;
};

type Hist = { design: Design; past: Design[]; future: Design[] };
type Active = { editor: Editor; rich: boolean } | null;
type Pop =
  | { mode: "chip"; view: EditorView; pos: number; left: number; top: number }
  | { mode: "insert"; left: number; top: number }
  | null;
type Ghost = { label: string } | null;

const FORMATS = [{ value: "p", label: "Paragraph" }, { value: "h2", label: "Heading" }, { value: "quote", label: "Quote" }];
const SIDE_TABS = [["blocks", "Blocks"], ["tags", "Tags"], ["settings", "Settings"], ["guide", "Checklist"]] as const;
type Tab = (typeof SIDE_TABS)[number][0];
const MAX_BLOCKS = 60;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Set an input's value the way typing would, so React's onChange hears it. */
function typeInto(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, el.value.slice(0, s) + text + el.value.slice(e));
  el.dispatchEvent(new Event("input", { bubbles: true }));
  window.setTimeout(() => { el.focus(); el.setSelectionRange(s + text.length, s + text.length); }, 0);
}

export default function EmailBuilder({ kind, name, tags, starters, saved, history, campaignId }: BuilderProps) {
  const campaign = Boolean(campaignId);
  const info = kindByKey(kind);
  const [h, setH] = useState<Hist>(() => ({ design: saved?.design ?? starters[0].design, past: [], future: [] }));
  const hRef = useRef(h);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const design = h.design;
  const [base, setBase] = useState<string>(() => JSON.stringify(saved?.design ?? null));
  const [enabled, setEnabled] = useState(saved?.enabled ?? false);
  const [exists, setExists] = useState(Boolean(saved));
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("blocks");
  const [view, setView] = useState<"d" | "m">("d");
  const [active, setActive] = useState<Active>(null);
  const [pop, setPop] = useState<Pop>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [mail, setMail] = useState<{ html: string; subject: string } | null>(null);
  const [live, setLive] = useState("");
  const [ghost, setGhost] = useState<Ghost>(null);
  const [lift, setLift] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const ghostEl = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<{ input: HTMLInputElement | HTMLTextAreaElement } | null>(null);
  const skipClick = useRef(false);
  const subjectId = useId();

  const json = useMemo(() => JSON.stringify(design), [design]);
  const dirty = json !== base;

  /* ------------------------------------------------------------ history */
  const commit = useCallback((fn: (d: Design) => Design, key?: string) => {
    const cur = hRef.current;
    const next = fn(cur.design);
    if (next === cur.design) return;
    const now = Date.now();
    const fold = Boolean(key && lastKey.current?.key === key && now - lastKey.current.at < 1200);
    lastKey.current = key ? { key, at: now } : null;
    const nh: Hist = { design: next, past: fold ? cur.past : [...cur.past.slice(-49), cur.design], future: [] };
    hRef.current = nh;
    setH(nh);
  }, []);
  const undo = useCallback(() => {
    const cur = hRef.current; const p = cur.past.at(-1);
    if (!p) return;
    lastKey.current = null;
    hRef.current = { design: p, past: cur.past.slice(0, -1), future: [cur.design, ...cur.future] };
    setH(hRef.current);
  }, []);
  const redo = useCallback(() => {
    const cur = hRef.current; const f = cur.future[0];
    if (!f) return;
    lastKey.current = null;
    hRef.current = { design: f, past: [...cur.past, cur.design], future: cur.future.slice(1) };
    setH(hRef.current);
  }, []);
  const replace = useCallback((d: Design) => { lastKey.current = null; hRef.current = { design: d, past: [], future: [] }; setH(hRef.current); }, []);

  const patch = useCallback((id: string, p: Partial<Block>, key?: string) =>
    commit((d) => {
      const b = d.blocks.find((x) => x.id === id);
      if (!b) return d;
      const same = Object.entries(p).every(([k, v]) => (b as Record<string, unknown>)[k] === v);
      if (same) return d;
      return { ...d, blocks: d.blocks.map((x) => (x.id === id ? ({ ...x, ...p } as Block) : x)) };
    }, key ?? `p:${id}:${Object.keys(p).join()}`), [commit]);
  const setMeta = useCallback((p: Partial<Design>, key: string) =>
    commit((d) => (Object.entries(p).every(([k, v]) => (d as Record<string, unknown>)[k] === v) ? d : { ...d, ...p }), `m:${key}`), [commit]);

  /* ------------------------------------------------------- the editors */
  const kit = useMemo<Kit>(() => ({
    focus: (editor, rich) => { lastFocus.current = null; setActive({ editor, rich }); },
    chip: (view, pos, el) => {
      const sr = stage.current?.getBoundingClientRect(), r = el.getBoundingClientRect();
      if (!sr) return;
      setPop({ mode: "chip", view, pos, left: r.left - sr.left, top: r.bottom - sr.top + 6 });
    },
    undo, redo,
  }), [undo, redo]);

  const liveEditor = active && !active.editor.isDestroyed ? active : null;

  const put = (key: string) => {
    const f = lastFocus.current?.input;
    if (f && f.isConnected && document.activeElement === f) { typeInto(f, tagText(key)); return; }
    if (liveEditor) { insertTag(liveEditor.editor, key); return; }
    toast("Click into the words first, then pick a tag.", "bad");
  };

  /* A popover closes on Escape or a press outside it. */
  useEffect(() => {
    if (!pop) return;
    const away = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".eb-pop, .adPick__pop, .adPick__scrim, .eb-mt, .eb-tagbtn")) setPop(null);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) setPop(null); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [pop]);

  /* ------------------------------------------------------ block actions */
  const announce = (text: string) => setLive((p) => (p === text ? `${text}​` : text));
  const focusTool = (id: string, action: string) => requestAnimationFrame(() => {
    const el = canvas.current?.querySelector<HTMLButtonElement>(`[data-bid="${id}"] [data-a="${action}"]`);
    if (el && !el.disabled) el.focus();
    else canvas.current?.querySelector<HTMLButtonElement>(`[data-bid="${id}"] [data-a="${action === "up" ? "down" : "up"}"]`)?.focus();
  });
  const reorder = useCallback((id: string, to: number, how: "drag" | "key") => {
    const cur = hRef.current.design;
    const i = cur.blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const j = Math.max(0, Math.min(cur.blocks.length - 1, to > i && how === "drag" ? to - 1 : to));
    if (j === i) return;
    commit((d) => { const blocks = d.blocks.slice(); const [b] = blocks.splice(i, 1); blocks.splice(j, 0, b); return { ...d, blocks }; });
    setSel(id);
    announce(`Moved ${BLOCK_LABEL[cur.blocks[i].type]} to position ${j + 1} of ${cur.blocks.length}.`);
  }, [commit]);
  const addBlock = useCallback((type: Block["type"], at?: number) => {
    if (hRef.current.design.blocks.length >= MAX_BLOCKS) { toast("An email can hold 60 blocks.", "bad"); return; }
    const b = newBlock(type);
    commit((d) => { const blocks = d.blocks.slice(); blocks.splice(at ?? blocks.length, 0, b); return { ...d, blocks }; });
    setSel(b.id);
    announce(`${BLOCK_LABEL[type]} block added.`);
    requestAnimationFrame(() => canvas.current?.querySelector(`[data-bid="${b.id}"]`)?.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }));
  }, [commit]);
  const duplicate = (b: Block, i: number) => {
    if (design.blocks.length >= MAX_BLOCKS) { toast("An email can hold 60 blocks.", "bad"); return; }
    const c = { ...b, id: blockId() } as Block;
    commit((d) => { const blocks = d.blocks.slice(); blocks.splice(i + 1, 0, c); return { ...d, blocks }; });
    setSel(c.id);
    announce(`${BLOCK_LABEL[b.type]} block duplicated.`);
  };
  const remove = (b: Block) => {
    commit((d) => ({ ...d, blocks: d.blocks.filter((x) => x.id !== b.id) }));
    setSel(null);
    announce(`${BLOCK_LABEL[b.type]} block removed. Undo brings it back.`);
  };

  /* ------------------------------------------------------ drag and drop */
  const startDrag = (e: React.PointerEvent, o: { label: string; id?: string; type?: Block["type"]; threshold: number }) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const cv = canvas.current;
    if (!cv) return;
    const sx = e.clientX, sy = e.clientY;
    let x = sx, y = sy, moved = false, idx = 0, raf = 0;
    const where = () => {
      const ws = [...cv.querySelectorAll<HTMLElement>("[data-bid]")];
      for (let k = 0; k < ws.length; k++) { const r = ws[k].getBoundingClientRect(); if (y < r.top + r.height / 2) return k; }
      return ws.length;
    };
    const tick = () => {
      if (ghostEl.current) { ghostEl.current.style.left = `${x}px`; ghostEl.current.style.top = `${y}px`; }
      idx = where();
      setDropAt(idx);
      if (y < 72) window.scrollBy(0, -14); else if (y > window.innerHeight - 72) window.scrollBy(0, 14);
      raf = requestAnimationFrame(tick);
    };
    const mv = (ev: PointerEvent) => {
      x = ev.clientX; y = ev.clientY;
      if (!moved && Math.hypot(x - sx, y - sy) >= o.threshold) {
        moved = true; skipClick.current = true;
        setGhost({ label: o.label });
        if (o.id) { setSel(o.id); setLift(o.id); }
        raf = requestAnimationFrame(tick);
      }
    };
    const end = (drop: boolean) => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", esc, true);
      cancelAnimationFrame(raf);
      setGhost(null); setDropAt(null); setLift(null);
      window.setTimeout(() => { skipClick.current = false; }, 0);
      if (!moved || !drop) return;
      const sr = stage.current?.getBoundingClientRect();
      if (!sr || x < sr.left - 24 || x > sr.right + 24 || y < sr.top - 24 || y > sr.bottom + 24) return;
      if (o.id) reorder(o.id, idx, "drag"); else if (o.type) addBlock(o.type, idx);
    };
    const up = () => end(true);
    const cancel = () => end(false);
    const esc = (ev: KeyboardEvent) => { if (ev.key === "Escape") { ev.stopPropagation(); end(false); } };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", esc, true);
  };
  const tileDown = (e: React.PointerEvent, type: Block["type"]) => {
    /* A finger scrolls the panel; only a mouse or pen drags a tile (a tap still adds it). */
    if (e.pointerType === "touch") return;
    startDrag(e, { label: BLOCK_LABEL[type], type, threshold: 8 });
  };

  /* ------------------------------------------------------ server actions */
  async function run(fn: () => Promise<void>) { setBusy(true); try { await fn(); } finally { setBusy(false); } }
  const save = (on: boolean | null) => run(async () => {
    const r = campaignId
      ? await saveCampaignDesign(campaignId, json).then((x) => (x.ok ? ({ ok: true } as const) : ({ ok: false, message: x.message ?? "That could not be saved." } as const)))
      : await saveDesignAction(kind, json, on);
    if (!r.ok) { toast(r.message, "bad"); return; }
    setBase(json); setExists(true); if (on !== null) setEnabled(on);
    toast(on ? "Saved, and your design is now used." : "Saved.", "good");
  });
  const toggle = (on: boolean) => {
    if (on) { if (dirty || !exists) void save(true); else void run(async () => {
      const r = await setDesignOn(kind, true);
      if (!r.ok) { toast(r.message, "bad"); return; }
      setEnabled(true); toast("Updated. Your design is now used.", "good");
    }); return; }
    void run(async () => {
      const r = await setDesignOn(kind, false);
      if (!r.ok) { toast(r.message, "bad"); return; }
      setEnabled(false); toast("Updated. The built-in design is sent again.", "good");
    });
  };
  const reset = () => run(async () => {
    if (!(await ask(`Reset ${name} to the built-in design? Your saved design is deleted. This cannot be undone, though the version history is kept until the next save.`))) return;
    const r = await resetDesignAction(kind);
    if (!r.ok) { toast(r.message, "bad"); return; }
    replace(starters[0].design); setBase("null"); setExists(false); setEnabled(false); setSel(null);
    toast("Reset to the built-in design.", "good");
  });
  const test = () => run(async () => {
    const r = await sendTestAction(kind, json);
    toast(r.ok ? `Test sent to ${r.to}, with sample data.` : r.message, r.ok ? "good" : "bad");
  });
  const restore = (id: string) => run(async () => {
    const r = await restoreVersionAction(kind, id);
    if (!r.ok) { toast(r.message, "bad"); return; }
    const d = JSON.parse(r.json) as Design;
    commit(() => d); toast("Version loaded. Save to keep it.", "good");
  });

  /* The real render (sandboxed), for when the sketch on the page is not enough. */
  useEffect(() => {
    if (!rendered) return;
    let on = true;
    const t = window.setTimeout(async () => {
      const r = await previewDesign(kind, json).catch(() => null);
      if (on && r?.ok) setMail({ html: r.html, subject: r.subject });
    }, 400);
    return () => { on = false; window.clearTimeout(t); };
  }, [rendered, kind, json]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const known = useMemo(() => new Set([...tags.map((t) => t.key), "studio.name", "studio.email"]), [tags]);
  const sample = useMemo(() => Object.fromEntries([...tags.map((t) => [t.key, t.sample]), ["studio.name", "We Dig Creativity"]]), [tags]);
  const selBlock = design.blocks.find((b) => b.id === sel) ?? null;
  const report = useMemo(() => tagReport(design, known), [design, known]);
  const issues = report.noFallback.length + report.unknown.length + (design.blocks.some((b) => b.type === "button") ? 0 : 1);

  const openInsert = (btn: HTMLElement) => {
    const sr = stage.current?.getBoundingClientRect(), r = btn.getBoundingClientRect();
    if (sr) setPop({ mode: "insert", left: r.left - sr.left, top: r.bottom - sr.top + 6 });
  };


  return (
    <KitContext.Provider value={kit}>
      <div className="eb" data-view={view}>
        <div className="eb-top">
          <span className="eb-state" role="status">
            {dirty ? "Unsaved changes" : campaign ? "Saved" : exists ? (enabled ? "Your design is on" : "Saved, switched off") : "Built-in design is in use"}
          </span>
          {campaign ? null : (
            <label className="eb-sw">
              <input type="checkbox" role="switch" checked={enabled} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
              <span className="eb-sw-t" aria-hidden="true" />
              <span>{enabled ? "On" : "Off"}</span>
            </label>
          )}
          <div className="eb-acts">
            <div className="eb-seg" role="group" aria-label="Preview width">
              <button type="button" aria-pressed={view === "d"} aria-label="Desktop width" onClick={() => setView("d")}><Monitor aria-hidden="true" /></button>
              <button type="button" aria-pressed={view === "m"} aria-label="Phone width" onClick={() => setView("m")}><Smartphone aria-hidden="true" /></button>
            </div>
            <button type="button" className="ad__btn" aria-pressed={rendered} onClick={() => setRendered((v) => !v)}><Eye aria-hidden="true" /><span className="eb-hs">{rendered ? "Back to editing" : "Preview"}</span></button>
            <button type="button" className="ad__btn" onClick={test} disabled={busy} aria-label="Send me a test"><Send aria-hidden="true" /><span className="eb-hs">Send test</span></button>
            <button type="button" className="ad__btn ad__btn--primary" onClick={() => save(null)} disabled={busy || !dirty}><Save aria-hidden="true" /> Save</button>
          </div>
        </div>

        <div className="eb-subj">
          <span className="eb-lab" id={subjectId}>Subject</span>
          <div className="eb-subjed" aria-labelledby={subjectId}>
            <LineText value={design.subject} onChange={(v) => setMeta({ subject: v }, "subject")} label="Subject" placeholder="What is this email about?" />
          </div>
        </div>

        <Toolbar active={liveEditor} history={h} undo={undo} redo={redo} linkOpen={linkOpen} setLinkOpen={setLinkOpen} openInsert={openInsert} />

        <div className="eb-body">
          <div className="eb-stage" ref={stage} data-dragging={ghost ? "" : undefined}>
            {rendered ? (
              <div className="eb-real">
                <p className="eb-hint">The real email, with sample data. Subject: <b>{mail?.subject ?? "…"}</b></p>
                <iframe title="Email preview" sandbox="" srcDoc={mail?.html ?? "<p style='font-family:sans-serif;padding:1rem'>Drawing the preview…</p>"} className={view === "m" ? "is-phone" : undefined} />
              </div>
            ) : (
              <div className="eb-canvas" ref={canvas}>
                <div className="eb-hd" aria-hidden="true">We Dig Creativity</div>
                <div className="eb-lead">
                  <div className="eb-title"><LineText value={design.heading} onChange={(v) => setMeta({ heading: v }, "heading")} label="Email heading" placeholder="Email heading" /></div>
                </div>
                {design.blocks.map((b, i) => (
                  <BlockItem key={b.id} b={b} i={i} n={design.blocks.length} sel={sel === b.id} dragging={lift === b.id}
                    before={dropAt === i}
                    select={() => setSel(b.id)}
                    patch={patch}
                    grip={(e) => { e.preventDefault(); startDrag(e, { label: BLOCK_LABEL[b.type], id: b.id, threshold: 0 }); }}
                    up={() => { reorder(b.id, i - 1, "key"); focusTool(b.id, "up"); }}
                    down={() => { reorder(b.id, i + 1, "key"); focusTool(b.id, "down"); }}
                    dup={() => duplicate(b, i)} del={() => remove(b)} />
                ))}
                {dropAt === design.blocks.length ? <div className="eb-drop" aria-hidden="true" /> : null}
                {!design.blocks.length ? <p className="eb-empty">This email has no blocks yet. Add one from the Blocks tab.</p> : null}
                <div className="eb-ft">
                  {info?.why ?? "You get this because of something you did with us."}{info?.unsubscribe ? <> <u>Unsubscribe</u></> : null} · We Dig Creativity
                </div>
              </div>
            )}

            {pop ? (
              <div className="eb-pop" style={{ "--pl": `${pop.left}px`, top: pop.top } as React.CSSProperties} role="dialog" aria-label={pop.mode === "chip" ? "Merge tag" : "Insert a merge tag"}>
                {pop.mode === "insert" ? (
                  <>
                    <b>Insert a merge tag</b>
                    <div className="eb-poplist" data-lenis-prevent>
                      {tags.map((t) => (
                        <button key={t.key} type="button" className="eb-trow eb-trow--btn" onClick={() => { put(t.key); setPop(null); }} title={`Example: ${t.sample}`}>
                          <span>{t.label}</span><code>{t.key}</code>
                        </button>
                      ))}
                    </div>
                  </>
                ) : <ChipEditor pop={pop} tags={tags} sample={sample} close={() => setPop(null)} />}
              </div>
            ) : null}
          </div>

          <aside className="eb-side" aria-label="Email panel">
            <Tabs tab={tab} setTab={setTab} issues={issues} />
            <div className="eb-pane" role="tabpanel" id={`eb-panel-${tab}`} aria-labelledby={`eb-tab-${tab}`} data-lenis-prevent
              onFocusCapture={(e) => { const t = e.target; if (t instanceof HTMLInputElement && t.type !== "range" || t instanceof HTMLTextAreaElement) lastFocus.current = { input: t as HTMLInputElement }; }}>
              {tab === "blocks" ? <BlocksPane add={(t) => { if (!skipClick.current) addBlock(t); }} tileDown={tileDown} full={design.blocks.length >= MAX_BLOCKS} /> : null}
              {tab === "tags" ? <TagsPane design={design} tags={tags} known={known} put={put} /> : null}
              {tab === "settings" ? (
                <SettingsPane sel={selBlock} patch={patch} design={design} setMeta={setMeta} campaign={campaign} history={history}
                  enabled={enabled} exists={exists} busy={busy} restore={restore} reset={reset} />
              ) : null}
              {tab === "guide" ? <ChecklistPane design={design} sample={sample} known={known} unsubscribe={info?.unsubscribe} why={info?.why} /> : null}
            </div>
          </aside>
        </div>

        <div className="ad__sr" aria-live="polite" role="status">{live}</div>
        {ghost ? createPortal(<div ref={ghostEl} className="eb-ghost" aria-hidden="true">{ghost.label}</div>, document.querySelector(".ad") ?? document.body) : null}
      </div>
    </KitContext.Provider>
  );
}

/* ------------------------------------------------------------------ tabs */

function Tabs({ tab, setTab, issues }: { tab: Tab; setTab: (t: Tab) => void; issues: number }) {
  const onKey = (e: React.KeyboardEvent) => {
    const i = SIDE_TABS.findIndex(([k]) => k === tab);
    const go = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? SIDE_TABS.length - 1 : -1;
    if (go < 0) return;
    e.preventDefault();
    const next = SIDE_TABS[(go + SIDE_TABS.length) % SIDE_TABS.length][0];
    setTab(next);
    requestAnimationFrame(() => document.getElementById(`eb-tab-${next}`)?.focus());
  };
  return (
    <div className="eb-tabs" role="tablist" aria-label="Email panel" onKeyDown={onKey}>
      {SIDE_TABS.map(([k, label]) => (
        <button key={k} type="button" role="tab" id={`eb-tab-${k}`} aria-selected={tab === k} aria-controls={`eb-panel-${k}`} tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)}>
          {label}{k === "guide" && issues ? <span className="eb-badge" aria-label={`${issues} to check`}>{issues}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- toolbar */

const read = (e: Editor, rich: boolean) => rich ? ({
  fmt: e.isActive("heading") ? "h2" : e.isActive("blockquote") ? "quote" : "p",
  bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"),
  ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), link: e.isActive("link"),
  align: (e.getAttributes("paragraph").textAlign ?? e.getAttributes("heading").textAlign ?? "left") as string,
}) : null;

function Toolbar({ active, history, undo, redo, linkOpen, setLinkOpen, openInsert }: {
  active: Active; history: Hist; undo: () => void; redo: () => void;
  linkOpen: boolean; setLinkOpen: (v: boolean) => void; openInsert: (el: HTMLElement) => void;
}) {
  const s = useEditorState({ editor: active?.editor ?? null, selector: ({ editor }) => (editor && !editor.isDestroyed ? read(editor, active?.rich ?? false) : null) });
  const ed = active?.editor;
  const rich = Boolean(active?.rich && s);
  const c = () => ed!.chain().focus();
  const setFormat = (v: string) => {
    if (!ed) return;
    const q = ed.isActive("blockquote");
    if (v === "p") { const ch = c(); if (q) ch.toggleBlockquote(); ch.setParagraph().run(); }
    else if (v === "h2") { const ch = c(); if (q) ch.toggleBlockquote(); ch.setHeading({ level: 2 }).run(); }
    else { const ch = c(); ch.setParagraph(); if (!q) ch.setBlockquote(); ch.run(); }
  };
  const align = (a: "left" | "center" | "right") => c().updateAttributes("paragraph", { textAlign: a === "left" ? null : a }).updateAttributes("heading", { textAlign: a === "left" ? null : a }).run();
  const tool = (label: string, on: boolean, run: () => void, icon: React.ReactNode, off = !rich) => (
    <button type="button" aria-label={label} title={label} aria-pressed={on} disabled={off} onClick={run}>{icon}</button>
  );
  return (
    <>
      <div className="eb-tb" role="toolbar" aria-label="Text formatting" onMouseDown={(e) => { if (!(e.target as HTMLElement).closest("input")) e.preventDefault(); }}>
        <button type="button" aria-label="Undo" title="Undo" disabled={!history.past.length} onClick={undo}><Undo2 aria-hidden="true" /></button>
        <button type="button" aria-label="Redo" title="Redo" disabled={!history.future.length} onClick={redo}><Redo2 aria-hidden="true" /></button>
        <i className="eb-sep" aria-hidden="true" />
        <fieldset className="eb-fmt" disabled={!rich}>
          <legend className="ad__sr">Text style</legend>
          <Pick label="Text style" options={FORMATS} value={s?.fmt ?? "p"} onChange={setFormat} />
        </fieldset>
        <i className="eb-sep" aria-hidden="true" />
        {tool("Bold", Boolean(s?.bold), () => c().toggleBold().run(), <Bold aria-hidden="true" />)}
        {tool("Italic", Boolean(s?.italic), () => c().toggleItalic().run(), <Italic aria-hidden="true" />)}
        {tool("Underline", Boolean(s?.underline), () => c().toggleUnderline().run(), <Underline aria-hidden="true" />)}
        <i className="eb-sep" aria-hidden="true" />
        {tool("Bulleted list", Boolean(s?.ul), () => c().toggleBulletList().run(), <List aria-hidden="true" />)}
        {tool("Numbered list", Boolean(s?.ol), () => c().toggleOrderedList().run(), <ListOrdered aria-hidden="true" />)}
        <i className="eb-sep" aria-hidden="true" />
        {tool("Align left", s?.align === "left", () => align("left"), <AlignLeft aria-hidden="true" />)}
        {tool("Align centre", s?.align === "center", () => align("center"), <AlignCenter aria-hidden="true" />)}
        {tool("Align right", s?.align === "right", () => align("right"), <AlignRight aria-hidden="true" />)}
        <i className="eb-sep" aria-hidden="true" />
        {tool("Link", Boolean(s?.link) || linkOpen, () => setLinkOpen(!linkOpen), <Link2 aria-hidden="true" />)}
        <button type="button" className="eb-tagbtn" onClick={(e) => openInsert(e.currentTarget)} disabled={!ed}>
          <Braces aria-hidden="true" /><span>Merge tag</span>
        </button>
      </div>
      {linkOpen && rich && ed ? <LinkRow editor={ed} close={() => setLinkOpen(false)} /> : null}
    </>
  );
}

function LinkRow({ editor, close }: { editor: Editor; close: () => void }) {
  const id = useId();
  const [href, setHref] = useState<string>(() => editor.getAttributes("link").href ?? "");
  const [err, setErr] = useState("");
  const apply = () => {
    const v = href.trim();
    if (!v) { editor.chain().focus().extendMarkRange("link").unsetLink().run(); close(); return; }
    const full = /^(https:\/\/|mailto:|\{\{)/i.test(v) ? v : /^http:\/\//i.test(v) ? "" : `https://${v}`;
    if (!full || (!full.startsWith("{{") && !/^(https:\/\/[^\s/]+\.[^\s]+|mailto:[^\s@]+@[^\s@]+)$/i.test(full))) { setErr("Use an https:// address or a mailto: address."); return; }
    const ch = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) ch.insertContent({ type: "text", text: v, marks: [{ type: "link", attrs: { href: full } }] }).run();
    else ch.setLink({ href: full }).run();
    close();
  };
  return (
    <div className="eb-link" role="group" aria-label="Link">
      <label htmlFor={`${id}-h`}>Link address</label>
      <input id={`${id}-h`} value={href} inputMode="url" autoFocus placeholder="https://example.com" maxLength={500}
        onChange={(e) => { setHref(e.target.value); setErr(""); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } if (e.key === "Escape") close(); }} />
      <button type="button" className="ad__btn ad__btn--primary" onClick={apply}>Apply</button>
      {editor.isActive("link") ? <button type="button" className="ad__btn" onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); close(); }}>Remove</button> : null}
      <button type="button" className="ad__btn" onClick={close}>Close</button>
      <small className={err ? "is-err" : undefined} role={err ? "alert" : undefined}>{err || "Select words first to link them. Only https and mailto links are sent."}</small>
    </div>
  );
}

/* ------------------------------------------------------ merge tag popover */

function ChipEditor({ pop, tags, sample, close }: { pop: Extract<Pop, { mode: "chip" }>; tags: Tag[]; sample: Record<string, string>; close: () => void }) {
  const { view, pos } = pop;
  const node = view.isDestroyed ? null : view.state.doc.nodeAt(pos);
  const ok = node?.type.name === "mergeTag";
  const key = ok ? (node!.attrs.key as string) : "";
  const fallback = ok ? (node!.attrs.fallback as string) : "";
  const options = useMemo(() => {
    const o = tags.map((t) => ({ value: t.key, label: `${t.label} (${t.key})` }));
    return o.some((x) => x.value === key) ? o : [{ value: key, label: `${key} (not a tag here)` }, ...o];
  }, [tags, key]);
  const set = (p: { key?: string; fallback?: string }) => {
    if (!ok) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { key, fallback, ...p }));
  };
  const drop = () => {
    if (ok) view.dispatch(view.state.tr.delete(pos, pos + node!.nodeSize));
    close();
    view.focus();
  };
  const done = () => { close(); view.focus(); };
  const fid = useId();
  if (!ok) return <p className="eb-hint">That tag is gone.</p>;
  return (
    <>
      <b>Merge tag</b>
      <label className="eb-f">Tag
        <Pick label="Tag" options={options} value={key} onChange={(v) => set({ key: v })} search={options.length > 10} />
      </label>
      <label className="eb-f" htmlFor={fid}>Fallback if empty
        <input id={fid} value={fallback} maxLength={40} placeholder="e.g. there" autoFocus
          onChange={(e) => set({ fallback: e.target.value.replace(/["\r\n]/g, "") })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); done(); } }} />
      </label>
      <p className="eb-hint">With a value it shows as <b>{sample[key] ?? "(a sample)"}</b>. With none it shows <b>{fallback || "nothing"}</b>.</p>
      <div className="eb-poprow">
        <button type="button" className="ad__btn" onClick={drop}>Remove</button>
        <button type="button" className="ad__btn ad__btn--primary" onClick={done}>Done</button>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- blocks */

function whenText(b: Block) {
  const w = b.when;
  if (!w) return "";
  const tag = w.key.startsWith("tag.");
  const name = tag ? w.key.slice(4) : w.key;
  return tag ? (w.is === "filled" ? `Only for people tagged ${name}` : `Only for people not tagged ${name}`) : `Only if ${name} is ${w.is === "filled" ? "filled in" : "empty"}`;
}

function BlockItem({ b, i, n, sel, dragging, before, select, patch, grip, up, down, dup, del }: {
  b: Block; i: number; n: number; sel: boolean; dragging: boolean; before: boolean;
  select: () => void; patch: (id: string, p: Partial<Block>, key?: string) => void;
  grip: (e: React.PointerEvent) => void; up: () => void; down: () => void; dup: () => void; del: () => void;
}) {
  const word = BLOCK_LABEL[b.type];
  const typed = b.type === "heading" || b.type === "text" || b.type === "note" || b.type === "columns";
  return (
    <>
      {before ? <div className="eb-drop" aria-hidden="true" /> : null}
      <div className={`eb-bw${sel ? " is-sel" : ""}${dragging ? " is-lifted" : ""}`} data-bid={b.id} role="group" aria-label={`${word} block, ${i + 1} of ${n}`}
        tabIndex={typed ? undefined : 0} onFocusCapture={select} onPointerDownCapture={(e) => { if (!(e.target as HTMLElement).closest(".eb-bh")) select(); }}>
        <div className="eb-bh" role="toolbar" aria-label={`${word} block tools`}>
          <button type="button" className="g" data-a="drag" aria-label={`Drag ${word} block. Or use the move buttons.`} title="Drag to move" onPointerDown={grip}><GripVertical aria-hidden="true" /></button>
          <button type="button" data-a="up" aria-label={`Move ${word} up`} title="Move up" disabled={i === 0} onClick={up}><ChevronUp aria-hidden="true" /></button>
          <button type="button" data-a="down" aria-label={`Move ${word} down`} title="Move down" disabled={i === n - 1} onClick={down}><ChevronDown aria-hidden="true" /></button>
          {b.type !== "system" ? <button type="button" data-a="dup" aria-label={`Duplicate ${word}`} title="Duplicate" onClick={dup}><Copy aria-hidden="true" /></button> : null}
          <button type="button" data-a="del" className="del" aria-label={`Remove ${word}`} title="Remove" onClick={del}><Trash2 aria-hidden="true" /></button>
        </div>
        {b.when ? <span className="eb-cond">{whenText(b)}</span> : null}
        <div className="eb-bc"><BlockBody b={b} patch={patch} /></div>
      </div>
    </>
  );
}

function BlockBody({ b, patch }: { b: Block; patch: (id: string, p: Partial<Block>, key?: string) => void }) {
  switch (b.type) {
    case "heading": return <div className="eb-h2"><LineText value={b.text} onChange={(v) => patch(b.id, { text: v } as Partial<Block>, `t:${b.id}`)} label="Heading text" placeholder="A heading" /></div>;
    case "text": return <RichText value={b.text} onChange={(v) => patch(b.id, { text: v } as Partial<Block>, `t:${b.id}`)} label="Text" placeholder="Write here" />;
    case "note": return <div className="eb-small"><RichText value={b.text} onChange={(v) => patch(b.id, { text: v } as Partial<Block>, `t:${b.id}`)} label="Small print" placeholder="Small print" /></div>;
    case "columns": return (
      <div className="eb-cols">
        <RichText value={b.left} onChange={(v) => patch(b.id, { left: v } as Partial<Block>, `l:${b.id}`)} label="Left column" placeholder="Left column" />
        <RichText value={b.right} onChange={(v) => patch(b.id, { right: v } as Partial<Block>, `r:${b.id}`)} label="Right column" placeholder="Right column" />
      </div>
    );
    case "button": return (
      <div className="eb-btnrow">
        <span className="eb-cta"><Chips text={b.label} empty="Button" /></span>
        <small className="eb-url">Goes to <Chips text={b.url} empty="(no link yet)" /></small>
      </div>
    );
    case "image": return (
      <div className="eb-ph"><span>{b.src.length > 8 ? "Picture" : "No picture yet"}</span><small>{b.alt || "Add its address and a description in Settings"}</small></div>
    );
    case "divider": return <hr />;
    case "space": return <div className="eb-space" style={{ height: b.size }} aria-label={`Space of ${b.size} pixels`} />;
    case "facts": return (
      <table className="eb-facts"><tbody>
        {b.rows.map((r, i) => <tr key={i}><td><Chips text={r.label} empty="Label" /></td><td><b><Chips text={r.value} empty="Value" /></b></td></tr>)}
      </tbody></table>
    );
    case "figure": return (
      <div className="eb-fig"><small><Chips text={b.label} empty="Label" /></small><b><Chips text={b.value} empty="Value" /></b>{b.note ? <small><Chips text={b.note} /></small> : null}</div>
    );
    case "system": return <p className="eb-lock"><Lock aria-hidden="true" /> Filled in by the studio when it is sent ({b.key || "system block"}).</p>;
  }
}

