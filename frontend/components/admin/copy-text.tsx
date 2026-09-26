"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copy a piece of text, and say that it happened. */
export function CopyText({ text, label, className = "ad__btn" }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState<"" | "yes" | "no">("");
  return (
    <button type="button" className={className} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone("yes"); } catch { setDone("no"); }
      window.setTimeout(() => setDone(""), 2500);
    }}>
      {done === "yes" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{done === "yes" ? "Copied" : done === "no" ? "Copying was blocked" : label}</span>
    </button>
  );
}
