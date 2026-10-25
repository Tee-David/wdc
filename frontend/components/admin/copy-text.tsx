"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copy a piece of text, and say that it happened. */
export function CopyText({ text, label, className = "ad__btn", iconOnly = false }: { text: string; label: string; className?: string; iconOnly?: boolean }) {
  const [done, setDone] = useState<"" | "yes" | "no">("");
  return (
    <button type="button" className={`${className}${iconOnly ? " ad__btn--icon" : ""}`} aria-label={iconOnly ? (done === "yes" ? "Copied" : label) : undefined} title={iconOnly ? label : undefined} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone("yes"); } catch { setDone("no"); }
      window.setTimeout(() => setDone(""), 2500);
    }}>
      {done === "yes" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite" className={iconOnly ? "ad__sr" : undefined}>{done === "yes" ? "Copied" : done === "no" ? "Copying was blocked" : label}</span>
    </button>
  );
}
