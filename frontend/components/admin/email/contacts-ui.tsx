"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Tag, Upload } from "lucide-react";
import { importAction, marketingAction, noteAction, syncContactsAction, tagAction } from "@/lib/admin/contact-actions";
import { Actions, Area, Field, Fields, Form, Hidden, Submit } from "../form";
import { DialogButton } from "../dialog";
import { toast } from "../toast";

/** Tag or untag whoever is ticked in the table (the same tick boxes the other lists use). */
export function TagBar({ target, tags }: { target: string; tags: string[] }) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const box = document.getElementById(target);
    if (!box) return;
    const read = () => {
      setIds([...box.querySelectorAll<HTMLInputElement>(".adRowPick:checked")].map((b) => b.value));
      const all = box.querySelector<HTMLInputElement>(".adRowPickAll");
      const n = box.querySelectorAll(".adRowPick").length, c = box.querySelectorAll(".adRowPick:checked").length;
      if (all) { all.checked = c > 0 && c === n; all.indeterminate = c > 0 && c < n; }
    };
    box.addEventListener("change", read);
    return () => box.removeEventListener("change", read);
  }, [target]);
  if (!ids.length) return null;
  const go = async (mode: "add" | "remove") => {
    setBusy(true);
    const fd = new FormData();
    ids.forEach((i) => fd.append("ids", i)); fd.set("tag", tag); fd.set("mode", mode);
    const r = await tagAction({ ok: false }, fd).catch(() => null);
    setBusy(false);
    toast(r?.message ?? "That could not be done just now.", r?.ok ? "good" : "bad");
    if (r?.ok) { setTag(""); router.refresh(); }
  };
  return (
    <div className="ad__row emBar" role="region" aria-label="Tag the people you ticked">
      <b>{ids.length} ticked</b>
      <input list="em-tags" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="A tag, like interested-in-web" aria-label="Tag" maxLength={40} />
      <datalist id="em-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist>
      <button type="button" className="ad__btn ad__btn--primary" disabled={busy || !tag.trim()} onClick={() => go("add")}><Tag aria-hidden="true" /> Add tag</button>
      <button type="button" className="ad__btn" disabled={busy || !tag.trim()} onClick={() => go("remove")}>Remove tag</button>
    </div>
  );
}

export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className="ad__btn" disabled={busy} onClick={async () => {
      setBusy(true);
      const r = await syncContactsAction().catch(() => null);
      setBusy(false);
      toast(r?.message ?? "That could not be done just now.", r?.ok ? "good" : "bad");
      router.refresh();
    }}><RefreshCw aria-hidden="true" /> {busy ? "Updating…" : "Update from clients, forms and newsletter"}</button>
  );
}

export function ImportContacts() {
  return (
    <DialogButton label="Import" title="Import contacts" icon={Upload} tone="plain" wide>
      {(close) => (
        <Form action={importAction} onDone={close}>
          <Fields>
            <Area name="paste" label="Addresses" rows={5} hint="One per line, or a file below. A name beside the address is picked up. Anyone who unsubscribed or bounced is skipped." />
            <Field name="file" label="Or a CSV file" type="file" />
            <Field name="tag" label="Tag them" defaultValue="imported" />
            <label className="ad__check"><input type="checkbox" name="asked" value="1" /> <span>They asked to hear from us (I can show it). Leave this off and they are kept but get no campaigns.</span></label>
          </Fields>
          <Actions><Submit>Import</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

export function NoteForm({ id }: { id: string }) {
  return (
    <Form action={noteAction} resetOnDone>
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
