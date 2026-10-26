"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowRight, Check, Clock, Users } from "lucide-react";
import Confetti from "@/components/onboarding/confetti";
import "./deck.css";

/**
 * THE FOCUS DECK: what needs you, one card at a time.
 *
 * Every page opens with the question "what needs me here". The answer is a
 * deck, not a table: the first card is the most urgent thing, and the others
 * wait behind it. One primary (the deck's own orange, green on hover), one
 * secondary, then Snooze, Hand over and Open details. Pressing an action stamps
 * the card from the button that was pressed and sends it away in a direction
 * that means something, and the next card rises. Clearing the deck plays the
 * confetti and shows what is next.
 *
 * The page decides what is on the deck, from persisted truth. This component
 * only decides how a card leaves. A primary with `run` is a server action that
 * does the thing (and must be safe to run twice); a primary with `href` opens
 * the place where it is done and does not clear the card.
 *
 * KEYBOARD: focus the card, then D for done and S for snooze.
 * SNOOZE is kept on this device and expires by itself, so a snoozed card comes
 * back to this deck without anyone remembering to bring it back.
 */

export type DeckTone = "bad" | "warn" | "live" | "brand" | "neutral";

export type DeckItem = {
  id: string;
  /** "Money", "Lead", "Approval": what kind of thing this is. */
  kind: string;
  /** "12 days late", "Call at 11:00". */
  urgency?: string;
  tone?: DeckTone;
  /** The project or invoice it belongs to, top right of the card. */
  label?: string;
  title: string;
  body: string;
  facts?: { k: string; v: string }[];
  /** One line on why this is on the deck now. */
  why?: string;
  primary: { label: string; href?: string; run?: () => Promise<{ ok: boolean; message?: string } | void> };
  secondary?: { label: string; href: string };
  handOver?: { label?: string; href: string };
  open?: string;
};

const SNOOZE: { label: string; hours: number; hint: string }[] = [
  { label: "In 1 hour", hours: 1, hint: "An hour from now" },
  { label: "This afternoon", hours: 4, hint: "Four hours from now" },
  { label: "Tomorrow", hours: 20, hint: "Tomorrow morning" },
  { label: "Next week", hours: 24 * 5, hint: "In five days" },
];

const TONE: Record<DeckTone, string> = {
  bad: "var(--ad-tone-bad)",
  warn: "var(--ad-tone-warn)",
  live: "var(--ad-tone-live)",
  brand: "var(--ad-tone-brand)",
  neutral: "var(--ad-tone-neutral)",
};

/** When a snooze ends. A plain function outside the component so the clock is read only when a button is pressed. */
function wakeAt(hours: number) { return Date.now() + hours * 3_600_000; }

type Leaving = { id: string; how: "done" | "snooze"; x: number; y: number };

export function Deck({
  id, title, items, emptyTitle, emptyBody, emptyNext,
}: {
  /** Names this deck, so snoozes on one page do not hide cards on another. */
  id: string;
  title: string;
  items: DeckItem[];
  emptyTitle: string;
  emptyBody: string;
  emptyNext?: { label: string; href: string };
}) {
  const router = useRouter();
  const key = `wdc:deck:${id}`;
  const [cleared, setCleared] = useState<Record<string, true>>({});
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [menu, setMenu] = useState(false);
  const snoozeRef = useRef<HTMLDivElement>(null);
  /* The menu closes on a press outside it and on Esc, like every other menu. */
  useEffect(() => {
    if (!menu) return;
    const out = (e: PointerEvent) => { if (!snoozeRef.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); snoozeRef.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [menu]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  /* How many cards the deck opened with, for the progress strip. */
  const [startN] = useState(items.length);
  const cardRef = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);

  /* Snoozes live on this device and expire by themselves. The snapshot is the
     list of ids still asleep, so it only changes when one falls asleep or wakes. */
  const event = `wdc:deck:${id}`;
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("storage", notify);
    window.addEventListener(event, notify);
    return () => { window.removeEventListener("storage", notify); window.removeEventListener(event, notify); };
  }, [event]);
  const read = useCallback(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, number>;
      const now = Date.now();
      return JSON.stringify(Object.keys(saved).filter((k) => saved[k] > now).sort());
    } catch { return "[]"; }
  }, [key]);
  const asleepRaw = useSyncExternalStore(subscribe, read, () => "[]");
  const asleep = useMemo(() => new Set<string>(JSON.parse(asleepRaw) as string[]), [asleepRaw]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const queue = useMemo(() => items.filter((i) => !cleared[i.id] && !asleep.has(i.id)), [items, cleared, asleep]);
  const top = queue[0];
  const handled = startN - queue.length;

  const calmNow = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, calmNow() ? 0 : ms)); };

  const stamp = (e: MouseEvent | null, itemId: string, how: "done" | "snooze") => {
    const card = cardRef.current?.getBoundingClientRect();
    const b = e?.currentTarget instanceof HTMLElement ? e.currentTarget.getBoundingClientRect() : null;
    const x = card && b ? ((b.left + b.width / 2 - card.left) / card.width) * 100 : 50;
    const y = card && b ? ((b.top + b.height / 2 - card.top) / card.height) * 100 : 80;
    setLeaving({ id: itemId, how, x, y });
  };

  const finish = useCallback((itemId: string) => {
    setLeaving(null);
    setCleared((c) => ({ ...c, [itemId]: true }));
  }, []);

  /* The last card leaving is the moment the deck is cleared. */
  useEffect(() => {
    if (!top && startN > 0 && handled > 0) {
      const t = window.setTimeout(() => setCelebrate(true), 200);
      return () => window.clearTimeout(t);
    }
  }, [top, handled, startN]);

  const done = async (e: MouseEvent | null, item: DeckItem) => {
    if (!item.primary.run || busy || leaving) return;
    setBusy(true); setNote("");
    try {
      const r = await item.primary.run();
      if (r && r.ok === false) { setNote(r.message ?? "That did not go through. Nothing was changed."); return; }
      stamp(e, item.id, "done");
      later(() => { finish(item.id); router.refresh(); }, 780);
    } catch {
      setNote("That did not go through. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  const snooze = (e: MouseEvent | null, item: DeckItem, hours: number, label: string) => {
    if (leaving) return;
    setMenu(false);
    const until = wakeAt(hours);
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, number>;
      window.localStorage.setItem(key, JSON.stringify({ ...saved, [item.id]: until }));
    } catch { /* a blocked store only means snoozes do not survive a reload */ }
    stamp(e, item.id, "snooze");
    setNote(`Snoozed. It comes back ${label.toLowerCase()}.`);
    later(() => { setLeaving(null); window.dispatchEvent(new Event(event)); }, 520);
  };

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (!top || e.target !== e.currentTarget || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.toLowerCase() === "d" && top.primary.run) { e.preventDefault(); void done(null, top); }
    if (e.key.toLowerCase() === "s") { e.preventDefault(); snooze(null, top, 20, "tomorrow"); }
  };

  const segs = Math.min(8, Math.max(startN, 1));
  const doneSegs = Math.min(segs, Math.round((handled / Math.max(startN, 1)) * segs));

  return (
    <section className="adDeck" aria-label={title} data-tour="deck">
      <div className="adDeck__head">
        <h2>{title}</h2>
        {startN > 0 ? (
          <>
            <span className="adDeck__strip" role="img" aria-label={`${handled} of ${startN} handled`}>
              {Array.from({ length: segs }, (_, i) => <span key={i} className={i < doneSegs ? "on" : ""} />)}
            </span>
            <span className="adDeck__count ad__num">{queue.length ? `${queue.length} ${queue.length === 1 ? "thing needs" : "things need"} you` : "All handled"}</span>
          </>
        ) : null}
        <span className="adDeck__keys">Focus the card: D done, S snooze</span>
      </div>

      {top ? (
        <div className="adDeck__stack">
          {queue.length > 1 ? <span className="adDeck__ghost" aria-hidden="true" /> : null}
          {queue.length > 2 ? <span className="adDeck__ghost adDeck__ghost--2" aria-hidden="true" /> : null}
          <article
            key={top.id}
            ref={cardRef}
            className={`adDeck__card${leaving ? ` is-${leaving.how}` : ""}`}
            tabIndex={0}
            onKeyDown={onKey}
            aria-label={`${top.kind}: ${top.title}`}
          >
            <div className="adDeck__tags">
              <span className="adDeck__tag adDeck__tag--kind">{top.kind}</span>
              {top.urgency ? <span className="adDeck__tag" style={{ background: TONE[top.tone ?? "neutral"] }}>{top.urgency}</span> : null}
              {top.label ? <span className="adDeck__label ad__num">{top.label}</span> : null}
            </div>
            <div className="adDeck__text">
              <h3>{top.title}</h3>
              <p>{top.body}</p>
            </div>
            {top.facts?.length ? (
              <dl className="adDeck__facts">
                {top.facts.slice(0, 3).map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
              </dl>
            ) : null}
            {top.why ? <p className="adDeck__why"><Clock aria-hidden="true" />{top.why}</p> : null}
            <div className="adDeck__acts">
              {top.primary.href ? (
                <Link className="adDeck__btn adDeck__btn--act" href={top.primary.href}>{top.primary.label}<ArrowRight aria-hidden="true" /></Link>
              ) : (
                <button type="button" className="adDeck__btn adDeck__btn--act" disabled={busy || !!leaving} onClick={(e) => done(e, top)}>
                  <Check aria-hidden="true" />{top.primary.label}
                </button>
              )}
              {top.secondary ? <Link className="adDeck__btn" href={top.secondary.href}>{top.secondary.label}</Link> : null}
              <span className="adDeck__sp" />
              <div className="adDeck__tools">
                <div className="adDeck__snooze" ref={snoozeRef}>
                  <button type="button" className="adDeck__btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><Clock aria-hidden="true" />Snooze</button>
                  {menu ? (
                    <div className="adDeck__menu" role="menu" aria-label="Bring it back">
                      {SNOOZE.map((s) => (
                        <button key={s.label} type="button" role="menuitem" onClick={(e) => snooze(e, top, s.hours, s.label)}>
                          <span>{s.label}</span><small>{s.hint}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {top.handOver ? <Link className="adDeck__btn" href={top.handOver.href}><Users aria-hidden="true" />{top.handOver.label ?? "Hand over"}</Link> : null}
                {top.open ? <Link className="adDeck__btn adDeck__btn--quiet" href={top.open}>Open details</Link> : null}
              </div>
            </div>
            {note ? <p className="adDeck__note" role="status">{note}</p> : null}
            {leaving ? (
              <span className="adDeck__stamp" style={{ "--cx": `${leaving.x}%`, "--cy": `${leaving.y}%`, "--st": leaving.how === "done" ? "var(--ad-tone-good)" : "var(--ad-tone-neutral)" } as CSSProperties} aria-hidden="true">
                <span className="adDeck__ring" />
                <span className="adDeck__stampIn">
                  {leaving.how === "done" ? <svg viewBox="0 0 24 24" width="46" height="46"><path d="M5 12.5l4.5 4.5L19 7" pathLength="1" /></svg> : <Clock aria-hidden="true" width={44} height={44} />}
                  <b>{leaving.how === "done" ? "Done" : "Snoozed"}</b>
                </span>
              </span>
            ) : null}
          </article>
        </div>
      ) : (
        <div className="adDeck__empty">
          {celebrate ? <Confetti /> : null}
          <span className="adDeck__emptyIc"><Check aria-hidden="true" /></span>
          <h3>{emptyTitle}</h3>
          <p>{emptyBody}</p>
          {emptyNext ? <Link className="adDeck__btn adDeck__btn--light" href={emptyNext.href}>{emptyNext.label}<ArrowRight aria-hidden="true" /></Link> : null}
          {asleep.size || Object.keys(cleared).length ? (
            <button type="button" className="adDeck__btn adDeck__btn--quiet" onClick={() => { setCleared({}); setCelebrate(false); try { window.localStorage.removeItem(key); } catch { /* see above */ } window.dispatchEvent(new Event(event)); }}>Bring everything back</button>
          ) : null}
        </div>
      )}
    </section>
  );
}
