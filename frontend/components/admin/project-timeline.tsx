import Link from "next/link";
import { STAGES } from "@/lib/admin/types";
import type { ProjectRow } from "@/lib/admin/project-signals";
import "./project-timeline.css";

/**
 * THE TIMELINE: a row per project, a bar from when it started to when it is due, filled by how far along
 * its stages it is, with a line for today. Server rendered, no script. A project with no due date says so
 * in the row instead of inventing an end. The week columns start the Monday before today and run at
 * least eight weeks, longer when something is due later (never more than twenty six).
 */
const SH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };

export function ProjectTimeline({ rows, today }: { rows: ProjectRow[]; today: string }) {
  const t = parse(today);
  const monday = t - ((new Date(t).getUTCDay() + 6) % 7) * DAY - 7 * DAY;
  const lastDue = Math.max(0, ...rows.filter((r) => r.due).map((r) => parse(r.due)));
  const weeks = Math.min(26, Math.max(8, Math.ceil((lastDue - monday) / (7 * DAY)) + 1));
  const span = weeks * 7 * DAY;
  const frac = (ms: number) => Math.max(0, Math.min(1, (ms - monday) / span));
  const labels = Array.from({ length: weeks }, (_, i) => { const d = new Date(monday + i * 7 * DAY); return `${d.getUTCDate()} ${SH[d.getUTCMonth()]}`; });

  return (
    <div className="adTlv" tabIndex={0} role="region" aria-label="Project timeline, scrolls sideways and down" data-lenis-prevent>
      <div className="adTlv__in" style={{ "--wk": weeks, "--today": frac(t + DAY / 2) } as React.CSSProperties}>
        <div className="adTlv__head">
          <span className="adTlv__corner">Project</span>
          <div className="adTlv__axis">{labels.map((l, i) => <span key={i} className="adTlv__wk">{l}</span>)}<span className="adTlv__pillT" aria-hidden="true">Today</span></div>
        </div>
        <div className="adTlv__body">
          {rows.map((r) => {
            const p = r.project;
            const start = r.started && parse(r.started) < (r.due ? parse(r.due) : Infinity) ? parse(r.started) : t;
            const end = r.due ? parse(r.due) + DAY : 0;
            const l = frac(Math.max(start, monday)), rt = end ? frac(end) : 0;
            const tone = p.health === "Blocked" ? "var(--ad-tone-bad)" : p.health === "On track" ? "var(--ad-series-1)" : "var(--ad-tone-warn)";
            const late = end && end < t;
            const label = `${p.stage}, ${r.stageIndex + 1} of ${STAGES.length}`;
            return (
              <div key={p.id} className="adTlv__row">
                <Link href={`/admin/projects/${p.id}`} className="adTlv__name"><strong>{p.title}</strong><span>{r.client?.company ?? "Unknown client"}</span></Link>
                <div className="adTlv__track">
                  {end ? (
                    <Link href={`/admin/projects/${p.id}`} className="adTlv__bar" style={{ left: `${l * 100}%`, width: `${Math.max(rt - l, 0.03) * 100}%`, "--c": tone } as React.CSSProperties}
                      aria-label={`${p.title}. ${label}. ${late ? "Overdue, was due" : "Due"} ${r.due}`}>
                      <span className="adTlv__txt">{label}{late ? ", overdue" : ""}</span>
                      <span className="adTlv__rail"><span className="adTlv__fill" style={{ width: `${r.progress * 100}%` }} /></span>
                    </Link>
                  ) : <span className="adTlv__none">{p.stage}. No due date set</span>}
                </div>
              </div>
            );
          })}
        </div>
        <span className="adTlv__todayLine" aria-hidden="true" />
      </div>
    </div>
  );
}
