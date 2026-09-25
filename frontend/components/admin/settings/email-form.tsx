"use client";

import { saveEmailSettings } from "@/lib/admin/settings-actions";
import { Panel } from "@/components/admin/bits";
import { Fields, Select } from "@/components/admin/form";
import { SettingsForm, Text } from "./kit";

/** Settings, Email: what a client sees in their inbox, and how long the log keeps it. */
export function EmailForm({ fromName, replyTo, shippedReplyTo, days, options }: {
  fromName: string; replyTo: string; shippedReplyTo: string; days: number; options: readonly number[];
}) {
  return (
    <SettingsForm action={saveEmailSettings}>
      <Panel title="Sender">
        <div className="adSetPad">
          <Fields>
            <Text name="mail.fromName" label="From name" half required defaultValue={fromName}
              message="Add a sender name, up to 60 characters." pattern=".{2,60}" />
            <Text name="mail.replyTo" label="Replies go to" half type="email" defaultValue={replyTo}
              placeholder={shippedReplyTo || "The From address"} message="Enter an email like name@example.com."
              hint="Also where studio notices go." />
          </Fields>
        </div>
      </Panel>
      <Panel title="Message log">
        <div className="adSetPad">
          <Fields>
            <Select name="logDays" label="Keep the message log for" half defaultValue={String(days)}
              options={options.map((d) => ({ value: String(d), label: d === 365 ? "A year" : `${d} days` }))} />
          </Fields>
        </div>
      </Panel>
    </SettingsForm>
  );
}
