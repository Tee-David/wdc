import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CalendarDays, FolderKanban, LifeBuoy } from "lucide-react";
import { getClient, getProject, getTicket, getTicketMessages } from "@/lib/admin/store";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { Panel, when } from "@/components/admin/bits";
import { ProfileCard } from "@/components/admin/profile-card";
import { Conversation } from "@/components/admin/conversation";
import { StudioReply, TicketStatusButtons } from "@/components/admin/ticket-controls";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const t = getTicket((await params).id);
  return { title: t ? t.subject : "Support" };
}

const PILL: Record<string, string> = { Open: "ad__pill--warn", Answered: "ad__pill--good", Closed: "ad__pill--flat" };
const LABEL: Record<string, string> = { Open: "Waiting on us", Answered: "Answered", Closed: "Closed" };

/** One client question: who asked, about what, the conversation, and the reply. */
export default async function SupportThread({ params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  persistSoon();
  if (!can(await adminRole(), "clients")) notFound();
  const t = getTicket((await params).id);
  if (!t) notFound();
  const client = getClient(t.clientId);
  const project = t.projectId ? getProject(t.projectId) : null;
  const messages = getTicketMessages(t.id);

  return (
    <>
      <ProfileCard
        crumbs={[{ href: "/admin/clients", label: "Clients" }, { href: "/admin/clients/support", label: "Support" }]}
        icon={<LifeBuoy />}
        tone={t.status === "Open" ? "live" : "brand"}
        title={t.subject}
        pills={<span className={`ad__pill ${PILL[t.status]}`}>{LABEL[t.status]}</span>}
        lines={<>
          {client ? <Link href={`/admin/clients/${client.id}`}><Building2 aria-hidden="true" />{client.company}, {client.name}</Link> : <span>Unknown client</span>}
          {project ? <Link href={`/admin/projects/${project.id}`}><FolderKanban aria-hidden="true" />{project.title}</Link> : null}
          <span><CalendarDays aria-hidden="true" />Opened {when(t.createdAt)}</span>
        </>}
        actions={<TicketStatusButtons ticketId={t.id} status={t.status} />}
      />
      <Panel title={`Conversation (${messages.length})`}>
        <Conversation messages={messages} me="studio" />
        <div className="adConv__reply">
          {t.status === "Closed"
            ? <p className="ad__dim">Closed. Reopen it to reply, or it reopens by itself if the client writes again.</p>
            : <StudioReply ticketId={t.id} />}
        </div>
      </Panel>
    </>
  );
}
