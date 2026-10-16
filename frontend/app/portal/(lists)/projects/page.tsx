import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHead } from "@/components/admin/page-head";
import { Tabs } from "@/components/admin/tabs";
import { UrlSearch } from "@/components/admin/url-search";
import { Pager, readPer } from "@/components/admin/pager";
import { projectGlyph, projectTileStyle } from "@/components/client/service-glyph";
import { Clock, FileCheck2, FolderKanban } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getDeliverablesFor, getProjects, getUpdatesFor } from "@/lib/admin/store";
import { STAGES } from "@/lib/admin/types";
import { SERVICES } from "@/lib/services";
import { Empty, StagePill, when } from "@/components/admin/bits";
import { initials } from "@/lib/admin/client-mark";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import "@/components/client/portal.css";
import "@/components/admin/project-page.css";

export const metadata = { title: "Projects" };

/**
 * THE CLIENT'S PROJECTS, as PProjects.dc.html draws them: one card each,
 * where it is on the six stages, and the one thing that is waiting on the
 * client if anything is. Active and delivered are two tabs so a finished
 * project stays findable without crowding the ones still moving.
 */
export default async function PortalProjects({ searchParams }: { searchParams: Promise<{ show?: string; q?: string; page?: string; per?: string }> }) {
  await syncStore();
  persistSoon();
  const { client, allowedProjectIds, reviewProjectIds, isPrimaryContact } = await getPortalRequest();
  if (!client) return null;
  const sp = await searchParams;
  const show = sp.show;

  const all = getProjects(true).filter(p => allowedProjectIds.includes(p.id));
  const isDone = (p: (typeof all)[number]) => p.archived || p.stage === "Delivered";
  const active = all.filter((p) => !isDone(p));
  const delivered = all.filter(isDone);
  /* As C-Projects draws it, Projects opens on the work itself: the first live
     project, with a switcher across the rest on its page. The list stays for
     finished work, a search, or "All projects" from that switcher. */
  if (!show && !sp.q && !sp.page && active.length) redirect(`/portal/projects/${active[0].id}`);
  const tab = show === "delivered" ? "delivered" : "active";
  const needle = String(sp.q ?? "").trim().slice(0, 80).toLocaleLowerCase();
  const matching = (tab === "delivered" ? delivered : active).filter((p) => !needle || `${p.title} ${p.owner}`.toLocaleLowerCase().includes(needle));
  const per = readPer(sp.per);
  const page = Math.min(Math.max(1, Math.ceil(matching.length / per)), Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const projects = matching.slice((page - 1) * per, page * per);
  const href = (patch: { show?: string; page?: string; per?: string }) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries({ show: tab === "delivered" ? "delivered" : "", q: sp.q, per: sp.per, ...patch })) if (v) n.set(k, v);
    const q = n.toString();
    return `/portal/projects${q ? `?${q}` : ""}`;
  };

  return (
    <>
      <PageHead title="Projects" lede={isPrimaryContact ? `Everything we are making for ${client.company}, and where each one is.` : "The projects you have been invited to, and where each one is."} />
      <div className="adPg__tabs">
        <Tabs label="Which projects" current={tab} items={[
          { key: "active", label: "Active", href: href({ show: undefined, page: undefined }), count: active.length },
          { key: "delivered", label: "Delivered", href: href({ show: "delivered", page: undefined }), count: delivered.length },
        ]} />
      </div>
      {all.length ? <div style={{ margin: "0 0 1rem" }}><UrlSearch label="Search projects" placeholder="Search projects" /></div> : null}

      {/* The tour's target wraps both the cards and the empty state, so a new
          client's tour lands on what they actually see. */}
      <div data-tour="portal-projects">
      {projects.length ? (
        <><div className="pProj" id="portal-projects-list">
          {projects.map((project) => {
            const service = SERVICES.find((s) => s.slug === project.service);
            const at = STAGES.indexOf(project.stage);
            const waiting = reviewProjectIds.includes(project.id) ? getDeliverablesFor(project.id).find((d) => d.approval === "Awaiting client") : undefined;
            const updates = getUpdatesFor(project.id).filter(u => u.clientVisible);
            const latest = updates.slice().sort((a, b) => b.at.localeCompare(a.at))[0];
            const opened = project.events[0]?.at;
            return (
              <article className="pProj__card" key={project.id} data-row>
                <header className="pProj__head">
                  <span className="pProj__icon" style={projectTileStyle(project)} aria-hidden="true">{projectGlyph(project)}</span>
                  <span className="pProj__name">
                    <Link href={`/portal/projects/${project.id}`} className="pProj__link"><b>{project.title}</b></Link>
                    <small>{service?.short ?? project.service} · {project.due ? `due ${when(project.due)}` : "date to be agreed"}</small>
                  </span>
                  {waiting ? <span className="ad__pill ad__pill--live">Your review</span> : <StagePill stage={project.stage} />}
                </header>

                <ol className="pProj__stages" aria-label={`Stage ${at + 1} of ${STAGES.length}: ${project.stage}`}>
                  {STAGES.map((s, i) => (
                    <li key={s} className={i < at ? "is-done" : i === at ? "is-now" : undefined} aria-current={i === at ? "step" : undefined}>
                      <i aria-hidden="true" /><span>{s}</span>
                    </li>
                  ))}
                </ol>
                <small className="pProj__stageNow" aria-hidden="true">Stage {at + 1} of {STAGES.length} · {project.stage}</small>

                {waiting ? (
                  <div className="pProj__wait pProj__wait--you">
                    <span className="ad__tileIcon ad__tileIcon--live" aria-hidden="true"><FileCheck2 /></span>
                    <p><b>{waiting.name}</b> is waiting for you</p>
                    <Link className="ad__btn ad__btn--primary" href={`/portal/projects/${project.id}#deliverables`}>Review</Link>
                  </div>
                ) : isDone(project) ? null : (
                  <div className="pProj__wait">
                    <span className="ad__tileIcon ad__tileIcon--neutral" aria-hidden="true"><Clock /></span>
                    <p>{latest?.next ? <><b>Next:</b> {latest.next}</> : "Nothing needed from you yet."}</p>
                  </div>
                )}

                <footer className="pProj__foot">
                  <span className="pProj__lead">
                    <span className="ad__av ad__av--sm ad__av--brand" aria-hidden="true">{initials(project.owner)}</span>
                    {project.owner.split(/\s+/)[0]} leads this
                  </span>
                  <span className="ad__dim">
                    {latest ? `Last update ${when(latest.at)}` : opened ? `Opened ${when(opened)}` : null}
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
        <div className="adList" style={{ marginTop: "1rem" }}><Pager label="Project pages" total={matching.length} page={page} per={per} noun={matching.length === 1 ? "project" : "projects"}
          href={(patch) => href({ page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : sp.per })} /></div></>
      ) : (
        <div className="ad__panel">
          {needle ? <Empty title="No project matches" icon={FolderKanban} action={<Link className="ad__btn" href={href({ page: undefined, per: undefined }).replace(/[?&]q=[^&]*/, "")}>Clear search</Link>}>Try fewer words.</Empty> : tab === "delivered"
            ? <Empty title="Nothing delivered yet" icon={FolderKanban}>Finished projects move here, with everything we handed over.</Empty>
            : delivered.length
              ? <Empty title="Nothing in progress right now" icon={FolderKanban}
                  action={<Link className="ad__btn" href="/portal/projects?show=delivered">See delivered projects</Link>}>
                  {delivered.length === 1 ? "Your finished project is" : `Your ${delivered.length} finished projects are`} under Delivered, with everything we handed over.
                </Empty>
              : <Empty title="No projects yet" icon={FolderKanban}>Once we start work with {client.company}, projects will appear here with their status and deliverables.</Empty>}
        </div>
      )}
      </div>
    </>
  );
}
