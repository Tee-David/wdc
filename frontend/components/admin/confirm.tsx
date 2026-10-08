"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "./dialog";

/**
 * ASK BEFORE DOING SOMETHING THAT MATTERS (the owner's ask: double
 * confirmation for sensitive actions, across the admin and the portal).
 *
 * `ask(question)` opens one styled dialog and resolves true or false. It
 * replaces `window.confirm`, which could not say which record it meant, could
 * not be styled, and looked like the browser rather than the tool.
 *
 * The question is written the way the call sites already wrote it: "Delete
 * INV-2026-004? It has not been issued, so nothing is lost but the typing."
 * The first sentence becomes the title, the rest the explanation, and its
 * first word the button ("Delete"), so the button says what it does instead of
 * "OK". Destructive verbs get the danger tone. Anything that says it cannot be
 * undone asks twice: the button stays locked until "I understand" is ticked.
 *
 * Cancel is the default focus, Escape and the backdrop cancel, and nothing
 * happens until the second press.
 */

type Ask = { title: string; body: string; verb: string; danger: boolean; permanent: boolean };
const EVENT = "wdc:confirm";
const DANGER = /^(delete|remove|deactivate|reverse|withdraw|unlink|archive|close|void|cancel|sign|take|discard|reset|put back|move everything|trash|unpublish|make .* staff|revoke|clear)/i;
const PERMANENT = /cannot be undone|for good|not kept|permanently|can't be undone/i;

export function parseQuestion(text: string, verb?: string): Ask {
  const m = text.match(/^([^]+?\?)\s*([^]*)$/);
  const title = (m ? m[1] : text).trim();
  const body = (m ? m[2] : "").trim();
  const first = title.replace(/\?$/, "").split(/\s+/)[0] ?? "Continue";
  const word = verb ?? (/^(make|put|move|take|sign)$/i.test(first) ? title.replace(/\?$/, "").split(/\s+/).slice(0, 2).join(" ") : first);
  return {
    title, body,
    verb: word.charAt(0).toUpperCase() + word.slice(1),
    danger: DANGER.test(title),
    permanent: PERMANENT.test(text),
  };
}

/** Ask before a sensitive action. Resolves true only on the second press. */
export function ask(question: string, opts: { verb?: string } = {}): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { ask: parseQuestion(question, opts.verb), resolve } }));
  });
}

/**
 * For a plain submit button outside the form kit: the first press asks, and
 * a yes presses the same button again with the question already answered.
 */
export function confirmClick(e: React.MouseEvent<HTMLButtonElement>, question: string) {
  const btn = e.currentTarget;
  if (btn.dataset.asked === "1") { delete btn.dataset.asked; return; }
  e.preventDefault();
  void ask(question).then((ok) => { if (ok) { btn.dataset.asked = "1"; btn.click(); } });
}

/** One per shell, beside the toasts. */
export function ConfirmHost() {
  const [q, setQ] = useState<{ ask: Ask; resolve: (ok: boolean) => void } | null>(null);
  const [understood, setUnderstood] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const detail = (e as CustomEvent<{ ask: Ask; resolve: (ok: boolean) => void }>).detail;
      setUnderstood(false);
      setQ((old) => { old?.resolve(false); return detail; });
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  useEffect(() => { if (q) window.setTimeout(() => cancelRef.current?.focus(), 0); }, [q]);

  const answer = (ok: boolean) => { q?.resolve(ok); setQ(null); };
  if (!q) return null;
  const { title, body, verb, danger, permanent } = q.ask;
  return (
    <Dialog open onClose={() => answer(false)} title={title}>
      <div className="adAsk">
        {body ? <p className="adAsk__body">{body}</p> : null}
        {permanent ? (
          <label className="adAsk__sure">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            <AlertTriangle aria-hidden="true" />
            <span>I understand this cannot be undone.</span>
          </label>
        ) : null}
        <div className="adAsk__acts">
          <button ref={cancelRef} type="button" className="ad__btn" onClick={() => answer(false)}>Leave it</button>
          <button type="button" className={`ad__btn ${danger ? "ad__btn--danger" : "ad__btn--primary"}`}
            disabled={permanent && !understood} onClick={() => answer(true)}>{verb}</button>
        </div>
      </div>
    </Dialog>
  );
}
