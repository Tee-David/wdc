"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A PAY FORM THAT SUBMITS ONCE. Still a real form and a real POST (see
 * app/i/[token]/page.tsx for why), so it works with JavaScript off; with it on,
 * the first press marks the form busy and every later press is dropped, so an
 * impatient double click on a slow connection opens one Paystack checkout
 * rather than two. Coming BACK to the page from Paystack restores it: the
 * browser's back cache would otherwise return a form that refuses to submit.
 */
export function PayForm({ action, className, children }: { action: string; className?: string; children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  /* After 8 seconds the line says so, and that nothing is charged yet: true,
     and never a progress figure nobody has. */
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const t = window.setTimeout(() => setSlow(true), 8000);
    return () => { window.clearTimeout(t); setSlow(false); };
  }, [busy]);
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => { if (e.persisted) setBusy(false); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  return (
    <form
      method="post"
      action={action}
      className={className}
      aria-busy={busy || undefined}
      data-busy={busy ? "1" : undefined}
      onSubmit={(e) => {
        if (busy) { e.preventDefault(); return; }
        setBusy(true);
      }}
    >
      {children}
      {busy ? <span className="pay-busy" role="status">{slow ? "Still opening Paystack. Nothing has been charged yet." : "Opening Paystack…"}</span> : null}
    </form>
  );
}
