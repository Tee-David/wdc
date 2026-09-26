"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

type ToastAction = { label: string; run: () => void };
type Toast = { id: number; text: string; tone: "good" | "bad"; action?: ToastAction };
const EVENT = "wdc:toast";

/** Show a toast from anywhere in the admin or the portal. */
export function toast(text: string, tone: Toast["tone"] = "good", action?: ToastAction) {
  if (typeof window === "undefined" || !text) return;
  window.dispatchEvent(new CustomEvent<Omit<Toast, "id">>(EVENT, { detail: { text, tone, action } }));
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
      const { text, tone, action } = (e as CustomEvent<Omit<Toast, "id">>).detail;
      const id = ++next.current;
      setItems((list) => [...list.slice(-2), { id, text, tone, action }]);
      /* Longer when it offers Undo: there has to be time to reach it. */
      timers.current.set(id, window.setTimeout(() => dismiss(id), action ? 8000 : 4000));
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
  const plain = items.filter((t) => !t.action);
  const acting = items.filter((t) => t.action);
  return (
    <>
    {/* A toast with an action (Undo) is the only record of a way back, so it
        is announced, and its button is reachable by keyboard. */}
    {acting.length ? (
      <div className="adToasts adToasts--acting" role="status">
        {acting.map((t) => (
          <div key={t.id} className={`adToast adToast--${t.tone}`}
               onPointerEnter={() => hold(t.id)} onPointerLeave={() => release(t.id)}
               onFocus={() => hold(t.id)} onBlur={() => release(t.id)}>
            <CheckCircle2 aria-hidden="true" />
            <span>{t.text}</span>
            <span className="adToast__acts">
              <button type="button" className="adToast__act" onClick={() => { t.action!.run(); dismiss(t.id); }}>{t.action!.label}</button>
              <button type="button" className="adToast__x" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X aria-hidden="true" /></button>
            </span>
          </div>
        ))}
      </div>
    ) : null}
    <div className="adToasts" aria-hidden="true">
      {plain.map((t) => (
        <div key={t.id} className={`adToast adToast--${t.tone}`}
             onPointerEnter={() => hold(t.id)} onPointerLeave={() => release(t.id)}>
          {t.tone === "good" ? <CheckCircle2 /> : <CircleAlert />}
          <span>{t.text}</span>
          <button type="button" tabIndex={-1} className="adToast__x" onClick={() => dismiss(t.id)}><X /></button>
        </div>
      ))}
    </div>
    </>
  );
}
