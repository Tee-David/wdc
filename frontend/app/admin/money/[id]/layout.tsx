import { notFound } from "next/navigation";
import { syncStore } from "@/lib/admin/persist";
import { getInvoice } from "@/lib/admin/store";

/**
 * A MISSING RECORD IS A 404, with the status to match. The page streams
 * behind its loading skeleton, and Next streams metadata too, so a notFound()
 * from either arrives on a 200. A layout sits outside that boundary, so the
 * question is asked here before anything is sent. The page still asks again.
 */
export default async function RecordLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  await syncStore();
  const { id } = await params;
  if (!getInvoice(id)) notFound();
  return children;
}
