"use client";

import { Upload } from "lucide-react";
import { importSubscribersAction } from "@/lib/forms/actions";
import { DialogButton } from "@/components/admin/dialog";
import { Actions, Checks, Form, Submit } from "@/components/admin/form";

/** A CSV of addresses into the newsletter list, with the consent asked for, not assumed. */
export function ImportSubscribers() {
  return (
    <DialogButton label="Import CSV" title="Import subscribers" icon={Upload} tone="plain">
      {() => (
        <Form action={importSubscribersAction}>
          <p className="ad__dim" style={{ margin: "0 0 .8rem", fontSize: ".9rem" }}>
            The first address in each row is taken. Nobody is sent a welcome, and anybody who unsubscribed stays unsubscribed.
          </p>
          <label className="ad__f">
            <span className="ad__fl">CSV file</span>
            <input type="file" name="csv" accept=".csv,text/csv,text/plain" required />
          </label>
          <Checks name="consent" label="Permission" long options={[{ value: "on", label: "Everyone in this file asked to hear from the studio" }]} />
          <Actions><Submit icon={Upload}>Import</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}
