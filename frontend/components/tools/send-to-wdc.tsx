"use client";

import Link from "next/link";
import { ENQUIRY_DRAFT_KEY, type EnquiryDraft } from "@/lib/contact";
import type { ServiceSlug } from "@/lib/services";

/**
 * "Send this to WDC": the result a visitor just got, carried into /contact.
 *
 * The same draft the homepage form hands over (lib/contact.ts), so the contact
 * form needs no new code to receive it and clears it on send. It is written
 * on the click and nowhere else: nothing leaves the browser until the visitor
 * sends the form themselves, and they can edit or delete every word of it
 * first. Still a plain link underneath, so without script it is /contact.
 */
export function SendToWdc({ topic, from, summary, className = "pv-btn pv-btn--accent", children }: {
  topic: ServiceSlug;
  /** Finishes "We brought over ..." on the contact form. */
  from: string;
  /** What goes into the message box. */
  summary: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const keep = () => {
    const draft: EnquiryDraft = { message: summary, from };
    try { sessionStorage.setItem(ENQUIRY_DRAFT_KEY, JSON.stringify(draft)); } catch { /* the link still goes */ }
  };
  return (
    <Link className={className} href={`/contact?topic=${topic}&from=tool`} onClick={keep}>
      {children ?? "Send this to WDC"}
    </Link>
  );
}

export default SendToWdc;
