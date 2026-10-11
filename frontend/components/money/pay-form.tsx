"use client";
import Image from "next/image";
import "./payment-providers.css";

import { useSupportReadOnly } from "@/components/client/support-context";
import { useEffect, useState, type ReactNode } from "react";

const PROVIDERS = {
  paystack: { name: "Paystack", sub: "Cards and bank transfer" },
  flutterwave: { name: "Flutterwave", sub: "Cards, bank and USSD" },
} as const;
type Provider = keyof typeof PROVIDERS;

/**
 * A PAY FORM THAT SUBMITS ONCE. Still a real form and a real POST (see
 * app/i/[token]/page.tsx for why), so it works with JavaScript off; with it on,
 * the first press marks the form busy and every later press is dropped, so an
 * impatient double click on a slow connection opens one Paystack checkout
 * rather than two. Coming BACK to the page from Paystack restores it: the
 * browser's back cache would otherwise return a form that refuses to submit.
 *
 * THE PROVIDER IS CHOSEN IN A RADIO LIST AND SENT IN A HIDDEN FIELD. The radios
 * are only the picture of the choice; the value that is posted lives outside
 * the fieldset, so locking the list while the checkout opens can never drop it.
 * The button names the amount and the provider: "Pay ₦450,000 with Paystack".
 */
export function PayForm({ action, className, children, currency = "NGN", amount }: { action: string; className?: string; children?: ReactNode; currency?: string; amount?: string }) {
  const supportReadOnly = useSupportReadOnly();
  const [busy, setBusy] = useState(false);
  const options: Provider[] = currency === "NGN" ? ["paystack", "flutterwave"] : ["flutterwave"];
  const [provider, setProvider] = useState<Provider>(options[0]);
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
      <input type="hidden" name="provider" value={provider} />
      <fieldset className="paymentProviders" disabled={busy || supportReadOnly}>
        <legend>Pay with</legend>
        <div className="paymentProviders__options">
          {options.map((p) => (
            <label key={p} className="payOpt">
              <input type="radio" name="provider-choice" value={p} checked={provider === p} onChange={() => setProvider(p)} />
              <span className="payOpt__logo"><Image src={`/payments/${p}.svg`} width={28} height={28} alt="" /></span>
              <span className="payOpt__t"><b>{PROVIDERS[p].name}</b><small>{PROVIDERS[p].sub}</small></span>
            </label>
          ))}
        </div>
      </fieldset>
      {supportReadOnly ? <p className="doc__hint">Payments are disabled in a read-only support view.</p> : null}
      {/* With an amount the form carries its own button, named for the amount
          and the provider. Without one (the client portal), the caller's
          children hold the button, as before. */}
      {amount ? (
        <button className="bareBtn doc__payBtn" type="submit" disabled={supportReadOnly} aria-disabled={busy || undefined}>
          {busy ? <span className="doc__spin" aria-hidden="true" /> : null}
          Pay {amount} with {PROVIDERS[provider].name}
        </button>
      ) : null}
      {busy ? <span className="pay-busy" role="status">{slow ? "Still opening secure checkout. Nothing has been charged yet." : "Opening secure checkout…"}</span> : null}
      {children}
    </form>
  );
}
