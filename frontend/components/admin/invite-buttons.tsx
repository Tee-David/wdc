"use client";

import { Mail, Undo2 } from "lucide-react";
import { inviteClient, revokeInvite } from "@/lib/admin/invite-actions";
import { Actions, Form, Hidden, Submit } from "./form";

export function InviteClientButton({ clientId, again }: { clientId: string; again: boolean }) {
  return (
    <Form action={inviteClient} confirm={again ? "Send a new invitation? The one already sent stops working." : undefined}>
      <Hidden name="clientId" value={clientId} />
      <Actions><Submit tone={again ? "plain" : "primary"} icon={Mail}>{again ? "Send a new invitation" : "Invite to the portal"}</Submit></Actions>
    </Form>
  );
}

export function RevokeInviteButton({ id, back }: { id: string; back: string }) {
  return (
    <Form action={revokeInvite} confirm="Withdraw this invitation? The emailed link stops working.">
      <Hidden name="id" value={id} />
      <Hidden name="back" value={back} />
      <Actions><Submit tone="danger" icon={Undo2}>Withdraw</Submit></Actions>
    </Form>
  );
}
