"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ArrowDown, Copy, CornerUpLeft, X } from "lucide-react";
import { toast } from "./toast";

/**
 * A CONVERSATION THAT BEHAVES LIKE A CHAT APP. Swipe a message to the right
 * (or use its reply arrow, or hold it) to answer that message; the reply
 * carries a quote of it, and tapping the quote takes you back to the original.
 * When you have scrolled up, a button brings you back to the newest message.
 *
 * The lines arrive from the server with everything already worked out (day,
 * time, tag), so this only adds the gestures. What the reply points at is sent
 * as `replyTo` with the form, and the server checks it belongs to the same
 * conversation before saving it.
 */
export type ThreadLine = {
  id: string; who: string; mine: boolean; at: string; time: string; day?: string;
  body: string; initials: string; tag?: { text: string; tone: "live" | "flat" };
  /** Only on a project note: a reply must keep the original's visibility. */
  visibility?: "client" | "internal";
  replyTo?: string | null;
};
type Picked = { id: string; who: string; body: string; visibility?: "client" | "internal" };

const Ctx = createContext<{ reply: Picked | null; setReply: (p: Picked | null) => void }>({ reply: null, setReply: () => {} });
export const useReply = () => useContext(Ctx);

export function ThreadProvider({ children }: { children: React.ReactNode }) {
  const [reply, setReply] = useState<Picked | null>(null);
  return <Ctx.Provider value={{ reply, setReply }}>{children}</Ctx.Provider>;
}

const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const SWIPE = 56;

function Bubble({ m, quoted, onReply, onJump }: { m: ThreadLine; quoted: ThreadLine | null | undefined; onReply: () => void; onJump: (id: string) => void }) {
  const row = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; on: boolean; id: number } | null>(null);
  const hold = useRef<number>(0);
  const [dx, setDx] = useState(0);
  const [menu, setMenu] = useState(false);

  /* A touch swipe to the right answers the message. A mostly vertical move is
     a scroll and is left alone; the bubble only follows a sideways drag. */
  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    drag.current = { x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
    hold.current = window.setTimeout(() => { drag.current = null; setMenu(true); navigator.vibrate?.(8); }, 520);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const x = e.clientX - d.x, y = e.clientY - d.y;
    if (Math.abs(x) > 6 || Math.abs(y) > 6) clearTimeout(hold.current);
    if (!d.on) {
      if (Math.abs(y) > 10 && Math.abs(y) > Math.abs(x)) { drag.current = null; return; }
      if (x > 10) { d.on = true; row.current?.setPointerCapture(d.id); }
    }
    if (d.on) setDx(Math.max(0, Math.min(84, x)));
  };
  const up = () => {
    clearTimeout(hold.current);
    if (drag.current?.on && dx >= SWIPE) onReply();
    drag.current = null;
    setDx(0);
  };
  useEffect(() => () => clearTimeout(hold.current), []);

  const copy = () => {
    void navigator.clipboard?.writeText(m.body).then(() => toast("Copied the message."), () => toast("Copying is blocked in this browser.", "bad"));
    setMenu(false);
  };

  return (
    <div id={`m-${m.id}`} className={`adConv__msg adTh__msg${m.mine ? " is-mine" : ""}`}>
      <span className={`adConv__av ad__av${m.mine ? "" : " ad__av--live"}`} aria-hidden="true">{m.initials}</span>
      <div className="adTh__lane">
        <span className="adTh__swipeIc" aria-hidden="true" style={{ opacity: Math.min(1, dx / SWIPE), transform: `scale(${0.6 + Math.min(1, dx / SWIPE) * 0.4})` }}><CornerUpLeft /></span>
        <div ref={row} className={`adConv__bubble adTh__bubble${dx ? " is-dragging" : ""}`} style={dx ? { transform: `translateX(${dx}px)` } : undefined}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => { if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType !== "mouse") e.preventDefault(); }}>
          {m.replyTo ? (
            <button type="button" className="adTh__quote" onClick={() => quoted && onJump(quoted.id)} disabled={!quoted}
              aria-label={quoted ? `Replying to ${quoted.mine ? "you" : quoted.who}: ${clip(quoted.body, 80)}. Show the original.` : "Replying to an earlier message"}>
              <b>{quoted ? (quoted.mine ? "You" : quoted.who) : "Earlier message"}</b>
              <span>{quoted ? clip(quoted.body) : "Further up the conversation."}</span>
            </button>
          ) : null}
          <p className="adConv__who"><b>{m.mine ? "You" : m.who}</b> <time dateTime={m.at}>{m.time}</time>{m.tag ? <span className={`ad__pill ad__pill--${m.tag.tone} adMx__vis`}>{m.tag.text}</span> : null}</p>
          <p className="adConv__body">{m.body}</p>
        </div>
        <button type="button" className="adTh__replyBtn" onClick={onReply} aria-label={`Reply to ${m.mine ? "your message" : m.who}`} title="Reply"><CornerUpLeft aria-hidden="true" /></button>
      </div>
      {menu ? (
        <div className="adTh__menu" role="menu" aria-label="Message actions">
          <button type="button" role="menuitem" onClick={() => { setMenu(false); onReply(); }}><CornerUpLeft aria-hidden="true" />Reply</button>
          <button type="button" role="menuitem" onClick={copy}><Copy aria-hidden="true" />Copy text</button>
          <button type="button" role="menuitem" className="adTh__menuX" onClick={() => setMenu(false)} aria-label="Close the actions"><X aria-hidden="true" /></button>
        </div>
      ) : null}
    </div>
  );
}

/** The message list, with day separators, quotes, and the jump to the newest message. */
export function ThreadLines({ lines, label }: { lines: ThreadLine[]; label: string }) {
  const { setReply } = useReply();
  const end = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  const byId = new Map(lines.map((l) => [l.id, l]));

  /* The newest message is "in view" when the marker after it is. Works whether
     the thread scrolls in its own box (wide screens) or with the page (phones). */
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAway(!e?.isIntersecting), { rootMargin: "0px 0px 120px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const jump = useCallback((id: string) => {
    const el = document.getElementById(`m-${id}`);
    if (!el) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    el.classList.remove("is-flash");
    void el.offsetWidth;
    el.classList.add("is-flash");
    window.setTimeout(() => el.classList.remove("is-flash"), 1600);
  }, []);

  const pick = (m: ThreadLine) => {
    setReply({ id: m.id, who: m.mine ? "You" : m.who, body: m.body, visibility: m.visibility });
    document.querySelector<HTMLTextAreaElement>(".adMx__reply textarea")?.focus({ preventScroll: true });
  };

  return (
    <div className="adTh">
      <ol className="adConv" aria-label={label}>
        {lines.map((m) => (
          <li key={m.id} className="adMx__item">
            {m.day ? <p className="adMx__day"><span>{m.day}</span></p> : null}
            <Bubble m={m} quoted={m.replyTo ? byId.get(m.replyTo) ?? null : undefined} onReply={() => pick(m)} onJump={jump} />
          </li>
        ))}
      </ol>
      <div ref={end} className="adTh__end" aria-hidden="true" />
      {away ? (
        <button type="button" className="adTh__down" onClick={() => end.current?.scrollIntoView({ block: "end", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} aria-label="Go to the newest message">
          <ArrowDown aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/** Sits inside a reply form: what you are answering, the hidden `replyTo`, and a cross to stop replying. */
export function ReplyingTo() {
  const { reply, setReply } = useReply();
  if (!reply) return null;
  return (
    <div className="adTh__replying">
      <input type="hidden" name="replyTo" value={reply.id} />
      <span className="adTh__replyingTxt"><b>Replying to {reply.who}</b><span>{clip(reply.body, 120)}</span></span>
      <button type="button" className="adTh__replyingX" onClick={() => setReply(null)} aria-label="Stop replying to this message"><X aria-hidden="true" /></button>
    </div>
  );
}
