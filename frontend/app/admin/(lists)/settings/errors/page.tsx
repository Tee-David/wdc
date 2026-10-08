import { db } from "@/lib/db/pool";
import { AdminState } from "@/components/admin/admin-state";
import { Empty, Panel, when } from "@/components/admin/bits";
import { Bug } from "lucide-react";

export const metadata = { title: "Error log" };

/** Server errors from the last 30 days, one line per distinct error per day. Owner only (Settings). */
export default async function ErrorLog() {
  let rows: { id: string; message: string; path: string | null; count: number; last_at: string; stack: string | null }[];
  try {
    rows = (await db.query(`SELECT id, message, path, count, last_at, stack FROM error_log WHERE last_at > now() - INTERVAL '30 days' ORDER BY last_at DESC LIMIT 100`)).rows;
  } catch {
    return <AdminState kind="error" title="The error log is not set up yet" description="Apply migration 0041 in Settings › System, then reload."
      back={{ href: "/admin/settings/system", label: "Open system health" }} />;
  }
  return (
    <Panel title="Server errors, last 30 days">
      {rows.length ? (
        <div className="ad__scroll" data-lenis-prevent>
          <table className="ad__t">
            <thead><tr><th>Error</th><th>Where</th><th className="num">Times</th><th>Last seen</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.message}</b>{r.stack ? <details><summary>First lines of the stack</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: ".78rem" }}>{r.stack}</pre></details> : null}</td>
                  <td>{r.path ?? "–"}</td><td className="num">{r.count}</td><td>{when(r.last_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title="No errors recorded" icon={Bug}>Unhandled server errors appear here with how often they happen.</Empty>}
    </Panel>
  );
}
