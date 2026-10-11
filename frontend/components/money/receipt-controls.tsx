"use client";
import { Download, LifeBuoy, Printer } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The row under every document: Download PDF, Print, Need help? (the board's
 * order). Print and Download are the PDF route, unchanged; Need help opens a
 * message to the studio with the document's number as the subject, so the
 * reply lands against the right piece of work.
 */
export default function ReceiptControls({ token, kind = "Receipt", number }: { token: string; kind?: "Receipt" | "Invoice" | "Estimate"; number?: string }) {
  const base = `/${kind === "Receipt" ? "r" : kind === "Invoice" ? "i" : "q"}/${encodeURIComponent(token)}/pdf`;
  const label = kind === "Estimate" ? "Quote" : kind;
  return (
    <div className="doc__actions" aria-label={`${label} actions`}>
      <a className="bareBtn is-2 is-auto" href={base}><Download aria-hidden="true" />Download PDF</a>
      <a className="bareBtn is-2 is-auto" href={`${base}?print=1`}><Printer aria-hidden="true" />Print</a>
      <a className="bareBtn is-2 is-auto" href={`mailto:${CONTACT_EMAIL}${number ? `?subject=${encodeURIComponent(`${label} ${number}`)}` : ""}`}><LifeBuoy aria-hidden="true" />Need help?</a>
    </div>
  );
}
