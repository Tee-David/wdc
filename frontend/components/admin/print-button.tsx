"use client";

import { Printer } from "lucide-react";

/** Prints the page (the browser's own dialog also saves it as a PDF). */
export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="ad__btn ad__btn--primary" onClick={() => window.print()}><Printer aria-hidden="true" />{label}</button>;
}
