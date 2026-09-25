"use client";

import { Send, Trash2 } from "lucide-react";
import { runDailyNow, sendTestEmail } from "@/lib/admin/email-actions";
import { Actions, Field, Fields, Form, Submit } from "./form";

/** The test email and the tidy-now button (Settings, Email and its log). */
export function TestEmail({ me }: { me: string }) {
  return (
    <Form action={sendTestEmail} className="adSetTest">
      <Fields>
        <Field name="to" label="Send a test to" type="email" defaultValue={me} />
      </Fields>
      <Actions><Submit tone="plain" icon={Send}>Send test email</Submit></Actions>
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
