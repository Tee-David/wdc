import Link from "next/link";
import { db } from "@/lib/db/pool";
import { Panel } from "./bits";

/** The first seven days after a new member of staff finishes (or skips) the welcome: four places to start. Gone after that. */
export async function FirstWeek({ userId }: { userId: string }) {
  const recent = await db.query(
    `SELECT 1 FROM client_profile_preferences WHERE user_id = $1 AND setup_state IN ('completed','skipped') AND finished_at > now() - INTERVAL '7 days'`, [userId],
  ).then((r) => Boolean(r.rowCount)).catch(() => false);
  if (!recent) return null;
  return (
    <Panel title="Your first week">
      <ol style={{ margin: 0, padding: "1rem 1.25rem 1rem 2.4rem", display: "grid", gap: ".5rem" }}>
        <li>Find your projects in <b>My work</b> above. If it is empty, ask the owner to name you as answerable on one.</li>
        <li>Open a <Link href="/admin/clients">client</Link> and read their notes and recent activity before you write to them.</li>
        <li>Press the <b>?</b> beside search for a short tour of any page, and replay it whenever you like.</li>
        <li>Tick tasks off as you finish them: the client sees progress, and your list stays true.</li>
      </ol>
    </Panel>
  );
}
