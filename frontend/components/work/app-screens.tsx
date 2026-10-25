"use client";

import { useEffect, useRef, useState } from "react";
import type { AppShot } from "@/lib/work";
import { AppFrame } from "./app-frame";

const KIND: Record<AppShot["device"], "Desktop" | "Tablet" | "Phone"> = {
  laptop: "Desktop", window: "Desktop", panel: "Desktop", tablet: "Tablet", phone: "Phone",
};

/**
 * Step through a build's screens the way the people using it see them: one
 * screen at a time in its own device frame, filtered by device, with a strip of
 * every screen underneath. Opening a screen shows it full size in a native
 * `<dialog>`, which brings Esc, focus containment and the backdrop for free.
 */
export default function AppScreens({ shots, client }: { shots: AppShot[]; client: string }) {
  const [tab, setTab] = useState<"all" | "Desktop" | "Tablet" | "Phone">("all");
  const [at, setAt] = useState(0);
  const dlg = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);

  const shown = shots.map((s, n) => ({ s, n })).filter((x) => tab === "all" || KIND[x.s.device] === tab);
  const counts = (["Desktop", "Tablet", "Phone"] as const).map((k) => [k, shots.filter((s) => KIND[s.device] === k).length] as const);
  const cur = shots[at];
  const pos = shown.findIndex((x) => x.n === at);
  const go = (d: number) => {
    const nx = shown[(pos + d + shown.length) % shown.length];
    if (nx) setAt(nx.n);
  };

  /* Keep the picked thumbnail in view without moving the page. */
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-n="${at}"]`);
    const box = strip.current;
    if (!el || !box) return;
    const left = el.offsetLeft - (box.clientWidth - el.clientWidth) / 2;
    box.scrollTo({ left, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [at]);

  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  };

  return (
    <div className="ac-shots">
      <div className="ac-tabs" role="group" aria-label="Show screens from">
        <button type="button" aria-pressed={tab === "all"} onClick={() => { setTab("all"); }}>
          All <span>{shots.length}</span>
        </button>
        {counts.filter(([, n]) => n > 0).map(([k, n]) => (
          <button key={k} type="button" aria-pressed={tab === k}
            onClick={() => { setTab(k); setAt(shots.findIndex((s) => KIND[s.device] === k)); }}>
            {k} <span>{n}</span>
          </button>
        ))}
      </div>

      <div className="ac-view" onKeyDown={key}>
        <button type="button" className={`ac-view__open ac-view__open--${cur.device}`} onClick={() => dlg.current?.showModal()}
          aria-label={`Open ${cur.title} full size`}>
          <AppFrame key={cur.src} s={cur} alt={`${client}: ${cur.title}`} sizes="(max-width: 760px) 92vw, 700px" />
        </button>
        <div className="ac-view__cap">
          <div className="ac-view__txt" aria-live="polite">
            <span className="ac-view__pos">{pos + 1} of {shown.length} · {KIND[cur.device]}</span>
            <h3>{cur.title}</h3>
            <p>{cur.caption}</p>
          </div>
          <div className="ac-view__nav">
            <button type="button" className="ac-arrow" onClick={() => go(-1)} aria-label="Previous screen" disabled={shown.length < 2}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" className="ac-arrow" onClick={() => go(1)} aria-label="Next screen" disabled={shown.length < 2}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="ac-strip" ref={strip} data-lenis-prevent>
        {shown.map(({ s, n }) => (
          <button key={s.src} type="button" data-n={n} aria-pressed={n === at} onClick={() => setAt(n)} aria-label={`Show ${s.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a 120px thumbnail of a file already on the page */}
            <img src={s.src} alt="" width={s.w} height={s.h} loading="lazy" decoding="async" />
            <span>{s.title}</span>
          </button>
        ))}
      </div>

      <dialog ref={dlg} className="ac-full" aria-label={`${cur.title}, ${pos + 1} of ${shown.length}`} onKeyDown={key}
        onClick={(e) => { if (e.target === e.currentTarget) dlg.current?.close(); }}>
        <div className="ac-full__bar">
          <span className="ac-full__pos">{pos + 1} / {shown.length}</span>
          <strong>{cur.title}</strong>
          <button type="button" className="ac-full__x" onClick={() => dlg.current?.close()} aria-label="Close the full-size view">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="ac-full__body" data-lenis-prevent>
          {/* eslint-disable-next-line @next/next/no-img-element -- full size, at the capture's own resolution */}
          <img src={cur.src} alt={`${client}: ${cur.title}`} width={cur.w} height={cur.h} />
        </div>
        <div className="ac-full__foot">
          <button type="button" className="ac-arrow ac-arrow--dark" onClick={() => go(-1)} aria-label="Previous screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
          <p>{cur.caption}</p>
          <button type="button" className="ac-arrow ac-arrow--dark" onClick={() => go(1)} aria-label="Next screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
        </div>
      </dialog>
    </div>
  );
}
