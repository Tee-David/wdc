"use client";
import Image from "next/image";
import "./payment-providers.css";

import { useSupportReadOnly } from "@/components/client/support-context";
import { useEffect, useState, type ReactNode } from "react";

/**
 * A PAY FORM THAT SUBMITS ONCE. Still a real form and a real POST (see
 * app/i/[token]/page.tsx for why), so it works with JavaScript off; with it on,
 * the first press marks the form busy and every later press is dropped, so an
 * impatient double click on a slow connection opens one Paystack checkout
 * rather than two. Coming BACK to the page from Paystack restores it: the
 * browser's back cache would otherwise return a form that refuses to submit.
 */
export function PayForm({ action, className, children, currency="NGN" }: { action: string; className?: string; children: ReactNode; currency?:string }) {
  const supportReadOnly = useSupportReadOnly();
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
        if (busy || supportReadOnly) { e.preventDefault(); return; }
        setBusy(true);
      }}
    >
      <fieldset className="paymentProviders" disabled={busy||supportReadOnly}><legend>Payment provider</legend><div className="paymentProviders__options">{(currency==='NGN'?['paystack','flutterwave']:['flutterwave']).map((provider,index)=><label key={provider}><input type="radio" name="provider" value={provider} defaultChecked={index===0}/><span><Image src={`/payments/${provider}.svg`} width={28} height={28} alt=""/><b>{provider==='paystack'?'Paystack':'Flutterwave'}</b></span></label>)}</div></fieldset>
      {supportReadOnly ? <><p>Payments are disabled in a read-only support view.</p><fieldset disabled className="pSupport__fields">{children}</fieldset></> : children}
      {busy ? <span className="pay-busy" role="status">{slow ? "Still opening secure checkout. Nothing has been charged yet." : "Opening secure checkout…"}</span> : null}
    </form>
  );
}
