import { db } from '@/lib/db/pool';
import type { WorkspaceActor } from '@/lib/workspace/access';
import { ProjectMembersForm } from './project-members-form';
import { Panel } from '@/components/admin/bits';
export async function ProjectMembers({actor}:{actor:WorkspaceActor}){
  if(actor.role!=='owner')return null;
  let members=null;
  try{members=(await db.query<{name:string;email:string;role:string;manage:boolean;review:boolean;billing:boolean}>(`SELECT u.name,u.email,u.role,m.can_manage AS manage,m.can_review AS review,m.can_billing AS billing FROM workspace_project_members m JOIN "user" u ON u.id=m.user_id WHERE m.project_id=$1 AND m.revoked_at IS NULL AND u."deactivatedAt" IS NULL ORDER BY u.name LIMIT 100`,[actor.project.id])).rows;}catch{/* Fail closed. */}
  return <Panel title="Project access" dataTour="workspace-access">{members?<ProjectMembersForm projectId={actor.project.id} members={members} readOnly={actor.readOnly}/>:<p role="alert">Project access could not be loaded. Check the workspace migration, then refresh.</p>}</Panel>;
}
