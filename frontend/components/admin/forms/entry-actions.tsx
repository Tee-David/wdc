"use client";

import { Printer } from "lucide-react";
import { addEntryNote, bulkEntries } from "@/lib/forms/actions";
import { Actions, Area, Form, Hidden, Submit } from "@/components/admin/form";

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
