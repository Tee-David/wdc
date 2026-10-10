import 'server-only';
import {randomUUID} from 'node:crypto';
import {transaction} from '@/lib/db/transaction';
import {adoptPersistedRecord} from '@/lib/admin/persist';
import type {Client} from '@/lib/admin/types';
import {requireWorkspaceUser} from './access';
import {emitWorkspaceEvent,type WorkspaceRecipient} from './events';

/** Assigning a department does not grant access to any project or its private work. */
export async function commitClientDepartments(input:{clientId:string;departmentIds:string[]}){
 const actor=await requireWorkspaceUser(true);
 if(actor.kind!=='staff')throw Error('Only the studio changes department assignments.');
 const ids=[...new Set(input.departmentIds)].sort();
 const result=await transaction(async tx=>{
  const read=await tx.query<{data:Client}>(`SELECT data FROM admin_records WHERE collection='CLIENTS' AND id=$1 FOR UPDATE`,[input.clientId]);
  const client=read.rows[0]?.data;if(!client||client.archived||client.mergedInto)throw Error('That client is no longer available.');
  const departments=await tx.query<{id:string;name:string}>('SELECT id,name FROM departments WHERE id=ANY($1::STRING[])',[ids]);
  if(departments.rowCount!==ids.length)throw Error('A department changed. Reload and choose again.');
  if([...(client.departments??[])].sort().join('\0')===ids.join('\0'))return {client,eventIds:[] as string[]};
  const updated={...client,departments:ids};
  await tx.query(`INSERT INTO audit_log(at,actor,kind,subject_id,subject,action,field,from_value,to_value,note) VALUES(now(),$1,'client',$2,$3,'departments changed','departments',$4,$5,$6)`,[actor.name.slice(0,200),client.id,client.company.slice(0,300),JSON.stringify(client.departments??[]),JSON.stringify(ids),'Assignment persisted with scoped communication intents.']);
  await tx.query(`UPDATE admin_records SET data=$2::JSONB,seq=nextval('admin_records_seq'),updated_at=now() WHERE collection='CLIENTS' AND id=$1`,[client.id,JSON.stringify(updated)]);
  const staff=await tx.query<{id:string}>(`SELECT DISTINCT u.id FROM department_members m JOIN "user" u ON u.id=m.user_id WHERE m.department_id=ANY($1::STRING[]) AND u.role IN ('owner','staff') AND u."deactivatedAt" IS NULL`,[ids]);
  const account=await tx.query<{id:string;role:string}>(`SELECT id,role FROM "user" WHERE lower(email)=$1`,[client.email.trim().toLowerCase()]);
  const active=await tx.query<{id:string}>(`SELECT id FROM "user" WHERE lower(email)=$1 AND role='client' AND "deactivatedAt" IS NULL`,[client.email.trim().toLowerCase()]);
  const contacts:WorkspaceRecipient[]=active.rows.map(user=>({userId:user.id}));
  if(!account.rowCount&&client.email.trim())contacts.push({userId:'client:'+client.id});
  const names=departments.rows.map(d=>d.name).join(', '),eventIds:string[]=[];
  const sharedId=randomUUID();eventIds.push(sharedId);
  await emitWorkspaceEvent({id:sharedId,projectId:'client:'+client.id,clientId:client.id,kind:'client.departments_changed',category:'progress',actorId:actor.userId,actorName:actor.name,title:'Your service teams were updated',summary:ids.length?'Your assigned departments are '+names+'. Contact the studio if you need an introduction.':'Your department assignments were cleared. Contact the studio about your next step.',href:'/portal/projects',visibility:'client',recipients:contacts},tx);
  if(staff.rows.length){const id=randomUUID();eventIds.push(id);await emitWorkspaceEvent({id,projectId:'client:'+client.id,clientId:client.id,kind:'client.department_assignment',category:'actions',actorId:actor.userId,actorName:actor.name,title:'Department client assignment updated',summary:client.company+' is now assigned to '+names+'. Ask the project lead for a handover before starting. This notice does not grant access to project work.',href:'/admin/clients/'+client.id,visibility:'internal',recipients:staff.rows.map(user=>({userId:user.id}))},tx);}
  return {client:updated,eventIds};
 });
 adoptPersistedRecord('CLIENTS',result.client.id,result.client);
 return result;
}
