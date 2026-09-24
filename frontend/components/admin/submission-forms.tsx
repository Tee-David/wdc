"use client";

import { UserPlus } from "lucide-react";
import type { Client } from "@/lib/admin/types";
import { attachSubmission, clientFromLiveSubmission } from "@/lib/admin/actions";
import { Actions, Fields, Form, Hidden, Select, Submit } from "./form";
import { DialogButton } from "./dialog";

/**
 * Turning a form that arrived into a client on the books.
 *
 * The common case is the first one: somebody who is not a client yet fills the
 * onboarding form, and the answers already carry their name, company, email
 * and phone. Leaving the select empty makes the client out of those answers,
 * which is one press rather than retyping what they have already typed. The
 * select is for the other case, where they are already on the books and this
 * is their second service.
 */
export function AttachSubmission({
  submissionId, clients,
}: {
  submissionId: string;
  clients: Pick<Client, "id" | "company">[];
}) {
  return (
    <DialogButton label="Attach to a client" title="Whose form is this?" icon={UserPlus}>
      {/* attachSubmission redirects to the client, new or existing. */}
      {() => (
        <Form action={attachSubmission}>
          <Fields>
            <Hidden name="id" value={submissionId} />
            <Select
              name="clientId" label="Existing client"
              placeholder="Make a new one from these answers"
              options={clients.map((c) => ({ value: c.id, label: c.company }))}
              hint="Leave this as it is and the answers become a new client record."
            />
          </Fields>
          <Actions>
            <Submit icon={UserPlus}>Attach it</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/**
 * For a brief from the live form: make it a client, or open the one it
 * already belongs to. Matching is by email or phone on the server, so this
 * cannot create a second record for somebody already on the books.
 */
export function LiveSubmissionClient({ submissionId }: { submissionId: string }) {
  return (
    <Form action={clientFromLiveSubmission}>
      <Hidden name="id" value={submissionId} />
      <Submit icon={UserPlus}>Make them a client</Submit>
    </Form>
  );
}
