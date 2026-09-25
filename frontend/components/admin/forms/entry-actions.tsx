"use client";

import { Printer, Send } from "lucide-react";
import { addEntryNote, bulkEntries, resendFormEmailAction } from "@/lib/forms/actions";
import { Actions, Area, Field, Fields, Form, Hidden, Radios, Select, Submit } from "@/components/admin/form";

/** Star, read, spam and trash for the one entry on screen: the bulk action with one id. */
/* Deleting for good is done from the Trash tab, where the count of what is
   about to go is on screen; here it would leave the page pointing at nothing. */
export function EntryState({ formKey, id, read, starred, box }: {
  formKey: string; id: string; read: boolean; starred: boolean; box: "inbox" | "spam" | "trash";
}) {
  return (
    <Form action={bulkEntries} className="ad__row adForms__noPrint">
      <Hidden name="form" value={formKey} />
      <Hidden name="id" value={id} />
      {box === "inbox" ? (
        <>
          <button className="ad__btn" name="action" value={starred ? "unstar" : "star"}>{starred ? "Unstar" : "Star"}</button>
          <button className="ad__btn" name="action" value={read ? "unread" : "read"}>{read ? "Mark unread" : "Mark read"}</button>
          <button className="ad__btn" name="action" value="spam">Spam</button>
          <button className="ad__btn" name="action" value="trash">Move to Trash</button>
        </>
      ) : (
        <>
          <button className="ad__btn" name="action" value="restore">{box === "spam" ? "Not spam" : "Put back"}</button>
        </>
      )}
      <button type="button" className="ad__btn" onClick={() => window.print()}><Printer aria-hidden="true" /> Print</button>
    </Form>
  );
}

export function AddNote({ formKey, id }: { formKey: string; id: string }) {
  return (
    <Form action={addEntryNote} resetOnDone className="adForms__noPrint" >
      <div style={{ padding: ".8rem 1rem 0" }}>
        <Hidden name="form" value={formKey} />
        <Hidden name="id" value={id} />
        <Area name="note" label="Add a note" rows={3} hint="Only the studio sees notes. They stay on this entry's history." />
        <Actions><Submit>Add note</Submit></Actions>
      </div>
    </Form>
  );
}

/** Send one of this entry's emails again, to its first recipient or somebody else. */
export function ResendEmail({ formKey, id, notifications }: { formKey: string; id: string; notifications: { key: string; name: string }[] }) {
  return (
    <Form action={resendFormEmailAction} className="adForms__noPrint">
      <div style={{ padding: ".8rem 1rem 0" }}>
        <Hidden name="form" value={formKey} />
        <Hidden name="id" value={id} />
        <Fields>
          <Select name="notification" label="Email" defaultValue={notifications[0]?.key} options={notifications.map((n) => ({ value: n.key, label: n.name }))} />
          <Radios name="target" label="Send to" defaultValue="original" options={[
            { value: "original", label: "Whoever it went to first", note: "With the form's saved copies." },
            { value: "other", label: "Another address", note: "Copies are left off." },
          ]} />
          <Field name="to" label="Other address" type="email" placeholder="name@example.com" />
        </Fields>
        <Actions><Submit icon={Send}>Resend</Submit></Actions>
      </div>
    </Form>
  );
}
