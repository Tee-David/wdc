import { CalendarDays, FileText, Flag, MessageSquare, PlayCircle } from "lucide-react";
import { Panel, when } from "@/components/admin/bits";
import type { Deliverable, Project, Update } from "@/lib/admin/types";
import { meetingList } from "@/lib/meetings/store";

/**
 * THE PROJECT ON ONE LINE, for the client: when it started, what was sent to
 * them, what the studio said, the calls held and booked, and the date it is
 * due. Only what a client may see (visible updates, delivered versions, their
 * own meetings); the studio's internal history is never read here.
 */
type Item = { at: string; label: string; icon: typeof FileText; future?: boolean };

/** The clock and the meeting window, read outside the render. */
const clock = () => Date.now();
const iso = (offsetDays: number) => new Date(clock() + offsetDays * 86_400_000).toISOString();

export async function ProjectTimeline({ project, email, updates, deliverables, started }: {
  project: Project; email: string; updates: Update[]; deliverables: Deliverable[]; started: string | null;
}) {
  const now = iso(0);
  const mail = email.trim().toLowerCase();
  const meetings = (await meetingList(iso(-365), iso(365)).catch(() => []))
    .filter((m) => ["accepted", "confirmed"].includes(String(m.status).toLowerCase()) && (m.attendees ?? []).some((a) => a.email?.trim().toLowerCase() === mail));
  const items: Item[] = [
    ...(started ? [{ at: started, label: "Project started", icon: PlayCircle }] : []),
    ...deliverables.flatMap((d) => d.versions.map((v) => ({ at: v.sharedAt ?? v.at, label: `${d.name} version ${v.v} ${v.sharedAt ? "shared with you" : "available (creation date)"}`, icon: FileText }))),
    ...updates.map((u) => ({ at: u.at, label: `Update from ${u.author}`, icon: MessageSquare })),
    ...meetings.map((m) => ({ at: m.start, label: m.title, icon: CalendarDays, future: m.start > now })),
    ...(project.due ? [{ at: project.due, label: "Due date", icon: Flag, future: project.due > now }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at));
  if (items.length < 2) return null;
  return (
    <Panel title="Timeline">
      <ol className="cpLine">
        {items.map((i, n) => {
          const Icon = i.icon;
          return (
            <li key={`${i.at}-${n}`} className={i.future ? "is-ahead" : undefined}>
              <span aria-hidden="true"><Icon /></span>
              <b>{i.label}</b>
              <small>{when(i.at)}{i.future ? " · coming up" : ""}</small>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
