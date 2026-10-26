"use client";

import Link from "next/link";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Banknote, Bell, Check, CreditCard, FolderKanban, Home, MessageSquare, Percent, UserPlus, UserRound, Users, type LucideIcon } from "lucide-react";
import "./welcome.css";

/**
 * THE WELCOME CHECKLIST, one for Admin, staff and clients: a navy card with how far along they are, then the steps
 * as rows (a solid icon tile, what it is for, a tag and its one button). A step is done when the studio's records
 * say so (`done`, read on the server) or when this person has opened it (kept on this device, a convenience that
 * never claims more than "you looked"). The first step not done is "Next" and carries the primary button.
 */
/* Icons go by name: a server page cannot hand a component to a client one. */
const ICONS: Record<string, LucideIcon> = { banknote: Banknote, bell: Bell, card: CreditCard, projects: FolderKanban, home: Home, percent: Percent, invite: UserPlus, person: UserRound, people: Users, msg: MessageSquare };
export type WelcomeStep = { key: string; icon: keyof typeof ICONS; title: string; body: string; label: string; href: string; done?: boolean };

export function WelcomeSteps({ id, title, blurb, steps, finish }: { id: string; title: string; blurb: string; steps: WelcomeStep[]; finish?: React.ReactNode }) {
  const key = `wdc:welcome:${id}`;
  const subscribe = useCallback((notify: () => void) => { window.addEventListener("storage", notify); window.addEventListener(key, notify); return () => { window.removeEventListener("storage", notify); window.removeEventListener(key, notify); }; }, [key]);
  const read = useCallback(() => { try { return window.localStorage.getItem(key) ?? "[]"; } catch { return "[]"; } }, [key]);
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const seen = useMemo(() => { try { return new Set<string>(JSON.parse(raw) as string[]); } catch { return new Set<string>(); } }, [raw]);
  const mark = (k: string) => {
    try { const next = [...new Set([...seen, k])]; window.localStorage.setItem(key, JSON.stringify(next)); window.dispatchEvent(new Event(key)); } catch { /* Storage can be blocked; the link still works. */ }
  };
  const done = (s: WelcomeStep) => !!s.done || seen.has(s.key);
  const count = steps.filter(done).length;
  const next = steps.find((s) => !done(s))?.key;
  return (
    <div className="adWl">
      <section className="adWl__hero" aria-label="Progress">
        <div className="adWl__heroTop"><h2>{title}</h2><span className="ad__num">{count} of {steps.length}</span></div>
        <div className="adWl__bar" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={count} aria-label={`${count} of ${steps.length} done`}><span style={{ "--w": steps.length ? count / steps.length : 0 } as React.CSSProperties} /></div>
        <p>{blurb}</p>
        {count === steps.length && finish ? <div className="adWl__finish">{finish}</div> : null}
      </section>
      <ol className="adWl__steps">
        {steps.map((s) => {
          const Icon = ICONS[s.icon] ?? UserRound;
          const d = done(s);
          return (
            <li key={s.key} className="adWl__step">
              <span className="adWl__ic" aria-hidden="true"><Icon /></span>
              <span className="adWl__txt"><b>{s.title}</b><span>{s.body}</span></span>
              <span className={`ad__pill ${d ? "ad__pill--good" : s.key === next ? "ad__pill--live" : "ad__pill--flat"}`}>{d ? <><Check aria-hidden="true" style={{ width: ".75rem", height: ".75rem" }} />Done</> : s.key === next ? "Next" : "To do"}</span>
              <Link className={`ad__btn${s.key === next && !d ? " ad__btn--primary" : ""}`} href={s.href} onClick={() => mark(s.key)}>{s.label}</Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
