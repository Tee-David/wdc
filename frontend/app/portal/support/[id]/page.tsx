import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortalRequest } from "@/lib/portal/session";
import { getTicket } from "@/lib/admin/store";
import { PortalThread } from "@/components/client/portal-thread";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const { client, isPrimaryContact } = await getPortalRequest();
  const t = client ? getTicket(id) : null;
  if (!t || !client || !isPrimaryContact || t.clientId !== client.id) notFound();
  return { title: t.subject };
}

/** One of the client's questions, open in the two-pane Messages (components/client/portal-thread.tsx). */
export default async function PortalTicketThread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const sp = await searchParams;
  const { client, session, isPrimaryContact, allowedProjectIds } = await getPortalRequest();
  const t = client ? getTicket(id) : null;
  if (!t || !client || !isPrimaryContact || t.clientId !== client.id) notFound();
  return <PortalThread client={client} userId={(session?.user as { id?: string } | undefined)?.id ?? ""} primary={isPrimaryContact} allowedProjectIds={allowedProjectIds} open={{ kind: "ticket", ticket: t }} show={sp.show} />;
}
