import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortalRequest } from "@/lib/portal/session";
import { getProject } from "@/lib/admin/store";
import { PortalThread } from "@/components/client/portal-thread";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export async function generateMetadata({ params }: { params: Promise<{ pid: string }> }): Promise<Metadata> {
  await syncStore();
  const { pid } = await params;
  const { allowedProjectIds } = await getPortalRequest();
  const p = allowedProjectIds.includes(pid) ? getProject(pid) : null;
  if (!p) notFound();
  return { title: `${p.title} · Messages` };
}

/** A project's channel, open in the client's two-pane Messages. Only projects this person may see; anything else is a 404. */
export default async function PortalProjectChannel({ params }: { params: Promise<{ pid: string }> }) {
  await syncStore();
  persistSoon();
  const { pid } = await params;
  const { client, session, isPrimaryContact, allowedProjectIds } = await getPortalRequest();
  const p = client && allowedProjectIds.includes(pid) ? getProject(pid) : null;
  if (!client || !p || p.archived) notFound();
  return <PortalThread client={client} userId={(session?.user as { id?: string } | undefined)?.id ?? ""} primary={isPrimaryContact} allowedProjectIds={allowedProjectIds} open={{ kind: "project", projectId: p.id }} />;
}
