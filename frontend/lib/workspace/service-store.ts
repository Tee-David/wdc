import 'server-only';
import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {db} from '@/lib/db/pool';
import {transaction} from '@/lib/db/transaction';
import {SERVICE_KINDS,checkState,parseServiceData,type ServiceRecord,type ServiceItem,type WorkspaceService} from './service-model';
export type ServiceActor={id:string;name:string;kind:'staff'|'client';clientId:string};
export type ServiceIntent={projectId:string;itemId:string;actor:ServiceActor;kind:string;title:string;version:number;visibility:'internal'|'shared';due?:string};
export type ServiceEmitter=(client:PoolClient,event:ServiceIntent)=>Promise<void>;
import {projectSharedServiceRecord} from './service-sharing-policy';
import type {Project,Client} from '@/lib/admin/types';
async function currentServiceActor(c:PoolClient,projectId:string,actor:ServiceActor,permission:'manage'|'review'|'billing'|'comment',financial=false){
 const users=await c.query<{role:string;email:string}>('SELECT role,email FROM "user" WHERE id=$1 AND "deactivatedAt" IS NULL FOR UPDATE',[actor.id]),user=users.rows[0];
 if(!user||!['owner','staff','client'].includes(user.role)||(actor.kind==='client')!==(user.role==='client'))throw Error('Your account access changed. Sign in again.');
 const projects=await c.query<{data:Project}>("SELECT data FROM admin_records WHERE collection='PROJECTS' AND id=$1 FOR UPDATE",[projectId]),project=projects.rows[0]?.data;
 if(!project||project.archived||project.clientId!==actor.clientId)throw Error('This project is no longer open for changes.');
 const clients=await c.query<{data:Client}>("SELECT data FROM admin_records WHERE collection='CLIENTS' AND id=$1 FOR UPDATE",[project.clientId]),client=clients.rows[0]?.data;
 if(!client||client.archived||client.mergedInto)throw Error('This client is no longer available.');
 const memberships=await c.query<{can_manage:boolean;can_review:boolean;can_billing:boolean}>('SELECT can_manage,can_review,can_billing FROM workspace_project_members WHERE project_id=$1 AND user_id=$2 AND revoked_at IS NULL',[projectId,actor.id]),member=memberships.rows[0];
 const owner=user.role==='owner',lead=user.role==='staff'&&project.ownerIds?.includes(actor.id),primary=user.role==='client'&&user.email.trim().toLowerCase()===client.email.trim().toLowerCase();
 const allowed=permission==='manage'?owner||lead||(user.role==='staff'&&member?.can_manage):permission==='review'?primary||(user.role==='client'&&member?.can_review):permission==='billing'?primary||(user.role==='client'&&member?.can_billing):owner||lead||primary||Boolean(member);
 if(!allowed||(financial&&!owner&&!primary&&!(user.role==='client'&&member?.can_billing)))throw Error('Your project permissions changed. Refresh before saving.');
 return project;
}
function itemRow(row:ServiceItem):ServiceItem{return {...row,revision:Number(row.revision),version:Number(row.version)};}
export async function listServiceRecords(projectId:string,clientVisible:boolean):Promise<ServiceRecord[]>{
 const read=await db.query<ServiceItem>(`SELECT * FROM workspace_service_items WHERE project_id=$1 ${clientVisible?"AND (visibility='shared' OR EXISTS (SELECT 1 FROM workspace_service_versions v WHERE v.item_id=workspace_service_items.id AND v.visibility='shared'))":''} ORDER BY updated_at DESC LIMIT 200`,[projectId]);const rows=read.rows.map(itemRow);
 if(!rows.length)return [];
 const ids=rows.map(r=>r.id);
 const [versions,decisions,notes,activity]=await Promise.all([db.query(`SELECT * FROM workspace_service_versions WHERE item_id=ANY($1::UUID[]) ${clientVisible?"AND visibility='shared'":''} ORDER BY version DESC LIMIT 2000`,[ids]),db.query(`SELECT d.* FROM workspace_service_decisions d JOIN workspace_service_versions v ON v.item_id=d.item_id AND v.version=d.version WHERE d.item_id=ANY($1::UUID[]) ${clientVisible?"AND v.visibility='shared'":''} ORDER BY d.created_at DESC LIMIT 2000`,[ids]),db.query(`SELECT n.* FROM workspace_service_notes n JOIN workspace_service_versions v ON v.item_id=n.item_id AND v.version=n.version WHERE n.item_id=ANY($1::UUID[]) ${clientVisible?"AND v.visibility='shared'":''} ORDER BY n.created_at DESC LIMIT 2000`,[ids]),db.query(`SELECT a.* FROM workspace_service_activity a JOIN workspace_service_versions v ON v.item_id=a.item_id AND v.version=a.version WHERE a.item_id=ANY($1::UUID[]) ${clientVisible?"AND v.visibility='shared'":''} ORDER BY a.created_at DESC LIMIT 2000`,[ids])]);
 const records=rows.map(r=>({...r,updated_at:new Date(r.updated_at).toISOString(),versions:versions.rows.filter(v=>v.item_id===r.id).map(v=>({...v,version:Number(v.version),created_at:new Date(v.created_at).toISOString()})),decisions:decisions.rows.filter(d=>d.item_id===r.id).map(d=>({...d,version:Number(d.version),created_at:new Date(d.created_at).toISOString()})),notes:notes.rows.filter(n=>n.item_id===r.id).map(n=>({...n,version:Number(n.version),created_at:new Date(n.created_at).toISOString()})),activity:activity.rows.filter(a=>a.item_id===r.id).map(a=>({...a,version:Number(a.version),created_at:new Date(a.created_at).toISOString()}))}));
 return records.map(record=>clientVisible?projectSharedServiceRecord(record):record).filter((record):record is ServiceRecord=>record!==null);
}
async function locked(c:PoolClient,projectId:string,id:string,revision:number,actor:ServiceActor){
 const {rows}=await c.query<ServiceItem>('SELECT * FROM workspace_service_items WHERE id=$1 AND project_id=$2 FOR UPDATE',[id,projectId]);
 const row=rows[0]?itemRow(rows[0]):undefined;if(!row||(actor.kind==='client'&&row.visibility!=='shared'))throw Error('This work is not available.');if(row.revision!==revision)throw Error('This work changed. Refresh and review the latest version before saving.');return row;
}
async function bump(c:PoolClient,row:ServiceItem,state:string){await c.query('UPDATE workspace_service_items SET state=$2,revision=revision+1,updated_at=now() WHERE id=$1',[row.id,state]);}
export async function saveServiceRecord(input:{projectId:string;id?:string;revision:number;service:WorkspaceService;kind:string;title:string;visibility:'internal'|'shared';data:Record<string,unknown>},actor:ServiceActor,emit:ServiceEmitter){
 if(actor.kind!=='staff')throw Error('Only the studio can create or revise work.');
 const kind=SERVICE_KINDS.find(k=>k.key===input.kind&&(!k.service||k.service===input.service));if(!kind)throw Error('Choose a type supported by this service.');
 const title=input.title.trim();if(!title||title.length>240)throw Error('Add a title of 240 characters or fewer.');if(!['internal','shared'].includes(input.visibility))throw Error('Invalid sharing choice.');const data=parseServiceData(kind,input.data);
 return transaction(async c=>{const project=await currentServiceActor(c,input.projectId,actor,'manage',['budget','change','renewal'].includes(input.kind));if(project.service!==input.service&&!(project.service==='social'&&input.service==='ads'))throw Error('This service does not belong to this project.');const old=input.id?await locked(c,input.projectId,input.id,input.revision,actor):null; if(old&&(old.kind!==input.kind||old.service!==input.service))throw Error('The type of existing work cannot be changed.');
 if(old){for(const key of ['publicationUrl','publishedAt','evidence'])if(Object.hasOwn(data,key))data[key]='';if(kind.key==='build')data.store='';}
 const id=old?.id||randomUUID(),version=(old?.version||0)+1;
 if(old)await c.query('UPDATE workspace_service_items SET title=$2,data=$3,version=$4,revision=revision+1,visibility=$5,state=$6,updated_at=now() WHERE id=$1',[id,title,JSON.stringify(data),version,input.visibility,input.visibility==='shared'&&kind.decision?'client_review':'draft']);
 else await c.query('INSERT INTO workspace_service_items(id,project_id,service,kind,title,visibility,state,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,input.projectId,input.service,input.kind,title,input.visibility,input.visibility==='shared'&&kind.decision?'client_review':kind.states[0],JSON.stringify(data)]);
 await c.query('INSERT INTO workspace_service_versions(item_id,version,title,data,actor_id,visibility) VALUES($1,$2,$3,$4,$5,$6)',[id,version,title,JSON.stringify(data),actor.id,input.visibility]);
 await emit(c,{projectId:input.projectId,itemId:id,actor,kind:old?'work.version_ready':'work.created',title,version,visibility:input.visibility,due:data.due});return id;});
}
export async function actOnServiceRecord(input:{projectId:string;id:string;revision:number;version:number;action:string;state?:string;note?:string;context?:string;noteId?:string;evidence?:string;publicationUrl?:string;publishedAt?:string;actual?:string},actor:ServiceActor,emit:ServiceEmitter){
 return transaction(async c=>{const row=await locked(c,input.projectId,input.id,input.revision,actor);const financial=['budget','change','renewal'].includes(row.kind);await currentServiceActor(c,input.projectId,actor,input.action==='decide'?financial?'billing':'review':['state','resolve'].includes(input.action)?'manage':'comment',financial);if(row.version!==input.version)throw Error('A newer version needs your review.');const kind=SERVICE_KINDS.find(k=>k.key===row.kind)!;const note=(input.note||'').trim();if(note.length>12000||(input.context||'').length>500)throw Error('This note is too long.');let event='work.updated';
 if(input.action==='note'){if(!note)throw Error('Write a note before sending.');await c.query('INSERT INTO workspace_service_notes(id,item_id,version,actor_id,actor_name,body,context) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),row.id,row.version,actor.id,actor.name,note,input.context||'']);event='review.note';await bump(c,row,row.state);}
 else if(input.action==='resolve'||input.action==='reopen'){if(input.action==='resolve'&&actor.kind!=='staff')throw Error('The studio records addressed notes.');const result=await c.query("UPDATE workspace_service_notes SET resolved=$3 WHERE id=$1 AND item_id=$2 AND ($4='staff' OR version IN (SELECT version FROM workspace_service_versions WHERE item_id=$2 AND visibility='shared')) RETURNING id",[input.noteId,row.id,input.action==='resolve',actor.kind]);if(!result.rowCount)throw Error('Review note not found.');await bump(c,row,row.state);event='review.'+input.action;}
 else if(input.action==='decide'){
  if(actor.kind!=='client'||row.visibility!=='shared')throw Error('The client records the decision on shared work.');const decision=input.state||'';const valid=kind.decision==='approve'?['approved','changes_requested']:kind.decision==='accept'?['accepted','declined','changes_requested']:kind.decision==='acknowledge'?['acknowledged']:[];if(!valid.includes(decision))throw Error('This decision does not apply to this work.');if(decision==='changes_requested'&&!note)throw Error('Explain the changes you need.');
  await c.query('INSERT INTO workspace_service_decisions(id,item_id,version,decision,actor_id,actor_name,note) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),row.id,row.version,decision,actor.id,actor.name,note]);await bump(c,row,decision);event='review.'+decision;
 } else if(input.action==='respond'){
  if(actor.kind!=='client'||row.kind!=='request'||!note)throw Error('Add your response to the request.');await c.query('INSERT INTO workspace_service_notes(id,item_id,version,actor_id,actor_name,body,context) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),row.id,row.version,actor.id,actor.name,note,'Request response']);await bump(c,row,'supplied');event='request.supplied';
 }else if(input.action==='state'){
  if(actor.kind!=='staff')throw Error('The studio records delivery and testing states.');const state=input.state||'';
  const delivery={...row.data};for(const key of ['evidence','publicationUrl','publishedAt','actual'] as const){if(input[key]?.trim())delivery[key]=input[key]!.trim();}row.data=parseServiceData(kind,delivery);
  const approvals=await c.query("SELECT decision FROM workspace_service_decisions WHERE item_id=$1 AND version=$2 ORDER BY created_at DESC LIMIT 1",[row.id,row.version]);let approved=['approved','accepted'].includes(approvals.rows[0]?.decision);
  if(row.kind==='campaign'&&state==='running'){
   for(const [key,expectedKind,decision] of [['creativeId','creative','approved'],['budgetId','budget','accepted']]){
    const ref=row.data[key];if(!/^[0-9a-f-]{36}$/i.test(ref||''))throw Error('Link approved creative and accepted budget records.');const result=await c.query(`SELECT i.id FROM workspace_service_items i JOIN workspace_service_decisions d ON d.item_id=i.id AND d.version=i.version WHERE i.id=$1 AND i.project_id=$2 AND i.kind=$3 AND d.decision=$4 AND d.created_at=(SELECT max(created_at) FROM workspace_service_decisions WHERE item_id=i.id AND version=i.version)`,[ref,row.project_id,expectedKind,decision]);if(!result.rows.length)throw Error('Current creative and spending approvals are both required.');
   }const budget=await c.query<ServiceItem>('SELECT * FROM workspace_service_items WHERE id=$1 AND project_id=$2',[row.data.budgetId,row.project_id]);if(budget.rows[0]?.data.creativeId!==row.data.creativeId)throw Error('The spending approval must cover this creative.');approved=true;
  }
  if(row.kind==='build'&&state==='released'&&row.state!=='store_approved')throw Error('Record store approval before public release.');
  if(row.kind==='launch'&&state==='launched'){const checks=await c.query('SELECT state FROM workspace_service_items WHERE project_id=$1 AND kind=$2',[row.project_id,'uat']);if(!checks.rows.length||checks.rows.some(r=>!['passed','resolved'].includes(r.state)))throw Error('Complete the recorded website tests before launching.');}
  if(row.kind==='milestone'&&state==='released'&&!row.data.results)throw Error('Record actual acceptance test results before releasing.');
  if(row.kind==='uat'&&['passed','resolved'].includes(state)&&(!row.data.actual||!row.data.evidence))throw Error('Record actual results and evidence before passing a test.');
  checkState(kind,state,row.data,approved);await c.query('UPDATE workspace_service_items SET data=$2 WHERE id=$1',[row.id,JSON.stringify(row.data)]);await bump(c,row,state);event='work.'+state;
 }else throw Error('Choose a supported action.');
 await c.query('INSERT INTO workspace_service_activity(id,item_id,version,actor_name,action,details) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),row.id,row.version,actor.name,event,JSON.stringify(input.action==='state'?{state:input.state,evidence:row.data.evidence||'',publicationUrl:row.data.publicationUrl||'',publishedAt:row.data.publishedAt||'',actual:row.data.actual||''}:{state:input.state||'',note})]);
 await emit(c,{projectId:row.project_id,itemId:row.id,actor,kind:event,title:row.title,version:row.version,visibility:row.visibility});
 });
}
