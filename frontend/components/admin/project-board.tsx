"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, GripVertical } from "lucide-react";
import type { Attention, Health, Project, Stage } from "@/lib/admin/types";
import { moveOnBoard } from "@/lib/admin/actions";
import { AttentionPills, HealthPill } from "./bits";
import { ProjectMenu } from "./row-actions";
import { toast } from "./toast";

export type BoardCard = {
  project: Project; clientName?: string; clientInitials?: string; service?: string;
  attention: Attention[]; due: string; ownerInitials?: string;
};
export type BoardColumn = { stage: Stage; dot: number; ids: string[] };

type Drag = {
  id: string; pointerId: number; x0: number; y0: number; started: boolean; touch: boolean;
  timer: number; rect: DOMRect; el: HTMLElement; x: number; y: number;
};

/** The click that ends a drag is not a click on what was under it. */
function swallowClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  window.removeEventListener("click", swallowClick, true);
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * THE PROJECTS BOARD, DRAGGABLE (the owner's ask: drag between stages and
 * reorder, smoothly). Pointer events rather than HTML drag-and-drop, so one
 * path serves a mouse, a pen and a finger:
 *
 *  - A mouse drags after it moves 5px, so a click on the title still opens it.
 *  - A finger drags after a 280ms press, so a swipe still scrolls the page and
 *    the board, and a card is never picked up by accident.
 *  - The keyboard: the grip button picks the card up, arrows move it between
 *    and within columns, Enter or Space puts it down, Escape puts it back.
 *
 * The card follows the pointer as a floating copy moved by transform in a
 * frame callback (no React render per move); the cards around it slide to
 * make room (FLIP, transform only). The drop is saved by `moveOnBoard` (the
 * same stage event and client email as the stage menu) and undone if refused.
 */
export function ProjectBoard({ columns, cards }: { columns: BoardColumn[]; cards: Record<string, BoardCard> }) {
  const router = useRouter();
  const [order, setOrder] = useState<Record<string, string[]>>(() => Object.fromEntries(columns.map((c) => [c.stage, c.ids])));
  const [dragId, setDragId] = useState<string | null>(null);
  const [kbd, setKbd] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const board = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const rects = useRef<Map<string, DOMRect> | null>(null);
  const before = useRef<Record<string, string[]>>(order);
  const orderRef = useRef(order);
  const frame = useRef(0);
  const [lift, setLift] = useState<{ id: string; rect: DOMRect } | null>(null);
  useLayoutEffect(() => { orderRef.current = order; }, [order]);

  const stageOf = (id: string, o = orderRef.current) => Object.keys(o).find((s) => o[s].includes(id)) as Stage | undefined;
  const titleOf = (id: string) => cards[id]?.project.title ?? "The card";

  /* FLIP: remember where every card was, change the order, then slide each
     from its old place to its new one. */
  const snapshot = () => {
    const m = new Map<string, DOMRect>();
    board.current?.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => m.set(el.dataset.card!, el.getBoundingClientRect()));
    rects.current = m;
  };
  const reorder = useCallback((next: Record<string, string[]>) => { snapshot(); orderRef.current = next; setOrder(next); }, []);
  useLayoutEffect(() => {
    const was = rects.current;
    rects.current = null;
    if (!was || reduced()) return;
    board.current?.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
      const a = was.get(el.dataset.card!);
      if (!a) return;
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: 200, easing: "cubic-bezier(.2, .8, .2, 1)" });
    });
  }, [order]);

  /* The keyboard's card keeps focus as it moves between columns. */
  useLayoutEffect(() => {
    if (kbd) board.current?.querySelector<HTMLElement>(`[data-grip="${kbd}"]`)?.focus({ preventScroll: false });
  }, [kbd, order]);

  const place = (id: string, stage: string, index: number) => {
    const o = orderRef.current;
    const next: Record<string, string[]> = {};
    for (const s of Object.keys(o)) next[s] = o[s].filter((x) => x !== id);
    const list = next[stage] ?? [];
    list.splice(Math.max(0, Math.min(index, list.length)), 0, id);
    next[stage] = list;
    const same = Object.keys(o).every((s) => o[s].join() === next[s].join());
    if (!same) reorder(next);
  };

  const commit = async (id: string) => {
    const stage = stageOf(id);
    const from = stageOf(id, before.current);
    if (!stage) return;
    const unchanged = from === stage && before.current[stage].join() === orderRef.current[stage].join();
    if (unchanged) return;
    setSaid(`${titleOf(id)} is now in ${stage}.`);
    const r = await moveOnBoard({ id, stage, order: orderRef.current[stage] }).catch(() => null);
    if (!r?.ok) {
      reorder(before.current);
      toast(r?.message ?? "That move could not be saved. It has been put back.", "bad");
      return;
    }
    if (from !== stage) toast(r.message ?? `Moved to ${stage}.`);
    router.refresh();
  };

  /* -------------------------------------------------------- pointer drag */

  const target = (x: number, y: number) => {
    const col = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-stage]");
    if (!col) return null;
    const stage = col.dataset.stage!;
    const others = [...col.querySelectorAll<HTMLElement>("[data-card]")].filter((el) => el.dataset.card !== drag.current?.id);
    let index = others.length;
    for (let i = 0; i < others.length; i++) {
      const r = others[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) { index = i; break; }
    }
    return { stage, index };
  };

  const tick = () => {
    frame.current = 0;
    const d = drag.current;
    if (!d?.started) return;
    if (ghost.current) ghost.current.style.transform = `translate(${d.x - d.x0}px, ${d.y - d.y0}px) rotate(1.5deg)`;
    const t = target(d.x, d.y);
    board.current?.querySelectorAll("[data-stage]").forEach((c) => c.classList.toggle("is-over", (c as HTMLElement).dataset.stage === t?.stage));
    if (t) place(d.id, t.stage, t.index);
    /* Near an edge, the board and the page scroll themselves. */
    const b = board.current?.getBoundingClientRect();
    let again = false;
    if (b) {
      if (d.x < b.left + 48) { board.current!.scrollLeft -= 14; again = true; }
      else if (d.x > b.right - 48) { board.current!.scrollLeft += 14; again = true; }
    }
    if (d.y < 64) { window.scrollBy(0, -12); again = true; }
    else if (d.y > window.innerHeight - 64) { window.scrollBy(0, 12); again = true; }
    if (again) frame.current = requestAnimationFrame(tick);
  };
  const schedule = () => { if (!frame.current) frame.current = requestAnimationFrame(tick); };

  const noScroll = useCallback((e: TouchEvent) => { if (drag.current?.started) e.preventDefault(); }, []);

  const start = (d: Drag) => {
    d.started = true;
    before.current = orderRef.current;
    setDragId(d.id);
    setLift({ id: d.id, rect: d.rect });
    document.documentElement.classList.add("is-dragging");
    try { d.el.setPointerCapture(d.pointerId); } catch { /* already released */ }
    if (d.touch) navigator.vibrate?.(8);
    setSaid(`Picked up ${titleOf(d.id)}.`);
    schedule();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, id: string) => {
    if (e.button !== 0 || kbd) return;
    if ((e.target as HTMLElement).closest("button, [role=menu], input, select, textarea")) return;
    const el = e.currentTarget;
    const d: Drag = {
      id, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      started: false, touch: e.pointerType !== "mouse", timer: 0, rect: el.getBoundingClientRect(), el,
    };
    drag.current = d;
    if (d.touch) d.timer = window.setTimeout(() => { if (drag.current === d) start(d); }, 280);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      d.x = e.clientX; d.y = e.clientY;
      const far = Math.hypot(d.x - d.x0, d.y - d.y0);
      if (!d.started) {
        if (d.touch) { if (far > 8) { clearTimeout(d.timer); drag.current = null; } return; }
        if (far < 5) return;
        start(d);
      }
      schedule();
    };
    const end = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      clearTimeout(d.timer);
      drag.current = null;
      cancelAnimationFrame(frame.current); frame.current = 0;
      if (!d.started) return;
      document.documentElement.classList.remove("is-dragging");
      board.current?.querySelectorAll(".is-over").forEach((c) => c.classList.remove("is-over"));
      /* The click that ends a drag is not a click on the title. */
      window.addEventListener("click", swallowClick, true);
      window.setTimeout(() => window.removeEventListener("click", swallowClick, true), 0);
      setLift(null);
      if (e.type === "pointercancel") { reorder(before.current); setDragId(null); return; }
      setDragId(null);
      void commit(d.id);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    document.addEventListener("touchmove", noScroll, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      document.removeEventListener("touchmove", noScroll);
      cancelAnimationFrame(frame.current);
    };
  });

  /* ------------------------------------------------------------ keyboard */

  const onGripKey = (e: React.KeyboardEvent, id: string) => {
    const o = orderRef.current;
    const stage = stageOf(id);
    if (!stage) return;
    const stages = columns.map((c) => c.stage);
    const at = o[stage].indexOf(id);
    if (!kbd) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        before.current = o;
        setKbd(id);
        setSaid(`Picked up ${titleOf(id)} in ${stage}. Arrow keys move it, Enter puts it down, Escape cancels.`);
      }
      return;
    }
    if (kbd !== id) return;
    const col = stages.indexOf(stage);
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const to = stages[col + (e.key === "ArrowLeft" ? -1 : 1)];
      if (!to) return;
      place(id, to, Math.min(at, o[to].length));
      setSaid(`${to}, position ${Math.min(at, o[to].length) + 1} of ${o[to].length + 1}.`);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const to = at + (e.key === "ArrowUp" ? -1 : 1);
      if (to < 0 || to >= o[stage].length) return;
      place(id, stage, to);
      setSaid(`${stage}, position ${to + 1} of ${o[stage].length}.`);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setKbd(null);
      void commit(id);
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      setKbd(null);
      reorder(before.current);
      setSaid(`${titleOf(id)} put back.`);
    }
  };


  return (
    <>
      <div ref={board} className={`ad__board${dragId || kbd ? " is-moving" : ""}`} data-lenis-prevent>
        {columns.map((c) => {
          const ids = order[c.stage] ?? [];
          return (
            <section key={c.stage} className="ad__kcol" data-stage={c.stage} aria-label={`${c.stage}, ${ids.length}`}>
              <header className="ad__kcolH">
                <span className={`ad__kdot ad__kdot--${c.dot}`} aria-hidden="true" />
                <h2>{c.stage}</h2>
                <span className="ad__tabN">{ids.length}</span>
              </header>
              {ids.map((id) => (
                <article key={id} data-card={id}
                  className={`ad__kcard${dragId === id ? " is-placeholder" : ""}${kbd === id ? " is-lifted" : ""}`}
                  onPointerDown={(e) => onPointerDown(e, id)}>
                  <Card card={cards[id]} grip={
                    <button type="button" className="ad__kgrip" data-grip={id}
                      aria-label={`Move ${cards[id].project.title}`} aria-pressed={kbd === id}
                      aria-describedby="board-help" onKeyDown={(e) => onGripKey(e, id)}
                      onBlur={() => { if (kbd === id) { setKbd(null); reorder(before.current); } }}>
                      <GripVertical aria-hidden="true" />
                    </button>
                  } />
                </article>
              ))}
              {!ids.length ? <p className="ad__kempty">Drop a card here</p> : null}
            </section>
          );
        })}
      </div>
      {lift ? (
        <div ref={ghost} className="ad__kcard ad__kghost" aria-hidden="true"
          style={{ left: lift.rect.left, top: lift.rect.top, width: lift.rect.width }}>
          <Card card={cards[lift.id]} />
        </div>
      ) : null}
      <p id="board-help" className="ad__sr">Drag a card, or press Space on its grip and use the arrow keys, to change its stage or order.</p>
      <p className="ad__sr" aria-live="assertive">{said}</p>
    </>
  );
}

function Card({ card, grip }: { card: BoardCard; grip?: React.ReactNode }) {
  const p = card.project;
  return (
    <>
      <div className="ad__kcardTags">
        {grip}
        {card.service ? <span className="ad__pill ad__pill--flat">{card.service}</span> : null}
        <HealthPill health={p.health as Health} />
        {grip ? <span className="ad__kcardMenu"><ProjectMenu project={p} clientName={card.clientName} /></span> : null}
      </div>
      <Link href={`/admin/projects/${p.id}`} className="ad__kcardTitle" draggable={false}><b>{p.title}</b></Link>
      {card.clientName ? (
        <span className="ad__who ad__kcardWho">
          <span className="ad__av ad__av--sm" aria-hidden="true">{card.clientInitials}</span>
          <small>{card.clientName}</small>
        </span>
      ) : null}
      <AttentionPills items={card.attention} except={p.health} />
      <div className="ad__kcardFoot">
        <span className="ad__dim"><CalendarDays aria-hidden="true" />{card.due}</span>
        {p.owner ? <span className="ad__av ad__av--sm ad__av--good" title={`Owner: ${p.owner}`} aria-label={`Owner: ${p.owner}`}>{card.ownerInitials}</span> : null}
      </div>
    </>
  );
}
