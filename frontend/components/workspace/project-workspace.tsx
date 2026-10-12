import { requireProjectActor } from '@/lib/workspace/access';
import { ServiceWorkspace } from './service-workspace';
import { TeamWorkspace, ClientProjectUpdates } from './team-workspace';
import { getWorkspaceTeam } from '@/lib/workspace/team-store';
import { Panel } from '@/components/admin/bits';
import { ProjectMembers } from './project-members';

/** Extends the existing record page; its ProfileCard remains the page header. */
/** `part` lets a page place the pieces in different tabs; the default is all of them, as before. */
export async function ProjectWorkspace({projectId,part='all'}:{projectId:string;part?:'all'|'service'|'access'|'team'}) {
  const actor=await requireProjectActor(projectId);
  let team=null;
  let unavailable=false;
  if(part==='all'||part==='team'){try { team=await getWorkspaceTeam(projectId); } catch { unavailable=true; }}
  return <section aria-label="Project workspace">
    {part==='all'||part==='service'?<ServiceWorkspace project={actor.project} actor={actor}/>:null}
    {part==='all'||part==='access'?<ProjectMembers actor={actor}/>:null}
    {part==='service'||part==='access'?null:team?(actor.kind==='staff'?<TeamWorkspace projectId={projectId} data={team} currentUserId={actor.userId} canManage={actor.canManage} readOnly={actor.readOnly}/>:<ClientProjectUpdates notes={team.notes.filter(note=>note.visibility==='client')}/>):null}
    {unavailable&&(part==='all'||part==='team')?<Panel title="Project communication unavailable"><p role="alert">Project communication could not be loaded. Check the workspace migrations in Settings, System, then retry.</p></Panel>:null}
  </section>;
}
