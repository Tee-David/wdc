import { requireProjectActor } from '@/lib/workspace/access';
import { ServiceWorkspace } from './service-workspace';
import { TeamWorkspace, ClientProjectUpdates } from './team-workspace';
import { getWorkspaceTeam } from '@/lib/workspace/team-store';
import { Panel } from '@/components/admin/bits';
import { ProjectMembers } from './project-members';

/** Extends the existing record page; its ProfileCard remains the page header. */
export async function ProjectWorkspace({projectId}:{projectId:string}) {
  const actor=await requireProjectActor(projectId);
  let team=null;
  let unavailable=false;
  try { team=await getWorkspaceTeam(projectId); } catch { unavailable=true; }
  return <section aria-label="Project workspace">
    <ServiceWorkspace project={actor.project} actor={actor}/>
    <ProjectMembers actor={actor}/>
    {team?(actor.kind==='staff'?<TeamWorkspace projectId={projectId} data={team} currentUserId={actor.userId} canManage={actor.canManage} readOnly={actor.readOnly}/>:<ClientProjectUpdates notes={team.notes.filter(note=>note.visibility==='client')}/>):null}
    {unavailable?<Panel title="Project communication unavailable"><p role="alert">Project communication could not be loaded. Check the workspace migrations in Settings, System, then retry.</p></Panel>:null}
  </section>;
}
