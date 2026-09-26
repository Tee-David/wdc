"use client";

import { useState } from "react";
import { Copy, DatabaseZap, RefreshCw } from "lucide-react";
import { applyMigrations, checkIntegration, runTool } from "@/lib/admin/system-actions";
import { Form, Hidden, Submit } from "@/components/admin/form";

/** "Check now" for one outside service. */
export function CheckNow({ probe }: { probe: string }) {
  return (
    <Form action={checkIntegration} className="adSys__check">
      <Hidden name="probe" value={probe} />
      <Submit tone="plain" icon={RefreshCw}>Check now</Submit>
    </Form>
  );
}

export function ToolButton({ tool, label, confirm }: { tool: string; label: string; confirm?: string }) {
  return (
    <Form action={runTool} confirm={confirm} className="adSys__check">
      <Hidden name="tool" value={tool} />
      <Submit tone="plain">{label}</Submit>
    </Form>
  );
}

/** The environment as text, for pasting into a message to whoever is helping. No secrets are in it. */
export function CopyReport({ text }: { text: string }) {
  const [said, setSaid] = useState("");
  return (
    <span className="ad__row">
      <button type="button" className="ad__btn" onClick={async () => {
        try { await navigator.clipboard.writeText(text); setSaid("Copied."); } catch { setSaid("Copying was refused by the browser. Select the text below instead."); }
      }}>
        <Copy aria-hidden="true" /> Copy report
      </button>
      <span role="status" className="ad__dim">{said}</span>
    </span>
  );
}

/** The owner brings the database up to this deploy, after saying yes to what it does. */
export function ApplyMigrations({ count }: { count: number }) {
  return (
    <Form action={applyMigrations} className="adSys__check"
      confirm={`Apply ${count} database update${count === 1 ? "" : "s"}? They change the database's structure to match this deploy and cannot be undone from here. Each is all or nothing, and they stop at the first that fails. Make sure the database has a recent backup first.`}>
      <Submit icon={DatabaseZap}>Apply {count === 1 ? "it" : `all ${count}`}</Submit>
    </Form>
  );
}
