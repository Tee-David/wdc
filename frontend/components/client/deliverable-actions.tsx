"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquareWarning } from "lucide-react";
import { approveDeliverable, requestRevision } from "@/lib/portal/actions";
import { Area, Form, Hidden, Submit } from "@/components/admin/form";
import type { Deliverable } from "@/lib/admin/types";

/**
 * THE ONE PLACE A CLIENT WRITES BACK. Everything else in the portal is a
 * window onto what the studio already recorded; approving a deliverable or
 * asking for a change is the actual decision only the client can make, so it
 * gets its own small form rather than a status the studio sets on their
 * behalf.
 */
export function DeliverableActions({ deliverable }: { deliverable: Deliverable }) {
  const [askingRevision, setAskingRevision] = useState(false);

  if (deliverable.approval !== "Awaiting client" || deliverable.clientReviewable===false) return null;

  if (askingRevision) {
    return (
      <Form action={requestRevision} onDone={() => setAskingRevision(false)}>
        <Hidden name="id" value={deliverable.id} />
        <Hidden name="version" value={String(deliverable.versions.at(-1)?.v ?? 0)} />
        <Area name="note" label="What needs to change" required rows={2} placeholder="Be as specific as you can -- this goes straight to the team." />
        <div className="ad__row">
          <Submit tone="primary" icon={MessageSquareWarning}>Send revision request</Submit>
          <button type="button" className="ad__btn" onClick={() => setAskingRevision(false)}>Cancel</button>
        </div>
      </Form>
    );
  }

  return (
    <div className="ad__row">
      <Form action={approveDeliverable}>
        <Hidden name="id" value={deliverable.id} />
        {/* The version on screen, so a newer one shared since cannot be
            approved without being seen. */}
        <Hidden name="version" value={String(deliverable.versions.at(-1)?.v ?? 0)} />
        <Submit tone="primary" icon={CheckCircle2}>Approve</Submit>
      </Form>
      <button type="button" className="ad__btn" onClick={() => setAskingRevision(true)}>
        <MessageSquareWarning aria-hidden="true" /> Request a revision
      </button>
    </div>
  );
}
