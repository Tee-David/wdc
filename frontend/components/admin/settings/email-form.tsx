"use client";

import { useState } from "react";
import { saveEmailSettings } from "@/lib/admin/settings-actions";
import { Panel } from "@/components/admin/bits";
import { Fields, Select } from "@/components/admin/form";
import { SettingsForm, Text } from "./kit";

/** Settings, Email: what a client sees in their inbox, and how long the log keeps it. */
export function EmailForm({ fromName, replyTo, shippedReplyTo, days, options, fromAddress }: {
  fromName: string; replyTo: string; shippedReplyTo: string; days: number; options: readonly number[]; fromAddress: string;
}) {
  /* What the sender looks like in a client's inbox, as it is typed: the same
     idea (and the same onInput pattern) as Website and SEO's search preview,
     so the fields stay the form's and the save bar sees what it saw before. */
  const [name, setName] = useState(fromName);
  const [reply, setReply] = useState(replyTo);
  return (
    <SettingsForm action={saveEmailSettings}>
      <Panel title="Sender">
        <div className="adSetPad" onInput={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name === "mail.fromName") setName(t.value.trim());
          if (t.name === "mail.replyTo") setReply(t.value.trim());
        }}>
          <Fields>
            <Text name="mail.fromName" label="From name" half required defaultValue={fromName}
              message="Add a sender name, up to 60 characters." pattern=".{2,60}" />
            <Text name="mail.replyTo" label="Replies go to" half type="email" defaultValue={replyTo}
              placeholder={shippedReplyTo || "The From address"} message="Enter an email like name@example.com."
              hint="Also where studio notices go." />
          </Fields>
          <div className="ad__f adSetInbox">
            <span className="ad__fl">In a client&apos;s inbox</span>
            <div className="adSerp">
              <small>From</small>
              <b>{name || fromName}{fromAddress ? <span className="adSetInbox__addr"> &lt;{fromAddress}&gt;</span> : null}</b>
              <span>Replies go to {reply || shippedReplyTo || fromAddress || "the From address"}</span>
            </div>
          </div>
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

