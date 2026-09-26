"use client";

import Link from "next/link";
import { RotateCw, Send, Trash2 } from "lucide-react";
import { runDailyNow, sendTestEmail } from "@/lib/admin/email-actions";
import { runTool } from "@/lib/admin/system-actions";
import { Actions, Field, Fields, Form, Hidden, Submit } from "./form";
import { RowMenu } from "./row-menu";

/**
 * The test email (Settings, Email). With no mail server a test can only
 * fail, so the button is off and says why, with the way to fix it next to it,
 * rather than inviting a press that ends in an error.
 */
export function TestEmail({ me, ready }: { me: string; ready: boolean }) {
  if (!ready) {
    return (
      <div className="adSetTest">
        <div className="ad__fields">
          <div className="ad__f">
            <span className="ad__flRow"><label className="ad__fl" htmlFor="adSetTestTo">Send a test to</label></span>
            <input id="adSetTestTo" type="email" defaultValue={me} disabled aria-describedby="adSetTestWhy" />
          </div>
        </div>
        <div className="ad__formActions">
          <button type="button" className="ad__btn" disabled aria-describedby="adSetTestWhy"><Send aria-hidden="true" /> Send test email</button>
        </div>
        <p id="adSetTestWhy" className="adSetTest__why">
          Connect a mail server first. <Link href="/admin/settings/integrations">Connections and health</Link>
        </p>
      </div>
    );
  }
  return (
    <Form action={sendTestEmail} className="adSetTest">
      <Fields>
        <Field name="to" label="Send a test to" type="email" defaultValue={me} />
      </Fields>
      <Actions><Submit tone="plain" icon={Send}>Send test email</Submit></Actions>
    </Form>
  );
}

/**
 * The log's one real action: send the failed ones again. It is the System
 * tool of the same name (lib/system/tools.ts), so it runs behind the response,
 * is bounded, and a second press the same day sends nothing twice.
 */
export function RetryFailed({ count }: { count: number }) {
  return (
    <Form action={runTool} className="ad__inline">
      <Hidden name="tool" value="retry-mail" />
      <Submit icon={RotateCw}>Retry failed ({count})</Submit>
    </Form>
  );
}

/**
 * The daily tidy, which is a chore and not what anyone opens the log for, so
 * it lives in the head's overflow menu behind one sentence saying what it
 * removes.
 */
export function LogMore() {
  return (
    <RowMenu
      label="More for the message log"
      items={[{
        kind: "dialog", label: "Run the daily tidy now", title: "Run the daily tidy now?", icon: Trash2, tone: "danger",
        render: (close) => (
          <Form action={runDailyNow} onDone={() => close()}>
            <div className="ad__sure">
              <p>This removes log rows older than the retention period, and entries and blog drafts that have been in Trash past theirs. It runs by itself every night; this only runs it early.</p>
            </div>
            <Actions>
              <button type="button" className="ad__btn" onClick={close}>Leave it</button>
              <Submit tone="danger" icon={Trash2}>Run it now</Submit>
            </Actions>
          </Form>
        ),
      }]}
    />
  );
}
