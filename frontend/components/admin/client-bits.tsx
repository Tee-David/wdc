"use client";

import { Send } from "lucide-react";
import { emailReminder } from "@/lib/admin/actions";
import { Form, Hidden, Submit } from "./form";

/** One press, one reminder email for an unpaid invoice. The server keeps its own checks (owner only, opted out, at most one a day) and says what it did in a toast. */
export function RemindButton({ invoiceId, label = "Remind" }: { invoiceId: string; label?: string }) {
  return (
    <Form action={emailReminder}>
      <Hidden name="id" value={invoiceId} />
      <Submit tone="plain" icon={Send}>{label}</Submit>
    </Form>
  );
}
