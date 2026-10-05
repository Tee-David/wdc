"use client";
import { Eye } from "lucide-react";
import { DialogButton } from "@/components/admin/dialog";
import { Actions, Area, Form, Hidden, Submit } from "@/components/admin/form";
import { startClientSupport } from "@/lib/users/support-actions";
export function ClientSupportButton({ targetId, clientId }: { targetId: string; clientId: string }) {
  return <DialogButton label="View as client" title="Read-only client support" tone="plain" icon={Eye}>
    {() => <Form action={startClientSupport}>
      <p>You will see this client&apos;s portal for up to 15 minutes. Changes, payments, sign-in settings and downloads are disabled. Your owner account stays signed in.</p>
      <p>Sign in again first if your current session started more than 15 minutes ago.</p>
      <Hidden name="targetId" value={targetId} /><Hidden name="clientId" value={clientId} />
      <Area name="reason" label="Support reason" required hint="Recorded in the security history. Keep it brief and avoid sensitive details." />
      <Actions><Submit>Start support view</Submit></Actions>
    </Form>}
  </DialogButton>;
}
