import { notFound } from "next/navigation";
import ReceiptPrinter from "@/components/money/receipt-printer";
import "@/components/money/document.css";

/* The payment receipt printer, for looking at it.

   The real one only renders after Paystack has confirmed a payment, so there
   is no URL that shows it. DEV ONLY, like /dev-stamps, and it enforces that
   itself: in production this is a genuine 404. The figures are samples. */
export const dynamic = "force-static";

const LINES = [
  { description: "Brand identity: logo suite, colour and type system, brand guidelines", qty: 1, amount: 45000000 },
  { description: "Website design and build (eight pages)", qty: 1, amount: 120000000 },
  { description: "Social media templates", qty: 12, amount: 3600000 },
];

export default function DevReceipt() {
  if (process.env.NODE_ENV === "production") notFound();
  const subtotal = LINES.reduce((n, l) => n + l.amount, 0);
  const vat = Math.round(subtotal * 0.075);
  return (
    <main className="doc doc--return">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 24rem), 1fr))", gap: "1.5rem", maxWidth: "52rem", margin: "0 auto" }}>
        <article className="doc__sheet">
          <ReceiptPrinter
            amount={80000000} receiptNo="RCT-2026-014" number="INV-2026-031"
            method="Paystack" at="2026-10-04T13:42:00Z" outstanding={subtotal + vat - 80000000}
            lines={LINES} subtotal={subtotal} vat={vat} vatRate={7.5} total={subtotal + vat}
          />
        </article>
        <article className="doc__sheet">
          <ReceiptPrinter
            amount={LINES[0].amount} receiptNo="RCT-2026-015" number="INV-2026-032"
            method="Paystack" at="2026-10-04T13:42:00Z" outstanding={0}
            lines={LINES.slice(0, 1)} subtotal={LINES[0].amount} vat={0} vatRate={0} total={LINES[0].amount}
          />
        </article>
      </div>
    </main>
  );
}
