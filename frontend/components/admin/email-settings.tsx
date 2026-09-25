"use client";

import { Send, Trash2 } from "lucide-react";
import { runDailyNow, saveFailureAlert, saveLogRetention, sendTestEmail } from "@/lib/admin/email-actions";
import { Actions, Field, Fields, Form, Select, Submit } from "./form";

/** The test email, the log's retention and the tidy-now button: the three writes on Settings, Email. */
export function TestEmail({ me }: { me: string }) {
  return (
    <Form action={sendTestEmail}>
      <Fields>
        <Field name="to" label="Send a test to" type="email" defaultValue={me} hint="Goes through the real mail server. It can take half a minute." />
      </Fields>
      <Actions><Submit icon={Send}>Send test email</Submit></Actions>
    </Form>
  );
}

export function Retention({ days, options }: { days: number; options: readonly number[] }) {
  return (
    <Form action={saveLogRetention}>
      <Fields>
        <Select name="days" label="Keep the message log for" defaultValue={String(days)}
          options={options.map((d) => ({ value: String(d), label: d === 365 ? "A year" : `${d} days` }))}
          hint="Older rows are removed by the daily tidy. A failed message is removed too, so retry it before then." />
      </Fields>
      <Actions><Submit>Save</Submit></Actions>
    </Form>
  );
}

export function TidyNow() {
  return (
    <Form action={runDailyNow}>
      <Actions><Submit icon={Trash2}>Run the daily tidy now</Submit></Actions>
    </Form>
  );
}

export function FailureAlertForm({ to }: { to: string }) {
  return (
    <Form action={saveFailureAlert}>
      <Fields>
        <Field name="to" label="Tell this address when an email fails" type="email" defaultValue={to}
          hint="A list, at most once an hour. Leave empty to switch it off." />
      </Fields>
      <Actions><Submit>Save alert address</Submit></Actions>
    </Form>
  );
}
