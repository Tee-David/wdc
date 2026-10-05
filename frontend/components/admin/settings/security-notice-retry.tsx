"use client";
import { Form, Hidden, Submit } from "../form";
import { retrySecurityNotice } from "@/lib/admin/user-actions";
export function SecurityNoticeRetry({ noticeId }: { noticeId: string }) {
  return <Form action={retrySecurityNotice}><Hidden name="noticeId" value={noticeId} /><Submit>Queue notice</Submit></Form>;
}
