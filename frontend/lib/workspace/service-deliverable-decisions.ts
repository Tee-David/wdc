import 'server-only';
import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {APPROVALS,type Approval,type Deliverable,type Project} from '@/lib/admin/types';
import {transaction} from '@/lib/db/transaction';
import {adoptPersistedRecord} from '@/lib/admin/persist';
import {requireProjectActor,projectRecipients,type WorkspaceActor} from './access';
import {emitWorkspaceEvent,cancelWorkspaceEvents} from './events';
import {assertClientDecision,recordDeliverableDecision} from './service-deliverable-policy';
async function writableProject(c:PoolClient,actor:WorkspaceActor){
 const projectRow=await c.query<{data:Project}>("SELECT data FROM admin_records WHERE collection='PROJECTS' AND id=$1 FOR UPDATE",[actor.project.id]);const project=projectRow.rows[0]?.data;if(!project||project.clientId!==actor.clientId||project.archived)throw Error('This project is not available for decisions.');
 const clientRow=await c.query<{data:{archived?:boolean;mergedInto?:string}}>("SELECT data FROM admin_records WHERE collection='CLIENTS' AND id=$1",[actor.clientId]);if(!clientRow.rows[0]?.data||clientRow.rows[0].data.archived||clientRow.rows[0].data.mergedInto)throw Error('This client is not available for changes.');
}
export async function decideLegacyDeliverable(projectId:string,id:string,submittedVersion:string,decision:'Approved'|'Revision requested',note=''){
 const actor=await requireProjectActor(projectId,'review');if(actor.kind!=='client')throw Error('Only the authorised client can record this decision.');if(note.length>12000||decision==='Revision requested'&&!note.trim())throw Error('Explain the changes needed in 12,000 characters or fewer.');
 const recipients=await projectRecipients(projectId,'all','review');const eventId=randomUUID();
 const result=await transaction(async c=>{
  const found=await c.query<{data:Deliverable}>("SELECT data FROM admin_records WHERE collection='DELIVERABLES' AND id=$1 FOR UPDATE",[id]);const current=found.rows[0]?.data;
  if(!current||current.projectId!==projectId)throw Error('This deliverable is no longer available.');
  await writableProject(c,actor);
  const version=assertClientDecision(current,submittedVersion);
  if(current.approval===decision&&(decision==='Approved'||current.approvalNote===note.trim()))return {deliverable:current,eventIds:[] as string[]};
  recordDeliverableDecision(current,decision,{actor:actor.name,actorId:actor.userId,note:note.trim(),at:new Date().toISOString()});
  await c.query("UPDATE admin_records SET data=$2,seq=nextval('admin_records_seq'),updated_at=now() WHERE collection='DELIVERABLES' AND id=$1",[id,JSON.stringify(current)]);
  await cancelWorkspaceEvents(projectId,'deliverable:'+id,c);
  await emitWorkspaceEvent({id:eventId,projectId,clientId:actor.clientId,kind:decision==='Approved'?'deliverable.approved':'deliverable.revision_requested',category:'actions',actorId:actor.userId,actorName:actor.name,title:current.name,summary:decision==='Approved'?`${actor.name} approved version ${version.v}.`:`${actor.name} requested changes to version ${version.v}: ${note.trim()}`,href:'/admin/projects/'+projectId,visibility:'client',recipients},c);
  return {deliverable:current,eventIds:[eventId]};
 });
 adoptPersistedRecord('DELIVERABLES',id,result.deliverable);
 return result;
}
/** Admin action wrappers keep media validation. Exact version is nevertheless required here, at the write boundary. */
export async function addLegacyDeliverableVersion(input:{projectId:string;id:string;version:string;note:string;url?:string;files?:Deliverable['versions'][number]['files']}){
 const actor=await requireProjectActor(input.projectId,'manage');if(actor.kind!=='staff')throw Error('Only the studio prepares versions.');
 if(!input.note.trim()||input.note.length>12000)throw Error('Describe what changed in 12,000 characters or fewer.');
 const recipients=await projectRecipients(input.projectId,'internal','updates'),eventId=randomUUID();
 const result=await transaction(async c=>{
  const found=await c.query<{data:Deliverable}>("SELECT data FROM admin_records WHERE collection='DELIVERABLES' AND id=$1 FOR UPDATE",[input.id]);const record=found.rows[0]?.data;
  if(!record||record.projectId!==input.projectId)throw Error('This deliverable is no longer available.');
  await writableProject(c,actor);
  const last=record.versions.at(-1);if(!last||!/^[1-9]\d*$/.test(input.version)||Number(input.version)!==last.v)throw Error('A newer version was saved. Refresh before preparing another version.');
  if(record.approval!=='Not sent'){last.shared=true;last.approval=record.approval;last.approvalNote=record.approvalNote;}
  record.versions.push({v:last.v+1,at:new Date().toISOString(),note:input.note.trim(),url:input.url,files:input.files});record.approval='Not sent';record.approvalNote=undefined;
  await c.query("UPDATE admin_records SET data=$2,seq=nextval('admin_records_seq'),updated_at=now() WHERE collection='DELIVERABLES' AND id=$1",[record.id,JSON.stringify(record)]);
  await cancelWorkspaceEvents(input.projectId,'deliverable:'+record.id,c);
  await emitWorkspaceEvent({id:eventId,projectId:input.projectId,clientId:actor.clientId,kind:'deliverable.internal_version',category:'actions',actorId:actor.userId,actorName:actor.name,title:record.name,summary:`${actor.name} prepared version ${last.v+1} for internal review.`,href:'/admin/projects/'+input.projectId,visibility:'internal',recipients},c);
  return {deliverable:record,eventIds:[eventId]};
 });adoptPersistedRecord('DELIVERABLES',input.id,result.deliverable);return result;
}
export async function moveLegacyDeliverableApproval(input:{projectId:string;id:string;version:string;approval:Approval;note?:string}){
 const actor=await requireProjectActor(input.projectId,'manage');if(actor.kind!=='staff')throw Error('Only the studio shares work.');if(!APPROVALS.includes(input.approval))throw Error('Choose a valid review state.');if((input.note||'').length>12000)throw Error('The review note is too long.');if(input.approval==='Approved'&&!input.note?.trim())throw Error('Record the evidence for approval on the client’s behalf.');
 const recipients=await projectRecipients(input.projectId,input.approval==='Not sent'?'internal':'all','review');const eventId=randomUUID();
 const result=await transaction(async c=>{
  const found=await c.query<{data:Deliverable}>("SELECT data FROM admin_records WHERE collection='DELIVERABLES' AND id=$1 FOR UPDATE",[input.id]);const record=found.rows[0]?.data;
  if(!record||record.projectId!==input.projectId)throw Error('This deliverable is no longer available.');await writableProject(c,actor);const last=record.versions.at(-1);if(!last||!/^[1-9]\d*$/.test(input.version)||Number(input.version)!==last.v)throw Error('A newer version was saved. Refresh and review the current work.');
  if(record.approval===input.approval&&(input.note||'')===(record.approvalNote||''))return {deliverable:record,eventIds:[] as string[]};
  recordDeliverableDecision(record,input.approval,{actor:actor.name,actorId:actor.userId,note:input.note?.trim(),at:new Date().toISOString()});
  await c.query("UPDATE admin_records SET data=$2,seq=nextval('admin_records_seq'),updated_at=now() WHERE collection='DELIVERABLES' AND id=$1",[record.id,JSON.stringify(record)]);await cancelWorkspaceEvents(input.projectId,'deliverable:'+record.id,c);
  const visibility=input.approval==='Not sent'?'internal':'client';await emitWorkspaceEvent({id:eventId,projectId:input.projectId,clientId:actor.clientId,kind:input.approval==='Awaiting client'?'deliverable.ready':'deliverable.studio_decision',category:'actions',actorId:actor.userId,actorName:actor.name,title:record.name,summary:input.approval==='Awaiting client'?`Version ${last.v} is shared for your review.`:`${actor.name} recorded ${input.approval.toLowerCase()} for version ${last.v}.${input.note?' Evidence: '+input.note:''}`,href:'/admin/projects/'+input.projectId,visibility,recipients,dueAt:input.approval==='Awaiting client'?last.reviewDueAt:undefined,staleKey:'deliverable:'+record.id},c);
  return {deliverable:record,eventIds:[eventId]};
 });adoptPersistedRecord('DELIVERABLES',input.id,result.deliverable);return result;
}
