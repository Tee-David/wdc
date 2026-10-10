import 'server-only';
import type {Project,Client} from '@/lib/admin/types';
import type {WorkspaceActor} from './access';
import type {Queryable} from './events';
/** Recheck mutable permissions after entering the transaction that writes the work. */
export async function assertTeamActor(tx:Queryable,actor:WorkspaceActor,manage=false){
 const users=await tx.query<{role:string}>(`SELECT role FROM "user" WHERE id=$1 AND "deactivatedAt" IS NULL FOR UPDATE`,[actor.id]);
 if(!users.rows[0]||users.rows[0].role!==actor.role||actor.kind!=='staff'||actor.readOnly)throw Error('Your studio access changed. Reload before continuing.');
 const projects=await tx.query<{data:Project}>(`SELECT data FROM admin_records WHERE collection='PROJECTS' AND id=$1 FOR UPDATE`,[actor.project.id]);
 const project=projects.rows[0]?.data;if(!project||project.clientId!==actor.clientId||project.archived)throw Error('This project is no longer open for changes.');
 const clients=await tx.query<{data:Client}>(`SELECT data FROM admin_records WHERE collection='CLIENTS' AND id=$1 FOR UPDATE`,[project.clientId]);
 const client=clients.rows[0]?.data;if(!client||client.archived||client.mergedInto)throw Error('This client is no longer open for changes.');
 let canManage=actor.role==='owner'||Boolean(project.ownerIds?.includes(actor.id));
 if(!canManage){const members=await tx.query<{can_manage:boolean}>(`SELECT can_manage FROM workspace_project_members WHERE project_id=$1 AND user_id=$2 AND revoked_at IS NULL FOR UPDATE`,[project.id,actor.id]);if(!members.rows[0])throw Error('Your project access changed. Reload before continuing.');canManage=members.rows[0].can_manage;}
 if(manage&&!canManage)throw Error('Only the current project lead can change this work.');
 return {project,canManage};
}
export async function assertTeamRecipient(tx:Queryable,project:Project,userId:string){
 const people=await tx.query<{role:string}>(`SELECT role FROM "user" WHERE id=$1 AND "deactivatedAt" IS NULL FOR UPDATE`,[userId]);
 const role=people.rows[0]?.role;if(role!=='owner'&&role!=='staff')throw Error('Choose an active studio account.');
 if(role==='owner'||project.ownerIds?.includes(userId))return;
 const member=await tx.query(`SELECT 1 FROM workspace_project_members WHERE project_id=$1 AND user_id=$2 AND revoked_at IS NULL FOR UPDATE`,[project.id,userId]);if(!member.rowCount)throw Error('That person no longer has access to this project.');
}
