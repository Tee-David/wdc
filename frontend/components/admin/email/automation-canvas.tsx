"use client";

import "./automation-canvas.css";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { ChevronLeft, Copy, EllipsisVertical, Maximize2, Minus, Pencil, Play, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Pick } from "../pick";
import { ask } from "../confirm";
import { toast } from "../toast";
import { removeAutomation, saveAutomationFlow, testAutomationAction, toggleAutomation } from "@/lib/admin/automation-actions";
import {
  blankStep, checkSteps, countSteps, duplicateStep, findStep, insertAt, layout, MAX_DEPTH, MAX_STEPS, MENU, normTag, problems, removeStep,
  slotDepth, stepProblem, stepSummary, stepTitle, TYPE_LABEL, updateStep, type Slot, type Step, type StepType, type TraceLine,
} from "@/lib/automations-flow";
import { StepPanel, TriggerPanel, type Meta, type Results, type TagCount, type Totals } from "./automation-panel";
import { Tile } from "./automation-tile";

type Props = {
  id: string; name: string; kind: Meta["kind"]; triggerKind: Meta["triggerKind"]; triggerValue: string;
  enabled: boolean; everOn: boolean; steps: Step[]; tags: TagCount[]; contacts: { id: string; label: string }[]; totals: Totals; results: Results;
};

const narrowQuery = "(max-width: 980px)";
const useNarrow = () => useSyncExternalStore(
  (cb) => { const m = window.matchMedia(narrowQuery); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
  () => window.matchMedia(narrowQuery).matches,
  () => false,
);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ menu */

/**
 * A small menu opened from a button inside `host` (the scrolling canvas, or the whole editor), placed beside it and kept inside it.
 * Arrow keys move, Escape closes and gives focus back, a press outside closes.
 */
function Menu({ host, anchor, label, align = "center", onClose, children }: {
  host: React.RefObject<HTMLElement | null>; anchor: HTMLElement; label: string; align?: "center" | "end"; onClose: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const m = ref.current, h = host.current;
    if (!m || !h) return;
    const a = anchor.getBoundingClientRect(), r = h.getBoundingClientRect();
    const w = m.offsetWidth, ht = m.offsetHeight;
    const x = (v: number) => v - r.left + h.scrollLeft, y = (v: number) => v - r.top + h.scrollTop;
    const left = Math.max(h.scrollLeft + 8, Math.min(align === "end" ? x(a.right) - w : x(a.left + a.width / 2) - w / 2, h.scrollLeft + h.clientWidth - w - 8));
    let top = y(a.bottom) + 4;
    if (top + ht > h.scrollTop + h.clientHeight - 8) top = Math.max(h.scrollTop + 8, y(a.top) - ht - 4);
    m.style.left = `${left}px`; m.style.top = `${top}px`;
    m.querySelector<HTMLElement>("button:not(:disabled)")?.focus({ preventScroll: true });
  }, [host, anchor, align]);
  useEffect(() => {
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!ref.current?.contains(t) && !anchor.contains(t)) onClose(); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [anchor, onClose]);
  const onKey = (e: React.KeyboardEvent) => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); anchor.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); items[(at + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(at - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === "Tab") onClose();
  };
  return <div ref={ref} className="adWf__menu" role="menu" aria-label={label} onKeyDown={onKey}>{children}</div>;
}

/* ---------------------------------------------------------------- editor */

type MenuState = { kind: "add"; slot: Slot; key: string; anchor: HTMLElement } | { kind: "node"; id: string; anchor: HTMLElement } | { kind: "more"; anchor: HTMLElement } | null;

export function AutomationCanvas(p: Props) {
  const [steps, setSteps] = useState<Step[]>(p.steps);
  const [meta, setMeta] = useState<Meta>({ name: p.name, kind: p.kind, triggerKind: p.triggerKind, triggerValue: p.triggerValue });
  const [enabled, setEnabled] = useState(p.enabled);
  const [everOn, setEverOn] = useState(p.everOn);
  const [saved, setSaved] = useState(() => JSON.stringify({ meta: { name: p.name, kind: p.kind, triggerKind: p.triggerKind, triggerValue: p.triggerValue }, steps: p.steps }));
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<"setup" | "res">("setup");
  const [focusPanel, setFocusPanel] = useState<"name" | "close" | null>(null);
  const [mode, setMode] = useState<"b" | "r">("b");
  const [z, setZ] = useState(1);
  const [menu, setMenu] = useState<MenuState>(null);
  const [asId, setAsId] = useState(p.contacts[0]?.id ?? "");
  const [running, setRunning] = useState(false);
  const [hits, setHits] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<{ head: string; lines: TraceLine[]; done: string } | null>(null);
  const [pending, start] = useTransition();
  const [panning, setPanning] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const vp = useRef<HTMLDivElement>(null);
  const pan = useRef<{ x: number; y: number; l: number; t: number } | null>(null);
  const alive = useRef(true);
  const narrow = useNarrow();

  const snap = useMemo(() => JSON.stringify({ meta, steps }), [meta, steps]);
  const dirty = snap !== saved;
  const g = useMemo(() => layout(steps), [steps]);
  const probs = useMemo(() => problems(steps), [steps]);
  const triggerBad = meta.triggerKind === "tag_added" && !normTag(meta.triggerValue);
  const nameBad = meta.name.trim().length < 2;
  const blockers = probs.length + (triggerBad ? 1 : 0) + (nameBad ? 1 : 0) + (steps.length ? 0 : 1);
  const entered = p.totals.active + p.totals.completed + p.totals.stopped;

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* First view: fit the width, never below 75%, and centre the trigger. */
  useEffect(() => {
    const el = vp.current;
    if (!el?.clientWidth) return;
    setZ(Math.max(0.75, Math.min(1, +((el.clientWidth - 16) / layout(p.steps).width).toFixed(2))));
    requestAnimationFrame(() => { el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the first view only
  }, []);

  const focusNode = useCallback((id: string | null) => {
    if (!id) return;
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-node="${id}"] .adWf__main`)?.focus({ preventScroll: true }));
  }, []);
  const open = (id: string, how: "name" | null = null) => { setSel(id); setTab("setup"); setFocusPanel(how ?? (narrow ? "close" : null)); setMenu(null); };
  const closePanel = () => { const id = sel; setSel(null); focusNode(id); };

  const patch = (id: string, change: Partial<Step>) => setSteps((s) => updateStep(s, id, change));
  const setMetaPart = (m: Partial<Meta>) => setMeta((prev) => ({ ...prev, ...m }));

  /* ---- structure */
  const add = (slot: Slot, type: StepType) => {
    const step = blankStep(type);
    const r = insertAt(steps, slot, step);
    const bad = checkSteps(r.steps, "draft");
    if (bad) { toast(bad, "bad"); return; }
    setSteps(r.steps);
    open(step.id);
    if (!narrow) focusNode(step.id);
    if (r.moved) toast(`The ${r.moved} step${r.moved === 1 ? "" : "s"} after it moved onto the No path.`);
  };
  const remove = async (id: string) => {
    const f = findStep(steps, id);
    if (!f) return;
    const inside = f.step.type === "if" ? countSteps([...f.step.yes, ...f.step.no]) : 0;
    const ok = await ask(`Delete “${stepTitle(f.step)}”? ${inside ? `The ${inside} step${inside === 1 ? "" : "s"} on its Yes and No paths go with it. ` : ""}It is only removed from the canvas until you save.`);
    if (!ok) return;
    setSteps((s) => removeStep(s, id));
    setSel((cur) => (cur === id ? null : cur));
    toast("Step deleted.");
  };
  const duplicate = (id: string) => {
    const r = duplicateStep(steps, id);
    const bad = r ? checkSteps(r.steps, "draft") : "A Yes/No step can only be copied when nothing comes after it.";
    if (!r || bad) { toast(bad ?? "That could not be copied.", "bad"); return; }
    setSteps(r.steps);
    open(r.id);
    toast("Step copied.");
  };

  /* ---- zoom and pan */
  const zoom = (d: number) => setZ((v) => Math.max(0.5, Math.min(1.4, +(v + d).toFixed(2))));
  const fit = () => {
    const el = vp.current;
    if (!el) return;
    setZ(Math.max(0.5, Math.min(1, +((el.clientWidth - 16) / g.width).toFixed(2), +((el.clientHeight - 104) / g.height).toFixed(2))));
    el.scrollTo({ left: 0, top: 0 });
  };
  const panStart = (e: React.PointerEvent<HTMLDivElement>) => {
    /* Mouse and pen drag the canvas from empty space only; a finger scrolls it natively. */
    if (e.pointerType === "touch" || e.button !== 0 || (e.target as HTMLElement).closest(".adWf__node, .adWf__plus, .adWf__menu, .adWf__tag")) return;
    const el = e.currentTarget;
    pan.current = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
    el.setPointerCapture(e.pointerId);
    setPanning(true);
  };
  const panMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = pan.current;
    if (!s) return;
    e.currentTarget.scrollLeft = s.l - (e.clientX - s.x);
    e.currentTarget.scrollTop = s.t - (e.clientY - s.y);
  };
  const panEnd = () => { pan.current = null; setPanning(false); };

  /* ---- save, publish, switch off, delete */
  const payload = () => JSON.stringify({ name: meta.name, kind: meta.kind, triggerKind: meta.triggerKind, triggerValue: meta.triggerValue, steps });
  const save = (as: "draft" | "publish") => start(async () => {
    const r = await saveAutomationFlow(p.id, payload(), as);
    if (!r.ok) { toast(r.message ?? "It could not be saved.", "bad"); return; }
    setSaved(snap);
    setEnabled(Boolean(r.enabled));
    if (r.enabled) setEverOn(true);
    toast(as === "draft" ? "Saved. It is a draft, so nobody enters it yet." : enabled ? "Updated. People already in it follow the new steps." : "Updated. It is on and will pick up people from now on.");
  });
  const form = (on?: boolean) => { const fd = new FormData(); fd.set("id", p.id); if (on !== undefined) fd.set("on", on ? "1" : "0"); return fd; };
  const switchOff = () => start(async () => {
    const r = await toggleAutomation({ ok: false }, form(false));
    if (r.ok) setEnabled(false);
    toast(r.message ?? (r.ok ? "Updated. It is off." : "It could not be changed."), r.ok ? "good" : "bad");
  });
  const destroy = async () => {
    setMenu(null);
    if (!(await ask("Delete this automation? Everyone in it stops where they are, and its steps and counts are removed. This cannot be undone."))) return;
    start(async () => { await removeAutomation({ ok: false }, form()); });
  };

  /* ---- test run: the real path for one contact, nothing sent */
  const run = async () => {
    if (!asId || running) return;
    setRunning(true); setHits(new Set()); setLog(null);
    const r = await testAutomationAction(JSON.stringify({ kind: meta.kind, steps }), asId);
    if (!alive.current) return;
    if (!r.ok) { toast(r.message, "bad"); setRunning(false); return; }
    const pace = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 60 : 420;
    const head = `Test as ${r.who.name}: ${r.who.tags.length ? `tags ${r.who.tags.join(", ")}` : "no tags"}. Nothing is really sent.`;
    setLog({ head, lines: [], done: "" });
    setHits(new Set(["trig"]));
    for (const id of r.reached) {
      await sleep(pace);
      if (!alive.current) return;
      setHits((h) => new Set(h).add(id));
      setLog((l) => (l ? { ...l, lines: [...l.lines, ...r.lines.filter((x) => x.id === id)] } : l));
    }
    await sleep(pace / 2);
    if (!alive.current) return;
    setLog((l) => (l ? { ...l, done: r.end === "finished" ? "Finished: they reach the end of their path." : r.end === "blocked" ? "Ended: they could not be emailed." : "Ended at a stop." } : l));
    setRunning(false);
  };

  /* ---- keys */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !e.defaultPrevented && sel) { e.preventDefault(); closePanel(); }
  };

  const stateChip = enabled ? <span className="ad__pill ad__pill--good">On</span> : <span className="ad__pill ad__pill--flat">{everOn ? "Off" : "Draft"}</span>;
  const canAddMore = countSteps(steps) < MAX_STEPS;
  const selStep = sel && sel !== "trig" ? findStep(steps, sel)?.step ?? null : null;
  const hasPanel = sel === "trig" || selStep !== null;

  return (
    <div ref={root} className={`adWf${hasPanel ? " is-panel" : ""}`} onKeyDown={onKeyDown}>
      <div className="adWf__top">
        <Link href="/admin/email?tab=automations" className="adWf__back" aria-label="Back to automations"><ChevronLeft aria-hidden="true" /></Link>
        <div className="adWf__name">
          <input value={meta.name} maxLength={100} aria-label="Automation name" onChange={(e) => setMetaPart({ name: e.target.value })} />
          {stateChip}
          <span className="adWf__saved" role="status">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        </div>
        <div className="adWf__acts">
          <div className="adWf__as">
            <span id="adWf-as">Test as</span>
            <Pick labelledBy="adWf-as" value={asId} onChange={setAsId} search placeholder={p.contacts.length ? "Choose a contact" : "No contacts yet"}
              options={p.contacts.map((c) => ({ value: c.id, label: c.label }))} />
          </div>
          <button type="button" className="ad__btn" onClick={run} disabled={!asId || running || !steps.length}><Play aria-hidden="true" /> {running ? "Running…" : "Run test"}</button>
          {enabled ? (
            <>
              <button type="button" className="ad__btn" onClick={switchOff} disabled={pending}>Switch off</button>
              <button type="button" className="ad__btn ad__btn--primary" onClick={() => save("publish")} disabled={pending || blockers > 0 || !dirty}>{pending ? "Saving…" : "Update"}</button>
            </>
          ) : (
            <>
              <button type="button" className="ad__btn" onClick={() => save("draft")} disabled={pending || !dirty || nameBad}>Save draft</button>
              <button type="button" className="ad__btn ad__btn--primary" onClick={() => save("publish")} disabled={pending || blockers > 0}>{pending ? "Saving…" : "Publish"}</button>
            </>
          )}
          <button type="button" className="adWf__x" aria-label="More for this automation" aria-haspopup="menu" aria-expanded={menu?.kind === "more"}
            onClick={(e) => setMenu(menu?.kind === "more" ? null : { kind: "more", anchor: e.currentTarget })}><EllipsisVertical aria-hidden="true" /></button>
        </div>
      </div>

      {blockers > 0 ? (
        <div className="adWf__why" role="status">
          <TriangleAlert aria-hidden="true" />
          {!steps.length ? <span>Add your first step before you {enabled ? "update" : "publish"}.</span> : (
            <>
              <span>Fix {blockers === 1 ? "this" : `these ${blockers}`} before you {enabled ? "update" : "publish"}:</span>
              {nameBad ? <button type="button" onClick={() => root.current?.querySelector<HTMLInputElement>(".adWf__name input")?.focus()}>Name</button> : null}
              {triggerBad ? <button type="button" onClick={() => open("trig")}>Trigger</button> : null}
              {probs.map((x) => <button key={x.id} type="button" onClick={() => { open(x.id); focusNode(x.id); }}>{x.title}</button>)}
            </>
          )}
        </div>
      ) : null}
      {mode === "r" && p.results.reached === null ? (
        <div className="adWf__why" role="status" style={{ background: "var(--ad-tone-neutral)", color: "var(--ad-on-neutral)" }}>
          <span>Counts per step begin once migration 0048 is applied (Settings › System). Until then only the totals on the trigger are shown.</span>
        </div>
      ) : null}

      <div className="adWf__body">
        <div className="adWf__stage">
          <div ref={vp} className={`adWf__vp${panning ? " is-panning" : ""}`} data-lenis-prevent
            onPointerDown={panStart} onPointerMove={panMove} onPointerUp={panEnd} onPointerCancel={panEnd}>
            <div className="adWf__scale" style={{ width: g.width * z, height: g.height * z }}>
              <div className="adWf__world" style={{ width: g.width, height: g.height, transform: `scale(${z})`, transformOrigin: "0 0" }}>
                <svg className="adWf__svg" width={g.width} height={g.height} aria-hidden="true">
                  {g.edges.map((e, i) => <path key={i} d={e.d} className={hits.has(e.from) && e.to && hits.has(e.to) ? "is-hit" : undefined} />)}
                </svg>
                {g.items.map((it) => {
                  if (it.kind === "tag") return <span key={it.key} className={`adWf__tag adWf__tag--${it.branch}`} style={{ left: it.x, top: it.y }}>{it.branch === "yes" ? "Yes" : "No"}</span>;
                  if (it.kind === "add") {
                    return (
                      <button key={it.key} type="button" className="adWf__plus" style={{ left: it.x, top: it.y }} aria-label={it.label} aria-haspopup="menu"
                        aria-expanded={menu?.kind === "add" && menu.key === it.key}
                        onClick={(e) => setMenu(menu?.kind === "add" && menu.key === it.key ? null : { kind: "add", slot: it.slot, key: it.key, anchor: e.currentTarget })}>
                        <i><Plus aria-hidden="true" /></i>
                      </button>
                    );
                  }
                  const s = it.step;
                  const type = s ? s.type : "trigger";
                  const why = s ? stepProblem(s) : triggerBad ? "Choose the tag that starts it." : null;
                  const named = Boolean(s?.name?.trim());
                  const big = !s ? (meta.triggerKind === "tag_added" ? "A tag is added" : "Someone becomes a contact") : s.type === "stop" ? "Stop here" : named ? stepTitle(s) : stepSummary(s);
                  const sub = !s ? (meta.triggerKind === "tag_added" ? `Tag “${meta.triggerValue || "…"}”` : "Each new contact") : named && s.type !== "stop" ? stepSummary(s) : "";
                  const kicker = !s ? "Trigger" : s.type === "stop" ? "End" : TYPE_LABEL[s.type];
                  const count = mode === "r" ? (!s ? `${entered} entered` : p.results.reached ? `${p.results.reached[s.id] ?? 0} reached` : "") : "";
                  return (
                    <div key={it.id} data-node={it.id} className={`adWf__node${!s ? " adWf__node--trig" : ""}${s?.type === "stop" ? " adWf__node--stop" : ""}${sel === it.id ? " is-sel" : ""}${hits.has(it.id) ? " is-hit" : ""}`}
                      style={{ left: it.x, top: it.y, width: it.w, height: it.h }}>
                      {why ? <span className="adWf__warn" aria-hidden="true">!</span> : null}
                      <button type="button" className="adWf__main" aria-pressed={sel === it.id} onClick={() => open(it.id)}
                        aria-label={`${kicker}: ${big}${sub ? `. ${sub}` : ""}${why ? `. Needs attention: ${why}` : ""}`}>
                        <Tile type={type} />
                        <span className="adWf__txt"><small>{kicker}</small><b>{big}</b>{sub ? <i>{sub}</i> : null}</span>
                      </button>
                      {s ? (
                        <button type="button" className="adWf__dots" aria-label={`Menu for ${stepTitle(s)}`} aria-haspopup="menu" aria-expanded={menu?.kind === "node" && menu.id === s.id}
                          onClick={(e) => setMenu(menu?.kind === "node" && menu.id === s.id ? null : { kind: "node", id: s.id, anchor: e.currentTarget })}><EllipsisVertical aria-hidden="true" /></button>
                      ) : null}
                      {count ? <span className="adWf__count">{count}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {menu?.kind === "add" ? (
              <Menu host={vp} anchor={menu.anchor} label="Add a step" onClose={() => setMenu(null)}>
                <h3>Add a step</h3>
                {MENU.map((t) => {
                  const tooDeep = t === "if" && slotDepth(steps, menu.slot) + 1 > MAX_DEPTH;
                  return (
                    <button key={t} type="button" role="menuitem" disabled={!canAddMore || tooDeep} onClick={() => { const slot = menu.slot; setMenu(null); add(slot, t); }}>
                      <Tile type={t} />{t === "if" ? "Check a tag (Yes / No)" : TYPE_LABEL[t]}
                    </button>
                  );
                })}
                {!canAddMore ? <small>An automation can have {MAX_STEPS} steps at most.</small> : slotDepth(steps, menu.slot) + 1 > MAX_DEPTH ? <small>Yes/No checks can sit {MAX_DEPTH - 1} levels deep at most.</small> : null}
              </Menu>
            ) : null}
            {menu?.kind === "node" ? (
              <Menu host={vp} anchor={menu.anchor} label="Step menu" align="end" onClose={() => setMenu(null)}>
                <button type="button" role="menuitem" onClick={() => open(menu.id, "name")}><Pencil aria-hidden="true" />Rename</button>
                <button type="button" role="menuitem" onClick={() => { setMenu(null); duplicate(menu.id); }}><Copy aria-hidden="true" />Duplicate</button>
                <button type="button" role="menuitem" className="is-danger" onClick={() => { const id = menu.id; setMenu(null); void remove(id); }}><Trash2 aria-hidden="true" />Delete step</button>
              </Menu>
            ) : null}
          </div>

          <div className="adWf__ctl" role="group" aria-label="Canvas controls">
            <button type="button" onClick={() => zoom(-0.1)} aria-label="Zoom out"><Minus aria-hidden="true" /></button>
            <span role="status" aria-label="Zoom">{Math.round(z * 100)}%</span>
            <button type="button" onClick={() => zoom(0.1)} aria-label="Zoom in"><Plus aria-hidden="true" /></button>
            <button type="button" onClick={fit} aria-label="Fit to screen"><Maximize2 aria-hidden="true" /></button>
            <i aria-hidden="true" />
            <div className="adWf__seg" role="group" aria-label="View">
              <button type="button" aria-pressed={mode === "b"} onClick={() => setMode("b")}>Builder</button>
              <button type="button" aria-pressed={mode === "r"} onClick={() => setMode("r")}>Results</button>
            </div>
          </div>
        </div>

        <button type="button" className="adWf__scrim" aria-label="Close the panel" tabIndex={-1} onClick={closePanel} />
        <aside className="adWf__panel" aria-label="Step settings" role={narrow && hasPanel ? "dialog" : undefined} aria-modal={narrow && hasPanel ? true : undefined}>
          {sel === "trig" ? (
            <TriggerPanel key="trig" meta={meta} setMeta={setMetaPart} tags={p.tags} totals={p.totals} tab={tab} setTab={setTab} onClose={closePanel} initialFocus={focusPanel} />
          ) : selStep ? (
            <StepPanel key={selStep.id} step={selStep} tab={tab} setTab={setTab} tags={p.tags} results={p.results} initialFocus={focusPanel}
              onPatch={(change) => patch(selStep.id, change)} onDelete={() => void remove(selStep.id)} onClose={closePanel} />
          ) : null}
        </aside>
      </div>

      {log ? (
        <div className="adWf__log" aria-live="polite">
          <h3>Test run</h3>
          <p>{log.head}</p>
          {log.lines.map((l, i) => <div key={i} className={l.tone === "stop" ? "is-stop" : undefined}><i aria-hidden="true">{l.tone === "stop" ? "–" : "✓"}</i><span>{l.text}</span></div>)}
          {log.done ? <p><b>{log.done}</b> <button type="button" className="ad__btn" onClick={() => { setLog(null); setHits(new Set()); }}>Clear</button></p> : null}
        </div>
      ) : null}

      {menu?.kind === "more" ? (
        <Menu host={root} anchor={menu.anchor} label="Automation menu" align="end" onClose={() => setMenu(null)}>
          <button type="button" role="menuitem" className="is-danger" onClick={() => void destroy()}><Trash2 aria-hidden="true" />Delete automation</button>
        </Menu>
      ) : null}
    </div>
  );
}
