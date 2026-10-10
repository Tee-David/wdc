'use server';
import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/pool';
import { transaction } from '@/lib/db/transaction';
import type {Project,Client} from '@/lib/admin/types';
import { FAIL,OK,type ActionState } from '@/lib/admin/validate';
import { requireProjectActor,projectRecipients } from './access';
import { emitWorkspaceEvent,dispatchWorkspaceEvents } from './events';
export async function saveProjectMember(_previous:ActionState,form:FormData):Promise<ActionState>{
  try {
    const projectId=String(form.get('projectId')||''),actor=await requireProjectActor(projectId,'manage');
    if(actor.role!=='owner')return FAIL({},'Only the owner changes project access.');
    const email=String(form.get('email')||'').trim().toLowerCase();
    const result=await db.query<{id:string;name:string;role:string}>(`SELECT id,name,role FROM "user" WHERE lower(email)=$1 AND "deactivatedAt" IS NULL`,[email]);
    const person=result.rows[0];if(!person||!['owner','staff','client'].includes(person.role))return FAIL({email:'Use an active account. Invite this person from Users first.'});
    const revoke=form.get('revoke')==='1',manage=person.role!=='client'&&form.get('manage')==='on',review=person.role==='client'&&form.get('review')==='on',billing=person.role==='client'&&form.get('billing')==='on';
    if(person.role==='owner')return FAIL({},'Owner access is already defined by the account role.');
    const id=randomUUID(),grantId=randomUUID(),recipients=await projectRecipients(projectId,'internal');
    await transaction(async client=>{
      const projectRow=await client.query<{data:Project}>("SELECT data FROM admin_records WHERE collection='PROJECTS' AND id=$1 FOR UPDATE",[projectId]),project=projectRow.rows[0]?.data;
      if(!project||project.archived||project.clientId!==actor.clientId)throw Error('The project changed or is archived. Refresh before changing access.');
      const clientRow=await client.query<{data:Client}>("SELECT data FROM admin_records WHERE collection='CLIENTS' AND id=$1 FOR UPDATE",[project.clientId]),record=clientRow.rows[0]?.data;
      if(!record||record.archived||record.mergedInto)throw Error('This client is not available for access changes.');
      const activeOwner=await client.query('SELECT 1 FROM "user" WHERE id=$1 AND role=\'owner\' AND "deactivatedAt" IS NULL FOR UPDATE',[actor.userId]);if(!activeOwner.rowCount)throw Error('Your owner access has ended.');
      const activePerson=await client.query<{role:string;email:string}>('SELECT role,email FROM "user" WHERE id=$1 AND "deactivatedAt" IS NULL FOR UPDATE',[person.id]);if(!activePerson.rows[0]||activePerson.rows[0].role!==person.role||activePerson.rows[0].email.trim().toLowerCase()!==email)throw Error('This account changed. Refresh and choose an active account.');
      if(revoke&&(project.ownerIds?.includes(person.id)||record.email.trim().toLowerCase()===email))throw Error('This person has primary-client or assigned-lead access. Change the existing client or project details to remove that access.');
      if(revoke){const revoked=await client.query(`UPDATE workspace_project_members SET revoked_at=now() WHERE project_id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING user_id`,[projectId,person.id]);if(!revoked.rowCount)throw Error('This person has no active additional project access to revoke.');}
      else await client.query(`INSERT INTO workspace_project_members(project_id,user_id,can_manage,can_review,can_billing,granted_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(project_id,user_id) DO UPDATE SET can_manage=excluded.can_manage,can_review=excluded.can_review,can_billing=excluded.can_billing,granted_by=excluded.granted_by,granted_at=now(),revoked_at=NULL`,[projectId,person.id,manage,review,billing,actor.userId]);
      await client.query('INSERT INTO audit_log(at,actor,kind,subject_id,subject,action,field,from_value,to_value,note) VALUES(now(),$1,\'project\',$2,$3,$4,\'access\',NULL,$5,$6)',[actor.name.slice(0,200),projectId,project.title.slice(0,300),revoke?'revoked access':'updated access',person.name.slice(0,200),revoke?'Additional membership revoked':`Manage: ${manage}; review: ${review}; billing: ${billing}`]);
      await emitWorkspaceEvent({id,projectId,clientId:actor.clientId,kind:'project.access_changed',category:'actions',actorId:actor.userId,actorName:actor.name,title:revoke?'Project access revoked':'Project access updated',summary:`${actor.name} ${revoke?'revoked':'updated'} ${person.name}'s access to ${project.title}.`,href:'/admin/projects/'+projectId,visibility:'internal',recipients},client);
      if(!revoke)await emitWorkspaceEvent({id:grantId,projectId,clientId:actor.clientId,kind:'project.access_granted',category:'progress',actorId:actor.userId,actorName:actor.name,title:'You have access to '+project.title,summary:'Open the project to see the shared work and your available actions.',href:'/admin/projects/'+projectId,visibility:person.role==='client'?'client':'internal',recipients:[{userId:person.id}]},client);
    });
    after(()=>dispatchWorkspaceEvents({eventIds:revoke?[id]:[id,grantId],limit:2}));revalidatePath('/admin/projects/'+projectId);revalidatePath('/portal/projects');
    return OK('Updated.');
  }catch(error){return FAIL({},error instanceof Error?error.message:'Access could not be updated.');}
}
