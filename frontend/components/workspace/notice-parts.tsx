"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, CheckCheck, Mail, Settings2 } from "lucide-react";
import { Dialog, DialogButton } from "@/components/admin/dialog";
import { Checks, Form, Hidden, Submit } from "@/components/admin/form";
import { RowMenu } from "@/components/admin/row-menu";
import { dateTimeWords, dateWords } from "@/lib/admin/when";
import { markAllWorkspaceNotifications, markWorkspaceNotification, retryWorkspaceNotification } from "@/lib/workspace/notifications-actions";
import type { WorkspaceNotification } from "@/lib/workspace/notifications-store";
import type { NotificationPreferences } from "@/lib/workspace/notifications-policy";
import { NotificationPreferencesForm } from "./notifications-inbox";

export const CATEGORY_LABEL: Record<string, string> = { actions: "Reviews and decisions", progress: "Project progress", support: "Support and replies", billing: "Billing and agreements", reminders: "Deadline reminders" };

/** The page's one action: every unread notice becomes read. */
export function MarkAllRead({ disabled }: { disabled?: boolean }) {
  return (
    <Form action={markAllWorkspaceNotifications}>
      <Submit icon={CheckCheck} disabled={disabled}>Mark all as read</Submit>
    </Form>
  );
}

/** The ⋮ in the head: the person's own email preferences. */
export function NoticeChores({ preferences, readOnly }: { preferences: NotificationPreferences; readOnly: boolean }) {
  if (readOnly) return null;
  return (
    <RowMenu label="notifications, more" items={[
      { kind: "dialog", label: "Email preferences", title: "Your personal email preferences", icon: Settings2, render: () => <NotificationPreferencesForm preferences={preferences} /> },
    ]} />
  );
}

const EMAIL: Record<string, string> = {
  accepted: "The provider accepted the email; arrival in the inbox is not confirmed.",
  failed: "Email acceptance failed. Request a safe retry below.",
  sending: "An email attempt is in progress; acceptance has not been confirmed.",
  skipped: "Email was skipped by a preference or a changed action.",
  pending: "Email or summary queued.",
};

/** The notice sheet: `?open=<id>` on the address shows one notice with its record link, mark read and retry. */
export function NoticeSheet({ notices, readOnly }: { notices: WorkspaceNotification[]; readOnly: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const id = params.get("open");
  const n = id ? notices.find((x) => x.id === id) ?? null : null;
  const close = () => { const p = new URLSearchParams(params.toString()); p.delete("open"); router.replace(`${path}${p.size ? `?${p}` : ""}`, { scroll: false }); };
  return (
    <Dialog open={!!n} onClose={close} title="Notification">
      {n ? (
        <div className="meetSheet">
          <h3>{n.title}</h3>
          <p className="ad__dim">{n.actorName} · {dateTimeWords(n.createdAt)}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{n.summary}</p>
          {n.dueAt && !n.cancelledAt ? <p><b>Due {dateWords(n.dueAt)}</b></p> : null}
          <p><span className={`ad__pill ad__pill--${n.visibility === "internal" ? "flat" : "brand"}`}>{n.visibility === "internal" ? "Internal team only" : "Client visible"}</span></p>
          <p className="meetHint">Email points to this record. The decision and history remain here.</p>
          <div className="meetActions">
            <Link className="ad__btn ad__btn--primary" href={n.href}>Open the record<ArrowUpRight aria-hidden="true" /></Link>
            {!readOnly && !n.readAt ? <Form action={markWorkspaceNotification} onDone={() => router.refresh()}><Hidden name="id" value={n.id} /><Submit tone="plain" icon={Check}>Mark read</Submit></Form> : null}
          </div>
          <p className="meetHint"><Mail aria-hidden="true" style={{ width: "1rem", height: "1rem", verticalAlign: "-.15em", marginRight: ".35rem" }} />{EMAIL[n.emailState ?? ""] ?? "In-app record."}</p>
          {!readOnly && ["failed", "sending"].includes(n.emailState ?? "") && !n.cancelledAt ? (
            <DialogButton label="Review retry" title="Retry this notification" tone="plain">
              {(done) => (
                <Form action={retryWorkspaceNotification} onDone={done}>
                  <Hidden name="id" value={n.id} />
                  <p>If an earlier attempt was interrupted, the email may already have arrived. A retry is a deliberate second attempt. Completed or replaced actions cannot be retried.</p>
                  <Checks name="understand" label="Before retrying" long options={[{ value: "1", label: "I understand that this can send another copy." }]} />
                  <Submit>Queue retry</Submit>
                </Form>
              )}
            </DialogButton>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
