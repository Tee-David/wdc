import { notFound, redirect } from "next/navigation";
import { getTicket } from "@/lib/admin/store";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { syncStore } from "@/lib/admin/persist";

/**
 * One client question now lives in Messages, beside every other
 * conversation, with the same reply box and status moves. This address is
 * kept so emails, notifications and bookmarks that point here still land on
 * the conversation.
 */
export default async function SupportThread({ params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  if (!can(await adminRole(), "clients")) notFound();
  const { id } = await params;
  if (!getTicket(id)) notFound();
  redirect(`/admin/messages?c=t-${encodeURIComponent(id)}`);
}
