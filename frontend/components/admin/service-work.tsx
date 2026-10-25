import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, FileText, Hammer, Layers, ListChecks, Megaphone, Rocket, Search, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import type { ServiceRecord } from "@/lib/workspace/service-model";
import { StatTiles, type StatProps } from "./workbench";
import { dateWords, nowMs, whenWords } from "@/lib/admin/when";
import "./service-work.css";

/**
 * THE SERVICE'S OWN WORK, read from the workspace records (the approved board,
 * "Rounds and assets" for branding, "Builds" for apps and so on). Every service
 * gets its own figures and lists, because a branding project is counted in
 * review rounds and an app in test builds; nothing here is shared filler.
 *
 * Everything is derived from persisted records: no figure is typed in, and an
 * empty list says what to add rather than showing a sample. Each row opens the
 * record in the workspace below (`?item=`), where versions and decisions live.
 */
type Sect = { kind: string; title: string; sub: string; empty: string; detail?: (r: ServiceRecord) => string; order?: (a: ServiceRecord, b: ServiceRecord) => number };
type Spec = { label: string; icon: LucideIcon; sections: Sect[]; stats: (r: ServiceRecord[]) => StatProps[] };

const DONE = ["approved", "accepted", "passed", "resolved", "released", "published", "store_approved", "launched", "acknowledged", "supplied", "received", "closed", "ended", "scheduled"];
const BAD = ["failed", "rejected", "declined", "changes_requested", "reopened"];

const WORDS: Record<string, string> = {
  client_review: "With the client", internal_review: "Studio review", changes_requested: "Changes asked", in_progress: "In progress",
  platform_review: "Platform review", store_approved: "Store approved", draft: "Draft", open: "Open", testing: "Testing",
};
export const stateWords = (s: string) => WORDS[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
const tone = (s: string) => (DONE.includes(s) ? "good" : BAD.includes(s) ? "bad" : s === "client_review" ? "warn" : "flat");

const of = (rs: ServiceRecord[], k: string) => rs.filter((r) => r.kind === k);
const n = (x: number) => String(x);
const days = (iso: string) => Math.max(0, Math.floor((nowMs() - Date.parse(iso)) / 86_400_000));

/** The oldest thing waiting on the client, in days: the figure that says who the project is waiting on. */
function waiting(rs: ServiceRecord[]): StatProps {
  const w = rs.filter((r) => r.state === "client_review").sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  const d = w.length ? days(w[0].updated_at) : 0;
  return {
    label: "Waiting on the client", value: w.length ? `${d} ${d === 1 ? "day" : "days"}` : "Nothing",
    note: w.length ? `${w.length} ${w.length === 1 ? "piece" : "pieces"} with them` : "No decision pending", noteTone: d >= 5 ? "bad" : undefined,
    icon: Clock, tone: w.length ? (d >= 5 ? "bad" : "warn") : "good",
  };
}
const progress = (label: string, rs: ServiceRecord[], icon: LucideIcon, doneWord = "done"): StatProps => {
  const done = rs.filter((r) => DONE.includes(r.state)).length;
  return { label, value: rs.length ? `${done} of ${rs.length}` : "None yet", note: rs.length ? `${rs.length - done} not ${doneWord}` : "Add the first one", icon, tone: "brand" };
};
const openIssues = (label: string, rs: ServiceRecord[]): StatProps => {
  const open = rs.filter((r) => !DONE.includes(r.state)).length;
  return { label, value: n(open), note: open ? `${rs.length - open} resolved` : rs.length ? "All resolved" : "None reported", icon: AlertTriangle, tone: open ? "warn" : "good" };
};

const COMMON: Sect[] = [
  { kind: "request", title: "What the client provides", sub: "Ticked when it arrives. Work that needs it waits.", empty: "Nothing asked of the client yet. Add a request for any file, login or answer the work needs.", detail: (r) => r.data.responsible ? `From ${r.data.responsible}` : "" },
  { kind: "change", title: "Scope changes", sub: "Asked, priced and accepted before the work starts.", empty: "No change to the agreed scope.", detail: (r) => r.data.cost ? `₦${Number(r.data.cost).toLocaleString("en-NG")}` : "" },
  { kind: "handover", title: "Handover", sub: "The final package and who owns what.", empty: "Nothing handed over yet." },
];

const SPECS: Record<string, Spec> = {
  branding: {
    label: "Rounds and assets", icon: Sparkles,
    sections: [
      { kind: "design_round", title: "Review rounds", sub: "Each round goes to the client for a decision before the next starts.", empty: "No round sent yet. Add round 1 when the first routes are ready.", detail: (r) => (r.data.round ? `Round ${r.data.round}` : ""), order: (a, b) => Number(a.data.round || 0) - Number(b.data.round || 0) },
      { kind: "direction", title: "Creative directions", sub: "The strategy behind each route.", empty: "No direction recorded." },
    ],
    stats: (rs) => [progress("Rounds decided", of(rs, "design_round"), Layers, "decided"), waiting(rs), progress("Client assets in", of(rs, "request"), ListChecks, "in")],
  },
  social: {
    label: "Content calendar", icon: Megaphone,
    sections: [{ kind: "post", title: "Posts", sub: "Planned, approved by the client, then published with the live link.", empty: "No post planned yet.", detail: (r) => [r.data.platform, r.data.plannedAt ? dateWords(r.data.plannedAt) : ""].filter(Boolean).join(" · ") }],
    stats: (rs) => [progress("Posts published", of(rs, "post").filter((r) => r.state !== "failed"), Megaphone, "published"), waiting(rs), openIssues("Failed to publish", of(rs, "post").filter((r) => r.state === "failed"))],
  },
  web: {
    label: "Build and launch", icon: Rocket,
    sections: [
      { kind: "uat", title: "Tests and issues", sub: "Each page or journey tested, failed ones fixed and tested again.", empty: "No test recorded yet.", detail: (r) => r.data.page ?? "" },
      { kind: "launch", title: "Launch permission", sub: "The client approves the exact build before it goes live.", empty: "Launch not asked for yet." },
    ],
    stats: (rs) => [openIssues("Open issues", of(rs, "uat")), progress("Tests passed", of(rs, "uat"), CheckCircle2, "passed"), waiting(rs)],
  },
  apps: {
    label: "Builds", icon: Smartphone,
    sections: [
      { kind: "build", title: "Test builds", sub: "Each build is tested, approved, then sent to the stores.", empty: "No build shared yet.", detail: (r) => r.data.build ?? "" },
      { kind: "app_issue", title: "Issues", sub: "Found on a device, fixed, then tested again.", empty: "No issue reported.", detail: (r) => [r.data.build, r.data.device].filter(Boolean).join(" · ") },
    ],
    stats: (rs) => [progress("Builds approved", of(rs, "build"), Smartphone, "approved"), openIssues("Open issues", of(rs, "app_issue")), waiting(rs)],
  },
  software: {
    label: "Milestones", icon: Hammer,
    sections: [
      { kind: "milestone", title: "Milestones", sub: "Agreed requirements, built, then accepted by the client.", empty: "No milestone set yet." },
      { kind: "ai_evaluation", title: "AI checks", sub: "What the model may use, how it was tested and its limits.", empty: "No AI evaluation recorded." },
    ],
    stats: (rs) => [progress("Milestones accepted", of(rs, "milestone"), Hammer, "accepted"), waiting(rs), openIssues("Changes asked", rs.filter((r) => r.state === "changes_requested"))],
  },
  seo: {
    label: "Content", icon: Search,
    sections: [
      { kind: "article", title: "Articles", sub: "Outlined, checked, approved, then published.", empty: "No article in progress." },
      { kind: "report", title: "Reports", sub: "What changed in the period and what comes next.", empty: "No report shared yet.", detail: (r) => (r.data.periodStart && r.data.periodEnd ? `${dateWords(r.data.periodStart)} to ${dateWords(r.data.periodEnd)}` : "") },
    ],
    stats: (rs) => [progress("Articles published", of(rs, "article"), FileText, "published"), waiting(rs), progress("Reports acknowledged", of(rs, "report"), CheckCircle2, "acknowledged")],
  },
  ads: {
    label: "Campaigns", icon: Megaphone,
    sections: [
      { kind: "creative", title: "Creatives", sub: "Approved by the client before any money is spent.", empty: "No creative yet." },
      { kind: "budget", title: "Spend approvals", sub: "The most the client agreed to spend, and for when.", empty: "No spend approved yet.", detail: (r) => (r.data.amount ? `Up to ₦${Number(r.data.amount).toLocaleString("en-NG")}` : "") },
      { kind: "campaign", title: "Campaigns", sub: "Live on the platform, with the real results recorded.", empty: "No campaign running." },
    ],
    stats: (rs) => [progress("Creatives approved", of(rs, "creative"), Megaphone, "approved"), waiting(rs), progress("Campaigns ended", of(rs, "campaign"), CheckCircle2, "ended")],
  },
};

export const serviceWorkLabel = (service: string) => SPECS[service]?.label ?? "Service work";

export function ServiceWork({ projectId, service, records, staff }: { projectId: string; service: string; records: ServiceRecord[]; staff: boolean }) {
  const spec = SPECS[service];
  if (!spec) return null;
  /* Money stays with Admin: staff never see spend or change prices. */
  const sections = [...spec.sections, ...COMMON].filter((s) => !(staff && (s.kind === "budget" || s.kind === "change")));
  const open = (id: string) => `/admin/projects/${projectId}?tab=work&item=${id}`;
  return (
    <div className="svw">
      <StatTiles items={spec.stats(records)} />
      {sections.map((s) => {
        const rows = of(records, s.kind).slice().sort(s.order ?? ((a, b) => b.updated_at.localeCompare(a.updated_at)));
        const isChecks = s.kind === "request";
        return (
          <section key={s.kind} className="adList" aria-label={s.title}>
            <div className="adList__hd"><h2>{s.title}</h2><span className="adList__n">{rows.length}</span></div>
            <p className="svw__sub">{s.sub}</p>
            {rows.length ? (
              <ul className="svw__list">
                {rows.map((r) => {
                  const t = tone(r.state);
                  const d = s.detail?.(r);
                  const detail = d && !r.title.toLowerCase().includes(d.toLowerCase()) ? d : "";
                  return (
                    <li key={r.id}>
                      <Link className="svw__row" href={open(r.id)} scroll={false}>
                        {isChecks ? (
                          <span className={`svw__tick${DONE.includes(r.state) ? " is-on" : ""}`} aria-hidden="true"><CheckCircle2 /></span>
                        ) : null}
                        <span className="svw__txt">
                          <strong>{r.title}</strong>
                          <span>{[detail, `Version ${r.version}`, `Updated ${whenWords(r.updated_at)}`].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className={`ad__pill ad__pill--${t}`}>{isChecks && DONE.includes(r.state) ? "Received" : stateWords(r.state)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="svw__empty">{s.empty}</p>}
          </section>
        );
      })}
    </div>
  );
}
