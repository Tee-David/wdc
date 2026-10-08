"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { marketingAction, noteAction, syncContactsAction } from "@/lib/admin/contact-actions";
import { Actions, Area, Fields, Form, Hidden, Submit } from "../form";
import { toast } from "../toast";
import "./contacts.css";

/** Brings clients, enquiries, briefs and the newsletter in as contacts. `compact` is the header's short form; the empty state spells it out. */
export function SyncButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const long = "Update from clients, forms and newsletter";
  return (
    <button type="button" className="ad__btn" disabled={busy} data-icon-only={compact || undefined} aria-label={compact ? long : undefined} title={compact ? long : undefined} onClick={async () => {
      setBusy(true);
      const r = await syncContactsAction().catch(() => null);
      setBusy(false);
      toast(r?.message ?? "That could not be done just now.", r?.ok ? "good" : "bad");
      router.refresh();
    }}><RefreshCw aria-hidden="true" /> <span className="ctLbl">{busy ? "Updating…" : compact ? "Update" : long}</span></button>
  );
}

export function NoteForm({ id, onDone }: { id: string; onDone?: () => void }) {
  return (
    <Form action={noteAction} resetOnDone onDone={onDone}>
      <Hidden name="id" value={id} />
      <Fields><Area name="note" label="Add a note" rows={3} /></Fields>
      <Actions><Submit>Save note</Submit></Actions>
    </Form>
  );
}

export function MarketingForm({ id, on, disabled }: { id: string; on: boolean; disabled: boolean }) {
  return (
    <Form action={marketingAction}>
      <Hidden name="id" value={id} /><Hidden name="on" value={on ? "0" : "1"} />
      <Submit tone={on ? "plain" : "primary"} disabled={disabled}>{on ? "Switch marketing off" : "They asked to hear from us"}</Submit>
    </Form>
  );
}
