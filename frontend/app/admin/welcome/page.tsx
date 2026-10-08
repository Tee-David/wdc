import { redirect } from "next/navigation";
import { getAdminRequest } from "@/lib/admin/session";
import { listDepartments } from "@/lib/departments";
import { Panel } from "@/components/admin/bits";
import { StaffWelcomeActions } from "@/components/admin/staff-welcome";

export const metadata = { title: "Welcome" };

/**
 * A new member of staff's first screen, like the client's: who they are here,
 * what they can and cannot do, their departments, a theme, then the dashboard.
 * Shown once (the layout sends staff here while their setup is pending).
 */
export default async function StaffWelcome() {
  const { session } = await getAdminRequest();
  const user = session?.user as { id: string; name?: string; role?: string } | undefined;
  if (!user || user.role !== "staff") redirect("/admin");
  const mine = (await listDepartments())?.filter((d) => d.members.some((m) => m.id === user.id)) ?? [];
  const first = (user.name ?? "").split(/\s+/)[0] || "there";
  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Welcome, {first}</h1>
          <p>Your account is ready. Here is what you can do, and what stays with the owner.</p>
        </div>
      </div>
      <div className="ad__stack">
        <Panel title="What you work on">
          <ul style={{ margin: 0, padding: "1rem 1.25rem 1rem 2.25rem", display: "grid", gap: ".4rem" }}>
            <li><b>Clients and projects:</b> records, stages, tasks, updates and deliverables.</li>
            <li><b>Forms:</b> read briefs and enquiries, assign them to a client, and look after the inbox.</li>
            <li><b>The blog:</b> write drafts and send them for review.</li>
            <li><b>Not here:</b> money, settings, team changes and exports. Those belong to the owner.</li>
          </ul>
        </Panel>
        <Panel title="Your departments">
          <p style={{ margin: 0, padding: "1rem 1.25rem" }}>
            {mine.length ? `You are in ${mine.map((d) => d.name).join(", ")}.` : "You are not in a department yet. The owner can add you."}
          </p>
        </Panel>
        <Panel title="Make it yours">
          <div style={{ padding: "1rem 1.25rem" }}>
            <p style={{ marginTop: 0 }}>The ? button beside search starts a short tour of every page, and you can replay it whenever you like.</p>
            <StaffWelcomeActions />
          </div>
        </Panel>
      </div>
    </>
  );
}
