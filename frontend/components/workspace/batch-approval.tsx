"use client";

import { Send } from "lucide-react";
import { PlanRun } from "@/components/admin/retainer-card";
import { sendPostsForApproval } from "@/lib/workspace/service-actions";

/** "Send 6 posts for approval": every post still with the team goes to the client together, in one email. */
export function BatchApproval({ projectId, count, company }: { projectId: string; count: number; company: string }) {
  return (
    <PlanRun tone="primary" icon={Send} label={`Send ${count} ${count === 1 ? "post" : "posts"} for approval`}
      question={`Send ${count} ${count === 1 ? "post" : "posts"} to ${company} for approval? They get one email with the list and approve each post in their portal.`}
      run={() => sendPostsForApproval(projectId)} />
  );
}
