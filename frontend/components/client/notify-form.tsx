"use client";

import { Save } from "lucide-react";
import { updateNotifyPrefs } from "@/lib/portal/actions";
import { Form, Submit } from "@/components/admin/form";
import { NOTIFY_KINDS, NOTIFY_LABELS, notifyAllows, type Client } from "@/lib/admin/types";

const HINT: Record<(typeof NOTIFY_KINDS)[number], string> = {
  updates: "Progress notes and deliverables ready for your review.",
  reminders: "A nudge when an invoice is due or overdue.",
  marketing: "Occasional news from the studio. Off by default.",
};

export function NotifyForm({ client }: { client: Client }) {
  return (
    <Form action={updateNotifyPrefs}>
      <div style={{ display: "grid", gap: ".75rem" }}>
        {NOTIFY_KINDS.map((kind) => (
          <label key={kind} className="ad__check ad__check--long">
            <input type="checkbox" name={kind} defaultChecked={notifyAllows(client.notify, kind)} />
            <span>
              {NOTIFY_LABELS[kind]}
              <small>{HINT[kind]}</small>
            </span>
          </label>
        ))}
      </div>
      <div className="ad__row" style={{ marginTop: ".9rem" }}>
        <Submit tone="primary" icon={Save}>Save preferences</Submit>
      </div>
    </Form>
  );
}
