import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getProjectsFor } from "@/lib/admin/store";
import { SERVICES } from "@/lib/services";
import { Empty, Panel, StagePill } from "@/components/admin/bits";

export const metadata = { title: "Projects" };

export default async function PortalProjects() {
  const { client } = await getPortalRequest();
  if (!client) return null;

  const projects = getProjectsFor(client.id, true);

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <h1>Your projects</h1>
          <p>Everything we are building or have delivered for {client.company}.</p>
        </div>
      </header>

      <Panel title={`${projects.length} project${projects.length === 1 ? "" : "s"}`}>
        {projects.length ? (
          <div className="adDash__compactList">
            {projects.map((project) => {
              const service = SERVICES.find((s) => s.slug === project.service);
              return (
                <Link href={`/portal/projects/${project.id}`} key={project.id}>
                  <span className="adDash__listIcon"><FolderKanban aria-hidden="true" /></span>
                  <span><b>{project.title}</b><small>{service?.short ?? project.service}</small></span>
                  <StagePill stage={project.stage} />
                  <ArrowRight aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty title="No projects yet" icon={FolderKanban}>Once we start work with {client.company}, projects will appear here with their status and deliverables.</Empty>
        )}
      </Panel>
    </div>
  );
}
