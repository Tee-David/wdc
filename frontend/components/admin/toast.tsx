"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

type Toast = { id: number; text: string; tone: "good" | "bad" };
const EVENT = "wdc:toast";

/** Show a toast from anywhere in the admin or the portal. */
export function toast(text: string, tone: Toast["tone"] = "good") {
  if (typeof window === "undefined" || !text) return;
  window.dispatchEvent(new CustomEvent<Omit<Toast, "id">>(EVENT, { detail: { text, tone } }));
}

/**
 * THE TOASTS (the owner's ask: a success says so, visibly, after every action).
 * One host per shell, at the foot of the screen and above the phone's tab bar.
 * Each stays four seconds, longer while the pointer or focus is on it, and has
 * a close button. Hidden from screen readers on purpose: the form that raised
 * it already announces the same words (components/admin/form.tsx), and saying
 * it twice is noise.
 */
export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  const next = useRef(0);
  const timers = useRef(new Map<number, number>());

  useEffect(() => {
    const on = (e: Event) => {
      const { text, tone } = (e as CustomEvent<Omit<Toast, "id">>).detail;
      const id = ++next.current;
      setItems((list) => [...list.slice(-2), { id, text, tone }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), 4000));
    };
    const all = timers.current;
    window.addEventListener(EVENT, on);
    return () => { window.removeEventListener(EVENT, on); all.forEach((t) => window.clearTimeout(t)); };
  }, []);

  function dismiss(id: number) {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((list) => list.filter((t) => t.id !== id));
  }
  const hold = (id: number) => window.clearTimeout(timers.current.get(id));
  const release = (id: number) => timers.current.set(id, window.setTimeout(() => dismiss(id), 2500));

  if (!items.length) return null;
  return (
    <div className="adToasts" aria-hidden="true">
      {items.map((t) => (
        <div key={t.id} className={`adToast adToast--${t.tone}`}
             onPointerEnter={() => hold(t.id)} onPointerLeave={() => release(t.id)}>
          {t.tone === "good" ? <CheckCircle2 /> : <CircleAlert />}
          <span>{t.text}</span>
          <button type="button" tabIndex={-1} className="adToast__x" onClick={() => dismiss(t.id)}><X /></button>
        </div>
      ))}
    </div>
  );
}
