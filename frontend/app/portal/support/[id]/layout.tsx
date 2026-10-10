import { notFound } from "next/navigation";
import { syncStore } from "@/lib/admin/persist";
import { getTicket } from "@/lib/admin/store";
import { getPortalRequest } from "@/lib/portal/session";

/**
 * A MISSING RECORD IS A 404, with the status to match. The page streams
 * behind its loading skeleton, and Next streams metadata too, so a notFound()
 * from either arrives on a 200. A layout sits outside that boundary, so the
 * question is asked here before anything is sent. The page still asks again, ownership included.
 */
export default async function RecordLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  await syncStore();
  const { id } = await params;
  const { client, isPrimaryContact } = await getPortalRequest();
  const t = client ? getTicket(id) : null;
  if (!t || !client || !isPrimaryContact || t.clientId !== client.id) notFound();
  return children;
}
