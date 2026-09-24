import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getTicketsFor } from "@/lib/admin/store";
import { Empty, Panel, when } from "@/components/admin/bits";
import { NewTicketForm } from "@/components/client/new-ticket-form";

export const metadata = { title: "Support" };

const STATUS_CLASS: Record<string, string> = {
  Open: "ad__pill--warn",
  Answered: "ad__pill--good",
  Closed: "ad__pill--flat",
};

export default async function PortalSupport({
  searchParams,
}: { searchParams: Promise<{ new?: string; subject?: string; project?: string }> }) {
  const { client } = await getPortalRequest();
  if (!client) return null;
  const sp = await searchParams;
  const startOpen = sp.new === "1";

  const tickets = getTicketsFor(client.id);

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <h1>Support</h1>
          <p>Ask us anything about your account, a project, or an invoice.</p>
        </div>
      </header>

      <div style={{ marginBottom: ".9rem" }}>
        <NewTicketForm startOpen={startOpen} subject={sp.subject} projectId={sp.project} />
      </div>

      <Panel dataTour="portal-support" title={`${tickets.length} conversation${tickets.length === 1 ? "" : "s"}`}>
        {tickets.length ? (
          <div className="adDash__compactList">
            {tickets.map((t) => (
              <Link href={`/portal/support/${t.id}`} key={t.id}>
                <span className="adDash__listIcon"><LifeBuoy aria-hidden="true" /></span>
                <span><b>{t.subject}</b><small>Started {when(t.createdAt)}</small></span>
                <span className={`ad__pill ${STATUS_CLASS[t.status]}`}>{t.status}</span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="No conversations yet" icon={LifeBuoy}>Questions you raise with the studio appear here, with replies in the same thread.</Empty>
        )}
      </Panel>
    </div>
  );
}
